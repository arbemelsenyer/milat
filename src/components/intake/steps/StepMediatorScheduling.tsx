import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '../FormField';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calendar, Clock, Mail, Phone, CheckCircle } from 'lucide-react';
import type { CaseFile } from '@/types/mediation';

interface Props {
  caseFile: CaseFile;
  onComplete: () => void;
  onBack?: () => void;
}

interface TimeSlot {
  id: string;
  label: string;
  period: 'weekday' | 'weekend';
}

export default function StepMediatorScheduling({ caseFile, onComplete, onBack }: Props) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const timeSlots: TimeSlot[] = [
    { id: 'weekday-morning', label: t('scheduling.morning'), period: 'weekday' },
    { id: 'weekday-afternoon', label: t('scheduling.afternoon'), period: 'weekday' },
    { id: 'weekday-evening', label: t('scheduling.evening'), period: 'weekday' },
    { id: 'weekend-morning', label: t('scheduling.morning'), period: 'weekend' },
    { id: 'weekend-afternoon', label: t('scheduling.afternoon'), period: 'weekend' },
  ];

  const toggleSlot = (slotId: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]
    );
  };

  const handleSubmit = () => {
    // MVP: Just mark as submitted
    setIsSubmitted(true);
    // In production: send to backend
  };

  const isValid = email.trim() && selectedSlots.length >= 2;

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-6"
      >
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-display font-semibold text-foreground mb-3">
            {t('scheduling.success')}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t('scheduling.successDesc')}
          </p>
          <Button onClick={onComplete} className="mt-8">
            {t('common.continue')}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
          <Calendar className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-display font-semibold text-foreground">
          {t('scheduling.title')}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t('scheduling.description')}
        </p>
      </div>

      {/* Contact Information */}
      <Card className="p-5">
        <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          {t('scheduling.yourInfo')}
        </h3>
        <div className="space-y-4">
          <FormField label={t('scheduling.email')} required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('scheduling.emailPlaceholder')}
            />
          </FormField>
          <FormField label={t('scheduling.phone')}>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('scheduling.phonePlaceholder')}
            />
          </FormField>
        </div>
      </Card>

      {/* Time Slots */}
      <Card className="p-5">
        <h3 className="text-lg font-medium text-foreground mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          {t('scheduling.preferredTimes')}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('scheduling.selectSlots')}
        </p>

        <div className="space-y-4">
          {/* Weekdays */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('scheduling.weekdays')}</p>
            <div className="space-y-2">
              {timeSlots
                .filter((slot) => slot.period === 'weekday')
                .map((slot) => (
                  <label
                    key={slot.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedSlots.includes(slot.id)}
                      onCheckedChange={() => toggleSlot(slot.id)}
                    />
                    <span className="text-sm text-foreground">{slot.label}</span>
                  </label>
                ))}
            </div>
          </div>

          {/* Weekends */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('scheduling.weekends')}</p>
            <div className="space-y-2">
              {timeSlots
                .filter((slot) => slot.period === 'weekend')
                .map((slot) => (
                  <label
                    key={slot.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedSlots.includes(slot.id)}
                      onCheckedChange={() => toggleSlot(slot.id)}
                    />
                    <span className="text-sm text-foreground">{slot.label}</span>
                  </label>
                ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Additional Notes */}
      <FormField label={t('scheduling.notes')}>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('scheduling.notesPlaceholder')}
          className="min-h-[100px]"
        />
      </FormField>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-border">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            {t('common.back')}
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={!isValid} className="ml-auto">
          {t('scheduling.submit')}
        </Button>
      </div>
    </motion.div>
  );
}
