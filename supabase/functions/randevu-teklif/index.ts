// Randevu teklifi: saatleri sunucu seçer, taraf token'lı girişsiz sayfadan cevaplar.
// Kör veri ilkesi: "getir" yalnız seçenekleri, taraf adını ve dosya başlığını döner;
// token'ı bilmeyen hiçbir istek hiçbir veri alamaz.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

/* ── İLETİŞİM TERCİHİ SÜZGECİ (İBA 1.5, 1. tur) ───────────────────────────────
   Taraf kendi ekranından bildirim sıklığını ve sessiz saatlerini belirler
   (public.iletisim_tercihleri, UNIQUE party_id). Bu süzgeç YALNIZ "gönderilsin mi"
   kararını verir — e-posta metinlerine, konularına ve alıcılarına DOKUNMAZ.
     · her_adim (varsayılan) → hepsi gider.
     · onemli                → yalnız ÖNEMLİ türler gider.
     · haftalik_ozet         → yalnız ZAMANA BAĞLI türler gider (davet / değişiklik).
     · sessiz saat           → o aralıkta gönderilmez; ZAMANA BAĞLI türler istisnadır.
   FAIL-OPEN (kritik): party_id bilinmiyorsa, kayıt yoksa ya da sorgu hata verirse
   E-POSTA GÖNDERİLİR. Bir tercih sorgusu arızası oturum davetini susturamaz;
   tercih kaydı olmayan tarafta mevcut davranış birebir korunur.
   ERTELEME YOK (1. tur kararı): sessiz saate denk gelen bildirim kuyruğa alınmaz,
   atlanır ve sebebi dönüş gövdesine/ajan kaydına yazılır. Kuyruk 2. turda. */
type BildirimTuru =
  | "oturum_daveti" | "oturum_degisikligi" | "teklif" | "belge_talebi"
  | "surec_sonu" | "hatirlatma" | "bilgilendirme";
// Zamana bağlı: geciktirilemez. Sessiz saatte ve "haftalık özet" seçiliyken de gider.
const ZAMANA_BAGLI_TURLER: string[] = ["oturum_daveti", "oturum_degisikligi"];
const ONEMLI_TURLER: string[] = [
  ...ZAMANA_BAGLI_TURLER, "teklif", "belge_talebi", "surec_sonu",
];
const TERCIH_SAAT_DILIMI = "Europe/Istanbul";

/* Sessiz aralık kontrolü. Edge fonksiyon UTC'de koşar; karşılaştırma TÜRKİYE
   saatiyle yapılır (17.08 föy dersi: elle saat farkı eklenmez, Intl'e bırakılır).
   Gece devreden aralık (22:00–08:00) da doğru hesaplanır. */
function sessizSaatteMi(baslangic: unknown, bitis: unknown): boolean {
  const b = String(baslangic ?? "").slice(0, 5);
  const s = String(bitis ?? "").slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(b) || !/^\d{2}:\d{2}$/.test(s) || b === s) return false;
  const simdi = new Date().toLocaleTimeString("tr-TR", {
    timeZone: TERCIH_SAAT_DILIMI, hour: "2-digit", minute: "2-digit", hour12: false,
  }).slice(0, 5);
  return b < s ? (simdi >= b && simdi < s) : (simdi >= b || simdi < s);
}

async function gonderilsinMi(
  admin: any, partyId: string | null | undefined, tur: BildirimTuru,
): Promise<{ gonder: boolean; sebep: string }> {
  if (!partyId) return { gonder: true, sebep: "taraf kaydı yok → varsayılan gönderim" };
  try {
    const { data, error } = await admin.from("iletisim_tercihleri")
      .select("siklik, sessiz_baslangic, sessiz_bitis")
      .eq("party_id", partyId).maybeSingle();
    if (error || !data) return { gonder: true, sebep: "tercih kaydı yok → her_adim" };
    const siklik = String((data as any).siklik ?? "her_adim");
    const zamanaBagli = ZAMANA_BAGLI_TURLER.includes(tur);
    if (siklik === "onemli" && !ONEMLI_TURLER.includes(tur)) {
      return { gonder: false, sebep: `tercih 'yalnız önemli adımlar' — '${tur}' önemli listede değil` };
    }
    if (siklik === "haftalik_ozet" && !zamanaBagli) {
      return { gonder: false, sebep: `tercih 'haftalık özet' — '${tur}' zamana bağlı değil` };
    }
    if (!zamanaBagli && sessizSaatteMi((data as any).sessiz_baslangic, (data as any).sessiz_bitis)) {
      return { gonder: false, sebep: "sessiz saat aralığı — 1. turda erteleme yok, atlandı" };
    }
    return { gonder: true, sebep: "tercihe uygun" };
  } catch (e: any) {
    return { gonder: true, sebep: `tercih okunamadı (${String(e?.message ?? e).slice(0, 80)}) → gönderildi` };
  }
}


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
// İç çağrı kapısı: nöbetçi bu başlıkla çağırır, kullanıcı JWT'si aranmaz.
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

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

