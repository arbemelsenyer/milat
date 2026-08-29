// BAŞVURU SİL — GERİ ALINAMAZ. Başvuru listesindeki çöp kutusu düğmesinin kolu.
//
// NEDEN VAR (29.08.2026 kusuru). Bu silme İSTEMCİDEN yapılıyordu:
// `MediationEngine.tsx` doğrudan `from("cases").delete()` çağırıyordu. Yabancı
// anahtar cascade'i çocuk satırları götürüyor ama DEPOYA HİÇ DOKUNULMUYORDU;
// oysa onay penceresi "belgeler de silinecektir" diyor. Yani her silinen
// başvurunun bütün dosyaları kovada SÜRESİZ kalıyordu — constitution m.10
// ihlali ve tarafın gördüğü sözün yalanlanması. 25.08'de canlıda bulunan
// 6 öksüz belgenin muhtemel üreticisi bu yoldur.
//
// İstemci bunu kendi düzeltemez: sesli notun kovası (`oturum-kayitlari`)
// istemciye KAPALIDIR (yalnız INSERT politikası var). Süpürme, servis
// anahtarıyla ancak burada yapılabilir.
//
// YETKİ AYNEN KORUNUR. `cases` üzerindeki RLS silme politikası
// "assigned_mediator_id = auth.uid()" ya da admin'dir; bu kol servis
// anahtarıyla RLS'i aştığı için AYNI iki koşulu kendisi arar. Kapıyı
// genişletmez.
//
// C3 KAPANIŞ SİLMESİYLE KARIŞTIRILMAZ: süreç bitmiş bir dosyanın verisini
// silmek `dosya-verilerini-sil` kolunun işidir (kapanış paketi + "SİL" yazma
// kapısı oradadır). Bu kol, henüz yürümemiş bir BAŞVURUYU listeden kaldırır.
//
// SİLİNEN İÇERİK HİÇBİR LOGA YAZILMAZ; anahtarlar loglanmaz.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { depoyuSupur } from "../_shared/depo-supurge.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    /* KAPI: yalnız kullanıcı oturumu. x-cron-secret KABUL EDİLMEZ —
       kendiliğinden başvuru silme yoktur. */
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const userId = userRes?.user?.id;
    if (!userId) return json({ error: "Oturum doğrulanamadı" }, 401);

    const govde = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const case_id = typeof govde?.case_id === "string" ? govde.case_id.trim() : "";
    if (!case_id) return json({ error: "case_id gerekli" }, 400);

    const { data: dosya } = await admin.from("cases")
      .select("id, assigned_mediator_id").eq("id", case_id).maybeSingle();
    if (!dosya) return json({ error: "Başvuru bulunamadı" }, 404);

    // RLS politikasının AYNISI: görevli arabulucu ya da admin.
    const satir = dosya as { assigned_mediator_id?: string | null };
    let yetkili = String(satir.assigned_mediator_id ?? "") === userId;
    if (!yetkili) {
      const { data: roleRow } = await admin.from("user_roles")
        .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      yetkili = !!roleRow;
    }
    if (!yetkili) {
      return json({
        error: "Silme işlemi başarısız. Bu başvuruyu silme yetkiniz yok veya başvuru zaten silinmiş olabilir.",
      }, 403);
    }

    /* ÖNCE DEPO, SONRA SATIR. Süpürge düşerse satıra DOKUNULMAZ: dosyalar
       bulunabilir kalsın ki bir sonraki deneme onları yine görebilsin. */
    const supurge = await depoyuSupur(admin, case_id);
    if (!supurge.ok) return json({ silindi: false, error: supurge.hata }, 500);

    /* Satırlar: `cases` silinince çocuk tablolar yabancı anahtar cascade'iyle
       gider. Cascade'in gerçekten koştuğunu çağıran ayrıca doğrular. */
    const { error: dErr, count } = await admin.from("cases")
      .delete({ count: "exact" }).eq("id", case_id);
    if (dErr) {
      console.error("[basvuru-sil] dosya satırı silinemedi", { case_id, kod: dErr.code ?? "" });
      return json({
        silindi: false,
        error: "Başvuru silinemedi; belgeleri kaldırıldı ama kaydı duruyor. Lütfen tekrar deneyin.",
      }, 500);
    }
    if (!count) {
      return json({
        silindi: false,
        error: "Silme işlemi başarısız. Başvuru zaten silinmiş olabilir.",
      }, 404);
    }

    return json({ silindi: true, belge: supurge.toplamYol });
  } catch (e) {
    const mesaj = e instanceof Error ? e.message : String(e);
    console.error("[basvuru-sil] Genel hata:", mesaj.slice(0, 200));
    return json({ error: "Silme sırasında bir sorun çıktı; işlem durduruldu." }, 500);
  }
});
