import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, HelpCircle, ThumbsDown, Sparkles, ArrowRight } from "lucide-react";
import type { AiOption, CaseFile } from "@/types/mediation";

type FeedbackType = "good" | "maybe" | "no";

type Props = {
  caseFile: CaseFile;
  onFeedback: (optionId: string, feedback: FeedbackType) => void;
  onComplete: () => void;
  onBack?: () => void;
};

// Mock AI-generated options - in production, this would come from an AI service
const generateMockOptions = (caseFile: CaseFile): AiOption[] => {
  const themes = caseFile.summary?.themes || [];
  const needs = caseFile.summary?.needs || [];
  
  return [
    {
      id: "option-1",
      title: "Yapılandırılmış Diyalog Süreci",
      description: "Tarafların karşılıklı endişelerini yapılandırılmış bir ortamda paylaşması ve ortak zemin araması.",
      tradeoffs: [
        "Daha fazla zaman gerektirir",
        "İlişkiyi koruma potansiyeli yüksek",
        "Her iki tarafın da aktif katılımı şart"
      ]
    },
    {
      id: "option-2",
      title: "Kısmi Uzlaşma Modeli",
      description: "Anlaşmazlığın çözülebilir kısımlarında hızlı ilerleme, karmaşık konuları sonraya bırakma.",
      tradeoffs: [
        "Hızlı sonuç alınabilir",
        "Temel sorunlar ertelenebilir",
        "Kısa vadeli rahatlama sağlar"
      ]
    },
    {
      id: "option-3",
      title: "Bağımsız Değerlendirme",
      description: "Tarafsız bir uzmanın durumu değerlendirmesi ve öneriler sunması.",
      tradeoffs: [
        "Objektif bakış açısı sağlar",
        "Ek maliyet gerektirebilir",
        "Tarafların kabulüne bağlı"
      ]
    },
    {
      id: "option-4",
      title: "Aşamalı Çözüm Planı",
      description: "Belirli zaman dilimlerinde adım adım ilerleyen, ölçülebilir hedefler içeren plan.",
      tradeoffs: [
        "İlerleme takip edilebilir",
        "Uzun vadeli taahhüt gerektirir",
        "Esneklik sınırlı olabilir"
      ]
    }
  ];
};

const feedbackConfig = {
  good: {
    icon: ThumbsUp,
    label: "Uygun",
    activeClass: "bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:border-green-600 dark:text-green-400"
  },
  maybe: {
    icon: HelpCircle,
    label: "Belki",
    activeClass: "bg-amber-100 border-amber-500 text-amber-700 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-400"
  },
  no: {
    icon: ThumbsDown,
    label: "Uygun Değil",
    activeClass: "bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:border-red-600 dark:text-red-400"
  }
};

export default function StepAiExploration({ caseFile, onFeedback, onComplete, onBack }: Props) {
  const options = generateMockOptions(caseFile);
  const feedback = caseFile.aiFeedback || {};
  
  const allRated = options.every(opt => feedback[opt.id]);
  const hasAnyFeedback = Object.keys(feedback).length > 0;

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
          <h2 className="text-xl font-semibold">AI Çözüm Senaryoları</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Durumunuza uygun olabilecek çözüm yaklaşımları aşağıda sunulmuştur. 
            Her seçeneği değerlendirerek geri bildirim verin.
          </p>
        </div>
      </div>

      {/* Options Grid */}
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
                  {/* Option Header */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Senaryo {index + 1}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold">{option.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>

                  {/* Tradeoffs */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Dikkat Edilmesi Gerekenler:
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

                  {/* Feedback Buttons */}
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
                          onClick={() => onFeedback(option.id, type)}
                          className={`gap-2 transition-all ${isActive ? config.activeClass : ''}`}
                        >
                          <Icon className="w-4 h-4" />
                          {config.label}
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

      {/* Progress Indicator */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">{Object.keys(feedback).length}</span> / {options.length} senaryo değerlendirildi
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
          <Button variant="ghost" onClick={onBack}>
            Geri Dön
          </Button>
        )}
        <Button 
          onClick={onComplete}
          disabled={!hasAnyFeedback}
          className="ml-auto gap-2"
        >
          Değerlendirmeyi Tamamla
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center">
        Bu senaryolar yapay zeka tarafından üretilmiştir ve bağlayıcı değildir. 
        Nihai karar her zaman taraflara aittir.
      </p>
    </motion.div>
  );
}
