import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, ChevronLeft, CloudDownload, FileText, Folder, Loader2, RefreshCw } from "lucide-react";

const CATEGORIES = [
  "kira", "gayrimenkul", "işçi_işveren", "ticari", "tüketici",
  "sağlık", "fikri_mülkiyet", "inşaat", "sigorta", "bankacılık",
  "aile", "spor", "enerji_maden", "mevzuat", "genel",
];

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const ROOT = { id: "root", name: "Drive'ım" };

const ACCEPT_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.folder",
];

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
}

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google Identity Services yüklenemedi"));
    document.head.appendChild(s);
  });
}

function typeLabel(mime: string) {
  if (mime === "application/vnd.google-apps.folder") return "Klasör";
  if (mime === "application/pdf") return "PDF";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "DOCX";
  if (mime === "text/plain") return "TXT";
  if (mime === "application/vnd.google-apps.document") return "Google Docs";
  return mime;
}

export function GoogleDriveImporter() {
  const { toast } = useToast();
  const [clientId, setClientId] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [category, setCategory] = useState("genel");

  const [stack, setStack] = useState<Array<{ id: string; name: string }>>([ROOT]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, DriveFile>>({});
  const [importing, setImporting] = useState(false);
  const [stage, setStage] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const tokenClientRef = useRef<any>(null);

  const currentFolder = stack[stack.length - 1];

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("google-drive-config");
        if (error) throw error;
        if (!data?.configured) {
          setConfigError("Google Drive CLIENT_ID henüz yapılandırılmadı. Aşağıdaki kurulum adımlarını izleyin.");
        } else {
          setClientId(data.clientId);
        }
      } catch (e: any) {
        setConfigError(e?.message ?? "Yapılandırma alınamadı");
      } finally {
        setConfigLoading(false);
      }
    })();
  }, []);

  const connect = async () => {
    if (!clientId) return;
    setConnecting(true);
    try {
      await loadGis();
      const g = (window as any).google;
      tokenClientRef.current = g.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPE,
        prompt: "consent",
        callback: (resp: any) => {
          setConnecting(false);
          if (resp?.access_token) {
            setAccessToken(resp.access_token);
            setStack([ROOT]);
            loadFolder(ROOT.id, resp.access_token);
          } else {
            toast({ title: "Google girişi başarısız", description: resp?.error_description ?? "Bilinmeyen hata", variant: "destructive" });
          }
        },
      });
      tokenClientRef.current.requestAccessToken();
    } catch (e: any) {
      setConnecting(false);
      toast({ title: "Google bağlantısı hatası", description: e?.message ?? String(e), variant: "destructive" });
    }
  };

  const disconnect = () => {
    setAccessToken(null);
    setFiles([]);
    setSelected({});
    setStack([ROOT]);
    setResults(null);
  };

  const loadFolder = async (folderId: string, token?: string) => {
    const tk = token ?? accessToken;
    if (!tk) return;
    setLoadingFiles(true);
    try {
      const mimeFilter = ACCEPT_MIME.map((m) => `mimeType='${m}'`).join(" or ");
      const q = [`'${folderId}' in parents`, `trashed=false`, `(${mimeFilter})`].join(" and ");
      const params = new URLSearchParams({
        q,
        pageSize: "200",
        fields: "files(id,name,mimeType,modifiedTime,size)",
        orderBy: "folder,name",
      });
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      if (res.status === 401) {
        toast({ title: "Oturum sona erdi", description: "Lütfen Google'a tekrar bağlanın.", variant: "destructive" });
        disconnect();
        return;
      }
      if (!res.ok) throw new Error(`Drive API ${res.status}`);
      const j = await res.json();
      setFiles(j.files ?? []);
    } catch (e: any) {
      toast({ title: "Dosyalar yüklenemedi", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setLoadingFiles(false);
    }
  };

  const enterFolder = (f: DriveFile) => {
    setStack((s) => [...s, { id: f.id, name: f.name }]);
    loadFolder(f.id);
  };

  const goBack = () => {
    if (stack.length <= 1) return;
    const next = stack.slice(0, -1);
    setStack(next);
    loadFolder(next[next.length - 1].id);
  };

  const toggleSelect = (f: DriveFile) => {
    setSelected((prev) => {
      const cp = { ...prev };
      if (cp[f.id]) delete cp[f.id];
      else cp[f.id] = f;
      return cp;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, query]);

  const selectableCount = Object.values(selected).filter((s) => s.mimeType !== "application/vnd.google-apps.folder").length;

  const runImport = async () => {
    if (!accessToken) return;
    const picked = Object.values(selected).filter((s) => s.mimeType !== "application/vnd.google-apps.folder");
    if (!picked.length) {
      toast({ title: "Dosya seçin", description: "En az bir belge seçmelisiniz.", variant: "destructive" });
      return;
    }
    setImporting(true);
    setResults(null);
    setStage("Google Drive'dan indiriliyor...");
    try {
      setStage("Metin çıkarılıyor, chunk'lara bölünüyor ve embedding üretiliyor...");
      const { data, error } = await supabase.functions.invoke("google-drive-import", {
        body: {
          accessToken,
          category,
          files: picked.map((p) => ({ id: p.id, name: p.name, mimeType: p.mimeType })),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResults((data as any)?.results ?? []);
      setStage("");
      toast({
        title: "İçe aktarma tamamlandı",
        description: `${(data as any)?.processed ?? 0} dosya · ${(data as any)?.chunks ?? 0} chunk kaydedildi.`,
      });
      setSelected({});
    } catch (e: any) {
      setStage("");
      toast({ title: "İçe aktarma hatası", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  if (configLoading) {
    return (
      <div className="rounded-md border bg-muted/20 p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Google Drive yapılandırması kontrol ediliyor…
      </div>
    );
  }

  if (configError || !clientId) {
    return (
      <div className="rounded-md border bg-amber-50 border-amber-200 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
          <AlertTriangle className="w-4 h-4" /> Google Drive bağlantısı yapılandırılmamış
        </div>
        <p className="text-xs text-amber-800">{configError}</p>
        <p className="text-xs text-amber-700">
          Kurulum: Google Cloud Console'da OAuth istemcisi oluşturun ve <code>GOOGLE_DRIVE_CLIENT_ID</code> secret'ını backend'e ekleyin.
          Ayrıntılı adımlar sohbet mesajında verildi.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-4">
      <div className="flex items-center gap-2 font-medium text-sm">
        <CloudDownload className="w-4 h-4" /> Google Drive'dan İçe Aktar
      </div>
      <p className="text-xs text-muted-foreground">
        Yalnızca admin. Drive'ınızdaki PDF, DOCX, TXT ve Google Docs dosyalarını seçip bilgi tabanına aktarır. Ham dosya saklanmaz; yalnızca chunk'lar veritabanına yazılır.
      </p>

      {!accessToken ? (
        <Button onClick={connect} disabled={connecting} size="sm">
          {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudDownload className="w-4 h-4 mr-2" />}
          Google ile Bağlan
        </Button>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" onClick={goBack} disabled={stack.length <= 1 || loadingFiles}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-xs text-muted-foreground truncate">
              {stack.map((s) => s.name).join(" / ")}
            </div>
            <Button size="sm" variant="ghost" onClick={() => loadFolder(currentFolder.id)} disabled={loadingFiles}>
              {loadingFiles ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </Button>
            <Button size="sm" variant="outline" onClick={disconnect} className="ml-auto">Bağlantıyı Kes</Button>
          </div>

          <Input
            placeholder="Ada göre filtrele…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 text-sm"
          />

          <div className="max-h-72 overflow-y-auto rounded border bg-background">
            {loadingFiles ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 mx-auto animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Bu klasörde uygun dosya yok.</div>
            ) : (
              <ul className="divide-y">
                {filtered.map((f) => {
                  const isFolder = f.mimeType === "application/vnd.google-apps.folder";
                  const checked = !!selected[f.id];
                  return (
                    <li key={f.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40">
                      {!isFolder ? (
                        <Checkbox checked={checked} onCheckedChange={() => toggleSelect(f)} />
                      ) : (
                        <div className="w-4" />
                      )}
                      {isFolder ? <Folder className="w-4 h-4 text-amber-600" /> : <FileText className="w-4 h-4 text-muted-foreground" />}
                      <button
                        className="flex-1 text-left text-sm truncate"
                        onClick={() => (isFolder ? enterFolder(f) : toggleSelect(f))}
                        title={f.name}
                      >
                        {f.name}
                      </button>
                      <span className="text-[10px] text-muted-foreground uppercase">{typeLabel(f.mimeType)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="gd-cat">Kategori *</Label>
              <Select value={category} onValueChange={setCategory} disabled={importing}>
                <SelectTrigger id="gd-cat"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="text-xs text-muted-foreground">
                Seçili dosya: <b>{selectableCount}</b>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={runImport} disabled={importing || selectableCount === 0} size="sm">
              {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudDownload className="w-4 h-4 mr-2" />}
              İçe Aktar ve İşle
            </Button>
            {stage && <span className="text-xs text-muted-foreground">{stage}</span>}
          </div>

          {results && results.length > 0 && (
            <div className="rounded border bg-background p-3 space-y-1">
              <div className="text-xs font-medium">Sonuçlar</div>
              <ul className="text-xs space-y-1">
                {results.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{r.name}</span>
                    {r.ok
                      ? <span className="text-emerald-700">✓ {r.chunks} chunk</span>
                      : <span className="text-destructive">✗ {r.error}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
