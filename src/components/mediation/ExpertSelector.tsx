import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Award, Star, MapPin, Loader2, Check } from "lucide-react";

export interface Expert {
  id: string;
  full_name: string;
  title: string | null;
  specialization: string;
  niche_area: string;
  bio: string | null;
  hourly_rate: number;
  city: string | null;
  years_experience: number;
  rating: number;
}

interface Props {
  niche: string;
  selectedId?: string | null;
  onSelect: (e: Expert) => void;
}

export function ExpertSelector({ niche, selectedId, onSelect }: Props) {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterNiche, setFilterNiche] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc("list_experts_for_mediator", {
        filter_niche: filterNiche ? niche : null,
      });
      setExperts((data as Expert[]) ?? []);
      setLoading(false);
    })();
  }, [niche, filterNiche]);

  if (loading) {
    return (
      <Card className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Bilirkişiler yükleniyor...
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" /> Bilirkişi Seçimi ({niche})
        </h3>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={filterNiche}
            onChange={(e) => setFilterNiche(e.target.checked)}
          />
          Sadece bu nişe uygun
        </label>
      </div>
      {experts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Bu niş için bilirkişi bulunamadı. Filtreyi kapatabilirsiniz.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {experts.map((e) => {
            const sel = selectedId === e.id;
            return (
              <Card
                key={e.id}
                className={`p-4 cursor-pointer transition-colors ${
                  sel
                    ? "border-primary bg-primary/[0.04]"
                    : "hover:border-primary/40"
                }`}
                onClick={() => onSelect(e)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{e.full_name}</div>
                    <div className="text-xs text-muted-foreground">{e.title}</div>
                  </div>
                  {sel && <Check className="h-4 w-4 text-primary" />}
                </div>
                <div className="text-sm mt-2 text-muted-foreground line-clamp-2">
                  {e.bio}
                </div>
                <div className="flex items-center gap-3 text-xs mt-3 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">
                    {e.specialization}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    {e.rating}
                  </span>
                  {e.city && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {e.city}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {e.years_experience} yıl
                  </span>
                  <span className="ml-auto font-medium">
                    {Number(e.hourly_rate).toLocaleString("tr-TR")} ₺/saat
                  </span>
                </div>
                {!sel && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onSelect(e);
                    }}
                  >
                    Bu Bilirkişiyi Seç
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
