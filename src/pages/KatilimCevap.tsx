// Girişsiz tek-dokunuş katılım teyidi sayfası (/katilim/:token).
// RandevuCevap ile AYNI desen: menü, giriş bağlantısı ve başka yönlendirme yoktur;
// sayfa yalnız token'la konuşur ve karşı tarafa ait hiçbir veri taşımaz.
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Durum = "yukleniyor" | "acik" | "gecersiz" | "tamam" | "hata";

export default function KatilimCevap() {
  const { token } = useParams<{ token: string }>();
  const [durum, setDurum] = useState<Durum>("yukleniyor");
  const [tarafAdi, setTarafAdi] = useState<string | null>(null);
  const [dosyaNo, setDosyaNo] = useState<string | null>(null);
  const [konu, setKonu] = useState<string | null>(null);
  const [arabulucu, setArabulucu] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [secilen, setSecilen] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    if (!token) { setDurum("gecersiz"); return; }
    try {
      const { data, error } = await supabase.functions.invoke("taraf-katilim", {
        body: { action: "getir", token },
      });
      const d = data as any;
      if (error || !d || d.error || d.durum !== "beklemede") { setDurum("gecersiz"); return; }
      setTarafAdi(d.taraf_adi ?? null);
      setDosyaNo(d.dosya_no ?? null);
      setKonu(d.konu ?? null);
      setArabulucu(d.arabulucu ?? null);
      setDurum("acik");
    } catch {
      setDurum("hata");
    }
  }, [token]);

  useEffect(() => { void yukle(); }, [yukle]);

  async function cevapla(secim: string) {
    if (gonderiliyor) return;
    setGonderiliyor(true);
    try {
      const { data, error } = await supabase.functions.invoke("taraf-katilim", {
        body: { action: "cevapla", token, secim },
      });
      const d = data as any;
      if (error || !d || d.error) { setDurum("gecersiz"); return; }
      setSecilen(secim);
      setDurum("tamam");
    } catch {
      setDurum("hata");
    } finally {
      setGonderiliyor(false);
    }
  }

  const tesekkurMetni = secilen === "katilmiyor"
    ? "Teşekkürler, cevabınız kaydedildi. Arabulucunuz bilgilendirildi."
    : secilen === "bilgi_istiyor"
      ? "Teşekkürler, arabulucunuz sizinle iletişime geçecek."
      : "Teşekkürler, kaydedildi.";

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 py-10">
      <Helmet><title>Arabuluculuk süreci</title></Helmet>
      <div className="w-full max-w-md space-y-6">
        {durum === "yukleniyor" && (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        )}

        {durum === "gecersiz" && (
          <p className="text-center text-lg py-16">Bu bağlantının süresi dolmuş.</p>
        )}

        {durum === "hata" && (
          <p className="text-center text-lg py-16">Bağlantı kurulamadı. Lütfen daha sonra tekrar deneyin.</p>
        )}

        {durum === "tamam" && (
          <p className="text-center text-lg py-16">{tesekkurMetni}</p>
        )}

        {durum === "acik" && (
          <>
            {tarafAdi && <p className="text-center text-sm text-muted-foreground">Sayın {tarafAdi},</p>}
            <p className="text-center text-xl font-semibold leading-snug">
              Bir arabuluculuk sürecine taraf olarak davet edildiniz.
            </p>
            <div className="rounded-lg border p-4 text-sm space-y-1">
              {dosyaNo && <div><span className="text-muted-foreground">Dosya No:</span> {dosyaNo}</div>}
              {konu && <div><span className="text-muted-foreground">Uyuşmazlık konusu:</span> {konu}</div>}
              {arabulucu && <div><span className="text-muted-foreground">Arabulucu:</span> {arabulucu}</div>}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Arabuluculuk, tarafların bir arabulucu eşliğinde anlaşmaya çalıştığı gizli bir
              süreçtir. Katılım kararınızı aşağıdan bildirebilirsiniz.
            </p>
            <div className="space-y-3">
              <button
                type="button"
                disabled={gonderiliyor}
                onClick={() => cevapla("katiliyor")}
                className="w-full rounded-lg bg-primary text-primary-foreground text-lg font-semibold py-5 disabled:opacity-60"
              >
                Katılıyorum
              </button>
              <button
                type="button"
                disabled={gonderiliyor}
                onClick={() => cevapla("bilgi_istiyor")}
                className="w-full rounded-lg border text-lg font-semibold py-5 disabled:opacity-60"
              >
                Bilgi istiyorum
              </button>
              <button
                type="button"
                disabled={gonderiliyor}
                onClick={() => cevapla("katilmiyor")}
                className="w-full rounded-lg border text-lg font-semibold py-5 disabled:opacity-60"
              >
                Katılmıyorum
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
