// AKIŞ KOŞUCUSU (agentic belkemiği, 1. taş)
//
// Tek iş: işlenmemiş akış olaylarını okumak, public.akis_kurallari'ndaki kuralla
// eşleştirmek ve kuralın söylediğini yapmak. Kural tablosu VERİDİR — akış koda
// gömülü zincirle değil, satırla tarif edilir; yeni bir adım eklemek kod değil
// satır yazmaktır (constitution m.3: kararı insan verir, ajan uygular).
//
// BU FONKSİYON TARAFA HİÇBİR ŞEY GÖNDERMEZ. E-posta gönderen tek yer kuralın
// çağırdığı MEVCUT fonksiyondur ve o da kendi iletişim tercihi süzgecinden
// (gonderilsinMi) geçer. Burada ikinci bir süzgeç, ikinci bir alıcı mantığı
// ya da yeni bir gönderim yolu YOKTUR.
//
// İNSAN KAPISI (constitution m.3): kuralın insan_kapisi alanı true ise fonksiyon
// ÇAĞRILMAZ; panoya 'akis_onay_bekliyor' satırı düşer ve işi arabulucu yapar.
// Nöbetçi bu tipi yürütmez (YURUTULEN_TIPLER listesinde değildir).
//
// SESSİZ BAŞARISIZLIK YOK: kural hata verirse olay İŞLENMİŞ SAYILMAZ, hata
// panoya 'akis_hatasi' olarak düşer ve koşucu öteki olaylarla devam eder.
//
// GÜVENLİK KAPISI ajan-nobetci ile birebir aynıdır: x-cron-secret VEYA admin JWT.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { motoraBagliMi, girdiTamamla } from "../_shared/anlatim.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

// Tek turda en fazla bu kadar olay işlenir; kalanı sonraki tura kalır.
const TUR_SINIRI = 50;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function metin(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/* İç çağrı: ajan-nobetci'deki icFonksiyonCagir ile aynı kalıp. Yalnız
   x-cron-secret kabul eden fonksiyonlar bu kapıdan çağrılabilir. */
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
    if (!res.ok) {
      const kapiNotu = res.status === 401 || res.status === 403
        ? " (iç çağrı reddedildi — kapı/anahtar kontrolü)"
        : "";
      return { ok: false, sebep: `HTTP ${res.status}${kapiNotu}: ${metinGovde.slice(0, 200)}` };
    }
    return { ok: true, sebep: metinGovde.slice(0, 200) };
  } catch (e: any) {
    return { ok: false, sebep: String(e?.message ?? e).slice(0, 200) };
  }
}

/* KOŞUL DEĞERLENDİRME — bu turda YALNIZ {"en_az_taraf": N} desteklenir.
   TANIMADIĞIN ANAHTAR = KURALI ATLA. Bilinmeyen koşul "koşul yok" sayılmaz;
   sessizce geçilirse kural, sağlanmayan bir şartla çalışmış olur. */
async function kosulSaglandiMi(
  admin: any, kosul: unknown, caseId: string,
): Promise<{ saglandi: boolean; sebep: string }> {
  if (!kosul || typeof kosul !== "object" || Array.isArray(kosul)) {
    return { saglandi: true, sebep: "koşul yok" };
  }
  const anahtarlar = Object.keys(kosul as Record<string, unknown>);
  if (anahtarlar.length === 0) return { saglandi: true, sebep: "koşul yok" };

  const bilinmeyen = anahtarlar.filter((a) => a !== "en_az_taraf");
  if (bilinmeyen.length > 0) {
    return { saglandi: false, sebep: `tanınmayan koşul anahtarı: ${bilinmeyen.join(", ")}` };
  }

  const gereken = Number((kosul as any).en_az_taraf);
  if (!Number.isFinite(gereken)) {
    return { saglandi: false, sebep: "en_az_taraf sayı değil" };
  }
  const { count, error } = await admin.from("case_parties")
    .select("id", { count: "exact", head: true }).eq("case_id", caseId);
  if (error) return { saglandi: false, sebep: `taraf sayısı okunamadı: ${error.message}` };
  const mevcut = count ?? 0;
  if (mevcut < gereken) {
    return { saglandi: false, sebep: `taraf sayısı ${mevcut} < ${gereken}` };
  }
  return { saglandi: true, sebep: `taraf sayısı ${mevcut} ≥ ${gereken}` };
}

