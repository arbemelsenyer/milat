import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppNavbar } from "@/components/AppNavbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2, ShieldCheck, Lock, Sparkles, Upload, FileText, Users, Brain, Lightbulb,
  Calendar, Award, Repeat, FileSignature, ArrowRight, Check, X,
} from "lucide-react";
import { SessionScheduler } from "@/components/mediation/SessionScheduler";
import { ExpertSelector } from "@/components/mediation/ExpertSelector";
import { OfficialDocsPanel } from "@/components/mediation/OfficialDocsPanel";
import { Input } from "@/components/ui/input";

interface CaseRow {
  id: string; title: string | null; application_no: string | null; uyap_no: string | null;
  dispute_type: string | null; dispute_subtype: string | null; current_phase: number | null;
  round_number: number | null; assigned_mediator_id: string | null; issue_description: string | null;
}
interface Party {
  id: string; case_id: string; user_id: string | null; party_role: string | null;
  party_type: string | null; first_name: string | null; last_name: string | null;
  company_name: string | null; email: string | null; invite_status: string | null;
}
interface PartyAnalysis {
  id: string; party_id: string; analysis: any; discovery_questions: any;
}
interface DocRow {
  id: string; file_name: string; file_path: string; uploaded_by: string; created_at: string;
}
interface DiscoveryQ {
  id: string; party_id: string | null; question_text: string; answer_text: string | null;
  question_order: number;
}

