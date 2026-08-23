import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* DOSYA KAPANIŞI `closed_at`i GERÇEKTEN DOLDURUR MU (24.08.2026 kusuru)
   `closed_at` sütununu dolduran şey bir veritabanı tetikleyicisidir:
     set_case_closed_at → IF NEW.outcome IS NOT NULL
                          AND OLD.outcome IS DISTINCT FROM NEW.outcome
                          THEN NEW.closed_at := COALESCE(NEW.closed_at, now());
   Yani tetikleyici **`outcome`** değişimini izler. Kapanış ekranı ise yalnız
   `status` yazıyordu; ikisi hiç buluşmuyor, `closed_at` boş kalıyordu.
   CANLI KANIT: `outcome` dolu 5 dosyanın beşinde de `closed_at` dolu; bu
   ekrandan kapatılan 1 dosyada ikisi de boş.

   BOŞ `closed_at`in bedeli (hepsi kodda okunur):
     · ajan-nobetci/index.ts:1954 → 24 saatlik ses silme sayacı başlamaz
     · dosya-verilerini-sil/index.ts:145 → 5 yıllık sayaç now()'a düşer
     · generate-official-document/index.ts:230 → "Sürecin Bitiş Tarihi" yazılmaz
     · OutcomeAnalytics.tsx:126 → outcome'u boş dosya istatistiğe girmez

   Bu tezgâh kaynak metni denetler; tarayıcı ya da veritabanı gerekmez. */

const KAYNAK = readFileSync("src/pages/MediationEngine.tsx", "utf-8");

/** `closeCase` gövdesini kaynaktan çıkarır. */
function closeCaseGovdesi(): string {
  const bas = KAYNAK.indexOf("async function closeCase(");
  expect(bas, "closeCase bulunamadı — ad değişmişse bu tezgâh güncellenmeli").toBeGreaterThan(-1);
  const son = KAYNAK.indexOf("finally { setBusy(null); }", bas);
  expect(son, "closeCase gövdesinin sonu bulunamadı").toBeGreaterThan(bas);
  return KAYNAK.slice(bas, son);
}

describe("dosya kapanışı — closed_at tetikleyicisi gerçekten uyanır", () => {
  it("kapanış `outcome` sütununu YAZAR (tetikleyicinin izlediği alan)", () => {
    expect(closeCaseGovdesi()).toContain("outcome:");
  });

  it("kapanış `status` sütununu da yazar (iki sütun ayrı ayrı)", () => {
    expect(closeCaseGovdesi()).toContain("status:");
  });

  it("`outcome` Türkçe sözlüğü kullanır — `status` sözlüğü oraya yazılmaz", () => {
    const govde = closeCaseGovdesi();
    expect(govde).toContain("anlasma");
    expect(govde).toContain("anlasamama");
    // status sozlugu (agreed/failed) outcome degeri olarak kullanilmamali:
    expect(govde).not.toContain('outcome: agreed ? "agreed"');
  });

  it("kapanış tarihi `closed_at`ten okunur, `updated_at`ten DEĞİL", () => {
    const bas = KAYNAK.indexOf("function Phase9Closing(");
    expect(bas).toBeGreaterThan(-1);
    const govde = KAYNAK.slice(bas, bas + 4000);
    expect(govde).toContain('select("closed_at")');
    expect(govde, "kapanış tarihi hâlâ updated_at'ten okunuyor")
      .not.toContain('select("updated_at")');
  });
});