/* Pano yazımı — mükerrer yazmaz (nöbetçideki "önce bak, varsa yazma" kalıbı):
   aynı dosya + tip + hedef taraf için 'bekliyor' satır varsa yeniden yazılmaz. */
async function panoyaYaz(
  admin: any, caseId: string, gorevTipi: string, hedefPartyId: string | null, gerekce: string,
): Promise<{ yazildi: boolean; sebep: string }> {
  let sorgu = admin.from("ajan_gorevleri")
    .select("id").eq("case_id", caseId).eq("gorev_tipi", gorevTipi).eq("durum", "bekliyor");
  sorgu = hedefPartyId ? sorgu.eq("hedef_party_id", hedefPartyId) : sorgu.is("hedef_party_id", null);
  const { data: mevcut } = await sorgu.limit(1);
  if (mevcut && mevcut.length > 0) return { yazildi: false, sebep: "bekleyen aynı satır zaten var" };

  const { error } = await admin.from("ajan_gorevleri").insert({
    case_id: caseId,
    gorev_tipi: gorevTipi,
    durum: "bekliyor",
    hedef_party_id: hedefPartyId,
    gerekce,
  });
  if (error) return { yazildi: false, sebep: `pano satırı yazılamadı: ${error.message}` };
  return { yazildi: true, sebep: "yazıldı" };
}

/* Akış hatası kaydı. Deneme sayısı bu satırlardan okunduğu için HER DENEME
   kendi satırını bırakır; ama AYNI ETİKET + AYNI METİN üst üste yazılmaz. */
async function hataYaz(
  admin: any, caseId: string, partyId: string | null, etiket: string, mesaj: string,
): Promise<void> {
  try {
    const gerekce = `${etiket} ${mesaj}`.slice(0, 500);
    const { data: mevcut } = await admin.from("ajan_gorevleri")
      .select("id, gerekce").eq("case_id", caseId).eq("gorev_tipi", "akis_hatasi").limit(300);
    if (((mevcut ?? []) as any[]).some((r) => String(r?.gerekce ?? "") === gerekce)) return;
    await admin.from("ajan_gorevleri").insert({
      case_id: caseId, gorev_tipi: "akis_hatasi", durum: "bekliyor",
      hedef_party_id: partyId, gerekce,
    });
  } catch (e: any) {
    console.error("[akis-yurut] hata kaydı yazılamadı", String(e?.message ?? e).slice(0, 120));
  }
}

/* ── AŞAMA İLERLETME MOTORU (yasa · sahip=sistem) ────────────────────────────
   cases.current_phase, KOŞULLAR SAĞLANINCA ajan tarafından ilerletilir.
   Koşullar NESNELDİR: yalnız kayıt sayımı ve kayıt varlığı okunur. Model yorumu,
   tahmin ve sezgi YASAK — veri yoksa aşama DEĞİŞMEZ (constitution m.2).

   ASLA KENDİLİĞİNDEN GEÇİLMEYENLER (dört insan kapısından ikisi):
   · Aşama 5 → 6 (bilirkişi): dosyada bilirkişi görevi varsa ajan geçmez.
   · Aşama 6 → 7 ve sonrası (imza / kapanış): ajan hiçbir koşulda geçmez.

   GERİ ALINABİLİR: arabulucu aşamayı elle geri alabilir. Ajan aynı geçişi
   yeniden yazmaz — her geçişin panoda "[gecis:ESKİ->YENİ]" etiketli tek kaydı
   olur ve etiket varsa geçiş tekrar denenmez.

   Kayıt biçimi sohbetin beklediği biçimdir: gerekce = "[gecis:E->Y] sebep".
   Mevcut aşama kilitleri ve nöbetçinin kendi aşama kolu YERİNDE KALIR; ikisi de
   aynı etiketi kullandığı için aynı geçiş iki kez yazılamaz. */
