import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CaseFile, NextStepChoice } from "@/types/mediation";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  caseFile: CaseFile;
  onChoose: (choice: NextStepChoice) => void;
  onBack?: () => void;
};

export default function StepNextStepDecision({ caseFile, onChoose, onBack }: Props) {
  const { t } = useLanguage();
  const hasSummary = Boolean(caseFile.summary?.neutralSummary);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-xl font-semibold">{t('decision.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('decision.description')}
        </p>
      </div>

      {!hasSummary && (
        <Card className="p-4 border-destructive/20">
          <p className="text-sm">
            {t('decision.needSummary')}
          </p>
          {onBack && (
            <div className="mt-3">
              <Button variant="secondary" onClick={onBack}>
                {t('decision.backToIntake')}
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
              <h3 className="text-lg font-semibold">{t('decision.aiTitle')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('decision.aiDesc')}
              </p>
              <ul className="text-sm list-disc pl-5 text-muted-foreground">
                <li>{t('decision.aiFeature1')}</li>
                <li>{t('decision.aiFeature2')}</li>
                <li>{t('decision.aiFeature3')}</li>
              </ul>
            </div>

            <div className="mt-4">
              <Button onClick={() => onChoose("ai_exploration")} className="w-full">
                {t('decision.aiButton')}
              </Button>
            </div>
          </Card>

          {/* Option 2: Human mediator (Secondary) */}
          <Card className="p-5">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('decision.mediatorTitle')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('decision.mediatorDesc')}
              </p>
              <ul className="text-sm list-disc pl-5 text-muted-foreground">
                <li>{t('decision.mediatorFeature1')}</li>
                <li>{t('decision.mediatorFeature2')}</li>
              </ul>
            </div>

            <div className="mt-4">
              <Button variant="secondary" onClick={() => onChoose("human_mediator")} className="w-full">
                {t('decision.mediatorButton')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t('decision.disclaimer')}
      </p>
    </motion.div>
  );
}
