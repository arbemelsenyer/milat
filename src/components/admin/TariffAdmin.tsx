import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

type Row = { id: string; yil: number; effective_date: string; is_active: boolean; tariff_data: any; created_at: string };

export function TariffAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newYil, setNewYil] = useState<string>(String(new Date().getFullYear() + 1));
  const [newDate, setNewDate] = useState<string>("");
  const [newJson, setNewJson] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("fee_tariffs" as any).select("*").order("yil", { ascending: false });
    if (error) toast.error("Tarife listesi yüklenemedi: " + error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleActive(row: Row) {
    if (!row.is_active) {
      // deactivate all others first
      await supabase.from("fee_tariffs" as any).update({ is_active: false }).neq("id", row.id);
    }
    const { error } = await supabase.from("fee_tariffs" as any).update({ is_active: !row.is_active }).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Tarife güncellendi");
    load();
  }

  async function save() {
    let parsed: any;
    try { parsed = JSON.parse(newJson); } catch { return toast.error("Geçersiz JSON"); }
    const yil = Number(newYil);
    if (!yil || yil < 2020) return toast.error("Geçerli bir yıl girin");
    if (!newDate) return toast.error("Yürürlük tarihi zorunlu");
    setSaving(true);
    // deactivate existing active tariffs
    await supabase.from("fee_tariffs" as any).update({ is_active: false }).eq("is_active", true);
    const { error } = await supabase.from("fee_tariffs" as any).insert({
      yil, effective_date: newDate, is_active: true, tariff_data: parsed,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`${yil} tarifesi eklendi ve aktifleştirildi`);
    setShowAdd(false); setNewJson(""); load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tarife Yönetimi (AAÜT)</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Yenile</Button>
          <Button size="sm" onClick={() => setShowAdd((v) => !v)}><Plus className="h-4 w-4 mr-1" />Yeni Tarife</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAdd && (
          <div className="border rounded p-4 space-y-3 bg-muted/30">
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Yıl</Label><Input type="number" value={newYil} onChange={(e) => setNewYil(e.target.value)} /></div>
              <div><Label>Yürürlük Tarihi</Label><Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} /></div>
            </div>
            <div>
              <Label>Tarife JSON</Label>
              <Textarea rows={12} placeholder='{"yil":2027,"ikinci_kisim":{...},"birinci_kisim":{...},...}' value={newJson} onChange={(e) => setNewJson(e.target.value)} className="font-mono text-xs" />
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Kaydet & Aktifleştir</Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)}>İptal</Button>
            </div>
          </div>
        )}

        {loading ? <div className="text-sm text-muted-foreground">Yükleniyor…</div> : (
          <div className="space-y-2">
            {rows.length === 0 && <div className="text-sm text-muted-foreground">Henüz tarife yok.</div>}
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between border rounded p-3">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {r.yil} Tarifesi
                    {r.is_active
                      ? <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Aktif</span>
                      : <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1"><XCircle className="h-3 w-3" />Pasif</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">Yürürlük: {r.effective_date}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => toggleActive(r)}>
                  {r.is_active ? "Pasifleştir" : "Aktifleştir"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
