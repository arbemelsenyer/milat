// KAYNAK ARA — BİLGİ TABANININ TEK OKUMA KAPISI (HAT H-36 · H-37)
//
// Kurucu (11.09.2026): *"Kaynaklardan sorgulama yapınca doğrulama istenecek;
// bunu nasıl göreceğiz, özellikle test aşamasında bir görmeliyiz. Kullanıcı da
// kaynaktan doğrulamada görebilmeli."*
//
// NİÇİN EDGE FONKSİYONU — TEK SEBEP: `knowledge_base_chunks` tablosunun okuma
// politikası YALNIZ YÖNETİCİYE açıktır:
//     "Admins can read knowledge base" → has_role(auth.uid(), 'admin')
// Arabulucu yönetici değildir. H-37(b) "kullanıcı da kaynağı görebilsin" diyor;
// bu yüzden okuma buradan, servis anahtarıyla ve KAPIYLA yapılır.
// POLİTİKA DEĞİŞTİRİLMEDİ, SQL ÇALIŞTIRILMADI (kurucu: "SQL gerekmiyor").
//
// KAPI: yalnız oturumu doğrulanmış kullanıcı. Anonim erişim YOK.
// Açılan şey ürünün kendi HUKUK KİTAPLIĞIDIR (Adalet Bakanlığı yayınları,
// mevzuat). Dosya verisi, taraf verisi, beyan, belge İÇERMEZ — bu fonksiyon
// `knowledge_base_chunks` dışında hiçbir tabloya bakmaz. KVKK kapsamına giren
// bir veri bu kapıdan geçmez.
//
// ÜÇ KİP, TEK KAPI (H-36 ile H-37 aynı görünümü kullanır; iki tasarım yok):
//   · "ara"    → soruyu gömüp anlamca en yakın parçaları bulur (H-37a)
//   · "kitap"  → bir kitabın parçalarını sırayla, sayfalayarak verir (H-36)
//   · "kunye"  → AI cevabının altındaki kaynak künyesinin dayandığı parçayı
//                bulur (H-37b)
//
// UYDURMA YASAK (§2-A): bu fonksiyon MODEL ÇALIŞTIRMAZ, cevap ÜRETMEZ. Yalnız
// kayıtlı metni döndürür. Bulamazsa boş liste ve sebebiyle döner; "olabilir"
// diye bir şey yazmaz.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temiz(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function sayi(v: unknown, varsayilan: number, enAz: number, enCok: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return varsayilan;
  return Math.min(enCok, Math.max(enAz, Math.trunc(n)));
}

/** Parça metni ekrana taşınırken kesilir; tam metin ayrıntıda açılır. */
const PARCA_SINIRI = 4000;

type ParcaCiktisi = {
  id: string | null;
  source_title: string;
  source_url: string | null;
  category: string;
  chunk_index: number | null;
  chunk_text: string;
  created_at: string | null;
  /** Yalnız "ara" kipinde dolar. */
  benzerlik: number | null;
};

