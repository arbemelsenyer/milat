import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppNavbar } from '@/components/AppNavbar';
import { supabase } from '@/integrations/supabase/client';
import { Plus, FileText, Clock, CheckCircle, AlertCircle, Loader2, Bell, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';

interface CaseRow {
  id: string;
  status: string;
  title: string | null;
  category: string | null;
  dispute_type: string | null;
  your_name: string | null;
  other_party_name: string | null;
  assigned_mediator_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

const statusConfig: Record<string, { label: { tr: string; en: string }; icon: typeof Clock; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: { tr: 'Taslak', en: 'Draft' }, icon: FileText, variant: 'secondary' },
  submitted: { label: { tr: 'Gönderildi', en: 'Submitted' }, icon: Clock, variant: 'default' },
  assigned: { label: { tr: 'Atandı', en: 'Assigned' }, icon: AlertCircle, variant: 'outline' },
  scheduled: { label: { tr: 'Planlandı', en: 'Scheduled' }, icon: Clock, variant: 'default' },
  completed: { label: { tr: 'Tamamlandı', en: 'Completed' }, icon: CheckCircle, variant: 'default' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user) {
      fetchCases();
      fetchNotifications();
    }
  }, [user]);

  const fetchCases = async () => {
    setIsLoading(true);
    // Cases where user is creator
    const { data: ownCases } = await supabase
      .from('cases')
      .select('id, status, title, category, dispute_type, your_name, other_party_name, assigned_mediator_id, created_at, updated_at')
      .order('updated_at', { ascending: false });

    // Also cases where user is a party (via case_parties)
    // RLS handles this — the "Parties can view their cases" policy returns matching rows
    setCases(ownCases || []);
    setIsLoading(false);
  };

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('id, title, message, type, read, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data || []);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>My Cases | MediPact AI Dashboard</title>
        <meta name="description" content="View, continue, and manage your mediation cases. Track notifications and your case status in one place." />
        <link rel="canonical" href="/dashboard" />
        <meta name="robots" content="noindex" />
      </Helmet>
      <AppNavbar />

      <main className="container max-w-6xl py-8 px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {language === 'tr' ? 'Başvurularım' : 'My Cases'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'tr' ? 'Başvurularınızı görüntüleyin ve yönetin' : 'View and manage your cases'}
            </p>
          </div>
          <Button asChild>
            <Link to="/intake">
              <Plus className="w-4 h-4 mr-2" />
              {language === 'tr' ? 'Yeni Başvuru' : 'New Case'}
            </Link>
          </Button>
        </div>

        {/* Notifications */}
        {unreadCount > 0 && (
          <div className="mb-6 space-y-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5" />
              {language === 'tr' ? 'Bildirimler' : 'Notifications'}
              <Badge variant="destructive">{unreadCount}</Badge>
            </h2>
            {notifications.filter(n => !n.read).map(n => (
              <Card key={n.id} className="border-primary/20">
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => markAsRead(n.id)} aria-label={language === 'tr' ? 'Okundu olarak işaretle' : 'Mark as read'}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Cases list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : cases.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {language === 'tr' ? 'Henüz başvurunuz yok' : 'No cases yet'}
              </h3>
              <Button asChild className="mt-4">
                <Link to="/intake">
                  <Plus className="w-4 h-4 mr-2" />
                  {language === 'tr' ? 'Başvuru Oluştur' : 'Create Case'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {cases.map((c) => {
              const status = statusConfig[c.status] || statusConfig.draft;
              const StatusIcon = status.icon;
              const displayTitle = c.title || c.dispute_type || (language === 'tr' ? 'Başvuru' : 'Case');

              return (
                <Card key={c.id} className="hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">{displayTitle}</CardTitle>
                        <CardDescription className="mt-1">
                          {c.your_name && c.other_party_name
                            ? `${c.your_name} vs ${c.other_party_name}`
                            : (language === 'tr' ? 'Taraflar belirlenmemiş' : 'Parties not specified')}
                        </CardDescription>
                      </div>
                      <Badge variant={status.variant} className="shrink-0">
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label[language]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(c.updated_at), 'PPp', { locale: language === 'tr' ? tr : enUS })}
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={c.status === 'draft' ? `/intake?resume=${c.id}` : `/summary?case=${c.id}`}>
                          {c.status === 'draft' ? (language === 'tr' ? 'Devam Et' : 'Continue') : (language === 'tr' ? 'Görüntüle' : 'View')}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
