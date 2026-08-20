// AKIŞ ONAYI — arabulucu sohbetten onaylar (yasa · insan kapısı)
//
// Arabulucu, kontrol tercihinde işaretlediği bir adım için onay istendiğinde
// sohbetten onaylar. Bu fonksiyon:
//   1. onay görevini 'yapildi' yapar,
//   2. o adımı bekleten olayı yeniden işlenecek şekilde işaretler ve verisine
//      onay_verildi=true koyar.
// Koşucu, olayda onay_verildi=true görürse tercih listesine BAKMADAN o adımı
// koşar — kapıyı bir kez arabulucu açmıştır.
//
// KAPI SAYISINI ÜRÜN DEĞİL ARABULUCU BELİRLER (constitution m.3): bu fonksiyon
// hiçbir kapıyı kendiliğinden kaldırmaz, yalnız arabulucunun verdiği onayı
// kaydeder. Dört değişmez insan kapısı (imza · bilirkişi ataması · kayıt/döküm
// rızası · tarafla asıl müzakere) bu yolla AÇILAMAZ; onlar kural tablosunda
// insan_kapisi ile durur ve bu fonksiyon onlara dokunmaz.
//
// KÖR VERİ (constitution m.1): yalnız dosyanın görevli arabulucusu (ya da
// yönetici) onay verebilir; yetki SUNUCUDA doğrulanır, ekrandan gelen bilgiye
// güvenilmez. Tarafa hiçbir iz düşmez.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const userId = userRes?.user?.id;
    if (!userId) return json({ error: "Oturum doğrulanamadı" }, 401);

    const govde = await req.json().catch(() => ({}));
    const gorev_id = temiz((govde as any)?.gorev_id);
    if (!gorev_id) return json({ error: "gorev_id gerekli" }, 400);

    const { data: gorev, error: gErr } = await admin.from("ajan_gorevleri")
      .select("id, case_id, gorev_tipi, hedef_party_id, durum, gerekce").eq("id", gorev_id).maybeSingle();
    if (gErr) return json({ error: gErr.message }, 500);
    if (!gorev) return json({ error: "Onay kaydı bulunamadı" }, 404);
    if (String((gorev as any).gorev_tipi) !== "akis_onay_bekliyor") {
      return json({ error: "Bu kayıt bir akış onayı değil" }, 400);
    }
    if (String((gorev as any).durum) !== "bekliyor") {
      return json({ onaylandi: false, sebep: "Bu onay zaten kapanmış." });
    }

    // YETKİ: yalnız görevli arabulucu ya da yönetici.
    const caseId = String((gorev as any).case_id);
    const { data: dosya } = await admin.from("cases")
      .select("assigned_mediator_id").eq("id", caseId).maybeSingle();
    let yetkili = String((dosya as any)?.assigned_mediator_id ?? "") === userId;
    if (!yetkili) {
      const { data: roleRow } = await admin.from("user_roles")
        .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      yetkili = !!roleRow;
    }
    if (!yetkili) return json({ error: "Bu onayı verme yetkiniz yok" }, 403);

    const { error: uErr } = await admin.from("ajan_gorevleri")
      .update({ durum: "yapildi", sonuc: "arabulucu onayladı" }).eq("id", gorev_id);
    if (uErr) return json({ error: uErr.message }, 500);

    /* Adımı bekleten olay(lar) yeniden işlenecek şekilde işaretlenir ve
       verisine onay_verildi=true konur. Yeni olay AÇILMAZ; bekleyen olay
       kaldığı yerden sürer (yasa 5. madde). */
    let uyandirilan = 0;
    const { data: olaylar } = await admin.from("akis_olaylari")
      .select("id, veri, islendi").eq("case_id", caseId)
      .order("created_at", { ascending: false }).limit(20);
    for (const o of ((olaylar ?? []) as any[])) {
      if (o.islendi === true) continue;   // yalnız hâlâ bekleyen olaylar
      const veri = o.veri && typeof o.veri === "object" && !Array.isArray(o.veri) ? o.veri : {};
      const { error: oErr } = await admin.from("akis_olaylari")
        .update({ veri: { ...veri, onay_verildi: true }, islendi: false })
        .eq("id", o.id);
      if (!oErr) uyandirilan++;
    }

    return json({ onaylandi: true, uyandirilan });
  } catch (e: any) {
    const msg = String(e?.message ?? "Bilinmeyen sistem hatası");
    console.error("[akis-onayla] Genel hata:", msg.slice(0, 200));
    return json({ error: msg }, 500);
  }
});
