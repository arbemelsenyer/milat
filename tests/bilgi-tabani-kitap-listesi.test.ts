import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";
import {
  kitaplariTopla, toplamaUyarisi, BASLIKSIZ_KITAP,
  type ParcaSatiri, type ToplamaAyarlari,
} from "../src/lib/bilgi-tabani-kitaplar";

/* HAT H-35 — YÖNETİCİ BİLGİ TABANI: SAYI YANLIŞ, LİSTE BOŞ
 *
 * Kurucu bildirdi: ekran "20 kitap" diyor ama kitapları listelemiyor.
 * Cowork canlıda ölçtü: veri VAR, yönetici okuma politikası AÇIK, sütun
 * izinleri TAM. Kusur tamamen ekran tarafındaydı. (Code'un kendi ölçümü,
 * 11.09.2026, salt okuma: `count(distinct source_title)` = **75**.)
 *
 * ÜÇ KÖK NEDEN, ÜÇÜ DE BU TEZGÂHTA TUTULUYOR:
 *   1. Parça tablosu TEK İSTEKLE okunuyordu (`.limit(5000)`). Bu bir ricadır;
 *      sunucu daha azını verir ve UYARMAZ. Liste, gelen avuç dolusu parçanın
 *      içindeki kitaplardan ibaret kalıyordu.
 *   2. Sayı ile liste AYRI kaynaktan besleniyordu (biri içe aktarma koşusu,
 *      öteki parça tablosu).
 *   3. Sorgu düşerse ekran SUSUYORDU: "Henüz kaynak yüklenmemiş." yazıyor,
 *      başarısız okuma ile boş kütüphane aynı görünüyordu.
 */

const EKRAN = kaynakOku("src/components/admin/KnowledgeBaseAdmin.tsx");

/* YORUMSUZ NÜSHA — tezgâh KENDİ açıklamasını yakalamasın (CLAUDE.md §18-A).
   "Eski çağrı geri geldi mi" denetimi ÇALIŞAN koda bakar; eski çağrıyı
   anlatan yorum satırı kusur değil, kaydın kendisidir. */
const EKRAN_YORUMSUZ = EKRAN
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^[ \t]*\/\/.*$/gm, " ");

/** Sunucu taklidi: `kapak` kadarını verir, istenen daha büyük olsa bile. */
function sahteSunucu(satirlar: ParcaSatiri[], kapak: number) {
  const istekler: { bas: number; adet: number }[] = [];
  const oku = async (bas: number, adet: number) => {
    istekler.push({ bas, adet });
    return satirlar.slice(bas, bas + Math.min(adet, kapak));
  };
  return { oku, istekler };
}

function parca(baslik: string, kategori: string, tarih: string, adres?: string | null): ParcaSatiri {
  return { source_title: baslik, source_url: adres === undefined ? `https://x/${baslik}` : adres, category: kategori, created_at: tarih };
}

/** Canlıdakine benzer yük: 75 kitap, kitap başına farklı sayıda parça. */
function canliyaBenzerYuk(): ParcaSatiri[] {
  const satirlar: ParcaSatiri[] = [];
  for (let k = 0; k < 75; k++) {
    const adet = 100 + (k % 7) * 30;
    for (let i = 0; i < adet; i++) {
      satirlar.push(parca(`Kitap ${k}`, k % 2 ? "ticari" : "isci_isveren", `2026-01-${String((k % 28) + 1).padStart(2, "0")}T00:00:00Z`));
    }
  }
  return satirlar;
}

