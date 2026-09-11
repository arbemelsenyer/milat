/* YENİ BAŞVURU EKRANI — HER ADIMIN ORTAK KALIBI
 * Kaynak: tasks/PILOT-ASAMA-1-DOSYA-KURULUMU.md §2 ve §2-A (kurucu kararı, 10.09.2026)
 *
 * Kurucu: "Bir şey bir yerde neredeyse, başka kısımlarda da aynı yerde dursun.
 * Kullanıcı aramasın."
 *
 * Her adım, yukarıdan aşağı, HER ZAMAN aynı dizilişte:
 *
 *   [Adım başlığı]
 *   [Elle giriş alanı]                    [AI önersin] / [AI araştırsın]  ← hep sağda
 *   [AI cevabı: küçük italik, alanın hemen altında, kaynak bağlantılarıyla]
 *
 * ÜÇ BAĞLAYICI KURAL (§2):
 *   1. AI düğmesi her adımda AYNI YERDE — alanın sağında. Düğmesi olmayan
 *      adımda (1.4 Başvuru türü) düğme YOKTUR ama BOŞLUK KORUNUR; alanların
 *      genişliği adımdan adıma oynamaz.
 *   2. AI cevabı her adımda AYNI BİÇİMDE — alanın hemen altında, küçük italik,
 *      sonunda kaynak.
 *   3. Uyarı ve sonuç bildirimi TEK USUL. Bir adımda balon, ötekinde ışık,
 *      üçüncüsünde ayrı pencere OLMAZ (§3: yanıp sönen ışık KONMAZ; chatbot
 *      uyarı kanalı DEĞİLDİR).
 *
 * Bu dosya o kalıbın TEK kopyasıdır. Yeni bir adım eklenecekse buradan geçer;
 * adım kendi başına düğme yerleştirmez, kendi cevabını kendi biçiminde yazmaz.
 */