async function asamaSay(admin: any, tablo: string, caseId: string, ekle?: (q: any) => any): Promise<number> {
  try {
    let q = admin.from(tablo).select("id", { count: "exact", head: true }).eq("case_id", caseId);
    if (ekle) q = ekle(q);
    const { count } = await q;
    return count ?? 0;
  } catch { return 0; }
}

async function asamaHedefi(
  admin: any, dosya: any,
): Promise<{ hedef: number | null; sebep: string; neden?: string }> {
  const mevcut = Math.min(7, Math.max(1, Number(dosya?.current_phase ?? 1) || 1));
  const caseId = String(dosya.id);

  if (mevcut === 1) {
    const taraf = await asamaSay(admin, "case_parties", caseId);
    if (taraf < 2) return { hedef: null, sebep: "", neden: "en az iki taraf kaydı gerekiyor" };
    const belge = await asamaSay(admin, "case_documents", caseId);
    const konuVar = String(dosya?.issue_description ?? "").trim().length > 0;
    if (belge === 0 && !konuVar) return { hedef: null, sebep: "", neden: "belge ya da başvuru metni yok" };
    return { hedef: 2, sebep: `${taraf} taraf kayıtlı, ${belge} belge yüklü` };
  }

  if (mevcut === 2) {
    const taraf = await asamaSay(admin, "case_parties", caseId);
    const analiz = await asamaSay(admin, "party_analyses", caseId);
    if (taraf === 0 || analiz < taraf) {
      return { hedef: null, sebep: "", neden: `taraf analizleri tamam değil (${analiz}/${taraf})` };
    }
    const rapor = await asamaSay(admin, "common_ground_reports", caseId);
    if (rapor < 1) return { hedef: null, sebep: "", neden: "ortak zemin raporu bekleniyor" };
    return { hedef: 3, sebep: `taraf analizleri tamam (${analiz}/${taraf}) ve ortak zemin raporu üretildi` };
  }

  if (mevcut === 3) {
    const oturum = await asamaSay(admin, "case_sessions", caseId, (q: any) => q.eq("status", "scheduled"));
    if (oturum < 1) return { hedef: null, sebep: "", neden: "planlanmış oturum yok" };
    return { hedef: 4, sebep: "planlanmış oturum var" };
  }

  if (mevcut === 4) {
    const yapilan = await asamaSay(admin, "case_sessions", caseId, (q: any) => q.eq("status", "completed"));
    if (yapilan < 1) return { hedef: null, sebep: "", neden: "oturum henüz yapıldı işaretlenmedi" };
    return { hedef: 5, sebep: "oturum yapıldı olarak işaretlendi" };
  }

  if (mevcut === 5) {
    // İNSAN KAPISI: dosyada bilirkişi görevi varsa ajan bu aşamayı GEÇMEZ.
    const bilirkisi = await asamaSay(admin, "case_expert_assignments", caseId);
    if (bilirkisi > 0) {
      return { hedef: null, sebep: "", neden: "dosyada bilirkişi görevi var — bu aşama insan kararıyla geçilir" };
    }
    const not = await asamaSay(admin, "case_notes", caseId, (q: any) => q.eq("phase", 7));
    if (not < 1) return { hedef: null, sebep: "", neden: "görüşme notu yok" };
    return { hedef: 6, sebep: "bilirkişi istenmedi, görüşme notu kayıtlı" };
  }

  // İNSAN KAPISI: imza ve kapanış aşaması ajan tarafından GEÇİLMEZ.
  return { hedef: null, sebep: "", neden: "imza ve kapanış aşaması insan kararıyla ilerler" };
}

