import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CalendarClock, Check, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';

interface RescheduleItem {
  id: string;
  mediator_request_id: string;
  proposed_date: string;
  reason: string | null;
  status: string;
  created_at: string;
}

export function RescheduleApproval() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RescheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchPendingRequests();
  }, [user]);

  const fetchPendingRequests = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('reschedule_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data as RescheduleItem[]);
    }
    setIsLoading(false);
  };

  const handleDecision = async (id: string, approved: boolean, mediatorRequestId: string, proposedDate: string) => {
    setProcessingId(id);

    const { error } = await supabase
      .from('reschedule_requests')
      .update({ status: approved ? 'approved' : 'rejected' })
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: language === 'tr' ? 'Hata' : 'Error', description: error.message });
      setProcessingId(null);
      return;
    }

    if (approved) {
      await supabase
        .from('mediator_requests')
        .update({ scheduled_date: proposedDate })
        .eq('id', mediatorRequestId);
    }

    toast({
      title: approved
        ? (language === 'tr' ? 'Onaylandı' : 'Approved')
        : (language === 'tr' ? 'Reddedildi' : 'Rejected'),
      description: approved
        ? (language === 'tr' ? 'Oturum yeni tarihe güncellendi.' : 'Session updated to the new date.')
        : (language === 'tr' ? 'Yeniden planlama talebi reddedildi.' : 'Reschedule request was rejected.'),
    });

    setProcessingId(null);
    fetchPendingRequests();
  };

  if (isLoading) return null;
  if (requests.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarClock className="w-5 h-5" />
          {language === 'tr' ? 'Yeniden Planlama Talepleri' : 'Reschedule Requests'}
          <Badge variant="secondary">{requests.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((req) => (
          <div key={req.id} className="flex items-center justify-between border border-border rounded-lg p-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {format(new Date(req.proposed_date), 'PPp', { locale: language === 'tr' ? tr : enUS })}
              </p>
              {req.reason && (
                <p className="text-xs text-muted-foreground mt-1">{req.reason}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={processingId === req.id}
                onClick={() => handleDecision(req.id, true, req.mediator_request_id, req.proposed_date)}
              >
                {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={processingId === req.id}
                onClick={() => handleDecision(req.id, false, req.mediator_request_id, req.proposed_date)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
