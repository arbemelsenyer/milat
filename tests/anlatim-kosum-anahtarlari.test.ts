import { describe, it, expect } from "vitest";
import { anlatimAc } from "../supabase/functions/_shared/anlatim";

/* KOŞUMA AİT ANAHTAR TEZGÂHI (24.08.2026 kusuru)
   `yaz()` `last_output`'u BİLEREK birleştiriyor: aynı satıra başka fonksiyonlar
   da yazıyor (`masa-kalem-karsilastir` → `karsilastirma`). Ama birleştirme,
   koşumun KENDİ sonucunu da taşıyordu: yeni koşum `eksik` yazmayınca önceki
   koşumun `eksik`i sağ kalıyor, defter kendi içinde çelişiyordu.
   CANLI KANIT (dosya eb70595a, 23.08 21:55Z):
     yapildi = "Tıp Hukuku alanı için 1 aday çıkarıldı"   ← yeni
     eksik   = ["yeni aday kalmadı"]                      ← 21:51 koşumundan bayat
   Bu tezgâh iki şeyi birden sabitler: bayat anahtar DÜŞER, yabancı anahtar KALIR. */

type Satir = { id: string; last_output: Record<string, unknown>; status?: string };

/** Supabase istemcisinin bu dosyanın kullandığı kadarını taklit eder. */
function sahteAdmin(baslangic: Record<string, unknown>) {
  const satir: Satir = { id: "satir-1", last_output: { ...baslangic } };
  type Zincir = { eq: () => Zincir; is: () => Zincir; maybeSingle: () => Promise<unknown> };
  const zincir = (sonuc: unknown): Zincir => {
    const z: Zincir = {
      eq: () => z,
      is: () => z,
      maybeSingle: async () => sonuc,
    };
    return z;
  };
  const admin = {
    from(tablo: string) {
      if (tablo !== "agent_states") {
        // deneyimYaz / bellekYaz — bu tezgâhın konusu değil, sessizce başarılı.
        return {
          insert: async () => ({ error: null }),
          upsert: async () => ({ error: null }),
          select: () => zincir({ data: null }),
        };
      }
      return {
        select: () => zincir({ data: { id: satir.id, last_output: satir.last_output } }),
        update: (govde: { last_output: Record<string, unknown>; status: string }) => {
          satir.last_output = govde.last_output;
          satir.status = govde.status;
          return { eq: async () => ({ error: null }) };
        },
        insert: async (govde: { last_output: Record<string, unknown>; status: string }) => {
          satir.last_output = govde.last_output;
          satir.status = govde.status;
          return { error: null };
        },
      };
    },
  };
  return { admin, satir };
}

const SAHIP = { case_id: "dosya-1", agent_type: "mediator", party_id: null };

describe("anlatim — koşuma ait anahtarlar", () => {
  it("BAYAT 'eksik' düşer: eksiksiz biten koşum önceki koşumun eksiğini taşımaz", async () => {
    const { admin, satir } = sahteAdmin({ eksik: ["yeni aday kalmadı"], yapildi: "eski iş" });
    const a = anlatimAc(admin, SAHIP);
    await a.baslat("Tarıyorum.");
    await a.bitti({ yapildi: "1 aday çıkarıldı" });

    expect(satir.last_output.yapildi).toBe("1 aday çıkarıldı");
    expect(satir.last_output).not.toHaveProperty("eksik");
  });

  it("GERÇEK 'eksik' yazılır", async () => {
    const { admin, satir } = sahteAdmin({});
    const a = anlatimAc(admin, SAHIP);
    await a.baslat("Tarıyorum.");
    await a.bitti({ yapildi: "alan tarandı", eksik: "yeni aday kalmadı" });

    expect(satir.last_output.eksik).toEqual(["yeni aday kalmadı"]);
  });

  it("YABANCI anahtar KORUNUR: başka fonksiyonun yazdığı 'karsilastirma' silinmez", async () => {
    const karsilastirma = { ozet: "2 kalemin 2'si örtüşüyor" };
    const { admin, satir } = sahteAdmin({ karsilastirma, eksik: ["bayat"] });
    const a = anlatimAc(admin, SAHIP);
    await a.baslat("Tarıyorum.");
    await a.bitti({ yapildi: "iş bitti" });

    expect(satir.last_output.karsilastirma).toEqual(karsilastirma);
    expect(satir.last_output).not.toHaveProperty("eksik");
  });

  it("KOŞUM BAŞLARKEN önceki sonuç düşer — koşan ajan eski sonucu asılı tutmaz", async () => {
    const { admin, satir } = sahteAdmin({ yapildi: "eski iş", eksik: ["eski eksik"] });
    const a = anlatimAc(admin, SAHIP);
    await a.baslat("Başlıyorum.");

    expect(satir.status).toBe("running");
    expect(satir.last_output).not.toHaveProperty("yapildi");
    expect(satir.last_output).not.toHaveProperty("eksik");
  });

  it("HATA ile biten koşum önceki 'yapildi'yı bırakmaz — başarısız iş başarılı görünmez", async () => {
    const { admin, satir } = sahteAdmin({ yapildi: "eski iş", eksik: ["eski eksik"] });
    const a = anlatimAc(admin, SAHIP);
    await a.baslat("Başlıyorum.");
    await a.hata("iç çağrı HTTP 500 döndü");

    expect(satir.status).toBe("failed");
    expect(satir.last_output).not.toHaveProperty("yapildi");
    expect(satir.last_output).not.toHaveProperty("eksik");
  });

  it("adimlar her koşumda YENİDEN yazılır, eskiye eklenmez", async () => {
    const { admin, satir } = sahteAdmin({
      adimlar: [{ sira: 1, metin: "eski adım", zaman: "2026-08-23T21:51:38.000Z" }],
    });
    const a = anlatimAc(admin, SAHIP);
    await a.baslat("Yeni adım.");
    await a.bitti({ yapildi: "bitti" });

    const adimlar = satir.last_output.adimlar as Array<{ metin: string }>;
    expect(adimlar.some((x) => x.metin === "eski adım")).toBe(false);
    expect(adimlar[0].metin).toContain("Yeni adım");
  });
});