import React from "react";
import { Loader2, Sparkles, Search, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ── §2-A KAYNAK DOĞRULAMA KURALI ────────────────────────────────────────────
   AI'nın her hukuki cevabında kaynak sırası, ÖNCE ÜRÜNÜN İÇİ, SONRA DIŞI:
     1. Ürün veritabanındaki yerleşik uzmanlık modülleri (uzmanlık kitapları)
     2. Üründe sabit mevzuat (yüklü kanun · yönetmelik · diğer yasal mevzuat)
     3. Yargıtay içtihatları — açık kaynak (yalnız gerek duyarsa)
     4. Hiçbirinde yoksa: "Kaynaklarda bulamadım."
   Kurucu notu: ilk aşama için (ana/alt uzmanlık, arabuluculuğa uygunluk ve
   temel kısımlar) 1 ve 2 yeterlidir; 3'e gerek kalmaz.

   UYDURMA YASAK: kaynak gösterilemeyen hukuki cümle ekrana ÇIKMAZ; onun yerine
   "bulamadım" çıkar. Bu kural 1.3 · 1.5 · 1.6 · 1.8 cevaplarının hepsine aynı
   biçimde uygulanır. */
export type KaynakTuru = "modul" | "mevzuat" | "ictihat" | "internet";

/** Kaynak sırası — küçük numara önce gelir. Sıralama tek yerden okunur. */
export const KAYNAK_SIRASI: Record<KaynakTuru, number> = {
  modul: 1,
  mevzuat: 2,
  ictihat: 3,
  internet: 4,
};

export const KAYNAK_ETIKETI: Record<KaynakTuru, string> = {
  modul: "uzmanlık modülü",
  mevzuat: "mevzuat",
  ictihat: "içtihat",
  internet: "açık kaynak",
};

export type AiKaynak = {
  tur: KaynakTuru;
  /** Kaynağın adı: "İnşaat Hukuku uzmanlık modülü" · "6502 sayılı Kanun". */
  ad: string;
  /** Madde/bölüm: "m. 73" · "§4.2". Yoksa boş. */
  yer?: string | null;
  /** Tıklanabilir adres. Yoksa kaynak adı düz metin olarak yazılır. */
  baglanti?: string | null;
};

/** Kaynakları §2-A sırasına dizer; sıra içinde giriş sırası korunur. */
export function kaynaklariSirala(kaynaklar: AiKaynak[]): AiKaynak[] {
  return [...kaynaklar]
    .map((k, i) => ({ k, i }))
    .sort((a, b) => (KAYNAK_SIRASI[a.k.tur] - KAYNAK_SIRASI[b.k.tur]) || (a.i - b.i))
    .map((x) => x.k);
}

/** Kaynağın ekranda görünen künyesi: ad + madde/bölüm. */
export function kaynakKunyesi(k: AiKaynak): string {
  const yer = String(k.yer ?? "").trim();
  return yer ? `${k.ad}, ${yer}` : k.ad;
}

/** §2-A 4. madde: hiçbir kaynakta yoksa çıkacak TEK cümle. */
export const KAYNAK_YOK_METNI = "Kaynaklarda bulamadım.";

/* ── AI CEVABI ───────────────────────────────────────────────────────────────
   Alanın hemen altında, küçük italik, sonunda kaynak. Dört durum vardır ve
   dördü de AYNI yerde, AYNI biçimde görünür — ayrı pencere, balon ya da yanıp
   sönen ışık YOKTUR (§3). */
export type AiCevapDurumu = "yok" | "calisiyor" | "cevap" | "bulunamadi" | "hata";

export function AiCevap({
  durum, metin, kaynaklar, hataMetni, altBilgi,
}: {
  durum: AiCevapDurumu;
  /** Cevabın kendisi. `cevap` durumunda zorunludur. */
  metin?: string | null;
  kaynaklar?: AiKaynak[];
  /** `hata` durumunda gösterilen gerçek sebep — sessizce yutulmaz. */
  hataMetni?: string | null;
  /** Cevabın altına eklenen kısa ek satır (ör. "Uygun değil" uyarı cümlesi). */
  altBilgi?: React.ReactNode;
}) {
  if (durum === "yok") return null;

  if (durum === "calisiyor") {
    return (
      <p className="mt-2 text-xs italic text-muted-foreground flex items-center gap-1.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> AI bakıyor…
      </p>
    );
  }

  if (durum === "hata") {
    /* Hata SESSİZ DÜŞMEZ: kırmızı, kalıcı, gerçek sebebiyle. Ama yeri yine
       alanın altıdır — ayrı bir pencereye taşınmaz. */
    return (
      <p className="mt-2 text-xs text-destructive flex items-start gap-1.5 break-words">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>{hataMetni || "AI cevabı alınamadı."}</span>
      </p>
    );
  }

  if (durum === "bulunamadi") {
    return (
      <p className="mt-2 text-xs italic text-muted-foreground">
        {metin || KAYNAK_YOK_METNI}
      </p>
    );
  }

  const sirali = kaynaklariSirala(kaynaklar ?? []);
  return (
    <div className="mt-2 space-y-1">
      <p className="text-xs italic text-muted-foreground leading-snug whitespace-pre-wrap">
        {metin}
      </p>
      {sirali.length > 0 ? (
        <p className="text-xs italic text-muted-foreground leading-snug">
          Kaynak:{" "}
          {sirali.map((k, i) => (
            <React.Fragment key={`${k.ad}-${i}`}>
              {i > 0 && " · "}
              {k.baglanti ? (
                <a
                  href={k.baglanti}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-foreground inline-flex items-center gap-0.5"
                >
                  {kaynakKunyesi(k)}
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                </a>
              ) : (
                <span>{kaynakKunyesi(k)}</span>
              )}
            </React.Fragment>
          ))}
        </p>
      ) : (
        /* Kaynaksız hukuki cümle ekrana çıkmaz. Cevap geldi ama kaynak yoksa
           bunu SÖYLERİZ — sessizce kaynaksız cümle bırakmayız (§2-A). */
        <p className="text-xs italic text-amber-600 dark:text-amber-400 leading-snug">
          Bu cevabın kaynağı gösterilemedi; karar vermeden önce doğrulayın.
        </p>
      )}
      {altBilgi && <div className="text-xs italic text-muted-foreground leading-snug">{altBilgi}</div>}
    </div>
  );
}

/* ── EKRAN KİLİDİ YOK — EKSİK BİLDİRİMİ (kabul ölçütü 16) ────────────────────
   Kurucu kararı, 11.09.2026:

     "Bir adım bitmeden öteki kilitlenmesin; arabulucu sırayı kendi seçsin,
      atlasın, geri dönsün. Numaralar önerilen sıradır, zorunluluk değil.
      Sistem yalnız uyarsın, düğme kapatmasın. Gerçekten üretecek verisi
      olmayan bir adım hata vermesin, NEYİN EKSİK olduğunu söylesin."

   Gerekçesi (kurucunun kendi cümlesi): "hangi aşamada ne aksak göremiyorum,
   uydurma veri girmek zorunda kalıyorum." Kilitli bir adım, eksiği GİZLER;
   arabulucu eksiği görmek için sahte veri girmek zorunda kalır.

   BAĞLAYICI ÜÇ KURAL:
     1. Hiçbir adım BAŞKA bir adım yüzünden kapanmaz. Önceki adım boş diye
        düğme `disabled` yapılmaz; iş yapılabiliyorsa yapılır.
     2. Kapalı kalan tek durum, adımın KENDİ verisinin gerçekten var olmaması
        (ör. gönderilecek metin hiç yok). O zaman bile ekran hata vermez:
        eksik olan şey ADIYLA yazılır.
     3. Eksik, ekranda GÖRÜNÜR yazılır — yalnız `title` ipucuna bırakılmaz.
        İpucu telefonda hiç görünmez; kurucu eksiği göremez.

   Bu bileşen o bildirimin TEK kopyasıdır: her adımda aynı yer, aynı biçim
   (§2 kuralı: bir adımda balon, ötekinde ışık OLMAZ). */
export function EksikSatiri({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="mt-1 text-xs italic text-muted-foreground leading-snug">
      {children}
    </p>
  );
}

/* ── AI DÜĞMESİ ──────────────────────────────────────────────────────────────
   İki tür vardır ve ikisi de aynı boyut, aynı yer, aynı ikon düzenindedir:
     · "önersin"   → dosyanın kendi verisinden öneri (1.3 · 1.5 · 1.6)
     · "araştırsın" → dışarıdan bilgi arama (1.8 taraf iletişim bilgisi)
   Etiketi adım belirlemez; tür belirler. Böylece iki adımda iki farklı isim
   çıkmaz. */
export function AiDugmesi({
  tur, onClick, busy, disabled, baslik,
}: {
  tur: "onersin" | "arastirsin";
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  /** Düğme kapalıysa sebebini söyleyen ipucu — sessiz kapalı düğme olmaz. */
  baslik?: string;
}) {
  const Ikon = tur === "onersin" ? Sparkles : Search;
  const etiket = tur === "onersin" ? "AI önersin" : "AI araştırsın";
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-8 text-xs w-full sm:w-auto"
      onClick={onClick}
      disabled={busy || disabled}
      title={baslik}
    >
      {busy
        ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Bakıyor…</>
        : <><Ikon className="h-4 w-4 mr-1" /> {etiket}</>}
    </Button>
  );
}

