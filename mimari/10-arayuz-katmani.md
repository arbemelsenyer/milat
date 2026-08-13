10. ARAYÜZ KATMANI (komut §6) 1. Ham uzun metin gösterilmez — kart, gauge, zaman çizelgesi, rozet;
uzun metin "Açıkla" altında. 2. Boş spinner yasak — adım akışı görünür (Realtime e mevcut). 3. Analiz
bitince sonuç kartı; son söz arabulucuda. 4. Her Al kartı: Açıkla - Düzelt * Gördüm ("Onayla"
kullanılmaz). 5. Güven rozeti: Yüksek/Orta/Düşük, risk renklerinden ayrı. 6. Manuel herzaman kazanır. 7.
Görsel kimlik: MİLAT navy-altın paleti, kart derinlik sistemi e.

[v0.36 EKLEME — KATMANLI KATLANIR EKRAN DÜZENİ (05–11.08)] 8. Uzun ekranlar katman düzenine
geçti: üstte katlanmayan durum şeridi, altında tıklanabilir katlanır katman başlıkları (ana
başlık + sayaç + tek satır italik açıklama), katman içinde bölüm satırları. Kutu içinde kutu yok,
iki yazı boyu, renk yalnız rozetlerde, emoji yok, ince gri ayraçlar.
· Faz 4 — Arabulucu Paneli: dört katman — Masaya otururken · Dayanak katmanı · Kokpit · Rapor ve
  belgeler. Sol menüde iki kademeli gruplama (katman başlığı + altında bölümler); tıklanınca
  ilgili katman/bölüm açılır ve oraya kaydırılır. Bölüm bazlı PDF düğmeleri ve katman başlığında
  "Rapor oluştur" seçim penceresi. Rapor çıktısında "Uzlaşma tahmini" paylaşılabilir kalem,
  "ZOPA" arabulucuya özel kalem olarak AYRI durur.
  ● 13.08: Sol menüde "Şimdi ne yapmalısın" bölüm başlığı biçiminde (1. sırada);
    başlıklar 1..n, alt maddeler bağlı olduğu başlığın numarasını alır (2.1, 2.2 …).
    Numaralar liste sırasından hesaplanır, yalnız sol menüdedir; sayfadaki başlıklar
    numarasızdır. Büyük harf Türkçe kuralına göre (ŞİMDİ NE YAPMALISIN).
  ● 13.08: Faz 3 sol menüsüne aynı bölüm dizini geldi (1. DOSYA ÖZETİ · 1.1 Uyuşmazlık
    konusu · 1.2 Uyuşmazlık tür tespiti · 2. TARAFLAR · 3. BELGELER VE ARAÇLAR);
    numaralandırma ve çizim Faz 4 ile tek kopyadır (numberMenuEntries).
  ● 13.08: Ana katman başlıkları hem sol dizinde hem sayfada BÜYÜK HARF (Türkçe İ ile,
    doğrudan yazılı); alt bölüm başlıkları küçük harf kaldı.
  ● 13.08: Kelime birliği — kullanıcıya görünen her yerde "Aşama" (üst şeritler
    "AŞAMA N — …"); üst şeritle tekrarlanan sayfa içi aşama başlıkları kaldırıldı
    (açıklama cümleleri kaldı); Aşama 4 durum şeridinde "Sıradaki aşama: N".
· Faz 3 — Taraf Analizi: aynı düzene geçti — üç katman: Dosya özeti (uyuşmazlık konusu metni
  varsayılan kapalı · uyuşmazlık tür tespiti varsayılan açık) · Taraflar (kartlar tek satır özet,
  tıklayınca detay ve analiz düğmeleri) · Belgeler ve araçlar (metin çıkarma). Sol menüde
  "3. Taraf Analizi" altında girintili katman satırları.
9. KALICI: Faz 3 tür tespiti iki menüdür (ana tür + alt uzmanlık) — hiçbir düzen değişikliğinde
   kaldırılamaz (§5 v0.36 kalıcı şart).

[EKLEME — KAYIT ONAY PANELİ (13.08)] ● CANLI. 10. Kayıt "kontrol et → düzelt → onayla"
kapısından geçer: kaydet düğmesi kaydı düşürmez, önce girilen bilgilerin özet paneli çıkar.
Her satırın yanında Düzenle vardır; düzeltme panelin içinde yapılır, forma dönmek gerekmez.
Altta iki düğme: "Onayla ve kaydet" (kayıt ancak burada düşer) ve "Geri dön" (forma döner,
hiçbir şey kaydedilmez). Panel üç yerdedir: yeni başvuru kaydı (Aşama 1) · yeni taraf kaydı
(Aşama 2) · taraf e-postasının sonradan eklenmesi/değiştirilmesi (yalnız o alanla). Kural
"Onayla kullanılmaz" (m.4) AI kartlarına ilişkindir; burada onaylanan AI çıktısı değil,
arabulucunun kendi girdiği kayıttır.
● 13.08: Onay anı kayda yazılıyor — case_parties.email_confirmed_at. Yeni taraf kaydında
  panel onaylanırsa (adres doluysa) onay anı damgalanır; düzenlemede e-posta değişip panelde
  onaylanırsa damga yenilenir. E-posta panelsiz bir yoldan değişirse damga null'a çekilir,
  onaysız adres onaylı görünmez.
