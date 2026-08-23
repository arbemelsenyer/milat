import { describe, it, expect } from "vitest";
import { girdiTamamla } from "../supabase/functions/_shared/anlatim";

/* GİRDİ TAMAMLAMA — TARAF FAN-OUT'U EKSİK ALANI ÖRTMEZ (24.08.2026 kusuru)
   `girdiTamamla` party_id'yi dosyanın taraflarından tamamlarken ERKEN DÖNÜYOR
   ve sondaki "zorunlu alan hâlâ eksik mi" denetimi ATLANIYORDU. Sonuç: oturum
   bulunamadığı hâlde iş kuruluyor, koşucu adımı eksik gövdeyle çağırıyor ve
   adım 400 dönüyordu.
   CANLI KANIT (dosya eb70595a, 19.08 08:27Z):
     [akis:65a31953…:oturum_planlandi__foy_hazirla] hazirlik-foyu çalıştırılamadı:
     HTTP 400: {"error":"case_id, session_id ve party_id gerekli"}
   Bu tezgâh iki yönü birden sabitler: eksik alan varken İŞ KURULMAZ, alanların
   hepsi tamamsa taraf başına AYRI koşum kurulmaya DEVAM EDER. */

/** Supabase istemcisinin `girdiTamamla`nın kullandığı kadarını taklit eder. */
function sahteAdmin(veri: { oturumlar?: unknown[]; taraflar?: unknown[] }) {
  const yazilanlar: Record<string, unknown>[] = [];
  type Zincir = {
    eq: () => Zincir;
    order: () => Zincir;
    limit: () => Promise<{ data: unknown }>;
    maybeSingle: () => Promise<{ data: null }>;
  };
  const sonuc = (data: unknown): Zincir => {
    const z: Zincir = {
      eq: () => z,
      order: () => z,
      limit: async () => ({ data }),
      maybeSingle: async () => ({ data: null }),
    };
    return z;
  };
  const admin = {
    from(tablo: string) {
      if (tablo === "case_sessions") return { select: () => sonuc(veri.oturumlar ?? []) };
      if (tablo === "case_parties") return { select: () => sonuc(veri.taraflar ?? []) };
      // ajan_deneyim (deneyimYaz / yolGecmisi) — bu tezgâhın konusu değil.
      return {
        select: () => sonuc([]),
        insert: async (govde: Record<string, unknown>) => { yazilanlar.push(govde); return { error: null }; },
      };
    },
  };
  return { admin, yazilanlar };
}

const DOSYA = "11111111-1111-1111-1111-111111111111";
const TARAF_A = "22222222-2222-2222-2222-222222222222";
const TARAF_B = "33333333-3333-3333-3333-333333333333";

describe("girdiTamamla — taraf fan-out'u eksik alanı örtmez", () => {
  it("OTURUM YOKKEN iş kurulmaz: taraf bulunsa bile gövde üretilmez", async () => {
    const { admin } = sahteAdmin({
      oturumlar: [],                                   // dosyada hiç oturum yok
      taraflar: [{ id: TARAF_A }, { id: TARAF_B }],    // ama iki taraf var
    });
    const r = await girdiTamamla(admin, "hazirlik-foyu", { case_id: DOSYA });
    expect(r.govdeler).toHaveLength(0);
    expect(r.eksik).toContain("session_id");
  });

  it("OTURUM VARKEN taraf başına ayrı koşum kurulur ve session_id her gövdede olur", async () => {
    const ileri = new Date(Date.now() + 86_400_000).toISOString();
    const { admin } = sahteAdmin({
      oturumlar: [{ id: "oturum-1", scheduled_at: ileri, status: "scheduled" }],
      taraflar: [{ id: TARAF_A }, { id: TARAF_B }],
    });
    const r = await girdiTamamla(admin, "hazirlik-foyu", { case_id: DOSYA });
    expect(r.govdeler).toHaveLength(2);
    expect(r.govdeler.map((g) => g.party_id)).toEqual([TARAF_A, TARAF_B]);
    for (const g of r.govdeler) expect(g.session_id).toBe("oturum-1");
    expect(r.eksik).toHaveLength(0);
  });

  it("TARAF YOKKEN iş kurulmaz — eski davranış korunur", async () => {
    const ileri = new Date(Date.now() + 86_400_000).toISOString();
    const { admin } = sahteAdmin({
      oturumlar: [{ id: "oturum-1", scheduled_at: ileri, status: "scheduled" }],
      taraflar: [],
    });
    const r = await girdiTamamla(admin, "hazirlik-foyu", { case_id: DOSYA });
    expect(r.govdeler).toHaveLength(0);
    expect(r.eksik).toContain("taraf");
  });
});

/* ZORUNLU_GIRDI SÖZLEŞMESİ TAM MI (24.08.2026 · gizli kusur)
   `classify-dispute`, `detect-legal-deadlines` ve `analyze-meeting-notes`
   MOTORA_BAGLI listesindeydi ama ZORUNLU_GIRDI'de tanımı YOKTU; varsayılan
   ["case_id"] uygulanıyordu. Kendi kapıları daha fazlasını istiyor:
     classify-dispute        → metin 5 karakterden kısaysa 400 ("Metin çok kısa")
     detect-legal-deadlines  → 400 "case_id ve dispute_type gerekli"
     analyze-meeting-notes   → 400 "newNote required"
   Yani bu kollara bir akış kuralı yazıldığı an koşucu eksik gövdeyle çağırıp
   400 alacaktı. Bu tezgâh sözleşmenin tam kalmasını sabitler. */
describe("girdiTamamla — ZORUNLU_GIRDI sözleşmesi tam", () => {
  const kollar: [string, string][] = [
    ["classify-dispute", "text"],
    ["detect-legal-deadlines", "dispute_type"],
    ["analyze-meeting-notes", "newNote"],
  ];

  for (const [kol, alan] of kollar) {
    it(`${kol}: '${alan}' gelmezse iş KURULMAZ, eksik bildirilir`, async () => {
      const { admin } = sahteAdmin({ taraflar: [{ id: TARAF_A }] });
      const r = await girdiTamamla(admin, kol, { case_id: DOSYA });
      expect(r.govdeler).toHaveLength(0);
      expect(r.eksik).toContain(alan);
    });

    it(`${kol}: '${alan}' olayın verisiyle gelirse iş kurulur`, async () => {
      const { admin } = sahteAdmin({ taraflar: [{ id: TARAF_A }] });
      const r = await girdiTamamla(admin, kol, { case_id: DOSYA, [alan]: "yeterince uzun bir metin" });
      expect(r.govdeler).toHaveLength(1);
      expect(r.govdeler[0][alan]).toBe("yeterince uzun bir metin");
      expect(r.eksik).toHaveLength(0);
    });
  }
});
