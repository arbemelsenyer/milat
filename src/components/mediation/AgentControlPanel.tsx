import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  Activity,
  AlertTriangle,
  Brain,
  CalendarClock,
  CheckCircle2,
  FileSearch,
  FileSignature,
  Lightbulb,
  Loader2,
  MessageSquare,
  PlayCircle,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";

type AgentStatus = "pending" | "running" | "completed" | "failed" | "flagged";

type OrchestratorStep = { step: string; status: "completed" | "skipped" | "failed"; detail?: string };
type OrchestratorOutput = { current_step?: string; steps?: OrchestratorStep[] } | null;

type AgentStateRow = {
  id: string;
  case_id: string;
  agent_type: string;
  party_id: string | null;
  status: string;
  error_message: string | null;
  updated_at: string;
  last_output?: OrchestratorOutput;
};

type CaseSummaryInfo = {
  dispute_type: string | null;
  deadline_total: string | null;
  is_mandatory: boolean | null;
  issue_description: string | null;
};

type CommonGroundReportRow = {
  id: string;
  risk_ozeti: { genel_uzlasma_orani?: string } | null;
  created_at: string;
};

const ORCHESTRATOR_STEPS: { key: string; label: string }[] = [
  { key: "classify_dispute", label: "Sınıflandırılıyor" },
  { key: "deadline_detect", label: "Süreler" },
  { key: "party_analysis", label: "Taraf analizleri" },
  { key: "common_ground", label: "Ortak zemin" },
];

type StepVisualState = "done" | "active" | "pending" | "failed" | "skipped";

function getStepStates(row: AgentStateRow | undefined): Record<string, StepVisualState> {
  const result: Record<string, StepVisualState> = {};
  ORCHESTRATOR_STEPS.forEach((s) => (result[s.key] = "pending"));
  if (!row?.last_output) return result;
  const { current_step, steps } = row.last_output;
  if (Array.isArray(steps) && steps.length > 0) {
    steps.forEach((s) => {
      if (s.status === "completed") result[s.step] = "done";
      else if (s.status === "skipped") result[s.step] = "skipped";
      else if (s.status === "failed") result[s.step] = "failed";
    });
    return result;
  }
  if (current_step) {
    const idx = ORCHESTRATOR_STEPS.findIndex((s) => s.key === current_step);
    if (idx !== -1) {
      ORCHESTRATOR_STEPS.forEach((s, i) => {
        if (i < idx) result[s.key] = "done";
        else if (i === idx) result[s.key] = row.status === "failed" ? "failed" : "active";
      });
    }
  }
  return result;
}

