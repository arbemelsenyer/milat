import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Step = { key: string; label: string };

interface Props {
  steps: Step[];
  current: number;
  onJump?: (index: number) => void;
}

export function StepTimeline({ steps, current, onJump }: Props) {
  return (
    <ol className="flex flex-wrap items-center gap-2 md:gap-3 mb-8">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onJump?.(i)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                done && "bg-primary/10 border-primary/30 text-primary",
                active && "bg-primary text-primary-foreground border-primary shadow-sm",
                !done && !active && "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold",
                  done && "bg-primary text-primary-foreground",
                  active && "bg-primary-foreground/20",
                  !done && !active && "bg-muted-foreground/15",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="whitespace-nowrap">{s.label}</span>
            </button>
            {i < steps.length - 1 && <span className="text-muted-foreground/40">→</span>}
          </li>
        );
      })}
    </ol>
  );
}
