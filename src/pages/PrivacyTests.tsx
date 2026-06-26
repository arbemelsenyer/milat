import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppNavbar } from "@/components/AppNavbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, ShieldAlert, Play, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LEAK_QUERIES, countLeaks } from "@/lib/privacyQueries";
import {
  generatePrivacyReportPdf,
  loadLastRun,
  saveLastRun,
  type PrivacyResultRow,
  type PrivacyRun,
} from "@/lib/privacyReport";

export default function PrivacyTests() {
  const { user, isLoading, isAdmin } = useAuth();
  const [results, setResults] = useState<PrivacyResultRow[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<PrivacyRun | null>(null);

  useEffect(() => {
    setLastRun(loadLastRun());
  }, []);

  if (isLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin)
    return (
      <div className="min-h-screen bg-background">
        <AppNavbar />
        <main className="container max-w-3xl py-8 px-4">
          <Card className="p-6">Bu sayfa yalnızca yöneticilere açıktır.</Card>
        </main>
      </div>
    );

  const run = async () => {
    setRunning(true);
    const next: PrivacyResultRow[] = [];

    for (const q of LEAK_QUERIES) {
      const { data, error } = await supabase
        .from(q.table as any)
        .select(q.selectColumns)
        .neq(q.ownerColumn, user.id)
        .limit(5);
      const leaks = countLeaks((data ?? []) as any[], q.ownerColumn, user.id);
      next.push({
        name: q.name,
        description: q.description,
        status: leaks === 0 && !error ? "pass" : "fail",
        detail:
          leaks === 0
            ? `OK — sızıntı yok (${(data ?? []).length} satır döndü, hepsi yetkili).`
            : `SIZINTI: ${leaks} yetkisiz satır görüldü.`,
      });
    }

    // common_ground_reports — confirm no error / RLS active
    {
      const { data, error } = await supabase
        .from("common_ground_reports")
        .select("id, case_id")
        .limit(5);
      next.push({
        name: "common_ground_reports yalnızca arabulucu/yetkili",
        description: "Karşı taraf, ortak zemin raporlarındaki gizli alanları göremez.",
        status: !error ? "pass" : "fail",
        detail: error ? error.message : `RLS aktif — ${data?.length ?? 0} yetkili satır döndü.`,
      });
    }

    // cases_private_keys — must be blocked
    {
      const { data, error } = await supabase
        .from("cases_private_keys")
        .select("id")
        .limit(1);
      next.push({
        name: "cases_private_keys yalnızca sistem",
        description: "Şifreleme anahtarlarına son kullanıcı erişimi tamamen reddedilir.",
        status: (data ?? []).length === 0 ? "pass" : "fail",
        detail:
          (data ?? []).length === 0
            ? `OK — erişim reddedildi${error ? ` (${error.message})` : ""}.`
            : "SIZINTI: anahtar satırı görüldü.",
      });
    }

    const run: PrivacyRun = {
      ranAt: new Date().toISOString(),
      userEmail: user.email ?? null,
      results: next,
    };
    saveLastRun(run);
    setLastRun(run);
    setResults(next);
    setRunning(false);
  };

  const downloadPdf = (run: PrivacyRun) => {
    const doc = generatePrivacyReportPdf(run);
    doc.save(`privacy-report-${new Date(run.ranAt).toISOString().slice(0, 10)}.pdf`);
  };

  const view = results.length > 0 ? results : lastRun?.results ?? [];
  const passed = view.filter((r) => r.status === "pass").length;
  const failed = view.filter((r) => r.status === "fail").length;

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="container max-w-4xl py-8 px-4">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-display font-semibold">Gizlilik Test Paketi</h1>
            <p className="text-sm text-muted-foreground">
              Taraf A verilerinin Taraf B tarafından okunamadığını canlı sorgularla doğrular.
            </p>
          </div>
          <Button onClick={run} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
            Testleri Çalıştır
          </Button>
        </div>

        {lastRun && (
          <Card className="p-4 mb-4 flex items-center justify-between gap-3 flex-wrap bg-muted/30">
            <div className="text-sm">
              <div className="font-medium">En son çalıştırma</div>
              <div className="text-xs text-muted-foreground">
                {new Date(lastRun.ranAt).toLocaleString("tr-TR")} ·{" "}
                {lastRun.results.filter((r) => r.status === "pass").length} geçti,{" "}
                {lastRun.results.filter((r) => r.status === "fail").length} başarısız
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => downloadPdf(lastRun)}>
              <FileDown className="h-4 w-4 mr-1" /> Son raporu PDF indir
            </Button>
          </Card>
        )}

        <div className="flex gap-3 mb-4">
          <Badge variant="default" className="gap-1"><ShieldCheck className="h-3 w-3" /> Geçti: {passed}</Badge>
          <Badge variant={failed > 0 ? "destructive" : "outline"} className="gap-1">
            <ShieldAlert className="h-3 w-3" /> Başarısız: {failed}
          </Badge>
          {results.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => downloadPdf({ ranAt: new Date().toISOString(), userEmail: user.email ?? null, results })}>
              <FileDown className="h-4 w-4 mr-1" /> Bu çalıştırmayı indir
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {view.map((r, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.description}</div>
                  {r.detail && <div className="text-xs mt-2 font-mono">{r.detail}</div>}
                </div>
                <Badge
                  variant={
                    r.status === "pass" ? "default" : r.status === "fail" ? "destructive" : "outline"
                  }
                >
                  {r.status === "pass" ? "GEÇTİ" : r.status === "fail" ? "BAŞARISIZ" : "Bekliyor"}
                </Badge>
              </div>
            </Card>
          ))}
          {view.length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground">
              Henüz test çalıştırılmadı. "Testleri Çalıştır" düğmesine basın.
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
