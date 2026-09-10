// BAŞVURU ALANLARINI ARABULUCULUK BÜROSU EVRAKLARINDAN DOLDUR (Aşama 1 · §1.1)
//
// Kurucu kararı (10.09.2026, tasks/PILOT-ASAMA-1-DOSYA-KURULUMU.md §1.1):
//   "Belge yüklendiyse AI, aşağıdaki adımların ilgili alanlarını bu belgelerden
//    okuyarak doldurur. Dolan her alan ELLE DÜZENLENEBİLİR KALIR."
//
// YAZMA YOK. Bu fonksiyon hiçbir tabloya yazmaz; ÖNERİ döndürür. Kaydetme kararı
// arabulucunundur (constitution m.3 — manuel her zaman kazanır).
//
// KAYNAK SINIRI: yalnız BU DOSYAYA yüklenmiş belgelerin çıkarılmış metni
// (case_documents.extracted_text). İnternete çıkılmaz, bilgi tabanı okunmaz,
// taraf analizleri okunmaz. Her önerilen alanın yanında HANGİ BELGEDEN geldiği
// yazılır; belgede karşılığı olmayan alan BOŞ döner.
//
// UYDURMA YASAK: belgede yoksa alan boştur. "Muhtemelen", "genellikle" gibi
// çıkarımlar üretilmez. Model bir alanı doldurursa kaynağını da vermek
// zorundadır; kaynaksız alan sunucuda ELENİR.
//
// YÜZEY SINIRI: yalnız arabulucu (ya da dosya sahibi/yönetici) çağırabilir.
// Taraf çağıramaz — öneriler dosya kurulumu ekranına aittir.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { anlatimYansit } from "../_shared/anlatim.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BELGE = 12;            // isteme giren en çok belge
const MAX_BELGE_METIN = 6_000;   // tek belgeden alınacak en çok karakter
const MAX_TOPLAM_METIN = 40_000; // isteme giren toplam metin sınırı

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temiz(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/* Ekranda seçilebilen kapalı listeler. Model bunların dışına çıkarsa değer
   ELENİR — menüde karşılığı olmayan bir öneri ekrana çıkmaz. */
const ANA_TURLER = [
  "işçi_işveren", "ticari", "tüketici", "sağlık", "fikri_mülkiyet", "inşaat",
  "sigorta", "bankacılık", "aile", "spor", "enerji_maden", "kira", "gayrimenkul",
  "genel", "ortaklık",
];
const ALT_UZMANLIKLAR = [
  "sağlık", "sigorta", "fikri_sınai_haklar", "inşaat", "bankacılık", "spor", "enerji_maden",
];
const SUREC_TURLERI = ["dava_sarti", "ihtiyari"];
const TARAF_ROLLERI = ["applicant", "respondent", "third_party"];
const TARAF_TURLERI = ["individual", "corporate"];

const AGENT_TYPE = "basvuru_doldurma";
async function durumYaz(admin: any, caseId: string, patch: Record<string, unknown>) {
  if (!admin || !caseId) return;
  try {
    const { data: mevcut } = await admin.from("agent_states").select("id")
      .eq("case_id", caseId).eq("agent_type", AGENT_TYPE).is("party_id", null).maybeSingle();
    const govde = { ...patch, updated_at: new Date().toISOString() };
    if (mevcut?.id) {
      const { error } = await admin.from("agent_states").update(govde).eq("id", mevcut.id);
      if (error) console.error(`[${AGENT_TYPE}] durum satırı yazılamadı:`, error.message);
    } else {
      const { error } = await admin.from("agent_states")
        .insert({ case_id: caseId, agent_type: AGENT_TYPE, party_id: null, ...govde });
      if (error) console.error(`[${AGENT_TYPE}] durum satırı yazılamadı:`, error.message);
    }
    await anlatimYansit(admin, { case_id: caseId, agent_type: AGENT_TYPE, party_id: null }, patch);
  } catch (e: any) {
    console.error(`[${AGENT_TYPE}] durum yazılamadı: ${e?.message ?? e}`);
  }
}

/** Kaynağı olmayan / kapalı listeye uymayan öneriyi eler. */
function alanTemizle(
  ham: any, izinli: string[] | null, belgeAdlari: string[],
): { deger: string; kaynak: string } | null {
  const deger = temiz(ham?.deger);
  const kaynak = temiz(ham?.kaynak);
  if (!deger) return null;
  // Kaynaksız alan ELENİR: hangi belgeden geldiği söylenemiyorsa öneri yoktur.
  if (!kaynak) return null;
  // Kaynak gerçekten bu dosyadaki bir belgenin adı olmalı; uydurma künye elenir.
  if (!belgeAdlari.some((ad) => kaynak.includes(ad) || ad.includes(kaynak))) return null;
  if (izinli && !izinli.includes(deger)) return null;
  return { deger, kaynak };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let durumAdmin: any = null;
  let durumCaseId = "";

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);
    if (!apiKey) return json({ error: "LOVABLE_API_KEY tanımlı değil" }, 500);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Oturum doğrulanamadı" }, 401);
    const kullaniciId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const case_id = temiz((body as any)?.case_id);
    if (!case_id) return json({ error: "case_id gerekli" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: caseRow, error: cErr } = await admin.from("cases")
      .select("id, user_id, assigned_mediator_id, title").eq("id", case_id).maybeSingle();
    if (cErr) return json({ error: cErr.message }, 500);
    if (!caseRow) return json({ error: "Dosya bulunamadı" }, 404);

    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", kullaniciId).eq("role", "admin").maybeSingle();
    const yetkili = (caseRow as any).assigned_mediator_id === kullaniciId
      || (caseRow as any).user_id === kullaniciId
      || !!roleRow;
    if (!yetkili) return json({ error: "Bu dosya için yetkiniz yok" }, 403);

    durumAdmin = admin;
    durumCaseId = case_id;
    await durumYaz(admin, case_id, { status: "running", error_message: null });

    const { data: docs, error: dErr } = await admin.from("case_documents")
      .select("id, file_name, extracted_text, extraction_status")
      .eq("case_id", case_id).order("created_at").limit(MAX_BELGE);
    if (dErr) {
      await durumYaz(admin, case_id, { status: "failed", error_message: dErr.message });
      return json({ error: `Belgeler okunamadı: ${dErr.message}` }, 500);
    }

    const metinliler = ((docs ?? []) as any[]).filter((d) => temiz(d.extracted_text).length > 40);
    if (metinliler.length === 0) {
      const yuklu = ((docs ?? []) as any[]).length;
      await durumYaz(admin, case_id, {
        status: "completed", error_message: null,
        last_output: { sonuc: "atlandi", sebep: "okunabilir belge metni yok" },
      });
      return json({
        atlandi: true,
        sebep: yuklu === 0
          ? "Bu dosyaya henüz belge yüklenmedi — doldurulacak bir şey yok."
          : "Yüklü belgelerin metni henüz çıkarılamadı; birkaç dakika sonra tekrar deneyin.",
      });
    }

    const belgeAdlari = metinliler.map((d) => temiz(d.file_name));
    let toplam = 0;
    const belgeBloklari: string[] = [];
    for (const d of metinliler) {
      const metin = temiz(d.extracted_text).slice(0, MAX_BELGE_METIN);
      if (toplam + metin.length > MAX_TOPLAM_METIN) break;
      toplam += metin.length;
      belgeBloklari.push(`═══ BELGE: ${temiz(d.file_name)} ═══\n${metin}`);
    }

    const systemPrompt = `Sen bir Türk arabuluculuk dosyasının kuruluş bilgilerini, arabuluculuk bürosu
evraklarından OKUYARAK çıkaran bir okuma asistanısın. Yorum yapmaz, hüküm kurmaz, tavsiye vermezsin.

SANA VERİLEN: bu dosyaya yüklenmiş belgelerin metinleri (talep dilekçesi, arabuluculuk bürosu başvuru
formu, vekâletname/yetki belgesi, arabulucu belirleme belgesi olabilir).

MUTLAK KURALLAR:
1. UYDURMA YASAK. Bir alanın karşılığı belgelerde AÇIKÇA yazmıyorsa o alanı BOŞ bırak.
   "Muhtemelen", "genellikle böyledir", "anlaşılıyor ki" gibi çıkarım yapma.
2. HER DOLDURDUĞUN ALAN İÇİN KAYNAK ZORUNLU: bilgiyi hangi belgeden aldığını "kaynak" alanına
   BELGENİN ADIYLA yaz (sana verilen "BELGE:" başlığındaki ad). Kaynağı yazamıyorsan alanı boş bırak.
3. Kapalı listeli alanlarda listedeki değerlerden birini seç, başka bir şey yazma.
4. "uyusmazlik_konusu" TARAFSIZ olacak: kusur atfetme, hukuki niteleme yapma, kimseyi haklı/haksız
   gösterme. Belgedeki iddiaları beyan dili ile yaz ("…talep edildiği belirtiliyor").
5. TC kimlik numarası, vergi numarası gibi kimlik bilgilerini YALNIZ belgede açıkça yazıyorsa aktar.
6. Yanıtın YALNIZCA geçerli JSON olsun, başka metin olmasın.

ÇIKTI BİÇİMİ:
{
  "uyusmazlik_konusu": {"deger": "2-4 cümle tarafsız metin", "kaynak": "belge adı"},
  "surec_turu":        {"deger": "dava_sarti | ihtiyari", "kaynak": "belge adı"},
  "ana_uzmanlik":      {"deger": "${ANA_TURLER.join(" | ")}", "kaynak": "belge adı"},
  "alt_uzmanlik":      {"deger": "${ALT_UZMANLIKLAR.join(" | ")}", "kaynak": "belge adı"},
  "taraflar": [
    {
      "ad": "gerçek kişide ad soyad, kurumda kurum adı",
      "taraf_turu": "individual | corporate",
      "rol": "applicant | respondent | third_party",
      "eposta": "", "telefon": "", "adres": "",
      "vekil_ad_soyad": "", "vekil_baro": "", "vekil_sicil_no": "",
      "kaynak": "belge adı"
    }
  ]
}
Boş bırakılacak alanı "" olarak ver, alanı silme. Taraf bulunamadıysa "taraflar": [].`;

    const userPrompt = `DOSYA BAŞLIĞI: ${temiz((caseRow as any).title) || "(boş)"}

${belgeBloklari.join("\n\n")}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const t = (await aiRes.text()).slice(0, 300);
      await durumYaz(admin, case_id, { status: "failed", error_message: `AI ${aiRes.status}` });
      return json({ error: `AI çağrısı başarısız (HTTP ${aiRes.status})`, detay: t }, aiRes.status);
    }
    const aiJson = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiJson?.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }

    /* SUNUCUDA ELEME: kaynaksız ya da kapalı listeye uymayan hiçbir öneri
       ekrana çıkmaz. Ekranın "uydurma yok" sözünü tutan yer BURASIDIR. */
    const oneriler: Record<string, unknown> = {
      uyusmazlik_konusu: alanTemizle(parsed?.uyusmazlik_konusu, null, belgeAdlari),
      surec_turu: alanTemizle(parsed?.surec_turu, SUREC_TURLERI, belgeAdlari),
      ana_uzmanlik: alanTemizle(parsed?.ana_uzmanlik, ANA_TURLER, belgeAdlari),
      alt_uzmanlik: alanTemizle(parsed?.alt_uzmanlik, ALT_UZMANLIKLAR, belgeAdlari),
    };

    const hamTaraflar = Array.isArray(parsed?.taraflar) ? parsed.taraflar : [];
    const taraflar = hamTaraflar.slice(0, 10).map((t: any) => {
      const kaynak = temiz(t?.kaynak);
      const ad = temiz(t?.ad);
      if (!ad || !kaynak) return null;
      if (!belgeAdlari.some((a) => kaynak.includes(a) || a.includes(kaynak))) return null;
      const taraf_turu = TARAF_TURLERI.includes(temiz(t?.taraf_turu)) ? temiz(t.taraf_turu) : "individual";
      const rol = TARAF_ROLLERI.includes(temiz(t?.rol)) ? temiz(t.rol) : "respondent";
      return {
        ad, taraf_turu, rol,
        eposta: temiz(t?.eposta), telefon: temiz(t?.telefon), adres: temiz(t?.adres),
        vekil_ad_soyad: temiz(t?.vekil_ad_soyad),
        vekil_baro: temiz(t?.vekil_baro),
        vekil_sicil_no: temiz(t?.vekil_sicil_no),
        kaynak,
      };
    }).filter(Boolean);

    const doluAlan = Object.values(oneriler).filter(Boolean).length + taraflar.length;

    await durumYaz(admin, case_id, {
      status: "completed", error_message: null,
      last_output: { sonuc: "oneri", dolu_alan: doluAlan, okunan_belge: belgeBloklari.length },
    });

    return json({
      oneriler,
      taraflar,
      okunan_belgeler: belgeAdlari.slice(0, belgeBloklari.length),
      /* Hiçbir alan doldurulamadıysa bunu SÖYLERİZ; boş bir cevapla sessizce
         dönmek, arabulucuya "AI çalışmadı mı, bulamadı mı" sorusunu bıraktırır. */
      bulunamadi: doluAlan === 0,
    });
  } catch (e: any) {
    const msg = String(e?.message ?? e).slice(0, 300);
    console.error("[basvuru-belgelerinden-doldur] hata:", msg);
    if (durumAdmin && durumCaseId) {
      await durumYaz(durumAdmin, durumCaseId, { status: "failed", error_message: msg });
    }
    return json({ error: msg }, 500);
  }
});
