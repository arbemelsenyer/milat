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

// randevu_teklifi görevi: randevu-teklif fonksiyonunu iç çağrı kapısından (x-cron-secret)
// "olustur" ile çağırır. Saat seçimi ve tarafa e-posta o fonksiyonun işidir; burada
// yalnız tetiklenir. Çifte teklif olmasın diye önce bekleyen teklif kontrol edilir.
async function randevuTeklifiYurut(admin: any, caseId: string): Promise<{ durum: string; sonuc: string }> {
  const { data: bekleyenTeklif, error: tErr } = await admin.from("randevu_teklifleri")
    .select("id").eq("case_id", caseId).eq("durum", "beklemede").limit(1);
  if (tErr) return { durum: "bekliyor", sonuc: `Mevcut teklifler okunamadı: ${tErr.message}` };
  if (bekleyenTeklif && bekleyenTeklif.length > 0) {
    return { durum: "atlandi", sonuc: "Dosyada zaten cevap bekleyen randevu teklifi var" };
  }

  const { data: taraflar, error: pErr } = await admin.from("case_parties")
    .select("id, party_role").eq("case_id", caseId).eq("party_role", "applicant").limit(1);
  if (pErr) return { durum: "bekliyor", sonuc: `Taraf okunamadı: ${pErr.message}` };
  const basvuran = (taraflar ?? [])[0];
  if (!basvuran?.id) return { durum: "atlandi", sonuc: "Dosyada başvuran taraf yok" };

  if (!CRON_SECRET) return { durum: "bekliyor", sonuc: "CRON_SECRET tanımlı değil, iç çağrı yapılamadı" };

  const icBaslik = {
    "Content-Type": "application/json",
    "x-cron-secret": CRON_SECRET,
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  };

  try {
    // Saatleri fonksiyon seçer ("oner"), sonra her seçeneğe oturum_tipi:"online"
    // eklenip teklif oluşturulur — ajan akışının varsayılanı çevrim içi görüşmedir.
    const oRes = await fetch(`${SUPABASE_URL}/functions/v1/randevu-teklif`, {
      method: "POST",
      headers: icBaslik,
      body: JSON.stringify({ action: "oner", case_id: caseId, party_id: basvuran.id }),
    });
    const oBody = await oRes.json().catch(() => ({}));
    if (!oRes.ok) {
      return { durum: "bekliyor", sonuc: `Saat önerisi alınamadı (HTTP ${oRes.status}): ${String((oBody as any)?.error ?? "").slice(0, 200)}` };
    }
    if ((oBody as any)?.error === "musaitlik_yok") {
      return { durum: "atlandi", sonuc: "Takvimde uygun boş saat yok" };
    }
    if ((oBody as any)?.error) {
      return { durum: "bekliyor", sonuc: `Saat önerisi alınamadı: ${String((oBody as any).error).slice(0, 200)}` };
    }
    const onerilen = Array.isArray((oBody as any)?.secenekler) ? (oBody as any).secenekler : [];
    if (onerilen.length === 0) return { durum: "atlandi", sonuc: "Takvimde uygun boş saat yok" };
    const secenekler = onerilen.map((s: any) => ({
      gun: String(s?.gun ?? "").slice(0, 10),
      saat: String(s?.saat ?? "").slice(0, 5),
      oturum_tipi: "online",
    }));

    const res = await fetch(`${SUPABASE_URL}/functions/v1/randevu-teklif`, {
      method: "POST",
      headers: icBaslik,
      body: JSON.stringify({ action: "olustur", case_id: caseId, party_id: basvuran.id, secenekler }),
    });
    const govde = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { durum: "bekliyor", sonuc: `Teklif oluşturulamadı (HTTP ${res.status}): ${String((govde as any)?.error ?? "").slice(0, 200)}` };
    }
    const hata = (govde as any)?.error;
    if (hata === "musaitlik_yok") {
      return { durum: "atlandi", sonuc: "Takvimde uygun boş saat yok" };
    }
    if (hata) {
      return { durum: "bekliyor", sonuc: `Teklif oluşturulamadı: ${String(hata).slice(0, 200)}` };
    }
    return { durum: "yapildi", sonuc: "teklif oluşturuldu, link tarafa e-postayla gönderildi" };
  } catch (e: any) {
    return { durum: "bekliyor", sonuc: `İç çağrı başarısız: ${e?.message ?? String(e)}` };
  }
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

