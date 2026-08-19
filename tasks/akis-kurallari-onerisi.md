# AKIŞ KURALLARI ÖNERİSİ — yedi aşamanın olay haritası
19.08.2026 · agentic belkemiği 1. taş · ÖNERİDİR, veritabanına satır YAZILMADI.

Bu dosya `public.akis_kurallari` tablosuna hangi satırların yazılacağını ÖNERİR.
Kuralları kurucu okuyup onaylayacak, satırları kurucu yazacak. Burada SQL yoktur.

Okuma anahtarı — her satırda altı alan var:
`olay_kodu` · **sonraki adım** (hangi edge fonksiyon ya da "yok") · **sahip**
(taraf_ajani / masa_ajani / sistem) · **insan kapısı** (var/yok) · **gerekçe** ·
**bağlantı durumu** (● olay koda BAĞLANDI / ○ olay noktası YOK).

İnsan kapısı ölçütü (tek tek uygulandı):
· Çıktı yalnız arabulucuya görünüyorsa → kapı YOK.
· Çıktı tarafa gidiyor, imzaya gidiyor, hukuki nitelik taşıyor ya da geri
  alınamıyorsa → kapı VAR.
· Şüpheli olanlar gerekçesinde "şüpheli" notuyla kapı VAR yazıldı.

---

## AŞAMA 1 — DOSYA KURULUMU

● `uyusmazlik_turu_onerildi` — sonraki adım: **yok** · sahip: masa_ajani ·
  insan kapısı: **yok** · Tür önerisi yalnız arabulucuya görünür ve elle
  değiştirilebilir; kendiliğinden yapılacak bir sonraki adım yoktur.

● `taraf_daveti_gonderildi` — sonraki adım: **yok** · sahip: sistem ·
  insan kapısı: **yok** · Davet zaten arabulucunun düğmesiyle gitti; olay
  buradan sonrası için yalnız iz bırakır.

● `taraf_katilim_kabul_edildi` — sonraki adım: **yok** (2. taşta
  `taraf-asistan` ilk teması düşünülebilir) · sahip: taraf_ajani ·
  insan kapısı: **var** · Bu olaydan tetiklenecek her adım TARAFA yazar;
  ilk teması bugün nöbetçinin `ilk_temas` kolu insan kapısıyla yürütüyor,
  ikinci bir yol açmak çift mesaj üretir. (şüpheli → kapı var)

● `belge_yuklendi` — sonraki adım: **belge-ozeti** · sahip: masa_ajani ·
  insan kapısı: **yok** · Özet yalnız arabulucuya görünür, tarafa gitmez,
  geri alınabilir. TOHUM KURAL `belge_yuklendi__analiz` bu olayı kullanıyor.
  NOT: olay bugün `extract-document-text` içinden yazılıyor (yükleme anı ön
  yüzdedir); ayrıntı aşağıda "EKSİK OLAY NOKTASI" listesinde.

● `belge_ozeti_uretildi` — sonraki adım: **yok** · sahip: masa_ajani ·
  insan kapısı: **yok** · Özet üretimi zincirin sonudur; taraf analizini
  tetiklemek için taraf başına ayrı koşul gerekir (aşağıdaki `en_az_taraf`).

○ `ucret_hesaplandi` — sonraki adım: **yok** · sahip: sistem ·
  insan kapısı: **yok** · Hesap deterministiktir ve yalnız arabulucuya
  görünür. Olay noktası yok: `calculate-mediation-fee` veritabanına yazmıyor.

○ `yz_beyani_onaylandi` — sonraki adım: **yok** · sahip: sistem ·
  insan kapısı: **yok** · Onay tarafın kendi kaydıdır. Olay noktası ön yüzde.

○ `katilim_teyidi_alindi` — sonraki adım: **yok** · sahip: taraf_ajani ·
  insan kapısı: **yok** · `taraf-katilim` fonksiyonu cevabı yazıyor; olay
  eklenebilir, bu taşta bağlanmadı (nöbetçi zaten aynı cevabı okuyor).

## AŞAMA 2 — TARAF ANALİZİ

● `taraf_analizi_tamamlandi` — sonraki adım: **orchestrator-run** ·
  sahip: masa_ajani · insan kapısı: **yok** · Zincirin çıktısı yalnız
  arabulucuya görünür. KOŞUL önerisi: `{"en_az_taraf": 2}` — tek taraflı
  dosyada ortak zemin üretilmemeli.

