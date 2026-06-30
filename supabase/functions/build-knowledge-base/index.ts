// Admin-only: ADB resmi arabuluculuk PDF'lerini chunk + embed + store eder.
// İki mod:
//   - whole_book: invocation = en fazla 1 kitap (küçük/orta PDF'ler için).
//   - page_chunked: invocation = mevcut kitabın PAGE_BATCH_SIZE sayfası
//     (büyük PDF'ler için; CPU/zaman limitine takılan kitaplar bu modla yeniden işlenir).
// İstemci (KnowledgeBaseAdmin) job running iken bizi resume_job_id ile yeniden çağırır.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { extractText, getDocumentProxy } from "npm:unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Book = { title: string; url: string; category: string };
type BuildRequest = {
  test?: boolean;
  limit?: number;
  resume_job_id?: string;
  only_url?: string;
  retry_skipped?: boolean;
};

const PDF_DOWNLOAD_TIMEOUT_MS = 60_000;
const PAGE_EXTRACT_TIMEOUT_MS = 90_000;
const EMBEDDING_TIMEOUT_MS = 45_000;
const BOOK_TIMEOUT_MS = 240_000;
const PAGE_SLICE_TIMEOUT_MS = 150_000;
const MAX_EMBED_RETRIES = 4;
const PAGE_BATCH_SIZE = 50; // sayfa grubu (büyük PDF'ler için)

