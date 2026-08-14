import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// mediator_availability tablosunun GERÇEK sütunları Türkçedir: user_id · gun (tarih) ·
// baslangic · bitis. day_of_week / start_time / end_time / is_recurring / specific_date
// alanları veritabanında YOKTUR — bu ekranın sorguları o yüzden hata döndürüyordu.
// Tip gerçek şemaya hizalandı; tabloya ve sütun adlarına dokunulmadı.
interface AvailabilitySlot {
  id: string;
  user_id: string;
  gun: string;         // YYYY-MM-DD
  baslangic: string;   // HH:MM:SS
  bitis: string;       // HH:MM:SS
}

const dayNames = {
  tr: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
];

export function MediatorAvailabilityCalendar() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [selectedDay, setSelectedDay] = useState<string>('1');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [isRecurring, setIsRecurring] = useState(true);
  const [specificDate, setSpecificDate] = useState<Date | undefined>(undefined);

  const t = {
    tr: {
      title: 'Müsaitlik Takvimi',
      description: 'Arabuluculuk oturumları için müsait olduğunuz zamanları belirleyin',
      addSlot: 'Zaman Dilimi Ekle',
      dayOfWeek: 'Gün',
      startTime: 'Başlangıç',
      endTime: 'Bitiş',
      recurring: 'Her hafta tekrarla',
      specificDate: 'Belirli tarih',
      save: 'Kaydet',
      cancel: 'İptal',
      noSlots: 'Henüz müsaitlik belirlenmedi',
      noSlotsDesc: 'Müsait olduğunuz zamanları ekleyin',
      deleteConfirm: 'Bu zaman dilimi silindi',
      saved: 'Müsaitlik kaydedildi',
      error: 'Bir hata oluştu',
    },
    en: {
      title: 'Availability Calendar',
      description: 'Set your available time slots for mediation sessions',
      addSlot: 'Add Time Slot',
      dayOfWeek: 'Day',
      startTime: 'Start Time',
      endTime: 'End Time',
      recurring: 'Repeat weekly',
      specificDate: 'Specific date',
      save: 'Save',
      cancel: 'Cancel',
      noSlots: 'No availability set',
      noSlotsDesc: 'Add your available time slots',
      deleteConfirm: 'Time slot deleted',
      saved: 'Availability saved',
      error: 'An error occurred',
    },
  };

  const text = t[language];

  useEffect(() => {
    if (user) {
      fetchAvailability();
    }
  }, [user]);

  const fetchAvailability = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('mediator_availability')
      .select('id, user_id, gun, baslangic, bitis')
      .eq('user_id', user.id)
      .order('gun', { ascending: true })
      .order('baslangic', { ascending: true });

    if (!error && data) {
      setAvailability(data as AvailabilitySlot[]);
    }
    setIsLoading(false);
  };

  const handleAddSlot = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    // Tabloda tekrar eden gün (is_recurring / day_of_week) sütunu YOKTUR; kayıt somut
    // tarihlidir. Belirli tarih seçilmişse o yazılır; seçilmemişse formdaki haftanın
    // gününün BİR SONRAKİ tarihi hesaplanır — uydurma bir tekrar kaydı üretilmez.
    const secilenGunNo = parseInt(selectedDay, 10);
    const hedefTarih = (!isRecurring && specificDate)
      ? specificDate
      : (() => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          const fark = (secilenGunNo - d.getDay() + 7) % 7 || 7;
          d.setDate(d.getDate() + fark);
          return d;
        })();

    const slotData = {
      user_id: user.id,
      gun: format(hedefTarih, 'yyyy-MM-dd'),
      baslangic: startTime,
      bitis: endTime,
    };

    const { error } = await supabase
      .from('mediator_availability')
      .insert(slotData);

    if (error) {
      toast({
        variant: 'destructive',
        title: text.error,
        description: error.message,
      });
    } else {
      toast({
        title: text.saved,
      });
      fetchAvailability();
      setIsDialogOpen(false);
      resetForm();
    }
    
    setIsSaving(false);
  };

  const handleDeleteSlot = async (id: string) => {
    const { error } = await supabase
      .from('mediator_availability')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        variant: 'destructive',
        title: text.error,
        description: error.message,
      });
    } else {
      toast({
        title: text.deleteConfirm,
      });
      setAvailability(prev => prev.filter(s => s.id !== id));
    }
  };

  const resetForm = () => {
    setSelectedDay('1');
    setStartTime('09:00');
    setEndTime('17:00');
    setIsRecurring(true);
    setSpecificDate(undefined);
  };

  // Ekran haftanın günlerine göre gruplar; gün numarası somut tarihten türetilir.
  const groupedByDay = availability.reduce((acc, slot) => {
    const day = new Date(`${String(slot.gun).slice(0, 10)}T00:00:00`).getDay();
    if (!Number.isFinite(day)) return acc;
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {} as Record<number, AvailabilitySlot[]>);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              {text.title}
            </CardTitle>
            <CardDescription>{text.description}</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                {text.addSlot}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{text.addSlot}</DialogTitle>
                <DialogDescription>
                  {text.description}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="recurring"
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                  />
                  <Label htmlFor="recurring">{text.recurring}</Label>
                </div>
                
                {isRecurring ? (
                  <div className="space-y-2">
                    <Label>{text.dayOfWeek}</Label>
                    <Select value={selectedDay} onValueChange={setSelectedDay}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dayNames[language].map((name, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>{text.specificDate}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !specificDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {specificDate ? format(specificDate, 'PPP', { locale: language === 'tr' ? tr : enUS }) : text.specificDate}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={specificDate}
                          onSelect={setSpecificDate}
                          initialFocus
                          locale={language === 'tr' ? tr : enUS}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{text.startTime}</Label>
                    <Select value={startTime} onValueChange={setStartTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{text.endTime}</Label>
                    <Select value={endTime} onValueChange={setEndTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.filter(t => t > startTime).map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {text.cancel}
                </Button>
                <Button onClick={handleAddSlot} disabled={isSaving || (!isRecurring && !specificDate)}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {text.save}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {availability.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-foreground">{text.noSlots}</h3>
            <p className="text-sm text-muted-foreground">{text.noSlotsDesc}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
              const slots = groupedByDay[day] || [];
              if (slots.length === 0) return null;
              
              return (
                <div key={day} className="space-y-2">
                  <h4 className="font-medium text-sm text-foreground">
                    {dayNames[language][day]}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => (
                      <Badge
                        key={slot.id}
                        variant="secondary"
                        className="flex items-center gap-2 py-1.5 px-3"
                      >
                        <Clock className="w-3 h-3" />
                        {String(slot.baslangic).slice(0, 5)} - {String(slot.bitis).slice(0, 5)}
                        {/* Kayıt somut tarihlidir; rozetteki küçük tarih notu aynı yerde
                            kalır, yalnız kaynağı specific_date yerine gun sütunudur. */}
                        {slot.gun && (
                          <span className="text-xs opacity-70">
                            ({format(new Date(`${String(slot.gun).slice(0, 10)}T00:00:00`), 'dd/MM', { locale: language === 'tr' ? tr : enUS })})
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="ml-1 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
