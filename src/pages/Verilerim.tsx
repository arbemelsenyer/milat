/* VERİLERİM — tarafın kendi verisinin KATEGORİ dökümü (KVKK / İBA şeffaflık).
   Bu sayfa YALNIZ GÖSTERİR: hiçbir veriyi silmez, değiştirmez, dışa aktarmaz.
   Satır dökümü yoktur; her kategori için sayı, kimin görebildiği ve saklama süresi
   yazılır. Sayılar RLS'in izin verdiği kadarıyla okunur — karşı tarafın hiçbir
   kaydı, adı ya da sayısı bu ekrana gelmez.
   "Kimin görebildiği" sütunu depodaki GERÇEK politikalardan yazılmıştır; politikası
   depoda görünmeyen kategorilerde "belirsiz" denir, tahmin yürütülmez. */

import { useEffect, useState } from "react";
import { AppNavbar } from "@/components/AppNavbar";
import { Card } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Kategori = {
  ad: string;
  sayi: number | null;      // null → bu sayfadan okunamıyor
  gorebilen: string;
  sure: string;
  not?: string;
};

// Saklama süreleri mimari §12.5.9'dan ve 16.08 kayıt protokolü kararından alınmıştır.
const SURE_BELGE = "Dosya kapanışından sonra 5 yıl (arabulucu gerekçeyle 10 yıla uzatabilir)";
const SURE_MALI = "10 yıl (mali kayıt)";
const SURE_ANALIZ = "Dosya belgeleriyle aynı süre (5 yıl)";
const SURE_TANIMSIZ = "Belirsiz — bu kayıt tipi için saklama süresi henüz parametre olarak tanımlanmadı";

