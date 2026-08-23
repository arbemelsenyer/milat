# tasks/durum-ayiklama.md — 41 (gerçekte 48) bayat maddenin dökümü
Tarih: 23.08.2026 · Yapan: Code · Kaynak iş kalemi: todo.md blok 105, "AÇIK KUSURLAR 5"

NEDEN BU DOSYA: `tasks/todo.md`'nin alt kısmındaki işaretlenmemiş maddeler
BAYATTIR — kutuya bakarak ne "yapılmış" ne "yapılmamış" sayılabiliyordu. Her madde
için üründe AD DEĞİL İŞLEV arandı (16.08 dersi) ve BİTTİ / YARIM / YOK yazıldı.

YÖNTEM: her madde için ilgili edge fonksiyon, tablo adı ve ekran yüzeyi ayrı ayrı
grep'lendi. "BİTTİ" = işlevi yapan kod VE onu çağıran bir yüzey var. "YARIM" = biri
var, öteki yok (ya da işlevin bir parçası eksik). "YOK" = üründe karşılığı bulunamadı.
CANLI TEST bu dökümün konusu DEĞİLDİR: buradaki "BİTTİ" kodun varlığıdır, canlıda
çalıştığının kanıtı değildir. Sayı: todo.md "41" diyordu, işaretsiz madde sayısı 48.

TODO.MD KUTULARINA DOKUNULMADI — kutuları işaretlemek kurucunun kararıdır.

---

## 1) BİLİRKİŞİ KATMANI (todo.md:647-653) — 7 madde
Yedisi de blok 104'te (20.08) ayrıca [x] işaretli; alttaki liste eski kopyadır.

| # | Madde | Durum | Dayanak |
|---|---|---|---|
| 647 | 1 · Beyan | BİTTİ | bilirkisi-secim/index.ts:313 `beyan_yaz` · :349 `beyanim` |
| 648 | 2 · Alan + aday | BİTTİ | bilirkisi-secim/index.ts:365 `aday_cikar` · :484 `aday_oner` |
| 649 | 3 · Sunum + kör perde + ikinci tur + tıkanma | BİTTİ | :539 `ilerlet` · :622 `liste` · :742 `tikanma` |
| 650 | 4 · Atama + davet + kabul | BİTTİ | :770 `ata` · supabase/functions/bilirkisi-davet |
| 651 | 5 · Bilirkişi ekranı iki kademe | BİTTİ | src/pages/BilirkisiEkrani.tsx · bilirkisi-ekranim · bilirkisi-belge-baglantisi |
| 652 | 6 · Evrak kümesi + dış aday | BİTTİ | :833 `evrak_oner` · :923 `evrak_onayla` · :1013 `dis_aday` |
| 653 | 7 · Rapor + 14/21 gün nöbetçi | BİTTİ | :1031 `rapor_yorumu` · :1062 `raporlar` · ajan-nobetci bilirkisiKollari |

## 2) TEKİL MADDELER

| # | Madde | Durum | Dayanak |
|---|---|---|---|
| 1729 | (c) mimari/10 "Faz 4" → Aşama 3 düzeltmesi | BİTTİ | mimari/10-arayuz-katmani.md "Aşama 3 — Arabulucu Paneli / kokpit (14.08'e kadar 'Faz 4')" — commit e842b8d |
| 1910 | Taslak denetimi (şablona bağlandı) | YARIM | supabase/functions/taslak-denetim/index.ts (146 satır, taslagiDenetle gerçek) + yüzey MediationEngine.tsx · AjanPenceresi.tsx. KOD VAR, tutanak şablonları yüklenmedi — kurucu kararıyla bekliyor |
| 2821 | Dürüstlük bandı canlı testi | YAPILMADI | kod 12.08'de yazıldı; canlı test kurucuda, redeploy bekliyor |

## 3) İBA A) GENEL — 12 madde

