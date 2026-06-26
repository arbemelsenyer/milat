import { useEffect, useState } from "react";
import { AppNavbar } from "@/components/AppNavbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Loader2, FolderOpen, ShieldCheck } from "lucide-react";

const DISPUTE_TYPES = [
  "İşçi-İşveren", "Ticari", "Tüketici", "Sağlık Hukuku",
  "Sigorta", "İnşaat", "Fikri Sınai Mülkiyet",
];

interface PartyDraft {
  party_type: "individual" | "corporate";
  party_role: string;
  // individual
  first_name?: string;
  last_name?: string;
  tc_kimlik?: string;
  birth_date?: string;
  address?: string;
  gsm?: string;
  phone?: string;
  email?: string;
  // corporate
  company_name?: string;
  tax_office?: string;
  tax_number?: string;
  trade_registry_no?: string;
  authorized_person?: string;
}

function emptyParty(role: string): PartyDraft {
  return { party_type: "individual", party_role: role, email: "" };
}

function nextRoleLetter(i: number) {
  return String.fromCharCode("A".charCodeAt(0) + i);
}

interface CaseRow {
  id: string;
  title: string | null;
  application_no: string | null;
  uyap_no: string | null;
  dispute_type: string | null;
  dispute_subtype: string | null;
  status: string | null;
  current_phase: number | null;
  created_at: string;
}

