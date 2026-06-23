import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { tr, enUS } from "date-fns/locale";
import {
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  FileText,
  Users,
  Calendar,
  StickyNote,
  Briefcase,
  TrendingUp,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AppNavbar } from "@/components/AppNavbar";
import { StatCard } from "@/components/StatCard";
import { AiAssistantChat } from "@/components/AiAssistantChat";

import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CaseRow {
  id: string;
  status: string;
  title: string | null;
  category: string | null;
  dispute_type: string | null;
  your_name: string | null;
  other_party_name: string | null;
  ai_summary: any;
  additional_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  case_id: string;
  sender_id: string;
  sender_role: string | null;
  content: string;
  created_at: string;
}

interface PartyRow {
  id: string;
  full_name: string | null;
  organization: string | null;
  role: string | null;
  party_type: string;
}

interface DocRow {
  id: string;
  file_name: string;
  mime_type: string | null;
  created_at: string;
  analysis_result: any;
}

export default function MediatorDashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isMediator } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const locale = language === "tr" ? tr : enUS;

  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [parties, setParties] = useState<PartyRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionNote, setSessionNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate("/auth");
      else if (!isMediator) navigate("/dashboard");
    }
  }, [authLoading, user, isMediator, navigate]);

  useEffect(() => {
    if (user && isMediator) void fetchCases();
  }, [user, isMediator]);

  useEffect(() => {
    if (!selectedId) return;
    void fetchCaseExtras(selectedId);
    const ch = supabase
      .channel(`m-case-${selectedId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `case_id=eq.${selectedId}` },
        (p) => setMessages((m) => [...m, p.new as Message]),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [selectedId]);

  const fetchCases = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cases")
      .select("id,status,title,category,dispute_type,your_name,other_party_name,ai_summary,additional_notes,created_at,updated_at")
      .order("created_at", { ascending: false });
    const rows = (data as unknown as CaseRow[]) ?? [];
    setCases(rows);
    if (rows.length && !selectedId) setSelectedId(rows[0].id);
    setLoading(false);
  };

  const fetchCaseExtras = async (cid: string) => {
    const [mRes, pRes, dRes] = await Promise.all([
      supabase.from("messages").select("*").eq("case_id", cid).order("created_at", { ascending: true }),
      supabase.from("case_parties").select("id,full_name,organization,role,party_type").eq("case_id", cid),
      supabase.from("case_documents").select("id,file_name,mime_type,created_at,analysis_result").eq("case_id", cid).order("created_at", { ascending: false }),
    ]);
    setMessages((mRes.data as Message[]) ?? []);
    setParties((pRes.data as unknown as PartyRow[]) ?? []);
    setDocs((dRes.data as unknown as DocRow[]) ?? []);
    const cur = cases.find((c) => c.id === cid);
    setSessionNote(cur?.additional_notes ?? "");
  };

  const send = async () => {
    if (!newMessage.trim() || !selectedId || !user) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      case_id: selectedId,
      sender_id: user.id,
      sender_role: "mediator",
      content: newMessage.trim(),
    });
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else setNewMessage("");
    setSending(false);
  };

  const saveNote = async () => {
    if (!selectedId) return;
    setSavingNote(true);
    const { error } = await supabase
      .from("cases")
      .update({ additional_notes: sessionNote })
      .eq("id", selectedId);
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else
      toast({
        title: language === "tr" ? "Kaydedildi" : "Saved",
        description: language === "tr" ? "Seans notu güncellendi." : "Session note updated.",
      });
    setSavingNote(false);
  };

  const current = cases.find((c) => c.id === selectedId) || null;

  const stats = useMemo(() => {
    const total = cases.length;
    const active = cases.filter((c) => !["completed", "resolved"].includes(c.status)).length;
    const resolved = cases.filter((c) => ["completed", "resolved"].includes(c.status)).length;
    const rate = total ? Math.round((resolved / total) * 100) : 0;
    return { total, active, resolved, rate };
  }, [cases]);

  const ctx = useMemo(() => {
    if (!current) return "";
    return [
      `Dava ID: ${current.id}`,
      `Başlık: ${current.title ?? ""}`,
      `Niş: ${current.category ?? current.dispute_type ?? ""}`,
      `Durum: ${current.status}`,
      `Taraflar: ${parties.map((p) => p.full_name || p.organization).filter(Boolean).join(" / ")}`,
      `Notlar: ${(current.additional_notes ?? "").slice(0, 1200)}`,
    ].join("\n");
  }, [current, parties]);

  if (authLoading || !isMediator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />

      <main className="container max-w-7xl py-6 px-4">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-hero text-primary-foreground p-6 mb-6 shadow-elegant">
          <h1 className="text-3xl font-display font-bold">
            {language === "tr" ? "Arabulucu Paneli" : "Mediator Panel"}
          </h1>
          <p className="text-primary-foreground/80 mt-1 text-sm">
            {language === "tr"
              ? "Aktif davalarınız, AI önerileri ve seans notları."
              : "Your active cases, AI suggestions, and session notes."}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label={language === "tr" ? "Toplam" : "Total"} value={stats.total} icon={Briefcase} accent="primary" />
          <StatCard label={language === "tr" ? "Aktif" : "Active"} value={stats.active} icon={Clock} accent="warning" />
          <StatCard label={language === "tr" ? "Çözülen" : "Resolved"} value={stats.resolved} icon={TrendingUp} accent="success" />
          <StatCard label={language === "tr" ? "Çözüm %" : "Rate"} value={`${stats.rate}%`} icon={Sparkles} accent="accent" />
        </div>

        <div className="grid lg:grid-cols-12 gap-4">
          {/* Case list */}
          <aside className="lg:col-span-3 space-y-2">
            <h2 className="text-sm font-display font-semibold uppercase tracking-wide text-muted-foreground px-1">
              {language === "tr" ? "Aktif Davalar" : "Active Cases"}
            </h2>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-4" />
            ) : cases.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">
                {language === "tr" ? "Atanmış dava yok." : "No assigned cases."}
              </p>
            ) : (
              cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left rounded-xl p-3 border transition-all ${
                    selectedId === c.id
                      ? "bg-primary text-primary-foreground border-primary shadow-elegant"
                      : "bg-card border-border hover:border-primary/40"
                  }`}
                >
                  <p className="text-sm font-semibold truncate">{c.title || c.dispute_type || "Dava"}</p>
                  <p className={`text-xs mt-0.5 truncate ${selectedId === c.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {c.your_name} ↔ {c.other_party_name}
                  </p>
                  <Badge
                    variant={selectedId === c.id ? "secondary" : "outline"}
                    className="text-[10px] mt-2"
                  >
                    {c.status}
                  </Badge>
                </button>
              ))
            )}
          </aside>

          {/* Detail panel */}
          <section className="lg:col-span-9">
            {!current ? (
              <Card className="h-[480px] flex items-center justify-center text-muted-foreground">
                {language === "tr" ? "Bir dava seçin." : "Select a case."}
              </Card>
            ) : (
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <Card className="mb-4">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="text-lg truncate">
                            {current.title || current.dispute_type || "Dava"}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(current.created_at), "PPP", { locale })}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/case/${current.id}`}>{language === "tr" ? "Tam Görünüm" : "Full view"}</Link>
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>

                  <Tabs defaultValue="messages">
                    <TabsList className="grid grid-cols-4 w-full">
                      <TabsTrigger value="messages">
                        <MessageSquare className="w-4 h-4 mr-1.5" />
                        {language === "tr" ? "Mesaj" : "Chat"}
                      </TabsTrigger>
                      <TabsTrigger value="notes">
                        <StickyNote className="w-4 h-4 mr-1.5" />
                        {language === "tr" ? "Notlar" : "Notes"}
                      </TabsTrigger>
                      <TabsTrigger value="docs">
                        <FileText className="w-4 h-4 mr-1.5" />
                        {language === "tr" ? "Belge" : "Docs"}
                      </TabsTrigger>
                      <TabsTrigger value="parties">
                        <Users className="w-4 h-4 mr-1.5" />
                        {language === "tr" ? "Taraf" : "Parties"}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="messages">
                      <Card className="flex flex-col h-[460px]">
                        <CardContent className="flex-1 overflow-y-auto py-4 space-y-2.5">
                          {messages.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              {language === "tr" ? "Henüz mesaj yok." : "No messages yet."}
                            </p>
                          ) : (
                            messages.map((m) => (
                              <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                                <div
                                  className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                                    m.sender_id === user?.id
                                      ? "bg-primary text-primary-foreground rounded-br-sm"
                                      : "bg-muted text-foreground rounded-bl-sm"
                                  }`}
                                >
                                  <p className="text-[10px] uppercase opacity-70 mb-0.5">{m.sender_role ?? "user"}</p>
                                  <p className="whitespace-pre-wrap">{m.content}</p>
                                  <p className="text-[10px] opacity-60 mt-1">
                                    {format(new Date(m.created_at), "HH:mm", { locale })}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </CardContent>
                        <div className="border-t p-3 flex gap-2">
                          <Textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={language === "tr" ? "Mesaj..." : "Message..."}
                            rows={2}
                            className="resize-none text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                void send();
                              }
                            }}
                          />
                          <Button onClick={send} disabled={sending || !newMessage.trim()} size="icon" className="self-end shrink-0">
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </Button>
                        </div>
                      </Card>
                    </TabsContent>

                    <TabsContent value="notes">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <StickyNote className="w-4 h-4 text-primary" />
                            {language === "tr" ? "Seans Notları" : "Session Notes"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            value={sessionNote}
                            onChange={(e) => setSessionNote(e.target.value)}
                            placeholder={
                              language === "tr"
                                ? "Bu seansın özetini, kararları ve sonraki adımları yazın..."
                                : "Write session summary, decisions, and next steps..."
                            }
                            rows={12}
                            className="resize-none"
                          />
                          <div className="flex justify-end mt-3">
                            <Button onClick={saveNote} disabled={savingNote}>
                              {savingNote && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                              {language === "tr" ? "Notu Kaydet" : "Save Note"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="docs">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            {language === "tr" ? "Belgeler ve AI Analizi" : "Documents & AI analysis"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {docs.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-6 text-center">
                              {language === "tr" ? "Henüz belge yok." : "No documents yet."}
                            </p>
                          ) : (
                            docs.map((d) => {
                              const cards = (d.analysis_result as any)?.cards as
                                | Array<{ title: string; riskLevel: string; description: string }>
                                | undefined;
                              return (
                                <div key={d.id} className="rounded-xl border border-border p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText className="w-4 h-4 text-primary shrink-0" />
                                      <p className="text-sm font-medium truncate">{d.file_name}</p>
                                    </div>
                                    {cards && <Badge className="bg-accent/30 text-accent-foreground border-0">AI</Badge>}
                                  </div>
                                  {cards && (
                                    <ul className="mt-2 space-y-1">
                                      {cards.slice(0, 3).map((card, i) => (
                                        <li key={i} className="text-xs text-muted-foreground">
                                          • <span className="font-medium text-foreground">{card.title}:</span> {card.description}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="parties">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            {language === "tr" ? "Taraf Pozisyonları" : "Party Positions"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {parties.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-6 text-center">
                              {language === "tr" ? "Taraf bilgisi yok." : "No party info."}
                            </p>
                          ) : (
                            parties.map((p) => (
                              <div key={p.id} className="rounded-xl border border-border p-3 flex items-center justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold truncate">{p.full_name || p.organization || "—"}</p>
                                  {p.organization && p.full_name && (
                                    <p className="text-xs text-muted-foreground truncate">{p.organization}</p>
                                  )}
                                </div>
                                <Badge variant="outline">{p.role ?? p.party_type}</Badge>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Right rail: AI */}
                <div>
                  <AiAssistantChat
                    caseContext={ctx}
                    niche={current.category ?? current.dispute_type ?? undefined}
                    starter={
                      language === "tr"
                        ? "Bu davaya bakıyorum. İlgili Yargıtay kararları, müzakere stratejisi veya tarafların gerçek ihtiyaçları hakkında size yardımcı olabilirim."
                        : "I'm looking at this case. Ask me about precedents, negotiation strategy, or party interests."
                    }
                  />
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
