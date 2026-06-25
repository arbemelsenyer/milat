import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Plus, Sparkles, Loader2, Users, Clock, Circle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const TYPES = [
  { key: "preliminary", label: "Ön Görüşme" },
  { key: "main", label: "Ana Görüşme" },
  { key: "private", label: "Özel Görüşme" },
] as const;

const QUICK_HOURS = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

type Suggestion = {
  sessionType: string;
  suggestedDateOffsetDays: number;
  durationMinutes: number;
  agenda: string[];
  preparationNotes: string[];
  rationale: string;
};

interface PartyLite {
  id: string;
  user_id: string | null;
  party_role: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  email?: string | null;
}

interface Props {
  caseId: string;
  niche?: string;
  context?: string;
  parties?: PartyLite[];
  mediatorId?: string | null;
}

export function SessionScheduler({ caseId, niche, context, parties = [], mediatorId }: Props) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [type, setType] = useState<(typeof TYPES)[number]["key"]>("preliminary");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const partyLabel = (p: PartyLite) =>
    `Taraf ${p.party_role ?? "?"} · ${
      p.company_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email || "—"
    }`;

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

  // default: invite everyone
  useEffect(() => {
    if (parties.length && selectedPartyIds.length === 0) {
      setSelectedPartyIds(parties.filter((p) => p.user_id).map((p) => p.id));
    }
  }, [parties]);

  // Realtime presence — shows who is currently in the case-room
  useEffect(() => {
    if (!caseId || !user) return;
    const ch = supabase.channel(`presence:case:${caseId}`, {
      config: { presence: { key: user.id } },
    });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, any[]>;
      setOnlineUserIds(new Set(Object.keys(state)));
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ online_at: new Date().toISOString() });
      }
    });
    return () => {
      supabase.removeChannel(ch);
    };
  }, [caseId, user?.id]);

  const composedDateTime = useMemo(() => {
    if (!date) return "";
    return `${date}T${time || "10:00"}`;
  }, [date, time]);

  // ---- Conflict detection ----
  const DURATION_MIN = 60;
  const selectedUserIds = useMemo(
    () => parties.filter((p) => selectedPartyIds.includes(p.id) && p.user_id).map((p) => p.user_id as string),
    [parties, selectedPartyIds]
  );

  type Conflict = { sessionId: string; userId: string; when: string };
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);

  // load all sessions touching selected participants (across cases) for conflict checks
  useEffect(() => {
    if (selectedUserIds.length === 0) {
      setAllSessions([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("case_sessions")
        .select("id, scheduled_at, participants, case_id")
        .neq("status", "cancelled");
      const rows = (data ?? []) as any[];
      const overlapping = rows.filter((s) => {
        const pids: string[] = ((s.participants ?? []) as any[])
          .map((p) => p.user_id)
          .filter(Boolean);
        return pids.some((u) => selectedUserIds.includes(u));
      });
      setAllSessions(overlapping);
    })();
  }, [selectedUserIds.join(",")]);

  const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
    aStart < bEnd && bStart < aEnd;

  const findConflictsFor = (startISO: string): Conflict[] => {
    const start = new Date(startISO);
    const end = new Date(start.getTime() + DURATION_MIN * 60_000);
    const out: Conflict[] = [];
    allSessions.forEach((s) => {
      if (!s.scheduled_at) return;
      const sStart = new Date(s.scheduled_at);
      const sEnd = new Date(sStart.getTime() + DURATION_MIN * 60_000);
      if (!overlaps(start, end, sStart, sEnd)) return;
      const pids: string[] = ((s.participants ?? []) as any[])
        .map((p) => p.user_id)
        .filter(Boolean);
      pids.forEach((u) => {
        if (selectedUserIds.includes(u)) {
          out.push({ sessionId: s.id, userId: u, when: s.scheduled_at });
        }
      });
    });
    return out;
  };

  // recompute conflicts whenever date/time/participants change
  useEffect(() => {
    if (!composedDateTime || selectedUserIds.length === 0) {
      setConflicts([]);
      setAlternatives([]);
      return;
    }
    const startISO = new Date(composedDateTime).toISOString();
    const found = findConflictsFor(startISO);
    setConflicts(found);
    if (found.length > 0) {
      // propose next 3 free slots in QUICK_HOURS over the next 5 days
      const proposals: string[] = [];
      const base = new Date(`${date}T00:00:00`);
      for (let d = 0; d < 7 && proposals.length < 3; d++) {
        const day = new Date(base);
        day.setDate(base.getDate() + d);
        const ymd = day.toISOString().slice(0, 10);
        for (const h of QUICK_HOURS) {
          const iso = new Date(`${ymd}T${h}`).toISOString();
          if (findConflictsFor(iso).length === 0) {
            proposals.push(`${ymd}T${h}`);
            if (proposals.length >= 3) break;
          }
        }
      }
      setAlternatives(proposals);
    } else {
      setAlternatives([]);
    }
  }, [composedDateTime, selectedUserIds.join(","), allSessions.length]);

  const applyAlternative = (iso: string) => {
    const [d, t] = iso.split("T");
    setDate(d);
    setTime(t.slice(0, 5));
  };

  const userLabel = (uid: string) => {
    const p = parties.find((x) => x.user_id === uid);
    if (!p) return uid.slice(0, 8);
    return `Taraf ${p.party_role ?? "?"}`;
  };

  const add = async () => {
    if (!composedDateTime) return;
    if (conflicts.length > 0) {
      toast({
        title: "Çakışma var",
        description: "Önce çakışmayı çözün veya alternatif zaman seçin.",
        variant: "destructive",
      });
      return;
    }
    const participants = parties
      .filter((p) => selectedPartyIds.includes(p.id))
      .map((p) => ({ party_id: p.id, user_id: p.user_id, role: p.party_role }));
    const { data: inserted, error } = await supabase.from("case_sessions").insert({
      case_id: caseId,
      session_type: type,
      scheduled_at: new Date(composedDateTime).toISOString(),
      notes,
      status: "scheduled",
      participants,
    } as any).select().maybeSingle();
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
      return;
    }
    const when = new Date(composedDateTime).toLocaleString("tr-TR");
    const title = "Yeni Toplantı Daveti";
    const msg = `${TYPES.find((t) => t.key === type)?.label ?? type} — ${when}`;
    const recipients = parties
      .filter((p) => selectedPartyIds.includes(p.id) && p.user_id)
      .map((p) => p.user_id as string);
    await Promise.all(
      recipients.map((uid) =>
        supabase.rpc("create_notification", {
          p_user_id: uid,
          p_title: title,
          p_message: msg,
          p_type: "info",
          p_link: `/case-room/${caseId}`,
        })
      )
    );
    setDate("");
    setNotes("");
    toast({ title: "Seans planlandı", description: `${recipients.length} katılımcıya davet gönderildi` });
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
      if (s.sessionType && TYPES.some((t) => t.key === s.sessionType)) {
        setType(s.sessionType as any);
      }
      const d = new Date();
      d.setDate(d.getDate() + (s.suggestedDateOffsetDays ?? 7));
      const pad = (n: number) => String(n).padStart(2, "0");
      setDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      setTime("10:00");
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

  const toggleParty = (id: string) => {
    setSelectedPartyIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  };

  const presenceList: Array<{ key: string; label: string; online: boolean }> = [];
  if (mediatorId) {
    presenceList.push({
      key: mediatorId,
      label: "Arabulucu",
      online: onlineUserIds.has(mediatorId),
    });
  }
  parties.forEach((p) => {
    if (p.user_id) {
      presenceList.push({
        key: p.user_id,
        label: `Taraf ${p.party_role ?? "?"}`,
        online: onlineUserIds.has(p.user_id),
      });
    }
  });

  return (
    <div className="space-y-4">
      {presenceList.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Şu an çevrim içi olanlar</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {presenceList.map((p) => (
              <Badge key={p.key} variant={p.online ? "default" : "outline"} className="gap-1">
                <Circle
                  className={`h-2 w-2 ${p.online ? "fill-green-500 text-green-500" : "fill-muted-foreground/40 text-muted-foreground/40"}`}
                />
                {p.label} {p.online ? "" : "(çevrim dışı)"}
              </Badge>
            ))}
          </div>
        </Card>
      )}

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
            <Label className="text-xs">Tarih</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" /> Saat
            </Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">Hızlı seç:</span>
          {QUICK_HOURS.map((h) => (
            <Button
              key={h}
              type="button"
              size="sm"
              variant={time === h ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setTime(h)}
            >
              {h}
            </Button>
          ))}
        </div>

        {parties.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Users className="h-3 w-3" /> Katılımcı Davet Et
            </Label>
            <div className="flex flex-col gap-2">
              {parties.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={selectedPartyIds.includes(p.id)}
                    onCheckedChange={() => toggleParty(p.id)}
                    disabled={!p.user_id}
                  />
                  <span>{partyLabel(p)}</span>
                  {!p.user_id && (
                    <span className="text-xs text-muted-foreground">(davet bekliyor)</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label className="text-xs">Notlar</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Hazırlık notları / gündem"
          />
        </div>

        {conflicts.length > 0 && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm space-y-2">
            <div className="font-medium text-destructive">Çakışma tespit edildi</div>
            <ul className="text-xs space-y-1">
              {Array.from(new Set(conflicts.map((c) => c.userId))).map((uid) => (
                <li key={uid}>
                  • {userLabel(uid)} bu saatte başka bir toplantıda.
                </li>
              ))}
            </ul>
            {alternatives.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mt-2 mb-1">Önerilen alternatifler:</div>
                <div className="flex flex-wrap gap-2">
                  {alternatives.map((iso) => (
                    <Button
                      key={iso}
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => applyAlternative(iso)}
                    >
                      {new Date(iso).toLocaleString("tr-TR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Button onClick={add} disabled={!date || conflicts.length > 0} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Planla ve Davet Gönder
        </Button>
      </Card>

      <div className="space-y-2">
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">Henüz planlanmış seans yok.</p>
        ) : (
          sessions.map((s) => {
            const participants = (s.participants ?? []) as any[];
            return (
              <Card key={s.id} className="p-4 flex items-start gap-3">
                <Calendar className="h-4 w-4 text-primary mt-1" />
                <div className="flex-1">
                  <div className="font-medium">
                    {TYPES.find((t) => t.key === s.session_type)?.label ?? s.session_type}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.scheduled_at ? new Date(s.scheduled_at).toLocaleString("tr-TR") : "-"}
                  </div>
                  {participants.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {participants.map((pp: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          Taraf {pp.role ?? "?"}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {s.notes && <div className="text-xs mt-1 whitespace-pre-wrap">{s.notes}</div>}
                </div>
                <span className="text-xs text-muted-foreground">{s.status}</span>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
