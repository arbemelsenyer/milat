import { useEffect, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, FileText, FileType, FileCode2, Download, AlertTriangle, CheckCircle2, XCircle, Eye, History } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { downloadOfficialPdf, downloadOfficialDocx, downloadOfficialUdf, officialTitle } from "@/lib/official-documents";
// TASLAK DENETİMİ — 16.08.2026'da EKRANDAN KALDIRILDI (kurucu kararı).
// Sebep: tutanak/anlaşma şablonları yüklenmeden denetim gerçek bir kontrol yapamıyor;
// kutu "denetimde eksiklik görünmüyor" yazıp yanlış güven veriyordu.
// 19.08.2026 — GERİ AÇILDI: kutu 16.08'de "şablonlar yüklenince geri açılacak"
// notuyla kapatılmıştı; şart sağlandı (47 şablon yüklü). Bileşen hep yerinde
// durdu (src/components/mediation/TaslakDenetimi.tsx), yalnız çağrısı kapalıydı.
import { TaslakDenetimi } from "@/components/mediation/TaslakDenetimi";
// ISLAK İMZA KAPISI (HAT H-2, karar A) — imza kaydı yalnız arabulucunun kendi
// oturumuyla yazılır; ayrı bileşende durur ki çalışan belge üretim yolu (m.8)
// bu işten etkilenmesin.
import { AnlasmaImzaPaneli } from "@/components/mediation/AnlasmaImzaPaneli";

interface Props {
  caseRow: any;
  onOutcomeSaved?: () => void;
}

type DocKind = "son_tutanak" | "davet" | "ilk_oturum" | "anlasma_belgesi";

// Sürüm = agreement_documents tablosundaki bir satır. Yeni tablo/sütun yok;
// metin ve durum metadata JSONB'sinde durur, sıra created_at'tendir.
type DocVersion = {
  id: string;
  created_at: string;
  filled_text: string;
  status: string;          // "taslak" | "onaylandi"
  template_type: string;
};

type DiffPart = { type: "same" | "add" | "del"; text: string };

// Kelime bazlı karşılaştırma (harf bazlı değil). Boşluklar da ayrı belirteç
// olarak tutulur, böylece satır düzeni korunur. Kurulu diff kütüphanesi yok,
// yeni paket de kurulmadı — LCS burada yazıldı.
function tokenizeWords(text: string): string[] {
  return text.match(/\s+|[^\s]+/g) ?? [];
}

function wordDiff(oldText: string, newText: string): DiffPart[] {
  const a = tokenizeWords(oldText);
  const b = tokenizeWords(newText);
  const parts: DiffPart[] = [];
  const push = (type: DiffPart["type"], text: string) => {
    if (!text) return;
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ type, text });
  };

  // Ortak baş ve son kısmı kırp — DP yalnız değişen orta bölüme kurulur.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }

  push("same", a.slice(0, start).join(""));

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const n = midA.length;
  const m = midB.length;
  const CELL_LIMIT = 4_000_000;

  if (n * m > CELL_LIMIT) {
    // Çok büyük değişiklik: kelime hizalaması yerine blok olarak göster.
    push("del", midA.join(""));
    push("add", midB.join(""));
  } else if (n || m) {
    const w = m + 1;
    const dp = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * w + j] = midA[i] === midB[j]
          ? dp[(i + 1) * w + (j + 1)] + 1
          : Math.max(dp[(i + 1) * w + j], dp[i * w + (j + 1)]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (midA[i] === midB[j]) { push("same", midA[i]); i++; j++; }
      else if (dp[(i + 1) * w + j] >= dp[i * w + (j + 1)]) { push("del", midA[i]); i++; }
      else { push("add", midB[j]); j++; }
    }
    while (i < n) { push("del", midA[i]); i++; }
    while (j < m) { push("add", midB[j]); j++; }
  }

  push("same", a.slice(endA).join(""));
  return parts;
}

const DOC_SET_AGREED: DocKind[] = ["ilk_oturum", "son_tutanak", "anlasma_belgesi", "davet"];
const DOC_SET_FAILED: DocKind[] = ["son_tutanak"];

