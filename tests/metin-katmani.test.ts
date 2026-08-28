import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";
import {
  metinKatmaniDegerlendir,
  MEVZUAT_ASGARI_YOGUNLUK,
} from "../supabase/functions/_shared/metin-katmani";

/* METİN KATMANI KAPISI — "girdi sanılan boş kaynak" tek kapıdan geçer
 *
 * 27.08.2026'da yalnız `admin-upload-knowledge` kapatılmıştı. URL'den besleyen
 * iki yol (`build-legal-knowledge`, `build-knowledge-base`) açık kaldı ve
 * canlıda iki mevzuat kaynağı tam o açıktan girdi:
 *   · 7251 HMK Değişiklik — 366 KB PDF →  2 parça,  2.066 karakter
 *   · 2004 sayılı İİK     — 117 KB PDF →  2 parça,  3.533 karakter
 * İkisi de `/admin` listesinde GÖRÜNÜYOR ama ajanlar içinden hiçbir şey
 * bulamıyor. Açık hatadan kötüdür: hata görülür, boşluk görülmez.
 *
 * Aşağıdaki sayılar uydurma değil, 28.08.2026'da `knowledge_base_chunks`
 * üzerinden ÖLÇÜLDÜ. Tezgâhın işi eşiği bu iki yakanın arasında tutmaktır:
 * bilinen SAĞLAM kaynakların hepsi geçmeli, bilinen BOZUK iki kaynak
 * geçmemeli.
 */

const KB = 1024;

/** Canlıdan ölçülen kaynaklar: bayt · parça · parça karakteri · mevzuat mı. */
const CANLI = [
  { ad: "Arabuluculuk Yönetmeliği", bayt: 118706, parca: 42, krk: 63970, mevzuat: true, saglam: true },
  { ad: "6325 Arabuluculuk Kanunu", bayt: 405263, parca: 33, krk: 49408, mevzuat: true, saglam: true },
  { ad: "7155 Abonelik Kanunu", bayt: 111141, parca: 7, krk: 9354, mevzuat: true, saglam: true },
  { ad: "7036 İş Mahkemeleri Kanunu", bayt: 375635, parca: 12, krk: 16905, mevzuat: false, saglam: true },
  { ad: "2004 sayılı İİK", bayt: 117000, parca: 2, krk: 3533, mevzuat: true, saglam: false },
  { ad: "7251 HMK Değişiklik", bayt: 374810, parca: 2, krk: 2066, mevzuat: true, saglam: false },
];

describe("metin katmanı kapısı — canlı ölçümlerle", () => {
  for (const k of CANLI) {
    it(`${k.ad} · ${k.saglam ? "geçmeli" : "REDDEDİLMELİ"}`, () => {
      const s = metinKatmaniDegerlendir({
        bayt: k.bayt,
        parcaSayisi: k.parca,
        parcaKarakter: k.krk,
        mevzuat: k.mevzuat,
      });
      expect(s.yeterli, `${k.ad} yanlış tarafta (yoğunluk ${s.yogunluk})`).toBe(k.saglam);
      if (!k.saglam) expect(s.sebep, "reddedildi ama gerekçe yok").toBeTruthy();
    });
  }

  it("iki yaka arasında pay var: en kötü sağlam ile en iyi bozuk arasında sınır duruyor", () => {
    /* Eşiği elle değiştiren biri bu denetimi kırmadan iki yakadan birine
       yaklaşamaz. En kötü sağlam mevzuat 7155 (86 krk/KB), en iyi bozuk
       İİK (30 krk/KB). Sınır ikisinin ARASINDA kalmalı. */
    const enKotuSaglam = 9354 / (111141 / KB);
    const enIyiBozuk = 3533 / (117000 / KB);
    expect(MEVZUAT_ASGARI_YOGUNLUK).toBeGreaterThan(enIyiBozuk);
    expect(MEVZUAT_ASGARI_YOGUNLUK).toBeLessThan(enKotuSaglam);
  });
});