async function asamaIlerlet(admin: any): Promise<{ ilerletilen: number; notlar: string[] }> {
  const notlar: string[] = [];
  let ilerletilen = 0;
  try {
    const { data: dosyalar, error } = await admin.from("cases")
      .select("id, current_phase, issue_description")
      .eq("otomatik_akis", true).limit(200);
    if (error) {
      notlar.push(`aşama değerlendirmesi yapılamadı: ${error.message}`);
      return { ilerletilen, notlar };
    }

    for (const dosya of ((dosyalar ?? []) as any[])) {
      const mevcut = Math.min(7, Math.max(1, Number(dosya?.current_phase ?? 1) || 1));
      const { hedef, sebep, neden } = await asamaHedefi(admin, dosya);
      if (!hedef || hedef <= mevcut) {
        if (neden) notlar.push(`aşama ilerlemedi (${dosya.id}): ${neden}`);
        continue;
      }

      /* Aynı geçiş İKİNCİ KEZ yazılmaz — arabulucu elle geri aldıysa ajan aynı
         geçişi tekrar denemez. Etiket nöbetçinin kullandığıyla AYNIDIR. */
      const etiket = `[gecis:${mevcut}->${hedef}]`;
      const { data: iz } = await admin.from("ajan_gorevleri")
        .select("id, gerekce").eq("case_id", dosya.id).eq("gorev_tipi", "asama_gecisi").limit(200);
      if (((iz ?? []) as any[]).some((r) => String(r?.gerekce ?? "").startsWith(etiket))) continue;

      const { error: uErr } = await admin.from("cases")
        .update({ current_phase: hedef }).eq("id", dosya.id).eq("current_phase", mevcut);
      if (uErr) { notlar.push(`aşama yazılamadı (${dosya.id}): ${uErr.message}`); continue; }

      // Sohbetin okuduğu biçim: "[gecis:ESKİ->YENİ] sebep".
      await admin.from("ajan_gorevleri").insert({
        case_id: dosya.id, gorev_tipi: "asama_gecisi", durum: "yapildi",
        hedef_party_id: null, gerekce: `${etiket} ${sebep}`.slice(0, 500),
        sonuc: "ajan ilerletti",
      });
      ilerletilen++;
    }
  } catch (e: any) {
    notlar.push(`aşama değerlendirmesi yapılamadı: ${String(e?.message ?? e).slice(0, 120)}`);
  }
  return { ilerletilen, notlar };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // pg_cron / nöbetçi çağrısı için x-cron-secret; manuel çağrıda admin JWT şart.
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

    const { data: olaylar, error: oErr } = await admin.from("akis_olaylari")
      .select("id, case_id, party_id, olay_kodu, veri, islendi, created_at")
      .eq("islendi", false)
      .order("created_at", { ascending: true })
      .limit(TUR_SINIRI);
    if (oErr) return json({ error: oErr.message }, 500);

    const ozet = {
      okunan_olay: (olaylar ?? []).length,
      islenen_olay: 0,
      calistirilan_kural: 0,
      onaya_dusen: 0,
      atlanan_kural: 0,
      hatali_kural: 0,
      notlar: [] as string[],
    };
    if (!olaylar || olaylar.length === 0) return json({ ok: true, ...ozet });

    // Kurallar bir kez okunur; olay kodlarına göre eşleştirilir.
    const kodlar = Array.from(new Set((olaylar as any[]).map((o) => String(o.olay_kodu))));
    const { data: kurallar, error: kErr } = await admin.from("akis_kurallari")
      .select("id, kod, olay_kodu, kosul, sonraki_adim, sahip, insan_kapisi, gerekce, sira, etkin")
      .in("olay_kodu", kodlar).eq("etkin", true)
      .order("sira", { ascending: true });
    if (kErr) return json({ error: kErr.message }, 500);

    for (const olay of (olaylar as any[])) {
      const caseId = String(olay.case_id);
      const partyId = olay.party_id ? String(olay.party_id) : null;
      const eslesen = ((kurallar ?? []) as any[])
        .filter((k) => String(k.olay_kodu) === String(olay.olay_kodu));

      if (eslesen.length === 0) {
        // Kuralı olmayan olay da işlenmiş sayılır: tekrar tekrar okunmasın.
        await admin.from("akis_olaylari")
          .update({ islendi: true, islenme_zamani: new Date().toISOString() })
          .eq("id", olay.id);
        ozet.islenen_olay++;
        continue;
      }

      let olayHatali = false;

      for (const kural of eslesen) {
        const kuralKodu = metin(kural.kod) || String(kural.id);

        const { saglandi, sebep: kosulSebep } = await kosulSaglandiMi(admin, kural.kosul, caseId);
        if (!saglandi) {
          ozet.atlanan_kural++;
          ozet.notlar.push(`${kuralKodu}: atlandı — ${kosulSebep}`);
          continue;
        }

        if (kural.insan_kapisi === true) {
          /* İNSAN KAPISI: fonksiyon ÇAĞRILMAZ. İş panoya düşer, kararı ve
             uygulamayı arabulucu yapar. */
          const r = await panoyaYaz(
            admin, caseId, "akis_onay_bekliyor", partyId,
            metin(kural.gerekce) || `${kuralKodu} kuralı arabulucu onayı bekliyor`,
          );
          if (r.yazildi) ozet.onaya_dusen++;
          else ozet.notlar.push(`${kuralKodu}: ${r.sebep}`);
          continue;
        }

        const fonksiyon = metin(kural.sonraki_adim);
        if (!fonksiyon || fonksiyon === "yok") {
          ozet.atlanan_kural++;
          ozet.notlar.push(`${kuralKodu}: sonraki adım tanımsız`);
          continue;
        }

        /* Aynı olay için aynı kural İKİNCİ KEZ çalıştırılmaz. İz, panoda
           'akis_kosuldu' satırı olarak durur ve etiketiyle aranır. */
        const etiket = `[akis:${olay.id}:${kuralKodu}]`;
        const { data: izSatirlari } = await admin.from("ajan_gorevleri")
          .select("id, gorev_tipi, gerekce").eq("case_id", caseId)
          .in("gorev_tipi", ["akis_kosuldu", "akis_hatasi"]).limit(300);
        const kosulmus = ((izSatirlari ?? []) as any[])
          .some((r) => String(r?.gerekce ?? "").startsWith(etiket) && String(r?.gorev_tipi) === "akis_kosuldu");
        if (kosulmus) {
          ozet.atlanan_kural++;
          ozet.notlar.push(`${kuralKodu}: bu olay için zaten koşuldu`);
          continue;
        }

        /* YAPISAL ZORUNLULUK (yasa): ortak motora bağlı olmayan fonksiyon
           ÇAĞRILMAZ. Sebep açık bir satırla yazılır ki hiçbir yetenek sessizce
           döngünün dışında kalmasın. Olay işlenmiş sayılır — bu kural bugünkü
           hâliyle hiçbir denemede çalışamaz, sonsuza dek tekrar denenmez. */
        if (!motoraBagliMi(fonksiyon)) {
          ozet.atlanan_kural++;
          ozet.notlar.push(`${kuralKodu}: '${fonksiyon}' ortak motora bağlı değil — çağrılmadı`);
          await hataYaz(admin, caseId, partyId, etiket,
            `${fonksiyon} ortak çalışma motoruna bağlı olmadığı için çalıştırılmadı.`);
          continue;
        }

        const temelGovde: Record<string, unknown> = { case_id: caseId };
        if (partyId) temelGovde.party_id = partyId;
        if (olay.veri && typeof olay.veri === "object") {
          // Olayın taşıdığı kimlikler (session_id, document_id, foy_id …) çağrıya geçer.
          for (const [k, v] of Object.entries(olay.veri as Record<string, unknown>)) {
            if (v !== null && v !== undefined) temelGovde[k] = v;
          }
        }

        /* İKİ DENEME SINIRI: aynı olay+kural için en fazla iki deneme yapılır.
           Sınır dolmuşsa olay işlenmiş sayılır ve sonsuz döngü kurulmaz. */
        const oncekiHatalar = ((izSatirlari ?? []) as any[])
          .filter((r) => String(r?.gerekce ?? "").startsWith(etiket) && String(r?.gorev_tipi) === "akis_hatasi").length;
        if (oncekiHatalar >= 2) {
          ozet.atlanan_kural++;
          ozet.notlar.push(`${kuralKodu}: iki denemede de çalışmadı, bırakıldı`);
          continue;
        }

        /* 3. MADDE — ENGELE TAKILIRSA KENDİ ÇÖZER: eksik girdi dosyadan aranır.
           Bulunamazsa uydurulmaz; anlaşılır tek cümleyle bildirilir. */
        const girdi = await girdiTamamla(admin, fonksiyon, temelGovde);
        if (girdi.govdeler.length === 0) {
          olayHatali = oncekiHatalar + 1 < 2;   // bir deneme daha hakkı varsa olay açık kalır
          ozet.hatali_kural++;
          const eksikMetni = girdi.eksik.length ? girdi.eksik.join(", ") : "gerekli bilgi";
          ozet.notlar.push(`${kuralKodu}: ${eksikMetni} dosyada bulunamadı`);
          await hataYaz(admin, caseId, partyId, etiket,
            `${fonksiyon} çalıştırılamadı: ${eksikMetni} dosyada bulunamadı.`);
          continue;
        }
        if (girdi.tamamlanan.length > 0) {
          ozet.notlar.push(`${kuralKodu}: ${girdi.tamamlanan.join(" · ")}`);
        }

        let hepsiOldu = true;
        let sonSebep = "";
        for (const govde of girdi.govdeler) {
          const r = await icFonksiyonCagir(fonksiyon, govde);
          if (!r.ok) { hepsiOldu = false; sonSebep = r.sebep; }
        }

        if (hepsiOldu) {
          ozet.calistirilan_kural++;
          await admin.from("ajan_gorevleri").insert({
            case_id: caseId, gorev_tipi: "akis_kosuldu", durum: "yapildi",
            hedef_party_id: partyId,
            gerekce: `${etiket} ${fonksiyon} çalıştırıldı${girdi.govdeler.length > 1 ? ` (${girdi.govdeler.length} taraf)` : ""}`,
          });
        } else {
          /* SESSİZ BAŞARISIZLIK YOK. Bir deneme hakkı daha varsa olay açık kalır
             ve sonraki turda girdi yeniden tamamlanıp yeniden denenir. */
          olayHatali = oncekiHatalar + 1 < 2;
          ozet.hatali_kural++;
          ozet.notlar.push(`${kuralKodu}: çalıştırılamadı — ${sonSebep}`);
          await hataYaz(admin, caseId, partyId, etiket,
            `${fonksiyon} çalıştırılamadı: ${sonSebep}`);
        }
      }

      if (!olayHatali) {
        const { error: uErr } = await admin.from("akis_olaylari")
          .update({ islendi: true, islenme_zamani: new Date().toISOString() })
          .eq("id", olay.id);
        if (uErr) ozet.notlar.push(`olay ${olay.id}: işlendi yazılamadı — ${uErr.message}`);
        else ozet.islenen_olay++;
      }
    }

    /* AŞAMA İLERLETME: koşucunun her turunun SONUNDA değerlendirilir. Nöbetçi
       koşucuyu zaten 3 dakikada bir tetiklediği için yeni bir zamanlayıcı
       kurulmaz. Koşullar nesnel; sağlanmıyorsa aşama değişmez. */
    const asama = await asamaIlerlet(admin);
    ozet.notlar.push(...asama.notlar);

    return json({
      ok: true, ...ozet,
      asama_ilerletildi: asama.ilerletilen,
      notlar: ozet.notlar.slice(0, 50),
    });
  } catch (e: any) {
    const msg = String(e?.message ?? "Bilinmeyen sistem hatası");
    console.error("[akis-yurut] Genel hata:", msg);
    return json({ error: msg }, 500);
  }
});
