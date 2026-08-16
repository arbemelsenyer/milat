// Ajan nöbetçisi: otomatik akışı açık dosyalarda süreci baştan sona yürütür.
// Her koşumda önce KOLLAR çalışır (analiz · randevu · aşama geçişi · oturum
// hatırlatması · oturum yapıldı mı · kapanış onayları) ve panoya (ajan_gorevleri)
// görev bırakır; sonra durumu 'bekliyor' olan görevler yürütülür. Durumu
// 'onay_bekliyor' olan satırlar ZORUNLU İNSAN NOKTALARIDIR — ajan onlara dokunmaz.
// Bir kol çalıştırılamıyorsa sebebi sessizce yutulmaz: agent_states.last_output
// içindeki "yapilmayanlar" listesine zaman damgasıyla yazılır (Ajan Paneli okur).
// Güvenlik deseni check-new-tariff ile aynı: x-cron-secret veya admin JWT; yoksa 401.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

// Oturum hatırlatması bu kadar saat kala gönderilir (oturumdan 1 gün önce).
const HATIRLATMA_SAAT = 24;

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

/* ─────────────────────────────────────────────────────────────────────────────
   PANO YARDIMCILARI
   Görev satırının gerekçesi makine okunur bir ETİKETLE başlar: "[gecis:2->3] …".
   Etiket hem aynı işin iki kez yazılmasını önler hem Ajan Paneli'nde gruplamayı
   sağlar. Etiket taraması JS tarafında yapılır (LIKE deseni yerine) — köşeli
   parantez ve ok işareti sorgu diline karışmasın.
   Durum sözlüğü:
     bekliyor      → nöbetçi yürütecek
     onay_bekliyor → ARABULUCU yürütecek; nöbetçi dokunmaz (zorunlu insan noktası)
     yapildi / atlandi → kapanmış
   ──────────────────────────────────────────────────────────────────────────── */
async function gorevEtiketiVarMi(admin: any, caseId: string, gorevTipi: string, etiket: string): Promise<boolean> {
  const { data } = await admin.from("ajan_gorevleri")
    .select("id, gerekce").eq("case_id", caseId).eq("gorev_tipi", gorevTipi).limit(200);
  return ((data ?? []) as any[]).some((r) => String(r?.gerekce ?? "").startsWith(etiket));
}

async function gorevAc(
  admin: any, caseId: string, gorevTipi: string, etiket: string, aciklama: string,
  opts?: { durum?: string; hedefPartyId?: string | null },
): Promise<{ acildi: boolean; sebep?: string }> {
  if (await gorevEtiketiVarMi(admin, caseId, gorevTipi, etiket)) {
    return { acildi: false, sebep: `${gorevTipi} görevi zaten açılmış (${etiket})` };
  }
  const { error } = await admin.from("ajan_gorevleri").insert({
    case_id: caseId,
    gorev_tipi: gorevTipi,
    durum: opts?.durum ?? "bekliyor",
    gerekce: `${etiket} ${aciklama}`.trim(),
    hedef_party_id: opts?.hedefPartyId ?? null,
  });
  if (error) return { acildi: false, sebep: `görev yazılamadı: ${error.message}` };
  return { acildi: true };
}

// Arabulucuya bildirim: yalnız olay başlığı ve dosya künyesi taşır (kör veri).
async function arabulucuyaBildir(admin: any, dosya: any, baslik: string, mesaj: string) {
  const hedef = takvimSahibi(dosya);
  if (!hedef) return;
  try {
    await admin.rpc("create_notification", {
      p_user_id: hedef,
      p_title: baslik,
      p_message: mesaj,
      p_type: "info",
      p_link: `/cases/${dosya.id}`,
    });
  } catch (e: any) {
    console.error(`[ajan-nobetci] bildirim yazılamadı (${dosya.id}): ${e?.message ?? e}`);
  }
}

