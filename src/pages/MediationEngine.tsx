import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AppNavbar } from "@/components/AppNavbar";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { SourceViewerDialog, ADB_SOURCE_PREFIX, type ViewerSource } from "@/components/SourceViewerDialog";
import { motion, AnimatePresence, animate, useMotionValue, useMotionValueEvent } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { logExpertAction, notifyCaseParties } from "@/lib/expert-assignment";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getPartyPhone, normalizePhoneForWhatsapp } from "@/lib/phone";
import {
  Plus, Loader2, FolderOpen, FileText, Users, Brain, ShieldCheck,
  Calendar as CalIcon, UserCheck, MessageSquare, FileCheck2, CheckCircle2, XCircle, Circle,
  Trash2, ArrowLeft, Sparkles, ChevronDown, ChevronUp, AlertTriangle, RefreshCw, Pencil,
  LayoutDashboard, Lightbulb, Target, EyeOff, Mail, Copy, FileDown,
} from "lucide-react";

// CaseRoom.tsx'teki altın sekme diliyle aynı — data-[state=active] alt çizgisi accent renginde.
const tabTriggerAccentClass =
  "border-b-2 border-b-transparent transition-colors hover:border-b-accent hover:text-accent data-[state=active]:border-b-accent data-[state=active]:text-accent";
import { SessionScheduler } from "@/components/mediation/SessionScheduler";
import { OfficialDocumentsPanel } from "@/components/mediation/OfficialDocumentsPanel";
import { ExpertSelector } from "@/components/mediation/ExpertSelector";
import { Phase3ErrorBoundary } from "@/components/mediation/Phase3ErrorBoundary";
import { MeetingNotesPanel } from "@/components/mediation/MeetingNotesPanel";
import { ProcessTrackerPanel } from "@/components/mediation/ProcessTrackerPanel";
import { KAYIT_ONAY_SAAT, KAYIT_ONAY_SURUMU, KAYIT_TEK_KAPI_UYARISI } from "@/lib/kayitProtokolu";
import { depoHataMetni } from "@/lib/depoHatasi";
import { AgentControlPanel } from "@/components/mediation/AgentControlPanel";
import { AjanPenceresi } from "@/components/AjanPenceresi";
import { CaseQaPanel } from "@/components/mediation/CaseQaPanel";
// Ücretli model çağrısı işareti — TEK tanım (bkz. UcretliIsaret.tsx).
import { UcretliIsaret } from "@/components/mediation/UcretliIsaret";
import { BazCizgiSorulari } from "@/components/mediation/BazCizgiSorulari";

// Paylaşılan giriş animasyonu deseni — Dashboard.tsx'teki containerVariants/itemVariants ile aynı.
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

// ── Faz Kahramanı (PhaseHero) ──
// Dashboard.tsx'teki HeroStatTile/CountUp deseninin faz ekranları için ortak versiyonu:
// koyu lacivert zemin, altın faz etiketi, sayarak dolan büyük metrikler. Kendi giriş
// animasyonuna sahiptir — altındaki içerik bölümlerinin staggered girişini (Katman 1)
// etkilemez, her zaman ayrı bir üst şerit olarak render edilir.
type PhaseHeroTone = "low" | "medium" | "high";
type PhaseHeroMetricDef = {
  label: string;
  value: number | string | null | undefined;
  suffix?: string;
  tone?: PhaseHeroTone;
};

const PHASE_HERO_TONE_TEXT: Record<PhaseHeroTone, string> = {
  low: "text-emerald-400",
  medium: "text-amber-400",
  high: "text-red-400",
};

function PhaseHeroCountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const mv = useMotionValue(0);
  const [text, setText] = useState(`0${suffix}`);
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.1, ease: "easeOut" });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  useMotionValueEvent(mv, "change", (latest) => setText(`${Math.round(latest)}${suffix}`));
  return <>{text}</>;
}

function PhaseHeroMetric({ label, value, suffix = "", tone }: PhaseHeroMetricDef) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="min-w-[120px]">
      <div className="text-[11px] uppercase tracking-[0.14em] text-sidebar-foreground/55 font-medium mb-1">{label}</div>
      <div className={`font-display font-bold tabular-nums leading-none ${empty ? "text-2xl text-sidebar-foreground/30" : `text-3xl sm:text-4xl ${tone ? PHASE_HERO_TONE_TEXT[tone] : "text-accent"}`}`}>
        {empty ? "—" : typeof value === "number" ? <PhaseHeroCountUp value={value} suffix={suffix} /> : `${value}${suffix}`}
      </div>
    </div>
  );
}

function PhaseHero({ label, metrics, aside }: { label: string; metrics: PhaseHeroMetricDef[]; aside?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground p-6 shadow-elegant"
    >
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-[220px] space-y-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold">{label}</div>
          <div className="flex flex-wrap gap-8">
            {metrics.map((m, i) => <PhaseHeroMetric key={i} {...m} />)}
          </div>
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </motion.div>
  );
}

// Faz 5 heroundaki "sıradaki oturum" geri sayımı — gün/saat çözünürlüğünde.
function formatPhaseCountdown(targetIso: string): string | null {
  const ms = new Date(targetIso).getTime() - Date.now();
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}g ${h}s` : `${h}s`;
}

// Faz 7 heroundaki "son not zamanı" — Dashboard.tsx'teki formatRelativeTime ile aynı basamaklar.
function formatPhaseRelative(iso: string): string {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return "az önce";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} sa önce`;
  return `${Math.floor(diffHour / 24)} gün önce`;
}

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

// Token-overlap (Jaccard) similarity for near-duplicate free-text factors — each
// party's kritik_faktorler is generated by an independent AI call, so the same
// underlying factor is often phrased differently per party and won't match by
// exact string equality alone.
function normalizeFactorText(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}
function factorSimilarity(a: string, b: string): number {
  const na = normalizeFactorText(a);
  const nb = normalizeFactorText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;                        // aynı madde, farklı noktalama/büyük harf
  const tokensA = new Set(na.split(" ").filter(Boolean));
  const tokensB = new Set(nb.split(" ").filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let overlap = 0;
  for (const t of tokensA) if (tokensB.has(t)) overlap++;
  const union = tokensA.size + tokensB.size - overlap;
  const jaccard = union === 0 ? 0 : overlap / union;
  // Kapsama: biri diğerinin genişletilmiş hâliyse (aynı madde + ek cümle) Jaccard
  // düşük kalıyor ve madde iki kez görünüyordu. Kısa olanın sözcüklerinin çoğu
  // uzun olanda geçiyorsa aynı madde sayılır.
  const kapsama = overlap / Math.min(tokensA.size, tokensB.size);
  return Math.max(jaccard, kapsama >= 0.8 ? kapsama : 0);
}
// Merges near-duplicate factors across sources (e.g. two parties' own analyses)
// into one entry, keeping the first phrasing and tracking which sources raised it —
// so "her iki taraf da vurguladı" info survives the merge instead of silently dropping.
function dedupeSimilarFactors(candidates: { text: string; source: string }[], threshold = 0.6): { text: string; sources: string[] }[] {
  const result: { text: string; sources: string[] }[] = [];
  for (const { text, source } of candidates) {
    if (!text.trim()) continue;
    const existing = result.find((r) => factorSimilarity(r.text, text) >= threshold);
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
    } else {
      result.push({ text, sources: [source] });
    }
  }
  return result;
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

// Aşama modeli (14.08 — tek giriş kapısı): eski Aşama 1 (Başvuru) ile eski Aşama 2
// (Taraflar) tek ekranda birleşti; sonraki aşamalar birer basamak kaydı. Toplam 8 → 7.
const PHASES = [
  { id: 1, label: "Dosya Kurulumu", icon: FileText },
  { id: 2, label: "Taraf Analizi", icon: Brain },
  { id: 3, label: "Arabulucu Paneli", icon: ShieldCheck },
  { id: 4, label: "Toplantı", icon: CalIcon },
  { id: 5, label: "Bilirkişi", icon: UserCheck, optional: true },
  { id: 6, label: "Görüşme Notları", icon: MessageSquare },
  { id: 7, label: "Belgeler & Kapanış", icon: FileCheck2 },
] as const;

export const ASAMA_SAYISI = PHASES.length;

// Eski (8 aşamalı) numaradan yeni (7 aşamalı) numaraya eşleme. Eski Aşama 1 ve 2
// artık tek ekran olduğu için ikisi de 1'e düşer.
const ESKI_YENI_ASAMA: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7 };
// URL'deki phase parametresinin hangi numaralamada olduğunu gösteren işaret.
// Uygulamanın ürettiği her bağlantı pv=2 taşır; pv taşımayan (eski e-posta,
// yer imi, eski ekran) bağlantılar eski numaralı sayılıp yenisine çevrilir.
const ASAMA_SURUM = "2";
function asamaSinirla(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(ASAMA_SAYISI, Math.max(1, Math.round(n)));
}

// Sıradaki erişilebilir (kilidi açık, tamamlanmamış) en küçük numaralı faz — opsiyonel Faz 5 hiçbir zaman engellemez.
function computeNextActionablePhase(phaseStatus: Record<number, boolean>, analizTamam: boolean): number | null {
  for (const p of PHASES) {
    const locked = p.id >= 3 && !analizTamam;
    if (locked) continue;
    const optional = "optional" in p && p.optional;
    if (optional) continue;
    if (!phaseStatus[p.id]) return p.id;
  }
  return null;
}

type CaseRow = {
  id: string;
  user_id: string;
  title: string | null;
  application_no: string | null;
  uyap_no: string | null;
  // Nöbetçi fonksiyon gelene kadar yalnız saklanan anahtar (cases.otomatik_akis).
  otomatik_akis?: boolean | null;
  dispute_type: string | null;
  dispute_subtype?: string | null;
  status: string | null;
  current_phase: number | null;
  application_date: string | null;
  assigned_mediator_id: string | null;
  issue_description: string | null;
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
  // vekil (opsiyonel, bireysel/kurumsal fark etmez)
  vekil_ad_soyad?: string;
  vekil_baro?: string;
  vekil_sicil_no?: string;
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
  // Aşama numarası: pv=2 taşıyan bağlantı yeni numaralamadadır; taşımayan
  // (eski) bağlantı eski numaralamadan yenisine çevrilir — kırık link kalmaz.
  const phaseRaw = Number(params.get("phase") || 1);
  const phaseSurumu = params.get("pv");
  const phaseParam = phaseSurumu === ASAMA_SURUM
    ? asamaSinirla(phaseRaw)
    : (ESKI_YENI_ASAMA[Math.min(8, Math.max(1, Math.round(phaseRaw) || 1))] ?? 1);

  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [activeCase, setActiveCase] = useState<CaseRow | null>(null);
  const [analizTamam, setAnalizTamam] = useState(false);
  // Faz 4 kokpitinin bildirdiği bölüm listesi (sol menüdeki alt katman) ve
  // menüden gelen "şu bölümü aç" isteği. Faz 4 dışında liste boş kalır.
  const [cockpitSections, setCockpitSections] = useState<{ id: string; label: string; kind: "layer" | "section"; hint?: string }[]>([]);
  const [cockpitJump, setCockpitJump] = useState<{ id: string; nonce: number } | null>(null);
  // Kokpitteki "Randevu ayarla" düğmesinden Aşama 4'teki mevcut randevu akışına tetik.
  // State değil ref: aşama geçişi sol menüdekiyle birebir aynı tek işlem kalsın, geçişe
  // ikinci bir state güncellemesi karışmasın. Değer, geçişin doğurduğu render'da okunur.
  const randevuTetikRef = useRef<number | null>(null);
  const [phaseStatus, setPhaseStatus] = useState<Record<number, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<CaseRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [agentPanelOpen, setAgentPanelOpen] = useState(false);
  const [paymentPanelOpen, setPaymentPanelOpen] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);
  // Faz tamamlanma daveti — sadece tamamlanmadı→tamamlandı GEÇİŞİNDE toast/parlama tetiklenir.
  // null = henüz hiç hesaplanmadı (dosya ilk açılışı); ilk hesaplamada geçiş sayılmaz.
  const prevPhaseStatusRef = useRef<Record<number, boolean> | null>(null);
  const [glowPhase, setGlowPhase] = useState<number | null>(null);
  /* Sol menüdeki altın nokta: dosyanın BULUNDUĞU aşamayı gösterir (bakılan aşamayı
     değil). Bir ajan çalışıyorsa nokta nabız gibi atar, iş yoksa sabit durur.
     Menü sırası, adlar ve numaralandırma DEĞİŞMEZ; yalnız nokta eklenir. */
  const [ajanCalisiyor, setAjanCalisiyor] = useState(false);

  useEffect(() => {
    if (!activeCase?.id) { setAjanCalisiyor(false); return; }
    let iptal = false;
    const bak = async () => {
      const { count } = await supabase.from("agent_states")
        .select("id", { count: "exact", head: true })
        .eq("case_id", activeCase.id).eq("status", "running");
      if (!iptal) setAjanCalisiyor((count ?? 0) > 0);
    };
    bak();
    // Mevcut Realtime deseni; kanal bileşen kapanınca kaldırılır.
    const kanal = supabase
      .channel(`asama_noktasi:${activeCase.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "agent_states", filter: `case_id=eq.${activeCase.id}` },
        () => { bak(); })
      .subscribe();
    return () => { iptal = true; supabase.removeChannel(kanal); };
  }, [activeCase?.id]);

  useEffect(() => {
    if (activeCase && (isMediator || isAdmin) && params.get("tab") === "surec") {
      setTrackerOpen(true);
    }
  }, [activeCase, isMediator, isAdmin, params]);

  /* 29.08.2026 KUSURU: burada doğrudan `from("cases").delete()` çağrılıyordu.
     Cascade çocuk satırları götürüyor ama DEPOYA hiç dokunulmuyordu; oysa
     onay penceresi "belgeler de silinecektir" diyor. Her silinen başvurunun
     dosyaları kovada süresiz kalıyordu (constitution m.10). 25.08'de canlıda
     bulunan 6 öksüz belgenin muhtemel üreticisi bu yol.
     İstemci bunu kendi düzeltemez: sesli notun kovası istemciye kapalıdır.
     Silme artık `basvuru-sil` kolundan geçiyor — önce depo, sonra satır.
     Yetki AYNI kalır: kol, `cases` RLS silme politikasının aynısını arar. */
  async function deleteCase(c: CaseRow) {
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("basvuru-sil", {
        body: { case_id: c.id },
      });
      const hata = error ? String(error.message ?? "") : String((data as any)?.error ?? "");
      if (hata) throw new Error(hata);
      if (!(data as any)?.silindi) {
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

  /* BAĞIMLILIK `user` NESNESİ DEĞİL, KİMLİĞİ: jeton yenilendiğinde (sekme boşta
     kalıp geri dönünce) `onAuthStateChange` aynı kullanıcı için YENİ bir nesne
     üretir; nesne kimliğine bağlı etki boşuna yeniden koşup listeyi yükleme
     durumuna sokardı. */
  const oturumKullaniciId = user?.id;
  useEffect(() => {
    if (oturumKullaniciId) loadCases();
  }, [oturumKullaniciId]);

  useEffect(() => {
    if (caseId) loadCase(caseId); else setActiveCase(null);
  }, [caseId]);

  const checkAnaliz = useCallback(async (id: string) => {
    const { count: aCount } = await supabase.from("party_analyses").select("id", { count: "exact", head: true }).eq("case_id", id);
    setAnalizTamam((aCount ?? 0) >= 1);
  }, []);

  useEffect(() => {
    if (caseId) checkAnaliz(caseId);
  }, [caseId, checkAnaliz, phaseParam]);

  // Faz tamamlanma koşulları — mevcut verilerden türetilir, tek toplu sorgu.
  // Faz1/Faz7 caseRow alanlarından, Faz5 (bilirkişi) opsiyonel olduğu için hiç sorgulanmaz.
  // NOT: case_notes.phase = 7 bir VERİ işaretidir (görüşme notu satırı), ekrandaki
  // aşama numarası değildir — aşama numaraları kayarken bu değere dokunulmadı.
  const checkPhaseCompletion = useCallback(async (id: string, c: CaseRow) => {
    const [parties, analyses, reports, sessions, notes] = await Promise.all([
      supabase.from("case_parties").select("id", { count: "exact", head: true }).eq("case_id", id),
      supabase.from("party_analyses").select("id", { count: "exact", head: true }).eq("case_id", id),
      supabase.from("common_ground_reports").select("id", { count: "exact", head: true }).eq("case_id", id),
      supabase.from("case_sessions").select("id", { count: "exact", head: true }).eq("case_id", id),
      supabase.from("case_notes").select("id", { count: "exact", head: true }).eq("case_id", id).eq("phase", 7),
    ]);
    const nextStatus: Record<number, boolean> = {
      // Aşama 1 artık tek giriş kapısı: tür tespiti + en az iki taraf birlikte aranır.
      1: !!c.dispute_type && (parties.count ?? 0) >= 2,
      2: (analyses.count ?? 0) >= 1,
      3: (reports.count ?? 0) >= 1,
      4: (sessions.count ?? 0) >= 1,
      5: false, // opsiyonel (bilirkişi) — tamamlanma aranmaz
      6: (notes.count ?? 0) >= 1,
      7: c.status === "agreed" || c.status === "failed",
    };

    // Davet modeli: sadece tamamlanmadı→tamamlandı geçişinde tetikle (ilk yüklemede sessiz kal).
    const prev = prevPhaseStatusRef.current;
    if (prev) {
      for (const p of PHASES) {
        if ("optional" in p && p.optional) continue;
        if (!prev[p.id] && nextStatus[p.id]) {
          setGlowPhase(p.id);
          toast({
            title: `✓ Aşama ${p.id} tamamlandı`,
            description: p.label,
          });
        }
      }
    }
    prevPhaseStatusRef.current = nextStatus;
    setPhaseStatus(nextStatus);
  }, [analizTamam]);

  useEffect(() => {
    if (caseId && activeCase) checkPhaseCompletion(caseId, activeCase);
  }, [caseId, phaseParam, activeCase, checkPhaseCompletion]);

  // Eski numaralı bağlantı geldiyse adresi bir kez yeni numaraya çevir (replace):
  // ekran zaten doğru aşamayı gösteriyor, bu yalnız adres çubuğunu düzeltir.
  useEffect(() => {
    if (!caseId || phaseSurumu === ASAMA_SURUM) return;
    const p = new URLSearchParams(params);
    p.set("phase", String(phaseParam));
    p.set("pv", ASAMA_SURUM);
    setParams(p, { replace: true });
  }, [caseId, phaseSurumu, phaseParam, params, setParams]);

  useEffect(() => {
    if (params.get("new") === "1") {
      setShowNew(true);
      const p = new URLSearchParams(params);
      p.delete("new");
      setParams(p, { replace: true });
    }
  }, [params, setParams]);

  // Sayfa seviyesi koruma: dosyada TARAF olan kullanıcı, adresi elle yazsa bile arabulucu
  // ekranında kalamaz — kendi ekranına (CaseRoom) yönlendirilir. Dosya sahibi, görevli
  // arabulucu ve admin bu kontrolden etkilenmez.
  useEffect(() => {
    if (!caseId || !user?.id || isAdmin) return;
    let aktif = true;
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from("cases").select("user_id, assigned_mediator_id").eq("id", caseId).maybeSingle(),
        supabase.from("case_parties").select("id").eq("case_id", caseId).eq("user_id", user.id).limit(1),
      ]);
      if (!aktif) return;
      const yonetici = !!c.data && (c.data.user_id === user.id || c.data.assigned_mediator_id === user.id);
      const taraf = Array.isArray(p.data) && p.data.length > 0;
      if (taraf && !yonetici) navigate(`/case-room/${caseId}`, { replace: true });
    })();
    return () => { aktif = false; };
  }, [caseId, user?.id, isAdmin, navigate]);

  async function loadCases() {
    setLoading(true);
    const { data, error } = await supabase
      .from("cases")
      .select("id, user_id, title, application_no, uyap_no, dispute_type, dispute_subtype, status, current_phase, application_date, assigned_mediator_id, issue_description, created_at, is_mandatory, legal_duration_days, extension_days, legal_basis, deadline_total, deadline_extended, extension_used, deadline_sources, deadline_conflict, deadline_conflict_note, deadline_detected_at, mediation_type, mahkeme_turu, sure_hafta, uzatma_hafta, otomatik_akis")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Yükleme hatası", description: trErr(error.message), variant: "destructive" });
    else setCases((data ?? []) as CaseRow[]);
    setLoading(false);
  }

  async function loadCase(id: string) {
    const { data, error } = await supabase
      .from("cases")
      .select("id, user_id, title, application_no, uyap_no, dispute_type, dispute_subtype, status, current_phase, application_date, assigned_mediator_id, issue_description, created_at, is_mandatory, legal_duration_days, extension_days, legal_basis, deadline_total, deadline_extended, extension_used, deadline_sources, deadline_conflict, deadline_conflict_note, deadline_detected_at, mediation_type, mahkeme_turu, sure_hafta, uzatma_hafta, otomatik_akis")
      .eq("id", id).maybeSingle();
    if (error) { toast({ title: "Başvuru yüklenemedi", description: trErr(error.message), variant: "destructive" }); return; }
    setActiveCase(data as CaseRow);
  }

  function openCase(id: string, phase = 1) {
    const p = new URLSearchParams();
    p.set("caseId", id); p.set("phase", String(asamaSinirla(phase))); p.set("pv", ASAMA_SURUM);
    setParams(p);
  }
  function setPhase(phase: number) {
    const p = new URLSearchParams(params);
    p.set("phase", String(asamaSinirla(phase)));
    p.set("pv", ASAMA_SURUM);
    setParams(p);
  }
  // Sol süreç menüsündeki aşama satırının tıklama davranışının tek kopyası; kokpitteki
  // "Randevu ayarla" düğmesi de aşamayı bununla değiştirir (ayrı bir geçiş yolu yok).
  function gotoPhase(id: number) {
    const locked = id >= 3 && !analizTamam;
    if (locked) {
      toast({ title: "Aşama kilitli", description: "Önce Aşama 2'de en az bir taraf analizini tamamlayın." });
      return;
    }
    setPhase(id);
  }

  // Otomatik akış anahtarı (cases.otomatik_akis). Şimdilik yalnız değeri saklar;
  // nöbetçi fonksiyon gelince işlevlenecek. Hook'lar koşullu return'lerin ÜSTÜNDE.
  const [otomatikAkis, setOtomatikAkis] = useState(false);
  const [otomatikBusy, setOtomatikBusy] = useState(false);
  const [otomatikHata, setOtomatikHata] = useState<string | null>(null);
  // Gösterim yalnız aktif dosyanın kendi değerinden gelir; dosya değişince sıfırlanır.
  useEffect(() => {
    setOtomatikAkis(!!activeCase?.otomatik_akis);
    setOtomatikHata(null);
  }, [activeCase?.id, activeCase?.otomatik_akis]);

  async function toggleOtomatikAkis(next: boolean) {
    if (!activeCase || otomatikBusy) return;
    const hedefId = activeCase.id;                   // yazım yalnız bu dosyaya
    const onceki = otomatikAkis;
    setOtomatikBusy(true);
    setOtomatikHata(null);
    setOtomatikAkis(next);
    // Etkilenen satırlar geri okunur: tek satır ve tam da bu dosya olmalı.
    // Başka bir dosya etkilenirse anahtar eski hâline döner ve hata görünür kalır.
    const { data, error } = await supabase.from("cases")
      .update({ otomatik_akis: next } as any)
      .eq("id", hedefId)
      .select("id, otomatik_akis");
    const satirlar = Array.isArray(data) ? data : [];
    if (error) {
      setOtomatikAkis(onceki);                       // hata sessiz kalmaz
      setOtomatikHata(`Kaydedilemedi: ${trErr(error.message)}`);
    } else if (satirlar.length !== 1 || (satirlar[0] as any)?.id !== hedefId) {
      setOtomatikAkis(onceki);
      setOtomatikHata(`Kaydedilemedi: beklenen tek dosya yerine ${satirlar.length} kayıt etkilendi.`);
    } else {
      setActiveCase((prev) => (prev && prev.id === hedefId ? { ...prev, otomatik_akis: next } : prev));
    }
    setOtomatikBusy(false);
  }

  // NOT: Bu hook, aşağıdaki koşullu return'lerden (loading / !caseId / !activeCase) ÖNCE
  // durmalı — Hooks Rules gereği hook çağrı sırası her render'da sabit kalmalı (React #310).
  const nextActionablePhase = useMemo(
    () => computeNextActionablePhase(phaseStatus, analizTamam),
    [phaseStatus, analizTamam]
  );

  // Altın parlama: tamamlanma geçişinde bir defalık, ~1.3sn sonra kendiliğinden söner.
  useEffect(() => {
    if (glowPhase == null) return;
    const t = setTimeout(() => setGlowPhase(null), 1300);
    return () => clearTimeout(t);
  }, [glowPhase]);

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

          {/* Kazanım baz çizgisi: arabulucu iş üretmeden ÖNCE alınır (§5.9,
              HAT H-15/4). Beyan verilene kadar görünür; kapatılamaz ama
              çalışmayı da engellemez. */}
          {(isMediator || isAdmin) && user?.id && <BazCizgiSorulari userId={user.id} />}

          {showNew && (
            <NewCaseForm
              onCancel={() => { taslagiSil(); setShowNew(false); }}
              onCreated={(id) => { taslagiSil(); setShowNew(false); loadCases(); openCase(id, 1); }}
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
                    <button onClick={() => openCase(c.id, asamaSinirla(c.current_phase || 1))}
                      className="flex-1 text-left flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{c.title || "(başlıksız)"}</div>
                        <div className="text-sm text-muted-foreground">
                          {c.application_no ?? "—"} · {c.dispute_type ? anaAltLabel(c.dispute_type, c.dispute_subtype) : ""} · Aşama {asamaSinirla(c.current_phase ?? 1)}/{ASAMA_SAYISI}
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

  const completed = asamaSinirla(activeCase.current_phase ?? 1);

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
            {(isMediator || isAdmin) && (
              <div className="mt-3 border-t border-sidebar-foreground/10 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">Otomatik akış</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] opacity-70">{otomatikAkis ? "Açık" : "Kapalı"}</span>
                    <Switch
                      checked={otomatikAkis}
                      disabled={otomatikBusy}
                      onCheckedChange={(v) => toggleOtomatikAkis(!!v)}
                      aria-label="Otomatik akış"
                    />
                  </div>
                </div>
                <p className="text-[11px] opacity-70 mt-1 leading-snug">
                  Açıkken ajan sıradaki adımları kendisi yürütür; her adımı kayda yazar.
                </p>
                {otomatikHata && (
                  <p className="text-[11px] text-destructive mt-1 leading-snug">{otomatikHata}</p>
                )}
              </div>
            )}
          </div>
          <div className="border-t border-sidebar-foreground/10 pt-3 mb-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Dosya Araçları
          </div>
          {(isMediator || isAdmin) && (
            <Button variant="ghost" size="sm" className="w-full mb-4 justify-start border-l-2 border-l-transparent bg-transparent text-sidebar-foreground transition-colors hover:border-l-accent hover:text-accent hover:bg-sidebar-accent/40"
              onClick={() => setTrackerOpen(true)}>
              📋 Süreç Takip Çizelgesi
            </Button>
          )}
          <Button variant="ghost" size="sm" className="w-full mb-4 justify-start border-l-2 border-l-transparent bg-transparent text-sidebar-foreground transition-colors hover:border-l-accent hover:text-accent hover:bg-sidebar-accent/40"
            onClick={() => setAgentPanelOpen(true)}>
            🤖 Ajan Kontrol Paneli
          </Button>
          {(isMediator || isAdmin) && (
            <Button variant="ghost" size="sm" className="w-full mb-4 justify-start border-l-2 border-l-transparent bg-transparent text-sidebar-foreground transition-colors hover:border-l-accent hover:text-accent hover:bg-sidebar-accent/40"
              onClick={() => setQaOpen(true)}>
              ❓ Dosyaya Soru Sor
            </Button>
          )}
          <Button variant="ghost" size="sm" className="w-full mb-4 justify-start border-l-2 border-l-transparent bg-transparent text-sidebar-foreground transition-colors hover:border-l-accent hover:text-accent hover:bg-sidebar-accent/40"
            onClick={() => setPaymentPanelOpen(true)}>
            💰 Ödeme & Muhasebe
          </Button>
          <div className="mb-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Süreç
          </div>
          <nav className="space-y-1">
            {PHASES.map((p) => {
              const optional = "optional" in p && p.optional;
              const done = optional ? p.id < completed : !!phaseStatus[p.id];
              const active = p.id === phaseParam;
              const Icon = p.icon;
              const locked = p.id >= 3 && !analizTamam;
              const isNext = !locked && !active && p.id === nextActionablePhase;
              // Aktif fazın sol bölüm dizini — Aşama 1 ve Aşama 2 statik listeden,
              // Aşama 3 (kokpit) bildirdiği listeden; hepsi aynı biçimle çizilir.
              const sideSections = !active
                ? []
                : p.id === 1 ? FAZ1_MENU_ENTRIES
                : p.id === 2 ? FAZ3_MENU_ENTRIES
                : p.id === 3 ? cockpitSections
                : p.id === 4 ? FAZ4_MENU_ENTRIES
                : [];
              return (
                <div key={p.id}>
                <button onClick={() => gotoPhase(p.id)}
                  className={`relative w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors border-l-2
                    ${active ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-accent" : "border-l-transparent hover:border-l-accent hover:text-accent hover:bg-sidebar-accent/40"}
                    ${locked ? "opacity-50 cursor-not-allowed" : ""}
                    ${isNext ? "border-l-accent/60" : ""}`}
                  title={locked ? "Aşama 2 tamamlanmadı" : isNext ? "Sıradaki aşama" : ""}>
                  <AnimatePresence>
                    {glowPhase === p.id && (
                      <motion.span
                        key="gold-glow"
                        className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-amber-400"
                        initial={{ opacity: 0, boxShadow: "0 0 0px rgba(251,191,36,0)" }}
                        animate={{ opacity: [0, 1, 1, 0], boxShadow: ["0 0 0px rgba(251,191,36,0)", "0 0 14px rgba(251,191,36,0.8)", "0 0 14px rgba(251,191,36,0.8)", "0 0 0px rgba(251,191,36,0)"] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.3, times: [0, 0.15, 0.75, 1], ease: "easeOut" }}
                      />
                    )}
                  </AnimatePresence>
                  {optional
                    ? <span className="h-4 w-4 rounded-full border border-current/50 flex items-center justify-center shrink-0" title="Opsiyonel — atlanabilir">
                        <span className="h-1.5 w-1.5 rounded-full bg-current/50" />
                      </span>
                    : done
                      ? <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                      : <Circle className="h-4 w-4 opacity-60 shrink-0" />}
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{p.id}. {p.label}</span>
                  {/* ALTIN NOKTA: dosyanın bulunduğu aşama. Yalnız bir aşamada yanar,
                      aşama değişince kendiliğinden taşınır. Ajan çalışırken atar. */}
                  {p.id === Math.min(7, Math.max(1, Number(activeCase?.current_phase ?? 1) || 1)) && (
                    <span className="relative flex h-2 w-2 shrink-0" title="Dosya şu anda bu aşamada">
                      {ajanCalisiyor && (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      )}
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                    </span>
                  )}
                  {optional && <span className="text-[10px] opacity-60">opsiyonel</span>}
                  {isNext && (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                    </span>
                  )}
                </button>
                {/* Aktif fazın bölüm dizini (Faz 3: statik katman+bölüm listesi,
                    Faz 4: kokpitin bildirdiği liste) — tek çizim, aynı biçim.
                    Diğer fazlarda hiç render edilmez. */}
                {sideSections.length > 0 && (
                  <div className="mt-1 mb-1 space-y-0.5">
                    {sideSections.map((sec) => (
                      <button
                        key={`${sec.kind}-${sec.id}`}
                        type="button"
                        title={sec.hint}
                        onClick={() => setCockpitJump({ id: sec.id, nonce: Date.now() })}
                        className={
                          sec.kind === "layer"
                            ? "w-full text-left pl-8 pr-3 pt-2 pb-0.5 text-[11px] font-medium uppercase tracking-wide text-sidebar-foreground/45 transition-colors hover:text-accent"
                            : "w-full text-left pl-11 pr-3 py-1 rounded-md text-xs text-sidebar-foreground/70 transition-colors hover:text-accent hover:bg-sidebar-accent/40"
                        }
                      >
                        {sec.label}
                      </button>
                    ))}
                  </div>
                )}
                </div>
              );
            })}
          </nav>
          {/* Faz 4'teyken kokpit bölümleri: "4. Arabulucu Paneli" satırının altında
              girintili alt satırlar. Yalnız verisi olan bölümler listelenir; başka
              fazlarda hiç render edilmez, menünün mevcut yapısı değişmez. */}
        </aside>
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
          {/* mode="wait" kaldırıldı: yeni aşama, eskisinin çıkış animasyonu bitene kadar
              mount edilmiyordu; çıkış tamamlanma sinyali gelmediğinde ana alan boş
              kalıyordu (sol menüden Aşama 3'e geçişte görülen boş sayfa). Adres
              doğrudan yazıldığında çıkan bir çocuk olmadığı için sorun görünmüyordu. */}
          <AnimatePresence>
            <motion.div
              key={phaseParam}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <PhaseRenderer
                phase={phaseParam}
                caseRow={activeCase}
                reload={() => { loadCase(activeCase.id); checkAnaliz(activeCase.id); checkPhaseCompletion(activeCase.id, activeCase); }}
                isMediator={isMediator || isAdmin}
                userId={user!.id}
                onAdvance={(next) => setPhase(next)}
                onCockpitSections={setCockpitSections}
                cockpitJump={cockpitJump}
                randevuTetik={randevuTetikRef.current ? { nonce: randevuTetikRef.current } : null}
                onRandevuAyarla={() => { randevuTetikRef.current = Date.now(); gotoPhase(4); }}
              />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {(isMediator || isAdmin) && (
        <ProcessTrackerPanel caseRow={activeCase} open={trackerOpen} onOpenChange={setTrackerOpen} />
      )}
      {/* AJAN PENCERESİ — dosya açıkken TÜM aşamalarda görünür. Tek yerden mount
          edilir; aşama ekranlarına hiçbir şey eklenmedi. Salt görünümdür. */}
      {(isMediator || isAdmin) && (
        <AjanPenceresi caseId={activeCase.id} mod="arabulucu" />
      )}
      <Dialog open={agentPanelOpen} onOpenChange={setAgentPanelOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="heading-gold-underline">Ajan Kontrol Paneli</DialogTitle>
          </DialogHeader>
          <AgentControlPanel caseId={activeCase.id} isMediator={isMediator || isAdmin} />
        </DialogContent>
      </Dialog>
      {(isMediator || isAdmin) && (
        <CaseQaPanel caseRow={activeCase} open={qaOpen} onOpenChange={setQaOpen} />
      )}
      <Dialog open={paymentPanelOpen} onOpenChange={setPaymentPanelOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="heading-gold-underline">Ödeme & Muhasebe</DialogTitle>
          </DialogHeader>
          <PaymentAccountingPanel caseRow={activeCase} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===================== NEW CASE (Phase 1) ===================== */

// Ana uyuşmazlık türü (zorunlu) — dava şartı/süre hesabına dokunmayan, sadece
// dosya açılışında seçilen 6 kanuni ana kategori.
const ANA_UYUSMAZLIK_TURLERI: { value: string; label: string }[] = [
  { value: "işçi_işveren", label: "İşçi-İşveren" },
  { value: "ticari", label: "Ticari" },
  { value: "tüketici", label: "Tüketici" },
  { value: "kira", label: "Kira" },
  { value: "aile", label: "Aile" },
  { value: "ortaklık", label: "Ortaklığın Giderilmesi" },
];

// Alt uzmanlık alanı (isteğe bağlı) — sağlık/sigorta/fikri-sınai gibi alanlar
// hukuken birden fazla ana türe bağlanabildiği için ayrı ve opsiyonel tutulur.
const ALT_UZMANLIK_ALANLARI: { value: string; label: string }[] = [
  { value: "sağlık", label: "Sağlık" },
  { value: "sigorta", label: "Sigorta" },
  { value: "fikri_sınai_haklar", label: "Fikri-Sınai Haklar" },
  { value: "inşaat", label: "İnşaat" },
  { value: "bankacılık", label: "Bankacılık" },
  { value: "spor", label: "Spor" },
  { value: "enerji_maden", label: "Enerji-Maden" },
];
const ALT_UZMANLIK_YOK = "yok";
function altUzmanlikLabel(v?: string | null) {
  return ALT_UZMANLIK_ALANLARI.find((c) => c.value === v)?.label ?? v ?? null;
}
// "Ana — Alt" birleşik gösterim; alt uzmanlık yoksa sadece ana tür döner.
function anaAltLabel(disputeType?: string | null, altUzmanlik?: string | null) {
  const ana = catLabel(disputeType);
  const alt = altUzmanlikLabel(altUzmanlik);
  return alt ? `${ana} — ${alt}` : ana;
}

/* ===================== KAYIT ONAY PANELİ ===================== */
// "Kontrol et → düzelt → onayla": kayıt, panel onaylanana kadar düşmez.
// Her alan panelin içinde düzeltilir; forma dönmek gerekmez.
type ConfirmField = {
  key: string;
  label: string;
  value: string;                                   // düzenleme alanının ham değeri
  display?: string;                                // ekranda gösterilen metin (etiket vb.)
  editable?: boolean;                              // false → yalnız gösterilir
  options?: { value: string; label: string }[];    // verilirse açılır liste
  type?: string;                                   // input type (email vb.)
};

function ConfirmSavePanel({
  title, note, fields, onFieldChange, onConfirm, onBack, busy, confirmLabel = "Onayla ve kaydet",
}: {
  title: string;
  note?: string;
  fields: ConfirmField[];
  onFieldChange: (key: string, value: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  busy?: boolean;
  confirmLabel?: string;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {note && <p className="text-sm text-muted-foreground mt-1">{note}</p>}
      </div>
      <div className="rounded border divide-y">
        {fields.map((f) => {
          const editing = openKey === f.key && f.editable !== false;
          return (
            <div key={f.key} className="p-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">{f.label}</div>
                {editing ? (
                  f.options ? (
                    <Select value={f.value || undefined} onValueChange={(v) => onFieldChange(f.key, v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Seçin" /></SelectTrigger>
                      <SelectContent>
                        {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className="mt-1"
                      type={f.type ?? "text"}
                      value={f.value}
                      autoFocus
                      onChange={(e) => onFieldChange(f.key, e.target.value)}
                    />
                  )
                ) : (
                  <div className="text-sm break-words">{(f.display ?? f.value) || "—"}</div>
                )}
              </div>
              {f.editable !== false && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => setOpenKey(editing ? null : f.key)}
                  title={editing ? "Düzenlemeyi kapat" : "Düzenle"}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />{editing ? "Bitti" : "Düzenle"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onBack} disabled={busy}>Geri dön</Button>
        <Button onClick={onConfirm} disabled={busy}>
          {busy ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Kaydediliyor…</> : confirmLabel}
        </Button>
      </div>
    </div>
  );
}

/* FORM KAYBI ONARIMI (03.08 saha notu: "dosya açılış formunun sayfası boşta
   kalınca listeye dönüyor").
   Sebep tek bir yerde değil: sekme boşta kalınca oturum düşerse `/auth`'a
   gidilir ve dönüşte liste karşılar; jeton yenilenmesi de üst durumu
   tazeler. Tetikleyiciyi tek tek kovalamak yerine ASIL ZARAR kapatılıyor —
   yazılan içerik kaybolmasın. Taslak yerelde tutulur, kayıt/iptal olunca
   silinir. Taslakta yalnız arabulucunun KENDİ yazdığı üç alan var; taraf
   verisi ya da dosya içeriği yok. */
const YENI_BASVURU_TASLAK = "medipact.yeniBasvuru.taslak.v1";

type YeniBasvuruTaslak = { title: string; disputeType: string; altUzmanlik: string };

function taslagiOku(): YeniBasvuruTaslak | null {
  try {
    const ham = localStorage.getItem(YENI_BASVURU_TASLAK);
    if (!ham) return null;
    const t = JSON.parse(ham) as YeniBasvuruTaslak;
    if (typeof t?.title !== "string") return null;
    return t;
  } catch { return null; }
}

function taslagiSil() {
  try { localStorage.removeItem(YENI_BASVURU_TASLAK); } catch { /* yoksayılır */ }
}

function NewCaseForm({ onCancel, onCreated, userId, isMediator }: {
  onCancel: () => void; onCreated: (id: string) => void; userId: string; isMediator: boolean;
}) {
  const ilkTaslak = taslagiOku();
  const [title, setTitle] = useState(ilkTaslak?.title ?? "");
  const [disputeType, setDisputeType] = useState(ilkTaslak?.disputeType ?? "");
  const [altUzmanlik, setAltUzmanlik] = useState(ilkTaslak?.altUzmanlik ?? ALT_UZMANLIK_YOK);
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [aiSuggestedType, setAiSuggestedType] = useState(false);
  const [aiSuggestedSubtype, setAiSuggestedSubtype] = useState(false);
  // Kayıt, onay paneli onaylanana kadar düşmez.
  const [confirming, setConfirming] = useState(false);

  /* Her tuşta taslağı yaz: sayfa hangi sebeple giderse gitsin içerik dursun.
     Yazılamazsa (özel pencere, site verisi kapalı) sessizce geçilir — taslak
     bir kolaylıktır, akışın şartı değildir. */
  useEffect(() => {
    try {
      if (!title && !disputeType && altUzmanlik === ALT_UZMANLIK_YOK) {
        localStorage.removeItem(YENI_BASVURU_TASLAK);
        return;
      }
      localStorage.setItem(YENI_BASVURU_TASLAK, JSON.stringify({ title, disputeType, altUzmanlik }));
    } catch { /* yoksayılır */ }
  }, [title, disputeType, altUzmanlik]);

  // Salt ön-doldurma: başlıktan ana tür + alt uzmanlık önerir, hiçbir DB yazımı yok
  // (case_id/persist gönderilmez). Menüler öneriyle işaretlenir, arabulucu onaylar/değiştirir.
  async function suggestFromTitle() {
    setSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("classify-dispute", {
        body: { text: title },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const kategori = String((data as any)?.kategori ?? "");
      if (ANA_UYUSMAZLIK_TURLERI.some((c) => c.value === kategori)) {
        setDisputeType(kategori);
        setAiSuggestedType(true);
      }
      const altUz = String((data as any)?.alt_uzmanlik ?? "");
      if (altUz !== "yok" && ALT_UZMANLIK_ALANLARI.some((c) => c.value === altUz)) {
        setAltUzmanlik(altUz);
        setAiSuggestedSubtype(true);
      }
    } catch {
      toast({ title: "Öneri alınamadı, elle seçebilirsiniz", variant: "destructive" });
    } finally {
      setSuggesting(false);
    }
  }

  // "Başvuruyu Oluştur" artık doğrudan kaydetmez; önce özet paneli açar.
  function review() {
    if (!disputeType) {
      toast({ title: "Ana uyuşmazlık türü zorunlu", description: "Devam etmeden önce bir ana tür seçin.", variant: "destructive" });
      return;
    }
    setConfirming(true);
  }

  const confirmFields: ConfirmField[] = [
    { key: "title", label: "Uyuşmazlık konusu (başvuru başlığı)", value: title,
      display: title || "(boş — Sistem No ile doldurulur)" },
    { key: "dispute_type", label: "Ana uyuşmazlık türü", value: disputeType,
      display: ANA_UYUSMAZLIK_TURLERI.find((c) => c.value === disputeType)?.label ?? "—",
      options: ANA_UYUSMAZLIK_TURLERI.map((c) => ({ value: c.value, label: c.label })) },
    { key: "alt_uzmanlik", label: "Alt uzmanlık alanı", value: altUzmanlik,
      display: altUzmanlik !== ALT_UZMANLIK_YOK
        ? (ALT_UZMANLIK_ALANLARI.find((c) => c.value === altUzmanlik)?.label ?? "—")
        : "Yok",
      options: [{ value: ALT_UZMANLIK_YOK, label: "Yok" }, ...ALT_UZMANLIK_ALANLARI.map((c) => ({ value: c.value, label: c.label }))] },
    { key: "sistem_no", label: "Sistem No", value: "", display: "Kayıt anında atanır (MP-YYYY-XXXX)", editable: false },
    { key: "basvuru_tarihi", label: "Başvuru tarihi", value: "", display: new Date().toLocaleDateString("tr-TR"), editable: false },
    { key: "taraflar", label: "Taraflar (ad, rol, e-posta)", value: "",
      display: "Bu formda girilmez — Aşama 1'de eklenir; her taraf kaydında ayrı onay paneli çıkar.", editable: false },
  ];

  function onConfirmFieldChange(key: string, value: string) {
    if (key === "title") setTitle(value);
    else if (key === "dispute_type") { setDisputeType(value); setAiSuggestedType(false); }
    else if (key === "alt_uzmanlik") { setAltUzmanlik(value); setAiSuggestedSubtype(false); }
  }

  async function create() {
    if (!disputeType) {
      toast({ title: "Ana uyuşmazlık türü zorunlu", description: "Devam etmeden önce bir ana tür seçin.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { data: appNoData } = await supabase.rpc("generate_application_no" as any);
      const application_no = (appNoData as string) ?? `MP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: row, error } = await supabase.from("cases").insert({
        user_id: userId,
        assigned_mediator_id: isMediator ? userId : null,
        title: title || `Başvuru - ${application_no}`,
        dispute_type: disputeType,
        dispute_subtype: altUzmanlik !== ALT_UZMANLIK_YOK ? altUzmanlik : null,
        application_no,
        uyap_no: null,
        status: "active",
        // Yeni dosya doğrudan tek giriş kapısında (Aşama 1) açılır.
        current_phase: 1,
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
      {confirming ? (
        <ConfirmSavePanel
          title="Kaydetmeden önce kontrol edin"
          note="Bilgiler doğruysa onaylayın; kayıt ancak onaydan sonra düşer."
          fields={confirmFields}
          onFieldChange={onConfirmFieldChange}
          onConfirm={create}
          onBack={() => setConfirming(false)}
          busy={busy}
        />
      ) : (
      <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Başvuru Başlığı</Label>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={suggestFromTitle}
              disabled={suggesting || title.trim().length < 10}
              title={title.trim().length < 10 ? "Önce uyuşmazlığı kısaca yazın" : undefined}
            >
              {suggesting
                ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Öneriliyor...</>
                : <><Sparkles className="h-3 w-3 mr-1" />AI Önerisi</>}
            </Button>
          </div>
          <UcretliIsaret />
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn. Kira sözleşmesinden doğan uyuşmazlık" />
        </div>
        <div>
          <Label className="flex items-center gap-2">
            Ana Uyuşmazlık Türü *
            {aiSuggestedType && <Badge variant="secondary" className="text-[10px]">AI önerisi</Badge>}
          </Label>
          <Select value={disputeType || undefined} onValueChange={(v) => { setDisputeType(v); setAiSuggestedType(false); }}>
            {/* ERİŞİLEBİLİR AD: `Label`in `htmlFor`u yok ve tetikleyicinin `id`si
                yoktu — ekran okuyucu menüyü ADSIZ okuyordu ("combobox", neyi
                seçtiği belirsiz). 03.08 saha notundaki erişilebilirlik bulgusu. */}
            <SelectTrigger aria-label="Ana uyuşmazlık türü">
              <SelectValue placeholder="Bir ana tür seçin" />
            </SelectTrigger>
            <SelectContent>
              {ANA_UYUSMAZLIK_TURLERI.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="flex items-center gap-2">
            Alt Uzmanlık Alanı (isteğe bağlı)
            {aiSuggestedSubtype && <Badge variant="secondary" className="text-[10px]">AI önerisi</Badge>}
          </Label>
          <Select value={altUzmanlik} onValueChange={(v) => { setAltUzmanlik(v); setAiSuggestedSubtype(false); }}>
            <SelectTrigger aria-label="Alt uzmanlık alanı">
              <SelectValue placeholder="Yok" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALT_UZMANLIK_YOK}>Yok</SelectItem>
              {ALT_UZMANLIK_ALANLARI.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <Button onClick={review} disabled={busy || !disputeType}>
          {busy ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Oluşturuluyor</> : "Başvuruyu Oluştur"}
        </Button>
      </div>
      </>
      )}
    </Card>
  );
}

/* ===================== PHASE RENDERER ===================== */

// Arabulucunun ne zaman geçeceğine kendisinin karar verdiği, her zaman görünür ileri butonu.
// Koşula bağlı değil — mevcut tamamlanma/toast akışından bağımsız, manuel geçiş kapısı.
function NextPhaseButton({ phase, onAdvance }: { phase: number; onAdvance: (n: number) => void }) {
  return (
    <div className="mt-6 pt-4 border-t flex justify-end">
      <Button onClick={() => onAdvance(phase + 1)}>{`Aşama ${phase + 1}'e Geç →`}</Button>
    </div>
  );
}

function PhaseRenderer({ phase, caseRow, reload, isMediator, userId, onAdvance, onCockpitSections, cockpitJump, randevuTetik, onRandevuAyarla }: {
  phase: number; caseRow: CaseRow; reload: () => void; isMediator: boolean; userId: string;
  onAdvance: (n: number) => void;
  onCockpitSections?: (sections: { id: string; label: string; kind: "layer" | "section"; hint?: string }[]) => void;
  cockpitJump?: { id: string; nonce: number } | null;
  randevuTetik?: { nonce: number } | null;
  onRandevuAyarla?: () => void;
}) {
  /* AŞAMA GEÇİŞİ SUNUCUYA İZ BIRAKIR (24.08.2026 kusuru).
     "Aşama N+1'e Geç →" düğmesi `onAdvance` üzerinden YALNIZ adres çubuğundaki
     `phase` parametresini değiştiriyordu; `cases.current_phase` güncellenmiyordu.
     Dört sonucu vardı:
       · dosya sunucuda eski aşamada kalıyordu (Dashboard ve kokpit bayat),
       · koşucunun aşama değerlendirmesi (akis-yurut → asamaIlerlet) bayat
         numaradan koşuyordu,
       · asamaIlerlet'in "arabulucu elle geri aldıysa ajan aynı geçişi tekrar
         denemez" güvencesi BOŞTU: elle geçiş iz bırakmadığı için `[gecis:X->Y]`
         satırı hiç doğmuyor, dedupe hep boş küme üzerinde çalışıyordu,
       · Aşama 7 (Belgeler & Kapanış) sunucuda hiç görünmüyordu — kapanışa gelen
         dosyanın sunucuda izi yoktu.
     İz, koşucunun yazdığıyla AYNI etiketi taşır (`[gecis:X->Y]`); dedupe ancak
     böyle gerçekten çalışır. Sol menüdeki gezinme (gotoPhase) DEĞİŞMEDİ: bakmak
     için aşamaya geçmek dosyayı ilerletmez. */
  async function bumpPhase(next: number) {
    const mevcut = caseRow.current_phase ?? 1;
    if (mevcut >= next) return;
    const { error } = await supabase.from("cases")
      .update({ current_phase: next } as any).eq("id", caseRow.id);
    if (error) {
      toast({ title: "Aşama kaydedilemedi", description: error.message });
      return;
    }
    /* SESSİZ DÜŞME YOK: geçiş yazıldı, iz yazılamazsa geri alınmaz ama söylenir. */
    const { error: izErr } = await supabase.from("ajan_gorevleri").insert({
      case_id: caseRow.id, gorev_tipi: "asama_gecisi", durum: "yapildi",
      hedef_party_id: null,
      gerekce: `[gecis:${mevcut}->${next}] arabulucu elle ilerletti`,
      sonuc: "arabulucu ilerletti",
    });
    if (izErr) toast({ title: "Aşama geçti, iz yazılamadı", description: izErr.message });
    reload();
  }

  /* Düğmenin ADI ne diyorsa onu yapar: önce dosyayı ilerletir, sonra ekranı
     o aşamaya taşır. KAPI ARABULUCUNUNDUR — düğmenin kendi açıklaması da
     "arabulucunun ne zaman geçeceğine kendisinin karar verdiği" diyor. Taraf
     için davranış DEĞİŞMEDİ: onda düğme eskisi gibi yalnız ekranı taşır. */
  async function ilerlet(next: number) {
    if (isMediator) await bumpPhase(next);
    onAdvance(next);
  }
  // Aşama eşlemesi (14.08): 1 = tek giriş kapısı (başvuru + süre + taraflar + belgeler),
  // 2 = taraf analizi (eski 3), 3 = arabulucu paneli (eski 4), 4 = toplantı (eski 5),
  // 5 = bilirkişi (eski 6), 6 = görüşme notları (eski 7), 7 = belgeler & kapanış (eski 8).
  switch (phase) {
    case 1: return <><Phase1Setup caseRow={caseRow} reload={reload} isMediator={isMediator} userId={userId} jump={cockpitJump} /><NextPhaseButton phase={phase} onAdvance={ilerlet} /></>;
    case 2: return <><Phase3ErrorBoundary><Phase3PartyAnalysis caseRow={caseRow} userId={userId} isMediator={isMediator} reload={reload} jump={cockpitJump} /></Phase3ErrorBoundary><NextPhaseButton phase={phase} onAdvance={ilerlet} /></>;
    case 3: return <>
      {isMediator
        ? <Phase4Summary caseRow={caseRow} onSectionsChange={onCockpitSections} jump={cockpitJump} onRandevuAyarla={onRandevuAyarla} />
        : <BlindBidPartyForm caseId={caseRow.id} userId={userId} />}
      <NextPhaseButton phase={phase} onAdvance={ilerlet} />
    </>;
    case 4: return <><Phase5Sessions caseRow={caseRow} bumpPhase={bumpPhase} onAdvance={onAdvance} randevuTetik={randevuTetik} isMediator={isMediator} jump={cockpitJump} /><NextPhaseButton phase={phase} onAdvance={ilerlet} /></>;
    case 5: return <><Phase7Expert caseRow={caseRow} /><NextPhaseButton phase={phase} onAdvance={ilerlet} /></>;
    case 6: return <><Phase8Negotiation caseRow={caseRow} userId={userId} onDone={() => { bumpPhase(7); onAdvance(7); }} /><NextPhaseButton phase={phase} onAdvance={ilerlet} /></>;
    case 7: return <Phase9Closing caseRow={caseRow} reload={reload} />;
    default: return null;
  }
}

/* ===================== RANDEVU TEKLİFİ (Aşama 4) ===================== */
// Kokpitteki eylem düğmesinin kaydırma hedefi.
const RANDEVU_KART_ID = "faz5-randevu-ayarla";

// Saatleri randevu-teklif fonksiyonu seçer (bireysel → 1, kurumsal → 3 farklı gün);
// bu ekran yalnız seçilenleri gösterir. Elle saat seçme ekranı yoktur — tek istisna
// "Düzenle"dir. Teklif satırı da fonksiyonda service role ile yazılır.
function RandevuTeklifKarti({ caseRow, parties, tetik }: {
  caseRow: CaseRow; parties: any[]; tetik?: { nonce: number } | null;
}) {
  const [partyId, setPartyId] = useState<string>("");
  const [onerilen, setOnerilen] = useState<{ gun: string; saat: string }[] | null>(null);
  const [asking, setAsking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  // Her sonucun ekranda karşılığı olsun diye kartın kendi durum satırı:
  // toast kaçabiliyor, bu satır kartta kalıcı durur.
  const [mesaj, setMesaj] = useState<{ tip: "bilgi" | "hata"; metin: string } | null>(null);
  // Oturum tipi ve adres, teklif oluşturulurken secenekler jsonb'sinin içine yazılır.
  const [oturumTipi, setOturumTipi] = useState<"online" | "yuz_yuze">("online");
  const [adres, setAdres] = useState("");

  const BOS_SAAT_MESAJI = "Takviminizde uygun boş saat bulunamadı — Takvim > Müsaitlik bölümünden saat ekleyin.";

  // Bu dosyaya ait randevu tekliflerinin durum listesi (yeniden eskiye).
  const [teklifler, setTeklifler] = useState<any[]>([]);
  const [teklifYukleniyor, setTeklifYukleniyor] = useState(true);
  const [teklifHata, setTeklifHata] = useState<string | null>(null);

  const teklifleriYukle = useCallback(async () => {
    setTeklifYukleniyor(true);
    const { data, error } = await supabase
      .from("randevu_teklifleri")
      .select("id, party_id, secenekler, durum, secilen, cevap_zamani, created_at, token")
      .eq("case_id", caseRow.id)
      .order("created_at", { ascending: false });
    if (error) {
      // Hata yutulmaz: RLS'te arabulucu için SELECT politikası yoksa da burada görünür.
      setTeklifHata(error.message);
      setTeklifler([]);
    } else {
      setTeklifHata(null);
      setTeklifler(data ?? []);
    }
    setTeklifYukleniyor(false);
  }, [caseRow.id]);

  useEffect(() => { void teklifleriYukle(); }, [teklifleriYukle]);

  // Kokpitteki "Randevu ayarla" düğmesinden gelen tetik: karta kaydırır, dosyada tek
  // taraf varsa onu seçip mevcut saat önerisi akışını başlatır. Taraf listesi geç
  // yüklenebildiği için tetik, taraflar gelene kadar bekletilir (nonce bir kez işlenir).
  const islenenTetikRef = useRef<number | null>(null);
  useEffect(() => {
    const nonce = tetik?.nonce ?? null;
    if (nonce === null || islenenTetikRef.current === nonce) return;
    if (parties.length === 0) return;                   // taraflar henüz yüklenmedi
    islenenTetikRef.current = nonce;
    document.getElementById(RANDEVU_KART_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (parties.length === 1) {
      const tek = parties[0].id;
      setPartyId(tek);
      void askAgent(tek);
    }
  }, [tetik?.nonce, parties.length]);

  const party = parties.find((p) => p.id === partyId) ?? null;

  function tarafAdi(pid: string): string {
    const p = parties.find((x) => x.id === pid);
    return p ? partyDisplay(p) : "Taraf";
  }

  function gunSaatMetni(s: any): string {
    const gun = String(s?.gun ?? "").slice(0, 10);
    const saat = String(s?.saat ?? "").slice(0, 5);
    if (!gun) return saat || "—";
    return `${new Date(`${gun}T00:00:00`).toLocaleDateString("tr-TR")} ${saat}`;
  }

  // Oturum tipi seçenek girdilerinin içinde saklanır; olmayan eski tekliflerde gösterilmez.
  function oturumTipiMetni(secenekler: any[]): string | null {
    const kayit = secenekler.find((s: any) => s?.oturum_tipi);
    if (!kayit) return null;
    if (kayit.oturum_tipi === "yuz_yuze") {
      const a = String(kayit.adres ?? "").trim();
      return a ? `Yüz yüze — ${a}` : "Yüz yüze — adres girilmedi";
    }
    return "Online";
  }

  function durumMetni(t: any): string {
    if (t?.durum === "iptal") return "İptal edildi";
    if (t?.durum !== "cevaplandi") return "Bekliyor";
    const secilen = String(t?.secilen ?? "");
    if (secilen === "uygun") return "Cevaplandı — Uygun";
    if (secilen === "uymuyor") return "Cevaplandı — Uymuyor";
    if (secilen) {
      const [gun, saat] = secilen.split(" ");
      return `Cevaplandı — ${gunSaatMetni({ gun, saat })} saatini seçti`;
    }
    return "Cevaplandı";
  }

  async function metniKopyala(t: string) {
    try {
      await navigator.clipboard.writeText(t);
      toast({ title: "Link kopyalandı" });
    } catch {
      toast({ title: "Kopyalanamadı", description: "Linki elle seçip kopyalayın.", variant: "destructive" });
    }
  }

  function reset() {
    setOnerilen(null);
    setEditing(false);
    setLink(null);
    setMesaj(null);
  }

  // invoke hatasında gerçek gövde mesajını çıkarır (aksi halde yalnız
  // "non-2xx status code" görünür ve neden anlaşılmaz).
  async function hataMetni(error: any): Promise<string> {
    try {
      const ctx = (error as any)?.context;
      if (ctx && typeof ctx.text === "function") {
        const raw = await (typeof ctx.clone === "function" ? ctx.clone() : ctx).text();
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.error) return String(parsed.error);
          if (parsed?.message) return String(parsed.message);
        } catch { /* düz metin */ }
        if (raw) return String(raw).slice(0, 300);
      }
    } catch { /* gövde okunamadı */ }
    return String(error?.message ?? "Bilinmeyen hata");
  }

  function govde(data: any): any {
    if (typeof data === "string") {
      try { return JSON.parse(data); } catch { return { error: data }; }
    }
    return data ?? null;
  }

  async function askAgent(hedefPartyId?: string) {
    const pid = hedefPartyId ?? partyId;
    if (!pid || asking) return;
    reset();
    setAsking(true);
    try {
      const { data, error } = await supabase.functions.invoke("randevu-teklif", {
        body: { action: "oner", case_id: caseRow.id, party_id: pid },
      });
      if (error) {
        setMesaj({ tip: "hata", metin: await hataMetni(error) });
        return;
      }
      const payload = govde(data);
      if (!payload) {
        setMesaj({ tip: "hata", metin: "Sunucudan boş yanıt geldi." });
        return;
      }
      if (payload.error === "musaitlik_yok") {
        setMesaj({ tip: "bilgi", metin: BOS_SAAT_MESAJI });
        return;
      }
      if (payload.error) {
        setMesaj({ tip: "hata", metin: String(payload.error) });
        return;
      }
      const list = Array.isArray(payload.secenekler) ? payload.secenekler : [];
      if (!list.length) {
        setMesaj({ tip: "bilgi", metin: BOS_SAAT_MESAJI });
        return;
      }
      setOnerilen(list.map((s: any) => ({ gun: String(s.gun ?? "").slice(0, 10), saat: String(s.saat ?? "").slice(0, 5) })));
      setMesaj({ tip: "bilgi", metin: `${list.length} saat önerildi — kontrol edin ve oluşturun.` });
    } catch (e: any) {
      setMesaj({ tip: "hata", metin: trErr(e?.message ?? "") || "Saat önerisi alınamadı." });
    } finally {
      setAsking(false);
    }
  }

  async function createOffer() {
    if (!partyId || !onerilen?.length || creating) return;
    setCreating(true);
    setMesaj(null);
    try {
      const { data, error } = await supabase.functions.invoke("randevu-teklif", {
        body: {
          action: "olustur",
          case_id: caseRow.id,
          party_id: partyId,
          // Oturum tipi/adres her seçenek girdisinin içine eklenir (mevcut jsonb alanı).
          secenekler: onerilen.map((s) => ({
            ...s,
            oturum_tipi: oturumTipi,
            ...(oturumTipi === "yuz_yuze" ? { adres: adres.trim() } : {}),
          })),
          app_url: window.location.origin,
        },
      });
      if (error) {
        setMesaj({ tip: "hata", metin: await hataMetni(error) });
        return;
      }
      const payload = govde(data);
      if (payload?.error === "musaitlik_yok") {
        setMesaj({ tip: "bilgi", metin: BOS_SAAT_MESAJI });
        return;
      }
      if (payload?.error) {
        setMesaj({ tip: "hata", metin: String(payload.error) });
        return;
      }
      const yeniLink = String(payload?.link ?? "");
      if (!yeniLink) {
        setMesaj({ tip: "hata", metin: "Teklif oluştu ama link dönmedi." });
        return;
      }
      setLink(yeniLink);
      setEditing(false);
      setMesaj({ tip: "bilgi", metin: "Randevu teklifi oluşturuldu — linki tarafa iletin." });
      toast({ title: "Randevu teklifi oluşturuldu" });
      void teklifleriYukle();
    } catch (e: any) {
      setMesaj({ tip: "hata", metin: trErr(e?.message ?? "") || "Teklif oluşturulamadı." });
    } finally {
      setCreating(false);
    }
  }

  function whatsappMessage(): string {
    const ad = party ? partyDisplay(party) : "Sayın taraf";
    const no = caseRow.application_no ? `${caseRow.application_no} numaralı ` : "";
    return `${ad}, ${no}arabuluculuk dosyasında toplantı saati öneriyoruz. Uygun saati seçmek için: ${link ?? ""}`;
  }

  function openWhatsapp() {
    if (!link) return;
    const phone = party ? getPartyPhone(party) : null;
    const text = encodeURIComponent(whatsappMessage());
    const url = phone
      ? `https://wa.me/${normalizePhoneForWhatsapp(phone)}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Link kopyalandı" });
    } catch {
      toast({ title: "Kopyalanamadı", description: "Linki elle seçip kopyalayın.", variant: "destructive" });
    }
  }

  return (
    <Card id={RANDEVU_KART_ID} className="p-6 space-y-3 scroll-mt-24">
      <div>
        <h3 className="text-lg font-semibold">Randevu ayarla</h3>
        <p className="text-sm text-muted-foreground">
          Saatleri sistem seçer: bireysel tarafa en yakın tek saat, kurumsal tarafa üç farklı günden birer saat.
          Taraf girişsiz bir sayfadan tek dokunuşla cevaplar.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px]">
          <Label className="text-xs">Taraf</Label>
          <Select value={partyId || undefined} onValueChange={(v) => { setPartyId(v); reset(); }}>
            <SelectTrigger><SelectValue placeholder="Taraf seçin" /></SelectTrigger>
            <SelectContent>
              {parties.map((p) => (
                <SelectItem key={p.id} value={p.id}>{partyDisplay(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => askAgent()} disabled={asking || !partyId}>
          {asking ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CalIcon className="h-4 w-4 mr-1" />}
          {asking ? "Hazırlanıyor…" : "Randevu ayarla"}
        </Button>
      </div>

      {mesaj && (
        <div
          className={
            "text-sm rounded border p-3 " +
            (mesaj.tip === "hata"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-amber-300 bg-amber-50 text-amber-900")
          }
        >
          {mesaj.metin}
        </div>
      )}

      {onerilen && !link && (
        <div className="space-y-2">
          <Label className="text-xs">Önerilen saatler</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {onerilen.map((s, i) => (
              <div key={i} className="border rounded p-3">
                {editing ? (
                  <div className="space-y-1">
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={s.gun}
                      onChange={(e) => setOnerilen((prev) =>
                        (prev ?? []).map((x, j) => (j === i ? { ...x, gun: e.target.value } : x)))}
                    />
                    <Input
                      type="time"
                      className="h-8 text-xs"
                      value={s.saat}
                      onChange={(e) => setOnerilen((prev) =>
                        (prev ?? []).map((x, j) => (j === i ? { ...x, saat: e.target.value } : x)))}
                    />
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-medium">
                      {s.gun ? new Date(`${s.gun}T00:00:00`).toLocaleDateString("tr-TR") : "—"}
                    </div>
                    <div className="text-sm text-muted-foreground">{s.saat}</div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[200px]">
              <Label className="text-xs">Görüşme biçimi</Label>
              <Select value={oturumTipi} onValueChange={(v: any) => setOturumTipi(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online görüşme</SelectItem>
                  <SelectItem value="yuz_yuze">Yüz yüze görüşme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {oturumTipi === "yuz_yuze" && (
              <div className="flex-1 min-w-[220px]">
                <Label className="text-xs">Görüşme adresi</Label>
                <Input value={adres} onChange={(e) => setAdres(e.target.value)} placeholder="Örn. Atatürk Cad. No:5, Kadıköy" />
              </div>
            )}
          </div>
          {oturumTipi === "yuz_yuze" && !adres.trim() && (
            <p className="text-sm text-amber-700">Adres girilmedi</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={createOffer} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Oluştur ve linki al
            </Button>
            <Button variant="outline" onClick={() => setEditing((o) => !o)} disabled={creating}>
              <Pencil className="h-4 w-4 mr-1" /> {editing ? "Düzenlemeyi bitir" : "Düzenle"}
            </Button>
          </div>
        </div>
      )}

      {link && (
        <div className="flex items-center gap-2 flex-wrap bg-muted/40 rounded p-2">
          <Input readOnly value={link} className="text-xs flex-1 min-w-[220px] h-8" onFocus={(e) => e.currentTarget.select()} />
          <Button size="sm" variant="outline" onClick={copyLink}>
            <Copy className="h-3 w-3 mr-1" /> Kopyala
          </Button>
          <Button size="sm" variant="outline" onClick={openWhatsapp}>
            <MessageSquare className="h-3 w-3 mr-1" /> WhatsApp'ta aç
          </Button>
        </div>
      )}

      <div className="border-t pt-3 space-y-2">
        <div className="text-sm font-medium">Bu dosyadaki randevu teklifleri</div>

        {teklifHata && (
          <div className="text-sm rounded border border-destructive/40 bg-destructive/10 text-destructive p-3">
            Teklif listesi okunamadı: {teklifHata}
          </div>
        )}

        {teklifYukleniyor ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : teklifler.length === 0 ? (
          !teklifHata && <p className="text-sm text-muted-foreground">Henüz randevu teklifi oluşturulmadı.</p>
        ) : (
          <div className="space-y-2">
            {teklifler.map((t) => {
              const secenekler = Array.isArray(t.secenekler) ? t.secenekler : [];
              const teklifLinki = `${window.location.origin}/randevu/${t.token}`;
              return (
                <div key={t.id} className="border rounded p-3 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{tarafAdi(t.party_id)}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleString("tr-TR")}
                    </span>
                  </div>
                  <div className="text-sm">
                    {secenekler.length
                      ? secenekler.map((s: any) => gunSaatMetni(s)).join(" · ")
                      : "Saat bilgisi yok"}
                  </div>
                  {oturumTipiMetni(secenekler) && (
                    <div className="text-sm">{oturumTipiMetni(secenekler)}</div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {durumMetni(t)}
                    {t.cevap_zamani && ` (${new Date(t.cevap_zamani).toLocaleString("tr-TR")})`}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      readOnly
                      value={teklifLinki}
                      className="text-xs flex-1 min-w-[220px] h-8"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button size="sm" variant="outline" onClick={() => metniKopyala(teklifLinki)}>
                      <Copy className="h-3 w-3 mr-1" /> Kopyala
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

// SessionScheduler needs case_parties for invite selection/presence — not lifted into
// MediationEngine state elsewhere, so fetch it here the same way Phase2Parties does.
// Faz 4 sol dizini: tek girdi — oturum hazırlık föyleri. Numaralandırma kalıbı
// FAZ1/FAZ3 ile aynıdır; katman girdisi olmadığı için etiket numarasız kalır.
const FAZ4_MENU_ENTRIES: { id: string; label: string; kind: "layer" | "section"; hint?: string }[] =
  numberMenuEntries([
    { id: "faz4-hazirlik-foyu", label: "Oturum hazırlık föyleri", kind: "section" },
  ]);

function Phase5Sessions({ caseRow, bumpPhase, onAdvance, randevuTetik, isMediator = false, jump }: {
  caseRow: CaseRow; bumpPhase: (n: number) => Promise<void>; onAdvance: (n: number) => void;
  randevuTetik?: { nonce: number } | null;
  // Kayıt protokolü kartı YALNIZ arabulucuya çizilir (kör veri: katılımcıların
  // onay/ret durumu tarafa hiçbir yüzeyden gösterilmez).
  isMediator?: boolean;
  // Sol menüden gelen "şu bölüme kay" isteği; nonce her tıklamada artar.
  jump?: { id: string; nonce: number } | null;
}) {
  const [parties, setParties] = useState<any[]>([]);
  const [sessions, setSessions] = useState<{ scheduled_at: string | null; status: string }[]>([]);
  const [navigating, setNavigating] = useState(false);
  useEffect(() => {
    supabase
      .from("case_parties")
      .select("id, user_id, party_role, first_name, last_name, company_name, email, gsm, phone")
      .eq("case_id", caseRow.id)
      .then(({ data }) => setParties(data ?? []));
  }, [caseRow.id]);
  useEffect(() => {
    supabase
      .from("case_sessions")
      .select("scheduled_at, status")
      .eq("case_id", caseRow.id)
      .order("scheduled_at", { ascending: true })
      .then(({ data }) => setSessions(data ?? []));
  }, [caseRow.id]);

  // Sol menüden gelen istek: bölüme kaydır. Faz 1/3 ile aynı kalıp; yalnız
  // "faz4-" ile başlayan istekler işlenir.
  useEffect(() => {
    if (!jump?.id || !jump.id.startsWith("faz4-")) return;
    const t = setTimeout(() => {
      document.getElementById(jump.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => clearTimeout(t);
  }, [jump?.id, jump?.nonce]);

  const plannedSessions = sessions.filter((s) => s.status !== "cancelled");
  const nextSession = plannedSessions.find((s) => s.scheduled_at && new Date(s.scheduled_at).getTime() > Date.now());
  // Şeritteki sayaç: GELECEKTEKİ planlı (scheduled) oturumlar. Önceden taslak/geçmiş
  // kayıtlar da sayıldığı için sayaç gerçek durumu göstermiyordu.
  const scheduledFutureSessions = sessions.filter(
    (s) => s.status === "scheduled" && s.scheduled_at && new Date(s.scheduled_at).getTime() > Date.now()
  );

  async function chooseMeeting(meetingType: "ozel" | "ortak") {
    setNavigating(true);
    try {
      // Pre-create a placeholder session with the chosen meeting_type (user can edit below)
      // supabase-js hata FIRLATMAZ; `error` okunmazsa aşağıdaki catch hiç çalışmaz
      // ve taslak oturum yazılmadan aşama ilerlerdi.
      const { error: oturumErr } = await supabase.from("case_sessions").insert({
        case_id: caseRow.id, session_type: "joint", meeting_type: meetingType, status: "draft",
      } as any).select().maybeSingle();
      if (oturumErr) {
        toast({ title: "Oturum taslağı oluşturulamadı", description: trErr(oturumErr.message), variant: "destructive" });
        return;
      }
      await bumpPhase(4);
      onAdvance(5);
    } catch (e: any) {
      toast({ title: "Geçiş hatası", description: trErr(e.message), variant: "destructive" });
    } finally { setNavigating(false); }
  }

  return (
    <div className="space-y-4">
      <PhaseHero
        label="AŞAMA 4 — OTURUMLAR"
        metrics={[
          { label: "Sıradaki Oturum", value: nextSession?.scheduled_at ? formatPhaseCountdown(nextSession.scheduled_at) : null },
          { label: "Planlanan Oturum", value: scheduledFutureSessions.length },
        ]}
      />
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      {/* Oturum hazırlık föyleri — oturum bu aşamada planlandığı için föy de burada
          hazırlanır. Kokpitteki (Aşama 3) kopya YERİNDE DURUYOR; bu ek bir giriştir.
          Yalnız arabulucu görür. */}
      {isMediator && (
        <motion.div variants={itemVariants}>
          <Card id="faz4-hazirlik-foyu" className="p-6 space-y-3 scroll-mt-24">
            <div>
              <h3 className="text-lg font-semibold">Oturum hazırlık föyleri</h3>
            </div>
            <HazirlikFoyuPanel caseRow={caseRow} />
          </Card>
        </motion.div>
      )}
      <motion.div variants={itemVariants}>
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
      </motion.div>
      <motion.div variants={itemVariants}>
        <RandevuTeklifKarti caseRow={caseRow} parties={parties} tetik={randevuTetik} />
      </motion.div>
      {isMediator && (
        <motion.div variants={itemVariants}>
          <KayitProtokoluKarti caseRow={caseRow} />
        </motion.div>
      )}
      <motion.div variants={itemVariants}>
        <SessionScheduler
          caseId={caseRow.id}
          niche={caseRow.dispute_type ?? ""}
          context={caseRow.title ?? ""}
          parties={parties}
          mediatorId={caseRow.assigned_mediator_id}
        />
      </motion.div>
    </motion.div>
    </div>
  );
}

/* ============ KAYIT PROTOKOLÜ (İBA 1.8 / B18) — yalnız arabulucu ============
   Bu kart kayıt ALMAZ; yalnız iznin durumunu gösterir (kayıt/döküm hattı ayrı
   iştir). Dört kural ekranda birebir uygulanır:
   · 48 SAAT: onay formu açıldıktan 48 saat geçmeden kayıt açılamaz.
   · OYBİRLİĞİ: her katılımcı (taraf · vekil · varsa uzman) ayrı ayrı onaylar;
     bir kişi bile onay vermezse kapı açılmaz. Onay ve retler kayda geçer.
   · TEK KAPI: harici araçla kayıt yasağı ekranda yazılı durur.
   · SİLME: ses 24 saat sonra, döküm süreç sonunda silinir (nöbetçi ajanın işi).
   Vekil ve uzmanın uygulamada girişi olmadığı için onayları arabulucu ELLE
   kaydeder; dayanağı (nasıl alındığı) zorunlu alandır — kayıtsız onay yazılmaz.
   Not (constitution m.11): ekran metninde dış ürün adı kullanılmaz; yasak,
   araç adı verilmeden tarif edilir. */
// Kayıt protokolü sabitleri src/lib/kayitProtokolu.ts'te — iki ekranın tek kaynağı.

type KayitKatilimci = {
  anahtar: string;
  tip: "taraf" | "vekil" | "uzman";
  ad: string;
  partyId: string | null;
  elle: boolean; // true: girişi olmadığı için onayını arabulucu kaydeder
};

function kayitZaman(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

function kalanSureMetni(hedefMs: number, simdiMs: number): string {
  const fark = hedefMs - simdiMs;
  if (fark <= 0) return `${KAYIT_ONAY_SAAT} saat doldu`;
  const saat = Math.floor(fark / 3600000);
  const dakika = Math.floor((fark % 3600000) / 60000);
  return `Kalan süre: ${saat} saat ${dakika} dakika`;
}

function KayitProtokoluKarti({ caseRow }: { caseRow: CaseRow }) {
  const [talep, setTalep] = useState<any | null>(null);
  const [onaylar, setOnaylar] = useState<any[]>([]);
  const [katilimcilar, setKatilimcilar] = useState<KayitKatilimci[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [dayanak, setDayanak] = useState("");
  const [simdi, setSimdi] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setSimdi(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  async function yukle() {
    setHata(null);
    const [t, p, e] = await Promise.all([
      (supabase.from("kayit_onay_talepleri" as any) as any)
        .select("id, gonderim_zamani, metin_surumu")
        .eq("case_id", caseRow.id).is("iptal_zamani", null)
        .order("gonderim_zamani", { ascending: false }).limit(1),
      supabase.from("case_parties")
        .select("id, party_type, first_name, last_name, company_name, full_name, vekil_ad_soyad, party_role")
        .eq("case_id", caseRow.id),
      supabase.from("case_expert_assignments")
        .select("id, status, experts:expert_id(full_name)")
        .eq("case_id", caseRow.id),
    ]);

    if (t.error) { setHata(`Kayıt onay durumu okunamadı: ${t.error.message}`); setYukleniyor(false); return; }
    const talepRow = Array.isArray(t.data) && t.data.length > 0 ? t.data[0] : null;
    setTalep(talepRow);

    const liste: KayitKatilimci[] = [];
    for (const taraf of ((p.data ?? []) as any[])) {
      liste.push({
        anahtar: `taraf:${taraf.id}`, tip: "taraf", partyId: taraf.id, elle: false,
        ad: `${partyDisplay(taraf)} (${roleLabel(taraf.party_role)})`,
      });
      const vekil = String(taraf.vekil_ad_soyad ?? "").trim();
      if (vekil) {
        liste.push({
          anahtar: `vekil:${taraf.id}`, tip: "vekil", partyId: taraf.id, elle: true,
          ad: `${vekil} — ${partyDisplay(taraf)} vekili`,
        });
      }
    }
    for (const atama of ((e.data ?? []) as any[])) {
      if (["rejected", "cancelled", "removed"].includes(String(atama.status ?? ""))) continue;
      const ad = (atama as any).experts?.full_name ?? "Dosyaya atanmış uzman";
      liste.push({ anahtar: `uzman:${atama.id}`, tip: "uzman", partyId: null, elle: true, ad: `${ad} — uzman` });
    }
    if (p.error) setHata(`Taraflar okunamadı: ${p.error.message}`);
    setKatilimcilar(liste);

    if (talepRow) {
      const { data: k, error: kErr } = await (supabase.from("kayit_onaylari" as any) as any)
        .select("id, katilimci_anahtari, katilimci_tipi, durum, karar_zamani, dayanak")
        .eq("talep_id", talepRow.id);
      if (kErr) setHata(`Onaylar okunamadı: ${kErr.message}`);
      else setOnaylar((k ?? []) as any[]);
    } else {
      setOnaylar([]);
    }
    setYukleniyor(false);
  }

  useEffect(() => {
    setYukleniyor(true);
    yukle();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [caseRow.id]);

  async function formuAc() {
    if (busy) return;
    setBusy("form");
    setHata(null);
    const { error } = await (supabase.from("kayit_onay_talepleri" as any) as any).insert({
      case_id: caseRow.id,
      gonderim_zamani: new Date().toISOString(),
      metin_surumu: KAYIT_ONAY_SURUMU,
    });
    if (error) setHata(`Onay formu açılamadı: ${error.message}`);
    else { toast({ title: "Onay formu açıldı", description: `${KAYIT_ONAY_SAAT} saatlik süre başladı.` }); await yukle(); }
    setBusy(null);
  }

  async function elleKaydet(k: KayitKatilimci, durum: "onay" | "ret") {
    if (!talep?.id || busy) return;
    if (dayanak.trim().length < 3) { setHata("Önce yazılı onayın dayanağını yazın (ör. imzalı form, e-posta)."); return; }
    setBusy(k.anahtar);
    setHata(null);
    const { error } = await (supabase.from("kayit_onaylari" as any) as any).upsert({
      case_id: caseRow.id,
      talep_id: talep.id,
      party_id: k.partyId,
      katilimci_tipi: k.tip,
      katilimci_anahtari: k.anahtar,
      katilimci_adi: k.ad,
      durum,
      karar_zamani: new Date().toISOString(),
      metin_surumu: KAYIT_ONAY_SURUMU,
      dayanak: dayanak.trim(),
    }, { onConflict: "talep_id,katilimci_anahtari" });
    if (error) setHata(`Kaydedilemedi: ${error.message}`);
    else await yukle();
    setBusy(null);
  }

  const kararMap = new Map<string, any>(onaylar.map((o) => [o.katilimci_anahtari, o]));
  const onayVeren = katilimcilar.filter((k) => kararMap.get(k.anahtar)?.durum === "onay").length;
  const retVeren = katilimcilar.filter((k) => kararMap.get(k.anahtar)?.durum === "ret").length;
  const bekleyen = katilimcilar.length - onayVeren - retVeren;
  const hedefMs = talep?.gonderim_zamani
    ? new Date(talep.gonderim_zamani).getTime() + KAYIT_ONAY_SAAT * 3600000
    : null;
  const sureDoldu = hedefMs !== null && simdi >= hedefMs;
  const acilabilir = !!talep && sureDoldu && katilimcilar.length > 0 && onayVeren === katilimcilar.length;
  const engeller: string[] = [];
  if (!talep) engeller.push("onay formu henüz açılmadı");
  if (talep && !sureDoldu) engeller.push(`${KAYIT_ONAY_SAAT} saatlik süre dolmadı`);
  if (katilimcilar.length === 0) engeller.push("dosyada katılımcı kaydı yok");
  if (retVeren > 0) engeller.push(`${retVeren} katılımcı onay vermedi`);
  if (bekleyen > 0) engeller.push(`${bekleyen} katılımcı henüz cevap vermedi`);

  return (
    <Card className="p-6 space-y-4" id="faz4-kayit-protokolu">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold">Kayıt protokolü</h3>
          <p className="text-xs text-muted-foreground">
            Oturum kaydı ancak tüm katılımcıların yazılı onayıyla ve onay formunun açılmasından {KAYIT_ONAY_SAAT} saat sonrası için planlanabilir.
          </p>
        </div>
        {talep && (
          <Badge variant="outline">
            {onayVeren} onay · {retVeren} ret · {bekleyen} bekliyor
          </Badge>
        )}
      </div>

      <div className="text-xs rounded border bg-muted/40 p-3">{KAYIT_TEK_KAPI_UYARISI}</div>

      {hata && (
        <div className="text-sm rounded border border-destructive/40 bg-destructive/10 text-destructive p-3">{hata}</div>
      )}

      {yukleniyor ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : !talep ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Onay formu açılmadı. Form açıldığında taraf ekranında kayıt onay kartı görünür ve {KAYIT_ONAY_SAAT} saatlik süre başlar.
          </p>
          <Button onClick={formuAc} disabled={busy === "form"}>
            {busy === "form" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Onay formunu aç ve süreyi başlat
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Form açılışı:</span> {kayitZaman(talep.gonderim_zamani)} ·{" "}
            <span className={sureDoldu ? "text-emerald-600" : "text-amber-600"}>
              {kalanSureMetni(hedefMs ?? 0, simdi)}
            </span>
          </div>

          <div className="divide-y rounded border">
            {katilimcilar.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">Dosyada kayıtlı katılımcı yok.</p>
            ) : katilimcilar.map((k) => {
              const karar = kararMap.get(k.anahtar);
              return (
                <div key={k.anahtar} className="flex items-center justify-between gap-3 p-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{k.ad}</div>
                    <div className="text-xs text-muted-foreground">
                      {karar
                        ? `${karar.durum === "onay" ? "Onay verdi" : "Onay vermedi"} · ${kayitZaman(karar.karar_zamani)}${karar.dayanak ? ` · ${karar.dayanak}` : ""}`
                        : k.elle ? "Bekliyor — onayı arabulucu kaydeder" : "Bekliyor — kendi ekranından cevaplayacak"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {karar?.durum === "onay" ? (
                      <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Onay</Badge>
                    ) : karar?.durum === "ret" ? (
                      <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Ret</Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1"><Circle className="h-3 w-3" /> Bekliyor</Badge>
                    )}
                    {k.elle && (
                      <>
                        <Button size="sm" variant="outline" disabled={busy === k.anahtar} onClick={() => elleKaydet(k, "onay")}>
                          Onay geldi
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busy === k.anahtar} onClick={() => elleKaydet(k, "ret")}>
                          Onay yok
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {katilimcilar.some((k) => k.elle) && (
            <div className="space-y-1">
              <Label className="text-xs">Elle kaydedilen onayın dayanağı (zorunlu)</Label>
              <Input
                value={dayanak}
                onChange={(ev) => setDayanak(ev.target.value)}
                placeholder="ör. 12.08 tarihli imzalı onay formu / e-posta"
              />
              <p className="text-xs text-muted-foreground">
                Vekil ve uzmanın uygulamada girişi olmadığı için onayları buradan kaydedilir; dayanak tutanağa geçer.
              </p>
            </div>
          )}

          <div className={`text-sm rounded border p-3 ${acilabilir ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"}`}>
            {acilabilir
              ? `Kayıt açılabilir: tüm katılımcılar onay verdi ve ${KAYIT_ONAY_SAAT} saatlik süre doldu.`
              : `Kayıt açılamaz — ${engeller.join(" · ")}.`}
          </div>
          <p className="text-xs text-muted-foreground">
            Kayıt alma ve döküm hattı ayrı iştir; bu ekranda yalnız izin durumu tutulur. Ses kaydı süreç bitiminden
            24 saat sonra, döküm süreç sonunda nöbetçi ajanın turunda kalıcı olarak silinir.
          </p>
        </div>
      )}
    </Card>
  );
}

/* ===================== AŞAMA 1 — DOSYA KURULUMU (TEK GİRİŞ KAPISI) ===================== */

// 14.08: Dosya kurulumunun tamamı tek ekranda toplandı — uyuşmazlık konusu ve türü,
// dava şartı mı ihtiyari mi seçimi ve yasal süre, TARAFLAR (eski Aşama 2'nin bloğu
// aynen) ve BELGELER (dosya bazında yükleme). Sayfa düzeni Aşama 4'ü örnek alır:
// solda ve sağda ANA KATMANLAR (büyük harf), altlarında alt katmanlar (normal
// yazım). Mobilde tek sütuna iner; kart ve düğme stilleri değişmedi.
function Phase1Setup({ caseRow, reload, isMediator, userId, jump }: {
  caseRow: CaseRow; reload: () => void; isMediator: boolean; userId: string;
  // Sol menüden gelen "şu katmanı aç ve oraya kay" isteği; nonce her tıklamada artar.
  jump?: { id: string; nonce: number } | null;
}) {
  const { user, isAdmin } = useAuth();
  const canEditIssue = caseRow.assigned_mediator_id === user?.id || caseRow.user_id === user?.id || isAdmin;
  // Alan dolu mu — öneri kutusu her iki hâlde de görünür (tür tespiti kutusuyla aynı
  // davranış); yalnız düğme etiketi ve "yerine geçer" uyarısı buna göre değişir.
  const issueDolu = !!String(caseRow.issue_description ?? "").trim();
  const [editIssueOpen, setEditIssueOpen] = useState(false);
  const [issueDescDraft, setIssueDescDraft] = useState("");
  const [savingIssue, setSavingIssue] = useState(false);
  // Uyuşmazlık konusu AI ÖNERİSİ — hiçbir yere yazılmaz, yalnız ekranda durur.
  // Kaydetme kararı arabulucunundur; elle girilmiş metin varsa öneri hiç istenmez.
  const [ozetOneri, setOzetOneri] = useState<{ ozet: string; dayanak: string[] } | null>(null);
  const [ozetBusy, setOzetBusy] = useState(false);
  // ozetDurum = bilgi satırı (öneri üretilmedi/veri yok) · ozetHata = KIRMIZI hata satırı
  const [ozetDurum, setOzetDurum] = useState<string | null>(null);
  const [ozetHata, setOzetHata] = useState<string | null>(null);

  // Ana katmanlar açık gelir (dosya kurulumu tek oturuşta yapılır); alt bölümlerin
  // hepsi de açık — bu ekranda gizlenecek uzun analiz çıktısı yok.
  const [openLayers, setOpenLayers] = useState<Set<string>>(() => new Set(FAZ1_LAYERS.map((l) => l.id)));
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(FAZ1_SECTION_IDS));
  const toggleLayer = useCallback((id: string) => {
    setOpenLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const [parties, setParties] = useState<any[]>([]);
  const [docCount, setDocCount] = useState(0);

  const loadParties = useCallback(async () => {
    const { data } = await supabase
      .from("case_parties")
      .select("id, full_name, company_name, first_name, last_name, party_type, party_role")
      .eq("case_id", caseRow.id)
      .order("created_at");
    setParties(Array.isArray(data) ? data : []);
  }, [caseRow.id]);

  useEffect(() => { loadParties(); }, [loadParties]);

  // Sol menüden gelen istek: katmanı (gerekirse bölümü de) aç, sonra oraya kaydır.
  // Faz 3/4 ile aynı kalıp; yalnız "faz1-" ile başlayan istekler işlenir.
  useEffect(() => {
    if (!jump?.id || !jump.id.startsWith("faz1-")) return;
    if (jump.id.startsWith("faz1-katman-")) {
      setOpenLayers((prev) => (prev.has(jump.id) ? prev : new Set(prev).add(jump.id)));
    } else {
      const layerId = FAZ1_SECTION_LAYER[jump.id];
      if (layerId) setOpenLayers((prev) => (prev.has(layerId) ? prev : new Set(prev).add(layerId)));
      setOpenSections((prev) => (prev.has(jump.id) ? prev : new Set(prev).add(jump.id)));
    }
    const t = setTimeout(() => {
      document.getElementById(jump.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => clearTimeout(t);
  }, [jump?.id, jump?.nonce]);

  function openEditIssue() {
    setIssueDescDraft(caseRow.issue_description ?? "");
    setEditIssueOpen(true);
  }

  // functions.invoke hatası SESSİZ DÜŞMESİN: FunctionsHttpError'ın .message'ı hep
  // "non-2xx status code" der; gerçek sebep .context gövdesindedir (lessons.md, 13.08).
  async function invokeHataMetni(e: any): Promise<string> {
    const ctx = e?.context;
    if (ctx && typeof ctx.text === "function") {
      try {
        const govde = await ctx.text();
        if (govde) {
          try {
            const j = JSON.parse(govde);
            const m = j?.error ?? j?.message ?? j?.detay;
            if (m) return `${String(m)}${j?.detay && j?.error ? ` — ${String(j.detay)}` : ""}`;
          } catch { /* JSON değilse düz metin kullanılır */ }
          return String(govde).slice(0, 400);
        }
      } catch { /* gövde okunamadıysa mesaja düşülür */ }
      if (ctx.status) return `HTTP ${ctx.status}`;
    }
    return String(e?.message ?? "bilinmeyen hata");
  }

  // Öneriyi üretir. Kaynak sınırı fonksiyonun kendisinde: yalnız başlık, başvuru
  // alanları ve belge ADI+TÜRÜ. Taraf analizleri / belge içeriği okunmaz.
  async function ozetOneriGetir() {
    setOzetBusy(true);
    setOzetDurum(null);
    setOzetHata(null);
    setOzetOneri(null);
    try {
      // Alan doluyken de öneri istenebilir; fonksiyon yine hiçbir yere yazmaz.
      const { data, error } = await supabase.functions.invoke("dosya-ozeti-oner", {
        body: { case_id: caseRow.id, yenile: !!String(caseRow.issue_description ?? "").trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error(String((data as any).error));
      if ((data as any)?.atlandi) {
        setOzetDurum(String((data as any).sebep ?? "Öneri üretilmedi"));
        return;
      }
      const ozet = String((data as any)?.ozet ?? "").trim();
      if (!ozet) { setOzetDurum("Yeterli veri yok — metni elle yazın."); return; }
      setOzetOneri({
        ozet,
        dayanak: Array.isArray((data as any)?.dayanak) ? (data as any).dayanak.map(String) : [],
      });
    } catch (e: any) {
      const ham = await invokeHataMetni(e);
      console.error("[dosya-ozeti-oner] çağrı başarısız", ham, e);
      setOzetHata(`dosya-ozeti-oner çağrısı başarısız: ${trErr(ham)}`);
    } finally {
      setOzetBusy(false);
    }
  }

  async function ozetOneriKaydet() {
    if (!ozetOneri) return;
    await saveIssueDescription(ozetOneri.ozet);
    setOzetOneri(null);
    setOzetDurum(null);
  }

  async function saveIssueDescription(metin?: string) {
    setSavingIssue(true);
    try {
      const previous = caseRow.issue_description ?? "";
      const next = metin !== undefined ? metin : issueDescDraft;
      const changed = previous.trim() !== next.trim();
      const { error } = await supabase.from("cases").update({ issue_description: next || null }).eq("id", caseRow.id);
      if (error) throw error;
      // NOT: party_analyses / common_ground_reports / party_root_cause_analysis kasıtlı olarak
      // dokunulmuyor — kök neden ve önceki analizler kaybolmasın diye. Bunlar sadece "Tüm Analizi
      // Başlat" yeniden çalıştırılınca güncellenir.
      reload();
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
      toast({ title: "Kaydedilemedi", description: trErr(e.message), variant: "destructive" });
    } finally {
      setSavingIssue(false);
    }
  }

  const classified = !!caseRow.dispute_type;
  const sureEtiketi = caseRow.mediation_type === "dava_sarti"
    ? "Dava şartı"
    : caseRow.mediation_type === "ihtiyari" ? "İhtiyari" : null;
  const bitis = caseRow.extension_used && caseRow.deadline_extended ? caseRow.deadline_extended : caseRow.deadline_total;
  const kalanGun = bitis ? Math.ceil((new Date(bitis).getTime() - Date.now()) / 86400000) : null;

  const statusStripItems: { label: string; value: string }[] = [
    { label: "Sistem No", value: caseRow.application_no || "—" },
    { label: "Uyuşmazlık Türü", value: classified ? anaAltLabel(caseRow.dispute_type, caseRow.dispute_subtype) : "Bekliyor" },
    { label: "Süreç Türü", value: sureEtiketi ?? "Seçilmedi" },
    { label: "Başvuru Tarihi", value: new Date(caseRow.application_date ?? caseRow.created_at).toLocaleDateString("tr-TR") },
  ];

  const layerCounts: Record<string, string> = {
    "faz1-katman-ozet": "2 bölüm",
    "faz1-katman-sure": sureEtiketi ?? "seçilmedi",
    "faz1-katman-taraflar": `${parties.length} taraf`,
    "faz1-katman-belgeler": `${docCount} belge`,
  };

  return (
    <div className="space-y-4">
      <PhaseHero
        label="AŞAMA 1 — DOSYA KURULUMU"
        metrics={[
          { label: "Taraf", value: parties.length },
          { label: "Belge", value: docCount },
          { label: "Kalan Süre", value: kalanGun == null ? null : kalanGun, suffix: kalanGun == null ? "" : " gün",
            tone: kalanGun == null ? undefined : kalanGun < 3 ? "high" : kalanGun < 7 ? "medium" : "low" },
        ]}
      />
      <Card className="p-6 space-y-4">
        {/* Aşama başlığı üst şeritte (PhaseHero); burada tekrarlanmaz. */}
        <p className="text-sm text-muted-foreground">
          Dosya kurulumunun tamamı bu ekrandadır: uyuşmazlık konusu ve türü, sürecin dava
          şartı mı ihtiyari mi olduğu ve yasal süresi, taraflar ve belgeler. Ajan, belge
          ve taraf girildiği anda çalışabilir.
        </p>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
          {/* ── DURUM ŞERİDİ — katlanmaz ── */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statusStripItems.map((m, i) => (
              <div key={i} className="min-w-0">
                <div className="text-sm text-muted-foreground truncate">{m.label}</div>
                <div className="text-sm font-semibold truncate">{m.value}</div>
              </div>
            ))}
          </motion.div>

          {/* ── ANA KATMANLAR — tek sütun, sol menüdeki numara sırasıyla alt alta:
                 1. DOSYA ÖZETİ → 2. SÜREÇ TÜRÜ VE SÜRE → 3. TARAFLAR → 4. BELGELER.
                 İki sütunlu ızgara kaldırıldı; katmanların içeriği ve davranışı aynı. ── */}
          <div className="space-y-4">
              <Phase3Layer
                layer={FAZ1_LAYERS[0]}
                count={layerCounts["faz1-katman-ozet"]}
                boxClass={FAZ1_LAYER_BOX}
                open={openLayers.has("faz1-katman-ozet")}
                onToggle={() => toggleLayer("faz1-katman-ozet")}
              >
                <CockpitCollapsible
                  id="faz1-uyusmazlik-konusu"
                  title="Uyuşmazlık konusu"
                  open={openSections.has("faz1-uyusmazlik-konusu")}
                  onToggle={() => toggleSection("faz1-uyusmazlik-konusu")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm whitespace-pre-wrap flex-1 min-w-0">
                      {caseRow.issue_description || <span className="text-muted-foreground italic">Girilmemiş.</span>}
                    </p>
                    {canEditIssue && (
                      <Button variant="ghost" size="sm" className="shrink-0" onClick={openEditIssue}>
                        <Pencil className="h-4 w-4 mr-1" /> Düzenle
                      </Button>
                    )}
                  </div>
                  {/* AI ÖNERİSİ — yalnız alan BOŞKEN ve yalnız düzenleme yetkisi olana.
                      Öneri hiçbir yere yazılmaz; "Onayla ve kaydet" ile arabulucu yazar. */}
                  {canEditIssue && (
                    <div className="mt-3 rounded-lg border border-dashed p-3 space-y-2">
                      {/* Düğmenin yeri/boyutu/ikonu "Uyuşmazlık tür tespiti" kutusuyla
                          aynı kalıptadır (satır içi başlık + sağda size="sm" outline). */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="text-sm font-semibold text-primary">AI önerisi</div>
                        {!ozetOneri && (
                          <Button size="sm" variant="outline" className={KART_DUGME} onClick={ozetOneriGetir} disabled={ozetBusy}>
                            {ozetBusy
                              ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Hazırlanıyor…</>
                              : <><Sparkles className="h-4 w-4 mr-1" /> {issueDolu ? "Yeni öneri getir" : "Öneri getir"}</>}
                          </Button>
                        )}
                      </div>
                      {!ozetOneri && <UcretliIsaret />}
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Öneri yalnız dosya başlığı, başvuru/talep alanları ve yüklü belgelerin adı ile
                        türünden üretilir; taraf analizleri ve belge içerikleri kullanılmaz. Metin
                        onaylanmadan hiçbir yere kaydedilmez.
                      </p>
                      {ozetOneri && (
                        <div className="space-y-2">
                          <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded-md p-2">{ozetOneri.ozet}</p>
                          {ozetOneri.dayanak.length > 0 && (
                            <div className="text-[11px] text-muted-foreground">
                              Dayanak: {ozetOneri.dayanak.join(" · ")}
                            </div>
                          )}
                          {issueDolu && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400">
                              Onaylarsanız mevcut metnin yerine geçer.
                            </p>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" className="h-7 text-xs" onClick={ozetOneriKaydet} disabled={savingIssue}>
                              {savingIssue ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                              Onayla ve kaydet
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs"
                              onClick={() => { setIssueDescDraft(ozetOneri.ozet); setEditIssueOpen(true); }}
                              disabled={savingIssue}>
                              Düzenleyerek kaydet
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs"
                              onClick={() => { setOzetOneri(null); setOzetDurum(null); setOzetHata(null); }} disabled={savingIssue}>
                              Vazgeç
                            </Button>
                          </div>
                        </div>
                      )}
                      {ozetDurum && <p className="text-[11px] text-amber-600 dark:text-amber-400">{ozetDurum}</p>}
                      {/* Hata SESSİZ DÜŞMEZ: kırmızı, kalıcı, fonksiyon adı + gerçek mesajla. */}
                      {ozetHata && (
                        <p className="text-xs text-destructive flex items-start gap-1.5 break-words">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>{ozetHata}</span>
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-3">
                    Başlık: {caseRow.title || "—"} · Durum: {caseRow.status ?? "—"} · UYAP Kayıt No:{" "}
                    {caseRow.uyap_no || "henüz kaydedilmedi"} (Aşama 3 — Arabulucu Paneli'nden eklenir).
                  </p>
                </CockpitCollapsible>
                <CockpitCollapsible
                  id="faz1-tur-tespiti"
                  title="Uyuşmazlık tür tespiti"
                  open={openSections.has("faz1-tur-tespiti")}
                  onToggle={() => toggleSection("faz1-tur-tespiti")}
                >
                  {/* Ana tür + alt uzmanlık menüleri ve AI önerisi düğmesi — bileşen aynen korunur. */}
                  <DisputeClassifierCard caseRow={caseRow} initialText={caseRow.title ?? ""} bare />
                </CockpitCollapsible>
              </Phase3Layer>

              <Phase3Layer
                layer={FAZ1_LAYERS[1]}
                count={layerCounts["faz1-katman-sure"]}
                boxClass={FAZ1_LAYER_BOX}
                open={openLayers.has("faz1-katman-sure")}
                onToggle={() => toggleLayer("faz1-katman-sure")}
              >
                <CockpitCollapsible
                  id="faz1-sure"
                  title="Dava şartı / ihtiyari ve yasal süre"
                  open={openSections.has("faz1-sure")}
                  onToggle={() => toggleSection("faz1-sure")}
                >
                  {/* Seçim ve süre göstergesi cases.mediation_type üzerinden yürür — mevcut kart aynen. */}
                  <DeadlineCard caseRow={caseRow} bare />
                </CockpitCollapsible>
              </Phase3Layer>

              <Phase3Layer
                layer={FAZ1_LAYERS[2]}
                count={layerCounts["faz1-katman-taraflar"]}
                boxClass={FAZ1_LAYER_BOX}
                open={openLayers.has("faz1-katman-taraflar")}
                onToggle={() => toggleLayer("faz1-katman-taraflar")}
              >
                <CockpitCollapsible
                  id="faz1-taraf-listesi"
                  title="Taraf ekleme, düzenleme ve davet"
                  open={openSections.has("faz1-taraf-listesi")}
                  onToggle={() => toggleSection("faz1-taraf-listesi")}
                >
                  {/* Eski Aşama 2'nin bloğu birebir taşındı; hiçbir işlev kaldırılmadı. */}
                  <Phase2Parties
                    caseRow={caseRow}
                    isMediator={isMediator}
                    userId={userId}
                    bare
                    onChanged={loadParties}
                  />
                </CockpitCollapsible>
              </Phase3Layer>

              <Phase3Layer
                layer={FAZ1_LAYERS[3]}
                count={layerCounts["faz1-katman-belgeler"]}
                boxClass={FAZ1_LAYER_BOX}
                open={openLayers.has("faz1-katman-belgeler")}
                onToggle={() => toggleLayer("faz1-katman-belgeler")}
              >
                <Faz1Belgeler
                  caseRow={caseRow}
                  userId={userId}
                  parties={parties}
                  openSections={openSections}
                  onToggleSection={toggleSection}
                  onCountChange={setDocCount}
                />
              </Phase3Layer>

              {/* KONTROL TERCİHİ — 20.08 eklendi. Mevcut katmanların SONUNA
                  geldi; hiçbir bölüm silinmedi, taşınmadı, adlandırılmadı. */}
              <div className={FAZ1_LAYER_BOX}>
                <CockpitCollapsible
                  id="faz1-kontrol-tercihi"
                  title="Ajan hangi adımlarda önce size sorsun?"
                  open={openSections.has("faz1-kontrol-tercihi")}
                  onToggle={() => toggleSection("faz1-kontrol-tercihi")}
                >
                  <KontrolTercihiKarti caseRow={caseRow} userId={userId} />
                </CockpitCollapsible>
              </div>
          </div>
        </motion.div>
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
            <Button onClick={() => saveIssueDescription()} disabled={savingIssue}>
              {savingIssue ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Kaydediliyor…</> : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ====== C1·C2·C3 — KAPANIŞ KONTROLÜ, PAKET, VERİ SİLME ====================
   C1 KONTROL TURU: ajan sorar, arabulucu eksik yazarsa talimat kuyruğuna gider
   ve eksik kapanmadan kapanış ilerlemez.
   C2 PAKET: onaylı belgeler (UDF + metin), görüşme notları, oturum listesi,
   kalem dökümü ve süreç özeti TEK ZIP. Mevcut ZIP mantığı (JSZip + UDF'nin
   zip-içinde-zip sarımı) kullanılır; belge ÜRETİM hattına dokunulmaz.
   UYAP: OTOMATİK YÜKLEME YAPILMAZ. Gerekçe: yükleme arabulucunun kendi portal
   oturumuyla yapılır; ürün şifre, oturum ya da e-imza TAŞIMAZ.
   C3 SİLME: iki onay, geri alınamaz, kendiliğinden ASLA çalışmaz. */
const UYAP_REHBERI = [
  "Arabulucu Portal > Dosyalarım",
  "dosyayı Görüntüle > Evrak Ekle",
  'Evrak türü: "Son Tutanak"',
  "UDF dosyasını seç (paketteki .udf dosyası)",
  '"Arabuluculuk Sonucu" sekmesinde sonuç türü ve tarih',
  "Kaydet",
];

function KapanisPaketiKarti({ caseRow }: { caseRow: CaseRow }) {
  const [kayit, setKayit] = useState<any | null>(null);
  const [eksikMetni, setEksikMetni] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [silOnay, setSilOnay] = useState(false);
  const [silYazi, setSilYazi] = useState("");
  const [udfAdi, setUdfAdi] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    const { data } = await (supabase.from("dosya_kapanis" as any) as any)
      .select("kontrol_soruldu, eksik_notu, onay_verildi, onay_zamani, paket_alindi, paket_zamani, silme_zamani")
      .eq("case_id", caseRow.id).maybeSingle();
    setKayit(data ?? null);
  }, [caseRow.id]);

  useEffect(() => { yukle(); }, [yukle]);

  async function kapanisYaz(govde: Record<string, unknown>) {
    const { error } = await (supabase.from("dosya_kapanis" as any) as any).upsert({
      case_id: caseRow.id, ...govde,
    }, { onConflict: "case_id" });
    if (error) { setHata("Kapanış kaydı şu an yazılamadı."); return false; }
    setHata(null);
    await yukle();
    return true;
  }

  // C1 — eksik yazılırsa talimat kuyruğuna gider; ajan tamamlar, yeniden sorar.
  async function eksikGonder() {
    const t = eksikMetni.trim();
    if (!t) return;
    setBusy("eksik");
    const { data: oturum } = await supabase.auth.getUser();
    const { error } = await (supabase.from("arabulucu_talimatlari" as any) as any).insert({
      case_id: caseRow.id, hedef_adim: "taslak-denetim", talimat: t,
      durum: "bekliyor", veren: oturum?.user?.id ?? null,
    });
    if (error) setHata("Eksik notunuz şu an kaydedilemedi.");
    else {
      await kapanisYaz({ kontrol_soruldu: true, eksik_notu: t, onay_verildi: false });
      setEksikMetni("");
    }
    setBusy(null);
  }

  // C2 — TEK PAKET. Belge üretim hattına dokunulmaz; üretilmiş kayıtlar okunur.
  async function paketHazirla() {
    setBusy("paket");
    setHata(null);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const ad = caseRow.application_no || caseRow.id.slice(0, 8);

      const [belgeler, notlar, oturumlar, kalemler] = await Promise.all([
        supabase.from("agreement_documents").select("metadata, created_at").eq("case_id", caseRow.id),
        supabase.from("case_notes").select("content, created_at").eq("case_id", caseRow.id),
        supabase.from("case_sessions").select("scheduled_at, status, session_type").eq("case_id", caseRow.id),
        (supabase.from("taraf_kalemleri" as any) as any)
          .select("kalem_adi, tutar, para_birimi, durum").eq("case_id", caseRow.id),
      ]);

      let ilkUdf: string | null = null;
      for (const r of ((belgeler.data ?? []) as any[])) {
        const m = r?.metadata && typeof r.metadata === "object" ? r.metadata : {};
        const tur = String((m as any).template_type ?? (m as any).kind ?? "belge");
        const metin = String((m as any).filled_text ?? "");
        if (!metin) continue;
        zip.file(`belgeler/${tur}_${ad}.txt`, metin);
        const udfXml = String((m as any).udf_xml ?? "");
        if (udfXml) {
          // UDF, UYAP düzenleyicisinin tanıması için zip-içinde-zip sarılır.
          const ic = new JSZip();
          ic.file("content.xml", udfXml);
          ic.file("properties.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<properties><format>UDF</format><version>1.7</version></properties>`);
          const udfBlob = await ic.generateAsync({ type: "uint8array" });
          const udfAd = `${tur}_${ad}.udf`;
          zip.file(`belgeler/${udfAd}`, udfBlob);
          if (!ilkUdf) { ilkUdf = udfAd; setUdfAdi(udfAd); }
        }
      }

      const notMetni = ((notlar.data ?? []) as any[])
        .map((n) => `${String(n.created_at ?? "").slice(0, 10)} — ${String(n.content ?? "")}`).join("\n\n");
      if (notMetni) zip.file("gorusme_notlari.txt", notMetni);

      const oturumMetni = ((oturumlar.data ?? []) as any[])
        .map((o) => `${String(o.scheduled_at ?? "").slice(0, 16).replace("T", " ")} · ${String(o.session_type ?? "")} · ${String(o.status ?? "")}`)
        .join("\n");
      zip.file("oturum_listesi.txt", oturumMetni || "oturum kaydı yok");

      const kalemMetni = ((kalemler.data ?? []) as any[])
        .map((k) => `${String(k.kalem_adi ?? "")} · ${k.tutar ?? "tutar yok"} ${String(k.para_birimi ?? "")} · ${String(k.durum ?? "")}`)
        .join("\n");
      zip.file("kalem_dokumu.txt", kalemMetni || "kalem kaydı yok");

      zip.file("surec_ozeti.txt", [
        `Dosya: ${ad}`,
        `Durum: ${String(caseRow.status ?? "")}`,
        `Belge sayısı: ${((belgeler.data ?? []) as any[]).length}`,
        `Oturum sayısı: ${((oturumlar.data ?? []) as any[]).length}`,
        "",
        "UYAP'a yükleme (elle yapılır):",
        ...UYAP_REHBERI.map((x, i) => `${i + 1}. ${x}`),
        "",
        ilkUdf ? `Yüklenecek UDF dosyası: belgeler/${ilkUdf}` : "UDF dosyası bulunamadı; Belgeler sekmesinden üretebilirsiniz.",
      ].join("\n"));

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `kapanis_paketi_${ad}.zip`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e: any) {
      setHata("Paket şu an hazırlanamadı.");
    } finally {
      setBusy(null);
    }
  }

  // C3 — SİLME: iki onay. İkinci onayda arabulucu elle "SİL" yazar.
  async function verileriSil() {
    setBusy("sil");
    setHata(null);
    try {
      const { data, error } = await supabase.functions.invoke("dosya-verilerini-sil", {
        body: { case_id: caseRow.id, onay: silYazi },
      });
      if (error || (data as any)?.error) {
        setHata(String((data as any)?.error ?? "Silme tamamlanamadı; hiçbir kayıt yarım bırakılmadı."));
      } else {
        toast({ title: String((data as any)?.mesaj ?? "Veriler silindi.") });
        setSilOnay(false); setSilYazi("");
        await yukle();
      }
    } catch {
      setHata("Silme sırasında bir sorun çıktı; işlem durduruldu.");
    } finally {
      setBusy(null);
    }
  }

  const onayli = !!kayit?.onay_verildi;
  const paketAlindi = !!kayit?.paket_alindi;
  const silinmis = !!kayit?.silme_zamani;

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="font-semibold">Kapanış kontrolü, paket ve veri silme</h3>
        <p className="text-sm text-muted-foreground">
          Süreç tamamlandı. Eksik gördüğünüz bir şey var mı? Varsa yazın, tamamlayayım; yoksa onaylayın.
        </p>
      </div>

      {hata && <p className="text-sm text-muted-foreground">{hata}</p>}
      {silinmis && (
        <p className="text-sm">Bu dosyanın kişisel verileri silindi.</p>
      )}

      {!silinmis && !onayli && (
        <div className="space-y-2">
          <Textarea rows={3} value={eksikMetni} placeholder="Eksik gördüğünüz şeyi yazın (isteğe bağlı)"
            onChange={(e) => setEksikMetni(e.target.value)} />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" disabled={busy === "eksik" || !eksikMetni.trim()}
              onClick={eksikGonder}>
              {busy === "eksik" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Eksiği tamamlat
            </Button>
            <Button size="sm" disabled={!!busy}
              onClick={() => kapanisYaz({ kontrol_soruldu: true, onay_verildi: true, onay_zamani: new Date().toISOString() })}>
              Eksik yok, onaylıyorum
            </Button>
          </div>
        </div>
      )}

      {!silinmis && onayli && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={busy === "paket"} onClick={paketHazirla}>
              {busy === "paket" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
              Kapanış paketini indir
            </Button>
            {!paketAlindi && (
              <Button size="sm" variant="outline" disabled={!!busy}
                onClick={() => kapanisYaz({ paket_alindi: true, paket_zamani: new Date().toISOString() })}>
                Paketi aldım
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-0.5">
            <div className="font-medium">UYAP'a yükleme (elle yapılır):</div>
            <ol className="list-decimal pl-5 space-y-0.5">
              {UYAP_REHBERI.map((x) => <li key={x}>{x}</li>)}
            </ol>
            <p>
              UDF zorunludur{udfAdi ? `; paketteki dosya: ${udfAdi}` : "; paket indirildiğinde dosya adı burada yazılır"}.
              Yüklemeyi ürün yapmaz — kendi portal oturumunuzla siz yaparsınız.
            </p>
          </div>

          {paketAlindi && (
            <div className="border-t pt-3 space-y-2">
              {!silOnay ? (
                <Button size="sm" variant="outline" onClick={() => setSilOnay(true)}>
                  Verileri sil
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm">
                    Onayladığınız veriler silinecektir. Bu işlem geri alınamaz.
                  </p>
                  <Input value={silYazi} onChange={(e) => setSilYazi(e.target.value)}
                    placeholder='Onaylamak için SİL yazın' className="h-8 text-sm w-40" />
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="destructive"
                      disabled={busy === "sil" || silYazi.trim().toLocaleUpperCase("tr-TR") !== "SİL"}
                      onClick={verileriSil}>
                      {busy === "sil" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                      Sil
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setSilOnay(false); setSilYazi(""); }}>
                      Vazgeç
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Kişisel veri silinir; kişisel veri içermeyen sayımlar ve kural kütüphanesi kalır.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ====== B8: AJAN NE ÖĞRENDİ — yalnız arabulucu, sade dil ==================
   Sayımları gösterir: adım başına kaç koşum, kaç hata, hangi yol işe yaradı,
   hangi düzeltme türü kaç kez, hangi kurallar açık ve hangi sürümde.
   BU EKRAN KİŞİSEL VERİ GÖSTERMEZ: taraf adı, belge adı, tutar ve metin
   burada yoktur — yalnız adım adı, sayı ve tür vardır.
   "Sıfırla" arabulucunun KENDİ sayımlarını siler; kural kütüphanesinde silme
   değil GERİ ALMA vardır (kural metni değişmez, değişiklik yeni sürümdür). */
function OgrenmeKarti({ caseRow }: { caseRow: CaseRow }) {
  const [ozet, setOzet] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    const [dnyRes, dzlRes, krlRes] = await Promise.all([
      (supabase.from("ajan_deneyim" as any) as any)
        .select("adim, sonuc, hata_kodu, yol").eq("case_id", caseRow.id).limit(500),
      (supabase.from("duzeltme_kayitlari" as any) as any)
        .select("adim, duzeltme_turu").eq("case_id", caseRow.id).limit(300),
      (supabase.from("kural_kutuphanesi" as any) as any)
        .select("kod, baslik, surum, etkin, geri_alindi").limit(50),
    ]);
    if (dnyRes.error && dzlRes.error) { setHata("Öğrenme kayıtları şu an okunamıyor."); return; }

    const adimlar = new Map<string, { kosum: number; hata: number }>();
    const yollar = new Map<string, number>();
    const hatalar = new Map<string, number>();
    for (const r of ((dnyRes.data ?? []) as any[])) {
      const a = String(r.adim ?? "");
      const kayit = adimlar.get(a) ?? { kosum: 0, hata: 0 };
      kayit.kosum += 1;
      if (String(r.sonuc) === "hata") {
        kayit.hata += 1;
        const k = String(r.hata_kodu ?? "").trim();
        if (k) hatalar.set(k, (hatalar.get(k) ?? 0) + 1);
      } else if (String(r.sonuc) === "basarili" && r.yol) {
        const y = String(r.yol);
        yollar.set(y, (yollar.get(y) ?? 0) + 1);
      }
      adimlar.set(a, kayit);
    }
    const duzeltmeler = new Map<string, number>();
    for (const r of ((dzlRes.data ?? []) as any[])) {
      const k = `${String(r.duzeltme_turu ?? "")} — ${String(r.adim ?? "")}`;
      duzeltmeler.set(k, (duzeltmeler.get(k) ?? 0) + 1);
    }
    setOzet({
      adimlar: Array.from(adimlar.entries()),
      yollar: Array.from(yollar.entries()).sort((a, b) => b[1] - a[1]),
      hatalar: Array.from(hatalar.entries()).sort((a, b) => b[1] - a[1]),
      duzeltmeler: Array.from(duzeltmeler.entries()).sort((a, b) => b[1] - a[1]),
      kurallar: ((krlRes.data ?? []) as any[]),
    });
  }, [caseRow.id]);

  useEffect(() => { yukle(); }, [yukle]);

  async function sifirla() {
    setBusy(true);
    setHata(null);
    const d1 = await (supabase.from("ajan_deneyim" as any) as any).delete().eq("case_id", caseRow.id);
    const d2 = await (supabase.from("duzeltme_kayitlari" as any) as any).delete().eq("case_id", caseRow.id);
    if (d1.error || d2.error) setHata("Sayımlar şu an sıfırlanamadı.");
    else await yukle();
    setBusy(false);
  }

  if (!ozet) {
    return <p className="text-sm text-muted-foreground">{hata ?? "Ajan hazırlıyor."}</p>;
  }

  const satir = (baslik: string, liste: [string, any][], bos: string) => (
    <div className="space-y-1">
      <div className="text-sm font-medium">{baslik}</div>
      {liste.length === 0
        ? <p className="text-xs text-muted-foreground italic">{bos}</p>
        : (
          <ul className="text-sm space-y-0.5">
            {liste.slice(0, 8).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between gap-3 border-b py-0.5">
                <span className="min-w-0">{k}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {typeof v === "object" ? `${v.kosum} koşum · ${v.hata} hata` : `${v} kez`}
                </span>
              </li>
            ))}
          </ul>
        )}
    </div>
  );

  return (
    <div className="space-y-4">
      {hata && <p className="text-sm text-muted-foreground">{hata}</p>}
      {satir("Adım adım koşum", ozet.adimlar, "henüz koşum kaydı yok")}
      {satir("En sık tıkanan yer", ozet.hatalar, "tıkanma kaydı yok")}
      {satir("İşe yarayan yol", ozet.yollar, "henüz kayıt yok")}
      {satir("Düzeltme türleri", ozet.duzeltmeler, "düzeltme kaydı yok")}

      <div className="space-y-1">
        <div className="text-sm font-medium">Kurallar</div>
        {ozet.kurallar.length === 0
          ? <p className="text-xs text-muted-foreground italic">henüz kural yok</p>
          : (
            <ul className="text-sm space-y-0.5">
              {ozet.kurallar.map((k: any) => (
                <li key={`${k.kod}-${k.surum}`} className="flex items-center justify-between gap-3 border-b py-0.5">
                  <span className="min-w-0">{String(k.baslik ?? k.kod)}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    sürüm {k.surum} · {k.geri_alindi ? "geri alındı" : k.etkin ? "açık" : "kapalı"}
                  </span>
                </li>
              ))}
            </ul>
          )}
      </div>

      <div className="border-t pt-3 space-y-1">
        <Button size="sm" variant="outline" disabled={busy} onClick={sifirla}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          Sayımları sıfırla
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Sıfırlama yalnız bu dosyadaki koşum ve düzeltme sayımlarını siler.
          Kurallarda silme yoktur; kural geri alınır ve metni değişmez.
        </p>
      </div>
    </div>
  );
}

/* ====== KONTROL TERCİHİ (Aşama 1) — yalnız arabulucu =======================
   KAPI SAYISINI ÜRÜN DEĞİL ARABULUCU BELİRLER. Varsayılan: hiçbiri işaretli
   değildir; ajan adımları kendiliğinden yapar. Arabulucu işaretlediği adımda
   ajanın ÖNCE sormasını ister; koşucu o adımı koşmaz, sohbete onay satırı düşer.
   Alttaki dört satır DEĞİŞTİRİLEMEZ ve yalnız bilgi amaçlıdır: bu dört iş her
   hâlde insanda kalır (constitution m.3 · m.5).
   KÖR VERİ: bu kart yalnız arabulucu yüzeyindedir; tarafa hiçbir iz düşmez. */
const KONTROL_ADIMLARI: { kod: string; metin: string }[] = [
  { kod: "belge_yuklendi__analiz", metin: "Belgelerin okunup analiz edilmesi" },
  { kod: "belge_yuklendi__taraf_kalem", metin: "Tarafın talep kalemlerinin çıkarılması" },
  { kod: "oturum_planlandi__foy_hazirla", metin: "Oturum hazırlık föyünün hazırlanması" },
  { kod: "kalem_guncellendi__karsilastir", metin: "İki tarafın kalemlerinin karşılaştırılması" },
  { kod: "foy_onaylandi__gonder", metin: "Hazırlık föyünün tarafa gönderilmesi" },
  { kod: "bilirkisi_onerildi__sorular", metin: "Bilirkişiye sorulacak soruların çıkarılması" },
  { kod: "taslak_uretildi__denetim", metin: "Anlaşma taslağının denetlenmesi" },
];

// Değiştirilemez dört insan kapısı — yalnız bilgi olarak gösterilir.
const DEGISMEZ_KAPILAR = [
  "İmza",
  "Bilirkişi ataması",
  "Kayıt ve döküm rızası",
  "Tarafla asıl müzakere",
];

function KontrolTercihiKarti({ caseRow, userId }: { caseRow: CaseRow; userId: string }) {
  const [secili, setSecili] = useState<Set<string>>(() => new Set());
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;
    (async () => {
      const { data, error } = await (supabase.from("arabulucu_kontrol_tercihleri" as any) as any)
        .select("onay_isteyen_adimlar")
        .eq("case_id", caseRow.id).eq("mediator_id", userId).maybeSingle();
      if (iptal) return;
      if (error) setHata("Tercihiniz şu an okunamıyor.");
      else if (data) {
        const liste = Array.isArray((data as any).onay_isteyen_adimlar) ? (data as any).onay_isteyen_adimlar : [];
        setSecili(new Set(liste.map((x: any) => String(x))));
      }
      setYukleniyor(false);
    })();
    return () => { iptal = true; };
  }, [caseRow.id, userId]);

  async function kaydet(yeni: Set<string>) {
    setBusy(true);
    setHata(null);
    const { error } = await (supabase.from("arabulucu_kontrol_tercihleri" as any) as any).upsert({
      case_id: caseRow.id,
      mediator_id: userId,
      onay_isteyen_adimlar: Array.from(yeni),
      guncelleme_zamani: new Date().toISOString(),
    }, { onConflict: "case_id,mediator_id" });
    if (error) setHata("Tercihiniz kaydedilemedi.");
    setBusy(false);
  }

  function degistir(kod: string) {
    const yeni = new Set(secili);
    if (yeni.has(kod)) yeni.delete(kod); else yeni.add(kod);
    setSecili(yeni);
    kaydet(yeni);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Ajan hangi adımlarda önce size sorsun? İşaretlemediğiniz adımları ajan kendiliğinden yapar;
        işaretlediklerinde önce sizin onayınızı bekler. Bu seçimi sonradan da değiştirebilirsiniz.
      </p>

      {hata && <p className="text-sm text-muted-foreground">{hata}</p>}

      {/* A5 — sakin uyarı: engelleme yok, yalnız bilgi. */}
      {secili.size > 3 && (
        <p className="text-sm text-muted-foreground">
          Çok adım işaretlediniz; akış yavaşlar ve çoğu iş sizin onayınızı bekler.
        </p>
      )}

      {yukleniyor ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Okunuyor…
        </div>
      ) : (
        <ul className="space-y-1.5">
          {KONTROL_ADIMLARI.map((a) => (
            <li key={a.kod} className="flex items-start gap-2">
              <input
                type="checkbox"
                id={`kontrol-${a.kod}`}
                className="mt-1"
                checked={secili.has(a.kod)}
                disabled={busy}
                onChange={() => degistir(a.kod)}
              />
              <Label htmlFor={`kontrol-${a.kod}`} className="text-sm font-normal cursor-pointer">
                {a.metin}
              </Label>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t pt-3 space-y-1.5">
        <p className="text-xs text-muted-foreground">Bunlar her hâlde sizde kalır:</p>
        <ul className="space-y-1">
          {DEGISMEZ_KAPILAR.map((k) => (
            <li key={k} className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked readOnly disabled className="mt-0" />
              {k}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Aşama 1 — BELGELER katmanı. Dosya bazında yükleme: taraf seçimi ZORUNLU DEĞİL,
// isteğe bağlı işaretlenir (party_id boş bırakılırsa belge dosyanın genelidir).
// Yükleme kuralları Aşama 2'deki (eski Aşama 3) taraf bazlı yüklemeyle aynıdır:
// PDF / Word / metin, en çok 10 MB. Taraf bazlı yükleme Taraf Analizi ekranında
// olduğu gibi durur — buradaki blok onun yerine geçmez, ona ek gelir.
function Faz1Belgeler({ caseRow, userId, parties, openSections, onToggleSection, onCountChange }: {
  caseRow: CaseRow; userId: string; parties: any[];
  openSections: Set<string>; onToggleSection: (id: string) => void;
  onCountChange: (n: number) => void;
}) {
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [secilenTaraf, setSecilenTaraf] = useState<string>(FAZ1_BELGE_TARAFSIZ);
  // Belge özetleri (İBA 1.2) — YALNIZ arabulucu yüzeyi. belge_ozetleri tablosunda
  // tarafa SELECT politikası yoktur; taraf ekranı bu veriyi hiç okuyamaz.
  const [ozetler, setOzetler] = useState<Record<string, any>>({});
  const [ozetBusy, setOzetBusy] = useState<string | null>(null);
  const [ozetHata, setOzetHata] = useState<string | null>(null);

  const loadOzetler = useCallback(async () => {
    const { data, error } = await (supabase.from("belge_ozetleri" as any) as any)
      .select("document_id, ozet, kaniti, durum, sebep")
      .eq("case_id", caseRow.id);
    if (error) { setOzetHata(`Belge özetleri okunamadı: ${trErr(error.message)}`); return; }
    setOzetHata(null);
    const harita: Record<string, any> = {};
    for (const r of (Array.isArray(data) ? data : [])) harita[String((r as any).document_id)] = r;
    setOzetler(harita);
  }, [caseRow.id]);

  const loadDocs = useCallback(async () => {
    const { data, error } = await supabase
      .from("case_documents")
      .select("id, file_name, file_path, party_id, mime_type, created_at")
      .eq("case_id", caseRow.id)
      .order("created_at", { ascending: false });
    if (error) { setHata(`Belgeler okunamadı: ${trErr(error.message)}`); return; }
    setHata(null);
    const liste = Array.isArray(data) ? data : [];
    setDocs(liste);
    onCountChange(liste.length);
  }, [caseRow.id, onCountChange]);

  useEffect(() => { loadDocs(); }, [loadDocs]);
  useEffect(() => { loadOzetler(); }, [loadOzetler]);

  // Özeti olmayan eski belgeler için elle tetikleme. Zaten özeti olan belge için
  // fonksiyon "atlandi" döner — tekrar üretilmez.
  async function ozetCikar(documentId: string, yenile = false) {
    setOzetBusy(documentId);
    setOzetHata(null);
    try {
      const { data, error } = await supabase.functions.invoke("belge-ozeti", {
        body: { document_id: documentId, yenile },
      });
      if (error) {
        // Gerçek sebep .context gövdesindedir; mesaj sessizce yutulmaz.
        let ham = String((error as any)?.message ?? "bilinmeyen hata");
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.text === "function") {
          try {
            const govde = await ctx.text();
            if (govde) {
              try {
                const j = JSON.parse(govde);
                ham = String(j?.error ?? j?.detay ?? govde);
              } catch { ham = String(govde).slice(0, 400); }
            }
          } catch { /* gövde okunamadı */ }
        }
        throw new Error(ham);
      }
      if ((data as any)?.error) throw new Error(String((data as any).error));
      await loadOzetler();
    } catch (e: any) {
      console.error("[belge-ozeti] çağrı başarısız", e);
      setOzetHata(`belge-ozeti çağrısı başarısız: ${trErr(e?.message ?? "bilinmeyen hata")}`);
    } finally {
      setOzetBusy(null);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
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

    const partyId = secilenTaraf === FAZ1_BELGE_TARAFSIZ ? null : secilenTaraf;
    setUploading(true);
    setHata(null);
    try {
      for (const f of files) {
        const safeName = f.name.replace(/[^\w.\-]+/g, "_");
        const path = `${userId}/${caseRow.id}/${partyId ?? "dosya"}-${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage.from("case-documents").upload(path, f, {
          cacheControl: "3600", upsert: false, contentType: f.type || undefined,
        });
        if (upErr) {
          const msg = /row-level security|not authorized|permission/i.test(upErr.message)
            ? "Bu başvuruya belge yükleme yetkiniz yok."
            : `Depolama hatası: ${upErr.message}`;
          throw new Error(msg);
        }
        const { data: inserted, error: insErr } = await supabase.from("case_documents").insert({
          case_id: caseRow.id, party_id: partyId,
          file_name: f.name, file_path: path, file_size: f.size, mime_type: f.type, uploaded_by: userId,
        } as any).select("id").single();
        if (insErr) {
          // Geri alma: satır yazılamadı, yüklenen dosya depoda kalmamalı.
          // Bu silme de FIRLATMAZ — düşerse öksüz dosya kalır, kayda geçer.
          const { error: geriErr } = await supabase.storage.from("case-documents").remove([path]);
          if (geriErr) console.error("[MediationEngine] yüklenen dosya geri alınamadı (öksüz dosya):", geriErr.message);
          throw new Error(`Veritabanı hatası: ${insErr.message}`);
        }
        // Metin çıkarma: beklemesiz (fire-and-forget) — yüklemeyi bloklamaz, hata sessizce loglanır.
        supabase.functions.invoke("extract-document-text", { body: { document_id: inserted?.id } })
          .then(({ error }) => {
            if (error) console.error("[extract-document-text] çalıştırılamadı", error.message);
          })
          .catch((err) => console.error("[extract-document-text] tetiklenemedi", err));
      }
      toast({ title: "Belge yüklendi" });
      loadDocs();
    } catch (err: any) {
      const msg = err?.message ?? "Bilinmeyen hata";
      setHata(msg);
      toast({ title: "Yükleme başarısız", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function deleteDoc(d: any) {
    /* `storage.remove` da hata FIRLATMAZ. Sessizce düşer ve satır silmesi
       başarılı olursa dosya depoda ÖKSÜZ kalır: artık hiçbir kayıt onu
       göstermez, hiçbir silme kolu bulamaz (constitution m.10 — süresiz
       saklama yasağı). Bu yüzden depo silmesi doğrulanmadan satır silinmez. */
    const { error: depoErr } = await supabase.storage.from("case-documents").remove([d.file_path]);
    if (depoErr) { setHata(`Silinemedi: ${trErr(depoErr.message)}`); return; }
    const { error } = await supabase.from("case_documents").delete().eq("id", d.id);
    if (error) { setHata(`Silinemedi: ${trErr(error.message)}`); return; }
    loadDocs();
  }

  function tarafAdi(partyId: string | null) {
    if (!partyId) return "Dosya geneli";
    const p = parties.find((x) => x.id === partyId);
    return p ? partyDisplay(p) : "Taraf";
  }

  return (
    <>
      <CockpitCollapsible
        id="faz1-belge-yukle"
        title="Belge yükle"
        open={openSections.has("faz1-belge-yukle")}
        onToggle={() => onToggleSection("faz1-belge-yukle")}
      >
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Taraf (isteğe bağlı)</Label>
            <Select value={secilenTaraf} onValueChange={(v) => setSecilenTaraf(v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={FAZ1_BELGE_TARAFSIZ}>Dosya geneli (taraf seçilmedi)</SelectItem>
                {parties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{partyDisplay(p)} — {roleLabel(p.party_role)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Taraf seçmek zorunlu değildir. Seçilmezse belge dosyanın geneline yüklenir.
            </p>
          </div>
          <label className="text-sm cursor-pointer text-primary hover:underline flex items-center gap-1 w-fit">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Belge Yükle
            <input type="file" multiple className="hidden"
              accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={handleUpload} disabled={uploading} />
          </label>
          <p className="text-xs text-muted-foreground">PDF, Word veya metin dosyası · en çok 10 MB.</p>
          {hata && (
            <p className="text-sm text-destructive flex items-start gap-1.5">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {hata}
            </p>
          )}
        </div>
      </CockpitCollapsible>

      <CockpitCollapsible
        id="faz1-belgeler-liste"
        title="Dosyadaki belgeler"
        summary={`${docs.length} belge`}
        open={openSections.has("faz1-belgeler-liste")}
        onToggle={() => onToggleSection("faz1-belgeler-liste")}
      >
        {ozetHata && (
          <p className="text-sm text-destructive flex items-start gap-1.5 break-words mb-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><span>{ozetHata}</span>
          </p>
        )}
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Bu dosyaya henüz belge yüklenmedi.</p>
        ) : (
          <ul className="divide-y">
            {docs.map((d) => {
              const o = ozetler[d.id];
              return (
              <li key={d.id} className="text-sm py-1.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="flex-1 truncate">{d.file_name}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[40%]">{tarafAdi(d.party_id)}</span>
                  <Button variant="outline" size="sm" className={`shrink-0 ${KART_DUGME}`}
                    onClick={() => ozetCikar(d.id, !!o)} disabled={ozetBusy === d.id}
                    title={o ? "Özeti yenile" : "Özet çıkar"}>
                    {ozetBusy === d.id
                      ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Çıkarılıyor…</>
                      : <><Sparkles className="h-4 w-4 mr-1" /> {o ? "Özeti yenile" : "Özet çıkar"}</>}
                  </Button>
                  <UcretliIsaret />
                  <Button variant="ghost" size="sm" onClick={() => deleteDoc(d)} title="Sil"><Trash2 className="h-3 w-3" /></Button>
                </div>
                {/* Belge özeti — yalnız arabulucu yüzeyi. Kaynak: yalnız bu belgenin metni. */}
                {o && o.durum === "uretildi" && (
                  <div className="pl-6 space-y-1">
                    <p className="text-xs text-muted-foreground leading-snug">{o.ozet}</p>
                    <p className="text-xs">
                      <span className="font-medium">Neyi kanıtlıyor:</span>{" "}
                      <span className="text-muted-foreground">{o.kaniti}</span>
                    </p>
                    {/* Özet üretildi ama kanıt satırı çıkarılamadıysa sebep sessiz kalmaz. */}
                    {o.sebep && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">{o.sebep}</p>
                    )}
                  </div>
                )}
                {o && o.durum !== "uretildi" && (
                  <p className="pl-6 text-xs text-amber-600 dark:text-amber-400">
                    {o.durum === "metin_yok" ? "Belge metni okunamadı — özet üretilmedi." : (o.sebep ?? "Özet üretilmedi.")}
                  </p>
                )}
              </li>
              );
            })}
          </ul>
        )}
      </CockpitCollapsible>
    </>
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

// bare: Aşama 1'de kendi kartı yok — kapsayan katmanın içinde bölüm olarak durur
// (kutu içinde kutu olmasın). İçerik ve davranış her iki halde de aynıdır.
function DeadlineCard({ caseRow, bare = false }: { caseRow: CaseRow; bare?: boolean }) {
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

  const inner = (
    <>
      {!bare && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalIcon className="h-4 w-4 text-primary" /> 📅 Takvim & Süreler
          </h3>
        </div>
      )}

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
          <UcretliIsaret />

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
                <div className={local.extension_used ? "md:col-span-2 rounded-md bg-green-50 border border-green-200 p-2" : ""}>
                  <span className="text-muted-foreground">📅 Uzatılmış Son:</span>{" "}
                  <b className={local.extension_used ? "text-green-700" : ""}>{new Date(local.deadline_extended).toLocaleDateString("tr-TR")}</b>
                  {local.extension_used && (
                    <Badge className="ml-2 bg-green-600 text-white hover:bg-green-700 text-[10px]">Uzatma hakkı kullanıldı</Badge>
                  )}
                </div>
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

          {local.extension_used && (
            <div className="text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" /> Süre uzatma hakkı kullanıldı.
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );

  return bare ? <div className="space-y-4">{inner}</div> : <Card className="p-6 space-y-4">{inner}</Card>;
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
  { value: "ortaklık", label: "Ortaklığın Giderilmesi" },
];
function catLabel(v?: string | null) {
  return DISPUTE_CATEGORIES.find((c) => c.value === v)?.label ?? v ?? "—";
}

function DisputeClassifierCard({
  caseRow, initialText, autoRun = false, bare = false,
}: { caseRow: CaseRow; initialText: string; autoRun?: boolean; bare?: boolean }) {
  const [text, setText] = useState(initialText || caseRow.title || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ kategori: string; guven_skoru: number; gerekce: string; ilgili_kanun: string[] } | null>(null);
  const [manual, setManual] = useState<string>(caseRow.dispute_type ?? "");
  // Alt uzmanlık alanı ayrı bir kolon (cases.dispute_subtype) ve ayrı bir menü.
  // AI önerisinin kaydını classify-dispute yapar; buradaki yazma yolu YALNIZ elle
  // seçim içindir (manuel her zaman kazanır, bu yol silinirse seçim kaydedilmez).
  const [altUzmanlik, setAltUzmanlik] = useState<string>(caseRow.dispute_subtype || ALT_UZMANLIK_YOK);
  const [aiSuggestedSubtype, setAiSuggestedSubtype] = useState(false);
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
      // AI'ın alt uzmanlık önerisi geçerliyse menüye ön-doldurulur ve rozetlenir.
      // Kaydı classify-dispute persist:true akışında sunucu yazıyor (89f5c7e) —
      // burada yalnız ekran durumu güncellenir, mükerrer yazma yapılmaz.
      const altUz = String((data as any)?.alt_uzmanlik ?? "");
      const validAlt = altUz !== ALT_UZMANLIK_YOK && ALT_UZMANLIK_ALANLARI.some((c) => c.value === altUz);
      if (validAlt) {
        setAltUzmanlik(altUz);
        setAiSuggestedSubtype(true);
      }
      toast({
        title: "Tür tespiti tamamlandı",
        description: `${anaAltLabel((data as any).kategori, validAlt ? altUz : null)} · %${(data as any).guven_skoru}`,
      });
    } catch (e: any) {
      const raw = e?.message ?? "";
      setError(trErr(raw) || "Uyuşmazlık türü tespit edilemedi. Lütfen tekrar deneyin.");
      toast({ title: "Sınıflandırma başarısız", description: trErr(raw) || "Bağlantı veya AI servisi hatası.", variant: "destructive" });
    } finally { setBusy(false); }
  }, [caseRow.id]);

  useEffect(() => {
    if (!autoRun || ranRef.current) return;
    if (caseRow.dispute_type) return; // already classified
    const trimmed = (initialText ?? "").trim();
    if (trimmed.length < 10) return;
    if (caseRow.application_no && trimmed === `Başvuru - ${caseRow.application_no}`) return; // boş başlıkta üretilen varsayılan metin, gerçek kullanıcı girdisi değil
    ranRef.current = true;
    runClassify(initialText);
  }, [autoRun, caseRow.dispute_type, caseRow.application_no, initialText, runClassify]);

  async function saveManual(value: string) {
    setSavingManual(true);
    try {
      const { error } = await supabase.from("cases").update({ dispute_type: value } as any).eq("id", caseRow.id);
      if (error) throw error;
      setManual(value);
      toast({ title: "Ana tür güncellendi", description: catLabel(value) });
    } catch (e: any) {
      toast({ title: "Güncellenemedi", description: trErr(e?.message ?? ""), variant: "destructive" });
    } finally { setSavingManual(false); }
  }

  // Elle seçim: AI önerisi rozeti kalkar, kayıt ana türle aynı kalıpla yazılır.
  async function saveAltUzmanlik(value: string) {
    setSavingManual(true);
    setAiSuggestedSubtype(false);
    try {
      const { error } = await supabase.from("cases")
        .update({ dispute_subtype: value !== ALT_UZMANLIK_YOK ? value : null } as any)
        .eq("id", caseRow.id);
      if (error) throw error;
      setAltUzmanlik(value);
      toast({ title: "Alt uzmanlık güncellendi", description: altUzmanlikLabel(value) ?? "Yok" });
    } catch (e: any) {
      toast({ title: "Güncellenemedi", description: trErr(e?.message ?? ""), variant: "destructive" });
    } finally { setSavingManual(false); }
  }

  const lowConfidence = result && result.guven_skoru < 60;
  const currentCat = manual || caseRow.dispute_type || result?.kategori || "";
  // Ana tür listesi ANA_UYUSMAZLIK_TURLERI'dir; eski kayıtlarda bu listede olmayan
  // bir değer duruyorsa (ör. "fikri_mülkiyet") kaybolmasın diye listeye eklenir.
  const anaOptions = ANA_UYUSMAZLIK_TURLERI.some((c) => c.value === currentCat) || !currentCat
    ? ANA_UYUSMAZLIK_TURLERI
    : [...ANA_UYUSMAZLIK_TURLERI, { value: currentCat, label: catLabel(currentCat) }];

  const inner = (
    <>
      <div className="flex items-center justify-between flex-wrap gap-2">
        {bare
          ? <div className="text-sm font-semibold text-primary">Uyuşmazlık tür tespiti</div>
          : <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Uyuşmazlık Türü Tespiti
            </h3>}
        <Button size="sm" variant="outline" onClick={() => runClassify(text)} disabled={busy}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Analiz…</> : <><Sparkles className="h-4 w-4 mr-1" /> {result ? "AI önerisini yenile" : "AI önerisi"}</>}
        </Button>
      </div>

      <div>
        <Label className="text-sm text-muted-foreground">Uyuşmazlık metni (başlık + kısa açıklama)</Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Örn: Kiracı 4 aydır kira ödemiyor, tahliye ve birikmiş kira talep ediliyor."
        />
      </div>

      {error && (
        <div className="space-y-2">
          <p className="text-sm text-destructive flex items-start gap-1.5">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </p>
          <Button size="sm" variant="outline" onClick={() => runClassify(text)} disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Deneniyor…</> : <><RefreshCw className="h-4 w-4 mr-1" /> Tekrar Dene</>}
          </Button>
        </div>
      )}

      {/* İKİ MENÜ: ana tür (zorunlu) + alt uzmanlık (isteğe bağlı). Föy künyesi
          bu ikisinden "Ticari — Fikri-Sınai Haklar" biçiminde üretilir. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-sm text-muted-foreground">Ana uyuşmazlık türü</Label>
          <Select value={manual || undefined} onValueChange={saveManual} disabled={savingManual}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seçin…" /></SelectTrigger>
            <SelectContent>
              {anaOptions.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm text-muted-foreground flex items-center gap-2">
            Alt uzmanlık alanı
            {aiSuggestedSubtype && <Badge variant="secondary" className="text-[10px]">AI önerisi</Badge>}
          </Label>
          <Select value={altUzmanlik} onValueChange={saveAltUzmanlik} disabled={savingManual}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Yok" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALT_UZMANLIK_YOK}>Yok</SelectItem>
              {ALT_UZMANLIK_ALANLARI.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {(result || caseRow.dispute_type) && (
        <div className="text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">Tespit edilen alan: </span>
            {anaAltLabel(currentCat, altUzmanlik !== ALT_UZMANLIK_YOK ? altUzmanlik : null)}
          </div>
          {result && (
            <>
              <div className="text-muted-foreground">Güven: %{result.guven_skoru}</div>
              {result.gerekce && <div><span className="text-muted-foreground">Gerekçe: </span>{result.gerekce}</div>}
              {result.ilgili_kanun?.length > 0 && (
                <div><span className="text-muted-foreground">Dayanak: </span>{result.ilgili_kanun.join(", ")}</div>
              )}
            </>
          )}
          {lowConfidence && (
            <p className="text-sm text-destructive">
              AI bu konuyu %{result!.guven_skoru} güvenle sınıflandırdı — doğru alanı elle seçin.
            </p>
          )}
        </div>
      )}

      {!result && !caseRow.dispute_type && !busy && (
        <p className="text-sm text-muted-foreground italic">
          Metni yazıp "AI önerisi" düğmesine basın; AI, Türk hukuku ve bilgi tabanı kaynaklarına göre alanı tespit edecek.
        </p>
      )}
    </>
  );

  // bare: Faz 3'te kendi kartı yok — kapsayan kartın içinde bölüm olarak durur.
  return bare ? <div className="space-y-3">{inner}</div> : <Card className="p-6 space-y-3">{inner}</Card>;
}

/* ===================== PHASE 2 - PARTIES ===================== */

// TARAFLAR bloğu. 14.08'den beri kendi aşaması yok: Aşama 1'in "TARAFLAR" katmanı
// içinde bare=true ile çizilir (üst şerit ve "Aşamayı Tamamla" düğmesi olmadan).
// Ekleme / düzenleme / silme / davet akışlarının hiçbiri değişmedi.
function Phase2Parties({ caseRow, isMediator, userId, onDone, bare = false, onChanged }: {
  caseRow: CaseRow; isMediator: boolean; userId: string; onDone?: () => void;
  bare?: boolean; onChanged?: () => void;
}) {
  const [parties, setParties] = useState<any[]>([]);
  const [draft, setDraft] = useState<PartyDraft | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [vekilDraftOpen, setVekilDraftOpen] = useState(false);
  const [vekilEditOpen, setVekilEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [inviteUrls, setInviteUrls] = useState<Record<string, string>>({});
  const [revealedId, setRevealedId] = useState<string | null>(null);
  // Kayıt onayı: hem yeni taraf kaydı hem de sonradan e-posta değişikliği
  // onay panelinden geçer; onaylanmadan hiçbir şey kaydedilmez.
  const [confirmingDraft, setConfirmingDraft] = useState(false);
  const [confirmingEmail, setConfirmingEmail] = useState(false);
  // Taraf onaylanıp kaydedildiğinde beliren gönderim kartı. Kart yalnız
  // e-postası onaylanmış tarafta çıkar; gönderim elle tetiklenir.
  const [invitePrompt, setInvitePrompt] = useState<{ partyId: string; name: string; email: string } | null>(null);
  const [promptEmailDraft, setPromptEmailDraft] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("case_parties").select("*").eq("case_id", caseRow.id).order("created_at");
    setParties(data ?? []);
    setLoading(false);
    // Kapsayan ekran (Aşama 1) taraf listesini kendi belgeler bölümünde de kullanıyor.
    onChanged?.();
  }, [caseRow.id, onChanged]);

  useEffect(() => { load(); }, [load]);

  const sendInvite = useCallback(async (partyId: string, opts?: { skipEmail?: boolean }) => {
    setInvitingId(partyId);
    try {
      const { data, error } = await supabase.functions.invoke("send-party-invite", {
        body: { party_id: partyId, app_url: window.location.origin, skip_email: !!opts?.skipEmail },
      });
      if (error) throw error;
      if ((data as any)?.invite_url) {
        setInviteUrls((prev) => ({ ...prev, [partyId]: (data as any).invite_url }));
        setRevealedId(partyId);
      }
      toast({ title: "Davet gönderildi" });
    } catch (e: any) {
      toast({ title: "Davet gönderilemedi", description: trErr(e?.message ?? ""), variant: "destructive" });
    } finally {
      setInvitingId(null);
      load();
    }
  }, [load]);

  function openWhatsapp(p: any, inviteUrl: string) {
    const phone = getPartyPhone(p);
    if (!phone) return;
    const number = normalizePhoneForWhatsapp(phone);
    const message = `${partyDisplay(p)}, ${caseRow.application_no ?? ""} numaralı arabuluculuk sürecine katılmak için: ${inviteUrl}`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  async function copyInviteLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link kopyalandı" });
    } catch {
      toast({ title: "Kopyalanamadı", description: "Linki elle seçip kopyalayın.", variant: "destructive" });
    }
  }

  function validateParty(p: any, isInd: boolean): string | null {
    if (isInd) {
      if (!p.first_name?.trim()) return "Ad zorunludur.";
      if (!p.last_name?.trim()) return "Soyad zorunludur.";
      if (p.tc_kimlik && !/^\d{11}$/.test(String(p.tc_kimlik).trim())) return "TC Kimlik No 11 haneli rakam olmalıdır.";
    } else {
      if (!p.company_name?.trim()) return "Kurum adı zorunludur.";
    }
    const phoneRe = /^[+\d\s().-]{7,20}$/;
    if (p.gsm && !phoneRe.test(String(p.gsm).trim())) return "GSM numarası geçerli değil.";
    if (p.phone && !phoneRe.test(String(p.phone).trim())) return "Telefon numarası geçerli değil.";
    if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(p.email).trim())) return "E-posta adresi geçerli değil.";
    return null;
  }

  const ROL_ETIKET: Record<string, string> = {
    applicant: "Başvurucu", respondent: "Karşı Taraf", third_party: "Üçüncü Taraf",
  };

  // "Tarafı Kaydet" artık doğrudan kaydetmez; önce özet paneli açar.
  function reviewDraft() {
    if (!draft) return;
    if (!draft.kvkk_ok) { toast({ title: "KVKK onayı gerekli", variant: "destructive" }); return; }
    const isInd = draft.party_type === "individual";
    const vErr = validateParty(draft, isInd);
    if (vErr) { toast({ title: "Doğrulama hatası", description: vErr, variant: "destructive" }); return; }
    setConfirmingDraft(true);
  }

  function draftConfirmFields(d: PartyDraft): ConfirmField[] {
    const isInd = d.party_type === "individual";
    const rows: ConfirmField[] = [
      { key: "party_role", label: "Rol", value: d.party_role, display: ROL_ETIKET[d.party_role] ?? d.party_role,
        options: [
          { value: "applicant", label: "Başvurucu" },
          { value: "respondent", label: "Karşı Taraf" },
          { value: "third_party", label: "Üçüncü Taraf" },
        ] },
      { key: "party_type", label: "Tür", value: d.party_type, display: isInd ? "Bireysel" : "Kurumsal",
        options: [{ value: "individual", label: "Bireysel" }, { value: "corporate", label: "Kurumsal" }] },
    ];
    if (isInd) {
      rows.push({ key: "first_name", label: "Ad", value: d.first_name ?? "" });
      rows.push({ key: "last_name", label: "Soyad", value: d.last_name ?? "" });
      rows.push({ key: "tc_kimlik", label: "TC Kimlik No", value: d.tc_kimlik ?? "" });
      rows.push({ key: "gsm", label: "GSM", value: d.gsm ?? "" });
    } else {
      rows.push({ key: "company_name", label: "Kurum adı", value: d.company_name ?? "" });
      rows.push({ key: "authorized_person", label: "Yetkili kişi", value: d.authorized_person ?? "" });
      rows.push({ key: "tax_office", label: "Vergi dairesi", value: d.tax_office ?? "" });
      rows.push({ key: "tax_number", label: "Vergi no", value: d.tax_number ?? "" });
      rows.push({ key: "trade_registry_no", label: "Ticaret sicil no", value: d.trade_registry_no ?? "" });
    }
    rows.push({ key: "phone", label: "Telefon", value: d.phone ?? "" });
    rows.push({ key: "address", label: "Adres", value: d.address ?? "" });
    rows.push({ key: "email", label: "E-posta (davet bu adrese gider)", value: d.email ?? "", type: "email" });
    if (d.vekil_ad_soyad || d.vekil_baro || d.vekil_sicil_no) {
      rows.push({ key: "vekil_ad_soyad", label: "Vekil adı soyadı", value: d.vekil_ad_soyad ?? "" });
      rows.push({ key: "vekil_baro", label: "Vekil barosu", value: d.vekil_baro ?? "" });
      rows.push({ key: "vekil_sicil_no", label: "Vekil sicil no", value: d.vekil_sicil_no ?? "" });
    }
    return rows;
  }

  async function save() {
    if (!draft) return;
    if (!draft.kvkk_ok) { toast({ title: "KVKK onayı gerekli", variant: "destructive" }); return; }
    const isInd = draft.party_type === "individual";
    const vErr = validateParty(draft, isInd);
    if (vErr) { toast({ title: "Doğrulama hatası", description: vErr, variant: "destructive" }); return; }
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
        address: draft.address ?? null,
        gsm: draft.gsm ?? null,
        phone: draft.phone ?? null,
        email: draft.email ?? null,
        // Bu yola yalnız onay panelindeki "Onayla ve kaydet" ile gelinir:
        // adres varsa onay anı damgalanır, yoksa alan boş kalır.
        email_confirmed_at: String(draft.email ?? "").trim() ? new Date().toISOString() : null,
        company_name: draft.company_name ?? null,
        tax_office: draft.tax_office ?? null,
        tax_number: draft.tax_number ?? null,
        trade_registry_no: draft.trade_registry_no ?? null,
        authorized_person: draft.authorized_person ?? null,
        vekil_ad_soyad: draft.vekil_ad_soyad ?? null,
        vekil_baro: draft.vekil_baro ?? null,
        vekil_sicil_no: draft.vekil_sicil_no ?? null,
      } as any).select().single();
      if (error) throw error;
      // Adres onay panelinden geçtiği için onaylıdır (email_confirmed_at yazıldı):
      // davet kendiliğinden gönderilmez, gönderim kartı açılır.
      if (String(draft.email ?? "").trim()) {
        setInvitePrompt({ partyId: (inserted as any).id, name: full_name, email: String(draft.email).trim() });
        setPromptEmailDraft(null);
      }
      toast({ title: "Taraf eklendi" });
      setConfirmingDraft(false);
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

  async function saveEdit(opts?: { emailConfirmed?: boolean }) {
    if (!editing) return;
    const isInd = editing.party_type === "individual";
    const vErr = validateParty(editing, isInd);
    if (vErr) { toast({ title: "Doğrulama hatası", description: vErr, variant: "destructive" }); return; }
    {
      // E-posta eklendi/değiştiyse önce yalnız o alanın onay paneli çıkar;
      // onaylanmadan yeni adres kaydedilmez.
      const orig = parties.find((p: any) => p.id === editing.id);
      const changed = String(editing.email ?? "").trim() !== String(orig?.email ?? "").trim();
      if (changed && !opts?.emailConfirmed) { setConfirmingEmail(true); return; }
    }
    setSavingEdit(true);
    try {
      const full_name = isInd
        ? `${editing.first_name ?? ""} ${editing.last_name ?? ""}`.trim()
        : (editing.company_name ?? "");
      const original = parties.find((p: any) => p.id === editing.id);
      const newEmail = String(editing.email ?? "").trim();
      const oldEmail = String(original?.email ?? "").trim();
      const emailChanged = !!newEmail && newEmail !== oldEmail;
      const patch: any = {
        first_name: editing.first_name ?? null,
        last_name: editing.last_name ?? null,
        full_name,
        tc_kimlik: editing.tc_kimlik ?? null,
        address: editing.address ?? null,
        gsm: editing.gsm ?? null,
        phone: editing.phone ?? null,
        email: editing.email ?? null,
        company_name: editing.company_name ?? null,
        tax_office: editing.tax_office ?? null,
        tax_number: editing.tax_number ?? null,
        trade_registry_no: editing.trade_registry_no ?? null,
        authorized_person: editing.authorized_person ?? null,
        vekil_ad_soyad: editing.vekil_ad_soyad ?? null,
        vekil_baro: editing.vekil_baro ?? null,
        vekil_sicil_no: editing.vekil_sicil_no ?? null,
      };
      if (newEmail !== oldEmail) {
        // Onay panelinden geçen adres onay anıyla damgalanır; panelsiz bir yoldan
        // gelen değişiklik onaysızdır — damga silinir, adres onaylı görünmez.
        patch.email_confirmed_at = opts?.emailConfirmed && newEmail ? new Date().toISOString() : null;
      }
      const { error } = await supabase.from("case_parties").update(patch).eq("id", editing.id);
      if (error) throw error;
      toast({ title: "Taraf bilgileri güncellendi" });
      setConfirmingEmail(false);
      // Gönderim kartı açıksa onaylanan yeni adresi karta taşı; adres
      // silinmişse kart kapanır (onaysız/boş adrese gönderim yok).
      setInvitePrompt((prev) => {
        if (!prev || prev.partyId !== editing.id) return prev;
        return newEmail ? { ...prev, email: newEmail } : null;
      });
      setPromptEmailDraft(null);
      setEditing(null);
      load();
      if (emailChanged) sendInvite(editing.id);
    } catch (e: any) {
      toast({ title: "Güncelleme başarısız", description: trErr(e.message), variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  }

  const withEmail = parties.filter((p: any) => p.email);
  const acceptedCount = withEmail.filter((p: any) => p.invite_status === "accepted").length;
  const inviteSummary: string | null = withEmail.length
    ? `${acceptedCount}/${withEmail.length} Kabul`
    : parties.length ? "Davet gönderilmedi" : null;

  const govde = (
    <>
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={itemVariants}>
      <TarafKutusu bare={bare}>
        {/* Davet durumu eski Aşama 2'nin üst şeridinde duruyordu; şerit kalkınca
            bilgi kaybolmasın diye blok başlığına taşındı. */}
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <span className="text-sm text-muted-foreground">
            {inviteSummary ? `Davet durumu: ${inviteSummary}` : ""}
          </span>
          <Button onClick={() => setDraft(emptyParty(parties.length === 0 ? "applicant" : "respondent"))}>
            <Plus className="h-4 w-4 mr-1" /> Taraf Ekle
          </Button>
        </div>
        {loading ? <Loader2 className="animate-spin" /> : parties.length === 0 ? (
          <p className="text-muted-foreground">Henüz taraf eklenmedi.</p>
        ) : (
          <div className="space-y-2">
            {parties.map((p) => (
              <motion.div variants={itemVariants} key={p.id} className="p-3 border rounded space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <div className="font-medium break-words">{p.full_name || p.company_name || "(isimsiz)"}</div>
                    <div className="text-xs text-muted-foreground break-words">
                      {p.party_role === "applicant" ? "Başvurucu" : p.party_role === "respondent" ? "Karşı Taraf" : "Üçüncü Taraf"}
                      {" · "}{p.party_type === "corporate" ? "Kurumsal" : "Bireysel"}
                      {" · "}{p.email || "e-posta yok"}
                    </div>
                  </div>
                  {/* Düğme satırı dar sütunda (Aşama 1'in iki sütunlu düzeni ~320px)
                      alt satıra iner: flex-wrap + min-w-0, düğmelerde metin sarabilir.
                      Sabit tek satır kaldığında sayfa yana taşıyordu. */}
                  <div className="flex flex-wrap items-center justify-end gap-1 min-w-0 max-w-full">
                    {p.email && p.invite_status !== "accepted" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="max-w-full whitespace-normal text-left h-auto py-1.5"
                        onClick={() => sendInvite(p.id)}
                        disabled={invitingId === p.id}
                        title={inviteUrls[p.id] ? "Yeniden gönder" : "Davet gönder"}
                      >
                        {invitingId === p.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin shrink-0" /> : <Mail className="h-4 w-4 mr-1 shrink-0" />}
                        {inviteUrls[p.id] ? "Yeniden gönder" : "Davet gönder"}
                      </Button>
                    )}
                    {!p.email && p.invite_status !== "accepted" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="max-w-full whitespace-normal text-left h-auto py-1.5"
                        onClick={() => sendInvite(p.id, { skipEmail: true })}
                        disabled={invitingId === p.id}
                        title="Davet Linki Oluştur"
                      >
                        {invitingId === p.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin shrink-0" /> : <Mail className="h-4 w-4 mr-1 shrink-0" />}
                        Davet Linki Oluştur
                      </Button>
                    )}
                    {inviteUrls[p.id] && revealedId !== p.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="max-w-full whitespace-normal text-left h-auto py-1.5"
                        onClick={() => setRevealedId(p.id)}
                        title="Davet linkini göster"
                      >
                        Davet Linkini Göster
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="max-w-full whitespace-normal text-left h-auto py-1.5"
                      onClick={() => {
                        setEditing({ ...p });
                        setVekilEditOpen(!!(p.vekil_ad_soyad || p.vekil_baro || p.vekil_sicil_no));
                      }}
                      title="Düzenle"
                    >
                      <Pencil className="h-4 w-4 mr-1 shrink-0" /> Düzenle
                    </Button>
                    <Button variant="ghost" size="sm" className="shrink-0" onClick={() => remove(p.id)} title="Sil">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {revealedId === p.id && inviteUrls[p.id] && (
                  <div className="flex items-center gap-2 flex-wrap bg-muted/40 rounded p-2">
                    <Input
                      readOnly
                      value={inviteUrls[p.id]}
                      className="text-xs flex-1 min-w-[220px] h-8"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button size="sm" variant="outline" onClick={() => copyInviteLink(inviteUrls[p.id])}>
                      <Copy className="h-3 w-3 mr-1" /> Linki Kopyala
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openWhatsapp(p, inviteUrls[p.id])}
                      disabled={!getPartyPhone(p)}
                      title={!getPartyPhone(p) ? "Telefon numarası girilmemiş" : undefined}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" /> WhatsApp'tan Gönder
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRevealedId(null)}>
                      Gizle
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
        {!bare && parties.length >= 2 && onDone && (
          <div className="mt-4 flex justify-end">
            <Button variant="default" onClick={onDone}>Aşamayı Tamamla →</Button>
          </div>
        )}
      </TarafKutusu>
      </motion.div>

      {invitePrompt && (
        <motion.div variants={itemVariants}>
        <Card className="p-6 space-y-3 border-accent/40">
          <div>
            <h3 className="text-lg font-semibold">Davet gönderilsin mi?</h3>
            <p className="text-sm text-muted-foreground">
              Taraf kaydedildi ve e-posta adresi onaylandı. Gönderim sizin onayınızla yapılır.
            </p>
          </div>
          <div className="rounded border divide-y text-sm">
            <div className="p-3">
              <div className="text-xs text-muted-foreground">Alıcı</div>
              <div>{invitePrompt.name}</div>
            </div>
            <div className="p-3">
              <div className="text-xs text-muted-foreground">E-posta</div>
              {promptEmailDraft === null ? (
                <div className="break-all">{invitePrompt.email}</div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Input
                    type="email"
                    className="flex-1 min-w-[220px] h-9"
                    value={promptEmailDraft}
                    autoFocus
                    onChange={(e) => setPromptEmailDraft(e.target.value)}
                  />
                  <Button
                    size="sm"
                    disabled={
                      !promptEmailDraft.trim() ||
                      promptEmailDraft.trim() === invitePrompt.email
                    }
                    onClick={() => {
                      // Yeni adres onay panelinden geçmeden kaydedilmez.
                      const p = parties.find((x: any) => x.id === invitePrompt.partyId);
                      if (!p) { toast({ title: "Taraf bulunamadı", variant: "destructive" }); return; }
                      setEditing({ ...p, email: promptEmailDraft.trim() });
                      setVekilEditOpen(!!(p.vekil_ad_soyad || p.vekil_baro || p.vekil_sicil_no));
                      setConfirmingEmail(true);
                    }}
                  >
                    Adresi onayla
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPromptEmailDraft(null)}>Vazgeç</Button>
                </div>
              )}
            </div>
            <div className="p-3">
              <div className="text-xs text-muted-foreground">Gönderilecek içerik (özet)</div>
              <div className="text-muted-foreground">
                Konu: “Arabuluculuk Davet — {caseRow.application_no ?? ""}”. Metinde tarafa hitap,
                dosyaya taraf olarak davet edildiği bilgisi, giriş bağlantısı ve yalnız kendi
                belgelerini göreceği / karşı tarafın verilerinin gizli kaldığı açıklaması yer alır.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => { setInvitePrompt(null); setPromptEmailDraft(null); }}
              disabled={invitingId === invitePrompt.partyId}
            >
              Şimdi değil
            </Button>
            <Button
              variant="outline"
              onClick={() => setPromptEmailDraft(invitePrompt.email)}
              disabled={promptEmailDraft !== null || invitingId === invitePrompt.partyId}
            >
              <Pencil className="h-4 w-4 mr-1" /> Düzenle
            </Button>
            <Button
              onClick={async () => {
                const id = invitePrompt.partyId;
                await sendInvite(id);
                setInvitePrompt(null);
                setPromptEmailDraft(null);
              }}
              disabled={promptEmailDraft !== null || invitingId === invitePrompt.partyId}
            >
              {invitingId === invitePrompt.partyId
                ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                : <Mail className="h-4 w-4 mr-1" />}
              Gönder
            </Button>
          </div>
        </Card>
        </motion.div>
      )}

      {draft && (
        <motion.div variants={itemVariants}>
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Yeni Taraf</h3>
          {confirmingDraft ? (
            <ConfirmSavePanel
              title="Kaydetmeden önce kontrol edin"
              note="Bilgiler doğruysa onaylayın; taraf kaydı ancak onaydan sonra düşer."
              fields={draftConfirmFields(draft)}
              onFieldChange={(k, v) => setDraft({ ...draft, [k]: v } as PartyDraft)}
              onConfirm={save}
              onBack={() => setConfirmingDraft(false)}
              busy={busy}
            />
          ) : (
          <>
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

          <div className="border-t pt-3">
            <button
              type="button"
              onClick={() => setVekilDraftOpen((o) => !o)}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition"
            >
              {vekilDraftOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Vekil Bilgisi (opsiyonel)
            </button>
            {vekilDraftOpen && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <div><Label>Vekil Adı Soyadı</Label><Input value={draft.vekil_ad_soyad ?? ""} onChange={(e) => setDraft({ ...draft, vekil_ad_soyad: e.target.value })} /></div>
                <div><Label>Baro</Label><Input value={draft.vekil_baro ?? ""} onChange={(e) => setDraft({ ...draft, vekil_baro: e.target.value })} /></div>
                <div><Label>Sicil No</Label><Input value={draft.vekil_sicil_no ?? ""} onChange={(e) => setDraft({ ...draft, vekil_sicil_no: e.target.value })} /></div>
              </div>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={!!draft.kvkk_ok} onCheckedChange={(v) => setDraft({ ...draft, kvkk_ok: !!v })} />
            <span>KVKK kapsamında kişisel verilerin işlenmesini onaylıyorum.</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)} disabled={busy}>İptal</Button>
            <Button onClick={reviewDraft} disabled={busy}>{busy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Kaydediliyor…</> : "Tarafı Kaydet"}</Button>
          </div>
          </>
          )}
        </Card>
        </motion.div>
      )}

      <Dialog
        open={!!editing}
        onOpenChange={(o) => { if (!o && !savingEdit) { setEditing(null); setConfirmingEmail(false); } }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Taraf Bilgilerini Düzenle</DialogTitle>
          </DialogHeader>
          {editing && confirmingEmail ? (
            <ConfirmSavePanel
              title="E-posta adresini onaylayın"
              note="Yeni adres onaylanmadan kaydedilmez; davet bu adrese gönderilir."
              fields={[{ key: "email", label: "E-posta", value: editing.email ?? "", type: "email" }]}
              onFieldChange={(_k, v) => setEditing({ ...editing, email: v })}
              onConfirm={() => saveEdit({ emailConfirmed: true })}
              onBack={() => setConfirmingEmail(false)}
              busy={savingEdit}
            />
          ) : (
          <>
          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {editing.party_type === "individual" ? (
                <>
                  <div><Label>Ad *</Label><Input value={editing.first_name ?? ""} onChange={(e) => setEditing({ ...editing, first_name: e.target.value })} /></div>
                  <div><Label>Soyad *</Label><Input value={editing.last_name ?? ""} onChange={(e) => setEditing({ ...editing, last_name: e.target.value })} /></div>
                  <div><Label>TC Kimlik No</Label><Input value={editing.tc_kimlik ?? ""} onChange={(e) => setEditing({ ...editing, tc_kimlik: e.target.value })} /></div>
                  
                  <div><Label>GSM</Label><Input value={editing.gsm ?? ""} onChange={(e) => setEditing({ ...editing, gsm: e.target.value })} /></div>
                  <div><Label>Telefon</Label><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
                </>
              ) : (
                <>
                  <div><Label>Kurum Adı *</Label><Input value={editing.company_name ?? ""} onChange={(e) => setEditing({ ...editing, company_name: e.target.value })} /></div>
                  <div><Label>Yetkili Kişi</Label><Input value={editing.authorized_person ?? ""} onChange={(e) => setEditing({ ...editing, authorized_person: e.target.value })} /></div>
                  <div><Label>Vergi Dairesi</Label><Input value={editing.tax_office ?? ""} onChange={(e) => setEditing({ ...editing, tax_office: e.target.value })} /></div>
                  <div><Label>Vergi No</Label><Input value={editing.tax_number ?? ""} onChange={(e) => setEditing({ ...editing, tax_number: e.target.value })} /></div>
                  <div><Label>Ticaret Sicil No</Label><Input value={editing.trade_registry_no ?? ""} onChange={(e) => setEditing({ ...editing, trade_registry_no: e.target.value })} /></div>
                  <div><Label>Telefon</Label><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
                </>
              )}
              <div className="md:col-span-2"><Label>Adres</Label><Input value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>E-posta</Label><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>

              <div className="md:col-span-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setVekilEditOpen((o) => !o)}
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition"
                >
                  {vekilEditOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Vekil Bilgisi (opsiyonel)
                </button>
                {vekilEditOpen && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    <div><Label>Vekil Adı Soyadı</Label><Input value={editing.vekil_ad_soyad ?? ""} onChange={(e) => setEditing({ ...editing, vekil_ad_soyad: e.target.value })} /></div>
                    <div><Label>Baro</Label><Input value={editing.vekil_baro ?? ""} onChange={(e) => setEditing({ ...editing, vekil_baro: e.target.value })} /></div>
                    <div><Label>Sicil No</Label><Input value={editing.vekil_sicil_no ?? ""} onChange={(e) => setEditing({ ...editing, vekil_sicil_no: e.target.value })} /></div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={savingEdit}>İptal</Button>
            <Button onClick={() => saveEdit()} disabled={savingEdit}>
              {savingEdit ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Kaydediliyor…</> : "Kaydet"}
            </Button>
          </DialogFooter>
          </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
    </>
  );

  // Blok artık her zaman kapsayan bir ekranın içinde çizilir; kendi üst şeridi yoktur.
  return bare ? govde : <div className="space-y-4">{govde}</div>;
}

// Taraflar bloğunun kabı: tek başına aşamayken kart, Aşama 1 katmanının içindeyken
// düz kutu (kutu içinde kutu olmaz).
function TarafKutusu({ bare, children }: { bare: boolean; children: React.ReactNode }) {
  return bare ? <div>{children}</div> : <Card className="p-6">{children}</Card>;
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

/* İLETİŞİM TERCİHİ — SALT OKUMA (İBA 1.5). Taraf kendi ekranından belirler;
   arabulucu yalnız GÖRÜR, değiştiremez. Kayıt yoksa varsayılan yazılır.
   Kör veri: tercih kendi party_id'siyle okunur, karşı tarafın tercihi görünmez
   (bu satır zaten yalnız açılan tarafın kartında çizilir). */
const SIKLIK_METNI: Record<string, string> = {
  her_adim: "her adımda",
  onemli: "yalnız önemli adımlarda",
  haftalik_ozet: "haftalık özet",
};
function IletisimTercihiSatiri({ partyId }: { partyId: string }) {
  const [metin, setMetin] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;
    (async () => {
      const { data, error } = await (supabase.from("iletisim_tercihleri" as any) as any)
        .select("siklik, sessiz_baslangic, sessiz_bitis")
        .eq("party_id", partyId)
        .maybeSingle();
      if (iptal) return;
      if (error) { setMetin(null); return; }
      const siklik = SIKLIK_METNI[String((data as any)?.siklik ?? "her_adim")] ?? "her adımda";
      const bas = String((data as any)?.sessiz_baslangic ?? "").slice(0, 5);
      const bit = String((data as any)?.sessiz_bitis ?? "").slice(0, 5);
      const sessiz = bas && bit ? ` (sessiz: ${bas}–${bit})` : "";
      setMetin(`${siklik}${sessiz}`);
    })();
    return () => { iptal = true; };
  }, [partyId]);

  if (!metin) return null;
  return (
    <div className="col-span-2">
      <span className="text-muted-foreground">İletişim tercihi:</span> {metin}
    </div>
  );
}

// Faz 3 katmanları: Faz 4'teki kalıbın aynısı — sabit id (sol menüden derin bağlantı),
// katlanır başlık, altında tek satır açıklama. Liste statik: üç katman her zaman vardır.
const FAZ3_LAYERS = [
  // Katman başlıkları hem sayfada hem sol dizinde BÜYÜK HARF; Türkçe büyük harf
  // (İ noktalı) doğrudan yazılır, otomatik dönüştürmeye bırakılmaz.
  {
    id: "faz3-katman-ozet",
    label: "DOSYA ÖZETİ",
    hint: "Bu katman, uyuşmazlığın konusunu ve tür tespitini içerir; metni ve tespiti buradan görüp düzeltebilirsiniz.",
  },
  {
    id: "faz3-katman-taraflar",
    label: "TARAFLAR",
    hint: "Bu katman, her tarafın bilgilerini, belgelerini ve analiz sonuçlarını barındırır.",
  },
  {
    id: "faz3-katman-belgeler",
    label: "BELGELER VE ARAÇLAR",
    hint: "Bu katman, dosyadaki belgelerin metne çevrilmesi gibi hazırlık işlemlerini içerir.",
  },
  // Dizinin SONUNA eklenir (mevcut FAZ3_LAYERS[0..2] indeksleri kaymasın diye);
  // ekrandaki ve sol menüdeki yeri Dosya özeti'nin hemen altıdır.
  {
    id: "faz3-katman-cizelge",
    label: "OLAY ZAMAN ÇİZELGESİ",
    hint: "Bu katman, dosyadaki bütün tarihleri tek çizelgede eskiden yeniye sıralar; her satır dayandığı belgeyi veya beyanı gösterir.",
  },
  {
    id: "faz3-katman-guc",
    label: "GÜÇ DENGESİ",
    hint: "Bu katman, taraflar arasındaki dengesizlik göstergelerini dayanağıyla birlikte işaret eder; kişilik değerlendirmesi değil, durum tespitidir.",
  },
  {
    id: "faz3-katman-usul",
    label: "USULE İLİŞKİN ENGELLER",
    hint: "Bu katman, süreci aksatabilecek usul eksiklerini dayanağıyla birlikte sayar; kanun yorumu içermez.",
  },
];
// Bölüm → kapsayan katman: sol menüden bölüme atlanınca önce katman açılır.
const FAZ3_SECTION_LAYER: Record<string, string> = {
  "faz3-uyusmazlik-konusu": "faz3-katman-ozet",
  "faz3-tur-tespiti": "faz3-katman-ozet",
};

// ── Kart başlığındaki eylem düğmeleri: TEK GÖRÜNÜM ────────────────────────────
// Hepsi aynı bileşen (Button), aynı boyut (size="sm" + h-8/text-xs) ve aynı ikon
// düzeni (h-4 w-4 mr-1) kullanır.
// KOYU ZEMİN NOTU (16.08 canlı bulgu): outline varyantı yalnız kenarlık ve
// bg-background verir, YAZI RENGİ TANIMLAMAZ. Koyu kokpit kartında (bg-sidebar)
// yazı, kartın açık renkli metnini miras alıyordu; düğme beyaz bir kutu gibi
// görünüyor, yazı ancak hover'da beliriyordu. Koyu zeminde renkler açıkça verilir.
const KART_DUGME = "h-8 text-xs";
const KOKPIT_DUGME =
  "h-8 text-xs border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground " +
  "hover:bg-accent hover:text-accent-foreground";

// ── Sol menü numaralandırması — Faz 3 ve Faz 4 ORTAK (tek kopya) ──────────────
// Bölüm başlıkları 1..n, alt maddeler bağlı olduğu başlığın numarasını alır
// (2.1, 2.2 …). Numaralar listedeki sıradan hesaplanır; bölüm eklenip
// çıkarıldığında kendiliğinden kayar. Yalnız sol menüde kullanılır; sayfadaki
// başlıklar numarasız ve küçük harf kalır. Büyük harfe çevirme Türkçe kuralına
// göre yapılır (i → İ, ı → I); CSS'in uppercase'i "Şimdi"yi "ŞIMDI" yapardı.
const trUpper = (s: string) => s.replace(/i/g, "İ").replace(/ı/g, "I").toUpperCase();
function numberMenuEntries<T extends { kind: "layer" | "section"; label: string }>(entries: T[]): T[] {
  let layerNo = 0;
  let subNo = 0;
  return entries.map((e) => {
    if (e.kind === "layer") {
      layerNo += 1;
      subNo = 0;
      return { ...e, label: `${layerNo}. ${trUpper(e.label)}` };
    }
    subNo += 1;
    return { ...e, label: layerNo > 0 ? `${layerNo}.${subNo} ${e.label}` : e.label };
  });
}

// Faz 3 sol dizini: katmanlar + çıpası olan bölümler, ekrandaki sırayla.
// Liste statiktir (Faz 3 katmanları her zaman vardır), numarası bir kez hesaplanır.
const FAZ3_MENU_ENTRIES: { id: string; label: string; kind: "layer" | "section"; hint?: string }[] =
  numberMenuEntries([
    { id: FAZ3_LAYERS[0].id, label: FAZ3_LAYERS[0].label, kind: "layer", hint: FAZ3_LAYERS[0].hint },
    { id: "faz3-uyusmazlik-konusu", label: "Uyuşmazlık konusu", kind: "section" },
    { id: "faz3-tur-tespiti", label: "Uyuşmazlık tür tespiti", kind: "section" },
    { id: FAZ3_LAYERS[3].id, label: FAZ3_LAYERS[3].label, kind: "layer", hint: FAZ3_LAYERS[3].hint },
    { id: FAZ3_LAYERS[4].id, label: FAZ3_LAYERS[4].label, kind: "layer", hint: FAZ3_LAYERS[4].hint },
    { id: FAZ3_LAYERS[5].id, label: FAZ3_LAYERS[5].label, kind: "layer", hint: FAZ3_LAYERS[5].hint },
    { id: FAZ3_LAYERS[1].id, label: FAZ3_LAYERS[1].label, kind: "layer", hint: FAZ3_LAYERS[1].hint },
    { id: FAZ3_LAYERS[2].id, label: FAZ3_LAYERS[2].label, kind: "layer", hint: FAZ3_LAYERS[2].hint },
  ]);

// ── AŞAMA 1 (tek giriş kapısı) katmanları ve sol dizini ───────────────────────
// Kalıp Faz 3/4 ile aynı: ANA KATMAN başlıkları BÜYÜK HARF (Türkçe İ ile doğrudan
// yazılır), alt katman başlıkları normal yazımdadır. İlk iki katman solda, son iki
// katman sağda çizilir; dizin sırası ekrandaki okuma sırasıdır (önce sol sütun).
const FAZ1_LAYER_BOX = "rounded-lg border bg-card p-6 space-y-4";
// Belge yüklerken "taraf seçilmedi" seçeneğinin değeri (Select boş değer kabul etmez).
const FAZ1_BELGE_TARAFSIZ = "__dosya__";
const FAZ1_LAYERS = [
  {
    id: "faz1-katman-ozet",
    label: "DOSYA ÖZETİ",
    hint: "Bu katman, uyuşmazlığın konusunu ve tür tespitini içerir; metni ve tespiti buradan girip düzeltebilirsiniz.",
  },
  {
    id: "faz1-katman-sure",
    label: "SÜREÇ TÜRÜ VE SÜRE",
    hint: "Bu katman, sürecin dava şartı mı ihtiyari mi olduğunu ve buna bağlı yasal süreyi tutar.",
  },
  {
    id: "faz1-katman-taraflar",
    label: "TARAFLAR",
    hint: "Bu katman, tarafların eklenmesi, düzenlenmesi, silinmesi ve davet gönderimini içerir.",
  },
  {
    id: "faz1-katman-belgeler",
    label: "BELGELER",
    hint: "Bu katman, dosya bazında belge yüklemeyi içerir; taraf seçimi isteğe bağlıdır.",
  },
];
// Bölüm → kapsayan katman: sol menüden bölüme atlanınca önce katman açılır.
const FAZ1_SECTION_LAYER: Record<string, string> = {
  "faz1-uyusmazlik-konusu": "faz1-katman-ozet",
  "faz1-tur-tespiti": "faz1-katman-ozet",
  "faz1-sure": "faz1-katman-sure",
  "faz1-taraf-listesi": "faz1-katman-taraflar",
  "faz1-belge-yukle": "faz1-katman-belgeler",
  "faz1-belgeler-liste": "faz1-katman-belgeler",
};
const FAZ1_SECTION_IDS = Object.keys(FAZ1_SECTION_LAYER);
const FAZ1_MENU_ENTRIES: { id: string; label: string; kind: "layer" | "section"; hint?: string }[] =
  numberMenuEntries([
    { id: FAZ1_LAYERS[0].id, label: FAZ1_LAYERS[0].label, kind: "layer", hint: FAZ1_LAYERS[0].hint },
    { id: "faz1-uyusmazlik-konusu", label: "Uyuşmazlık konusu", kind: "section" },
    { id: "faz1-tur-tespiti", label: "Uyuşmazlık tür tespiti", kind: "section" },
    { id: FAZ1_LAYERS[1].id, label: FAZ1_LAYERS[1].label, kind: "layer", hint: FAZ1_LAYERS[1].hint },
    { id: "faz1-sure", label: "Dava şartı / ihtiyari ve yasal süre", kind: "section" },
    { id: FAZ1_LAYERS[2].id, label: FAZ1_LAYERS[2].label, kind: "layer", hint: FAZ1_LAYERS[2].hint },
    { id: "faz1-taraf-listesi", label: "Taraf ekleme, düzenleme ve davet", kind: "section" },
    { id: FAZ1_LAYERS[3].id, label: FAZ1_LAYERS[3].label, kind: "layer", hint: FAZ1_LAYERS[3].hint },
    { id: "faz1-belge-yukle", label: "Belge yükle", kind: "section" },
    { id: "faz1-belgeler-liste", label: "Dosyadaki belgeler", kind: "section" },
  ]);

function Phase3PartyAnalysis({ caseRow, userId, isMediator, reload, jump }: {
  caseRow: CaseRow; userId: string; isMediator: boolean; reload: () => void;
  // Sol menüden gelen "şu katmanı aç ve oraya kay" isteği; nonce her tıklamada artar.
  jump?: { id: string; nonce: number } | null;
}) {
  // Varsayılan: Dosya özeti ve Taraflar açık, Belgeler ve araçlar kapalı.
  const [openLayers, setOpenLayers] = useState<Set<string>>(
    () => new Set(["faz3-katman-ozet", "faz3-katman-taraflar"]),
  );
  // Dosya özeti içinde yalnız tür tespiti açık gelir; uzun metin kapalı durur.
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(["faz3-tur-tespiti"]));
  // Olay zaman çizelgesi satır sayısı (katman başlığındaki sayaç için).
  const [cizelgeSayisi, setCizelgeSayisi] = useState(0);
  // Güç dengesi gösterge sayısı (katman başlığındaki sayaç için).
  const [gucSayisi, setGucSayisi] = useState(0);
  // Usule ilişkin engel sayısı (katman başlığındaki sayaç için).
  const [usulSayisi, setUsulSayisi] = useState(0);
  const toggleLayer = useCallback((id: string) => {
    setOpenLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const [parties, setParties] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState<string | null>(null);
  const [consistencyChecking, setConsistencyChecking] = useState<string | null>(null);
  const [communicationRunning, setCommunicationRunning] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<{ partyId: string; msg: string } | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statementDrafts, setStatementDrafts] = useState<Record<string, string>>({});
  const [savingStatement, setSavingStatement] = useState<string | null>(null);
  const [extractingAll, setExtractingAll] = useState(false);

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
  }, [caseRow.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Sol menüden gelen istek: katmanı (gerekirse bölümü de) aç, sonra oraya kaydır.
  // Faz 4 ile aynı kalıp; yalnız "faz3-" ile başlayan istekler işlenir.
  useEffect(() => {
    if (!jump?.id || !jump.id.startsWith("faz3-")) return;
    if (jump.id.startsWith("faz3-katman-")) {
      setOpenLayers((prev) => (prev.has(jump.id) ? prev : new Set(prev).add(jump.id)));
    } else {
      const layerId = FAZ3_SECTION_LAYER[jump.id];
      if (layerId) setOpenLayers((prev) => (prev.has(layerId) ? prev : new Set(prev).add(layerId)));
      setOpenSections((prev) => (prev.has(jump.id) ? prev : new Set(prev).add(jump.id)));
    }
    const t = setTimeout(() => {
      document.getElementById(jump.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => clearTimeout(t);
  }, [jump?.id, jump?.nonce]);

  /* 19.08 — 30 SANİYELİK BELGE SAYACI KALDIRILDI. Aynı işi artık olay + kural
     düzeni yapıyor: belge yüklenince 'belge_yuklendi' olayı düşüyor, koşucu
     ilgili kolu çalıştırıyor. Ön yüzde ikinci bir yol tutulmuyor.
     Elle "Tüm Analizi Başlat" düğmesi YERİNDE DURUYOR ve değişmedi. */

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
        const { data: inserted, error: insErr } = await supabase.from("case_documents").insert({
          case_id: caseRow.id, party_id: partyId,
          file_name: f.name, file_path: path, file_size: f.size, mime_type: f.type, uploaded_by: userId,
        } as any).select("id").single();
        if (insErr) {
          // Geri alma: satır yazılamadı, yüklenen dosya depoda kalmamalı.
          // Bu silme de FIRLATMAZ — düşerse öksüz dosya kalır, kayda geçer.
          const { error: geriErr } = await supabase.storage.from("case-documents").remove([path]);
          if (geriErr) console.error("[MediationEngine] yüklenen dosya geri alınamadı (öksüz dosya):", geriErr.message);
          throw new Error(`Veritabanı hatası: ${insErr.message}`);
        }
        // Metin çıkarma: beklemesiz (fire-and-forget) — yüklemeyi bloklamaz, hata sessizce loglanır.
        supabase.functions.invoke("extract-document-text", { body: { document_id: inserted?.id } })
          .then(({ error }) => {
            if (error) console.error("[extract-document-text] çalıştırılamadı", error.message);
          })
          .catch((e) => console.error("[extract-document-text] tetiklenemedi", e));
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
    // İki yazımın ikisi de kontrolsüzdü. Dosya silinip satır kalırsa kırık
    // referans, satır silinip dosya kalırsa KVKK kapsamında SİLİNMEMİŞ kişisel
    // veri doğar. Önce depo, sonra satır; her ikisi de raporlanır.
    const { error: depoErr } = await supabase.storage.from("case-documents").remove([d.file_path]);
    if (depoErr) {
      toast({ title: "Belge dosyası silinemedi", description: trErr(depoErr.message), variant: "destructive" });
      return;
    }
    const { error: satirErr } = await supabase.from("case_documents").delete().eq("id", d.id);
    if (satirErr) {
      toast({
        title: "Belge kaydı silinemedi",
        description: `Dosya depodan silindi ancak kayıt duruyor: ${trErr(satirErr.message)}`,
        variant: "destructive",
      });
    }
    loadAll();
  }

  async function extractAllTexts() {
    setExtractingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-document-text", {
        body: { case_id: caseRow.id },
      });
      if (error) throw error;
      const count = Array.isArray((data as any)?.results) ? (data as any).results.length : undefined;
      toast({ title: count != null ? `${count} belge işlendi` : "Çıkarma tamamlandı" });
      loadAll();
    } catch (e: any) {
      toast({ title: "Metin çıkarma başarısız", description: e?.message ?? "Bilinmeyen hata", variant: "destructive" });
    } finally {
      setExtractingAll(false);
    }
  }

  async function saveStatement(partyId: string, text: string) {
    setSavingStatement(partyId);
    try {
      const { error } = await supabase.from("case_parties").update({ statement: text }).eq("id", partyId);
      if (error) throw error;
      toast({ title: "Taraf beyanı kaydedildi" });
      loadAll();
    } catch (e: any) {
      toast({ title: "Beyan kaydedilemedi", description: trErr(e.message), variant: "destructive" });
    } finally {
      setSavingStatement(null);
    }
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

  // İç Tutarlılık Denetimi — party-consistency-check. runAnalysis'ten tamamen ayrı
  // akış: kendi state'i var, analysisError'a dokunmaz, loadAll() çağırmaz (sonuç
  // Aşama 3 kokpitinde okunur). Fonksiyonun döndürdüğü Türkçe mesaj olduğu gibi gösterilir.
  async function runConsistencyCheck(partyId: string) {
    setConsistencyChecking(partyId);
    try {
      const { data, error } = await supabase.functions.invoke("party-consistency-check", {
        body: { case_id: caseRow.id, party_id: partyId },
      });
      // Edge function 4xx/5xx döndürdüğünde Türkçe mesaj gövdede gelir; gövdeyi
      // hem data'dan hem de hata context'inden okumayı dene — jenerik mesaja düşme.
      let errMsg: string | null = (data as any)?.error ?? null;
      if (!errMsg && error) {
        try {
          const ctxBody = await (error as any)?.context?.json?.();
          errMsg = ctxBody?.error ?? null;
        } catch { /* gövde okunamadı */ }
        errMsg = errMsg ?? error.message;
      }
      if (errMsg) throw new Error(errMsg);
      const findings = Array.isArray((data as any)?.findings) ? (data as any).findings : [];
      toast(
        findings.length > 0
          ? { title: `İç tutarlılık denetimi tamamlandı — ${findings.length} bulgu`, description: "Sonuç Aşama 3 kokpitinde" }
          : { title: "Uyumsuzluk bulunmadı" }
      );
    } catch (e: any) {
      toast({
        title: "İç tutarlılık denetimi hatası",
        description: e?.message || "AI servisine ulaşılamadı.",
        variant: "destructive",
      });
    } finally { setConsistencyChecking(null); }
  }

  // İletişim Analizi — party-communication-analysis. İç Tutarlılık düğmesiyle aynı
  // kalıp: kendi state'i, analysisError'a dokunmaz, sonuç Aşama 3 kokpitinde okunur.
  async function runCommunicationAnalysis(partyId: string) {
    setCommunicationRunning(partyId);
    try {
      const { data, error } = await supabase.functions.invoke("party-communication-analysis", {
        body: { case_id: caseRow.id, party_id: partyId },
      });
      let errMsg: string | null = (data as any)?.error ?? null;
      if (!errMsg && error) {
        try {
          const ctxBody = await (error as any)?.context?.json?.();
          errMsg = ctxBody?.error ?? null;
        } catch { /* gövde okunamadı */ }
        errMsg = errMsg ?? error.message;
      }
      if (errMsg) throw new Error(errMsg);
      const findings = Array.isArray((data as any)?.findings) ? (data as any).findings : [];
      const questions = Array.isArray((data as any)?.discovery_questions) ? (data as any).discovery_questions : [];
      toast(
        findings.length > 0 || questions.length > 0
          ? {
              title: `İletişim analizi tamamlandı — ${findings.length} iz, ${questions.length} soru`,
              description: "Sonuç Aşama 3 kokpitinde",
            }
          : { title: "İletişim izi bulunmadı" }
      );
    } catch (e: any) {
      toast({
        title: "İletişim analizi hatası",
        description: e?.message || "AI servisine ulaşılamadı.",
        variant: "destructive",
      });
    } finally { setCommunicationRunning(null); }
  }

  const analysedCount = analyses.length;

  const riskLevels = analyses
    .map((a: any) => normalizeRiskLevel(a.risk_analizi?.risk_puani))
    .filter((l): l is "low" | "medium" | "high" => l !== "unknown");
  let dominantRisk: "low" | "medium" | "high" | null = null;
  if (riskLevels.length) {
    const counts: Record<string, number> = {};
    riskLevels.forEach((l) => { counts[l] = (counts[l] ?? 0) + 1; });
    dominantRisk = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as "low" | "medium" | "high";
  }
  const dominantRiskLabel = dominantRisk ? { low: "Düşük", medium: "Orta", high: "Yüksek" }[dominantRisk] : null;

  // ── Katman düzeni için türetilenler: hepsi mevcut state'ten okunur, yeni sorgu yok.
  // Katman kutusu ve durum şeridi Faz 4 ile birebir aynı kalıp.
  const layerBoxClass = "rounded-lg border bg-card p-6 space-y-4";
  const statusStripItems: { label: string; value: string }[] = [
    { label: "Taraf Analizi", value: parties.length ? `${analysedCount} / ${parties.length}` : "—" },
    { label: "Ortalama Risk Puanı", value: dominantRiskLabel ?? "Yeterli veri yok" },
    { label: "Belge", value: `${docs.length}` },
  ];
  const layerCounts: Record<string, string> = {
    "faz3-katman-ozet": "2 bölüm",
    "faz3-katman-cizelge": cizelgeSayisi > 0 ? `${cizelgeSayisi} olay` : "çıkarılmadı",
    "faz3-katman-guc": gucSayisi > 0 ? `${gucSayisi} gösterge` : "çıkarılmadı",
    "faz3-katman-usul": usulSayisi > 0 ? `${usulSayisi} eksik` : "eksik yok",
    "faz3-katman-taraflar": `${parties.length} taraf`,
    "faz3-katman-belgeler": `${docs.length} belge`,
  };

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
      <PhaseHero
        label="AŞAMA 2 — TARAF ANALİZİ"
        metrics={[
          { label: "Taraf Analizi", value: parties.length ? analysedCount : null, suffix: parties.length ? ` / ${parties.length}` : "" },
          { label: "Ortalama Risk Puanı", value: dominantRiskLabel, tone: dominantRisk ?? undefined },
        ]}
      />
      <Card className="p-6 space-y-4">
        {/* Aşama başlığı üst şeritte (PhaseHero); burada tekrarlanmaz. */}
        <p className="text-sm text-muted-foreground">
          Her tarafa ait bilgileri görüntüleyin, belge yükleyin ve AI analizi başlatın. Analizler tamamlandığında Ortak Zemin Raporu, Aşama 3 — Arabulucu Paneli'nde üretilir.
        </p>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">

        {/* ── 1. DURUM ŞERİDİ — ekranda sabit duran tek bölüm; katlanmaz ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statusStripItems.map((m, i) => (
            <div key={i} className="min-w-0">
              <div className="text-sm text-muted-foreground truncate">{m.label}</div>
              <div className="text-sm font-semibold truncate">{m.value}</div>
            </div>
          ))}
        </motion.div>

        {/* ── 2. KATMAN — Dosya özeti ── */}
        <Phase3Layer
          layer={FAZ3_LAYERS[0]}
          count={layerCounts["faz3-katman-ozet"]}
          boxClass={layerBoxClass}
          open={openLayers.has("faz3-katman-ozet")}
          onToggle={() => toggleLayer("faz3-katman-ozet")}
        >
          <CockpitCollapsible
            id="faz3-uyusmazlik-konusu"
            title="Uyuşmazlık konusu"
            open={openSections.has("faz3-uyusmazlik-konusu")}
            onToggle={() => toggleSection("faz3-uyusmazlik-konusu")}
          >
            <p className="text-sm whitespace-pre-wrap">
              {caseRow.issue_description || <span className="text-muted-foreground italic">Girilmemiş.</span>}
            </p>
          </CockpitCollapsible>
          <CockpitCollapsible
            id="faz3-tur-tespiti"
            title="Uyuşmazlık tür tespiti"
            open={openSections.has("faz3-tur-tespiti")}
            onToggle={() => toggleSection("faz3-tur-tespiti")}
          >
            {/* Ana tür + alt uzmanlık menüleri ve AI önerisi düğmesi — bileşen aynen korunur. */}
            <DisputeClassifierCard caseRow={caseRow} initialText={caseRow.title ?? ""} bare />
          </CockpitCollapsible>
        </Phase3Layer>

        {/* ── OLAY ZAMAN ÇİZELGESİ (İBA 2.3 · mimari/05 §5.2g) — yalnız arabulucu ── */}
        <Phase3Layer
          layer={FAZ3_LAYERS[3]}
          count={layerCounts["faz3-katman-cizelge"]}
          boxClass={layerBoxClass}
          open={openLayers.has("faz3-katman-cizelge")}
          onToggle={() => toggleLayer("faz3-katman-cizelge")}
        >
          <OlayCizelgesiPanel caseId={caseRow.id} onCountChange={setCizelgeSayisi} />
        </Phase3Layer>

        {/* ── GÜÇ DENGESİ (İBA 2.4) — yalnız arabulucu ── */}
        <Phase3Layer
          layer={FAZ3_LAYERS[4]}
          count={layerCounts["faz3-katman-guc"]}
          boxClass={layerBoxClass}
          open={openLayers.has("faz3-katman-guc")}
          onToggle={() => toggleLayer("faz3-katman-guc")}
        >
          <GucDengesiPanel caseId={caseRow.id} onCountChange={setGucSayisi} />
        </Phase3Layer>

        {/* ── USULE İLİŞKİN ENGELLER (İBA 2.4 / B17) — yalnız arabulucu ── */}
        <Phase3Layer
          layer={FAZ3_LAYERS[5]}
          count={layerCounts["faz3-katman-usul"]}
          boxClass={layerBoxClass}
          open={openLayers.has("faz3-katman-usul")}
          onToggle={() => toggleLayer("faz3-katman-usul")}
        >
          <UsulEngelleriPanel
            caseRow={caseRow}
            parties={parties}
            docs={docs}
            onReload={loadAll}
            onCountChange={setUsulSayisi}
          />
        </Phase3Layer>

        {/* ── 3. KATMAN — Taraflar ── */}
        <Phase3Layer
          layer={FAZ3_LAYERS[1]}
          count={layerCounts["faz3-katman-taraflar"]}
          boxClass={layerBoxClass}
          open={openLayers.has("faz3-katman-taraflar")}
          onToggle={() => toggleLayer("faz3-katman-taraflar")}
        >
          {parties.length === 0 && (
            <p className="text-sm text-muted-foreground border-t pt-3">
              Bu başvuruya henüz taraf eklenmemiş. Aşama 1 — Dosya Kurulumu ekranından en az iki taraf ekleyin, ardından bu adımda belge yükleyip analiz başlatabilirsiniz.
            </p>
          )}
        {parties.map((p) => {
          const partyDocs = docs.filter((d) => d.party_id === p.id);
          const a = analyses.find((x) => x.party_id === p.id);
          const open = openId === p.id;
          const an = a?.analysis ?? {};
          const analysisStale = !!a && a.issue_description_snapshot != null && a.issue_description_snapshot !== caseRow.issue_description;
          const riskLabelRaw = (an.risk_analizi ?? (a as any)?.risk_analizi)?.risk_puani;
          return (
            <div key={p.id} className="border-t">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : p.id)}
                className="w-full flex items-center justify-between gap-3 py-3 hover:bg-accent/30 transition text-left"
              >
                <div className="flex items-baseline gap-2 min-w-0 text-sm">
                  <span className="font-medium truncate">{partyDisplay(p)}</span>
                  <span className="text-muted-foreground truncate">
                    · {roleLabel(p.party_role)} · {partyDocs.length} belge
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {riskLabelRaw && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${riskBadgeTone(riskLabelRaw)}`}>
                      {safeText(riskLabelRaw)} risk
                    </span>
                  )}
                  {a && !riskLabelRaw && <Badge variant="secondary">Analiz hazır</Badge>}
                  {analysisStale && (
                    <Badge className="bg-amber-500 text-white gap-1">
                      <AlertTriangle className="h-3 w-3" /> Konu değişti
                    </Badge>
                  )}
                  {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              {open && (
                <div className="pb-4 space-y-5">
                  {/* Step indicator */}
                  <div className="flex items-center gap-3 text-sm">
                    <StepDot done={partyDocs.length > 0} label="1. Belge yüklendi" />
                    <span className="text-muted-foreground">→</span>
                    <StepDot done={!!a} active={analysing === p.id} label="2. AI analiz edildi" />
                  </div>

                  {/* Party info */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {p.tc_kimlik && <div><span className="text-muted-foreground">TC:</span> {p.tc_kimlik}</div>}
                    {p.tax_number && <div><span className="text-muted-foreground">Vergi No:</span> {p.tax_number}</div>}
                    {p.email && <div><span className="text-muted-foreground">E-posta:</span> {p.email}</div>}
                    {p.gsm && <div><span className="text-muted-foreground">GSM:</span> {p.gsm}</div>}
                    {p.address && <div className="col-span-2"><span className="text-muted-foreground">Adres:</span> {p.address}</div>}
                    {/* İBA 1.5 — SALT OKUMA: tercih tarafın kendi kararıdır, buradan değiştirilemez. */}
                    <IletisimTercihiSatiri partyId={p.id} />
                  </div>

                  {/* Party statement */}
                  <div className="border-t pt-4">
                    <div className="text-sm font-medium mb-2">Taraf beyanı</div>
                    <Textarea
                      rows={4}
                      placeholder="Tarafın uyuşmazlığa ilişkin kendi anlatımı, talepleri, pozisyonu..."
                      value={statementDrafts[p.id] ?? p.statement ?? ""}
                      onChange={(e) => setStatementDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveStatement(p.id, statementDrafts[p.id] ?? p.statement ?? "")}
                        disabled={savingStatement === p.id}
                      >
                        {savingStatement === p.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Beyanı Kaydet
                      </Button>
                    </div>
                  </div>

                  {/* Per-party docs */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">Belgeler</div>
                      <label className="text-sm cursor-pointer text-primary hover:underline flex items-center gap-1">
                        {uploading === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Belge Yükle
                        <input type="file" multiple className="hidden"
                          accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                          onChange={(e) => handleUpload(p.id, e)} disabled={uploading === p.id} />
                      </label>
                    </div>
                    {partyDocs.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Bu taraf için belge yok.</p>
                    ) : (
                      <ul className="divide-y">
                        {partyDocs.map((d) => (
                          <motion.li
                            key={d.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className="flex items-center gap-2 text-sm py-1.5"
                          >
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="flex-1 truncate">{d.file_name}</span>
                            <Button variant="ghost" size="sm" onClick={() => deleteDoc(d)}><Trash2 className="h-3 w-3" /></Button>
                          </motion.li>
                        ))}
                      </ul>
                    )}
                    {partyDocs.some((d) => !(d.mime_type ?? "").startsWith("text/") && !d.file_name?.toLowerCase().endsWith(".txt")) && (
                      <p className="text-sm text-muted-foreground mt-2 flex items-start gap-1.5">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        Uyarı: PDF/Word belgelerin içeriği tam okunamayabilir. Daha doğru analiz için kritik metinleri .txt olarak da yükleyebilirsiniz.
                      </p>
                    )}
                  </div>

                  <div className="border-t pt-4 space-y-3">
                  {analysisStale && (
                    <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      Uyuşmazlık konusu bu analizden sonra değişti — Analizi yeniden çalıştırın.
                    </p>
                  )}

                  {/* Analysis trigger */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => runAnalysis(p.id)} disabled={analysing === p.id}>
                      {analysing === p.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                      {a ? "Yeniden Analiz Et" : "Analiz Başlat"}
                    </Button>
                    {/* İç Tutarlılık Denetimi — ayrı fonksiyon, sonuç yalnız Aşama 3 kokpitinde görünür */}
                    <Button size="sm" variant="outline" onClick={() => runConsistencyCheck(p.id)} disabled={consistencyChecking === p.id}>
                      {consistencyChecking === p.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
                      {consistencyChecking === p.id ? "Denetleniyor..." : "İç Tutarlılık Denetimi"}
                    </Button>
                    {/* İletişim Analizi — ayrı fonksiyon, sonuç yalnız Aşama 3 kokpitinde görünür */}
                    <Button size="sm" variant="outline" onClick={() => runCommunicationAnalysis(p.id)} disabled={communicationRunning === p.id}>
                      {communicationRunning === p.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <MessageSquare className="h-4 w-4 mr-1" />}
                      {communicationRunning === p.id ? "Analiz ediliyor..." : "İletişim Analizi"}
                    </Button>
                    {analysisError?.partyId === p.id && (
                      <Button size="sm" variant="outline" onClick={() => runAnalysis(p.id)}>
                        <RefreshCw className="h-4 w-4 mr-1" /> Tekrar Dene
                      </Button>
                    )}
                  </div>
                  {/* Bu satırdaki dört düğme de model çağrısı tetikler. */}
                  <UcretliIsaret />
                  {analysisError?.partyId === p.id && (
                    <div className="text-sm text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> {analysisError.msg}
                    </div>
                  )}

                  {!a && analysing !== p.id && !analysisError && (
                    <div className="text-sm text-muted-foreground flex items-start gap-1.5">
                      <Circle className="h-4 w-4 mt-0.5 shrink-0" />
                      Analiz henüz yapılmadı. {partyDocs.length === 0 ? "Önce belge yükleyin, ardından" : ""} “Analiz Başlat” butonuna basın.
                    </div>
                  )}
                  {analysing === p.id && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Analiz yapılıyor, lütfen bekleyin…
                    </div>
                  )}
                  </div>

                  {/* Analysis result */}
                  {a && !(isMediator || p.user_id === userId) && (
                    <div className="border-t pt-4 text-sm text-muted-foreground italic">
                      Bu bölüm yalnızca arabulucu tarafından görüntülenebilir.
                    </div>
                  )}
                  {a && (isMediator || p.user_id === userId) && (
                    <div className="border-t pt-4 space-y-4">
                      <RiskAnalysisCard
                        risk={an.risk_analizi ?? (a as any).risk_analizi}
                        sources={an.sources}
                        onRefresh={() => runAnalysis(p.id)}
                        refreshing={analysing === p.id}
                      />

                      {an.dispute_area && (
                        <P3Section title="Uyuşmazlık türü">
                          <p className="text-sm">{safeText(an.dispute_area)}</p>
                        </P3Section>
                      )}
                      {an.legal_framework && (
                        <P3Section title="Hukuki çerçeve">
                          {safeList(an.legal_framework.statutes).length > 0 && (
                            <div className="text-sm">
                              <div className="font-medium">Mevzuat</div>
                              <ul className="list-disc pl-5">{safeList(an.legal_framework.statutes).map((s, i) => <li key={i}>{s}</li>)}</ul>
                            </div>
                          )}
                          {Array.isArray(an.legal_framework.precedents) && an.legal_framework.precedents.length > 0 && (
                            <div className="text-sm mt-2">
                              <div className="font-medium">Emsal kararlar</div>
                              <ul className="list-disc pl-5">
                                {an.legal_framework.precedents.map((pr: any, i: number) => (
                                  <li key={i}><b>{safeText(pr?.court)}:</b> {safeText(pr?.decision)} <span className="text-muted-foreground">— {safeText(pr?.relevance)}</span></li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </P3Section>
                      )}
                      {safeList(an.document_findings).length > 0 && (
                        <P3Section title="Belge bulguları">
                          <ul className="list-disc pl-5 text-sm">{safeList(an.document_findings).map((f, i) => <li key={i}>{f}</li>)}</ul>
                        </P3Section>
                      )}
                      {an.party_position && (
                        <P3Section title="Taraf analizi">
                          <PosBlock label="Güçlü yanlar" items={safeList(an.party_position.strengths)} />
                          <PosBlock label="Zayıf yanlar" items={safeList(an.party_position.weaknesses)} />
                          <PosBlock label="İhtiyaçlar" items={safeList(an.party_position.interests)} />
                          {an.party_position.batna && <div className="text-sm mt-1"><b>BATNA:</b> {safeText(an.party_position.batna)}</div>}
                          {an.party_position.watna && <div className="text-sm"><b>WATNA:</b> {safeText(an.party_position.watna)}</div>}
                        </P3Section>
                      )}
                      {Array.isArray(an.discovery_questions) && an.discovery_questions.length > 0 && (
                        <P3Section title="İhtiyaç soruları">
                          <ol className="list-decimal pl-5 text-sm space-y-1">
                            {an.discovery_questions.map((q: any, i: number) => <li key={i}>{safeText(q?.question ?? q)}</li>)}
                          </ol>
                        </P3Section>
                      )}
                      <SourcesPanel sources={an.sources} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        </Phase3Layer>

        {/* ── 4. KATMAN — Belgeler ve araçlar ── */}
        <Phase3Layer
          layer={FAZ3_LAYERS[2]}
          count={layerCounts["faz3-katman-belgeler"]}
          boxClass={layerBoxClass}
          open={openLayers.has("faz3-katman-belgeler")}
          onToggle={() => toggleLayer("faz3-katman-belgeler")}
        >
          <div className="border-t pt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-muted-foreground">
              Dosyada {docs.length} belge var. “Metinleri Çıkar”, yüklenen PDF/Word belgelerin
              içeriğini analiz edilebilir metne çevirir.
            </div>
            {isMediator && (
              <Button size="sm" variant="outline" onClick={extractAllTexts} disabled={extractingAll}>
                {extractingAll ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {extractingAll ? "İşleniyor..." : "Metinleri Çıkar"}
              </Button>
            )}
          </div>
        </Phase3Layer>

      </motion.div>
      </Card>
      </>
      )}
    </div>
  );
}

// Faz 3 katman kutusu — Faz 4'teki katman başlığının birebir aynısı: ana başlık +
// sağında sayaç + chevron, altında italik/ince açıklama; içerik katman açıkken görünür.
function Phase3Layer({ layer, count, boxClass, open, onToggle, children }: {
  layer: { id: string; label: string; hint: string };
  count: string; boxClass: string; open: boolean; onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div variants={itemVariants} id={layer.id} className={`${boxClass} scroll-mt-24`}>
      <button type="button" onClick={onToggle} className="w-full min-w-0 text-left">
        <div className="flex items-center gap-2">
          <div className="text-lg font-semibold">{layer.label}</div>
          <span className="text-sm text-muted-foreground">{count}</span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
        <p className="text-xs font-light italic text-muted-foreground mt-1 max-w-3xl leading-relaxed">
          {layer.hint}
        </p>
      </button>
      <div className={open ? "" : "hidden"}>{children}</div>
    </motion.div>
  );
}

function StepDot({ done, active, label }: { done: boolean; active?: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${done || active ? "text-foreground" : "text-muted-foreground"}`}>
      {done ? <CheckCircle2 className="h-4 w-4" /> : active ? <Loader2 className="h-4 w-4 animate-spin" /> : <Circle className="h-4 w-4" />}
      {label}
    </span>
  );
}

// Faz 3 analiz çıktısı için düz bölüm: kutu/arka plan yok, yalnız ince ayraç + boşluk.
// AnaSection'a dokunulmadı — o bileşen Faz 4 tarafından da kullanılıyor.
function P3Section({ title, children }: { title: string; children: React.ReactNode }) {
  if (isBlankNode(children)) return null;
  return (
    <div className="border-t pt-3">
      <div className="font-medium text-sm mb-1">{title}</div>
      {children}
    </div>
  );
}

// Treats null/undefined/boolean/whitespace-only children (the shape `{cond && ...}` leaves
// behind when cond is false) as "nothing to show" — real elements/numbers are never blank.
function isBlankNode(node: React.ReactNode): boolean {
  if (node === null || node === undefined || typeof node === "boolean") return true;
  if (typeof node === "string") return node.trim().length === 0;
  if (Array.isArray(node)) return node.every(isBlankNode);
  return false;
}
function AnaSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  if (isBlankNode(children)) return null;
  return (
    <div className="border rounded-md p-3 bg-muted/30">
      <div className="font-medium text-sm mb-1">{icon} {title}</div>
      {children}
    </div>
  );
}
// Numbered, checkable question cards for live mediation use: mediator taps the
// circle to mark a question as asked and can copy the exact wording. State is
// local/ephemeral by design — nothing here is persisted.
function CriticalQuestionsCard({ questions }: { questions: string[] }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const toggle = (i: number) => setChecked((prev) => ({ ...prev, [i]: !prev[i] }));
  const copy = (i: number, text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedIdx(i);
      setTimeout(() => setCopiedIdx((cur) => (cur === i ? null : cur)), 1500);
    }).catch(() => {});
  };
  return (
    <ol className="space-y-1.5 mt-1">
      {questions.map((q, i) => (
        <li
          key={i}
          className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors ${
            checked[i] ? "border-emerald-400/40 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-border bg-background"
          }`}
        >
          <button
            type="button"
            onClick={() => toggle(i)}
            className="mt-0.5 shrink-0"
            aria-label={checked[i] ? "Soruldu işaretini kaldır" : "Soruldu olarak işaretle"}
          >
            {checked[i] ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
          </button>
          <span className={`flex-1 ${checked[i] ? "line-through text-muted-foreground" : ""}`}>
            <span className="font-medium text-muted-foreground mr-1">{i + 1}.</span>{q}
          </span>
          <button
            type="button"
            onClick={() => copy(i, q)}
            className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border border-border hover:bg-muted"
          >
            {copiedIdx === i ? "Kopyalandı" : "Kopyala"}
          </button>
        </li>
      ))}
    </ol>
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
// Faz 4 sekmeli yerleşiminde "Ortak Zemin" sekmesi için — Ortak Çıkarlar + ZOPA + Çözüm Senaryoları.
function CommonGroundZeminSection({ data }: { data: any }) {
  // Dürüstlük bandındaki açık husus — tek state, aynı anda tek satır açık kalır.
  // Koşulsuz ve erken return'ün ÜSTÜNDE (React #310).
  const [acikBantHususu, setAcikBantHususu] = useState<number | null>(null);
  if (!data) return null;
  return (
    <div className="space-y-2">
      {/* Dürüstlük bandı (mimari §5.2i) — sunucuda hesaplanır, burada yalnız gösterilir.
          Alanı taşımayan eski raporlarda goster undefined kalır ve kart hiç çizilmez. */}
      {data.durustluk_bandi?.goster === true && (
        <div className="border rounded-lg p-4 bg-amber-50 border-amber-200 text-xs text-amber-800 space-y-2">
          <div className="font-semibold">⚠️ Dayanak Uyarısı</div>
          <p>{data.durustluk_bandi.metin}</p>
          {Array.isArray(data.durustluk_bandi.hususlar) && data.durustluk_bandi.hususlar.length > 0 && (
            <ul className="space-y-1.5">
              {data.durustluk_bandi.hususlar.map((h: any, i: number) => {
                // Gerekçe ve önerilen adım "Açıkla" altına alındı (kokpit kartındaki kalıp).
                // Yalnız bantta gelen alanlar okunur; boş alan hiç çizilmez.
                const neden = typeof h?.neden_rapora_girmedi === "string" ? h.neden_rapora_girmedi.trim() : "";
                const adim = typeof h?.onerilen_adim === "string" ? h.onerilen_adim.trim() : "";
                const acilabilir = !!(neden || adim);
                const acik = acikBantHususu === i;
                return (
                  <li key={i} className="rounded-md border border-amber-400/50 bg-amber-50/60 px-2.5 py-1.5">
                    {acilabilir ? (
                      <button
                        type="button"
                        onClick={() => setAcikBantHususu(acik ? null : i)}
                        className="w-full flex items-start justify-between gap-2 text-left"
                      >
                        <span>{h?.husus}</span>
                        <span className="shrink-0 font-medium text-amber-900 hover:underline">{acik ? "Gizle" : "Açıkla"}</span>
                      </button>
                    ) : (
                      <div>{h?.husus}</div>
                    )}
                    {acilabilir && acik && (
                      <div className="mt-1.5 space-y-1">
                        {/* Etiketler ana metin rengiyle (koyu lacivert-siyah) ve yarı kalın;
                            kart zemini her temada amber kaldığından token yerine sabit değer. */}
                        {neden && <div className="text-[11px] text-amber-700"><span className="font-medium text-[hsl(222_47%_14%)]">Neden rapora girmedi:</span> {neden}</div>}
                        {adim && <div className="text-[11px] text-amber-700"><span className="font-medium text-[hsl(222_47%_14%)]">Önerilen adım:</span> {adim}</div>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="text-[11px] text-amber-700">
            Bu uyarı yalnız size görünür; taraflara hiçbir ekranda açılmaz. {data.durustluk_bandi.toplam_rapor_disi} rapor dışı kayıttan üretildi.
          </div>
        </div>
      )}
      {data.common_interests?.length > 0 && (
        <AnaSection icon="🤝" title="Ortak Çıkarlar">
          <ul className="space-y-1.5 text-sm">
            {data.common_interests.map((s: string, i: number) => (
              <li key={i} className="flex items-start gap-2 rounded-md border border-emerald-400/50 bg-emerald-50/60 dark:bg-emerald-950/20 px-2.5 py-1.5">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
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
            {data.scenarios.map((sc: any, i: number) => {
              const isStarred = /⭐/.test(`${sc.label ?? ""} ${sc.summary ?? ""}`);
              return (
                <div
                  key={i}
                  className={`border rounded p-2 bg-background transition-shadow hover:shadow-sm hover:border-primary/40 ${
                    isStarred ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : ""
                  }`}
                >
                  <div className="font-medium text-sm">{sc.label}</div>
                  <p className="text-sm">{sc.summary}</p>
                  {sc.tradeoffs?.length > 0 && (
                    <ul className="list-disc pl-5 text-xs text-muted-foreground">{sc.tradeoffs.map((t: string, j: number) => <li key={j}>{t}</li>)}</ul>
                  )}
                </div>
              );
            })}
          </div>
        </AnaSection>
      )}
    </div>
  );
}

// Faz 4 sekmeli yerleşiminde "Strateji" sekmesi için — Arabulucu Stratejisi + Kırmızı Çizgiler + Kaynaklar.
function CommonGroundStrategySection({ data, strategy }: { data: any; strategy: any }) {
  if (!data) return null;
  // `report.report.mediator_strategy` (data.mediator_strategy) is the freshly-parsed AI
  // output written on every regenerate and is the field this tab is meant to show. The
  // separate `strategy` column is a denormalized copy from the same write — for rows saved
  // before its shape settled it can hold different/legacy keys while still being non-empty,
  // so treating it as the priority source shows stale content even though data.mediator_strategy
  // is populated. Read data.mediator_strategy first; `strategy` is only a fallback for the
  // (now hypothetical) case where the report JSON itself never got a mediator_strategy key.
  const rawStrategy = data.mediator_strategy && Object.keys(data.mediator_strategy).length > 0
    ? data.mediator_strategy
    : (strategy || {});
  const openingStatement = safeText(rawStrategy.opening_statement);
  // AI output occasionally returns array items as objects instead of strings (see safeList) —
  // mapping them straight into JSX throws "Objects are not valid as a React child" and, since
  // Phase4Summary has no error boundary, blanks the whole Strateji tab.
  const criticalQuestions = safeList(rawStrategy.critical_questions);
  const deadlockTechniques = safeList(rawStrategy.deadlock_techniques);
  const redLines = safeList(data.red_lines);
  const hasStrategyContent = !!openingStatement || criticalQuestions.length > 0 || deadlockTechniques.length > 0;
  return (
    <div className="space-y-2">
      {hasStrategyContent && (
        <AnaSection icon="🎯" title="Arabulucu Stratejisi">
          <div className="text-sm space-y-1">
            {openingStatement && <div><b>Açılış:</b> {openingStatement}</div>}
            {criticalQuestions.length > 0 && (
              <div><b>Kritik Sorular:</b><CriticalQuestionsCard questions={criticalQuestions} /></div>
            )}
            {deadlockTechniques.length > 0 && (
              <div><b>Çıkmaz Teknikleri:</b><ul className="list-disc pl-5">{deadlockTechniques.map((q, i) => <li key={i}>{q}</li>)}</ul></div>
            )}
          </div>
        </AnaSection>
      )}
      {redLines.length > 0 && (
        <AnaSection icon="🚧" title="Kırmızı Çizgiler">
          <ul className="space-y-1.5 text-sm">
            {redLines.map((s, i) => (
              <li key={i} className="flex items-start gap-2 rounded-md border border-red-400/50 bg-red-50/60 dark:bg-red-950/20 px-2.5 py-1.5">
                <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </AnaSection>
      )}
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
    // A party's explicit "Yeterli veri yok" is a deliberate judgment, not an absent
    // value — averaging the other party's number over it would misrepresent that as consensus.
    if (rows.some((r) => isMissing(r.uzlasma_orani))) return null;
    const vals = rows.map((r) => r.uzlasma_pct).filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [rows]);

  const hasOfficialRiskOzeti =
    !isMissing(reportData?.risk_ozeti?.genel_uzlasma_orani) || !isMissing(reportData?.risk_ozeti?.genel_risk_puani);

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
        // supabase-js hata FIRLATMAZ: `error` okunmazsa aşağıdaki console.warn
        // hiç çalışmaz ve yazım sessizce kaybolur. Bu alan türetilmiştir
        // (her açılışta yeniden hesaplanır), o yüzden kullanıcı uyarılmaz —
        // ama kayıt sessiz de kalmaz.
        const { error: yazErr } = await supabase.from("common_ground_reports")
          .update({ risk_ozeti: summary as any, report: nextReport as any })
          .eq("id", (existing as any).id);
        if (yazErr) console.warn("[ComparativeRiskAnalysis] persist failed", yazErr.message);
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
          Taraf analizlerinde henüz <code className="font-mono">risk_analizi</code> alanı yok. Aşama 2'de "Risk Analizini Güncelle" butonu ile her taraf için risk analizini yeniden üretin.
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-primary/5 border-primary/30">
      <div className="font-semibold text-sm">📊 Karşılaştırmalı Risk & Anlaşma Analizi</div>


      <div className="grid sm:grid-cols-2 gap-2">
        {rows.map((r, i) => (
          <div key={i} className="border rounded p-3 bg-background text-sm space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium truncate">{r.name}</div>
              {r.risk_puani && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${riskBadgeTone(r.risk_puani)}`}>{r.risk_puani}</span>
              )}
            </div>
            {r.uzlasma_pct !== null ? (
              <GaugeMeter label="Anlaşma oranı" pct={r.uzlasma_pct} valueLabel={r.uzlasma_orani || `% ${r.uzlasma_pct}`} riskLabel={r.risk_puani} />
            ) : (
              <div className="text-xs"><span className="text-muted-foreground">Anlaşma oranı: </span><b>{r.uzlasma_orani || "Yeterli veri yok"}</b></div>
            )}
            {r.mahkeme_pct !== null ? (
              <GaugeMeter label="Mahkeme riski" pct={r.mahkeme_pct} valueLabel={r.mahkeme_riski || `% ${r.mahkeme_pct}`} riskLabel={r.risk_puani} />
            ) : (
              <div className="text-xs"><span className="text-muted-foreground">Mahkeme riski: </span><b>{r.mahkeme_riski || "Yeterli veri yok"}</b></div>
            )}
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {!hasOfficialRiskOzeti && (
          <div className="border rounded p-3 bg-background space-y-1">
            <div className="text-xs text-muted-foreground">Genel Uzlaşma Tahmini (ortalama)</div>
            {avgUzlasma !== null ? (
              <>
                <div className="text-lg font-semibold">% {avgUzlasma}</div>
                <Progress value={avgUzlasma} className={`h-2 ${gaugeBarClass(pctToRiskLabel(avgUzlasma))}`} />
              </>
            ) : (
              <div className="text-lg font-semibold">Yeterli veri yok</div>
            )}
            <div className="text-[11px] text-muted-foreground mt-1 italic">Basit aritmetik ortalamadır; resmi tahmin için Ortak Zemin Raporu üretin.</div>
          </div>
        )}

        <div className="border rounded p-3 bg-background">
          <div className="text-xs text-muted-foreground">Uzlaşma Alanı (ZOPA)</div>
          {zopa && (zopa.lower_bound || zopa.upper_bound || zopa.description) ? (
            <>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted">{zopa.lower_bound || "?"}</span>
                <span className="text-muted-foreground text-xs">↔</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted">{zopa.upper_bound || "?"}</span>
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
export function riskBadgeTone(raw?: string): string {
  switch (normalizeRiskLevel(raw)) {
    case "high": return "bg-red-600 text-white";
    case "medium": return "bg-amber-500 text-white";
    case "low": return "bg-emerald-600 text-white";
    default: return "bg-muted text-foreground";
  }
}
// Same palette as riskBadgeTone, applied to a <Progress> indicator via the
// Radix child selector (Progress hardcodes bg-primary on its own indicator).
function gaugeBarClass(raw?: string): string {
  switch (normalizeRiskLevel(raw)) {
    case "high": return "[&>div]:bg-red-600";
    case "medium": return "[&>div]:bg-amber-500";
    case "low": return "[&>div]:bg-emerald-600";
    default: return "[&>div]:bg-primary";
  }
}
// For percentages with no categorical risk_puani of their own (e.g. a plain
// average): higher = more favorable, so map magnitude onto the same tone words.
function pctToRiskLabel(pct: number): string {
  if (pct >= 60) return "düşük";
  if (pct >= 35) return "orta";
  return "yüksek";
}
// Renders a single percentage metric as a colored <Progress> bar reusing the
// existing risk tone palette. Callers must only use this once the value has
// been confirmed numeric (parsePercent) — "Yeterli veri yok" stays as text.
function GaugeMeter({
  label, pct, valueLabel, riskLabel,
}: { label: string; pct: number; valueLabel: string; riskLabel?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold">{valueLabel}</span>
      </div>
      <Progress value={Math.min(100, Math.max(0, pct))} className={`h-2 ${gaugeBarClass(riskLabel)}`} />
    </div>
  );
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
  const badgeTone = riskBadgeTone(risk.risk_puani);
  const missingAny =
    isMissing(risk.uzlasma_orani) || isMissing(risk.mahkeme_riski) || isMissing(risk.tahmini_sure_tasarrufu_ay);
  // Deterministic — dedup'd straight from the RAG chunks actually retrieved, not the
  // model's own kaynak_listesi (which the künye/precedent-hallucination rule can blank
  // out even when real non-precedent sources were used).
  const kaynakNames = Array.from(new Set(
    (Array.isArray(sources) ? sources : []).map((s: any) => String(s?.title ?? "").trim()).filter(Boolean)
  ));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="font-medium text-sm">Risk analizi ve anlaşma oranı</div>
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
          {parsePercent(risk.uzlasma_orani) !== null ? (
            <GaugeMeter label="Anlaşma Oranı" pct={parsePercent(risk.uzlasma_orani)!} valueLabel={safeText(risk.uzlasma_orani)} riskLabel={risk.risk_puani} />
          ) : (
            <>
              <div className="text-xs text-muted-foreground">Anlaşma Oranı</div>
              <div className="font-medium">{safeText(risk.uzlasma_orani) || "Yeterli veri yok"}</div>
            </>
          )}
          {risk.uzlasma_orani_kaynak && <div className="text-[11px] text-muted-foreground italic">Kaynak: {safeText(risk.uzlasma_orani_kaynak)}</div>}
        </div>
        <div>
          {parsePercent(risk.mahkeme_riski) !== null ? (
            <GaugeMeter label="Mahkeme Riski" pct={parsePercent(risk.mahkeme_riski)!} valueLabel={safeText(risk.mahkeme_riski)} riskLabel={risk.risk_puani} />
          ) : (
            <>
              <div className="text-xs text-muted-foreground">Mahkeme Riski</div>
              <div className="font-medium">{safeText(risk.mahkeme_riski) || "Yeterli veri yok"}</div>
            </>
          )}
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
          BATNA (dava yolu) ile menfaat/pozisyon ayrımını Aşama 1/2 formunda doldurun. Ardından
          <b> "Risk Analizini Güncelle"</b> butonuyla yeniden hesaplatın.
        </MissingDataHint>
      )}
      {safeList(risk.kritik_faktorler).length > 0 && (
        <div>
          <div className="text-sm font-medium mb-1">Kritik faktörler</div>
          <ul className="list-disc pl-5 text-sm">{safeList(risk.kritik_faktorler).map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {safeList(risk.uzlasma_engelleri).length > 0 && (
        <div>
          <div className="text-sm font-medium mb-1">Uzlaşma engelleri</div>
          <ul className="list-disc pl-5 text-sm">{safeList(risk.uzlasma_engelleri).map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {kaynakNames.length > 0 && (
        <div className="text-sm">
          <div className="font-medium mb-1">Kullanılan kaynaklar</div>
          <div className="flex flex-wrap gap-1">
            {kaynakNames.map((name, i) => (
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

// 25.08.2026 — `RiskSummaryCard` KALDIRILDI. Hiçbir yerden render edilmiyordu.
// Görünümü kokpit panelleri devraldı (bkz. Aşama 4'teki `hidden` sarmalayıcı:
// `ComparativeRiskAnalysis` yalnız `risk_ozeti` üretmek için çalışıyor, kart
// göstermiyor). Salt sunum bileşeniydi; veri yazmıyordu, veri kaybı yok.



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

const STORAGE_SOURCE_PREFIX = "storage://case-documents/";

// Elle yüklenen kaynaklar storage://case-documents/... sözde-URL'i ile geliyor; bu tarayıcıda
// açılamaz. CaseDocuments.tsx:88-104'teki desenin aynısı: prefix'i ayıklayıp Supabase Storage'dan
// authenticated indirip blob URL olarak yeni sekmede açıyoruz.
async function openStorageSource(sourceUrl: string, page?: number | null) {
  const path = sourceUrl.replace(STORAGE_SOURCE_PREFIX, "");
  const pageSuffix = Number.isFinite(page) && (page as number) > 0 ? `#page=${page}` : "";
  try {
    // İmzalı URL: gerçek https adresi olduğundan Chrome PDF görüntüleyicisi #page=N ile
    // sayfaya atlayabiliyor — blob URL'de bu atlamıyordu (canlıda doğrulandı).
    const { data: signed, error: signErr } = await supabase.storage
      .from("case-documents")
      .createSignedUrl(path, 300);
    if (!signErr && signed?.signedUrl) {
      window.open(`${signed.signedUrl}${pageSuffix}`, "_blank", "noopener,noreferrer");
      return;
    }
  } catch { /* imzalı URL alınamadı — aşağıdaki blob yedeğine düş */ }

  try {
    const { data, error } = await supabase.storage.from("case-documents").download(path);
    if (error || !data) throw error ?? new Error("Dosya indirilemedi.");
    const blobUrl = URL.createObjectURL(data);
    window.open(`${blobUrl}${pageSuffix}`, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
  } catch (e: any) {
    // Ham depo hatası yerine ayırt edici cümle (bkz. src/lib/depoHatasi.ts).
    toast({ title: "Kaynak açılamadı", description: depoHataMetni(e), variant: "destructive" });
  }
}

function SourcesPanel({ sources }: { sources?: any[] }) {
  const list = Array.isArray(sources) ? sources : [];
  // storage:// kaynaklar artık uygulama içi görüntüleyicide açılır; https (Bakanlık
  // kitapları) kaynaklarda bugünkü yeni-sekme davranışı birebir korunur.
  const [viewerSource, setViewerSource] = useState<ViewerSource | null>(null);
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
    <>
    <SourceViewerDialog
      source={viewerSource}
      onOpenChange={(o) => { if (!o) setViewerSource(null); }}
      onOpenExternal={() => {
        const u = viewerSource?.url;
        if (!u) return;
        // storage:// → imzalı URL akışı (değişmedi); adb kitapları → bugünkü doğrudan
        // bağlantı (proxy'siz, #page=N ile).
        if (u.startsWith(STORAGE_SOURCE_PREFIX)) openStorageSource(u, viewerSource?.page);
        else window.open(viewerSource?.page ? `${u}#page=${viewerSource.page}` : u, "_blank", "noopener,noreferrer");
      }}
    />
    <AnaSection icon="📚" title={`Kullanılan Kaynaklar (${list.length})`}>
      <p className="text-[11px] text-muted-foreground mb-2">
        Bu çıktı, Adalet Bakanlığı Arabuluculuk Daire Başkanlığı resmi yayınlarından alınan aşağıdaki bölümlerden yararlanılarak üretildi.
        {list.length < 5 && (
          <> Bu konu için bilgi tabanında yalnızca <b>{list.length}</b> ilgili bölüm bulundu; en alakalıları gösteriliyor.</>
        )}
      </p>
      <ol className="space-y-2 text-sm list-decimal pl-5">
        {list.map((s: any, i: number) => {
          const isStorageSource = typeof s.url === "string" && s.url.startsWith(STORAGE_SOURCE_PREFIX);
          // Bakanlık kitapları da uygulama içi görüntüleyicide açılır (belge
          // knowledge-pdf-proxy üzerinden çekilir). Bu önekle başlamayan diğer https
          // kaynaklar bugünkü yeni-sekme davranışında kalır.
          const isViewerSource = isStorageSource || (typeof s.url === "string" && s.url.startsWith(ADB_SOURCE_PREFIX));
          const href = typeof s.url === "string" && s.url.startsWith("https") && s.page
            ? `${s.url}#page=${s.page}`
            : s.url;
          return (
            <li key={i} className="border rounded p-2 bg-background">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">
                  {isViewerSource ? (
                    <button
                      type="button"
                      onClick={() => setViewerSource({ title: s.title, url: s.url, page: s.page, excerpt: s.excerpt })}
                      className="text-primary hover:underline cursor-pointer bg-transparent border-0 p-0 font-medium"
                    >
                      {s.title || "Kaynak"}
                    </button>
                  ) : s.url ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
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
          );
        })}
      </ol>
    </AnaSection>
    </>
  );
}

function buildReportHtml(opts: { caseTitle?: string; caseId: string; report: any; strategy: any; sources: any[]; analyses?: any[]; generatedAt: Date; }): string {
  const { caseTitle, caseId, report, strategy, sources, analyses, generatedAt } = opts;
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

  const partyList = Array.isArray(analyses) ? analyses : [];
  const partyAnalysesHtml = partyList.map((a: any, i: number) => {
    const cp = a.case_parties || {};
    const name = cp.company_name || `${cp.first_name ?? ""} ${cp.last_name ?? ""}`.trim() || `Taraf ${i + 1}`;
    const an = a.analysis || {};
    const pp = an.party_position || {};
    const risk = a.risk_analizi ?? an.risk_analizi ?? {};
    return `
    <div class="card">
      <h4>${esc(name)}${cp.party_role ? ` <span class="muted">(${esc(roleLabel(cp.party_role))})</span>` : ""}</h4>
      ${an.dispute_area ? `<p><b>Uyuşmazlık Türü:</b> ${esc(an.dispute_area)}</p>` : ""}
      <p class="muted"><b>Pozisyon — Güçlü Yanlar:</b></p>${list(pp.strengths || [])}
      <p class="muted"><b>Pozisyon — Zayıf Yanlar:</b></p>${list(pp.weaknesses || [])}
      <p class="muted"><b>Çıkarlar / İhtiyaçlar:</b></p>${list(pp.interests || [])}
      <p><b>BATNA:</b> ${esc(pp.batna || "Yeterli veri yok")}</p>
      <p><b>WATNA:</b> ${esc(pp.watna || "Yeterli veri yok")}</p>
      <p><b>Risk Değerlendirmesi:</b></p>
      <ul>
        <li>Risk Puanı: ${esc(risk.risk_puani || "Yeterli veri yok")}</li>
        <li>Anlaşma Oranı: ${esc(risk.uzlasma_orani || "Yeterli veri yok")}${risk.uzlasma_orani_kaynak ? ` <span class="muted">(${esc(risk.uzlasma_orani_kaynak)})</span>` : ""}</li>
        <li>Mahkeme Riski: ${esc(risk.mahkeme_riski || "Yeterli veri yok")}${risk.mahkeme_riski_kaynak ? ` <span class="muted">(${esc(risk.mahkeme_riski_kaynak)})</span>` : ""}</li>
        <li>Tahmini Süre Tasarrufu: ${esc(risk.tahmini_sure_tasarrufu_ay || "Yeterli veri yok")}</li>
      </ul>
      ${risk.kritik_faktorler?.filter(Boolean)?.length ? `<p class="muted"><b>Kritik Faktörler:</b></p>${list(risk.kritik_faktorler)}` : ""}
      ${risk.uzlasma_engelleri?.filter(Boolean)?.length ? `<p class="muted"><b>Uzlaşma Engelleri:</b></p>${list(risk.uzlasma_engelleri)}` : ""}
      ${risk.oneri ? `<p><b>Öneri:</b> ${esc(risk.oneri)}</p>` : ""}
    </div>`;
  }).join("");

  const comparativeRows = partyList.map((a: any, i: number) => {
    const cp = a.case_parties || {};
    const name = cp.company_name || `${cp.first_name ?? ""} ${cp.last_name ?? ""}`.trim() || `Taraf ${i + 1}`;
    const risk = a.risk_analizi || {};
    return `<li><b>${esc(name)}</b> — Risk Puanı: ${esc(risk.risk_puani || "Yeterli veri yok")}; Anlaşma Oranı: ${esc(risk.uzlasma_orani || "Yeterli veri yok")}; Mahkeme Riski: ${esc(risk.mahkeme_riski || "Yeterli veri yok")}</li>`;
  }).join("");
  const comparativeHtml = partyList.length
    ? `<ul>${comparativeRows}</ul>`
    : `<p class="muted">Karşılaştırmalı risk verisi için taraf analizi bulunamadı.</p>`;

  const ozet = r.risk_ozeti || {};
  const hasOzet = ozet && Object.keys(ozet).length > 0;
  const ozetTarafKarsilastirma = Array.isArray(ozet.taraf_karsilastirma) ? ozet.taraf_karsilastirma : [];
  const riskOzetiHtml = hasOzet ? `
    <p><b>Genel Uzlaşma Tahmini:</b> ${esc(ozet.genel_uzlasma_orani || "Yeterli veri yok")}${ozet.genel_uzlasma_orani_kaynak ? ` <span class="muted">(${esc(ozet.genel_uzlasma_orani_kaynak)})</span>` : ""}</p>
    <p><b>Genel Risk Puanı:</b> ${esc(ozet.genel_risk_puani || "Yeterli veri yok")}</p>
    ${ozetTarafKarsilastirma.length ? `<p class="muted"><b>Taraf Karşılaştırması:</b></p><ul>${ozetTarafKarsilastirma.map((t: any) => `<li><b>${esc(t.taraf || "Taraf")}</b>${t.risk_puani ? ` (${esc(t.risk_puani)})` : ""}${t.guclu_yon ? ` — ✓ ${esc(t.guclu_yon)}` : ""}${t.zayif_yon ? ` — ✗ ${esc(t.zayif_yon)}` : ""}</li>`).join("")}</ul>` : ""}
    ${ozet.ortak_kritik_faktorler?.filter(Boolean)?.length ? `<p class="muted"><b>Ortak Kritik Faktörler:</b></p>${list(ozet.ortak_kritik_faktorler)}` : ""}
    ${ozet.ortak_uzlasma_engelleri?.filter(Boolean)?.length ? `<p class="muted"><b>Ortak Uzlaşma Engelleri:</b></p>${list(ozet.ortak_uzlasma_engelleri)}` : ""}
    ${ozet.arabulucu_onerisi ? `<p><b>Arabulucu Önerisi:</b> ${esc(ozet.arabulucu_onerisi)}</p>` : ""}
  ` : `<p class="muted">Yeterli veri yok</p>`;

  const srcHtml = (sources && sources.length)
    ? `<ol>${sources.map((x: any) => `
        <li>
          <b>${esc(x.title || "Kaynak")}</b>${x.category ? ` <span class="muted">[${esc(x.category)}]</span>` : ""}
          ${typeof x.similarity === "number" ? ` <span class="muted">— benzerlik %${Math.round(x.similarity * 100)}</span>` : ""}
          ${x.url ? `<br/><a href="${esc(x.url)}">${esc(x.url)}</a>` : ""}
          ${x.excerpt ? `<blockquote>"${esc(cleanExcerpt(x.excerpt))}"</blockquote>` : ""}
        </li>`).join("")}</ol>`
    : `<p class="muted">İlgili resmi kaynak bulunamadı.</p>`;

  // Dürüstlük bandı (mimari §5.2i) — ekrandaki kartla aynı içerik, mevcut .card/.muted
  // stilleriyle düz metin. Alan yoksa veya goster false ise hiçbir şey eklenmez.
  const band = r.durustluk_bandi;
  const bandHtml = band?.goster === true ? `
<div class="card">
<h4>⚠️ Dayanak Uyarısı</h4>
<p>${esc(band.metin || "")}</p>
${Array.isArray(band.hususlar) && band.hususlar.length ? `<ul>${band.hususlar.map((h: any) => `<li>${esc(h?.husus || "")}${h?.onerilen_adim ? `<br/><span class="muted">${esc(h.onerilen_adim)}</span>` : ""}</li>`).join("")}</ul>` : ""}
<p class="muted">Bu uyarı yalnız size görünür; taraflara hiçbir ekranda açılmaz. ${esc(String(band.toplam_rapor_disi ?? 0))} rapor dışı kayıttan üretildi.</p>
</div>` : "";
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
.confidential{background:#fef2f2;border:2px solid #dc2626;color:#991b1b;font-weight:600;text-align:center;padding:8px 12px;border-radius:6px;margin-bottom:16px}
@media print{body{margin:0}}
</style></head><body>
<div class="confidential">GİZLİ — Yalnızca Arabulucu İçindir (6325 s.K. m.4/m.33)</div>
<h1>Ortak Zemin Raporu</h1>
${bandHtml}
<div class="meta"><b>Başvuru:</b> ${esc(caseTitle || "—")} &nbsp;•&nbsp; <b>ID:</b> ${esc(caseId)} &nbsp;•&nbsp; <b>Oluşturulma:</b> ${generatedAt.toLocaleString("tr-TR")}</div>

<h2>Taraf Analizleri</h2>${partyAnalysesHtml || `<p class="muted">Taraf analizi bulunamadı.</p>`}

<h2>Ortak Çıkarlar</h2>${list(r.common_interests || [])}

<h2>ZOPA (Olası Anlaşma Aralığı)</h2>
${r.zopa ? `<p>${esc(r.zopa.description || "")}</p><p class="muted">Alt sınır: ${esc(r.zopa.lower_bound || "—")} • Üst sınır: ${esc(r.zopa.upper_bound || "—")}</p>` : `<p class="muted">—</p>`}

<h2>Çözüm Senaryoları</h2>${scenarios || `<p class="muted">—</p>`}

<h2>Arabulucu Stratejisi</h2>
${s.opening_statement ? `<p><b>Açılış:</b> ${esc(s.opening_statement)}</p>` : ""}
${s.critical_questions?.length ? `<p><b>Kritik Sorular:</b></p>${list(s.critical_questions)}` : ""}
${s.deadlock_techniques?.length ? `<p><b>Tıkanıklık Teknikleri:</b></p>${list(s.deadlock_techniques)}` : ""}

<h2>Kırmızı Çizgiler</h2>${list(r.red_lines || [])}

<h2>Karşılaştırmalı Risk Analizi</h2>${comparativeHtml}

<h2>Risk Özeti</h2>${riskOzetiHtml}

<h2>📚 Kullanılan Kaynaklar (${(sources || []).length})</h2>
<p class="muted">Adalet Bakanlığı Arabuluculuk Daire Başkanlığı resmi yayınlarından.</p>
${srcHtml}

<div class="meta" style="margin-top:32px;text-align:center">MediPact AI tarafından oluşturuldu • ${generatedAt.toLocaleString("tr-TR")}</div>
</body></html>`;
}

function downloadReport(opts: { caseTitle?: string; caseId: string; report: any; strategy: any; analyses?: any[]; mode: "print" | "html" }) {
  const sources = opts.report?.sources || [];
  const html = buildReportHtml({ caseTitle: opts.caseTitle, caseId: opts.caseId, report: opts.report, strategy: opts.strategy, sources, analyses: opts.analyses, generatedAt: new Date() });
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

// Genel Bakış kokpitinin kendisinin brifing çıktısı — Ortak Zemin Raporu'ndan (buildReportHtml)
// ayrı: kokpit sırasını (uzlaşma → ZOPA → karşılaştırma → senaryolar → engeller → öneri) birebir izler.
function buildCockpitBriefingHtml(opts: {
  caseTitle?: string; caseId: string; generatedAt: Date;
  uzlasmaPct: number | null; uzlasmaKaynak?: string; riskPuani?: string;
  zopa: any; tarafKarsilastirma: any[]; scenarios: any[];
  criticalFactors: string[]; redLines: string[]; obstacles: string[];
  mediatorOneri?: string; kaynakListesi: string[]; sources?: any[];
}): string {
  const { caseTitle, caseId, generatedAt, uzlasmaPct, uzlasmaKaynak, riskPuani, zopa, tarafKarsilastirma, scenarios, criticalFactors, redLines, obstacles, mediatorOneri, kaynakListesi, sources } = opts;
  const esc = (v: any) => String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" } as any)[c]);
  const list = (arr: string[]) => (arr && arr.length ? `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="muted">Yeterli veri yok</p>`);
  const dateLabel = generatedAt.toLocaleString("tr-TR");
  const fileTitle = `Kokpit Brifingi — ${caseTitle || caseId} — ${generatedAt.toLocaleDateString("tr-TR")}`;

  const zopaHtml = (zopa && (zopa.lower_bound || zopa.upper_bound || zopa.description))
    ? `<p><b>Alt Sınır:</b> ${esc(zopa.lower_bound || "—")} &nbsp;•&nbsp; <b>Üst Sınır:</b> ${esc(zopa.upper_bound || "—")}</p>
       <p><b>Örtüşme:</b> ${esc(zopa.description || "Yeterli veri yok")}</p>`
    : `<p class="muted">Yeterli veri yok</p>`;

  const comparisonHtml = tarafKarsilastirma.length
    ? `<table><thead><tr><th>Taraf</th><th>Risk Puanı</th><th>Güçlü Yön</th><th>Zayıf Yön</th></tr></thead><tbody>
        ${tarafKarsilastirma.map((t: any) => `<tr>
          <td>${esc(t?.taraf || "Taraf")}</td>
          <td>${esc(t?.risk_puani || "—")}</td>
          <td>${esc(t?.guclu_yon || "—")}</td>
          <td>${esc(t?.zayif_yon || "—")}</td>
        </tr>`).join("")}
       </tbody></table>`
    : `<p class="muted">Yeterli veri yok</p>`;

  const scenariosHtml = scenarios.length
    ? scenarios.map((sc: any, i: number) => `
      <div class="card">
        <h4>${String.fromCharCode(65 + i)}) ${esc(sc?.label || "Senaryo")}</h4>
        <p>${esc(sc?.summary || "Yeterli veri yok")}</p>
        ${sc?.tradeoffs?.length ? `<p class="muted"><b>Ödünler:</b></p>${list(sc.tradeoffs)}` : ""}
      </div>`).join("")
    : `<p class="muted">Yeterli veri yok</p>`;

  const kaynaklarHtml = kaynakListesi.length
    ? `<ol>${kaynakListesi.map((name) => {
        const src = matchSource(name, sources);
        return `<li>${esc(name)}${src?.url ? ` — <a href="${esc(src.url)}">${esc(src.url)}</a>` : ""}</li>`;
      }).join("")}</ol>`
    : `<p class="muted">Yeterli veri yok</p>`;

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>${esc(fileTitle)}</title>
<style>
body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;max-width:780px;margin:20px auto;padding:0 20px;color:#1f2937;line-height:1.45;font-size:13px}
h1{color:#0f766e;border-bottom:2px solid #0f766e;padding-bottom:5px;font-size:20px;margin-bottom:4px}
h2{color:#0f766e;margin:16px 0 6px;border-bottom:1px solid #e5e7eb;padding-bottom:3px;font-size:14px}
h4{margin:4px 0;font-size:13px}
.muted{color:#6b7280;font-size:12px}
.card{border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;margin:6px 0;background:#f9fafb}
ul,ol{padding-left:18px;margin:4px 0}
table{width:100%;border-collapse:collapse;margin:6px 0;font-size:12px}
th,td{border:1px solid #e5e7eb;padding:4px 6px;text-align:left;vertical-align:top}
th{background:#f0fdfa;color:#0f766e}
.meta{color:#6b7280;font-size:11px;margin-bottom:12px}
.confidential{background:#fef2f2;border:2px solid #dc2626;color:#991b1b;font-weight:600;text-align:center;padding:6px 10px;border-radius:6px;margin-bottom:12px;font-size:12px}
.hero{background:#f0fdfa;border:1px solid #0f766e;border-radius:8px;padding:10px 14px;margin:10px 0;text-align:center}
.hero .pct{font-size:34px;font-weight:700;color:#0f766e}
.hero .label{font-size:11px;color:#0f766e;text-transform:uppercase;letter-spacing:.08em}
.recommendation{border:2px solid #0f766e;background:#f0fdfa;border-radius:8px;padding:10px 12px;font-style:italic}
@media print{body{margin:0;font-size:12px}.card{break-inside:avoid}}
</style></head><body>
<div class="confidential">GİZLİ — Yalnızca Arabulucu İçindir (6325 s.K. m.4/m.33)</div>
<h1>Kokpit Brifingi</h1>
<div class="meta"><b>Başvuru:</b> ${esc(caseTitle || "—")} &nbsp;•&nbsp; <b>ID:</b> ${esc(caseId)} &nbsp;•&nbsp; <b>Oluşturulma:</b> ${dateLabel}</div>

<div class="hero">
  <div class="pct">${uzlasmaPct !== null ? `%${uzlasmaPct}` : "Yeterli veri yok"}</div>
  <div class="label">Genel Uzlaşma Tahmini${riskPuani ? ` &nbsp;•&nbsp; Risk: ${esc(riskPuani)}` : ""}</div>
  ${uzlasmaKaynak ? `<div class="muted">${esc(uzlasmaKaynak)}</div>` : ""}
</div>

<h2>Uzlaşma Alanı (ZOPA)</h2>${zopaHtml}

<h2>Güçlü ve Zayıf Yanlar</h2>${comparisonHtml}

<h2>Çözüm Senaryoları</h2>${scenariosHtml}

<h2>Kritik Faktörler</h2>${list(criticalFactors)}

<h2>Kırmızı Çizgiler</h2>${list(redLines)}

<h2>Uzlaşma Engelleri</h2>${list(obstacles)}

<h2>Arabulucu Önerisi</h2>${mediatorOneri ? `<div class="recommendation">${esc(mediatorOneri)}</div>` : `<p class="muted">Yeterli veri yok</p>`}

<h2>Kaynaklar</h2>${kaynaklarHtml}

<div class="meta" style="margin-top:20px;text-align:center">MediPact AI tarafından oluşturuldu • ${dateLabel}</div>
</body></html>`;
}

function downloadCockpitBriefing(opts: {
  caseTitle?: string; caseId: string; mode: "print" | "html";
  uzlasmaPct: number | null; uzlasmaKaynak?: string; riskPuani?: string;
  zopa: any; tarafKarsilastirma: any[]; scenarios: any[];
  criticalFactors: string[]; redLines: string[]; obstacles: string[];
  mediatorOneri?: string; kaynakListesi: string[]; sources?: any[];
}) {
  const html = buildCockpitBriefingHtml({ ...opts, generatedAt: new Date() });
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
    a.download = `kokpit-brifingi-${opts.caseId}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// ── Faz 4 bölüm PDF'i ────────────────────────────────────────────────────
// Motor DEĞİŞMEDİ: kokpit brifingiyle birebir aynı akış — HTML string kurulur,
// yeni sekmede açılır, window.print() ile PDF'e verilir. Türkçe karakterler aynı
// yolla korunur (<meta charset="UTF-8"> + sistem fontu); yeni kütüphane yok.
const pdfEsc = (v: any) => String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" } as any)[c]);
const pdfList = (arr?: string[]) =>
  arr && arr.length ? `<ul>${arr.map((x) => `<li>${pdfEsc(x)}</li>`).join("")}</ul>` : `<p class="muted">Yeterli veri yok</p>`;

// Gizli bölümlerin HER SAYFASINA basılan alt bilgi. position:fixed olduğu için
// yazdırmada her sayfada tekrarlanır — tarayıcıların standart davranışı.
const PDF_CONFIDENTIAL_NOTE = "Arabulucuya özeldir — taraflarla paylaşılamaz";

function buildSectionsPdfHtml(opts: {
  caseTitle?: string; caseId: string; generatedAt: Date;
  docTitle: string; confidential: boolean;
  sections: { title: string; html: string }[];
}): string {
  const { caseTitle, caseId, generatedAt, docTitle, confidential, sections } = opts;
  const dateLabel = generatedAt.toLocaleString("tr-TR");
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>${pdfEsc(docTitle)} — ${pdfEsc(caseTitle || caseId)}</title>
<style>
body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;max-width:780px;margin:20px auto;padding:0 20px;color:#1f2937;line-height:1.45;font-size:13px}
h1{color:#0f766e;border-bottom:2px solid #0f766e;padding-bottom:5px;font-size:20px;margin-bottom:4px}
h2{color:#0f766e;margin:16px 0 6px;border-bottom:1px solid #e5e7eb;padding-bottom:3px;font-size:14px}
h4{margin:4px 0;font-size:13px}
.muted{color:#6b7280;font-size:12px}
.card{border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;margin:6px 0;background:#f9fafb}
ul,ol{padding-left:18px;margin:4px 0}
table{width:100%;border-collapse:collapse;margin:6px 0;font-size:12px}
th,td{border:1px solid #e5e7eb;padding:4px 6px;text-align:left;vertical-align:top}
th{background:#f0fdfa;color:#0f766e}
.meta{color:#6b7280;font-size:11px;margin-bottom:12px}
.confidential{background:#fef2f2;border:2px solid #dc2626;color:#991b1b;font-weight:600;text-align:center;padding:6px 10px;border-radius:6px;margin-bottom:12px;font-size:12px}
.quote{color:#374151;font-style:italic}
.pagenote{position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:10px;color:#991b1b;border-top:1px solid #fecaca;background:#fff;padding:4px 0}
@media print{body{margin:0;font-size:12px}.card{break-inside:avoid}h2{break-after:avoid}${confidential ? "body{padding-bottom:30px}" : ""}}
</style></head><body>
${confidential ? `<div class="confidential">GİZLİ — Yalnızca Arabulucu İçindir (6325 s.K. m.4/m.33)</div>` : ""}
<h1>${pdfEsc(docTitle)}</h1>
<div class="meta"><b>Başvuru:</b> ${pdfEsc(caseTitle || "—")} &nbsp;•&nbsp; <b>ID:</b> ${pdfEsc(caseId)} &nbsp;•&nbsp; <b>Oluşturulma:</b> ${dateLabel}</div>
${sections.map((s) => `<h2>${pdfEsc(s.title)}</h2>${s.html}`).join("")}
<div class="meta" style="margin-top:20px;text-align:center">MediPact AI tarafından oluşturuldu • ${dateLabel}</div>
${confidential ? `<div class="pagenote">${pdfEsc(PDF_CONFIDENTIAL_NOTE)}</div>` : ""}
</body></html>`;
}

function printSectionsPdf(opts: {
  caseTitle?: string; caseId: string; docTitle: string; confidential: boolean;
  sections: { title: string; html: string }[];
}) {
  const html = buildSectionsPdfHtml({ ...opts, generatedAt: new Date() });
  const w = window.open("", "_blank");
  if (!w) {
    toast({ title: "PDF açılamadı", description: "Tarayıcı açılır pencereyi engelledi.", variant: "destructive" });
    return;
  }
  w.document.write(html);
  w.document.close();
  w.onload = () => w.print();
}

/* ===================== PHASE 4 KOKPİT — Genel Bakış sekmesi bileşenleri ===================== */
// Görsel dil Faz 3'teki P3Section kalıbıyla aynı: zemin beyaz, bölümler ince ayraçla
// ayrılır, kutu içinde kutu yoktur. Renk YALNIZ durum rozetlerinde (risk seviyesi, güven
// seviyesi) kullanılır; lacivert (primary) yalnız başlık ve düğmelerde, gövde metni siyah,
// açıklamalar gri. Veri kaynakları ve prop'lar değişmedi — yalnız sunum.

// Faz 3'teki taraf kartı katlanma kalıbının kokpit karşılığı: tek satır başlık +
// sağda kısa özet + ok; içerik tıklanınca açılır. Kutu içinde kutu olmaması için
// Card yerine ince üst ayraç kullanılır — Faz 3'teki etkileşimin aynısı.
/* ====== KALEM KARŞILAŞTIRMASI (İBA · masa ajanı) — yalnız arabulucu ========
   Masa ajanının çıkardığı karşılaştırmayı gösterir: örtüşen · yakın · ayrılan.
   Bu kart VERİ ÜRETMEZ, ajanın yazdığını okur; ajan yazdığında Realtime ile
   kendiliğinden tazelenir, sayfa yenilenmez.
   KÖR VERİ: yalnız kalem adı ve fark görünür; hiçbir tarafın belgesi, beyanı ya
   da analizi bu karta girmez. TARAFSIZLIK: kart bilgi verir, "kabul et/etme"
   demez (constitution m.4). */
function KalemKarsilastirmaPanel({ caseId, onVeri }: { caseId: string; onVeri?: (v: boolean) => void }) {
  const [veri, setVeri] = useState<any | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    const { data } = await supabase.from("agent_states")
      .select("last_output").eq("case_id", caseId)
      .eq("agent_type", "mediator").is("party_id", null).maybeSingle();
    const cikti = (data as any)?.last_output;
    const k = cikti && typeof cikti === "object" ? (cikti as any).karsilastirma : null;
    setVeri(k ?? null);
    onVeri?.(!!k);
    setYukleniyor(false);
  }, [caseId, onVeri]);

  useEffect(() => { yukle(); }, [yukle]);

  // Mevcut Realtime deseni: ajan yazdığında açık kart kendiliğinden tazelenir.
  useEffect(() => {
    const kanal = supabase
      .channel(`kalem_karsilastirma:${caseId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "agent_states", filter: `case_id=eq.${caseId}` },
        () => { yukle(); })
      .subscribe();
    return () => { supabase.removeChannel(kanal); };
  }, [caseId, yukle]);

  if (yukleniyor) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Okunuyor…</div>;
  }
  if (!veri) return <p className="text-sm text-muted-foreground">Ajan hazırlıyor.</p>;

  const grup = (baslik: string, satirlar: any[], aciklama: string) => (
    <div className="space-y-1">
      <div className="text-sm font-medium">{baslik} <span className="text-muted-foreground font-normal">({satirlar.length})</span></div>
      <p className="text-[11px] text-muted-foreground">{aciklama}</p>
      {satirlar.length === 0
        ? <p className="text-xs text-muted-foreground italic">bu grupta kalem yok</p>
        : (
          <ul className="text-sm space-y-1">
            {satirlar.slice(0, 20).map((x: any, i: number) => (
              <li key={i} className="flex items-start justify-between gap-3 border-b py-1">
                <span className="min-w-0">{String(x?.kalem ?? "")}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {x?.fark === null || x?.fark === undefined
                    ? (x?.not ?? "")
                    : `fark ${Number(x.fark).toLocaleString("tr-TR")}${x?.not ? ` · ${x.not}` : ""}`}
                </span>
              </li>
            ))}
          </ul>
        )}
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm">{String(veri.ozet ?? "")}</p>
      {grup("Örtüşen", Array.isArray(veri.ortusen) ? veri.ortusen : [], "iki tarafın tutarı aynı")}
      {grup("Yakın", Array.isArray(veri.yakin) ? veri.yakin : [], "fark küçük ya da tutar net okunamadı")}
      {grup("Ayrılan", Array.isArray(veri.ayrilan) ? veri.ayrilan : [], "tutarlar ayrışıyor")}
      <p className="text-[11px] text-muted-foreground">
        Bu kart bilgi verir; hangi kalemin kabul edileceği kararı sizindir.
      </p>
    </div>
  );
}

/* Hangi ajan kolunun çıktısı hangi kokpit bölümünde görünür — "yeni" işareti
   bu eşlemeden hesaplanır. Eşlemesi olmayan kol işaret üretmez. */
const AJAN_BOLUMU: Record<string, string> = {
  mediator: "kokpit-kalem-karsilastirma",
  elverislilik: "kokpit-elverislilik",
  usul_onerisi: "kokpit-usul-onerisi",
  usul_engeli: "kokpit-usul-engeli",
  party_consistency: "kokpit-ic-tutarlilik",
  party_communication: "kokpit-iletisim",
  iletisim_degisim: "kokpit-iletisim-degisim",
  common_ground: "kokpit-ortak-zemin",
  party_analysis: "kokpit-taraf-analizleri",
};

function CockpitCollapsible({
  id, title, summary, hint, open, onToggle, pdfActions, yeni, bos, children,
}: {
  id: string; title: string; summary?: string; hint?: string; open: boolean; onToggle: () => void;
  // Yalnız çıktısı olan bölümlerde dolu gelir; boşsa PDF düğmesi hiç çizilmez.
  // Bir bölüm rapor tarafında birden çok kaleme ayrılmışsa her kalem kendi düğmesini alır.
  pdfActions?: { label: string; run: () => void }[];
  /* 19.08 — ajan bu bölüme yeni veri yazdıysa başlıkta sakin bir "yeni" işareti
     durur; kart açılınca kaybolur. Uyarı değildir, renk taşımaz. */
  yeni?: boolean;
  /* Kart boşken hata görünümü yerine sakin tek satır yazılır. */
  bos?: boolean;
  children: React.ReactNode;
}) {
  const actions = pdfActions ?? [];
  const single = actions.length === 1;
  return (
    <div id={id} className="border-t scroll-mt-24">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          title={hint}
          className="flex-1 min-w-0 flex items-center justify-between gap-3 py-3 hover:bg-accent/30 transition text-left"
        >
          <span className="text-sm font-medium truncate">{title}</span>
          <span className="flex items-center gap-2 shrink-0">
            {yeni && !open && (
              <span className="text-[10px] font-normal text-muted-foreground border rounded px-1 py-0.5">yeni</span>
            )}
            {summary && <span className="text-sm text-muted-foreground">{summary}</span>}
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>
        {actions.map((a) => (
          <Button
            key={a.label}
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs shrink-0"
            onClick={a.run}
            title={`${a.label} — PDF`}
          >
            {single ? "PDF" : `${a.label} PDF`}
          </Button>
        ))}
      </div>
      {open && (
        <div className="pb-4">
          {bos
            ? <p className="text-sm text-muted-foreground">Ajan hazırlıyor.</p>
            : children}
        </div>
      )}
    </div>
  );
}

// Kart içi en fazla üç satır kuralının karşılığı: uzun dayanak/gerekçe metinleri
// silinmez, bu açılımın altına alınır. CockpitRootCauseCard'daki "Açıkla/Gizle"
// düğmesinin aynısı, tek yerde toplanmış hali.
function CockpitDisclosure({ label = "Açıkla", children }: { label?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (isBlankNode(children)) return null;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium text-primary hover:underline"
      >
        {open ? "Gizle" : label}
      </button>
      {open && <div className="mt-1.5 space-y-1.5">{children}</div>}
    </div>
  );
}

function CockpitGauge({ pct, riskLabel, sourceHint }: { pct: number | null; riskLabel?: string; sourceHint?: string }) {
  const empty = pct === null;
  const clamped = empty ? 0 : Math.min(100, Math.max(0, pct));
  const r = 80;
  const circumference = Math.PI * r;
  const dashOffset = circumference * (1 - clamped / 100);
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-sm font-semibold text-primary mb-1">Uzlaşma tahmini</div>
      <div className="relative w-full max-w-[220px]">
        <svg viewBox="0 0 200 100" className="w-full">
          <path d="M20,90 A80,80 0 0 1 180,90" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" className="text-muted" />
          <path
            d="M20,90 A80,80 0 0 1 180,90" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            className={empty ? "text-muted" : "text-primary"}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex justify-center">
          <div className={`font-display font-bold tabular-nums leading-none ${empty ? "text-3xl text-muted-foreground" : "text-5xl text-foreground"}`}>
            {empty ? "—" : <PhaseHeroCountUp value={clamped} suffix="%" />}
          </div>
        </div>
      </div>
      {riskLabel && !empty && (
        <span className={`mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${riskBadgeTone(riskLabel)}`}>{riskLabel} risk</span>
      )}
      {sourceHint && <div className="text-sm text-muted-foreground mt-1.5 text-center max-w-[220px]">{sourceHint}</div>}
    </div>
  );
}

function CockpitZopaBand({ zopa, lowerName, upperName }: { zopa: any; lowerName?: string; upperName?: string }) {
  const hasData = zopa && (zopa.lower_bound || zopa.upper_bound || zopa.description);
  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-full min-h-[140px]">
        <div className="text-sm font-semibold text-primary mb-1">Uzlaşma alanı (ZOPA)</div>
        <p className="text-sm text-muted-foreground italic">ZOPA için rapor üretin</p>
      </div>
    );
  }
  return (
    <div className="space-y-3 h-full">
      <div className="text-sm font-semibold text-primary">Uzlaşma alanı (ZOPA)</div>
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          <div className="text-sm text-muted-foreground">{lowerName ? `${lowerName} alt teklifi` : "Alt teklif"}</div>
          <div className="font-display text-lg font-bold">{zopa.lower_bound || "?"}</div>
        </div>
        <div className="flex-1 h-3 rounded-full bg-muted relative overflow-hidden">
          <div className="absolute inset-y-0 left-[15%] right-[15%] rounded-full bg-primary/70" />
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm text-muted-foreground">{upperName ? `${upperName} üst talebi` : "Üst talep"}</div>
          <div className="font-display text-lg font-bold">{zopa.upper_bound || "?"}</div>
        </div>
      </div>
      {zopa.description && <p className="text-sm text-muted-foreground leading-snug">{zopa.description}</p>}
    </div>
  );
}

function CockpitMiniBar({ label, pct, valueLabel }: { label: string; pct: number | null; valueLabel: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">{valueLabel}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: pct !== null ? `${Math.min(100, Math.max(0, pct))}%` : "0%" }} />
      </div>
    </div>
  );
}

function CockpitPartyColumn({
  name, riskPuani, uzlasmaPct, uzlasmaLabel, mahkemePct, mahkemeLabel, batna,
}: {
  name: string; riskPuani?: string; uzlasmaPct: number | null; uzlasmaLabel: string;
  mahkemePct: number | null; mahkemeLabel: string; batna: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold truncate">{name}</div>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${riskBadgeTone(riskPuani)}`}>{riskPuani || "—"}</span>
      </div>
      <CockpitMiniBar label="Anlaşma oranı" pct={uzlasmaPct} valueLabel={uzlasmaLabel} />
      <CockpitMiniBar label="Mahkeme riski" pct={mahkemePct} valueLabel={mahkemeLabel} />
      <div>
        <div className="text-sm text-muted-foreground">BATNA gücü</div>
        <div className="text-sm leading-snug line-clamp-2">{batna || "—"}</div>
      </div>
    </div>
  );
}

// Kök neden katmanının güven_seviyesi rozeti — riskBadgeTone'dan bilinçli olarak ayrı:
// "Düşük" burada bir tehlike değil, sadece zayıf dayanaklı bir çıkarım anlamına gelir (nötr gri).
function confidenceBadgeTone(raw?: string): string {
  switch (normalizeRiskLevel(raw)) {
    case "high": return "bg-emerald-600 text-white";
    case "medium": return "bg-amber-500 text-white";
    case "low": return "bg-slate-500 text-white";
    default: return "bg-muted text-foreground";
  }
}

// Rozet olmayan, yalnız etiketleyen küçük çipler (taraf adı, iz tipi, kategori) —
// bunlar durum bildirmediği için renksiz kalır.
const cockpitTagClass = "text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground";

// Faz 4 kokpiti, mediator-only: party_root_cause_analysis satırı hiç yoksa veya kok_neden
// boş {} ise nazik boş durum gösterir — uydurma metin YOK.
function CockpitRootCauseCard({
  name, rootCause,
}: {
  name: string;
  rootCause?: { gorunen_talep?: string; asil_mesele?: string; dayanak?: string; guven_seviyesi?: string } | null;
}) {
  const asilMesele = safeText(rootCause?.asil_mesele);
  const gorunenTalep = safeText(rootCause?.gorunen_talep);
  const dayanak = safeText(rootCause?.dayanak);
  const isInsufficient = asilMesele === "Yeterli veri yok";
  const hasData = !!(asilMesele || gorunenTalep) && !isInsufficient;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium truncate">{name}</span>
        {rootCause?.guven_seviyesi && (
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${confidenceBadgeTone(rootCause.guven_seviyesi)}`}>
            {rootCause.guven_seviyesi}
          </span>
        )}
      </div>

      {!hasData && !isInsufficient ? (
        <p className="text-sm text-muted-foreground italic">
          Kök neden analizi henüz üretilmedi — taraf analizi çalıştırıldığında oluşur.
        </p>
      ) : isInsufficient ? (
        <p className="text-sm text-muted-foreground italic">Yeterli veri yok.</p>
      ) : (
        <div className="space-y-1">
          <div className="text-sm leading-snug">
            <span className="text-muted-foreground">Görünen talep: </span>{gorunenTalep || "—"}
          </div>
          <div className="text-sm leading-snug">
            <span className="text-muted-foreground">Asıl mesele: </span>{asilMesele || "—"}
          </div>
          {dayanak && (
            <CockpitDisclosure>
              <p className="text-sm text-muted-foreground leading-snug">Dayanak: {dayanak}</p>
            </CockpitDisclosure>
          )}
        </div>
      )}
    </div>
  );
}

function CockpitScenarioCard({ letter, scenario, recommended, onClick }: { letter: string; scenario: any; recommended: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left rounded-md border p-3 space-y-1.5 cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent/20"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-primary">{letter}</span>
        {recommended && <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">Önerilen</span>}
      </div>
      <div className="text-sm font-medium line-clamp-1">{scenario.label || "Senaryo"}</div>
      <p className="text-sm text-muted-foreground line-clamp-2">{scenario.summary}</p>
    </button>
  );
}

function CockpitBadgeFlow({ items }: { items: { text: string; sources: string[] }[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground italic">Henüz belirlenmedi</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((f, i) => (
        <span
          key={i}
          className={cockpitTagClass}
          title={f.sources.length > 1 ? `Vurgulayan taraflar: ${f.sources.join(", ")}` : f.sources[0]}
        >
          {f.text}
          {f.sources.length > 1 && <span className="ml-1 opacity-70">({f.sources.length})</span>}
        </span>
      ))}
    </div>
  );
}

// Kırmızı çizgiler kritik uyarıdır: kutu değil, tek satır kırmızı metin.
function CockpitRedLines({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground italic">Henüz belirlenmedi</p>;
  return (
    <ul className="space-y-1">
      {items.map((r, i) => (
        <li key={i} className="text-sm text-destructive leading-snug">{r}</li>
      ))}
    </ul>
  );
}

// risk_ozeti'nin AI tarafından üretilmiş resmi taraf karşılaştırma tablosu — CockpitPartyColumn'daki
// tarafın kendi risk_analizi'nden anlık hesaplanan verilerle karışmasın diye ayrı bölüm.
function CockpitOfficialComparisonTable({ items }: { items: any[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-primary">Güçlü ve zayıf yanlar</div>
      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((t: any, i: number) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium truncate">{safeText(t?.taraf) || `Taraf ${i + 1}`}</span>
              {t?.risk_puani && (
                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${riskBadgeTone(t.risk_puani)}`}>{t.risk_puani}</span>
              )}
            </div>
            {t?.guclu_yon && (
              <div className="text-sm leading-snug">
                <span className="text-muted-foreground">Güçlü yan: </span>{t.guclu_yon}
              </div>
            )}
            {t?.zayif_yon && (
              <div className="text-sm leading-snug">
                <span className="text-muted-foreground">Zayıf yan: </span>{t.zayif_yon}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CockpitObstacles({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground italic">Henüz belirlenmedi</p>;
  return (
    <ul className="divide-y">
      {items.map((o, i) => (
        <li key={i} className="text-sm leading-snug py-1.5">{o}</li>
      ))}
    </ul>
  );
}

// Kokpitin "sonuç cümlesi".
function CockpitMediatorRecommendation({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div>
      <div className="text-sm font-semibold text-primary mb-1">Arabulucu önerisi</div>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function CockpitSources({ items, sources }: { items: string[]; sources?: any[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-sm font-semibold text-primary mb-1.5">Kaynaklar</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((name, i) => (
          <SourceChip key={i} name={name} source={matchSource(name, sources)} />
        ))}
      </div>
    </div>
  );
}

const WORKLOG_KATEGORI_LABELS: Record<string, string> = {
  zayif_dayanak: "Zayıf Dayanak",
  veri_yetersiz: "Veri Yetersiz",
  celiskili: "Çelişkili",
  ek_gorusme_gerekli: "Ek Görüşme Gerekli",
};

// agent_worklog.entry_type='rapor_disi' satırlarının kokpit görünümü — arabulucuya özel,
// ajanın değerlendirip nihai rapora almadığı hususları gösterir. content JSON'u
// party-confidential-analysis'teki rapor_disi_degerlendirmeler şemasıyla birebir eşleşir.
// Gerekçe ve önerilen adım "Açıkla" altına alındı: kart üç satırı aşmasın (metin silinmedi).
function CockpitOffReportItem({ item, partyLabel }: { item: any; partyLabel: string | null }) {
  const husus = safeText(item?.husus);
  const neden = safeText(item?.neden_rapora_girmedi);
  const adim = safeText(item?.onerilen_adim);
  const kategori = String(item?.kategori ?? "");
  if (!husus && !neden && !adim) return null;
  return (
    <li className="py-2.5 space-y-1">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="text-sm font-medium">{husus || "—"}</div>
        <div className="flex items-center gap-1.5 shrink-0">
          {kategori && <span className={cockpitTagClass}>{WORKLOG_KATEGORI_LABELS[kategori] ?? kategori}</span>}
          {partyLabel && <span className={cockpitTagClass}>{partyLabel}</span>}
        </div>
      </div>
      {(neden || adim) && (
        <CockpitDisclosure>
          {neden && <p className="text-sm text-muted-foreground leading-snug">{neden}</p>}
          {adim && <p className="text-sm leading-snug">Önerilen adım: {adim}</p>}
        </CockpitDisclosure>
      )}
    </li>
  );
}

// party_consistency_findings tek bulgusunun kokpit görünümü — arabulucuya özel.
// guven_seviyesi fonksiyondan "yuksek|orta|dusuk" olarak gelir; rozet için mevcut
// confidenceBadgeTone'un beklediği Türkçe etikete çevrilir (yeni rozet mantığı YOK).
const CONSISTENCY_CONFIDENCE_LABELS: Record<string, string> = {
  yuksek: "Yüksek",
  orta: "Orta",
  dusuk: "Düşük",
};

function CockpitConsistencyItem({ finding, partyLabel }: { finding: any; partyLabel: string | null }) {
  const gozlem = safeText(finding?.gozlem);
  const kaynakA = safeText(finding?.dayanak_a?.kaynak);
  const alintiA = safeText(finding?.dayanak_a?.alinti);
  const kaynakB = safeText(finding?.dayanak_b?.kaynak);
  const alintiB = safeText(finding?.dayanak_b?.alinti);
  if (!gozlem || !alintiA || !alintiB) return null;
  const confLabel = CONSISTENCY_CONFIDENCE_LABELS[String(finding?.guven_seviyesi ?? "").toLowerCase()] ?? "";

  return (
    <div className="py-2.5 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium leading-snug">{gozlem}</div>
        {confLabel && (
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${confidenceBadgeTone(confLabel)}`}>
            {confLabel}
          </span>
        )}
      </div>
      {partyLabel && <span className={`${cockpitTagClass} inline-block`}>{partyLabel}</span>}
      {/* İki dayanak alıntısı "Açıkla" altında — kart üç satırı aşmasın (metin silinmedi). */}
      <CockpitDisclosure label="Dayanakları göster">
        <div className="text-sm">
          <span className="text-muted-foreground">{kaynakA || "Dayanak 1"}: </span>{alintiA}
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">{kaynakB || "Dayanak 2"}: </span>{alintiB}
        </div>
      </CockpitDisclosure>
    </div>
  );
}

// party_communication_analysis tek izinin kokpit görünümü — CockpitConsistencyItem
// kalıbından türetildi. Fark: iki dayanak değil TEK dayanak var, onun yerine iz tipini
// gösteren bir etiket eklendi. Bilinmeyen slug olduğu gibi gösterilir (uydurma etiket yok).
const COMMUNICATION_IZ_LABELS: Record<string, string> = {
  kacinilan_konu: "Kaçınılan konu",
  tekrar_eden_tema: "Tekrar eden tema",
  sertlesme_noktasi: "Sertleşme noktası",
  hic_deginilmeyen_alan: "Hiç değinilmeyen alan",
  talep_anlati_farki: "Talep–anlatı farkı",
};

function CockpitCommunicationItem({ finding, partyLabel }: { finding: any; partyLabel: string | null }) {
  const gozlem = safeText(finding?.gozlem);
  const kaynak = safeText(finding?.dayanak?.kaynak);
  const alinti = safeText(finding?.dayanak?.alinti);
  if (!gozlem || !alinti) return null;
  const izSlug = String(finding?.iz_tipi ?? "").trim();
  const izLabel = COMMUNICATION_IZ_LABELS[izSlug] ?? izSlug;
  const confLabel = CONSISTENCY_CONFIDENCE_LABELS[String(finding?.guven_seviyesi ?? "").toLowerCase()] ?? "";

  return (
    <div className="py-2.5 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {izLabel && <span className={cockpitTagClass}>{izLabel}</span>}
          {partyLabel && <span className={cockpitTagClass}>{partyLabel}</span>}
        </div>
        {confLabel && (
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${confidenceBadgeTone(confLabel)}`}>
            {confLabel}
          </span>
        )}
      </div>
      <div className="text-sm font-medium leading-snug">{gozlem}</div>
      {/* Dayanak alıntısı "Açıkla" altında — kart üç satırı aşmasın (metin silinmedi). */}
      <CockpitDisclosure label="Dayanağı göster">
        <div className="text-sm">
          <span className="text-muted-foreground">{kaynak || "Dayanak"}: </span>{alinti}
        </div>
      </CockpitDisclosure>
    </div>
  );
}

/* ===================== PHASE 4 - MEDIATOR PANEL (READ-ONLY SUMMARY) ===================== */

function Phase4Summary({ caseRow, onSectionsChange, jump, onRandevuAyarla }: {
  caseRow: CaseRow;
  // "Şimdi ne yapmalısın"daki oturum planlama maddesinin eylem düğmesi; Aşama 4'teki
  // mevcut randevu akışını tetikler, kopyasını yazmaz.
  onRandevuAyarla?: () => void;
  // Sol menüdeki alt katmanı besler: hangi bölümlerin verisi var. Yeni sorgu yok —
  // liste, bu bileşenin zaten okuduğu state'ten türetilir.
  onSectionsChange?: (sections: { id: string; label: string; kind: "layer" | "section"; hint?: string }[]) => void;
  // Sol menüden gelen "şu bölümü aç ve oraya kay" isteği; nonce her tıklamada artar.
  jump?: { id: string; nonce: number } | null;
}) {
  // Tüm bölümler varsayılan KAPALI; yalnız durum şeridi her zaman görünür.
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  // Katmanlar da varsayılan KAPALI: ekran açıldığında durum şeridi + dört katman
  // başlığı görünür, bölüm listeleri katman açılınca gelir.
  const [openLayers, setOpenLayers] = useState<Set<string>>(new Set());
  const toggleLayer = useCallback((id: string) => {
    setOpenLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  // Faz 4'e girişte sayfa üstten açılsın. Montaj anı bir kez damgalanır; aşağıdaki
  // atlama efekti bu damgadan ESKİ bir isteği (önceki Faz 4 ziyaretinden taşınan
  // cockpitJump) yeniden oynatmaz, böylece giriş her zaman en üstten olur.
  // Kullanıcı kendi kaydırdıktan sonra hiçbir yerde zorla yukarı çekilmez.
  const mountedAtRef = useRef<number>(Date.now());
  // Kullanıcının kendi kaydırma hareketi: bu işaret konduktan sonra sayfa hiçbir
  // yerde kendiliğinden yukarı çekilmez.
  const userScrolledRef = useRef(false);
  const topAppliedRef = useRef(false);
  useEffect(() => {
    const mark = () => { userScrolledRef.current = true; };
    window.addEventListener("wheel", mark, { passive: true });
    window.addEventListener("touchmove", mark, { passive: true });
    window.addEventListener("keydown", mark);
    return () => {
      window.removeEventListener("wheel", mark);
      window.removeEventListener("touchmove", mark);
      window.removeEventListener("keydown", mark);
    };
  }, []);
  // index.css'te html{scroll-behavior:smooth} var; davranış açıkça verilmezse bu çağrı
  // YUMUŞAK kaydırma olarak kuyruğa girer ve montaj anındaki kısa sayfada (yükleme
  // kartı) sonuçsuz kalır. "instant" ile konum anında yazılır.
  const scrollPageTop = useCallback(() => {
    if (userScrolledRef.current) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, []);
  useEffect(() => {
    scrollPageTop();
  }, [scrollPageTop]);
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
  const [rootCauses, setRootCauses] = useState<Record<string, any>>({});
  const [worklog, setWorklog] = useState<any[]>([]);
  const [consistency, setConsistency] = useState<any[]>([]);
  const [communication, setCommunication] = useState<any[]>([]);
  // "Şimdi ne yapmalısın" kartı için iki sayım — yalnız adet, içerik okunmaz.
  // null = sayılamadı; bilinmeyen sayıdan madde üretilmez.
  const [partyCount, setPartyCount] = useState<number | null>(null);
  const [docCount, setDocCount] = useState<number | null>(null);
  // Tarafa iletilmiş keşif soruları + gönderim durumu ("Şimdi ne yapmalısın" kolu).
  const [discoveryRows, setDiscoveryRows] = useState<any[]>([]);
  const [soruGonderiliyor, setSoruGonderiliyor] = useState(false);
  const [sonGonderilenSoru, setSonGonderilenSoru] = useState<string | null>(null);
  // Açık yönlendirme maddesi — tek state, aynı anda tek madde açık kalır.
  const [acikYonlendirme, setAcikYonlendirme] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [reportAttempt, setReportAttempt] = useState(0);
  const [openScenario, setOpenScenario] = useState<{ letter: string; scenario: any; recommended: boolean } | null>(null);
  // "Rapor oluştur" seçim penceresi. Hook kuralı (a26bdd7): tüm useState'ler erken
  // return'lerden ÖNCE, koşulsuz ve sabit sırada.
  const [reportPickerOpen, setReportPickerOpen] = useState(false);
  const [pickedSections, setPickedSections] = useState<Set<string>>(new Set());

  const fetchReport = useCallback(async () => {
    const { data, error } = await supabase
      .from("common_ground_reports")
      .select("*")
      .eq("case_id", caseRow.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) { console.error("[Phase4Summary fetchReport]", error); return null; }
    setReport(data ?? null);
    return data ?? null;
  }, [caseRow.id]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const [r, a, rc, wl, cf, ca, pc, dc, dq] = await Promise.all([
        supabase.from("common_ground_reports").select("*").eq("case_id", caseRow.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("party_analyses").select("party_id, analysis, risk_analizi, case_parties:party_id(first_name, last_name, company_name, party_role)").eq("case_id", caseRow.id),
        // Kök Neden Katmanı: mediator-only, ayrı tablo. Bu sorgu ana yüklemeyi bloklamaz —
        // hata olursa boş kart yerine sessizce boş durum gösterilir.
        supabase.from("party_root_cause_analysis").select("party_id, kok_neden, created_at").eq("case_id", caseRow.id).order("created_at", { ascending: false }),
        // Rapora Girmeyenler: agent_worklog, aynı "hata olursa sessizce boş" kalıbı —
        // bu sorgu asla ana kokpit render'ını bozmaz.
        supabase.from("agent_worklog").select("id, party_id, content, created_at").eq("case_id", caseRow.id).eq("entry_type", "rapor_disi").order("created_at", { ascending: false }),
        // İç Tutarlılık: party_consistency_findings, aynı "hata olursa sessizce boş" kalıbı —
        // tablo/kayıt yoksa kart hiç görünmez, kokpit render'ı hiçbir koşulda etkilenmez.
        supabase.from("party_consistency_findings" as any).select("id, party_id, findings, created_at").eq("case_id", caseRow.id).order("created_at", { ascending: false }),
        // İletişim ve Asıl İhtiyaç: party_communication_analysis, aynı "hata olursa
        // sessizce boş" kalıbı — kayıt yoksa kart hiç görünmez.
        supabase.from("party_communication_analysis" as any).select("id, party_id, findings, discovery_questions, created_at").eq("case_id", caseRow.id).order("created_at", { ascending: false }),
        // "Şimdi ne yapmalısın" kartının iki sayımı — head:true, satır içeriği çekilmez.
        supabase.from("case_parties").select("id", { count: "exact", head: true }).eq("case_id", caseRow.id),
        supabase.from("case_documents").select("id", { count: "exact", head: true }).eq("case_id", caseRow.id),
        // Tarafa iletilmiş keşif soruları — tarafın CaseRoom'daki "İhtiyaç Tespiti"
        // sekmesinde okuduğu mevcut yol. Hata olursa kart sessizce çıkmaz.
        supabase.from("case_discovery_questions").select("id, party_id, question_text, question_order, answer_text").eq("case_id", caseRow.id),
      ]);
      if (r.error) throw r.error;
      if (a.error) throw a.error;
      setReport(r.data);
      setAnalyses(Array.isArray(a.data) ? a.data : []);
      if (rc.error) {
        console.error("[Phase4Summary rootCause]", rc.error);
        setRootCauses({});
      } else {
        const rcMap: Record<string, any> = {};
        (rc.data ?? []).forEach((row: any) => {
          if (!rcMap[row.party_id]) rcMap[row.party_id] = row.kok_neden;
        });
        setRootCauses(rcMap);
      }
      if (wl.error) {
        console.error("[Phase4Summary worklog]", wl.error);
        setWorklog([]);
      } else {
        setWorklog(Array.isArray(wl.data) ? wl.data : []);
      }
      if (cf.error) {
        console.error("[Phase4Summary consistency]", cf.error);
        setConsistency([]);
      } else {
        setConsistency(Array.isArray(cf.data) ? cf.data : []);
      }
      if (ca.error) {
        console.error("[Phase4Summary communication]", ca.error);
        setCommunication([]);
      } else {
        setCommunication(Array.isArray(ca.data) ? ca.data : []);
      }
      if (pc.error) {
        console.error("[Phase4Summary partyCount]", pc.error);
        setPartyCount(null);
      } else {
        setPartyCount(pc.count ?? null);
      }
      if (dc.error) {
        console.error("[Phase4Summary docCount]", dc.error);
        setDocCount(null);
      } else {
        setDocCount(dc.count ?? null);
      }
      if (dq.error) {
        console.error("[Phase4Summary discoveryQuestions]", dq.error);
        setDiscoveryRows([]);
      } else {
        setDiscoveryRows(Array.isArray(dq.data) ? dq.data : []);
      }
    } catch (e: any) {
      console.error("[Phase4Summary] load failed", e);
      setLoadErr(e?.message ?? "Bilinmeyen hata");
      setReport(null);
      setAnalyses([]);
      setRootCauses({});
      setWorklog([]);
      setConsistency([]);
      setCommunication([]);
      setPartyCount(null);
      setDocCount(null);
      setDiscoveryRows([]);
    } finally {
      setLoading(false);
    }
  }, [caseRow.id]);
  useEffect(() => { load(); }, [load]);

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

  const analysedCount = analyses.length;
  const canReport = analysedCount >= 1;

  // NOT (React hata #310 — canlıda beyaz ekran): yükleme/hata erken return'leri
  // BİLEREK aşağıya, TÜM hook çağrılarından sonraya alındı. Buradayken, kendilerinden
  // sonra tanımlanan iki useEffect ilk render'da hiç çalışmıyor, veri gelince
  // çalışıyordu; hook sayısı render'dan render'a değiştiği için React çöküyordu.
  // Bu bloğa hook'tan önce hiçbir return eklenmemeli.
  const heroUzlasmaPct = (() => {
    const fromReport = parsePercent(report?.risk_ozeti?.genel_uzlasma_orani);
    if (fromReport !== null) return fromReport;
    if (analyses.some((a: any) => isMissing(a.risk_analizi?.uzlasma_orani))) return null;
    const vals = analyses
      .map((a: any) => parsePercent(a.risk_analizi?.uzlasma_orani))
      .filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  })();

  const heroRiskRows = analyses.slice(0, 2).map((a: any, i: number) => {
    const cp = a.case_parties || {};
    const name = cp.company_name || `${cp.first_name ?? ""} ${cp.last_name ?? ""}`.trim() || `Taraf ${i + 1}`;
    return { name, risk_puani: a.risk_analizi?.risk_puani as string | undefined };
  });

  // ── Genel Bakış kokpiti için türetilen görünüm verisi — hepsi report.report /
  // analyses üzerinde zaten var olan alanlardan; yeni veri kaynağı yok.
  const cockpitReportData = report?.report;
  const cockpitRiskOzeti = cockpitReportData?.risk_ozeti;
  const cockpitRows = analyses.map((a: any, i: number) => {
    const cp = a.case_parties || {};
    const name = cp.company_name || `${cp.first_name ?? ""} ${cp.last_name ?? ""}`.trim() || `Taraf ${i + 1}`;
    const r = a.risk_analizi || {};
    return {
      party_id: a.party_id as string | undefined,
      name,
      risk_puani: r.risk_puani as string | undefined,
      uzlasma_pct: parsePercent(r.uzlasma_orani),
      uzlasma_label: safeText(r.uzlasma_orani) || "Yeterli veri yok",
      mahkeme_pct: parsePercent(r.mahkeme_riski),
      mahkeme_label: safeText(r.mahkeme_riski) || "Yeterli veri yok",
      batna: safeText(a.analysis?.party_position?.batna),
    };
  });
  // Rapora Girmeyenler kartında party_id → taraf adı eşlemesi için — yeni sorgu yok,
  // mevcut cockpitRows'tan türetilir.
  const worklogPartyNameById: Record<string, string> = {};
  cockpitRows.forEach((r) => { if (r.party_id) worklogPartyNameById[r.party_id] = r.name; });
  // İç Tutarlılık kartı: satırlardaki findings dizileri tek listeye düzleştirilir;
  // taraf adı için yukarıdaki mevcut eşleme kullanılır, yeni sorgu yok.
  const consistencyItems = consistency.flatMap((row: any) =>
    (Array.isArray(row?.findings) ? row.findings : []).map((finding: any) => ({
      rowId: row.id, party_id: row.party_id, finding,
    }))
  );
  // İletişim ve Asıl İhtiyaç kartı: izler ve sıradaki sorular aynı satırlardan düzleştirilir.
  const communicationItems = communication.flatMap((row: any) =>
    (Array.isArray(row?.findings) ? row.findings : []).map((finding: any) => ({
      rowId: row.id, party_id: row.party_id, finding,
    }))
  );
  const communicationQuestions = communication.flatMap((row: any) =>
    (Array.isArray(row?.discovery_questions) ? row.discovery_questions : []).map((q: any) => ({
      rowId: row.id, party_id: row.party_id, q,
    }))
  );
  const cockpitRiskPuani = cockpitRiskOzeti?.genel_risk_puani
    || cockpitRows.find((r) => /yük/i.test(String(r.risk_puani)))?.risk_puani
    || cockpitRows.find((r) => /orta/i.test(String(r.risk_puani)))?.risk_puani
    || cockpitRows[0]?.risk_puani;
  const cockpitScenarios = Array.isArray(cockpitReportData?.scenarios) ? cockpitReportData.scenarios.slice(0, 3) : [];
  const cockpitStrongestScenario = cockpitScenarios.find((s: any) => /dengeli/i.test(String(s?.label))) || cockpitScenarios[0] || null;
  const cockpitCriticalFactors = dedupeSimilarFactors([
    ...safeList(cockpitRiskOzeti?.ortak_kritik_faktorler).map((text) => ({ text, source: "Ortak" })),
    ...analyses.flatMap((a: any, i: number) => {
      const cp = a.case_parties || {};
      const name = cp.company_name || `${cp.first_name ?? ""} ${cp.last_name ?? ""}`.trim() || `Taraf ${i + 1}`;
      return safeList(a.risk_analizi?.kritik_faktorler).map((text) => ({ text, source: name }));
    }),
  ]).slice(0, 12);
  const cockpitRedLines = safeList(cockpitReportData?.red_lines).slice(0, 8);
  const cockpitTarafKarsilastirma = Array.isArray(cockpitRiskOzeti?.taraf_karsilastirma) ? cockpitRiskOzeti.taraf_karsilastirma : [];
  const cockpitObstacleList = safeList(cockpitRiskOzeti?.ortak_uzlasma_engelleri).slice(0, 8);
  const cockpitMediatorOneri = safeText(cockpitRiskOzeti?.arabulucu_onerisi);
  // Deterministic — dedup'd straight from the RAG chunks actually retrieved (cockpitReportData.sources),
  // not the model's own risk_ozeti.kaynak_listesi (see RiskAnalysisCard's kaynakNames for why).
  const cockpitKaynakListesi = Array.from(new Set<string>(
    (Array.isArray(cockpitReportData?.sources) ? cockpitReportData.sources : [])
      .map((s: any) => String(s?.title ?? "").trim())
      .filter(Boolean)
  )).slice(0, 10);

  // ── Katman düzeni için türetilenler: hepsi yukarıdaki mevcut state'ten okunur,
  // yeni sorgu yok. Kartların içeriği değişmez; yalnız hangi katmanda durdukları.
  // Katman kutusu: koyu lacivert zemin yerine beyaz kart + ince çerçeve. Katman içindeki
  // bölümler CockpitSection'ın üst ayracıyla ayrılır; kutu içinde kutu yok.
  const cockpitLayerBoxClass = "rounded-lg border bg-card p-6 space-y-4";
  // Aktif süre sonu: CountdownBadge'in kullandığı kuralın aynısı (uzatma kullanıldıysa uzatılmış tarih).
  const activeDeadline = caseRow.extension_used && caseRow.deadline_extended ? caseRow.deadline_extended : caseRow.deadline_total;
  const deadlineDaysLeft = activeDeadline
    ? Math.ceil((new Date(activeDeadline).getTime() - Date.now()) / 86_400_000)
    : null;
  const statusStripItems: { label: string; value: string; sub?: string | null }[] = [
    {
      label: "Sıradaki aşama",
      value: caseRow.current_phase != null ? String(caseRow.current_phase) : "—",
    },
    {
      label: "Son Tarih",
      value: activeDeadline ? new Date(activeDeadline).toLocaleDateString("tr-TR") : "—",
      sub: deadlineDaysLeft === null
        ? null
        : deadlineDaysLeft >= 0 ? `${deadlineDaysLeft} gün kaldı` : "süre doldu",
    },
    { label: "Risk Puanı", value: safeText(cockpitRiskPuani) || "Yeterli veri yok" },
    { label: "Uzlaşma Tahmini", value: heroUzlasmaPct !== null ? `%${heroUzlasmaPct}` : "Yeterli veri yok" },
  ];

  // ── "Şimdi ne yapmalısın" (V1) ────────────────────────────────────────────
  // Kural tabanlı, yapay zekâ çağrısı yok. Maddeler yukarıdaki mevcut state'ten
  // türetilir; dayanak satırları yalnız o veriyi gösterir, yeni metin üretilmez.
  // Öncelik: 1) akış tıkanıklığı 2) süre baskısı 3) çelişki. En fazla üç madde.
  // eylem: yalnız eylem düğmesi olan maddelerde dolar (randevu veya keşif sorusu).
  const yonlendirmeMaddeleri: {
    baslik: string; dayanak: string[];
    eylem?: "randevu" | "kesif";
    soru?: { partyId: string; soru: string };
  }[] = [];
  if (analyses.length === 0) {
    yonlendirmeMaddeleri.push({
      baslik: "Analiz henüz koşmadı — başlat",
      dayanak: ["Tamamlanmış taraf analizi: 0 (Aşama 2'de en az bir analiz gerekir)"],
    });
  }
  if (partyCount !== null && partyCount < 2) {
    yonlendirmeMaddeleri.push({
      baslik: "Taraf bilgisi eksik",
      dayanak: [`Kayıtlı taraf: ${partyCount} (en az 2 gerekir)`],
    });
  }
  if (docCount === 0) {
    yonlendirmeMaddeleri.push({
      baslik: "Hiç belge yüklenmemiş",
      dayanak: ["Yüklü belge: 0"],
    });
  }
  if (deadlineDaysLeft !== null && yonlendirmeMaddeleri.length < 3) {
    const sonTarihMetni = `Son tarih: ${new Date(activeDeadline as string).toLocaleDateString("tr-TR")}`;
    if (deadlineDaysLeft < 0) {
      yonlendirmeMaddeleri.push({ baslik: "Süre doldu", dayanak: [sonTarihMetni] });
    } else if (deadlineDaysLeft < 7) {
      yonlendirmeMaddeleri.push({
        baslik: `Süre ${deadlineDaysLeft} gün kaldı — oturumu planla`,
        dayanak: [sonTarihMetni],
        eylem: "randevu",
      });
    }
  }
  // Tarafa iletilmemiş keşif sorusu: ajanın ürettiği "sıradaki sorular" içinde,
  // case_discovery_questions'a henüz düşmemiş ilk soru. Hepsi iletilmişse madde çıkmaz.
  const iletilmemisSoru = (() => {
    const iletilmis = new Set(
      discoveryRows.map((r: any) => `${r.party_id}|${String(r.question_text ?? "").trim()}`)
    );
    for (const it of communicationQuestions) {
      const soru = safeText((it as any).q?.soru);
      const pid = (it as any).party_id as string | null;
      if (!soru || !pid) continue;
      if (iletilmis.has(`${pid}|${soru.trim()}`)) continue;
      return { partyId: pid, soru };
    }
    return null;
  })();
  if (yonlendirmeMaddeleri.length < 3 && iletilmemisSoru) {
    const tarafAdi = worklogPartyNameById[iletilmemisSoru.partyId] ?? "Taraf";
    const onizleme = iletilmemisSoru.soru.length > 90
      ? `${iletilmemisSoru.soru.slice(0, 90)}…`
      : iletilmemisSoru.soru;
    yonlendirmeMaddeleri.push({
      baslik: `${tarafAdi} tarafına keşif sorusu sor`,
      dayanak: [onizleme],
      eylem: "kesif",
      soru: iletilmemisSoru,
    });
  }
  if (yonlendirmeMaddeleri.length < 3 && consistencyItems.length > 0) {
    // guven_seviyesi 'yuksek' olanlar öne alınır; sıralama dışında hiçbir eleme yok.
    const celiskiSirali = [...consistencyItems].sort((x: any, y: any) => {
      const xy = String(x?.finding?.guven_seviyesi ?? "") === "yuksek" ? 0 : 1;
      const yy = String(y?.finding?.guven_seviyesi ?? "") === "yuksek" ? 0 : 1;
      return xy - yy;
    });
    for (const item of celiskiSirali) {
      if (yonlendirmeMaddeleri.length >= 3) break;
      const tarafAdi = item.party_id ? (worklogPartyNameById[item.party_id] ?? "Taraf") : "Taraf";
      const gozlem = safeText(item?.finding?.gozlem);
      const aDeger = safeText(item?.finding?.a_deger);
      const bDeger = safeText(item?.finding?.b_deger);
      yonlendirmeMaddeleri.push({
        baslik: `${tarafAdi} beyanında çelişki var — ilk oturumda sor`,
        dayanak: [gozlem, aDeger && bDeger ? `${aDeger} ↔ ${bDeger}` : ""].filter(Boolean),
      });
    }
  }
  const yonlendirmeListesi = yonlendirmeMaddeleri.slice(0, 3);

  // Soruyu tarafa ilet: yeni kanal yok — soru, tarafın CaseRoom'da zaten okuduğu
  // case_discovery_questions tablosuna KENDİ party_id'siyle yazılır. E-posta gidilmez,
  // karşı taraf bu satırı hiçbir yüzeyden göremez.
  async function keSifSorusunuGonder(hedef: { partyId: string; soru: string }) {
    if (soruGonderiliyor) return;
    setSoruGonderiliyor(true);
    try {
      const mevcut = discoveryRows
        .filter((r: any) => r.party_id === hedef.partyId)
        .map((r: any) => Number(r.question_order ?? 0));
      const siradaki = (mevcut.length ? Math.max(...mevcut) : 0) + 1;
      const { error } = await supabase.from("case_discovery_questions").insert({
        case_id: caseRow.id,
        party_id: hedef.partyId,
        question_text: hedef.soru,
        question_order: siradaki,
      } as any);
      if (error) throw error;
      setSonGonderilenSoru(hedef.soru);
      toast({ title: "Soru tarafa iletildi", description: "Taraf, kendi ekranındaki İhtiyaç Tespiti bölümünde görecek." });
      await load();   // iletilenler yenilenir; aynı soru bir daha madde olarak çıkmaz
    } catch (e: any) {
      toast({ title: "Soru iletilemedi", description: trErr(e?.message ?? ""), variant: "destructive" });
    } finally {
      setSoruGonderiliyor(false);
    }
  }
  // Sol menüdeki satırın ve karttaki çapa kimliğinin tek kaynağı.
  const YONLENDIRME_ID = "kokpit-simdi-ne-yapmalisin";

  // ── Katlanır bölüm listesi ──────────────────────────────────────────────
  // Her bölüm: sabit id (sol menüden derin bağlantı için), tek satırlık başlık,
  // veriden türetilen kısa özet ve bugünkü içeriği. Verisi olmayan bölüm listeye
  // hiç girmez — başlığı da görünmez.
  type CockpitSectionDef = {
    id: string; layer: string; title: string; summary?: string; body: React.ReactNode;
    // Başlığa ve sol menü satırına bağlanan tek cümlelik ipucu (title/tooltip).
    hint?: string;
    // PDF alanı yalnız çıktısı olan bölümlerde dolar — düğme de yalnız o zaman çıkar.
    // Varsayılan: bölüm = tek PDF kalemi. `pdfs` verilirse bölüm, rapor/PDF tarafında
    // birden çok kaleme AYRILIR; ekrandaki bölüm tek parça görünmeye devam eder.
    pdf?: { confidential: boolean; html: () => string };
    pdfs?: { id: string; title: string; confidential: boolean; html: () => string }[];
  };
  // Bölüm ipuçları tek yerde: hem sağdaki başlıkta hem sol menüde aynı metin görünür.
  const SECTION_HINTS: Record<string, string> = {
    "kokpit-kok-neden": "Tarafın görünen talebinin altındaki asıl mesele; dayanağı ve güven düzeyiyle birlikte, yalnız arabulucuya.",
    "kokpit-siradaki-sorular": "Bir sonraki oturumda sorulduğunda dosyadaki bilgi boşluğunu kapatacak sorular.",
    "kokpit-ic-tutarlilik": "Tarafın kendi beyanı ile kendi belgesi arasındaki uyumsuzluklar; iki dayanak yan yana gösterilir, hüküm kurulmaz.",
    "kokpit-rapora-girmeyenler": "Ajanın değerlendirip rapora almadığı hususlar; neden alınmadığı ve önerilen adımla birlikte.",
    "kokpit-iletisim": "Tarafın nasıl konuştuğundan çıkan izler: kaçınılan konu, tekrar eden tema, sertleşme noktası, hiç değinilmeyen alan, talep ile anlatı farkı.",
    "kokpit-iletisim-degisim": "Aynı tarafın kendi tarihli metinlerinde dilin zaman içindeki değişimi: hangi konuda, hangi tarihten hangi tarihe, ne yönde — iki metinden alıntıyla.",
    "kokpit-uzlasma-zopa": "Anlaşma olasılığı ve tarafların kabul aralıklarının kesiştiği olası anlaşma bandı.",
    "kokpit-taraf-karsilastirma": "Dava yoluna gidilmesi hâlinde tarafları bekleyen risk ve ispat yükü değerlendirmesi.",
    "kokpit-resmi-karsilastirma": "Her tarafın elindeki güçlü dayanaklar ve açık kalan noktalar.",
    "kokpit-senaryolar": "Masaya konabilecek somut çözüm biçimleri ve her birinin dayanağı.",
    "kokpit-kritik-faktorler": "Sonucu belirleyeceği değerlendirilen ana etkenler.",
    "kokpit-kirmizi-cizgiler": "Tarafların taviz vermeyeceğini belirttiği noktalar.",
    "kokpit-uzlasma-engelleri": "Müzakereyi tıkayabilecek konu başlıkları; oturum öncesi bilinmesi gerekenler.",
    "kokpit-arabulucu-onerisi": "Sistemin önerdiği yaklaşım; bağlayıcı değildir, karar arabulucunundur.",
    "kokpit-kaynaklar": "Analizde kullanılan mevzuat ve uzmanlık kitabı parçaları; tıklanınca ilgili sayfada açılır.",
    "kokpit-taraf-analizleri": "Her taraf için güçlü/zayıf yan, risk, belge bulguları ve keşif sorularını içeren tam analiz metni.",
    "kokpit-ortak-zemin": "İki tarafın kesişim alanı, uzlaşma tahmini ve strateji önerileri.",
    "kokpit-kor-teklif": "Taraflar birbirini görmeden kabul aralığı girer; yalnız örtüşme arabulucuya gösterilir.",
  };
  const sectionDefs: CockpitSectionDef[] = [];

  // Katman başlıkları hem sayfada hem sol dizinde BÜYÜK HARF; Türkçe büyük harf
  // (İ noktalı: KOKPİT) doğrudan yazılır, otomatik dönüştürmeye bırakılmaz.
  const LAYER_TABLE = "MASAYA OTURURKEN";
  const LAYER_EVIDENCE = "DAYANAK KATMANI";
  const LAYER_COCKPIT = "KOKPİT";
  const LAYER_REPORTS = "RAPOR VE BELGELER";

  if (cockpitRows.length > 0) {
    sectionDefs.push({
      id: "kokpit-kok-neden", layer: LAYER_TABLE, title: "Kök neden",
      summary: `${cockpitRows.length} kart`,
      pdf: { confidential: true, html: () => cockpitRows.map((r) => {
        const rc = r.party_id ? rootCauses[r.party_id] : undefined;
        return `<div class="card"><h4>${pdfEsc(r.name)}${rc?.guven_seviyesi ? ` — güven: ${pdfEsc(rc.guven_seviyesi)}` : ""}</h4>`
          + `<p><b>Görünen talep:</b> ${pdfEsc(safeText(rc?.gorunen_talep) || "—")}</p>`
          + `<p><b>Asıl mesele:</b> ${pdfEsc(safeText(rc?.asil_mesele) || "—")}</p>`
          + (safeText(rc?.dayanak) ? `<p class="muted"><b>Dayanak:</b> ${pdfEsc(safeText(rc?.dayanak))}</p>` : "")
          + `</div>`;
      }).join("") },
      body: (
        <div className={`grid gap-6 ${cockpitRows.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {cockpitRows.map((r, i) => (
            <CockpitRootCauseCard key={i} name={r.name} rootCause={r.party_id ? rootCauses[r.party_id] : undefined} />
          ))}
        </div>
      ),
    });
  }

  if (communicationQuestions.length > 0) {
    sectionDefs.push({
      id: "kokpit-siradaki-sorular", layer: LAYER_TABLE, title: "Sıradaki 3 soru",
      pdf: { confidential: true, html: () => `<ol>${communicationQuestions.map((it) => {
        const soru = safeText(it.q?.soru);
        const bosluk = safeText(it.q?.hangi_boslugu_kapatir);
        if (!soru) return "";
        return `<li>${pdfEsc(soru)}${bosluk ? `<div class="muted">Kapattığı boşluk: ${pdfEsc(bosluk)}</div>` : ""}</li>`;
      }).join("")}</ol>` },
      body: (
        <ol className="space-y-2 list-decimal list-inside">
          {communicationQuestions.map((it, i) => {
            const soru = safeText(it.q?.soru);
            const bosluk = safeText(it.q?.hangi_boslugu_kapatir);
            if (!soru) return null;
            return (
              <li key={`${it.rowId}-q${i}`} className="text-sm leading-snug">
                {soru}
                {bosluk && (
                  <div className="mt-0.5 ml-4 text-sm text-muted-foreground leading-snug">Kapattığı boşluk: {bosluk}</div>
                )}
              </li>
            );
          })}
        </ol>
      ),
    });
  }

  // Elverişlilik kontrolü (İBA 2.1) — MASAYA OTURURKEN katmanı. KOŞULSUZ eklenir:
  // kayıt yoksa "Henüz çalıştırılmadı" ve [Kontrol et] düğmesi görünür. Yalnız
  // arabulucu yüzeyinde (kokpit) çizilir; taraf ekranında yoktur.
  sectionDefs.push({
    id: "kokpit-elverislilik", layer: LAYER_TABLE, title: "Elverişlilik kontrolü",
    body: <ElverislilikPanel caseRow={caseRow} />,
  });

  // Usul önerisi (İBA 2.2) — MASAYA OTURURKEN katmanı, Elverişlilik kontrolünün
  // hemen ALTINDA. Koşulsuz eklenir; kayıt yoksa "Henüz çalıştırılmadı" görünür.
  // Yalnız arabulucu yüzeyinde (kokpit); tarafa gitmez, kendiliğinden çalışmaz.
  sectionDefs.push({
    id: "kokpit-usul-onerisi", layer: LAYER_TABLE, title: "Usul önerisi",
    body: <UsulOnerisiPanel caseRow={caseRow} />,
  });

  // Usule ilişkin engeller (İBA 2.4) — MASAYA OTURURKEN katmanı, Usul önerisinin
  // hemen ALTINDA. Hesap koddadır (model çağrısı yok), bu yüzden düğmede maliyet
  // işareti YOKTUR. Yalnız arabulucu yüzeyinde çizilir.
  sectionDefs.push({
    id: "kokpit-usul-engeli", layer: LAYER_TABLE, title: "Usule ilişkin engeller",
    body: <UsulEngeliPanel caseRow={caseRow} />,
  });

  if (consistencyItems.length > 0) {
    sectionDefs.push({
      id: "kokpit-ic-tutarlilik", layer: LAYER_EVIDENCE, title: "İç tutarlılık",
      summary: `${consistencyItems.length} bulgu`,
      pdf: { confidential: true, html: () => consistencyItems.map((it) => {
        const f = it.finding ?? {};
        const taraf = it.party_id ? (worklogPartyNameById[it.party_id] ?? "") : "";
        const conf = CONSISTENCY_CONFIDENCE_LABELS[String(f?.guven_seviyesi ?? "").toLowerCase()] ?? "";
        return `<div class="card"><h4>${pdfEsc(safeText(f?.gozlem))}</h4>`
          + `<p class="muted">${taraf ? `${pdfEsc(taraf)} • ` : ""}Güven: ${pdfEsc(conf || "—")}</p>`
          + `<p><b>${pdfEsc(safeText(f?.dayanak_a?.kaynak) || "Dayanak 1")}:</b> <span class="quote">${pdfEsc(safeText(f?.dayanak_a?.alinti))}</span></p>`
          + `<p><b>${pdfEsc(safeText(f?.dayanak_b?.kaynak) || "Dayanak 2")}:</b> <span class="quote">${pdfEsc(safeText(f?.dayanak_b?.alinti))}</span></p>`
          + `</div>`;
      }).join("") },
      body: (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            Tarafın kendi beyanı ile kendi belgeleri arasındaki uyumsuzluklar — yorum arabulucuya aittir
          </p>
          <div className="divide-y">
            {consistencyItems.map((it, i) => (
              <CockpitConsistencyItem
                key={`${it.rowId}-${i}`}
                finding={it.finding}
                partyLabel={it.party_id ? (worklogPartyNameById[it.party_id] ?? null) : null}
              />
            ))}
          </div>
        </>
      ),
    });
  }

  if (worklog.length > 0) {
    sectionDefs.push({
      id: "kokpit-rapora-girmeyenler", layer: LAYER_EVIDENCE, title: "Rapora girmeyenler",
      summary: `${worklog.length} kayıt`,
      pdf: { confidential: true, html: () => worklog.map((w: any) => {
        const c = w?.content ?? {};
        const taraf = w.party_id == null ? "Dosya geneli" : (worklogPartyNameById[w.party_id] ?? "");
        const kategori = String(c?.kategori ?? "");
        return `<div class="card"><h4>${pdfEsc(safeText(c?.husus) || "—")}</h4>`
          + `<p class="muted">${pdfEsc(taraf)}${kategori ? ` • ${pdfEsc(WORKLOG_KATEGORI_LABELS[kategori] ?? kategori)}` : ""}</p>`
          + (safeText(c?.neden_rapora_girmedi) ? `<p>${pdfEsc(safeText(c?.neden_rapora_girmedi))}</p>` : "")
          + (safeText(c?.onerilen_adim) ? `<p><b>Önerilen adım:</b> ${pdfEsc(safeText(c?.onerilen_adim))}</p>` : "")
          + `</div>`;
      }).join("") },
      body: (
        <>
          <p className="text-sm text-muted-foreground mb-2">Ajanın değerlendirip rapora almadığı hususlar ve önerilen adımlar</p>
          <ul className="divide-y">
            {worklog.map((w: any) => (
              <CockpitOffReportItem
                key={w.id}
                item={w.content}
                partyLabel={w.party_id == null ? "Dosya geneli" : (worklogPartyNameById[w.party_id] ?? null)}
              />
            ))}
          </ul>
        </>
      ),
    });
  }

  // İletişim izleri — ÜÇ DURUM (16.08): (1) iz var → izler listelenir · (2) kayıt var,
  // iz yok → "incelendi, bulgu yok" · (3) hiç kayıt yok → "analiz çalıştırılmadı".
  // 16.08'e kadar üçüncü durumda bölüm HİÇ ÇİZİLMİYORDU; kokpitte bölüm sessizce
  // kayboluyordu. Ayrım korundu (incelenmemiş olmak ile bulgu çıkmamış olmak aynı şey
  // değildir) ama artık ekranda yazılı duruyor.
  {
    sectionDefs.push({
      id: "kokpit-iletisim", layer: LAYER_EVIDENCE, title: "İletişim ve asıl ihtiyaç",
      summary: communicationItems.length > 0
        ? `${communicationItems.length} iz`
        : communication.length > 0 ? "incelendi — bulgu yok" : "analiz çalıştırılmadı",
      pdf: { confidential: true, html: () => communicationItems.length === 0
        ? (communication.length > 0
            ? `<p class="muted">Analiz çalıştı ancak doğrulanabilir bir iz bulunamadı.</p>`
            : `<p class="muted">İletişim analizi bu dosyada çalıştırılmadı.</p>`)
        : communicationItems.map((it) => {
            const f = it.finding ?? {};
            const taraf = it.party_id ? (worklogPartyNameById[it.party_id] ?? "") : "";
            const izSlug = String(f?.iz_tipi ?? "").trim();
            const conf = CONSISTENCY_CONFIDENCE_LABELS[String(f?.guven_seviyesi ?? "").toLowerCase()] ?? "";
            return `<div class="card"><h4>${pdfEsc(safeText(f?.gozlem))}</h4>`
              + `<p class="muted">${pdfEsc(COMMUNICATION_IZ_LABELS[izSlug] ?? izSlug)}${taraf ? ` • ${pdfEsc(taraf)}` : ""} • Güven: ${pdfEsc(conf || "—")}</p>`
              + `<p><b>${pdfEsc(safeText(f?.dayanak?.kaynak) || "Dayanak")}:</b> <span class="quote">${pdfEsc(safeText(f?.dayanak?.alinti))}</span></p>`
              + `</div>`;
          }).join("") },
      body: (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            Tarafın nasıl konuştuğundan çıkan izler — yorum arabulucuya aittir
          </p>
          {communicationItems.length > 0 ? (
            <div className="divide-y">
              {communicationItems.map((it, i) => (
                <CockpitCommunicationItem
                  key={`${it.rowId}-${i}`}
                  finding={it.finding}
                  partyLabel={it.party_id ? (worklogPartyNameById[it.party_id] ?? null) : null}
                />
              ))}
            </div>
          ) : communication.length > 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Analiz çalıştı ancak doğrulanabilir bir iz bulunamadı.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              İletişim analizi bu dosyada çalıştırılmadı — Aşama 2'deki taraf kartında
              "İletişim Analizi" düğmesiyle başlatılır.
            </p>
          )}
        </>
      ),
    });
  }

  // İletişimde değişim (İBA 1.5 / A4) — "İletişim ve asıl ihtiyaç" bölümünün HEMEN
  // ALTINDA, aynı DAYANAK katmanında: ikisi aynı metinlerden beslenir (biri asıl
  // ihtiyacı, öteki o dilin zaman içindeki değişimini gösterir).
  // KOŞULSUZ eklenir: veri yetersizken bölüm gizlenmez, kart kendi içinde
  // "karşılaştırılacak yeterli tarihli metin yok" satırını yazar.
  sectionDefs.push({
    id: "kokpit-iletisim-degisim", layer: LAYER_EVIDENCE, title: "İletişimde değişim",
    body: <IletisimDegisimPanel caseRow={caseRow} />,
  });

  if (analyses.length > 0) {
    sectionDefs.push({
      id: "kokpit-uzlasma-zopa", layer: LAYER_COCKPIT, title: "Uzlaşma tahmini ve ZOPA",
      summary: heroUzlasmaPct !== null ? `%${heroUzlasmaPct}` : undefined,
      // Rapor tarafında İKİYE ayrılır: uzlaşma tahmini taraflarla paylaşılabilir,
      // ZOPA (kabul aralığı) arabulucuya özeldir. Ekranda tek bölüm görünmeye devam eder.
      pdfs: [
        {
          id: "kokpit-uzlasma-tahmini", title: "Uzlaşma tahmini", confidential: false,
          html: () => `<p><b>Genel uzlaşma tahmini:</b> ${heroUzlasmaPct !== null ? `%${heroUzlasmaPct}` : "Yeterli veri yok"}`
            + `${cockpitRiskPuani ? ` &nbsp;•&nbsp; <b>Risk:</b> ${pdfEsc(cockpitRiskPuani)}` : ""}</p>`
            + (cockpitRiskOzeti?.genel_uzlasma_orani_kaynak
                ? `<p><b>Nasıl türetildi:</b> ${pdfEsc(cockpitRiskOzeti.genel_uzlasma_orani_kaynak)}</p>`
                : `<p class="muted">Türetim açıklaması bulunmuyor.</p>`),
        },
        {
          id: "kokpit-zopa", title: "ZOPA (olası anlaşma aralığı)", confidential: true,
          html: () => {
            const z = cockpitReportData?.zopa;
            return z && (z.lower_bound || z.upper_bound || z.description)
              ? `<p><b>Alt sınır:</b> ${pdfEsc(z.lower_bound || "—")} &nbsp;•&nbsp; <b>Üst sınır:</b> ${pdfEsc(z.upper_bound || "—")}</p>`
                + `<p><b>Dayanağı:</b> ${pdfEsc(z.description || "Belirtilmemiş")}</p>`
              : `<p class="muted">ZOPA için yeterli veri yok</p>`;
          },
        },
      ],
      body: (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,340px)_1fr] gap-4 items-stretch">
          <CockpitGauge pct={heroUzlasmaPct} riskLabel={cockpitRiskPuani} sourceHint={cockpitRiskOzeti?.genel_uzlasma_orani_kaynak} />
          <CockpitZopaBand zopa={cockpitReportData?.zopa} lowerName={cockpitRows[1]?.name} upperName={cockpitRows[0]?.name} />
        </div>
      ),
    });
  }

  if (cockpitRows.length > 0) {
    sectionDefs.push({
      // id DEĞİŞMEDİ (scrollIntoView bağlantıları kırılmasın); yalnız görünen ad.
      id: "kokpit-taraf-karsilastirma", layer: LAYER_COCKPIT, title: "Risk ve mahkeme değerlendirmesi",
      summary: `${cockpitRows.length} taraf`,
      pdf: { confidential: true, html: () =>
        `<table><thead><tr><th>Taraf</th><th>Risk</th><th>Anlaşma oranı</th><th>Mahkeme riski</th><th>BATNA</th></tr></thead><tbody>`
        + cockpitRows.map((r) => `<tr><td>${pdfEsc(r.name)}</td><td>${pdfEsc(r.risk_puani || "—")}</td>`
            + `<td>${pdfEsc(r.uzlasma_label)}</td><td>${pdfEsc(r.mahkeme_label)}</td><td>${pdfEsc(r.batna || "—")}</td></tr>`).join("")
        + `</tbody></table>` },
      body: (
        <div className={`grid gap-6 ${cockpitRows.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {cockpitRows.map((r, i) => (
            <CockpitPartyColumn
              key={i}
              name={r.name}
              riskPuani={r.risk_puani}
              uzlasmaPct={r.uzlasma_pct}
              uzlasmaLabel={r.uzlasma_label}
              mahkemePct={r.mahkeme_pct}
              mahkemeLabel={r.mahkeme_label}
              batna={r.batna}
            />
          ))}
        </div>
      ),
    });
  }

  if (cockpitScenarios.length > 0) {
    sectionDefs.push({
      id: "kokpit-senaryolar", layer: LAYER_COCKPIT, title: "Çözüm senaryoları",
      summary: `${cockpitScenarios.length} senaryo`,
      pdf: { confidential: true, html: () => cockpitScenarios.map((sc: any, i: number) =>
        `<div class="card"><h4>${String.fromCharCode(65 + i)}) ${pdfEsc(sc?.label || "Senaryo")}</h4>`
        + `<p>${pdfEsc(sc?.summary || "")}</p>`
        + (sc?.tradeoffs?.length ? `<p class="muted"><b>Ödünler:</b></p>${pdfList(sc.tradeoffs)}` : "")
        + `</div>`).join("") },
      body: (
        <div className="grid sm:grid-cols-3 gap-3">
          {cockpitScenarios.map((sc: any, i: number) => {
            const letter = String.fromCharCode(65 + i);
            const recommended = sc === cockpitStrongestScenario || /⭐/.test(`${sc?.label ?? ""} ${sc?.summary ?? ""}`);
            return (
              <CockpitScenarioCard
                key={i}
                letter={letter}
                scenario={sc}
                recommended={recommended}
                onClick={() => setOpenScenario({ letter, scenario: sc, recommended })}
              />
            );
          })}
        </div>
      ),
    });
  }

  if (cockpitCriticalFactors.length > 0) {
    sectionDefs.push({
      id: "kokpit-kritik-faktorler", layer: LAYER_COCKPIT, title: "Kritik faktörler",
      summary: `${cockpitCriticalFactors.length}`,
      pdf: { confidential: true, html: () => pdfList(
        cockpitCriticalFactors.map((f) => f.sources.length > 1 ? `${f.text} (${f.sources.join(", ")})` : f.text)
      ) },
      body: <CockpitBadgeFlow items={cockpitCriticalFactors} />,
    });
  }

  if (cockpitRedLines.length > 0) {
    sectionDefs.push({
      id: "kokpit-kirmizi-cizgiler", layer: LAYER_COCKPIT, title: "Kırmızı çizgiler",
      summary: `${cockpitRedLines.length}`,
      pdf: { confidential: true, html: () => pdfList(cockpitRedLines) },
      body: <CockpitRedLines items={cockpitRedLines} />,
    });
  }

  if (cockpitTarafKarsilastirma.length > 0) {
    sectionDefs.push({
      // id DEĞİŞMEDİ (scrollIntoView bağlantıları kırılmasın); yalnız görünen ad.
      id: "kokpit-resmi-karsilastirma", layer: LAYER_COCKPIT, title: "Güçlü ve zayıf yanlar",
      summary: `${cockpitTarafKarsilastirma.length} taraf`,
      pdf: { confidential: true, html: () =>
        `<table><thead><tr><th>Taraf</th><th>Risk</th><th>Güçlü yan</th><th>Zayıf yan</th></tr></thead><tbody>`
        + cockpitTarafKarsilastirma.map((t: any, i: number) =>
            `<tr><td>${pdfEsc(safeText(t?.taraf) || `Taraf ${i + 1}`)}</td><td>${pdfEsc(t?.risk_puani || "—")}</td>`
            + `<td>${pdfEsc(t?.guclu_yon || "—")}</td><td>${pdfEsc(t?.zayif_yon || "—")}</td></tr>`).join("")
        + `</tbody></table>` },
      body: <CockpitOfficialComparisonTable items={cockpitTarafKarsilastirma} />,
    });
  }

  if (cockpitObstacleList.length > 0) {
    sectionDefs.push({
      id: "kokpit-uzlasma-engelleri", layer: LAYER_COCKPIT, title: "Uzlaşma engelleri",
      summary: `${cockpitObstacleList.length}`,
      pdf: { confidential: true, html: () => pdfList(cockpitObstacleList) },
      body: <CockpitObstacles items={cockpitObstacleList} />,
    });
  }

  if (cockpitMediatorOneri) {
    sectionDefs.push({
      id: "kokpit-arabulucu-onerisi", layer: LAYER_COCKPIT, title: "Arabulucu önerisi",
      pdf: { confidential: true, html: () => `<p>${pdfEsc(cockpitMediatorOneri)}</p>` },
      body: <CockpitMediatorRecommendation text={cockpitMediatorOneri} />,
    });
  }

  if (cockpitKaynakListesi.length > 0) {
    sectionDefs.push({
      id: "kokpit-kaynaklar", layer: LAYER_COCKPIT, title: "Kaynaklar",
      summary: `${cockpitKaynakListesi.length}`,
      // Taraflarla paylaşılabilir: gizlilik ibaresi BASILMAZ.
      pdf: { confidential: false, html: () => `<ol>${cockpitKaynakListesi.map((name) => {
        const src = matchSource(name, cockpitReportData?.sources);
        return `<li>${pdfEsc(name)}${src?.url ? ` — ${pdfEsc(src.url)}` : ""}</li>`;
      }).join("")}</ol>` },
      body: <CockpitSources items={cockpitKaynakListesi} sources={cockpitReportData?.sources} />,
    });
  }

  if (analyses.length > 0) {
    sectionDefs.push({
      id: "kokpit-taraf-analizleri", layer: LAYER_REPORTS, title: "Taraf analizleri",
      summary: `${analyses.length} taraf`,
      pdf: { confidential: true, html: () => analyses.map((a: any, i: number) => {
        const cp = a.case_parties || {};
        const name = cp.company_name || `${cp.first_name ?? ""} ${cp.last_name ?? ""}`.trim() || `Taraf ${i + 1}`;
        return `<div class="card"><h4>${pdfEsc(name)} (${pdfEsc(roleLabel(cp.party_role))})</h4>`
          + (a.analysis?.dispute_area ? `<p><b>Uyuşmazlık türü:</b> ${pdfEsc(a.analysis.dispute_area)}</p>` : "")
          + (a.analysis?.party_position?.batna ? `<p><b>BATNA:</b> ${pdfEsc(a.analysis.party_position.batna)}</p>` : "")
          + `</div>`;
      }).join("") },
      body: (
        <div className="divide-y">
          {analyses.map((a: any, i) => {
            const cp = a.case_parties || {};
            const name = cp.company_name || `${cp.first_name ?? ""} ${cp.last_name ?? ""}`.trim() || "Taraf";
            return (
              <div key={i} className="py-2.5 text-sm">
                <div className="font-medium">{name} <span className="text-muted-foreground">({roleLabel(cp.party_role)})</span></div>
                {a.analysis?.dispute_area && <div><span className="text-muted-foreground">Uyuşmazlık türü: </span>{a.analysis.dispute_area}</div>}
                {a.analysis?.party_position?.batna && <div><span className="text-muted-foreground">BATNA: </span>{a.analysis.party_position.batna}</div>}
              </div>
            );
          })}
        </div>
      ),
    });
  }

  // Ortak zemin raporu her zaman görünür: rapor yoksa da üretim düğmesi burada duruyor.
  sectionDefs.push({
    id: "kokpit-ortak-zemin", layer: LAYER_REPORTS, title: "Ortak zemin raporu",
    summary: report ? undefined : "üretilmedi",
    // Taraflarla paylaşılabilir belge: gizlilik ibaresi BASILMAZ.
    pdf: report?.report ? { confidential: false, html: () => {
      const d: any = report.report ?? {};
      const parts = [
        safeList(d?.common_interests).length ? `<h4>Ortak çıkarlar</h4>${pdfList(safeList(d?.common_interests))}` : "",
        d?.zopa ? `<h4>Uzlaşma alanı (ZOPA)</h4><p><b>Alt:</b> ${pdfEsc(d.zopa.lower_bound || "—")} • <b>Üst:</b> ${pdfEsc(d.zopa.upper_bound || "—")}</p><p>${pdfEsc(d.zopa.description || "")}</p>` : "",
        Array.isArray(d?.scenarios) && d.scenarios.length
          ? `<h4>Çözüm senaryoları</h4>` + d.scenarios.map((sc: any, i: number) =>
              `<div class="card"><h4>${String.fromCharCode(65 + i)}) ${pdfEsc(sc?.label || "Senaryo")}</h4><p>${pdfEsc(sc?.summary || "")}</p>`
              + (sc?.tradeoffs?.length ? pdfList(sc.tradeoffs) : "") + `</div>`).join("")
          : "",
      ].filter(Boolean);
      return parts.length ? parts.join("") : `<p class="muted">Yeterli veri yok</p>`;
    } } : undefined,
    body: (
      <div>
        <div className="flex items-center justify-end mb-2 gap-2 flex-wrap">
          {report && (
            <>
              <Button size="sm" variant="outline" onClick={() => downloadReport({ caseTitle: caseRow.title, caseId: caseRow.id, report: report.report, strategy: report.strategy, analyses, mode: "print" })}>PDF</Button>
              <Button size="sm" variant="outline" onClick={() => downloadReport({ caseTitle: caseRow.title, caseId: caseRow.id, report: report.report, strategy: report.strategy, analyses, mode: "html" })}>İndir</Button>
            </>
          )}
          <Button size="sm" onClick={generateReport} disabled={!canReport || reportBusy}>
            {reportBusy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> {reportStatus ?? "Rapor hazırlanıyor…"}</> : <><Sparkles className="h-4 w-4 mr-1" /> {report ? "Yeniden Üret" : "Rapor Üret"}</>}
          </Button>
          <UcretliIsaret />
        </div>
        {reportBusy && reportAttempt > 1 && (
          <div className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Geçici bir hata oluştu, otomatik olarak tekrar deneniyor ({reportAttempt}/3)…
          </div>
        )}
        {reportError && (
          <div className="text-sm text-destructive flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4" /> {reportError}
            <Button size="sm" variant="outline" onClick={generateReport}><RefreshCw className="h-4 w-4 mr-1" />Tekrar Dene</Button>
            <UcretliIsaret />
          </div>
        )}
        {report ? (
          <CommonGroundZeminSection data={report.report} />
        ) : canReport ? (
          <p className="text-sm text-muted-foreground italic">Henüz rapor üretilmedi. "Rapor Üret" butonuna basın.</p>
        ) : (
          <p className="text-sm text-destructive">
            Rapor üretmeden önce Aşama 2'de en az bir taraf analizini tamamlayın.
          </p>
        )}
      </div>
    ),
  });

  if (report?.report) {
    sectionDefs.push({
      id: "kokpit-strateji", layer: LAYER_REPORTS, title: "Strateji",
      pdf: { confidential: true, html: () => {
        const d: any = report?.report ?? {};
        const parts = [
          safeList(d?.mediator_strategy?.opening).length ? `<h4>Açılış</h4>${pdfList(safeList(d?.mediator_strategy?.opening))}` : "",
          safeList(d?.mediator_strategy?.caucus_focus).length ? `<h4>Özel oturum odağı</h4>${pdfList(safeList(d?.mediator_strategy?.caucus_focus))}` : "",
          safeList(d?.mediator_strategy?.leverage_points).length ? `<h4>Kaldıraç noktaları</h4>${pdfList(safeList(d?.mediator_strategy?.leverage_points))}` : "",
          safeList(d?.red_lines).length ? `<h4>Kırmızı çizgiler</h4>${pdfList(safeList(d?.red_lines))}` : "",
        ].filter(Boolean);
        return parts.length ? parts.join("") : `<p class="muted">Yeterli veri yok</p>`;
      } },
      body: <CommonGroundStrategySection data={report.report} strategy={report.strategy} />,
    });
  }

  sectionDefs.push({
    id: "kokpit-kor-teklif", layer: LAYER_REPORTS, title: "Kör teklif",
    body: <BlindBidMediatorPanel caseId={caseRow.id} />,
  });

  sectionDefs.push({
    id: "kokpit-braket", layer: LAYER_REPORTS, title: "Koşullu aralık (braket)",
    body: <BraketMediatorPanel caseId={caseRow.id} />,
  });

  // Teklif değerlendirme (İBA 2.5) — kör teklif ve braket kartlarının hemen yanında.
  sectionDefs.push({
    id: "kokpit-teklif-degerlendirme", layer: LAYER_REPORTS, title: "Teklif değerlendirme",
    body: <TeklifDegerlendirmePanel caseId={caseRow.id} />,
  });

  // Tıkanma ve çıkış yolları (İBA 2.5 / B20) — teklif kartlarının yanında.
  sectionDefs.push({
    id: "kokpit-tikanma", layer: LAYER_REPORTS, title: "Tıkanma ve çıkış yolları",
    body: <TikanmaCozucuPanel caseRow={caseRow} />,
  });

  // Seçenek sepeti (İBA 1.9 / A10) — tıkanma kartının yanında.
  sectionDefs.push({
    id: "kokpit-secenek-sepeti", layer: LAYER_REPORTS, title: "Seçenek sepeti",
    body: <SecenekSepetiPanel caseRow={caseRow} />,
  });

  // Ajan ne öğrendi (20.08) — sayım ekranı, katmanın sonunda.
  sectionDefs.push({
    id: "kokpit-ogrenme", layer: LAYER_REPORTS, title: "Ajan ne öğrendi",
    body: <OgrenmeKarti caseRow={caseRow} />,
  });

  // Kalem karşılaştırması (19.08) — kokpitin TEK yeni kartı, katmanın sonunda.
  sectionDefs.push({
    id: "kokpit-kalem-karsilastirma", layer: LAYER_REPORTS, title: "Kalem karşılaştırması",
    body: <KalemKarsilastirmaPanel caseId={caseRow.id} onVeri={(v) => { kalemVeriRef.current = v; }} />,
  });

  const layerOrder = [LAYER_TABLE, LAYER_EVIDENCE, LAYER_COCKPIT, LAYER_REPORTS];
  // Katman başlığının kendi çıpası (sol menüden katman adına tıklanınca oraya kayılır)
  // ve başlığın altındaki tek satır açıklama; aynı açıklama menüde tooltip olur.
  const LAYER_META: Record<string, { id: string; hint: string }> = {
    [LAYER_TABLE]: {
      id: "kokpit-katman-masa",
      hint: "Bu katman, ilk oturuma girmeden önce bilmeniz gerekenleri toplar: tarafların görünen taleplerinin altındaki asıl meseleyi gösterir ve bu turda sormanız gereken keşif sorularını verir.",
    },
    [LAYER_EVIDENCE]: {
      id: "kokpit-katman-dayanak",
      hint: "Bu katman, her bulgunun hangi belgeye ve hangi beyana dayandığını gösterir; tarafın kendi anlatımıyla kendi belgesi arasındaki uyumsuzlukları, rapora alınmayan hususları ve iletişiminden çıkan izleri dayanaklarıyla birlikte sunar.",
    },
    [LAYER_COCKPIT]: {
      id: "kokpit-katman-kokpit",
      hint: "Bu katman, dosyanın sayısal görünümünü verir: anlaşma ihtimalini ve olası anlaşma aralığını hesaplar, tarafların güçlü ve zayıf yanlarını, çözüm senaryolarını ve müzakereyi tıkayabilecek başlıkları bir arada gösterir.",
    },
    [LAYER_REPORTS]: {
      id: "kokpit-katman-rapor",
      hint: "Bu katman, analizlerin tam metinlerini barındırır ve dışa aktarmayı sağlar: taraf analizleri, ortak zemin raporu, strateji ve Kör Teklif yüzeyi ile bölüm bazlı PDF çıktıları buradadır.",
    },
  };
  // Sol menüden bir bölüme atlanınca önce kapsayan katmanın açılması gerekir.
  const layerIdBySectionId: Record<string, string> = {};
  sectionDefs.forEach((x) => { layerIdBySectionId[x.id] = LAYER_META[x.layer].id; });
  // Çıktı kalemleri — hem tekil PDF düğmesi hem birleşik rapor seçim listesi buradan.
  // Bir bölüm `pdfs` ile birden çok kaleme ayrılabilir (bkz. uzlaşma tahmini / ZOPA).
  const pdfSections = sectionDefs.flatMap((x) => {
    const common = { layer: x.layer, sectionId: x.id };
    if (x.pdfs) return x.pdfs.map((pd) => ({ ...pd, ...common }));
    if (x.pdf) return [{ id: x.id, title: x.title, confidential: x.pdf.confidential, html: x.pdf.html, ...common }];
    return [];
  });

  // Sol menüye bölüm listesini bildir. Liste her renderda yeniden kurulduğu için
  // yalnız id+başlık dizisi değiştiğinde gönderilir (imza karşılaştırması).
  // Sol menüye giden liste iki kademeli: katman başlığı + o katmanın bölümleri,
  // sağdaki sırayla birebir. Görünen bölümü olmayan katman listeye hiç girmez.
  const menuEntries: { id: string; label: string; kind: "layer" | "section"; hint?: string }[] = [];
  // "Şimdi ne yapmalısın" listenin EN BAŞINDA, katmanlardan önce durur ve diğerleri
  // gibi BÖLÜM BAŞLIĞI biçiminde görünür (kind: "layer"). Kendi katmanı olmadığı,
  // layerIdBySectionId'ye girmediği için katman eşleşmesi etkilenmez; çapa kimliği
  // değişmedi. Kart çizilmiyorsa (madde yok) bu satır da listeye hiç girmez.
  if (yonlendirmeListesi.length > 0) {
    menuEntries.push({ id: YONLENDIRME_ID, label: "ŞİMDİ NE YAPMALISIN", kind: "layer" });
  }
  layerOrder.forEach((layer) => {
    const items = sectionDefs.filter((x) => x.layer === layer);
    if (items.length === 0) return;
    menuEntries.push({ id: LAYER_META[layer].id, label: layer, kind: "layer", hint: LAYER_META[layer].hint });
    items.forEach((x) => menuEntries.push({ id: x.id, label: x.title, kind: "section", hint: SECTION_HINTS[x.id] }));
  });
  // Sol menüdeki numaralandırma — YALNIZ menüde; sayfadaki kart/katman başlıkları
  // olduğu gibi kalır. Kural ve Türkçe büyük harf tek kopyadır: numberMenuEntries
  // (Faz 3 dizini de aynı yardımcıyı kullanır).
  const numberedEntries = numberMenuEntries(menuEntries);
  const sectionSignature = numberedEntries.map((x) => `${x.kind}:${x.id}|${x.label}`).join(",");
  const sectionsReady = !loading && !loadErr;
  useEffect(() => {
    onSectionsChange?.(sectionsReady ? numberedEntries : []);
    return () => onSectionsChange?.([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionSignature, sectionsReady, onSectionsChange]);

  // Sol menüden gelen istek: bölümü aç, sonra oraya yumuşak kaydır.
  useEffect(() => {
    if (!jump?.id) return;
    // Montajdan ÖNCE üretilmiş istek: Faz 4'ten çıkılıp geri girildiğinde eski atlama
    // tekrar oynatılmasın (sayfa alta düşme sebebi). Yeni tıklamaların nonce'ı büyüktür.
    if (jump.nonce <= mountedAtRef.current) return;
    if (jump.id.startsWith("kokpit-katman-")) {
      // Katman başlığına tıklandı: katmanı aç ve oraya kaydır.
      setOpenLayers((prev) => (prev.has(jump.id) ? prev : new Set(prev).add(jump.id)));
    } else {
      // Bölüme tıklandı: önce kapsayan katman, sonra bölüm açılır.
      const layerId = layerIdBySectionId[jump.id];
      if (layerId) setOpenLayers((prev) => (prev.has(layerId) ? prev : new Set(prev).add(layerId)));
      setOpenSections((prev) => (prev.has(jump.id) ? prev : new Set(prev).add(jump.id)));
    }
    // Kaydırma: tek atışlık scrollIntoView, düzen henüz oturmamışsa veya tarayıcı
    // kaydırma konumunu geri yüklüyorsa sonuçsuz kalabiliyordu ("Şimdi ne yapmalısın"
    // satırında görülen durum: satır seçiliyor ama sayfa kaymıyor). Hedef konum sayı
    // olarak hesaplanır, düzen oturduktan sonra uygulanır ve bir kez daha doğrulanır.
    // Kullanıcı bu arada kendi kaydırırsa bırakılır.
    let abort = false;
    const stop = () => { abort = true; };
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchmove", stop, { passive: true });
    const jumpTo = () => {
      if (abort) return;
      const el = document.getElementById(jump.id);
      if (!el) return;
      // 96px = kartlardaki scroll-mt-24 karşılığı (üstteki şerit için pay).
      const top = Math.max(0, window.scrollY + el.getBoundingClientRect().top - 96);
      window.scrollTo({ top, left: 0, behavior: "smooth" });
    };
    const raf = requestAnimationFrame(() => requestAnimationFrame(jumpTo));
    const t = window.setTimeout(jumpTo, 350);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
    };
  }, [jump?.id, jump?.nonce]);

  /* 19.08 — kokpit eksikleri:
     · "Tümünü aç/kapat": bütün katman ve bölümleri tek düğmeyle açar/kapatır.
     · "yeni" işareti: ajan bir bölümün verisini yazdığında başlıkta sakin bir
       işaret durur, kart açılınca kaybolur. Mevcut Realtime deseni kullanılır. */
  const kalemVeriRef = useRef(false);
  const [yeniBolumler, setYeniBolumler] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const kanal = supabase
      .channel(`kokpit_yeni:${caseRow.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "agent_states", filter: `case_id=eq.${caseRow.id}` },
        (payload: any) => {
          const tip = String(payload?.new?.agent_type ?? "");
          const bolum = AJAN_BOLUMU[tip];
          if (!bolum || String(payload?.new?.status ?? "") !== "completed") return;
          setYeniBolumler((prev) => (prev.has(bolum) ? prev : new Set(prev).add(bolum)));
        })
      .subscribe();
    return () => { supabase.removeChannel(kanal); };
  }, [caseRow.id]);

  // Faz 4 montajında sayfa üstten açılır; ancak kokpit kartları yüklendikten sonra
  // sayfanın yüksekliği değiştiği için tarayıcı eski kaydırma konumunu geri
  // yükleyebiliyor ve ekran ortadan açılıyordu. Yükleme bitince üst konum bir kez
  // daha, anında uygulanır. Kullanıcı kendi kaydırdıysa veya sol menüden bir bölüme
  // atlandıysa hiç dokunulmaz.
  useEffect(() => {
    if (loading || topAppliedRef.current) return;
    if (jump && jump.nonce > mountedAtRef.current) return;
    topAppliedRef.current = true;
    scrollPageTop();
    const raf = requestAnimationFrame(scrollPageTop);
    const t = window.setTimeout(scrollPageTop, 150);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [loading, jump?.nonce, scrollPageTop]);

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
    <div className="space-y-4">
      <PhaseHero
        label="AŞAMA 3 — ARABULUCU PANELİ"
        metrics={[
          { label: "Uzlaşma Tahmini", value: heroUzlasmaPct, suffix: "%" },
        ]}
        aside={
          heroRiskRows.length > 0 ? (
            <div className="flex gap-3">
              {heroRiskRows.map((r, i) => (
                <div key={i} className="rounded-lg bg-sidebar-accent/40 border border-sidebar-border px-3 py-2 min-w-[110px]">
                  <div className="text-[10px] uppercase tracking-wide text-sidebar-foreground/50 truncate max-w-[100px]">{r.name}</div>
                  <span className={`inline-block mt-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${riskBadgeTone(r.risk_puani)}`}>
                    {r.risk_puani || "Yeterli veri yok"}
                  </span>
                </div>
              ))}
            </div>
          ) : undefined
        }
      />
    <Card className="p-6 space-y-4">
      {/* Aşama başlığı üst şeritte (PhaseHero); burada tekrarlanmaz. */}
      <p className="text-sm text-muted-foreground">Aşama 2'de üretilen taraf analizlerinin özeti ve Ortak Zemin Raporu üretimi.</p>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">

        {/* Karşılaştırmalı risk_ozeti otomatik-üretim efekti sessizce çalışmaya devam eder;
            görünümü aşağıdaki kokpit panelleri devralır, mükerrer kart göstermez. */}
        {report?.report && (
          <div className="hidden" aria-hidden="true">
            <ComparativeRiskAnalysis
              parties={analyses.map((a: any) => ({ id: a.party_id, ...(a.case_parties || {}) }))}
              analyses={analyses}
              reportData={report.report}
              caseId={caseRow.id}
            />
          </div>
        )}

        {/* ── 1. DURUM ŞERİDİ — ekranda sabit duran tek bölüm; katlanmaz ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statusStripItems.map((m, i) => (
            <div key={i} className="min-w-0">
              <div className="text-sm text-muted-foreground truncate">{m.label}</div>
              <div className="text-sm font-semibold truncate">{m.value}</div>
              {m.sub && <div className="text-sm text-muted-foreground truncate">{m.sub}</div>}
            </div>
          ))}
        </motion.div>

        {/* ── "Şimdi ne yapmalısın" — kural tabanlı yönlendirme; madde yoksa hiç çizilmez ── */}
        {yonlendirmeListesi.length > 0 && (
          <motion.div variants={itemVariants} id={YONLENDIRME_ID} className={`${cockpitLayerBoxClass} scroll-mt-24`}>
            <div className="text-lg font-semibold">ŞİMDİ NE YAPMALISIN</div>
            <ul className="divide-y">
              {yonlendirmeListesi.map((m, i) => {
                const acik = acikYonlendirme === i;
                return (
                  <li key={i} className="py-2.5">
                    <button
                      type="button"
                      onClick={() => setAcikYonlendirme(acik ? null : i)}
                      className="w-full flex items-start justify-between gap-2 text-left"
                    >
                      <span className="text-sm font-medium">{m.baslik}</span>
                      <span className="shrink-0 text-sm font-medium text-primary hover:underline">{acik ? "Gizle" : "Açıkla"}</span>
                    </button>
                    {m.eylem === "randevu" && onRandevuAyarla && (
                      <div className="mt-2">
                        <Button size="sm" onClick={onRandevuAyarla}>
                          <CalIcon className="h-4 w-4 mr-1" /> Randevu ayarla
                        </Button>
                      </div>
                    )}
                    {m.eylem === "kesif" && m.soru && (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          disabled={soruGonderiliyor}
                          onClick={() => keSifSorusunuGonder(m.soru!)}
                        >
                          {soruGonderiliyor
                            ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            : <MessageSquare className="h-4 w-4 mr-1" />}
                          Soruyu gönder
                        </Button>
                      </div>
                    )}
                    {acik && m.dayanak.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {m.dayanak.map((d, j) => (
                          <p key={j} className="text-sm text-muted-foreground leading-snug">{d}</p>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {sonGonderilenSoru && (
              <p className="text-sm text-muted-foreground">
                ✓ Gönderildi: {sonGonderilenSoru.length > 90 ? `${sonGonderilenSoru.slice(0, 90)}…` : sonGonderilenSoru}
              </p>
            )}
          </motion.div>
        )}

        {analyses.length === 0 && (
          <motion.div variants={itemVariants} className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground italic text-center">
            Kokpit, Aşama 2'de en az bir taraf analizi tamamlandığında dolmaya başlar.
          </motion.div>
        )}

        {/* Kokpit brifingi — bölüm değil, eylem satırı; katlanmaz. */}
        {report && analyses.length > 0 && (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => downloadCockpitBriefing({
              caseTitle: caseRow.title, caseId: caseRow.id, mode: "print",
              uzlasmaPct: heroUzlasmaPct, uzlasmaKaynak: cockpitRiskOzeti?.genel_uzlasma_orani_kaynak, riskPuani: cockpitRiskPuani,
              zopa: cockpitReportData?.zopa, tarafKarsilastirma: cockpitTarafKarsilastirma, scenarios: cockpitScenarios,
              criticalFactors: cockpitCriticalFactors.map((f) => f.sources.length > 1 ? `${f.text} (${f.sources.join(", ")})` : f.text), redLines: cockpitRedLines, obstacles: cockpitObstacleList,
              mediatorOneri: cockpitMediatorOneri, kaynakListesi: cockpitKaynakListesi, sources: cockpitReportData?.sources,
            })}>PDF</Button>
            <Button size="sm" variant="outline" onClick={() => downloadCockpitBriefing({
              caseTitle: caseRow.title, caseId: caseRow.id, mode: "html",
              uzlasmaPct: heroUzlasmaPct, uzlasmaKaynak: cockpitRiskOzeti?.genel_uzlasma_orani_kaynak, riskPuani: cockpitRiskPuani,
              zopa: cockpitReportData?.zopa, tarafKarsilastirma: cockpitTarafKarsilastirma, scenarios: cockpitScenarios,
              criticalFactors: cockpitCriticalFactors.map((f) => f.sources.length > 1 ? `${f.text} (${f.sources.join(", ")})` : f.text), redLines: cockpitRedLines, obstacles: cockpitObstacleList,
              mediatorOneri: cockpitMediatorOneri, kaynakListesi: cockpitKaynakListesi, sources: cockpitReportData?.sources,
            })}>Kaydet (HTML)</Button>
          </div>
        )}

        {/* Tümünü aç/kapat — katlama sistemi zaten vardı, yalnız bu düğme eklendi. */}
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => {
              const hepsiAcik = sectionDefs.length > 0 && sectionDefs.every((x) => openSections.has(x.id));
              if (hepsiAcik) { setOpenSections(new Set()); setOpenLayers(new Set()); }
              else {
                setOpenSections(new Set(sectionDefs.map((x) => x.id)));
                setOpenLayers(new Set(layerOrder.map((l) => LAYER_META[l].id)));
              }
            }}
          >
            {sectionDefs.length > 0 && sectionDefs.every((x) => openSections.has(x.id))
              ? "Tümünü kapat" : "Tümünü aç"}
          </Button>
        </div>

        {/* ── 2-5. KATMANLAR — her katman sade başlık + katlanır satırlar ── */}
        {layerOrder.map((layer) => {
          const items = sectionDefs.filter((s) => s.layer === layer);
          if (items.length === 0) return null;
          return (
            <motion.div key={layer} id={LAYER_META[layer].id} variants={itemVariants} className={`${cockpitLayerBoxClass} scroll-mt-24`}>
              <div className="flex items-start justify-between gap-2">
                {/* Katman başlığı da katlanır: varsayılan kapalı, tıklayınca bölüm
                    listesi açılır. Ana başlık görünümü bölüm satırlarından ayrı kalır. */}
                <button
                  type="button"
                  onClick={() => toggleLayer(LAYER_META[layer].id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold">{layer}</div>
                    <span className="text-sm text-muted-foreground">{items.length} bölüm</span>
                    {openLayers.has(LAYER_META[layer].id)
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  {/* Açıklama: başlıktan bir kademe küçük, italik ve ince — görsel
                      hiyerarşi başlık > açıklama kalsın, uzun metin sarabilsin. */}
                  <p className="text-xs font-light italic text-muted-foreground mt-1 max-w-3xl leading-relaxed">
                    {LAYER_META[layer].hint}
                  </p>
                </button>
                {layer === LAYER_REPORTS && pdfSections.length > 0 && (
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => {
                    setPickedSections(new Set(pdfSections.map((x) => x.id)));
                    setReportPickerOpen(true);
                  }}>
                    Rapor oluştur
                  </Button>
                )}
              </div>
              <div className={openLayers.has(LAYER_META[layer].id) ? "" : "hidden"}>
                {items.map((s) => (
                  <CockpitCollapsible
                    key={s.id}
                    id={s.id}
                    title={s.title}
                    summary={s.summary}
                    hint={SECTION_HINTS[s.id]}
                    open={openSections.has(s.id)}
                    yeni={yeniBolumler.has(s.id)}
                    bos={s.id === "kokpit-kalem-karsilastirma" && !kalemVeriRef.current}
                    onToggle={() => {
                      // Kart açılınca "yeni" işareti kaybolur.
                      setYeniBolumler((prev) => {
                        if (!prev.has(s.id)) return prev;
                        const y = new Set(prev); y.delete(s.id); return y;
                      });
                      toggleSection(s.id);
                    }}
                    pdfActions={pdfSections.filter((x) => x.sectionId === s.id).map((x) => ({
                      label: x.title,
                      run: () => printSectionsPdf({
                        caseTitle: caseRow.title, caseId: caseRow.id,
                        docTitle: x.title, confidential: x.confidential,
                        sections: [{ title: x.title, html: x.html() }],
                      }),
                    }))}
                  >
                    {s.body}
                  </CockpitCollapsible>
                ))}
              </div>
            </motion.div>
          );
        })}

        <motion.div variants={itemVariants} className="border-t pt-4 flex items-center gap-2 flex-wrap">
          <Label className="text-sm text-muted-foreground shrink-0">UYAP kayıt no</Label>
          <Input
            value={uyap} onChange={(e) => setUyap(e.target.value)} placeholder="Örn. 2026/12345"
            className="font-mono h-8 text-sm max-w-[200px]"
          />
          <Button onClick={saveUyap} disabled={savingUyap} size="sm" className="h-8">
            {savingUyap ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Kaydet"}
          </Button>
        </motion.div>
      </motion.div>
    </Card>
    <Dialog open={reportPickerOpen} onOpenChange={setReportPickerOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Rapor oluştur</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-muted-foreground">Seçilen bölümler tek PDF'te birleştirilir.</p>
          {/* Liste ekrandaki katman sırasıyla gruplanır; her grubun başında
              "tümünü seç" kutusu vardır. Verisi olmayan bölüm zaten listede yok. */}
          {layerOrder.map((layer) => {
            const group = pdfSections.filter((x) => x.layer === layer);
            if (group.length === 0) return null;
            const allPicked = group.every((x) => pickedSections.has(x.id));
            return (
              <div key={layer}>
                <label className="flex items-center gap-2 py-2 border-t text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={allPicked}
                    onChange={() => setPickedSections((prev) => {
                      const next = new Set(prev);
                      group.forEach((x) => { if (allPicked) next.delete(x.id); else next.add(x.id); });
                      return next;
                    })}
                  />
                  <span className="flex-1">{layer}</span>
                  <span className="text-xs font-normal text-muted-foreground">tümünü seç</span>
                </label>
                <div className="pl-6">
                  {group.map((x) => (
                    <label key={x.id} className="flex items-center gap-2 py-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={pickedSections.has(x.id)}
                        onChange={() => setPickedSections((prev) => {
                          const next = new Set(prev);
                          if (next.has(x.id)) next.delete(x.id); else next.add(x.id);
                          return next;
                        })}
                      />
                      <span className="flex-1">{x.title}</span>
                      {x.confidential && <span className="text-xs text-muted-foreground">arabulucuya özel</span>}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          {/* Seçimde tek bir gizli bölüm varsa ibare TÜM belgeye basılır — karışık
              belgede sayfa sayfa ayırmak güvenli değil. */}
          {pdfSections.some((x) => pickedSections.has(x.id) && x.confidential) && (
            <p className="text-sm text-destructive">
              Seçimde arabulucuya özel bölüm var — belgenin her sayfasına "{PDF_CONFIDENTIAL_NOTE}" ibaresi basılacak.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setReportPickerOpen(false)}>Vazgeç</Button>
            <Button
              size="sm"
              disabled={pickedSections.size === 0}
              onClick={() => {
                const chosen = pdfSections.filter((x) => pickedSections.has(x.id));
                if (chosen.length === 0) return;
                printSectionsPdf({
                  caseTitle: caseRow.title, caseId: caseRow.id,
                  docTitle: "Arabulucu Raporu",
                  confidential: chosen.some((x) => x.confidential),
                  sections: chosen.map((x) => ({ title: x.title, html: x.html() })),
                });
                setReportPickerOpen(false);
              }}
            >
              PDF oluştur
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={!!openScenario} onOpenChange={(o) => !o && setOpenScenario(null)}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary">{openScenario?.letter}</span>
            {openScenario?.recommended && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">Önerilen</span>
            )}
          </div>
          <DialogTitle className="text-lg font-semibold">{safeText(openScenario?.scenario?.label) || "Senaryo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="leading-relaxed">{safeText(openScenario?.scenario?.summary) || "—"}</p>
          {safeList(openScenario?.scenario?.tradeoffs).length > 0 && (
            <div className="border-t pt-4">
              <div className="text-sm font-semibold text-primary mb-1.5">Taraf ödünleri ve riskleri</div>
              <ul className="divide-y">
                {safeList(openScenario?.scenario?.tradeoffs).map((t, i) => (
                  <li key={i} className="py-1.5 leading-snug">{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </div>
  );
}

function formatBidAmount(v: number | null, currency: string): string {
  if (v === null || v === undefined) return "—";
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: currency || "TRY", maximumFractionDigits: 0 }).format(v);
  } catch {
    return `${v.toLocaleString("tr-TR")} ${currency}`;
  }
}

function blindBidPartyName(p: any, i: number): string {
  // AD TEMİZLİĞİ (17.08): veritabanındaki ad alanları sondaki/baştaki boşluğu
  // taşıyabiliyor; birleştirince araya çift boşluk giriyordu ("Nurten  ÇOBANOĞLU").
  // .trim() yalnız uçları kırptığı için yetmiyor — art arda gelen boşluklar tek
  // boşluğa indirilir, sonra uçlar kırpılır.
  const ad = (p.company_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`)
    .replace(/\s+/g, " ").trim();
  return ad || `Taraf ${i + 1}`;
}

type BlindBidRow = {
  party_id: string;
  min_amount: number | null;
  max_amount: number | null;
  currency: string;
  note: string | null;
};

// Faz 4 "Kör Teklif" sekmesi — Smartsettle ONE tarzı arabulucu-asist kör pazarlık.
// Taraflar birbirinin teklifini hiçbir zaman görmez (RLS: case_parties.user_id = auth.uid());
// bu panel yalnızca arabulucu/admin erişimindeki Faz 4 içinde render edilir.
function BlindBidMediatorPanel({ caseId }: { caseId: string }) {
  const [parties, setParties] = useState<any[]>([]);
  const [bids, setBids] = useState<BlindBidRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const [p, b] = await Promise.all([
        supabase.from("case_parties").select("id, party_role, first_name, last_name, company_name").eq("case_id", caseId).order("created_at"),
        supabase.from("blind_bids").select("party_id, min_amount, max_amount, currency, note").eq("case_id", caseId),
      ]);
      if (p.error) throw p.error;
      if (b.error) throw b.error;
      setParties(Array.isArray(p.data) ? p.data : []);
      setBids(Array.isArray(b.data) ? (b.data as any) : []);
    } catch (e: any) {
      console.error("[BlindBidMediatorPanel] load failed", e);
      setLoadErr(e?.message ?? "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }, [caseId]);
  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <Card className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Kör teklifler yükleniyor…
    </Card>
  );
  if (loadErr) return (
    <Card className="p-6 space-y-3">
      <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
        <AlertTriangle className="h-4 w-4" /> Kör teklif verileri yüklenemedi
      </div>
      <p className="text-xs text-muted-foreground break-words">{trErr(loadErr)}</p>
      <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3 w-3 mr-1" /> Tekrar Dene</Button>
    </Card>
  );

  const bidByParty = new Map(bids.map((b) => [b.party_id, b]));
  const rows = parties.map((p, i) => ({ party: p, name: blindBidPartyName(p, i), bid: bidByParty.get(p.id) ?? null }));
  const withBid = rows.filter((r) => r.bid && (r.bid.min_amount !== null || r.bid.max_amount !== null));

  // Örtüşme (ZOPA) hesabı yalnızca iki taraf da tam bir min-maks aralığı girdiğinde yapılır.
  let overlap: { lower: number; upper: number } | null = null;
  let gap: number | null = null;
  let overlapCurrency = "TRY";
  let incomplete = false;
  if (withBid.length >= 2) {
    const [a, b] = withBid;
    if (a.bid!.min_amount !== null && a.bid!.max_amount !== null && b.bid!.min_amount !== null && b.bid!.max_amount !== null) {
      const lower = Math.max(a.bid!.min_amount, b.bid!.min_amount);
      const upper = Math.min(a.bid!.max_amount, b.bid!.max_amount);
      overlapCurrency = a.bid!.currency || b.bid!.currency || "TRY";
      if (upper >= lower) overlap = { lower, upper };
      else gap = lower - upper;
    } else {
      incomplete = true;
    }
  }

  return (
    <div className="rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground p-6 shadow-elegant space-y-4">
      <div className="flex items-center gap-2">
        <EyeOff className="h-4 w-4 text-accent" />
        <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold">Kör Teklif Durumu</div>
      </div>
      <p className="text-xs text-sidebar-foreground/60 leading-snug">
        Taraflar birbirinin teklifini göremez — yalnızca siz (arabulucu) her iki tarafın teklif
        durumunu ve, ikisi de teklif girdiğinde, örtüşme (tatmin) bölgesini görürsünüz. Taraflara,
        kendi Kör Teklif formlarını Aşama 3 sekmesinden doldurmalarını hatırlatabilirsiniz.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-sidebar-foreground/50 italic">Bu vakada henüz taraf tanımlanmamış.</p>
      ) : (
        <div className={`grid gap-4 ${rows.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {rows.map(({ party, name, bid }) => {
            const entered = !!bid && (bid.min_amount !== null || bid.max_amount !== null);
            return (
              <div key={party.id} className="rounded-xl border border-sidebar-border bg-sidebar-accent/25 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display font-semibold truncate">
                    {name} <span className="text-xs text-sidebar-foreground/50 font-normal">({roleLabel(party.party_role)})</span>
                  </div>
                  <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${entered ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-sidebar-border/60 text-sidebar-foreground/50"}`}>
                    {entered ? "Girdi" : "Girmedi"}
                  </span>
                </div>
                {entered && (
                  <div className="text-sm font-display font-bold">
                    {formatBidAmount(bid!.min_amount, bid!.currency)}
                    <span className="text-sidebar-foreground/50 mx-1 font-normal">–</span>
                    {formatBidAmount(bid!.max_amount, bid!.currency)}
                  </div>
                )}
                {entered && bid!.note && <p className="text-xs text-sidebar-foreground/60 leading-snug">{bid!.note}</p>}
              </div>
            );
          })}
        </div>
      )}

      {overlap && (
        <div className="rounded-xl border border-accent/60 bg-accent/10 p-4 space-y-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold">Tatmin Bölgesi</div>
          <div className="font-display text-lg font-bold text-sidebar-foreground">
            {formatBidAmount(overlap.lower, overlapCurrency)} – {formatBidAmount(overlap.upper, overlapCurrency)}
          </div>
          <p className="text-xs text-sidebar-foreground/60">İki tarafın kör teklif aralıkları örtüşüyor — bu bant üzerinden anlaşma önerilebilir.</p>
        </div>
      )}
      {gap !== null && (
        <div className="rounded-xl border border-dashed border-destructive/50 bg-destructive/5 p-4 space-y-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-destructive font-semibold">Örtüşme Yok</div>
          <div className="font-display text-lg font-bold text-sidebar-foreground">Fark: {formatBidAmount(gap, overlapCurrency)}</div>
          <p className="text-xs text-sidebar-foreground/60">Taraflar arasındaki aralıklar kesişmiyor; ek tur veya yüz yüze kolaylaştırma gerekebilir.</p>
        </div>
      )}
      {incomplete && (
        <p className="text-xs text-amber-600 dark:text-amber-400 italic">Bir tarafın teklifi eksik (yalnızca alt veya yalnızca üst sınır girilmiş) — örtüşme hesaplanamıyor.</p>
      )}
      {withBid.length < 2 && rows.length >= 2 && (
        <p className="text-xs text-sidebar-foreground/50 italic">Örtüşme hesabı için her iki tarafın da kör teklif girmesi gerekir.</p>
      )}
    </div>
  );
}

// Faz 4 "Kör Teklif" — taraf görünümü. Yalnızca kendi teklifini görür/düzenler;
// karşı tarafın teklifinin var olup olmadığını dahi göremez (RLS bunu garanti eder).
function BlindBidPartyForm({ caseId, userId }: { caseId: string; userId: string }) {
  const [partyId, setPartyId] = useState<string | null>(null);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const { data: party, error: partyErr } = await supabase
        .from("case_parties").select("id").eq("case_id", caseId).eq("user_id", userId).maybeSingle();
      if (partyErr) throw partyErr;
      if (!party) { setPartyId(null); return; }
      setPartyId(party.id);
      const { data: bid, error: bidErr } = await supabase
        .from("blind_bids").select("min_amount, max_amount, note").eq("case_id", caseId).eq("party_id", party.id).maybeSingle();
      if (bidErr) throw bidErr;
      setMinAmount(bid?.min_amount != null ? String(bid.min_amount) : "");
      setMaxAmount(bid?.max_amount != null ? String(bid.max_amount) : "");
      setNote(bid?.note ?? "");
    } catch (e: any) {
      console.error("[BlindBidPartyForm] load failed", e);
      setLoadErr(e?.message ?? "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }, [caseId, userId]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!partyId) return;
    const min = minAmount.trim() ? Number(minAmount.replace(",", ".")) : null;
    const max = maxAmount.trim() ? Number(maxAmount.replace(",", ".")) : null;
    if ((min !== null && Number.isNaN(min)) || (max !== null && Number.isNaN(max))) {
      toast({ title: "Geçersiz tutar", description: "Lütfen min ve maks alanlarına sayı girin.", variant: "destructive" });
      return;
    }
    if (min !== null && max !== null && min > max) {
      toast({ title: "Geçersiz aralık", description: "Min tutar, maks tutardan büyük olamaz.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("blind_bids").upsert({
      case_id: caseId, party_id: partyId, min_amount: min, max_amount: max, note: note.trim() || null,
    } as any, { onConflict: "case_id,party_id" });
    setSaving(false);
    if (error) toast({ title: "Kaydedilemedi", description: trErr(error.message), variant: "destructive" });
    else toast({ title: "Kör teklifiniz kaydedildi" });
  }

  if (loading) return (
    <Card className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Teklifiniz yükleniyor…
    </Card>
  );
  if (loadErr) return (
    <Card className="p-6 space-y-3">
      <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
        <AlertTriangle className="h-4 w-4" /> Teklif verileri yüklenemedi
      </div>
      <p className="text-xs text-muted-foreground break-words">{trErr(loadErr)}</p>
      <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3 w-3 mr-1" /> Tekrar Dene</Button>
    </Card>
  );
  if (!partyId) return (
    <Card className="p-6 text-sm text-muted-foreground">Bu vakada size ait bir taraf kaydı bulunamadı.</Card>
  );

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <EyeOff className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Kör Teklif</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-snug">
        Karşı tarafın teklifini göremezsiniz, karşı taraf da sizinkini görmez — yalnızca arabulucu
        ikisini birlikte değerlendirebilir. Anlaşabileceğiniz min-maks tutar aralığını girin;
        dilediğiniz zaman güncelleyebilirsiniz.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Min. Tutar</Label>
          <Input inputMode="decimal" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="Örn. 50000" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Maks. Tutar</Label>
          <Input inputMode="decimal" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="Örn. 80000" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Not (yalnızca arabulucu görür)</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Arabulucuya iletmek istediğiniz ek açıklama…" />
      </div>
      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
        Kaydet
      </Button>
    </Card>
  );
}

/* ====== OLAY ZAMAN ÇİZELGESİ (İBA 2.3 · mimari/05 §5.2g) — yalnız arabulucu ====== */
// olay_cizelgesi tablosunda tarafa SELECT politikası yoktur; bu panel taraf
// ekranında (CaseRoom) hiçbir sürümde yoktur. Kaynağı olmayan satır zaten
// sunucuda elendiği için ekranda her satırın bir dayanağı vardır.

type CizelgeSatiri = {
  id: string;
  tarih: string | null;
  tarih_metni: string;
  olay: string;
  kaynak_tipi: string;
  kaynak_adi: string | null;
  kaynak_bolum: string | null;
  celiski_notu: string | null;
  sira: number;
};

function cizelgeKaynakMetni(r: CizelgeSatiri): string {
  const ad = (r.kaynak_adi ?? "").trim();
  if (r.kaynak_tipi === "beyan") return ad ? `${ad} beyanı` : "Tarafın beyanı";
  if (r.kaynak_tipi === "kayit") return ad || "Dosya kaydı";
  const bolum = (r.kaynak_bolum ?? "").trim();
  return [ad || "Belge", bolum].filter(Boolean).join(" · ");
}

function OlayCizelgesiPanel({ caseId, onCountChange }: { caseId: string; onCountChange: (n: number) => void }) {
  const [satirlar, setSatirlar] = useState<CizelgeSatiri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    const { data, error } = await (supabase.from("olay_cizelgesi" as any) as any)
      .select("id, tarih, tarih_metni, olay, kaynak_tipi, kaynak_adi, kaynak_bolum, celiski_notu, sira")
      .eq("case_id", caseId).order("sira");
    setYukleniyor(false);
    if (error) { setHata(`Çizelge okunamadı: ${trErr(error.message)}`); return; }
    setHata(null);
    const liste = (Array.isArray(data) ? data : []) as CizelgeSatiri[];
    setSatirlar(liste);
    onCountChange(liste.length);
  }, [caseId, onCountChange]);

  useEffect(() => { yukle(); }, [yukle]);

  async function cikar(yenile: boolean) {
    setBusy(true);
    setHata(null);
    setBilgi(null);
    try {
      const { data, error } = await supabase.functions.invoke("olay-cizelgesi", {
        body: { case_id: caseId, yenile },
      });
      if (error) {
        // Gerçek sebep .context gövdesindedir; sessizce yutulmaz.
        let ham = String((error as any)?.message ?? "bilinmeyen hata");
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.text === "function") {
          try {
            const govde = await ctx.text();
            if (govde) {
              try { const j = JSON.parse(govde); ham = String(j?.error ?? j?.detay ?? govde); }
              catch { ham = String(govde).slice(0, 400); }
            }
          } catch { /* gövde okunamadı */ }
        }
        throw new Error(ham);
      }
      if ((data as any)?.error) throw new Error(String((data as any).error));
      if ((data as any)?.atlandi) setBilgi(String((data as any).sebep ?? "Çizelge üretilmedi"));
      await yukle();
    } catch (e: any) {
      console.error("[olay-cizelgesi] çağrı başarısız", e);
      setHata(`olay-cizelgesi çağrısı başarısız: ${trErr(e?.message ?? "bilinmeyen hata")}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground leading-snug flex-1 min-w-[220px]">
          Dosyadaki bütün tarihler tek çizelgede, eskiden yeniye. Her satır dayandığı belgeyi
          veya beyanı gösterir; kaynağı olmayan tarih çizelgeye girmez. Bu çizelge yalnız
          size görünür.
        </p>
        <Button size="sm" variant="outline" className={KART_DUGME} onClick={() => cikar(satirlar.length > 0)} disabled={busy || yukleniyor}>
          {busy
            ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Çıkarılıyor…</>
            : <><Sparkles className="h-4 w-4 mr-1" /> {satirlar.length > 0 ? "Çizelgeyi yenile" : "Çizelgeyi çıkar"}</>}
        </Button>
        <UcretliIsaret />
      </div>

      {hata && (
        <p className="text-sm text-destructive flex items-start gap-1.5 break-words">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><span>{hata}</span>
        </p>
      )}
      {bilgi && <p className="text-xs text-amber-600 dark:text-amber-400">{bilgi}</p>}

      {yukleniyor ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
        </p>
      ) : satirlar.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Çizelge henüz çıkarılmadı. Belgeler yüklendikten sonra "Çizelgeyi çıkar" düğmesini kullanın.
        </p>
      ) : (
        <ol className="relative border-l-2 border-border ml-2 space-y-4">
          {satirlar.map((r) => (
            <li key={r.id} className="ml-4">
              <span className="absolute -left-[7px] mt-1.5 block h-3 w-3 rounded-full border-2 border-primary/50 bg-background" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{r.tarih_metni}</p>
                <p className="text-sm text-muted-foreground leading-snug">{r.olay}</p>
                <p className="text-[11px] text-muted-foreground">Kaynak: {cizelgeKaynakMetni(r)}</p>
                {r.celiski_notu && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">{r.celiski_notu}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ====== USULE İLİŞKİN ENGELLER (İBA 2.4 · todo B17) — yalnız arabulucu ====== */
// Süreci aksatabilecek usul eksiklerini SAYAR. Kanun yorumu YAPMAZ; yalnız eksiği
// söyler ve elde doğrulanmış bir mevzuat dayanağı VARSA onu referans olarak yazar.
// Hesap tamamen deterministiktir: ekranda zaten yüklü olan taraf, belge ve dosya
// kayıtlarından türetilir — yeni AI çağrısı, yeni tablo ve yeni sorgu YOKTUR.
// Süre bilgisi mevcut süre takibinden OKUNUR, yeniden hesaplanmaz.

type UsulSatiri = {
  key: string;
  tip: string;
  baslik: string;
  aciklama: string;
  dayanak: string;
  referans?: string | null;
};

const USUL_TIP_ETIKET: Record<string, string> = {
  vekalet: "Vekaletname",
  temsil: "Temsil yetkisi",
  teblig: "Tebligat",
  katilim: "Katılım",
  sure: "Süre",
  kimlik: "Kimlik/sıfat",
  yok: "Durum",
};

const EPOSTA_DESENI = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Belge adında arama — taraf belgesi ya da dosya geneli belgesi kabul edilir.
function usulBelgeVar(docs: any[], partyId: string, desen: RegExp): boolean {
  return docs.some((d) => {
    const ad = String(d?.file_name ?? "");
    if (!desen.test(ad)) return false;
    return !d?.party_id || String(d.party_id) === String(partyId);
  });
}

function usulEngelleriHesapla(caseRow: any, parties: any[], docs: any[]): UsulSatiri[] {
  const satirlar: UsulSatiri[] = [];
  const ad = (p: any) => `${partyDisplay(p)} (${roleLabel(p.party_role)})`;

  for (const p of parties) {
    const bireysel = String(p?.party_type ?? "") === "individual";

    // 1) Vekil görünüyor ama vekaletname dosyada yok
    const vekil = String(p?.vekil_ad_soyad ?? "").trim();
    if (vekil && !usulBelgeVar(docs, p.id, /vekalet|vekâlet/i)) {
      satirlar.push({
        key: `vekalet-${p.id}`,
        tip: "vekalet",
        baslik: "Vekaletname dosyada görünmüyor",
        aciklama: `${ad(p)} için vekil kaydı var (${vekil}) ancak dosyada adında "vekaletname" geçen bir belge yok.`,
        dayanak: "Taraf kaydı: vekil alanı dolu · Dosya belge listesi: eşleşen belge bulunamadı.",
      });
    }

    // 2) Tüzel kişi tarafta imza/temsil yetkilisi belli değil
    if (!bireysel && !String(p?.authorized_person ?? "").trim()) {
      satirlar.push({
        key: `temsil-${p.id}`,
        tip: "temsil",
        baslik: "Temsil/imza yetkilisi belirtilmemiş",
        aciklama: `${ad(p)} tüzel kişi olarak kayıtlı; yetkili kişi alanı boş.`,
        dayanak: "Taraf kaydı: taraf türü tüzel kişi · yetkili kişi alanı boş.",
      });
    }

    // 3) Tebligat adresi / e-posta eksik ya da geçersiz görünüyor
    const eposta = String(p?.email ?? "").trim();
    const adres = String(p?.address ?? "").trim();
    const eksikler: string[] = [];
    if (!eposta) eksikler.push("e-posta yok");
    else if (!EPOSTA_DESENI.test(eposta)) eksikler.push(`e-posta biçimi geçersiz görünüyor (${eposta})`);
    if (!adres) eksikler.push("tebligat adresi yok");
    if (eksikler.length) {
      satirlar.push({
        key: `teblig-${p.id}`,
        tip: "teblig",
        baslik: "Tebligat bilgisi eksik",
        aciklama: `${ad(p)}: ${eksikler.join(" · ")}.`,
        dayanak: "Taraf kaydı: e-posta ve adres alanları.",
      });
    }

    // 4) Davete cevap yok / katılım durumu belirsiz
    const katilim = String(p?.katilim_durumu ?? "").trim() || "beklemede";
    if (katilim === "beklemede") {
      satirlar.push({
        key: `katilim-${p.id}`,
        tip: "katilim",
        baslik: "Katılım durumu belirsiz",
        aciklama: `${ad(p)} davete henüz cevap vermemiş; katılım durumu "beklemede".`,
        dayanak: "Taraf kaydı: katılım durumu alanı.",
      });
    }

    // 6) Kimliğini/sıfatını gösteren temel belge yok
    if (bireysel) {
      const tc = String(p?.tc_kimlik ?? "").trim();
      if (!tc && !usulBelgeVar(docs, p.id, /kimlik|nüfus|nufus/i)) {
        satirlar.push({
          key: `kimlik-${p.id}`,
          tip: "kimlik",
          baslik: "Kimlik bilgisi ya da belgesi yok",
          aciklama: `${ad(p)} için TC kimlik alanı boş ve dosyada kimlik belgesi görünmüyor.`,
          dayanak: "Taraf kaydı: TC kimlik alanı boş · Dosya belge listesi: eşleşen belge bulunamadı.",
        });
      }
    } else {
      const vergi = String(p?.tax_number ?? "").trim();
      const sicil = String(p?.trade_registry_no ?? "").trim();
      if (!vergi && !sicil && !usulBelgeVar(docs, p.id, /sicil|imza sirkü|imza sirku|faaliyet belgesi/i)) {
        satirlar.push({
          key: `kimlik-${p.id}`,
          tip: "kimlik",
          baslik: "Tüzel kişi sıfatını gösteren kayıt yok",
          aciklama: `${ad(p)} için vergi no ve ticaret sicil no boş; dosyada sicil/imza sirküleri belgesi görünmüyor.`,
          dayanak: "Taraf kaydı: vergi no ve ticaret sicil no boş · Dosya belge listesi: eşleşen belge bulunamadı.",
        });
      }
    }
  }

  // 5) Yasal süre — MEVCUT süre takibinden OKUNUR, yeniden hesaplanmaz.
  const bitis = caseRow?.extension_used && caseRow?.deadline_extended
    ? caseRow.deadline_extended
    : caseRow?.deadline_total;
  if (bitis) {
    const kalan = Math.ceil((new Date(bitis).getTime() - Date.now()) / 86400000);
    const referans = String(caseRow?.legal_basis ?? "").trim() || null;
    if (kalan < 0) {
      satirlar.push({
        key: "sure",
        tip: "sure",
        baslik: "Yasal süre dolmuş görünüyor",
        aciklama: `Kayıtlı bitiş tarihi ${new Date(bitis).toLocaleDateString("tr-TR")}; bu tarih geçmiş.`,
        dayanak: "Dosya kaydı: süre takibi alanı (yeniden hesaplanmadı).",
        referans,
      });
    } else if (kalan <= 7) {
      satirlar.push({
        key: "sure",
        tip: "sure",
        baslik: "Yasal süre dolmak üzere",
        aciklama: `Kayıtlı bitiş tarihine ${kalan} gün kaldı (${new Date(bitis).toLocaleDateString("tr-TR")}).`,
        dayanak: "Dosya kaydı: süre takibi alanı (yeniden hesaplanmadı).",
        referans,
      });
    }
  }

  return satirlar;
}

function UsulEngelleriPanel({
  caseRow, parties, docs, onReload, onCountChange,
}: {
  caseRow: any; parties: any[]; docs: any[];
  onReload: () => void; onCountChange: (n: number) => void;
}) {
  const satirlar = useMemo(
    () => usulEngelleriHesapla(caseRow, parties, docs),
    [caseRow, parties, docs],
  );
  useEffect(() => { onCountChange(satirlar.length); }, [satirlar.length, onCountChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground leading-snug flex-1 min-w-[220px]">
          Süreci aksatabilecek usul eksikleri, dayanaklarıyla birlikte. Bu liste kanun yorumu
          içermez; yalnız eksiği sayar. Süre bilgisi mevcut süre takibinden okunur. Yalnız
          size görünür.
        </p>
        <Button size="sm" variant="outline" className={KART_DUGME} onClick={onReload}>
          <RefreshCw className="h-4 w-4 mr-1" /> Yenile
        </Button>
      </div>

      {satirlar.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Usule ilişkin engel görünmüyor.
        </p>
      ) : (
        <ul className="divide-y">
          {satirlar.map((r) => (
            <li key={r.key} className="py-2.5 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {USUL_TIP_ETIKET[r.tip] ?? r.tip}
                </span>
                <span className="text-sm font-medium">{r.baslik}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-snug">{r.aciklama}</p>
              <p className="text-[11px] text-muted-foreground">Dayanak: {r.dayanak}</p>
              {r.referans && (
                <p className="text-[11px] text-muted-foreground">Mevzuat referansı: {r.referans}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ============ GÜÇ DENGESİ İŞARETİ (İBA 2.4) — yalnız arabulucu ============ */
// guc_dengesi tablosunda tarafa SELECT politikası yoktur; bu panel taraf ekranında
// (CaseRoom) hiçbir sürümde yoktur. Çıktı DURUM TESPİTİDİR — kişilik değerlendirmesi,
// "güçlü/zayıf taraf" etiketi ve çözüm dayatması yasaktır (constitution m.2, §11).

type GucSatiri = {
  id: string;
  gosterge_tipi: string;
  baslik: string;
  aciklama: string;
  dayanak: string;
  sira: number;
};

const GUC_TIP_ETIKET: Record<string, string> = {
  vekil: "Vekil",
  nitelik: "Taraf niteliği",
  belge: "Belge",
  katilim: "Katılım",
  anlatim: "Anlatım",
  yok: "Durum",
};

function GucDengesiPanel({ caseId, onCountChange }: { caseId: string; onCountChange: (n: number) => void }) {
  const [satirlar, setSatirlar] = useState<GucSatiri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    const { data, error } = await (supabase.from("guc_dengesi" as any) as any)
      .select("id, gosterge_tipi, baslik, aciklama, dayanak, sira")
      .eq("case_id", caseId).order("sira");
    setYukleniyor(false);
    if (error) { setHata(`Güç dengesi okunamadı: ${trErr(error.message)}`); return; }
    setHata(null);
    const liste = (Array.isArray(data) ? data : []) as GucSatiri[];
    setSatirlar(liste);
    onCountChange(liste.filter((r) => r.gosterge_tipi !== "yok").length);
  }, [caseId, onCountChange]);

  useEffect(() => { yukle(); }, [yukle]);

  async function cikar(yenile: boolean) {
    setBusy(true);
    setHata(null);
    setBilgi(null);
    try {
      const { data, error } = await supabase.functions.invoke("guc-dengesi", {
        body: { case_id: caseId, yenile },
      });
      if (error) {
        // Gerçek sebep .context gövdesindedir; sessizce yutulmaz.
        let ham = String((error as any)?.message ?? "bilinmeyen hata");
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.text === "function") {
          try {
            const govde = await ctx.text();
            if (govde) {
              try { const j = JSON.parse(govde); ham = String(j?.error ?? j?.detay ?? govde); }
              catch { ham = String(govde).slice(0, 400); }
            }
          } catch { /* gövde okunamadı */ }
        }
        throw new Error(ham);
      }
      if ((data as any)?.error) throw new Error(String((data as any).error));
      if ((data as any)?.atlandi) setBilgi(String((data as any).sebep ?? "Üretilmedi"));
      await yukle();
    } catch (e: any) {
      console.error("[guc-dengesi] çağrı başarısız", e);
      setHata(`guc-dengesi çağrısı başarısız: ${trErr(e?.message ?? "bilinmeyen hata")}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground leading-snug flex-1 min-w-[220px]">
          Taraflar arasındaki dengesizlik göstergeleri, dayanaklarıyla birlikte. Bu bir durum
          tespitidir — kişilik değerlendirmesi değildir ve ne yapılacağına karışmaz. Yalnız
          size görünür.
        </p>
        <Button size="sm" variant="outline" className={KART_DUGME} onClick={() => cikar(satirlar.length > 0)} disabled={busy || yukleniyor}>
          {busy
            ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Çıkarılıyor…</>
            : <><Sparkles className="h-4 w-4 mr-1" /> {satirlar.length > 0 ? "Yenile" : "Göstergeleri çıkar"}</>}
        </Button>
        <UcretliIsaret />
      </div>

      {hata && (
        <p className="text-sm text-destructive flex items-start gap-1.5 break-words">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><span>{hata}</span>
        </p>
      )}
      {bilgi && <p className="text-xs text-amber-600 dark:text-amber-400">{bilgi}</p>}

      {yukleniyor ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
        </p>
      ) : satirlar.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Henüz çıkarılmadı. Taraflar ve belgeler girildikten sonra "Göstergeleri çıkar" düğmesini kullanın.
        </p>
      ) : (
        <ul className="divide-y">
          {satirlar.map((r) => (
            <li key={r.id} className="py-2.5 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {GUC_TIP_ETIKET[r.gosterge_tipi] ?? r.gosterge_tipi}
                </span>
                <span className="text-sm font-medium">{r.baslik}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-snug">{r.aciklama}</p>
              <p className="text-[11px] text-muted-foreground">Dayanak: {r.dayanak}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* =========== KÖR TEKLİF v2 — KOŞULLU ARALIK / BRAKETLEME (arabulucu) =========== */
// Yalnız arabulucu/yönetici görür (RLS: is_case_mediator / has_role). Örtüşme bandı,
// koşullu taahhütler ve yakınlık göstergesi taraflara hiçbir yüzeyden açılmaz.

type BraketMediatorRow = {
  id: string;
  party_id: string;
  alt_sinir: number | null;
  ust_sinir: number | null;
  para_birimi: string;
  kosul_bant_alt: number | null;
  kosul_bant_ust: number | null;
  kosullu_deger: number | null;
  kosul_notu: string | null;
  kosul_durumu: string;
  updated_at: string;
};

type BraketIzRow = {
  id: string;
  party_id: string | null;
  olay: string;
  detay: any;
  created_at: string;
};

const BRAKET_KOSUL_ETIKET: Record<string, string> = {
  yok: "koşullu taahhüt yok",
  aktif: "taahhüt girildi — bant sorusu sırada",
  soruldu: "bant soruldu, cevap bekleniyor",
  kabul: "karşı taraf bandı değerlendiriyor",
  dustu: "taahhüt düştü (bant reddedildi)",
};

// Yakınlık göstergesi: denetim izindeki braket kayıtlarından, her iki tarafın da
// aralığı bilinir hâle geldiği anlardaki mesafe (örtüşme varsa 0) çıkarılır.
function braketYakinlikSeyri(iz: BraketIzRow[]): { zaman: string; mesafe: number; ortusme: boolean }[] {
  const sirali = [...iz]
    .filter((r) => r.olay === "braket_girildi" && r.party_id)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const son: Record<string, { alt: number | null; ust: number | null }> = {};
  const seyir: { zaman: string; mesafe: number; ortusme: boolean }[] = [];
  for (const r of sirali) {
    const alt = r.detay?.alt_sinir === null || r.detay?.alt_sinir === undefined ? null : Number(r.detay.alt_sinir);
    const ust = r.detay?.ust_sinir === null || r.detay?.ust_sinir === undefined ? null : Number(r.detay.ust_sinir);
    son[String(r.party_id)] = { alt, ust };
    const tam = Object.values(son).filter((x) => x.alt !== null && x.ust !== null);
    if (tam.length < 2) continue;
    const lower = Math.max(...tam.map((x) => x.alt as number));
    const upper = Math.min(...tam.map((x) => x.ust as number));
    seyir.push({ zaman: r.created_at, mesafe: upper >= lower ? 0 : lower - upper, ortusme: upper >= lower });
  }
  return seyir;
}

function BraketMediatorPanel({ caseId }: { caseId: string }) {
  const [parties, setParties] = useState<any[]>([]);
  const [braketler, setBraketler] = useState<BraketMediatorRow[]>([]);
  const [iz, setIz] = useState<BraketIzRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const [p, b, d] = await Promise.all([
        supabase.from("case_parties").select("id, party_role, first_name, last_name, company_name").eq("case_id", caseId).order("created_at"),
        (supabase.from("teklif_braketleri" as any) as any)
          .select("id, party_id, alt_sinir, ust_sinir, para_birimi, kosul_bant_alt, kosul_bant_ust, kosullu_deger, kosul_notu, kosul_durumu, updated_at")
          .eq("case_id", caseId),
        (supabase.from("braket_denetim_izi" as any) as any)
          .select("id, party_id, olay, detay, created_at")
          .eq("case_id", caseId).order("created_at", { ascending: false }).limit(80),
      ]);
      if (p.error) throw p.error;
      if (b.error) throw b.error;
      if (d.error) throw d.error;
      setParties(Array.isArray(p.data) ? p.data : []);
      setBraketler(Array.isArray(b.data) ? (b.data as any) : []);
      setIz(Array.isArray(d.data) ? (d.data as any) : []);
    } catch (e: any) {
      console.error("[BraketMediatorPanel] load failed", e);
      setLoadErr(e?.message ?? "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }, [caseId]);
  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <Card className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Koşullu aralıklar yükleniyor…
    </Card>
  );
  if (loadErr) return (
    <Card className="p-6 space-y-3">
      <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
        <AlertTriangle className="h-4 w-4" /> Koşullu aralık verileri yüklenemedi
      </div>
      <p className="text-xs text-muted-foreground break-words">{trErr(loadErr)}</p>
      <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3 w-3 mr-1" /> Tekrar Dene</Button>
    </Card>
  );

  const byParty = new Map(braketler.map((b) => [b.party_id, b]));
  const rows = parties.map((p, i) => ({ party: p, name: blindBidPartyName(p, i), braket: byParty.get(p.id) ?? null }));
  const tam = braketler.filter((b) => b.alt_sinir !== null && b.ust_sinir !== null);
  const paraBirimi = tam[0]?.para_birimi || "TRY";
  let ortusme: { alt: number; ust: number } | null = null;
  let fark: number | null = null;
  if (tam.length >= 2) {
    const lower = Math.max(...tam.map((b) => Number(b.alt_sinir)));
    const upper = Math.min(...tam.map((b) => Number(b.ust_sinir)));
    if (upper >= lower) ortusme = { alt: lower, ust: upper };
    else fark = lower - upper;
  }
  const seyir = braketYakinlikSeyri(iz);
  const sonSeyir = seyir.slice(-6);
  const yon = seyir.length >= 2
    ? (seyir[seyir.length - 1].mesafe < seyir[seyir.length - 2].mesafe ? "yakınlaşıyor"
      : seyir[seyir.length - 1].mesafe > seyir[seyir.length - 2].mesafe ? "uzaklaşıyor" : "değişmedi")
    : null;

  return (
    <div className="rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground p-6 shadow-elegant space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <EyeOff className="h-4 w-4 text-accent" />
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold">Koşullu Aralık (Braket)</div>
        </div>
        <Button size="sm" variant="outline" className={KOKPIT_DUGME} onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" /> Yenile
        </Button>
      </div>
      <p className="text-xs text-sidebar-foreground/60 leading-snug">
        Taraflar kendi kabul aralığını ve isterse koşullu taahhüdünü girer. Bu ekran yalnız size
        açıktır; taraflara rakam verilmez, karşı tarafa yalnız bant sorusu ("şu aralığı düşünür
        müsünüz?") gider. Karşı taraf reddederse taahhüt kendiliğinden düşer ve karşı taraf,
        tarafın inmeye razı olduğunu hiçbir yüzeyden öğrenmez.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-sidebar-foreground/50 italic">Bu vakada henüz taraf tanımlanmamış.</p>
      ) : (
        <div className={`grid gap-4 ${rows.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {rows.map(({ party, name, braket }) => {
            const girdi = !!braket && (braket.alt_sinir !== null || braket.ust_sinir !== null);
            return (
              <div key={party.id} className="rounded-xl border border-sidebar-border bg-sidebar-accent/25 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display font-semibold truncate">
                    {name} <span className="text-xs text-sidebar-foreground/50 font-normal">({roleLabel(party.party_role)})</span>
                  </div>
                  <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${girdi ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-sidebar-border/60 text-sidebar-foreground/50"}`}>
                    {girdi ? "Girdi" : "Girmedi"}
                  </span>
                </div>
                {girdi && (
                  <div className="text-sm font-display font-bold">
                    {formatBidAmount(braket!.alt_sinir, braket!.para_birimi)}
                    <span className="text-sidebar-foreground/50 mx-1 font-normal">–</span>
                    {formatBidAmount(braket!.ust_sinir, braket!.para_birimi)}
                  </div>
                )}
                {braket && braket.kosul_durumu !== "yok" && (
                  <div className="rounded-lg border border-sidebar-border/70 p-2 space-y-1">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/50">Koşullu taahhüt</div>
                    <div className="text-xs">
                      Karşı taraf{" "}
                      <span className="font-semibold">
                        {formatBidAmount(braket.kosul_bant_alt, braket.para_birimi)} – {formatBidAmount(braket.kosul_bant_ust, braket.para_birimi)}
                      </span>{" "}
                      bandını kabul ederse{" "}
                      <span className="font-semibold">{formatBidAmount(braket.kosullu_deger, braket.para_birimi)}</span> tutarına iner.
                    </div>
                    <div className="text-[11px] text-sidebar-foreground/60">
                      {BRAKET_KOSUL_ETIKET[braket.kosul_durumu] ?? braket.kosul_durumu}
                    </div>
                    {braket.kosul_notu && <p className="text-[11px] text-sidebar-foreground/60 leading-snug">{braket.kosul_notu}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {ortusme && (
        <div className="rounded-xl border border-accent/60 bg-accent/10 p-4 space-y-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold">Örtüşme Var</div>
          <div className="font-display text-lg font-bold text-sidebar-foreground">
            {formatBidAmount(ortusme.alt, paraBirimi)} – {formatBidAmount(ortusme.ust, paraBirimi)}
          </div>
          <p className="text-xs text-sidebar-foreground/60">
            Aralıklar kesişiyor. Taraflara bu rakamlar verilmez; yalnız bant sorusu sorulur.
          </p>
        </div>
      )}
      {fark !== null && (
        <div className="rounded-xl border border-dashed border-destructive/50 bg-destructive/5 p-4 space-y-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-destructive font-semibold">Örtüşme Yok</div>
          <div className="font-display text-lg font-bold text-sidebar-foreground">Mesafe: {formatBidAmount(fark, paraBirimi)}</div>
        </div>
      )}
      {tam.length < 2 && rows.length >= 2 && (
        <p className="text-xs text-sidebar-foreground/50 italic">Örtüşme hesabı için her iki tarafın da alt ve üst sınırı girmesi gerekir.</p>
      )}

      {/* Yakınlık göstergesi — YALNIZ arabulucuya. */}
      {seyir.length > 0 && (
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-4 space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold">Yakınlık Göstergesi</div>
          {yon && <div className="text-sm font-display font-bold">Seyir: {yon}</div>}
          <ul className="text-xs text-sidebar-foreground/70 space-y-1">
            {sonSeyir.map((s, i) => (
              <li key={`${s.zaman}-${i}`} className="flex items-center justify-between gap-3">
                <span>{new Date(s.zaman).toLocaleString("tr-TR")}</span>
                <span className="font-medium">
                  {s.ortusme ? "örtüşüyor" : `mesafe ${formatBidAmount(s.mesafe, paraBirimi)}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-sidebar-foreground/50">Bu seyir taraflara hiçbir yüzeyden gösterilmez.</p>
        </div>
      )}
    </div>
  );
}

/* ============ TEKLİF DEĞERLENDİRME (İBA 2.5) — yalnız arabulucu ============
   Kart HESAP YAPAR, TAVSİYE VERMEZ: "kabul et / etme", rakam önerisi, mahkeme
   sonucu tahmini, kusur atfı ve hukuki niteleme yoktur (constitution m.2, m.4).
   Yeni AI çağrısı YOK — her satır dosyadaki kayıtlı rakamlardan deterministik
   hesaplanır. Kaynaklar: teklif_braketleri (Kabul Aralığım) · blind_bids
   (Kör Teklif) · braket_denetim_izi (kayıtlı tutarların zaman içindeki seyri).
   Kör veri (m.1): panel yalnız kokpitte (arabulucu yüzeyi) çizilir; kullandığı
   üç tabloda da tarafa SELECT politikası yoktur, taraf ekranına hiçbir satırı
   çıkmaz. Dayanağı olmayan satır GÖSTERİLMEZ; rakam yoksa "rakamlandırılmadı"
   yazılır, tahmin üretilmez. */

type TeklifKaynak = {
  anahtar: string;
  etiket: string;
  tutar: number;
  dayanak: string;
  paraBirimi: string;
};

function tdSayi(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function tdTarih(iso?: string | null): string {
  if (!iso) return "tarihsiz";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "tarihsiz" : d.toLocaleDateString("tr-TR");
}
function tdYuzde(pay: number, payda: number): string {
  if (!Number.isFinite(payda) || payda === 0) return "—";
  return `%${(pay / payda * 100).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
}

// Bir tarafın KAYITLI tutar seyri: braket izindeki kayıtlardan, o tarafın teklif
// tutarı olarak okunabilecek değer (koşullu taahhüt varsa o, yoksa üst sınır).
function tdTutarSeyri(iz: BraketIzRow[], partyId: string): { zaman: string; tutar: number; alan: string }[] {
  return [...iz]
    .filter((r) => r.olay === "braket_girildi" && String(r.party_id) === String(partyId))
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    .map((r) => {
      const kosullu = tdSayi(r.detay?.kosullu_deger);
      const ust = tdSayi(r.detay?.ust_sinir);
      const tutar = kosullu !== null ? kosullu : ust;
      return tutar === null ? null : { zaman: r.created_at, tutar, alan: kosullu !== null ? "koşullu taahhüt" : "üst sınır" };
    })
    .filter(Boolean) as { zaman: string; tutar: number; alan: string }[];
}

function TeklifDegerlendirmePanel({ caseId }: { caseId: string }) {
  const [parties, setParties] = useState<any[]>([]);
  const [braketler, setBraketler] = useState<BraketMediatorRow[]>([]);
  const [bids, setBids] = useState<BlindBidRow[]>([]);
  const [iz, setIz] = useState<BraketIzRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [secilenParty, setSecilenParty] = useState<string>("");
  const [kaynakAnahtar, setKaynakAnahtar] = useState<string>("");
  const [elleTutar, setElleTutar] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const [p, b, k, d] = await Promise.all([
        supabase.from("case_parties").select("id, party_role, first_name, last_name, company_name").eq("case_id", caseId).order("created_at"),
        (supabase.from("teklif_braketleri" as any) as any)
          .select("id, party_id, alt_sinir, ust_sinir, para_birimi, kosul_bant_alt, kosul_bant_ust, kosullu_deger, kosul_notu, kosul_durumu, updated_at")
          .eq("case_id", caseId),
        supabase.from("blind_bids").select("party_id, min_amount, max_amount, currency, note").eq("case_id", caseId),
        (supabase.from("braket_denetim_izi" as any) as any)
          .select("id, party_id, olay, detay, created_at")
          .eq("case_id", caseId).order("created_at", { ascending: false }).limit(80),
      ]);
      if (p.error) throw p.error;
      if (b.error) throw b.error;
      if (k.error) throw k.error;
      if (d.error) throw d.error;
      setParties(Array.isArray(p.data) ? p.data : []);
      setBraketler(Array.isArray(b.data) ? (b.data as any) : []);
      setBids(Array.isArray(k.data) ? (k.data as any) : []);
      setIz(Array.isArray(d.data) ? (d.data as any) : []);
    } catch (e: any) {
      console.error("[TeklifDegerlendirmePanel] load failed", e);
      setLoadErr(e?.message ?? "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }, [caseId]);
  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <Card className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Teklif değerlendirme verileri yükleniyor…
    </Card>
  );
  if (loadErr) return (
    <Card className="p-6 space-y-3">
      <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
        <AlertTriangle className="h-4 w-4" /> Teklif değerlendirme verileri yüklenemedi
      </div>
      <p className="text-xs text-muted-foreground break-words">{trErr(loadErr)}</p>
      <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3 w-3 mr-1" /> Tekrar Dene</Button>
    </Card>
  );

  const adlar = new Map<string, string>(parties.map((p, i) => [p.id, blindBidPartyName(p, i)]));
  const braketByParty = new Map(braketler.map((b) => [b.party_id, b]));
  const bidByParty = new Map(bids.map((b) => [b.party_id, b]));

  const hedefId = secilenParty || parties[0]?.id || "";
  const hedef = parties.find((p) => p.id === hedefId) ?? null;
  const hedefBraket = hedefId ? braketByParty.get(hedefId) ?? null : null;
  const hedefBid = hedefId ? bidByParty.get(hedefId) ?? null : null;

  // TALEP: tarafın KAYITLI üst tutarı. Kaynak sırası braket → kör teklif.
  // Rakamlanmış talep kaydı yoksa hesap yapılmaz (tahmin üretilmez).
  const talepTutar = tdSayi(hedefBraket?.ust_sinir) ?? tdSayi(hedefBid?.max_amount);
  const talepDayanak = tdSayi(hedefBraket?.ust_sinir) !== null
    ? `Kabul Aralığım kaydı — üst sınır (${tdTarih(hedefBraket?.updated_at)})`
    : tdSayi(hedefBid?.max_amount) !== null
      ? "Kör Teklif kaydı — üst tutar"
      : null;
  const paraBirimi = hedefBraket?.para_birimi || hedefBid?.currency || "TRY";

  // TEKLİF adayları: karşı tarafların KAYITLI tutarları + arabulucunun elle girdiği tutar.
  const kaynaklar: TeklifKaynak[] = [];
  for (const k of parties) {
    if (k.id === hedefId) continue;
    const kb = braketByParty.get(k.id) ?? null;
    const kbid = bidByParty.get(k.id) ?? null;
    const ad = adlar.get(k.id) ?? "Karşı taraf";
    const kosullu = tdSayi(kb?.kosullu_deger);
    if (kosullu !== null && kb?.kosul_durumu !== "dustu") {
      kaynaklar.push({
        anahtar: `kosullu:${k.id}`, etiket: `${ad} — koşullu taahhüt`, tutar: kosullu,
        dayanak: `${ad}: Kabul Aralığım — koşullu taahhüt tutarı (${tdTarih(kb?.updated_at)}, durum: ${BRAKET_KOSUL_ETIKET[kb?.kosul_durumu ?? "yok"] ?? kb?.kosul_durumu})`,
        paraBirimi: kb?.para_birimi || paraBirimi,
      });
    }
    const kust = tdSayi(kb?.ust_sinir);
    if (kust !== null) {
      kaynaklar.push({
        anahtar: `ust:${k.id}`, etiket: `${ad} — kayıtlı üst tutar`, tutar: kust,
        dayanak: `${ad}: Kabul Aralığım — üst sınır (${tdTarih(kb?.updated_at)})`,
        paraBirimi: kb?.para_birimi || paraBirimi,
      });
    }
    const kmax = tdSayi(kbid?.max_amount);
    if (kmax !== null) {
      kaynaklar.push({
        anahtar: `kor:${k.id}`, etiket: `${ad} — kör teklif üst tutarı`, tutar: kmax,
        dayanak: `${ad}: Kör Teklif kaydı — üst tutar`,
        paraBirimi: kbid?.currency || paraBirimi,
      });
    }
  }

  const elleSayi = tdSayi(elleTutar.replace(/\./g, "").replace(/,/g, "."));
  const seciliAnahtar = kaynakAnahtar || kaynaklar[0]?.anahtar || "elle";
  const seciliKaynak: TeklifKaynak | null = seciliAnahtar === "elle"
    ? (elleSayi === null ? null : {
        anahtar: "elle", etiket: "Elle girilen teklif", tutar: elleSayi,
        dayanak: "Arabulucunun elle girdiği tutar — dosyada kayıtlı değildir",
        paraBirimi,
      })
    : kaynaklar.find((x) => x.anahtar === seciliAnahtar) ?? null;

  // Teklifi veren tarafın kimliği (seyir hesabı için); elle girişte yoktur.
  const kaynakPartyId = seciliAnahtar.includes(":") ? seciliAnahtar.split(":")[1] : null;
  const seyir = kaynakPartyId ? tdTutarSeyri(iz, kaynakPartyId) : [];
  const sonIki = seyir.slice(-2);

  const satirKutu = "rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-4 space-y-1";
  const dayanakSatiri = (t: string) => (
    <p className="text-[11px] text-sidebar-foreground/55 leading-snug">Dayanak: {t}</p>
  );

  return (
    <div className="rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground p-6 shadow-elegant space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <EyeOff className="h-4 w-4 text-accent" />
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold">Teklif Değerlendirme</div>
        </div>
        <Button size="sm" variant="outline" className={KOKPIT_DUGME} onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" /> Yenile
        </Button>
      </div>
      <p className="text-xs text-sidebar-foreground/60 leading-snug">
        Bu kart yalnız hesap yapar: teklifin kayıtlı talebi ne kadar karşıladığını, kabul hâlinde neyin alınıp
        neyin bırakıldığını ve kayıtlı tutarların seyrini gösterir. Öneri, tavsiye ve rakam teklifi içermez;
        taraflara hiçbir yüzeyden gösterilmez.
      </p>

      {parties.length < 2 ? (
        <p className="text-xs text-sidebar-foreground/60 italic">Değerlendirme için dosyada en az iki taraf kaydı gerekir.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-[0.14em] text-sidebar-foreground/60">Değerlendirilen taraf</Label>
              <Select value={hedefId} onValueChange={(v) => { setSecilenParty(v); setKaynakAnahtar(""); }}>
                <SelectTrigger className="bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground">
                  <SelectValue placeholder="Taraf seçin" />
                </SelectTrigger>
                <SelectContent>
                  {parties.map((p, i) => (
                    <SelectItem key={p.id} value={p.id}>{blindBidPartyName(p, i)} ({roleLabel(p.party_role)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-[0.14em] text-sidebar-foreground/60">Değerlendirilecek teklif</Label>
              <Select value={seciliAnahtar} onValueChange={setKaynakAnahtar}>
                <SelectTrigger className="bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground">
                  <SelectValue placeholder="Teklif kaynağı" />
                </SelectTrigger>
                <SelectContent>
                  {kaynaklar.map((k) => (
                    <SelectItem key={k.anahtar} value={k.anahtar}>
                      {k.etiket} — {formatBidAmount(k.tutar, k.paraBirimi)}
                    </SelectItem>
                  ))}
                  <SelectItem value="elle">Elle tutar gir (kayda geçmez)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {seciliAnahtar === "elle" && (
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-[0.14em] text-sidebar-foreground/60">Masada söylenen teklif tutarı</Label>
              <Input
                value={elleTutar}
                onChange={(e) => setElleTutar(e.target.value)}
                placeholder="ör. 150000"
                inputMode="decimal"
                className="bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground max-w-xs"
              />
              <p className="text-[11px] text-sidebar-foreground/50">
                Bu tutar hiçbir tabloya yazılmaz; sayfa yenilenince kaybolur.
              </p>
            </div>
          )}

          {/* 1) KARŞILAMA ORANI */}
          {talepTutar === null || talepDayanak === null ? (
            <div className={satirKutu}>
              <div className="text-sm font-display font-bold">Karşılama oranı</div>
              <p className="text-xs text-sidebar-foreground/70">
                {hedef ? `${adlar.get(hedefId)} için ` : ""}talep rakamlandırılmadığı için karşılaştırma yapılamadı.
              </p>
              <p className="text-[11px] text-sidebar-foreground/50">
                Rakam kaynağı: tarafın Kabul Aralığı (üst sınır) ya da Kör Teklif kaydı (üst tutar).
              </p>
            </div>
          ) : seciliKaynak === null ? (
            <div className={satirKutu}>
              <div className="text-sm font-display font-bold">Karşılama oranı</div>
              <p className="text-xs text-sidebar-foreground/70">
                Değerlendirilecek teklif tutarı yok — karşı tarafın kayıtlı tutarı bulunmuyor, elle de tutar girilmedi.
              </p>
            </div>
          ) : (
            <>
              <div className={satirKutu}>
                <div className="text-sm font-display font-bold">Karşılama oranı</div>
                <p className="text-sm">
                  Teklif {formatBidAmount(seciliKaynak.tutar, seciliKaynak.paraBirimi)}; kayıtlı talep{" "}
                  {formatBidAmount(talepTutar, paraBirimi)}. Karşılama:{" "}
                  <span className="font-semibold">{tdYuzde(seciliKaynak.tutar, talepTutar)}</span>
                </p>
                {dayanakSatiri(`talep → ${talepDayanak} · teklif → ${seciliKaynak.dayanak}`)}
              </div>

              {/* 2) ALINAN / BIRAKILAN */}
              <div className={satirKutu}>
                <div className="text-sm font-display font-bold">Kabul edilirse</div>
                <ul className="text-xs text-sidebar-foreground/80 space-y-1">
                  <li>
                    Alınan: <span className="font-semibold">{formatBidAmount(seciliKaynak.tutar, seciliKaynak.paraBirimi)}</span>{" "}
                    ({tdYuzde(seciliKaynak.tutar, talepTutar)})
                  </li>
                  <li>
                    Bırakılan:{" "}
                    <span className="font-semibold">
                      {formatBidAmount(Math.max(0, talepTutar - seciliKaynak.tutar), paraBirimi)}
                    </span>{" "}
                    ({tdYuzde(Math.max(0, talepTutar - seciliKaynak.tutar), talepTutar)})
                  </li>
                </ul>
                {dayanakSatiri(`alınan → ${seciliKaynak.dayanak} · bırakılan → ${talepDayanak} ile teklif tutarının farkı`)}
                <p className="text-[11px] text-sidebar-foreground/50 leading-snug">
                  Dosyada rakamlandırılmış TALEP KALEMİ kaydı yok; hesap tek tutar üzerinden yapıldı. Kalem kalem
                  ayrıştırma için talep kalemlerinin rakamla kaydedilmesi gerekir.
                </p>
              </div>

              {/* 3) BRAKET İLİŞKİSİ */}
              {tdSayi(hedefBraket?.alt_sinir) === null && tdSayi(hedefBraket?.ust_sinir) === null ? (
                <div className={satirKutu}>
                  <div className="text-sm font-display font-bold">Kendi alt/üst sınırıyla ilişkisi</div>
                  <p className="text-xs text-sidebar-foreground/70">
                    Bu taraf Kabul Aralığı (alt/üst sınır) girmemiş — bant karşılaştırması yapılamadı.
                  </p>
                </div>
              ) : (
                <div className={satirKutu}>
                  <div className="text-sm font-display font-bold">Kendi alt/üst sınırıyla ilişkisi</div>
                  <p className="text-sm">
                    {(() => {
                      const alt = tdSayi(hedefBraket?.alt_sinir);
                      const ust = tdSayi(hedefBraket?.ust_sinir);
                      const t = seciliKaynak.tutar;
                      if (alt !== null && t < alt) return `Teklif, alt sınırın ${formatBidAmount(alt - t, paraBirimi)} altında.`;
                      if (ust !== null && t > ust) return `Teklif, üst sınırın ${formatBidAmount(t - ust, paraBirimi)} üstünde.`;
                      if (alt !== null && ust !== null) return "Teklif, tarafın kendi bandının içinde.";
                      if (alt !== null) return `Teklif, alt sınırın (${formatBidAmount(alt, paraBirimi)}) üstünde.`;
                      return `Teklif, üst sınırın (${formatBidAmount(ust, paraBirimi)}) altında.`;
                    })()}
                  </p>
                  {dayanakSatiri(
                    `${adlar.get(hedefId)}: Kabul Aralığım — alt ${formatBidAmount(tdSayi(hedefBraket?.alt_sinir), paraBirimi)} / üst ${formatBidAmount(tdSayi(hedefBraket?.ust_sinir), paraBirimi)} (${tdTarih(hedefBraket?.updated_at)})`,
                  )}
                </div>
              )}

              {/* 4) ÖNCEKİ TEKLİFLERLE KARŞILAŞTIRMA */}
              <div className={satirKutu}>
                <div className="text-sm font-display font-bold">Önceki tekliflerle karşılaştırma</div>
                {kaynakPartyId === null ? (
                  <p className="text-xs text-sidebar-foreground/70">
                    Elle girilen tutar kayıtlı olmadığı için seyir karşılaştırması yapılamadı.
                  </p>
                ) : sonIki.length < 2 ? (
                  <p className="text-xs text-sidebar-foreground/70">
                    Karşılaştırılacak önceki kayıt yok — bu tarafın izinde tek tutar kaydı var.
                  </p>
                ) : (
                  <>
                    <p className="text-sm">
                      {formatBidAmount(sonIki[0].tutar, paraBirimi)} ({tdTarih(sonIki[0].zaman)}) →{" "}
                      {formatBidAmount(sonIki[1].tutar, paraBirimi)} ({tdTarih(sonIki[1].zaman)}).{" "}
                      {(() => {
                        const oncekiFark = Math.abs(talepTutar - sonIki[0].tutar);
                        const simdikiFark = Math.abs(talepTutar - sonIki[1].tutar);
                        if (simdikiFark < oncekiFark) return `Talep ile arasındaki fark ${formatBidAmount(oncekiFark - simdikiFark, paraBirimi)} azaldı (yaklaşma).`;
                        if (simdikiFark > oncekiFark) return `Talep ile arasındaki fark ${formatBidAmount(simdikiFark - oncekiFark, paraBirimi)} arttı (uzaklaşma).`;
                        return "Talep ile arasındaki fark değişmedi.";
                      })()}
                    </p>
                    {dayanakSatiri(
                      `${adlar.get(kaynakPartyId) ?? "karşı taraf"}: braket denetim izi — ${sonIki[0].alan} → ${sonIki[1].alan}; talep kaydı: ${talepDayanak}`,
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ============ TIKANMA VE ÇIKIŞ YOLLARI (İBA 2.5 / B20) — yalnız arabulucu ============
   Kart KARAR VERMEZ, UYGULAMAZ: yalnız dosyadaki kayıtlardan çıkan olguları sayar ve
   açık olan yolları gerekçesiyle listeler ("şu yol açık" dili; "şunu yapmalısın" yok).
   Niyet okuma, suçlama ve kişilik yorumu YASAK (constitution m.2 teşhis dili) — çıktı
   yalnız kaç gün / kaç kez. Yeni AI çağrısı YOK; her işaret deterministik hesaplanır.
   Kaynaklar: randevu_teklifleri · case_party_invites + case_parties.katilim_durumu ·
   case_sessions · braket_bant_sorulari · teklif_braketleri.kosul_durumu · cases
   (güncelleme zamanı ve yasal süre). Dayanağı olmayan işaret gösterilmez.
   Kör veri (m.1): yalnız kokpitte çizilir; taraf ekranına hiçbir satırı çıkmaz. */

type TikanmaCikis = { yol: string; gerekce: string };
type TikanmaIsaret = { id: string; baslik: string; dayanak: string; cikislar: TikanmaCikis[] };

// Eşikler ekranda da yazılıdır: arabulucu hangi kuralın çalıştığını görebilsin.
const TIKANMA_ESIK = { teklif: 3, davet: 5, bantSorusu: 3, durgunluk: 10, sureBaskisi: 15 };

function tcGunFarki(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(String(iso)).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}
function tcKalanGun(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(String(iso)).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}
function tcTarih(iso?: string | null): string {
  if (!iso) return "tarihsiz";
  const d = new Date(String(iso));
  return Number.isNaN(d.getTime()) ? "tarihsiz" : d.toLocaleDateString("tr-TR");
}

// Çıkış yolu metinleri tek yerde: dil hep "yol açık" kalıbında kurulur.
const CIKIS = {
  bol: "Konuyu bölmek",
  tekBaslik: "Tek başlıkta anlaşıp gerisini ayırmak",
  sira: "Görüşme sırasını değiştirmek",
  ozel: "Özel oturuma geçmek",
  uzman: "Uzman görüşü almak",
  ekOturum: "Ek oturum planlamak",
  sure: "Süre uzatımı",
} as const;

function TikanmaCozucuPanel({ caseRow }: { caseRow: CaseRow }) {
  const [parties, setParties] = useState<any[]>([]);
  const [davetler, setDavetler] = useState<any[]>([]);
  const [teklifler, setTeklifler] = useState<any[]>([]);
  const [oturumlar, setOturumlar] = useState<any[]>([]);
  const [bantSorulari, setBantSorulari] = useState<any[]>([]);
  const [braketler, setBraketler] = useState<any[]>([]);
  const [okunamayan, setOkunamayan] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  // cases.updated_at ekranın ortak sorgusunda seçilmiyor; durgunluk işareti için
  // bu panel kendi küçük sorgusunu yapar (ortak sorguya dokunulmadı).
  const [dosyaGuncelleme, setDosyaGuncelleme] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const eksik: string[] = [];
    const c = await supabase.from("cases").select("updated_at").eq("id", caseRow.id).maybeSingle();
    if (c.error) eksik.push(`dosya güncelleme zamanı (${c.error.message})`);
    setDosyaGuncelleme((c.data as any)?.updated_at ?? null);
    const p = await supabase.from("case_parties")
      .select("id, party_role, first_name, last_name, company_name, katilim_durumu, invite_status, created_at")
      .eq("case_id", caseRow.id).order("created_at");
    if (p.error) eksik.push(`taraf kayıtları (${p.error.message})`);
    const partyList = Array.isArray(p.data) ? p.data : [];
    setParties(partyList);

    const partyIds = partyList.map((x: any) => x.id);
    const [d, t, o, b, br] = await Promise.all([
      partyIds.length
        ? supabase.from("case_party_invites").select("case_party_id, invite_status, accepted_at, created_at").in("case_party_id", partyIds)
        : Promise.resolve({ data: [], error: null } as any),
      (supabase.from("randevu_teklifleri" as any) as any)
        .select("id, party_id, durum, created_at, cevap_zamani").eq("case_id", caseRow.id),
      supabase.from("case_sessions").select("id, status, scheduled_at, updated_at, session_type").eq("case_id", caseRow.id),
      (supabase.from("braket_bant_sorulari" as any) as any)
        .select("id, hedef_party_id, durum, created_at, cevap_at").eq("case_id", caseRow.id),
      (supabase.from("teklif_braketleri" as any) as any)
        .select("party_id, kosul_durumu, updated_at").eq("case_id", caseRow.id),
    ]);
    if (d.error) eksik.push(`davet kayıtları (${d.error.message})`);
    if (t.error) eksik.push(`randevu teklifleri (${t.error.message})`);
    if (o.error) eksik.push(`oturum kayıtları (${o.error.message})`);
    if (b.error) eksik.push(`bant soruları (${b.error.message})`);
    if (br.error) eksik.push(`koşullu aralık kayıtları (${br.error.message})`);
    setDavetler(Array.isArray(d.data) ? d.data : []);
    setTeklifler(Array.isArray(t.data) ? t.data : []);
    setOturumlar(Array.isArray(o.data) ? o.data : []);
    setBantSorulari(Array.isArray(b.data) ? b.data : []);
    setBraketler(Array.isArray(br.data) ? br.data : []);
    setOkunamayan(eksik);
    setLoading(false);
  }, [caseRow.id]);
  useEffect(() => { load(); }, [load]);

  const adlar = new Map<string, string>(parties.map((p, i) => [p.id, blindBidPartyName(p, i)]));
  const isaretler: TikanmaIsaret[] = [];

  // 1) Cevapsız randevu teklifi
  for (const t of teklifler) {
    if (String(t.durum) !== "beklemede") continue;
    const gun = tcGunFarki(t.created_at);
    if (gun === null || gun < TIKANMA_ESIK.teklif) continue;
    const ad = adlar.get(String(t.party_id)) ?? "Taraf";
    isaretler.push({
      id: `teklif-${t.id}`,
      baslik: `${ad}: randevu teklifi ${gun} gündür cevapsız.`,
      dayanak: `Randevu teklifi kaydı — ${tcTarih(t.created_at)} tarihinde açıldı, cevap kaydı yok (eşik: ${TIKANMA_ESIK.teklif} gün).`,
      cikislar: [
        { yol: CIKIS.ozel, gerekce: "Tek tarafla yapılan görüşme, ortak takvim aranmadan planlanabilir." },
        { yol: CIKIS.sira, gerekce: "Cevap veren tarafla başlanırsa süreç beklemeden ilerler." },
      ],
    });
  }

  // 2) Cevaplanmayan davet / katılım
  const davetByParty = new Map<string, any>();
  for (const dv of davetler) {
    const k = String(dv.case_party_id);
    const mevcut = davetByParty.get(k);
    if (!mevcut || String(dv.created_at) > String(mevcut.created_at)) davetByParty.set(k, dv);
  }
  for (const p of parties) {
    const katilim = String(p.katilim_durumu ?? "beklemede");
    const kabul = String(p.invite_status) === "accepted";
    if (kabul || katilim === "katiliyor" || katilim === "katilmiyor") continue;
    const dv = davetByParty.get(String(p.id));
    const kaynakZaman = dv?.created_at ?? p.created_at;
    const gun = tcGunFarki(kaynakZaman);
    if (gun === null || gun < TIKANMA_ESIK.davet) continue;
    isaretler.push({
      id: `davet-${p.id}`,
      baslik: `${adlar.get(p.id)}: davete ${gun} gündür cevap kaydı yok.`,
      dayanak: dv
        ? `Davet kaydı — ${tcTarih(dv.created_at)}, kabul kaydı yok (durum: ${dv.invite_status}). Eşik: ${TIKANMA_ESIK.davet} gün.`
        : `Davet kaydı bulunamadı; taraf kaydı ${tcTarih(p.created_at)} tarihli, katılım durumu "${katilim}". Eşik: ${TIKANMA_ESIK.davet} gün.`,
      cikislar: [
        { yol: CIKIS.ozel, gerekce: "Katılım kaydı olmayan tarafla ayrı temas, ortak oturumu beklemeden kurulabilir." },
        { yol: CIKIS.sira, gerekce: "Kaydı tamam olan taraftan başlanırsa dosya beklemede kalmaz." },
      ],
    });
  }

  // 3) İptal edilen / geçmiş tarihli oturumlar
  const iptal = oturumlar.filter((o) => String(o.status) === "cancelled");
  if (iptal.length > 0) {
    isaretler.push({
      id: "oturum-iptal",
      baslik: `Oturum ${iptal.length} kez iptal kaydı aldı.`,
      dayanak: `Oturum kayıtları — iptal işaretli tarihler: ${iptal.map((o) => tcTarih(o.scheduled_at)).join(" · ")}.`,
      cikislar: [
        { yol: CIKIS.ekOturum, gerekce: "Takvim yeniden kurulmadan süreç ilerlemiyor." },
        { yol: CIKIS.ozel, gerekce: "Ortak takvim tutmuyorsa taraflarla ayrı ayrı görüşme planlanabilir." },
      ],
    });
  }
  const gecmisPlanli = oturumlar.filter(
    (o) => String(o.status) === "scheduled" && o.scheduled_at && new Date(String(o.scheduled_at)).getTime() < Date.now(),
  );
  if (gecmisPlanli.length > 0) {
    isaretler.push({
      id: "oturum-gecmis",
      baslik: `${gecmisPlanli.length} oturumun tarihi geçti, kaydı hâlâ "planlandı".`,
      dayanak: `Oturum kayıtları — geçmiş tarihli planlı oturum: ${gecmisPlanli.map((o) => tcTarih(o.scheduled_at)).join(" · ")}.`,
      cikislar: [
        { yol: CIKIS.ekOturum, gerekce: "Yapılan oturum işaretlenmedikçe sonraki adım açılmıyor." },
        { yol: CIKIS.sira, gerekce: "Bekleyen başlık yerine hazır olan başlıkla devam edilebilir." },
      ],
    });
  }

  // 4) Bant sorusu: reddedilen ve cevapsız kalan
  const retler = bantSorulari.filter((s) => String(s.durum) === "ret");
  if (retler.length > 0) {
    isaretler.push({
      id: "bant-ret",
      baslik: `Bant sorusu ${retler.length} kez reddedildi.`,
      dayanak: `Bant sorusu kayıtları — ret cevabı tarihleri: ${retler.map((s) => tcTarih(s.cevap_at ?? s.created_at)).join(" · ")}.`,
      cikislar: [
        { yol: CIKIS.bol, gerekce: "Tek rakam üzerinde tıkanan konu, alt başlıklara ayrıldığında ayrı ayrı ele alınabilir." },
        { yol: CIKIS.tekBaslik, gerekce: "Uzlaşılan başlık ayrı yazılırsa kalan başlık tek başına görüşülebilir." },
        { yol: CIKIS.uzman, gerekce: "Rakamın dayanağı tartışmalıysa uzman görüşü ortak bir ölçü sağlar." },
      ],
    });
  }
  const cevapsizBant = bantSorulari.filter((s) => {
    if (String(s.durum) !== "soruldu") return false;
    const gun = tcGunFarki(s.created_at);
    return gun !== null && gun >= TIKANMA_ESIK.bantSorusu;
  });
  if (cevapsizBant.length > 0) {
    isaretler.push({
      id: "bant-cevapsiz",
      baslik: `${cevapsizBant.length} bant sorusu ${TIKANMA_ESIK.bantSorusu} günden uzun süredir cevapsız.`,
      dayanak: `Bant sorusu kayıtları — soruluş tarihleri: ${cevapsizBant.map((s) => tcTarih(s.created_at)).join(" · ")}.`,
      cikislar: [
        { yol: CIKIS.ozel, gerekce: "Soru özel oturumda doğrudan ele alınabilir." },
        { yol: CIKIS.ekOturum, gerekce: "Cevap oturumda alınırsa tur beklemeden kapanır." },
      ],
    });
  }
  const dusen = braketler.filter((b) => String(b.kosul_durumu) === "dustu");
  if (dusen.length > 0) {
    isaretler.push({
      id: "braket-dustu",
      baslik: `${dusen.length} koşullu taahhüt düştü.`,
      dayanak: `Koşullu aralık kayıtları — durumu "düştü" olan taraf sayısı ${dusen.length}, son güncelleme ${tcTarih(dusen[0]?.updated_at)}.`,
      cikislar: [
        { yol: CIKIS.bol, gerekce: "Tek pakette çözülmeyen konu, parçalara ayrıldığında yeniden aralık girilebilir." },
        { yol: CIKIS.uzman, gerekce: "Tutar farkı teknik bir ölçüye dayanıyorsa uzman görüşü ortak zemin sağlar." },
      ],
    });
  }

  // 5) Durgunluk: dosya kaydının son güncellemesi
  const durgunGun = tcGunFarki(dosyaGuncelleme);
  if (durgunGun !== null && durgunGun >= TIKANMA_ESIK.durgunluk) {
    isaretler.push({
      id: "durgunluk",
      baslik: `Dosya kaydı ${durgunGun} gündür güncellenmedi (Aşama ${Math.min(7, Math.max(1, Number(caseRow.current_phase ?? 1) || 1))}).`,
      dayanak: `Dosya kaydı — son güncelleme ${tcTarih(dosyaGuncelleme)} (eşik: ${TIKANMA_ESIK.durgunluk} gün).`,
      cikislar: [
        { yol: CIKIS.bol, gerekce: "Bütün başlıklar birlikte ilerlemiyorsa tek tek ele alınabilir." },
        { yol: CIKIS.tekBaslik, gerekce: "Anlaşılan başlık ayrı kayda geçerse dosya kısmen de olsa ilerler." },
        { yol: CIKIS.sira, gerekce: "Sıradaki adım beklemedeyse hazır olan adımla devam edilebilir." },
      ],
    });
  }

  // 6) Süre baskısı (yalnız yasal süre kayıtlıysa)
  const sureBitis = (caseRow as any).deadline_extended ?? (caseRow as any).deadline_total ?? null;
  const kalan = tcKalanGun(sureBitis);
  if (kalan !== null && kalan <= TIKANMA_ESIK.sureBaskisi) {
    const uzatmaKullanildi = !!(caseRow as any).extension_used;
    isaretler.push({
      id: "sure",
      baslik: kalan >= 0
        ? `Yasal sürenin bitimine ${kalan} gün kaldı.`
        : `Yasal süre ${Math.abs(kalan)} gün önce doldu.`,
      dayanak: `Dosya süre kaydı — bitiş ${tcTarih(sureBitis)}${uzatmaKullanildi ? " (uzatma kullanılmış)" : " (uzatma kullanılmamış)"}.`,
      cikislar: [
        ...(uzatmaKullanildi ? [] : [{ yol: CIKIS.sure, gerekce: "Süre uzatımı kaydı henüz kullanılmamış görünüyor." }]),
        { yol: CIKIS.tekBaslik, gerekce: "Süre daralmışken uzlaşılan başlık ayrı yazılabilir." },
        { yol: CIKIS.ekOturum, gerekce: "Kalan sürede oturum planı sıkıştırılabilir." },
      ],
    });
  }

  return (
    <div className="rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground p-6 shadow-elegant space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-accent" />
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold">Tıkanma ve Çıkış Yolları</div>
          {!loading && isaretler.length > 0 && (
            <Badge variant="outline" className="border-sidebar-border text-sidebar-foreground/80">
              {isaretler.length} işaret
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" className={KOKPIT_DUGME} onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-1" /> Yenile
        </Button>
      </div>

      <p className="text-xs text-sidebar-foreground/60 leading-snug">
        Kart yalnız kayıtlardan çıkan olguları sayar ve açık olan yolları gerekçesiyle listeler; karar vermez,
        uygulamaz, taraf hakkında yorum yapmaz. Taraflara hiçbir yüzeyden gösterilmez.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-sidebar-foreground/70">
          <Loader2 className="h-4 w-4 animate-spin" /> Kayıtlar taranıyor…
        </div>
      ) : isaretler.length === 0 ? (
        <p className="text-sm text-sidebar-foreground/70">Tıkanma işareti görünmüyor.</p>
      ) : (
        <div className="space-y-3">
          {isaretler.map((i) => (
            <div key={i.id} className="rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-4 space-y-2">
              <div className="text-sm font-display font-bold">{i.baslik}</div>
              <p className="text-[11px] text-sidebar-foreground/55 leading-snug">Dayanak: {i.dayanak}</p>
              <ul className="text-xs text-sidebar-foreground/80 space-y-1">
                {i.cikislar.map((c, k) => (
                  <li key={`${i.id}-${k}`}>
                    <span className="font-semibold">{c.yol}</span> — bu yol açık: {c.gerekce}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {okunamayan.length > 0 && (
        <p className="text-[11px] text-destructive/90 leading-snug">
          Şu kaynaklar okunamadı, o başlıklarda işaret üretilmedi: {okunamayan.join(" · ")}
        </p>
      )}
    </div>
  );
}

/* ============ SEÇENEK SEPETİ (İBA 1.9 / A10) — yalnız arabulucu ============
   Kart, dosyada KAYITLI ihtiyaç metinlerinden yola çıkarak masaya konabilecek çözüm
   seçeneklerini listeler. Yeni AI çağrısı YOK: eşleşme kodda, mevcut analiz
   çıktıları üzerinde yapılır.
   Kaynaklar (hepsi arabulucu yüzeyi): party_root_cause_analysis.kok_neden
   (gorunen_talep · asil_mesele) · party_analyses.analysis.party_position.interests ·
   common_ground_reports.report.common_interests · case_parties.statement (taraf beyanı).
   Sınır: seçenekler SIRALANMAZ, "en iyisi budur" denmez, rakam önerilmez, tavsiye
   verilmez — yalnız "şu seçenek şu kayıtlı ihtiyacı karşılar" denir. Eşleşen kayıt
   yoksa seçenek GÖSTERİLMEZ; hiç ihtiyaç kaydı yoksa "asıl ihtiyaç kaydı yok" yazılır.
   Kör veri (m.1): yalnız kokpitte çizilir; kök neden ve taraf analizleri zaten
   arabulucuya özeldir, taraf ekranına hiçbir satırı çıkmaz. */

type SecenekTanimi = {
  id: string;
  baslik: string;
  karsilik: string;      // hangi ihtiyacı karşıladığı — sabit, nötr cümle
  anahtarlar: string[];  // kayıtlı metinde aranan ifadeler (küçük harf, tr)
};

// Katalog SIRALAMA DEĞİLDİR; ekranda da böyle yazar.
const SECENEK_KATALOGU: SecenekTanimi[] = [
  { id: "taksit", baslik: "Taksitlendirme",
    karsilik: "Ödeme gücü sınırlı olduğunu kayda geçiren tarafın yükünü zamana yayar.",
    anahtarlar: ["taksit", "ödeme güçlüğü", "ödeyemi", "nakit", "likidite", "borç yükü", "maddi zorluk", "bütçe", "peşin ödeme"] },
  { id: "vade", baslik: "Vade / ödeme takvimi",
    karsilik: "Ödemenin ne zaman yapılacağı belirsizliğini takvime bağlar.",
    anahtarlar: ["vade", "gecikme", "geç ödeme", "ödeme tarihi", "erteleme", "tahsilat"] },
  { id: "ayni", baslik: "Hizmet veya ayni karşılık",
    karsilik: "Karşılığın para dışında bir edimle verilmesini masaya koyar.",
    anahtarlar: ["hizmet", "ayni", "mal teslim", "ürün", "malzeme", "tedarik", "iş yapma"] },
  { id: "onarim", baslik: "Onarım / yenileme / eksiğin tamamlanması",
    karsilik: "Ayıplı ya da eksik edimin giderilmesi ihtiyacını karşılar.",
    anahtarlar: ["ayıp", "kusurlu", "hasar", "arıza", "eksik iş", "onarım", "tamir", "yenileme", "montaj", "iade"] },
  { id: "ozur", baslik: "Özür / yüz kurtarma",
    karsilik: "Parayla ölçülmeyen incinme ve itibar kaydını karşılar.",
    anahtarlar: ["özür", "itibar", "saygı", "onur", "incin", "kırgın", "haksızlığa uğra", "güven kaybı", "aşağılan"] },
  { id: "referans", baslik: "Referans mektubu / çalışma belgesi",
    karsilik: "Sonraki iş ilişkisini kurmakta zorlanacağını kayda geçiren tarafın ihtiyacını karşılar.",
    anahtarlar: ["referans", "bonservis", "çalışma belgesi", "iş bulma", "kariyer", "işten çıkar", "istifa"] },
  { id: "iliski", baslik: "Gelecekteki iş ilişkisi / devam eden çalışma",
    karsilik: "İlişkinin sürmesini önemsediği kayda geçen tarafın ihtiyacını karşılar.",
    anahtarlar: ["iş ilişkisi", "ilişkinin devamı", "ortaklık", "müşteri", "tedarikçi", "uzun vadeli", "komşu", "birlikte çalış"] },
  { id: "gizlilik", baslik: "Gizlilik taahhüdü",
    karsilik: "Anlaşma içeriğinin ve dosya bilgisinin paylaşılmaması ihtiyacını karşılar.",
    anahtarlar: ["gizlilik", "ticari sır", "sır", "mahrem", "kişisel veri", "duyulmas"] },
  { id: "aciklamama", baslik: "Kamuoyuna açıklama yapmama",
    karsilik: "Uyuşmazlığın dışarıya taşınmaması ihtiyacını karşılar.",
    anahtarlar: ["basın", "sosyal medya", "kamuoyu", "şikayet sitesi", "paylaşım", "duyuru", "ifşa"] },
  { id: "deneme", baslik: "Süreli deneme / kademeli uygulama",
    karsilik: "Karşı tarafın edimini görmeden bağlanmak istemediği kaydını karşılar.",
    anahtarlar: ["deneme", "pilot", "geçici", "kısa süreli", "gözlem", "test"] },
  { id: "guvence", baslik: "Üçüncü kişi güvencesi (kefil / teminat)",
    karsilik: "Ödemenin yapılmama riskini kayda geçiren tarafın ihtiyacını karşılar.",
    anahtarlar: ["teminat", "kefil", "senet", "ipotek", "güvence", "garanti", "ödenmeme"] },
];

type SecenekKaynakMetni = { metin: string; kaynak: string };
type SecenekEslesme = { kaynak: string; alinti: string };

const trKucuk = (s: string) => String(s ?? "").toLocaleLowerCase("tr");

// Eşleşen ifadeyi taşıyan cümleyi kısaltarak döndürür (uydurma yok: kaydın kendi metni).
function secenekAlinti(metin: string, anahtar: string): string {
  // Not: lookbehind (?<=) KULLANILMAZ — eski tarayıcıda regex sözdizimi hatası
  // bütün paketi çökertir. Noktalama ayırıcı olarak tüketiliyor, alıntıya zararı yok.
  const cumleler = String(metin).split(/[.!?;]\s+/);
  const hedef = cumleler.find((c) => trKucuk(c).includes(anahtar)) ?? metin;
  const t = hedef.trim().replace(/\s+/g, " ");
  return t.length > 160 ? `${t.slice(0, 157)}…` : t;
}

function SecenekSepetiPanel({ caseRow }: { caseRow: CaseRow }) {
  const [metinler, setMetinler] = useState<SecenekKaynakMetni[]>([]);
  const [okunamayan, setOkunamayan] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const eksik: string[] = [];
    const toplanan: SecenekKaynakMetni[] = [];

    const p = await supabase.from("case_parties")
      .select("id, party_role, first_name, last_name, company_name, statement")
      .eq("case_id", caseRow.id).order("created_at");
    if (p.error) eksik.push(`taraf kayıtları (${p.error.message})`);
    const partyList = Array.isArray(p.data) ? p.data : [];
    const adlar = new Map<string, string>(partyList.map((x: any, i: number) => [x.id, blindBidPartyName(x, i)]));

    for (const t of partyList as any[]) {
      const beyan = String(t.statement ?? "").trim();
      if (beyan) toplanan.push({ metin: beyan, kaynak: `Taraf beyanı — ${adlar.get(t.id)}` });
    }

    const [rc, pa, cg] = await Promise.all([
      supabase.from("party_root_cause_analysis").select("party_id, kok_neden, created_at")
        .eq("case_id", caseRow.id).order("created_at", { ascending: false }),
      supabase.from("party_analyses").select("party_id, analysis").eq("case_id", caseRow.id),
      supabase.from("common_ground_reports").select("report, created_at")
        .eq("case_id", caseRow.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (rc.error) eksik.push(`kök neden analizi (${rc.error.message})`);
    if (pa.error) eksik.push(`taraf analizleri (${pa.error.message})`);
    if (cg.error) eksik.push(`ortak zemin raporu (${cg.error.message})`);

    const gorulenTaraf = new Set<string>();
    for (const r of ((rc.data ?? []) as any[])) {
      if (gorulenTaraf.has(String(r.party_id))) continue;   // taraf başına en yeni kayıt
      gorulenTaraf.add(String(r.party_id));
      const kn = r.kok_neden ?? {};
      const ad = adlar.get(String(r.party_id)) ?? "Taraf";
      const asil = String(kn.asil_mesele ?? "").trim();
      const gorunen = String(kn.gorunen_talep ?? "").trim();
      if (asil && asil !== "Yeterli veri yok") toplanan.push({ metin: asil, kaynak: `Kök neden analizi — ${ad} (asıl mesele)` });
      if (gorunen) toplanan.push({ metin: gorunen, kaynak: `Kök neden analizi — ${ad} (görünen talep)` });
    }

    for (const a of ((pa.data ?? []) as any[])) {
      const ad = adlar.get(String(a.party_id)) ?? "Taraf";
      const ilgiler = (a.analysis as any)?.party_position?.interests;
      if (Array.isArray(ilgiler)) {
        for (const i of ilgiler) {
          const m = String(i ?? "").trim();
          if (m) toplanan.push({ metin: m, kaynak: `Taraf analizi — ${ad} (menfaatler)` });
        }
      }
    }

    const ortak = (cg.data as any)?.report?.common_interests;
    if (Array.isArray(ortak)) {
      for (const o of ortak) {
        const m = String(o ?? "").trim();
        if (m) toplanan.push({ metin: m, kaynak: "Ortak zemin raporu — ortak menfaatler" });
      }
    }

    setMetinler(toplanan);
    setOkunamayan(eksik);
    setLoading(false);
  }, [caseRow.id]);
  useEffect(() => { load(); }, [load]);

  // Eşleşme: her seçenek için, kayıtlı metinlerde geçen ifadeler. Eşleşme yoksa satır yok.
  const secenekler = SECENEK_KATALOGU.map((s) => {
    const eslesmeler: SecenekEslesme[] = [];
    for (const m of metinler) {
      const kucuk = trKucuk(m.metin);
      const anahtar = s.anahtarlar.find((a) => kucuk.includes(a));
      if (!anahtar) continue;
      if (eslesmeler.some((e) => e.kaynak === m.kaynak)) continue;   // kaynak başına tek satır
      eslesmeler.push({ kaynak: m.kaynak, alinti: secenekAlinti(m.metin, anahtar) });
    }
    return { tanim: s, eslesmeler };
  }).filter((x) => x.eslesmeler.length > 0);

  return (
    <div className="rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground p-6 shadow-elegant space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-accent" />
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold">Seçenek Sepeti</div>
          {!loading && secenekler.length > 0 && (
            <Badge variant="outline" className="border-sidebar-border text-sidebar-foreground/80">
              {secenekler.length} seçenek
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" className={KOKPIT_DUGME} onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-1" /> Yenile
        </Button>
      </div>

      <p className="text-xs text-sidebar-foreground/60 leading-snug">
        Masaya konabilecek çözüm seçenekleri, dosyada KAYITLI ihtiyaç metinleriyle eşleştiği ölçüde listelenir.
        Liste bir sıralama değildir; kart "en iyisi budur" demez, rakam önermez, tavsiye vermez. Taraflara
        hiçbir yüzeyden gösterilmez.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-sidebar-foreground/70">
          <Loader2 className="h-4 w-4 animate-spin" /> Kayıtlı ihtiyaçlar taranıyor…
        </div>
      ) : metinler.length === 0 ? (
        <p className="text-sm text-sidebar-foreground/70">
          Asıl ihtiyaç kaydı yok, seçenek üretilemedi. (Kök neden analizi, taraf analizi menfaatleri, ortak
          zemin raporu ve taraf beyanı boş.)
        </p>
      ) : secenekler.length === 0 ? (
        <p className="text-sm text-sidebar-foreground/70">
          Kayıtlı ihtiyaç metinleri var ama katalogdaki seçeneklerle eşleşen bir ifade bulunmadı; zorlama
          seçenek üretilmedi.
        </p>
      ) : (
        <div className="space-y-3">
          {secenekler.map(({ tanim, eslesmeler }) => (
            <div key={tanim.id} className="rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-4 space-y-2">
              <div className="text-sm font-display font-bold">{tanim.baslik}</div>
              <p className="text-xs text-sidebar-foreground/80">{tanim.karsilik}</p>
              <ul className="space-y-1">
                {eslesmeler.map((e, k) => (
                  <li key={`${tanim.id}-${k}`} className="text-[11px] text-sidebar-foreground/55 leading-snug">
                    Dayanak: {e.kaynak} — “{e.alinti}”
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {okunamayan.length > 0 && (
        <p className="text-[11px] text-destructive/90 leading-snug">
          Şu kaynaklar okunamadı, o kayıtlardan seçenek üretilmedi: {okunamayan.join(" · ")}
        </p>
      )}
    </div>
  );
}

/* ====== İLETİŞİMDE DEĞİŞİM (İBA 1.5 · todo A4/5) — yalnız arabulucu ============
   AYNI TARAFIN kendi metinleri zaman içinde karşılaştırılır. Karşı tarafla
   KARŞILAŞTIRMA YOKTUR; her taraf yalnız kendi metinlerine göre ölçülür.
   Yöntem: İFADE SAYIMI (kodda, deterministik) — yeni AI çağrısı YOKTUR.
   Kişilik değerlendirmesi, psikolojik teşhis ve duygu etiketi YASAK (constitution
   m.2, mimari §11): çıktı yalnız "hangi ifade ailesi, hangi tarihli metinde kaç kez"
   ve iki tarihli metinden birer cümlelik alıntıdır.
   Kaynak metinler (hepsi tarihli): taraf beyanı (case_parties.statement + kayıt
   tarihi) · o tarafa ait belgelerin çıkarılmış metni (case_documents.created_at) ·
   keşif sorusu cevapları (case_discovery_questions.updated_at) · tarafın kendi
   yazdığı mesajlar (messages.created_at, sender_id = tarafın kullanıcı kimliği).
   Yeri (16.08 taşındı): KOKPİT (Aşama 3) — Tıkanma ve Seçenek Sepeti kartlarının
   yanında. Önce Aşama 2'de taraf kartının içindeydi ve kart açılmadıkça hiç
   çizilmiyordu; o yüzden canlıda görünmüyordu. Aşama 2'de kalıntı bırakılmadı.
   Gizlilik: kokpit yalnız arabulucuya çizilir; tarafa hiçbir yüzeyden gitmez. */

type DegisimMetni = { tarih: string; etiket: string; metin: string };
type DegisimIsareti = { baslik: string; yon: string; dayanak1: string; dayanak2: string };

const DEGISIM_AILELERI: { anahtar: string; ifadeler: string[] }[] = [
  {
    anahtar: "talep",
    ifadeler: ["talep ediyorum", "talep etmekteyim", "talep ederim", "derhal", "aksi hâlde",
      "aksi halde", "dava aç", "icra", "ihtar", "kabul etmiyorum", "son kez", "hukuki yollara",
      "tazminat talep", "gereğini"],
  },
  {
    anahtar: "cozum",
    ifadeler: ["uzlaş", "anlaş", "görüşelim", "çözüm", "orta yol", "esnek", "karşılıklı",
      "müzakere", "birlikte", "makul bir çözüm", "mutabık"],
  },
  {
    anahtar: "kosul",
    ifadeler: ["şartıyla", "koşuluyla", "şu şartla", "kabul edilmesi hâlinde",
      "kabul edilmesi halinde", "olması hâlinde", "olması halinde", "karşılığında"],
  },
  {
    anahtar: "geri",
    ifadeler: ["vazgeç", "geri çek", "talebimden", "artık istemiyorum", "feragat"],
  },
];

const degTrKucuk = (s: string) => String(s ?? "").toLocaleLowerCase("tr").replace(/ı/g, "i");

function degSay(metin: string, ifadeler: string[]): number {
  const k = degTrKucuk(metin);
  let toplam = 0;
  for (const ifade of ifadeler) {
    const a = degTrKucuk(ifade);
    let i = k.indexOf(a);
    while (i > -1) { toplam++; i = k.indexOf(a, i + a.length); }
  }
  return toplam;
}

function degRakamVarMi(metin: string): boolean {
  return /\d[\d.]{2,}(?:,\d+)?\s*(?:tl|try|₺|lira)/i.test(metin) || /\b\d{4,}\b/.test(metin);
}

// Alıntı: aranan ifadenin geçtiği cümle, en çok bir cümle ve 140 karakter.
function degAlinti(metin: string, ifadeler: string[]): string {
  const k = degTrKucuk(metin);
  let yer = -1;
  for (const ifade of ifadeler) {
    const i = k.indexOf(degTrKucuk(ifade));
    if (i > -1 && (yer === -1 || i < yer)) yer = i;
  }
  const kaynak = yer === -1 ? metin : metin;
  const bas = yer === -1 ? 0 : Math.max(kaynak.lastIndexOf(". ", yer), kaynak.lastIndexOf("\n", yer)) + 1;
  const sonAday = [kaynak.indexOf(". ", Math.max(bas, yer === -1 ? 0 : yer)), kaynak.indexOf("\n", Math.max(bas, yer === -1 ? 0 : yer))]
    .filter((x) => x > -1);
  const son = sonAday.length ? Math.min(...sonAday) : kaynak.length;
  const parca = kaynak.slice(bas, son).trim().replace(/\s+/g, " ");
  return parca.length > 140 ? `${parca.slice(0, 137)}…` : parca;
}

// Rakam işareti için alıntı: tutarın geçtiği cümle (ifade listesi olmadığında
// metnin ilk cümlesi alınıyordu, dayanak yanıltıcı oluyordu).
function degAlintiRakam(metin: string): string {
  const m = metin.match(/\d[\d.]{2,}(?:,\d+)?\s*(?:TL|TRY|₺|lira)?/i);
  if (!m || m.index === undefined) return degAlinti(metin, []);
  const bas = Math.max(metin.lastIndexOf(". ", m.index), metin.lastIndexOf("\n", m.index)) + 1;
  const aday = [metin.indexOf(". ", m.index), metin.indexOf("\n", m.index)].filter((x) => x > -1);
  const son = aday.length ? Math.min(...aday) : metin.length;
  const parca = metin.slice(bas, son).trim().replace(/\s+/g, " ");
  return parca.length > 140 ? `${parca.slice(0, 137)}…` : parca;
}

function degTarih(iso: string | null | undefined): string {
  if (!iso) return "tarihsiz";   // boş alan 01.01.1970 olarak yazılmasın
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "tarihsiz" : d.toLocaleDateString("tr-TR");
}

// İlk ve son metin karşılaştırılır; eşik: en az 2 geçiş farkı ya da yoktan var olma.
function degisimIsaretleri(metinler: DegisimMetni[]): DegisimIsareti[] {
  if (metinler.length < 2) return [];
  const ilk = metinler[0];
  const son = metinler[metinler.length - 1];
  const isaretler: DegisimIsareti[] = [];
  const sayim: Record<string, { ilk: number; son: number }> = {};
  for (const aile of DEGISIM_AILELERI) {
    sayim[aile.anahtar] = { ilk: degSay(ilk.metin, aile.ifadeler), son: degSay(son.metin, aile.ifadeler) };
  }

  const talepFark = sayim.talep.son - sayim.talep.ilk;
  const cozumFark = sayim.cozum.son - sayim.cozum.ilk;

  if (talepFark >= 2 && cozumFark <= 0) {
    isaretler.push({
      baslik: `Kesin talep dili arttı (${sayim.talep.ilk} → ${sayim.talep.son} geçiş), çözüm dili ${sayim.cozum.ilk} → ${sayim.cozum.son}.`,
      yon: "talebin kesinleşmesi / dilin sertleşmesi yönünde",
      dayanak1: `${degTarih(ilk.tarih)} · ${ilk.etiket}: “${degAlinti(ilk.metin, DEGISIM_AILELERI[1].ifadeler)}”`,
      dayanak2: `${degTarih(son.tarih)} · ${son.etiket}: “${degAlinti(son.metin, DEGISIM_AILELERI[0].ifadeler)}”`,
    });
  }
  if (cozumFark >= 2 && talepFark <= 0) {
    isaretler.push({
      baslik: `Çözüm dili arttı (${sayim.cozum.ilk} → ${sayim.cozum.son} geçiş), kesin talep dili ${sayim.talep.ilk} → ${sayim.talep.son}.`,
      yon: "yumuşama yönünde",
      dayanak1: `${degTarih(ilk.tarih)} · ${ilk.etiket}: “${degAlinti(ilk.metin, DEGISIM_AILELERI[0].ifadeler)}”`,
      dayanak2: `${degTarih(son.tarih)} · ${son.etiket}: “${degAlinti(son.metin, DEGISIM_AILELERI[1].ifadeler)}”`,
    });
  }
  if (sayim.kosul.son - sayim.kosul.ilk >= 2) {
    isaretler.push({
      baslik: `Koşullu ifadeler arttı (${sayim.kosul.ilk} → ${sayim.kosul.son} geçiş).`,
      yon: "talebin koşula bağlanması yönünde",
      dayanak1: `${degTarih(ilk.tarih)} · ${ilk.etiket}: “${degAlinti(ilk.metin, DEGISIM_AILELERI[2].ifadeler)}”`,
      dayanak2: `${degTarih(son.tarih)} · ${son.etiket}: “${degAlinti(son.metin, DEGISIM_AILELERI[2].ifadeler)}”`,
    });
  }
  if (sayim.geri.ilk === 0 && sayim.geri.son > 0) {
    isaretler.push({
      baslik: `Geri çekilme ifadesi ilk metinde yok, son metinde ${sayim.geri.son} kez geçiyor.`,
      yon: "geri çekilme yönünde",
      dayanak1: `${degTarih(ilk.tarih)} · ${ilk.etiket}: bu ifade geçmiyor`,
      dayanak2: `${degTarih(son.tarih)} · ${son.etiket}: “${degAlinti(son.metin, DEGISIM_AILELERI[3].ifadeler)}”`,
    });
  }
  if (!degRakamVarMi(ilk.metin) && degRakamVarMi(son.metin)) {
    isaretler.push({
      baslik: "İlk metinde rakam yok, son metinde tutar/rakam yazılmış.",
      yon: "talebin rakamla netleşmesi yönünde",
      dayanak1: `${degTarih(ilk.tarih)} · ${ilk.etiket}: rakam geçmiyor`,
      dayanak2: `${degTarih(son.tarih)} · ${son.etiket}: “${degAlintiRakam(son.metin)}”`,
    });
  }
  return isaretler;
}

/* Kokpit paneli: her taraf için ayrı satır. Kart, veri yetersiz olsa da ÇİZİLİR —
   "karşılaştırılacak yeterli tarihli metin yok" satırıyla görünür (16.08 bulgusu:
   kutu Aşama 2'de taraf kartının içindeydi, kart açılmadıkça hiç çizilmiyordu). */
function IletisimDegisimPanel({ caseRow }: { caseRow: CaseRow }) {
  type DegisimSatiri = {
    partyId: string;
    ad: string;
    metinSayisi: number;
    farkliGun: number;
    isaretler: DegisimIsareti[];
  };
  const [satirlar, setSatirlar] = useState<DegisimSatiri[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [okunamayan, setOkunamayan] = useState<string[]>([]);
  // AYRINTI KOLU (16.08): sayım kolu bedava ve kendiliğinden çalışır; ayrıntı
  // yalnız düğmeye basınca üretilir, iletisim_degisim tablosunda saklanır ve her
  // açılışta yeniden ücret çıkmaz. "Yeniden çıkar" ile bilerek tazelenir.
  const [ayrintilar, setAyrintilar] = useState<Record<string, any>>({});
  const [ayrintiBusy, setAyrintiBusy] = useState<string | null>(null);
  const [ayrintiHata, setAyrintiHata] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const eksik: string[] = [];
    const p = await supabase.from("case_parties")
      .select("id, user_id, party_role, first_name, last_name, company_name, statement, created_at")
      .eq("case_id", caseRow.id).order("created_at");
    if (p.error) eksik.push(`taraf kayıtları (${p.error.message})`);
    const taraflar = Array.isArray(p.data) ? p.data : [];

    const [dok, kesif, msj] = await Promise.all([
      supabase.from("case_documents").select("file_name, extracted_text, created_at, party_id").eq("case_id", caseRow.id),
      supabase.from("case_discovery_questions").select("answer_text, updated_at, party_id").eq("case_id", caseRow.id),
      supabase.from("messages").select("content, created_at, sender_id").eq("case_id", caseRow.id),
    ]);
    if (dok.error) eksik.push(`belgeler (${dok.error.message})`);
    if (kesif.error) eksik.push(`keşif cevapları (${kesif.error.message})`);
    if (msj.error) eksik.push(`mesajlar (${msj.error.message})`);

    // Kayıtlı ayrıntı paragrafları (varsa) — tablo yoksa kart yine çalışır.
    const ay = await (supabase.from("iletisim_degisim" as any) as any)
      .select("party_id, paragraf, alinti_ilk, alinti_son, tarih_ilk, tarih_son, kaynak_ilk, kaynak_son, durum, sebep, updated_at")
      .eq("case_id", caseRow.id);
    if (ay.error) eksik.push(`ayrıntı kayıtları (${ay.error.message})`);
    const ayMap: Record<string, any> = {};
    for (const r of ((ay.data ?? []) as any[])) ayMap[String(r.party_id)] = r;
    setAyrintilar(ayMap);

    const sonuc: DegisimSatiri[] = taraflar.map((t: any, i: number) => {
      // YALNIZ bu tarafın kendi metinleri toplanır; karşı tarafın metni hiçbir
      // koşulda bu listeye girmez (taraflar birbiriyle karşılaştırılmaz).
      const metinler: DegisimMetni[] = [];
      const beyan = String(t.statement ?? "").trim();
      if (beyan) metinler.push({ tarih: t.created_at, etiket: "taraf beyanı", metin: beyan });
      for (const d of ((dok.data ?? []) as any[])) {
        if (String(d.party_id) !== String(t.id)) continue;
        const m = String(d.extracted_text ?? "").trim();
        if (m.length > 80) metinler.push({ tarih: d.created_at, etiket: d.file_name ?? "belge", metin: m });
      }
      for (const k of ((kesif.data ?? []) as any[])) {
        if (String(k.party_id) !== String(t.id)) continue;
        const m = String(k.answer_text ?? "").trim();
        if (m.length > 40) metinler.push({ tarih: k.updated_at, etiket: "keşif sorusu cevabı", metin: m });
      }
      for (const m0 of ((msj.data ?? []) as any[])) {
        if (!t.user_id || String(m0.sender_id) !== String(t.user_id)) continue;
        const m = String(m0.content ?? "").trim();
        if (m.length > 40) metinler.push({ tarih: m0.created_at, etiket: "mesaj", metin: m });
      }
      metinler.sort((a, b) => String(a.tarih).localeCompare(String(b.tarih)));
      const farkliGun = new Set(metinler.map((m) => String(m.tarih).slice(0, 10))).size;
      return {
        partyId: t.id,
        ad: `${blindBidPartyName(t, i)} (${roleLabel(t.party_role)})`,
        metinSayisi: metinler.length,
        farkliGun,
        isaretler: farkliGun >= 2 ? degisimIsaretleri(metinler) : [],
      };
    });

    setOkunamayan(eksik);
    setSatirlar(sonuc);
    setLoading(false);
  }, [caseRow.id]);
  useEffect(() => { load(); }, [load]);

  async function ayrintiCikar(partyId: string, yenile: boolean) {
    setAyrintiBusy(partyId);
    setAyrintiHata(null);
    try {
      const { data, error } = await supabase.functions.invoke("iletisim-degisim", {
        body: { case_id: caseRow.id, party_id: partyId, yenile },
      });
      if (error) {
        // Gerçek sebep .context gövdesindedir; sessizce yutulmaz.
        let ham = String((error as any)?.message ?? "bilinmeyen hata");
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.text === "function") {
          try {
            const govde = await ctx.text();
            if (govde) {
              try { const j = JSON.parse(govde); ham = String(j?.error ?? j?.sebep ?? govde); }
              catch { ham = String(govde).slice(0, 400); }
            }
          } catch { /* gövde okunamadı */ }
        }
        throw new Error(ham);
      }
      if ((data as any)?.error) throw new Error(String((data as any).error));
      if ((data as any)?.yetersiz) setAyrintiHata(String((data as any).sebep ?? "Yeterli tarihli metin yok"));
      await load();
    } catch (e: any) {
      console.error("[iletisim-degisim] çağrı başarısız", e);
      setAyrintiHata(`iletisim-degisim çağrısı başarısız: ${trErr(e?.message ?? "bilinmeyen hata")}`);
    } finally {
      setAyrintiBusy(null);
    }
  }

  const toplamIsaret = (satirlar ?? []).reduce((t, s) => t + s.isaretler.length, 0);

  return (
    <div className="rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground p-6 shadow-elegant space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-accent" />
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold">İletişimde Değişim</div>
          {!loading && toplamIsaret > 0 && (
            <Badge variant="outline" className="border-sidebar-border text-sidebar-foreground/80">
              {toplamIsaret} işaret
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" className={KOKPIT_DUGME} onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-1" /> Yenile
        </Button>
      </div>

      <p className="text-xs text-sidebar-foreground/60 leading-snug">
        Her taraf YALNIZ kendi metinleriyle, eskiden yeniye karşılaştırılır; taraflar birbiriyle
        karşılaştırılmaz. Ölçüm ifade sayımına dayanır — kişilik, duygu ya da niyet değerlendirmesi
        yapılmaz. Taraflara hiçbir yüzeyden gösterilmez.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-sidebar-foreground/70">
          <Loader2 className="h-4 w-4 animate-spin" /> Tarihli metinler taranıyor…
        </div>
      ) : !satirlar || satirlar.length === 0 ? (
        <p className="text-sm text-sidebar-foreground/70">Dosyada taraf kaydı yok.</p>
      ) : (
        <div className="space-y-3">
          {satirlar.map((s) => (
            <div key={s.partyId} className="rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-4 space-y-2">
              <div className="text-sm font-display font-bold">{s.ad}</div>
              {/* 16.08 DÜZELTME: Bu tarafta durum='hazir' ayrıntı kaydı varsa SAYIM
                  KOLUNUN HÜKÜM CÜMLESİ gizlenir — "Belirgin bir değişim görünmüyor."
                  ile yapay zekâ paragrafı aynı anda ekranda durunca kart kendi kendiyle
                  çelişiyordu. Hesap, eşikler ve düğmeler DEĞİŞMEDİ; yalnız bu cümlelerin
                  görünme koşulu değişti. Kayıt yoksa ya da durumu 'degisim_yok'/'elendi'
                  ise görünüm bugünküyle aynı kalır. */}
              {ayrintilar[s.partyId]?.durum === "hazir" && ayrintilar[s.partyId]?.paragraf ? null
              : s.farkliGun < 2 ? (
                <p className="text-xs text-sidebar-foreground/70">
                  Karşılaştırılacak yeterli tarihli metin yok — {s.metinSayisi} metin, {s.farkliGun} ayrı gün
                  (en az iki farklı tarihli metin gerekir).
                </p>
              ) : s.isaretler.length === 0 ? (
                <p className="text-xs text-sidebar-foreground/70">Belirgin bir değişim görünmüyor.</p>
              ) : (
                <ul className="space-y-2">
                  {s.isaretler.map((i, k) => (
                    <li key={`${s.partyId}-${k}`} className="text-xs space-y-0.5">
                      <div className="font-medium">{i.baslik}</div>
                      <div className="text-sidebar-foreground/80">Yön: {i.yon}</div>
                      <div className="text-[11px] text-sidebar-foreground/55 leading-snug">Dayanak: {i.dayanak1}</div>
                      <div className="text-[11px] text-sidebar-foreground/55 leading-snug">Dayanak: {i.dayanak2}</div>
                    </li>
                  ))}
                </ul>
              )}

              {/* AYRINTI KOLU — yalnız iki farklı tarihli metin varsa. Sayım kolu
                  yukarıda aynen durur; bu bölüm onun ALTINA eklenir. */}
              {s.farkliGun >= 2 && (() => {
                const ay = ayrintilar[s.partyId];
                const bekliyor = ayrintiBusy === s.partyId;
                const hazir = ay?.durum === "hazir" && !!ay?.paragraf;
                return (
                  <div className={hazir ? "space-y-1" : "border-t border-sidebar-border/60 pt-2 space-y-1"}>
                    {ay?.durum === "hazir" && ay?.paragraf ? (
                      <>
                        <div className="text-xs leading-snug">{ay.paragraf}</div>
                        <div className="text-[11px] text-sidebar-foreground/55 leading-snug">
                          Dayanak: {degTarih(ay.tarih_ilk)} · {ay.kaynak_ilk}: “{ay.alinti_ilk}”
                        </div>
                        <div className="text-[11px] text-sidebar-foreground/55 leading-snug">
                          Dayanak: {degTarih(ay.tarih_son)} · {ay.kaynak_son}: “{ay.alinti_son}”
                        </div>
                      </>
                    ) : ay?.durum === "degisim_yok" ? (
                      <div className="text-[11px] text-sidebar-foreground/70">
                        Ayrıntı çıkarıldı: iki metin arasında belirgin bir değişim bildirilmedi.
                      </div>
                    ) : ay?.durum === "elendi" ? (
                      <div className="text-[11px] text-sidebar-foreground/70">
                        Ayrıntı yazılmadı — {ay.sebep}
                      </div>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      className={KOKPIT_DUGME}
                      disabled={bekliyor}
                      onClick={() => ayrintiCikar(s.partyId, !!ay)}
                    >
                      {bekliyor
                        ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Çıkarılıyor…</>
                        : <><Sparkles className="h-4 w-4 mr-1" /> {ay ? "Yeniden çıkar" : "Ayrıntısını çıkar"}</>}
                    </Button>
                    <UcretliIsaret ton="koyu" />
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {ayrintiHata && (
        <p className="text-[11px] text-destructive/90 leading-snug">{ayrintiHata}</p>
      )}

      {okunamayan.length > 0 && (
        <p className="text-[11px] text-destructive/90 leading-snug">
          Şu kaynaklar okunamadı, o metinler ölçüme girmedi: {okunamayan.join(" · ")}
        </p>
      )}
    </div>
  );
}

/* ====== ELVERİŞLİLİK KONTROLÜ (İBA 2.1) — yalnız arabulucu ==================
   Ajan KARAR VERMEZ: dosyada elverişlilik bakımından dikkat gerektiren bir işaret
   varsa kaynak künyesiyle bildirir. Kaynak YALNIZ bilgi tabanıdır; dayanak yoksa
   uyarı üretilmez. Düğme ücretli model çağrısı tetikler, maliyet işareti altındadır.
   Kendiliğinden çalışmaz — yalnız arabulucu basınca. */
function ElverislilikPanel({ caseRow }: { caseRow: CaseRow }) {
  const [kayit, setKayit] = useState<any | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    const { data, error } = await (supabase.from("elverislilik_kontrol" as any) as any)
      .select("durum, bulgular, kaynaklar, updated_at").eq("case_id", caseRow.id).maybeSingle();
    if (error) setHata(`Elverişlilik kaydı okunamadı: ${error.message}`);
    else setKayit(data ?? null);
    setYukleniyor(false);
  }, [caseRow.id]);
  useEffect(() => { yukle(); }, [yukle]);

  async function kontrolEt() {
    setBusy(true);
    setHata(null);
    try {
      const { data, error } = await supabase.functions.invoke("elverislilik", {
        body: { case_id: caseRow.id },
      });
      if (error) {
        // Gerçek sebep .context gövdesindedir; sessizce yutulmaz.
        let ham = String((error as any)?.message ?? "bilinmeyen hata");
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.text === "function") {
          try {
            const govde = await ctx.text();
            if (govde) {
              try { const j = JSON.parse(govde); ham = String(j?.error ?? j?.sebep ?? govde); }
              catch { ham = String(govde).slice(0, 400); }
            }
          } catch { /* gövde okunamadı */ }
        }
        throw new Error(ham);
      }
      if ((data as any)?.error) throw new Error(String((data as any).error));
      await yukle();
    } catch (e: any) {
      console.error("[elverislilik] çağrı başarısız", e);
      setHata(`elverislilik çağrısı başarısız: ${trErr(e?.message ?? "bilinmeyen hata")}`);
    } finally {
      setBusy(false);
    }
  }

  const bulgular = Array.isArray(kayit?.bulgular) ? kayit.bulgular : [];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground leading-snug">
        Dosyada arabuluculuğa elverişlilik bakımından dikkat gerektiren bir işaret varsa kaynağıyla
        birlikte gösterilir. Kaynak yalnız bilgi tabanındaki kanun, yönetmelik ve uzmanlık
        modülleridir; dayanak bulunamazsa uyarı üretilmez. Karar arabulucuya aittir.
      </p>

      {hata && (
        <div className="text-sm rounded border border-destructive/40 bg-destructive/10 text-destructive p-3">
          {hata}
        </div>
      )}

      {yukleniyor ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Kayıt okunuyor…
        </div>
      ) : !kayit ? (
        <p className="text-sm text-muted-foreground italic">Henüz çalıştırılmadı.</p>
      ) : kayit.durum === "kaynak_yok" ? (
        <p className="text-sm">Bilgi tabanında dayanak bulunamadı — uyarı üretilmedi.</p>
      ) : kayit.durum === "isaret_yok" || bulgular.length === 0 ? (
        <p className="text-sm">Dikkat gerektiren bir işaret bulunamadı.</p>
      ) : (
        <ul className="space-y-3">
          {bulgular.map((b: any, i: number) => (
            <li key={i} className="text-sm border-l-2 border-amber-300 pl-3 space-y-0.5">
              <div className="font-medium">{safeText(b?.baslik)}</div>
              <div className="text-muted-foreground leading-snug">{safeText(b?.neden)}</div>
              <div className="text-xs text-muted-foreground leading-snug">
                Kaynak: {safeText(b?.kaynak_adi)}{b?.madde_bolum ? ` · ${safeText(b.madde_bolum)}` : ""}
              </div>
              <div className="text-xs italic text-muted-foreground leading-snug">“{safeText(b?.alinti)}”</div>
            </li>
          ))}
        </ul>
      )}

      {kayit?.kaynaklar && (
        <p className="text-[11px] text-muted-foreground leading-snug">
          Taranan kaynaklar: {String(kayit.kaynaklar)}
        </p>
      )}

      <div className="space-y-1">
        <Button size="sm" variant="outline" className={KART_DUGME} onClick={kontrolEt} disabled={busy}>
          {busy
            ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Kontrol ediliyor…</>
            : <><ShieldCheck className="h-4 w-4 mr-1" /> {kayit ? "Yeniden kontrol et" : "Kontrol et"}</>}
        </Button>
        <UcretliIsaret />
      </div>
    </div>
  );
}

/* ====== USUL ÖNERİSİ (İBA 2.2) — yalnız arabulucu =========================
   Ajan sürecin BİÇİMİNE dair seçenek sunar; karar ve kurgu arabulucunundur.
   Dayanağı dosya kaydında karşılığı olmayan öneri sunucuda elenir. Düğme ücretli
   model çağrısı tetikler (maliyet işareti altındadır) ve kendiliğinden çalışmaz. */
function UsulOnerisiPanel({ caseRow }: { caseRow: CaseRow }) {
  const [kayit, setKayit] = useState<any | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    const { data, error } = await (supabase.from("usul_onerileri" as any) as any)
      .select("durum, oneriler, updated_at").eq("case_id", caseRow.id).maybeSingle();
    if (error) setHata(`Usul önerisi kaydı okunamadı: ${error.message}`);
    else setKayit(data ?? null);
    setYukleniyor(false);
  }, [caseRow.id]);
  useEffect(() => { yukle(); }, [yukle]);

  async function hazirla() {
    setBusy(true);
    setHata(null);
    try {
      const { data, error } = await supabase.functions.invoke("usul-onerisi", {
        body: { case_id: caseRow.id },
      });
      if (error) {
        // Gerçek sebep .context gövdesindedir; sessizce yutulmaz.
        let ham = String((error as any)?.message ?? "bilinmeyen hata");
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.text === "function") {
          try {
            const govde = await ctx.text();
            if (govde) {
              try { const j = JSON.parse(govde); ham = String(j?.error ?? j?.sebep ?? govde); }
              catch { ham = String(govde).slice(0, 400); }
            }
          } catch { /* gövde okunamadı */ }
        }
        throw new Error(ham);
      }
      if ((data as any)?.error) throw new Error(String((data as any).error));
      await yukle();
    } catch (e: any) {
      console.error("[usul-onerisi] çağrı başarısız", e);
      setHata(`usul-onerisi çağrısı başarısız: ${trErr(e?.message ?? "bilinmeyen hata")}`);
    } finally {
      setBusy(false);
    }
  }

  const oneriler = Array.isArray(kayit?.oneriler) ? kayit.oneriler : [];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground leading-snug">
        Dosyanın koşullarına göre sürecin biçimine dair seçenekler — oturum düzeni, süre ve zaman,
        yüz yüze/çevrimiçi tercihi, uzman görüşü, vekilsiz tarafa süreç anlatımı. İşin esasına dair
        öneri üretilmez; dayanağı dosya kaydında karşılığı olmayan öneri gösterilmez.
      </p>

      {hata && (
        <div className="text-sm rounded border border-destructive/40 bg-destructive/10 text-destructive p-3">
          {hata}
        </div>
      )}

      {yukleniyor ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Kayıt okunuyor…
        </div>
      ) : !kayit ? (
        <p className="text-sm text-muted-foreground italic">Henüz çalıştırılmadı.</p>
      ) : oneriler.length === 0 ? (
        <p className="text-sm">Bu dosya için biçime dair bir öneri çıkmadı.</p>
      ) : (
        <>
          <ul className="space-y-3">
            {oneriler.map((o: any, i: number) => (
              <li key={i} className="text-sm border-l-2 border-primary/40 pl-3 space-y-0.5">
                <div className="font-medium">{safeText(o?.oneri)}</div>
                <div className="text-xs text-muted-foreground leading-snug">Dayanak: {safeText(o?.dayanak)}</div>
                <div className="text-xs text-muted-foreground leading-snug">Gerekçe: {safeText(o?.gerekce)}</div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">Karar arabulucuya aittir.</p>
        </>
      )}

      <div className="space-y-1">
        <Button size="sm" variant="outline" className={KART_DUGME} onClick={hazirla} disabled={busy}>
          {busy
            ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Hazırlanıyor…</>
            : <><Sparkles className="h-4 w-4 mr-1" /> {kayit ? "Yeniden hazırla" : "Öneri hazırla"}</>}
        </Button>
        <UcretliIsaret />
      </div>
    </div>
  );
}

/* ====== USULE İLİŞKİN ENGELLER (İBA 2.4) — yalnız arabulucu ================
   Ajan kanun yorumu YAPMAZ, EKSİK SAYAR. Hesap tamamen sunucuda kodla yapılır;
   model çağrısı yoktur — bu yüzden düğmenin altında maliyet işareti YOKTUR.
   Referans alanı boş gelebilir: doğrulanmamış madde numarası yazılmaz. */
function UsulEngeliPanel({ caseRow }: { caseRow: CaseRow }) {
  const [kayit, setKayit] = useState<any | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    const { data, error } = await (supabase.from("usul_engelleri" as any) as any)
      .select("durum, engeller, updated_at").eq("case_id", caseRow.id).maybeSingle();
    if (error) setHata(`Usul engeli kaydı okunamadı: ${error.message}`);
    else setKayit(data ?? null);
    setYukleniyor(false);
  }, [caseRow.id]);
  useEffect(() => { yukle(); }, [yukle]);

  async function kontrolEt() {
    setBusy(true);
    setHata(null);
    try {
      const { data, error } = await supabase.functions.invoke("usul-engeli", {
        body: { case_id: caseRow.id },
      });
      if (error) {
        // Gerçek sebep .context gövdesindedir; sessizce yutulmaz.
        let ham = String((error as any)?.message ?? "bilinmeyen hata");
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.text === "function") {
          try {
            const govde = await ctx.text();
            if (govde) {
              try { const j = JSON.parse(govde); ham = String(j?.error ?? j?.sebep ?? govde); }
              catch { ham = String(govde).slice(0, 400); }
            }
          } catch { /* gövde okunamadı */ }
        }
        throw new Error(ham);
      }
      if ((data as any)?.error) throw new Error(String((data as any).error));
      await yukle();
    } catch (e: any) {
      console.error("[usul-engeli] çağrı başarısız", e);
      setHata(`usul-engeli çağrısı başarısız: ${trErr(e?.message ?? "bilinmeyen hata")}`);
    } finally {
      setBusy(false);
    }
  }

  const engeller = Array.isArray(kayit?.engeller) ? kayit.engeller : [];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground leading-snug">
        Süreci aksatabilecek usul eksikleri — vekaletname, tüzel kişide temsil/imza yetkilisi,
        tebligata esas iletişim bilgisi ve yasal süre. Liste kanun yorumu içermez; yalnız hangi
        tarafta hangi alanın boş olduğunu sayar.
      </p>

      {hata && (
        <div className="text-sm rounded border border-destructive/40 bg-destructive/10 text-destructive p-3">
          {hata}
        </div>
      )}

      {yukleniyor ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Kayıt okunuyor…
        </div>
      ) : !kayit ? (
        <p className="text-sm text-muted-foreground italic">Henüz kontrol edilmedi.</p>
      ) : engeller.length === 0 ? (
        <p className="text-sm">Usule ilişkin eksik görünmüyor.</p>
      ) : (
        <ul className="space-y-3">
          {engeller.map((e: any, i: number) => (
            <li key={i} className="text-sm border-l-2 border-amber-300 pl-3 space-y-0.5">
              <div className="font-medium">{safeText(e?.baslik)}</div>
              <div className="text-muted-foreground leading-snug">{safeText(e?.tespit)}</div>
              {safeText(e?.referans) && (
                <div className="text-xs text-muted-foreground leading-snug">
                  Mevzuat referansı: {safeText(e.referans)}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Button size="sm" variant="outline" className={KART_DUGME} onClick={kontrolEt} disabled={busy}>
        {busy
          ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Kontrol ediliyor…</>
          : <><RefreshCw className="h-4 w-4 mr-1" /> {kayit ? "Yeniden kontrol et" : "Kontrol et"}</>}
      </Button>
    </div>
  );
}

/* ====== OTURUM HAZIRLIK FÖYLERİ (İBA 3.1) — yalnız arabulucu ===============
   Föy hazırlanır, onaylanır ve ONAYDAN SONRA elle gönderilir. Gönderim
   KENDİLİĞİNDEN OLMAZ: 'onaylandi' durumundaki föyde çıkan Gönder düğmesine
   arabulucu basar (constitution m.3 — insan kapısı). Gönderim tek tarafa gider
   (hazirlik-foyu-gonder); çift gönderim sunucuda kapalıdır.
   Onaylanan föyü ajan değiştiremez (fonksiyon 'onaylandi'/'gonderildi' satırın
   üzerine yazmaz). Düzenleme ve onay yalnız arabulucudadır (constitution m.3). */
type FoyBolum = { baslik: string; maddeler: string[] };
type FoySatiri = {
  id: string;
  session_id: string;
  party_id: string;
  bolumler: FoyBolum[] | null;
  durum: string;
  onay_zamani: string | null;
  gonderim_zamani: string | null;
};

/* Gönderim kaydı (public.foy_gonderim_kayitlari) — föy başına en son deneme.
   status: 'kabul_edildi' (e-posta servisi isteği KABUL ETTİ — teslim değildir) ·
   'hata' · 'suzgec_engelledi' (iletişim tercihi durdurdu). */
type GonderimKaydi = {
  foy_id: string;
  status: string;
  error_message: string | null;
  created_at: string;
};

const FOY_DURUM_ETIKET: Record<string, string> = {
  taslak: "taslak",
  onaylandi: "onaylandı",
  gonderildi: "gönderildi",
  iptal: "iptal",
};

function HazirlikFoyuPanel({ caseRow }: { caseRow: CaseRow }) {
  const [oturum, setOturum] = useState<any | null>(null);
  const [taraflar, setTaraflar] = useState<any[]>([]);
  const [foyler, setFoyler] = useState<Record<string, FoySatiri>>({});
  const [taslak, setTaslak] = useState<Record<string, string>>({});
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [kayitlar, setKayitlar] = useState<Record<string, GonderimKaydi>>({});

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    const [ot, tf] = await Promise.all([
      supabase.from("case_sessions")
        .select("id, scheduled_at, status, meeting_type, session_type")
        .eq("case_id", caseRow.id).order("scheduled_at", { ascending: true }),
      supabase.from("case_parties")
        .select("id, first_name, last_name, company_name, party_role")
        .eq("case_id", caseRow.id).order("created_at"),
    ]);
    if (ot.error) setHata(`Oturumlar okunamadı: ${ot.error.message}`);
    const simdi = Date.now();
    const uygun = ((ot.data ?? []) as any[])
      .filter((o) => String(o.status ?? "") !== "cancelled");
    const planli =
      uygun.filter((o) => o.scheduled_at && new Date(String(o.scheduled_at)).getTime() > simdi)[0]
      ?? [...uygun]
          .filter((o) => o.scheduled_at)
          .sort((a, b) => new Date(String(b.scheduled_at)).getTime() - new Date(String(a.scheduled_at)).getTime())[0]
      ?? uygun[0]
      ?? null;
    setOturum(planli);
    setTaraflar((tf.data ?? []) as any[]);

    if (planli) {
      const { data: fy, error: fErr } = await (supabase.from("oturum_hazirlik_foyleri" as any) as any)
        .select("id, session_id, party_id, bolumler, durum, onay_zamani, gonderim_zamani")
        .eq("session_id", planli.id);
      if (fErr) setHata(`Föyler okunamadı: ${fErr.message}`);
      const harita: Record<string, FoySatiri> = {};
      for (const f of ((fy ?? []) as any[])) harita[String(f.party_id)] = f as FoySatiri;
      setFoyler(harita);

      /* Gönderim kayıtları (foy_gonderim_kayitlari): föy başına EN SON deneme.
         'kabul_edildi' = e-posta servisi isteği kabul etti; TESLİM DEĞİLDİR. */
      const foyIdleri = Object.values(harita).map((x) => String(x.id));
      if (foyIdleri.length > 0) {
        const { data: kt } = await (supabase.from("foy_gonderim_kayitlari" as any) as any)
          .select("foy_id, status, error_message, created_at")
          .in("foy_id", foyIdleri)
          .order("created_at", { ascending: false });
        const sonKayitlar: Record<string, GonderimKaydi> = {};
        for (const k of ((kt ?? []) as any[])) {
          const anahtar = String(k.foy_id);
          if (!sonKayitlar[anahtar]) sonKayitlar[anahtar] = k as GonderimKaydi;
        }
        setKayitlar(sonKayitlar);
      } else {
        setKayitlar({});
      }
    } else {
      setFoyler({});
      setKayitlar({});
    }
    setYukleniyor(false);
  }, [caseRow.id]);
  useEffect(() => { yukle(); }, [yukle]);

  // Bölümler metne çevrilir: "## Başlık" satırı + altında maddeler.
  function foyMetni(f: FoySatiri): string {
    const b = Array.isArray(f.bolumler) ? f.bolumler : [];
    return b.map((x) => [x.baslik ? `## ${x.baslik}` : "##", ...(x.maddeler ?? [])].join("\n")).join("\n\n");
  }
  function metniBolumlereCevir(metin: string): FoyBolum[] {
    const bloklar = metin.split(/\n\s*\n/);
    const sonuc: FoyBolum[] = [];
    for (const blok of bloklar) {
      const satirlar = blok.split("\n").map((x) => x.trim()).filter(Boolean);
      if (satirlar.length === 0) continue;
      const ilk = satirlar[0];
      if (ilk.startsWith("##")) {
        sonuc.push({ baslik: ilk.replace(/^##\s*/, ""), maddeler: satirlar.slice(1) });
      } else {
        sonuc.push({ baslik: "", maddeler: satirlar });
      }
    }
    return sonuc;
  }

  async function foyKaydet(partyId: string) {
    const f = foyler[partyId];
    if (!f) return;
    setBusy(`kaydet:${partyId}`);
    setHata(null);
    const { error } = await (supabase.from("oturum_hazirlik_foyleri" as any) as any)
      .update({ bolumler: metniBolumlereCevir(taslak[partyId] ?? foyMetni(f)) })
      .eq("id", f.id);
    if (error) setHata(`Föy kaydedilemedi: ${error.message}`);
    else { setTaslak((o) => ({ ...o, [partyId]: "" })); await yukle(); }
    setBusy(null);
  }

  async function foyOnayla(partyId: string, sonraGonder = false) {
    const f = foyler[partyId];
    if (!f) return;
    setBusy(sonraGonder ? `onaygonder:${partyId}` : `onay:${partyId}`);
    setHata(null);
    const { data: kullanici } = await supabase.auth.getUser();
    const govde: Record<string, unknown> = {
      durum: "onaylandi",
      onay_zamani: new Date().toISOString(),
      onaylayan_user_id: kullanici?.user?.id ?? null,
    };
    // Düzenleme yapıldıysa onayla birlikte kaydedilir.
    if ((taslak[partyId] ?? "").trim()) govde.bolumler = metniBolumlereCevir(taslak[partyId]);
    const { error } = await (supabase.from("oturum_hazirlik_foyleri" as any) as any)
      .update(govde).eq("id", f.id);
    if (error) {
      setHata(`Föy onaylanamadı: ${error.message}`);
      setBusy(null);
      return;
    }
    setTaslak((o) => ({ ...o, [partyId]: "" }));
    if (sonraGonder) {
      /* Onay YAZILDI. Gönderim ayrı adımdır: başarısız olursa föy 'onaylandi'
         kalır ve hata ekranda görünür — onay geri alınmaz. */
      await foyGonder(partyId);
      return;   // busy'yi foyGonder kapatır, yeniden yükleme de oradadır.
    }
    await yukle();
    setBusy(null);
  }

  /* GÖNDER — yalnız onaylanmış föy için. Metin burada yeniden üretilmez; sunucu
     onaylanan `bolumler` alanını olduğu gibi tek tarafa yollar ve satırı
     'gonderildi' işaretler. Çift gönderim sunucuda kapalıdır. */
  async function foyGonder(partyId: string) {
    const f = foyler[partyId];
    if (!f) return;
    setBusy(`gonder:${partyId}`);
    setHata(null);
    setBilgi(null);
    try {
      const { data, error } = await supabase.functions.invoke("hazirlik-foyu-gonder", {
        body: { foy_id: f.id },
      });
      if (error) {
        // Gerçek sebep .context gövdesindedir; sessizce yutulmaz.
        let ham = String((error as any)?.message ?? "bilinmeyen hata");
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.text === "function") {
          try {
            const govde = await ctx.text();
            if (govde) {
              try { const j = JSON.parse(govde); ham = String(j?.error ?? j?.sebep ?? govde); }
              catch { ham = String(govde).slice(0, 400); }
            }
          } catch { /* gövde okunamadı */ }
        }
        throw new Error(ham);
      }
      if ((data as any)?.error) throw new Error(String((data as any).error));
      if ((data as any)?.gonderildi) {
        setBilgi(
          (data as any)?.durum_yazilamadi
            ? String((data as any).sebep ?? "E-posta gönderildi, durum güncellenemedi.")
            : "Föy tarafa e-postayla gönderildi.",
        );
      } else {
        // Süzgeç ya da "zaten gönderildi": durum değişmedi, sebebi ekranda durur.
        setBilgi(`Gönderilmedi — ${String((data as any)?.sebep ?? "sebep bildirilmedi")}`);
      }
      await yukle();
    } catch (e: any) {
      console.error("[hazirlik-foyu-gonder] çağrı başarısız", e);
      setHata(`Föy gönderilemedi: ${trErr(e?.message ?? "bilinmeyen hata")}`);
    } finally {
      setBusy(null);
    }
  }

  async function foyHazirla(partyId: string) {
    if (!oturum) return;
    setBusy(`hazirla:${partyId}`);
    setHata(null);
    try {
      const { data, error } = await supabase.functions.invoke("hazirlik-foyu", {
        body: { case_id: caseRow.id, session_id: oturum.id, party_id: partyId },
      });
      if (error) {
        // Gerçek sebep .context gövdesindedir; sessizce yutulmaz.
        let ham = String((error as any)?.message ?? "bilinmeyen hata");
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.text === "function") {
          try {
            const govde = await ctx.text();
            if (govde) {
              try { const j = JSON.parse(govde); ham = String(j?.error ?? j?.sebep ?? govde); }
              catch { ham = String(govde).slice(0, 400); }
            }
          } catch { /* gövde okunamadı */ }
        }
        throw new Error(ham);
      }
      if ((data as any)?.error) throw new Error(String((data as any).error));
      await yukle();
    } catch (e: any) {
      console.error("[hazirlik-foyu] çağrı başarısız", e);
      setHata(`hazirlik-foyu çağrısı başarısız: ${trErr(e?.message ?? "bilinmeyen hata")}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground leading-snug">
        Her taraf için AYRI föy hazırlanır ve yalnız o tarafın kendi verisi kullanılır; karşı tarafın
        beyanı, belgesi ve analizi föye girmez. Föy hukuki tavsiye içermez, sonuç tahmini yapmaz.
        Onaylandığında ajan tarafa gönderir. Önceden onaylanmış föylerde gönderim
        düğmesi yedek olarak durur.
      </p>

      {hata && (
        <div className="text-sm rounded border border-destructive/40 bg-destructive/10 text-destructive p-3">
          {hata}
        </div>
      )}

      {bilgi && (
        <div className="text-sm rounded border bg-muted/40 p-3">{bilgi}</div>
      )}

      {yukleniyor ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Föyler okunuyor…
        </div>
      ) : !oturum ? (
        <p className="text-sm">Planlanmış oturum yok — föy oturum planlandığında hazırlanır.</p>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground">
            Oturum: {oturum.scheduled_at
              ? new Date(String(oturum.scheduled_at)).toLocaleString("tr-TR")
              : "tarih henüz girilmedi (taslak oturum)"}
          </div>
          {taraflar.map((t, i) => {
            const f = foyler[String(t.id)];
            const durum = String(f?.durum ?? "");
            const kilitli = durum === "onaylandi" || durum === "gonderildi";
            const sonKayit = f ? kayitlar[String(f.id)] ?? null : null;
            const metin = taslak[String(t.id)] ?? (f ? foyMetni(f) : "");
            return (
              <div key={t.id} className="border rounded p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-medium text-sm">
                    {blindBidPartyName(t, i)} <span className="text-muted-foreground font-normal">({roleLabel(t.party_role)})</span>
                  </div>
                  {f ? (
                    <Badge variant={kilitli ? "default" : "outline"}>{FOY_DURUM_ETIKET[durum] ?? durum}</Badge>
                  ) : (
                    <Badge variant="outline">föy yok</Badge>
                  )}
                </div>

                {!f ? (
                  <p className="text-sm text-muted-foreground italic">
                    Bu taraf için föy henüz hazırlanmadı.
                  </p>
                ) : (
                  <>
                    <Textarea
                      rows={10}
                      className="text-xs font-mono"
                      value={metin}
                      disabled={kilitli}
                      onChange={(e) => setTaslak((o) => ({ ...o, [String(t.id)]: e.target.value }))}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      "## " ile başlayan satır bölüm başlığıdır; altındaki her satır bir maddedir.
                    </p>
                  </>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {f && !kilitli && (
                    <>
                      <Button size="sm" variant="secondary" className={KART_DUGME}
                        disabled={busy === `kaydet:${t.id}`} onClick={() => foyKaydet(String(t.id))}>
                        {busy === `kaydet:${t.id}` ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                        Kaydet
                      </Button>
                      {/* TEK DÜĞME (19.08): onay insan kapısıdır, gönderimi ajan
                          yapar. İkili düğme tekleşti; sunucudaki çift gönderim
                          kilidine dokunulmadı. */}
                      <Button size="sm" className={KART_DUGME}
                        disabled={busy === `onaygonder:${t.id}` || busy === `gonder:${t.id}`}
                        onClick={() => foyOnayla(String(t.id), true)}>
                        {busy === `onaygonder:${t.id}` || busy === `gonder:${t.id}`
                          ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          : <CheckCircle2 className="h-4 w-4 mr-1" />}
                        Onayla
                      </Button>
                    </>
                  )}
                  {(!f || durum === "taslak") && (
                    <div className="space-y-1">
                      <Button size="sm" variant="outline" className={KART_DUGME}
                        disabled={busy === `hazirla:${t.id}`} onClick={() => foyHazirla(String(t.id))}>
                        {busy === `hazirla:${t.id}`
                          ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Hazırlanıyor…</>
                          : <><Sparkles className="h-4 w-4 mr-1" /> {f ? "Yeniden hazırla" : "Föy hazırla"}</>}
                      </Button>
                      <UcretliIsaret metin="Bu tür için ilk hazırlıkta bir kez yapay zekâ çağrısı yapılabilir; sonraki föyler ücretsizdir." />
                    </div>
                  )}
                  {/* GÖNDER: yalnız onaylanmış föyde çıkar. Taslakta görünmez,
                      gönderildikten sonra yerini gönderim zamanı yazısı alır. */}
                  {f && durum === "onaylandi" && (
                    <Button size="sm" variant="secondary" className={KART_DUGME}
                      disabled={busy === `gonder:${t.id}`} onClick={() => foyGonder(String(t.id))}>
                      {busy === `gonder:${t.id}`
                        ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Gönderiliyor…</>
                        : <><Mail className="h-4 w-4 mr-1" /> Gönder</>}
                    </Button>
                  )}
                </div>

                {durum === "onaylandi" && (
                  <>
                    {sonKayit?.status === "hata" && (
                      <p className="text-[11px] text-destructive">
                        Gönderilemedi — {sonKayit.error_message || "sebep kaydedilmemiş"}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Onaylandı. Gönderimi ajan yapar; gitmediyse yandaki Gönder düğmesi yedektir.
                    </p>
                  </>
                )}
                {durum === "gonderildi" && (
                  sonKayit?.status === "hata" ? (
                    <p className="text-[11px] text-destructive">
                      Gönderilemedi — {sonKayit.error_message || "sebep kaydedilmemiş"}
                    </p>
                  ) : !sonKayit ? (
                    <p className="text-[11px] text-muted-foreground">
                      Gönderim kaydı bulunamadı — nöbetçi bunu arabulucu panosuna düşürür.
                    </p>
                  ) : (
                    /* "kabul edildi" = e-posta servisi isteği aldı. TESLİM DEĞİLDİR;
                       teslim/bounce takibi servis webhook'u ister (2. tur). */
                    <p className="text-[11px] text-muted-foreground">
                      Gönderildi{f?.gonderim_zamani
                        ? ` — ${new Date(String(f.gonderim_zamani)).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}`
                        : ""}
                      {sonKayit.status === "kabul_edildi" ? " · e-posta servisi isteği kabul etti" : ""}
                    </p>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ===================== PHASE 7 - GÖRÜŞME NOTLARI ===================== */

function Phase8Negotiation({ caseRow, userId, onDone }: { caseRow: CaseRow; userId: string; onDone: () => void }) {
  const [notesMeta, setNotesMeta] = useState<{ count: number; lastAt: string | null }>({ count: 0, lastAt: null });
  useEffect(() => {
    (async () => {
      const [{ count }, { data: last }] = await Promise.all([
        supabase.from("case_notes").select("id", { count: "exact", head: true }).eq("case_id", caseRow.id).eq("phase", 7),
        supabase.from("case_notes").select("created_at").eq("case_id", caseRow.id).eq("phase", 7).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setNotesMeta({ count: count ?? 0, lastAt: (last as any)?.created_at ?? null });
    })();
  }, [caseRow.id]);

  return (
    <div className="space-y-4">
      <PhaseHero
        label="AŞAMA 6 — GÖRÜŞME NOTLARI"
        metrics={[
          { label: "Görüşme Notu", value: notesMeta.count },
          { label: "Son Not", value: notesMeta.lastAt ? formatPhaseRelative(notesMeta.lastAt) : null },
        ]}
      />
    <motion.div variants={containerVariants} initial="hidden" animate="show">
    <Card className="p-6 space-y-4">
      {/* Aşama başlığı üst şeritte (PhaseHero); burada tekrarlanmaz. */}
      <motion.div variants={itemVariants}>
        <MeetingNotesPanel caseId={caseRow.id} caseSummary={caseRow.title ?? ""} />
      </motion.div>
      <div className="flex justify-end">
        <Button onClick={onDone}>Kapanışa Geç →</Button>
      </div>
    </Card>
    </motion.div>
    </div>
  );
}

/* ===================== PHASE 9 - CLOSING ===================== */

type PaymentScenario = {
  key: "anlasma" | "bakanlik" | "ihtiyari_anlasamama" | "pending" | "undetermined";
  label: string;
  badgeClass: string;
};

function computePaymentScenario(caseRow: CaseRow): PaymentScenario {
  const outcome = caseRow.status;
  if (outcome === "agreed") {
    return { key: "anlasma", label: "Taraflar öder", badgeClass: "bg-emerald-600 text-white border-transparent" };
  }
  if (outcome === "failed") {
    if (caseRow.mediation_type === "dava_sarti") {
      return {
        key: "bakanlik",
        label: "Bakanlık ödemesi (2 saatlik tarife) — taraflardan tahsilat yok",
        badgeClass: "bg-blue-600 text-white border-transparent",
      };
    }
    if (caseRow.mediation_type === "ihtiyari") {
      return {
        key: "ihtiyari_anlasamama",
        label: "Taraflar öder (2 saatlik ücret)",
        badgeClass: "bg-amber-600 text-white border-transparent",
      };
    }
    return {
      key: "undetermined",
      label: "Anlaşamama — arabuluculuk türü belirlenmemiş, senaryo netleştirilemedi",
      badgeClass: "bg-destructive text-destructive-foreground border-transparent",
    };
  }
  return {
    key: "pending",
    label: "Dosya kapanınca senaryo belirlenecek",
    badgeClass: "bg-muted text-muted-foreground border-transparent",
  };
}

type PartyOption = { id: string; name: string };
type CasePaymentRow = {
  id: string; case_id: string; payment_date: string; payer_party_id: string | null;
  payer_label: string; kind: "ucret" | "masraf"; description: string | null;
  amount: number; status: "bekliyor" | "odendi"; receipt_no: string | null;
  paid_at: string | null; created_at: string;
};
type StagedRow = { payer_party_id: string | null; payer_label: string; kind: "ucret"; description: string; amount: number };

function PaymentAccountingPanel({ caseRow }: { caseRow: CaseRow }) {
  const [disputeValue, setDisputeValue] = useState<string>("");
  const [sessionCount, setSessionCount] = useState<string>("1");
  const [hoursPerSession, setHoursPerSession] = useState<string>("2");
  const [feeType, setFeeType] = useState<"anlasma" | "anlasamama" | "ihtiyari">("anlasma");
  const [arabulucuSayisi, setArabulucuSayisi] = useState<1 | 2>(1);
  const [partyCount, setPartyCount] = useState<2 | 3 | 6 | 11>(2);
  const [isSeri, setIsSeri] = useState(false);
  const [seriDosyaSayisi, setSeriDosyaSayisi] = useState<string>("10");
  const [seriTur, setSeriTur] = useState<"ticari" | "diger">("diger");
  const [feeBusy, setFeeBusy] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeResult, setFeeResult] = useState<null | {
    brut_ucret: number; kdv: number; gv_stopaj: number;
    net_ucret: number; kdv_tevkifati: number; tahsil_edilen_kdv: number; net_tahsilat: number;
    genel_toplam: number; tarife_yili: number; tarife_maddesi: string; aciklama: string;
    breakdown?: Array<{ dilim: string; oran: string; tutar: number }>;
    hesaplama_turu?: string;
    // legacy fields still populated by edge fn for db persistence
    baz_ucret: number; ek_oturum_ucreti: number; toplam_ucret: number;
  }>(null);
  const [existingFeeId, setExistingFeeId] = useState<string | null>(null);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  // profiles.vergi_dairesi / profiles.vkn_tckn: generated types'ta henüz yok
  // (canlıda migration'sız elle eklendi) — bu yüzden ilgili select/update'lerde
  // "as any" cast kullanılıyor.
  const { user: currentUser, isAdmin: isRoleAdmin } = useAuth();
  // Yalnızca UX kısıtı — gerçek güvenlik sınırı case_payments RLS'inde
  // (is_case_mediator OR admin); dosya sahibi burada RLS'te ayrı bir kural
  // olmadığı için mediator/admin değilse update/delete zaten reddedilir.
  const canManagePayments = !!currentUser && (
    currentUser.id === caseRow.assigned_mediator_id ||
    currentUser.id === caseRow.user_id ||
    isRoleAdmin
  );
  const [mediatorTaxOffice, setMediatorTaxOffice] = useState<string>("");
  const [mediatorTaxId, setMediatorTaxId] = useState<string>("");
  const [profileTaxSaveBusy, setProfileTaxSaveBusy] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    (async () => {
      const { data } = await supabase
        .from("profiles" as any)
        .select("vergi_dairesi, vkn_tckn")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      if (data) {
        setMediatorTaxOffice(((data as any).vergi_dairesi as string) || "");
        setMediatorTaxId(((data as any).vkn_tckn as string) || "");
      }
    })();
  }, [currentUser?.id]);

  async function saveMediatorTaxInfoToProfile() {
    if (!currentUser?.id) return;
    setProfileTaxSaveBusy(true);
    try {
      const { error } = await supabase
        .from("profiles" as any)
        .update({
          vergi_dairesi: mediatorTaxOffice.trim() || null,
          vkn_tckn: mediatorTaxId.trim() || null,
        } as any)
        .eq("user_id", currentUser.id);
      if (error) throw error;
      toast({ title: "Profile kaydedildi" });
    } catch (e: any) {
      toast({ title: "Kaydedilemedi", description: trErr(e.message), variant: "destructive" });
    } finally {
      setProfileTaxSaveBusy(false);
    }
  }

  // --- Faz 4b: Ödeme senaryosu, ücret sözleşmesi, ödeme defteri ---
  const scenario = useMemo(() => computePaymentScenario(caseRow), [caseRow.status, caseRow.mediation_type]);

  const [ucretSozlesmesi, setUcretSozlesmesi] = useState(false);
  const [kararlastirilanUcret, setKararlastirilanUcret] = useState<string>("");
  const [contractBusy, setContractBusy] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);

  const [parties, setParties] = useState<PartyOption[]>([]);
  const [payments, setPayments] = useState<CasePaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const [rowDate, setRowDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [rowPayerId, setRowPayerId] = useState<string>("bakanlik");
  const [rowKind, setRowKind] = useState<"ucret" | "masraf">("ucret");
  const [rowDesc, setRowDesc] = useState<string>("");
  const [rowAmount, setRowAmount] = useState<string>("");
  const [rowBusy, setRowBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const [markingId, setMarkingId] = useState<string | null>(null);
  const [receiptDraft, setReceiptDraft] = useState<string>("");
  const [markBusy, setMarkBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    payment_date: string; payer_party_id: string; kind: "ucret" | "masraf";
    description: string; amount: string; status: "bekliyor" | "odendi"; receipt_no: string;
  } | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  // status="odendi" bir satırda tutar/tür değişikliği istenirse önce bu dolar,
  // AlertDialog onayından sonra performSaveEdit gerçek kaydı yapar.
  const [sensitiveEditConfirm, setSensitiveEditConfirm] = useState<CasePaymentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CasePaymentRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [stagedRows, setStagedRows] = useState<StagedRow[]>([]);
  const [stageBusy, setStageBusy] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);

  const parseAmount = (s: string) => Number(s.replace(/[^\d.,-]/g, "").replace(",", ".")) || 0;
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    const { data, error } = await supabase
      .from("case_payments" as any)
      .select("*")
      .eq("case_id", caseRow.id)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error) setPayments(((data ?? []) as any[]) as CasePaymentRow[]);
    setPaymentsLoading(false);
  }, [caseRow.id]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("case_parties")
        .select("id, first_name, last_name, company_name, party_type")
        .eq("case_id", caseRow.id);
      setParties((data ?? []).map((p: any) => ({
        id: p.id,
        name: p.party_type === "corporate" ? (p.company_name || "-") : `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "-",
      })));
    })();
  }, [caseRow.id]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cases" as any)
        .select("ucret_sozlesmesi, kararlastirilan_ucret")
        .eq("id", caseRow.id)
        .maybeSingle();
      if (data) {
        setUcretSozlesmesi(!!(data as any).ucret_sozlesmesi);
        setKararlastirilanUcret((data as any).kararlastirilan_ucret != null ? String((data as any).kararlastirilan_ucret) : "");
      }
    })();
  }, [caseRow.id]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("case_fees" as any)
        .select("id, ai_breakdown")
        .eq("case_id", caseRow.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const r = (data as any)?.ai_breakdown;
      if (r) {
        setFeeResult(r);
        setExistingFeeId((data as any).id ?? null);
      }
    })();
  }, [caseRow.id]);

  const taban = feeResult?.net_tahsilat ?? null;
  const existingUcretSum = useMemo(
    () => round2(payments.filter((p) => p.kind === "ucret").reduce((s, p) => s + Number(p.amount || 0), 0)),
    [payments]
  );
  // 16.08: "makbuz bekliyor" = ödenmiş sayılan (Ödendi işaretli ya da ödeme anı yazılı)
  // ama makbuz numarası boş olan satır. Yalnız GÖSTERİM içindir; hiçbir kayıt
  // değiştirilmez, yeni yazma yolu açılmaz.
  const makbuzBekliyorMu = (p: any) =>
    (String(p?.status ?? "") === "odendi" || !!p?.paid_at) && !String(p?.receipt_no ?? "").trim();
  const makbuzBekleyenSayisi = useMemo(
    () => payments.filter((p) => makbuzBekliyorMu(p)).length,
    [payments]
  );
  const kararlastirilanUcretNum = ucretSozlesmesi ? parseAmount(kararlastirilanUcret) : 0;
  const effectiveBasis = ucretSozlesmesi && kararlastirilanUcretNum > 0 ? kararlastirilanUcretNum : taban;

  async function saveUcretSozlesmesi() {
    setContractError(null);
    const val = ucretSozlesmesi ? parseAmount(kararlastirilanUcret) : 0;
    if (ucretSozlesmesi && val > 0 && taban != null && val < taban) {
      setContractError(`AAÜT tabanının altına inilemez (taban: ${fmtTL(taban)})`);
      return;
    }
    setContractBusy(true);
    try {
      const { error } = await supabase.from("cases" as any).update({
        ucret_sozlesmesi: ucretSozlesmesi,
        kararlastirilan_ucret: ucretSozlesmesi && val > 0 ? val : null,
      } as any).eq("id", caseRow.id);
      if (error) throw error;
      toast({ title: "Ücret sözleşmesi kaydedildi" });
    } catch (e: any) {
      toast({ title: "Kaydedilemedi", description: trErr(e.message), variant: "destructive" });
    } finally {
      setContractBusy(false);
    }
  }

  async function addPaymentRow() {
    setRowError(null);
    const amt = round2(parseAmount(rowAmount));
    if (!amt || amt <= 0) {
      setRowError("Geçerli bir tutar girin.");
      return;
    }
    if (rowKind === "ucret" && taban != null && round2(existingUcretSum + amt) < taban) {
      setRowError(`AAÜT tabanının altına inilemez (taban: ${fmtTL(taban)})`);
      return;
    }
    const payerLabel = rowPayerId === "bakanlik" ? "Bakanlık" : (parties.find((p) => p.id === rowPayerId)?.name ?? "-");
    setRowBusy(true);
    try {
      const { error } = await supabase.from("case_payments" as any).insert({
        case_id: caseRow.id,
        payment_date: rowDate,
        payer_party_id: rowPayerId === "bakanlik" ? null : rowPayerId,
        payer_label: payerLabel,
        kind: rowKind,
        description: rowDesc.trim() || null,
        amount: amt,
        status: "bekliyor",
      } as any);
      if (error) throw error;
      setRowDesc(""); setRowAmount("");
      await loadPayments();
      toast({ title: "Kayıt eklendi" });
    } catch (e: any) {
      setRowError(trErr(e.message));
    } finally {
      setRowBusy(false);
    }
  }

  async function confirmMarkPaid(id: string) {
    setMarkBusy(true);
    try {
      const { error } = await supabase.from("case_payments" as any).update({
        status: "odendi",
        paid_at: new Date().toISOString(),
        receipt_no: receiptDraft.trim() || null,
      } as any).eq("id", id);
      if (error) throw error;
      setMarkingId(null); setReceiptDraft("");
      await loadPayments();
      toast({ title: "Ödendi olarak işaretlendi" });
    } catch (e: any) {
      toast({ title: "Hata", description: trErr(e.message), variant: "destructive" });
    } finally {
      setMarkBusy(false);
    }
  }

  // addPaymentRow'daki AAÜT taban guard'ının aynısı — düzenlenen satır kendi eski
  // tutarıyla toplama dahil edilmez, guard yeni tutar/tür varsayımıyla hesaplanır.
  function ucretGuardError(excludeId: string, newKind: "ucret" | "masraf", newAmount: number): string | null {
    const otherUcretSum = round2(
      payments.filter((p) => p.id !== excludeId && p.kind === "ucret").reduce((s, p) => s + Number(p.amount || 0), 0)
    );
    const newTotal = round2(otherUcretSum + (newKind === "ucret" ? newAmount : 0));
    if (taban != null && newTotal < taban) {
      return `AAÜT tabanının altına inilemez (taban: ${fmtTL(taban)})`;
    }
    return null;
  }

  function startEditRow(p: CasePaymentRow) {
    setEditingId(p.id);
    setEditForm({
      payment_date: p.payment_date,
      payer_party_id: p.payer_party_id ?? "bakanlik",
      kind: p.kind,
      description: p.description ?? "",
      amount: String(p.amount),
      status: p.status,
      receipt_no: p.receipt_no ?? "",
    });
    setEditError(null);
  }

  function cancelEditRow() {
    setEditingId(null);
    setEditForm(null);
    setEditError(null);
  }

  async function performSaveEdit(original: CasePaymentRow) {
    if (!editForm) return;
    const amt = round2(parseAmount(editForm.amount));
    const payerLabel = editForm.payer_party_id === "bakanlik"
      ? "Bakanlık"
      : (parties.find((pp) => pp.id === editForm.payer_party_id)?.name ?? original.payer_label);
    setEditBusy(true);
    try {
      const { error } = await supabase.from("case_payments" as any).update({
        payment_date: editForm.payment_date,
        payer_party_id: editForm.payer_party_id === "bakanlik" ? null : editForm.payer_party_id,
        payer_label: payerLabel,
        kind: editForm.kind,
        description: editForm.description.trim() || null,
        amount: amt,
        status: editForm.status,
        receipt_no: editForm.receipt_no.trim() || null,
        paid_at: editForm.status === "odendi" ? (original.paid_at ?? new Date().toISOString()) : null,
      } as any).eq("id", original.id);
      if (error) throw error;
      setEditingId(null);
      setEditForm(null);
      setSensitiveEditConfirm(null);
      await loadPayments();
      toast({ title: "Kayıt güncellendi" });
    } catch (e: any) {
      setEditError(trErr(e.message));
    } finally {
      setEditBusy(false);
    }
  }

  function requestSaveEdit(original: CasePaymentRow) {
    if (!editForm) return;
    setEditError(null);
    const amt = round2(parseAmount(editForm.amount));
    if (!amt || amt <= 0) {
      setEditError("Geçerli bir tutar girin.");
      return;
    }
    const guardErr = ucretGuardError(original.id, editForm.kind, amt);
    if (guardErr) {
      setEditError(guardErr);
      return;
    }
    const sensitiveChange = original.status === "odendi"
      && (round2(Number(original.amount)) !== amt || original.kind !== editForm.kind);
    if (sensitiveChange) {
      setSensitiveEditConfirm(original);
      return;
    }
    performSaveEdit(original);
  }

  async function deletePaymentRow() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const { error } = await supabase.from("case_payments" as any).delete().eq("id", deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      await loadPayments();
      toast({ title: "Kayıt silindi" });
    } catch (e: any) {
      toast({ title: "Silinemedi", description: trErr(e.message), variant: "destructive" });
    } finally {
      setDeleteBusy(false);
    }
  }

  function transferScenarioToLedger() {
    setStageError(null);
    if (!effectiveBasis || effectiveBasis <= 0) {
      setStageError("Önce ücret hesaplayın veya kararlaştırılan ücreti girin.");
      return;
    }
    if (scenario.key === "bakanlik") {
      setStagedRows([{
        payer_party_id: null, payer_label: "Bakanlık", kind: "ucret",
        description: "Anlaşamama - Bakanlık ödemesi (2 saatlik tarife)",
        amount: effectiveBasis,
      }]);
      return;
    }
    if (scenario.key === "anlasma" || scenario.key === "ihtiyari_anlasamama") {
      if (parties.length === 0) {
        setStageError("Dosyada kayıtlı taraf bulunamadı.");
        return;
      }
      const share = round2(Math.floor((effectiveBasis / parties.length) * 100) / 100);
      const rows: StagedRow[] = parties.map((p) => ({
        payer_party_id: p.id,
        payer_label: p.name,
        kind: "ucret",
        description: scenario.key === "anlasma" ? "Anlaşma ücreti - dosya payı" : "Anlaşamama (ihtiyari) - ücret payı",
        amount: share,
      }));
      const remainder = round2(effectiveBasis - round2(share * parties.length));
      if (remainder !== 0 && rows.length > 0) {
        rows[rows.length - 1] = { ...rows[rows.length - 1], amount: round2(rows[rows.length - 1].amount + remainder) };
      }
      setStagedRows(rows);
      return;
    }
    setStageError("Dosya henüz kapanmadı veya arabuluculuk türü belirlenmemiş; senaryo netleşmeden aktarım yapılamaz.");
  }

  function updateStagedRow(index: number, patch: Partial<StagedRow>) {
    setStagedRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  // "Tümünü buna yükle" kısayolu — tek satıra effectiveBasis'i tam verip diğerlerini
  // sıfırlar; sadece anlasma/ihtiyari_anlasamama senaryolarında anlamlı (bakanlik zaten tek satır).
  function assignFullAmountToRow(index: number) {
    setStagedRows((rows) => rows.map((r, i) => ({ ...r, amount: i === index ? effectiveBasis : 0 })));
  }

  async function saveStagedRows() {
    setStageError(null);
    const ucretTotal = round2(stagedRows.filter((r) => r.kind === "ucret").reduce((s, r) => s + Number(r.amount || 0), 0));
    if (taban != null && round2(existingUcretSum + ucretTotal) < taban) {
      setStageError(`AAÜT tabanının altına inilemez (taban: ${fmtTL(taban)})`);
      return;
    }
    setStageBusy(true);
    try {
      const rows = stagedRows.map((r) => ({
        case_id: caseRow.id,
        payment_date: new Date().toISOString().slice(0, 10),
        payer_party_id: r.payer_party_id,
        payer_label: r.payer_label,
        kind: r.kind,
        description: r.description || null,
        amount: round2(r.amount),
        status: "bekliyor",
      }));
      const { error } = await supabase.from("case_payments" as any).insert(rows as any);
      if (error) throw error;
      setStagedRows([]);
      await loadPayments();
      toast({ title: "Senaryo deftere aktarıldı" });
    } catch (e: any) {
      setStageError(trErr(e.message));
    } finally {
      setStageBusy(false);
    }
  }

  const fmtTL = (n: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);

  async function calculateFee() {
    setFeeError(null); setFeeResult(null); setExistingFeeId(null);
    const dv = Number(disputeValue.replace(/[^\d.,-]/g, "").replace(",", ".")) || 0;
    const sc = Math.max(1, Number(sessionCount) || 1);
    const hps = Math.max(1, Number(hoursPerSession) || 1);
    if (!isSeri && feeType === "anlasma" && (!dv || dv <= 0)) {
      toast({ title: "Uyuşmazlık değeri gerekli", variant: "destructive" });
      return;
    }
    setFeeBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-mediation-fee", {
        body: {
          dispute_value: dv,
          session_count: sc,
          hours_per_session: hps,
          fee_type: feeType,
          dispute_type: isSeri ? seriTur : (caseRow.dispute_type || ""),
          arabulucu_sayisi: arabulucuSayisi,
          party_count: partyCount,
          is_seri: isSeri,
          seri_dosya_sayisi: isSeri ? Math.max(1, Number(seriDosyaSayisi) || 0) : 0,
        },
      });
      if (error) {
        let msg = error.message || "Sunucu hatası";
        try {
          const ctx = (error as any).context;
          if (ctx?.body) {
            const b = typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body;
            if (b?.message) msg = b.message;
          }
        } catch {}
        setFeeError(msg);
        return;
      }
      if ((data as any)?.error) {
        setFeeError((data as any).message || (data as any).error);
        return;
      }
      const r = data as any;
      setFeeResult(r);
      const { data: inserted, error: insErr } = await supabase.from("case_fees" as any).insert({
        case_id: caseRow.id,
        fee_type: feeType,
        dispute_value: dv,
        session_count: sc,
        calculated_fee: r.brut_ucret ?? r.toplam_ucret,
        vat_amount: r.kdv,
        total_fee: r.net_tahsilat ?? r.genel_toplam,
        tarife_yili: r.tarife_yili ?? 2026,
        tarife_maddesi: r.tarife_maddesi,
        ai_breakdown: r,
      } as any).select("id").maybeSingle();
      if (insErr) throw insErr;
      setExistingFeeId((inserted as any)?.id ?? null);
      toast({ title: "Ücret hesaplandı" });
    } catch (e: any) {
      setFeeError(trErr(e.message || "Hesaplama başarısız"));
    } finally {
      setFeeBusy(false);
    }
  }

  async function createInvoice() {
    if (!feeResult) return;
    setInvoiceBusy(true);
    try {
      const [{ data: parties }, { data: profile }] = await Promise.all([
        supabase.from("case_parties")
          .select("first_name, last_name, company_name, party_type, party_role, tc_kimlik, tax_number, tax_office, authorized_person, address")
          .eq("case_id", caseRow.id),
        caseRow.assigned_mediator_id
          ? supabase.from("profiles").select("full_name").eq("user_id", caseRow.assigned_mediator_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      const partyList = (parties ?? []).map((p: any) => {
        const isCorp = p.party_type === "corporate";
        return {
          name: isCorp ? (p.company_name || "-") : `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "-",
          typeLabel: isCorp ? "Kurumsal" : "Bireysel",
          roleLabel: p.party_role ? roleLabel(p.party_role) : null,
          tcKimlik: isCorp ? null : (p.tc_kimlik || null),
          taxNumber: isCorp ? (p.tax_number || null) : null,
          taxOffice: isCorp ? (p.tax_office || null) : null,
          authorizedPerson: isCorp ? (p.authorized_person || null) : null,
          address: p.address || null,
        };
      });

      const paymentList = payments.map((p) => ({
        payerLabel: p.payer_label,
        amount: Number(p.amount),
        status: p.status,
        receiptNo: p.receipt_no,
      }));

      const { downloadInvoicePdf } = await import("@/lib/invoice-pdf");
      await downloadInvoicePdf({
        applicationNo: caseRow.application_no || "",
        disputeSubject: caseRow.title || caseRow.dispute_type || "-",
        mediatorName: (profile as any)?.full_name || "-",
        mediatorRegistryNo: null,
        mediatorTaxOffice: mediatorTaxOffice.trim() || null,
        mediatorTaxId: mediatorTaxId.trim() || null,
        parties: partyList,
        feeType,
        disputeValue: Number(disputeValue.replace(/[^\d.,-]/g, "").replace(",", ".")) || 0,
        sessionCount: Math.max(1, Number(sessionCount) || 1),
        brutUcret: feeResult.brut_ucret,
        kdv: feeResult.kdv,
        gvStopaj: feeResult.gv_stopaj,
        netUcret: feeResult.net_ucret,
        kdvTevkifati: feeResult.kdv_tevkifati,
        tahsilEdilenKdv: feeResult.tahsil_edilen_kdv,
        netTahsilat: feeResult.net_tahsilat,
        tarifeYili: feeResult.tarife_yili,
        tarifeMaddesi: feeResult.tarife_maddesi,
        dilimBreakdown: feeResult.breakdown,
        payments: paymentList,
        createdAt: new Date(),
      });

      if (existingFeeId) {
        // Makbuz indirildi; bayrak yazılamazsa indirme geri alınmaz ama
        // "makbuz üretildi" izi kaybolur — arabulucu bunu bilmeli.
        const { error: bayrakErr } = await supabase.from("case_fees" as any).update({ invoice_generated: true } as any).eq("id", existingFeeId);
        if (bayrakErr) {
          toast({ title: "Makbuz kaydı işaretlenemedi", description: trErr(bayrakErr.message), variant: "destructive" });
        }
      }
      toast({ title: "Makbuz taslağı indirildi" });
    } catch (e: any) {
      toast({ title: "Makbuz taslağı oluşturulamadı", description: trErr(e.message), variant: "destructive" });
    } finally {
      setInvoiceBusy(false);
    }
  }

  const PartyBtn = ({ v, label }: { v: 2 | 3 | 6 | 11; label: string }) => (
    <Button type="button" size="sm" variant={partyCount === v ? "default" : "outline"} onClick={() => setPartyCount(v)}>{label}</Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={`whitespace-normal text-left h-auto py-1 px-2 ${scenario.badgeClass}`}>{scenario.label}</Badge>
      </div>

      <p className="text-sm text-muted-foreground">Aktif AAÜT tarifesine göre deterministik hesaplama.</p>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label>Sonuç Türü</Label>
          <Select value={feeType} onValueChange={(v) => setFeeType(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="anlasma">Anlaşma</SelectItem>
              <SelectItem value="anlasamama">Anlaşamama</SelectItem>
              <SelectItem value="ihtiyari">İhtiyari</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Arabulucu Sayısı</Label>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={arabulucuSayisi === 1 ? "default" : "outline"} onClick={() => setArabulucuSayisi(1)}>1 Arabulucu</Button>
            <Button type="button" size="sm" variant={arabulucuSayisi === 2 ? "default" : "outline"} onClick={() => setArabulucuSayisi(2)}>Birden Fazla</Button>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Taraf Sayısı</Label>
          <div className="flex gap-2 flex-wrap">
            <PartyBtn v={2} label="2" /><PartyBtn v={3} label="3–5" /><PartyBtn v={6} label="6–10" /><PartyBtn v={11} label="11+" />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label>Uyuşmazlık Değeri (TL)</Label>
          <Input type="text" inputMode="decimal" placeholder="Anlaşma için gerekli"
            value={disputeValue} onChange={(e) => setDisputeValue(e.target.value)} disabled={feeBusy || isSeri} />
        </div>
        <div className="space-y-1">
          <Label>Oturum Sayısı</Label>
          <Input type="number" min={1} step={1} value={sessionCount}
            onChange={(e) => setSessionCount(e.target.value)} disabled={feeBusy} />
        </div>
        <div className="space-y-1">
          <Label>Oturum Başına Saat</Label>
          <Input type="number" min={1} step={1} value={hoursPerSession}
            onChange={(e) => setHoursPerSession(e.target.value)} disabled={feeBusy} />
        </div>
      </div>

      <div className="border rounded p-3 bg-muted/20 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isSeri} onChange={(e) => setIsSeri(e.target.checked)} />
          <span className="font-medium text-sm">Seri Uyuşmazlık</span>
        </label>
        <p className="text-xs text-muted-foreground">Aynı taraflardan biri ortak olmalı ve aynı ay içinde en az 10 başvuru gereklidir.</p>
        {isSeri && (
          <div className="grid gap-3 md:grid-cols-2 pt-2">
            <div className="space-y-1">
              <Label>Dosya Sayısı</Label>
              <Input type="number" min={10} step={1} value={seriDosyaSayisi} onChange={(e) => setSeriDosyaSayisi(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Tür</Label>
              <Select value={seriTur} onValueChange={(v) => setSeriTur(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ticari">Ticari</SelectItem>
                  <SelectItem value="diger">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
        <div className="space-y-1">
          <Label>Vergi Dairesi (opsiyonel — makbuza basılır)</Label>
          <Input value={mediatorTaxOffice} onChange={(e) => setMediatorTaxOffice(e.target.value)} disabled={invoiceBusy} />
        </div>
        <div className="space-y-1">
          <Label>VKN/TCKN (opsiyonel — makbuza basılır)</Label>
          <Input value={mediatorTaxId} onChange={(e) => setMediatorTaxId(e.target.value)} disabled={invoiceBusy} />
        </div>
        <Button type="button" size="sm" variant="outline" onClick={saveMediatorTaxInfoToProfile} disabled={profileTaxSaveBusy || !currentUser?.id}>
          {profileTaxSaveBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Profilime Kaydet
        </Button>
      </div>

      <div className="flex gap-2">
        <Button onClick={calculateFee} disabled={feeBusy}>
          {feeBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Ücret Hesapla
        </Button>
        <Button variant="outline" onClick={createInvoice} disabled={!feeResult || invoiceBusy}>
          {invoiceBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
          Makbuz Taslağı Oluştur
        </Button>
      </div>

      {feeError && (
        <div className="p-3 rounded border border-amber-300 bg-amber-50 text-amber-900 text-sm flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Hesaplama yapılamadı</div>
              <div>{feeError}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setFeeError(null)}>Geri Dön</Button>
            <Button size="sm" onClick={calculateFee}>Tekrar Dene</Button>
          </div>
        </div>
      )}

      {feeResult && (
        <div className="rounded border overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b"><td className="px-3 py-2 text-muted-foreground">Brüt Ücret</td><td className="px-3 py-2 text-right font-medium">{fmtTL(feeResult.brut_ucret)}</td></tr>
              <tr className="border-b"><td className="px-3 py-2 text-muted-foreground">KDV (%20)</td><td className="px-3 py-2 text-right">{fmtTL(feeResult.kdv)}</td></tr>
              <tr className="border-b"><td className="px-3 py-2 text-muted-foreground">GV Stopaj (%20)</td><td className="px-3 py-2 text-right">-{fmtTL(feeResult.gv_stopaj)}</td></tr>
              <tr className="border-b bg-muted/30"><td className="px-3 py-2 font-semibold">Net Ücret</td><td className="px-3 py-2 text-right font-semibold">{fmtTL(feeResult.net_ucret)}</td></tr>
              <tr className="border-b"><td className="px-3 py-2 text-muted-foreground">KDV Tevkifatı</td><td className="px-3 py-2 text-right">{fmtTL(feeResult.kdv_tevkifati)}</td></tr>
              <tr className="border-b"><td className="px-3 py-2 text-muted-foreground">Tahsil Edilen KDV</td><td className="px-3 py-2 text-right">{fmtTL(feeResult.tahsil_edilen_kdv)}</td></tr>
              <tr className="bg-primary text-primary-foreground"><td className="px-3 py-3 font-bold">NET TAHSİLAT</td><td className="px-3 py-3 text-right font-bold">{fmtTL(feeResult.net_tahsilat)}</td></tr>
            </tbody>
          </table>
          <div className="p-3 text-xs text-muted-foreground border-t bg-muted/20 space-y-1">
            <div><span className="font-medium">Tarife: </span>{feeResult.tarife_yili} Yılı Arabuluculuk Asgari Ücret Tarifesi</div>
            {feeResult.tarife_maddesi && <div><span className="font-medium">Tarife Maddesi: </span>{feeResult.tarife_maddesi}</div>}
            {feeResult.aciklama && <div>{feeResult.aciklama}</div>}
            {feeResult.breakdown && feeResult.breakdown.length > 0 && (
              <div className="pt-2">
                <div className="font-medium mb-1">Dilim Dökümü:</div>
                <ul className="space-y-0.5">
                  {feeResult.breakdown.map((b, i) => (
                    <li key={i}>• {b.dilim} — {b.oran} → {fmtTL(b.tutar)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="border rounded p-3 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={ucretSozlesmesi} onChange={(e) => setUcretSozlesmesi(e.target.checked)} />
          <span className="font-medium text-sm">Ücret Sözleşmesi</span>
        </label>
        {ucretSozlesmesi && (
          <div className="grid gap-3 md:grid-cols-2 pt-1">
            <div className="space-y-1">
              <Label>Kararlaştırılan Ücret (TL)</Label>
              <Input type="text" inputMode="decimal" value={kararlastirilanUcret}
                onChange={(e) => setKararlastirilanUcret(e.target.value)} disabled={contractBusy} />
            </div>
          </div>
        )}
        {taban != null && (
          <p className="text-xs text-muted-foreground">Taban (hesaplanan tarife — NET TAHSİLAT): {fmtTL(taban)}</p>
        )}
        {contractError && (
          <div className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" />{contractError}</div>
        )}
        <Button size="sm" variant="outline" onClick={saveUcretSozlesmesi} disabled={contractBusy}>
          {contractBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Sözleşmeyi Kaydet
        </Button>
      </div>

      <div className="border rounded p-3 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="font-medium text-sm">Senaryoyu Deftere Aktar</h4>
          <Button size="sm" onClick={transferScenarioToLedger} disabled={stageBusy}>
            Senaryoyu Deftere Aktar
          </Button>
        </div>
        {stageError && (
          <div className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" />{stageError}</div>
        )}
        {stagedRows.length > 0 && (
          <div className="space-y-2">
            <div className="rounded border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2 py-1 text-left">Ödeyen</th>
                    <th className="px-2 py-1 text-left">Açıklama</th>
                    <th className="px-2 py-1 text-right">Tutar (TL)</th>
                  </tr>
                </thead>
                <tbody>
                  {stagedRows.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">{r.payer_label}</td>
                      <td className="px-2 py-1">
                        <Input value={r.description} onChange={(e) => updateStagedRow(i, { description: e.target.value })} className="h-8" />
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-center justify-end gap-1.5">
                          <Input type="text" inputMode="decimal" value={String(r.amount)}
                            onChange={(e) => updateStagedRow(i, { amount: parseAmount(e.target.value) })}
                            className="h-8 text-right" />
                          {(scenario.key === "anlasma" || scenario.key === "ihtiyari_anlasamama") && (
                            <Button size="sm" variant="secondary" className="h-8 px-2 text-xs whitespace-nowrap"
                              onClick={() => assignFullAmountToRow(i)}>
                              Tümünü buna yükle
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveStagedRows} disabled={stageBusy}>
                {stageBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Onayla ve Kaydet
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStagedRows([])} disabled={stageBusy}>Vazgeç</Button>
            </div>
          </div>
        )}
      </div>

      <div className="border rounded p-3 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h4 className="font-medium text-sm">Ödeme Defteri</h4>
            {/* 16.08: makbuz takibi özeti — ödenmiş sayılıp makbuz numarası yazılmamış
                satırlar burada tek satırda görünür (mükerrer bölüm yerine bu özet). */}
            <span className="text-xs text-muted-foreground">
              {payments.length} ödeme · {makbuzBekleyenSayisi} makbuz bekliyor
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Kayıtlı ücret toplamı: {fmtTL(existingUcretSum)}{taban != null ? ` / Taban: ${fmtTL(taban)}` : ""}
          </span>
        </div>

        <div className="rounded border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-1 text-left">Tarih</th>
                <th className="px-2 py-1 text-left">Ödeyen</th>
                <th className="px-2 py-1 text-left">Tür</th>
                <th className="px-2 py-1 text-left">Açıklama</th>
                <th className="px-2 py-1 text-right">Tutar</th>
                <th className="px-2 py-1 text-left">Durum</th>
                <th className="px-2 py-1 text-left">Makbuz No</th>
                <th className="px-2 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {paymentsLoading && (
                <tr><td colSpan={8} className="px-2 py-3 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-1" />Yükleniyor...</td></tr>
              )}
              {!paymentsLoading && payments.length === 0 && (
                <tr><td colSpan={8} className="px-2 py-3 text-center text-muted-foreground">Kayıt yok</td></tr>
              )}
              {payments.map((p) => {
                const isEditing = editingId === p.id && editForm;
                if (isEditing && editForm) {
                  return (
                    <tr key={p.id} className="border-t align-top bg-muted/20">
                      <td colSpan={8} className="px-2 py-2">
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-muted-foreground">Tarih</Label>
                            <Input type="date" value={editForm.payment_date}
                              onChange={(e) => setEditForm({ ...editForm, payment_date: e.target.value })}
                              className="h-8 w-36" disabled={editBusy} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-muted-foreground">Ödeyen</Label>
                            <Select value={editForm.payer_party_id} onValueChange={(v) => setEditForm({ ...editForm, payer_party_id: v })}>
                              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bakanlik">Bakanlık</SelectItem>
                                {parties.map((pp) => <SelectItem key={pp.id} value={pp.id}>{pp.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-muted-foreground">Tür</Label>
                            <Select value={editForm.kind} onValueChange={(v) => setEditForm({ ...editForm, kind: v as "ucret" | "masraf" })}>
                              <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ucret">Ücret</SelectItem>
                                <SelectItem value="masraf">Masraf</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1 min-w-0 flex-1 basis-40">
                            <Label className="text-xs text-muted-foreground">Açıklama</Label>
                            <Input value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              className="h-8 w-full min-w-0" disabled={editBusy} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-muted-foreground">Tutar</Label>
                            <Input type="text" inputMode="decimal" value={editForm.amount}
                              onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                              className="h-8 w-24 text-right" disabled={editBusy} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-muted-foreground">Durum</Label>
                            <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v as "bekliyor" | "odendi" })}>
                              <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bekliyor">Bekliyor</SelectItem>
                                <SelectItem value="odendi">Ödendi</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-muted-foreground">Makbuz No</Label>
                            <Input placeholder="Makbuz no" value={editForm.receipt_no}
                              onChange={(e) => setEditForm({ ...editForm, receipt_no: e.target.value })}
                              className="h-8 w-28" disabled={editBusy} />
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <div className="flex items-center gap-1">
                              <Button size="sm" onClick={() => requestSaveEdit(p)} disabled={editBusy}>
                                {editBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditRow} disabled={editBusy}>İptal</Button>
                            </div>
                            {editError && (
                              <div className="text-xs text-destructive flex items-center gap-1 max-w-[220px]">
                                <AlertTriangle className="h-3 w-3 shrink-0" />{editError}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={p.id} className="border-t align-top">
                    <td className="px-2 py-2 whitespace-nowrap">{p.payment_date}</td>
                    <td className="px-2 py-2">{p.payer_label}</td>
                    <td className="px-2 py-2">{p.kind === "ucret" ? "Ücret" : "Masraf"}</td>
                    <td className="px-2 py-2">{p.description || "-"}</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">{fmtTL(Number(p.amount))}</td>
                    <td className="px-2 py-2">
                      <Badge variant={p.status === "odendi" ? "default" : "outline"}>
                        {p.status === "odendi" ? "Ödendi" : "Bekliyor"}
                      </Badge>
                    </td>
                    <td className="px-2 py-2">
                      {p.receipt_no
                        ? p.receipt_no
                        : makbuzBekliyorMu(p)
                          ? <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">makbuz bekliyor</Badge>
                          : "-"}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        {p.status === "bekliyor" && (
                          markingId === p.id ? (
                            <div className="flex items-center gap-1">
                              <Input placeholder="Makbuz no" value={receiptDraft} onChange={(e) => setReceiptDraft(e.target.value)} className="h-8 w-28" />
                              <Button size="sm" onClick={() => confirmMarkPaid(p.id)} disabled={markBusy}>
                                {markBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setMarkingId(null); setReceiptDraft(""); }}>İptal</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => { setMarkingId(p.id); setReceiptDraft(""); }}>Ödendi işaretle</Button>
                          )
                        )}
                        {canManagePayments && markingId !== p.id && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => startEditRow(p)} title="Düzenle">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(p)} title="Sil">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 md:grid-cols-6 items-end border-t pt-3">
          <div className="space-y-1">
            <Label>Tarih</Label>
            <Input type="date" value={rowDate} onChange={(e) => setRowDate(e.target.value)} disabled={rowBusy} />
          </div>
          <div className="space-y-1">
            <Label>Ödeyen</Label>
            <Select value={rowPayerId} onValueChange={setRowPayerId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bakanlik">Bakanlık</SelectItem>
                {parties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tür</Label>
            <Select value={rowKind} onValueChange={(v) => setRowKind(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ucret">Ücret</SelectItem>
                <SelectItem value="masraf">Masraf</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Açıklama</Label>
            <Input value={rowDesc} onChange={(e) => setRowDesc(e.target.value)} disabled={rowBusy} />
          </div>
          <div className="space-y-1">
            <Label>Tutar (TL)</Label>
            <Input type="text" inputMode="decimal" value={rowAmount} onChange={(e) => setRowAmount(e.target.value)} disabled={rowBusy} />
          </div>
        </div>
        {rowError && (
          <div className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" />{rowError}</div>
        )}
        <Button size="sm" onClick={addPaymentRow} disabled={rowBusy}>
          {rowBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          Satır Ekle
        </Button>
      </div>

      <AlertDialog open={!!sensitiveEditConfirm} onOpenChange={(o) => !o && !editBusy && setSensitiveEditConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ödenmiş kayıt değiştirilecek</AlertDialogTitle>
            <AlertDialogDescription>
              Bu satır zaten ödendi işaretli, tutarı/türü değiştirmek muhasebe kaydını bozabilir. Devam edilsin mi?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={editBusy}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={editBusy}
              onClick={(e) => { e.preventDefault(); if (sensitiveEditConfirm) performSaveEdit(sensitiveEditConfirm); }}
            >
              {editBusy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Kaydediliyor…</> : "Evet, Devam Et"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleteBusy && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bu defter satırı silinecek, emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.payer_label} — {deleteTarget ? fmtTL(Number(deleteTarget.amount)) : ""} tutarındaki kayıt kalıcı olarak silinecek.
              {deleteTarget?.status === "odendi" && (
                <span className="block mt-2 text-destructive font-medium">
                  Bu kayıt "Ödendi" işaretli{deleteTarget?.receipt_no ? ` (Makbuz No: ${deleteTarget.receipt_no})` : ""}. Ödenmiş/makbuzlu bir kaydı silmek muhasebe geçmişini bozar.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteBusy}
              onClick={(e) => { e.preventDefault(); deletePaymentRow(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBusy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Siliniyor…</> : "Evet, Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Phase9Closing({ caseRow, reload }: { caseRow: CaseRow; reload: () => void }) {
  const [docCount, setDocCount] = useState(0);
  const [status, setStatus] = useState<string | null>(caseRow.status);
  const [closedAt, setClosedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState<"agreed" | "failed" | null>(null);

  useEffect(() => { (async () => {
    const { count } = await supabase.from("agreement_documents").select("id", { count: "exact", head: true }).eq("case_id", caseRow.id);
    setDocCount(count ?? 0);
  })(); }, [caseRow.id]);

  useEffect(() => {
    setStatus(caseRow.status);
    if (caseRow.status === "agreed" || caseRow.status === "failed") {
      (async () => {
        /* Kapanış tarihi `closed_at`ten okunur. Eskiden `updated_at` okunuyordu;
           o alan sonraki her düzenlemede değiştiği için ekrandaki "kapanış
           tarihi" zamanla kayıyordu — kusuru gizleyen bir yama idi. */
        const { data } = await supabase.from("cases").select("closed_at").eq("id", caseRow.id).maybeSingle();
        setClosedAt((data as any)?.closed_at ?? null);
      })();
    } else {
      setClosedAt(null);
    }
  }, [caseRow.id, caseRow.status]);

  /* KAPANIŞ HEM `status` HEM `outcome` YAZAR (24.08.2026 kusuru).
     Eskiden yalnız `status` yazılıyordu. Oysa `closed_at`i dolduran veritabanı
     tetikleyicisi (`set_case_closed_at`) **`outcome` değişimini** izliyor:
       IF NEW.outcome IS NOT NULL AND OLD.outcome IS DISTINCT FROM NEW.outcome
     Yani kapanış düğmesi ile tetikleyici hiç buluşmuyordu; `closed_at` BOŞ
     kalıyordu. CANLI KANIT: `outcome` dolu 5 dosyanın beşinde de `closed_at`
     dolu; bu ekrandan kapatılan 1 dosyada ikisi de boş.
     Boş `closed_at`in dört sonucu vardı:
       · `ajan-nobetci` kayıt silme kolu 24 saatlik sayacı BAŞLATAMIYOR
         ("closed_at boş" gerekçesi yazılıyor) → tarafa verilen "ses kaydı
         süreç bitiminden 24 saat sonra silinir" sözü tutulamazdı
         (constitution m.10 · süresiz saklama yasağı);
       · `dosya-verilerini-sil` bitiş zamanını `now()`a düşürüyor → 5 yıllık
         saklama sayacı her çağrıda baştan başlıyordu;
       · resmî belgeye "Sürecin Bitiş Tarihi" satırı hiç yazılmıyordu;
       · `OutcomeAnalytics` `outcome`u boş dosyaları eliyor → kapanan dosya
         istatistiğe hiç girmiyordu.
     `outcome` sözlüğü Türkçedir (`anlasma` / `anlasamama`); `status` İngilizce
     (`agreed` / `failed`). İkisi ayrı sütun, ayrı sözlük — karıştırılmaz. */
  async function closeCase(agreed: boolean) {
    const yeniDurum = agreed ? "agreed" : "failed";
    const yeniSonuc = agreed ? "anlasma" : "anlasamama";
    setBusy(yeniDurum);
    try {
      const { error } = await supabase.from("cases")
        .update({ status: yeniDurum, outcome: yeniSonuc, current_phase: 9 } as any)
        .eq("id", caseRow.id);
      if (error) throw error;
      setStatus(yeniDurum);
      setClosedAt(new Date().toISOString());
      toast({ title: agreed ? "Dosya anlaşma ile kapatıldı" : "Dosya anlaşamama ile kapatıldı" });
      reload();
    } catch (e: any) {
      toast({ title: "Hata", description: trErr(e.message), variant: "destructive" });
    } finally { setBusy(null); }
  }

  const closingLabel = status === "agreed" ? "Anlaşma" : status === "failed" ? "Anlaşamama" : "Devam Ediyor";
  const closingTone = status === "agreed" ? "low" : status === "failed" ? "high" : "medium";
  const isClosed = status === "agreed" || status === "failed";

  return (
    <div className="space-y-4">
      <PhaseHero
        label="AŞAMA 7 — BELGELER & KAPANIŞ"
        metrics={[
          { label: "Üretilen Belge", value: docCount },
          { label: "Kapanış Durumu", value: closingLabel, tone: closingTone },
        ]}
      />
    <motion.div variants={containerVariants} initial="hidden" animate="show">
    <Card className="p-6 space-y-6">
      {/* Aşama başlığı üst şeritte (PhaseHero); burada tekrarlanmaz. */}

      <Tabs defaultValue="belgeler">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="belgeler" className={tabTriggerAccentClass}>Belgeler</TabsTrigger>
          <TabsTrigger value="kapanis" className={tabTriggerAccentClass}>Kapanış</TabsTrigger>
          <TabsTrigger value="odeme" className={tabTriggerAccentClass}>Ödeme & Muhasebe</TabsTrigger>
        </TabsList>

        {/* ===== BELGELER ===== */}
        <TabsContent value="belgeler">
          <motion.section variants={itemVariants} className="space-y-4">
            <h3 className="text-lg font-semibold heading-gold-underline">Belgeler</h3>
            <OfficialDocumentsPanel caseRow={caseRow} onOutcomeSaved={reload} />
          </motion.section>
        </TabsContent>

        {/* ===== KAPANIŞ ===== */}
        <TabsContent value="kapanis">
          <motion.section variants={itemVariants} className="space-y-4">
            <h3 className="text-lg font-semibold heading-gold-underline">Kapanış</h3>

            {/* C1·C2·C3 — kapanış kontrolü, paket ve silme. Mevcut kapanış
                düğmeleri ve kartı YERİNDE; bu kart onların ÜSTÜNE eklendi. */}
            <KapanisPaketiKarti caseRow={caseRow} />

            {isClosed ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className={`rounded-2xl border p-6 flex items-center gap-4 ${
                  status === "agreed" ? "border-emerald-400/40 bg-emerald-400/5" : "border-red-400/40 bg-red-400/5"
                }`}
              >
                {status === "agreed"
                  ? <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" />
                  : <XCircle className="h-8 w-8 text-red-400 shrink-0" />}
                <div>
                  <div className="font-display font-semibold text-lg">
                    Bu dosya {status === "agreed" ? "Anlaşma" : "Anlaşamama"} ile kapanmıştır
                  </div>
                  {closedAt && (
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {new Date(closedAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => closeCase(true)}
                  className="group text-left rounded-2xl border border-sidebar-border p-5 transition-colors hover:border-emerald-400/50 hover:bg-emerald-400/5 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {busy === "agreed"
                    ? <Loader2 className="h-6 w-6 text-emerald-400 mb-2 animate-spin" />
                    : <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-2" />}
                  <div className="font-semibold">Anlaşma ile Kapat</div>
                  <div className="text-xs text-muted-foreground mt-1">Taraflar anlaşmaya vardı; dosya anlaşma ile sonuçlandırılır.</div>
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => closeCase(false)}
                  className="group text-left rounded-2xl border border-sidebar-border p-5 transition-colors hover:border-red-400/50 hover:bg-red-400/5 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {busy === "failed"
                    ? <Loader2 className="h-6 w-6 text-red-400 mb-2 animate-spin" />
                    : <XCircle className="h-6 w-6 text-red-400 mb-2" />}
                  <div className="font-semibold">Anlaşamama ile Kapat</div>
                  <div className="text-xs text-muted-foreground mt-1">Taraflar anlaşamadı; dosya anlaşamama ile sonuçlandırılır.</div>
                </button>
              </div>
            )}
          </motion.section>
        </TabsContent>

        {/* ===== ÖDEME & MUHASEBE ===== */}
        <TabsContent value="odeme">
          <motion.section variants={itemVariants} className="space-y-4">
            <h3 className="text-lg font-semibold heading-gold-underline">Ödeme & Muhasebe</h3>
            <PaymentAccountingPanel caseRow={caseRow} />
          </motion.section>
        </TabsContent>
      </Tabs>
    </Card>
    </motion.div>
    </div>
  );
}


/* ===================== PHASE 7 - EXPERT ===================== */

// Durum sözlüğü, satırı yazan BÜTÜN yolları karşılamalıdır: taraf onay akışı
// (`CaseRoom.PartyExpertApproval`) approved/rejected yazar, `bilirkisi-secim`
// kenar işlevi "onerildi" yazar. Eksik anahtar ham İngilizce durum olarak ekrana
// düşüyordu.
const EXPERT_STATUS_LABEL: Record<string, string> = {
  pending: "Onay Bekliyor",
  onerildi: "Onay Bekliyor",
  accepted: "Kabul Edildi",
  approved: "Taraflarca Onaylandı",
  rejected: "Reddedildi",
};

function Phase7Expert({ caseRow }: { caseRow: CaseRow }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<{ id: string; status: string; expertName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);

  const loadAssignment = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("case_expert_assignments")
      .select("id, status, expert_id, experts:expert_id(full_name)")
      .eq("case_id", caseRow.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setAssignment({
        id: (data as any).id,
        status: (data as any).status,
        expertName: (data as any).experts?.full_name ?? "Bilirkişi",
      });
      setSelected((data as any).expert_id);
    } else {
      setAssignment(null);
      setSelected(null);
    }
    setLoading(false);
  }, [caseRow.id]);

  useEffect(() => { loadAssignment(); }, [loadAssignment]);

  async function removeAssignment() {
    if (!assignment || !user) return;
    setRemoving(true);
    const kaldirilan = assignment;
    const { error } = await supabase.from("case_expert_assignments").delete().eq("id", kaldirilan.id);
    if (error) toast({ title: "Kaldırma hatası", description: trErr(error.message), variant: "destructive" });
    else {
      const iz = await logExpertAction({
        caseId: caseRow.id, assignmentId: kaldirilan.id, expertId: selected,
        actorId: user.id, actorRole: "mediator", action: "removed",
        details: { note: `${kaldirilan.expertName} ataması kaldırıldı` },
      });
      const bildirim = await notifyCaseParties(
        caseRow.id,
        "Bilirkişi Önerisi Geri Çekildi",
        `Arabulucu ${kaldirilan.expertName} adlı bilirkişi önerisini geri çekti.`,
      );
      toast({ title: "Bilirkişi ataması kaldırıldı" });
      if (iz.error || bildirim.error) {
        toast({
          title: "Kayıt uyarısı",
          description: trErr(iz.error ?? bildirim.error ?? ""),
          variant: "destructive",
        });
      }
      setAssignment(null);
      setSelected(null);
    }
    setRemoving(false);
  }

  return (
    <div className="space-y-4">
      <PhaseHero
        label="AŞAMA 5 — BİLİRKİŞİ (OPSİYONEL)"
        metrics={[
          {
            label: "Bilirkişi Durumu",
            value: loading ? null : assignment ? (EXPERT_STATUS_LABEL[assignment.status] ?? assignment.status) : "Atanmadı",
            tone: assignment?.status === "accepted" ? "low" : assignment ? "medium" : undefined,
          },
        ]}
        aside={
          <span className="inline-block text-[11px] font-medium px-2.5 py-1 rounded-full bg-sidebar-accent/40 border border-sidebar-border text-sidebar-foreground/70">
            Opsiyonel
          </span>
        }
      />
    <motion.div variants={containerVariants} initial="hidden" animate="show">
    <Card className="p-6 space-y-4">
      {/* Aşama başlığı üst şeritte (PhaseHero); burada tekrarlanmaz. */}
      <p className="text-sm text-muted-foreground">Uyuşmazlık türü: {caseRow.dispute_type}</p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Atama bilgisi yükleniyor…</div>
      ) : assignment && (
        <motion.div variants={itemVariants} className="flex items-center justify-between gap-2 border rounded-md p-3 bg-muted/30">
          <div className="text-sm">
            <span className="font-medium">{assignment.expertName}</span>{" "}
            <Badge variant="secondary" className="ml-1">{EXPERT_STATUS_LABEL[assignment.status] ?? assignment.status}</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={removeAssignment} disabled={removing}>
            {removing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
            Atamayı Kaldır
          </Button>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
      <ExpertSelector
        niche={caseRow.dispute_type || ""}
        selectedId={selected}
        onSelect={async (e) => {
          if (!user) return;
          setSelected(e.id);
          const { data: eklenen, error } = await supabase.from("case_expert_assignments").insert({
            case_id: caseRow.id, expert_id: e.id, status: "pending", assigned_by: user.id,
            approvals: {},
          } as any).select().maybeSingle();
          if (error) toast({ title: "Atama hatası", description: trErr(error.message), variant: "destructive" });
          else {
            const uzmanAdi = e.full_name ?? "Bilirkişi";
            // Denetim izi + taraf bildirimi: durum "onay bekliyor"dur, onayı
            // verecek taraf haberdar edilmezse öneri sonsuza dek asılı kalır.
            const iz = await logExpertAction({
              caseId: caseRow.id, assignmentId: (eklenen as any)?.id ?? null, expertId: e.id,
              actorId: user.id, actorRole: "mediator", action: "proposed",
              details: { note: `${uzmanAdi} önerildi` },
            });
            const bildirim = await notifyCaseParties(
              caseRow.id,
              "Yeni Bilirkişi Önerisi",
              `Arabulucu ${uzmanAdi} adlı bilirkişiyi önerdi. Onayınız bekleniyor.`,
            );
            toast({
              title: "Bilirkişi atandı (taraf onayı bekleniyor)",
              description: bildirim.sent > 0
                ? `${bildirim.sent} tarafa bildirim gönderildi.`
                : "Hesabı bağlı taraf bulunamadı — bildirim gönderilmedi.",
            });
            if (iz.error || bildirim.error) {
              toast({
                title: "Kayıt uyarısı",
                description: trErr(iz.error ?? bildirim.error ?? ""),
                variant: "destructive",
              });
            }
            loadAssignment();
          }
        }}
      />
      </motion.div>
    </Card>
    </motion.div>
    </div>
  );
}
