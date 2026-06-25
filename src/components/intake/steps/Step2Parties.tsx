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

  const additional = data.additionalParties ?? [];
  const updateAdditional = (i: number, patch: Partial<{ name: string; role: 'individual' | 'business' | '' }>) => {
    const next = [...additional];
    next[i] = { ...next[i], ...patch };
    onChange({ additionalParties: next });
  };
  const addParty = () => onChange({ additionalParties: [...additional, { name: '', role: '' }] });
  const removeParty = (i: number) => onChange({ additionalParties: additional.filter((_, idx) => idx !== i) });


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

      {/* Additional parties (dynamic, unlimited) */}
      {additional.map((p, i) => (
        <div key={i} className="space-y-4 relative border border-border rounded-lg p-4">
          <button
            type="button"
            onClick={() => removeParty(i)}
            aria-label={`Taraf ${i + 3} sil`}
            className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </button>
          <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
            Taraf {i + 3}
          </h3>
          <FormField label={t('step2.otherName')} required>
            <Input
              value={p.name}
              onChange={(e) => updateAdditional(i, { name: e.target.value })}
              placeholder={t('step2.otherNamePlaceholder')}
            />
          </FormField>
          <FormField label={t('step2.otherPartyIs')}>
            <div className="grid grid-cols-2 gap-3">
              <SelectableCard
                selected={p.role === 'individual'}
                onClick={() => updateAdditional(i, { role: 'individual' })}
                title={t('step2.individual')}
                icon={<User className="w-4 h-4" />}
              />
              <SelectableCard
                selected={p.role === 'business'}
                onClick={() => updateAdditional(i, { role: 'business' })}
                title={t('step2.business')}
                icon={<Building2 className="w-4 h-4" />}
              />
            </div>
          </FormField>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{2 + additional.length} taraf</p>
        <Button
          type="button"
          onClick={addParty}
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white gap-1"
        >
          <Plus className="w-4 h-4" /> Taraf Ekle
        </Button>
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
