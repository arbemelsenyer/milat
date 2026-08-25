import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* KULLANILABİLİRLİK — 03.08 saha notu (NOVAPOS koşumu), 25.08'de kapatıldı
 *
 * İki bulgu vardı:
 *   1. "dosya açılış formunun sayfası boşta kalınca listeye dönüyor (form kaybı)"
 *   2. "açılır menülerde klavye erişilebilirliği yok, seçenekler erişilebilirlik
 *      ağacına düşmüyor"
 *
 * (1) için tetikleyici tek yerde değildi (oturum düşmesi → `/auth` → dönüşte
 * liste; ayrıca jeton yenilenince üst durum tazeleniyordu). Tek tek kovalamak
 * yerine ASIL ZARAR kapatıldı: yazılan içerik taslak olarak korunuyor.
 *
 * (2) menüler Radix (`@radix-ui/react-select`) — klavye gezinme ve `role=option`
 * ZATEN vardı; bulgunun canlı karşılığı başkaydı: `Label`in `htmlFor`u ve
 * tetikleyicinin `id`si olmadığı için menünün ERİŞİLEBİLİR ADI yoktu.
 */

const G = readFileSync("src/pages/MediationEngine.tsx", "utf-8");

describe("dosya açılış formu: içerik kaybolmuyor, menüler adlandırılmış", () => {
  it("form içeriği taslak olarak korunuyor", () => {
    expect(G, "taslak anahtarı yok").toContain("YENI_BASVURU_TASLAK");
    // Form ILK DEGERLERINI taslaktan almali (yoksa geri gelmez).
    expect(G).toMatch(/useState\(ilkTaslak\?\.title\s*\?\?\s*""\)/);
    expect(G).toMatch(/useState\(ilkTaslak\?\.disputeType\s*\?\?\s*""\)/);
    // Her degisiklikte yazilmali.
    expect(G).toMatch(/\}, \[title, disputeType, altUzmanlik\]\)/);
  });

  it("taslak kayıt ve iptalde temizleniyor (bayat taslak kalmıyor)", () => {
    expect(G).toContain("onCancel={() => { taslagiSil(); setShowNew(false); }}");
    expect(G).toMatch(/onCreated=\{\(id\) => \{ taslagiSil\(\);/);
  });

  it("taslak okunamazsa akış kırılmıyor (fail-safe)", () => {
    // Ozel pencere / site verisi kapali: taslak bir kolayliktir, sart degil.
    expect(G).toMatch(/catch\s*\{\s*return null;\s*\}/);
    expect(G).toContain("/* yoksayılır */");
  });

  it("boşta kalınca gereksiz yeniden yükleme yok", () => {
    /* Bağımlılık `user` NESNESİ değil KİMLİĞİ olmalı: jeton yenilenince
       aynı kullanıcı için yeni nesne üretilir ve etki boşuna koşardı. */
    expect(G, "hâlâ nesne kimliğine bağlı").not.toMatch(/if \(user\) loadCases\(\);\s*\n\s*\}, \[user\]\)/);
    expect(G).toContain("const oturumKullaniciId = user?.id;");
    expect(G).toMatch(/\}, \[oturumKullaniciId\]\)/);
  });

  it("açılır menülerin erişilebilir adı var", () => {
    expect(G, "ana tür menüsü adsız").toContain('aria-label="Ana uyuşmazlık türü"');
    expect(G, "alt uzmanlık menüsü adsız").toContain('aria-label="Alt uzmanlık alanı"');
  });

  it("menüler Radix — klavye gezinme hazır gelir", () => {
    const sel = readFileSync("src/components/ui/select.tsx", "utf-8");
    expect(sel).toContain('@radix-ui/react-select');
  });
});
