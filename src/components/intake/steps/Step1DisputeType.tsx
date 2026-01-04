import { IntakeFormData, DISPUTE_TYPES } from '@/types/intake';
import { FormField } from '../FormField';
import { SelectableCard } from '../SelectableCard';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, Lightbulb, Heart, HelpCircle } from 'lucide-react';

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
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-semibold text-foreground">
          What type of dispute are you facing?
        </h2>
        <p className="text-muted-foreground mt-2">
          Select the category that best describes your situation
        </p>
      </div>

      <div className="grid gap-3">
        {DISPUTE_TYPES.map((type) => {
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
          label="Please describe your dispute type"
          required
        >
          <Textarea
            value={data.disputeTypeOther || ''}
            onChange={(e) => onChange({ disputeTypeOther: e.target.value })}
            placeholder="Briefly describe the nature of your dispute..."
            className="min-h-[80px]"
          />
        </FormField>
      )}
    </div>
  );
}
