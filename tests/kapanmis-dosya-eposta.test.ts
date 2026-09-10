import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";
import { anaAjanaBildir } from "../supabase/functions/_shared/anlatim";
import {
  dosyaKapali, acikDosyalar, KAPALI_STATUSLER,
  HATIRLATMA_UST_SINIRI, hatirlatmaHakkiVar, HATIRLATMA_TUKENDI_DAMGASI,
} from "../supabase/functions/_shared/dosya-kapanis-kapisi";

/* KAPANMIŞ DOSYADAN E-POSTA ÇIKMAZ — ISIRMA SINAVI (HAT H-31, P0)
 *
 * CANLI KANIT (06.09.2026): kurucunun posta kutusu MediPact hatırlatmalarıyla
 * doldu. Gönderen `info@milatmediation.com`, konu "Dosyanızda bekleyen bir konu
 * var", alıcılar `+test1` · `+test2` · kurucunun kendi adresi. Dört dosyanın
 * dördü de 05.09'da KAPANMIŞTI; `otomatik_akis` açık kaldığı için nöbetçi
 * onları her turda canlı dosya sandı. En eski soru 19.08 tarihliydi — 18 gün
 * boyunca taraflara e-posta gitti, bazı sorular 9. hatırlatmaya ulaşmıştı.
 *
 * İKİNCİ KUSUR (aynı kök): görevi AÇAN kollar kapanışa hiç bakmıyordu, yalnız
 * YÜRÜTEN bakıyordu. `MP-2026-1019` dosyasında 4.841 satırlık boşa dönen görev
 * çarkı doğdu.
 *
 * BU TEZGÂH ÜÇ ŞEYİ TUTAR:
 *   1. Kapanış tanımı TEK YERDE ve doğru (davranış sınavı, gerçek modül koşar).
 *   2. Nöbetçi kolları kapanmış dosyada koşmuyor (kaynak sınavı).
 *   3. Hatırlatma üst sınırı var ve tek yerden okunuyor (davranış + kaynak).
 * Bekçi düşerse kırmızı yanar.
 */

const NOBETCI = kaynakOku("supabase/functions/ajan-nobetci/index.ts");
const ANLATIM = kaynakOku("supabase/functions/_shared/anlatim.ts");

describe("kapanış kapısı — tek kaynak, doğru tanım", () => {
  it("`closed_at` dolu dosya kapalıdır (status boş olsa bile)", () => {
    expect(dosyaKapali({ status: null, closed_at: "2026-09-05T10:00:00Z" })).toBe(true);
  });

  it("kapanış statülerinin üçü de kapalı sayılır", () => {
    for (const s of KAPALI_STATUSLER) {
      expect(dosyaKapali({ status: s, closed_at: null }), `${s} kapalı sayılmadı`).toBe(true);
    }
  });

  it("`agreed` · `failed` · `closed` üçü de listededir", () => {
    expect(KAPALI_STATUSLER).toContain("agreed");
    expect(KAPALI_STATUSLER).toContain("failed");
    expect(KAPALI_STATUSLER).toContain("closed");
  });

  it("açık dosya kapalı sayılmaz — `active` ve boş status tura girer", () => {
    expect(dosyaKapali({ status: "active", closed_at: null })).toBe(false);
    expect(dosyaKapali({ status: null, closed_at: null })).toBe(false);
    expect(dosyaKapali(null)).toBe(false);
  });

  it("`acikDosyalar` kapanmışları ayıklar, açıkları bırakır", () => {
    const liste = [
      { id: "a", status: "active", closed_at: null },
      { id: "b", status: "agreed", closed_at: null },
      { id: "c", status: null, closed_at: "2026-09-05T10:00:00Z" },
      { id: "d", status: null, closed_at: null },
    ];
    expect(acikDosyalar(liste).map((d) => d.id)).toEqual(["a", "d"]);
  });
});

