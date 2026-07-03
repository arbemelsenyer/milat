import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RefreshCw, FileText, ExternalLink, Upload, Plus, Trash2, Eye, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TemplateRow {
  id: string;
  template_type: string;
  template_content: string | null;
  source_url: string | null;
  is_active: boolean;
  uploaded_at: string;
}

const KNOWN_MINISTRY_TYPES = [
  "dava_sarti_anlasma",
  "dava_sarti_anlasamamama",
  "dava_sarti_ilk_oturum",
  "ihtiyari_anlasma",
  "ihtiyari_anlasamamama",
  "ihtiyari_davet",
  "isci_isveren_davet",
  "ticari_davet",
  "tuketici_davet",
];

const TEMPLATE_TYPES = [
  "isci_isveren_anlasma", "ticari_anlasma", "tuketici_anlasma", "kira_anlasma", "ortaklik_anlasma", "ihtiyari_anlasma",
  "isci_isveren_anlasamamama", "ticari_anlasamamama", "kira_anlasamamama", "ortaklik_anlasamamama", "ihtiyari_anlasamamama",
  "isci_isveren_ilk_oturum", "ticari_ilk_oturum",
  "isci_isveren_davet", "ticari_davet", "tuketici_davet", "ihtiyari_davet",
  "isci_isveren_ucret", "ticari_ucret",
  "bilgilendirme_tutanagi",
  "dava_sarti_anlasma", "dava_sarti_anlasamamama", "dava_sarti_ilk_oturum",
  "diger",
];

type UploadResult = {
  name: string;
  ok: boolean;
  error?: string;
  template_type?: string;
  auto_detected?: boolean;
  needs_manual?: boolean;
};