export default function Verilerim() {
  const { user, isLoading } = useAuth();
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kategoriler, setKategoriler] = useState<Kategori[]>([]);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !user) return;
    let aktif = true;
    (async () => {
      setYukleniyor(true);
      setHata(null);
      try {
        // Kendi taraf kayıtlarım (RLS: yalnız user_id = auth.uid() satırları döner).
        const { data: taraflarim, error: pErr } = await supabase.from("case_parties")
          .select("id, statement").eq("user_id", user.id);
        if (pErr) throw pErr;
        const partyIds = (taraflarim ?? []).map((p: any) => p.id);
        const beyanSayisi = (taraflarim ?? []).filter((p: any) => String(p.statement ?? "").trim()).length;

        const say = async (fn: () => Promise<{ count: number | null; error: any }>) => {
          try {
            const { count, error } = await fn();
            return error ? null : (count ?? 0);
          } catch {
            return null;
          }
        };

        const belge = await say(() => supabase.from("case_documents")
          .select("id", { count: "exact", head: true }).eq("uploaded_by", user.id) as any);
        const kesif = await say(() => supabase.from("case_discovery_questions")
          .select("id", { count: "exact", head: true }).eq("user_id", user.id) as any);
        const mesaj = await say(() => supabase.from("messages")
          .select("id", { count: "exact", head: true }).eq("sender_id", user.id) as any);
        const braket = partyIds.length ? await say(() => (supabase.from("teklif_braketleri" as any) as any)
          .select("id", { count: "exact", head: true }).in("party_id", partyIds)) : 0;
        const korTeklif = partyIds.length ? await say(() => supabase.from("blind_bids")
          .select("id", { count: "exact", head: true }).in("party_id", partyIds) as any) : 0;
        const odeme = partyIds.length ? await say(() => supabase.from("case_payments")
          .select("id", { count: "exact", head: true }).in("payer_party_id", partyIds) as any) : 0;
        const ajanGorev = partyIds.length ? await say(() => (supabase.from("ajan_gorevleri" as any) as any)
          .select("id", { count: "exact", head: true }).in("hedef_party_id", partyIds)) : 0;
        const yzOnay = partyIds.length ? await say(() => (supabase.from("yz_beyan_onaylari" as any) as any)
          .select("id", { count: "exact", head: true }).in("party_id", partyIds)) : 0;
        const kayitOnay = partyIds.length ? await say(() => (supabase.from("kayit_onaylari" as any) as any)
          .select("id", { count: "exact", head: true }).in("party_id", partyIds)) : 0;
        const randevu = partyIds.length ? await say(() => (supabase.from("randevu_teklifleri" as any) as any)
          .select("id", { count: "exact", head: true }).in("party_id", partyIds)) : 0;
        const musaitlik = partyIds.length ? await say(() => (supabase.from("taraf_musaitlik" as any) as any)
          .select("id", { count: "exact", head: true }).in("party_id", partyIds)) : 0;

        if (!aktif) return;
        setKategoriler([
          {
            ad: "Taraf kaydım (ad, iletişim, kimlik/vergi no, adres, varsa vekil bilgisi)",
            sayi: (taraflarim ?? []).length,
            gorebilen: "Siz, arabulucunuz ve yönetici. Karşı taraf göremez.",
            sure: SURE_TANIMSIZ,
          },
          {
            ad: "Uyuşmazlığa ilişkin beyanım",
            sayi: beyanSayisi,
            gorebilen: "Siz, arabulucunuz ve yönetici. Karşı taraf göremez.",
            sure: SURE_TANIMSIZ,
          },
          {
            ad: "Yüklediğim belgeler",
            sayi: belge,
            gorebilen: "Yalnız siz (kendi yüklediğiniz) ve arabulucunuz. Karşı taraf göremez.",
            sure: SURE_BELGE,
          },
          {
            ad: "İhtiyaç tespiti sorularım ve cevaplarım",
            sayi: kesif,
            gorebilen: "Siz ve arabulucunuz. Karşı taraf göremez.",
            sure: SURE_TANIMSIZ,
          },
          {
            ad: "Dosya içinde yazdığım mesajlar",
            sayi: mesaj,
            gorebilen: "Dosyadaki katılımcılar: arabulucu ve dosyadaki taraflar.",
            sure: SURE_TANIMSIZ,
            not: "Bu kategori istisnadır: mesajlaşma yüzeyi dosya katılımcılarına açıktır.",
          },
          {
            ad: "Kabul aralığım (koşullu aralık / braket)",
            sayi: braket,
            gorebilen: "Siz ve arabulucunuz. Karşı taraf rakamlarınızı göremez.",
            sure: SURE_TANIMSIZ,
          },
          {
            ad: "Kör teklifim",
            sayi: korTeklif,
            gorebilen: "Siz ve arabulucunuz. Karşı taraf göremez.",
            sure: SURE_TANIMSIZ,
          },
          {
            ad: "Ödeme kayıtlarım",
            sayi: odeme,
            gorebilen: "Siz, arabulucunuz ve yönetici.",
            sure: SURE_MALI,
          },
          {
            ad: "Bana ait ajan görev kayıtları",
            sayi: ajanGorev,
            gorebilen: "Siz (yalnız size yönelik satırlar), arabulucunuz ve yönetici.",
            sure: SURE_TANIMSIZ,
          },
          {
            ad: "Yapay zekâ kullanım bilgilendirmesi onayım",
            sayi: yzOnay,
            gorebilen: "Belirsiz — bu kaydın erişim politikası bu sayfadan doğrulanamadı.",
            sure: SURE_TANIMSIZ,
          },
          {
            ad: "Oturum kaydı onayım / reddim",
            sayi: kayitOnay,
            gorebilen: "Siz (yalnız kendi kararınız) ve arabulucunuz.",
            sure: SURE_TANIMSIZ,
          },
          {
            ad: "Randevu tekliflerim ve cevaplarım",
            sayi: randevu,
            gorebilen: "Belirsiz — bu kaydın erişim politikası bu sayfadan doğrulanamadı.",
            sure: SURE_TANIMSIZ,
          },
          {
            ad: "Bildirdiğim müsait gün ve saatler",
            sayi: musaitlik,
            gorebilen: "Belirsiz — bu kaydın erişim politikası bu sayfadan doğrulanamadı.",
            sure: SURE_TANIMSIZ,
          },
          {
            ad: "Hakkımda üretilen, yalnız arabulucuya açık analizler",
            sayi: null,
            gorebilen: "Yalnız arabulucunuz ve yönetici. Siz de karşı taraf da göremezsiniz.",
            sure: SURE_ANALIZ,
            not: "Bu kayıtların sayısı bu sayfadan okunamaz; erişim politikası izin vermez.",
          },
        ]);
      } catch (e: any) {
        if (aktif) setHata(e?.message ?? "Bilgiler okunamadı.");
      } finally {
        if (aktif) setYukleniyor(false);
      }
    })();
    return () => { aktif = false; };
  }, [user, isLoading]);

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="container max-w-3xl py-8 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-display font-semibold mb-3 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Verilerim
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Bu sayfada, arabuluculuk sürecinde sizinle ilgili tutulan bilgilerin dökümünü görürsünüz.
            Bilgileriniz yalnız bu süreç için kullanılır; model eğitimine, ortak bir havuza veya süreç
            dışına aktarılmaz. Karşı taraf, size ait bilgileri göremez.
          </p>
        </div>

        {hata && (
          <div className="text-sm rounded border border-destructive/40 bg-destructive/10 text-destructive p-3">
            {hata}
          </div>
        )}

        {yukleniyor ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Kayıtlarınız sayılıyor…
          </div>
        ) : (
          <div className="space-y-3">
            {kategoriler.map((k) => (
              <Card key={k.ad} className="p-4 space-y-1">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="font-medium text-sm">{k.ad}</div>
                  <div className="text-sm shrink-0">
                    <span className="text-muted-foreground">Kayıt sayısı: </span>
                    <span className="font-semibold">{k.sayi === null ? "—" : k.sayi}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground leading-snug">
                  Kimler görebilir: {k.gorebilen}
                </div>
                <div className="text-xs text-muted-foreground leading-snug">
                  Saklama süresi: {k.sure}
                </div>
                {k.not && <div className="text-[11px] text-muted-foreground leading-snug">{k.not}</div>}
              </Card>
            ))}
          </div>
        )}

        <p className="text-sm leading-relaxed">
          Bilgilerinizin düzeltilmesini veya silinmesini talep etmek için arabulucunuza başvurabilirsiniz.
          Ses kaydı alınmışsa oturumdan 24 saat sonra, kayıt dökümü ise süreç sonunda kalıcı olarak silinir.
        </p>
      </main>
    </div>
  );
}
