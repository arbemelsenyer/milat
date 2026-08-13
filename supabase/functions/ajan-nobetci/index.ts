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

// Türkiye saati sabit UTC+3 (yaz saati uygulaması yok). Saat dilimi adı yerine sabit
// kayma kullanılır — teklif kayıtlarındaki gun/saat de Türkiye saatidir.
const TR_OFFSET_MS = 3 * 60 * 60 * 1000;

// UTC ISO değerini Türkiye saatine çevirip "YYYY-MM-DD" ve "HH:MM" döndürür.
function trGunSaat(iso: string): { gun: string; saat: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { gun: "", saat: "" };
  const tr = new Date(d.getTime() + TR_OFFSET_MS);
  const gun = tr.toISOString().slice(0, 10);
  const saat = tr.toISOString().slice(11, 16);
  return { gun, saat };
}

// Dosyanın arabulucusu: assigned_mediator_id doluysa o, boşsa cases.user_id.
// (randevu-teklif'teki aynı adlı yardımcının bu dosyadaki karşılığı — burada da
// tanımlı olmadığı için e-posta hattı ReferenceError veriyordu.)
function takvimSahibi(caseRow: any): string {
  return caseRow?.assigned_mediator_id ?? caseRow?.user_id ?? "";
}

// Türkçe uzun tarih metni ("18 Ağustos 2026 Salı") — TR gün değerinden üretilir.
const TR_AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const TR_GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
function trTarihMetni(gun: string): string {
  const [y, m, g] = String(gun).split("-").map((x) => Number(x));
  if (!y || !m || !g) return gun;
  const d = new Date(Date.UTC(y, m - 1, g));
  return `${g} ${TR_AYLAR[m - 1]} ${y} ${TR_GUNLER[d.getUTCDay()]}`;
}

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

// analiz_baslat görevi: "Tüm Analizi Başlat" düğmesinin çağırdığı orchestrator-run,
// iç kapıdan (x-cron-secret) tetiklenir. Analiz sonucu oluşmuşsa veya orkestratör
// zaten koşuyorsa görev atlanır.
async function analizBaslat(admin: any, caseId: string): Promise<{ durum: string; sonuc: string }> {
  const { data: analizler, error: aErr } = await admin.from("party_analyses")
    .select("id").eq("case_id", caseId).limit(1);
  if (aErr) return { durum: "bekliyor", sonuc: `Analizler okunamadı: ${aErr.message}` };
  if (analizler && analizler.length > 0) return { durum: "atlandi", sonuc: "Dosyada analiz sonucu zaten var" };

  const { data: kosan } = await admin.from("agent_states")
    .select("id").eq("case_id", caseId).eq("agent_type", "orchestrator").eq("status", "running").limit(1);
  if (kosan && kosan.length > 0) return { durum: "atlandi", sonuc: "Orkestratör şu an koşuyor" };

  if (!CRON_SECRET) return { durum: "bekliyor", sonuc: "CRON_SECRET tanımlı değil, iç çağrı yapılamadı" };

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/orchestrator-run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": CRON_SECRET,
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ case_id: caseId }),
    });
    const govde = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { durum: "bekliyor", sonuc: `Analiz başlatılamadı (HTTP ${res.status}): ${String((govde as any)?.error ?? "").slice(0, 200)}` };
    }
    if ((govde as any)?.error) {
      return { durum: "bekliyor", sonuc: `Analiz başlatılamadı: ${String((govde as any).error).slice(0, 200)}` };
    }
    return { durum: "yapildi", sonuc: "analiz zinciri başlatıldı" };
  } catch (e: any) {
    return { durum: "bekliyor", sonuc: `İç çağrı başarısız: ${e?.message ?? String(e)}` };
  }
}

