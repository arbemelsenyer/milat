import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { tr, enUS } from "date-fns/locale";
import {
  ArrowLeft,
  FileText,
  Loader2,
  MessageSquare,
  Users,
  Calendar,
  Sparkles,
  Upload,
  Send,
  Scale,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { AppNavbar } from "@/components/AppNavbar";
import { CaseTimeline, type TimelineEvent } from "@/components/CaseTimeline";
import { AiAssistantChat } from "@/components/AiAssistantChat";
import { CountdownBadge } from "@/components/CountdownBadge";

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
  assigned_mediator_id: string | null;
  ai_summary: any;
  additional_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PartyRow {
  id: string;
  full_name: string | null;
  organization: string | null;
  party_type: string;
  role: string | null;
}

interface DocRow {
  id: string;
  file_name: string;
  mime_type: string | null;
  created_at: string;
  analysis_result: any;
}

interface SessionRow {
  id: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
}

interface MessageRow {
  id: string;
  sender_id: string;
  sender_role: string | null;
  content: string;
  created_at: string;
}

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const locale = language === "tr" ? tr : enUS;

  const [c, setC] = useState<CaseRow | null>(null);
  const [parties, setParties] = useState<PartyRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!id || !user) return;
    void load();
    const ch = supabase
      .channel(`case-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `case_id=eq.${id}` },
        (p) => setMessages((m) => [...m, p.new as MessageRow]),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [id, user]);

  const load = async () => {
    setLoading(true);
    const [cRes, pRes, dRes, sRes, mRes] = await Promise.all([
      supabase.from("cases").select("*").eq("id", id!).maybeSingle(),
      supabase.from("case_parties").select("*").eq("case_id", id!),
      supabase.from("case_documents").select("id,file_name,mime_type,created_at,analysis_result").eq("case_id", id!).order("created_at", { ascending: false }),
      supabase.from("case_sessions").select("id,scheduled_at,status,notes").eq("case_id", id!).order("scheduled_at", { ascending: true }),
      supabase.from("messages").select("*").eq("case_id", id!).order("created_at", { ascending: true }),
    ]);
    setC((cRes.data as unknown as CaseRow) ?? null);
    setParties((pRes.data as unknown as PartyRow[]) ?? []);
    setDocs((dRes.data as unknown as DocRow[]) ?? []);
    setSessions((sRes.data as unknown as SessionRow[]) ?? []);
    setMessages((mRes.data as unknown as MessageRow[]) ?? []);
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!msg.trim() || !user || !id) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      case_id: id,
      sender_id: user.id,
      sender_role: c?.assigned_mediator_id === user.id ? "mediator" : "party",
      content: msg.trim(),
    });
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else setMsg("");
    setSending(false);
  };

  const events: TimelineEvent[] = useMemo(() => {
    const evs: TimelineEvent[] = [];
    if (c) {
      evs.push({
        id: "created",
        title: language === "tr" ? "Başvuru oluşturuldu" : "Case created",
        date: c.created_at,
        state: "done",
      });
      if (c.assigned_mediator_id) {
        evs.push({
          id: "assigned",
          title: language === "tr" ? "Arabulucu atandı" : "Mediator assigned",
          date: c.updated_at,
          state: "done",
        });
      }
    }
    for (const s of sessions) {
      const past = new Date(s.scheduled_at).getTime() < Date.now();
      evs.push({
        id: `s-${s.id}`,
        title:
          s.status === "completed"
            ? language === "tr"
              ? "Seans tamamlandı"
              : "Session completed"
            : language === "tr"
            ? "Seans planlandı"
            : "Session scheduled",
        date: s.scheduled_at,
        description: s.notes ?? undefined,
        state: s.status === "completed" ? "done" : past ? "current" : "pending",
      });
    }
    return evs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [c, sessions, language]);

  const nextSession = sessions.find((s) => new Date(s.scheduled_at).getTime() > Date.now() && s.status !== "completed");

  const caseContext = useMemo(() => {
    if (!c) return "";
    const lines = [
      `Dava ID: ${c.id}`,
      `Başlık: ${c.title ?? ""}`,
      `Niş: ${c.category ?? c.dispute_type ?? ""}`,
      `Durum: ${c.status}`,
      `Taraflar: ${parties.map((p) => p.full_name || p.organization).filter(Boolean).join(" / ")}`,
      `Notlar: ${(c.additional_notes ?? "").slice(0, 1200)}`,
    ];
    return lines.join("\n");
  }, [c, parties]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!c) {
    return (
      <div className="min-h-screen bg-background">
        <AppNavbar />
        <div className="container max-w-3xl py-16 text-center">
          <p className="text-muted-foreground">{language === "tr" ? "Dava bulunamadı." : "Case not found."}</p>
          <Button variant="ghost" asChild className="mt-4">
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === "tr" ? "Geri" : "Back"}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{c.title ?? "Dava"} | MediPact AI</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <AppNavbar />

      <main className="container max-w-7xl py-6 px-4">
        <Button variant="ghost" size="sm" asChild className="mb-3">
          <Link to="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {language === "tr" ? "Panele dön" : "Back to dashboard"}
          </Link>
        </Button>

        {/* Header */}
        <div className="rounded-2xl bg-gradient-hero text-primary-foreground p-6 mb-6 shadow-elegant">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className="bg-accent text-accent-foreground border-0">
                  {c.category ?? c.dispute_type ?? "—"}
                </Badge>
                <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground">
                  {c.status}
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-bold truncate">{c.title ?? (language === "tr" ? "Başvuru" : "Case")}</h1>
              <p className="text-primary-foreground/80 text-sm mt-1">
                {language === "tr" ? "Oluşturuldu" : "Created"}: {format(new Date(c.created_at), "PPP", { locale })}
              </p>
            </div>
            {nextSession && (
              <div className="bg-primary-foreground/10 backdrop-blur rounded-xl p-4 border border-primary-foreground/15 min-w-[240px]">
                <p className="text-xs uppercase tracking-wide text-primary-foreground/70 font-medium">
                  {language === "tr" ? "Sonraki Seans" : "Next Session"}
                </p>
                <p className="font-display font-bold text-lg mt-1">
                  {format(new Date(nextSession.scheduled_at), "PPp", { locale })}
                </p>
                <div className="mt-2">
                  <CountdownBadge target={nextSession.scheduled_at} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="timeline" className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="timeline">
                  <Calendar className="w-4 h-4 mr-1.5" />
                  {language === "tr" ? "Zaman Çizelgesi" : "Timeline"}
                </TabsTrigger>
                <TabsTrigger value="parties">
                  <Users className="w-4 h-4 mr-1.5" />
                  {language === "tr" ? "Taraflar" : "Parties"}
                </TabsTrigger>
                <TabsTrigger value="documents">
                  <FileText className="w-4 h-4 mr-1.5" />
                  {language === "tr" ? "Belgeler" : "Documents"}
                </TabsTrigger>
                <TabsTrigger value="messages">
                  <MessageSquare className="w-4 h-4 mr-1.5" />
                  {language === "tr" ? "Mesajlar" : "Messages"}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="timeline">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      {language === "tr" ? "Dava Kronolojisi" : "Case Chronology"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CaseTimeline events={events} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="parties">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      {language === "tr" ? "Taraflar ve Pozisyonlar" : "Parties & Positions"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {parties.length === 0 && (
                      <p className="text-sm text-muted-foreground">{language === "tr" ? "Henüz taraf yok." : "No parties yet."}</p>
                    )}
                    {parties.map((p) => (
                      <div key={p.id} className="border border-border rounded-xl p-4 bg-card">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-foreground">
                            {p.full_name || p.organization || "—"}
                          </p>
                          <Badge variant="outline">{p.role ?? p.party_type}</Badge>
                        </div>
                        {p.position_notes && (
                          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                            {p.position_notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      {language === "tr" ? "Yüklenen Belgeler" : "Uploaded Documents"}
                    </CardTitle>
                    <Badge variant="secondary">{docs.length}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {docs.length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {language === "tr" ? "Henüz belge yok." : "No documents yet."}
                        </p>
                      </div>
                    )}
                    {docs.map((d) => {
                      const cards = (d.analysis_result as any)?.cards as
                        | Array<{ title: string; riskLevel: string; description: string }>
                        | undefined;
                      return (
                        <div key={d.id} className="border border-border rounded-xl p-4 bg-card">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <FileText className="w-5 h-5 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{d.file_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(d.created_at), "Pp", { locale })}
                                </p>
                              </div>
                            </div>
                            {cards && (
                              <Badge className="bg-accent/30 text-accent-foreground border-0">
                                <Sparkles className="w-3 h-3 mr-1" />
                                AI
                              </Badge>
                            )}
                          </div>
                          {cards && cards.length > 0 && (
                            <div className="grid sm:grid-cols-2 gap-2 mt-3">
                              {cards.slice(0, 4).map((card, i) => (
                                <div
                                  key={i}
                                  className={`rounded-lg p-2.5 text-xs border ${
                                    card.riskLevel === "high"
                                      ? "bg-destructive/5 border-destructive/30"
                                      : card.riskLevel === "medium"
                                      ? "bg-warning/10 border-warning/30"
                                      : "bg-muted border-border"
                                  }`}
                                >
                                  <p className="font-semibold text-foreground">{card.title}</p>
                                  <p className="text-muted-foreground mt-0.5 line-clamp-2">{card.description}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="messages">
                <Card className="flex flex-col h-[520px]">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      {language === "tr" ? "Dava Mesajları" : "Case Messages"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto py-4 space-y-2.5">
                    {messages.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {language === "tr" ? "Henüz mesaj yok." : "No messages yet."}
                      </p>
                    )}
                    {messages.map((m) => {
                      const mine = m.sender_id === user?.id;
                      return (
                        <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                              mine
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
                      );
                    })}
                  </CardContent>
                  <div className="border-t p-3 flex gap-2">
                    <Textarea
                      value={msg}
                      onChange={(e) => setMsg(e.target.value)}
                      placeholder={language === "tr" ? "Mesaj yazın..." : "Type a message..."}
                      rows={2}
                      className="resize-none text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendMessage();
                        }
                      }}
                    />
                    <Button onClick={sendMessage} disabled={sending || !msg.trim()} size="icon" className="self-end shrink-0">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right column: AI assistant */}
          <div className="space-y-4">
            <AiAssistantChat caseContext={caseContext} niche={c.category ?? c.dispute_type ?? undefined} />

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary" />
                  {language === "tr" ? "Dava Özeti" : "Case Summary"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed">
                {(c.ai_summary as any)?.summary ||
                  c.additional_notes ||
                  (language === "tr" ? "Özet henüz oluşturulmadı." : "No summary yet.")}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
