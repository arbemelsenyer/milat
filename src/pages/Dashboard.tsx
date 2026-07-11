import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { format, isToday, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { tr, enUS } from "date-fns/locale";
import { motion, AnimatePresence, animate, useMotionValue, useMotionValueEvent } from "framer-motion";
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Bell,
  Eye,
  Briefcase,
  TrendingUp,
  CalendarClock,
  Sparkles,
  Activity,
  Brain,
  Users,
  Lightbulb,
  Scale,
  FileSearch,
  FileSignature,
  MessageSquare,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { AppNavbar } from "@/components/AppNavbar";

import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const TOTAL_PHASES = 8;

interface CaseRow {
  id: string;
  status: string;
  title: string | null;
  category: string | null;
  dispute_type: string | null;
  your_name: string | null;
  other_party_name: string | null;
  assigned_mediator_id: string | null;
  current_phase: number;
  ai_summary: unknown;
  deadline_total: string | null;
  deadline_extended: string | null;
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

interface AgentActivityRow {
  id: string;
  case_id: string;
  agent_type: string;
  status: string;
  error_message: string | null;
  updated_at: string;
}

const statusConfig: Record<string, { label: { tr: string; en: string }; icon: typeof Clock }> = {
  draft: { label: { tr: "Taslak", en: "Draft" }, icon: FileText },
  submitted: { label: { tr: "Gönderildi", en: "Submitted" }, icon: Clock },
  assigned: { label: { tr: "Atandı", en: "Assigned" }, icon: AlertCircle },
  scheduled: { label: { tr: "Planlandı", en: "Scheduled" }, icon: CalendarClock },
  in_progress: { label: { tr: "Devam Ediyor", en: "In Progress" }, icon: Clock },
  completed: { label: { tr: "Tamamlandı", en: "Completed" }, icon: CheckCircle },
  resolved: { label: { tr: "Çözüldü", en: "Resolved" }, icon: CheckCircle },
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  draft: "bg-sidebar-foreground/10 text-sidebar-foreground/70 border-sidebar-foreground/15",
  submitted: "bg-accent/15 text-accent border-accent/30",
  assigned: "bg-accent/15 text-accent border-accent/30",
  scheduled: "bg-accent/15 text-accent border-accent/30",
  in_progress: "bg-accent/15 text-accent border-accent/30",
  completed: "bg-success/15 text-success border-success/30",
  resolved: "bg-success/15 text-success border-success/30",
};

const AGENT_TYPE_META: Record<string, { label: { tr: string; en: string }; icon: LucideIcon }> = {
  party_analysis: { label: { tr: "Taraf Analizi", en: "Party Analysis" }, icon: Users },
  common_ground: { label: { tr: "Ortak Zemin Sentezi", en: "Common Ground" }, icon: Lightbulb },
  classify_dispute: { label: { tr: "Uyuşmazlık Sınıflandırma", en: "Dispute Classification" }, icon: Scale },
  deadline_detect: { label: { tr: "Süre Tespiti", en: "Deadline Detection" }, icon: CalendarClock },
  document_analysis: { label: { tr: "Belge Analizi", en: "Document Analysis" }, icon: FileSearch },
  agreement_generation: { label: { tr: "Belge Üretimi", en: "Agreement Drafting" }, icon: FileSignature },
  meeting_notes: { label: { tr: "Görüşme Notu Analizi", en: "Meeting Notes" }, icon: MessageSquare },
  party_a: { label: { tr: "Taraf A Ajanı", en: "Party A Agent" }, icon: Users },
  party_b: { label: { tr: "Taraf B Ajanı", en: "Party B Agent" }, icon: Users },
  mediator: { label: { tr: "Arabulucu Ajan", en: "Mediator Agent" }, icon: Scale },
  validator: { label: { tr: "Doğrulama Ajanı", en: "Validator Agent" }, icon: ShieldCheck },
};

const PIE_COLORS = [
  "hsl(43 65% 52%)",
  "hsl(43 55% 62%)",
  "hsl(38 80% 48%)",
  "hsl(43 40% 38%)",
  "hsl(35 70% 58%)",
  "hsl(30 45% 32%)",
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const mv = useMotionValue(0);
  const [text, setText] = useState(`0${suffix}`);
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.1, ease: "easeOut" });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  useMotionValueEvent(mv, "change", (latest) => setText(`${Math.round(latest)}${suffix}`));
  return <>{text}</>;
}

