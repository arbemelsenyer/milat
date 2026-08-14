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
● 13.08: randevu-teklif — takvim sahibi dosyanın arabulucusudur (assigned_mediator_id,
  boşsa cases.user_id); JWT yalnız kimlik ve yetki kontrolü içindir. "Uygun" cevabında
  saat bağlanır: case_sessions'a ön görüşme (preliminary) / scheduled kaydı açılır,
  katılımcı teklifin tarafıdır. Oturum yazımı hata verse de tarafın cevabı kaybolmaz.
● 13.08: randevu-teklif davet yazısı — künye (dosya no, uyuşmazlık konusu başlığı, başvuran
  ve karşı taraf ADLARI, arabulucu adı) ve aynı içeriğin PDF eki eklendi. Künye dışında
  hiçbir analiz, gizli kanal içeriği veya tutar e-postaya girmez. PDF Türkçe karakterli
  gömülü fontla üretilir; font/PDF üretilemezse ek konulmaz, yazı eksiz gider.
● 13.08: Görev panosu (ajan_gorevleri) ilk yazıcı — party_confidential_analysis. Koşumda
  keşif sorusu üretildiyse ve dosyanın otomatik akışı açıksa (cases.otomatik_akis) ilgili
  taraf için tek "soru_gonder" görevi 'bekliyor' durumunda yazılır; aynı dosya+taraf için
  bekleyen görev varsa ikincisi yazılmaz. Otomatik akış kapalıyken pano hiç yazılmaz.
  Yazım best-effort: hata analizi düşürmez, yalnız loga geçer.
● 13.08: ajan-nobetci (edge function, verify_jwt=false) — otomatik akışı açık dosyalarda
  sıradaki adımı yürüten nöbetçi. Panodaki (ajan_gorevleri) bekleyen soru_gonder görevini
  kokpitteki [Soruyu gönder] ile aynı yazımla yürütür (case_discovery_questions, tarafın
  kendi party_id'si); zaten gönderilmişse görevi atlar. Tanımadığı görev tipine dokunmaz.
  Zaman kontrolü: yasal sürenin bitimine 3 gün veya az kaldıysa, gelecekte planlı oturum
  ve bekleyen randevu teklifi yoksa panoya randevu_teklifi görevi bırakır (yalnız kayıt).
  Her koşumda dosya başına agent_states'e 'nobetci' satırı yazar; bir dosyadaki hata
  diğerlerini durdurmaz, görevin sonuc alanına ve loga geçer. Güvenlik: x-cron-secret
  veya admin JWT, ikisi de yoksa 401.
● 13.08: randevu-teklif "olustur" iç çağrı kapısı — x-cron-secret CRON_SECRET ile
  eşleşirse kullanıcı JWT'si aranmaz (çağıran sistemin kendisidir; dosya/taraf
  tutarlılığı yine doğrulanır). Yalnız iç çağrıyla oluşturulan tekliflerde cevap linki
  ilgili tarafa e-postayla gider: ad, dosya künyesi (no, konu), önerilen saatler ve tek
  dokunuşluk link; karşı tarafa ait hiçbir veri geçmez. Ekrandan oluşturmada e-posta
  gönderilmez, link ekranda kalır. Gönderim hatası teklifi düşürmez.
● 13.08: ajan-nobetci randevu_teklifi görevini işler — dosyada cevap bekleyen teklif varsa
  görevi atlar (çifte teklif yok); yoksa başvuran taraf için randevu-teklif "olustur"u iç
  çağrı kapısından çağırır. Saat seçimi ve tarafa e-posta randevu-teklif'in işidir.
  Müsait saat yoksa görev atlanır; HTTP/iç çağrı hatasında görev bekliyor kalır ve
  sonraki koşuda yeniden denenir.
● 13.08: randevu-teklif'ten giden taraf e-postaları ve davet PDF'i dosyanın arabulucusunun
  adıyla imzalanır (profiles.full_name, "Arb." önekiyle); imzanın altında "Bu ileti
  MediPact AI aracılığıyla gönderilmiştir." satırı durur. Ad yoksa imza MediPact AI kalır.
● 13.08: randevu-teklif otomatik onay eşleştirmesi — taraf kendi ekranından otomatik onayı
  açtıysa (case_parties.otomatik_onay) ve önerilen saatlerden biri kendi müsaitlik
  aralığına (taraf_musaitlik) düşüyorsa teklif oluşturulduğu anda uygun sayılır: cevap,
  tarafın kendi verdiği cevapla AYNI kod yolundan geçer (durum=cevaplandi, oturum kaydı,
  davet yazısı). Bu durumda teklif linki maili gönderilmez; seçenek girdisine
  otomatik_onay işareti düşer. Kapalıysa veya saat uymuyorsa akış değişmez.
