# KARAR PAKETİ — **DEVREDİLDİ**

> **Bu dosya artık kullanılmıyor.** 24.08.2026'da kalıcı iletişim hattı kuruldu:
> **`tasks/HAT.md`** (kural: CLAUDE.md §23).
>
> - **Madde 1 (P0 · self-servis kör veri): KAPANDI.** Kurucu **A** seçeneğini
>   seçti, uygulandı ve canlıda doğrulandı. Ayrıntı `tasks/todo.md`de,
>   özet `HAT.md` → ARŞİV → `H-0`.
> - **Kalan beş madde** `HAT.md` → `## CODE → COWORK` bölümüne **H-1…H-5**
>   olarak taşındı; cevaplar oraya yazılır.
>
> Aşağıdaki içerik tarihsel kayıt olarak duruyor; **güncel değildir**.

---


**24.08.2026 · gece oturumu sonu.** Bu dosya bir durum dosyası DEĞİLDİR; tek
doğruluk kaynağı `tasks/todo.md`dir (CLAUDE.md §0). Burada yalnız **karar
bekleyen** maddeler toplanır: sorun · seçenekler · önerim · kararın etkisi.
Karar verildiğinde ilgili madde `tasks/todo.md`ye işlenir ve buradan düşer.

Altı madde var. **1 ve 2 acildir**, kalanlar pilotu bloke etmez.

---

## 1 · P0 — Self-servis başvuruda kör veri kırılıyor ⚠️ ACİL

### Sorun
`is_case_owner_safe(case_id, user_id)` yalnız `cases.user_id` eşleşmesine bakar
ve **34 RLS politikası** bunu *arabulucu düzeyi* yetki olarak kullanır
(politikaların adı bile "Arabulucu …"). Ama:

- Açılıştaki **"Başvuruyu Başlat"** düğmesi `/legal-reasoning?new=1`e gider
  (`Landing.tsx:76` ve `:166`) → arabulucu olmayan kullanıcı da dosya açabilir,
  `cases.user_id` kendisi olur.
- `MediationEngine.tsx:4101` self-servis akışta ilk tarafı **dosyayı açanın
  kendi kimliğiyle** yazar:
  `user_id: !isMediator && parties.length === 0 ? userId : null`

**Sonuç:** self-servis başvuruda *dosya sahibi = dosyanın tarafı*. O kişi
arabulucu düzeyi yetkiyle **karşı tarafın** hazırlık föyünü, kalemlerini,
bilirkişi beyanlarını ve oturum kayıtlarını görebilir. Kör veri ilkesi kırılır.

**Canlı durum:** bugün **0 dosya** etkileniyor — mevcut 9 dosyanın hepsi
arabulucu tarafından açılmış. Kusur gizli, ama self-servis akış canlıda açık ve
ilk kullanımda doğar.

> **Denedim, geri aldım.** `is_case_owner_safe`e "sahip aynı zamanda tarafsa
> yetki verme" koşulunu ekledim; sonra `4101`i okuyunca bunun self-servis akışı
> **tamamen kilitleyeceğini** gördüm (başvurucu kendi dosyasına taraf ekleyemez,
> belge yükleyemez). Geri aldım ve doğruladım; zarar doğmadı.

### Seçenekler
| | ne yapılır | ne olur | bedeli |
|---|---|---|---|
| **A** | Yalnız taraf-gizli beş tabloda (`oturum_hazirlik_foyleri`, `taraf_kalemleri`, `bilirkisi_secim_beyani`, `bilirkisi_taraf_yanitlari`, `oturum_kayitlari`) sahip yetkisi, taraf olan sahibe verilmez. Dosya yönetimi sahipte kalır | Kör veri kapanır, self-servis akış çalışır | 5 politika değişir |
| B | Self-servis akışta başvurucu taraf olarak YAZILMAZ; taraf kaydı ancak davetle bağlanır | Kök neden kalkar | Tek satır kod; başvurucunun taraf ekranı davete kadar çalışmaz |
| C | Açılış düğmesi ayrı bir başvuru akışına gider | En temiz ayrım | Yeni yüzey, pilotu geciktirir |

### Önerim
**A.** Kör veriyi kapatır, mevcut akışı bozmaz, değişim yüzeyi dar ve ölçülebilir.

### Kararın etkisi
A ve B kör veriyi kapatır; C ayrıca ürün akışını düzeltir ama pilotu geciktirir.
**Hiçbiri yapılmazsa** self-servis ilk başvuruda karşı tarafın gizli verisi
başvurucuya açılır — KVKK ve anayasa (kör veri) ihlali.

**Kabul ölçütü:** sahip-aynı-zamanda-taraf olan bir dosyada, o kişinin
kimliğiyle karşı tarafın föyü/kalemi sorgulandığında **0 satır** dönüyor.

