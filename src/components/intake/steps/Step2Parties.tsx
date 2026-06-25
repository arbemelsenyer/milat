import { IntakeFormData } from '@/types/intake';
import { FormField } from '../FormField';
import { SelectableCard } from '../SelectableCard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { User, Building2, Plus, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Step2Props {
  data: IntakeFormData;
  onChange: (updates: Partial<IntakeFormData>) => void;
}


export function Step2Parties({ data, onChange }: Step2Props) {
  const { t } = useLanguage();

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-semibold text-foreground">
          {t('step2.title')}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t('step2.description')}
        </p>
      </div>

      {/* Your information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
          {t('step2.aboutYou')}
        </h3>
        
        <FormField label={t('step2.yourName')} required>
          <Input
            value={data.yourName}
            onChange={(e) => onChange({ yourName: e.target.value })}
            placeholder={t('step2.yourNamePlaceholder')}
          />
        </FormField>

        <FormField label={t('step2.representing')}>
          <div className="grid grid-cols-2 gap-3">
            <SelectableCard
              selected={data.yourRole === 'individual'}
              onClick={() => onChange({ yourRole: 'individual' })}
              title={t('step2.individual')}
              icon={<User className="w-4 h-4" />}
            />
            <SelectableCard
              selected={data.yourRole === 'business'}
              onClick={() => onChange({ yourRole: 'business' })}
              title={t('step2.business')}
              icon={<Building2 className="w-4 h-4" />}
            />
          </div>
        </FormField>
      </div>

      {/* Other party information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
          {t('step2.aboutOther')}
        </h3>
        
        <FormField label={t('step2.otherName')} required>
          <Input
            value={data.otherPartyName}
            onChange={(e) => onChange({ otherPartyName: e.target.value })}
            placeholder={t('step2.otherNamePlaceholder')}
          />
        </FormField>

        <FormField label={t('step2.otherPartyIs')}>
          <div className="grid grid-cols-2 gap-3">
            <SelectableCard
              selected={data.otherPartyRole === 'individual'}
              onClick={() => onChange({ otherPartyRole: 'individual' })}
              title={t('step2.individual')}
              icon={<User className="w-4 h-4" />}
            />
            <SelectableCard
              selected={data.otherPartyRole === 'business'}
              onClick={() => onChange({ otherPartyRole: 'business' })}
              title={t('step2.business')}
              icon={<Building2 className="w-4 h-4" />}
            />
          </div>
        </FormField>
      </div>

      {/* Relationship */}
      <FormField
        label={t('step2.relationship')}
        description={t('step2.relationshipDesc')}
      >
        <Textarea
          value={data.relationship}
          onChange={(e) => onChange({ relationship: e.target.value })}
          placeholder={t('step2.relationshipPlaceholder')}
          className="min-h-[80px]"
        />
      </FormField>
    </div>
  );
}
