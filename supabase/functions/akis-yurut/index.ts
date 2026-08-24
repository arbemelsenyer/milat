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
import {
  motoraBagliMi, girdiTamamla, talimatiDenetle, TALIMAT_ALMAYAN, talimatOzeti,
  devirHedefi, bellekVarMi, bellekYaz, sinirdanGecir, anaAjanaBildir, devirYaz,
} from "../_shared/anlatim.ts";
import { akisHataBasligi, akisHataMetni } from "./hata-metni.ts";

/* BÖLÜM 1 — DEFTER NOTU NEREYE YAZILIR:
   akis_olaylari tablosunda not/sonuc diye bir KOLON YOKTUR. Kolonlar:
   id · case_id · party_id · olay_kodu · veri (jsonb) · islendi ·
   islenme_zamani · created_at (src/integrations/supabase/types.ts:552-561;
   yazan yerler: _shared/olay.ts:30 insert, bu dosyadaki iki update).
   Serbest not için tek yer `veri` alanıdır; defter notu oraya "defter_notu"
   anahtarıyla eklenir. Yeni kolon açılmadı, SQL yazılmadı. */
async function olayiKapat(
  admin: any, olay: any, defterNotu?: string | null,
): Promise<{ ok: boolean; sebep: string }> {
  const govde: Record<string, unknown> = {
    islendi: true, islenme_zamani: new Date().toISOString(),
  };
  if (defterNotu) {
    const eskiVeri = olay?.veri && typeof olay.veri === "object" && !Array.isArray(olay.veri)
      ? olay.veri : {};
    govde.veri = { ...eskiVeri, defter_notu: String(defterNotu).slice(0, 500) };
  }
  const { error } = await admin.from("akis_olaylari").update(govde).eq("id", olay.id);
  if (error) return { ok: false, sebep: error.message };
  return { ok: true, sebep: "" };
}

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

/* Pano yazımı — tekrar süzgeci KONU ÜZERİNDEN çalışır.
   20.08 CANLI KUSURU: süzgeç TÜR üzerinden kuruluydu (aynı gorev_tipi + hedef
   için bekleyen satır varsa yazma). Föy onayı beklerken gelen TALİMAT REDDİ
   bildirimi bu yüzden elendi ve sohbete hiç düşmedi (02:06 kaydı).
   ONARIM: her bildirim bir KONU anahtarıyla yazılır ("[konu:…]"). Aynı konuda
   bekleyen satır varsa yazılmaz; FARKLI konudaki bildirim HER ZAMAN yazılır.
   Konu verilmezse eski davranış korunur (tür + hedef).
   ÖLÇÜ: hiçbir ret, hata ya da onay isteği sessizce düşmez — yazılamayan
   bildirimin sebebi çağırana döner ve koşucunun özet notuna geçer. */
async function panoyaYaz(
  admin: any, caseId: string, gorevTipi: string, hedefPartyId: string | null, gerekce: string,
  konu?: string,
): Promise<{ yazildi: boolean; sebep: string }> {
  // ORTAK SINIR KATMANI: panoya yazılan her bildirim süzgeçten geçer.
  const guvenliGerekce = sinirdanGecir(gerekce, "akis-yurut.pano");
  const konuEtiketi = konu ? `[konu:${String(konu).slice(0, 80)}]` : "";
  let sorgu = admin.from("ajan_gorevleri")
    .select("id, gerekce").eq("case_id", caseId).eq("gorev_tipi", gorevTipi).eq("durum", "bekliyor");
  sorgu = hedefPartyId ? sorgu.eq("hedef_party_id", hedefPartyId) : sorgu.is("hedef_party_id", null);
  // Sırasız limit ölçekte satır kaçırır; en yeniden sıralanır.
  const { data: mevcut } = await sorgu.order("created_at", { ascending: false }).limit(200);
  const bekleyenler = (mevcut ?? []) as any[];

  if (konuEtiketi) {
    // KONU bazlı: yalnız AYNI konuda bekleyen satır varsa yazılmaz.
    if (bekleyenler.some((r) => String(r?.gerekce ?? "").includes(konuEtiketi))) {
      return { yazildi: false, sebep: "bu konuda bekleyen satır zaten var" };
    }
  } else if (bekleyenler.length > 0) {
    return { yazildi: false, sebep: "bekleyen aynı satır zaten var" };
  }

  /* BÖLÜM 5 — TEK ADRES: koşucu da doğrudan yazmaz, ana ajan geçidinden geçer.
     Kaynak yalnız hangi kolun ürettiğini söyler; muhatap her zaman ana ajandır. */
  const r = await anaAjanaBildir(admin, {
    case_id: caseId,
    gorev_tipi: gorevTipi,
    hedef_party_id: hedefPartyId,
    gerekce: konuEtiketi ? `${konuEtiketi} ${guvenliGerekce}` : guvenliGerekce,
    kaynak: "kosucu",
    bekleyen: gorevTipi === "akis_onay_bekliyor" || gorevTipi === "arabulucu_onayi"
      ? "arabulucu_onayi" : null,
  });
  if (!r.yazildi) return { yazildi: false, sebep: r.sebep };
  return { yazildi: true, sebep: "yazıldı" };
}