describe("H-35 — kitap listesi TAM okunur, sunucu az satır verse bile", () => {
  it("KUSURUN KENDİSİ: sunucu istenenin altında satır verirse liste kırpılmaz", async () => {
    const satirlar = canliyaBenzerYuk();
    // İstenen 1000, sunucu 1000 veriyormuş gibi değil — 200'de kapatıyor.
    const { oku, istekler } = sahteSunucu(satirlar, 200);
    const ayar: ToplamaAyarlari = { toplamParca: satirlar.length, sayfaBoyu: 1000, azamiIstek: 100 };

    const sonuc = await kitaplariTopla(oku, ayar);

    expect(sonuc.kitaplar.length, "kitapların bir kısmı kayboldu").toBe(75);
    expect(sonuc.okunan).toBe(satirlar.length);
    expect(sonuc.sonaVarildi).toBe(true);
    expect(toplamaUyarisi(sonuc, ayar)).toBeNull();
    // İlerleme DÖNEN satıra göre: hiçbir istek bir öncekinin bıraktığı yeri atlamadı.
    let beklenen = 0;
    for (const istek of istekler) {
      expect(istek.bas, "sayfalama atladı ya da geri gitti").toBe(beklenen);
      beklenen += Math.min(istek.adet, 200);
      if (beklenen > satirlar.length) beklenen = satirlar.length;
    }
  });

  it("eski davranış geri gelirse yakalanır: tek sayfa = eksik liste", async () => {
    const satirlar = canliyaBenzerYuk();
    const { oku } = sahteSunucu(satirlar, 1000);
    // Tek istek hakkı: eski kodun yaptığı buydu.
    const ayar: ToplamaAyarlari = { toplamParca: satirlar.length, sayfaBoyu: 1000, azamiIstek: 1 };
    const sonuc = await kitaplariTopla(oku, ayar);

    expect(sonuc.kitaplar.length).toBeLessThan(75);
    expect(sonuc.sonaVarildi, "eksik okuma 'tamam' sayıldı").toBe(false);
    // Ve SUSMAZ.
    expect(toplamaUyarisi(sonuc, ayar)).toContain("Liste eksik olabilir");
  });

  it("kitap düzeyi toplama: benzersiz başlık · kategori · parça sayısı", async () => {
    const satirlar: ParcaSatiri[] = [
      parca("Arabuluculuk El Kitabı", "genel", "2026-01-01T00:00:00Z"),
      parca("Arabuluculuk El Kitabı", "genel", "2026-03-05T00:00:00Z"),
      parca("Arabuluculuk El Kitabı", "genel", "2026-02-01T00:00:00Z"),
      parca("İş Hukuku", "isci_isveren", "2026-04-01T00:00:00Z"),
    ];
    const { oku } = sahteSunucu(satirlar, 2);
    const ayar: ToplamaAyarlari = { toplamParca: 4, sayfaBoyu: 10, azamiIstek: 20 };
    const sonuc = await kitaplariTopla(oku, ayar);

    expect(sonuc.kitaplar.map((k) => k.source_title)).toEqual(["İş Hukuku", "Arabuluculuk El Kitabı"]);
    const elKitabi = sonuc.kitaplar.find((k) => k.source_title === "Arabuluculuk El Kitabı")!;
    expect(elKitabi.chunk_count, "parçalar kitap düzeyinde toplanmadı").toBe(3);
    expect(elKitabi.category).toBe("genel");
    expect(elKitabi.latest, "kitabın en yeni parçası alınmadı").toBe("2026-03-05T00:00:00Z");
  });

  it("aynı kitabın birden çok adresi varsa hepsi tutulur (silme eksik kalmasın)", async () => {
    const satirlar: ParcaSatiri[] = [
      parca("Kira Hukuku", "kira", "2026-01-01T00:00:00Z", "https://a/1"),
      parca("Kira Hukuku", "kira", "2026-01-02T00:00:00Z", "https://a/2"),
      parca("Kira Hukuku", "kira", "2026-01-03T00:00:00Z", "https://a/1"),
    ];
    const { oku } = sahteSunucu(satirlar, 10);
    const sonuc = await kitaplariTopla(oku, { toplamParca: 3, sayfaBoyu: 10, azamiIstek: 5 });
    expect(sonuc.kitaplar[0].urls).toEqual(["https://a/1", "https://a/2"]);
  });

  it("başlıksız parça kaybolmaz, adıyla görünür", async () => {
    const satirlar: ParcaSatiri[] = [
      { source_title: null, source_url: null, category: null, created_at: "2026-01-01T00:00:00Z" },
      { source_title: "   ", source_url: null, category: "", created_at: "2026-01-02T00:00:00Z" },
    ];
    const { oku } = sahteSunucu(satirlar, 10);
    const sonuc = await kitaplariTopla(oku, { toplamParca: 2, sayfaBoyu: 10, azamiIstek: 5 });
    expect(sonuc.kitaplar).toHaveLength(1);
    expect(sonuc.kitaplar[0].source_title).toBe(BASLIKSIZ_KITAP);
    expect(sonuc.kitaplar[0].chunk_count).toBe(2);
    expect(sonuc.kitaplar[0].category).toBe("—");
  });
});

