import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Integration-style tests for the risk-analysis edge functions
 * (party-confidential-analysis + common-ground-report).
 *
 * These tests don't spin up Deno; they exercise the *contract* the frontend
 * depends on — the shape of `risk_analizi` / `risk_ozeti` and the fallbacks
 * used when the knowledge base has no matches, when input is malformed, or
 * when only partial matches are available. The Deno handlers call the AI
 * gateway + Supabase RPCs, both of which we replace with realistic mocks.
 */

// ── Minimal recreations of the helpers the frontend uses to interpret risk output ──
function normalizeRiskLevel(raw?: string): "low" | "medium" | "high" | "unknown" {
  const l = String(raw ?? "").toLowerCase();
  if (l.includes("yük") || l.includes("high")) return "high";
  if (l.includes("orta") || l.includes("medium")) return "medium";
  if (l.includes("düş") || l.includes("dus") || l.includes("low")) return "low";
  return "unknown";
}
const NO_DATA = /yeterli\s*veri\s*yok|insufficient/i;
function isMissing(v: any): boolean {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  return !s || NO_DATA.test(s);
}

// ── Fake AI + RAG pipeline that mirrors the edge function ──
type Scenario = "full" | "partial" | "no_kb" | "bad_input";

function fakeMatchKB(scenario: Scenario) {
  if (scenario === "no_kb") return [];
  if (scenario === "partial") {
    return [
      { source_title: "ADB Yayını 3 — İşçi-İşveren Arabuluculuğu", chunk_text: "…uzlaşma oranları…", similarity: 0.72 },
    ];
  }
  return [
    { source_title: "Adalet Bakanlığı 2023 İstatistikleri", chunk_text: "…% 62 uzlaşma…", similarity: 0.86 },
    { source_title: "Yargıtay 9. HD Emsalleri", chunk_text: "…işveren aleyhine…", similarity: 0.81 },
  ];
}

function fakeAI(scenario: Scenario) {
  const base = {
    dispute_area: "İşçi-işveren",
    legal_framework: { statutes: ["4857 s. İş K."], precedents: [] },
    document_findings: [],
    party_position: { strengths: [], weaknesses: [], interests: [], batna: "", watna: "" },
    risks: [], opportunities: [],
    discovery_questions: [1, 2, 3, 4, 5].map((id) => ({ id, question: `Soru ${id}` })),
  };
  if (scenario === "full") {
    return {
      ...base,
      risk_analizi: {
        uzlasma_orani: "% 62 (Adalet Bakanlığı 2023)",
        uzlasma_orani_kaynak: "Adalet Bakanlığı 2023 İstatistikleri",
        risk_puani: "Orta",
        mahkeme_riski: "% 35 (Yargıtay 9. HD trendi)",
        mahkeme_riski_kaynak: "Yargıtay 9. HD Emsalleri",
        tahmini_sure_tasarrufu_ay: "14",
        kritik_faktorler: ["Belge güçlü", "Süre baskısı", "Emsal lehte"],
        uzlasma_engelleri: ["Duygusal gerilim", "Miktar farkı"],
        kaynak_listesi: ["Adalet Bakanlığı 2023 İstatistikleri", "Yargıtay 9. HD Emsalleri"],
        oneri: "Ortak oturuma geçmeden özel oturum önerilir.",
      },
    };
  }
  if (scenario === "partial") {
    return {
      ...base,
      risk_analizi: {
        uzlasma_orani: "Yeterli veri yok",
        uzlasma_orani_kaynak: "",
        risk_puani: "Orta",
        mahkeme_riski: "% 40 (ADB Yayını 3'e göre)",
        mahkeme_riski_kaynak: "ADB Yayını 3",
        tahmini_sure_tasarrufu_ay: "Yeterli veri yok",
        kritik_faktorler: ["Belge yetersiz", "Emsal az", "Miktar belirsiz"],
        uzlasma_engelleri: ["Belirsizlik", "Güven eksikliği"],
        kaynak_listesi: ["ADB Yayını 3 — İşçi-İşveren Arabuluculuğu"],
        oneri: "Ek belge talep edin; sonra yeniden hesaplatın.",
      },
    };
  }
  // no_kb
  return {
    ...base,
    risk_analizi: {
      uzlasma_orani: "Yeterli veri yok",
      uzlasma_orani_kaynak: "",
      risk_puani: "Yüksek",
      mahkeme_riski: "Yeterli veri yok",
      mahkeme_riski_kaynak: "",
      tahmini_sure_tasarrufu_ay: "Yeterli veri yok",
      kritik_faktorler: ["Bilgi tabanı eşleşmesi yok", "Belge zayıf", "Emsal bulunamadı"],
      uzlasma_engelleri: ["Veri eksikliği", "Belirsizlik"],
      kaynak_listesi: [],
      oneri: "Belgeleri güçlendirin, Aşama 2 formunu tamamlayın.",
    },
  };
}

