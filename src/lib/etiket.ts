/* İŞ ETİKETİ AYIRICI — ÖN YÜZ KOPYASI (24.08.2026)
 *
 * Ajan kayıtlarının `gerekce` alanı makine okunur etiketlerle BAŞLAR:
 *   `[kaynak:…][bekleyen:…] [eksik:…] [kol:…] insana giden metin`
 * İnsana gösterilen yüzeylerde bu etiketlerin TAMAMI silinir.
 *
 * NEDEN KOPYA: aynı işlev `supabase/functions/_shared/anlatim.ts` içinde
 * `etiketleriAyir` adıyla var, ama orası Deno tarafıdır ve `https://` içe
 * aktarımları taşır — Vite paketine giremez. Kopya BİLEREKDİR ve tek satırlık
 * saf bir işlevdir. `tests/etiket-ayirici-esitlik.test.ts` ikisinin AYNI
 * sonucu verdiğini sabitler; sapma olursa tezgâh düşer.
 *
 * KUSUR (24.08, canlı): tüketiciler baştaki etiketi SAYIYLA siliyordu — biri
 * bir kez, biri iki kez. Geçit `[kaynak:…]` eklemeye başlayınca (21.08 11:06)
 * üç etiket oldu ve TARAFIN kendi ekranında `[bekleyen:…] [eksik:…] [kol:…]`
 * görünür hâle geldi (ham UUID dahil). Silme sayıya değil TÜKENMEYE dayanmalı.
 */

export function etiketleriAyir(metin: unknown): { etiketler: string; govde: string } {
  const ham = String(metin ?? "").trim();
  const etiketler = (/^(?:\[[^\]]{0,160}\]\s*)+/.exec(ham) ?? [""])[0].trim();
  return { etiketler, govde: ham.slice(etiketler.length).trim() };
}

/** İnsana gösterilecek gövde: baştaki bütün iş etiketleri silinmiş hâli. */
export function etiketsizGovde(metin: unknown): string {
  return etiketleriAyir(metin).govde;
}
