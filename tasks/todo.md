## 09.08.2026 — Nerede kaldık

Bugün biten:
- İç tutarlılık denetimi canlı (tablo + ajan + kokpit kartı + Faz 3 düğmesi)
- İletişim ve asıl ihtiyaç analizi canlı + "Sıradaki 3 Soru"
- Dosyaya Soru Sor V1 canlı, üç sınav geçildi → yol haritası madde 4 KAPANDI
- Resmî belgeler güncellendi ve ilk kez depoya alındı:
  mimari v0.35 · constitution v3.4 · komut rev.12 · yol haritası r5
- mimari.md 18 bölüme ayrıldı (mimari/), 00-INDEX yazıldı
- CLAUDE.md okuma sırası ve okuma sınırı güncellendi

Sıradaki iş (bu sırayla):
1. Rapor öncesi defter tartımı + dürüstlük bandı (mimari §5.2i).
   Ekran değişikliğidir; yapıma başlamadan kurucu onayı alınır.
2. Elenen bulguların deftere iz kaydı.
3. Taraf gizli belge kanalının gerçek taraf hesabıyla görsel testi.
4. Evrak tespit ajanı — kurucudan beklenen-belge listeleri bekleniyor (park).

Kırıntılar:
- İletişim analizinde "talep ↔ anlatı farkı" izi çıkmıyor
- İç tutarlılık değer alanları kokpit kartında gösterilmiyor
- Dosya soru-cevap panelinde hata mesajı ekrana düşmüyor
- Künye temizleyici marka tescil numarasını yanlış yakalıyor
- Alt uzmanlık rozetleri diğer ekranlara yansımıyor
- Menü klavye erişilebilirliği
- Çalışma ağacında commit edilmemiş değişiklikler var
  (scripts/scraper.py, src/pages/*) — gözden geçirilecek

# tasks/todo.md — Güncel İş Listesi
Her oturumda önce burayı oku. Biten maddeyi [x] yap, yeni işi buraya ekle.

## Devam Eden
- [ ] Dürüstlük bandı canlı testi (Lovable redeploy sonrası: bant çıkıyor mu,
      Açıkla açılıp kapanıyor mu, gerekçe metni görünüyor mu)

## İnceleme Notları
(Her biten işin kısa sonucu buraya)
- 12.08 Dürüstlük bandı "Açıkla": MediationEngine.tsx'te husus satırı tıklanabilir
  yapıldı (tek state, aynı anda tek satır açık); common-ground-report tartımı
  hususlara neden_rapora_girmedi alanını da taşıyor. Eşik, 5 husus sınırı, uyarı
  metni, AI çıktı şeması ve PDF çıktısı değişmedi.

## Nerede kaldık — 13.08.2026 (10)
Davet gönderim kartı canlı (MediationEngine.tsx, Phase2Parties): taraf ConfirmSavePanel ile
kaydedilip e-posta onaylanınca kart çıkıyor — alıcı + adres + davet e-postasının özeti,
[Gönder] (mevcut sendInvite), [Düzenle] (adres karttan düzeltilir, ConfirmSavePanel'in
e-posta onayına gider), [Şimdi değil]. Kayıt anındaki otomatik gönderim kaldırıldı.
E-postasız tarafta kart çıkmıyor, "Davet Linki Oluştur" akışı aynı. tsc + build temiz.
Sırada: canlıda doğrulama (taraf ekle → kart → gönder / adres düzelt).

## Nerede kaldık — 13.08.2026 (9)
Belge sürüm saklama + fark görünümü canlı (OfficialDocumentsPanel.tsx): üretim ve onay
agreement_documents'a yeni satır yazıyor (metadata.filled_text + metadata.status), sürümler
created_at'ten sıralanıyor — MIGRATION GEREKMEDİ. "Değişiklikleri göster" son iki sürümü
kelime bazlı karşılaştırıyor (LCS bileşen içinde yazıldı, yeni paket kurulmadı); eklenen
yeşil/altı çizili, silinen kırmızı/üstü çizili. "Onayla" ekrandaki metni yeni sürüm olarak
yazıyor; başlık yanında "Taslak — imza aşamasında" / "Onaylandı" işareti var. Üretim mantığı,
şablonlar ve PDF/DOCX/UDF çıktısı değişmedi. tsc + build temiz.
Sırada: canlıda doğrulama (üret → yeniden üret → fark → düzelt → onayla).

## Nerede kaldık — 13.08.2026 (8)
Onay anı bağlandı (MediationEngine.tsx, Phase2Parties): case_parties.email_confirmed_at —
yeni taraf kaydında panel onayıyla (adres doluysa) yazılıyor, düzenlemede e-posta değişip
onaylanınca yenileniyor, panelsiz değişiklikte null'a çekiliyor. (7)'deki kırıntı kapandı.
tsc + build temiz. Sırada: canlıda doğrulama, ardından "Elenen bulguların iz kaydı".

## Nerede kaldık — 13.08.2026 (7)
Kayıt onay paneli canlı (MediationEngine.tsx): ConfirmSavePanel bileşeni + üç yerde kullanım —
NewCaseForm (başvuru kaydı), Phase2Parties yeni taraf kaydı, Phase2Parties düzenleme
penceresinde e-posta değişikliği (yalnız o alan). Kayıt ancak "Onayla ve kaydet" ile düşüyor;
"Geri dön" hiçbir şey kaydetmiyor. tsc + build temiz.
KIRINTI: Onaylı e-posta işareti YAZILMADI — case_parties'te uygun alan yok, migration yazma
talimatı gereği duruldu. Gereken alan: case_parties.email_confirmed_at (timestamptz, null) —
SQL kurucudan bekleniyor. Alan gelince onay panelinde onaylanan adres için bu alan yazılacak.

## Nerede kaldık — 13.08.2026 (6)
Belge yüklenince analiz kendiliğinden koşuyor (MediationEngine.tsx, Aşama 3): başarılı
yüklemeden 30 sn sonra orchestrator-run — arka arkaya yüklemede sayaç sıfırlanır (tek koşum),
şartlar (taraf >= 2, koşan orkestratör yok) sağlanmazsa sessiz beklenir, koşum başlarsa
"Yeni belge algılandı — analiz başlatıldı" bildirimi çıkar. tsc + build temiz. Sırada: canlıda
doğrulama (iki taraf + belge yükle, 30 sn bekle), ardından "Elenen bulguların iz kaydı".

## Nerede kaldık — 13.08.2026 (5)
Aşama 1-2 sol dizin işi DURDURULDU (kod değişmedi): Aşama 1 üç katlanmaz karttan
(başvuru bilgileri · tür tespiti · takvim), Aşama 2 tek karttan ibaret — Aşama 3/4'teki
katmanlı-katlanır bölüm yapısı yok. Önce bu ekranların bölümlere ayrılması gerekiyor;
bu kart düzenini değiştireceği için kurucu kararı bekliyor. Aşama 5-8 dizini de aynı
karara bağlı.

## Nerede kaldık — 13.08.2026 (4)
Kelime birliği bitti: 8 üst şerit "AŞAMA N — …" (Türkçe İ, doğrudan büyük harf);
tekrar eden sayfa içi aşama başlıkları (Aşama 1,2,3,4,6,7,8 kartlarındaki h2) kalktı,
açıklama cümleleri yerinde. Aşama 4 durum şeridi "Sıradaki aşama: N". Aşama 6 şeridine
(OPSİYONEL) taşındı (h2'deki bilgi kaybolmasın diye). Sırada: canlıda doğrulama.

## Nerede kaldık — 13.08.2026 (3)
Faz 3/Faz 4 ana katman başlıkları sayfada da BÜYÜK HARF (doğrudan yazılı, Türkçe İ);
kaynak: FAZ3_LAYERS etiketleri + LAYER_* sabitleri, "ŞİMDİ NE YAPMALISIN" kart başlığı.
Alt bölümler küçük harf, süreç adımları ve numaralar değişmedi. Sırada: canlıda doğrulama,
ardından "Elenen bulguların iz kaydı".

## Nerede kaldık — 13.08.2026 (2)
Faz 3 sol menüsüne bölüm dizini eklendi: 1. DOSYA ÖZETİ (1.1 Uyuşmazlık konusu ·
1.2 Uyuşmazlık tür tespiti) · 2. TARAFLAR · 3. BELGELER VE ARAÇLAR. Numaralandırma
ve çizim Faz 4 ile tek kopya (numberMenuEntries + tek sideSections bloğu); Faz 4
dizini değişmedi. Sırada: canlıda doğrulama, ardından "Elenen bulguların iz kaydı".

## Nerede kaldık — 13.08.2026
Faz 4 sol menü düzeni bitti: "Şimdi ne yapmalısın" bölüm başlığı biçiminde ve listenin
1. sırasında; numaralandırma (1., 2.1 …) liste sırasından hesaplanıyor. Faz 4 girişinde
üstten açılma ve yönlendirme satırının karta kaydırması düzeltildi (window.scrollTo
"instant" + yükleme sonrası tek doğrulama; atlamada hesaplanmış konuma kaydırma).
Sırada: canlıda doğrulama, ardından "Elenen bulguların iz kaydı" (yol haritası madde 2).

## Nerede kaldık — 12.08.2026
Dürüstlük bandı (yol haritası madde 1) kod tarafında tamam: bant hesabı, ekran kartı ve
husus satırındaki Açıkla katlanır alanı main dalında. Sırada: Lovable'dan
common-ground-report redeploy + canlı test, ardından "Elenen bulguların iz kaydı"
(entry_type='elenen', yol haritası madde 2).
