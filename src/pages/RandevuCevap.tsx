// Girişsiz tek-dokunuş cevap sayfası (/randevu/:token).
// Menü, giriş bağlantısı ve başka hiçbir yönlendirme yoktur; sayfa yalnız
// token'la konuşur ve dosya verisi taşımaz.
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Secenek = { gun: string; saat: string };
type Durum = "yukleniyor" | "acik" | "gecersiz" | "tamam" | "hata";

const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

function gunMetni(gun: string): string {
  const parts = String(gun).slice(0, 10).split("-");
  if (parts.length !== 3) return gun;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(d.getTime())) return gun;
  return `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()} ${GUNLER[d.getDay()]}`;
}

export default function RandevuCevap() {
  const { token } = useParams<{ token: string }>();
  const [durum, setDurum] = useState<Durum>("yukleniyor");
  const [secenekler, setSecenekler] = useState<Secenek[]>([]);
  const [tarafAdi, setTarafAdi] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const yukle = useCallback(async () => {
    if (!token) { setDurum("gecersiz"); return; }
    try {
      const { data, error } = await supabase.functions.invoke("randevu-teklif", {
        body: { action: "getir", token },
      });
      const d = data as any;
      if (error || !d || d.error || d.durum !== "beklemede") { setDurum("gecersiz"); return; }
      setSecenekler(Array.isArray(d.secenekler) ? d.secenekler : []);
      setTarafAdi(d.taraf_adi ?? null);
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
      const { data, error } = await supabase.functions.invoke("randevu-teklif", {
        body: { action: "cevapla", token, secim },
      });
      const d = data as any;
      if (error || !d || d.error) { setDurum("gecersiz"); return; }
      setDurum("tamam");
    } catch {
      setDurum("hata");
    } finally {
      setGonderiliyor(false);
    }
  }

  const tek = secenekler.length === 1 ? secenekler[0] : null;

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 py-10">
      <Helmet><title>Randevu</title></Helmet>
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
          <p className="text-center text-lg py-16">Teşekkürler, kaydedildi.</p>
        )}

        {durum === "acik" && (
          <>
            {tarafAdi && <p className="text-center text-sm text-muted-foreground">Sayın {tarafAdi},</p>}

            {tek ? (
              <>
                <p className="text-center text-xl font-semibold leading-snug">
                  Toplantınız {gunMetni(tek.gun)} {String(tek.saat).slice(0, 5)} için planlandı
                </p>
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={gonderiliyor}
                    onClick={() => cevapla("uygun")}
                    className="w-full rounded-lg bg-primary text-primary-foreground text-lg font-semibold py-5 disabled:opacity-60"
                  >
                    Uygun
                  </button>
                  <button
                    type="button"
                    disabled={gonderiliyor}
                    onClick={() => cevapla("uymuyor")}
                    className="w-full rounded-lg border text-lg font-semibold py-5 disabled:opacity-60"
                  >
                    Uymuyor
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-center text-xl font-semibold">Uygun saate dokunun</p>
                <div className="space-y-3">
                  {secenekler.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={gonderiliyor}
                      onClick={() => cevapla(`${String(s.gun).slice(0, 10)} ${String(s.saat).slice(0, 5)}`)}
                      className="w-full rounded-lg bg-primary text-primary-foreground text-lg font-semibold py-5 disabled:opacity-60"
                    >
                      {gunMetni(s.gun)} · {String(s.saat).slice(0, 5)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={gonderiliyor}
                  onClick={() => cevapla("uymuyor")}
                  className="w-full text-sm text-muted-foreground underline py-2 disabled:opacity-60"
                >
                  Hiçbiri uymuyor
                </button>
              </>
            )}

            {gonderiliyor && (
              <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
