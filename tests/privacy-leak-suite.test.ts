// Integration test for the privacy leak suite.
// Simulates a Supabase client returning RLS-filtered rows, then runs the same
// leak-detection helpers used by the live Privacy Tests screen. This guards
// against accidental policy regressions that would let Party A read Party B data.

import { describe, it, expect, vi } from "vitest";
import { LEAK_QUERIES, countLeaks, isLeakFree, depoSizintisiVarMi, DEPO_YOKLAMASI } from "@/lib/privacyQueries";

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

/* ── KAPSAM GENİŞLETMESİ (24.08.2026) ────────────────────────────────────────
   Yukarıdaki üç test yalnız KULLANICI kimliğiyle sahiplenen üç tabloyu
   yokluyordu. Ürünün taraf-gizli yüzeylerinin çoğu sahipliği `party_id` ile
   tutar — aralarında KÖR TEKLİF (`teklif_braketleri`) de vardır.
   Bu bölüm eklenmeden önce, `teklif_braketleri`ne sızıntı olsa tezgâh YEŞİL
   kalırdı: tablo `LEAK_QUERIES`te yoktu, sahte veri de yoktu, döngü boş geçerdi.
   ("Yeşil tezgâh kanıt değildir" — aynı gün ayrı bir tezgâhta da yaşandı.) */

describe("taraf kapsamlı sahiplik — kör teklif dahil", () => {
  const TARAFIM = "taraf-benim";
  const OTEKI_TARAF = "taraf-oteki";
  const SAHIPLIGIM = [TARAFIM];

  const TARAF_KAPSAMLI = LEAK_QUERIES.filter((q) => q.sahiplik === "taraf");

  it("taraf kapsamlı tablolar gerçekten tanımlı (kapsam boş değil)", () => {
    expect(TARAF_KAPSAMLI.length).toBeGreaterThanOrEqual(6);
  });

  it("KENDİ taraf satırım sızıntı sayılmaz", () => {
    for (const q of TARAF_KAPSAMLI) {
      const rows = [{ id: "x", [q.ownerColumn]: TARAFIM }];
      expect(countLeaks(rows, q.ownerColumn, SAHIPLIGIM)).toBe(0);
      expect(isLeakFree(rows, q.ownerColumn, SAHIPLIGIM)).toBe(true);
    }
  });

  it("KARŞI tarafın satırı SIZINTI olarak yakalanır", () => {
    for (const q of TARAF_KAPSAMLI) {
      const rows = [{ id: "x", [q.ownerColumn]: OTEKI_TARAF }];
      expect(countLeaks(rows, q.ownerColumn, SAHIPLIGIM), `${q.id} sızıntıyı kaçırdı`).toBe(1);
      expect(isLeakFree(rows, q.ownerColumn, SAHIPLIGIM)).toBe(false);
    }
  });

  it("birden çok taraf kaydım varsa hepsi sahiplik sayılır", () => {
    const coklu = ["taraf-a", "taraf-b"];
    const rows = [{ id: "1", party_id: "taraf-a" }, { id: "2", party_id: "taraf-b" }];
    expect(countLeaks(rows, "party_id", coklu)).toBe(0);
    expect(countLeaks([...rows, { id: "3", party_id: "yabanci" }], "party_id", coklu)).toBe(1);
  });

  it("KÖR TEKLİF tablosu kapsamda — en hassas olan unutulmasın", () => {
    const kor = LEAK_QUERIES.find((q) => q.table === "teklif_braketleri");
    expect(kor, "teklif_braketleri kapsam dışı kalmış").toBeTruthy();
    expect(kor!.sahiplik).toBe("taraf");
  });
});

describe("kapsam bekçisi — denetlenen taraf-gizli tablolar kapsamda kalmalı", () => {
  /* 24.08 veri izolasyonu denetiminde taraf-gizli olduğu doğrulanan tablolar.
     Biri kapsamdan düşerse bu test düşer ve sessizce korumasız kalmaz. */
  const OLMASI_GEREKENLER = [
    "party_analyses",
    "case_discovery_questions",
    "case_documents",
    "teklif_braketleri",
    "taraf_kalemleri",
    "oturum_hazirlik_foyleri",
    "bilirkisi_secim_beyani",
    "bilirkisi_taraf_yanitlari",
    "case_payments",
  ];

  for (const tablo of OLMASI_GEREKENLER) {
    it(`${tablo} kapsamda`, () => {
      expect(LEAK_QUERIES.some((q) => q.table === tablo)).toBe(true);
    });
  }
});

/* DEPO YOKLAMASI — tablo yoklaması bunu GÖREMEZ.
   24.08'de `case-documents` kovasının okuma politikası veritabanındakinden
   genişti; belgenin SATIRI gizlenirken DOSYASI karşı tarafça indirilebiliyordu
   (ölçülen gerçek sızıntı: 1 çift). Tablo yoklamaları bunu kaçırmıştı. */
describe("depo yoklaması", () => {
  it("başkasının dosyası İNDİRİLEBİLİYORSA sızıntıdır", () => {
    expect(depoSizintisiVarMi(true)).toBe(true);
  });

  it("indirme başarısızsa sızıntı yoktur", () => {
    expect(depoSizintisiVarMi(false)).toBe(false);
  });

  it("yoklama doğru kovayı hedefler", () => {
    expect(DEPO_YOKLAMASI.bucket).toBe("case-documents");
  });
});
