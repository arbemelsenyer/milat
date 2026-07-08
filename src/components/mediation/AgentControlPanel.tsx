import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Activity,
  AlertTriangle,
  Brain,
  CalendarClock,
  CheckCircle2,
  FileSearch,
  FileSignature,
  Lightbulb,
  MessageSquare,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

type AgentStatus = "pending" | "running" | "completed" | "failed" | "flagged";

type AgentStateRow = {
  id: string;
  case_id: string;
  agent_type: string;
  party_id: string | null;
  status: string;
  error_message: string | null;
  updated_at: string;
};

const AGENT_TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  party_analysis: { label: "Taraf Analizi", icon: Users, color: "text-blue-600" },
  common_ground: { label: "Ortak Zemin Sentezi", icon: Lightbulb, color: "text-amber-600" },
  classify_dispute: { label: "Uyuşmazlık Sınıflandırma", icon: Scale, color: "text-indigo-600" },
  deadline_detect: { label: "Süre Tespiti", icon: CalendarClock, color: "text-rose-600" },
  document_analysis: { label: "Belge Analizi", icon: FileSearch, color: "text-cyan-600" },
  agreement_generation: { label: "Belge Üretimi", icon: FileSignature, color: "text-emerald-600" },
  meeting_notes: { label: "Görüşme Notu Analizi", icon: MessageSquare, color: "text-purple-600" },
  party_a: { label: "Taraf A Ajanı", icon: Users, color: "text-blue-600" },
  party_b: { label: "Taraf B Ajanı", icon: Users, color: "text-purple-600" },
  mediator: { label: "Arabulucu Ajan", icon: Scale, color: "text-emerald-600" },
  validator: { label: "Doğrulama Ajanı", icon: ShieldCheck, color: "text-amber-600" },
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
  const [rows, setRows] = useState<AgentStateRow[]>([]);
  const [partyNames, setPartyNames] = useState<Record<string, string>>({});
  const [, setTick] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [{ data: states }, { data: parties }] = await Promise.all([
        supabase
          .from("agent_states")
          .select("id, case_id, agent_type, party_id, status, error_message, updated_at")
          .eq("case_id", caseId)
          .order("updated_at", { ascending: false }),
        supabase.from("case_parties").select("id, party_type, first_name, last_name, company_name").eq("case_id", caseId),
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

  return (
    <div className="space-y-4">
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
                          <div className="text-sm font-medium truncate">{meta.label}</div>
                          {partyName && <div className="text-xs text-muted-foreground truncate">{partyName}</div>}
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
        </CardContent>
      </Card>
    </div>
  );
}
