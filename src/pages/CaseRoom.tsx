import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2, ShieldCheck, Lock, Sparkles, Upload, FileText, Users, Brain, Lightbulb,
  Calendar, Award, Repeat, FileSignature, ArrowRight, Check, X, History, Filter, FileDown, MessageSquare, Bot,
  Wallet, Pencil, EyeOff, Mail,
} from "lucide-react";
import { MeetingNotesPanel } from "@/components/mediation/MeetingNotesPanel";
import { SessionScheduler } from "@/components/mediation/SessionScheduler";
import { ExpertSelector } from "@/components/mediation/ExpertSelector";
import { OfficialDocsPanel } from "@/components/mediation/OfficialDocsPanel";
import { StepTimeline } from "@/components/mediation/StepTimeline";
import { AgentControlPanel } from "@/components/mediation/AgentControlPanel";
import { AjanPenceresi } from "@/components/AjanPenceresi";
import { BilirkisiAlanlari } from "@/components/bilirkisi/BilirkisiAlanlari";
import { BilirkisiTarafPaneli } from "@/components/bilirkisi/BilirkisiTarafPaneli";
import { downloadOfficialPdf } from "@/lib/pdfTemplates";
import { downloadPaymentInfoPdf } from "@/lib/invoice-pdf";
import { formatDisputeType } from "@/lib/disputeLabels";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { KAYIT_ONAY_SAAT, KAYIT_ONAY_SURUMU, KAYIT_ONAY_METNI } from "@/lib/kayitProtokolu";
import { etiketsizGovde } from "@/lib/etiket";
import { depoHataMetni } from "@/lib/depoHatasi";

// YZ kullanım beyanı — metin ve sürümü tek yerde; sürüm değişirse onay yeniden istenir.
const YZ_BEYAN_SURUMU = "v1";
const YZ_BEYAN_METNI = `Bu arabuluculuk sürecinde, arabulucunuza destek olması amacıyla MediPact AI yapay zekâ araçları kullanılmaktadır. Bu araçlar; başvuru bilgilerinin düzenlenmesi, belgelerin özetlenmesi ve analizi, görüşme saatlerinin planlanması, size sorulacak bilgi sorularının hazırlanması ve belge taslaklarının oluşturulmasında görev yapar.

Bilmeniz gerekenler:
1. Paylaştığınız bilgiler yalnız sizin sürecinizde kullanılır; belgeleriniz ve beyanlarınız açık rızanız olmadan karşı tarafa gösterilmez.
2. Yapay zekâ çıktıları öneri niteliğindedir; süreçle ilgili kararlar arabulucunuz ve taraflarca verilir.
3. Bu araçlar hukuki danışmanlık vermez; hukuki değerlendirmeleriniz için vekilinizle görüşünüz.
4. Kullanılan araçlar hakkında bilgi isteme ve kullanımına itiraz etme hakkınız vardır; itirazınız çözülmezse ilgili araç dosyanızda kullanılmaz.`;

const tabTriggerAccentClass =
  "border-b-2 border-b-transparent transition-colors hover:border-b-accent hover:text-accent data-[state=active]:border-b-accent data-[state=active]:text-accent";

// Taraf belge yüklemesi için denetim eşiği — MediationEngine.tsx:2062-2069'daki
// arabulucu hattıyla birebir aynı liste.
const DOC_MAX_SIZE = 10 * 1024 * 1024;
const DOC_ALLOWED_EXT = ["pdf", "doc", "docx", "txt"];
const DOC_ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

interface CaseRow {
  id: string; title: string | null; application_no: string | null; uyap_no: string | null;
  dispute_type: string | null; dispute_subtype: string | null; current_phase: number | null;
  round_number: number | null; assigned_mediator_id: string | null; issue_description: string | null;
  user_id: string; mediation_type: string | null;
}
interface PaymentRow {
  id: string; kind: string; amount: number; status: string;
  payment_date: string; description: string | null;
}
interface MediatorPaymentInfo {
  full_name: string | null; banka_adi: string | null; iban: string | null;
}
interface PaymentReference {
  arb_no: string | null; buro_no: string | null; mediation_type: string | null;
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

const PROCESS_STEPS = [
  { key: "parties", label: "Taraflar" },
  { key: "analysis", label: "Gizli Analiz" },
  { key: "common", label: "Ortak Zemin" },
  { key: "discovery", label: "İhtiyaç" },
  { key: "sessions", label: "Toplantı" },
  { key: "experts", label: "Bilirkişi" },
  { key: "rounds", label: "Turlar" },
  { key: "agreement", label: "Belgeler" },
];

// Taraf görünümündeki sekme adları. `?sekme=<ad>` bağlantılarının yalnız gerçekten
// var olan bir sekmeyi açabilmesi için burada tutuluyor; liste aşağıdaki
// <TabsTrigger value=...> değerleriyle birebir aynıdır.
const TARAF_SEKMELERI = [
  "documents",
  "analysis",
  "discovery",
  "experts",
  "payment",
  "randevu",
  "iletisim",
  "braket",
  "ajanim",
  "agents",
  "hazirligim",
  "kalemlerim",
];

export default function CaseRoom() {
  const { id: caseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [caseRow, setCaseRow] = useState<CaseRow | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [analyses, setAnalyses] = useState<PartyAnalysis[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [discovery, setDiscovery] = useState<DiscoveryQ[]>([]);
  const [commonGround, setCommonGround] = useState<any | null>(null);
  const [working, setWorking] = useState(false);
  const [myPayments, setMyPayments] = useState<PaymentRow[]>([]);
  const [mediatorPaymentInfo, setMediatorPaymentInfo] = useState<MediatorPaymentInfo | null>(null);
  const [arbNo, setArbNo] = useState<string>("");
  const [buroNo, setBuroNo] = useState<string>("");
  const [pdfWorking, setPdfWorking] = useState(false);
  const [editIssueOpen, setEditIssueOpen] = useState(false);
  const [issueDescDraft, setIssueDescDraft] = useState("");
  const [savingIssue, setSavingIssue] = useState(false);
  const [docBusy, setDocBusy] = useState<string | null>(null);
  const [deleteDocTarget, setDeleteDocTarget] = useState<DocRow | null>(null);
  // YZ kullanım beyanı: taraf onaylamadan dosya içeriği açılmaz.
  const [yzDurum, setYzDurum] = useState<"yukleniyor" | "gerekli" | "tamam">("yukleniyor");
  const [yzBusy, setYzBusy] = useState(false);
  const [yzHata, setYzHata] = useState<string | null>(null);
  // Taraf sekmelerinde AÇIK OLAN sekme. Varsayılan eskisiyle aynı ("analysis");
  // ajan penceresi bekleyen bir işe basılınca ilgili sekmeyi açabilsin diye durum
  // olarak tutuluyor. Sekme listesi, sırası ve adları değişmedi.
  // `?sekme=<ad>` ile dışarıdan doğrudan bir sekme açılabilir (İletişim Tercihleri
  // sayfası buraya bağlanıyor). Bilinmeyen değer yok sayılır — boş sekme çıkmaz.
  const [aramaParametreleri] = useSearchParams();
  const [partySekme, setPartySekme] = useState(() => {
    const istenen = aramaParametreleri.get("sekme");
    return istenen && TARAF_SEKMELERI.includes(istenen) ? istenen : "analysis";
  });

  const myParty = parties.find((p) => p.user_id === user?.id) ?? null;
  const isOwner = !!(caseRow && user && caseRow.user_id === user.id);
  const isMediator = !!(caseRow && user && caseRow.assigned_mediator_id === user.id);
  const isParty = !!myParty;

  // Onay kaydı yalnız tarafın kendi party_id'siyle aranır; arabulucu/admin ekranında
  // kart hiç çıkmaz (kapı yalnız taraf girişinde işler).
  useEffect(() => {
    if (isMediator || isAdmin) { setYzDurum("tamam"); return; }
    if (!myParty?.id) { setYzDurum("yukleniyor"); return; }
    let aktif = true;
    (async () => {
      const { data, error } = await (supabase.from("yz_beyan_onaylari" as any) as any)
        .select("id")
        .eq("party_id", myParty.id)
        .eq("metin_surumu", YZ_BEYAN_SURUMU)
        .limit(1);
      if (!aktif) return;
      if (error) {
        setYzHata(`Beyan durumu okunamadı: ${error.message}`);
        setYzDurum("gerekli");
        return;
      }
      setYzHata(null);
      setYzDurum(Array.isArray(data) && data.length > 0 ? "tamam" : "gerekli");
    })();
    return () => { aktif = false; };
  }, [myParty?.id, isMediator, isAdmin]);

  async function yzBeyaniOnayla() {
    if (!myParty?.id || !caseRow?.id || yzBusy) return;
    setYzBusy(true);
    setYzHata(null);
    const { error } = await (supabase.from("yz_beyan_onaylari" as any) as any).insert({
      party_id: myParty.id,
      case_id: caseRow.id,
      metin_surumu: YZ_BEYAN_SURUMU,
    });
    if (error) setYzHata(`Kaydedilemedi: ${error.message}`);   // kart kapanmaz
    else setYzDurum("tamam");
    setYzBusy(false);
  }

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

      const ownPartyId = (ps ?? []).find((p: any) => p.user_id === user?.id)?.id ?? null;
      if (ownPartyId) {
        const [{ data: pay }, rpcRes, refRes] = await Promise.all([
          supabase.from("case_payments")
            .select("id, kind, amount, status, payment_date, description")
            .eq("case_id", caseId).eq("payer_party_id", ownPartyId),
          (supabase.rpc as any)("get_case_mediator_payment_info", { p_case_id: caseId }),
          (supabase.rpc as any)("get_case_payment_reference", { p_case_id: caseId }),
        ]);
        setMyPayments((pay ?? []) as any);
        const rpcRows = !rpcRes.error ? (rpcRes.data as MediatorPaymentInfo[] | null) : null;
        setMediatorPaymentInfo(rpcRows && rpcRows.length > 0 ? rpcRows[0] : null);

        const refRows = !refRes.error ? (refRes.data as PaymentReference[] | null) : null;
        const ref = refRows && refRows.length > 0 ? refRows[0] : null;
        setArbNo(ref?.arb_no ?? "");
        setBuroNo(ref?.buro_no ?? "");
      } else {
        setMyPayments([]);
        setMediatorPaymentInfo(null);
        setArbNo("");
        setBuroNo("");
      }
    } finally {
      setLoading(false);
    }
  }

  function paymentDescription(): string {
    if (!caseRow) return "";
    const arb = arbNo || "[dosya no girilmemiş]";
    if (caseRow.mediation_type === "dava_sarti") {
      return `${buroNo || "—"} büro / ${arb} arabuluculuk no.lu dosya arabuluculuk ücreti`;
    }
    return `${arb} no.lu dosya arabuluculuk ücreti`;
  }

  async function downloadMyPaymentInfo() {
    if (myPayments.length === 0) return;
    setPdfWorking(true);
    try {
      await downloadPaymentInfoPdf({
        fileDescription: paymentDescription(),
        payments: myPayments.map((p) => ({
          kind: p.kind,
          amount: Number(p.amount),
          status: p.status === "odendi" ? "odendi" : "bekliyor",
        })),
        mediatorName: mediatorPaymentInfo?.full_name ?? null,
        mediatorBank: mediatorPaymentInfo?.banka_adi ?? null,
        mediatorIban: mediatorPaymentInfo?.iban ?? null,
      });
    } catch (e: any) {
      toast({ title: "PDF oluşturulamadı", description: e.message, variant: "destructive" });
    } finally {
      setPdfWorking(false);
    }
  }

  async function uploadDoc(file: File) {
    if (!user || !caseId) return;

    // Arabulucu hattındaki (MediationEngine.tsx:2124-2133) denetimin aynısı.
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!DOC_ALLOWED_EXT.includes(ext) && !DOC_ALLOWED_MIME.includes(file.type)) {
      toast({ title: "Geçersiz dosya türü", description: `"${file.name}" yalnızca PDF, Word veya metin dosyası olabilir.`, variant: "destructive" });
      return;
    }
    if (file.size > DOC_MAX_SIZE) {
      toast({ title: "Dosya çok büyük", description: `"${file.name}" 10MB sınırını aşıyor.`, variant: "destructive" });
      return;
    }

    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${user.id}/${caseId}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from("case-documents").upload(path, file);
    if (upErr) { toast({ title: "Yükleme hatası", description: upErr.message, variant: "destructive" }); return; }
    const { data: inserted, error: insErr } = await supabase.from("case_documents").insert({
      case_id: caseId, uploaded_by: user.id, file_name: file.name, file_path: path,
      file_size: file.size, mime_type: file.type,
      // party_id: taraf bilinmiyorsa (myParty henüz yüklenmediyse) bugünkü gibi party_id'siz
      // devam edilir — yükleme asla engellenmez.
      ...(myParty?.id ? { party_id: myParty.id } : {}),
    }).select("id").single();
    if (insErr) { toast({ title: "Kayıt hatası", description: insErr.message, variant: "destructive" }); return; }
    // Metin çıkarma: beklemesiz (fire-and-forget) — yüklemeyi bloklamaz, hata sessizce loglanır.
    supabase.functions.invoke("extract-document-text", { body: { document_id: inserted?.id } })
      .catch((e) => console.error("[extract-document-text] tetiklenemedi", e));
    toast({ title: "Belge yüklendi" });
    await loadAll();
  }

