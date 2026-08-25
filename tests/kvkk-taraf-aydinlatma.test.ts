import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* KVKK AYDINLATMASI TARAF EKRANINDA — mimari §15.2 (25.08.2026)

   §15.2 Aşama 1 kapanış şartlarından biri: "Aydınlatma metni TARAF KAYIT
   EKRANINDA gösteriliyor." 25.08'e kadar sağlanmıyordu: tarafın gördüğü tek
   yüzey `/katilim/:token` (`KatilimCevap.tsx`) ve orada KVKK'ya dair **tek
   satır yoktu**. Metin yalnız arabulucunun gördüğü `Auth.tsx` içine gömülüydü.

   İKİNCİ KOPYA YASAK: hukuki metin iki yüzeyde iki farklı hâlde bulunursa
   hangisinin geçerli olduğu sorusu doğar. İkisi de `@/lib/kvkk-metinleri`den
   okur; bu tezgâh gömülü kopya sızmasını da engeller. */

const oku = (yol: string) => readFileSync(yol, "utf-8");
const KAYNAK = "src/lib/kvkk-metinleri.ts";
const TARAF = "src/pages/KatilimCevap.tsx";
const ARABULUCU = "src/pages/Auth.tsx";

describe("KVKK aydınlatması taraf ekranında da gösteriliyor", () => {
  it("tek kaynak dosyası üç metni de taşıyor", () => {
    const g = oku(KAYNAK);
    for (const sabit of ["KVKK_AYDINLATMA", "KVKK_IMHA", "KVKK_ACIK_RIZA"]) {
      expect(g, `${sabit} yok`).toContain(`export const ${sabit}`);
    }
    // Metnin kendisi burada durmalı, başka yerde değil.
    expect(g).toContain("Medipact AI, arabuluculuk süreçlerindeki verilerin gizliliğini");
  });

  it("taraf katılım ekranı aydınlatmayı KARARDAN ÖNCE gösteriyor", () => {
    const g = oku(TARAF);
    expect(g, "kaynak içe aktarılmıyor").toContain('from "@/lib/kvkk-metinleri"');
    expect(g, "aydınlatma başlığı gösterilmiyor").toContain("KVKK_AYDINLATMA.baslik");
    expect(g, "aydınlatma gövdesi gösterilmiyor").toContain("KVKK_AYDINLATMA.govde");
    // Metin, katılım düğmelerinden ÖNCE gelmeli: taraf karar vermeden görsün.
    const kvkkIdx = g.indexOf("KVKK_AYDINLATMA.baslik");
    const katilIdx = g.indexOf('cevapla("katiliyor")');
    expect(kvkkIdx, "aydınlatma yok").toBeGreaterThan(-1);
    expect(katilIdx, "katılım düğmesi yok").toBeGreaterThan(-1);
    expect(katilIdx, "aydınlatma katılım düğmesinden SONRA geliyor").toBeGreaterThan(kvkkIdx);
  });

  it("arabulucu ekranı da aynı kaynaktan okuyor (ikinci kopya yok)", () => {
    const g = oku(ARABULUCU);
    expect(g, "kaynak içe aktarılmıyor").toContain("@/lib/kvkk-metinleri");
    expect(g).toContain("KVKK_AYDINLATMA.govde");
  });

  it("hiçbir yüzeyde gömülü metin kopyası kalmadı", () => {
    // Metnin ayirt edici bir parcasi YALNIZ kaynak dosyada gecmeli.
    const IMZA = "Google Gemini API";
    for (const yol of [TARAF, ARABULUCU]) {
      expect(oku(yol), `${yol} içinde gömülü metin kopyası var`).not.toContain(IMZA);
    }
    expect(oku(KAYNAK), "imza kaynakta yok — tezgâh yanlış şeyi arıyor").toContain(IMZA);
  });
});
