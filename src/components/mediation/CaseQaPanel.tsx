import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Loader2, AlertTriangle, HelpCircle } from "lucide-react";

interface Props {
  caseRow: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type QaSource = { tablo?: string; kayit_id?: string; alinti?: string };
type QaTurn = {
  question: string;
  answer: string;
  sources: QaSource[];
  insufficient: boolean;
};

// case-qa edge function'ın sources dizisinde döndürdüğü tablo adlarını arabulucunun
// okuyabileceği etikete çevirir. Listede olmayan bir slug gelirse olduğu gibi gösterilir.
const TABLE_LABELS: Record<string, string> = {
  cases: "Dosya künyesi",
  case_parties: "Taraf beyanı",
  case_documents: "Belge",
  party_analyses: "Taraf analizi",
  common_ground_reports: "Ortak Zemin Raporu",
  case_discovery_questions: "Keşif soruları",
  agent_worklog: "Ajan defteri",
  case_notes: "Görüşme notları",
};

function tableLabel(slug?: string): string {
  const key = String(slug ?? "").trim();
  return TABLE_LABELS[key] ?? (key || "Kaynak");
}

export function CaseQaPanel({ caseRow, open, onOpenChange }: Props) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<QaTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Geçmiş yalnızca oturumluk: panel kapanınca sıfırlanır (kalıcılaştırma yok).
  useEffect(() => {
    if (!open) {
      setTurns([]);
      setQuestion("");
    }
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns.length, busy]);

  const ask = async () => {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("case-qa", {
        body: { case_id: caseRow.id, question: q },
      });
      // Edge function 4xx/5xx döndürdüğünde mesaj gövdede gelir; ikisini de yakala.
      const payload = data as any;
      const errMsg = payload?.error ?? (error ? error.message : null);
      if (errMsg) {
        toast({ title: "Soru cevaplanamadı", description: String(errMsg), variant: "destructive" });
        return;
      }
      setTurns((prev) => [
        ...prev,
        {
          question: q,
          answer: String(payload?.answer ?? ""),
          sources: Array.isArray(payload?.sources) ? payload.sources : [],
          insufficient: !!payload?.insufficient,
        },
      ]);
      setQuestion("");
    } catch (e: any) {
      toast({
        title: "Soru cevaplanamadı",
        description: String(e?.message ?? e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="heading-gold-underline">Dosyaya Soru Sor</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Sorular yalnız bu dosyanın kayıtlarından cevaplanır; her cevap kaynağını gösterir.
        </p>

        <div className="flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
            placeholder="Örn: Karşı tarafın beyanında kıdem tazminatına ilişkin ne yazıyor?"
            disabled={busy}
          />
          <Button onClick={ask} disabled={busy || !question.trim()}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Soruluyor…</> : "Sor"}
          </Button>
        </div>

        <div className="space-y-4 mt-2">
          {turns.length === 0 && !busy && (
            <div className="text-sm text-muted-foreground flex items-center gap-2 py-6 justify-center">
              <HelpCircle className="h-4 w-4" /> Henüz soru sorulmadı.
            </div>
          )}

          {turns.map((t, i) => (
            <div key={i} className="space-y-2">
              <div className="text-sm font-medium">{t.question}</div>
              <div
                className={`rounded-lg border p-3 text-sm ${
                  t.insufficient
                    ? "border-amber-400/40 bg-amber-50/40 dark:bg-amber-950/20"
                    : "bg-muted/40"
                }`}
              >
                {t.insufficient ? (
                  <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{t.answer || "Bu dosyanın kayıtlarında bu sorunun cevabı yok."}</span>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{t.answer}</div>
                )}

                {t.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Kaynaklar</div>
                    {t.sources.map((s, j) => (
                      <div key={j} className="text-xs">
                        <span className="font-medium">{tableLabel(s.tablo)}</span>
                        {s.alinti && (
                          <span className="italic text-muted-foreground"> — “{s.alinti}”</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Dosya kayıtları taranıyor…
            </div>
          )}
          <div ref={endRef} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
