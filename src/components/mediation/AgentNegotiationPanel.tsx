import { useEffect, useState, type ReactNode } from "react";
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

// ── Structured render of agent_states.last_output ──
// Şema kaynağı: supabase/functions/multi-agent-negotiation/index.ts (partySystem/
// mediatorSystem/validatorSystem prompt'ları, satır ~78-116). Bilinen alanlar
// başlıklı bölümlerde, boş/eksik alanlar sessizce atlanır; şemada olmayan
// ekstra alanlar en altta "Diğer" bölümünde (veri kaybı olmadan) gösterilir.
type Senaryo = { tip?: string; baslik?: string; aciklama?: string; adimlar?: string[]; tahmini_sure?: string };
type DogrulanmisSenaryo = { tip?: string; hukuki_dayanak?: string; emsal_referanslar?: string[]; risk_seviyesi?: string; onay?: boolean };
type ElenenSenaryo = { tip?: string; neden?: string };

const KNOWN_OUTPUT_KEYS: Record<AgentType, string[]> = {
  party_a: ["pozisyonlar", "cikarlar", "oncelikler", "kirmizi_cizgiler", "muzakere_esnekligi", "ozet", "confidence"],
  party_b: ["pozisyonlar", "cikarlar", "oncelikler", "kirmizi_cizgiler", "muzakere_esnekligi", "ozet", "confidence"],
  mediator: ["ortak_zemin", "catismalar", "senaryolar", "confidence"],
  validator: ["dogrulanmis_senaryolar", "elenen_senaryolar", "genel_degerlendirme", "confidence"],
};

function confidenceTone(v: number): string {
  if (v >= 0.75) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (v >= 0.5) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
}
function riskSeviyesiTone(v?: string): string {
  const l = String(v ?? "").toLowerCase();
  if (l.includes("yük") || l.includes("yuksek")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (l.includes("orta")) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  if (l.includes("düş") || l.includes("dusuk")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  return "bg-muted text-foreground";
}

function BulletList({ items, danger }: { items?: string[]; danger?: boolean }) {
  if (!items?.length) return null;
  return (
    <ul className={`text-xs space-y-0.5 pl-4 list-disc ${danger ? "text-red-700 dark:text-red-400 marker:text-red-500" : "text-muted-foreground"}`}>
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  );
}

function OutputSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function AgentOutputView({ type, output }: { type: AgentType; output: any }) {
  if (!output || typeof output !== "object") return null;
  const known = KNOWN_OUTPUT_KEYS[type];
  const sections: { label: string; node: ReactNode }[] = [];

  const pushList = (label: string, items?: string[], danger?: boolean) => {
    if (Array.isArray(items) && items.length > 0) sections.push({ label, node: <BulletList items={items} danger={danger} /> });
  };
  const pushText = (label: string, text?: string) => {
    if (text) sections.push({ label, node: <p className="text-xs text-muted-foreground">{text}</p> });
  };

  if (type === "party_a" || type === "party_b") {
    pushList("Pozisyonlar", output.pozisyonlar);
    pushList("Çıkarlar", output.cikarlar);
    pushList("Öncelikler", output.oncelikler);
    pushList("Kırmızı Çizgiler", output.kirmizi_cizgiler, true);
    if (output.muzakere_esnekligi) {
      sections.push({ label: "Müzakere Esnekliği", node: <Badge variant="outline" className="text-[10px]">{output.muzakere_esnekligi}</Badge> });
    }
    pushText("Özet", output.ozet);
  } else if (type === "mediator") {
    pushList("Ortak Zemin", output.ortak_zemin);
    pushList("Çatışmalar", output.catismalar);
    if (Array.isArray(output.senaryolar) && output.senaryolar.length > 0) {
      sections.push({
        label: "Senaryolar",
        node: (
          <div className="space-y-1.5">
            {output.senaryolar.map((sc: Senaryo, i: number) => (
              <div key={i} className="border rounded p-2 bg-muted/30">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">{sc.baslik || sc.tip || `Senaryo ${i + 1}`}</span>
                  {sc.tahmini_sure && <Badge variant="outline" className="text-[10px]">{sc.tahmini_sure}</Badge>}
                </div>
                {sc.aciklama && <p className="text-xs text-muted-foreground mt-0.5">{sc.aciklama}</p>}
                {Array.isArray(sc.adimlar) && sc.adimlar.length > 0 && (
                  <ol className="text-xs text-muted-foreground pl-4 list-decimal mt-1 space-y-0.5">
                    {sc.adimlar.map((a, j) => <li key={j}>{a}</li>)}
                  </ol>
                )}
              </div>
            ))}
          </div>
        ),
      });
    }
  } else if (type === "validator") {
    if (Array.isArray(output.dogrulanmis_senaryolar) && output.dogrulanmis_senaryolar.length > 0) {
      sections.push({
        label: "Doğrulanmış Senaryolar",
        node: (
          <div className="space-y-1.5">
            {output.dogrulanmis_senaryolar.map((sc: DogrulanmisSenaryo, i: number) => (
              <div key={i} className="border rounded p-2 bg-muted/30">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-medium flex items-center gap-1">
                    {sc.onay ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <AlertTriangle className="h-3 w-3 text-red-600" />}
                    {sc.tip || `Senaryo ${i + 1}`}
                  </span>
                  {sc.risk_seviyesi && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${riskSeviyesiTone(sc.risk_seviyesi)}`}>{sc.risk_seviyesi}</span>
                  )}
                </div>
                {sc.hukuki_dayanak && <p className="text-xs text-muted-foreground mt-0.5">{sc.hukuki_dayanak}</p>}
                {Array.isArray(sc.emsal_referanslar) && sc.emsal_referanslar.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {sc.emsal_referanslar.map((r, j) => (
                      <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-background border text-muted-foreground">{r}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ),
      });
    }
    if (Array.isArray(output.elenen_senaryolar) && output.elenen_senaryolar.length > 0) {
      sections.push({
        label: "Elenen Senaryolar",
        node: (
          <ul className="text-xs text-muted-foreground space-y-0.5 pl-4 list-disc">
            {output.elenen_senaryolar.map((e: ElenenSenaryo, i: number) => (
              <li key={i}><span className="font-medium">{e.tip}</span>{e.neden ? ` — ${e.neden}` : ""}</li>
            ))}
          </ul>
        ),
      });
    }
    pushText("Genel Değerlendirme", output.genel_degerlendirme);
  }

  if (typeof output.confidence === "number") {
    sections.push({
      label: "Güven (JSON)",
      node: (
        <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${confidenceTone(output.confidence)}`}>
          %{Math.round(output.confidence * 100)}
        </span>
      ),
    });
  }

  const extraKeys = Object.keys(output).filter(
    (k) => !known.includes(k) && output[k] != null && output[k] !== "" && !(Array.isArray(output[k]) && output[k].length === 0),
  );

  return (
    <div className="space-y-2.5">
      {sections.map((s, i) => <OutputSection key={i} label={s.label}>{s.node}</OutputSection>)}
      {extraKeys.length > 0 && (
        <div className="space-y-1 pt-1 border-t">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Diğer</div>
          <div className="text-[11px] text-muted-foreground space-y-0.5">
            {extraKeys.map((k) => (
              <div key={k}>
                <span className="font-medium">{k}:</span>{" "}
                {Array.isArray(output[k]) ? output[k].join(", ") : typeof output[k] === "object" ? JSON.stringify(output[k]) : String(output[k])}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
            <div className="max-h-64 overflow-auto pr-1">
              <AgentOutputView type={type} output={s.last_output} />
            </div>
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
