// AJAN ANLATIMI + EKSİK TAMAMLAMA (ortak yardımcı)
//
// Üç işi vardır ve ÜÇÜ DE BEST-EFFORT'tur — hiçbiri çağıran fonksiyonun asıl
// işini, girdisini, çıktısını ya da süzgeçlerini DEĞİŞTİRMEZ. Anlatım yazılamazsa
// iş durmaz; bu dosyadaki hiçbir işlev throw etmez.
//
// 1) ANLATIM: ajan çalışırken adımlarını sırayla yazar. Yer:
//    agent_states.last_output içindeki "adimlar" dizisi — { sira, metin, zaman }.
//    Başlarken status='running', bitince 'completed', hatada 'failed'.
//    Mevcut last_output ALANLARI KORUNUR (okunur, üzerine eklenir) — böylece
//    orkestratör ilerlemesi gibi eski okuyucular kırılmaz.
//
// 2) EKSİK TAMAMLAMA: ajan bir eksik gördüğünde önce KENDİ tamamlamayı dener.
//    Sıra: (a) aynı tarafın BAŞKA BELGESİ → (b) dosyada daha önce girilmiş veri
//    → (c) yalnız mevzuat türü eksikler için ürünün bilgi tabanı.
//    UYDURMA YASAK: bulamadıysa "tamamladım" denmez, boş döner.
//
// 3) DOĞRU KİŞİYE SORMA: tamamlanamayan eksik, ait olduğu kişiye sorulur.
//    Belge/tarafın bilgisi → o tarafa (hedef_party_id dolu).
//    Karar/onay/usul → arabulucuya (hedef_party_id boş).
//    Emin değilse ARABULUCUYA sorar ve gerekçesine "şüpheli" yazar.
//    Aynı eksik için mükerrer bildirim yazılmaz.
//
// DİL (bağlayıcı): adım ve bildirim metinlerinde fonksiyon adı, tablo adı,
// "edge function", "upsert", "invoke" gibi kelimeler GEÇMEZ. Taraftan bir şey
// istenirken suçlayıcı dil ("eksik", "yetersiz", "vermediniz") kullanılmaz.
// Duygu, kişilik, niyet ve teşhis etiketi YASAKTIR (constitution m.2).
//
// KÖR VERİ (constitution m.1): tarafa görünecek anlatım YALNIZ o tarafın kendi
// ajanına aittir (tarafa_gorunur=true + party_id). Masa ajanının anlatımı
// tarafa açılmaz; bu bayrak çağıran fonksiyon açıkça istemedikçe DEĞİŞTİRİLMEZ.

export type AnlatimSahibi = {
  case_id: string;
  agent_type: string;
  /** Taraf kapsamlı iş ise o tarafın kimliği; dosya geneli işte boş. */
  party_id?: string | null;
  /** YALNIZ tarafın KENDİ ajanı için true. Masa ajanında verilmez. */
  tarafaGorunur?: boolean;
};

type Adim = { sira: number; metin: string; zaman: string };

function simdi(): string {
  return new Date().toISOString();
}

function kisalt(v: unknown, n = 300): string {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
}

export type Anlatim = {
  /** İşe başladığını yazar (status='running'). */
  baslat: (ilkAdim?: string) => Promise<void>;
  /** Tek cümlelik bir adım ekler. */
  adim: (metin: string) => Promise<void>;
  /** Sonuç: "Yapıldı" ve varsa "Eksik" (status='completed'). */
  bitti: (o: { yapildi: string; eksik?: string | string[] }) => Promise<void>;
  /** Hata: status='failed' + tek cümle sebep. */
  hata: (sebep: string) => Promise<void>;
};

/* Satırı bulur/açar ve last_output'u KORUYARAK günceller. Hiçbir hata dışarı
   sızmaz; anlatım yazılamazsa çağıran işlem etkilenmez. */
async function yaz(
  admin: any, sahip: AnlatimSahibi, status: string,
  adimlar: Adim[], ek?: Record<string, unknown>,
): Promise<void> {
  try {
    let sorgu = admin.from("agent_states").select("id, last_output")
      .eq("case_id", sahip.case_id).eq("agent_type", sahip.agent_type);
    sorgu = sahip.party_id ? sorgu.eq("party_id", sahip.party_id) : sorgu.is("party_id", null);
    const { data: mevcut } = await sorgu.maybeSingle();

    let eskiCikti: Record<string, unknown> = {};
    const ham = (mevcut as any)?.last_output;
    if (ham && typeof ham === "object" && !Array.isArray(ham)) eskiCikti = { ...ham };
    else if (typeof ham === "string") {
      try {
        const c = JSON.parse(ham);
        if (c && typeof c === "object" && !Array.isArray(c)) eskiCikti = c;
      } catch { /* okunamayan eski çıktı korunmaz, üstüne yazılmaz */ }
    }

    const govde: Record<string, unknown> = {
      status,
      updated_at: simdi(),
      last_output: { ...eskiCikti, adimlar, ...(ek ?? {}) },
    };
    // Bayrak yalnız AÇIKÇA istendiğinde yazılır; masa ajanının satırı tarafa açılmaz.
    if (sahip.tarafaGorunur === true) govde.tarafa_gorunur = true;

    if ((mevcut as any)?.id) {
      await admin.from("agent_states").update(govde).eq("id", (mevcut as any).id);
    } else {
      await admin.from("agent_states").insert({
        case_id: sahip.case_id,
        agent_type: sahip.agent_type,
        party_id: sahip.party_id ?? null,
        ...govde,
      });
    }
  } catch (e: any) {
    console.error("[anlatim] yazılamadı", { agent_type: sahip.agent_type, hata: kisalt(e?.message ?? e, 120) });
  }
}

