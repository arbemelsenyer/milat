/* KAYIT PROTOKOLÜ — İKİ YÜZEYİN TEK KAYNAĞI (B18 · 24.08.2026)
 *
 * ⚠ 29.08.2026 — SİLME SÖZÜ YANLIŞTI ve DÜZELTİLDİ (v1 → v2).
 * Metin "Ses kaydı, süreç bitiminden 24 SAAT SONRA kalıcı olarak silinir"
 * diyordu. Doğrusu: ses **metne çevrildiği AN** silinir (HAT H-14 şart 1;
 * `sesli-not-dokum` kolu bunu yapıyor; canlı tabloda `oturum_kaydi_ses`
 * **0 gün / oluşturma**). Üstelik bu 24 saatlik sabit 27.08'de HAT H-18 ile
 * `ajan-nobetci`den bilerek KALDIRILMIŞTI — arka kapı kapanmış, ONAY METNİ
 * eski sözle kalmıştı. İkinci cümle de yanlıştı: döküm "son tutanakla
 * birlikte" değil, dosya kapanışından sonra saklama süresi dolunca siliniyor
 * (`oturum_kaydi_dokum`). Aynı ürün, aynı kişiye iki çelişik şey söylüyordu:
 * `kvkk-metinleri.ts` doğrusunu yazıyordu, bu onay metni yanlışını.
 * Bir ONAY metninde yanlış saklama sözü, ekran etiketinden ağırdır — taraf
 * kayda ona güvenerek razı oluyor.
 * Süre SAYISI buraya bir daha YAZILMAZ: tek doğruluk kaynağı
 * `saklama_sureleri` tablosudur ve taraf onu "Verilerim" sayfasında görür.
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
 *  Aşağıdaki metinler değişirse BU DEĞER DE değişmelidir.
 *
 *  v1 → v2 (29.08.2026): silme sözü DÜZELTİLDİ, aşağıya bakınız. Sürüm
 *  yükseltmek zorunluydu — kurucu kararı gereği onay kaydı kalıcıdır ve
 *  "hangi metnin hangi sürümü" bilgisini taşır (HAT H-15 · 2. madde).
 *  Metni sürüm yükseltmeden değiştirmek, geçmişte v1'e verilmiş onayı yeni
 *  metne verilmiş gibi gösterirdi; yani onay kaydının tek işini bozardı.
 *  Canlıda v1 ile alınmış 1 onay var (16.08) ve o v1 olarak kalır. */
export const KAYIT_ONAY_SURUMU = "v2";

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
· Ses kaydı metne çevrildiği an sunucudan kalıcı olarak silinir; saklanan tek şey ortaya çıkan metindir.
· Metin dökümü, dosya kapandıktan sonra saklama süresi dolunca silinir. Süreyi görmek için "Verilerim" sayfasına bakabilirsiniz.
· Kayıtlı oturum, bu form gönderildikten en erken ${KAYIT_ONAY_SAAT} saat sonrası için planlanabilir.
· Onay vermek zorunlu değildir: onay vermemeniz süreci durdurmaz, yalnız kayıt alınmaz. Verdiğiniz onayı istediğiniz zaman geri alabilirsiniz.
· Kararınız (onay ya da ret) tutanağa işlenmek üzere kayda geçer.`;