---

## 2 · P1 — `CRON_SECRET` değerinin yenilenmesi ⚠️ ACİL

### Sorun
Cron sırrı `cron.job.command` içinde **düz metin** duruyordu. Saklama yeri
düzeltildi: değer **Vault'a taşındı**, altı cron işi çalışma anında
`vault.decrypted_secrets`ten okuyor, `cron.job`ta düz metin sır **0**.
**Ama değer değişmedi** — ve bu oturumda maskeleme denemem tutmadığı için
(jobid 3/7 `jsonb_build_object` biçimini kullanıyor, desenim JSON biçimini
hedefliyordu) değer **oturum dökümüne girdi**. Hiçbir dosyaya, commit'e ya da
mesaja yazılmadı.

**Bunu ben yapamam — yapısal sebeple:** yeni değeri üretsem ya da okusam değer
yine bağlamıma girer, yani yenilemeyi baştan boşa çıkarır. Yeni değeri görmeyen
biri üretmelidir.

### Seçenekler
| | ne yapılır | bedeli |
|---|---|---|
| **A** | Aşağıdaki runbook ile yenile (2 adım) | En fazla bir nöbetçi turu (3 dk) 401; iş kaybı yok, tur yeniden koşar |
| B | Geçiş kipi: fonksiyonlar geçici olarak eski VE yeni sırrı birlikte kabul eder | Kesinti sıfır; ama `CRON_SECRET` okuyan her fonksiyonda kod değişikliği + iki fan-out |
| C | Yenilenmez | Sır oturum dökümünde geçerli kalır |

### Önerim
**A.** Kesinti bir turdur ve zararsızdır; B'nin kod maliyeti bu risk için fazladır.

