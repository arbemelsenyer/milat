import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Plus, Sparkles, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const TYPES = [
  { key: "preliminary", label: "Ön Görüşme" },
  { key: "main", label: "Ana Görüşme" },
  { key: "private", label: "Özel Görüşme" },
] as const;

type Suggestion = {
  sessionType: string;
  suggestedDateOffsetDays: number;
  durationMinutes: number;
  agenda: string[];
  preparationNotes: string[];
  rationale: string;
};

interface Props {
  caseId: string;
  niche?: string;
  context?: string;
}

export function SessionScheduler({ caseId, niche, context }: Props) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [type, setType] = useState<(typeof TYPES)[number]["key"]>("preliminary");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("case_sessions")
      .select("*")
      .eq("case_id", caseId)
      .order("scheduled_at");
    setSessions(data ?? []);
  };
  useEffect(() => {
    if (caseId) load();
  }, [caseId]);

  const add = async () => {
    if (!scheduledAt) return;
    const { error } = await supabase.from("case_sessions").insert({
      case_id: caseId,
      session_type: type,
      scheduled_at: new Date(scheduledAt).toISOString(),
      notes,
      status: "scheduled",
    });
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
      return;
    }
    setScheduledAt("");
    setNotes("");
    toast({ title: "Seans eklendi" });
    load();
  };

  const requestAiSuggestion = async () => {
    setSuggesting(true);
    setSuggestion(null);
    try {
      const prior = sessions
        .map(
          (s) =>
            `${s.session_type} • ${
              s.scheduled_at ? new Date(s.scheduled_at).toLocaleString("tr-TR") : "?"
            } • ${s.status}${s.notes ? " — " + s.notes : ""}`,
        )
        .join("\n");
      const { data, error } = await supabase.functions.invoke("mediation-ai", {
        body: {
          action: "session_suggest",
          niche: niche ?? "",
          context: context ?? "",
          priorSessions: prior,
        },
      });
      if (error) throw error;
      const s = data as Suggestion;
      setSuggestion(s);
      // Pre-fill form
      if (s.sessionType && TYPES.some((t) => t.key === s.sessionType)) {
        setType(s.sessionType as any);
      }
      const d = new Date();
      d.setDate(d.getDate() + (s.suggestedDateOffsetDays ?? 7));
      d.setHours(10, 0, 0, 0);
      // datetime-local needs YYYY-MM-DDTHH:mm in local tz
      const pad = (n: number) => String(n).padStart(2, "0");
      setScheduledAt(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );
      setNotes(
        `Gündem: ${(s.agenda ?? []).join(" | ")}\nHazırlık: ${(s.preparationNotes ?? []).join(" | ")}`,
      );
      toast({ title: "AI önerisi hazır", description: "Form otomatik dolduruldu." });
    } catch (e: any) {
      toast({ title: "AI önerisi alınamadı", description: e.message, variant: "destructive" });
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Yeni Seans Planla</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={requestAiSuggestion}
            disabled={suggesting}
          >
            {suggesting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1 text-primary" />
            )}
            AI Önerisi
          </Button>
        </div>
        {suggestion && (
          <div className="rounded-md border bg-primary/[0.04] p-3 text-sm space-y-2">
            <div className="text-xs text-muted-foreground">{suggestion.rationale}</div>
            <div>
              <span className="font-medium">Gündem: </span>
              {(suggestion.agenda ?? []).join(" • ")}
            </div>
            <div className="text-muted-foreground">
              Süre: {suggestion.durationMinutes} dk
            </div>
          </div>
        )}
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Tür</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
            >
              {TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Tarih & Saat</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Notlar</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Hazırlık notları"
            />
          </div>
        </div>
        <Button onClick={add} disabled={!scheduledAt} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Ekle
        </Button>
      </Card>

      <div className="space-y-2">
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">Henüz planlanmış seans yok.</p>
        ) : (
          sessions.map((s) => (
            <Card key={s.id} className="p-4 flex items-center gap-3">
              <Calendar className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <div className="font-medium">
                  {TYPES.find((t) => t.key === s.session_type)?.label ?? s.session_type}
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.scheduled_at ? new Date(s.scheduled_at).toLocaleString("tr-TR") : "-"}
                </div>
                {s.notes && <div className="text-xs mt-1 whitespace-pre-wrap">{s.notes}</div>}
              </div>
              <span className="text-xs text-muted-foreground">{s.status}</span>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
