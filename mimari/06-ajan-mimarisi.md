6. AJAN MİMARİSİ VE AJAN SÖZLEŞMESİ 6.1 Ajan sözleşmesi — kod yazılmadan önce doldurulur Alan
Açıklama Girdi Hangi tablolardan, hangi kapsamda okur Çıktı şeması Sabit JSON — serbest metin
dönmez Gizlilik sınıfı (MEDTATOR, ONLY): (PARTY, SELF): (CASE SHARED )-(SYSTEM) Yetki kapsamı
Dosya-kapsamlı (rol tabanlı değil) Hata davranışı Veri yoksa "yeterli veri yok"; hatada zinciri durdur
Denetim kaydı Hangi ajan, kimin yetkisiyle, hangi veriyle, ne zaman 6.2 Ajan envanteri Orkestratör =
uçtan uca analiz ajanı (karar 03.08): tek atış değil, döngü — yeni girdi (görüşme notu, video/transkript,
sesli özet, yeni belge, defter kayıtları) geldikçe analiz zinciri yeniden koşar; her koşum deftere yazar;
yeniden analiz katmanları (iç tutarlılık, iletişim/asıl ihtiyaç) bu döngüye bağlanır. Ajan Gizlilik sınıfı
Durum Sınıflandırma (( classify-dispute |) CASE SHARED . Süre ((detect-legal-deadlines ) CASE SHARED .
Taraf analizi * kök neden ((party-confidential- MEDIATOR ONLY . analysis) Ortak zemin (( common
-ground-report ) MEDIATOR, ONLY . Müzakere simülasyonu ((multi-agent- MEDIATOR ONLY . negotiation)
Kör Teklif motoru Taraf: kendi girdisi / . Arabulucu: örtüşme Belge üretimi ((generate-official-document )
— CASE SHARED . AI değil, §3 motoru Orchestrator ((orchestrator-run )) MEDJATOR ONLY . Toplantı notu
analizi ((analyze-meeting-notes ) MEDIATOR ONLY . İç tutarlılık denetimi (55.2) MEDIATOR ONLY o
İletişim ve asıl ihtiyaç analizi * keşif sorusu üreteci MEDIATOR ONLY o (§5.2a) Dosya soru-cevap ajanı —
Dosyaya Soru Sor / Çalışma Kanalı V1 (§8.1) MEDIATOR ONLY o Taraf geçmişi profil ajanı — kamu emsal
profili + şirket geçmişi Anlaşma Belgesi Denetçisi (kural tabanlı tarama — §5.4b) MEDIATOR_ONLY o —
radar paketiyle (K16) (§5.2f) MEDIATOR ONLY o (K1-2 Aşama 2, K3 Aşama 3) Dikey uzman ajanlar
(işçi-işveren, sigorta, sağlık, MEDIATOR ONLY o Aşama FSM) — prompt enjeksiyonu 2 Olay Haritası ajanı
MEDIATOR ONLY o (K2) Uyumj/eskalasyon ajanı (§11) SYSTEM o Bilirkişi soru hazırlayıcı MEDIATOR
ONLY o Canlı seans copilot MEDIATOR ONLY o uzun vade 

[v0.35 EKLEME — AJAN ENVANTERİ DURUM GÜNCELLEMESİ (09.08)] İç tutarlılık denetimi ● CANLI ·
İletişim ve asıl ihtiyaç analizi + keşif sorusu üreteci ● CANLI · Dosya soru-cevap ajanı ● CANLI.

[v0.35 EKLEME — YENİ AJAN: PROVA AJANI (Aşama 2, MEDIATOR_ONLY, planlı)] Arabulucu, oturuma
girmeden önce karşı tarafı doğal dille canlandıran bir ajanla prova yapar. Ajan yalnız
arabulucunun görme yetkisi olan verilerden beslenir; taraf gizli kanallarına HİÇBİR koşulda
girmez. Prova sonunda kısa geri bildirim raporu opsiyoneldir ve yalnız arabulucunun kendi
provasına ilişkindir — taraf hakkında puan, profil veya kişilik çıkarımı üretmez (m.10 profilleme
sınırı, §11 teşhis dili yasağı).

6.3 Bilirkişi kararı (değişmez) AI bilirkişi raporu
üretmez — rapor hukuken delildir. AI soruyu ve çerçeveyi hazırlar; raporu sistemde tanımlı gerçek
bilirkişi yazar (uzman havuzu modeli). Bilirkişi bunu kendi hesabıyla yapar; rol, erişim ve yüzey modeli
§12.6'dadır.
