import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AiAssistantChatProps {
  caseContext: string;
  niche?: string;
  placeholder?: string;
  starter?: string;
}

export function AiAssistantChat({ caseContext, niche, placeholder, starter }: AiAssistantChatProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>(
    starter
      ? [{ role: "assistant", content: starter }]
      : [
          {
            role: "assistant",
            content:
              language === "tr"
                ? "Merhaba, ben MediPact AI. Bu başvuruya özel Yargıtay kararları, müzakere stratejisi veya tarafların pozisyonları hakkında sorularınızı sorabilirsiniz."
                : "Hi, I'm MediPact AI. Ask me about Turkish Court of Cassation precedents, negotiation strategy, or party positions for this case.",
          },
        ],
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      const { data, error } = await supabase.functions.invoke("mediation-ai", {
        body: { action: "chat", messages: next, caseContext, niche },
      });
      if (error) throw error;
      const reply =
        (data as { reply?: string })?.reply ||
        (language === "tr" ? "Yanıt alınamadı." : "No response.");
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: language === "tr" ? "AI Hatası" : "AI Error",
        description: e?.message ?? String(e),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col h-[520px] overflow-hidden">
      <div className="px-4 py-3 border-b bg-gradient-primary text-primary-foreground flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        <span className="font-display font-semibold text-sm">
          {language === "tr" ? "MediPact AI Asistan" : "MediPact AI Assistant"}
        </span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-card border border-border rounded-bl-sm text-foreground"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-strong:text-foreground">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {language === "tr" ? "Düşünüyor..." : "Thinking..."}
          </div>
        )}
      </div>
      <div className="p-3 border-t bg-card flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder || (language === "tr" ? "Bu başvuruyla ilgili soru sorun..." : "Ask about this case...")}
          rows={2}
          className="resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button onClick={send} disabled={busy || !input.trim()} size="icon" className="self-end shrink-0">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </Card>
  );
}
