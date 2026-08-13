// Randevu teklifi: saatleri sunucu seçer, taraf token'lı girişsiz sayfadan cevaplar.
// Kör veri ilkesi: "getir" yalnız seçenekleri, taraf adını ve dosya başlığını döner;
// token'ı bilmeyen hiçbir istek hiçbir veri alamaz.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// gun/saat zorunlu; oturum_tipi, adres gibi ek alanlar olduğu gibi taşınır.
type Secenek = { gun: string; saat: string; [alan: string]: unknown };

const GUN_RE = /^\d{4}-\d{2}-\d{2}$/;
const SAAT_RE = /^\d{2}:\d{2}$/;
const TZ = "Europe/Istanbul";

// Sunucu UTC koşar; gün/saat karşılaştırmaları Türkiye saatine göre yapılır.
function bugunTR(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}
function suanSaatTR(): string {
  return new Date().toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}

function normalizeSecenekler(raw: unknown): Secenek[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 3) return null;
  const out: Secenek[] = [];
  for (const s of raw) {
    if (!s || typeof s !== "object" || Array.isArray(s)) return null;
    const gun = String((s as any)?.gun ?? "").slice(0, 10);
    const saat = String((s as any)?.saat ?? "").slice(0, 5);
    if (!GUN_RE.test(gun) || !SAAT_RE.test(saat)) return null;
    // Girdideki ek alanlar (oturum_tipi, adres vb.) korunur; yalnız gun/saat düzeltilir.
    out.push({ ...(s as Record<string, unknown>), gun, saat });
  }
  return out;
}

// Saatleri ajan seçer: arabulucunun gelecek müsaitlik aralıkları okunur, bekleyen
// tekliflerde kullanılan saatler dışlanır, taraf tipine göre 1 veya 3 seçenek verilir.
// Takvimin sahibi dosyanın arabulucusudur: assigned_mediator_id doluysa o, boşsa
// cases.user_id. JWT yalnız kimlik doğrulama ve yetki kontrolü içindir.
function takvimSahibi(caseRow: any): string {
  return caseRow?.assigned_mediator_id ?? caseRow?.user_id ?? "";
}

