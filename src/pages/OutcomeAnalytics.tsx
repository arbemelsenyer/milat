import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, Loader2 } from "lucide-react";

// Bilinen {grup}_{belge_tipi} kalıplarını okunur Türkçe ada çevirir — aynısı
// src/components/mediation/ProcessTrackerPanel.tsx'te de var; bu sayfa o
// dosyaya bağımlılık kurmamak için kopyasını kendi içinde tutuyor.
const TEMPLATE_GROUP_LABELS: Record<string, string> = {
  dava_sarti: "Dava Şartı",
  isci_isveren: "İşçi-İşveren",
  ihtiyari: "İhtiyari",
  ticari: "Ticari",
  tuketici: "Tüketici",
  kira: "Kira",
  ortaklik: "Ortaklığın Giderilmesi",
};

const TEMPLATE_BELGE_TIPI_LABELS: Record<string, string> = {
  davet: "Davet",
  muracaat_tutanagi: "Müracaat Tutanağı",
  arabulucu_belirleme: "Arabulucu Belirleme",
  bilgilendirme: "Bilgilendirme",
  surec_baslama: "Süreç Başlama",
  ilk_oturum: "İlk Oturum",
  oturum_erteleme: "Oturum Erteleme",
  acilis_konusmasi: "Açılış Konuşması",
  anlasma_belgesi: "Anlaşma Belgesi",
  anlasma_son_tutanak: "Anlaşma Son Tutanağı",
  anlasamama_son_tutanak: "Anlaşamama Son Tutanağı",
  gorusme_yapilmadan_anlasamama: "Görüşme Yapılmadan Anlaşamama",
  ucret_sozlesmesi: "Ücret Sözleşmesi",
  yetki_belgesi: "Yetki Belgesi",
  makbuz_ust_yazisi: "Makbuz Üst Yazısı",
  icra_serhi_dilekce: "İcra Şerhi Dilekçesi",
  anlasma: "Anlaşma",
  anlasamamama: "Anlaşamama",
  ucret: "Ücret",
};

const TEMPLATE_FULL_NAME_LABELS: Record<string, string> = {
  bilgilendirme_tutanagi: "Bilgilendirme Tutanağı",
};

function humanizeTemplateType(type: string): string {
  if (TEMPLATE_FULL_NAME_LABELS[type]) return TEMPLATE_FULL_NAME_LABELS[type];
  const groupKey = Object.keys(TEMPLATE_GROUP_LABELS)
    .sort((a, b) => b.length - a.length)
    .find((g) => type === g || type.startsWith(`${g}_`));
  if (!groupKey) return type;
  const remainder = type === groupKey ? "" : type.slice(groupKey.length + 1);
  if (!remainder) return TEMPLATE_GROUP_LABELS[groupKey];
  const belgeLabel = TEMPLATE_BELGE_TIPI_LABELS[remainder];
  if (!belgeLabel) return type;
  return `${TEMPLATE_GROUP_LABELS[groupKey]} ${belgeLabel}`;
}

function toolLabels(row: OutcomeRow): string {
  const list: string[] = [];
  if (row.kokpit_kullanildi) list.push("Kokpit Analizi");
  if (row.kor_teklif_kullanildi) list.push("Kör Teklif");
  if (row.uzman_kullanildi) list.push("Uzman Ajan");
  return list.length ? list.join(", ") : "—";
}

function outcomeLabel(outcome: string | null): string {
  return outcome === "anlasma" ? "Anlaşma" : outcome === "anlasamamama" ? "Anlaşamama" : outcome ?? "—";
}

interface OutcomeRow {
  case_id: string | null;
  outcome: string | null;
  status: string | null;
  dispute_type: string | null;
  dispute_subtype: string | null;
  sure_gun: number | null;
  oturum_sayisi: number | null;
  kapanis_belgesi_tipi: string | null;
  kokpit_kullanildi: boolean | null;
  kor_teklif_kullanildi: boolean | null;
  uzman_kullanildi: boolean | null;
  agreement_amount: number | null;
  application_date: string | null;
  closed_at: string | null;
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function agreementRate(rows: OutcomeRow[]): { pct: number | null; n: number } {
  const n = rows.length;
  if (!n) return { pct: null, n };
  const agreed = rows.filter((r) => r.outcome === "anlasma").length;
  return { pct: Math.round((agreed / n) * 1000) / 10, n };
}

export default function OutcomeAnalytics() {
  const { user, isAdmin, isMediator, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<OutcomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
    else if (!authLoading && user && !isAdmin && !isMediator) navigate("/dashboard");
  }, [user, authLoading, isAdmin, isMediator, navigate]);

