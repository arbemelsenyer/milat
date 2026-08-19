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

[EKLEME — TUR C-1: İLK TEMAS, KATILIM TEYİDİ, ÇOKLU VE ÖZEL OTURUM (14.08)] ● CANLI (kod).
· ilk_temas — Dosyaya eklenen her tarafa TEK KEZ arabulucu imzalı bilgilendirme
  e-postası: sürecin ne olduğu, arabulucunun adı, dosya künyesi (gizli içerik yok) ve
  tek dokunuşluk cevap bağlantısı. Cevap sayfası girişsizdir (/katilim/:token,
  RandevuCevap deseninin aynısı) ve token tek kullanımlıktır.
· Katılım kaydı — case_parties.katilim_durumu (beklemede | katiliyor | katilmiyor |
  bilgi_istiyor) + katilim_zamani + katilim_token. Token hiçbir istemci yüzeyine
  açılmaz; okuma/yazma yalnız taraf-katilim edge fonksiyonunda service role ile olur.
· "Katılmıyorum" → ajan o dosyada randevu AÇMAZ; sebep panoya ve yapılmayanlar
  listesine yazılır, arabulucuya onay_bekliyor kaydı ve bildirim düşer.
· "Bilgi istiyorum" → arabulucuya görev + bildirim; ajan kendi hukuki açıklama YAPMAZ.
· ek_oturum_gerekli_mi — Bir oturum "yapıldı" işaretlenip dosya kapanmadıysa ve
  gelecekte planlı oturum yoksa arabulucuya "ikinci oturum gerekli mi?" sorusu düşer
  (onay_bekliyor + bildirim). "Gerekli" denince ajan mevcut randevu hattını yeniden
  başlatır (taraf müsaitliği → teklif → davet) ve karar bir kez uygulanır; "Gerekli
  değil" denince yeni randevu açılmaz, dosya kapanış hattına aşama geçişiyle ilerler.
· ozel_oturum — Arabulucu Ajan Paneli'nden bir tarafla özel oturum talep eder; ajan
  YALNIZ o tarafa teklif gönderir, seçeneklere ozel_oturum işareti konur ve cevap
  işlenirken oturum MEVCUT "private" (Özel Görüşme) tipiyle açılır — yeni tip veya
  sütun eklenmedi. KÖR VERİ: özel oturumun varlığı, saati ve içeriği karşı tarafa
  hiçbir yüzeyden gösterilmez (taraf ekranında oturum listesi zaten yoktur; özel
  oturum notları da yalnız katılımcısına ve arabulucuya görünür).
· Koşum özetine sayaçlar: ilk_temas_gonderildi · katilim_cevabi_islendi ·
  ek_oturum_sorusu_acildi · ozel_oturum_daveti.

[EKLEME — TARAF AJANI / TUR B (14.08)] ● CANLI (kod).
Her tarafın kendi ajanı vardır; YALNIZ kendi tarafının verisini görür, karşı tarafınkini
hiçbir yoldan görmez. Süreç ajanıyla doğrudan konuşmaz — iletişim ajan_gorevleri panosu
üzerinden yürür ve taraf ajanının yazdığı her satırda hedef_party_id DOLUDUR.
· taraf_musaitlik_iste — tarafın taraf_musaitlik kaydı yoksa arabulucu imzalı, taraf
  başına TEK KEZ e-posta ([musaitlik:<party>] etiketiyle mükerrer engellenir).
· teklif_degerlendir — tarafa açık teklif varken tarafın müsaitliğiyle karşılaştırır:
  (a) saat uyuyor + case_parties.otomatik_onay açık → randevu-teklif "cevapla" iç
      kapıdan koşar (mevcut "Uygun" akışı: oturum kaydı + davet yazısı),
  (b) saat uyuyor + otomatik onay kapalı → tarafa teklif başına tek kez "ajanınız bu
      saati uygun buldu, onaylıyor musunuz?" hatırlatması,
  (c) hiçbir saat uymuyor → teklif "uymuyor" olarak İŞLENMEZ; tarafın kendi
      aralıklarından en yakın üç saat 'taraf_alternatif_saat' satırına yazılır.
· taraf_eksik_bilgi — tarafın kendi belgesi yoksa taraf başına tek kez nazik istek.
· KÖR VERİ SINIRI: panoya giden tek taraf verisi alternatif saatlerdir; tarafın gizli
  bilgisi süreç ajanına geçmez, karşı tarafın verisi hiçbir kayda girmez.
· SÜREÇ AJANI TARAFI: randevu-teklif saat seçerken önce panodaki alternatif saatleri
  dener (arabulucunun takviminde de boş olanlar); kayıt kullanılınca satır 'yapildi'
  olur ve ikinci kez teklife dönüşmez. Kayıt yoksa mevcut davranış aynen sürer.
· İZİN: case_parties.hatirlatma_izni kapalıysa taraf ajanı e-posta göndermez (kolon
  yoksa izin var sayılır — bugünkü davranış korunur).