/* ── ARABULUCU FRENİ (akis_duraklatma) ───────────────────────────────────────
   Arabulucu akışı durdurabilir. Koşucu, bir dosyada kural koşturmadan ÖNCE
   aktif duraklatma var mı bakar:
     · kapsam='dosya' → o dosyada HİÇBİR kural koşmaz.
     · kapsam='adim'  → yalnız hedef_adim'daki kural koşmaz, ötekiler sürer.
   Ajan durdurmayı KENDİLİĞİNDEN KALDIRAMAZ; kaldırma arabulucunun işidir
   (constitution m.3 — süreç hâkimiyeti insandadır). */
type Duraklatma = { kapsam: string; hedef_adim: string | null; sebep: string | null };

async function duraklatmalariOku(admin: any, caseId: string): Promise<Duraklatma[]> {
  try {
    const { data } = await admin.from("akis_duraklatma")
      .select("kapsam, hedef_adim, sebep")
      .eq("case_id", caseId).eq("aktif", true).limit(20);
    return ((data ?? []) as any[]).map((d) => ({
      kapsam: String(d.kapsam ?? "dosya"),
      hedef_adim: d.hedef_adim ? String(d.hedef_adim) : null,
      sebep: d.sebep ? String(d.sebep) : null,
    }));
  } catch { return []; }
}

/* ── KONTROL TERCİHİ (arabulucu_kontrol_tercihleri) ──────────────────────────
   Kapı sayısını ürün değil ARABULUCU belirler: işaretlediği adımlarda ajan
   önce sorar. Liste boşsa (varsayılan) ajan kendiliğinden yapar. */
async function onayIsteyenAdimlar(admin: any, caseId: string): Promise<string[]> {
  try {
    const { data } = await admin.from("arabulucu_kontrol_tercihleri")
      .select("onay_isteyen_adimlar").eq("case_id", caseId).limit(5);
    const hepsi: string[] = [];
    for (const r of ((data ?? []) as any[])) {
      const liste = Array.isArray(r?.onay_isteyen_adimlar) ? r.onay_isteyen_adimlar : [];
      for (const x of liste) { const t = String(x ?? "").trim(); if (t) hepsi.push(t); }
    }
    return hepsi;
  } catch { return []; }
}

/* Akış hatası kaydı. Deneme sayısı bu satırlardan okunduğu için HER DENEME
   kendi satırını bırakır; ama AYNI ETİKET + AYNI METİN üst üste yazılmaz. */
/* `baslik` KODDAN üretilir (fonksiyon adı + HTTP durum kodu), taraf verisi
   taşıyamaz ve olduğu gibi kalır. `sebep` iç çağrının cevap gövdesidir; taraf
   verisi taşıyabildiği için sınır katmanından geçer, geçemezse metne konmaz.
   Gerekçesi ve canlı kanıtı: ./hata-metni.ts */
