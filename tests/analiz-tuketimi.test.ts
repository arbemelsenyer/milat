import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* ANALİZ TÜKETİMİ — HAT H-15/3 ("sayaç çalışsın, engel olmasın") · 26.08.2026
 *
 * Kurucu kararı: pilot 3 ay ücretsiz olduğu için kota kimseyi ENGELLEMEZ, ama
 * tüketim SAYILIR — paket fiyatı ve kotaya dahil analiz adedi ancak pilot
 * verisiyle doğru konur (§13 "platform içi otomatik kullanım sayaçları").
 *
 * Bu tezgâh iki şeyi korur: (a) ekran yalnız SAYI gösterir, içerik sızmaz
 * (§14, constitution m.1); (b) kurucunun "YAPILMAYACAK" dediği şeyler
 * (paket/fiyat ekranı, kota engeli, aşım ücreti) buraya sızmaz.
 */

const G = readFileSync("src/components/admin/AnalizTuketimi.tsx", "utf-8");
const ADMIN = readFileSync("src/pages/AdminDashboard.tsx", "utf-8");
/** Yasak desen denetimi YORUMA DEĞİL KODA bakar (25.08 dersi). */
const KOD = G.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("analiz tüketimi: sayar, engellemez, içerik sızdırmaz", () => {
  it("Dosyaya Soru Sor dahil analiz koşumları sayılıyor", () => {
    expect(G).toContain("ANALIZ_TABLOLARI");
    for (const t of ["party_analyses", "common_ground_reports"]) {
      expect(G, `${t} sayılmıyor`).toContain(t);
    }
  });

  it("GİZLİLİK: yalnız sayı gösteriliyor, içerik değil", () => {
    for (const yasak of ["title", "issue_description", "statement", "amount", "first_name", "company_name"]) {
      expect(KOD, `ekrana ${yasak} giriyor`).not.toContain(yasak);
    }
    // `profiles`ten yalniz ad cekilir.
    expect(G).toMatch(/select\("user_id, full_name"\)/);
  });

  it("kota ENGELİ yok (kurucu: pilotta engel olmayacak)", () => {
    /* KELİMEYE DEĞİL MEKANİZMAYA BAK. Ekranın açıklama cümlesi "paket fiyatı
       pilot verisiyle konacak" diyor — "fiyat" kelimesi orada geçiyor ama
       ortada fiyat ÖZELLİĞİ yok. Denetim, kota mekaniğini kuran gerçek
       göstergeleri arar: limit okuma, engelleme dalı, kota tablosu. */
    for (const mekanizma of ["limit_deger", "paket_kotalari", "kotaKapisi", "dolunca"]) {
      expect(KOD, `${mekanizma} bu ekrana sızmış — kota mekaniği kuruluyor`)
        .not.toContain(mekanizma);
    }
    // Ekran hicbir kosulda "engelleme" karari vermemeli.
    expect(KOD, "ekran engelleme kararı veriyor").not.toMatch(/izin\s*=|disabled=\{.*kota/i);
  });

  it("ayrı sayaç tablosu tutulmuyor (tek doğruluk kaynağı)", () => {
    // Tuketim ciktinin KENDISINDEN sayilir; ikinci bir sayac tablosu iki
    // dogruluk kaynagi yaratir ve kacinilmaz olarak birbirinden ayrilir.
    expect(KOD).not.toContain("tuketim_sayaci");
    expect(KOD).not.toContain("insert");
  });

  it("bir tablo okunamazsa sessizce sıfır sayılmıyor", () => {
    expect(G).toContain("okunamadı");
    expect(G).toMatch(/if \(error\) \{ console\.error/);
  });

  it("/admin ekranına bağlı", () => {
    expect(ADMIN).toContain("<AnalizTuketimi />");
    expect(ADMIN).toMatch(/TabsTrigger value="tuketim"/);
  });
});
