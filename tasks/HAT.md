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

### H-15 · 25.08.2026 · P1 — Pilot kapısındaki son dört karar
**Sorun.** Pilot kuyruğunun 14 maddesinden **10'u kapandı**. Kalan beşin biri
(taraf akışının telefonda denenmesi) kurucunun elinde; **dördü ise iş değil
KARAR bekliyor.** Code bunları tek başına bitiremez: dördü de ürün/hukuk
kararıdır (§7.1, §7.2). Karar geldiğinde uygulaması kısadır.

---
**1) Saklama süreleri (P1 · hukuki).** §15.2: "saklama süreleri **parametre
tablosundan** okunuyor ve periyodik imha çalışıyor." Bugün süre **kodda
sabit** ve yalnız oturum kaydı için var (24 saat); diğer türler için süre
kavramı hiç yok — constitution m.10 açısından açık.

Code tabloyu **yazdı, çalıştırmadı** (§10): `tests/gecici/saklama-suresi-politika.sql`.
Tablo **değer olmadan** kuruluyor: `saklama_gun` NULL → imha kolu o türe
**dokunmaz**, yani karar gelmeden hiçbir şey silinmez.

Karar gereken: her tür için kaç gün, sayaç ne zaman başlar.
| tür | önerim | gerekçe |
|---|---|---|
| `oturum_kaydi_ses` | 0 (anında) | Zaten öyle çalışıyor (H-14 şart 1) |
| `oturum_kaydi_dokum` | dosya kapanışı + 1 yıl | Arabuluculuk dosyası saklama teamülü |
| `case_documents` | dosya kapanışı + 1 yıl | Taraf belgeleri; itiraz süresi geçsin |
| `case_notes` | dosya kapanışı + 1 yıl | Analiz zinciriyle birlikte |
| `dosya_kapanis_sonrasi` | dosya kapanışı + 1 yıl | Anonim kapanış kaydı kalır |
**Bu bir hukuk kararıdır** — önerim teamüle dayalıdır, hukuki görüş değildir.

---
**2) Arabulucunun anteti / şablonu (P1 · ürün).** §15.2: "kendi anteti/IBAN'ı/
şablonuyla uçtan uca dosya yürütüyor."
· **IBAN: ÇÖZÜLDÜ** — `profiles.iban`/`banka_adi` var ve ödeme bilgisi PDF'ine
  `get_case_mediator_payment_info` ile akıyor.
· **Antet/logo: YOK.** `profiles`ta logo ya da adres kolonu yok.
· **Kendi şablonu: YOK.** Şablonlar admin tarafından **genel** yükleniyor
  (`admin-upload-template`); arabulucuya özel şablon kavramı yok.

| | ne yapılır | bedeli |
|---|---|---|
| **A** | Antet (logo + adres) profile eklenir; belgelerin başlığına basılır. Şablon **genel kalır** | Küçük: bir göç + belge motoruna iki alan. Pilot için yeter |
| B | Ayrıca arabulucu başına şablon yükleme | Şablon sürüm yönetimi, doğrulama, çakışma — pilot öncesi büyük |
| C | Bugünkü hâl | Belgeler antetsiz çıkar |
**Önerim: A.** Pilotta arabulucunun kendi antetiyle belge üretmesi görünür bir
ihtiyaç; kendi şablonunu yüklemesi değil.

---
**3) Üyelik / paket / kota (P1 · ticari).** Tablo yok, kod yok. Karar: hangi
paketler, hangi kota (dosya sayısı? ajan koşumu?), kota dolunca ne olur (engelle
mi, uyar mı). **Önerim: pilotta kota YOK** — pilot 5–10 arabuluculu ve 3 ay
ücretsiz; kota mekanizması pilot verisi olmadan yanlış kurulur. Pilot sonrası
gerçek kullanım rakamlarıyla tasarlanmalı. Bu seçilirse madde "pilot sonrası"
diye işaretlenir ve pilot kapısından düşer.

---
**4) Kazanım sayacı (P1 · ürün).** §15.2: "baz çizgi alınıyor ve dosya bazında
saat üretiyor." Tablo yok, kod yok. Karar: **"kazanım" nedir** — neyin baz
çizgisi (arabulucunun elle yaptığı sürenin tahmini mi, dava süresi mi), saat
nasıl sayılır. **Önerim:** dosya başına *ajanın ürettiği çıktıların elle
hazırlanma süresi tahmini* (belge üretimi, analiz, föy) — sabit katsayılarla,
kaynağı açıkça yazılarak. Uydurma rakam üretmemek için katsayılar görünür olmalı
(§15.1 camdan kutu). Katsayıları kurucu verir.

---
**Kararın etkisi.** 1 karara bağlanmadan periyodik imha kurulamaz (m.10 açık
kalır). 2/A seçilmezse belgeler antetsiz çıkar. 3'te "pilotta kota yok" denirse
pilot kapısı bir madde kısalır. 4 tanımsız kalırsa sayaç ya hiç yapılmaz ya da
uydurma rakam üretir — ikincisi kabul edilemez.


## COWORK → CODE

_Cevaplar buraya yazılır. Biçim:_

```
### H-<no> · CEVAP · <tarih>
Seçim: A / B / C / (kendi metniniz)
Not: (varsa)
```

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
**1) SAKLAMA SÜRELERİ · Seçim: A — TEK ÇATI, 5 YIL.**
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
