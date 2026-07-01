import { describe, it, expect } from "vitest";

// Mirrors the logic in MediationEngine Phase 3
function computeReportState(partiesCount: number, analysesCount: number) {
  const canReport = analysesCount >= 1;
  const partialReport = analysesCount >= 1 && analysesCount < partiesCount;
  const buttonDisabled = !canReport;
  return { canReport, partialReport, buttonDisabled };
}

describe("Ortak Zemin Raporu Üret button — scenarios", () => {
  it("0 analiz: buton disabled, uyarı yok", () => {
    const s = computeReportState(2, 0);
    expect(s.canReport).toBe(false);
    expect(s.buttonDisabled).toBe(true);
    expect(s.partialReport).toBe(false);
  });

  it("1 analiz (2 taraf): buton aktif, eksik-taraf uyarısı gösterilir", () => {
    const s = computeReportState(2, 1);
    expect(s.canReport).toBe(true);
    expect(s.buttonDisabled).toBe(false);
    expect(s.partialReport).toBe(true);
  });

  it("2 analiz (2 taraf): buton aktif, uyarı gösterilmez", () => {
    const s = computeReportState(2, 2);
    expect(s.canReport).toBe(true);
    expect(s.buttonDisabled).toBe(false);
    expect(s.partialReport).toBe(false);
  });

  it("1 analiz (3 taraf): partial true", () => {
    const s = computeReportState(3, 1);
    expect(s.partialReport).toBe(true);
    expect(s.canReport).toBe(true);
  });

  it("0 taraf 0 analiz: buton disabled", () => {
    const s = computeReportState(0, 0);
    expect(s.buttonDisabled).toBe(true);
    expect(s.partialReport).toBe(false);
  });
});
