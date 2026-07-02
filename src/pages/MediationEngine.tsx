import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AppNavbar } from "@/components/AppNavbar";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus, Loader2, FolderOpen, FileText, Users, Brain, ShieldCheck,
  Calendar as CalIcon, UserCheck, MessageSquare, FileCheck2, CheckCircle2, Circle,
  Trash2, ArrowLeft, Download, Sparkles, ChevronDown, ChevronUp, AlertTriangle, RefreshCw,
} from "lucide-react";
import { SessionScheduler } from "@/components/mediation/SessionScheduler";
import { ExpertSelector } from "@/components/mediation/ExpertSelector";
import { Phase3ErrorBoundary } from "@/components/mediation/Phase3ErrorBoundary";

// Safely coerce any AI-returned value into a renderable string. Prevents
// "Objects are not valid as a React child" crashes when the model returns an
// object/array where we expected a scalar.
function safeText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}
// Coerce arrays of strings — items may occasionally be objects.
function safeList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(safeText).filter((s) => s.trim().length > 0);
}

const DISPUTE_TYPES = [
  "İşçi-İşveren",
  "Ticari Uyuşmazlık",
  "Tüketici",
  "Sağlık Hukuku",
  "Sigorta",
  "İnşaat & Yapı",
  "Marka & Patent",
];

const PHASES = [
  { id: 1, label: "Başvuru", icon: FileText },
  { id: 2, label: "Taraflar", icon: Users },
  { id: 3, label: "Taraf Analizi", icon: Brain },
  { id: 4, label: "Arabulucu Paneli", icon: ShieldCheck },
  { id: 5, label: "Toplantı", icon: CalIcon },
  { id: 6, label: "Bilirkişi", icon: UserCheck, optional: true },
  { id: 7, label: "Müzakere", icon: MessageSquare },
  { id: 8, label: "Belgeler & Kapanış", icon: FileCheck2 },
] as const;

type CaseRow = {
  id: string;
  user_id: string;
  title: string | null;
  application_no: string | null;
  uyap_no: string | null;
  dispute_type: string | null;
  status: string | null;
  current_phase: number | null;
  application_date: string | null;
  assigned_mediator_id: string | null;
  created_at: string;
  is_mandatory?: boolean | null;
  legal_duration_days?: number | null;
  extension_days?: number | null;
  legal_basis?: string | null;
  deadline_total?: string | null;
  deadline_extended?: string | null;
  extension_used?: boolean | null;
  deadline_sources?: string[] | null;
  deadline_conflict?: boolean | null;
  deadline_conflict_note?: string | null;
  deadline_detected_at?: string | null;
  mediation_type?: "dava_sarti" | "ihtiyari" | null;
  mahkeme_turu?: "tuketici" | "is" | "sulh" | "ticaret" | "yok" | null;
  sure_hafta?: number | null;
  uzatma_hafta?: number | null;
};

type PartyDraft = {
  party_type: "individual" | "corporate";
  party_role: "applicant" | "respondent" | "third_party";
  // individual
  first_name?: string;
  last_name?: string;
  tc_kimlik?: string;
  birth_date?: string;
  // corporate
  company_name?: string;
  tax_office?: string;
  tax_number?: string;
  trade_registry_no?: string;
  authorized_person?: string;
  // shared
  address?: string;
  gsm?: string;
  phone?: string;
  email?: string;
  kvkk_ok?: boolean;
};

function emptyParty(role: PartyDraft["party_role"] = "applicant"): PartyDraft {
  return { party_type: "individual", party_role: role };
}

function trErr(msg: string) {
  const m = (msg || "").toLowerCase();
  if (!msg) return "Bilinmeyen hata. Lütfen tekrar deneyin.";
  if (
    m.includes("row-level security") ||
    m.includes("row level security") ||
    m.includes(" rls") ||
    m.includes("permission denied") ||
    m.includes("not authorized") ||
    m.includes("42501")
  ) {
    return "Bu işlem için yetkiniz yok. Sadece başvuru sahibi, atanmış arabulucu veya yönetici silebilir.";
  }
  if (m.includes("jwt") || m.includes("not authenticated") || m.includes("invalid token")) {
    return "Oturumunuz sona ermiş olabilir. Lütfen tekrar giriş yapın.";
  }
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("network request")) {
    return "Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.";
  }
  return msg;
}