// Video bağlantısı: gelecekteki planlı ve bağlantısı boş oturumlar için create-video-room
// iç kapıdan çağrılır, dönen adres oturumun video_link alanına yazılır ve oturumun
// tarafına tek bilgilendirme e-postası gider. Bağlantı yazıldıktan sonra oturum bir daha
// seçilmediği için e-posta bir kez gönderilir. Yüz yüze olduğu teklif kaydından belli
// olan oturumlar atlanır; belli değilse oturum çevrim içi kabul edilir (video düğmesi
// zaten her oturumda var).
async function videoBaglantilariniHazirla(admin: any, dosya: any): Promise<number> {
  const simdi = new Date().toISOString();
  const { data: oturumlar, error: sErr } = await admin.from("case_sessions")
    .select("id, scheduled_at, status, video_link, participants")
    .eq("case_id", dosya.id)
    .eq("status", "scheduled")
    .gt("scheduled_at", simdi)
    .limit(50);
  if (sErr) {
    console.error(`[ajan-nobetci] oturumlar okunamadı (${dosya.id}): ${sErr.message}`);
    return 0;
  }
  const adaylar = ((oturumlar ?? []) as any[]).filter((s) => !String(s.video_link ?? "").trim());
  if (adaylar.length === 0) return 0;

  // Cevaplanmış tekliflerdeki saat → oturum tipi eşlemesi. Yalnız açıkça "yuz_yuze"
  // işaretli saatler dışlanır; işaret yoksa (eski kayıtlar dahil) oturum çevrim içi
  // sayılır ve bağlantı üretilir.
  const yuzYuzeSaatler = new Set<string>();
  const { data: teklifler } = await admin.from("randevu_teklifleri")
    .select("secenekler, durum").eq("case_id", dosya.id).eq("durum", "cevaplandi").limit(50);
  for (const t of (teklifler ?? []) as any[]) {
    for (const s of Array.isArray(t?.secenekler) ? t.secenekler : []) {
      if ((s as any)?.oturum_tipi === "yuz_yuze") {
        yuzYuzeSaatler.add(`${String((s as any).gun).slice(0, 10)}|${String((s as any).saat).slice(0, 5)}`);
      }
    }
  }

  let hazirlanan = 0;
  for (const oturum of adaylar) {
    try {
      const d = new Date(oturum.scheduled_at);
      const gun = d.toLocaleDateString("en-CA", { timeZone: TZ });
      const saat = d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
      if (yuzYuzeSaatler.has(`${gun}|${saat}`)) continue;

      if (!CRON_SECRET) {
        console.error("[ajan-nobetci] CRON_SECRET yok, video bağlantısı üretilemedi");
        return hazirlanan;
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-video-room`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": CRON_SECRET,
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ sessionId: oturum.id }),
      });
      const govde = await res.json().catch(() => ({}));
      const link = String((govde as any)?.room_url ?? "").trim();
      if (!res.ok || !link) {
        console.error(`[ajan-nobetci] video odası üretilemedi (${oturum.id}): HTTP ${res.status} ${String((govde as any)?.error ?? "").slice(0, 200)}`);
        continue;
      }
      // create-video-room bağlantıyı zaten oturuma yazar; yazılmadıysa burada tamamlanır.
      const { data: guncel } = await admin.from("case_sessions")
        .select("video_link").eq("id", oturum.id).maybeSingle();
      if (!String((guncel as any)?.video_link ?? "").trim()) {
        const { error: updErr } = await admin.from("case_sessions")
          .update({ video_link: link }).eq("id", oturum.id);
        if (updErr) console.error(`[ajan-nobetci] video_link yazılamadı (${oturum.id}): ${updErr.message}`);
      }

      await videoBaglantiEpostasi(admin, dosya, oturum, link, gun, saat);
      hazirlanan++;
    } catch (e: any) {
      console.error(`[ajan-nobetci] video bağlantısı hazırlanamadı (${oturum.id}): ${e?.message ?? e}`);
    }
  }
  return hazirlanan;
}

// Oturumun tarafına kısa bilgilendirme: dosya künyesi, gün-saat ve bağlantı.
// Karşı tarafa ait hiçbir veri geçmez; imza dosyanın arabulucusunun adıdır.
async function videoBaglantiEpostasi(
  admin: any, dosya: any, oturum: any, link: string, gun: string, saat: string,
): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.error("[ajan-nobetci] RESEND_API_KEY yok, bağlantı e-postası gönderilemedi");
    return;
  }
  const partyIds = (Array.isArray(oturum?.participants) ? oturum.participants : [])
    .map((p: any) => String(p?.party_id ?? "")).filter(Boolean);
  if (partyIds.length === 0) return;

  const { data: taraflar } = await admin.from("case_parties")
    .select("id, party_type, first_name, last_name, company_name, email")
    .in("id", partyIds);

  const arabulucuId = takvimSahibi(dosya);
  const { data: profil } = arabulucuId
    ? await admin.from("profiles").select("full_name").eq("user_id", arabulucuId).maybeSingle()
    : { data: null };
  const adSoyad = String((profil as any)?.full_name ?? "").trim();
  const imza = adSoyad ? (/^arb\.?\s/i.test(adSoyad) ? adSoyad : `Arb. ${adSoyad}`) : "MediPact AI";

  const esc = (t: string) => String(t).replace(/</g, "&lt;");
  const tarih = new Date(`${gun}T${saat}:00+03:00`)
    .toLocaleDateString("tr-TR", { timeZone: TZ, day: "numeric", month: "long", year: "numeric", weekday: "long" });
  const kunye: string[] = [];
  if (dosya?.application_no) kunye.push(`<strong>Dosya No:</strong> ${esc(String(dosya.application_no))}`);
  if (dosya?.title) kunye.push(`<strong>Uyuşmazlık konusu:</strong> ${esc(String(dosya.title))}`);

  for (const t of (taraflar ?? []) as any[]) {
    const email = String(t?.email ?? "").trim();
    if (!email) continue;
    const ad = t?.party_type === "individual"
      ? `${t?.first_name ?? ""} ${t?.last_name ?? ""}`.trim()
      : String(t?.company_name ?? "").trim();
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
      <p>Sayın ${esc(ad || "Taraf")},</p>
      ${kunye.length ? `<p>${kunye.join("<br>")}</p>` : ""}
      <p><strong>Görüşme:</strong> ${esc(tarih)} · ${esc(saat)}</p>
      <p>Görüşme bağlantınız:<br><a href="${link}">${esc(link)}</a></p>
      <p>Saygılarımızla,<br>${esc(imza)}</p>
      <p style="font-size:12px;color:#666">Bu ileti MediPact AI aracılığıyla gönderilmiştir.</p>
    </body></html>`;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "MİLAT Arabuluculuk <info@milatmediation.com>",
          to: [email],
          subject: "Görüşme bağlantınız",
          html,
        }),
      });
      if (!res.ok) {
        console.error("[ajan-nobetci] bağlantı e-postası gönderilemedi", { status: res.status, body: (await res.text()).slice(0, 200) });
      }
    } catch (e: any) {
      console.error(`[ajan-nobetci] bağlantı e-postası hatası: ${e?.message ?? e}`);
    }
  }
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
      .select("id, deadline_total, deadline_extended, extension_used, assigned_mediator_id, user_id, application_no, title")
      .eq("otomatik_akis", true)
      .limit(500);
    if (cErr) return json({ error: cErr.message }, 500);

    let islenenDosya = 0;
    let yapilanGorev = 0;
    let atlananGorev = 0;
    let yeniRandevuGorevi = 0;
    let hazirlananVideo = 0;
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
          if (gorev.gorev_tipi !== "soru_gonder" && gorev.gorev_tipi !== "randevu_teklifi") continue;
          if (gorev.gorev_tipi === "soru_gonder" && !gorev.hedef_party_id) {
            await admin.from("ajan_gorevleri")
              .update({ durum: "atlandi", sonuc: "Hedef taraf yok" }).eq("id", gorev.id);
            atlananGorev++;
            continue;
          }
          const { durum, sonuc } = gorev.gorev_tipi === "randevu_teklifi"
            ? await randevuTeklifiYurut(admin, dosya.id)
            : await soruGonder(admin, dosya.id, gorev.hedef_party_id);
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
        const videoHazirlanan = await videoBaglantilariniHazirla(admin, dosya);
        hazirlananVideo += videoHazirlanan;
        islenenDosya++;

        await nobetciDurumYaz(admin, dosya.id, {
          status: "completed",
          error_message: null,
          last_output: {
            bu_dosyada_yapilan_gorev: buDosyaYapilan,
            bu_dosyada_hazirlanan_video: videoHazirlanan,
            kosum_zamani: new Date().toISOString(),
          },
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
      video_baglantisi_hazirlandi: hazirlananVideo,
      hata: hatalar,
    });
  } catch (e: any) {
    console.error("[ajan-nobetci] koşum hatası", e?.message ?? e);
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
