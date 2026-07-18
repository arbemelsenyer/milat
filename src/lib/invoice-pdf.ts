import { jsPDF } from "jspdf";

export interface InvoicePartyInfo {
  name: string;
  typeLabel: string;
  roleLabel?: string | null;
  tcKimlik?: string | null;
  taxNumber?: string | null;
  taxOffice?: string | null;
  authorizedPerson?: string | null;
  address?: string | null;
}

export interface InvoiceData {
  applicationNo: string;
  disputeSubject: string;
  mediatorName: string;
  mediatorRegistryNo?: string | null;
  parties: InvoicePartyInfo[];
  feeType: "anlasma" | "anlasamama" | "ihtiyari";
  disputeValue: number;
  sessionCount: number;
  // NEW breakdown fields
  brutUcret: number;
  kdv: number;
  gvStopaj: number;
  netUcret: number;
  kdvTevkifati: number;
  tahsilEdilenKdv: number;
  netTahsilat: number;
  tarifeYili: number;
  tarifeMaddesi: string;
  dilimBreakdown?: Array<{ dilim: string; oran: string; tutar: number }>;
  createdAt?: Date;
}

const NAVY: [number, number, number] = [45, 53, 128];
const BEIGE: [number, number, number] = [196, 168, 130];

const fmtTL = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

const feeTypeLabel: Record<InvoiceData["feeType"], string> = {
  anlasma: "Anlasma",
  anlasamama: "Anlasamama",
  ihtiyari: "Ihtiyari Arabuluculuk",
};

export function generateInvoicePdf(data: InvoiceData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 0;

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

  drawSectionTitle(doc, "Arabulucu Bilgileri", margin, y); y += 18;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`Ad Soyad: ${data.mediatorName || "-"}`, margin, y); y += 14;
  doc.text(`Sicil No: ${data.mediatorRegistryNo || "-"}`, margin, y); y += 22;

  drawSectionTitle(doc, "Taraflar", margin, y); y += 18;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  if (data.parties.length === 0) {
    doc.text("-", margin, y); y += 14;
  } else {
    data.parties.forEach((p, i) => {
      const header = p.roleLabel ? `${i + 1}. ${p.name} (${p.typeLabel}, ${p.roleLabel})` : `${i + 1}. ${p.name} (${p.typeLabel})`;
      doc.setFont("helvetica", "bold");
      doc.text(header, margin, y); y += 14;
      doc.setFont("helvetica", "normal");
      const lines: string[] = [];
      if (p.tcKimlik) lines.push(`T.C. Kimlik No: ${p.tcKimlik}`);
      if (p.taxNumber) lines.push(`Vergi No: ${p.taxNumber}`);
      if (p.taxOffice) lines.push(`Vergi Dairesi: ${p.taxOffice}`);
      if (p.authorizedPerson) lines.push(`Yetkili: ${p.authorizedPerson}`);
      if (p.address) lines.push(`Adres: ${p.address}`);
      lines.forEach((line) => {
        const wrapped = doc.splitTextToSize(`   ${line}`, pageWidth - 2 * margin);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 13;
      });
      y += 4;
    });
  }
  y += 8;

  drawSectionTitle(doc, "Uyusmazlik", margin, y); y += 18;
  doc.text(`Konu: ${data.disputeSubject || "-"}`, margin, y); y += 14;
  doc.text(`Sonuc Turu: ${feeTypeLabel[data.feeType]}`, margin, y); y += 14;
  doc.text(`Uyusmazlik Degeri: ${fmtTL(data.disputeValue)}`, margin, y); y += 14;
  doc.text(`Oturum Sayisi: ${data.sessionCount}`, margin, y); y += 20;

  drawSectionTitle(doc, "Ucret Dokumu", margin, y); y += 14;
  const colLabelX = margin;
  const colValueX = pageWidth - margin;
  const rowH = 22;

  const rows: Array<[string, string, boolean?]> = [
    ["Brut Ucret", fmtTL(data.brutUcret)],
    ["KDV (%20)", fmtTL(data.kdv)],
    ["GV Stopaj (%20)", `-${fmtTL(data.gvStopaj)}`],
    ["Net Ucret", fmtTL(data.netUcret), true],
    ["KDV Tevkifati", fmtTL(data.kdvTevkifati)],
    ["Tahsil Edilen KDV", fmtTL(data.tahsilEdilenKdv)],
  ];

  doc.setDrawColor(...BEIGE);
  doc.setLineWidth(0.5);
  rows.forEach(([label, value, bold], idx) => {
    if (idx % 2 === 0) { doc.setFillColor(248, 244, 236); doc.rect(margin, y, pageWidth - 2 * margin, rowH, "F"); }
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, colLabelX + 6, y + 15);
    doc.text(value, colValueX - 6, y + 15, { align: "right" });
    y += rowH;
  });

  doc.setFillColor(...NAVY);
  doc.rect(margin, y, pageWidth - 2 * margin, rowH + 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("NET TAHSILAT", colLabelX + 6, y + 17);
  doc.text(fmtTL(data.netTahsilat), colValueX - 6, y + 17, { align: "right" });
  y += rowH + 18;
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);

  // Dilim breakdown
  if (data.dilimBreakdown && data.dilimBreakdown.length > 0) {
    drawSectionTitle(doc, "Dilim Dokumu", margin, y); y += 16;
    doc.setFontSize(9);
    data.dilimBreakdown.forEach((b) => {
      const line = `• ${b.dilim} — ${b.oran} → ${fmtTL(b.tutar)}`;
      const wrapped = doc.splitTextToSize(line, pageWidth - 2 * margin);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 12;
    });
    y += 8; doc.setFontSize(10);
  }

  if (data.tarifeMaddesi) {
    const lines = doc.splitTextToSize(`Tarife Dayanagi: ${data.tarifeMaddesi}`, pageWidth - 2 * margin);
    doc.text(lines, margin, y); y += lines.length * 12 + 6;
  }

  doc.setTextColor(90, 90, 90); doc.setFontSize(9);
  doc.text(`${data.tarifeYili} Yili Arabuluculuk Asgari Ucret Tarifesine gore hesaplanmistir.`, margin, y);
  y += 30;

  doc.setDrawColor(...NAVY); doc.setLineWidth(0.8);
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
  doc.save(`arabuluculuk-fatura-${data.applicationNo || Date.now()}.pdf`);
}
