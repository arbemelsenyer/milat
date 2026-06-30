import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppNavbar } from "@/components/AppNavbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

type DupRow = { case_id: string; round_number: number; count: number; ids: string[] };

/**
 * Admin-only health check.
 * Surfaces any (case_id, round_number) groups in common_ground_reports
 * that have more than one row — these would re-trigger the
 * "JSON object requested, multiple (or no) rows returned" bug
 * if the UNIQUE constraint were ever dropped.
 */
export default function HealthCheck() {
  const { user, isLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<DupRow[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [totalGroups, setTotalGroups] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  async function runScan() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from("common_ground_reports")
        .select("id, case_id, round_number, created_at")
        .order("created_at", { ascending: false });
      if (qErr) throw qErr;

      const rows = data ?? [];
      const groups = new Map<string, DupRow>();
      for (const r of rows) {
        const key = `${r.case_id}::${r.round_number}`;
        const prev = groups.get(key);
        if (prev) {
          prev.count++;
          prev.ids.push(r.id);
        } else {
          groups.set(key, {
            case_id: r.case_id,
            round_number: r.round_number,
            count: 1,
            ids: [r.id],
          });
        }
      }
      const dups = [...groups.values()]
        .filter((g) => g.count > 1)
        .sort((a, b) => b.count - a.count);

      setDuplicates(dups);
      setTotalRows(rows.length);
      setTotalGroups(groups.size);
      setLastRun(new Date());
    } catch (e: any) {
      setError(e?.message ?? "Tarama sırasında bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) runScan();
  }, [isAdmin]);

  if (isLoading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const healthy = duplicates.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Veri Sağlık Kontrolü</h1>
            <p className="text-sm text-muted-foreground mt-1">
              <code>common_ground_reports</code> tablosunda{" "}
              <code>(case_id, round_number)</code> bazında yinelenen kayıtları tarar.
              UNIQUE kısıtı korunduğu sürece bu liste boş kalmalıdır.
            </p>
          </div>
          <Button onClick={runScan} disabled={loading} size="sm">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Taranıyor…</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-1" /> Yeniden Tara</>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Toplam Kayıt</div>
            <div className="text-2xl font-bold">{totalRows}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Benzersiz Grup</div>
            <div className="text-2xl font-bold">{totalGroups}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Yinelenen Grup</div>
            <div className={`text-2xl font-bold ${healthy ? "text-emerald-600" : "text-destructive"}`}>
              {duplicates.length}
            </div>
          </Card>
        </div>

        {error && (
          <Card className="p-4 border-destructive/40">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          </Card>
        )}

        {!error && healthy && (
          <Card className="p-6">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Tablo sağlıklı — yinelenen kayıt yok.</span>
            </div>
            {lastRun && (
              <div className="text-xs text-muted-foreground mt-1">
                Son tarama: {lastRun.toLocaleString("tr-TR")}
              </div>
            )}
          </Card>
        )}

        {!error && !healthy && (
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h2 className="font-semibold">Yinelenen Kayıtlar</h2>
              <Badge variant="destructive">{duplicates.length}</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2">case_id</th>
                    <th className="text-left py-2">round_number</th>
                    <th className="text-left py-2">Kayıt Sayısı</th>
                    <th className="text-left py-2">Row IDs</th>
                  </tr>
                </thead>
                <tbody>
                  {duplicates.map((d) => (
                    <tr key={`${d.case_id}-${d.round_number}`} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{d.case_id}</td>
                      <td className="py-2">{d.round_number}</td>
                      <td className="py-2">
                        <Badge variant="destructive">{d.count}</Badge>
                      </td>
                      <td className="py-2 font-mono text-xs text-muted-foreground">
                        {d.ids.slice(0, 3).join(", ")}
                        {d.ids.length > 3 && ` … (+${d.ids.length - 3})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
