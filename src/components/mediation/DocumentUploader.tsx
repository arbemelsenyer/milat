import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2 } from "lucide-react";

interface Props {
  onTextExtracted: (text: string, fileName: string) => Promise<void> | void;
}

async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    // Lightweight PDF text extraction in the browser via pdf.js cdn
    // @ts-ignore
    const pdfjs: any = await import(/* @vite-ignore */ "https://esm.sh/pdfjs-dist@4.5.136/build/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.min.mjs";
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    let out = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      out += content.items.map((it: any) => it.str).join(" ") + "\n";
    }
    return out;
  }
  // Fallback: read as text (works for .txt, basic .docx will be noisy)
  return await file.text();
}

export function DocumentUploader({ onTextExtracted }: Props) {
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<string[]>([]);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    if (!list.length) return;
    setBusy(true);
    try {
      for (const f of list) {
        const text = await extractTextFromFile(f);
        await onTextExtracted(text, f.name);
        setFiles((prev) => [...prev, f.name]);
      }
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <Card className="p-6">
      <label className="flex flex-col items-center justify-center gap-3 cursor-pointer rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 py-10 hover:bg-primary/10 transition-colors">
        {busy ? <Loader2 className="h-8 w-8 text-primary animate-spin" /> : <Upload className="h-8 w-8 text-primary" />}
        <div className="text-center">
          <p className="font-medium">PDF veya Word dosyası yükle</p>
          <p className="text-xs text-muted-foreground">Yüklenen metin AI'ya gitmeden önce yerel olarak maskelenir.</p>
        </div>
        <input type="file" accept=".pdf,.docx,.doc,.txt" multiple className="hidden" onChange={handle} disabled={busy} />
        <Button type="button" variant="secondary" disabled={busy}>Dosya Seç</Button>
      </label>
      {files.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {files.map((n, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> {n}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
