import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  KAYIT_ONAY_SAAT, KAYIT_ONAY_SURUMU, KAYIT_TEK_KAPI_UYARISI, KAYIT_ONAY_METNI,
} from "../src/lib/kayitProtokolu";

/* KAYIT PROTOKOLÜ TEK KAYNAK TEZGÂHI (B18 · 24.08.2026 kusuru)
   Kayıt onayı iki ekranda birden görünür: arabulucunun protokol kartı
   (`MediationEngine`) ve tarafın onay kartı (`CaseRoom`). `KAYIT_ONAY_SAAT`,
   `KAYIT_ONAY_SURUMU` ve harici araç yasağı cümlesi İKİ DOSYADA AYRI AYRI
   gömülüydü. O gün birebir aynılardı; ama biri değişince öteki sessizce eski
   kalırdı. Sürüm sapması en tehlikelisi: taraf "v1" onayı verirken arabulucu
   "v2" yazsa, kayıtta hangi metne onay verildiği belirsizleşirdi.
   Bu tezgâh ikizlenmenin geri gelmesini engeller. */

const YUZEYLER = [
  "src/pages/MediationEngine.tsx",
  "src/pages/CaseRoom.tsx",
] as const;

describe("kayıt protokolü — iki yüzey tek kaynaktan okur", () => {
  it("hiçbir yüzey sabitleri kendi içinde yeniden TANIMLAMAZ", () => {
    for (const yol of YUZEYLER) {
      const kaynak = readFileSync(yol, "utf-8");
      for (const ad of ["KAYIT_ONAY_SAAT", "KAYIT_ONAY_SURUMU", "KAYIT_TEK_KAPI_UYARISI", "KAYIT_ONAY_METNI"]) {
        /* Düz metin araması: şablon dizesinde `\s` kaçış olarak yeniyor ve
           desen sessizce `consts+...` oluyor — bu tezgâh ilk yazımında tam
           bu yüzden kusuru kaçırdı. Kesin dizeyle aranıyor. */
        for (const kalip of [`const ${ad} =`, `const ${ad}=`]) {
          expect(kaynak.includes(kalip), `${yol} içinde '${kalip}' var — sabit yeniden tanımlanmış`)
            .toBe(false);
        }
      }
    }
  });

  it("her yüzey sabitleri ortak modülden içe aktarır", () => {
    for (const yol of YUZEYLER) {
      const kaynak = readFileSync(yol, "utf-8");
      expect(kaynak, `${yol} ortak modülü içe aktarmıyor`)
        .toMatch(/from "@\/lib\/kayitProtokolu"/);
    }
  });

  it("harici araç yasağı cümlesi hiçbir yüzeye ELLE yazılmamış", () => {
    for (const yol of YUZEYLER) {
      const kaynak = readFileSync(yol, "utf-8");
      expect(kaynak, `${yol} yasak cümlesini kendi içinde taşıyor`)
        .not.toContain("Harici araçlarla");
    }
  });

  it("süre ekran metnine ELLE yazılmaz: sabitten türetilir", () => {
    const kaynak = readFileSync("src/pages/MediationEngine.tsx", "utf-8");
    // Yorum satırları hariç, kullanıcıya gösterilen hiçbir yerde çıplak sayı olmamalı.
    const govde = kaynak.split("\n").filter((l) => !l.trim().startsWith("·") && !l.trim().startsWith("*")).join("\n");
    expect(govde).not.toContain(`${KAYIT_ONAY_SAAT} saatlik süre`);
    expect(govde).not.toContain(`${KAYIT_ONAY_SAAT} saat doldu`);
  });

  it("onay metni yasak cümlesini ve süreyi tek kaynaktan taşır", () => {
    expect(KAYIT_ONAY_METNI).toContain(KAYIT_TEK_KAPI_UYARISI);
    expect(KAYIT_ONAY_METNI).toContain(`en erken ${KAYIT_ONAY_SAAT} saat sonrası`);
  });

  it("metin sürümü tek değerdir ve boş değildir", () => {
    expect(KAYIT_ONAY_SURUMU).toBeTruthy();
    expect(typeof KAYIT_ONAY_SAAT).toBe("number");
  });
});
