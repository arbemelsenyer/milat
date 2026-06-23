import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { TEMPLATES, downloadOfficialPdf, type DocCaseData, type TemplateId } from "@/lib/pdfTemplates";
import { toast } from "sonner";

interface Props {
  caseData: DocCaseData;
}

export const OfficialDocuments = ({ caseData }: Props) => {
  const handle = (id: TemplateId, name: string) => {
    try {
      downloadOfficialPdf(id, caseData);
      toast.success(`${name} indirildi`);
    } catch (e) {
      console.error(e);
      toast.error("PDF oluşturulamadı");
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Resmi Belgeler (Adalet Bakanlığı Formatı)</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => handle(t.id, t.name)}
            className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-primary hover:bg-accent/30 transition text-left"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t.name}</span>
            </div>
            <Download className="h-4 w-4 text-primary" />
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Belgeler başvuru bilgileri, taraf bilgileri ve dosya türü otomatik doldurularak üretilir.
      </p>
    </Card>
  );
};