○ `tutarlilik_kontrolu_tamamlandi` — sonraki adım: **yok** · sahip: masa_ajani ·
  insan kapısı: **yok** · Yalnız arabulucuya görünür. Olay bu taşta bağlanmadı;
  `party-consistency-check` içine tek satırla eklenebilir.

○ `iletisim_analizi_tamamlandi` — sonraki adım: **yok** · sahip: masa_ajani ·
  insan kapısı: **yok** · Aynı gerekçe.

● `analiz_zinciri_tamamlandi` — sonraki adım: **randevu-teklif** ·
  sahip: masa_ajani · insan kapısı: **var** · Randevu teklifi TARAFA gider.
  Bugün nöbetçinin `randevu_teklifi` kolu aynı işi yapıyor; bu kural açılırsa
  çift teklif riski doğar. Kapı VAR yazıldı ve 2. tura bırakılması önerilir.

## AŞAMA 3 — ARABULUCU PANELİ (KOKPİT)

● `ortak_zemin_raporu_uretildi` — sonraki adım: **yok** · sahip: masa_ajani ·
  insan kapısı: **yok** · Rapor yalnız arabulucuda kalır.

○ `dosya_ozeti_uretildi` · `olay_cizelgesi_uretildi` · `guc_dengesi_olculdu` ·
  `iletisimde_degisim_olculdu` · `elverislilik_kontrol_edildi` ·
  `usul_onerisi_uretildi` · `usul_engeli_tespit_edildi` —
  sonraki adım: **yok** · sahip: masa_ajani · insan kapısı: **yok** ·
  Hepsinin çıktısı yalnız arabulucu yüzeyindedir; kendiliğinden bir sonraki
  adımı yoktur. Nöbetçinin `otomatik_kosum` kolu bunları zaten sırayla koşuyor.
  Olay eklenmesi kolay (her birinin tek net yazım noktası var), bu taşta
  bağlanmadı — akış kuralı gerektirmedikleri için.

○ `son_tarih_tespit_edildi` — sonraki adım: **yok** · sahip: sistem ·
  insan kapısı: **yok** · `detect-legal-deadlines` cases satırını güncelliyor;
  hatırlatmayı bugün `deadline-reminder-cron` yürütüyor, ikinci yol açılmamalı.

○ `secenek_sepeti_uretildi` — sonraki adım: **yok** · sahip: masa_ajani ·
  insan kapısı: **yok** · Yalnız arabulucuya görünür.

○ `braket_girildi` / `ortusme_bulundu` — sonraki adım: **yok** ·
  sahip: masa_ajani · insan kapısı: **var** · Örtüşme bulgusu taraflara
  açılırsa kör teklif ilkesi kırılır; bu olaydan tetiklenen HİÇBİR otomatik
  adım taraf yüzeyine yazmamalıdır. (şüpheli → kapı var)

## AŞAMA 4 — TOPLANTI

○ `musaitlik_girildi` — sonraki adım: **randevu-teklif** · sahip: taraf_ajani ·
  insan kapısı: **var** · Teklif tarafa gider. Bugünkü nöbetçi kolu ile
  çakışmaması için kapı var.

● `oturum_planlandi` — sonraki adım: **hazirlik-foyu** · sahip: masa_ajani ·
  insan kapısı: **yok** · Föy TASLAK olarak açılır, tarafa gitmez, arabulucu
  onaylamadan hiçbir yere çıkmaz. TOHUM KURAL `oturum_planlandi__foy_hazirla`
  bu olayı kullanıyor. NOT: olay bugün yalnız `randevu-teklif` üzerinden
  (taraf saati kabul edince) yazılıyor; arabulucunun ekrandan elle açtığı
  oturum için olay noktası yok — aşağıdaki listede.

● `oturum_daveti_gonderildi` — sonraki adım: **yok** · sahip: sistem ·
  insan kapısı: **yok** · Davet zaten gitti; olay iz bırakır.

● `foy_taslagi_hazirlandi` — sonraki adım: **yok** · sahip: masa_ajani ·
  insan kapısı: **var** · Föyü tarafa gönderecek adım arabulucunun onayına
  bağlıdır (constitution m.3); kendiliğinden gönderim yasak.

