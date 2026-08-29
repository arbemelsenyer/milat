// DOSYA VERİLERİNİ SİL (C3) — GERİ ALINAMAZ, İKİ ONAY, KENDİLİĞİNDEN YOK
//
// Süreç bittikten sonra dosyanın KİŞİSEL VERİSİ silinir. Kişisel veri
// İÇERMEYEN sayımlar ve kural kütüphanesi KALIR (20.08 kurucu kararı):
// öğrenme, dosya silinse de sürer; giden şey kişisel veridir.
//
// İNSAN KAPISI (dört kapıya eklenen beşincisi): SİLME ONAYI. Bu fonksiyon
// x-cron-secret ile ÇALIŞMAZ — kendiliğinden silme YOKTUR. Kapı yalnız
// dosyanın görevli arabulucusu ya da yöneticidir ve çağrının gövdesinde
// arabulucunun elle yazdığı "SİL" onayı aranır.
//
// YARIM SİLME YOK: silme sırası yabancı anahtarlara uygundur; bir adım hata
// verirse işlem DURUR ve arabulucuya sade cümleyle bildirilir.
//
// DEPO DA SİLİNİR: dosyaya bağlı DÖRT tablo depoda nesne gösterir
// (`DEPO_KAYNAKLARI`). Yolları satırlar silinmeden ÖNCE okunur, kovalarından
// silinir, ancak sonra satırlara dokunulur. Yol listesi sınıra dayanırsa
// SESSİZ KIRPMA YOK — işlem durur (görmediğimiz dosyayı silemeyiz).
//
// SİLİNEN İÇERİK HİÇBİR LOGA YAZILMAZ; anahtarlar loglanmaz.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { sinirdanGecir } from "../_shared/anlatim.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temiz(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/* SİLME SIRASI — yabancı anahtarlara uygun: önce çocuk kayıtlar, sonra
   taraflar, en sonda dosyanın kendisi. Her tablo case_id ile silinir. */
// Tarafların belgelerinin durduğu kova. Silme kolu satırlarla birlikte
// dosyaları da kaldırmalıdır; yoksa dosyalar öksüz kalır (constitution m.10).
const BELGE_KOVASI = "case-documents";
// Sesli notun ham kaydının durduğu kova. `saklama-imha` ile AYNI ad.
const KAYIT_KOVASI = "oturum-kayitlari";

/* DEPOYA İŞARET EDEN BÜTÜN KAYNAKLAR — 29.08.2026 kusuru.
   25.08'de bu kol yalnız `case_documents` için depo temizliği kazanmıştı.
   Oysa dosyaya bağlı DÖRT tablo depoda nesne gösteriyor; öteki üçünün
   satırları siliniyor ama dosyaları kovada kalıyordu. Satır gidince o nesneyi
   gösteren hiçbir kayıt kalmaz — hiçbir silme kolu onu bir daha bulamaz
   (constitution m.10 · HAT H-12 ile aynı kusur, üç kardeş yolda).
   · `agreement_documents.file_path`  → imzalı anlaşmanın TARAMASI
   · `bilirkisi_raporlari.dosya_yolu` → bilirkişinin yüklediği rapor
   · `oturum_kayitlari.ses_dosya_yolu`→ dökümden sonra silinemeyip KAÇAN ses
     (`sesli-not-dokum` silme düşerse yolu bilerek NULL'lamaz)
   Yeni bir tablo depoya yol yazacaksa buraya eklenir; eklenmezse bu koldan
   kaçar. Tezgâh listeyi `types.ts`e karşı denetler. */
const DEPO_KAYNAKLARI: { tablo: string; kolon: string; kova: string }[] = [
  { tablo: "case_documents", kolon: "file_path", kova: BELGE_KOVASI },
  { tablo: "agreement_documents", kolon: "file_path", kova: BELGE_KOVASI },
  { tablo: "bilirkisi_raporlari", kolon: "dosya_yolu", kova: BELGE_KOVASI },
  { tablo: "oturum_kayitlari", kolon: "ses_dosya_yolu", kova: KAYIT_KOVASI },
];

