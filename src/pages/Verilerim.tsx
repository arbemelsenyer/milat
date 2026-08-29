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

/* SAKLAMA SÜRELERİ ARTIK PARAMETRE TABLOSUNDAN OKUNUR (25.08.2026).
   Önceden bu ekranda dört sabit metin vardı ve **14 kategorinin 10'unda**
   tarafa "Belirsiz — saklama süresi henüz parametre olarak tanımlanmadı"
   yazıyordu. Kurucu kararıyla (HAT H-15/1) `public.saklama_sureleri` tablosu
   kuruldu ve değerler girildi: tek çatı **5 yıl** (dosya kapanışından itibaren),
   mali kayıt **10 yıl**, ham ses anında silinir.
   Bu ekran o tabloyu okur — süre değişince kod değişmez, ekran kendiliğinden
   güncellenir. Sabit metin BIRAKILMADI: "Belirsiz" yalnızca tablo gerçekten
   okunamadığında görünür ve o zaman da sebebi açıkça yazılır (§15.1: veri
   yoksa uydurma yok). */
type SaklamaSuresi = {
  veri_turu: string;
  saklama_gun: number | null;
  baslangic: string;
  /* 29.08.2026: NULL süre İKİ AYRI şey demekti ve bu sayfa ikisini de
     "işlenir işlenmez silinir" diye okuyordu. Biri gerçekten öyle; öteki
     KURUCU KARARIYLA KALICI (onay kayıtları · anonim kapanış istatistiği).
     Yani sayfa, tarafa kendi verisi hakkında GERÇEĞİN TERSİNİ söyleyebilirdi.
     Cowork tabloya `kalici` kolonunu bu ayrımı yapabilmek için ekledi. */
  kalici: boolean | null;
};