/* ── ADIM ────────────────────────────────────────────────────────────────────
   Ekran yukarıdan aşağı SIRALI ve NUMARALI akar; kullanıcı hangi adımda
   olduğunu görür (§2). */
export function Adim({
  no, baslik, aciklama, aiDugme, aiCevap, id, children, ustBilgi,
}: {
  /** "1.2" gibi. Numara ekranda görünür; sıra buradan okunur. */
  no: string;
  baslik: string;
  /** Alanın altındaki küçük italik yönlendirme. Kurucunun metni AYNEN geçer. */
  aciklama?: React.ReactNode;
  /** Sağdaki AI düğmesi. Yoksa BOŞLUK KORUNUR — hizalama adımdan adıma oynamaz. */
  aiDugme?: React.ReactNode;
  aiCevap?: React.ReactNode;
  id?: string;
  /** Başlığın hemen altına, alandan önce gelen kısa bilgi (ör. adım koşulu). */
  ustBilgi?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold tabular-nums text-primary shrink-0">{no}</span>
        <h3 className="text-sm font-semibold">{baslik}</h3>
      </div>

      {ustBilgi && <div className="text-xs text-muted-foreground leading-snug">{ustBilgi}</div>}

      {/* Alan solda, AI düğmesi sağda — HER ADIMDA. Düğmesi olmayan adımda da
          sağdaki sütun durur (boş), böylece alan genişliği değişmez. */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0 space-y-2">{children}</div>
        <div className="sm:w-40 shrink-0 flex sm:justify-end" aria-hidden={!aiDugme}>
          {aiDugme}
        </div>
      </div>

      {aciklama && (
        <p className="text-xs italic text-muted-foreground leading-snug whitespace-pre-line">
          {aciklama}
        </p>
      )}

      {aiCevap}
    </section>
  );
}