const BOOKS: Book[] = [
  { category: "genel", title: "ADB Yayını 1", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/40320221402571.pdf" },
  { category: "genel", title: "Mahkeme Temelli Arabuluculuk El Kitabı", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1412021155603Mahkeme%20Temelli%20Arabuluculuk%20El%20Kitab%C4%B1.pdf" },
  { category: "genel", title: "Singapur Sözleşmesi'nin Arabuluculuk Üzerine Yansımaları", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1412021155535Singapur%20S%C3%B6zle%C5%9Fmesi%E2%80%99nin%20Arabuluculuk%20%C3%9Czerine%20Yans%C4%B1malar%C4%B1%20Sempozyumu.pdf" },
  { category: "genel", title: "Arabuluculuğa Hazırlanmak", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1412021155340Arabuluculu%C4%9Fa%20Haz%C4%B1rlanmak.pdf" },
  { category: "genel", title: "Arabuluculukta Etkili Taraf Vekilliği", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1412021155311Arabuluculukta%20Etkili%20Taraf%20Vekilli%C4%9Fi.pdf" },
  { category: "aile", title: "Aile Arabuluculuğu", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1512021090918Aile%20Arabuluculu%C4%9Fu.pdf" },
  { category: "işçi_işveren", title: "İş Hukukunda Arabuluculuk Uzmanlık Eğitimi", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1412021155424%C4%B0%C5%9F%20Hukukunda%20Arabuluculuk%20Uzmanl%C4%B1k%20E%C4%9Fitimi.pdf" },
  { category: "ticari", title: "Ticari Uyuşmazlıklarda Dava Şartı Arabuluculuk", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1512021090954Ticari%20Uyu%C5%9Fmazl%C4%B1klarda%20Dava%20%C5%9Eart%C4%B1%20Arabuluculuk.pdf" },
  { category: "genel", title: "Uzman Arabuluculuğa Giriş", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/10072023160455Uzman%20Arabuluculug%CC%86a%20Giris%CC%A7%20Kitab%C4%B1.pdf" },
  { category: "işçi_işveren", title: "Uzman Arabuluculuk - İş", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/10052023082837i%C5%9F.pdf" },
  { category: "ticari", title: "Uzman Arabuluculuk - Ticaret", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1832021210234Ticaret.pdf" },
  { category: "tüketici", title: "Uzman Arabuluculuk - Tüketici", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1832021210432T%C3%BCketici.pdf" },
  { category: "bankacılık", title: "Uzman Arabuluculuk - Banka ve Finans", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1832021210540Banka_ve_Finans.pdf" },
  { category: "enerji_maden", title: "Uzman Arabuluculuk - Enerji ve Maden", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1832021210622Enerji_ve_Maden.pdf" },
  { category: "fikri_mülkiyet", title: "Uzman Arabuluculuk - Fikri Mülkiyet", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1832021210657Fikri_Mulkiyet.pdf" },
  { category: "inşaat", title: "Uzman Arabuluculuk - İnşaat Hukuku", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1832021210709Insaat_Hukuku.pdf" },
  { category: "sağlık", title: "Uzman Arabuluculuk - Sağlık", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1832021210748Saglik.pdf" },
  { category: "spor", title: "Uzman Arabuluculuk - Spor", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1832021210755Spor.pdf" },
  { category: "sigorta", title: "Uzman Arabuluculuk - Sigorta Hukuku", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1792021150550Arabuluculuk_Sigorta_Hukuku_Dijital%20(1).pdf" },
];

// Daha önce whole_book modunda CPU limitine takılan 7 kitap.
const SKIPPED_TITLES = new Set<string>([
  "Arabuluculukta Etkili Taraf Vekilliği",
  "Aile Arabuluculuğu",
  "Uzman Arabuluculuğa Giriş",
  "Uzman Arabuluculuk - İş",
  "Uzman Arabuluculuk - Banka ve Finans",
  "Uzman Arabuluculuk - Fikri Mülkiyet",
  "Uzman Arabuluculuk - Sigorta Hukuku",
]);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function readBody(req: Request): Promise<BuildRequest> {
  if (req.method !== "POST") return {};
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return {};
  try {
    return await req.json();
  } catch {
    return {};
  }
}

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

async function updateJob(admin: any, jobId: string, patch: Record<string, unknown>) {
  const { error } = await admin.from("knowledge_base_jobs").update({
    ...patch,
    updated_at: new Date().toISOString(),
  }).eq("id", jobId);
  if (error) console.error("Job update failed", error.message);
}

function chunkText(text: string, target = 1800, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + " " + s).length > target && cur) {
      chunks.push(cur.trim());
      const tail = cur.slice(Math.max(0, cur.length - overlap));
      cur = tail + " " + s;
    } else {
      cur = cur ? cur + " " + s : s;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.filter((c) => c.length > 200);
}

const MAX_CHUNKS_PER_BOOK = 600;

async function embed(texts: string[]): Promise<number[][]> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_EMBED_RETRIES; attempt += 1) {
    try {
      const res = await withTimeout(`Embedding isteği (${attempt}/${MAX_EMBED_RETRIES})`, EMBEDDING_TIMEOUT_MS, () =>
        fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "openai/text-embedding-3-small", input: texts, dimensions: 768 }),
        })
      );
      if (res.status === 429 || res.status >= 500) {
        const body = await res.text();
        throw new Error(`Embedding geçici hatası ${res.status}: ${body.slice(0, 200)}`);
      }
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Embedding hatası ${res.status}: ${body.slice(0, 300)}`);
      }
      const j = await res.json();
      return j.data.map((d: any) => d.embedding);
    } catch (e: any) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < MAX_EMBED_RETRIES) await delay(1_500 * attempt * attempt);
    }
  }
  throw lastError ?? new Error("Embedding isteği başarısız oldu");
}

// ============ Whole-book mode ============
async function processBookWhole(admin: any, jobId: string, book: Book, existingChunks: number): Promise<{ chunks: number }> {
  const { extractText } = await import("npm:unpdf@0.12.1");
  console.log(`[${jobId}] Processing book (whole): ${book.title}`);
  await updateJob(admin, jobId, { current_book: `${book.title} — PDF indiriliyor` });
  const resp = await withTimeout("PDF indirme", PDF_DOWNLOAD_TIMEOUT_MS, () =>
    fetch(book.url, { headers: { "User-Agent": "Mozilla/5.0 MediPactBot" } })
  );
  if (!resp.ok) throw new Error(`PDF indirilemedi ${resp.status}`);
  const buf = new Uint8Array(await resp.arrayBuffer());
  await updateJob(admin, jobId, { current_book: `${book.title} — metin çıkarılıyor` });
  const pdf = await getDocumentProxy(buf);
  const { text } = await withTimeout("PDF metin çıkarma", PAGE_EXTRACT_TIMEOUT_MS, () => extractText(pdf, { mergePages: true }));
  const fullText = Array.isArray(text) ? text.join("\n") : text;
  const chunks = chunkText(fullText);
  if (!chunks.length) return { chunks: 0 };
  if (chunks.length > MAX_CHUNKS_PER_BOOK) {
    throw new Error(`Anormal parça sayısı (${chunks.length} > ${MAX_CHUNKS_PER_BOOK}). PDF içeriği bozuk veya yanlış indirilmiş olabilir.`);
  }
  await updateJob(admin, jobId, { current_book: `${book.title} — eski parçalar temizleniyor` });
  await admin.from("knowledge_base_chunks").delete().eq("source_url", book.url);

  let total = 0;
  const BATCH = 16;
  for (let i = 0; i < chunks.length; i += BATCH) {
    await updateJob(admin, jobId, {
      current_book: `${book.title} — embedding ${i + 1}-${Math.min(i + BATCH, chunks.length)}/${chunks.length}`,
    });
    const slice = chunks.slice(i, i + BATCH);
    const vectors = await embed(slice);
    const rows = slice.map((c, j) => ({
      source_title: book.title, source_url: book.url, category: book.category,
      chunk_text: c, chunk_index: i + j, embedding: vectors[j] as any,
    }));
    const { error } = await admin.from("knowledge_base_chunks").insert(rows);
    if (error) throw new Error(error.message);
    total += rows.length;
    await updateJob(admin, jobId, {
      total_chunks: existingChunks + total,
      current_book: `${book.title} — ${total}/${chunks.length} parça kaydedildi`,
    });
  }
  console.log(`[${jobId}] Completed (whole): ${book.title}, chunks=${total}`);
  return { chunks: total };
}

// ============ Page-chunked mode ============
// Tek invocation = mevcut kitabın PAGE_BATCH_SIZE sayfası. İlerleme book_progress'a yazılır.
async function processBookPageSlice(
  admin: any,
  jobId: string,
  book: Book,
  startPage: number,
  bookProgress: Record<string, any>,
  totalChunksSoFar: number,
): Promise<{ pagesProcessed: number; totalPages: number; chunksAdded: number; bookDone: boolean }> {
  console.log(`[${jobId}] Page-slice: ${book.title} from page ${startPage}`);
  await updateJob(admin, jobId, { current_book: `${book.title} — sayfa ${startPage + 1}+ indiriliyor` });
  const resp = await withTimeout("PDF indirme", PDF_DOWNLOAD_TIMEOUT_MS, () =>
    fetch(book.url, { headers: { "User-Agent": "Mozilla/5.0 MediPactBot" } })
  );
  if (!resp.ok) throw new Error(`PDF indirilemedi ${resp.status}`);
  const buf = new Uint8Array(await resp.arrayBuffer());

  await updateJob(admin, jobId, { current_book: `${book.title} — sayfa açılıyor` });
  const pdf: any = await getDocumentProxy(buf);
  const totalPages: number = pdf.numPages;
  const endPage = Math.min(startPage + PAGE_BATCH_SIZE, totalPages);

  // İlk dilimde eski chunk'ları temizle.
  if (startPage === 0) {
    await admin.from("knowledge_base_chunks").delete().eq("source_url", book.url);
  }

  await updateJob(admin, jobId, { current_book: `${book.title} — metin çıkarılıyor (sayfa ${startPage + 1}-${endPage}/${totalPages})` });
  const pageTexts: string[] = await withTimeout("Sayfa metin çıkarma", PAGE_EXTRACT_TIMEOUT_MS, async () => {
    const out: string[] = [];
    for (let p = startPage + 1; p <= endPage; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      out.push(tc.items.map((it: any) => ("str" in it ? it.str : "")).join(" "));
    }
    return out;
  });

  const sliceText = pageTexts.join("\n");
  const chunks = chunkText(sliceText);
  let chunkAdded = 0;
  const baseIndex = Number(bookProgress[book.url]?.chunk_offset ?? 0);
  if (chunks.length) {
    const BATCH = 16;
    for (let i = 0; i < chunks.length; i += BATCH) {
      await updateJob(admin, jobId, {
        current_book: `${book.title} — embedding sayfa ${startPage + 1}-${endPage}/${totalPages} (${i + 1}-${Math.min(i + BATCH, chunks.length)}/${chunks.length})`,
      });
      const slice = chunks.slice(i, i + BATCH);
      const vectors = await embed(slice);
      const rows = slice.map((c, j) => ({
        source_title: book.title, source_url: book.url, category: book.category,
        chunk_text: c, chunk_index: baseIndex + i + j, embedding: vectors[j] as any,
      }));
      const { error } = await admin.from("knowledge_base_chunks").insert(rows);
      if (error) throw new Error(error.message);
      chunkAdded += rows.length;
      await updateJob(admin, jobId, { total_chunks: totalChunksSoFar + chunkAdded });
    }
  }

  const bookDone = endPage >= totalPages;
  return { pagesProcessed: endPage - startPage, totalPages, chunksAdded: chunkAdded, bookDone };
}

const MAX_ATTEMPTS_PER_BOOK = 2;
const MAX_ATTEMPTS_PER_SLICE = 2;

async function runOne(admin: any, jobId: string) {
  const { data: job, error } = await admin.from("knowledge_base_jobs").select("*").eq("id", jobId).maybeSingle();
  if (error || !job) throw new Error("İş bulunamadı");
  const processedUrls: string[] = Array.isArray(job.processed_urls) ? job.processed_urls : [];
  const books: Book[] = Array.isArray(job.book_queue) && job.book_queue.length > 0 ? job.book_queue : BOOKS;
  const attemptCounts: Record<string, number> = (job.attempt_counts && typeof job.attempt_counts === "object") ? { ...job.attempt_counts } : {};
  const errors: any[] = Array.isArray(job.errors) ? [...job.errors] : [];
  const bookProgress: Record<string, any> = (job.book_progress && typeof job.book_progress === "object") ? { ...job.book_progress } : {};
  const mode: string = job.mode ?? "whole_book";

  const next = books.find((b) => !processedUrls.includes(b.url));
  if (!next) {
    await updateJob(admin, jobId, {
      status: errors.length ? "completed_with_errors" : "completed",
      current_book: null,
      finished_at: new Date().toISOString(),
    });
    return { done: true };
  }

  // ---------- page_chunked mode ----------
  if (mode === "page_chunked") {
    const progress = bookProgress[next.url] ?? { pages_done: 0, total_pages: 0, chunk_offset: 0, slice_attempts: 0 };
    const sliceAttempts = Number(progress.slice_attempts ?? 0) + 1;
    progress.slice_attempts = sliceAttempts;
    bookProgress[next.url] = progress;

    if (sliceAttempts > MAX_ATTEMPTS_PER_SLICE) {
      // Bu sayfa dilimi 2 denemede de çöktü; kitabı atla.
      errors.push({ book: next.title, url: next.url, error: `Sayfa ${progress.pages_done + 1}+ dilimi ${MAX_ATTEMPTS_PER_SLICE} denemede de işlenemedi.` });
      processedUrls.push(next.url);
      progress.slice_attempts = 0;
      await updateJob(admin, jobId, {
        processed_books: processedUrls.length, processed_urls: processedUrls,
        attempt_counts: attemptCounts, errors, book_progress: bookProgress, current_book: null,
      });
      if (processedUrls.length >= books.length) {
        await updateJob(admin, jobId, {
          status: errors.length ? "completed_with_errors" : "completed",
          current_book: null, finished_at: new Date().toISOString(),
        });
      }
      return { done: processedUrls.length >= books.length, skipped: next.title };
    }

    await updateJob(admin, jobId, {
      status: "running",
      current_book: `${next.title} (sayfa ${progress.pages_done + 1}+, deneme ${sliceAttempts}/${MAX_ATTEMPTS_PER_SLICE})`,
      book_progress: bookProgress,
    });

    let totalChunks: number = Number(job.total_chunks ?? 0);
    try {
      const { pagesProcessed, totalPages, chunksAdded, bookDone } = await withTimeout(
        `Sayfa dilimi: ${next.title}`,
        PAGE_SLICE_TIMEOUT_MS,
        () => processBookPageSlice(admin, jobId, next, Number(progress.pages_done ?? 0), bookProgress, totalChunks),
      );
      progress.pages_done = Number(progress.pages_done ?? 0) + pagesProcessed;
      progress.total_pages = totalPages;
      progress.chunk_offset = Number(progress.chunk_offset ?? 0) + chunksAdded;
      progress.slice_attempts = 0; // başarılı dilim → sıfırla
      bookProgress[next.url] = progress;
      totalChunks += chunksAdded;

      if (bookDone) {
        processedUrls.push(next.url);
        console.log(`[${jobId}] Book done (chunked): ${next.title}, total chunks=${progress.chunk_offset}`);
      }

      await updateJob(admin, jobId, {
        processed_books: processedUrls.length, processed_urls: processedUrls,
        total_chunks: totalChunks, book_progress: bookProgress,
        current_book: bookDone ? null : `${next.title} — ${progress.pages_done}/${totalPages} sayfa tamamlandı`,
      });
      if (processedUrls.length >= books.length) {
        await updateJob(admin, jobId, {
          status: errors.length ? "completed_with_errors" : "completed",
          current_book: null, finished_at: new Date().toISOString(),
        });
      }
      return { done: processedUrls.length >= books.length, book: next.title, pages_done: progress.pages_done, total_pages: totalPages };
    } catch (e: any) {
      console.error(`[${jobId}] Slice failed: ${next.title}`, e?.message);
      // slice_attempts zaten artırıldı; bookProgress'i kalıcı kaydet, hatayı şimdi ekleme (yeniden denenecek).
      await updateJob(admin, jobId, { book_progress: bookProgress, current_book: null });
      return { done: false, error: e?.message ?? String(e), book: next.title };
    }
  }

  // ---------- whole_book mode (mevcut davranış) ----------
  const prevAttempts = Number(attemptCounts[next.url] ?? 0);
  const newAttempts = prevAttempts + 1;
  attemptCounts[next.url] = newAttempts;

  if (newAttempts > MAX_ATTEMPTS_PER_BOOK) {
    errors.push({ book: next.title, url: next.url, error: `Kitap ${MAX_ATTEMPTS_PER_BOOK} denemede de işlenemedi (worker CPU/zaman limiti). Atlandı.` });
    processedUrls.push(next.url);
    await updateJob(admin, jobId, {
      processed_books: processedUrls.length, processed_urls: processedUrls,
      attempt_counts: attemptCounts, errors, current_book: null,
    });
    if (processedUrls.length >= books.length) {
      await updateJob(admin, jobId, {
        status: errors.length ? "completed_with_errors" : "completed",
        current_book: null, finished_at: new Date().toISOString(),
      });
    }
    return { done: processedUrls.length >= books.length, processed: processedUrls.length, total: books.length, skipped: next.title };
  }

  await updateJob(admin, jobId, {
    status: "running",
    current_book: `${next.title} (deneme ${newAttempts}/${MAX_ATTEMPTS_PER_BOOK})`,
    attempt_counts: attemptCounts,
  });
  let totalChunks: number = Number(job.total_chunks ?? 0);
  let bookSucceeded = false;
  try {
    const { chunks } = await withTimeout(`Kitap işleme: ${next.title}`, BOOK_TIMEOUT_MS, () =>
      processBookWhole(admin, jobId, next, totalChunks),
    );
    totalChunks += chunks;
    bookSucceeded = true;
  } catch (e: any) {
    console.error(`[${jobId}] Book failed: ${next.title}`, e?.message);
    if (newAttempts >= MAX_ATTEMPTS_PER_BOOK) {
      errors.push({ book: next.title, url: next.url, error: e?.message ?? String(e) });
      bookSucceeded = true;
    }
  }

  if (bookSucceeded) processedUrls.push(next.url);
  await updateJob(admin, jobId, {
    processed_books: processedUrls.length, processed_urls: processedUrls,
    total_chunks: totalChunks, attempt_counts: attemptCounts, errors, current_book: null,
  });
  if (processedUrls.length >= books.length) {
    await updateJob(admin, jobId, {
      status: errors.length ? "completed_with_errors" : "completed",
      current_book: null, finished_at: new Date().toISOString(),
    });
  }
  return { done: processedUrls.length >= books.length, processed: processedUrls.length, total: books.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const requestBody = await readBody(req);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return jsonResponse({ error: "Invalid session" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return jsonResponse({ error: "Forbidden" }, 403);

    if (requestBody.resume_job_id) {
      const result = await runOne(admin, requestBody.resume_job_id);
      return jsonResponse({ job_id: requestBody.resume_job_id, ...result });
    }

    // Yeni iş başlat. Diğer aktif işleri temizle.
    await admin.from("knowledge_base_jobs")
      .update({ status: "failed", finished_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .in("status", ["pending", "running"]);

    let books: Book[];
    let mode: "whole_book" | "page_chunked" = "whole_book";

    if (requestBody.retry_skipped) {
      books = BOOKS.filter((b) => SKIPPED_TITLES.has(b.title));
      mode = "page_chunked";
    } else if (requestBody.only_url) {
      const b = BOOKS.find((x) => x.url === requestBody.only_url);
      if (!b) return jsonResponse({ error: "URL bulunamadı" }, 400);
      books = [b];
    } else if (requestBody.test) {
      books = [BOOKS[5]];
    } else if (requestBody.limit && requestBody.limit > 0) {
      books = BOOKS.slice(0, Math.min(requestBody.limit, BOOKS.length));
    } else {
      books = BOOKS;
    }

    const { data: job, error: jobErr } = await admin.from("knowledge_base_jobs").insert({
      status: "running",
      total_books: books.length,
      processed_books: 0,
      total_chunks: 0,
      current_book: books[0]?.title ?? null,
      processed_urls: [],
      book_queue: books,
      mode,
      book_progress: {},
    }).select().single();
    if (jobErr) throw jobErr;
    console.log(`[${job.id}] Job created mode=${mode} books=${books.length}`);

    const result = await runOne(admin, job.id);
    return jsonResponse({ job_id: job.id, total_books: books.length, mode, ...result });
  } catch (e: any) {
    console.error("build-knowledge-base error", e?.message);
    return jsonResponse({ error: e?.message ?? "İç hata" }, 500);
  }
});
