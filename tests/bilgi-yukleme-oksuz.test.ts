import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";

/* BİLGİ TABANI YÜKLEMESİ ÖKSÜZ DOSYA BIRAKMAZ — 27.08.2026 (HAT H-19 yan bulgusu)
 *
 * `admin-upload-knowledge` dosyayı EN BAŞTA depoya yüklüyordu; metin çıkarma,
 * parçalama ya da embedding başarısız olunca işlev hata dönüyor ama dosya
 * depoda kalıyordu. Hiçbir `knowledge_base_chunks` satırı onu göstermediği
 * için dosya `/admin` listesinde GÖRÜNMÜYOR (liste parçalardan üretiliyor) ve
 * `admin-delete-knowledge` de onu bulamıyor — yani süresiz kalıyor
 * (constitution m.10). Canlıda bu sınıftan 71 dosya sayıldı.
 *
 * Doğrusu: önce işle ve parçaları yaz, EN SON dosyayı yükle. Aşağıdaki
 * denetimler sıranın geri dönmesini engeller.
 *
 * Bu, `saklama-imha` ve `dosya-verilerini-sil` kollarındaki "önce depo, sonra
 * satır" kuralının AYNADAKİ HÂLİDİR: silerken önce dosya gider, YAZARKEN en
 * son dosya gelir. İkisinin ortak kuralı tektir — dosyayı gösteren kayıt,
 * dosyanın kendisinden önce var olmalı ve ondan sonra yok olmalıdır.
 */

const YUKLE = "supabase/functions/admin-upload-knowledge/index.ts";
const SIL = "supabase/functions/admin-delete-knowledge/index.ts";
const ADMIN_EKRAN = "src/components/admin/KnowledgeBaseAdmin.tsx";

/** Yorumlar çıkarılmış gövde: sıra denetimi yorum metnine takılmasın. */
const govdesi = (yol: string) =>
  kaynakOku(yol)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("bilgi tabanı yüklemesi öksüz dosya bırakmıyor", () => {
  const G = govdesi(YUKLE);

  it("depoya yükleme, parçalar YAZILDIKTAN sonra geliyor", () => {
    const yukleme = G.indexOf('storage\n      .from("case-documents")\n      .upload(');
    const yaz = G.indexOf('from("knowledge_base_chunks").insert(');
    expect(yaz, "parça yazımı yok").toBeGreaterThan(-1);
    expect(yukleme, "depoya yükleme kolu yok").toBeGreaterThan(-1);
    expect(
      yukleme,
      "dosya parçalar yazılmadan ÖNCE yükleniyor — işleme hata verirse öksüz kalır",
    ).toBeGreaterThan(yaz);
  });

  it("erken çıkışların hiçbiri arkasında yüklenmiş dosya bırakmıyor", () => {
    /* Yükleme tek yerde ve en sonda olmalı: birden fazla yükleme kolu olursa
       biri yine erken çıkışların önüne düşebilir. */
    const adet = (G.match(/\.upload\(/g) ?? []).length;
    expect(adet, "birden fazla yükleme kolu var; sıra garantisi kalmaz").toBe(1);

    /* Yükleme ile başarı dönüşü ARASINDA hata dönen bir erken çıkış kalmamalı.
       En dıştaki `catch` bu pencerenin dışındadır ve bilerek kapsam dışı:
       yüklemeden sonra yalnız `return json({ ok: true … })` var, oraya
       düşecek bir fırlatma yok. Pencereyi dar tutmak, denetimin gerçekten
       tehlikeli olan yolu ölçmesini sağlar. */
    const yukleme = G.indexOf(".upload(");
    const basari = G.indexOf("ok: true", yukleme);
    expect(basari, "yüklemeden sonra başarı dönüşü yok").toBeGreaterThan(yukleme);
    expect(
      G.slice(yukleme, basari),
      "yükleme ile başarı dönüşü arasında hata çıkışı var — o yolda dosya öksüz kalır",
    ).not.toMatch(/return json\(\{\s*error:/);
  });

  it("yükleme başarısız olursa sessiz geçilmiyor, çağırana bildiriliyor", () => {
    expect(G, "yükleme sonucu okunmuyor").toContain("upErr");
    expect(G, "yükleme hatası çağırana taşınmıyor").toMatch(/uyari/);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   SESSİZ BOŞ YÜKLEME — 27.08.2026
   Tek kapı `chunks.length === 0` idi. Metin katmanı olmayan bir PDF sıfır
   değil BİRKAÇ parça verir; o zaman yükleme "başarılı" sayılır, kaynak
   `/admin` listesinde görünür, ama ajanlar içinden hiçbir şey bulamaz.
   Açık hatadan daha kötüdür: hata görülür, boşluk görülmez.
   Canlıda üç kaynak böyle girmişti (4.1 MB → 5 parça · 117 KB "İİK" → 2 parça).
   ──────────────────────────────────────────────────────────────────────────── */
describe("sessiz boş yükleme yakalanıyor", () => {
  const G = govdesi(YUKLE);

  it("büyük dosya çok az parça verirse REDDEDİLİYOR", () => {
    expect(G, "boyut eşiği yok").toMatch(/bytes\.length\s*>=\s*1024\s*\*\s*1024/);
    expect(G, "parça eşiği yok").toMatch(/chunks\.length\s*<\s*10/);
    expect(G, "sebep söylenmiyor").toContain("TARANMIŞ");
  });

  it("eşiğin altındaki şüphe engellenmiyor ama SÖYLENİYOR", () => {
    // Meşru sunum PDF'leri düşük yoğunluktadır; reddetmek yanlış olur.
    expect(G, "yoğunluk uyarısı yok").toContain("yogunluk_uyarisi");
    expect(G).toMatch(/yogunluk\s*<\s*0\.05/);
  });

  it("800 parça sınırı, çözümü de söylüyor", () => {
    /* Kurucu bu sınıra TTK'da takılmış ve kanunu 7 parçaya bölerek çözmüştü —
       ama bunu kendi bulmuştu. Hata metni artık yolu gösteriyor. */
    expect(G).toContain("bölüm bölüm");
  });
});

describe("öksüzün görünmezliği: sınıfın neden ağır olduğu", () => {
  it("/admin listesi parçalardan üretiliyor (dosyadan değil)", () => {
    /* Bu denetim kusuru değil GEREKÇEYİ kilitler: liste parçalardan üretildiği
       için parçasız bir dosya ekranda hiç görünmez, kurucu onu silemez. Liste
       bir gün depodan üretilirse bu tezgâhın gerekçesi değişir; o zaman
       yukarıdaki sıra kuralı da yeniden düşünülmelidir. */
    expect(govdesi(ADMIN_EKRAN)).toContain('from("knowledge_base_chunks")');
  });

  it("silme kolu dosyayı yalnız source_url üzerinden bulabiliyor", () => {
    const S = govdesi(SIL);
    expect(S).toContain("storage://case-documents/");
    expect(S).toMatch(/storage\.from\("case-documents"\)\.remove\(/);
  });
});
