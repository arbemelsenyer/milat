import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw, Scale, XCircle } from "lucide-react";

type PendingRow = {
  id: string;
  source_url: string | null;
  raw_content: string;
  niche_area: string | null;
  status: string;
  created_at: string;
  metadata: Record<string, any> | null;
};

function formatDate(v?: string | null) {
  if (!v) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(v));
}

export function MevzuatAdmin() {
  const { toast } = useToast();
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [checkingTariff, setCheckingTariff] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pending_pool")
        .select("id, source_url, raw_content, niche_area, status, created_at, metadata")
        .eq("niche_area", "mevzuat")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      setRows((data ?? []) as PendingRow[]);
    } catch (e: any) {
      toast({ title: "Yükleme hatası", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const decide = async (id: string, action: "approve" | "reject") => {
    setBusy(id);
    try {
      const { data, error } = await supabase.functions.invoke("approve-pending-mevzuat", {
        body: { id, action },
      });
      if (error) throw error;
      toast({
        title: action === "approve" ? "Onaylandı ve bilgi tabanına eklendi" : "Reddedildi",
        description: action === "approve" ? `${(data as any)?.chunks ?? 0} parça eklendi.` : undefined,
      });
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      toast({ title: "İşlem başarısız", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const runTariffCheck = async () => {
    setCheckingTariff(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-new-tariff", { body: {} });
      if (error) throw error;
      const d = data as any;
      toast({
        title: d?.found?.length ? "Yeni tarife bulundu" : "Yeni tarife bulunamadı",
        description: `${d?.checked_year} için ${d?.found?.length ?? 0} eşleşme; ${d?.notified ?? 0} admin bildirildi.`,
      });
    } catch (e: any) {
      toast({ title: "Kontrol başarısız", description: e.message, variant: "destructive" });
    } finally {
      setCheckingTariff(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="w-4 h-4" />
          Mevzuat Takibi (Resmi Gazete & TBMM)
        </CardTitle>
        <CardDescription>
          Otomatik toplanan yeni mevzuat kayıtlarını inceleyin. Onaylanan içerik AI bilgi tabanına eklenir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Yenile
          </Button>
          <Button size="sm" variant="secondary" onClick={runTariffCheck} disabled={checkingTariff}>
            {checkingTariff ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Scale className="w-4 h-4 mr-2" />}
            Yeni Yıl Tarifesini Şimdi Kontrol Et
          </Button>
          <Badge variant="outline">{rows.length} bekleyen mevzuat</Badge>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Bekleyen mevzuat yok. Yeni içerik geldiğinde burada listelenecek.
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {rows.map((r) => {
              const title = r.metadata?.source_title ?? "Başlıksız kayıt";
              const provider = r.metadata?.provider ?? "kaynak";
              return (
                <li key={r.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{title}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">{provider}</Badge>
                        <span>Geliş: {formatDate(r.created_at)}</span>
                        {r.source_url && (
                          <a
                            href={r.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" /> kaynağı aç
                          </a>
                        )}
                      </div>
                      <div className="mt-2 line-clamp-3 text-xs text-muted-foreground whitespace-pre-wrap">
                        {r.raw_content.slice(0, 400)}{r.raw_content.length > 400 ? "…" : ""}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => decide(r.id, "approve")}
                        disabled={busy === r.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                        Onayla
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => decide(r.id, "reject")}
                        disabled={busy === r.id}
                        className="text-destructive hover:text-destructive"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Reddet
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-start gap-2 text-xs text-muted-foreground border-t pt-3">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5" />
          Kaynaklar günlük olarak taranır (GitHub Actions cron). Yeni yıl arabuluculuk asgari ücret tarifesi
          her yıl 1 Aralık ve 5 Ocak'ta otomatik kontrol edilir.
        </div>
      </CardContent>
    </Card>
  );
}
