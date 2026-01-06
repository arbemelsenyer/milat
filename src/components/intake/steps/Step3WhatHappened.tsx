import { IntakeFormData } from '@/types/intake';
import { FormField } from '../FormField';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';

interface Step3Props {
  data: IntakeFormData;
  onChange: (updates: Partial<IntakeFormData>) => void;
}

export function Step3WhatHappened({ data, onChange }: Step3Props) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-semibold text-foreground">
          {t('step3.title')}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t('step3.description')}
        </p>
      </div>

      {/* Calming guidance box */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
        <p className="text-sm text-foreground">
          <strong className="text-primary">{t('step3.guidance')}</strong> {t('step3.guidanceText')}
        </p>
      </div>

      <FormField
        label={t('step3.whatHappened')}
        description={t('step3.whatHappenedDesc')}
        required
      >
        <Textarea
          value={data.issueDescription}
          onChange={(e) => onChange({ issueDescription: e.target.value })}
          placeholder={t('step3.whatHappenedPlaceholder')}
          className="min-h-[150px]"
        />
      </FormField>

      <FormField
        label={t('step3.when')}
        description={t('step3.whenDesc')}
      >
        <Textarea
          value={data.timeline}
          onChange={(e) => onChange({ timeline: e.target.value })}
          placeholder={t('step3.whenPlaceholder')}
          className="min-h-[80px]"
        />
      </FormField>

      <FormField
        label={t('step3.previousAttempts')}
        description={t('step3.previousAttemptsDesc')}
      >
        <Textarea
          value={data.attemptedResolution}
          onChange={(e) => onChange({ attemptedResolution: e.target.value })}
          placeholder={t('step3.previousAttemptsPlaceholder')}
          className="min-h-[100px]"
        />
      </FormField>
    </div>
  );
}
