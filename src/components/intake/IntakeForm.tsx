import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IntakeFormData, initialFormData } from '@/types/intake';
import { StepIndicator } from './StepIndicator';
import {
  Step1DisputeType,
  Step2Parties,
  Step3WhatHappened,
  Step4DesiredOutcome,
  Step5Documents,
} from './steps';
import StepNextStepDecision from './steps/StepNextStepDecision';
import StepAiExploration from './steps/StepAiExploration';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { generateCaseSummary } from '@/lib/ai-processing';
import { useToast } from '@/hooks/use-toast';
import type { CaseFile, NextStepChoice, AiOption } from '@/types/mediation';

const STEP_LABELS = ['Dispute Type', 'Parties', 'What Happened', 'Outcome', 'Documents'];

type FlowPhase = 'intake' | 'decision' | 'ai_exploration' | 'complete';

export function IntakeForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<IntakeFormData>(initialFormData);
  const [isProcessing, setIsProcessing] = useState(false);
  const [flowPhase, setFlowPhase] = useState<FlowPhase>('intake');
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const updateFormData = (updates: Partial<IntakeFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const validateStep = (): boolean => {
    switch (currentStep) {
      case 0:
        if (!formData.disputeType) {
          toast({
            title: 'Please select a dispute type',
            description: 'This helps us understand your situation better.',
            variant: 'destructive',
          });
          return false;
        }
        if (formData.disputeType === 'other' && !formData.disputeTypeOther?.trim()) {
          toast({
            title: 'Please describe your dispute type',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      case 1:
        if (!formData.yourName.trim() || !formData.otherPartyName.trim()) {
          toast({
            title: 'Please provide both party names',
            description: 'We need to know who is involved.',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      case 2:
        if (!formData.issueDescription.trim()) {
          toast({
            title: 'Please describe what happened',
            description: 'Share your perspective on the situation.',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      case 3:
        if (!formData.desiredOutcome.trim()) {
          toast({
            title: 'Please describe your desired outcome',
            description: 'What would resolution look like for you?',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;

    if (currentStep < STEP_LABELS.length - 1) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (flowPhase === 'ai_exploration') {
      setFlowPhase('decision');
      return;
    }
    if (flowPhase === 'decision') {
      setFlowPhase('intake');
      setCurrentStep(STEP_LABELS.length - 1);
      return;
    }
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setIsProcessing(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const summary = generateCaseSummary(formData);
      
      // Create CaseFile for the decision flow
      const newCaseFile: CaseFile = {
        intake: {
          disputeType: formData.disputeType as CaseFile['intake']['disputeType'],
          parties: {
            selfName: formData.yourName,
            otherName: formData.otherPartyName,
            relationship: formData.relationship,
          },
          narrative: formData.issueDescription,
          desiredOutcomes: [formData.desiredOutcome],
        },
        summary: {
          neutralSummary: summary.neutralSummary,
          themes: summary.coreThemes,
          needs: summary.keyIssues,
          clarifyingQuestions: summary.potentialPathways,
        },
        status: 'structured',
      };
      
      setCaseFile(newCaseFile);
      sessionStorage.setItem('caseSummary', JSON.stringify(summary));
      sessionStorage.setItem('intakeData', JSON.stringify(formData));
      
      setFlowPhase('decision');
    } catch (error) {
      toast({
        title: 'Something went wrong',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNextStepChoice = (choice: NextStepChoice) => {
    if (!caseFile) return;
    
    setCaseFile({ ...caseFile, chosenPath: choice, status: 'decision' });
    
    if (choice === 'ai_exploration') {
      setFlowPhase('ai_exploration');
    } else {
      // Human mediator path - navigate to summary
      navigate('/summary');
    }
  };

  const handleAiFeedback = (feedback: Record<string, 'good' | 'maybe' | 'no'>) => {
    if (!caseFile) return;
    setCaseFile({ ...caseFile, aiFeedback: feedback, status: 'ai_done' });
  };

  const handleAiComplete = () => {
    navigate('/summary');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <Step1DisputeType data={formData} onChange={updateFormData} />;
      case 1:
        return <Step2Parties data={formData} onChange={updateFormData} />;
      case 2:
        return <Step3WhatHappened data={formData} onChange={updateFormData} />;
      case 3:
        return <Step4DesiredOutcome data={formData} onChange={updateFormData} />;
      case 4:
        return <Step5Documents data={formData} onChange={updateFormData} />;
      default:
        return null;
    }
  };

  const isLastStep = currentStep === STEP_LABELS.length - 1;

  // Render decision or AI exploration phases
  if (flowPhase === 'decision' && caseFile) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container max-w-3xl py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to home
              </button>
              <span className="text-sm text-muted-foreground">Decision</span>
            </div>
          </div>
        </header>
        <main className="container max-w-2xl py-8 px-4">
          <StepNextStepDecision
            caseFile={caseFile}
            onChoose={handleNextStepChoice}
            onBack={handleBack}
          />
        </main>
      </div>
    );
  }

  if (flowPhase === 'ai_exploration' && caseFile) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container max-w-3xl py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to home
              </button>
              <span className="text-sm text-muted-foreground">AI Exploration</span>
            </div>
          </div>
        </header>
        <main className="container max-w-2xl py-8 px-4">
          <StepAiExploration
            caseFile={caseFile}
            onFeedbackChange={handleAiFeedback}
            onComplete={handleAiComplete}
            onBack={handleBack}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-3xl py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to home
            </button>
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {STEP_LABELS.length}
            </span>
          </div>
          <StepIndicator
            currentStep={currentStep}
            totalSteps={STEP_LABELS.length}
            labels={STEP_LABELS}
          />
        </div>
      </header>

      {/* Form content */}
      <main className="container max-w-2xl py-8 px-4">
        {renderStep()}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-10 pt-6 border-t border-border">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleSubmit}
              disabled={isProcessing}
              className="gap-2 min-w-[140px]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Submit Intake'
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} className="gap-2">
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
