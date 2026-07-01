// Admin-only: Adalet Bakanlığı mevzuat, yönetmelik, etik kuralları ve 2026 ücret tarifesini
// knowledge_base_chunks tablosuna ekler. Mevcut build-knowledge-base sistemine dokunmaz.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { extractText, getDocumentProxy } from "npm:unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Source = {
  title: string;
  url: string;
  category: "mevzuat" | "ucret_tarifesi";
  is_html?: boolean;
  parse_tarife?: boolean;
};

const SOURCES: Source[] = [
  { title: "6325 Sayılı Hukuk Uyuşmazlıklarında Arabuluculuk Kanunu", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/11120231556551.5.6325.pdf", category: "mevzuat" },
  { title: "7036 Sayılı İş Mahkemeleri Kanunu", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/15120210744381.5.7036.pdf", category: "mevzuat" },
  { title: "HMK Değişiklik Kanunu - Tüketici Arabuluculuk", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1512021075029Hukuk%20Muhakemeleri%20Kanunu%20(T%C3%BCketici).pdf", category: "mevzuat" },
  { title: "7155 Sayılı Ticari Arabuluculuk Kanunu", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/250520222005367155.pdf", category: "mevzuat" },
  { title: "Hukuk Uyuşmazlıklarında Arabuluculuk Kanunu Yönetmeliği", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/30120221536271.pdf", category: "mevzuat" },
  { title: "Arabuluculuk Etik Kuralları", url: "https://adb.adalet.gov.tr/Home/SayfaDetay/etik-kurallari15012021075651", category: "mevzuat", is_html: true },
  { title: "2026 Yılı Arabuluculuk Asgari Ücret Tarifesi", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/202512261346231902026%20Y%C4%B1l%C4%B1%20Arabuluculuk%20Asgari%20%C3%9Ccret%20Tarifesi.pdf", category: "ucret_tarifesi", parse_tarife: true },
];

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function chunkText(text: string, target = 1600, overlap = 150): string[] {
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
  return chunks.filter((c) => c.length > 180);
}

// gün/hafta/ay/yıl + sayı kombinasyonu içeren chunk'ları işaretle.
const DEADLINE_RE = /\b\d+\s*(gün|hafta|ay|yıl)\b|\bsüresi (içinde|içerisinde)\b|\ben geç\b/i;

async function fetchPdfText(url: string): Promise<string> {
  const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 MediPactBot" } });
  if (!resp.ok) throw new Error(`PDF indirilemedi ${resp.status}`);
  const buf = new Uint8Array(await resp.arrayBuffer());
  const pdf = await getDocumentProxy(buf);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

async function fetchHtmlText(url: string): Promise<string> {
  const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 MediPactBot" } });
  if (!resp.ok) throw new Error(`Sayfa indirilemedi ${resp.status}`);
  const html = await resp.text();
  // Basit HTML → metin: script/style çıkar, tag'leri sil.
  const noScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ");
  const text = noScripts.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  return text.replace(/\s+/g, " ").trim();
}

// 2026 ücret tarifesinden satır bazlı kalem çıkarımı: {tanim, tutar, birim}
function parseTarifeItems(fullText: string): Array<{ tanim: string; tutar: string; birim: string }> {
  const items: Array<{ tanim: string; tutar: string; birim: string }> = [];
  // Satır bazlı yaklaşım: nokta/newline heuristikleri
  const lines = fullText.split(/(?<=[.!?])\s+|\n+/).map((l) => l.trim()).filter(Boolean);
  // TL / % / saat ücret ipuçları
  const moneyRe = /(\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?)(\s*(?:TL|Türk Lirası|₺))/i;
  const percentRe = /%\s*\d+(?:[.,]\d+)?/;
  const rangeRe = /(\d[\d.\s]*)\s*[-–]\s*(\d[\d.\s]*)/;
  for (const line of lines) {
    if (line.length < 6 || line.length > 400) continue;
    const money = line.match(moneyRe);
    const pct = line.match(percentRe);
    if (!money && !pct) continue;
    let tutar = "";
    let birim = "";
    if (money) {
      tutar = money[1].trim();
      birim = "TL";
    } else if (pct) {
      tutar = pct[0].replace(/\s+/g, "");
      birim = "yüzde";
    }
    // saatlik / oturum ipucu
    if (/saat/i.test(line)) birim = birim ? `${birim}/saat` : "saat";
    else if (/oturum/i.test(line)) birim = birim ? `${birim}/oturum` : "oturum";
    const tanim = line.replace(moneyRe, "").replace(percentRe, "").replace(rangeRe, "").replace(/\s{2,}/g, " ").trim().replace(/[:\-–]+$/, "").trim();
    if (!tanim) continue;
    items.push({ tanim, tutar, birim });
  }
  // Duplicate'leri sadeleştir
  const seen = new Set<string>();
  return items.filter((it) => {
    const k = `${it.tanim}|${it.tutar}|${it.birim}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
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

async function processSource(admin: any, source: Source): Promise<{ chunks: number; kalemler?: number }> {
  const rawText = source.is_html ? await fetchHtmlText(source.url) : await fetchPdfText(source.url);
  if (!rawText || rawText.length < 200) throw new Error("İçerik boş veya çok kısa");

  const chunks = chunkText(rawText);
  if (!chunks.length) throw new Error("Chunk oluşturulamadı");

  // 2026 tarife için kalem parse
  let kalemler: Array<{ tanim: string; tutar: string; birim: string }> = [];
  if (source.parse_tarife) {
    kalemler = parseTarifeItems(rawText);
  }

  // Eski kayıtları temizle
  await admin.from("knowledge_base_chunks").delete().eq("source_url", source.url);

  let total = 0;
  const BATCH = 16;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const slice = chunks.slice(i, i + BATCH);
    const vectors = await embed(slice);
    const rows = slice.map((c, j) => {
      const meta: Record<string, unknown> = {};
      if (DEADLINE_RE.test(c)) meta.contains_deadline = true;
      if (source.category === "ucret_tarifesi") {
        meta.type = "ucret_tarifesi";
        meta.yil = 2026;
        // Kalem listesini yalnızca ilk chunk'a ekle (tek gerçeklik kaynağı).
        if (i === 0 && j === 0 && kalemler.length) meta.kalemler = kalemler;
      }
      if (source.category === "mevzuat") {
        meta.type = "mevzuat";
      }
      return {
        source_title: source.title,
        source_url: source.url,
        category: source.category,
        chunk_text: c,
        chunk_index: i + j,
        embedding: vectors[j] as any,
        metadata: meta,
      };
    });
    const { error } = await admin.from("knowledge_base_chunks").insert(rows);
    if (error) throw new Error(error.message);
    total += rows.length;
  }
  return { chunks: total, kalemler: source.parse_tarife ? kalemler.length : undefined };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return jsonResponse({ error: "Invalid session" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return jsonResponse({ error: "Forbidden" }, 403);

    const results: Array<{ title: string; ok: boolean; chunks?: number; kalemler?: number; error?: string }> = [];
    for (const src of SOURCES) {
      try {
        console.log(`[legal-kb] processing: ${src.title}`);
        const { chunks, kalemler } = await processSource(admin, src);
        results.push({ title: src.title, ok: true, chunks, kalemler });
      } catch (e: any) {
        console.error(`[legal-kb] failed: ${src.title}`, e?.message);
        results.push({ title: src.title, ok: false, error: e?.message ?? String(e) });
      }
    }
    const totalChunks = results.reduce((s, r) => s + (r.chunks ?? 0), 0);
    const tarife = results.find((r) => r.title.includes("2026"));
    return jsonResponse({
      ok: true,
      total_sources: SOURCES.length,
      total_chunks: totalChunks,
      tarife_kalem_sayisi: tarife?.kalemler ?? 0,
      results,
    });
  } catch (e: any) {
    console.error("build-legal-knowledge error", e?.message);
    return jsonResponse({ error: e?.message ?? "İç hata" }, 500);
  }
});
