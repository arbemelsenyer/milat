// AJAN — ANLAŞMA TASLAĞI DENETİMİ (İBA 2.6 / B21)
//
// Anlaşma taslağı üretildiğinde ajan taslağı okur ve kalıpla bulunabilen
// belirsizlik / eksiklik / çelişki noktalarını arabulucunun sohbetine yazar.
//
// DENETİM MANTIĞI YENİDEN YAZILMADI: _shared/taslak-denetle.ts, üründe zaten
// çalışan ön yüz denetiminin (src/components/mediation/TaslakDenetimi.tsx) SAF
// bölümünün birebir kopyasıdır. Ön yüzdeki elle çalıştırma yolu aynen duruyor
// (constitution m.8 — çalışan yol temizlik için değiştirilmez).
//
// BELGEYİ DEĞİŞTİRMEZ (constitution m.5): taslak metnine, sürümüne ve üretim
// hattına dokunulmaz. Bulgular yalnız gösterilir; düzeltmeyi arabulucu yapar.
// İMZA İNSANDADIR — dört insan kapısından biri.
//
// HUKUKİ NİTELEME YOK: "geçersizdir / hükümsüzdür" denmez; yalnız neyin
// belirsiz, eksik ya da çelişkili göründüğü söylenir (constitution m.2).
//
// KÖR VERİ: taslak metni ve taraf ADLARI dışında hiçbir veri okunmaz; bulgular
// yalnız arabulucunun satırına yazılır, tarafa açılmaz.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { anlatimAc, zatenCalisiyorMu } from "../_shared/anlatim.ts";
import { taslagiDenetle } from "../_shared/taslak-denetle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
// İzinli agent_type listesinden: belge tarafındaki iş.
const AGENT_TYPE = "agreement_generation";

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

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  let anlatim: ReturnType<typeof anlatimAc> | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    const cronHeader = req.headers.get("x-cron-secret");
    const isCron = !!CRON_SECRET && cronHeader === CRON_SECRET;
    if (!isCron) {
      if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);
      const { data: userRes } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!userRes?.user) return json({ error: "Oturum doğrulanamadı" }, 401);
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" });
      if (!isAdmin) return json({ error: "Admin gereklidir" }, 403);
    }

    const govde = await req.json().catch(() => ({}));
    const case_id = temiz((govde as any)?.case_id);
    const belge_id = temiz((govde as any)?.belge_id) || temiz((govde as any)?.document_id);
    const talimat = temiz((govde as any)?.talimat);
    if (!case_id) return json({ error: "case_id gerekli" }, 400);

    const sahip = { case_id, agent_type: AGENT_TYPE, party_id: null };
    const kilit = await zatenCalisiyorMu(admin, sahip);
    if (kilit.calisiyor) return json({ atlandi: true, sebep: kilit.sebep });

    /* ARABULUCU TALİMATI (varsa): adımın KENDİ yönergesine EK yönergedir,
       yerine geçmez. Anayasa üstündür — yasak isteyen talimat koşucuda elenir;
       burada yalnız uygun talimat işlenir. Talimat kipinde tarafa yazan hiçbir
       şey yapılmaz; iş önce arabulucunun onayına sunulur. */
    anlatim = anlatimAc(admin, sahip);
    await anlatim.baslat("Anlaşma taslağını okuyorum.");
    if (talimat) {
      await anlatim.adim(`Arabulucunun talimatı uygulandı: ${talimat.slice(0, 160)}`);
    }

    /* Taslak metni agreement_documents.metadata.filled_text alanında durur
       (ön yüzdeki sürüm listesiyle aynı kaynak). Belge id verilmemişse dosyanın
       EN SON taslağı okunur. */
    let q = admin.from("agreement_documents")
      .select("id, metadata, created_at").eq("case_id", case_id)
      .order("created_at", { ascending: false }).limit(5);
    if (belge_id) q = q.eq("id", belge_id);
    const { data: belgeler, error } = await q;
    if (error) {
      await anlatim.hata("Taslağı şu an okuyamadım.");
      return json({ error: error.message }, 500);
    }

    const satir = ((belgeler ?? []) as any[])
      .find((r) => temiz(r?.metadata?.filled_text).length > 40) ?? null;
    const metin = temiz((satir as any)?.metadata?.filled_text);
    if (!metin) {
      await anlatim.bitti({
        yapildi: "Denetlenecek taslak bulamadım.",
        eksik: "Dosyada metni okunabilen bir anlaşma taslağı yok.",
      });
      return json({ bulgu: 0, sebep: "taslak metni yok" });
    }

    // Ad/unvan tutarsızlığı denetimi için taraf adları (yalnız ad — başka alan yok).
    const { data: taraflar } = await admin.from("case_parties")
      .select("party_type, first_name, last_name, company_name").eq("case_id", case_id).limit(10);
    const adlar = ((taraflar ?? []) as any[]).map((t) => (
      t.party_type === "individual"
        ? `${temiz(t.first_name)} ${temiz(t.last_name)}`.trim()
        : temiz(t.company_name)
    )).filter(Boolean);

    const bulgular = taslagiDenetle(metin, adlar);
    await anlatim.adim(`Taslağı ${bulgular.length > 0 ? "okudum ve işaretlenecek yerleri çıkardım" : "baştan sona okudum"}.`);

    if (bulgular.length === 0) {
      await anlatim.bitti({ yapildi: "Taslakta kalıpla bulunabilen bir belirsizlik, eksiklik ya da çelişki görmedim." });
      return json({ bulgu: 0 });
    }

    // Bulgular sohbete: her biri konumu ve tek cümlelik alıntısıyla.
    for (const b of bulgular.slice(0, 12)) {
      await anlatim.adim(`${temiz((b as any).tip)} — ${temiz((b as any).konum)}: ${temiz((b as any).aciklama)}`);
    }
    await anlatim.bitti({
      yapildi: `Taslakta ${bulgular.length} nokta işaretledim; düzeltme sizde.`,
      eksik: "İmza ve kapanış kararı sizde — ajan belgeye dokunmaz.",
    });

    return json({ bulgu: bulgular.length, bulgular: bulgular.slice(0, 12) });
  } catch (e: any) {
    const msg = String(e?.message ?? "Bilinmeyen sistem hatası");
    console.error("[taslak-denetim] Genel hata:", msg.slice(0, 200));
    if (anlatim) await anlatim.hata("Taslak denetimini tamamlayamadım, sonra tekrar deneyeceğim.");
    return json({ error: msg }, 500);
  }
});