// Taraf ajanıyla eşleşme (14.08): tarafın KENDİ müsaitliği (taraf_musaitlik) önce okunur.
// Arabulucunun boş saatlerinden tarafın aralığına düşenler varsa teklif ÖNCE onlardan
// kurulur; taraf müsaitlik girmemişse veya hiçbiri uymuyorsa arabulucunun takvimi aynen
// kullanılır. Okuma service role ile (taraf_musaitlik RLS'i tarafa özeldir); hata
// hâlinde eşleşme yok sayılır ve eski davranış sürer.
async function tarafaUyanSaatler(admin: any, partyId: string, bos: Secenek[]): Promise<Secenek[]> {
  if (!partyId || bos.length === 0) return [];
  try {
    const { data: araliklar, error } = await admin.from("taraf_musaitlik")
      .select("gun, baslangic, bitis").eq("party_id", partyId).limit(500);
    if (error) {
      console.error("[randevu-teklif] taraf_musaitlik okunamadı (öneri)", error.message);
      return [];
    }
    const satirlar = (araliklar ?? []) as any[];
    if (satirlar.length === 0) return [];
    return bos.filter((s) => satirlar.some((a) =>
      String(a.gun).slice(0, 10) === s.gun &&
      s.saat >= String(a.baslangic).slice(0, 5) &&
      s.saat < String(a.bitis).slice(0, 5)
    ));
  } catch (e) {
    console.error("[randevu-teklif] taraf müsaitliği okunamadı", (e as any)?.message ?? e);
    return [];
  }
}

// Taraf ajanının panosundaki alternatif saat kaydı (gorev_tipi='taraf_alternatif_saat',
// durum='bekliyor'). Kayıt tarafın KENDİ aralıklarından üretilir; panoya yalnız saatler
// yazılır, tarafın başka hiçbir verisi geçmez. Arabulucunun takviminde de boş olan
// saatler seçilir; kayıt yoksa boş liste döner ve akış eskisi gibi sürer.
async function panodakiAlternatifSaatler(
  admin: any, partyId: string, bos: Secenek[],
): Promise<{ secenekler: Secenek[]; gorevId?: string }> {
  if (!partyId || bos.length === 0) return { secenekler: [] };
  try {
    const { data, error } = await admin.from("ajan_gorevleri")
      .select("id, sonuc, created_at")
      .eq("gorev_tipi", "taraf_alternatif_saat")
      .eq("hedef_party_id", partyId)
      .eq("durum", "bekliyor")
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) {
      console.error("[randevu-teklif] alternatif saatler okunamadı", error.message);
      return { secenekler: [] };
    }
    const bosAnahtar = new Set(bos.map((s) => `${s.gun}|${s.saat}`));
    for (const row of (data ?? []) as any[]) {
      let liste: any[] = [];
      try { liste = JSON.parse(String(row?.sonuc ?? "")).alternatifler ?? []; } catch { liste = []; }
      const uygun = liste
        .map((a: any) => ({ gun: String(a?.gun ?? "").slice(0, 10), saat: String(a?.saat ?? "").slice(0, 5) }))
        .filter((a: Secenek) => a.gun && a.saat && bosAnahtar.has(`${a.gun}|${a.saat}`));
      if (uygun.length > 0) return { secenekler: uygun, gorevId: String(row.id) };
    }
    return { secenekler: [] };
  } catch (e) {
    console.error("[randevu-teklif] alternatif saat okuması başarısız", (e as any)?.message ?? e);
    return { secenekler: [] };
  }
}

