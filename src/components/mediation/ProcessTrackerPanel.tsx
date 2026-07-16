import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { officialTitle } from "@/lib/official-documents";

// case_process_tracker isn't in the generated Supabase types yet.
const trackerTable = () => (supabase as any).from("case_process_tracker");

interface Props {
  caseRow: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ItemState = { checked: boolean; note: string; updated_at?: string };
type Items = Record<string, ItemState>;
type Tracker = { buro_no: string; arb_no: string; items: Items };

const WORKFLOW_ITEMS: { key: string; label: string; auto?: boolean }[] = [
  { key: "davet_mektubu", label: "Davet Mektubu", auto: true },
  { key: "basvurucu_vekalet", label: "Başvurucu Vekalet-Yetki Belgesi Dönüşü" },
  { key: "diger_taraf_vekalet", label: "Diğer Taraf Vekalet-Yetki Belgesi Dönüşü" },
  { key: "ilk_oturum", label: "İlk Oturum", auto: true },
  { key: "basvurucu_ilk_oturum_eimza", label: "Başvurucu İlk Oturum E-imza" },
  { key: "karsi_taraf_ilk_oturum_eimza", label: "Karşı Taraf İlk Oturum E-imza" },
  { key: "oturum_erteleme", label: "Oturum Erteleme", auto: true },
  { key: "basvurucu_erteleme_eimza", label: "Başvurucu Erteleme E-imza" },
  { key: "karsi_taraf_erteleme_eimza", label: "Karşı Taraf Erteleme E-imza" },
  { key: "ikinci_oturum", label: "2. Oturum", auto: true },
  { key: "basvurucu_2_oturum_eimza", label: "Başvurucu 2. Oturum E-imza" },
  { key: "karsi_taraf_2_oturum_eimza", label: "Karşı Taraf 2. Oturum E-imza" },
  { key: "basvurucu_son_tutanak_eimza", label: "Başvurucu Son Tutanak E-imza" },
  { key: "karsi_taraf_son_tutanak_eimza", label: "Karşı Taraf Son Tutanak E-imza" },
  { key: "sonuc", label: "Sonuç", auto: true },
  { key: "portal_kapama", label: "Portal Kapama" },
  { key: "acik_kapali", label: "Açık/Kapalı" },
  { key: "notlar", label: "Notlar" },
  { key: "son_durum", label: "Son Durum", auto: true },
];

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("tr-TR");
  } catch {
    return "—";
  }
}

function partyName(p: any): string {
  return p?.company_name || p?.full_name || "—";
}