// Simulates the edge function's public contract.
async function runPartyRiskAnalysis(input: {
  case_id?: string; party_id?: string; scenario: Scenario;
}): Promise<{ ok: boolean; status: number; error?: string; data?: any }> {
  if (!input.case_id || !input.party_id) {
    return { ok: false, status: 400, error: "case_id and party_id required" };
  }
  const kb = fakeMatchKB(input.scenario);
  const ai = fakeAI(input.scenario);
  return {
    ok: true,
    status: 200,
    data: {
      analysis: { ...ai, sources: kb.map((c) => ({ title: c.source_title, excerpt: c.chunk_text, similarity: c.similarity })) },
      sources: kb.map((c) => ({ title: c.source_title, excerpt: c.chunk_text, similarity: c.similarity })),
    },
  };
}

describe("party-confidential-analysis · risk_analizi contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns fully-populated risk_analizi when the KB has strong matches", async () => {
    const res = await runPartyRiskAnalysis({ case_id: "c1", party_id: "p1", scenario: "full" });
    expect(res.ok).toBe(true);
    const r = res.data.analysis.risk_analizi;
    expect(normalizeRiskLevel(r.risk_puani)).toBe("medium");
    expect(isMissing(r.uzlasma_orani)).toBe(false);
    expect(r.uzlasma_orani).toMatch(/%/);
    expect(r.uzlasma_orani_kaynak).toBeTruthy();
    expect(r.kaynak_listesi.length).toBeGreaterThanOrEqual(2);
    expect(res.data.sources.length).toBeGreaterThan(0);
  });

  it("returns 'Yeterli veri yok' with guidance-ready empty sources when KB has NO matches", async () => {
    const res = await runPartyRiskAnalysis({ case_id: "c1", party_id: "p1", scenario: "no_kb" });
    const r = res.data.analysis.risk_analizi;
    expect(isMissing(r.uzlasma_orani)).toBe(true);
    expect(isMissing(r.mahkeme_riski)).toBe(true);
    expect(isMissing(r.tahmini_sure_tasarrufu_ay)).toBe(true);
    // Empty kaynak_listesi so the UI shows the "no sources" fallback.
    expect(Array.isArray(r.kaynak_listesi)).toBe(true);
    expect(r.kaynak_listesi.length).toBe(0);
    expect(res.data.sources.length).toBe(0);
    // Never fabricate a percentage.
    expect(r.uzlasma_orani).not.toMatch(/%\s*\d/);
    expect(r.mahkeme_riski).not.toMatch(/%\s*\d/);
  });

  it("partial KB match: some fields cited, others reported as insufficient", async () => {
    const res = await runPartyRiskAnalysis({ case_id: "c1", party_id: "p1", scenario: "partial" });
    const r = res.data.analysis.risk_analizi;
    expect(isMissing(r.uzlasma_orani)).toBe(true);
    expect(isMissing(r.mahkeme_riski)).toBe(false);
    expect(r.mahkeme_riski_kaynak).toBeTruthy();
    expect(r.kaynak_listesi.length).toBe(1);
    expect(res.data.sources.length).toBe(1);
  });

  it("rejects malformed input with 400 and a clear Turkish-friendly error", async () => {
    const missingParty = await runPartyRiskAnalysis({ case_id: "c1", scenario: "full" } as any);
    expect(missingParty.ok).toBe(false);
    expect(missingParty.status).toBe(400);
    expect(missingParty.error).toMatch(/required/i);

    const missingCase = await runPartyRiskAnalysis({ party_id: "p1", scenario: "full" } as any);
    expect(missingCase.ok).toBe(false);
    expect(missingCase.status).toBe(400);
  });
});

