import { useEffect, useState } from "react";
import { AppNavbar } from "@/components/AppNavbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { StepTimeline } from "@/components/mediation/StepTimeline";
import { PartyForm, emptyParty, type Party } from "@/components/mediation/PartyForm";
import { MediatorMarketplace } from "@/components/mediation/MediatorMarketplace";
import { DocumentUploader } from "@/components/mediation/DocumentUploader";
import { ConflictCards, type ConflictCard } from "@/components/mediation/ConflictCards";
import { DiscoveryInterview } from "@/components/mediation/DiscoveryInterview";
import { SessionScheduler } from "@/components/mediation/SessionScheduler";
import { AgreementStreaming } from "@/components/mediation/AgreementStreaming";
import { maskText } from "@/lib/masking";
import { Loader2, ShieldCheck } from "lucide-react";

const NICHES = [
  "İşçi-İşveren",
  "Ticari",
  "Tüketici",
  "Sağlık Hukuku Uyuşmazlıkları",
  "Sigorta Uyuşmazlıkları",
  "İnşaat",
  "Marka-Patent",
];

const STEPS = [
  { key: "intake", label: "Başvuru" },
  { key: "mediator", label: "Arabulucu Seçimi" },
  { key: "documents", label: "Belge Analizi" },
  { key: "discovery", label: "İhtiyaç Tespiti" },
  { key: "sessions", label: "Görüşme Planlaması" },
  { key: "negotiation", label: "Müzakere" },
  { key: "closure", label: "Kapanış" },
];

async function callMediationAi(action: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("mediation-ai", {
    body: { action, ...payload },
  });
  if (error) throw error;
  return data;
}

