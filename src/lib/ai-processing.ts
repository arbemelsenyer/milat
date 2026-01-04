import { IntakeFormData, CaseSummary } from '@/types/intake';

// Simulates AI processing of intake data
// In production, this would call an actual AI service
export function generateCaseSummary(data: IntakeFormData): CaseSummary {
  const disputeTypeLabels: Record<string, string> = {
    commercial: 'Commercial Dispute',
    ip: 'Intellectual Property Dispute',
    healthcare: 'Healthcare-Related Dispute',
    other: data.disputeTypeOther || 'General Dispute',
  };

  // Extract core themes from the description
  const coreThemes = extractThemes(data.issueDescription, data.desiredOutcome);

  // Generate neutral summary
  const neutralSummary = generateNeutralSummary(data);

  // Identify key issues
  const keyIssues = identifyKeyIssues(data);

  // Suggest potential pathways
  const potentialPathways = suggestPathways(data);

  return {
    id: `CASE-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date(),
    disputeType: disputeTypeLabels[data.disputeType] || 'Dispute',
    parties: {
      initiator: data.yourName || 'Initiating Party',
      respondent: data.otherPartyName || 'Other Party',
    },
    coreThemes,
    neutralSummary,
    keyIssues,
    potentialPathways,
  };
}

function extractThemes(description: string, outcome: string): string[] {
  const themes: string[] = [];
  const combined = (description + ' ' + outcome).toLowerCase();

  const themeKeywords: Record<string, string[]> = {
    'Communication Breakdown': ['communication', 'misunderstanding', 'unclear', 'miscommunication'],
    'Contractual Concerns': ['contract', 'agreement', 'terms', 'breach', 'promised'],
    'Financial Matters': ['payment', 'money', 'cost', 'fees', 'compensation', 'refund'],
    'Trust & Expectations': ['trust', 'expected', 'disappointed', 'reliable', 'integrity'],
    'Timeline & Delivery': ['delay', 'late', 'deadline', 'schedule', 'time'],
    'Quality Standards': ['quality', 'standard', 'defect', 'poor', 'unsatisfactory'],
  };

  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    if (keywords.some(keyword => combined.includes(keyword))) {
      themes.push(theme);
    }
  }

  // Always include at least one theme
  if (themes.length === 0) {
    themes.push('Disputed Matters');
  }

  return themes.slice(0, 4);
}

function generateNeutralSummary(data: IntakeFormData): string {
  const initiator = data.yourName || 'The initiating party';
  const respondent = data.otherPartyName || 'the other party';
  const relationship = data.relationship || 'a professional relationship';

  let summary = `${initiator} and ${respondent} share ${relationship}. `;

  if (data.issueDescription) {
    // Remove accusatory language and reframe neutrally
    const neutralDescription = neutralizeLanguage(data.issueDescription);
    summary += `A disagreement has arisen concerning ${neutralDescription}. `;
  }

  if (data.attemptedResolution) {
    summary += `Previous resolution attempts have included direct discussion. `;
  }

  summary += `Both parties appear interested in finding a constructive path forward.`;

  return summary;
}

function neutralizeLanguage(text: string): string {
  // Remove or soften accusatory phrases
  let neutral = text
    .replace(/they refused/gi, 'there was disagreement about')
    .replace(/they failed/gi, 'expectations were not met regarding')
    .replace(/they lied/gi, 'there are differing accounts of')
    .replace(/their fault/gi, 'an issue arose')
    .replace(/unfair/gi, 'concerning')
    .replace(/terrible/gi, 'challenging')
    .replace(/worst/gi, 'difficult')
    .replace(/cheated/gi, 'a dispute occurred regarding')
    .replace(/stupid/gi, 'unclear')
    .replace(/incompetent/gi, 'performance concerns about');

  // Truncate and clean up
  if (neutral.length > 200) {
    neutral = neutral.substring(0, 200) + '...';
  }

  return neutral.toLowerCase();
}

function identifyKeyIssues(data: IntakeFormData): string[] {
  const issues: string[] = [];

  if (data.disputeType === 'commercial') {
    issues.push('Clarification of contractual obligations');
    issues.push('Assessment of financial impacts');
  } else if (data.disputeType === 'ip') {
    issues.push('Intellectual property rights and ownership');
    issues.push('Usage and licensing considerations');
  } else if (data.disputeType === 'healthcare') {
    issues.push('Healthcare service expectations');
    issues.push('Documentation and communication review');
  }

  if (data.priorities.includes('financial')) {
    issues.push('Financial resolution and compensation');
  }
  if (data.priorities.includes('relationship')) {
    issues.push('Restoration of working relationship');
  }

  // Ensure we have at least 2 issues
  if (issues.length < 2) {
    issues.push('Clear communication of each party\'s perspective');
    issues.push('Identification of mutually acceptable outcomes');
  }

  return issues.slice(0, 4);
}

function suggestPathways(data: IntakeFormData): string[] {
  const pathways: string[] = [];

  if (data.openToCompromise) {
    pathways.push('Facilitated dialogue session with neutral mediator');
  }

  pathways.push('Structured exchange of perspectives in writing');
  pathways.push('Joint problem-solving session');

  if (data.priorities.includes('speed')) {
    pathways.push('Expedited single-session mediation');
  }

  if (data.priorities.includes('privacy')) {
    pathways.push('Confidential mediation with NDA protection');
  }

  return pathways.slice(0, 3);
}
