/* KAYNAK OKUYUCU — satır sonu NORMALLEŞTİRİLİR.
 *
 * NEDEN VAR (27.08.2026): `tests/saklama-imha.test.ts` kırmızı yandı, kod
 * tamamen doğruydu. Lovable'ın dokunduğu dosya `core.autocrlf=true` yüzünden
 * çalışma ağacına **CRLF** olarak indi ve tezgâhın çok satırlı `indexOf`
 * araması eşleşmedi. Depoda 341 izlenen dosya CRLF olduğu için bu tuzak,
 * kaynak okuyan HER tezgâh için yeniden kurulabilirdi.
 *
 * Bir tezgâhın ürünle ilgili hiçbir şey söylemeyen bir sebeple kırmızı yanması
 * en pahalı yanlış alarm türüdür: gerçek kusur arayışını durdurur. Kaynak
 * okuyan her tezgâh bu yardımcıdan geçsin; `readFileSync(..., "utf-8")`
 * doğrudan çağrılmasın.
 */
import { readFileSync } from "node:fs";

/** Dosyayı UTF-8 okur ve CRLF'i LF'e çevirir. */
export const kaynakOku = (yol: string): string =>
  readFileSync(yol, "utf-8").split("\r\n").join("\n");