· Koşum özetine sayaçlar: musaitlik_istendi · teklif_degerlendirildi ·
  otomatik_onaylandi · alternatif_yazildi · eksik_bilgi_istendi.

[EKLEME — OTONOM AKIŞ: NÖBETÇİ SÜRECİ BAŞTAN SONA YÜRÜTÜR (14.08)] ● CANLI (kod).
· RANDEVU TETİKLEYİCİSİ DEĞİŞTİ: "son tarihe 3 günden az kaldıysa teklif aç" kuralı
  KALDIRILDI. Yeni kural: analiz zinciri tamamlandıysa (en az bir party_analyses satırı
  ve koşan orkestratör yok), planlanmış oturum yoksa ve cevap bekleyen teklif yoksa
  randevu teklifi HEMEN açılır — süreç başlar başlamaz taraflar oturuma çağrılır.
· TARAF AJANIYLA EŞLEŞME: randevu-teklif saat önerisinde tarafın KENDİ müsaitliği
  (taraf_musaitlik) önce okunur; arabulucunun boş saatlerinden tarafın aralığına
  düşenler varsa teklif önce onlardan kurulur. Taraf müsaitlik girmemişse veya hiçbiri
  uymuyorsa arabulucunun takvimi aynen kullanılır. Tarafta otomatik onay açıksa mevcut
  anlık onay akışı çalışır; değilse tek dokunuşluk cevap linki e-postayla gider.
· AŞAMA GEÇİŞİ — 'asama_gecisi' görev tipi (yeni numaralandırma 1-7):
  1→2 en az iki taraf + belge veya başvuru metni + analiz zinciri başlatıldı ·
  2→3 taraf analizleri tamam (taraf başına en az bir analiz) + ortak zemin raporu ·
  3→4 kabul edilmiş randevudan planlanmış oturum var ·
  4→5 oturum tarihi geçmiş ve oturum 'yapıldı' işaretlenmiş ·
  5→6 bilirkişi istenmemişse (case_expert_assignments boş) doğrudan geçilir ·
  6→7 oturum notu üretilmiş ve arabulucu onayıyla kaydedilmiş (case_notes phase=7).
  Aşama YALNIZ İLERİ gider; ajan geri almaz. Her geçiş panoya [gecis:X->Y] etiketiyle
  bir kez yazılır, gerekçesiyle birlikte.
· ZORUNLU İNSAN NOKTALARI: tutanağın imzaya sunulması · anlaşma/anlaşmama kararının
  kaydı · dosyanın kapatılması · "oturum yapıldı mı?" sorusu. Bunlar panoya
  durum='onay_bekliyor' satırı olarak düşer ve arabulucuya bildirim gider; nöbetçi bu
  satırlara hiçbir koşulda dokunmaz (yürütülen tipler yalnız durum='bekliyor').
· AŞAMA 4-7 KOLLARI: oturumdan 1 gün önce (24 saat) taraflara arabulucu imzalı
  hatırlatma e-postası — oturum başına TEK KEZ ([hatirlatma:<oturum>] etiketi) ·
  oturum saati geçince arabulucuya "oturum yapıldı mı?" sorusu · yapıldı işaretli
  oturum için oturum notu taslağının arabulucuya sunulması · kapanış aşamasında üç
  onay görevi. Oturum notunun METNİ ajan tarafından uydurulmaz (m.2): taslak kayıtlı
  olgulardan kurulur, içeriği arabulucu yazar/onaylar.
