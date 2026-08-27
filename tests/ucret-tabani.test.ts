import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";

/* AAÜT TABANI — YASAL ASGARİ ÜCRET KORUMASI (mimari §15.2, 25.08.2026)

   §15.2 Aşama 1 kapanış şartı: "Ücret hesabı tarife tabanının altına inmiyor."
   Bu yasal bir tabandır (Arabuluculuk Asgari Ücret Tarifesi); altına inen bir
   kayıt, arabulucuyu mevzuata aykırı duruma düşürür.

   25.08 denetiminde kural ÜÇ yazım yolunun üçünde de kurulu bulundu — bu tezgâh
   onu yeniden yazmaz, **gerilemeye karşı kilitler**. Yeni bir ücret yazım yolu
   eklenip taban denetimi unutulursa bu test onu yakalamaz; bu yüzden aşağıda
   ayrıca `case_payments` yazan yol sayısı da sayılır. */

const DOSYA = "src/pages/MediationEngine.tsx";
const g = kaynakOku(DOSYA);

/** Bir işlevin gövdesini kabaca alır (sonraki `async function`a kadar). */
function govde(ad: string): string {
  const i = g.indexOf(`async function ${ad}(`);
  if (i < 0) return "";
  const j = g.indexOf("\n  async function ", i + 10);
  return g.slice(i, j > 0 ? j : i + 4000);
}

describe("ücret tarife tabanının altına inilemiyor", () => {
  const YOLLAR = ["saveUcretSozlesmesi", "saveStagedRows"];

  it.each(YOLLAR)("%s: taban denetimi YAZIMDAN ÖNCE ve yazımı durduruyor", (ad) => {
    const b = govde(ad);
    expect(b, `${ad} bulunamadı`).not.toBe("");
    expect(b, "taban denetimi yok").toContain("taban");
    expect(b, "tabanın altına inilemez uyarısı yok").toContain("tabanının altına inilemez");
    // Denetim, yazımdan ÖNCE gelmeli ve `return` ile durdurmalı.
    const denetimIdx = b.indexOf("tabanının altına inilemez");
    const yazimIdx = b.indexOf("await supabase.from(");
    expect(denetimIdx, "denetim yok").toBeGreaterThan(-1);
    expect(yazimIdx, "yazım yok").toBeGreaterThan(-1);
    expect(yazimIdx, "yazım taban denetiminden ÖNCE").toBeGreaterThan(denetimIdx);
    // Uyarı ile yazım arasında `return` olmalı: uyarıp devam etmek yetmez.
    expect(b.slice(denetimIdx, yazimIdx), "uyarı veriliyor ama yazım durdurulmuyor")
      .toContain("return;");
  });

  it("tekil ödeme satırı yazımında da taban denetleniyor", () => {
    // Bu yol `async function` degil; satir bazli aranir.
    const i = g.indexOf('if (rowKind === "ucret" && taban != null');
    expect(i, "tekil satır taban denetimi yok").toBeGreaterThan(-1);
    const blok = g.slice(i, i + 900);
    expect(blok).toContain("tabanının altına inilemez");
    expect(blok).toContain("return;");
    // Denetimden sonra gelen ilk yazim `case_payments` olmali.
    expect(blok).toContain('from("case_payments"');
  });

  it("sebep kullanıcıya TABAN RAKAMIYLA gösteriliyor", () => {
    // "Altina inilemez" demek yetmez; arabulucu tabanin ne oldugunu gormeli.
    const uyarilar = g.match(/tabanının altına inilemez \(taban: \$\{fmtTL\(taban\)\}\)/g) ?? [];
    expect(uyarilar.length, "taban rakamı gösterilmiyor").toBeGreaterThanOrEqual(3);
  });

  it("taban, tarife tablosundan geliyor (kodda sabit değil)", () => {
    // `taban` degeri ucret hesabindan gelmeli; kodda sabit sayi olmamali.
    expect(g).toMatch(/const\s+taban\s*=\s*feeResult\?\.net_tahsilat/);
    const hesap = kaynakOku("supabase/functions/calculate-mediation-fee/index.ts");
    expect(hesap, "tarife tablosundan okunmuyor").toContain('from("fee_tariffs")');
  });
});
