import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* KAZANIM SAYACI — mimari §15.2 · §15.1 camdan kutu · HAT H-15/4 (25.08.2026)
 *
 * §15.2: "kazanım sayacı baz çizgiyi alıyor ve dosya bazında saat üretiyor."
 *
 * Bu maddenin engeli "kazanım"ın TANIMIYDI. Tanımı beklemek yerine sayaç,
 * tanımı **veriye taşıyacak** biçimde kuruldu: katsayılar parametre tablosunda
 * durur, kurucu girer. Böylece karar beklenmeden kod hazır olur ve — daha
 * önemlisi — §15.1'in "camdan kutu" şartı yapısal olarak sağlanır:
 *
 *   "Bu dosyada 7 saat kazandınız" demek, 7'nin NEREDEN geldiği
 *   gösterilemiyorsa UYDURMADIR.
 *
 * Tezgâh bunun bozulmadığını denetler.
 */

const G = readFileSync("supabase/functions/kazanim-sayaci/index.ts", "utf-8");
const SQL = readFileSync("tests/gecici/kazanim-katsayilari.sql", "utf-8");

describe("kazanım sayacı: uydurma rakam üretemiyor", () => {
  it("katsayılar PARAMETRE TABLOSUNDAN geliyor, kodda sabit değil", () => {
    expect(G).toContain('from("kazanim_katsayilari")');
    const govde = G.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(govde, "kodda sabit dakika var").not.toMatch(/dakika\s*[=:]\s*\d+/);
  });

  it("KATSAYI YOKSA SAATE ÇEVİRMİYOR", () => {
    expect(G).toMatch(/if \(k\.dakika == null\)/);
    const nullIdx = G.indexOf("if (k.dakika == null)");
    const carpIdx = G.indexOf("adet * k.dakika");
    expect(nullIdx, "NULL kapısı yok").toBeGreaterThan(-1);
    expect(carpIdx, "çarpım NULL kapısından ÖNCE").toBeGreaterThan(nullIdx);
    expect(G.slice(nullIdx, carpIdx)).toContain("continue;");
    expect(G).toContain("katsayı girilmemiş — saate çevrilmedi");
  });

  it("HİÇ katsayı yoksa toplam VERMİYOR ('yeterli veri yok')", () => {
    expect(G).toMatch(/if \(katsayiliTur === 0\)/);
    const idx = G.indexOf("if (katsayiliTur === 0)");
    /* Pencere BLOĞUN KENDİSİYLE sınırlı olmalı: `idx + 400` gibi kaba bir
       dilim erken dönüşü aşıp normal dönüşe taşıyor ve orada `toplam_saat`
       görüp yanlış alarm veriyor. Blok, kendi `}` kapanışında biter. */
    const blok = G.slice(idx, G.indexOf("\n    }", idx));
    expect(blok).toContain("yeterli_veri: false");
    expect(blok, "veri yokken saat dönülüyor").not.toContain("toplam_saat");
  });

  it("toplamın nereden geldiği satır satır dönüyor", () => {
    // Her kalem: adet + katsayi + DAYANAK. Dayanaksiz rakam gosterilmez.
    expect(G).toContain("katsayi_dakika: k.dakika");
    expect(G).toContain("dayanak: k.dayanak");
    expect(G).toContain("kalem_dakika: kalemDakika");
  });

  it("rakamın TAHMİN olduğu gizlenmiyor", () => {
    expect(G).toContain('nitelik: "tahmin"');
    expect(G).toContain("elle yapılsaydı süreceği tahmini süre");
  });

  it("sayılacak tablo haritadan geliyor, parametre satırından değil", () => {
    expect(G).toContain("const SAYIM");
    expect(G).toMatch(/admin\.from\(hedef\.tablo\)/);
  });

  it("yalnız dosyanın arabulucusu görüyor", () => {
    expect(G).toContain("assigned_mediator_id");
    expect(G).toContain("kazanım özeti size ait değil");
  });

  it("göç değer olmadan kuruluyor (sayaç susarak başlar)", () => {
    expect(SQL).toMatch(/insert into public\.kazanim_katsayilari \(is_turu, dayanak\)/);
    expect(SQL, "dayanak alanı yok").toContain("dayanak text");
    expect(SQL).toContain("dakika integer");
  });

  it("tablo yoksa sessizce sıfır demiyor", () => {
    expect(G).toContain("Kazanım katsayıları okunamadı");
    expect(G).toContain("Katsayı tablosu henüz kurulmamış");
  });
});
