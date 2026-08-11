import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AppNavbar } from "@/components/AppNavbar";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { SourceViewerDialog, ADB_SOURCE_PREFIX, type ViewerSource } from "@/components/SourceViewerDialog";
import { motion, AnimatePresence, animate, useMotionValue, useMotionValueEvent } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getPartyPhone, normalizePhoneForWhatsapp } from "@/lib/phone";
import {
  Plus, Loader2, FolderOpen, FileText, Users, Brain, ShieldCheck,
  Calendar as CalIcon, UserCheck, MessageSquare, FileCheck2, CheckCircle2, XCircle, Circle,
  Trash2, ArrowLeft, Sparkles, ChevronDown, ChevronUp, AlertTriangle, RefreshCw, Pencil,
  LayoutDashboard, Lightbulb, Target, EyeOff, Mail, Copy,
} from "lucide-react";

// CaseRoom.tsx'teki altın sekme diliyle aynı — data-[state=active] alt çizgisi accent renginde.
const tabTriggerAccentClass =
  "border-b-2 border-b-transparent transition-colors hover:border-b-accent hover:text-accent data-[state=active]:border-b-accent data-[state=active]:text-accent";
import { SessionScheduler } from "@/components/mediation/SessionScheduler";
import { OfficialDocumentsPanel } from "@/components/mediation/OfficialDocumentsPanel";
import { ExpertSelector } from "@/components/mediation/ExpertSelector";
import { Phase3ErrorBoundary } from "@/components/mediation/Phase3ErrorBoundary";
import { MeetingNotesPanel } from "@/components/mediation/MeetingNotesPanel";
import { ProcessTrackerPanel } from "@/components/mediation/ProcessTrackerPanel";
import { AgentControlPanel } from "@/components/mediation/AgentControlPanel";
import { CaseQaPanel } from "@/components/mediation/CaseQaPanel";

// Paylaşılan giriş animasyonu deseni — Dashboard.tsx'teki containerVariants/itemVariants ile aynı.
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

// ── Faz Kahramanı (PhaseHero) ──
// Dashboard.tsx'teki HeroStatTile/CountUp deseninin faz ekranları için ortak versiyonu:
// koyu lacivert zemin, altın faz etiketi, sayarak dolan büyük metrikler. Kendi giriş
// animasyonuna sahiptir — altındaki içerik bölümlerinin staggered girişini (Katman 1)
// etkilemez, her zaman ayrı bir üst şerit olarak render edilir.
type PhaseHeroTone = "low" | "medium" | "high";
type PhaseHeroMetricDef = {
  label: string;
  value: number | string | null | undefined;
  suffix?: string;
  tone?: PhaseHeroTone;
};

const PHASE_HERO_TONE_TEXT: Record<PhaseHeroTone, string> = {
  low: "text-emerald-400",
  medium: "text-amber-400",
  high: "text-red-400",
};

function PhaseHeroCountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
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

function PhaseHeroMetric({ label, value, suffix = "", tone }: PhaseHeroMetricDef) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="min-w-[120px]">
      <div className="text-[11px] uppercase tracking-[0.14em] text-sidebar-foreground/55 font-medium mb-1">{label}</div>
      <div className={`font-display font-bold tabular-nums leading-none ${empty ? "text-2xl text-sidebar-foreground/30" : `text-3xl sm:text-4xl ${tone ? PHASE_HERO_TONE_TEXT[tone] : "text-accent"}`}`}>
        {empty ? "—" : typeof value === "number" ? <PhaseHeroCountUp value={value} suffix={suffix} /> : `${value}${suffix}`}
      </div>
    </div>
  );
}

function PhaseHero({ label, metrics, aside }: { label: string; metrics: PhaseHeroMetricDef[]; aside?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground p-6 shadow-elegant"
    >
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-[220px] space-y-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold">{label}</div>
          <div className="flex flex-wrap gap-8">
            {metrics.map((m, i) => <PhaseHeroMetric key={i} {...m} />)}
          </div>
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </motion.div>
  );
}

// Faz 5 heroundaki "sıradaki oturum" geri sayımı — gün/saat çözünürlüğünde.
function formatPhaseCountdown(targetIso: string): string | null {
  const ms = new Date(targetIso).getTime() - Date.now();
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}g ${h}s` : `${h}s`;
}

// Faz 7 heroundaki "son not zamanı" — Dashboard.tsx'teki formatRelativeTime ile aynı basamaklar.
function formatPhaseRelative(iso: string): string {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return "az önce";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} sa önce`;
  return `${Math.floor(diffHour / 24)} gün önce`;
}

// Safely coerce any AI-returned value into a renderable string. Prevents
// "Objects are not valid as a React child" crashes when the model returns an
// object/array where we expected a scalar.
function safeText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}
// Coerce arrays of strings — items may occasionally be objects.
function safeList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(safeText).filter((s) => s.trim().length > 0);
}

// Token-overlap (Jaccard) similarity for near-duplicate free-text factors — each
// party's kritik_faktorler is generated by an independent AI call, so the same
// underlying factor is often phrased differently per party and won't match by
// exact string equality alone.
function normalizeFactorText(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}
function factorSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeFactorText(a).split(" ").filter(Boolean));
  const tokensB = new Set(normalizeFactorText(b).split(" ").filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let overlap = 0;
  for (const t of tokensA) if (tokensB.has(t)) overlap++;
  const union = tokensA.size + tokensB.size - overlap;
  return union === 0 ? 0 : overlap / union;
}
// Merges near-duplicate factors across sources (e.g. two parties' own analyses)
// into one entry, keeping the first phrasing and tracking which sources raised it —
// so "her iki taraf da vurguladı" info survives the merge instead of silently dropping.
function dedupeSimilarFactors(candidates: { text: string; source: string }[], threshold = 0.6): { text: string; sources: string[] }[] {
  const result: { text: string; sources: string[] }[] = [];
  for (const { text, source } of candidates) {
    if (!text.trim()) continue;
    const existing = result.find((r) => factorSimilarity(r.text, text) >= threshold);
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
    } else {
      result.push({ text, sources: [source] });
    }
  }
  return result;
}

const DISPUTE_TYPES = [
  "İşçi-İşveren",
  "Ticari Uyuşmazlık",
  "Tüketici",
  "Sağlık Hukuku",
  "Sigorta",
  "İnşaat & Yapı",
  "Marka & Patent",
];

const PHASES = [
  { id: 1, label: "Başvuru", icon: FileText },
  { id: 2, label: "Taraflar", icon: Users },
  { id: 3, label: "Taraf Analizi", icon: Brain },
  { id: 4, label: "Arabulucu Paneli", icon: ShieldCheck },
  { id: 5, label: "Toplantı", icon: CalIcon },
  { id: 6, label: "Bilirkişi", icon: UserCheck, optional: true },
  { id: 7, label: "Görüşme Notları", icon: MessageSquare },
  { id: 8, label: "Belgeler & Kapanış", icon: FileCheck2 },
] as const;

// Sıradaki erişilebilir (kilidi açık, tamamlanmamış) en küçük numaralı faz — opsiyonel Faz 6 hiçbir zaman engellemez.
function computeNextActionablePhase(phaseStatus: Record<number, boolean>, phase3Complete: boolean): number | null {
  for (const p of PHASES) {
    const locked = p.id >= 4 && !phase3Complete;
    if (locked) continue;
    const optional = "optional" in p && p.optional;
    if (optional) continue;
    if (!phaseStatus[p.id]) return p.id;
  }
  return null;
}

type CaseRow = {
  id: string;
  user_id: string;
  title: string | null;
  application_no: string | null;
  uyap_no: string | null;
  dispute_type: string | null;
  dispute_subtype?: string | null;
  status: string | null;
  current_phase: number | null;
  application_date: string | null;
  assigned_mediator_id: string | null;
  issue_description: string | null;
  created_at: string;
  is_mandatory?: boolean | null;
  legal_duration_days?: number | null;
  extension_days?: number | null;
  legal_basis?: string | null;
  deadline_total?: string | null;
  deadline_extended?: string | null;
  extension_used?: boolean | null;
  deadline_sources?: string[] | null;
  deadline_conflict?: boolean | null;
  deadline_conflict_note?: string | null;
  deadline_detected_at?: string | null;
  mediation_type?: "dava_sarti" | "ihtiyari" | null;
  mahkeme_turu?: "tuketici" | "is" | "sulh" | "ticaret" | "yok" | null;
  sure_hafta?: number | null;
  uzatma_hafta?: number | null;
};

type PartyDraft = {
  party_type: "individual" | "corporate";
  party_role: "applicant" | "respondent" | "third_party";
  // individual
  first_name?: string;
  last_name?: string;
  tc_kimlik?: string;
  birth_date?: string;
  // corporate
  company_name?: string;
  tax_office?: string;
  tax_number?: string;
  trade_registry_no?: string;
  authorized_person?: string;
  // shared
  address?: string;
  gsm?: string;
  phone?: string;
  email?: string;
  kvkk_ok?: boolean;
  // vekil (opsiyonel, bireysel/kurumsal fark etmez)
  vekil_ad_soyad?: string;
  vekil_baro?: string;
  vekil_sicil_no?: string;
};

function emptyParty(role: PartyDraft["party_role"] = "applicant"): PartyDraft {
  return { party_type: "individual", party_role: role };
}

function trErr(msg: string) {
  const m = (msg || "").toLowerCase();
  if (!msg) return "Bilinmeyen hata. Lütfen tekrar deneyin.";
  if (
    m.includes("row-level security") ||
    m.includes("row level security") ||
    m.includes(" rls") ||
    m.includes("permission denied") ||
    m.includes("not authorized") ||
    m.includes("42501")
  ) {
    return "Bu işlem için yetkiniz yok. Sadece başvuru sahibi, atanmış arabulucu veya yönetici silebilir.";
  }
  if (m.includes("jwt") || m.includes("not authenticated") || m.includes("invalid token")) {
    return "Oturumunuz sona ermiş olabilir. Lütfen tekrar giriş yapın.";
  }
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("network request")) {
    return "Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.";
  }
  return msg;
}

