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
// DEPO DA SİLİNİR ve ANONİM KAYIT BIRAKILIR: ikisinin de kuralı
// `_shared/dosya-silme.ts`tedir. Bu dosya yalnız KAPILARI tutar.
//
// SİLİNEN İÇERİK HİÇBİR LOGA YAZILMAZ; anahtarlar loglanmaz.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { sinirdanGecir } from "../_shared/anlatim.ts";
import { dosyayiTemizle } from "../_shared/dosya-silme.ts";

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

/* SİLME SIRASI ve DEPO SÜPÜRGESİ burada değil `_shared/dosya-silme.ts`tedir:
   aynı kural `basvuru-sil` ve `saklama-imha` (emniyet süpürgesi) kollarında da
   geçerli. Üç yerde yazılırsa biri düzeltilip ötekiler açık kalıyor — 25.08 ve
   29.08'de tam bu oldu. Bu dosyada kalan şey KAPILARDIR (insan kapısı). */

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
      .select("paket_alindi").eq("case_id", case_id).maybeSingle();
    if (!(kapanis as any)?.paket_alindi) {
      return json({ error: "Önce kapanış paketini almalısınız." }, 400);
    }
    /* Burada eskiden bir "zaten silinmiş" dalı vardı ve HİÇ ÇALIŞAMAZDI:
       `dosya_kapanis.case_id` `cases`e ON DELETE CASCADE bağlıdır, yani dosya
       silinince bu satır da gider. İkinci çağrı zaten yukarıdaki
       "Dosya bulunamadı" dalına düşer. Ölü dal bırakılmadı (§15.1 şart 5). */

    /* SİLME — kural ortak modüldedir. Buradaki kolun işi KAPILARDI ve
       hepsi yukarıda geçildi: oturum · yetki · paket · elle "SİL" yazımı. */
    const sonuc = await dosyayiTemizle(admin, case_id, "arabulucu");
    if (!sonuc.ok) return json({ silindi: false, error: sonuc.hata }, 500);
    const uyarilar = [...sonuc.uyarilar];

    return json({
      silindi: true, kayit: sonuc.kayit, belge: sonuc.belge, uyarilar,
      mesaj: sinirdanGecir(
        `${sonuc.kayit} kayıt${sonuc.belge > 0 ? ` ve ${sonuc.belge} belge` : ""} silindi, `
        + "dosyada kişisel veri kalmadı.", "silme"),
    });
  } catch (e: any) {
    console.error("[dosya-verilerini-sil] Genel hata:", String(e?.message ?? e).slice(0, 200));
    return json({ error: "Silme sırasında bir sorun çıktı; işlem durduruldu." }, 500);
  }
});