describe("hatırlatma üst sınırı — soru sonsuza kadar hatırlatılmaz", () => {
  it("üst sınır kurucu kararıyla 3'tür (HAT H-31 · CEVAP 07.09.2026)", () => {
    expect(HATIRLATMA_UST_SINIRI).toBe(3);
  });

  it("3. hatırlatmadan sonra hak biter", () => {
    expect(hatirlatmaHakkiVar(0)).toBe(true);
    expect(hatirlatmaHakkiVar(2)).toBe(true);
    expect(hatirlatmaHakkiVar(3)).toBe(false);
    expect(hatirlatmaHakkiVar(9)).toBe(false);   // canlıda görülen sayı
  });

  it("nöbetçi sayıyı kendi yazmaz, ortak modülden okur", () => {
    expect(NOBETCI).toContain("hatirlatmaHakkiVar");
    expect(NOBETCI).toContain("HATIRLATMA_UST_SINIRI");
    // Sayı koda gömülmüş olmamalı: "üst sınır 3" gibi bir sabit tanımı yok.
    expect(NOBETCI, "üst sınır nöbetçide ikinci kez tanımlanmış")
      .not.toMatch(/const\s+HATIRLATMA_UST_SINIRI\s*=/);
  });

  it("sınıra dayanan soru silinmez, 'cevapsız kaldı' damgası alır", () => {
    expect(HATIRLATMA_TUKENDI_DAMGASI).toContain("cevapsız kaldı");
    expect(NOBETCI).toContain("HATIRLATMA_TUKENDI_DAMGASI");
  });
});

describe("nöbetçi — kapanmış dosyada kollar koşmaz", () => {
  it("kapanış tanımını KENDİ yazmaz, ortak kapıdan okur", () => {
    expect(NOBETCI).toContain('from "../_shared/dosya-kapanis-kapisi.ts"');
    // Eski elle yazılmış tanımların hiçbiri kalmamalı.
    expect(NOBETCI, "eski elle yazılmış kapanış tanımı duruyor")
      .not.toContain('dosya?.status === "agreed" || dosya?.status === "failed"');
    expect(NOBETCI, "eski elle yazılmış kapanış tanımı duruyor")
      .not.toContain('String(dosya?.status ?? "") === "closed"');
  });

  it("tur döngüsünde kapanış kapısı var", () => {
    expect(NOBETCI).toContain("const buDosyaKapali = dosyaKapali(dosya);");
    expect(NOBETCI).toContain("if (!buDosyaKapali) {");
  });

  it("e-posta gönderen hatırlatma kolu kapının İÇİNDE kalır", () => {
    const kapiBas = NOBETCI.indexOf("const buDosyaKapali = dosyaKapali(dosya);");
    expect(kapiBas, "kapı bulunamadı — tezgâh güncellenmeli").toBeGreaterThan(-1);
    const soruKol = NOBETCI.indexOf("await soruHatirlatmaKollari(admin, dosya, taraflar)", kapiBas);
    expect(soruKol, "soruHatirlatmaKollari çağrısı bulunamadı").toBeGreaterThan(kapiBas);
    // Kapının kapandığı satır, soru kolundan SONRA gelmeli.
    const kapiKapanis = NOBETCI.indexOf("← kapanış kapısı: yukarıdaki kolların hepsi", kapiBas);
    expect(kapiKapanis, "soru hatırlatma kolu kapının dışında kalmış").toBeGreaterThan(soruKol);
  });

  it("randevu/analiz görevi açan kollar da kapının içindedir", () => {
    const kapiBas = NOBETCI.indexOf("const buDosyaKapali = dosyaKapali(dosya);");
    const kapiKapanis = NOBETCI.indexOf("← kapanış kapısı: yukarıdaki kolların hepsi", kapiBas);
    const arasi = NOBETCI.slice(kapiBas, kapiKapanis);
    expect(arasi).toContain("await randevuGoreviAc(admin, dosya)");
    expect(arasi).toContain("await analizGoreviAc(admin, dosya)");
    expect(arasi).toContain("await ilkTemasGorevleriAc(admin, dosya, taraflar)");
  });

  it("C4 kapanış hatırlatması kapının bilinçli istisnasıdır", () => {
    // Kapanmış dosyada kapanış adımlarını hatırlatan kol susturulmamalı.
    expect(NOBETCI).toContain("kapanistaIzinli: true");
  });
});