export default function CaseRoom() {
  const { id: caseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [caseRow, setCaseRow] = useState<CaseRow | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [analyses, setAnalyses] = useState<PartyAnalysis[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [discovery, setDiscovery] = useState<DiscoveryQ[]>([]);
  const [commonGround, setCommonGround] = useState<any | null>(null);
  const [working, setWorking] = useState(false);

  const myParty = parties.find((p) => p.user_id === user?.id) ?? null;
  const isMediator = !!(caseRow && user && caseRow.assigned_mediator_id === user.id);
  const isParty = !!myParty;

  useEffect(() => {
    if (!isLoading && !user) navigate("/auth");
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (user && caseId) loadAll();
  }, [user, caseId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [{ data: cr }, { data: ps }, { data: an }, { data: dc }, { data: dq }, { data: cg }] = await Promise.all([
        supabase.from("cases").select("*").eq("id", caseId).maybeSingle(),
        supabase.from("case_parties").select("*").eq("case_id", caseId),
        supabase.from("party_analyses").select("*").eq("case_id", caseId),
        supabase.from("case_documents").select("*").eq("case_id", caseId),
        supabase.from("case_discovery_questions").select("*").eq("case_id", caseId),
        supabase.from("common_ground_reports").select("*").eq("case_id", caseId)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setCaseRow(cr as any);
      setParties((ps ?? []) as any);
      setAnalyses((an ?? []) as any);
      setDocs((dc ?? []) as any);
      setDiscovery((dq ?? []) as any);
      setCommonGround(cg);
    } finally {
      setLoading(false);
    }
  }

  async function uploadDoc(file: File) {
    if (!user || !caseId) return;
    const path = `${caseId}/${user.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("case-documents").upload(path, file);
    if (upErr) { toast({ title: "Yükleme hatası", description: upErr.message, variant: "destructive" }); return; }
    const { error: insErr } = await supabase.from("case_documents").insert({
      case_id: caseId, uploaded_by: user.id, file_name: file.name, file_path: path,
      file_size: file.size, mime_type: file.type,
    });
    if (insErr) { toast({ title: "Kayıt hatası", description: insErr.message, variant: "destructive" }); return; }
    toast({ title: "Belge yüklendi" });
    await loadAll();
  }

  async function runMyAnalysis() {
    if (!myParty || !caseId) return;
    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke("party-confidential-analysis", {
        body: { case_id: caseId, party_id: myParty.id },
      });
      if (error) throw error;
      toast({ title: "Gizli analiz hazır" });
      await loadAll();
    } catch (e: any) {
      toast({ title: "Analiz hatası", description: e.message, variant: "destructive" });
    } finally { setWorking(false); }
  }

  async function runCommonGround() {
    if (!isMediator || !caseId) return;
    setWorking(true);
    try {
      const { error } = await supabase.functions.invoke("common-ground-report", {
        body: { case_id: caseId },
      });
      if (error) throw error;
      toast({ title: "Ortak zemin raporu üretildi" });
      await loadAll();
    } catch (e: any) {
      toast({ title: "AI hatası", description: e.message, variant: "destructive" });
    } finally { setWorking(false); }
  }

  async function answerDiscovery(qId: string, answer: string) {
    await supabase.from("case_discovery_questions").update({ answer_text: answer }).eq("id", qId);
    await loadAll();
  }

  if (loading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }
  if (!caseRow) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Dava bulunamadı.</div>;
  }
  if (!isMediator && !isParty) {
    return (
      <div className="min-h-screen">
        <AppNavbar />
        <div className="container mx-auto py-12 text-center">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Bu davaya erişim yetkiniz yok.</p>
        </div>
      </div>
    );
  }

  const myAnalysis = analyses.find((a) => a.party_id === myParty?.id);
  const myDocs = docs.filter((d) => d.uploaded_by === user?.id);
  const myDiscovery = discovery.filter((d) => d.party_id === myParty?.id);

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <Card className="p-5 mb-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm text-muted-foreground">
                {caseRow.application_no} {caseRow.uyap_no && `· UYAP: ${caseRow.uyap_no}`}
              </div>
              <h1 className="text-2xl font-bold text-primary">{caseRow.title}</h1>
              <div className="text-sm text-muted-foreground mt-1">
                {caseRow.dispute_type} · Aşama {caseRow.current_phase ?? 1}/8 · Tur {caseRow.round_number ?? 1}
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="gap-1">
                <ShieldCheck className="h-3 w-3" />
                {isMediator ? "Arabulucu" : `Taraf ${myParty?.party_role ?? ""}`}
              </Badge>
            </div>
          </div>
        </Card>

        {isMediator ? <MediatorView /> : <PartyView />}
      </main>
    </div>
  );

  // =================== MEDIATOR VIEW ===================
  function MediatorView() {
    return (
      <Tabs defaultValue="parties">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="parties"><Users className="h-4 w-4 mr-1" />Taraflar</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="h-4 w-4 mr-1" />Belgeler</TabsTrigger>
          <TabsTrigger value="analyses"><Brain className="h-4 w-4 mr-1" />Gizli Analizler</TabsTrigger>
          <TabsTrigger value="common"><Lightbulb className="h-4 w-4 mr-1" />Ortak Zemin</TabsTrigger>
          <TabsTrigger value="discovery">İhtiyaç Tespiti</TabsTrigger>
          <TabsTrigger value="sessions"><Calendar className="h-4 w-4 mr-1" />Toplantılar</TabsTrigger>
          <TabsTrigger value="experts"><Award className="h-4 w-4 mr-1" />Bilirkişi</TabsTrigger>
          <TabsTrigger value="rounds"><Repeat className="h-4 w-4 mr-1" />Müzakere Turları</TabsTrigger>
          <TabsTrigger value="agreement"><FileSignature className="h-4 w-4 mr-1" />Anlaşma</TabsTrigger>
        </TabsList>
        </TabsList>

        <TabsContent value="parties">
          <Card className="p-5 space-y-3">
            {parties.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <div className="font-medium">
                    Taraf {p.party_role} ·{" "}
                    {p.party_type === "individual" ? `${p.first_name ?? ""} ${p.last_name ?? ""}` : p.company_name}
                  </div>
                  <div className="text-xs text-muted-foreground">{p.email}</div>
                </div>
                <Badge variant={p.invite_status === "accepted" ? "default" : "outline"}>
                  {p.invite_status === "accepted" ? "Katıldı" : "Davet Bekliyor"}
                </Badge>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Tüm belgeler (arabulucu görür)</h3>
            {docs.length === 0 ? (
              <p className="text-muted-foreground text-sm">Henüz belge yüklenmedi.</p>
            ) : (
              <ul className="space-y-2">
                {docs.map((d) => {
                  const owner = parties.find((p) => p.user_id === d.uploaded_by);
                  return (
                    <li key={d.id} className="text-sm flex items-center justify-between">
                      <span>{d.file_name}</span>
                      <span className="text-xs text-muted-foreground">
                        Taraf {owner?.party_role ?? "?"} · {new Date(d.created_at).toLocaleDateString("tr-TR")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="analyses">
          <div className="grid md:grid-cols-2 gap-4">
            {parties.map((p) => {
              const a = analyses.find((x) => x.party_id === p.id);
              return (
                <Card key={p.id} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Taraf {p.party_role} Gizli Analizi</h3>
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {!a ? (
                    <p className="text-sm text-muted-foreground">Henüz üretilmedi.</p>
                  ) : (
                    <AnalysisView analysis={a.analysis} />
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="common">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" /> Ortak Zemin & Strateji
                </h3>
                <p className="text-xs text-muted-foreground">Yalnız arabulucu görür. Taraflar erişemez.</p>
              </div>
              <Button onClick={runCommonGround} disabled={working || analyses.length < 2}>
                {working ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                AI Önerisi Al
              </Button>
            </div>
            {commonGround ? (
              <pre className="bg-muted/40 p-3 rounded text-xs whitespace-pre-wrap">
                {JSON.stringify(commonGround.report, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">Henüz rapor yok. İki taraf analizi sonrası üretebilirsiniz.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="discovery">
          <Card className="p-5 space-y-3">
            {parties.map((p) => {
              const qs = discovery.filter((d) => d.party_id === p.id);
              return (
                <div key={p.id} className="border rounded p-3">
                  <div className="font-medium mb-2">Taraf {p.party_role}</div>
                  {qs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Henüz soru yok.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {qs.sort((a, b) => a.question_order - b.question_order).map((q) => (
                        <li key={q.id}>
                          <div className="font-medium">{q.question_text}</div>
                          <div className="text-muted-foreground italic">
                            {q.answer_text || "(cevap bekleniyor)"}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <SessionScheduler
            caseId={caseId!}
            niche={caseRow?.dispute_type ?? ""}
            context={caseRow?.issue_description ?? caseRow?.title ?? ""}
          />
        </TabsContent>

        <TabsContent value="experts">
          <ExpertsTab caseId={caseId!} niche={caseRow?.dispute_type ?? ""} />
        </TabsContent>

        <TabsContent value="rounds">
          <RoundsTab caseId={caseId!} parties={parties} />
        </TabsContent>

        <TabsContent value="agreement">
          <AgreementTab caseRow={caseRow!} parties={parties} onChanged={loadAll} />
        </TabsContent>
      </Tabs>
    );
  }

  // =================== PARTY VIEW ===================
  function PartyView() {
    return (
      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents"><Upload className="h-4 w-4 mr-1" />Belgelerim</TabsTrigger>
          <TabsTrigger value="analysis"><Brain className="h-4 w-4 mr-1" />Gizli Analizim</TabsTrigger>
          <TabsTrigger value="discovery">İhtiyaç Tespiti</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <Card className="p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              <ShieldCheck className="inline h-3 w-3 mr-1" />
              Diğer taraf yüklediğiniz belgeleri göremez. Yalnız arabulucu görür.
            </p>
            <input type="file" onChange={(e) => e.target.files?.[0] && uploadDoc(e.target.files[0])} />
            <ul className="text-sm space-y-1 mt-3">
              {myDocs.map((d) => <li key={d.id}>• {d.file_name}</li>)}
              {myDocs.length === 0 && <li className="text-muted-foreground">Henüz belge yok.</li>}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Size Özel Gizli Analiz
                </h3>
                <p className="text-xs text-muted-foreground">Diğer taraf bunu göremez.</p>
              </div>
              <Button onClick={runMyAnalysis} disabled={working}>
                {working ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                {myAnalysis ? "Yeniden Üret" : "Analizi Başlat"}
              </Button>
            </div>
            {myAnalysis ? (
              <AnalysisView analysis={myAnalysis.analysis} />
            ) : (
              <p className="text-sm text-muted-foreground">Henüz analiz yok. Belgelerinizi yükledikten sonra başlatın.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="discovery">
          <Card className="p-5 space-y-3">
            <h3 className="font-semibold">5 İhtiyaç Tespiti Sorusu</h3>
            {myDiscovery.length === 0 ? (
              <p className="text-sm text-muted-foreground">Analizi başlattıktan sonra sorular burada görünecek.</p>
            ) : (
              myDiscovery.sort((a, b) => a.question_order - b.question_order).map((q) => (
                <div key={q.id} className="space-y-1">
                  <Label>{q.question_order}. {q.question_text}</Label>
                  <Textarea
                    defaultValue={q.answer_text ?? ""}
                    onBlur={(e) => answerDiscovery(q.id, e.target.value)}
                    placeholder="Cevabınız..."
                  />
                </div>
              ))
            )}
          </Card>
        </TabsContent>
      </Tabs>
    );
  }
}

function AnalysisView({ analysis }: { analysis: any }) {
  if (!analysis) return null;
  const sections: [string, any][] = [
    ["Güçlü Yönler", analysis.strengths],
    ["Zayıf Yönler", analysis.weaknesses],
    ["Riskler", analysis.risks],
    ["Fırsatlar", analysis.opportunities],
  ];
  return (
    <div className="space-y-3 text-sm">
      {sections.map(([title, list]) => (
        <div key={title}>
          <div className="font-semibold">{title}</div>
          {Array.isArray(list) && list.length ? (
            <ul className="list-disc pl-5">{list.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
          ) : <div className="text-muted-foreground italic">—</div>}
        </div>
      ))}
      {Array.isArray(analysis.precedents) && analysis.precedents.length > 0 && (
        <div>
          <div className="font-semibold">Emsal Kararlar</div>
          <ul className="space-y-1">
            {analysis.precedents.map((p: any, i: number) => (
              <li key={i} className="text-xs">
                <span className="font-medium">{p.court}:</span> {p.decision} — <span className="italic">{p.relevance}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