// Analiz için yeterli girdi var mı: başvuru metni veya yüklenmiş belge.
// Analiz sonucu yoksa ve girdi varsa panoya 'analiz_baslat' görevi açılır (mükerrer yazmaz).
async function analizGoreviAc(admin: any, dosya: any): Promise<{ acildi: boolean; sebep?: string }> {
  const { data: analizler } = await admin.from("party_analyses")
    .select("id").eq("case_id", dosya.id).limit(1);
  if (analizler && analizler.length > 0) return { acildi: false, sebep: "analiz sonucu zaten var" };

  const basvuruMetni = String(dosya?.issue_description ?? "").trim();
  const { data: belgeler } = await admin.from("case_documents")
    .select("id").eq("case_id", dosya.id).limit(1);
  const girdiVar = !!basvuruMetni || (Array.isArray(belgeler) && belgeler.length > 0);
  if (!girdiVar) return { acildi: false, sebep: "analiz için girdi yok (başvuru metni ve belge yok)" };

  const { data: mevcut } = await admin.from("ajan_gorevleri")
    .select("id").eq("case_id", dosya.id).eq("gorev_tipi", "analiz_baslat").eq("durum", "bekliyor").limit(1);
  if (mevcut && mevcut.length > 0) return { acildi: false, sebep: "bekleyen analiz_baslat görevi zaten var" };

  const { error } = await admin.from("ajan_gorevleri").insert({
    case_id: dosya.id,
    gorev_tipi: "analiz_baslat",
    durum: "bekliyor",
    gerekce: "Otomatik akış açık, dosyada analiz yok",
  });
  if (error) return { acildi: false, sebep: `görev yazılamadı: ${error.message}` };
  return { acildi: true };
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
type VideoOzet = {
  hazirlanan: number;
  incelenen: number;
  atlanan_yuz_yuze: number;
  atlama_sebepleri: string[];
  hatalar: string[];
  imza_adi: string;
};

async function videoBaglantilariniHazirla(admin: any, dosya: any): Promise<VideoOzet> {
  const ozet: VideoOzet = { hazirlanan: 0, incelenen: 0, atlanan_yuz_yuze: 0, atlama_sebepleri: [], hatalar: [], imza_adi: "" };
  const simdi = new Date().toISOString();
  const { data: oturumlar, error: sErr } = await admin.from("case_sessions")
    .select("id, scheduled_at, status, video_link, participants")
    .eq("case_id", dosya.id)
    .eq("status", "scheduled")
    .gt("scheduled_at", simdi)
    .limit(50);
  if (sErr) {
    ozet.hatalar.push(`${dosya.id}: oturumlar okunamadı — ${sErr.message}`);
    console.error(`[ajan-nobetci] oturumlar okunamadı (${dosya.id}): ${sErr.message}`);
    return ozet;
  }
  const adaylar = ((oturumlar ?? []) as any[]).filter((s) => !String(s.video_link ?? "").trim());
  ozet.incelenen = adaylar.length;
  if (adaylar.length === 0) return ozet;

  // Cevaplanmış tekliflerin seçenekleri düz listeye açılır. Teklifteki gun/saat Türkiye
  // saatidir; oturumun scheduled_at değeri UTC'dir, karşılaştırma TR'ye çevrilerek
  // yapılır ve GÜN ile SAATİN İKİSİ BİRDEN tutmak zorundadır (yalnız saate bakmak
  // başka günün teklifini eşleştiriyordu). Hiçbir seçenek tutmazsa oturum çevrim içi
  // sayılır; yalnız gün+saat tutan seçenekte oturum_tipi "yuz_yuze" ise atlanır.
  const teklifSecenekleri: { teklifId: string; gun: string; saat: string; tip: string }[] = [];
  const { data: teklifler } = await admin.from("randevu_teklifleri")
    .select("id, secenekler, durum").eq("case_id", dosya.id).eq("durum", "cevaplandi").limit(50);
  for (const t of (teklifler ?? []) as any[]) {
    for (const s of Array.isArray(t?.secenekler) ? t.secenekler : []) {
      teklifSecenekleri.push({
        teklifId: String(t?.id ?? ""),
        gun: String((s as any)?.gun ?? "").trim().slice(0, 10),
        saat: String((s as any)?.saat ?? "").trim().slice(0, 5),
        tip: String((s as any)?.oturum_tipi ?? "").trim(),
      });
    }
  }

  for (const oturum of adaylar) {
    // TR gün/saat: scheduled_at UTC'dir, sabit UTC+3 kaymasıyla çevrilir.
    const { gun, saat } = trGunSaat(String(oturum.scheduled_at));
    try {
      // Gün VE saat birebir tutan seçenek aranır; yoksa oturum çevrim içi sayılır.
      const eslesen = teklifSecenekleri.find((s) => s.gun === gun && s.saat === saat);
      if (eslesen?.tip === "yuz_yuze") {
        ozet.atlanan_yuz_yuze++;
        ozet.atlama_sebepleri.push(
          `${oturum.id}: teklif ${eslesen.teklifId} gün+saat eşleşmesinde yüz yüze işaretli (${gun} ${saat})`,
        );
        continue;
      }

      if (!CRON_SECRET) {
        ozet.atlama_sebepleri.push(`${oturum.id}: CRON_SECRET tanımlı değil, iç çağrı yapılamadı`);
        ozet.hatalar.push("CRON_SECRET tanımlı değil");
        console.error("[ajan-nobetci] CRON_SECRET yok, video bağlantısı üretilemedi");
        return ozet;
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
        const sebep = `create-video-room HTTP ${res.status} ${String((govde as any)?.error ?? "").slice(0, 200)}`.trim();
        ozet.hatalar.push(`${oturum.id}: ${sebep}`);
        ozet.atlama_sebepleri.push(`${oturum.id}: ${sebep}`);
        console.error(`[ajan-nobetci] video odası üretilemedi (${oturum.id}): ${sebep}`);
        continue;
      }
      // create-video-room bağlantıyı zaten oturuma yazar; yazılmadıysa burada tamamlanır.
      const { data: guncel } = await admin.from("case_sessions")
        .select("video_link").eq("id", oturum.id).maybeSingle();
      if (!String((guncel as any)?.video_link ?? "").trim()) {
        const { error: updErr } = await admin.from("case_sessions")
          .update({ video_link: link }).eq("id", oturum.id);
        if (updErr) {
          ozet.hatalar.push(`${oturum.id}: video_link yazılamadı — ${updErr.message}`);
          console.error(`[ajan-nobetci] video_link yazılamadı (${oturum.id}): ${updErr.message}`);
        }
      }

      const eposta = await videoBaglantiEpostasi(admin, dosya, oturum, link, gun, saat);
      for (const h of eposta.hatalar) ozet.hatalar.push(`${oturum.id}: ${h}`);
      if (eposta.imzaAdi) ozet.imza_adi = eposta.imzaAdi;
      ozet.hazirlanan++;
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      ozet.hatalar.push(`${oturum.id}: ${msg}`);
      ozet.atlama_sebepleri.push(`${oturum.id}: ${msg}`);
      console.error(`[ajan-nobetci] video bağlantısı hazırlanamadı (${oturum.id}): ${msg}`);
    }
  }
  return ozet;
}

// Oturumun tarafına kısa bilgilendirme: dosya künyesi, gün-saat ve bağlantı.
// Karşı tarafa ait hiçbir veri geçmez; imza dosyanın arabulucusunun adıdır.
async function videoBaglantiEpostasi(
  admin: any, dosya: any, oturum: any, link: string, gun: string, saat: string,
): Promise<{ hatalar: string[]; imzaAdi: string }> {
  const hatalar: string[] = [];
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.error("[ajan-nobetci] RESEND_API_KEY yok, bağlantı e-postası gönderilemedi");
    return { hatalar: ["RESEND_API_KEY yok, bağlantı e-postası gönderilemedi"], imzaAdi: "" };
  }
  const partyIds = (Array.isArray(oturum?.participants) ? oturum.participants : [])
    .map((p: any) => String(p?.party_id ?? "")).filter(Boolean);
  if (partyIds.length === 0) {
    return { hatalar: ["oturumda katılımcı taraf kaydı yok, e-posta gönderilmedi"], imzaAdi: "" };
  }

  const { data: taraflar } = await admin.from("case_parties")
    .select("id, party_type, first_name, last_name, company_name, email")
    .in("id", partyIds);

  // İmza çözümlemesi randevu-teklif'teki davet e-postasının BİREBİR aynısı: dosya satırı
  // burada id ile yeniden okunur (döngüden gelen nesneye güvenilmez), sonra takvimSahibi
  // ve profiles.full_name sorgusu aynı sırayla çalışır.
  const { data: dosyaSatiri } = await admin.from("cases")
    .select("application_no, title, assigned_mediator_id, user_id").eq("id", dosya?.id).maybeSingle();
  const arabulucuId = takvimSahibi(dosyaSatiri);
  const { data: profil } = arabulucuId
    ? await admin.from("profiles").select("full_name").eq("user_id", arabulucuId).maybeSingle()
    : { data: null };
  // İmza bloğu randevu-teklif'teki davet e-postasıyla aynı: "Saygılarımızla," +
  // "Arb. <ad soyad>". Ad bulunamazsa yalnız "Saygılarımızla," yazılır.
  const adSoyad = String((profil as any)?.full_name ?? "").trim();
  const imza = adSoyad ? (/^arb\.?\s/i.test(adSoyad) ? adSoyad : `Arb. ${adSoyad}`) : "";
  if (!dosyaSatiri) {
    hatalar.push(`cases sorgusu boş döndü (id=${String(dosya?.id ?? "")}), imza adsız gönderildi`);
  } else if (!arabulucuId) {
    hatalar.push("cases satırında assigned_mediator_id ve user_id boş, imza adsız gönderildi");
  } else if (!adSoyad) {
    hatalar.push(`profiles sorgusu boş döndü (user_id=${arabulucuId}), imza adsız gönderildi`);
  }

  const esc = (t: string) => String(t).replace(/</g, "&lt;");
  const tarih = trTarihMetni(gun);
  const kunye: string[] = [];
  const appNo = (dosyaSatiri as any)?.application_no ?? dosya?.application_no;
  const baslik = (dosyaSatiri as any)?.title ?? dosya?.title;
  if (appNo) kunye.push(`<strong>Dosya No:</strong> ${esc(String(appNo))}`);
  if (baslik) kunye.push(`<strong>Uyuşmazlık konusu:</strong> ${esc(String(baslik))}`);

  for (const t of (taraflar ?? []) as any[]) {
    const email = String(t?.email ?? "").trim();
    if (!email) { hatalar.push("tarafın e-postası yok, bağlantı iletilemedi"); continue; }
    const ad = t?.party_type === "individual"
      ? `${t?.first_name ?? ""} ${t?.last_name ?? ""}`.trim()
      : String(t?.company_name ?? "").trim();
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
      <p>Sayın ${esc(ad || "Taraf")},</p>
      ${kunye.length ? `<p>${kunye.join("<br>")}</p>` : ""}
      <p><strong>Görüşme:</strong> ${esc(tarih)} · ${esc(saat)}</p>
      <p>Görüşme bağlantınız:<br><a href="${link}">${esc(link)}</a></p>
      <p>Saygılarımızla,${imza ? `<br>${esc(imza)}` : ""}</p>
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
        const govde = (await res.text()).slice(0, 200);
        hatalar.push(`bağlantı e-postası gönderilemedi (HTTP ${res.status}) ${govde}`.trim());
        console.error("[ajan-nobetci] bağlantı e-postası gönderilemedi", { status: res.status, body: govde });
      }
    } catch (e: any) {
      hatalar.push(`bağlantı e-postası hatası: ${e?.message ?? e}`);
      console.error(`[ajan-nobetci] bağlantı e-postası hatası: ${e?.message ?? e}`);
    }
  }
  return { hatalar, imzaAdi: imza };
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
      .select("id, deadline_total, deadline_extended, extension_used, assigned_mediator_id, user_id, application_no, title, issue_description")
      .eq("otomatik_akis", true)
      .limit(500);
    if (cErr) return json({ error: cErr.message }, 500);

    let islenenDosya = 0;
    let yapilanGorev = 0;
    let atlananGorev = 0;
    let yeniRandevuGorevi = 0;
    let hazirlananVideo = 0;
    let incelenenOturum = 0;
    let atlananYuzYuze = 0;
    const atlamaSebepleri: string[] = [];
    let imzaAdi = "";
    let analizBaslatildi = 0;
    let yeniAnalizGorevi = 0;
    const hatalar: string[] = [];

    for (const dosya of (dosyalar ?? []) as any[]) {
      // Bir dosyadaki hata diğer dosyaları durdurmaz.
      let buDosyaYapilan = 0;
      try {
        // Analiz görevi görev listesi okunmadan ÖNCE açılır ki aynı turda işlensin.
        const analizGorev = await analizGoreviAc(admin, dosya);
        if (analizGorev.acildi) yeniAnalizGorevi++;
        else if (analizGorev.sebep) atlamaSebepleri.push(`${dosya.id}: analiz görevi açılmadı — ${analizGorev.sebep}`);

        const { data: gorevler, error: gErr } = await admin.from("ajan_gorevleri")
          .select("id, gorev_tipi, hedef_party_id, durum")
          .eq("case_id", dosya.id)
          .eq("durum", "bekliyor")
          .limit(100);
        if (gErr) throw new Error(gErr.message);

        for (const gorev of (gorevler ?? []) as any[]) {
          // Tanınmayan görev tipine dokunulmaz: 'bekliyor' kalır.
          if (gorev.gorev_tipi !== "soru_gonder" && gorev.gorev_tipi !== "randevu_teklifi" && gorev.gorev_tipi !== "analiz_baslat") continue;
          if (gorev.gorev_tipi === "soru_gonder" && !gorev.hedef_party_id) {
            await admin.from("ajan_gorevleri")
              .update({ durum: "atlandi", sonuc: "Hedef taraf yok" }).eq("id", gorev.id);
            atlananGorev++;
            continue;
          }
          const { durum, sonuc } = gorev.gorev_tipi === "randevu_teklifi"
            ? await randevuTeklifiYurut(admin, dosya.id)
            : gorev.gorev_tipi === "analiz_baslat"
              ? await analizBaslat(admin, dosya.id)
              : await soruGonder(admin, dosya.id, gorev.hedef_party_id);
          if (durum !== "bekliyor") {
            await admin.from("ajan_gorevleri").update({ durum, sonuc }).eq("id", gorev.id);
          } else {
            // Yazılamadı: görev bekliyor kalır, neden sonuc alanına düşer.
            await admin.from("ajan_gorevleri").update({ sonuc }).eq("id", gorev.id);
            hatalar.push(`${dosya.id}: ${sonuc}`);
            console.error(`[ajan-nobetci] görev yürütülemedi (${gorev.id}): ${sonuc}`);
          }
          if (durum === "yapildi") {
            yapilanGorev++; buDosyaYapilan++;
            if (gorev.gorev_tipi === "analiz_baslat") analizBaslatildi++;
          }
          if (durum === "atlandi") {
            atlananGorev++;
            atlamaSebepleri.push(`${gorev.id} (${gorev.gorev_tipi}): ${sonuc}`);
          }
        }

        if (await zamanKontrolu(admin, dosya)) yeniRandevuGorevi++;
        const videoOzet = await videoBaglantilariniHazirla(admin, dosya);
        const videoHazirlanan = videoOzet.hazirlanan;
        hazirlananVideo += videoHazirlanan;
        incelenenOturum += videoOzet.incelenen;
        atlananYuzYuze += videoOzet.atlanan_yuz_yuze;
        atlamaSebepleri.push(...videoOzet.atlama_sebepleri);
        hatalar.push(...videoOzet.hatalar);
        if (videoOzet.imza_adi) imzaAdi = videoOzet.imza_adi;
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
      incelenen_oturum: incelenenOturum,
      atlanan_yuz_yuze: atlananYuzYuze,
      analiz_baslatildi: analizBaslatildi,
      analiz_gorevi_acildi: yeniAnalizGorevi,
      atlama_sebepleri: atlamaSebepleri,
      imza_adi: imzaAdi,
      hata: hatalar,
    });
  } catch (e: any) {
    console.error("[ajan-nobetci] koşum hatası", e?.message ?? e);
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