/** Gün sayısını insan diline çevirir. Tablo tek doğruluk kaynağıdır. */
function sureMetni(kayit: SaklamaSuresi | undefined, okunabildiMi: boolean): string {
  if (!okunabildiMi) {
    return "Şu an gösterilemiyor — saklama süresi tablosu okunamadı. Arabulucunuza sorabilirsiniz.";
  }
  if (!kayit) {
    return "Bu kayıt tipi için saklama süresi henüz tanımlanmadı.";
  }
  if (kayit.kalici === true) {
    /* KALICI kayıt tarafa AÇIKÇA söylenir — bu sayfanın varlık sebebi budur.
       Neden saklandığı da söylenir ki söz denetlenebilir olsun: kayıt içerik
       taşımaz (kurucu kararı, HAT H-15 · 2. madde). */
    return "Kalıcı olarak saklanır, silinmez. Yalnız onay/ret kaydı tutulur: "
      + "kim, ne zaman, hangi metnin hangi sürümü. Beyanınız, belgeniz ya da "
      + "tutar bu kayda girmez.";
  }
  if (kayit.saklama_gun == null) {
    return "İşlenir işlenmez silinir; saklanmaz.";
  }
  const yil = kayit.saklama_gun / 365;
  const sure = Number.isInteger(yil) ? `${yil} yıl` : `${kayit.saklama_gun} gün`;
  return kayit.baslangic === "dosya_kapanisi"
    ? `Dosya kapanışından sonra ${sure}`
    : `Kaydın oluşturulmasından sonra ${sure}`;
}

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
        /* SAKLAMA SÜRELERİ — tek doğruluk kaynağı `public.saklama_sureleri`.
           Okunamazsa uydurulmaz: ekranda "gösterilemiyor" denir ve sebebi
           yazılır (§15.1). Süre değişince bu ekran kendiliğinden güncellenir. */
        const sureler = new Map<string, SaklamaSuresi>();
        let sureTablosuOkundu = true;
        {
          const { data: sureSatirlari, error: sErr } = await supabase
            .from("saklama_sureleri" as never)
            .select("veri_turu, saklama_gun, baslangic, kalici");
          if (sErr) {
            sureTablosuOkundu = false;
            console.error("[Verilerim] saklama süreleri okunamadı:", sErr.message);
          } else {
            for (const r of ((sureSatirlari ?? []) as unknown as SaklamaSuresi[])) {
              sureler.set(r.veri_turu, r);
            }
          }
        }

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
            sure: sureMetni(sureler.get("dosya_kapanis_sonrasi"), sureTablosuOkundu),
          },
          {
            ad: "Uyuşmazlığa ilişkin beyanım",
            sayi: beyanSayisi,
            gorebilen: "Siz, arabulucunuz ve yönetici. Karşı taraf göremez.",
            sure: sureMetni(sureler.get("dosya_kapanis_sonrasi"), sureTablosuOkundu),
          },
          {
            ad: "Yüklediğim belgeler",
            sayi: belge,
            gorebilen: "Yalnız siz (kendi yüklediğiniz) ve arabulucunuz. Karşı taraf göremez.",
            sure: sureMetni(sureler.get("case_documents"), sureTablosuOkundu),
          },
          {
            ad: "İhtiyaç tespiti sorularım ve cevaplarım",
            sayi: kesif,
            gorebilen: "Siz ve arabulucunuz. Karşı taraf göremez.",
            sure: sureMetni(sureler.get("dosya_kapanis_sonrasi"), sureTablosuOkundu),
          },
          {
            ad: "Dosya içinde yazdığım mesajlar",
            sayi: mesaj,
            gorebilen: "Dosyadaki katılımcılar: arabulucu ve dosyadaki taraflar.",
            sure: sureMetni(sureler.get("case_notes"), sureTablosuOkundu),
            not: "Bu kategori istisnadır: mesajlaşma yüzeyi dosya katılımcılarına açıktır.",
          },
          {
            ad: "Kabul aralığım (koşullu aralık / braket)",
            sayi: braket,
            gorebilen: "Siz ve arabulucunuz. Karşı taraf rakamlarınızı göremez.",
            sure: sureMetni(sureler.get("dosya_kapanis_sonrasi"), sureTablosuOkundu),
          },
          {
            ad: "Kör teklifim",
            sayi: korTeklif,
            gorebilen: "Siz ve arabulucunuz. Karşı taraf göremez.",
            sure: sureMetni(sureler.get("dosya_kapanis_sonrasi"), sureTablosuOkundu),
          },
          {
            ad: "Ödeme kayıtlarım",
            sayi: odeme,
            gorebilen: "Siz, arabulucunuz ve yönetici.",
            sure: sureMetni(sureler.get("odeme_kayitlari"), sureTablosuOkundu),
          },
          {
            ad: "Bana ait ajan görev kayıtları",
            sayi: ajanGorev,
            gorebilen: "Siz (yalnız size yönelik satırlar), arabulucunuz ve yönetici.",
            sure: sureMetni(sureler.get("dosya_kapanis_sonrasi"), sureTablosuOkundu),
          },
          {
            ad: "Yapay zekâ kullanım bilgilendirmesi onayım",
            sayi: yzOnay,
            /* 29.08: "Belirsiz" yazıyordu. Politika okunabilir durumdaydı:
               `party_own_consent` (kaydın sahibi taraf) + `mediator_reads_consent`
               (dosyanın arabulucusu / açan hesap / yönetici). Karşı taraf
               ikisine de girmiyor. Tarafa "bilmiyorum" demek için sebep yoktu. */
            gorebilen: "Siz, arabulucunuz ve yönetici. Karşı taraf göremez.",
            /* 29.08: burada `dosya_kapanis_sonrasi` yazıyordu, yani tarafa
               "kapanıştan 7 gün sonra silinir" deniyordu. Onay kayıtları
               KURUCU KARARIYLA KALICIDIR (HAT H-15 · 2. madde) — söz yanlıştı. */
            sure: sureMetni(sureler.get("onay_kayitlari"), sureTablosuOkundu),
          },
          {
            ad: "Oturum kaydı onayım / reddim",
            sayi: kayitOnay,
            gorebilen: "Siz (yalnız kendi kararınız) ve arabulucunuz.",
            // Onay kaydı: kalıcı (yukarıdaki gerekçenin aynısı).
            sure: sureMetni(sureler.get("onay_kayitlari"), sureTablosuOkundu),
          },
          {
            ad: "Randevu tekliflerim ve cevaplarım",
            /* 29.08 KUSURU ve ÇÖZÜMÜ. Burada `sayi: randevu` yazıyordu ve
               tarafa **0** gösteriyordu: `randevu_teklifleri` üzerinde tek
               politika vardı (`mediator_reads_offers`) ve tarafı kapsamıyordu,
               yani tarafın sorgusu RLS'te süzülüyor, hata DÖNMÜYOR, sıfır
               dönüyordu. Canlıda 11 satır vardı ve hepsi tarafa aitti.
               Önce sayıyı gizleyip "okunamıyor" dedim (yalanı bitirmek için),
               sonra erişimi açmak RLS kararı olduğu için HAT H-26'da sordum.
               Kurucu (a)'yı seçti — gerekçesi anayasanın kendi kuralı (m.1):
               "taraf yalnız kendi satırlarını görür, süzgeç SORGUDA". Cowork
               `Taraf kendi randevu tekliflerini görür` politikasını canlıda
               kurdu (`party_id` üzerinden yalnız kendi satırı; karşı tarafın
               teklifi kapalı). Artık sayı gerçek. */
            sayi: randevu,
            gorebilen: "Siz (yalnız kendi teklifleriniz), arabulucunuz ve yönetici. "
              + "Karşı tarafa yapılan teklifleri göremezsiniz.",
            sure: sureMetni(sureler.get("dosya_kapanis_sonrasi"), sureTablosuOkundu),
          },
          {
            ad: "Bildirdiğim müsait gün ve saatler",
            sayi: musaitlik,
            /* 29.08: "Belirsiz" yazıyordu. Politika tek ve açık:
               `party_manages_own_availability` — yalnız kaydın sahibi taraf.
               Arabulucunun doğrudan okuma politikası YOK; müsaitliği randevu
               önerisi üretilirken `ajan-nobetci` servis anahtarıyla okuyor.
               Tarafa bu ikisi birlikte söylenir, yoksa "yalnız siz" cümlesi
               eksik kalır. */
            gorebilen: "Yalnız siz. Arabulucunuz bunu doğrudan görmez; "
              + "randevu önerisi üretilirken sistem üzerinden kullanılır.",
            sure: sureMetni(sureler.get("dosya_kapanis_sonrasi"), sureTablosuOkundu),
          },
          {
            ad: "Hakkımda üretilen, yalnız arabulucuya açık analizler",
            sayi: null,
            gorebilen: "Yalnız arabulucunuz ve yönetici. Siz de karşı taraf da göremezsiniz.",
            sure: sureMetni(sureler.get("case_notes"), sureTablosuOkundu),
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
