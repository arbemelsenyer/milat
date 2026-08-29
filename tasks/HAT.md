# HAT — Code ↔ Cowork iletişim hattı

**Amaç:** Claude Code'un durması gereken her karar/soru buraya yazılır. Code
yazar ve **beklemez**; o cevaba bağlı olmayan işe devam eder. Cowork (ya da
kurucu) cevabı `## COWORK → CODE` bölümüne yazar. Code her turun başında o
bölümü okur, cevap gelmişse uygular ve maddeyi kapatır.

**Bu dosya bir DURUM dosyası değildir.** Tek doğruluk kaynağı `tasks/todo.md`dir
(CLAUDE.md §0). Burada yalnız **açık iletişim** durur. Madde kapanınca sonucu
`tasks/todo.md`ye işlenir ve buradan **ARŞİV**e taşınır.

**Madde biçimi (zorunlu):** tarih · madde · sorun · seçenekler · önerim ·
kararın etkisi. Önerisiz soru yazılmaz (CLAUDE.md §7-B.3).

**Numaralandırma:** `H-1`, `H-2`, … Numara yeniden kullanılmaz.

---

## CODE → COWORK
### H-24 · 29.08.2026 · **P0 · ZAMANA BAĞLI** — emniyet süpürgesi bu gece 03:00'te 5 gerçek dosyayı silecek

**Durum.** Bugün kurulan emniyet süpürgesi (HAT H-15/1 adım 3) canlıya
dağıtıldı ve `saklama-imha-gunluk` cron işi **her gece 03:00**'te koşuyor.
`saklama_sureleri.dosya_kapanis_sonrasi.saklama_gun = 7` olduğu için ilk
koşumda kapanışı 7 günü geçmiş **5 dosya tamamen silinecek. Geri alınamaz.**

**Silinecek olanın tam ölçüsü (29.08, canlı sayım):**

| ne | adet |
|---|---|
| dosya | **5** (kapanış 16–18.07.2026) |
| taraf satırı (`case_parties`) | **8** |
| taraf analizi | **8** |
| anlaşma belgesi (`agreement_documents`) | **13** |
| oturum | **4** |
| belge / not | 0 (mevcut kollar zaten süpürmüş) |

**Neden size soruyorum (§7.3).** Politika sizin: "süreç bitince her şey
silinir" (H-15/1, iki kez teyit edildi) ve bu 5 dosya süresini **40 günden
fazla** geçmiş. Yani silinmeleri kararın kendisidir. Ama bunlar süpürge
**var olmadan önce** kapanmış dosyalar ve yeni kurulmuş otomatik bir yok
edicinin ilk gecesinde, siz görmeden gitmeleri sizi hazırlıksız yakalar.
Geri dönüşsüz olanı sormadan yapmam (CLAUDE.md §7.3).

**Seçenekler.**
- **(a) Dokunma — bu gece silinsinler.** Politika neyse o olur. Hiçbir şey
  yapmanız gerekmez; 03:00'te olur.
- **(b) Bir süre beklet.** Tek satır, geri alınabilir, dağıtım gerektirmez:
  ```sql
  update public.saklama_sureleri set saklama_gun = null
  where veri_turu = 'dosya_kapanis_sonrasi';
  ```
  `NULL = dokunma` sizin tasarladığınız güvenlik valfidir; kod onu zaten
  biliyor. Bakmak istediğinizde 7'ye geri koyarız, süpürge kaldığı yerden
  sürer. **Öteki saklama kolları bundan etkilenmez, çalışmaya devam eder.**
- **(c) Süreyi uzat.** Örneğin 90 gün — o zaman bu 5 dosya da kapsam dışı
  kalır ve süpürge yalnız bundan sonrası için çalışır.

**Önerim: (b), bu gece için.** Gerekçe: geri alınabilir olan ile geri
alınamaz olan arasında seçim varken geri alınabilir olan seçilir. KVKK
uyumunda bir günlük gecikmenin bedeli, yanlışlıkla silinmiş 5 dosyanın
bedelinden küçüktür. Bakıp "gitsin" derseniz tek satırla açarız.

**Not.** Bu satırı ben yazmayı denedim, izin ekranı engelledi — bilerek
zorlamadım; zaten sizin kararınız. Siz ya da Cowork çalıştırabilir.

### H-23 · 29.08.2026 · P1 — COWORK İŞİ: `kapanis_istatistigi` tablosu kurulmalı

*(Karar değil, çalıştırma işi — CLAUDE.md §10: SQL metnini Code yazar,
çalıştırmayı Cowork yapar. Beş satırlık paket:)*

1. **Ne yapılacak.** `tests/sabit/kapanis-istatistigi.sql` canlıda çalıştırılacak.
   Tablo + RLS + tek okuma politikası kurar. **Hiçbir şey silmez, hiçbir satır
   değiştirmez.**
2. **Neden gerekli.** KVKK silmesinin kanıtı bugün **hiçbir yere yazılmıyor**.
   Kayıt `dosya_kapanis`e yazılıyordu ama o satır `cases`e ON DELETE CASCADE
   bağlı ve yazım `cases` silindikten SONRA yapılıyordu → 0 satır etkileniyor,
   `supabase-js` bunu hata saymıyor. Yani ne yazılıyor ne de yazılmadığı
   söyleniyordu. Kod tarafı düzeltildi (`bdde1b0`) ve artık yazacağı tablo bu.
   Kurucu kararı (20.08): "kişisel veri içermeyen sayımlar KALIR" — bu tablo o
   kararın tek dayanağıdır.
3. **Çalıştırılacak metin.** `tests/sabit/kapanis-istatistigi.sql` (depoda,
   commit `bdde1b0`). Olduğu gibi çalıştırılır; içinde `create table if not
   exists` var, tekrar çalıştırmak zararsızdır.
4. **Başarı kontrolü.** Betiğin sonundaki üç sorgu:
   `select count(*) from public.kapanis_istatistigi;` → **0** ·
   `relrowsecurity` → **true** · yabancı anahtar sayısı → **0**.
   Sonuncusu kritik: tablo `cases`e bağlanırsa aynı kusur geri gelir.
5. **Sonra Code ne yapacak.** Emniyet süpürgesini kuru koşumda çalıştırıp
   (`saklama-imha` · `{"kuru":true}`) süresi geçmiş dosya sayısını canlıdan
   doğrular, sonra gerçek koşumu tetikler ve `kapanis_istatistigi`de satırların
   oluştuğunu gösterir. Sonucu `tasks/todo.md`ye işler.

**Beklerken durmuyorum** (§23): bu maddeye bağlı olmayan işe devam ediyorum.
Tablo kurulana kadar silme **çalışır**, yalnız her silmede "anonim kapanış
kaydı yazılamadı: tablo yok" uyarısı döner — sessiz kalmaz.

### H-22 · 29.08.2026 · P3 — bilgi tabanında 71 öksüz dosya (33,2 MB); silinsin mi?

**Sorun.** `case-documents` kovasının `admin/knowledge/` bölümünde, bilgi
tabanında hiçbir parçanın göstermediği **71 dosya** duruyor (toplam **33,2 MB**,
en eski **01.07.2026**, en yeni **02.08.2026**). Bunlar 26.08'den önceki iki
kusurun kalıntısıdır: (a) yükleme kolu dosyayı parçalardan ÖNCE yazıyordu,
(b) yol düzeni sonradan değişti (`admin/knowledge/<dosya>` → 
`admin/knowledge/<kategori>/<dosya>`), eski kopyalar sahipsiz kaldı. Üretici
kollar 26–27.08'de kapatıldı; bu birikim geride kalandır.

**Ne oldukları ölçüldü.** Çoğu bugün bilgi tabanında ZATEN VAR olan mevzuatın
eski kopyası (6102 TTK 4,6 MB iki kez · 5510 SGK · 6098 TBK · 4857 İş K. ·
5846 FSEK · 6769 SMK vb.) ve 01–02.07'de yüklenmiş **tutanak/sözleşme şablonu
.docx** dosyaları. **Kişisel veri İÇERMEZLER** — kamuya açık mevzuat ve boş
şablonlardır; bu yüzden P0 değil P3'tür. Yine de constitution m.10 (süresiz
saklama yasağı) kapsamındadır.

**Güvenlik kontrolü yapıldı.** Bu 71 dosyanın **hiçbirini** `document_templates`
ya da `pending_pool` göstermiyor (ikisi de 0). Yani silinirlerse çalışan hiçbir
şablon ya da onay havuzu kırılmaz. *(Bu kontrol sırasında ayrı bir açık bulundu
ve düzeltildi: öksüz süpürgesinin "sahipli yollar" görünümü bu iki tabloyu
BİLMİYORDU — ileride şablonun kullandığı bir dosyayı öksüz sanıp silebilirdi.
Görünüm `tests/sabit/oksuz-belge-supurgesi.sql` içinde tamamlandı; sayı yine
71 çıktı, yani geçmişte zarar oluşmamış.)*

**Seçenekler.**
- **(a)** Hepsini sil. 33,2 MB geri kazanılır, constitution m.10 tam sağlanır.
  Geri alınamaz.
- **(b)** Yalnız mevzuat PDF'lerini sil, `.docx` şablonları bırak. Şablonlar
  ileride "resmî şablon kütüphanesi" işine yarayabilir diye.
- **(c)** Dokunma, olduğu gibi bıraksın.

**Önerim: (a).** Gerekçe: bu dosyaların hiçbiri bir yüzeyden erişilebilir
değil — `/admin` bilgi tabanı listesi parçalardan üretiliyor, dolayısıyla bu
dosyalar **ekranda görünmüyor bile**. Görünmeyen ve hiçbir kaydın göstermediği
33 MB'ı tutmanın tek etkisi, saklama sözünün kâğıt üzerinde kalması. Şablonlar
kaybolmuyor: `document_templates` tablosundaki çalışan şablonlar bu dosyalardan
BAĞIMSIZ (ölçüldü: 0 bağ).

**Kararın etkisi.** (a) seçilirse silme **depo API'siyle** yapılır — SQL ile
`storage.objects` satırını silmek yetmez, satır gider dosya kalır ve bir daha
hiç bulunamaz (betiğin Bölüm 3 uyarısı). Kanıt: silme sonrası Bölüm 1 sayımı
`bilgi tabani` için **0** dönmelidir. Çalıştıracak liste hazır; kararınızı
alınca ben yürütürüm. (c) seçilirse kuyruktaki P3 madde kapatılır ve
constitution m.10 için bilinçli bir istisna olarak kaydedilir.

### H-21 · 28.08.2026 · P1 — `.env` deposa girmiş; çıkarmak canlı yayını kırabilir

**Sorun.** `.env` dosyası git'te **izleniyor** (`git ls-files .env` onu
listeliyor; tek commit `051779e`, uzak depo `github.com/arbemelsenyer/milat`).
Bu 23.08'de bulunmuş, "kurucu kararı bekliyor" diye `tasks/todo.md`ye yazılmış
ve orada beş gün beklemiş — HAT'a hiç taşınmamış. Şimdi taşındı.

**23.08'de ölçülen (o turun kaydı):** içindeki üç değişkenin adı `VITE_`
önekli. Vite bu değişkenleri zaten tarayıcıya giden paketin **içine gömer**,
yani tasarımı gereği herkese açık değerlerdir; sunucu sırrı değildir. Değerler
okunmadı, hiçbir yere yazılmadı (§12).

**28.08'de EKLENEN yeni bilgi — 23.08'deki öneriyi değiştiriyor.**
`src/integrations/supabase/client.ts` bu değerleri **derleme anında**
`import.meta.env.VITE_SUPABASE_URL` ve `VITE_SUPABASE_PUBLISHABLE_KEY`
üzerinden okuyor. Dosya git izleminden çıkarılırsa Lovable'ın bulut derlemesi
bu değerleri **kendi enjekte etmiyorsa** canlı uygulama açılışta veritabanına
hiç bağlanamaz. 23.08'de önerilen "izlemden çıkar" seçeneği bu riski
görmemişti. Bunu ölçmenin güvenli yolu yok: ancak deneyerek görülür ve
denemenin bedeli canlı yayının kırılmasıdır.

**Seçenekler.**
- **(a)** `git rm --cached .env` + `.gitignore`. Gizlilik kazancı **sıfır**
  (değerler zaten paketin içinde), risk **canlı yayının kırılması**.
- **(b)** Olduğu gibi bırak, ama `.gitignore`a `.env.*` (`.env.example` hariç)
  eklenir ki bundan sonra **başka** bir env dosyası yanlışlıkla girmesin.
- **(c)** Geçmişten de temizle (geçmiş yeniden yazma). (a)'nın bütün riskini
  taşır, üstüne uzak depoyu ve varsa klonları etkiler.

**Önerim: (b).** Gerekçe: burada korunacak bir sır yok — `VITE_` değişkeni
tanım gereği açıktır — ama gelecekte gerçek bir sır içeren bir env dosyasının
girmesi mümkün ve asıl korunması gereken o. (b) hiçbir şeyi kırmadan o kapıyı
kapatır.

