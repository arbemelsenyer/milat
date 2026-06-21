import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

interface Props {
  questions: string[];
  onComplete: (answers: { question: string; answer: string }[]) => void;
}

export function DiscoveryInterview({ questions, onComplete }: Props) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ""));
  const [draft, setDraft] = useState("");

  if (!questions.length) return <p className="text-muted-foreground">Soru üretiliyor...</p>;

  const next = () => {
    const updated = [...answers];
    updated[idx] = draft;
    setAnswers(updated);
    setDraft("");
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
    } else {
      onComplete(questions.map((q, i) => ({ question: q, answer: updated[i] })));
    }
  };

  const q = questions[idx];

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" /> Mülakat {idx + 1} / {questions.length}
      </div>
      <h3 className="text-lg font-medium leading-relaxed">{q}</h3>
      <Textarea
        rows={5}
        placeholder="Cevabınızı yazın..."
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="flex justify-end">
        <Button onClick={next} disabled={!draft.trim()}>
          {idx + 1 < questions.length ? "Sonraki Soru" : "Mülakatı Tamamla"} <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </Card>
  );
}
