import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FileSignature, Loader2 } from "lucide-react";

const TYPES = [
  { key: "tutanak", label: "Arabuluculuk Tutanağı" },
  { key: "anlasma", label: "Arabuluculuk Anlaşması" },
  { key: "mutabakat", label: "Mutabakat Muhtırası" },
  { key: "uzlasma", label: "Uzlaşma Belgesi" },
] as const;

export function AgreementStreaming({ context }: { context: string }) {
  const [docType, setDocType] = useState<(typeof TYPES)[number]["key"]>("tutanak");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setText("");
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mediation-ai`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ action: "generate_agreement", docType, context }),
      });
      if (!resp.body) throw new Error("no body");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content ?? "";
            if (delta) setText((t) => t + delta);
          } catch { /* ignore */ }
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={docType} onChange={(e) => setDocType(e.target.value as any)}>
          {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <Button onClick={generate} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileSignature className="h-4 w-4 mr-1" />}
          Belgeyi Oluştur
        </Button>
      </div>
      {text && (
        <div className="rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-wrap font-mono leading-relaxed max-h-[60vh] overflow-auto">
          {text}
        </div>
      )}
    </Card>
  );
}
