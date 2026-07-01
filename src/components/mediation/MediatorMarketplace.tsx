import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Clock, CheckCircle2, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Mediator = {
  id: string;
  full_name: string;
  photo_url: string | null;
  specializations: string[];
  total_cases: number;
  success_rate: number;
  avg_resolution_days: number;
  languages: string[];
  bio: string | null;
  rating: number;
  is_available: boolean;
  city: string | null;
};

interface Props {
  niche?: string;
  onSelect: (m: Mediator) => void;
}

export function MediatorMarketplace({ niche, onSelect }: Props) {
  const [mediators, setMediators] = useState<Mediator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lang, setLang] = useState<string>("");
  const [onlyAvail, setOnlyAvail] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("mediators_public" as any)
        .select("id, full_name, photo_url, specializations, total_cases, success_rate, avg_resolution_days, languages, bio, rating, is_available, city")
        .order("rating", { ascending: false });
      if (!error && data) setMediators(data as unknown as Mediator[]);
      setLoading(false);
    })();
  }, []);


  const filtered = useMemo(() => {
    return mediators.filter((m) => {
      if (onlyAvail && !m.is_available) return false;
      if (lang && !m.languages.includes(lang)) return false;
      if (niche && m.specializations.length && !m.specializations.some((s) => s.toLowerCase().includes(niche.toLowerCase()))) {
        // soft filter — keep if niche unknown
      }
      if (search) {
        const q = search.toLowerCase();
        if (!m.full_name.toLowerCase().includes(q) && !m.specializations.join(" ").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [mediators, search, lang, onlyAvail, niche]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Input placeholder="Ara: isim veya uzmanlık" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="">Tüm Diller</option>
            <option value="TR">Türkçe</option>
            <option value="EN">İngilizce</option>
            <option value="AR">Arapça</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyAvail} onChange={(e) => setOnlyAvail(e.target.checked)} />
            Sadece müsait olanlar
          </label>
        </div>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Yükleniyor...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">Filtrelere uyan arabulucu bulunamadı.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <Card key={m.id} className="p-5 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={m.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-semibold text-primary">{m.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{m.full_name}</h4>
                  <div className="flex items-center gap-1 text-sm text-amber-600">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span>{Number(m.rating).toFixed(1)}</span>
                    <span className="text-muted-foreground">· {m.total_cases} başvuru</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {m.specializations.slice(0, 3).map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Başarı: %{Math.round(m.success_rate)}</div>
                <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Ort. çözüm: {m.avg_resolution_days} gün</div>
                <div className="flex items-center gap-1.5"><Globe className="h-3 w-3" /> {m.languages.join(", ")}</div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t gap-2">
                <span className="text-xs text-muted-foreground">Ücret için iletişime geçin</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/mediator/${m.id}`}>Profil</a>
                  </Button>
                  <Button size="sm" onClick={() => onSelect(m)} disabled={!m.is_available}>Randevu</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
