import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, BookOpen, CheckCircle2, Clock3, Loader2, RefreshCw, XCircle } from "lucide-react";

interface Job {
  id: string;
  status: string;
  total_books: number;
  processed_books: number;
  total_chunks: number;
  current_book: string | null;
  errors: any[];
  started_at: string;
  updated_at: string;
  finished_at: string | null;
}

const statusLabels: Record<string, string> = {
  pending: "Beklemede",
  running: "Çalışıyor",
  completed: "Tamamlandı",
  completed_with_errors: "Hatalarla tamamlandı",
  failed: "Başarısız",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function minutesSince(value?: string | null) {
  if (!value) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
}

function statusIcon(status?: string) {
  if (status === "completed") return <CheckCircle2 className="w-4 h-4" />;
  if (status === "failed") return <XCircle className="w-4 h-4" />;
  if (status === "completed_with_errors") return <AlertTriangle className="w-4 h-4" />;
  return <Clock3 className="w-4 h-4" />;
}

export function KnowledgeBaseAdmin() {
  const { toast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [starting, setStarting] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("knowledge_base_jobs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setJob(data as any);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  const start = async () => {
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("build-knowledge-base");
      if (error) throw error;
      toast({ title: "Bilgi tabanı güncelleme başlatıldı", description: `${data?.total_books ?? 19} kitap işlenecek.` });
      await load();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message ?? "Başlatılamadı", variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  const running = job?.status === "running" || job?.status === "pending";
  const pct = job && job.total_books > 0 ? Math.round((job.processed_books / job.total_books) * 100) : 0;
  const staleMinutes = running ? minutesSince(job?.updated_at) : null;
  const isStale = staleMinutes !== null && staleMinutes >= 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="w-4 h-4" />
          Bilgi Tabanı (Adalet Bakanlığı Yayınları)
        </CardTitle>
        <CardDescription>
          AI'ın analizlerde kullandığı 19 resmi arabuluculuk kitabı. PDF'ler nadiren değişir, manuel güncelleyin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={start} disabled={starting || running} size="sm">
            {starting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Bilgi Tabanını Güncelle
          </Button>
          {job && (
            <Badge className="gap-1" variant={job.status === "completed" ? "default" : job.status === "failed" ? "destructive" : "secondary"}>
              {statusIcon(job.status)}
              {statusLabels[job.status] ?? job.status}
            </Badge>
          )}
        </div>

        {job && (
          <div className="space-y-3 text-sm">
            <Progress value={pct} />
            <div className="grid gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">İlerleme</div>
                <div className="font-medium">{job.processed_books}/{job.total_books} kitap · %{pct}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Oluşturulan parça</div>
                <div className="font-medium">{job.total_chunks}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Son çalıştırma</div>
                <div className="font-medium">{formatDate(job.started_at)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Son güncelleme</div>
                <div className="font-medium">{formatDate(job.updated_at)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Bitiş zamanı</div>
                <div className="font-medium">{formatDate(job.finished_at)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">İş ID</div>
                <div className="truncate font-mono text-xs">{job.id}</div>
              </div>
            </div>
            {job.current_book && running && (
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                <div className="text-xs text-muted-foreground">Şu an işlenen PDF</div>
                <div className="font-medium text-foreground">{job.current_book}</div>
              </div>
            )}
            {isStale && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive">
                <AlertTriangle className="mt-0.5 w-4 h-4" />
                <div>
                  <div className="font-medium">İş ilerlemiyor olabilir</div>
                  <div className="text-xs">Son güncellemeden bu yana {staleMinutes} dakika geçti. PDF indirme, metin çıkarma veya embedding isteği takılmış olabilir.</div>
                </div>
              </div>
            )}
            {Array.isArray(job.errors) && job.errors.length > 0 && (
              <div className="rounded border border-destructive/30 bg-destructive/5 p-2 text-xs">
                <div className="font-medium mb-1">Hatalar ({job.errors.length}):</div>
                <ul className="list-disc list-inside space-y-1">
                  {job.errors.map((e: any, i: number) => (
                    <li key={i}>{e.book ?? "?"} — {e.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
