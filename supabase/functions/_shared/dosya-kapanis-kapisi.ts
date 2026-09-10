/* DOSYA KAPANIŞ KAPISI — TEK KAYNAK (HAT H-31, 06–10.09.2026)
 *
 * NEDEN VAR. Kapanış kontrolü koda ÜÇ FARKLI ŞEKİLDE yazılmıştı:
 *   · yürütücü döngüsü: status agreed|failed veya closed_at dolu
 *   · kapanış hatırlatması: status closed veya closed_at dolu
 *   · bazı kollar: yalnız status agreed|failed
 * Nöbetçinin dosya süzgecinde ise HİÇ yoktu — `.eq("otomatik_akis", true)`
 * tek başınaydı. Kapanmış dört dosya `otomatik_akis` açık kaldığı için her
 * turda canlı dosya sanıldı; `soruHatirlatmaKollari` 19.08'den beri bekleyen
 * sorular için taraflara e-posta göndermeye devam etti (bazıları 9. hatırlatma).
 * Kurucunun posta kutusu doldu. Kanama Cowork tarafından canlıda durduruldu;
 * kalıcı düzeltme budur.
 *
 * KURAL (kurucu, 06.09.2026): "dosyalar ben söylemeden davet gönderip
 * durmasın." Kapanmış dosyadan HİÇBİR KOŞULDA ileti çıkmaz.
 *
 * BU MODÜLÜN SÖZÜ: kapanış tek yerde tanımlıdır. Görev AÇAN da, görev YÜRÜTEN
 * de, hatırlatan da buradan okur. Yeni bir kol yazılırsa o da buradan okur —
 * "kural bir yerde yazıldı, kardeş yolda açık kaldı" sınıfı kusur ancak böyle
 * kapanır.
 *
 * FAN-OUT NOTU (CLAUDE.md §11-B): bu dosya `_shared/` altındadır; değişirse
 * onu kullanan BÜTÜN edge function'lar yeniden deploy edilir.
 */

/** `cases.status` sütununda kapanış anlamına gelen bütün değerler.
 *  Canlıda üçü de görüldü: `agreed` / `failed` kapanış ekranından,
 *  `closed` eski akıştan. Liste büyürse YALNIZ burası büyür. */
export const KAPALI_STATUSLER: readonly string[] = ["agreed", "failed", "closed"] as const;

/** Kapanış kapısının okuduğu asgari dosya alanları. Sorgular bu iki sütunu
 *  MUTLAKA seçmelidir; seçilmezse kapı sessizce "açık" der. */
export type KapanisAlanlari = {
  status?: string | null;
  closed_at?: string | null;
};

/**
 * Dosya kapanmış mı? Tek doğruluk kaynağı.
 *
 * `closed_at` dolu VEYA `status` kapanış değerlerinden biri ise kapalıdır.
 * İkisi ayrı ayrı bakılır çünkü canlıda ikisi her zaman birlikte dolmuyor:
 * `closed_at`i dolduran tetikleyici `outcome` değişimini izler, kapanış
 * ekranının bir sürümü ise yalnız `status` yazıyordu (bkz.
 * `tests/dosya-kapanis-closed-at.test.ts`).
 */
export function dosyaKapali(dosya: KapanisAlanlari | null | undefined): boolean {
  if (!dosya) return false;
  if (dosya.closed_at) return true;
  return KAPALI_STATUSLER.includes(String(dosya.status ?? ""));
}

/** Kapanmış dosyaları listeden ayıklar. Nöbetçinin tur süzgeci budur:
 *  kapanmış dosya tura HİÇ girmez, kolların hiçbiri onu görmez. */
export function acikDosyalar<T extends KapanisAlanlari>(dosyalar: readonly T[]): T[] {
  return dosyalar.filter((d) => !dosyaKapali(d));
}

/* CEVAPSIZ SORUYA HATIRLATMA ÜST SINIRI — ÜRÜN KARARI.
 * Kurucu/Cowork kararı (HAT H-31 · CEVAP · 07.09.2026): en fazla **3**
 * hatırlatma; sonra susar, arabulucunun dosya ekranında "cevapsız kaldı"
 * görünür. Sayı pilotta ölçülene kadar geçicidir — bu yüzden TEK YERDEN
 * okunur, değişim tek satırdır. Eskiden üst sınır YOKTU: soru sonsuza kadar
 * hatırlatılıyordu. */
export const HATIRLATMA_UST_SINIRI = 3;

/** Bu soruya bir hatırlatma daha gönderilebilir mi?
 *  `yapilanHatirlatma` o ana kadar gönderilmiş hatırlatma sayısıdır. */
export function hatirlatmaHakkiVar(yapilanHatirlatma: number): boolean {
  return yapilanHatirlatma < HATIRLATMA_UST_SINIRI;
}

/** Üst sınıra dayanmış sorunun `sonuc` alanına yazılan damga. Arabulucunun
 *  ekranında "cevapsız kaldı" bu damgadan okunur; soru SİLİNMEZ, susulur. */
export const HATIRLATMA_TUKENDI_DAMGASI = "cevapsız kaldı — hatırlatma üst sınırına ulaşıldı";
