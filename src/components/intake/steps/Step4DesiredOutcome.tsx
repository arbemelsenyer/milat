import { IntakeFormData } from '@/types/intake';
import { FormField } from '../FormField';
import { CheckboxGroup } from '../CheckboxGroup';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';

interface Step4Props {
  data: IntakeFormData;
  onChange: (updates: Partial<IntakeFormData>) => void;
}

export function Step4DesiredOutcome({ data, onChange }: Step4Props) {
  const { t } = useLanguage();

  const priorityOptions = [
    { value: 'financial', label: t('step4.financial') },
    { value: 'relationship', label: t('step4.relationship') },
    { value: 'speed', label: t('step4.speed') },
    { value: 'privacy', label: t('step4.privacy') },
    { value: 'clarity', label: t('step4.clarity') },
    { value: 'apology', label: t('step4.apology') },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-semibold text-foreground">
          {t('step4.title')}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t('step4.description')}
        </p>
      </div>

      <FormField
        label={t('step4.idealOutcome')}
        description={t('step4.idealOutcomeDesc')}
        required
      >
        <Textarea
          value={data.desiredOutcome}
          onChange={(e) => onChange({ desiredOutcome: e.target.value })}
          placeholder={t('step4.idealOutcomePlaceholder')}
          className="min-h-[120px]"
        />
      </FormField>

      <FormField
        label={t('step4.priorities')}
        description={t('step4.prioritiesDesc')}
      >
        <CheckboxGroup
          options={priorityOptions}
          selected={data.priorities}
          onChange={(priorities) => onChange({ priorities })}
          maxSelections={3}
        />
      </FormField>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-foreground">{t('step4.compromise')}</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {t('step4.compromiseDesc')}
            </p>
          </div>
          <Switch
            checked={data.openToCompromise}
            onCheckedChange={(checked) => onChange({ openToCompromise: checked })}
          />
        </div>
      </div>
    </div>
  );
}
