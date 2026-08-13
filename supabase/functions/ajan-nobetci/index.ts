// Ajan nöbetçisi: otomatik akışı açık dosyalarda sıradaki adımı yürütür.
// Yalnız panoyu (ajan_gorevleri) işler ve zaman kontrolü yapar; analiz, randevu
// ve belge akışlarının kendisine dokunmaz. Güvenlik deseni check-new-tariff ile aynı:
// x-cron-secret veya admin JWT; ikisi de yoksa 401.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const SURE_ESIGI_GUN = 3;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function metin(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// Kokpitteki [Soruyu gönder] düğmesiyle AYNI yazım: ajanın ürettiği sıradaki
// sorulardan tarafa henüz iletilmemiş ilki, case_discovery_questions'a o tarafın
// party_id'siyle yazılır (tarafın CaseRoom'da zaten okuduğu kanal).
async function soruGonder(admin: any, caseId: string, partyId: string): Promise<{ durum: string; sonuc: string }> {
  const { data: analizler, error: caErr } = await admin.from("party_communication_analysis")
    .select("discovery_questions, created_at")
    .eq("case_id", caseId)
    .eq("party_id", partyId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (caErr) return { durum: "bekliyor", sonuc: `Sorular okunamadı: ${caErr.message}` };

  const uretilen: string[] = [];
  for (const row of (analizler ?? []) as any[]) {
    for (const q of Array.isArray(row?.discovery_questions) ? row.discovery_questions : []) {
      const soru = metin((q as any)?.soru);
      if (soru) uretilen.push(soru);
    }
  }
  if (uretilen.length === 0) {
    return { durum: "atlandi", sonuc: "Gönderilecek keşif sorusu yok" };
  }

  const { data: iletilmisRows, error: dqErr } = await admin.from("case_discovery_questions")
    .select("question_text, question_order")
    .eq("case_id", caseId)
    .eq("party_id", partyId);
  if (dqErr) return { durum: "bekliyor", sonuc: `İletilmiş sorular okunamadı: ${dqErr.message}` };

  const iletilmis = new Set(((iletilmisRows ?? []) as any[]).map((r) => metin(r.question_text)));
  const hedef = uretilen.find((s) => !iletilmis.has(s));
  if (!hedef) {
    return { durum: "atlandi", sonuc: "Sorular tarafa zaten gönderilmiş" };
  }

  const siralar = ((iletilmisRows ?? []) as any[]).map((r) => Number(r.question_order ?? 0));
  const siradaki = (siralar.length ? Math.max(...siralar) : 0) + 1;

  const { error: insErr } = await admin.from("case_discovery_questions").insert({
    case_id: caseId,
    party_id: partyId,
    question_text: hedef,
    question_order: siradaki,
  });
  if (insErr) return { durum: "bekliyor", sonuc: `Yazılamadı: ${insErr.message}` };

  return { durum: "yapildi", sonuc: "soru tarafın kanalına yazıldı" };
}

// Zaman kontrolü: süre bitimine SURE_ESIGI_GUN veya daha az kaldıysa, gelecekte planlı
// oturum ve bekleyen randevu teklifi yoksa panoya randevu_teklifi görevi bırakılır.
async function zamanKontrolu(admin: any, dosya: any): Promise<boolean> {
  const sonTarih = dosya?.extension_used && dosya?.deadline_extended
    ? dosya.deadline_extended
    : dosya?.deadline_total;
  if (!sonTarih) return false;
  const kalanGun = Math.ceil((new Date(sonTarih).getTime() - Date.now()) / 86_400_000);
  if (!Number.isFinite(kalanGun) || kalanGun > SURE_ESIGI_GUN) return false;

  const simdi = new Date().toISOString();
  const { data: oturumlar } = await admin.from("case_sessions")
    .select("id")
    .eq("case_id", dosya.id)
    .eq("status", "scheduled")
    .gt("scheduled_at", simdi)
    .limit(1);
  if (oturumlar && oturumlar.length > 0) return false;

  const { data: teklifler } = await admin.from("randevu_teklifleri")
    .select("id")
    .eq("case_id", dosya.id)
    .eq("durum", "beklemede")
    .limit(1);
  if (teklifler && teklifler.length > 0) return false;

  const { data: bekleyen } = await admin.from("ajan_gorevleri")
    .select("id")
    .eq("case_id", dosya.id)
    .eq("gorev_tipi", "randevu_teklifi")
    .eq("durum", "bekliyor")
    .limit(1);
  if (bekleyen && bekleyen.length > 0) return false;

  const { error } = await admin.from("ajan_gorevleri").insert({
    case_id: dosya.id,
    gorev_tipi: "randevu_teklifi",
    durum: "bekliyor",
    gerekce: "Süre yaklaşıyor, planlı oturum yok",
  });
  if (error) {
    console.error(`[ajan-nobetci] randevu_teklifi görevi yazılamadı (${dosya.id}): ${error.message}`);
    return false;
  }
  return true;
}

// Koşum kaydı: agent_states'e mevcut upsert deseniyle 'nobetci' satırı (dosya başına bir satır).
async function nobetciDurumYaz(admin: any, caseId: string, patch: Record<string, unknown>) {
  const { data: existing } = await admin.from("agent_states")
    .select("id").eq("case_id", caseId).eq("agent_type", "nobetci").is("party_id", null).maybeSingle();
  if (existing?.id) {
    await admin.from("agent_states").update(patch).eq("id", existing.id);
  } else {
    await admin.from("agent_states").insert({ case_id: caseId, agent_type: "nobetci", party_id: null, ...patch });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // pg_cron çağrısı için x-cron-secret; manuel çağrıda admin JWT şart (default-deny).
    const authHeader = req.headers.get("Authorization");
    const cronHeader = req.headers.get("x-cron-secret");
    const isCron = !!CRON_SECRET && cronHeader === CRON_SECRET;
    if (!isCron) {
      if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);
      const token = authHeader.replace("Bearer ", "");
      const admin0 = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data: userRes } = await admin0.auth.getUser(token);
      if (!userRes?.user) return json({ error: "Oturum doğrulanamadı" }, 401);
      const { data: isAdmin } = await admin0.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" });
      if (!isAdmin) return json({ error: "Admin gereklidir" }, 403);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: dosyalar, error: cErr } = await admin.from("cases")
      .select("id, deadline_total, deadline_extended, extension_used")
      .eq("otomatik_akis", true)
      .limit(500);
    if (cErr) return json({ error: cErr.message }, 500);

    let islenenDosya = 0;
    let yapilanGorev = 0;
    let atlananGorev = 0;
    let yeniRandevuGorevi = 0;
    const hatalar: string[] = [];

    for (const dosya of (dosyalar ?? []) as any[]) {
      // Bir dosyadaki hata diğer dosyaları durdurmaz.
      let buDosyaYapilan = 0;
      try {
        const { data: gorevler, error: gErr } = await admin.from("ajan_gorevleri")
          .select("id, gorev_tipi, hedef_party_id, durum")
          .eq("case_id", dosya.id)
          .eq("durum", "bekliyor")
          .limit(100);
        if (gErr) throw new Error(gErr.message);

        for (const gorev of (gorevler ?? []) as any[]) {
          // Tanınmayan görev tipine dokunulmaz: 'bekliyor' kalır.
          if (gorev.gorev_tipi !== "soru_gonder") continue;
          if (!gorev.hedef_party_id) {
            await admin.from("ajan_gorevleri")
              .update({ durum: "atlandi", sonuc: "Hedef taraf yok" }).eq("id", gorev.id);
            atlananGorev++;
            continue;
          }
          const { durum, sonuc } = await soruGonder(admin, dosya.id, gorev.hedef_party_id);
          if (durum !== "bekliyor") {
            await admin.from("ajan_gorevleri").update({ durum, sonuc }).eq("id", gorev.id);
          } else {
            // Yazılamadı: görev bekliyor kalır, neden sonuc alanına düşer.
            await admin.from("ajan_gorevleri").update({ sonuc }).eq("id", gorev.id);
            hatalar.push(`${dosya.id}: ${sonuc}`);
            console.error(`[ajan-nobetci] görev yürütülemedi (${gorev.id}): ${sonuc}`);
          }
          if (durum === "yapildi") { yapilanGorev++; buDosyaYapilan++; }
          if (durum === "atlandi") atlananGorev++;
        }

        if (await zamanKontrolu(admin, dosya)) yeniRandevuGorevi++;
        islenenDosya++;

        await nobetciDurumYaz(admin, dosya.id, {
          status: "completed",
          error_message: null,
          last_output: { bu_dosyada_yapilan_gorev: buDosyaYapilan, kosum_zamani: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        });
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        hatalar.push(`${dosya.id}: ${msg}`);
        console.error(`[ajan-nobetci] dosya işlenemedi (${dosya.id}): ${msg}`);
        try {
          await nobetciDurumYaz(admin, dosya.id, {
            status: "failed",
            error_message: msg,
            last_output: { kosum_zamani: new Date().toISOString() },
            updated_at: new Date().toISOString(),
          });
        } catch { /* durum yazımı da başarısızsa koşum yine sürer */ }
      }
    }

    return json({
      dosya: islenenDosya,
      gorev_yapildi: yapilanGorev,
      gorev_atlandi: atlananGorev,
      randevu_gorevi_acildi: yeniRandevuGorevi,
      hata: hatalar,
    });
  } catch (e: any) {
    console.error("[ajan-nobetci] koşum hatası", e?.message ?? e);
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