export default function MediationEngine() {
  const { user, isLoading, isMediator, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const caseId = params.get("caseId");
  const phaseParam = Number(params.get("phase") || 1);

  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [activeCase, setActiveCase] = useState<CaseRow | null>(null);
  const [phase3Complete, setPhase3Complete] = useState(false);
  // Faz 4 kokpitinin bildirdiği bölüm listesi (sol menüdeki alt katman) ve
  // menüden gelen "şu bölümü aç" isteği. Faz 4 dışında liste boş kalır.
  const [cockpitSections, setCockpitSections] = useState<{ id: string; label: string; kind: "layer" | "section"; hint?: string }[]>([]);
  const [cockpitJump, setCockpitJump] = useState<{ id: string; nonce: number } | null>(null);
  const [phaseStatus, setPhaseStatus] = useState<Record<number, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<CaseRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [agentPanelOpen, setAgentPanelOpen] = useState(false);
  const [paymentPanelOpen, setPaymentPanelOpen] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);
  // Faz tamamlanma daveti — sadece tamamlanmadı→tamamlandı GEÇİŞİNDE toast/parlama tetiklenir.
  // null = henüz hiç hesaplanmadı (dosya ilk açılışı); ilk hesaplamada geçiş sayılmaz.
  const prevPhaseStatusRef = useRef<Record<number, boolean> | null>(null);
  const [glowPhase, setGlowPhase] = useState<number | null>(null);

  useEffect(() => {
    if (activeCase && (isMediator || isAdmin) && params.get("tab") === "surec") {
      setTrackerOpen(true);
    }
  }, [activeCase, isMediator, isAdmin, params]);

  async function deleteCase(c: CaseRow) {
    setDeleting(true);
    try {
      const { error, count } = await supabase
        .from("cases").delete({ count: "exact" }).eq("id", c.id);
      if (error) throw error;
      if (!count) {
        throw new Error(
          "Silme işlemi başarısız. Bu başvuruyu silme yetkiniz yok veya başvuru zaten silinmiş olabilir."
        );
      }

      // Cascade doğrulaması: bağlı kayıtların gerçekten silindiğini kontrol et
      const childTables = [
        "case_parties", "case_documents", "party_analyses",
        "common_ground_reports", "case_sessions", "negotiation_rounds",
      ] as const;
      const checks = await Promise.all(
        childTables.map((t) =>
          supabase.from(t as any).select("id", { count: "exact", head: true }).eq("case_id", c.id)
        )
      );
      const remaining = checks
        .map((r, i) => ({ table: childTables[i], n: r.count ?? 0 }))
        .filter((x) => x.n > 0);
      if (remaining.length > 0) {
        console.warn("Cascade delete incomplete:", remaining);
        toast({
          title: "Silme kısmen tamamlandı",
          description: `Bazı bağlı kayıtlar kaldı: ${remaining.map((x) => x.table).join(", ")}. Yönetici ile iletişime geçin.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Başvuru silindi", description: "Başvuru ve tüm bağlı kayıtlar başarıyla silindi." });
      }

      setCases((prev) => prev.filter((x) => x.id !== c.id));
      setDeleteTarget(null);
    } catch (e: any) {
      toast({
        title: "Silme işlemi başarısız",
        description: trErr(e?.message ?? ""),
        variant: "destructive",
      });
    } finally { setDeleting(false); }
  }

  useEffect(() => {
    if (!isLoading && !user) {
      navigate(`/auth?next=${encodeURIComponent("/legal-reasoning")}`);
    }
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (user) loadCases();
  }, [user]);

  useEffect(() => {
    if (caseId) loadCase(caseId); else setActiveCase(null);
  }, [caseId]);

  const checkPhase3 = useCallback(async (id: string) => {
    const { count: aCount } = await supabase.from("party_analyses").select("id", { count: "exact", head: true }).eq("case_id", id);
    setPhase3Complete((aCount ?? 0) >= 1);
  }, []);

  useEffect(() => {
    if (caseId) checkPhase3(caseId);
  }, [caseId, checkPhase3, phaseParam]);

  // Faz tamamlanma koşulları — mevcut verilerden türetilir, tek toplu sorgu.
  // Faz1/Faz8 caseRow alanlarından, Faz6 (bilirkişi) opsiyonel olduğu için hiç sorgulanmaz.
  const checkPhaseCompletion = useCallback(async (id: string, c: CaseRow) => {
    const [parties, analyses, reports, sessions, notes] = await Promise.all([
      supabase.from("case_parties").select("id", { count: "exact", head: true }).eq("case_id", id),
      supabase.from("party_analyses").select("id", { count: "exact", head: true }).eq("case_id", id),
      supabase.from("common_ground_reports").select("id", { count: "exact", head: true }).eq("case_id", id),
      supabase.from("case_sessions").select("id", { count: "exact", head: true }).eq("case_id", id),
      supabase.from("case_notes").select("id", { count: "exact", head: true }).eq("case_id", id).eq("phase", 7),
    ]);
    const nextStatus: Record<number, boolean> = {
      1: !!c.dispute_type,
      2: (parties.count ?? 0) >= 2,
      3: (analyses.count ?? 0) >= 1,
      4: (reports.count ?? 0) >= 1,
      5: (sessions.count ?? 0) >= 1,
      6: false, // opsiyonel — tamamlanma aranmaz
      7: (notes.count ?? 0) >= 1,
      8: c.status === "agreed" || c.status === "failed",
    };

    // Davet modeli: sadece tamamlanmadı→tamamlandı geçişinde tetikle (ilk yüklemede sessiz kal).
    const prev = prevPhaseStatusRef.current;
    if (prev) {
      for (const p of PHASES) {
        if ("optional" in p && p.optional) continue;
        if (!prev[p.id] && nextStatus[p.id]) {
          setGlowPhase(p.id);
          toast({
            title: `✓ Aşama ${p.id} tamamlandı`,
            description: p.label,
          });
        }
      }
    }
    prevPhaseStatusRef.current = nextStatus;
    setPhaseStatus(nextStatus);
  }, [phase3Complete]);

  useEffect(() => {
    if (caseId && activeCase) checkPhaseCompletion(caseId, activeCase);
  }, [caseId, phaseParam, activeCase, checkPhaseCompletion]);

  useEffect(() => {
    if (params.get("new") === "1") {
      setShowNew(true);
      const p = new URLSearchParams(params);
      p.delete("new");
      setParams(p, { replace: true });
    }
  }, [params, setParams]);

  async function loadCases() {
    setLoading(true);
    const { data, error } = await supabase
      .from("cases")
      .select("id, user_id, title, application_no, uyap_no, dispute_type, dispute_subtype, status, current_phase, application_date, assigned_mediator_id, issue_description, created_at, is_mandatory, legal_duration_days, extension_days, legal_basis, deadline_total, deadline_extended, extension_used, deadline_sources, deadline_conflict, deadline_conflict_note, deadline_detected_at, mediation_type, mahkeme_turu, sure_hafta, uzatma_hafta")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Yükleme hatası", description: trErr(error.message), variant: "destructive" });
    else setCases((data ?? []) as CaseRow[]);
    setLoading(false);
  }

  async function loadCase(id: string) {
    const { data, error } = await supabase
      .from("cases")
      .select("id, user_id, title, application_no, uyap_no, dispute_type, dispute_subtype, status, current_phase, application_date, assigned_mediator_id, issue_description, created_at, is_mandatory, legal_duration_days, extension_days, legal_basis, deadline_total, deadline_extended, extension_used, deadline_sources, deadline_conflict, deadline_conflict_note, deadline_detected_at, mediation_type, mahkeme_turu, sure_hafta, uzatma_hafta")
      .eq("id", id).maybeSingle();
    if (error) { toast({ title: "Başvuru yüklenemedi", description: trErr(error.message), variant: "destructive" }); return; }
    setActiveCase(data as CaseRow);
  }

  function openCase(id: string, phase = 1) {
    const p = new URLSearchParams();
    p.set("caseId", id); p.set("phase", String(phase));
    setParams(p);
  }
  function setPhase(phase: number) {
    const p = new URLSearchParams(params);
    p.set("phase", String(phase));
    setParams(p);
  }

  // NOT: Bu hook, aşağıdaki koşullu return'lerden (loading / !caseId / !activeCase) ÖNCE
  // durmalı — Hooks Rules gereği hook çağrı sırası her render'da sabit kalmalı (React #310).
  const nextActionablePhase = useMemo(
    () => computeNextActionablePhase(phaseStatus, phase3Complete),
    [phaseStatus, phase3Complete]
  );

  // Altın parlama: tamamlanma geçişinde bir defalık, ~1.3sn sonra kendiliğinden söner.
  useEffect(() => {
    if (glowPhase == null) return;
    const t = setTimeout(() => setGlowPhase(null), 1300);
    return () => clearTimeout(t);
  }, [glowPhase]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  // === No case selected: list view ===
  if (!caseId) {
    return (
      <div className="min-h-screen bg-background">
        <AppNavbar />
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <header className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-primary">Arabuluculuk Başvuru Yönetimi</h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> İki taraflı gizli analiz sistemi
              </p>
            </div>
            <Button onClick={() => setShowNew((s) => !s)}>
              <Plus className="h-4 w-4 mr-1" /> Yeni Başvuru Oluştur
            </Button>
          </header>

          {showNew && (
            <NewCaseForm
              onCancel={() => setShowNew(false)}
              onCreated={(id) => { setShowNew(false); loadCases(); openCase(id, 2); }}
              userId={user!.id}
              isMediator={isMediator || isAdmin}
            />
          )}

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FolderOpen className="h-5 w-5" /> Başvurularım
            </h2>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
            ) : cases.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Henüz başvuru yok.</p>
            ) : (
              <div className="space-y-2">
                {cases.map((c) => (
                  <div key={c.id}
                    className="w-full p-4 rounded-lg border hover:bg-accent/10 transition flex items-center justify-between gap-2">
                    <button onClick={() => openCase(c.id, c.current_phase || 1)}
                      className="flex-1 text-left flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{c.title || "(başlıksız)"}</div>
                        <div className="text-sm text-muted-foreground">
                          {c.application_no ?? "—"} · {c.dispute_type ? anaAltLabel(c.dispute_type, c.dispute_subtype) : ""} · Aşama {c.current_phase ?? 1}/8
                        </div>
                      </div>
                      <Badge variant="secondary">{c.status ?? "active"}</Badge>
                    </button>
                    <Button
                      variant="ghost" size="icon"
                      aria-label="Başvuruyu sil"
                      disabled={deleting}
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      {deleting && deleteTarget?.id === c.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Bu başvuruyu silmek istediğinizden emin misiniz?</AlertDialogTitle>
                <AlertDialogDescription>
                  Başvuruya ait tüm taraflar, belgeler ve analizler de silinecektir. Bu işlem geri alınamaz.
                  {deleteTarget?.application_no && (
                    <span className="block mt-2 font-medium">{deleteTarget.application_no} — {deleteTarget.title}</span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>İptal</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  onClick={(e) => { e.preventDefault(); if (deleteTarget) deleteCase(deleteTarget); }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Siliniyor…</> : "Evet, Sil"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    );
  }

  // === Case selected: sidebar + content ===
  if (!activeCase) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  const completed = activeCase.current_phase ?? 1;

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <div className="flex">
        <aside className="w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground min-h-[calc(100vh-4rem)] p-4">
          <Button variant="ghost" size="sm" className="mb-4 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => { const p = new URLSearchParams(); setParams(p); }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Başvurular
          </Button>
          <div className="mb-4 px-2">
            <div className="text-xs uppercase opacity-70">Başvuru No</div>
            <div className="font-mono text-sm">{activeCase.application_no || "—"}</div>
            <div className="text-xs mt-2 opacity-80 line-clamp-2">{activeCase.title}</div>
          </div>
          <div className="border-t border-sidebar-foreground/10 pt-3 mb-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Dosya Araçları
          </div>
          {(isMediator || isAdmin) && (
            <Button variant="ghost" size="sm" className="w-full mb-4 justify-start border-l-2 border-l-transparent bg-transparent text-sidebar-foreground transition-colors hover:border-l-accent hover:text-accent hover:bg-sidebar-accent/40"
              onClick={() => setTrackerOpen(true)}>
              📋 Süreç Takip Çizelgesi
            </Button>
          )}
          <Button variant="ghost" size="sm" className="w-full mb-4 justify-start border-l-2 border-l-transparent bg-transparent text-sidebar-foreground transition-colors hover:border-l-accent hover:text-accent hover:bg-sidebar-accent/40"
            onClick={() => setAgentPanelOpen(true)}>
            🤖 Ajan Kontrol Paneli
          </Button>
          {(isMediator || isAdmin) && (
            <Button variant="ghost" size="sm" className="w-full mb-4 justify-start border-l-2 border-l-transparent bg-transparent text-sidebar-foreground transition-colors hover:border-l-accent hover:text-accent hover:bg-sidebar-accent/40"
              onClick={() => setQaOpen(true)}>
              ❓ Dosyaya Soru Sor
            </Button>
          )}
          <Button variant="ghost" size="sm" className="w-full mb-4 justify-start border-l-2 border-l-transparent bg-transparent text-sidebar-foreground transition-colors hover:border-l-accent hover:text-accent hover:bg-sidebar-accent/40"
            onClick={() => setPaymentPanelOpen(true)}>
            💰 Ödeme & Muhasebe
          </Button>
          <div className="mb-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Süreç
          </div>
          <nav className="space-y-1">
            {PHASES.map((p) => {
              const optional = "optional" in p && p.optional;
              const done = optional ? p.id < completed : !!phaseStatus[p.id];
              const active = p.id === phaseParam;
              const Icon = p.icon;
              const locked = p.id >= 4 && !phase3Complete;
              const isNext = !locked && !active && p.id === nextActionablePhase;
              return (
                <div key={p.id}>
                <button onClick={() => { if (!locked) setPhase(p.id); else toast({ title: "Aşama kilitli", description: "Önce Aşama 3'te en az bir taraf analizini tamamlayın." }); }}
                  className={`relative w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors border-l-2
                    ${active ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-accent" : "border-l-transparent hover:border-l-accent hover:text-accent hover:bg-sidebar-accent/40"}
                    ${locked ? "opacity-50 cursor-not-allowed" : ""}
                    ${isNext ? "border-l-accent/60" : ""}`}
                  title={locked ? "Aşama 3 tamamlanmadı" : isNext ? "Sıradaki aşama" : ""}>
                  <AnimatePresence>
                    {glowPhase === p.id && (
                      <motion.span
                        key="gold-glow"
                        className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-amber-400"
                        initial={{ opacity: 0, boxShadow: "0 0 0px rgba(251,191,36,0)" }}
                        animate={{ opacity: [0, 1, 1, 0], boxShadow: ["0 0 0px rgba(251,191,36,0)", "0 0 14px rgba(251,191,36,0.8)", "0 0 14px rgba(251,191,36,0.8)", "0 0 0px rgba(251,191,36,0)"] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.3, times: [0, 0.15, 0.75, 1], ease: "easeOut" }}
                      />
                    )}
                  </AnimatePresence>
                  {optional
                    ? <span className="h-4 w-4 rounded-full border border-current/50 flex items-center justify-center shrink-0" title="Opsiyonel — atlanabilir">
                        <span className="h-1.5 w-1.5 rounded-full bg-current/50" />
                      </span>
                    : done
                      ? <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                      : <Circle className="h-4 w-4 opacity-60 shrink-0" />}
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{p.id}. {p.label}</span>
                  {optional && <span className="text-[10px] opacity-60">opsiyonel</span>}
                  {isNext && (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                    </span>
                  )}
                </button>
                {/* Faz 4'teyken bu satırın altında kokpit bölümleri; yalnız verisi
                    olanlar listelenir. Diğer fazlarda hiç render edilmez. */}
                {p.id === 4 && active && cockpitSections.length > 0 && (
                  <div className="mt-1 mb-1 space-y-0.5">
                    {cockpitSections.map((sec) => (
                      <button
                        key={`${sec.kind}-${sec.id}`}
                        type="button"
                        title={sec.hint}
                        onClick={() => setCockpitJump({ id: sec.id, nonce: Date.now() })}
                        className={
                          sec.kind === "layer"
                            ? "w-full text-left pl-8 pr-3 pt-2 pb-0.5 text-[11px] font-medium uppercase tracking-wide text-sidebar-foreground/45 transition-colors hover:text-accent"
                            : "w-full text-left pl-11 pr-3 py-1 rounded-md text-xs text-sidebar-foreground/70 transition-colors hover:text-accent hover:bg-sidebar-accent/40"
                        }
                      >
                        {sec.label}
                      </button>
                    ))}
                  </div>
                )}
                </div>
              );
            })}
          </nav>
          {/* Faz 4'teyken kokpit bölümleri: "4. Arabulucu Paneli" satırının altında
              girintili alt satırlar. Yalnız verisi olan bölümler listelenir; başka
              fazlarda hiç render edilmez, menünün mevcut yapısı değişmez. */}
        </aside>
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={phaseParam}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <PhaseRenderer
                phase={phaseParam}
                caseRow={activeCase}
                reload={() => { loadCase(activeCase.id); checkPhase3(activeCase.id); checkPhaseCompletion(activeCase.id, activeCase); }}
                isMediator={isMediator || isAdmin}
                userId={user!.id}
                onAdvance={(next) => setPhase(next)}
                onCockpitSections={setCockpitSections}
                cockpitJump={cockpitJump}
              />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {(isMediator || isAdmin) && (
        <ProcessTrackerPanel caseRow={activeCase} open={trackerOpen} onOpenChange={setTrackerOpen} />
      )}
      <Dialog open={agentPanelOpen} onOpenChange={setAgentPanelOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="heading-gold-underline">Ajan Kontrol Paneli</DialogTitle>
          </DialogHeader>
          <AgentControlPanel caseId={activeCase.id} isMediator={isMediator || isAdmin} />
        </DialogContent>
      </Dialog>
      {(isMediator || isAdmin) && (
        <CaseQaPanel caseRow={activeCase} open={qaOpen} onOpenChange={setQaOpen} />
      )}
      <Dialog open={paymentPanelOpen} onOpenChange={setPaymentPanelOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="heading-gold-underline">Ödeme & Muhasebe</DialogTitle>
          </DialogHeader>
          <PaymentAccountingPanel caseRow={activeCase} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===================== NEW CASE (Phase 1) ===================== */

// Ana uyuşmazlık türü (zorunlu) — dava şartı/süre hesabına dokunmayan, sadece
// dosya açılışında seçilen 6 kanuni ana kategori.
const ANA_UYUSMAZLIK_TURLERI: { value: string; label: string }[] = [
  { value: "işçi_işveren", label: "İşçi-İşveren" },
  { value: "ticari", label: "Ticari" },
  { value: "tüketici", label: "Tüketici" },
  { value: "kira", label: "Kira" },
  { value: "aile", label: "Aile" },
  { value: "ortaklık", label: "Ortaklığın Giderilmesi" },
];

// Alt uzmanlık alanı (isteğe bağlı) — sağlık/sigorta/fikri-sınai gibi alanlar
// hukuken birden fazla ana türe bağlanabildiği için ayrı ve opsiyonel tutulur.
const ALT_UZMANLIK_ALANLARI: { value: string; label: string }[] = [
  { value: "sağlık", label: "Sağlık" },
  { value: "sigorta", label: "Sigorta" },
  { value: "fikri_sınai_haklar", label: "Fikri-Sınai Haklar" },
  { value: "inşaat", label: "İnşaat" },
  { value: "bankacılık", label: "Bankacılık" },
  { value: "spor", label: "Spor" },
  { value: "enerji_maden", label: "Enerji-Maden" },
];
const ALT_UZMANLIK_YOK = "yok";
function altUzmanlikLabel(v?: string | null) {
  return ALT_UZMANLIK_ALANLARI.find((c) => c.value === v)?.label ?? v ?? null;
}
// "Ana — Alt" birleşik gösterim; alt uzmanlık yoksa sadece ana tür döner.
function anaAltLabel(disputeType?: string | null, altUzmanlik?: string | null) {
  const ana = catLabel(disputeType);
  const alt = altUzmanlikLabel(altUzmanlik);
  return alt ? `${ana} — ${alt}` : ana;
}

function NewCaseForm({ onCancel, onCreated, userId, isMediator }: {
  onCancel: () => void; onCreated: (id: string) => void; userId: string; isMediator: boolean;
}) {
  const [title, setTitle] = useState("");
  const [disputeType, setDisputeType] = useState("");
  const [altUzmanlik, setAltUzmanlik] = useState(ALT_UZMANLIK_YOK);
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [aiSuggestedType, setAiSuggestedType] = useState(false);
  const [aiSuggestedSubtype, setAiSuggestedSubtype] = useState(false);

  // Salt ön-doldurma: başlıktan ana tür + alt uzmanlık önerir, hiçbir DB yazımı yok
  // (case_id/persist gönderilmez). Menüler öneriyle işaretlenir, arabulucu onaylar/değiştirir.
  async function suggestFromTitle() {
    setSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("classify-dispute", {
        body: { text: title },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const kategori = String((data as any)?.kategori ?? "");
      if (ANA_UYUSMAZLIK_TURLERI.some((c) => c.value === kategori)) {
        setDisputeType(kategori);
        setAiSuggestedType(true);
      }
      const altUz = String((data as any)?.alt_uzmanlik ?? "");
      if (altUz !== "yok" && ALT_UZMANLIK_ALANLARI.some((c) => c.value === altUz)) {
        setAltUzmanlik(altUz);
        setAiSuggestedSubtype(true);
      }
    } catch {
      toast({ title: "Öneri alınamadı, elle seçebilirsiniz", variant: "destructive" });
    } finally {
      setSuggesting(false);
    }
  }

  async function create() {
    if (!disputeType) {
      toast({ title: "Ana uyuşmazlık türü zorunlu", description: "Devam etmeden önce bir ana tür seçin.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { data: appNoData } = await supabase.rpc("generate_application_no" as any);
      const application_no = (appNoData as string) ?? `MP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: row, error } = await supabase.from("cases").insert({
        user_id: userId,
        assigned_mediator_id: isMediator ? userId : null,
        title: title || `Başvuru - ${application_no}`,
        dispute_type: disputeType,
        dispute_subtype: altUzmanlik !== ALT_UZMANLIK_YOK ? altUzmanlik : null,
        application_no,
        uyap_no: null,
        status: "active",
        current_phase: 2,
        round_number: 1,
      } as any).select().single();
      if (error) throw error;
      toast({ title: "Başvuru oluşturuldu", description: `Sistem No: ${application_no}` });
      onCreated((row as any).id);
    } catch (e: any) {
      toast({ title: "Oluşturma hatası", description: trErr(e.message), variant: "destructive" });
    } finally { setBusy(false); }
  }

  return (
    <Card className="p-6 mb-6 space-y-4">
      <h2 className="text-xl font-semibold">Yeni Başvuru</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Başvuru Başlığı</Label>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={suggestFromTitle}
              disabled={suggesting || title.trim().length < 10}
              title={title.trim().length < 10 ? "Önce uyuşmazlığı kısaca yazın" : undefined}
            >
              {suggesting
                ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Öneriliyor...</>
                : <><Sparkles className="h-3 w-3 mr-1" />AI Önerisi</>}
            </Button>
          </div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn. Kira sözleşmesinden doğan uyuşmazlık" />
        </div>
        <div>
          <Label className="flex items-center gap-2">
            Ana Uyuşmazlık Türü *
            {aiSuggestedType && <Badge variant="secondary" className="text-[10px]">AI önerisi</Badge>}
          </Label>
          <Select value={disputeType || undefined} onValueChange={(v) => { setDisputeType(v); setAiSuggestedType(false); }}>
            <SelectTrigger><SelectValue placeholder="Bir ana tür seçin" /></SelectTrigger>
            <SelectContent>
              {ANA_UYUSMAZLIK_TURLERI.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="flex items-center gap-2">
            Alt Uzmanlık Alanı (isteğe bağlı)
            {aiSuggestedSubtype && <Badge variant="secondary" className="text-[10px]">AI önerisi</Badge>}
          </Label>
          <Select value={altUzmanlik} onValueChange={(v) => { setAltUzmanlik(v); setAiSuggestedSubtype(false); }}>
            <SelectTrigger><SelectValue placeholder="Yok" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALT_UZMANLIK_YOK}>Yok</SelectItem>
              {ALT_UZMANLIK_ALANLARI.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Sistem No</Label>
          <Input value="Oluşturulduğunda atanır (MP-YYYY-XXXX)" disabled />
        </div>
        <div>
          <Label>Başvuru Tarihi</Label>
          <Input value={new Date().toLocaleDateString("tr-TR")} disabled />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onCancel}>İptal</Button>
        <Button onClick={create} disabled={busy || !disputeType}>
          {busy ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Oluşturuluyor</> : "Başvuruyu Oluştur"}
        </Button>
      </div>
    </Card>
  );
}

/* ===================== PHASE RENDERER ===================== */

// Arabulucunun ne zaman geçeceğine kendisinin karar verdiği, her zaman görünür ileri butonu.
// Koşula bağlı değil — mevcut tamamlanma/toast akışından bağımsız, manuel geçiş kapısı.
function NextPhaseButton({ phase, onAdvance }: { phase: number; onAdvance: (n: number) => void }) {
  return (
    <div className="mt-6 pt-4 border-t flex justify-end">
      <Button onClick={() => onAdvance(phase + 1)}>{`Aşama ${phase + 1}'e Geç →`}</Button>
    </div>
  );
}

function PhaseRenderer({ phase, caseRow, reload, isMediator, userId, onAdvance, onCockpitSections, cockpitJump }: {
  phase: number; caseRow: CaseRow; reload: () => void; isMediator: boolean; userId: string;
  onAdvance: (n: number) => void;
  onCockpitSections?: (sections: { id: string; label: string; kind: "layer" | "section"; hint?: string }[]) => void;
  cockpitJump?: { id: string; nonce: number } | null;
}) {
  async function bumpPhase(next: number) {
    if ((caseRow.current_phase ?? 1) < next) {
      await supabase.from("cases").update({ current_phase: next } as any).eq("id", caseRow.id);
      reload();
    }
  }
  switch (phase) {
    case 1: return <><Phase1Summary caseRow={caseRow} reload={reload} /><NextPhaseButton phase={phase} onAdvance={onAdvance} /></>;
    case 2: return <><Phase2Parties caseRow={caseRow} isMediator={isMediator} userId={userId} onDone={() => { bumpPhase(3); onAdvance(3); }} /><NextPhaseButton phase={phase} onAdvance={onAdvance} /></>;
    case 3: return <><Phase3ErrorBoundary><Phase3PartyAnalysis caseRow={caseRow} userId={userId} isMediator={isMediator} reload={reload} /></Phase3ErrorBoundary><NextPhaseButton phase={phase} onAdvance={onAdvance} /></>;
    case 4: return <>
      {isMediator
        ? <Phase4Summary caseRow={caseRow} onSectionsChange={onCockpitSections} jump={cockpitJump} />
        : <BlindBidPartyForm caseId={caseRow.id} userId={userId} />}
      <NextPhaseButton phase={phase} onAdvance={onAdvance} />
    </>;
    case 5: return <><Phase5Sessions caseRow={caseRow} bumpPhase={bumpPhase} onAdvance={onAdvance} /><NextPhaseButton phase={phase} onAdvance={onAdvance} /></>;
    case 6: return <><Phase7Expert caseRow={caseRow} /><NextPhaseButton phase={phase} onAdvance={onAdvance} /></>;
    case 7: return <><Phase8Negotiation caseRow={caseRow} userId={userId} onDone={() => { bumpPhase(8); onAdvance(8); }} /><NextPhaseButton phase={phase} onAdvance={onAdvance} /></>;
    case 8: return <Phase9Closing caseRow={caseRow} reload={reload} />;
    default: return null;
  }
}

// SessionScheduler needs case_parties for invite selection/presence — not lifted into
// MediationEngine state elsewhere, so fetch it here the same way Phase2Parties does.
function Phase5Sessions({ caseRow, bumpPhase, onAdvance }: {
  caseRow: CaseRow; bumpPhase: (n: number) => Promise<void>; onAdvance: (n: number) => void;
}) {
  const [parties, setParties] = useState<any[]>([]);
  const [sessions, setSessions] = useState<{ scheduled_at: string | null; status: string }[]>([]);
  const [navigating, setNavigating] = useState(false);
  useEffect(() => {
    supabase
      .from("case_parties")
      .select("id, user_id, party_role, first_name, last_name, company_name, email, gsm, phone")
      .eq("case_id", caseRow.id)
      .then(({ data }) => setParties(data ?? []));
  }, [caseRow.id]);
  useEffect(() => {
    supabase
      .from("case_sessions")
      .select("scheduled_at, status")
      .eq("case_id", caseRow.id)
      .order("scheduled_at", { ascending: true })
      .then(({ data }) => setSessions(data ?? []));
  }, [caseRow.id]);

  const plannedSessions = sessions.filter((s) => s.status !== "cancelled");
  const nextSession = plannedSessions.find((s) => s.scheduled_at && new Date(s.scheduled_at).getTime() > Date.now());

  async function chooseMeeting(meetingType: "ozel" | "ortak") {
    setNavigating(true);
    try {
      // Pre-create a placeholder session with the chosen meeting_type (user can edit below)
      await supabase.from("case_sessions").insert({
        case_id: caseRow.id, session_type: "joint", meeting_type: meetingType, status: "draft",
      } as any).select().maybeSingle();
      await bumpPhase(5);
      onAdvance(5);
    } catch (e: any) {
      toast({ title: "Geçiş hatası", description: trErr(e.message), variant: "destructive" });
    } finally { setNavigating(false); }
  }

  return (
    <div className="space-y-4">
      <PhaseHero
        label="Faz 5 — Oturumlar"
        metrics={[
          { label: "Sıradaki Oturum", value: nextSession?.scheduled_at ? formatPhaseCountdown(nextSession.scheduled_at) : null },
          { label: "Planlanan Oturum", value: plannedSessions.length },
        ]}
      />
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={itemVariants}>
        <Card className="p-6 space-y-2">
          <p className="text-xs text-muted-foreground">Sonraki adım: Taraflarla görüşme planlayın</p>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => chooseMeeting("ozel")} disabled={navigating} variant="outline">
              <CalIcon className="h-4 w-4 mr-1" /> Özel Görüşme Planla
            </Button>
            <Button onClick={() => chooseMeeting("ortak")} disabled={navigating}>
              <CalIcon className="h-4 w-4 mr-1" /> Ortak Görüşme Planla
            </Button>
          </div>
        </Card>
      </motion.div>
      <motion.div variants={itemVariants}>
        <SessionScheduler
          caseId={caseRow.id}
          niche={caseRow.dispute_type ?? ""}
          context={caseRow.title ?? ""}
          parties={parties}
          mediatorId={caseRow.assigned_mediator_id}
        />
      </motion.div>
    </motion.div>
    </div>
  );
}

function Phase1Summary({ caseRow, reload }: { caseRow: CaseRow; reload: () => void }) {
  const classified = !!caseRow.dispute_type;
  const { user, isAdmin } = useAuth();
  const canEditIssue = caseRow.assigned_mediator_id === user?.id || caseRow.user_id === user?.id || isAdmin;
  const [editIssueOpen, setEditIssueOpen] = useState(false);
  const [issueDescDraft, setIssueDescDraft] = useState("");
  const [savingIssue, setSavingIssue] = useState(false);

  function openEditIssue() {
    setIssueDescDraft(caseRow.issue_description ?? "");
    setEditIssueOpen(true);
  }

  async function saveIssueDescription() {
    setSavingIssue(true);
    try {
      const previous = caseRow.issue_description ?? "";
      const next = issueDescDraft;
      const changed = previous.trim() !== next.trim();
      const { error } = await supabase.from("cases").update({ issue_description: next || null }).eq("id", caseRow.id);
      if (error) throw error;
      // NOT: party_analyses / common_ground_reports / party_root_cause_analysis kasıtlı olarak
      // dokunulmuyor — kök neden ve önceki analizler kaybolmasın diye. Bunlar sadece "Tüm Analizi
      // Başlat" yeniden çalıştırılınca güncellenir.
      reload();
      setEditIssueOpen(false);
      if (changed) {
        toast({
          title: "Uyuşmazlık konusu güncellendi",
          description: "Mevcut analizler eski metne göre üretilmiştir; güncellemek için Tüm Analizi Başlat'ı yeniden çalıştırın.",
        });
      } else {
        toast({ title: "Kaydedildi" });
      }
    } catch (e: any) {
      toast({ title: "Kaydedilemedi", description: trErr(e.message), variant: "destructive" });
    } finally {
      setSavingIssue(false);
    }
  }

  return (
    <div className="space-y-4">
      <PhaseHero
        label="Faz 1 — Başvuru"
        metrics={[
          { label: "Uyuşmazlık Türü", value: classified ? anaAltLabel(caseRow.dispute_type, caseRow.dispute_subtype) : null },
          { label: "Sınıflandırma Durumu", value: classified ? "Tamamlandı" : "Bekliyor", tone: classified ? "low" : "medium" },
        ]}
      />
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={itemVariants}>
        <Card className="p-6 space-y-3">
          <h2 className="text-2xl font-bold text-primary">Aşama 1 — Başvuru Özeti</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Sistem No:</span> <b className="font-mono">{caseRow.application_no}</b></div>
            <div><span className="text-muted-foreground">Başlık:</span> {caseRow.title}</div>
            <div><span className="text-muted-foreground">Uyuşmazlık Türü:</span> {caseRow.dispute_type ? anaAltLabel(caseRow.dispute_type, caseRow.dispute_subtype) : <span className="italic text-muted-foreground">Aşağıdaki karttan otomatik tespit edilebilir</span>}</div>
            <div><span className="text-muted-foreground">Tarih:</span> {caseRow.application_date ? new Date(caseRow.application_date).toLocaleDateString("tr-TR") : new Date(caseRow.created_at).toLocaleDateString("tr-TR")}</div>
            <div><span className="text-muted-foreground">Durum:</span> {caseRow.status}</div>
            <div><span className="text-muted-foreground">UYAP Kayıt No:</span> {caseRow.uyap_no || <span className="italic text-muted-foreground">Henüz kaydedilmedi</span>}</div>
          </div>
          <p className="text-xs text-muted-foreground border-t pt-3">
            UYAP Kayıt Numarası, başvuru resmi sisteme kaydedildiğinde Aşama 4 (Arabulucu Paneli) üzerinden eklenebilir.
          </p>
          {canEditIssue && (
            <div className="border-t pt-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Uyuşmazlık Konusu</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {caseRow.issue_description || <span className="text-muted-foreground italic">Girilmemiş.</span>}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={openEditIssue}>
                  <Pencil className="h-4 w-4 mr-1" /> Düzenle
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
      <motion.div variants={itemVariants}>
        <DisputeClassifierCard caseRow={caseRow} initialText={caseRow.title ?? ""} autoRun />
      </motion.div>
      <motion.div variants={itemVariants}>
        <DeadlineCard caseRow={caseRow} />
      </motion.div>
      </motion.div>

      <Dialog open={editIssueOpen} onOpenChange={(o) => !o && !savingIssue && setEditIssueOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Uyuşmazlık Konusunu Düzenle</DialogTitle>
          </DialogHeader>
          <Textarea
            value={issueDescDraft}
            onChange={(e) => setIssueDescDraft(e.target.value)}
            rows={6}
            placeholder="Uyuşmazlık konusunu yazın..."
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditIssueOpen(false)} disabled={savingIssue}>İptal</Button>
            <Button onClick={saveIssueDescription} disabled={savingIssue}>
              {savingIssue ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Kaydediliyor…</> : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============ DEADLINE / TAKVIM CARD ============ */

const COURT_LABEL: Record<string, string> = {
  tuketici: "Tüketici Mahkemesi",
  is: "İş Mahkemesi",
  sulh: "Sulh Hukuk Mahkemesi",
  ticaret: "Ticaret Mahkemesi",
  yok: "Dava şartı kapsamı dışında",
};

function statusChipFor(remainingDays: number | null) {
  if (remainingDays == null) return null;
  if (remainingDays < 0) return <Badge className="bg-neutral-800 text-white">⚫ Süre doldu</Badge>;
  if (remainingDays < 3) return <Badge className="bg-red-600 text-white">🔴 {remainingDays} gün</Badge>;
  if (remainingDays < 7) return <Badge className="bg-amber-500 text-white">🟡 {remainingDays} gün</Badge>;
  return <Badge className="bg-emerald-600 text-white">🟢 {remainingDays} gün</Badge>;
}

function DeadlineCard({ caseRow }: { caseRow: CaseRow }) {
  const [local, setLocal] = useState<Partial<CaseRow>>({ ...caseRow });
  const [busy, setBusy] = useState(false);
  const [extending, setExtending] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voluntaryEnd, setVoluntaryEnd] = useState<string>(
    caseRow.deadline_total ? caseRow.deadline_total.slice(0, 10) : ""
  );
  const [savingVoluntary, setSavingVoluntary] = useState(false);

  const startDate = new Date(caseRow.application_date ?? caseRow.created_at);
  const todayIso = new Date().toISOString().slice(0, 10);

  async function chooseType(type: "dava_sarti" | "ihtiyari") {
    setSavingType(true);
    try {
      const { error } = await supabase.from("cases").update({ mediation_type: type } as any).eq("id", caseRow.id);
      if (error) throw error;
      setLocal((s) => ({ ...s, mediation_type: type }));
    } catch (e: any) {
      toast({ title: "Kaydedilemedi", description: e?.message ?? "", variant: "destructive" });
    } finally { setSavingType(false); }
  }

  const detect = useCallback(async () => {
    if (!caseRow.dispute_type) {
      setError("Önce yukarıdaki karttan AI uyuşmazlık türünü tespit edin.");
      return;
    }
    setBusy(true); setError(null);
    try {
      const { data, error: fErr } = await supabase.functions.invoke("detect-legal-deadlines", {
        body: { case_id: caseRow.id, dispute_type: caseRow.dispute_type, dispute_text: caseRow.title ?? "", persist: true },
      });
      if (fErr) throw fErr;
      if ((data as any)?.error) throw new Error((data as any).error);
      const r = data as any;
      const start = new Date(caseRow.application_date ?? caseRow.created_at);
      const sure_gun = r.sure_hafta != null ? r.sure_hafta * 7 : null;
      const uzatma_gun = r.uzatma_hafta != null ? r.uzatma_hafta * 7 : null;
      setLocal((s) => ({
        ...s,
        mediation_type: "dava_sarti",
        mahkeme_turu: r.mahkeme_turu,
        sure_hafta: r.sure_hafta,
        uzatma_hafta: r.uzatma_hafta,
        is_mandatory: r.dava_sarti_mi,
        legal_duration_days: sure_gun,
        extension_days: uzatma_gun,
        legal_basis: r.dayanak,
        deadline_total: sure_gun != null ? new Date(start.getTime() + sure_gun * 86400000).toISOString() : null,
        deadline_extended: (sure_gun != null && uzatma_gun) ? new Date(start.getTime() + (sure_gun + uzatma_gun) * 86400000).toISOString() : null,
        extension_used: false,
        deadline_sources: r.kullanilan_kaynaklar,
        deadline_detected_at: new Date().toISOString(),
      }));
      if (r.mahkeme_turu === "yok") {
        toast({ title: "Dava şartı kapsamı dışında", description: "İhtiyari arabuluculuk akışına geçebilirsiniz." });
      } else if (r.kaynak_bulunamadi) {
        toast({ title: "Kaynak yetersiz", description: "Mahkeme türü tespit edilemedi. Lütfen manuel kontrol edin.", variant: "destructive" });
      } else {
        toast({ title: "Mahkeme türü tespit edildi", description: `${COURT_LABEL[r.mahkeme_turu] ?? "-"} • ${r.sure_hafta}+${r.uzatma_hafta ?? 0} hafta` });
      }
    } catch (e: any) {
      setError(e?.message ?? "Süre tespiti başarısız. Tekrar deneyin.");
    } finally { setBusy(false); }
  }, [caseRow.id, caseRow.dispute_type, caseRow.title, caseRow.application_date, caseRow.created_at]);

  // Auto-detect when Dava Şartı seçilmiş ve dispute_type varsa
  const detectedRef = useRef(false);
  useEffect(() => {
    if (detectedRef.current) return;
    if (local.mediation_type !== "dava_sarti") return;
    if (!caseRow.dispute_type) return;
    if (local.deadline_detected_at) return;
    detectedRef.current = true;
    detect();
  }, [local.mediation_type, caseRow.dispute_type, local.deadline_detected_at, detect]);

  async function saveVoluntary() {
    if (!voluntaryEnd) return;
    setSavingVoluntary(true);
    try {
      const endIso = new Date(voluntaryEnd + "T23:59:59").toISOString();
      const days = Math.max(0, Math.ceil((new Date(endIso).getTime() - startDate.getTime()) / 86400000));
      const { error } = await supabase.from("cases").update({
        mediation_type: "ihtiyari",
        deadline_total: endIso,
        deadline_extended: null,
        legal_duration_days: days,
        extension_days: null,
        sure_hafta: null,
        uzatma_hafta: null,
        mahkeme_turu: null,
        is_mandatory: false,
        legal_basis: "İhtiyari arabuluculuk — taraflarca belirlendi",
        deadline_detected_at: new Date().toISOString(),
      } as any).eq("id", caseRow.id);
      if (error) throw error;
      setLocal((s) => ({
        ...s,
        mediation_type: "ihtiyari",
        deadline_total: endIso,
        deadline_extended: null,
        legal_duration_days: days,
        extension_days: null,
        is_mandatory: false,
        legal_basis: "İhtiyari arabuluculuk — taraflarca belirlendi",
        deadline_detected_at: new Date().toISOString(),
      }));
      toast({ title: "Tarih kaydedildi", description: new Date(endIso).toLocaleDateString("tr-TR") });
    } catch (e: any) {
      toast({ title: "Kaydedilemedi", description: e?.message ?? "", variant: "destructive" });
    } finally { setSavingVoluntary(false); }
  }

  async function extendDeadline() {
    if (!local.deadline_extended || local.extension_used) return;
    setExtending(true);
    try {
      const { error } = await supabase.from("cases").update({ extension_used: true } as any).eq("id", caseRow.id);
      if (error) throw error;
      setLocal((s) => ({ ...s, extension_used: true }));
      toast({ title: "Süre uzatıldı", description: `Yeni bitiş: ${new Date(local.deadline_extended).toLocaleDateString("tr-TR")}` });
    } catch (e: any) {
      toast({ title: "Uzatma başarısız", description: e?.message ?? "", variant: "destructive" });
    } finally { setExtending(false); }
  }

  const active = local.extension_used && local.deadline_extended ? local.deadline_extended : local.deadline_total;
  const remainingDays = active ? Math.ceil((new Date(active).getTime() - Date.now()) / 86400000) : null;
  const chip = statusChipFor(remainingDays);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CalIcon className="h-4 w-4 text-primary" /> 📅 Takvim & Süreler
        </h3>
      </div>

      {/* ARABULUCULUK TÜRÜ SEÇİMİ */}
      <div>
        <div className="text-sm font-medium mb-2">Arabuluculuk Türü:</div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={local.mediation_type === "dava_sarti" ? "default" : "outline"}
            disabled={savingType}
            onClick={() => chooseType("dava_sarti")}
          >
            Dava Şartı Arabuluculuk
          </Button>
          <Button
            size="sm"
            variant={local.mediation_type === "ihtiyari" ? "default" : "outline"}
            disabled={savingType}
            onClick={() => chooseType("ihtiyari")}
          >
            İhtiyari Arabuluculuk
          </Button>
        </div>
      </div>

      {!local.mediation_type && (
        <p className="text-xs text-muted-foreground italic">Lütfen arabuluculuk türünü seçin.</p>
      )}

      {/* İHTİYARİ AKIŞ */}
      {local.mediation_type === "ihtiyari" && (
        <div className="space-y-3 border-t pt-3">
          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <b>İhtiyari Arabuluculuk</b>
            <p className="text-xs text-muted-foreground mt-1">
              Yasal süre sınırı yoktur. Taraflarla mutabık kalınan süreyi girin.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <Label className="text-xs">📅 Başlangıç Tarihi</Label>
              <Input value={startDate.toLocaleDateString("tr-TR")} disabled />
            </div>
            <div>
              <Label className="text-xs">📅 Taraflarca Belirlenen Bitiş Tarihi</Label>
              <Input type="date" min={todayIso} value={voluntaryEnd} onChange={(e) => setVoluntaryEnd(e.target.value)} />
            </div>
          </div>
          <Button size="sm" onClick={saveVoluntary} disabled={savingVoluntary || !voluntaryEnd}>
            {savingVoluntary ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Kaydediliyor…</> : "Bitiş Tarihini Kaydet"}
          </Button>
          {local.deadline_total && (
            <div className="text-sm border-t pt-3 space-y-1">
              <div><span className="text-muted-foreground">📅 Başvuru:</span> {startDate.toLocaleDateString("tr-TR")}</div>
              <div><span className="text-muted-foreground">📅 Bitiş:</span> {new Date(local.deadline_total).toLocaleDateString("tr-TR")}</div>
              <div><span className="text-muted-foreground">Kalan Süre:</span> {chip ?? "—"}</div>
            </div>
          )}
        </div>
      )}

      {/* DAVA ŞARTI AKIŞ */}
      {local.mediation_type === "dava_sarti" && (
        <div className="space-y-3 border-t pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              AI, uyuşmazlığı sınıflandırıp mahkeme türü ile yasal süreyi tespit eder.
            </p>
            <Button size="sm" variant="outline" onClick={detect} disabled={busy || !caseRow.dispute_type}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Tespit ediliyor…</>
                    : <><RefreshCw className="h-4 w-4 mr-1" /> {local.deadline_detected_at ? "Yeniden Tespit" : "Mahkeme Türünü Tespit Et"}</>}
            </Button>
          </div>

          {!caseRow.dispute_type && (
            <p className="text-xs text-muted-foreground italic">
              Önce yukarıdaki karttan uyuşmazlık türünü tespit edin.
            </p>
          )}

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive flex items-start gap-1">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {error}
            </div>
          )}

          {local.mahkeme_turu === "yok" && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-2">
              <p>Bu uyuşmazlık dava şartı arabuluculuk kapsamında değildir. İhtiyari arabuluculuk yapılabilir.</p>
              <Button size="sm" variant="outline" onClick={() => chooseType("ihtiyari")}>
                İhtiyari Arabuluculuğa Geç
              </Button>
            </div>
          )}

          {local.deadline_detected_at && local.mahkeme_turu && local.mahkeme_turu !== "yok" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Mahkeme Türü:</span> <b>{COURT_LABEL[local.mahkeme_turu]}</b></div>
              <div><span className="text-muted-foreground">Yasal Süre:</span> <b>{local.sure_hafta} hafta{local.uzatma_hafta ? ` + ${local.uzatma_hafta} hafta uzatma` : ""}</b></div>
              <div className="md:col-span-2"><span className="text-muted-foreground">Dayanak:</span> {local.legal_basis || "—"}</div>
              <div><span className="text-muted-foreground">📅 Başvuru:</span> {startDate.toLocaleDateString("tr-TR")}</div>
              <div><span className="text-muted-foreground">📅 Süre Sonu:</span> {local.deadline_total ? new Date(local.deadline_total).toLocaleDateString("tr-TR") : "—"}</div>
              {local.deadline_extended && (
                <div className={local.extension_used ? "md:col-span-2 rounded-md bg-green-50 border border-green-200 p-2" : ""}>
                  <span className="text-muted-foreground">📅 Uzatılmış Son:</span>{" "}
                  <b className={local.extension_used ? "text-green-700" : ""}>{new Date(local.deadline_extended).toLocaleDateString("tr-TR")}</b>
                  {local.extension_used && (
                    <Badge className="ml-2 bg-green-600 text-white hover:bg-green-700 text-[10px]">Uzatma hakkı kullanıldı</Badge>
                  )}
                </div>
              )}
              <div><span className="text-muted-foreground">Kalan Süre:</span> {chip ?? "—"}</div>
            </div>
          )}

          {local.deadline_detected_at && !local.mahkeme_turu && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              Mahkeme türü tespit edilemedi. Lütfen manuel kontrol edin.
            </div>
          )}

          {local.deadline_sources && local.deadline_sources.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span>Kullanılan Kaynaklar:</span> {local.deadline_sources.slice(0, 6).join(" · ")}
            </div>
          )}

          {local.uzatma_hafta && !local.extension_used && local.deadline_extended && local.mahkeme_turu && local.mahkeme_turu !== "yok" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={extending}>
                  {extending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Uzatılıyor…</> : `Süre Uzat (+${local.uzatma_hafta} hafta)`}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Süre uzatılsın mı?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Uzatma bir kez kullanılabilir. Yeni bitiş: {new Date(local.deadline_extended).toLocaleDateString("tr-TR")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                  <AlertDialogAction onClick={extendDeadline}>Evet, Uzat</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {local.extension_used && (
            <div className="text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" /> Süre uzatma hakkı kullanıldı.
              </span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ============ DISPUTE CLASSIFIER (AI tür tespiti) ============ */

const DISPUTE_CATEGORIES: { value: string; label: string }[] = [
  { value: "işçi_işveren", label: "İşçi–İşveren" },
  { value: "ticari", label: "Ticari" },
  { value: "tüketici", label: "Tüketici" },
  { value: "sağlık", label: "Sağlık" },
  { value: "fikri_mülkiyet", label: "Fikri Mülkiyet" },
  { value: "inşaat", label: "İnşaat" },
  { value: "sigorta", label: "Sigorta" },
  { value: "bankacılık", label: "Bankacılık" },
  { value: "aile", label: "Aile" },
  { value: "spor", label: "Spor" },
  { value: "enerji_maden", label: "Enerji & Maden" },
  { value: "kira", label: "Kira" },
  { value: "gayrimenkul", label: "Gayrimenkul" },
  { value: "genel", label: "Genel" },
  { value: "ortaklık", label: "Ortaklığın Giderilmesi" },
];
function catLabel(v?: string | null) {
  return DISPUTE_CATEGORIES.find((c) => c.value === v)?.label ?? v ?? "—";
}

function DisputeClassifierCard({
  caseRow, initialText, autoRun = false,
}: { caseRow: CaseRow; initialText: string; autoRun?: boolean }) {
  const [text, setText] = useState(initialText || caseRow.title || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ kategori: string; guven_skoru: number; gerekce: string; ilgili_kanun: string[] } | null>(null);
  const [manual, setManual] = useState<string>(caseRow.dispute_type ?? "");
  const [savingManual, setSavingManual] = useState(false);
  const ranRef = useRef(false);

  const runClassify = useCallback(async (input: string) => {
    const q = (input ?? "").trim();
    if (q.length < 5) { setError("Sınıflandırma için en az 5 karakter gerekli."); return; }
    setBusy(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("classify-dispute", {
        body: { case_id: caseRow.id, text: q, persist: true },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as any);
      setManual((data as any).kategori);
      toast({ title: "Tür tespiti tamamlandı", description: `${catLabel((data as any).kategori)} · %${(data as any).guven_skoru}` });
    } catch (e: any) {
      const raw = e?.message ?? "";
      setError(trErr(raw) || "Uyuşmazlık türü tespit edilemedi. Lütfen tekrar deneyin.");
      toast({ title: "Sınıflandırma başarısız", description: trErr(raw) || "Bağlantı veya AI servisi hatası.", variant: "destructive" });
    } finally { setBusy(false); }
  }, [caseRow.id]);

  useEffect(() => {
    if (!autoRun || ranRef.current) return;
    if (caseRow.dispute_type) return; // already classified
    const trimmed = (initialText ?? "").trim();
    if (trimmed.length < 10) return;
    if (caseRow.application_no && trimmed === `Başvuru - ${caseRow.application_no}`) return; // boş başlıkta üretilen varsayılan metin, gerçek kullanıcı girdisi değil
    ranRef.current = true;
    runClassify(initialText);
  }, [autoRun, caseRow.dispute_type, caseRow.application_no, initialText, runClassify]);

  async function saveManual(value: string) {
    setSavingManual(true);
    try {
      const { error } = await supabase.from("cases").update({ dispute_type: value } as any).eq("id", caseRow.id);
      if (error) throw error;
      setManual(value);
      toast({ title: "Alan güncellendi", description: catLabel(value) });
    } catch (e: any) {
      toast({ title: "Güncellenemedi", description: trErr(e?.message ?? ""), variant: "destructive" });
    } finally { setSavingManual(false); }
  }

  const lowConfidence = result && result.guven_skoru < 60;
  const currentCat = manual || caseRow.dispute_type || result?.kategori || "";

  return (
    <Card className="p-6 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> AI Uyuşmazlık Türü Tespiti
        </h3>
        <Button size="sm" onClick={() => runClassify(text)} disabled={busy}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Analiz…</> : <><RefreshCw className="h-4 w-4 mr-1" /> {result ? "Yeniden Sınıflandır" : "Sınıflandır"}</>}
        </Button>
      </div>
      <div>
        <Label className="text-xs">Uyuşmazlık metni (başlık + kısa açıklama)</Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Örn: Kiracı 4 aydır kira ödemiyor, tahliye ve birikmiş kira talep ediliyor."
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2">
          <div className="text-xs text-destructive flex items-start gap-1">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => runClassify(text)} disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Deneniyor…</> : <><RefreshCw className="h-4 w-4 mr-1" /> Tekrar Dene</>}
          </Button>
        </div>
      )}

      {(result || caseRow.dispute_type) && (
        <div className="border rounded-md p-3 space-y-2 bg-muted/30">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm">
              <div>📋 <b>Tespit Edilen Alan:</b> {catLabel(currentCat)}</div>
              {result && (
                <>
                  <div className="text-xs text-muted-foreground">Güven: %{result.guven_skoru}</div>
                  {result.gerekce && <div className="text-xs mt-1"><span className="text-muted-foreground">Gerekçe:</span> {result.gerekce}</div>}
                  {result.ilgili_kanun?.length > 0 && (
                    <div className="text-xs mt-1">
                      <span className="text-muted-foreground">Dayanak:</span> {result.ilgili_kanun.join(", ")}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="min-w-[200px]">
              <Label className="text-[11px] text-muted-foreground">Değiştir</Label>
              <Select value={manual || undefined} onValueChange={saveManual} disabled={savingManual}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Manuel seç…" />
                </SelectTrigger>
                <SelectContent>
                  {DISPUTE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {lowConfidence && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-1">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              AI bu konuyu %{result!.guven_skoru} güvenle sınıflandırdı. Lütfen doğru alanı manuel seçin.
            </div>
          )}
        </div>
      )}

      {!result && !caseRow.dispute_type && !busy && (
        <p className="text-xs text-muted-foreground italic">
          Metni yazıp "Sınıflandır" butonuna basın; AI, Türk hukuku ve bilgi tabanı kaynaklarına göre alanı tespit edecek.
        </p>
      )}
    </Card>
  );
}

/* ===================== PHASE 2 - PARTIES ===================== */

function Phase2Parties({ caseRow, isMediator, userId, onDone }: { caseRow: CaseRow; isMediator: boolean; userId: string; onDone: () => void }) {
  const [parties, setParties] = useState<any[]>([]);
  const [draft, setDraft] = useState<PartyDraft | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [vekilDraftOpen, setVekilDraftOpen] = useState(false);
  const [vekilEditOpen, setVekilEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [inviteUrls, setInviteUrls] = useState<Record<string, string>>({});
  const [revealedId, setRevealedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("case_parties").select("*").eq("case_id", caseRow.id).order("created_at");
    setParties(data ?? []);
    setLoading(false);
  }, [caseRow.id]);

  useEffect(() => { load(); }, [load]);

  const sendInvite = useCallback(async (partyId: string, opts?: { skipEmail?: boolean }) => {
    setInvitingId(partyId);
    try {
      const { data, error } = await supabase.functions.invoke("send-party-invite", {
        body: { party_id: partyId, app_url: window.location.origin, skip_email: !!opts?.skipEmail },
      });
      if (error) throw error;
      if ((data as any)?.invite_url) {
        setInviteUrls((prev) => ({ ...prev, [partyId]: (data as any).invite_url }));
        setRevealedId(partyId);
      }
      toast({ title: "Davet gönderildi" });
    } catch (e: any) {
      toast({ title: "Davet gönderilemedi", description: trErr(e?.message ?? ""), variant: "destructive" });
    } finally {
      setInvitingId(null);
      load();
    }
  }, [load]);

  function openWhatsapp(p: any, inviteUrl: string) {
    const phone = getPartyPhone(p);
    if (!phone) return;
    const number = normalizePhoneForWhatsapp(phone);
    const message = `${partyDisplay(p)}, ${caseRow.application_no ?? ""} numaralı arabuluculuk sürecine katılmak için: ${inviteUrl}`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  async function copyInviteLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link kopyalandı" });
    } catch {
      toast({ title: "Kopyalanamadı", description: "Linki elle seçip kopyalayın.", variant: "destructive" });
    }
  }

  function validateParty(p: any, isInd: boolean): string | null {
    if (isInd) {
      if (!p.first_name?.trim()) return "Ad zorunludur.";
      if (!p.last_name?.trim()) return "Soyad zorunludur.";
      if (p.tc_kimlik && !/^\d{11}$/.test(String(p.tc_kimlik).trim())) return "TC Kimlik No 11 haneli rakam olmalıdır.";
    } else {
      if (!p.company_name?.trim()) return "Kurum adı zorunludur.";
    }
    const phoneRe = /^[+\d\s().-]{7,20}$/;
    if (p.gsm && !phoneRe.test(String(p.gsm).trim())) return "GSM numarası geçerli değil.";
    if (p.phone && !phoneRe.test(String(p.phone).trim())) return "Telefon numarası geçerli değil.";
    if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(p.email).trim())) return "E-posta adresi geçerli değil.";
    return null;
  }

  async function save() {
    if (!draft) return;
    if (!draft.kvkk_ok) { toast({ title: "KVKK onayı gerekli", variant: "destructive" }); return; }
    const isInd = draft.party_type === "individual";
    const vErr = validateParty(draft, isInd);
    if (vErr) { toast({ title: "Doğrulama hatası", description: vErr, variant: "destructive" }); return; }
    setBusy(true);
    try {
      const full_name = isInd ? `${draft.first_name} ${draft.last_name}`.trim() : draft.company_name!;
      const { data: inserted, error } = await supabase.from("case_parties").insert({
        case_id: caseRow.id,
        user_id: !isMediator && parties.length === 0 ? userId : null,
        party_type: draft.party_type,
        is_individual: isInd,
        party_role: draft.party_role,
        role: draft.party_role,
        // invite_token is issued server-side by send-party-invite (kept private from case owner)
        invite_status: "pending",
        first_name: draft.first_name ?? null,
        last_name: draft.last_name ?? null,
        full_name,
        tc_kimlik: draft.tc_kimlik ?? null,
        address: draft.address ?? null,
        gsm: draft.gsm ?? null,
        phone: draft.phone ?? null,
        email: draft.email ?? null,
        company_name: draft.company_name ?? null,
        tax_office: draft.tax_office ?? null,
        tax_number: draft.tax_number ?? null,
        trade_registry_no: draft.trade_registry_no ?? null,
        authorized_person: draft.authorized_person ?? null,
        vekil_ad_soyad: draft.vekil_ad_soyad ?? null,
        vekil_baro: draft.vekil_baro ?? null,
        vekil_sicil_no: draft.vekil_sicil_no ?? null,
      } as any).select().single();
      if (error) throw error;
      if (draft.email) {
        sendInvite((inserted as any).id);
      }
      toast({ title: "Taraf eklendi" });
      setDraft(null);
      load();
    } catch (e: any) {
      toast({ title: "Taraf eklenemedi", description: trErr(e.message), variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("case_parties").delete().eq("id", id);
    if (error) toast({ title: "Silinemedi", description: trErr(error.message), variant: "destructive" });
    else load();
  }

  async function saveEdit() {
    if (!editing) return;
    const isInd = editing.party_type === "individual";
    const vErr = validateParty(editing, isInd);
    if (vErr) { toast({ title: "Doğrulama hatası", description: vErr, variant: "destructive" }); return; }
    setSavingEdit(true);
    try {
      const full_name = isInd
        ? `${editing.first_name ?? ""} ${editing.last_name ?? ""}`.trim()
        : (editing.company_name ?? "");
      const original = parties.find((p: any) => p.id === editing.id);
      const newEmail = String(editing.email ?? "").trim();
      const oldEmail = String(original?.email ?? "").trim();
      const emailChanged = !!newEmail && newEmail !== oldEmail;
      const patch: any = {
        first_name: editing.first_name ?? null,
        last_name: editing.last_name ?? null,
        full_name,
        tc_kimlik: editing.tc_kimlik ?? null,
        address: editing.address ?? null,
        gsm: editing.gsm ?? null,
        phone: editing.phone ?? null,
        email: editing.email ?? null,
        company_name: editing.company_name ?? null,
        tax_office: editing.tax_office ?? null,
        tax_number: editing.tax_number ?? null,
        trade_registry_no: editing.trade_registry_no ?? null,
        authorized_person: editing.authorized_person ?? null,
        vekil_ad_soyad: editing.vekil_ad_soyad ?? null,
        vekil_baro: editing.vekil_baro ?? null,
        vekil_sicil_no: editing.vekil_sicil_no ?? null,
      };
      const { error } = await supabase.from("case_parties").update(patch).eq("id", editing.id);
      if (error) throw error;
      toast({ title: "Taraf bilgileri güncellendi" });
      setEditing(null);
      load();
      if (emailChanged) sendInvite(editing.id);
    } catch (e: any) {
      toast({ title: "Güncelleme başarısız", description: trErr(e.message), variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  }

  const withEmail = parties.filter((p: any) => p.email);
  const acceptedCount = withEmail.filter((p: any) => p.invite_status === "accepted").length;
  const inviteSummary: string | null = withEmail.length
    ? `${acceptedCount}/${withEmail.length} Kabul`
    : parties.length ? "Davet gönderilmedi" : null;

  return (
    <div className="space-y-4">
      <PhaseHero
        label="Faz 2 — Taraflar"
        metrics={[
          { label: "Kayıtlı Taraf", value: parties.length },
          { label: "Davet Durumu", value: inviteSummary, tone: acceptedCount && acceptedCount === withEmail.length ? "low" : undefined },
        ]}
      />
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={itemVariants}>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-primary">Aşama 2 — Taraflar</h2>
          <Button onClick={() => setDraft(emptyParty(parties.length === 0 ? "applicant" : "respondent"))}>
            <Plus className="h-4 w-4 mr-1" /> Taraf Ekle
          </Button>
        </div>
        {loading ? <Loader2 className="animate-spin" /> : parties.length === 0 ? (
          <p className="text-muted-foreground">Henüz taraf eklenmedi.</p>
        ) : (
          <div className="space-y-2">
            {parties.map((p) => (
              <motion.div variants={itemVariants} key={p.id} className="p-3 border rounded space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.full_name || p.company_name || "(isimsiz)"}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.party_role === "applicant" ? "Başvurucu" : p.party_role === "respondent" ? "Karşı Taraf" : "Üçüncü Taraf"}
                      {" · "}{p.party_type === "corporate" ? "Kurumsal" : "Bireysel"}
                      {" · "}{p.email || "e-posta yok"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.email && p.invite_status !== "accepted" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => sendInvite(p.id)}
                        disabled={invitingId === p.id}
                        title="Davet Gönder / Yeniden Gönder"
                      >
                        {invitingId === p.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
                        Davet Gönder / Yeniden Gönder
                      </Button>
                    )}
                    {!p.email && p.invite_status !== "accepted" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => sendInvite(p.id, { skipEmail: true })}
                        disabled={invitingId === p.id}
                        title="Davet Linki Oluştur"
                      >
                        {invitingId === p.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
                        Davet Linki Oluştur
                      </Button>
                    )}
                    {inviteUrls[p.id] && revealedId !== p.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRevealedId(p.id)}
                        title="Davet linkini göster"
                      >
                        Davet Linkini Göster
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing({ ...p });
                        setVekilEditOpen(!!(p.vekil_ad_soyad || p.vekil_baro || p.vekil_sicil_no));
                      }}
                      title="Düzenle"
                    >
                      <Pencil className="h-4 w-4 mr-1" /> Düzenle
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(p.id)} title="Sil">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {revealedId === p.id && inviteUrls[p.id] && (
                  <div className="flex items-center gap-2 flex-wrap bg-muted/40 rounded p-2">
                    <Input
                      readOnly
                      value={inviteUrls[p.id]}
                      className="text-xs flex-1 min-w-[220px] h-8"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button size="sm" variant="outline" onClick={() => copyInviteLink(inviteUrls[p.id])}>
                      <Copy className="h-3 w-3 mr-1" /> Linki Kopyala
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openWhatsapp(p, inviteUrls[p.id])}
                      disabled={!getPartyPhone(p)}
                      title={!getPartyPhone(p) ? "Telefon numarası girilmemiş" : undefined}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" /> WhatsApp'tan Gönder
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRevealedId(null)}>
                      Gizle
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
        {parties.length >= 2 && (
          <div className="mt-4 flex justify-end">
            <Button variant="default" onClick={onDone}>Aşamayı Tamamla →</Button>
          </div>
        )}
      </Card>
      </motion.div>

      {draft && (
        <motion.div variants={itemVariants}>
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Yeni Taraf</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Tür</Label>
              <Select value={draft.party_type} onValueChange={(v: any) => setDraft({ ...draft, party_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Bireysel</SelectItem>
                  <SelectItem value="corporate">Kurumsal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rol</Label>
              <Select value={draft.party_role} onValueChange={(v: any) => setDraft({ ...draft, party_role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="applicant">Başvurucu</SelectItem>
                  <SelectItem value="respondent">Karşı Taraf</SelectItem>
                  <SelectItem value="third_party">Üçüncü Taraf</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {draft.party_type === "individual" ? (
              <>
                <div><Label>Ad *</Label><Input value={draft.first_name ?? ""} onChange={(e) => setDraft({ ...draft, first_name: e.target.value })} /></div>
                <div><Label>Soyad *</Label><Input value={draft.last_name ?? ""} onChange={(e) => setDraft({ ...draft, last_name: e.target.value })} /></div>
                <div><Label>TC Kimlik No</Label><Input value={draft.tc_kimlik ?? ""} onChange={(e) => setDraft({ ...draft, tc_kimlik: e.target.value })} /></div>
                
                <div><Label>GSM</Label><Input value={draft.gsm ?? ""} onChange={(e) => setDraft({ ...draft, gsm: e.target.value })} /></div>
                <div><Label>Telefon</Label><Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
              </>
            ) : (
              <>
                <div><Label>Kurum Adı *</Label><Input value={draft.company_name ?? ""} onChange={(e) => setDraft({ ...draft, company_name: e.target.value })} /></div>
                <div><Label>Yetkili Kişi</Label><Input value={draft.authorized_person ?? ""} onChange={(e) => setDraft({ ...draft, authorized_person: e.target.value })} /></div>
                <div><Label>Vergi Dairesi</Label><Input value={draft.tax_office ?? ""} onChange={(e) => setDraft({ ...draft, tax_office: e.target.value })} /></div>
                <div><Label>Vergi No</Label><Input value={draft.tax_number ?? ""} onChange={(e) => setDraft({ ...draft, tax_number: e.target.value })} /></div>
                <div><Label>Ticaret Sicil No</Label><Input value={draft.trade_registry_no ?? ""} onChange={(e) => setDraft({ ...draft, trade_registry_no: e.target.value })} /></div>
                <div><Label>Telefon</Label><Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
              </>
            )}
            <div className="md:col-span-2"><Label>Adres</Label><Input value={draft.address ?? ""} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>E-posta (davet için)</Label><Input type="email" value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
          </div>

          <div className="border-t pt-3">
            <button
              type="button"
              onClick={() => setVekilDraftOpen((o) => !o)}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition"
            >
              {vekilDraftOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Vekil Bilgisi (opsiyonel)
            </button>
            {vekilDraftOpen && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <div><Label>Vekil Adı Soyadı</Label><Input value={draft.vekil_ad_soyad ?? ""} onChange={(e) => setDraft({ ...draft, vekil_ad_soyad: e.target.value })} /></div>
                <div><Label>Baro</Label><Input value={draft.vekil_baro ?? ""} onChange={(e) => setDraft({ ...draft, vekil_baro: e.target.value })} /></div>
                <div><Label>Sicil No</Label><Input value={draft.vekil_sicil_no ?? ""} onChange={(e) => setDraft({ ...draft, vekil_sicil_no: e.target.value })} /></div>
              </div>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={!!draft.kvkk_ok} onCheckedChange={(v) => setDraft({ ...draft, kvkk_ok: !!v })} />
            <span>KVKK kapsamında kişisel verilerin işlenmesini onaylıyorum.</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)} disabled={busy}>İptal</Button>
            <Button onClick={save} disabled={busy}>{busy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Kaydediliyor…</> : "Tarafı Kaydet"}</Button>
          </div>
        </Card>
        </motion.div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && !savingEdit && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Taraf Bilgilerini Düzenle</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {editing.party_type === "individual" ? (
                <>
                  <div><Label>Ad *</Label><Input value={editing.first_name ?? ""} onChange={(e) => setEditing({ ...editing, first_name: e.target.value })} /></div>
                  <div><Label>Soyad *</Label><Input value={editing.last_name ?? ""} onChange={(e) => setEditing({ ...editing, last_name: e.target.value })} /></div>
                  <div><Label>TC Kimlik No</Label><Input value={editing.tc_kimlik ?? ""} onChange={(e) => setEditing({ ...editing, tc_kimlik: e.target.value })} /></div>
                  
                  <div><Label>GSM</Label><Input value={editing.gsm ?? ""} onChange={(e) => setEditing({ ...editing, gsm: e.target.value })} /></div>
                  <div><Label>Telefon</Label><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
                </>
              ) : (
                <>
                  <div><Label>Kurum Adı *</Label><Input value={editing.company_name ?? ""} onChange={(e) => setEditing({ ...editing, company_name: e.target.value })} /></div>
                  <div><Label>Yetkili Kişi</Label><Input value={editing.authorized_person ?? ""} onChange={(e) => setEditing({ ...editing, authorized_person: e.target.value })} /></div>
                  <div><Label>Vergi Dairesi</Label><Input value={editing.tax_office ?? ""} onChange={(e) => setEditing({ ...editing, tax_office: e.target.value })} /></div>
                  <div><Label>Vergi No</Label><Input value={editing.tax_number ?? ""} onChange={(e) => setEditing({ ...editing, tax_number: e.target.value })} /></div>
                  <div><Label>Ticaret Sicil No</Label><Input value={editing.trade_registry_no ?? ""} onChange={(e) => setEditing({ ...editing, trade_registry_no: e.target.value })} /></div>
                  <div><Label>Telefon</Label><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
                </>
              )}
              <div className="md:col-span-2"><Label>Adres</Label><Input value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>E-posta</Label><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>

              <div className="md:col-span-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setVekilEditOpen((o) => !o)}
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition"
                >
                  {vekilEditOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Vekil Bilgisi (opsiyonel)
                </button>
                {vekilEditOpen && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    <div><Label>Vekil Adı Soyadı</Label><Input value={editing.vekil_ad_soyad ?? ""} onChange={(e) => setEditing({ ...editing, vekil_ad_soyad: e.target.value })} /></div>
                    <div><Label>Baro</Label><Input value={editing.vekil_baro ?? ""} onChange={(e) => setEditing({ ...editing, vekil_baro: e.target.value })} /></div>
                    <div><Label>Sicil No</Label><Input value={editing.vekil_sicil_no ?? ""} onChange={(e) => setEditing({ ...editing, vekil_sicil_no: e.target.value })} /></div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={savingEdit}>İptal</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Kaydediliyor…</> : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
    </div>
  );
}


/* ===================== PHASE 3 - PARTY ANALYSIS (docs + analysis + common ground) ===================== */

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXT = ["pdf", "doc", "docx", "txt"];
const ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

function partyDisplay(p: any) {
  return p.full_name || (p.party_type === "corporate" ? p.company_name : `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()) || "(isimsiz)";
}
function roleLabel(r?: string) {
  return r === "applicant" ? "Başvurucu" : r === "respondent" ? "Karşı Taraf" : "Üçüncü Taraf";
}

function Phase3PartyAnalysis({ caseRow, userId, isMediator, reload }: {
  caseRow: CaseRow; userId: string; isMediator: boolean; reload: () => void;
}) {
  const [parties, setParties] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState<string | null>(null);
  const [consistencyChecking, setConsistencyChecking] = useState<string | null>(null);
  const [communicationRunning, setCommunicationRunning] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<{ partyId: string; msg: string } | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statementDrafts, setStatementDrafts] = useState<Record<string, string>>({});
  const [savingStatement, setSavingStatement] = useState<string | null>(null);
  const [extractingAll, setExtractingAll] = useState(false);

  const loadAll = useCallback(async () => {
    setLoadError(null);
    try {
      const [p, d, a] = await Promise.all([
        supabase.from("case_parties").select("*").eq("case_id", caseRow.id).order("created_at"),
        supabase.from("case_documents").select("*").eq("case_id", caseRow.id).order("created_at", { ascending: false }),
        supabase.from("party_analyses").select("*").eq("case_id", caseRow.id),
      ]);
      if (p.error) { console.error("[loadAll parties]", p.error); throw p.error; }
      if (d.error) console.error("[loadAll docs]", d.error);
      if (a.error) console.error("[loadAll analyses]", a.error);
      setParties(Array.isArray(p.data) ? p.data : []);
      setDocs(Array.isArray(d.data) ? d.data : []);
      setAnalyses(Array.isArray(a.data) ? a.data : []);
    } catch (e: any) {
      console.error("[loadAll] fatal", e);
      setLoadError(e?.message ?? "Bilinmeyen hata");
      toast({ title: "Veriler yüklenemedi", description: e?.message ?? "Bilinmeyen hata", variant: "destructive" });
    } finally {
      setInitialLoading(false);
    }
  }, [caseRow.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleUpload(partyId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    for (const f of files) {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED_EXT.includes(ext) && !ALLOWED_MIME.includes(f.type)) {
        toast({ title: "Geçersiz dosya türü", description: `"${f.name}" yalnızca PDF, Word veya metin dosyası olabilir.`, variant: "destructive" });
        e.target.value = ""; return;
      }
      if (f.size > MAX_SIZE) {
        toast({ title: "Dosya çok büyük", description: `"${f.name}" 10MB sınırını aşıyor.`, variant: "destructive" });
        e.target.value = ""; return;
      }
    }

    setUploading(partyId);
    try {
      for (const f of files) {
        const safeName = f.name.replace(/[^\w.\-]+/g, "_");
        const path = `${userId}/${caseRow.id}/${partyId}-${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage.from("case-documents").upload(path, f, {
          cacheControl: "3600", upsert: false, contentType: f.type || undefined,
        });
        if (upErr) {
          const msg = /row-level security|not authorized|permission/i.test(upErr.message)
            ? "Bu başvuruya belge yükleme yetkiniz yok."
            : `Depolama hatası: ${upErr.message}`;
          throw new Error(msg);
        }
        const { data: inserted, error: insErr } = await supabase.from("case_documents").insert({
          case_id: caseRow.id, party_id: partyId,
          file_name: f.name, file_path: path, file_size: f.size, mime_type: f.type, uploaded_by: userId,
        } as any).select("id").single();
        if (insErr) {
          await supabase.storage.from("case-documents").remove([path]);
          throw new Error(`Veritabanı hatası: ${insErr.message}`);
        }
        // Metin çıkarma: beklemesiz (fire-and-forget) — yüklemeyi bloklamaz, hata sessizce loglanır.
        supabase.functions.invoke("extract-document-text", { body: { document_id: inserted?.id } })
          .catch((e) => console.error("[extract-document-text] tetiklenemedi", e));
      }
      toast({ title: "Belge yüklendi" });
      loadAll();
    } catch (err: any) {
      toast({ title: "Yükleme başarısız", description: err?.message ?? "Bilinmeyen hata", variant: "destructive" });
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  }

  async function deleteDoc(d: any) {
    await supabase.storage.from("case-documents").remove([d.file_path]);
    await supabase.from("case_documents").delete().eq("id", d.id);
    loadAll();
  }

  async function extractAllTexts() {
    setExtractingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-document-text", {
        body: { case_id: caseRow.id },
      });
      if (error) throw error;
      const count = Array.isArray((data as any)?.results) ? (data as any).results.length : undefined;
      toast({ title: count != null ? `${count} belge işlendi` : "Çıkarma tamamlandı" });
      loadAll();
    } catch (e: any) {
      toast({ title: "Metin çıkarma başarısız", description: e?.message ?? "Bilinmeyen hata", variant: "destructive" });
    } finally {
      setExtractingAll(false);
    }
  }

  async function saveStatement(partyId: string, text: string) {
    setSavingStatement(partyId);
    try {
      const { error } = await supabase.from("case_parties").update({ statement: text }).eq("id", partyId);
      if (error) throw error;
      toast({ title: "Taraf beyanı kaydedildi" });
      loadAll();
    } catch (e: any) {
      toast({ title: "Beyan kaydedilemedi", description: trErr(e.message), variant: "destructive" });
    } finally {
      setSavingStatement(null);
    }
  }

  async function runAnalysis(partyId: string) {
    setAnalysing(partyId);
    setAnalysisError(null);
    try {
      const { data, error } = await supabase.functions.invoke("party-confidential-analysis", {
        body: { case_id: caseRow.id, party_id: partyId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Taraf analizi tamamlandı" });
      loadAll();
    } catch (e: any) {
      const msg = e?.message?.includes("Forbidden")
        ? "Bu analiz için yetkiniz yok."
        : e?.message || "AI servisine ulaşılamadı.";
      setAnalysisError({ partyId, msg });
      toast({ title: "Analiz hatası", description: msg, variant: "destructive" });
    } finally { setAnalysing(null); }
  }

  // İç Tutarlılık Denetimi — party-consistency-check. runAnalysis'ten tamamen ayrı
  // akış: kendi state'i var, analysisError'a dokunmaz, loadAll() çağırmaz (sonuç
  // Aşama 4 kokpitinde okunur). Fonksiyonun döndürdüğü Türkçe mesaj olduğu gibi gösterilir.
  async function runConsistencyCheck(partyId: string) {
    setConsistencyChecking(partyId);
    try {
      const { data, error } = await supabase.functions.invoke("party-consistency-check", {
        body: { case_id: caseRow.id, party_id: partyId },
      });
      // Edge function 4xx/5xx döndürdüğünde Türkçe mesaj gövdede gelir; gövdeyi
      // hem data'dan hem de hata context'inden okumayı dene — jenerik mesaja düşme.
      let errMsg: string | null = (data as any)?.error ?? null;
      if (!errMsg && error) {
        try {
          const ctxBody = await (error as any)?.context?.json?.();
          errMsg = ctxBody?.error ?? null;
        } catch { /* gövde okunamadı */ }
        errMsg = errMsg ?? error.message;
      }
      if (errMsg) throw new Error(errMsg);
      const findings = Array.isArray((data as any)?.findings) ? (data as any).findings : [];
      toast(
        findings.length > 0
          ? { title: `İç tutarlılık denetimi tamamlandı — ${findings.length} bulgu`, description: "Sonuç Aşama 4 kokpitinde" }
          : { title: "Uyumsuzluk bulunmadı" }
      );
    } catch (e: any) {
      toast({
        title: "İç tutarlılık denetimi hatası",
        description: e?.message || "AI servisine ulaşılamadı.",
        variant: "destructive",
      });
    } finally { setConsistencyChecking(null); }
  }

  // İletişim Analizi — party-communication-analysis. İç Tutarlılık düğmesiyle aynı
  // kalıp: kendi state'i, analysisError'a dokunmaz, sonuç Aşama 4 kokpitinde okunur.
  async function runCommunicationAnalysis(partyId: string) {
    setCommunicationRunning(partyId);
    try {
      const { data, error } = await supabase.functions.invoke("party-communication-analysis", {
        body: { case_id: caseRow.id, party_id: partyId },
      });
      let errMsg: string | null = (data as any)?.error ?? null;
      if (!errMsg && error) {
        try {
          const ctxBody = await (error as any)?.context?.json?.();
          errMsg = ctxBody?.error ?? null;
        } catch { /* gövde okunamadı */ }
        errMsg = errMsg ?? error.message;
      }
      if (errMsg) throw new Error(errMsg);
      const findings = Array.isArray((data as any)?.findings) ? (data as any).findings : [];
      const questions = Array.isArray((data as any)?.discovery_questions) ? (data as any).discovery_questions : [];
      toast(
        findings.length > 0 || questions.length > 0
          ? {
              title: `İletişim analizi tamamlandı — ${findings.length} iz, ${questions.length} soru`,
              description: "Sonuç Aşama 4 kokpitinde",
            }
          : { title: "İletişim izi bulunmadı" }
      );
    } catch (e: any) {
      toast({
        title: "İletişim analizi hatası",
        description: e?.message || "AI servisine ulaşılamadı.",
        variant: "destructive",
      });
    } finally { setCommunicationRunning(null); }
  }

  const analysedCount = analyses.length;

  const progressPct = parties.length ? Math.round((analysedCount / parties.length) * 100) : 0;

  const riskLevels = analyses
    .map((a: any) => normalizeRiskLevel(a.risk_analizi?.risk_puani))
    .filter((l): l is "low" | "medium" | "high" => l !== "unknown");
  let dominantRisk: "low" | "medium" | "high" | null = null;
  if (riskLevels.length) {
    const counts: Record<string, number> = {};
    riskLevels.forEach((l) => { counts[l] = (counts[l] ?? 0) + 1; });
    dominantRisk = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as "low" | "medium" | "high";
  }
  const dominantRiskLabel = dominantRisk ? { low: "Düşük", medium: "Orta", high: "Yüksek" }[dominantRisk] : null;

  return (
    <div className="space-y-4">
      {initialLoading ? (
        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Taraf verileri yükleniyor…
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
            <div className="h-16 bg-muted rounded animate-pulse" />
            <div className="h-16 bg-muted rounded animate-pulse" />
          </div>
        </Card>

      ) : loadError ? (
        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-destructive font-semibold">
            <AlertTriangle className="h-5 w-5" /> Veriler yüklenemedi
          </div>
          <p className="text-xs text-muted-foreground break-words">{loadError}</p>
          <Button size="sm" onClick={loadAll}><RefreshCw className="h-4 w-4 mr-1" /> Yenile</Button>
        </Card>
      ) : (
      <>
      <PhaseHero
        label="Faz 3 — Taraf Analizi"
        metrics={[
          { label: "Taraf Analizi", value: parties.length ? analysedCount : null, suffix: parties.length ? ` / ${parties.length}` : "" },
          { label: "Ortalama Risk Puanı", value: dominantRiskLabel, tone: dominantRisk ?? undefined },
        ]}
      />
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={itemVariants}>
      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Aşama 3 — Taraf analizi</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Her tarafa ait bilgileri görüntüleyin, belge yükleyin ve AI analizi başlatın. Analizler tamamlandığında Ortak Zemin Raporu, Aşama 4 — Arabulucu Paneli'nde üretilir.
            </p>
          </div>
          <div className="text-right text-sm space-y-1 min-w-[180px]">
            <div className="text-muted-foreground">{analysedCount}/{parties.length} taraf analiz edildi</div>
            <Progress value={progressPct} className="h-1.5" />
            {isMediator && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={extractAllTexts}
                disabled={extractingAll}
              >
                {extractingAll ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {extractingAll ? "İşleniyor..." : "Metinleri Çıkar"}
              </Button>
            )}
          </div>
        </div>
        <div className="border-t pt-4">
          <Label className="text-sm text-muted-foreground">Uyuşmazlık konusu</Label>
          <p className="text-sm mt-1 whitespace-pre-wrap">
            {caseRow.issue_description || <span className="text-muted-foreground italic">Girilmemiş.</span>}
          </p>
        </div>
      </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <DisputeClassifierCard caseRow={caseRow} initialText={caseRow.title ?? ""} />
      </motion.div>

      {parties.length === 0 && (
        <motion.div variants={itemVariants}>
        <Card className="p-6 space-y-2">
          <div className="font-semibold">Taraflar bulunamadı</div>
          <p className="text-sm text-muted-foreground">Bu başvuruya henüz taraf eklenmemiş. Aşama 2 — Taraf Bilgileri ekranından en az iki taraf ekleyin, ardından bu adımda belge yükleyip analiz başlatabilirsiniz.</p>
        </Card>
        </motion.div>
      )}

      <div className="space-y-3">
        {parties.map((p) => {
          const partyDocs = docs.filter((d) => d.party_id === p.id);
          const a = analyses.find((x) => x.party_id === p.id);
          const open = openId === p.id;
          const an = a?.analysis ?? {};
          const analysisStale = !!a && a.issue_description_snapshot != null && a.issue_description_snapshot !== caseRow.issue_description;
          const riskLabelRaw = (an.risk_analizi ?? (a as any)?.risk_analizi)?.risk_puani;
          return (
            <motion.div variants={itemVariants} key={p.id}>
            <Card className="overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : p.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/30 transition text-left"
              >
                <div className="flex items-baseline gap-2 min-w-0 text-sm">
                  <span className="font-semibold truncate">{partyDisplay(p)}</span>
                  <span className="text-muted-foreground truncate">
                    · {roleLabel(p.party_role)} · {partyDocs.length} belge
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {riskLabelRaw && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${riskBadgeTone(riskLabelRaw)}`}>
                      {safeText(riskLabelRaw)} risk
                    </span>
                  )}
                  {a && !riskLabelRaw && <Badge variant="secondary">Analiz hazır</Badge>}
                  {analysisStale && (
                    <Badge className="bg-amber-500 text-white gap-1">
                      <AlertTriangle className="h-3 w-3" /> Konu değişti
                    </Badge>
                  )}
                  {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              {open && (
                <div className="border-t px-4 py-4 space-y-5">
                  {/* Step indicator */}
                  <div className="flex items-center gap-3 text-sm">
                    <StepDot done={partyDocs.length > 0} label="1. Belge yüklendi" />
                    <span className="text-muted-foreground">→</span>
                    <StepDot done={!!a} active={analysing === p.id} label="2. AI analiz edildi" />
                  </div>

                  {/* Party info */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {p.tc_kimlik && <div><span className="text-muted-foreground">TC:</span> {p.tc_kimlik}</div>}
                    {p.tax_number && <div><span className="text-muted-foreground">Vergi No:</span> {p.tax_number}</div>}
                    {p.email && <div><span className="text-muted-foreground">E-posta:</span> {p.email}</div>}
                    {p.gsm && <div><span className="text-muted-foreground">GSM:</span> {p.gsm}</div>}
                    {p.address && <div className="col-span-2"><span className="text-muted-foreground">Adres:</span> {p.address}</div>}
                  </div>

                  {/* Party statement */}
                  <div className="border-t pt-4">
                    <div className="text-sm font-medium mb-2">Taraf beyanı</div>
                    <Textarea
                      rows={4}
                      placeholder="Tarafın uyuşmazlığa ilişkin kendi anlatımı, talepleri, pozisyonu..."
                      value={statementDrafts[p.id] ?? p.statement ?? ""}
                      onChange={(e) => setStatementDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveStatement(p.id, statementDrafts[p.id] ?? p.statement ?? "")}
                        disabled={savingStatement === p.id}
                      >
                        {savingStatement === p.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Beyanı Kaydet
                      </Button>
                    </div>
                  </div>

                  {/* Per-party docs */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">Belgeler</div>
                      <label className="text-sm cursor-pointer text-primary hover:underline flex items-center gap-1">
                        {uploading === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Belge Yükle
                        <input type="file" multiple className="hidden"
                          accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                          onChange={(e) => handleUpload(p.id, e)} disabled={uploading === p.id} />
                      </label>
                    </div>
                    {partyDocs.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Bu taraf için belge yok.</p>
                    ) : (
                      <ul className="divide-y">
                        {partyDocs.map((d) => (
                          <motion.li
                            key={d.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className="flex items-center gap-2 text-sm py-1.5"
                          >
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="flex-1 truncate">{d.file_name}</span>
                            <Button variant="ghost" size="sm" onClick={() => deleteDoc(d)}><Trash2 className="h-3 w-3" /></Button>
                          </motion.li>
                        ))}
                      </ul>
                    )}
                    {partyDocs.some((d) => !(d.mime_type ?? "").startsWith("text/") && !d.file_name?.toLowerCase().endsWith(".txt")) && (
                      <p className="text-sm text-muted-foreground mt-2 flex items-start gap-1.5">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        Uyarı: PDF/Word belgelerin içeriği tam okunamayabilir. Daha doğru analiz için kritik metinleri .txt olarak da yükleyebilirsiniz.
                      </p>
                    )}
                  </div>

                  <div className="border-t pt-4 space-y-3">
                  {analysisStale && (
                    <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      Uyuşmazlık konusu bu analizden sonra değişti — Analizi yeniden çalıştırın.
                    </p>
                  )}

                  {/* Analysis trigger */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => runAnalysis(p.id)} disabled={analysing === p.id}>
                      {analysing === p.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                      {a ? "Yeniden Analiz Et" : "Analiz Başlat"}
                    </Button>
                    {/* İç Tutarlılık Denetimi — ayrı fonksiyon, sonuç yalnız Aşama 4 kokpitinde görünür */}
                    <Button size="sm" variant="outline" onClick={() => runConsistencyCheck(p.id)} disabled={consistencyChecking === p.id}>
                      {consistencyChecking === p.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
                      {consistencyChecking === p.id ? "Denetleniyor..." : "İç Tutarlılık Denetimi"}
                    </Button>
                    {/* İletişim Analizi — ayrı fonksiyon, sonuç yalnız Aşama 4 kokpitinde görünür */}
                    <Button size="sm" variant="outline" onClick={() => runCommunicationAnalysis(p.id)} disabled={communicationRunning === p.id}>
                      {communicationRunning === p.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <MessageSquare className="h-4 w-4 mr-1" />}
                      {communicationRunning === p.id ? "Analiz ediliyor..." : "İletişim Analizi"}
                    </Button>
                    {analysisError?.partyId === p.id && (
                      <Button size="sm" variant="outline" onClick={() => runAnalysis(p.id)}>
                        <RefreshCw className="h-4 w-4 mr-1" /> Tekrar Dene
                      </Button>
                    )}
                  </div>
                  {analysisError?.partyId === p.id && (
                    <div className="text-sm text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> {analysisError.msg}
                    </div>
                  )}

                  {!a && analysing !== p.id && !analysisError && (
                    <div className="text-sm text-muted-foreground flex items-start gap-1.5">
                      <Circle className="h-4 w-4 mt-0.5 shrink-0" />
                      Analiz henüz yapılmadı. {partyDocs.length === 0 ? "Önce belge yükleyin, ardından" : ""} “Analiz Başlat” butonuna basın.
                    </div>
                  )}
                  {analysing === p.id && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Analiz yapılıyor, lütfen bekleyin…
                    </div>
                  )}
                  </div>

                  {/* Analysis result */}
                  {a && !(isMediator || p.user_id === userId) && (
                    <div className="border-t pt-4 text-sm text-muted-foreground italic">
                      Bu bölüm yalnızca arabulucu tarafından görüntülenebilir.
                    </div>
                  )}
                  {a && (isMediator || p.user_id === userId) && (
                    <div className="border-t pt-4 space-y-4">
                      <RiskAnalysisCard
                        risk={an.risk_analizi ?? (a as any).risk_analizi}
                        sources={an.sources}
                        onRefresh={() => runAnalysis(p.id)}
                        refreshing={analysing === p.id}
                      />

                      {an.dispute_area && (
                        <P3Section title="Uyuşmazlık türü">
                          <p className="text-sm">{safeText(an.dispute_area)}</p>
                        </P3Section>
                      )}
                      {an.legal_framework && (
                        <P3Section title="Hukuki çerçeve">
                          {safeList(an.legal_framework.statutes).length > 0 && (
                            <div className="text-sm">
                              <div className="font-medium">Mevzuat</div>
                              <ul className="list-disc pl-5">{safeList(an.legal_framework.statutes).map((s, i) => <li key={i}>{s}</li>)}</ul>
                            </div>
                          )}
                          {Array.isArray(an.legal_framework.precedents) && an.legal_framework.precedents.length > 0 && (
                            <div className="text-sm mt-2">
                              <div className="font-medium">Emsal kararlar</div>
                              <ul className="list-disc pl-5">
                                {an.legal_framework.precedents.map((pr: any, i: number) => (
                                  <li key={i}><b>{safeText(pr?.court)}:</b> {safeText(pr?.decision)} <span className="text-muted-foreground">— {safeText(pr?.relevance)}</span></li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </P3Section>
                      )}
                      {safeList(an.document_findings).length > 0 && (
                        <P3Section title="Belge bulguları">
                          <ul className="list-disc pl-5 text-sm">{safeList(an.document_findings).map((f, i) => <li key={i}>{f}</li>)}</ul>
                        </P3Section>
                      )}
                      {an.party_position && (
                        <P3Section title="Taraf analizi">
                          <PosBlock label="Güçlü yanlar" items={safeList(an.party_position.strengths)} />
                          <PosBlock label="Zayıf yanlar" items={safeList(an.party_position.weaknesses)} />
                          <PosBlock label="İhtiyaçlar" items={safeList(an.party_position.interests)} />
                          {an.party_position.batna && <div className="text-sm mt-1"><b>BATNA:</b> {safeText(an.party_position.batna)}</div>}
                          {an.party_position.watna && <div className="text-sm"><b>WATNA:</b> {safeText(an.party_position.watna)}</div>}
                        </P3Section>
                      )}
                      {Array.isArray(an.discovery_questions) && an.discovery_questions.length > 0 && (
                        <P3Section title="İhtiyaç soruları">
                          <ol className="list-decimal pl-5 text-sm space-y-1">
                            {an.discovery_questions.map((q: any, i: number) => <li key={i}>{safeText(q?.question ?? q)}</li>)}
                          </ol>
                        </P3Section>
                      )}
                      <SourcesPanel sources={an.sources} />
                    </div>
                  )}
                </div>
              )}
            </Card>
            </motion.div>
          );
        })}
      </div>

      </motion.div>
      </>
      )}
    </div>
  );
}

function StepDot({ done, active, label }: { done: boolean; active?: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${done || active ? "text-foreground" : "text-muted-foreground"}`}>
      {done ? <CheckCircle2 className="h-4 w-4" /> : active ? <Loader2 className="h-4 w-4 animate-spin" /> : <Circle className="h-4 w-4" />}
      {label}
    </span>
  );
}

// Faz 3 analiz çıktısı için düz bölüm: kutu/arka plan yok, yalnız ince ayraç + boşluk.
// AnaSection'a dokunulmadı — o bileşen Faz 4 tarafından da kullanılıyor.
function P3Section({ title, children }: { title: string; children: React.ReactNode }) {
  if (isBlankNode(children)) return null;
  return (
    <div className="border-t pt-3">
      <div className="font-medium text-sm mb-1">{title}</div>
      {children}
    </div>
  );
}

// Treats null/undefined/boolean/whitespace-only children (the shape `{cond && ...}` leaves
// behind when cond is false) as "nothing to show" — real elements/numbers are never blank.
function isBlankNode(node: React.ReactNode): boolean {
  if (node === null || node === undefined || typeof node === "boolean") return true;
  if (typeof node === "string") return node.trim().length === 0;
  if (Array.isArray(node)) return node.every(isBlankNode);
  return false;
}
function AnaSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  if (isBlankNode(children)) return null;
  return (
    <div className="border rounded-md p-3 bg-muted/30">
      <div className="font-medium text-sm mb-1">{icon} {title}</div>
      {children}
    </div>
  );
}
// Numbered, checkable question cards for live mediation use: mediator taps the
// circle to mark a question as asked and can copy the exact wording. State is
// local/ephemeral by design — nothing here is persisted.
function CriticalQuestionsCard({ questions }: { questions: string[] }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const toggle = (i: number) => setChecked((prev) => ({ ...prev, [i]: !prev[i] }));
  const copy = (i: number, text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedIdx(i);
      setTimeout(() => setCopiedIdx((cur) => (cur === i ? null : cur)), 1500);
    }).catch(() => {});
  };
  return (
    <ol className="space-y-1.5 mt-1">
      {questions.map((q, i) => (
        <li
          key={i}
          className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors ${
            checked[i] ? "border-emerald-400/40 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-border bg-background"
          }`}
        >
          <button
            type="button"
            onClick={() => toggle(i)}
            className="mt-0.5 shrink-0"
            aria-label={checked[i] ? "Soruldu işaretini kaldır" : "Soruldu olarak işaretle"}
          >
            {checked[i] ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
          </button>
          <span className={`flex-1 ${checked[i] ? "line-through text-muted-foreground" : ""}`}>
            <span className="font-medium text-muted-foreground mr-1">{i + 1}.</span>{q}
          </span>
          <button
            type="button"
            onClick={() => copy(i, q)}
            className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border border-border hover:bg-muted"
          >
            {copiedIdx === i ? "Kopyalandı" : "Kopyala"}
          </button>
        </li>
      ))}
    </ol>
  );
}
function PosBlock({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="text-sm mt-1">
      <span className="font-medium">{label}:</span>
      <ul className="list-disc pl-5">{items.map((s, i) => <li key={i}>{s}</li>)}</ul>
    </div>
  );
}
// Faz 4 sekmeli yerleşiminde "Ortak Zemin" sekmesi için — Ortak Çıkarlar + ZOPA + Çözüm Senaryoları.
function CommonGroundZeminSection({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-2">
      {/* Dürüstlük bandı (mimari §5.2i) — sunucuda hesaplanır, burada yalnız gösterilir.
          Alanı taşımayan eski raporlarda goster undefined kalır ve kart hiç çizilmez. */}
      {data.durustluk_bandi?.goster === true && (
        <div className="border rounded-lg p-4 bg-amber-50 border-amber-200 text-xs text-amber-800 space-y-2">
          <div className="font-semibold">⚠️ Dayanak Uyarısı</div>
          <p>{data.durustluk_bandi.metin}</p>
          {Array.isArray(data.durustluk_bandi.hususlar) && data.durustluk_bandi.hususlar.length > 0 && (
            <ul className="space-y-1.5">
              {data.durustluk_bandi.hususlar.map((h: any, i: number) => (
                <li key={i} className="rounded-md border border-amber-400/50 bg-amber-50/60 px-2.5 py-1.5">
                  <div>{h?.husus}</div>
                  {h?.onerilen_adim && <div className="text-[11px] text-amber-700 mt-0.5">{h.onerilen_adim}</div>}
                </li>
              ))}
            </ul>
          )}
          <div className="text-[11px] text-amber-700">
            Bu uyarı yalnız size görünür; taraflara hiçbir ekranda açılmaz. {data.durustluk_bandi.toplam_rapor_disi} rapor dışı kayıttan üretildi.
          </div>
        </div>
      )}
      {data.common_interests?.length > 0 && (
        <AnaSection icon="🤝" title="Ortak Çıkarlar">
          <ul className="space-y-1.5 text-sm">
            {data.common_interests.map((s: string, i: number) => (
              <li key={i} className="flex items-start gap-2 rounded-md border border-emerald-400/50 bg-emerald-50/60 dark:bg-emerald-950/20 px-2.5 py-1.5">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </AnaSection>
      )}
      {data.zopa && (
        <AnaSection icon="📊" title="Uzlaşma Alanı (ZOPA)">
          <p className="text-sm">{data.zopa.description}</p>
          {(data.zopa.lower_bound || data.zopa.upper_bound) && (
            <p className="text-xs text-muted-foreground mt-1">Alt: {data.zopa.lower_bound} — Üst: {data.zopa.upper_bound}</p>
          )}
        </AnaSection>
      )}
      {data.scenarios?.length > 0 && (
        <AnaSection icon="📋" title="Çözüm Senaryoları">
          <div className="space-y-2">
            {data.scenarios.map((sc: any, i: number) => {
              const isStarred = /⭐/.test(`${sc.label ?? ""} ${sc.summary ?? ""}`);
              return (
                <div
                  key={i}
                  className={`border rounded p-2 bg-background transition-shadow hover:shadow-sm hover:border-primary/40 ${
                    isStarred ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : ""
                  }`}
                >
                  <div className="font-medium text-sm">{sc.label}</div>
                  <p className="text-sm">{sc.summary}</p>
                  {sc.tradeoffs?.length > 0 && (
                    <ul className="list-disc pl-5 text-xs text-muted-foreground">{sc.tradeoffs.map((t: string, j: number) => <li key={j}>{t}</li>)}</ul>
                  )}
                </div>
              );
            })}
          </div>
        </AnaSection>
      )}
    </div>
  );
}

// Faz 4 sekmeli yerleşiminde "Strateji" sekmesi için — Arabulucu Stratejisi + Kırmızı Çizgiler + Kaynaklar.
function CommonGroundStrategySection({ data, strategy }: { data: any; strategy: any }) {
  if (!data) return null;
  // `report.report.mediator_strategy` (data.mediator_strategy) is the freshly-parsed AI
  // output written on every regenerate and is the field this tab is meant to show. The
  // separate `strategy` column is a denormalized copy from the same write — for rows saved
  // before its shape settled it can hold different/legacy keys while still being non-empty,
  // so treating it as the priority source shows stale content even though data.mediator_strategy
  // is populated. Read data.mediator_strategy first; `strategy` is only a fallback for the
  // (now hypothetical) case where the report JSON itself never got a mediator_strategy key.
  const rawStrategy = data.mediator_strategy && Object.keys(data.mediator_strategy).length > 0
    ? data.mediator_strategy
    : (strategy || {});
  const openingStatement = safeText(rawStrategy.opening_statement);
  // AI output occasionally returns array items as objects instead of strings (see safeList) —
  // mapping them straight into JSX throws "Objects are not valid as a React child" and, since
  // Phase4Summary has no error boundary, blanks the whole Strateji tab.
  const criticalQuestions = safeList(rawStrategy.critical_questions);
  const deadlockTechniques = safeList(rawStrategy.deadlock_techniques);
  const redLines = safeList(data.red_lines);
  const hasStrategyContent = !!openingStatement || criticalQuestions.length > 0 || deadlockTechniques.length > 0;
  return (
    <div className="space-y-2">
      {hasStrategyContent && (
        <AnaSection icon="🎯" title="Arabulucu Stratejisi">
          <div className="text-sm space-y-1">
            {openingStatement && <div><b>Açılış:</b> {openingStatement}</div>}
            {criticalQuestions.length > 0 && (
              <div><b>Kritik Sorular:</b><CriticalQuestionsCard questions={criticalQuestions} /></div>
            )}
            {deadlockTechniques.length > 0 && (
              <div><b>Çıkmaz Teknikleri:</b><ul className="list-disc pl-5">{deadlockTechniques.map((q, i) => <li key={i}>{q}</li>)}</ul></div>
            )}
          </div>
        </AnaSection>
      )}
      {redLines.length > 0 && (
        <AnaSection icon="🚧" title="Kırmızı Çizgiler">
          <ul className="space-y-1.5 text-sm">
            {redLines.map((s, i) => (
              <li key={i} className="flex items-start gap-2 rounded-md border border-red-400/50 bg-red-50/60 dark:bg-red-950/20 px-2.5 py-1.5">
                <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </AnaSection>
      )}
      <SourcesPanel sources={data.sources} />
    </div>
  );
}

// ── Karşılaştırmalı Risk & Anlaşma Analizi ──
// İki tarafın risk_analizi verisini yan yana gösterir, ortalama uzlaşma oranı,
// ZOPA aralığı ve en güçlü senaryoyu hesaplar. Sonucu common_ground_reports.risk_ozeti
// alanına (eksikse) kaydeder.
function parsePercent(v: any): number | null {
  if (v === null || v === undefined) return null;
  const m = String(v).match(/(\d+(?:[.,]\d+)?)\s*%?/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  return isNaN(n) ? null : n;
}
function partyDisplayName(cp: any, idx: number): string {
  if (!cp) return `Taraf ${idx + 1}`;
  return cp.company_name || `${cp.first_name ?? ""} ${cp.last_name ?? ""}`.trim() || `Taraf ${idx + 1}`;
}
function ComparativeRiskAnalysis({
  parties, analyses, reportData, caseId,
}: { parties?: any[]; analyses?: any[]; reportData: any; caseId?: string }) {
  const rows = React.useMemo(() => {
    const list = Array.isArray(analyses) ? analyses : [];
    return list.map((a: any, i: number) => {
      const cp = (parties ?? []).find((p) => p.id === a.party_id) || a.case_parties || null;
      const r = a.risk_analizi || {};
      return {
        name: partyDisplayName(cp, i),
        risk_puani: r.risk_puani,
        uzlasma_orani: r.uzlasma_orani,
        uzlasma_pct: parsePercent(r.uzlasma_orani),
        mahkeme_riski: r.mahkeme_riski,
        mahkeme_pct: parsePercent(r.mahkeme_riski),
      };
    });
  }, [parties, analyses]);

  const avgUzlasma = React.useMemo(() => {
    // A party's explicit "Yeterli veri yok" is a deliberate judgment, not an absent
    // value — averaging the other party's number over it would misrepresent that as consensus.
    if (rows.some((r) => isMissing(r.uzlasma_orani))) return null;
    const vals = rows.map((r) => r.uzlasma_pct).filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [rows]);

  const hasOfficialRiskOzeti =
    !isMissing(reportData?.risk_ozeti?.genel_uzlasma_orani) || !isMissing(reportData?.risk_ozeti?.genel_risk_puani);

  const strongestScenario = React.useMemo(() => {
    const scs = Array.isArray(reportData?.scenarios) ? reportData.scenarios : [];
    return scs.find((s: any) => /dengeli/i.test(String(s?.label))) || scs[0] || null;
  }, [reportData]);

  const zopa = reportData?.zopa;

  const persistedRef = React.useRef(false);
  React.useEffect(() => {
    if (persistedRef.current) return;
    if (!caseId) return;
    if (reportData?.risk_ozeti && Object.keys(reportData.risk_ozeti).length > 0) return;
    if (rows.length < 2) return;
    persistedRef.current = true;
    const summary = {
      genel_uzlasma_orani: avgUzlasma !== null ? `% ${avgUzlasma} (taraf ortalaması)` : "Yeterli veri yok",
      genel_uzlasma_orani_kaynak: "İki tarafın risk_analizi ortalaması",
      genel_risk_puani: rows.find((r) => /yük/i.test(String(r.risk_puani)))?.risk_puani
        || rows.find((r) => /orta/i.test(String(r.risk_puani)))?.risk_puani
        || rows[0]?.risk_puani || "",
      taraf_karsilastirma: rows.map((r) => ({
        taraf: r.name, risk_puani: r.risk_puani || "",
        guclu_yon: r.uzlasma_orani ? `Uzlaşma: ${r.uzlasma_orani}` : "",
        zayif_yon: r.mahkeme_riski ? `Mahkeme riski: ${r.mahkeme_riski}` : "",
      })),
      ortak_kritik_faktorler: [],
      ortak_uzlasma_engelleri: [],
      kaynak_listesi: [],
      arabulucu_onerisi: strongestScenario?.summary ? `Önerilen yön: ${strongestScenario.label} — ${strongestScenario.summary}` : "",
    };
    (async () => {
      try {
        const { data: existing } = await supabase
          .from("common_ground_reports").select("id, report").eq("case_id", caseId)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (!existing) return;
        const nextReport = { ...((existing as any).report ?? {}), risk_ozeti: summary };
        await supabase.from("common_ground_reports")
          .update({ risk_ozeti: summary as any, report: nextReport as any })
          .eq("id", (existing as any).id);
      } catch (e) { console.warn("[ComparativeRiskAnalysis] persist failed", e); }
    })();
  }, [caseId, avgUzlasma, rows, strongestScenario, reportData?.risk_ozeti]);

  if (rows.length === 0) return null;

  const anyRiskData = rows.some((r) => r.risk_puani || r.uzlasma_orani || r.mahkeme_riski);
  if (!anyRiskData) {
    return (
      <div className="border rounded-lg p-4 bg-amber-50 border-amber-200 text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold mb-0.5">Karşılaştırmalı risk verisi bulunamadı</div>
          Taraf analizlerinde henüz <code className="font-mono">risk_analizi</code> alanı yok. Aşama 3'te "Risk Analizini Güncelle" butonu ile her taraf için risk analizini yeniden üretin.
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-primary/5 border-primary/30">
      <div className="font-semibold text-sm">📊 Karşılaştırmalı Risk & Anlaşma Analizi</div>


      <div className="grid sm:grid-cols-2 gap-2">
        {rows.map((r, i) => (
          <div key={i} className="border rounded p-3 bg-background text-sm space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium truncate">{r.name}</div>
              {r.risk_puani && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${riskBadgeTone(r.risk_puani)}`}>{r.risk_puani}</span>
              )}
            </div>
            {r.uzlasma_pct !== null ? (
              <GaugeMeter label="Anlaşma oranı" pct={r.uzlasma_pct} valueLabel={r.uzlasma_orani || `% ${r.uzlasma_pct}`} riskLabel={r.risk_puani} />
            ) : (
              <div className="text-xs"><span className="text-muted-foreground">Anlaşma oranı: </span><b>{r.uzlasma_orani || "Yeterli veri yok"}</b></div>
            )}
            {r.mahkeme_pct !== null ? (
              <GaugeMeter label="Mahkeme riski" pct={r.mahkeme_pct} valueLabel={r.mahkeme_riski || `% ${r.mahkeme_pct}`} riskLabel={r.risk_puani} />
            ) : (
              <div className="text-xs"><span className="text-muted-foreground">Mahkeme riski: </span><b>{r.mahkeme_riski || "Yeterli veri yok"}</b></div>
            )}
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {!hasOfficialRiskOzeti && (
          <div className="border rounded p-3 bg-background space-y-1">
            <div className="text-xs text-muted-foreground">Genel Uzlaşma Tahmini (ortalama)</div>
            {avgUzlasma !== null ? (
              <>
                <div className="text-lg font-semibold">% {avgUzlasma}</div>
                <Progress value={avgUzlasma} className={`h-2 ${gaugeBarClass(pctToRiskLabel(avgUzlasma))}`} />
              </>
            ) : (
              <div className="text-lg font-semibold">Yeterli veri yok</div>
            )}
            <div className="text-[11px] text-muted-foreground mt-1 italic">Basit aritmetik ortalamadır; resmi tahmin için Ortak Zemin Raporu üretin.</div>
          </div>
        )}

        <div className="border rounded p-3 bg-background">
          <div className="text-xs text-muted-foreground">Uzlaşma Alanı (ZOPA)</div>
          {zopa && (zopa.lower_bound || zopa.upper_bound || zopa.description) ? (
            <>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted">{zopa.lower_bound || "?"}</span>
                <span className="text-muted-foreground text-xs">↔</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted">{zopa.upper_bound || "?"}</span>
              </div>
              {zopa.description && <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{zopa.description}</div>}
            </>
          ) : (
            <div className="text-sm italic text-muted-foreground">ZOPA bilgisi henüz yok</div>
          )}
        </div>
      </div>

      {strongestScenario && (
        <div className="border rounded p-3 bg-background">
          <div className="text-xs text-muted-foreground">Ortak Zemin Bazında Önerilen Senaryo</div>
          <div className="text-sm font-medium">⭐ {strongestScenario.label}</div>
          {strongestScenario.summary && <div className="text-xs mt-0.5">{strongestScenario.summary}</div>}
        </div>
      )}
    </div>
  );
}

// ── Standardized risk-level tone helpers (used by every risk-badge/card) ──
export function normalizeRiskLevel(raw?: string): "low" | "medium" | "high" | "unknown" {
  const l = String(raw ?? "").toLowerCase();
  if (l.includes("yük") || l.includes("high")) return "high";
  if (l.includes("orta") || l.includes("medium") || l.includes("mid")) return "medium";
  if (l.includes("düş") || l.includes("dus") || l.includes("low")) return "low";
  return "unknown";
}
export function riskContainerTone(raw?: string): string {
  switch (normalizeRiskLevel(raw)) {
    case "high": return "border-red-400/50 bg-red-50/60 dark:bg-red-950/20";
    case "medium": return "border-amber-400/50 bg-amber-50/60 dark:bg-amber-950/20";
    case "low": return "border-emerald-400/50 bg-emerald-50/60 dark:bg-emerald-950/20";
    default: return "border-border bg-muted/30";
  }
}
export function riskBadgeTone(raw?: string): string {
  switch (normalizeRiskLevel(raw)) {
    case "high": return "bg-red-600 text-white";
    case "medium": return "bg-amber-500 text-white";
    case "low": return "bg-emerald-600 text-white";
    default: return "bg-muted text-foreground";
  }
}
// Same palette as riskBadgeTone, applied to a <Progress> indicator via the
// Radix child selector (Progress hardcodes bg-primary on its own indicator).
function gaugeBarClass(raw?: string): string {
  switch (normalizeRiskLevel(raw)) {
    case "high": return "[&>div]:bg-red-600";
    case "medium": return "[&>div]:bg-amber-500";
    case "low": return "[&>div]:bg-emerald-600";
    default: return "[&>div]:bg-primary";
  }
}
// For percentages with no categorical risk_puani of their own (e.g. a plain
// average): higher = more favorable, so map magnitude onto the same tone words.
function pctToRiskLabel(pct: number): string {
  if (pct >= 60) return "düşük";
  if (pct >= 35) return "orta";
  return "yüksek";
}
// Renders a single percentage metric as a colored <Progress> bar reusing the
// existing risk tone palette. Callers must only use this once the value has
// been confirmed numeric (parsePercent) — "Yeterli veri yok" stays as text.
function GaugeMeter({
  label, pct, valueLabel, riskLabel,
}: { label: string; pct: number; valueLabel: string; riskLabel?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold">{valueLabel}</span>
      </div>
      <Progress value={Math.min(100, Math.max(0, pct))} className={`h-2 ${gaugeBarClass(riskLabel)}`} />
    </div>
  );
}

// Match a knowledge-base source (with excerpt/url) to a name that came back inside kaynak_listesi.
function matchSource(name: string, sources?: any[]): any | null {
  if (!Array.isArray(sources) || !name) return null;
  const norm = (s: string) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  const target = norm(name);
  return sources.find((s: any) => {
    const t = norm(s?.title);
    return t && (t === target || t.includes(target) || target.includes(t));
  }) ?? null;
}

function SourceChip({ name, source }: { name: string; source: any | null }) {
  const excerpt = source?.excerpt ? cleanExcerpt(source.excerpt) : "";
  if (!source) {
    return (
      <span className="inline-block text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
        {name}
      </span>
    );
  }
  return (
    <HoverCard openDelay={80} closeDelay={100}>
      <HoverCardTrigger asChild>
        {source.url ? (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:underline cursor-pointer"
          >
            {name}
          </a>
        ) : (
          <span className="inline-block text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 cursor-help">
            {name}
          </span>
        )}
      </HoverCardTrigger>
      <HoverCardContent className="w-80 text-xs space-y-1" side="top">
        <div className="font-semibold">{source.title || name}</div>
        {source.category && <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{source.category}</div>}
        {excerpt && <blockquote className="italic border-l-2 pl-2 text-muted-foreground">"{excerpt}"</blockquote>}
        {typeof source.similarity === "number" && (
          <div className="text-[10px] text-muted-foreground">benzerlik %{Math.round(source.similarity * 100)}</div>
        )}
        {source.url && <div className="text-[10px] text-primary">Kaynağa git ↗</div>}
      </HoverCardContent>
    </HoverCard>
  );
}

// Guidance shown when a metric returns "Yeterli veri yok" so the mediator knows how to strengthen the analysis.
const NEEDS_MORE_DATA = /yeterli\s*veri\s*yok|insufficient|bilinmiyor|—+|^\s*-\s*$/i;
function isMissing(v: any): boolean {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  if (!s) return true;
  return NEEDS_MORE_DATA.test(s);
}
function MissingDataHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 text-[11px] flex items-start gap-1 rounded border border-dashed border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/10 p-2 text-amber-900 dark:text-amber-200">
      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function RiskAnalysisCard({
  risk, sources, onRefresh, refreshing,
}: { risk?: any; sources?: any[]; onRefresh?: () => void; refreshing?: boolean }) {
  if (!risk || typeof risk !== "object") return null;
  const badgeTone = riskBadgeTone(risk.risk_puani);
  const missingAny =
    isMissing(risk.uzlasma_orani) || isMissing(risk.mahkeme_riski) || isMissing(risk.tahmini_sure_tasarrufu_ay);
  // Deterministic — dedup'd straight from the RAG chunks actually retrieved, not the
  // model's own kaynak_listesi (which the künye/precedent-hallucination rule can blank
  // out even when real non-precedent sources were used).
  const kaynakNames = Array.from(new Set(
    (Array.isArray(sources) ? sources : []).map((s: any) => String(s?.title ?? "").trim()).filter(Boolean)
  ));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="font-medium text-sm">Risk analizi ve anlaşma oranı</div>
        <div className="flex items-center gap-2">
          {risk.risk_puani && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeTone}`}>{risk.risk_puani} Risk</span>
          )}
          {onRefresh && (
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Risk Analizini Güncelle
            </Button>
          )}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2 text-sm">
        <div>
          {parsePercent(risk.uzlasma_orani) !== null ? (
            <GaugeMeter label="Anlaşma Oranı" pct={parsePercent(risk.uzlasma_orani)!} valueLabel={safeText(risk.uzlasma_orani)} riskLabel={risk.risk_puani} />
          ) : (
            <>
              <div className="text-xs text-muted-foreground">Anlaşma Oranı</div>
              <div className="font-medium">{safeText(risk.uzlasma_orani) || "Yeterli veri yok"}</div>
            </>
          )}
          {risk.uzlasma_orani_kaynak && <div className="text-[11px] text-muted-foreground italic">Kaynak: {safeText(risk.uzlasma_orani_kaynak)}</div>}
        </div>
        <div>
          {parsePercent(risk.mahkeme_riski) !== null ? (
            <GaugeMeter label="Mahkeme Riski" pct={parsePercent(risk.mahkeme_riski)!} valueLabel={safeText(risk.mahkeme_riski)} riskLabel={risk.risk_puani} />
          ) : (
            <>
              <div className="text-xs text-muted-foreground">Mahkeme Riski</div>
              <div className="font-medium">{safeText(risk.mahkeme_riski) || "Yeterli veri yok"}</div>
            </>
          )}
          {risk.mahkeme_riski_kaynak && <div className="text-[11px] text-muted-foreground italic">Kaynak: {safeText(risk.mahkeme_riski_kaynak)}</div>}
        </div>
        {risk.tahmini_sure_tasarrufu_ay && (
          <div className="sm:col-span-2">
            <div className="text-xs text-muted-foreground">Tahmini Süre Tasarrufu</div>
            <div className="font-medium">{safeText(risk.tahmini_sure_tasarrufu_ay)} {typeof risk.tahmini_sure_tasarrufu_ay === "number" || /^\d/.test(String(risk.tahmini_sure_tasarrufu_ay)) ? "ay" : ""}</div>
          </div>
        )}
      </div>
      {missingAny && (
        <MissingDataHint>
          <b>Bazı metrikler için yeterli veri bulunamadı.</b> Daha net bir risk analizi için taraf profilinde
          <span className="mx-1 font-medium">talep tutarı, uyuşmazlık alt türü ve olayın kısa özetini</span>
          netleştirin; ilgili sözleşme/fatura/yazışma belgelerini <b>.txt</b> veya metin katmanlı PDF olarak yükleyin ve
          BATNA (dava yolu) ile menfaat/pozisyon ayrımını Aşama 2/3 formunda doldurun. Ardından
          <b> "Risk Analizini Güncelle"</b> butonuyla yeniden hesaplatın.
        </MissingDataHint>
      )}
      {safeList(risk.kritik_faktorler).length > 0 && (
        <div>
          <div className="text-sm font-medium mb-1">Kritik faktörler</div>
          <ul className="list-disc pl-5 text-sm">{safeList(risk.kritik_faktorler).map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {safeList(risk.uzlasma_engelleri).length > 0 && (
        <div>
          <div className="text-sm font-medium mb-1">Uzlaşma engelleri</div>
          <ul className="list-disc pl-5 text-sm">{safeList(risk.uzlasma_engelleri).map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {kaynakNames.length > 0 && (
        <div className="text-sm">
          <div className="font-medium mb-1">Kullanılan kaynaklar</div>
          <div className="flex flex-wrap gap-1">
            {kaynakNames.map((name, i) => (
              <SourceChip key={i} name={name} source={matchSource(name, sources)} />
            ))}
          </div>
        </div>
      )}
      {risk.oneri && (
        <div className="text-sm border-l-2 border-primary/40 pl-2 italic">{safeText(risk.oneri)}</div>
      )}
    </div>
  );
}

function RiskSummaryCard({ summary, sources }: { summary?: any; sources?: any[] }) {
  if (!summary || typeof summary !== "object") return null;
  const tone = riskContainerTone(summary.genel_risk_puani);
  const badgeTone = riskBadgeTone(summary.genel_risk_puani);
  const missingHeadline =
    isMissing(summary.genel_uzlasma_orani) && isMissing(summary.genel_risk_puani);
  return (
    <div className={`border rounded-lg p-4 space-y-3 ${tone}`}>
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">📊 Karşılaştırmalı Risk Özeti</div>
        {summary.genel_risk_puani && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeTone}`}>{summary.genel_risk_puani} Risk</span>
        )}
      </div>
      {parsePercent(summary.genel_uzlasma_orani) !== null ? (
        <div>
          <GaugeMeter
            label="Genel Anlaşma Oranı"
            pct={parsePercent(summary.genel_uzlasma_orani)!}
            valueLabel={summary.genel_uzlasma_orani}
            riskLabel={summary.genel_risk_puani}
          />
          {summary.genel_uzlasma_orani_kaynak && <div className="text-[11px] text-muted-foreground italic mt-0.5">({summary.genel_uzlasma_orani_kaynak})</div>}
        </div>
      ) : (
        <div className="text-sm">
          <span className="text-xs text-muted-foreground">Genel Anlaşma Oranı: </span>
          <span className="font-medium">{summary.genel_uzlasma_orani || "Yeterli veri yok"}</span>
          {summary.genel_uzlasma_orani_kaynak && <span className="text-[11px] text-muted-foreground italic"> ({summary.genel_uzlasma_orani_kaynak})</span>}
        </div>
      )}
      {missingHeadline && (
        <MissingDataHint>
          Karşılaştırmalı özet için tarafların risk analizinde eksik alanlar var. Her taraf kartında
          <b> "Risk Analizini Güncelle"</b> butonuyla analizleri yenileyin; ardından bu raporu
          <b> "Yeniden Üret"</b> ile tekrar hesaplatın.
        </MissingDataHint>
      )}
      {Array.isArray(summary.taraf_karsilastirma) && summary.taraf_karsilastirma.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-2">
          {summary.taraf_karsilastirma.map((t: any, i: number) => (
            <div key={i} className="border rounded p-2 bg-background text-sm">
              <div className="font-medium flex items-center gap-2">
                <span>{t.taraf || `Taraf ${i + 1}`}</span>
                {t.risk_puani && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${riskBadgeTone(t.risk_puani)}`}>{t.risk_puani}</span>
                )}
              </div>
              {t.guclu_yon && <div className="text-xs">✓ {t.guclu_yon}</div>}
              {t.zayif_yon && <div className="text-xs">✗ {t.zayif_yon}</div>}
            </div>
          ))}
        </div>
      )}
      {Array.isArray(summary.ortak_kritik_faktorler) && summary.ortak_kritik_faktorler.filter(Boolean).length > 0 && (
        <div>
          <div className="text-xs font-medium mb-1">Ortak Kritik Faktörler</div>
          <ul className="space-y-1">
            {summary.ortak_kritik_faktorler.filter(Boolean).map((s: string, i: number) => (
              <li key={i} className="flex items-start gap-2 rounded-md border border-foreground/15 bg-muted/50 px-2.5 py-1.5 text-sm font-medium">
                <Brain className="h-4 w-4 mt-0.5 shrink-0 text-foreground/70" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {Array.isArray(summary.ortak_uzlasma_engelleri) && summary.ortak_uzlasma_engelleri.filter(Boolean).length > 0 && (
        <div>
          <div className="text-xs font-medium mb-1">Ortak Uzlaşma Engelleri</div>
          <ul className="space-y-1">
            {summary.ortak_uzlasma_engelleri.filter(Boolean).map((s: string, i: number) => (
              <li key={i} className="flex items-start gap-2 rounded-md border border-amber-400/50 bg-amber-50/60 dark:bg-amber-950/20 px-2.5 py-1.5 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {Array.isArray(summary.kaynak_listesi) && summary.kaynak_listesi.filter(Boolean).length > 0 && (
        <div className="text-xs">
          <div className="font-medium mb-1">Kullanılan Kaynaklar</div>
          <div className="flex flex-wrap gap-1">
            {summary.kaynak_listesi.filter(Boolean).map((name: string, i: number) => (
              <SourceChip key={i} name={name} source={matchSource(name, sources)} />
            ))}
          </div>
        </div>
      )}
      {summary.arabulucu_onerisi && (
        <div className="text-sm border-l-2 border-primary/40 pl-2 italic">{summary.arabulucu_onerisi}</div>
      )}
    </div>
  );
}



const EXCERPT_MAX = 280;
function cleanExcerpt(raw?: string): string {
  if (!raw) return "";
  const text = String(raw).replace(/\s+/g, " ").trim();
  if (text.length <= EXCERPT_MAX) return text;
  const slice = text.slice(0, EXCERPT_MAX);
  // Prefer cutting at last sentence-ending punctuation, else last space.
  const punct = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
  let cut = punct > EXCERPT_MAX * 0.6 ? punct + 1 : slice.lastIndexOf(" ");
  if (cut < EXCERPT_MAX * 0.5) cut = EXCERPT_MAX;
  return slice.slice(0, cut).replace(/[\s,;:]+$/g, "") + "…";
}

const STORAGE_SOURCE_PREFIX = "storage://case-documents/";

// Elle yüklenen kaynaklar storage://case-documents/... sözde-URL'i ile geliyor; bu tarayıcıda
// açılamaz. CaseDocuments.tsx:88-104'teki desenin aynısı: prefix'i ayıklayıp Supabase Storage'dan
// authenticated indirip blob URL olarak yeni sekmede açıyoruz.
async function openStorageSource(sourceUrl: string, page?: number | null) {
  const path = sourceUrl.replace(STORAGE_SOURCE_PREFIX, "");
  const pageSuffix = Number.isFinite(page) && (page as number) > 0 ? `#page=${page}` : "";
  try {
    // İmzalı URL: gerçek https adresi olduğundan Chrome PDF görüntüleyicisi #page=N ile
    // sayfaya atlayabiliyor — blob URL'de bu atlamıyordu (canlıda doğrulandı).
    const { data: signed, error: signErr } = await supabase.storage
      .from("case-documents")
      .createSignedUrl(path, 300);
    if (!signErr && signed?.signedUrl) {
      window.open(`${signed.signedUrl}${pageSuffix}`, "_blank", "noopener,noreferrer");
      return;
    }
  } catch { /* imzalı URL alınamadı — aşağıdaki blob yedeğine düş */ }

  try {
    const { data, error } = await supabase.storage.from("case-documents").download(path);
    if (error || !data) throw error ?? new Error("Dosya indirilemedi.");
    const blobUrl = URL.createObjectURL(data);
    window.open(`${blobUrl}${pageSuffix}`, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
  } catch (e: any) {
    toast({ title: "Kaynak açılamadı", description: e?.message || "Dosya indirilemedi.", variant: "destructive" });
  }
}

function SourcesPanel({ sources }: { sources?: any[] }) {
  const list = Array.isArray(sources) ? sources : [];
  // storage:// kaynaklar artık uygulama içi görüntüleyicide açılır; https (Bakanlık
  // kitapları) kaynaklarda bugünkü yeni-sekme davranışı birebir korunur.
  const [viewerSource, setViewerSource] = useState<ViewerSource | null>(null);
  if (list.length === 0) {
    return (
      <AnaSection icon="📚" title="Kullanılan Kaynaklar">
        <p className="text-xs text-muted-foreground italic">
          Bu çıktı için resmi yayın bilgi tabanında yeterince benzer bir bölüm bulunamadı. Analiz, AI'ın genel arabuluculuk bilgisi ile üretildi. Daha fazla kaynak için Admin → "Bilgi Tabanını Güncelle" çalıştırılabilir.
        </p>
      </AnaSection>
    );
  }
  return (
    <>
    <SourceViewerDialog
      source={viewerSource}
      onOpenChange={(o) => { if (!o) setViewerSource(null); }}
      onOpenExternal={() => {
        const u = viewerSource?.url;
        if (!u) return;
        // storage:// → imzalı URL akışı (değişmedi); adb kitapları → bugünkü doğrudan
        // bağlantı (proxy'siz, #page=N ile).
        if (u.startsWith(STORAGE_SOURCE_PREFIX)) openStorageSource(u, viewerSource?.page);
        else window.open(viewerSource?.page ? `${u}#page=${viewerSource.page}` : u, "_blank", "noopener,noreferrer");
      }}
    />
    <AnaSection icon="📚" title={`Kullanılan Kaynaklar (${list.length})`}>
      <p className="text-[11px] text-muted-foreground mb-2">
        Bu çıktı, Adalet Bakanlığı Arabuluculuk Daire Başkanlığı resmi yayınlarından alınan aşağıdaki bölümlerden yararlanılarak üretildi.
        {list.length < 5 && (
          <> Bu konu için bilgi tabanında yalnızca <b>{list.length}</b> ilgili bölüm bulundu; en alakalıları gösteriliyor.</>
        )}
      </p>
      <ol className="space-y-2 text-sm list-decimal pl-5">
        {list.map((s: any, i: number) => {
          const isStorageSource = typeof s.url === "string" && s.url.startsWith(STORAGE_SOURCE_PREFIX);
          // Bakanlık kitapları da uygulama içi görüntüleyicide açılır (belge
          // knowledge-pdf-proxy üzerinden çekilir). Bu önekle başlamayan diğer https
          // kaynaklar bugünkü yeni-sekme davranışında kalır.
          const isViewerSource = isStorageSource || (typeof s.url === "string" && s.url.startsWith(ADB_SOURCE_PREFIX));
          const href = typeof s.url === "string" && s.url.startsWith("https") && s.page
            ? `${s.url}#page=${s.page}`
            : s.url;
          return (
            <li key={i} className="border rounded p-2 bg-background">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">
                  {isViewerSource ? (
                    <button
                      type="button"
                      onClick={() => setViewerSource({ title: s.title, url: s.url, page: s.page, excerpt: s.excerpt })}
                      className="text-primary hover:underline cursor-pointer bg-transparent border-0 p-0 font-medium"
                    >
                      {s.title || "Kaynak"}
                    </button>
                  ) : s.url ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {s.title || "Kaynak"}
                    </a>
                  ) : (s.title || "Kaynak")}
                  {s.category && <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">[{s.category}]</span>}
                </div>
                {typeof s.similarity === "number" && (
                  <span className="text-[10px] text-muted-foreground shrink-0">benzerlik %{Math.round(s.similarity * 100)}</span>
                )}
              </div>
              {s.excerpt && (
                <blockquote className="mt-1 text-xs text-muted-foreground italic border-l-2 pl-2">
                  "{cleanExcerpt(s.excerpt)}"
                </blockquote>
              )}
            </li>
          );
        })}
      </ol>
    </AnaSection>
    </>
  );
}

function buildReportHtml(opts: { caseTitle?: string; caseId: string; report: any; strategy: any; sources: any[]; analyses?: any[]; generatedAt: Date; }): string {
  const { caseTitle, caseId, report, strategy, sources, analyses, generatedAt } = opts;
  const r = report || {};
  const s = strategy || r.mediator_strategy || {};
  const esc = (v: any) => String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" } as any)[c]);
  const list = (arr: any[]) => (arr && arr.length ? `<ul>${arr.map((x) => `<li>${esc(typeof x === "string" ? x : JSON.stringify(x))}</li>`).join("")}</ul>` : `<p class="muted">—</p>`);
  const scenarios = (r.scenarios || []).map((sc: any) => `
    <div class="card">
      <h4>${esc(sc.label || "Senaryo")}</h4>
      <p>${esc(sc.summary || "")}</p>
      ${sc.tradeoffs?.length ? `<p class="muted"><b>Ödünler:</b></p>${list(sc.tradeoffs)}` : ""}
    </div>`).join("");

  const partyList = Array.isArray(analyses) ? analyses : [];
  const partyAnalysesHtml = partyList.map((a: any, i: number) => {
    const cp = a.case_parties || {};
    const name = cp.company_name || `${cp.first_name ?? ""} ${cp.last_name ?? ""}`.trim() || `Taraf ${i + 1}`;
    const an = a.analysis || {};
    const pp = an.party_position || {};
    const risk = a.risk_analizi ?? an.risk_analizi ?? {};
    return `
    <div class="card">
      <h4>${esc(name)}${cp.party_role ? ` <span class="muted">(${esc(roleLabel(cp.party_role))})</span>` : ""}</h4>
      ${an.dispute_area ? `<p><b>Uyuşmazlık Türü:</b> ${esc(an.dispute_area)}</p>` : ""}
      <p class="muted"><b>Pozisyon — Güçlü Yanlar:</b></p>${list(pp.strengths || [])}
      <p class="muted"><b>Pozisyon — Zayıf Yanlar:</b></p>${list(pp.weaknesses || [])}
      <p class="muted"><b>Çıkarlar / İhtiyaçlar:</b></p>${list(pp.interests || [])}
      <p><b>BATNA:</b> ${esc(pp.batna || "Yeterli veri yok")}</p>
      <p><b>WATNA:</b> ${esc(pp.watna || "Yeterli veri yok")}</p>
      <p><b>Risk Değerlendirmesi:</b></p>
      <ul>
        <li>Risk Puanı: ${esc(risk.risk_puani || "Yeterli veri yok")}</li>
        <li>Anlaşma Oranı: ${esc(risk.uzlasma_orani || "Yeterli veri yok")}${risk.uzlasma_orani_kaynak ? ` <span class="muted">(${esc(risk.uzlasma_orani_kaynak)})</span>` : ""}</li>
        <li>Mahkeme Riski: ${esc(risk.mahkeme_riski || "Yeterli veri yok")}${risk.mahkeme_riski_kaynak ? ` <span class="muted">(${esc(risk.mahkeme_riski_kaynak)})</span>` : ""}</li>
        <li>Tahmini Süre Tasarrufu: ${esc(risk.tahmini_sure_tasarrufu_ay || "Yeterli veri yok")}</li>
      </ul>
      ${risk.kritik_faktorler?.filter(Boolean)?.length ? `<p class="muted"><b>Kritik Faktörler:</b></p>${list(risk.kritik_faktorler)}` : ""}
      ${risk.uzlasma_engelleri?.filter(Boolean)?.length ? `<p class="muted"><b>Uzlaşma Engelleri:</b></p>${list(risk.uzlasma_engelleri)}` : ""}
      ${risk.oneri ? `<p><b>Öneri:</b> ${esc(risk.oneri)}</p>` : ""}
    </div>`;
  }).join("");

  const comparativeRows = partyList.map((a: any, i: number) => {
    const cp = a.case_parties || {};
    const name = cp.company_name || `${cp.first_name ?? ""} ${cp.last_name ?? ""}`.trim() || `Taraf ${i + 1}`;
    const risk = a.risk_analizi || {};
    return `<li><b>${esc(name)}</b> — Risk Puanı: ${esc(risk.risk_puani || "Yeterli veri yok")}; Anlaşma Oranı: ${esc(risk.uzlasma_orani || "Yeterli veri yok")}; Mahkeme Riski: ${esc(risk.mahkeme_riski || "Yeterli veri yok")}</li>`;
  }).join("");
  const comparativeHtml = partyList.length
    ? `<ul>${comparativeRows}</ul>`
    : `<p class="muted">Karşılaştırmalı risk verisi için taraf analizi bulunamadı.</p>`;

  const ozet = r.risk_ozeti || {};
  const hasOzet = ozet && Object.keys(ozet).length > 0;
  const ozetTarafKarsilastirma = Array.isArray(ozet.taraf_karsilastirma) ? ozet.taraf_karsilastirma : [];
  const riskOzetiHtml = hasOzet ? `
    <p><b>Genel Uzlaşma Tahmini:</b> ${esc(ozet.genel_uzlasma_orani || "Yeterli veri yok")}${ozet.genel_uzlasma_orani_kaynak ? ` <span class="muted">(${esc(ozet.genel_uzlasma_orani_kaynak)})</span>` : ""}</p>
    <p><b>Genel Risk Puanı:</b> ${esc(ozet.genel_risk_puani || "Yeterli veri yok")}</p>
    ${ozetTarafKarsilastirma.length ? `<p class="muted"><b>Taraf Karşılaştırması:</b></p><ul>${ozetTarafKarsilastirma.map((t: any) => `<li><b>${esc(t.taraf || "Taraf")}</b>${t.risk_puani ? ` (${esc(t.risk_puani)})` : ""}${t.guclu_yon ? ` — ✓ ${esc(t.guclu_yon)}` : ""}${t.zayif_yon ? ` — ✗ ${esc(t.zayif_yon)}` : ""}</li>`).join("")}</ul>` : ""}
    ${ozet.ortak_kritik_faktorler?.filter(Boolean)?.length ? `<p class="muted"><b>Ortak Kritik Faktörler:</b></p>${list(ozet.ortak_kritik_faktorler)}` : ""}
    ${ozet.ortak_uzlasma_engelleri?.filter(Boolean)?.length ? `<p class="muted"><b>Ortak Uzlaşma Engelleri:</b></p>${list(ozet.ortak_uzlasma_engelleri)}` : ""}
    ${ozet.arabulucu_onerisi ? `<p><b>Arabulucu Önerisi:</b> ${esc(ozet.arabulucu_onerisi)}</p>` : ""}
  ` : `<p class="muted">Yeterli veri yok</p>`;

  const srcHtml = (sources && sources.length)
    ? `<ol>${sources.map((x: any) => `
        <li>
          <b>${esc(x.title || "Kaynak")}</b>${x.category ? ` <span class="muted">[${esc(x.category)}]</span>` : ""}
          ${typeof x.similarity === "number" ? ` <span class="muted">— benzerlik %${Math.round(x.similarity * 100)}</span>` : ""}
          ${x.url ? `<br/><a href="${esc(x.url)}">${esc(x.url)}</a>` : ""}
          ${x.excerpt ? `<blockquote>"${esc(cleanExcerpt(x.excerpt))}"</blockquote>` : ""}
        </li>`).join("")}</ol>`
    : `<p class="muted">İlgili resmi kaynak bulunamadı.</p>`;

  // Dürüstlük bandı (mimari §5.2i) — ekrandaki kartla aynı içerik, mevcut .card/.muted
  // stilleriyle düz metin. Alan yoksa veya goster false ise hiçbir şey eklenmez.
  const band = r.durustluk_bandi;
  const bandHtml = band?.goster === true ? `
<div class="card">
<h4>⚠️ Dayanak Uyarısı</h4>
<p>${esc(band.metin || "")}</p>
${Array.isArray(band.hususlar) && band.hususlar.length ? `<ul>${band.hususlar.map((h: any) => `<li>${esc(h?.husus || "")}${h?.onerilen_adim ? `<br/><span class="muted">${esc(h.onerilen_adim)}</span>` : ""}</li>`).join("")}</ul>` : ""}
<p class="muted">Bu uyarı yalnız size görünür; taraflara hiçbir ekranda açılmaz. ${esc(String(band.toplam_rapor_disi ?? 0))} rapor dışı kayıttan üretildi.</p>
</div>` : "";
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Ortak Zemin Raporu — ${esc(caseTitle || caseId)}</title>
<style>
body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;max-width:820px;margin:24px auto;padding:0 24px;color:#1f2937;line-height:1.55}
h1{color:#0f766e;border-bottom:2px solid #0f766e;padding-bottom:6px}
h2{color:#0f766e;margin-top:28px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
h4{margin:6px 0}
.muted{color:#6b7280;font-size:13px}
.card{border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;margin:8px 0;background:#f9fafb}
blockquote{border-left:3px solid #14b8a6;margin:6px 0;padding:4px 10px;color:#374151;font-style:italic;background:#f0fdfa}
ul,ol{padding-left:20px}
.meta{color:#6b7280;font-size:12px;margin-bottom:18px}
.confidential{background:#fef2f2;border:2px solid #dc2626;color:#991b1b;font-weight:600;text-align:center;padding:8px 12px;border-radius:6px;margin-bottom:16px}
@media print{body{margin:0}}
</style></head><body>
<div class="confidential">GİZLİ — Yalnızca Arabulucu İçindir (6325 s.K. m.4/m.33)</div>
<h1>Ortak Zemin Raporu</h1>
${bandHtml}
<div class="meta"><b>Başvuru:</b> ${esc(caseTitle || "—")} &nbsp;•&nbsp; <b>ID:</b> ${esc(caseId)} &nbsp;•&nbsp; <b>Oluşturulma:</b> ${generatedAt.toLocaleString("tr-TR")}</div>

<h2>Taraf Analizleri</h2>${partyAnalysesHtml || `<p class="muted">Taraf analizi bulunamadı.</p>`}

<h2>Ortak Çıkarlar</h2>${list(r.common_interests || [])}

<h2>ZOPA (Olası Anlaşma Aralığı)</h2>
${r.zopa ? `<p>${esc(r.zopa.description || "")}</p><p class="muted">Alt sınır: ${esc(r.zopa.lower_bound || "—")} • Üst sınır: ${esc(r.zopa.upper_bound || "—")}</p>` : `<p class="muted">—</p>`}

<h2>Çözüm Senaryoları</h2>${scenarios || `<p class="muted">—</p>`}

<h2>Arabulucu Stratejisi</h2>
${s.opening_statement ? `<p><b>Açılış:</b> ${esc(s.opening_statement)}</p>` : ""}
${s.critical_questions?.length ? `<p><b>Kritik Sorular:</b></p>${list(s.critical_questions)}` : ""}
${s.deadlock_techniques?.length ? `<p><b>Tıkanıklık Teknikleri:</b></p>${list(s.deadlock_techniques)}` : ""}

<h2>Kırmızı Çizgiler</h2>${list(r.red_lines || [])}

<h2>Karşılaştırmalı Risk Analizi</h2>${comparativeHtml}

<h2>Risk Özeti</h2>${riskOzetiHtml}

<h2>📚 Kullanılan Kaynaklar (${(sources || []).length})</h2>
<p class="muted">Adalet Bakanlığı Arabuluculuk Daire Başkanlığı resmi yayınlarından.</p>
${srcHtml}

<div class="meta" style="margin-top:32px;text-align:center">MediPact AI tarafından oluşturuldu • ${generatedAt.toLocaleString("tr-TR")}</div>
</body></html>`;
}

function downloadReport(opts: { caseTitle?: string; caseId: string; report: any; strategy: any; analyses?: any[]; mode: "print" | "html" }) {
  const sources = opts.report?.sources || [];
  const html = buildReportHtml({ caseTitle: opts.caseTitle, caseId: opts.caseId, report: opts.report, strategy: opts.strategy, sources, analyses: opts.analyses, generatedAt: new Date() });
  if (opts.mode === "print") {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
  } else {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ortak-zemin-raporu-${opts.caseId}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Genel Bakış kokpitinin kendisinin brifing çıktısı — Ortak Zemin Raporu'ndan (buildReportHtml)
// ayrı: kokpit sırasını (uzlaşma → ZOPA → karşılaştırma → senaryolar → engeller → öneri) birebir izler.
function buildCockpitBriefingHtml(opts: {
  caseTitle?: string; caseId: string; generatedAt: Date;
  uzlasmaPct: number | null; uzlasmaKaynak?: string; riskPuani?: string;
  zopa: any; tarafKarsilastirma: any[]; scenarios: any[];
  criticalFactors: string[]; redLines: string[]; obstacles: string[];
  mediatorOneri?: string; kaynakListesi: string[]; sources?: any[];
}): string {
  const { caseTitle, caseId, generatedAt, uzlasmaPct, uzlasmaKaynak, riskPuani, zopa, tarafKarsilastirma, scenarios, criticalFactors, redLines, obstacles, mediatorOneri, kaynakListesi, sources } = opts;
  const esc = (v: any) => String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" } as any)[c]);
  const list = (arr: string[]) => (arr && arr.length ? `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="muted">Yeterli veri yok</p>`);
  const dateLabel = generatedAt.toLocaleString("tr-TR");
  const fileTitle = `Kokpit Brifingi — ${caseTitle || caseId} — ${generatedAt.toLocaleDateString("tr-TR")}`;

  const zopaHtml = (zopa && (zopa.lower_bound || zopa.upper_bound || zopa.description))
    ? `<p><b>Alt Sınır:</b> ${esc(zopa.lower_bound || "—")} &nbsp;•&nbsp; <b>Üst Sınır:</b> ${esc(zopa.upper_bound || "—")}</p>
       <p><b>Örtüşme:</b> ${esc(zopa.description || "Yeterli veri yok")}</p>`
    : `<p class="muted">Yeterli veri yok</p>`;

  const comparisonHtml = tarafKarsilastirma.length
    ? `<table><thead><tr><th>Taraf</th><th>Risk Puanı</th><th>Güçlü Yön</th><th>Zayıf Yön</th></tr></thead><tbody>
        ${tarafKarsilastirma.map((t: any) => `<tr>
          <td>${esc(t?.taraf || "Taraf")}</td>
          <td>${esc(t?.risk_puani || "—")}</td>
          <td>${esc(t?.guclu_yon || "—")}</td>
          <td>${esc(t?.zayif_yon || "—")}</td>
        </tr>`).join("")}
       </tbody></table>`
    : `<p class="muted">Yeterli veri yok</p>`;

  const scenariosHtml = scenarios.length
    ? scenarios.map((sc: any, i: number) => `
      <div class="card">
        <h4>${String.fromCharCode(65 + i)}) ${esc(sc?.label || "Senaryo")}</h4>
        <p>${esc(sc?.summary || "Yeterli veri yok")}</p>
        ${sc?.tradeoffs?.length ? `<p class="muted"><b>Ödünler:</b></p>${list(sc.tradeoffs)}` : ""}
      </div>`).join("")
    : `<p class="muted">Yeterli veri yok</p>`;

  const kaynaklarHtml = kaynakListesi.length
    ? `<ol>${kaynakListesi.map((name) => {
        const src = matchSource(name, sources);
        return `<li>${esc(name)}${src?.url ? ` — <a href="${esc(src.url)}">${esc(src.url)}</a>` : ""}</li>`;
      }).join("")}</ol>`
    : `<p class="muted">Yeterli veri yok</p>`;

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>${esc(fileTitle)}</title>
<style>
body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;max-width:780px;margin:20px auto;padding:0 20px;color:#1f2937;line-height:1.45;font-size:13px}
h1{color:#0f766e;border-bottom:2px solid #0f766e;padding-bottom:5px;font-size:20px;margin-bottom:4px}
h2{color:#0f766e;margin:16px 0 6px;border-bottom:1px solid #e5e7eb;padding-bottom:3px;font-size:14px}
h4{margin:4px 0;font-size:13px}
.muted{color:#6b7280;font-size:12px}
.card{border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;margin:6px 0;background:#f9fafb}
ul,ol{padding-left:18px;margin:4px 0}
table{width:100%;border-collapse:collapse;margin:6px 0;font-size:12px}
th,td{border:1px solid #e5e7eb;padding:4px 6px;text-align:left;vertical-align:top}
th{background:#f0fdfa;color:#0f766e}
.meta{color:#6b7280;font-size:11px;margin-bottom:12px}
.confidential{background:#fef2f2;border:2px solid #dc2626;color:#991b1b;font-weight:600;text-align:center;padding:6px 10px;border-radius:6px;margin-bottom:12px;font-size:12px}
.hero{background:#f0fdfa;border:1px solid #0f766e;border-radius:8px;padding:10px 14px;margin:10px 0;text-align:center}
.hero .pct{font-size:34px;font-weight:700;color:#0f766e}
.hero .label{font-size:11px;color:#0f766e;text-transform:uppercase;letter-spacing:.08em}
.recommendation{border:2px solid #0f766e;background:#f0fdfa;border-radius:8px;padding:10px 12px;font-style:italic}
@media print{body{margin:0;font-size:12px}.card{break-inside:avoid}}
</style></head><body>
<div class="confidential">GİZLİ — Yalnızca Arabulucu İçindir (6325 s.K. m.4/m.33)</div>
<h1>Kokpit Brifingi</h1>
<div class="meta"><b>Başvuru:</b> ${esc(caseTitle || "—")} &nbsp;•&nbsp; <b>ID:</b> ${esc(caseId)} &nbsp;•&nbsp; <b>Oluşturulma:</b> ${dateLabel}</div>

<div class="hero">
  <div class="pct">${uzlasmaPct !== null ? `%${uzlasmaPct}` : "Yeterli veri yok"}</div>
  <div class="label">Genel Uzlaşma Tahmini${riskPuani ? ` &nbsp;•&nbsp; Risk: ${esc(riskPuani)}` : ""}</div>
  ${uzlasmaKaynak ? `<div class="muted">${esc(uzlasmaKaynak)}</div>` : ""}
</div>

<h2>Uzlaşma Alanı (ZOPA)</h2>${zopaHtml}

<h2>Güçlü ve Zayıf Yanlar</h2>${comparisonHtml}

<h2>Çözüm Senaryoları</h2>${scenariosHtml}

<h2>Kritik Faktörler</h2>${list(criticalFactors)}

<h2>Kırmızı Çizgiler</h2>${list(redLines)}

<h2>Uzlaşma Engelleri</h2>${list(obstacles)}

<h2>Arabulucu Önerisi</h2>${mediatorOneri ? `<div class="recommendation">${esc(mediatorOneri)}</div>` : `<p class="muted">Yeterli veri yok</p>`}

<h2>Kaynaklar</h2>${kaynaklarHtml}

<div class="meta" style="margin-top:20px;text-align:center">MediPact AI tarafından oluşturuldu • ${dateLabel}</div>
</body></html>`;
}

function downloadCockpitBriefing(opts: {
  caseTitle?: string; caseId: string; mode: "print" | "html";
  uzlasmaPct: number | null; uzlasmaKaynak?: string; riskPuani?: string;
  zopa: any; tarafKarsilastirma: any[]; scenarios: any[];
  criticalFactors: string[]; redLines: string[]; obstacles: string[];
  mediatorOneri?: string; kaynakListesi: string[]; sources?: any[];
}) {
  const html = buildCockpitBriefingHtml({ ...opts, generatedAt: new Date() });
  if (opts.mode === "print") {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
  } else {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kokpit-brifingi-${opts.caseId}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// ── Faz 4 bölüm PDF'i ────────────────────────────────────────────────────
// Motor DEĞİŞMEDİ: kokpit brifingiyle birebir aynı akış — HTML string kurulur,
// yeni sekmede açılır, window.print() ile PDF'e verilir. Türkçe karakterler aynı
// yolla korunur (<meta charset="UTF-8"> + sistem fontu); yeni kütüphane yok.
const pdfEsc = (v: any) => String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" } as any)[c]);
const pdfList = (arr?: string[]) =>
  arr && arr.length ? `<ul>${arr.map((x) => `<li>${pdfEsc(x)}</li>`).join("")}</ul>` : `<p class="muted">Yeterli veri yok</p>`;

// Gizli bölümlerin HER SAYFASINA basılan alt bilgi. position:fixed olduğu için
// yazdırmada her sayfada tekrarlanır — tarayıcıların standart davranışı.
const PDF_CONFIDENTIAL_NOTE = "Arabulucuya özeldir — taraflarla paylaşılamaz";

function buildSectionsPdfHtml(opts: {
  caseTitle?: string; caseId: string; generatedAt: Date;
  docTitle: string; confidential: boolean;
  sections: { title: string; html: string }[];
}): string {
  const { caseTitle, caseId, generatedAt, docTitle, confidential, sections } = opts;
  const dateLabel = generatedAt.toLocaleString("tr-TR");
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>${pdfEsc(docTitle)} — ${pdfEsc(caseTitle || caseId)}</title>
<style>
body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;max-width:780px;margin:20px auto;padding:0 20px;color:#1f2937;line-height:1.45;font-size:13px}
h1{color:#0f766e;border-bottom:2px solid #0f766e;padding-bottom:5px;font-size:20px;margin-bottom:4px}
h2{color:#0f766e;margin:16px 0 6px;border-bottom:1px solid #e5e7eb;padding-bottom:3px;font-size:14px}
h4{margin:4px 0;font-size:13px}
.muted{color:#6b7280;font-size:12px}
.card{border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;margin:6px 0;background:#f9fafb}
ul,ol{padding-left:18px;margin:4px 0}
table{width:100%;border-collapse:collapse;margin:6px 0;font-size:12px}
th,td{border:1px solid #e5e7eb;padding:4px 6px;text-align:left;vertical-align:top}
th{background:#f0fdfa;color:#0f766e}
.meta{color:#6b7280;font-size:11px;margin-bottom:12px}
.confidential{background:#fef2f2;border:2px solid #dc2626;color:#991b1b;font-weight:600;text-align:center;padding:6px 10px;border-radius:6px;margin-bottom:12px;font-size:12px}
.quote{color:#374151;font-style:italic}
.pagenote{position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:10px;color:#991b1b;border-top:1px solid #fecaca;background:#fff;padding:4px 0}
@media print{body{margin:0;font-size:12px}.card{break-inside:avoid}h2{break-after:avoid}${confidential ? "body{padding-bottom:30px}" : ""}}
</style></head><body>
${confidential ? `<div class="confidential">GİZLİ — Yalnızca Arabulucu İçindir (6325 s.K. m.4/m.33)</div>` : ""}
<h1>${pdfEsc(docTitle)}</h1>
<div class="meta"><b>Başvuru:</b> ${pdfEsc(caseTitle || "—")} &nbsp;•&nbsp; <b>ID:</b> ${pdfEsc(caseId)} &nbsp;•&nbsp; <b>Oluşturulma:</b> ${dateLabel}</div>
${sections.map((s) => `<h2>${pdfEsc(s.title)}</h2>${s.html}`).join("")}
<div class="meta" style="margin-top:20px;text-align:center">MediPact AI tarafından oluşturuldu • ${dateLabel}</div>
${confidential ? `<div class="pagenote">${pdfEsc(PDF_CONFIDENTIAL_NOTE)}</div>` : ""}
</body></html>`;
}

function printSectionsPdf(opts: {
  caseTitle?: string; caseId: string; docTitle: string; confidential: boolean;
  sections: { title: string; html: string }[];
}) {
  const html = buildSectionsPdfHtml({ ...opts, generatedAt: new Date() });
  const w = window.open("", "_blank");
  if (!w) {
    toast({ title: "PDF açılamadı", description: "Tarayıcı açılır pencereyi engelledi.", variant: "destructive" });
    return;
  }
  w.document.write(html);
  w.document.close();
  w.onload = () => w.print();
}

/* ===================== PHASE 4 KOKPİT — Genel Bakış sekmesi bileşenleri ===================== */
// Görsel dil Faz 3'teki P3Section kalıbıyla aynı: zemin beyaz, bölümler ince ayraçla
// ayrılır, kutu içinde kutu yoktur. Renk YALNIZ durum rozetlerinde (risk seviyesi, güven
// seviyesi) kullanılır; lacivert (primary) yalnız başlık ve düğmelerde, gövde metni siyah,
// açıklamalar gri. Veri kaynakları ve prop'lar değişmedi — yalnız sunum.

// Faz 3'teki taraf kartı katlanma kalıbının kokpit karşılığı: tek satır başlık +
// sağda kısa özet + ok; içerik tıklanınca açılır. Kutu içinde kutu olmaması için
// Card yerine ince üst ayraç kullanılır — Faz 3'teki etkileşimin aynısı.
function CockpitCollapsible({
  id, title, summary, hint, open, onToggle, onPdf, children,
}: {
  id: string; title: string; summary?: string; hint?: string; open: boolean; onToggle: () => void;
  // Yalnız çıktısı olan bölümlerde dolu gelir; boşsa PDF düğmesi hiç çizilmez.
  onPdf?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="border-t scroll-mt-24">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          title={hint}
          className="flex-1 min-w-0 flex items-center justify-between gap-3 py-3 hover:bg-accent/30 transition text-left"
        >
          <span className="text-sm font-medium truncate">{title}</span>
          <span className="flex items-center gap-2 shrink-0">
            {summary && <span className="text-sm text-muted-foreground">{summary}</span>}
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>
        {onPdf && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs shrink-0"
            onClick={onPdf}
            title={`${title} — PDF`}
          >
            PDF
          </Button>
        )}
      </div>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

// Kart içi en fazla üç satır kuralının karşılığı: uzun dayanak/gerekçe metinleri
// silinmez, bu açılımın altına alınır. CockpitRootCauseCard'daki "Açıkla/Gizle"
// düğmesinin aynısı, tek yerde toplanmış hali.
function CockpitDisclosure({ label = "Açıkla", children }: { label?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (isBlankNode(children)) return null;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium text-primary hover:underline"
      >
        {open ? "Gizle" : label}
      </button>
      {open && <div className="mt-1.5 space-y-1.5">{children}</div>}
    </div>
  );
}

function CockpitGauge({ pct, riskLabel, sourceHint }: { pct: number | null; riskLabel?: string; sourceHint?: string }) {
  const empty = pct === null;
  const clamped = empty ? 0 : Math.min(100, Math.max(0, pct));
  const r = 80;
  const circumference = Math.PI * r;
  const dashOffset = circumference * (1 - clamped / 100);
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-sm font-semibold text-primary mb-1">Uzlaşma tahmini</div>
      <div className="relative w-full max-w-[220px]">
        <svg viewBox="0 0 200 100" className="w-full">
          <path d="M20,90 A80,80 0 0 1 180,90" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" className="text-muted" />
          <path
            d="M20,90 A80,80 0 0 1 180,90" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            className={empty ? "text-muted" : "text-primary"}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex justify-center">
          <div className={`font-display font-bold tabular-nums leading-none ${empty ? "text-3xl text-muted-foreground" : "text-5xl text-foreground"}`}>
            {empty ? "—" : <PhaseHeroCountUp value={clamped} suffix="%" />}
          </div>
        </div>
      </div>
      {riskLabel && !empty && (
        <span className={`mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${riskBadgeTone(riskLabel)}`}>{riskLabel} risk</span>
      )}
      {sourceHint && <div className="text-sm text-muted-foreground mt-1.5 text-center max-w-[220px]">{sourceHint}</div>}
    </div>
  );
}

function CockpitZopaBand({ zopa, lowerName, upperName }: { zopa: any; lowerName?: string; upperName?: string }) {
  const hasData = zopa && (zopa.lower_bound || zopa.upper_bound || zopa.description);
  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-full min-h-[140px]">
        <div className="text-sm font-semibold text-primary mb-1">Uzlaşma alanı (ZOPA)</div>
        <p className="text-sm text-muted-foreground italic">ZOPA için rapor üretin</p>
      </div>
    );
  }
  return (
    <div className="space-y-3 h-full">
      <div className="text-sm font-semibold text-primary">Uzlaşma alanı (ZOPA)</div>
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          <div className="text-sm text-muted-foreground">{lowerName ? `${lowerName} alt teklifi` : "Alt teklif"}</div>
          <div className="font-display text-lg font-bold">{zopa.lower_bound || "?"}</div>
        </div>
        <div className="flex-1 h-3 rounded-full bg-muted relative overflow-hidden">
          <div className="absolute inset-y-0 left-[15%] right-[15%] rounded-full bg-primary/70" />
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm text-muted-foreground">{upperName ? `${upperName} üst talebi` : "Üst talep"}</div>
          <div className="font-display text-lg font-bold">{zopa.upper_bound || "?"}</div>
        </div>
      </div>
      {zopa.description && <p className="text-sm text-muted-foreground leading-snug">{zopa.description}</p>}
    </div>
  );
}

function CockpitMiniBar({ label, pct, valueLabel }: { label: string; pct: number | null; valueLabel: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">{valueLabel}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: pct !== null ? `${Math.min(100, Math.max(0, pct))}%` : "0%" }} />
      </div>
    </div>
  );
}

function CockpitPartyColumn({
  name, riskPuani, uzlasmaPct, uzlasmaLabel, mahkemePct, mahkemeLabel, batna,
}: {
  name: string; riskPuani?: string; uzlasmaPct: number | null; uzlasmaLabel: string;
  mahkemePct: number | null; mahkemeLabel: string; batna: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold truncate">{name}</div>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${riskBadgeTone(riskPuani)}`}>{riskPuani || "—"}</span>
      </div>
      <CockpitMiniBar label="Anlaşma oranı" pct={uzlasmaPct} valueLabel={uzlasmaLabel} />
      <CockpitMiniBar label="Mahkeme riski" pct={mahkemePct} valueLabel={mahkemeLabel} />
      <div>
        <div className="text-sm text-muted-foreground">BATNA gücü</div>
        <div className="text-sm leading-snug line-clamp-2">{batna || "—"}</div>
      </div>
    </div>
  );
}

// Kök neden katmanının güven_seviyesi rozeti — riskBadgeTone'dan bilinçli olarak ayrı:
// "Düşük" burada bir tehlike değil, sadece zayıf dayanaklı bir çıkarım anlamına gelir (nötr gri).
function confidenceBadgeTone(raw?: string): string {
  switch (normalizeRiskLevel(raw)) {
    case "high": return "bg-emerald-600 text-white";
    case "medium": return "bg-amber-500 text-white";
    case "low": return "bg-slate-500 text-white";
    default: return "bg-muted text-foreground";
  }
}

// Rozet olmayan, yalnız etiketleyen küçük çipler (taraf adı, iz tipi, kategori) —
// bunlar durum bildirmediği için renksiz kalır.
const cockpitTagClass = "text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground";

// Faz 4 kokpiti, mediator-only: party_root_cause_analysis satırı hiç yoksa veya kok_neden
// boş {} ise nazik boş durum gösterir — uydurma metin YOK.
function CockpitRootCauseCard({
  name, rootCause,
}: {
  name: string;
  rootCause?: { gorunen_talep?: string; asil_mesele?: string; dayanak?: string; guven_seviyesi?: string } | null;
}) {
  const asilMesele = safeText(rootCause?.asil_mesele);
  const gorunenTalep = safeText(rootCause?.gorunen_talep);
  const dayanak = safeText(rootCause?.dayanak);
  const isInsufficient = asilMesele === "Yeterli veri yok";
  const hasData = !!(asilMesele || gorunenTalep) && !isInsufficient;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium truncate">{name}</span>
        {rootCause?.guven_seviyesi && (
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${confidenceBadgeTone(rootCause.guven_seviyesi)}`}>
            {rootCause.guven_seviyesi}
          </span>
        )}
      </div>

      {!hasData && !isInsufficient ? (
        <p className="text-sm text-muted-foreground italic">
          Kök neden analizi henüz üretilmedi — taraf analizi çalıştırıldığında oluşur.
        </p>
      ) : isInsufficient ? (
        <p className="text-sm text-muted-foreground italic">Yeterli veri yok.</p>
      ) : (
        <div className="space-y-1">
          <div className="text-sm leading-snug">
            <span className="text-muted-foreground">Görünen talep: </span>{gorunenTalep || "—"}
          </div>
          <div className="text-sm leading-snug">
            <span className="text-muted-foreground">Asıl mesele: </span>{asilMesele || "—"}
          </div>
          {dayanak && (
            <CockpitDisclosure>
              <p className="text-sm text-muted-foreground leading-snug">Dayanak: {dayanak}</p>
            </CockpitDisclosure>
          )}
        </div>
      )}
    </div>
  );
}

function CockpitScenarioCard({ letter, scenario, recommended, onClick }: { letter: string; scenario: any; recommended: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left rounded-md border p-3 space-y-1.5 cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent/20"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-primary">{letter}</span>
        {recommended && <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">Önerilen</span>}
      </div>
      <div className="text-sm font-medium line-clamp-1">{scenario.label || "Senaryo"}</div>
      <p className="text-sm text-muted-foreground line-clamp-2">{scenario.summary}</p>
    </button>
  );
}

function CockpitBadgeFlow({ items }: { items: { text: string; sources: string[] }[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground italic">Henüz belirlenmedi</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((f, i) => (
        <span
          key={i}
          className={cockpitTagClass}
          title={f.sources.length > 1 ? `Vurgulayan taraflar: ${f.sources.join(", ")}` : f.sources[0]}
        >
          {f.text}
          {f.sources.length > 1 && <span className="ml-1 opacity-70">({f.sources.length})</span>}
        </span>
      ))}
    </div>
  );
}

// Kırmızı çizgiler kritik uyarıdır: kutu değil, tek satır kırmızı metin.
function CockpitRedLines({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground italic">Henüz belirlenmedi</p>;
  return (
    <ul className="space-y-1">
      {items.map((r, i) => (
        <li key={i} className="text-sm text-destructive leading-snug">{r}</li>
      ))}
    </ul>
  );
}

// risk_ozeti'nin AI tarafından üretilmiş resmi taraf karşılaştırma tablosu — CockpitPartyColumn'daki
// tarafın kendi risk_analizi'nden anlık hesaplanan verilerle karışmasın diye ayrı bölüm.
function CockpitOfficialComparisonTable({ items }: { items: any[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-primary">Güçlü ve zayıf yanlar</div>
      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((t: any, i: number) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium truncate">{safeText(t?.taraf) || `Taraf ${i + 1}`}</span>
              {t?.risk_puani && (
                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${riskBadgeTone(t.risk_puani)}`}>{t.risk_puani}</span>
              )}
            </div>
            {t?.guclu_yon && (
              <div className="text-sm leading-snug">
                <span className="text-muted-foreground">Güçlü yan: </span>{t.guclu_yon}
              </div>
            )}
            {t?.zayif_yon && (
              <div className="text-sm leading-snug">
                <span className="text-muted-foreground">Zayıf yan: </span>{t.zayif_yon}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CockpitObstacles({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground italic">Henüz belirlenmedi</p>;
  return (
    <ul className="divide-y">
      {items.map((o, i) => (
        <li key={i} className="text-sm leading-snug py-1.5">{o}</li>
      ))}
    </ul>
  );
}

// Kokpitin "sonuç cümlesi".
function CockpitMediatorRecommendation({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div>
      <div className="text-sm font-semibold text-primary mb-1">Arabulucu önerisi</div>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function CockpitSources({ items, sources }: { items: string[]; sources?: any[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-sm font-semibold text-primary mb-1.5">Kaynaklar</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((name, i) => (
          <SourceChip key={i} name={name} source={matchSource(name, sources)} />
        ))}
      </div>
    </div>
  );
}

const WORKLOG_KATEGORI_LABELS: Record<string, string> = {
  zayif_dayanak: "Zayıf Dayanak",
  veri_yetersiz: "Veri Yetersiz",
  celiskili: "Çelişkili",
  ek_gorusme_gerekli: "Ek Görüşme Gerekli",
};

// agent_worklog.entry_type='rapor_disi' satırlarının kokpit görünümü — arabulucuya özel,
// ajanın değerlendirip nihai rapora almadığı hususları gösterir. content JSON'u
// party-confidential-analysis'teki rapor_disi_degerlendirmeler şemasıyla birebir eşleşir.
// Gerekçe ve önerilen adım "Açıkla" altına alındı: kart üç satırı aşmasın (metin silinmedi).
function CockpitOffReportItem({ item, partyLabel }: { item: any; partyLabel: string | null }) {
  const husus = safeText(item?.husus);
  const neden = safeText(item?.neden_rapora_girmedi);
  const adim = safeText(item?.onerilen_adim);
  const kategori = String(item?.kategori ?? "");
  if (!husus && !neden && !adim) return null;
  return (
    <li className="py-2.5 space-y-1">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="text-sm font-medium">{husus || "—"}</div>
        <div className="flex items-center gap-1.5 shrink-0">
          {kategori && <span className={cockpitTagClass}>{WORKLOG_KATEGORI_LABELS[kategori] ?? kategori}</span>}
          {partyLabel && <span className={cockpitTagClass}>{partyLabel}</span>}
        </div>
      </div>
      {(neden || adim) && (
        <CockpitDisclosure>
          {neden && <p className="text-sm text-muted-foreground leading-snug">{neden}</p>}
          {adim && <p className="text-sm leading-snug">Önerilen adım: {adim}</p>}
        </CockpitDisclosure>
      )}
    </li>
  );
}

// party_consistency_findings tek bulgusunun kokpit görünümü — arabulucuya özel.
// guven_seviyesi fonksiyondan "yuksek|orta|dusuk" olarak gelir; rozet için mevcut
// confidenceBadgeTone'un beklediği Türkçe etikete çevrilir (yeni rozet mantığı YOK).
const CONSISTENCY_CONFIDENCE_LABELS: Record<string, string> = {
  yuksek: "Yüksek",
  orta: "Orta",
  dusuk: "Düşük",
};

function CockpitConsistencyItem({ finding, partyLabel }: { finding: any; partyLabel: string | null }) {
  const gozlem = safeText(finding?.gozlem);
  const kaynakA = safeText(finding?.dayanak_a?.kaynak);
  const alintiA = safeText(finding?.dayanak_a?.alinti);
  const kaynakB = safeText(finding?.dayanak_b?.kaynak);
  const alintiB = safeText(finding?.dayanak_b?.alinti);
  if (!gozlem || !alintiA || !alintiB) return null;
  const confLabel = CONSISTENCY_CONFIDENCE_LABELS[String(finding?.guven_seviyesi ?? "").toLowerCase()] ?? "";

  return (
    <div className="py-2.5 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium leading-snug">{gozlem}</div>
        {confLabel && (
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${confidenceBadgeTone(confLabel)}`}>
            {confLabel}
          </span>
        )}
      </div>
      {partyLabel && <span className={`${cockpitTagClass} inline-block`}>{partyLabel}</span>}
      {/* İki dayanak alıntısı "Açıkla" altında — kart üç satırı aşmasın (metin silinmedi). */}
      <CockpitDisclosure label="Dayanakları göster">
        <div className="text-sm">
          <span className="text-muted-foreground">{kaynakA || "Dayanak 1"}: </span>{alintiA}
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">{kaynakB || "Dayanak 2"}: </span>{alintiB}
        </div>
      </CockpitDisclosure>
    </div>
  );
}

// party_communication_analysis tek izinin kokpit görünümü — CockpitConsistencyItem
// kalıbından türetildi. Fark: iki dayanak değil TEK dayanak var, onun yerine iz tipini
// gösteren bir etiket eklendi. Bilinmeyen slug olduğu gibi gösterilir (uydurma etiket yok).
const COMMUNICATION_IZ_LABELS: Record<string, string> = {
  kacinilan_konu: "Kaçınılan konu",
  tekrar_eden_tema: "Tekrar eden tema",
  sertlesme_noktasi: "Sertleşme noktası",
  hic_deginilmeyen_alan: "Hiç değinilmeyen alan",
  talep_anlati_farki: "Talep–anlatı farkı",
};

function CockpitCommunicationItem({ finding, partyLabel }: { finding: any; partyLabel: string | null }) {
  const gozlem = safeText(finding?.gozlem);
  const kaynak = safeText(finding?.dayanak?.kaynak);
  const alinti = safeText(finding?.dayanak?.alinti);
  if (!gozlem || !alinti) return null;
  const izSlug = String(finding?.iz_tipi ?? "").trim();
  const izLabel = COMMUNICATION_IZ_LABELS[izSlug] ?? izSlug;
  const confLabel = CONSISTENCY_CONFIDENCE_LABELS[String(finding?.guven_seviyesi ?? "").toLowerCase()] ?? "";

  return (
    <div className="py-2.5 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {izLabel && <span className={cockpitTagClass}>{izLabel}</span>}
          {partyLabel && <span className={cockpitTagClass}>{partyLabel}</span>}
        </div>
        {confLabel && (
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${confidenceBadgeTone(confLabel)}`}>
            {confLabel}
          </span>
        )}
      </div>
      <div className="text-sm font-medium leading-snug">{gozlem}</div>
      {/* Dayanak alıntısı "Açıkla" altında — kart üç satırı aşmasın (metin silinmedi). */}
      <CockpitDisclosure label="Dayanağı göster">
        <div className="text-sm">
          <span className="text-muted-foreground">{kaynak || "Dayanak"}: </span>{alinti}
        </div>
      </CockpitDisclosure>
    </div>
  );
}

/* ===================== PHASE 4 - MEDIATOR PANEL (READ-ONLY SUMMARY) ===================== */

function Phase4Summary({ caseRow, onSectionsChange, jump }: {
  caseRow: CaseRow;
  // Sol menüdeki alt katmanı besler: hangi bölümlerin verisi var. Yeni sorgu yok —
  // liste, bu bileşenin zaten okuduğu state'ten türetilir.
  onSectionsChange?: (sections: { id: string; label: string; kind: "layer" | "section"; hint?: string }[]) => void;
  // Sol menüden gelen "şu bölümü aç ve oraya kay" isteği; nonce her tıklamada artar.
  jump?: { id: string; nonce: number } | null;
}) {
  // Tüm bölümler varsayılan KAPALI; yalnız durum şeridi her zaman görünür.
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const [uyap, setUyap] = useState(caseRow.uyap_no || "");
  const [savingUyap, setSavingUyap] = useState(false);
  async function saveUyap() {
    setSavingUyap(true);
    const { error } = await supabase.from("cases").update({ uyap_no: uyap.trim() || null } as any).eq("id", caseRow.id);
    setSavingUyap(false);
    if (error) toast({ title: "Kaydedilemedi", description: trErr(error.message), variant: "destructive" });
    else toast({ title: "UYAP Kayıt No güncellendi" });
  }
  const [report, setReport] = useState<any>(null);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [rootCauses, setRootCauses] = useState<Record<string, any>>({});
  const [worklog, setWorklog] = useState<any[]>([]);
  const [consistency, setConsistency] = useState<any[]>([]);
  const [communication, setCommunication] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [reportAttempt, setReportAttempt] = useState(0);
  const [openScenario, setOpenScenario] = useState<{ letter: string; scenario: any; recommended: boolean } | null>(null);
  // "Rapor oluştur" seçim penceresi. Hook kuralı (a26bdd7): tüm useState'ler erken
  // return'lerden ÖNCE, koşulsuz ve sabit sırada.
  const [reportPickerOpen, setReportPickerOpen] = useState(false);
  const [pickedSections, setPickedSections] = useState<Set<string>>(new Set());

  const fetchReport = useCallback(async () => {
    const { data, error } = await supabase
      .from("common_ground_reports")
      .select("*")
      .eq("case_id", caseRow.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) { console.error("[Phase4Summary fetchReport]", error); return null; }
    setReport(data ?? null);
    return data ?? null;
  }, [caseRow.id]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const [r, a, rc, wl, cf, ca] = await Promise.all([
        supabase.from("common_ground_reports").select("*").eq("case_id", caseRow.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("party_analyses").select("party_id, analysis, risk_analizi, case_parties:party_id(first_name, last_name, company_name, party_role)").eq("case_id", caseRow.id),
        // Kök Neden Katmanı: mediator-only, ayrı tablo. Bu sorgu ana yüklemeyi bloklamaz —
        // hata olursa boş kart yerine sessizce boş durum gösterilir.
        supabase.from("party_root_cause_analysis").select("party_id, kok_neden, created_at").eq("case_id", caseRow.id).order("created_at", { ascending: false }),
        // Rapora Girmeyenler: agent_worklog, aynı "hata olursa sessizce boş" kalıbı —
        // bu sorgu asla ana kokpit render'ını bozmaz.
        supabase.from("agent_worklog").select("id, party_id, content, created_at").eq("case_id", caseRow.id).eq("entry_type", "rapor_disi").order("created_at", { ascending: false }),
        // İç Tutarlılık: party_consistency_findings, aynı "hata olursa sessizce boş" kalıbı —
        // tablo/kayıt yoksa kart hiç görünmez, kokpit render'ı hiçbir koşulda etkilenmez.
        supabase.from("party_consistency_findings" as any).select("id, party_id, findings, created_at").eq("case_id", caseRow.id).order("created_at", { ascending: false }),
        // İletişim ve Asıl İhtiyaç: party_communication_analysis, aynı "hata olursa
        // sessizce boş" kalıbı — kayıt yoksa kart hiç görünmez.
        supabase.from("party_communication_analysis" as any).select("id, party_id, findings, discovery_questions, created_at").eq("case_id", caseRow.id).order("created_at", { ascending: false }),
      ]);
      if (r.error) throw r.error;
      if (a.error) throw a.error;
      setReport(r.data);
      setAnalyses(Array.isArray(a.data) ? a.data : []);
      if (rc.error) {
        console.error("[Phase4Summary rootCause]", rc.error);
        setRootCauses({});
      } else {
        const rcMap: Record<string, any> = {};
        (rc.data ?? []).forEach((row: any) => {
          if (!rcMap[row.party_id]) rcMap[row.party_id] = row.kok_neden;
        });
        setRootCauses(rcMap);
      }
      if (wl.error) {
        console.error("[Phase4Summary worklog]", wl.error);
        setWorklog([]);
      } else {
        setWorklog(Array.isArray(wl.data) ? wl.data : []);
      }
      if (cf.error) {
        console.error("[Phase4Summary consistency]", cf.error);
        setConsistency([]);
      } else {
        setConsistency(Array.isArray(cf.data) ? cf.data : []);
      }
      if (ca.error) {
        console.error("[Phase4Summary communication]", ca.error);
        setCommunication([]);
      } else {
        setCommunication(Array.isArray(ca.data) ? ca.data : []);
      }
    } catch (e: any) {
      console.error("[Phase4Summary] load failed", e);
      setLoadErr(e?.message ?? "Bilinmeyen hata");
      setReport(null);
      setAnalyses([]);
      setRootCauses({});
      setWorklog([]);
      setConsistency([]);
      setCommunication([]);
    } finally {
      setLoading(false);
    }
  }, [caseRow.id]);
  useEffect(() => { load(); }, [load]);

  async function generateReport() {
    setReportBusy(true);
    setReportError(null);
    setReportAttempt(0);
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      setReportAttempt(attempt);
      setReportStatus(
        attempt === 1
          ? "Rapor hazırlanıyor…"
          : `Yeniden deneniyor (${attempt}/${MAX_ATTEMPTS})…`,
      );
      try {
        const { data, error } = await supabase.functions.invoke("common-ground-report", { body: { case_id: caseRow.id } });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        const fresh = await fetchReport();
        if (!fresh) throw new Error("Rapor kaydı oluşturulamadı.");
        toast({ title: "Ortak zemin raporu hazır" });
        setReportStatus(null);
        setReportBusy(false);
        setReportAttempt(0);
        return;
      } catch (e: any) {
        console.error(`[common-ground-report] attempt ${attempt} failed`, e);
        const raw = e?.message || "";
        const friendly = /multiple .* rows|JSON object requested/i.test(raw)
          ? "Sistem hatası oluştu, lütfen tekrar deneyin."
          : raw || "Rapor üretilemedi.";
        if (attempt < MAX_ATTEMPTS) {
          // Exponential backoff: 800ms, 1600ms
          await new Promise((r) => setTimeout(r, 800 * attempt));
          continue;
        }
        setReportError(friendly);
        setReportStatus(null);
        setReportBusy(false);
        setReportAttempt(0);
        toast({ title: "Rapor hatası", description: friendly, variant: "destructive" });
        return;
      }
    }
  }

  const analysedCount = analyses.length;
  const canReport = analysedCount >= 1;

  // NOT (React hata #310 — canlıda beyaz ekran): yükleme/hata erken return'leri
  // BİLEREK aşağıya, TÜM hook çağrılarından sonraya alındı. Buradayken, kendilerinden
  // sonra tanımlanan iki useEffect ilk render'da hiç çalışmıyor, veri gelince
  // çalışıyordu; hook sayısı render'dan render'a değiştiği için React çöküyordu.
  // Bu bloğa hook'tan önce hiçbir return eklenmemeli.
  const heroUzlasmaPct = (() => {
    const fromReport = parsePercent(report?.risk_ozeti?.genel_uzlasma_orani);
    if (fromReport !== null) return fromReport;
    if (analyses.some((a: any) => isMissing(a.risk_analizi?.uzlasma_orani))) return null;
    const vals = analyses
      .map((a: any) => parsePercent(a.risk_analizi?.uzlasma_orani))
      .filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  })();

  const heroRiskRows = analyses.slice(0, 2).map((a: any, i: number) => {
    const cp = a.case_parties || {};
    const name = cp.company_name || `${cp.first_name ?? ""} ${cp.last_name ?? ""}`.trim() || `Taraf ${i + 1}`;
    return { name, risk_puani: a.risk_analizi?.risk_puani as string | undefined };
  });

  // ── Genel Bakış kokpiti için türetilen görünüm verisi — hepsi report.report /
  // analyses üzerinde zaten var olan alanlardan; yeni veri kaynağı yok.
  const cockpitReportData = report?.report;
  const cockpitRiskOzeti = cockpitReportData?.risk_ozeti;
  const cockpitRows = analyses.map((a: any, i: number) => {
    const cp = a.case_parties || {};
    const name = cp.company_name || `${cp.first_name ?? ""} ${cp.last_name ?? ""}`.trim() || `Taraf ${i + 1}`;
    const r = a.risk_analizi || {};
    return {
      party_id: a.party_id as string | undefined,
      name,
      risk_puani: r.risk_puani as string | undefined,
      uzlasma_pct: parsePercent(r.uzlasma_orani),
      uzlasma_label: safeText(r.uzlasma_orani) || "Yeterli veri yok",
      mahkeme_pct: parsePercent(r.mahkeme_riski),
      mahkeme_label: safeText(r.mahkeme_riski) || "Yeterli veri yok",
      batna: safeText(a.analysis?.party_position?.batna),
    };
  });
  // Rapora Girmeyenler kartında party_id → taraf adı eşlemesi için — yeni sorgu yok,
  // mevcut cockpitRows'tan türetilir.
  const worklogPartyNameById: Record<string, string> = {};
  cockpitRows.forEach((r) => { if (r.party_id) worklogPartyNameById[r.party_id] = r.name; });
  // İç Tutarlılık kartı: satırlardaki findings dizileri tek listeye düzleştirilir;
  // taraf adı için yukarıdaki mevcut eşleme kullanılır, yeni sorgu yok.
  const consistencyItems = consistency.flatMap((row: any) =>
    (Array.isArray(row?.findings) ? row.findings : []).map((finding: any) => ({
      rowId: row.id, party_id: row.party_id, finding,
    }))
  );
  // İletişim ve Asıl İhtiyaç kartı: izler ve sıradaki sorular aynı satırlardan düzleştirilir.
  const communicationItems = communication.flatMap((row: any) =>
    (Array.isArray(row?.findings) ? row.findings : []).map((finding: any) => ({
      rowId: row.id, party_id: row.party_id, finding,
    }))
  );
  const communicationQuestions = communication.flatMap((row: any) =>
    (Array.isArray(row?.discovery_questions) ? row.discovery_questions : []).map((q: any) => ({
      rowId: row.id, party_id: row.party_id, q,
    }))
  );
  const cockpitRiskPuani = cockpitRiskOzeti?.genel_risk_puani
    || cockpitRows.find((r) => /yük/i.test(String(r.risk_puani)))?.risk_puani
    || cockpitRows.find((r) => /orta/i.test(String(r.risk_puani)))?.risk_puani
    || cockpitRows[0]?.risk_puani;
  const cockpitScenarios = Array.isArray(cockpitReportData?.scenarios) ? cockpitReportData.scenarios.slice(0, 3) : [];
  const cockpitStrongestScenario = cockpitScenarios.find((s: any) => /dengeli/i.test(String(s?.label))) || cockpitScenarios[0] || null;
  const cockpitCriticalFactors = dedupeSimilarFactors([
    ...safeList(cockpitRiskOzeti?.ortak_kritik_faktorler).map((text) => ({ text, source: "Ortak" })),
    ...analyses.flatMap((a: any, i: number) => {
      const cp = a.case_parties || {};
      const name = cp.company_name || `${cp.first_name ?? ""} ${cp.last_name ?? ""}`.trim() || `Taraf ${i + 1}`;
      return safeList(a.risk_analizi?.kritik_faktorler).map((text) => ({ text, source: name }));
    }),
  ]).slice(0, 12);
  const cockpitRedLines = safeList(cockpitReportData?.red_lines).slice(0, 8);
  const cockpitTarafKarsilastirma = Array.isArray(cockpitRiskOzeti?.taraf_karsilastirma) ? cockpitRiskOzeti.taraf_karsilastirma : [];
  const cockpitObstacleList = safeList(cockpitRiskOzeti?.ortak_uzlasma_engelleri).slice(0, 8);
  const cockpitMediatorOneri = safeText(cockpitRiskOzeti?.arabulucu_onerisi);
  // Deterministic — dedup'd straight from the RAG chunks actually retrieved (cockpitReportData.sources),
  // not the model's own risk_ozeti.kaynak_listesi (see RiskAnalysisCard's kaynakNames for why).
  const cockpitKaynakListesi = Array.from(new Set<string>(
    (Array.isArray(cockpitReportData?.sources) ? cockpitReportData.sources : [])
      .map((s: any) => String(s?.title ?? "").trim())
      .filter(Boolean)
  )).slice(0, 10);

  // ── Katman düzeni için türetilenler: hepsi yukarıdaki mevcut state'ten okunur,
  // yeni sorgu yok. Kartların içeriği değişmez; yalnız hangi katmanda durdukları.
  // Katman kutusu: koyu lacivert zemin yerine beyaz kart + ince çerçeve. Katman içindeki
  // bölümler CockpitSection'ın üst ayracıyla ayrılır; kutu içinde kutu yok.
  const cockpitLayerBoxClass = "rounded-lg border bg-card p-6 space-y-4";
  // Aktif süre sonu: CountdownBadge'in kullandığı kuralın aynısı (uzatma kullanıldıysa uzatılmış tarih).
  const activeDeadline = caseRow.extension_used && caseRow.deadline_extended ? caseRow.deadline_extended : caseRow.deadline_total;
  const deadlineDaysLeft = activeDeadline
    ? Math.ceil((new Date(activeDeadline).getTime() - Date.now()) / 86_400_000)
    : null;
  const statusStripItems: { label: string; value: string; sub?: string | null }[] = [
    {
      label: "Aşama",
      value: caseRow.current_phase != null ? `Faz ${caseRow.current_phase}` : "—",
    },
    {
      label: "Son Tarih",
      value: activeDeadline ? new Date(activeDeadline).toLocaleDateString("tr-TR") : "—",
      sub: deadlineDaysLeft === null
        ? null
        : deadlineDaysLeft >= 0 ? `${deadlineDaysLeft} gün kaldı` : "süre doldu",
    },
    { label: "Risk Puanı", value: safeText(cockpitRiskPuani) || "Yeterli veri yok" },
    { label: "Uzlaşma Tahmini", value: heroUzlasmaPct !== null ? `%${heroUzlasmaPct}` : "Yeterli veri yok" },
  ];

  // ── Katlanır bölüm listesi ──────────────────────────────────────────────
  // Her bölüm: sabit id (sol menüden derin bağlantı için), tek satırlık başlık,
  // veriden türetilen kısa özet ve bugünkü içeriği. Verisi olmayan bölüm listeye
  // hiç girmez — başlığı da görünmez.
  type CockpitSectionDef = {
    id: string; layer: string; title: string; summary?: string; body: React.ReactNode;
    // Başlığa ve sol menü satırına bağlanan tek cümlelik ipucu (title/tooltip).
    hint?: string;
    // PDF alanı yalnız çıktısı olan bölümlerde dolar — düğme de yalnız o zaman çıkar.
    pdf?: { confidential: boolean; html: () => string };
  };
  // Bölüm ipuçları tek yerde: hem sağdaki başlıkta hem sol menüde aynı metin görünür.
  const SECTION_HINTS: Record<string, string> = {
    "kokpit-kok-neden": "Tarafların görünen talebinin altındaki asıl mesele",
    "kokpit-siradaki-sorular": "Bir sonraki oturumda sorulacak sorular",
    "kokpit-ic-tutarlilik": "Tarafın kendi beyanı ile kendi belgesi arasındaki uyumsuzluk",
    "kokpit-rapora-girmeyenler": "Ajanın değerlendirip rapora almadığı hususlar ve nedenleri",
    "kokpit-iletisim": "Tarafın nasıl konuştuğundan çıkan izler",
    "kokpit-uzlasma-zopa": "Anlaşma olasılığı ve olası anlaşma aralığı",
    "kokpit-taraf-karsilastirma": "Dava yoluna gidilirse ne olur",
    "kokpit-resmi-karsilastirma": "Her tarafın elindeki güçlü ve zayıf noktalar",
    "kokpit-senaryolar": "Masaya konabilecek olası çözüm biçimleri",
    "kokpit-kritik-faktorler": "Sonucu belirleyecek ana etkenler",
    "kokpit-kirmizi-cizgiler": "Tarafların taviz vermeyeceğini belirttiği noktalar",
    "kokpit-uzlasma-engelleri": "Müzakereyi tıkayabilecek konular",
    "kokpit-arabulucu-onerisi": "Sistemin önerdiği yaklaşım",
    "kokpit-kaynaklar": "Analizde kullanılan mevzuat ve kitap parçaları",
    "kokpit-taraf-analizleri": "Her taraf için ayrıntılı analiz metni",
    "kokpit-ortak-zemin": "İki tarafın kesişim alanı ve strateji",
    "kokpit-kor-teklif": "Taraflar birbirini görmeden kabul aralığı girer",
  };
  const sectionDefs: CockpitSectionDef[] = [];

  const LAYER_TABLE = "Masaya otururken";
  const LAYER_EVIDENCE = "Dayanak katmanı";
  const LAYER_COCKPIT = "Kokpit";
  const LAYER_REPORTS = "Rapor ve belgeler";

  if (cockpitRows.length > 0) {
    sectionDefs.push({
      id: "kokpit-kok-neden", layer: LAYER_TABLE, title: "Kök neden",
      summary: `${cockpitRows.length} kart`,
      pdf: { confidential: true, html: () => cockpitRows.map((r) => {
        const rc = r.party_id ? rootCauses[r.party_id] : undefined;
        return `<div class="card"><h4>${pdfEsc(r.name)}${rc?.guven_seviyesi ? ` — güven: ${pdfEsc(rc.guven_seviyesi)}` : ""}</h4>`
          + `<p><b>Görünen talep:</b> ${pdfEsc(safeText(rc?.gorunen_talep) || "—")}</p>`
          + `<p><b>Asıl mesele:</b> ${pdfEsc(safeText(rc?.asil_mesele) || "—")}</p>`
          + (safeText(rc?.dayanak) ? `<p class="muted"><b>Dayanak:</b> ${pdfEsc(safeText(rc?.dayanak))}</p>` : "")
          + `</div>`;
      }).join("") },
      body: (
        <div className={`grid gap-6 ${cockpitRows.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {cockpitRows.map((r, i) => (
            <CockpitRootCauseCard key={i} name={r.name} rootCause={r.party_id ? rootCauses[r.party_id] : undefined} />
          ))}
        </div>
      ),
    });
  }

  if (communicationQuestions.length > 0) {
    sectionDefs.push({
      id: "kokpit-siradaki-sorular", layer: LAYER_TABLE, title: "Sıradaki 3 soru",
      pdf: { confidential: true, html: () => `<ol>${communicationQuestions.map((it) => {
        const soru = safeText(it.q?.soru);
        const bosluk = safeText(it.q?.hangi_boslugu_kapatir);
        if (!soru) return "";
        return `<li>${pdfEsc(soru)}${bosluk ? `<div class="muted">Kapattığı boşluk: ${pdfEsc(bosluk)}</div>` : ""}</li>`;
      }).join("")}</ol>` },
      body: (
        <ol className="space-y-2 list-decimal list-inside">
          {communicationQuestions.map((it, i) => {
            const soru = safeText(it.q?.soru);
            const bosluk = safeText(it.q?.hangi_boslugu_kapatir);
            if (!soru) return null;
            return (
              <li key={`${it.rowId}-q${i}`} className="text-sm leading-snug">
                {soru}
                {bosluk && (
                  <div className="mt-0.5 ml-4 text-sm text-muted-foreground leading-snug">Kapattığı boşluk: {bosluk}</div>
                )}
              </li>
            );
          })}
        </ol>
      ),
    });
  }

  if (consistencyItems.length > 0) {
    sectionDefs.push({
      id: "kokpit-ic-tutarlilik", layer: LAYER_EVIDENCE, title: "İç tutarlılık",
      summary: `${consistencyItems.length} bulgu`,
      pdf: { confidential: true, html: () => consistencyItems.map((it) => {
        const f = it.finding ?? {};
        const taraf = it.party_id ? (worklogPartyNameById[it.party_id] ?? "") : "";
        const conf = CONSISTENCY_CONFIDENCE_LABELS[String(f?.guven_seviyesi ?? "").toLowerCase()] ?? "";
        return `<div class="card"><h4>${pdfEsc(safeText(f?.gozlem))}</h4>`
          + `<p class="muted">${taraf ? `${pdfEsc(taraf)} • ` : ""}Güven: ${pdfEsc(conf || "—")}</p>`
          + `<p><b>${pdfEsc(safeText(f?.dayanak_a?.kaynak) || "Dayanak 1")}:</b> <span class="quote">${pdfEsc(safeText(f?.dayanak_a?.alinti))}</span></p>`
          + `<p><b>${pdfEsc(safeText(f?.dayanak_b?.kaynak) || "Dayanak 2")}:</b> <span class="quote">${pdfEsc(safeText(f?.dayanak_b?.alinti))}</span></p>`
          + `</div>`;
      }).join("") },
      body: (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            Tarafın kendi beyanı ile kendi belgeleri arasındaki uyumsuzluklar — yorum arabulucuya aittir
          </p>
          <div className="divide-y">
            {consistencyItems.map((it, i) => (
              <CockpitConsistencyItem
                key={`${it.rowId}-${i}`}
                finding={it.finding}
                partyLabel={it.party_id ? (worklogPartyNameById[it.party_id] ?? null) : null}
              />
            ))}
          </div>
        </>
      ),
    });
  }

  if (worklog.length > 0) {
    sectionDefs.push({
      id: "kokpit-rapora-girmeyenler", layer: LAYER_EVIDENCE, title: "Rapora girmeyenler",
      summary: `${worklog.length} kayıt`,
      pdf: { confidential: true, html: () => worklog.map((w: any) => {
        const c = w?.content ?? {};
        const taraf = w.party_id == null ? "Dosya geneli" : (worklogPartyNameById[w.party_id] ?? "");
        const kategori = String(c?.kategori ?? "");
        return `<div class="card"><h4>${pdfEsc(safeText(c?.husus) || "—")}</h4>`
          + `<p class="muted">${pdfEsc(taraf)}${kategori ? ` • ${pdfEsc(WORKLOG_KATEGORI_LABELS[kategori] ?? kategori)}` : ""}</p>`
          + (safeText(c?.neden_rapora_girmedi) ? `<p>${pdfEsc(safeText(c?.neden_rapora_girmedi))}</p>` : "")
          + (safeText(c?.onerilen_adim) ? `<p><b>Önerilen adım:</b> ${pdfEsc(safeText(c?.onerilen_adim))}</p>` : "")
          + `</div>`;
      }).join("") },
      body: (
        <>
          <p className="text-sm text-muted-foreground mb-2">Ajanın değerlendirip rapora almadığı hususlar ve önerilen adımlar</p>
          <ul className="divide-y">
            {worklog.map((w: any) => (
              <CockpitOffReportItem
                key={w.id}
                item={w.content}
                partyLabel={w.party_id == null ? "Dosya geneli" : (worklogPartyNameById[w.party_id] ?? null)}
              />
            ))}
          </ul>
        </>
      ),
    });
  }

  // İletişim izleri: kayıt hiç yoksa bölüm görünmez (analiz atlanmış/çalışmamış demektir).
  // Kayıt var ama doğrulanmış iz yoksa bölüm "incelendi, bulgu yok" özetiyle durur —
  // incelenmemiş olmakla bulgu çıkmamış olmak aynı şey değil.
  if (communicationItems.length > 0 || communication.length > 0) {
    sectionDefs.push({
      id: "kokpit-iletisim", layer: LAYER_EVIDENCE, title: "İletişim ve asıl ihtiyaç",
      summary: communicationItems.length > 0 ? `${communicationItems.length} iz` : "incelendi — bulgu yok",
      pdf: { confidential: true, html: () => communicationItems.length === 0
        ? `<p class="muted">Analiz çalıştı ancak doğrulanabilir bir iz bulunamadı.</p>`
        : communicationItems.map((it) => {
            const f = it.finding ?? {};
            const taraf = it.party_id ? (worklogPartyNameById[it.party_id] ?? "") : "";
            const izSlug = String(f?.iz_tipi ?? "").trim();
            const conf = CONSISTENCY_CONFIDENCE_LABELS[String(f?.guven_seviyesi ?? "").toLowerCase()] ?? "";
            return `<div class="card"><h4>${pdfEsc(safeText(f?.gozlem))}</h4>`
              + `<p class="muted">${pdfEsc(COMMUNICATION_IZ_LABELS[izSlug] ?? izSlug)}${taraf ? ` • ${pdfEsc(taraf)}` : ""} • Güven: ${pdfEsc(conf || "—")}</p>`
              + `<p><b>${pdfEsc(safeText(f?.dayanak?.kaynak) || "Dayanak")}:</b> <span class="quote">${pdfEsc(safeText(f?.dayanak?.alinti))}</span></p>`
              + `</div>`;
          }).join("") },
      body: (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            Tarafın nasıl konuştuğundan çıkan izler — yorum arabulucuya aittir
          </p>
          {communicationItems.length > 0 ? (
            <div className="divide-y">
              {communicationItems.map((it, i) => (
                <CockpitCommunicationItem
                  key={`${it.rowId}-${i}`}
                  finding={it.finding}
                  partyLabel={it.party_id ? (worklogPartyNameById[it.party_id] ?? null) : null}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Analiz çalıştı ancak doğrulanabilir bir iz bulunamadı.
            </p>
          )}
        </>
      ),
    });
  }

  if (analyses.length > 0) {
    sectionDefs.push({
      id: "kokpit-uzlasma-zopa", layer: LAYER_COCKPIT, title: "Uzlaşma tahmini ve ZOPA",
      summary: heroUzlasmaPct !== null ? `%${heroUzlasmaPct}` : undefined,
      body: (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,340px)_1fr] gap-4 items-stretch">
          <CockpitGauge pct={heroUzlasmaPct} riskLabel={cockpitRiskPuani} sourceHint={cockpitRiskOzeti?.genel_uzlasma_orani_kaynak} />
          <CockpitZopaBand zopa={cockpitReportData?.zopa} lowerName={cockpitRows[1]?.name} upperName={cockpitRows[0]?.name} />
        </div>
      ),
    });
  }

  if (cockpitRows.length > 0) {
    sectionDefs.push({
      // id DEĞİŞMEDİ (scrollIntoView bağlantıları kırılmasın); yalnız görünen ad.
      id: "kokpit-taraf-karsilastirma", layer: LAYER_COCKPIT, title: "Risk ve mahkeme değerlendirmesi",
      summary: `${cockpitRows.length} taraf`,
      body: (
        <div className={`grid gap-6 ${cockpitRows.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {cockpitRows.map((r, i) => (
            <CockpitPartyColumn
              key={i}
              name={r.name}
              riskPuani={r.risk_puani}
              uzlasmaPct={r.uzlasma_pct}
              uzlasmaLabel={r.uzlasma_label}
              mahkemePct={r.mahkeme_pct}
              mahkemeLabel={r.mahkeme_label}
              batna={r.batna}
            />
          ))}
        </div>
      ),
    });
  }

  if (cockpitScenarios.length > 0) {
    sectionDefs.push({
      id: "kokpit-senaryolar", layer: LAYER_COCKPIT, title: "Çözüm senaryoları",
      summary: `${cockpitScenarios.length} senaryo`,
      body: (
        <div className="grid sm:grid-cols-3 gap-3">
          {cockpitScenarios.map((sc: any, i: number) => {
            const letter = String.fromCharCode(65 + i);
            const recommended = sc === cockpitStrongestScenario || /⭐/.test(`${sc?.label ?? ""} ${sc?.summary ?? ""}`);
            return (
              <CockpitScenarioCard
                key={i}
                letter={letter}
                scenario={sc}
                recommended={recommended}
                onClick={() => setOpenScenario({ letter, scenario: sc, recommended })}
              />
            );
          })}
        </div>
      ),
    });
  }

  if (cockpitCriticalFactors.length > 0) {
    sectionDefs.push({
      id: "kokpit-kritik-faktorler", layer: LAYER_COCKPIT, title: "Kritik faktörler",
      summary: `${cockpitCriticalFactors.length}`,
      body: <CockpitBadgeFlow items={cockpitCriticalFactors} />,
    });
  }

  if (cockpitRedLines.length > 0) {
    sectionDefs.push({
      id: "kokpit-kirmizi-cizgiler", layer: LAYER_COCKPIT, title: "Kırmızı çizgiler",
      summary: `${cockpitRedLines.length}`,
      body: <CockpitRedLines items={cockpitRedLines} />,
    });
  }

  if (cockpitTarafKarsilastirma.length > 0) {
    sectionDefs.push({
      // id DEĞİŞMEDİ (scrollIntoView bağlantıları kırılmasın); yalnız görünen ad.
      id: "kokpit-resmi-karsilastirma", layer: LAYER_COCKPIT, title: "Güçlü ve zayıf yanlar",
      summary: `${cockpitTarafKarsilastirma.length} taraf`,
      body: <CockpitOfficialComparisonTable items={cockpitTarafKarsilastirma} />,
    });
  }

  if (cockpitObstacleList.length > 0) {
    sectionDefs.push({
      id: "kokpit-uzlasma-engelleri", layer: LAYER_COCKPIT, title: "Uzlaşma engelleri",
      summary: `${cockpitObstacleList.length}`,
      body: <CockpitObstacles items={cockpitObstacleList} />,
    });
  }

  if (cockpitMediatorOneri) {
    sectionDefs.push({
      id: "kokpit-arabulucu-onerisi", layer: LAYER_COCKPIT, title: "Arabulucu önerisi",
      body: <CockpitMediatorRecommendation text={cockpitMediatorOneri} />,
    });
  }

  if (cockpitKaynakListesi.length > 0) {
    sectionDefs.push({
      id: "kokpit-kaynaklar", layer: LAYER_COCKPIT, title: "Kaynaklar",
      summary: `${cockpitKaynakListesi.length}`,
      // Taraflarla paylaşılabilir: gizlilik ibaresi BASILMAZ.
      pdf: { confidential: false, html: () => `<ol>${cockpitKaynakListesi.map((name) => {
        const src = matchSource(name, cockpitReportData?.sources);
        return `<li>${pdfEsc(name)}${src?.url ? ` — ${pdfEsc(src.url)}` : ""}</li>`;
      }).join("")}</ol>` },
      body: <CockpitSources items={cockpitKaynakListesi} sources={cockpitReportData?.sources} />,
    });
  }

  if (analyses.length > 0) {
    sectionDefs.push({
      id: "kokpit-taraf-analizleri", layer: LAYER_REPORTS, title: "Taraf analizleri",
      summary: `${analyses.length} taraf`,
      pdf: { confidential: true, html: () => analyses.map((a: any, i: number) => {
        const cp = a.case_parties || {};
        const name = cp.company_name || `${cp.first_name ?? ""} ${cp.last_name ?? ""}`.trim() || `Taraf ${i + 1}`;
        return `<div class="card"><h4>${pdfEsc(name)} (${pdfEsc(roleLabel(cp.party_role))})</h4>`
          + (a.analysis?.dispute_area ? `<p><b>Uyuşmazlık türü:</b> ${pdfEsc(a.analysis.dispute_area)}</p>` : "")
          + (a.analysis?.party_position?.batna ? `<p><b>BATNA:</b> ${pdfEsc(a.analysis.party_position.batna)}</p>` : "")
          + `</div>`;
      }).join("") },
      body: (
        <div className="divide-y">
          {analyses.map((a: any, i) => {
            const cp = a.case_parties || {};
            const name = cp.company_name || `${cp.first_name ?? ""} ${cp.last_name ?? ""}`.trim() || "Taraf";
            return (
              <div key={i} className="py-2.5 text-sm">
                <div className="font-medium">{name} <span className="text-muted-foreground">({roleLabel(cp.party_role)})</span></div>
                {a.analysis?.dispute_area && <div><span className="text-muted-foreground">Uyuşmazlık türü: </span>{a.analysis.dispute_area}</div>}
                {a.analysis?.party_position?.batna && <div><span className="text-muted-foreground">BATNA: </span>{a.analysis.party_position.batna}</div>}
              </div>
            );
          })}
        </div>
      ),
    });
  }

  // Ortak zemin raporu her zaman görünür: rapor yoksa da üretim düğmesi burada duruyor.
  sectionDefs.push({
    id: "kokpit-ortak-zemin", layer: LAYER_REPORTS, title: "Ortak zemin raporu",
    summary: report ? undefined : "üretilmedi",
    // Taraflarla paylaşılabilir belge: gizlilik ibaresi BASILMAZ.
    pdf: report?.report ? { confidential: false, html: () => {
      const d: any = report.report ?? {};
      const parts = [
        safeList(d?.common_interests).length ? `<h4>Ortak çıkarlar</h4>${pdfList(safeList(d?.common_interests))}` : "",
        d?.zopa ? `<h4>Uzlaşma alanı (ZOPA)</h4><p><b>Alt:</b> ${pdfEsc(d.zopa.lower_bound || "—")} • <b>Üst:</b> ${pdfEsc(d.zopa.upper_bound || "—")}</p><p>${pdfEsc(d.zopa.description || "")}</p>` : "",
        Array.isArray(d?.scenarios) && d.scenarios.length
          ? `<h4>Çözüm senaryoları</h4>` + d.scenarios.map((sc: any, i: number) =>
              `<div class="card"><h4>${String.fromCharCode(65 + i)}) ${pdfEsc(sc?.label || "Senaryo")}</h4><p>${pdfEsc(sc?.summary || "")}</p>`
              + (sc?.tradeoffs?.length ? pdfList(sc.tradeoffs) : "") + `</div>`).join("")
          : "",
      ].filter(Boolean);
      return parts.length ? parts.join("") : `<p class="muted">Yeterli veri yok</p>`;
    } } : undefined,
    body: (
      <div>
        <div className="flex items-center justify-end mb-2 gap-2 flex-wrap">
          {report && (
            <>
              <Button size="sm" variant="outline" onClick={() => downloadReport({ caseTitle: caseRow.title, caseId: caseRow.id, report: report.report, strategy: report.strategy, analyses, mode: "print" })}>PDF</Button>
              <Button size="sm" variant="outline" onClick={() => downloadReport({ caseTitle: caseRow.title, caseId: caseRow.id, report: report.report, strategy: report.strategy, analyses, mode: "html" })}>İndir</Button>
            </>
          )}
          <Button size="sm" onClick={generateReport} disabled={!canReport || reportBusy}>
            {reportBusy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> {reportStatus ?? "Rapor hazırlanıyor…"}</> : <><Sparkles className="h-4 w-4 mr-1" /> {report ? "Yeniden Üret" : "Rapor Üret"}</>}
          </Button>
        </div>
        {reportBusy && reportAttempt > 1 && (
          <div className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Geçici bir hata oluştu, otomatik olarak tekrar deneniyor ({reportAttempt}/3)…
          </div>
        )}
        {reportError && (
          <div className="text-sm text-destructive flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4" /> {reportError}
            <Button size="sm" variant="outline" onClick={generateReport}><RefreshCw className="h-4 w-4 mr-1" />Tekrar Dene</Button>
          </div>
        )}
        {report ? (
          <CommonGroundZeminSection data={report.report} />
        ) : canReport ? (
          <p className="text-sm text-muted-foreground italic">Henüz rapor üretilmedi. "Rapor Üret" butonuna basın.</p>
        ) : (
          <p className="text-sm text-destructive">
            Rapor üretmeden önce Aşama 3'te en az bir taraf analizini tamamlayın.
          </p>
        )}
      </div>
    ),
  });

  if (report?.report) {
    sectionDefs.push({
      id: "kokpit-strateji", layer: LAYER_REPORTS, title: "Strateji",
      pdf: { confidential: true, html: () => {
        const d: any = report?.report ?? {};
        const parts = [
          safeList(d?.mediator_strategy?.opening).length ? `<h4>Açılış</h4>${pdfList(safeList(d?.mediator_strategy?.opening))}` : "",
          safeList(d?.mediator_strategy?.caucus_focus).length ? `<h4>Özel oturum odağı</h4>${pdfList(safeList(d?.mediator_strategy?.caucus_focus))}` : "",
          safeList(d?.mediator_strategy?.leverage_points).length ? `<h4>Kaldıraç noktaları</h4>${pdfList(safeList(d?.mediator_strategy?.leverage_points))}` : "",
          safeList(d?.red_lines).length ? `<h4>Kırmızı çizgiler</h4>${pdfList(safeList(d?.red_lines))}` : "",
        ].filter(Boolean);
        return parts.length ? parts.join("") : `<p class="muted">Yeterli veri yok</p>`;
      } },
      body: <CommonGroundStrategySection data={report.report} strategy={report.strategy} />,
    });
  }

  sectionDefs.push({
    id: "kokpit-kor-teklif", layer: LAYER_REPORTS, title: "Kör teklif",
    body: <BlindBidMediatorPanel caseId={caseRow.id} />,
  });

  const layerOrder = [LAYER_TABLE, LAYER_EVIDENCE, LAYER_COCKPIT, LAYER_REPORTS];
  // Katman başlığının kendi çıpası (sol menüden katman adına tıklanınca oraya kayılır)
  // ve başlığın altındaki tek satır açıklama; aynı açıklama menüde tooltip olur.
  const LAYER_META: Record<string, { id: string; hint: string }> = {
    [LAYER_TABLE]: { id: "kokpit-katman-masa", hint: "Oturuma girmeden bilmen gerekenler" },
    [LAYER_EVIDENCE]: { id: "kokpit-katman-dayanak", hint: "Bulgular ve hangi belgeye dayandıkları" },
    [LAYER_COCKPIT]: { id: "kokpit-katman-kokpit", hint: "Sayılarla durum: tahmin, senaryolar, engeller" },
    [LAYER_REPORTS]: { id: "kokpit-katman-rapor", hint: "Tam metinler ve dışa aktarma" },
  };
  // Çıktısı olan bölümler — hem tekil PDF düğmesi hem birleşik rapor seçim listesi buradan.
  const pdfSections = sectionDefs.filter((x) => !!x.pdf);

  // Sol menüye bölüm listesini bildir. Liste her renderda yeniden kurulduğu için
  // yalnız id+başlık dizisi değiştiğinde gönderilir (imza karşılaştırması).
  // Sol menüye giden liste iki kademeli: katman başlığı + o katmanın bölümleri,
  // sağdaki sırayla birebir. Görünen bölümü olmayan katman listeye hiç girmez.
  const menuEntries: { id: string; label: string; kind: "layer" | "section"; hint?: string }[] = [];
  layerOrder.forEach((layer) => {
    const items = sectionDefs.filter((x) => x.layer === layer);
    if (items.length === 0) return;
    menuEntries.push({ id: LAYER_META[layer].id, label: layer, kind: "layer", hint: LAYER_META[layer].hint });
    items.forEach((x) => menuEntries.push({ id: x.id, label: x.title, kind: "section", hint: SECTION_HINTS[x.id] }));
  });
  const sectionSignature = menuEntries.map((x) => `${x.kind}:${x.id}|${x.label}`).join(",");
  const sectionsReady = !loading && !loadErr;
  useEffect(() => {
    onSectionsChange?.(sectionsReady ? menuEntries : []);
    return () => onSectionsChange?.([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionSignature, sectionsReady, onSectionsChange]);

  // Sol menüden gelen istek: bölümü aç, sonra oraya yumuşak kaydır.
  useEffect(() => {
    if (!jump?.id) return;
    // Katman çıpasında açılacak bir bölüm yok — yalnız oraya kaydırılır.
    if (!jump.id.startsWith("kokpit-katman-")) {
      setOpenSections((prev) => (prev.has(jump.id) ? prev : new Set(prev).add(jump.id)));
    }
    const t = setTimeout(() => {
      document.getElementById(jump.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => clearTimeout(t);
  }, [jump?.id, jump?.nonce]);

  if (loading) return (
    <Card className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Risk verileri ve taraf analizleri yükleniyor…
    </Card>
  );

  if (loadErr) return (
    <Card className="p-6 space-y-3">
      <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
        <AlertTriangle className="h-4 w-4" /> Risk & analiz verileri yüklenemedi
      </div>
      <p className="text-xs text-muted-foreground break-words">{trErr(loadErr)}</p>
      <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3 w-3 mr-1" /> Tekrar Dene</Button>
    </Card>
  );

  return (
    <div className="space-y-4">
      <PhaseHero
        label="Faz 4 — Arabulucu Paneli"
        metrics={[
          { label: "Uzlaşma Tahmini", value: heroUzlasmaPct, suffix: "%" },
        ]}
        aside={
          heroRiskRows.length > 0 ? (
            <div className="flex gap-3">
              {heroRiskRows.map((r, i) => (
                <div key={i} className="rounded-lg bg-sidebar-accent/40 border border-sidebar-border px-3 py-2 min-w-[110px]">
                  <div className="text-[10px] uppercase tracking-wide text-sidebar-foreground/50 truncate max-w-[100px]">{r.name}</div>
                  <span className={`inline-block mt-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${riskBadgeTone(r.risk_puani)}`}>
                    {r.risk_puani || "Yeterli veri yok"}
                  </span>
                </div>
              ))}
            </div>
          ) : undefined
        }
      />
    <Card className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">Aşama 4 — Arabulucu paneli</h2>
      <p className="text-sm text-muted-foreground">Aşama 3'te üretilen taraf analizlerinin özeti ve Ortak Zemin Raporu üretimi.</p>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">

        {/* Karşılaştırmalı risk_ozeti otomatik-üretim efekti sessizce çalışmaya devam eder;
            görünümü aşağıdaki kokpit panelleri devralır, mükerrer kart göstermez. */}
        {report?.report && (
          <div className="hidden" aria-hidden="true">
            <ComparativeRiskAnalysis
              parties={analyses.map((a: any) => ({ id: a.party_id, ...(a.case_parties || {}) }))}
              analyses={analyses}
              reportData={report.report}
              caseId={caseRow.id}
            />
          </div>
        )}

        {/* ── 1. DURUM ŞERİDİ — ekranda sabit duran tek bölüm; katlanmaz ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statusStripItems.map((m, i) => (
            <div key={i} className="min-w-0">
              <div className="text-sm text-muted-foreground truncate">{m.label}</div>
              <div className="text-sm font-semibold truncate">{m.value}</div>
              {m.sub && <div className="text-sm text-muted-foreground truncate">{m.sub}</div>}
            </div>
          ))}
        </motion.div>

        {analyses.length === 0 && (
          <motion.div variants={itemVariants} className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground italic text-center">
            Kokpit, Aşama 3'te en az bir taraf analizi tamamlandığında dolmaya başlar.
          </motion.div>
        )}

        {/* Kokpit brifingi — bölüm değil, eylem satırı; katlanmaz. */}
        {report && analyses.length > 0 && (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => downloadCockpitBriefing({
              caseTitle: caseRow.title, caseId: caseRow.id, mode: "print",
              uzlasmaPct: heroUzlasmaPct, uzlasmaKaynak: cockpitRiskOzeti?.genel_uzlasma_orani_kaynak, riskPuani: cockpitRiskPuani,
              zopa: cockpitReportData?.zopa, tarafKarsilastirma: cockpitTarafKarsilastirma, scenarios: cockpitScenarios,
              criticalFactors: cockpitCriticalFactors.map((f) => f.sources.length > 1 ? `${f.text} (${f.sources.join(", ")})` : f.text), redLines: cockpitRedLines, obstacles: cockpitObstacleList,
              mediatorOneri: cockpitMediatorOneri, kaynakListesi: cockpitKaynakListesi, sources: cockpitReportData?.sources,
            })}>PDF</Button>
            <Button size="sm" variant="outline" onClick={() => downloadCockpitBriefing({
              caseTitle: caseRow.title, caseId: caseRow.id, mode: "html",
              uzlasmaPct: heroUzlasmaPct, uzlasmaKaynak: cockpitRiskOzeti?.genel_uzlasma_orani_kaynak, riskPuani: cockpitRiskPuani,
              zopa: cockpitReportData?.zopa, tarafKarsilastirma: cockpitTarafKarsilastirma, scenarios: cockpitScenarios,
              criticalFactors: cockpitCriticalFactors.map((f) => f.sources.length > 1 ? `${f.text} (${f.sources.join(", ")})` : f.text), redLines: cockpitRedLines, obstacles: cockpitObstacleList,
              mediatorOneri: cockpitMediatorOneri, kaynakListesi: cockpitKaynakListesi, sources: cockpitReportData?.sources,
            })}>Kaydet (HTML)</Button>
          </div>
        )}

        {/* ── 2-5. KATMANLAR — her katman sade başlık + katlanır satırlar ── */}
        {layerOrder.map((layer) => {
          const items = sectionDefs.filter((s) => s.layer === layer);
          if (items.length === 0) return null;
          return (
            <motion.div key={layer} id={LAYER_META[layer].id} variants={itemVariants} className={`${cockpitLayerBoxClass} scroll-mt-24`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold">{layer}</div>
                  <p className="text-sm text-muted-foreground">{LAYER_META[layer].hint}</p>
                </div>
                {layer === LAYER_REPORTS && pdfSections.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => {
                    setPickedSections(new Set(pdfSections.map((x) => x.id)));
                    setReportPickerOpen(true);
                  }}>
                    Rapor oluştur
                  </Button>
                )}
              </div>
              <div>
                {items.map((s) => (
                  <CockpitCollapsible
                    key={s.id}
                    id={s.id}
                    title={s.title}
                    summary={s.summary}
                    hint={SECTION_HINTS[s.id]}
                    open={openSections.has(s.id)}
                    onToggle={() => toggleSection(s.id)}
                    onPdf={s.pdf ? () => printSectionsPdf({
                      caseTitle: caseRow.title, caseId: caseRow.id,
                      docTitle: s.title, confidential: s.pdf!.confidential,
                      sections: [{ title: s.title, html: s.pdf!.html() }],
                    }) : undefined}
                  >
                    {s.body}
                  </CockpitCollapsible>
                ))}
              </div>
            </motion.div>
          );
        })}

        <motion.div variants={itemVariants} className="border-t pt-4 flex items-center gap-2 flex-wrap">
          <Label className="text-sm text-muted-foreground shrink-0">UYAP kayıt no</Label>
          <Input
            value={uyap} onChange={(e) => setUyap(e.target.value)} placeholder="Örn. 2026/12345"
            className="font-mono h-8 text-sm max-w-[200px]"
          />
          <Button onClick={saveUyap} disabled={savingUyap} size="sm" className="h-8">
            {savingUyap ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Kaydet"}
          </Button>
        </motion.div>
      </motion.div>
    </Card>
    <Dialog open={reportPickerOpen} onOpenChange={setReportPickerOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Rapor oluştur</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Seçilen bölümler tek PDF'te birleştirilir.</p>
          <div className="divide-y">
            {pdfSections.map((x) => (
              <label key={x.id} className="flex items-center gap-2 py-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={pickedSections.has(x.id)}
                  onChange={() => setPickedSections((prev) => {
                    const next = new Set(prev);
                    if (next.has(x.id)) next.delete(x.id); else next.add(x.id);
                    return next;
                  })}
                />
                <span className="flex-1">{x.title}</span>
                {x.pdf!.confidential && <span className="text-xs text-muted-foreground">arabulucuya özel</span>}
              </label>
            ))}
          </div>
          {/* Seçimde tek bir gizli bölüm varsa ibare TÜM belgeye basılır — karışık
              belgede sayfa sayfa ayırmak güvenli değil. */}
          {pdfSections.some((x) => pickedSections.has(x.id) && x.pdf!.confidential) && (
            <p className="text-sm text-destructive">
              Seçimde arabulucuya özel bölüm var — belgenin her sayfasına "{PDF_CONFIDENTIAL_NOTE}" ibaresi basılacak.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setReportPickerOpen(false)}>Vazgeç</Button>
            <Button
              size="sm"
              disabled={pickedSections.size === 0}
              onClick={() => {
                const chosen = pdfSections.filter((x) => pickedSections.has(x.id));
                if (chosen.length === 0) return;
                printSectionsPdf({
                  caseTitle: caseRow.title, caseId: caseRow.id,
                  docTitle: "Arabulucu Raporu",
                  confidential: chosen.some((x) => x.pdf!.confidential),
                  sections: chosen.map((x) => ({ title: x.title, html: x.pdf!.html() })),
                });
                setReportPickerOpen(false);
              }}
            >
              PDF oluştur
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={!!openScenario} onOpenChange={(o) => !o && setOpenScenario(null)}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary">{openScenario?.letter}</span>
            {openScenario?.recommended && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">Önerilen</span>
            )}
          </div>
          <DialogTitle className="text-lg font-semibold">{safeText(openScenario?.scenario?.label) || "Senaryo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="leading-relaxed">{safeText(openScenario?.scenario?.summary) || "—"}</p>
          {safeList(openScenario?.scenario?.tradeoffs).length > 0 && (
            <div className="border-t pt-4">
              <div className="text-sm font-semibold text-primary mb-1.5">Taraf ödünleri ve riskleri</div>
              <ul className="divide-y">
                {safeList(openScenario?.scenario?.tradeoffs).map((t, i) => (
                  <li key={i} className="py-1.5 leading-snug">{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </div>
  );
}

function formatBidAmount(v: number | null, currency: string): string {
  if (v === null || v === undefined) return "—";
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: currency || "TRY", maximumFractionDigits: 0 }).format(v);
  } catch {
    return `${v.toLocaleString("tr-TR")} ${currency}`;
  }
}

function blindBidPartyName(p: any, i: number): string {
  return p.company_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || `Taraf ${i + 1}`;
}

type BlindBidRow = {
  party_id: string;
  min_amount: number | null;
  max_amount: number | null;
  currency: string;
  note: string | null;
};

// Faz 4 "Kör Teklif" sekmesi — Smartsettle ONE tarzı arabulucu-asist kör pazarlık.
// Taraflar birbirinin teklifini hiçbir zaman görmez (RLS: case_parties.user_id = auth.uid());
// bu panel yalnızca arabulucu/admin erişimindeki Faz 4 içinde render edilir.
function BlindBidMediatorPanel({ caseId }: { caseId: string }) {
  const [parties, setParties] = useState<any[]>([]);
  const [bids, setBids] = useState<BlindBidRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const [p, b] = await Promise.all([
        supabase.from("case_parties").select("id, party_role, first_name, last_name, company_name").eq("case_id", caseId).order("created_at"),
        supabase.from("blind_bids").select("party_id, min_amount, max_amount, currency, note").eq("case_id", caseId),
      ]);
      if (p.error) throw p.error;
      if (b.error) throw b.error;
      setParties(Array.isArray(p.data) ? p.data : []);
      setBids(Array.isArray(b.data) ? (b.data as any) : []);
    } catch (e: any) {
      console.error("[BlindBidMediatorPanel] load failed", e);
      setLoadErr(e?.message ?? "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }, [caseId]);
  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <Card className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Kör teklifler yükleniyor…
    </Card>
  );
  if (loadErr) return (
    <Card className="p-6 space-y-3">
      <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
        <AlertTriangle className="h-4 w-4" /> Kör teklif verileri yüklenemedi
      </div>
      <p className="text-xs text-muted-foreground break-words">{trErr(loadErr)}</p>
      <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3 w-3 mr-1" /> Tekrar Dene</Button>
    </Card>
  );

  const bidByParty = new Map(bids.map((b) => [b.party_id, b]));
  const rows = parties.map((p, i) => ({ party: p, name: blindBidPartyName(p, i), bid: bidByParty.get(p.id) ?? null }));
  const withBid = rows.filter((r) => r.bid && (r.bid.min_amount !== null || r.bid.max_amount !== null));

  // Örtüşme (ZOPA) hesabı yalnızca iki taraf da tam bir min-maks aralığı girdiğinde yapılır.
  let overlap: { lower: number; upper: number } | null = null;
  let gap: number | null = null;
  let overlapCurrency = "TRY";
  let incomplete = false;
  if (withBid.length >= 2) {
    const [a, b] = withBid;
    if (a.bid!.min_amount !== null && a.bid!.max_amount !== null && b.bid!.min_amount !== null && b.bid!.max_amount !== null) {
      const lower = Math.max(a.bid!.min_amount, b.bid!.min_amount);
      const upper = Math.min(a.bid!.max_amount, b.bid!.max_amount);
      overlapCurrency = a.bid!.currency || b.bid!.currency || "TRY";
      if (upper >= lower) overlap = { lower, upper };
      else gap = lower - upper;
    } else {
      incomplete = true;
    }
  }

  return (
    <div className="rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground p-6 shadow-elegant space-y-4">
      <div className="flex items-center gap-2">
        <EyeOff className="h-4 w-4 text-accent" />
        <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold">Kör Teklif Durumu</div>
      </div>
      <p className="text-xs text-sidebar-foreground/60 leading-snug">
        Taraflar birbirinin teklifini göremez — yalnızca siz (arabulucu) her iki tarafın teklif
        durumunu ve, ikisi de teklif girdiğinde, örtüşme (tatmin) bölgesini görürsünüz. Taraflara,
        kendi Kör Teklif formlarını Aşama 4 sekmesinden doldurmalarını hatırlatabilirsiniz.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-sidebar-foreground/50 italic">Bu vakada henüz taraf tanımlanmamış.</p>
      ) : (
        <div className={`grid gap-4 ${rows.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {rows.map(({ party, name, bid }) => {
            const entered = !!bid && (bid.min_amount !== null || bid.max_amount !== null);
            return (
              <div key={party.id} className="rounded-xl border border-sidebar-border bg-sidebar-accent/25 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display font-semibold truncate">
                    {name} <span className="text-xs text-sidebar-foreground/50 font-normal">({roleLabel(party.party_role)})</span>
                  </div>
                  <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${entered ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-sidebar-border/60 text-sidebar-foreground/50"}`}>
                    {entered ? "Girdi" : "Girmedi"}
                  </span>
                </div>
                {entered && (
                  <div className="text-sm font-display font-bold">
                    {formatBidAmount(bid!.min_amount, bid!.currency)}
                    <span className="text-sidebar-foreground/50 mx-1 font-normal">–</span>
                    {formatBidAmount(bid!.max_amount, bid!.currency)}
                  </div>
                )}
                {entered && bid!.note && <p className="text-xs text-sidebar-foreground/60 leading-snug">{bid!.note}</p>}
              </div>
            );
          })}
        </div>
      )}

      {overlap && (
        <div className="rounded-xl border border-accent/60 bg-accent/10 p-4 space-y-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold">Tatmin Bölgesi</div>
          <div className="font-display text-lg font-bold text-sidebar-foreground">
            {formatBidAmount(overlap.lower, overlapCurrency)} – {formatBidAmount(overlap.upper, overlapCurrency)}
          </div>
          <p className="text-xs text-sidebar-foreground/60">İki tarafın kör teklif aralıkları örtüşüyor — bu bant üzerinden anlaşma önerilebilir.</p>
        </div>
      )}
      {gap !== null && (
        <div className="rounded-xl border border-dashed border-destructive/50 bg-destructive/5 p-4 space-y-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-destructive font-semibold">Örtüşme Yok</div>
          <div className="font-display text-lg font-bold text-sidebar-foreground">Fark: {formatBidAmount(gap, overlapCurrency)}</div>
          <p className="text-xs text-sidebar-foreground/60">Taraflar arasındaki aralıklar kesişmiyor; ek tur veya yüz yüze kolaylaştırma gerekebilir.</p>
        </div>
      )}
      {incomplete && (
        <p className="text-xs text-amber-600 dark:text-amber-400 italic">Bir tarafın teklifi eksik (yalnızca alt veya yalnızca üst sınır girilmiş) — örtüşme hesaplanamıyor.</p>
      )}
      {withBid.length < 2 && rows.length >= 2 && (
        <p className="text-xs text-sidebar-foreground/50 italic">Örtüşme hesabı için her iki tarafın da kör teklif girmesi gerekir.</p>
      )}
    </div>
  );
}

// Faz 4 "Kör Teklif" — taraf görünümü. Yalnızca kendi teklifini görür/düzenler;
// karşı tarafın teklifinin var olup olmadığını dahi göremez (RLS bunu garanti eder).
function BlindBidPartyForm({ caseId, userId }: { caseId: string; userId: string }) {
  const [partyId, setPartyId] = useState<string | null>(null);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const { data: party, error: partyErr } = await supabase
        .from("case_parties").select("id").eq("case_id", caseId).eq("user_id", userId).maybeSingle();
      if (partyErr) throw partyErr;
      if (!party) { setPartyId(null); return; }
      setPartyId(party.id);
      const { data: bid, error: bidErr } = await supabase
        .from("blind_bids").select("min_amount, max_amount, note").eq("case_id", caseId).eq("party_id", party.id).maybeSingle();
      if (bidErr) throw bidErr;
      setMinAmount(bid?.min_amount != null ? String(bid.min_amount) : "");
      setMaxAmount(bid?.max_amount != null ? String(bid.max_amount) : "");
      setNote(bid?.note ?? "");
    } catch (e: any) {
      console.error("[BlindBidPartyForm] load failed", e);
      setLoadErr(e?.message ?? "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }, [caseId, userId]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!partyId) return;
    const min = minAmount.trim() ? Number(minAmount.replace(",", ".")) : null;
    const max = maxAmount.trim() ? Number(maxAmount.replace(",", ".")) : null;
    if ((min !== null && Number.isNaN(min)) || (max !== null && Number.isNaN(max))) {
      toast({ title: "Geçersiz tutar", description: "Lütfen min ve maks alanlarına sayı girin.", variant: "destructive" });
      return;
    }
    if (min !== null && max !== null && min > max) {
      toast({ title: "Geçersiz aralık", description: "Min tutar, maks tutardan büyük olamaz.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("blind_bids").upsert({
      case_id: caseId, party_id: partyId, min_amount: min, max_amount: max, note: note.trim() || null,
    } as any, { onConflict: "case_id,party_id" });
    setSaving(false);
    if (error) toast({ title: "Kaydedilemedi", description: trErr(error.message), variant: "destructive" });
    else toast({ title: "Kör teklifiniz kaydedildi" });
  }

  if (loading) return (
    <Card className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Teklifiniz yükleniyor…
    </Card>
  );
  if (loadErr) return (
    <Card className="p-6 space-y-3">
      <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
        <AlertTriangle className="h-4 w-4" /> Teklif verileri yüklenemedi
      </div>
      <p className="text-xs text-muted-foreground break-words">{trErr(loadErr)}</p>
      <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3 w-3 mr-1" /> Tekrar Dene</Button>
    </Card>
  );
  if (!partyId) return (
    <Card className="p-6 text-sm text-muted-foreground">Bu vakada size ait bir taraf kaydı bulunamadı.</Card>
  );

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <EyeOff className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Kör Teklif</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-snug">
        Karşı tarafın teklifini göremezsiniz, karşı taraf da sizinkini görmez — yalnızca arabulucu
        ikisini birlikte değerlendirebilir. Anlaşabileceğiniz min-maks tutar aralığını girin;
        dilediğiniz zaman güncelleyebilirsiniz.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Min. Tutar</Label>
          <Input inputMode="decimal" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="Örn. 50000" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Maks. Tutar</Label>
          <Input inputMode="decimal" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="Örn. 80000" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Not (yalnızca arabulucu görür)</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Arabulucuya iletmek istediğiniz ek açıklama…" />
      </div>
      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
        Kaydet
      </Button>
    </Card>
  );
}

/* ===================== PHASE 7 - GÖRÜŞME NOTLARI ===================== */

function Phase8Negotiation({ caseRow, userId, onDone }: { caseRow: CaseRow; userId: string; onDone: () => void }) {
  const [notesMeta, setNotesMeta] = useState<{ count: number; lastAt: string | null }>({ count: 0, lastAt: null });
  useEffect(() => {
    (async () => {
      const [{ count }, { data: last }] = await Promise.all([
        supabase.from("case_notes").select("id", { count: "exact", head: true }).eq("case_id", caseRow.id).eq("phase", 7),
        supabase.from("case_notes").select("created_at").eq("case_id", caseRow.id).eq("phase", 7).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setNotesMeta({ count: count ?? 0, lastAt: (last as any)?.created_at ?? null });
    })();
  }, [caseRow.id]);

  return (
    <div className="space-y-4">
      <PhaseHero
        label="Faz 7 — Görüşme Notları"
        metrics={[
          { label: "Görüşme Notu", value: notesMeta.count },
          { label: "Son Not", value: notesMeta.lastAt ? formatPhaseRelative(notesMeta.lastAt) : null },
        ]}
      />
    <motion.div variants={containerVariants} initial="hidden" animate="show">
    <Card className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-primary">Aşama 7 — Görüşme Notları</h2>
      <motion.div variants={itemVariants}>
        <MeetingNotesPanel caseId={caseRow.id} caseSummary={caseRow.title ?? ""} />
      </motion.div>
      <div className="flex justify-end">
        <Button onClick={onDone}>Kapanışa Geç →</Button>
      </div>
    </Card>
    </motion.div>
    </div>
  );
}

/* ===================== PHASE 9 - CLOSING ===================== */

type PaymentScenario = {
  key: "anlasma" | "bakanlik" | "ihtiyari_anlasamama" | "pending" | "undetermined";
  label: string;
  badgeClass: string;
};

function computePaymentScenario(caseRow: CaseRow): PaymentScenario {
  const outcome = caseRow.status;
  if (outcome === "agreed") {
    return { key: "anlasma", label: "Taraflar öder", badgeClass: "bg-emerald-600 text-white border-transparent" };
  }
  if (outcome === "failed") {
    if (caseRow.mediation_type === "dava_sarti") {
      return {
        key: "bakanlik",
        label: "Bakanlık ödemesi (2 saatlik tarife) — taraflardan tahsilat yok",
        badgeClass: "bg-blue-600 text-white border-transparent",
      };
    }
    if (caseRow.mediation_type === "ihtiyari") {
      return {
        key: "ihtiyari_anlasamama",
        label: "Taraflar öder (2 saatlik ücret)",
        badgeClass: "bg-amber-600 text-white border-transparent",
      };
    }
    return {
      key: "undetermined",
      label: "Anlaşamama — arabuluculuk türü belirlenmemiş, senaryo netleştirilemedi",
      badgeClass: "bg-destructive text-destructive-foreground border-transparent",
    };
  }
  return {
    key: "pending",
    label: "Dosya kapanınca senaryo belirlenecek",
    badgeClass: "bg-muted text-muted-foreground border-transparent",
  };
}

type PartyOption = { id: string; name: string };
type CasePaymentRow = {
  id: string; case_id: string; payment_date: string; payer_party_id: string | null;
  payer_label: string; kind: "ucret" | "masraf"; description: string | null;
  amount: number; status: "bekliyor" | "odendi"; receipt_no: string | null;
  paid_at: string | null; created_at: string;
};
type StagedRow = { payer_party_id: string | null; payer_label: string; kind: "ucret"; description: string; amount: number };

function PaymentAccountingPanel({ caseRow }: { caseRow: CaseRow }) {
  const [disputeValue, setDisputeValue] = useState<string>("");
  const [sessionCount, setSessionCount] = useState<string>("1");
  const [hoursPerSession, setHoursPerSession] = useState<string>("2");
  const [feeType, setFeeType] = useState<"anlasma" | "anlasamama" | "ihtiyari">("anlasma");
  const [arabulucuSayisi, setArabulucuSayisi] = useState<1 | 2>(1);
  const [partyCount, setPartyCount] = useState<2 | 3 | 6 | 11>(2);
  const [isSeri, setIsSeri] = useState(false);
  const [seriDosyaSayisi, setSeriDosyaSayisi] = useState<string>("10");
  const [seriTur, setSeriTur] = useState<"ticari" | "diger">("diger");
  const [feeBusy, setFeeBusy] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeResult, setFeeResult] = useState<null | {
    brut_ucret: number; kdv: number; gv_stopaj: number;
    net_ucret: number; kdv_tevkifati: number; tahsil_edilen_kdv: number; net_tahsilat: number;
    genel_toplam: number; tarife_yili: number; tarife_maddesi: string; aciklama: string;
    breakdown?: Array<{ dilim: string; oran: string; tutar: number }>;
    hesaplama_turu?: string;
    // legacy fields still populated by edge fn for db persistence
    baz_ucret: number; ek_oturum_ucreti: number; toplam_ucret: number;
  }>(null);
  const [existingFeeId, setExistingFeeId] = useState<string | null>(null);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  // profiles.vergi_dairesi / profiles.vkn_tckn: generated types'ta henüz yok
  // (canlıda migration'sız elle eklendi) — bu yüzden ilgili select/update'lerde
  // "as any" cast kullanılıyor.
  const { user: currentUser, isAdmin: isRoleAdmin } = useAuth();
  // Yalnızca UX kısıtı — gerçek güvenlik sınırı case_payments RLS'inde
  // (is_case_mediator OR admin); dosya sahibi burada RLS'te ayrı bir kural
  // olmadığı için mediator/admin değilse update/delete zaten reddedilir.
  const canManagePayments = !!currentUser && (
    currentUser.id === caseRow.assigned_mediator_id ||
    currentUser.id === caseRow.user_id ||
    isRoleAdmin
  );
  const [mediatorTaxOffice, setMediatorTaxOffice] = useState<string>("");
  const [mediatorTaxId, setMediatorTaxId] = useState<string>("");
  const [profileTaxSaveBusy, setProfileTaxSaveBusy] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    (async () => {
      const { data } = await supabase
        .from("profiles" as any)
        .select("vergi_dairesi, vkn_tckn")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      if (data) {
        setMediatorTaxOffice(((data as any).vergi_dairesi as string) || "");
        setMediatorTaxId(((data as any).vkn_tckn as string) || "");
      }
    })();
  }, [currentUser?.id]);

  async function saveMediatorTaxInfoToProfile() {
    if (!currentUser?.id) return;
    setProfileTaxSaveBusy(true);
    try {
      const { error } = await supabase
        .from("profiles" as any)
        .update({
          vergi_dairesi: mediatorTaxOffice.trim() || null,
          vkn_tckn: mediatorTaxId.trim() || null,
        } as any)
        .eq("user_id", currentUser.id);
      if (error) throw error;
      toast({ title: "Profile kaydedildi" });
    } catch (e: any) {
      toast({ title: "Kaydedilemedi", description: trErr(e.message), variant: "destructive" });
    } finally {
      setProfileTaxSaveBusy(false);
    }
  }

  // --- Faz 4b: Ödeme senaryosu, ücret sözleşmesi, ödeme defteri ---
  const scenario = useMemo(() => computePaymentScenario(caseRow), [caseRow.status, caseRow.mediation_type]);

  const [ucretSozlesmesi, setUcretSozlesmesi] = useState(false);
  const [kararlastirilanUcret, setKararlastirilanUcret] = useState<string>("");
  const [contractBusy, setContractBusy] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);

  const [parties, setParties] = useState<PartyOption[]>([]);
  const [payments, setPayments] = useState<CasePaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const [rowDate, setRowDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [rowPayerId, setRowPayerId] = useState<string>("bakanlik");
  const [rowKind, setRowKind] = useState<"ucret" | "masraf">("ucret");
  const [rowDesc, setRowDesc] = useState<string>("");
  const [rowAmount, setRowAmount] = useState<string>("");
  const [rowBusy, setRowBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const [markingId, setMarkingId] = useState<string | null>(null);
  const [receiptDraft, setReceiptDraft] = useState<string>("");
  const [markBusy, setMarkBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    payment_date: string; payer_party_id: string; kind: "ucret" | "masraf";
    description: string; amount: string; status: "bekliyor" | "odendi"; receipt_no: string;
  } | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  // status="odendi" bir satırda tutar/tür değişikliği istenirse önce bu dolar,
  // AlertDialog onayından sonra performSaveEdit gerçek kaydı yapar.
  const [sensitiveEditConfirm, setSensitiveEditConfirm] = useState<CasePaymentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CasePaymentRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [stagedRows, setStagedRows] = useState<StagedRow[]>([]);
  const [stageBusy, setStageBusy] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);

  const parseAmount = (s: string) => Number(s.replace(/[^\d.,-]/g, "").replace(",", ".")) || 0;
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    const { data, error } = await supabase
      .from("case_payments" as any)
      .select("*")
      .eq("case_id", caseRow.id)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error) setPayments(((data ?? []) as any[]) as CasePaymentRow[]);
    setPaymentsLoading(false);
  }, [caseRow.id]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("case_parties")
        .select("id, first_name, last_name, company_name, party_type")
        .eq("case_id", caseRow.id);
      setParties((data ?? []).map((p: any) => ({
        id: p.id,
        name: p.party_type === "corporate" ? (p.company_name || "-") : `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "-",
      })));
    })();
  }, [caseRow.id]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cases" as any)
        .select("ucret_sozlesmesi, kararlastirilan_ucret")
        .eq("id", caseRow.id)
        .maybeSingle();
      if (data) {
        setUcretSozlesmesi(!!(data as any).ucret_sozlesmesi);
        setKararlastirilanUcret((data as any).kararlastirilan_ucret != null ? String((data as any).kararlastirilan_ucret) : "");
      }
    })();
  }, [caseRow.id]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("case_fees" as any)
        .select("id, ai_breakdown")
        .eq("case_id", caseRow.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const r = (data as any)?.ai_breakdown;
      if (r) {
        setFeeResult(r);
        setExistingFeeId((data as any).id ?? null);
      }
    })();
  }, [caseRow.id]);

  const taban = feeResult?.net_tahsilat ?? null;
  const existingUcretSum = useMemo(
    () => round2(payments.filter((p) => p.kind === "ucret").reduce((s, p) => s + Number(p.amount || 0), 0)),
    [payments]
  );
  const kararlastirilanUcretNum = ucretSozlesmesi ? parseAmount(kararlastirilanUcret) : 0;
  const effectiveBasis = ucretSozlesmesi && kararlastirilanUcretNum > 0 ? kararlastirilanUcretNum : taban;

  async function saveUcretSozlesmesi() {
    setContractError(null);
    const val = ucretSozlesmesi ? parseAmount(kararlastirilanUcret) : 0;
    if (ucretSozlesmesi && val > 0 && taban != null && val < taban) {
      setContractError(`AAÜT tabanının altına inilemez (taban: ${fmtTL(taban)})`);
      return;
    }
    setContractBusy(true);
    try {
      const { error } = await supabase.from("cases" as any).update({
        ucret_sozlesmesi: ucretSozlesmesi,
        kararlastirilan_ucret: ucretSozlesmesi && val > 0 ? val : null,
      } as any).eq("id", caseRow.id);
      if (error) throw error;
      toast({ title: "Ücret sözleşmesi kaydedildi" });
    } catch (e: any) {
      toast({ title: "Kaydedilemedi", description: trErr(e.message), variant: "destructive" });
    } finally {
      setContractBusy(false);
    }
  }

  async function addPaymentRow() {
    setRowError(null);
    const amt = round2(parseAmount(rowAmount));
    if (!amt || amt <= 0) {
      setRowError("Geçerli bir tutar girin.");
      return;
    }
    if (rowKind === "ucret" && taban != null && round2(existingUcretSum + amt) < taban) {
      setRowError(`AAÜT tabanının altına inilemez (taban: ${fmtTL(taban)})`);
      return;
    }
    const payerLabel = rowPayerId === "bakanlik" ? "Bakanlık" : (parties.find((p) => p.id === rowPayerId)?.name ?? "-");
    setRowBusy(true);
    try {
      const { error } = await supabase.from("case_payments" as any).insert({
        case_id: caseRow.id,
        payment_date: rowDate,
        payer_party_id: rowPayerId === "bakanlik" ? null : rowPayerId,
        payer_label: payerLabel,
        kind: rowKind,
        description: rowDesc.trim() || null,
        amount: amt,
        status: "bekliyor",
      } as any);
      if (error) throw error;
      setRowDesc(""); setRowAmount("");
      await loadPayments();
      toast({ title: "Kayıt eklendi" });
    } catch (e: any) {
      setRowError(trErr(e.message));
    } finally {
      setRowBusy(false);
    }
  }

  async function confirmMarkPaid(id: string) {
    setMarkBusy(true);
    try {
      const { error } = await supabase.from("case_payments" as any).update({
        status: "odendi",
        paid_at: new Date().toISOString(),
        receipt_no: receiptDraft.trim() || null,
      } as any).eq("id", id);
      if (error) throw error;
      setMarkingId(null); setReceiptDraft("");
      await loadPayments();
      toast({ title: "Ödendi olarak işaretlendi" });
    } catch (e: any) {
      toast({ title: "Hata", description: trErr(e.message), variant: "destructive" });
    } finally {
      setMarkBusy(false);
    }
  }

  // addPaymentRow'daki AAÜT taban guard'ının aynısı — düzenlenen satır kendi eski
  // tutarıyla toplama dahil edilmez, guard yeni tutar/tür varsayımıyla hesaplanır.
  function ucretGuardError(excludeId: string, newKind: "ucret" | "masraf", newAmount: number): string | null {
    const otherUcretSum = round2(
      payments.filter((p) => p.id !== excludeId && p.kind === "ucret").reduce((s, p) => s + Number(p.amount || 0), 0)
    );
    const newTotal = round2(otherUcretSum + (newKind === "ucret" ? newAmount : 0));
    if (taban != null && newTotal < taban) {
      return `AAÜT tabanının altına inilemez (taban: ${fmtTL(taban)})`;
    }
    return null;
  }

  function startEditRow(p: CasePaymentRow) {
    setEditingId(p.id);
    setEditForm({
      payment_date: p.payment_date,
      payer_party_id: p.payer_party_id ?? "bakanlik",
      kind: p.kind,
      description: p.description ?? "",
      amount: String(p.amount),
      status: p.status,
      receipt_no: p.receipt_no ?? "",
    });
    setEditError(null);
  }

  function cancelEditRow() {
    setEditingId(null);
    setEditForm(null);
    setEditError(null);
  }

  async function performSaveEdit(original: CasePaymentRow) {
    if (!editForm) return;
    const amt = round2(parseAmount(editForm.amount));
    const payerLabel = editForm.payer_party_id === "bakanlik"
      ? "Bakanlık"
      : (parties.find((pp) => pp.id === editForm.payer_party_id)?.name ?? original.payer_label);
    setEditBusy(true);
    try {
      const { error } = await supabase.from("case_payments" as any).update({
        payment_date: editForm.payment_date,
        payer_party_id: editForm.payer_party_id === "bakanlik" ? null : editForm.payer_party_id,
        payer_label: payerLabel,
        kind: editForm.kind,
        description: editForm.description.trim() || null,
        amount: amt,
        status: editForm.status,
        receipt_no: editForm.receipt_no.trim() || null,
        paid_at: editForm.status === "odendi" ? (original.paid_at ?? new Date().toISOString()) : null,
      } as any).eq("id", original.id);
      if (error) throw error;
      setEditingId(null);
      setEditForm(null);
      setSensitiveEditConfirm(null);
      await loadPayments();
      toast({ title: "Kayıt güncellendi" });
    } catch (e: any) {
      setEditError(trErr(e.message));
    } finally {
      setEditBusy(false);
    }
  }

  function requestSaveEdit(original: CasePaymentRow) {
    if (!editForm) return;
    setEditError(null);
    const amt = round2(parseAmount(editForm.amount));
    if (!amt || amt <= 0) {
      setEditError("Geçerli bir tutar girin.");
      return;
    }
    const guardErr = ucretGuardError(original.id, editForm.kind, amt);
    if (guardErr) {
      setEditError(guardErr);
      return;
    }
    const sensitiveChange = original.status === "odendi"
      && (round2(Number(original.amount)) !== amt || original.kind !== editForm.kind);
    if (sensitiveChange) {
      setSensitiveEditConfirm(original);
      return;
    }
    performSaveEdit(original);
  }

  async function deletePaymentRow() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const { error } = await supabase.from("case_payments" as any).delete().eq("id", deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      await loadPayments();
      toast({ title: "Kayıt silindi" });
    } catch (e: any) {
      toast({ title: "Silinemedi", description: trErr(e.message), variant: "destructive" });
    } finally {
      setDeleteBusy(false);
    }
  }

  function transferScenarioToLedger() {
    setStageError(null);
    if (!effectiveBasis || effectiveBasis <= 0) {
      setStageError("Önce ücret hesaplayın veya kararlaştırılan ücreti girin.");
      return;
    }
    if (scenario.key === "bakanlik") {
      setStagedRows([{
        payer_party_id: null, payer_label: "Bakanlık", kind: "ucret",
        description: "Anlaşamama - Bakanlık ödemesi (2 saatlik tarife)",
        amount: effectiveBasis,
      }]);
      return;
    }
    if (scenario.key === "anlasma" || scenario.key === "ihtiyari_anlasamama") {
      if (parties.length === 0) {
        setStageError("Dosyada kayıtlı taraf bulunamadı.");
        return;
      }
      const share = round2(Math.floor((effectiveBasis / parties.length) * 100) / 100);
      const rows: StagedRow[] = parties.map((p) => ({
        payer_party_id: p.id,
        payer_label: p.name,
        kind: "ucret",
        description: scenario.key === "anlasma" ? "Anlaşma ücreti - dosya payı" : "Anlaşamama (ihtiyari) - ücret payı",
        amount: share,
      }));
      const remainder = round2(effectiveBasis - round2(share * parties.length));
      if (remainder !== 0 && rows.length > 0) {
        rows[rows.length - 1] = { ...rows[rows.length - 1], amount: round2(rows[rows.length - 1].amount + remainder) };
      }
      setStagedRows(rows);
      return;
    }
    setStageError("Dosya henüz kapanmadı veya arabuluculuk türü belirlenmemiş; senaryo netleşmeden aktarım yapılamaz.");
  }

  function updateStagedRow(index: number, patch: Partial<StagedRow>) {
    setStagedRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  // "Tümünü buna yükle" kısayolu — tek satıra effectiveBasis'i tam verip diğerlerini
  // sıfırlar; sadece anlasma/ihtiyari_anlasamama senaryolarında anlamlı (bakanlik zaten tek satır).
  function assignFullAmountToRow(index: number) {
    setStagedRows((rows) => rows.map((r, i) => ({ ...r, amount: i === index ? effectiveBasis : 0 })));
  }

  async function saveStagedRows() {
    setStageError(null);
    const ucretTotal = round2(stagedRows.filter((r) => r.kind === "ucret").reduce((s, r) => s + Number(r.amount || 0), 0));
    if (taban != null && round2(existingUcretSum + ucretTotal) < taban) {
      setStageError(`AAÜT tabanının altına inilemez (taban: ${fmtTL(taban)})`);
      return;
    }
    setStageBusy(true);
    try {
      const rows = stagedRows.map((r) => ({
        case_id: caseRow.id,
        payment_date: new Date().toISOString().slice(0, 10),
        payer_party_id: r.payer_party_id,
        payer_label: r.payer_label,
        kind: r.kind,
        description: r.description || null,
        amount: round2(r.amount),
        status: "bekliyor",
      }));
      const { error } = await supabase.from("case_payments" as any).insert(rows as any);
      if (error) throw error;
      setStagedRows([]);
      await loadPayments();
      toast({ title: "Senaryo deftere aktarıldı" });
    } catch (e: any) {
      setStageError(trErr(e.message));
    } finally {
      setStageBusy(false);
    }
  }

  const fmtTL = (n: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

  async function calculateFee() {
    setFeeError(null); setFeeResult(null); setExistingFeeId(null);
    const dv = Number(disputeValue.replace(/[^\d.,-]/g, "").replace(",", ".")) || 0;
    const sc = Math.max(1, Number(sessionCount) || 1);
    const hps = Math.max(1, Number(hoursPerSession) || 1);
    if (!isSeri && feeType === "anlasma" && (!dv || dv <= 0)) {
      toast({ title: "Uyuşmazlık değeri gerekli", variant: "destructive" });
      return;
    }
    setFeeBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-mediation-fee", {
        body: {
          dispute_value: dv,
          session_count: sc,
          hours_per_session: hps,
          fee_type: feeType,
          dispute_type: isSeri ? seriTur : (caseRow.dispute_type || ""),
          arabulucu_sayisi: arabulucuSayisi,
          party_count: partyCount,
          is_seri: isSeri,
          seri_dosya_sayisi: isSeri ? Math.max(1, Number(seriDosyaSayisi) || 0) : 0,
        },
      });
      if (error) {
        let msg = error.message || "Sunucu hatası";
        try {
          const ctx = (error as any).context;
          if (ctx?.body) {
            const b = typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body;
            if (b?.message) msg = b.message;
          }
        } catch {}
        setFeeError(msg);
        return;
      }
      if ((data as any)?.error) {
        setFeeError((data as any).message || (data as any).error);
        return;
      }
      const r = data as any;
      setFeeResult(r);
      const { data: inserted, error: insErr } = await supabase.from("case_fees" as any).insert({
        case_id: caseRow.id,
        fee_type: feeType,
        dispute_value: dv,
        session_count: sc,
        calculated_fee: r.brut_ucret ?? r.toplam_ucret,
        vat_amount: r.kdv,
        total_fee: r.net_tahsilat ?? r.genel_toplam,
        tarife_yili: r.tarife_yili ?? 2026,
        tarife_maddesi: r.tarife_maddesi,
        ai_breakdown: r,
      } as any).select("id").maybeSingle();
      if (insErr) throw insErr;
      setExistingFeeId((inserted as any)?.id ?? null);
      toast({ title: "Ücret hesaplandı" });
    } catch (e: any) {
      setFeeError(trErr(e.message || "Hesaplama başarısız"));
    } finally {
      setFeeBusy(false);
    }
  }

  async function createInvoice() {
    if (!feeResult) return;
    setInvoiceBusy(true);
    try {
      const [{ data: parties }, { data: profile }] = await Promise.all([
        supabase.from("case_parties")
          .select("first_name, last_name, company_name, party_type, party_role, tc_kimlik, tax_number, tax_office, authorized_person, address")
          .eq("case_id", caseRow.id),
        caseRow.assigned_mediator_id
          ? supabase.from("profiles").select("full_name").eq("user_id", caseRow.assigned_mediator_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      const partyList = (parties ?? []).map((p: any) => {
        const isCorp = p.party_type === "corporate";
        return {
          name: isCorp ? (p.company_name || "-") : `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "-",
          typeLabel: isCorp ? "Kurumsal" : "Bireysel",
          roleLabel: p.party_role ? roleLabel(p.party_role) : null,
          tcKimlik: isCorp ? null : (p.tc_kimlik || null),
          taxNumber: isCorp ? (p.tax_number || null) : null,
          taxOffice: isCorp ? (p.tax_office || null) : null,
          authorizedPerson: isCorp ? (p.authorized_person || null) : null,
          address: p.address || null,
        };
      });

      const paymentList = payments.map((p) => ({
        payerLabel: p.payer_label,
        amount: Number(p.amount),
        status: p.status,
        receiptNo: p.receipt_no,
      }));

      const { downloadInvoicePdf } = await import("@/lib/invoice-pdf");
      await downloadInvoicePdf({
        applicationNo: caseRow.application_no || "",
        disputeSubject: caseRow.title || caseRow.dispute_type || "-",
        mediatorName: (profile as any)?.full_name || "-",
        mediatorRegistryNo: null,
        mediatorTaxOffice: mediatorTaxOffice.trim() || null,
        mediatorTaxId: mediatorTaxId.trim() || null,
        parties: partyList,
        feeType,
        disputeValue: Number(disputeValue.replace(/[^\d.,-]/g, "").replace(",", ".")) || 0,
        sessionCount: Math.max(1, Number(sessionCount) || 1),
        brutUcret: feeResult.brut_ucret,
        kdv: feeResult.kdv,
        gvStopaj: feeResult.gv_stopaj,
        netUcret: feeResult.net_ucret,
        kdvTevkifati: feeResult.kdv_tevkifati,
        tahsilEdilenKdv: feeResult.tahsil_edilen_kdv,
        netTahsilat: feeResult.net_tahsilat,
        tarifeYili: feeResult.tarife_yili,
        tarifeMaddesi: feeResult.tarife_maddesi,
        dilimBreakdown: feeResult.breakdown,
        payments: paymentList,
        createdAt: new Date(),
      });

      if (existingFeeId) {
        await supabase.from("case_fees" as any).update({ invoice_generated: true } as any).eq("id", existingFeeId);
      }
      toast({ title: "Makbuz taslağı indirildi" });
    } catch (e: any) {
      toast({ title: "Makbuz taslağı oluşturulamadı", description: trErr(e.message), variant: "destructive" });
    } finally {
      setInvoiceBusy(false);
    }
  }

  const PartyBtn = ({ v, label }: { v: 2 | 3 | 6 | 11; label: string }) => (
    <Button type="button" size="sm" variant={partyCount === v ? "default" : "outline"} onClick={() => setPartyCount(v)}>{label}</Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={`whitespace-normal text-left h-auto py-1 px-2 ${scenario.badgeClass}`}>{scenario.label}</Badge>
      </div>

      <p className="text-sm text-muted-foreground">Aktif AAÜT tarifesine göre deterministik hesaplama.</p>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label>Sonuç Türü</Label>
          <Select value={feeType} onValueChange={(v) => setFeeType(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="anlasma">Anlaşma</SelectItem>
              <SelectItem value="anlasamama">Anlaşamama</SelectItem>
              <SelectItem value="ihtiyari">İhtiyari</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Arabulucu Sayısı</Label>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={arabulucuSayisi === 1 ? "default" : "outline"} onClick={() => setArabulucuSayisi(1)}>1 Arabulucu</Button>
            <Button type="button" size="sm" variant={arabulucuSayisi === 2 ? "default" : "outline"} onClick={() => setArabulucuSayisi(2)}>Birden Fazla</Button>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Taraf Sayısı</Label>
          <div className="flex gap-2 flex-wrap">
            <PartyBtn v={2} label="2" /><PartyBtn v={3} label="3–5" /><PartyBtn v={6} label="6–10" /><PartyBtn v={11} label="11+" />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label>Uyuşmazlık Değeri (TL)</Label>
          <Input type="text" inputMode="decimal" placeholder="Anlaşma için gerekli"
            value={disputeValue} onChange={(e) => setDisputeValue(e.target.value)} disabled={feeBusy || isSeri} />
        </div>
        <div className="space-y-1">
          <Label>Oturum Sayısı</Label>
          <Input type="number" min={1} step={1} value={sessionCount}
            onChange={(e) => setSessionCount(e.target.value)} disabled={feeBusy} />
        </div>
        <div className="space-y-1">
          <Label>Oturum Başına Saat</Label>
          <Input type="number" min={1} step={1} value={hoursPerSession}
            onChange={(e) => setHoursPerSession(e.target.value)} disabled={feeBusy} />
        </div>
      </div>

      <div className="border rounded p-3 bg-muted/20 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isSeri} onChange={(e) => setIsSeri(e.target.checked)} />
          <span className="font-medium text-sm">Seri Uyuşmazlık</span>
        </label>
        <p className="text-xs text-muted-foreground">Aynı taraflardan biri ortak olmalı ve aynı ay içinde en az 10 başvuru gereklidir.</p>
        {isSeri && (
          <div className="grid gap-3 md:grid-cols-2 pt-2">
            <div className="space-y-1">
              <Label>Dosya Sayısı</Label>
              <Input type="number" min={10} step={1} value={seriDosyaSayisi} onChange={(e) => setSeriDosyaSayisi(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Tür</Label>
              <Select value={seriTur} onValueChange={(v) => setSeriTur(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ticari">Ticari</SelectItem>
                  <SelectItem value="diger">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
        <div className="space-y-1">
          <Label>Vergi Dairesi (opsiyonel — makbuza basılır)</Label>
          <Input value={mediatorTaxOffice} onChange={(e) => setMediatorTaxOffice(e.target.value)} disabled={invoiceBusy} />
        </div>
        <div className="space-y-1">
          <Label>VKN/TCKN (opsiyonel — makbuza basılır)</Label>
          <Input value={mediatorTaxId} onChange={(e) => setMediatorTaxId(e.target.value)} disabled={invoiceBusy} />
        </div>
        <Button type="button" size="sm" variant="outline" onClick={saveMediatorTaxInfoToProfile} disabled={profileTaxSaveBusy || !currentUser?.id}>
          {profileTaxSaveBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Profilime Kaydet
        </Button>
      </div>

      <div className="flex gap-2">
        <Button onClick={calculateFee} disabled={feeBusy}>
          {feeBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Ücret Hesapla
        </Button>
        <Button variant="outline" onClick={createInvoice} disabled={!feeResult || invoiceBusy}>
          {invoiceBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
          Makbuz Taslağı Oluştur
        </Button>
      </div>

      {feeError && (
        <div className="p-3 rounded border border-amber-300 bg-amber-50 text-amber-900 text-sm flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Hesaplama yapılamadı</div>
              <div>{feeError}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setFeeError(null)}>Geri Dön</Button>
            <Button size="sm" onClick={calculateFee}>Tekrar Dene</Button>
          </div>
        </div>
      )}

      {feeResult && (
        <div className="rounded border overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b"><td className="px-3 py-2 text-muted-foreground">Brüt Ücret</td><td className="px-3 py-2 text-right font-medium">{fmtTL(feeResult.brut_ucret)}</td></tr>
              <tr className="border-b"><td className="px-3 py-2 text-muted-foreground">KDV (%20)</td><td className="px-3 py-2 text-right">{fmtTL(feeResult.kdv)}</td></tr>
              <tr className="border-b"><td className="px-3 py-2 text-muted-foreground">GV Stopaj (%20)</td><td className="px-3 py-2 text-right">-{fmtTL(feeResult.gv_stopaj)}</td></tr>
              <tr className="border-b bg-muted/30"><td className="px-3 py-2 font-semibold">Net Ücret</td><td className="px-3 py-2 text-right font-semibold">{fmtTL(feeResult.net_ucret)}</td></tr>
              <tr className="border-b"><td className="px-3 py-2 text-muted-foreground">KDV Tevkifatı</td><td className="px-3 py-2 text-right">{fmtTL(feeResult.kdv_tevkifati)}</td></tr>
              <tr className="border-b"><td className="px-3 py-2 text-muted-foreground">Tahsil Edilen KDV</td><td className="px-3 py-2 text-right">{fmtTL(feeResult.tahsil_edilen_kdv)}</td></tr>
              <tr className="bg-primary text-primary-foreground"><td className="px-3 py-3 font-bold">NET TAHSİLAT</td><td className="px-3 py-3 text-right font-bold">{fmtTL(feeResult.net_tahsilat)}</td></tr>
            </tbody>
          </table>
          <div className="p-3 text-xs text-muted-foreground border-t bg-muted/20 space-y-1">
            <div><span className="font-medium">Tarife: </span>{feeResult.tarife_yili} Yılı Arabuluculuk Asgari Ücret Tarifesi</div>
            {feeResult.tarife_maddesi && <div><span className="font-medium">Tarife Maddesi: </span>{feeResult.tarife_maddesi}</div>}
            {feeResult.aciklama && <div>{feeResult.aciklama}</div>}
            {feeResult.breakdown && feeResult.breakdown.length > 0 && (
              <div className="pt-2">
                <div className="font-medium mb-1">Dilim Dökümü:</div>
                <ul className="space-y-0.5">
                  {feeResult.breakdown.map((b, i) => (
                    <li key={i}>• {b.dilim} — {b.oran} → {fmtTL(b.tutar)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="border rounded p-3 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={ucretSozlesmesi} onChange={(e) => setUcretSozlesmesi(e.target.checked)} />
          <span className="font-medium text-sm">Ücret Sözleşmesi</span>
        </label>
        {ucretSozlesmesi && (
          <div className="grid gap-3 md:grid-cols-2 pt-1">
            <div className="space-y-1">
              <Label>Kararlaştırılan Ücret (TL)</Label>
              <Input type="text" inputMode="decimal" value={kararlastirilanUcret}
                onChange={(e) => setKararlastirilanUcret(e.target.value)} disabled={contractBusy} />
            </div>
          </div>
        )}
        {taban != null && (
          <p className="text-xs text-muted-foreground">Taban (hesaplanan tarife — NET TAHSİLAT): {fmtTL(taban)}</p>
        )}
        {contractError && (
          <div className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" />{contractError}</div>
        )}
        <Button size="sm" variant="outline" onClick={saveUcretSozlesmesi} disabled={contractBusy}>
          {contractBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Sözleşmeyi Kaydet
        </Button>
      </div>

      <div className="border rounded p-3 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="font-medium text-sm">Senaryoyu Deftere Aktar</h4>
          <Button size="sm" onClick={transferScenarioToLedger} disabled={stageBusy}>
            Senaryoyu Deftere Aktar
          </Button>
        </div>
        {stageError && (
          <div className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" />{stageError}</div>
        )}
        {stagedRows.length > 0 && (
          <div className="space-y-2">
            <div className="rounded border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2 py-1 text-left">Ödeyen</th>
                    <th className="px-2 py-1 text-left">Açıklama</th>
                    <th className="px-2 py-1 text-right">Tutar (TL)</th>
                  </tr>
                </thead>
                <tbody>
                  {stagedRows.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">{r.payer_label}</td>
                      <td className="px-2 py-1">
                        <Input value={r.description} onChange={(e) => updateStagedRow(i, { description: e.target.value })} className="h-8" />
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-center justify-end gap-1.5">
                          <Input type="text" inputMode="decimal" value={String(r.amount)}
                            onChange={(e) => updateStagedRow(i, { amount: parseAmount(e.target.value) })}
                            className="h-8 text-right" />
                          {(scenario.key === "anlasma" || scenario.key === "ihtiyari_anlasamama") && (
                            <Button size="sm" variant="secondary" className="h-8 px-2 text-xs whitespace-nowrap"
                              onClick={() => assignFullAmountToRow(i)}>
                              Tümünü buna yükle
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveStagedRows} disabled={stageBusy}>
                {stageBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Onayla ve Kaydet
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStagedRows([])} disabled={stageBusy}>Vazgeç</Button>
            </div>
          </div>
        )}
      </div>

      <div className="border rounded p-3 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="font-medium text-sm">Ödeme Defteri</h4>
          <span className="text-xs text-muted-foreground">
            Kayıtlı ücret toplamı: {fmtTL(existingUcretSum)}{taban != null ? ` / Taban: ${fmtTL(taban)}` : ""}
          </span>
        </div>

        <div className="rounded border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-1 text-left">Tarih</th>
                <th className="px-2 py-1 text-left">Ödeyen</th>
                <th className="px-2 py-1 text-left">Tür</th>
                <th className="px-2 py-1 text-left">Açıklama</th>
                <th className="px-2 py-1 text-right">Tutar</th>
                <th className="px-2 py-1 text-left">Durum</th>
                <th className="px-2 py-1 text-left">Makbuz No</th>
                <th className="px-2 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {paymentsLoading && (
                <tr><td colSpan={8} className="px-2 py-3 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-1" />Yükleniyor...</td></tr>
              )}
              {!paymentsLoading && payments.length === 0 && (
                <tr><td colSpan={8} className="px-2 py-3 text-center text-muted-foreground">Kayıt yok</td></tr>
              )}
              {payments.map((p) => {
                const isEditing = editingId === p.id && editForm;
                if (isEditing && editForm) {
                  return (
                    <tr key={p.id} className="border-t align-top bg-muted/20">
                      <td colSpan={8} className="px-2 py-2">
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-muted-foreground">Tarih</Label>
                            <Input type="date" value={editForm.payment_date}
                              onChange={(e) => setEditForm({ ...editForm, payment_date: e.target.value })}
                              className="h-8 w-36" disabled={editBusy} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-muted-foreground">Ödeyen</Label>
                            <Select value={editForm.payer_party_id} onValueChange={(v) => setEditForm({ ...editForm, payer_party_id: v })}>
                              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bakanlik">Bakanlık</SelectItem>
                                {parties.map((pp) => <SelectItem key={pp.id} value={pp.id}>{pp.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-muted-foreground">Tür</Label>
                            <Select value={editForm.kind} onValueChange={(v) => setEditForm({ ...editForm, kind: v as "ucret" | "masraf" })}>
                              <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ucret">Ücret</SelectItem>
                                <SelectItem value="masraf">Masraf</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1 min-w-0 flex-1 basis-40">
                            <Label className="text-xs text-muted-foreground">Açıklama</Label>
                            <Input value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              className="h-8 w-full min-w-0" disabled={editBusy} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-muted-foreground">Tutar</Label>
                            <Input type="text" inputMode="decimal" value={editForm.amount}
                              onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                              className="h-8 w-24 text-right" disabled={editBusy} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-muted-foreground">Durum</Label>
                            <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v as "bekliyor" | "odendi" })}>
                              <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bekliyor">Bekliyor</SelectItem>
                                <SelectItem value="odendi">Ödendi</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-muted-foreground">Makbuz No</Label>
                            <Input placeholder="Makbuz no" value={editForm.receipt_no}
                              onChange={(e) => setEditForm({ ...editForm, receipt_no: e.target.value })}
                              className="h-8 w-28" disabled={editBusy} />
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <div className="flex items-center gap-1">
                              <Button size="sm" onClick={() => requestSaveEdit(p)} disabled={editBusy}>
                                {editBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditRow} disabled={editBusy}>İptal</Button>
                            </div>
                            {editError && (
                              <div className="text-xs text-destructive flex items-center gap-1 max-w-[220px]">
                                <AlertTriangle className="h-3 w-3 shrink-0" />{editError}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={p.id} className="border-t align-top">
                    <td className="px-2 py-2 whitespace-nowrap">{p.payment_date}</td>
                    <td className="px-2 py-2">{p.payer_label}</td>
                    <td className="px-2 py-2">{p.kind === "ucret" ? "Ücret" : "Masraf"}</td>
                    <td className="px-2 py-2">{p.description || "-"}</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">{fmtTL(Number(p.amount))}</td>
                    <td className="px-2 py-2">
                      <Badge variant={p.status === "odendi" ? "default" : "outline"}>
                        {p.status === "odendi" ? "Ödendi" : "Bekliyor"}
                      </Badge>
                    </td>
                    <td className="px-2 py-2">{p.receipt_no || "-"}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        {p.status === "bekliyor" && (
                          markingId === p.id ? (
                            <div className="flex items-center gap-1">
                              <Input placeholder="Makbuz no" value={receiptDraft} onChange={(e) => setReceiptDraft(e.target.value)} className="h-8 w-28" />
                              <Button size="sm" onClick={() => confirmMarkPaid(p.id)} disabled={markBusy}>
                                {markBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setMarkingId(null); setReceiptDraft(""); }}>İptal</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => { setMarkingId(p.id); setReceiptDraft(""); }}>Ödendi işaretle</Button>
                          )
                        )}
                        {canManagePayments && markingId !== p.id && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => startEditRow(p)} title="Düzenle">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(p)} title="Sil">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 md:grid-cols-6 items-end border-t pt-3">
          <div className="space-y-1">
            <Label>Tarih</Label>
            <Input type="date" value={rowDate} onChange={(e) => setRowDate(e.target.value)} disabled={rowBusy} />
          </div>
          <div className="space-y-1">
            <Label>Ödeyen</Label>
            <Select value={rowPayerId} onValueChange={setRowPayerId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bakanlik">Bakanlık</SelectItem>
                {parties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tür</Label>
            <Select value={rowKind} onValueChange={(v) => setRowKind(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ucret">Ücret</SelectItem>
                <SelectItem value="masraf">Masraf</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Açıklama</Label>
            <Input value={rowDesc} onChange={(e) => setRowDesc(e.target.value)} disabled={rowBusy} />
          </div>
          <div className="space-y-1">
            <Label>Tutar (TL)</Label>
            <Input type="text" inputMode="decimal" value={rowAmount} onChange={(e) => setRowAmount(e.target.value)} disabled={rowBusy} />
          </div>
        </div>
        {rowError && (
          <div className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" />{rowError}</div>
        )}
        <Button size="sm" onClick={addPaymentRow} disabled={rowBusy}>
          {rowBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          Satır Ekle
        </Button>
      </div>

      <AlertDialog open={!!sensitiveEditConfirm} onOpenChange={(o) => !o && !editBusy && setSensitiveEditConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ödenmiş kayıt değiştirilecek</AlertDialogTitle>
            <AlertDialogDescription>
              Bu satır zaten ödendi işaretli, tutarı/türü değiştirmek muhasebe kaydını bozabilir. Devam edilsin mi?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={editBusy}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={editBusy}
              onClick={(e) => { e.preventDefault(); if (sensitiveEditConfirm) performSaveEdit(sensitiveEditConfirm); }}
            >
              {editBusy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Kaydediliyor…</> : "Evet, Devam Et"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleteBusy && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bu defter satırı silinecek, emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.payer_label} — {deleteTarget ? fmtTL(Number(deleteTarget.amount)) : ""} tutarındaki kayıt kalıcı olarak silinecek.
              {deleteTarget?.status === "odendi" && (
                <span className="block mt-2 text-destructive font-medium">
                  Bu kayıt "Ödendi" işaretli{deleteTarget?.receipt_no ? ` (Makbuz No: ${deleteTarget.receipt_no})` : ""}. Ödenmiş/makbuzlu bir kaydı silmek muhasebe geçmişini bozar.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteBusy}
              onClick={(e) => { e.preventDefault(); deletePaymentRow(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBusy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Siliniyor…</> : "Evet, Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Phase9Closing({ caseRow, reload }: { caseRow: CaseRow; reload: () => void }) {
  const [docCount, setDocCount] = useState(0);
  const [status, setStatus] = useState<string | null>(caseRow.status);
  const [closedAt, setClosedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState<"agreed" | "failed" | null>(null);

  useEffect(() => { (async () => {
    const { count } = await supabase.from("agreement_documents").select("id", { count: "exact", head: true }).eq("case_id", caseRow.id);
    setDocCount(count ?? 0);
  })(); }, [caseRow.id]);

  useEffect(() => {
    setStatus(caseRow.status);
    if (caseRow.status === "agreed" || caseRow.status === "failed") {
      (async () => {
        const { data } = await supabase.from("cases").select("updated_at").eq("id", caseRow.id).maybeSingle();
        setClosedAt((data as any)?.updated_at ?? null);
      })();
    } else {
      setClosedAt(null);
    }
  }, [caseRow.id, caseRow.status]);

  async function closeCase(agreed: boolean) {
    const outcome = agreed ? "agreed" : "failed";
    setBusy(outcome);
    try {
      const { error } = await supabase.from("cases").update({ status: outcome, current_phase: 9 } as any).eq("id", caseRow.id);
      if (error) throw error;
      setStatus(outcome);
      setClosedAt(new Date().toISOString());
      toast({ title: agreed ? "Dosya anlaşma ile kapatıldı" : "Dosya anlaşamama ile kapatıldı" });
      reload();
    } catch (e: any) {
      toast({ title: "Hata", description: trErr(e.message), variant: "destructive" });
    } finally { setBusy(null); }
  }

  const closingLabel = status === "agreed" ? "Anlaşma" : status === "failed" ? "Anlaşamama" : "Devam Ediyor";
  const closingTone = status === "agreed" ? "low" : status === "failed" ? "high" : "medium";
  const isClosed = status === "agreed" || status === "failed";

  return (
    <div className="space-y-4">
      <PhaseHero
        label="Faz 8 — Belgeler & Kapanış"
        metrics={[
          { label: "Üretilen Belge", value: docCount },
          { label: "Kapanış Durumu", value: closingLabel, tone: closingTone },
        ]}
      />
    <motion.div variants={containerVariants} initial="hidden" animate="show">
    <Card className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-primary">Aşama 8 — Belgeler & Kapanış</h2>

      <Tabs defaultValue="belgeler">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="belgeler" className={tabTriggerAccentClass}>Belgeler</TabsTrigger>
          <TabsTrigger value="kapanis" className={tabTriggerAccentClass}>Kapanış</TabsTrigger>
          <TabsTrigger value="odeme" className={tabTriggerAccentClass}>Ödeme & Muhasebe</TabsTrigger>
        </TabsList>

        {/* ===== BELGELER ===== */}
        <TabsContent value="belgeler">
          <motion.section variants={itemVariants} className="space-y-4">
            <h3 className="text-lg font-semibold heading-gold-underline">Belgeler</h3>
            <OfficialDocumentsPanel caseRow={caseRow} onOutcomeSaved={reload} />
          </motion.section>
        </TabsContent>

        {/* ===== KAPANIŞ ===== */}
        <TabsContent value="kapanis">
          <motion.section variants={itemVariants} className="space-y-4">
            <h3 className="text-lg font-semibold heading-gold-underline">Kapanış</h3>

            {isClosed ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className={`rounded-2xl border p-6 flex items-center gap-4 ${
                  status === "agreed" ? "border-emerald-400/40 bg-emerald-400/5" : "border-red-400/40 bg-red-400/5"
                }`}
              >
                {status === "agreed"
                  ? <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" />
                  : <XCircle className="h-8 w-8 text-red-400 shrink-0" />}
                <div>
                  <div className="font-display font-semibold text-lg">
                    Bu dosya {status === "agreed" ? "Anlaşma" : "Anlaşamama"} ile kapanmıştır
                  </div>
                  {closedAt && (
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {new Date(closedAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => closeCase(true)}
                  className="group text-left rounded-2xl border border-sidebar-border p-5 transition-colors hover:border-emerald-400/50 hover:bg-emerald-400/5 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {busy === "agreed"
                    ? <Loader2 className="h-6 w-6 text-emerald-400 mb-2 animate-spin" />
                    : <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-2" />}
                  <div className="font-semibold">Anlaşma ile Kapat</div>
                  <div className="text-xs text-muted-foreground mt-1">Taraflar anlaşmaya vardı; dosya anlaşma ile sonuçlandırılır.</div>
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => closeCase(false)}
                  className="group text-left rounded-2xl border border-sidebar-border p-5 transition-colors hover:border-red-400/50 hover:bg-red-400/5 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {busy === "failed"
                    ? <Loader2 className="h-6 w-6 text-red-400 mb-2 animate-spin" />
                    : <XCircle className="h-6 w-6 text-red-400 mb-2" />}
                  <div className="font-semibold">Anlaşamama ile Kapat</div>
                  <div className="text-xs text-muted-foreground mt-1">Taraflar anlaşamadı; dosya anlaşamama ile sonuçlandırılır.</div>
                </button>
              </div>
            )}
          </motion.section>
        </TabsContent>

        {/* ===== ÖDEME & MUHASEBE ===== */}
        <TabsContent value="odeme">
          <motion.section variants={itemVariants} className="space-y-4">
            <h3 className="text-lg font-semibold heading-gold-underline">Ödeme & Muhasebe</h3>
            <PaymentAccountingPanel caseRow={caseRow} />
          </motion.section>
        </TabsContent>
      </Tabs>
    </Card>
    </motion.div>
    </div>
  );
}


/* ===================== PHASE 7 - EXPERT ===================== */

const EXPERT_STATUS_LABEL: Record<string, string> = {
  pending: "Onay Bekliyor",
  accepted: "Kabul Edildi",
};

function Phase7Expert({ caseRow }: { caseRow: CaseRow }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<{ id: string; status: string; expertName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);

  const loadAssignment = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("case_expert_assignments")
      .select("id, status, expert_id, experts:expert_id(full_name)")
      .eq("case_id", caseRow.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setAssignment({
        id: (data as any).id,
        status: (data as any).status,
        expertName: (data as any).experts?.full_name ?? "Bilirkişi",
      });
      setSelected((data as any).expert_id);
    } else {
      setAssignment(null);
      setSelected(null);
    }
    setLoading(false);
  }, [caseRow.id]);

  useEffect(() => { loadAssignment(); }, [loadAssignment]);

  async function removeAssignment() {
    if (!assignment) return;
    setRemoving(true);
    const { error } = await supabase.from("case_expert_assignments").delete().eq("id", assignment.id);
    if (error) toast({ title: "Kaldırma hatası", description: trErr(error.message), variant: "destructive" });
    else {
      toast({ title: "Bilirkişi ataması kaldırıldı" });
      setAssignment(null);
      setSelected(null);
    }
    setRemoving(false);
  }

  return (
    <div className="space-y-4">
      <PhaseHero
        label="Faz 6 — Bilirkişi"
        metrics={[
          {
            label: "Bilirkişi Durumu",
            value: loading ? null : assignment ? (EXPERT_STATUS_LABEL[assignment.status] ?? assignment.status) : "Atanmadı",
            tone: assignment?.status === "accepted" ? "low" : assignment ? "medium" : undefined,
          },
        ]}
        aside={
          <span className="inline-block text-[11px] font-medium px-2.5 py-1 rounded-full bg-sidebar-accent/40 border border-sidebar-border text-sidebar-foreground/70">
            Opsiyonel
          </span>
        }
      />
    <motion.div variants={containerVariants} initial="hidden" animate="show">
    <Card className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-primary">Aşama 6 — Bilirkişi (Opsiyonel)</h2>
      <p className="text-sm text-muted-foreground">Uyuşmazlık türü: {caseRow.dispute_type}</p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Atama bilgisi yükleniyor…</div>
      ) : assignment && (
        <motion.div variants={itemVariants} className="flex items-center justify-between gap-2 border rounded-md p-3 bg-muted/30">
          <div className="text-sm">
            <span className="font-medium">{assignment.expertName}</span>{" "}
            <Badge variant="secondary" className="ml-1">{EXPERT_STATUS_LABEL[assignment.status] ?? assignment.status}</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={removeAssignment} disabled={removing}>
            {removing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
            Atamayı Kaldır
          </Button>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
      <ExpertSelector
        niche={caseRow.dispute_type || ""}
        selectedId={selected}
        onSelect={async (e) => {
          if (!user) return;
          setSelected(e.id);
          const { error } = await supabase.from("case_expert_assignments").insert({
            case_id: caseRow.id, expert_id: e.id, status: "pending", assigned_by: user.id,
          } as any);
          if (error) toast({ title: "Atama hatası", description: trErr(error.message), variant: "destructive" });
          else {
            toast({ title: "Bilirkişi atandı (taraf onayı bekleniyor)" });
            loadAssignment();
          }
        }}
      />
      </motion.div>
    </Card>
    </motion.div>
    </div>
  );
}