○ `foy_onaylandi` — sonraki adım: **hazirlik-foyu-gonder** · sahip: masa_ajani ·
  insan kapısı: **yok** · Onay zaten insan kapısıdır; onaydan SONRA gönderim
  otomatiktir. TOHUM KURAL `foy_onaylandi__gonder` bu olayı kullanıyor.
  NOT: onay ön yüzde yazılıyor, olay noktası yok — aşağıdaki listede.
  (Bugün aynı işi "Onayla ve gönder" düğmesi tek tıkta yapıyor.)

● `foy_gonderildi` — sonraki adım: **yok** · sahip: sistem ·
  insan kapısı: **yok** · Gönderim kaydı ve nöbetçi doğrulaması ayrı yürüyor.

○ `oturum_degistirildi` / `oturum_iptal_edildi` — sonraki adım: **yok** ·
  sahip: sistem · insan kapısı: **yok** · Bildirimi bugün
  `send-reschedule-notification` / `cancel-meeting-invite` gönderiyor.

○ `oturum_yapildi` — sonraki adım: **yok** · sahip: masa_ajani ·
  insan kapısı: **var** · "Oturum yapıldı mı" sorusunu bugün nöbetçi
  arabulucuya soruyor; cevabı insan verir.

## AŞAMA 5 — BİLİRKİŞİ (OPSİYONEL)

○ `bilirkisi_onerildi` — sonraki adım: **yok** · sahip: masa_ajani ·
  insan kapısı: **var** · Bilirkişi seçimi taraf onayına bağlıdır.

○ `bilirkisi_taraf_onayi_alindi` — sonraki adım: **yok** · sahip: taraf_ajani ·
  insan kapısı: **var** · Atama hukuki sonuç doğurur, geri alınamaz.

○ `bilirkisi_atandi` · `bilirkisi_raporu_yuklendi` — sonraki adım: **yok** ·
  sahip: sistem · insan kapısı: **var** · Rapor delildir (constitution m.5);
  hiçbir ajan bu rapordan kendiliğinden işlem türetmemelidir.
  Bu aşamada HİÇ edge fonksiyon yok; tüm yazım ön yüzdedir.

## AŞAMA 6 — GÖRÜŞME NOTLARI

○ `gorusme_notu_eklendi` — sonraki adım: **analyze-meeting-notes** ·
  sahip: masa_ajani · insan kapısı: **yok** · Not analizi yalnız arabulucuya
  görünür. Olay noktası yok: not ön yüzden `case_notes`'a yazılıyor.

○ `gorusme_notu_analiz_edildi` — sonraki adım: **yok** · sahip: masa_ajani ·
  insan kapısı: **yok** · `analyze-meeting-notes` veritabanına HİÇBİR ŞEY
  yazmıyor, sonucu doğrudan döndürüyor; net bir bitiş noktası yok.

○ `oturum_kaydi_dokuldu` — sonraki adım: **yok** · sahip: sistem ·
  insan kapısı: **var** · Kayıt ve döküm rızaya bağlıdır (constitution m.10);
  silme takvimini bugün nöbetçinin `kayit_silme` kolu yürütüyor.

## AŞAMA 7 — BELGELER VE KAPANIŞ

○ `anlasma_taslagi_uretildi` — sonraki adım: **yok** · sahip: sistem ·
  insan kapısı: **var** · Belge hukuki nitelik taşır; hiçbir ajan belgeye
  dokunamaz, taslağı insan düzeltir (constitution m.5).

○ `resmi_belge_uretildi` — sonraki adım: **yok** · sahip: sistem ·
  insan kapısı: **var** · Aynı gerekçe. `generate-official-document` yalnız
  şablon okuyor, üretilen belgeyi ön yüz kaydediyor — net olay noktası yok.

○ `anlasma_belgesi_imzalandi` — sonraki adım: **yok** · sahip: sistem ·
  insan kapısı: **var** · İmza geri alınamaz.

○ `dosya_kapatildi` — sonraki adım: **yok** · sahip: sistem ·
  insan kapısı: **var** · Kapanış onaylarını bugün nöbetçinin `kapanis` kolu
  arabulucu onayıyla yürütüyor.

---

## (a) BAĞLANAMAYANLAR — hangi yetenek neden olaya bağlanamıyor