**Kararın etkisi.** (b) seçilirse canlıda hiçbir şey değişmez, tek satırlık bir
`.gitignore` düzenlemesi olur ve ben yaparım. (a) veya (c) seçilirse önce
Lovable'ın derlemede kendi değişkenlerini enjekte edip etmediği doğrulanmalı;
doğrulanmadan yapılırsa canlı uygulama kırılabilir.

**Not.** Gerçek bir sunucu sırrı (servis anahtarı, API jetonu) bu dosyada
görülmedi. Görülseydi bu madde P0 olurdu ve anahtar yenileme gerekirdi.

### H-20 · 27.08.2026 · P1 — **DÜZELTME:** mevzuat duruyor; asıl kusur "girdi sanılan boş kaynaklar"

> ⛔ **BU MADDENİN İLK HÂLİ YANLIŞTI. Aynı gün, sormadan önce ölçtüm ve
> yanıldığımı gördüm.** Sana "Türk Ticaret Kanunu, Fikir ve Sanat Eserleri
> Kanunu ve Sınai Mülkiyet mevzuatı bilgi tabanında yok" demiştim.
> **Üçü de var.** Hata bendeydi: öksüz dosya adlarını girmiş kaynaklarla
> eşleştirirken yalnız zaman damgası önekini atmıştım, oysa başarılı
> yüklemeler **yeni yol düzeniyle** (`kategori/dosya_adi`) ve farklı harf
> dönüşümüyle kaydedilmiş. İki liste bu yüzden hiç örtüşmedi ve ben "hiç yok"
> diye okudum. Depoda öksüz dosya olması, kaynağın bilgi tabanında olmadığı
> anlamına gelmiyormuş — çoğu, **sonradan başarıyla yeniden yüklenmiş
> denemelerin artığı.**

**GERÇEKTE NE VAR (sayımı bu kez kaynak listesinden yaptım):**

| kaynak | durum |
|---|---|
| **6102 Türk Ticaret Kanunu** | **VAR** — 7 bölüm hâlinde, toplam **664 parça** |
| 5846 Fikir ve Sanat Eserleri Kanunu | VAR (82 parça) |
| 6769 Sınai Mülkiyet Kanunu + 23528 Yönetmelik | VAR (158 + 133) |
| 6284 Ailenin Korunması + Uygulama Yönetmeliği | VAR (18 + 32) |
| 4857 İş K. · 6098 TBK · 5510 SGK · 6356 Sendikalar · 4721 TMK · 6100 HMK | VAR |

**Üstelik 800 parça sınırını sen zaten çözmüşsün:** TTK'yı tek dosya olarak
yükleyemeyince **7 parçaya bölüp** yüklemişsin. Yani benim "sınıra takılıyor"
tahminim doğruydu ama sorun çoktan aşılmıştı; sana gereksiz bir iş öneriyordum.
Hata metni artık bu çözümü kendisi söylüyor (commit `d0a82c4`).

---

**ASIL KUSUR BAŞKA YERDEYMİŞ — VE DAHA AĞIR.**

Kaynak listesinde parça sayıları tuhaftı. Ölçünce çıktı: bazı kaynaklar
**"girmiş" görünüyor ama neredeyse boş.**

| kaynak | boyut | parça | parça/KB |
|---|---|---|---|
| Kira Uyuşmazlıkları ve Arabuluculuk (eğitim dokümanı) | 4.1 MB | **5** | 0.0012 |
| "2004 sayılı İcra ve İflas Kanunu" | 117 KB | **2** | 0.0171 |
| sağlıklı kanun PDF'leri (karşılaştırma) | — | — | 0.12–0.19 |

Sebep: tek kapı `parça sayısı sıfır mı` idi. Metin katmanı olmayan (taranmış)
bir PDF **sıfır değil birkaç** parça verir; yükleme "başarılı" sayılır, kaynak
`/admin` listesinde **görünür**, sen "yükledim" dersin — ama ajanlar o
kaynaktan hiçbir şey bulamaz. **Açık hatadan daha kötüdür: hata görülür,
boşluk görülmez.**

