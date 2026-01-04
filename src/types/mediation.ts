export type DisputeType = "commercial" | "ip" | "health" | "other";

export type NextStepChoice = "ai_exploration" | "human_mediator";

export interface IntakeData {
  disputeType?: DisputeType;
  parties?: {
    selfName?: string;
    otherName?: string;
    relationship?: string;
  };
  narrative?: string;
  desiredOutcomes?: string[];
}

export interface StructuredSummary {
  neutralSummary: string;
  themes: string[];
  needs: string[];
  clarifyingQuestions: string[];
}

export interface AiOption {
  id: string;
  title: string;
  description: string;
  tradeoffs: string[];
}

export interface CaseFile {
  intake: IntakeData;
  summary: StructuredSummary;
  chosenPath?: NextStepChoice;
  aiOptions?: AiOption[];
  aiFeedback?: Record<string, "good" | "maybe" | "no">;
  status: "draft" | "structured" | "decision" | "ai_done" | "submitted";
}

export function canProceedToDecision(caseFile: Partial<CaseFile>) {
  return Boolean(caseFile.intake && caseFile.summary?.neutralSummary);
}
