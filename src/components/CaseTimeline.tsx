import { CheckCircle2, Circle, Clock } from "lucide-react";
import { format } from "date-fns";
import { tr, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  date: string | Date;
  state: "done" | "current" | "pending";
}

interface CaseTimelineProps {
  events: TimelineEvent[];
}

export function CaseTimeline({ events }: CaseTimelineProps) {
  const { language } = useLanguage();
  const locale = language === "tr" ? tr : enUS;

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        {language === "tr" ? "Henüz olay yok." : "No events yet."}
      </p>
    );
  }

  return (
    <ol className="relative border-l-2 border-border ml-3 space-y-5">
      {events.map((e) => {
        const Icon = e.state === "done" ? CheckCircle2 : e.state === "current" ? Clock : Circle;
        const color =
          e.state === "done"
            ? "text-success bg-success/10 border-success/30"
            : e.state === "current"
            ? "text-primary bg-primary/10 border-primary/40 animate-pulse-soft"
            : "text-muted-foreground bg-muted border-border";
        return (
          <li key={e.id} className="ml-5">
            <span className={`absolute -left-[14px] flex items-center justify-center w-7 h-7 rounded-full border-2 ${color}`}>
              <Icon className="w-3.5 h-3.5" />
            </span>
            <div className="pb-1">
              <p className="text-sm font-semibold text-foreground">{e.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(e.date), "PPp", { locale })}
              </p>
              {e.description && (
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{e.description}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