// Zorunlu insan noktası: ajan tek başına yapmaz, panoya "arabulucu onayı bekliyor"
// kaydı düşer ve bildirim oluşur. Nöbetçi bu görevleri ASLA yürütmez.
async function onayGoreviAc(
  admin: any, dosya: any, etiket: string, aciklama: string, bildirimBasligi: string,
): Promise<{ acildi: boolean; sebep?: string }> {
  const r = await gorevAc(admin, dosya.id, "arabulucu_onayi", etiket, aciklama, { durum: "onay_bekliyor" });
  if (r.acildi) {
    await arabulucuyaBildir(
      admin, dosya, bildirimBasligi,
      `"${String(dosya?.application_no ?? dosya.id)}" dosyasında arabulucu onayı bekleniyor.`,
    );
  }
  return r;
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
// iç kapıdan (x-cron-secret) tetiklenir. Analiz sonucu oluşmuşsa veya orkestrator
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

// RANDEVU TETİKLEYİCİSİ (14.08 — yeni kural). Eski kural "son tarihe 3 günden az kaldıysa"
// idi ve süreç sonuna kadar bekliyordu; KALDIRILDI. Yeni kural: analiz zinciri
// tamamlandıysa VE planlanmış oturum yoksa VE bekleyen teklif yoksa randevu teklifi
// HEMEN açılır — taraflar süreç başlar başlamaz oturuma çağrılır.
async function randevuGoreviAc(admin: any, dosya: any): Promise<{ acildi: boolean; sebep?: string }> {
  // Katılım teyidi: bir taraf "katılmıyorum" dediyse ajan bu dosyada randevu açmaz.
  const { data: katilmayan } = await admin.from("case_parties")
    .select("id").eq("case_id", dosya.id).eq("katilim_durumu", "katilmiyor").limit(1);
  if (katilmayan && katilmayan.length > 0) {
    return { acildi: false, sebep: "randevu açılmadı: taraflardan biri sürece katılmadığını bildirdi" };
  }

  const { data: analizler, error: aErr } = await admin.from("party_analyses")
    .select("id").eq("case_id", dosya.id).limit(1);
  if (aErr) return { acildi: false, sebep: `randevu açılamadı: analizler okunamadı — ${aErr.message}` };
  if (!analizler || analizler.length === 0) {
    return { acildi: false, sebep: "randevu açılamadı: analiz zinciri henüz tamamlanmadı" };
  }
  const { data: kosan } = await admin.from("agent_states")
    .select("id").eq("case_id", dosya.id).eq("agent_type", "orchestrator").eq("status", "running").limit(1);
  if (kosan && kosan.length > 0) {
    return { acildi: false, sebep: "randevu açılamadı: analiz zinciri hâlâ koşuyor" };
  }

  const simdi = new Date().toISOString();
  const { data: oturumlar } = await admin.from("case_sessions")
    .select("id").eq("case_id", dosya.id).eq("status", "scheduled").gt("scheduled_at", simdi).limit(1);
  if (oturumlar && oturumlar.length > 0) {
    return { acildi: false, sebep: "randevu açılmadı: dosyada planlanmış oturum zaten var" };
  }

  const { data: teklifler } = await admin.from("randevu_teklifleri")
    .select("id").eq("case_id", dosya.id).eq("durum", "beklemede").limit(1);
  if (teklifler && teklifler.length > 0) {
    return { acildi: false, sebep: "randevu açılmadı: cevap bekleyen teklif var" };
  }

  const { data: bekleyen } = await admin.from("ajan_gorevleri")
    .select("id").eq("case_id", dosya.id).eq("gorev_tipi", "randevu_teklifi").eq("durum", "bekliyor").limit(1);
  if (bekleyen && bekleyen.length > 0) {
    return { acildi: false, sebep: "randevu açılmadı: bekleyen randevu görevi var" };
  }

  const { error } = await admin.from("ajan_gorevleri").insert({
    case_id: dosya.id,
    gorev_tipi: "randevu_teklifi",
    durum: "bekliyor",
    gerekce: "Analiz zinciri tamamlandı, planlı oturum yok — taraf oturuma çağrılıyor",
  });
  if (error) {
    console.error(`[ajan-nobetci] randevu_teklifi görevi yazılamadı (${dosya.id}): ${error.message}`);
    return { acildi: false, sebep: `randevu görevi yazılamadı: ${error.message}` };
  }
  return { acildi: true };
}

/* ─────────────────────────────────────────────────────────────────────────────
   AŞAMA GEÇİŞİ (yeni numaralandırma 1-7)
   Aşama YALNIZ İLERİ gider; ajan hiçbir koşulda geri almaz. Her geçiş panoya
   gerekçesiyle yazılır ve aynı geçiş iki kez açılmaz (etiket: [gecis:X->Y]).
   Geçiş şartı sağlanmıyorsa sebebi ön koşul uyarısı olarak kaydedilir.
   ──────────────────────────────────────────────────────────────────────────── */
async function asamaGecisiDegerlendir(
  admin: any, dosya: any,
): Promise<{ hedef: number | null; gerekce: string; sebep?: string }> {
  const mevcut = Math.min(7, Math.max(1, Number(dosya?.current_phase ?? 1) || 1));
  const say = async (tablo: string, filtre?: (q: any) => any) => {
    let q = admin.from(tablo).select("id", { count: "exact", head: true }).eq("case_id", dosya.id);
    if (filtre) q = filtre(q);
    const { count } = await q;
    return count ?? 0;
  };

  if (mevcut === 1) {
    const taraf = await say("case_parties");
    if (taraf < 2) return { hedef: null, gerekce: "", sebep: "aşama geçilemedi: en az iki taraf gerekiyor" };
    const belge = await say("case_documents");
    const girdiVar = belge > 0 || !!String(dosya?.issue_description ?? "").trim();
    if (!girdiVar) return { hedef: null, gerekce: "", sebep: "aşama geçilemedi: belge veya başvuru metni yok" };
    const analiz = await say("party_analyses");
    const { data: orkestrator } = await admin.from("agent_states")
      .select("id").eq("case_id", dosya.id).eq("agent_type", "orchestrator").limit(1);
    const baslatildi = analiz > 0 || (Array.isArray(orkestrator) && orkestrator.length > 0);
    if (!baslatildi) return { hedef: null, gerekce: "", sebep: "aşama geçilemedi: analiz zinciri henüz başlatılmadı" };
    return { hedef: 2, gerekce: `${taraf} taraf, ${belge} belge, analiz zinciri başlatıldı` };
  }

  if (mevcut === 2) {
    const taraf = await say("case_parties");
    const analiz = await say("party_analyses");
    if (taraf === 0 || analiz < taraf) {
      return { hedef: null, gerekce: "", sebep: `aşama geçilemedi: taraf analizleri tamam değil (${analiz}/${taraf})` };
    }
    const rapor = await say("common_ground_reports");
    if (rapor < 1) return { hedef: null, gerekce: "", sebep: "aşama geçilemedi: ortak zemin raporu bekleniyor" };
    return { hedef: 3, gerekce: `taraf analizleri tamam (${analiz}/${taraf}), ortak zemin raporu üretildi` };
  }

  if (mevcut === 3) {
    const { data: oturum } = await admin.from("case_sessions")
      .select("id, scheduled_at").eq("case_id", dosya.id).eq("status", "scheduled").limit(1);
    if (!oturum || oturum.length === 0) {
      return { hedef: null, gerekce: "", sebep: "aşama geçilemedi: kabul edilmiş randevudan planlanmış oturum yok" };
    }
    return { hedef: 4, gerekce: "randevu kabul edildi, oturum planlandı" };
  }

  if (mevcut === 4) {
    const simdi = new Date().toISOString();
    const { data: yapilan } = await admin.from("case_sessions")
      .select("id").eq("case_id", dosya.id).eq("status", "completed").lt("scheduled_at", simdi).limit(1);
    if (!yapilan || yapilan.length === 0) {
      return { hedef: null, gerekce: "", sebep: "aşama geçilemedi: oturum henüz 'yapıldı' işaretlenmedi" };
    }
    return { hedef: 5, gerekce: "oturum tarihi geçti ve yapıldı işaretlendi" };
  }

  if (mevcut === 5) {
    // Bilirkişi opsiyonel: dosyada bilirkişi atama kaydı yoksa doğrudan geçilir.
    const { data: bilirkisi, error: bErr } = await admin.from("case_expert_assignments")
      .select("id").eq("case_id", dosya.id).limit(1);
    if (bErr) return { hedef: null, gerekce: "", sebep: `aşama geçilemedi: bilirkişi kaydı okunamadı — ${bErr.message}` };
    if (bilirkisi && bilirkisi.length > 0) {
      return { hedef: null, gerekce: "", sebep: "aşama geçilemedi: dosyada bilirkişi görevi var, raporu bekleniyor" };
    }
    return { hedef: 6, gerekce: "bilirkişi istenmedi, opsiyonel aşama atlandı" };
  }

  if (mevcut === 6) {
    // Görüşme notu kaydı VERİ olarak phase=7 taşır (aşama numarası değil, not işareti).
    const not = await say("case_notes", (q: any) => q.eq("phase", 7));
    if (not < 1) return { hedef: null, gerekce: "", sebep: "aşama geçilemedi: oturum notu taslağı arabulucu tarafından onaylanmadı" };
    return { hedef: 7, gerekce: "oturum notu üretildi ve arabulucu onayıyla kaydedildi" };
  }

  return { hedef: null, gerekce: "", sebep: "aşama geçişi yok: dosya son aşamada" };
}

async function asamaGecisiGoreviAc(admin: any, dosya: any): Promise<{ acildi: boolean; sebep?: string }> {
  const mevcut = Math.min(7, Math.max(1, Number(dosya?.current_phase ?? 1) || 1));
  const { hedef, gerekce, sebep } = await asamaGecisiDegerlendir(admin, dosya);
  if (!hedef) return { acildi: false, sebep };
  if (hedef <= mevcut) return { acildi: false, sebep: "aşama geri alınmaz" };
  return gorevAc(admin, dosya.id, "asama_gecisi", `[gecis:${mevcut}->${hedef}]`, gerekce);
}

// asama_gecisi yürütücüsü: cases.current_phase yalnız İLERİ yazılır.
async function asamaGecisiYurut(admin: any, caseId: string, gerekce: string): Promise<{ durum: string; sonuc: string }> {
  const m = /^\[gecis:(\d+)->(\d+)\]/.exec(String(gerekce ?? ""));
  if (!m) return { durum: "atlandi", sonuc: "Geçiş etiketi okunamadı" };
  const kaynak = Number(m[1]);
  const hedef = Number(m[2]);
  if (!Number.isFinite(hedef) || hedef < 1 || hedef > 7) return { durum: "atlandi", sonuc: "Geçersiz hedef aşama" };

  const { data: satir, error: rErr } = await admin.from("cases")
    .select("current_phase").eq("id", caseId).maybeSingle();
  if (rErr) return { durum: "bekliyor", sonuc: `Dosya okunamadı: ${rErr.message}` };
  const simdiki = Number((satir as any)?.current_phase ?? 1) || 1;
  if (simdiki >= hedef) return { durum: "atlandi", sonuc: `Dosya zaten Aşama ${simdiki}'de (geri alınmaz)` };

  const { error } = await admin.from("cases").update({ current_phase: hedef }).eq("id", caseId);
  if (error) return { durum: "bekliyor", sonuc: `Aşama yazılamadı: ${error.message}` };
  return { durum: "yapildi", sonuc: `Aşama ${kaynak} → ${hedef} ilerletildi` };
}

/* ─────────────────────────────────────────────────────────────────────────────
   AŞAMA 4-7 KOLLARI
   · Oturumdan 1 gün önce taraflara hatırlatma (arabulucu imzalı, TEK KEZ)
   · Oturum saati geçince arabulucuya "oturum yapıldı mı?" sorusu (insan noktası)
   · Oturum notu taslağının arabulucuya sunulması (insan noktası)
   · Kapanış: tutanağın imzaya sunulması, sonuç kaydı, dosyanın kapatılması
   ──────────────────────────────────────────────────────────────────────────── */

// Dosyanın arabulucusunun imza bloğu — randevu/video e-postalarındaki kalıbın aynısı.
async function imzaBlogu(admin: any, caseId: string): Promise<{ imza: string; dosyaSatiri: any; sebep?: string }> {
  const { data: dosyaSatiri } = await admin.from("cases")
    .select("application_no, title, assigned_mediator_id, user_id").eq("id", caseId).maybeSingle();
  const arabulucuId = takvimSahibi(dosyaSatiri);
  if (!arabulucuId) return { imza: "", dosyaSatiri, sebep: "dosyada arabulucu kimliği yok" };
  const { data: profil } = await admin.from("profiles")
    .select("full_name").eq("user_id", arabulucuId).maybeSingle();
  const adSoyad = String((profil as any)?.full_name ?? "").trim();
  if (!adSoyad) return { imza: "", dosyaSatiri, sebep: `profiles boş döndü (user_id=${arabulucuId})` };
  return { imza: /^arb\.?\s/i.test(adSoyad) ? adSoyad : `Arb. ${adSoyad}`, dosyaSatiri };
}

// Oturum hatırlatması: 24 saat içinde başlayacak planlı oturumlar için görev açılır.
// Etiket oturum kimliğini taşır — aynı oturum için ikinci hatırlatma yazılmaz.
async function oturumHatirlatmaGorevleriAc(admin: any, dosya: any): Promise<{ acilan: number; sebepler: string[] }> {
  const sebepler: string[] = [];
  let acilan = 0;
  const simdi = Date.now();
  const sinir = new Date(simdi + HATIRLATMA_SAAT * 3_600_000).toISOString();
  const { data: oturumlar, error } = await admin.from("case_sessions")
    .select("id, scheduled_at, participants, status")
    .eq("case_id", dosya.id).eq("status", "scheduled")
    .gt("scheduled_at", new Date(simdi).toISOString())
    .lt("scheduled_at", sinir)
    .limit(20);
  if (error) {
    sebepler.push(`hatırlatma açılamadı: oturumlar okunamadı — ${error.message}`);
    return { acilan, sebepler };
  }
  for (const o of (oturumlar ?? []) as any[]) {
    const r = await gorevAc(
      admin, dosya.id, "oturum_hatirlatma", `[hatirlatma:${o.id}]`,
      "Oturuma 1 günden az kaldı, taraflara hatırlatma gönderilecek",
    );
    if (r.acildi) acilan++;
    else if (r.sebep && !r.sebep.includes("zaten açılmış")) sebepler.push(r.sebep);
  }
  return { acilan, sebepler };
}

// Hatırlatma yürütücüsü: oturumun taraflarına tek e-posta. Karşı taraf verisi geçmez.
async function oturumHatirlatmaYurut(admin: any, dosya: any, gerekce: string): Promise<{ durum: string; sonuc: string }> {
  const m = /^\[hatirlatma:([0-9a-f-]+)\]/i.exec(String(gerekce ?? ""));
  if (!m) return { durum: "atlandi", sonuc: "Hatırlatma etiketi okunamadı" };
  const sessionId = m[1];

  const { data: oturum, error: sErr } = await admin.from("case_sessions")
    .select("id, scheduled_at, status, participants, video_link").eq("id", sessionId).maybeSingle();
  if (sErr) return { durum: "bekliyor", sonuc: `Oturum okunamadı: ${sErr.message}` };
  if (!oturum) return { durum: "atlandi", sonuc: "Oturum kaydı bulunamadı" };
  if (String((oturum as any).status) !== "scheduled") return { durum: "atlandi", sonuc: "Oturum artık planlı değil" };

  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { durum: "bekliyor", sonuc: "RESEND_API_KEY yok, hatırlatma gönderilemedi" };

  const partyIds = (Array.isArray((oturum as any).participants) ? (oturum as any).participants : [])
    .map((p: any) => String(p?.party_id ?? "")).filter(Boolean);
  if (partyIds.length === 0) return { durum: "atlandi", sonuc: "Oturumda katılımcı taraf kaydı yok" };

  const { data: taraflar } = await admin.from("case_parties")
    .select("id, party_type, first_name, last_name, company_name, email").in("id", partyIds);
  const { imza, dosyaSatiri } = await imzaBlogu(admin, dosya.id);
  const { gun, saat } = trGunSaat(String((oturum as any).scheduled_at));
  const esc = (t: string) => String(t).replace(/</g, "&lt;");
  const link = String((oturum as any).video_link ?? "").trim();

  let gonderilen = 0;
  const hatalar: string[] = [];
  for (const t of (taraflar ?? []) as any[]) {
    const email = String(t?.email ?? "").trim();
    if (!email) { hatalar.push("tarafın e-postası yok"); continue; }
    const ad = t?.party_type === "individual"
      ? `${t?.first_name ?? ""} ${t?.last_name ?? ""}`.trim()
      : String(t?.company_name ?? "").trim();
    const kunye: string[] = [];
    const appNo = (dosyaSatiri as any)?.application_no;
    const baslik = (dosyaSatiri as any)?.title;
    if (appNo) kunye.push(`<strong>Dosya No:</strong> ${esc(String(appNo))}`);
    if (baslik) kunye.push(`<strong>Uyuşmazlık konusu:</strong> ${esc(String(baslik))}`);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
      <p>Sayın ${esc(ad || "Taraf")},</p>
      ${kunye.length ? `<p>${kunye.join("<br>")}</p>` : ""}
      <p>Yarın planlanan görüşmenizi hatırlatırız:</p>
      <p><strong>${esc(trTarihMetni(gun))} · ${esc(saat)}</strong></p>
      ${link ? `<p>Görüşme bağlantınız:<br><a href="${link}">${esc(link)}</a></p>` : ""}
      <p>Saygılarımızla,${imza ? `<br>${esc(imza)}` : ""}</p>
      <p style="font-size:12px;color:#666">Bu ileti MediPact AI aracılığıyla gönderilmiştir.</p>
    </body></html>`;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "MİLAT Arabuluculuk <info@milatmediation.com>",
          to: [email], subject: "Görüşme hatırlatması", html,
        }),
      });
      if (res.ok) gonderilen++;
      else hatalar.push(`HTTP ${res.status} ${(await res.text()).slice(0, 150)}`);
    } catch (e: any) {
      hatalar.push(e?.message ?? String(e));
    }
  }
  if (gonderilen === 0) {
    return { durum: "bekliyor", sonuc: `Hatırlatma gönderilemedi: ${hatalar.join(" · ").slice(0, 300)}` };
  }
  return {
    durum: "yapildi",
    sonuc: `${gonderilen} tarafa hatırlatma gönderildi${hatalar.length ? ` (${hatalar.length} hata)` : ""}`,
  };
}

// Oturum saati geçmiş ve hâlâ 'scheduled' duran oturumlar için arabulucuya soru.
// Cevabı ARABULUCU verir (Ajan Paneli'ndeki Yapıldı / Yapılmadı düğmeleri).
async function oturumYapildiMiGorevleriAc(admin: any, dosya: any): Promise<{ acilan: number; sebepler: string[] }> {
  const sebepler: string[] = [];
  let acilan = 0;
  const { data: oturumlar, error } = await admin.from("case_sessions")
    .select("id, scheduled_at, status")
    .eq("case_id", dosya.id).eq("status", "scheduled")
    .lt("scheduled_at", new Date().toISOString())
    .limit(20);
  if (error) {
    sebepler.push(`oturum sorusu açılamadı: oturumlar okunamadı — ${error.message}`);
    return { acilan, sebepler };
  }
  for (const o of (oturumlar ?? []) as any[]) {
    const { gun, saat } = trGunSaat(String(o.scheduled_at));
    const r = await onayGoreviAc(
      admin, dosya, `[onay:oturum_yapildi:${o.id}]`,
      `${trTarihMetni(gun)} ${saat} oturumu yapıldı mı?`,
      "Oturum yapıldı mı?",
    );
    if (r.acildi) acilan++;
    else if (r.sebep && !r.sebep.includes("zaten açılmış")) sebepler.push(r.sebep);
  }
  return { acilan, sebepler };
}

// Kapanış kolları: oturum notu taslağı ve üç zorunlu insan noktası.
// NOT: Oturum notunun METNİ ajan tarafından uydurulmaz (halüsinasyon yasağı) —
// taslak, kayıtlı olgulardan (tarih, katılımcı sayısı) kurulan bir iskelettir;
// içeriği arabulucu yazar/onaylar. Kayıt ve döküm hattı geldiğinde bu iskelet
// dökümden beslenecektir.
async function kapanisKollari(admin: any, dosya: any): Promise<{ acilan: number; sebepler: string[] }> {
  const sebepler: string[] = [];
  let acilan = 0;
  const asama = Math.min(7, Math.max(1, Number(dosya?.current_phase ?? 1) || 1));

  // Yapılmış oturum varsa ve o oturum için not yoksa taslak arabulucuya sunulur.
  const { data: yapilanlar } = await admin.from("case_sessions")
    .select("id, scheduled_at").eq("case_id", dosya.id).eq("status", "completed").limit(20);
  if (yapilanlar && yapilanlar.length > 0) {
    const { count: notSayisi } = await admin.from("case_notes")
      .select("id", { count: "exact", head: true }).eq("case_id", dosya.id).eq("phase", 7);
    if ((notSayisi ?? 0) === 0) {
      const son = (yapilanlar as any[])[0];
      const { gun, saat } = trGunSaat(String(son.scheduled_at));
      const r = await onayGoreviAc(
        admin, dosya, `[onay:oturum_notu:${son.id}]`,
        `${trTarihMetni(gun)} ${saat} oturumunun notu bekleniyor — taslak Görüşme Notları ekranında düzenlenip onaylanır`,
        "Oturum notu taslağı hazır",
      );
      if (r.acildi) acilan++;
      else if (r.sebep && !r.sebep.includes("zaten açılmış")) sebepler.push(r.sebep);
    } else {
      sebepler.push("oturum notu taslağı açılmadı: dosyada görüşme notu zaten var");
    }
  } else {
    sebepler.push("oturum notu taslağı açılmadı: yapıldı işaretli oturum yok");
  }

  // Son aşamada üç zorunlu insan noktası: tutanağın imzaya sunulması, sonuç kaydı,
  // dosyanın kapatılması. Ajan hiçbirini tek başına yapmaz.
  const kapali = dosya?.status === "agreed" || dosya?.status === "failed";
  if (asama >= 7 && !kapali) {
    for (const [etiket, aciklama, baslik] of [
      ["[onay:tutanak_imza]", "Kapanış belgesi taslağı hazır — imzaya sunulması arabulucudadır", "Tutanak imzaya hazır"],
      ["[onay:sonuc_kaydi]", "Anlaşma / anlaşmama kararının kaydı arabulucudadır", "Sonuç kaydı bekleniyor"],
      ["[onay:dosya_kapat]", "Dosyanın kapatılması arabulucudadır", "Dosya kapanışı bekleniyor"],
    ] as [string, string, string][]) {
      const r = await onayGoreviAc(admin, dosya, etiket, aciklama, baslik);
      if (r.acildi) acilan++;
      else if (r.sebep && !r.sebep.includes("zaten açılmış")) sebepler.push(r.sebep);
    }
  } else if (!kapali) {
    sebepler.push(`kapanış onayları açılmadı: dosya Aşama ${asama}, kapanış aşamasına gelmedi`);
  }

  return { acilan, sebepler };
}

/* ─────────────────────────────────────────────────────────────────────────────
   TARAF AJANI (Tur B)
   Her tarafın kendi ajanı vardır ve YALNIZ kendi tarafının verisini görür. Süreç
   ajanıyla doğrudan konuşmaz; iletişim ajan_gorevleri panosu üzerinden yürür ve
   panoya yazılan hiçbir kayıt karşı tarafın verisini taşımaz. Taraf ajanının
   ürettiği her satırda hedef_party_id DOLUDUR (kör veri kapısı: taraf yalnız
   kendi hedef_party_id satırlarını okuyabilir).
   ──────────────────────────────────────────────────────────────────────────── */

// Tarafa e-posta: arabulucu imzalı, tek seferlik (mükerrer gönderim panodaki
// etiketle engellenir). Yalnız kendi tarafına gider; karşı taraf verisi geçmez.
async function tarafaEposta(
  admin: any, dosya: any, taraf: any, konu: string, govdeHtml: string,
): Promise<{ gonderildi: boolean; sebep?: string }> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { gonderildi: false, sebep: "RESEND_API_KEY yok" };
  const email = String(taraf?.email ?? "").trim();
  if (!email) return { gonderildi: false, sebep: "tarafın e-posta adresi yok" };

  const { imza, dosyaSatiri } = await imzaBlogu(admin, dosya.id);
  const esc = (t: string) => String(t).replace(/</g, "&lt;");
  const ad = taraf?.party_type === "individual"
    ? `${taraf?.first_name ?? ""} ${taraf?.last_name ?? ""}`.trim()
    : String(taraf?.company_name ?? "").trim();
  const kunye: string[] = [];
  const appNo = (dosyaSatiri as any)?.application_no;
  const baslik = (dosyaSatiri as any)?.title;
  if (appNo) kunye.push(`<strong>Dosya No:</strong> ${esc(String(appNo))}`);
  if (baslik) kunye.push(`<strong>Uyuşmazlık konusu:</strong> ${esc(String(baslik))}`);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
  <body style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
    <p>Sayın ${esc(ad || "Taraf")},</p>
    ${kunye.length ? `<p>${kunye.join("<br>")}</p>` : ""}
    ${govdeHtml}
    <p>Saygılarımızla,${imza ? `<br>${esc(imza)}` : ""}</p>
    <p style="font-size:12px;color:#666">Bu ileti MediPact AI aracılığıyla gönderilmiştir.</p>
  </body></html>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "MİLAT Arabuluculuk <info@milatmediation.com>", to: [email], subject: konu, html }),
    });
    if (!res.ok) return { gonderildi: false, sebep: `HTTP ${res.status} ${(await res.text()).slice(0, 150)}` };
    return { gonderildi: true };
  } catch (e: any) {
    return { gonderildi: false, sebep: e?.message ?? String(e) };
  }
}

// Tarafın hatırlatma izni. Kolon henüz eklenmemişse (göç çalıştırılmadıysa)
// alan undefined döner ve izin VAR sayılır — bugünkü davranış korunur.
function hatirlatmaIzniVar(taraf: any): boolean {
  return (taraf as any)?.hatirlatma_izni !== false;
}

// 'taraf_musaitlik_iste': tarafın hiç müsaitlik kaydı yoksa bir kez istenir.
async function musaitlikGorevleriAc(admin: any, dosya: any, taraflar: any[]): Promise<{ acilan: number; sebepler: string[] }> {
  const sebepler: string[] = [];
  let acilan = 0;
  for (const t of taraflar) {
    const { data: araliklar, error } = await admin.from("taraf_musaitlik")
      .select("id").eq("party_id", t.id).limit(1);
    if (error) { sebepler.push(`müsaitlik istenemedi: taraf_musaitlik okunamadı — ${error.message}`); continue; }
    if (araliklar && araliklar.length > 0) continue;
    const r = await gorevAc(
      admin, dosya.id, "taraf_musaitlik_iste", `[musaitlik:${t.id}]`,
      "Tarafın müsait saat kaydı yok, kendisinden isteniyor",
      { hedefPartyId: t.id },
    );
    if (r.acildi) acilan++;
    else if (r.sebep && !r.sebep.includes("zaten açılmış")) sebepler.push(r.sebep);
  }
  return { acilan, sebepler };
}

async function musaitlikIsteYurut(admin: any, dosya: any, partyId: string): Promise<{ durum: string; sonuc: string }> {
  const { data: taraf } = await admin.from("case_parties").select("*").eq("id", partyId).maybeSingle();
  if (!taraf) return { durum: "atlandi", sonuc: "Taraf kaydı bulunamadı" };
  const { data: araliklar } = await admin.from("taraf_musaitlik").select("id").eq("party_id", partyId).limit(1);
  if (araliklar && araliklar.length > 0) return { durum: "atlandi", sonuc: "Taraf müsaitliğini bu arada girmiş" };
  if (!hatirlatmaIzniVar(taraf)) return { durum: "atlandi", sonuc: "Taraf hatırlatma iznini kapatmış" };

  const r = await tarafaEposta(admin, dosya, taraf,
    "Müsait saatlerinizi bildirir misiniz?",
    `<p>Görüşme saatini sizin uygunluğunuza göre planlayabilmemiz için dosya ekranınızdaki
      <strong>“Randevu Tercihlerim”</strong> bölümünden müsait gün ve saatlerinizi
      girmenizi rica ederiz.</p>
     <p>Dilerseniz aynı bölümden “randevuları benim adıma onaylayabilir” anahtarını açarak
      uygun saatlerinizle örtüşen teklifleri otomatik onaylatabilirsiniz.</p>`);
  if (!r.gonderildi) return { durum: "bekliyor", sonuc: `Müsaitlik istenemedi: ${r.sebep ?? "bilinmeyen hata"}` };
  return { durum: "yapildi", sonuc: "Taraftan müsait saatleri istendi" };
}

// 'teklif_degerlendir': tarafa açık teklif varken taraf ajanı devreye girer.
async function teklifDegerlendirGorevleriAc(admin: any, dosya: any): Promise<{ acilan: number; sebepler: string[] }> {
  const sebepler: string[] = [];
  let acilan = 0;
  const { data: teklifler, error } = await admin.from("randevu_teklifleri")
    .select("id, party_id, durum").eq("case_id", dosya.id).eq("durum", "beklemede").limit(20);
  if (error) {
    sebepler.push(`teklif değerlendirilemedi: teklifler okunamadı — ${error.message}`);
    return { acilan, sebepler };
  }
  for (const t of (teklifler ?? []) as any[]) {
    if (!t?.party_id) { sebepler.push("teklif değerlendirilemedi: teklifte taraf yok"); continue; }
    const r = await gorevAc(
      admin, dosya.id, "teklif_degerlendir", `[teklif:${t.id}]`,
      "Tarafa açık randevu teklifi var, taraf ajanı müsaitlikle karşılaştıracak",
      { hedefPartyId: String(t.party_id) },
    );
    if (r.acildi) acilan++;
    else if (r.sebep && !r.sebep.includes("zaten açılmış")) sebepler.push(r.sebep);
  }
  return { acilan, sebepler };
}

type TeklifSonuc = { durum: string; sonuc: string; otomatikOnay?: boolean; alternatif?: boolean };

async function teklifDegerlendirYurut(admin: any, dosya: any, gerekce: string, partyId: string): Promise<TeklifSonuc> {
  const m = /^\[teklif:([0-9a-f-]+)\]/i.exec(String(gerekce ?? ""));
  if (!m) return { durum: "atlandi", sonuc: "Teklif etiketi okunamadı" };
  const teklifId = m[1];

  const { data: teklif, error: tErr } = await admin.from("randevu_teklifleri")
    .select("id, token, durum, secenekler, party_id").eq("id", teklifId).maybeSingle();
  if (tErr) return { durum: "bekliyor", sonuc: `Teklif okunamadı: ${tErr.message}` };
  if (!teklif) return { durum: "atlandi", sonuc: "Teklif kaydı bulunamadı" };
  if (String((teklif as any).durum) !== "beklemede") return { durum: "atlandi", sonuc: "Teklif zaten cevaplanmış" };

  const { data: taraf } = await admin.from("case_parties").select("*").eq("id", partyId).maybeSingle();
  if (!taraf) return { durum: "atlandi", sonuc: "Taraf kaydı bulunamadı" };

  const { data: araliklar, error: mErr } = await admin.from("taraf_musaitlik")
    .select("gun, baslangic, bitis").eq("party_id", partyId).limit(500);
  if (mErr) return { durum: "bekliyor", sonuc: `Taraf müsaitliği okunamadı: ${mErr.message}` };
  const satirlar = (araliklar ?? []) as any[];
  if (satirlar.length === 0) {
    return { durum: "atlandi", sonuc: "Tarafın müsaitlik kaydı yok, teklif kendi cevabını bekliyor" };
  }

  const secenekler = (Array.isArray((teklif as any).secenekler) ? (teklif as any).secenekler : [])
    .map((s: any) => ({ gun: String(s?.gun ?? "").slice(0, 10), saat: String(s?.saat ?? "").slice(0, 5) }))
    .filter((s: any) => s.gun && s.saat);
  const uyan = secenekler.find((s: any) => satirlar.some((a) =>
    String(a.gun).slice(0, 10) === s.gun &&
    s.saat >= String(a.baslangic).slice(0, 5) &&
    s.saat < String(a.bitis).slice(0, 5)
  ));

  // (a) Saat uyuyor VE otomatik onay açık → mevcut "Uygun" akışı iç kapıdan koşar.
  if (uyan && (taraf as any).otomatik_onay === true) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/randevu-teklif`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": CRON_SECRET,
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ action: "cevapla", token: (teklif as any).token, secim: `${uyan.gun} ${uyan.saat}` }),
      });
      const govde = await res.json().catch(() => ({}));
      if (!res.ok || (govde as any)?.error) {
        return { durum: "bekliyor", sonuc: `Otomatik onay yazılamadı: ${String((govde as any)?.error ?? res.status)}` };
      }
      return { durum: "yapildi", sonuc: `Taraf ajanı ${uyan.gun} ${uyan.saat} saatini taraf adına onayladı`, otomatikOnay: true };
    } catch (e: any) {
      return { durum: "bekliyor", sonuc: `Otomatik onay iç çağrısı başarısız: ${e?.message ?? e}` };
    }
  }

  // (b) Saat uyuyor ama otomatik onay kapalı → tarafa tek seferlik hatırlatma.
  if (uyan) {
    if (!hatirlatmaIzniVar(taraf)) {
      return { durum: "atlandi", sonuc: "Uygun saat bulundu ama taraf hatırlatma iznini kapatmış" };
    }
    const r = await tarafaEposta(admin, dosya, taraf,
      "Ajanınız uygun bir saat buldu",
      `<p>Dosya asistanınız, size iletilen randevu teklifindeki
        <strong>${trTarihMetni(uyan.gun)} · ${uyan.saat}</strong> saatinin girdiğiniz müsaitlik
        aralığınıza uyduğunu tespit etti.</p>
       <p>Onaylıyor musunuz? Size gönderilen randevu bağlantısından tek dokunuşla
        cevaplayabilirsiniz.</p>`);
    if (!r.gonderildi) return { durum: "bekliyor", sonuc: `Hatırlatma gönderilemedi: ${r.sebep ?? "bilinmeyen hata"}` };
    return { durum: "yapildi", sonuc: `Uygun saat (${uyan.gun} ${uyan.saat}) için tarafa onay hatırlatması gönderildi` };
  }

  // (c) Hiçbir saat uymuyor → teklif "uymuyor" olarak İŞLENMEZ; tarafın kendi
  // aralıklarından en yakın üç saat ALTERNATİF olarak panoya yazılır. Panoya giden
  // tek bilgi bu saatlerdir; tarafın başka hiçbir verisi süreç ajanına geçmez.
  const bugun = new Date(Date.now() + TR_OFFSET_MS).toISOString().slice(0, 10);
  const adaylar = satirlar
    .map((a) => ({ gun: String(a.gun).slice(0, 10), saat: String(a.baslangic).slice(0, 5) }))
    .filter((a) => a.gun >= bugun)
    .sort((x, y) => (x.gun === y.gun ? x.saat.localeCompare(y.saat) : x.gun.localeCompare(y.gun)))
    .slice(0, 3);
  if (adaylar.length === 0) {
    return { durum: "atlandi", sonuc: "Teklif tarafın müsaitliğine uymuyor ve ileri tarihli boş aralığı yok" };
  }
  const yazim = await gorevAc(
    admin, dosya.id, "taraf_alternatif_saat", `[alternatif:${teklifId}]`,
    "Taraf ajanının önerdiği alternatif saatler — sonraki teklif bunlardan seçilir",
    { hedefPartyId: partyId },
  );
  if (!yazim.acildi && !String(yazim.sebep ?? "").includes("zaten açılmış")) {
    return { durum: "bekliyor", sonuc: `Alternatif saatler yazılamadı: ${yazim.sebep ?? ""}` };
  }
  // Saatler sonuc alanına makine okunur JSON olarak konur (randevu-teklif okur).
  const { data: altSatir } = await admin.from("ajan_gorevleri")
    .select("id, gerekce").eq("case_id", dosya.id).eq("gorev_tipi", "taraf_alternatif_saat")
    .eq("hedef_party_id", partyId).limit(50);
  const hedefSatir = ((altSatir ?? []) as any[]).find((r) => String(r?.gerekce ?? "").startsWith(`[alternatif:${teklifId}]`));
  if (hedefSatir?.id) {
    await admin.from("ajan_gorevleri")
      .update({ sonuc: JSON.stringify({ alternatifler: adaylar }) }).eq("id", hedefSatir.id);
  }
  return {
    durum: "yapildi",
    sonuc: `Teklif tarafın müsaitliğine uymuyor; ${adaylar.length} alternatif saat panoya yazıldı`,
    alternatif: true,
  };
}

