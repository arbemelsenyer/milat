import { useEffect, useMemo, useState, useCallback } from "react";
import { AppNavbar } from "@/components/AppNavbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  return msg || "Bilinmeyen hata. Lütfen tekrar deneyin.";
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
      supabase.from("common_ground_reports").select("id").eq("case_id", id).maybeSingle(),
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
      .select("id, user_id, title, application_no, uyap_no, dispute_type, status, current_phase, application_date, assigned_mediator_id, created_at")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Yükleme hatası", description: trErr(error.message), variant: "destructive" });
    else setCases((data ?? []) as CaseRow[]);
    setLoading(false);
  }

  async function loadCase(id: string) {
    const { data, error } = await supabase
      .from("cases")
      .select("id, user_id, title, application_no, uyap_no, dispute_type, status, current_phase, application_date, assigned_mediator_id, created_at")
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
                  <button key={c.id} onClick={() => openCase(c.id, c.current_phase || 1)}
                    className="w-full text-left p-4 rounded-lg border hover:bg-accent/10 transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{c.title || "(başlıksız)"}</div>
                        <div className="text-sm text-muted-foreground">
                          {c.application_no ?? "—"} · {c.dispute_type ?? ""} · Aşama {c.current_phase ?? 1}/9
                        </div>
                      </div>
                      <Badge variant="secondary">{c.status ?? "active"}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
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
  const [uyapNo, setUyapNo] = useState("");
  const [disputeType, setDisputeType] = useState(DISPUTE_TYPES[0]);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const { data: appNoData } = await supabase.rpc("generate_application_no" as any);
      const application_no = (appNoData as string) ?? `2026/${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: row, error } = await supabase.from("cases").insert({
        user_id: userId,
        assigned_mediator_id: isMediator ? userId : null,
        title: title || `${disputeType} - ${application_no}`,
        dispute_type: disputeType,
        application_no,
        uyap_no: uyapNo || null,
        status: "active",
        current_phase: 2,
        round_number: 1,
      } as any).select().single();
      if (error) throw error;
      toast({ title: "Başvuru oluşturuldu", description: `No: ${application_no}` });
      onCreated((row as any).id);
    } catch (e: any) {
      toast({ title: "Oluşturma hatası", description: trErr(e.message), variant: "destructive" });
    } finally { setBusy(false); }
  }

  return (
    <Card className="p-6 mb-6 space-y-4">
      <h2 className="text-xl font-semibold">Yeni Başvuru</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Başvuru Başlığı</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div><Label>UYAP Numarası</Label><Input value={uyapNo} onChange={(e) => setUyapNo(e.target.value)} /></div>
        <div>
          <Label>Uyuşmazlık Türü</Label>
          <Select value={disputeType} onValueChange={setDisputeType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DISPUTE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
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
    case 3: return <Phase3Documents caseRow={caseRow} userId={userId} onDone={() => { bumpPhase(4); onAdvance(4); }} />;
    case 4: return <Phase4Analysis caseRow={caseRow} userId={userId} isMediator={isMediator} onDone={() => { bumpPhase(5); onAdvance(5); }} />;
    case 5: return <Phase5MediatorPanel caseRow={caseRow} isMediator={isMediator} onDone={() => { bumpPhase(6); onAdvance(6); }} />;
    case 6: return <SessionScheduler caseId={caseRow.id} />;
    case 7: return <Phase7Expert caseRow={caseRow} />;
    case 8: return <Phase8Negotiation caseRow={caseRow} userId={userId} onDone={() => { bumpPhase(9); onAdvance(9); }} />;
    case 9: return <Phase9Closing caseRow={caseRow} />;
    default: return null;
  }
}

function Phase1Summary({ caseRow }: { caseRow: CaseRow }) {
  return (
    <Card className="p-6 space-y-3">
      <h2 className="text-2xl font-bold text-primary">Aşama 1 — Başvuru Özeti</h2>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-muted-foreground">Başvuru No:</span> <b>{caseRow.application_no}</b></div>
        <div><span className="text-muted-foreground">UYAP No:</span> {caseRow.uyap_no || "—"}</div>
        <div><span className="text-muted-foreground">Başlık:</span> {caseRow.title}</div>
        <div><span className="text-muted-foreground">Uyuşmazlık:</span> {caseRow.dispute_type}</div>
        <div><span className="text-muted-foreground">Tarih:</span> {caseRow.application_date ? new Date(caseRow.application_date).toLocaleDateString("tr-TR") : "—"}</div>
        <div><span className="text-muted-foreground">Durum:</span> {caseRow.status}</div>
      </div>
    </Card>
  );
}

/* ===================== PHASE 2 - PARTIES ===================== */

function Phase2Parties({ caseRow, isMediator, userId, onDone }: { caseRow: CaseRow; isMediator: boolean; userId: string; onDone: () => void }) {
  const [parties, setParties] = useState<any[]>([]);
  const [draft, setDraft] = useState<PartyDraft | null>(null);
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
        invite_token: crypto.randomUUID(),
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
                <Button variant="ghost" size="sm" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
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

/* ===================== PHASE 3 - DOCUMENTS ===================== */

function Phase3Documents({ caseRow, userId, onDone }: { caseRow: CaseRow; userId: string; onDone: () => void }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("case_documents").select("*").eq("case_id", caseRow.id).order("created_at", { ascending: false });
    setDocs(data ?? []);
  }, [caseRow.id]);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_EXT = ["pdf", "doc", "docx"];
    const ALLOWED_MIME = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    for (const f of files) {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED_EXT.includes(ext) && !ALLOWED_MIME.includes(f.type)) {
        toast({ title: "Geçersiz dosya türü", description: `"${f.name}" yalnızca PDF veya Word (.pdf, .doc, .docx) olabilir.`, variant: "destructive" });
        e.target.value = "";
        return;
      }
      if (f.size > MAX_SIZE) {
        toast({ title: "Dosya çok büyük", description: `"${f.name}" 10MB sınırını aşıyor.`, variant: "destructive" });
        e.target.value = "";
        return;
      }
    }

    setBusy(true);
    try {
      for (const f of files) {
        // Storage RLS expects path: {user_id}/{case_id}/{file}
        const safeName = f.name.replace(/[^\w.\-]+/g, "_");
        const path = `${userId}/${caseRow.id}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage.from("case-documents").upload(path, f, {
          cacheControl: "3600",
          upsert: false,
          contentType: f.type || undefined,
        });
        if (upErr) {
          const msg = /row-level security|not authorized|permission/i.test(upErr.message)
            ? "Bu başvuruya belge yükleme yetkiniz yok."
            : /exists|duplicate/i.test(upErr.message)
            ? "Aynı isimde bir dosya zaten var, lütfen yeniden deneyin."
            : `Depolama hatası: ${upErr.message}`;
          throw new Error(msg);
        }
        const { error: insErr } = await supabase.from("case_documents").insert({
          case_id: caseRow.id,
          file_name: f.name,
          file_path: path,
          file_size: f.size,
          mime_type: f.type,
          uploaded_by: userId,
        } as any);
        if (insErr) {
          // rollback storage object so we don't leave orphans
          await supabase.storage.from("case-documents").remove([path]);
          const msg = /row-level security|policy/i.test(insErr.message)
            ? "Belge kaydı için yetkiniz yok. Lütfen başvuru sahibi veya taraf olarak giriş yapın."
            : `Veritabanı hatası: ${insErr.message}`;
          throw new Error(msg);
        }
      }
      toast({ title: "Belge yüklendi", description: files.length > 1 ? `${files.length} dosya başarıyla yüklendi.` : "Dosya başarıyla yüklendi." });
      load();
    } catch (err: any) {
      toast({ title: "Yükleme başarısız", description: err?.message ?? "Bilinmeyen bir hata oluştu.", variant: "destructive" });
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-primary">Aşama 3 — Belgeler</h2>
      <p className="text-sm text-muted-foreground">PDF veya Word (max 10MB). Belgeleri sadece yükleyen taraf ve arabulucu görebilir.</p>
      <label className="flex flex-col items-center justify-center gap-2 cursor-pointer rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 py-10 hover:bg-primary/10">
        {busy ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Plus className="h-8 w-8 text-primary" />}
        <span className="font-medium">Belge Yükle</span>
        <input type="file" multiple accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={handleUpload} disabled={busy} />
      </label>
      {docs.length > 0 && (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-2 text-sm p-2 border rounded">
              <FileText className="h-4 w-4 text-primary" />
              <span className="flex-1">{d.file_name}</span>
              <span className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString("tr-TR")}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end">
        <Button onClick={onDone}>Aşamayı Tamamla →</Button>
      </div>
    </Card>
  );
}

