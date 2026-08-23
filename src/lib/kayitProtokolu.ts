/* KAYIT PROTOKOLÜ — İKİ YÜZEYİN TEK KAYNAĞI (B18 · 24.08.2026)
 *
 * Kayıt onayı iki ekranda birden görünür: arabulucunun protokol kartı
 * (`MediationEngine`) ve tarafın onay kartı (`CaseRoom`). İkisi de aynı kuralı
 * anlatır, aynı süreyi sayar ve aynı metin sürümünü veritabanına yazar.
 *
 * KUSUR (24.08 denetimi): üçü de İKİ DOSYADA AYRI AYRI gömülüydü —
 * `KAYIT_ONAY_SAAT`, `KAYIT_ONAY_SURUMU` ve harici araç yasağı cümlesi. Bugün
 * birebir aynılar; ama biri değişince öteki sessizce eski kalırdı. Sürüm
 * sapması özellikle tehlikeli: taraf "v1" onayı verirken arabulucu "v2" yazsa
 * kayıtta hangi metne onay verildiği belirsizleşirdi.
 * Kararlı kural: aynı işi yapan metin TEK olacak. Bu dosya o tek yerdir.
 *
 * constitution m.11: ekran metninde dış ürün adı kullanılmaz; yasak, araç adı
 * verilmeden tarif edilir. */

/** Onay formu açıldıktan sonra kayıtlı oturumun planlanabileceği en erken süre. */
export const KAYIT_ONAY_SAAT = 48;

/** Onaya esas metnin sürümü. Veritabanına `metin_surumu` olarak yazılır.
 *  Aşağıdaki metinler değişirse BU DEĞER DE değişmelidir. */
export const KAYIT_ONAY_SURUMU = "v1";

/** Harici araç yasağı — iki ekranda da birebir aynı cümle. */
export const KAYIT_TEK_KAPI_UYARISI =
  "Kayıt yalnız MediPact oturum ekranından alınır. Harici araçlarla (dış kayıt veya döküm " +
  "uygulamaları, görüntülü görüşme aracının kendi kayıt özelliği, telefonla ses alma) kayıt yapılamaz.";

/** Tarafın onay kartında gösterilen tam metin. Yasak cümlesi ve 48 saat
 *  buradan DEĞİL, yukarıdaki tek kaynaktan gelir — sapma yapısal olarak
 *  imkânsızdır. */
export const KAYIT_ONAY_METNI =
  `Oturumun ses kaydının alınabilmesi için her katılımcının (taraflar, vekiller ve varsa uzman) ayrı ayrı yazılı onayı gerekir. Bir katılımcı bile onay vermezse kayıt alınmaz.

· ${KAYIT_TEK_KAPI_UYARISI}
· Kayıt ve dökümü yalnız arabulucu görür; karşı tarafa hiçbir ekrandan açılmaz.
· Ses kaydı, süreç bitiminden 24 saat sonra kalıcı olarak silinir. Döküm süreç sonuna kadar durur ve son tutanakla birlikte silinir.
· Kayıtlı oturum, bu form gönderildikten en erken ${KAYIT_ONAY_SAAT} saat sonrası için planlanabilir.
· Onay vermek zorunlu değildir: onay vermemeniz süreci durdurmaz, yalnız kayıt alınmaz. Verdiğiniz onayı istediğiniz zaman geri alabilirsiniz.
· Kararınız (onay ya da ret) tutanağa işlenmek üzere kayda geçer.`;