// 'taraf_eksik_bilgi': tarafın dosyasında hiç belge yoksa bir kez nazikçe istenir.
// Beklenen-belge listeleri (evrak tespit ajanı) gelene kadar ölçüt budur.
async function eksikBilgiGorevleriAc(admin: any, dosya: any, taraflar: any[]): Promise<{ acilan: number; sebepler: string[] }> {
  const sebepler: string[] = [];
  let acilan = 0;
  for (const t of taraflar) {
    const { data: belgeler, error } = await admin.from("case_documents")
      .select("id").eq("case_id", dosya.id).eq("party_id", t.id).limit(1);
    if (error) { sebepler.push(`eksik bilgi istenemedi: belgeler okunamadı — ${error.message}`); continue; }
    if (belgeler && belgeler.length > 0) continue;
    const r = await gorevAc(
      admin, dosya.id, "taraf_eksik_bilgi", `[eksik:${t.id}]`,
      "Tarafın kendi belgesi yok, kendisinden isteniyor",
      { hedefPartyId: t.id },
    );
    if (r.acildi) acilan++;
    else if (r.sebep && !r.sebep.includes("zaten açılmış")) sebepler.push(r.sebep);
  }
  return { acilan, sebepler };
}

async function eksikBilgiYurut(admin: any, dosya: any, partyId: string): Promise<{ durum: string; sonuc: string }> {
  const { data: taraf } = await admin.from("case_parties").select("*").eq("id", partyId).maybeSingle();
  if (!taraf) return { durum: "atlandi", sonuc: "Taraf kaydı bulunamadı" };
  const { data: belgeler } = await admin.from("case_documents")
    .select("id").eq("case_id", dosya.id).eq("party_id", partyId).limit(1);
  if (belgeler && belgeler.length > 0) return { durum: "atlandi", sonuc: "Taraf bu arada belge yüklemiş" };
  if (!hatirlatmaIzniVar(taraf)) return { durum: "atlandi", sonuc: "Taraf hatırlatma iznini kapatmış" };

  const r = await tarafaEposta(admin, dosya, taraf,
    "Dosyanıza belge ekleyebilir misiniz?",
    `<p>Sürecin sağlıklı ilerleyebilmesi için dosyanıza ilişkin belgelerinizi
      (sözleşme, yazışma, fatura, bordro gibi) dosya ekranınızdaki
      <strong>“Belgelerim”</strong> bölümünden yükleyebilirsiniz.</p>
     <p>Belge yüklemek zorunlu değildir; yüklediğiniz belgeler yalnız sizin ve
      arabulucunun görebileceği şekilde saklanır.</p>`);
  if (!r.gonderildi) return { durum: "bekliyor", sonuc: `Eksik bilgi istenemedi: ${r.sebep ?? "bilinmeyen hata"}` };
  return { durum: "yapildi", sonuc: "Taraftan belge/bilgi istendi" };
}