/** Anlatım açar. Dönen nesnenin hiçbir işlevi throw etmez. */
export function anlatimAc(admin: any, sahip: AnlatimSahibi): Anlatim {
  const adimlar: Adim[] = [];
  const ekle = (metin: string) => {
    const t = kisalt(metin);
    if (!t) return;
    adimlar.push({ sira: adimlar.length + 1, metin: t, zaman: simdi() });
  };
  return {
    async baslat(ilkAdim?: string) {
      if (ilkAdim) ekle(ilkAdim);
      await yaz(admin, sahip, "running", adimlar);
    },
    async adim(metin: string) {
      ekle(metin);
      await yaz(admin, sahip, "running", adimlar);
    },
    async bitti({ yapildi, eksik }) {
      const eksikler = Array.isArray(eksik) ? eksik.filter(Boolean) : (eksik ? [eksik] : []);
      ekle(`Yapıldı: ${kisalt(yapildi)}`);
      // "Eksik" satırı YALNIZ gerçekten eksik varsa yazılır.
      for (const e of eksikler) ekle(`Eksik: ${kisalt(e)}`);
      await yaz(admin, sahip, "completed", adimlar, {
        yapildi: kisalt(yapildi),
        ...(eksikler.length ? { eksik: eksikler.map((x) => kisalt(x)) } : {}),
      });
    },
    async hata(sebep: string) {
      ekle(`Bu işi tamamlayamadım: ${kisalt(sebep, 200)}`);
      await yaz(admin, sahip, "failed", adimlar);
    },
  };
}

/* ── EKSİK TAMAMLAMA ARAMALARI ───────────────────────────────────────────────
   Üçü de YALNIZ okur, hiçbir şey yazmaz ve bulamayınca boş döner.
   Kör veri: taraf kapsamlı aramalar party_id ile SORGUDA sınırlanır; karşı
   tarafın belgesi ve verisi hiçbir aramaya girmez. */

export type Bulgu = { nerede: string; alinti: string; belge_id?: string | null };

function anahtarUyar(metin: string, anahtarlar: string[]): string | null {
  const kaynak = String(metin ?? "");
  if (!kaynak.trim()) return null;
  const cumleler = kaynak.split(/(?<=[.!?;\n])\s+/);
  for (const c of cumleler) {
    const kucuk = c.toLocaleLowerCase("tr-TR");
    if (anahtarlar.some((a) => a && kucuk.includes(a.toLocaleLowerCase("tr-TR")))) {
      const t = c.replace(/\s+/g, " ").trim();
      if (t.length > 8) return t.slice(0, 300);
    }
  }
  return null;
}

/** (a) Aynı tarafın BAŞKA belgesinde karşılığı var mı. */
export async function belgedeAra(
  admin: any, o: { case_id: string; party_id: string; anahtarlar: string[]; haricBelgeId?: string | null },
): Promise<Bulgu | null> {
  try {
    let q = admin.from("case_documents")
      .select("id, file_name, extracted_text")
      .eq("case_id", o.case_id).eq("party_id", o.party_id)   // KÖR VERİ: yalnız kendi belgeleri
      .not("extracted_text", "is", null).limit(20);
    if (o.haricBelgeId) q = q.neq("id", o.haricBelgeId);
    const { data } = await q;
    for (const d of ((data ?? []) as any[])) {
      const alinti = anahtarUyar(String(d.extracted_text ?? ""), o.anahtarlar);
      if (alinti) return { nerede: `dosyanızdaki "${kisalt(d.file_name, 80)}" belgesi`, alinti, belge_id: d.id };
    }
    return null;
  } catch { return null; }
}

