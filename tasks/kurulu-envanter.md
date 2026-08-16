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