export default function MediationEngine() {
  const { user, isLoading, isMediator, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // New case form
  const [title, setTitle] = useState("");
  const [uyapNo, setUyapNo] = useState("");
  const [disputeType, setDisputeType] = useState(DISPUTE_TYPES[0]);
  const [parties, setParties] = useState<PartyDraft[]>([emptyParty("A"), emptyParty("B")]);

  useEffect(() => {
    if (!isLoading && !user) navigate("/auth");
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (user && new URLSearchParams(location.search).get("new") === "1") {
      setShowForm(true);
    }
  }, [user, location.search]);

  useEffect(() => {
    if (user) loadCases();
  }, [user]);

  async function loadCases() {
    setLoading(true);
    const { data, error } = await supabase
      .from("cases")
      .select("id, title, application_no, uyap_no, dispute_type, dispute_subtype, status, current_phase, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Yükleme hatası", description: error.message, variant: "destructive" });
    } else {
      setCases((data ?? []) as CaseRow[]);
    }
    setLoading(false);
  }

  function addParty() {
    setParties((ps) => [...ps, emptyParty(nextRoleLetter(ps.length))]);
  }
  function removeParty(i: number) {
    setParties((ps) => ps.filter((_, idx) => idx !== i));
  }
  function updateParty(i: number, patch: Partial<PartyDraft>) {
    setParties((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  async function createCase() {
    if (!user) return;
    if (parties.length < 2) {
      toast({ title: "En az 2 taraf gerekli", variant: "destructive" });
      return;
    }
    const hasIncompleteParty = parties.some((p) => {
      if (p.party_type === "corporate") return !(p.company_name || p.authorized_person || p.email);
      return !([p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.email || p.phone || p.gsm);
    });
    if (hasIncompleteParty) {
      toast({ title: "Taraf bilgileri eksik", description: "Her taraf için en az ad soyad/ünvan veya iletişim bilgisi girin.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      // application_no via DB function
      const { data: appNoData } = await supabase.rpc("generate_application_no" as any);
      const application_no = (appNoData as string) ?? `2026/${Math.floor(1000 + Math.random() * 9000)}`;

      const { data: caseRow, error: caseErr } = await supabase.from("cases").insert({
        user_id: user.id,
        assigned_mediator_id: isMediator || isAdmin ? user.id : null,
        title: title || `${disputeType} - ${application_no}`,
        dispute_type: disputeType,
        application_no,
        uyap_no: uyapNo || null,
        status: "active",
        current_phase: 1,
        round_number: 1,
      } as any).select().single();
      if (caseErr) throw caseErr;

      // Insert parties
      const partyRows = parties.map((p, index) => ({
        case_id: caseRow.id,
        user_id: !isMediator && !isAdmin && index === 0 ? user.id : null,
        party_type: p.party_type,
        is_individual: p.party_type === "individual",
        party_role: p.party_role,
        invite_token: crypto.randomUUID(),
        invite_status: "pending",
        first_name: p.first_name ?? null,
        last_name: p.last_name ?? null,
        full_name: p.party_type === "individual"
          ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()
          : p.company_name ?? "",
        tc_kimlik: p.tc_kimlik ?? null,
        birth_date: p.birth_date || null,
        address: p.address ?? null,
        gsm: p.gsm ?? null,
        phone: p.phone ?? null,
        email: p.email ?? null,
        company_name: p.company_name ?? null,
        tax_office: p.tax_office ?? null,
        tax_number: p.tax_number ?? null,
        trade_registry_no: p.trade_registry_no ?? null,
        authorized_person: p.authorized_person ?? null,
        role: p.party_role,
      }));
      const { data: insertedParties, error: pErr } = await supabase
        .from("case_parties").insert(partyRows as any).select();
      if (pErr) throw pErr;

      // Send invites
      for (const ip of insertedParties ?? []) {
        if (!(ip as any).email) continue;
        try {
          await supabase.functions.invoke("send-party-invite", {
            body: { party_id: (ip as any).id, app_url: window.location.origin },
          });
        } catch (e) {
          console.error("invite send failed", e);
        }
      }

      toast({ title: "Başvuru oluşturuldu", description: `Başvuru no: ${application_no}` });
      setShowForm(false);
      setTitle(""); setUyapNo("");
      setParties([emptyParty("A"), emptyParty("B")]);
      await loadCases();
      navigate(`/case-room/${caseRow.id}`);
    } catch (e: any) {
      toast({ title: "Oluşturma hatası", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const canCreate = !!user;

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">Arabuluculuk Başvuru Yönetimi</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              İki taraflı gizli analiz sistemi
            </p>
          </div>
          {canCreate && (
              <Button onClick={() => setShowForm((s) => !s)}>
               <Plus className="h-4 w-4 mr-1" /> Yeni Başvuru Oluştur
            </Button>
          )}
        </header>

        {showForm && canCreate && (
          <Card className="p-6 mb-6 space-y-5">
            <h2 className="text-xl font-semibold">Yeni Başvuru (UYAP Formatı)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Başvuru Başlığı</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="(opsiyonel)" />
              </div>
              <div>
                <Label>UYAP Numarası</Label>
                <Input value={uyapNo} onChange={(e) => setUyapNo(e.target.value)} placeholder="UYAP no" />
              </div>
              <div>
                <Label>Uyuşmazlık Türü</Label>
                <Select value={disputeType} onValueChange={setDisputeType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISPUTE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Başvuru No</Label>
                <Input value="Otomatik (2026/xxxx)" disabled />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Taraflar ({parties.length})</h3>
                <Button variant="outline" size="sm" onClick={addParty}>
                  <Plus className="h-4 w-4 mr-1" /> Taraf Ekle
                </Button>
              </div>
              {parties.map((p, i) => (
                <Card key={i} className="p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Taraf {p.party_role}</div>
                    {parties.length > 2 && (
                      <Button variant="ghost" size="sm" onClick={() => removeParty(i)}>Sil</Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Tür</Label>
                      <Select value={p.party_type} onValueChange={(v: any) => updateParty(i, { party_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Bireysel</SelectItem>
                          <SelectItem value="corporate">Kurumsal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>E-posta (davet için)</Label>
                      <Input type="email" value={p.email ?? ""} onChange={(e) => updateParty(i, { email: e.target.value })} />
                    </div>
                    {p.party_type === "individual" ? (
                      <>
                        <div><Label>Ad</Label><Input value={p.first_name ?? ""} onChange={(e) => updateParty(i, { first_name: e.target.value })} /></div>
                        <div><Label>Soyad</Label><Input value={p.last_name ?? ""} onChange={(e) => updateParty(i, { last_name: e.target.value })} /></div>
                        <div><Label>TC Kimlik No</Label><Input value={p.tc_kimlik ?? ""} onChange={(e) => updateParty(i, { tc_kimlik: e.target.value })} /></div>
                        <div><Label>Doğum Tarihi</Label><Input type="date" value={p.birth_date ?? ""} onChange={(e) => updateParty(i, { birth_date: e.target.value })} /></div>
                        <div><Label>GSM</Label><Input value={p.gsm ?? ""} onChange={(e) => updateParty(i, { gsm: e.target.value })} /></div>
                        <div><Label>Telefon</Label><Input value={p.phone ?? ""} onChange={(e) => updateParty(i, { phone: e.target.value })} /></div>
                        <div className="md:col-span-2"><Label>Adres</Label><Input value={p.address ?? ""} onChange={(e) => updateParty(i, { address: e.target.value })} /></div>
                      </>
                    ) : (
                      <>
                        <div><Label>Kurum Adı</Label><Input value={p.company_name ?? ""} onChange={(e) => updateParty(i, { company_name: e.target.value })} /></div>
                        <div><Label>Yetkili Kişi</Label><Input value={p.authorized_person ?? ""} onChange={(e) => updateParty(i, { authorized_person: e.target.value })} /></div>
                        <div><Label>Vergi Dairesi</Label><Input value={p.tax_office ?? ""} onChange={(e) => updateParty(i, { tax_office: e.target.value })} /></div>
                        <div><Label>Vergi No</Label><Input value={p.tax_number ?? ""} onChange={(e) => updateParty(i, { tax_number: e.target.value })} /></div>
                        <div><Label>Ticaret Sicil No</Label><Input value={p.trade_registry_no ?? ""} onChange={(e) => updateParty(i, { trade_registry_no: e.target.value })} /></div>
                        <div><Label>Telefon</Label><Input value={p.phone ?? ""} onChange={(e) => updateParty(i, { phone: e.target.value })} /></div>
                        <div className="md:col-span-2"><Label>Adres</Label><Input value={p.address ?? ""} onChange={(e) => updateParty(i, { address: e.target.value })} /></div>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowForm(false)}>İptal</Button>
              <Button onClick={createCase} disabled={creating}>
                {creating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Oluşturuluyor</> : "Yeni Başvuru Oluştur"}
              </Button>
            </div>
          </Card>
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
                <button
                  key={c.id}
                  onClick={() => navigate(`/case-room/${c.id}`)}
                  className="w-full text-left p-4 rounded-lg border hover:bg-accent/10 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{c.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {c.application_no ?? "—"} · {c.dispute_type ?? ""} · Aşama {c.current_phase ?? 1}/8
                      </div>
                    </div>
                    <div className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">{c.status ?? "active"}</div>
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