/** (b) Dosyada DAHA ÖNCE GİRİLMİŞ veride var mı (tarafın kendi beyanı / kalemleri). */
export async function kayitlardaAra(
  admin: any, o: { case_id: string; party_id: string; anahtarlar: string[] },
): Promise<Bulgu | null> {
  try {
    const { data: taraf } = await admin.from("case_parties")
      .select("statement").eq("id", o.party_id).maybeSingle();
    const beyan = anahtarUyar(String((taraf as any)?.statement ?? ""), o.anahtarlar);
    if (beyan) return { nerede: "kendi anlatımınız", alinti: beyan };

    const { data: kalemler } = await admin.from("taraf_kalemleri")
      .select("kalem_adi, dayanak_alinti, dayanak_belge_id")
      .eq("case_id", o.case_id).eq("party_id", o.party_id).limit(50);
    for (const k of ((kalemler ?? []) as any[])) {
      const alinti = anahtarUyar(`${k.kalem_adi ?? ""} ${k.dayanak_alinti ?? ""}`, o.anahtarlar);
      if (alinti) return { nerede: "daha önce girilmiş kalem kaydı", alinti, belge_id: k.dayanak_belge_id ?? null };
    }
    return null;
  } catch { return null; }
}

/** (c) YALNIZ mevzuat türü eksikler için bilgi tabanı. Dosya verisi taşımaz. */
export async function bilgiTabanindaAra(
  admin: any, o: { anahtarlar: string[] },
): Promise<Bulgu | null> {
  try {
    const terim = o.anahtarlar.filter(Boolean)[0];
    if (!terim) return null;
    const { data } = await admin.from("knowledge_base_chunks")
      .select("content, kaynak_adi")
      .ilike("content", `%${terim}%`).limit(3);
    const satir = ((data ?? []) as any[])[0];
    if (!satir) return null;
    const alinti = anahtarUyar(String(satir.content ?? ""), o.anahtarlar) ?? kisalt(satir.content, 300);
    if (!alinti) return null;
    return { nerede: `bilgi tabanı — ${kisalt(satir.kaynak_adi ?? "kaynak", 80)}`, alinti };
  } catch { return null; }
}

/* ── DOĞRU KİŞİYE SORMA ──────────────────────────────────────────────────────
   Belge ya da tarafın bilgisi → o tarafa. Karar, onay ya da usul → arabulucuya.
   Emin değilse arabulucuya sorulur ve gerekçeye "şüpheli" yazılır. */

export type SoruHedefi = "taraf" | "arabulucu" | "belirsiz";

export async function eksigiSor(
  admin: any,
  o: {
    case_id: string;
    hedef: SoruHedefi;
    party_id?: string | null;
    /** Pano tipi; taraf tarafında tarafa açık tiplerden biri olmalı. */
    gorev_tipi: string;
    /** Tamamlayıcı dille yazılmış tek cümle. Suçlayıcı dil yasak. */
    mesaj: string;
    /** Mükerrer yazımı önleyen kısa etiket, ör. "kalem:kira-farki". */
    etiket: string;
  },
): Promise<{ yazildi: boolean; sebep: string }> {
  try {
    const tarafaMi = o.hedef === "taraf" && !!o.party_id;
    // Belirsizse ARABULUCUYA sorulur ve gerekçeye "şüpheli" düşülür.
    const hedefPartyId = tarafaMi ? String(o.party_id) : null;
    const supheliNotu = o.hedef === "belirsiz" ? " (şüpheli — kime sorulacağı net değil)" : "";
    const gerekce = `[eksik:${kisalt(o.etiket, 60)}] ${kisalt(o.mesaj, 400)}${supheliNotu}`;

    // Mükerrer yazma: aynı dosya + tip + hedef için aynı etiketli satır varsa geç.
    let q = admin.from("ajan_gorevleri")
      .select("id, gerekce").eq("case_id", o.case_id).eq("gorev_tipi", o.gorev_tipi).limit(200);
    q = hedefPartyId ? q.eq("hedef_party_id", hedefPartyId) : q.is("hedef_party_id", null);
    const { data: mevcut } = await q;
    const etiketBasi = `[eksik:${kisalt(o.etiket, 60)}]`;
    if (((mevcut ?? []) as any[]).some((r) => String(r?.gerekce ?? "").startsWith(etiketBasi))) {
      return { yazildi: false, sebep: "aynı eksik için kayıt zaten var" };
    }

    const { error } = await admin.from("ajan_gorevleri").insert({
      case_id: o.case_id,
      gorev_tipi: o.gorev_tipi,
      durum: "bekliyor",
      hedef_party_id: hedefPartyId,
      gerekce,
    });
    if (error) return { yazildi: false, sebep: `kayıt yazılamadı: ${kisalt(error.message, 120)}` };
    return { yazildi: true, sebep: "soruldu" };
  } catch (e: any) {
    return { yazildi: false, sebep: `kayıt yazılamadı: ${kisalt(e?.message ?? e, 120)}` };
  }
}