describe("H-35 — eksik okuma SESSİZ KALMAZ", () => {
  it("güvenlik freni devreye girerse söylenir", async () => {
    const satirlar = canliyaBenzerYuk();
    const { oku } = sahteSunucu(satirlar, 100);
    const ayar: ToplamaAyarlari = { toplamParca: satirlar.length, sayfaBoyu: 100, azamiIstek: 3 };
    const sonuc = await kitaplariTopla(oku, ayar);
    expect(sonuc.sonaVarildi).toBe(false);
    expect(toplamaUyarisi(sonuc, ayar)).toContain("güvenlik freni");
  });

  it("sunucunun saydığı ile okunan tutmuyorsa söylenir", async () => {
    const satirlar: ParcaSatiri[] = [parca("A", "genel", "2026-01-01T00:00:00Z")];
    const { oku } = sahteSunucu(satirlar, 10);
    // Sunucu 500 sayıyor ama 1 satır okunabiliyor. Kitap ÇIKTIĞI için bu
    // "hiç satır yok" tanısına değil, genel eksik-okuma uyarısına düşer.
    const ayar: ToplamaAyarlari = { toplamParca: 500, sayfaBoyu: 10, azamiIstek: 5 };
    const sonuc = await kitaplariTopla(oku, ayar);
    expect(sonuc.kitaplar).toHaveLength(1);
    const uyari = toplamaUyarisi(sonuc, ayar);
    expect(uyari).toContain("sunucu 500 parça sayıyor");
    expect(uyari).toContain("okunabilen 1");
  });

  it("sayı var ama tek satır gelmiyorsa bu 'boş kütüphane' sayılmaz", async () => {
    const { oku } = sahteSunucu([], 10);
    const ayar: ToplamaAyarlari = { toplamParca: 16418, sayfaBoyu: 10, azamiIstek: 5 };
    const sonuc = await kitaplariTopla(oku, ayar);
    expect(sonuc.kitaplar).toHaveLength(0);
    expect(toplamaUyarisi(sonuc, ayar)).toContain('"boş kütüphane" değil');
  });

  it("gerçekten boş kütüphane uyarı üretmez", async () => {
    const { oku } = sahteSunucu([], 10);
    const ayar: ToplamaAyarlari = { toplamParca: 0, sayfaBoyu: 10, azamiIstek: 5 };
    const sonuc = await kitaplariTopla(oku, ayar);
    expect(toplamaUyarisi(sonuc, ayar)).toBeNull();
  });
});

describe("H-35 — ekran: sayı ile liste aynı kaynaktan, hata görünür", () => {
  it("parça tablosu artık tek istekle okunmuyor", () => {
    expect(EKRAN_YORUMSUZ, "tek istekli okuma geri gelmiş").not.toContain(".limit(5000)");
    expect(EKRAN).toContain("kitaplariTopla(");
  });

  it("kitap sayısı ve parça sayısı AYNI toplamadan gelir", () => {
    // Başlıktaki iki sayı da `sources` / `chunkOkunan`tan, yani tek toplamadan.
    expect(EKRAN).toContain("Yüklenmiş kitaplar ({sources.length})");
    expect(EKRAN).toContain("{chunkOkunan.toLocaleString(\"tr-TR\")} parça");
    expect(EKRAN).toContain("setChunkOkunan(sonuc.okunan)");
  });

  it("içe aktarma koşusunun sayısı KÜTÜPHANE sanılmasın diye etiketlendi", () => {
    // Kurucunun "20 kitap var" diye okuduğu sayı buydu.
    expect(EKRAN).toContain("Bu içe aktarma koşusu");
    expect(EKRAN_YORUMSUZ).not.toContain('<div className="text-xs text-muted-foreground">İlerleme</div>');
  });

  it("okuma düşerse ekran SUSMAZ — sebep yazılır", () => {
    expect(EKRAN).toContain("setSourcesError(");
    expect(EKRAN).toContain("toplamaUyarisi(sonuc, ayar)");
    // Hata varken "yüklenmemiş" denmez.
    expect(EKRAN).toContain("Liste okunamadığı için gösterilemiyor; sebebi yukarıda yazılı.");
  });

  it("hata yalnız konsola yazılıp geçilmiyor", () => {
    const bas = EKRAN.indexOf("const loadSources = async () => {");
    expect(bas).toBeGreaterThan(-1);
    const govde = EKRAN.slice(bas, EKRAN.indexOf("useEffect(() => { loadSources(); }, []);", bas));
    const yakala = govde.indexOf("} catch (e: any) {");
    expect(yakala).toBeGreaterThan(-1);
    expect(govde.slice(yakala), "catch bloğu ekrana hiçbir şey yazmıyor").toContain("setSourcesError(");
  });
});
