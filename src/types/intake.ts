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

export interface IntakeFormData {
  // Step 1: Dispute Type
  disputeType: 'commercial' | 'ip' | 'healthcare' | 'other' | '';
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
  { value: 'commercial', label: 'Commercial Dispute', description: 'Business contracts, partnerships, transactions' },
  { value: 'ip', label: 'Intellectual Property', description: 'Patents, trademarks, copyrights, trade secrets' },
  { value: 'healthcare', label: 'Healthcare', description: 'Medical billing, provider disputes, care disagreements' },
  { value: 'other', label: 'Other', description: 'Describe your situation' },
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