describe("kapının iki kuralı ayrı ayrı çalışıyor", () => {
  it("1 MB üstü dosya 10'dan az parça verirse her kategoride reddediliyor", () => {
    const s = metinKatmaniDegerlendir({
      bayt: 4.1 * 1024 * 1024,
      parcaSayisi: 5,
      parcaKarakter: 7000,
      mevzuat: false,
    });
    expect(s.yeterli).toBe(false);
    expect(s.sebep).toMatch(/TARANMIŞ/);
  });

  it("meşru sunum PDF'i (görsel ağırlıklı, mevzuat değil) engellenmiyor", () => {
    /* 27.08 kararı: eşik yoğunluğa değil tartışmasız uca konuldu, çünkü meşru
       sunum/eğitim PDF'leri 24 krk/KB'ye kadar iner. O karar burada korunuyor:
       aynı yoğunluk mevzuat DEĞİLSE geçer, mevzuat İSE geçmez. */
    const olcu = { bayt: 600 * KB, parcaSayisi: 12, parcaKarakter: Math.round(24 * 600) };
    expect(metinKatmaniDegerlendir({ ...olcu, mevzuat: false }).yeterli).toBe(true);
    expect(metinKatmaniDegerlendir({ ...olcu, mevzuat: true }).yeterli).toBe(false);
  });

  it("reddetmeyen ama şüpheli yoğunluk sessiz geçmiyor, uyarı dönüyor", () => {
    const s = metinKatmaniDegerlendir({
      bayt: 600 * KB,
      parcaSayisi: 12,
      parcaKarakter: Math.round(24 * 600),
      mevzuat: false,
    });
    expect(s.yeterli).toBe(true);
    expect(s.uyari, "şüpheli kaynak sessiz geçiyor").toBeTruthy();
  });

  it("sağlıklı kaynak ne reddediliyor ne de uyarı üretiyor", () => {
    const s = metinKatmaniDegerlendir({
      bayt: 405263,
      parcaSayisi: 33,
      parcaKarakter: 49408,
      mevzuat: true,
    });
    expect(s.yeterli).toBe(true);
    expect(s.uyari).toBeUndefined();
  });

  it("küçük dosya yoğunluk kuralına takılmıyor (ölçü anlamsızlaşır)", () => {
    const s = metinKatmaniDegerlendir({
      bayt: 8 * KB,
      parcaSayisi: 1,
      parcaKarakter: 220,
      mevzuat: true,
    });
    expect(s.yeterli).toBe(true);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   TEK KAPI: üç yol da aynı ölçüyü kullanıyor
   Eşik üç dosyada ayrı ayrı tutulursa üçü kaçınılmaz olarak birbirinden
   ayrılır — projenin `extraction_status` sözlük çatalıyla aynı aile. Aşağıdaki
   denetimler kopyanın geri gelmesini engeller.
   ──────────────────────────────────────────────────────────────────────────── */
const YOLLAR = [
  "supabase/functions/admin-upload-knowledge/index.ts",
  "supabase/functions/build-legal-knowledge/index.ts",
  "supabase/functions/build-knowledge-base/index.ts",
  "supabase/functions/google-drive-import/index.ts",
];

const govdesi = (yol: string) =>
  kaynakOku(yol)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("PDF'ten kaynak yazan dört yol da tek kapıdan geçiyor", () => {
  /* `approve-pending-mevzuat` bilerek DIŞARIDA: o yol PDF'ten değil,
     `pending_pool.raw_content` içindeki HAZIR METİNDEN besleniyor. Orada
     "bayt / çıkan karakter" oranı daima ~1'dir, yani yoğunluk ölçüsü hiçbir
     şey söylemez; kısa bir mevzuat metni orada meşru olarak kısadır.
     `backfill-knowledge-pages` de dışarıda: yeni kaynak yazmaz, yalnız
     mevcut parçaların sayfa numarasını günceller. */
  for (const yol of YOLLAR) {
    it(`${yol.split("/")[2]} kapıyı çağırıyor`, () => {
      const G = govdesi(yol);
      expect(G, "paylaşılan kapı ithal edilmemiş").toContain("_shared/metin-katmani.ts");
      expect(G, "kapı çağrılmıyor").toContain("metinKatmaniDegerlendir(");
      expect(G, "kapının kararı kullanılmıyor").toMatch(/katman\.yeterli/);
    });

    it(`${yol.split("/")[2]} eşiği kendi içinde YENİDEN tanımlamıyor`, () => {
      const G = govdesi(yol);
      /* Sayıyı burada tekrar yazan biri ikinci bir doğruluk kaynağı kurar.
         `1024 * 1024` gibi boyut sabitleri kapının içinde kalmalı. */
      expect(G, "eşik yerel olarak yeniden yazılmış").not.toMatch(/chunks\.length\s*<\s*10\b/);
    });
  }
});

describe("kapı, SİLMEDEN önce koşuyor", () => {
  /* En ağır zarar reddetme değil, KÖTÜ bir koşumun SAĞLAM bir kaynağı
     boşuyla değiştirmesidir: her iki yol da yazmadan önce eski parçaları
     `source_url` üzerinden siliyor. Kapı silmenin arkasında kalırsa kaynak
     kurtarılamaz. */
  it("build-legal-knowledge: kapı, delete çağrısından önce", () => {
    const G = govdesi("supabase/functions/build-legal-knowledge/index.ts");
    const kapi = G.indexOf("metinKatmaniDegerlendir(");
    const sil = G.indexOf(".delete()");
    expect(kapi).toBeGreaterThan(-1);
    expect(sil).toBeGreaterThan(-1);
    expect(kapi, "kapı silmeden SONRA — kötü koşum sağlam kaynağı götürür").toBeLessThan(sil);
  });

  it("google-drive-import: kapı, idempotanlık silmesinden önce", () => {
    const G = govdesi("supabase/functions/google-drive-import/index.ts");
    const kapi = G.indexOf("metinKatmaniDegerlendir(");
    const sil = G.indexOf('.delete().eq("source_url"');
    expect(kapi).toBeGreaterThan(-1);
    expect(sil).toBeGreaterThan(-1);
    expect(kapi, "kapı silmeden SONRA — kötü içe aktarma sağlam kaynağı götürür").toBeLessThan(sil);
  });

  it("build-knowledge-base: her iki modda da kapı temizlikten önce", () => {
    const G = govdesi("supabase/functions/build-knowledge-base/index.ts");
    const kapilar = [...G.matchAll(/metinKatmaniDegerlendir\(/g)].map((m) => m.index ?? -1);
    const silmeler = [...G.matchAll(/\.delete\(\)/g)].map((m) => m.index ?? -1);
    expect(kapilar.length, "iki mod var, iki kapı olmalı").toBe(2);
    expect(silmeler.length, "iki modun iki temizliği var").toBe(2);
    for (let i = 0; i < 2; i += 1) {
      expect(kapilar[i], `${i + 1}. modda kapı temizlikten sonra`).toBeLessThan(silmeler[i]);
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   İİK — HAT H-20'nin Code tarafı
   Bilgi tabanındaki tek İİK nüshası taranmıştı (117 KB → 2 parça). Kurucudan
   dosya istemek yerine kanunun resmî kaynağı kitap listesine kondu; kalan iş
   `/admin` ekranında düğmeye basmak. Aşağıdaki denetimler bunun sessizce geri
   alınmasını engeller.
   ──────────────────────────────────────────────────────────────────────────── */
describe("İİK resmî kaynaktan besleniyor", () => {
  const KITAPLAR = kaynakOku("supabase/functions/build-knowledge-base/index.ts");

  it("kitap listesinde ve kategorisi mevzuat", () => {
    /* Kategori önemli: yoğunluk kuralı YALNIZ mevzuat kaynaklarında koşuyor.
       Kategori başka bir şey olursa taranmış bir nüsha yine sızabilir. */
    expect(KITAPLAR).toMatch(
      /category:\s*"mevzuat",\s*title:\s*"2004 sayılı İcra ve İflas Kanunu"/,
    );
  });

  it("kaynak resmî mevzuat adresi, taranmış nüsha değil", () => {
    expect(KITAPLAR).toContain("https://www.mevzuat.gov.tr/MevzuatMetin/1.3.2004.pdf");
    expect(KITAPLAR, "depoya yüklenmiş taranmış nüshaya dönülmüş").not.toContain(
      "1785665680219-2004_say_l___cra_ve__flas_Kanunu.pdf",
    );
  });

  it("büyük olduğu için sayfa dilimli modda işleniyor", () => {
    /* 1.2 MB'lık bir kanun whole_book modunda zaman limitine takılır; adı
       sayfa modu listesinde olmazsa kaynak hiç girmez ve kimse fark etmez. */
    const liste = KITAPLAR.slice(
      KITAPLAR.indexOf("const SKIPPED_TITLES"),
      KITAPLAR.indexOf("const SUPABASE_URL"),
    );
    expect(liste).toContain("2004 sayılı İcra ve İflas Kanunu");
  });
});
