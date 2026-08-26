import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* BÜRO ANTEDİ — HAT H-15/2 (seçim A) · mimari §3
 * ("arabulucu kimliği/adresi ... belgelere otomatik akar")
 *
 * NEDEN BU TEZGÂH VAR: madde 26.08'de **DONE işaretlendi ve değildi.** Göç
 * kolonları ekledi (`buro_adi` · `buro_adresi` · `antet_logo_url`),
 * `generate-official-document` onları OKUYORDU, `todo.md` de "göç koştuğu an ek
 * kod gerekmeden tamamlandı" diyordu. Ama hiçbir yüzey o kolonları
 * DOLDURMUYORDU: arabulucunun büro adını gireceği bir yer yoktu, dolayısıyla
 * her belge antetsiz basılıyordu. Okuma yarısı gerçekten kod gerektirmedi;
 * yazma yarısı hiç yazılmamıştı ve kimse fark etmedi çünkü antedi denetleyen
 * bir tezgâh YOKTU.
 *
 * KURAL: bir alanı OKUYAN kol kadar YAZAN yüzey de kilitlenir. Yalnız okuma
 * denetlenirse, veri hiç girilemese bile tezgâh yeşil yanar.
 */

const PROFIL = readFileSync("src/pages/Profile.tsx", "utf-8");
const URETICI = readFileSync("supabase/functions/generate-official-document/index.ts", "utf-8");
const TIPLER = readFileSync("src/integrations/supabase/types.ts", "utf-8");

describe("antet: OKUYAN kol kadar YAZAN yüzey de var", () => {
  it("üç alanı da dolduran bir yüzey var", () => {
    expect(PROFIL, "büro adı yazılmıyor").toContain("buro_adi:");
    expect(PROFIL, "büro adresi yazılmıyor").toContain("buro_adresi:");
    expect(PROFIL, "logo yazılmıyor").toContain("antet_logo_url:");
  });

  it("üç alanı da OKUYAN belge üreticisi duruyor", () => {
    for (const alan of ["buro_adi", "buro_adresi", "antet_logo_url"]) {
      expect(URETICI, `belge üreticisi ${alan} okumuyor`).toContain(alan);
    }
  });

  it("antet YALNIZ arabulucuya açık (taraf verisi değildir)", () => {
    // Büro kimliği tarafın verisi değildir; taraf ne görür ne yazar.
    expect(PROFIL, "rol kapısı yok").toContain("isMediator");
    const i = PROFIL.indexOf("buro_adi:");
    const once = PROFIL.slice(Math.max(0, i - 400), i);
    expect(once, "antet yazımı isMediator kapısının arkasında değil").toContain("isMediator");
  });

  it("yazımların sonucu okunuyor (supabase-js hata FIRLATMAZ)", () => {
    // 25.08 dersi: okunmayan yazımda kullanıcı "kaydedildi" duyar, veri gitmez.
    const i = PROFIL.indexOf("handleLogoUpload");
    expect(i, "logo kolu yok").toBeGreaterThan(-1);
    const govde = PROFIL.slice(i, i + 2200);
    expect(govde, "yükleme sonucu okunmuyor").toMatch(/const\s*\{\s*error:\s*yuklemeErr\s*\}\s*=\s*await/);
    expect(govde, "profil yazımının sonucu okunmuyor").toMatch(/const\s*\{\s*error:\s*yazErr\s*\}\s*=\s*await/);
  });

  it("tip dosyası canlı şemayla uyumlu (kolonlar tanınıyor)", () => {
    /* Göç 26.08'de koştu ama üretilen tip dosyası güncellenmemişti; bu yüzden
       alanları yazan ilk kod TS2353 ile düşüyordu. Kolonlar canlıda doğrulandı
       (üçü de `text`, hepsi nullable). */
    for (const alan of ["antet_logo_url", "buro_adi", "buro_adresi"]) {
      expect(TIPLER, `types.ts ${alan} kolonunu tanımıyor`).toContain(`${alan}: string | null`);
    }
  });
});