● 13.08: Taraf onaylanıp kaydedilince davet gönderim kartı çıkıyor (Aşama 2): alıcı adı,
  onaylı e-posta adresi ve mevcut davet e-postasının özeti; üç düğme — Gönder (mevcut
  send-party-invite akışı), Düzenle (adres karttan düzeltilir, yeni adres onay panelinden
  geçmeden kaydedilmez), Şimdi değil (kart kapanır, elle "Davet Gönder" düğmesi yerinde
  durur). E-postası olmayan tarafta kart çıkmaz; "Davet Linki Oluştur" akışı değişmedi.
  Kayıt anında kendiliğinden gönderim kaldırıldı — gönderim artık arabulucunun onayıyla.
● 13.08: Takvim sayfası iki sekmeye ayrıldı — "Ajanda" (mevcut toplantı ve yasal süre listesi,
  değişmedi) ve "Müsaitlik". Müsaitlik ay ızgarasıdır: ileri/geri ay okları, müsaitlik girilen
  günler yeşil tonda, bugün belirgin. Güne tıklanınca o günün aralıkları listelenir; başlangıç
  ve bitiş saatiyle aralık eklenir/silinir (mediator_availability, user_id = oturumdaki
  kullanıcı). Tek kolaylık aracı vardır: günün aralıklarını sonraki N güne kopyalama
  (aynı aralık iki kez yazılmaz). Geçmiş güne aralık eklenemez. Bu ekran yalnız kayıt içindir —
  randevu bağlama, ajan entegrasyonu ve bildirim yoktur.
● 13.08: Girişsiz randevu cevap sayfası (/randevu/:token) — menü, giriş ve başka bağlantı yok;
  tek seçenekte "Toplantınız … için planlandı" + [Uygun]/[Uymuyor], çok seçenekte "Uygun saate
  dokunun" + saat düğmeleri + küçük "Hiçbiri uymuyor". Cevap sonrası yalnız "Teşekkürler,
  kaydedildi."; geçersiz veya cevaplanmış token "Bu bağlantının süresi dolmuş." Aşama 5'te
  "Randevu ayarla" kartı: taraf seçilir, sistemin seçtiği saatler kart olarak gösterilir,
  [Oluştur ve linki al] ile link üretilir ([Kopyala] · [WhatsApp'ta aç]); [Düzenle] saatleri
  değiştirmenin tek yoludur, ayrı manuel saat seçme ekranı yoktur.
● 13.08: Kokpitteki "ŞİMDİ NE YAPMALISIN" kartında oturum planlamayı öneren maddede
  "Randevu ayarla" eylem düğmesi var; düğme Aşama 5'teki mevcut randevu akışını tetikler
  (tek taraflı dosyada taraf otomatik seçilir ve saat önerisi istenir, çok taraflıda
  kullanıcı Aşama 5'teki bölümde tarafı kendisi seçer). Diğer maddelerde düğme çıkmaz.
● 13.08: "ŞİMDİ NE YAPMALISIN" kartına keşif sorusu kolu — tarafa iletilmemiş sıradaki
  soru madde olarak çıkar (taraf adı + önizleme), [Soruyu gönder] soruyu yalnız o tarafın
  kendi kanalına (case_discovery_questions, party_id) yazar; taraf kendi ekranındaki
  İhtiyaç Tespiti bölümünde görür. E-posta gönderilmez, karşı taraf göremez. Gönderilen
  soru bir daha madde olmaz; kartta "✓ Gönderildi" satırı görünür.
● 13.08: Sol paneldeki dosya künyesinde "Otomatik akış" anahtarı (cases.otomatik_akis) —
  Açık/Kapalı durumu ve "Açıkken ajan sıradaki adımları kendisi yürütür; her adımı kayda
  yazar." açıklaması. Yalnız arabulucu/admin görür ve değiştirir; taraf yüzeylerinde yok.
  Kayıt hatası ekranda gösterilir. Anahtar şimdilik yalnız değeri saklar; nöbetçi fonksiyon
  gelene kadar hiçbir davranışı tetiklemez.
● 13.08: Taraf ekranında "Randevu Tercihlerim" sekmesi — taraf kendi müsait gün/saat
  aralıklarını ekler, listeler, siler (taraf_musaitlik, kendi party_id'si) ve "müsait
  saatlerime uyan teklifleri benim adıma onayla" anahtarını (case_parties.otomatik_onay)
  açıp kapatır. Bilgiler yalnız tarafın kendisine ve arabulucusuna aittir; karşı tarafa
  hiçbir yüzeyden açılmaz. Okuma/yazma hataları ekranda gösterilir.
● 13.08: Aşama geçişinde ana alan artık bekletilmiyor — AnimatePresence mode="wait"
  kaldırıldı; yeni aşama, eskisinin çıkış animasyonunu beklemeden mount olur (sol menüden
  Aşama 4'e geçişteki boş sayfa bu yüzden oluşuyordu). Kokpit brifingindeki "Kritik
  Faktörler" birleştirmesi güçlendirildi: aynı maddenin farklı ifadeleri ve genişletilmiş
  hâlleri tek satıra iner, kaynak etiketleri korunur.
