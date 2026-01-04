import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CaseFile, NextStepChoice } from "@/types/mediation";

type Props = {
  caseFile: CaseFile;
  onChoose: (choice: NextStepChoice) => void;
  onBack?: () => void;
};

export default function StepNextStepDecision({ caseFile, onChoose, onBack }: Props) {
  const hasSummary = Boolean(caseFile.summary?.neutralSummary);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-xl font-semibold">Bir sonraki adımınızı seçin</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Aşağıda iki ilerleme yolu bulunmaktadır. Her ikisi de bağlayıcı değildir ve arabuluculuk ilkelerine uygundur.
        </p>
      </div>

      {!hasSummary && (
        <Card className="p-4 border-destructive/20">
          <p className="text-sm">
            Devam etmek için önce yapılandırılmış nötr özet oluşturulmalıdır.
          </p>
          {onBack && (
            <div className="mt-3">
              <Button variant="secondary" onClick={onBack}>
                Intake'a geri dön
              </Button>
            </div>
          )}
        </Card>
      )}

      {hasSummary && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Option 1: AI exploration (Primary) */}
          <Card className="p-5">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">AI ile Çözüm Seçeneklerini Keşfet</h3>
              <p className="text-sm text-muted-foreground">
                Uyuşmazlık bağlayıcı olmadan analiz edilir; olası çözüm senaryoları üretilir. Karar verilmez, taraf tutulmaz.
              </p>
              <ul className="text-sm list-disc pl-5 text-muted-foreground">
                <li>3–5 çözüm senaryosu</li>
                <li>Ortak zemin önerileri</li>
                <li>Kısa geri bildirim ile iterasyon</li>
              </ul>
            </div>

            <div className="mt-4">
              <Button onClick={() => onChoose("ai_exploration")} className="w-full">
                AI ile devam et
              </Button>
            </div>
          </Card>

          {/* Option 2: Human mediator (Secondary) */}
          <Card className="p-5">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Bir Arabulucu ile Devam Et</h3>
              <p className="text-sm text-muted-foreground">
                Dosyanız arabulucuya iletilir. Ön başvuru özeti paylaşılır ve süreç insan odaklı yürütülür.
              </p>
              <ul className="text-sm list-disc pl-5 text-muted-foreground">
                <li>MVP: "arabulucu atansın" yaklaşımı</li>
                <li>Özetin dışa aktarımı (PDF/JSON)</li>
              </ul>
            </div>

            <div className="mt-4">
              <Button variant="secondary" onClick={() => onChoose("human_mediator")} className="w-full">
                Arabulucuya ilet
              </Button>
            </div>
          </Card>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Bu platform hukuki danışmanlık sunmaz. AI çıktıları bağlayıcı değildir ve karar niteliği taşımaz.
      </p>
    </motion.div>
  );
}
