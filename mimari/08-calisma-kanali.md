8. ARABULUCU-AJAN ÇALIŞMA KANALI (komut §7g) Dosya içinde yalnız görevli arabulucunun gördüğü
sohbet yüzeyi; ajanlar isimli üye olarak, okudukları kayıtla cevap verir.
Sürüm Yetki İçerik V1— okuyan salt okuma Dosyada var olanı cevaplar; her cevapta "Açıkla"; künye
temizleyici devrede V2— onaylı Mevcut analizleri yeniden çalıştırır; föy/tutanağa yazma yok tetikleyen
çalıştırma V3— konuşan proaktif "Son tarihe 5 gün", "konu değişti, analizler eski metne göre" Gizlilik: En
hassas yüzey — kök neden modeli birebir: taraf SELECT politikası yazılmaz, yetki dosyakapsamlı,
bağlam başka dosyadan veri çekemez. Maliyet: abonelik kotasına bağlanır (§13). Açık karar KI. 8.1
Dosyaya Soru Sor — Çalışma Kanalı V1'in somut hâli (karar 04.08) Ne yapar (düz anlatım): Arabulucu,
dosyanın içinde aklına gelen soruyu serbest metinle sorar; sistem yalnız o dosyada kayıtlı veriden cevap
verir. Örnekler: "İhtarname tebliği ile fesih arasında kaç gün geçmiş?" · "Taraflar hangi kalemlerde
anlaşamıyor?" · "Bu dosyada ücret sözleşmesi kaydı var mı, tutarı ne?" Bu, ürünün dikey karşılığıdır:
hazır analiz zinciri (Orchestrator) dosyanın standart okumasını yapar; Dosyaya Soru Sor ise
arabulucunun o anki spesifik sorusunu cevaplar — ikisi birbirinin yerine geçmez. Girdi kapsamı (salt
okuma — V1): yalnız açık dosyanın kayıtları — belge metinleri (extracted_text, §5.2d), föy/künye ve
süreç tarihleri, taraf beyanları ve analiz çıktıları, ajan çalışma defteri (rapor içi + rapor dışı), Olay
Haritası olguları (devreye girdiğinde), ödeme defteri (okuma). Bilgi tabanı (RAG) yalnız hukuki bağlam
sorularında ve kaynak imzasıyla devreye girer. Değişmez kurallar: · Cevap yalnız dosyada kayıtlı
veriden üretilir; dosyada olmayan hiçbir olgu varsayılmaz. Veri yoksa cevap "Yeterli veri yok"tur ve
mümkünse hangi belge/bilgi gelirse cevaplanabileceği söylenir (defterin veri_yetersiz mantığıyla aynı
dil). · Her cevap kaynak atıflıdır: hangi belgeye/sayfaya, hangi föy alanına veya hangi analiz çıktısına
dayandığı cevabın altında yazar; "Açıkla" ile dayanağa inilir. Künye temizleyici bu yüzeyde de
devrededir. · Gizlilik sınıfı MEDIATOR_ONLY: yüzey yalnız görevli arabulucuya görünür; taraf yüzeyine
hiçbir sürümde açılmaz. Bağlam başka dosyadan veri çekemez (dosya-kapsamlı yetki). · Salt okumadır:
föye, tutanağa, deftere, hiçbir kayda yazmaz; analiz tetiklemez (o yetki V2'nindir). · Teşhis/yönlendirme
dili yasağı (§11) ve tarafsızlık kuralı bu yüzeyde de aynen geçerlidir. · Sorular ve cevaplar denetim izine
özet olarak yazılır (içerik değil özet — §7); sorgular analiz kotasına dahildir (§13). Ajan sözleşmesi (§6.1)
doldurulmadan kod yazılmaz. Zamanlama: pilot blokeri değildir; yol haritasında Aşama 1 sonrası
öncelikli yetenekler arasındadır ve pilot demosunda gösterim değeri yüksektir.


[v0.35 EKLEME — DOSYAYA SORU SOR DURUMU: ● CANLI (09.08)] Üç doğrulama sınavı geçildi: (1) belge
sorusu — cevap belge adı ve birebir alıntıyla geldi; (2) beyan sorusu — iki tarafın pozisyonu,
kaynak olarak dosya kayıtları; (3) tahmin yasağı sınavı — kayıtlarda olmayan soruya "bu dosyanın
kayıtlarında cevabı yok" cevabı, kaynak listesi boş. Model hattı: fonksiyon önce projenin mevcut
OpenAI anahtarına gider; Google ve eski geçit yedekte durur — bu düzenleme ek maliyet doğurmaz ve
kredi bağımlılığını kaldırır; kredi tüketen diğer ajanlar için de aynı yol geçerlidir. Yol
haritası madde 4 KAPANDI. Kırıntı: panel, fonksiyonun ürettiği Türkçe hata mesajını göstermiyor.
Sohbet hâline getirilmesi (takip sorularını anlama, balon görünüm) ana liste bitiminde ele
alınacak ayrı kalemdir.

