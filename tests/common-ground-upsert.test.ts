import { describe, it, expect } from "vitest";

/**
 * Regression test for the common-ground-report edge function.
 *
 * The bug we are guarding against: when `(case_id, round_number)` is reused
 * the function MUST update the existing row instead of inserting a duplicate
 * (which previously caused "JSON object requested, multiple (or no) rows
 * returned" when the UI tried to read with .single()).
 *
 * We don't hit the network — we simulate the supabase-js upsert/select chain
 * with an in-memory store keyed on the unique constraint, then run the same
 * call shape twice (insert -> update) and assert there is exactly one row.
 */

type Row = {
  id: string;
  case_id: string;
  round_number: number;
  report: any;
  strategy: any;
  created_at: string;
  updated_at: string;
};

function makeFakeReportsTable() {
  const rows = new Map<string, Row>(); // key = `${case_id}:${round_number}`
  let idSeq = 0;

  return {
    rows,
    client: {
      from(_table: string) {
        const table = _table; // 'common_ground_reports'
        return {
          upsert(
            values: Omit<Row, "id" | "created_at" | "updated_at">,
            opts: { onConflict: string }
          ) {
            // We require the unique-key option — without it the bug recurs.
            if (opts?.onConflict !== "case_id,round_number") {
              throw new Error(
                `[${table}] upsert is missing onConflict 'case_id,round_number'`
              );
            }
            const key = `${values.case_id}:${values.round_number}`;
            const now = new Date().toISOString();
            const existing = rows.get(key);
            const merged: Row = existing
              ? { ...existing, ...values, updated_at: now }
              : {
                  id: `r_${++idSeq}`,
                  created_at: now,
                  updated_at: now,
                  ...values,
                };
            rows.set(key, merged);

            return {
              select() {
                return {
                  async maybeSingle() {
                    return { data: merged, error: null };
                  },
                };
              },
            };
          },
        };
      },
    },
  };
}

describe("common-ground-report upsert regression", () => {
  it("updates the existing row instead of inserting a duplicate when (case_id, round_number) repeats", async () => {
    const { client, rows } = makeFakeReportsTable();
    const case_id = "case-abc";
    const round_number = 1;

    const first = await client
      .from("common_ground_reports")
      .upsert(
        { case_id, round_number, report: { v: 1 }, strategy: { s: 1 } },
        { onConflict: "case_id,round_number" }
      )
      .select()
      .maybeSingle();

    const second = await client
      .from("common_ground_reports")
      .upsert(
        { case_id, round_number, report: { v: 2 }, strategy: { s: 2 } },
        { onConflict: "case_id,round_number" }
      )
      .select()
      .maybeSingle();

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(rows.size).toBe(1);
    // Same row id — updated, not duplicated.
    expect(second.data?.id).toBe(first.data?.id);
    // Latest values won.
    expect(second.data?.report).toEqual({ v: 2 });
    expect(second.data?.strategy).toEqual({ s: 2 });
  });

  it("throws when the function forgets the onConflict option (regression guard)", () => {
    const { client } = makeFakeReportsTable();
    expect(() =>
      // @ts-expect-error — intentionally bad call shape
      client.from("common_ground_reports").upsert(
        { case_id: "x", round_number: 1, report: {}, strategy: {} },
        {} as any
      )
    ).toThrow(/onConflict/);
  });
});
