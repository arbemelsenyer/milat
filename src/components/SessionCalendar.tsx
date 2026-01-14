import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, isSameDay } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { CalendarDays, Clock, MapPin, Video, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediatorRequest {
  id: string;
  case_id: string;
  status: string;
  scheduled_date: string | null;
  session_type: string | null;
  notes: string | null;
  cases?: {
    dispute_type: string | null;
    your_name: string | null;
    other_party_name: string | null;
  };
}

export function SessionCalendar() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [sessions, setSessions] = useState<MediatorRequest[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const t = {
    tr: {
      title: 'Oturumlarım',
      description: 'Planlanmış arabuluculuk oturumlarınız',
      noSessions: 'Bu tarihte oturum yok',
      upcoming: 'Yaklaşan Oturumlar',
      online: 'Online',
      inPerson: 'Yüz yüze',
      scheduled: 'Planlandı',
      pending: 'Beklemede',
    },
    en: {
      title: 'My Sessions',
      description: 'Your scheduled mediation sessions',
      noSessions: 'No sessions on this date',
      upcoming: 'Upcoming Sessions',
      online: 'Online',
      inPerson: 'In Person',
      scheduled: 'Scheduled',
      pending: 'Pending',
    },
  };

  const text = t[language];

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('mediator_requests')
      .select(`
        *,
        cases (
          dispute_type,
          your_name,
          other_party_name
        )
      `)
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: true });

    if (data) {
      setSessions(data);
    }
  };

  const scheduledDates = sessions
    .filter(s => s.scheduled_date)
    .map(s => new Date(s.scheduled_date!));

  const sessionsForSelectedDate = selectedDate
    ? sessions.filter(s => 
        s.scheduled_date && isSameDay(new Date(s.scheduled_date), selectedDate)
      )
    : [];

  const upcomingSessions = sessions
    .filter(s => s.scheduled_date && new Date(s.scheduled_date) >= new Date())
    .slice(0, 3);

  const modifiers = {
    hasSession: scheduledDates,
  };

  const modifiersStyles = {
    hasSession: {
      backgroundColor: 'hsl(var(--primary) / 0.2)',
      borderRadius: '50%',
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          {text.title}
        </CardTitle>
        <CardDescription>{text.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar */}
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              locale={language === 'tr' ? tr : enUS}
              className="rounded-md border pointer-events-auto"
            />
          </div>

          {/* Sessions for selected date */}
          <div className="flex-1 space-y-4">
            <h4 className="font-medium text-foreground">
              {selectedDate && format(selectedDate, 'PPP', { 
                locale: language === 'tr' ? tr : enUS 
              })}
            </h4>
            
            {sessionsForSelectedDate.length === 0 ? (
              <p className="text-muted-foreground text-sm">{text.noSessions}</p>
            ) : (
              <div className="space-y-3">
                {sessionsForSelectedDate.map((session) => (
                  <SessionCard key={session.id} session={session} language={language} text={text} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming sessions */}
        {upcomingSessions.length > 0 && (
          <div className="pt-4 border-t border-border">
            <h4 className="font-medium text-foreground mb-3">{text.upcoming}</h4>
            <div className="space-y-2">
              {upcomingSessions.map((session) => (
                <div 
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {session.session_type === 'online' ? (
                        <Video className="h-4 w-4 text-primary" />
                      ) : (
                        <Users className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {session.cases?.dispute_type || 'Mediation Session'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.scheduled_date && format(
                          new Date(session.scheduled_date), 
                          'PPp', 
                          { locale: language === 'tr' ? tr : enUS }
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {session.session_type === 'online' ? text.online : text.inPerson}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SessionCardProps {
  session: MediatorRequest;
  language: 'tr' | 'en';
  text: {
    online: string;
    inPerson: string;
    scheduled: string;
    pending: string;
  };
}

function SessionCard({ session, language, text }: SessionCardProps) {
  return (
    <div className={cn(
      'p-4 rounded-lg border',
      session.status === 'scheduled' 
        ? 'bg-success/5 border-success/30' 
        : 'bg-muted/50 border-border'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h5 className="font-medium text-foreground">
            {session.cases?.dispute_type || 'Mediation Session'}
          </h5>
          {session.cases?.your_name && session.cases?.other_party_name && (
            <p className="text-sm text-muted-foreground mt-1">
              {session.cases.your_name} vs {session.cases.other_party_name}
            </p>
          )}
        </div>
        <Badge variant={session.status === 'scheduled' ? 'default' : 'secondary'}>
          {session.status === 'scheduled' ? text.scheduled : text.pending}
        </Badge>
      </div>
      
      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {session.scheduled_date && format(
            new Date(session.scheduled_date), 
            'HH:mm', 
            { locale: language === 'tr' ? tr : enUS }
          )}
        </div>
        <div className="flex items-center gap-1">
          {session.session_type === 'online' ? (
            <>
              <Video className="h-4 w-4" />
              {text.online}
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" />
              {text.inPerson}
            </>
          )}
        </div>
      </div>
      
      {session.notes && (
        <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
          {session.notes}
        </p>
      )}
    </div>
  );
}