/* ===================== PHASE 4 - CONFIDENTIAL ANALYSIS ===================== */

function Phase4Analysis({ caseRow, userId, isMediator, onDone }: { caseRow: CaseRow; userId: string; isMediator: boolean; onDone: () => void }) {
  const [parties, setParties] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, a] = await Promise.all([
      supabase.from("case_parties").select("*").eq("case_id", caseRow.id),
      supabase.from("party_analyses").select("*").eq("case_id", caseRow.id),
    ]);
    setParties(p.data ?? []);
    setAnalyses(a.data ?? []);
  }, [caseRow.id]);

  useEffect(() => { load(); }, [load]);

  async function runAnalysis(partyId: string) {
    setBusy(partyId);
    try {
      const { error } = await supabase.functions.invoke("party-confidential-analysis", {
        body: { case_id: caseRow.id, party_id: partyId },
      });
      if (error) throw error;
      toast({ title: "Gizli analiz oluşturuldu" });
      load();
    } catch (e: any) {
      toast({ title: "Analiz hatası", description: trErr(e.message), variant: "destructive" });
    } finally { setBusy(null); }
  }

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-primary">Aşama 4 — Gizli Analiz</h2>
      <p className="text-sm text-muted-foreground">Her tarafa özel analiz. Taraflar birbirinin analizini göremez.</p>
      <div className="space-y-3">
        {parties.map((p) => {
          const a = analyses.find((x) => x.party_id === p.id);
          const canSee = isMediator || p.user_id === userId;
          return (
            <div key={p.id} className="p-4 border rounded space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{p.full_name}</div>
                <div className="flex gap-2">
                  {a && <Badge variant="secondary">Analiz hazır</Badge>}
                  {isMediator && (
                    <Button size="sm" onClick={() => runAnalysis(p.id)} disabled={busy === p.id}>
                      {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                      {a ? "Yeniden Üret" : "AI Analizi Üret"}
                    </Button>
                  )}
                </div>
              </div>
              {a && canSee && (
                <pre className="text-xs whitespace-pre-wrap bg-muted/40 p-3 rounded max-h-64 overflow-auto">
                  {typeof a.analysis === "string" ? a.analysis : JSON.stringify(a.analysis, null, 2)}
                </pre>
              )}
              {a && !canSee && <p className="text-xs text-muted-foreground italic">Bu analiz gizlidir.</p>}
            </div>
          );
        })}
      </div>
      {isMediator && analyses.length >= 2 && (
        <div className="flex justify-end">
          <Button onClick={onDone}>Aşamayı Tamamla →</Button>
        </div>
      )}
    </Card>
  );
}

