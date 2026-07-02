// Client-side helpers to render an official document as PDF/DOCX/UDF.
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";

const NAVY = "#2D3580";

export function downloadOfficialPdf(opts: {
  templateType: string;
  filledText: string;
  applicationNo?: string | null;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 48;
  const usableW = pageW - marginX * 2;
  let y = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(NAVY);
  const title = officialTitle(opts.templateType);
  doc.text(title, pageW / 2, y, { align: "center" });
  y += 20;

  if (opts.applicationNo) {
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`Dosya No: ${opts.applicationNo}`, pageW / 2, y, { align: "center" });
    y += 16;
  }

  doc.setDrawColor(NAVY);
  doc.setLineWidth(0.7);
  doc.line(marginX, y, pageW - marginX, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(20);

  const lines = doc.splitTextToSize(opts.filledText, usableW) as string[];
  const lineH = 12;
  for (const line of lines) {
    if (y > 780) {
      doc.addPage();
      y = 56;
    }
    doc.text(line, marginX, y);
    y += lineH;
  }

  doc.save(`${opts.templateType}_${opts.applicationNo || "belge"}.pdf`);
}

export async function downloadOfficialDocx(opts: {
  templateType: string;
  filledText: string;
  applicationNo?: string | null;
}) {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: officialTitle(opts.templateType), bold: true, color: "2D3580" })],
    }),
  ];
  if (opts.applicationNo) {
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Dosya No: ${opts.applicationNo}`, size: 20, color: "555555" })],
    }));
  }
  paragraphs.push(new Paragraph({ children: [new TextRun("")] }));

  for (const line of opts.filledText.split("\n")) {
    paragraphs.push(new Paragraph({ children: [new TextRun(line || " ")] }));
  }

  const docx = new Document({ sections: [{ children: paragraphs }] });
  const blob = await Packer.toBlob(docx);
  saveAs(blob, `${opts.templateType}_${opts.applicationNo || "belge"}.docx`);
}

export function downloadOfficialUdf(opts: {
  templateType: string;
  udfXml: string;
  applicationNo?: string | null;
}) {
  const blob = new Blob([opts.udfXml], { type: "application/xml;charset=utf-8" });
  saveAs(blob, `${opts.templateType}_${opts.applicationNo || "belge"}.udf`);
}

export function officialTitle(templateType: string): string {
  const map: Record<string, string> = {
    dava_sarti_anlasma: "Dava Şartı Arabuluculuk — Anlaşma Son Tutanağı",
    dava_sarti_anlasamamama: "Dava Şartı Arabuluculuk — Anlaşamama Son Tutanağı",
    dava_sarti_ilk_oturum: "Dava Şartı Arabuluculuk — İlk Oturum Tutanağı",
    ihtiyari_anlasma: "İhtiyari Arabuluculuk — Anlaşma Son Tutanağı",
    ihtiyari_anlasamamama: "İhtiyari Arabuluculuk — Anlaşamama Son Tutanağı",
    ihtiyari_davet: "İhtiyari Arabuluculuk — Davet Mektubu",
    isci_isveren_davet: "İşçi-İşveren Uyuşmazlıkları — Davet Mektubu",
    ticari_davet: "Ticari Uyuşmazlıklarda — Davet Mektubu",
    tuketici_davet: "Tüketici Uyuşmazlıklarında — Davet Mektubu",
  };
  return map[templateType] || templateType;
}