  useEffect(() => {
    if (!user || !(isAdmin || isMediator)) return;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { data, error } = await supabase.from("case_outcome_analytics").select("*");
        if (error) throw error;
        // "Kapanan dosya" = outcome doluysa — ProcessTrackerPanel'in Kapanış
        // Özeti bölümüyle aynı tanım.
        setRows(((data ?? []) as OutcomeRow[]).filter((r) => !!r.outcome));
      } catch (e: any) {
        setLoadError(e.message ?? "Bilinmeyen hata");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isAdmin, isMediator]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const total = rows.length;
  const overall = agreementRate(rows);
  const avgSure = average(rows.map((r) => r.sure_gun).filter((v): v is number => v != null));
  const avgOturum = average(rows.map((r) => r.oturum_sayisi).filter((v): v is number => v != null));

  const toolComparisons = [
    { label: "Kör Teklif", key: "kor_teklif_kullanildi" as const },
    { label: "Kokpit Analizi", key: "kokpit_kullanildi" as const },
    { label: "Uzman Ajan", key: "uzman_kullanildi" as const },
  ].map(({ label, key }) => ({
    label,
    used: agreementRate(rows.filter((r) => !!r[key])),
    unused: agreementRate(rows.filter((r) => !r[key])),
  }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Geri
            </Button>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> Sonuç İstatistikleri
              </h1>
              <p className="text-sm text-muted-foreground">Kapanmış dosyaların sonuç ve süreç analizi — salt okunur.</p>
            </div>
          </div>
          <Badge variant="secondary">{isAdmin ? "Admin" : "Arabulucu"}</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {loadError && (
          <Card className="border-destructive/40">
            <CardContent className="pt-6 text-sm text-destructive">Veriler yüklenemedi: {loadError}</CardContent>
          </Card>
        )}

        {/* 1) Özet kartlar */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Toplam Kapanan Dosya</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Anlaşma Oranı</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overall.pct != null ? `%${overall.pct}` : "—"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Ortalama Süre</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgSure != null ? `${Math.round(avgSure)} gün` : "—"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Ortalama Oturum Sayısı</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgOturum != null ? avgOturum.toFixed(1) : "—"}</div>
            </CardContent>
          </Card>
        </div>

        {/* 2) Araç etkisi mini tablosu */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Araç Etkisi</CardTitle>
            <CardDescription>Araç kullanılan vs kullanılmayan dosyalarda anlaşma oranı (n = dosya sayısı).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Araç</th>
                    <th className="py-2 pr-4">Kullanıldı</th>
                    <th className="py-2 pr-4">Kullanılmadı</th>
                  </tr>
                </thead>
                <tbody>
                  {toolComparisons.map((t) => (
                    <tr key={t.label} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{t.label}</td>
                      <td className="py-2 pr-4">
                        {t.used.pct != null ? `%${t.used.pct}` : "—"}{" "}
                        <span className="text-xs text-muted-foreground">(n={t.used.n})</span>
                      </td>
                      <td className="py-2 pr-4">
                        {t.unused.pct != null ? `%${t.unused.pct}` : "—"}{" "}
                        <span className="text-xs text-muted-foreground">(n={t.unused.n})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 3) Tüm kapanmış dosyalar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kapanmış Dosyalar ({total})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Dosya ID</th>
                    <th className="py-2 pr-4">Uyuşmazlık Türü</th>
                    <th className="py-2 pr-4">Sonuç</th>
                    <th className="py-2 pr-4">Süre</th>
                    <th className="py-2 pr-4">Oturum</th>
                    <th className="py-2 pr-4">Kullanılan Araçlar</th>
                    <th className="py-2 pr-4">Kapanış Belgesi</th>
                    <th className="py-2 pr-4">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-muted-foreground">
                        Henüz kapanmış dosya yok.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.case_id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono text-xs" title={r.case_id ?? ""}>
                          {r.case_id ? r.case_id.slice(0, 8) : "—"}
                        </td>
                        <td className="py-2 pr-4">
                          {r.dispute_type ?? "—"}
                          {r.dispute_subtype ? ` / ${r.dispute_subtype}` : ""}
                        </td>
                        <td className="py-2 pr-4">{outcomeLabel(r.outcome)}</td>
                        <td className="py-2 pr-4">{r.sure_gun != null ? `${r.sure_gun} gün` : "—"}</td>
                        <td className="py-2 pr-4">{r.oturum_sayisi ?? "—"}</td>
                        <td className="py-2 pr-4">{toolLabels(r)}</td>
                        <td className="py-2 pr-4">
                          {r.kapanis_belgesi_tipi ? humanizeTemplateType(r.kapanis_belgesi_tipi) : "—"}
                        </td>
                        <td className="py-2 pr-4">
                          {r.agreement_amount ? `${Number(r.agreement_amount).toLocaleString("tr-TR")} ₺` : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
