export type IntakePartyRole = 'individual' | 'business' | '';

export interface IntakePartyDetails {
  name: string;
  role: IntakePartyRole;
  firstName: string;
  lastName: string;
  companyTitle: string;
  taxOffice: string;
  taxNumber: string;
  address: string;
  contactInfo: string;
  phone: string;
  email: string;
}

export const emptyIntakePartyDetails = (): IntakePartyDetails => ({
  name: '',
  role: '',
  firstName: '',
  lastName: '',
  companyTitle: '',
  taxOffice: '',
  taxNumber: '',
  address: '',
  contactInfo: '',
  phone: '',
  email: '',
});

// Türk arabuluculuk taksonomisi (isci_isveren/ticari/tuketici/kira/ortaklik/fikri_mulkiyet/
// saglik/sigorta/aile/diger). Eski 'commercial'|'ip'|'healthcare'|'other' değerleri, o
// değerlerle kaydedilmiş mevcut başvuruları kırmamak için union'da tutuluyor — yeni
// başvurular Step1DisputeType'ta artık yalnızca yeni taksonomiden seçim yapar.
export type DisputeTypeValue =
  | 'isci_isveren'
  | 'ticari'
  | 'tuketici'
  | 'kira'
  | 'ortaklik'
  | 'fikri_mulkiyet'
  | 'saglik'
  | 'sigorta'
  | 'aile'
  | 'diger'
  | 'commercial'
  | 'ip'
  | 'healthcare'
  | 'other'
  | '';

export interface IntakeFormData {
  // Step 1: Dispute Type
  disputeType: DisputeTypeValue;
  disputeTypeOther?: string;

  // Step 2: Parties
  yourName: string;
  yourRole: IntakePartyRole;
  yourFirstName: string;
  yourLastName: string;
  yourCompanyTitle: string;
  yourTaxOffice: string;
  yourTaxNumber: string;
  yourAddress: string;
  yourContactInfo: string;
  yourPhone: string;
  yourEmail: string;
  otherPartyName: string;
  otherPartyRole: IntakePartyRole;
  otherPartyFirstName: string;
  otherPartyLastName: string;
  otherPartyCompanyTitle: string;
  otherPartyTaxOffice: string;
  otherPartyTaxNumber: string;
  otherPartyAddress: string;
  otherPartyContactInfo: string;
  otherPartyPhone: string;
  otherPartyEmail: string;
  additionalParties: IntakePartyDetails[];
  relationship: string;


  // Step 3: What Happened
  issueDescription: string;
  timeline: string;
  attemptedResolution: string;

  // Step 4: Desired Outcome
  desiredOutcome: string;
  priorities: string[];
  openToCompromise: boolean;

  // Step 5: Documents (optional)
  documents: File[];
  additionalNotes: string;
}

export interface CaseSummary {
  id: string;
  createdAt: Date;
  disputeType: string;
  parties: {
    initiator: string;
    respondent: string;
  };
  coreThemes: string[];
  neutralSummary: string;
  keyIssues: string[];
  potentialPathways: string[];
}

export const DISPUTE_TYPES = [
  { value: 'isci_isveren', label: 'İşçi-İşveren', description: 'İş sözleşmesi, kıdem/ihbar tazminatı, işe iade uyuşmazlıkları' },
  { value: 'ticari', label: 'Ticari', description: 'Şirketler arası sözleşme, alacak ve ticaret hukuku uyuşmazlıkları' },
  { value: 'tuketici', label: 'Tüketici', description: 'Ayıplı mal/hizmet, abonelik, satış sözleşmesi uyuşmazlıkları' },
  { value: 'kira', label: 'Kira', description: 'Kira bedeli, tahliye, depozito uyuşmazlıkları' },
  { value: 'ortaklik', label: 'Ortaklığın Giderilmesi', description: 'Şirket veya paydaşlık ortaklığının sona erdirilmesi' },
  { value: 'fikri_mulkiyet', label: 'Fikri Mülkiyet', description: 'Patent, marka, telif hakkı ve ticari sır uyuşmazlıkları' },
  { value: 'saglik', label: 'Sağlık / Malpraktis', description: 'Hekim/hastane sorumluluğu, tıbbi müdahale uyuşmazlıkları' },
  { value: 'sigorta', label: 'Sigorta', description: 'Poliçe, hasar ve tazminat uyuşmazlıkları' },
  { value: 'aile', label: 'Aile', description: 'Boşanma sonrası mal paylaşımı, nafaka gibi ihtiyari konular' },
  { value: 'diger', label: 'Diğer', description: 'Yukarıdakilere girmeyen durumu açıklayın' },
] as const;

export const PRIORITY_OPTIONS = [
  { value: 'financial', label: 'Financial Resolution' },
  { value: 'relationship', label: 'Preserve Relationship' },
  { value: 'speed', label: 'Quick Resolution' },
  { value: 'privacy', label: 'Privacy & Confidentiality' },
  { value: 'clarity', label: 'Clear Understanding' },
  { value: 'apology', label: 'Acknowledgment or Apology' },
] as const;

export const initialFormData: IntakeFormData = {
  disputeType: '',
  disputeTypeOther: '',
  yourName: '',
  yourRole: '',
  yourFirstName: '',
  yourLastName: '',
  yourCompanyTitle: '',
  yourTaxOffice: '',
  yourTaxNumber: '',
  yourAddress: '',
  yourContactInfo: '',
  yourPhone: '',
  yourEmail: '',
  otherPartyName: '',
  otherPartyRole: '',
  otherPartyFirstName: '',
  otherPartyLastName: '',
  otherPartyCompanyTitle: '',
  otherPartyTaxOffice: '',
  otherPartyTaxNumber: '',
  otherPartyAddress: '',
  otherPartyContactInfo: '',
  otherPartyPhone: '',
  otherPartyEmail: '',
  additionalParties: [],
  relationship: '',

  issueDescription: '',
  timeline: '',
  attemptedResolution: '',
  desiredOutcome: '',
  priorities: [],
  openToCompromise: true,
  documents: [],
  additionalNotes: '',
};
