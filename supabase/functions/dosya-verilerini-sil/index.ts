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
// SİLİNEN İÇERİK HİÇBİR LOGA YAZILMAZ; anahtarlar loglanmaz.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

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
    await admin.from("ajan_deneyim").update({ case_id: null }).eq("case_id", case_id);
    await admin.from("duzeltme_kayitlari").update({ case_id: null }).eq("case_id", case_id);

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

    await admin.from("dosya_kapanis").update({
      silme_zamani: new Date().toISOString(), silen: userId,
      eksik_notu: `anonim kapanış: sonuç ${temiz((dosya as any).outcome) || "belirtilmedi"} · süreç ${gun ?? "?"} gün`,
    }).eq("case_id", case_id);

    return json({
      silindi: true, kayit: oncekiToplam,
      mesaj: `${oncekiToplam} kayıt silindi, dosyada kişisel veri kalmadı.`,
    });
  } catch (e: any) {
    console.error("[dosya-verilerini-sil] Genel hata:", String(e?.message ?? e).slice(0, 200));
    return json({ error: "Silme sırasında bir sorun çıktı; işlem durduruldu." }, 500);
  }
});
