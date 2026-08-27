import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";

/* KAZANIM SAYACI — mimari §5.9 · §15.1 camdan kutu · HAT H-15/4 seçim B
 *
 * KURUCU KARARI (B — KALEM KALEM): katsayıyı **biz koymayız**. Rakam
 * arabulucunun kendi beyanıdır; kayıt olurken bir kez üç soru sorulur
 * (§5.9 baz çizgisi) ve sayaç o beyanı kullanır. Ekranda hesabın kendisi
 * görünür: "kendi verdiğiniz 2 saat × 6 belge = 12 saat".
 *
 * TASARIM DEĞİŞTİ: ilk yazımda katsayılar YÖNETİCİDEN alınıyordu
 * (`kazanim_katsayilari`). Kurucu kararı geldi, tasarım ona göre değiştirildi —
 * `kazanim-katsayilari.sql` göçü ARTIK ÇALIŞTIRILMAMALIDIR.
 *
 * Bu tezgâh iki şeyi denetler: (a) uydurma rakam üretilemez, (b) gizlilik —
 * sayaç yalnız süre ve işlem tipi tutar (§14, constitution m.1).
 */

const G = kaynakOku("supabase/functions/kazanim-sayaci/index.ts");
const SQL = kaynakOku("tests/sabit/baz-cizgi.sql");

