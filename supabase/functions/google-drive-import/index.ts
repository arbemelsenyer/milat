// Admin-only: Google Drive'dan seçilen dosyaları indir, metnini çıkar, chunk + embed + knowledge_base_chunks'a kaydet.
// Google OAuth access token'ı istemciden alır (drive.readonly scope). Ham içerik saklanmaz — yalnızca chunk'lar DB'ye yazılır.
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

function sanitizeUnicode(input: string): string {
  if (!input) return "";
  let s = input;
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ");
  s = s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "");
  s = s.replace(/(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "$1");
  s = s.replace(/[\uFEFF\u200B\u200C\u200D]/g, "");
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

async function extractFromBytes(bytes: Uint8Array, fileName: string, mime: string): Promise<string> {
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
  throw new Error("Desteklenmeyen dosya formatı (yalnızca PDF, DOCX, TXT, Google Docs)");
}

async function downloadFromDrive(fileId: string, mimeType: string, accessToken: string): Promise<{ bytes: Uint8Array; effectiveMime: string; effectiveName: string }> {
  // Google Docs → export as text/plain
  const isGoogleDoc = mimeType === "application/vnd.google-apps.document";
  const isGoogleSheet = mimeType === "application/vnd.google-apps.spreadsheet";
  const isGoogleSlide = mimeType === "application/vnd.google-apps.presentation";

  let url: string;
  let effectiveMime = mimeType;
  let ext = "";
  if (isGoogleDoc || isGoogleSheet || isGoogleSlide) {
    const exportMime = "text/plain";
    url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`;
    effectiveMime = exportMime;
    ext = ".txt";
  } else {
    url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  }

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Drive indirme hatası ${res.status}: ${t.slice(0, 200)}`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) throw new Error("Dosya 20MB'ı aşıyor");
  return { bytes: buf, effectiveMime, effectiveName: ext };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Yetkisiz istek" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsRes, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsRes?.claims?.sub) return json({ error: "Oturum doğrulanamadı" }, 401);
    const userId = claimsRes.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) return json({ error: "Bu işlem için admin yetkisi gereklidir" }, 403);

    const body = await req.json().catch(() => ({}));
    const accessToken: string = String(body.accessToken ?? "").trim();
    const mode: string = String(body.mode ?? "knowledge").trim(); // "knowledge" | "template"
    const category: string = String(body.category ?? "").trim();
    const templateType: string = String(body.template_type ?? "").trim();
    const files: Array<{ id: string; name: string; mimeType: string }> = Array.isArray(body.files) ? body.files : [];

    if (!accessToken) return json({ error: "Google erişim jetonu eksik" }, 400);
    if (!files.length) return json({ error: "En az bir dosya seçin" }, 400);
    if (files.length > 50) return json({ error: "En fazla 50 dosya seçilebilir" }, 400);

    const KNOWN_TEMPLATE_TYPES = new Set([
      "dava_sarti_anlasma","dava_sarti_anlasamamama","dava_sarti_ilk_oturum",
      "ihtiyari_anlasma","ihtiyari_anlasamamama","ihtiyari_davet",
      "isci_isveren_davet","ticari_davet","tuketici_davet",
    ]);

    if (mode === "template") {
      if (!KNOWN_TEMPLATE_TYPES.has(templateType)) return json({ error: `Bilinmeyen şablon türü: ${templateType}` }, 400);
      if (files.length > 1) return json({ error: "Şablon modunda tek dosya seçin (her şablon tek dosyadan oluşur)." }, 400);
    } else {
      if (!ALLOWED_CATEGORIES.has(category)) return json({ error: "Geçersiz kategori" }, 400);
    }

    const results: any[] = [];
    let grandTotalChunks = 0;

    for (const f of files) {
      try {
        if (!f?.id || !f?.name || !f?.mimeType) throw new Error("Geçersiz dosya bilgisi");
        const { bytes, effectiveMime, effectiveName } = await downloadFromDrive(f.id, f.mimeType, accessToken);
        const displayName = f.name + effectiveName;
        const fullText = await extractFromBytes(bytes, displayName, effectiveMime);
        const chunks = chunkText(fullText);
        if (!chunks.length) throw new Error("Yeterli metin çıkarılamadı");
        if (chunks.length > 800) throw new Error(`Anormal parça sayısı (${chunks.length})`);

        const sourceUrl = `gdrive://${f.id}`;
        // Idempotency: aynı Drive dosyası tekrar içe aktarılıyorsa eski chunk'ları temizle
        await admin.from("knowledge_base_chunks").delete().eq("source_url", sourceUrl);

        let total = 0;
        const BATCH = 16;
        for (let i = 0; i < chunks.length; i += BATCH) {
          const slice = chunks.slice(i, i + BATCH);
          const vectors = await embed(slice);
          const rows = slice.map((c, j) => ({
            source_title: sanitizeUnicode(f.name),
            source_url: sourceUrl,
            category,
            chunk_text: c,
            chunk_index: i + j,
            embedding: vectors[j] as any,
            metadata: {
              uploaded_by: userId,
              provider: "google_drive",
              drive_file_id: f.id,
              drive_mime: f.mimeType,
              file_name: f.name,
              uploaded_at: new Date().toISOString(),
            },
          }));
          const { error } = await admin.from("knowledge_base_chunks").insert(rows);
          if (error) throw new Error(error.message);
          total += rows.length;
        }
        grandTotalChunks += total;
        results.push({ id: f.id, name: f.name, ok: true, chunks: total });
      } catch (e: any) {
        console.error("gdrive file failed", f?.name, e?.message);
        results.push({ id: f?.id, name: f?.name, ok: false, error: e?.message ?? "Bilinmeyen hata" });
      }
    }

    return json({
      ok: true,
      processed: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      chunks: grandTotalChunks,
      results,
    });
  } catch (e: any) {
    console.error("google-drive-import error", e);
    return json({ error: e?.message ?? "Sunucu hatası" }, 500);
  }
});