export default function MediationEngine() {
  const { user, isLoading, isMediator, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const caseId = params.get("caseId");
  const phaseParam = Number(params.get("phase") || 1);

  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [activeCase, setActiveCase] = useState<CaseRow | null>(null);
  const [phase3Complete, setPhase3Complete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CaseRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function deleteCase(c: CaseRow) {
    setDeleting(true);
    try {
      const { error, count } = await supabase
        .from("cases").delete({ count: "exact" }).eq("id", c.id);
      if (error) throw error;
      if (!count) {
        throw new Error(
          "Silme işlemi başarısız. Bu başvuruyu silme yetkiniz yok veya başvuru zaten silinmiş olabilir."
        );
      }

      // Cascade doğrulaması: bağlı kayıtların gerçekten silindiğini kontrol et
      const childTables = [
        "case_parties", "case_documents", "party_analyses",
        "common_ground_reports", "case_sessions", "negotiation_rounds",
      ] as const;
      const checks = await Promise.all(
        childTables.map((t) =>
          supabase.from(t as any).select("id", { count: "exact", head: true }).eq("case_id", c.id)
        )
      );
      const remaining = checks
        .map((r, i) => ({ table: childTables[i], n: r.count ?? 0 }))
        .filter((x) => x.n > 0);
      if (remaining.length > 0) {
        console.warn("Cascade delete incomplete:", remaining);
        toast({
          title: "Silme kısmen tamamlandı",
          description: `Bazı bağlı kayıtlar kaldı: ${remaining.map((x) => x.table).join(", ")}. Yönetici ile iletişime geçin.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Başvuru silindi", description: "Başvuru ve tüm bağlı kayıtlar başarıyla silindi." });
      }

      setCases((prev) => prev.filter((x) => x.id !== c.id));
      setDeleteTarget(null);
    } catch (e: any) {
      toast({
        title: "Silme işlemi başarısız",
        description: trErr(e?.message ?? ""),
        variant: "destructive",
      });
    } finally { setDeleting(false); }
  }

  useEffect(() => {
    if (!isLoading && !user) {
      navigate(`/auth?next=${encodeURIComponent("/legal-reasoning")}`);
    }
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (user) loadCases();
  }, [user]);

  useEffect(() => {
    if (caseId) loadCase(caseId); else setActiveCase(null);
  }, [caseId]);

  const checkPhase3 = useCallback(async (id: string) => {
    const [{ count: aCount }, { data: report }] = await Promise.all([
      supabase.from("party_analyses").select("id", { count: "exact", head: true }).eq("case_id", id),
      supabase.from("common_ground_reports").select("id").eq("case_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setPhase3Complete((aCount ?? 0) >= 2 && !!report);
  }, []);

  useEffect(() => {
    if (caseId) checkPhase3(caseId);
  }, [caseId, checkPhase3, phaseParam]);

  useEffect(() => {
    if (params.get("new") === "1") {
      setShowNew(true);
      const p = new URLSearchParams(params);
      p.delete("new");
      setParams(p, { replace: true });
    }
  }, [params, setParams]);

  async function loadCases() {
    setLoading(true);
    const { data, error } = await supabase
      .from("cases")
      .select("id, user_id, title, application_no, uyap_no, dispute_type, status, current_phase, application_date, assigned_mediator_id, created_at, is_mandatory, legal_duration_days, extension_days, legal_basis, deadline_total, deadline_extended, extension_used, deadline_sources, deadline_conflict, deadline_conflict_note, deadline_detected_at, mediation_type, mahkeme_turu, sure_hafta, uzatma_hafta")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Yükleme hatası", description: trErr(error.message), variant: "destructive" });
    else setCases((data ?? []) as CaseRow[]);
    setLoading(false);
  }

  async function loadCase(id: string) {
    const { data, error } = await supabase
      .from("cases")
      .select("id, user_id, title, application_no, uyap_no, dispute_type, status, current_phase, application_date, assigned_mediator_id, created_at, is_mandatory, legal_duration_days, extension_days, legal_basis, deadline_total, deadline_extended, extension_used, deadline_sources, deadline_conflict, deadline_conflict_note, deadline_detected_at, mediation_type, mahkeme_turu, sure_hafta, uzatma_hafta")
      .eq("id", id).maybeSingle();
    if (error) { toast({ title: "Başvuru yüklenemedi", description: trErr(error.message), variant: "destructive" }); return; }
    setActiveCase(data as CaseRow);
  }

  function openCase(id: string, phase = 1) {
    const p = new URLSearchParams();
    p.set("caseId", id); p.set("phase", String(phase));
    setParams(p);
  }
  function setPhase(phase: number) {
    const p = new URLSearchParams(params);
    p.set("phase", String(phase));
    setParams(p);
  }

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  // === No case selected: list view ===
  if (!caseId) {
    return (
      <div className="min-h-screen bg-background">
        <AppNavbar />
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <header className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-primary">Arabuluculuk Başvuru Yönetimi</h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> İki taraflı gizli analiz sistemi
              </p>
            </div>
            <Button onClick={() => setShowNew((s) => !s)}>
              <Plus className="h-4 w-4 mr-1" /> Yeni Başvuru Oluştur
            </Button>
          </header>

          {showNew && (
            <NewCaseForm
              onCancel={() => setShowNew(false)}
              onCreated={(id) => { setShowNew(false); loadCases(); openCase(id, 2); }}
              userId={user!.id}
              isMediator={isMediator || isAdmin}
            />
          )}

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FolderOpen className="h-5 w-5" /> Başvurularım
            </h2>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
            ) : cases.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Henüz başvuru yok.</p>
            ) : (
              <div className="space-y-2">
                {cases.map((c) => (
                  <div key={c.id}
                    className="w-full p-4 rounded-lg border hover:bg-accent/10 transition flex items-center justify-between gap-2">
                    <button onClick={() => openCase(c.id, c.current_phase || 1)}
                      className="flex-1 text-left flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{c.title || "(başlıksız)"}</div>
                        <div className="text-sm text-muted-foreground">
                          {c.application_no ?? "—"} · {c.dispute_type ?? ""} · Aşama {c.current_phase ?? 1}/9
                        </div>
                      </div>
                      <Badge variant="secondary">{c.status ?? "active"}</Badge>
                    </button>
                    <Button
                      variant="ghost" size="icon"
                      aria-label="Başvuruyu sil"
                      disabled={deleting}
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      {deleting && deleteTarget?.id === c.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Bu başvuruyu silmek istediğinizden emin misiniz?</AlertDialogTitle>
                <AlertDialogDescription>
                  Başvuruya ait tüm taraflar, belgeler ve analizler de silinecektir. Bu işlem geri alınamaz.
                  {deleteTarget?.application_no && (
                    <span className="block mt-2 font-medium">{deleteTarget.application_no} — {deleteTarget.title}</span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>İptal</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  onClick={(e) => { e.preventDefault(); if (deleteTarget) deleteCase(deleteTarget); }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Siliniyor…</> : "Evet, Sil"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    );
  }

  // === Case selected: sidebar + content ===
  if (!activeCase) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  const completed = activeCase.current_phase ?? 1;

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <div className="flex">
        <aside className="w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground min-h-[calc(100vh-4rem)] p-4">
          <Button variant="ghost" size="sm" className="mb-4 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => { const p = new URLSearchParams(); setParams(p); }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Başvurular
          </Button>
          <div className="mb-4 px-2">
            <div className="text-xs uppercase opacity-70">Başvuru No</div>
            <div className="font-mono text-sm">{activeCase.application_no || "—"}</div>
            <div className="text-xs mt-2 opacity-80 line-clamp-2">{activeCase.title}</div>
          </div>
          <nav className="space-y-1">
            {PHASES.map((p) => {
              const done = p.id < completed;
              const active = p.id === phaseParam;
              const Icon = p.icon;
              const locked = p.id >= 4 && !phase3Complete;
              return (
                <button key={p.id} onClick={() => { if (!locked) setPhase(p.id); else toast({ title: "Aşama kilitli", description: "Önce Aşama 3'te en az 2 tarafı analiz edip Ortak Zemin Raporu üretin." }); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition
                    ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/40"}
                    ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
                  title={locked ? "Aşama 3 tamamlanmadı" : ""}>
                  {done ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Circle className="h-4 w-4 opacity-60" />}
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{p.id}. {p.label}</span>
                  {("optional" in p && p.optional) && <span className="text-[10px] opacity-60">opsiyonel</span>}
                </button>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
          <PhaseRenderer
            phase={phaseParam}
            caseRow={activeCase}
            reload={() => { loadCase(activeCase.id); checkPhase3(activeCase.id); }}
            isMediator={isMediator || isAdmin}
            userId={user!.id}
            onAdvance={(next) => setPhase(next)}
          />
        </main>
      </div>
    </div>
  );
}

/* ===================== NEW CASE (Phase 1) ===================== */

function NewCaseForm({ onCancel, onCreated, userId, isMediator }: {
  onCancel: () => void; onCreated: (id: string) => void; userId: string; isMediator: boolean;
}) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const { data: appNoData } = await supabase.rpc("generate_application_no" as any);
      const application_no = (appNoData as string) ?? `MP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: row, error } = await supabase.from("cases").insert({
        user_id: userId,
        assigned_mediator_id: isMediator ? userId : null,
        title: title || `Başvuru - ${application_no}`,
        dispute_type: null,
        application_no,
        uyap_no: null,
        status: "active",
        current_phase: 2,
        round_number: 1,
      } as any).select().single();
      if (error) throw error;
      toast({ title: "Başvuru oluşturuldu", description: `Sistem No: ${application_no}` });
      onCreated((row as any).id);
    } catch (e: any) {
      toast({ title: "Oluşturma hatası", description: trErr(e.message), variant: "destructive" });
    } finally { setBusy(false); }
  }

  return (
    <Card className="p-6 mb-6 space-y-4">
      <h2 className="text-xl font-semibold">Yeni Başvuru</h2>
      <div className="text-xs text-muted-foreground bg-muted/50 border rounded p-3">
        ℹ️ Uyuşmazlık türünü AI, taraf bilgileri ve açıklamanızı girdikten sonra (Aşama 3) otomatik tespit edecek.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Başvuru Başlığı</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn. Kira sözleşmesinden doğan uyuşmazlık" />
        </div>
        <div>
          <Label>Sistem No</Label>
          <Input value="Oluşturulduğunda atanır (MP-YYYY-XXXX)" disabled />
        </div>
        <div>
          <Label>Başvuru Tarihi</Label>
          <Input value={new Date().toLocaleDateString("tr-TR")} disabled />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onCancel}>İptal</Button>
        <Button onClick={create} disabled={busy}>
          {busy ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Oluşturuluyor</> : "Başvuruyu Oluştur"}
        </Button>
      </div>
    </Card>
  );
}

/* ===================== PHASE RENDERER ===================== */

function PhaseRenderer({ phase, caseRow, reload, isMediator, userId, onAdvance }: {
  phase: number; caseRow: CaseRow; reload: () => void; isMediator: boolean; userId: string;
  onAdvance: (n: number) => void;
}) {
  async function bumpPhase(next: number) {
    if ((caseRow.current_phase ?? 1) < next) {
      await supabase.from("cases").update({ current_phase: next } as any).eq("id", caseRow.id);
      reload();
    }
  }
  switch (phase) {
    case 1: return <Phase1Summary caseRow={caseRow} />;
    case 2: return <Phase2Parties caseRow={caseRow} isMediator={isMediator} userId={userId} onDone={() => { bumpPhase(3); onAdvance(3); }} />;
    case 3: return <Phase3ErrorBoundary><Phase3PartyAnalysis caseRow={caseRow} userId={userId} isMediator={isMediator} reload={reload} onAdvance={onAdvance} bumpPhase={bumpPhase} /></Phase3ErrorBoundary>;
    case 4: return <Phase4Summary caseRow={caseRow} />;
    case 5: return <SessionScheduler caseId={caseRow.id} />;
    case 6: return <Phase7Expert caseRow={caseRow} />;
    case 7: return <Phase8Negotiation caseRow={caseRow} userId={userId} onDone={() => { bumpPhase(8); onAdvance(8); }} />;
    case 8: return <Phase9Closing caseRow={caseRow} />;
    default: return null;
  }
}

function Phase1Summary({ caseRow }: { caseRow: CaseRow }) {
  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-3">
        <h2 className="text-2xl font-bold text-primary">Aşama 1 — Başvuru Özeti</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Sistem No:</span> <b className="font-mono">{caseRow.application_no}</b></div>
          <div><span className="text-muted-foreground">Başlık:</span> {caseRow.title}</div>
          <div><span className="text-muted-foreground">Uyuşmazlık Türü:</span> {caseRow.dispute_type || <span className="italic text-muted-foreground">Aşağıdaki karttan otomatik tespit edilebilir</span>}</div>
          <div><span className="text-muted-foreground">Tarih:</span> {caseRow.application_date ? new Date(caseRow.application_date).toLocaleDateString("tr-TR") : new Date(caseRow.created_at).toLocaleDateString("tr-TR")}</div>
          <div><span className="text-muted-foreground">Durum:</span> {caseRow.status}</div>
          <div><span className="text-muted-foreground">UYAP Kayıt No:</span> {caseRow.uyap_no || <span className="italic text-muted-foreground">Henüz kaydedilmedi</span>}</div>
        </div>
        <p className="text-xs text-muted-foreground border-t pt-3">
          UYAP Kayıt Numarası, başvuru resmi sisteme kaydedildiğinde Aşama 4 (Arabulucu Paneli) üzerinden eklenebilir.
        </p>
      </Card>
      <DisputeClassifierCard caseRow={caseRow} initialText={caseRow.title ?? ""} autoRun />
      <DeadlineCard caseRow={caseRow} />
    </div>
  );
}

/* ============ DEADLINE / TAKVIM CARD ============ */

const COURT_LABEL: Record<string, string> = {
  tuketici: "Tüketici Mahkemesi",
  is: "İş Mahkemesi",
  sulh: "Sulh Hukuk Mahkemesi",
  ticaret: "Ticaret Mahkemesi",
  yok: "Dava şartı kapsamı dışında",
};

function statusChipFor(remainingDays: number | null) {
  if (remainingDays == null) return null;
  if (remainingDays < 0) return <Badge className="bg-neutral-800 text-white">⚫ Süre doldu</Badge>;
  if (remainingDays < 3) return <Badge className="bg-red-600 text-white">🔴 {remainingDays} gün</Badge>;
  if (remainingDays < 7) return <Badge className="bg-amber-500 text-white">🟡 {remainingDays} gün</Badge>;
  return <Badge className="bg-emerald-600 text-white">🟢 {remainingDays} gün</Badge>;
}

function DeadlineCard({ caseRow }: { caseRow: CaseRow }) {
  const [local, setLocal] = useState<Partial<CaseRow>>({ ...caseRow });
  const [busy, setBusy] = useState(false);
  const [extending, setExtending] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voluntaryEnd, setVoluntaryEnd] = useState<string>(
    caseRow.deadline_total ? caseRow.deadline_total.slice(0, 10) : ""
  );
  const [savingVoluntary, setSavingVoluntary] = useState(false);

  const startDate = new Date(caseRow.application_date ?? caseRow.created_at);
  const todayIso = new Date().toISOString().slice(0, 10);

  async function chooseType(type: "dava_sarti" | "ihtiyari") {
    setSavingType(true);
    try {
      const { error } = await supabase.from("cases").update({ mediation_type: type } as any).eq("id", caseRow.id);
      if (error) throw error;
      setLocal((s) => ({ ...s, mediation_type: type }));
    } catch (e: any) {
      toast({ title: "Kaydedilemedi", description: e?.message ?? "", variant: "destructive" });
    } finally { setSavingType(false); }
  }

  const detect = useCallback(async () => {
    if (!caseRow.dispute_type) {
      setError("Önce yukarıdaki karttan AI uyuşmazlık türünü tespit edin.");
      return;
    }
    setBusy(true); setError(null);
    try {
      const { data, error: fErr } = await supabase.functions.invoke("detect-legal-deadlines", {
        body: { case_id: caseRow.id, dispute_type: caseRow.dispute_type, dispute_text: caseRow.title ?? "", persist: true },
      });
      if (fErr) throw fErr;
      if ((data as any)?.error) throw new Error((data as any).error);
      const r = data as any;
      const start = new Date(caseRow.application_date ?? caseRow.created_at);
      const sure_gun = r.sure_hafta != null ? r.sure_hafta * 7 : null;
      const uzatma_gun = r.uzatma_hafta != null ? r.uzatma_hafta * 7 : null;
      setLocal((s) => ({
        ...s,
        mediation_type: "dava_sarti",
        mahkeme_turu: r.mahkeme_turu,
        sure_hafta: r.sure_hafta,
        uzatma_hafta: r.uzatma_hafta,
        is_mandatory: r.dava_sarti_mi,
        legal_duration_days: sure_gun,
        extension_days: uzatma_gun,
        legal_basis: r.dayanak,
        deadline_total: sure_gun != null ? new Date(start.getTime() + sure_gun * 86400000).toISOString() : null,
        deadline_extended: (sure_gun != null && uzatma_gun) ? new Date(start.getTime() + (sure_gun + uzatma_gun) * 86400000).toISOString() : null,
        extension_used: false,
        deadline_sources: r.kullanilan_kaynaklar,
        deadline_detected_at: new Date().toISOString(),
      }));
      if (r.mahkeme_turu === "yok") {
        toast({ title: "Dava şartı kapsamı dışında", description: "İhtiyari arabuluculuk akışına geçebilirsiniz." });
      } else if (r.kaynak_bulunamadi) {
        toast({ title: "Kaynak yetersiz", description: "Mahkeme türü tespit edilemedi. Lütfen manuel kontrol edin.", variant: "destructive" });
      } else {
        toast({ title: "Mahkeme türü tespit edildi", description: `${COURT_LABEL[r.mahkeme_turu] ?? "-"} • ${r.sure_hafta}+${r.uzatma_hafta ?? 0} hafta` });
      }
    } catch (e: any) {
      setError(e?.message ?? "Süre tespiti başarısız. Tekrar deneyin.");
    } finally { setBusy(false); }
  }, [caseRow.id, caseRow.dispute_type, caseRow.title, caseRow.application_date, caseRow.created_at]);

  // Auto-detect when Dava Şartı seçilmiş ve dispute_type varsa
  const detectedRef = useRef(false);
  useEffect(() => {
    if (detectedRef.current) return;
    if (local.mediation_type !== "dava_sarti") return;
    if (!caseRow.dispute_type) return;
    if (local.deadline_detected_at) return;
    detectedRef.current = true;
    detect();
  }, [local.mediation_type, caseRow.dispute_type, local.deadline_detected_at, detect]);

  async function saveVoluntary() {
    if (!voluntaryEnd) return;
    setSavingVoluntary(true);
    try {
      const endIso = new Date(voluntaryEnd + "T23:59:59").toISOString();
      const days = Math.max(0, Math.ceil((new Date(endIso).getTime() - startDate.getTime()) / 86400000));
      const { error } = await supabase.from("cases").update({
        mediation_type: "ihtiyari",
        deadline_total: endIso,
        deadline_extended: null,
        legal_duration_days: days,
        extension_days: null,
        sure_hafta: null,
        uzatma_hafta: null,
        mahkeme_turu: null,
        is_mandatory: false,
        legal_basis: "İhtiyari arabuluculuk — taraflarca belirlendi",
        deadline_detected_at: new Date().toISOString(),
      } as any).eq("id", caseRow.id);
      if (error) throw error;
      setLocal((s) => ({
        ...s,
        mediation_type: "ihtiyari",
        deadline_total: endIso,
        deadline_extended: null,
        legal_duration_days: days,
        extension_days: null,
        is_mandatory: false,
        legal_basis: "İhtiyari arabuluculuk — taraflarca belirlendi",
        deadline_detected_at: new Date().toISOString(),
      }));
      toast({ title: "Tarih kaydedildi", description: new Date(endIso).toLocaleDateString("tr-TR") });
    } catch (e: any) {
      toast({ title: "Kaydedilemedi", description: e?.message ?? "", variant: "destructive" });
    } finally { setSavingVoluntary(false); }
  }

  async function extendDeadline() {
    if (!local.deadline_extended || local.extension_used) return;
    setExtending(true);
    try {
      const { error } = await supabase.from("cases").update({ extension_used: true } as any).eq("id", caseRow.id);
      if (error) throw error;
      setLocal((s) => ({ ...s, extension_used: true }));
      toast({ title: "Süre uzatıldı", description: `Yeni bitiş: ${new Date(local.deadline_extended).toLocaleDateString("tr-TR")}` });
    } catch (e: any) {
      toast({ title: "Uzatma başarısız", description: e?.message ?? "", variant: "destructive" });
    } finally { setExtending(false); }
  }

  const active = local.extension_used && local.deadline_extended ? local.deadline_extended : local.deadline_total;
  const remainingDays = active ? Math.ceil((new Date(active).getTime() - Date.now()) / 86400000) : null;
  const chip = statusChipFor(remainingDays);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CalIcon className="h-4 w-4 text-primary" /> 📅 Takvim & Süreler
        </h3>
      </div>

      {/* ARABULUCULUK TÜRÜ SEÇİMİ */}
      <div>
        <div className="text-sm font-medium mb-2">Arabuluculuk Türü:</div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={local.mediation_type === "dava_sarti" ? "default" : "outline"}
            disabled={savingType}
            onClick={() => chooseType("dava_sarti")}
          >
            Dava Şartı Arabuluculuk
          </Button>
          <Button
            size="sm"
            variant={local.mediation_type === "ihtiyari" ? "default" : "outline"}
            disabled={savingType}
            onClick={() => chooseType("ihtiyari")}
          >
            İhtiyari Arabuluculuk
          </Button>
        </div>
      </div>

      {!local.mediation_type && (
        <p className="text-xs text-muted-foreground italic">Lütfen arabuluculuk türünü seçin.</p>
      )}

      {/* İHTİYARİ AKIŞ */}
      {local.mediation_type === "ihtiyari" && (
        <div className="space-y-3 border-t pt-3">
          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <b>İhtiyari Arabuluculuk</b>
            <p className="text-xs text-muted-foreground mt-1">
              Yasal süre sınırı yoktur. Taraflarla mutabık kalınan süreyi girin.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <Label className="text-xs">📅 Başlangıç Tarihi</Label>
              <Input value={startDate.toLocaleDateString("tr-TR")} disabled />
            </div>
            <div>
              <Label className="text-xs">📅 Taraflarca Belirlenen Bitiş Tarihi</Label>
              <Input type="date" min={todayIso} value={voluntaryEnd} onChange={(e) => setVoluntaryEnd(e.target.value)} />
            </div>
          </div>
          <Button size="sm" onClick={saveVoluntary} disabled={savingVoluntary || !voluntaryEnd}>
            {savingVoluntary ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Kaydediliyor…</> : "Bitiş Tarihini Kaydet"}
          </Button>
          {local.deadline_total && (
            <div className="text-sm border-t pt-3 space-y-1">
              <div><span className="text-muted-foreground">📅 Başvuru:</span> {startDate.toLocaleDateString("tr-TR")}</div>
              <div><span className="text-muted-foreground">📅 Bitiş:</span> {new Date(local.deadline_total).toLocaleDateString("tr-TR")}</div>
              <div><span className="text-muted-foreground">Kalan Süre:</span> {chip ?? "—"}</div>
            </div>
          )}
        </div>
      )}

      {/* DAVA ŞARTI AKIŞ */}
      {local.mediation_type === "dava_sarti" && (
        <div className="space-y-3 border-t pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              AI, uyuşmazlığı sınıflandırıp mahkeme türü ile yasal süreyi tespit eder.
            </p>
            <Button size="sm" variant="outline" onClick={detect} disabled={busy || !caseRow.dispute_type}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Tespit ediliyor…</>
                    : <><RefreshCw className="h-4 w-4 mr-1" /> {local.deadline_detected_at ? "Yeniden Tespit" : "Mahkeme Türünü Tespit Et"}</>}
            </Button>
          </div>

          {!caseRow.dispute_type && (
            <p className="text-xs text-muted-foreground italic">
              Önce yukarıdaki karttan uyuşmazlık türünü tespit edin.
            </p>
          )}

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive flex items-start gap-1">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {error}
            </div>
          )}

          {local.mahkeme_turu === "yok" && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-2">
              <p>Bu uyuşmazlık dava şartı arabuluculuk kapsamında değildir. İhtiyari arabuluculuk yapılabilir.</p>
              <Button size="sm" variant="outline" onClick={() => chooseType("ihtiyari")}>
                İhtiyari Arabuluculuğa Geç
              </Button>
            </div>
          )}

          {local.deadline_detected_at && local.mahkeme_turu && local.mahkeme_turu !== "yok" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Mahkeme Türü:</span> <b>{COURT_LABEL[local.mahkeme_turu]}</b></div>
              <div><span className="text-muted-foreground">Yasal Süre:</span> <b>{local.sure_hafta} hafta{local.uzatma_hafta ? ` + ${local.uzatma_hafta} hafta uzatma` : ""}</b></div>
              <div className="md:col-span-2"><span className="text-muted-foreground">Dayanak:</span> {local.legal_basis || "—"}</div>
              <div><span className="text-muted-foreground">📅 Başvuru:</span> {startDate.toLocaleDateString("tr-TR")}</div>
              <div><span className="text-muted-foreground">📅 Süre Sonu:</span> {local.deadline_total ? new Date(local.deadline_total).toLocaleDateString("tr-TR") : "—"}</div>
              {local.deadline_extended && (
                <div><span className="text-muted-foreground">📅 Uzatılmış Son:</span> {new Date(local.deadline_extended).toLocaleDateString("tr-TR")} {local.extension_used && <Badge variant="outline" className="ml-1 text-[10px]">Kullanıldı</Badge>}</div>
              )}
              <div><span className="text-muted-foreground">Kalan Süre:</span> {chip ?? "—"}</div>
            </div>
          )}

          {local.deadline_detected_at && !local.mahkeme_turu && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              Mahkeme türü tespit edilemedi. Lütfen manuel kontrol edin.
            </div>
          )}

          {local.deadline_sources && local.deadline_sources.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span>Kullanılan Kaynaklar:</span> {local.deadline_sources.slice(0, 6).join(" · ")}
            </div>
          )}

          {local.uzatma_hafta && !local.extension_used && local.deadline_extended && local.mahkeme_turu && local.mahkeme_turu !== "yok" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={extending}>
                  {extending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Uzatılıyor…</> : `Süre Uzat (+${local.uzatma_hafta} hafta)`}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Süre uzatılsın mı?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Uzatma bir kez kullanılabilir. Yeni bitiş: {new Date(local.deadline_extended).toLocaleDateString("tr-TR")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                  <AlertDialogAction onClick={extendDeadline}>Evet, Uzat</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
    </Card>
  );
}

