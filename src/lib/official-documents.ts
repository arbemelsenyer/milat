// Client-side helpers to render an official document as PDF/DOCX/UDF.
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import JSZip from "jszip";
import { toast } from "@/hooks/use-toast";

const NAVY = "#2D3580";

// -------- Unicode font loading for Turkish PDF support --------
// jsPDF's built-in helvetica is WinAnsi and mangles Turkish glyphs (ğ, ş, İ, ı).
// Lazy-load a TTF that supports the full Turkish alphabet.
let _fontPromise: Promise<string | null> | null = null;
async function loadUnicodeFontBase64(): Promise<string | null> {
  if (_fontPromise) return _fontPromise;
  _fontPromise = (async () => {
    try {
      const url = "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.0.22/files/noto-sans-latin-ext-400-normal.woff";
      // jsPDF needs TTF; use a Roboto TTF that includes Turkish glyphs.
      const ttfUrl = "https://cdn.jsdelivr.net/gh/googlefonts/roboto@main/src/hinted/Roboto-Regular.ttf";
      const res = await fetch(ttfUrl);
      if (!res.ok) return null;
      const buf = new Uint8Array(await res.arrayBuffer());
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < buf.length; i += chunk) {
        binary += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + chunk)) as any);
      }
      return btoa(binary);
    } catch {
      return null;
    }
  })();
  return _fontPromise;
}

export async function downloadOfficialPdf(opts: {
  templateType: string;
  filledText: string;
  applicationNo?: string | null;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // Try to install a Unicode font so Turkish characters render correctly.
  const b64 = await loadUnicodeFontBase64();
  let fontName = "helvetica";
  if (b64) {
    try {
      doc.addFileToVFS("Roboto-Regular.ttf", b64);
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
      doc.addFont("Roboto-Regular.ttf", "Roboto", "bold");
      fontName = "Roboto";
    } catch {
      fontName = "helvetica";
    }
  }

  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 48;
  const usableW = pageW - marginX * 2;
  let y = 56;

  doc.setFont(fontName, "bold");
  doc.setFontSize(14);
  doc.setTextColor(NAVY);
  const title = officialTitle(opts.templateType);
  doc.text(title, pageW / 2, y, { align: "center" });
  y += 20;

  if (opts.applicationNo) {
    doc.setFont(fontName, "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`Dosya No: ${opts.applicationNo}`, pageW / 2, y, { align: "center" });
    y += 16;
  }

  doc.setDrawColor(NAVY);
  doc.setLineWidth(0.7);
  doc.line(marginX, y, pageW - marginX, y);
  y += 16;

  doc.setFont(fontName, "normal");
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
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: officialTitle(opts.templateType),
          bold: true,
          size: 28,
          color: "2D3580",
        }),
      ],
    }),
  ];
  if (opts.applicationNo) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `Dosya No: ${opts.applicationNo}`, size: 20, color: "555555" })],
      })
    );
  }
  children.push(new Paragraph({ children: [new TextRun("")] }));

  for (const line of opts.filledText.split("\n")) {
    children.push(new Paragraph({ children: [new TextRun(line || " ")] }));
  }

  const docx = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(docx);

  // Use explicit anchor click flow — most reliable across browsers.
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${opts.templateType}_${opts.applicationNo || "belge"}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * UYAP UDF is actually a ZIP archive containing `content.xml` (+ optional
 * `properties.xml`). Writing raw XML with a `.udf` extension causes the OS to
 * open it in Notepad. Packaging as a ZIP lets UYAP editor recognize it.
 */
export async function downloadOfficialUdf(opts: {
  templateType: string;
  udfXml: string;
  applicationNo?: string | null;
}) {
  const zip = new JSZip();
  zip.file("content.xml", opts.udfXml);
  zip.file(
    "properties.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<properties>\n  <format>UDF</format>\n  <version>1.7</version>\n  <generator>Medipact</generator>\n</properties>`
  );
  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/octet-stream" });

  const filename = `${opts.templateType}_${opts.applicationNo || "belge"}.udf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  toast({
    title: "UDF dosyası indirildi",
    description:
      "UYAP portalında Dosya Ekle → Evrak Türü: Son Tutanak seçerek yükleyebilirsiniz.",
  });
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
