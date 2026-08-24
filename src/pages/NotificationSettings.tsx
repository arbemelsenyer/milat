import { useEffect, useState } from "react";
import { AppNavbar } from "@/components/AppNavbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, Mail, Send, ArrowRight, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { Navigate, Link } from "react-router-dom";

// Bu sayfa TERCİH TUTMAZ. İletişim tercihi dosya kapsamlıdır: bütün gönderim
// yolları `iletisim_tercihleri` satırını party_id ile okur (ajan-nobetci,
// hazirlik-foyu-gonder, send-meeting-invite, send-session-reminders,
// randevu-teklif, cancel-meeting-invite). Bir kullanıcı birden çok dosyada taraf olabildiği için
// kullanıcı düzeyinde tek bir anahtar kümesi bu modele oturmuyor.
// Sayfa, tercihin gerçekten ayarlandığı yüzeye (dosya içi "İletişim Tercihlerim")
// götüren dürüst bir yönlendirmedir. Eski `notification_preferences` anahtarları
// hiçbir gönderim yolu tarafından okunmuyordu; kaldırıldı. Tablo SİLİNMEDİ.

type DosyaSatiri = { id: string; baslik: string; basvuruNo: string | null };

export default function NotificationSettings() {
  const { user, isLoading } = useAuth();
  const [dosyalar, setDosyalar] = useState<DosyaSatiri[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let iptal = false;
    (async () => {
      // Taraf olunan dosyalar. RLS: "Party can view case_parties" → user_id = auth.uid().
      const { data: taraflar, error: tarafHata } = await supabase
        .from("case_parties")
        .select("case_id")
        .eq("user_id", user.id);
      if (iptal) return;
      if (tarafHata) {
        setHata(`Dosyalarınız okunamadı: ${tarafHata.message}`);
        setLoaded(true);
        return;
      }
      const idler = Array.from(new Set((taraflar ?? []).map((t) => t.case_id).filter(Boolean)));
      if (idler.length === 0) {
        setDosyalar([]);
        setLoaded(true);
        return;
      }
      const { data: dosyaVerisi, error: dosyaHata } = await supabase
        .from("cases")
        .select("id,title,application_no,updated_at")
        .in("id", idler)
        .order("updated_at", { ascending: false });
      if (iptal) return;
      if (dosyaHata) {
        setHata(`Dosyalarınız okunamadı: ${dosyaHata.message}`);
        setLoaded(true);
        return;
      }
      setDosyalar(
        (dosyaVerisi ?? []).map((d) => ({
          id: d.id as string,
          baslik: (d.title as string | null) ?? "Başlıksız dosya",
          basvuruNo: (d.application_no as string | null) ?? null,
        }))
      );
      setLoaded(true);
    })();
    return () => {
      iptal = true;
    };
  }, [user]);

  const sendTest = async (channels: { email?: boolean; inapp?: boolean }) => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-test-notification", {
        body: { channels },
      });
      if (error) throw error;
      const r = (data ?? {}) as { email?: { ok: boolean; error?: string }; inapp?: { ok: boolean; error?: string } };
      const parts: string[] = [];
      if (r.inapp) parts.push(`Uygulama içi: ${r.inapp.ok ? "✓" : "✗ " + (r.inapp.error ?? "")}`);
      if (r.email) parts.push(`E-posta: ${r.email.ok ? "✓" : "✗ " + (r.email.error ?? "")}`);
      const anyFail = (r.inapp && !r.inapp.ok) || (r.email && !r.email.ok);
      toast({
        title: anyFail ? "Deneme bildirimi (kısmi başarısız)" : "Deneme bildirimi gönderildi",
        description: parts.join(" · "),
        variant: anyFail ? "destructive" : "default",
      });
    } catch (e: any) {
      toast({ title: "Deneme bildirimi başarısız", description: e.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="container max-w-3xl py-8 px-4">
        <h1 className="text-2xl font-display font-semibold mb-2">İletişim Tercihleri</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Bildirimlerin sıklığını ve sessiz saatlerinizi <strong>her dosyada ayrı</strong> belirlersiniz.
        </p>

        <Card className="p-5 mb-6">
          <div className="flex gap-3">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Tercihiniz, o dosyadaki taraf kaydınıza bağlıdır. Bir kişi birden çok dosyada taraf
                olabildiği için bütün dosyalar için geçerli tek bir ayar tutulmaz.
              </p>
              <p>
                Ayarlamak istediğiniz dosyayı aşağıdan açın: dosya ekranındaki{" "}
                <strong>“İletişim Tercihlerim”</strong> sekmesinde bildirim sıklığını, sessiz saatleri
                ve kanalı seçersiniz.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-1">Taraf olduğunuz dosyalar</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Tercihlerinizi düzenlemek istediğiniz dosyayı seçin.
          </p>

          {hata && (
            <div className="text-sm rounded border border-destructive/40 bg-destructive/10 text-destructive p-3 mb-3">
              {hata}
            </div>
          )}

          {!loaded ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : dosyalar.length === 0 ? (
            <div className="text-sm text-muted-foreground space-y-3 py-2">
              <p>
                Taraf olduğunuz bir dosya bulunamadı. İletişim tercihi yalnız taraf olduğunuz
                dosyalarda ayarlanır.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link to="/cases">Dosyalarım</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {dosyalar.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-4 px-2 py-3 border-b last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.baslik}</p>
                    {d.basvuruNo && (
                      <p className="text-xs text-muted-foreground">Başvuru no: {d.basvuruNo}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" asChild className="shrink-0">
                    <Link to={`/case-room/${d.id}?sekme=iletisim`}>
                      İletişim tercihlerim <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 mt-6">
          <h2 className="font-semibold mb-1">Bildirim kanalınızı deneyin</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Deneme bildirimi seçili kanallara anlık tek bir test mesajı gönderir; hiçbir tercihi
            değiştirmez.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={testing}
              onClick={() => sendTest({ email: true, inapp: true })}
            >
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Deneme bildirimi gönder
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={testing}
              onClick={() => sendTest({ inapp: true, email: false })}
            >
              <Bell className="h-4 w-4 mr-1" /> Sadece uygulama içi
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={testing}
              onClick={() => sendTest({ email: true, inapp: false })}
            >
              <Mail className="h-4 w-4 mr-1" /> Sadece e-posta
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
