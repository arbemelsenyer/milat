import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ---- Türkçe karakter güvenli yazım için yardımcı --------------------------
const TR_MAP: Record<string, string> = {
  Ç: "C", Ğ: "G", İ: "I", Ö: "O", Ş: "S", Ü: "U",
  ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
};
const tr = (s: string | undefined | null) =>
  (s ?? "").replace(/[ÇĞİÖŞÜçğıöşü]/g, (ch) => TR_MAP[ch] ?? ch);

export interface DocCaseData {
  basvuruNo?: string;
  uyapNo?: string;
  basvuruTarihi?: string;
  dosyaTuru?: string;
  niche?: string;
  title?: string;
  description?: string;
  parties?: Array<{
    role?: string;
    full_name?: string;
    organization?: string;
    tc_kimlik?: string;
    vergi_no?: string;
    address?: string;
    phone?: string;
    email?: string;
  }>;
  mediator?: { full_name?: string; sicil_no?: string };
  meeting_date?: string;
  meeting_location?: string;
  agreement_text?: string;
  fee_amount?: number;
}

// Resmi başlık
function header(doc: jsPDF, title: string, data: DocCaseData) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(tr("T.C. ADALET BAKANLIGI"), 105, 18, { align: "center" });
  doc.setFontSize(11);
  doc.text(tr("Hukuk Isleri Genel Mudurlugu - Arabuluculuk Daire Baskanligi"), 105, 25, { align: "center" });
  doc.setLineWidth(0.5);
  doc.line(20, 30, 190, 30);
  doc.setFontSize(13);
  doc.text(tr(title), 105, 40, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let y = 50;
  if (data.basvuruNo) { doc.text(tr(`Basvuru No: ${data.basvuruNo}`), 20, y); y += 6; }
  if (data.uyapNo) { doc.text(tr(`UYAP No: ${data.uyapNo}`), 20, y); y += 6; }
  if (data.basvuruTarihi) { doc.text(tr(`Tarih: ${data.basvuruTarihi}`), 20, y); y += 6; }
  if (data.dosyaTuru) { doc.text(tr(`Dosya Turu: ${data.dosyaTuru}`), 20, y); y += 6; }
  if (data.niche) { doc.text(tr(`Uyusmazlik Alani: ${data.niche}`), 20, y); y += 6; }
  return y + 4;
}

function footer(doc: jsPDF, data: DocCaseData) {
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(9);
  doc.text(tr(`Arabulucu: ${data.mediator?.full_name ?? "______________________"}`), 20, pageH - 25);
  if (data.mediator?.sicil_no) doc.text(tr(`Sicil No: ${data.mediator.sicil_no}`), 20, pageH - 19);
  doc.text(tr("Imza: ______________________"), 130, pageH - 25);
  doc.setFontSize(8);
  doc.text(tr("MediPact AI - Adalet Bakanligi formatinda otomatik uretildi"), 105, pageH - 8, { align: "center" });
}

function partiesTable(doc: jsPDF, data: DocCaseData, startY: number) {
  const rows = (data.parties ?? []).map((p, i) => [
    `${i + 1}`,
    tr(p.role ?? ""),
    tr(p.full_name ?? p.organization ?? ""),
    tr(p.tc_kimlik ?? p.vergi_no ?? ""),
    tr(p.address ?? ""),
    tr(p.phone ?? p.email ?? ""),
  ]);
  autoTable(doc, {
    startY,
    head: [["#", "Sifat", "Ad Soyad / Unvan", "TC/VKN", "Adres", "Iletisim"].map(tr)],
    body: rows.length ? rows : [["-", "-", "-", "-", "-", "-"]],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [45, 53, 128], textColor: 255 },
    margin: { left: 20, right: 20 },
  });
  
  return (doc as any).lastAutoTable.finalY + 6;
}

function body(doc: jsPDF, text: string, y: number) {
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(tr(text), 170);
  doc.text(lines, 20, y);
  return y + lines.length * 5 + 4;
}

// ---- 9 RESMI BELGE ŞABLONU ------------------------------------------------

export const TEMPLATES = [
  { id: "basvuru", name: "Basvuru Formu" },
  { id: "ilk-toplanti", name: "Ilk Toplanti Tutanagi" },
  { id: "anlasma-tutanak", name: "Son Tutanak (Anlasma)" },
  { id: "anlasmama-tutanak", name: "Son Tutanak (Anlasmama)" },
  { id: "icabet-etmeme", name: "Davete Icabet Etmeme Tutanagi" },
  { id: "anlasma-belgesi", name: "Arabuluculuk Anlasma Belgesi" },
  { id: "gizlilik", name: "Gizlilik Sozlesmesi" },
  { id: "ucret-tarifesi", name: "Ucret Tarifesi Tutanagi" },
  { id: "vekaletname", name: "Vekaletname Sablonu" },
] as const;

export type TemplateId = typeof TEMPLATES[number]["id"];