### Runbook (A)
1. Yeni bir sır üret (ör. `openssl rand -base64 32`). **Bana gösterme.**
2. Supabase → Edge Functions → Secrets: `CRON_SECRET` değerini yenisiyle güncelle.
3. Hemen ardından tek SQL (cron tanımlarına DOKUNMAZ, hepsi Vault'tan okuyor):
   `select vault.update_secret((select id from vault.secrets where name='cron_secret'), '<YENİ DEĞER>', 'cron_secret', 'Edge function cron kapisi (x-cron-secret)');`
4. 3 dakika sonra kontrol:
   `select status_code, created from net._http_response order by created desc limit 3;` → **200** olmalı.

### Kararın etkisi
C seçilirse sır geçerli kalır ve döküme erişimi olan herkes cron kapısını
açabilir. A/B sonrası eski değer işe yaramaz hâle gelir.

---

## 3 · P2 — İmza akışı yok

### Sorun
`agreement_documents.signed_by` sütunu **hiçbir yüzeyden yazılmıyor** (tarandı;
eşleşenlerin hepsi farklı bir sütun olan `assigned_by`). Şema ve tetikleyici
hazır: `signed_by` değişince `anlasma_belgesi_imzalandi` olayı doğacak. İmza
yüzeyi olmadığı için o olay **hiç doğmuyor** ve ona bağlanacak hiçbir akış
çalışamaz.

Bu bir kusur değil, **eksik özelliktir**: imza ürünün beş insan kapısından
biridir (§13 · constitution), davranışı kendiliğinden eklenmez.

### Seçenekler
| | ne yapılır | bedeli |
|---|---|---|
| **A** | Islak imza: arabulucu imzalı belgeyi yükler, `signed_by` + tarih işaretlenir | En az iş, mevcut belge akışına oturur; hukuki dayanak alışıldık |
| B | Uygulama içi tıklayarak onay (e-imza değil) | Orta iş; hukuki değeri tartışmalı, tutanağa ayrı dayanak gerekir |
| C | Nitelikli e-imza entegrasyonu (e-Devlet/KEP) | En yüksek hukuki değer; en yüksek iş, pilotu geciktirir |

### Önerim
**A** (pilot için). Islak imza Türk arabuluculuk pratiğinde yerleşiktir; B ve C
pilottan sonra değerlendirilebilir.

### Kararın etkisi
Karar verilmeden imza kapısı boş kalır; anlaşma belgesinin imzalandığı sistemde
**hiçbir yerde kayıtlı olmaz** ve kapanış zinciri (imza → olay → akış) hiç
çalışmaz.

---

## 4 · P3 — Eski şema adası kaldırılsın mı

### Sorun
`mediator_requests` (0 satır) ve `reschedule_requests` (0 satır, FK'si ötekine)
tabloları ile bunlara dayanan dört dosya terk edilmiştir:
`send-session-notification` (uygulamada çağrılmıyor),
`send-reschedule-notification` (iki bileşenden çağrılıyor ama o bileşenler
hiçbir yerden import edilmiyor), `RescheduleRequest.tsx`, `RescheduleApproval.tsx`.

**Canlı kusur YOK.** Ama **tuzak**: canlı görünüyor ve sorgusu sessizce boş
dönüyor — "yapacak bir şey yok" sanılıp 200 dönülüyor. 24.08'de tam olarak bu
oldu: `send-session-reminders` aynı tabloyu sorguluyordu ve **oturum
hatırlatmaları hiç gönderilmiyordu**; bu üç tur kaybettirdi.

Şimdilik dört dosyanın başına açık uyarı konuldu.

### Seçenekler
| | ne yapılır | bedeli |
|---|---|---|
| **A** | Kod dosyaları silinir, tablolar DURUR | Tuzak kalkar, veri kaybı riski yok |
| B | Kod + tablolar birlikte silinir | En temiz; tablo silmek geri dönüşsüzdür (§7.3) |
| C | Hiçbir şey silinmez, yalnız uyarı kalır (bugünkü durum) | Bedava; bir sonraki okuyan yine yanılabilir |

### Önerim
**A.** Tuzağın kaynağı koddur; tabloyu silmenin acelesi yok ve geri dönüşsüzdür.

### Kararın etkisi
B geri alınamaz. C seçilirse tuzak durur; uyarı yardımcı olur ama garanti değildir.

---

## 5 · P3 — Kayıt kovasına dar okuma politikası

### Sorun
`oturum-kayitlari` kovası **24.08'de açıldı** (özel; istemciye hiçbir politika
verilmedi — deny-by-default). Silme kolu servis rolüyle çalıştığı için sorun yok.
Ama arabulucunun kaydı **uygulamadan** dinlemesi gerekirse dar bir okuma
politikası gerekecek.

**Şu an yazılamaz:** yükleme yolu henüz kodlanmadığı için dosya yolu düzeni
belli değil; politika yazmak için desen **uydurmak** gerekirdi. Uydurulmadı.

### Seçenekler
| | ne yapılır | bedeli |
|---|---|---|
| **A** | Kayıt hattı yazılırken yol düzeni belirlenir, sonra dar politika eklenir | Doğru sıra; şimdi iş yok |
| B | Şimdi bir yol düzeni dayatılır ve politika yazılır | Hattı yazanı bağlar; yanlış tahminde iki kez iş |
| C | Politika hiç yazılmaz; arabulucu kaydı yalnız edge function üzerinden (imzalı bağlantı) dinler | En güvenli; her dinleme için sunucu turu |

### Önerim
**A**, ve hattı yazan kişi **C**'yi ciddi değerlendirsin: onay metni "kayıt ve
dökümü **yalnız arabulucu** görür" diyor; imzalı bağlantı bu sınırı en dar
biçimde uygular.

### Kararın etkisi
Bu madde pilotu bloke etmez (kayıt hattı henüz yok). Ama politika **geniş**
yazılırsa 24.08'de belge kovasında yaşanan kör veri sızıntısı tekrarlanır —
orada ölçülen gerçek sızıntı 1 çiftti.

---

## 6 · P3 — `soru_cevaplandi` olayının tüketicisi yok

### Sorun
`trg_akis_gorev_cevap` → `akis_olay_yaz_dongu()`, `ajan_gorevleri` üzerinde
**AFTER UPDATE**: `durum` `yapildi`ya döndüğünde `soru_cevaplandi` olayı yazıyor.
Bu olayı **kod hiçbir yerde okumuyor** ve `akis_kurallari`nda ona bağlı kural yok.
Canlıda 10 satır birikmiş.

**Zarar yok:** olaylar `islendi=true` işaretlenip düşüyor, döngü kurulmuyor.
Motorun 5. maddesi ("cevap gelince kol yeniden uyanır") zaten **sağlanıyor** —
ama olayla değil, `ajan-nobetci:1218`de sorunun gerekçesindeki `[kol:…]`
etiketiyle.

### Seçenekler
| | ne yapılır | bedeli |
|---|---|---|
| **A** | Tetikleyici kaldırılır; uyandırma bugünkü gibi `[kol:…]` ile sürer | Gürültü kalkar; uyandırma en fazla 3 dk gecikir (nöbetçi turu) |
| B | Olaya kural yazılır, uyandırma olaya bağlanır | Uyandırma anlıklaşır; yeni akış kolu ve test yükü |
| C | Bugünkü gibi kalır | Bedava; tüketicisiz olay birikmeye devam eder |

### Önerim
**A.** İki mekanizmadan biri gereksiz; çalışan olan `[kol:…]` yoludur ve 3 dakika
gecikme bu iş için önemsizdir.

### Kararın etkisi
Hiçbiri acil değildir. C seçilirse tablo büyümeye devam eder (bugün 10 satır);
B seçilirse iki uyandırma yolu birden olur ve mükerrer koşum riski doğar.
