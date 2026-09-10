# PİLOT GERİ BİLDİRİMİ — AŞAMA 1 · DOSYA KURULUMU (Yeni başvuru ekranı)

**Tarih:** 10.09.2026 · **Kaynak:** kurucu (kendi dosyasıyla canlı pilot denemesi) · **Yazan:** Cowork
**Bağlayıcılık:** Bu dosya kurucu kararıdır. Code buradaki maddeleri UYGULAR, yeniden sormaz.
Yalnız "Cowork'ün koyduğu maddeler" bölümü kurucunun ekranda görüp itiraz edebileceği seçimlerdir.

---

## 0. ÇALIŞMA USULÜ — AŞAMA KAPISI (kurucu kararı, 10.09.2026 · DAOS §11-B'nin ÜSTÜNE geçer)

Kurucu: *"Karman çorman oldu; aşama aşama gidiceğiz."* Bundan sonra her aşama şu sırayla biter:

1. Code aşamayı yapar, tezgâhla test eder (test · tsc · build yeşil).
2. Code **main'e push eder** → Lovable ön izleme yenilenir. **Publish YAPILMAZ, edge function
   deploy YAPILMAZ.** Canlı site (medipact-ai.lovable.app) kurucu "tamam" demeden değişmez.
3. Code kurucuya **düz Türkçe, en fazla 10 satır** rapor yazar (`tasks/todo.md` "Nerede kaldık"
   altına + terminale): ne değişti (kullanıcı diliyle, teknik terim yok) · test sonucu (kaç/kaç) ·
   ekran görüntüleri nerede · ön izleme bağlantısı · "tamam mı?"
