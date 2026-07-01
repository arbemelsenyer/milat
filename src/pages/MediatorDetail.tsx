import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star, MapPin, Clock, Briefcase, Languages, ChevronLeft, CalendarCheck } from "lucide-react";
import { AppNavbar } from "@/components/AppNavbar";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Mediator {
  id: string;
  user_id: string;
  full_name: string;
  photo_url: string | null;
  specializations: string[] | null;
  total_cases: number | null;
  success_rate: number | null;
  avg_resolution_days: number | null;
  hourly_rate: number | null;
  languages: string[] | null;
  bio: string | null;
  rating: number | null;
  city: string | null;
  is_available: boolean | null;
}

const TIME_SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

export default function MediatorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mediator, setMediator] = useState<Mediator | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [slot, setSlot] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [cases, setCases] = useState<Array<{ id: string; title: string }>>([]);
  const [caseId, setCaseId] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: m } = await supabase.from("mediators").select("id, user_id, full_name, photo_url, specializations, total_cases, success_rate, avg_resolution_days, languages, bio, rating, city, is_available").eq("id", id).maybeSingle();
      setMediator(m as Mediator | null);

      const { data: av } = await supabase
        .from("mediator_availability")
        .select("day_of_week")
        .eq("mediator_id", id)
        .eq("is_recurring", true);
      setAvailability(new Set((av ?? []).map((a) => a.day_of_week as number)));

      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: cs } = await supabase
          .from("cases")
          .select("id,title")
          .eq("user_id", u.user.id)
          .in("status", ["intake", "assigned", "scheduled", "in_progress"]);
        setCases(cs ?? []);
      }
      setLoading(false);
    })();
  }, [id]);

  const isDayAvailable = (d: Date) =>
    availability.size === 0 ? true : availability.has(d.getDay());

  const submitRequest = async () => {
    if (!date || !slot || !mediator) {
      toast.error("Tarih ve saat seçin");
      return;
    }
    if (!caseId) {
      toast.error("Önce bir başvuru seçin");
      return;
    }
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Giriş yapın");

      const requestedAt = new Date(`${format(date, "yyyy-MM-dd")}T${slot}:00`).toISOString();

      const { error } = await supabase.from("mediator_requests").insert({
        case_id: caseId,
        mediator_id: mediator.id,
        user_id: u.user.id,
        scheduled_date: requestedAt,
        preferred_dates: [format(date, "yyyy-MM-dd")],
        preferred_time: slot,
        status: "pending",
        notes: `Randevu talebi: ${format(date, "d MMMM yyyy", { locale: tr })} ${slot}`,
      });
      if (error) throw error;

      await supabase.from("notifications").insert([
        {
          user_id: mediator.user_id,
          title: "Yeni randevu talebi",
          message: `${format(date, "d MMMM yyyy", { locale: tr })} ${slot} için randevu talebi aldınız.`,
          type: "info",
          link: "/mediator",
        },
        {
          user_id: u.user.id,
          title: "Randevu talebiniz alındı",
          message: `${mediator.full_name} arabulucu inceleyecek.`,
          type: "info",
          link: "/dashboard",
        },
      ]);

      toast.success("Randevu talebi gönderildi");
      navigate("/dashboard");
    } catch (e) {
      console.error(e);
      toast.error("Talep gönderilemedi: " + (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppNavbar />
        <div className="container mx-auto p-8">Yükleniyor…</div>
      </div>
    );
  }

  if (!mediator) {
    return (
      <div className="min-h-screen bg-background">
        <AppNavbar />
        <div className="container mx-auto p-8">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4 mr-2" /> Geri
          </Button>
          <p className="mt-6 text-muted-foreground">Arabulucu bulunamadı.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="container mx-auto p-4 md:p-8 max-w-6xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ChevronLeft className="h-4 w-4 mr-2" /> Geri
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={mediator.photo_url ?? undefined} />
                  <AvatarFallback>{mediator.full_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className="text-2xl font-bold">{mediator.full_name}</h1>
                    {mediator.is_available ? (
                      <Badge className="bg-green-600">Müsait</Badge>
                    ) : (
                      <Badge variant="secondary">Meşgul</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                    {mediator.rating != null && (
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {Number(mediator.rating).toFixed(1)}
                      </span>
                    )}
                    {mediator.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> {mediator.city}
                      </span>
                    )}
                  </div>

                </div>
              </div>

              {mediator.bio && <p className="mt-4 text-sm leading-relaxed">{mediator.bio}</p>}

              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{mediator.total_cases ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Toplam Başvuru</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {mediator.success_rate != null ? `${Number(mediator.success_rate).toFixed(0)}%` : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">Başarı Oranı</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{mediator.avg_resolution_days ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">Ort. Gün</div>
                </div>
              </div>
            </Card>

            {mediator.specializations?.length ? (
              <Card className="p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> Uzmanlık Alanları
                </h3>
                <div className="flex flex-wrap gap-2">
                  {mediator.specializations.map((s) => (
                    <Badge key={s} variant="outline">{s}</Badge>
                  ))}
                </div>
              </Card>
            ) : null}

            {mediator.languages?.length ? (
              <Card className="p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Languages className="h-4 w-4" /> Diller
                </h3>
                <div className="flex flex-wrap gap-2">
                  {mediator.languages.map((l) => (
                    <Badge key={l} variant="secondary">{l}</Badge>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>

          <Card className="p-6 h-fit sticky top-24">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" /> Randevu Talep Et
            </h3>

            {cases.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-4">
                Önce <a className="text-primary underline" href="/mediation-engine">başvuru</a> oluşturun.
              </p>
            ) : (
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground">Başvuru</label>
                <select
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Seçin…</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            )}

            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0)) || !isDayAvailable(d)}
              locale={tr}
              className="rounded-md border"
            />

            {date && (
              <div className="mt-4">
                <label className="text-xs font-medium text-muted-foreground">Saat</label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {TIME_SLOTS.map((t) => (
                    <Button
                      key={t}
                      variant={slot === t ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSlot(t)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="w-full mt-4"
              onClick={submitRequest}
              disabled={submitting || !date || !slot || !caseId}
            >
              {submitting ? "Gönderiliyor…" : "Randevu Talep Et"}
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
}
