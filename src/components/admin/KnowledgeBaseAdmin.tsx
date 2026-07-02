import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, BookOpen, CheckCircle2, Clock3, Loader2, RefreshCw, Trash2, Upload, XCircle } from "lucide-react";
import { GoogleDriveImporter } from "./GoogleDriveImporter";

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
  const [testing, setTesting] = useState(false);
  const resumingRef = useState<{ current: string | null }>({ current: null })[0];

  const load = async () => {
    const { data } = await supabase
      .from("knowledge_base_jobs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setJob(data as any);
    return data as Job | null;
  };

  // Otomatik sürdürme: iş running ise her tick'te bir sonraki kitabı işlemek için fonksiyonu yeniden çağır.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const current = await load();
      if (cancelled || !current) return;
      const isActive = current.status === "running" || current.status === "pending";
      if (!isActive) return;
      if (resumingRef.current === current.id) return; // bu iş için zaten resume akıyor
      if (current.processed_books >= current.total_books) return;
      resumingRef.current = current.id;
      try {
        await supabase.functions.invoke("build-knowledge-base", {
          body: { resume_job_id: current.id },
        });
      } catch (e) {
        console.error("resume failed", e);
      } finally {
        resumingRef.current = null;
        load();
      }
    };
    tick();
    const t = setInterval(tick, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const [legalRunning, setLegalRunning] = useState(false);
  const [legalResult, setLegalResult] = useState<any>(null);

  const runLegalKnowledge = async () => {
    setLegalRunning(true);
    setLegalResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("build-legal-knowledge", { body: {} });
      if (error) throw error;
      setLegalResult(data);
      const ok = (data?.results ?? []).filter((r: any) => r.ok).length;
      toast({
        title: "Mevzuat & tarife eklendi",
        description: `${ok}/${data?.total_sources ?? 0} kaynak · ${data?.total_chunks ?? 0} chunk · 2026 tarifesinden ${data?.tarife_kalem_sayisi ?? 0} kalem çıkarıldı.`,
      });
    } catch (e: any) {
      toast({ title: "Hata", description: e.message ?? "İşlem başarısız", variant: "destructive" });
    } finally {
      setLegalRunning(false);
    }
  };

  const [retrying, setRetrying] = useState(false);

  const start = async (mode: "all" | "test" | "retry" = "all") => {
    if (mode === "test") setTesting(true);
    else if (mode === "retry") setRetrying(true);
    else setStarting(true);
    try {
      const body = mode === "test" ? { test: true } : mode === "retry" ? { retry_skipped: true } : {};
      const { data, error } = await supabase.functions.invoke("build-knowledge-base", { body });
      if (error) throw error;
      toast({
        title: mode === "test"
          ? "Tek PDF test başlatıldı"
          : mode === "retry"
            ? "Atlanan kitaplar yeniden işleniyor (sayfa bölümleri halinde)"
            : "Bilgi tabanı güncelleme başlatıldı",
        description: `${data?.total_books ?? 0} kitap kuyruğa alındı.`,
      });
      await load();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message ?? "Başlatılamadı", variant: "destructive" });
    } finally {
      setStarting(false);
      setTesting(false);
      setRetrying(false);
    }
  };

  const running = job?.status === "running" || job?.status === "pending";
  const pct = job && job.total_books > 0 ? Math.round((job.processed_books / job.total_books) * 100) : 0;
  const staleMinutes = running ? minutesSince(job?.updated_at) : null;
  const isStale = staleMinutes !== null && staleMinutes >= 10;

  // --- Manuel kaynak yükleme (multi-file + KB/Template mode) ---
  const CATEGORIES = [
    "kira", "gayrimenkul", "işçi_işveren", "ticari", "tüketici",
    "sağlık", "fikri_mülkiyet", "inşaat", "sigorta", "bankacılık",
    "aile", "spor", "enerji_maden", "mevzuat", "genel",
  ];
  // Auto-detect kapsamındaki bilinen şablon türleri (manuel override için).
  const TEMPLATE_TYPES = [
    "isci_isveren_anlasma", "ticari_anlasma", "tuketici_anlasma", "kira_anlasma", "ortaklik_anlasma", "ihtiyari_anlasma",
    "isci_isveren_anlasamamama", "ticari_anlasamamama", "kira_anlasamamama", "ortaklik_anlasamamama", "ihtiyari_anlasamamama",
    "isci_isveren_ilk_oturum", "ticari_ilk_oturum",
    "isci_isveren_davet", "ticari_davet", "tuketici_davet", "ihtiyari_davet",
    "isci_isveren_ucret", "ticari_ucret",
    "bilgilendirme_tutanagi",
    "dava_sarti_anlasma", "dava_sarti_anlasamamama", "dava_sarti_ilk_oturum",
  ];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState<string>("genel");
  const [uploadMode, setUploadMode] = useState<"knowledge" | "template">("knowledge");
  const [uploadStage, setUploadStage] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  type UploadResult = { name: string; ok: boolean; error?: string; chunks?: number; template_type?: string; auto_detected?: boolean; needs_manual?: boolean };
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [manualOverride, setManualOverride] = useState<Record<string, string>>({});
  const [reassigning, setReassigning] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!uploadFiles.length) { toast({ title: "Dosya seçin", variant: "destructive" }); return; }
    if (uploadMode === "knowledge" && !uploadTitle.trim() && uploadFiles.length === 1) {
      toast({ title: "Kaynak adı zorunludur", variant: "destructive" }); return;
    }
    for (const f of uploadFiles) {
      if (f.size > 20 * 1024 * 1024) { toast({ title: `${f.name} 20MB'ı aşıyor`, variant: "destructive" }); return; }
      const nm = f.name.toLowerCase();
      if (!(nm.endsWith(".pdf") || nm.endsWith(".docx") || nm.endsWith(".txt"))) {
        toast({ title: `${f.name}: sadece PDF, DOCX veya TXT kabul edilir`, variant: "destructive" }); return;
      }
    }
    setUploading(true);
    setUploadResults([]);
    setManualOverride({});
    setUploadProgress({ done: 0, total: uploadFiles.length });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast({ title: "Oturum bulunamadı", variant: "destructive" }); setUploading(false); return; }
    const projectUrl = (supabase as any).supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
    const results: UploadResult[] = [];
    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      setUploadStage(
        uploadMode === "template"
          ? `${i + 1}/${uploadFiles.length} — Tür otomatik tespit ediliyor: ${file.name}`
          : `${i + 1}/${uploadFiles.length} dosya işleniyor: ${file.name}`
      );
      try {
        const form = new FormData();
        form.append("file", file);
        let endpoint = "";
        if (uploadMode === "template") {
          // template_type göndermiyoruz — sunucu otomatik tespit edecek.
          endpoint = "admin-upload-template";
        } else {
          const title = (uploadFiles.length === 1 && uploadTitle.trim()) ? uploadTitle.trim() : file.name.replace(/\.[^.]+$/, "");
          form.append("title", title);
          form.append("category", uploadCategory);
          endpoint = "admin-upload-knowledge";
        }
        const res = await fetch(`${projectUrl}/functions/v1/${endpoint}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        results.push({
          name: file.name, ok: true, chunks: data.chunks,
          template_type: data.template_type,
          auto_detected: data.auto_detected,
          needs_manual: data.needs_manual,
        });
      } catch (e: any) {
        results.push({ name: file.name, ok: false, error: e?.message ?? "Bilinmeyen hata" });
      }
      setUploadProgress({ done: i + 1, total: uploadFiles.length });
      setUploadResults([...results]);
    }
    const ok = results.filter((r) => r.ok).length;
    const fail = results.length - ok;
    const undetected = results.filter((r) => r.ok && r.needs_manual).length;
    setUploadStage(
      `Tamamlandı: ${uploadFiles.length} dosyadan ${ok}'i başarılı${fail ? `, ${fail} hata` : ""}${undetected ? `, ${undetected} tür tespit edilemedi` : ""} ✅`
    );
    toast({
      title: fail === 0 ? "Yükleme tamamlandı" : `${ok}/${uploadFiles.length} başarılı`,
      description: fail > 0 ? `${fail} dosyada hata oluştu — detaylar aşağıda.` : undefined,
      variant: fail > 0 ? "destructive" : "default",
    });
    setUploadFiles([]);
    setUploadTitle("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(false);
    await loadSources();
    setTimeout(() => setUploadStage(""), 8000);
  };

  // Manuel tür seçildikten sonra "diger" olarak kaydedilen şablonu doğru türe taşı.
  const reassignTemplate = async (fileName: string) => {
    const newType = manualOverride[fileName];
    if (!newType) return;
    setReassigning(fileName);
    try {
      // "diger" satırını yeni türle güncelle (upsert conflict = template_type).
      // Basitlik için: mevcut "diger" içeriğini oku, yeni tür ile upsert et, sonra "diger"'i sil.
      const { data: row, error: readErr } = await supabase
        .from("document_templates")
        .select("template_content, source_url")
        .eq("template_type", "diger")
        .maybeSingle();
      if (readErr) throw readErr;
      if (!row) throw new Error("'diger' kaydı bulunamadı — yeniden yükleyin.");
      const { error: upErr } = await supabase.from("document_templates").upsert({
        template_type: newType,
        template_content: row.template_content,
        source_url: row.source_url,
        is_active: true,
        uploaded_at: new Date().toISOString(),
      }, { onConflict: "template_type" });
      if (upErr) throw upErr;
      await supabase.from("document_templates").delete().eq("template_type", "diger");
      toast({ title: "Tür güncellendi", description: `${fileName} → ${newType}` });
      setUploadResults((prev) => prev.map((r) => r.name === fileName ? { ...r, template_type: newType, needs_manual: false, auto_detected: false } : r));
    } catch (e: any) {
      toast({ title: "Güncelleme başarısız", description: e.message, variant: "destructive" });
    } finally {
      setReassigning(null);
    }
  };

  // --- Kaynak listesi ---
  type SourceRow = { source_title: string; source_url: string | null; category: string; chunk_count: number; latest: string };
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadSources = async () => {
    setSourcesLoading(true);
    try {
      const { data, error } = await supabase
        .from("knowledge_base_chunks")
        .select("source_title, source_url, category, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      const map = new Map<string, SourceRow>();
      for (const r of (data ?? []) as any[]) {
        const key = r.source_url ?? r.source_title;
        const existing = map.get(key);
        if (existing) {
          existing.chunk_count += 1;
          if (r.created_at > existing.latest) existing.latest = r.created_at;
        } else {
          map.set(key, { source_title: r.source_title, source_url: r.source_url, category: r.category, chunk_count: 1, latest: r.created_at });
        }
      }
      setSources(Array.from(map.values()).sort((a, b) => b.latest.localeCompare(a.latest)));
    } catch (e: any) {
      console.error(e);
    } finally {
      setSourcesLoading(false);
    }
  };

  useEffect(() => { loadSources(); }, []);

  const deleteSource = async (row: SourceRow) => {
    if (!confirm(`"${row.source_title}" kaynağını ve ${row.chunk_count} chunk'ını silmek istediğinize emin misiniz?`)) return;
    setDeleting(row.source_url ?? row.source_title);
    try {
      const body: any = row.source_url ? { source_url: row.source_url } : { source_title: row.source_title };
      const { data, error } = await supabase.functions.invoke("admin-delete-knowledge", { body });
      if (error) throw error;
      toast({ title: "Kaynak silindi", description: `${data?.deleted ?? 0} chunk kaldırıldı.` });
      await loadSources();
    } catch (e: any) {
      toast({ title: "Silme başarısız", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };


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
          <Button onClick={() => start("all")} disabled={starting || testing || retrying || running} size="sm">
            {starting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Bilgi Tabanını Güncelle
          </Button>
          <Button onClick={() => start("retry")} disabled={starting || testing || retrying || running} size="sm" variant="secondary">
            {retrying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Atlanan Kitapları Yeniden Dene (sayfa bölümleri)
          </Button>
          <Button onClick={() => start("test")} disabled={starting || testing || retrying || running} size="sm" variant="outline">
            {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Tek PDF ile Test Et
          </Button>
          <Button onClick={runLegalKnowledge} disabled={legalRunning} size="sm" variant="secondary">
            {legalRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookOpen className="w-4 h-4 mr-2" />}
            Mevzuat & Tarife Ekle
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
        {legalResult && (
          <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
            <div className="font-medium">Mevzuat & Tarife sonucu</div>
            <div className="text-xs text-muted-foreground">
              {legalResult.total_chunks} chunk · 2026 tarifesinden {legalResult.tarife_kalem_sayisi ?? 0} kalem parse edildi.
            </div>
            <ul className="space-y-1 text-xs">
              {(legalResult.results ?? []).map((r: any, i: number) => (
                <li key={i} className={r.ok ? "text-foreground" : "text-destructive"}>
                  {r.ok ? "✓" : "✗"} {r.title} {r.ok ? `— ${r.chunks} chunk${r.kalemler != null ? `, ${r.kalemler} kalem` : ""}` : `— ${r.error}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Manuel Kaynak Yükleme — toplu (multi-file) */}
        <div className="mt-4 space-y-3 rounded-md border bg-muted/20 p-4">
          <div className="flex items-center gap-2 font-medium text-sm">
            <Upload className="w-4 h-4" /> Manuel Kaynak Yükle (Toplu)
          </div>
          <p className="text-xs text-muted-foreground">
            Birden fazla PDF/DOCX/TXT dosyası (her biri max 20MB). Sırayla işlenir; bir dosya hata verirse diğerlerine devam edilir.
          </p>

          {/* Mode selector */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Kategori *</Label>
              <Select value={uploadMode} onValueChange={(v) => setUploadMode(v as any)} disabled={uploading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="knowledge">Bilgi Tabanı</SelectItem>
                  <SelectItem value="template">Şablon Olarak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {uploadMode === "knowledge" ? (
              <div className="space-y-1.5">
                <Label>Bilgi Tabanı Kategorisi *</Label>
                <Select value={uploadCategory} onValueChange={setUploadCategory} disabled={uploading}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Şablon Türü</Label>
                <div className="rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
                  Tür: <span className="italic">otomatik tespit ediliyor (dosya içeriğinden)</span>
                </div>
              </div>
            )}
            {uploadMode === "knowledge" && uploadFiles.length === 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="kb-title">Kaynak Adı (tek dosya)</Label>
                <Input
                  id="kb-title"
                  placeholder="(boş bırakılırsa dosya adı)"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  disabled={uploading}
                  maxLength={200}
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kb-file">Dosya(lar) *</Label>
            <Input
              id="kb-file"
              ref={fileInputRef}
              type="file"
              multiple={uploadMode === "knowledge"}
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={(e) => setUploadFiles(Array.from(e.target.files ?? []))}
              disabled={uploading}
            />
            {uploadFiles.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {uploadFiles.length} dosya seçildi · toplam {(uploadFiles.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>

          {uploading && uploadProgress.total > 0 && (
            <div className="space-y-1">
              <Progress value={Math.round((uploadProgress.done / uploadProgress.total) * 100)} />
              <div className="text-xs text-muted-foreground">
                {uploadProgress.done}/{uploadProgress.total} dosya işlendi
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={handleUpload} disabled={uploading || uploadFiles.length === 0} size="sm">
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploadFiles.length > 1 ? `${uploadFiles.length} Dosyayı Yükle` : "Yükle ve İşle"}
            </Button>
            {uploadStage && <span className="text-xs text-muted-foreground">{uploadStage}</span>}
          </div>

          {uploadResults.length > 0 && (
            <div className="rounded border bg-background p-3 space-y-1 max-h-48 overflow-y-auto">
              <div className="text-xs font-medium">Sonuçlar ({uploadResults.filter((r) => r.ok).length}/{uploadResults.length})</div>
              <ul className="text-xs space-y-1">
                {uploadResults.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span className="truncate">{r.name}</span>
                    {r.ok
                      ? <span className="text-emerald-700">✓ {r.chunks != null ? `${r.chunks} chunk` : "OK"}</span>
                      : <span className="text-destructive">✗ {r.error}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {/* Google Drive'dan İçe Aktar */}
        <div className="mt-4">
          <GoogleDriveImporter />
        </div>


        {/* Yüklenmiş Kaynaklar Listesi */}
        <div className="mt-4 space-y-2 rounded-md border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Yüklenmiş Kaynaklar ({sources.length})</div>
            <Button size="sm" variant="ghost" onClick={loadSources} disabled={sourcesLoading}>
              {sourcesLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </Button>
          </div>
          {sourcesLoading && sources.length === 0 ? (
            <div className="text-xs text-muted-foreground">Yükleniyor...</div>
          ) : sources.length === 0 ? (
            <div className="text-xs text-muted-foreground">Henüz kaynak yüklenmemiş.</div>
          ) : (
            <ul className="divide-y max-h-80 overflow-y-auto">
              {sources.map((s) => {
                const key = s.source_url ?? s.source_title;
                return (
                  <li key={key} className="flex items-start justify-between gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-sm">{s.source_title}</div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-0.5">
                        <Badge variant="outline" className="text-[10px]">{s.category}</Badge>
                        <span>{s.chunk_count} chunk</span>
                        <span>· {formatDate(s.latest)}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteSource(s)}
                      disabled={deleting === key}
                      className="text-destructive hover:text-destructive shrink-0"
                    >
                      {deleting === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

