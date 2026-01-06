import { IntakeFormData } from '@/types/intake';
import { FormField } from '../FormField';
import { SelectableCard } from '../SelectableCard';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, Lightbulb, Heart, HelpCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Step1Props {
  data: IntakeFormData;
  onChange: (updates: Partial<IntakeFormData>) => void;
}

const disputeIcons = {
  commercial: Briefcase,
  ip: Lightbulb,
  healthcare: Heart,
  other: HelpCircle,
};

export function Step1DisputeType({ data, onChange }: Step1Props) {
  const { t } = useLanguage();

  const disputeTypes = [
    { value: 'commercial' as const, label: t('step1.commercial'), description: t('step1.commercialDesc') },
    { value: 'ip' as const, label: t('step1.ip'), description: t('step1.ipDesc') },
    { value: 'healthcare' as const, label: t('step1.healthcare'), description: t('step1.healthcareDesc') },
    { value: 'other' as const, label: t('step1.other'), description: t('step1.otherDesc') },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-semibold text-foreground">
          {t('step1.title')}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t('step1.description')}
        </p>
      </div>

      <div className="grid gap-3">
        {disputeTypes.map((type) => {
          const Icon = disputeIcons[type.value];
          return (
            <SelectableCard
              key={type.value}
              selected={data.disputeType === type.value}
              onClick={() => onChange({ disputeType: type.value })}
              title={type.label}
              description={type.description}
              icon={<Icon className="w-5 h-5" />}
            />
          );
        })}
      </div>

      {data.disputeType === 'other' && (
        <FormField
          label={t('step1.describeDispute')}
          required
        >
          <Textarea
            value={data.disputeTypeOther || ''}
            onChange={(e) => onChange({ disputeTypeOther: e.target.value })}
            placeholder={t('step1.describePlaceholder')}
            className="min-h-[80px]"
          />
        </FormField>
      )}
    </div>
  );
}