async function saatleriSec(admin: any, mediatorId: string, party: any): Promise<{ secenekler: Secenek[]; hata?: string; tanili?: any; taraf_musaitligi_kullanildi?: boolean; alternatiften_secildi?: boolean }> {
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

  // Taraf ajanının panoya yazdığı ALTERNATİF saatler varsa önce onlar denenir
  // (Tur B): taraf önceki teklife "uymuyor" demek yerine kendi aralıklarından üç
  // saat önermiş olur. Arabulucunun takviminde de boş olan ilk eşleşme kullanılır.
  const alternatif = await panodakiAlternatifSaatler(admin, String(party?.id ?? ""), bos);
  if (alternatif.secenekler.length > 0) {
    const secilenAlt = alternatif.secenekler.slice(0, 3);
    if (alternatif.gorevId) {
      await admin.from("ajan_gorevleri")
        .update({ durum: "yapildi", sonuc: `Alternatif saat teklife dönüştü: ${secilenAlt.map((s) => `${s.gun} ${s.saat}`).join(" · ")}` })
        .eq("id", alternatif.gorevId);
    }
    const bireyselAlt = party?.is_individual === true || party?.party_type === "individual";
    return {
      secenekler: bireyselAlt ? [secilenAlt[0]] : secilenAlt,
      taraf_musaitligi_kullanildi: true,
      alternatiften_secildi: true,
    };
  }

  // Önce tarafın kendi müsaitliğine düşen saatler; yoksa arabulucunun boş saatleri.
  const uyan = await tarafaUyanSaatler(admin, String(party?.id ?? ""), bos);
  const tarafEslesti = uyan.length > 0;
  const havuz = tarafEslesti ? uyan : bos;

  const bireysel = party?.is_individual === true || party?.party_type === "individual";
  if (bireysel) return { secenekler: [havuz[0]], taraf_musaitligi_kullanildi: tarafEslesti };

  // Kurumsal: en yakın 3 FARKLI günden birer seçenek.
  const secilen: Secenek[] = [];
  const gunler = new Set<string>();
  for (const s of havuz) {
    if (gunler.has(s.gun)) continue;
    gunler.add(s.gun);
    secilen.push(s);
    if (secilen.length === 3) break;
  }
  return { secenekler: secilen, taraf_musaitligi_kullanildi: tarafEslesti };
}

// E-posta ve PDF imzası: dosyanın arabulucusunun adı, "Arb." önekiyle. Ad yoksa
// eski imza (MediPact AI) yedek kalır — imza boş bırakılmaz.
const IMZA_NOTU = "Bu ileti MediPact AI aracılığıyla gönderilmiştir.";
function imzaMetni(fullName: unknown): string {
  const ad = String(fullName ?? "").trim();
  if (!ad) return "MediPact AI";
  return /^arb\.?\s/i.test(ad) ? ad : `Arb. ${ad}`;
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
  opts: { party: any; slot: Secenek; secenekler: any[]; caseId: string; videoLink?: string | null },
): Promise<boolean> {
  const { party, slot, secenekler, caseId, videoLink } = opts;
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
  const link = String(videoLink ?? "").trim();
  const yerSatiri = yuzYuze
    ? (adres ? `Görüşme adresi: ${adres.replace(/</g, "&lt;")}` : "Görüşme adresi arabulucunuz tarafından iletilecektir.")
    : (link
      ? `Görüşme bağlantısı: <a href="${link}">${link.replace(/</g, "&lt;")}</a>`
      : "Görüşme çevrim içi yapılacaktır; katılım bağlantısı görüşme öncesi iletilecektir.");
  const yerSatiriDuz = yuzYuze
    ? (adres ? `Görüşme adresi: ${adres}` : "Görüşme adresi arabulucunuz tarafından iletilecektir.")
    : (link ? `Görüşme bağlantısı: ${link}` : "Görüşme çevrim içi yapılacaktır; katılım bağlantısı görüşme öncesi iletilecektir.");

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

  const davetImzasi = imzaMetni((profil as any)?.full_name);
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
    <p>Saygılarımızla,<br>${esc(davetImzasi)}</p>
    <p style="font-size:12px;color:#666">${IMZA_NOTU}</p>
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
      yerSatiriDuz,
      "Saygılarımızla,",
      davetImzasi,
      IMZA_NOTU,
    ],
  });

  /* İLETİŞİM TERCİHİ (İBA 1.5): oturum daveti ZAMANA BAĞLIDIR — her sıklık
     seçeneğinde ve sessiz saatte de gider. */
  const izinDavet = await gonderilsinMi(admin, party?.id, "oturum_daveti");
  if (!izinDavet.gonder) {
    console.log(`[randevu-teklif] davet atlandı — iletişim tercihi: ${izinDavet.sebep}`);
    return false;
  }

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