describe("kazanım sayacı: rakam arabulucunun kendi beyanı", () => {
  it("katsayı ARABULUCUDAN gelir, yöneticiden değil", () => {
    expect(G).toContain('from("arabulucu_baz_cizgi")');
    expect(G, "eski yönetici katsayısı tasarımı duruyor").not.toContain("kazanim_katsayilari");
    /* Kodda sabit KATSAYI olmamalı. Denetim yalnız ÜÇ BEYAN ALANINI hedefler —
       `toplam_saat: 0` gibi meşru sıfırları yakalamamalı (dosyası olmayan
       arabulucu için doğru cevaptır). Geniş bir `_saat` deseni onu da yakalıyordu. */
    const govde = G.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(govde, "kodda sabit katsayı var")
      .not.toMatch(/(belge_saat|analiz_saat|beyan_saat)\s*[=:]\s*\d/);
  });

  it("baz çizgi yoksa RAKAM ÜRETİLMEZ, üç soru geri döner", () => {
    expect(G).toMatch(/if \(!baz\)/);
    const idx = G.indexOf("if (!baz)");
    const blok = G.slice(idx, G.indexOf("\n    }", idx));
    expect(blok).toContain("yeterli_veri: false");
    expect(blok).toContain('sebep: "baz_cizgi_yok"');
    // Ekran sorabilsin diye sorular donuyor.
    expect(blok).toContain("sorular:");
  });

  it("bir soru yanıtsızsa O KALEM saate çevrilmez", () => {
    expect(G).toMatch(/if \(saat == null\)/);
    const nullIdx = G.indexOf("if (saat == null)");
    const carpIdx = G.indexOf("adet * Number(saat)");
    expect(nullIdx).toBeGreaterThan(-1);
    expect(carpIdx, "çarpım null kapısından ÖNCE").toBeGreaterThan(nullIdx);
    expect(G.slice(nullIdx, carpIdx)).toContain("continue;");
    expect(G).toContain("beyan verilmedi — saate çevrilmedi");
  });

  it("hiçbir soru yanıtlanmadıysa toplam VERİLMEZ", () => {
    expect(G).toMatch(/if \(saatliKalem === 0\)/);
    const idx = G.indexOf("if (saatliKalem === 0)");
    const blok = G.slice(idx, G.indexOf("\n    }", idx));
    expect(blok).toContain("yeterli_veri: false");
    expect(blok, "veri yokken saat dönülüyor").not.toContain("toplam_saat");
  });

  it("HESABIN KENDİSİ görünür (§15.1 camdan kutu)", () => {
    expect(G).toContain("hesap:");
    expect(G).toMatch(/kendi verdiğiniz \$\{saat\} saat × \$\{adet\}/);
    // Rakamin niteligi gizlenmez.
    expect(G).toContain("arabulucunun kendi beyanına dayalı hesap");
  });

  it("TAKVİM SÜRESİ kullanılmıyor (kurucu kararı)", () => {
    // Taraf gec cevap verirse takvim farki sayaci eksiye dusururdu.
    expect(G).toContain("TAKVİM SÜRESİ KULLANILMAZ");
    const govde = G.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(govde, "takvim farkı hesaplanıyor").not.toMatch(/closed_at|created_at.*getTime/);
  });

  it("GİZLİLİK: yalnız süre ve işlem tipi tutulur", () => {
    // Sayilan tablolar sabit; icerik/isim/tutar alani cekilmez.
    expect(G).toContain("const KALEMLER");
    const govde = G.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
    for (const yasak of ["first_name", "last_name", "company_name", "amount", "statement"]) {
      expect(govde, `sayaca ${yasak} giriyor`).not.toContain(yasak);
    }
    // Sayim yalniz `id` sayar, icerik cekmez.
    expect(G).toMatch(/select\("id", \{ count: "exact", head: true \}\)/);
  });

  it("yalnız kendi dosyasını / kendi sayacını görür", () => {
    expect(G).toContain("kazanım özeti size ait değil");
    expect(G).toMatch(/assigned_mediator_id\.eq\.\$\{uid\}/);
  });

  it("baz çizgi göçü: arabulucu kendi satırını yazar, başkasınınkini değil", () => {
    expect(SQL).toContain("arabulucu_baz_cizgi");
    expect(SQL).toMatch(/with check \(user_id = auth\.uid\(\)\)/);
    expect(SQL, "süre dışında alan var").toContain("belge_saat");
    /* Gizlilik: tabloda içerik alanı olmamalı. YORUMA DEĞİL KOLON TANIMINA
       bakılır — göçün yorumu zaten "tutar bu tabloya GİRMEZ" diyor ve kelimeye
       bakan denetim kendi belgesini kusur sanıyordu (bugün üçüncü kez). */
    const kolonlar = SQL
      .replace(/--.*$/gm, "")                       // SQL yorumları
      .slice(SQL.indexOf("create table"), SQL.indexOf(");"));
    for (const yasak of ["case_id", "party_id", "tutar", "amount"]) {
      expect(kolonlar, `baz çizgi tablosunda ${yasak} kolonu var`).not.toContain(yasak);
    }
  });

  it("baz çizgi arabulucudan İŞ ÜRETİLMEDEN ÖNCE isteniyor", () => {
    /* Kurucu talimatı: "baz çizgi kayıt anında alınır — pilot arabulucuları
       baz çizgi sorulmadan kaydolursa kazanım rakamı bir daha geriye dönük
       kurulamaz." Kayıt e-posta onayı gerektirdiği için `signUp` anında oturum
       (auth.uid()) yok ve RLS gereği satır yazılamaz; bu yüzden soru
       arabulucunun çalışmaya BAŞLADIĞI ilk ekranda sorulur. */
    const kart = kaynakOku("src/components/mediation/BazCizgiSorulari.tsx");
    const motor = kaynakOku("src/pages/MediationEngine.tsx");
    // Uc soru da 5.9'daki haliyle sorulmali.
    for (const a of ["belge_saat", "analiz_saat", "beyan_saat"]) {
      expect(kart, `${a} sorulmuyor`).toContain(a);
    }
    // Beyan verilmisse kart CIKMAZ (tek seferlik).
    expect(kart).toMatch(/setGerekli\(!data\)/);
    expect(kart).toMatch(/if \(!gerekli\) return null/);
    /* Kart kapatılamaz: "atlanmayacak" (kurucu). Kapatma düğmesi olmamalı.
       YORUMA DEĞİL KODA BAK — bu dosyanın kendi yorumu "kapatılamaz" diyor ve
       kelimeye bakan denetim onu kusur sanıyordu (bugün DÖRDÜNCÜ kez). */
    const kartKodu = kart.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(kartKodu, "kart kapatılabiliyor — atlanabilir olur")
      .not.toMatch(/onDismiss|setGizli|onClose|kapat\w*\(/i);
    // Ama calismayi da engellememeli: liste ekraninda, akisi kilitlemeden.
    expect(motor).toContain("<BazCizgiSorulari userId={user.id} />");
    // Gizlilik: forma içerik alanı girmemeli — yine YORUM DEĞİL kod denetlenir.
    for (const yasak of ["case_id", "party_id", "tutar"]) {
      expect(kartKodu, `baz çizgi formunda ${yasak} var`).not.toContain(yasak);
    }
  });
});
