/* METİN KATMANI DENETİMİ — "girdi sanılan boş kaynak" tek kapıdan geçer
 *
 * 27.08.2026'da `admin-upload-knowledge` için bulunan kusur, URL'den beslenen
 * iki yolda (`build-legal-knowledge`, `build-knowledge-base`) AYNEN duruyordu:
 * taranmış (metin katmanı olmayan) bir PDF sıfır değil BİRKAÇ parça verir.
 * Yükleme başarılı sayılır, kaynak `/admin` listesinde GÖRÜNÜR, ama ajanlar
 * içinden hiçbir şey bulamaz. Açık hatadan kötüdür: hata görülür, boşluk
 * görülmez.
 *
 * CANLI ÖLÇÜM (28.08.2026, `knowledge_base_chunks`) — parça karakteri / KB:
 *   Yönetmelik          116 KB →  63.970 krk → 551
 *   6325 Arabuluculuk   396 KB →  49.408 krk → 125
 *   7155 Abonelik       109 KB →   9.354 krk →  86
 *   7036 İş Mahkemeleri 367 KB →  16.905 krk →  46   (kategori: işçi_işveren)
 *   ——— sınır 40 ———
 *   2004 İİK            117 KB →   3.533 krk →  30   BOZUK
 *   7251 HMK Değişiklik 366 KB →   2.066 krk →   6   BOZUK
 *
 * İKİ AYRI KURAL, BİLEREK:
 *  1. `bayt >= 1 MiB && parça < 10` — her kategoride geçerli TARTIŞMASIZ uç.
 *     Eşiği yoğunluğa değil bu uca koymanın sebebi 27.08'de ölçüldü: meşru
 *     sunum/eğitim PDF'leri görsel ağırlıklıdır ve 24 krk/KB'ye kadar iner;
 *     yoğunluk kuralı onları da keserdi.
 *  2. `mevzuat: true` iken `bayt >= 64 KiB && yoğunluk < 40` — YALNIZ kanun ve
 *     yönetmelik metinleri için. Bir kanun metni görsel ağırlıklı olamaz; bu
 *     yüzden orada yoğunluk kuralı meşrudur. Sınır 40, bilinen en kötü SAĞLAM
 *     kaynağın (86) yarısından azı, bilinen en iyi BOZUK kaynağın (30) ise
 *     üstündedir — iki yana da pay bırakır.
 *
 * Sınırın altında kalan ama reddedilmeyen kaynak SESSİZ geçmez: `uyari`
 * döner, çağıran taraf onu cevabına koyar.
 */

export type MetinKatmaniSonucu = {
  /** Kaynak bilgi tabanına yazılabilir mi. */
  yeterli: boolean;
  /** Reddedildiyse kullanıcıya söylenecek gerekçe. */
  sebep?: string;
  /** Reddedilmedi ama şüpheli: cevaba eklenecek uyarı. */
  uyari?: string;
  /** Parça karakteri / KB — ölçünün kendisi, gizlenmez. */
  yogunluk: number;
};

const MB = 1024 * 1024;
const KB = 1024;

/** Tartışmasız uç: 1 MB üstü dosya bu kadar parçadan az veriyorsa metin yoktur. */
export const BUYUK_DOSYA_BAYT = 1 * MB;
export const BUYUK_DOSYA_ASGARI_PARCA = 10;

/** Mevzuat metinleri için yoğunluk kuralı (parça karakteri / KB). */
export const MEVZUAT_ASGARI_BAYT = 64 * KB;
export const MEVZUAT_ASGARI_YOGUNLUK = 40;

/** Reddetmeyen ama cevaba yazılan şüphe bandı. */
export const UYARI_ASGARI_BAYT = 100 * KB;
export const UYARI_YOGUNLUK = 60;

export function metinKatmaniDegerlendir(args: {
  /** İndirilen ya da yüklenen dosyanın bayt sayısı. */
  bayt: number;
  /** Parçalamadan sonra kalan parça sayısı. */
  parcaSayisi: number;
  /** Parçaların toplam karakter sayısı — ham metin değil, GERÇEKTEN yazılacak olan. */
  parcaKarakter: number;
  /** Kaynak bir kanun/yönetmelik metni mi. */
  mevzuat?: boolean;
}): MetinKatmaniSonucu {
  const { bayt, parcaSayisi, parcaKarakter, mevzuat = false } = args;
  const kb = Math.max(bayt / KB, 1);
  const yogunluk = Math.round((parcaKarakter / kb) * 10) / 10;

  if (bayt >= BUYUK_DOSYA_BAYT && parcaSayisi < BUYUK_DOSYA_ASGARI_PARCA) {
    return {
      yeterli: false,
      yogunluk,
      sebep:
        `${Math.round(kb)} KB'lık dosyadan yalnız ${parcaSayisi} parça çıkarılabildi. ` +
        `Dosya büyük ihtimalle TARANMIŞ (metin katmanı yok); bu hâliyle yüklenirse ` +
        `kaynak listede görünür ama ajanlar içinden hiçbir şey bulamaz.`,
    };
  }

  if (mevzuat && bayt >= MEVZUAT_ASGARI_BAYT && yogunluk < MEVZUAT_ASGARI_YOGUNLUK) {
    return {
      yeterli: false,
      yogunluk,
      sebep:
        `Mevzuat metni beklenenden çok seyrek: ${Math.round(kb)} KB'lık dosyadan ` +
        `${parcaKarakter} karakter çıktı (KB başına ${yogunluk}; alt sınır ` +
        `${MEVZUAT_ASGARI_YOGUNLUK}). Kanun metinleri görsel ağırlıklı olmaz — ` +
        `bu dosyanın metin katmanı eksik. Metin katmanlı bir nüsha gerekiyor.`,
    };
  }

  if (bayt >= UYARI_ASGARI_BAYT && yogunluk < UYARI_YOGUNLUK) {
    return {
      yeterli: true,
      yogunluk,
      uyari:
        `${Math.round(kb)} KB'lık kaynaktan yalnız ${parcaKarakter} karakter çıktı ` +
        `(KB başına ${yogunluk}). Kaynak eksik taranmış olabilir; ` +
        `ajan cevaplarında boşluk görürseniz önce bunu kontrol edin.`,
    };
  }

  return { yeterli: true, yogunluk };
}