/* ===================== PHASE 5 - MEDIATOR PANEL ===================== */

function Phase5MediatorPanel({ caseRow, isMediator, onDone }: { caseRow: CaseRow; isMediator: boolean; onDone: () => void }) {
  const [report, setReport] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => {
    const { data } = await supabase.from("common_ground_reports").select("*").eq("case_id", caseRow.id).maybeSingle();
    setReport(data);
  })(); }, [caseRow.id]);

  async function generate() {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("common-ground-report", { body: { case_id: caseRow.id } });
      if (error) throw error;
      const { data } = await supabase.from("common_ground_reports").select("*").eq("case_id", caseRow.id).maybeSingle();
      setReport(data);
      toast({ title: "Ortak zemin raporu hazır" });
    } catch (e: any) {
      toast({ title: "Hata", description: trErr(e.message), variant: "destructive" });
    } finally { setBusy(false); }
  }

  if (!isMediator) return <Card className="p-6"><p className="text-muted-foreground">Sadece arabulucuya açık.</p></Card>;

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-primary">Aşama 5 — Arabulucu Paneli</h2>
      <Button onClick={generate} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
        AI Ortak Zemin Raporu Üret
      </Button>
      {report && (
        <pre className="text-xs whitespace-pre-wrap bg-muted/40 p-3 rounded max-h-96 overflow-auto">
          {typeof report.report === "string" ? report.report : JSON.stringify(report.report, null, 2)}
        </pre>
      )}
      <div className="flex justify-end">
        <Button onClick={onDone}>Toplantıya Geç →</Button>
      </div>
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
          metadata: { content: `${t}\n\nBaşvuru No: ${caseRow.application_no}\nTarih: ${new Date().toLocaleDateString("tr-TR")}\nKonu: ${caseRow.title}\nUyuşmazlık: ${caseRow.dispute_type}` } as any,
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