// Teklif e-postası: yalnız iç çağrıyla (nöbetçi) oluşturulan tekliflerde gider.
// Davet yazısıyla aynı yol (Resend + RESEND_API_KEY) ve aynı üslup; künye ve o tarafın
// kendi seçenekleri dışında hiçbir veri, karşı tarafa ait hiçbir bilgi geçmez.
async function teklifEpostasiGonder(
  admin: any,
  opts: { caseId: string; partyId: string; secenekler: Secenek[]; link: string },
): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.error("[randevu-teklif] teklif e-postası gönderilemedi: RESEND_API_KEY yok");
    return false;
  }
  const { data: party } = await admin.from("case_parties")
    .select("party_type, first_name, last_name, company_name, email")
    .eq("id", opts.partyId).maybeSingle();
  const email = String((party as any)?.email ?? "").trim();
  if (!email) {
    console.error("[randevu-teklif] teklif e-postası gönderilemedi: tarafın e-postası yok");
    return false;
  }
  const ad = (party as any)?.party_type === "individual"
    ? `${(party as any)?.first_name ?? ""} ${(party as any)?.last_name ?? ""}`.trim()
    : String((party as any)?.company_name ?? "").trim();
  const displayName = ad || "Sayın Taraf";

  /* İLETİŞİM TERCİHİ (İBA 1.5): randevu saati önerisi oturumun kurulmasına bağlıdır
     ve geciktirilemez — "oturum_daveti" sınıfındadır. */
  const izinTeklif = await gonderilsinMi(admin, opts.partyId, "oturum_daveti");
  if (!izinTeklif.gonder) {
    console.log(`[randevu-teklif] teklif e-postası atlandı — iletişim tercihi: ${izinTeklif.sebep}`);
    return false;
  }

  const { data: dosya } = await admin.from("cases")
    .select("application_no, title, assigned_mediator_id, user_id").eq("id", opts.caseId).maybeSingle();

  // İmza: dosyanın arabulucusunun adı (profiles), yoksa MediPact AI.
  const arabulucuId = takvimSahibi(dosya);
  const { data: profil } = arabulucuId
    ? await admin.from("profiles").select("full_name").eq("user_id", arabulucuId).maybeSingle()
    : { data: null };
  const imza = imzaMetni((profil as any)?.full_name);

  const esc = (t: string) => String(t).replace(/</g, "&lt;");
  const kunye: string[] = [];
  if ((dosya as any)?.application_no) kunye.push(`<strong>Dosya No:</strong> ${esc((dosya as any).application_no)}`);
  if ((dosya as any)?.title) kunye.push(`<strong>Uyuşmazlık konusu:</strong> ${esc((dosya as any).title)}`);

  const saatler = opts.secenekler.map((s) => {
    const when = new Date(`${s.gun}T${s.saat}:00+03:00`);
    const dateStr = when.toLocaleDateString("tr-TR", { timeZone: TZ, day: "numeric", month: "long", year: "numeric", weekday: "long" });
    return `<li>${esc(dateStr)} · ${esc(s.saat)}</li>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
    <p>Sayın ${esc(displayName)},</p>
    <p>Arabuluculuk sürecinizde görüşme için aşağıdaki saat${opts.secenekler.length > 1 ? "ler" : ""} önerilmiştir.</p>
    ${kunye.length ? `<p>${kunye.join("<br>")}</p>` : ""}
    <ul>${saatler}</ul>
    <p>Uygunluğunuzu tek dokunuşla bildirin:<br><a href="${opts.link}">${esc(opts.link)}</a></p>
    <p>Saygılarımızla,<br>${esc(imza)}</p>
    <p style="font-size:12px;color:#666">${IMZA_NOTU}</p>
  </body></html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "MİLAT Arabuluculuk <info@milatmediation.com>",
        to: [email],
        subject: "Görüşme saati önerisi",
        html,
      }),
    });
    if (!res.ok) {
      console.error("[randevu-teklif] teklif e-postası Resend hatası", { status: res.status, body: (await res.text()).slice(0, 300) });
      return false;
    }
    return true;
  } catch (e) {
    console.error("[randevu-teklif] teklif e-postası gönderilemedi", (e as any)?.message ?? e);
    return false;
  }
}

// Cevabın işlenmesi — TEK kod yolu: hem tarafın girişsiz sayfadan verdiği cevap, hem de
// otomatik onay bu fonksiyondan geçer (durum=cevaplandi, oturum kaydı, davet yazısı).
async function cevaplaIsle(admin: any, token: string, secimRaw: string): Promise<{ status: number; body: any }> {
  const { data: row } = await admin.from("randevu_teklifleri")
    .select("id, durum, secenekler, case_id, party_id").eq("token", token).maybeSingle();
  if (!row) return { status: 404, body: { error: "gecersiz" } };
  if ((row as any).durum !== "beklemede") return { status: 409, body: { error: "cevaplanmis" } };

  const secenekler = Array.isArray((row as any).secenekler) ? (row as any).secenekler : [];
  const gecerli = new Set<string>(["uygun", "uymuyor"]);
  for (const s of secenekler) {
    gecerli.add(`${String((s as any)?.gun ?? "").slice(0, 10)} ${String((s as any)?.saat ?? "").slice(0, 5)}`);
  }
  if (!gecerli.has(secimRaw)) return { status: 400, body: { error: "secim gecersiz" } };

  // Yarış durumunda ikinci cevabın yazılmaması için koşul update'in içinde.
  const { data: updated, error: updErr } = await admin.from("randevu_teklifleri")
    .update({ durum: "cevaplandi", secilen: secimRaw, cevap_zamani: new Date().toISOString() } as any)
    .eq("token", token).eq("durum", "beklemede").select("id");
  if (updErr) return { status: 500, body: { error: updErr.message } };
  if (!updated || updated.length === 0) return { status: 409, body: { error: "cevaplanmis" } };

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
        // Özel oturum (caucus): teklif seçeneklerinde ozel_oturum işareti varsa oturum
        // mevcut "private" tipiyle açılır — yeni bir tip veya sütun eklenmedi. Bu tip
        // zaten özel görüşme olarak tanınır ve notları yalnız katılımcısına + arabulucuya
        // görünür (MeetingNotesPanel). Karşı tarafa hiçbir yüzeyden açılmaz.
        const ozelOturum = (Array.isArray(secenekler) ? secenekler : [])
          .some((s: any) => (s as any)?.ozel_oturum === true);
        const { data: yeniOturum, error: sesErr } = await admin.from("case_sessions").insert({
          case_id: (row as any).case_id,
          session_type: ozelOturum ? "private" : "preliminary",
          scheduled_at: scheduledAt,
          notes: null,
          status: "scheduled",
          participants: p
            ? [{ party_id: (p as any).id, user_id: (p as any).user_id, role: (p as any).party_role }]
            : [],
        } as any).select("id").maybeSingle();
        if (sesErr) console.error("[randevu-teklif] oturum kaydı yazılamadı", sesErr.message);

        // Çevrim içi görüşmede (oturum_tipi yoksa da çevrim içi sayılır) video odası
        // hemen iç kapıdan üretilir; link oturuma yazılır ve davet yazısına girer.
        // Yüz yüze görüşmede link üretilmez. Hata olursa davet linksiz gider.
        const secilenKayit = (Array.isArray(secenekler) ? secenekler : []).find(
          (s: any) => String(s?.gun ?? "").slice(0, 10) === secilenSlot.gun &&
                      String(s?.saat ?? "").slice(0, 5) === secilenSlot.saat,
        );
        const yuzYuzeSecim = (secilenKayit as any)?.oturum_tipi === "yuz_yuze";
        let videoLink: string | null = null;
        if (!yuzYuzeSecim && (yeniOturum as any)?.id && CRON_SECRET) {
          try {
            const vRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-video-room`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-cron-secret": CRON_SECRET,
                apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
              },
              body: JSON.stringify({ sessionId: (yeniOturum as any).id }),
            });
            const vBody = await vRes.json().catch(() => ({}));
            const url = String((vBody as any)?.room_url ?? "").trim();
            if (vRes.ok && url) {
              videoLink = url;
              const { data: guncel } = await admin.from("case_sessions")
                .select("video_link").eq("id", (yeniOturum as any).id).maybeSingle();
              if (!String((guncel as any)?.video_link ?? "").trim()) {
                await admin.from("case_sessions").update({ video_link: url }).eq("id", (yeniOturum as any).id);
              }
            } else {
              console.error("[randevu-teklif] video odası üretilemedi", vRes.status, String((vBody as any)?.error ?? "").slice(0, 200));
            }
          } catch (e) {
            console.error("[randevu-teklif] video odası çağrısı başarısız", (e as any)?.message ?? e);
          }
        }

        // Oturum davet yazısı: gönderim hatası cevabı ve oturum kaydını etkilemez.
        davetGonderildi = await oturumDavetiGonder(admin, {
          party: p,
          slot: secilenSlot,
          secenekler,
          caseId: String((row as any).case_id ?? ""),
          videoLink,
        });
      }
    } catch (e) {
      console.error("[randevu-teklif] oturum kaydı sırasında hata", (e as any)?.message ?? e);
      davetGonderildi = false;
    }
  }

  return {
    status: 200,
    body: davetGonderildi === null ? { ok: true } : { ok: true, davet_gonderildi: davetGonderildi },
  };
}

