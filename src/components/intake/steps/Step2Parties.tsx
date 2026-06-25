import { emptyIntakePartyDetails, IntakeFormData, IntakePartyDetails } from '@/types/intake';
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
  const updateAdditional = (i: number, patch: Partial<IntakePartyDetails>) => {
    const next = [...additional];
    next[i] = { ...next[i], ...patch };
    onChange({ additionalParties: next });
  };
  const addParty = () => onChange({ additionalParties: [...additional, emptyIntakePartyDetails()] });
  const removeParty = (i: number) => onChange({ additionalParties: additional.filter((_, idx) => idx !== i) });

  const yourParty: IntakePartyDetails = {
    name: data.yourName,
    role: data.yourRole,
    firstName: data.yourFirstName,
    lastName: data.yourLastName,
    companyTitle: data.yourCompanyTitle,
    taxOffice: data.yourTaxOffice,
    taxNumber: data.yourTaxNumber,
    address: data.yourAddress,
    contactInfo: data.yourContactInfo,
    phone: data.yourPhone,
    email: data.yourEmail,
  };

  const otherParty: IntakePartyDetails = {
    name: data.otherPartyName,
    role: data.otherPartyRole,
    firstName: data.otherPartyFirstName,
    lastName: data.otherPartyLastName,
    companyTitle: data.otherPartyCompanyTitle,
    taxOffice: data.otherPartyTaxOffice,
    taxNumber: data.otherPartyTaxNumber,
    address: data.otherPartyAddress,
    contactInfo: data.otherPartyContactInfo,
    phone: data.otherPartyPhone,
    email: data.otherPartyEmail,
  };

  const updateYourParty = (patch: Partial<IntakePartyDetails>) => {
    onChange({
      ...(patch.name !== undefined && { yourName: patch.name }),
      ...(patch.role !== undefined && { yourRole: patch.role }),
      ...(patch.firstName !== undefined && { yourFirstName: patch.firstName }),
      ...(patch.lastName !== undefined && { yourLastName: patch.lastName }),
      ...(patch.companyTitle !== undefined && { yourCompanyTitle: patch.companyTitle }),
      ...(patch.taxOffice !== undefined && { yourTaxOffice: patch.taxOffice }),
      ...(patch.taxNumber !== undefined && { yourTaxNumber: patch.taxNumber }),
      ...(patch.address !== undefined && { yourAddress: patch.address }),
      ...(patch.contactInfo !== undefined && { yourContactInfo: patch.contactInfo }),
      ...(patch.phone !== undefined && { yourPhone: patch.phone }),
      ...(patch.email !== undefined && { yourEmail: patch.email }),
    });
  };

  const updateOtherParty = (patch: Partial<IntakePartyDetails>) => {
    onChange({
      ...(patch.name !== undefined && { otherPartyName: patch.name }),
      ...(patch.role !== undefined && { otherPartyRole: patch.role }),
      ...(patch.firstName !== undefined && { otherPartyFirstName: patch.firstName }),
      ...(patch.lastName !== undefined && { otherPartyLastName: patch.lastName }),
      ...(patch.companyTitle !== undefined && { otherPartyCompanyTitle: patch.companyTitle }),
      ...(patch.taxOffice !== undefined && { otherPartyTaxOffice: patch.taxOffice }),
      ...(patch.taxNumber !== undefined && { otherPartyTaxNumber: patch.taxNumber }),
      ...(patch.address !== undefined && { otherPartyAddress: patch.address }),
      ...(patch.contactInfo !== undefined && { otherPartyContactInfo: patch.contactInfo }),
      ...(patch.phone !== undefined && { otherPartyPhone: patch.phone }),
      ...(patch.email !== undefined && { otherPartyEmail: patch.email }),
    });
  };


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
        <PartyDetailsFields
          party={yourParty}
          onPatch={updateYourParty}
          typeLabel={t('step2.representing')}
          nameLabel={t('step2.yourName')}
          namePlaceholder={t('step2.yourNamePlaceholder')}
        />
      </div>

      {/* Other party information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
          {t('step2.aboutOther')}
        </h3>
        <PartyDetailsFields
          party={otherParty}
          onPatch={updateOtherParty}
          typeLabel={t('step2.otherPartyIs')}
          nameLabel={t('step2.otherName')}
          namePlaceholder={t('step2.otherNamePlaceholder')}
        />
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
          <PartyDetailsFields
            party={p}
            onPatch={(patch) => updateAdditional(i, patch)}
            typeLabel={t('step2.otherPartyIs')}
            nameLabel="Taraf Adı"
            namePlaceholder="Taraf adını girin"
          />
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

function PartyDetailsFields({
  party,
  onPatch,
  typeLabel,
  nameLabel,
  namePlaceholder,
}: {
  party: IntakePartyDetails;
  onPatch: (patch: Partial<IntakePartyDetails>) => void;
  typeLabel: string;
  nameLabel: string;
  namePlaceholder: string;
}) {
  return (
    <div className="space-y-4">
      <FormField label={nameLabel} required>
        <Input
          value={party.name}
          onChange={(e) => onPatch({ name: e.target.value })}
          placeholder={namePlaceholder}
          maxLength={160}
        />
      </FormField>

      <FormField label={typeLabel}>
        <div className="grid grid-cols-2 gap-3">
          <SelectableCard
            selected={party.role === 'individual'}
            onClick={() => onPatch({ role: 'individual' })}
            title="Bireysel"
            icon={<User className="w-4 h-4" />}
          />
          <SelectableCard
            selected={party.role === 'business'}
            onClick={() => onPatch({ role: 'business' })}
            title="Kurumsal"
            icon={<Building2 className="w-4 h-4" />}
          />
        </div>
      </FormField>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Ad">
          <Input value={party.firstName} onChange={(e) => onPatch({ firstName: e.target.value })} maxLength={100} />
        </FormField>
        <FormField label="Soyad">
          <Input value={party.lastName} onChange={(e) => onPatch({ lastName: e.target.value })} maxLength={100} />
        </FormField>
        <FormField label="Şirket Ünvanı">
          <Input value={party.companyTitle} onChange={(e) => onPatch({ companyTitle: e.target.value })} maxLength={180} />
        </FormField>
        <FormField label="Vergi Dairesi">
          <Input value={party.taxOffice} onChange={(e) => onPatch({ taxOffice: e.target.value })} maxLength={120} />
        </FormField>
        <FormField label="Vergi No">
          <Input value={party.taxNumber} onChange={(e) => onPatch({ taxNumber: e.target.value })} maxLength={32} />
        </FormField>
        <FormField label="İletişim Bilgileri">
          <Input value={party.contactInfo} onChange={(e) => onPatch({ contactInfo: e.target.value })} maxLength={180} />
        </FormField>
        <FormField label="Telefon">
          <Input value={party.phone} onChange={(e) => onPatch({ phone: e.target.value })} maxLength={32} />
        </FormField>
        <FormField label="E-posta Adresi">
          <Input type="email" value={party.email} onChange={(e) => onPatch({ email: e.target.value })} maxLength={255} />
        </FormField>
        <FormField label="Adres">
          <Textarea
            value={party.address}
            onChange={(e) => onPatch({ address: e.target.value })}
            className="min-h-[80px]"
            maxLength={500}
          />
        </FormField>
      </div>
    </div>
  );
}
