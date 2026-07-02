import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, FileText, ExternalLink, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TemplateRow {
  id: string;
  template_type: string;
  template_content: string | null;
  source_url: string | null;
  is_active: boolean;
  uploaded_at: string;
}

const KNOWN_TYPES = [
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

export function TemplateAdmin() {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [singleBusy, setSingleBusy] = useState<string | null>(null);

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

  const missing = KNOWN_TYPES.filter((t) => !rows.some((r) => r.template_type === t));

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Şablon Yönetimi (Bakanlık)
          </CardTitle>
          <CardDescription>
            Bakanlık şablonları (adb.adalet.gov.tr) — belge üretiminde kullanılır.
          </CardDescription>
        </div>
        <Button onClick={refreshAll} disabled={refreshing}>
          {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Bakanlıktan Güncelle
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2">
            {missing.length > 0 && (
              <div className="p-2 rounded border border-amber-300 bg-amber-50 text-amber-900 text-xs">
                Yüklenmemiş şablonlar: {missing.join(", ")} — "Bakanlıktan Güncelle" butonuna tıklayın.
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Şablon</th>
                    <th className="py-2 pr-4">Durum</th>
                    <th className="py-2 pr-4">Karakter</th>
                    <th className="py-2 pr-4">Son Güncelleme</th>
                    <th className="py-2 pr-4">Kaynak</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const empty = !r.template_content || r.template_content.length === 0;
                    return (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono text-xs">{r.template_type}</td>
                        <td className="py-2 pr-4">
                          {empty ? (
                            <Badge variant="destructive">Boş</Badge>
                          ) : r.is_active ? (
                            <Badge>Aktif</Badge>
                          ) : (
                            <Badge variant="outline">Pasif</Badge>
                          )}
                        </td>
                        <td className="py-2 pr-4">{r.template_content?.length ?? 0}</td>
                        <td className="py-2 pr-4 whitespace-nowrap text-xs">{new Date(r.uploaded_at).toLocaleString()}</td>
                        <td className="py-2 pr-4">
                          {r.source_url && (
                            <a href={r.source_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 text-xs">
                              <ExternalLink className="w-3 h-3" /> .docx
                            </a>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <Button size="sm" variant="outline" disabled={singleBusy === r.template_type} onClick={() => refreshSingle(r)}>
                            {singleBusy === r.template_type ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                          </Button>
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
  );
}