async function saatleriSec(admin: any, mediatorId: string, party: any): Promise<{ secenekler: Secenek[]; hata?: string; tanili?: any }> {
  if (!mediatorId) return { secenekler: [], hata: "musaitlik_yok", tanili: { sebep: "dosyada arabulucu yok" } };

  const bugun = bugunTR();
  const simdi = suanSaatTR();

  // Okuma service role ile yapılır (verify_jwt=false olduğundan anon istemci RLS'e takılır).
  const { data: slots, error: slotErr } = await admin.from("mediator_availability")
    .select("gun, baslangic")
    .eq("user_id", mediatorId)
    .gte("gun", bugun)
    .order("gun", { ascending: true })
    .order("baslangic", { ascending: true })
    .limit(200);
  if (slotErr) return { secenekler: [], hata: "musaitlik_yok", tanili: { sebep: slotErr.message } };

  // Dolu saatler: arabulucunun TÜM dosyalarındaki bekleyen teklifler ve planlanmış
  // oturumlar. Dosya kimlikleri önce tek sorguyla alınır — gömülü ilişki (cases:case_id)
  // üzerinden filtrelemek sessizce boş dönebiliyordu.
  const dolu = new Set<string>();
  const doluAnahtar = (gun: string, saat: string) => `${String(gun).slice(0, 10)}|${String(saat).slice(0, 5)}`;

  const { data: kendiDosyalar, error: caseErr } = await admin.from("cases")
    .select("id, assigned_mediator_id, user_id")
    .or(`assigned_mediator_id.eq.${mediatorId},user_id.eq.${mediatorId}`)
    .limit(1000);
  const caseIds = ((kendiDosyalar ?? []) as any[])
    .filter((c) => takvimSahibi(c) === mediatorId)
    .map((c) => String(c.id));

  let pendingErr: string | null = caseErr?.message ?? null;
  let sessionErr: string | null = null;

  if (caseIds.length) {
    const { data: pending, error: pErr } = await admin.from("randevu_teklifleri")
      .select("secenekler")
      .in("case_id", caseIds)
      .eq("durum", "beklemede")
      .limit(500);
    if (pErr) pendingErr = pErr.message;
    for (const row of (pending ?? []) as any[]) {
      for (const s of Array.isArray(row?.secenekler) ? row.secenekler : []) {
        dolu.add(doluAnahtar(String(s?.gun ?? ""), String(s?.saat ?? "")));
      }
    }

    // Planlanmış oturumlar: scheduled_at UTC saklanır, TR gün+saatine çevrilir.
    const { data: sessions, error: sErr } = await admin.from("case_sessions")
      .select("scheduled_at, status")
      .in("case_id", caseIds)
      .eq("status", "scheduled")
      .limit(1000);
    if (sErr) sessionErr = sErr.message;
    for (const s of (sessions ?? []) as any[]) {
      if (!s?.scheduled_at) continue;
      const d = new Date(s.scheduled_at);
      if (Number.isNaN(d.getTime())) continue;
      const gun = d.toLocaleDateString("en-CA", { timeZone: TZ });
      const saat = d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
      dolu.add(doluAnahtar(gun, saat));
    }
  }

  const bos: Secenek[] = [];
  for (const r of (slots ?? []) as any[]) {
    const gun = String(r.gun).slice(0, 10);
    const saat = String(r.baslangic).slice(0, 5);
    if (gun === bugun && saat <= simdi) continue;       // bugünün geçmiş saatleri
    if (dolu.has(doluAnahtar(gun, saat))) continue;     // bekleyen teklif veya planlı oturum
    bos.push({ gun, saat });
  }
  if (bos.length === 0) {
    return {
      secenekler: [],
      hata: "musaitlik_yok",
      tanili: {
        mediator_id: mediatorId, bugun, satir: (slots ?? []).length, dolu: dolu.size,
        dosya: caseIds.length, teklif_hatasi: pendingErr, oturum_hatasi: sessionErr,
      },
    };
  }

  const bireysel = party?.is_individual === true || party?.party_type === "individual";
  if (bireysel) return { secenekler: [bos[0]] };

  // Kurumsal: en yakın 3 FARKLI günden birer seçenek.
  const secilen: Secenek[] = [];
  const gunler = new Set<string>();
  for (const s of bos) {
    if (gunler.has(s.gun)) continue;
    gunler.add(s.gun);
    secilen.push(s);
    if (secilen.length === 3) break;
  }
  return { secenekler: secilen };
}

