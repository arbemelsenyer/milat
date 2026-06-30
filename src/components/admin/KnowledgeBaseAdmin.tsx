import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BookOpen, RefreshCw } from "lucide-react";

interface Job {
  id: string;
  status: string;
  total_books: number;
  processed_books: number;
  total_chunks: number;
  current_book: string | null;
  errors: any[];
  started_at: string;
  finished_at: string | null;
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
        <div className="flex items-center gap-3">
          <Button onClick={start} disabled={starting || running} size="sm">
            {starting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Bilgi Tabanını Güncelle
          </Button>
          {job && (
            <Badge variant={job.status === "completed" ? "default" : job.status === "failed" ? "destructive" : "secondary"}>
              {job.status}
            </Badge>
          )}
        </div>

        {job && (
          <div className="space-y-2 text-sm">
            <Progress value={pct} />
            <div className="text-muted-foreground">
              {job.processed_books}/{job.total_books} kitap işlendi · {job.total_chunks} parça oluşturuldu
              {job.current_book && running && <> · şu an: <span className="text-foreground">{job.current_book}</span></>}
            </div>
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