export function OfficialDocumentsPanel({ caseRow, onOutcomeSaved }: Props) {
  const [outcome, setOutcome] = useState<"anlasma" | "anlasamama" | null>(caseRow?.outcome ?? null);
  const [terms, setTerms] = useState<string>(caseRow?.agreement_terms ?? "");
  const [amount, setAmount] = useState<string>(caseRow?.agreement_amount ? String(caseRow.agreement_amount) : "");
  const [savingOutcome, setSavingOutcome] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatedDocs, setGeneratedDocs] = useState<Record<string, { template_type: string; filled_text: string; udf_xml: string }>>({});
  // Tracks the agreement_documents row inserted per kind at generation time, so an
  // edit made in the Textarea afterwards can be synced back into that same record.
  const [docRecords, setDocRecords] = useState<Record<string, { id: string; metadata: any }>>({});
  // Text last successfully persisted to agreement_documents per kind, so the
  // manual save button can stay disabled when there's nothing new to write.
  const [savedTexts, setSavedTexts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  // Belge türü başına sürüm listesi (en yeni önce) ve fark görünümü anahtarı.
  const [versions, setVersions] = useState<Record<string, DocVersion[]>>({});
  const [showDiff, setShowDiff] = useState<Record<string, boolean>>({});

  const setKinds: DocKind[] = outcome === "anlasma" ? DOC_SET_AGREED : outcome === "anlasamama" ? DOC_SET_FAILED : [];

  useEffect(() => {
    setOutcome(caseRow?.outcome ?? null);
    setTerms(caseRow?.agreement_terms ?? "");
    setAmount(caseRow?.agreement_amount ? String(caseRow.agreement_amount) : "");
  }, [caseRow?.id]);

  // Sürümler mevcut agreement_documents satırlarından okunur; metni olmayan
  // eski kayıtlar (henüz filled_text yazılmadan üretilenler) listeye girmez.
  async function loadVersions() {
    if (!caseRow?.id) return;
    const { data } = await supabase
      .from("agreement_documents")
      .select("id, created_at, metadata")
      .eq("case_id", caseRow.id)
      .order("created_at", { ascending: false });
    const grouped: Record<string, DocVersion[]> = {};
    for (const row of (data ?? []) as any[]) {
      const meta = row?.metadata && typeof row.metadata === "object" ? row.metadata : {};
      const kind = String(meta.kind ?? "");
      const text = typeof meta.filled_text === "string" ? meta.filled_text : "";
      if (!kind || !text) continue;
      (grouped[kind] ||= []).push({
        id: row.id,
        created_at: row.created_at,
        filled_text: text,
        status: String(meta.status ?? "taslak"),
        template_type: String(meta.template_type ?? ""),
      });
    }
    setVersions(grouped);
  }

  useEffect(() => { void loadVersions(); }, [caseRow?.id]);

  async function saveOutcome(nextOutcome: "anlasma" | "anlasamama") {
    setSavingOutcome(true);
    setError(null);
    try {
      const payload: any = {
        outcome: nextOutcome,
        status: nextOutcome === "anlasma" ? "agreed" : "failed",
        current_phase: 9,
      };
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

      // Persist metadata record; keep its id so later edits can be synced back into it.
      // filled_text + status burada yazılır: her üretim bir sürüm satırı bırakır,
      // eski metin silinmez (yeni tablo/sütun yok).
      const metadata = {
        template_type: result.template_type,
        kind,
        generated_at: new Date().toISOString(),
        filled_text: result.filled_text,
        status: "taslak",
      };
      const { data: row } = await supabase.from("agreement_documents").insert({
        case_id: caseRow.id,
        doc_type: officialTitle(result.template_type),
        metadata: metadata as any,
      } as any).select("id, metadata").single();
      if (row) setDocRecords((prev) => ({ ...prev, [kind]: { id: (row as any).id, metadata: (row as any).metadata } }));
      setSavedTexts((prev) => ({ ...prev, [kind]: result.filled_text }));
      await loadVersions();

      return result;
    } catch (e: any) {
      setError(e.message || "Belge üretilemedi");
      return null;
    }
  }

  // UDF is normally rendered server-side (generate-official-document), so its udf_xml
  // wouldn't reflect a later Textarea edit. Rebuilding it here — same offset-based
  // paragraph schema the edge function uses — makes UDF generation client-side too,
  // so it always matches the text currently on screen.
  function buildUdfXml(text: string): string {
    const rawLines = text.split("\n");
    let pool = "";
    const paragraphElems: string[] = [];
    let offset = 0;
    for (let i = 0; i < rawLines.length; i++) {
      const hasNext = i < rawLines.length - 1;
      const line = hasNext ? rawLines[i] + "\n" : rawLines[i];
      const length = Array.from(line).length;
      if (length === 0) continue;
      paragraphElems.push(`    <paragraph><content startOffset="${offset}" length="${length}"/></paragraph>`);
      pool += line;
      offset += length;
    }
    return `<?xml version="1.0" encoding="UTF-8"?>
<template format_id="1.8">
  <content><![CDATA[${pool}]]></content>
  <properties><pageFormat mediaSizeName="1" leftMargin="70.875" rightMargin="70.875" topMargin="70.875" bottomMargin="70.875" paperOrientation="1" headerFOffset="20.0" footerFOffset="20.0" /></properties>
  <elements resolver="hvl-default">
${paragraphElems.join("\n")}
  </elements>
  <styles>
    <style name="default" description="Geçerli" family="Dialog" size="12" bold="false" italic="false" foreground="-13421773" FONT_ATTRIBUTE_KEY="javax.swing.plaf.FontUIResource[family=Dialog,name=Dialog,style=plain,size=12]" />
    <style name="hvl-default" family="Times New Roman" size="12" description="Gövde" />
  </styles>
</template>`;
  }

  // If a metadata record was created for this kind at generation time, keep it in sync
  // with whatever the mediator has edited so far — best-effort, never blocks a download.
  async function syncEditedRecord(kind: DocKind, filledText: string): Promise<boolean> {
    const rec = docRecords[kind];
    if (!rec) return false;
    try {
      const baseMeta = rec.metadata && typeof rec.metadata === "object" ? rec.metadata : {};
      await supabase.from("agreement_documents").update({
        metadata: { ...baseMeta, filled_text: filledText, edited_at: new Date().toISOString() } as any,
      }).eq("id", rec.id);
      setSavedTexts((prev) => ({ ...prev, [kind]: filledText }));
      return true;
    } catch {
      return false;
    }
  }

  // Manual save from the edit Textarea — writes immediately, without waiting for a download.
  async function handleSaveEdit(kind: DocKind) {
    const doc = generatedDocs[kind];
    if (!doc) return;
    setGenerating(`${kind}_save`);
    try {
      const ok = await syncEditedRecord(kind, doc.filled_text);
      if (ok) { toast({ title: "Düzenleme kaydedildi" }); await loadVersions(); }
      else setError("Düzenleme kaydedilemedi");
    } finally {
      setGenerating(null);
    }
  }

  // Onay: ekrandaki (elle düzeltilmiş olabilen) metin YENİ sürüm satırı olarak
  // yazılır ve durumu "onaylandi" olur. Önceki sürüm olduğu gibi kalır.
  async function handleApprove(kind: DocKind) {
    const doc = generatedDocs[kind];
    if (!doc) return;
    setGenerating(`${kind}_approve`);
    setError(null);
    try {
      const now = new Date().toISOString();
      const { data: row, error: insErr } = await supabase.from("agreement_documents").insert({
        case_id: caseRow.id,
        doc_type: officialTitle(doc.template_type),
        metadata: {
          template_type: doc.template_type,
          kind,
          generated_at: now,
          filled_text: doc.filled_text,
          status: "onaylandi",
          approved_at: now,
        } as any,
      } as any).select("id, metadata").single();
      if (insErr) throw insErr;
      if (row) setDocRecords((prev) => ({ ...prev, [kind]: { id: (row as any).id, metadata: (row as any).metadata } }));
      setSavedTexts((prev) => ({ ...prev, [kind]: doc.filled_text }));
      await loadVersions();
      toast({ title: "Belge onaylandı", description: "Onaylanan metin yeni sürüm olarak kaydedildi." });
    } catch (e: any) {
      setError(e.message || "Onaylanamadı");
    } finally {
      setGenerating(null);
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
      await syncEditedRecord(kind, doc.filled_text);
      const opts = { templateType: doc.template_type, applicationNo: caseRow.application_no, filledText: doc.filled_text, udfXml: buildUdfXml(doc.filled_text) };
      if (fmt === "pdf") await downloadOfficialPdf(opts);
      else if (fmt === "docx") await downloadOfficialDocx(opts);
      else await downloadOfficialUdf(opts);
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
        await syncEditedRecord(kind, doc.filled_text);
        const base = `${doc.template_type}_${caseRow.application_no || "belge"}`;
        zip.file(`${base}.txt`, doc.filled_text);
        // Wrap UDF as a ZIP-in-ZIP so UYAP editor recognizes the .udf entry.
        const inner = new JSZip();
        inner.file("content.xml", buildUdfXml(doc.filled_text));
        inner.file(
          "properties.xml",
          `<?xml version="1.0" encoding="UTF-8"?>\n<properties><format>UDF</format><version>1.7</version></properties>`
        );
        const udfBlob = await inner.generateAsync({ type: "uint8array" });
        zip.file(`${base}.udf`, udfBlob);
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
    son_tutanak: outcome === "anlasma" ? "Anlaşma Son Tutanağı (m.17)" : "Anlaşamama Son Tutanağı",
    anlasma_belgesi: "Anlaşma Belgesi (m.18)",
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
          variant={outcome === "anlasamama" ? "default" : "outline"}
          onClick={() => saveOutcome("anlasamama")}
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

      {outcome === "anlasma" && (
        <AnlasmaImzaPaneli caseRow={caseRow} onSigned={() => { void loadVersions(); onOutcomeSaved?.(); }} />
      )}

      {setKinds.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Otomatik seçilen belgeler:</div>
          <ul className="space-y-2">
            {setKinds.map((kind) => {
              const previewBusy = generating === `${kind}_preview`;
              const doc = generatedDocs[kind];
              const kindVersions = versions[kind] ?? [];
              const latestVersion = kindVersions[0] ?? null;
              const prevVersion = kindVersions[1] ?? null;
              const approved = latestVersion?.status === "onaylandi";
              const diffOpen = !!showDiff[kind];
              return (
              <li key={kind} className="flex flex-col gap-2 p-3 border rounded">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                      {KIND_LABEL[kind]}
                      {latestVersion && (
                        <span
                          className={
                            "text-[10px] px-2 py-0.5 rounded-full border " +
                            (approved
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "border-amber-300 bg-amber-50 text-amber-800")
                          }
                        >
                          {approved ? "Onaylandı" : "Taslak — imza aşamasında"}
                        </span>
                      )}
                    </div>
                    {doc && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Şablon: {doc.template_type}
                        {kindVersions.length > 0 && <> · {kindVersions.length} sürüm</>}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!!generating}
                      onClick={async () => {
                        setGenerating(`${kind}_preview`);
                        try { await generate(kind); } finally { setGenerating(null); }
                      }}
                    >
                      {previewBusy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                      {doc ? "Yeniden Üret" : "Üret / Önizle"}
                    </Button>
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
                </div>
                {prevVersion && latestVersion && (
                  <div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowDiff((prev) => ({ ...prev, [kind]: !prev[kind] }))}
                    >
                      <History className="h-3 w-3 mr-1" />
                      {diffOpen ? "Değişiklikleri gizle" : "Değişiklikleri göster"}
                    </Button>
                    {diffOpen && (
                      <div className="mt-1 space-y-1">
                        <div className="text-xs text-muted-foreground">
                          Son sürüm ({new Date(latestVersion.created_at).toLocaleString("tr-TR")}) ↔ önceki sürüm
                          ({new Date(prevVersion.created_at).toLocaleString("tr-TR")}) —
                          <span className="text-emerald-700 underline mx-1">eklenen</span>·
                          <span className="text-red-700 line-through mx-1">silinen</span>
                        </div>
                        <div className="border rounded p-3 font-mono text-xs whitespace-pre-wrap max-h-72 overflow-y-auto bg-muted/10">
                          {wordDiff(prevVersion.filled_text, latestVersion.filled_text).map((part, idx) =>
                            part.type === "add" ? (
                              <span key={idx} className="bg-emerald-50 text-emerald-700 underline">{part.text}</span>
                            ) : part.type === "del" ? (
                              <span key={idx} className="bg-red-50 text-red-700 line-through">{part.text}</span>
                            ) : (
                              <span key={idx}>{part.text}</span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {doc && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Belge metni — indirmeden önce düzenleyebilirsiniz</Label>
                    <Textarea
                      rows={8}
                      className="font-mono text-xs"
                      value={doc.filled_text}
                      onChange={(e) => setGeneratedDocs((prev) => ({ ...prev, [kind]: { ...prev[kind], filled_text: e.target.value } }))}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!!generating || savedTexts[kind] === doc.filled_text}
                        onClick={() => handleSaveEdit(kind)}
                      >
                        {generating === `${kind}_save` && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                        Kaydet
                      </Button>
                      <Button
                        size="sm"
                        disabled={!!generating}
                        onClick={() => handleApprove(kind)}
                      >
                        {generating === `${kind}_approve`
                          ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          : <CheckCircle2 className="h-3 w-3 mr-1" />}
                        Onayla
                      </Button>
                    </div>
                    {/* Taslak denetimi kutusu 19.08.2026'da geri açıldı (şablon şartı
                        sağlandı). Denetim belgeyi DEĞİŞTİRMEZ; yalnız belirsiz, eksik ya
                        da çelişkili görünen noktaları gösterir, düzeltmeyi insan yapar. */}
                    <TaslakDenetimi caseId={caseRow?.id} metin={doc.filled_text} />
                  </div>
                )}
              </li>
              );
            })}
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