function tarafAdiMetni(p: any): string {
  return p?.party_type === "individual"
    ? `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim()
    : String(p?.company_name ?? "").trim();
}

// Davet yazısının PDF'i. Türkçe karakter için client tarafındaki kanıtlanmış desen
// kullanılır: jsPDF + uzaktan yüklenen Roboto TTF, VFS'e gömülü. Font gömülemezse
// PDF ÜRETİLMEZ (bozuk karakterli ek gönderilmez) ve e-posta eksiz gider.
async function davetPdfBase64(satirlar: { baslik: string; govde: string[] }): Promise<string | null> {
  try {
    const { jsPDF } = await import("npm:jspdf@4.2.1");
    const res = await fetch("https://cdn.jsdelivr.net/gh/googlefonts/roboto@main/src/hinted/Roboto-Regular.ttf");
    if (!res.ok) {
      console.error("[randevu-teklif] PDF eki atlandı: font indirilemedi", res.status);
      return null;
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    const CH = 0x8000;
    for (let i = 0; i < buf.length; i += CH) bin += String.fromCharCode(...buf.subarray(i, i + CH));
    const fontB64 = btoa(bin);

    const doc = new (jsPDF as any)({ unit: "pt", format: "a4" });
    doc.addFileToVFS("Roboto-Regular.ttf", fontB64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.setFont("Roboto", "normal");

    const margin = 56;
    let y = 72;
    doc.setFontSize(14);
    doc.text(satirlar.baslik, margin, y);
    y += 28;
    doc.setFontSize(11);
    for (const satir of satirlar.govde) {
      const parcalar: string[] = doc.splitTextToSize(satir, 595 - margin * 2);
      for (const p of parcalar) {
        if (y > 780) { doc.addPage(); y = 72; }
        doc.text(p, margin, y);
        y += 16;
      }
      y += 4;
    }

    const out = new Uint8Array(doc.output("arraybuffer"));
    let pdfBin = "";
    for (let i = 0; i < out.length; i += CH) pdfBin += String.fromCharCode(...out.subarray(i, i + CH));
    return btoa(pdfBin);
  } catch (e) {
    console.error("[randevu-teklif] PDF eki üretilemedi", (e as any)?.message ?? e);
    return null;
  }
}

// Oturum davet yazısı: taraf davet/toplantı e-postalarıyla AYNI yol — Resend HTTP API
// ve RESEND_API_KEY (send-party-invite / send-meeting-invite ile aynı gönderici).
// Gizlilik: yazı yalnız künye (dosya no, konu başlığı, taraf adları, arabulucu adı) ve
// o tarafın kendi oturum bilgisini taşır; analiz, gizli kanal ve tutar içeriği girmez.
async function oturumDavetiGonder(
  admin: any,
  opts: { party: any; slot: Secenek; secenekler: any[]; caseId: string },
): Promise<boolean> {
  const { party, slot, secenekler, caseId } = opts;
  const email = String(party?.email ?? "").trim();
  if (!email) {
    console.error("[randevu-teklif] davet gönderilemedi: tarafın e-postası yok");
    return false;
  }
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.error("[randevu-teklif] davet gönderilemedi: RESEND_API_KEY yok");
    return false;
  }

  const ad = party?.party_type === "individual"
    ? `${party?.first_name ?? ""} ${party?.last_name ?? ""}`.trim()
    : String(party?.company_name ?? "").trim();
  const displayName = ad || "Sayın Taraf";

  // Oturum tipi/adres teklifin seçenek girdisinde saklanır.
  const kayit = (Array.isArray(secenekler) ? secenekler : []).find(
    (s: any) => String(s?.gun ?? "").slice(0, 10) === slot.gun && String(s?.saat ?? "").slice(0, 5) === slot.saat && s?.oturum_tipi,
  ) ?? (Array.isArray(secenekler) ? secenekler : []).find((s: any) => s?.oturum_tipi);
  const yuzYuze = kayit?.oturum_tipi === "yuz_yuze";
  const adres = String(kayit?.adres ?? "").trim();

  const when = new Date(`${slot.gun}T${slot.saat}:00+03:00`);
  const dateStr = when.toLocaleDateString("tr-TR", { timeZone: TZ, day: "numeric", month: "long", year: "numeric", weekday: "long" });
  const timeStr = slot.saat;

  // Video bağlantısı yalnız oturum ekranındaki mevcut akışta (oturum sahibinin
  // oturumuyla) üretilebiliyor; buradan üretilemediği için uydurma link yazılmaz.
  const yerSatiri = yuzYuze
    ? (adres ? `Görüşme adresi: ${adres.replace(/</g, "&lt;")}` : "Görüşme adresi arabulucunuz tarafından iletilecektir.")
    : "Görüşme çevrim içi yapılacaktır; katılım bağlantısı görüşme öncesi iletilecektir.";

  // Dosya künyesi: yalnız numara, konu başlığı, taraf ADLARI ve arabulucu adı.
  // Analiz, gizli kanal içeriği ve tutar bu yazıya giremez.
  const { data: dosya } = await admin.from("cases")
    .select("application_no, title, assigned_mediator_id, user_id").eq("id", caseId).maybeSingle();
  const { data: taraflar } = await admin.from("case_parties")
    .select("party_role, party_type, first_name, last_name, company_name").eq("case_id", caseId);
  const arabulucuId = takvimSahibi(dosya);
  const { data: profil } = arabulucuId
    ? await admin.from("profiles").select("full_name").eq("user_id", arabulucuId).maybeSingle()
    : { data: null };

  const basvuran = ((taraflar ?? []) as any[]).filter((p) => p.party_role === "applicant").map(tarafAdiMetni).filter(Boolean);
  const karsiTaraf = ((taraflar ?? []) as any[]).filter((p) => p.party_role === "respondent").map(tarafAdiMetni).filter(Boolean);
  const kunye: { etiket: string; deger: string }[] = [];
  if (dosya?.application_no) kunye.push({ etiket: "Dosya No", deger: String(dosya.application_no) });
  if (dosya?.title) kunye.push({ etiket: "Uyuşmazlık konusu", deger: String(dosya.title) });
  if (basvuran.length) kunye.push({ etiket: "Başvuran", deger: basvuran.join(", ") });
  if (karsiTaraf.length) kunye.push({ etiket: "Karşı taraf", deger: karsiTaraf.join(", ") });
  if (profil?.full_name) kunye.push({ etiket: "Arabulucu", deger: String(profil.full_name) });

  const esc = (t: string) => String(t).replace(/</g, "&lt;");
  const kunyeHtml = kunye.length
    ? `<p>${kunye.map((k) => `<strong>${esc(k.etiket)}:</strong> ${esc(k.deger)}`).join("<br>")}</p>`
    : "";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
    <p>Sayın ${esc(displayName)},</p>
    <p>Onayınızla aşağıdaki görüşme planlanmıştır.</p>
    ${kunyeHtml}
    <p><strong>Görüşme türü:</strong> Ön Görüşme<br>
       <strong>Tarih:</strong> ${dateStr}<br>
       <strong>Saat:</strong> ${timeStr}</p>
    <p>${yerSatiri}</p>
    <p>Saygılarımızla,<br>MediPact AI</p>
  </body></html>`;

  const pdfB64 = await davetPdfBase64({
    baslik: "GÖRÜŞME DAVETİ",
    govde: [
      `Sayın ${displayName},`,
      "Onayınızla aşağıdaki görüşme planlanmıştır.",
      ...kunye.map((k) => `${k.etiket}: ${k.deger}`),
      "Görüşme türü: Ön Görüşme",
      `Tarih: ${dateStr}`,
      `Saat: ${timeStr}`,
      yuzYuze
        ? (adres ? `Görüşme adresi: ${adres}` : "Görüşme adresi arabulucunuz tarafından iletilecektir.")
        : "Görüşme çevrim içi yapılacaktır; katılım bağlantısı görüşme öncesi iletilecektir.",
      "Saygılarımızla,",
      "MediPact AI",
    ],
  });

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "MİLAT Arabuluculuk <info@milatmediation.com>",
        to: [email],
        subject: "Görüşme daveti — Ön Görüşme",
        html,
        // PDF yalnız Türkçe fontla üretilebildiyse eklenir.
        ...(pdfB64 ? { attachments: [{ filename: "gorusme-daveti.pdf", content: pdfB64 }] } : {}),
      }),
    });
    if (!res.ok) {
      console.error("[randevu-teklif] Resend hatası", { status: res.status, body: (await res.text()).slice(0, 300) });
      return false;
    }
  } catch (e) {
    console.error("[randevu-teklif] davet gönderilemedi", (e as any)?.message ?? e);
    return false;
  }

  // Arabulucuya yalnız olay başlığı düşer; taraf verisi bildirime yazılmaz.
  try {
    const mediatorId = arabulucuId;
    if (mediatorId) {
      await admin.rpc("create_notification", {
        p_user_id: mediatorId,
        p_title: "Randevu onaylandı, davet gönderildi",
        p_message: "Randevu onaylandı, davet gönderildi.",
        p_type: "info",
        p_link: null,
      });
    }
  } catch (e) {
    console.error("[randevu-teklif] bildirim yazılamadı", (e as any)?.message ?? e);
  }

  return true;
}

