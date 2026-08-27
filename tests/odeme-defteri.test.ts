import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";

/* ÖDEME DEFTERİ — mimari §15.2 + §15.5-4 (25.08.2026)
 *
 * §15.5'te 28.07'den beri açık duran TEK pilot blokeri:
 * "Ödeme defteri Kaydet görünürlüğü — son doğrulama."
 *
 * 25.08 denetimi: defterin dört yazım yolu da kurulu ve Kaydet kolları
 * KOŞULSUZ görünüyor; yalnız işlem sürerken devre dışı kalıyorlar (çift
 * gönderimi önlemek için — doğru davranış). Bu tezgâh gerilemeye karşı kilitler:
 * bir Kaydet düğmesi koşullu görünür hâle getirilirse test düşer.
 */

const G = kaynakOku("src/pages/MediationEngine.tsx");

/** Bir düğmenin `disabled` ifadesi YALNIZ meşguliyet bayrağı mı? */
function yalnizMesguliyet(satir: string, bayrak: string): boolean {
  return satir.includes(`disabled={${bayrak}}`);
}

describe("ödeme defteri: Kaydet kolları her zaman görünür", () => {
  const satirlar = G.split(String.fromCharCode(10));

  it("satır ekleme düğmesi koşulsuz render ediliyor", () => {
    const s = satirlar.find((l) => l.includes("onClick={addPaymentRow}"));
    expect(s, "Satır Ekle düğmesi yok").toBeTruthy();
    expect(yalnizMesguliyet(s!, "rowBusy"), "Satır Ekle koşullu devre dışı").toBe(true);
  });

  it("satır düzenleme Kaydet'i koşulsuz render ediliyor", () => {
    const s = satirlar.find((l) => l.includes("onClick={() => requestSaveEdit(p)}"));
    expect(s, "düzenleme Kaydet düğmesi yok").toBeTruthy();
    expect(yalnizMesguliyet(s!, "editBusy"), "Kaydet koşullu devre dışı").toBe(true);
  });

  it("toplu kaydetme ve ücret sözleşmesi Kaydet'i koşulsuz", () => {
    const toplu = satirlar.find((l) => l.includes("onClick={saveStagedRows}"));
    expect(toplu, "toplu kaydet yok").toBeTruthy();
    expect(yalnizMesguliyet(toplu!, "stageBusy")).toBe(true);

    const sozlesme = satirlar.find((l) => l.includes("onClick={saveUcretSozlesmesi}"));
    expect(sozlesme, "ücret sözleşmesi kaydet yok").toBeTruthy();
    expect(yalnizMesguliyet(sozlesme!, "contractBusy")).toBe(true);
  });

  it("silme onay ister (kazara silme yok)", () => {
    expect(G).toContain("Ödenmiş kayıt değiştirilecek");
    expect(G, "silme onayı yok").toMatch(/AlertDialog[\s\S]{0,4000}deleteBusy/);
  });

  it("hata kullanıcıya gösteriliyor (sessiz başarısızlık yok)", () => {
    for (const alan of ["editError", "rowError", "stageError", "contractError"]) {
      expect(G, `${alan} kullanıcıya gösterilmiyor`).toContain(alan);
    }
  });
});