function OrchestratorProgress({ row }: { row: AgentStateRow }) {
  const states = getStepStates(row);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs pt-1">
      {ORCHESTRATOR_STEPS.map((s) => {
        const state = states[s.key];
        return (
          <span key={s.key} className="flex items-center gap-1.5">
            <span
              className={
                state === "done"
                  ? "text-emerald-600"
                  : state === "failed"
                    ? "text-red-600"
                    : state === "active"
                      ? "text-accent font-medium"
                      : "text-muted-foreground"
              }
            >
              {s.label}...
            </span>
            {state === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
            {state === "active" && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />}
            {state === "failed" && <XCircle className="h-3.5 w-3.5 text-red-600" />}
            {state === "skipped" && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
          </span>
        );
      })}
    </div>
  );
}

const AGENT_TYPE_META: Record<string, { label: string; icon: any; color: string; description?: string }> = {
  party_analysis: { label: "Taraf Analizi", icon: Users, color: "text-blue-600" },
  common_ground: { label: "Ortak Zemin Sentezi", icon: Lightbulb, color: "text-amber-600" },
  classify_dispute: { label: "Uyuşmazlık Sınıflandırma", icon: Scale, color: "text-indigo-600" },
  deadline_detect: { label: "Süre Tespiti", icon: CalendarClock, color: "text-rose-600" },
  document_analysis: { label: "Belge Analizi", icon: FileSearch, color: "text-cyan-600" },
  agreement_generation: { label: "Belge Üretimi", icon: FileSignature, color: "text-emerald-600" },
  meeting_notes: { label: "Görüşme Notu Analizi", icon: MessageSquare, color: "text-purple-600" },
  // İkon/renk eşleşmeleri mevcut kayıtlardan alındı (validator ve meeting_notes) — yeni
  // renk/ikon eklenmedi. Bilinmeyen slug'lar için Brain + text-muted-foreground yedeği aynen duruyor.
  party_consistency: {
    label: "İç Tutarlılık Denetimi", icon: ShieldCheck, color: "text-amber-600",
    description: "Tarafın beyanı ile kendi belgeleri arasındaki uyumsuzlukları arar",
  },
  party_communication: {
    label: "İletişim ve Asıl İhtiyaç", icon: MessageSquare, color: "text-purple-600",
    description: "Tarafın nasıl konuştuğundan izler çıkarır, keşif soruları üretir",
  },
  party_a: { label: "Taraf A Ajanı", icon: Users, color: "text-blue-600" },
  party_b: { label: "Taraf B Ajanı", icon: Users, color: "text-purple-600" },
  mediator: { label: "Arabulucu Ajan", icon: Scale, color: "text-emerald-600" },
  validator: { label: "Doğrulama Ajanı", icon: ShieldCheck, color: "text-amber-600" },
  orchestrator: { label: "Tüm Analiz (Orkestratör)", icon: Sparkles, color: "text-primary" },
};

function formatRelativeTime(iso: string): string {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return "az önce";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} sa önce`;
  return `${Math.floor(diffHour / 24)} gün önce`;
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

// agent_states'te current_step diye bir KOLON YOK — değer last_output JSONB'sinin
// "current_step" anahtarında duruyor. Sürücü satırı bazen düz string olarak da
// döndürebildiği için önce parse denenir; okunamayan/beklenmeyen şekilde gelen kayıt
// boş string döndürür ve satır hiç render edilmez.
function readCurrentStep(last_output: AgentStateRow["last_output"]): string {
  let source: unknown = last_output;
  if (typeof source === "string") {
    try { source = JSON.parse(source); } catch { return ""; }
  }
  if (!source || typeof source !== "object") return "";
  const value = (source as { current_step?: unknown }).current_step;
  return typeof value === "string" ? value.trim() : "";
}

// Adım slug'larının okunur karşılıkları. ORCHESTRATOR_STEPS'te zaten etiketi olanlar
// oradan alınır (tek kaynak); zincire sonradan eklenen best-effort adımlar burada.
const EXTRA_STEP_LABELS: Record<string, string> = {
  party_consistency: "İç tutarlılık denetimi",
  party_communication: "İletişim analizi",
};

// current_step'i satır altında gösterilecek metne çevirir. Orkestratör slug yazıyor
// ("common_ground"); taraf ajanları düz Türkçe cümle yazıyor ve ilk adım
// "<taraf adı> — ..." biçiminde geldiği için taraf adı iki kez yazılmasın diye ayıklanır.
// Bilinmeyen değer olduğu gibi basılır.
function currentStepLabel(row: AgentStateRow, partyName?: string): string {
  const raw = readCurrentStep(row.last_output);
  if (!raw) return "";
  const known = ORCHESTRATOR_STEPS.find((s) => s.key === raw);
  if (known) return known.label;
  if (EXTRA_STEP_LABELS[raw]) return EXTRA_STEP_LABELS[raw];
  if (partyName && raw.startsWith(partyName)) {
    return raw.slice(partyName.length).replace(/^\s*[—–-]\s*/, "").trim();
  }
  return raw;
}

function StatusIndicator({ row }: { row: AgentStateRow }) {
  if (row.status === "running") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-accent">
        <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
        çalışıyor...
      </span>
    );
  }
  if (row.status === "completed") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }
  if (row.status === "failed" || row.status === "flagged") {
    const icon = <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (!row.error_message) return icon;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{icon}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{row.error_message}</TooltipContent>
      </Tooltip>
    );
  }
  return <span className="text-xs text-muted-foreground">Beklemede</span>;
}

export function AgentControlPanel({ caseId, isMediator }: { caseId: string; isMediator: boolean }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AgentStateRow[]>([]);
  const [partyNames, setPartyNames] = useState<Record<string, string>>({});
  const [documentCount, setDocumentCount] = useState<number | null>(null);
  const [caseInfo, setCaseInfo] = useState<CaseSummaryInfo | null>(null);
  const [commonGroundReport, setCommonGroundReport] = useState<CommonGroundReportRow | null>(null);
  const [invoking, setInvoking] = useState(false);
  const [summaryDismissed, setSummaryDismissed] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [{ data: states }, { data: parties }, { count: docCount }, { data: caseRow }] = await Promise.all([
        supabase
          .from("agent_states")
          .select("id, case_id, agent_type, party_id, status, error_message, updated_at, last_output")
          .eq("case_id", caseId)
          .order("updated_at", { ascending: false }),
        supabase.from("case_parties").select("id, party_type, first_name, last_name, company_name").eq("case_id", caseId),
        supabase.from("case_documents").select("id", { count: "exact", head: true }).eq("case_id", caseId),
        supabase.from("cases").select("dispute_type, deadline_total, is_mandatory, issue_description").eq("id", caseId).maybeSingle(),
      ]);
      if (!active) return;
      if (states) setRows(states as AgentStateRow[]);
      if (parties) {
        const map: Record<string, string> = {};
        parties.forEach((p: any) => {
          map[p.id] = p.party_type === "individual" ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : p.company_name ?? "";
        });
        setPartyNames(map);
      }
      setDocumentCount(docCount ?? 0);
      if (caseRow) setCaseInfo(caseRow as CaseSummaryInfo);
    };
    load();

    const channel = supabase
      .channel(`agent_control_panel:${caseId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_states", filter: `case_id=eq.${caseId}` },
        (payload: any) => {
          const row = payload.new as AgentStateRow;
          if (!row?.id) return;
          setRows((prev) => {
            const idx = prev.findIndex((r) => r.id === row.id);
            const next = idx === -1 ? [row, ...prev] : prev.map((r) => (r.id === row.id ? row : r));
            return next.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [caseId]);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const runningCount = useMemo(() => rows.filter((r) => r.status === "running").length, [rows]);
  const completedTodayCount = useMemo(
    () => rows.filter((r) => r.status === "completed" && isToday(r.updated_at)).length,
    [rows],
  );

  const orchestratorRow = useMemo(
    () => rows.find((r) => r.agent_type === "orchestrator" && r.party_id === null),
    [rows],
  );
  const partyCount = Object.keys(partyNames).length;

  const missingReasons: string[] = [];
  if (partyCount < 2) missingReasons.push("2. taraf bekleniyor");
  if ((documentCount ?? 0) < 1 && !caseInfo?.issue_description?.trim()) missingReasons.push("Belge veya uyuşmazlık konusu bekleniyor");
  const readyToRun = missingReasons.length === 0 && documentCount !== null;
  const orchestratorBusy = invoking || orchestratorRow?.status === "running";

  useEffect(() => {
    if (orchestratorRow?.status === "running") setSummaryDismissed(false);
  }, [orchestratorRow?.status]);

  useEffect(() => {
    if (orchestratorRow?.status !== "completed") return;
    let active = true;
    supabase
      .from("common_ground_reports")
      .select("id, risk_ozeti, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setCommonGroundReport((data as CommonGroundReportRow) ?? null);
      });
    return () => {
      active = false;
    };
  }, [caseId, orchestratorRow?.status, orchestratorRow?.updated_at]);

  const handleStartOrchestrator = async () => {
    if (invoking || orchestratorRow?.status === "running") return;
    setInvoking(true);
    try {
      const { error } = await supabase.functions.invoke("orchestrator-run", { body: { case_id: caseId } });
      if (error) throw error;
    } catch (e: any) {
      toast({
        title: "Analiz başlatılamadı",
        description: e?.message ?? "Bilinmeyen bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setInvoking(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card
        className={
          readyToRun && !orchestratorBusy
            ? "border-accent ring-1 ring-accent/40 shadow-[0_0_16px_-4px] shadow-accent/40"
            : undefined
        }
      >
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">Tüm Analizi Başlat</span>
              {readyToRun && !orchestratorBusy && (
                <Badge className="bg-accent/15 text-accent border-accent/30 hover:bg-accent/15">Analize hazır</Badge>
              )}
            </div>
            {!readyToRun && !orchestratorBusy && (
              <p className="text-xs text-muted-foreground mt-1">{missingReasons.join(" · ")}</p>
            )}
            {orchestratorRow && orchestratorRow.status === "running" && <OrchestratorProgress row={orchestratorRow} />}
          </div>
          <Button
            onClick={handleStartOrchestrator}
            disabled={!readyToRun || orchestratorBusy}
            className={readyToRun && !orchestratorBusy ? "shadow-md shadow-accent/30" : "opacity-60"}
          >
            {orchestratorBusy ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analiz çalışıyor...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Tüm Analizi Başlat
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {orchestratorRow?.status === "completed" && !summaryDismissed && (
        <Card className="border-emerald-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Analiz Tamamlandı
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Uyuşmazlık Türü</dt>
                <dd className="font-medium">{caseInfo?.dispute_type || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Taraf Sayısı</dt>
                <dd className="font-medium">{partyCount}</dd>
              </div>
              {caseInfo?.is_mandatory && caseInfo?.deadline_total && (
                <div>
                  <dt className="text-xs text-muted-foreground">Son Tarih (Dava Şartı)</dt>
                  <dd className="font-medium">{new Date(caseInfo.deadline_total).toLocaleDateString("tr-TR")}</dd>
                </div>
              )}
              {commonGroundReport?.risk_ozeti?.genel_uzlasma_orani && (
                <div>
                  <dt className="text-xs text-muted-foreground">Uzlaşma Tahmini</dt>
                  <dd className="font-medium">{commonGroundReport.risk_ozeti.genel_uzlasma_orani}</dd>
                </div>
              )}
            </dl>
            <div className="flex flex-wrap gap-2 pt-1">
              {/* Arabulucu Paneli 14.08'de Aşama 4 → Aşama 3 oldu; pv=2 bağlantının
                  yeni numaralamada olduğunu söyler (pv'siz eski linkler çevrilir). */}
              <Button size="sm" variant="outline" onClick={() => navigate(`/cases/${caseId}?phase=3&pv=2`)}>
                Açıkla
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(`/cases/${caseId}`)}>
                Düzelt
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSummaryDismissed(true)}>
                Gördüm
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {orchestratorRow?.status === "failed" && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="space-y-2 py-4">
            <p className="text-sm text-red-700 flex items-start gap-2">
              <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
              Analiz durdu: {orchestratorRow.error_message ?? "bilinmeyen hata"}
            </p>
            <Button size="sm" variant="outline" onClick={handleStartOrchestrator} disabled={orchestratorBusy}>
              <RotateCcw className="h-3.5 w-3.5 mr-2" />
              Tekrar Dene
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            {isMediator ? "Ajan Kontrol Paneli" : "AI Aktivitelerim"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 pt-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
              <Activity className={`h-4 w-4 text-accent ${runningCount > 0 ? "animate-pulse" : ""}`} />
            </span>
            <div>
              <div className="text-lg font-semibold leading-none">{runningCount}</div>
              <div className="text-xs text-muted-foreground">ajan çalışıyor</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </span>
            <div>
              <div className="text-lg font-semibold leading-none">{completedTodayCount}</div>
              <div className="text-xs text-muted-foreground">bugün tamamlanan</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <Sparkles className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground max-w-sm">
                Henüz AI aktivitesi yok — bir analiz başlattığınızda burada canlı izleyebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <AnimatePresence initial={false}>
                {rows.map((row) => {
                  const meta = AGENT_TYPE_META[row.agent_type] ?? { label: row.agent_type, icon: Brain, color: "text-muted-foreground" };
                  const Icon = meta.icon;
                  const partyName = row.party_id ? partyNames[row.party_id] : undefined;
                  // Alt adım YALNIZ çalışırken görünür; tamamlandı/hata durumunda satır
                  // yeniden taraf adına döner ve durumu sağdaki mevcut rozet anlatır.
                  const subStep = row.status === "running" ? currentStepLabel(row, partyName) : "";
                  const subLine = [partyName, subStep].filter(Boolean).join(" — ");
                  return (
                    <motion.div
                      key={row.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-center justify-between gap-3 py-2.5 border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Icon className={`h-4 w-4 ${meta.color}`} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate" title={meta.description}>{meta.label}</div>
                          {subLine && <div className="text-xs text-muted-foreground truncate">{subLine}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusIndicator row={row} />
                        <span className="text-xs text-muted-foreground w-16 text-right">{formatRelativeTime(row.updated_at)}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Ajanın yaptıkları ve YAPMADIKLARI + sebebi — tek zaman damgalı liste.
              Yeni kart açılmadı; mevcut panelin altına bölüm olarak eklendi. */}
          {isMediator && <AjanIsListesi caseId={caseId} />}
        </CardContent>
      </Card>
    </div>
  );
}

/* ===================== AJANIN YAPTIKLARI VE YAPMADIKLARI ===================== */

const GOREV_ETIKET: Record<string, string> = {
  analiz_baslat: "Analiz zinciri",
  soru_gonder: "Keşif sorusu",
  randevu_teklifi: "Randevu teklifi",
  asama_gecisi: "Aşama geçişi",
  oturum_hatirlatma: "Oturum hatırlatması",
  arabulucu_onayi: "Arabulucu onayı",
  ilk_temas: "İlk temas ve katılım sorusu",
  teklif_degerlendir: "Teklif değerlendirmesi",
  taraf_musaitlik_iste: "Müsait saat isteği",
  taraf_eksik_bilgi: "Belge/bilgi isteği",
  taraf_alternatif_saat: "Alternatif saat önerisi",
  ozel_oturum: "Özel oturum daveti",
};

const DURUM_ETIKET: Record<string, { label: string; tone: string }> = {
  yapildi: { label: "yapıldı", tone: "text-emerald-700 bg-emerald-500/10" },
  atlandi: { label: "atlandı", tone: "text-muted-foreground bg-muted" },
  bekliyor: { label: "sırada", tone: "text-amber-700 bg-amber-500/10" },
  onay_bekliyor: { label: "onayınız bekleniyor", tone: "text-primary bg-primary/10" },
  iz: { label: "denetim izi", tone: "text-sky-700 bg-sky-500/10" },
};

// Kör Teklif v2 (koşullu aralık / braketleme) denetim izi — yalnız arabulucuda.
const BRAKET_IZ_ETIKET: Record<string, string> = {
  braket_girildi: "Kabul aralığı girildi",
  ortusme_bulundu: "Örtüşme bulundu",
  bant_sorusu_gonderildi: "Bant sorusu gönderildi",
  bant_sorusu_kabul: "Bant sorusu: düşünürüm",
  bant_sorusu_ret: "Bant sorusu: reddedildi",
  taahhut_kabul: "Koşullu taahhüt yürürlükte",
  taahhut_dustu: "Koşullu taahhüt düştü",
};

type BraketIz = { id: string; olay: string; detay: any; created_at: string };

function braketIzDetay(olay: string, d: any): string {
  const para = String(d?.para_birimi ?? "TRY");
  const tutar = (v: any) => (v === null || v === undefined ? "—" : `${Number(v).toLocaleString("tr-TR")} ${para}`);
  if (olay === "braket_girildi") {
    const aralik = `${tutar(d?.alt_sinir)} – ${tutar(d?.ust_sinir)}`;
    const kosul = d?.kosul_bant_alt !== null && d?.kosul_bant_alt !== undefined
      ? ` · koşullu bant ${tutar(d?.kosul_bant_alt)} – ${tutar(d?.kosul_bant_ust)}, iner: ${tutar(d?.kosullu_deger)}`
      : "";
    return `${aralik}${kosul}`;
  }
  if (olay === "ortusme_bulundu") return `Örtüşme bandı ${tutar(d?.bant_alt)} – ${tutar(d?.bant_ust)}`;
  if (d?.bant_alt !== undefined) return `Bant ${tutar(d?.bant_alt)} – ${tutar(d?.bant_ust)}`;
  return "";
}

type GorevRow = {
  id: string;
  gorev_tipi: string;
  durum: string;
  gerekce: string | null;
  sonuc: string | null;
  created_at: string;
  updated_at: string;
};

// Gerekçenin başındaki makine etiketi ([gecis:2->3] gibi) ekranda gösterilmez.
function gerekceMetni(g: string | null): string {
  return String(g ?? "").replace(/^\[[^\]]+\]\s*/, "").trim();
}
function onayAnahtari(g: string | null): string {
  const m = /^\[onay:([^\]]+)\]/.exec(String(g ?? ""));
  return m ? m[1] : "";
}

function AjanIsListesi({ caseId }: { caseId: string }) {
  const [gorevler, setGorevler] = useState<GorevRow[]>([]);
  const [yapilmayanlar, setYapilmayanlar] = useState<{ zaman: string; sebep: string }[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islenen, setIslenen] = useState<string | null>(null);
  // Özel oturum (caucus) talebi: arabulucu tarafı seçer, ajan yalnız o tarafa davet gönderir.
  const [taraflar, setTaraflar] = useState<{ id: string; ad: string }[]>([]);
  const [ozelTaraf, setOzelTaraf] = useState<string>("");
  const [ozelBusy, setOzelBusy] = useState(false);
  const [ozelBilgi, setOzelBilgi] = useState<string | null>(null);
  const [braketIz, setBraketIz] = useState<BraketIz[]>([]);

  async function yukle() {
    setYukleniyor(true);
    const [g, s, p, bi] = await Promise.all([
      supabase.from("ajan_gorevleri" as any)
        .select("id, gorev_tipi, durum, gerekce, sonuc, created_at, updated_at")
        .eq("case_id", caseId).order("updated_at", { ascending: false }).limit(60),
      supabase.from("agent_states")
        .select("last_output, updated_at").eq("case_id", caseId).eq("agent_type", "nobetci")
        .order("updated_at", { ascending: false }).limit(1),
      supabase.from("case_parties")
        .select("id, full_name, company_name, first_name, last_name, party_type")
        .eq("case_id", caseId).order("created_at"),
      (supabase.from("braket_denetim_izi" as any) as any)
        .select("id, olay, detay, created_at")
        .eq("case_id", caseId).order("created_at", { ascending: false }).limit(40),
    ]);
    // Okuma hatası yutulmaz: politika eksikse ekranda görünür.
    if (g.error) setHata(`Görev panosu okunamadı: ${g.error.message}`);
    else setHata(null);
    setGorevler(((g.data ?? []) as any[]) as GorevRow[]);
    const cikti = (s.data?.[0] as any)?.last_output;
    const liste = Array.isArray(cikti?.yapilmayanlar) ? cikti.yapilmayanlar : [];
    setYapilmayanlar(liste.filter((x: any) => x?.sebep).map((x: any) => ({ zaman: String(x.zaman ?? ""), sebep: String(x.sebep) })));
    setBraketIz(((bi?.data ?? []) as any[]) as BraketIz[]);
    setTaraflar(((p.data ?? []) as any[]).map((x) => ({
      id: String(x.id),
      ad: String(x.full_name || x.company_name || `${x.first_name ?? ""} ${x.last_name ?? ""}`.trim() || "(isimsiz)"),
    })));
    setYukleniyor(false);
  }

  // Ajan görevi açılır; daveti nöbetçi gönderir. Oturum "özel oturum" olarak açılır ve
  // karşı tarafa hiçbir yüzeyden gösterilmez.
  async function ozelOturumTalepEt() {
    if (!ozelTaraf || ozelBusy) return;
    setOzelBusy(true);
    setOzelBilgi(null);
    const secilen = taraflar.find((t) => t.id === ozelTaraf);
    const { error } = await supabase.from("ajan_gorevleri" as any).insert({
      case_id: caseId,
      gorev_tipi: "ozel_oturum",
      durum: "bekliyor",
      gerekce: `[ozel:${ozelTaraf}] Arabulucu ${secilen?.ad ?? "taraf"} ile özel oturum talep etti`,
      hedef_party_id: ozelTaraf,
    } as any);
    if (error) setHata(`Özel oturum talebi yazılamadı: ${error.message}`);
    else {
      setOzelBilgi("Talep alındı — davet yalnız seçtiğiniz tarafa gönderilecek.");
      setOzelTaraf("");
      await yukle();
    }
    setOzelBusy(false);
  }

  useEffect(() => { yukle(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [caseId]);

  // Zorunlu insan noktaları: karar arabulucunundur, ajan bu satırları yürütmez.
  async function onayla(g: GorevRow, secim: "yapildi" | "atlandi") {
    setIslenen(g.id);
    try {
      const anahtar = onayAnahtari(g.gerekce);
      if (anahtar.startsWith("oturum_yapildi:") && secim === "yapildi") {
        const sessionId = anahtar.split(":")[1];
        const { error } = await supabase.from("case_sessions")
          .update({ status: "completed" } as any).eq("id", sessionId);
        if (error) throw error;
      }
      const ekOturum = anahtar.startsWith("ek_oturum:");
      const { error: gErr } = await supabase.from("ajan_gorevleri" as any).update({
        durum: secim,
        sonuc: ekOturum
          ? (secim === "yapildi" ? "Arabulucu: ikinci oturum gerekli" : "Arabulucu: ikinci oturum gerekli değil")
          : (secim === "yapildi" ? "Arabulucu onayladı" : "Arabulucu: yapılmadı"),
      } as any).eq("id", g.id);
      if (gErr) throw gErr;
      await yukle();
    } catch (e: any) {
      setHata(`Kaydedilemedi: ${e?.message ?? "bilinmeyen hata"}`);
    } finally {
      setIslenen(null);
    }
  }

  const satirlar = useMemo(() => {
    const a = gorevler.map((g) => ({
      key: `g-${g.id}`,
      zaman: g.updated_at || g.created_at,
      baslik: GOREV_ETIKET[g.gorev_tipi] ?? g.gorev_tipi,
      detay: g.sonuc || gerekceMetni(g.gerekce),
      durum: g.durum,
      gorev: g,
    }));
    const b = yapilmayanlar.map((y, i) => ({
      key: `y-${i}`,
      zaman: y.zaman,
      baslik: "Yapılmadı",
      detay: y.sebep,
      durum: "yapilmadi",
      gorev: null as GorevRow | null,
    }));
    // Kör Teklif v2 denetim izi: her adım zaman damgasıyla aynı listeye düşer.
    const c = braketIz.map((z) => ({
      key: `b-${z.id}`,
      zaman: z.created_at,
      baslik: BRAKET_IZ_ETIKET[z.olay] ?? z.olay,
      detay: braketIzDetay(z.olay, z.detay),
      durum: "iz",
      gorev: null as GorevRow | null,
    }));
    return [...a, ...b, ...c].sort((x, y) => String(y.zaman).localeCompare(String(x.zaman))).slice(0, 80);
  }, [gorevler, yapilmayanlar, braketIz]);

  return (
    <div className="mt-4 border-t pt-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">Ajan ne yaptı, ne yapmadı</div>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={yukle} disabled={yukleniyor}>
          {yukleniyor ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Yenile"}
        </Button>
      </div>
      {hata && (
        <p className="text-xs text-destructive flex items-start gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {hata}
        </p>
      )}

      {/* Özel oturum (caucus): yalnız seçilen tarafa davet gider; oturum "Özel Görüşme"
          olarak açılır ve varlığı karşı tarafa hiçbir yüzeyden gösterilmez. */}
      {taraflar.length > 0 && (
        <div className="rounded-md border p-3 space-y-2">
          <div className="text-xs font-medium">Özel oturum talebi</div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={ozelTaraf}
              onChange={(e) => setOzelTaraf(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-xs min-w-[160px]"
              aria-label="Özel oturum yapılacak taraf"
            >
              <option value="">Taraf seçin…</option>
              {taraflar.map((t) => <option key={t.id} value={t.id}>{t.ad}</option>)}
            </select>
            <Button size="sm" variant="outline" className="h-8 text-xs"
              disabled={!ozelTaraf || ozelBusy} onClick={ozelOturumTalepEt}>
              {ozelBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Özel oturum talep et"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Davet yalnız seçtiğiniz tarafa gider; karşı taraf bu oturumu hiçbir ekranda göremez.
          </p>
          {ozelBilgi && <p className="text-[11px] text-emerald-700">{ozelBilgi}</p>}
        </div>
      )}
      {satirlar.length === 0 && !yukleniyor && !hata && (
        <p className="text-xs text-muted-foreground italic">Bu dosyada henüz ajan kaydı yok.</p>
      )}
      <ul className="divide-y">
        {satirlar.map((r) => {
          const durumMeta = DURUM_ETIKET[r.durum] ?? { label: "yapılmadı", tone: "text-muted-foreground bg-muted" };
          const onayli = r.gorev?.durum === "onay_bekliyor";
          const anahtar = onayAnahtari(r.gorev?.gerekce ?? null);
          return (
            <li key={r.key} className="py-2 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{r.baslik}</span>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${durumMeta.tone}`}>{durumMeta.label}</span>
                </div>
                {r.detay && <div className="text-xs text-muted-foreground break-words">{r.detay}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onayli && r.gorev && (
                  <>
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      disabled={islenen === r.gorev.id}
                      onClick={() => onayla(r.gorev!, "yapildi")}>
                      {anahtar.startsWith("oturum_yapildi:") ? "Yapıldı"
                        : anahtar.startsWith("ek_oturum:") ? "Gerekli"
                        : "Tamamladım"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs"
                      disabled={islenen === r.gorev.id}
                      onClick={() => onayla(r.gorev!, "atlandi")}>
                      {anahtar.startsWith("oturum_yapildi:") ? "Yapılmadı"
                        : anahtar.startsWith("ek_oturum:") ? "Gerekli değil"
                        : "Şimdi değil"}
                    </Button>
                  </>
                )}
                <span className="text-xs text-muted-foreground w-16 text-right">
                  {r.zaman ? formatRelativeTime(r.zaman) : "—"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
