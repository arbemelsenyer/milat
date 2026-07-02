import { useEffect, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, FileText, FileType, FileCode2, Download, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { downloadOfficialPdf, downloadOfficialDocx, downloadOfficialUdf, officialTitle } from "@/lib/official-documents";

interface Props {
  caseRow: any;
  onOutcomeSaved?: () => void;
}

type DocKind = "son_tutanak" | "davet" | "ilk_oturum";

const DOC_SET_AGREED: DocKind[] = ["ilk_oturum", "son_tutanak", "davet"];
const DOC_SET_FAILED: DocKind[] = ["son_tutanak"];

export function OfficialDocumentsPanel({ caseRow, onOutcomeSaved }: Props) {
  const [outcome, setOutcome] = useState<"anlasma" | "anlasamamama" | null>(caseRow?.outcome ?? null);
  const [terms, setTerms] = useState<string>(caseRow?.agreement_terms ?? "");
  const [amount, setAmount] = useState<string>(caseRow?.agreement_amount ? String(caseRow.agreement_amount) : "");
  const [savingOutcome, setSavingOutcome] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatedDocs, setGeneratedDocs] = useState<Record<string, { template_type: string; filled_text: string; udf_xml: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const setKinds: DocKind[] = outcome === "anlasma" ? DOC_SET_AGREED : outcome === "anlasamamama" ? DOC_SET_FAILED : [];

  useEffect(() => {
    setOutcome(caseRow?.outcome ?? null);
    setTerms(caseRow?.agreement_terms ?? "");
    setAmount(caseRow?.agreement_amount ? String(caseRow.agreement_amount) : "");
  }, [caseRow?.id]);

  async function saveOutcome(nextOutcome: "anlasma" | "anlasamamama") {
    setSavingOutcome(true);
    setError(null);
    try {
      const payload: any = { outcome: nextOutcome };
      if (nextOutcome === "anlasma") {
        payload.agreement_terms = terms || null;
        payload.agreement_amount = amount ? Number(amount) : null;
      }
      const { error } = await supabase.from("cases").update(payload).eq("id", caseRow.id);
      if (error) throw error;
      setOutcome(nextOutcome);
      toast({ title: nextOutcome === "anlasma" ? "Anlaşma kaydedildi" : "Anlaşamama kaydedildi" });
      onOutcomeSaved?.();
    } catch (e: any) {
      setError(e.message || "Kaydedilemedi");
    } finally {
      setSavingOutcome(false);
    }
  }

  async function generate(kind: DocKind): Promise<{ template_type: string; filled_text: string; udf_xml: string } | null> {
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-official-document", {
        body: { case_id: caseRow.id, kind, outcome_override: outcome },
      });
      if (error) {
        let msg = error.message || "Sunucu hatası";
        try {
          const ctx = (error as any).context;
          if (ctx?.body) {
            const b = typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body;
            if (b?.message) msg = b.message;
          }
        } catch {}
        throw new Error(msg);
      }
      if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
      const result = data as any;
      setGeneratedDocs((prev) => ({ ...prev, [kind]: result }));

      // Persist metadata record.
      await supabase.from("agreement_documents").insert({
        case_id: caseRow.id,
        doc_type: officialTitle(result.template_type),
        metadata: { template_type: result.template_type, kind, generated_at: new Date().toISOString() } as any,
      } as any);

      return result;
    } catch (e: any) {
      setError(e.message || "Belge üretilemedi");
      return null;
    }
  }

  async function handleFormat(kind: DocKind, fmt: "pdf" | "docx" | "udf") {
    setGenerating(`${kind}_${fmt}`);
    try {
      let doc = generatedDocs[kind];
      if (!doc) {
        const r = await generate(kind);
        if (!r) return;
        doc = r;
      }
      const opts = { templateType: doc.template_type, applicationNo: caseRow.application_no, filledText: doc.filled_text, udfXml: doc.udf_xml };
      if (fmt === "pdf") downloadOfficialPdf(opts);
      else if (fmt === "docx") await downloadOfficialDocx(opts);
      else downloadOfficialUdf(opts);
    } finally {
      setGenerating(null);
    }
  }

  async function downloadAllZip() {
    if (setKinds.length === 0) return;
    setBulkBusy(true);
    setError(null);
    try {
      const zip = new JSZip();
      for (const kind of setKinds) {
        let doc = generatedDocs[kind];
        if (!doc) {
          const r = await generate(kind);
          if (!r) continue;
          doc = r;
        }
        const base = `${doc.template_type}_${caseRow.application_no || "belge"}`;
        zip.file(`${base}.txt`, doc.filled_text);
        zip.file(`${base}.udf`, doc.udf_xml);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `resmi_belgeler_${caseRow.application_no || caseRow.id.slice(0, 8)}.zip`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBulkBusy(false);
    }
  }

  const KIND_LABEL: Record<DocKind, string> = {
    ilk_oturum: "İlk Oturum Tutanağı",
    son_tutanak: outcome === "anlasma" ? "Anlaşma Son Tutanağı" : "Anlaşamama Son Tutanağı",
    davet: "Davet Mektubu (türe uygun)",
  };

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-xl font-semibold flex items-center gap-2"><FileText className="h-5 w-5" /> Resmi Belge Üretimi</h3>
        <p className="text-sm text-muted-foreground">Bakanlık şablonlarına göre otomatik doldurulmuş belgeler.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={outcome === "anlasma" ? "default" : "outline"}
          onClick={() => saveOutcome("anlasma")}
          disabled={savingOutcome}
        >
          <CheckCircle2 className="h-4 w-4 mr-1" /> Anlaşma Sağlandı
        </Button>
        <Button
          type="button"
          variant={outcome === "anlasamamama" ? "default" : "outline"}
          onClick={() => saveOutcome("anlasamamama")}
          disabled={savingOutcome}
        >
          <XCircle className="h-4 w-4 mr-1" /> Anlaşma Sağlanamadı
        </Button>
      </div>

      {outcome === "anlasma" && (
        <div className="grid gap-3 md:grid-cols-[2fr,1fr] border rounded p-3 bg-muted/10">
          <div className="space-y-1">
            <Label>Anlaşma Şartları</Label>
            <Textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Taraflar arasındaki anlaşma şartlarını serbest metin olarak yazın." />
          </div>
          <div className="space-y-1">
            <Label>Anlaşma Bedeli (TL)</Label>
            <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ör: 100000" />
          </div>
          <div className="md:col-span-2">
            <Button size="sm" variant="outline" onClick={() => saveOutcome("anlasma")} disabled={savingOutcome}>
              {savingOutcome && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Şartları Kaydet
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded border border-amber-300 bg-amber-50 text-amber-900 text-sm flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Belge üretilemedi</div>
              <div>{error}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setError(null)}>Geri Dön</Button>
          </div>
        </div>
      )}

      {setKinds.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Otomatik seçilen belgeler:</div>
          <ul className="space-y-2">
            {setKinds.map((kind) => (
              <li key={kind} className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-medium text-sm">{KIND_LABEL[kind]}</div>
                  {generatedDocs[kind] && (
                    <div className="text-xs text-muted-foreground mt-0.5">Şablon: {generatedDocs[kind].template_type}</div>
                  )}
                </div>
                <div className="flex gap-1">
                  {(["pdf", "docx", "udf"] as const).map((fmt) => {
                    const busy = generating === `${kind}_${fmt}`;
                    const Icon = fmt === "pdf" ? FileText : fmt === "docx" ? FileType : FileCode2;
                    return (
                      <Button key={fmt} size="sm" variant="outline" disabled={!!generating} onClick={() => handleFormat(kind, fmt)}>
                        {busy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Icon className="h-3 w-3 mr-1" />}
                        {fmt.toUpperCase()}
                      </Button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>

          {outcome === "anlasma" && (
            <div className="pt-2">
              <Button onClick={downloadAllZip} disabled={bulkBusy}>
                {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                Tümünü İndir (ZIP)
              </Button>
            </div>
          )}
        </div>
      )}

      {outcome === null && (
        <p className="text-sm text-muted-foreground italic">Önce sonuç seçin — anlaşma sağlandı mı?</p>
      )}
    </Card>
  );
}