· ÖN KOŞUL UYARILARI: bir kol çalıştırılamıyorsa sessiz kalınmaz — sebep zaman
  damgasıyla agent_states.last_output.yapilmayanlar listesine yazılır
  ("randevu açılamadı: analiz zinciri henüz tamamlanmadı", "aşama geçilemedi: ortak
  zemin raporu bekleniyor" gibi) ve koşum özetindeki atlama_sebepleri'ne düşer.

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

[EKLEME — KÖR TEKLİF v2 BRAKET KOLU (15.08, Tur C-2)] ● KODDA (SQL göçü + canlı test bekliyor).
· Ajan: ajan-nobetci · Kimlik: nöbetçi · Yetki: service_role (kendi kolunda yalnız
  teklif_braketleri, braket_bant_sorulari ve braket_denetim_izi tablolarına yazar).
· Girdi: dosyanın braket satırları + taraf listesi. Çıktı: bant sorusu satırları,
  taahhüt durum güncellemesi ve denetim izi kayıtları. Ajan taraflara rakam VERMEZ.
· Kollar: (1) yeni/değişmiş braketin kayda alınması, (2) iki tarafın aralığı çakışıyorsa
  örtüşme bandının yalnız arabulucunun gördüğü ize yazılması, (3) koşullu taahhüt varsa
  karşı tarafa YALNIZ bandın sorulması, (4) ret cevabında taahhüdün otomatik düşmesi.
· Gizlilik sınıfı: kör veri. Bant sorusu kaynağını taşımaz; taraf soruya yalnız
  braket_bant_sorularim / braket_bant_cevapla RPC'leriyle erişir, tabloyu göremez.
· Hata davranışı: okunamayan/yazılamayan her adımın sebebi yapilmayanlar listesine düşer.
· Denetim kaydı: braket_denetim_izi (append-only) — braket_girildi · ortusme_bulundu ·
  bant_sorusu_gonderildi · bant_sorusu_kabul/ret · taahhut_kabul · taahhut_dustu.
· Koşum özeti sayaçları: braket_girildi · ortusme_bulundu · bant_sorusu_gonderildi ·
  taahhut_dustu.

[EKLEME — UYUŞMAZLIK KONUSU ÖNERİ AJANI (15.08)] ● KODDA (redeploy + canlı test bekliyor).
· Ajan: dosya-ozeti-oner (edge function, verify_jwt=true) · Kimlik: künye yazım asistanı.
· Neden: cases.issue_description'ı hiçbir ajan doldurmuyordu; boş kalınca orchestrator-run
  classify adımını atlıyor (orchestrator-run/index.ts:226-229) ve Aşama 1'de alan
  "Girilmemiş." görünüyordu.
· GİRDİ SINIRI (bağlayıcı): yalnız cases.title · category · dispute_type_other ·
  your_role · other_party_role · relationship · desired_outcome · attempted_resolution ·
  timeline · additional_notes ve case_documents'ın DOSYA ADI + TÜRÜ.
  OKUNMAZ: party_analyses · common_ground_reports · case_documents.analysis_result ·
  case_documents.extracted_text · taraf beyanları · gizli kanal. Sebep: issue_description
  taraf ekranında da görünür (CaseRoom.tsx:453) — kör veri delinemez.
· ÇIKTI: {ozet, dayanak[]} — 2-4 cümle, "beyan ediliyor/belirtiliyor" dili.
· YAZMA YETKİSİ YOK (can_write = false): fonksiyon hiçbir tabloya yazmaz. Metni
  cases.issue_description'a yalnız arabulucu "Onayla ve kaydet" ile yazar (m.3).
· KAPI: elle girilmiş metin varsa öneri hiç üretilmez (atlandi + sebep döner).
· SUNUCU TARAFI ELEME (m.12): dayanak dizisi boşsa · metin 40 karakterden kısaysa ·
  metinde RAKAM varsa · yasaklı ifade geçiyorsa (haksız · hukuka aykırı · ihlal · kusur ·
  suç · tazminat hakkı · kanun · madde · yasa · mahkeme kararı · borçludur · yükümlüdür)
  öneri elenir ve gerekçesi ekranda gösterilir.
· YETKİ: yalnız görevli arabulucu, dosya sahibi veya yönetici çağırabilir; taraf çağıramaz.
· HATA DAVRANIŞI: her ret/eleme gerekçesiyle birlikte ekrana yazılır, sessiz kalınmaz.

[EKLEME — BELGE ÖZETİ AJANI (15.08, İBA 1.2)] ● KODDA (SQL + redeploy + canlı test bekliyor).
· Ajan: belge-ozeti (edge function, verify_jwt=false; JWT veya x-cron-secret ile girilir).
· GİRDİ SINIRI (bağlayıcı): YALNIZ o belgenin kendi metni (case_documents.extracted_text,
  mevcut extract-document-text hattının çıktısı) ve dosya adı. Başka belge, taraf analizi,
  ortak zemin raporu veya dosya verisi girdiye GİRMEZ.
· ÇIKTI: {ozet (en çok 3 cümle), kaniti (tek cümle)} → belge_ozetleri tablosu.
· GİZLİLİK: belge_ozetleri'nde tarafa SELECT politikası YOKTUR — özet yalnız arabulucu
  ve yöneticiye açıktır, taraf ekranına (CaseRoom) hiçbir sürümde çıkmaz.
· HALÜSİNASYON KAPISI: metin yoksa/okunamadıysa özet ÜRETİLMEZ, durum='metin_yok'
  ("belge metni okunamadı") yazılır. Dil tarafsızdır: "belgede ... belirtiliyor".
· SUNUCU TARAFI ELEME (m.12): özet 40 karakterden kısaysa · kaniti boşsa · yasaklı ifade
  geçiyorsa (haksız · hukuka aykırı · ihlal · kusur · suç · geçersizdir · borçludur)
  kayıt durum='elendi' + sebep olarak düşer, uydurma metin ekrana çıkmaz.
· TEKRAR ÜRETİM YOK: document_id UNIQUE; özeti olan belge için "atlandi" döner.
· TETİKLEME: extract-document-text metni yazdıktan sonra iç kapıdan (x-cron-secret)
  BEKLEMESİZ çağırır — bu çağrının hatası çıkarma hattını etkilemez. Özeti olmayan eski
  belgeler için Aşama 1 > Dosyadaki belgeler listesinde "Özet çıkar" düğmesi vardır.
  · DÜZELTME 15.08 (canlı bulgu): Yasak listesi ajanın KENDİ nitelemesine uygulanır,
    tarafın iddiasının AKTARILMASINA uygulanmaz. Denetim cümle cümledir: hüküm kelimesi
    (haksız · hukuka aykırı · ihlal · kusur · suç · geçersiz · borçlu · sorumludur)
    geçen cümle, aktarım kalıbı (ileri sürülmektedir · iddia edilmektedir ·
    belirtilmektedir · talep edilmektedir · denilmektedir vb.) taşıyorsa SERBESTTİR;
    taşımıyorsa elenir ve sebep satırında ELENEN CÜMLE yazılır.
  · DÜZELTME 15.08: kaniti alanı belgenin hangi ÇEKİŞMELİ NOKTAYA dayanak olduğunu
    (olgu · tarih · tutar · eksiklik) tek cümlede söyler; içeriği tekrar eden kalıplar
    ("bilgi yer almaktadır", "bilgileri içermektedir" vb.) sunucuda elenir. Belge
    çekişmeli bir noktaya dayanak değilse bu açıkça yazılır.
  · yenile:true ile mevcut özet yeniden üretilir ve AYNI kayıt güncellenir (listede
    "Özeti yenile" düğmesi); bayraksız çağrıda özeti olan belge "atlandi" döner.
  · DÜZELTME 15.08 (canlı bulgu — iş göremezlik raporu): ELEME İKİ SINIFA AYRILDI.
    (a) SERT ELEME (kayıt elenir, durum='elendi'): özet 40 karakterden kısaysa ya da
        AJANIN KENDİ HÜKMÜ varsa. Sebep "Özet elendi: ajanın kendi hükmü — elenen
        cümle: …" biçiminde yazılır.
    (b) KANIT SATIRI ONARIMI (özet ASLA silinmez): kanıt satırı boşsa veya içi boş
        kalıp taşıyorsa model BİR KEZ daha çağrılır ve yalnız o satırı yeniden yazması
        istenir (yasak kalıplar istemde tek tek sayılır). İkinci deneme de tutmazsa
        özet korunur, satıra "Bu belgenin hangi çekişmeli noktaya dayanak olduğu
        çıkarılamadı" yazılır ve sebep alanına "Kanıt satırı çıkarılamadı … — özet
        korundu" notu düşer. Onarım çağrısının hatası özeti etkilemez.

[EKLEME — OLAY ZAMAN ÇİZELGESİ AJANI (15.08, İBA 2.3 · §5.2g)] ● KODDA (SQL + redeploy bekliyor).
· Ajan: olay-cizelgesi (edge function, verify_jwt=true) · §5.2g'nin "hafif kademe"si;
  tam Olay Haritası (§9, K2) geldiğinde bu çizelge onun görünümlerinden biri olur.
· GİRDİ: mevcut belge metni çıkarma hattının çıktısı (case_documents.extracted_text),
  taraf beyanları (case_parties.statement) ve dosya kaydı (application_date).
  Yeni bağımsız zincir kurulmadı.
· ÇIKTI: olay_cizelgesi satırları — tarih · tarih_metni · olay (tek cümle) · kaynak_tipi
  (belge|beyan|kayit) · kaynak_document_id · kaynak_adi · kaynak_bolum · celiski_notu.
· GİZLİLİK: olay_cizelgesi'nde tarafa SELECT politikası YOKTUR; çizelge yalnız
  arabulucu/yöneticide kalır, taraf ekranına hiçbir sürümde çıkmaz.
· HALÜSİNASYON KAPISI (m.2): kaynağı çözülemeyen satır SUNUCUDA ELENİR (belge kimliği
  dosyanın belgelerinden biri değilse ya da "beyan" değilse satır atılır). Tahmini tarih
  üretilmez; "yaklaşık/civarında" gibi ifadeler tarih_metni'ne aynen aktarılır, kesin
  güne çevrilmez. Ajanın kendi hüküm cümlesi taşıyan satır elenir (aktarım kalıbı serbest).
· ÇELİŞKİ: aynı olay iki kaynakta farklı tarihteyse TEK satır yazılır, celiski_notu'na
  "Çelişki: X belgesi 14.03, Y belgesi 18.03 diyor" biçiminde not düşülür.
· TEKRAR ÜRETİM YOK: çizelgesi olan dosyada "atlandi" döner; yenile:true ile eski satırlar
  silinip yeniden yazılır ("Çizelgeyi yenile" düğmesi).
  · DÜZELTME 15.08 (canlı bulgu): (a) İLGİSİZ TARİH FİLTRESİ — çizelgeye yalnız
    uyuşmazlığın OLAY ZİNCİRİNE ait tarihler girer (tıbbi/hukuki işlem, başvuru,
    yazışma, ödeme, rapor, oturum, süre). Doğum tarihi, kimlik/nüfus cüzdanı, belgenin
    kendi düzenlenme tarihi, matbu form/baskı/geçerlilik tarihi GİRMEZ; istemde
    yasaklandı, sunucuda da kalıp taraması ile elenir ve sebebi "olay zinciriyle
    ilgisiz" olarak kayda düşer. (b) TARİH BİÇİMİ TEK: tarih_metni GG.AA.YYYY'ye
    normalize edilir (2026-08-13 → 13.08.2026); aralık "GG.AA.YYYY – GG.AA.YYYY"
    kalır; "yaklaşık Mart 2026" gibi belirsiz ifadeler AYNEN korunur.

[EKLEME — GÜÇ DENGESİ İŞARETİ AJANI (15.08, İBA 2.4)] ● KODDA (SQL + redeploy bekliyor).
· Ajan: guc-dengesi (edge function, verify_jwt=true) · Kimlik: durum tespiti asistanı.
· GİRDİ: yalnız dosyanın MEVCUT kayıtları — case_parties (vekil alanları, taraf türü,
  katılım durumu, kendi beyanı), case_documents (taraf başına belge sayımı) ve
  randevu_teklifleri (cevap kayıtları). Yeni bağımsız zincir kurulmadı.
· ÇIKTI: guc_dengesi satırları — gosterge_tipi (vekil|nitelik|belge|katilim|anlatim|yok)
  · baslik · aciklama · dayanak. DAYANAK ZORUNLUDUR; dayanaksız gösterge yazılmaz.
· YÖNTEM: yapısal göstergeler (vekil · nitelik · belge sayımı · katılım) KOD tarafından
  deterministik üretilir, modele bırakılmaz. Yalnız "anlatım farkı" göstergesi tek bir
  model çağrısıyla ve SÜREÇ BİLGİSİ DÜZEYİYLE sınırlı üretilir.
· YASAK (m.2 · §11): zekâ, eğitim, kültür, psikoloji, karakter, kişilik değerlendirmesi;
  "güçlü taraf / zayıf taraf / mağdur / haklı" etiketi; çözüm dayatması. Bu ifadelerden
  biri çıktıda geçerse gösterge SUNUCUDA ELENİR ve loga sebebiyle düşer.
· DENGESİZLİK YOKSA zorlama üretilmez: tek satır "Belirgin bir dengesizlik göstergesi
  bulunmadı" yazılır (gosterge_tipi='yok').
· GİZLİLİK: guc_dengesi'nde tarafa SELECT politikası YOKTUR; taraf ekranına hiçbir
  sürümde çıkmaz, karşı tarafa sızmaz.
· TEKRAR ÜRETİM YOK: kaydı olan dosyada "atlandi" döner; yenile:true ile eski satırlar
  silinip yeniden yazılır ("Yenile" düğmesi).

[NOT — USULE İLİŞKİN ENGELLER (15.08, İBA 2.4 / B17)] ● KODDA (yalnız Publish bekliyor).
· AJAN DEĞİLDİR: yeni edge fonksiyon, yeni tablo ve yeni AI çağrısı YOKTUR. Liste,
  arabulucu ekranında zaten yüklü olan taraf/belge/dosya kayıtlarından deterministik
  türetilir (src/pages/MediationEngine.tsx · UsulEngelleriPanel).
· Bu yüzden ajan sözleşmesi gerekmez; çıktı üretimi yoktur, kayıt okuması vardır.
· KANUN YORUMU YOK: satır yalnız eksiği söyler. Mevzuat referansı ancak dosyada
  KAYITLI bir dayanak varsa (cases.legal_basis) ve yorumsuz yazılır; uydurma madde
  numarası üretilmez (constitution m.2).
· Süre satırı mevcut süre takibinden (deadline_total / deadline_extended / extension_used)
  OKUNUR; yeniden hesaplanmaz — DeadlineCard ile çakışma olmaz.


[EKLEME 19.08.2026 — AKIŞ OMURGASI: OLAY → KURAL → SAHİP → İNSAN KAPISI]
● CANLI (deploy sonrası). Ürünün akışı bugüne kadar KODA GÖMÜLÜ ZİNCİRDİ: hangi
adımdan sonra ne olacağı, o adımı yapan fonksiyonun içine yazılıydı. Bu taşla
akış VERİYE taşındı; eski zincirler yerinde bırakıldı, yeni omurga PARALEL çalışır.

NEDEN KURAL TABLOSU, NEDEN KODA GÖMÜLÜ ZİNCİR DEĞİL:
· Zincir koda gömülüyken "bu adımdan sonra ne oluyor" sorusunun cevabı ancak kod
  okunarak bulunur. Kurucu teknik bilmez; akışı göremediği bir ürünün kararını
  veremez. Kural tablosu akışı OKUNUR kılar: bir satır bir cümledir.
· Yeni bir adım eklemek kod değişikliği, gözden geçirme ve deploy ister. Kural
  satırı yazmak istemez. Akışın hızı, kodun deploy hızına bağlı kalmaz.
· İnsan kapısı koda gömülüyken her fonksiyonda ayrı ayrı korunur ve biri unutulursa
  sessizce delinir. Kural tablosunda kapı TEK ALANDIR (insan_kapisi) ve tek yerden
  denetlenir — constitution m.3'ün ("AI önerir, insan karar verir") makine okunur hâli.
· Sahip alanı (taraf_ajani / masa_ajani / sistem), hangi ajanın hangi işi yaptığını
  tabloda görünür kılar; ajan hesap verebilirliğinin (m.6) kayıt karşılığıdır.

ÜÇ PARÇA:
1. OLAY (public.akis_olaylari) — "şu adım bitti" satırı. Yazıcı: _shared/olay.ts
   içindeki olayYaz. BEST-EFFORT: olay yazılamazsa asıl işlem BAŞARISIZ SAYILMAZ.
   KÖR VERİ: veri alanında yalnız kimlikler ve durum bilgisi durur; taraf beyanı,
   belge içeriği, analiz metni ve tutar YAZILMAZ (m.1 · m.6).
2. KURAL (public.akis_kurallari) — olay_kodu · kosul · sonraki_adim · sahip ·
   insan_kapisi · gerekce · sira · etkin. Kuralları AJAN YAZMAZ; kurucu yazar.
3. KOŞUCU (akis-yurut) — işlenmemiş olayları okur, kuralı uygular:
   · insan_kapisi=false → sonraki adımı iç kapıdan çağırır (aynı olay + aynı kural
     ikinci kez çalışmaz).
   · insan_kapisi=true → HİÇBİR ŞEY ÇAĞIRMAZ; panoya 'akis_onay_bekliyor' düşer.
   · kosul: bugün yalnız {"en_az_taraf": N}. TANIMADIĞI ANAHTARDA KURALI ATLAR —
     bilinmeyen koşul "koşul yok" sayılmaz.
   · Kural hata verirse olay İŞLENMİŞ SAYILMAZ, hata panoya 'akis_hatasi' düşer.
     Sessiz başarısızlık yoktur (m.9).
   · Koşucu TARAFA HİÇBİR ŞEY GÖNDERMEZ. E-posta gönderen tek yer kuralın çağırdığı
     mevcut fonksiyondur ve o kendi iletişim tercihi süzgecinden geçer.
· Güvenlik kapısı ajan-nobetci ile birebir aynıdır (x-cron-secret veya admin JWT).
  Koşucuyu nöbetçi, turunun SONUNDA bir kez tetikler; nöbetçinin mevcut kontrolleri
  ve sıraları değişmedi.


[EKLEME 19.08.2026 — ÇALIŞAN, ANLATAN, EKSİĞİ TAMAMLAYAN AJAN DÜZENİ]
● CANLI (deploy sonrası).

VARSAYILAN AJAN, İSTİSNA İNSAN (bağlayıcı ilke):
· Her adımda işi önce ilgili ajan çözer. İnsana ancak ŞU DÖRT işte gidilir:
  (1) imza — anlaşma belgesi ve tutanak · (2) bilirkişi ataması ·
  (3) kayıt/döküm rızası · (4) tarafla asıl müzakerenin kendisi.
· Bu dördü dışında bir işi insana bırakan her yer GEREKÇE yazar
  ("ajan yapamadı çünkü …"). Gerekçesiz insana bırakma yasaktır.
· Tarafın işini önce KENDİ ajanı yapar; masa ajanı taraf işine el atmaz.
· Sertleşme ve iletişim güçlüğü TESPİTİ de ajanın işidir: fark eder, OLGU DİLİYLE
  arabulucuya bildirir, çıkış yolu önerir. Kararı arabulucu verir. Duygu, kişilik,
  niyet ve teşhis etiketi yasaktır (constitution m.2).
· Ajan hukuki tavsiye vermez, karar vermez, "şu talebi geri çek" demez.

ANLATIM DESENİ (_shared/anlatim.ts — tek ortak yardımcı):
· Ajan çalışırken adımlarını SIRAYLA yazar. Yer: agent_states.last_output içindeki
  "adimlar" dizisi — { sira, metin, zaman }. Başlarken 'running', bitince
  'completed', hatada 'failed'.
· Her adım TEK CÜMLE, düz Türkçe. Fonksiyon adı, tablo adı, "edge function",
  "upsert", "invoke" ekrana ÇIKMAZ (yardımcıda ayrıca süzülür).
· Bitişte tek sonuç: "Yapıldı: …" ve GEREKİYORSA "Eksik: …". Eksik yoksa o satır
  hiç yazılmaz.
· BEST-EFFORT: anlatım yazılamazsa asıl iş DURMAZ; yardımcı hiçbir koşulda
  hata fırlatmaz. Fonksiyonların girdisi, çıktısı ve süzgeçleri değişmez.
· Anlatım fonksiyonların KENDİ durum yazıcısına takılır (anlatimYansit); böylece
  tek satırla bütün kollara yayılır ve mevcut kod yolları bozulmaz.
· SAHİBİNE GÖRÜNÜR: taraf ajanının adımları yalnız o tarafa (party_id +
  tarafa_gorunur), masa ajanının adımları yalnız arabulucuya. Bayrak, çağıran
  fonksiyon açıkça istemedikçe DEĞİŞTİRİLMEZ.

EKSİĞİ ÖNCE KENDİ TAMAMLAMA — SIRA (bağlayıcı):
  (a) aynı tarafın BAŞKA belgesi (belgedeAra) →
  (b) dosyada daha önce girilmiş veri: kendi beyanı, önceki kalemler (kayitlardaAra) →
  (c) YALNIZ mevzuat türü eksikler için ürünün bilgi tabanı (bilgiTabanindaAra).
· Bulursa tamamlar ve "şunu şuradan tamamladım" der; eksik satırından düşer.
· UYDURMA YASAK: bulamadıysa "tamamladım" DEMEZ, boş döner (constitution m.2).

KİME SORULACAK (eksigiSor):
· Eksik BELGE ya da TARAFIN BİLGİSİ ise → o tarafa (hedef_party_id dolu).
  Dil tamamlayıcıdır: "…bulamadım — ilgili belgeyi ekler misiniz?" Suçlayıcı
  sözcük ("eksik", "yetersiz", "vermediniz") kullanılmaz.
· Eksik KARAR, ONAY ya da USUL ise → arabulucuya (hedef_party_id boş).
· EMİN DEĞİLSE arabulucuya sorar ve gerekçesine "şüpheli" yazar.
· Aynı eksik için mükerrer bildirim yazılmaz (etiketli "önce bak, varsa yazma").

EŞZAMANLILIK:
· Taraf ajanları ve masa ajanı birbirini BEKLEMEZ, aynı anda çalışabilir.
· Aynı iş aynı dosya için iki kez başlatılmaz: satır 'running' iken yeniden
  tetiklenmez, SIRAYA DA ALINMAZ — atlanır ve sebebi döner (zatenCalisiyorMu).
  Yarıda kalmış koşum sonsuza dek kilitlemesin diye belirli süre sonra bayatlar.
· Bir ajanın hatası ötekini durdurmaz; hata kendi sohbetine düşer.

TARAF AJANININ İLK GERÇEK İŞİ (taraf-kalem-cikar):
· Tarafın KENDİ belgelerinden talep kalemlerini çıkarır; her kalemi belgedeki
  BİREBİR alıntıya bağlar. Alıntı belgede birebir yoksa SUNUCUDA ELENİR ve kalem
  "dayanaksız" işaretlenir (constitution v3.4: şema + sunucu tarafı eleme).
· Tutar belgede net okunamıyorsa boş bırakılır, tahmin edilmez.
· Tarafın kendi girdiği satıra (kaynak='taraf') DOKUNMAZ — insan üstündür (m.3).
· Karşı tarafın belgesi sorguya HİÇ GİRMEZ; masaya yalnız kalem ve dayanağı çıkar.


[EKLEME 19.08.2026 — SİSTEMİN GENEL KANUNU (yasa-1)]
● CANLI (deploy sonrası). BU BÖLÜM BAĞLAYICIDIR: bundan sonra yazılan her
yetenek bu yedi maddeye uymak zorundadır. Belirli bir özelliğin değil, ürünün
her adımının çalışma yasasıdır.

1. KENDİ BAŞLAR. İş, ilgili olay düştüğünde tetiklenir; kimse düğmeye basmaz.
   Olay yazıcısı olayYaz, tetikleyen koşucu akis-yurut, saat başı sürücü
   ajan-nobetci'dir. Elle çalıştırma düğmeleri KALIR ve "yeniden çalıştır"
   işlevini sürdürür — kaldırılmaz, yeni işin şartı değildir.
2. KENDİ SÜRER. Ajan adımlarını sırayla yapar ve SAHİBİNE düz Türkçe anlatır
   (anlatimAc / anlatimYansit). Taraf ajanının adımları yalnız o tarafa, masa
   ajanının adımları yalnız arabulucuya görünür.
3. ENGELE TAKILIRSA KENDİ ÇÖZER. Eksik girdi EN AZ İKİ FARKLI YOLDAN aranır
   (girdiTamamla): olayın verisi → dosyadaki kayıt (oturum, belge, taraf) →
   tarafın kendi başka belgesi → mevzuat türünde bilgi tabanı. Bulursa devam
   eder ve neyi nereden tamamladığını yazar. UYDURMA YASAK (constitution m.2):
   bulamadıysa tamamladım demez.
4. ÇÖZEMEZSE DOĞRU KİŞİYE SORAR. Belge ya da tarafın bilgisi ise o tarafın
   kendi ajanı üzerinden TARAFA; karar, onay ya da usul ise ARABULUCUYA
   (eksigiSor). Soru DAİMA durum='bekliyor' yazılır ve cevaplanana kadar
   hatırlatılır. Soru tipi, nöbetçinin yürüttüğü tiplerden AYRIDIR
   ('taraf_sorusu' / 'arabulucu_sorusu') — başka bir kol soruyu "atlandı"
   sayıp kapatamaz (19.08 canlı kusuru).
5. CEVAP GELİNCE KALDIĞI YERDEN DEVAM EDER. Cevap görevin sonuc alanına yazılır,
   durum 'yapildi' olur; nöbetçi cevaplanan sorunun gerekçesindeki "[kol:…]"
   etiketinden ilgili kolu BİR KEZ yeniden uyandırır. Kollar kendi mükerrer
   yazım kapılarına sahip olduğu için yapılmış işler tekrarlanmaz — baştan
   başlanmaz, eksik kalan yerden devam edilir.
6. KENDİ BİTİRİR. Her iş "Yapıldı: … / Eksik: …" ile kapanır (eksik yoksa o
   satır hiç yazılmaz) ve çıktısını ilgili panele kendisi yazar.
7. BİTİŞİ YENİ OLAY DOĞURUR. Biten iş akis_olaylari'na satır bırakır; sıradaki
   ajan onunla uyanır. Döngü, eksik kalmayana kadar döner.

YAPISAL ZORUNLULUK (yasanın kendini koruması):
· Ortak motora bağlı olmayan bir fonksiyonu KOŞUCU ÇAĞIRMAZ ve sebebini açık
  bir satırla panoya yazar. Bağlı fonksiyonların listesi tek yerdedir:
  _shared/anlatim.ts içindeki MOTORA_BAGLI. Yeni bir ajan fonksiyonu bu listeye
  eklenmeden akışta çalışamaz — böylece sonradan eklenen hiçbir yetenek
  döngünün dışında kalamaz.
· KAPSAM DIŞI OLANLAR ve gerekçesi: case-qa ve taraf-asistan yalnız soru-cevap
  YÜZEYLERİdir — olayla uyanmazlar, çıktıyı panele yazmazlar, akış adımı
  değildirler. taraf-cevap da akış adımı değildir; tarafın cevabını yazan dar
  bir kapıdır.
· İKİ DENEME SINIRI: aynı olay + aynı kural için en fazla iki deneme yapılır.
  İkisinde de olmazsa iş bırakılır ve sebebi anlaşılır tek cümleyle yazılır;
  sonsuz döngü kurulmaz.

DAYANAK ÖLÇÜSÜ (19.08 kurucu kararı, kalem çıkarımında bağlayıcı):
· Dayanak, kalemi DOĞRULAYAN BELGEYE atıftır: fatura, makbuz, dekont, rapor,
  sözleşme, bordro, ekstre, tutanak gibi. Rakamın yazılı olması dayanak değildir.
· Talebin KENDİ CÜMLESİ dayanak sayılmaz: "talep edilmektedir",
  "değerlendirilmektedir" gibi ifadeler kalemi doğrulamaz → 'dayanaksiz'.
· Niteliği gereği belgeye bağlanmayan kalem (manevi tazminat gibi) 'dayanaksiz'
  + ajan_notu="niteliği gereği belgeye bağlanmaz". BU BİR KUSUR DEĞİL, bilgi
  notudur; tarafa sorulmaz, suçlayıcı dil kullanılmaz.

HATIRLATMA:
· Cevaplanmamış sorular cevaplanana kadar hatırlatılır: ilk 24 saatte günde bir,
  sonrasında iki günde bir. Hatırlatma sohbette görünür (görevin sonuc alanı).
· E-posta gidiyorsa mevcut iletişim tercihi süzgecinden (gonderilsinMi) GEÇER:
  sessiz saate ve sıklık tercihine uyar. Aynı metin üst üste yazılmaz.
· Cevap gelince hatırlatma durur.

DEĞİŞMEZ SINIRLAR (yasanın üstünde):
· İnsana yalnız dört işte gidilir: imza · bilirkişi ataması · kayıt/döküm
  rızası · tarafla asıl müzakere. Başka her yerde insana bırakma GEREKÇE ister.
· Kör veri: taraf yalnız kendi satırlarını görür (süzgeç SORGUDA); arabulucu
  taraf ajanının metnini görmez; belge karşı tarafa geçmez.
· Ajan hukuki tavsiye vermez, karar vermez; duygu, kişilik, niyet ve teşhis
  etiketi yasaktır; uydurma yasaktır — bulamadıysa "bulamadım" der.
