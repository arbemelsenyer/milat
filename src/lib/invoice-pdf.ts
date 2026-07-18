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

export interface InvoicePaymentInfo {
  payerLabel: string;
  amount: number;
  status: "bekliyor" | "odendi";
  receiptNo?: string | null;
}

export interface InvoiceData {
  applicationNo: string;
  disputeSubject: string;
  mediatorName: string;
  mediatorRegistryNo?: string | null;
  // Profiles tablosunda vergi dairesi/VKN-TCKN alanı yok — hesap formundan opsiyonel girilir.
  mediatorTaxOffice?: string | null;
  mediatorTaxId?: string | null;
  parties: InvoicePartyInfo[];
  feeType: "anlasma" | "anlasamama" | "ihtiyari";
  disputeValue: number;
  sessionCount: number;
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
  payments?: InvoicePaymentInfo[];
  createdAt?: Date;
}

const NAVY: [number, number, number] = [45, 53, 128];
const BEIGE: [number, number, number] = [196, 168, 130];

const fmtTL = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

const feeTypeLabel: Record<InvoiceData["feeType"], string> = {
  anlasma: "Anlaşma",
  anlasamama: "Anlaşamama",
  ihtiyari: "İhtiyari Arabuluculuk",
};

const paymentStatusLabel: Record<InvoicePaymentInfo["status"], string> = {
  bekliyor: "Bekliyor",
  odendi: "Ödendi",
};

