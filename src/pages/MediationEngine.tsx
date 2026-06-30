import { useEffect, useMemo, useState, useCallback } from "react";
import { AppNavbar } from "@/components/AppNavbar";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
    case 3: return <Phase3PartyAnalysis caseRow={caseRow} userId={userId} isMediator={isMediator} reload={reload} onAdvance={onAdvance} bumpPhase={bumpPhase} />;
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
    <Card className="p-6 space-y-3">
      <h2 className="text-2xl font-bold text-primary">Aşama 1 — Başvuru Özeti</h2>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-muted-foreground">Sistem No:</span> <b className="font-mono">{caseRow.application_no}</b></div>
        <div><span className="text-muted-foreground">Başlık:</span> {caseRow.title}</div>
        <div><span className="text-muted-foreground">Uyuşmazlık Türü:</span> {caseRow.dispute_type || <span className="italic text-muted-foreground">AI tarafından Aşama 3'te tespit edilecek</span>}</div>
        <div><span className="text-muted-foreground">Tarih:</span> {caseRow.application_date ? new Date(caseRow.application_date).toLocaleDateString("tr-TR") : new Date(caseRow.created_at).toLocaleDateString("tr-TR")}</div>
        <div><span className="text-muted-foreground">Durum:</span> {caseRow.status}</div>
        <div><span className="text-muted-foreground">UYAP Kayıt No:</span> {caseRow.uyap_no || <span className="italic text-muted-foreground">Henüz kaydedilmedi</span>}</div>
      </div>
      <p className="text-xs text-muted-foreground border-t pt-3">
        UYAP Kayıt Numarası, başvuru resmi sisteme kaydedildiğinde Aşama 4 (Arabulucu Paneli) üzerinden eklenebilir.
      </p>
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
  const [navigating, setNavigating] = useState(false);

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    setReportFetchError(null);
    const { data, error } = await supabase
      .from("common_ground_reports")
      .select("*")
      .eq("case_id", caseRow.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) setReportFetchError(error.message);
    setReport(data ?? null);
    setReportLoading(false);
    return data ?? null;
  }, [caseRow.id]);

  const loadAll = useCallback(async () => {
    const [p, d, a] = await Promise.all([
      supabase.from("case_parties").select("*").eq("case_id", caseRow.id).order("created_at"),
      supabase.from("case_documents").select("*").eq("case_id", caseRow.id).order("created_at", { ascending: false }),
      supabase.from("party_analyses").select("*").eq("case_id", caseRow.id),
    ]);
    setParties(p.data ?? []);
    setDocs(d.data ?? []);
    setAnalyses(a.data ?? []);
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
    try {
      const { data, error } = await supabase.functions.invoke("common-ground-report", { body: { case_id: caseRow.id } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      // Verify the record actually exists in DB before claiming success
      const fresh = await fetchReport();
      if (!fresh) {
        throw new Error("Rapor kaydı oluşturulamadı. Lütfen tekrar deneyin.");
      }
      toast({ title: "Ortak zemin raporu hazır" });
      reload();
    } catch (e: any) {
      const msg = e?.message || "Rapor üretilemedi.";
      setReportError(msg);
      toast({ title: "Rapor hatası", description: msg, variant: "destructive" });
    } finally { setReportBusy(false); }
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
  const canReport = analysedCount >= 2;

  const progressPct = parties.length ? Math.round((analysedCount / parties.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-primary">Aşama 3 — Taraf Analizi</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Her tarafa ait bilgileri görüntüleyin, belge yükleyin ve AI analizi başlatın. En az 2 taraf analiz edildiğinde Ortak Zemin Raporu üretebilirsiniz.
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
                  : <div className="text-muted-foreground">Rapor için en az 2 analiz gerekli</div>}
          </div>
        </div>
      </Card>

      {/* Persistent report panel — always visible right under progress */}
      <Card className="p-6 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-lg font-semibold">Ortak Zemin Raporu</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={fetchReport} disabled={reportLoading} title="Raporu yeniden yükle">
              {reportLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
            <Button onClick={generateReport} disabled={!canReport || reportBusy} size="sm">
              {reportBusy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Rapor hazırlanıyor…</> : <><Sparkles className="h-4 w-4 mr-1" /> {report ? "Yeniden Üret" : "Rapor Üret"}</>}
            </Button>
          </div>
        </div>
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
            {canReport ? "Henüz rapor üretilmedi. \"Rapor Üret\" butonuna basın." : "En az 2 taraf analiz edildikten sonra rapor üretilebilir."}
          </p>
        )}
        {report && <CommonGroundView data={report.report} strategy={report.strategy} />}
      </Card>



      {parties.length === 0 && (
        <Card className="p-6"><p className="text-muted-foreground">Önce Aşama 2'de taraf ekleyin.</p></Card>
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

                  {/* Analysis result */}
                  {a && (
                    <div className="space-y-2">
                      {an.dispute_area && (
                        <AnaSection icon="🔍" title="Uyuşmazlık Türü">
                          <p className="text-sm">{an.dispute_area}</p>
                        </AnaSection>
                      )}
                      {an.legal_framework && (
                        <AnaSection icon="⚖️" title="Hukuki Çerçeve">
                          {an.legal_framework.statutes?.length > 0 && (
                            <div className="text-sm">
                              <div className="font-medium">Mevzuat:</div>
                              <ul className="list-disc pl-5">{an.legal_framework.statutes.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                            </div>
                          )}
                          {an.legal_framework.precedents?.length > 0 && (
                            <div className="text-sm mt-2">
                              <div className="font-medium">Emsal Kararlar:</div>
                              <ul className="list-disc pl-5">
                                {an.legal_framework.precedents.map((pr: any, i: number) => (
                                  <li key={i}><b>{pr.court}:</b> {pr.decision} <span className="text-muted-foreground">— {pr.relevance}</span></li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </AnaSection>
                      )}
                      {an.document_findings?.length > 0 && (
                        <AnaSection icon="📄" title="Belge Bulguları">
                          <ul className="list-disc pl-5 text-sm">{an.document_findings.map((f: string, i: number) => <li key={i}>{f}</li>)}</ul>
                        </AnaSection>
                      )}
                      {an.party_position && (
                        <AnaSection icon="👤" title="Taraf Analizi">
                          <PosBlock label="Güçlü Yanlar" items={an.party_position.strengths} />
                          <PosBlock label="Zayıf Yanlar" items={an.party_position.weaknesses} />
                          <PosBlock label="İhtiyaçlar" items={an.party_position.interests} />
                          {an.party_position.batna && <div className="text-sm mt-1"><b>BATNA:</b> {an.party_position.batna}</div>}
                          {an.party_position.watna && <div className="text-sm"><b>WATNA:</b> {an.party_position.watna}</div>}
                        </AnaSection>
                      )}
                      {an.discovery_questions?.length > 0 && (
                        <AnaSection icon="❓" title="İhtiyaç Soruları">
                          <ol className="list-decimal pl-5 text-sm space-y-1">
                            {an.discovery_questions.map((q: any, i: number) => <li key={i}>{q.question}</li>)}
                          </ol>
                        </AnaSection>
                      )}
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
function CommonGroundView({ data, strategy }: { data: any; strategy: any }) {
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
    </div>
  );
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

  useEffect(() => { (async () => {
    setLoading(true);
    const [r, a] = await Promise.all([
      supabase.from("common_ground_reports").select("*").eq("case_id", caseRow.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("party_analyses").select("party_id, analysis, case_parties:party_id(first_name, last_name, company_name, party_role)").eq("case_id", caseRow.id),
    ]);
    setReport(r.data);
    setAnalyses(a.data ?? []);
    setLoading(false);
  })(); }, [caseRow.id]);

  if (loading) return <Card className="p-6"><Loader2 className="animate-spin" /></Card>;

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
          <h3 className="font-semibold mb-2">Ortak Zemin Raporu</h3>
          <CommonGroundView data={report.report} strategy={report.strategy} />
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
