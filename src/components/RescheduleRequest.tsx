import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CalendarClock, Loader2 } from 'lucide-react';

interface RescheduleRequestProps {
  requestId: string;
  currentDate: string | null;
  onSuccess?: () => void;
}

export function RescheduleRequest({ requestId, currentDate, onSuccess }: RescheduleRequestProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [proposedDate, setProposedDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!proposedDate || !user) return;

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from('reschedule_requests')
      .insert({
        mediator_request_id: requestId,
        requested_by: user.id,
        proposed_date: new Date(proposedDate).toISOString(),
        reason: reason || null,
      })
      .select('id')
      .single();

    setIsSubmitting(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: language === 'tr' ? 'Hata' : 'Error',
        description: error.message,
      });
      return;
    }

    toast({
      title: language === 'tr' ? 'Talep gönderildi' : 'Request submitted',
      description: language === 'tr'
        ? 'Yeniden planlama talebiniz arabulucuya iletildi.'
        : 'Your reschedule request has been sent to the mediator.',
    });

    // Send email notification to mediator
    supabase.functions.invoke('send-reschedule-notification', {
      body: { rescheduleRequestId: data?.id || requestId, action: 'submitted', language },
    }).catch(console.error);

    setOpen(false);
    setProposedDate('');
    setReason('');
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarClock className="w-4 h-4 mr-2" />
          {language === 'tr' ? 'Yeniden Planla' : 'Reschedule'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {language === 'tr' ? 'Oturumu Yeniden Planla' : 'Reschedule Session'}
          </DialogTitle>
          <DialogDescription>
            {language === 'tr'
              ? 'Yeni bir tarih önerin. Arabulucunun onayı gereklidir.'
              : 'Propose a new date. Mediator approval is required.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {currentDate && (
            <div className="text-sm text-muted-foreground">
              {language === 'tr' ? 'Mevcut tarih: ' : 'Current date: '}
              <span className="font-medium text-foreground">
                {new Date(currentDate).toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US')}
              </span>
            </div>
          )}
          <div className="space-y-2">
            <Label>{language === 'tr' ? 'Önerilen Tarih ve Saat' : 'Proposed Date & Time'}</Label>
            <Input
              type="datetime-local"
              value={proposedDate}
              onChange={(e) => setProposedDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'tr' ? 'Neden (isteğe bağlı)' : 'Reason (optional)'}</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={language === 'tr' ? 'Neden yeniden planlama istiyorsunuz...' : 'Why do you need to reschedule...'}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!proposedDate || isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {language === 'tr' ? 'Talep Gönder' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
