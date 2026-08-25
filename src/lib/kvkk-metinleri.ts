/* KVKK METİNLERİ — TEK KAYNAK
 *
 * Bu üç metin 25.08.2026'ya kadar yalnız `Auth.tsx` içine gömülüydü ve
 * `mimari/15-kabul-kriterleri.md` §15.2'nin "aydınlatma metni TARAF kayıt
 * ekranında gösteriliyor" şartı sağlanmıyordu: tarafın gördüğü tek yüzey olan
 * `/katilim/:token` sayfasında KVKK'ya dair **tek satır yoktu**.
 *
 * Metin ikinci kez YAZILMAZ, buradan okunur. İki yüzeyde iki farklı metin
 * bulunması, hangisinin geçerli olduğu sorusunu doğurur — hukuki metinde bu
 * kabul edilemez.
 *
 * Metinlerin sözü değiştirilmedi; `Auth.tsx`teki hâlleri birebir taşındı.
 */

export type KvkkMetni = {
  /** Başlık — diyalog/bölüm başlığı olarak kullanılır. */
  baslik: string;
  /** Gövde — birebir hukuki metin. */
  govde: string;
};

export const KVKK_AYDINLATMA: KvkkMetni = {
  baslik: "KVKK Aydınlatma Metni",
  govde:
    "Medipact AI, arabuluculuk süreçlerindeki verilerin gizliliğini esas alır. " +
    "Sisteme girilen uyuşmazlık özetleri ve taraflara ait kişisel veriler, akademik " +
    "analiz amacıyla yapay zeka dil modelleri (Google Gemini API) üzerinden otomatik " +
    "olarak anonimleştirilerek işlenmektedir. Verileriniz hiçbir reklam ve pazarlama " +
    "şirketiyle paylaşılmaz.",
};

export const KVKK_IMHA: KvkkMetni = {
  baslik: "Veri Saklama ve İmha Politikası",
  govde:
    "Toplanan veriler yalnızca Medipact AI sisteminin çalışması için gerekli olan " +
    "güvenli altyapıda (Supabase) şifrelenmiş olarak saklanır. Kullanıcı hesabını " +
    "sildiği veya talep ettiği an tüm veriler kalıcı olarak imha edilir.",
};

/* SESLİ NOT — HAT H-14 kararı (B, 25.08.2026).
 *
 * Karar: yalnız ARABULUCUNUN KENDİ sesli notu. Taraf sesi hiçbir koşulda
 * kaydedilmez ve bu bir söz değil TEKNİK KISITTIR: kayıt yalnız cihazın kendi
 * mikrofonundan (`getUserMedia`) alınır; kod hiçbir uzak ses akışına (WebRTC
 * uzak iz, video sağlayıcı SDK'sı) dokunmaz. `tests/sesli-not.test.ts` bunu
 * dosya düzeyinde denetler.
 *
 * Şart 1: ses dosyası metne çevrildiği AN silinir; saklanan yalnız metindir.
 */
export const KVKK_SESLI_NOT: KvkkMetni = {
  baslik: "Sesli Not Nasıl İşlenir",
  govde:
    "Sesli not YALNIZCA arabulucunun kendi cihazının mikrofonundan alınır; " +
    "görüşmedeki tarafların sesi hiçbir koşulda kaydedilmez. Kayıt, metne " +
    "dökülmek üzere yalnızca geçici olarak yüklenir ve metne çevrildiği anda " +
    "sunucudan kalıcı olarak silinir — saklanan tek şey ortaya çıkan metindir. " +
    "Metne dökme işlemi, Medipact AI'ın kullandığı yapay zekâ altyapısı " +
    "(Google Gemini API) üzerinden yapılır. Ses dosyası bu altyapıda " +
    "saklanmaz. Ortaya çıkan metni arabulucu görür, düzeltebilir ve ancak " +
    "kendisi onayladığında dosyaya kaydedilir.",
};

export const KVKK_ACIK_RIZA: KvkkMetni = {
  baslik: "Açık Rıza Beyanı",
  govde:
    "Arabuluculuk Kanunu m. 4 gizlilik esaslarına uyum kapsamında; uyuşmazlıkların " +
    "(İnşaat, Sağlık, Sigorta vb.) yapay zeka modelleri tarafından anlamsal olarak " +
    "analiz edilmesine, emsal referanslarla eşleştirilmesine özgür irademle onay veriyorum.",
};
