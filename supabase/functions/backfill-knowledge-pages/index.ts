// Tek seferlik (manuel çağrılan) admin aracı: knowledge_base_chunks'ta metadata.page'i
// olmayan, source_url'i storage:// ile başlayan (admin-upload-knowledge ile elle yüklenmiş
// PDF) kaynaklara geriye dönük sayfa numarası kazandırır. chunk_text ve embedding'e ASLA
// dokunulmaz — yalnızca metadata.page UPDATE edilir. Tek kaynak işler (timeout güvenliği);
// birden fazla kaynak için çağıran taraf döngüyü dışarıdan kurar.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { getDocumentProxy } from "npm:unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const STORAGE_SOURCE_PREFIX = "storage://case-documents/";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// pageTexts sayfa sayfa join("\n") ile birleştirildiğinde her sayfanın ham metindeki başlangıç
// ofsetini üretir — admin-upload-knowledge'daki computeChunkPages ile aynı ofset kalıbı.
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

// Ardışık boşlukları teke indirip kırpar — hem parça arama anahtarına hem tam metne
// AYNI normalizasyon uygulanır ki indexOf karşılaştırması tutarlı olsun.
function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Admin JWT doğrulama — check-new-tariff'taki desenle aynı.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const admin0 = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes } = await admin0.auth.getUser(token);
    if (!userRes?.user) return json({ error: "Oturum doğrulanamadı" }, 401);
    const { data: isAdmin } = await admin0.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin gereklidir" }, 403);

    const { source_title, category, force } = await req.json();
    if (!source_title || !category) {
      return json({ error: "source_title ve category zorunludur" }, 400);
    }
    const forceRecalc = force === true;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: rows, error: rowsErr } = await admin
      .from("knowledge_base_chunks")
      .select("id, source_url, chunk_text, chunk_index, metadata")
      .eq("source_title", source_title)
      .eq("category", category)
      .order("chunk_index", { ascending: true });
    if (rowsErr) return json({ error: rowsErr.message }, 500);
    if (!rows || rows.length === 0) return json({ error: "Kaynak bulunamadı" }, 404);

    const sourceUrl = String(rows[0].source_url ?? "");
    if (!sourceUrl.startsWith(STORAGE_SOURCE_PREFIX)) {
      return json({
        source_title, guncellenen_parca: 0, tam_eslesme: 0, sayfa_silindi: 0, sayfa_yazilamadi: 0,
        atlanan: rows.length, hata: null,
        not: "storage:// kaynağı değil (elle yüklenmemiş) — atlandı",
      });
    }
    if (!sourceUrl.toLowerCase().endsWith(".pdf")) {
      return json({
        source_title, guncellenen_parca: 0, tam_eslesme: 0, sayfa_silindi: 0, sayfa_yazilamadi: 0,
        atlanan: rows.length, hata: null,
        not: "PDF değil (docx/txt) — sayfa hesabı yapılmaz, atlandı",
      });
    }

    const path = sourceUrl.replace(STORAGE_SOURCE_PREFIX, "");
    const { data: blob, error: dlErr } = await admin.storage.from("case-documents").download(path);
    if (dlErr || !blob) return json({ error: dlErr?.message ?? "PDF storage'dan indirilemedi" }, 500);

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const pdf: any = await getDocumentProxy(bytes);
    const totalPages: number = pdf.numPages;
    const pageTexts: string[] = [];
    for (let p = 1; p <= totalPages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      pageTexts.push(tc.items.map((it: any) => ("str" in it ? it.str : "")).join(" "));
    }
    // Tahmin YOK: sayfa yalnızca tam eşleşmeyle yazılır. Arama, boşlukları tekilleştirilmiş
    // (normalize edilmiş) tam metin üzerinde yapılır — parça arama anahtarına da aynı
    // normalizasyon uygulanır ki indexOf tutarlı çalışsın.
    const normalizedPageTexts = pageTexts.map(normalizeWs);
    const normalizedFullText = normalizedPageTexts.join(" ");
    const normalizedPageOffsets = buildPageOffsets(normalizedPageTexts);

    // Parçaları chunk_index sırasına göre işle. Arama, bir önceki BULUNMUŞ parçanın
    // konumundan ileriye doğru yapılır (searchCursor yalnız başarılı eşleşmede ilerler,
    // asla geri kaymaz). Eşleşme yoksa: mevcut (muhtemelen yanlış) page değeri varsa
    // silinir (null); yoksa hiçbir şey yazılmaz — yanlış sayfa asla üretilmez.
    let searchCursor = 0;
    let updated = 0;
    let tamEslesme = 0;
    let sayfaSilindi = 0;
    let sayfaYazilamadi = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const row of rows) {
      const existingMeta = (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>;
      const hadPage = existingMeta.page != null;

      const chunkText = String(row.chunk_text ?? "");
      const probe = normalizeWs(chunkText.trim().slice(0, 80));
      let foundPage: number | null = null;
      if (probe) {
        const idx = normalizedFullText.indexOf(probe, searchCursor);
        if (idx !== -1) {
          searchCursor = idx;
          foundPage = pageForOffset(normalizedPageOffsets, 1, idx);
        }
      }

      if (hadPage && !forceRecalc) {
        // Zaten sayfası var ve force istenmedi — bugünkü davranış: dokunma. (Arama yine de
        // yapıldı ki searchCursor sıradaki parçalar için doğru ileri konumda kalsın.)
        skipped++;
        continue;
      }

      if (foundPage != null) {
        const { error: updErr } = await admin
          .from("knowledge_base_chunks")
          .update({ metadata: { ...existingMeta, page: foundPage } })
          .eq("id", row.id);
        if (updErr) errors.push(`${row.id}: ${updErr.message}`);
        else { updated++; tamEslesme++; }
      } else if (hadPage) {
        // Eşleşme yok ve eski (güvenilmez) bir page değeri var — yanlış sayfa görünmesin diye sil.
        const { error: updErr } = await admin
          .from("knowledge_base_chunks")
          .update({ metadata: { ...existingMeta, page: null } })
          .eq("id", row.id);
        if (updErr) errors.push(`${row.id}: ${updErr.message}`);
        else { updated++; sayfaSilindi++; }
      } else {
        // Eşleşme yok, zaten page de yoktu — yazacak bir şey yok.
        sayfaYazilamadi++;
      }
    }

    return json({
      source_title,
      guncellenen_parca: updated,
      tam_eslesme: tamEslesme,
      sayfa_silindi: sayfaSilindi,
      sayfa_yazilamadi: sayfaYazilamadi,
      atlanan: skipped,
      hata: errors.length ? errors.join("; ") : null,
    });
  } catch (e: any) {
    console.error("backfill-knowledge-pages error", e);
    return json({ error: e?.message ?? "Sunucu hatası" }, 500);
  }
});
