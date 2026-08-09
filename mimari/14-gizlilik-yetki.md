14. GİZLİLİK VE YETKİ MODELİ (komut §4) Kontrol Kural Karşı taraf Bir tarafın verisi diğerine hiçbir
koşulda dönmez. görünürlüğü Arabulucuya özel (o Kökneden, gizli analiz yalnız görevli arabulucu *
admin. içgörü Arabulucular arası (Bir arabulucu diğerinin dosyasını göremez. Yetki kapsamı
Dosya-kapsamlı; sistem geneli rol kontrolü yasak. Taraf self-servis Yalnız kendi verisi; geniş tablo değil
dar RPC. Zorlama noktası RLS * RPC;Ul'da gizlemek koruma sayılmaz. Dışağ Veri hiçbir ortak ağa/dış
deftere/üçüncü taraf protokolüne çıkmaz. Yeni ajan yüzeyi Varsayılan (can write-false||allowed scopes
|açık yazılır. Denetim izi Özet tutar, içerik tutmaz. Kurumsal erişim Üyelik erişim vermez; dosya bazlı
grant zorunlu. Model eğitimi Ham gerçek dosya modele asla girmez; dış LLM sağlayıcısının veriyi
eğitimde kullanmaması sözleşmesel şarttır. Vaka izolasyonu Vektör/bilgi tabanında her dosyanın verisi
dosya-kapsamlı izole tutulur; dosyalar arası içerik sızıntısı olamaz (anonim istatistik hariç, 55.9). Ölçüm
yüzeyleri (o Kazanım sayacı ve kullanım sayaçları yalnız süre/işlem tipi tutar; dosya içeriği, taraf adı,
tutar sayaç kaydına girmez. Dış sorgu İçtihat/mevzuat sağlayıcılarına giden sorgu kimliksizdir (§12.2a).
Oturum kaydı / Yalnız tüm tarafların açık rızasıyla alınır; dosya-kapsamlı saklanır, sistem transkript
dışına çıkmaz, model eğitiminde kullanılmaz. Rıza kaydı denetim izinde. Bilirkişi erişimi Rol değil, dosya
bazlı grant; kapsamı arabulucu belirler, süre bitince kapanır. içerik ve karşı taraf gizli verisi bilirkişiye
hiçbir yüzeyden açılmaz (§12.6). İletişim ve MEDTIATOR ONLY) Bir tarafın iç çelişkisi, kaçındığı konu
veya iletişim deseni tutarlılık analizi karşı tarafa hiçbir yüzeyden gösterilmez; taraf yalnız kendi eksiğini
düzeltme daveti olarak görür. Dosyaya Soru Sor / Çalışma Kanalı: Yüzey yalnız görevli arabulucuya
açıktır; taraf SELECT politikası yazılmaz, bağlam başka dosyadan veri çekemez, sorgu-cevap izi denetim
izine özet olarak düşer (§8.1). Taraf geçmiş verisi: Şirketin yüklediği uyuşmazlık geçmişi yalnız o şirketin
taraf olduğu ve benzer konulu dosyalarda kullanılır; karşı tarafa, başka kuruma veya başka dosyaya
hiçbir yüzeyden açılmaz; gerçek kişiler profillenmez (§5.2f).
Yeni özellik kontrol listesi: gizlilik sınıfı? - RLS dosya-kapsamlı mı? - karşı taraf herhangi bir yoldan
görebilir mi? taraf SELECT bilerek mi yok? : denetim izine yazıyor mu? - geniş politika önerildiyse > geri
al, dar RPC. Güncelleme (01–03.08): (a) Kapatıldı — taraf, karşı tarafın kimlik/iletişim satırını
görebiliyordu; case_parties SELECT politikası daraltıldı (taraf yalnız kendi satırını, arabulucu/yönetici
tümünü görür). (b) Kapatıldı (SQL) — bilirkişi atama onayının ve müzakere kabulünün karşı taraf adına
işaretlenebilmesi; iki trigger yeniden yazıldı (durum sunucu tarafında türetilir; taraf yalnız kendi
kimliğini ekleyebilir); ikinci kat canlı test bekliyor (gerçek taraf hesabı gerektirir). (c) Daraltılacak —
multi-agent-negotiation'ın agent_states.last_output alanına yazdığı ham çıktı taraflarca okunabilir
durumda.
