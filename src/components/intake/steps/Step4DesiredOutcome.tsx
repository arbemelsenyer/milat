import { IntakeFormData, PRIORITY_OPTIONS } from '@/types/intake';
import { FormField } from '../FormField';
import { CheckboxGroup } from '../CheckboxGroup';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface Step4Props {
  data: IntakeFormData;
  onChange: (updates: Partial<IntakeFormData>) => void;
}

export function Step4DesiredOutcome({ data, onChange }: Step4Props) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-semibold text-foreground">
          What outcome are you hoping for?
        </h2>
        <p className="text-muted-foreground mt-2">
          Understanding your goals helps us find the right path forward
        </p>
      </div>

      <FormField
        label="Describe your ideal outcome"
        description="What would resolution look like for you?"
        required
      >
        <Textarea
          value={data.desiredOutcome}
          onChange={(e) => onChange({ desiredOutcome: e.target.value })}
          placeholder="Describe what you would consider a successful resolution..."
          className="min-h-[120px]"
        />
      </FormField>

      <FormField
        label="What matters most to you?"
        description="Select up to 3 priorities"
      >
        <CheckboxGroup
          options={PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label }))}
          selected={data.priorities}
          onChange={(priorities) => onChange({ priorities })}
          maxSelections={3}
        />
      </FormField>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-foreground">Open to compromise?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Are you willing to find middle ground if needed?
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