function parcaYap(r: any, benzerlik: number | null): ParcaCiktisi {
  return {
    id: r?.id ?? null,
    source_title: temiz(r?.source_title) || "(başlıksız kaynak)",
    source_url: temiz(r?.source_url) || null,
    category: temiz(r?.category) || "—",
    chunk_index: typeof r?.chunk_index === "number" ? r.chunk_index : null,
    chunk_text: String(r?.chunk_text ?? "").slice(0, PARCA_SINIRI),
    created_at: r?.created_at ?? null,
    benzerlik,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Oturum doğrulanamadı" }, 401);

    const body = await req.json().catch(() => ({}));
    const mod = temiz((body as any)?.mod) || "ara";
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    /* ── KİP 1 · "ara" — SINAMA TEZGÂHI (H-37a) ─────────────────────────────
       Soruyu gömer, anlamca en yakın parçaları getirir. Model ÇALIŞTIRMAZ:
       arada cevap üreten bir şey olmadığı için "uydurdu mu" sorusu doğmaz —
       kurucunun bu tezgâhtan beklediği tam olarak budur. */
    if (mod === "ara") {
      const soru = temiz((body as any)?.soru);
      if (!soru) return json({ error: "soru gerekli" }, 400);
      const kategori = temiz((body as any)?.kategori) || null;
      const adet = sayi((body as any)?.adet, 8, 1, 25);
      const esik = Number.isFinite(Number((body as any)?.esik)) ? Number((body as any)?.esik) : 0.35;

      /* SESSİZ DÜŞME YOK: gömme anahtarı yoksa "bulunamadı" DEMEYİZ. Arama
         hiç yapılamadı; ikisi ayrı şeydir ve ekran bunu ayırt etmeli. */
      if (!apiKey) {
        return json({
          durum: "arama_yapilamadi",
          sebep: "LOVABLE_API_KEY tanımlı değil; soru gömülemediği için kaynaklarda arama yapılamadı.",
          sonuclar: [],
        });
      }

      let vektor: number[] | null = null;
      try {
        const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          // 768 boyut: `match_knowledge_base` ve kayıtlı gömmeler bu boyutta.
          body: JSON.stringify({ model: "openai/text-embedding-3-small", input: soru, dimensions: 768 }),
        });
        if (!embRes.ok) {
          const metin = await embRes.text().catch(() => "");
          return json({
            durum: "arama_yapilamadi",
            sebep: `Soru gömülemedi (${embRes.status}): ${metin.slice(0, 300)}`,
            sonuclar: [],
          });
        }
        const embJson = await embRes.json();
        vektor = embJson?.data?.[0]?.embedding ?? null;
      } catch (e) {
        return json({
          durum: "arama_yapilamadi",
          sebep: `Soru gömülemedi: ${String((e as any)?.message ?? e)}`,
          sonuclar: [],
        });
      }
      if (!vektor) {
        return json({
          durum: "arama_yapilamadi",
          sebep: "Gömme servisi boş cevap verdi; arama yapılamadı.",
          sonuclar: [],
        });
      }

      const { data: eslesme, error: rpcErr } = await admin.rpc("match_knowledge_base", {
        query_embedding: vektor as any,
        filter_category: kategori,
        match_count: adet,
        match_threshold: esik,
      });
      if (rpcErr) return json({ error: `Kaynak araması başarısız: ${rpcErr.message}` }, 500);

      const satirlar = Array.isArray(eslesme) ? eslesme : [];
      if (satirlar.length === 0) {
        return json({ durum: "bulunamadi", sonuclar: [] });
      }

      /* `match_knowledge_base` kaçıncı parça olduğunu DÖNDÜRMÜYOR; kurucu ise
         "kaçıncı parça" istiyor. Satırı kendi tablosundan tamamlarız — RPC'ye
         dokunmadan, SQL çalıştırmadan. Tamamlanamazsa parça yine gösterilir,
         yalnız sıra numarası boş kalır; sessizce elenmez. */
      const sonuclar: ParcaCiktisi[] = [];
      for (const r of satirlar) {
        const metin = String((r as any)?.chunk_text ?? "");
        let tam: any = null;
        try {
          const { data } = await admin
            .from("knowledge_base_chunks")
            .select("id, source_title, source_url, category, chunk_index, chunk_text, created_at")
            .eq("source_title", (r as any)?.source_title ?? "")
            .eq("chunk_text", metin)
            .limit(1)
            .maybeSingle();
          tam = data ?? null;
        } catch { /* tamamlama isteğe bağlıdır */ }
        sonuclar.push(parcaYap(tam ?? r, Number((r as any)?.similarity ?? 0)));
      }
      return json({ durum: "bulundu", sonuclar });
    }

    /* ── KİP 2 · "kitap" — KİTABIN İÇİ (H-36) ───────────────────────────────
       Parçalar `chunk_index` sırasıyla, SAYFALANARAK verilir. `arama` doluysa
       yalnız o kelimenin geçtiği parçalar döner ve sayfalama ona göre işler. */
    if (mod === "kitap") {
      const baslik = temiz((body as any)?.source_title);
      if (!baslik) return json({ error: "source_title gerekli" }, 400);
      const sayfa = sayi((body as any)?.sayfa, 0, 0, 100000);
      const sayfaBoyu = sayi((body as any)?.sayfaBoyu, 10, 1, 50);
      const arama = temiz((body as any)?.arama);

      let sorgu = admin
        .from("knowledge_base_chunks")
        .select("id, source_title, source_url, category, chunk_index, chunk_text, created_at", { count: "exact" })
        .eq("source_title", baslik);
      if (arama) {
        // `%` ve `_` kullanıcıdan gelirse desen bozulur; kaçırılır.
        const desen = arama.replace(/[%_\\]/g, (c) => `\\${c}`);
        sorgu = sorgu.ilike("chunk_text", `%${desen}%`);
      }

      const { data, error, count } = await sorgu
        .order("chunk_index", { ascending: true })
        .range(sayfa * sayfaBoyu, sayfa * sayfaBoyu + sayfaBoyu - 1);
      if (error) return json({ error: `Kitap okunamadı: ${error.message}` }, 500);

      /* Künye (parça sayısı · en eski yükleme) ARAMADAN BAĞIMSIZ okunur;
         yoksa arama yapıldığında "kitap 3 parça" gibi yanlış bir künye çıkar. */
      const { count: toplamParca } = await admin
        .from("knowledge_base_chunks")
        .select("id", { count: "exact", head: true })
        .eq("source_title", baslik);
      const { data: ilk } = await admin
        .from("knowledge_base_chunks")
        .select("category, source_url, created_at")
        .eq("source_title", baslik)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      return json({
        durum: (data ?? []).length > 0 ? "bulundu" : "bulunamadi",
        kitap: {
          source_title: baslik,
          category: temiz((ilk as any)?.category) || "—",
          source_url: temiz((ilk as any)?.source_url) || null,
          parca_sayisi: toplamParca ?? 0,
          yuklenme: (ilk as any)?.created_at ?? null,
        },
        eslesen: count ?? 0,
        sonuclar: (data ?? []).map((r: any) => parcaYap(r, null)),
      });
    }

    /* ── KİP 3 · "kunye" — CEVABIN DAYANDIĞI PARÇA (H-37b) ──────────────────
       AI cevabının altındaki künye ("6502 sayılı Kanun, m. 73") bugün düz
       metin. Tıklanınca dayandığı parçayı açarız.

       UYDURMA YASAK (§2-A): burada "en yakın parça" TAHMİN EDİLMEZ. Önce
       künyedeki kitap adıyla eşleşme aranır; `yer` (madde/bölüm) verilmişse
       metninde o ifadeyi TAŞIYAN parçalar öne alınır. Hiçbiri tutmazsa boş
       döner ve ekran "bulunamadı" der — sahte bir parça gösterilmez. */
    if (mod === "kunye") {
      const ad = temiz((body as any)?.ad);
      if (!ad) return json({ error: "ad gerekli" }, 400);
      const yer = temiz((body as any)?.yer);
      const adet = sayi((body as any)?.adet, 5, 1, 20);

      const desenle = (s: string) => s.replace(/[%_\\]/g, (c) => `\\${c}`);

      // 1) Kitap adı birebir, tutmazsa içeren.
      let kitapAdi: string | null = null;
      const { data: birebir } = await admin
        .from("knowledge_base_chunks")
        .select("source_title")
        .eq("source_title", ad)
        .limit(1)
        .maybeSingle();
      if (birebir) {
        kitapAdi = ad;
      } else {
        const { data: benzer } = await admin
          .from("knowledge_base_chunks")
          .select("source_title")
          .ilike("source_title", `%${desenle(ad)}%`)
          .limit(1)
          .maybeSingle();
        kitapAdi = temiz((benzer as any)?.source_title) || null;
      }

      if (!kitapAdi) {
        return json({
          durum: "bulunamadi",
          sebep: `"${ad}" adıyla kayıtlı bir kaynak bulunamadı.`,
          sonuclar: [],
        });
      }

      // 2) Madde/bölüm verildiyse metninde geçen parçalar; yoksa baştan.
      let sorgu = admin
        .from("knowledge_base_chunks")
        .select("id, source_title, source_url, category, chunk_index, chunk_text, created_at")
        .eq("source_title", kitapAdi);
      if (yer) sorgu = sorgu.ilike("chunk_text", `%${desenle(yer)}%`);

      const { data, error } = await sorgu.order("chunk_index", { ascending: true }).limit(adet);
      if (error) return json({ error: `Parça okunamadı: ${error.message}` }, 500);

      let satirlar = data ?? [];
      /* Madde aranıp hiç bulunamadıysa BOŞ BIRAKMAYIZ: kitabın kendisi
         kayıtlı, yalnız o madde metinde geçmiyor. Kitabın başını gösterir ve
         bunu SÖYLERİZ — "madde bulunamadı" ile "kaynak yok" aynı şey değil. */
      let not: string | null = null;
      if (yer && satirlar.length === 0) {
        const { data: bas } = await admin
          .from("knowledge_base_chunks")
          .select("id, source_title, source_url, category, chunk_index, chunk_text, created_at")
          .eq("source_title", kitapAdi)
          .order("chunk_index", { ascending: true })
          .limit(adet);
        satirlar = bas ?? [];
        not = `"${yer}" ifadesi bu kaynağın metninde bulunamadı; kaynağın başı gösteriliyor.`;
      }

      return json({
        durum: satirlar.length > 0 ? "bulundu" : "bulunamadi",
        kitap_adi: kitapAdi,
        not,
        sonuclar: satirlar.map((r: any) => parcaYap(r, null)),
      });
    }

    return json({ error: `Bilinmeyen kip: ${mod}` }, 400);
  } catch (e) {
    console.error("[kaynak-ara] beklenmeyen hata", e);
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