**DÜZELTİLDİ (commit `d0a82c4`).** 1 MB'tan büyük bir dosya 10'dan az parça
veriyorsa artık **reddediliyor** ve sebebi söyleniyor ("taranmış PDF, metin
katmanı yok"). Eşik yoğunluğa değil tartışmasız bir uca konuldu ki meşru sunum
PDF'leri (0.016–0.021) engellenmesin; onlar için reddetme yok, `yogunluk_uyarisi`
var. Tezgâh: `tests/bilgi-yukleme-oksuz.test.ts` · 375/375 yeşil.

---

**İKİNCİ DÜZELTME — 7036 DA VARMIŞ.** Yukarıdaki listede "7036 sayılı İş
Mahkemeleri Kanunu kaynak listesinde hiç yok" yazmıştım. **Var**: 12 parça,
adalet.gov.tr'den girmiş. Aynı hatayı ikinci kez, başka bir boyutta yaptım —
bu kez yalnız **depodan** beslenen kaynaklara bakıp URL'den beslenenleri
saymadım. Doğru yöntem, kaynağı geldiği yere göre değil **başlığa göre bütün
kaynaklarda** aramaktı; öyle arayınca liste üçten ikiye indi.

---

**ÜÇÜNCÜ TUR — 28.08.2026: İİK YÜKLEMESİ ARTIK GEREKMİYOR, DÜĞMEYE BASMAK
YETİYOR.** Senden dosya istemek yerine kanunun **resmî kaynağını** kitap
listesine koydum: `mevzuat.gov.tr/MevzuatMetin/1.3.2004.pdf`. Nüshayı ölçtüm —
1.249.156 bayt, 227 yazı tipi nesnesi, taranmış görüntü kodlayıcısı (DCT/CCITT/
JPX) **sıfır**: gerçek metin katmanı var, elimizdeki 117 KB'lık nüshanın aksine.

**Yapman gereken tek şey:** `/admin` → Bilgi Tabanı → **"Atlananları yeniden
işle"**. Zaten parçası olan kitaplar atlanır, yalnız İİK işlenir; büyük olduğu
için sayfa dilimli modda, devam ederek. Bitince parça sayısını canlıdan
doğrularım (sağlıklı sonuç birkaç yüz parça olmalı).

**Yanılmışsam zarar yok:** aynı turda kurulan metin katmanı kapısı yetersiz
çıkarımı reddeder, sebebini söyler ve **hiçbir şeyi silmez.**

**Ayrıca, işlem bittikten sonra silinecek tek şey:** eski, boş İİK nüshası
(`/admin` listesinde "2004 sayılı İcra ve İflas Kanunu", 2 parça, depodan
yüklenmiş olan). İki nüsha aynı adı taşıyacağı için bu adım karışıklığı
önler; silmeyi `/admin`den sen yaparsın (geri dönüşü olmayan işlem, §7).

**YENİ BULGU — üçüncü boş kaynak:** `7251 sayılı Hukuk Muhakemeleri Kanunu ile
Bazı Kanunlarda Değişiklik...` da boş: 366 KB PDF'ten **2 parça, 2.066
karakter**. Kaynağı adalet.gov.tr'deki taranmış nüsha ve `mevzuat.gov.tr`
bu kanunu PDF olarak vermiyor (HTML'e yönlendiriyor). **Karar senin** —
seçenekler:
- **(a)** Kaynağı listeden düşür. Zaten boş; ajanlar ondan hiçbir şey bulamıyor.
- **(b)** Yerine **6502 sayılı Tüketicinin Korunması Hakkında Kanun**u koy
  (mevzuat.gov.tr'de 480 KB, metin katmanlı). Tüketici arabuluculuğunun asıl
  dayanağı zaten bu kanundur; 7251 onu değiştiren kanundur.
- **(c)** Olduğu gibi bırak.
- **Önerim: (b).** Tüketici senin dava şartı kategorilerinden biri ve bugün o
  başlıkta işe yarar tek metin 6100 HMK. **Etkisi:** tüketici dosyalarında
  ajan cevapları kaynak gösterebilir hâle gelir; bugün gösteremiyor.

---

**SENDEN İSTEDİĞİM (kalan tek madde, karar değil yükleme işi):**

1. ~~**İcra ve İflas Kanunu**~~ — **KAPANDI (28.08), yukarıya bak.** Kaynak
   resmî adresten besleniyor; sana kalan yalnız `/admin`de düğmeye basmak.
2. **Kira Uyuşmazlıkları ve Arabuluculuk** eğitim dokümanı — 4.1 MB'lık nüsha
   **5 parça** vermiş, yani taranmış görünüyor. Kira senin ana
   kategorilerinden biri. Metin katmanlı bir sürümü varsa yükle; yoksa
   bırakalım, ısrar etmem — yanındaki 6 kira sunumu ve Yargıtay kararı duruyor.

Yükledikten sonra söyle, parça sayılarını canlıdan doğrularım. Artık yükleme
yolu da yardımcı: taranmış PDF baştan reddediliyor, düşük yoğunluk uyarı
veriyor (commit `d0a82c4`).

**DEPODAKİ 59 ÖKSÜZ DOSYA:** artık "eksik mevzuat" olmadıkları anlaşıldı —
çoğu başarılı yeniden yüklemelerin artığı. Silinmeleri KVKK meselesi değil,
yalnızca ~33 MB yer meselesi. Acelesi yok; pilottan sonra süpürülür.

### H-7 · 25.08.2026 · P1 — Geri bildirim (`session_feedback`) yapısal olarak imkânsız
**Sorun.** Adanın **altıncı** yüzeyi: `SessionFeedback.tsx` hiçbir yerden import
edilmiyor (geçişli graf taraması: `main.tsx`ten erişilemez). Dahası, erişilebilir
olsaydı bile **yazamazdı** — canlı RLS politikası şöyle:

| politika | koşul |
|---|---|
| INSERT `Users can submit feedback for their sessions` | `EXISTS (select 1 from **mediator_requests** mr where mr.id = session_feedback.mediator_request_id and mr.user_id = auth.uid())` |
| SELECT `Mediators can view feedback for their sessions` | aynı `mediator_requests` bağı |

`mediator_requests` canlıda **0 satırdır ve tek yazan yüzeyi 25.08'de silindi**
(`87d1dc4`). Yani şart hiçbir zaman sağlanamaz: **kimse geri bildirim
veremez, arabulucu hiçbir geri bildirimi göremez.** `session_feedback` = 0 satır.
Buna rağmen `Analytics.tsx` bu tablodan puan paneli çiziyor — kullanıcıya
"henüz veri yok" diye görünen şey aslında **hiç dolamayacak** bir panel
(yeni kapattığımız "0 oturum" kusurunun aynısı).

**Seçenekler.**
| | ne yapılır | bedeli |
|---|---|---|
| **A** | Geri bildirim `case_sessions`e bağlanır: `session_feedback.mediator_request_id` → `session_id`, RLS `is_case_mediator` + taraf ölçütüyle yeniden yazılır, panel `MediationEngine`/`CaseRoom` oturum kartına bağlanır | Şema göçü + RLS + yeni yüzey bağı; pilotta gerçek geri bildirim toplanır |
| B | Yüzey ve panel kaldırılır, tablo durur (H-3 sınıfı) | Ucuz; pilotta geri bildirim verisi **hiç** toplanmaz |
| C | Bugünkü hâl korunur | Kullanıcıya hiç dolmayacak bir panel gösterilmeye devam eder |

**Önerim: A** — ama Analytics'teki puan paneli A bitene kadar **gizlensin**
(C'nin yalanı sürmesin). Sebep: geri bildirim pilotun kendi ölçüsüdür; "arabulucu
işini iyi yaptı mı" verisi olmadan pilot sonucu değerlendirilemez. B ucuzdur ama
pilotun tek nesnel kalite ölçüsünü siler.

**Kararın etkisi.** A seçilirse şema göçü gerekir (Lovable SQL) ve geri bildirim
kimin göreceği bir gizlilik kararıdır (§7.4): taraf kendi puanını, arabulucu
kendi dosyasının puanını, yönetici hepsini. C seçilirse Analytics kullanıcıya
yanlış izlenim vermeye devam eder.

---

### H-8 · 25.08.2026 · P2 — Emekliye ayrılmış başvuru (intake) adası: 17 dosya
**Sorun.** `main.tsx`ten geçişli erişilebilirlik taraması (124 kaynak dosyadan
**35'i** erişilemez) en büyük öbeği gösterdi: **başvuru akışının tamamı ölü.**
`/intake` yolu `RedirectToHub` ile `/legal-reasoning`e yönlendiriliyor; Landing
sayfasının iki "Başvuruyu Başlat" düğmesi de doğrudan `/legal-reasoning?new=1`e
gidiyor. Yani başvuru **bilerek** merkeze (MediationEngine) taşınmış, eski akış
kodda kalmış.

Ölü öbek: `src/pages/Intake.tsx` · `src/components/intake/**` (IntakeForm,
IntakeChat, StepIndicator, FormField, CheckboxGroup, SelectableCard,
`steps/` altındaki 8 adım + index) · `src/hooks/useCaseStorage.ts` ·
`src/lib/ai-processing.ts` · `src/lib/ai.ts` · `src/lib/masking.ts` ·
`src/constants/mediationAI.ts`.

**Neden tuzak:** `IntakeForm` `cases` ve `case_parties` tablolarına **INSERT**
atıyor — yani merkezin kurallarını (kör veri, taraf daveti, aşama) atlayan
**ikinci bir dosya açma yolu** kodda duruyor. `MediatorDetail` tuzağının aynısı;
o tuzak 24.08'de üç tur kaybettirdi (`tasks/lessons.md`).

**Seçenekler.**
| | ne yapılır | bedeli |
|---|---|---|
| **A** | Öbek silinir (H-3 sınıfı: kod gider, tablo durur), tezgâh geri sızmayı engeller | ~20 dosya eksilir; eski akış geri istenirse git geçmişinden döner |
| B | Öbek durur, üstüne "ÖLÜ — kullanma" uyarısı konur | Tuzak durur; bir sonraki oturum yine yanılabilir |
| C | Başvuru akışı diriltilir ve `/intake` yeniden bağlanır | İki paralel dosya açma yolu = kör veri ve aşama kurallarının çift uygulanması |

**Önerim: A.** Kurucunun H-3 kararı zaten "tuzağın kaynağı koddur, kod silinir"
diyordu; bu öbek aynı sınıfın en büyüğü. C ürün olarak yanlıştır: merkez zaten
tek kapı olarak seçilmiş.

**Kararın etkisi.** A geri dönüşlüdür (git). Ama silinen şey görsel olarak
"başvuru formu" olduğu için kurucunun bunu bilerek onaylaması gerekir — pilotta
kullanılacak bir ekran değil, emekliye ayrılmış bir ekrandır.


### H-9 · 25.08.2026 · P2 — Takip föyünün oturum satırları otomatik mi kalsın?
**Sorun.** `ProcessTrackerPanel` föyünde "İlk Oturum", "2. Oturum", "Oturum
Erteleme" satırları **otomatik** (kutu kilitli, arabulucu elle işaretleyemiyor)
ve `case_sessions`ten türetiliyor. Bugün türetme düzeltildi: iptal ve taslak
kayıtlar artık sayılmıyor, erteleme ardılı olan iptal ister (canlı kanıt: 32
oturum kaydının **21'i iptal**; `5186ee1d` dosyasında föy iptal edilmiş bir
oturumu "2. Oturum" diye gösteriyordu).

Ama asıl soru duruyor: **şemada "oturum yapıldı" kaydı YOK.** Durumlar yalnız
`scheduled` · `cancelled` · `draft`. Yani "İlk Oturum ✓ 24.07.2026" en iyi
ihtimalle "o tarihe oturum PLANLANMIŞTI" demektir — föy ise yapılmış oturumu
kaydeder. Bu, 25.08'de kapattığımız "Dosya Atama Tarihi" kusuruyla aynı aileden.

**Seçenekler.**
| | ne yapılır | bedeli |
|---|---|---|
| **A** | `case_sessions`e "yapıldı" durumu (ya da `held_at`) eklenir; föy onu okur | Şema göçü (Lovable SQL) + oturum ekranına tek düğme; föy gerçeği yazar |
| B | Üç satır **elle işaretlenir** hale getirilir (diğer 13 satır gibi) | Ucuz, yalan yok; arabulucu kendi işaretler |
| C | Bugünkü hâl (planlanan tarih, düzeltilmiş türetme) | Föy "planlandı"yı "yapıldı" gibi göstermeye devam eder |

**Önerim: B şimdi, A pilottan sonra.** Föy zaten arabulucunun kendi takip
belgesidir ve 13 satırı hâlihazırda elle işaretleniyor; üçünü de elle almak
bugün yalanı bitirir ve şema göçü gerektirmez. A doğrusudur ama oturum akışına
dokunur, pilot öncesi risklidir.

**Kararın etkisi.** B seçilirse föy hiçbir satırında olgu uydurmaz. C seçilirse
resmi takip föyünde "yapıldı" ile "planlandı" ayrımı kurulmamış kalır.

---


### H-10 · 25.08.2026 · P3 — Bayat `akis_hatasi` bildirimleri temizlensin mi?
**Sorun.** Arabulucunun iş panosunda 19–20.08 tarihli **5 adet `akis_hatasi`**
satırı `bekliyor` durumunda duruyor (hepsi tek dosyada: `eb70595a`). Bugün
üçünün de kök nedeni **kodda zaten kapatılmış** durumda:

| bildirim | bugünkü durum |
|---|---|
| `hazirlik-foyu` HTTP 400 "case_id, session_id ve party_id gerekli" | `ZORUNLU_GIRDI` tanımlı + `girdiTamamla` oturum merdiveni yazılmış (24.08 onarımı kodda yorumuyla duruyor) |
| `hazirlik-foyu-gonder` "motora bağlı değil" | `MOTORA_BAGLI` listesinde |
| `hazirlik-foyu-gonder` HTTP 401 "iç çağrı reddedildi" | `x-cron-secret` iç kapısı eklenmiş |

Kalan ikisi zaten hata değil: biri **kasıtlı** canlı fren testi
("Arabulucu akışı durdurdu: canlı fren testi"), biri bilgi notu.

`akis_hatasi` nöbetçinin **yürüttüğü tiplerden değildir** — tasarım gereği
okunana kadar `bekliyor` kalır. Yani bunlar kendiliğinden kapanmaz.

**Seçenekler.**
| | ne yapılır | bedeli |
|---|---|---|
| **A** | Arabulucu panoda kendi kapatır | Kod değişmez; 5 satır arabulucunun karşısında durur |
| B | Kök nedeni kapanmış bayat bildirimler tek SQL ile `yapildi` yapılır | Üretim verisi yazımı (§10 → Cowork); kanıt kaybolmaz, durum değişir |
| C | Nöbetçi, kök nedeni geçmiş `akis_hatasi` satırlarını otomatik kapatır | Ajan davranışı değişir (§13 Human Gate); "hangi hata geçmiş sayılır" kuralını ajanın yorumlamasını gerektirir — kaçınılmalı |

**Önerim: A.** Bunlar arabulucuya yazılmış **bildirimlerdir**; okuyup kapatmak
onun işidir ve sayı beştir. B gerekirse şu tek satırla yapılır (kurucu/Cowork
çalıştırır, Code çalıştırmaz):
`update ajan_gorevleri set durum='yapildi', sonuc='kök nedeni kapatıldı (25.08)' where durum='bekliyor' and gorev_tipi='akis_hatasi' and created_at < '2026-08-21';`

**Kararın etkisi.** A/B'de ürün davranışı değişmez. C seçilirse ajan, insana
yazılmış bir bildirimi insan okumadan kapatma yetkisi kazanır — bu, "ajan
önerir, insan seçer" ilkesinden sapmadır; önermiyorum.


### H-12 · 25.08.2026 · **P1** — Depoda birikmiş öksüz belgeler (KVKK)
**Sorun.** Bugün `dosya-verilerini-sil` kolundaki kök neden kapatıldı (silme
artık depoyu da temizliyor, commit `10a70e6`). Ama **geçmişte birikmiş öksüzler
duruyor** ve onları silmek üretim verisi silmesidir — §7.3 gereği kurucu kararı,
§10 gereği çalıştıran Cowork/kurucudur. Code silmedi, yalnız saydı.

**Sayım (salt okuma, dosya adı/içerik dökülmedi).**
`case-documents` kovası: **149 nesne**, `case_documents`: **24 satır**.

| küme | adet | ne olduğu |
|---|---|---|
| `admin/…` · bilgi tabanında karşılığı **var** | 50 | **normal** — yönetici yüklemesi, `case_documents`ta olmaması doğru |
| `admin/…` · bilgi tabanında karşılığı **yok** | **71** | parçaları silinmiş ama dosyası kalmış yüklemeler. Bir kısmı, bugün düzelttiğim `admin-delete-knowledge` **sessiz depo silmesinin** ürünü olabilir |
| `<uuid>/<case>/…` · `case_documents` satırı **yok** | **6** | **gerçek KVKK öksüzü** — 30.06–01.07, hepsi **artık var olmayan** dosyalara ait; taraf belgeleri kovada duruyor ve hiçbir silme kolu onları bulamaz |
| `case_documents` satırı var, **dosyası yok** | **2** | ters yön: indirme kırılır |

**Neden P1.** Altı öksüz, constitution m.10 (süresiz saklama yasağı) kapsamında
kişisel veri içeriyor ve **hiçbir kayıt onları göstermediği için** bir KVKK
silme talebinde de bulunamazlar. Kök neden kapatıldı; kalan **birikmiş borçtur**.

**Seçenekler.**
| | ne yapılır | bedeli |
|---|---|---|
| **A** | Önce 6 uuid öksüzü silinir (KVKK), 71 admin dosyası ayrıca değerlendirilir, 2 dosyasız satır temizlenir | Geri dönüşü yok; ama zaten hiçbir yüzeyden erişilemeyen veri |
| B | Yalnız 6 uuid öksüz silinir, gerisi durur | KVKK borcu kapanır; bilgi tabanı çöpü kalır |
| C | Hiçbiri silinmez | Kişisel veri süresiz kovada kalır |

**Önerim: A**, ama **sırayla ve ayrı ayrı onaylanarak.** 6 uuid öksüz nettir
(dosyaları yok, erişilemez, kişisel veri). 71 admin dosyası için önce şu
sorulmalı: bunlar yeniden yüklenecek kaynaklar mı, yoksa çöp mü — silmeden önce
`knowledge_base_jobs` geçmişine bakılmalı. 2 dosyasız satır kullanıcıya kırık
indirme gösteriyor; satır silinmeli ya da dosya geri yüklenmeli.

**Kararın etkisi.** C'de kalınırsa altı taraf belgesi kovada süresiz durur ve
bir KVKK talebinde "sildik" demek **doğru olmaz**. A/B geri dönüşsüzdür; bu
yüzden Code kendiliğinden yapmadı.

**Not:** silme komutunu Code yazabilir ama **çalıştırmaz** (§10). Karar
verildiğinde tam komut metni bu maddeye eklenecek.


---

### H-13 · 25.08.2026 · P2 — Taraf katılımı açık rıza ile KAPILANSIN mı?
**Sorun.** Bugün mimari §15.2'nin "aydınlatma metni taraf kayıt ekranında
gösteriliyor" şartı sağlandı: `/katilim/:token` sayfasında KVKK aydınlatması ve
imha politikası artık **karardan önce** görünüyor (commit `0bfcef8`). Şart
"gösteriliyor" dediği için **gösterildi** — katılım engellenmiyor.

Ama ayrı bir soru duruyor: **taraf, "Katılıyorum"a basmadan önce açık rıza
vermeli mi?** Hukuken ikisi farklıdır: *aydınlatma* bilgilendirmedir (KVKK m.10),
*açık rıza* ise onaydır (m.5). Arabuluculuk sürecinin kendi hukuki dayanağı var;
ama tarafın verisinin **yapay zekâ ile analiz edilmesi** ayrı bir işlemdir ve
arabulucu tarafında bunun için ayrı bir "Açık Rıza Beyanı" zaten alınıyor
(`Auth.tsx`). Tarafta alınmıyor.

**Seçenekler.**
| | ne yapılır | bedeli |
|---|---|---|
| **A** | Bugünkü hâl: aydınlatma gösterilir, katılım engellenmez | §15.2 sağlanır; AI analizi için tarafın açık rızası **yok** |
| B | "Katılıyorum" öncesi onay kutusu: rıza verilmeden katılım tamamlanmaz | Hukuken en güvenli; tek dokunuşluk akışa bir adım ekler, katılım oranını düşürebilir |
| C | Rıza ayrı alınır: taraf katılır, AI analizi rızası ilk sohbette istenir | Akış bozulmaz; rıza gelene kadar o tarafın verisi analize girmemeli — **motor tarafında iş gerektirir** |

**Önerim: B** — ama kararı kurucu vermeli, çünkü hukuki sonuç doğurur (§7.2) ve
katılım oranını etkiler. B'nin uygulaması küçüktür: metin zaten
`@/lib/kvkk-metinleri`de tek kaynakta, `KVKK_ACIK_RIZA` hazır duruyor; onay
kutusu + `taraf-katilim` işlevinde rıza damgası yeterli.

**Kararın etkisi.** A'da kalınırsa taraf verisi, tarafın açık rızası olmadan AI
analizine giriyor olur — pilotta bir taraf bunu sorarsa savunulacak dayanak
yalnız aydınlatmadır. B/C'de rıza kaydı denetlenebilir biçimde tutulur.


---

---

## COWORK → CODE

_Cevaplar buraya yazılır. Biçim:_

```
### H-<no> · CEVAP · <tarih>
Seçim: A / B / C / (kendi metniniz)
Not: (varsa)
```

### H-15/1 · CEVAP DEĞİŞTİ · 25.08.2026 — SIFIR SAKLAMA
**Bu blok, aşağıdaki "TEK ÇATI 5 YIL" kararının YERİNE GEÇER. 5 yıl artık geçersizdir.**

**Kurucu kararı:** *"Süreç bitince her şey silinecek. İmzalı tutanaklar hariç —
onları da zaten UYAP'a arabulucu yüklüyor, yani Medipact onları bile tutmayacak."*

Yani ürünün saklama modeli **sıfır saklamadır**: dosya kapandığında dosyaya ait
her şey silinir. Resmî nüsha UYAP'tadır; Medipact arşiv değildir, **çalışma
tezgâhıdır**. Bu, ürünün "kör veri" çekirdeğiyle ve constitution m.10 ile
tam uyumludur ve konumlandırma açısından da güçlüdür.

**CANLIDA UYGULANDI (Cowork, 25.08.2026):** `saklama_sureleri` güncellendi —
`case_documents · case_notes · oturum_kaydi_dokum · dosya_kapanis_sonrasi ·
oturum_kaydi_ses` → **`saklama_gun = 0`**.
`saklama_gun` check kısıtı `> 0` idi, **`>= 0` yapıldı** (0 = "anında/kapanışta
sil" artık ifade edilebiliyor; H-15'te bildirilen kusur kapandı).
`odeme_kayitlari` **şimdilik 3650'de bırakıldı** — aşağıdaki açık soruya bakınız.

**CODE'A: SİLME TETİĞİ KAPANIŞ DEĞİL, ARABULUCUNUN AÇIK EYLEMİDİR.**
Dosya kapanır kapanmaz anında silinirse arabulucu belgeleri indirip UYAP'a
yükleyemeden veriyi kaybeder. Kurulacak akış:
1. Dosya kapanır → veri **henüz silinmez**, ekranda "İmzalı tutanağı indir /
   UYAP'a yükle" adımı görünür.
2. Arabulucu **"Dosyayı kapat ve tüm verileri sil"** düğmesine basar → silinir.
   Bu düğme geri alınamaz olduğu için tek seferlik onay ister.
3. **Emniyet süpürgesi:** arabulucu unutursa kapanıştan N gün sonra otomatik
   silinir (N kurucu onayı bekliyor, öneri 30 gün).
Silme **gerçekten silme** olmalı: depo nesnesi + satır. Tezgâhla kanıtlanacak
(H-14 şart 1'deki gibi).

**`Verilerim.tsx` metni de değişecek:** tarafa artık "5 yıl" ya da "Belirsiz"
değil, **"Süreç bittiğinde silinir"** yazacak. Sabit metinler (`SURE_BELGE`,
`SURE_MALI`, `SURE_ANALIZ`, `SURE_TANIMSIZ`) kaldırılıp tablodan okunacak;
14 kategori ↔ tablo eşlemesi yine kurulacak, "Belirsiz" yazan kategori kalmayacak.

**ÜÇ AÇIK SORU CEVAPLANDI (kurucu, 25.08.2026) — CANLIDA UYGULANDI. TEKRAR SORMA (§7-B).**
1. **Mali kayıt → SİLİNİR.** Gerekçe (kurucu): *"Makbuz bizim sistemimizden
   kesilmiyor, onun için ayrı programlar var; biz ödeme programı da yaparsak
   içinden çıkamayız."* Sistem yalnız **ücret hesabı / dökümü** üretir; makbuz
   için arabulucu **kendi kullandığı programa yönlendirilir** (link), makbuzu
   orada keser. Yani mevzuat gereği saklanması gereken mali kayıt Medipact'te
   **oluşmuyor** → `odeme_kayitlari` dosyayla birlikte silinir.
   **Code'a iş:** ödeme yüzeyinde makbuz kesme YOK; hesap dökümü + dış programa
   yönlendirme linki olacak. Ödeme programı yazılmayacak (§16'ya da geçsin).
2. **Onay kayıtları → KALICI.** Silinmez. Ama **içerik taşımaz**: yalnız kim ·
   ne zaman · hangi metnin hangi sürümü · onay/ret. Beyan, belge, tutar, TCKN,
   adres bu kayda GİRMEZ.
3. **Anonim kapanış istatistiği → KALICI** (varsayım teyit edildi).
4. **Otomatik süpürme → 7 GÜN.** Arabulucu "Dosyayı kapat ve tüm verileri sil"
   derse **anında**; demezse kapanıştan **7 gün** sonra otomatik silinir.
   7 gün, tutanağı indirip UYAP'a yükleme payıdır.

**CANLIDA UYGULANDI (Cowork):** `saklama_sureleri`ye `kalici boolean` kolonu
eklendi (NULL süre ile "kalıcı"yı ayırt etmek için — NULL artık "tanımsız"
demek değil). Son durum:
| veri_turu | saklama_gun | baslangic | kalici |
|---|---|---|---|
| `onay_kayitlari` | NULL | olusturma | **true** |
| `anonim_kapanis_istatistigi` | NULL | olusturma | **true** |
| `case_documents` | 7 | dosya_kapanisi | false |
| `case_notes` | 7 | dosya_kapanisi | false |
| `oturum_kaydi_dokum` | 7 | dosya_kapanisi | false |
| `dosya_kapanis_sonrasi` | 7 | dosya_kapanisi | false |
| `odeme_kayitlari` | 7 | dosya_kapanisi | false |
| `oturum_kaydi_ses` | 0 | olusturma | false |

**Kurucunun sonradan gözden geçirebileceği tek nokta (şimdi iş üretmez):**
kalıcı onay kaydı "kimin onayı" bilgisini taşıyacaksa taraf kimliği de kalıcı
olur. Bu yüzden kimlik alanı **en dar** tutulacak: ad-soyad + dosya numarası.
TCKN, adres, iletişim, beyan bu kayda girmez.

**ESKİ SORU LİSTESİ (cevaplandı, arşiv):**
1. **Ödeme / mali kayıt.** Arabuluculuk ücretine ilişkin mali kayıtta saklama
   yükümlülüğü mevzuattan gelir ve kurucunun feragat edebileceği bir şey
   olmayabilir. Soru: mali kayıt Medipact'te mi kalsın (bugünkü hâl: 10 yıl),
   yoksa o da silinip arabulucunun kendi muhasebesine mi bırakılsın?
   Şimdilik **10 yılda bırakıldı** — silmemek, yanlış silmekten güvenlidir.
2. **Onay kayıtları.** KVKK aydınlatma onayı · YZ kullanım beyanı onayı ·
   oturum kaydı onayı/reddi. Bunlar "usulüne uydum"un ispatıdır. Her şeyle
   birlikte silinirse, sonradan bir şikâyette elde kanıt kalmaz. Silinsin mi,
   yoksa **içeriksiz** (yalnız "şu tarihte onay alındı") bir iz mi kalsın?
3. **Anonim kapanış istatistiği** (veri çarkı, §5.9). İçerik/taraf adı/tutar
   taşımadığı için "veri" sayılmaz ve kazanım sayacının da kaynağıdır.
   **Varsayım: kalır.** Aksi söylenmezse böyle kurulacak.

---
### H-15 · CEVAP · 25.08.2026 — DÖRT KARARIN TAMAMI

**ÖNCE BİR DÜZELTME (Code'a).** H-15'te "tanım yok, tablo yok, kod yok" denen iki
madde için **tanım MİMARİDE ZATEN VAR**; eksik olan yalnız rakam/kalem:
· Üyelik-paket-kota → `mimari/13-uyelik-gelir.md` (paketler: Başlangıç /
  Profesyonel / Merkez lisansı · kota **analiz kotasıdır**, belge üretimi her
  pakette sınırsız · kota bitince yüzey KAPANMAZ, aşım birim ücretiyle devam
  eder · "Dosyaya Soru Sor" da analiz kotasına dahil).
· Kazanım sayacı → `mimari/05-yetenek-envanteri.md` **§5.9** (+ §13 mini anketi).
Bundan sonra "tanımsız" demeden önce bu iki dosya okunacak.

---
**1) SAKLAMA SÜRELERİ — ⛔ BU MADDE GEÇERSİZ. Yukarıdaki "SIFIR SAKLAMA" bloğu
yerine geçti. Aşağıdaki 5 yıl metni yalnız tarihçe içindir, UYGULANMAYACAK.**
~~Seçim: A — TEK ÇATI, 5 YIL.~~
Not: Code'un önerdiği **1 yıl REDDEDİLDİ.** Gerekçe: `src/pages/Verilerim.tsx`
tarafa **zaten** "dosya kapanışından sonra 5 yıl" gösteriyor ve `mimari §12.5.9`
da 5 yıl diyor. 1 yıl yazılsaydı aynı ekranda belge 5 yıl / beyan 1 yıl görünür,
tutarsız olurdu.
**Karar:** dosya kapanışı + **5 yıl** (1825 gün) — `oturum_kaydi_dokum` ·
`case_documents` · `case_notes` · `dosya_kapanis_sonrasi`.
Mali kayıt **10 yıl** (3650 gün) — ekranda zaten öyle yazıyor.
Ham ses: kodda anında silinir, süre alanı NULL kalır.

**SQL COWORK TARAFINDAN ÇALIŞTIRILDI (25.08.2026).** `saklama_sureleri` tablosu
kuruldu, RLS açık, iki politika (`select` herkes · `all` yalnız admin) canlı,
6 satır girildi ve **değerler yazıldı.** Doğrulama koşuldu:
`case_documents 1825 · case_notes 1825 · dosya_kapanis_sonrasi 1825 ·
oturum_kaydi_dokum 1825 · odeme_kayitlari 3650 · oturum_kaydi_ses NULL` —
hepsi `baslangic = dosya_kapanisi` (ses hariç).

**Code'a kalan üç iş (kurucuya sorma, yap):**
1. `Verilerim.tsx` sabit metin kullanıyor (`SURE_BELGE`, `SURE_TANIMSIZ` …);
   **tabloyu okuyacak** hâle getirilecek. Ekrandaki **14 kategori** ile tablodaki
   **6 tür** birebir değil → eşleme haritası kurulacak, eşleşmeyen kategori
   kalmayacak. Bugün 10 kategoride tarafa "Belirsiz" yazıyor; bu **bitmeli**.
2. `saklama_gun` check kısıtı `> 0` olduğu için **0 gün (anında silme)
   yazılamıyor**. Ya kısıt `>= 0` yapılsın ya da ayrı bir "anında" bayrağı
   eklensin — `oturum_kaydi_ses` bugün bu yüzden NULL duruyor.
3. Periyodik imha kolu bu tablodan okuyacak şekilde kurulacak. **NULL süre =
   dokunma** kuralı korunur.

**Kurucuya AYRI SORULACAK (pilotu bloklamaz):** Kör teklif ve kabul aralığı
(braket) 5 yıl mı saklansın, yoksa dosya kapanışında **silinsin** mi? Ürünün
"kör veri" çekirdeğiyle silme daha tutarlı olabilir. Parametre tablosunda tek
satır değişikliği olduğu için deploy gerektirmez; şimdilik 5 yıl çatısındadır.

---
**2) ARABULUCUNUN ANTETİ · Seçim: A.**
Antet (logo + büro adresi) `profiles`a eklenir ve üretilen belgelerin başlığına
basılır. Şablon **genel kalır** (arabulucuya özel şablon YOK).
Canlıda doğrulandı: `profiles`ta `iban` ve `banka_adi` **var**, `logo_url` ve
`adres` **yok** → göç gerekiyor. `src/pages/Profile.tsx` bugün yalnız Ad Soyad ·
Telefon · E-posta gösteriyor; yeni alanlar oraya eklenecek (dosya yükleme ile
logo, serbest metin ile adres; sicil no isteğe bağlı).

---
**3) ÜYELİK / PAKET / KOTA · Seçim: kurucunun onayıyla —
SAYAÇ ÇALIŞSIN, ENGEL OLMASIN.**
Pilot 3 ay ücretsiz olduğu için kota kimseyi engellemeyecek. Ama tüketim
**sayılacak**: paket fiyatı ve kotaya dahil analiz adedi ancak pilot verisiyle
doğru konur (§13 zaten "platform içi otomatik kullanım sayaçları" diyor).
**Code'a kalan:** analiz koşumlarını (Dosyaya Soru Sor dahil) arabulucu bazında
sayan bir tüketim tablosu + `/admin` ekranında "kim kaç analiz tüketti" listesi.
**YAPILMAYACAK:** paket/fiyat ekranı, kota engeli, aşım ücreti mekanizması,
ödeme entegrasyonu. Bunlar **pilot sonrası**. Fiyat rakamları kurucuda.
Bu seçimle madde **pilot kapısından düşer**.

---
**4) KAZANIM SAYACI · Seçim: B — KALEM KALEM.**
Tanım §5.9'da yazılı; buradaki karar yalnız **neyin** süresinin sorulacağı.
Takvim süresi KULLANILMAYACAK (taraf 3 hafta cevap vermezse sayaç eksi gösterir).
Formül: **üretilen çıktı sayısı × arabulucunun kendi beyan ettiği elle süre.**
Kayıt ekranında (`/auth`, arabulucu kaydı) **bir kez** üç soru sorulur:
1. Anlaşma belgesi / son tutanak hazırlamak elle kaç saat sürüyordu?
2. Dosya analizi + takip föyü çıkarmak elle kaç saat sürüyordu?
3. Taraf beyanlarını yapılandırmak / özetlemek elle kaç saat sürüyordu?
Katsayıyı **biz koymuyoruz** — rakam arabulucunun kendi beyanı. Ekranda hesabın
kendisi görünür ("kendi verdiğiniz 2 saat × 6 belge = 12 saat") → §15.1 camdan
kutu şartı böyle sağlanır. Sayaç yalnız **süre + işlem tipi** tutar; dosya
içeriği, taraf adı, tutar sayaca GİRMEZ (§14, constitution m.1).
Arabulucu kendi sayacını `/dashboard`ta görür; kurucu `/admin`de anonim toplamı.
**KURUCU TALİMATI: bu madde pilot ÖNCESİ yapılacak, atlanmayacak.**
Gerekçe: baz çizgi kayıt anında alınır — pilot arabulucuları baz çizgi
sorulmadan kaydolursa kazanım rakamı bir daha geriye dönük kurulamaz.

---
### SQL ÇALIŞTIRILDI · COWORK · 25.08.2026
`tests/gecici/oturum-kayitlari-politika.sql` **canlıda çalıştırıldı** (Cowork,
Lovable MCP `query_database`, kurucu izniyle).
Doğrulama koşuldu: `pg_policies`'te tek satır, `cmd = INSERT`, `roles =
{authenticated}`, `with_check` dosyadaki metnin aynısı. Okuma politikası
EKLENMEDİ — kova okumaya kapalı.
**Uyarı:** PostgreSQL 63 karakter sınırı nedeniyle politika adı kısaldı:
canlıdaki ad `Sesli not: yalnız dosyanın arabulucusu kendi klasörüne yük`
(sondaki "ler" düştü). Testte/aramada tam ada göre eşleşme yapılıyorsa
`like 'Sesli not%'` kullanılmalı.
Kova durumu: `oturum-kayitlari` var ve `public = false`. `is_case_mediator(_case_id
uuid, _user_id uuid)` mevcut.
Sıradaki: sesli not hattının canlıda gerçek yüklemeyle doğrulanması.

### H-14 · CEVAP · 25.08.2026
Seçim: **B** — yalnız arabulucunun kendi sesli notu.
Not: Taraf sesi **hiçbir koşulda** kaydedilmez ve bu bir söz değil **TEKNİK
KISIT** olarak kurulur: kod taraf ses akışına erişemesin.
Üç şart — bu üçü kurulmadan hat canlıya ÇIKMAZ:
1. Ses dosyası metne çevrildiği **an silinir**; saklanan şey yalnız metindir.
   Silmenin gerçekleştiği **tezgâhla kanıtlanır**.
2. Aydınlatma metnine sesli not işlemesi eklenir (hangi hizmete gidiyor, ne
   kadar kalıyor, ne zaman siliniyor). Metin `src/lib/kvkk-metinleri.ts`
   içinde **tek yerde** durur.
3. Arabulucu sesli notu açmadan önce **tek seferlik bir onay** görür.

### H-11 · CEVAP · 25.08.2026
Seçim: **A** — YEDEK sürüm geri kuruldu (kurucu PowerShell'den yaptı).

### H-1 · CEVAP · 24.08.2026
Seçim: **A** — runbook ile yenilenir.
Not: **BU MADDE CODE'A AİT DEĞİLDİR.** Yeni sırrı kurucu üretir ve girer; Code
değeri görmez, üretmez, okumaz, hiçbir çıktıya yazmaz. Code'un tek işi: kurucu
"yenilendi" dediğinde 3 dk sonra `net._http_response` son üç satırının 200
döndüğünü doğrulamak ve sonucu `tasks/todo.md`ye yazmak. Doğrulanana kadar madde
açık kalır. Kesinti bir nöbetçi turudur, kabul edilmiştir.

### H-2 · CEVAP · 24.08.2026
Seçim: **A** — ıslak imza.
Not: Pilot için doğru olan bu. Türk arabuluculuk pratiğinde ıslak imza
yerleşiktir, hukuki dayanağı tartışmasızdır ve mevcut belge akışına oturur.
B'nin (uygulama içi tıklama) hukuki değeri tartışmalı; tutanağa ayrı dayanak
gerektirir ve o dayanak yazılmadan kullanılamaz. C (nitelikli e-imza) pilot
sonrası kalemidir — kurumsal aşamada yeniden değerlendirilir.
Uygulama sınırı: `signed_by` yalnız arabulucunun kendi oturumuyla yazılır;
cron/akış çağrısı reddedilir (imza beş insan kapısından biridir).

### H-3 · CEVAP · 24.08.2026
Seçim: **A** — kod dosyaları silinir, tablolar durur.
Not: Tuzağın kaynağı kod; tablo silmenin acelesi yok ve geri dönüşü yok (§7.3).
Silme öncesi tek şart: dört dosyanın gerçekten hiçbir yerden çağrılmadığı
taramayla kanıtlansın ve kanıt `tasks/todo.md`ye yazılsın. Silinen dosyalar
`tasks/lessons.md`ye tek satırla işlensin — 24.08'de üç tur kaybettiren tuzağın
kaydı kalsın.

### H-4 · CEVAP · 24.08.2026
Seçim: **A** — kayıt hattı yazılırken yol düzeni belirlenir, sonra dar politika.
Not: Ama hattı yazan **C'yi varsayılan kabul etsin.** Rıza metni "kayıt ve dökümü
YALNIZ arabulucu görür" diyor; imzalı bağlantı bu sözü mimariyle tutar, istemci
politikası ise her genişlemede sözü riske atar. Yani: yol düzeni belirlendiğinde
önce C denensin, C çalışmıyorsa dar politika yazılsın ve neden C'nin
yetmediği tek satırla kaydedilsin.

### H-5 · CEVAP · 24.08.2026
Seçim: **A** — tetikleyici kaldırılır, uyandırma `[kol:…]` yoluyla sürer.
Not: İki uyandırma yolu birden olması mükerrer koşum riskidir; çalışan olan
korunur. Kaldırmadan önce `soru_cevaplandi` olayına bağlı gerçekten hiçbir kural
ve tüketici olmadığı doğrulansın. Birikmiş 10 satır **silinmez** — işlenmiş
olarak durur.

### H-6 · CEVAP · 24.08.2026
Seçim: **B** — belirsiz öbeğin tamamına guard uygulanır. (Code'un önerisi A'dır;
gerekçeyle ayrılıyorum.)
Not: Soru "tablo `party_id` taşıyor mu" değil, **"bu yüzey arabulucuya mı ait"**
olmalı. Belirsiz öbekteki 13 tablonun çoğu doğası gereği MEDIATOR_ONLY:
`arabulucu_talimatlari` (arabulucunun kendi talimatları), `usul_onerileri` ve
`usul_engelleri` (arabulucuya sunulan usul değerlendirmesi), `dosya_kapanis`,
`elverislilik_kontrol`, `bilirkisi_evrak_kumesi` (§14: tarafa yalnız BAŞLIK
düzeyinde açılır), `bilirkisi_raporlari`, `bilirkisi_onerileri`,
`kayit_onay_talepleri`, `ajan_kosum_izi`, `ajan_onerileri`, `ajan_deneyim`,
`akis_duraklatma`. Bir tarafın bunları görmesi karşı taraf sızıntısı değildir
ama **arabulucu-özel yüzeyin tarafa açılmasıdır** — §14'te ayrıca yasaklı.

A'nın bıraktığı 13 açık yüzey, kapattığı 4'ten daha risklidir.

B'nin "self-servis sahip kendi dosyasında ajan kayıtlarını göremez" bedeli bir
işlev kaybı değil, **doğru davranıştır**: mimaride arabulucu zorunlu kapıdır
(§2 Aşama 3/4), sahip-taraf hiçbir aşamada arabulucu düzeyi analiz görmemelidir.

Uygulama şartı: B uygulanırken dosya YÖNETİMİ sahipte kalmaya devam eder
(`case_parties` ekleme/silme, `cases_private_keys`, `cases_vector_pool` —
dokunma). Bir tabloda guard gerçekten çalışan bir yolu kırıyorsa o tablo
istisna edilir ve **gerekçesi tek satırla `tasks/todo.md`ye yazılır**; sessiz
istisna yok. Uygulama sonrası self-servis akışı canlıda uçtan uca test edilir.

---

## ARŞİV — kapanmış maddeler
### H-19 · KAPANDI · 27.08.2026 — SEÇENEK A UYGULANDI, 6 BELGE SİLİNDİ
**Kurucu kararı: A** — "6'sını hemen sil, 71 bilgi tabanı dosyasını ayrı ele al."

**YAPILDI VE DOĞRULANDI.** Altı öksüz belge `case-documents` kovasından **depo
API'siyle** silindi (`storage.from("case-documents").remove([...])`); SQL ile
`storage.objects` satırı silme yoluna hiç gidilmedi — o yol satırı götürür,
dosyayı S3'te bırakır ve düzeltmeye çalıştığımız kusurun tersini üretirdi.

**KANIT (ajanın raporu değil, Code'un kendi ölçümü):**

| ölçüm | önce | sonra |
|---|---|---|
| kovadaki toplam nesne | 149 | **143** (tam 6 azaldı) |
| "dosya belgesi" öksüzü | 6 | **0** |
| `admin/knowledge/` öksüzü | 71 | 71 (dokunulmadı) |

**Geçici araç geride bırakılmadı.** Silme, tek seferlik bir edge function ile
yapıldı ve iş biter bitmez kaldırıldı; doğrulandı: fonksiyona çağrı **404
`NOT_FOUND`** dönüyor. Yani arkada "keyfi depo yolu silen" bir uç kalmadı.

---

**YAN BULGU — ve bu maddenin asıl kazancı: ÖKSÜZ ÜRETİMİ HÂLÂ SÜRÜYORDU.**
Madde açılırken "kusur 25–26.08'de kapatıldı, yeni öksüz üretilmiyor" yazmıştım.
**Bu yanlıştı.** Kapatılan yalnız SİLME kollarıydı; **yazma kolu** hâlâ öksüz
üretiyordu:

`admin-upload-knowledge` dosyayı **en başta** depoya yüklüyor, sonra metni
çıkarıp parçalıyordu. Çıkarma / parçalama / embedding başarısız olunca işlev
hata dönüyor, ama **dosya depoda kalıyordu**. Hiçbir `knowledge_base_chunks`
satırı onu göstermediği için:
- `/admin` bilgi tabanı listesi **parçalardan** üretilir → dosya **ekranda hiç
  görünmez**, kurucu onu silemez bile;
- `admin-delete-knowledge` yalnız `source_url`u bilinen dosyayı siler;
- yani dosya süresiz kalır → constitution m.10.

**Düzeltildi (commit `fe9baef`):** yol baştan hesaplanıyor, dosya **en son**,
parçalar yazıldıktan sonra yükleniyor. Ters sıranın en kötü hâli artık "kayıt
var, dosya yok" — bu **görünür ve silinebilir** bir durumdur, üstelik yükleme
hatası zaten ölümcül sayılmıyordu; artık çağırana `uyari` alanıyla bildiriliyor.
Cevaba `surum: "2026-08-27-yukleme-sonda"` eklendi ki dağıtım dışarıdan
doğrulanabilsin.

Kural tek cümleyle: **dosyayı gösteren kayıt, dosyanın kendisinden önce var
olmalı ve ondan sonra yok olmalıdır.** Silerken önce dosya gider, yazarken en
son dosya gelir — `saklama-imha`daki "önce depo, sonra satır" kuralının aynadaki
hâli. `tests/bilgi-yukleme-oksuz.test.ts` bunu kilitliyor ve **ısırdığı
kanıtlandı** (eski sıra geri konunca iki denetim de kırmızı yandı).

Doğrulama: `npm run test` **370/370** · `tsc --noEmit` temiz.
Kalan 71 dosya **H-20**'ye devredildi.

### H-19 · 27.08.2026 · **P0 (KVKK)** — Depoda 6 öksüz belge SİLİNMİŞ dosyalara ait

**SORUN.** `case-documents` kovası bugün ilk kez satır satır depoyla
karşılaştırıldı. Kovada, hiçbir tabloda karşılığı olmayan **77 dosya** var:

| küme | adet | ne |
|---|---|---|
| dosya klasörleri | **6** | tarafların yüklediği belgeler — **dosyaları `cases` tablosunda ARTIK YOK** |
| `admin/knowledge/` | **71** | bilgi tabanı PDF'leri; hiçbir `knowledge_base_chunks` satırı işaret etmiyor |

**AĞIR OLAN 6 TANESİ.** Altısının da dosyası silinmiş, ama belgeler kovada
duruyor. İçerik kişisel veridir — dosya adlarından görülüyor: bordro, puantaj,
ücret pusulası, **kıdem tazminatı bordrosu** ve **bir kişinin adı-soyadı**.
30.06–01.07.2026'da yüklenmişler.

Bu, ürünün kendi kuralının çiğnendiği yerdir: H-15/1 "süreç bitince dosyaya ait
her şey silinir" diyor, constitution m.10 süresiz saklamayı yasaklıyor. Dosya
silindi, belge kaldı; kaldığı için de **hiçbir silme kolu onu bir daha
bulamaz** — sahibini gösteren satır yok.

**KUSURUN KENDİSİ ZATEN KAPATILDI.** Bunlar 25–26.08'de düzeltilen "önce satır,
sonra depo" kusurunun **geride bıraktığı birikimdir**; yeni öksüz üretilmiyor
(`dosya-verilerini-sil`, `saklama-imha` ve `CaseRoom.deleteMyDoc` artık önce
depoyu temizliyor). Kalan iş yalnız **birikmiş 77 dosyanın süpürülmesidir.**

**NEDEN SANA GELDİ.** Silme geri dönüşsüzdür (§7.3). Politika zaten
kararlaştırılmış durumda (H-15/1 · m.10); sorduğum şey politika değil,
**bu 77 dosya üzerinde silmeyi çalıştırma izni**.

**SEÇENEKLER.**
- **A · 6'sını hemen sil, 71'ini ayrı ele al.** Altısı KVKK kapsamında ve
  sahipsiz; bekletmenin savunulabilir bir gerekçesi yok. Bilgi tabanı
  dosyaları kişisel veri değil (hukuk literatürü), acelesi yok.
- **B · 77'sini birlikte sil.** Tek koşumda kova tamamen temizlenir.
- **C · Şimdilik hiçbiri silinmesin**, pilottan sonra ele alınsın.

**ÖNERİM: A.** Altı dosya KVKK riski taşıyor ve bekleyerek hiçbir şey
kazanılmıyor — üstelik pilotta ilk denetim sorusu tam burası olur. 71 bilgi
tabanı dosyası ise "gerçekten artık gerekmiyor mu" sorusunu hak ediyor:
50'si hâlâ chunk'larla bağlı, silinecek olanlar bağsız olanlar; yanlışlıkla
silinirse yeniden yüklenebilir ama emek ister.

**KARARIN ETKİSİ.** A ya da B seçilirse taraf belgeleri geri getirilemez —
zaten dosyaları silinmiş olduğu için ürün açısından erişilebilir değiller.
C seçilirse kişisel veri sahipsiz biçimde kovada beklemeye devam eder ve
KVKK/m.10 uyumsuzluğu pilot boyunca açık kalır.

**NASIL ÇALIŞTIRILIR (Code hazırladı, koşmadı).** Silinecek yolların tam
listesi ve dökümü `tests/sabit/oksuz-belge-supurgesi.sql` dosyasındadır;
önce **kuru döküm** alınır (hiçbir şey silmez), liste gözle onaylanır, sonra
silme koşulur. Depo nesnesi SQL ile değil **depo API'siyle** silinmelidir;
aksi hâlde satır gider, dosya kalır — yani aynı kusurun tersi üretilir.


### H-18 · KAPANDI · 27.08.2026 — NÖBETÇİNİN SİLME KOLU KALDIRILDI, CANLI KANITLI
Kurucu kararı uygulandı: `ajan-nobetci` artık oturum kaydı **silmiyor**.
Silmenin tek yetkilisi `saklama-imha`dır ve süreyi yalnız `saklama_sureleri`
tablosundan okur.

**Ne kaldırıldı:** `kayitSilmeKollari` işlevi, `KAYIT_BUCKET` sabiti, çağrı yeri
ve iki sayaç (`ses_kaydi_silindi` · `dokum_silindi`). Kapanışta döküm silen kolun
yanında, sesi kapanıştan **24 saat** sonra silen kol da gitti: aynı kural — bir
veri türünün süresine **tek yerden** karar verilir — onu da kapsıyor. Yerine,
hangi kolun neyi ne zaman sildiğini yazan bir gerekçe bloğu bırakıldı.

**Değişmeyen istisna:** ham ses metne çevrilir çevrilmez `sesli-not-dokum`
tarafından silinmeye devam ediyor (H-14 şart 1); 7 güne tabi değildir.

**CANLI KANIT (Code kendi aldı).** Nöbetçi 3 dakikada bir koşuyor; cevabındaki
sayaçların varlığı sürüm imzası olarak kullanıldı:

| koşum (UTC) | `ses_kaydi_silindi` / `dokum_silindi` alanı |
|---|---|
| 08:48 · 08:51 · 08:54 | **VAR** (eski sürüm) |
| **08:57** | **YOK** (yeni sürüm çalışıyor) |

Yani dağıtım gerçekten indi — 26.08'de H-17'de yaşanan "publish ettim ama edge
function eskide kaldı" durumu bu kez doğrudan ölçüldü.

**Tezgâh kilidi:** `tests/saklama-imha.test.ts` içindeki
"H-18 · nöbetçi oturum kaydı SİLMİYOR" bölümü, nöbetçi gövdesinde
`dokum_silindi_at` · `ses_silindi_at` · `oturum-kayitlari` · 24 saatlik süre
sabiti **arar ve bulunmamasını şart koşar**; kolun sessizce geri gelmesini
engeller. Kova sürüklenme kilidi de nöbetçiden, kovayı gerçekten kullanan
yüzeylere taşındı (`sesli-not-dokum` ↔ `saklama-imha`).

Doğrulama: `npm run test` **363/363** · `tsc --noEmit` temiz · commit `5527fff`.
Genel kural `tasks/lessons.md`ye yazıldı.

### H-18 · CEVAP · 26.08.2026 — TEK KURAL: 7 GÜN. NÖBETÇİ KAPANIŞTA SİLMEYECEK.
Seçim: **`saklama-imha` haklı, `ajan-nobetci` düzeltilecek.**

Gerekçe kurucunun kendi cümlesidir: 7 gün **UYAP payıdır** — arabulucu imzalı
tutanağı indirip UYAP'a yükleyecek kadar zamanı olsun diye kondu. Dökümü
kapanıştan ~3 dakika sonra silen bir kol o payı fiilen sıfırlar; kararı
uygulamış olmaz, deler.

**Uygulanacak:**
- `ajan-nobetci`nin dosya kapanışında döküm silen kolu **kaldırılacak** (ya da
  yalnız `saklama_sureleri`ne bakacak hâle getirilecek). Kapanış anında silme yok.
- Silmenin tek yetkilisi `saklama-imha`dır: kapanış + 7 gün, ya da arabulucu
  **"Dosyayı kapat ve tüm verileri sil"** derse anında.
- **İSTİSNA DEĞİŞMEDİ:** ham ses metne çevrilir çevrilmez silinmeye devam eder
  (H-14 şart 1). Bu 7 güne tabi değildir.
- Genel kural: bir veri türünün kaç gün tutulacağına **tek yerden** karar verilir
  (`saklama_sureleri`); başka hiçbir kol kendi süresini kendi taşımaz. Bunu
  `tasks/lessons.md`ye yaz — bugün iki kol iki ayrı kararı uyguluyordu.

### H-18 · 26.08.2026 · P1 — Oturum dökümü için "7 günlük UYAP payı" pratikte YOK
**Sorun.** Bugün H-16'da şöyle dediniz: *"Otomatik süpürme 7 gün: arabulucunun
tutanağı indirip UYAP'a yükleme payı."* `saklama_sureleri` de buna uyuyor:
`oturum_kaydi_dokum = 7 gün · dosya_kapanisi`.

Ama **başka bir kol daha aynı veriyi siliyor** ve o kol beklemiyor.
`ajan-nobetci` → `kayitSilmeKollari`: *"Döküm: süreç bittiğinde (son tutanakla
birlikte) silinir."* Dosya `agreed`/`failed` olur olmaz `dokum_metni` boşaltılıyor
ve nöbetçi **3 dakikada bir** koşuyor. Yani oturum dökümü için 7 gün değil,
**yaklaşık 3 dakika** var. `saklama-imha`nın 7 günlük kolu o satırlara vardığında
`dokum_silindi_at` çoktan dolu olduğu için hiçbir şey yapmıyor — 7 gün **hiç
yürürlüğe girmiyor.**

Bu bir kod hatası değil: iki kol iki ayrı kararı uyguluyor. Eski karar (İBA 1.8 /
B18: "döküm süreç sonuna kadar durur, süreç bitince silinir") nöbetçide;
25–26.08 kararı ("7 gün pay") parametre tablosunda. **Hangisi geçerli, sizin
kararınız** — ve nöbetçinin davranışını değiştirmek §13 gereği zaten size ait.

**Not:** bu yalnız **oturum dökümünü** ilgilendirir. Resmî tutanak/belge ayrı
üretilir ve bu koldan silinmez; ses zaten metne çevrilir çevrilmez siliniyor ve
o doğru çalışıyor (denetlendi).

**Seçenekler.**
| | ne yapılır | sonucu |
|---|---|---|
| **A** | Nöbetçinin döküm kolu **7 günü bekler** (parametre tablosundan okur, kodda sabit tutmaz); silme tek kolda, `saklama-imha`da toplanır | Söylediğiniz "UYAP payı" gerçekten oluşur; saklama süresi tek yerden yönetilir |
| B | Parametre 0 güne çekilir; nöbetçinin bugünkü davranışı **doğru** kabul edilir | Çelişki biter, ama döküm kapanışta anında gider — indirilmemişse gitmiştir |
| C | Bugünkü hâl | Tabloda "7 gün" yazar, gerçekte ~3 dakikadır; kayıt gerçeği anlatmaz |

**Önerim: A.** Sebebi ürün değil, sizin bugünkü gerekçeniz: pay **niye** kondu?
Arabulucu tutanağı indirip UYAP'a yükleyebilsin diye. Kapanışta anında silinirse
o pay hiç kullanılamaz — dosya kapandığı an arabulucu ekranı kapatmışsa döküm
gitmiştir. A ayrıca saklama süresini **tek kaynağa** (parametre tablosu) bağlar;
bugün iki kol iki ayrı kural uyguluyor ve bu tür ikilik bu hafta üç kez kusur
üretti.

**Kararın etkisi.** A seçilirse `ajan-nobetci`nin **runtime davranışı** değişir
(§13) — Code kendiliğinden yapmaz, onayınızla yapar; kişisel veri **daha uzun**
durur (kapanış + 7 gün), bu bir KVKK kararıdır. B seçilirse veri daha kısa durur
ama "UYAP payı" sözü kayıttan çıkarılmalıdır. C seçilirse `saklama_sureleri`
tablosu gerçeği anlatmayan bir değer taşımaya devam eder.

---

### H-17 · KAPANDI · 27.08.2026 — YENİDEN DAĞITILDI, KURU KOŞUM DOĞRULADI
`saklama-imha` Lovable'dan yeniden dağıtıldı (commit `b48e669`) ve cevabına
kalıcı bir **sürüm imzası** eklendi: `surum: "2026-08-26-kolon-depo"`. Maddeyi
bir gün açık tutan şey tam da bu eksikti — hangi sürümün koştuğunu dışarıdan
okuyamadığımız için "temiz/kuru" etiket farkı üzerinden dolaylı çıkarım yapmak
zorunda kalınmış ve yanlış sonuca varılmıştı.

Yeni kuru koşum (Code kendi aldı · istek **11612** · HTTP **200**):

```
{"ok":true,"surum":"2026-08-26-kolon-depo","kuru":true,"toplam_silinen":0,
 "sonuc":[{"tur":"oturum_kaydi_ses","durum":"temiz","silinen":0},
          {"tur":"oturum_kaydi_dokum","durum":"temiz","silinen":0},
          {"tur":"case_documents","durum":"temiz","silinen":0},
          {"tur":"case_notes","durum":"kuru","silinecek":0},
          {"tur":"dosya_kapanis_sonrasi","durum":"atlandı", ...},
          {"tur":"odeme_kayitlari","durum":"kuru","silinecek":0},
          {"tur":"onay_kayitlari","durum":"atlandı", ...},
          {"tur":"anonim_kapanis_istatistigi","durum":"atlandı", ...}]}
```

Üç türün üçü de **`"temiz"`** — kabul kriteri karşılandı.

**03:00 UTC koşumu bu arada oldu ve zararsızdı.** jobid 21 bugün 03:00'te koştu
(runid 11465, `succeeded`), **eski kodla**, ve H-17 cevabında güvenli sayılan
tam o 5 satırı sildi (`case_notes` 1 + `odeme_kayitlari` 4 · 16–18.07 tarihli
DENEME dosyaları). O cevapta `surum` alanı **yoktu**: eski sürümün koştuğunun
kesin kanıtı. Eski kodun tehlikeli kolu — `oturum_kayitlari` **satırı** silme —
hiç tetiklenmedi, çünkü tablo 0 satırdı. Bu yüzden `case_notes` ve
`odeme_kayitlari` yeni kuru koşumda 1/4 değil **0/0** görünüyor.

**Ders (`lessons.md`ye yazıldı):** bir edge function'ın canlı sürümü, cevabının
içinde taşıdığı bir imzayla okunabilmelidir. Davranış farkından sürüm çıkarmak
— "bu dize yeni kodun imzası" — 26.08'de yanlış sonuç verdi: o dize eski kodda
da vardı.

### H-17 · CEVAP · 26.08.2026 — KURU KOŞUM ÇALIŞTIRILDI, BEKLENENLE UYUŞUYOR
Cowork `tests/gecici/saklama-imha-kuru-kosum.sql`'i canlıda çalıştırdı
(Lovable MCP · istek no 11402). **HTTP 200.** Cevabın tamamı:

```
{"ok":true,"kuru":true,"toplam_silinen":0,"sonuc":[
 {"tur":"oturum_kaydi_ses","durum":"kuru","silinecek":0},
 {"tur":"oturum_kaydi_dokum","durum":"kuru","silinecek":0},
 {"tur":"case_documents","durum":"kuru","silinecek":0},
 {"tur":"case_notes","durum":"kuru","silinecek":1},
 {"tur":"dosya_kapanis_sonrasi","durum":"atlandı","sebep":"bu tür başka bir kolun işi (dosya-verilerini-sil)"},
 {"tur":"odeme_kayitlari","durum":"kuru","silinecek":4},
 {"tur":"onay_kayitlari","durum":"atlandı","sebep":"süre girilmemiş"},
 {"tur":"anonim_kapanis_istatistigi","durum":"atlandı","sebep":"süre girilmemiş"}
]}
```

**Sayılar beklediğinin aynısı:** `case_notes 1` · `odeme_kayitlari 4` ·
diğer hepsi 0 · `toplam_silinen 0` · `uyarilar` alanı YOK.

**TEK FARK (kusur değil, not):** beklenen dökümde `oturum_kaydi_ses`,
`oturum_kaydi_dokum` ve `case_documents` için `"temiz"` öngörülmüştü; canlı cevap
`"kuru", silinecek: 0` döndürdü. Sayı aynı, yalnız durum etiketi farklı —
`"temiz"` yolu ancak süresi dolmuş kapalı dosya HİÇ yokken yazılıyor. Beklenti
metnini düzeltmek yeter.

**Dağıtım sorusu (senin doğrulayamadığın kısım):** cevabın biçimi 26.08
düzeltmesinin canlıda olduğunu gösteriyor — `dosya_kapanis_sonrasi` için
"bu tür başka bir kolun işi" gerekçesi yeni sürümün imzasıdır. Bunu kanıt say.

> **⛔ CODE NOTU · 27.08.2026 — BU ÇIKARIM YANLIŞ; CANLIDA ESKİ KOD DURUYOR.**
> Dayanılan dize **yeni sürümün imzası değil**: `"bu tür başka bir kolun işi
> (dosya-verilerini-sil)"` **eski kodda da vardı** (`git show HEAD~7:
> supabase/functions/saklama-imha/index.ts` → 1 eşleşme). Ayırt edici olarak
> H-17'de **başka bir şey** verilmişti ve cevap onu net biçimde söylüyor:
>
> | tür | canlı cevap | yeni kod ne derdi |
> |---|---|---|
> | `oturum_kaydi_ses` | `"kuru", silinecek: 0` | `"temiz", silinen: 0` |
> | `oturum_kaydi_dokum` | `"kuru", silinecek: 0` | `"temiz", silinen: 0` |
> | `case_documents` | `"kuru", silinecek: 0` | `"temiz", silinen: 0` |
>
> Yeni kolda 0 satır bulunduğunda `bekleyen.length === 0` dalı çalışır ve
> **`"temiz"`** yazılır; `"kuru"` etiketi yalnız eski koddaki sayım dalından
> çıkar. Üç türün üçü de aynı şeyi söylüyor. Yani **ön yüz publish'i edge
> function'ı yenilememiş** — §11-B'nin kendi uyarısı doğru çıktı.
>
> **Bu, cevabın "temiz/kuru yalnız etiket farkı, beklenti metnini düzeltmek
> yeter" değerlendirmesini de geçersiz kılar:** etiket farkı bir yazım
> ayrıntısı değil, **hangi sürümün koştuğunun göstergesiydi.**
>
> **Tehlike var mı: BUGÜN YOK.** Eski kol `oturum_kayitlari` **satırlarını**
> siler, ama o tablo canlıda **0 satır**. 03:00 UTC koşumunda silinecek 5 satır
> (1 not + 4 ödeme) her iki sürümde de aynıdır ve deneme verisidir.
> **Tehlike, pilotta ilk gerçek oturum kaydı tutulduğu an başlar.**
>
> **KALAN İŞ (bir sonraki oturumun İLK işi):** `saklama-imha` yeniden dağıtılıp
> kuru koşum **tekrar** alınacak; üç tür `"temiz"` dönene kadar madde kapanmaz.
> Bu yüzden H-17 **ARŞİV'e taşınmadı.**

**SONUÇ: yarın 03:00 UTC koşumu güvenli.** Silinecek 5 satır 16–18.07 tarihli
DENEME dosyalarına ait (MP-2026-1011 · MP-2026-1014); Cowork bunu `cases`
tablosundan ayrıca doğruladı, gerçek dosya yok. Cron'a dokunulmayacak.

### H-17 · 26.08.2026 · P1 — `saklama-imha` kuru koşumu (tek komut, HİÇBİR ŞEY SİLMEZ)
**Ne gerekiyor.** `tests/gecici/saklama-imha-kuru-kosum.sql` dosyasındaki iki
sorguyu Lovable SQL ile çalıştırıp cevabı buraya yapıştırmak. Gövde
`{"kuru": true}` — kol yalnız **sayar**, silmez.

**Neden Code yapamıyor.** Kol `x-cron-secret` istiyor; sır Vault'ta ve Code sır
okumaz/SQL çalıştırmaz (§10, §12). Sorgu sırrı düz metne dökmez, Vault'tan okur.

**Neden şimdi.** Kolun davranışı bugün **değişti** (satır silme → kolon boşaltma
+ depo temizliği; iki P0 kusur düzeltildi, commit'te ayrıntısı var). Cron
**27.08 03:00**'te ilk kez gerçekten koşacak. 25.08 dersi: bir silme kolu
koşmadan önce kuru koşum zorunludur.

**Beklenen.** `case_notes → 1` · `odeme_kayitlari → 4` · geri kalan hepsi
"temiz"/"atlandı" · `toplam_silinen: 0`. Bu beş satır 16–18.07 tarihli **deneme
dosyalarına** aittir; silinmeleri istenen davranıştır.

**AYRICA — bu koşum hangi sürümün dağıtıldığını da gösterir.** `saklama-imha`
26.08'de değişti ve publish yapıldı, ama §11-B'nin kendi kuralı "GitHub senkronu
edge function'ı otomatik deploy ETMEZ" diyor; ön yüz yayınının fonksiyonu da
yenileyip yenilemediğini **doğrulayamadım** (kolu çağırmak sır istiyor). Cevabın
biçimi bunu tek başına söyler:

| `oturum_kaydi_ses` satırı | ne demek |
|---|---|
| `{"durum":"temiz","silinen":0}` | **YENİ kod dağıtılmış** — düzeltme canlıda |
| `{"durum":"kuru","silinecek":0}` | **ESKİ kod duruyor** — fonksiyon yeniden dağıtılmalı |

İkincisi çıkarsa haber verin: kol eski hâliyle koşarsa `oturum_kayitlari`
**satırlarını** siler. Bugün o tablo boş olduğu için zarar yok, ama pilotta ilk
oturum kaydı tutulduktan sonra tehlikelidir.

**Kararın etkisi.** Beklenen sayılar çıkarsa yapılacak bir şey yok, cron kendi
koşar. **Farklı ya da daha büyük** bir sayı çıkarsa cron koşmadan önce haber
verin — Code kök nedeni bulur. Kuru koşum hiç yapılmazsa kol yarın canlı veriye
ilk kez **doğrulanmamış** olarak dokunur.

---


### H-16 · KAPANDI · 26.08.2026 — Çelişki yokmuş; soru yanlış kurulmuştu

**Sonuç:** `saklama_sureleri` değerleri **doğru**, 7 gün kasıtlıdır ve
değişmeyecek. 1825/3650 rakamları H-15/1'in **25.08'de yürürlükten kaldırılmış**
eski metnindendir — soruyu yazarken "SIFIR SAKLAMA" düzeltme bloğu atlanmış.
Ayrıca cron **kaldırılmamış**: canlıda jobid 21 · `saklama-imha-gunluk` ·
`0 3 * * *` · active = true. Kurucu talimatı: **değerlere de cron'a da dokunma.**
`tasks/todo.md`deki yanlış blokaj ve "cron kurulmadı" kaydı düzeltildi.
**Teşhis de kapandı (26.08).** `cron.unschedule` **yalan söylememiş** — 25.08'de
kaydı gerçekten kaldırmış. Kaydı geri kuran şey
`tests/gecici/PILOT-KALAN-GOCLER.sql` **Bölüm 5**'tir: 26.08 göç koşumunda o
bölüm de koştu. Kanıt: jobid 21'in `cron.job_run_details`te **hiç koşumu yok**,
oysa günlük dolu (jobid 7 → 5872 koşum, sonuncusu bugün 13:27) ve `0 3 * * *`
işi bugün 03:00'te var olsaydı koşardı → kayıt bugün 03:00'ten **sonra** doğmuş.
Ayrıntı `tasks/todo.md` teşhis bloğunda, üç kural `tasks/lessons.md`de.

<details><summary>H-16 · sorunun ve cevabın tam metni</summary>

### H-16 · 26.08.2026 · **P0** — Saklama süresi DEĞERLERİ kararla çelişiyor

**Bu H-15/1'in tekrarı değil.** O soru ("her tür kaç gün saklanacak?") cevaplandı
ve uygulandı. Yeni soru şu: **canlıdaki değerler o karara uymuyor.**

**Sorun.** `saklama_sureleri` tablosundaki `saklama_gun` değerleri bugün
**7 GÜN**. Kararınız ve o cevaptaki doğrulama dökümü ise **1825 gün (5 yıl)**,
mali kayıt için **3650 gün (10 yıl)** diyordu. Değerler karardan sonra değişmiş.

**Nasıl yakalandı.** `saklama-imha-gunluk` cron kaydı kuruldu; koşmadan önce
**kuru koşum** (`{"kuru": true}`) yapıldı ve ne silineceğini gösterdi:

```
case_notes      → silinecek 1
odeme_kayitlari → silinecek 4
```

Canlıda **5 dosya** 7 günden eski kapanmış (en eskisi 16.07.2026). Cron 03:00'te
koşsaydı **4 mali kayıt silinecekti** — sizin 10 yıl saklanacak dediğiniz veri.
Geri dönüşü yoktu.

**Yapılan.** Cron **derhal kaldırıldı** (`cron.unschedule` → doğrulandı: 0 kayıt).
**Değerlere DOKUNULMADI** — onlar sizin verinizdir ve kısa süre bilerek konmuş
bir deneme de olabilir. İmha kolu bu yüzden **bilerek kurulmamış** durumdadır.

**Seçenekler**

| | ne yapılır | sonucu |
|---|---|---|
| **A** | Değerler 1825 / mali 3650'ye döndürülür; sonra kuru koşum, sonra cron | Karar uygulanmış olur; m.10 (süresiz saklama yasağı) kapanır |
| B | 7 gün bilinçli bir denemedir | Cron deneme bitene kadar **kurulmaz**; m.10 açık kalır |
| C | Başka süreler verilir | Aynı akış: değer → kuru koşum → cron |

**Önerim: A.** 7 gün bir arabuluculuk dosyası için teamüle aykırı ve mali kayıt
saklama yükümlülüğüyle çelişir. **Bu bir hukuk kararıdır** — önerim teamüle
dayalıdır, hukuki görüş değildir.

**Kararın etkisi.** Karar gelene kadar periyodik imha **çalışmaz**: veri silinmez
ama constitution m.10 açık kalır. Yanlış değerle çalıştırılırsa geri dönüşü
olmayan veri kaybı olur — bugün kıl payı kaçırıldı.

**Değerlere ve cron'a karar gelene kadar dokunulmayacak.**

---

### H-16 · CEVAP · 26.08.2026 — SORU YANLIŞ KURULMUŞ, DEĞERLER DOĞRU
Seçim: **A/B/C değil — 7 gün KASITLIDIR, değiştirilmeyecek.**

**1) 1825/3650 rakamları yürürlükte DEĞİL.** H-15/1'in geçerli cevabı bu dosyanın
hemen altındaki **"H-15/1 · CEVAP DEĞİŞTİ · 25.08.2026 — SIFIR SAKLAMA"** bloğudur;
o blok "TEK ÇATI 5 YIL" kararını açıkça yürürlükten kaldırır ve eski metin ⛔ ile
işaretlidir. H-16 yazılırken bu blok atlanmış.

Kurucu kararı: süreç bitince dosyaya ait her şey silinir. **Mali kayıt da silinir** —
gerekçe: makbuz Medipact'ten kesilmiyor, ürün yalnız ücret hesabı/dökümü üretiyor,
dolayısıyla mevzuat gereği saklanması gereken mali kayıt Medipact'te **oluşmuyor**.
Otomatik süpürme **7 gün**: arabulucunun tutanağı indirip UYAP'a yükleme payı.

**2) CANLI DURUM DÜZELTMESİ (Cowork sorguladı, 26.08.2026 · salt okuma).**
`select jobid, jobname, schedule, active from cron.job` çıktısı:
**jobid 21 · `saklama-imha-gunluk` · `0 3 * * *` · active = true.**
Yani cron **KALDIRILMAMIŞ, duruyor ve etkin.** "cron.unschedule → doğrulandı:
0 kayıt" ifadesi canlı durumla uyuşmuyor; `tasks/todo.md`deki "periyodik imha
cron'u bilerek kurulmamış durumdadır" satırı ve "count → 0 olmalı" teyit notu da
yanlıştır. Bu, Code'un bu hafta avladığı **sessiz yazım** sınıfının ta kendisi
olabilir — `cron.unschedule` dönüşü okunmamış olabilir; nedeni araştırılsın ve
`tasks/lessons.md`ye yazılsın.

**3) Silinecek veri denetlendi (Cowork, canlı, salt okuma).** Kuru koşumdaki
5 satır iki dosyaya ait: `MP-2026-1011` (1 not + 2 ödeme) ve `MP-2026-1014`
(2 ödeme). 7 günden eski kapanmış beş dosyanın **hepsi deneme dosyasıdır**
(MP-2026-1009 · 1011 · 1012 · 1013 · 1014, hepsi 16–18.07.2026). Gerçek dosya yok.

**YAPILACAK (kurucu talimatı):**
- `saklama_sureleri` değerlerine **DOKUNMA** — 7 gün doğrudur.
- Cron'a **DOKUNMA** — zaten kurulu ve etkin, öyle kalsın.
- `tasks/todo.md`deki H-16 blokajını ve "cron kurulmadı" kaydını **düzelt**.
- **H-16 KAPANDI**, ARŞİV'e taşınabilir.

</details>


### H-15 · KAPANDI · 26.08.2026 — Pilot kapısındaki dört kararın dördü de uygulandı

| karar | seçim | uygulama |
|---|---|---|
| 1 · Saklama süreleri | tablo + süreler | `saklama_sureleri` kuruldu, `saklama-imha` yazıldı ve deploy edildi. **Değer çelişkisi H-16'ya taşındı.** |
| 2 · Antet / şablon | **A** | `profiles`a üç kolon (`antet_kolon = 3`); belge motoru basıyor; şablon genel kaldı |
| 3 · Üyelik / kota | pilotta kota yok | Madde pilot kapısından düştü; `/admin` **tüketim sayacı** yapıldı (engel yok, yalnız sayı) |
| 4 · Kazanım sayacı | **B** | `arabulucu_baz_cizgi` (`baz_cizgi_tablo = 1`, 3 politika); katsayıyı arabulucu beyan eder, hesap görünür döner |

Kapanış kaydı: `tasks/todo.md` → pilot kuyruğu 13/14 DONE.
~~Devam eden tek açık uç H-16'dır~~ — **H-16 da 26.08'de kapandı** (çelişki
yokmuş; değerler doğru, cron duruyor). Yukarıdaki H-16 kaydına bakın.


### H-14 · KAPANDI · 25.08.2026 — Sesli oturum notu (karar B uygulandı)
**Seçim: B** — yalnız arabulucunun kendi sesli notu. Üç şart da kuruldu ve
tezgâhla kilitlendi (`tests/sesli-not.test.ts`, 10/10):
1. Ses metne çevrildiği **an** siliniyor — döküm başarısız olsa da. Silme
   sonucu okunuyor; silinemezse `ses_dosya_yolu` temizlenmiyor ki 24 saatlik
   imha kolu bulabilsin.
2. Aydınlatma metni (`KVKK_SESLI_NOT`) `src/lib/kvkk-metinleri.ts` içinde
   **tek yerde**: hangi hizmet · ne kadar kalıyor · ne zaman siliniyor.
3. Tek seferlik onay olmadan kayıt **başlamıyor**.

**Teknik kısıt kuruldu:** istemci yalnız `getUserMedia({audio:true,video:false})`
çağırıyor; uzak ses akışı API'lerinin (`RTCPeerConnection` · `getDisplayMedia` ·
`ontrack` · `getReceivers` · `srcObject` · `DailyIframe`) **hiçbiri kodda
geçmiyor** ve tezgâh bunu yorumları ayıklayarak denetliyor. Sunucu tarafı da
çağıranın dosyanın arabulucusu olduğunu doğruluyor (taraf → 403).

**Kalan:** kovanın INSERT politikası (bkz. H-4 arşiv kaydı) ve dökümün canlı
kanıtı — `tasks/todo.md`de işaretli.

---


### H-4 · KAPANDI · 25.08.2026 — Kayıt kovası: dar okuma politikası GEREKMİYOR
**Önkoşul bugün doğdu.** H-4 "yükleme yolu henüz kodlanmadığı için dosya yolu
düzeni belli değil" diye bekliyordu. Sesli not hattı (H-14/B) düzeni kurdu:
`<arabulucu_id>/<case_id>/<zaman>.webm`.

**Cevap C'den bile dar çıktı.** H-4 cevabı "önce C'yi (imzalı bağlantı) dene,
yetmezse dar politika yaz" diyordu. Bugünkü hatta ses **metne çevrilir çevrilmez
siliniyor** (H-14 şart 1) ve saklanan tek şey metin — metin de kovada değil
`oturum_kayitlari` tablosunda. Yani **istemcinin kovadan okumasına hiç gerek
yok**: `SesliNotKaydi.tsx` yalnız `upload` çağırıyor; `download`,
`createSignedUrl`, `list` **hiç geçmiyor**. Okuma ve silme sunucuda servis
rolüyle yapılıyor, servis rolü RLS'e tabi değil.
**Sonuç: kova okumaya KAPALI kalıyor. Ne dar politika ne imzalı bağlantı gerekti.**

**Ama bu sırada CANLI BİR AÇIK bulundu (P1).** `storage.objects` deny-by-default
çalışıyor ve `oturum-kayitlari` kovası için **canlıda hiç politika yok** (yalnız
`avatars` ve `case-documents` politikaları var). Bu yüzden **yükleme de düşer** —
sesli not hattı kodda bitmiş görünür ama ilk kullanımda politika ihlaliyle
başarısız olur.

**Gereken tek şey bir INSERT politikası** (Code yazdı, ÇALIŞTIRMADI — §10):
`tests/gecici/oturum-kayitlari-politika.sql`. Ölçü: kimliği doğrulanmış
kullanıcı, **yalnız kendi klasörüne** ve **yalnız arabulucusu olduğu dosyaya**
yükleyebilir (`is_case_mediator`). Taraf yükleyemez. Okuma politikası
**eklenmez**.

Bu politika çalıştırılana kadar sesli not hattı canlıda **çalışmaz**;
`tasks/todo.md`de bu şekilde işaretlendi.

---


### H-11 · KAPANDI · 25.08.2026 — Kabuk bekçisi geri kuruldu
**Seçim: A.** Kurucu `guard-shell.YEDEK.sh` sürümünü PowerShell'den
`guard-shell.sh` üstüne kurdu (2665 bayt, komut-farkındalıklı sürüm).

**Doğrulama (Code):** `tests/gecici/bekci-sinama.mjs` — **28/28**.
· 11 olağan iş senaryosunun **hiçbiri** yanlış alarm üretmedi
(`--no-rebase` · commit mesajında geçen "DROP/rm/delete from" ·
`git ls-files --error-unmatch .env` · `.gitignore`ta "env" araması ·
kolon adında "drop" geçen sorgu · normal push · `.env.example` yazımı dâhil).
· 17 gerçek tehlikenin **17'si de** onay sordu: `rm -rf` · `Remove-Item` ·
`find -delete` · `push --force` · `--force-with-lease` · `push -f` ·
`branch -D` · `reset --hard` · `filter-branch` · `push --delete` ·
`cat .env` · `cat id_rsa` · MCP `DROP TABLE`/`TRUNCATE`/`DELETE FROM` ·
`psql -c "DROP…"` · `bash -c "rm -rf …"`.

Devre dışı taslakla aynı tezgâh **17 tehlikenin 17'sini de geçiriyordu**;
açık kapandı. Sonuç `tasks/todo.md`ye işlendi.

---


### H-1 · KAPANDI · 25.08.2026 — `CRON_SECRET` yenilendi
**Seçim: A** (runbook ile yenileme). Kurucu değeri üretti ve hem *Edge Functions
→ Secrets* hem *Vault* tarafında güncelledi. **Code değeri istemedi, görmedi,
okumadı, hiçbir çıktıya yazmadı.**

**Doğrulama (Code, salt okuma).** `net._http_response` son 90 dakika:
`08:27–09:42` **200** ×29 (eski değer) → **`09:45:00` 401 ×1** (yenileme
boşluğu) → `09:48 · 09:51 · 09:54` **200** ×3 (yeni değer geçerli).

Bu, A seçeneğinin peşinen kabul ettiği imzanın aynısıdır: *"en fazla bir
nöbetçi turu (3 dk) 401; iş kaybı yok, tur yeniden koşar."* Tek 401'den sonra
üç tur üst üste 200 → **yenileme başarılı.**

Saklama yarısı da doğrulandı: yedi cron işinin hiçbirinde düz metin sır yok
(altısı Vault'tan okuyor; jobid 4 sır kullanmıyor, komutu düz bir `SELECT`).

**Sır hijyeni:** `net.http_request_queue` ve istek başlıkları **hiç
sorgulanmadı** — `x-cron-secret` orada taşınır. Yalnız yanıt tarafındaki
`status_code` ve `created` okundu (§12).

Sonuç `tasks/todo.md`ye işlendi; kuyruk maddesi **DONE 25.08.2026**.

---


### H-6 · P0 — Sahip-taraf guard'ı belirsiz öbeğe de uygulandı · **KAPANDI**
**Karar: B** (kurucu; Code'un önerisi A'ydı). 17 belirsiz politika + taramada
çıkan 2 tablo daha guard'a alındı. Migration `20260824140724` + `20260824140953`
(Lovable). CANLI: dar politika **25** · kalan geniş **6** (tam olarak
dokunulmayacak öbek) · sahip **9/9** yetkili · erişimi değişen dosya **0**.
Tezgâh `tests/rls-sahip-taraf-guard.test.ts` 35 durum; guard sökülmüş kopyada
27 test düşüyor (kanıt). İstisna gerekmedi — sessiz istisna yok.

### H-3 · P3 — Eski şema adası · **KAPANDI**
**Karar: A.** Dört dosya silindi (`de0049b`): `send-session-notification`,
`send-reschedule-notification`, `RescheduleRequest.tsx`, `RescheduleApproval.tsx`.
Tablolar DURUYOR. Kararın şartı yerine getirildi: çağrılmadıkları taramayla
kanıtlandı (kanıt `tasks/todo.md`de), ders `tasks/lessons.md`ye işlendi.
Doğrulama: 204/204 test · tsc temiz · build başarılı · lint 2358 → 2346.

### H-2 · P2 — İmza akışı · **KAPANDI**
**Karar: A** (ıslak imza). `src/components/mediation/AnlasmaImzaPaneli.tsx`
açıldı; arabulucu imzalı taramayı yükler, imzalayan tarafları işaretler,
`signed_by` + `metadata.imzalandi_at` yazılır → tetikleyici
`anlasma_belgesi_imzalandi` olayını doğurur (zincir artık koşuyor).
Kararın yetki sınırı mimariyle tutuldu: yazma istemciden kullanıcının kendi
JWT'siyle gider; hiçbir edge function `signed_by`'a dokunmuyor (servis rolü
RLS'i aşardı). Tezgâh `tests/imza-kapisi.test.ts` (6 durum) — sunucudan
`signed_by` yazımı eklenince DÜŞÜYOR (kanıtlandı). 210/210 test.

### H-5 · P3 — `soru_cevaplandi` tüketicisiz olayı · **KAPANDI**
**Karar: A.** `trg_akis_gorev_cevap` kaldırıldı (Lovable göçü
`20260824184056`, commit `edd7b64`). Kaldırmadan önce doğrulandı: bu olay koduna
bağlı `akis_kurallari` satırı **0**, kod tabanında tüketici **0**, işlenmemiş
olay **0**. Birikmiş **12** satır SİLİNMEDİ, işlenmiş olarak duruyor.
Uyandırma `ajan-nobetci`deki `[kol:…]` yoluyla sürüyor.

### H-0 · 24.08.2026 · P0 — Self-servis başvuruda kör veri kırılıyor · **KAPANDI**
**Karar: A** (kurucu, 24.08). Taraf-gizli beş tabloda (`oturum_hazirlik_foyleri`,
`taraf_kalemleri`, `bilirkisi_secim_beyani`, `bilirkisi_taraf_yanitlari`,
`oturum_kayitlari`) sahip yetkisi, sahip aynı zamanda TARAF ise verilmez; dosya
yönetimi sahipte kalır. Uygulandı ve canlıda doğrulandı — ayrıntı
`tasks/todo.md`dedir.