/* Tek kaynaktan okunacak en çok yol sayısı. SESSİZ KIRPMA YOK: sınıra
   dayanılırsa işlem DURUR (bkz. okuma döngüsü). Sessizce kırpmak, silindiği
   söylenen bir dosyayı kovada bırakmak demektir. */
const YOL_SINIRI = 1000;

const SILME_SIRASI: { tablo: string; alan?: string }[] = [
  { tablo: "belge_ozetleri", alan: "case_id" },
  { tablo: "case_documents" },
  { tablo: "party_analyses" },
  { tablo: "party_root_cause_analysis" },
  { tablo: "taraf_kalemleri" },
  { tablo: "case_notes" },
  { tablo: "oturum_hazirlik_foyleri" },
  { tablo: "foy_gonderim_kayitlari" },
  { tablo: "case_discovery_questions" },
  { tablo: "ajan_gorevleri" },
  { tablo: "ajan_bellek" },
  { tablo: "akis_olaylari" },
  { tablo: "agent_states" },
  { tablo: "arabulucu_talimatlari" },
  { tablo: "ajan_onerileri" },
  { tablo: "akis_duraklatma" },
  { tablo: "arabulucu_kontrol_tercihleri" },
  { tablo: "iletisim_tercihleri" },
  { tablo: "taraf_musaitlik", alan: "case_id" },
  { tablo: "randevu_teklifleri" },
  { tablo: "teklif_braketleri" },
  { tablo: "olay_cizelgesi" },
  { tablo: "common_ground_reports" },
  { tablo: "bilirkisi_raporlari" },
  { tablo: "agreement_documents" },
  { tablo: "oturum_kayitlari" },
  { tablo: "case_sessions" },
  { tablo: "case_party_invites", alan: "case_id" },
  { tablo: "case_parties" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    /* KAPI: yalnız kullanıcı oturumu. x-cron-secret KABUL EDİLMEZ —
       kendiliğinden silme yoktur (bilerek yazıldı). */
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const userId = userRes?.user?.id;
    if (!userId) return json({ error: "Oturum doğrulanamadı" }, 401);

    const govde = await req.json().catch(() => ({}));
    const case_id = temiz((govde as any)?.case_id);
    const onay = temiz((govde as any)?.onay);
    if (!case_id) return json({ error: "case_id gerekli" }, 400);
    // İKİNCİ ONAY: arabulucu elle "SİL" yazmadan hiçbir şey silinmez.
    if (onay.toLocaleUpperCase("tr-TR") !== "SİL" && onay.toUpperCase() !== "SIL") {
      return json({ error: "Silme için onay yazısı gerekli" }, 400);
    }

    const { data: dosya } = await admin.from("cases")
      .select("id, assigned_mediator_id, status, closed_at, outcome, created_at")
      .eq("id", case_id).maybeSingle();
    if (!dosya) return json({ error: "Dosya bulunamadı" }, 404);

    let yetkili = String((dosya as any).assigned_mediator_id ?? "") === userId;
    if (!yetkili) {
      const { data: roleRow } = await admin.from("user_roles")
        .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      yetkili = !!roleRow;
    }
    if (!yetkili) return json({ error: "Bu dosyayı silme yetkiniz yok" }, 403);

    // Paket alınmadan silme açılmaz (C3 sırası).
    const { data: kapanis } = await admin.from("dosya_kapanis")
      .select("paket_alindi, silme_zamani").eq("case_id", case_id).maybeSingle();
    if (!(kapanis as any)?.paket_alindi) {
      return json({ error: "Önce kapanış paketini almalısınız." }, 400);
    }
    if ((kapanis as any)?.silme_zamani) {
      return json({ silindi: false, sebep: "Bu dosyanın verileri zaten silinmiş." });
    }

    // SİLMEDEN ÖNCE SAYIM (yalnız sayı; içerik okunmaz).
    let oncekiToplam = 0;
    for (const t of SILME_SIRASI) {
      try {
        const { count } = await admin.from(t.tablo)
          .select("id", { count: "exact", head: true }).eq(t.alan ?? "case_id", case_id);
        oncekiToplam += count ?? 0;
      } catch { /* tablo yoksa sayıma girmez */ }
    }

    /* DEPO TEMİZLİĞİ — SATIRLARDAN ÖNCE (25.08.2026 canlı bulgusu,
       29.08.2026'da ÜÇ KARDEŞ YOLA genişletildi).
       Bu kol KVKK silme koludur ama depoya HİÇ dokunmuyordu: `case_documents`
       satırları siliniyor, tarafların belgeleri `case-documents` kovasında
       KALIYORDU. Satır gittikten sonra o dosyayı gösteren hiçbir kayıt kalmadığı
       için hiçbir silme kolu onları bir daha bulamaz — constitution m.10
       (süresiz saklama yasağı) ihlali. Canlıda bu yolla üretilmiş 6 öksüz dosya
       bulundu (30.06–01.07, dosyaları artık var olmayan davalara ait).
       25.08 düzeltmesi YALNIZ `case_documents`i kapattı; imzalı anlaşma
       taraması, bilirkişi raporu ve kaçan ses kaydı aynı açıkta kaldı.
       Artık kaynak listesi `DEPO_KAYNAKLARI`dır — tek yer.

       SIRA KRİTİK: önce dosya (asıl kişisel veri), sonra satır. Ters sırada
       depo silmesi düşerse indeks yok olur ve veri erişilemez biçimde KALIR.
       Yollar satırlar silinmeden ÖNCE okunur; sonra okunamaz. */
    const kovaYollari = new Map<string, string[]>();
    let toplamYol = 0;
    for (const kaynak of DEPO_KAYNAKLARI) {
      const { data: satirlar, error: yolErr } = await admin.from(kaynak.tablo)
        .select(kaynak.kolon).eq("case_id", case_id).limit(YOL_SINIRI);
      if (yolErr) {
        /* Tablo yoksa (eski şema) bu bir eksiklik değildir; ama başka her hata
           "okuyamadım" demektir ve okuyamadığımız yolu silemeyiz. */
        if (String(yolErr.code ?? "") === "42P01") continue;
        return json({
          silindi: false,
          error: `Belge yolları okunamadı; hiçbir kayıt silinmedi: ${yolErr.message}`,
        }, 500);
      }
      const ham = (satirlar ?? []) as Record<string, unknown>[];
      /* SESSİZ KIRPMA YOK: sınıra dayandıysak geri kalan yolları hiç görmedik.
         Devam edersek satırları siler, görmediğimiz dosyaları kovada öksüz
         bırakırdık — düzeltmeye çalıştığımız kusurun ta kendisi. */
      if (ham.length === YOL_SINIRI) {
        return json({
          silindi: false,
          error: "Bu dosyada silinecek belge sayısı tek seferde işlenemeyecek kadar çok; "
            + "hiçbir kayıt silinmedi. Lütfen bildirin.",
        }, 500);
      }
      const yollar = ham
        .map((r) => String(r?.[kaynak.kolon] ?? "").trim())
        .filter((y) => y.length > 0);
      if (yollar.length === 0) continue;
      const birikmis = kovaYollari.get(kaynak.kova) ?? [];
      birikmis.push(...yollar);
      kovaYollari.set(kaynak.kova, birikmis);
      toplamYol += yollar.length;
    }

    for (const [kova, yollar] of kovaYollari) {
      const { error: depoErr } = await admin.storage.from(kova).remove(yollar);
      if (depoErr) {
        // Depo temizlenemediyse SATIRLARA DOKUNULMAZ: dosyalar bulunabilir kalsın.
        console.error(`[dosya-verilerini-sil] depo temizlenemedi (${case_id} · ${kova}): ${depoErr.message}`);
        return json({
          silindi: false,
          error: "Belgeler depodan silinemedi; hiçbir kayıt silinmedi. Lütfen tekrar deneyin.",
        }, 500);
      }
    }

    // SİLME — sırayla. Hata olursa DURUR; yarım silme bırakılmaz.
    for (const t of SILME_SIRASI) {
      const { error } = await admin.from(t.tablo).delete().eq(t.alan ?? "case_id", case_id);
      if (error) {
        console.error("[dosya-verilerini-sil] silme durdu", { tablo: t.tablo, kod: error.code ?? "" });
        return json({
          silindi: false,
          error: "Silme tamamlanamadı; hiçbir kayıt yarım bırakılmadı. Lütfen tekrar deneyin.",
        }, 500);
      }
    }

    /* KALANLAR (kurucu kararı — kişisel veri İÇERMEZ): sayımlar ve kural
       kütüphanesi kalır, dosya bağlantısı KOPARILIR (case_id NULL). */
    // 25.08.2026 — bu uc yazimin sonucu OKUNMUYORDU ve ardindan kosulsuz
    // "dosyada kisisel veri kalmadi" deniyordu. Silmenin kendisi zaten dogru
    // denetleniyor (yukaridaki dongu + `cases`); eksik olan, silme SONRASI
    // baglantiyi koparan ve silmeyi KAYDA GECIREN yazimlardi. Bir KVKK silme
    // isleminin kaniti sessizce kaybolamaz.
    const uyarilar: string[] = [];
    const { error: deneyimErr } = await admin.from("ajan_deneyim")
      .update({ case_id: null }).eq("case_id", case_id);
    if (deneyimErr) uyarilar.push(`ajan_deneyim dosya bağlantısı koparılamadı: ${deneyimErr.message}`);
    const { error: duzeltmeErr } = await admin.from("duzeltme_kayitlari")
      .update({ case_id: null }).eq("case_id", case_id);
    if (duzeltmeErr) uyarilar.push(`duzeltme_kayitlari dosya bağlantısı koparılamadı: ${duzeltmeErr.message}`);

    // Bir satırlık ANONİM kapanış kaydı: tarih, sonuç türü, süreç gün sayısı.
    const acilis = new Date(String((dosya as any).created_at ?? "")).getTime();
    const kapanisZamani = new Date(String((dosya as any).closed_at ?? new Date().toISOString())).getTime();
    const gun = Number.isFinite(acilis) && Number.isFinite(kapanisZamani)
      ? Math.max(0, Math.round((kapanisZamani - acilis) / 86_400_000)) : null;

    const { error: dErr } = await admin.from("cases").delete().eq("id", case_id);
    if (dErr) {
      return json({
        silindi: false,
        error: "Dosya kaydı silinemedi; içerik silindi ama dosya satırı kaldı. Lütfen tekrar deneyin.",
      }, 500);
    }

    const { error: kapanisErr } = await admin.from("dosya_kapanis").update({
      silme_zamani: new Date().toISOString(), silen: userId,
      eksik_notu: `anonim kapanış: sonuç ${temiz((dosya as any).outcome) || "belirtilmedi"} · süreç ${gun ?? "?"} gün`,
    }).eq("case_id", case_id);
    if (kapanisErr) uyarilar.push(`silme kaydı (dosya_kapanis) yazılamadı: ${kapanisErr.message}`);

    if (uyarilar.length > 0) {
      console.error("[dosya-verilerini-sil] silme sonrası eksikler", { case_id, uyarilar });
    }
    /* "Kişisel veri kalmadı" sözü artık depoyu da kapsıyor: silinen dosya
       sayısı çağırana bildirilir, yani söz KANITLANABİLİR. */
    return json({
      silindi: true, kayit: oncekiToplam, belge: toplamYol, uyarilar,
      mesaj: sinirdanGecir(
        `${oncekiToplam} kayıt${toplamYol > 0 ? ` ve ${toplamYol} belge` : ""} silindi, `
        + "dosyada kişisel veri kalmadı.", "silme"),
    });
  } catch (e: any) {
    console.error("[dosya-verilerini-sil] Genel hata:", String(e?.message ?? e).slice(0, 200));
    return json({ error: "Silme sırasında bir sorun çıktı; işlem durduruldu." }, 500);
  }
});
