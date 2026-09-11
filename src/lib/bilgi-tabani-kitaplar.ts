/* BİLGİ TABANI — PARÇALARDAN KİTAP DÜZEYİNE TOPLAMA (HAT H-35)
 *
 * Kurucu bildirdi: yönetici ekranı "20 kitap" diyor ama kitapları
 * listelemiyor. Cowork canlıda ölçtü: veri var (**75 kitap**), yönetici okuma
 * politikası açık, sütun izinleri tam. Kusur tamamen ekran tarafındaydı.
 *
 * KÖK NEDEN: kitap listesi parça tablosundan TEK İSTEKLE okunuyordu
 * (`.limit(5000)`). Bu bir ricadır; sunucu tek istekte daha azını verir ve
 * verdiğinde UYARMAZ. 16.000'den fazla parçanın yalnız ilk avucu geliyor,
 * kitap listesi de o örneğe düşen kitaplardan ibaret kalıyordu.
 *
 * Bu dosya toplamanın SAF halidir: ağ yok, React yok. Böylece "sunucu istenen
 * sayfadan azını verirse ne olur" sorusu tezgâhta gerçekten sınanabilir —
 * kusurun kendisi tam olarak o durumdu.
 *
 * Kural (kurucu, 11.09.2026):
 *   · Liste KİTAP düzeyinde okunur: benzersiz `source_title` + kategori +
 *     parça sayısı.
 *   · Sayı ile liste AYNI kaynaktan gelir.
 *   · Okuma eksik kalırsa ekran SESSİZ KALMAZ, sebebini yazar.
 */

/** Parça tablosundan okunan tek satır — yalnız toplama için gereken sütunlar. */
export type ParcaSatiri = {
  source_title: string | null;
  source_url: string | null;
  category: string | null;
  created_at: string;
};

/** Toplamanın çıktısı: ekranda bir satır = bir kitap. */
export type KitapSatiri = {
  source_title: string;
  /** Kitabın tek adresi varsa o; yoksa ilk görülen adres ya da null. */
  source_url: string | null;
  category: string;
  chunk_count: number;
  /** Kitabın en yeni parçasının tarihi — sıralama buna göredir. */
  latest: string;
  /** Kitabın bütün adresleri; silme buradan kesinleşir. */
  urls: string[];
};

export type ToplamaSonucu = {
  kitaplar: KitapSatiri[];
  /** Gerçekten okunabilen parça sayısı. Ekranda görünen sayı budur. */
  okunan: number;
  /** Sona varıldı mı, yoksa güvenlik freni mi devreye girdi. */
  sonaVarildi: boolean;
  /** Kaç istek yapıldı — teşhis için. */
  istek: number;
};

export type ToplamaAyarlari = {
  /** Sunucunun `count: "exact"` ile verdiği kesin parça sayısı; bilinmiyorsa null. */
  toplamParca: number | null;
  /** Bir istekte İSTENECEK satır sayısı. Sunucu daha azını verebilir. */
  sayfaBoyu: number;
  /** Güvenlik freni: en çok bu kadar istek yapılır. */
  azamiIstek: number;
};

/** Başlığı olmayan parça da kaybolmaz; adıyla görünür. */
export const BASLIKSIZ_KITAP = "(başlıksız kaynak)";

/**
 * Parçaları sayfa sayfa okuyup kitap düzeyinde toplar.
 *
 * `oku` sunucudan `bas` konumundan başlayarak en çok `adet` satır ister.
 * İlerleme İSTENEN sayıya göre değil, GERÇEKTEN DÖNEN satır sayısına göre
 * yapılır: sunucunun üst sınırı bizimkinden küçükse "sayfa dolmadı, demek ki
 * bitti" varsayımı ilk sayfada durur ve listeyi sessizce kırpar. Düzeltmeye
 * çalıştığımız kusur tam olarak budur, bu yüzden o varsayım YOKTUR.
 */
export async function kitaplariTopla(
  oku: (bas: number, adet: number) => Promise<ParcaSatiri[]>,
  ayar: ToplamaAyarlari,
): Promise<ToplamaSonucu> {
  const map = new Map<string, KitapSatiri>();
  let okunan = 0;
  let istek = 0;
  let sonaVarildi = false;

  while (istek < ayar.azamiIstek) {
    const satirlar = await oku(okunan, ayar.sayfaBoyu);
    istek += 1;

    // Boş sayfa = veri bitti. Tek güvenilir bitiş işareti budur.
    if (satirlar.length === 0) { sonaVarildi = true; break; }

    for (const r of satirlar) {
      const baslik = String(r.source_title ?? "").trim() || BASLIKSIZ_KITAP;
      const adres = r.source_url ? String(r.source_url) : null;
      const mevcut = map.get(baslik);
      if (mevcut) {
        mevcut.chunk_count += 1;
        if (r.created_at > mevcut.latest) mevcut.latest = r.created_at;
        if (adres && !mevcut.urls.includes(adres)) mevcut.urls.push(adres);
      } else {
        map.set(baslik, {
          source_title: baslik,
          source_url: adres,
          category: String(r.category ?? "").trim() || "—",
          chunk_count: 1,
          latest: r.created_at,
          urls: adres ? [adres] : [],
        });
      }
    }

    okunan += satirlar.length;
    if (ayar.toplamParca != null && okunan >= ayar.toplamParca) { sonaVarildi = true; break; }
  }

  const kitaplar = Array.from(map.values()).sort((a, b) => b.latest.localeCompare(a.latest));
  return { kitaplar, okunan, sonaVarildi, istek };
}

/**
 * Okuma eksik kaldıysa EKRANDA yazılacak cümleyi üretir; her şey yolundaysa
 * `null` döner.
 *
 * Eskiden bu üç durumun üçü de sessizdi: ekran "Henüz kaynak yüklenmemiş."
 * yazıyor, BAŞARISIZ okuma ile BOŞ kütüphane aynı görünüyordu. Kurucu ekrana
 * bakıp yanlış sonuca varıyordu.
 */
export function toplamaUyarisi(sonuc: ToplamaSonucu, ayar: ToplamaAyarlari): string | null {
  if (!sonuc.sonaVarildi) {
    return `Liste eksik olabilir: ${ayar.azamiIstek} istekten sonra güvenlik freni devreye girdi ` +
      `ve okuma ${sonuc.okunan} parçada durduruldu. Aşağıdaki liste yalnız okunabilen ` +
      "parçalardan üretildi.";
  }
  /* SIRA ÖNEMLİ: "sayı var ama hiç satır yok" durumu, genel "eksik okuma"
     uyarısından DAHA BELİRLEYİCİ bir tanıdır — okuma izni ya da satır
     politikası kokar. Genel uyarı önce gelirse bu tanı hiç görünmez ve
     yönetici yanlış yere bakar. */
  if ((ayar.toplamParca ?? 0) > 0 && sonuc.kitaplar.length === 0) {
    return `Sunucu ${ayar.toplamParca} parça sayıyor ama tek satır okunamadı. Bu bir ` +
      '"boş kütüphane" değil; okuma izni ya da satır politikası kaynaklı olabilir.';
  }
  if (ayar.toplamParca != null && sonuc.okunan !== ayar.toplamParca) {
    return `Liste eksik olabilir: sunucu ${ayar.toplamParca} parça sayıyor, okunabilen ` +
      `${sonuc.okunan}. Aradaki fark kadar kitap ya da parça listede görünmüyor olabilir.`;
  }
  return null;
}
