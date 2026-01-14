import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Plus, FileText, Clock, CheckCircle, AlertCircle, LogOut, Shield, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { UserAvatar } from '@/components/UserAvatar';
import { NotificationBell } from '@/components/NotificationBell';
import { SessionCalendar } from '@/components/SessionCalendar';

interface Case {
  id: string;
  status: string;
  dispute_type: string | null;
  your_name: string | null;
  other_party_name: string | null;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { label: { tr: string; en: string }; icon: typeof Clock; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: { tr: 'Taslak', en: 'Draft' }, icon: FileText, variant: 'secondary' },
  submitted: { label: { tr: 'Gönderildi', en: 'Submitted' }, icon: Clock, variant: 'default' },
  in_review: { label: { tr: 'İnceleniyor', en: 'In Review' }, icon: AlertCircle, variant: 'outline' },
  completed: { label: { tr: 'Tamamlandı', en: 'Completed' }, icon: CheckCircle, variant: 'default' },
};

const disputeTypeLabels: Record<string, { tr: string; en: string }> = {
  commercial: { tr: 'Ticari Uyuşmazlık', en: 'Commercial Dispute' },
  ip: { tr: 'Fikri Mülkiyet', en: 'Intellectual Property' },
  healthcare: { tr: 'Sağlık', en: 'Healthcare' },
  other: { tr: 'Diğer', en: 'Other' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, isMediator, signOut } = useAuth();
  const { language } = useLanguage();
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user) {
      fetchCases();
    }
  }, [user]);

  const fetchCases = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setCases(data);
    }
    setIsLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
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
            {isMediator && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/mediator">
                  <Shield className="w-4 h-4 mr-2" />
                  {language === 'tr' ? 'Arabulucu Paneli' : 'Mediator Panel'}
                </Link>
              </Button>
            )}
            <NotificationBell />
            <LanguageToggle />
            <Link to="/profile" className="hover:opacity-80 transition-opacity">
              <UserAvatar 
                avatarUrl={profile?.avatar_url} 
                fullName={profile?.full_name} 
                email={user?.email}
                size="sm"
              />
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              {language === 'tr' ? 'Çıkış' : 'Logout'}
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container max-w-6xl py-8 px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {language === 'tr' ? 'Hoş Geldiniz' : 'Welcome'}, {profile?.full_name || user.email}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'tr' 
                ? 'Başvurularınızı görüntüleyin ve yönetin' 
                : 'View and manage your applications'}
            </p>
          </div>
          <Button asChild>
            <Link to="/intake">
              <Plus className="w-4 h-4 mr-2" />
              {language === 'tr' ? 'Yeni Başvuru' : 'New Application'}
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : cases.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {language === 'tr' ? 'Henüz başvurunuz yok' : 'No applications yet'}
              </h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                {language === 'tr' 
                  ? 'İlk başvurunuzu oluşturarak arabuluculuk sürecine başlayın.' 
                  : 'Start your mediation process by creating your first application.'}
              </p>
              <Button asChild>
                <Link to="/intake">
                  <Plus className="w-4 h-4 mr-2" />
                  {language === 'tr' ? 'Başvuru Oluştur' : 'Create Application'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {cases.map((caseItem) => {
              const status = statusConfig[caseItem.status] || statusConfig.draft;
              const StatusIcon = status.icon;
              const disputeLabel = caseItem.dispute_type 
                ? disputeTypeLabels[caseItem.dispute_type]?.[language] || caseItem.dispute_type
                : (language === 'tr' ? 'Belirlenmemiş' : 'Not specified');

              return (
                <Card key={caseItem.id} className="hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">
                          {disputeLabel}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {caseItem.your_name && caseItem.other_party_name 
                            ? `${caseItem.your_name} vs ${caseItem.other_party_name}`
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
                        {language === 'tr' ? 'Güncellendi: ' : 'Updated: '}
                        {format(new Date(caseItem.updated_at), 'PPp', { 
                          locale: language === 'tr' ? tr : enUS 
                        })}
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={caseItem.status === 'draft' ? `/intake?case=${caseItem.id}` : `/summary?case=${caseItem.id}`}>
                          {caseItem.status === 'draft' 
                            ? (language === 'tr' ? 'Devam Et' : 'Continue')
                            : (language === 'tr' ? 'Görüntüle' : 'View')}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Session Calendar */}
        <div className="mt-8">
          <SessionCalendar />
        </div>
      </div>
    </div>
  );
}
