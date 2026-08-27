// Admin-only: manuel kaynak yükleme. PDF/DOCX/TXT dosyasını alır, chunk + embed + kaydeder.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { getDocumentProxy } from "npm:unpdf@0.12.1";
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
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

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

// Ardışık boşlukları teke indirip kırpar — hem chunk arama anahtarına hem tam metne
// AYNI normalizasyon uygulanır ki indexOf karşılaştırması tutarlı olsun.
function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

// pageTexts sayfa sayfa join(" ") ile birleştirildiğinde her sayfanın normalize metindeki
// başlangıç ofsetini üretir — backfill-knowledge-pages'teki buildPageOffsets ile aynı kalıp.
function buildPageOffsets(pageTexts: string[]): number[] {
  const offsets: number[] = [];
  let acc = 0;
  for (const pt of pageTexts) {
    offsets.push(acc);
    acc += pt.length + 1;
  }
  return offsets;
}

function pageForOffset(pageOffsets: number[], firstPageNumber: number, offset: number): number {
  let pageIdx = 0;
  for (let i = 0; i < pageOffsets.length; i++) {
    if (offset >= pageOffsets[i]) pageIdx = i; else break;
  }
  return firstPageNumber + pageIdx;
}

// Tahmin YOK: sayfa yalnızca tam eşleşmeyle yazılır (backfill-knowledge-pages'teki 7c95322
// düzeltmesiyle aynı desen). Arama, boşlukları tekilleştirilmiş (normalize edilmiş) tam metin
// üzerinde yapılır; chunk arama anahtarına da aynı normalizasyon uygulanır ki indexOf tutarlı
// çalışsın. Arama, bir önceki BULUNMUŞ chunk'ın konumundan ileriye doğru yapılır (searchCursor
// yalnız başarılı eşleşmede ilerler, asla geri kaymaz). Eşleşme bulunamayan chunk için null
// döner — çağıran taraf o chunk'a metadata.page YAZMAZ (tahmine geri düşme yok).
function computeChunkPages(
  pageTexts: string[],
  firstPageNumber: number,
  chunks: string[],
): (number | null)[] {
  const normalizedPageTexts = pageTexts.map(normalizeWs);
  const normalizedFullText = normalizedPageTexts.join(" ");
  const normalizedPageOffsets = buildPageOffsets(normalizedPageTexts);

  let searchCursor = 0;
  return chunks.map((chunk) => {
    const probe = normalizeWs(chunk.trim().slice(0, 80));
    if (!probe) return null;
    const idx = normalizedFullText.indexOf(probe, searchCursor);
    if (idx === -1) return null;
    searchCursor = idx;
    return pageForOffset(normalizedPageOffsets, firstPageNumber, idx);
  });
}

const EMBEDDING_TIMEOUT_MS = 45_000;
const EMBED_429_RETRY_DELAYS_MS = [3_000, 8_000, 20_000, 45_000]; // yalnızca 429 için ayrı bekleme politikası

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withTimeout<T>(label: string, timeoutMs: number, task: () => Promise<T>): Promise<T> {
  let to: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    to = setTimeout(() => reject(new Error(`${label} zaman aşımına uğradı (${Math.round(timeoutMs / 1000)} sn)`)), timeoutMs) as unknown as number;
  });
  try {
    return await Promise.race([task(), timeout]);
  } finally {
    if (to !== undefined) clearTimeout(to);
  }
}

async function requestEmbeddingsOnce(texts: string[], label: string): Promise<number[][]> {
  // OPENAI_API_KEY tanımlıysa doğrudan OpenAI'a git (paylaşımlı Lovable gateway kuyruğunu atla);
  // tanımlı değilse eski davranışa (Lovable gateway + LOVABLE_API_KEY) dön.
  const url = OPENAI_API_KEY ? "https://api.openai.com/v1/embeddings" : "https://ai.gateway.lovable.dev/v1/embeddings";
  const authKey = OPENAI_API_KEY || LOVABLE_API_KEY;
  const model = OPENAI_API_KEY ? "text-embedding-3-small" : "openai/text-embedding-3-small";
  const res = await withTimeout(label, EMBEDDING_TIMEOUT_MS, () =>
    fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${authKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: texts, dimensions: 768 }),
    })
  );
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Embedding hatası ${res.status}: ${body.slice(0, 300)}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const j = await res.json();
  return j.data.map((d: any) => d.embedding);
}

