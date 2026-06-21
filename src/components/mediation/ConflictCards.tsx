import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

export type ConflictCard = {
  title: string;
  riskLevel: "low" | "medium" | "high";
  description: string;
  precedent?: string;
};

export function ConflictCards({ cards }: { cards: ConflictCard[] }) {
  if (!cards?.length) return null;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {cards.map((c, i) => {
        const Icon = c.riskLevel === "high" ? AlertTriangle : c.riskLevel === "medium" ? AlertCircle : Info;
        const tone =
          c.riskLevel === "high"
            ? "border-destructive/40 bg-destructive/5"
            : c.riskLevel === "medium"
              ? "border-amber-400/40 bg-amber-50/40 dark:bg-amber-950/20"
              : "border-primary/30 bg-primary/5";
        return (
          <Card key={i} className={`p-4 space-y-2 ${tone}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold">{c.title}</h4>
              </div>
              <Badge variant={c.riskLevel === "high" ? "destructive" : "secondary"}>
                {c.riskLevel === "high" ? "Yüksek" : c.riskLevel === "medium" ? "Orta" : "Düşük"} Risk
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{c.description}</p>
            {c.precedent && (
              <p className="text-xs italic text-muted-foreground/80 border-l-2 border-primary/30 pl-2">
                {c.precedent}
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
