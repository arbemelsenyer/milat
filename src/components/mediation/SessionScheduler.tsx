import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Plus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const TYPES = [
  { key: "preliminary", label: "Ön Görüşme" },
  { key: "main", label: "Ana Görüşme" },
  { key: "private", label: "Özel Görüşme" },
] as const;

export function SessionScheduler({ caseId }: { caseId: string }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [type, setType] = useState<(typeof TYPES)[number]["key"]>("preliminary");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    const { data } = await supabase.from("case_sessions").select("*").eq("case_id", caseId).order("scheduled_at");
    setSessions(data ?? []);
  };
  useEffect(() => { if (caseId) load(); }, [caseId]);

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

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold">Yeni Seans Planla</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Tür</Label>
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={type} onChange={(e) => setType(e.target.value as any)}>
              {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Tarih & Saat</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Notlar</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Hazırlık notları" />
          </div>
        </div>
        <Button onClick={add} disabled={!scheduledAt} size="sm"><Plus className="h-4 w-4 mr-1" /> Ekle</Button>
      </Card>

      <div className="space-y-2">
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">Henüz planlanmış seans yok.</p>
        ) : (
          sessions.map((s) => (
            <Card key={s.id} className="p-4 flex items-center gap-3">
              <Calendar className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <div className="font-medium">{TYPES.find((t) => t.key === s.session_type)?.label ?? s.session_type}</div>
                <div className="text-xs text-muted-foreground">{s.scheduled_at ? new Date(s.scheduled_at).toLocaleString("tr-TR") : "-"}</div>
                {s.notes && <div className="text-xs mt-1">{s.notes}</div>}
              </div>
              <span className="text-xs text-muted-foreground">{s.status}</span>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
