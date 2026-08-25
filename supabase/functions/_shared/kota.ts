/* KOTA KAPISI — mimari §15.2 · HAT H-15/3
 *
 * KARARI VERİYE TAŞIMA: "hangi paket, hangi kota, dolunca ne olur" kararı
 * beklenmedi; kod öyle yazıldı ki **"pilotta kota yok" da bir veri durumudur**:
 *   · `limit_deger` NULL      → SINIRSIZ (pilot varsayılanı)
 *   · kota satırı yok         → SINIRSIZ
 *   · tablo hiç kurulmamış    → SINIRSIZ
 * Yani kurucu hiçbir şey girmezse sistem bugünkü gibi çalışır; kota
 * istendiğinde KOD DEĞİŞMEDEN değer girilir.
 *
 * FAIL-OPEN, BİLEREK: kota bir ticari sınırdır, güvenlik sınırı değil. Kota
 * okunamadığında arabulucunun işini durdurmak, sınırı aşmasına izin vermekten
 * daha zararlıdır — sınır ticari, iş ise hukuki bir sürecin parçası.
 * (Güvenlik kapıları böyle çalışmaz; onlar fail-closed'dır.)
 */

export type KotaSonucu = {
  /** İşleme izin var mı. Kota yoksa/okunamazsa daima true. */
  izin: boolean;
  /** Sınır uygulanıyor mu (yalnız bilgi amaçlı). */
  sinirli: boolean;
  limit?: number | null;
  kullanim?: number;
  /** Kullanıcıya gösterilecek tek cümle; yalnız sınır varsa dolu. */
  mesaj?: string;
};

const SINIRSIZ: KotaSonucu = { izin: true, sinirli: false };

/**
 * Bir kota türü için izin kontrolü.
 * @param sayKullanim kullanımın kaç olduğunu döndüren geri çağrım — kota
 *   uygulanmıyorsa HİÇ ÇAĞRILMAZ (boşuna sorgu yapılmaz).
 */
/** Yalnız bu dosyanın kullandığı kadarıyla supabase istemcisi. `any` yerine
 *  dar bir arayüz: sorgu zinciri `maybeSingle()` ile `{data, error}` döner. */
type Sorgu = {
  select: (s: string) => Sorgu;
  eq: (k: string, v: unknown) => Sorgu;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
};

export async function kotaKapisi(
  admin: { from: (t: string) => Sorgu },
  userId: string,
  kotaTuru: string,
  sayKullanim: () => Promise<number>,
): Promise<KotaSonucu> {
  try {
    const { data: atama, error: aErr } = await admin.from("arabulucu_paketleri")
      .select("paket_kod").eq("user_id", userId).maybeSingle();
    if (aErr) return SINIRSIZ;                       // tablo yok / okunamadı → sınırsız
    const paket = (atama as { paket_kod?: string } | null)?.paket_kod ?? "pilot";

    const { data: kota, error: kErr } = await admin.from("paket_kotalari")
      .select("limit_deger, periyot, dolunca")
      .eq("paket_kod", paket).eq("kota_turu", kotaTuru).maybeSingle();
    if (kErr || !kota) return SINIRSIZ;

    const k = kota as { limit_deger: number | null; periyot: string; dolunca: string };
    if (k.limit_deger == null) return SINIRSIZ;      // NULL = sınırsız (pilot)

    const kullanim = await sayKullanim();
    const asildi = kullanim >= k.limit_deger;
    if (!asildi) {
      return { izin: true, sinirli: true, limit: k.limit_deger, kullanim };
    }
    return {
      // "engelle" bilinçli bir karardır; varsayılan "uyar" işi durdurmaz.
      izin: k.dolunca !== "engelle",
      sinirli: true,
      limit: k.limit_deger,
      kullanim,
      mesaj: k.dolunca === "engelle"
        ? `Paket sınırınıza ulaştınız (${kullanim}/${k.limit_deger}).`
        : `Paket sınırınızı aştınız (${kullanim}/${k.limit_deger}); işlem yine de yapıldı.`,
    };
  } catch {
    return SINIRSIZ;                                  // fail-open (bkz. başlık)
  }
}
