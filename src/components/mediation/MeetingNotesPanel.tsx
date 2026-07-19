import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Sparkles, Download, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

type SessionLite = { id: string; scheduled_at: string; session_type?: string | null; status?: string | null; participants?: Array<{ user_id?: string | null }> | null };
type Analysis = {
  yeni_tespitler?: string[];
  degisen_pozisyonlar?: string[];
  guncellenmis_oneriler?: string[];
  yeni_strateji?: string;
};
type NoteRow = {
  id: string;
  created_at: string;
  content: string;
  parsed?: { note?: string; session_id?: string | null; ai?: Analysis };
};

export function MeetingNotesPanel({ caseId, caseSummary }: { caseId: string; caseSummary?: string }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionLite[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [assignedMediatorId, setAssignedMediatorId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>("none");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [sRes, nRes, cRes] = await Promise.all([
      supabase.from("case_sessions").select("id,scheduled_at,session_type,status,participants").eq("case_id", caseId).order("scheduled_at", { ascending: false }),
      supabase.from("case_notes").select("id,created_at,content").eq("case_id", caseId).eq("phase", 7).order("created_at", { ascending: false }),
      supabase.from("cases").select("assigned_mediator_id").eq("id", caseId).maybeSingle(),
    ]);
    setSessions((sRes.data as any) ?? []);
    setAssignedMediatorId((cRes.data as any)?.assigned_mediator_id ?? null);
    const parsed = ((nRes.data as any[]) ?? []).map((r) => {
      let p: NoteRow["parsed"] = undefined;
      try { p = JSON.parse(r.content); } catch { p = { note: r.content }; }
      return { ...r, parsed: p } as NoteRow;
    });
    setNotes(parsed);
  }, [caseId]);

  // Per-case mediator check, same pattern as CaseRoom.tsx:73 (not the global role flag).
  const isMediator = !!(user && assignedMediatorId && user.id === assignedMediatorId);

  // Notes from a "private" session are visible only to that session's participants + mediator.
  const visibleNotes = useMemo(() => {
    return notes.filter((n) => {
      const sid = n.parsed?.session_id;
      if (!sid) return true;
      const session = sessions.find((s) => s.id === sid);
      if (!session || session.session_type !== "private") return true;
      if (isMediator) return true;
      return (session.participants ?? []).some((p) => p?.user_id === user?.id);
    });
  }, [notes, sessions, isMediator, user?.id]);

  useEffect(() => { void load(); }, [load]);

  const saveAndAnalyze = async () => {
    if (!note.trim()) return;
    setBusy(true);
    try {
      const priorNotes = visibleNotes.map((n) => n.parsed?.note ?? "").filter(Boolean);
      const priorAnalyses = visibleNotes.map((n) => n.parsed?.ai).filter(Boolean);

      const { data: aiData, error: aiErr } = await supabase.functions.invoke("analyze-meeting-notes", {
        body: { newNote: note, priorNotes, priorAnalyses, caseSummary: caseSummary ?? "", case_id: caseId },
      });
      if (aiErr) throw aiErr;
      const analysis: Analysis = (aiData as any)?.analysis ?? {};

      const payload = { note, session_id: sessionId === "none" ? null : sessionId, ai: analysis };
      const { data: userData } = await supabase.auth.getUser();
      const { error: noteErr } = await supabase.from("case_notes").insert({
        case_id: caseId, phase: 7, content: JSON.stringify(payload),
        created_by: userData.user?.id ?? null,
      } as any);
      if (noteErr) throw noteErr;

      // Also record as negotiation round (auto round_no)
      const { data: roundData } = await supabase
        .from("negotiation_rounds").select("round_no").eq("case_id", caseId)
        .order("round_no", { ascending: false }).limit(1);
      const nextNo = ((roundData?.[0] as any)?.round_no ?? 0) + 1;
      await supabase.from("negotiation_rounds").insert({
        case_id: caseId, round_no: nextNo, status: "note",
        proposal: payload as any,
      } as any);

      setNote("");
      toast({ title: "Not kaydedildi", description: "AI analizi tamamlandı." });
      await load();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const html = `<html><head><meta charset="utf-8"><title>Görüşme Notları</title>
      <style>body{font-family:system-ui;padding:24px;max-width:780px;margin:auto}
      h1{font-size:20px}h2{font-size:14px;margin-top:20px;border-bottom:1px solid #ddd;padding-bottom:4px}
      .note{background:#f8f9fb;padding:12px;border-radius:8px;white-space:pre-wrap;margin:8px 0}
      ul{margin:4px 0 12px 20px}</style></head><body>
      <h1>Görüşme Notları & AI Analizleri</h1>
      ${visibleNotes.slice().reverse().map((n) => `
        <h2>${format(new Date(n.created_at), "dd MMM yyyy HH:mm", { locale: tr })}</h2>
        <div class="note">${(n.parsed?.note ?? "").replace(/</g, "&lt;")}</div>
        ${n.parsed?.ai ? `
          ${n.parsed.ai.yeni_tespitler?.length ? `<b>🆕 Yeni Tespitler</b><ul>${n.parsed.ai.yeni_tespitler.map((x) => `<li>${x}</li>`).join("")}</ul>` : ""}
          ${n.parsed.ai.degisen_pozisyonlar?.length ? `<b>🔄 Değişen Pozisyonlar</b><ul>${n.parsed.ai.degisen_pozisyonlar.map((x) => `<li>${x}</li>`).join("")}</ul>` : ""}
          ${n.parsed.ai.guncellenmis_oneriler?.length ? `<b>📊 Güncellenmiş Öneriler</b><ul>${n.parsed.ai.guncellenmis_oneriler.map((x) => `<li>${x}</li>`).join("")}</ul>` : ""}
          ${n.parsed.ai.yeni_strateji ? `<b>🎯 Yeni Strateji</b><p>${n.parsed.ai.yeni_strateji}</p>` : ""}
        ` : ""}
      `).join("")}
      </body></html>`;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const sessionOptions = useMemo(() => sessions.map((s) => ({
    id: s.id,
    label: `${format(new Date(s.scheduled_at), "dd MMM yyyy HH:mm", { locale: tr })} · ${s.session_type ?? "toplantı"}`,
  })), [sessions]);

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Yeni Görüşme Notu</h3>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Toplantı</label>
          <Select value={sessionId} onValueChange={setSessionId}>
            <SelectTrigger><SelectValue placeholder="Toplantı seç (opsiyonel)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Belirtilmedi —</SelectItem>
              {sessionOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={6}
          placeholder="Görüşmede neler konuşuldu? Tarafların tutumları, yeni bilgiler, önemli noktalar..."
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">AI, önceki notları ve analizleri de dikkate alır.</p>
          <Button onClick={saveAndAnalyze} disabled={busy || !note.trim()}>
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Notu Kaydet ve Analiz Et
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Geçmiş Notlar & AI Analizleri</h3>
          {visibleNotes.length > 0 && (
            <Button variant="outline" size="sm" onClick={downloadPdf}>
              <Download className="h-3 w-3 mr-1" /> PDF
            </Button>
          )}
        </div>
        {visibleNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz görüşme notu eklenmemiş.</p>
        ) : (
          <Accordion type="multiple" className="w-full">
            {visibleNotes.map((n) => {
              const ai = n.parsed?.ai;
              return (
                <AccordionItem key={n.id} value={n.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2 text-left">
                      <Badge variant="outline" className="text-[10px]">
                        {format(new Date(n.created_at), "dd MMM yyyy HH:mm", { locale: tr })}
                      </Badge>
                      <span className="text-sm truncate max-w-md">
                        {(n.parsed?.note ?? "").slice(0, 80) || "(not yok)"}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="bg-muted/40 rounded p-3 text-sm whitespace-pre-wrap">
                      {n.parsed?.note}
                    </div>
                    {ai && (
                      <div className="space-y-2">
                        {ai.yeni_tespitler?.length ? (
                          <div><b className="text-sm">🆕 Yeni Tespitler</b>
                            <ul className="list-disc ml-5 text-sm">{ai.yeni_tespitler.map((x, i) => <li key={i}>{x}</li>)}</ul>
                          </div>
                        ) : null}
                        {ai.degisen_pozisyonlar?.length ? (
                          <div><b className="text-sm">🔄 Değişen Pozisyonlar</b>
                            <ul className="list-disc ml-5 text-sm">{ai.degisen_pozisyonlar.map((x, i) => <li key={i}>{x}</li>)}</ul>
                          </div>
                        ) : null}
                        {ai.guncellenmis_oneriler?.length ? (
                          <div><b className="text-sm">📊 Güncellenmiş Öneriler</b>
                            <ul className="list-disc ml-5 text-sm">{ai.guncellenmis_oneriler.map((x, i) => <li key={i}>{x}</li>)}</ul>
                          </div>
                        ) : null}
                        {ai.yeni_strateji ? (
                          <div><b className="text-sm">🎯 Yeni Strateji</b>
                            <p className="text-sm mt-1">{ai.yeni_strateji}</p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </Card>
    </div>
  );
}
