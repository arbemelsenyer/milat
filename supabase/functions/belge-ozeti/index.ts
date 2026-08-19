// BELGE ÖZETİ (İBA 1.2 kararı — todo.md A1).
// Her belge için tek paragraf özet (en çok 3 cümle) + "Neyi kanıtlıyor" tek cümle.
//
// KAYNAK SINIRI (bağlayıcı): YALNIZCA o belgenin kendi metni (case_documents.extracted_text,
// mevcut extract-document-text hattının çıktısı) ve dosya adı kullanılır. Başka belge,
// taraf analizi, ortak zemin raporu veya dosya verisi girdiye GİRMEZ.
//
// GİZLİLİK: Çıktı belge_ozetleri tablosuna yazılır; o tabloda tarafa hiçbir SELECT
// politikası yoktur — özet yalnız arabulucu/yönetici tarafından okunabilir.
//
// HALÜSİNASYON KAPISI: metin yoksa özet ÜRETİLMEZ, durum='metin_yok' yazılır
// ("belge metni okunamadı"). Şema dışı/eksik çıktı sunucu tarafında elenir (durum='elendi').
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { anlatimYansit } from "../_shared/anlatim.ts";
import { olayYaz } from "../_shared/olay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Özet için belgeden okunacak en fazla karakter.
const MAX_GIRDI = 12_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temiz(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// ── HÜKÜM DENETİMİ (15.08 düzeltmesi) ────────────────────────────────────────
// Yasak, ajanın KENDİ NİTELEMESİNE uygulanır; tarafın iddiasının AKTARILMASINA
// uygulanmaz. "Hastanenin kusurlu olduğu ileri sürülmektedir" serbesttir;
// "Hastane kusurludur" elenir. Denetim cümle cümle yapılır.
const HUKUM_KELIMELERI = [
  "haksız", "hukuka aykırı", "ihlal", "kusur", "suç", "geçersiz", "borçlu", "sorumludur",
];
const ATIF_KALIPLARI = [
  "ileri sür", "iddia", "belirtil", "belirtiyor", "belirtmekte", "talep ed", "talep edil",
  "denilmekte", "denmekte", "ifade ed", "beyan ed", "öne sür", "aktarıl", "savun",
  "yer alıyor", "yer almakta", "yer veril", "kaydedil", "istenmekte", "bildiril",
  "şikayet", "şikâyet", "göre",
];

function cumlelereBol(metin: string): string[] {
  return metin
    .split(/(?<=[.!?…])\s+/)
    .map((c) => c.trim())
    .filter(Boolean);
}

// Hüküm kuran cümleleri döndürür (aktarım kalıbı taşıyanlar serbesttir).
function hukumCumleleri(metin: string): string[] {
  return cumlelereBol(metin).filter((c) => {
    const k = c.toLocaleLowerCase("tr-TR");
    const hukumVar = HUKUM_KELIMELERI.some((w) => k.includes(w));
    if (!hukumVar) return false;
    const atifVar = ATIF_KALIPLARI.some((a) => k.includes(a));
    return !atifVar;
  });
}

// "Neyi kanıtlıyor" satırında yasak olan içi boş kalıplar.
const BOS_KALIPLAR = [
  "bilgi yer almakta", "bilgiler yer almakta", "bilgileri içer", "bilgi içer",
  "bilgilerini içer", "hakkında bilgi", "bilgi vermekte", "bilgi sunmakta",
];

/* ── AJAN DURUM YAZIMI (Ajan Kontrol Paneli) ─────────────────────────────────
   Panel bu satırlardan beslenir. KRİTİK: durum yazımı asıl işi ASLA bozmaz —
   her yazma try/catch içindedir, hata yutulur ve yalnız konsola loglanır.
   Aynı case_id + agent_type (+ party_id) için TEK satır güncellenir; her koşumda
   yeni satır birikmez. tarafa_gorunur alanına DOKUNULMAZ (varsayılan false). */
const AGENT_TYPE = "belge_ozeti";
async function durumYaz(
  admin: any, caseId: string, partyId: string | null, patch: Record<string, unknown>,
) {
  if (!admin || !caseId) return;
  try {
    let sorgu = admin.from("agent_states").select("id")
      .eq("case_id", caseId).eq("agent_type", AGENT_TYPE);
    sorgu = partyId ? sorgu.eq("party_id", partyId) : sorgu.is("party_id", null);
    const { data: mevcutSatir } = await sorgu.maybeSingle();
    const govde = { ...patch, updated_at: new Date().toISOString() };
    if (mevcutSatir?.id) {
      await admin.from("agent_states").update(govde).eq("id", mevcutSatir.id);
    } else {
      await admin.from("agent_states")
        .insert({ case_id: caseId, agent_type: AGENT_TYPE, party_id: partyId, ...govde });
    }
    // ANLATIM (best-effort): aynı satıra düz Türkçe adım yazılır; davranış değişmez.
    await anlatimYansit(admin, { case_id: caseId, agent_type: AGENT_TYPE, party_id: partyId }, patch);
  } catch (e: any) {
    console.error(`[${AGENT_TYPE}] durum yazılamadı: ${e?.message ?? e}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Hata dalında da durum yazılabilmesi için asıl iş içinde doldurulur.
  let durumAdmin: any = null;
  let durumCaseId = "";
  let durumPartyId: string | null = null;

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY tanımlı değil" }, 500);

    // İç çağrı kapısı: extract-document-text metni yazdıktan sonra buraya bu başlıkla
    // gelir (kullanıcı oturumu olmadan). Aksi hâlde JWT + yetki yolu işler.
    const isCron = !!CRON_SECRET && req.headers.get("x-cron-secret") === CRON_SECRET;
    const authHeader = req.headers.get("Authorization");
    if (!isCron && !authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);

    let userId = "";
    if (!isCron) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader! } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user) return json({ error: "Oturum doğrulanamadı" }, 401);
      userId = userData.user.id;
    }

    const body = await req.json().catch(() => ({}));
    const document_id = temiz((body as any)?.document_id);
    // yenile=true: mevcut özet YENİDEN üretilir ve aynı kayıt güncellenir.
    const yenile = (body as any)?.yenile === true;
    if (!document_id) return json({ error: "document_id gerekli" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: doc, error: dErr } = await admin.from("case_documents")
      .select("id, case_id, party_id, file_name, mime_type, extracted_text, extraction_status")
      .eq("id", document_id).maybeSingle();
    if (dErr) return json({ error: dErr.message }, 500);
    if (!doc) return json({ error: "Belge bulunamadı" }, 404);

    // Yetki: yalnız görevli arabulucu, dosya sahibi veya yönetici. Taraf çağıramaz —
    // belge özeti taraf yüzeyine hiçbir koşulda çıkmaz.
    if (!isCron) {
      const { data: caseRow } = await admin.from("cases")
        .select("user_id, assigned_mediator_id").eq("id", (doc as any).case_id).maybeSingle();
      const { data: roleRow } = await admin.from("user_roles")
        .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      const yetkili = (caseRow as any)?.assigned_mediator_id === userId
        || (caseRow as any)?.user_id === userId
        || !!roleRow;
      if (!yetkili) return json({ error: "Bu belge için yetkiniz yok" }, 403);
    }

    durumAdmin = admin;
    durumCaseId = String((doc as any).case_id ?? "");
    await durumYaz(durumAdmin, durumCaseId, null, { status: "running", error_message: null });

    // Zaten özeti olan belge için TEKRAR ÜRETİLMEZ — yalnız açık istekle (yenile:true)
    // yeniden üretilir ve aynı kayıt güncellenir.
    const { data: varOlan } = await admin.from("belge_ozetleri")
      .select("id, durum").eq("document_id", document_id).maybeSingle();
    const mevcutId = (varOlan as any)?.id ?? null;
    if (mevcutId && !yenile) {
      await durumYaz(durumAdmin, durumCaseId, null, { status: "completed", error_message: null, last_output: { sonuc: "atlandi", sebep: "özet zaten var" } });
      return json({ atlandi: true, sebep: "Bu belgenin özeti zaten var", durum: (varOlan as any).durum });
    }

    // Kaydı yaz: mevcut satır varsa güncelle, yoksa ekle.
    const kayitYaz = async (patch: Record<string, unknown>) => {
      if (mevcutId) {
        return await admin.from("belge_ozetleri").update(patch).eq("id", mevcutId);
      }
      return await admin.from("belge_ozetleri")
        .insert({ case_id: (doc as any).case_id, document_id, ...patch });
    };

    const metin = temiz((doc as any).extracted_text);
    const dosyaAdi = temiz((doc as any).file_name);

    // Metin yoksa özet UYDURULMAZ.
    if (metin.length < 60) {
      const durumSebep = String((doc as any).extraction_status ?? "") === "desteklenmeyen_format"
        ? "belge metni okunamadı (desteklenmeyen format)"
        : "belge metni okunamadı";
      const { error: iErr } = await kayitYaz({
        ozet: null, kaniti: null, durum: "metin_yok", sebep: durumSebep,
      });
      if (iErr) return json({ error: `Kayıt yazılamadı: ${iErr.message}` }, 500);
      await durumYaz(durumAdmin, durumCaseId, null, { status: "completed", error_message: null, last_output: { sonuc: "metin_yok", sebep: durumSebep } });
      return json({ durum: "metin_yok", sebep: durumSebep });
    }

    const systemPrompt = `Sen bir arabuluculuk dosyasındaki belgeleri künyeleyen tarafsız bir özet asistanısın.
Sana TEK BİR belgenin metni verilir. Görevin o belgeyi özetlemek.

MUTLAK KURALLAR:
1. Yalnızca sana verilen belge metnini kullan. Başka belge, dosya bilgisi veya genel bilgi ekleme.
2. Belgede AÇIKÇA yazmayan hiçbir tarih, rakam, taraf adı veya olay ekleme. Emin değilsen yazma.
3. KENDİ HUKUKİ NİTELEMENİ YAPMA. "haksızdır", "hukuka aykırıdır", "kusurludur",
   "geçersizdir", "sorumludur" gibi HÜKÜM cümlesi kurma; kanun/madde adı yazma.
   ANCAK belgede bir taraf böyle bir iddia ileri sürüyorsa bunu AKTARABİLİRSİN —
   aktarım kalıbıyla: "…olduğu ileri sürülmektedir", "…iddia edilmektedir",
   "…talep edilmektedir", "yazıda … denilmektedir". Hüküm senin cümlen olamaz,
   iddianın aktarımı serbesttir.
4. KUSURU SEN ATFETME: kimseyi haklı/haksız gösterme. Tarafın kusur iddiasını yalnız
   aktarım kalıbıyla yazabilirsin.
5. İDDİAYI TESPİT GİBİ YAZMA: "belgede ... belirtiliyor", "belgede ... yer alıyor" biçimini kullan.
   "...olmuştur", "...yapılmıştır", "...haklıdır" yazma.
6. ozet en çok 3 CÜMLE, tek paragraf. kaniti TEK CÜMLE.
7. kaniti = "bu belge hangi ÇEKİŞMELİ NOKTAYA dayanak oluyor" sorusunun cevabıdır.
   Hangi olguyu, tarihi, tutarı, eksikliği veya teslim edilmemiş kaydı gösterdiğini
   TEK cümlede yaz. Belgenin içeriğini TEKRAR ETME.
   YASAK KALIPLAR: "bilgi yer almaktadır", "bilgileri içermektedir", "hakkında bilgi
   vermektedir", "belgede şu bilgiler bulunmaktadır" ve benzeri içi boş cümleler.
   Örnek biçim: "Ameliyat görüntü kayıtlarının hastanede bulunmadığını, hemşire gözlem
   formlarının henüz teslim edilmediğini gösteriyor."
   Belge çekişmeli bir noktaya dayanak oluşturmuyorsa bunu açıkça yaz:
   "Belge çekişmeli bir noktaya dayanak oluşturmuyor; süreç yazışması niteliğinde."
8. Belge metni anlamsız veya okunamaz durumdaysa ozet alanını BOŞ bırak.

Çıktı YALNIZCA JSON: {"ozet":"en çok 3 cümlelik tarafsız özet","kaniti":"tek cümle"}`;

    const userPrompt = `BELGE ADI: ${dosyaAdi}

BELGE METNİ (kısmi olabilir):
${metin.slice(0, MAX_GIRDI)}

Bu belgeyi yukarıdaki kurallara göre özetle.`;

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
      const t = await aiRes.text();
      return json({ error: "Özet üretilemedi", detay: t.slice(0, 300) }, aiRes.status);
    }
    const aiJson = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiJson?.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }

    let ozet = temiz(parsed?.ozet);
    let kaniti = temiz(parsed?.kaniti);

    if (ozet.length > 900) ozet = ozet.slice(0, 900);
    if (kaniti.length > 400) kaniti = kaniti.slice(0, 400);

    // ── 1) SERT ELEME: yalnız özetin kendisi kullanılamazsa ──────────────────
    // Özet çok kısaysa ya da AJANIN KENDİ HÜKMÜ varsa kayıt elenir. Bu, gerçek
    // tarafsızlık kuralıdır (constitution m.2/m.4) ve olduğu gibi kalır.
    if (ozet.length < 40) {
      const sebep = "Özet elendi: metin çok kısa veya boş";
      const { error: eErr } = await kayitYaz({ ozet: null, kaniti: null, durum: "elendi", sebep });
      if (eErr) return json({ error: `Kayıt yazılamadı: ${eErr.message}` }, 500);
      await durumYaz(durumAdmin, durumCaseId, null, { status: "completed", error_message: null, last_output: { sonuc: "elendi", sebep } });
      return json({ durum: "elendi", sebep });
    }
    const hukumler = [...hukumCumleleri(ozet), ...hukumCumleleri(kaniti)];
    if (hukumler.length) {
      const sebep = `Özet elendi: ajanın kendi hükmü — elenen cümle: "${hukumler[0].slice(0, 200)}"`;
      const { error: eErr } = await kayitYaz({ ozet: null, kaniti: null, durum: "elendi", sebep });
      if (eErr) return json({ error: `Kayıt yazılamadı: ${eErr.message}` }, 500);
      await durumYaz(durumAdmin, durumCaseId, null, { status: "completed", error_message: null, last_output: { sonuc: "elendi", sebep } });
      return json({ durum: "elendi", sebep });
    }

    // ── 2) KANIT SATIRI ONARIMI: özet ASLA bu yüzden silinmez ────────────────
    // Satır boşsa veya içi boş kalıp taşıyorsa model BİR KEZ daha çağrılır ve
    // yalnız bu satırı yeniden yazması istenir. İkinci deneme de tutmazsa özet
    // korunur, satıra "çıkarılamadı" yazılır.
    const kanitZayif = (v: string) => {
      const t = temiz(v);
      if (!t) return true;
      const k = t.toLocaleLowerCase("tr-TR");
      return BOS_KALIPLAR.some((b) => k.includes(b));
    };

    let kanitNotu: string | null = null;
    if (kanitZayif(kaniti)) {
      const ilkDeneme = kaniti;
      const onarimSystem = `Sen bir arabuluculuk dosyasındaki belgeleri künyeleyen tarafsız bir asistansın.
Sana bir belgenin metni ve o belge için yazılmış özet veriliyor. YALNIZCA "neyi kanıtlıyor"
satırını yeniden yazacaksın.

KURALLAR:
1. TEK CÜMLE yaz. Belgenin hangi ÇEKİŞMELİ NOKTAYA dayanak olduğunu söyle: hangi olguyu,
   tarihi, tutarı, süreyi, eksikliği veya teslim edilmemiş kaydı gösteriyor.
2. Belgenin içeriğini TEKRAR ETME, özeti tekrar etme.
3. ŞU KALIPLAR YASAKTIR ve cümlende geçemez: "bilgi yer almaktadır", "bilgiler yer
   almaktadır", "bilgileri içermektedir", "bilgi içermektedir", "bilgilerini içermektedir",
   "hakkında bilgi vermektedir", "bilgi vermektedir", "bilgi sunmaktadır".
4. Kendi hukuki nitelemeni yapma ("haksızdır", "kusurludur", "hukuka aykırıdır" gibi
   hüküm cümlesi kurma); tarafın iddiasını yalnız aktarım kalıbıyla yazabilirsin.
5. Belgede AÇIKÇA yazmayan tarih, rakam veya olay ekleme.
6. Belge çekişmeli bir noktaya dayanak oluşturmuyorsa bunu açıkça yaz.

Örnek biçim: "Ameliyat görüntü kayıtlarının hastanede bulunmadığını, hemşire gözlem
formlarının henüz teslim edilmediğini gösteriyor."

Çıktı YALNIZCA JSON: {"kaniti":"tek cümle"}`;
      const onarimUser = `BELGE ADI: ${dosyaAdi}

BELGE METNİ (kısmi olabilir):
${metin.slice(0, MAX_GIRDI)}

ÖZET: ${ozet}

ÖNCEKİ (YETERSİZ) KANIT SATIRI: ${ilkDeneme || "(boş)"}

Bu satırı yukarıdaki kurallara göre yeniden yaz.`;
      try {
        const rRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: onarimSystem },
              { role: "user", content: onarimUser },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (rRes.ok) {
          const rJson = await rRes.json();
          let rParsed: any = {};
          try { rParsed = JSON.parse(rJson?.choices?.[0]?.message?.content ?? "{}"); } catch { rParsed = {}; }
          const yeni = temiz(rParsed?.kaniti).slice(0, 400);
          // İkinci deneme de hüküm kuruyorsa kabul edilmez.
          if (yeni && !kanitZayif(yeni) && hukumCumleleri(yeni).length === 0) {
            kaniti = yeni;
          }
        } else {
          console.error(`[belge-ozeti] kanıt onarımı HTTP ${rRes.status}`);
        }
      } catch (e: any) {
        console.error(`[belge-ozeti] kanıt onarımı başarısız: ${e?.message ?? e}`);
      }

      if (kanitZayif(kaniti) || hukumCumleleri(kaniti).length > 0) {
        kaniti = "Bu belgenin hangi çekişmeli noktaya dayanak olduğu çıkarılamadı";
        kanitNotu = "Kanıt satırı çıkarılamadı (iki denemede de yeterli değildi) — özet korundu";
      }
    }

    const { error: yErr } = await kayitYaz({
      ozet, kaniti, durum: "uretildi", sebep: kanitNotu,
    });
    if (yErr) return json({ error: `Kayıt yazılamadı: ${yErr.message}` }, 500);

    await durumYaz(durumAdmin, durumCaseId, null, { status: "completed", error_message: null, last_output: { sonuc: "uretildi" } });
    // AKIŞ OLAYI (best-effort): belge özeti üretildi. Özet METNİ olaya YAZILMAZ.
    const olayNotu = await olayYaz(admin, {
      case_id: durumCaseId, party_id: (doc as any)?.party_id ?? null,
      olay_kodu: "belge_ozeti_uretildi", veri: { document_id: (doc as any)?.id ?? null },
    });
    return json({
      durum: "uretildi", ozet, kaniti, not: kanitNotu,
      ...(olayNotu ? { olay_yazilamadi: olayNotu } : {}),
    });
  } catch (e: any) {
    console.error("[belge-ozeti] hata", e?.message ?? e);
    await durumYaz(durumAdmin, durumCaseId, durumPartyId, { status: "failed", error_message: String(e?.message ?? "Bilinmeyen hata").slice(0, 500) });
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
