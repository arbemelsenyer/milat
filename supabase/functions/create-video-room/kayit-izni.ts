/* ============================================================================
   B18 · KAYIT İZNİ KAPISI — saf işlev (test edilebilir)

   Kural (kurucu, 16.08 · mimari/12-taksonomi-ve-modeller.md:249-264):
   · 48 SAAT: kayıtlı oturum, onay formu açıldıktan 48 saat geçmeden planlanamaz.
   · OYBİRLİĞİ: taraf · vekil · varsa uzman AYRI AYRI onaylar; bir ret kapıyı kapatır.

   Bu dosya ayrı durur ki tezgâhtan çağrılabilsin (akis-yurut/hata-metni.ts ile
   aynı kalıp): index.ts `npm:`/Deno içe aktarımı taşır, bu dosya taşımaz.

   ÖLÇÜT TEK OLMAK ZORUNDA (23.08 dersi: iki yüzey iki ayrı ölçütle bakarsa biri
   sessizce yanlış cevap verir). Buradaki katılımcı listesi ve oybirliği hesabı,
   arabulucu panelindeki `KayitProtokoluKarti` (src/pages/MediationEngine.tsx)
   hesabının birebir aynısıdır; engel cümleleri de aynı sözcüklerle yazılmıştır.

   GİZLİLİK (constitution m.1): dönen engel metni SAYI taşır, isim taşımaz.
   ============================================================================ */

export const KAYIT_ONAY_SAAT = 48;

/** Uzman ataması bu durumlardaysa katılımcı sayılmaz (panelle aynı liste). */
const UZMAN_DISI_DURUMLAR = ["rejected", "cancelled", "removed"];

export type KayitTalebi = { id: string; gonderim_zamani: string } | null;
export type KayitTaraf = { id: string; vekil_ad_soyad?: string | null };
export type KayitUzmanAtamasi = { id: string; status?: string | null };
export type KayitOnayi = { katilimci_anahtari: string; durum: string };

export type KayitIzniGirdisi = {
  talep: KayitTalebi;
  taraflar: KayitTaraf[];
  uzmanAtamalari: KayitUzmanAtamasi[];
  onaylar: KayitOnayi[];
  simdiMs: number;
};

export type KayitIzniSonucu = {
  izinli: boolean;
  engeller: string[];
  /** 48 saatin dolmasına kalan dakika; talep yoksa null, süre dolduysa 0. */
  kalanDakika: number | null;
  katilimciSayisi: number;
  onayVeren: number;
  retVeren: number;
  bekleyen: number;
};

/**
 * Onay vermesi gereken katılımcıların anahtarları.
 * 'taraf:<party_id>' · 'vekil:<party_id>' · 'uzman:<atama_id>'
 */
export function kayitKatilimciAnahtarlari(
  taraflar: KayitTaraf[],
  uzmanAtamalari: KayitUzmanAtamasi[]
): string[] {
  const anahtarlar: string[] = [];
  for (const taraf of taraflar ?? []) {
    if (!taraf?.id) continue;
    anahtarlar.push(`taraf:${taraf.id}`);
    const vekil = String(taraf.vekil_ad_soyad ?? "").trim();
    if (vekil) anahtarlar.push(`vekil:${taraf.id}`);
  }
  for (const atama of uzmanAtamalari ?? []) {
    if (!atama?.id) continue;
    if (UZMAN_DISI_DURUMLAR.includes(String(atama.status ?? ""))) continue;
    anahtarlar.push(`uzman:${atama.id}`);
  }
  return anahtarlar;
}

export function kayitIzni(girdi: KayitIzniGirdisi): KayitIzniSonucu {
  const { talep, taraflar, uzmanAtamalari, onaylar, simdiMs } = girdi;

  const anahtarlar = kayitKatilimciAnahtarlari(taraflar ?? [], uzmanAtamalari ?? []);
  const kararlar = new Map<string, string>();
  for (const o of onaylar ?? []) {
    if (o?.katilimci_anahtari) kararlar.set(o.katilimci_anahtari, String(o.durum ?? ""));
  }

  const onayVeren = anahtarlar.filter((a) => kararlar.get(a) === "onay").length;
  const retVeren = anahtarlar.filter((a) => kararlar.get(a) === "ret").length;
  const bekleyen = anahtarlar.length - onayVeren - retVeren;

  const hedefMs = talep?.gonderim_zamani
    ? new Date(talep.gonderim_zamani).getTime() + KAYIT_ONAY_SAAT * 3600000
    : null;
  const hedefGecerli = hedefMs !== null && !Number.isNaN(hedefMs);
  const sureDoldu = hedefGecerli && simdiMs >= (hedefMs as number);
  const kalanDakika = hedefGecerli
    ? Math.max(0, Math.ceil(((hedefMs as number) - simdiMs) / 60000))
    : null;

  const engeller: string[] = [];
  if (!talep) engeller.push("onay formu henüz açılmadı");
  if (talep && !hedefGecerli) engeller.push("onay formunun açılış zamanı okunamadı");
  if (talep && hedefGecerli && !sureDoldu) engeller.push("48 saatlik süre dolmadı");
  if (anahtarlar.length === 0) engeller.push("dosyada katılımcı kaydı yok");
  if (retVeren > 0) engeller.push(`${retVeren} katılımcı onay vermedi`);
  if (bekleyen > 0) engeller.push(`${bekleyen} katılımcı henüz cevap vermedi`);

  return {
    izinli: engeller.length === 0,
    engeller,
    kalanDakika,
    katilimciSayisi: anahtarlar.length,
    onayVeren,
    retVeren,
    bekleyen,
  };
}

/** Kullanıcıya dönecek tek cümle. İsim taşımaz, yalnız sayı ve engel taşır. */
export function kayitIzniHataMetni(sonuc: KayitIzniSonucu): string {
  if (sonuc.izinli) return "";
  return `Bu oturum kayıtlı oturum olarak işaretli; kayıt izni henüz tamam değil (${sonuc.engeller.join(" · ")}). Kayıt protokolü kartından eksikleri tamamlayın.`;
}
