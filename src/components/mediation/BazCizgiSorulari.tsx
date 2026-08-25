/* BAZ ÇİZGİ SORULARI — mimari §5.9 · HAT H-15/4 (seçim B)
 *
 * KURUCU TALİMATI: "bu madde pilot ÖNCESİ yapılacak, atlanmayacak. Baz çizgi
 * kayıt anında alınır — pilot arabulucuları baz çizgi sorulmadan kaydolursa
 * kazanım rakamı bir daha geriye dönük kurulamaz."
 *
 * NEDEN KAYIT EKRANINDA DEĞİL, İLK GİRİŞTE: kayıt e-posta onayı gerektiriyor,
 * yani `signUp` anında oturum (ve `auth.uid()`) henüz yok — baz çizgi satırı
 * RLS gereği yazılamazdı. Bu kart arabulucunun çalışmaya BAŞLADIĞI ilk ekranda,
 * beyan verilene kadar çıkar. Amaç aynı: rakam, iş üretilmeden önce alınır.
 *
 * ATLANAMAZ ama ENGELLEMEZ: kart kapatılamaz (kurucu "atlanmayacak" dedi), ama
 * arabulucunun işini de kilitlemez — hukuki bir sürecin ortasında kalan kimse
 * bir anket yüzünden bloke edilmemeli.
 *
 * GİZLİLİK (§14, constitution m.1): burada yalnız SÜRE beyanı toplanır. Dosya
 * içeriği, taraf adı, tutar bu forma girmez.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Timer } from "lucide-react";

/** §5.9'un üç sorusu. Metin kurucunun H-15/4 cevabındaki hâliyle birebir. */
const SORULAR: { anahtar: "belge_saat" | "analiz_saat" | "beyan_saat"; soru: string }[] = [
  { anahtar: "belge_saat", soru: "Anlaşma belgesi / son tutanak hazırlamak elle kaç saat sürüyordu?" },
  { anahtar: "analiz_saat", soru: "Dosya analizi + takip föyü çıkarmak elle kaç saat sürüyordu?" },
  { anahtar: "beyan_saat", soru: "Taraf beyanlarını yapılandırmak / özetlemek elle kaç saat sürüyordu?" },
];

export function BazCizgiSorulari({ userId }: { userId: string }) {
  const [gerekli, setGerekli] = useState(false);
  const [degerler, setDegerler] = useState<Record<string, string>>({});
  const [kaydediyor, setKaydediyor] = useState(false);

  useEffect(() => {
    let aktif = true;
    (async () => {
      const { data, error } = await supabase
        .from("arabulucu_baz_cizgi" as never)
        .select("user_id").eq("user_id", userId).maybeSingle();
      // Tablo yoksa / okunamazsa kart GÖSTERİLMEZ: yarım yüzey bırakmayız (§15.1).
      if (!aktif || error) return;
      setGerekli(!data);
    })();
    return () => { aktif = false; };
  }, [userId]);

  if (!gerekli) return null;

  async function kaydet() {
    const satir: Record<string, unknown> = { user_id: userId };
    let enAzBir = false;
    for (const s of SORULAR) {
      const ham = (degerler[s.anahtar] ?? "").replace(",", ".").trim();
      if (!ham) { satir[s.anahtar] = null; continue; }
      const n = Number(ham);
      if (!Number.isFinite(n) || n < 0) {
        toast({ variant: "destructive", title: "Geçersiz süre", description: "Saat olarak bir sayı girin (ör. 2 ya da 1.5)." });
        return;
      }
      satir[s.anahtar] = n;
      enAzBir = true;
    }
    if (!enAzBir) {
      toast({ variant: "destructive", title: "En az bir soru", description: "Kazanım hesabı için en az bir süre gerekiyor." });
      return;
    }
    setKaydediyor(true);
    const { error } = await supabase.from("arabulucu_baz_cizgi" as never).insert(satir as never);
    setKaydediyor(false);
    if (error) {
      toast({ variant: "destructive", title: "Kaydedilemedi", description: error.message });
      return;
    }
    setGerekli(false);
    toast({ title: "Teşekkürler", description: "Kazanım sayacınız bu beyanla hesaplanacak." });
  }

  return (
    <Card className="p-5 space-y-4 border-primary/40">
      <div className="flex items-center gap-2">
        <Timer className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Kazanım sayacı için tek seferlik üç soru</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Sistemin size ne kadar zaman kazandırdığını gösterebilmek için başlangıç
        noktanızı bilmemiz gerekiyor. <strong>Katsayıyı biz koymuyoruz</strong> —
        hesap sizin verdiğiniz süreyle yapılır ve ekranda hesabın kendisi görünür
        ("kendi verdiğiniz 2 saat × 6 belge = 12 saat"). Bilmediğiniz soruyu boş
        bırakabilirsiniz; o kalem saate çevrilmez.
      </p>
      <div className="space-y-3">
        {SORULAR.map((s) => (
          <div key={s.anahtar} className="space-y-1">
            <Label htmlFor={s.anahtar} className="text-sm">{s.soru}</Label>
            <Input
              id={s.anahtar}
              inputMode="decimal"
              placeholder="saat (ör. 2)"
              value={degerler[s.anahtar] ?? ""}
              onChange={(e) => setDegerler((o) => ({ ...o, [s.anahtar]: e.target.value }))}
              disabled={kaydediyor}
              className="max-w-[160px]"
            />
          </div>
        ))}
      </div>
      <Button onClick={kaydet} disabled={kaydediyor}>
        {kaydediyor ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
        Kaydet
      </Button>
    </Card>
  );
}
