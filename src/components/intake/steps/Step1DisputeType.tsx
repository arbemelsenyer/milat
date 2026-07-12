import { IntakeFormData } from '@/types/intake';
import { FormField } from '../FormField';
import { SelectableCard } from '../SelectableCard';
import { Textarea } from '@/components/ui/textarea';
import {
  Briefcase,
  Building2,
  ShoppingCart,
  Home,
  Users,
  Lightbulb,
  HeartPulse,
  ShieldCheck,
  HeartHandshake,
  HelpCircle,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Step1Props {
  data: IntakeFormData;
  onChange: (updates: Partial<IntakeFormData>) => void;
}

const disputeIcons = {
  isci_isveren: Briefcase,
  ticari: Building2,
  tuketici: ShoppingCart,
  kira: Home,
  ortaklik: Users,
  fikri_mulkiyet: Lightbulb,
  saglik: HeartPulse,
  sigorta: ShieldCheck,
  aile: HeartHandshake,
  diger: HelpCircle,
};

// Türk arabuluculuk taksonomisi — value'lar StepMediationType'ın dava şartı rozet
// eşlemesiyle birebir aynı olmalı (isci_isveren/ticari/tuketici/kira/ortaklik).
const disputeTypes = [
  { value: 'isci_isveren' as const, label: 'İşçi-İşveren', description: 'İş sözleşmesi, kıdem/ihbar tazminatı, işe iade uyuşmazlıkları' },
  { value: 'ticari' as const, label: 'Ticari', description: 'Şirketler arası sözleşme, alacak ve ticaret hukuku uyuşmazlıkları' },
  { value: 'tuketici' as const, label: 'Tüketici', description: 'Ayıplı mal/hizmet, abonelik, satış sözleşmesi uyuşmazlıkları' },
  { value: 'kira' as const, label: 'Kira', description: 'Kira bedeli, tahliye, depozito uyuşmazlıkları' },
  { value: 'ortaklik' as const, label: 'Ortaklığın Giderilmesi', description: 'Şirket veya paydaşlık ortaklığının sona erdirilmesi' },
  { value: 'fikri_mulkiyet' as const, label: 'Fikri Mülkiyet', description: 'Patent, marka, telif hakkı ve ticari sır uyuşmazlıkları' },
  { value: 'saglik' as const, label: 'Sağlık / Malpraktis', description: 'Hekim/hastane sorumluluğu, tıbbi müdahale uyuşmazlıkları' },
  { value: 'sigorta' as const, label: 'Sigorta', description: 'Poliçe, hasar ve tazminat uyuşmazlıkları' },
  { value: 'aile' as const, label: 'Aile', description: 'Boşanma sonrası mal paylaşımı, nafaka gibi ihtiyari konular' },
  { value: 'diger' as const, label: 'Diğer', description: 'Yukarıdakilere girmeyen durumu açıklayın' },
];

export function Step1DisputeType({ data, onChange }: Step1Props) {
  const { t } = useLanguage();

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

      {data.disputeType === 'diger' && (
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