/* ─────────────────────────────────────────────────────────────────────────────
   TUR C-1 — İLK TEMAS, KATILIM TEYİDİ, ÇOKLU VE ÖZEL OTURUM
   ──────────────────────────────────────────────────────────────────────────── */

// Uygulamanın taraf yüzeyi adresi (davet/randevu bağlantılarıyla aynı liste).
function uygulamaAdresi(): string {
  const liste = (Deno.env.get("APP_ALLOWED_ORIGINS") ?? "https://medipact-ai.lovable.app")
    .split(",").map((s) => s.trim()).filter(Boolean);
  return liste[0];
}

// 'ilk_temas': dosyaya eklenen her tarafa TEK KEZ bilgilendirme + katılım sorusu.
async function ilkTemasGorevleriAc(admin: any, dosya: any, taraflar: any[]): Promise<{ acilan: number; sebepler: string[] }> {
  const sebepler: string[] = [];
  let acilan = 0;
  for (const t of taraflar) {
    if (String((t as any).katilim_durumu ?? "beklemede") !== "beklemede") continue;
    const r = await gorevAc(
      admin, dosya.id, "ilk_temas", `[ilktemas:${t.id}]`,
      "Tarafa süreç bilgilendirmesi ve katılım sorusu gönderilecek",
      { hedefPartyId: t.id },
    );
    if (r.acildi) acilan++;
    else if (r.sebep && !r.sebep.includes("zaten açılmış")) sebepler.push(r.sebep);
  }
  return { acilan, sebepler };
}

async function ilkTemasYurut(admin: any, dosya: any, partyId: string): Promise<{ durum: string; sonuc: string }> {
  const { data: taraf } = await admin.from("case_parties").select("*").eq("id", partyId).maybeSingle();
  if (!taraf) return { durum: "atlandi", sonuc: "Taraf kaydı bulunamadı" };
  if (String((taraf as any).katilim_durumu ?? "beklemede") !== "beklemede") {
    return { durum: "atlandi", sonuc: "Taraf katılım cevabını bu arada vermiş" };
  }
  if (!String((taraf as any).email ?? "").trim()) {
    return { durum: "atlandi", sonuc: "Tarafın e-posta adresi yok, ilk temas gönderilemedi" };
  }

  // Token bir kez üretilir; varsa yeniden kullanılır (mükerrer bağlantı çıkmaz).
  let token = String((taraf as any).katilim_token ?? "").trim();
  if (!token) {
    token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
    const { error: tErr } = await admin.from("case_parties")
      .update({ katilim_token: token } as any).eq("id", partyId);
    if (tErr) return { durum: "bekliyor", sonuc: `Katılım anahtarı yazılamadı: ${tErr.message}` };
  }
  const link = `${uygulamaAdresi()}/katilim/${token}`;

  const { imza } = await imzaBlogu(admin, dosya.id);
  const arabulucuSatiri = imza ? `<p><strong>Arabulucu:</strong> ${imza}</p>` : "";
  const r = await tarafaEposta(admin, dosya, taraf,
    "Arabuluculuk süreci hakkında bilgilendirme",
    `${arabulucuSatiri}
     <p>Yukarıda künyesi yazılı uyuşmazlıkta arabuluculuk süreci başlatılmıştır ve siz bu
      sürece taraf olarak davet edildiniz.</p>
     <p>Arabuluculuk, tarafların bir arabulucu eşliğinde anlaşmaya çalıştığı GİZLİ bir
      süreçtir. Süreçte paylaştığınız bilgiler karşı tarafa açılmaz; kararı taraflar verir.</p>
     <p>Katılım durumunuzu tek dokunuşla bildirebilirsiniz:<br>
      <a href="${link}">${link}</a></p>`);
  if (!r.gonderildi) return { durum: "bekliyor", sonuc: `İlk temas gönderilemedi: ${r.sebep ?? "bilinmeyen hata"}` };
  return { durum: "yapildi", sonuc: "Tarafa bilgilendirme ve katılım sorusu gönderildi" };
}

// Katılım cevaplarının işlenmesi. "Katılmıyorum" ve "Bilgi istiyorum" cevapları
// panoya ve arabulucuya taşınır; ajan taraf adına hukuki açıklama YAPMAZ.
async function katilimCevaplariniIsle(admin: any, dosya: any, taraflar: any[]): Promise<{ islenen: number; sebepler: string[] }> {
  const sebepler: string[] = [];
  let islenen = 0;
  for (const t of taraflar) {
    const durum = String((t as any).katilim_durumu ?? "beklemede");
    if (durum === "katilmiyor") {
      const r = await onayGoreviAc(
        admin, dosya, `[onay:katilmiyor:${t.id}]`,
        "Taraf sürece katılmadığını bildirdi — ajan bu dosyada randevu açmıyor",
        "Taraf katılmıyor",
      );
      if (r.acildi) islenen++;
      sebepler.push("randevu açılmadı: taraf sürece katılmadığını bildirdi");
    } else if (durum === "bilgi_istiyor") {
      const r = await onayGoreviAc(
        admin, dosya, `[onay:bilgi_istiyor:${t.id}]`,
        "Taraf süreç hakkında bilgi istiyor — açıklamayı arabulucu yapar",
        "Taraf bilgi istiyor",
      );
      if (r.acildi) islenen++;
    }
  }
  return { islenen, sebepler };
}

