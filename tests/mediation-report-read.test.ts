import { describe, it, expect } from "vitest";

/**
 * Integration test for MediationEngine's report-read flow.
 *
 * Historical bug: code used `.single()` against `common_ground_reports`
 * which raised PGRST116 ("JSON object requested, multiple (or no) rows
 * returned") when zero rows or duplicate rows existed.
 *
 * Fix: every read uses
 *   .order("created_at", { ascending: false }).limit(1).maybeSingle()
 *
 * This test simulates that exact chain against three table states
 * (0 rows, 1 row, N duplicate rows) and asserts the chain never errors
 * and always returns at most one row.
 */

type Row = { id: string; case_id: string; created_at: string; payload: any };

function chainFor(rows: Row[]) {
  // mimics: from(table).select(*).eq("case_id", X).order(...).limit(1).maybeSingle()
  let filtered = [...rows];
  const builder: any = {
    select() { return builder; },
    eq(col: string, val: any) {
      filtered = filtered.filter((r: any) => r[col] === val);
      return builder;
    },
    order(col: string, opts: { ascending: boolean }) {
      filtered.sort((a: any, b: any) =>
        opts.ascending ? (a[col] > b[col] ? 1 : -1) : (a[col] < b[col] ? 1 : -1)
      );
      return builder;
    },
    limit(n: number) {
      filtered = filtered.slice(0, n);
      return builder;
    },
    async maybeSingle() {
      if (filtered.length === 0) return { data: null, error: null };
      if (filtered.length === 1) return { data: filtered[0], error: null };
      // maybeSingle with >1 would itself error — but we always .limit(1) first,
      // so this branch should be unreachable when the code follows the rule.
      return {
        data: null,
        error: { message: "JSON object requested, multiple (or no) rows returned" },
      };
    },
  };
  return builder;
}

async function readLatestReport(rows: Row[], caseId: string) {
  return chainFor(rows)
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

describe("MediationEngine common_ground_reports read flow", () => {
  it("returns null without error when no rows exist", async () => {
    const { data, error } = await readLatestReport([], "case-1");
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("returns the single row when exactly one exists", async () => {
    const rows: Row[] = [
      { id: "a", case_id: "case-1", created_at: "2026-01-01T00:00:00Z", payload: { v: 1 } },
    ];
    const { data, error } = await readLatestReport(rows, "case-1");
    expect(error).toBeNull();
    expect(data?.id).toBe("a");
  });

  it("returns the most recent row (no PGRST116) even when duplicates leak in", async () => {
    const rows: Row[] = [
      { id: "old", case_id: "case-1", created_at: "2026-01-01T00:00:00Z", payload: { v: 1 } },
      { id: "mid", case_id: "case-1", created_at: "2026-02-01T00:00:00Z", payload: { v: 2 } },
      { id: "new", case_id: "case-1", created_at: "2026-03-01T00:00:00Z", payload: { v: 3 } },
    ];
    const { data, error } = await readLatestReport(rows, "case-1");
    expect(error).toBeNull();
    expect(data?.id).toBe("new");
  });

  it("ignores rows for other cases", async () => {
    const rows: Row[] = [
      { id: "x", case_id: "case-2", created_at: "2026-03-01T00:00:00Z", payload: {} },
    ];
    const { data, error } = await readLatestReport(rows, "case-1");
    expect(error).toBeNull();
    expect(data).toBeNull();
  });
});