async function embed(texts: string[]): Promise<number[][]> {
  try {
    return await requestEmbeddingsOnce(texts, "Embedding isteği");
  } catch (e: any) {
    if ((e as { status?: number })?.status !== 429) throw e;
    // Yalnızca 429'da: 4 deneme, bekleme 3sn/8sn/20sn/45sn. Her denemenin kendi timeout'u var
    // (bekleme EMBEDDING_TIMEOUT_MS'e dahil değil, withTimeout her çağrıda yeniden başlar).
    let lastError: Error = e instanceof Error ? e : new Error(String(e));
    for (let r = 0; r < EMBED_429_RETRY_DELAYS_MS.length; r += 1) {
      await delay(EMBED_429_RETRY_DELAYS_MS[r]);
      try {
        return await requestEmbeddingsOnce(
          texts,
          `Embedding isteği 429 yeniden deneme (${r + 1}/${EMBED_429_RETRY_DELAYS_MS.length})`,
        );
      } catch (e2: any) {
        lastError = e2 instanceof Error ? e2 : new Error(String(e2));
      }
    }
    throw lastError;
  }
}

async function extractFromFile(bytes: Uint8Array, fileName: string, mime: string): Promise<{ text: string; pageTexts: string[] | null }> {
  const name = fileName.toLowerCase();
  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    // mergePages:true yerine sayfa sayfa çıkarılıyor ki chunk'ların hangi sayfaya denk
    // geldiği (computeChunkPages ile) hesaplanabilsin — build-knowledge-base ile aynı desen.
    const pdf: any = await getDocumentProxy(bytes);
    const totalPages: number = pdf.numPages;
    const pageTexts: string[] = [];
    for (let p = 1; p <= totalPages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      pageTexts.push(tc.items.map((it: any) => ("str" in it ? it.str : "")).join(" "));
    }
    return { text: pageTexts.join("\n"), pageTexts };
  }
  if (name.endsWith(".docx") || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer: bytes as any });
    return { text: result.value ?? "", pageTexts: null };
  }
  if (name.endsWith(".txt") || mime.startsWith("text/")) {
    return { text: new TextDecoder("utf-8").decode(bytes), pageTexts: null };
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

    /* Deterministik yol: aynı kategori + aynı dosya adı => aynı source_url
       (zaman damgası yok). Yol BURADA hesaplanır ama dosya BURADA YÜKLENMEZ.

       ── 27.08.2026 · ÖKSÜZ ÜRETEN SIRA DÜZELTİLDİ (HAT H-19'un yan bulgusu) ──
       Eskiden dosya en başta depoya yüklenirdi; metin çıkarma, parçalama ya da
       embedding başarısız olunca işlev hata döner, ama DOSYA DEPODA KALIRDI.
       Hiçbir `knowledge_base_chunks` satırı onu göstermediği için:
         · `/admin` bilgi tabanı listesi parçalardan üretilir → dosya EKRANDA
           GÖRÜNMEZ, yani kurucu onu silemez bile;
         · `admin-delete-knowledge` yalnız `source_url`u bilinen dosyayı siler;
         · yani dosya süresiz kalır → constitution m.10.
       Canlıda 27.08'de bu sınıftan **71 dosya** sayıldı (HAT H-19).

       Doğrusu: önce işle ve parçaları yaz, EN SON dosyayı yükle. Ters sıranın
       en kötü hâli artık "kayıt var, dosya yok" — bu GÖRÜNÜR ve silinebilir
       bir durumdur; yükleme hatası zaten ölümcül sayılmıyordu. */
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const safeCategory = category.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `admin/knowledge/${safeCategory}/${safeFileName}`;
    const sourceUrl = `storage://case-documents/${storagePath}`;

    // Extract text
    let fullText = "";
    let pageTexts: string[] | null = null;
    try {
      const extracted = await extractFromFile(bytes, file.name, file.type);
      fullText = extracted.text;
      pageTexts = extracted.pageTexts;
    } catch (e: any) {
      return json({ error: `Metin çıkarma başarısız: ${e.message ?? e}` }, 400);
    }

    const chunks = chunkText(fullText);
    if (!chunks.length) return json({ error: "Bu dosya işlenemedi, lütfen başka bir dosya deneyin" }, 400);
    if (chunks.length > 800) return json({ error: `Anormal parça sayısı (${chunks.length}). Daha küçük bir dosya deneyin.` }, 400);

    // Sayfa hesabı: yalnızca PDF'te (pageTexts varsa) yapılır; DOCX/TXT'te page hiç yazılmaz.
    // Tam eşleşme bulunamayan chunk'lar için page null kalır (tahmin yok).
    let chunkPages: (number | null)[] = chunks.map(() => null);
    if (pageTexts) {
      try {
        chunkPages = computeChunkPages(pageTexts, 1, chunks);
      } catch (e: any) {
        console.error("Page matching failed:", e?.message ?? e);
        chunkPages = chunks.map(() => null);
      }
    }

    // 1) ÖNCE tüm embedding'leri bellekte üret. Hata olursa hiçbir şey silinmez.
    const cleanTitle = sanitizeUnicode(title);
    const allVectors: number[][] = [];
    const BATCH = 8;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const slice = chunks.slice(i, i + BATCH);
      try {
        const vectors = await embed(slice);
        allVectors.push(...vectors);
      } catch (e: any) {
        return json({ error: `Bu dosya işlenemedi, mevcut içerik korundu (${e?.message ?? "embedding hatası"})` }, 400);
      }
    }
    if (allVectors.length !== chunks.length) {
      return json({ error: "Embedding sayısı parça sayısıyla eşleşmedi, mevcut içerik korundu" }, 400);
    }

    // 2) Embedding tamamen başarılı: aynı source_title + category eski satırları sil
    const { data: deletedRows, error: delErr } = await admin
      .from("knowledge_base_chunks")
      .delete()
      .eq("source_title", cleanTitle)
      .eq("category", category)
      .select("id");
    if (delErr) {
      console.error("delete failed", delErr.message);
      return json({ error: "Eski kayıtlar silinemedi, mevcut içerik korundu" }, 400);
    }
    const deletedCount = deletedRows?.length ?? 0;

    // 3) Yeni parçaları yaz
    let total = 0;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const slice = chunks.slice(i, i + BATCH);
      const rows = slice.map((c, j) => ({
        source_title: cleanTitle,
        source_url: sourceUrl,
        category,
        chunk_text: c,
        chunk_index: i + j,
        embedding: allVectors[i + j] as any,
        metadata: {
          uploaded_by: userId,
          file_name: sanitizeUnicode(file.name),
          uploaded_at: new Date().toISOString(),
          ...(chunkPages[i + j] != null ? { page: chunkPages[i + j] } : {}),
        },
      }));
      const { error } = await admin.from("knowledge_base_chunks").insert(rows);
      if (error) {
        console.error("insert failed", error.message);
        return json({ error: "Bu dosya işlenemedi, lütfen başka bir dosya deneyin" }, 400);
      }
      total += rows.length;
    }

    /* 4) EN SON: dosyanın kendisi. Buraya gelindiyse parçalar yazıldı, yani
       dosyayı gösteren kayıt VAR — yükleme başarısız olsa bile öksüz dosya
       oluşmaz ve kurucu kaydı ekranda görüp silebilir. Sıranın gerekçesi
       yukarıdaki `storagePath` bloğundadır. */
    const { error: upErr } = await admin.storage
      .from("case-documents")
      .upload(storagePath, bytes, { contentType: file.type || "application/octet-stream", upsert: true });
    if (upErr) console.error("Storage upload failed (non-fatal):", upErr.message);

    return json({
      ok: true,
      surum: "2026-08-27-yukleme-sonda",
      source_title: title,
      source_url: sourceUrl,
      ...(upErr ? { uyari: `Parçalar yazıldı ama dosyanın kendisi yüklenemedi: ${upErr.message}. Kaynak metni aranabilir, ancak "kaynağı göster" çalışmayacak.` } : {}),
      category,
      chunks: total,
      deleted_chunks: deletedCount,
      inserted_chunks: total,
      message: `${deletedCount} eski parça silindi, ${total} yeni parça yazıldı.`,
    });
  } catch (e: any) {
    console.error("admin-upload-knowledge error", e);
    return json({ error: "Bu dosya işlenemedi, lütfen başka bir dosya deneyin" }, 500);
  }
});