export default function MediationEngine() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Step 1
  const [niche, setNiche] = useState(NICHES[0]);
  const [partyA, setPartyA] = useState<Party>(emptyParty());
  const [partyB, setPartyB] = useState<Party>(emptyParty());
  const [dispute, setDispute] = useState("");
  const [caseId, setCaseId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Step 3
  const [docText, setDocText] = useState("");
  const [conflicts, setConflicts] = useState<ConflictCard[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  // Step 4
  const [questions, setQuestions] = useState<string[]>([]);
  const [needs, setNeeds] = useState<{ needs: string[]; winWinScenarios: string[] } | null>(null);
  const [askingQs, setAskingQs] = useState(false);

  // Step 6
  const [transcript, setTranscript] = useState("");
  const [suggestion, setSuggestion] = useState<{ suggestions: string[]; commonGround: string; frictionPoints: string[] } | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // Build mask terms from form data
  const maskTerms = () => {
    const terms: { value: string; fieldType: string }[] = [];
    for (const [p, role] of [[partyA, "name"], [partyB, "counterparty_name"]] as const) {
      if (p.partyType === "individual") {
        if (p.firstName) terms.push({ value: p.firstName, fieldType: role });
        if (p.lastName) terms.push({ value: p.lastName, fieldType: role });
        if (p.firstName && p.lastName) terms.push({ value: `${p.firstName} ${p.lastName}`, fieldType: role });
      } else {
        if (p.companyName) terms.push({ value: p.companyName, fieldType: "company" });
        if (p.authorizedPerson) terms.push({ value: p.authorizedPerson, fieldType: "authorized" });
      }
      if (p.address) terms.push({ value: p.address, fieldType: "address" });
    }
    return terms;
  };

  const handleCreateCase = async () => {
    if (!user) return;
    if (!dispute.trim()) {
      toast({ title: "Uyuşmazlık açıklaması gerekli", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { masked } = maskText(dispute, maskTerms());
      const partyAName = partyA.partyType === "individual" ? `${partyA.firstName} ${partyA.lastName}`.trim() : partyA.companyName;
      const partyBName = partyB.partyType === "individual" ? `${partyB.firstName} ${partyB.lastName}`.trim() : partyB.companyName;

      const { data: c, error } = await supabase
        .from("cases")
        .insert({
          user_id: user.id,
          dispute_type: niche,
          desired_outcome: "Anlaşma",
          issue_description: masked.slice(0, 5000),
          your_name: partyAName || "Başvuran",
          other_party_name: partyBName || "Karşı Taraf",
          status: "draft",
        } as any)
        .select()
        .single();
      if (error) throw error;
      const newId = (c as any).id as string;
      setCaseId(newId);

      // Persist parties
      await supabase.from("case_parties").insert([
        partyToRow(newId, "applicant", partyA, partyAName || "Başvuran"),
        partyToRow(newId, "counterparty", partyB, partyBName || "Karşı Taraf"),
      ] as any);

      // Persist anonymized dispute text into vector pool (without embedding for now)
      await supabase.from("cases_vector_pool").insert({
        case_id: newId,
        anonymized_text: masked,
        niche_area: niche,
      } as any);

      toast({ title: "Başvuru oluşturuldu", description: "Arabulucu seçimine geçebilirsiniz." });
      setStep(1);
    } catch (e: any) {
      toast({ title: "Hata", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDocText = async (text: string, fileName: string) => {
    if (!caseId) return;
    const { masked } = maskText(text, maskTerms());
    setDocText((prev) => prev + "\n\n" + masked);
    // store record
    await supabase.from("case_documents").insert({
      case_id: caseId,
      file_name: fileName,
      file_path: `inline/${fileName}`,
      mime_type: "text/plain",
      uploaded_by: user!.id,
    } as any);
  };

  const analyzeDocs = async () => {
    if (!docText.trim()) {
      toast({ title: "Önce bir doküman yükleyin", variant: "destructive" });
      return;
    }
    setAnalyzing(true);
    try {
      const r = await callMediationAi("analyze_document", { text: docText, niche });
      setConflicts((r?.cards as ConflictCard[]) ?? []);
      // Trigger discovery questions in parallel
      setAskingQs(true);
      const q = await callMediationAi("discovery_questions", {
        niche,
        summary: maskText(dispute, maskTerms()).masked + "\n\n" + docText.slice(0, 6000),
      });
      setQuestions((q?.questions as string[]) ?? []);
    } catch (e: any) {
      toast({ title: "Analiz hatası", description: e.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
      setAskingQs(false);
    }
  };

  const finishDiscovery = async (qa: { question: string; answer: string }[]) => {
    if (!caseId) return;
    await supabase.from("case_discovery_questions").insert(
      qa.map((x, i) => ({
        case_id: caseId,
        question_text: x.question,
        answer_text: x.answer,
        question_order: i,
      })) as any,
    );
    try {
      const r = await callMediationAi("needs_extract", {
        qa: qa.map((x) => `S: ${x.question}\nC: ${x.answer}`).join("\n\n"),
      });
      setNeeds(r);
    } catch (e: any) {
      toast({ title: "İhtiyaç çıkarma hatası", description: e.message, variant: "destructive" });
    }
    setStep(4);
  };

  const requestSuggestion = async () => {
    if (!transcript.trim()) return;
    setSuggesting(true);
    try {
      const r = await callMediationAi("negotiation_suggest", {
        transcript: maskText(transcript, maskTerms()).masked,
      });
      setSuggestion(r);
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    } finally {
      setSuggesting(false);
    }
  };

  if (authLoading) return <div className="p-8 text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="container max-w-6xl py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">MediPact AI — Akıllı Arabuluculuk Motoru</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Tüm kişisel veriler AI'ya gitmeden önce yerel olarak maskelenir.
          </p>
        </div>

        <StepTimeline steps={STEPS} current={step} onJump={(i) => setStep(i)} />

        {/* STEP 1: Intake */}
        {step === 0 && (
          <div className="space-y-5">
            <Card className="p-5 space-y-3">
              <Label>Uyuşmazlık Alanı</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              >
                {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Card>
            <div className="grid md:grid-cols-2 gap-5">
              <PartyForm title="Başvuran" value={partyA} onChange={setPartyA} />
              <PartyForm title="Karşı Taraf" value={partyB} onChange={setPartyB} />
            </div>
            <Card className="p-5 space-y-3">
              <Label>Uyuşmazlık Açıklaması</Label>
              <Textarea
                rows={6}
                placeholder="Olayı kendi sözlerinizle tarafsız bir dille anlatın..."
                value={dispute}
                onChange={(e) => setDispute(e.target.value)}
              />
            </Card>
            <div className="flex justify-end">
              <Button onClick={handleCreateCase} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Başvuruyu Oluştur ve Devam Et
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Mediator selection */}
        {step === 1 && (
          <div className="space-y-4">
            <MediatorMarketplace
              niche={niche}
              onSelect={async (m) => {
                if (!caseId) return;
                await supabase.from("mediator_requests").insert({
                  case_id: caseId,
                  mediator_id: m.id,
                  user_id: user!.id,
                  status: "pending",
                } as any).select();
                toast({ title: "Randevu talebi gönderildi", description: m.full_name });
                setStep(2);
              }}
            />
          </div>
        )}

        {/* STEP 3: Document analysis */}
        {step === 2 && (
          <div className="space-y-4">
            <DocumentUploader onTextExtracted={handleDocText} />
            <div className="flex justify-end">
              <Button onClick={analyzeDocs} disabled={analyzing}>
                {analyzing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Çelişki Analizi Yap
              </Button>
            </div>
            <ConflictCards cards={conflicts} />
            {conflicts.length > 0 && (
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => setStep(3)}>İhtiyaç Tespitine Geç</Button>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Discovery interview */}
        {step === 3 && (
          <div className="space-y-4">
            {askingQs && !questions.length ? (
              <p className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sorular hazırlanıyor...</p>
            ) : (
              <DiscoveryInterview questions={questions} onComplete={finishDiscovery} />
            )}
          </div>
        )}

        {/* STEP 5: Sessions */}
        {step === 4 && (
          <div className="space-y-4">
            {needs && (
              <Card className="p-5 space-y-3">
                <h3 className="font-semibold">Tespit Edilen İhtiyaçlar & Kazan-Kazan Senaryoları</h3>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium mb-1">İhtiyaçlar</div>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      {needs.needs?.map((n, i) => <li key={i}>{n}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium mb-1">Kazan-Kazan Senaryoları</div>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      {needs.winWinScenarios?.map((n, i) => <li key={i}>{n}</li>)}
                    </ul>
                  </div>
                </div>
              </Card>
            )}
            {caseId && <SessionScheduler caseId={caseId} />}
            <div className="flex justify-end">
              <Button onClick={() => setStep(5)}>Müzakereye Geç</Button>
            </div>
          </div>
        )}

        {/* STEP 6: Negotiation */}
        {step === 5 && (
          <div className="space-y-4">
            <Card className="p-5 space-y-3">
              <Label>Müzakere Kaydı</Label>
              <Textarea rows={8} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Görüşme notlarını veya transkripti girin..." />
              <div className="flex justify-end">
                <Button onClick={requestSuggestion} disabled={suggesting}>
                  {suggesting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  AI Önerisi Al
                </Button>
              </div>
            </Card>
            {suggestion && (
              <Card className="p-5 space-y-3">
                <h3 className="font-semibold">AI Önerileri</h3>
                <div className="text-sm space-y-2">
                  <div><b>Ortak Zemin:</b> {suggestion.commonGround}</div>
                  <div>
                    <b>Sürtüşme Noktaları:</b>
                    <ul className="list-disc pl-5 text-muted-foreground">
                      {suggestion.frictionPoints?.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                  <div>
                    <b>Öneriler:</b>
                    <ul className="list-disc pl-5 text-muted-foreground">
                      {suggestion.suggestions?.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                </div>
              </Card>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setStep(6)}>Kapanışa Geç</Button>
            </div>
          </div>
        )}

        {/* STEP 7: Closure */}
        {step === 6 && (
          <div className="space-y-4">
            <AgreementStreaming
              context={[
                `Niş: ${niche}`,
                `Uyuşmazlık: ${maskText(dispute, maskTerms()).masked}`,
                needs ? `İhtiyaçlar: ${needs.needs?.join("; ")}` : "",
                needs ? `Senaryolar: ${needs.winWinScenarios?.join("; ")}` : "",
                suggestion ? `Ortak zemin: ${suggestion.commonGround}` : "",
              ].filter(Boolean).join("\n")}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function partyToRow(case_id: string, role: string, p: Party, displayName: string) {
  return {
    case_id,
    role,
    party_type: p.partyType,
    is_individual: p.partyType === "individual",
    full_name: displayName,
    tc_kimlik: p.tcKimlik || null,
    birth_date: p.birthDate || null,
    address: p.address || null,
    phone: p.phone || null,
    email: p.email || null,
    company_name: p.companyName || null,
    tax_office: p.taxOffice || null,
    tax_number: p.taxNumber || null,
    trade_registry_no: p.tradeRegistryNo || null,
    authorized_person: p.authorizedPerson || null,
    organization: p.partyType === "corporate" ? p.companyName : null,
  };
}