1. **Aşama 5'in tamamı (bilirkişi).** Bu aşamanın hiçbir adımı edge fonksiyona
   dayanmıyor; seçim, taraf onayı, atama ve rapor yükleme ön yüzden doğrudan
   veritabanına yazılıyor. Sunucu tarafında yakalanacak bir an yok.
2. **`calculate-mediation-fee`.** Hesabı döndürüyor, yazmıyor. "Ücret
   hesaplandı" diye bir kalıcı an yok.
3. **`analyze-meeting-notes`.** Analizi döndürüyor, yazmıyor. Aynı sorun.
4. **`generate-official-document`.** Şablonu ve doldurulmuş içeriği döndürüyor;
   belgenin üretildiği kalıcı kayıt ön yüzde oluşuyor.
5. **`case-qa` · `taraf-asistan` · `dosya-ozeti-oner` gibi soru-cevap
   yüzeyleri.** Bunlar akış adımı değil, danışma yüzeyi. Bilerek dışarıda
   bırakıldı — olay yazılırsa akış kaydı gürültüye boğulur.
6. **Bilgi tabanı / yönetici araçları** (`build-knowledge-base`,
   `admin-*`, `seed-*`, `check-new-tariff`): dosya akışının parçası değil.

## (b) EKSİK OLAY NOKTASI — kodda bitişi anlayacak net yer yok, ne gerekir

1. **`belge_yuklendi` — gerçek yükleme anı ön yüzde.** Bugün olay
   `extract-document-text` içinden yazılıyor; her yükleme yolu (CaseRoom,
   MediationEngine iki yer, ExpertWitness) bu fonksiyonu yüklemeden hemen
   sonra çağırdığı için pratikte her yüklemede olay düşüyor. TAM kapsama için
   ya ön yüzde tek satırlık bir çağrı ya da `case_documents` üzerinde bir
   veritabanı tetikleyicisi gerekir. Bugünkü hâlde, çıkarma fonksiyonu hiç
   çağrılmazsa olay da yazılmaz.
2. **`foy_onaylandi` — onay ön yüzde yazılıyor.** `HazirlikFoyuPanel` föy
   satırını doğrudan `onaylandi` yapıyor; sunucuda yakalanacak an yok.
   Gerekli: ya ön yüzden olay yazımı, ya `oturum_hazirlik_foyleri` üzerinde
   durum değişimini yakalayan tetikleyici, ya da nöbetçiye "onaylanmış ama
   olayı yazılmamış föy" taraması. TOHUM KURAL `foy_onaylandi__gonder` bu
   nokta kurulana kadar tetiklenmez.
3. **`oturum_planlandi` — yalnız yarısı bağlı.** Taraf randevu teklifini
   kabul edince olay yazılıyor; arabulucu ekrandan elle oturum açtığında
   (SessionScheduler) yazılmıyor. Gerekli: ön yüzden olay yazımı ya da
   `case_sessions` insert tetikleyicisi.
4. **Aşama 6 — `gorusme_notu_eklendi`.** Not `case_notes`'a ön yüzden
   yazılıyor. Gerekli: tetikleyici ya da ön yüz çağrısı.
5. **Aşama 7 — belge üretimi ve imza.** Üretilen belgenin kaydı ön yüzde
   oluşuyor; imza akışının sunucu karşılığı yok. Gerekli: belge kaydının
   sunucuya taşınması (ayrı ve büyük bir iş — belge üretimi kritik yoldur,
   constitution m.8 gereği tek başına ele alınmalı).
6. **Aşama 5 — bilirkişi.** (a).1 ile aynı; olay noktası için önce sunucu
   tarafı bir yazım noktası gerekir.

---

## NOT — bu taşta veritabanına HİÇBİR KURAL YAZILMADI
Tabloda hazır duran üç tohum kural (`belge_yuklendi__analiz` ·
`oturum_planlandi__foy_hazirla` · `foy_onaylandi__gonder`) değiştirilmedi,
silinmedi, üzerine yazılmadı. Yukarıdaki satırlar öneridir; hangilerinin
tabloya gireceğine kurucu karar verir.

Koşucunun bugün anladığı TEK koşul `{"en_az_taraf": N}`'dir. Tanımadığı bir
koşul anahtarı görürse kuralı ÇALIŞTIRMAZ, atlar ve sebebini yazar.
