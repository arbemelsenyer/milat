export interface IntakeFormData {
  // Step 1: Dispute Type
  disputeType: 'commercial' | 'ip' | 'healthcare' | 'other' | '';
  disputeTypeOther?: string;

  // Step 2: Parties
  yourName: string;
  yourRole: 'individual' | 'business' | '';
  otherPartyName: string;
  otherPartyRole: 'individual' | 'business' | '';
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
  otherPartyName: '',
  otherPartyRole: '',
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
