// SOHBETTEN CEVAP YAZ (yasa 4./5. madde — cevap kapısı)
//
// Ajanın sorduğu bekleyen soruya, sorunun MUHATABI sohbetten cevap verir:
// cevap görevin `sonuc` alanına yazılır ve durum 'yapildi' olur. Cevap gelince
// nöbetçinin "kaldığı yerden devam" kolu ilgili ajanı yeniden uyandırır.
//
// NEDEN AYRI BİR KAPI: taraf, ajan_gorevleri satırlarını yalnız OKUYABİLİR
// (RLS: "Party reads own agent tasks" — SELECT). Cevabı yazabilmesi için
// sunucu tarafında kimliği doğrulanmış dar bir kapı gerekir. Bu fonksiyon
// YALNIZCA cevabı yazar; başka hiçbir alanı, başka hiçbir satırı değiştirmez.
//
// BU FONKSİYON BİR AKIŞ ADIMI DEĞİLDİR: olayla uyanmaz, koşucu onu çağırmaz,
// bu yüzden ortak motorun MOTORA_BAGLI listesinde yer almaz (soru-cevap
// yüzeyleriyle aynı gerekçe).
//
// KÖR VERİ (constitution m.1): cevap yazan kişi ya sorunun hedefi olan TARAFTIR
// ya da dosyanın arabulucusudur (görevli arabulucu / dosya sahibi / yönetici —
// bilirkisi-secim ile AYNI üç ölçüt). Başkasının sorusuna cevap yazılamaz;
// yetki kontrolü sunucuda yapılır, ekrandan gelen bilgiye güvenilmez.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { ajanaTalimatMi } from "../_shared/anlatim.ts";

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
    const cevap = temiz((govde as any)?.cevap).slice(0, 2000);
    if (!gorev_id || !cevap) return json({ error: "gorev_id ve cevap gerekli" }, 400);

    const { data: gorev, error: gErr } = await admin.from("ajan_gorevleri")
      .select("id, case_id, gorev_tipi, hedef_party_id, durum").eq("id", gorev_id).maybeSingle();
    if (gErr) return json({ error: gErr.message }, 500);
    if (!gorev) return json({ error: "Soru bulunamadı" }, 404);
    if (String((gorev as any).durum) !== "bekliyor") {
      return json({ yazildi: false, sebep: "Bu soru zaten kapanmış." });
    }

    // YETKİ: ya sorunun hedefi olan taraf, ya dosyanın görevli arabulucusu.
    let yetkili = false;
    if ((gorev as any).hedef_party_id) {
      const { data: taraf } = await admin.from("case_parties")
        .select("id, user_id, case_id").eq("id", (gorev as any).hedef_party_id).maybeSingle();
      yetkili = !!taraf
        && String((taraf as any).user_id ?? "") === userId
        && String((taraf as any).case_id) === String((gorev as any).case_id);
    }
    /* ARABULUCU KİMLİĞİ TEK ÖLÇÜTLE (23.08 kurucu kararı): bilirkisi-secim
       (index.ts:161-166) arabulucuyu ÜÇ yoldan tanıyor; burası yalnız
       assigned_mediator_id'ye bakıyordu ve o alan her dosyada dolu olmadığı için
       (13.08 dersi) arabulucu kendi dosyasında 403 alıp ekranda "Cevabınızı şu an
       kaydedemedim" görüyordu. Ölçüt GENİŞLETİLMEDİ, ürünün geri kalanıyla
       EŞİTLENDİ: yönetici · görevli arabulucu · dosya sahibi. RLS'e dokunulmadı;
       taraf yolu (yukarısı) aynen duruyor. */
    if (!yetkili) {
      const { data: dosya } = await admin.from("cases")
        .select("assigned_mediator_id, user_id").eq("id", (gorev as any).case_id).maybeSingle();
      yetkili = String((dosya as any)?.assigned_mediator_id ?? "") === userId
        || String((dosya as any)?.user_id ?? "") === userId;
      if (!yetkili) {
        const { data: yonetici } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
        yetkili = !!yonetici;
      }
    }
    if (!yetkili) return json({ error: "Bu soruya cevap yazma yetkiniz yok" }, 403);

    /* PROMPT INJECTION SAVUNMASI: cevap VERİDİR, TALİMAT DEĞİLDİR. İçinde
       ajana yönelik cümle varsa işaretlenir; ajan onu uygulamaz. Cevabın kendisi
       insanın sözüdür, sansürlenmez — yalnız talimat olarak okunmaz. */
    const talimatSizintisi = ajanaTalimatMi(cevap);
    const { error: uErr } = await admin.from("ajan_gorevleri")
      .update({
        durum: "yapildi",
        sonuc: talimatSizintisi ? `[veri] ${cevap}` : cevap,
      }).eq("id", gorev_id);
    if (talimatSizintisi) {
      console.error("[taraf-cevap] cevapta ajana yönelik talimat görüldü, uygulanmadı");
    }
    if (uErr) return json({ error: uErr.message }, 500);

    return json({ yazildi: true });
  } catch (e: any) {
    const msg = String(e?.message ?? "Bilinmeyen sistem hatası");
    console.error("[taraf-cevap] Genel hata:", msg.slice(0, 200));
    return json({ error: msg }, 500);
  }
});