// Otomatik onay eşleştirmesi: taraf otomatik onayı açtıysa ve önerilen saatlerden biri
// kendi müsaitlik aralığına düşüyorsa o saat döner. Okumalar service role ile yapılır
// (taraf_musaitlik RLS'i tarafa özeldir). Hata durumunda eşleşme yok sayılır.
async function otomatikOnayEslesmesi(admin: any, partyId: string, secenekler: Secenek[]): Promise<Secenek | null> {
  try {
    const { data: p, error: pErr } = await admin.from("case_parties")
      .select("otomatik_onay").eq("id", partyId).maybeSingle();
    if (pErr) {
      console.error("[randevu-teklif] otomatik_onay okunamadı", pErr.message);
      return null;
    }
    if ((p as any)?.otomatik_onay !== true) return null;

    const { data: araliklar, error: mErr } = await admin.from("taraf_musaitlik")
      .select("gun, baslangic, bitis").eq("party_id", partyId).limit(500);
    if (mErr) {
      console.error("[randevu-teklif] taraf_musaitlik okunamadı", mErr.message);
      return null;
    }
    for (const s of secenekler) {
      const uyan = ((araliklar ?? []) as any[]).some((a) =>
        String(a.gun).slice(0, 10) === s.gun &&
        s.saat >= String(a.baslangic).slice(0, 5) &&
        s.saat < String(a.bitis).slice(0, 5)
      );
      if (uyan) return s;
    }
    return null;
  } catch (e) {
    console.error("[randevu-teklif] otomatik onay eşleştirmesi başarısız", (e as any)?.message ?? e);
    return null;
  }
}

