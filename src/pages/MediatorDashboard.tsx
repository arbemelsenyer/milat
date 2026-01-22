import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { NotificationBell } from '@/components/NotificationBell';
import { MediatorAvailabilityCalendar } from '@/components/MediatorAvailabilityCalendar';
import { WeeklyCalendarView } from '@/components/WeeklyCalendarView';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, LogOut, Calendar, User, Clock, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';

interface MediatorRequest {
  id: string;
  case_id: string;
  user_id: string;
  status: string;
  preferred_dates: string[] | null;
  preferred_time: string | null;
  session_type: string | null;
  notes: string | null;
  scheduled_date: string | null;
  created_at: string;
  cases: {
    dispute_type: string | null;
    your_name: string | null;
    other_party_name: string | null;
    issue_description: string | null;
  } | null;
  profiles: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

const statusConfig: Record<string, { label: { tr: string; en: string }; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: { tr: 'Beklemede', en: 'Pending' }, variant: 'secondary' },
  scheduled: { label: { tr: 'Planlandı', en: 'Scheduled' }, variant: 'default' },
  completed: { label: { tr: 'Tamamlandı', en: 'Completed' }, variant: 'outline' },
  cancelled: { label: { tr: 'İptal', en: 'Cancelled' }, variant: 'destructive' },
};

