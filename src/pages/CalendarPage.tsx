import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { format, differenceInDays, startOfDay } from "date-fns";
import { tr } from "date-fns/locale";
import { Loader2, Calendar as CalIcon } from "lucide-react";
import { AppNavbar } from "@/components/AppNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Item {
  kind: "session" | "deadline";
  date: string;
  case_id: string;
  label: string;
  application_no?: string | null;
}

function colorFor(days: number) {
  if (days < 0) return "bg-black text-white";
  if (days <= 3) return "bg-destructive text-destructive-foreground";
  if (days <= 7) return "bg-warning text-warning-foreground";
  return "bg-success text-success-foreground";
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isLoading && !user) navigate("/auth"); }, [isLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: sessions }, { data: cases }] = await Promise.all([
        supabase.from("case_sessions").select("id,case_id,scheduled_at,status").order("scheduled_at", { ascending: true }),
        supabase.from("cases").select("id,application_no,title,deadline").not("deadline", "is", null),
      ]);
      const caseMap = new Map((cases ?? []).map((c: any) => [c.id, c]));
      const list: Item[] = [];
      (sessions ?? []).forEach((s: any) => {
        if (s.status === "completed") return;
        const c = caseMap.get(s.case_id) as any;
        list.push({
          kind: "session",
          date: s.scheduled_at,
          case_id: s.case_id,
          label: `Toplantı — ${c?.title ?? c?.application_no ?? "Başvuru"}`,
          application_no: c?.application_no,
        });
      });
      (cases ?? []).forEach((c: any) => {
        if (!c.deadline) return;
        list.push({
          kind: "deadline",
          date: c.deadline,
          case_id: c.id,
          label: `Yasal süre — ${c.title ?? c.application_no ?? "Başvuru"}`,
          application_no: c.application_no,
        });
      });
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setItems(list);
      setLoading(false);
    })();
  }, [user]);

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    items.forEach((it) => {
      const key = format(startOfDay(new Date(it.date)), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    });
    return Array.from(map.entries());
  }, [items]);

  if (isLoading || !user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Takvim | MediPact AI</title></Helmet>
      <AppNavbar />
      <main className="container max-w-4xl py-6 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold">📅 Takvim</h1>
          <p className="text-sm text-muted-foreground">Yaklaşan toplantılar ve yasal süreler.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : grouped.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
              <CalIcon className="h-10 w-10" />
              <p>Planlı toplantı veya süre yok.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {grouped.map(([day, list]) => (
              <Card key={day}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {format(new Date(day), "EEEE, d MMMM yyyy", { locale: tr })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {list.map((it, i) => {
                    const days = differenceInDays(new Date(it.date), new Date());
                    return (
                      <div
                        key={i}
                        onClick={() => navigate(`/cases/${it.case_id}`)}
                        className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant={it.kind === "session" ? "default" : "outline"}>
                            {it.kind === "session" ? "Toplantı" : "Süre"}
                          </Badge>
                          <span className="truncate text-sm">{it.label}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">{format(new Date(it.date), "HH:mm")}</span>
                          <Badge className={colorFor(days)}>
                            {days < 0 ? `${Math.abs(days)}g geçti` : days === 0 ? "Bugün" : `${days}g`}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