export function ProcessTrackerPanel({ caseRow, open, onOpenChange }: Props) {
  const { isMediator, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [caseData, setCaseData] = useState<any>(caseRow);
  const [parties, setParties] = useState<any[]>([]);
  const [assignedAt, setAssignedAt] = useState<string | null>(null);
  const [mediatorName, setMediatorName] = useState<string>("");
  const [agreementDocs, setAgreementDocs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [tracker, setTracker] = useState<Tracker>({ buro_no: "", arb_no: "", items: {} });
  const [outcomeAnalytics, setOutcomeAnalytics] = useState<any>(null);
  const [agreementAmountDraft, setAgreementAmountDraft] = useState<string>("");
  const [savingAmount, setSavingAmount] = useState(false);

  useEffect(() => {
    if (!open || !caseRow?.id) return;
    void loadAll(caseRow.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, caseRow?.id]);

  useEffect(() => {
    setAgreementAmountDraft(caseData?.agreement_amount ? String(caseData.agreement_amount) : "");
  }, [caseData?.agreement_amount]);

  async function loadAll(caseId: string) {
    setLoading(true);
    try {
      const [
        { data: freshCase },
        { data: partyRows },
        { data: assignment },
        { data: docs },
        { data: sessionRows },
        { data: trackerRow },
      ] = await Promise.all([
        supabase
          .from("cases")
          .select("id, dispute_type, dispute_subtype, assigned_mediator_id, created_at, deadline_total, deadline_extended, outcome, status, agreement_amount")
          .eq("id", caseId)
          .maybeSingle(),
        supabase.from("case_parties").select("id, role, party_role, full_name, company_name").eq("case_id", caseId),
        supabase.from("case_assignments").select("assigned_at").eq("case_id", caseId).order("assigned_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("agreement_documents").select("id, metadata, created_at").eq("case_id", caseId),
        supabase.from("case_sessions").select("id, status, scheduled_at").eq("case_id", caseId).order("scheduled_at", { ascending: true }),
        trackerTable().select("*").eq("case_id", caseId).maybeSingle(),
      ]);

      const resolvedCase = freshCase ?? caseRow;
      setCaseData(resolvedCase);
      setParties(partyRows ?? []);
      setAssignedAt((assignment as any)?.assigned_at ?? null);
      setAgreementDocs(docs ?? []);
      setSessions(sessionRows ?? []);
      setTracker({
        buro_no: (trackerRow as any)?.buro_no ?? "",
        arb_no: (trackerRow as any)?.arb_no ?? "",
        items: ((trackerRow as any)?.items as Items) ?? {},
      });

      const mediatorId = resolvedCase?.assigned_mediator_id;
      if (mediatorId) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", mediatorId).maybeSingle();
        setMediatorName(profile?.full_name ?? "—");
      } else {
        setMediatorName("—");
      }
    } catch (e: any) {
      toast({ title: "Yüklenemedi", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }

    // Kapanış Özeti: ayrı, izole sorgu — case_outcome_analytics bu projenin
    // generated types'ında yok (migration olarak repoda da yok), bu yüzden
    // yukarıdaki ana yüklemenin Promise.all'ından bilerek dışarıda tutuluyor:
    // bu görünüm eksik/hatalıysa föyün geri kalanı hiç etkilenmesin.
    try {
      const { data: analyticsRow, error: analyticsErr } = await (supabase as any)
        .from("case_outcome_analytics")
        .select("*")
        .eq("case_id", caseId)
        .maybeSingle();
      if (analyticsErr) throw analyticsErr;
      setOutcomeAnalytics(analyticsRow ?? null);
    } catch (e) {
      console.warn("[ProcessTrackerPanel] case_outcome_analytics yüklenemedi", e);
      setOutcomeAnalytics(null);
    }
  }

  function persistTracker(next: Tracker) {
    void trackerTable()
      .upsert({ case_id: caseRow.id, buro_no: next.buro_no || null, arb_no: next.arb_no || null, items: next.items }, { onConflict: "case_id" })
      .then(({ error }: any) => {
        if (error) toast({ title: "Kaydedilemedi", description: error.message, variant: "destructive" });
      });
  }

  function toggleItem(key: string, checked: boolean) {
    const next: Tracker = {
      ...tracker,
      items: { ...tracker.items, [key]: { checked, note: tracker.items[key]?.note ?? "", updated_at: new Date().toISOString() } },
    };
    setTracker(next);
    persistTracker(next);
  }

  function setNoteDraft(key: string, note: string) {
    setTracker((prev) => ({
      ...prev,
      items: { ...prev.items, [key]: { checked: prev.items[key]?.checked ?? false, note, updated_at: prev.items[key]?.updated_at } },
    }));
  }

  function commitNote() {
    persistTracker(tracker);
  }

  function setMeta(field: "buro_no" | "arb_no", value: string) {
    setTracker((prev) => ({ ...prev, [field]: value }));
  }

  function commitMeta() {
    persistTracker(tracker);
  }

  async function saveAgreementAmount() {
    const amount = Number(agreementAmountDraft);
    if (!agreementAmountDraft.trim() || Number.isNaN(amount) || amount <= 0) {
      toast({ title: "Geçerli bir tutar girin", variant: "destructive" });
      return;
    }
    setSavingAmount(true);
    try {
      const { error } = await supabase.from("cases").update({ agreement_amount: amount }).eq("id", caseRow.id);
      if (error) throw error;
      setCaseData((prev: any) => ({ ...prev, agreement_amount: amount }));
      toast({ title: "Anlaşma tutarı kaydedildi" });
    } catch (e: any) {
      toast({ title: "Kaydedilemedi", description: e.message, variant: "destructive" });
    } finally {
      setSavingAmount(false);
    }
  }

  // party_role is canonical (applicant/respondent/third_party); role is legacy and may still
  // hold older "claimant" values on rows written before the intake form was aligned to it.
  const claimants = useMemo(() => parties.filter((p) => p.party_role === "applicant" || p.role === "applicant" || p.role === "claimant"), [parties]);
  const respondents = useMemo(() => parties.filter((p) => p.party_role === "respondent" || p.role === "respondent"), [parties]);

  const arbKonusu = useMemo(() => {
    if (!caseData?.dispute_type) return "—";
    return caseData.dispute_subtype ? `${caseData.dispute_type} / ${caseData.dispute_subtype}` : caseData.dispute_type;
  }, [caseData]);

  const sonGunTarihi = caseData?.deadline_extended ?? caseData?.deadline_total ?? null;

  const autoState = useMemo(() => {
    const davetDoc = agreementDocs.find((d) => d.metadata?.kind === "davet");
    const scheduled = sessions.filter((s) => s.scheduled_at);
    const first = scheduled[0];
    const second = scheduled[1];
    const cancelled = sessions.find((s) => s.status === "cancelled");
    const outcome = caseData?.outcome;
    const status = caseData?.status;
    const sonucText = outcome === "anlasma" ? "Anlaşma" : outcome === "anlasamamama" ? "Anlaşamama" : "";
    const sonDurumText = status === "agreed" ? "Anlaşma ile kapandı" : status === "failed" ? "Anlaşamama ile kapandı" : "Devam ediyor";

    return {
      davet_mektubu: { checked: !!davetDoc, note: davetDoc ? fmtDate(davetDoc.created_at) : "" },
      ilk_oturum: { checked: !!first, note: first ? fmtDate(first.scheduled_at) : "" },
      ikinci_oturum: { checked: !!second, note: second ? fmtDate(second.scheduled_at) : "" },
      oturum_erteleme: { checked: !!cancelled, note: cancelled ? fmtDate(cancelled.scheduled_at) : "" },
      sonuc: { checked: !!outcome, note: sonucText },
      son_durum: { checked: true, note: sonDurumText },
    } as Record<string, ItemState>;
  }, [agreementDocs, sessions, caseData]);

  const kunyeRows: { label: string; value: React.ReactNode }[] = [
    { label: "Arabuluculuk Bürosu", value: "—" },
    {
      label: "Büro No",
      value: <Input className="h-8 max-w-xs" value={tracker.buro_no} onChange={(e) => setMeta("buro_no", e.target.value)} onBlur={commitMeta} placeholder="Manuel giriniz" />,
    },
    {
      label: "ARB No",
      value: <Input className="h-8 max-w-xs" value={tracker.arb_no} onChange={(e) => setMeta("arb_no", e.target.value)} onBlur={commitMeta} placeholder="Manuel giriniz" />,
    },
    { label: "Başvurucu Taraf", value: claimants.length ? claimants.map(partyName).join(", ") : "—" },
    { label: "Diğer Taraf", value: respondents.length ? respondents.map(partyName).join(", ") : "—" },
    { label: "Arabulucu", value: mediatorName || "—" },
    { label: "Arb. Konusu", value: arbKonusu },
    { label: "Dosya Atama Tarihi", value: fmtDate(assignedAt ?? caseData?.created_at) },
    { label: "Son Gün Tarihi", value: fmtDate(sonGunTarihi) },
  ];

  const araclar = useMemo(() => {
    const list: string[] = [];
    if (outcomeAnalytics?.kokpit_kullanildi) list.push("Kokpit Analizi");
    if (outcomeAnalytics?.kor_teklif_kullanildi) list.push("Kör Teklif");
    if (outcomeAnalytics?.uzman_kullanildi) list.push("Uzman Ajan");
    return list.length ? list.join(", ") : "—";
  }, [outcomeAnalytics]);

  // Yalnızca dosya kapanmışsa (outcome doluysa) gösterilir. Görünürlük bu
  // koşula bağlı — case_outcome_analytics sorgusu başarısız/eksik olsa bile
  // bölüm görünür kalır, sadece view'a dayalı satırlar "—" düşer.
  const kapanisRows: { label: string; value: React.ReactNode }[] | null = caseData?.outcome
    ? [
        {
          label: "Sonuç",
          value: caseData.outcome === "anlasma" ? "Anlaşma" : caseData.outcome === "anlasamamama" ? "Anlaşamama" : caseData.outcome,
        },
        { label: "Süre", value: outcomeAnalytics?.sure_gun != null ? `${outcomeAnalytics.sure_gun} gün` : "—" },
        { label: "Oturum Sayısı", value: outcomeAnalytics?.oturum_sayisi ?? "—" },
        {
          label: "Kapanış Belgesi",
          value: outcomeAnalytics?.kapanis_belgesi_tipi ? officialTitle(outcomeAnalytics.kapanis_belgesi_tipi) : "—",
        },
        { label: "Kullanılan Araçlar", value: araclar },
        {
          label: "Anlaşma Tutarı",
          value: caseData.agreement_amount ? (
            `${Number(caseData.agreement_amount).toLocaleString("tr-TR")} ₺`
          ) : isMediator || isAdmin ? (
            <div className="flex items-center gap-2">
              <Input
                className="h-8 max-w-[160px]"
                type="number"
                min={0}
                value={agreementAmountDraft}
                onChange={(e) => setAgreementAmountDraft(e.target.value)}
                placeholder="Tutar (₺)"
              />
              <Button size="sm" className="h-8" disabled={savingAmount} onClick={saveAgreementAmount}>
                {savingAmount ? <Loader2 className="h-3 w-3 animate-spin" /> : "Kaydet"}
              </Button>
            </div>
          ) : (
            "—"
          ),
        },
      ]
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="heading-gold-underline">Süreç Takip Çizelgesi</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Yükleniyor...
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-2">A. Künye</h3>
              <table className="w-full text-sm border border-accent/40 rounded-md overflow-hidden">
                <tbody>
                  {kunyeRows.map((row, i) => (
                    <tr key={row.label} className={i % 2 ? "bg-muted/30" : ""}>
                      <td className="border-t px-3 py-2 w-10 text-muted-foreground">{i + 1}</td>
                      <td className="border-t px-3 py-2 w-56 font-medium">{row.label}</td>
                      <td className="border-t px-3 py-2">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">B. İş Akışı</h3>
              <table className="w-full text-sm border border-accent/40 rounded-md overflow-hidden">
                <tbody>
                  {WORKFLOW_ITEMS.map((item, i) => {
                    const state = item.auto ? autoState[item.key] : tracker.items[item.key];
                    const checked = state?.checked ?? false;
                    const note = state?.note ?? "";
                    return (
                      <tr key={item.key} className={i % 2 ? "bg-muted/30" : ""}>
                        <td className="border-t px-3 py-2 w-10 text-muted-foreground">{i + 10}</td>
                        <td className="border-t px-3 py-2 w-14 text-center">
                          <Checkbox checked={checked} disabled={item.auto} onCheckedChange={(v) => toggleItem(item.key, !!v)} />
                        </td>
                        <td className="border-t px-3 py-2 w-64">
                          <span className="flex items-center gap-2">
                            {item.label}
                            {item.auto && (
                              <Badge variant="secondary" className="text-[10px]">
                                otomatik
                              </Badge>
                            )}
                          </span>
                        </td>
                        <td className="border-t px-3 py-2">
                          {item.auto ? (
                            <span className="text-muted-foreground">{note || "—"}</span>
                          ) : (
                            <Input className="h-8" value={note} placeholder="Not" onChange={(e) => setNoteDraft(item.key, e.target.value)} onBlur={commitNote} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {kapanisRows && (
              <div>
                <h3 className="text-sm font-semibold mb-2">C. Kapanış Özeti</h3>
                <table className="w-full text-sm border border-accent/40 rounded-md overflow-hidden">
                  <tbody>
                    {kapanisRows.map((row, i) => (
                      <tr key={row.label} className={i % 2 ? "bg-muted/30" : ""}>
                        <td className="border-t px-3 py-2 w-10 text-muted-foreground">{i + 100}</td>
                        <td className="border-t px-3 py-2 w-56 font-medium">{row.label}</td>
                        <td className="border-t px-3 py-2">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