export default function MediatorDashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isMediator, signOut } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [requests, setRequests] = useState<MediatorRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MediatorRequest | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isMediator) {
        navigate('/dashboard');
      }
    }
  }, [authLoading, user, isMediator, navigate]);

  useEffect(() => {
    if (user && isMediator) {
      fetchRequests();
    }
  }, [user, isMediator]);

  const fetchRequests = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('mediator_requests')
      .select(`
        *,
        cases (
          dispute_type,
          your_name,
          other_party_name,
          issue_description
        ),
        profiles!mediator_requests_user_id_fkey (
          full_name,
          email,
          phone
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data as unknown as MediatorRequest[]);
    }
    setIsLoading(false);
  };

  const handleSchedule = async () => {
    if (!selectedRequest || !scheduleDate) return;

    setIsScheduling(true);
    const scheduledDateISO = new Date(scheduleDate).toISOString();
    
    const { error } = await supabase
      .from('mediator_requests')
      .update({
        status: 'scheduled',
        scheduled_date: scheduledDateISO,
        notes: scheduleNotes || selectedRequest.notes,
        mediator_id: user?.id,
      })
      .eq('id', selectedRequest.id);

    if (error) {
      setIsScheduling(false);
      toast({
        variant: 'destructive',
        title: language === 'tr' ? 'Hata' : 'Error',
        description: error.message,
      });
      return;
    }

    // Send email notification to user
    try {
      await supabase.functions.invoke('send-session-notification', {
        body: {
          requestId: selectedRequest.id,
          scheduledDate: scheduledDateISO,
          mediatorNotes: scheduleNotes || undefined,
          language,
        },
      });
      console.log('Session notification sent successfully');
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the whole operation if notification fails
    }

    setIsScheduling(false);
    toast({
      title: language === 'tr' ? 'Oturum planlandı' : 'Session scheduled',
      description: language === 'tr' 
        ? 'Kullanıcıya e-posta bildirimi gönderildi.' 
        : 'Email notification sent to the user.',
    });
    setSelectedRequest(null);
    setScheduleDate('');
    setScheduleNotes('');
    fetchRequests();
  };

  const handleUpdateStatus = async (requestId: string, status: string) => {
    const { error } = await supabase
      .from('mediator_requests')
      .update({ status })
      .eq('id', requestId);

    if (error) {
      toast({
        variant: 'destructive',
        title: language === 'tr' ? 'Hata' : 'Error',
        description: error.message,
      });
    } else {
      fetchRequests();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || !isMediator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container max-w-6xl py-4 px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-xl text-foreground">
              MediationPath
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <LanguageToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              {language === 'tr' ? 'Çıkış' : 'Logout'}
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container max-w-6xl py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === 'tr' ? 'Panele Dön' : 'Back to Dashboard'}
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">
            {language === 'tr' ? 'Arabulucu Paneli' : 'Mediator Panel'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'tr' 
              ? 'Gelen talepleri görüntüleyin ve oturumları planlayın' 
              : 'View incoming requests and schedule sessions'}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {language === 'tr' ? 'Henüz talep yok' : 'No requests yet'}
              </h3>
              <p className="text-muted-foreground text-center">
                {language === 'tr' 
                  ? 'Yeni arabuluculuk talepleri burada görünecek.' 
                  : 'New mediation requests will appear here.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => {
              const status = statusConfig[request.status] || statusConfig.pending;

              return (
                <Card key={request.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {request.profiles?.full_name || (language === 'tr' ? 'Anonim Kullanıcı' : 'Anonymous User')}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {request.cases?.your_name && request.cases?.other_party_name 
                            ? `${request.cases.your_name} vs ${request.cases.other_party_name}`
                            : request.cases?.dispute_type || (language === 'tr' ? 'Uyuşmazlık bilgisi yok' : 'No dispute info')}
                        </CardDescription>
                      </div>
                      <Badge variant={status.variant}>
                        {status.label[language]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {request.cases?.issue_description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {request.cases.issue_description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 text-sm">
                      {request.preferred_time && (
                        <Badge variant="outline">
                          <Clock className="w-3 h-3 mr-1" />
                          {request.preferred_time}
                        </Badge>
                      )}
                      {request.session_type && (
                        <Badge variant="outline">
                          {request.session_type === 'video' 
                            ? (language === 'tr' ? 'Video' : 'Video')
                            : request.session_type === 'phone'
                            ? (language === 'tr' ? 'Telefon' : 'Phone')
                            : (language === 'tr' ? 'Yüz yüze' : 'In-person')}
                        </Badge>
                      )}
                      {request.profiles?.email && (
                        <Badge variant="outline">
                          {request.profiles.email}
                        </Badge>
                      )}
                    </div>

                    {request.scheduled_date && (
                      <p className="text-sm text-primary font-medium">
                        {language === 'tr' ? 'Planlanan: ' : 'Scheduled: '}
                        {format(new Date(request.scheduled_date), 'PPp', { 
                          locale: language === 'tr' ? tr : enUS 
                        })}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      {request.status === 'pending' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm"
                              onClick={() => setSelectedRequest(request)}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              {language === 'tr' ? 'Oturum Planla' : 'Schedule Session'}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                {language === 'tr' ? 'Oturum Planla' : 'Schedule Session'}
                              </DialogTitle>
                              <DialogDescription>
                                {language === 'tr' 
                                  ? 'Arabuluculuk oturumu için tarih ve saat seçin.' 
                                  : 'Select a date and time for the mediation session.'}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>
                                  {language === 'tr' ? 'Tarih ve Saat' : 'Date and Time'}
                                </Label>
                                <Input
                                  type="datetime-local"
                                  value={scheduleDate}
                                  onChange={(e) => setScheduleDate(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>
                                  {language === 'tr' ? 'Notlar (isteğe bağlı)' : 'Notes (optional)'}
                                </Label>
                                <Textarea
                                  value={scheduleNotes}
                                  onChange={(e) => setScheduleNotes(e.target.value)}
                                  placeholder={language === 'tr' 
                                    ? 'Ek bilgiler...' 
                                    : 'Additional information...'}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button onClick={handleSchedule} disabled={!scheduleDate || isScheduling}>
                                {isScheduling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {language === 'tr' ? 'Onayla' : 'Confirm'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                      
                      {request.status === 'scheduled' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleUpdateStatus(request.id, 'completed')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {language === 'tr' ? 'Tamamlandı' : 'Mark Complete'}
                        </Button>
                      )}

                      {(request.status === 'pending' || request.status === 'scheduled') && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleUpdateStatus(request.id, 'cancelled')}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          {language === 'tr' ? 'İptal Et' : 'Cancel'}
                        </Button>
                      )}

                      <Button variant="outline" size="sm" asChild className="ml-auto">
                        <Link to={`/summary?case=${request.case_id}`}>
                          {language === 'tr' ? 'Detayları Gör' : 'View Details'}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Weekly Calendar View */}
        <div className="mt-8">
          <WeeklyCalendarView />
        </div>

        {/* Availability Calendar */}
        <div className="mt-8">
          <MediatorAvailabilityCalendar />
        </div>
      </div>
    </div>
  );
}
