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

### H-6 · 24.08.2026 · P2 — Sahip-taraf guard'ı hangi tablolara kadar gitsin?
**Sorun.** P0 kararı (A) uygulandı: taraf-gizli tablolarda sahip, o dosyanın
tarafıysa arabulucu yetkisi verilmiyor. Beş tabloya uygulandı, sonra taramada
altıncısı çıktı ve **açıkça belgeli** olduğu için o da uygulandı
(`kayit_onaylari` — `CaseRoom.tsx:1292`: *"karşı tarafın onay verip vermediği bu
ekrana hiçbir yoldan yazılmaz"*).

Geriye **`is_case_owner_safe` kullanan 22 politika** kaldı. Bunlar üç öbekte:

| öbek | tablolar | değerlendirmem |
|---|---|---|
| **Zaten güvenli** — sahiplik dar | `case_documents` (`uploaded_by = auth.uid()`), `case_parties` (kendi satırı / `mediator` rolü şartlı) | dokunma |
| **Dosya yönetimi** — A kararı gereği sahipte kalmalı | `case_parties` ekleme/silme, `cases_private_keys`, `cases_vector_pool` | dokunma |
| **BELİRSİZ** — karar gerekiyor | `ajan_bellek`, `ajan_deneyim`, `ajan_kosum_izi`, `ajan_onerileri`, `akis_olaylari`, `akis_duraklatma`, `arabulucu_talimatlari`, `bilirkisi_evrak_kumesi`, `bilirkisi_onerileri`, `bilirkisi_raporlari`, `dosya_kapanis`, `elverislilik_kontrol`, `foy_gonderim_kayitlari`, `iletisim_degisim`, `kayit_onay_talepleri`, `usul_engelleri`, `usul_onerileri` | **soru bu** |

Belirsiz öbek iki türlü okunabilir: (a) bunlar *arabulucunun kendi çalışma
kayıtlarıdır*, dosya sahibi görebilir; (b) içlerinde taraf içeriği geçtiği için
sahip-taraf görmemeli. Dördünde `party_id` sütunu var (`ajan_bellek`,
`akis_olaylari`, `foy_gonderim_kayitlari`, `iletisim_degisim`) — yani en azından
onlar taraf ayrımı taşıyor.

**Seçenekler.**
| | ne yapılır | bedeli |
|---|---|---|
| **A** | Yalnız `party_id` taşıyan dördüne guard uygulanır; kalan 13 dokunulmaz | Dar ve ölçülebilir; taraf ayrımı taşıyanlar kapanır |
| B | Belirsiz öbeğin tamamına (17 politika) guard uygulanır | En muhafazakâr; self-servis sahibin kendi dosyasında ajan kayıtlarını göremeyeceği anlamına gelir |
| C | Hiçbirine dokunulmaz; beş+bir tablo yeterli sayılır | Bedava; taraf içeriği sızabilecek yüzeyler açık kalır |

**Önerim: A.** `party_id` taşımak, ürünün o tabloda taraf ayrımı yaptığının
somut işaretidir; gerisi arabulucunun kendi çalışma kaydı sayılabilir.
B, self-servis başvurucunun kendi dosyasında ajan penceresini boşaltır.

**Kararın etkisi.** C seçilirse `ajan_bellek` · `akis_olaylari` ·
`foy_gonderim_kayitlari` · `iletisim_degisim` üzerinden sahip-taraf, karşı tarafa
ait satırları görebilir. A ve B bunu kapatır; B ayrıca arabulucu çalışma
kayıtlarını da sahibe kapatır (self-servi̇ste işlevsellik kaybı olabilir).

---

### H-1 · 24.08.2026 · P1 — `CRON_SECRET` değerinin yenilenmesi ⚠️ ACİL
**Sorun.** Cron sırrı `cron.job.command` içinde düz metin duruyordu. Saklama
yeri düzeltildi: değer Vault'a taşındı, altı cron işi çalışma anında
`vault.decrypted_secrets`ten okuyor, `cron.job`ta düz metin sır **0**. **Ama
değer değişmedi** — ve 24.08 oturumunda maskeleme denemem tutmadığı için
(jobid 3/7 `jsonb_build_object` biçimini kullanıyor, desenim JSON biçimini
hedefliyordu) değer **oturum dökümüne girdi**. Hiçbir dosyaya, commit'e ya da
mesaja yazılmadı.
**Bunu Code yapamaz — yapısal sebeple:** yeni değeri üretse ya da okusa değer
yine bağlamına girer, yenilemeyi baştan boşa çıkarır.

**Seçenekler.**
| | ne yapılır | bedeli |
|---|---|---|
| **A** | Runbook ile yenile (2 adım) | En fazla bir nöbetçi turu (3 dk) 401; iş kaybı yok, tur yeniden koşar |
| B | Geçiş kipi: fonksiyonlar geçici olarak eski VE yeni sırrı kabul eder | Kesinti sıfır; `CRON_SECRET` okuyan her fonksiyonda kod değişikliği + iki fan-out |
| C | Yenilenmez | Sır oturum dökümünde geçerli kalır |

**Önerim: A.** Kesinti bir turdur ve zararsızdır; B'nin kod maliyeti bu risk
için fazladır.

**Runbook (A).**
1. Yeni bir sır üret (ör. `openssl rand -base64 32`). **Code'a gösterme.**
2. Supabase → Edge Functions → Secrets: `CRON_SECRET` değerini yenisiyle güncelle.
3. Hemen ardından (cron tanımlarına DOKUNMAZ, hepsi Vault'tan okuyor):
   `select vault.update_secret((select id from vault.secrets where name='cron_secret'), '<YENİ DEĞER>', 'cron_secret', 'Edge function cron kapisi (x-cron-secret)');`
4. 3 dk sonra: `select status_code, created from net._http_response order by created desc limit 3;` → **200** olmalı.

**Kararın etkisi.** C seçilirse sır geçerli kalır ve döküme erişimi olan herkes
cron kapısını açabilir. A/B sonrası eski değer işe yaramaz hâle gelir.

---

### H-2 · 24.08.2026 · P2 — İmza akışı yok
**Sorun.** `agreement_documents.signed_by` sütunu **hiçbir yüzeyden yazılmıyor**
(tarandı; eşleşenlerin hepsi farklı bir sütun olan `assigned_by`). Şema ve
tetikleyici hazır: `signed_by` değişince `anlasma_belgesi_imzalandi` olayı
doğacak. İmza yüzeyi olmadığı için o olay **hiç doğmuyor** ve ona bağlanacak
hiçbir akış çalışamaz. Kusur değil, **eksik özellik**: imza beş insan kapısından
biridir (§13 · constitution), davranışı kendiliğinden eklenmez.

**Seçenekler.**
| | ne yapılır | bedeli |
|---|---|---|
| **A** | Islak imza: arabulucu imzalı belgeyi yükler, `signed_by` + tarih işaretlenir | En az iş, mevcut belge akışına oturur; hukuki dayanak alışıldık |
| B | Uygulama içi tıklayarak onay (e-imza değil) | Orta iş; hukuki değeri tartışmalı, tutanağa ayrı dayanak gerekir |
| C | Nitelikli e-imza (e-Devlet/KEP) | En yüksek hukuki değer; en yüksek iş, pilotu geciktirir |

**Önerim: A** (pilot için). Islak imza Türk arabuluculuk pratiğinde yerleşiktir.

**Kararın etkisi.** Karar verilmeden imza kapısı boş kalır; anlaşma belgesinin
imzalandığı sistemde **hiçbir yerde kayıtlı olmaz** ve kapanış zinciri
(imza → olay → akış) hiç çalışmaz.

---

### H-3 · 24.08.2026 · P3 — Eski şema adası kaldırılsın mı
**Sorun.** `mediator_requests` (0 satır) ve `reschedule_requests` (0 satır, FK'si
ötekine) ile bunlara dayanan dört dosya terk edilmiştir:
`send-session-notification` (uygulamada çağrılmıyor),
`send-reschedule-notification` (iki bileşenden çağrılıyor ama o bileşenler
hiçbir yerden import edilmiyor), `RescheduleRequest.tsx`, `RescheduleApproval.tsx`.
**Canlı kusur YOK.** Ama **tuzak**: canlı görünüyor, sorgusu sessizce boş dönüyor,
"yapacak bir şey yok" sanılıp 200 dönülüyor. 24.08'de tam olarak bu oldu —
`send-session-reminders` aynı tabloyu sorguluyordu ve **oturum hatırlatmaları
hiç gönderilmiyordu**; üç tur kaybettirdi. Dört dosyanın başına uyarı konuldu.

**Seçenekler.**
| | ne yapılır | bedeli |
|---|---|---|
| **A** | Kod dosyaları silinir, tablolar DURUR | Tuzak kalkar, veri kaybı riski yok |
| B | Kod + tablolar birlikte silinir | En temiz; tablo silmek geri dönüşsüzdür (§7.3) |
| C | Hiçbir şey silinmez, yalnız uyarı kalır (bugünkü durum) | Bedava; sonraki okuyan yine yanılabilir |

**Önerim: A.** Tuzağın kaynağı koddur; tabloyu silmenin acelesi yok.

**Kararın etkisi.** B geri alınamaz. C seçilirse tuzak durur; uyarı yardımcı
olur ama garanti değildir.

---

### H-4 · 24.08.2026 · P3 — Kayıt kovasına dar okuma politikası
**Sorun.** `oturum-kayitlari` kovası 24.08'de açıldı (özel; istemciye hiçbir
politika verilmedi — deny-by-default). Silme kolu servis rolüyle çalıştığı için
sorun yok. Ama arabulucunun kaydı **uygulamadan** dinlemesi gerekirse dar bir
okuma politikası gerekecek. **Şu an yazılamaz:** yükleme yolu henüz kodlanmadığı
için dosya yolu düzeni belli değil; politika için desen **uydurmak** gerekirdi.

**Seçenekler.**
| | ne yapılır | bedeli |
|---|---|---|
| **A** | Kayıt hattı yazılırken yol düzeni belirlenir, sonra dar politika eklenir | Doğru sıra; şimdi iş yok |
| B | Şimdi bir yol düzeni dayatılır ve politika yazılır | Hattı yazanı bağlar; yanlış tahminde iki kez iş |
| C | Politika hiç yazılmaz; arabulucu kaydı yalnız edge function üzerinden (imzalı bağlantı) dinler | En güvenli; her dinleme için sunucu turu |

**Önerim: A**, ve hattı yazan kişi **C**'yi ciddi değerlendirsin: onay metni
"kayıt ve dökümü **yalnız arabulucu** görür" diyor.

**Kararın etkisi.** Pilotu bloke etmez (kayıt hattı henüz yok). Ama politika
**geniş** yazılırsa 24.08'de belge kovasında yaşanan kör veri sızıntısı
tekrarlanır — orada ölçülen gerçek sızıntı 1 çiftti.

---

### H-5 · 24.08.2026 · P3 — `soru_cevaplandi` olayının tüketicisi yok
**Sorun.** `trg_akis_gorev_cevap` → `akis_olay_yaz_dongu()`, `ajan_gorevleri`
üzerinde AFTER UPDATE: `durum` `yapildi`ya döndüğünde `soru_cevaplandi` olayı
yazıyor. Bu olayı **kod hiçbir yerde okumuyor** ve ona bağlı kural yok. Canlıda
10 satır birikmiş. **Zarar yok:** olaylar `islendi=true` işaretlenip düşüyor.
Motorun 5. maddesi ("cevap gelince kol yeniden uyanır") zaten sağlanıyor — ama
olayla değil, `ajan-nobetci:1218`de `[kol:…]` etiketiyle.

**Seçenekler.**
| | ne yapılır | bedeli |
|---|---|---|
| **A** | Tetikleyici kaldırılır; uyandırma bugünkü gibi `[kol:…]` ile sürer | Gürültü kalkar; uyandırma en fazla 3 dk gecikir |
| B | Olaya kural yazılır, uyandırma olaya bağlanır | Uyandırma anlıklaşır; yeni akış kolu ve test yükü |
| C | Bugünkü gibi kalır | Bedava; tüketicisiz olay birikmeye devam eder |

**Önerim: A.** İki mekanizmadan biri gereksiz; çalışan olan `[kol:…]` yoludur.

**Kararın etkisi.** Hiçbiri acil değildir. C seçilirse tablo büyümeye devam eder;
B seçilirse iki uyandırma yolu birden olur ve mükerrer koşum riski doğar.

---

## COWORK → CODE

_Cevaplar buraya yazılır. Biçim:_

```
### H-<no> · CEVAP · <tarih>
Seçim: A / B / C / (kendi metniniz)
Not: (varsa)
```

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

### H-0 · 24.08.2026 · P0 — Self-servis başvuruda kör veri kırılıyor · **KAPANDI**
**Karar: A** (kurucu, 24.08). Taraf-gizli beş tabloda (`oturum_hazirlik_foyleri`,
`taraf_kalemleri`, `bilirkisi_secim_beyani`, `bilirkisi_taraf_yanitlari`,
`oturum_kayitlari`) sahip yetkisi, sahip aynı zamanda TARAF ise verilmez; dosya
yönetimi sahipte kalır. Uygulandı ve canlıda doğrulandı — ayrıntı
`tasks/todo.md`dedir.
