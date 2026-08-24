/* HATIRLATMA KURALLARI — SAF İŞLEVLER (tezgâha bağlanabilsin diye ayrı dosya)
 *
 * Ayrı dosya olmasının tek sebebi TEST EDİLEBİLİRLİKTİR: `index.ts` Deno'ya
 * özgü `https://` içe aktarımları taşıdığı için vitest tezgâhından çağrılamıyor.
 * Burada dış bağımlılık yoktur. Kalıp `akis-yurut/hata-metni.ts` ile aynıdır.
 *
 * ARKA PLAN (24.08.2026 · P0): bu fonksiyon `mediator_requests` tablosunu
 * `scheduled_date` sütunuyla sorguluyordu. O tablo canlıda BOŞTUR (0 satır) ve
 * terk edilmiştir; gerçek oturumlar `case_sessions.scheduled_at`tedir (31 satır).
 * Cron'un yetki kusuru (401) bu daha derin kusuru gizliyordu: yetki düzelse bile
 * hiçbir hatırlatma gitmezdi.
 */

/** Hatırlatma penceresi: oturumdan 23–25 saat öncesi. */
export const PENCERE_BASLANGIC_SAAT = 23;
export const PENCERE_BITIS_SAAT = 25;

export function hatirlatmaPenceresi(simdi: Date): { baslangic: Date; bitis: Date } {
  const t = simdi.getTime();
  return {
    baslangic: new Date(t + PENCERE_BASLANGIC_SAAT * 3600 * 1000),
    bitis: new Date(t + PENCERE_BITIS_SAAT * 3600 * 1000),
  };
}

/* Pencere 2 saat geniş, cron ise saatlik → aynı oturum iki turda birden
   yakalanır. Pencerenin geniş kalması BİLEREKDİR: bir tur kaçarsa hatırlatma
   yine de gider. Mükerrer gönderimi pencere değil, aşağıdaki iz kapısı önler. */

/** Oturumun iz etiketi. `ajan_gorevleri.gerekce` bununla başlar. */
export function hatirlatmaEtiketi(sessionId: unknown): string {
  return `[hatirlatma:${String(sessionId ?? "").trim()}]`;
}

/** Bu oturum için daha önce hatırlatma yazılmış mı? */
export function zatenGonderildiMi(
  izSatirlari: { gerekce?: unknown }[] | null | undefined,
  etiket: string,
): boolean {
  return (izSatirlari ?? []).some(
    (r) => String(r?.gerekce ?? "").startsWith(etiket),
  );
}

/* Oturum biçimi: ürünün gerçekten bildiği tek işaret VİDEO BAĞLANTISIDIR.
   `session_type` değerleri (preliminary/private/joint) görüşmenin çevrim içi
   olup olmadığını SÖYLEMEZ — eski kod onları "online"/"phone" sanıyordu ve o
   değerler bu tabloda hiç bulunmuyor. Bağlantı varsa çevrim içi, yoksa yüz
   yüze. Uydurma yapılmaz. */
export function oturumCevrimIciMi(oturum: { video_link?: unknown }): boolean {
  return String(oturum?.video_link ?? "").trim().length > 0;
}

export function oturumBicimMetni(oturum: { video_link?: unknown }): string {
  return oturumCevrimIciMi(oturum) ? "Online (Video Call)" : "In-Person";
}