// -------- Unicode font loading for Turkish PDF support --------
// jsPDF'in gömülü helvetica'sı WinAnsi kodlamalı ve ğ/ş/İ/ı gibi Türkçe
// karakterleri bozuyor. official-documents.ts'teki ile aynı desen: Türkçe
// glifleri içeren bir Roboto TTF'i lazy-load edip jsPDF VFS'ine gömüyoruz.
let _fontPromise: Promise<string | null> | null = null;
async function loadUnicodeFontBase64(): Promise<string | null> {
  if (_fontPromise) return _fontPromise;
  _fontPromise = (async () => {
    try {
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

export async function generateInvoicePdf(data: InvoiceData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = 0;

  // Unicode fontu yükle; başarısız olursa sessizce helvetica'ya düş (eski davranış).
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

  const ensureSpace = (need: number) => {
    if (y + need > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont(fontName, "bold");
  doc.setFontSize(18);
  doc.text("MediPact AI", margin, 32);
  doc.setFontSize(12);
  doc.setFont(fontName, "normal");
  doc.text("SERBEST MESLEK MAKBUZU TASLAĞI", margin, 52);
  doc.setFontSize(8);
  doc.text("Bu belge bilgilendirme taslağıdır; resmi e-SMM yerine geçmez.", margin, 66);
  doc.setFontSize(10);
  const dateStr = (data.createdAt ?? new Date()).toLocaleDateString("tr-TR");
  doc.text(`Tarih: ${dateStr}`, pageWidth - margin, 40, { align: "right" });
  doc.text(`Başvuru No: ${data.applicationNo || "-"}`, pageWidth - margin, 58, { align: "right" });

  y = 120;
  doc.setTextColor(30, 30, 30);

  drawSectionTitle(doc, fontName, "Kesen (Arabulucu)", margin, y); y += 18;
  doc.setFont(fontName, "normal"); doc.setFontSize(10);
  doc.text(`Ad Soyad: ${data.mediatorName || "-"}`, margin, y); y += 14;
  doc.text(`Sicil No: ${data.mediatorRegistryNo || "-"}`, margin, y); y += 14;
  if (data.mediatorTaxOffice) { doc.text(`Vergi Dairesi: ${data.mediatorTaxOffice}`, margin, y); y += 14; }
  if (data.mediatorTaxId) { doc.text(`VKN/TCKN: ${data.mediatorTaxId}`, margin, y); y += 14; }
  y += 8;

  drawSectionTitle(doc, fontName, "Ödeyen (Taraf)", margin, y); y += 18;
  doc.setFont(fontName, "normal"); doc.setFontSize(10);
  if (data.parties.length === 0) {
    doc.text("-", margin, y); y += 14;
  } else {
    data.parties.forEach((p, i) => {
      ensureSpace(60);
      const header = p.roleLabel ? `${i + 1}. ${p.name} (${p.typeLabel}, ${p.roleLabel})` : `${i + 1}. ${p.name} (${p.typeLabel})`;
      doc.setFont(fontName, "bold");
      doc.text(header, margin, y); y += 14;
      doc.setFont(fontName, "normal");
      const lines: string[] = [];
      if (p.tcKimlik) lines.push(`T.C. Kimlik No: ${p.tcKimlik}`);
      if (p.taxNumber) lines.push(`Vergi No: ${p.taxNumber}`);
      if (p.taxOffice) lines.push(`Vergi Dairesi: ${p.taxOffice}`);
      if (p.authorizedPerson) lines.push(`Yetkili: ${p.authorizedPerson}`);
      if (p.address) lines.push(`Adres: ${p.address}`);
      lines.forEach((line) => {
        const wrapped = doc.splitTextToSize(`   ${line}`, pageWidth - 2 * margin);
        ensureSpace(wrapped.length * 13);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 13;
      });
      y += 4;
    });
  }
  y += 8;

  ensureSpace(90);
  drawSectionTitle(doc, fontName, "Uyuşmazlık", margin, y); y += 18;
  doc.setFont(fontName, "normal"); doc.setFontSize(10);
  doc.text(`Konu: ${data.disputeSubject || "-"}`, margin, y); y += 14;
  doc.text(`Sonuç Türü: ${feeTypeLabel[data.feeType]}`, margin, y); y += 14;
  doc.text(`Uyuşmazlık Değeri: ${fmtTL(data.disputeValue)}`, margin, y); y += 14;
  doc.text(`Oturum Sayısı: ${data.sessionCount}`, margin, y); y += 20;

  ensureSpace(180);
  drawSectionTitle(doc, fontName, "Ücret Dökümü", margin, y); y += 14;
  const colLabelX = margin;
  const colValueX = pageWidth - margin;
  const rowH = 22;

  const rows: Array<[string, string, boolean?]> = [
    ["Brüt Ücret", fmtTL(data.brutUcret)],
    ["KDV (%20)", fmtTL(data.kdv)],
    ["GV Stopaj (%20)", `-${fmtTL(data.gvStopaj)}`],
    ["Net Ücret", fmtTL(data.netUcret), true],
    ["KDV Tevkifatı", fmtTL(data.kdvTevkifati)],
    ["Tahsil Edilen KDV", fmtTL(data.tahsilEdilenKdv)],
  ];

  doc.setDrawColor(...BEIGE);
  doc.setLineWidth(0.5);
  rows.forEach(([label, value, bold], idx) => {
    if (idx % 2 === 0) { doc.setFillColor(248, 244, 236); doc.rect(margin, y, pageWidth - 2 * margin, rowH, "F"); }
    doc.setFont(fontName, bold ? "bold" : "normal");
    doc.text(label, colLabelX + 6, y + 15);
    doc.text(value, colValueX - 6, y + 15, { align: "right" });
    y += rowH;
  });

  doc.setFillColor(...NAVY);
  doc.rect(margin, y, pageWidth - 2 * margin, rowH + 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont(fontName, "bold");
  doc.setFontSize(12);
  doc.text("NET TAHSİLAT", colLabelX + 6, y + 17);
  doc.text(fmtTL(data.netTahsilat), colValueX - 6, y + 17, { align: "right" });
  y += rowH + 18;
  doc.setTextColor(30, 30, 30);
  doc.setFont(fontName, "normal"); doc.setFontSize(10);

  // Ödeme Defteri Özeti — yalnızca bu dosyaya ait case_payments satırı varsa basılır.
  if (data.payments && data.payments.length > 0) {
    ensureSpace(30 + data.payments.length * 13);
    drawSectionTitle(doc, fontName, "Ödeme Defteri Özeti", margin, y); y += 16;
    doc.setFontSize(9);
    data.payments.forEach((p) => {
      const receipt = p.receiptNo ? ` — Makbuz No: ${p.receiptNo}` : "";
      const line = `• ${p.payerLabel}: ${fmtTL(p.amount)} (${paymentStatusLabel[p.status]})${receipt}`;
      const wrapped = doc.splitTextToSize(line, pageWidth - 2 * margin);
      ensureSpace(wrapped.length * 12);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 12;
    });
    y += 8; doc.setFontSize(10);
  }

  // Dilim breakdown
  if (data.dilimBreakdown && data.dilimBreakdown.length > 0) {
    ensureSpace(30 + data.dilimBreakdown.length * 12);
    drawSectionTitle(doc, fontName, "Dilim Dökümü", margin, y); y += 16;
    doc.setFontSize(9);
    data.dilimBreakdown.forEach((b) => {
      const line = `• ${b.dilim} — ${b.oran} → ${fmtTL(b.tutar)}`;
      const wrapped = doc.splitTextToSize(line, pageWidth - 2 * margin);
      ensureSpace(wrapped.length * 12);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 12;
    });
    y += 8; doc.setFontSize(10);
  }

  if (data.tarifeMaddesi) {
    ensureSpace(30);
    const lines = doc.splitTextToSize(`Tarife Dayanağı: ${data.tarifeMaddesi}`, pageWidth - 2 * margin);
    doc.text(lines, margin, y); y += lines.length * 12 + 6;
  }

  ensureSpace(60);
  doc.setTextColor(90, 90, 90); doc.setFontSize(9);
  doc.text(`${data.tarifeYili} Yılı Arabuluculuk Asgari Ücret Tarifesine göre hesaplanmıştır.`, margin, y);
  y += 30;

  doc.setDrawColor(...NAVY); doc.setLineWidth(0.8);
  doc.line(pageWidth - margin - 180, y, pageWidth - margin, y);
  doc.setTextColor(30, 30, 30);
  doc.setFont(fontName, "normal"); doc.setFontSize(10);
  doc.text("Arabulucu İmza", pageWidth - margin - 90, y + 14, { align: "center" });

  return doc;
}

function drawSectionTitle(doc: jsPDF, fontName: string, title: string, x: number, y: number) {
  doc.setFillColor(...BEIGE);
  doc.rect(x, y - 12, 4, 14, "F");
  doc.setTextColor(...NAVY);
  doc.setFont(fontName, "bold");
  doc.setFontSize(12);
  doc.text(title, x + 10, y);
  doc.setTextColor(30, 30, 30);
}

export async function downloadInvoicePdf(data: InvoiceData) {
  const doc = await generateInvoicePdf(data);
  doc.save(`arabuluculuk-makbuz-taslak-${data.applicationNo || Date.now()}.pdf`);
}
