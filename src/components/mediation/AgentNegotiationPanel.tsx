import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle2, Brain, Scale, Users, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type AgentType = "party_a" | "party_b" | "mediator" | "validator";
type AgentState = {
  id: string;
  case_id: string;
  agent_type: AgentType;
  status: "pending" | "running" | "completed" | "failed" | "flagged";
  last_output: any;
  confidence_score: number | null;
  hallucination_risk: boolean;
  error_message: string | null;
  updated_at: string;
};

const AGENT_META: Record<AgentType, { label: string; icon: any; color: string }> = {
  party_a: { label: "Taraf A Ajanı", icon: Users, color: "text-blue-600" },
  party_b: { label: "Taraf B Ajanı", icon: Users, color: "text-purple-600" },
  mediator: { label: "Arabulucu Ajan", icon: Scale, color: "text-emerald-600" },
  validator: { label: "Doğrulama Ajanı", icon: ShieldCheck, color: "text-amber-600" },
};

export function AgentNegotiationPanel({ caseId, isMediator = false }: { caseId: string; isMediator?: boolean }) {
  const [states, setStates] = useState<Record<AgentType, AgentState | null>>({
    party_a: null, party_b: null, mediator: null, validator: null,
  });
  const [partyAText, setPartyAText] = useState("");
  const [partyBText, setPartyBText] = useState("");
  const [running, setRunning] = useState<AgentType | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("agent_states").select("*").eq("case_id", caseId);
      if (data) {
        const next: any = { party_a: null, party_b: null, mediator: null, validator: null };
        data.forEach((s: any) => { next[s.agent_type] = s; });
        setStates(next);
      }
    };
    load();

    const channel = supabase
      .channel(`agent_states:${caseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_states", filter: `case_id=eq.${caseId}` },
        (payload: any) => {
          const row = payload.new as AgentState;
          if (row?.agent_type) setStates((prev) => ({ ...prev, [row.agent_type]: row }));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [caseId]);

  const runAgent = async (agent: AgentType | "all") => {
    setRunning(agent === "all" ? "party_a" : agent);
    try {
      const { data, error } = await supabase.functions.invoke("multi-agent-negotiation", {
        body: { case_id: caseId, agent, party_a_text: partyAText, party_b_text: partyBText },
      });
      if (error) throw error;
      toast({ title: "Ajan tamamlandı", description: `${agent} başarıyla çalıştırıldı.` });
    } catch (e: any) {
      toast({ title: "Hata", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setRunning(null);
    }
  };

  const StatusBadge = ({ s }: { s: AgentState | null }) => {
    if (!s) return <Badge variant="outline">Beklemede</Badge>;
    const map: Record<string, { label: string; variant: any }> = {
      pending: { label: "Beklemede", variant: "outline" },
      running: { label: "Çalışıyor", variant: "secondary" },
      completed: { label: "Tamamlandı", variant: "default" },
      flagged: { label: "Riskli", variant: "destructive" },
      failed: { label: "Başarısız", variant: "destructive" },
    };
    const m = map[s.status] ?? map.pending;
    return <Badge variant={m.variant}>{m.label}</Badge>;
  };

  const AgentCard = ({ type }: { type: AgentType }) => {
    const s = states[type];
    const meta = AGENT_META[type];
    const Icon = meta.icon;
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${meta.color}`} />
              {meta.label}
            </span>
            <StatusBadge s={s} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {s?.status === "running" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Analiz ediliyor…
            </div>
          )}
          {s?.hallucination_risk && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-3 w-3" />
              <AlertDescription className="text-xs">
                Düşük güven ({((s.confidence_score ?? 0) * 100).toFixed(0)}%) — hallüsinasyon riski.
              </AlertDescription>
            </Alert>
          )}
          {s?.confidence_score != null && !s.hallucination_risk && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              Güven: {(s.confidence_score * 100).toFixed(0)}%
            </div>
          )}
          {s?.error_message && (
            <p className="text-xs text-destructive">{s.error_message}</p>
          )}
          {s?.last_output && (
            <pre className="text-[10px] bg-muted p-2 rounded max-h-48 overflow-auto whitespace-pre-wrap">
              {JSON.stringify(s.last_output, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Çok Katmanlı Müzakere Motoru
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium">Taraf A Pozisyonu (anonim)</label>
              <Textarea
                value={partyAText}
                onChange={(e) => setPartyAText(e.target.value)}
                placeholder="Taraf A'nın pozisyon, çıkar ve önceliklerini yazın…"
                rows={4}
              />
              <Button size="sm" onClick={() => runAgent("party_a")} disabled={!partyAText || running !== null}>
                {running === "party_a" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Taraf A Ajanını Çalıştır
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Taraf B Pozisyonu (anonim)</label>
              <Textarea
                value={partyBText}
                onChange={(e) => setPartyBText(e.target.value)}
                placeholder="Taraf B'nin pozisyon, çıkar ve önceliklerini yazın…"
                rows={4}
              />
              <Button size="sm" onClick={() => runAgent("party_b")} disabled={!partyBText || running !== null}>
                {running === "party_b" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Taraf B Ajanını Çalıştır
              </Button>
            </div>
          </div>

          {isMediator && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button size="sm" variant="secondary" onClick={() => runAgent("mediator")} disabled={running !== null}>
                Arabulucu Ajanı Çalıştır
              </Button>
              <Button size="sm" variant="secondary" onClick={() => runAgent("validator")} disabled={running !== null}>
                Doğrulama Ajanını Çalıştır
              </Button>
              <Button size="sm" onClick={() => runAgent("all")} disabled={!partyAText || !partyBText || running !== null}>
                Tüm Ajanları Sırayla Çalıştır
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <AgentCard type="party_a" />
        <AgentCard type="party_b" />
        <AgentCard type="mediator" />
        <AgentCard type="validator" />
      </div>
    </div>
  );
}
