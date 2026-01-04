import { IntakeFormData } from '@/types/intake';
import { FormField } from '../FormField';
import { SelectableCard } from '../SelectableCard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { User, Building2 } from 'lucide-react';

interface Step2Props {
  data: IntakeFormData;
  onChange: (updates: Partial<IntakeFormData>) => void;
}

export function Step2Parties({ data, onChange }: Step2Props) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-semibold text-foreground">
          Who is involved?
        </h2>
        <p className="text-muted-foreground mt-2">
          Help us understand the parties in this dispute
        </p>
      </div>

      {/* Your information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
          About You
        </h3>
        
        <FormField label="Your name or organization" required>
          <Input
            value={data.yourName}
            onChange={(e) => onChange({ yourName: e.target.value })}
            placeholder="Enter your name or organization name"
          />
        </FormField>

        <FormField label="You are representing">
          <div className="grid grid-cols-2 gap-3">
            <SelectableCard
              selected={data.yourRole === 'individual'}
              onClick={() => onChange({ yourRole: 'individual' })}
              title="Individual"
              icon={<User className="w-4 h-4" />}
            />
            <SelectableCard
              selected={data.yourRole === 'business'}
              onClick={() => onChange({ yourRole: 'business' })}
              title="Business"
              icon={<Building2 className="w-4 h-4" />}
            />
          </div>
        </FormField>
      </div>

      {/* Other party information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
          About the Other Party
        </h3>
        
        <FormField label="Other party's name or organization" required>
          <Input
            value={data.otherPartyName}
            onChange={(e) => onChange({ otherPartyName: e.target.value })}
            placeholder="Enter the other party's name"
          />
        </FormField>

        <FormField label="The other party is">
          <div className="grid grid-cols-2 gap-3">
            <SelectableCard
              selected={data.otherPartyRole === 'individual'}
              onClick={() => onChange({ otherPartyRole: 'individual' })}
              title="Individual"
              icon={<User className="w-4 h-4" />}
            />
            <SelectableCard
              selected={data.otherPartyRole === 'business'}
              onClick={() => onChange({ otherPartyRole: 'business' })}
              title="Business"
              icon={<Building2 className="w-4 h-4" />}
            />
          </div>
        </FormField>
      </div>

      {/* Relationship */}
      <FormField
        label="How would you describe your relationship?"
        description="e.g., business partners, client-vendor, employer-employee"
      >
        <Textarea
          value={data.relationship}
          onChange={(e) => onChange({ relationship: e.target.value })}
          placeholder="Describe your relationship with the other party..."
          className="min-h-[80px]"
        />
      </FormField>
    </div>
  );
}
