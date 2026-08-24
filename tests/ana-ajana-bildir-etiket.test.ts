import { describe, it, expect } from "vitest";
import { anaAjanaBildir } from "../supabase/functions/_shared/anlatim";

/* İŞ ETİKETİ SÜZGEÇTEN GEÇMEZ (24.08.2026 kusuru)
   `anaAjanaBildir` gerekçenin TAMAMINI ortak sınır süzgecinden geçiriyordu.
   Süzgeç eleyince yedek cümle ("Bu konuda size yazabileceğim bir şey
   bulamadım.") dönüyor ve metnin başındaki İŞ ETİKETİ de siliniyordu.
   CANLI KANIT (dosya e7e34dc3, 24.08 01:18): iki `otomatik_analiz` satırı da
   yalnız yedek cümleye inmiş, iş etiketi YOK.
   BEDELİ: `gorevEtiketiVarMi` "bu iş zaten açıldı mı" diye etiketi arar;
   etiket silinince bulamaz ve nöbetçi aynı görevi HER TURDA yeniden açabilir.
   Aynı çözüm 23.08'de `akis-yurut/hata-metni.ts`te uygulanmıştı; bu geçit
   atlanmıştı. */

/** `ajan_gorevleri` insert'ini yakalayan asgari sahte istemci. */
function sahteAdmin() {
  const yazilanlar: Record<string, unknown>[] = [];
  const admin = {
    from() {
      return {
        insert: async (govde: Record<string, unknown>) => {
          yazilanlar.push(govde);
          return { error: null };
        },
      };
    },
  };
  return { admin, yazilanlar };
}

const TEMEL = {
  case_id: "11111111-1111-1111-1111-111111111111",
  gorev_tipi: "otomatik_analiz",
  kaynak: "nobetci" as const,
};

/* Sınır katmanının elediği tipik cümle: içinde rakam var, "dosya/kayıt/belge"
   gibi bir dayanak kelimesi yok (dayanaksizRakamMi). Canlıda eleneni buydu. */
const ELENEN = "3 kalem 12500 TL tutarında eşleşti";
const GECEN = "dosyadaki belgelere göre eşleşme bulundu";

describe("anaAjanaBildir — iş etiketi hiçbir hâlde silinmez", () => {
  it("açıklama ELENSE BİLE iş etiketi gerekçede kalır", async () => {
    const { admin, yazilanlar } = sahteAdmin();
    const r = await anaAjanaBildir(admin, {
      ...TEMEL, gerekce: `[oto:hazirlik-foyu:oturum-1:taraf-1] ${ELENEN}`,
    });
    expect(r.yazildi).toBe(true);
    const gerekce = String(yazilanlar[0].gerekce);
    expect(gerekce).toContain("[oto:hazirlik-foyu:oturum-1:taraf-1]");
    expect(gerekce).toContain("[kaynak:nobetci]");
  });

  it("elenen açıklama SESSİZ DÜŞMEZ: hangi türün elediği yazılır", async () => {
    const { admin, yazilanlar } = sahteAdmin();
    await anaAjanaBildir(admin, {
      ...TEMEL, gerekce: `[oto:belge-ozeti:x] ${ELENEN}`,
    });
    const gerekce = String(yazilanlar[0].gerekce);
    expect(gerekce).toContain("sınır katmanı eledi");
    // Eski koru koru yedek cumle artik etiketi yutmuyor:
    expect(gerekce).not.toBe("Bu konuda size yazabileceğim bir şey bulamadım.");
  });

  it("elenen açıklamanın METNİ gerekçeye KONMAZ (süzgeç gevşetilmedi)", async () => {
    const { admin, yazilanlar } = sahteAdmin();
    await anaAjanaBildir(admin, { ...TEMEL, gerekce: `[oto:x] ${ELENEN}` });
    expect(String(yazilanlar[0].gerekce)).not.toContain(ELENEN);
  });

  it("süzgeçten geçen açıklama aynen korunur", async () => {
    const { admin, yazilanlar } = sahteAdmin();
    await anaAjanaBildir(admin, { ...TEMEL, gerekce: `[oto:y] ${GECEN}` });
    const gerekce = String(yazilanlar[0].gerekce);
    expect(gerekce).toContain("[oto:y]");
    expect(gerekce).toContain(GECEN);
    expect(gerekce).not.toContain("sınır katmanı eledi");
  });

  it("birden çok baştaki etiket korunur", async () => {
    const { admin, yazilanlar } = sahteAdmin();
    await anaAjanaBildir(admin, {
      ...TEMEL, gerekce: `[akis:olay-1:kural-1][alternatif:2] ${ELENEN}`,
    });
    const gerekce = String(yazilanlar[0].gerekce);
    expect(gerekce).toContain("[akis:olay-1:kural-1]");
    expect(gerekce).toContain("[alternatif:2]");
  });

  it("etiketsiz düz metin eskisi gibi süzgece tabidir", async () => {
    const { admin, yazilanlar } = sahteAdmin();
    await anaAjanaBildir(admin, { ...TEMEL, gerekce: ELENEN });
    const gerekce = String(yazilanlar[0].gerekce);
    expect(gerekce).toContain("sınır katmanı eledi");
    expect(gerekce).not.toContain(ELENEN);
  });
});
