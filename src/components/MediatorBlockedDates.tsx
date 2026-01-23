import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Plus, Trash2, Loader2, CalendarOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';

interface BlockedDate {
  id: string;
  mediator_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
}

export function MediatorBlockedDates() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const labels = {
    tr: {
      title: 'Müsait Olmayan Tarihler',
      description: 'Tatil, izin veya diğer nedenlerle müsait olmadığınız tarihleri ekleyin.',
      addDate: 'Tarih Ekle',
      startDate: 'Başlangıç Tarihi',
      endDate: 'Bitiş Tarihi',
      reason: 'Neden (isteğe bağlı)',
      reasonPlaceholder: 'Örn: Yıllık izin, tatil...',
      cancel: 'İptal',
      save: 'Kaydet',
      noBlockedDates: 'Henüz engellenmiş tarih yok',
      delete: 'Sil',
      saving: 'Kaydediliyor...',
      success: 'Tarih başarıyla eklendi',
      deleteSuccess: 'Tarih silindi',
      error: 'Bir hata oluştu',
      invalidDates: 'Geçersiz tarih aralığı',
    },
    en: {
      title: 'Blocked Dates',
      description: 'Add dates when you are unavailable for sessions (vacations, holidays, etc.).',
      addDate: 'Add Date',
      startDate: 'Start Date',
      endDate: 'End Date',
      reason: 'Reason (optional)',
      reasonPlaceholder: 'E.g., Annual leave, vacation...',
      cancel: 'Cancel',
      save: 'Save',
      noBlockedDates: 'No blocked dates yet',
      delete: 'Delete',
      saving: 'Saving...',
      success: 'Date blocked successfully',
      deleteSuccess: 'Date removed',
      error: 'An error occurred',
      invalidDates: 'Invalid date range',
    }
  };

  const t = labels[language];

  useEffect(() => {
    if (user) {
      fetchBlockedDates();
    }
  }, [user]);

  const fetchBlockedDates = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mediator_blocked_dates')
        .select('*')
        .eq('mediator_id', user.id)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setBlockedDates(data || []);
    } catch (error) {
      console.error('Error fetching blocked dates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlockedDate = async () => {
    if (!user || !startDate || !endDate) return;

    // Validate dates
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    if (isBefore(end, start)) {
      toast({
        title: t.invalidDates,
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('mediator_blocked_dates')
        .insert({
          mediator_id: user.id,
          start_date: startDate,
          end_date: endDate,
          reason: reason || null
        });

      if (error) throw error;

      toast({ title: t.success });
      setDialogOpen(false);
      resetForm();
      fetchBlockedDates();
    } catch (error) {
      console.error('Error adding blocked date:', error);
      toast({ title: t.error, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlockedDate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('mediator_blocked_dates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: t.deleteSuccess });
      fetchBlockedDates();
    } catch (error) {
      console.error('Error deleting blocked date:', error);
      toast({ title: t.error, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setStartDate('');
    setEndDate('');
    setReason('');
  };

  const formatDateRange = (start: string, end: string) => {
    const startFormatted = format(parseISO(start), 'dd MMM yyyy');
    const endFormatted = format(parseISO(end), 'dd MMM yyyy');
    
    if (startFormatted === endFormatted) {
      return startFormatted;
    }
    return `${startFormatted} - ${endFormatted}`;
  };

  // Get upcoming blocked dates (today or future)
  const upcomingBlockedDates = blockedDates.filter(bd => 
    isAfter(parseISO(bd.end_date), addDays(new Date(), -1))
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CalendarOff className="h-5 w-5 text-destructive" />
          <CardTitle className="text-lg">{t.title}</CardTitle>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              {t.addDate}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.addDate}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.startDate}</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.endDate}</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.reason}</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t.reasonPlaceholder}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t.cancel}
                </Button>
                <Button 
                  onClick={handleAddBlockedDate} 
                  disabled={saving || !startDate || !endDate}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t.saving}
                    </>
                  ) : t.save}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{t.description}</p>
        
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : upcomingBlockedDates.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t.noBlockedDates}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingBlockedDates.map((blockedDate) => (
              <div 
                key={blockedDate.id}
                className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20"
              >
                <div className="flex items-center gap-3">
                  <CalendarOff className="h-4 w-4 text-destructive" />
                  <div>
                    <p className="font-medium text-sm">
                      {formatDateRange(blockedDate.start_date, blockedDate.end_date)}
                    </p>
                    {blockedDate.reason && (
                      <p className="text-xs text-muted-foreground">{blockedDate.reason}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteBlockedDate(blockedDate.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
