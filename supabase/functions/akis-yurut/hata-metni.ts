// KOŞUCUNUN PANOYA YAZDIĞI HATA METNİ (saf işlev)
//
// Ayrı dosya olmasının tek sebebi TEST EDİLEBİLİRLİKTİR: `index.ts` bir `npm:`
// içe aktarımı taşıdığı için tezgâhtan çağrılamıyor. Burada dış bağımlılık yok.
//
// SORUN (canlı · 20.08.2026 · dosya eb70595a): koşucu bir adım çalışmayınca
// panoya "<fonksiyon> çalıştırılamadı: <sebep>" yazıyor ve BU METNİN TAMAMI
// sınır katmanından geçiyordu. Sebep gövdesinde HTTP durum kodu ve JSON
// bulunduğu için cümle "dayanaksız rakam" sayılıp TÜMÜYLE eleniyor, panoda
// arabulucuya yalnız "Bu konuda size yazabileceğim bir şey bulamadım."
// kalıyordu. Yani hangi adımın neden çalışmadığı kayboluyordu — hatayı
// gizleyen bir hata.
//
// ÇÖZÜM — sınır katmanı GEVŞETİLMEDİ, metin ikiye ayrıldı:
//  · BAŞLIK koddan üretilir: akış kuralındaki fonksiyon adı (yönetici tanımı)
//    ve YALNIZ `\d{3}` ile yakalanmış HTTP durum kodu. İçinde taraf verisi
//    bulunması yapısal olarak mümkün değildir; süzgece ihtiyacı yoktur.
//  · SEBEP iç çağrının cevap gövdesidir ve taraf verisi TAŞIYABİLİR. Eskisi
//    gibi sınır katmanından geçer; elenirse metne KONMAZ.
// Sebep elendiğinde sessizce kaybolmaz: hangi türün elediği yazılır (SESSİZ
// ELEME YOK kuralı).
import { sinirDenetle } from "../_shared/anlatim.ts";

/** Koddan üretilen başlık. `sebep` yalnız HTTP durum kodu için okunur. */
export function akisHataBasligi(fonksiyon: string, sebep: unknown = ""): string {
  const ad = String(fonksiyon ?? "").trim() || "adım";
  const kod = /\bHTTP (\d{3})\b/.exec(String(sebep ?? ""))?.[1] ?? "";
  return `${ad} çalıştırılamadı${kod ? ` (HTTP ${kod})` : ""}.`;
}

/** Başlık her hâlde kalır; sebep ancak sınır katmanından geçerse eklenir. */
export function akisHataMetni(baslik: string, sebep: unknown = ""): string {
  const bas = String(baslik ?? "").trim();
  const ham = String(sebep ?? "").trim();
  if (!ham) return bas;
  const r = sinirDenetle(ham);
  if (r.gecti) return `${bas} ${ham}`.trim();
  return `${bas} Sebep kayda geçmedi (sınır katmanı eledi: ${r.turler.join(", ")}).`.trim();
}