function HeroStatTile({
  label,
  value,
  suffix = "",
  hint,
  icon: Icon,
}: {
  label: string;
  value: number;
  suffix?: string;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <motion.div variants={itemVariants} className="rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-5 shadow-elegant">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] uppercase tracking-[0.16em] text-sidebar-foreground/55 font-medium">{label}</span>
        <span className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-accent" />
        </span>
      </div>
      <p className="font-display text-4xl font-bold text-accent tabular-nums leading-none">
        <CountUp value={value} suffix={suffix} />
      </p>
      {hint && <p className="text-xs text-sidebar-foreground/45 mt-2">{hint}</p>}
    </motion.div>
  );
}

function AgentStatusPulse({ status, errorMessage, language }: { status: string; errorMessage: string | null; language: "tr" | "en" }) {
  if (status === "running") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-accent shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        {language === "tr" ? "çalışıyor" : "running"}
      </span>
    );
  }
  if (status === "completed") {
    return <CheckCircle2 className="h-4 w-4 text-success shrink-0" />;
  }
  if (status === "failed" || status === "flagged") {
    const icon = <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />;
    if (!errorMessage) return icon;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{icon}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{errorMessage}</TooltipContent>
      </Tooltip>
    );
  }
  return <span className="text-[11px] text-sidebar-foreground/40 shrink-0">{language === "tr" ? "beklemede" : "pending"}</span>;
}

function formatRelativeTime(iso: string, language: "tr" | "en"): string {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return language === "tr" ? "az önce" : "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return language === "tr" ? `${diffMin} dk önce` : `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return language === "tr" ? `${diffHour} sa önce` : `${diffHour}h ago`;
  return language === "tr" ? `${Math.floor(diffHour / 24)} gün önce` : `${Math.floor(diffHour / 24)}d ago`;
}

function formatCountdown(targetIso: string, language: "tr" | "en"): string | null {
  const ms = new Date(targetIso).getTime() - Date.now();
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return language === "tr" ? `${d}g ${h}s ${m}dk` : `${d}d ${h}h ${m}m`;
}

function extractSummary(ai: unknown): string | null {
  if (!ai || typeof ai !== "object") return null;
  const obj = ai as Record<string, unknown>;
  const s = obj.summary ?? obj.neutralSummary;
  return typeof s === "string" && s.trim() ? s.trim() : null;
}

function PieCustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
}) {
  if (active && payload && payload.length) {
    const p = payload[0];
    return (
      <div className="bg-sidebar-accent border border-sidebar-border rounded-lg shadow-elegant px-3 py-2 text-sm">
        <p className="font-semibold text-sidebar-foreground">{p.name}</p>
        <p className="text-sidebar-foreground/60">{p.value} vaka</p>
      </div>
    );
  }
  return null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const locale = language === "tr" ? tr : enUS;

  const [cases, setCases] = useState<CaseRow[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sessions, setSessions] = useState<SessionLite[]>([]);
  const [agentActivity, setAgentActivity] = useState<AgentActivityRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user) void loadAll();
  }, [user]);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    // agent_states carries no user_id column — RLS on the table scopes which rows this
    // subscription actually receives, so no client-side case-id filtering is needed here.
    const channel = supabase
      .channel("dashboard-agent-activity")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_states" },
        (payload: any) => {
          const row = payload.new as AgentActivityRow;
          if (!row?.id) return;
          setAgentActivity((prev) => {
            const idx = prev.findIndex((r) => r.id === row.id);
            const next = idx === -1 ? [row, ...prev] : prev.map((r) => (r.id === row.id ? row : r));
            return next.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 8);
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadAll = async () => {
    setIsLoading(true);
    const [cRes, nRes, sRes, aRes] = await Promise.all([
      supabase
        .from("cases")
        .select(
          "id,status,title,category,dispute_type,your_name,other_party_name,assigned_mediator_id,current_phase,ai_summary,deadline_total,deadline_extended,created_at,updated_at",
        )
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
      supabase
        .from("agent_states")
        .select("id,case_id,agent_type,status,error_message,updated_at")
        .order("updated_at", { ascending: false })
        .limit(8),
    ]);
    setCases((cRes.data as CaseRow[]) ?? []);
    setNotifications((nRes.data as Notification[]) ?? []);
    setSessions((sRes.data as SessionLite[]) ?? []);
    setAgentActivity((aRes.data as AgentActivityRow[]) ?? []);
    setIsLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const caseById = useMemo(() => new Map(cases.map((c) => [c.id, c])), [cases]);

  const stats = useMemo(() => {
    const total = cases.length;
    const resolved = cases.filter((c) => ["completed", "resolved"].includes(c.status)).length;
    const active = total - resolved;
    const rate = total ? Math.round((resolved / total) * 100) : 0;
    const durations = cases
      .filter((c) => ["completed", "resolved"].includes(c.status))
      .map((c) => (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000);
    const avgDays = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const niches: Record<string, number> = {};
    cases.forEach((c) => {
      const k = c.category || c.dispute_type || "—";
      niches[k] = (niches[k] ?? 0) + 1;
    });
    const topNiche = Object.entries(niches).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return { total, resolved, active, rate, avgDays, topNiche };
  }, [cases]);

  const weekSessionsCount = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    return sessions.filter((s) => s.scheduled_at && isWithinInterval(new Date(s.scheduled_at), { start, end })).length;
  }, [sessions]);

  const upcomingByCase = useMemo(() => {
    const map = new Map<string, SessionLite>();
    for (const s of sessions) {
      if (new Date(s.scheduled_at).getTime() > Date.now() && s.status !== "completed") {
        if (!map.has(s.case_id)) map.set(s.case_id, s);
      }
    }
    return map;
  }, [sessions]);

  const todaySessions = useMemo(
    () =>
      sessions
        .filter((s) => s.scheduled_at && isToday(new Date(s.scheduled_at)) && s.status !== "completed")
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()),
    [sessions],
  );

  const upcomingDeadlines = useMemo(() => {
    const now = Date.now();
    return cases
      .map((c) => {
        const iso = c.deadline_extended || c.deadline_total;
        if (!iso) return null;
        const date = new Date(iso);
        return date.getTime() > now ? { case: c, date, extended: !!c.deadline_extended } : null;
      })
      .filter((x): x is { case: CaseRow; date: Date; extended: boolean } => x !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [cases]);

  const disputeTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    cases.forEach((c) => {
      const key = c.dispute_type?.trim() || (language === "tr" ? "Bilinmeyen" : "Unknown");
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [cases, language]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }
  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-sidebar">
      <Helmet>
        <title>Panelim | MediPact AI</title>
        <meta name="description" content="Başvurularınızı, seanslarınızı ve bildirimlerinizi tek bir panelden yönetin." />
        <link rel="canonical" href="/dashboard" />
        <meta name="robots" content="noindex" />
      </Helmet>
      <AppNavbar />

      <main className="text-sidebar-foreground">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="container max-w-7xl py-8 px-4"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="rounded-2xl bg-gradient-hero text-primary-foreground p-6 mb-8 shadow-elegant">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <p className="text-[11px] tracking-[0.2em] uppercase text-accent font-semibold mb-1">
                  {language === "tr" ? "Komuta Merkezi" : "Command Center"}
                </p>
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
          </motion.div>

          {/* Hero stat strip */}
          <motion.div variants={containerVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <HeroStatTile
              label={language === "tr" ? "Aktif Dosyalar" : "Active Cases"}
              value={stats.active}
              icon={Briefcase}
              hint={`${stats.total} ${language === "tr" ? "toplam" : "total"}`}
            />
            <HeroStatTile
              label={language === "tr" ? "Bu Hafta Oturumlar" : "Sessions This Week"}
              value={weekSessionsCount}
              icon={CalendarClock}
            />
            <HeroStatTile
              label={language === "tr" ? "Anlaşma Oranı" : "Resolution Rate"}
              value={stats.rate}
              suffix="%"
              icon={TrendingUp}
              hint={`${stats.resolved}/${stats.total}`}
            />
            <HeroStatTile
              label={language === "tr" ? "Ortalama Süre" : "Avg. Duration"}
              value={stats.avgDays}
              suffix={language === "tr" ? " gün" : "d"}
              icon={Clock}
            />
          </motion.div>

          {/* Bugün odağı */}
          <motion.section variants={itemVariants} className="mb-8">
            <h2 className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.15em] text-sidebar-foreground/70 mb-3">
              <Sparkles className="w-4 h-4 text-accent" />
              {language === "tr" ? "Bugün" : "Today"}
            </h2>
            {todaySessions.length === 0 && upcomingDeadlines.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-sidebar-border/60 bg-sidebar-accent/20 py-6 px-5 text-center text-sidebar-foreground/60 text-sm">
                {language === "tr" ? "Bugün sakin ✨" : "All quiet today ✨"}
                <p className="text-xs mt-1 text-sidebar-foreground/40">
                  {language === "tr"
                    ? "Planlanmış oturum ya da yaklaşan süre yok."
                    : "No scheduled sessions or upcoming deadlines."}
                </p>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {todaySessions.map((s) => {
                  const c = caseById.get(s.case_id);
                  return (
                    <div key={s.id} className="shrink-0 min-w-[220px] rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
                      <div className="flex items-center gap-2 text-accent text-xs font-semibold">
                        <CalendarClock className="w-3.5 h-3.5" />
                        {format(new Date(s.scheduled_at), "HH:mm")}
                      </div>
                      <p className="text-sm text-sidebar-foreground mt-1 truncate">
                        {c?.title || c?.dispute_type || (language === "tr" ? "Oturum" : "Session")}
                      </p>
                    </div>
                  );
                })}
                {upcomingDeadlines.map(({ case: c, date, extended }) => (
                  <div key={c.id} className="shrink-0 min-w-[220px] rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                    <div className="flex items-center gap-2 text-destructive text-xs font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {format(date, "PP", { locale })}
                      {extended ? ` (${language === "tr" ? "uzatılmış" : "extended"})` : ""}
                    </div>
                    <p className="text-sm text-sidebar-foreground mt-1 truncate">
                      {c.title || c.dispute_type || (language === "tr" ? "Dosya" : "Case")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          {/* Canlı Ajan Akışı */}
          <motion.section variants={itemVariants} className="mb-8">
            <h2 className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.15em] text-sidebar-foreground/70 mb-3">
              <Activity className="w-4 h-4 text-accent" />
              {language === "tr" ? "Canlı Ajan Akışı" : "Live Agent Feed"}
            </h2>
            <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/40 overflow-hidden">
              {agentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                  <Brain className="h-6 w-6 text-sidebar-foreground/30" />
                  <p className="text-sm text-sidebar-foreground/50 max-w-sm px-6">
                    {language === "tr"
                      ? "Henüz ajan aktivitesi yok — bir analiz başlattığınızda burada canlı akacak."
                      : "No agent activity yet — once an analysis starts, it will stream here live."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-sidebar-border/60">
                  <AnimatePresence initial={false}>
                    {agentActivity.map((row) => {
                      const meta = AGENT_TYPE_META[row.agent_type] ?? { label: { tr: row.agent_type, en: row.agent_type }, icon: Brain };
                      const Icon = meta.icon;
                      const c = caseById.get(row.case_id);
                      return (
                        <motion.div
                          key={row.id}
                          layout
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15">
                            <Icon className="h-4 w-4 text-accent" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-sidebar-foreground truncate">{meta.label[language]}</p>
                            <p className="text-xs text-sidebar-foreground/45 truncate">
                              {c?.title || c?.dispute_type || (language === "tr" ? "Dosya" : "Case")}
                            </p>
                          </div>
                          <AgentStatusPulse status={row.status} errorMessage={row.error_message} language={language} />
                          <span className="text-[11px] text-sidebar-foreground/40 w-16 text-right shrink-0">
                            {formatRelativeTime(row.updated_at, language)}
                          </span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.section>

          {/* Dispute Type PieChart */}
          <motion.section variants={itemVariants} className="rounded-2xl border border-sidebar-border bg-sidebar-accent/40 p-5 mb-8">
            <h2 className="font-display text-sm uppercase tracking-[0.15em] text-sidebar-foreground/70 mb-3">
              {language === "tr" ? "Uyuşmazlık Türü Dağılımı" : "Dispute Type Distribution"}
            </h2>
            {disputeTypeData.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-center text-sidebar-foreground/50">
                <Sparkles className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">{language === "tr" ? "Gösterilecek veri yok" : "No data to display"}</p>
                <p className="text-xs mt-1">
                  {language === "tr"
                    ? "Başvuru oluşturduğunuzda uyuşmazlık türü dağılımı burada görünecek."
                    : "Dispute type distribution will appear here once you create cases."}
                </p>
              </div>
            ) : (
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
                      label={{ fill: "hsl(var(--sidebar-foreground))" }}
                    >
                      {disputeTypeData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<PieCustomTooltip />} />
                    <Legend verticalAlign="bottom" wrapperStyle={{ color: "hsl(var(--sidebar-foreground))" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.section>

          {/* Notifications */}
          {unreadCount > 0 && (
            <motion.section variants={itemVariants} className="mb-8 space-y-2">
              <h2 className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.15em] text-sidebar-foreground/70 mb-1">
                <Bell className="w-4 h-4 text-accent" />
                {language === "tr" ? "Bildirimler" : "Notifications"}
                <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10">
                  {unreadCount}
                </Badge>
              </h2>
              {notifications
                .filter((n) => !n.read)
                .slice(0, 3)
                .map((n) => (
                  <div key={n.id} className="rounded-xl border border-accent/25 bg-accent/5 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-sidebar-foreground truncate">{n.title}</p>
                      <p className="text-xs text-sidebar-foreground/50 truncate">{n.message}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(n.id)}
                      className="text-sidebar-foreground/60 hover:text-accent hover:bg-accent/10 shrink-0"
                      aria-label={language === "tr" ? "Okundu" : "Mark read"}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
            </motion.section>
          )}

          {/* Sinematik dosya kartları */}
          <h2 className="font-display text-sm uppercase tracking-[0.15em] text-sidebar-foreground/70 mb-3">
            {language === "tr" ? "Dosyalarım" : "My Files"}
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : cases.length === 0 ? (
            <motion.div
              variants={itemVariants}
              className="rounded-2xl border border-dashed border-sidebar-border/60 bg-sidebar-accent/20 flex flex-col items-center justify-center py-12"
            >
              <FileText className="w-12 h-12 text-sidebar-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-sidebar-foreground mb-2">
                {language === "tr" ? "Henüz başvurunuz yok" : "No cases yet"}
              </h3>
              <Button asChild className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/legal-reasoning?new=1">
                  <Plus className="w-4 h-4 mr-2" />
                  {language === "tr" ? "Başvuru Oluştur" : "Create Case"}
                </Link>
              </Button>
            </motion.div>
          ) : (
            <motion.div variants={containerVariants} className="grid md:grid-cols-2 gap-4">
              {cases.map((c) => {
                const s = statusConfig[c.status] ?? statusConfig.draft;
                const StatusIcon = s.icon;
                const displayTitle = c.title || c.dispute_type || (language === "tr" ? "Başvuru" : "Case");
                const partiesLine =
                  c.your_name && c.other_party_name
                    ? `${c.your_name} vs ${c.other_party_name}`
                    : language === "tr"
                    ? "Taraflar belirlenmemiş"
                    : "Parties not specified";
                const next = upcomingByCase.get(c.id);
                const goTo = c.status === "draft" ? `/legal-reasoning?resume=${c.id}` : `/case-room/${c.id}`;
                const summaryLine = extractSummary(c.ai_summary);
                const phase = Math.min(TOTAL_PHASES, Math.max(0, c.current_phase ?? 0));
                const phasePct = Math.round((phase / TOTAL_PHASES) * 100);
                return (
                  <motion.div
                    key={c.id}
                    variants={itemVariants}
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    className="group rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-5 transition-shadow hover:border-accent/50 hover:shadow-[0_0_0_1px_hsl(var(--accent)/0.35),0_18px_40px_-20px_hsl(var(--accent)/0.4)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-display font-semibold text-sidebar-foreground truncate">{displayTitle}</h3>
                        <p className="text-xs text-sidebar-foreground/50 mt-1 truncate">{partiesLine}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`shrink-0 border ${STATUS_BADGE_STYLES[c.status] ?? STATUS_BADGE_STYLES.draft}`}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {s.label[language]}
                      </Badge>
                    </div>

                    {summaryLine && (
                      <p className="mt-2.5 text-xs text-sidebar-foreground/55 italic line-clamp-1">&ldquo;{summaryLine}&rdquo;</p>
                    )}

                    <div className="mt-3.5">
                      <div className="flex items-center justify-between text-[10px] text-sidebar-foreground/40 mb-1 uppercase tracking-wide">
                        <span>{language === "tr" ? "Faz" : "Phase"}</span>
                        <span>
                          {phase}/{TOTAL_PHASES}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-sidebar-foreground/10 overflow-hidden">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${phasePct}%` }} />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[11px] text-sidebar-foreground/45">
                        {format(new Date(c.updated_at), "PP", { locale })}
                      </span>
                      {next ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent bg-accent/10 px-2.5 py-1 rounded-full">
                          <Clock className="w-3 h-3" />
                          {formatCountdown(next.scheduled_at, language) ?? (language === "tr" ? "Geçmiş" : "Past")}
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-sidebar-foreground/20 text-sidebar-foreground/55">
                          {c.category || c.dispute_type || "—"}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="border-accent/40 text-accent hover:bg-accent/10 hover:text-accent"
                      >
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
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
