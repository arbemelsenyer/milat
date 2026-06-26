import { describe, it, expect } from "vitest";
import { LEAK_QUERIES, isLeakFree, countLeaks } from "@/lib/privacyQueries";

describe("privacyQueries — leak detection helpers (unit)", () => {
  const ME = "user-me";
  const OTHER = "user-other";

  it("exposes a query for each protected surface", () => {
    const ids = LEAK_QUERIES.map((q) => q.id);
    expect(ids).toEqual(
      expect.arrayContaining(["party_analyses", "case_discovery_questions", "case_documents"])
    );
    for (const q of LEAK_QUERIES) {
      expect(q.ownerColumn.length).toBeGreaterThan(0);
      expect(q.selectColumns).toContain(q.ownerColumn);
    }
  });

  it("treats empty result as leak-free", () => {
    expect(isLeakFree([], "user_id", ME)).toBe(true);
    expect(countLeaks([], "user_id", ME)).toBe(0);
  });

  it("flags rows owned by another user as a leak", () => {
    const rows = [{ id: 1, user_id: OTHER }, { id: 2, user_id: OTHER }];
    expect(isLeakFree(rows, "user_id", ME)).toBe(false);
    expect(countLeaks(rows, "user_id", ME)).toBe(2);
  });

  it("does not flag rows owned by current user", () => {
    const rows = [{ id: 1, user_id: ME }, { id: 2, user_id: ME }];
    expect(isLeakFree(rows, "user_id", ME)).toBe(true);
    expect(countLeaks(rows, "user_id", ME)).toBe(0);
  });

  it("ignores rows with null owner column (RLS-anonymized)", () => {
    const rows = [{ id: 1, user_id: null }, { id: 2, user_id: ME }];
    expect(isLeakFree(rows, "user_id", ME)).toBe(true);
    expect(countLeaks(rows, "user_id", ME)).toBe(0);
  });

  it("works with case_documents.uploaded_by column", () => {
    const rows = [
      { id: 1, uploaded_by: ME },
      { id: 2, uploaded_by: OTHER },
    ];
    expect(countLeaks(rows, "uploaded_by", ME)).toBe(1);
  });
});
