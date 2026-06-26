import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type PrivacyResultRow = {
  name: string;
  description: string;
  status: "pass" | "fail" | "pending";
  detail?: string;
};

export type PrivacyRun = {
  ranAt: string;
  userEmail: string | null;
  results: PrivacyResultRow[];
};

const LS_KEY = "medipact:privacy:lastRun";

export function saveLastRun(run: PrivacyRun) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(run));
  } catch {}
}

export function loadLastRun(): PrivacyRun | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as PrivacyRun) : null;
  } catch {
    return null;
  }
}

export function generatePrivacyReportPdf(run: PrivacyRun): jsPDF {
  const doc = new jsPDF();
  const passed = run.results.filter((r) => r.status === "pass").length;
  const failed = run.results.filter((r) => r.status === "fail").length;

  doc.setFontSize(16);
  doc.text("MediPact AI — Gizlilik Test Raporu", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Çalıştırma: ${new Date(run.ranAt).toLocaleString("tr-TR")}`, 14, 26);
  if (run.userEmail) doc.text(`Çalıştıran: ${run.userEmail}`, 14, 32);
  doc.setTextColor(0);
  doc.text(`Toplam: ${run.results.length}   Geçti: ${passed}   Başarısız: ${failed}`, 14, 40);

  autoTable(doc, {
    startY: 46,
    head: [["Test", "Durum", "Açıklama / Detay"]],
    body: run.results.map((r) => [
      r.name,
      r.status === "pass" ? "GEÇTİ" : r.status === "fail" ? "BAŞARISIZ" : "BEKLİYOR",
      `${r.description}${r.detail ? `\n\n${r.detail}` : ""}`,
    ]),
    styles: { fontSize: 9, cellPadding: 3, valign: "top" },
    headStyles: { fillColor: [30, 130, 130] },
    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 25 }, 2: { cellWidth: "auto" } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const v = String(data.cell.raw);
        if (v === "GEÇTİ") data.cell.styles.textColor = [22, 130, 70];
        if (v === "BAŞARISIZ") data.cell.styles.textColor = [200, 40, 40];
      }
    },
  });

  return doc;
}