async function hataYaz(
  admin: any, caseId: string, partyId: string | null, etiket: string,
  baslik: string, sebep = "",
): Promise<void> {
  try {
    const gerekce = `${etiket} ${akisHataMetni(baslik, sebep)}`.slice(0, 500);
    /* ONARIM (24.08.2026): eşleşme TAM olduğu için sorgu da tam eşleşmeyle
       yapılır. Eskiden 300 satır çekilip JS'te taranıyordu ve sıralama yoktu;
       `akis_hatasi` satırları birikince kapı körelirdi. `.eq` sunucuda çalışır,
       satır sayısından bağımsızdır. */
    const { data: mevcut } = await admin.from("ajan_gorevleri")
      .select("id").eq("case_id", caseId).eq("gorev_tipi", "akis_hatasi")
      .eq("gerekce", gerekce).limit(1);
    if (((mevcut ?? []) as any[]).length > 0) return;
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
        // Hedef nesnel listeden okunur (ASAMA_HEDEFI); model yorumu yoktur.
        if (neden) notlar.push(`aşama ilerlemedi (${dosya.id}): ${neden} · hedef: ${dosyaHedefi(mevcut)}`);
        continue;
      }

      /* Aynı geçiş İKİNCİ KEZ yazılmaz — arabulucu elle geri aldıysa ajan aynı
         geçişi tekrar denemez. Etiket nöbetçinin kullandığıyla AYNIDIR.

         ONARIM (24.08.2026) — İKİ KUSUR BİRDEN:
         (a) `startsWith` kullanılıyordu. Ama `asama_gecisi` satırlarını ÜÇ
             kaynak yazıyor: bu koşucu (`[gecis:…]` ile başlar), ön yüzdeki
             elle ilerletme (aynı biçim) ve NÖBETÇİ — nöbetçi `anaAjanaBildir`
             geçidinden yazdığı için satır `[kaynak:nobetci] [gecis:…]` ile
             başlar. `startsWith` o satırları GÖRMÜYORDU; yani yukarıdaki
             güvence nöbetçinin yaptığı geçişler için boştu ve koşucu aynı
             geçişi yeniden yazabilirdi.
         (b) `.limit(200)` sırasızdı. Postgres sırasız sorguda hangi satırları
             döndüreceğini garanti etmez; satır sayısı artınca kapı körelir
             (aynı kusur `ajan-nobetci/gorevEtiketiVarMi`de canlıda görüldü:
             411 satır, kapı hiç tutmuyordu).
         Çözüm `gorevEtiketiVarMi` ile aynı: sunucuda `like` ile daralt,
         en yeniden sırala, JS'te `includes` ile kesinleştir. */
      const etiket = `[gecis:${mevcut}->${hedef}]`;
      const { data: iz } = await admin.from("ajan_gorevleri")
        .select("id, gerekce").eq("case_id", dosya.id).eq("gorev_tipi", "asama_gecisi")
        .like("gerekce", `%${etiket}%`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (((iz ?? []) as any[]).some((r) => String(r?.gerekce ?? "").includes(etiket))) continue;

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

/* ── ARABULUCU TALİMAT KUYRUĞU (yasa · "şunu şöyle yap, onaya sun") ──────────
   Koşucu, olayları işlemeden ÖNCE bekleyen talimatlara bakar. Bekleyen talimat
   varsa hedef adımı çağırır ve gövdeye talimat_id + talimat metnini koyar.
   Adım bitince talimat 'uygulandi' olur ve ARABULUCUNUN sohbetine onay satırı
   düşer ('arabulucu_onayi'). Onay gelmeden yapılan iş taraf yüzeyine ÇIKMAZ:
   çağrıya talimat_modu=true geçilir, adımlar bu kipte tarafa yazan hiçbir şey
   yapmaz (föy gönderilmez, taraftan bir şey istenmez, e-posta gitmez).
   FREN ÜSTÜNDÜR: dosyada aktif duraklatma varsa talimat da bekler.
   İKİ DENEME: aynı talimat en fazla iki kez denenir, sonra 'uygulanamadi'. */
const TALIMAT_TUR_SINIRI = 20;

async function talimatlariYurut(
  admin: any, ozet: { notlar: string[] },
): Promise<{ uygulanan: number; reddedilen: number }> {
  let uygulanan = 0;
  let reddedilen = 0;
  try {
    const { data: talimatlar, error } = await admin.from("arabulucu_talimatlari")
      .select("id, case_id, hedef_adim, talimat, durum, sonuc_ozeti, created_at")
      .eq("durum", "bekliyor")
      .order("created_at", { ascending: true })
      .limit(TALIMAT_TUR_SINIRI);
    if (error) {
      ozet.notlar.push(`talimatlar okunamadı: ${error.message}`);
      return { uygulanan, reddedilen };
    }

    for (const t of ((talimatlar ?? []) as any[])) {
      const caseId = String(t.case_id);
      const adim = metin(t.hedef_adim);
      const talimatMetni = metin(t.talimat);

      // FREN ÜSTÜNDÜR: duraklatma varsa talimat da bekler, durumu değişmez.
      const duraklatmalar = await duraklatmalariOku(admin, caseId);
      if (duraklatmalar.some((d) => d.kapsam === "dosya" || d.hedef_adim === adim)) {
        ozet.notlar.push(`talimat bekliyor (${caseId}): akış durdurulmuş`);
        continue;
      }

      // Talimat almayan adım: hesap işidir, metin üretmez.
      if (TALIMAT_ALMAYAN.includes(adim)) {
        await admin.from("arabulucu_talimatlari").update({
          durum: "uygulanamadi",
          red_sebebi: "Bu adım veriden hesaplanır.",
          karar_zamani: new Date().toISOString(),
        }).eq("id", t.id);
        await panoyaYaz(admin, caseId, "arabulucu_onayi", null,
          "Bu talimatı uygulayamam — bu adım veriden hesaplanır.", `talimat:${t.id}`);
        reddedilen++;
        continue;
      }

      if (!motoraBagliMi(adim)) {
        await admin.from("arabulucu_talimatlari").update({
          durum: "uygulanamadi",
          red_sebebi: "Bu adım ortak çalışma motoruna bağlı değil.",
          karar_zamani: new Date().toISOString(),
        }).eq("id", t.id);
        reddedilen++;
        continue;
      }

      // ANAYASA ÜSTÜNDÜR: yasak isteyen talimat uygulanmaz.
      const denetim = talimatiDenetle(talimatMetni);
      if (!denetim.uygun) {
        await admin.from("arabulucu_talimatlari").update({
          durum: "uygulanamadi",
          red_sebebi: denetim.sebep,
          karar_zamani: new Date().toISOString(),
        }).eq("id", t.id);
        await panoyaYaz(admin, caseId, "arabulucu_onayi", null,
          `Bu talimatı uygulayamam — ${denetim.sebep}.`, `talimat:${t.id}`);
        reddedilen++;
        continue;
      }

      const girdi = await girdiTamamla(admin, adim, { case_id: caseId });
      if (girdi.govdeler.length === 0) {
        const eksikMetni = girdi.eksik.length ? girdi.eksik.join(", ") : "gerekli bilgi";
        await admin.from("arabulucu_talimatlari").update({
          durum: "uygulanamadi",
          red_sebebi: `${eksikMetni} dosyada bulunamadı`,
          karar_zamani: new Date().toISOString(),
        }).eq("id", t.id);
        await panoyaYaz(admin, caseId, "arabulucu_onayi", null,
          `Bu talimatı uygulayamadım — ${eksikMetni} dosyada bulunamadı.`, `talimat:${t.id}`);
        reddedilen++;
        continue;
      }

      let hepsiOldu = true;
      let sonSebep = "";
      for (const g of girdi.govdeler) {
        const r = await icFonksiyonCagir(adim, {
          ...g, talimat_id: String(t.id), talimat: talimatMetni, talimat_modu: true,
        });
        if (!r.ok) { hepsiOldu = false; sonSebep = r.sebep; }
      }

      if (!hepsiOldu) {
        /* İKİ DENEME SINIRI: sonuc_ozeti alanında deneme izi tutulur; ikinci
           denemede de olmazsa talimat bırakılır ve sebebi yazılır. */
        const denemeVar = String(t.sonuc_ozeti ?? "").includes("deneme:1");
        if (denemeVar) {
          await admin.from("arabulucu_talimatlari").update({
            durum: "uygulanamadi",
            red_sebebi: `İki denemede de çalışmadı: ${sonSebep}`.slice(0, 500),
            karar_zamani: new Date().toISOString(),
          }).eq("id", t.id);
          await panoyaYaz(admin, caseId, "arabulucu_onayi", null,
            "Bu talimatı iki denemede de uygulayamadım.", `talimat:${t.id}`);
          reddedilen++;
        } else {
          await admin.from("arabulucu_talimatlari")
            .update({ sonuc_ozeti: "deneme:1" }).eq("id", t.id);
          ozet.notlar.push(`talimat çalıştırılamadı (${caseId}): ${sonSebep}`);
        }
        continue;
      }

      await admin.from("arabulucu_talimatlari").update({
        durum: "uygulandi",
        uygulanma_zamani: new Date().toISOString(),
        sonuc_ozeti: talimatOzeti(talimatMetni),
      }).eq("id", t.id);

      /* ONAYA SUNULUR: iş taraf yüzeyine çıkmadan arabulucunun sohbetine düşer.
         Onay satırı 'arabulucu_onayi' tipindedir; nöbetçi bu tipi yürütmez. */
      const onaySatiri = await panoyaYaz(admin, caseId, "arabulucu_onayi", null,
        `[talimat:${t.id}] Talimatınıza göre yeniden hazırladım, onayınıza sunuyorum.`,
        `talimat:${t.id}`);
      if (!onaySatiri.yazildi) {
        // SESSİZ DÜŞME YOK: yazılamayan onay isteğinin sebebi özete geçer.
        ozet.notlar.push(`talimat onayı sohbete yazılamadı (${caseId}): ${onaySatiri.sebep}`);
      }
      uygulanan++;
    }
  } catch (e: any) {
    ozet.notlar.push(`talimat kuyruğu çalışamadı: ${String(e?.message ?? e).slice(0, 120)}`);
  }
  return { uygulanan, reddedilen };
}

/* ── B3: HEDEFE GÖRE KOORDİNASYON ───────────────────────────────────────────
   Koşucu her turda dosyanın O ANKİ HEDEFİNİ belirler. Hedef, aşamanın NESNEL
   çıktısıdır — kodda açık listedir, model yorumu YOKTUR. Hedef bir yön verir;
   hiçbir kapıyı açmaz, hiçbir onayı kaldırmaz. */
const ASAMA_HEDEFI: Record<number, string> = {
  1: "dosyanın kurulması: iki taraf kaydı ve en az bir belge ya da başvuru metni",
  2: "taraf analizlerinin ve ortak zemin raporunun tamamlanması",
  3: "oturumun planlanması",
  4: "oturumun yapılmış olarak işaretlenmesi",
  5: "bilirkişi kararı ve görüşme notunun kaydı",
  6: "anlaşma taslağının hazırlanması",
  7: "kapanış: imza ve belge teslimi (insan kapısı)",
};

function dosyaHedefi(currentPhase: unknown): string {
  const n = Math.min(7, Math.max(1, Number(currentPhase ?? 1) || 1));
  return ASAMA_HEDEFI[n] ?? "";
}

/* ÖNCELİK: bir olay ne kadar çok işi açıyorsa önce koşar (tamamlanmazsa kaç iş
   bekliyor). Eşitlikte ESKİ olay önce. Sayım nesneldir: olaya bağlı ETKİN kural
   sayısı. Model sıralama yapmaz. */
function olaylariSirala(olaylar: any[], kurallar: any[]): any[] {
  const agirlik = (olay: any) => kurallar
    .filter((k) => String(k.olay_kodu) === String(olay.olay_kodu)).length;
  return [...olaylar].sort((a, b) => {
    const f = agirlik(b) - agirlik(a);
    if (f !== 0) return f;
    return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
  });
}

/* DEVİR: bir ajan "Eksik: X" ile kapandıysa eksik, önce onu ÜRETEBİLECEK ajana
   devredilir; insana ancak hiçbir ajan üretemiyorsa gider. Eşleme kodda açık
   listedir (DEVIR_ESLEME). Devir kaydı ajan_bellek'e yazılır ki aynı eksik
   ikinci kez devredilmesin. */
async function devirKollari(admin: any, ozet: { notlar: string[] }): Promise<number> {
  let devredilen = 0;
  // Devir zincirindeki sıra numarası (kayıt anahtarı için).
  let devirSira = 0;
  try {
    const { data: satirlar } = await admin.from("agent_states")
      .select("case_id, agent_type, party_id, last_output, status")
      .eq("status", "completed").limit(200);
    for (const r of ((satirlar ?? []) as any[])) {
      const cikti = r.last_output && typeof r.last_output === "object" ? r.last_output : {};
      const eksikler = Array.isArray((cikti as any).eksik) ? (cikti as any).eksik : [];
      for (const e of eksikler) {
        const eksikMetni = String(e ?? "");
        const hedef = devirHedefi(eksikMetni);
        if (!hedef?.adim) continue;                       // insana gidecek olan burada kalır
        const caseId = String(r.case_id);
        const anahtar = `devir:${hedef.adim}`;
        if (await bellekVarMi(admin, caseId, null, anahtar)) continue;   // ikinci kez devredilmez

        /* BÖLÜM 2 — MÜKERRER KOŞUM BİTİYOR: adım daha önce BAŞARIYLA
           tamamlandıysa devir onu yeniden koşturmaz. 20.08 canlı bulgusu:
           devir kolu taraf-kalem-cikar'ı yeniden koşturdu, kalemler 6'dan
           23'e çıktı. İşaret artık kapanışta üretiliyor. */
        const tamamlandiAnahtari = `tamamlandi:${hedef.adim}`;
        const tamamlandiMi = await bellekVarMi(admin, caseId, null, tamamlandiAnahtari)
          || await bellekVarMi(admin, caseId, r.party_id ? String(r.party_id) : null, tamamlandiAnahtari);
        if (tamamlandiMi) {
          ozet.notlar.push(`devir atlandı (${caseId}): ${hedef.adim} daha önce tamamlandı`);
          await bellekYaz(admin, caseId, null, anahtar, {
            kim: hedef.kim, sonuc: "zaten_tamam", zaman: new Date().toISOString(),
          });
          continue;
        }

        const girdi = await girdiTamamla(admin, hedef.adim, { case_id: caseId });
        if (girdi.govdeler.length === 0) continue;
        let oldu = false;
        for (const g of girdi.govdeler) {
          const c = await icFonksiyonCagir(hedef.adim, g);
          if (c.ok) oldu = true;
        }
        await bellekYaz(admin, caseId, null, anahtar, {
          kim: hedef.kim, sonuc: oldu ? "devredildi" : "denenemedi",
          zaman: new Date().toISOString(),
        });

        /* BÖLÜM 4 — DEVİR ZİNCİRİ KAYDI: yalnız kim → kim, istek türü ve sonuç.
           İçerik (belge metni, tutar, beyan, analiz) YAZILMAZ ve aktarılmaz. */
        devirSira += 1;
        await devirYaz(admin, {
          case_id: caseId, sira_no: devirSira,
          kimden: "taraf ajanı", kime: "ana ajan",
          istek_turu: hedef.adim === "taraf-kalem-cikar" ? "kalem_hazirligi"
            : hedef.adim === "bilirkisi-sorulari" ? "bilirkisi_secimi"
            : hedef.adim === "masa-kalem-karsilastir" ? "kalem_hazirligi"
            : "eksik_belge",
          sonuc: oldu ? "tamam" : "bekliyor",
        });
        await panoyaYaz(admin, caseId, "arabulucu_onayi", null,
          `Eksik kalan işi ${hedef.kim} devraldı.`, `devir:${hedef.adim}`);
        if (oldu) devredilen++;
      }
    }
  } catch (e: any) {
    ozet.notlar.push(`devir yapılamadı: ${String(e?.message ?? e).slice(0, 120)}`);
  }
  return devredilen;
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

    /* TALİMAT KUYRUĞU: olaylar işlenmeden ÖNCE koşar — arabulucunun verdiği
       talimat sıradaki olayların arkasında beklemez. */
    const talimatOzetSayaci = { notlar: [] as string[] };
    const talimatSonuc = await talimatlariYurut(admin, talimatOzetSayaci);

    const { data: olaylar, error: oErr } = await admin.from("akis_olaylari")
      .select("id, case_id, party_id, olay_kodu, veri, islendi, created_at")
      .eq("islendi", false)
      .order("created_at", { ascending: true })
      .limit(TUR_SINIRI);
    if (oErr) return json({ error: oErr.message }, 500);

    const ozet = {
      talimat_uygulandi: talimatSonuc.uygulanan,
      talimat_uygulanamadi: talimatSonuc.reddedilen,
      okunan_olay: (olaylar ?? []).length,
      islenen_olay: 0,
      calistirilan_kural: 0,
      onaya_dusen: 0,
      atlanan_kural: 0,
      duraklatilan_dosya: 0,
      hatali_kural: 0,
      notlar: [] as string[],
    };
    ozet.notlar.push(...talimatOzetSayaci.notlar);
    if (!olaylar || olaylar.length === 0) return json({ ok: true, ...ozet });

    // Kurallar bir kez okunur; olay kodlarına göre eşleştirilir.
    const kodlar = Array.from(new Set((olaylar as any[]).map((o) => String(o.olay_kodu))));
    const { data: kurallar, error: kErr } = await admin.from("akis_kurallari")
      .select("id, kod, olay_kodu, kosul, sonraki_adim, sahip, insan_kapisi, gerekce, sira, etkin")
      .in("olay_kodu", kodlar).eq("etkin", true)
      .order("sira", { ascending: true });
    if (kErr) return json({ error: kErr.message }, 500);

    /* ÖNCELİK: hedefe yaklaştırma gücüne göre sıra. Sayım nesneldir. */
    const siraliOlaylar = olaylariSirala(olaylar as any[], (kurallar ?? []) as any[]);

    for (const olay of siraliOlaylar) {
      const caseId = String(olay.case_id);
      const partyId = olay.party_id ? String(olay.party_id) : null;
      const eslesen = ((kurallar ?? []) as any[])
        .filter((k) => String(k.olay_kodu) === String(olay.olay_kodu));

      if (eslesen.length === 0) {
        // Kuralı olmayan olay da işlenmiş sayılır: tekrar tekrar okunmasın.
        await olayiKapat(admin, olay);
        ozet.islenen_olay++;
        continue;
      }

      /* ARABULUCU FRENİ: kural koşturmadan ÖNCE bakılır. Dosya kapsamlı
         duraklatma varsa bu dosyada HİÇBİR kural koşmaz; olay işlenmiş
         SAYILMAZ ki devam edilince kaldığı yerden sürsün. */
      const duraklatmalar = await duraklatmalariOku(admin, caseId);
      const dosyaDuraklatmasi = duraklatmalar.find((d) => d.kapsam === "dosya") ?? null;
      if (dosyaDuraklatmasi) {
        ozet.duraklatilan_dosya++;
        const sebep = dosyaDuraklatmasi.sebep || "sebep yazılmadı";
        ozet.notlar.push(`${caseId}: arabulucu akışı durdurdu — ${sebep}`);
        await hataYaz(admin, caseId, partyId, `[dur:${caseId}]`,
          "Arabulucu akışı durdurdu.", sebep);
        continue;
      }
      const adimDuraklatmalari = duraklatmalar
        .filter((d) => d.kapsam === "adim" && d.hedef_adim)
        .map((d) => String(d.hedef_adim));
      const onayGerekenler = await onayIsteyenAdimlar(admin, caseId);
      // Onay verilmiş olay: tercih listesine BAKILMADAN koşulur.
      const onayVerildi = !!(olay.veri && typeof olay.veri === "object"
        && (olay.veri as any).onay_verildi === true);

      let olayHatali = false;
      // BÖLÜM 1 — bu olayın adımlarından dönen defter notları burada birikir.
      let olayDefterNotu: string | null = null;

      for (const kural of eslesen) {
        const kuralKodu = metin(kural.kod) || String(kural.id);

        // ADIM kapsamlı duraklatma: yalnız bu kural koşmaz, ötekiler sürer.
        if (adimDuraklatmalari.includes(kuralKodu)) {
          ozet.atlanan_kural++;
          ozet.notlar.push(`${kuralKodu}: arabulucu bu adımı durdurdu`);
          continue;
        }

        /* KONTROL TERCİHİ: arabulucu bu adımda önce sorulmasını istediyse
           fonksiyon ÇAĞRILMAZ, panoya onay satırı düşer. Onay verilmiş
           olayda bu kapı atlanır. */
        if (!onayVerildi && onayGerekenler.includes(kuralKodu)) {
          const r = await panoyaYaz(
            admin, caseId, "akis_onay_bekliyor", partyId,
            `${metin(kural.gerekce) || kuralKodu} için onayınızı bekliyorum.`,
            `kural:${kuralKodu}`,
          );
          if (r.yazildi) ozet.onaya_dusen++;
          else ozet.notlar.push(`${kuralKodu}: ${r.sebep}`);
          olayHatali = true;   // olay açık kalır: onay gelince koşulacak
          continue;
        }

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
            `kural:${kuralKodu}`,
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
        /* ONARIM (24.08.2026): sorgu etiketle DARALTILIR ve en yeniden
           sıralanır. Eskiden sırasız `.limit(300)` ile bütün iz satırları
           çekiliyordu; dosya başına satır sayısı artınca kapı körelir
           (aynı kusur nöbetçide canlıda görüldü). `startsWith` yerine
           `includes`: satır ileride bir geçitten geçip ön ek alırsa kapı
           yine tutar. */
        const etiket = `[akis:${olay.id}:${kuralKodu}]`;
        const { data: izSatirlari } = await admin.from("ajan_gorevleri")
          .select("id, gorev_tipi, gerekce").eq("case_id", caseId)
          .in("gorev_tipi", ["akis_kosuldu", "akis_hatasi"])
          .like("gerekce", `%${etiket}%`)
          .order("created_at", { ascending: false })
          .limit(50);
        const kosulmus = ((izSatirlari ?? []) as any[])
          .some((r) => String(r?.gerekce ?? "").includes(etiket) && String(r?.gorev_tipi) === "akis_kosuldu");
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
          .filter((r) => String(r?.gerekce ?? "").includes(etiket) && String(r?.gorev_tipi) === "akis_hatasi").length;
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
            `${fonksiyon} çalıştırılamadı.`, `${eksikMetni} dosyada bulunamadı.`);
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
          /* BÖLÜM 1 — çağrılan adım defter notu döndürdüyse yutulmaz; olay
             kaydına taşınır. Adımlar bu notu dönüş gövdesine koyar. */
          const notEsleme = /"defter_notu"\s*:\s*"([^"]{1,400})"/.exec(r.sebep ?? "");
          if (notEsleme) olayDefterNotu = notEsleme[1];
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
            akisHataBasligi(fonksiyon, sonSebep), sonSebep);
        }
      }

      if (!olayHatali) {
        /* BÖLÜM 1 — defter notu varsa olay kaydına taşınır; sessiz düşmez. */
        const kapanis = await olayiKapat(admin, olay, olayDefterNotu);
        if (!kapanis.ok) ozet.notlar.push(`olay ${olay.id}: işlendi yazılamadı — ${kapanis.sebep}`);
        else ozet.islenen_olay++;
        if (olayDefterNotu) ozet.notlar.push(`defter notu (${olay.id}): ${olayDefterNotu}`);
      }
    }

    /* AŞAMA İLERLETME: koşucunun her turunun SONUNDA değerlendirilir. Nöbetçi
       koşucuyu zaten 3 dakikada bir tetiklediği için yeni bir zamanlayıcı
       kurulmaz. Koşullar nesnel; sağlanmıyorsa aşama değişmez. */
    // DEVİR: eksik kalan işler önce üretebilecek ajana geçer.
    const devredilen = await devirKollari(admin, ozet);

    const asama = await asamaIlerlet(admin);
    ozet.notlar.push(...asama.notlar);

    return json({
      ok: true, ...ozet,
      asama_ilerletildi: asama.ilerletilen,
      devredilen,
      notlar: ozet.notlar.slice(0, 50),
    });
  } catch (e: any) {
    const msg = String(e?.message ?? "Bilinmeyen sistem hatası");
    console.error("[akis-yurut] Genel hata:", msg);
    return json({ error: msg }, 500);
  }
});