/* ── EŞZAMANLILIK KAPISI ─────────────────────────────────────────────────────
   Aynı iş aynı dosya için İKİ KEZ başlatılmaz: satır 'running' ise yeniden
   tetiklenmez, SIRAYA DA ALINMAZ — atlanır ve sebebi çağırana döner.
   Farklı ajanlar birbirini beklemez; bu kapı yalnız AYNI ajan kolu içindir. */
export async function zatenCalisiyorMu(
  admin: any, sahip: AnlatimSahibi, bayatlamaDakika = 15,
): Promise<{ calisiyor: boolean; sebep: string }> {
  try {
    let q = admin.from("agent_states").select("status, updated_at")
      .eq("case_id", sahip.case_id).eq("agent_type", sahip.agent_type);
    q = sahip.party_id ? q.eq("party_id", sahip.party_id) : q.is("party_id", null);
    const { data } = await q.maybeSingle();
    if (!data || String((data as any).status) !== "running") return { calisiyor: false, sebep: "" };
    // Yarıda kalmış koşum sonsuza dek kilitlemesin: belirli süre sonra bayatlar.
    const zaman = new Date(String((data as any).updated_at ?? "")).getTime();
    if (Number.isFinite(zaman) && Date.now() - zaman > bayatlamaDakika * 60_000) {
      return { calisiyor: false, sebep: "" };
    }
    return { calisiyor: true, sebep: "bu iş şu an zaten çalışıyor — ikinci kez başlatılmadı" };
  } catch { return { calisiyor: false, sebep: "" }; }
}

/* ── MEVCUT DURUM YAZICILARINA TAKILAN ANLATIM ───────────────────────────────
   Bütün ajan fonksiyonlarının kendi bir durum yazıcısı var (durumYaz /
   upsertAgentActivityState / writeState …). Anlatımı her fonksiyonun içine ayrı
   ayrı serpiştirmek yerine O YAZICIYA tek satır takılır: fonksiyonun mevcut
   davranışı, girdisi, çıktısı ve süzgeçleri DEĞİŞMEZ; yalnız aynı satıra düz
   Türkçe anlatım eklenir.

   Kural: 'running' → "…yapıyorum" · 'completed' → "Yapıldı: …" (+ varsa
   "Eksik: …") · 'failed' → "Bu işi tamamlayamadım: …".
   Adımlar veritabanındaki diziye EKLENİR; yeni koşum 'running' ile başlarken
   dizi sıfırlanır. Best-effort: hata olursa asıl iş etkilenmez. */
const KOL_ANLATIMI: Record<string, { basla: string; bitti: string }> = {
  elverislilik: { basla: "Dosyanın arabuluculuğa uygunluğuna bakıyorum.", bitti: "Dosyanın arabuluculuğa uygunluğunu kontrol ettim." },
  usul_onerisi: { basla: "Sıradaki adım için öneri hazırlıyorum.", bitti: "Sıradaki adım için öneri hazırladım." },
  usul_engeli: { basla: "Dosyada eksik kalan usul adımlarına bakıyorum.", bitti: "Dosyadaki usul eksiklerini çıkardım." },
  olay_cizelgesi: { basla: "Dosyadaki tarihleri sıraya diziyorum.", bitti: "Dosyadaki tarihleri sıraya dizdim." },
  guc_dengesi: { basla: "Taraflar arasındaki dengeye bakıyorum.", bitti: "Taraflar arasındaki denge işaretlerini çıkardım." },
  iletisim_degisim: { basla: "Anlatımdaki dil değişimine bakıyorum.", bitti: "Anlatımdaki dil değişimini çıkardım." },
  belge_ozeti: { basla: "Belgeyi okuyorum.", bitti: "Belgeyi özetledim." },
  dosya_ozeti: { basla: "Dosyanın konusu için metin hazırlıyorum.", bitti: "Dosyanın konusu için metin önerdim." },
  classify_dispute: { basla: "Uyuşmazlığın türünü belirliyorum.", bitti: "Uyuşmazlığın türünü belirledim." },
  deadline_detect: { basla: "Süreleri hesaplıyorum.", bitti: "Süreleri hesapladım." },
  party_analysis: { basla: "Tarafın kendi verisiyle gizli analizi hazırlıyorum.", bitti: "Gizli analizi hazırladım." },
  party_consistency: { basla: "Anlatım ile belgeleri karşılaştırıyorum.", bitti: "Anlatım ile belgeleri karşılaştırdım." },
  party_communication: { basla: "Anlatımdan asıl ihtiyacı çıkarıyorum.", bitti: "Anlatımdan asıl ihtiyacı çıkardım." },
  common_ground: { basla: "Tarafların ortak zeminini arıyorum.", bitti: "Tarafların ortak zeminini çıkardım." },
  hazirlik_foyu: { basla: "Oturum hazırlık föyünü hazırlıyorum.", bitti: "Oturum hazırlık föyünü hazırladım." },
  orchestrator: { basla: "Dosyayı baştan sona inceliyorum.", bitti: "Dosya incelemesini tamamladım." },
  taraf_kalem: { basla: "Belgeleri okuyorum.", bitti: "Talep kalemlerini çıkardım." },
  mediator: { basla: "Masadaki seçenekleri hazırlıyorum.", bitti: "Masadaki seçenekleri hazırladım." },
  meeting_notes: { basla: "Görüşme notunu okuyorum.", bitti: "Görüşme notunu okudum." },
  agreement_generation: { basla: "Belge taslağını hazırlıyorum.", bitti: "Belge taslağını hazırladım." },
};

