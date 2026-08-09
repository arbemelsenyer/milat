3. ÇEKİRDEK MODÜL — "Bilgi bir kere girilir, belgeye kendiliğinden geçer" (komut §3) Tüm aşamalarda
geçerli. Sistemde kayıtlı hiçbir bilgi belgeye elle bir daha yazılmaz: ad/unvan, TC/vergi no, adres, vekil,
yetkili kişi, vergi dairesi, ticaret sicil, uyuşmazlık konusu, dava şartıysa görevlendirme tarihi, süreç
başlangıç-bitiş tarihleri, toplantı(lar) tarih/yer/başlangıç-bitiş saatleri, büro adı * büro dosya no *
arabuluculuk (UYAP) dosya no, arabulucu kimliği/adresi/IBAN, anlaşma metinleri ve uyuşmazlık
kapsamında taşınmaz varsa açık adres bilgileri > tutanağa ve tüm belgelere otomatik akar. Şablon
seçimi üç katmanlı sınıflandırmaya göre (§12.0), blok bileşimi kural tablosuna göre (§5.4a); doldurma
motoru tektir, dikeyden bağımsızdır ve AI içermez. Bileşen Durum Taraf ana bilgileri * ikincil alanlar
(yetkili, vergi dairesi, © ticaret sicil, rol) belgeye akışı Vekil bloğu (ad, baro, sicil — opsiyonel) belgede
taraf altında e Büro no / arb noföyden belgeye © Uyuşmazlık konusu serbest metin akışı © (IDOĞRULAJ
| Bakanlık şablon metinlerinde alan doğrulaması Görevlendirme/atanma tarihi manuel alanı (dava şartı:
o UYAP'tan okunup girilir; ihtiyari: belirleme tarihi) Düzenlenme yeri — arabulucu profil adresi; profile
adres/sicil (o o no alanları Büro ADI manuel alanı (föy satır 1) * Bilirkişi föy alanı o Dikeye özgü şablon
setinin aynı motorla dolması o Aşama2 3.4 Düzenlenebilir taslak akışı (otomatik # kilitli) * Üretilen her
belgearabulucuya düzenlenebilir taslak olarak sunulur; kaydetmeden önce her alan ve serbest metin
değiştirilebilir, kayıttan sonra da yeniden açılıp düzeltilebilir. · Kaydageri yazma sorusu: Arabulucu
belgede kayıtlı bir alanı düzeltirse (TC, adres, tarih vb.) sistem sorar: "Bu düzeltmeyi dosya kaydına da
işleyeyim mi?" — tek doğruluk kaynağı korunur, aynı hata sonraki belgede tekrarlamaz. Serbest metin
düzeltmeleri belgeye özeldir, kayda yazılmaz. · Yenidenüretim koruması: Belge yeniden üretilirken elle
yapılan düzeltmeler sessizce ezilmez — korunur veya üzerine yazılacak düzeltmeler açıkça listelenip
onay istenir. · Belgedüzeltmeleridenetim izine yazılır (kim, ne zaman, hangi belge — içerik değil özet).
3.5 Anlaşma veri bloğu (sürecin kapanış verisi — yapılandırılmış) Her dosyanın sonunda anlaşma sonucu
yapılandırılmış girilir; serbest metin değil: agreement terms outcome ('anlaşma' | 'anlaşamama' |
'kısmi') items| | -- talep kalemleri motorundan (§5.2): kalem, anlaşılan tutar, durum total amount --
kalem toplamı; elle düzeltilebilir (§3.4) payment schedulelJ -- peşin/taksit; vade tarihleri ve tutarları
payment method -havale/IBAN · elden : çek/senet · diğer partial scope -- kısmi anlaşmada hangi
konular anlaşıldı/anlaşılamadı Belgeye akış (m.17/18 sınırıyla): . yalnız Anlaşma Belgesi'ne otomatik
akar (kalem tablosu * ödeme takvimi * yöntem). · SonTutanakyalnız sonucu alır: anlaşma sağlandı /
sağlanamadı / kısmen (kısmi kapsamıyla). Şartlar Son Tutanak'a sızamaz — constitution m.5. ·
OÖdeyensenaryosu ve ücret hesabı (§5.5) sonuç * dosya tipinden zaten kurulur; anlaşma tutarı yüzde
usulü ücrete girdi olur. . ödeme defterine beklenen ödeme kayıtları olarak düşer — tahsilat takibi
defterden yürür. · Kapanışözeti(§5.1) tutar/sonuç alanlarını buradan okur; veri çarkına anonim
istatistik buradan gider. §3'ün kalan o kalemleri, kurucunun göndereceği 2 örnek tutanak (dava şartı *
ihtiyari, PIl temizlenmiş) ve bilgilendirme belgesi örneği ile hedef çıktı üzerinden bütüncül
tamamlanacak — alan alan yamama yok.
