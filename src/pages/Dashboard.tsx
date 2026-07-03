import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { tr, enUS } from "date-fns/locale";
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Bell,
  Eye,
  Briefcase,
  TrendingUp,
  CalendarClock,
  Sparkles,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { AppNavbar } from "@/components/AppNavbar";
import { StatCard } from "@/components/StatCard";
import { CountdownBadge } from "@/components/CountdownBadge";

import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

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

interface SessionLite {
  id: string;
  case_id: string;
  scheduled_at: string;
  status: string;
}

const statusConfig: Record<string, { label: { tr: string; en: string }; icon: typeof Clock; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: { tr: "Taslak", en: "Draft" }, icon: FileText, variant: "secondary" },
  submitted: { label: { tr: "Gönderildi", en: "Submitted" }, icon: Clock, variant: "default" },
  assigned: { label: { tr: "Atandı", en: "Assigned" }, icon: AlertCircle, variant: "outline" },
  scheduled: { label: { tr: "Planlandı", en: "Scheduled" }, icon: CalendarClock, variant: "default" },
  in_progress: { label: { tr: "Devam Ediyor", en: "In Progress" }, icon: Clock, variant: "default" },
  completed: { label: { tr: "Tamamlandı", en: "Completed" }, icon: CheckCircle, variant: "default" },
  resolved: { label: { tr: "Çözüldü", en: "Resolved" }, icon: CheckCircle, variant: "default" },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const locale = language === "tr" ? tr : enUS;

  const [cases, setCases] = useState<CaseRow[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sessions, setSessions] = useState<SessionLite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user) void loadAll();
  }, [user]);

  const loadAll = async () => {
    setIsLoading(true);
    const [cRes, nRes, sRes] = await Promise.all([
      supabase
        .from("cases")
        .select("id,status,title,category,dispute_type,your_name,other_party_name,assigned_mediator_id,created_at,updated_at")
        .order("updated_at", { ascending: false }),
      supabase
        .from("notifications")
        .select("id,title,message,type,read,created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("case_sessions")
        .select("id,case_id,scheduled_at,status")
        .order("scheduled_at", { ascending: true }),
    ]);
    setCases((cRes.data as CaseRow[]) ?? []);
    setNotifications((nRes.data as Notification[]) ?? []);
    setSessions((sRes.data as SessionLite[]) ?? []);
    setIsLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const stats = useMemo(() => {
    const total = cases.length;
    const resolved = cases.filter((c) => ["completed", "resolved"].includes(c.status)).length;
    const rate = total ? Math.round((resolved / total) * 100) : 0;
    // Avg resolution days for completed
    const durations = cases
      .filter((c) => ["completed", "resolved"].includes(c.status))
      .map((c) => (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000);
    const avgDays = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    // Top niche
    const niches: Record<string, number> = {};
    cases.forEach((c) => {
      const k = c.category || c.dispute_type || "—";
      niches[k] = (niches[k] ?? 0) + 1;
    });
    const topNiche = Object.entries(niches).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return { total, resolved, rate, avgDays, topNiche };
  }, [cases]);

  const upcomingByCase = useMemo(() => {
    const map = new Map<string, SessionLite>();
    for (const s of sessions) {
      if (new Date(s.scheduled_at).getTime() > Date.now() && s.status !== "completed") {
        if (!map.has(s.case_id)) map.set(s.case_id, s);
      }
    }
    return map;
  }, [sessions]);

  const PIE_COLORS = ["#2D3580", "#4A5299", "#6772AD", "#8498C2", "#A1BDD6", "#BEE2EA"];

  const disputeTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    cases.forEach((c) => {
      const key = c.dispute_type || (language === "tr" ? "Belirtilmemiş" : "Unspecified");
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [cases, language]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Panelim | MediPact AI</title>
        <meta name="description" content="Başvurularınızı, seanslarınızı ve bildirimlerinizi tek bir panelden yönetin." />
        <link rel="canonical" href="/dashboard" />
        <meta name="robots" content="noindex" />
      </Helmet>
      <AppNavbar />

      <main className="container max-w-7xl py-8 px-4">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-hero text-primary-foreground p-6 mb-6 shadow-elegant">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-sm text-primary-foreground/75 font-medium">
                {language === "tr" ? "Hoş geldiniz" : "Welcome"}
              </p>
              <h1 className="text-3xl md:text-4xl font-display font-bold mt-1">
                {language === "tr" ? "Başvurularım" : "My Cases"}
              </h1>
              <p className="text-primary-foreground/80 mt-2 max-w-xl text-sm">
                {language === "tr"
                  ? "Aktif uyuşmazlıklarınızı, sonraki seanslarınızı ve AI önerilerini buradan takip edin."
                  : "Track your active disputes, upcoming sessions, and AI insights from one place."}
              </p>
            </div>
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/mediator?new=1">
                <Plus className="w-4 h-4 mr-2" />
                {language === "tr" ? "Yeni Başvuru (UYAP)" : "New Case (UYAP)"}
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label={language === "tr" ? "Toplam Başvuru" : "Total Cases"}
            value={stats.total}
            icon={Briefcase}
            accent="primary"
          />
          <StatCard
            label={language === "tr" ? "Çözüm Oranı" : "Resolution Rate"}
            value={`${stats.rate}%`}
            hint={`${stats.resolved}/${stats.total}`}
            icon={TrendingUp}
            accent="success"
          />
          <StatCard
            label={language === "tr" ? "Ort. Çözüm" : "Avg. Resolution"}
            value={stats.avgDays ? `${stats.avgDays} ${language === "tr" ? "gün" : "d"}` : "—"}
            icon={CalendarClock}
            accent="accent"
          />
          <StatCard
            label={language === "tr" ? "En Çok Tür" : "Top Type"}
            value={stats.topNiche}
            icon={Sparkles}
            accent="warning"
          />
        </div>

        {/* Dispute Type PieChart */}
        {disputeTypeData.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {language === "tr" ? "Uyuşmazlık Türleri Dağılımı" : "Dispute Type Distribution"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={disputeTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={45}
                      dataKey="value"
                      nameKey="name"
                      stroke="none"
                      label
                    >
                      {disputeTypeData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notifications */}
        {unreadCount > 0 && (
          <div className="mb-6 space-y-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              {language === "tr" ? "Bildirimler" : "Notifications"}
              <Badge variant="destructive">{unreadCount}</Badge>
            </h2>
            {notifications
              .filter((n) => !n.read)
              .slice(0, 3)
              .map((n) => (
                <Card key={n.id} className="border-primary/20">
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(n.id)}
                      aria-label={language === "tr" ? "Okundu" : "Mark read"}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* Case list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : cases.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {language === "tr" ? "Henüz başvurunuz yok" : "No cases yet"}
              </h3>
              <Button asChild className="mt-4">
                <Link to="/legal-reasoning?new=1">
                  <Plus className="w-4 h-4 mr-2" />
                  {language === "tr" ? "Başvuru Oluştur" : "Create Case"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {cases.map((c) => {
              const s = statusConfig[c.status] ?? statusConfig.draft;
              const StatusIcon = s.icon;
              const displayTitle = c.title || c.dispute_type || (language === "tr" ? "Başvuru" : "Case");
              const next = upcomingByCase.get(c.id);
              const goTo = c.status === "draft" ? `/legal-reasoning?resume=${c.id}` : `/case-room/${c.id}`;
              return (
                <Card key={c.id} className="group hover:border-primary/40 hover:shadow-elegant transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{displayTitle}</CardTitle>
                        <CardDescription className="mt-1 text-xs">
                          {c.your_name && c.other_party_name
                            ? `${c.your_name} vs ${c.other_party_name}`
                            : language === "tr"
                            ? "Taraflar belirlenmemiş"
                            : "Parties not specified"}
                        </CardDescription>
                      </div>
                      <Badge variant={s.variant} className="shrink-0">
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {s.label[language]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{format(new Date(c.updated_at), "PP", { locale })}</span>
                      {next ? (
                        <CountdownBadge target={next.scheduled_at} />
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          {c.category || c.dispute_type || "—"}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={goTo}>
                          {c.status === "draft"
                            ? language === "tr"
                              ? "Devam Et"
                              : "Continue"
                            : language === "tr"
                            ? "Detay"
                            : "Open"}
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
