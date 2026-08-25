import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* ATAMA TARİHİ — resmi tutanak alanı uydurulmaz (25.08.2026)

   `ProcessTrackerPanel` "Dosya Atama Tarihi" satırını
   `fmtDate(assignedAt ?? caseData?.created_at)` ile yazdırıyordu.
   `assignedAt`in tek kaynağı `case_assignments.assigned_at`tir ve o tablo
   canlıda **0 satırdır** — yani alan HER dosyada sessizce dosyanın AÇILIŞ
   tarihine düşüyordu. Bu bir resmi tutanak alanıdır: açılış tarihini "atama
   tarihi" diye yazdırmak olgusal olarak yanlıştır.

   `cases` üzerinde atama zaman damgası YOKTUR (şema tarandı: application_date,
   closed_at, created_at, deadline_detected_at, updated_at — atama yok). Yani
   doğru kaynak gerçekten `case_assignments`tir; eksikse panelin kendi
   bilinmiyor gösterimi kullanılır (`fmtDate(null) === "—"`).

   İkinci kusur: `AdminDashboard.handleAssignMediator` bu satırı yazarken
   sonucu SESSİZ yutuyordu. Yazılamazsa tarih kalıcı olarak kaybolur.

   Kanıt için kök değiştirilebilir: ATAMA_KOK=tests/gecici/atama-kanit */

const KOK = (process.env.ATAMA_KOK ?? "").replace(/\/+$/, "");
const y = (goreli: string) => (KOK ? `${KOK}/${goreli}` : goreli);

const panel = () => readFileSync(y("src/components/mediation/ProcessTrackerPanel.tsx"), "utf-8");
const admin = () => readFileSync(y("src/pages/AdminDashboard.tsx"), "utf-8");

describe("atama tarihi uydurulmuyor", () => {
  it("panel atama tarihini created_at'e düşürmüyor", () => {
    const satir = panel()
      .split("\n")
      .find((l) => l.includes('label: "Dosya Atama Tarihi"'));
    expect(satir, "‘Dosya Atama Tarihi’ satırı bulunamadı — etiket değiştiyse tezgâh güncellenmeli").toBeDefined();
    expect(satir, "atama tarihi başka bir alana düşürülüyor (uydurma tarih)").toContain("fmtDate(assignedAt)");
    expect(satir).not.toContain("created_at");
    expect(satir).not.toContain("??");
  });

  it("atama tarihinin kaynağı hâlâ case_assignments.assigned_at", () => {
    const g = panel();
    expect(g).toContain('.from("case_assignments")');
    expect(g).toContain("assigned_at");
    expect(g).toContain("setAssignedAt");
  });

  it("yönetici panelindeki atama izi yazımı sessiz yutulmuyor", () => {
    const g = admin();
    const i = g.indexOf("from('case_assignments')");
    expect(i, "yönetici panelinde case_assignments yazımı yok").toBeGreaterThan(-1);
    // Yazımın hemen öncesindeki 200 karakterde hata degiskenine baglanmis olmali.
    const bas = g.slice(Math.max(0, i - 200), i);
    expect(bas, "insert sonucu bir hata degiskenine baglanmiyor (sessiz yutma)").toMatch(
      /const\s*\{\s*error\s*:\s*\w+\s*\}\s*=\s*await\s+supabase\.\s*$/,
    );
    // ve o hata gercekten kullaniciya bildirilmeli
    const son = g.slice(i, i + 900);
    expect(son, "hata kullaniciya bildirilmiyor").toContain("variant: 'destructive'");
  });
});
