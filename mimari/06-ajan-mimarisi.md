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

[v0.36 EKLEME — AJAN ENVANTERİ SATIRLARI (05–11.08)]
· party_consistency (party-consistency-check) — gizlilik sınıfı MEDIATOR_ONLY, ● CANLI.
  Orkestratör zincirine dahildir; her koşumda taraf başına çalışır, bulgular
  party_consistency_findings tablosuna yazılır.
· party_communication (party-communication-analysis) — gizlilik sınıfı MEDIATOR_ONLY, ● CANLI.
  Orkestratör zincirine dahildir ancak KOŞULLU koşar: dosyada görüşme notu veya oturum özeti
  yoksa ajan çalıştırılmaz, zincire "atlandı" kaydı düşer (bkz. §5 v0.36 eklemesi). Atlama bir
  hata değildir; zinciri durdurmaz.
Her iki ajan da ajan sözleşmesinin kalıbına uyar: sabit JSON çıktı şeması, zorunlu dayanak alanı,
sunucu tarafı eleme, "yeterli veri yok" davranışı ve denetim kaydı.

[EKLEME — ORKESTRATÖR DÖNGÜSÜNÜN BELGE TETİĞİ (13.08)] ● CANLI.
§6.2'deki "yeni belge geldikçe zincir yeniden koşar" kuralının arayüz karşılığı: Aşama 3'te bir
belge yüklemesi başarıyla bittiğinde 30 saniyelik sayaç başlar; süre dolmadan yeni yükleme
gelirse sayaç sıfırlanır (arka arkaya yüklemede tek koşum). Sayaç dolunca orchestrator-run,
"Tüm Analizi Başlat" düğmesiyle aynı çağrıyla tetiklenir — yalnız iki şart sağlanırsa:
case_parties >= 2 ve agent_states'te koşan bir orkestratör satırı yok. Şartlar sağlanmazsa
sessizce beklenir, hata gösterilmez. Elle başlatma düğmesi aynen durur.

[EKLEME — RANDEVU TEKLİFİ (13.08)] ● CANLI. randevu-teklif (edge function, verify_jwt=false):
dört eylem — "oner" ve "olustur" arabulucu JWT'si ve dosya yetkisi ister, "getir" ve "cevapla"
yalnız token ile çalışır. Saatleri sistem seçer: arabulucunun mediator_availability'deki
gelecek aralıkları okunur, bekleyen tekliflerde kullanılan saatler dışlanır; bireysel tarafa
en yakın TEK saat, kurumsal tarafa en yakın 3 FARKLI günden birer saat önerilir. Uygun saat
yoksa "musaitlik_yok" döner. Teklif satırı randevu_teklifleri tablosuna service role ile
yazılır. Kör veri: "getir" yalnız seçenekleri, taraf adını ve dosya başlığını döner; token'ı
bilmeyen istek hiçbir veri alamaz. Cevap tek seferliktir — durum 'beklemede' değilse ikinci
cevap kabul edilmez (koşul update'in içindedir). E-posta gönderimi bu turda yoktur.