4. Ekran görüntüleri: her değişen ekranın masaüstü ve telefon görünümü PNG olarak
   `C:\Users\ASUS\Desktop\medipact claude\ASAMA-1-EKRANLAR\` klasörüne kaydedilir
   (klasör yoksa açılır). Kurucu klasörü açıp bakar.
5. Kurucu **"tamam"** der → Code publish + gerekli edge function deploy yapar → canlı doğrulama →
   aşama kapanır. Kurucu "olmadı" derse: neyin olmadığını yazar, Code düzeltir, 2'ye döner.
6. Kurucu onaylamadan hiçbir öneri koda girmez. Code'un kendi fikri varsa `tasks/HAT.md`ye
   "ÖNERİ" olarak yazar, uygulamaz.

Bu kural `CLAUDE.md`ye **"§11-C AŞAMA KAPISI"** başlığıyla eklenir; §11-B'nin "sormadan publish"
yetkisi yalnız **kurucu 'tamam' dedikten sonraki** publish için geçerlidir.

**Bu turun kapsamı yalnız:** (a) HAT **H-31** düzeltmesi (kapanmış dosya mail atamasın — teste
başlamadan önce şart) + (b) aşağıdaki Aşama 1. Başka hiçbir şey. Taraf kısmında belge yükleme
**bu aşamada YOK** (sonraki aşamada; orada da bilinen sorunlar var).

---

## 1. YENİ BAŞVURU EKRANI — ADIM SIRASI (kurucunun belirlediği sıra, aynen)

Her adım aynı kalıpla dizilir (bkz. §2). Sıra:

### 1.1 Belge yükleme (en üstte, isteğe bağlı)
- Başlık: **"Arabuluculuk bürosu evrakları"**. Yüklenebilecekler:
  · Başvurucunun ya da vekilinin **talep dilekçesi**
  · Arabuluculuk bürosunun bu talebe göre hazırladığı **başvuru formu**
  · Vekille başvuruda **vekâletname / yetki belgesi**
  · İhtiyaride (isteğe bağlı) **arabulucu belirleme belgesi** — genelde süreç sonunda hazırlanır,
    baştan yüklemek isteyen buradan yükler.
- Belge yüklendiyse AI, aşağıdaki adımların ilgili alanlarını **bu belgelerden okuyarak
  doldurur**. Dolan her alan **elle düzenlenebilir kalır**.
- Belge yüklenmediyse hiçbir şey olmaz; arabulucu 1.2'den elle devam eder.

### 1.2 Uyuşmazlık konusu (TEK alan)
- Bugün üç yerde tekrar eden "uyuşmazlık konusu / uyuşmazlık metni / açıklama" alanları
  **TEKE iner**. Kutunun içi boş.
- Kutunun altında, küçük italik açıklama — **kurucunun metni, aynen**:
  > Başvuru konusunu ve kısa açıklamasını yazınız. Tarafların şahıs mı firma mı olduğunu kısaca
  > belirtiniz. Konunun para ya da parayla ölçülebilen bir konu olup olmadığını kısaca açıklayınız.
- Bugünkü eski italik yönlendirme yazıları bu ekrandan **kaldırılır**; yalnız yukarıdaki kalır.

### 1.3 Arabuluculuğa uygun mu?
- Elle seçim: **Uygun / Uygun değil**. Yanında **"AI önersin"** düğmesi.
- AI cevabı gerekçeli ve **kaynak doğrulamalı** olur — §2-A'daki ortak kaynak kuralına göre.
- Biçim: "Arabuluculuğa uygun, çünkü … — Kaynak: …" / "Arabuluculuğa uygun değil, çünkü … — Kaynak: …".
- "Uygun değil" çıkarsa altına şu cümle eklenir (aynen):
  > Konu ile ilgili atamanızın yapıldığı arabuluculuk bürosu ile iletişime geçiniz.
- AI'nın "uygun değil" demesi **devamı ENGELLEMEZ**. Arabulucu isterse devam eder; düğme kapanmaz.

### 1.4 Başvuru türü
- **Dava şartı / İhtiyari** — elle seçim. **AI önerisi YOK** (kurucu: "insanın yola çıkarken
  zaten bildiği şey; AI'ya sordurmaya bile gerek yok").

### 1.5 Ana uzmanlık
- Elle seçim + **"AI önersin"**. AI **önce ana alanı** önerir (ticari · tüketici · iş · sağlık · …).

### 1.6 Alt uzmanlık
- Elle seçim + **"AI önersin"**. AI alt uzmanlığı **ana alana bağlı** önerir.
- Bugünkü kusur: AI yalnız alt uzmanlık öneriyor, ana alanı hiç söylemiyor. Düzeltme: **sıra
  önce ana, sonra alt.** Kurucunun örneği (kural olarak kodlanır):
  · İki ya da daha çok **firma** arasında eser sözleşmesi / bina yapımı → ana **ticari**, alt **inşaat**
  · Firma(lar) ile **tüketici** konumundaki taraf(lar) arasında inşaat → ana **tüketici**, alt **inşaat**
  Yani aynı alt uzmanlık farklı ana alanlara düşebilir; tarafların şahıs/firma oluşu ana alanı belirler.

### 1.7 Süreler
- **"Yeniden tespit"** düğmesi KALIR — yukarıdaki seçimler (dava şartı/ihtiyari, ana alan)
  değişince süreler de değişir.

### 1.8 Taraflar
- Belgeden dolan alanlar dışında **her alan elle doldurulabilir**; hiçbir alan kilitli değil.
- İletişim bilgileri (e-posta · telefon) için yanda **"AI araştırsın"** düğmesi:
  · AI açık kaynaklardan (internet) arar, **kaynak doğrulayarak** bulur.
  · Sonuç alanın altında küçük italik: "**Bulundu** — kaynak: [tıklanabilir kaynak adları]" ya da
    "**Bulunamadı.**" Uydurma yasak; kaynak gösterilemeyen bilgi yazılmaz.
  · Arabulucu **"Tamam"** derse bulunan bilgi ilgili alana yazılır; demezse yazılmaz.
- Her iletişim kanalının (e-posta · telefon/WhatsApp) yanında **seçim kutusu**: işaretlenen kanal
  o tarafa gönderimde kullanılır.

### 1.9 Süreç bilgilendirme (yalnız DAVA ŞARTI seçiliyse)
- Dava şartında ilk bildirim **asıl taraflara** gider — vekille temsil edilse bile. İhtiyaride bu adım
  **görünmez**.
- Metin: **kurucu gönderecek** (henüz gelmedi → YER TUTUCU: "[Süreç bilgilendirme metni —
  kurucudan bekleniyor]"). Dosyaya has bilgileri (dosya no, taraf adı, konu, arabulucu) AI metne
  otomatik yerleştirir.
- Gönderim, 1.8'de işaretlenen kanaldan: e-posta seçiliyse e-posta; telefon seçiliyse **WhatsApp**.
  WhatsApp gönderimi bugün üründe yoksa Code bunu **raporda yazar** (kurucu kararı için), sessizce
  e-postaya düşürmez.

---

## 2. HER ADIMIN ORTAK KALIBI (bütün ürün için kural; bu turda Aşama 1 ekranında uygulanır)

Kurucu: *"Bir şey bir yerde neredeyse, başka kısımlarda da aynı yerde dursun. Kullanıcı aramasın."*

Her adım, yukarıdan aşağı, HER ZAMAN aynı dizilişte:

```
[Adım başlığı]
[Elle giriş alanı]                         [AI önersin] / [AI araştırsın]  ← hep sağda, aynı hizada
[AI cevabı: küçük italik, alanın hemen altında, kaynak bağlantılarıyla]
```

- AI düğmesi her adımda **aynı yerde** (alanın sağında). Olmayan adımda (1.4) düğme yoktur, boşluk korunur.
- AI cevabı **her adımda aynı biçimde**: alanın hemen altında, küçük italik, sonunda kaynak.
- Uyarı ve sonuç bildirimi **tek usul**: aynı yer, aynı yazı biçimi. Bir adımda balon, ötekinde
  ışık, üçüncüsünde ayrı pencere OLMAZ.
- Ekran yukarıdan aşağı **sıralı ve numaralı** akar; kullanıcı hangi adımda olduğunu görür.

### 2-A. KAYNAK DOĞRULAMA KURALI (kurucu, 10.09.2026 — AI'nın her hukuki cevabı için)

Kaynak sırası, **önce ürünün içi, sonra dışı**:
1. **Ürün veritabanındaki yerleşik uzmanlık modülleri** (uzmanlık kitapları)
2. **Üründe sabit mevzuat** (yüklü kanun · yönetmelik · diğer yasal mevzuat)
3. **Yargıtay içtihatları — açık kaynak** (yalnız gerek duyarsa; kurucu: "ilk aşama için —
   ana/alt uzmanlık tespiti, arabuluculuğa uygunluk ve temel kısımlar — 1 ve 2 yeterlidir,
   3'e gerek kalmaz")
4. Hiçbirinde yoksa: **"Kaynaklarda bulamadım."**

Her cevabın sonunda **hangi kaynaktan** geldiği yazılır ve **tıklanabilir** olur — Claude ve
Perplexity'nin gösterdiği biçimde:
- veritabanından geldiyse **hangi uzmanlık modülü** ("Kaynak: İnşaat Hukuku uzmanlık modülü, §…")
- mevzuattan geldiyse **hangi kayıtlı mevzuat, hangi madde** ("Kaynak: 6502 sayılı Kanun m. 73")
- içtihattan geldiyse karar künyesi + bağlantı — **erişilip okunan** karar dışında künye yazılmaz

**UYDURMA YASAK.** Kaynak gösterilemeyen hukuki cümle ekrana çıkmaz; onun yerine "bulamadım" çıkar.
Bu kural §1.3, §1.5, §1.6 ve §1.8 AI cevaplarının hepsine aynı biçimde uygulanır.

---

## 3. BİLDİRİM USULÜ — KURUCU KARARI (10.09.2026, "tamam" ile onaylandı)

Soru: *AI cevapları ve uyarılar chatbotta yanıp sönen ışıkla mı, yoksa ilgili alanın hemen altında
italik yazıyla mı gösterilsin?*

**KARAR: alanın hemen altında küçük italik yazı.** Gerekçe: "kullanıcı aramasın, her şey aynı
yerde dursun" kuralı — ışık kullanıcıyı baktığı yerden başka yere gönderir, altına yazınca cevap
sorunun yanında durur. Kural **bütün üründe tek usul**: hangi alanın yanındaki AI düğmesine
basılırsa cevap o alanın altında çıkar; istisna yok. Chatbot penceresi kalır ama **uyarı/sonuç
kanalı değildir**, yalnız serbest soru-cevap içindir. Yanıp sönen ışık **konmaz**.
Değişecekse bütün aşamalarda birden değişir, tek tek değil.

### 3-A. CHATBOTUN İŞLEVLERİ — KURUCU KARARI (10.09.2026, "bu şekilde işle")

Chatbot **soru sorma yeridir, bildirim yeri değildir.** Üç işlevi vardır, başka işlevi yoktur:

1. **Arabulucunun serbest sorusu** — ekrandaki adımlara bağlı olmayan, konuşma gerektiren her
   şey: "bu dosyada süre ne zaman doluyor", "karşı taraf son cevabında ne demişti", "dosyanın iki
   paragraflık özetini çıkar".
2. **Tarafın ajanla konuşma yeri** (taraf ekranında) — ajan tarafa soru sorduğunda taraf cevabını
   buradan yazar. Mevcut işlev, aynen kalır.
3. **Kaynaklı açıklama isteme** — alanın altındaki kısa AI cevabı yetmediyse arabulucu chatbota
   "neden uygun değil dedin, kaynağı aç" der; uzun gerekçe ve kaynakların tamamı burada çıkar.
   §2-A kaynak kuralı burada da geçerli: kaynak yoksa "bulamadım".

Chatbotun **yapmayacağı** şeyler: uyarı vermek · sonuç bildirmek · "AI bir şey yazdı" diye dikkat
çekmek · ışık yakmak. Bunların hepsi ilgili alanın altındadır (§3).

Code'a not: chatbotun bugün kodda bu üçü dışında bir işi varsa raporda **listeler**, kendisi
kaldırmaz ya da eklemez — karar kurucunun.

Cowork bunun dışında ürün davranışı eklemedi. Code de eklemez; eklemek istediğini HAT'a ÖNERİ yazar.

---

## 4. KABUL ÖLÇÜTÜ (Code raporunda madde madde karşılığı olacak)

| # | Ölçüt |
|---|---|
| 1 | Yeni başvuru ekranında uyuşmazlık konusu alanı **tek**; eski tekrar alanları yok |
| 2 | Adım sırası 1.1 → 1.9 aynen; dava şartı seçilmeden 1.9 görünmüyor |
| 3 | "AI önersin" ana uzmanlık için **ana alanı** söylüyor; alt uzmanlık ana alana bağlı |
| 4 | "Arabuluculuğa uygun mu" AI cevabı kaynaklı (§2-A sırası: modül → mevzuat → içtihat); kaynak adı ve maddesi tıklanabilir; kaynak yoksa "bulamadım" diyor; devam engellenmiyor |
| 5 | Başvuru türünde AI düğmesi **yok** |
| 6 | Taraf iletişiminde "AI araştırsın" kaynak gösteriyor / "bulunamadı" diyor; "Tamam" olmadan alana yazmıyor |
| 7 | Her adımda AI düğmesi ve AI cevabı **aynı yerde, aynı biçimde** |
| 8 | Belge yüklenince alanlar doluyor ve elle düzenlenebiliyor |
| 9 | H-31: kapanmış dosyadan e-posta çıkmıyor (tezgâh + canlı ölçüm) |
| 10 | Ekran görüntüleri (masaüstü + telefon) klasörde; ön izleme bağlantısı raporda |