// Arabulucu JWT'sini doğrular ve dosya yetkisini kontrol eder.
// isCron=true (geçerli x-cron-secret) ise çağıran sistemin kendisidir: JWT ve dosya
// erişim kontrolü atlanır, dosya/taraf tutarlılığı yine doğrulanır.
async function yetkiKontrol(
  req: Request, admin: any, supabaseUrl: string, anonKey: string,
  case_id: string, party_id: string, isCron = false,
) {
  let userId: string | null = null;
  if (!isCron) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return { hata: json({ error: "Unauthorized" }, 401) };
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return { hata: json({ error: "oturum doğrulanamadı" }, 401) };
    userId = u.user.id;
  }

  if (!case_id || !party_id) return { hata: json({ error: "case_id ve party_id zorunlu" }, 400) };

  const { data: c } = await admin.from("cases")
    .select("id, assigned_mediator_id, user_id, application_no")
    .eq("id", case_id).maybeSingle();
  if (!c) return { hata: json({ error: "Dosya bulunamadı" }, 404) };

  if (!isCron) {
    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    const allowed = !!roleRow || (c as any).assigned_mediator_id === userId || (c as any).user_id === userId;
    if (!allowed) return { hata: json({ error: "Forbidden" }, 403) };
  }

  const { data: p } = await admin.from("case_parties")
    .select("id, case_id, party_type, is_individual").eq("id", party_id).maybeSingle();
  if (!p || (p as any).case_id !== case_id) return { hata: json({ error: "Taraf bu dosyaya ait değil" }, 400) };

  // userId yalnız kimlik/yetki kaydıdır; takvim sahibi takvimSahibi(caseRow)'dan gelir.
  return { caseRow: c, party: p, userId };
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
      const isCron = !!CRON_SECRET && req.headers.get("x-cron-secret") === CRON_SECRET;
      const k = await yetkiKontrol(req, admin, supabaseUrl, anonKey, case_id, party_id, isCron);
      if ((k as any).hata) return (k as any).hata;
      const { secenekler, hata, tanili, taraf_musaitligi_kullanildi, alternatiften_secildi } =
        await saatleriSec(admin, takvimSahibi((k as any).caseRow), (k as any).party);
      if (hata) return json({ error: hata, tanili });
      return json({
        secenekler,
        taraf_musaitligi_kullanildi: !!taraf_musaitligi_kullanildi,
        alternatiften_secildi: !!alternatiften_secildi,
      });
    }

    /* ---------- OLUŞTUR — arabulucu JWT'si veya iç çağrı (x-cron-secret) ---------- */
    if (action === "olustur") {
      const case_id = String((body as any)?.case_id ?? "");
      const party_id = String((body as any)?.party_id ?? "");
      // Boş/yanlış secret'ta iç çağrı sayılmaz; mevcut JWT yolu aynen işler.
      const isCron = !!CRON_SECRET && req.headers.get("x-cron-secret") === CRON_SECRET;
      const k = await yetkiKontrol(req, admin, supabaseUrl, anonKey, case_id, party_id, isCron);
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
      const link = `${baseUrl}/randevu/${token}`;

      // Otomatik onay: taraf açtıysa ve önerilen saat kendi müsaitliğine düşüyorsa teklif
      // anında uygun sayılır — cevap yolu TEK: cevaplaIsle (oturum + davet yazısı).
      // Bu durumda tarafa ayrıca teklif linki maili gönderilmez.
      const eslesen = await otomatikOnayEslesmesi(admin, party_id, secenekler);
      if (eslesen) {
        // Listede otomatik onaylandığı anlaşılsın diye seçenek girdisine işaret konur.
        const isaretli = secenekler.map((s) =>
          s.gun === eslesen.gun && s.saat === eslesen.saat ? { ...s, otomatik_onay: true } : s
        );
        await admin.from("randevu_teklifleri").update({ secenekler: isaretli } as any).eq("token", token);
        const r = await cevaplaIsle(admin, token, `${eslesen.gun} ${eslesen.saat}`);
        return json({
          token, link, secenekler: isaretli,
          otomatik_onay: r.status === 200,
          davet_gonderildi: (r.body as any)?.davet_gonderildi ?? null,
          ...(r.status !== 200 ? { onay_hatasi: (r.body as any)?.error ?? null } : {}),
        });
      }

      // E-posta yalnız iç çağrıda gider; ekrandan oluşturmada link ekranda kalır.
      // Gönderim hatası teklifi düşürmez, yalnız loga geçer.
      if (isCron) {
        const epostaGitti = await teklifEpostasiGonder(admin, { caseId: case_id, partyId: party_id, secenekler, link });
        return json({ token, link, secenekler, eposta_gonderildi: epostaGitti });
      }
      return json({ token, link, secenekler });
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
      const r = await cevaplaIsle(admin, token, secimRaw);
      return json(r.body, r.status);
    }

    return json({ error: "Bilinmeyen eylem" }, 400);
  } catch (e: any) {
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
