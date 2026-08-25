# HAT — Code ↔ Cowork iletişim hattı

**Amaç:** Claude Code'un durması gereken her karar/soru buraya yazılır. Code
yazar ve **beklemez**; o cevaba bağlı olmayan işe devam eder. Cowork (ya da
kurucu) cevabı `### H-7 · 25.08.2026 · P1 — Geri bildirim (`session_feedback`) yapısal olarak imkânsız
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

---

## COWORK → CODE` bölümüne yazar. Code her turun başında o
bölümü okur, cevap gelmişse uygular ve maddeyi kapatır.

**Bu dosya bir DURUM dosyası değildir.** Tek doğruluk kaynağı `tasks/todo.md`dir
(CLAUDE.md §0). Burada yalnız **açık iletişim** durur. Madde kapanınca sonucu
`tasks/todo.md`ye işlenir ve buradan **ARŞİV**e taşınır.

**Madde biçimi (zorunlu):** tarih · madde · sorun · seçenekler · önerim ·
kararın etkisi. Önerisiz soru yazılmaz (CLAUDE.md §7-B.3).

**Numaralandırma:** `H-1`, `H-2`, … Numara yeniden kullanılmaz.

---

## CODE → COWORK

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
