import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { format, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Plus, Loader2, FolderOpen, Search } from "lucide-react";
import { AppNavbar } from "@/components/AppNavbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface CaseRow {
  id: string;
  status: string;
  title: string | null;
  application_no: string | null;
  dispute_type: string | null;
  your_name: string | null;
  other_party_name: string | null;
  outcome: string | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

const CLOSED = ["completed", "resolved", "closed", "archived"];

function statusPhase(status: string): number {
  const map: Record<string, number> = {
    draft: 1, submitted: 2, assigned: 4, scheduled: 5,
    in_progress: 5, completed: 8, resolved: 8,
  };
  return map[status] ?? 1;
}

function deadlineColor(days: number | null): string {
  if (days === null) return "bg-muted text-muted-foreground";
  if (days < 0) return "bg-black text-white";
  if (days <= 3) return "bg-destructive text-destructive-foreground";
  if (days <= 7) return "bg-warning text-warning-foreground";
  return "bg-success text-success-foreground";
}

export default function Cases() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("cases")
        .select("id,status,title,application_no,dispute_type,your_name,other_party_name,outcome,deadline,created_at,updated_at")
        .order("updated_at", { ascending: false });
      setCases((data as CaseRow[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const active = useMemo(
    () => cases.filter((c) => !CLOSED.includes(c.status) && !["anlasma", "anlasamamama"].includes(c.outcome ?? "")),
    [cases]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return active;
    return active.filter((c) =>
      [c.title, c.application_no, c.your_name, c.other_party_name, c.dispute_type]
        .some((v) => (v ?? "").toLowerCase().includes(s))
    );
  }, [active, q]);

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Aktif Başvurular | MediPact AI</title></Helmet>
      <AppNavbar />

      <main className="container max-w-6xl py-6 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold">📁 Aktif Başvurular</h1>
            <p className="text-sm text-muted-foreground">Açık ve devam eden tüm dosyalarınız.</p>
          </div>
          <Button asChild>
            <Link to="/legal-reasoning?new=1"><Plus className="h-4 w-4 mr-2" />Yeni Başvuru</Link>
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Ara: başvuru no, taraf, tür…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
              <FolderOpen className="h-10 w-10" />
              <p>Aktif başvuru bulunmuyor.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((c) => {
              const phase = statusPhase(c.status);
              const days = c.deadline ? differenceInDays(new Date(c.deadline), new Date()) : null;
              return (
                <Card
                  key={c.id}
                  className="hover:border-primary/50 hover:shadow-elegant transition cursor-pointer"
                  onClick={() => navigate(`/cases/${c.id}`)}
                >
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">{c.application_no ?? "—"}</span>
                        <Badge variant="secondary">Aşama {phase}/8</Badge>
                        {c.dispute_type && <Badge variant="outline">{c.dispute_type}</Badge>}
                      </div>
                      <h3 className="font-medium mt-1 truncate">
                        {c.title || `${c.your_name ?? "Taraf 1"} vs ${c.other_party_name ?? "Taraf 2"}`}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Güncelleme: {format(new Date(c.updated_at), "d MMM yyyy", { locale: tr })}
                      </p>
                    </div>
                    <div className="flex flex-col items-start md:items-end gap-1">
                      {c.deadline && (
                        <Badge className={deadlineColor(days)}>
                          {days === null ? "—" : days < 0 ? `${Math.abs(days)}g geçti` : `${days}g kaldı`}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {c.deadline ? `Süre: ${format(new Date(c.deadline), "d MMM", { locale: tr })}` : "Süre belirsiz"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