// Arabulucu JWT'sini doğrular ve dosya yetkisini kontrol eder.
async function yetkiKontrol(req: Request, admin: any, supabaseUrl: string, anonKey: string, case_id: string, party_id: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { hata: json({ error: "Unauthorized" }, 401) };
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return { hata: json({ error: "oturum doğrulanamadı" }, 401) };

  if (!case_id || !party_id) return { hata: json({ error: "case_id ve party_id zorunlu" }, 400) };

  const { data: c } = await admin.from("cases")
    .select("id, assigned_mediator_id, user_id, application_no")
    .eq("id", case_id).maybeSingle();
  if (!c) return { hata: json({ error: "Dosya bulunamadı" }, 404) };

  const { data: roleRow } = await admin.from("user_roles")
    .select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
  const allowed = !!roleRow || (c as any).assigned_mediator_id === u.user.id || (c as any).user_id === u.user.id;
  if (!allowed) return { hata: json({ error: "Forbidden" }, 403) };

  const { data: p } = await admin.from("case_parties")
    .select("id, case_id, party_type, is_individual").eq("id", party_id).maybeSingle();
  if (!p || (p as any).case_id !== case_id) return { hata: json({ error: "Taraf bu dosyaya ait değil" }, 400) };

  // userId yalnız kimlik/yetki kaydıdır; takvim sahibi takvimSahibi(caseRow)'dan gelir.
  return { caseRow: c, party: p, userId: u.user.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action = String((body as any)?.action ?? "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    /* ---------- ÖNER — ajanın seçtiği saatler, yazma yok (kart önizlemesi) ---------- */
    if (action === "oner") {
      const case_id = String((body as any)?.case_id ?? "");
      const party_id = String((body as any)?.party_id ?? "");
      const k = await yetkiKontrol(req, admin, supabaseUrl, anonKey, case_id, party_id);
      if ((k as any).hata) return (k as any).hata;
      const { secenekler, hata, tanili } = await saatleriSec(admin, takvimSahibi((k as any).caseRow), (k as any).party);
      if (hata) return json({ error: hata, tanili });
      return json({ secenekler });
    }

    /* ---------- OLUŞTUR — arabulucu JWT'si zorunlu ---------- */
    if (action === "olustur") {
      const case_id = String((body as any)?.case_id ?? "");
      const party_id = String((body as any)?.party_id ?? "");
      const k = await yetkiKontrol(req, admin, supabaseUrl, anonKey, case_id, party_id);
      if ((k as any).hata) return (k as any).hata;

      // Saatleri sunucu seçer; yalnız "Düzenle" akışından gelen liste üste yazar.
      let secenekler: Secenek[];
      if ((body as any)?.secenekler !== undefined) {
        const override = normalizeSecenekler((body as any).secenekler);
        if (!override) return json({ error: "En az 1, en fazla 3 geçerli seçenek gerekir" }, 400);
        secenekler = override;
      } else {
        const r = await saatleriSec(admin, takvimSahibi((k as any).caseRow), (k as any).party);
        if (r.hata) return json({ error: r.hata, tanili: r.tanili });
        secenekler = r.secenekler;
      }

      const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
      const { error: insErr } = await admin.from("randevu_teklifleri").insert({
        case_id, party_id, token, secenekler, durum: "beklemede",
      } as any);
      if (insErr) return json({ error: insErr.message }, 500);

      // app_url yalnız izinli origin listesinden kabul edilir (açık yönlendirme kapalı).
      const allowedOrigins = (Deno.env.get("APP_ALLOWED_ORIGINS") ??
        "https://medipact-ai.lovable.app,https://id-preview--5ffedb1b-4087-4fe1-a1ef-873c9754f71d.lovable.app")
        .split(",").map((s) => s.trim()).filter(Boolean);
      let baseUrl = allowedOrigins[0];
      const appUrl = (body as any)?.app_url;
      if (appUrl && typeof appUrl === "string") {
        try {
          const parsed = new URL(appUrl);
          const origin = `${parsed.protocol}//${parsed.host}`;
          if (allowedOrigins.includes(origin)) baseUrl = origin;
        } catch { /* geçersiz URL -> varsayılan */ }
      }
      return json({ token, link: `${baseUrl}/randevu/${token}`, secenekler });
    }

    /* ---------- GETİR — yalnız token ---------- */
    if (action === "getir") {
      const token = String((body as any)?.token ?? "");
      if (!token || token.length < 16) return json({ error: "gecersiz" }, 404);

      const { data: row } = await admin.from("randevu_teklifleri")
        .select("id, durum, secenekler, party_id, case_id")
        .eq("token", token).maybeSingle();
      if (!row) return json({ error: "gecersiz" }, 404);
      if ((row as any).durum !== "beklemede") return json({ durum: (row as any).durum });

      const { data: party } = await admin.from("case_parties")
        .select("party_type, first_name, last_name, company_name")
        .eq("id", (row as any).party_id).maybeSingle();
      const { data: c } = await admin.from("cases").select("title").eq("id", (row as any).case_id).maybeSingle();

      const taraf_adi = (party as any)?.party_type === "individual"
        ? `${(party as any)?.first_name ?? ""} ${(party as any)?.last_name ?? ""}`.trim()
        : ((party as any)?.company_name ?? "");

      // Taraf adı ve dosya başlığı dışında hiçbir dosya verisi dönmez.
      return json({
        durum: "beklemede",
        secenekler: (row as any).secenekler ?? [],
        taraf_adi: taraf_adi || null,
        dosya_basligi: (c as any)?.title ?? null,
      });
    }

    /* ---------- CEVAPLA — yalnız token, tek sefer ---------- */
    if (action === "cevapla") {
      const token = String((body as any)?.token ?? "");
      const secimRaw = String((body as any)?.secim ?? "").trim();
      if (!token || token.length < 16) return json({ error: "gecersiz" }, 404);
      if (!secimRaw) return json({ error: "secim zorunlu" }, 400);

      const { data: row } = await admin.from("randevu_teklifleri")
        .select("id, durum, secenekler, case_id, party_id").eq("token", token).maybeSingle();
      if (!row) return json({ error: "gecersiz" }, 404);
      if ((row as any).durum !== "beklemede") return json({ error: "cevaplanmis" }, 409);

      const secenekler = Array.isArray((row as any).secenekler) ? (row as any).secenekler : [];
      const gecerli = new Set<string>(["uygun", "uymuyor"]);
      for (const s of secenekler) {
        gecerli.add(`${String((s as any)?.gun ?? "").slice(0, 10)} ${String((s as any)?.saat ?? "").slice(0, 5)}`);
      }
      if (!gecerli.has(secimRaw)) return json({ error: "secim gecersiz" }, 400);

      // Yarış durumunda ikinci cevabın yazılmaması için koşul update'in içinde.
      const { data: updated, error: updErr } = await admin.from("randevu_teklifleri")
        .update({ durum: "cevaplandi", secilen: secimRaw, cevap_zamani: new Date().toISOString() } as any)
        .eq("token", token).eq("durum", "beklemede").select("id");
      if (updErr) return json({ error: updErr.message }, 500);
      if (!updated || updated.length === 0) return json({ error: "cevaplanmis" }, 409);

      // "Uymuyor" dışındaki cevaplarda saat bağlanır: Aşama 5'teki "Yeni Seans Planla"
      // ekranıyla aynı düzende case_sessions satırı açılır. Bu adım hata verse bile
      // tarafın cevabı kayıtlı kalır — hata yalnız fonksiyon loguna düşer.
      let davetGonderildi: boolean | null = null;
      if (secimRaw !== "uymuyor") {
        try {
          const secilenSlot: Secenek | null = secimRaw === "uygun"
            ? (secenekler[0] ? { gun: String(secenekler[0].gun).slice(0, 10), saat: String(secenekler[0].saat).slice(0, 5) } : null)
            : (() => {
              const [gun, saat] = secimRaw.split(" ");
              return GUN_RE.test(gun ?? "") && SAAT_RE.test(saat ?? "") ? { gun, saat } : null;
            })();

          if (!secilenSlot) {
            console.error("[randevu-teklif] oturum açılamadı: seçilen saat çözülemedi", { secimRaw });
            davetGonderildi = false;
          } else {
            const { data: p } = await admin.from("case_parties")
              .select("id, user_id, party_role, party_type, first_name, last_name, company_name, email")
              .eq("id", (row as any).party_id).maybeSingle();
            // Türkiye saati sabit UTC+3 (yaz saati uygulaması yok).
            const scheduledAt = new Date(`${secilenSlot.gun}T${secilenSlot.saat}:00+03:00`).toISOString();
            const { error: sesErr } = await admin.from("case_sessions").insert({
              case_id: (row as any).case_id,
              session_type: "preliminary",
              scheduled_at: scheduledAt,
              notes: null,
              status: "scheduled",
              participants: p
                ? [{ party_id: (p as any).id, user_id: (p as any).user_id, role: (p as any).party_role }]
                : [],
            } as any);
            if (sesErr) console.error("[randevu-teklif] oturum kaydı yazılamadı", sesErr.message);

            // Oturum davet yazısı: gönderim hatası cevabı ve oturum kaydını etkilemez.
            davetGonderildi = await oturumDavetiGonder(admin, {
              party: p,
              slot: secilenSlot,
              secenekler,
              caseId: String((row as any).case_id ?? ""),
            });
          }
        } catch (e) {
          console.error("[randevu-teklif] oturum kaydı sırasında hata", (e as any)?.message ?? e);
          davetGonderildi = false;
        }
      }

      return davetGonderildi === null ? json({ ok: true }) : json({ ok: true, davet_gonderildi: davetGonderildi });
    }

    return json({ error: "Bilinmeyen eylem" }, 400);
  } catch (e: any) {
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