/* ============ DISPUTE CLASSIFIER (AI tür tespiti) ============ */

const DISPUTE_CATEGORIES: { value: string; label: string }[] = [
  { value: "işçi_işveren", label: "İşçi–İşveren" },
  { value: "ticari", label: "Ticari" },
  { value: "tüketici", label: "Tüketici" },
  { value: "sağlık", label: "Sağlık" },
  { value: "fikri_mülkiyet", label: "Fikri Mülkiyet" },
  { value: "inşaat", label: "İnşaat" },
  { value: "sigorta", label: "Sigorta" },
  { value: "bankacılık", label: "Bankacılık" },
  { value: "aile", label: "Aile" },
  { value: "spor", label: "Spor" },
  { value: "enerji_maden", label: "Enerji & Maden" },
  { value: "kira", label: "Kira" },
  { value: "gayrimenkul", label: "Gayrimenkul" },
  { value: "genel", label: "Genel" },
];
function catLabel(v?: string | null) {
  return DISPUTE_CATEGORIES.find((c) => c.value === v)?.label ?? v ?? "—";
}

function DisputeClassifierCard({
  caseRow, initialText, autoRun = false,
}: { caseRow: CaseRow; initialText: string; autoRun?: boolean }) {
  const [text, setText] = useState(initialText || caseRow.title || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ kategori: string; guven_skoru: number; gerekce: string; ilgili_kanun: string[] } | null>(null);
  const [manual, setManual] = useState<string>(caseRow.dispute_type ?? "");
  const [savingManual, setSavingManual] = useState(false);
  const ranRef = useRef(false);

  const runClassify = useCallback(async (input: string) => {
    const q = (input ?? "").trim();
    if (q.length < 5) { setError("Sınıflandırma için en az 5 karakter gerekli."); return; }
    setBusy(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("classify-dispute", {
        body: { case_id: caseRow.id, text: q, persist: true },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as any);
      setManual((data as any).kategori);
      toast({ title: "Tür tespiti tamamlandı", description: `${catLabel((data as any).kategori)} · %${(data as any).guven_skoru}` });
    } catch (e: any) {
      const raw = e?.message ?? "";
      setError(trErr(raw) || "Uyuşmazlık türü tespit edilemedi. Lütfen tekrar deneyin.");
      toast({ title: "Sınıflandırma başarısız", description: trErr(raw) || "Bağlantı veya AI servisi hatası.", variant: "destructive" });
    } finally { setBusy(false); }
  }, [caseRow.id]);

  useEffect(() => {
    if (!autoRun || ranRef.current) return;
    if (caseRow.dispute_type) return; // already classified
    if ((initialText ?? "").trim().length < 10) return;
    ranRef.current = true;
    runClassify(initialText);
  }, [autoRun, caseRow.dispute_type, initialText, runClassify]);

  async function saveManual(value: string) {
    setSavingManual(true);
    try {
      const { error } = await supabase.from("cases").update({ dispute_type: value } as any).eq("id", caseRow.id);
      if (error) throw error;
      setManual(value);
      toast({ title: "Alan güncellendi", description: catLabel(value) });
    } catch (e: any) {
      toast({ title: "Güncellenemedi", description: trErr(e?.message ?? ""), variant: "destructive" });
    } finally { setSavingManual(false); }
  }

  const lowConfidence = result && result.guven_skoru < 60;
  const currentCat = manual || caseRow.dispute_type || result?.kategori || "";

  return (
    <Card className="p-6 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> AI Uyuşmazlık Türü Tespiti
        </h3>
        <Button size="sm" onClick={() => runClassify(text)} disabled={busy}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Analiz…</> : <><RefreshCw className="h-4 w-4 mr-1" /> {result ? "Yeniden Sınıflandır" : "Sınıflandır"}</>}
        </Button>
      </div>
      <div>
        <Label className="text-xs">Uyuşmazlık metni (başlık + kısa açıklama)</Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Örn: Kiracı 4 aydır kira ödemiyor, tahliye ve birikmiş kira talep ediliyor."
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2">
          <div className="text-xs text-destructive flex items-start gap-1">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => runClassify(text)} disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Deneniyor…</> : <><RefreshCw className="h-4 w-4 mr-1" /> Tekrar Dene</>}
          </Button>
        </div>
      )}

      {(result || caseRow.dispute_type) && (
        <div className="border rounded-md p-3 space-y-2 bg-muted/30">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm">
              <div>📋 <b>Tespit Edilen Alan:</b> {catLabel(currentCat)}</div>
              {result && (
                <>
                  <div className="text-xs text-muted-foreground">Güven: %{result.guven_skoru}</div>
                  {result.gerekce && <div className="text-xs mt-1"><span className="text-muted-foreground">Gerekçe:</span> {result.gerekce}</div>}
                  {result.ilgili_kanun?.length > 0 && (
                    <div className="text-xs mt-1">
                      <span className="text-muted-foreground">Dayanak:</span> {result.ilgili_kanun.join(", ")}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="min-w-[200px]">
              <Label className="text-[11px] text-muted-foreground">Değiştir</Label>
              <Select value={manual || undefined} onValueChange={saveManual} disabled={savingManual}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Manuel seç…" />
                </SelectTrigger>
                <SelectContent>
                  {DISPUTE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {lowConfidence && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-1">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              AI bu konuyu %{result!.guven_skoru} güvenle sınıflandırdı. Lütfen doğru alanı manuel seçin.
            </div>
          )}
        </div>
      )}

      {!result && !caseRow.dispute_type && !busy && (
        <p className="text-xs text-muted-foreground italic">
          Metni yazıp "Sınıflandır" butonuna basın; AI, Türk hukuku ve bilgi tabanı kaynaklarına göre alanı tespit edecek.
        </p>
      )}
    </Card>
  );
}

/* ===================== PHASE 2 - PARTIES ===================== */

function Phase2Parties({ caseRow, isMediator, userId, onDone }: { caseRow: CaseRow; isMediator: boolean; userId: string; onDone: () => void }) {
  const [parties, setParties] = useState<any[]>([]);
  const [draft, setDraft] = useState<PartyDraft | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("case_parties").select("*").eq("case_id", caseRow.id).order("created_at");
    setParties(data ?? []);
    setLoading(false);
  }, [caseRow.id]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!draft) return;
    if (!draft.kvkk_ok) { toast({ title: "KVKK onayı gerekli", variant: "destructive" }); return; }
    const isInd = draft.party_type === "individual";
    if (isInd && !(draft.first_name && draft.last_name)) { toast({ title: "Ad ve soyad zorunlu", variant: "destructive" }); return; }
    if (!isInd && !draft.company_name) { toast({ title: "Kurum adı zorunlu", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const full_name = isInd ? `${draft.first_name} ${draft.last_name}`.trim() : draft.company_name!;
      const { data: inserted, error } = await supabase.from("case_parties").insert({
        case_id: caseRow.id,
        user_id: !isMediator && parties.length === 0 ? userId : null,
        party_type: draft.party_type,
        is_individual: isInd,
        party_role: draft.party_role,
        role: draft.party_role,
        // invite_token is issued server-side by send-party-invite (kept private from case owner)
        invite_status: "pending",
        first_name: draft.first_name ?? null,
        last_name: draft.last_name ?? null,
        full_name,
        tc_kimlik: draft.tc_kimlik ?? null,
        birth_date: draft.birth_date || null,
        address: draft.address ?? null,
        gsm: draft.gsm ?? null,
        phone: draft.phone ?? null,
        email: draft.email ?? null,
        company_name: draft.company_name ?? null,
        tax_office: draft.tax_office ?? null,
        tax_number: draft.tax_number ?? null,
        trade_registry_no: draft.trade_registry_no ?? null,
        authorized_person: draft.authorized_person ?? null,
      } as any).select().single();
      if (error) throw error;
      if (draft.email) {
        supabase.functions.invoke("send-party-invite", { body: { party_id: (inserted as any).id, app_url: window.location.origin } }).catch(()=>{});
      }
      toast({ title: "Taraf eklendi" });
      setDraft(null);
      load();
    } catch (e: any) {
      toast({ title: "Taraf eklenemedi", description: trErr(e.message), variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("case_parties").delete().eq("id", id);
    if (error) toast({ title: "Silinemedi", description: trErr(error.message), variant: "destructive" });
    else load();
  }

  async function saveEdit() {
    if (!editing) return;
    const isInd = editing.party_type === "individual";
    if (isInd && !(editing.first_name && editing.last_name)) { toast({ title: "Ad ve soyad zorunlu", variant: "destructive" }); return; }
    if (!isInd && !editing.company_name) { toast({ title: "Kurum adı zorunlu", variant: "destructive" }); return; }
    setSavingEdit(true);
    try {
      const full_name = isInd
        ? `${editing.first_name ?? ""} ${editing.last_name ?? ""}`.trim()
        : (editing.company_name ?? "");
      const patch: any = {
        first_name: editing.first_name ?? null,
        last_name: editing.last_name ?? null,
        full_name,
        tc_kimlik: editing.tc_kimlik ?? null,
        birth_date: editing.birth_date || null,
        address: editing.address ?? null,
        gsm: editing.gsm ?? null,
        phone: editing.phone ?? null,
        email: editing.email ?? null,
        company_name: editing.company_name ?? null,
        tax_office: editing.tax_office ?? null,
        tax_number: editing.tax_number ?? null,
        trade_registry_no: editing.trade_registry_no ?? null,
        authorized_person: editing.authorized_person ?? null,
      };
      const { error } = await supabase.from("case_parties").update(patch).eq("id", editing.id);
      if (error) throw error;
      toast({ title: "Taraf bilgileri güncellendi" });
      setEditing(null);
      load();
    } catch (e: any) {
      toast({ title: "Güncelleme başarısız", description: trErr(e.message), variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  }

  return (

    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-primary">Aşama 2 — Taraflar</h2>
          <Button onClick={() => setDraft(emptyParty(parties.length === 0 ? "applicant" : "respondent"))}>
            <Plus className="h-4 w-4 mr-1" /> Taraf Ekle
          </Button>
        </div>
        {loading ? <Loader2 className="animate-spin" /> : parties.length === 0 ? (
          <p className="text-muted-foreground">Henüz taraf eklenmedi.</p>
        ) : (
          <div className="space-y-2">
            {parties.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{p.full_name || p.company_name || "(isimsiz)"}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.party_role === "applicant" ? "Başvurucu" : p.party_role === "respondent" ? "Karşı Taraf" : "Üçüncü Taraf"}
                    {" · "}{p.party_type === "corporate" ? "Kurumsal" : "Bireysel"}
                    {" · "}{p.email || "e-posta yok"}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing({ ...p })} title="Düzenle">
                    <Pencil className="h-4 w-4 mr-1" /> Düzenle
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(p.id)} title="Sil">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {parties.length >= 2 && (
          <div className="mt-4 flex justify-end">
            <Button variant="default" onClick={onDone}>Aşamayı Tamamla →</Button>
          </div>
        )}
      </Card>

      {draft && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Yeni Taraf</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Tür</Label>
              <Select value={draft.party_type} onValueChange={(v: any) => setDraft({ ...draft, party_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Bireysel</SelectItem>
                  <SelectItem value="corporate">Kurumsal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rol</Label>
              <Select value={draft.party_role} onValueChange={(v: any) => setDraft({ ...draft, party_role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="applicant">Başvurucu</SelectItem>
                  <SelectItem value="respondent">Karşı Taraf</SelectItem>
                  <SelectItem value="third_party">Üçüncü Taraf</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {draft.party_type === "individual" ? (
              <>
                <div><Label>Ad *</Label><Input value={draft.first_name ?? ""} onChange={(e) => setDraft({ ...draft, first_name: e.target.value })} /></div>
                <div><Label>Soyad *</Label><Input value={draft.last_name ?? ""} onChange={(e) => setDraft({ ...draft, last_name: e.target.value })} /></div>
                <div><Label>TC Kimlik No</Label><Input value={draft.tc_kimlik ?? ""} onChange={(e) => setDraft({ ...draft, tc_kimlik: e.target.value })} /></div>
                <div><Label>Doğum Tarihi</Label><Input type="date" value={draft.birth_date ?? ""} onChange={(e) => setDraft({ ...draft, birth_date: e.target.value })} /></div>
                <div><Label>GSM</Label><Input value={draft.gsm ?? ""} onChange={(e) => setDraft({ ...draft, gsm: e.target.value })} /></div>
                <div><Label>Telefon</Label><Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
              </>
            ) : (
              <>
                <div><Label>Kurum Adı *</Label><Input value={draft.company_name ?? ""} onChange={(e) => setDraft({ ...draft, company_name: e.target.value })} /></div>
                <div><Label>Yetkili Kişi</Label><Input value={draft.authorized_person ?? ""} onChange={(e) => setDraft({ ...draft, authorized_person: e.target.value })} /></div>
                <div><Label>Vergi Dairesi</Label><Input value={draft.tax_office ?? ""} onChange={(e) => setDraft({ ...draft, tax_office: e.target.value })} /></div>
                <div><Label>Vergi No</Label><Input value={draft.tax_number ?? ""} onChange={(e) => setDraft({ ...draft, tax_number: e.target.value })} /></div>
                <div><Label>Ticaret Sicil No</Label><Input value={draft.trade_registry_no ?? ""} onChange={(e) => setDraft({ ...draft, trade_registry_no: e.target.value })} /></div>
                <div><Label>Telefon</Label><Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
              </>
            )}
            <div className="md:col-span-2"><Label>Adres</Label><Input value={draft.address ?? ""} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>E-posta (davet için)</Label><Input type="email" value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={!!draft.kvkk_ok} onCheckedChange={(v) => setDraft({ ...draft, kvkk_ok: !!v })} />
            <span>KVKK kapsamında kişisel verilerin işlenmesini onaylıyorum.</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>İptal</Button>
            <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tarafı Kaydet"}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ===================== PHASE 3 - PARTY ANALYSIS (docs + analysis + common ground) ===================== */

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXT = ["pdf", "doc", "docx", "txt"];
const ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

function partyDisplay(p: any) {
  return p.full_name || (p.party_type === "corporate" ? p.company_name : `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()) || "(isimsiz)";
}
function roleLabel(r?: string) {
  return r === "applicant" ? "Başvurucu" : r === "respondent" ? "Karşı Taraf" : "Üçüncü Taraf";
}

function Phase3PartyAnalysis({ caseRow, userId, isMediator, reload, onAdvance, bumpPhase }: {
  caseRow: CaseRow; userId: string; isMediator: boolean; reload: () => void;
  onAdvance: (n: number) => void; bumpPhase: (n: number) => Promise<void>;
}) {
  const [parties, setParties] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportFetchError, setReportFetchError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<{ partyId: string; msg: string } | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [reportAttempt, setReportAttempt] = useState(0);
  const [navigating, setNavigating] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    setReportFetchError(null);
    try {
      const { data, error } = await supabase
        .from("common_ground_reports")
        .select("*")
        .eq("case_id", caseRow.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setReport(data ?? null);
      setReportLoading(false);
      return data ?? null;
    } catch (e: any) {
      console.error("[fetchReport] failed", e);
      setReportFetchError(e?.message ?? "Rapor yüklenemedi.");
      setReport(null);
      setReportLoading(false);
      return null;
    }
  }, [caseRow.id]);

  const loadAll = useCallback(async () => {
    setLoadError(null);
    try {
      const [p, d, a] = await Promise.all([
        supabase.from("case_parties").select("*").eq("case_id", caseRow.id).order("created_at"),
        supabase.from("case_documents").select("*").eq("case_id", caseRow.id).order("created_at", { ascending: false }),
        supabase.from("party_analyses").select("*").eq("case_id", caseRow.id),
      ]);
      if (p.error) { console.error("[loadAll parties]", p.error); throw p.error; }
      if (d.error) console.error("[loadAll docs]", d.error);
      if (a.error) console.error("[loadAll analyses]", a.error);
      setParties(Array.isArray(p.data) ? p.data : []);
      setDocs(Array.isArray(d.data) ? d.data : []);
      setAnalyses(Array.isArray(a.data) ? a.data : []);
    } catch (e: any) {
      console.error("[loadAll] fatal", e);
      setLoadError(e?.message ?? "Bilinmeyen hata");
      toast({ title: "Veriler yüklenemedi", description: e?.message ?? "Bilinmeyen hata", variant: "destructive" });
    } finally {
      setInitialLoading(false);
    }
    await fetchReport();
  }, [caseRow.id, fetchReport]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleUpload(partyId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    for (const f of files) {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED_EXT.includes(ext) && !ALLOWED_MIME.includes(f.type)) {
        toast({ title: "Geçersiz dosya türü", description: `"${f.name}" yalnızca PDF, Word veya metin dosyası olabilir.`, variant: "destructive" });
        e.target.value = ""; return;
      }
      if (f.size > MAX_SIZE) {
        toast({ title: "Dosya çok büyük", description: `"${f.name}" 10MB sınırını aşıyor.`, variant: "destructive" });
        e.target.value = ""; return;
      }
    }

    setUploading(partyId);
    try {
      for (const f of files) {
        const safeName = f.name.replace(/[^\w.\-]+/g, "_");
        const path = `${userId}/${caseRow.id}/${partyId}-${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage.from("case-documents").upload(path, f, {
          cacheControl: "3600", upsert: false, contentType: f.type || undefined,
        });
        if (upErr) {
          const msg = /row-level security|not authorized|permission/i.test(upErr.message)
            ? "Bu başvuruya belge yükleme yetkiniz yok."
            : `Depolama hatası: ${upErr.message}`;
          throw new Error(msg);
        }
        const { error: insErr } = await supabase.from("case_documents").insert({
          case_id: caseRow.id, party_id: partyId,
          file_name: f.name, file_path: path, file_size: f.size, mime_type: f.type, uploaded_by: userId,
        } as any);
        if (insErr) {
          await supabase.storage.from("case-documents").remove([path]);
          throw new Error(`Veritabanı hatası: ${insErr.message}`);
        }
      }
      toast({ title: "Belge yüklendi" });
      loadAll();
    } catch (err: any) {
      toast({ title: "Yükleme başarısız", description: err?.message ?? "Bilinmeyen hata", variant: "destructive" });
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  }

  async function deleteDoc(d: any) {
    await supabase.storage.from("case-documents").remove([d.file_path]);
    await supabase.from("case_documents").delete().eq("id", d.id);
    loadAll();
  }

  async function runAnalysis(partyId: string) {
    setAnalysing(partyId);
    setAnalysisError(null);
    try {
      const { data, error } = await supabase.functions.invoke("party-confidential-analysis", {
        body: { case_id: caseRow.id, party_id: partyId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Taraf analizi tamamlandı" });
      loadAll();
    } catch (e: any) {
      const msg = e?.message?.includes("Forbidden")
        ? "Bu analiz için yetkiniz yok."
        : e?.message || "AI servisine ulaşılamadı.";
      setAnalysisError({ partyId, msg });
      toast({ title: "Analiz hatası", description: msg, variant: "destructive" });
    } finally { setAnalysing(null); }
  }

  async function generateReport() {
    setReportBusy(true);
    setReportError(null);
    setReportAttempt(0);
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      setReportAttempt(attempt);
      setReportStatus(
        attempt === 1
          ? "Rapor hazırlanıyor…"
          : `Yeniden deneniyor (${attempt}/${MAX_ATTEMPTS})…`,
      );
      try {
        const { data, error } = await supabase.functions.invoke("common-ground-report", { body: { case_id: caseRow.id } });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        const fresh = await fetchReport();
        if (!fresh) throw new Error("Rapor kaydı oluşturulamadı.");
        toast({ title: "Ortak zemin raporu hazır" });
        setReportStatus(null);
        setReportBusy(false);
        setReportAttempt(0);
        reload();
        return;
      } catch (e: any) {
        console.error(`[common-ground-report] attempt ${attempt} failed`, e);
        const raw = e?.message || "";
        const friendly = /multiple .* rows|JSON object requested/i.test(raw)
          ? "Sistem hatası oluştu, lütfen tekrar deneyin."
          : raw || "Rapor üretilemedi.";
        if (attempt < MAX_ATTEMPTS) {
          // Exponential backoff: 800ms, 1600ms
          await new Promise((r) => setTimeout(r, 800 * attempt));
          continue;
        }
        setReportError(friendly);
        setReportStatus(null);
        setReportBusy(false);
        setReportAttempt(0);
        toast({ title: "Rapor hatası", description: friendly, variant: "destructive" });
        return;
      }
    }
  }

  async function chooseMeeting(meetingType: "ozel" | "ortak") {
    setNavigating(true);
    try {
      // Pre-create a placeholder session with the chosen meeting_type (user can edit in Phase 5)
      await supabase.from("case_sessions").insert({
        case_id: caseRow.id, session_type: "joint", meeting_type: meetingType, status: "draft",
      } as any).select().maybeSingle();
      await bumpPhase(5);
      onAdvance(5);
    } catch (e: any) {
      toast({ title: "Geçiş hatası", description: trErr(e.message), variant: "destructive" });
    } finally { setNavigating(false); }
  }

  const analysedCount = analyses.length;
  const canReport = analysedCount >= 1;
  const partialReport = analysedCount >= 1 && analysedCount < parties.length;

  const progressPct = parties.length ? Math.round((analysedCount / parties.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {initialLoading ? (
        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Taraf verileri yükleniyor…
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
            <div className="h-16 bg-muted rounded animate-pulse" />
            <div className="h-16 bg-muted rounded animate-pulse" />
          </div>
        </Card>

      ) : loadError ? (
        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-destructive font-semibold">
            <AlertTriangle className="h-5 w-5" /> Veriler yüklenemedi
          </div>
          <p className="text-xs text-muted-foreground break-words">{loadError}</p>
          <Button size="sm" onClick={loadAll}><RefreshCw className="h-4 w-4 mr-1" /> Yenile</Button>
        </Card>
      ) : (
      <>
      <Card className="p-6 space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-primary">Aşama 3 — Taraf Analizi</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Her tarafa ait bilgileri görüntüleyin, belge yükleyin ve AI analizi başlatın. En az 1 taraf analiz edildiğinde Ortak Zemin Raporu üretebilirsiniz.
            </p>
          </div>
          <div className="text-right text-xs space-y-1 min-w-[180px]">
            <div className="font-medium">Taraf Analizi: {analysedCount}/{parties.length} taraf analiz edildi</div>
            <Progress value={progressPct} className="h-2" />
            {reportLoading
              ? <div className="text-muted-foreground flex items-center gap-1 justify-end"><Loader2 className="h-3 w-3 animate-spin" /> Rapor yükleniyor…</div>
              : report
                ? <div className="text-emerald-600 font-semibold">✓ Ortak Zemin Raporu Hazır</div>
                : canReport
                  ? <div className="text-muted-foreground">Ortak Zemin Raporu üretilebilir</div>
                  : <div className="text-muted-foreground">Rapor için en az 1 analiz gerekli</div>}
          </div>
        </div>
      </Card>

      <DisputeClassifierCard caseRow={caseRow} initialText={caseRow.title ?? ""} />

      {/* Persistent report panel — always visible right under progress */}
      <Card className="p-6 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-lg font-semibold">Ortak Zemin Raporu</h3>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="ghost" onClick={fetchReport} disabled={reportLoading} title="Raporu yeniden yükle">
              {reportLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
            {report && (
              <>
                <Button size="sm" variant="outline" onClick={() => downloadReport({ caseTitle: caseRow.title, caseId: caseRow.id, report: report.report, strategy: report.strategy, mode: "print" })} title="PDF olarak yazdır">
                  PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadReport({ caseTitle: caseRow.title, caseId: caseRow.id, report: report.report, strategy: report.strategy, mode: "html" })} title="HTML olarak indir">
                  İndir
                </Button>
              </>
            )}
            <Button onClick={generateReport} disabled={!canReport || reportBusy} size="sm">
              {reportBusy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> {reportStatus ?? "Rapor hazırlanıyor…"}</> : <><Sparkles className="h-4 w-4 mr-1" /> {report ? "Yeniden Üret" : "Rapor Üret"}</>}
            </Button>
          </div>
        </div>
        {reportBusy && reportAttempt > 1 && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Geçici bir hata oluştu, otomatik olarak tekrar deneniyor ({reportAttempt}/3)…
          </div>
        )}
        {reportFetchError && (
          <div className="text-xs text-destructive flex items-center gap-2">
            <AlertTriangle className="h-3 w-3" /> Rapor yüklenemedi: {reportFetchError}
            <Button size="sm" variant="outline" onClick={fetchReport}><RefreshCw className="h-3 w-3 mr-1" />Tekrar Dene</Button>
          </div>
        )}
        {reportError && (
          <div className="text-xs text-destructive flex items-center gap-2">
            <AlertTriangle className="h-3 w-3" /> {reportError}
            <Button size="sm" variant="outline" onClick={generateReport}><RefreshCw className="h-3 w-3 mr-1" />Tekrar Dene</Button>
          </div>
        )}
        {!reportLoading && !report && !reportError && (
          <p className="text-sm text-muted-foreground italic">
            {canReport ? "Henüz rapor üretilmedi. \"Rapor Üret\" butonuna basın." : "En az 1 taraf analiz edildikten sonra rapor üretilebilir."}
          </p>
        )}
        {partialReport && !report && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-2">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>Şu an {analysedCount}/{parties.length} taraf analiz edilmiş. Rapor üretebilirsiniz ancak eksik taraflar için içerik sınırlı olacaktır.</span>
          </div>
        )}
        {report && (
          <>
            {partialReport && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-2">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>Henüz analiz edilmemiş taraf var, rapor eksik olabilir. Tam karşılaştırmalı rapor için tüm tarafları analiz edip "Yeniden Üret" butonuna basın.</span>
              </div>
            )}
            <CommonGroundView data={report.report} strategy={report.strategy} parties={parties} analyses={analyses} caseId={caseRow.id} />
          </>
        )}
      </Card>



      {parties.length === 0 && (
        <Card className="p-6 space-y-2">
          <div className="font-semibold">Taraflar bulunamadı</div>
          <p className="text-sm text-muted-foreground">Bu başvuruya henüz taraf eklenmemiş. Aşama 2 — Taraf Bilgileri ekranından en az iki taraf ekleyin, ardından bu adımda belge yükleyip analiz başlatabilirsiniz.</p>
        </Card>
      )}

      <div className="space-y-3">
        {parties.map((p) => {
          const partyDocs = docs.filter((d) => d.party_id === p.id);
          const a = analyses.find((x) => x.party_id === p.id);
          const open = openId === p.id;
          const an = a?.analysis ?? {};
          return (
            <Card key={p.id} className="overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : p.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition"
              >
                <div className="text-left">
                  <div className="font-semibold">{partyDisplay(p)}</div>
                  <div className="text-xs text-muted-foreground">
                    {roleLabel(p.party_role)} · {p.party_type === "corporate" ? "Kurumsal" : "Bireysel"} · {partyDocs.length} belge
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a && <Badge variant="secondary">Analiz hazır</Badge>}
                  {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              {open && (
                <div className="border-t p-4 space-y-4">
                  {/* Step indicator */}
                  <div className="flex items-center gap-2 text-xs">
                    <StepDot done={partyDocs.length > 0} label="1. Belge yüklendi" />
                    <span className="text-muted-foreground">→</span>
                    <StepDot done={!!a} active={analysing === p.id} label="2. AI analiz edildi" />
                    <span className="text-muted-foreground">→</span>
                    <StepDot done={!!report && !!a} label="3. Ortak zemine dahil" />
                  </div>

                  {/* Party info */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {p.tc_kimlik && <div><span className="text-muted-foreground">TC:</span> {p.tc_kimlik}</div>}
                    {p.tax_number && <div><span className="text-muted-foreground">Vergi No:</span> {p.tax_number}</div>}
                    {p.email && <div><span className="text-muted-foreground">E-posta:</span> {p.email}</div>}
                    {p.gsm && <div><span className="text-muted-foreground">GSM:</span> {p.gsm}</div>}
                    {p.address && <div className="col-span-2"><span className="text-muted-foreground">Adres:</span> {p.address}</div>}
                  </div>

                  {/* Per-party docs */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">Belgeler</div>
                      <label className="text-xs cursor-pointer text-primary hover:underline flex items-center gap-1">
                        {uploading === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        Belge Yükle
                        <input type="file" multiple className="hidden"
                          accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                          onChange={(e) => handleUpload(p.id, e)} disabled={uploading === p.id} />
                      </label>
                    </div>
                    {partyDocs.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Bu taraf için belge yok.</p>
                    ) : (
                      <ul className="space-y-1">
                        {partyDocs.map((d) => (
                          <li key={d.id} className="flex items-center gap-2 text-sm p-2 border rounded">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="flex-1 truncate">{d.file_name}</span>
                            <Button variant="ghost" size="sm" onClick={() => deleteDoc(d)}><Trash2 className="h-3 w-3" /></Button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {partyDocs.some((d) => !(d.mime_type ?? "").startsWith("text/") && !d.file_name?.toLowerCase().endsWith(".txt")) && (
                      <p className="text-[11px] text-amber-600 mt-1 flex items-start gap-1">
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        Uyarı: PDF/Word belgelerin içeriği tam okunamayabilir. Daha doğru analiz için kritik metinleri .txt olarak da yükleyebilirsiniz.
                      </p>
                    )}
                  </div>


                  {/* Analysis trigger */}
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" onClick={() => runAnalysis(p.id)} disabled={analysing === p.id}>
                      {analysing === p.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                      {a ? "Yeniden Analiz Et" : "Analiz Başlat"}
                    </Button>
                    {analysisError?.partyId === p.id && (
                      <Button size="sm" variant="outline" onClick={() => runAnalysis(p.id)}>
                        <RefreshCw className="h-4 w-4 mr-1" /> Tekrar Dene
                      </Button>
                    )}
                  </div>
                  {analysisError?.partyId === p.id && (
                    <div className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {analysisError.msg}
                    </div>
                  )}

                  {!a && analysing !== p.id && !analysisError && (
                    <div className="text-xs text-muted-foreground italic flex items-start gap-1 p-2 border border-dashed rounded">
                      <Circle className="h-3 w-3 mt-0.5" />
                      Analiz henüz yapılmadı. {partyDocs.length === 0 ? "Önce belge yükleyin, ardından" : ""} “Analiz Başlat” butonuna basın.
                    </div>
                  )}
                  {analysing === p.id && (
                    <div className="text-xs text-muted-foreground flex items-center gap-2 p-2 border rounded bg-muted/30">
                      <Loader2 className="h-3 w-3 animate-spin" /> Analiz yapılıyor, lütfen bekleyin…
                    </div>
                  )}


                  {/* Analysis result */}
                  {a && (
                    <div className="space-y-2">
                      <RiskAnalysisCard
                        risk={an.risk_analizi ?? (a as any).risk_analizi}
                        sources={an.sources}
                        onRefresh={() => runAnalysis(p.id)}
                        refreshing={analysing === p.id}
                      />

                      {an.dispute_area && (
                        <AnaSection icon="🔍" title="Uyuşmazlık Türü">

                          <p className="text-sm">{safeText(an.dispute_area)}</p>
                        </AnaSection>
                      )}
                      {an.legal_framework && (
                        <AnaSection icon="⚖️" title="Hukuki Çerçeve">
                          {safeList(an.legal_framework.statutes).length > 0 && (
                            <div className="text-sm">
                              <div className="font-medium">Mevzuat:</div>
                              <ul className="list-disc pl-5">{safeList(an.legal_framework.statutes).map((s, i) => <li key={i}>{s}</li>)}</ul>
                            </div>
                          )}
                          {Array.isArray(an.legal_framework.precedents) && an.legal_framework.precedents.length > 0 && (
                            <div className="text-sm mt-2">
                              <div className="font-medium">Emsal Kararlar:</div>
                              <ul className="list-disc pl-5">
                                {an.legal_framework.precedents.map((pr: any, i: number) => (
                                  <li key={i}><b>{safeText(pr?.court)}:</b> {safeText(pr?.decision)} <span className="text-muted-foreground">— {safeText(pr?.relevance)}</span></li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </AnaSection>
                      )}
                      {safeList(an.document_findings).length > 0 && (
                        <AnaSection icon="📄" title="Belge Bulguları">
                          <ul className="list-disc pl-5 text-sm">{safeList(an.document_findings).map((f, i) => <li key={i}>{f}</li>)}</ul>
                        </AnaSection>
                      )}
                      {an.party_position && (
                        <AnaSection icon="👤" title="Taraf Analizi">
                          <PosBlock label="Güçlü Yanlar" items={safeList(an.party_position.strengths)} />
                          <PosBlock label="Zayıf Yanlar" items={safeList(an.party_position.weaknesses)} />
                          <PosBlock label="İhtiyaçlar" items={safeList(an.party_position.interests)} />
                          {an.party_position.batna && <div className="text-sm mt-1"><b>BATNA:</b> {safeText(an.party_position.batna)}</div>}
                          {an.party_position.watna && <div className="text-sm"><b>WATNA:</b> {safeText(an.party_position.watna)}</div>}
                        </AnaSection>
                      )}
                      {Array.isArray(an.discovery_questions) && an.discovery_questions.length > 0 && (
                        <AnaSection icon="❓" title="İhtiyaç Soruları">
                          <ol className="list-decimal pl-5 text-sm space-y-1">
                            {an.discovery_questions.map((q: any, i: number) => <li key={i}>{safeText(q?.question ?? q)}</li>)}
                          </ol>
                        </AnaSection>
                      )}
                      <SourcesPanel sources={an.sources} />
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Next-step meeting CTA — shown only when report exists */}
      {report && (
        <Card className="p-6 space-y-2">
          <p className="text-xs text-muted-foreground">Sonraki adım: Taraflarla görüşme planlayın</p>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => chooseMeeting("ozel")} disabled={navigating} variant="outline">
              <CalIcon className="h-4 w-4 mr-1" /> Özel Görüşme Planla
            </Button>
            <Button onClick={() => chooseMeeting("ortak")} disabled={navigating}>
              <CalIcon className="h-4 w-4 mr-1" /> Ortak Görüşme Planla
            </Button>
          </div>
        </Card>
      )}
      </>
      )}
    </div>
  );
}

function StepDot({ done, active, label }: { done: boolean; active?: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${done ? "bg-emerald-50 border-emerald-300 text-emerald-700" : active ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-muted/40 border-border text-muted-foreground"}`}>
      {done ? <CheckCircle2 className="h-3 w-3" /> : active ? <Loader2 className="h-3 w-3 animate-spin" /> : <Circle className="h-3 w-3" />}
      {label}
    </span>
  );
}

function AnaSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-md p-3 bg-muted/30">
      <div className="font-medium text-sm mb-1">{icon} {title}</div>
      {children}
    </div>
  );
}
function PosBlock({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="text-sm mt-1">
      <span className="font-medium">{label}:</span>
      <ul className="list-disc pl-5">{items.map((s, i) => <li key={i}>{s}</li>)}</ul>
    </div>
  );
}
function CommonGroundView({ data, strategy, parties, analyses, caseId }: { data: any; strategy: any; parties?: any[]; analyses?: any[]; caseId?: string }) {
  if (!data) return null;
  return (
    <div className="space-y-2">
      {data.common_interests?.length > 0 && (
        <AnaSection icon="🤝" title="Ortak Çıkarlar">
          <ul className="list-disc pl-5 text-sm">{data.common_interests.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
        </AnaSection>
      )}
      {data.zopa && (
        <AnaSection icon="📊" title="Uzlaşma Alanı (ZOPA)">
          <p className="text-sm">{data.zopa.description}</p>
          {(data.zopa.lower_bound || data.zopa.upper_bound) && (
            <p className="text-xs text-muted-foreground mt-1">Alt: {data.zopa.lower_bound} — Üst: {data.zopa.upper_bound}</p>
          )}
        </AnaSection>
      )}
      {data.scenarios?.length > 0 && (
        <AnaSection icon="📋" title="Çözüm Senaryoları">
          <div className="space-y-2">
            {data.scenarios.map((sc: any, i: number) => (
              <div key={i} className="border rounded p-2 bg-background">
                <div className="font-medium text-sm">{sc.label}</div>
                <p className="text-sm">{sc.summary}</p>
                {sc.tradeoffs?.length > 0 && (
                  <ul className="list-disc pl-5 text-xs text-muted-foreground">{sc.tradeoffs.map((t: string, j: number) => <li key={j}>{t}</li>)}</ul>
                )}
              </div>
            ))}
          </div>
        </AnaSection>
      )}
      {(strategy || data.mediator_strategy) && (
        <AnaSection icon="🎯" title="Arabulucu Stratejisi">
          {(() => {
            const s = strategy || data.mediator_strategy || {};
            return (
              <div className="text-sm space-y-1">
                {s.opening_statement && <div><b>Açılış:</b> {s.opening_statement}</div>}
                {s.critical_questions?.length > 0 && (
                  <div><b>Kritik Sorular:</b><ul className="list-disc pl-5">{s.critical_questions.map((q: string, i: number) => <li key={i}>{q}</li>)}</ul></div>
                )}
                {s.deadlock_techniques?.length > 0 && (
                  <div><b>Çıkmaz Teknikleri:</b><ul className="list-disc pl-5">{s.deadlock_techniques.map((q: string, i: number) => <li key={i}>{q}</li>)}</ul></div>
                )}
              </div>
            );
          })()}
        </AnaSection>
      )}
      {data.red_lines?.length > 0 && (
        <AnaSection icon="🚧" title="Kırmızı Çizgiler">
          <ul className="list-disc pl-5 text-sm">{data.red_lines.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
        </AnaSection>
      )}
      <ComparativeRiskAnalysis parties={parties} analyses={analyses} reportData={data} caseId={caseId} />
      <RiskSummaryCard summary={data.risk_ozeti} sources={data.sources} />
      <SourcesPanel sources={data.sources} />
    </div>
  );
}

// ── Karşılaştırmalı Risk & Anlaşma Analizi ──
// İki tarafın risk_analizi verisini yan yana gösterir, ortalama uzlaşma oranı,
// ZOPA aralığı ve en güçlü senaryoyu hesaplar. Sonucu common_ground_reports.risk_ozeti
// alanına (eksikse) kaydeder.
function parsePercent(v: any): number | null {
  if (v === null || v === undefined) return null;
  const m = String(v).match(/(\d+(?:[.,]\d+)?)\s*%?/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  return isNaN(n) ? null : n;
}
function partyDisplayName(cp: any, idx: number): string {
  if (!cp) return `Taraf ${idx + 1}`;
  return cp.company_name || `${cp.first_name ?? ""} ${cp.last_name ?? ""}`.trim() || `Taraf ${idx + 1}`;
}
function ComparativeRiskAnalysis({
  parties, analyses, reportData, caseId,
}: { parties?: any[]; analyses?: any[]; reportData: any; caseId?: string }) {
  const rows = React.useMemo(() => {
    const list = Array.isArray(analyses) ? analyses : [];
    return list.map((a: any, i: number) => {
      const cp = (parties ?? []).find((p) => p.id === a.party_id) || a.case_parties || null;
      const r = a.risk_analizi || {};
      return {
        name: partyDisplayName(cp, i),
        risk_puani: r.risk_puani,
        uzlasma_orani: r.uzlasma_orani,
        uzlasma_pct: parsePercent(r.uzlasma_orani),
        mahkeme_riski: r.mahkeme_riski,
        mahkeme_pct: parsePercent(r.mahkeme_riski),
      };
    });
  }, [parties, analyses]);

  const avgUzlasma = React.useMemo(() => {
    const vals = rows.map((r) => r.uzlasma_pct).filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [rows]);

  const strongestScenario = React.useMemo(() => {
    const scs = Array.isArray(reportData?.scenarios) ? reportData.scenarios : [];
    return scs.find((s: any) => /dengeli/i.test(String(s?.label))) || scs[0] || null;
  }, [reportData]);

  const zopa = reportData?.zopa;

  const persistedRef = React.useRef(false);
  React.useEffect(() => {
    if (persistedRef.current) return;
    if (!caseId) return;
    if (reportData?.risk_ozeti && Object.keys(reportData.risk_ozeti).length > 0) return;
    if (rows.length < 2) return;
    persistedRef.current = true;
    const summary = {
      genel_uzlasma_orani: avgUzlasma !== null ? `% ${avgUzlasma} (taraf ortalaması)` : "Yeterli veri yok",
      genel_uzlasma_orani_kaynak: "İki tarafın risk_analizi ortalaması",
      genel_risk_puani: rows.find((r) => /yük/i.test(String(r.risk_puani)))?.risk_puani
        || rows.find((r) => /orta/i.test(String(r.risk_puani)))?.risk_puani
        || rows[0]?.risk_puani || "",
      taraf_karsilastirma: rows.map((r) => ({
        taraf: r.name, risk_puani: r.risk_puani || "",
        guclu_yon: r.uzlasma_orani ? `Uzlaşma: ${r.uzlasma_orani}` : "",
        zayif_yon: r.mahkeme_riski ? `Mahkeme riski: ${r.mahkeme_riski}` : "",
      })),
      ortak_kritik_faktorler: [],
      ortak_uzlasma_engelleri: [],
      kaynak_listesi: [],
      arabulucu_onerisi: strongestScenario?.summary ? `Önerilen yön: ${strongestScenario.label} — ${strongestScenario.summary}` : "",
    };
    (async () => {
      try {
        const { data: existing } = await supabase
          .from("common_ground_reports").select("id, report").eq("case_id", caseId)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (!existing) return;
        const nextReport = { ...((existing as any).report ?? {}), risk_ozeti: summary };
        await supabase.from("common_ground_reports")
          .update({ risk_ozeti: summary as any, report: nextReport as any })
          .eq("id", (existing as any).id);
      } catch (e) { console.warn("[ComparativeRiskAnalysis] persist failed", e); }
    })();
  }, [caseId, avgUzlasma, rows, strongestScenario, reportData?.risk_ozeti]);

  if (rows.length === 0) return null;

  const anyRiskData = rows.some((r) => r.risk_puani || r.uzlasma_orani || r.mahkeme_riski);
  if (!anyRiskData) {
    return (
      <div className="border rounded-lg p-4 bg-amber-50 border-amber-200 text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold mb-0.5">Karşılaştırmalı risk verisi bulunamadı</div>
          Taraf analizlerinde henüz <code className="font-mono">risk_analizi</code> alanı yok. Aşama 3'te "Risk Analizini Güncelle" butonu ile her taraf için risk analizini yeniden üretin.
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-primary/5 border-primary/30">
      <div className="font-semibold text-sm">📊 Karşılaştırmalı Risk & Anlaşma Analizi</div>


      <div className="grid sm:grid-cols-2 gap-2">
        {rows.map((r, i) => (
          <div key={i} className="border rounded p-3 bg-background text-sm space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium truncate">{r.name}</div>
              {r.risk_puani && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${riskBadgeTone(r.risk_puani)}`}>{r.risk_puani}</span>
              )}
            </div>
            <div className="text-xs"><span className="text-muted-foreground">Anlaşma oranı: </span><b>{r.uzlasma_orani || "Yeterli veri yok"}</b></div>
            <div className="text-xs"><span className="text-muted-foreground">Mahkeme riski: </span><b>{r.mahkeme_riski || "Yeterli veri yok"}</b></div>
            {r.uzlasma_pct !== null && (
              <div className="h-1.5 rounded bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, r.uzlasma_pct))}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <div className="border rounded p-3 bg-background">
          <div className="text-xs text-muted-foreground">Genel Uzlaşma Tahmini (ortalama)</div>
          <div className="text-lg font-semibold">
            {avgUzlasma !== null ? `% ${avgUzlasma}` : "Yeterli veri yok"}
          </div>
          {avgUzlasma !== null && (
            <div className="h-2 rounded bg-muted overflow-hidden mt-1">
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, avgUzlasma)}%` }} />
            </div>
          )}
          <div className="text-[11px] text-muted-foreground mt-1 italic">Tarafların risk_analizi verilerinden hesaplandı</div>
        </div>

        <div className="border rounded p-3 bg-background">
          <div className="text-xs text-muted-foreground">Uzlaşma Alanı (ZOPA)</div>
          {zopa && (zopa.lower_bound || zopa.upper_bound || zopa.description) ? (
            <>
              <div className="text-sm font-medium">
                {zopa.lower_bound || "?"} <span className="text-muted-foreground">↔</span> {zopa.upper_bound || "?"}
              </div>
              <div className="relative h-2 rounded bg-muted overflow-hidden mt-1">
                <div className="absolute inset-y-0 left-[15%] right-[15%] bg-primary/60 rounded" />
              </div>
              {zopa.description && <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{zopa.description}</div>}
            </>
          ) : (
            <div className="text-sm italic text-muted-foreground">ZOPA bilgisi henüz yok</div>
          )}
        </div>
      </div>

      {strongestScenario && (
        <div className="border rounded p-3 bg-background">
          <div className="text-xs text-muted-foreground">Ortak Zemin Bazında Önerilen Senaryo</div>
          <div className="text-sm font-medium">⭐ {strongestScenario.label}</div>
          {strongestScenario.summary && <div className="text-xs mt-0.5">{strongestScenario.summary}</div>}
        </div>
      )}
    </div>
  );
}

// ── Standardized risk-level tone helpers (used by every risk-badge/card) ──
export function normalizeRiskLevel(raw?: string): "low" | "medium" | "high" | "unknown" {
  const l = String(raw ?? "").toLowerCase();
  if (l.includes("yük") || l.includes("high")) return "high";
  if (l.includes("orta") || l.includes("medium") || l.includes("mid")) return "medium";
  if (l.includes("düş") || l.includes("dus") || l.includes("low")) return "low";
  return "unknown";
}
export function riskContainerTone(raw?: string): string {
  switch (normalizeRiskLevel(raw)) {
    case "high": return "border-red-400/50 bg-red-50/60 dark:bg-red-950/20";
    case "medium": return "border-amber-400/50 bg-amber-50/60 dark:bg-amber-950/20";
    case "low": return "border-emerald-400/50 bg-emerald-50/60 dark:bg-emerald-950/20";
    default: return "border-border bg-muted/30";
  }
}
export function riskBadgeTone(raw?: string): string {
  switch (normalizeRiskLevel(raw)) {
    case "high": return "bg-red-600 text-white";
    case "medium": return "bg-amber-500 text-white";
    case "low": return "bg-emerald-600 text-white";
    default: return "bg-muted text-foreground";
  }
}

// Match a knowledge-base source (with excerpt/url) to a name that came back inside kaynak_listesi.
function matchSource(name: string, sources?: any[]): any | null {
  if (!Array.isArray(sources) || !name) return null;
  const norm = (s: string) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  const target = norm(name);
  return sources.find((s: any) => {
    const t = norm(s?.title);
    return t && (t === target || t.includes(target) || target.includes(t));
  }) ?? null;
}

function SourceChip({ name, source }: { name: string; source: any | null }) {
  const excerpt = source?.excerpt ? cleanExcerpt(source.excerpt) : "";
  if (!source) {
    return (
      <span className="inline-block text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
        {name}
      </span>
    );
  }
  return (
    <HoverCard openDelay={80} closeDelay={100}>
      <HoverCardTrigger asChild>
        {source.url ? (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:underline cursor-pointer"
          >
            {name}
          </a>
        ) : (
          <span className="inline-block text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 cursor-help">
            {name}
          </span>
        )}
      </HoverCardTrigger>
      <HoverCardContent className="w-80 text-xs space-y-1" side="top">
        <div className="font-semibold">{source.title || name}</div>
        {source.category && <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{source.category}</div>}
        {excerpt && <blockquote className="italic border-l-2 pl-2 text-muted-foreground">"{excerpt}"</blockquote>}
        {typeof source.similarity === "number" && (
          <div className="text-[10px] text-muted-foreground">benzerlik %{Math.round(source.similarity * 100)}</div>
        )}
        {source.url && <div className="text-[10px] text-primary">Kaynağa git ↗</div>}
      </HoverCardContent>
    </HoverCard>
  );
}

// Guidance shown when a metric returns "Yeterli veri yok" so the mediator knows how to strengthen the analysis.
const NEEDS_MORE_DATA = /yeterli\s*veri\s*yok|insufficient|bilinmiyor|—+|^\s*-\s*$/i;
function isMissing(v: any): boolean {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  if (!s) return true;
  return NEEDS_MORE_DATA.test(s);
}
function MissingDataHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 text-[11px] flex items-start gap-1 rounded border border-dashed border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/10 p-2 text-amber-900 dark:text-amber-200">
      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function RiskAnalysisCard({
  risk, sources, onRefresh, refreshing,
}: { risk?: any; sources?: any[]; onRefresh?: () => void; refreshing?: boolean }) {
  if (!risk || typeof risk !== "object") return null;
  const tone = riskContainerTone(risk.risk_puani);
  const badgeTone = riskBadgeTone(risk.risk_puani);
  const missingAny =
    isMissing(risk.uzlasma_orani) || isMissing(risk.mahkeme_riski) || isMissing(risk.tahmini_sure_tasarrufu_ay);
  return (
    <div className={`border rounded-lg p-4 space-y-3 ${tone}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="font-semibold text-sm">📊 Risk Analizi & Anlaşma Oranı</div>
        <div className="flex items-center gap-2">
          {risk.risk_puani && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeTone}`}>{risk.risk_puani} Risk</span>
          )}
          {onRefresh && (
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Risk Analizini Güncelle
            </Button>
          )}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Anlaşma Oranı</div>
          <div className="font-medium">{safeText(risk.uzlasma_orani) || "Yeterli veri yok"}</div>
          {risk.uzlasma_orani_kaynak && <div className="text-[11px] text-muted-foreground italic">Kaynak: {safeText(risk.uzlasma_orani_kaynak)}</div>}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Mahkeme Riski</div>
          <div className="font-medium">{safeText(risk.mahkeme_riski) || "Yeterli veri yok"}</div>
          {risk.mahkeme_riski_kaynak && <div className="text-[11px] text-muted-foreground italic">Kaynak: {safeText(risk.mahkeme_riski_kaynak)}</div>}
        </div>
        {risk.tahmini_sure_tasarrufu_ay && (
          <div className="sm:col-span-2">
            <div className="text-xs text-muted-foreground">Tahmini Süre Tasarrufu</div>
            <div className="font-medium">{safeText(risk.tahmini_sure_tasarrufu_ay)} {typeof risk.tahmini_sure_tasarrufu_ay === "number" || /^\d/.test(String(risk.tahmini_sure_tasarrufu_ay)) ? "ay" : ""}</div>
          </div>
        )}
      </div>
      {missingAny && (
        <MissingDataHint>
          <b>Bazı metrikler için yeterli veri bulunamadı.</b> Daha net bir risk analizi için taraf profilinde
          <span className="mx-1 font-medium">talep tutarı, uyuşmazlık alt türü ve olayın kısa özetini</span>
          netleştirin; ilgili sözleşme/fatura/yazışma belgelerini <b>.txt</b> veya metin katmanlı PDF olarak yükleyin ve
          BATNA (dava yolu) ile menfaat/pozisyon ayrımını Aşama 2/3 formunda doldurun. Ardından
          <b> "Risk Analizini Güncelle"</b> butonuyla yeniden hesaplatın.
        </MissingDataHint>
      )}
      {safeList(risk.kritik_faktorler).length > 0 && (
        <div>
          <div className="text-xs font-medium mb-1">Kritik Faktörler</div>
          <ul className="list-disc pl-5 text-sm">{safeList(risk.kritik_faktorler).map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {safeList(risk.uzlasma_engelleri).length > 0 && (
        <div>
          <div className="text-xs font-medium mb-1">Uzlaşma Engelleri</div>
          <ul className="list-disc pl-5 text-sm">{safeList(risk.uzlasma_engelleri).map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {safeList(risk.kaynak_listesi).length > 0 && (
        <div className="text-xs">
          <div className="font-medium mb-1">Kullanılan Kaynaklar</div>
          <div className="flex flex-wrap gap-1">
            {safeList(risk.kaynak_listesi).map((name, i) => (
              <SourceChip key={i} name={name} source={matchSource(name, sources)} />
            ))}
          </div>
        </div>
      )}
      {risk.oneri && (
        <div className="text-sm border-l-2 border-primary/40 pl-2 italic">{safeText(risk.oneri)}</div>
      )}
    </div>
  );
}

function RiskSummaryCard({ summary, sources }: { summary?: any; sources?: any[] }) {
  if (!summary || typeof summary !== "object") return null;
  const tone = riskContainerTone(summary.genel_risk_puani);
  const badgeTone = riskBadgeTone(summary.genel_risk_puani);
  const missingHeadline =
    isMissing(summary.genel_uzlasma_orani) && isMissing(summary.genel_risk_puani);
  return (
    <div className={`border rounded-lg p-4 space-y-3 ${tone}`}>
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">📊 Karşılaştırmalı Risk Özeti</div>
        {summary.genel_risk_puani && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeTone}`}>{summary.genel_risk_puani} Risk</span>
        )}
      </div>
      <div className="text-sm">
        <span className="text-xs text-muted-foreground">Genel Anlaşma Oranı: </span>
        <span className="font-medium">{summary.genel_uzlasma_orani || "Yeterli veri yok"}</span>
        {summary.genel_uzlasma_orani_kaynak && <span className="text-[11px] text-muted-foreground italic"> ({summary.genel_uzlasma_orani_kaynak})</span>}
      </div>
      {missingHeadline && (
        <MissingDataHint>
          Karşılaştırmalı özet için tarafların risk analizinde eksik alanlar var. Her taraf kartında
          <b> "Risk Analizini Güncelle"</b> butonuyla analizleri yenileyin; ardından bu raporu
          <b> "Yeniden Üret"</b> ile tekrar hesaplatın.
        </MissingDataHint>
      )}
      {Array.isArray(summary.taraf_karsilastirma) && summary.taraf_karsilastirma.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-2">
          {summary.taraf_karsilastirma.map((t: any, i: number) => (
            <div key={i} className="border rounded p-2 bg-background text-sm">
              <div className="font-medium flex items-center gap-2">
                <span>{t.taraf || `Taraf ${i + 1}`}</span>
                {t.risk_puani && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${riskBadgeTone(t.risk_puani)}`}>{t.risk_puani}</span>
                )}
              </div>
              {t.guclu_yon && <div className="text-xs">✓ {t.guclu_yon}</div>}
              {t.zayif_yon && <div className="text-xs">✗ {t.zayif_yon}</div>}
            </div>
          ))}
        </div>
      )}
      {Array.isArray(summary.ortak_kritik_faktorler) && summary.ortak_kritik_faktorler.filter(Boolean).length > 0 && (
        <div>
          <div className="text-xs font-medium mb-1">Ortak Kritik Faktörler</div>
          <ul className="list-disc pl-5 text-sm">{summary.ortak_kritik_faktorler.filter(Boolean).map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {Array.isArray(summary.ortak_uzlasma_engelleri) && summary.ortak_uzlasma_engelleri.filter(Boolean).length > 0 && (
        <div>
          <div className="text-xs font-medium mb-1">Ortak Uzlaşma Engelleri</div>
          <ul className="list-disc pl-5 text-sm">{summary.ortak_uzlasma_engelleri.filter(Boolean).map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {Array.isArray(summary.kaynak_listesi) && summary.kaynak_listesi.filter(Boolean).length > 0 && (
        <div className="text-xs">
          <div className="font-medium mb-1">Kullanılan Kaynaklar</div>
          <div className="flex flex-wrap gap-1">
            {summary.kaynak_listesi.filter(Boolean).map((name: string, i: number) => (
              <SourceChip key={i} name={name} source={matchSource(name, sources)} />
            ))}
          </div>
        </div>
      )}
      {summary.arabulucu_onerisi && (
        <div className="text-sm border-l-2 border-primary/40 pl-2 italic">{summary.arabulucu_onerisi}</div>
      )}
    </div>
  );
}



const EXCERPT_MAX = 280;
function cleanExcerpt(raw?: string): string {
  if (!raw) return "";
  const text = String(raw).replace(/\s+/g, " ").trim();
  if (text.length <= EXCERPT_MAX) return text;
  const slice = text.slice(0, EXCERPT_MAX);
  // Prefer cutting at last sentence-ending punctuation, else last space.
  const punct = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
  let cut = punct > EXCERPT_MAX * 0.6 ? punct + 1 : slice.lastIndexOf(" ");
  if (cut < EXCERPT_MAX * 0.5) cut = EXCERPT_MAX;
  return slice.slice(0, cut).replace(/[\s,;:]+$/g, "") + "…";
}

function SourcesPanel({ sources }: { sources?: any[] }) {
  const list = Array.isArray(sources) ? sources : [];
  if (list.length === 0) {
    return (
      <AnaSection icon="📚" title="Kullanılan Kaynaklar">
        <p className="text-xs text-muted-foreground italic">
          Bu çıktı için resmi yayın bilgi tabanında yeterince benzer bir bölüm bulunamadı. Analiz, AI'ın genel arabuluculuk bilgisi ile üretildi. Daha fazla kaynak için Admin → "Bilgi Tabanını Güncelle" çalıştırılabilir.
        </p>
      </AnaSection>
    );
  }
  return (
    <AnaSection icon="📚" title={`Kullanılan Kaynaklar (${list.length})`}>
      <p className="text-[11px] text-muted-foreground mb-2">
        Bu çıktı, Adalet Bakanlığı Arabuluculuk Daire Başkanlığı resmi yayınlarından alınan aşağıdaki bölümlerden yararlanılarak üretildi.
        {list.length < 5 && (
          <> Bu konu için bilgi tabanında yalnızca <b>{list.length}</b> ilgili bölüm bulundu; en alakalıları gösteriliyor.</>
        )}
      </p>
      <ol className="space-y-2 text-sm list-decimal pl-5">
        {list.map((s: any, i: number) => (
          <li key={i} className="border rounded p-2 bg-background">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {s.title || "Kaynak"}
                  </a>
                ) : (s.title || "Kaynak")}
                {s.category && <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">[{s.category}]</span>}
              </div>
              {typeof s.similarity === "number" && (
                <span className="text-[10px] text-muted-foreground shrink-0">benzerlik %{Math.round(s.similarity * 100)}</span>
              )}
            </div>
            {s.excerpt && (
              <blockquote className="mt-1 text-xs text-muted-foreground italic border-l-2 pl-2">
                "{cleanExcerpt(s.excerpt)}"
              </blockquote>
            )}
          </li>
        ))}
      </ol>
    </AnaSection>
  );
}

function buildReportHtml(opts: { caseTitle?: string; caseId: string; report: any; strategy: any; sources: any[]; generatedAt: Date; }): string {
  const { caseTitle, caseId, report, strategy, sources, generatedAt } = opts;
  const r = report || {};
  const s = strategy || r.mediator_strategy || {};
  const esc = (v: any) => String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" } as any)[c]);
  const list = (arr: any[]) => (arr && arr.length ? `<ul>${arr.map((x) => `<li>${esc(typeof x === "string" ? x : JSON.stringify(x))}</li>`).join("")}</ul>` : `<p class="muted">—</p>`);
  const scenarios = (r.scenarios || []).map((sc: any) => `
    <div class="card">
      <h4>${esc(sc.label || "Senaryo")}</h4>
      <p>${esc(sc.summary || "")}</p>
      ${sc.tradeoffs?.length ? `<p class="muted"><b>Ödünler:</b></p>${list(sc.tradeoffs)}` : ""}
    </div>`).join("");
  const srcHtml = (sources && sources.length)
    ? `<ol>${sources.map((x: any) => `
        <li>
          <b>${esc(x.title || "Kaynak")}</b>${x.category ? ` <span class="muted">[${esc(x.category)}]</span>` : ""}
          ${typeof x.similarity === "number" ? ` <span class="muted">— benzerlik %${Math.round(x.similarity * 100)}</span>` : ""}
          ${x.url ? `<br/><a href="${esc(x.url)}">${esc(x.url)}</a>` : ""}
          ${x.excerpt ? `<blockquote>"${esc(cleanExcerpt(x.excerpt))}"</blockquote>` : ""}
        </li>`).join("")}</ol>`
    : `<p class="muted">İlgili resmi kaynak bulunamadı.</p>`;
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Ortak Zemin Raporu — ${esc(caseTitle || caseId)}</title>
<style>
body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;max-width:820px;margin:24px auto;padding:0 24px;color:#1f2937;line-height:1.55}
h1{color:#0f766e;border-bottom:2px solid #0f766e;padding-bottom:6px}
h2{color:#0f766e;margin-top:28px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
h4{margin:6px 0}
.muted{color:#6b7280;font-size:13px}
.card{border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;margin:8px 0;background:#f9fafb}
blockquote{border-left:3px solid #14b8a6;margin:6px 0;padding:4px 10px;color:#374151;font-style:italic;background:#f0fdfa}
ul,ol{padding-left:20px}
.meta{color:#6b7280;font-size:12px;margin-bottom:18px}
@media print{body{margin:0}}
</style></head><body>
<h1>Ortak Zemin Raporu</h1>
<div class="meta"><b>Başvuru:</b> ${esc(caseTitle || "—")} &nbsp;•&nbsp; <b>ID:</b> ${esc(caseId)} &nbsp;•&nbsp; <b>Oluşturulma:</b> ${generatedAt.toLocaleString("tr-TR")}</div>

<h2>Ortak Çıkarlar</h2>${list(r.common_interests || [])}

<h2>ZOPA (Olası Anlaşma Aralığı)</h2>
${r.zopa ? `<p>${esc(r.zopa.description || "")}</p><p class="muted">Alt sınır: ${esc(r.zopa.lower_bound || "—")} • Üst sınır: ${esc(r.zopa.upper_bound || "—")}</p>` : `<p class="muted">—</p>`}

<h2>Çözüm Senaryoları</h2>${scenarios || `<p class="muted">—</p>`}

<h2>Arabulucu Stratejisi</h2>
${s.opening_statement ? `<p><b>Açılış:</b> ${esc(s.opening_statement)}</p>` : ""}
${s.critical_questions?.length ? `<p><b>Kritik Sorular:</b></p>${list(s.critical_questions)}` : ""}
${s.deadlock_techniques?.length ? `<p><b>Tıkanıklık Teknikleri:</b></p>${list(s.deadlock_techniques)}` : ""}

<h2>Kırmızı Çizgiler</h2>${list(r.red_lines || [])}

<h2>📚 Kullanılan Kaynaklar (${(sources || []).length})</h2>
<p class="muted">Adalet Bakanlığı Arabuluculuk Daire Başkanlığı resmi yayınlarından.</p>
${srcHtml}

<div class="meta" style="margin-top:32px;text-align:center">MediPact AI tarafından oluşturuldu • ${generatedAt.toLocaleString("tr-TR")}</div>
</body></html>`;
}

function downloadReport(opts: { caseTitle?: string; caseId: string; report: any; strategy: any; mode: "print" | "html" }) {
  const sources = opts.report?.sources || [];
  const html = buildReportHtml({ caseTitle: opts.caseTitle, caseId: opts.caseId, report: opts.report, strategy: opts.strategy, sources, generatedAt: new Date() });
  if (opts.mode === "print") {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
  } else {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ortak-zemin-raporu-${opts.caseId}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/* ===================== PHASE 4 - MEDIATOR PANEL (READ-ONLY SUMMARY) ===================== */

function Phase4Summary({ caseRow }: { caseRow: CaseRow }) {
  const [uyap, setUyap] = useState(caseRow.uyap_no || "");
  const [savingUyap, setSavingUyap] = useState(false);
  async function saveUyap() {
    setSavingUyap(true);
    const { error } = await supabase.from("cases").update({ uyap_no: uyap.trim() || null } as any).eq("id", caseRow.id);
    setSavingUyap(false);
    if (error) toast({ title: "Kaydedilemedi", description: trErr(error.message), variant: "destructive" });
    else toast({ title: "UYAP Kayıt No güncellendi" });
  }
  const [report, setReport] = useState<any>(null);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const [r, a] = await Promise.all([
        supabase.from("common_ground_reports").select("*").eq("case_id", caseRow.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("party_analyses").select("party_id, analysis, risk_analizi, case_parties:party_id(first_name, last_name, company_name, party_role)").eq("case_id", caseRow.id),
      ]);
      if (r.error) throw r.error;
      if (a.error) throw a.error;
      setReport(r.data);
      setAnalyses(Array.isArray(a.data) ? a.data : []);
    } catch (e: any) {
      console.error("[Phase4Summary] load failed", e);
      setLoadErr(e?.message ?? "Bilinmeyen hata");
      setReport(null);
      setAnalyses([]);
    } finally {
      setLoading(false);
    }
  }, [caseRow.id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <Card className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Risk verileri ve taraf analizleri yükleniyor…
    </Card>
  );

  if (loadErr) return (
    <Card className="p-6 space-y-3">
      <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
        <AlertTriangle className="h-4 w-4" /> Risk & analiz verileri yüklenemedi
      </div>
      <p className="text-xs text-muted-foreground break-words">{trErr(loadErr)}</p>
      <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3 w-3 mr-1" /> Tekrar Dene</Button>
    </Card>
  );

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-primary">Aşama 4 — Arabulucu Paneli</h2>
      <p className="text-sm text-muted-foreground">Aşama 3'te üretilen analizlerin ve ortak zemin raporunun özet görünümü.</p>
      <div className="border rounded-md p-3 bg-muted/30 space-y-2">
        <Label className="text-sm">UYAP Kayıt No (varsa girin)</Label>
        <div className="flex gap-2">
          <Input value={uyap} onChange={(e) => setUyap(e.target.value)} placeholder="Örn. 2026/12345" className="font-mono" />
          <Button onClick={saveUyap} disabled={savingUyap}>
            {savingUyap ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Başvuru UYAP sistemine kaydedildiğinde devlet tarafından verilen resmi numarayı buraya girin. Boş bırakılırsa belgelerde "UYAP No: Henüz kaydedilmedi" görünür.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Taraf Analizleri ({analyses.length})</h3>
        <div className="space-y-2">
          {analyses.map((a: any, i) => {
            const cp = a.case_parties || {};
            const name = cp.company_name || `${cp.first_name ?? ""} ${cp.last_name ?? ""}`.trim() || "Taraf";
            return (
              <div key={i} className="border rounded p-3 text-sm">
                <div className="font-medium">{name} <span className="text-xs text-muted-foreground">({roleLabel(cp.party_role)})</span></div>
                {a.analysis?.dispute_area && <div className="text-xs">📋 {a.analysis.dispute_area}</div>}
                {a.analysis?.party_position?.batna && <div className="text-xs">BATNA: {a.analysis.party_position.batna}</div>}
              </div>
            );
          })}
        </div>
      </div>
      {report ? (
        <div>
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <h3 className="font-semibold">Ortak Zemin Raporu</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => downloadReport({ caseTitle: caseRow.title, caseId: caseRow.id, report: report.report, strategy: report.strategy, mode: "print" })}>PDF</Button>
              <Button size="sm" variant="outline" onClick={() => downloadReport({ caseTitle: caseRow.title, caseId: caseRow.id, report: report.report, strategy: report.strategy, mode: "html" })}>İndir</Button>
            </div>
          </div>
          <CommonGroundView data={report.report} strategy={report.strategy} parties={analyses.map((a: any) => ({ id: a.party_id, ...(a.case_parties || {}) }))} analyses={analyses} caseId={caseRow.id} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Ortak zemin raporu henüz üretilmedi.</p>
      )}
    </Card>
  );
}



/* ===================== PHASE 8 - NEGOTIATION ===================== */

function Phase8Negotiation({ caseRow, userId, onDone }: { caseRow: CaseRow; userId: string; onDone: () => void }) {
  const [rounds, setRounds] = useState<any[]>([]);
  const [proposal, setProposal] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("negotiation_rounds").select("*").eq("case_id", caseRow.id).order("round_no", { ascending: true });
    setRounds(data ?? []);
  }, [caseRow.id]);

  useEffect(() => { load(); }, [load]);

  async function addRound() {
    const round_no = (rounds[rounds.length - 1]?.round_no ?? 0) + 1;
    const { error } = await supabase.from("negotiation_rounds").insert({
      case_id: caseRow.id, round_no, proposal: { text: proposal } as any, status: "pending",
    } as any);
    if (error) toast({ title: "Hata", description: trErr(error.message), variant: "destructive" });
    else { setProposal(""); load(); }
  }

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("negotiation_rounds").update({ status } as any).eq("id", id);
    if (error) toast({ title: "Hata", description: trErr(error.message), variant: "destructive" });
    else load();
  }

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-primary">Aşama 8 — Müzakere Turları</h2>
      <div className="space-y-2">
        <Textarea placeholder="Yeni öneri..." value={proposal} onChange={(e) => setProposal(e.target.value)} />
        <Button onClick={addRound} disabled={!proposal.trim()}>Yeni Tur Başlat</Button>
      </div>
      <ul className="space-y-2">
        {rounds.map((r) => (
          <li key={r.id} className="p-3 border rounded space-y-2">
            <div className="flex items-center justify-between text-sm">
              <b>Tur #{r.round_no}</b>
              <Badge>{r.status}</Badge>
            </div>
            <p className="text-sm whitespace-pre-wrap">{typeof r.proposal === "string" ? r.proposal : (r.proposal?.text ?? JSON.stringify(r.proposal))}</p>
            {r.status === "pending" && (
              <div className="flex gap-2">
                <Button size="sm" variant="default" onClick={() => setStatus(r.id, "accepted")}>Kabul</Button>
                <Button size="sm" variant="destructive" onClick={() => setStatus(r.id, "rejected")}>Red</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <Button onClick={onDone}>Kapanışa Geç →</Button>
      </div>
    </Card>
  );
}

/* ===================== PHASE 9 - CLOSING ===================== */

function Phase9Closing({ caseRow }: { caseRow: CaseRow }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => {
    const { data } = await supabase.from("agreement_documents").select("*").eq("case_id", caseRow.id);
    setDocs(data ?? []);
  })(); }, [caseRow.id]);

  async function generateDocs(agreed: boolean) {
    setBusy(true);
    try {
      const templates = agreed
        ? ["İlk Oturum Belirleme Tutanağı", "Anlaşma Son Tutanağı", "Anlaşma Belgesi", "Ücret Sözleşmesi", "Davet Mektubu"]
        : ["Anlaşamama Son Tutanağı"];
      for (const t of templates) {
        await supabase.from("agreement_documents").insert({
          case_id: caseRow.id, doc_type: t,
          metadata: { content: `${t}\n\nSistem No: ${caseRow.application_no}\nUYAP No: ${caseRow.uyap_no || "Henüz kaydedilmedi"}\nTarih: ${new Date().toLocaleDateString("tr-TR")}\nKonu: ${caseRow.title}\nUyuşmazlık: ${caseRow.dispute_type || "AI tarafından henüz tespit edilmedi"}` } as any,
        } as any);
      }
      await supabase.from("cases").update({ status: agreed ? "agreed" : "failed", current_phase: 9 } as any).eq("id", caseRow.id);
      const { data } = await supabase.from("agreement_documents").select("*").eq("case_id", caseRow.id);
      setDocs(data ?? []);
      toast({ title: "Belgeler oluşturuldu" });
    } catch (e: any) {
      toast({ title: "Hata", description: trErr(e.message), variant: "destructive" });
    } finally { setBusy(false); }
  }

  function download(d: any) {
    const text = d.metadata?.content || d.doc_type;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${d.doc_type}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-primary">Aşama 9 — Belgeler & Kapanış</h2>
      <div className="flex gap-2">
        <Button onClick={() => generateDocs(true)} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4 mr-1" />}
          Anlaşma Belgelerini Üret
        </Button>
        <Button variant="outline" onClick={() => generateDocs(false)} disabled={busy}>
          Anlaşamama Tutanağı Üret
        </Button>
      </div>
      {docs.length > 0 && (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between p-3 border rounded">
              <span className="font-medium">{d.doc_type}</span>
              <Button size="sm" variant="ghost" onClick={() => download(d)}><Download className="h-4 w-4 mr-1" /> İndir</Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ===================== PHASE 7 - EXPERT ===================== */

function Phase7Expert({ caseRow }: { caseRow: CaseRow }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-primary">Aşama 7 — Bilirkişi (Opsiyonel)</h2>
      <p className="text-sm text-muted-foreground">Uyuşmazlık türü: {caseRow.dispute_type}</p>
      <ExpertSelector
        niche={caseRow.dispute_type || ""}
        selectedId={selected}
        onSelect={async (e) => {
          if (!user) return;
          setSelected(e.id);
          const { error } = await supabase.from("case_expert_assignments").insert({
            case_id: caseRow.id, expert_id: e.id, status: "pending", assigned_by: user.id,
          } as any);
          if (error) toast({ title: "Atama hatası", description: trErr(error.message), variant: "destructive" });
          else toast({ title: "Bilirkişi atandı (taraf onayı bekleniyor)" });
        }}
      />
    </Card>
  );
}
