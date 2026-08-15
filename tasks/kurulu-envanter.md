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

## VERİTABANI AYARLARI

- app.cron_secret: TANIMLI DEĞİL. Lovable SQL çalıştırıcısı ALTER DATABASE'e izin
  vermiyor (Connection Error). Bu yüzden cron işleri anahtarı komut metninde düz metin
  taşıyor.

## ELLE ÇALIŞTIRILAN KISIT/POLİTİKA DEĞİŞİKLİKLERİ

- agent_states.agent_type CHECK kısıtı 15.08'de genişletildi: 'nobetci' eklendi
  (mevcut 14 tür korundu).
- (daha önce kurulanlar buraya eklenecek: mediator_reads_offers,
  mediator_writes_discovery, mediator_updates_discovery, ajan_gorevleri politikaları,
  taraf_musaitlik RLS)

## NASIL GÜNCELLENİR

Canlıda elle bir şey kurulduğunda ya da değiştirildiğinde aynı gün bu dosyaya yazılır.
Gün sonu belge komutuna dahildir.