| # | Madde | Durum | Dayanak |
|---|---|---|---|
| A1 | Belge özeti | BİTTİ | supabase/functions/belge-ozeti · yüzey src/pages/MediationEngine.tsx. Canlıda denenmedi |
| A2 | Kaynak künyesi kuralı (bağlayıcı) | YARIM | Sunucu elemesi tek yerde var (_shared/anlatim.ts:1065 sinirDenetle · :1047 dayanaksizRakamMi) ve kalem kayıtlarında dayanak alanı var (anlatim.ts:235 `dayanak_alinti`, `dayanak_belge_id`). ÜRÜN GENELİNDE zorunlu değil: her ajanın çıktı şemasında dayanak alanı yok, "doğrulanmamış" etiketi hiçbir yüzeyde bulunamadı |
| A3 | İçtihat/mevzuat kaynağı | YARIM | build-legal-knowledge · legal_precedents · approve-pending-mevzuat · check-new-tariff · KnowledgeBaseAdmin var. Yüklenen özet kolu (a) kurulu; resmî arşive ANLIK bağlanan açık kaynak servis kolu (b) bulunamadı |
| A4 | İletişimdeki değişim işareti | BİTTİ | supabase/functions/iletisim-degisim · yüzey MediationEngine.tsx. Canlıda denenmedi |
| A5 | İletişim tercihi katmanı | YARIM | Ekran ve tablo var (src/pages/NotificationSettings.tsx · notification_preferences). TÜKETEN YOK: supabase/functions altında tabloyu okuyan tek satır yok — 18.08 dersi hâlâ geçerli |
| A6 | PWA + telefonla giriş | YOK | manifest.json yok · signInWithOtp yok · serviceWorker yok |
| A7 | WhatsApp işletme hattı | BİTTİ (karar kapsamında) | Karar "sonraya"ydı; ara çözüm olan tek tık düğmesi var (src/lib/phone.ts · SessionScheduler.tsx · MediationEngine.tsx `wa.me`) |
| A8 | Oturum dökümü analizi | YARIM | analyze-meeting-notes + MeetingNotesPanel.tsx var (not analizi çalışıyor). DÖKÜM (transkript) üretme hattı yok; analiz elle girilen nota bağlı |
| A9 | Sessiz canlı kokpit | YOK | canli_kokpit · "Sessiz Kokpit" · "kalan süre" — üçü de üründe geçmiyor |
| A10 | Seçenek sepeti | YARIM | generate-options fonksiyonu var ama BAŞVURU ekranında (src/components/intake/steps/StepAiExploration.tsx). A10'un tarif ettiği "yalnız arabulucuya, para dışı seçenekler + hangi ihtiyacı karşıladığı" sepeti ayrı yüzey olarak yok |
| A11 | Kişisiz istatistikten öğrenme | YARIM | src/pages/OutcomeAnalytics.tsx var (sonuç istatistiği). "Dönem sonu geri bildirimi" üreten kol bulunamadı |
| A12 | Oturum erteleme tutanağı + ajan bildirimi | YOK | `oturum_erteleme` yalnız şablon TÜRÜ olarak listelerde geçiyor (KnowledgeBaseAdmin.tsx:77 · TemplateAdmin.tsx:62 · ProcessTrackerPanel.tsx:33). Şablon seed'de yok, ajan gönderimi yok |

## 4) İBA B) ARABULUCU — 10 madde

| # | Madde | Durum | Dayanak |
|---|---|---|---|
| B13 | Elverişlilik kontrolü | BİTTİ | supabase/functions/elverislilik · yüzey MediationEngine.tsx · AgentControlPanel.tsx. Canlıda denenmedi |
| B14 | Usul önerisi | BİTTİ | supabase/functions/usul-onerisi · yüzey MediationEngine.tsx. Canlıda denenmedi |
| B15 | Olay zaman çizelgesi | BİTTİ | supabase/functions/olay-cizelgesi · yüzey MediationEngine.tsx. Canlıda denenmedi |
| B16 | Güç dengesizliği işareti | BİTTİ | supabase/functions/guc-dengesi · yüzey MediationEngine.tsx. Canlıda denenmedi |
| B17 | Usule ilişkin engel listesi | BİTTİ | supabase/functions/usul-engeli · yüzey MediationEngine.tsx. Canlıda denenmedi |
| B18 | Kayıt protokolü | YARIM | kayit_onaylari tablosu + iki yüzey var (MediationEngine.tsx:1994/2030 · CaseRoom.tsx:1307/1327). EKSİK: 48 saatlik önden onay süresi ve "onay yoksa kayıt açılmaz" kapısı create-video-room/index.ts'te YOK; harici araç yasağı ve 24 saatte silme kuralı koda geçmemiş |
| B19 | Teklif değerlendirme | BİTTİ | "Teklif Değerlendirme" kartı MediationEngine.tsx · `teklif_degerlendir` görev tipi AjanPenceresi.tsx · AgentControlPanel.tsx · CaseRoom.tsx |
| B20 | Tıkanma çözücü | YOK | tikanma_cozucu · "Tıkanma Çözücü" üründe geçmiyor. (Bilirkişi kolundaki `tikanma` adımı BAŞKA bir iştir: aday tıkanması) |
| B21 | Taslak denetimi | YARIM | 1910 ile aynı madde — bkz. yukarısı |
| B22 | Fatura / makbuz takibi | BİTTİ | Ödeme & Muhasebe paneli (MediationEngine.tsx) · src/lib/invoice-pdf.ts · Makbuz No sütunu. 16.08'de mükerrer bölüm açılıp geri alınmıştı (1aa6b96) |

## 5) İBA C) TARAF VE VEKİL — 4 madde