export function generateOfficialPdf(templateId: TemplateId, data: DocCaseData): jsPDF {
  const doc = new jsPDF();
  let y = 0;

  switch (templateId) {
    case "basvuru":
      y = header(doc, "ARABULUCULUK BASVURU FORMU", data);
      y = body(doc, `Konu: ${data.title ?? "-"}\n\nUyusmazlik Ozeti:\n${data.description ?? "-"}`, y);
      doc.setFont("helvetica", "bold"); doc.text(tr("Taraflar"), 20, y); y += 6;
      doc.setFont("helvetica", "normal");
      y = partiesTable(doc, data, y);
      break;

    case "ilk-toplanti":
      y = header(doc, "ILK TOPLANTI TUTANAGI", data);
      y = body(doc, `Toplanti Tarihi: ${data.meeting_date ?? "____/____/______"}\nToplanti Yeri: ${data.meeting_location ?? "Online (Daily.co)"}\n\nArabulucu tarafindan taraflara arabuluculuk sureci, gizlilik ilkesi ve haklari hakkinda bilgi verilmistir. Taraflarin uyusmazlik konusundaki ilk beyanlari alinmistir.`, y);
      y = partiesTable(doc, data, y);
      break;

    case "anlasma-tutanak":
      y = header(doc, "SON TUTANAK - ANLASMA SAGLANDI", data);
      y = body(doc, `6325 sayili Hukuk Uyusmazliklarinda Arabuluculuk Kanunu hukumleri cercevesinde yurutulen arabuluculuk faaliyeti sonucunda taraflar ekteki anlasma metni uzerinde mutabakata varmislardir.\n\nAnlasma Metni:\n${data.agreement_text ?? "(Anlasma metni eklenecek)"}`, y);
      y = partiesTable(doc, data, y);
      break;

    case "anlasmama-tutanak":
      y = header(doc, "SON TUTANAK - ANLASMA SAGLANAMADI", data);
      y = body(doc, `Yurutulen arabuluculuk faaliyeti neticesinde taraflar arasinda anlasma saglanamamistir. Isbu tutanak 6325 sayili Kanun'un 17. maddesi uyarinca duzenlenmistir.`, y);
      y = partiesTable(doc, data, y);
      break;

    case "icabet-etmeme":
      y = header(doc, "DAVETE ICABET ETMEME TUTANAGI", data);
      y = body(doc, `Asagida kimligi yazili tarafa arabuluculuk ilk toplantisina katilimi icin usulune uygun davet yapilmis; ancak gecerli bir mazeret bildirmeksizin toplantiya katilmamistir. Bu durum 6325 sayili Kanun'un 18/A maddesi geregi tutanaga baglanmistir.`, y);
      y = partiesTable(doc, data, y);
      break;

    case "anlasma-belgesi":
      y = header(doc, "ARABULUCULUK ANLASMA BELGESI", data);
      y = body(doc, `Taraflar, asagida belirtilen sartlar uzerinde tam ve karsilikli irade beyanlariyla anlasmislardir.\n\nAnlasma Sartlari:\n${data.agreement_text ?? "1) ...\n2) ...\n3) ..."}\n\nIs bu belge icra edilebilirlik serhi alindiginda ilam niteliginde belge hukmundedir.`, y);
      y = partiesTable(doc, data, y);
      break;

    case "gizlilik":
      y = header(doc, "GIZLILIK SOZLESMESI", data);
      y = body(doc, `Arabuluculuk sureci kapsaminda elde edilen tum bilgi, belge ve beyanlar 6325 sayili Kanun'un 4. maddesi uyarinca gizlidir. Taraflar ve arabulucu, bu bilgileri sonraki yargilamalar dahil hicbir mecrada delil olarak kullanmamayi kabul ve taahhut ederler.`, y);
      y = partiesTable(doc, data, y);
      break;

    case "ucret-tarifesi":
      y = header(doc, "ARABULUCULUK UCRET TUTANAGI", data);
      autoTable(doc, {
        startY: y,
        head: [["Kalem", "Tutar (TL)"].map(tr)],
        body: [
          ["Arabulucu Ucreti", String(data.fee_amount ?? 0)],
          ["KDV (%20)", String(((data.fee_amount ?? 0) * 0.2).toFixed(2))],
          ["Toplam", String(((data.fee_amount ?? 0) * 1.2).toFixed(2))],
        ],
        headStyles: { fillColor: [45, 53, 128], textColor: 255 },
        margin: { left: 20, right: 20 },
      });
      
      y = (doc as any).lastAutoTable.finalY + 6;
      y = body(doc, `Ucret, Adalet Bakanligi Arabuluculuk Asgari Ucret Tarifesi uyarinca hesaplanmistir.`, y);
      break;

    case "vekaletname":
      y = header(doc, "ARABULUCULUK VEKALETNAMESI (SABLON)", data);
      y = body(doc, `Asagida kimligi yazili muvekkil; arabuluculuk sureci kapsaminda kendisini temsile, mufavakat ve sulh sozlesmesi imzalamaya, anlasma tutanagini imzalamaya yetkili olmak uzere asagida kimligi yazili vekili tayin etmistir.\n\nMuvekkil: ______________________________\nVekil (Av.): ____________________________\nBaro Sicil: ____________________________`, y);
      break;
  }

  footer(doc, data);
  return doc;
}

export function downloadOfficialPdf(templateId: TemplateId, data: DocCaseData) {
  const doc = generateOfficialPdf(templateId, data);
  const tpl = TEMPLATES.find((t) => t.id === templateId);
  doc.save(`${data.basvuruNo ?? "belge"}_${tpl?.id ?? templateId}.pdf`);
}