// Adım cümlelerinde teknik kelime kalmasın diye son bir süzgeç.
const TEKNIK_SOZCUKLER = /\b(edge function|function|upsert|invoke|payload|jsonb?|api|http|sql|rpc|token|endpoint)\b/gi;

function sadelestir(v: unknown, n = 220): string {
  return String(v ?? "").replace(TEKNIK_SOZCUKLER, "").replace(/\s+/g, " ").trim().slice(0, n);
}

export async function anlatimYansit(
  admin: any, sahip: AnlatimSahibi, patch: Record<string, unknown>,
): Promise<void> {
  try {
    const status = String((patch as any)?.status ?? "").trim();
    if (!status || !sahip?.case_id || !sahip?.agent_type) return;
    const kalip = KOL_ANLATIMI[sahip.agent_type] ?? {
      basla: "Bir adım üzerinde çalışıyorum.", bitti: "Bir adımı tamamladım.",
    };

    let sorgu = admin.from("agent_states").select("id, last_output")
      .eq("case_id", sahip.case_id).eq("agent_type", sahip.agent_type);
    sorgu = sahip.party_id ? sorgu.eq("party_id", sahip.party_id) : sorgu.is("party_id", null);
    const { data: mevcut } = await sorgu.maybeSingle();
    if (!(mevcut as any)?.id) return;   // satır henüz yok; asıl yazıcı açacak

    let cikti: Record<string, unknown> = {};
    const ham = (mevcut as any).last_output;
    if (ham && typeof ham === "object" && !Array.isArray(ham)) cikti = { ...ham };

    const oncekiler: Adim[] = Array.isArray((cikti as any).adimlar) ? (cikti as any).adimlar : [];
    const yeniPatchCikti = (patch as any)?.last_output;
    const patchCikti = (yeniPatchCikti && typeof yeniPatchCikti === "object" && !Array.isArray(yeniPatchCikti))
      ? yeniPatchCikti as Record<string, unknown> : {};

    let adimlar: Adim[] = oncekiler;
    const ekle = (metin: string) => {
      const t = sadelestir(metin);
      if (!t) return;
      if (adimlar.length > 0 && adimlar[adimlar.length - 1]?.metin === t) return;   // aynı cümleyi tekrarlama
      adimlar = [...adimlar, { sira: adimlar.length + 1, metin: t, zaman: simdi() }];
    };

    if (status === "running") {
      // Yeni koşum: dizi sıfırlanır. Aynı koşumun ara adımları eklenir.
      const adim = sadelestir(patchCikti.current_step);
      if (oncekiler.length === 0 || String((cikti as any).durum_izi ?? "") !== "running") {
        adimlar = [];
        ekle(kalip.basla);
      }
      if (adim && adim !== kalip.basla) ekle(adim);
    } else if (status === "completed") {
      const sonuc = String(patchCikti.sonuc ?? "");
      const sebep = sadelestir(patchCikti.sebep);
      if (sonuc === "atlandi" || sonuc === "metin_yok" || sonuc === "elendi") {
        // Yapılamayan iş "yapıldı" diye yazılmaz; sebebi eksik satırına düşer.
        ekle(`Yapıldı: bu adımda üretecek bir şey çıkmadı.`);
        if (sebep) ekle(`Eksik: ${sebep}`);
      } else {
        ekle(`Yapıldı: ${kalip.bitti}`);
        if (sebep) ekle(`Eksik: ${sebep}`);
      }
    } else if (status === "failed") {
      const sebep = sadelestir((patch as any)?.error_message ?? patchCikti.sebep, 180);
      ekle(`Bu işi tamamlayamadım${sebep ? `: ${sebep}` : "."}`);
    } else {
      return;
    }

    await admin.from("agent_states").update({
      last_output: { ...cikti, ...patchCikti, adimlar, durum_izi: status },
    }).eq("id", (mevcut as any).id);
  } catch (e: any) {
    console.error("[anlatimYansit] yazılamadı", { agent_type: sahip?.agent_type, hata: kisalt(e?.message ?? e, 120) });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SİSTEMİN GENEL KANUNU — ORTAK MOTOR (yasa-1)
   Ürünteki her iş şu döngüyü kendi içinde tamamlar:
     1. KENDİ BAŞLAR       → olay düşünce koşucu tetikler, kimse düğmeye basmaz.
     2. KENDİ SÜRER        → adımlarını sahibine düz Türkçe anlatır (anlatimAc).
     3. ENGELE TAKILIRSA KENDİ ÇÖZER → eksik girdiyi EN AZ İKİ FARKLI YOLDAN arar
        (girdiTamamla) ve devam eder.
     4. ÇÖZEMEZSE DOĞRU KİŞİYE SORAR → eksigiSor; soru daima 'bekliyor' yazılır
        ve cevaplanana kadar hatırlatılır.
     5. CEVAP GELİNCE KALDIĞI YERDEN DEVAM EDER → cevaplanan soru kolu yeniden
        uyandırır; yapılmış işler mükerrer yazım kapılarında atlanır.
     6. KENDİ BİTİRİR      → "Yapıldı: … / Eksik: …" ve çıktı ilgili panele.
     7. BİTİŞİ YENİ OLAY DOĞURUR → sıradaki ajan onunla uyanır.

   YAPISAL ZORUNLULUK: bir fonksiyon bu motora bağlı değilse KOŞUCU ONU ÇAĞIRMAZ
   ve sebebini açık bir satırla yazar. Böylece sonradan eklenen hiçbir yetenek
   döngünün dışında kalamaz. Yeni bir fonksiyon yazıldığında adı aşağıdaki
   MOTORA_BAGLI listesine eklenir; eklenmezse akış onu çalıştırmaz. */
export const MOTOR_SURUMU = "yasa-1";

/* Motora bağlı fonksiyonlar. Soru-cevap YÜZEYLERİ (case-qa, taraf-asistan)
   bilerek dışarıdadır: onlar akış adımı değil, kullanıcının sorusuna cevap veren
   danışma yüzeyleridir — olayla uyanmazlar, çıktıyı panele yazmazlar. */
export const MOTORA_BAGLI: string[] = [
  "taraf-kalem-cikar", "hazirlik-foyu", "belge-ozeti", "classify-dispute",
  "detect-legal-deadlines", "party-confidential-analysis", "party-consistency-check",
  "party-communication-analysis", "common-ground-report", "orchestrator-run",
  "elverislilik", "usul-onerisi", "usul-engeli", "olay-cizelgesi", "guc-dengesi",
  "iletisim-degisim", "dosya-ozeti-oner", "analyze-meeting-notes",
  "multi-agent-negotiation",
  // 19.08 · masa kalem karşılaştırması, bilirkişi soruları, taslak denetimi
  "masa-kalem-karsilastir", "bilirkisi-sorulari", "taslak-denetim",
  // 19.08 · onaylanan föyün gönderimi (olay: foy_onaylandi, girdi: foy_id)
  "hazirlik-foyu-gonder",
  // 20.08 · arabulucunun akış onayı (sohbetten çağrılır, girdi: gorev_id)
  "akis-onayla",
];

export function motoraBagliMi(fonksiyon: string): boolean {
  return MOTORA_BAGLI.includes(String(fonksiyon ?? "").trim());
}

/* Fonksiyonların ZORUNLU girdileri. Koşucu eksik girdiyle çağırıp hata almaz;
   önce buradan bakar, sonra girdiTamamla ile arar. */
const ZORUNLU_GIRDI: Record<string, string[]> = {
  "taraf-kalem-cikar": ["case_id", "party_id"],
  "hazirlik-foyu": ["case_id", "session_id", "party_id"],
  "belge-ozeti": ["document_id"],
  "party-confidential-analysis": ["case_id", "party_id"],
  "party-consistency-check": ["case_id", "party_id"],
  "party-communication-analysis": ["case_id", "party_id"],
  "iletisim-degisim": ["case_id", "party_id"],
  // Bu fonksiyon dosya değil FÖY kimliği ister; foy_onaylandi olayı foy_id taşır.
  "hazirlik-foyu-gonder": ["foy_id"],
  // Onay kapısı: bekleyen onay görevinin kimliğiyle çağrılır.
  "akis-onayla": ["gorev_id"],
  "masa-kalem-karsilastir": ["case_id"],
  "bilirkisi-sorulari": ["case_id"],
  "taslak-denetim": ["case_id"],
};

function dolu(v: unknown): boolean {
  return typeof v === "string" ? v.trim().length > 0 : v !== null && v !== undefined;
}

export type GirdiSonucu = {
  /** Çalıştırılacak gövdeler. Taraf başına iş ise taraf sayısı kadar olur. */
  govdeler: Record<string, unknown>[];
  /** Hangi alan hangi yoldan tamamlandı — anlatıma ve panoya yazılır. */
  tamamlanan: string[];
  /** Hiçbir yoldan bulunamayan alanlar. */
  eksik: string[];
};

/* 3. MADDE: eksik girdiyi EN AZ İKİ FARKLI YOLDAN arar.
   session_id  → (1) olayın verisi · (2) planlanmış oturum · (3) dosyadaki son oturum
   party_id    → (1) olayın verisi · (2) belgenin sahibi · (3) dosyanın tarafları
                 (her taraf için AYRI koşum kurulur)
   document_id → (1) olayın verisi · (2) tarafın/dosyanın en son belgesi
   Hiçbiri tutmazsa uydurulmaz; eksik olarak döner (constitution m.2). */
export async function girdiTamamla(
  admin: any, fonksiyon: string, govde: Record<string, unknown>,
): Promise<GirdiSonucu> {
  const gerekli = ZORUNLU_GIRDI[fonksiyon] ?? ["case_id"];
  const temel: Record<string, unknown> = { ...govde };
  const tamamlanan: string[] = [];
  const eksik: string[] = [];
  const caseId = String(temel.case_id ?? "").trim();

  if (!caseId) return { govdeler: [], tamamlanan, eksik: ["dosya"] };

  // ── session_id ────────────────────────────────────────────────────────────
  if (gerekli.includes("session_id") && !dolu(temel.session_id)) {
    try {
      const { data: oturumlar } = await admin.from("case_sessions")
        .select("id, scheduled_at, status").eq("case_id", caseId).limit(30);
      const uygun = ((oturumlar ?? []) as any[]).filter((o) => String(o.status ?? "") !== "cancelled");
      const simdi = Date.now();
      const planli = uygun
        .filter((o) => o.scheduled_at && new Date(String(o.scheduled_at)).getTime() > simdi)
        .sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)))[0];
      const yedek = planli ?? [...uygun]
        .sort((a, b) => String(b.scheduled_at ?? "").localeCompare(String(a.scheduled_at ?? "")))[0];
      if (yedek?.id) {
        temel.session_id = yedek.id;
        tamamlanan.push(planli
          ? "oturum bilgisi planlanmış oturumdan alındı"
          : "oturum bilgisi dosyadaki son oturumdan alındı");
      } else eksik.push("oturum");
    } catch { eksik.push("oturum"); }
  }

  // ── document_id ───────────────────────────────────────────────────────────
  if (gerekli.includes("document_id") && !dolu(temel.document_id)) {
    try {
      let q = admin.from("case_documents").select("id, party_id")
        .eq("case_id", caseId).order("created_at", { ascending: false }).limit(1);
      if (dolu(temel.party_id)) q = q.eq("party_id", String(temel.party_id));
      const { data } = await q;
      const belge = ((data ?? []) as any[])[0];
      if (belge?.id) {
        temel.document_id = belge.id;
        if (!dolu(temel.party_id) && belge.party_id) temel.party_id = belge.party_id;
        tamamlanan.push("belge bilgisi dosyadaki son belgeden alındı");
      } else eksik.push("belge");
    } catch { eksik.push("belge"); }
  }

  // ── party_id ──────────────────────────────────────────────────────────────
  if (gerekli.includes("party_id") && !dolu(temel.party_id)) {
    if (dolu(temel.document_id)) {
      try {
        const { data: belge } = await admin.from("case_documents")
          .select("party_id").eq("id", String(temel.document_id)).maybeSingle();
        if ((belge as any)?.party_id) {
          temel.party_id = (belge as any).party_id;
          tamamlanan.push("taraf bilgisi belgenin sahibinden alındı");
        }
      } catch { /* sonraki yola geçilir */ }
    }
    if (!dolu(temel.party_id)) {
      try {
        const { data: taraflar } = await admin.from("case_parties")
          .select("id").eq("case_id", caseId).limit(10);
        const liste = ((taraflar ?? []) as any[]).map((t) => String(t.id)).filter(Boolean);
        if (liste.length > 0) {
          return {
            govdeler: liste.map((pid) => ({ ...temel, party_id: pid })),
            tamamlanan: [...tamamlanan, `iş dosyadaki ${liste.length} taraf için ayrı ayrı kuruldu`],
            eksik,
          };
        }
        eksik.push("taraf");
      } catch { eksik.push("taraf"); }
    }
  }

  const kalanEksik = gerekli.filter((a) => !dolu(temel[a]));
  return { govdeler: kalanEksik.length ? [] : [temel], tamamlanan, eksik: [...eksik, ...kalanEksik] };
}

