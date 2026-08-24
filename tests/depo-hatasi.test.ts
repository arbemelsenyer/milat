import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { depoHataTuru, depoHataMetni } from "../src/lib/depoHatasi";

/* DEPO HATASI — DOSYA YOKLUĞU ile YETKİ EKSİKLİĞİ AYRILIR (24.08.2026)
   İki yüzey de ham hata metnini gösteriyordu ("Object not found"), kullanıcı
   bunun yetki sorunu mu dosya yokluğu mu olduğunu anlayamıyordu.
   CANLI ÖLÇÜM: `case_documents`ta 24 üstveri satırından 2'sinin dosyası kovada
   YOK (tohum verisi) → o satırlarda indirme her zaman başarısız.
   Aynı gün kova politikası daraltıldığı için "yetki yok" da gerçek bir
   olasılıktır; ikisi ayrı anlatılmalı. */

describe("depo hatası türü", () => {
  it("dosya yokluğunu tanır", () => {
    for (const h of [
      { message: "Object not found" },
      { message: "The resource was not found" },
      "does not exist",
      { message: "404" },
    ]) {
      expect(depoHataTuru(h)).toBe("dosya_yok");
    }
  });

  it("yetki eksikliğini tanır", () => {
    for (const h of [
      { message: "Unauthorized" },
      { message: "new row violates row-level security policy" },
      { message: "403 Forbidden" },
      "permission denied",
    ]) {
      expect(depoHataTuru(h)).toBe("yetki_yok");
    }
  });

  it("tanımadığını bilinmeyen sayar", () => {
    expect(depoHataTuru({ message: "network timeout" })).toBe("bilinmeyen");
    expect(depoHataTuru(null)).toBe("bilinmeyen");
    expect(depoHataTuru(undefined)).toBe("bilinmeyen");
    expect(depoHataTuru("")).toBe("bilinmeyen");
  });
});

describe("depo hatası metni", () => {
  it("dosya yokluğunda kaydın var olduğunu söyler", () => {
    const m = depoHataMetni({ message: "Object not found" });
    expect(m).toContain("kaydı var");
    expect(m).toContain("dosyası depoda bulunamadı");
    expect(m).not.toContain("Object not found");
  });

  it("yetki eksikliğinde kimin görebileceğini söyler", () => {
    const m = depoHataMetni({ message: "Unauthorized" });
    expect(m).toContain("yetkiniz yok");
    expect(m).toContain("arabulucusu");
  });

  it("tanınmayan hatada ham metni KORUR (bilgi kaybetmez)", () => {
    expect(depoHataMetni({ message: "network timeout" })).toBe("network timeout");
  });

  it("boş hatada anlamlı yedek verir", () => {
    expect(depoHataMetni(null)).toBe("Dosya indirilemedi.");
  });
});

describe("iki yüzey de ortak çeviriciyi kullanır", () => {
  const CASEROOM = readFileSync("src/pages/CaseRoom.tsx", "utf-8");
  const ENGINE = readFileSync("src/pages/MediationEngine.tsx", "utf-8");

  /** Bir işlevin gövdesini kaynaktan çıkarır (assertion'ı o işlevle sınırlar). */
  function govde(kaynak: string, ad: string, sonEk: string): string {
    const bas = kaynak.indexOf(`async function ${ad}(`);
    expect(bas, `${ad} bulunamadı`).toBeGreaterThan(-1);
    const son = kaynak.indexOf(sonEk, bas);
    expect(son, `${ad} gövdesinin sonu bulunamadı`).toBeGreaterThan(bas);
    return kaynak.slice(bas, son);
  }

  it("tarafın belge indirmesi", () => {
    /* Yalnız INDIRME yolu denetlenir. Silme yolundaki catch bir VERİTABANI
       hatasıdır (depo kaldırma zaten console.warn ile yutuluyor); oraya depo
       çeviricisi uygulanması YANLIŞ olurdu. */
    const g = govde(CASEROOM, "downloadMyDoc", "async function deleteMyDoc");
    expect(g).toContain("depoHataMetni(e)");
    expect(g).not.toContain('e?.message ?? "Bilinmeyen hata"');
  });

  it("arabulucunun kaynak görüntüleyicisi", () => {
    expect(ENGINE).toContain("depoHataMetni(e)");
    expect(ENGINE).not.toContain('e?.message || "Dosya indirilemedi."');
  });
});
