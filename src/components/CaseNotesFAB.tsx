import { useEffect, useState } from "react";
import { StickyNote, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";

interface Note {
  id: string;
  phase: number;
  content: string;
  created_at: string;
  created_by: string;
}

const PHASE_LABELS: Record<number, string> = {
  1: "Başvuru", 2: "Taraflar", 3: "Taraf Analizi", 4: "Arabulucu Paneli",
  5: "Toplantı", 6: "Bilirkişi", 7: "Görüşme Notları", 8: "Belgeler & Kapanış",
};

interface Props {
  caseId: string;
  defaultPhase?: number;
}

/**
 * Floating notes button for mediators. Only renders when the current user is
 * the assigned mediator (RLS also enforces this). Non-mediators see nothing.
 */
export function CaseNotesFAB({ caseId, defaultPhase = 1 }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<number>(defaultPhase);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !caseId) return;
    (async () => {
      const { data } = await supabase
        .from("cases")
        .select("assigned_mediator_id")
        .eq("id", caseId)
        .maybeSingle();
      setAllowed(data?.assigned_mediator_id === user.id);
    })();
  }, [caseId, user]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("case_notes")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Notlar yüklenemedi", description: error.message, variant: "destructive" });
    setNotes((data as Note[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (open && allowed) void load();
  }, [open, allowed]);

  const addNote = async () => {
    if (!content.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from("case_notes").insert({
      case_id: caseId,
      phase,
      content: content.trim(),
      created_by: user.id,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Kaydedilemedi", description: error.message, variant: "destructive" });
      return;
    }
    setContent("");
    toast({ title: "Not eklendi" });
    void load();
  };

  const removeNote = async (id: string) => {
    const { error } = await supabase.from("case_notes").delete().eq("id", id);
    if (error) return toast({ title: "Silinemedi", description: error.message, variant: "destructive" });
    setNotes((p) => p.filter((n) => n.id !== id));
  };

  if (!allowed) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 z-40 shadow-elegant rounded-full h-14 w-14 p-0"
          aria-label="Not Ekle"
        >
          <StickyNote className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>📝 Arabulucu Notları</SheetTitle>
        </SheetHeader>

        <div className="space-y-3 mt-4 border-b pb-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Aşama</label>
            <Select value={String(phase)} onValueChange={(v) => setPhase(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PHASE_LABELS).map(([id, label]) => (
                  <SelectItem key={id} value={id}>Aşama {id}: {label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Bu aşamaya ait notunuz…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
          />
          <Button onClick={addNote} disabled={saving || !content.trim()} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Not Ekle
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          <h4 className="text-sm font-semibold">Önceki Notlar</h4>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz not yok.</p>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="border rounded-md p-3 bg-card">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Aşama {n.phase}: {PHASE_LABELS[n.phase] ?? "?"}</span>
                  <div className="flex items-center gap-2">
                    <span>{format(new Date(n.created_at), "dd.MM.yyyy HH:mm")}</span>
                    {n.created_by === user?.id && (
                      <button onClick={() => removeNote(n.id)} className="text-destructive hover:opacity-70" aria-label="Sil">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{n.content}</p>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