/* 4./5. MADDE — SORU KAYDI: soru daima 'bekliyor' yazılır ve cevaplanana kadar
   hatırlatılır. Nöbetçinin YÜRÜTTÜĞÜ tiplerden AYRI bir tip kullanılır; yoksa
   soru başka bir kol tarafından "atlandı" sayılıp sohbetten düşebilir
   (19.08 canlı kusuru: taraf belge yüklemiş diye dayanak sorusu kapandı).
   Cevap gelince kol yeniden uyanır. */
export const SORU_TIPI_TARAF = "taraf_sorusu";
export const SORU_TIPI_ARABULUCU = "arabulucu_sorusu";

/** Sorunun hangi kolu uyandıracağını gerekçeye makine okunur biçimde yazar. */
export function kolEtiketi(fonksiyon: string): string {
  return `[kol:${String(fonksiyon ?? "").trim()}]`;
}

/* ── ARABULUCU TALİMATI (public.arabulucu_talimatlari) ───────────────────────
   Arabulucu "şunu şöyle yap" der; ajan yapar ve ONAYA SUNAR. Talimat, adımın
   kendi üretim yönergesine EK yönergedir — yerine geçmez.

   ANAYASA ÜSTÜNDÜR (constitution m.1 · m.2 · m.3 · m.5): talimat
     · uydurma istiyorsa,
     · karşı tarafın verisini istiyorsa,
     · tarafa hukuki tavsiye ya da karar dayatıyorsa,
     · dört insan kapısını (imza · bilirkişi ataması · kayıt/döküm rızası ·
       tarafla asıl müzakere) atlatmaya çalışıyorsa
   UYGULANMAZ. Durum 'uygulanamadi' yazılır, sebebi sade dille söylenir.

   SINIR — DÜRÜSTLÜK NOTU: bu denetim KALIP TABANLIDIR. Açıkça yazılmış istekleri
   yakalar; dolaylı ya da örtük anlatımı yakalamayabilir. Bu yüzden adımların
   KENDİ kuralları (birebir alıntı doğrulaması, kör veri sorguları, insan kapıları)
   yürürlükte kalır — talimat denetimi onların yerine geçmez, üstüne eklenir. */