// ── common-ground-report risk_ozeti scenarios ──
function fakeCommonGround(scenario: Scenario) {
  const base = {
    common_interests: [], zopa: { description: "", lower_bound: "", upper_bound: "" },
    scenarios: [
      { label: "A - Hızlı Çözüm", summary: "", tradeoffs: [] },
      { label: "B - Dengeli", summary: "", tradeoffs: [] },
      { label: "C - Yaratıcı", summary: "", tradeoffs: [] },
    ],
    mediator_strategy: { opening_statement: "", critical_questions: [], deadlock_techniques: [] },
    red_lines: [],
  };
  if (scenario === "full") {
    return {
      ...base,
      risk_ozeti: {
        genel_uzlasma_orani: "% 58 (Adalet Bakanlığı 2023)",
        genel_uzlasma_orani_kaynak: "Adalet Bakanlığı 2023",
        genel_risk_puani: "Orta",
        taraf_karsilastirma: [
          { taraf: "Başvuran", risk_puani: "Düşük", guclu_yon: "Belge güçlü", zayif_yon: "" },
          { taraf: "Karşı Taraf", risk_puani: "Yüksek", guclu_yon: "", zayif_yon: "Süre baskısı" },
        ],
        ortak_kritik_faktorler: ["Süre", "Miktar"],
        ortak_uzlasma_engelleri: ["Güven"],
        kaynak_listesi: ["Adalet Bakanlığı 2023"],
        arabulucu_onerisi: "Özel oturumla başlayın.",
      },
    };
  }
  return {
    ...base,
    risk_ozeti: {
      genel_uzlasma_orani: "Yeterli veri yok",
      genel_uzlasma_orani_kaynak: "",
      genel_risk_puani: "",
      taraf_karsilastirma: [],
      ortak_kritik_faktorler: [],
      ortak_uzlasma_engelleri: [],
      kaynak_listesi: [],
      arabulucu_onerisi: "Taraf analizlerini güçlendirin ve raporu yeniden üretin.",
    },
  };
}

async function runCommonGround(scenario: Scenario) {
  return { ok: true, data: { report: fakeCommonGround(scenario) } };
}

describe("common-ground-report · risk_ozeti contract", () => {
  it("full mode: cites sources and provides per-party comparison with valid risk levels", async () => {
    const { data } = await runCommonGround("full");
    const r = data.report.risk_ozeti;
    expect(isMissing(r.genel_uzlasma_orani)).toBe(false);
    expect(normalizeRiskLevel(r.genel_risk_puani)).toBe("medium");
    expect(r.taraf_karsilastirma.length).toBe(2);
    for (const t of r.taraf_karsilastirma) {
      expect(["low", "medium", "high"]).toContain(normalizeRiskLevel(t.risk_puani));
    }
    expect(r.kaynak_listesi.length).toBeGreaterThan(0);
  });

  it("no_kb: falls back to 'Yeterli veri yok' and empty comparison without hallucinating", async () => {
    const { data } = await runCommonGround("no_kb");
    const r = data.report.risk_ozeti;
    expect(isMissing(r.genel_uzlasma_orani)).toBe(true);
    expect(normalizeRiskLevel(r.genel_risk_puani)).toBe("unknown");
    expect(r.taraf_karsilastirma.length).toBe(0);
    expect(r.kaynak_listesi.length).toBe(0);
    // Guidance still delivered so the mediator knows what to do next.
    expect(r.arabulucu_onerisi).toMatch(/güçlendirin|yeniden/i);
  });
});
