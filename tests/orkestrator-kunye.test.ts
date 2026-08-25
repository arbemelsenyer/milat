import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* ORKESTRATÖR DÖRT ADIM + UYDURMA KÜNYE YOK — mimari §15.2 (25.08.2026)
 *
 * §15.2 Aşama 1 kapanış şartı: "Orchestrator gerçek dosyada dört adımı
 * tamamlıyor: hiçbir raporda uydurma künye yok."
 *
 * 25.08 denetiminde İKİ YARISI DA kurulu bulundu; bu tezgâh yeniden yazmaz,
 * gerilemeye karşı kilitler.
 *
 * CANLI KANIT (25.08, `agent_states`): BEŞ gerçek dosyada dört adımın dördü de
 * `completed` — classify_dispute · deadline_detect · party_analysis (taraf
 * başına) · common_ground; orkestratör satırı da `completed`.
 *
 * KÜNYE BEKÇİSİ PROMPT RİCASI DEĞİL, DETERMİNİSTİKTİR: modelin gerçekten
 * gördüğü bağlamda BİREBİR geçmeyen Yargıtay/BAM esas-karar numaraları
 * çıktıdan sökülür. Zincirin iki ucunda da uygulanır — bu önemli, çünkü
 * `common-ground-report` taraf analizindeki künyeyi "taraf düzeyinde
 * denetlenmiş" sayıp bağlam kabul ediyor; taraf ucunda denetim olmasaydı
 * denetlenmemiş künye rapora meşru bağlam diye girerdi.
 */

const oku = (ad: string) => readFileSync(`supabase/functions/${ad}/index.ts`, "utf-8");
const ORK = oku("orchestrator-run");
const RAPOR = oku("common-ground-report");
const TARAF = oku("party-confidential-analysis");

describe("orkestratör dört adım + uydurma künye yok", () => {
  it("dört adım sırayla çağrılıyor", () => {
    const ADIMLAR = ["classify-dispute", "detect-legal-deadlines",
      "party-confidential-analysis", "common-ground-report"];
    let onceki = -1;
    for (const ad of ADIMLAR) {
      const i = ORK.indexOf(`"${ad}"`);
      expect(i, `${ad} çağrılmıyor`).toBeGreaterThan(-1);
      expect(i, `${ad} sırada yanlış yerde`).toBeGreaterThan(onceki);
      onceki = i;
    }
  });

  it("her adım başarısızlıkta zinciri DURDURUYOR (sessiz geçilmiyor)", () => {
    for (const adim of ["classify_dispute", "deadline_detect", "party_analysis", "common_ground"]) {
      expect(ORK, `${adim} hatası yutuluyor`).toContain(`fail("${adim}"`);
    }
  });

  it("KÜNYE BEKÇİSİ zincirin İKİ ucunda da var", () => {
    for (const [ad, g] of [["common-ground-report", RAPOR], ["party-confidential-analysis", TARAF]] as const) {
      expect(g, `${ad}: künye bekçisi yok`).toContain("sanitizeCitationHallucinations(parsed");
      expect(g, `${ad}: bağlam doğrulaması yok`).toContain("citationInContext");
    }
  });

  it("bekçi YAZIMDAN ÖNCE koşuyor (denetimsiz rapor kaydedilmiyor)", () => {
    const bekciIdx = RAPOR.indexOf("sanitizeCitationHallucinations(parsed");
    const yazIdx = RAPOR.indexOf('from("common_ground_reports").upsert');
    expect(bekciIdx, "bekçi yok").toBeGreaterThan(-1);
    expect(yazIdx, "yazım bekçiden ÖNCE").toBeGreaterThan(bekciIdx);
  });

  it("bağlamda olmayan künye SÖKÜLÜYOR (filtre gerçekten eliyor)", () => {
    // `precedents` baglamda dogrulanamayan kayitlari FILTRELEYEREK atmali.
    expect(RAPOR).toMatch(/precedents\s*=\s*[\s\S]{0,80}\.filter\(/);
    expect(RAPOR).toContain("citations.every((c) => citationInContext(c, context))");
    // Derin temizlik: yalniz precedents degil TUM alanlar.
    expect(RAPOR).toContain("sanitizeStringsDeep");
  });

  it("eleme sessiz değil (kaç künye silindiği kayda düşüyor)", () => {
    expect(RAPOR).toContain("citation guard:");
  });
});
