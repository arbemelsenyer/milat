import { describe, it, expect } from "vitest";
import { anaAjanaBildir, eksigiSor, etiketleriAyir, etiketiKoruyarakSuz } from "../supabase/functions/_shared/anlatim";

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

/* KOL ETİKETİ — MOTOR KANUNU m.5'İN DAYANAĞI
   `eksigiSor` soru metnini süzgeçten geçiriyordu. `[kol:…]` etiketi mesajın
   İÇİNDE geliyor (`bilirkisi-sorulari:148`, `taraf-kalem-cikar:400`), yani
   metin elenirse etiket de silinirdi. O etiket cevap gelince hangi kolun
   uyanacağını söyler (`ajan-nobetci:1141` gerekçeden okur); silinirse
   cevaplanan soru HİÇBİR kolu uyandıramaz. */
describe("eksigiSor — kol etiketi süzgeçten sağ çıkar", () => {
  function sahteAdminSoru() {
    const yazilanlar: Record<string, unknown>[] = [];
    /* `eksigiSor` zinciri DOĞRUDAN await ediyor (`const { data } = await q`).
       Bu yüzden zincirin kendisi thenable olmalı; `limit` Promise dönerse
       sonraki `.is()` çağrısı Promise üzerinde aranır ve düşer. */
    type Zincir = {
      eq: () => Zincir; is: () => Zincir; limit: () => Zincir;
      then: (c: (v: { data: unknown[] }) => unknown) => Promise<unknown>;
    };
    const zincir = (): Zincir => {
      const z: Zincir = {
        eq: () => z, is: () => z, limit: () => z,
        then: (c) => Promise.resolve(c({ data: [] })),
      };
      return z;
    };
    const admin = {
      from() {
        return {
          select: () => zincir(),
          insert: async (g: Record<string, unknown>) => { yazilanlar.push(g); return { error: null }; },
        };
      },
    };
    return { admin, yazilanlar };
  }

  it("soru metni ELENSE BİLE [kol:…] gerekçede kalır", async () => {
    const { admin, yazilanlar } = sahteAdminSoru();
    const r = await eksigiSor(admin, {
      case_id: "11111111-1111-1111-1111-111111111111",
      hedef: "arabulucu",
      gorev_tipi: "arabulucu_sorusu",
      mesaj: "[kol:taraf-kalem-cikar] 3 kalem 12500 TL tutarında eşleşti",
      etiket: "kalem:kira-farki",
    });
    expect(r.yazildi).toBe(true);
    const gerekce = String(yazilanlar[0].gerekce);
    expect(gerekce).toContain("[kol:taraf-kalem-cikar]");
    expect(gerekce).toContain("[eksik:kalem:kira-farki]");
    // Suzgec gevsetilmedi: elenen metnin kendisi KONMAZ.
    expect(gerekce).not.toContain("12500");
  });

  it("nöbetçinin okuduğu desen gerekçede bulunur", async () => {
    const { admin, yazilanlar } = sahteAdminSoru();
    await eksigiSor(admin, {
      case_id: "11111111-1111-1111-1111-111111111111",
      hedef: "arabulucu",
      gorev_tipi: "arabulucu_sorusu",
      mesaj: "[kol:bilirkisi-sorulari] 4 ayrı 900 sayısı",
      etiket: "bilirkisi:onay",
    });
    // ajan-nobetci/index.ts:1141 ile AYNI desen.
    const kol = /\[kol:([a-z0-9-]+)\]/i.exec(String(yazilanlar[0].gerekce));
    expect(kol?.[1]).toBe("bilirkisi-sorulari");
  });
});

describe("etiketleriAyir — sınırlar", () => {
  it("baştaki etiket grupları ayrılır, gövde kalır", () => {
    const r = etiketleriAyir("[a:1][b:2] serbest metin");
    expect(r.etiketler).toBe("[a:1][b:2]");
    expect(r.govde).toBe("serbest metin");
  });

  it("ORTADAKİ köşeli parantez etiket sayılmaz", () => {
    const r = etiketleriAyir("metin [a:1] devam");
    expect(r.etiketler).toBe("");
    expect(r.govde).toBe("metin [a:1] devam");
  });

  it("yalnız etiketten oluşan metin gövdesiz döner", () => {
    expect(etiketiKoruyarakSuz("[a:1]", "t")).toBe("[a:1]");
  });

  it("etiketsiz güvenli metin aynen geçer", () => {
    expect(etiketiKoruyarakSuz("dosyadaki belgeye göre eşleşme var", "t"))
      .toBe("dosyadaki belgeye göre eşleşme var");
  });
});