// 'ek_oturum_gerekli_mi': yapılmış oturum varken dosya kapanmadıysa arabulucuya sorulur.
async function ekOturumSorusuAc(admin: any, dosya: any): Promise<{ acilan: number; sebepler: string[] }> {
  const sebepler: string[] = [];
  const kapali = dosya?.status === "agreed" || dosya?.status === "failed";
  if (kapali) return { acilan: 0, sebepler: ["ek oturum sorulmadı: dosya kapanmış"] };

  const { data: yapilanlar, error } = await admin.from("case_sessions")
    .select("id, scheduled_at").eq("case_id", dosya.id).eq("status", "completed")
    .order("scheduled_at", { ascending: false }).limit(1);
  if (error) return { acilan: 0, sebepler: [`ek oturum sorulamadı: oturumlar okunamadı — ${error.message}`] };
  const son = ((yapilanlar ?? []) as any[])[0];
  if (!son) return { acilan: 0, sebepler: ["ek oturum sorulmadı: yapıldı işaretli oturum yok"] };

  // Sonraki oturum zaten planlandıysa soru açılmaz.
  const { data: planli } = await admin.from("case_sessions")
    .select("id").eq("case_id", dosya.id).eq("status", "scheduled")
    .gt("scheduled_at", new Date().toISOString()).limit(1);
  if (planli && planli.length > 0) {
    return { acilan: 0, sebepler: ["ek oturum sorulmadı: gelecekte planlı oturum var"] };
  }

  const { gun, saat } = trGunSaat(String(son.scheduled_at));
  const r = await onayGoreviAc(
    admin, dosya, `[onay:ek_oturum:${son.id}]`,
    `${trTarihMetni(gun)} ${saat} oturumu yapıldı — ikinci oturum gerekli mi?`,
    "İkinci oturum gerekli mi?",
  );
  if (r.acildi) return { acilan: 1, sebepler };
  if (r.sebep && !r.sebep.includes("zaten açılmış")) sebepler.push(r.sebep);
  return { acilan: 0, sebepler };
}

// Arabulucu "gerekli" dediyse (onay görevi 'yapildi') randevu hattı yeniden başlar.
// "Gerekli değil" (atlandi) hâlinde ajan yeni randevu açmaz; dosya kapanış hattına
// aşama geçişi kolundan ilerler.
async function ekOturumKararlariniIsle(admin: any, dosya: any): Promise<{ acilan: number; sebepler: string[] }> {
  const sebepler: string[] = [];
  const { data: gorevler, error } = await admin.from("ajan_gorevleri")
    .select("id, gerekce, durum, sonuc").eq("case_id", dosya.id)
    .eq("gorev_tipi", "arabulucu_onayi").eq("durum", "yapildi").limit(50);
  if (error) return { acilan: 0, sebepler: [`ek oturum kararı okunamadı: ${error.message}`] };

  let acilan = 0;
  for (const g of (gorevler ?? []) as any[]) {
    const gerekce = String(g?.gerekce ?? "");
    if (!gerekce.startsWith("[onay:ek_oturum:")) continue;
    // Karar bir kez uygulanır: uygulandığında sonuc alanına işaret düşer.
    if (String(g?.sonuc ?? "").includes("randevu hattı yeniden başlatıldı")) continue;

    const r = await randevuGoreviAc(admin, dosya);
    if (r.acildi) {
      acilan++;
      await admin.from("ajan_gorevleri")
        .update({ sonuc: `${String(g?.sonuc ?? "Arabulucu onayladı")} · randevu hattı yeniden başlatıldı` })
        .eq("id", g.id);
    } else if (r.sebep) {
      sebepler.push(`ek oturum randevusu açılamadı: ${r.sebep}`);
    }
  }
  return { acilan, sebepler };
}

// ── KÖR TEKLİF v2 — KOŞULLU ARALIK / BRAKETLEME (Tur C-2) ───────────────────
// Ajan taraflara HİÇBİR rakam vermez. Yaptığı üç şey vardır:
//  1) Braketler girildiğinde/değiştiğinde bunu kayda alır (denetim izi).
//  2) İki taraf da tam aralık girdiyse örtüşmeyi hesaplar — sonuç YALNIZ arabulucuya
//     görünen denetim izine yazılır, tarafa hiçbir yüzeyden dönmez.
//  3) Koşullu taahhüt varsa karşı tarafa YALNIZ bandı sorar ("şu aralığı düşünür
//     müsünüz?"); taahhüdün kendisi (inilecek tutar) sorunun içine girmez.
// Karşı taraf reddederse taahhüt otomatik düşer; reddeden taraf, karşı tarafın inmeye
// razı olduğunu hiçbir yüzeyden öğrenmez.
type BraketOzet = {
  braket_girildi: number;
  ortusme_bulundu: number;
  bant_sorusu_gonderildi: number;
  taahhut_dustu: number;
  sebepler: string[];
};

async function braketIziYaz(admin: any, caseId: string, partyId: string | null, olay: string, detay: any) {
  const { error } = await admin.from("braket_denetim_izi").insert({
    case_id: caseId, party_id: partyId, olay, detay,
  });
  if (error) console.error(`[ajan-nobetci] braket izi yazılamadı (${olay}): ${error.message}`);
}

async function braketKollari(admin: any, dosya: any, taraflar: any[]): Promise<BraketOzet> {
  const ozet: BraketOzet = {
    braket_girildi: 0, ortusme_bulundu: 0, bant_sorusu_gonderildi: 0, taahhut_dustu: 0, sebepler: [],
  };

  const { data: braketler, error } = await admin.from("teklif_braketleri")
    .select("id, party_id, alt_sinir, ust_sinir, para_birimi, kosul_bant_alt, kosul_bant_ust, kosullu_deger, kosul_durumu, ajan_islendi_at, updated_at")
    .eq("case_id", dosya.id).limit(20);
  if (error) {
    ozet.sebepler.push(`braket kolu çalışmadı: braketler okunamadı — ${error.message}`);
    return ozet;
  }
  const liste = (braketler ?? []) as any[];
  if (liste.length === 0) return ozet;

  // 1) Yeni girilen / güncellenen braketler
  for (const b of liste) {
    const gorulmedi = !b.ajan_islendi_at || String(b.ajan_islendi_at) < String(b.updated_at);
    if (!gorulmedi) continue;
    const { error: uErr } = await admin.from("teklif_braketleri")
      .update({ ajan_islendi_at: new Date().toISOString() }).eq("id", b.id);
    if (uErr) { ozet.sebepler.push(`braket işaretlenemedi: ${uErr.message}`); continue; }
    ozet.braket_girildi++;
  }

  // 2) Örtüşme — yalnız arabulucuya. Aynı bant için iz bir kez yazılır.
  const tam = liste.filter((b) => b.alt_sinir !== null && b.ust_sinir !== null);
  if (tam.length >= 2) {
    const lower = Math.max(...tam.map((b) => Number(b.alt_sinir)));
    const upper = Math.min(...tam.map((b) => Number(b.ust_sinir)));
    const paraBirimi = String(tam[0]?.para_birimi ?? "TRY");
    if (upper >= lower) {
      const imza = `${lower}|${upper}|${tam.length}`;
      const { data: varMi, error: iErr } = await admin.from("braket_denetim_izi")
        .select("id").eq("case_id", dosya.id).eq("olay", "ortusme_bulundu")
        .eq("detay->>imza", imza).limit(1);
      if (iErr) ozet.sebepler.push(`örtüşme izi okunamadı: ${iErr.message}`);
      else if (!varMi || varMi.length === 0) {
        await braketIziYaz(admin, dosya.id, null, "ortusme_bulundu", {
          imza, bant_alt: lower, bant_ust: upper, para_birimi: paraBirimi, taraf_sayisi: tam.length,
        });
        ozet.ortusme_bulundu++;
      }
    }
  } else if (liste.length > 0) {
    ozet.sebepler.push("örtüşme hesaplanmadı: her iki tarafın da tam aralığı girilmemiş");
  }

  // 3) Koşullu taahhütler → karşı tarafa bant sorusu
  for (const b of liste) {
    if (String(b.kosul_durumu ?? "yok") !== "aktif") continue;
    if (b.kosul_bant_alt === null || b.kosul_bant_ust === null) {
      ozet.sebepler.push("bant sorusu gönderilmedi: koşullu taahhütte bant eksik");
      continue;
    }
    const hedefler = taraflar.filter((t: any) => String(t.id) !== String(b.party_id));
    if (hedefler.length === 0) {
      ozet.sebepler.push("bant sorusu gönderilmedi: dosyada karşı taraf yok");
      continue;
    }
    const { data: acik, error: aErr } = await admin.from("braket_bant_sorulari")
      .select("id").eq("kaynak_braket_id", b.id).eq("durum", "soruldu").limit(1);
    if (aErr) { ozet.sebepler.push(`bant sorusu okunamadı: ${aErr.message}`); continue; }
    if (acik && acik.length > 0) continue;

    let yazilan = 0;
    for (const h of hedefler) {
      const { error: sErr } = await admin.from("braket_bant_sorulari").insert({
        case_id: dosya.id,
        hedef_party_id: h.id,
        kaynak_braket_id: b.id,
        bant_alt: b.kosul_bant_alt,
        bant_ust: b.kosul_bant_ust,
        para_birimi: b.para_birimi ?? "TRY",
        durum: "soruldu",
      });
      if (sErr) { ozet.sebepler.push(`bant sorusu yazılamadı: ${sErr.message}`); continue; }
      await braketIziYaz(admin, dosya.id, h.id, "bant_sorusu_gonderildi", {
        bant_alt: b.kosul_bant_alt, bant_ust: b.kosul_bant_ust, para_birimi: b.para_birimi ?? "TRY",
      });
      yazilan++;
      ozet.bant_sorusu_gonderildi++;
    }
    if (yazilan > 0) {
      await admin.from("teklif_braketleri").update({ kosul_durumu: "soruldu" }).eq("id", b.id);
    }
  }

  // 4) Cevapların işlenmesi — ret hâlinde taahhüt düşer, kaynağa bilgi sızmaz.
  const { data: cevaplar, error: cErr } = await admin.from("braket_bant_sorulari")
    .select("id, kaynak_braket_id, durum")
    .eq("case_id", dosya.id).in("durum", ["kabul", "ret"]).is("islendi_at", null).limit(50);
  if (cErr) {
    ozet.sebepler.push(`bant cevapları okunamadı: ${cErr.message}`);
    return ozet;
  }
  for (const c of (cevaplar ?? []) as any[]) {
    const braket = liste.find((b) => String(b.id) === String(c.kaynak_braket_id));
    const yeniDurum = c.durum === "ret" ? "dustu" : "kabul";
    if (braket && String(braket.kosul_durumu) !== yeniDurum) {
      const { error: uErr } = await admin.from("teklif_braketleri")
        .update({ kosul_durumu: yeniDurum }).eq("id", c.kaynak_braket_id);
      if (uErr) { ozet.sebepler.push(`taahhüt durumu yazılamadı: ${uErr.message}`); continue; }
      await braketIziYaz(admin, dosya.id, braket.party_id,
        yeniDurum === "dustu" ? "taahhut_dustu" : "taahhut_kabul",
        { soru_id: c.id, bant_alt: braket.kosul_bant_alt, bant_ust: braket.kosul_bant_ust });
      if (yeniDurum === "dustu") ozet.taahhut_dustu++;
    }
    await admin.from("braket_bant_sorulari")
      .update({ islendi_at: new Date().toISOString() }).eq("id", c.id);
  }

  return ozet;
}

/* ─────────────────────────────────────────────────────────────────────────────
   KAYIT SİLME KOLU (İBA 1.8 / B18 · constitution m.10 süresiz saklama yasağı)
   · Ses kaydı: süreç bitiminden 24 SAAT sonra kalıcı silinir (dosya + satır).
   · Döküm: süreç sonuna kadar durur, süreç bitince silinir.
   Silme AJANIN turunda otomatik yapılır ve kayda yazılır: satırdaki silinme
   zamanı + silme notu, ayrıca "yapılmayanlar" listesine gerekçe düşer.
   Kayıt/döküm hattı henüz kurulmadığı için tablo boşsa kol sessizce geçer.
   ──────────────────────────────────────────────────────────────────────────── */
