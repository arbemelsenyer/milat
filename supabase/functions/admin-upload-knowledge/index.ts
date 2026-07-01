// Admin-only: manuel kaynak yükleme. PDF/DOCX/TXT dosyasını alır, chunk + embed + kaydeder.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { extractText, getDocumentProxy } from "npm:unpdf@0.12.1";
import mammoth from "npm:mammoth@1.8.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const ALLOWED_CATEGORIES = new Set([
  "kira", "gayrimenkul", "işçi_işveren", "ticari", "tüketici",
  "sağlık", "fikri_mülkiyet", "inşaat", "sigorta", "bankacılık",
  "aile", "spor", "enerji_maden", "mevzuat", "genel",
]);
const MAX_BYTES = 20 * 1024 * 1024;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Türkçe karakterleri koruyarak sadece geçersiz kontrol karakterlerini ve
// bozuk surrogate çiftlerini temizler. Postgres text sütunları \u0000 kabul etmez;
// lone surrogate'lar ise JSON.stringify sırasında geçersiz UTF-16 üretir.
function sanitizeUnicode(input: string): string {
  if (!input) return "";
  let s = input;
  // NUL ve C0 kontrol karakterleri (TAB, LF, CR hariç)
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ");
  // Lone (eşleşmemiş) surrogate'lar
  s = s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "");
  s = s.replace(/(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "$1");
  // Zero-width / BOM
  s = s.replace(/[\uFEFF\u200B\u200C\u200D]/g, "");
  // Encode/decode roundtrip: geçersiz UTF-8'i ayıklar, Türkçe karakterler korunur
  try {
    s = new TextDecoder("utf-8", { fatal: false }).decode(new TextEncoder().encode(s));
  } catch { /* yoksay */ }
  return s;
}

function chunkText(text: string, target = 1800, overlap = 150): string[] {
  const clean = sanitizeUnicode(text).replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + " " + s).length > target && cur) {
      chunks.push(sanitizeUnicode(cur.trim()));
      const tail = cur.slice(Math.max(0, cur.length - overlap));
      cur = tail + " " + s;
    } else {
      cur = cur ? cur + " " + s : s;
    }
  }
  if (cur.trim()) chunks.push(sanitizeUnicode(cur.trim()));
  return chunks.filter((c) => c.length > 200);
}

async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai/text-embedding-3-small", input: texts, dimensions: 768 }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embedding hatası ${res.status}: ${body.slice(0, 300)}`);
  }
  const j = await res.json();
  return j.data.map((d: any) => d.embedding);
}

async function extractFromFile(bytes: Uint8Array, fileName: string, mime: string): Promise<string> {
  const name = fileName.toLowerCase();
  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : text;
  }
  if (name.endsWith(".docx") || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer: bytes as any });
    return result.value ?? "";
  }
  if (name.endsWith(".txt") || mime.startsWith("text/")) {
    return new TextDecoder("utf-8").decode(bytes);
  }
  throw new Error("Desteklenmeyen dosya formatı. Sadece PDF, DOCX veya TXT yükleyebilirsiniz.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth: verify admin JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Yetkisiz istek" }, 401);
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsRes, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsRes?.claims?.sub) {
      return json({ error: "Oturum doğrulanamadı" }, 401);
    }
    const userId = claimsRes.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return json({ error: "Bu işlem için admin yetkisi gereklidir" }, 403);
    }

    // Parse multipart
    const form = await req.formData();
    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim();
    const category = String(form.get("category") ?? "").trim();

    if (!(file instanceof File)) return json({ error: "Dosya bulunamadı" }, 400);
    if (!title) return json({ error: "Kaynak adı zorunludur" }, 400);
    if (title.length > 200) return json({ error: "Kaynak adı çok uzun (max 200 karakter)" }, 400);
    if (!ALLOWED_CATEGORIES.has(category)) return json({ error: "Geçersiz kategori" }, 400);
    if (file.size > MAX_BYTES) return json({ error: "Dosya boyutu 20MB'ı aşamaz" }, 400);

    const name = file.name.toLowerCase();
    const allowedExt = name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".txt");
    if (!allowedExt) return json({ error: "Sadece PDF, DOCX veya TXT dosyaları kabul edilir" }, 400);

    const bytes = new Uint8Array(await file.arrayBuffer());

    // Upload to storage (case-documents bucket, admin/knowledge path)
    const storagePath = `admin/knowledge/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: upErr } = await admin.storage
      .from("case-documents")
      .upload(storagePath, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
    if (upErr) console.error("Storage upload failed (non-fatal):", upErr.message);
    const sourceUrl = `storage://case-documents/${storagePath}`;

    // Extract text
    let fullText = "";
    try {
      fullText = await extractFromFile(bytes, file.name, file.type);
    } catch (e: any) {
      return json({ error: `Metin çıkarma başarısız: ${e.message ?? e}` }, 400);
    }

    const chunks = chunkText(fullText);
    if (!chunks.length) return json({ error: "Bu dosya işlenemedi, lütfen başka bir dosya deneyin" }, 400);
    if (chunks.length > 800) return json({ error: `Anormal parça sayısı (${chunks.length}). Daha küçük bir dosya deneyin.` }, 400);

    // Remove any existing chunks with same source_url (idempotency for re-upload)
    await admin.from("knowledge_base_chunks").delete().eq("source_url", sourceUrl);

    let total = 0;
    const BATCH = 16;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const slice = chunks.slice(i, i + BATCH);
      let vectors: number[][];
      try {
        vectors = await embed(slice);
      } catch (e: any) {
        return json({ error: `Bu dosya işlenemedi, lütfen başka bir dosya deneyin (${e?.message ?? "embedding hatası"})` }, 400);
      }
      const rows = slice.map((c, j) => ({
        source_title: sanitizeUnicode(title),
        source_url: sourceUrl,
        category,
        chunk_text: c,
        chunk_index: i + j,
        embedding: vectors[j] as any,
        metadata: { uploaded_by: userId, file_name: sanitizeUnicode(file.name), uploaded_at: new Date().toISOString() },
      }));
      const { error } = await admin.from("knowledge_base_chunks").insert(rows);
      if (error) {
        console.error("insert failed", error.message);
        return json({ error: "Bu dosya işlenemedi, lütfen başka bir dosya deneyin" }, 400);
      }
      total += rows.length;
    }

    return json({
      ok: true,
      source_title: title,
      source_url: sourceUrl,
      category,
      chunks: total,
    });
  } catch (e: any) {
    console.error("admin-upload-knowledge error", e);
    return json({ error: "Bu dosya işlenemedi, lütfen başka bir dosya deneyin" }, 500);
  }
});
