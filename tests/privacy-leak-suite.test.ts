// Integration test for the privacy leak suite.
// Simulates a Supabase client returning RLS-filtered rows, then runs the same
// leak-detection helpers used by the live Privacy Tests screen. This guards
// against accidental policy regressions that would let Party A read Party B data.

import { describe, it, expect, vi } from "vitest";
import { LEAK_QUERIES, countLeaks } from "@/lib/privacyQueries";

type Row = Record<string, unknown>;

function fakeSupabase(tableData: Record<string, Row[]>) {
  return {
    from(table: string) {
      const builder: any = {
        _rows: tableData[table] ?? [],
        _neq: null as null | [string, unknown],
        select() { return builder; },
        neq(col: string, val: unknown) { builder._neq = [col, val]; return builder; },
        limit(n: number) {
          let out = builder._rows as Row[];
          if (builder._neq) {
            const [c, v] = builder._neq;
            out = out.filter((r) => r[c] !== v);
          }
          return Promise.resolve({ data: out.slice(0, n), error: null });
        },
      };
      return builder;
    },
  };
}

describe("Privacy leak suite — integration against simulated RLS responses", () => {
  const ME = "user-me";
  const OTHER = "user-other";

  it("PASSES when RLS perfectly filters out other parties' rows", async () => {
    // RLS strips every row that isn't owned by the requesting user.
    const supabase = fakeSupabase({
      party_analyses: [{ id: "a", user_id: ME }],
      case_discovery_questions: [{ id: "q", user_id: ME }],
      case_documents: [{ id: "d", uploaded_by: ME }],
    });

    for (const q of LEAK_QUERIES) {
      const { data, error } = await supabase
        .from(q.table)
        .select(q.selectColumns)
        .neq(q.ownerColumn, ME)
        .limit(5);
      expect(error).toBeNull();
      expect(countLeaks((data ?? []) as Row[], q.ownerColumn, ME)).toBe(0);
    }
  });

  it("FAILS loudly when RLS is broken and other-user rows leak through", async () => {
    // Simulate a regression: RLS misconfiguration that returns Party B rows
    // to Party A — exactly the scenario the suite must catch.
    const supabase = fakeSupabase({
      party_analyses: [{ id: "leak", user_id: OTHER }],
      case_discovery_questions: [{ id: "q1", user_id: OTHER }],
      case_documents: [{ id: "d1", uploaded_by: OTHER }],
    });

    const failures: string[] = [];
    for (const q of LEAK_QUERIES) {
      const { data } = await supabase
        .from(q.table)
        .select(q.selectColumns)
        .neq(q.ownerColumn, ME)
        .limit(5);
      if (countLeaks((data ?? []) as Row[], q.ownerColumn, ME) > 0) {
        failures.push(q.id);
      }
    }
    expect(failures).toEqual(["party_analyses", "case_discovery_questions", "case_documents"]);
  });

  it("runs all leak queries and reports a structured result set", async () => {
    const supabase = fakeSupabase({
      party_analyses: [{ id: "a", user_id: ME }],
      case_discovery_questions: [],
      case_documents: [{ id: "leak", uploaded_by: OTHER }],
    });

    const results: { id: string; pass: boolean }[] = [];
    for (const q of LEAK_QUERIES) {
      const { data } = await supabase
        .from(q.table)
        .select(q.selectColumns)
        .neq(q.ownerColumn, ME)
        .limit(5);
      const leaks = countLeaks((data ?? []) as Row[], q.ownerColumn, ME);
      results.push({ id: q.id, pass: leaks === 0 });
    }

    expect(results.find((r) => r.id === "party_analyses")?.pass).toBe(true);
    expect(results.find((r) => r.id === "case_discovery_questions")?.pass).toBe(true);
    expect(results.find((r) => r.id === "case_documents")?.pass).toBe(false);
  });

  it("each leak query targets the expected owner column", () => {
    const map = Object.fromEntries(LEAK_QUERIES.map((q) => [q.id, q.ownerColumn]));
    expect(map["party_analyses"]).toBe("user_id");
    expect(map["case_discovery_questions"]).toBe("user_id");
    expect(map["case_documents"]).toBe("uploaded_by");
  });
});
