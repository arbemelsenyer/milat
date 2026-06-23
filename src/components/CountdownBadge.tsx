import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface CountdownBadgeProps {
  target: string | Date;
}

function diff(target: Date) {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return { d, h, m };
}

export function CountdownBadge({ target }: CountdownBadgeProps) {
  const { language } = useLanguage();
  const date = typeof target === "string" ? new Date(target) : target;
  const [v, setV] = useState(() => diff(date));

  useEffect(() => {
    const t = setInterval(() => setV(diff(date)), 30_000);
    return () => clearInterval(t);
  }, [date]);

  if (!v) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Clock className="w-3.5 h-3.5" />
        {language === "tr" ? "Geçmiş" : "Past"}
      </span>
    );
  }

  const label =
    language === "tr"
      ? `${v.d}g ${v.h}s ${v.m}dk`
      : `${v.d}d ${v.h}h ${v.m}m`;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
      <Clock className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
