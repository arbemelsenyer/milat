import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { TEMPLATES, downloadOfficialPdf, type DocCaseData } from "@/lib/pdfTemplates";
import { toast } from "@/components/ui/use-toast";

export function OfficialDocsPanel({ data }: { data: DocCaseData }) {
  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Resmi Belge Şablonları (T.C. Adalet Bakanlığı formatı)</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Form verileriniz otomatik doldurulur. PDF'yi indirip ıslak imza ile kullanabilirsiniz.
      </p>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
        {TEMPLATES.map((t) => (
          <Button
            key={t.id}
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={() => {
              try {
                downloadOfficialPdf(t.id, data);
                toast({ title: `${t.name} indirildi` });
              } catch (e: any) {
                toast({ title: "Hata", description: e.message, variant: "destructive" });
              }
            }}
          >
            <Download className="h-3.5 w-3.5 mr-2" />
            {t.name}
          </Button>
        ))}
      </div>
    </Card>
  );
}
