import { Scale, Handshake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IntakeFormData } from '@/types/intake';

export type MediationTypeValue = 'dava_sarti' | 'ihtiyari' | '';

interface StepMediationTypeProps {
  disputeType: IntakeFormData['disputeType'];
  value: MediationTypeValue;
  onChange: (value: 'dava_sarti' | 'ihtiyari') => void;
}

// Step1DisputeType'ın Türk arabuluculuk taksonomisiyle birebir aynı 5 dava şartı
// grubu (aynı kapsam generate-official-document/index.ts'teki disputeGroup()'ta da
// kullanılıyor). Step1 artık temiz slug'lar ürettiği için doğrudan eşleşme yeterli —
// fikri_mulkiyet/saglik/sigorta/aile/diger bu kapsamın dışında (kart metnindeki 5
// kategoriyle tutarlı: işçi-işveren, ticari, tüketici, kira, ortaklık).
const DAVA_SARTI_SUGGESTED_TYPES = new Set([
  'isci_isveren',
  'ticari',
  'tuketici',
  'kira',
  'ortaklik',
]);

function isDavaSartiSuggested(disputeType: string): boolean {
  return DAVA_SARTI_SUGGESTED_TYPES.has(disputeType);
}

export function StepMediationType({ disputeType, value, onChange }: StepMediationTypeProps) {
  const suggestDavaSarti = isDavaSartiSuggested(disputeType || '');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-semibold text-foreground">
          Arabuluculuk Türü
        </h2>
        <p className="text-muted-foreground mt-2">
          Başvurunuzun hangi arabuluculuk türüne göre yürütüleceğini seçin.
        </p>
      </div>

      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => onChange('dava_sarti')}
          className={cn(
            'relative w-full p-4 rounded-lg border-2 text-left transition-all duration-200',
            'hover:border-primary/50 hover:bg-primary/5',
            'focus:outline-none focus:ring-2 focus:ring-primary/20',
            value === 'dava_sarti' ? 'border-primary bg-primary/10' : 'border-border bg-card'
          )}
        >
          {suggestDavaSarti && (
            <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              💡 Önerilen
            </span>
          )}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                value === 'dava_sarti' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              )}
            >
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className={cn('font-medium', value === 'dava_sarti' ? 'text-primary' : 'text-foreground')}>
                Dava Şartı (Zorunlu) Arabuluculuk
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Dava açmadan önce kanunen zorunludur — işçi-işveren, ticari, tüketici, kira ve ortaklık uyuşmazlıklarında dava şartıdır.
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange('ihtiyari')}
          className={cn(
            'w-full p-4 rounded-lg border-2 text-left transition-all duration-200',
            'hover:border-primary/50 hover:bg-primary/5',
            'focus:outline-none focus:ring-2 focus:ring-primary/20',
            value === 'ihtiyari' ? 'border-primary bg-primary/10' : 'border-border bg-card'
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                value === 'ihtiyari' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              )}
            >
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className={cn('font-medium', value === 'ihtiyari' ? 'text-primary' : 'text-foreground')}>
                İhtiyari Arabuluculuk
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Kanunen zorunlu değildir — taraflar kendi iradeleriyle, dava şartı aranmaksızın başvurur.
              </p>
            </div>
          </div>
        </button>
      </div>

      {!value && (
        <p className="text-sm text-muted-foreground text-center">
          Devam etmek için bir arabuluculuk türü seçmelisiniz.
        </p>
      )}
    </div>
  );
}

export default StepMediationType;