const KAYIT_BUCKET = "oturum-kayitlari";

async function kayitSilmeKollari(
  admin: any, dosya: any,
): Promise<{ ses_silindi: number; dokum_silindi: number; sebepler: string[] }> {
  const sebepler: string[] = [];
  let sesSilindi = 0;
  let dokumSilindi = 0;

  const { data: kayitlar, error } = await admin.from("oturum_kayitlari")
    .select("id, session_id, ses_dosya_yolu, dokum_metni, ses_silindi_at, dokum_silindi_at")
    .eq("case_id", dosya.id)
    .or("ses_silindi_at.is.null,dokum_silindi_at.is.null")
    .limit(50);
  if (error) {
    sebepler.push(`kayıt silme kolu çalışmadı: kayıtlar okunamadı — ${error.message}`);
    return { ses_silindi: 0, dokum_silindi: 0, sebepler };
  }
  const bekleyen = (kayitlar ?? []) as any[];
  if (bekleyen.length === 0) return { ses_silindi: 0, dokum_silindi: 0, sebepler };

  const kapali = dosya?.status === "agreed" || dosya?.status === "failed";
  if (!kapali) {
    sebepler.push(`kayıt silinmedi: süreç sürüyor (${bekleyen.length} kayıt bekliyor)`);
    return { ses_silindi: 0, dokum_silindi: 0, sebepler };
  }
  const bitisIso = dosya?.closed_at ?? null;
  const bitis = bitisIso ? new Date(String(bitisIso)).getTime() : NaN;
  if (!Number.isFinite(bitis)) {
    // Tahmini bitiş zamanı ÜRETİLMEZ; silme sayacı başlatılmaz, sebep kayda geçer.
    sebepler.push("kayıt silinmedi: sürecin bitiş zamanı (closed_at) boş — 24 saat sayacı başlatılamadı");
    return { ses_silindi: 0, dokum_silindi: 0, sebepler };
  }
  const simdi = Date.now();
  const sesSilmeZamani = bitis + 24 * 3600 * 1000;

  for (const k of bekleyen) {
    // Döküm: süreç bittiğinde (son tutanakla birlikte) silinir.
    if (!k.dokum_silindi_at) {
      const { error: dErr } = await admin.from("oturum_kayitlari").update({
        dokum_metni: null,
        dokum_silindi_at: new Date().toISOString(),
        dokum_silme_notu: `Döküm süreç sonunda silindi (süreç bitişi ${String(bitisIso)}).`,
      }).eq("id", k.id);
      if (dErr) sebepler.push(`döküm silinemedi (${k.id}): ${dErr.message}`);
      else dokumSilindi++;
    }
    // Ses: süreç bitiminden 24 saat sonra.
    if (!k.ses_silindi_at) {
      if (simdi < sesSilmeZamani) {
        sebepler.push(`ses kaydı silinmedi (${k.id}): süreç bitiminden 24 saat geçmedi`);
        continue;
      }
      if (k.ses_dosya_yolu) {
        const { error: sErr } = await admin.storage.from(KAYIT_BUCKET).remove([String(k.ses_dosya_yolu)]);
        if (sErr) { sebepler.push(`ses dosyası silinemedi (${k.id}): ${sErr.message}`); continue; }
      }
      const { error: uErr } = await admin.from("oturum_kayitlari").update({
        ses_dosya_yolu: null,
        ses_silindi_at: new Date().toISOString(),
        ses_silme_notu: `Ses kaydı süreç bitiminden 24 saat sonra kalıcı silindi (süreç bitişi ${String(bitisIso)}).`,
      }).eq("id", k.id);
      if (uErr) sebepler.push(`ses silme kaydı yazılamadı (${k.id}): ${uErr.message}`);
      else sesSilindi++;
    }
  }
  return { ses_silindi: sesSilindi, dokum_silindi: dokumSilindi, sebepler };
}

// 'ozel_oturum': arabulucunun ekrandan açtığı görev. Ajan YALNIZ o tarafa teklif
// gönderir; seçeneklere ozel_oturum işareti konur ve randevu-teklif cevabı
// işlerken oturumu session_type='private' olarak açar. Özel oturumun varlığı,
// saati ve içeriği karşı tarafa hiçbir yüzeyden gösterilmez.
async function ozelOturumYurut(admin: any, dosya: any, partyId: string): Promise<{ durum: string; sonuc: string }> {
  const { data: taraf } = await admin.from("case_parties")
    .select("id, case_id, katilim_durumu").eq("id", partyId).maybeSingle();
  if (!taraf || String((taraf as any).case_id) !== String(dosya.id)) {
    return { durum: "atlandi", sonuc: "Taraf bu dosyaya ait değil" };
  }
  if (String((taraf as any).katilim_durumu ?? "beklemede") === "katilmiyor") {
    return { durum: "atlandi", sonuc: "Taraf sürece katılmadığını bildirdi" };
  }
  if (!CRON_SECRET) return { durum: "bekliyor", sonuc: "CRON_SECRET tanımlı değil, iç çağrı yapılamadı" };

  const icBaslik = {
    "Content-Type": "application/json",
    "x-cron-secret": CRON_SECRET,
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  };
  try {
    const oRes = await fetch(`${SUPABASE_URL}/functions/v1/randevu-teklif`, {
      method: "POST", headers: icBaslik,
      body: JSON.stringify({ action: "oner", case_id: dosya.id, party_id: partyId }),
    });
    const oBody = await oRes.json().catch(() => ({}));
    if (!oRes.ok) return { durum: "bekliyor", sonuc: `Saat önerisi alınamadı (HTTP ${oRes.status})` };
    if ((oBody as any)?.error === "musaitlik_yok") return { durum: "atlandi", sonuc: "Takvimde uygun boş saat yok" };
    if ((oBody as any)?.error) return { durum: "bekliyor", sonuc: `Saat önerisi alınamadı: ${String((oBody as any).error).slice(0, 200)}` };
    const onerilen = Array.isArray((oBody as any)?.secenekler) ? (oBody as any).secenekler : [];
    if (onerilen.length === 0) return { durum: "atlandi", sonuc: "Takvimde uygun boş saat yok" };

    const secenekler = onerilen.map((s: any) => ({
      gun: String(s?.gun ?? "").slice(0, 10),
      saat: String(s?.saat ?? "").slice(0, 5),
      oturum_tipi: "online",
      ozel_oturum: true,
    }));
    const res = await fetch(`${SUPABASE_URL}/functions/v1/randevu-teklif`, {
      method: "POST", headers: icBaslik,
      body: JSON.stringify({ action: "olustur", case_id: dosya.id, party_id: partyId, secenekler }),
    });
    const govde = await res.json().catch(() => ({}));
    if (!res.ok || (govde as any)?.error) {
      return { durum: "bekliyor", sonuc: `Özel oturum daveti oluşturulamadı: ${String((govde as any)?.error ?? res.status)}` };
    }
    return { durum: "yapildi", sonuc: "Özel oturum daveti yalnız ilgili tarafa gönderildi" };
  } catch (e: any) {
    return { durum: "bekliyor", sonuc: `İç çağrı başarısız: ${e?.message ?? e}` };
  }
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

/* ─────────────────────────────────────────────────────────────────────────────
   OTOMATİK KOŞUM (16.08) — analiz kolları arabulucu düğmeye basmadan çalışır.
   Kural seti:
   · Her kolun KOŞUM KOŞULU vardır; koşul sağlanmıyorsa çağrı yapılmaz.
   · MÜKERRER KOŞUM ENGELİ: kolun beslendiği veriden bir GİRDİ İMZASI çıkarılır ve
     ajan_kosum_izi'ne yazılır. İmza aynıysa yeniden koşulmaz (maliyet kuralı).
   · TUR SINIRI: nöbetçi tek turda EN FAZLA 3 ücretli çağrı yapar (tüm dosyalar
     toplamında). Sınır dolunca kalanlar "sonraki turda koşulacak" diye yazılır.
   · Hata üç kez üst üste olursa kol o dosya için 'atlandi' işaretlenir.
   · Her başarılı koşum ajan_gorevleri'ne 'otomatik_analiz' satırı düşer.
   · İÇ KAPI: yalnız x-cron-secret kabul eden fonksiyonlar nöbetçiden çağrılabilir.
     Kabul etmeyen fonksiyonlar (elverislilik · usul-onerisi · iletisim-degisim ·
     dosya-ozeti-oner) 'atlandi' yazılır ve sebebi kayda geçer — sessiz hata yok.
   ──────────────────────────────────────────────────────────────────────────── */
const OTOMATIK_TUR_SINIRI = 3;

type Butce = { kalan: number };

// icKapi=false olan fonksiyonlar bugün iç çağrı (x-cron-secret) kabul etmiyor;
// koda dokunulmadığı için nöbetçiden çalıştırılamıyorlar.
const OTOMATIK_KOLLAR: { kol: string; fonksiyon: string; icKapi: boolean }[] = [
  { kol: "elverislilik", fonksiyon: "elverislilik", icKapi: false },
  { kol: "belge-ozeti", fonksiyon: "belge-ozeti", icKapi: true },
  { kol: "olay-cizelgesi", fonksiyon: "olay-cizelgesi", icKapi: true },
  { kol: "guc-dengesi", fonksiyon: "guc-dengesi", icKapi: true },
  { kol: "usul-onerisi", fonksiyon: "usul-onerisi", icKapi: false },
  { kol: "iletisim-degisim", fonksiyon: "iletisim-degisim", icKapi: false },
  { kol: "dosya-ozeti-oner", fonksiyon: "dosya-ozeti-oner", icKapi: false },
];

async function kosumIziOku(admin: any, caseId: string): Promise<Record<string, any>> {
  const { data, error } = await admin.from("ajan_kosum_izi")
    .select("kol, girdi_imzasi, durum, sebep, kosum_zamani").eq("case_id", caseId).limit(100);
  if (error) {
    console.error(`[ajan-nobetci] koşum izi okunamadı (${caseId}): ${error.message}`);
    return {};
  }
  const harita: Record<string, any> = {};
  for (const r of ((data ?? []) as any[])) harita[String(r.kol)] = r;
  return harita;
}

async function kosumIziYaz(
  admin: any, caseId: string, kol: string, imza: string, durum: string, sebep: string,
) {
  const { error } = await admin.from("ajan_kosum_izi").upsert({
    case_id: caseId, kol, girdi_imzasi: imza, durum,
    sebep: sebep.slice(0, 500), kosum_zamani: new Date().toISOString(),
  }, { onConflict: "case_id,kol" });
  if (error) console.error(`[ajan-nobetci] koşum izi yazılamadı (${caseId}/${kol}): ${error.message}`);
}

// Önceki sebep metnindeki hata sayacı ("hata 2/3") okunur; yoksa 0.
function hataSayaci(sebep: string): number {
  const m = String(sebep ?? "").match(/hata (\d+)\/3/);
  return m ? Number(m[1]) : 0;
}

async function icFonksiyonCagir(fonksiyon: string, govde: unknown): Promise<{ ok: boolean; sebep: string }> {
  if (!CRON_SECRET) return { ok: false, sebep: "CRON_SECRET tanımlı değil, iç çağrı yapılamadı" };
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fonksiyon}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": CRON_SECRET,
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify(govde),
    });
    const metinGovde = await res.text();
    if (!res.ok) return { ok: false, sebep: `HTTP ${res.status}: ${metinGovde.slice(0, 200)}` };
    return { ok: true, sebep: metinGovde.slice(0, 200) };
  } catch (e: any) {
    return { ok: false, sebep: e?.message ?? "bilinmeyen hata" };
  }
}

type OtomatikOzet = { kosuldu: number; atlandi: number; hata: number; sebepler: string[] };