export type TalimatDenetimi = { uygun: boolean; sebep: string };

const TALIMAT_YASAK_KALIPLARI: { kalip: string[]; sebep: string }[] = [
  {
    kalip: ["uydur", "varsay", "tahmin et", "olmasa bile yaz", "yoksa da yaz", "yokmuş gibi", "kendin ekle"],
    sebep: "dosyada karşılığı olmayan bir şey yazmamı istiyor; ben yalnız kayıtlı veriden yazabilirim",
  },
  {
    kalip: ["karşı tarafın belge", "karsi tarafin belge", "diğer tarafın belge", "diger tarafin belge",
            "karşı tarafın beyan", "karşı tarafın analiz", "öteki tarafın", "oteki tarafin",
            "karşı tarafın verisi", "karsi tarafin verisi"],
    sebep: "karşı tarafın verisini kullanmamı istiyor; her tarafın verisi kendi odasında kalır",
  },
  {
    kalip: ["hukuki tavsiye", "tavsiye ver", "karar ver", "kabul etsin", "kabul et de",
            "talebi geri çek", "talebinden vazgeç", "haklı olduğunu yaz", "haksız olduğunu yaz"],
    sebep: "hukuki tavsiye ya da karar içeriyor; ben öneri üretirim, kararı siz verirsiniz",
  },
  {
    kalip: ["imzala", "imzayı at", "bilirkişi ata", "bilirkişiyi görevlendir",
            "onay almadan gönder", "onaysız gönder", "rıza almadan", "rızasız kaydet",
            "taraf yerine", "taraf adına karar"],
    sebep: "yalnız insanda kalan bir işi bana yaptırmak istiyor (imza, bilirkişi ataması, kayıt rızası, asıl müzakere)",
  },
];

function talimatNormalize(v: unknown): string {
  return String(v ?? "").toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
}

export function talimatiDenetle(talimat: unknown): TalimatDenetimi {
  const t = talimatNormalize(talimat);
  if (!t) return { uygun: false, sebep: "talimat metni boş geldi" };
  for (const g of TALIMAT_YASAK_KALIPLARI) {
    if (g.kalip.some((k) => t.includes(talimatNormalize(k)))) {
      return { uygun: false, sebep: g.sebep };
    }
  }
  return { uygun: true, sebep: "" };
}

/* Talimat ALMAYAN adımlar: çıktısı veriden hesaplanan, metin üretmeyen kollar.
   Bunlara talimat verilirse 'uygulanamadi' yazılır ve sebebi söylenir. */
export const TALIMAT_ALMAYAN: string[] = ["masa-kalem-karsilastir"];

/** Talimat özetini tek cümleye indirir — çıktının başına yazılacak satır için. */
export function talimatOzeti(talimat: unknown, n = 160): string {
  const t = String(talimat ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const ilk = t.split(/(?<=[.!?])\s/)[0] ?? t;
  return ilk.length > n ? `${ilk.slice(0, n - 1)}…` : ilk;
}
