import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Loader2, Archive as ArchiveIcon, Search } from "lucide-react";
import { AppNavbar } from "@/components/AppNavbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  id: string;
  title: string | null;
  application_no: string | null;
  dispute_type: string | null;
  your_name: string | null;
  other_party_name: string | null;
  outcome: string | null;
  status: string;
  updated_at: string;
}

const CLOSED_STATUSES = ["completed", "resolved", "closed", "archived"];

export default function Archive() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [outcome, setOutcome] = useState<string>("all");
  const [type, setType] = useState<string>("all");

  useEffect(() => { if (!isLoading && !user) navigate("/auth"); }, [isLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("cases")
        .select("id,title,application_no,dispute_type,your_name,other_party_name,outcome,status,updated_at")
        .order("updated_at", { ascending: false });
      const closed = (data as Row[] ?? []).filter(
        (r) => CLOSED_STATUSES.includes(r.status) || ["anlasma", "anlasamama"].includes(r.outcome ?? "")
      );
      setRows(closed);
      setLoading(false);
    })();
  }, [user]);

  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.dispute_type).filter(Boolean))) as string[], [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (outcome !== "all" && r.outcome !== outcome) return false;
      if (type !== "all" && r.dispute_type !== type) return false;
      if (q.trim()) {
        const s = q.toLowerCase();
        return [r.title, r.application_no, r.your_name, r.other_party_name].some((v) => (v ?? "").toLowerCase().includes(s));
      }
      return true;
    });
  }, [rows, outcome, type, q]);

  if (isLoading || !user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Arşiv | MediPact AI</title></Helmet>
      <AppNavbar />
      <main className="container max-w-6xl py-6 px-4">
        <div className="mb-4">
          <h1 className="text-2xl font-display font-bold">🗄️ Arşiv</h1>
          <p className="text-sm text-muted-foreground">Kapanmış dosyalar. Salt okunur; belgeler görüntülenebilir.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Ara…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={outcome} onValueChange={setOutcome}>
            <SelectTrigger><SelectValue placeholder="Sonuç" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm sonuçlar</SelectItem>
              <SelectItem value="anlasma">Anlaşma</SelectItem>
              <SelectItem value="anlasamama">Anlaşamama</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder="Tür" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm türler</SelectItem>
              {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
              <ArchiveIcon className="h-10 w-10" />
              <p>Arşivlenmiş dosya bulunmuyor.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((r) => (
              <Card key={r.id} className="hover:border-primary/40 cursor-pointer" onClick={() => navigate(`/case-room/${r.id}`)}>
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{r.application_no ?? "—"}</span>
                      {r.dispute_type && <Badge variant="outline">{r.dispute_type}</Badge>}
                      <Badge variant={r.outcome === "anlasma" ? "default" : "secondary"}>
                        {r.outcome === "anlasma" ? "Anlaşma" : r.outcome === "anlasamama" ? "Anlaşamama" : "Kapandı"}
                      </Badge>
                    </div>
                    <h3 className="font-medium mt-1 truncate">
                      {r.title || `${r.your_name ?? "Taraf 1"} vs ${r.other_party_name ?? "Taraf 2"}`}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Kapanış: {format(new Date(r.updated_at), "d MMM yyyy", { locale: tr })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