async function otomatikKosumKollari(admin: any, dosya: any, butce: Butce): Promise<OtomatikOzet> {
  const ozet: OtomatikOzet = { kosuldu: 0, atlandi: 0, hata: 0, sebepler: [] };
  const caseId = String(dosya.id);

  // ── Koşum koşullarının dayandığı kayıtlar (tek seferde okunur) ──────────
  const [taraflarRes, belgelerRes, orkestratorRes] = await Promise.all([
    admin.from("case_parties").select("id, user_id, statement, created_at").eq("case_id", caseId).limit(30),
    admin.from("case_documents").select("id, party_id, extraction_status, created_at").eq("case_id", caseId).limit(200),
    admin.from("agent_states").select("status, updated_at")
      .eq("case_id", caseId).eq("agent_type", "orchestrator").eq("status", "completed").limit(1),
  ]);
  const taraflar = (taraflarRes.data ?? []) as any[];
  const belgeler = (belgelerRes.data ?? []) as any[];
  const metinliBelgeler = belgeler.filter((d) => String(d.extraction_status ?? "") === "tamam");
  const orkestratorTamam = ((orkestratorRes.data ?? []) as any[])[0] ?? null;

  const enSonBelge = metinliBelgeler
    .map((d) => String(d.created_at ?? ""))
    .sort()
    .slice(-1)[0] ?? "-";
  const beyanli = taraflar.filter((t) => String(t.statement ?? "").trim().length > 40).length;
  const konuUzunluk = String(dosya?.issue_description ?? "").trim().length;

  const izi = await kosumIziOku(admin, caseId);

  // Kol tanımları: koşum koşulu + girdi imzası (imza aynıysa yeniden koşulmaz).
  const kolDurumu: Record<string, { uygun: boolean; imza: string; sebep: string; govde: any }> = {
    "elverislilik": {
      uygun: konuUzunluk > 0 && taraflar.length >= 1,
      imza: `konu:${konuUzunluk}|taraf:${taraflar.length}`,
      sebep: "uyuşmazlık konusu boş ya da taraf kaydı yok",
      govde: { case_id: caseId },
    },
    "belge-ozeti": {
      uygun: metinliBelgeler.length >= 1,
      imza: `belge:${metinliBelgeler.length}|son:${enSonBelge}`,
      sebep: "metni çıkarılmış belge yok",
      govde: { document_id: metinliBelgeler[0]?.id },
    },
    "olay-cizelgesi": {
      uygun: metinliBelgeler.length >= 1,
      imza: `belge:${metinliBelgeler.length}|son:${enSonBelge}`,
      sebep: "metni çıkarılmış belge yok",
      govde: { case_id: caseId, yenile: true },
    },
    "guc-dengesi": {
      uygun: taraflar.length >= 2,
      imza: `taraf:${taraflar.length}|beyan:${beyanli}|belge:${belgeler.length}`,
      sebep: "en az iki taraf kaydı yok",
      govde: { case_id: caseId, yenile: true },
    },
    "usul-onerisi": {
      uygun: taraflar.length >= 2,
      imza: `taraf:${taraflar.length}|beyan:${beyanli}|belge:${belgeler.length}`,
      sebep: "en az iki taraf kaydı yok",
      govde: { case_id: caseId },
    },
    "dosya-ozeti-oner": {
      uygun: !!orkestratorTamam,
      imza: `orch:${String(orkestratorTamam?.updated_at ?? "-")}|konu:${konuUzunluk}`,
      sebep: "orkestratör analizi tamamlanmadı",
      govde: { case_id: caseId },
    },
  };

  for (const tanim of OTOMATIK_KOLLAR) {
    // iletisim-degisim taraf bazlıdır; aşağıda ayrıca ele alınır.
    if (tanim.kol === "iletisim-degisim") continue;
    const d = kolDurumu[tanim.kol];
    if (!d) continue;
    if (!d.uygun) continue;   // koşul sağlanmıyor: sessiz geçilir, iz yazılmaz

    const eski = izi[tanim.kol];
    if (eski && String(eski.girdi_imzasi) === d.imza && String(eski.durum) !== "hata") {
      continue;   // aynı girdi: yeniden koşulmaz (maliyet kuralı)
    }
    if (!tanim.icKapi) {
      if (!eski || String(eski.durum) !== "atlandi" || String(eski.girdi_imzasi) !== d.imza) {
        const sebep = `${tanim.fonksiyon} iç çağrı kapısı (x-cron-secret) kabul etmiyor — nöbetçiden çalıştırılamıyor, kokpitteki düğmeyle çalışır`;
        await kosumIziYaz(admin, caseId, tanim.kol, d.imza, "atlandi", sebep);
        ozet.atlandi++;
        ozet.sebepler.push(`otomatik koşum atlandı (${tanim.kol}): ${sebep}`);
      }
      continue;
    }
    if (butce.kalan <= 0) {
      ozet.sebepler.push(`otomatik koşum (${tanim.kol}): tur sınırı doldu — sonraki turda koşulacak`);
      continue;
    }

    butce.kalan--;
    const r = await icFonksiyonCagir(tanim.fonksiyon, d.govde);
    if (r.ok) {
      await kosumIziYaz(admin, caseId, tanim.kol, d.imza, "kosuldu", r.sebep);
      ozet.kosuldu++;
      await gorevAc(
        admin, caseId, "otomatik_analiz", `[oto:${tanim.kol}]`,
        `${tanim.kol} kolu nöbetçi tarafından çalıştırıldı`,
        { durum: "yapildi" },
      );
    } else {
      const sayac = hataSayaci(String(eski?.sebep ?? "")) + 1;
      const durum = sayac >= 3 ? "atlandi" : "hata";
      const sebep = durum === "atlandi"
        ? `hata 3/3 — üç kez başarısız, kol beklemeye alındı: ${r.sebep}`
        : `hata ${sayac}/3: ${r.sebep}`;
      await kosumIziYaz(admin, caseId, tanim.kol, d.imza, durum, sebep);
      ozet.hata++;
      ozet.sebepler.push(`otomatik koşum başarısız (${tanim.kol}): ${sebep}`);
    }
  }

  // ── iletisim-degisim: TARAF BAZLI kol ───────────────────────────────────
  // Koşum koşulu: o tarafın en az İKİ FARKLI TARİHLİ metni olmalı.
  const idTanim = OTOMATIK_KOLLAR.find((k) => k.kol === "iletisim-degisim")!;
  for (const t of taraflar) {
    const tarihler = new Set<string>();
    if (String(t.statement ?? "").trim().length > 40) tarihler.add(String(t.created_at ?? "").slice(0, 10));
    for (const d of belgeler) {
      if (String(d.party_id) === String(t.id)) tarihler.add(String(d.created_at ?? "").slice(0, 10));
    }
    if (t.user_id) {
      const { data: msj } = await admin.from("messages")
        .select("created_at").eq("case_id", caseId).eq("sender_id", t.user_id).limit(50);
      for (const m of ((msj ?? []) as any[])) tarihler.add(String(m.created_at ?? "").slice(0, 10));
    }
    tarihler.delete("");
    if (tarihler.size < 2) continue;

    const kolAdi = `iletisim-degisim:${t.id}`;
    const imza = `gun:${tarihler.size}|son:${[...tarihler].sort().slice(-1)[0]}`;
    const eski = izi[kolAdi];
    if (eski && String(eski.girdi_imzasi) === imza && String(eski.durum) !== "hata") continue;

    if (!idTanim.icKapi) {
      if (!eski || String(eski.durum) !== "atlandi" || String(eski.girdi_imzasi) !== imza) {
        const sebep = "iletisim-degisim iç çağrı kapısı (x-cron-secret) kabul etmiyor — nöbetçiden çalıştırılamıyor, kokpitteki düğmeyle çalışır";
        await kosumIziYaz(admin, caseId, kolAdi, imza, "atlandi", sebep);
        ozet.atlandi++;
        ozet.sebepler.push(`otomatik koşum atlandı (${kolAdi}): ${sebep}`);
      }
      continue;
    }
    if (butce.kalan <= 0) {
      ozet.sebepler.push(`otomatik koşum (${kolAdi}): tur sınırı doldu — sonraki turda koşulacak`);
      continue;
    }
    butce.kalan--;
    const r = await icFonksiyonCagir(idTanim.fonksiyon, { case_id: caseId, party_id: t.id, yenile: true });
    if (r.ok) {
      await kosumIziYaz(admin, caseId, kolAdi, imza, "kosuldu", r.sebep);
      ozet.kosuldu++;
      await gorevAc(
        admin, caseId, "otomatik_analiz", `[oto:${kolAdi}]`,
        `${kolAdi} kolu nöbetçi tarafından çalıştırıldı`,
        { durum: "yapildi" },
      );
    } else {
      const sayac = hataSayaci(String(eski?.sebep ?? "")) + 1;
      const durum = sayac >= 3 ? "atlandi" : "hata";
      const sebep = durum === "atlandi"
        ? `hata 3/3 — üç kez başarısız, kol beklemeye alındı: ${r.sebep}`
        : `hata ${sayac}/3: ${r.sebep}`;
      await kosumIziYaz(admin, caseId, kolAdi, imza, durum, sebep);
      ozet.hata++;
      ozet.sebepler.push(`otomatik koşum başarısız (${kolAdi}): ${sebep}`);
    }
  }

  // ── KARAR NOKTASI: elverişlilik işareti varsa arabulucuya onay görevi ────
  // Ajan karar vermez; yalnız "inceleyin" der. Aynı dosyada ikinci satır açılmaz.
  try {
    const { data: elv } = await admin.from("elverislilik_kontrol")
      .select("durum").eq("case_id", caseId).maybeSingle();
    if (elv && String((elv as any).durum) === "isaret_var") {
      const r = await gorevAc(
        admin, caseId, "elverislilik_isareti", "[onay:elverislilik]",
        "Dosyada elverişlilik bakımından dikkat gerektiren işaret var — kokpitte inceleyin",
        { durum: "onay_bekliyor" },
      );
      if (r.acildi) ozet.sebepler.push("elverişlilik işareti arabulucu onayına yazıldı");
    }
  } catch (e: any) {
    console.error(`[ajan-nobetci] elverişlilik işareti okunamadı (${caseId}): ${e?.message ?? e}`);
  }

  return ozet;
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
      .select("id, deadline_total, deadline_extended, extension_used, assigned_mediator_id, user_id, application_no, title, issue_description, current_phase, status, closed_at")
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
    let yeniAsamaGorevi = 0;
    let asamaIlerletildi = 0;
    let yeniOnayGorevi = 0;
    let yeniHatirlatmaGorevi = 0;
    let hatirlatmaGonderildi = 0;
    // Taraf ajanı sayaçları (Tur B)
    let musaitlikIstendi = 0;
    let teklifDegerlendirildi = 0;
    let otomatikOnaylandi = 0;
    let alternatifYazildi = 0;
    let eksikBilgiIstendi = 0;
    // Tur C-1 sayaçları
    let ilkTemasGonderildi = 0;
    let katilimCevabiIslendi = 0;
    let ekOturumSorusuAcildi = 0;
    let ozelOturumDaveti = 0;
    // Tur C-2 — Kör Teklif v2 (koşullu aralık / braketleme) sayaçları
    let braketGirildi = 0;
    let ortusmeBulundu = 0;
    let bantSorusuGonderildi = 0;
    let taahhutDustu = 0;
    // Kayıt protokolü (B18) silme sayaçları
    let sesKaydiSilindi = 0;
    let dokumSilindi = 0;
    // Otomatik koşum (16.08) sayaçları ve TUR BAŞINA harcama bütçesi.
    let otomatikKosuldu = 0;
    let otomatikAtlandi = 0;
    let otomatikHata = 0;
    const otomatikButce: Butce = { kalan: OTOMATIK_TUR_SINIRI };
    const hatalar: string[] = [];

    // ADİL SIRA (16.08): otomatik koşum bütçesi hep aynı dosyaya gitmesin diye
    // dosyalar, en son otomatik koşum zamanına göre sıralanır — hiç koşulmamış
    // dosya başa gelir. Diğer kolların mantığı değişmez, yalnız işlem sırası.
    const dosyaListesi = [...((dosyalar ?? []) as any[])];
    try {
      const { data: izSatirlari } = await admin.from("ajan_kosum_izi")
        .select("case_id, kosum_zamani").limit(2000);
      const sonKosum: Record<string, string> = {};
      for (const r of ((izSatirlari ?? []) as any[])) {
        const k = String(r.case_id);
        const z = String(r.kosum_zamani ?? "");
        if (!sonKosum[k] || z > sonKosum[k]) sonKosum[k] = z;
      }
      dosyaListesi.sort((a, b) =>
        (sonKosum[String(a.id)] ?? "").localeCompare(sonKosum[String(b.id)] ?? ""));
    } catch (e: any) {
      console.error(`[ajan-nobetci] koşum sırası kurulamadı: ${e?.message ?? e}`);
    }

    for (const dosya of dosyaListesi) {
      // Bir dosyadaki hata diğer dosyaları durdurmaz.
      let buDosyaYapilan = 0;
      // Ön koşul uyarıları: ajan bir kolu çalıştıramadıysa SESSİZ KALMAZ — sebebi
      // zaman damgasıyla buraya, oradan agent_states.last_output'a ve Ajan Paneli'ne düşer.
      const buDosyaSebepleri: { zaman: string; sebep: string }[] = [];
      const sebepEkle = (s?: string) => {
        if (!s) return;
        buDosyaSebepleri.push({ zaman: new Date().toISOString(), sebep: s });
        atlamaSebepleri.push(`${dosya.id}: ${s}`);
      };
      try {
        // Kollar görev listesi okunmadan ÖNCE çalışır ki açtıkları görev aynı turda işlensin.
        const analizGorev = await analizGoreviAc(admin, dosya);
        if (analizGorev.acildi) yeniAnalizGorevi++;
        else sebepEkle(analizGorev.sebep ? `analiz görevi açılmadı — ${analizGorev.sebep}` : undefined);

        const randevuGorev = await randevuGoreviAc(admin, dosya);
        if (randevuGorev.acildi) yeniRandevuGorevi++;
        else sebepEkle(randevuGorev.sebep);

        const asamaGorev = await asamaGecisiGoreviAc(admin, dosya);
        if (asamaGorev.acildi) yeniAsamaGorevi++;
        else sebepEkle(asamaGorev.sebep);

        const hatirlatma = await oturumHatirlatmaGorevleriAc(admin, dosya);
        yeniHatirlatmaGorevi += hatirlatma.acilan;
        hatirlatma.sebepler.forEach(sebepEkle);

        const oturumSorusu = await oturumYapildiMiGorevleriAc(admin, dosya);
        yeniOnayGorevi += oturumSorusu.acilan;
        oturumSorusu.sebepler.forEach(sebepEkle);

        const kapanis = await kapanisKollari(admin, dosya);
        yeniOnayGorevi += kapanis.acilan;
        kapanis.sebepler.forEach(sebepEkle);

        // ── TARAF AJANI KOLLARI (Tur B) — her taraf için ayrı, kendi verisiyle ──
        const { data: dosyaTaraflari, error: tErr } = await admin.from("case_parties")
          .select("id, party_type, first_name, last_name, company_name, email, katilim_durumu")
          .eq("case_id", dosya.id).limit(50);
        if (tErr) sebepEkle(`taraf ajanı çalışamadı: taraflar okunamadı — ${tErr.message}`);
        const taraflar = (dosyaTaraflari ?? []) as any[];

        // ── TUR C-1: ilk temas · katılım cevapları · çoklu oturum ──
        const ilkTemasKol = await ilkTemasGorevleriAc(admin, dosya, taraflar);
        ilkTemasKol.sebepler.forEach(sebepEkle);

        const katilimKol = await katilimCevaplariniIsle(admin, dosya, taraflar);
        katilimCevabiIslendi += katilimKol.islenen;
        katilimKol.sebepler.forEach(sebepEkle);

        const ekOturumKol = await ekOturumSorusuAc(admin, dosya);
        ekOturumSorusuAcildi += ekOturumKol.acilan;
        ekOturumKol.sebepler.forEach(sebepEkle);

        const ekOturumKarar = await ekOturumKararlariniIsle(admin, dosya);
        yeniRandevuGorevi += ekOturumKarar.acilan;
        ekOturumKarar.sebepler.forEach(sebepEkle);

        const musaitlikKol = await musaitlikGorevleriAc(admin, dosya, taraflar);
        musaitlikKol.sebepler.forEach(sebepEkle);

        const teklifKol = await teklifDegerlendirGorevleriAc(admin, dosya);
        teklifKol.sebepler.forEach(sebepEkle);

        const eksikKol = await eksikBilgiGorevleriAc(admin, dosya, taraflar);
        eksikKol.sebepler.forEach(sebepEkle);

        // ── TUR C-2: kör teklif v2 — koşullu aralık / braketleme ──
        const braketKol = await braketKollari(admin, dosya, taraflar);
        braketGirildi += braketKol.braket_girildi;
        ortusmeBulundu += braketKol.ortusme_bulundu;
        bantSorusuGonderildi += braketKol.bant_sorusu_gonderildi;
        taahhutDustu += braketKol.taahhut_dustu;
        braketKol.sebepler.forEach(sebepEkle);

        // ── KAYIT SİLME (İBA 1.8 / B18): ses 24 saat sonra, döküm süreç sonunda ──
        const silmeKol = await kayitSilmeKollari(admin, dosya);
        sesKaydiSilindi += silmeKol.ses_silindi;
        dokumSilindi += silmeKol.dokum_silindi;
        silmeKol.sebepler.forEach(sebepEkle);

        // ── OTOMATİK KOŞUM (16.08): analiz kolları düğmesiz çalışır ──
        const otoKol = await otomatikKosumKollari(admin, dosya, otomatikButce);
        otomatikKosuldu += otoKol.kosuldu;
        otomatikAtlandi += otoKol.atlandi;
        otomatikHata += otoKol.hata;
        otoKol.sebepler.forEach(sebepEkle);

        // YALNIZ durum='bekliyor' görevler yürütülür. 'onay_bekliyor' satırları
        // arabulucunundur — ajan bunlara hiçbir koşulda dokunmaz.
        const { data: gorevler, error: gErr } = await admin.from("ajan_gorevleri")
          .select("id, gorev_tipi, hedef_party_id, durum, gerekce")
          .eq("case_id", dosya.id)
          .eq("durum", "bekliyor")
          .limit(100);
        if (gErr) throw new Error(gErr.message);

        // taraf_alternatif_saat panoda VERİ satırıdır; süreç ajanı (randevu-teklif)
        // okur, nöbetçi yürütmez — bu yüzden listede yoktur.
        const YURUTULEN_TIPLER = [
          "soru_gonder", "randevu_teklifi", "analiz_baslat", "asama_gecisi", "oturum_hatirlatma",
          "taraf_musaitlik_iste", "teklif_degerlendir", "taraf_eksik_bilgi",
          "ilk_temas", "ozel_oturum",
        ];
        const TARAF_TIPLERI = [
          "soru_gonder", "taraf_musaitlik_iste", "teklif_degerlendir", "taraf_eksik_bilgi",
          "ilk_temas", "ozel_oturum",
        ];
        for (const gorev of (gorevler ?? []) as any[]) {
          // Tanınmayan görev tipine dokunulmaz: 'bekliyor' kalır.
          if (!YURUTULEN_TIPLER.includes(gorev.gorev_tipi)) continue;
          // Taraf ajanı görevlerinde hedef taraf ZORUNLUDUR (kör veri kapısı).
          if (TARAF_TIPLERI.includes(gorev.gorev_tipi) && !gorev.hedef_party_id) {
            await admin.from("ajan_gorevleri")
              .update({ durum: "atlandi", sonuc: "Hedef taraf yok" }).eq("id", gorev.id);
            atlananGorev++;
            continue;
          }
          let tarafSonuc: TeklifSonuc | null = null;
          if (gorev.gorev_tipi === "teklif_degerlendir") {
            tarafSonuc = await teklifDegerlendirYurut(admin, dosya, gorev.gerekce, gorev.hedef_party_id);
          }
          const { durum, sonuc } = tarafSonuc
            ? { durum: tarafSonuc.durum, sonuc: tarafSonuc.sonuc }
            : gorev.gorev_tipi === "randevu_teklifi"
              ? await randevuTeklifiYurut(admin, dosya.id)
              : gorev.gorev_tipi === "analiz_baslat"
                ? await analizBaslat(admin, dosya.id)
                : gorev.gorev_tipi === "asama_gecisi"
                  ? await asamaGecisiYurut(admin, dosya.id, gorev.gerekce)
                  : gorev.gorev_tipi === "oturum_hatirlatma"
                    ? await oturumHatirlatmaYurut(admin, dosya, gorev.gerekce)
                    : gorev.gorev_tipi === "taraf_musaitlik_iste"
                      ? await musaitlikIsteYurut(admin, dosya, gorev.hedef_party_id)
                      : gorev.gorev_tipi === "taraf_eksik_bilgi"
                        ? await eksikBilgiYurut(admin, dosya, gorev.hedef_party_id)
                        : gorev.gorev_tipi === "ilk_temas"
                          ? await ilkTemasYurut(admin, dosya, gorev.hedef_party_id)
                          : gorev.gorev_tipi === "ozel_oturum"
                            ? await ozelOturumYurut(admin, dosya, gorev.hedef_party_id)
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
            if (gorev.gorev_tipi === "asama_gecisi") asamaIlerletildi++;
            if (gorev.gorev_tipi === "oturum_hatirlatma") hatirlatmaGonderildi++;
            if (gorev.gorev_tipi === "taraf_musaitlik_iste") musaitlikIstendi++;
            if (gorev.gorev_tipi === "taraf_eksik_bilgi") eksikBilgiIstendi++;
            if (gorev.gorev_tipi === "ilk_temas") ilkTemasGonderildi++;
            if (gorev.gorev_tipi === "ozel_oturum") ozelOturumDaveti++;
            if (gorev.gorev_tipi === "teklif_degerlendir") {
              teklifDegerlendirildi++;
              if (tarafSonuc?.otomatikOnay) otomatikOnaylandi++;
              if (tarafSonuc?.alternatif) alternatifYazildi++;
            }
          }
          if (durum === "atlandi") {
            atlananGorev++;
            sebepEkle(`${gorev.gorev_tipi} atlandı: ${sonuc}`);
          }
        }

        const videoOzet = await videoBaglantilariniHazirla(admin, dosya);
        const videoHazirlanan = videoOzet.hazirlanan;
        hazirlananVideo += videoHazirlanan;
        incelenenOturum += videoOzet.incelenen;
        atlananYuzYuze += videoOzet.atlanan_yuz_yuze;
        videoOzet.atlama_sebepleri.forEach((s) => sebepEkle(s));
        hatalar.push(...videoOzet.hatalar);
        if (videoOzet.imza_adi) imzaAdi = videoOzet.imza_adi;
        islenenDosya++;

        // "Yapılmayanlar ve sebebi" Ajan Paneli'nde buradan okunur.
        await nobetciDurumYaz(admin, dosya.id, {
          status: "completed",
          error_message: null,
          last_output: {
            bu_dosyada_yapilan_gorev: buDosyaYapilan,
            bu_dosyada_hazirlanan_video: videoHazirlanan,
            yapilmayanlar: buDosyaSebepleri.slice(-40),
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
      asama_gorevi_acildi: yeniAsamaGorevi,
      asama_ilerletildi: asamaIlerletildi,
      onay_gorevi_acildi: yeniOnayGorevi,
      hatirlatma_gorevi_acildi: yeniHatirlatmaGorevi,
      hatirlatma_gonderildi: hatirlatmaGonderildi,
      musaitlik_istendi: musaitlikIstendi,
      teklif_degerlendirildi: teklifDegerlendirildi,
      otomatik_onaylandi: otomatikOnaylandi,
      alternatif_yazildi: alternatifYazildi,
      eksik_bilgi_istendi: eksikBilgiIstendi,
      ilk_temas_gonderildi: ilkTemasGonderildi,
      katilim_cevabi_islendi: katilimCevabiIslendi,
      ek_oturum_sorusu_acildi: ekOturumSorusuAcildi,
      ozel_oturum_daveti: ozelOturumDaveti,
      braket_girildi: braketGirildi,
      ortusme_bulundu: ortusmeBulundu,
      bant_sorusu_gonderildi: bantSorusuGonderildi,
      taahhut_dustu: taahhutDustu,
      ses_kaydi_silindi: sesKaydiSilindi,
      dokum_silindi: dokumSilindi,
      otomatik_kosuldu: otomatikKosuldu,
      otomatik_atlandi: otomatikAtlandi,
      otomatik_hata: otomatikHata,
      otomatik_butce_kalan: otomatikButce.kalan,
      atlama_sebepleri: atlamaSebepleri,
      imza_adi: imzaAdi,
      hata: hatalar,
    });
  } catch (e: any) {
    console.error("[ajan-nobetci] koşum hatası", e?.message ?? e);
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
