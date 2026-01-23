import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { LanguageToggle } from '@/components/LanguageToggle';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  ArrowLeft, BarChart3, PieChart as PieChartIcon, TrendingUp, 
  Calendar, CheckCircle2, Clock, Users, Loader2, FileText
} from 'lucide-react';
import { format, subDays, differenceInDays, parseISO } from 'date-fns';

interface CaseData {
  id: string;
  status: string;
  dispute_type: string | null;
  created_at: string;
  updated_at: string;
}

interface RequestData {
  id: string;
  status: string;
  created_at: string;
  scheduled_date: string | null;
  session_type: string | null;
}

export default function Analytics() {
  const { user, isAdmin, isMediator, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  
  const [cases, setCases] = useState<CaseData[]>([]);
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);

  const labels = {
    tr: {
      title: 'Analitik Panosu',
      subtitle: 'Arabuluculuk süreçleri ve performans metrikleri',
      back: 'Geri',
      overview: 'Genel Bakış',
      cases: 'Vakalar',
      sessions: 'Oturumlar',
      totalCases: 'Toplam Vaka',
      completedSessions: 'Tamamlanan Oturumlar',
      avgResolutionTime: 'Ort. Çözüm Süresi',
      days: 'gün',
      activeMediation: 'Aktif Arabuluculuk',
      casesByType: 'Vaka Türlerine Göre Dağılım',
      casesByStatus: 'Durum Dağılımı',
      sessionsOverTime: 'Zamana Göre Oturumlar',
      sessionTypes: 'Oturum Türleri',
      completionRate: 'Tamamlanma Oranı',
      noData: 'Henüz veri yok',
      online: 'Online',
      inPerson: 'Yüz Yüze',
      pending: 'Beklemede',
      scheduled: 'Planlandı',
      completed: 'Tamamlandı',
      cancelled: 'İptal',
      draft: 'Taslak',
      submitted: 'Gönderildi',
      inProgress: 'İşlemde',
      workplace: 'İşyeri',
      family: 'Aile',
      neighbor: 'Komşuluk',
      consumer: 'Tüketici',
      commercial: 'Ticari',
      other: 'Diğer',
      last30Days: 'Son 30 Gün',
      last7Days: 'Son 7 Gün',
    },
    en: {
      title: 'Analytics Dashboard',
      subtitle: 'Mediation process metrics and performance insights',
      back: 'Back',
      overview: 'Overview',
      cases: 'Cases',
      sessions: 'Sessions',
      totalCases: 'Total Cases',
      completedSessions: 'Completed Sessions',
      avgResolutionTime: 'Avg. Resolution Time',
      days: 'days',
      activeMediation: 'Active Mediation',
      casesByType: 'Cases by Type',
      casesByStatus: 'Status Distribution',
      sessionsOverTime: 'Sessions Over Time',
      sessionTypes: 'Session Types',
      completionRate: 'Completion Rate',
      noData: 'No data yet',
      online: 'Online',
      inPerson: 'In-Person',
      pending: 'Pending',
      scheduled: 'Scheduled',
      completed: 'Completed',
      cancelled: 'Cancelled',
      draft: 'Draft',
      submitted: 'Submitted',
      inProgress: 'In Progress',
      workplace: 'Workplace',
      family: 'Family',
      neighbor: 'Neighbor',
      consumer: 'Consumer',
      commercial: 'Commercial',
      other: 'Other',
      last30Days: 'Last 30 Days',
      last7Days: 'Last 7 Days',
    }
  };

  const t = labels[language];

  const disputeTypeLabels: Record<string, string> = {
    workplace: t.workplace,
    family: t.family,
    neighbor: t.neighbor,
    consumer: t.consumer,
    commercial: t.commercial,
    other: t.other,
  };

  const statusLabels: Record<string, string> = {
    pending: t.pending,
    scheduled: t.scheduled,
    completed: t.completed,
    cancelled: t.cancelled,
    draft: t.draft,
    submitted: t.submitted,
    in_progress: t.inProgress,
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && user && !isAdmin && !isMediator) {
      navigate('/dashboard');
    }
  }, [user, authLoading, isAdmin, isMediator, navigate]);

  useEffect(() => {
    if (user && (isAdmin || isMediator)) {
      fetchData();
    }
  }, [user, isAdmin, isMediator]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [casesRes, requestsRes] = await Promise.all([
        supabase.from('cases').select('id, status, dispute_type, created_at, updated_at'),
        supabase.from('mediator_requests').select('id, status, created_at, scheduled_date, session_type')
      ]);

      if (casesRes.data) setCases(casesRes.data);
      if (requestsRes.data) setRequests(requestsRes.data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const totalCases = cases.length;
  const completedSessions = requests.filter(r => r.status === 'completed').length;
  const activeMediation = requests.filter(r => ['pending', 'scheduled'].includes(r.status)).length;
  
  // Average resolution time (for completed cases)
  const completedCases = cases.filter(c => c.status === 'completed');
  const avgResolutionTime = completedCases.length > 0
    ? Math.round(completedCases.reduce((sum, c) => {
        return sum + differenceInDays(parseISO(c.updated_at), parseISO(c.created_at));
      }, 0) / completedCases.length)
    : 0;

  // Completion rate
  const totalRequests = requests.length;
  const completionRate = totalRequests > 0 
    ? Math.round((completedSessions / totalRequests) * 100) 
    : 0;

  // Cases by type
  const casesByType = Object.entries(
    cases.reduce((acc, c) => {
      const type = c.dispute_type || 'other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name: disputeTypeLabels[name] || name,
    value
  }));

  // Cases by status
  const casesByStatus = Object.entries(
    cases.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name: statusLabels[name] || name,
    value
  }));

  // Sessions by type
  const sessionsByType = Object.entries(
    requests.reduce((acc, r) => {
      const type = r.session_type || 'online';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name: name === 'online' ? t.online : t.inPerson,
    value
  }));

  // Sessions over time (last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const count = requests.filter(r => 
      r.scheduled_date && format(parseISO(r.scheduled_date), 'yyyy-MM-dd') === dateStr
    ).length;
    return {
      date: format(date, 'dd MMM'),
      sessions: count
    };
  });

  // Request status distribution
  const requestsByStatus = Object.entries(
    requests.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name: statusLabels[name] || name,
    value
  }));

  const COLORS = [
    'hsl(168, 42%, 42%)', // primary
    'hsl(38, 92%, 50%)', // accent
    'hsl(152, 45%, 45%)', // success
    'hsl(220, 14%, 50%)', // secondary
    'hsl(0, 65%, 55%)', // destructive
    'hsl(280, 50%, 50%)', // purple
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.back}
            </Button>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                {t.title}
              </h1>
              <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{isAdmin ? 'Admin' : 'Mediator'}</Badge>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t.totalCases}</p>
                  <p className="text-3xl font-bold">{totalCases}</p>
                </div>
                <FileText className="h-10 w-10 text-primary/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t.completedSessions}</p>
                  <p className="text-3xl font-bold">{completedSessions}</p>
                </div>
                <CheckCircle2 className="h-10 w-10 text-success/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t.avgResolutionTime}</p>
                  <p className="text-3xl font-bold">{avgResolutionTime} <span className="text-base font-normal text-muted-foreground">{t.days}</span></p>
                </div>
                <Clock className="h-10 w-10 text-accent/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t.completionRate}</p>
                  <p className="text-3xl font-bold">{completionRate}%</p>
                </div>
                <TrendingUp className="h-10 w-10 text-primary/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">{t.overview}</TabsTrigger>
            <TabsTrigger value="cases">{t.cases}</TabsTrigger>
            <TabsTrigger value="sessions">{t.sessions}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sessions over time */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {t.sessionsOverTime}
                  </CardTitle>
                  <CardDescription>{t.last30Days}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={last30Days}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="sessions" 
                        stroke="hsl(168, 42%, 42%)" 
                        fill="hsl(168, 42%, 42%, 0.2)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Request status distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    {t.casesByStatus}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {requestsByStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={requestsByStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {requestsByStatus.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      {t.noData}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cases" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cases by type */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t.casesByType}</CardTitle>
                </CardHeader>
                <CardContent>
                  {casesByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={casesByType}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="value" fill="hsl(168, 42%, 42%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      {t.noData}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cases by status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t.casesByStatus}</CardTitle>
                </CardHeader>
                <CardContent>
                  {casesByStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={casesByStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {casesByStatus.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      {t.noData}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Session types */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t.sessionTypes}</CardTitle>
                </CardHeader>
                <CardContent>
                  {sessionsByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={sessionsByType}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {sessionsByType.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      {t.noData}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Active mediation count */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t.activeMediation}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="text-center">
                      <Users className="h-16 w-16 mx-auto text-primary/30 mb-4" />
                      <p className="text-6xl font-bold text-primary">{activeMediation}</p>
                      <p className="text-muted-foreground mt-2">{t.activeMediation}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