| # | Madde | Durum | Dayanak |
|---|---|---|---|
| C23 | Tarafa oturum hazırlık föyü | BİTTİ | supabase/functions/hazirlik-foyu + hazirlik-foyu-gonder · yüzey MediationEngine.tsx · AjanPenceresi.tsx |
| C24 | Her tarafa kendi ajanı | BİTTİ | supabase/functions/taraf-asistan · taraf-kalem-cikar · party-confidential-analysis · yüzey CaseRoom.tsx · AjanPenceresi.tsx (taraf dalı) |
| C25 | "Verilerim" sayfası | BİTTİ | src/pages/Verilerim.tsx · yol src/App.tsx · menü src/components/AppSidebar.tsx · silme kolu dosya-verilerini-sil |
| C26 | Vekil ekranı | YOK (kararla sonraya) | Kararın kendisi "pilotta YOK" diyor; üründe de karşılığı yok |

## 6) İBA D) ETİK / KURUMSAL — 3 madde

| # | Madde | Durum | Dayanak |
|---|---|---|---|
| D27 | YZ kullanım beyanı | BİTTİ | src/pages/YapayZekaBeyani.tsx · yz_beyan_onaylari tablosu · taraf ilk girişinde kapı (mimari/10, 13.08 kaydı) |
| D28 | "Ne yapar / ne yapmaz" tanıtım ekranı | YOK | "Ne Yapar" · TanitimEkrani üründe geçmiyor |
| D29 | Denetim izi | YARIM (kararla ERTELENDİ) | Ajan tarafı yazılıyor (ajan_gorevleri · braket denetim izi · nöbetçi gerekçeleri · AgentControlPanel.tsx denetim izi). İNSAN tarafı (arabulucunun düzenleme/onay/ret kaydı) için TEK KAYIT KAPISI kurulmadı. 16.08 kararı: pilot dışarı açılmadan önce |

## 7) 14.08 İBA KARAR LİSTESİ — 9 madde

| # | Madde | Durum | Dayanak |
|---|---|---|---|
| 1 | BATNA'nın TARAF yüzü | YOK | Arabulucu yüzü var (src/constants/mediationAI.ts · MediationEngine.tsx). Tarafa gösterilen risk bandı/dağılım yüzeyi yok |
| 2 | İletişim tercihi katmanı | YARIM | A5 ile aynı madde — ekran var, tüketen yok |
| 3 | AI oturum notları | BİTTİ | analyze-meeting-notes · src/components/mediation/MeetingNotesPanel.tsx (düzenlenebilir taslak) |
| 4 | Belge özeti | BİTTİ | A1 ile aynı madde |
| 5 | İletişimdeki değişim işareti | BİTTİ | A4 ile aynı madde |
| 6 | Görüşme kaydı ve dökümü (4 parça) | YARIM | (a) kayıt onayı tablosu+ekran VAR ama kapı yok · (b) video oda var (create-video-room · VideoCallButton.tsx), yazıya dökme hattı YOK · (c) elle yükleme yolu bulunamadı · (d) otomatik silme YOK |
| 6b | Saklama ayrımı (ses/döküm hiç saklanmaz) | YOK | saklama_kurallari · imha · retention — üçü de üründe geçmiyor; saklama-imha motoru kurulmamış |
| 7 | Nitelikli arabulucu ataması | YARIM | send-mediator-request var ama uzmanlık eşleştirmesi yok (fonksiyonda specialization/dispute_type eşleştirme satırı bulunamadı); "Değiştir" düğmesi yok |
| 9 | Kör teklif v2 / braketleme | BİTTİ | braket kolu birçok yüzeyde (AjanPenceresi.tsx · AgentControlPanel.tsx) + 15.08 braket göçü |

---

## ÖZET SAYIM
- BİTTİ: 26 · YARIM: 13 · YOK: 8 · CANLI TEST BEKLİYOR (ayrı satır): 1 → toplam 48
  (bölüm bölüm: 1) 7 BİTTİ · 2) 1 BİTTİ+1 YARIM+1 test · 3) 3/6/3 · 4) 7/2/1 · 5) 3/0/1 · 6) 1/1/1 · 7) 4/3/2)

## KURUCUYA DÜŞEN KARAR
Bu döküm todo.md'deki kutuları DEĞİŞTİRMEDİ. "BİTTİ" çıkan 26 maddenin kutusunun
işaretlenmesi, "YOK" çıkan 8 maddenin yol haritasına sıraya girmesi ve "YARIM"
çıkan 13 maddenin eksik parçasının ayrı iş kalemi yapılması kurucunun kararıdır.

## BU DÖKÜMÜN SINIRI (dürüstlük bandı)
- Karar KODUN VARLIĞINA göre verildi; hiçbir madde canlıda çalıştırılmadı.
- "YOK" demek "hiç yazılmamış" demektir; ürün başka bir adla aynı işi yapıyor
  olabilir. Arama ad + tablo + işlev üçlüsüyle yapıldı, yine de kesin değildir.
- Veritabanı tarafı (tetikleyiciler, politikalar, cron) bu dökümün DIŞINDADIR;
  depoda görünmeyen altyapı buradan okunamaz (15.08 dersi).
