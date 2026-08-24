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

_Şu an bekleyen cevap yok._

---

## ARŞİV — kapanmış maddeler

### H-0 · 24.08.2026 · P0 — Self-servis başvuruda kör veri kırılıyor · **KAPANDI**
**Karar: A** (kurucu, 24.08). Taraf-gizli beş tabloda (`oturum_hazirlik_foyleri`,
`taraf_kalemleri`, `bilirkisi_secim_beyani`, `bilirkisi_taraf_yanitlari`,
`oturum_kayitlari`) sahip yetkisi, sahip aynı zamanda TARAF ise verilmez; dosya
yönetimi sahipte kalır. Uygulandı ve canlıda doğrulandı — ayrıntı
`tasks/todo.md`dedir.
