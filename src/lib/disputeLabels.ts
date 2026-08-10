// Uyuşmazlık türü / alt uzmanlık alanı görüntüleme etiketleri — tüm ekranlarda
// tek kaynak. İki farklı slug kümesini kapsar: (1) classify-dispute AI'ın ürettiği
// eski ASCII slug'lar (isci_isveren, tuketici, ...) ve (2) güncel Türkçe karakterli
// taksonomi (işçi_işveren, tüketici, ... — hem AI sınıflandırması hem dosya açılışında
// manuel seçim bu değerleri yazar). Eşleşmeyen bir slug gelirse ham haliyle döner.
export const DISPUTE_TYPE_LABELS: Record<string, string> = {
  // Eski/otomatik sınıflandırma (ASCII slug'lar)
  isci_isveren: "İşçi-İşveren",
  ticari: "Ticari",
  tuketici: "Tüketici",
  kira: "Kira",
  ortaklik: "Ortaklığın Giderilmesi",
  fikri_mulkiyet: "Fikri Mülkiyet",
  saglik: "Sağlık / Malpraktis",
  sigorta: "Sigorta",
  aile: "Aile",
  diger: "Diğer",
  commercial: "Ticari",
  ip: "Fikri Mülkiyet",
  healthcare: "Sağlık / Malpraktis",
  health: "Sağlık / Malpraktis",
  other: "Diğer",
  // Güncel taksonomi (Türkçe karakterli slug'lar)
  "işçi_işveren": "İşçi-İşveren",
  "tüketici": "Tüketici",
  "ortaklık": "Ortaklığın Giderilmesi",
  "sağlık": "Sağlık",
  "fikri_mülkiyet": "Fikri Mülkiyet",
  "inşaat": "İnşaat",
  "bankacılık": "Bankacılık",
  "spor": "Spor",
  "enerji_maden": "Enerji & Maden",
  "gayrimenkul": "Gayrimenkul",
  "genel": "Genel",
};

export const DISPUTE_SUBTYPE_LABELS: Record<string, string> = {
  // Eski/otomatik sınıflandırma alt tür slug'ları
  fikri_sinai_haklar: "Fikri-Sınai Haklar",
  "fikri_sınai_haklar": "Fikri-Sınai Haklar",
  marka: "Marka",
  patent: "Patent",
  telif: "Telif Hakkı",
  ticari_sir: "Ticari Sır",
  alacak: "Alacak",
  sozlesme: "Sözleşme",
  cek_senet: "Çek-Senet",
  haksiz_rekabet: "Haksız Rekabet",
  kidem_ihbar: "Kıdem-İhbar Tazminatı",
  ise_iade: "İşe İade",
  fazla_mesai: "Fazla Mesai",
  is_kazasi: "İş Kazası",
  ayipli_mal: "Ayıplı Mal",
  ayipli_hizmet: "Ayıplı Hizmet",
  abonelik: "Abonelik",
  kira_bedeli: "Kira Bedeli",
  tahliye: "Tahliye",
  depozito: "Depozito",
  malpraktis: "Malpraktis",
  police: "Poliçe",
  hasar: "Hasar",
  tazminat: "Tazminat",
  nafaka: "Nafaka",
  mal_paylasimi: "Mal Paylaşımı",
  diger: "Diğer",
  // Güncel taksonomi: dosya açılışında seçilen alt uzmanlık alanları
  "sağlık": "Sağlık",
  "sigorta": "Sigorta",
  "inşaat": "İnşaat",
  "bankacılık": "Bankacılık",
  "spor": "Spor",
  "enerji_maden": "Enerji-Maden",
};

// Ana tür + (varsa) alt uzmanlık alanını "AnaTür — AltUzmanlık" biçiminde birleştirir;
// alt uzmanlık yoksa yalnız ana tür döner. Bilinmeyen bir slug ham haliyle gösterilir.
export function formatDisputeType(type?: string | null, subtype?: string | null): string {
  if (!type) return "—";
  const main = DISPUTE_TYPE_LABELS[type] ?? type;
  if (!subtype) return main;
  const sub = DISPUTE_SUBTYPE_LABELS[subtype] ?? subtype;
  return `${main} — ${sub}`;
}
