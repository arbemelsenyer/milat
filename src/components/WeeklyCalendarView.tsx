import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Clock, Video, Users, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediatorAvailability {
  id: string;
  mediator_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  specific_date: string | null;
}

interface ScheduledSession {
  id: string;
  case_id: string;
  status: string;
  scheduled_date: string;
  session_type: string | null;
  notes: string | null;
  cases?: {
    dispute_type: string | null;
    your_name: string | null;
    other_party_name: string | null;
  };
  profiles?: {
    full_name: string | null;
  };
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 - 19:00

export function WeeklyCalendarView() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [availability, setAvailability] = useState<MediatorAvailability[]>([]);
  const [sessions, setSessions] = useState<ScheduledSession[]>([]);

  const t = {
    tr: {
      title: 'Haftalık Görünüm',
      description: 'Müsaitlik ve planlanmış oturumları görüntüleyin',
      today: 'Bugün',
      available: 'Müsait',
      scheduled: 'Planlandı',
      online: 'Online',
      inPerson: 'Yüz yüze',
      noEvents: 'Bu hafta için etkinlik yok',
    },
    en: {
      title: 'Weekly View',
      description: 'View availability and scheduled sessions',
      today: 'Today',
      available: 'Available',
      scheduled: 'Scheduled',
      online: 'Online',
      inPerson: 'In Person',
      noEvents: 'No events for this week',
    },
  };

  const text = t[language];
  const dateLocale = language === 'tr' ? tr : enUS;

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, currentWeekStart]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch mediator availability
    const { data: availabilityData } = await supabase
      .from('mediator_availability')
      .select('*')
      .eq('mediator_id', user.id);

    if (availabilityData) {
      setAvailability(availabilityData);
    }

    // Fetch scheduled sessions for this week
    const weekEnd = addDays(currentWeekStart, 7);
    const { data: sessionsData } = await supabase
      .from('mediator_requests')
      .select(`
        id,
        case_id,
        status,
        scheduled_date,
        session_type,
        notes,
        cases (
          dispute_type,
          your_name,
          other_party_name
        ),
        profiles!mediator_requests_user_id_fkey (
          full_name
        )
      `)
      .not('scheduled_date', 'is', null)
      .gte('scheduled_date', currentWeekStart.toISOString())
      .lt('scheduled_date', weekEnd.toISOString())
      .order('scheduled_date', { ascending: true });

    if (sessionsData) {
      setSessions(sessionsData as unknown as ScheduledSession[]);
    }
  };

  const getAvailabilityForDay = (date: Date) => {
    const dayOfWeek = date.getDay();
    const dateString = format(date, 'yyyy-MM-dd');
    
    return availability.filter(slot => {
      if (slot.specific_date) {
        return slot.specific_date === dateString;
      }
      return slot.is_recurring && slot.day_of_week === dayOfWeek;
    });
  };

  const getSessionsForDay = (date: Date) => {
    return sessions.filter(session => 
      session.scheduled_date && isSameDay(new Date(session.scheduled_date), date)
    );
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {text.title}
            </CardTitle>
            <CardDescription>{text.description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              {text.today}
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setCurrentWeekStart(prev => subWeeks(prev, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center">
              {format(currentWeekStart, 'MMM d', { locale: dateLocale })} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy', { locale: dateLocale })}
            </span>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setCurrentWeekStart(prev => addWeeks(prev, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary/20 border border-primary/40" />
            <span className="text-sm text-muted-foreground">{text.available}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-success/20 border border-success/40" />
            <span className="text-sm text-muted-foreground">{text.scheduled}</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Header - Day names */}
          <div className="grid grid-cols-8 border-b border-border bg-muted/50">
            <div className="p-2 text-xs font-medium text-muted-foreground border-r border-border" />
            {weekDays.map((day, index) => (
              <div 
                key={index}
                className={cn(
                  "p-2 text-center border-r border-border last:border-r-0",
                  isToday(day) && "bg-primary/10"
                )}
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {format(day, 'EEE', { locale: dateLocale })}
                </div>
                <div className={cn(
                  "text-sm font-semibold",
                  isToday(day) ? "text-primary" : "text-foreground"
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Time slots */}
          <div className="max-h-[500px] overflow-y-auto">
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-border last:border-b-0">
                <div className="p-2 text-xs text-muted-foreground border-r border-border flex items-start justify-end pr-2">
                  {`${hour.toString().padStart(2, '0')}:00`}
                </div>
                {weekDays.map((day, dayIndex) => {
                  const dayAvailability = getAvailabilityForDay(day);
                  const daySessions = getSessionsForDay(day);
                  
                  const availableInHour = dayAvailability.some(slot => {
                    const startHour = parseInt(slot.start_time.split(':')[0]);
                    const endHour = parseInt(slot.end_time.split(':')[0]);
                    return hour >= startHour && hour < endHour;
                  });

                  const sessionInHour = daySessions.find(session => {
                    const sessionHour = new Date(session.scheduled_date).getHours();
                    return sessionHour === hour;
                  });

                  return (
                    <div 
                      key={dayIndex}
                      className={cn(
                        "p-1 min-h-[60px] border-r border-border last:border-r-0 relative",
                        isToday(day) && "bg-primary/5",
                        availableInHour && !sessionInHour && "bg-primary/10"
                      )}
                    >
                      {sessionInHour && (
                        <div className="absolute inset-1 bg-success/20 border border-success/40 rounded p-1 overflow-hidden">
                          <div className="flex items-center gap-1 text-xs">
                            {sessionInHour.session_type === 'online' ? (
                              <Video className="h-3 w-3 text-success flex-shrink-0" />
                            ) : (
                              <Users className="h-3 w-3 text-success flex-shrink-0" />
                            )}
                            <span className="font-medium text-success truncate">
                              {sessionInHour.cases?.dispute_type?.slice(0, 15) || 'Session'}
                            </span>
                          </div>
                          {sessionInHour.profiles?.full_name && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {sessionInHour.profiles.full_name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(sessionInHour.scheduled_date), 'HH:mm')}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Sessions Summary */}
        {sessions.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="font-medium text-foreground mb-3">
              {language === 'tr' ? 'Bu Haftaki Oturumlar' : 'Sessions This Week'}
            </h4>
            <div className="grid gap-2">
              {sessions.slice(0, 5).map((session) => (
                <div 
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/10 rounded-lg">
                      {session.session_type === 'online' ? (
                        <Video className="h-4 w-4 text-success" />
                      ) : (
                        <Users className="h-4 w-4 text-success" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {session.cases?.dispute_type || 'Mediation Session'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(session.scheduled_date), 'EEEE, MMM d - HH:mm', { locale: dateLocale })}
                      </div>
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
