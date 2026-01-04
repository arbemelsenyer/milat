import { IntakeFormData } from '@/types/intake';
import { FormField } from '../FormField';
import { Textarea } from '@/components/ui/textarea';

interface Step3Props {
  data: IntakeFormData;
  onChange: (updates: Partial<IntakeFormData>) => void;
}

export function Step3WhatHappened({ data, onChange }: Step3Props) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-semibold text-foreground">
          Tell us what happened
        </h2>
        <p className="text-muted-foreground mt-2">
          Share your perspective. Focus on facts and feelings.
        </p>
      </div>

      {/* Calming guidance box */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
        <p className="text-sm text-foreground">
          <strong className="text-primary">Guidance:</strong> Try to describe what happened 
          from your point of view. It's okay to express how you felt. 
          We'll help present this information in a balanced way.
        </p>
      </div>

      <FormField
        label="What happened?"
        description="Describe the situation that led to this dispute"
        required
      >
        <Textarea
          value={data.issueDescription}
          onChange={(e) => onChange({ issueDescription: e.target.value })}
          placeholder="Describe the events and circumstances that led to this dispute..."
          className="min-h-[150px]"
        />
      </FormField>

      <FormField
        label="When did this happen?"
        description="Approximate timeline or key dates"
      >
        <Textarea
          value={data.timeline}
          onChange={(e) => onChange({ timeline: e.target.value })}
          placeholder="e.g., Started in January 2024, escalated in March..."
          className="min-h-[80px]"
        />
      </FormField>

      <FormField
        label="Have you tried to resolve this before?"
        description="Any previous attempts at resolution"
      >
        <Textarea
          value={data.attemptedResolution}
          onChange={(e) => onChange({ attemptedResolution: e.target.value })}
          placeholder="Describe any conversations, emails, or other attempts to resolve this..."
          className="min-h-[100px]"
        />
      </FormField>
    </div>
  );
}