export function TemplateAdmin() {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [singleBusy, setSingleBusy] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<TemplateRow | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState("");
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [manualOverride, setManualOverride] = useState<Record<string, string>>({});
  const [reassigning, setReassigning] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("document_templates" as any).select("*").order("template_type");
    setRows((data as any) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function refreshAll() {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-document-templates", { body: {} });
      if (error) throw error;
      const results = (data as any)?.results || [];
      const ok = results.filter((r: any) => r.ok).length;
      const fail = results.length - ok;
      toast({
        title: fail === 0 ? "Şablonlar güncellendi" : `${ok} başarılı, ${fail} başarısız`,
        description: fail > 0 ? results.filter((r: any) => !r.ok).map((r: any) => `${r.template_type}: ${r.error}`).join("\n") : undefined,
        variant: fail > 0 ? "destructive" : "default",
      });
      await load();
    } catch (e: any) {
      toast({ title: "Güncelleme başarısız", description: e.message, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  }

  async function refreshSingle(t: TemplateRow) {
    if (!t.source_url) return;
    setSingleBusy(t.template_type);
    try {
      const { data, error } = await supabase.functions.invoke("seed-document-templates", {
        body: { only: [t.template_type] },
      });
      if (error) throw error;
      const r = (data as any)?.results?.[0];
      if (r?.ok) {
        toast({ title: `${t.template_type} güncellendi`, description: `${r.chars} karakter` });
      } else {
        toast({ title: "Güncelleme başarısız", description: r?.error, variant: "destructive" });
      }
      await load();
    } catch (e: any) {
      toast({ title: "Güncelleme başarısız", description: e.message, variant: "destructive" });
    } finally {
      setSingleBusy(null);
    }
  }

  async function toggleActive(row: TemplateRow) {
    setTogglingId(row.id);
    const { error } = await supabase
      .from("document_templates" as any)
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) {
      toast({ title: "Güncelleme başarısız", description: error.message, variant: "destructive" });
    } else {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_active: !row.is_active } : r)));
    }
    setTogglingId(null);
  }

  async function deleteRow(row: TemplateRow) {
    if (!confirm(`"${row.template_type}" şablonunu silmek istediğinize emin misiniz?`)) return;
    setDeletingId(row.id);
    const { error } = await supabase.from("document_templates" as any).delete().eq("id", row.id);
    if (error) {
      toast({ title: "Silme başarısız", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Şablon silindi" });
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    }
    setDeletingId(null);
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    for (const f of files) {
      if (f.size > 20 * 1024 * 1024) { toast({ title: `${f.name} 20MB'ı aşıyor`, variant: "destructive" }); return; }
      const nm = f.name.toLowerCase();
      if (!(nm.endsWith(".docx") || nm.endsWith(".txt") || nm.endsWith(".pdf"))) {
        toast({ title: `${f.name}: sadece PDF, DOCX veya TXT kabul edilir`, variant: "destructive" });
        return;
      }
    }

    setUploading(true);
    setUploadResults([]);
    setManualOverride({});
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast({ title: "Oturum bulunamadı", variant: "destructive" }); setUploading(false); return; }
    const projectUrl = (supabase as any).supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
    const results: UploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadStage(`${i + 1}/${files.length} — Tür otomatik tespit ediliyor: ${file.name}`);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`${projectUrl}/functions/v1/admin-upload-template`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        results.push({
          name: file.name,
          ok: true,
          template_type: data.template_type,
          auto_detected: data.auto_detected,
          needs_manual: data.needs_manual,
        });
      } catch (err: any) {
        results.push({ name: file.name, ok: false, error: err?.message ?? "Bilinmeyen hata" });
      }
      setUploadResults([...results]);
    }

    const ok = results.filter((r) => r.ok).length;
    const undetected = results.filter((r) => r.ok && r.needs_manual).length;
    setUploadStage(`Tamamlandı: ${ok}/${files.length} başarılı${undetected ? `, ${undetected} tür tespit edilemedi` : ""} ✅`);
    toast({
      title: ok === files.length ? "Yükleme tamamlandı" : `${ok}/${files.length} başarılı`,
      variant: ok === files.length ? "default" : "destructive",
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(false);
    await load();
    setTimeout(() => setUploadStage(""), 8000);
  }

  const reassignTemplate = async (fileName: string) => {
    const newType = manualOverride[fileName];
    if (!newType) return;
    setReassigning(fileName);
    try {
      const { data: row, error: readErr } = await supabase
        .from("document_templates" as any)
        .select("template_content, source_url")
        .eq("template_type", "diger")
        .maybeSingle();
      if (readErr) throw readErr;
      if (!row) throw new Error("'diger' kaydı bulunamadı — yeniden yükleyin.");
      const { error: upErr } = await supabase.from("document_templates" as any).upsert({
        template_type: newType,
        template_content: (row as any).template_content,
        source_url: (row as any).source_url,
        is_active: true,
        uploaded_at: new Date().toISOString(),
      }, { onConflict: "template_type" });
      if (upErr) throw upErr;
      await supabase.from("document_templates" as any).delete().eq("template_type", "diger");
      toast({ title: "Tür güncellendi", description: `${fileName} → ${newType}` });
      setUploadResults((prev) => prev.map((r) => r.name === fileName ? { ...r, template_type: newType, needs_manual: false, auto_detected: false } : r));
      await load();
    } catch (e: any) {
      toast({ title: "Güncelleme başarısız", description: e.message, variant: "destructive" });
    } finally {
      setReassigning(null);
    }
  };

  const missing = KNOWN_MINISTRY_TYPES.filter((t) => !rows.some((r) => r.template_type === t));

  return (
    <>
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2 flex-wrap">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Şablon Yönetimi
          </CardTitle>
          <CardDescription>
            Bakanlık şablonları + manuel yüklenen şablonlar — belge üretiminde kullanılır.
          </CardDescription>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.txt,.pdf"
            multiple
            hidden
            onChange={handleFilesSelected}
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Yeni Şablon Ekle
          </Button>
          <Button onClick={refreshAll} disabled={refreshing}>
            {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Bakanlıktan Güncelle
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {(uploadStage || uploadResults.length > 0) && (
          <div className="mb-3 rounded border bg-muted/40 p-3 space-y-2 text-xs">
            {uploadStage && <div className="text-muted-foreground">{uploadStage}</div>}
            {uploadResults.map((r) => (
              <div key={r.name} className="flex items-center gap-2 flex-wrap">
                <span className="font-mono">{r.name}</span>
                {r.ok ? (
                  r.needs_manual ? (
                    <>
                      <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50 gap-1">
                        <AlertTriangle className="w-3 h-3" /> Tür tespit edilemedi, lütfen manuel seçin
                      </Badge>
                      <Select
                        value={manualOverride[r.name] ?? ""}
                        onValueChange={(v) => setManualOverride((p) => ({ ...p, [r.name]: v }))}
                      >
                        <SelectTrigger className="h-7 w-56 text-xs"><SelectValue placeholder="Şablon türü seçin" /></SelectTrigger>
                        <SelectContent>
                          {TEMPLATE_TYPES.filter((t) => t !== "diger").map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!manualOverride[r.name] || reassigning === r.name}
                        onClick={() => reassignTemplate(r.name)}
                      >
                        {reassigning === r.name ? <Loader2 className="w-3 h-3 animate-spin" /> : "Kaydet"}
                      </Button>
                    </>
                  ) : (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Tür: {r.template_type}
                    </Badge>
                  )
                ) : (
                  <Badge variant="destructive">Hata: {r.error}</Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2">
            {missing.length > 0 && (
              <div className="p-2 rounded border border-amber-300 bg-amber-50 text-amber-900 text-xs">
                Yüklenmemiş bakanlık şablonları: {missing.join(", ")} — "Bakanlıktan Güncelle" butonuna tıklayın.
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Şablon Türü</th>
                    <th className="py-2 pr-4">Karakter</th>
                    <th className="py-2 pr-4">Yüklenme</th>
                    <th className="py-2 pr-4">Aktif</th>
                    <th className="py-2 pr-4">Kaynak</th>
                    <th className="py-2 pr-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const empty = !r.template_content || r.template_content.length === 0;
                    const isMinistry = !!r.source_url && r.source_url.startsWith("http");
                    return (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono text-xs">
                          {r.template_type}
                          {empty && <Badge variant="destructive" className="ml-2">Boş</Badge>}
                        </td>
                        <td className="py-2 pr-4">{r.template_content?.length ?? 0}</td>
                        <td className="py-2 pr-4 whitespace-nowrap text-xs">{new Date(r.uploaded_at).toLocaleString("tr-TR")}</td>
                        <td className="py-2 pr-4">
                          <Switch
                            checked={r.is_active}
                            disabled={togglingId === r.id}
                            onCheckedChange={() => toggleActive(r)}
                          />
                        </td>
                        <td className="py-2 pr-4">
                          {isMinistry ? (
                            <a href={r.source_url!} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 text-xs">
                              <ExternalLink className="w-3 h-3" /> Bakanlık
                            </a>
                          ) : r.source_url ? (
                            <span className="text-xs text-muted-foreground">Manuel</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => setPreview(r)} title="Önizleme">
                              <Eye className="w-3 h-3" />
                            </Button>
                            {isMinistry && (
                              <Button size="sm" variant="outline" disabled={singleBusy === r.template_type} onClick={() => refreshSingle(r)} title="Bakanlıktan güncelle">
                                {singleBusy === r.template_type ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={deletingId === r.id} onClick={() => deleteRow(r)} title="Sil">
                              {deletingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">{preview?.template_type}</DialogTitle>
        </DialogHeader>
        <pre className="text-xs whitespace-pre-wrap overflow-auto flex-1 bg-muted/30 p-3 rounded">
          {preview?.template_content || "(boş)"}
        </pre>
      </DialogContent>
    </Dialog>
    </>
  );
}
