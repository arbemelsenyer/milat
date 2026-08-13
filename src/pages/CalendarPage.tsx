import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  format, differenceInDays, startOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, addDays, isSameMonth, isSameDay, isBefore, parseISO,
} from "date-fns";
import { tr } from "date-fns/locale";
import { Loader2, Calendar as CalIcon, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { AppNavbar } from "@/components/AppNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Item {
  kind: "session" | "deadline_total";
  date: string;
  case_id: string;
  label: string;
  application_no?: string | null;
}

function colorFor(days: number) {
  if (days < 0) return "bg-black text-white";
  if (days <= 3) return "bg-destructive text-destructive-foreground";
  if (days <= 7) return "bg-warning text-warning-foreground";
  return "bg-success text-success-foreground";
}

/* ===================== MÜSAİTLİK (mediator_availability) ===================== */
// Yalnız kayıt ekranıdır: randevu bağlama, ajan veya bildirim yoktur.
// Tablo hazır kabul edilir; migration yazılmaz. RLS gereği herkes yalnız
// kendi satırlarını görür — sorgular yine de user_id ile daraltılır.

type AvailRow = { id: string; gun: string; baslangic: string; bitis: string };

const availTable = () => (supabase.from("mediator_availability" as any) as any);
const hhmm = (t: string) => String(t ?? "").slice(0, 5);
const DAY_HEADS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function AvailabilitySection({ userId }: { userId: string }) {
  const [anchor, setAnchor] = useState<Date>(() => startOfMonth(new Date()));
  const [rows, setRows] = useState<AvailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [copyN, setCopyN] = useState("5");
  const [busy, setBusy] = useState(false);

  const monthStart = useMemo(() => startOfMonth(anchor), [anchor]);
  const monthEnd = useMemo(() => endOfMonth(anchor), [anchor]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await availTable()
      .select("id, gun, baslangic, bitis")
      .eq("user_id", userId)
      .gte("gun", format(monthStart, "yyyy-MM-dd"))
      .lte("gun", format(monthEnd, "yyyy-MM-dd"))
      .order("gun", { ascending: true })
      .order("baslangic", { ascending: true });
    if (error) {
      toast({ title: "Müsaitlik yüklenemedi", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows((data ?? []) as AvailRow[]);
    }
    setLoading(false);
  }, [userId, monthStart, monthEnd]);

  useEffect(() => { void load(); }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, AvailRow[]>();
    rows.forEach((r) => {
      const key = String(r.gun).slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return map;
  }, [rows]);

  const gridDays = useMemo(() => eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  }), [monthStart, monthEnd]);

  const today = startOfDay(new Date());
  const selectedRows = selected ? (byDay.get(selected) ?? []) : [];
  const selectedIsPast = selected ? isBefore(parseISO(selected), today) : false;

  async function addInterval() {
    if (!selected || selectedIsPast) return;
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || endTime <= startTime) {
      toast({ title: "Saat aralığı geçersiz", description: "Bitiş saati başlangıçtan sonra olmalı.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { error } = await availTable().insert({
        user_id: userId, gun: selected, baslangic: startTime, bitis: endTime,
      });
      if (error) throw error;
      await load();
    } catch (e: any) {
      toast({ title: "Aralık eklenemedi", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function removeInterval(id: string) {
    setBusy(true);
    try {
      const { error } = await availTable().delete().eq("id", id);
      if (error) throw error;
      await load();
    } catch (e: any) {
      toast({ title: "Silinemedi", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  // Tek kolaylık aracı: seçili günün aralıklarını sonraki N güne kopyalar.
  async function copyToNextDays() {
    if (!selected || selectedIsPast) return;
    const n = Math.max(1, Math.min(30, Number(copyN) || 0));
    if (!selectedRows.length) {
      toast({ title: "Kopyalanacak aralık yok", description: "Önce bu güne aralık ekleyin." });
      return;
    }
    setBusy(true);
    try {
      const firstDay = format(addDays(parseISO(selected), 1), "yyyy-MM-dd");
      const lastDay = format(addDays(parseISO(selected), n), "yyyy-MM-dd");
      // Hedef aralıktaki mevcut kayıtlar okunur ki aynı aralık iki kez yazılmasın.
      const { data: existing, error: exErr } = await availTable()
        .select("gun, baslangic, bitis")
        .eq("user_id", userId)
        .gte("gun", firstDay)
        .lte("gun", lastDay);
      if (exErr) throw exErr;
      const seen = new Set(
        ((existing ?? []) as any[]).map((r) => `${String(r.gun).slice(0, 10)}|${hhmm(r.baslangic)}|${hhmm(r.bitis)}`)
      );
      const payload: any[] = [];
      for (let i = 1; i <= n; i++) {
        const gun = format(addDays(parseISO(selected), i), "yyyy-MM-dd");
        for (const r of selectedRows) {
          const key = `${gun}|${hhmm(r.baslangic)}|${hhmm(r.bitis)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          payload.push({ user_id: userId, gun, baslangic: hhmm(r.baslangic), bitis: hhmm(r.bitis) });
        }
      }
      if (!payload.length) {
        toast({ title: "Yeni kayıt oluşmadı", description: "Aynı aralıklar hedef günlerde zaten var." });
        return;
      }
      const { error } = await availTable().insert(payload);
      if (error) throw error;
      toast({ title: `${payload.length} aralık kopyalandı` });
      await load();
    } catch (e: any) {
      toast({ title: "Kopyalanamadı", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">
              {format(anchor, "LLLL yyyy", { locale: tr })}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => { setAnchor((a) => addMonths(a, -1)); setSelected(null); }} title="Önceki ay">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setAnchor(startOfMonth(new Date())); setSelected(null); }}>
                Bu ay
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setAnchor((a) => addMonths(a, 1)); setSelected(null); }} title="Sonraki ay">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_HEADS.map((d) => (
                  <div key={d} className="text-[11px] text-muted-foreground text-center py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {gridDays.map((d) => {
                  const key = format(d, "yyyy-MM-dd");
                  const list = byDay.get(key) ?? [];
                  const inMonth = isSameMonth(d, anchor);
                  const isToday = isSameDay(d, today);
                  const past = isBefore(startOfDay(d), today);
                  const isSelected = selected === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelected(key)}
                      className={[
                        "h-16 rounded border text-left p-1 transition",
                        inMonth ? "" : "opacity-40",
                        list.length ? "bg-success/15 border-success/40" : "bg-background",
                        isSelected ? "ring-2 ring-primary" : "",
                        isToday ? "border-primary" : "",
                        past ? "text-muted-foreground" : "",
                      ].join(" ")}
                    >
                      <div className={"text-xs " + (isToday ? "font-bold text-primary" : "")}>{format(d, "d")}</div>
                      {list.length > 0 && (
                        <div className="text-[10px] leading-tight mt-0.5 text-success-foreground/80">
                          <div className="truncate">{hhmm(list[0].baslangic)}–{hhmm(list[0].bitis)}</div>
                          {list.length > 1 && <div className="text-muted-foreground">+{list.length - 1}</div>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {format(parseISO(selected), "d MMMM yyyy, EEEE", { locale: tr })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Bu gün için müsaitlik aralığı yok.</p>
            ) : (
              <div className="space-y-1">
                {selectedRows.map((r) => (
                  <div key={r.id} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                    <span>{hhmm(r.baslangic)} – {hhmm(r.bitis)}</span>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => removeInterval(r.id)} title="Sil">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {selectedIsPast ? (
              <p className="text-sm text-muted-foreground italic">Geçmiş güne aralık eklenemez.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <Label className="text-xs">Başlangıç</Label>
                    <Input type="time" className="h-9 w-[120px]" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Bitiş</Label>
                    <Input type="time" className="h-9 w-[120px]" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                  <Button size="sm" disabled={busy} onClick={addInterval}>
                    {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                    Aralık ekle
                  </Button>
                </div>

                <div className="flex flex-wrap items-end gap-2 border-t pt-3">
                  <div>
                    <Label className="text-xs">Sonraki gün sayısı</Label>
                    <Input
                      type="number" min={1} max={30} className="h-9 w-[100px]"
                      value={copyN} onChange={(e) => setCopyN(e.target.value)}
                    />
                  </div>
                  <Button size="sm" variant="secondary" disabled={busy || selectedRows.length === 0} onClick={copyToNextDays}>
                    Bu günün aralıklarını sonraki N güne kopyala
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isLoading && !user) navigate("/auth"); }, [isLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: sessions }, { data: cases }] = await Promise.all([
        supabase.from("case_sessions").select("id,case_id,scheduled_at,status").order("scheduled_at", { ascending: true }),
        supabase.from("cases").select("id,application_no,title,deadline_total").not("deadline_total", "is", null),
      ]);
      const caseMap = new Map((cases ?? []).map((c: any) => [c.id, c]));
      const list: Item[] = [];
      (sessions ?? []).forEach((s: any) => {
        if (s.status === "completed") return;
        const c = caseMap.get(s.case_id) as any;
        list.push({
          kind: "session",
          date: s.scheduled_at,
          case_id: s.case_id,
          label: `Toplantı — ${c?.title ?? c?.application_no ?? "Başvuru"}`,
          application_no: c?.application_no,
        });
      });
      (cases ?? []).forEach((c: any) => {
        if (!c.deadline_total) return;
        list.push({
          kind: "deadline_total",
          date: c.deadline_total,
          case_id: c.id,
          label: `Yasal süre — ${c.title ?? c.application_no ?? "Başvuru"}`,
          application_no: c.application_no,
        });
      });
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setItems(list);
      setLoading(false);
    })();
  }, [user]);

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    items.forEach((it) => {
      const key = format(startOfDay(new Date(it.date)), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    });
    return Array.from(map.entries());
  }, [items]);

  if (isLoading || !user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Takvim | MediPact AI</title></Helmet>
      <AppNavbar />
      <main className="container max-w-4xl py-6 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold">📅 Takvim</h1>
          <p className="text-sm text-muted-foreground">Yaklaşan toplantılar, yasal süreler ve müsaitlik takviminiz.</p>
        </div>

        <Tabs defaultValue="ajanda" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ajanda">Ajanda</TabsTrigger>
            <TabsTrigger value="musaitlik">Müsaitlik</TabsTrigger>
          </TabsList>

          <TabsContent value="ajanda" className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : grouped.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
              <CalIcon className="h-10 w-10" />
              <p>Planlı toplantı veya süre yok.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {grouped.map(([day, list]) => (
              <Card key={day}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {format(new Date(day), "EEEE, d MMMM yyyy", { locale: tr })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {list.map((it, i) => {
                    const days = differenceInDays(new Date(it.date), new Date());
                    return (
                      <div
                        key={i}
                        onClick={() => navigate(`/cases/${it.case_id}`)}
                        className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant={it.kind === "session" ? "default" : "outline"}>
                            {it.kind === "session" ? "Toplantı" : "Süre"}
                          </Badge>
                          <span className="truncate text-sm">{it.label}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">{format(new Date(it.date), "HH:mm")}</span>
                          <Badge className={colorFor(days)}>
                            {days < 0 ? `${Math.abs(days)}g geçti` : days === 0 ? "Bugün" : `${days}g`}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </TabsContent>

          <TabsContent value="musaitlik">
            <AvailabilitySection userId={user.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
