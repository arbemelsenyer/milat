import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";
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
      const kaynak = kaynakOku(yol);
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
      const kaynak = kaynakOku(yol);
      expect(kaynak, `${yol} ortak modülü içe aktarmıyor`)
        .toMatch(/from "@\/lib\/kayitProtokolu"/);
    }
  });

  it("harici araç yasağı cümlesi hiçbir yüzeye ELLE yazılmamış", () => {
    for (const yol of YUZEYLER) {
      const kaynak = kaynakOku(yol);
      expect(kaynak, `${yol} yasak cümlesini kendi içinde taşıyor`)
        .not.toContain("Harici araçlarla");
    }
  });

  it("süre ekran metnine ELLE yazılmaz: sabitten türetilir", () => {
    const kaynak = kaynakOku("src/pages/MediationEngine.tsx");
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

  it("ONAY METNİNDE SAKLAMA SÜRESİ SABİTİ YOK", () => {
    /* 29.08.2026 KUSURU: onay metni "Ses kaydı, süreç bitiminden **24 saat
       sonra** kalıcı olarak silinir" diyordu. Yanlıştı — ses metne çevrildiği
       AN siliniyor (H-14 şart 1; canlı tabloda `oturum_kaydi_ses` 0 gün /
       oluşturma). Üstelik bu 24 saatlik sabit 27.08'de HAT H-18 ile
       `ajan-nobetci`den bilerek KALDIRILMIŞTI: arka kapı kapanmış, ONAY METNİ
       eski sözle kalmıştı. Aynı ürün aynı kişiye iki çelişik şey söylüyordu —
       `kvkk-metinleri.ts` doğrusunu, bu metin yanlışını.

       Bir onay metnindeki yanlış saklama sözü, ekran etiketinden ağırdır:
       taraf kayda ONA GÜVENEREK razı oluyor. Saklama süresi tek yerde
       (`saklama_sureleri`) durur ve tarafa "Verilerim" sayfasında gösterilir;
       buraya bir daha SAYI yazılmaz.

       48 saatlik planlama süresi bunun dışındadır: o bir saklama süresi değil,
       usul kuralıdır ve zaten `KAYIT_ONAY_SAAT` tek kaynağından gelir. */
    const sureIfadeleri = [...KAYIT_ONAY_METNI.matchAll(/([0-9]+)\s*(saat|gün|yıl|ay)/g)];
    const saklamaSabitleri = sureIfadeleri
      .map((m) => m[0])
      .filter((v) => v !== `${KAYIT_ONAY_SAAT} saat`);
    expect(saklamaSabitleri, `onay metninde saklama süresi sabiti: ${saklamaSabitleri.join(", ")}`)
      .toEqual([]);
    // Doğru söz yazılı olmalı: ses metne çevrilince gider.
    expect(KAYIT_ONAY_METNI).toContain("metne çevrildiği an");
  });

  it("METİN DEĞİŞİRSE SÜRÜM DE DEĞİŞİR (parmak izi kilidi)", () => {
    /* Dosyanın kendi başlığı "metinler değişirse BU DEĞER DE değişmelidir"
       diyordu ama bunu hiçbir şey DENETLEMİYORDU — 29.08'de silme sözü
       düzeltilirken sürüm elle yükseltildi; bir dahakine unutulabilirdi.
       Onay kaydı kalıcıdır ve "hangi metnin hangi sürümü" bilgisini taşır
       (HAT H-15 · 2. madde); metni sürüm yükseltmeden değiştirmek, geçmişte
       v1'e verilmiş onayı yeni metne verilmiş gibi gösterir — yani onay
       kaydının TEK işini bozar.

       Parmak izi: metin değişince bu sayı değişir ve tezgâh kırmızı yanar.
       O zaman yapılacak iş SÜRÜMÜ YÜKSELTMEK ve buradaki iki değeri birlikte
       güncellemektir. */
    let iz = 0;
    for (let i = 0; i < KAYIT_ONAY_METNI.length; i++) {
      iz = (iz * 31 + KAYIT_ONAY_METNI.charCodeAt(i)) % 1_000_000_007;
    }
    const BEKLENEN = { surum: "v2", iz: 974_692_184 };
    expect(
      { surum: KAYIT_ONAY_SURUMU, iz },
      "onay metni değişmiş: KAYIT_ONAY_SURUMU'nu yükselt ve buradaki parmak izini güncelle",
    ).toEqual(BEKLENEN);
  });
});
