import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Star, Loader2, MessageSquarePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionFeedbackProps {
  requestId: string;
  onSuccess?: () => void;
}

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-0.5 transition-colors"
          >
            <Star
              className={cn(
                'w-6 h-6',
                star <= value ? 'fill-primary text-primary' : 'text-muted-foreground'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function SessionFeedback({ requestId, onSuccess }: SessionFeedbackProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [overallRating, setOverallRating] = useState(0);
  const [mediatorRating, setMediatorRating] = useState(0);
  const [fairnessRating, setFairnessRating] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || overallRating === 0) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from('session_feedback')
      .insert({
        mediator_request_id: requestId,
        user_id: user.id,
        overall_rating: overallRating,
        mediator_rating: mediatorRating || null,
        fairness_rating: fairnessRating || null,
        would_recommend: wouldRecommend,
        comments: comments || null,
      });

    setIsSubmitting(false);

    if (error) {
      const isDuplicate = error.code === '23505';
      toast({
        variant: 'destructive',
        title: language === 'tr' ? 'Hata' : 'Error',
        description: isDuplicate
          ? (language === 'tr' ? 'Bu oturum için zaten geri bildirim verdiniz.' : 'You have already submitted feedback for this session.')
          : error.message,
      });
      return;
    }

    toast({
      title: language === 'tr' ? 'Teşekkürler!' : 'Thank you!',
      description: language === 'tr' ? 'Geri bildiriminiz kaydedildi.' : 'Your feedback has been recorded.',
    });
    setOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquarePlus className="w-4 h-4 mr-2" />
          {language === 'tr' ? 'Geri Bildirim' : 'Feedback'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {language === 'tr' ? 'Oturum Değerlendirmesi' : 'Session Feedback'}
          </DialogTitle>
          <DialogDescription>
            {language === 'tr'
              ? 'Arabuluculuk deneyiminizi değerlendirin.'
              : 'Rate your mediation experience.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-4">
          <StarRating
            value={overallRating}
            onChange={setOverallRating}
            label={language === 'tr' ? 'Genel Deneyim *' : 'Overall Experience *'}
          />
          <StarRating
            value={mediatorRating}
            onChange={setMediatorRating}
            label={language === 'tr' ? 'Arabulucu Performansı' : 'Mediator Performance'}
          />
          <StarRating
            value={fairnessRating}
            onChange={setFairnessRating}
            label={language === 'tr' ? 'Tarafsızlık ve Adalet' : 'Fairness & Neutrality'}
          />
          <div className="flex items-center justify-between">
            <Label>{language === 'tr' ? 'Tavsiye eder misiniz?' : 'Would you recommend?'}</Label>
            <Switch checked={wouldRecommend} onCheckedChange={setWouldRecommend} />
          </div>
          <div className="space-y-2">
            <Label>{language === 'tr' ? 'Yorumlar (isteğe bağlı)' : 'Comments (optional)'}</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={language === 'tr' ? 'Deneyiminiz hakkında...' : 'About your experience...'}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={overallRating === 0 || isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {language === 'tr' ? 'Gönder' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