  // Kendi belgesini indirir. Mevcut SELECT politikası kendi yüklediği dosyaya zaten izin
  // veriyor — yeni politika gerekmez.
  async function downloadMyDoc(d: DocRow) {
    setDocBusy(d.id);
    try {
      const { data, error } = await supabase.storage.from("case-documents").download(d.file_path);
      if (error || !data) throw error ?? new Error("Dosya indirilemedi.");
      const blobUrl = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = d.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
    } catch (e: any) {
      /* Ham depo hatası ("Object not found") kullanıcıya yetki sorunu gibi
         görünüyordu. `depoHataMetni` dosya yokluğunu yetki eksikliğinden
         ayırır — canlıda dosyası olmayan 2 üstveri satırı var. */
      toast({ title: "İndirilemedi", description: depoHataMetni(e), variant: "destructive" });
    } finally {
      setDocBusy(null);
    }
  }

  // Önce DB satırı silinir (mevcut DELETE politikası yeterli); storage'dan kaldırma
  // başarısız olsa bile liste güncellenir — kullanıcıya yanlış "silinemedi" gösterilmez.
  async function deleteMyDoc(d: DocRow) {
    setDocBusy(d.id);
    try {
      const { error } = await supabase.from("case_documents").delete().eq("id", d.id);
      if (error) throw error;
      const { error: rmErr } = await supabase.storage.from("case-documents").remove([d.file_path]);
      if (rmErr) console.warn("[case-documents] storage'dan kaldırılamadı", rmErr.message);
      toast({ title: "Belge silindi" });
      await loadAll();
    } catch (e: any) {
      toast({ title: "Silinemedi", description: e?.message ?? "Bilinmeyen hata", variant: "destructive" });
    } finally {
      setDocBusy(null);
      setDeleteDocTarget(null);
    }
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

  function openEditIssue() {
    setIssueDescDraft(caseRow?.issue_description ?? "");
    setEditIssueOpen(true);
  }

  async function saveIssueDescription() {
    if (!caseId || !caseRow) return;
    setSavingIssue(true);
    try {
      const previous = caseRow.issue_description ?? "";
      const next = issueDescDraft;
      const changed = previous.trim() !== next.trim();
      const { error } = await supabase.from("cases").update({ issue_description: next || null }).eq("id", caseId);
      if (error) throw error;
      // NOT: party_analyses / common_ground_reports / party_root_cause_analysis kasıtlı olarak
      // dokunulmuyor — kök neden ve önceki analizler kaybolmasın diye. Bunlar sadece "Tüm Analizi
      // Başlat" yeniden çalıştırılınca güncellenir.
      setCaseRow((prev) => (prev ? { ...prev, issue_description: next || null } : prev));
      setEditIssueOpen(false);
      if (changed) {
        toast({
          title: "Uyuşmazlık konusu güncellendi",
          description: "Mevcut analizler eski metne göre üretilmiştir; güncellemek için Tüm Analizi Başlat'ı yeniden çalıştırın.",
        });
      } else {
        toast({ title: "Kaydedildi" });
      }
    } catch (e: any) {
      toast({ title: "Kaydedilemedi", description: e.message, variant: "destructive" });
    } finally {
      setSavingIssue(false);
    }
  }

  if (loading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }
  if (!caseRow) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Başvuru bulunamadı.</div>;
  }
  if (!isOwner && !isMediator && !isParty) {
    return (
      <div className="min-h-screen">
        <AppNavbar />
        <div className="container mx-auto py-12 text-center">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Bu başvuruya erişim yetkiniz yok.</p>
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
                {formatDisputeType(caseRow.dispute_type, caseRow.dispute_subtype)} · Aşama {Math.min(7, Math.max(1, caseRow.current_phase ?? 1))}/7 · Tur {caseRow.round_number ?? 1}
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="gap-1">
                <ShieldCheck className="h-3 w-3" />
                {isMediator ? "Arabulucu" : isParty ? `Taraf ${myParty?.party_role ?? ""}` : "Başvuru Sahibi"}
              </Badge>
            </div>
          </div>
          {(isMediator || isOwner || isAdmin) && (
            <div className="mt-4 border-t pt-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Uyuşmazlık Konusu</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {caseRow.issue_description || <span className="text-muted-foreground italic">Girilmemiş.</span>}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={openEditIssue}>
                  <Pencil className="h-4 w-4 mr-1" /> Düzenle
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Dialog open={editIssueOpen} onOpenChange={(o) => !o && !savingIssue && setEditIssueOpen(false)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Uyuşmazlık Konusunu Düzenle</DialogTitle>
            </DialogHeader>
            <Textarea
              value={issueDescDraft}
              onChange={(e) => setIssueDescDraft(e.target.value)}
              rows={6}
              placeholder="Uyuşmazlık konusunu yazın..."
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditIssueOpen(false)} disabled={savingIssue}>İptal</Button>
              <Button onClick={saveIssueDescription} disabled={savingIssue}>
                {savingIssue ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Kaydediliyor…</> : "Kaydet"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {!isMediator && !isAdmin && isParty && yzDurum !== "tamam" ? (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Yapay Zekâ Kullanım Bilgilendirmesi</h2>
            {yzDurum === "yukleniyor" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <p className="text-sm whitespace-pre-line leading-relaxed">{YZ_BEYAN_METNI}</p>
                {yzHata && (
                  <div className="text-sm rounded border border-destructive/40 bg-destructive/10 text-destructive p-3">
                    {yzHata}
                  </div>
                )}
                <Button onClick={yzBeyaniOnayla} disabled={yzBusy}>
                  {yzBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Okudum, bilgilendirildim
                </Button>
              </>
            )}
          </Card>
        ) : (
          <>
            <ProcessOverview
              currentPhase={caseRow.current_phase ?? 1}
              parties={parties}
              analyses={analyses}
              discovery={discovery}
              docs={docs}
              commonGround={commonGround}
            />

            {/* DÜZELTME (15.08): Bu iki görünüm CaseRoom'un GÖVDESİNDE tanımlıdır; JSX
                elemanı olarak (<PartyView />) yazılınca her CaseRoom render'ında bileşen
                TÜRÜ değişiyor, React ağacı söküp yeniden kuruyor ve alt bileşenlerin
                yerel durumu (braket formundaki yazılan değerler) siliniyordu. Düz
                fonksiyon çağrısı JSX'i yerinde üretir; yeniden mount olmaz.
                İkisinde de hook YOKTUR — koşullu çağrı hook kuralını bozmaz. */}
            {isMediator ? MediatorView() : PartyView()}
          </>
        )}
      </main>
    </div>
  );

  // =================== MEDIATOR VIEW ===================
  function MediatorView() {
    return (
      <Tabs defaultValue="analyses">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="parties" className={tabTriggerAccentClass}><Users className="h-4 w-4 mr-1" />Taraflar</TabsTrigger>
          <TabsTrigger value="documents" className={tabTriggerAccentClass}><FileText className="h-4 w-4 mr-1" />Belgeler</TabsTrigger>
          <TabsTrigger value="analyses" className={tabTriggerAccentClass}><Brain className="h-4 w-4 mr-1" />Gizli Analizler</TabsTrigger>
          <TabsTrigger value="common" className={tabTriggerAccentClass}><Lightbulb className="h-4 w-4 mr-1" />Ortak Zemin</TabsTrigger>
          <TabsTrigger value="discovery" className={tabTriggerAccentClass}>İhtiyaç Tespiti</TabsTrigger>
          <TabsTrigger value="sessions" className={tabTriggerAccentClass}><Calendar className="h-4 w-4 mr-1" />Toplantılar</TabsTrigger>
          <TabsTrigger value="experts" className={tabTriggerAccentClass}><Award className="h-4 w-4 mr-1" />Bilirkişi</TabsTrigger>
          <TabsTrigger value="rounds" className={tabTriggerAccentClass}><MessageSquare className="h-4 w-4 mr-1" />Görüşme Notları</TabsTrigger>
          <TabsTrigger value="agreement" className={tabTriggerAccentClass}><FileSignature className="h-4 w-4 mr-1" />Anlaşma</TabsTrigger>
          <TabsTrigger value="agents" className={tabTriggerAccentClass}><Bot className="h-4 w-4 mr-1" />Ajan Kontrol Paneli</TabsTrigger>
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
              <CommonGroundView report={commonGround.report} />
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
            parties={parties}
            mediatorId={caseRow?.assigned_mediator_id}
          />
        </TabsContent>

        <TabsContent value="experts">
          {/* YENİ: alan satırları · aday · taraf yanıtları · atama · evrak kümesi.
              Mevcut ExpertSelector ve öneri/onay kartı KALDIRILMADI, altta durur. */}
          <div className="space-y-4">
            <BilirkisiAlanlari caseId={caseId!} />
            <ExpertsTab caseId={caseId!} niche={caseRow?.dispute_type ?? ""} parties={parties} />
          </div>
        </TabsContent>

        <TabsContent value="rounds">
          <MeetingNotesPanel caseId={caseId!} caseSummary={caseRow?.title ?? ""} />
        </TabsContent>

        <TabsContent value="agreement">
          <AgreementTab caseRow={caseRow!} parties={parties} onChanged={loadAll} />
        </TabsContent>

        <TabsContent value="agents">
          <AgentControlPanel caseId={caseId!} isMediator={isMediator} />
        </TabsContent>
      </Tabs>
    );
  }

  // =================== PARTY VIEW ===================
  function PartyView() {
    return (
      <>
      {/* Kayıt onayı: arabulucu onay formunu açtıysa görünür, açmadıysa hiç çıkmaz.
          Sekmelerin ÜSTÜNDE durur ama kapı değildir — ekranın geri kalanı açık. */}
      {myParty?.id && <div className="mb-4"><KayitOnayKarti caseId={caseId!} partyId={myParty.id} /></div>}
      {/* AJAN PENCERESİ (salt görünüm) — taraf yalnız KENDİ satırlarını görür;
          süzgeç sorgudadır. Bekleyen satıra basınca ilgili sekme açılır. */}
      {myParty?.id && (
        <AjanPenceresi caseId={caseId!} mod="taraf" partyId={myParty.id} onGit={(s) => setPartySekme(s)} />
      )}
      {/* Sekme listesi, sırası ve adları DEĞİŞMEDİ; yalnız hangi sekmenin açık
          olduğu duruma bağlandı ki ajan penceresi ilgili sekmeyi açabilsin.
          Varsayılan yine "analysis". */}
      <Tabs value={partySekme} onValueChange={setPartySekme}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="documents" className={tabTriggerAccentClass}><Upload className="h-4 w-4 mr-1" />Belgelerim</TabsTrigger>
          <TabsTrigger value="analysis" className={tabTriggerAccentClass}><Brain className="h-4 w-4 mr-1" />Gizli Analizim</TabsTrigger>
          <TabsTrigger value="discovery" className={tabTriggerAccentClass}>İhtiyaç Tespiti</TabsTrigger>
          <TabsTrigger value="experts" className={tabTriggerAccentClass}><Award className="h-4 w-4 mr-1" />Bilirkişi Onayı</TabsTrigger>
          <TabsTrigger value="payment" className={tabTriggerAccentClass}><Wallet className="h-4 w-4 mr-1" />Ödeme Bilgim</TabsTrigger>
          <TabsTrigger value="randevu" className={tabTriggerAccentClass}><Calendar className="h-4 w-4 mr-1" />Randevu Tercihlerim</TabsTrigger>
          <TabsTrigger value="iletisim" className={tabTriggerAccentClass}><Mail className="h-4 w-4 mr-1" />İletişim Tercihlerim</TabsTrigger>
          <TabsTrigger value="braket" className={tabTriggerAccentClass}><EyeOff className="h-4 w-4 mr-1" />Kabul Aralığım</TabsTrigger>
          <TabsTrigger value="ajanim" className={tabTriggerAccentClass}><Bot className="h-4 w-4 mr-1" />Ajanım</TabsTrigger>
          <TabsTrigger value="agents" className={tabTriggerAccentClass}><Bot className="h-4 w-4 mr-1" />AI Aktivitelerim</TabsTrigger>
          <TabsTrigger value="hazirligim" className={tabTriggerAccentClass}><FileText className="h-4 w-4 mr-1" />Oturum hazırlığım</TabsTrigger>
          <TabsTrigger value="kalemlerim" className={tabTriggerAccentClass}><Wallet className="h-4 w-4 mr-1" />Taleplerim ve dayanakları</TabsTrigger>
        </TabsList>

        <TabsContent value="braket">
          {myParty?.id
            ? <BraketTarafBolumu caseId={caseId!} partyId={myParty.id} />
            : <Card className="p-5"><p className="text-sm text-muted-foreground">Taraf kaydınız bulunamadı.</p></Card>}
        </TabsContent>

        <TabsContent value="ajanim">
          {myParty?.id
            ? <AjanimBolumu caseId={caseId!} partyId={myParty.id} />
            : <Card className="p-5"><p className="text-sm text-muted-foreground">Taraf kaydınız bulunamadı.</p></Card>}
        </TabsContent>

        <TabsContent value="randevu">
          {myParty?.id
            ? <RandevuTercihlerim partyId={myParty.id} />
            : <Card className="p-5"><p className="text-sm text-muted-foreground">Taraf kaydınız bulunamadı.</p></Card>}
        </TabsContent>

        <TabsContent value="iletisim">
          {myParty?.id
            ? <IletisimTercihlerim caseId={caseId!} partyId={myParty.id} />
            : <Card className="p-5"><p className="text-sm text-muted-foreground">Taraf kaydınız bulunamadı.</p></Card>}
        </TabsContent>

        <TabsContent value="kalemlerim">
          {myParty?.id
            ? <TaleplerimBolumu caseId={caseId!} partyId={myParty.id} />
            : <Card className="p-5"><p className="text-sm text-muted-foreground">Taraf kaydınız bulunamadı.</p></Card>}
        </TabsContent>

        <TabsContent value="hazirligim">
          {myParty?.id
            ? <OturumHazirligim caseId={caseId!} partyId={myParty.id} />
            : <Card className="p-5"><p className="text-sm text-muted-foreground">Taraf kaydınız bulunamadı.</p></Card>}
        </TabsContent>

        <TabsContent value="documents">
          <Card className="p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              <ShieldCheck className="inline h-3 w-3 mr-1" />
              Diğer taraf yüklediğiniz belgeleri göremez. Yalnız arabulucu görür.
            </p>
            <input type="file" onChange={(e) => e.target.files?.[0] && uploadDoc(e.target.files[0])} />
            <ul className="text-sm space-y-1 mt-3">
              {myDocs.map((d) => (
                <li key={d.id} className="flex items-center gap-2 p-2 border rounded">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="flex-1 truncate">{d.file_name}</span>
                  <Button variant="ghost" size="sm" title="İndir"
                    onClick={() => downloadMyDoc(d)} disabled={docBusy === d.id}>
                    {docBusy === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />}
                  </Button>
                  <Button variant="ghost" size="sm" title="Sil"
                    onClick={() => setDeleteDocTarget(d)} disabled={docBusy === d.id}>
                    <X className="h-3 w-3" />
                  </Button>
                </li>
              ))}
              {myDocs.length === 0 && <li className="text-muted-foreground">Henüz belge yok.</li>}
            </ul>

            <AlertDialog open={!!deleteDocTarget} onOpenChange={(o) => { if (!o && !docBusy) setDeleteDocTarget(null); }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Belge silinsin mi?</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{deleteDocTarget?.file_name}" kalıcı olarak silinecek. Bu işlem geri alınamaz.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={!!docBusy}>Vazgeç</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={!!docBusy}
                    onClick={(e) => { e.preventDefault(); if (deleteDocTarget) deleteMyDoc(deleteDocTarget); }}
                  >
                    {docBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null} Sil
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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

        <TabsContent value="experts">
          {/* YENİ: beyan · aday profil kartları · işaretleme · dış aday · rapor.
              Mevcut onay kartı KALDIRILMADI, altta durur. */}
          <div className="space-y-4">
            <BilirkisiTarafPaneli caseId={caseId!} />
            <PartyExpertApproval caseId={caseId!} partyId={myParty!.id} />
          </div>
        </TabsContent>

        <TabsContent value="payment">
          <div className="space-y-4">
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-semibold flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> Ödeme Bilgim
                </h3>
                {myPayments.length > 0 && (
                  <Button variant="outline" size="sm" onClick={downloadMyPaymentInfo} disabled={pdfWorking}>
                    {pdfWorking ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
                    Bilgi Yazısı İndir
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                <ShieldCheck className="inline h-3 w-3 mr-1" />
                Yalnız size ait ödeme kayıtlarını görürsünüz. Diğer tarafın bilgisi asla gösterilmez.
              </p>
              {myPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Bu dosyada sizden tahsilat kaydı bulunmuyor.</p>
              ) : (
                <ul className="space-y-2">
                  {myPayments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0 text-sm">
                      <div>
                        <div className="font-medium">
                          {p.kind === "ucret" ? "Ücret" : "Masraf"} · {Number(p.amount).toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                        </div>
                        <div className="text-xs text-muted-foreground">{paymentDescription()}</div>
                      </div>
                      <Badge variant={p.status === "odendi" ? "default" : "outline"}>
                        {p.status === "odendi" ? "Ödendi ✓" : "Ödeme bekleniyor"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5 space-y-2">
              <h3 className="font-semibold text-sm">Arabulucu Banka Bilgisi</h3>
              {mediatorPaymentInfo && (mediatorPaymentInfo.iban || mediatorPaymentInfo.banka_adi) ? (
                <div className="text-sm space-y-1">
                  <div>{mediatorPaymentInfo.full_name}</div>
                  {mediatorPaymentInfo.banka_adi && <div className="text-muted-foreground">{mediatorPaymentInfo.banka_adi}</div>}
                  {mediatorPaymentInfo.iban && <div className="font-mono">{mediatorPaymentInfo.iban}</div>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Arabulucu banka bilgisi henüz girilmemiş.</p>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents">
          <AgentControlPanel caseId={caseId!} isMediator={false} />
        </TabsContent>
      </Tabs>
      {/* Taraf sohbet asistanı — yalnız taraf görünümünde, mevcut kartların altında. */}
      <DosyaAsistani caseId={caseId!} />
      </>
    );
  }
}

/* ===================== KÖR TEKLİF v2 — KABUL ARALIĞI / BRAKET (taraf) ===================== */
// Girilen değerler yalnız bu tarafa ve arabulucuya görünür (RLS: is_own_case_party +
// is_case_mediator). Karşı taraf ne aralığı, ne koşullu taahhüdü, ne de bunların var
// olduğunu hiçbir yüzeyden göremez. Bant sorusu kaynağını göstermez.

type BraketRow = {
  id: string;
  alt_sinir: number | null;
  ust_sinir: number | null;
  para_birimi: string;
  kosul_bant_alt: number | null;
  kosul_bant_ust: number | null;
  kosullu_deger: number | null;
  kosul_notu: string | null;
  kosul_durumu: string;
};

type BantSorusu = {
  id: string;
  bant_alt: number | null;
  bant_ust: number | null;
  para_birimi: string;
  durum: string;
  created_at: string;
};

// Türkçe sayı girişi: "100000", "100.000", "100.000,50" ve "100,50" kabul edilir.
// Nokta binlik ayıracı, virgül ondalık ayıracıdır. Harf/işaret varsa GEÇERSİZdir.
// Dönüş: null = alan boş · NaN = geçersiz giriş · sayı = geçerli.
function braketSayi(s: string): number | null {
  const t = String(s ?? "").trim();
  if (!t) return null;
  if (!/^[0-9.,]+$/.test(t)) return NaN;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}
function braketGecersiz(s: string): boolean {
  return Number.isNaN(braketSayi(s) as number);
}
function braketMetin(v: number | null | undefined): string {
  return v === null || v === undefined ? "" : String(v);
}
function braketTutar(v: number | null | undefined, para: string): string {
  if (v === null || v === undefined) return "—";
  return `${Number(v).toLocaleString("tr-TR")} ${para || "TRY"}`;
}

function BraketTarafBolumu({ caseId, partyId }: { caseId: string; partyId: string }) {
  const [alt, setAlt] = useState("");
  const [ust, setUst] = useState("");
  const [kosulAlt, setKosulAlt] = useState("");
  const [kosulUst, setKosulUst] = useState("");
  const [kosulDeger, setKosulDeger] = useState("");
  const [kosulNot, setKosulNot] = useState("");
  const [mevcut, setMevcut] = useState<BraketRow | null>(null);
  const [sorular, setSorular] = useState<BantSorusu[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [cevaplanan, setCevaplanan] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  // Kullanıcı forma dokunduysa hiçbir yeniden çekme alanların üstüne YAZMAZ.
  // Yalnız ilk yükleme ve BAŞARILI kayıt sonrası tazeleme alanları doldurur.
  const dokunuldu = useRef(false);

  // formuTazele=false: yalnız bant soruları ve kayıtlı satır tazelenir; yazılan
  // değerlere dokunulmaz (bant sorusu cevaplanınca form sıfırlanıyordu).
  async function yukle(formuTazele: boolean) {
    const [b, s] = await Promise.all([
      (supabase.from("teklif_braketleri" as any) as any)
        .select("id, alt_sinir, ust_sinir, para_birimi, kosul_bant_alt, kosul_bant_ust, kosullu_deger, kosul_notu, kosul_durumu")
        .eq("case_id", caseId).eq("party_id", partyId).maybeSingle(),
      (supabase.rpc as any)("braket_bant_sorularim", { p_case_id: caseId }),
    ]);
    if (b.error) setHata(`Kabul aralığınız okunamadı: ${b.error.message}`);
    else {
      const r = (b.data ?? null) as BraketRow | null;
      setMevcut(r);
      if (formuTazele && !dokunuldu.current) {
        setAlt(braketMetin(r?.alt_sinir));
        setUst(braketMetin(r?.ust_sinir));
        setKosulAlt(braketMetin(r?.kosul_bant_alt));
        setKosulUst(braketMetin(r?.kosul_bant_ust));
        setKosulDeger(braketMetin(r?.kosullu_deger));
        setKosulNot(r?.kosul_notu ?? "");
      }
    }
    if (!s?.error) setSorular(((s?.data ?? []) as any[]) as BantSorusu[]);
    setYukleniyor(false);
  }

  useEffect(() => {
    dokunuldu.current = false;
    setYukleniyor(true);
    yukle(true);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [caseId, partyId]);

  async function kaydet() {
    setBilgi(null);
    // Geçersiz giriş (harf/işaret) sessizce "boş" sayılmaz — kayıt engellenir.
    const gecersizAlanlar = [
      { ad: "Alt sınır", v: alt },
      { ad: "Üst sınır", v: ust },
      { ad: "Bant — alt", v: kosulAlt },
      { ad: "Bant — üst", v: kosulUst },
      { ad: "Ben de şuna inerim", v: kosulDeger },
    ].filter((x) => braketGecersiz(x.v)).map((x) => x.ad);
    if (gecersizAlanlar.length) {
      setHata(`Yalnız rakam girin (binlik ayıracı nokta, kuruş için virgül): ${gecersizAlanlar.join(", ")}`);
      return;
    }

    const a = braketSayi(alt), u = braketSayi(ust);
    const ka = braketSayi(kosulAlt), ku = braketSayi(kosulUst), kd = braketSayi(kosulDeger);
    if (a !== null && u !== null && a > u) { setHata("Alt sınır, üst sınırdan büyük olamaz."); return; }
    const kosulVar = ka !== null || ku !== null || kd !== null;
    if (kosulVar && (ka === null || ku === null || kd === null)) {
      setHata("Koşullu taahhüt için üç alanın üçü de dolu olmalı: bant alt, bant üst ve ineceğiniz tutar.");
      return;
    }
    if (ka !== null && ku !== null && ka > ku) { setHata("Koşul bandının altı, üstünden büyük olamaz."); return; }

    // Koşul alanları değişmediyse mevcut durum korunur; değiştiyse taahhüt yeniden
    // değerlendirilmek üzere 'aktif'e (veya kaldırıldıysa 'yok'a) döner.
    const degisti =
      (mevcut?.kosul_bant_alt ?? null) !== ka ||
      (mevcut?.kosul_bant_ust ?? null) !== ku ||
      (mevcut?.kosullu_deger ?? null) !== kd;
    const durum = !degisti && mevcut ? mevcut.kosul_durumu : (kosulVar ? "aktif" : "yok");

    setKaydediliyor(true);
    setHata(null);
    setBilgi(null);
    const { error } = await (supabase.from("teklif_braketleri" as any) as any).upsert({
      case_id: caseId,
      party_id: partyId,
      alt_sinir: a,
      ust_sinir: u,
      para_birimi: mevcut?.para_birimi || "TRY",
      kosul_bant_alt: ka,
      kosul_bant_ust: ku,
      kosullu_deger: kd,
      kosul_notu: kosulNot.trim() || null,
      kosul_durumu: durum,
    }, { onConflict: "case_id,party_id" });
    setKaydediliyor(false);
    if (error) { setHata(`Kaydedilemedi: ${error.message}`); return; }
    setHata(null);
    setBilgi("Kaydedildi — bu bilgiler yalnız size ve arabulucuya görünür.");
    toast({ title: "Kabul aralığınız kaydedildi" });
    // Kayıt başarılı: artık kayıtlı değer geçerlidir, form ondan tazelenebilir.
    dokunuldu.current = false;
    await yukle(true);
  }

  async function bantCevapla(soruId: string, kabul: boolean) {
    setCevaplanan(soruId);
    setHata(null);
    const { data, error } = await (supabase.rpc as any)("braket_bant_cevapla", {
      p_soru_id: soruId, p_kabul: kabul,
    });
    setCevaplanan(null);
    if (error) { setHata(`Cevap kaydedilemedi: ${error.message}`); return; }
    if (data === "yetkisiz" || data === "bulunamadi") { setHata("Bu soru size ait değil."); return; }
    setBilgi(kabul ? "Cevabınız alındı: bu aralığı değerlendiriyorsunuz." : "Cevabınız alındı.");
    // Form alanlarına DOKUNMA — yalnız soru listesi tazelenir.
    await yukle(false);
  }

  const acikSorular = sorular.filter((s) => s.durum === "soruldu");
  const gecmisSorular = sorular.filter((s) => s.durum !== "soruldu");
  // Herhangi bir sayı alanında harf/işaret varsa kayıt düğmesi kapalıdır.
  const formGecersiz = [alt, ust, kosulAlt, kosulUst, kosulDeger].some(braketGecersiz);

  if (yukleniyor) {
    return <Card className="p-5 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
    </Card>;
  }

  return (
    <div className="space-y-4">
      {/* Bant sorusu — kaynağı gösterilmez; yalnız aralık sorulur. */}
      {acikSorular.length > 0 && (
        <Card className="p-5 space-y-3 border-primary/40">
          <h3 className="font-semibold text-sm">Değerlendirme sorusu</h3>
          {acikSorular.map((s) => (
            <div key={s.id} className="rounded-md border p-3 space-y-2">
              <p className="text-sm">
                Şu aralığı düşünür müsünüz:{" "}
                <span className="font-semibold">
                  {braketTutar(s.bant_alt, s.para_birimi)} – {braketTutar(s.bant_ust, s.para_birimi)}
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Bu soru sürecin yürütülmesi içindir; karşı tarafın rakamlarını içermez ve cevabınız
                karşı tarafa gösterilmez.
              </p>
              <div className="flex gap-2">
                <Button size="sm" disabled={cevaplanan === s.id} onClick={() => bantCevapla(s.id, true)}>
                  {cevaplanan === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Düşünürüm
                </Button>
                <Button size="sm" variant="outline" disabled={cevaplanan === s.id}
                  onClick={() => bantCevapla(s.id, false)}>
                  Bu aralığı düşünmüyorum
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <EyeOff className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Kabul Aralığım</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-snug">
          <ShieldCheck className="inline h-3 w-3 mr-1" />
          Buraya girdikleriniz yalnız size ve arabulucuya görünür. Karşı taraf ne aralığınızı,
          ne koşullu taahhüdünüzü, ne de bunları girip girmediğinizi görebilir.
        </p>

        <p className="text-[11px] text-muted-foreground">
          Tutarları rakamla yazın: 100000 ya da 100.000 — kuruş için virgül (100.000,50).
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Alt sınır</Label>
            <Input inputMode="decimal" value={alt} aria-invalid={braketGecersiz(alt)}
              className={braketGecersiz(alt) ? "border-destructive" : undefined}
              onChange={(e) => { dokunuldu.current = true; setAlt(e.target.value); }} placeholder="Örn. 50.000" />
            {braketGecersiz(alt) && <p className="text-[11px] text-destructive">Yalnız rakam girin.</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Üst sınır</Label>
            <Input inputMode="decimal" value={ust} aria-invalid={braketGecersiz(ust)}
              className={braketGecersiz(ust) ? "border-destructive" : undefined}
              onChange={(e) => { dokunuldu.current = true; setUst(e.target.value); }} placeholder="Örn. 80.000" />
            {braketGecersiz(ust) && <p className="text-[11px] text-destructive">Yalnız rakam girin.</p>}
          </div>
        </div>

        <div className="rounded-md border p-3 space-y-3">
          <div>
            <div className="text-sm font-medium">Koşullu taahhüt (isteğe bağlı)</div>
            <p className="text-[11px] text-muted-foreground">
              "Karşı taraf şu bandın altına inerse ben de şu tutara inerim." Bu taahhüt karşı tarafa
              gösterilmez; karşı tarafa yalnız bandı düşünüp düşünmeyeceği sorulur. Karşı taraf
              düşünmediğini söylerse taahhüdünüz kendiliğinden kapanır.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Bant — alt</Label>
              <Input inputMode="decimal" value={kosulAlt} aria-invalid={braketGecersiz(kosulAlt)}
                className={braketGecersiz(kosulAlt) ? "border-destructive" : undefined}
                onChange={(e) => { dokunuldu.current = true; setKosulAlt(e.target.value); }} placeholder="Örn. 40.000" />
              {braketGecersiz(kosulAlt) && <p className="text-[11px] text-destructive">Yalnız rakam girin.</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bant — üst</Label>
              <Input inputMode="decimal" value={kosulUst} aria-invalid={braketGecersiz(kosulUst)}
                className={braketGecersiz(kosulUst) ? "border-destructive" : undefined}
                onChange={(e) => { dokunuldu.current = true; setKosulUst(e.target.value); }} placeholder="Örn. 55.000" />
              {braketGecersiz(kosulUst) && <p className="text-[11px] text-destructive">Yalnız rakam girin.</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ben de şuna inerim</Label>
              <Input inputMode="decimal" value={kosulDeger} aria-invalid={braketGecersiz(kosulDeger)}
                className={braketGecersiz(kosulDeger) ? "border-destructive" : undefined}
                onChange={(e) => { dokunuldu.current = true; setKosulDeger(e.target.value); }} placeholder="Örn. 45.000" />
              {braketGecersiz(kosulDeger) && <p className="text-[11px] text-destructive">Yalnız rakam girin.</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Not (yalnız arabulucu görür)</Label>
            <Textarea rows={2} value={kosulNot}
              onChange={(e) => { dokunuldu.current = true; setKosulNot(e.target.value); }}
              placeholder="Arabulucuya iletmek istediğiniz açıklama…" />
          </div>
          {mevcut && mevcut.kosul_durumu !== "yok" && (
            <p className="text-[11px] text-muted-foreground">
              Durum:{" "}
              {mevcut.kosul_durumu === "dustu"
                ? "Koşullu taahhüdünüz kapandı — dilerseniz yenisini girebilirsiniz."
                : "Koşullu taahhüdünüz arabulucuya iletildi."}
            </p>
          )}
        </div>

        {/* Hata SESSİZ DÜŞMEZ: gerçek mesaj kırmızı ve kalıcı durur. */}
        {hata && (
          <p className="text-xs text-destructive flex items-start gap-1.5 break-words">
            <X className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{hata}</span>
          </p>
        )}
        {bilgi && (
          <p className="text-xs text-emerald-700 flex items-start gap-1.5">
            <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{bilgi}</span>
          </p>
        )}

        <Button onClick={kaydet} disabled={kaydediliyor || formGecersiz}>
          {kaydediliyor ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          {kaydediliyor ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </Card>

      {gecmisSorular.length > 0 && (
        <Card className="p-5 space-y-2">
          <h3 className="font-semibold text-sm">Cevapladığınız sorular</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            {gecmisSorular.map((s) => (
              <li key={s.id}>
                {braketTutar(s.bant_alt, s.para_birimi)} – {braketTutar(s.bant_ust, s.para_birimi)} ·{" "}
                {s.durum === "kabul" ? "düşünürüm" : "düşünmüyorum"}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ============ OTURUM KAYDI ONAYI (İBA 1.8 / B18) — taraf ekranı ============
   Kalıp: yukarıdaki YZ Beyanı kartı. TEK FARK: bu kart KAPI DEĞİLDİR — onay
   vermemek süreci durdurmaz, yalnız kayıt açılmaz (constitution m.10: rıza
   hizmetin şartı değildir, her an geri alınabilir).
   Kör veri (m.1): kart yalnız tarafın KENDİ kararını gösterir; karşı tarafın
   onay verip vermediği bu ekrana hiçbir yoldan yazılmaz.
   Kayıt/döküm yalnız arabulucuya görünür; bu ekranda kayıt dinleme/okuma yoktur. */
// Kayıt protokolü sabitleri src/lib/kayitProtokolu.ts'te — iki ekranın tek kaynağı.

function kayitZamanMetni(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

function KayitOnayKarti({ caseId, partyId }: { caseId: string; partyId: string }) {
  const [talep, setTalep] = useState<any | null>(null);
  const [karar, setKarar] = useState<any | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [degistir, setDegistir] = useState(false);

  async function yukle() {
    setHata(null);
    const { data: t, error: tErr } = await (supabase.from("kayit_onay_talepleri" as any) as any)
      .select("id, gonderim_zamani, metin_surumu")
      .eq("case_id", caseId)
      .is("iptal_zamani", null)
      .order("gonderim_zamani", { ascending: false })
      .limit(1);
    if (tErr) {
      setHata(`Kayıt onayı durumu okunamadı: ${tErr.message}`);
      setYukleniyor(false);
      return;
    }
    const talepRow = Array.isArray(t) && t.length > 0 ? t[0] : null;
    setTalep(talepRow);
    if (!talepRow) { setKarar(null); setYukleniyor(false); return; }
    const { data: k, error: kErr } = await (supabase.from("kayit_onaylari" as any) as any)
      .select("id, durum, karar_zamani")
      .eq("talep_id", talepRow.id)
      .eq("katilimci_anahtari", `taraf:${partyId}`)
      .limit(1);
    if (kErr) setHata(`Kararınız okunamadı: ${kErr.message}`);
    else setKarar(Array.isArray(k) && k.length > 0 ? k[0] : null);
    setYukleniyor(false);
  }

  useEffect(() => {
    setYukleniyor(true);
    yukle();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [caseId, partyId]);

  async function kararVer(durum: "onay" | "ret") {
    if (!talep?.id || busy) return;
    setBusy(true);
    setHata(null);
    const { error } = await (supabase.from("kayit_onaylari" as any) as any).upsert({
      case_id: caseId,
      talep_id: talep.id,
      party_id: partyId,
      katilimci_tipi: "taraf",
      katilimci_anahtari: `taraf:${partyId}`,
      durum,
      karar_zamani: new Date().toISOString(),
      metin_surumu: KAYIT_ONAY_SURUMU,
    }, { onConflict: "talep_id,katilimci_anahtari" });
    if (error) setHata(`Kaydedilemedi: ${error.message}`);
    else { setDegistir(false); await yukle(); }
    setBusy(false);
  }

  // Talep yoksa kart HİÇ çıkmaz: arabulucu onay formunu açmadan taraf ekranında
  // kayıt konusu gündeme gelmez.
  if (yukleniyor || (!talep && !hata)) return null;

  const enErken = talep?.gonderim_zamani
    ? new Date(new Date(talep.gonderim_zamani).getTime() + KAYIT_ONAY_SAAT * 3600 * 1000).toISOString()
    : null;

  return (
    <Card className="p-6 space-y-4 border-primary/30">
      <h2 className="text-lg font-semibold">Oturum Kaydı Onayı</h2>
      <p className="text-sm whitespace-pre-line leading-relaxed">{KAYIT_ONAY_METNI}</p>
      {enErken && (
        <p className="text-xs text-muted-foreground">
          Onay formu {kayitZamanMetni(talep?.gonderim_zamani)} tarihinde açıldı; kayıtlı oturum en erken{" "}
          {kayitZamanMetni(enErken)} sonrası için planlanabilir.
        </p>
      )}
      {hata && (
        <div className="text-sm rounded border border-destructive/40 bg-destructive/10 text-destructive p-3">
          {hata}
        </div>
      )}
      {karar && !degistir ? (
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={karar.durum === "onay" ? "default" : "outline"}>
            {karar.durum === "onay" ? "Kayda onay verdiniz" : "Kayda onay vermediniz"}
          </Badge>
          <span className="text-xs text-muted-foreground">{kayitZamanMetni(karar.karar_zamani)}</span>
          <Button variant="ghost" size="sm" onClick={() => setDegistir(true)}>Kararımı değiştir</Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => kararVer("onay")} disabled={busy || !talep}>
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Kayda onay veriyorum
          </Button>
          <Button variant="outline" onClick={() => kararVer("ret")} disabled={busy || !talep}>
            Onay vermiyorum
          </Button>
          {degistir && (
            <Button variant="ghost" onClick={() => setDegistir(false)} disabled={busy}>Vazgeç</Button>
          )}
        </div>
      )}
    </Card>
  );
}

/* ===================== DOSYA ASİSTANIM (yalnız taraf görünümü) ===================== */
// Sohbet geçmişi yalnız bileşen state'inde durur; hiçbir tabloya yazılmaz.
// Çağrı kullanıcının kendi JWT'siyle taraf-asistan fonksiyonuna gider.
type AsistanMesaji = { role: "user" | "assistant"; content: string };

function DosyaAsistani({ caseId }: { caseId: string }) {
  const [mesajlar, setMesajlar] = useState<AsistanMesaji[]>([]);
  const [girdi, setGirdi] = useState("");
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function gonder() {
    const soru = girdi.trim();
    if (!soru || bekliyor) return;
    const gecmis = mesajlar.slice(-10);
    setMesajlar((prev) => [...prev, { role: "user", content: soru }]);
    setGirdi("");
    setHata(null);
    setBekliyor(true);
    try {
      const { data, error } = await supabase.functions.invoke("taraf-asistan", {
        body: { case_id: caseId, soru, mesaj: soru, gecmis },
      });
      if (error) {
        let msg = error.message || "Asistan yanıt veremedi.";
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.text === "function") {
            const raw = await (typeof ctx.clone === "function" ? ctx.clone() : ctx).text();
            const parsed = JSON.parse(raw);
            if (parsed?.error) msg = String(parsed.error);
          }
        } catch { /* gövde okunamadı */ }
        setHata(msg);
        return;
      }
      const cevap = String((data as any)?.cevap ?? "").trim();
      if ((data as any)?.error) { setHata(String((data as any).error)); return; }
      if (!cevap) { setHata("Asistan boş yanıt döndürdü."); return; }
      setMesajlar((prev) => [...prev, { role: "assistant", content: cevap }]);
    } catch (e: any) {
      setHata(e?.message ?? "Asistana ulaşılamadı.");
    } finally {
      setBekliyor(false);
    }
  }

  return (
    <Card className="p-5 space-y-3 mt-4">
      <h3 className="font-semibold">Dosya Asistanım</h3>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {mesajlar.length === 0 && !bekliyor && (
          <p className="text-sm text-muted-foreground">
            Sürecinizle ilgili merak ettiğinizi yazabilirsiniz.
          </p>
        )}
        {mesajlar.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "text-sm rounded-lg bg-muted px-3 py-2 ml-auto max-w-[85%] w-fit whitespace-pre-line"
                : "text-sm rounded-lg border px-3 py-2 mr-auto max-w-[85%] w-fit whitespace-pre-line"
            }
          >
            {m.content}
          </div>
        ))}
        {bekliyor && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> yazıyor…
          </div>
        )}
      </div>

      {hata && (
        <p className="text-sm text-destructive">{hata}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="flex-1 min-w-[200px]"
          value={girdi}
          disabled={bekliyor}
          placeholder="Sorunuzu yazın…"
          onChange={(e) => setGirdi(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void gonder(); } }}
        />
        <Button onClick={() => void gonder()} disabled={bekliyor || !girdi.trim()}>
          {bekliyor ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          Gönder
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Bu asistan yalnız senin dosyandaki bilgileri görür ve hukuki tavsiye vermez.
      </p>
    </Card>
  );
}

function CommonGroundView({ report }: { report: any }) {
  const sections: Array<[string, any]> = [
    ["Ortak Menfaatler", report?.common_interests],
    ["Yüksek Potansiyelli Alanlar", report?.high_potential_areas],
    ["Kırmızı Çizgiler", report?.red_lines],
    ["Alternatif Seçenekler", report?.fallback_options],
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4 border-primary/20 bg-primary/[0.04]">
        <div className="text-xs font-medium text-muted-foreground mb-1">SÜREÇ YÖNETİMİ ÖNERİSİ</div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {report?.recommended_strategy || report?.strategy || "Arabulucu süreç stratejisi henüz oluşmadı."}
        </p>
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        {sections.map(([title, value]) => (
          <Card key={title} className="p-4">
            <h4 className="font-semibold text-sm mb-2">{title}</h4>
            {Array.isArray(value) && value.length > 0 ? (
              <ul className="list-disc pl-5 text-sm space-y-1">
                {value.map((item: any, index: number) => (
                  <li key={index}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">—</p>
            )}
          </Card>
        ))}
      </div>

      {Array.isArray(report?.caucus_plan) && report.caucus_plan.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold text-sm mb-2">Gizli Görüşme Planı</h4>
          <ol className="list-decimal pl-5 text-sm space-y-1">
            {report.caucus_plan.map((item: any, index: number) => (
              <li key={index}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
            ))}
          </ol>
        </Card>
      )}

      {report?.opening_offer && (
        <Card className="p-4">
          <h4 className="font-semibold text-sm mb-2">Açılış Teklifi / İlk Hamle</h4>
          <p className="text-sm whitespace-pre-wrap">{report.opening_offer}</p>
        </Card>
      )}
    </div>
  );
}

/* ===================== RANDEVU TERCİHLERİM (yalnız tarafın kendi ekranı) ===================== */
// Kayıtlar tarafın kendi party_id'siyle taraf_musaitlik tablosuna yazılır; RLS gereği
// taraf yalnız kendi satırlarını görür. Arabulucu ekranlarına ve karşı tarafa hiçbir şey
// sızmaz. Yazma hatası yutulmaz, ekranda gösterilir.
type MusaitlikRow = { id: string; gun: string; baslangic: string; bitis: string };

/* ===================== AJANIM (yalnız taraf görünümü) =====================
   Tarafın kendi ajanının ne yaptığı / ne yapamadığı ve yetki anahtarları.
   KÖR VERİ: liste yalnız hedef_party_id bu tarafa ait satırları okur; karşı
   tarafın veya dosya genelinin kayıtları hiçbir yoldan bu ekrana gelmez
   (aynı sınır veritabanı politikasında da kuruludur).
   ======================================================================== */
type AjanimGorev = {
  id: string;
  gorev_tipi: string;
  durum: string;
  gerekce: string | null;
  sonuc: string | null;
  created_at: string;
  updated_at: string;
};

const AJANIM_ETIKET: Record<string, string> = {
  taraf_musaitlik_iste: "Müsait saat isteği",
  teklif_degerlendir: "Randevu teklifi değerlendirmesi",
  taraf_alternatif_saat: "Alternatif saat önerisi",
  taraf_eksik_bilgi: "Belge/bilgi isteği",
  soru_gonder: "Keşif sorusu",
};

const AJANIM_DURUM: Record<string, { label: string; tone: string }> = {
  yapildi: { label: "yapıldı", tone: "text-emerald-700 bg-emerald-500/10" },
  atlandi: { label: "yapılmadı", tone: "text-muted-foreground bg-muted" },
  bekliyor: { label: "sırada", tone: "text-amber-700 bg-amber-500/10" },
};

function AjanimBolumu({ caseId, partyId }: { caseId: string; partyId: string }) {
  const [gorevler, setGorevler] = useState<AjanimGorev[]>([]);
  const [listeHata, setListeHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const [otomatikOnay, setOtomatikOnay] = useState(false);
  const [hatirlatma, setHatirlatma] = useState(true);
  // Kolon henüz eklenmediyse (göç çalıştırılmadıysa) anahtar gösterilmez.
  const [hatirlatmaVar, setHatirlatmaVar] = useState(false);
  const [anahtarBusy, setAnahtarBusy] = useState<string | null>(null);
  const [anahtarHata, setAnahtarHata] = useState<string | null>(null);

  async function yukle() {
    setYukleniyor(true);
    const [g, p] = await Promise.all([
      (supabase.from("ajan_gorevleri" as any) as any)
        .select("id, gorev_tipi, durum, gerekce, sonuc, created_at, updated_at")
        .eq("case_id", caseId)
        .eq("hedef_party_id", partyId)
        .order("updated_at", { ascending: false })
        .limit(50),
      supabase.from("case_parties").select("*").eq("id", partyId).maybeSingle(),
    ]);
    if (g.error) { setListeHata(`Ajan kayıtları okunamadı: ${g.error.message}`); setGorevler([]); }
    else { setListeHata(null); setGorevler((g.data ?? []) as AjanimGorev[]); }

    if (p.error) setAnahtarHata(`Tercihler okunamadı: ${p.error.message}`);
    else {
      const satir = (p.data ?? {}) as Record<string, unknown>;
      setOtomatikOnay(satir.otomatik_onay === true);
      const kolonVar = Object.prototype.hasOwnProperty.call(satir, "hatirlatma_izni");
      setHatirlatmaVar(kolonVar);
      setHatirlatma(kolonVar ? satir.hatirlatma_izni !== false : true);
    }
    setYukleniyor(false);
  }

  useEffect(() => { void yukle(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [caseId, partyId]);

  // Yazım geri okunarak doğrulanır: tek satır etkilenmediyse anahtar eski değerine
  // döner ve hata ekranda kalır (yutulmaz).
  async function anahtarYaz(alan: "otomatik_onay" | "hatirlatma_izni", next: boolean) {
    if (anahtarBusy) return;
    const onceki = alan === "otomatik_onay" ? otomatikOnay : hatirlatma;
    const geriAl = () => (alan === "otomatik_onay" ? setOtomatikOnay(onceki) : setHatirlatma(onceki));
    setAnahtarBusy(alan);
    setAnahtarHata(null);
    if (alan === "otomatik_onay") setOtomatikOnay(next); else setHatirlatma(next);
    const { data, error } = await supabase.from("case_parties")
      .update({ [alan]: next } as any).eq("id", partyId).select("id");
    if (error) { geriAl(); setAnahtarHata(`Kaydedilemedi: ${error.message}`); }
    else if (!Array.isArray(data) || data.length !== 1) {
      geriAl();
      setAnahtarHata(`Kaydedilemedi: beklenen tek kayıt yerine ${Array.isArray(data) ? data.length : 0} satır etkilendi.`);
    }
    setAnahtarBusy(null);
  }

  const satirlar = useMemo(
    () => gorevler.map((g) => ({
      ...g,
      baslik: AJANIM_ETIKET[g.gorev_tipi] ?? g.gorev_tipi,
      /* TARAFA GÖSTERİLEN METİN (24.08.2026 onarımı, iki kusur birden):
         (1) Baştaki etiket TEK KEZ siliniyordu. Geçit `[kaynak:…]` eklemeye
             başlayınca (21.08) üç etiket oldu ve taraf kendi ekranında
             `[bekleyen:…] [eksik:…] [kol:…]` görüyordu — ham UUID dahil.
             `etiketsizGovde` baştaki bütün grupları tüketir.
         (2) `sonuc` gövdenin ÖNÜNE geçiyordu. `sonuc` iç muhasebedir
             (ör. "son hatırlatma: 2026-08-23T11:09:03Z (1. hatırlatma)");
             tarafın görmesi gereken şey SORUNUN KENDİSİDİR. Sıra çevrildi:
             önce temiz gövde, gövde boşsa `sonuc`. */
      detay: etiketsizGovde(g.gerekce) || g.sonuc || "",
    })),
    [gorevler],
  );

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold">Ajanım</h3>
        <p className="text-sm text-muted-foreground">
          Dosya asistanınızın sizin adınıza yaptıkları ve yapamadıkları. Bu bölüm yalnız size
          görünür; karşı tarafın verisi burada yer almaz ve buradaki hiçbir bilgi karşı tarafa
          gösterilmez.
        </p>
      </div>

      <div className="border-t pt-3 space-y-3">
        <div className="text-sm font-medium">Ajanıma verdiğim yetkiler</div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm">Randevuları benim adıma onaylayabilir</div>
            <p className="text-xs text-muted-foreground">
              Müsait saatlerinize uyan bir teklif geldiğinde ajanınız sizin adınıza onaylar.
            </p>
          </div>
          <Switch
            checked={otomatikOnay}
            disabled={anahtarBusy === "otomatik_onay"}
            onCheckedChange={(v) => anahtarYaz("otomatik_onay", !!v)}
            aria-label="Randevuları benim adıma onaylayabilir"
          />
        </div>
        {hatirlatmaVar ? (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm">Bana hatırlatma gönderebilir</div>
              <p className="text-xs text-muted-foreground">
                Müsait saat, belge ve randevu onayı hatırlatmaları e-postayla gönderilir.
              </p>
            </div>
            <Switch
              checked={hatirlatma}
              disabled={anahtarBusy === "hatirlatma_izni"}
              onCheckedChange={(v) => anahtarYaz("hatirlatma_izni", !!v)}
              aria-label="Bana hatırlatma gönderebilir"
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Hatırlatma anahtarı için veritabanı alanı bekleniyor; şimdilik hatırlatmalar açıktır.
          </p>
        )}
        {anahtarHata && <p className="text-sm text-destructive">{anahtarHata}</p>}
      </div>

      <div className="border-t pt-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium">Ajanım ne yaptı, ne yapmadı</div>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => void yukle()} disabled={yukleniyor}>
            {yukleniyor ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Yenile"}
          </Button>
        </div>
        {listeHata && <p className="text-sm text-destructive">{listeHata}</p>}
        {!listeHata && satirlar.length === 0 && !yukleniyor && (
          <p className="text-sm text-muted-foreground italic">Ajanınız henüz bir işlem yapmadı.</p>
        )}
        <ul className="divide-y">
          {satirlar.map((r) => {
            const durum = AJANIM_DURUM[r.durum] ?? { label: r.durum, tone: "text-muted-foreground bg-muted" };
            return (
              <li key={r.id} className="py-2 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.baslik}</span>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${durum.tone}`}>{durum.label}</span>
                  </div>
                  {r.detay && <div className="text-xs text-muted-foreground break-words">{r.detay}</div>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(r.updated_at || r.created_at).toLocaleString("tr-TR")}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}

/* ── İLETİŞİM TERCİHLERİM (İBA 1.5, 1. tur) ───────────────────────────────────
   TARAFIN KENDİ kararıdır: bildirim sıklığı ve sessiz saatler. Arabulucu bu
   bölümü değiştiremez; kokpitte yalnız SALT OKUMA tek satır görür.
   KÖR VERİ: kayıt yalnız o tarafa ve arabulucuya açıktır (RLS); karşı tarafın
   tercihi hiçbir yüzeyden görünmez.
   Kayıt yoksa varsayılan gösterilir (her adımda, sessiz saat kapalı); taraf
   kaydedince satır oluşur (upsert, onConflict: "party_id"). */
type SiklikKodu = "her_adim" | "onemli" | "haftalik_ozet";

const SIKLIK_SECENEKLERI: Array<{ kod: SiklikKodu; etiket: string; aciklama?: string }> = [
  { kod: "her_adim", etiket: "Her adımda" },
  {
    kod: "onemli", etiket: "Yalnız önemli adımlarda",
    aciklama: "oturum daveti ve değişikliği, teklif, belge talebi, süreç sonu",
  },
  {
    kod: "haftalik_ozet", etiket: "Haftalık özet",
    /* 1. tur sınırı açıkça yazılır: seçenek kaydedilir ve süzgeçte kullanılır,
       ama haftalık özet e-postasının kendisi henüz yazılmadı. */
    aciklama: "Haftalık özet e-postası yakında; şu an bu seçenek yalnız acil olmayan bildirimleri durdurur.",
  },
];

function IletisimTercihlerim({ caseId, partyId }: { caseId: string; partyId: string }) {
  const [siklik, setSiklik] = useState<SiklikKodu>("her_adim");
  const [sessizAcik, setSessizAcik] = useState(false);
  const [sessizBas, setSessizBas] = useState("22:00");
  const [sessizBit, setSessizBit] = useState("08:00");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const hhmm = (t: unknown) => String(t ?? "").slice(0, 5);

  useEffect(() => {
    let iptal = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase.from("iletisim_tercihleri" as any) as any)
        .select("siklik, sessiz_baslangic, sessiz_bitis")
        .eq("party_id", partyId)
        .maybeSingle();
      if (iptal) return;
      if (error) {
        setHata(`Tercihler okunamadı: ${error.message}`);
      } else if (data) {
        setHata(null);
        const gelen = String(data.siklik ?? "");
        setSiklik((["her_adim", "onemli", "haftalik_ozet"].includes(gelen) ? gelen : "her_adim") as SiklikKodu);
        const b = hhmm(data.sessiz_baslangic);
        const s = hhmm(data.sessiz_bitis);
        if (b && s) { setSessizAcik(true); setSessizBas(b); setSessizBit(s); }
        else setSessizAcik(false);
      } else {
        setHata(null);   // Kayıt yok → varsayılan (her adımda, sessiz saat kapalı).
      }
      setLoading(false);
    })();
    return () => { iptal = true; };
  }, [partyId]);

  async function kaydet() {
    if (sessizAcik) {
      if (!/^\d{2}:\d{2}$/.test(sessizBas) || !/^\d{2}:\d{2}$/.test(sessizBit)) {
        setHata("Sessiz saat için başlangıç ve bitiş saatini girin."); return;
      }
      if (sessizBas === sessizBit) {
        setHata("Sessiz saat başlangıcı ve bitişi aynı olamaz."); return;
      }
    }
    setBusy(true);
    setHata(null);
    // Kapalıysa iki alan da BOŞ kaydedilir; süzgeç o zaman sessiz saati hiç görmez.
    const { error } = await (supabase.from("iletisim_tercihleri" as any) as any).upsert({
      case_id: caseId,
      party_id: partyId,
      kanal: "eposta",
      siklik,
      sessiz_baslangic: sessizAcik ? sessizBas : null,
      sessiz_bitis: sessizAcik ? sessizBit : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "party_id" });
    if (error) setHata(`Kaydedilemedi: ${error.message}`);
    else toast({ title: "İletişim tercihleriniz kaydedildi." });
    setBusy(false);
  }

  return (
    <Card className="p-5 space-y-5">
      <div>
        <h3 className="font-semibold">İletişim tercihlerim</h3>
        <p className="text-sm text-muted-foreground">
          Süreçle ilgili bildirimleri nasıl almak istediğinizi siz belirlersiniz.
        </p>
      </div>

      {hata && (
        <div className="text-sm rounded border border-destructive/40 bg-destructive/10 text-destructive p-3">{hata}</div>
      )}

      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
        <>
          {/* (a) SIKLIK — üç seçenek, tek seçim */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Ne sıklıkta bildirim almak istersiniz?</Label>
            <RadioGroup value={siklik} onValueChange={(v) => setSiklik(v as SiklikKodu)} className="space-y-2">
              {SIKLIK_SECENEKLERI.map((s) => (
                <div key={s.kod} className="flex items-start gap-2">
                  <RadioGroupItem value={s.kod} id={`siklik-${s.kod}`} className="mt-1" />
                  <div className="space-y-0.5">
                    <Label htmlFor={`siklik-${s.kod}`} className="font-normal cursor-pointer">{s.etiket}</Label>
                    {s.aciklama && <p className="text-xs text-muted-foreground">{s.aciklama}</p>}
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* (b) SESSİZ SAATLER — isteğe bağlı */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="sessiz-anahtar" className="text-sm font-medium">Sessiz saatler</Label>
              <Switch id="sessiz-anahtar" checked={sessizAcik} onCheckedChange={setSessizAcik} />
            </div>
            <p className="text-xs text-muted-foreground">
              Bu saatler arasında acil olmayan bildirimler gönderilmez ve sonradan tekrar gönderilmez; gelişmeleri dosya ekranınızdan her zaman görebilirsiniz. Oturum daveti ile oturum değişikliği bildirimleri, kaçırmamanız için sessiz saatlerde de gönderilir.
            </p>
            {sessizAcik && (
              <div className="flex items-center gap-2 pt-1">
                <Input type="time" value={sessizBas} onChange={(e) => setSessizBas(e.target.value)} className="w-32" />
                <span className="text-sm text-muted-foreground">–</span>
                <Input type="time" value={sessizBit} onChange={(e) => setSessizBit(e.target.value)} className="w-32" />
              </div>
            )}
          </div>

          {/* (c) KANAL — şu an yalnız e-posta. Alttaki iki satır seçilemez; sahte
              seçenek değildir, neyin geleceğini görün diye durur. */}
          <div className="space-y-2 border-t pt-4">
            <Label className="text-sm font-medium">Bildirim kanalı</Label>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary" />
                <span>E-posta</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground/60 cursor-not-allowed" aria-disabled="true">
                <Lock className="h-3.5 w-3.5" />
                <span>Uygulama içi bildirim — yakında</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground/60 cursor-not-allowed" aria-disabled="true">
                <Lock className="h-3.5 w-3.5" />
                <span>WhatsApp — yakında</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t pt-4">
            <Button size="sm" disabled={busy} onClick={() => void kaydet()}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Kaydet
            </Button>
            <p className="text-xs text-muted-foreground">
              <ShieldCheck className="inline h-3 w-3 mr-1" />
              Tercihinizi yalnız siz ve arabulucunuz görür; karşı tarafa açılmaz.
            </p>
          </div>
        </>
      )}
    </Card>
  );
}

/* ====== OTURUM HAZIRLIĞIM (İBA 3.1 — 2. tur) · yalnız taraf, SALT OKUMA ======
   Taraf burada yalnız KENDİ föyünü görür. RLS ("Taraf yalniz gonderilmis kendi
   foyunu gorur") zaten durum='gonderildi' + kendi party_id'si dışına çıkmaya izin
   vermez; sorguda da aynı iki şart ayrıca yazılıdır (savunma iki katmanda).
   Karşı tarafın föyü, adı, beyanı ve belgesi bu ekrana HİÇBİR YOLDAN girmez.
   Bu ekranda değiştirilebilir hiçbir alan yoktur — düğme, kutu, kaydetme yok. */
type HazirlikBolum = { baslik?: string | null; maddeler?: unknown };

function OturumHazirligim({ caseId, partyId }: { caseId: string; partyId: string }) {
  const [foy, setFoy] = useState<any | null>(null);
  const [oturumZamani, setOturumZamani] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;
    (async () => {
      setLoading(true);
      setHata(null);
      const { data, error } = await (supabase.from("oturum_hazirlik_foyleri" as any) as any)
        .select("id, session_id, bolumler, durum, gonderim_zamani")
        .eq("case_id", caseId)
        .eq("party_id", partyId)
        .eq("durum", "gonderildi")
        .order("gonderim_zamani", { ascending: false })
        .limit(1);
      if (iptal) return;
      if (error) {
        setHata(`Hazırlık föyü okunamadı: ${error.message}`);
        setFoy(null);
        setLoading(false);
        return;
      }
      const satir = Array.isArray(data) && data.length ? data[0] : null;
      setFoy(satir);
      if (satir?.session_id) {
        const { data: ot } = await supabase.from("case_sessions")
          .select("scheduled_at").eq("id", String(satir.session_id)).maybeSingle();
        if (!iptal) setOturumZamani((ot as any)?.scheduled_at ?? null);
      } else {
        setOturumZamani(null);
      }
      setLoading(false);
    })();
    return () => { iptal = true; };
  }, [caseId, partyId]);

  // Tarih ve saat DAİMA Europe/Istanbul ile gösterilir (elle saat farkı eklenmez).
  const zaman = (() => {
    if (!oturumZamani) return null;
    const d = new Date(String(oturumZamani));
    if (isNaN(d.getTime())) return null;
    return {
      tarih: d.toLocaleDateString("tr-TR", {
        timeZone: "Europe/Istanbul", weekday: "long", day: "2-digit", month: "long", year: "numeric",
      }),
      saat: d.toLocaleTimeString("tr-TR", {
        timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", hour12: false,
      }),
    };
  })();

  const bolumler: HazirlikBolum[] = Array.isArray(foy?.bolumler) ? foy.bolumler : [];

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="font-semibold">Oturum hazırlığım</h3>
        <p className="text-sm text-muted-foreground">
          Arabulucunuzun sizin için hazırlayıp onayladığı hazırlık föyü. Yalnız siz görürsünüz;
          karşı tarafa açılmaz. Bu föy hazırlık amaçlıdır, hukuki tavsiye değildir.
        </p>
      </div>

      {hata && (
        <div className="text-sm rounded border border-destructive/40 bg-destructive/10 text-destructive p-3">
          {hata}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Okunuyor…
        </div>
      ) : !foy ? (
        <p className="text-sm text-muted-foreground">
          Arabulucunuz oturum hazırlığınızı gönderdiğinde burada görünecek.
        </p>
      ) : (
        <div className="space-y-4">
          {zaman && (
            <div className="rounded border bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Oturum</div>
              <div className="font-medium">{zaman.tarih}</div>
              <div className="text-sm text-muted-foreground">Saat {zaman.saat}</div>
            </div>
          )}

          {bolumler.length === 0 ? (
            <p className="text-sm text-muted-foreground">Föy içeriği boş görünüyor.</p>
          ) : (
            bolumler.map((b, i) => {
              const maddeler = Array.isArray(b?.maddeler)
                ? (b.maddeler as unknown[]).map((m) => String(m ?? "").trim()).filter(Boolean)
                : [];
              if (!b?.baslik && maddeler.length === 0) return null;
              return (
                <div key={i} className="space-y-1">
                  {b?.baslik && <div className="font-medium text-sm">{b.baslik}</div>}
                  {maddeler.length > 0 && (
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {maddeler.map((m, j) => <li key={j}>{m}</li>)}
                    </ul>
                  )}
                </div>
              );
            })
          )}

          {foy.gonderim_zamani && (
            <p className="text-[11px] text-muted-foreground">
              Gönderildi — {new Date(String(foy.gonderim_zamani)).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

/* ====== TALEPLERİM VE DAYANAKLARI (taraf ekranı) =============================
   Taraf KENDİ talep kalemlerini görür, düzeltir ve yenisini ekler. Ajanın
   çıkardığı satırlar (kaynak='ajan') dayanak alıntısıyla birlikte görünür;
   tarafın kendi eklediği satır kaynak='taraf' yazılır ve ajan ona dokunmaz.
   KÖR VERİ: sorgu party_id ile sınırlıdır — karşı tarafın kalemi, adı ve
   belgesi bu ekrana hiçbir yoldan girmez. */
const KALEM_DURUM_ETIKET: Record<string, string> = {
  taslak: "taslak",
  onaylandi: "onaylandı",
  celiskili: "çelişkili",
  dayanaksiz: "dayanağı bulunamadı",
};

function TaleplerimBolumu({ caseId, partyId }: { caseId: string; partyId: string }) {
  const [satirlar, setSatirlar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [yeniAd, setYeniAd] = useState("");
  const [yeniTutar, setYeniTutar] = useState("");

  const yukle = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("taraf_kalemleri" as any) as any)
      .select("id, kalem_adi, tutar, para_birimi, dayanak_alinti, ajan_notu, durum, kaynak, created_at")
      .eq("case_id", caseId).eq("party_id", partyId)
      .order("created_at", { ascending: true });
    if (error) { setHata("Talep kalemleriniz şu an okunamıyor."); setSatirlar([]); }
    else { setHata(null); setSatirlar((data ?? []) as any[]); }
    setLoading(false);
  }, [caseId, partyId]);

  useEffect(() => { yukle(); }, [yukle]);

  async function kalemEkle() {
    const ad = yeniAd.trim();
    if (!ad) return;
    setBusy("ekle");
    const sayi = yeniTutar.trim() ? Number(yeniTutar.replace(",", ".")) : null;
    const { error } = await (supabase.from("taraf_kalemleri" as any) as any).insert({
      case_id: caseId, party_id: partyId, kalem_adi: ad,
      tutar: sayi !== null && Number.isFinite(sayi) ? sayi : null,
      para_birimi: "TRY", durum: "taslak", kaynak: "taraf",
    });
    if (error) setHata("Kalem eklenemedi.");
    else { setYeniAd(""); setYeniTutar(""); await yukle(); }
    setBusy(null);
  }

  async function kalemGuncelle(id: string, alan: "kalem_adi" | "tutar", deger: string) {
    setBusy(id);
    const govde: Record<string, unknown> = alan === "tutar"
      ? { tutar: deger.trim() ? Number(deger.replace(",", ".")) : null }
      : { kalem_adi: deger.trim() };
    const { error } = await (supabase.from("taraf_kalemleri" as any) as any)
      .update(govde).eq("id", id);
    if (error) setHata("Değişiklik kaydedilemedi.");
    else { setHata(null); await yukle(); }
    setBusy(null);
  }

  async function kalemSil(id: string) {
    setBusy(id);
    const { error } = await (supabase.from("taraf_kalemleri" as any) as any).delete().eq("id", id);
    if (error) setHata("Kalem silinemedi.");
    else await yukle();
    setBusy(null);
  }

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="font-semibold">Taleplerim ve dayanakları</h3>
        <p className="text-sm text-muted-foreground">
          Ajanınız belgelerinizden çıkardığı talep kalemlerini burada gösterir; siz düzeltebilir,
          yeni kalem ekleyebilirsiniz. Karşı taraf bu ekranı göremez.
        </p>
      </div>

      {hata && <p className="text-sm text-muted-foreground">{hata}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Okunuyor…
        </div>
      ) : satirlar.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ajan hazırlıyor. Belgelerinizden talep kalemleri çıkarıldığında burada görünecek.
        </p>
      ) : (
        <ul className="space-y-3">
          {satirlar.map((k) => (
            <li key={k.id} className="border rounded p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  className="h-8 text-sm flex-1 min-w-[10rem]"
                  defaultValue={k.kalem_adi ?? ""}
                  onBlur={(e) => {
                    const v = e.target.value;
                    if (v.trim() && v.trim() !== (k.kalem_adi ?? "")) {
                      kalemGuncelle(String(k.id), "kalem_adi", v);
                    }
                  }}
                />
                <Input
                  className="h-8 text-sm w-32"
                  placeholder="tutar"
                  defaultValue={k.tutar ?? ""}
                  onBlur={(e) => {
                    if (String(e.target.value) !== String(k.tutar ?? "")) {
                      kalemGuncelle(String(k.id), "tutar", e.target.value);
                    }
                  }}
                />
                <Badge variant={k.durum === "dayanaksiz" ? "outline" : "secondary"}>
                  {KALEM_DURUM_ETIKET[String(k.durum)] ?? String(k.durum)}
                </Badge>
                <Button size="sm" variant="ghost" className="h-8 px-2"
                  disabled={busy === k.id} onClick={() => kalemSil(String(k.id))}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              {k.dayanak_alinti && (
                <p className="text-xs text-muted-foreground italic border-l-2 pl-2">
                  {k.dayanak_alinti}
                </p>
              )}
              {k.ajan_notu && <p className="text-[11px] text-muted-foreground">{k.ajan_notu}</p>}
            </li>
          ))}
        </ul>
      )}

      <div className="border-t pt-3 space-y-2">
        <Label className="text-sm">Yeni kalem ekle</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input className="h-8 text-sm flex-1 min-w-[10rem]" placeholder="kalem adı"
            value={yeniAd} onChange={(e) => setYeniAd(e.target.value)} />
          <Input className="h-8 text-sm w-32" placeholder="tutar (isteğe bağlı)"
            value={yeniTutar} onChange={(e) => setYeniTutar(e.target.value)} />
          <Button size="sm" disabled={busy === "ekle" || !yeniAd.trim()} onClick={kalemEkle}>
            {busy === "ekle" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Ekle
          </Button>
        </div>
      </div>
    </Card>
  );
}

function RandevuTercihlerim({ partyId }: { partyId: string }) {
  const [rows, setRows] = useState<MusaitlikRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [gun, setGun] = useState("");
  const [baslangic, setBaslangic] = useState("10:00");
  const [bitis, setBitis] = useState("12:00");
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [otomatikOnay, setOtomatikOnay] = useState(false);
  const [onayBusy, setOnayBusy] = useState(false);
  const [onayHata, setOnayHata] = useState<string | null>(null);

  const hhmm = (t: string) => String(t ?? "").slice(0, 5);

  async function load() {
    setLoading(true);
    const [m, p] = await Promise.all([
      (supabase.from("taraf_musaitlik" as any) as any)
        .select("id, gun, baslangic, bitis")
        .eq("party_id", partyId)
        .order("gun", { ascending: true })
        .order("baslangic", { ascending: true }),
      supabase.from("case_parties").select("otomatik_onay" as any).eq("id", partyId).maybeSingle(),
    ]);
    if (m.error) { setHata(`Müsait saatler okunamadı: ${m.error.message}`); setRows([]); }
    else { setHata(null); setRows((m.data ?? []) as MusaitlikRow[]); }
    if (p.error) setOnayHata(`Otomatik onay durumu okunamadı: ${p.error.message}`);
    else { setOnayHata(null); setOtomatikOnay(!!(p.data as any)?.otomatik_onay); }
    setLoading(false);
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [partyId]);

  async function ekle() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(gun)) { setHata("Önce gün seçin."); return; }
    if (!/^\d{2}:\d{2}$/.test(baslangic) || !/^\d{2}:\d{2}$/.test(bitis) || bitis <= baslangic) {
      setHata("Bitiş saati başlangıçtan sonra olmalı."); return;
    }
    setBusy(true);
    const { error } = await (supabase.from("taraf_musaitlik" as any) as any)
      .insert({ party_id: partyId, gun, baslangic, bitis });
    if (error) setHata(`Kaydedilemedi: ${error.message}`);
    else { setHata(null); await load(); }
    setBusy(false);
  }

  async function sil(id: string) {
    setBusy(true);
    const { error } = await (supabase.from("taraf_musaitlik" as any) as any).delete().eq("id", id);
    if (error) setHata(`Silinemedi: ${error.message}`);
    else { setHata(null); await load(); }
    setBusy(false);
  }

  async function onayDegistir(next: boolean) {
    if (onayBusy) return;
    const onceki = otomatikOnay;
    setOnayBusy(true);
    setOnayHata(null);
    setOtomatikOnay(next);
    const { data, error } = await supabase.from("case_parties")
      .update({ otomatik_onay: next } as any)
      .eq("id", partyId)
      .select("id");
    if (error) {
      setOtomatikOnay(onceki);
      setOnayHata(`Kaydedilemedi: ${error.message}`);
    } else if (!Array.isArray(data) || data.length !== 1) {
      setOtomatikOnay(onceki);
      setOnayHata("Kaydedilemedi: güncelleme kaydı doğrulanamadı.");
    }
    setOnayBusy(false);
  }

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <div>
          <h3 className="font-semibold">Müsait saatlerim</h3>
          <p className="text-sm text-muted-foreground">
            <ShieldCheck className="inline h-3 w-3 mr-1" />
            Bu saatleri yalnız siz ve arabulucunuz görür; karşı tarafa açılmaz.
          </p>
        </div>

        {hata && (
          <div className="text-sm rounded border border-destructive/40 bg-destructive/10 text-destructive p-3">{hata}</div>
        )}

        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz müsait saat eklemediniz.</p>
        ) : (
          <div className="space-y-1">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                <span>
                  {new Date(`${String(r.gun).slice(0, 10)}T00:00:00`).toLocaleDateString("tr-TR")} · {hhmm(r.baslangic)} – {hhmm(r.bitis)}
                </span>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => sil(r.id)} title="Sil">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-xs">Gün</Label>
            <Input type="date" className="h-9 w-[160px]" value={gun} onChange={(e) => setGun(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Başlangıç</Label>
            <Input type="time" className="h-9 w-[120px]" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Bitiş</Label>
            <Input type="time" className="h-9 w-[120px]" value={bitis} onChange={(e) => setBitis(e.target.value)} />
          </div>
          <Button size="sm" disabled={busy} onClick={ekle}>
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Aralık ekle
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Müsait saatlerime uyan randevu tekliflerini benim adıma onayla</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Açıkken uyan teklifler otomatik onaylanır; istediğiniz an kapatabilirsiniz.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">{otomatikOnay ? "Açık" : "Kapalı"}</span>
            <Switch
              checked={otomatikOnay}
              disabled={onayBusy}
              onCheckedChange={(v) => onayDegistir(!!v)}
              aria-label="Otomatik onay"
            />
          </div>
        </div>
        {onayHata && (
          <div className="text-sm rounded border border-destructive/40 bg-destructive/10 text-destructive p-3">{onayHata}</div>
        )}
      </Card>
    </div>
  );
}

function ProcessOverview({
  currentPhase,
  parties,
  analyses,
  discovery,
  docs,
  commonGround,
}: {
  currentPhase: number;
  parties: Party[];
  analyses: PartyAnalysis[];
  discovery: DiscoveryQ[];
  docs: DocRow[];
  commonGround: any | null;
}) {
  const current = Math.max(0, Math.min(PROCESS_STEPS.length - 1, currentPhase - 1));
  const acceptedParties = parties.filter((p) => p.invite_status === "accepted").length;
  const answeredQuestions = discovery.filter((q) => !!q.answer_text?.trim()).length;
  const totalQuestions = discovery.length;

  return (
    <Card className="p-5 mb-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Arabuluculuk Süreç Yönetimi</h2>
          <p className="text-sm text-muted-foreground">
            Gizli taraf analizleri, ortak zemin, ihtiyaç tespiti, toplantı, bilirkişi, müzakere ve belge üretimi tek akışta ilerler.
          </p>
        </div>
        <Badge variant="secondary">Aşama {Math.min(7, Math.max(1, currentPhase))}/7</Badge>
      </div>

      <StepTimeline steps={PROCESS_STEPS} current={current} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Taraf Katılımı</div>
          <div className="mt-1 text-xl font-semibold">{acceptedParties}/{parties.length}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Gizli Analiz</div>
          <div className="mt-1 text-xl font-semibold">{analyses.length}/{parties.length}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Belge</div>
          <div className="mt-1 text-xl font-semibold">{docs.length}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">İhtiyaç Cevabı</div>
          <div className="mt-1 text-xl font-semibold">{answeredQuestions}/{totalQuestions || 0}</div>
        </div>
      </div>

      {!commonGround && analyses.length >= 2 && (
        <div className="rounded-md border border-primary/30 bg-primary/[0.04] p-3 text-sm">
          İki tarafın gizli analizi hazır. Arabulucu “Ortak Zemin” sekmesinden süreç önerisini üretebilir.
        </div>
      )}
    </Card>
  );
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

// =================== Expert Audit Log helpers + view ===================
async function logExpertAction(args: {
  caseId: string;
  assignmentId?: string | null;
  expertId?: string | null;
  actorId: string;
  actorRole: string;
  action: string;
  details?: Record<string, any>;
}) {
  await supabase.from("expert_assignment_logs").insert({
    case_id: args.caseId,
    assignment_id: args.assignmentId ?? null,
    expert_id: args.expertId ?? null,
    actor_id: args.actorId,
    actor_role: args.actorRole,
    action: args.action,
    details: args.details ?? {},
  } as any);
}

function ExpertAuditLog({ caseId, refreshKey }: { caseId: string; refreshKey: number }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [personFilter, setPersonFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("expert_assignment_logs")
        .select("*, experts:expert_id(full_name), profiles:actor_id(full_name, email)")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(200);
      setLogs((data ?? []) as any[]);
    })();
  }, [caseId, refreshKey]);

  const label = (a: string) =>
    ({
      proposed: "Önerdi",
      approved: "Onayladı",
      rejected: "Reddetti",
      removed: "Kaldırdı",
      status_changed: "Durum güncellendi",
    }[a] ?? a);

  const actions = Array.from(new Set(logs.map((l) => l.action))).sort();
  const roles = Array.from(new Set(logs.map((l) => l.actor_role).filter(Boolean))).sort();
  const persons = Array.from(
    new Map(
      logs.map((l) => [
        l.actor_id,
        l.profiles?.full_name || l.profiles?.email || l.actor_id?.slice(0, 8) || "—",
      ])
    ).entries()
  );

  const filtered = logs.filter((l) => {
    if (actionFilter !== "all" && l.action !== actionFilter) return false;
    if (roleFilter !== "all" && l.actor_role !== roleFilter) return false;
    if (personFilter !== "all" && l.actor_id !== personFilter) return false;
    return true;
  });

  const exportCsv = () => {
    const header = ["created_at", "actor_role", "actor", "action", "expert", "note"];
    const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = filtered.map((l) => [
      new Date(l.created_at).toISOString(),
      l.actor_role ?? "",
      l.profiles?.full_name || l.profiles?.email || l.actor_id || "",
      l.action,
      l.experts?.full_name ?? "",
      l.details?.note ?? "",
    ]);
    const csv = [header, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bilirkisi-gunlugu-${caseId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (logs.length === 0) return null;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">Bilirkişi İşlem Günlüğü</h4>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv}>
          <FileDown className="h-4 w-4 mr-1" /> CSV indir ({filtered.length})
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <Filter className="h-3 w-3 text-muted-foreground" />
        <select
          className="h-8 rounded-md border bg-background px-2 text-xs"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="all">Tüm türler</option>
          {actions.map((a) => (
            <option key={a} value={a}>{label(a)}</option>
          ))}
        </select>
        <select
          className="h-8 rounded-md border bg-background px-2 text-xs"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">Tüm roller</option>
          {roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          className="h-8 rounded-md border bg-background px-2 text-xs"
          value={personFilter}
          onChange={(e) => setPersonFilter(e.target.value)}
        >
          <option value="all">Tüm kişiler</option>
          {persons.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        {(actionFilter !== "all" || roleFilter !== "all" || personFilter !== "all") && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setActionFilter("all"); setRoleFilter("all"); setPersonFilter("all"); }}>
            Filtreleri temizle
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground">Filtreyle eşleşen kayıt yok.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {filtered.map((l) => (
            <li key={l.id} className="flex items-start justify-between gap-3 border-b last:border-0 pb-2">
              <div>
                <div>
                  <span className="font-medium">
                    {l.profiles?.full_name || l.profiles?.email || "Kullanıcı"}
                  </span>{" "}
                  <span className="text-muted-foreground">({l.actor_role})</span>{" "}
                  — {label(l.action)}
                  {l.experts?.full_name && (
                    <span className="text-muted-foreground"> · {l.experts.full_name}</span>
                  )}
                </div>
                {l.details?.note && (
                  <div className="text-xs text-muted-foreground mt-1">{l.details.note}</div>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {new Date(l.created_at).toLocaleString("tr-TR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// =================== Stage 6: EXPERTS (with party approval) ===================
function ExpertsTab({ caseId, niche, parties }: { caseId: string; niche: string; parties: any[] }) {
  const { user } = useAuth();
  const [assigned, setAssigned] = useState<any[]>([]);
  const [showSelector, setShowSelector] = useState(true);
  const [logKey, setLogKey] = useState(0);

  const load = async () => {
    const { data } = await supabase
      .from("case_expert_assignments")
      .select("*, experts(*)")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });
    setAssigned((data ?? []) as any[]);
  };
  useEffect(() => { load(); }, [caseId]);

  const notifyParties = async (title: string, message: string) => {
    await Promise.all(
      parties
        .filter((p) => p.user_id)
        .map((p) =>
          supabase.rpc("create_notification", {
            p_user_id: p.user_id,
            p_title: title,
            p_message: message,
            p_type: "info",
            p_link: `/cases/${caseId}`,
          })
        )
    );
  };

  const assign = async (expert: any) => {
    if (!user) return;
    const { data: inserted, error } = await supabase.from("case_expert_assignments").insert({
      case_id: caseId, expert_id: expert.id, status: "pending",
      assigned_by: user.id, approvals: {},
    } as any).select().maybeSingle();
    if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }
    await logExpertAction({
      caseId, assignmentId: inserted?.id, expertId: expert.id,
      actorId: user.id, actorRole: "mediator", action: "proposed",
      details: { note: `${expert.full_name} önerildi` },
    });
    await notifyParties(
      "Yeni Bilirkişi Önerisi",
      `Arabulucu ${expert.full_name} adlı bilirkişiyi önerdi. Onayınız bekleniyor.`
    );
    toast({ title: "Bilirkişi önerildi", description: `${expert.full_name} — taraflara bildirim gönderildi` });
    setShowSelector(false);
    setLogKey((k) => k + 1);
    load();
  };

  const remove = async (row: any) => {
    if (!user) return;
    await supabase.from("case_expert_assignments").delete().eq("id", row.id);
    await logExpertAction({
      caseId, assignmentId: row.id, expertId: row.expert_id,
      actorId: user.id, actorRole: "mediator", action: "removed",
      details: { note: `${row.experts?.full_name ?? "bilirkişi"} kaldırıldı` },
    });
    setLogKey((k) => k + 1);
    load();
  };

  const hasPending = assigned.some((a) => a.status === "pending");
  const lastRejected = assigned[0]?.status === "rejected";

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Önerilen / Atanan Bilirkişiler</h3>
        {assigned.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz bilirkişi önerilmedi.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {assigned.map((a) => {
              const approvals = (a.approvals ?? {}) as Record<string, "approved" | "rejected">;
              const approvedCount = parties.filter((p) => approvals[p.id] === "approved").length;
              const rejected = parties.some((p) => approvals[p.id] === "rejected");
              return (
                <li key={a.id} className="border rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{a.experts?.full_name}</div>
                      <div className="text-xs text-muted-foreground">{a.experts?.specialization}</div>
                    </div>
                    <Badge variant={a.status === "approved" ? "default" : a.status === "rejected" ? "destructive" : "outline"}>
                      {a.status === "approved" ? "Onaylandı" : a.status === "rejected" ? "Reddedildi" : "Beklemede"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {parties.map((p) => {
                      const st = approvals[p.id];
                      return (
                        <Badge key={p.id} variant={st === "approved" ? "default" : st === "rejected" ? "destructive" : "outline"} className="text-xs">
                          Taraf {p.party_role}: {st === "approved" ? "onayladı" : st === "rejected" ? "reddetti" : "bekliyor"}
                        </Badge>
                      );
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {rejected ? "Bir taraf reddetti — yeni bilirkişi önerebilirsiniz." : `${approvedCount}/${parties.length} taraf onayladı.`}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => remove(a)}>Kaldır</Button>
                </li>
              );
            })}
          </ul>
        )}
        {(lastRejected || (!hasPending && assigned.length > 0)) && !showSelector && (
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowSelector(true)}>
            <Repeat className="h-3 w-3 mr-1" /> Yeni Bilirkişi Öner
          </Button>
        )}
      </Card>
      {showSelector && <ExpertSelector niche={niche} onSelect={assign} />}
      <ExpertAuditLog caseId={caseId} refreshKey={logKey} />
    </div>
  );
}

// =================== Party-side expert approval ===================
function PartyExpertApproval({ caseId, partyId }: { caseId: string; partyId: string }) {
  const { user } = useAuth();
  const [assigned, setAssigned] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [logKey, setLogKey] = useState(0);

  const load = async () => {
    const { data } = await supabase
      .from("case_expert_assignments")
      .select("*, experts(*)")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });
    setAssigned((data ?? []) as any[]);
  };
  useEffect(() => { load(); }, [caseId]);

  const decide = async (row: any, decision: "approved" | "rejected") => {
    if (!user) return;
    setBusy(row.id);
    const approvals = { ...(row.approvals ?? {}), [partyId]: decision };
    let nextStatus = row.status;
    const { data: pps } = await supabase.from("case_parties").select("id, user_id").eq("case_id", caseId);
    const partyRows = (pps ?? []) as any[];
    const partyIds = partyRows.map((p) => p.id);
    const anyRejected = partyIds.some((id: string) => approvals[id] === "rejected");
    const allApproved = partyIds.length > 0 && partyIds.every((id: string) => approvals[id] === "approved");
    const prevStatus = row.status;
    if (anyRejected) nextStatus = "rejected";
    else if (allApproved) nextStatus = "approved";
    else nextStatus = "pending";

    const { error } = await supabase.from("case_expert_assignments")
      .update({ approvals, status: nextStatus } as any).eq("id", row.id);
    setBusy(null);
    if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }

    // Audit log: the party's decision (always) + status change (if any)
    await logExpertAction({
      caseId, assignmentId: row.id, expertId: row.expert_id,
      actorId: user.id, actorRole: "party", action: decision,
      details: { note: `Taraf kararı: ${decision === "approved" ? "onay" : "red"}` },
    });
    if (nextStatus !== prevStatus) {
      await logExpertAction({
        caseId, assignmentId: row.id, expertId: row.expert_id,
        actorId: user.id, actorRole: "system", action: "status_changed",
        details: { from: prevStatus, to: nextStatus },
      });
    }
    setLogKey((k) => k + 1);

    // Notify mediator + other parties of the decision / status change
    const { data: caseRow } = await supabase.from("cases").select("assigned_mediator_id").eq("id", caseId).maybeSingle();
    const recipients = new Set<string>();
    if (caseRow?.assigned_mediator_id) recipients.add(caseRow.assigned_mediator_id);
    partyRows.forEach((p) => { if (p.user_id && p.id !== partyId) recipients.add(p.user_id); });
    const expertName = row.experts?.full_name ?? "bilirkişi";
    const msg = nextStatus === "approved"
      ? `Tüm taraflar ${expertName} bilirkişisini onayladı.`
      : nextStatus === "rejected"
        ? `${expertName} bilirkişisi reddedildi — yeni öneri bekleniyor.`
        : `Bir taraf ${expertName} hakkındaki kararını verdi (${decision === "approved" ? "onay" : "red"}).`;
    await Promise.all(
      Array.from(recipients).map((uid) =>
        supabase.rpc("create_notification", {
          p_user_id: uid,
          p_title: "Bilirkişi Onay Güncellemesi",
          p_message: msg,
          p_type: nextStatus === "rejected" ? "warning" : "info",
          p_link: `/cases/${caseId}`,
        })
      )
    );
    toast({ title: decision === "approved" ? "Onayladınız" : "Reddettiniz" });
    load();
  };

  if (assigned.length === 0) {
    return <Card className="p-5 text-sm text-muted-foreground">Arabulucu henüz bilirkişi önermedi.</Card>;
  }
  return (
    <div className="space-y-3">
      {assigned.map((a) => {
        const my = (a.approvals ?? {})[partyId];
        return (
          <Card key={a.id} className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{a.experts?.full_name}</div>
                <div className="text-xs text-muted-foreground">{a.experts?.specialization} · {a.experts?.years_experience} yıl</div>
              </div>
              <Badge variant={a.status === "approved" ? "default" : a.status === "rejected" ? "destructive" : "outline"}>
                {a.status}
              </Badge>
            </div>
            {a.experts?.bio && <p className="text-sm text-muted-foreground">{a.experts.bio}</p>}
            <div className="flex gap-2">
              <Button size="sm" disabled={busy === a.id || my === "approved"} onClick={() => decide(a, "approved")}>
                <Check className="h-3 w-3 mr-1" />
                {my === "approved" ? "Onayladınız" : "Onayla"}
              </Button>
              <Button size="sm" variant="outline" disabled={busy === a.id || my === "rejected"} onClick={() => decide(a, "rejected")}>
                <X className="h-3 w-3 mr-1" />
                {my === "rejected" ? "Reddettiniz" : "Reddet"}
              </Button>
            </div>
          </Card>
        );
      })}
      <ExpertAuditLog caseId={caseId} refreshKey={logKey} />
    </div>
  );
}

// =================== Stage 7: NEGOTIATION ROUNDS ===================
function RoundsTab({ caseId, parties }: { caseId: string; parties: any[] }) {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<any[]>([]);
  const [proposal, setProposal] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("negotiation_rounds")
      .select("*")
      .eq("case_id", caseId)
      .order("round_no", { ascending: true });
    setRounds((data ?? []) as any[]);
  };
  useEffect(() => { load(); }, [caseId]);

  const newRound = async () => {
    if (!proposal.trim()) return;
    setBusy(true);
    const nextNo = (rounds[rounds.length - 1]?.round_no ?? 0) + 1;
    const { error } = await supabase.from("negotiation_rounds").insert({
      case_id: caseId, round_no: nextNo, status: "open",
      proposal: { text: proposal, by: user?.id },
    } as any);
    setBusy(false);
    if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }
    setProposal("");
    toast({ title: `Tur ${nextNo} açıldı` });
    load();
  };

  const setStatus = async (id: string, status: string) => {
    await supabase.from("negotiation_rounds").update({ status }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold">Yeni Müzakere Turu</h3>
        <Textarea value={proposal} onChange={(e) => setProposal(e.target.value)} placeholder="Tur teklifi / gündem..." />
        <Button onClick={newRound} disabled={busy || !proposal.trim()}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Repeat className="h-4 w-4 mr-1" />}
          Tur Aç
        </Button>
      </Card>
      <div className="space-y-2">
        {rounds.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz tur yok.</p>
        ) : rounds.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Tur {r.round_no}</div>
              <Badge variant={r.status === "agreed" ? "default" : r.status === "failed" ? "destructive" : "outline"}>
                {r.status}
              </Badge>
            </div>
            <p className="text-sm whitespace-pre-wrap">{r.proposal?.text}</p>
            {r.status === "open" && (
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "agreed")}>
                  <Check className="h-3 w-3 mr-1" /> Anlaşıldı
                </Button>
                <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "failed")}>
                  <X className="h-3 w-3 mr-1" /> Anlaşılamadı
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// =================== Stage 8: AGREEMENT & OFFICIAL DOCS ===================
function AgreementTab({ caseRow, parties, onChanged }: { caseRow: any; parties: any[]; onChanged: () => void }) {
  const [agreementText, setAgreementText] = useState("");
  const [feeAmount, setFeeAmount] = useState<string>("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const finalize = async (status: "agreement" | "no_agreement") => {
    setSaving(true);
    const { error } = await supabase.from("cases").update({
      status, current_phase: 8,
    } as any).eq("id", caseRow.id);
    if (!error && status === "agreement" && agreementText.trim()) {
      await supabase.from("agreement_documents").insert({
        case_id: caseRow.id,
        doc_type: "agreement",
        metadata: { text: agreementText, fee: feeAmount, meeting_date: meetingDate, meeting_location: meetingLocation },
        file_path: "",
      } as any);
    }
    setSaving(false);
    if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }
    toast({ title: status === "agreement" ? "Anlaşma kaydedildi" : "Başvuru sonlandırıldı" });
    onChanged();
  };

  const docData = {
    basvuruNo: caseRow.application_no ?? undefined,
    uyapNo: caseRow.uyap_no ?? undefined,
    basvuruTarihi: new Date().toLocaleDateString("tr-TR"),
    dosyaTuru: caseRow.dispute_type ?? undefined,
    niche: caseRow.dispute_type ?? undefined,
    title: caseRow.title ?? undefined,
    description: caseRow.issue_description ?? undefined,
    parties: parties.map((p) => ({
      role: p.party_role,
      full_name: p.party_type === "individual" ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : p.company_name,
      organization: p.company_name ?? undefined,
      tc_kimlik: p.tc_kimlik ?? undefined,
      vergi_no: p.tax_number ?? undefined,
      address: p.address ?? undefined,
      phone: p.phone ?? p.gsm ?? undefined,
      email: p.email ?? undefined,
    })),
    meeting_date: meetingDate,
    meeting_location: meetingLocation,
    agreement_text: agreementText,
    fee_amount: feeAmount ? Number(feeAmount) : undefined,
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <FileSignature className="h-4 w-4" /> Anlaşma Metni
        </h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Toplantı Tarihi</Label>
            <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
          </div>
          <div>
            <Label>Toplantı Yeri</Label>
            <Input value={meetingLocation} onChange={(e) => setMeetingLocation(e.target.value)} />
          </div>
          <div>
            <Label>Arabuluculuk Ücreti (₺)</Label>
            <Input type="number" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Anlaşma Metni</Label>
          <Textarea rows={6} value={agreementText} onChange={(e) => setAgreementText(e.target.value)} placeholder="Tarafların üzerinde mutabık kaldıkları metin..." />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => finalize("agreement")} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
            Anlaşma ile Sonlandır
          </Button>
          <Button variant="outline" onClick={() => finalize("no_agreement")} disabled={saving}>
            <X className="h-4 w-4 mr-1" /> Anlaşmama ile Sonlandır
          </Button>
        </div>
        <div className="border-t pt-3">
          <Button
            variant="secondary"
            onClick={() => {
              const ids: any[] = ["basvuru", "ilk-toplanti", "anlasma-tutanak", "anlasma-belgesi", "ucret-tarifesi"];
              ids.forEach((id) => {
                try { downloadOfficialPdf(id, docData); }
                catch (e: any) { toast({ title: "Hata", description: e.message, variant: "destructive" }); }
              });
              toast({ title: "5 belgelik anlaşma paketi indirildi" });
            }}
          >
            <FileSignature className="h-4 w-4 mr-1" /> 5 Belgelik Anlaşma Paketini İndir
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            Başvuru · İlk Toplantı · Son Tutanak · Anlaşma Belgesi · Ücret Tarifesi
          </p>
        </div>
      </Card>
      <OfficialDocsPanel data={docData} />
    </div>
  );
}
