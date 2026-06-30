// Admin-only: scrape ADB official mediation PDFs, chunk, embed, store.
// Runs in background via EdgeRuntime.waitUntil and writes progress to knowledge_base_jobs.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { extractText, getDocumentProxy } from "npm:unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Book = { title: string; url: string; category: string };

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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

function chunkText(text: string, target = 900, overlap = 90): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  // Split on sentence boundaries first.
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
  return chunks.filter((c) => c.length > 100);
}

async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: texts,
      dimensions: 768,
    }),
  });
  if (!res.ok) throw new Error(`Embed failed ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j.data.map((d: any) => d.embedding);
}

async function processBook(admin: any, book: Book): Promise<{ chunks: number }> {
  const resp = await fetch(book.url, { headers: { "User-Agent": "Mozilla/5.0 MediPactBot" } });
  if (!resp.ok) throw new Error(`PDF indirilemedi ${resp.status}`);
  const buf = new Uint8Array(await resp.arrayBuffer());
  const pdf = await getDocumentProxy(buf);
  const { text } = await extractText(pdf, { mergePages: true });
  const fullText = Array.isArray(text) ? text.join("\n") : text;
  const chunks = chunkText(fullText);
  if (!chunks.length) return { chunks: 0 };

  // Wipe existing chunks for this source so we get a clean re-run.
  await admin.from("knowledge_base_chunks").delete().eq("source_url", book.url);

  let total = 0;
  const BATCH = 32;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const slice = chunks.slice(i, i + BATCH);
    const vectors = await embed(slice);
    const rows = slice.map((c, j) => ({
      source_title: book.title,
      source_url: book.url,
      category: book.category,
      chunk_text: c,
      chunk_index: i + j,
      embedding: vectors[j] as any,
    }));
    const { error } = await admin.from("knowledge_base_chunks").insert(rows);
    if (error) throw new Error(error.message);
    total += rows.length;
  }
  return { chunks: total };
}

async function runJob(admin: any, jobId: string) {
  let processed = 0;
  let totalChunks = 0;
  const errors: any[] = [];
  for (const book of BOOKS) {
    await admin.from("knowledge_base_jobs").update({
      current_book: book.title,
      processed_books: processed,
      total_chunks: totalChunks,
      status: "running",
    }).eq("id", jobId);
    try {
      const { chunks } = await processBook(admin, book);
      totalChunks += chunks;
    } catch (e: any) {
      errors.push({ book: book.title, url: book.url, error: e.message });
    }
    processed += 1;
  }
  await admin.from("knowledge_base_jobs").update({
    status: errors.length ? "completed_with_errors" : "completed",
    processed_books: processed,
    total_chunks: totalChunks,
    errors,
    current_book: null,
    finished_at: new Date().toISOString(),
  }).eq("id", jobId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: corsHeaders });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    // Prevent concurrent jobs.
    const { data: running } = await admin.from("knowledge_base_jobs")
      .select("id").in("status", ["pending", "running"]).maybeSingle();
    if (running) {
      return new Response(JSON.stringify({ error: "Zaten çalışan bir iş var", job_id: running.id }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: job, error: jobErr } = await admin.from("knowledge_base_jobs").insert({
      status: "running", total_books: BOOKS.length, processed_books: 0, total_chunks: 0,
    }).select().single();
    if (jobErr) throw jobErr;

    // @ts-ignore EdgeRuntime is available in Supabase functions
    EdgeRuntime.waitUntil(runJob(admin, job.id).catch(async (e) => {
      await admin.from("knowledge_base_jobs").update({
        status: "failed", errors: [{ error: e.message }], finished_at: new Date().toISOString(),
      }).eq("id", job.id);
    }));

    return new Response(JSON.stringify({ job_id: job.id, total_books: BOOKS.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