describe("görev AÇAN yol da kapıya bakar (ikinci kusur)", () => {
  it("görev yazımının tek geçidi kapanış kapısını okur", () => {
    expect(ANLATIM).toContain('from "./dosya-kapanis-kapisi.ts"');
    expect(ANLATIM).toContain("kapanistaIzinli");
    expect(ANLATIM).toContain("dosya kapandı — görev açılmadı");
  });

  it("geçit kapanışı `cases` satırından okur — tahmin etmez", () => {
    const bas = ANLATIM.indexOf("export async function anaAjanaBildir");
    expect(bas).toBeGreaterThan(-1);
    const govde = ANLATIM.slice(bas, bas + 4000);
    expect(govde).toContain('.select("status, closed_at")');
    expect(govde).toContain("dosyaKapali(");
  });

  it("kapı FAIL-OPEN'dır: sorgu hatası bütün görev yazımını susturmaz", () => {
    const bas = ANLATIM.indexOf("export async function anaAjanaBildir");
    const govde = ANLATIM.slice(bas, bas + 4000);
    expect(govde).toContain("FAIL-OPEN");
    // Hata dalı `return` etmemeli — yalnız loglayıp devam etmeli.
    expect(govde).toContain("kapanış kapısı okunamadı");
  });
});

/* ── ISIRMA SINAVI: GÖREV GERÇEKTEN YAZILMIYOR ────────────────────────────────
   Yukarıdaki kaynak sınavları kapının YERİNDE olduğunu söyler. Bu bölüm
   kapının GERÇEKTEN ısırdığını, sahte istemciyle çalıştırarak gösterir. */
function sahteAdmin(dosya: { status?: string | null; closed_at?: string | null }) {
  const yazilanlar: Record<string, unknown>[] = [];
  const admin = {
    from(tablo: string) {
      if (tablo === "cases") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: dosya, error: null }) }) }),
        } as any;
      }
      return {
        insert: async (govde: Record<string, unknown>) => { yazilanlar.push(govde); return { error: null }; },
      } as any;
    },
  };
  return { admin, yazilanlar };
}

const GOREV = {
  case_id: "22222222-2222-2222-2222-222222222222",
  gorev_tipi: "randevu_teklifi",
  gerekce: "[oto:randevu] dosyadaki kayitlara gore oturum onerilecek",
  kaynak: "nobetci" as const,
};

describe("ısırma sınavı — kapanmış dosyaya görev YAZILMIYOR", () => {
  it("kapanmış dosyada tek satır bile yazılmaz", async () => {
    const { admin, yazilanlar } = sahteAdmin({ status: "agreed", closed_at: null });
    const r = await anaAjanaBildir(admin, GOREV);
    expect(r.yazildi).toBe(false);
    expect(r.sebep).toContain("dosya kapandı");
    expect(yazilanlar.length, "kapanmış dosyaya görev yazıldı").toBe(0);
  });

  it("`closed_at` dolu dosyada da yazılmaz (status boş olsa bile)", async () => {
    const { admin, yazilanlar } = sahteAdmin({ status: null, closed_at: "2026-09-05T10:00:00Z" });
    const r = await anaAjanaBildir(admin, GOREV);
    expect(r.yazildi).toBe(false);
    expect(yazilanlar.length).toBe(0);
  });

  it("AÇIK dosyada davranış DEĞİŞMEDİ — görev eskisi gibi yazılır", async () => {
    const { admin, yazilanlar } = sahteAdmin({ status: "active", closed_at: null });
    const r = await anaAjanaBildir(admin, GOREV);
    expect(r.yazildi).toBe(true);
    expect(yazilanlar.length).toBe(1);
    expect(String(yazilanlar[0].gerekce)).toContain("[oto:randevu]");
  });

  it("kapanış kolu istisnası kapanmış dosyada da yazabilir", async () => {
    const { admin, yazilanlar } = sahteAdmin({ status: "agreed", closed_at: null });
    const r = await anaAjanaBildir(admin, { ...GOREV, gorev_tipi: "arabulucu_onayi", kapanistaIzinli: true });
    expect(r.yazildi).toBe(true);
    expect(yazilanlar.length).toBe(1);
  });

  it("FAIL-OPEN: dosya okunamazsa görev yazımı susmaz", async () => {
    const yazilanlar: Record<string, unknown>[] = [];
    const admin = {
      from(tablo: string) {
        if (tablo === "cases") {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: "baglanti koptu" } }) }) }) } as any;
        }
        return { insert: async (g: Record<string, unknown>) => { yazilanlar.push(g); return { error: null }; } } as any;
      },
    };
    const r = await anaAjanaBildir(admin, GOREV);
    expect(r.yazildi, "kapı arızası bütün görev yazımını susturdu").toBe(true);
    expect(yazilanlar.length).toBe(1);
  });
});
