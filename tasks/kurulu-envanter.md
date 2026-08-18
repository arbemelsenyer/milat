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
