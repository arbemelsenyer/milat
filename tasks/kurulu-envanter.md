# CANLI KURULUM ENVANTERİ

Bu dosya canlı veritabanında ve panelde ELLE kurulmuş olanları listeler. Depodaki
migration'larda görünmezler.

KURAL: Altyapı (cron, veritabanı ayarı, politika, gizli anahtar) kurmadan ÖNCE bu dosya
okunacak; ayrıca canlıda `SELECT jobid, jobname, schedule FROM cron.job;` ile
doğrulanacak. Doğrulamadan kurulum yapılmayacak.

## ZAMANLANMIŞ İŞLER (pg_cron) — 15.08.2026 doğrulandı

| jobid | ad | sıklık | ne yapar |
|---|---|---|---|
| 1 | send-session-reminders-hourly | 0 * * * * | oturum hatırlatmaları |
| 2 | dual-ai-validate-nightly | 0 2 * * * | gece doğrulama |
| 3 | deadline-reminder-daily | 0 8 * * * | süre hatırlatma (15.08'de anahtarı düzeltildi) |
| 4 | notify-admins-new-tariff | 0 9 1 12 * | yeni tarife bildirimi |
| 5 | check-new-tariff-december | 0 9 1 12 * | tarife kontrolü |
| 6 | check-new-tariff-january | 0 9 5 1 * | tarife kontrolü |
| 7 | ajan-nobetci-5dk | */3 * * * * | nöbetçi ajan (ad 5dk kaldı, sıklık 3 dk'ya çekildi 15.08) |

SİLİNEN: jobid 8 'ajan-nobetci-3dk' — 15.08'de mükerrer kuruldu, anahtarında boşluk
vardı, aynı gün kaldırıldı.

GÜNCELLEME 15.08 (güvenlik): jobid 5 'check-new-tariff-december' ve jobid 6
'check-new-tariff-january' SİLİNDİ ve Authorization + apikey + x-cron-secret
başlıklarıyla YENİDEN KURULDU (yeni jobid'ler; sıklıkları değişmedi — 0 9 1 12 * ve
0 9 5 1 *). Sebep: check-new-tariff verify_jwt=true yapıldı, gateway artık JWT'siz
isteği içeri almıyor. Yeni jobid'ler `SELECT jobid, jobname, schedule FROM cron.job;`
ile doğrulanır.

## VERİTABANI AYARLARI

- app.cron_secret: TANIMLI DEĞİL. Lovable SQL çalıştırıcısı ALTER DATABASE'e izin
  vermiyor (Connection Error). Bu yüzden cron işleri anahtarı komut metninde düz metin
  taşıyor.

## ELLE ÇALIŞTIRILAN KISIT/POLİTİKA DEĞİŞİKLİKLERİ

- agent_states.agent_type CHECK kısıtı 15.08'de genişletildi: 'nobetci' eklendi
  (mevcut 14 tür korundu).
- 15.08: Kör Teklif v2 braket göçü elle çalıştırıldı (teklif_braketleri,
  braket_denetim_izi, braket_bant_sorulari + RLS politikaları + braket_izi_yaz
  tetikleyicisi + braket_bant_sorularim / braket_bant_cevapla fonksiyonları).
- 15.08: 20260815160000_belge_ozetleri.sql elle çalıştırıldı (belge_ozetleri tablosu +
  durum kısıtı + RLS; tarafa SELECT politikası yok).
- 15.08: 20260815180000_olay_cizelgesi.sql elle çalıştırıldı (olay_cizelgesi tablosu +
  kaynak tipi kısıtı + RLS; tarafa SELECT politikası yok).
- 15.08: 20260815200000_guc_dengesi.sql elle çalıştırıldı (guc_dengesi tablosu +
  gösterge tipi kısıtı + RLS; tarafa SELECT politikası yok).
- 15.08: 20260815220000_cron_authorization_basligi.sql elle çalıştırıldı (check-new-tariff
  cron işleri Authorization + apikey + x-cron-secret başlıklarıyla yeniden kuruldu).
- 16.08: 20260816120000_kayit_protokolu.sql elle çalıştırıldı (kayit_onay_talepleri +
  kayit_onaylari + oturum_kayitlari tabloları + RLS; oturum_kayitlari'nda tarafa SELECT
  politikası yok, taraf yalnız kendi onay satırını görür ve yazar).
- 16.08: case_party_invites üzerinde arabulucu/dosya sahibi SELECT politikası ve yönetici
  tam yetki politikası kuruldu (tablo case_party_id üzerinden case_parties'e bağlanıyor).
  Sebep: Tıkanma ve Çıkış Yolları kartı davet kayıtlarını okuyamıyordu; politika eklenince
  "cevaplanmayan davet" işareti üretilebildi.
- 16.08: agent_states_agent_type_check kısıtı genişletildi — izinli listeye
  belge_ozeti · olay_cizelgesi · guc_dengesi · iletisim_degisim · dosya_ozeti eklendi
  (toplam 20 ad; mevcut adlar korundu).
- 16.08: agent_states tablosuna tarafa_gorunur boolean NOT NULL DEFAULT false kolonu
  eklendi. Açıklama: yalnız TARAFIN KENDİ ajanı için true yazılır; karşı tarafa hiçbir
  koşulda açılmaz.
- 16.08: "Case participants can view agent states" SELECT politikası KALDIRILDI; yerine
  "Ajan durumu: arabulucu hepsini, taraf yalniz kendi isaretlisini gorur" politikası
  kuruldu — is_case_mediator VEYA (tarafa_gorunur = true VE is_own_case_party).
  Sonuç: taraflar hiçbir ajan satırı göremez; yeni ajan tipleri doğuştan kapalıdır.
  UPDATE/INSERT politikalarına DOKUNULMADI.
- 16.08: 20260816160000_iletisim_degisim.sql elle çalıştırıldı (iletisim_degisim tablosu
  + RLS; tarafa SELECT politikası yok).
- 16.08: elverislilik_kontrol tablosu kuruldu (case_id UNIQUE, durum CHECK
  'isaret_var'/'isaret_yok'/'kaynak_yok', bulgular jsonb) + RLS açık; SELECT yalnız
  arabulucu/dosya sahibi, admin ALL, TARAFA POLİTİKA YOK.
- 16.08: agent_states_agent_type_check kısıtı yeniden genişletildi — izinli listeye
  'elverislilik' eklendi (toplam 21 ad; mevcut adlar korundu).
- 16.08: usul_onerileri tablosu kuruldu (case_id UNIQUE, durum CHECK
  'oneri_var'/'oneri_yok', oneriler jsonb) + RLS açık; SELECT yalnız arabulucu/dosya
  sahibi, admin ALL, TARAFA POLİTİKA YOK.
- 16.08: agent_states_agent_type_check kısıtı genişletildi — izinli listeye
  'usul_onerisi' eklendi (toplam 22 ad; mevcut adlar korundu).
- 16.08: ajan_kosum_izi tablosu kuruldu (case_id + kol UNIQUE, girdi_imzasi, durum
  CHECK 'kosuldu'/'hata'/'atlandi', sebep, kosum_zamani); RLS açık, SELECT yalnız
  arabulucu/dosya sahibi, admin ALL, TARAFA POLİTİKA YOK. Nöbetçinin otomatik koşum
  defteridir.
- 16.08: İki kez ELLE BAKIM — iç çağrı kapısı düzeltildikten sonra ajan_kosum_izi'nde
  durum='atlandi' satırları silindi ki nöbetçi kolları yeniden denesin. Bu bakım,
  bayrak/kapı uyumsuzluğu giderildiği için bundan sonra gerekmeyecek.
- 16.08: usul_engelleri tablosu kuruldu (case_id UNIQUE, durum 'engel_var'/'engel_yok',
  engeller jsonb) + RLS; SELECT yalnız arabulucu/dosya sahibi, admin ALL, TARAFA
  POLİTİKA YOK. agent_states izinli listesine 'usul_engeli' eklendi
  (agent_states_agent_type_check kısıtı 23 ada genişletildi; mevcut adlar korundu).
- 16.08: case_documents tablosuna "Yonetici belge yukler" INSERT politikası eklendi:
  uploaded_by = auth.uid() AND has_role(auth.uid(),'admin'). Sebep: admin hesabı taraf
  dosyalarına belge yükleyemiyordu.
- 16.08: oturum_hazirlik_foyleri tablosu kuruldu (case_id · session_id · party_id ·
  bolumler jsonb · durum CHECK 'taslak'/'onaylandi'/'gonderildi'/'iptal' ·
  onaylayan_user_id · onay_zamani · gonderim_zamani; UNIQUE (session_id, party_id);
  idx_foy_case indeksi) + RLS açık. Politikalar: "Arabulucu foyleri yonetir" (FOR ALL —
  is_case_mediator VEYA is_case_owner_safe) · "Taraf yalniz gonderilmis kendi foyunu
  gorur" (FOR SELECT — durum='gonderildi' VE is_own_case_party) · "Yonetici foy tam"
  (FOR ALL — admin). NOT: tarafa yalnız GÖNDERİLMİŞ kendi föyü görünür; taslak ve
  onaylı föyler tarafa kapalıdır.
- 16.08: agent_states_agent_type_check kısıtı genişletildi — izinli listeye
  'hazirlik_foyu' eklendi (toplam 24 ad; mevcut adlar korundu).
- 17.08: Oturum hazırlık föyleri: iki yerde görünür — (1) Aşama 4 Toplantı ekranı, en
  üst, id="faz4-hazirlik-foyu", sol menüde kendi girdisi; (2) Aşama 3 kokpit, RAPOR VE
  BELGELER katmanı, id="kokpit-hazirlik-foyu". İkisi de aynı bileşen: HazirlikFoyuPanel
  (src/pages/MediationEngine.tsx). Tablo: oturum_hazirlik_foyleri (UNIQUE
  session_id+party_id). Edge fonksiyon: hazirlik-foyu. Durumlar: taslak / onaylandi /
  gonderildi / iptal — onaylandi ve gonderildi KİLİTLİ (düğme çıkmaz).
- 17.08: hazirlik-foyu edge fonksiyonu ARTIK HİÇ ÜCRETLİ ÇAĞRI YAPMIYOR (b22ce0e).
  Model çağrısı tümüyle kaldırıldı. Gündem başlıkları koddan kuruluyor
  (GUNDEM_KALIPLARI · BELGE_TURU_KALIPLARI · ASGARI_GUNDEM); "Yanınızda bulundurmanız
  iyi olur" bölümü tarafın kendi yüklediği belgelerin gerçek adını listeliyor, belge
  yoksa bilgilendirici tek satır yazılıyor (BELGE_YOK_SATIRI).
- 17.08: Saat dilimi — FOY_SAAT_DILIMI = "Europe/Istanbul"; scheduled_at UTC saklanır,
  föye Türkiye saatiyle yazılır (elle saat farkı yok, yaz/kış saati Intl'e bırakıldı).
- 17.08: Gündem süzgeçleri — gundemBasligiKur (tek kapı) · gundemSoruMu · gundemTutumMu
  (tarafın tutumunu tespit eden madde elenir) · GUNDEM_YUKLEM_SONU (kapsar/içerir/
  nasıldır dahil) · bosluklariTekle (ad ve madde boşluk temizliği).
- (daha önce kurulanlar buraya eklenecek: mediator_reads_offers,
  mediator_writes_discovery, mediator_updates_discovery, ajan_gorevleri politikaları,
  taraf_musaitlik RLS)

## NASIL GÜNCELLENİR

Canlıda elle bir şey kurulduğunda ya da değiştirildiğinde aynı gün bu dosyaya yazılır.
Gün sonu belge komutuna dahildir.

## GÜVENLİK AYARLARI (15.08.2026)
- check-new-tariff: verify_jwt false → TRUE yapıldı (Lovable güvenlik bulgusu). Gateway
  artık JWT'siz isteği içeri almıyor. Fonksiyonun kendi kapısı değişmedi
  (x-cron-secret VEYA admin JWT → 401/403).
- BUNA BAĞLI: jobid 5 'check-new-tariff-december' ve jobid 6 'check-new-tariff-january'
  cron işleri Authorization başlığı taşıyacak şekilde YENİDEN KURULDU (15.08, yeni
  jobid'ler) — supabase/migrations/20260815220000_cron_authorization_basligi.sql.
- Tarama yeniden çalıştırıldı: CRITICAL bulgu kalmadı. 3 warn bulgu duruyor; biri
  "arabulucular admin/ klasöründeki tüm dosyaları okuyabiliyor" — kasıtlı mı, incelenecek.
- analyze-meeting-notes: kodda değişiklik gerekmedi. verify_jwt zaten true ve fonksiyon
  Authorization + getUser + dosya kapsamlı yetki (arabulucu/sahip/admin) denetimini AI
  çağrısından önce yapıyor; yetkisizde 401/403 dönüyor.
- 18.08: public.gundem_kalem_havuzu tablosu CANLIDA (kurucu kurdu, bu turda SQL
  çalıştırılmadı): id uuid pk · kategori text · baslik text · ipuclari text[] ·
  kaynak_source_title text · kaynak_alinti text · durum text default 'etkin' ·
  created_at timestamptz. UNIQUE (kategori, baslik) · CHECK durum IN ('etkin','pasif')
  · index (kategori) · RLS AÇIK, POLİTİKA YOK (yalnız service role erişir).
  KULLANAN: supabase/functions/hazirlik-foyu (okuma + upsert onConflict
  "kategori,baslik"). Havuz kategori düzeyindedir, dosya verisi TAŞIMAZ.
  NOT: bir kategoride satır var ama hepsi 'pasif' ise fonksiyon yeniden türetme
  YAPMAZ (kurucunun bilerek kapattığı kabul edilir), doğrudan yedek yola geçer.
- 18.08: public.iletisim_tercihleri tablosu CANLIDA (kurucu kurdu, bu turda SQL
  çalıştırılmadı): id uuid pk · case_id uuid → cases · party_id uuid → case_parties ·
  kanal text default 'eposta' · siklik text default 'her_adim' · sessiz_baslangic time ·
  sessiz_bitis time · created_at · updated_at. UNIQUE (party_id) ·
  CHECK siklik IN ('her_adim','onemli','haftalik_ozet') · CHECK kanal IN ('eposta') ·
  RLS AÇIK. Politikalar: SELECT → arabulucu veya kendi tarafı · INSERT/UPDATE →
  yalnız kendi tarafı.
  YAZAN: src/pages/CaseRoom.tsx > IletisimTercihlerim (taraf, upsert onConflict
  "party_id"). OKUYAN: src/pages/MediationEngine.tsx > IletisimTercihiSatiri (salt
  okuma) ve yedi edge fonksiyondaki gonderilsinMi süzgeci (ajan-nobetci ·
  send-meeting-invite · cancel-meeting-invite · send-session-reminders ·
  send-reschedule-notification · send-session-notification · randevu-teklif).
  NOT — MEVCUT VE AYRI: notification_preferences tablosu (kullanıcı düzeyinde, tür
  başına aç/kapa) ve case_parties.hatirlatma_izni (boolean) DURUYOR, kaldırılmadı.
  notification_preferences'ı hiçbir gönderim yolu okumuyor; NotificationSettings.tsx
  ekranı bugün karşılıksızdır — kurucu kararı bekliyor.
- 19.08: Oturum hazırlık föyü ARTIK TEK YERDE. Yukarıdaki 17.08 kaydındaki (2) numaralı
  kokpit girişi (Aşama 3 > RAPOR VE BELGELER, id="kokpit-hazirlik-foyu") KALDIRILDI;
  mükerrerdi. Föyün tek yeri Aşama 4 en üst, id="faz4-hazirlik-foyu". Bileşen
  (HazirlikFoyuPanel), tablo, RLS ve edge fonksiyonlar aynen duruyor.
- 19.08: Föy gönderimi CANLI YOLDA: yeni edge fonksiyon hazirlik-foyu-gonder
  (verify_jwt=true). Yalnız onaylanmış föyü, yalnız kendi tarafına e-postayla
  gönderir; iletişim tercihi süzgecinden ("belge_talebi", FAIL-OPEN) geçer.
  Taraf yüzeyi: CaseRoom > "Oturum hazırlığım" sekmesi (salt okuma).
  İLK DEPLOY GEREKİR — Lovable'da redeploy edilmeden canlıda yoktur.

[GÜN SONU 18.08.2026 — CANLIDA KURULU OLANLAR]
- Tablo: public.iletisim_tercihleri — CANLIDA. UNIQUE party_id; 3 RLS politikası.
  Taraf kendi satırını yazar, görevli arabulucu yalnız okur.
- Tablo: public.gundem_kalem_havuzu — CANLIDA ama ŞU AN BOŞ (0 kalem). İlk türetme
  hiçbir kategoride tetiklenmedi; havuz boş olduğu sürece föy gündemi YEDEK yoldan
  (GUNDEM_KALIPLARI / BELGE_TURU_KALIPLARI / ASGARI_GUNDEM) kuruluyor.
- 19.08: hazirlik-foyu-gonder ORTAK MOTORA BAĞLANDI (MOTORA_BAGLI + zorunlu girdi
  foy_id). Çalışırken adımlarını yazıyor, Yapıldı/Eksik ile kapanıyor, eşzamanlılık
  kilidi motordan geliyor. Kilit çakışırsa 409 döner ki koşucu yeniden denesin —
  gönderim sessizce düşmez. Gönderim mantığı, süzgeç ve kör veri kuralları aynı.
- Edge fonksiyon: hazirlik-foyu-gonder — CANLIDA (19.08 01:02 canlı test geçti,
  iki föy de tarafına gönderildi).
- gonderilsinMi (iletişim tercihi) süzgeci BULUNAN YEDİ FONKSİYON: ajan-nobetci ·
  cancel-meeting-invite · randevu-teklif · send-meeting-invite ·
  send-reschedule-notification · send-session-notification · send-session-reminders.
  (hazirlik-foyu-gonder de aynı süzgeci taşır; yedili liste 1. turun kapsamıdır.)

[EKLEME 19.08.2026 — AKIŞ OMURGASI (agentic belkemiği 1. taş)]
- Tablo: public.akis_olaylari — CANLIDA. "Şu adım bitti" satırları; islendi/islenme_zamani
  ile koşucu tarafından işaretlenir. RLS: SELECT arabulucu/dosya sahibi · ALL admin.
- Tablo: public.akis_kurallari — CANLIDA. olay_kodu → sonraki_adim eşlemesi; sahip
  (taraf_ajani/masa_ajani/sistem), insan_kapisi, kosul, sira, etkin.
  19.08 itibarıyla canlıda YEDİ kural var ve YEDİSİ DE ETKİN:
  belge_yuklendi__analiz · belge_yuklendi__taraf_kalem ·
  oturum_planlandi__foy_hazirla · kalem_guncellendi__karsilastir ·
  foy_onaylandi__gonder · bilirkisi_onerildi__sorular · taslak_uretildi__denetim.
  Kuralları AJAN YAZMAZ; satırları kurucu yazar.
- Edge fonksiyon: akis-yurut — YENİ (verify_jwt=false, kendi kapısı var: x-cron-secret
  veya admin JWT). Nöbetçi turunun sonunda iç kapıdan bir kez tetiklenir.
  İLK DEPLOY GEREKİR.
- Paylaşılan yardımcı: supabase/functions/_shared/olay.ts (olayYaz) — deponun İLK
  _shared dosyasıdır. Olay yazımı best-effort'tur, çağıran işlemi bozmaz.
- Olay yazımı bağlanan 12 fonksiyon: extract-document-text · belge-ozeti ·
  classify-dispute · send-party-invite · accept-party-invite ·
  party-confidential-analysis · orchestrator-run · common-ground-report ·
  randevu-teklif · send-meeting-invite · hazirlik-foyu · hazirlik-foyu-gonder.
  HEPSİ REDEPLOY İSTER (import yolu değişti).
- Olay noktası OLMAYANLAR ve sebepleri: tasks/akis-kurallari-onerisi.md sonundaki
  iki liste (bağlanamayanlar · eksik olay noktası).
- 19.08: Bileşen: src/components/AjanPenceresi.tsx — ajan penceresi (salt görünüm).
  İki yüzeyde de aynı bileşen: MediationEngine (mod="arabulucu", tek yerden mount,
  bütün aşamalarda) ve CaseRoom taraf görünümü (mod="taraf", partyId zorunlu).
  Kaynaklar: agent_states + ajan_gorevleri. YENİ TABLO, YENİ SÜTUN, YENİ EDGE
  FONKSİYON YOK; yalnız ön yüz. Kör veri süzgeci SORGUDADIR.
  NOT: ajan_gorevleri supabase_realtime yayın listesinde DEĞİL — bekleyen listesi
  anlık bildirimle değil, 60 saniyelik tazelemeyle ve agent_states değişimlerinde
  güncelleniyor.

[EKLEME 19.08.2026 — ANLATAN AJAN DÜZENİ]
- Ortak yardımcı: supabase/functions/_shared/anlatim.ts — anlatimAc (adım yazımı) ·
  anlatimYansit (mevcut durum yazıcısına takılan anlatım) · belgedeAra ·
  kayitlardaAra · bilgiTabanindaAra (eksik tamamlama sırası) · eksigiSor (doğru
  kişiye sorma, mükerrer yazmaz) · zatenCalisiyorMu (eşzamanlılık kapısı).
  Hepsi BEST-EFFORT; hiçbiri hata fırlatmaz.
- Edge fonksiyon: taraf-kalem-cikar — YENİ (verify_jwt=false, kendi kapısı:
  x-cron-secret veya admin JWT). Tarafın kendi belgelerinden talep kalemi çıkarır.
  İLK DEPLOY GEREKİR.
- Tablo: public.taraf_kalemleri — CANLIDA (kurucu kurdu). Ajan satırları
  kaynak='ajan', tarafın kendi girdiği satırlar kaynak='taraf'.
- Bileşen: CaseRoom > taraf görünümü > "Taleplerim ve dayanakları" sekmesi
  (TaleplerimBolumu). AjanPenceresi.tsx artık SOHBET.
- NOT — agent_states.agent_type bir CHECK kısıtıyla sınırlıdır. taraf-kalem-cikar
  yeni bir ad yerine izinli 'document_analysis' tipini kullanır (bu tip zaten
  taraf kapsamlıdır). randevu-teklif ve hazirlik-foyu-gonder için uygun bir izinli
  tip YOK; anlatım eklenmedi — kurucunun tek satırlık SQL kararını bekliyor.

[EKLEME 19.08.2026 — GENEL KANUN ALTYAPISI]
- _shared/anlatim.ts genişletildi: MOTOR_SURUMU · MOTORA_BAGLI (koşucunun
  çağırmasına izin verilen fonksiyon listesi) · motoraBagliMi · girdiTamamla
  (eksik girdiyi en az iki yoldan arar, taraf başına iş kurabilir) ·
  SORU_TIPI_TARAF / SORU_TIPI_ARABULUCU · kolEtiketi.
- akis-yurut: motora bağlı olmayan fonksiyonu ÇAĞIRMIYOR ve sebebini yazıyor;
  eksik girdiyi kendi tamamlayıp yeniden deniyor; aynı olay+kural için en fazla
  iki deneme. Hata kayıtları etiketli ve aynı metin üst üste yazılmıyor.
- ajan-nobetci: YENİ kol soruHatirlatmaKollari — cevaplanmamış soruları
  hatırlatır (24 saat / 2 gün), cevaplananlarda ilgili kolu bir kez yeniden
  uyandırır. Mevcut kollara, sıralarına ve güvenlik kapısına dokunulmadı.
- Edge fonksiyon: taraf-cevap — YENİ (verify_jwt=true). Sohbetten verilen cevabı
  görevin sonuc alanına yazar, durum 'yapildi' yapar. Yetkiyi sunucuda doğrular
  (sorunun hedefi olan taraf ya da dosyanın arabulucusu). İLK DEPLOY GEREKİR.
- Görev tipleri: 'taraf_sorusu' ve 'arabulucu_sorusu' nöbetçi tarafından
  YÜRÜTÜLMEZ; cevap gelene kadar 'bekliyor' kalır ve sohbette görünür.
- AjanPenceresi: bekleyen soru varsa sohbet kendiliğinden açılır, soru en üstte
  şerit olarak durur, "Cevap yaz" ile cevap kipine geçilir.

[EKLEME 19.08.2026 — ÜÇ YENİ AJAN İŞİ · AŞAMA MOTORU · SESLİ GİRİŞ]
- 19.08: masa-kalem-karsilastir EŞLEŞTİRME ÖLÇÜSÜ genişletildi. Ad eşleşmesine ek
  olarak TUTAR eşleşmesi: tutarı birebir aynı olan kalemler, o tutar her iki
  tarafta da TEK kalemde geçiyorsa eşleşir ("tutar birebir aynı, adlar farklı").
  Aynı tutar birden çok kaleme denk geliyorsa eşleştirme YAPILMAZ. Özet cümlesine
  tek taraflı kalem sayısı da girer. Model çağrısı yok, deterministik.
- Edge fonksiyon: masa-kalem-karsilastir — YENİ (verify_jwt=false, kendi kapısı).
  İki tarafın kalemlerini örtüşen/yakın/ayrılan diye ayırır, sonucu kendi durum
  satırının last_output.karsilastirma alanına yazar; kokpitteki "Kalem
  karşılaştırması" kartı oradan okur. Model çağrısı YOK. İLK DEPLOY GEREKİR.
- Edge fonksiyon: bilirkisi-sorulari — YENİ. Bilirkişiye sorulacak soruları
  dosyadaki kayıtlardan çıkarır, eksik taraf onayını o tarafın sohbetinden ister.
  ATAMA YAPMAZ (insan kapısı). İLK DEPLOY GEREKİR.
- Edge fonksiyon: taslak-denetim — YENİ. Anlaşma taslağını denetler; mantık
  YENİDEN YAZILMADI, _shared/taslak-denetle.ts ön yüzdeki TaslakDenetimi.tsx'in
  saf bölümünün BİREBİR kopyasıdır (edge, src/ altını içe aktaramaz). Taslak
  metni agreement_documents.metadata.filled_text alanından okunur. Belgeyi
  DEĞİŞTİRMEZ. İLK DEPLOY GEREKİR.
- _shared/taslak-denetle.ts — YENİ paylaşılan modül (sunucu kopyası).
  KURAL: ön yüzdeki TaslakDenetimi.tsx değişirse bu kopya aynı commit'te güncellenir.
- akis-yurut: tur sonunda AŞAMA İLERLETME motoru koşar (nesnel koşullar; imza,
  kapanış ve bilirkişi aşamaları ajan tarafından geçilmez). YENİ CRON KURULMADI.
- Üçü de ortak motora bağlandı (MOTORA_BAGLI + zorunlu girdi eşlemesi).
- Ön yüz: kokpitte "Tümünü aç/kapat", kart başlığında "yeni" işareti, boş kartta
  "Ajan hazırlıyor." satırı, "Kalem karşılaştırması" kartı; ajan sohbetinde
  mikrofon (tarayıcı tanıması, dış servis yok) ve varsayılan kapalı sesli okuma.
- KALDIRILDI: MediationEngine'deki 30 saniyelik belge sayacı
  (scheduleAutoOrchestrator) — aynı işi olay + kural düzeni yapıyor. Elle
  "Tüm Analizi Başlat" düğmesi duruyor.

[EKLEME 20.08.2026 — ARABULUCU FRENİ VE KONTROL TERCİHİ]
- Tablo: public.akis_duraklatma — CANLIDA (kurucu kurdu). aktif · kapsam
  ('dosya'|'adim') · hedef_adim · sebep · duraklatan · kaldirma_zamani ·
  kaldiran. Arabulucuya ALL, admin ALL. Yazım doğrudan sohbetten yapılır;
  bunun için YENİ EDGE FONKSİYON YOK.
- Tablo: public.arabulucu_kontrol_tercihleri — CANLIDA (kurucu kurdu).
  onay_isteyen_adimlar text[] (kural kodları), UNIQUE(case_id, mediator_id).
  Varsayılan boş = ajan kendiliğinden yapar.
- Edge fonksiyon: akis-onayla — YENİ (verify_jwt=true). Bekleyen onay görevini
  'yapildi' yapar ve bekleyen olayın verisine onay_verildi=true koyar; koşucu
  bunu görünce tercih listesine bakmadan adımı koşar. Ortak motora bağlı
  (MOTORA_BAGLI + zorunlu girdi gorev_id). İLK DEPLOY GEREKİR.
- akis-yurut: her turda dosya bazlı duraklatma ve kontrol tercihi kontrolü
  eklendi (duraklatmalariOku · onayIsteyenAdimlar). Duraklatmada olay işlenmiş
  sayılmaz; devam edilince kaldığı yerden sürer.
- hazirlik-foyu-gonder: KAPI ONARILDI. Kapı yalnız kullanıcı oturumu kabul
  ediyordu, koşucu çağırınca 401 dönüyordu (canlı pano 20.08 00:48). Artık
  masa-kalem-karsilastir desenindeki çift kapı: x-cron-secret VEYA kullanıcı
  oturumu. Kullanıcı yolu ve yetki kontrolü harfi harfine korundu.

[EKLEME 20.08.2026 — ARABULUCU TALİMATI]
- Tablo: public.arabulucu_talimatlari — CANLIDA (kurucu kurdu). hedef_adim ·
  talimat · durum ('bekliyor'|'uygulandi'|'onaylandi'|'reddedildi'|
  'uygulanamadi') · veren · sonuc_ozeti · red_sebebi · uygulanma_zamani ·
  karar_zamani. Arabulucuya ALL, admin ALL. Yazım doğrudan sohbetten yapılır;
  bunun için YENİ EDGE FONKSİYON YOK.
- akis-yurut: talimat kuyruğu eklendi (talimatlariYurut). Olaylardan ÖNCE koşar;
  hedef adımı talimat_id + talimat + talimat_modu ile çağırır, bitince talimatı
  'uygulandi' yapar ve arabulucunun sohbetine onay satırı düşer. Duraklatma
  varsa talimat da bekler. Aynı talimat en fazla iki kez denenir.
- _shared/anlatim.ts: talimatiDenetle (anayasa süzgeci, kalıp tabanlı) ·
  TALIMAT_ALMAYAN (masa-kalem-karsilastir) · talimatOzeti.
- hazirlik-foyu · bilirkisi-sorulari · taslak-denetim: gövdede talimat gelirse
  ek yönerge olarak alır ve çıktının başında tek cümleyle belirtir. Talimat
  kipinde tarafa yazan hiçbir şey yapılmaz.
- akis-onayla: talimat_id desteği eklendi (gövdeden ya da gerekçedeki
  "[talimat:<id>]" etiketinden okunur); onayda talimat 'onaylandi' olur.
  'arabulucu_onayi' tipindeki satırlar da onaylanabilir hâle geldi.

[EKLEME 20.08.2026 — AJAN ÖNERİLERİ VE PANO KONU ANAHTARI]
- Tablo: public.ajan_onerileri — CANLIDA (kurucu kurdu). hedef
  ('arabulucu'|'taraf') · baslik · gerekce · eylem_turu ('adim'|'talimat'|
  'bilgi') · eylem_adim · durum ('acik'|'kabul'|'kapatildi') · karar_zamani.
  RLS: arabulucu yalnız hedef='arabulucu'; taraf yalnız kendi party_id'sindeki
  hedef='taraf' satırlarını görür.
- ajan-nobetci: YENİ kol oneriKollari — dosyanın gerçek durumundan deterministik
  öneri üretir (model yok). Açık öneri sınırı yüzey başına üç; aynı başlık bir
  kez açılır, kapatılan yeniden açılmaz.
- AjanPenceresi: sohbetin altında "Öneriler" bölümü (iki yüzey), Uygula/Kapat.
- akis-yurut · panoyaYaz: tekrar süzgeci artık KONU anahtarı üzerinden çalışıyor
  ("[konu:…]"). Aynı konuda bekleyen satır varsa yazılmaz; FARKLI konudaki
  bildirim her zaman yazılır. Talimat reddi/onayı ve onay isteği bu anahtarla
  yazılıyor; yazılamayan bildirimin sebebi koşucunun özet notuna geçiyor.

[EKLEME 20.08.2026 — ÖĞRENME KATMANI VE KAPANIŞ]
- Tablolar (hepsi kurucu tarafından canlıya alındı): ajan_deneyim ·
  ajan_bellek · arabulucu_aliskanliklari · duzeltme_kayitlari ·
  kural_kutuphanesi · dosya_kapanis. Hiçbirinde kişisel veri tutulmaz
  (ajan_bellek yalnız anahtar ve durum taşır).
- _shared/anlatim.ts: deneyimYaz · bellekVarMi/bellekYaz/bellekOku ·
  YOL_MERDIVENI · yolGecmisi/yolSirasi · DEVIR_ESLEME/devirHedefi ·
  etkinKurallar. anlatimAc ve anlatimYansit kapanışta deneyimi kendiliğinden
  yazar — böylece motora bağlı HER fonksiyon deneyim defterine yazmış olur.
- girdiTamamla: yol sırası deneyimden; iki kez düşen yol elenir.
- akis-yurut: dosyaHedefi (nesnel hedef listesi) · olaylariSirala (hedefe
  yaklaştırma gücüne göre öncelik) · devirKollari (eksik işi üretebilecek ajana
  devreder, ajan_bellek'e yazar).
- ajan-nobetci: kuralOnerKollari (üç tekrarda kural önerir, etkin=false) ·
  aliskanlikKollari (sayım + öneri) · kapanisHatirlatma (günde bir).
- Edge fonksiyon: dosya-verilerini-sil — YENİ (verify_jwt=true). x-cron-secret
  KABUL ETMEZ. İki onay ister; silme sırası yabancı anahtarlara uygun, hata
  olursa durur. Silmeden sonra ajan_deneyim ve duzeltme_kayitlari satırlarında
  case_id NULL yapılır. İLK DEPLOY GEREKİR.
- Ön yüz: kokpitte "Ajan ne öğrendi" kartı · Aşama 7 Kapanış sekmesinde
  "Kapanış kontrolü, paket ve veri silme" kartı (JSZip ile tek paket, UYAP
  rehberi) · sohbette düzeltme sorusu · kontrol tercihi kartında üç adım uyarısı.

[EKLEME 20.08.2026 — ORTAK SINIR KATMANI]
- _shared/anlatim.ts: sinirDenetle / sinirdanGecir (çıktı süzgeci, künyeli
  alıntı serbest) · ajanaTalimatMi + alintiOlarakSar (prompt injection) ·
  yazmaIzniVar + INSAN_KAPISI_ALANLARI (yazma yetkisi) ·
  ogrenmeGirdisiUygunMu (öğrenme yazım süzgeci).
- MİRAS: anlatimAc.adim ve eksigiSor süzgeci çağırdığı için ortak motora bağlı
  bütün fonksiyonlar (MOTORA_BAGLI, 24 adet) kendiliğinden kapsamdadır.
- DOĞRUDAN BAĞLANANLAR (sohbet/bildirim yüzeyleri — motora BAĞLANMADAN yalnız
  süzgeci çağırır; eşzamanlılık kilidi UYGULANMAZ, yoksa üst üste iki mesajın
  ikincisi reddedilir): case-qa · taraf-asistan · taraf-cevap · mediation-ai ·
  legal-reasoning-gemini · generate-options · akis-yurut (pano) · ajan-nobetci
  (pano) · dosya-verilerini-sil · send-meeting-invite (serbest not) ·
  send-session-notification (serbest not) · taraf-kalem-cikar (belge alıntısı).
- deneyimYaz ve bellekYaz artık serbest metin ve tutar benzeri değeri REDDEDER.

[EKLEME 20.08.2026 — DEFTER ONARIMI, TEK ANA AJAN, DEVİR ZİNCİRİ]
- _shared/anlatim.ts (yeni/değişen): hataMetni (message+code+details+hint) ·
  deneyimYaz ve bellekYaz artık SEBEP DÖNDÜRÜR (bellekYaz eskiden sessizce
  yutuyordu, dönüş tipi void → string|null) · Anlatim nesnesine `defter_notu`
  alanı · başarılı kapanışta "tamamlandi:<adim>" bellek işareti ·
  AnlatimSahibi'ne isteğe bağlı olay_id / kaynak_kimlik · devirYaz (kapalı
  listeli devir kaydı) · anaAjanaBildir (tek bildirim geçidi).
- akis-yurut: olayiKapat yardımcısı — akis_olaylari'nda NOT/SONUC KOLONU YOK
  (kolonlar: id · case_id · party_id · olay_kodu · veri · islendi ·
  islenme_zamani · created_at), bu yüzden defter notu `veri` alanına
  "defter_notu" anahtarıyla yazılıyor. panoyaYaz artık anaAjanaBildir'den
  geçiyor; devir kolu "tamamlandi:<adim>" işaretine bakıyor ve devir kaydı
  devirYaz ile yazılıyor.
- ajan-nobetci: gorevAc artık anaAjanaBildir'den geçiyor (kaynak "nobetci").
- taraf-kalem-cikar: belge başına "kalem_cikarildi:<document_id>" işareti;
  aynı belgeden ikinci kez kalem yazılmıyor, atlananlar sohbete tek satır.
- intake-chat: giriş süzgeci EN BAŞTA — kullanıcı metni modele gitmeden önce
  ajanaTalimatMi ile bakılıyor, emir kipi taşıyan mesaj alintiOlarakSar ile
  sarılıyor. KİLİT KULLANILMADI (sohbeti kırar). Cevap akış olarak döndüğü için
  çıkış tamponlanmadı; girdi notu yanıt başlığıyla bildiriliyor.
- AjanPenceresi: bildirim satırında kaynak etiketi (gözcü kolu / yürütücü kolu /
  taraf ajanı / sistem). Yeni ekran, kart ya da düğme açılmadı.
- SQL GEREKİYOR (bende değil, kurucuda): ajan_gorevleri'ne `kaynak` ve
  `bekleyen` kolonları · Bölüm 4 için akis_kurallari satırı.
