import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThumbsUp, Minus, ThumbsDown, ArrowLeft, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import type { CaseFile, AiOption } from '@/types/mediation';
import { generateOptions } from '@/lib/ai';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  caseFile: CaseFile;
  onFeedbackChange: (feedback: Record<string, 'good' | 'maybe' | 'no'>) => void;
  onComplete: () => void;
  onBack?: () => void;
}

type FeedbackType = 'good' | 'maybe' | 'no';

const feedbackConfig: Record<
  FeedbackType,
  { icon: typeof ThumbsUp; labelKey: string; activeClass: string }
> = {
  good: {
    icon: ThumbsUp,
    labelKey: 'aiExploration.good',
    activeClass: 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:border-green-600 dark:text-green-400',
  },
  maybe: {
    icon: Minus,
    labelKey: 'aiExploration.maybe',
    activeClass: 'bg-amber-100 border-amber-500 text-amber-700 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-400',
  },
  no: {
    icon: ThumbsDown,
    labelKey: 'aiExploration.no',
    activeClass: 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:border-red-600 dark:text-red-400',
  },
};

export default function StepAiExploration({
  caseFile,
  onFeedbackChange,
  onComplete,
  onBack,
}: Props) {
  const { t } = useLanguage();
  const [options, setOptions] = useState<AiOption[]>([]);
  const [feedback, setFeedback] = useState<Record<string, FeedbackType>>(caseFile.aiFeedback || {});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOptions = async () => {
      setIsLoading(true);
      try {
        const generatedOptions = await generateOptions(caseFile.summary);
        setOptions(generatedOptions);
      } catch (error) {
        console.error('Failed to generate options:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadOptions();
  }, [caseFile.summary]);

  const handleFeedback = (optionId: string, type: FeedbackType) => {
    const newFeedback = { ...feedback, [optionId]: type };
    setFeedback(newFeedback);
    onFeedbackChange(newFeedback);
  };

  const ratedCount = Object.keys(feedback).length;
  const totalCount = options.length;
  const hasAnyFeedback = ratedCount > 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{t('common.processing')}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{t('aiExploration.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('aiExploration.description')}
          </p>
        </div>
      </div>

      {/* Options list */}
      <div className="grid gap-4">
        {options.map((option, index) => {
          const currentFeedback = feedback[option.id];

          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`p-5 transition-all ${currentFeedback ? 'ring-2 ring-primary/20' : ''}`}>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Senaryo {index + 1}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{option.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                  </div>

                  {option.tradeoffs.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        {t('aiExploration.tradeoffs')}
                      </p>
                      <ul className="space-y-1">
                        {option.tradeoffs.map((tradeoff, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            {tradeoff}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Feedback buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    {(Object.keys(feedbackConfig) as FeedbackType[]).map((type) => {
                      const config = feedbackConfig[type];
                      const Icon = config.icon;
                      const isActive = currentFeedback === type;

                      return (
                        <Button
                          key={type}
                          variant="outline"
                          size="sm"
                          onClick={() => handleFeedback(option.id, type)}
                          className={`gap-2 transition-all ${isActive ? config.activeClass : ''}`}
                        >
                          <Icon className="w-4 h-4" />
                          {t(config.labelKey)}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">{ratedCount}</span> / {totalCount} {t('aiExploration.progress')}
        </div>
        <div className="flex gap-1">
          {options.map((opt) => (
            <div
              key={opt.id}
              className={`w-2 h-2 rounded-full transition-colors ${
                feedback[opt.id]
                  ? feedback[opt.id] === 'good'
                    ? 'bg-green-500'
                    : feedback[opt.id] === 'maybe'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                  : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </Button>
        )}
        <Button
          onClick={onComplete}
          disabled={!hasAnyFeedback}
          className="ml-auto gap-2"
        >
          {t('aiExploration.complete')}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center">
        {t('aiExploration.disclaimer')}
      </p>
    </motion.div>
  );
}
