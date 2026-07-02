import { jsPDF } from "jspdf";

export interface InvoiceData {
  applicationNo: string;
  disputeSubject: string;
  mediatorName: string;
  mediatorRegistryNo?: string | null;
  parties: Array<{ name: string; role?: string | null }>;
  feeType: "anlasma" | "anlasamama" | "ihtiyari";
  disputeValue: number;
  sessionCount: number;
  bazUcret: number;
  ekOturumUcreti: number;
  toplamUcret: number;
  kdv: number;
  genelToplam: number;
  tarifeMaddesi: string;
  createdAt?: Date;
}

const NAVY: [number, number, number] = [45, 53, 128];   // #2D3580
const BEIGE: [number, number, number] = [196, 168, 130]; // #C4A882

const fmtTL = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

const feeTypeLabel: Record<InvoiceData["feeType"], string> = {
  anlasma: "Anlaşma",
  anlasamama: "Anlaşamama",
  ihtiyari: "İhtiyari Arabuluculuk",
};

export function generateInvoicePdf(data: InvoiceData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 0;

  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("MediPact AI", margin, 40);
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text("ARABULUCULUK UCRETI FATURASI", margin, 62);
  doc.setFontSize(10);
  const dateStr = (data.createdAt ?? new Date()).toLocaleDateString("tr-TR");
  doc.text(`Tarih: ${dateStr}`, pageWidth - margin, 40, { align: "right" });
  doc.text(`Basvuru No: ${data.applicationNo || "-"}`, pageWidth - margin, 58, { align: "right" });

  y = 120;
  doc.setTextColor(30, 30, 30);

  // Mediator block
  drawSectionTitle(doc, "Arabulucu Bilgileri", margin, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Ad Soyad: ${data.mediatorName || "-"}`, margin, y); y += 14;
  doc.text(`Sicil No: ${data.mediatorRegistryNo || "-"}`, margin, y); y += 22;

  // Parties block
  drawSectionTitle(doc, "Taraflar", margin, y);
  y += 18;
  if (data.parties.length === 0) {
    doc.text("-", margin, y); y += 14;
  } else {
    data.parties.forEach((p) => {
      const line = p.role ? `${p.name} (${p.role})` : p.name;
      doc.text(`• ${line}`, margin, y);
      y += 14;
    });
  }
  y += 8;

  // Dispute
  drawSectionTitle(doc, "Uyusmazlik", margin, y);
  y += 18;
  doc.text(`Konu: ${data.disputeSubject || "-"}`, margin, y); y += 14;
  doc.text(`Sonuc Turu: ${feeTypeLabel[data.feeType]}`, margin, y); y += 14;
  doc.text(`Uyusmazlik Degeri: ${fmtTL(data.disputeValue)}`, margin, y); y += 14;
  doc.text(`Oturum Sayisi: ${data.sessionCount}`, margin, y); y += 20;

  // Fee table
  drawSectionTitle(doc, "Ucret Detaylari", margin, y);
  y += 14;
  const colLabelX = margin;
  const colValueX = pageWidth - margin;
  const rowH = 22;

  const rows: Array<[string, string]> = [
    ["Baz Ucret", fmtTL(data.bazUcret)],
    ["Ek Oturum Ucreti", fmtTL(data.ekOturumUcreti)],
    ["Ara Toplam", fmtTL(data.toplamUcret)],
    ["KDV (%20)", fmtTL(data.kdv)],
  ];

  doc.setDrawColor(...BEIGE);
  doc.setLineWidth(0.5);
  rows.forEach(([label, value], idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 244, 236);
      doc.rect(margin, y, pageWidth - 2 * margin, rowH, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.text(label, colLabelX + 6, y + 15);
    doc.text(value, colValueX - 6, y + 15, { align: "right" });
    y += rowH;
  });

  // Total row
  doc.setFillColor(...NAVY);
  doc.rect(margin, y, pageWidth - 2 * margin, rowH + 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("GENEL TOPLAM", colLabelX + 6, y + 17);
  doc.text(fmtTL(data.genelToplam), colValueX - 6, y + 17, { align: "right" });
  y += rowH + 18;
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // Tarife basis
  if (data.tarifeMaddesi) {
    const lines = doc.splitTextToSize(`Tarife Dayanagi: ${data.tarifeMaddesi}`, pageWidth - 2 * margin);
    doc.text(lines, margin, y);
    y += lines.length * 12 + 10;
  }

  // Footer note
  doc.setTextColor(90, 90, 90);
  doc.setFontSize(9);
  const footNote = "2026 Yili Arabuluculuk Asgari Ucret Tarifesine gore hesaplanmistir.";
  doc.text(footNote, margin, y); y += 40;

  // Signature line
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(pageWidth - margin - 180, y, pageWidth - margin, y);
  doc.setTextColor(30, 30, 30);
  doc.text("Arabulucu Imza", pageWidth - margin - 90, y + 14, { align: "center" });

  return doc;
}

function drawSectionTitle(doc: jsPDF, title: string, x: number, y: number) {
  doc.setFillColor(...BEIGE);
  doc.rect(x, y - 12, 4, 14, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, x + 10, y);
  doc.setTextColor(30, 30, 30);
}

export function downloadInvoicePdf(data: InvoiceData) {
  const doc = generateInvoicePdf(data);
  const filename = `arabuluculuk-fatura-${data.applicationNo || Date.now()}.pdf`;
  doc.save(filename);
}