● 13.08: Video bağlantısı ajanla üretilir — create-video-room'a iç çağrı kapısı
  (x-cron-secret) eklendi; nöbetçi, otomatik akış dosyalarında gelecekteki planlı ve
  bağlantısı boş oturumlar için odayı iç kapıdan üretip oturuma yazar ve oturumun tarafına
  tek bilgilendirme e-postası gönderir (künye + gün-saat + bağlantı, arabulucu imzasıyla).
  Bağlantı yazıldıktan sonra oturum yeniden seçilmez, e-posta bir kez gider. Cevaplanmış
  teklifte yüz yüze işaretli saate düşen oturumlar atlanır. Normal JWT yolu değişmedi.
● 13.08: taraf-asistan (edge function, verify_jwt=true) — gizlilik sınıfı PARTY_SELF.
  Tarafın kendi sohbet asistanının motoru: yetki case_parties.user_id eşleşmesiyle
  doğrulanır. Bağlama yalnız tarafın kendi beyanı, kendi belgelerinin metni ve kendine
  gönderilmiş keşif soruları ile dosya künyesi (no, konu, aşama, taraf adları, planlı
  oturumlar) girer; analiz raporları, kokpit ve karşı tarafın hiçbir verisi okunmaz.
  Asistan hukuki tavsiye vermez, karşı taraf hakkında yorum ve teşhis üretmez, veri yoksa
  "bu bilgi bende yok" der. Model kapısı case-qa ile aynı üç kademedir. Her çağrı
  agent_states ve agent_worklog'a koşum izi bırakır (içerik değil).
● 13.08: Ajanın açtığı randevu tekliflerinde seçenekler oturum_tipi:"online" taşır
  (nöbetçi önce "oner" ile saatleri alır, işaretleyip "olustur"a gönderir; "oner" de iç
  kapıyı tanır). Taraf "Uygun" dediğinde oturum kaydı açılır açılmaz — seçim yüz yüze
  değilse — video odası iç kapıdan üretilir, video_link'e yazılır ve davet yazısına
  "Görüşme bağlantısı" satırı olarak girer. Yüz yüze görüşmede link üretilmez. Nöbetçinin
  video hattı yalnız açıkça yüz yüze işaretli saatleri atlar; işaretsiz eski oturumlar
  çevrim içi sayılır.
● 13.08: Nöbetçinin video hattında karar kuralı — oturumun saati Türkiye saatine çevrilip
  cevaplanmış teklif seçenekleriyle eşleştirilir; yalnız açıkça "yuz_yuze" işaretli saat
  atlanır, diğer her durumda (işaret yok, teklif yok, seçenek boş) oturum çevrim içi
  sayılır ve bağlantı üretilir. Koşum özeti incelenen oturum, atlanan yüz yüze sayısı ve
  atlama sebeplerini döndürür; oda üretimi ve e-posta hataları sessiz geçmez.
● 14.08: Otomatik akışta analiz kendiliğinden başlar — nöbetçi, otomatik_akis açık ve
  analiz sonucu olmayan (ama başvuru metni ya da belgesi bulunan) dosyalar için panoya
  'analiz_baslat' görevi açar ve aynı turda orchestrator-run'ı iç kapıdan tetikler.
  Analiz sonucu varsa, bekleyen görev varsa veya orkestratör koşuyorsa görev atlanır.
  İç kapı (x-cron-secret) orchestrator-run'a ve zincirin altı adımına eklendi; kullanıcı
  JWT yolu ve yetki kontrolleri değişmedi.

[EKLEME — İÇ ÇAĞRI KAPISI VE NÖBETÇİ GÖREV TİPLERİ (13.08)] ● CANLI.
· İç çağrı kapısı deseni (x-cron-secret + CRON_SECRET): önce randevu-teklif ve
  create-video-room'da açılmıştı; artık orchestrator-run'da ve analiz zincirinin altı
  fonksiyonunda da var — classify-dispute, detect-legal-deadlines,
  party-confidential-analysis, party-consistency-check, party-communication-analysis,
  common-ground-report. Kapı yalnız CRON_SECRET eşleşmesinde açılır; kullanıcı JWT yolu
  ve dosya yetki kontrolleri olduğu gibi durur. Orchestrator iç çağrıda alt adımlara da
  aynı başlığı iletir, böylece zincir kullanıcı oturumu olmadan yürüyebilir.
· Nöbetçi (ajan-nobetci) görev tipleri: randevu_teklifi (süre yaklaşırken teklif açar ve
  iç kapıdan oluşturur), video bağlantısı hattı (gelecekteki planlı, bağlantısı boş ve
  yüz yüze işaretli olmayan oturumlar için oda üretip tarafa arabulucu imzalı e-posta
  gönderir) ve analiz_baslat (otomatik akış açık, analiz sonucu yok, girdi varsa
  orchestrator-run'ı iç kapıdan tetikler). Tanınmayan görev tipine dokunulmaz.
