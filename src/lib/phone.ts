/** case_parties'te gsm/phone alanlarından paylaşılabilir bir telefon numarası seçer — önce gsm. */
export function getPartyPhone(p: { gsm?: string | null; phone?: string | null }): string | null {
  const gsm = (p.gsm ?? "").trim();
  if (gsm) return gsm;
  const phone = (p.phone ?? "").trim();
  return phone || null;
}

/** Serbest formatlı bir TR telefon numarasını wa.me'nin beklediği "90XXXXXXXXXX" biçimine indirger. */
export function normalizePhoneForWhatsapp(raw: string): string {
  let cleaned = raw.replace(/[\s()-]/g, "").replace(/^\+/, "");
  if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
  if (!cleaned.startsWith("90")) cleaned = "90" + cleaned;
  return cleaned;
}
