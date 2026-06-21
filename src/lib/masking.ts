/**
 * Client-side PII masking. The same regex set runs server-side in the
 * `mediation-ai` edge function (defense in depth) before any AI call.
 */

export type Mask = {
  label: string;       // e.g. [TC_KIMLIK_1]
  realValue: string;   // original PII string
  fieldType: string;   // tc_kimlik | iban | phone | email | tax_no | name | company | address | date
  start: number;
  end: number;
};

export type MaskResult = {
  masked: string;
  mappings: Mask[];
};

const PATTERNS: Array<{ type: string; label: string; re: RegExp }> = [
  { type: "iban", label: "IBAN", re: /\bTR\d{2}[ ]?(?:\d{4}[ ]?){5}\d{2}\b/g },
  { type: "tc_kimlik", label: "TC_KIMLIK", re: /\b[1-9]\d{10}\b/g },
  { type: "tax_no", label: "VERGI_NO", re: /\b\d{10}\b/g },
  { type: "email", label: "EPOSTA", re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi },
  { type: "phone", label: "TELEFON", re: /(?:\+90[\s-]?)?(?:0?5\d{2}|0?2\d{2}|0?3\d{2}|0?4\d{2})[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g },
];

/** Mask known PII patterns. Pass `extraTerms` (names/company/address strings from forms) to also redact those literal terms. */
export function maskText(input: string, extraTerms: Array<{ value: string; fieldType: string }> = []): MaskResult {
  if (!input) return { masked: "", mappings: [] };
  const mappings: Mask[] = [];
  const counters: Record<string, number> = {};
  const valueToLabel = new Map<string, string>();

  const allocate = (type: string, label: string, value: string): string => {
    const key = `${type}::${value}`;
    if (valueToLabel.has(key)) return valueToLabel.get(key)!;
    counters[label] = (counters[label] ?? 0) + 1;
    const tag = `[${label}_${counters[label]}]`;
    valueToLabel.set(key, tag);
    return tag;
  };

  let working = input;

  // First, replace user-provided literal terms (longest first to avoid prefix collisions)
  const sortedExtras = [...extraTerms]
    .filter((e) => e.value && e.value.trim().length >= 2)
    .sort((a, b) => b.value.length - a.value.length);

  for (const term of sortedExtras) {
    const safe = term.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${safe}\\b`, "gi");
    working = working.replace(re, (match) => {
      const labelMap: Record<string, string> = {
        name: "BASVURAN",
        counterparty_name: "KARSI_TARAF",
        company: "SIRKET_UNVANI",
        address: "ADRES",
        authorized: "YETKILI",
      };
      const label = labelMap[term.fieldType] ?? term.fieldType.toUpperCase();
      const tag = allocate(term.fieldType, label, match);
      mappings.push({ label: tag, realValue: match, fieldType: term.fieldType, start: -1, end: -1 });
      return tag;
    });
  }

  // Then, regex patterns
  for (const p of PATTERNS) {
    working = working.replace(p.re, (match) => {
      const tag = allocate(p.type, p.label, match);
      mappings.push({ label: tag, realValue: match, fieldType: p.type, start: -1, end: -1 });
      return tag;
    });
  }

  return { masked: working, mappings };
}

/** Reverse-apply a mapping list onto masked text. */
export function unmaskText(masked: string, mappings: Mask[]): string {
  let out = masked;
  for (const m of mappings) {
    out = out.split(m.label).join(m.realValue);
  }
  return out;
}
