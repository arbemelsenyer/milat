import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* PERİYODİK İMHA — mimari §15.2 · constitution m.10 · HAT H-15/1 (25.08.2026)
 *
 * §15.2: "saklama süreleri PARAMETRE TABLOSUNDAN okunuyor ve periyodik imha
 * çalışıyor." Bu kol o şartın KOD yarısıdır; süre DEĞERLERİ kurucu kararıdır
 * (H-15/1) ve tablo değer olmadan kurulur.
 *
 * BU BİR SİLME KOLUDUR — tezgâh, güvenli tasarımın bozulmadığını denetler:
 * süre girilmemişse hiçbir şey silinmez, süre kodda sabit olamaz, tablo adı
 * parametreden gelemez, kapanmamış dosyaya dokunulmaz.
 */

const G = readFileSync("supabase/functions/saklama-imha/index.ts", "utf-8");
const SQL = readFileSync("tests/gecici/saklama-suresi-politika.sql", "utf-8");

describe("periyodik imha: güvenli tasarım bozulmuyor", () => {
  it("süre PARAMETRE TABLOSUNDAN okunuyor, kodda sabit değil", () => {
    expect(G).toContain('from("saklama_sureleri")');
    // Kodda gun sayisi sabiti olmamali (ornegin 365 / 30 gibi).
    const govde = G.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(govde, "kodda sabit gün sayısı var").not.toMatch(/saklama_gun\s*[=:]\s*\d+/);
  });

  it("SÜRE GİRİLMEMİŞSE HİÇBİR ŞEY SİLİNMEZ", () => {
    // Tablo deger olmadan kuruluyor; NULL => atla.
    expect(G).toMatch(/if \(s\.saklama_gun == null\)/);
    const nullIdx = G.indexOf("if (s.saklama_gun == null)");
    const silIdx = G.indexOf(".delete(", nullIdx);
    expect(nullIdx, "NULL kapısı yok").toBeGreaterThan(-1);
    expect(silIdx, "silme NULL kapısından ÖNCE").toBeGreaterThan(nullIdx);
    expect(G.slice(nullIdx, silIdx)).toContain("continue;");
    // Gocun kendisi de degersiz kurulmali.
    expect(SQL, "göç değerle kuruluyor").toContain("saklama_gun");
    expect(SQL).toMatch(/insert into public\.saklama_sureleri \(veri_turu, baslangic, aciklama\)/);
  });

  it("tablo adı parametreden GELMİYOR (kötü satır rastgele tablo sildiremez)", () => {
    expect(G).toContain("TUR_HARITASI");
    // Silme hedefi haritadan gelmeli, `s.veri_turu`dan degil.
    expect(G).toMatch(/admin\.from\(hedef\.tablo\)/);
    expect(G, "tanınmayan tür sessiz geçiliyor").toContain("tanınmayan veri türü");
  });

  it("kapanmamış dosyaya dokunulmuyor", () => {
    expect(G).toMatch(/\.not\("closed_at", "is", null\)/);
    expect(G).toMatch(/\.lt\("closed_at", sinir\)/);
  });

  it("dosyanın kendisini silmiyor (o başka kolun işi)", () => {
    // `dosya_kapanis_sonrasi` bilerek eslenmemis olmali.
    expect(G).toMatch(/dosya_kapanis_sonrasi:\s*null/);
    expect(G).toContain("dosya-verilerini-sil");
  });

  it("kuru koşum var (silmeden önce ne silineceği görülebiliyor)", () => {
    expect(G).toContain("kuru");
    expect(G).toMatch(/govde\?\.kuru === true/);
  });

  it("yetkisiz çağrı reddediliyor", () => {
    expect(G).toContain("x-cron-secret");
    expect(G).toContain("Admin gereklidir");
  });

  it("tablo yoksa sessizce 'temiz' demiyor", () => {
    expect(G).toContain("Saklama süreleri okunamadı");
    expect(G).toContain("Parametre tablosu henüz kurulmamış");
  });

  it("silme hataları yutulmuyor", () => {
    expect(G).toContain("silErr");
    expect(G).toMatch(/uyarilar\.push\(`\$\{tur\}: silinemedi/);
  });
});
