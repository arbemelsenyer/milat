## Nerede kaldık — 14.08.2026 (50) · AŞAMA 1 TEK GİRİŞ KAPISI
- [x] Aşama 1 tek ekran: uyuşmazlık konusu/türü · dava şartı-ihtiyari ve yasal süre
      (cases.mediation_type + mevcut süre alanları) · TARAFLAR (eski Aşama 2 bloğu
      birebir taşındı) · BELGELER (dosya bazında yükleme, taraf seçimi isteğe bağlı,
      PDF/Word/metin 10 MB).
- [x] Eski Aşama 2 kaldırıldı; aşamalar 8 → 7'ye indi (3→2, 4→3, 5→4, 6→5, 7→6, 8→7).
      Üst şerit, sol menü, kilit kuralı, gotoPhase, kokpit göndermeleri güncellendi.
- [x] URL: ?phase=N&pv=2. pv taşımayan eski bağlantı eski numaralı sayılıp yenisine
      çevriliyor ve adres bir kez düzeltiliyor.
- [x] Aşama 1 düzeni Aşama 3 (kokpit) kalıbında: solda ve sağda ikişer ANA KATMAN
      (BÜYÜK HARF), altlarında alt katmanlar (normal yazım), mobilde tek sütun.
- [x] Taraf Analizi ekranındaki taraf bazlı belge yükleme aynen duruyor.
tsc + build temiz. CANLI TEST YAPILMADI.
REDEPLOY GEREKLİ: create-video-room (bildirim linki phase=5 → phase=4&pv=2).
AÇIK UÇLAR (kurucu kararı bekliyor):
- cases.current_phase kayıtlı sayıları eski numaralamada; yalnız "hangi aşama açılsın"
  ipucu olarak kullanılıyor ve 1..7 aralığına sınırlanıyor. İstenirse tek seferlik
  SQL ile kaydırılabilir.
- case_notes.phase = 7 (görüşme notu işareti) VERİ alanıdır, dokunulmadı;
  CaseNotesFAB'daki 8 satırlık aşama etiketleri de bu yüzden eski adlarda bırakıldı.
- CaseRoom'daki taraf zaman çizelgesi (8 adımlı PROCESS_STEPS) ayrı bir listedir,
  aşama numarasıyla birebir eşleşmiyor; taraf ekranı olduğu için değiştirilmedi.

## 13.08.2026 — GÜN SONU · Nerede kaldık

BİTENLER (canlı doğrulandı):
- Randevu ajanı uçtan uca çalışıyor: saatleri sistem seçiyor, teklif linki tarafa
  gidiyor, taraf tek dokunuşla cevaplıyor, oturum kaydı ve davet yazısı açılıyor.
- Otomatik pilot tam otonom döngü: nöbetçi panoyu işliyor, süre yaklaşınca randevu
  teklifi açıyor, keşif sorularını tarafın kanalına yazıyor.
- Video bağlantısı hattı düzeldi: TZ tanımsızlığı (ReferenceError), UTC↔TR saat farkı ve
  günü gözetmeyen teklif eşleştirmesi giderildi; arabulucu imzalı bağlantı e-postası canlı.
- Taraf asistanı motoru (taraf-asistan) yayında; CaseRoom'da "Dosya Asistanım" kutusu canlı.
- Rol duyarlı yönlendirme: dosya açan tüm bağlantılar tek kapıdan (/cases/<id>) geçiyor;
  taraf CaseRoom'a, arabulucu 8 aşamalı ekrana gidiyor. Taraf girişi çalışır hâlde.
- Otomatik akış varsayılanı false'a sabitlendi.
- Nöbetçiye analiz_baslat görevi + zincirdeki 6 analiz fonksiyonuna iç kapı (e9df31a):
  yayında, CANLI TESTİ YAPILMADI.

YENİ İŞLER (kurucu kararı, bu sırayla):
1. Aşama 1 TEK GİRİŞ KAPISI olacak: uyuşmazlık konusu, türü, dava şartı mı ihtiyari mi
   (süreler buna bağlı), taraf bilgileri ve BELGELER hepsi Aşama 1'de toplanacak.
   Sebep: belge yalnız Aşama 3'te girilebildiği için ajan dosya açılışında işe
   başlayamıyor.
2. Eski Aşama 2 (Taraflar) kalkacak; Taraf Analizi yeni Aşama 2 olacak, sonraki
   aşamalar birer basamak kayacak.
3. Yeni Aşama 1'in sayfa düzeni Aşama 4'ü örnek alacak: solda ve sağda ana katmanlar,
   altlarında alt katmanlar; büyük harf/küçük harf düzenine dikkat.
4. Sağlık test dosyasında otomatik analizin canlı testi (taraflar eklendi, 7 farazi
   PDF hazır).

AÇIK UÇLAR:
- analiz_baslat zinciri canlıda hiç koşmadı (madde 4 bunu da kapatacak).
- Sekiz edge fonksiyonu redeploy bekliyor olabilir: ajan-nobetci, orchestrator-run,
  classify-dispute, detect-legal-deadlines, party-confidential-analysis,
  party-consistency-check, party-communication-analysis, common-ground-report.

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

## Nerede kaldık — 14.08.2026 (49)
Otomatik akış açık dosyalarda analiz kendiliğinden başlıyor:
- "Tüm Analizi Başlat" düğmesinin çağırdığı fonksiyon: orchestrator-run.
- ajan-nobetci'ye 'analiz_baslat' görev tipi eklendi: otomatik_akis açık + dosyada
  party_analyses kaydı yok + girdi var (issue_description veya en az bir case_documents
  satırı) ise pano görevi AÇILIYOR ve aynı turda işleniyor. İşleme, orchestrator-run'ı
  x-cron-secret iç kapısından çağırıyor. Tekrar koruması: bekleyen aynı görev varsa,
  analiz sonucu oluşmuşsa veya orkestratör 'running' ise atlanıyor.
- İç kapı zinciri: orchestrator-run'a create-video-room desenli kapı eklendi ve alt
  çağrılara x-cron-secret iletiliyor; zincirdeki altı fonksiyona (classify-dispute,
  detect-legal-deadlines, party-confidential-analysis, party-consistency-check,
  party-communication-analysis, common-ground-report) aynı kapı eklendi — hepsi kullanıcı
  JWT'si isteyip 401 döndüğü için zincir aksi hâlde koşamıyordu. Kullanıcı JWT yolu ve
  yetki kontrolleri aynen duruyor; iç çağrıda party_analyses.user_id için kullanıcı yoksa
  tarafın kendi user_id'si kullanılıyor.
- Koşum özetine analiz_baslatildi, analiz_gorevi_acildi sayaçları ve atlanan görevlerin
  sebepleri eklendi. Randevu ve video hatları değişmedi. tsc temiz.
REDEPLOY GEREKLİ: ajan-nobetci, orchestrator-run, classify-dispute,
detect-legal-deadlines, party-confidential-analysis, party-consistency-check,
party-communication-analysis, common-ground-report.

## Nerede kaldık — 13.08.2026 (48)
Dosya açan tüm yollar tek kapıya (/cases/:id) alındı: Archive kartı, Auth davet sonrası
yönlendirme, MediatorDashboard "Tam Görünüm", AgentControlPanel'in iki düğmesi, ekran
tarafındaki bildirim linkleri (SessionScheduler, CaseRoom×2) ve edge fonksiyonlarındaki
bildirim linkleri (send-meeting-invite, cancel-meeting-invite, orchestrator-run).
Kapı artık gelen query parametrelerini koruyor (ör. ?phase=4 → /legal-reasoning'e taşınıyor).
Doğrudan /case-room/ yalnız iki yerde kaldı ve kalması gerekiyor: kapının kendi taraf
yönlendirmesi ve MediationEngine'deki sayfa koruması. tsc + build temiz.
REDEPLOY GEREKLİ: send-meeting-invite, cancel-meeting-invite, orchestrator-run
(yalnız bildirim link metni değişti).

## Nerede kaldık — 13.08.2026 (47)
Dosya yönlendirmesi rol duyarlı oldu: /cases/:id (CaseRedirect) artık tek kapı —
case_parties.user_id eşleşen kullanıcı TARAF sayılıp /case-room/:id'ye, dosya sahibi /
görevli arabulucu / admin ise /legal-reasoning?caseId=...'e gidiyor, hiçbiri değilse
"erişim yetkiniz yok" ekranı çıkıyor (taraf kaydı öncelikli). Dashboard'daki kart tıklaması
da bu kapıdan geçiyor. Sayfa seviyesi koruma: MediationEngine'de taraf olup yönetici
olmayan kullanıcı adresi elle yazsa bile /case-room/:id'ye yönlendiriliyor; sahibi,
arabulucu ve admin etkilenmiyor. tsc + build temiz.

## Nerede kaldık — 13.08.2026 (46)
"Görüşme bağlantınız" e-postasının imza çözümlemesi randevu-teklif'teki çalışan kodun
birebir aynısına çevrildi: dosya satırı e-posta içinde id ile yeniden okunuyor
(cases: application_no, title, assigned_mediator_id, user_id) → takvimSahibi →
profiles.full_name; döngüden gelen nesneye güvenilmiyor. Künye de bu taze satırdan
alınıyor. Teşhis için koşum özetine imza_adi eklendi ve ad bulunamazsa hangi sorgunun boş
döndüğü (cases mi, profiles mı, yoksa iki kimlik alanı da boş mu) hata dizisine yazılıyor.
tsc temiz. REDEPLOY GEREKLİ: ajan-nobetci.

## Nerede kaldık — 13.08.2026 (45)
"Görüşme bağlantınız" e-postasının imzası randevu-teklif'teki davet yazısıyla aynı bloğa
çevrildi: "Saygılarımızla," + "Arb. <arabulucunun ad soyadı>" (ad zaten Arb. ile
başlıyorsa tekrarlanmıyor) ve altta küçük "Bu ileti MediPact AI aracılığıyla
gönderilmiştir." notu. Ad profiles'ta bulunamazsa yalnız "Saygılarımızla," yazılıyor —
"MediPact AI" imzası artık kullanılmıyor ve durum koşum özetindeki hata listesine
düşüyor. Diğer davranışlar değişmedi. tsc temiz. REDEPLOY GEREKLİ: ajan-nobetci.

## Nerede kaldık — 13.08.2026 (44)
ajan-nobetci teklif–oturum eşleştirmesi düzeltildi: cevaplanmış tekliflerin seçenekleri düz
listeye açılıp GÜN ve SAATİN İKİSİ BİRDEN tutan seçenek aranıyor (oturum saati TR'ye
çevrilerek). Tutan seçenek yoksa oturum ONLINE sayılıp bağlantı üretiliyor; yalnız gün+saat
tutan seçenekte oturum_tipi='yuz_yuze' ise atlanıyor ve atlama sebebine eşleşen teklif id'si
yazılıyor. Canlı veriyle (0f91208a 18.08 10:00 tipsiz · 43c3f252 19.08 10:00 yuz_yuze ·
8ccd2a8b 18.08 14:00 online) dört senaryo Node'da doğrulandı: 18.08 10:00 → ONLINE.
tsc temiz. REDEPLOY GEREKLİ: ajan-nobetci.

## Nerede kaldık — 13.08.2026 (43)
ajan-nobetci ReferenceError'ları giderildi: TZ değişkeni bu dosyada hiç tanımlı değildi —
yerine sabit TR_OFFSET_MS (3 saat) ve trGunSaat()/trTarihMetni() yardımcıları tanımlandı;
teklif–oturum saat karşılaştırması ve e-posta tarih metni bunları kullanıyor. Aynı hatta
takvimSahibi() de tanımsızdı (randevu-teklif'te kalmış), e-posta yolunda patlıyordu —
bu dosyaya da eklendi. Dosya tanımlayıcı taramasıyla başka çözülmemiş ad kalmadığı
doğrulandı. Diğer davranışlar değişmedi. tsc temiz.
REDEPLOY GEREKLİ: ajan-nobetci.

## Nerede kaldık — 13.08.2026 (42)
ajan-nobetci video hattı düzeltildi: teklif–oturum eşleştirmesi artık scheduled_at'i
Türkiye saatine çevirip karşılaştırıyor (2026-08-18T07:00Z → 18.08 10:00) ve karar tersine
çevrildi — yalnız eşleşen seçenekte oturum_tipi AÇIKÇA "yuz_yuze" ise atlanıyor; teklif
bulunamazsa, seçenekler boşsa veya işaret yoksa oturum online sayılıp bağlantı üretiliyor.
Yanıta teşhis alanları eklendi: incelenen_oturum, atlanan_yuz_yuze, atlama_sebepleri[];
create-video-room ve e-posta hataları artık sessiz geçmiyor, hata dizisine yazılıyor
(videoBaglantiEpostasi hata listesi döndürüyor). Diğer davranışlar değişmedi. tsc temiz.
REDEPLOY GEREKLİ: ajan-nobetci (ve daha önce deploy edilmediyse create-video-room).

## Nerede kaldık — 13.08.2026 (41)
Taraf sohbet asistanı kutusu eklendi (CaseRoom.tsx, DosyaAsistani): "Dosya Asistanım" kartı
taraf görünümünde sekmelerin altında; mesaj listesi, tek satır giriş, Gönder düğmesi ve
Enter ile gönderim, "yazıyor…" göstergesi, düğme pasifleşmesi, kırmızı tek satır hata
(yutma yok), altında gri not. Geçmiş yalnız bileşen state'inde, tablo eklenmedi.
Çağrı kullanıcının kendi JWT'siyle taraf-asistan'a gidiyor; gövdede case_id ile birlikte
hem soru hem mesaj hem son 10 mesajlık gecmis gönderiliyor (fonksiyon "mesaj" alanını
okuyor, "soru" uyum için duruyor). Arabulucu görünümünde kart yok, mevcut bölümler
yerinden oynamadı. tsc + build temiz.

## Nerede kaldık — 13.08.2026 (40)
Ajan tekliflerinde oturum tipi ve video bağlantısı zinciri kapandı:
1) ajan-nobetci randevu_teklifi görevinde önce "oner" (iç kapıdan) çağırıp saatleri alıyor,
   her seçeneğe oturum_tipi:"online" ekleyip "olustur"a gönderiyor. randevu-teklif'in
   "oner" eylemi de iç kapıyı (x-cron-secret) tanıyor.
2) Video hattındaki tespit netleştirildi: yalnız cevaplanmış tekliflerde AÇIKÇA "yuz_yuze"
   işaretli saate düşen oturumlar atlanıyor; işaret yoksa (eski kayıtlar dahil) oturum
   çevrim içi sayılıp bağlantı üretiliyor.
3) randevu-teklif "Uygun" cevabında oturum kaydı açılır açılmaz (seçim yüz yüze değilse)
   create-video-room iç kapıdan çağrılıyor, link video_link'e yazılıyor ve davet
   e-postası/PDF'inde "Görüşme bağlantısı: <link>" satırı olarak geçiyor; yüz yüzede link
   satırı hiç çıkmıyor, link üretilemezse eski "iletilecektir" metni kalıyor.
İmza ve PDF eki değişmedi. tsc temiz.
REDEPLOY GEREKLİ: randevu-teklif ve ajan-nobetci birlikte deploy edilmeli.

## Nerede kaldık — 13.08.2026 (39)
Taraf sohbet asistanının motoru yazıldı: supabase/functions/taraf-asistan (verify_jwt=true,
config.toml'a eklendi). JWT'deki kullanıcının o dosyada taraf olduğu case_parties.user_id
ile doğrulanıyor, değilse 403. Bağlama YALNIZ tarafın kendi verisi (beyanı, kendi
belgelerinin metni, kendine gönderilmiş keşif soruları) ve dosya künyesi (no, konu, aşama,
taraf adları+rolleri, planlı oturumlar) giriyor; party_analyses, common_ground_reports,
kök neden/tutarlılık/iletişim analizleri ve karşı tarafın içeriği hiç okunmuyor. Sistem
talimatı: hukuki tavsiye yok, karşı taraf hakkında yorum yok, teşhis/duygu değerlendirmesi
yok, bilmiyorsa "bu bilgi bende yok". Model kapısı case-qa ile aynı üç kademe
(OPENAI_API_KEY → gpt-4o-mini, GEMINI_API_KEY → gemini-2.5-flash, Lovable gateway yedeği);
sohbet olduğu için JSON zorlaması yok. Her çağrı agent_states (agent_type='taraf_asistan')
ve agent_worklog'a iz bırakıyor (içerik değil, koşum kaydı); iz yazımı sohbeti düşürmüyor.
Ekran parçası (parça 2) henüz yok. tsc temiz.
REDEPLOY GEREKLİ: taraf-asistan Lovable'dan deploy edilmeli.
NOT: Şemada tarafa özel ayrı "gizli kanal" tablosu yok; tarafın gizli içeriği kendi
belgeleri ve beyanı üzerinden geliyor — yeni tablo varsayılmadı.

## Nerede kaldık — 13.08.2026 (38)
Video bağlantısı artık ajanla üretiliyor (iki fonksiyon):
create-video-room'a randevu-teklif'teki iç kapı deseni eklendi (x-cron-secret = CRON_SECRET
ise kullanıcı JWT'si ve erişim kontrolü atlanır; gövde sözleşmesi sessionId aynı, normal
JWT yolu aynen).
ajan-nobetci her koşuda otomatik akış dosyalarında gelecekteki status='scheduled' ve
video_link'i boş oturumlar için create-video-room'u iç kapıdan çağırıyor, bağlantıyı
oturuma yazıyor ve oturumun tarafına tek bilgilendirme e-postası gönderiyor (künye +
gün-saat + "Görüşme bağlantınız:" + link, arabulucu imzasıyla; karşı taraf verisi yok).
Bağlantı dolduğu için ikinci koşuda oturum seçilmiyor → e-posta bir kez gidiyor. Cevaplanmış
tekliflerde yüz yüze işaretli saate düşen oturumlar atlanıyor; belirsizse çevrim içi kabul
ediliyor. Bir oturumdaki hata diğerlerini durdurmuyor, loga yazılıyor. Mevcut soru_gonder/
randevu_teklifi işleme, güvenlik ve agent_states düzeni değişmedi (last_output'a
bu_dosyada_hazirlanan_video eklendi). tsc temiz.
REDEPLOY GEREKLİ: create-video-room ve ajan-nobetci birlikte deploy edilmeli.

## Nerede kaldık — 13.08.2026 (37)
A) Aşama 5 "Planlanan Oturum" sayacı düzeltildi (MediationEngine.tsx): eskiden iptal
   olmayan TÜM oturumları (taslak ve geçmiş dahil) sayıyordu; artık yalnız gelecekteki
   status='scheduled' oturumları sayıyor. NOT: liste bileşen açılışında bir kez okunuyor;
   sayfa açıkken oluşan oturum, sayfa yenilenmeden sayaca yansımaz (mevcut davranış).
B) Davet e-postasına gerçek video bağlantısı YAPILMADI: bağlantı yalnız create-video-room
   ile üretiliyor ve o fonksiyon kullanıcı JWT'si istiyor (auth.getUser + dosya erişim
   kontrolü); randevu-teklif'in cevap/davet yolu girişsiz çalıştığı için JWT yok, yeni
   açılan oturumun video_link'i de boş. Uydurma link yazılmadı, "bağlantı görüşme öncesi
   iletilecektir" metni kaldı.
tsc + build temiz.

## Nerede kaldık — 13.08.2026 (36)
YZ Kullanım Beyanı kapısı eklendi (CaseRoom.tsx): taraf dosyaya girdiğinde
yz_beyan_onaylari'nda kendi party_id'siyle metin_surumu='v1' kaydı yoksa dosya içeriği
yerine tam genişlikte bilgilendirme kartı çıkıyor (metin ve sürüm tek sabitte:
YZ_BEYAN_METNI / YZ_BEYAN_SURUMU). "Okudum, bilgilendirildim" kayıt atıyor, kart kapanıyor
ve bir daha çıkmıyor; kayıt/okuma hatasında hata kartta görünüyor ve kart kapanmıyor.
Arabulucu/admin ekranlarında kart hiç çıkmıyor, mevcut hiçbir bölüm kaldırılmadı.
tsc + build temiz.

## Nerede kaldık — 13.08.2026 (35)
Üç iş tek commit (MediationEngine.tsx):
A) Kritik Faktörler mükerrer maddesi: factorSimilarity'ye normalize edilmiş tam eşitlik ve
   kapsama kuralı (kısa maddenin sözcüklerinin %80'i uzun maddede geçiyorsa aynı sayılır)
   eklendi; birleştirme kaynakları yine koruyor. Node'da örnekle doğrulandı.
B) Ödeme defteri Düzenle/Sil: KOD DEĞİŞMEDİ — zaten vardı (PaymentAccountingPanel'de
   canManagePayments ile gizlenen Düzenle/Sil düğmeleri, satır içi düzenleme formu,
   AAÜT taban guard'ı, ödenmiş kayıt için ek onay ve silme onay penceresi). Taraf
   ekranındaki "Ödeme Bilgim" görünümüne dokunulmadı.
C) Aşama 4 boş açılış: ana alandaki AnimatePresence'ten mode="wait" kaldırıldı — yeni
   aşama, eskisinin çıkış animasyonu tamamlanana kadar mount edilmiyordu; çıkış sinyali
   gelmediğinde ana alan boş kalıyordu (adres doğrudan yazıldığında çıkan çocuk olmadığı
   için sorun görünmüyordu). Aşama geçişi ad4f2bc'deki gotoPhase yolunda kaldı.
tsc + build temiz.

## Nerede kaldık — 13.08.2026 (34)
randevu-teklif "olustur": otomatik onay eşleştirmesi eklendi. Teklif yazıldıktan sonra
tarafın case_parties.otomatik_onay TRUE ise ve önerilen saatlerden biri taraf_musaitlik
aralığına düşüyorsa (gun eşit, saat >= baslangic ve < bitis) teklif anında uygun sayılıyor:
cevap yolu tek kod parçasına alındı (cevaplaIsle) — durum=cevaplandi, secilen=o saat,
oturum kaydı ve davet yazısı aynı yerden. Bu durumda tarafa teklif linki maili
gönderilmiyor; seçenek girdisine otomatik_onay: true işareti yazılıyor. Otomatik onay
kapalıysa veya saat uymuyorsa akış aynen (iç çağrıda link maili, ekranda link).
Okumalar service role ile; hata durumunda eşleşme yok sayılıp loga yazılıyor. tsc temiz.
REDEPLOY GEREKLİ: randevu-teklif Lovable'dan yeniden deploy edilmeli.

## Nerede kaldık — 13.08.2026 (33)
Taraf ekranına "Randevu Tercihlerim" sekmesi eklendi (CaseRoom.tsx, yalnız PartyView):
müsait saat aralığı ekle/listele/sil (taraf_musaitlik, party_id = tarafın kendi kaydı) ve
"otomatik onay" anahtarı (case_parties.otomatik_onay). Okuma/yazma hataları ekranda
gösteriliyor, yutulmuyor. Arabulucu ekranlarına ve karşı tarafa hiçbir şey eklenmedi.
tsc + build temiz.
DİKKAT (doğrulanamadı): taraf_musaitlik sütun adları anon rolün şemasında görünmüyor;
kardeş tablo mediator_availability'ye bakılarak gun/baslangic/bitis + party_id varsayıldı.
Canlı testte sütun adı tutmazsa hata ekranda görünecek — o zaman düzeltilecek.

## Nerede kaldık — 13.08.2026 (32)
randevu-teklif'ten giden her taraf e-postası (teklif maili + davet yazısı) ve davet
PDF'inin imza bölümü artık dosyanın arabulucusunun adıyla imzalanıyor: profiles.full_name,
"Arb." önekiyle (ad zaten Arb. ile başlıyorsa tekrarlanmıyor); altında küçük satır
"Bu ileti MediPact AI aracılığıyla gönderilmiştir." Ad profilde boşsa eski "MediPact AI"
imzası yedek kalıyor. Başka içerik/davranış değişmedi. tsc temiz.
REDEPLOY GEREKLİ: randevu-teklif Lovable'dan yeniden deploy edilmeli.

## Nerede kaldık — 13.08.2026 (31)
Nöbetçi artık randevu_teklifi görevini de işliyor: dosyada durum='beklemede' teklif varsa
görev 'atlandi'; yoksa başvuran taraf (case_parties.party_role='applicant') ile
randevu-teklif "olustur" iç çağrı kapısından (x-cron-secret) çağrılıyor. Başarıda
'yapildi' + "teklif oluşturuldu, link tarafa e-postayla gönderildi"; musaitlik_yok'ta
'atlandi'; HTTP/iç çağrı hatasında görev 'bekliyor' kalıyor ve neden sonuc alanına
yazılıyor (sonraki koşuda yeniden denenir). soru_gonder işleme, zaman kontrolü, güvenlik
ve agent_states kaydı değişmedi. tsc temiz.
REDEPLOY GEREKLİ: ajan-nobetci Lovable'dan yeniden deploy edilmeli (CRON_SECRET tanımlı
olmalı, yoksa iç çağrı yapılamıyor ve görev bekliyor kalıyor).

## Nerede kaldık — 13.08.2026 (30)
randevu-teklif: "olustur" artık iç çağrıyla da çalışıyor — x-cron-secret CRON_SECRET ile
eşleşirse JWT ve dosya erişim kontrolü atlanıyor (dosya/taraf tutarlılığı yine
doğrulanıyor); secret boş/yanlışsa mevcut JWT yolu aynen. Takvim sahibi mantığı değişmedi.
İç çağrıyla oluşturulan tekliflerde cevap linki tarafa e-postayla gidiyor (Resend, davet
üslubu: ad, dosya no + konu, önerilen saatler, "Uygunluğunuzu tek dokunuşla bildirin" +
link; karşı taraf verisi yok). Hata teklifi düşürmüyor, loga yazılıyor; yanıta yalnız iç
çağrıda eposta_gonderildi ekleniyor. Ekrandan oluşturmada e-posta yok. tsc temiz.
REDEPLOY GEREKLİ: randevu-teklif Lovable'dan yeniden deploy edilmeli.

## Nerede kaldık — 13.08.2026 (29)
Otomatik akış anahtarı: update zaten .eq("id", activeCase.id) ile tek dosyayı hedefliyordu;
kodda başka yazıcı yok (grep). Bu yüzden 3 dosyanın true olmasının sebebini koddan
DOĞRULAYAMADIM — bilmiyorum; veritabanı tarafında (tetikleyici/politika/sütun varsayılanı)
kontrol edilmeli. Yapılan: update artık .select() ile etkilenen satırları geri okuyor;
tek satır değilse veya id tutmuyorsa anahtar eski değerine dönüyor ve "beklenen tek dosya
yerine N kayıt etkilendi" hatası ekranda kalıyor. Okuma zaten yalnız aktif dosyanın
değerinden geliyor (yorumla sabitlendi). tsc + build temiz.

## Nerede kaldık — 13.08.2026 (28)
Nöbetçi yazıldı: supabase/functions/ajan-nobetci (verify_jwt=false, config.toml'a eklendi).
Her koşuda otomatik_akis=true dosyaları tarıyor; panodaki durum='bekliyor' soru_gonder
görevlerini kokpitteki [Soruyu gönder] ile AYNI yazımla yürütüyor (case_discovery_questions,
tarafın party_id'si) → yapildi/'soru tarafın kanalına yazıldı'; zaten gönderilmişse
atlandi. Tanımadığı görev tipine dokunmuyor. Zaman kontrolü: son tarihe ≤3 gün, gelecekte
scheduled oturum yok ve beklemede teklif yoksa panoya randevu_teklifi görevi bırakıyor
(mükerrer yazmıyor). Her dosya için agent_states'e agent_type='nobetci' satırı düşüyor;
bir dosyadaki hata diğerlerini durdurmuyor, sonuc alanına ve loga yazılıyor. Güvenlik
check-new-tariff deseni (x-cron-secret veya admin JWT, yoksa 401). tsc temiz.
REDEPLOY GEREKLİ: ajan-nobetci Lovable'dan deploy edilmeli; cron/tetikleme henüz yok.

## Nerede kaldık — 13.08.2026 (27)
party-confidential-analysis artık görev panosuna kayıt bırakıyor: koşumda keşif sorusu
üretildiyse ve cases.otomatik_akis TRUE ise ajan_gorevleri'ne o taraf için tek satır
(gorev_tipi='soru_gonder', durum='bekliyor', gerekce='Analiz yeni keşif soruları üretti');
aynı dosya+taraf için bekleyen görev varsa ikinci satır yazılmıyor. otomatik_akis kapalıysa
hiçbir şey yazılmıyor. Yazım service role ile ve best-effort — hata analizi düşürmüyor,
loga yazılıyor. Analizin kendisi, çıktısı ve şeması değişmedi. tsc temiz.
REDEPLOY GEREKLİ: party-confidential-analysis Lovable'dan yeniden deploy edilmeli.

## Nerede kaldık — 13.08.2026 (26)
Sol paneldeki dosya künyesine "Otomatik akış" anahtarı eklendi (MediationEngine.tsx):
cases.otomatik_akis okunuyor/yazılıyor, Açık/Kapalı durumu ve tek cümlelik açıklama
görünüyor, yalnız arabulucu/admin görüyor. Kayıt hatasında anahtar eski değerine dönüyor
ve hata satırı ekranda kalıyor. Anahtar şimdilik yalnız değeri saklıyor — nöbetçi
fonksiyon gelince işlevlenecek. Başka davranış değişmedi. tsc + build temiz.

## Nerede kaldık — 13.08.2026 (25)
"Şimdi ne yapmalısın" kartına keşif sorusu kolu eklendi (MediationEngine.tsx): ajanın
ürettiği sıradaki sorulardan (party_communication_analysis.discovery_questions) tarafa
HENÜZ iletilmemiş ilk soru madde olarak çıkıyor (taraf adı + kısa önizleme) ve
[Soruyu gönder] düğmesi soruyu case_discovery_questions'a o tarafın party_id'siyle
yazıyor — taraf CaseRoom > İhtiyaç Tespiti sekmesinde kendi sorularını zaten buradan
okuyor, yeni tablo/sütun ve e-posta yok. Gönderim sonrası liste yenileniyor, aynı soru
tekrar madde olmuyor ve kartta "✓ Gönderildi" satırı çıkıyor. Randevu düğmesi ve diğer
maddeler değişmedi. CaseRoom'a dokunulmadı. tsc + build temiz.

## Nerede kaldık — 13.08.2026 (24)
Kokpitteki "Randevu ayarla" düğmesi aşama geçişini artık sol menüyle TEK kopya üzerinden
yapıyor: menü satırının tıklama davranışı gotoPhase(id) fonksiyonuna alındı (kilit kontrolü
ve toast aynı), düğme de onu çağırıyor. Ayrıca randevu tetiği state yerine ref'e alındı —
geçişe ikinci bir state güncellemesi karışmıyor, tetik geçişin doğurduğu render'da
okunuyor. Menünün mekanizması değişmedi. tsc + build temiz.
NOT: Aşama 4'te takılı kalmanın kesin mekanizmasını canlıda doğrulayamadım; düzeltme,
geçişi menüyle birebir aynı tek işleme indirdi — canlıda tekrar denenmeli.

## Nerede kaldık — 13.08.2026 (23)
Kokpit "Şimdi ne yapmalısın" kartında oturum planlama maddesine (Süre X gün kaldı —
oturumu planla) "Randevu ayarla" düğmesi eklendi (MediationEngine.tsx). Düğme kök
state'teki randevuTetik'i kurup Aşama 5'e geçiriyor; orada mevcut RandevuTeklifKarti'na
kaydırılıyor, tek taraflı dosyada taraf otomatik seçilip mevcut saat önerisi akışı
başlıyor, çok taraflıda seçim kullanıcıda. Randevu akışının kopyası yazılmadı; diğer
maddeler ve Açıkla davranışı aynı. tsc + build temiz.

## Nerede kaldık — 13.08.2026 (22)
Davet e-postasına dosya künyesi (dosya no, uyuşmazlık konusu, başvuran + karşı taraf adları,
arabulucu adı — cases/case_parties/profiles) ve aynı içeriğin PDF eki eklendi
(jsPDF npm:jspdf@4.2.1 + uzaktan Roboto TTF, VFS'e gömülü; Resend base64 attachments).
Font indirilemez veya PDF üretilemezse EK KONULMAZ, e-posta künyeli metin hâliyle gider
(bozuk karakterli PDF yok). Künye dışında analiz/gizli kanal/tutar içeriği yazıya girmez.
Deno ortamında çalıştırılıp doğrulanamadı (yerelde deno yok); aynı kod yolu Node'da
denendi: font 200, 84KB PDF üretildi. tsc temiz.
REDEPLOY GEREKLİ: randevu-teklif Lovable'dan yeniden deploy edilmeli; ilk canlı denemede
ekin geldiği ve Türkçe karakterlerin doğru göründüğü kontrol edilmeli.

## Nerede kaldık — 13.08.2026 (21)
randevu-teklif "cevapla": Uygun cevabından sonra oturum kaydı açılıyor VE tarafa oturum
davet e-postası gidiyor — mevcut yol (Resend HTTP API + RESEND_API_KEY, gönderici
"MİLAT Arabuluculuk <info@milatmediation.com>"; send-party-invite / send-meeting-invite
ile aynı). Yazıda taraf adı, Ön Görüşme, gün-saat ve yüz yüzeyse adres var; online'da
"katılım bağlantısı görüşme öncesi iletilecektir" (video linki girişsiz akıştan
üretilemiyor — create-video-room kullanıcı JWT'si istiyor, uydurma link yazılmadı).
Arabulucuya yalnız başlık bildirimi düşüyor. Gönderim hatasında cevap ve oturum kaydı
duruyor, yanıt davet_gonderildi:false dönüyor. "Uymuyor"da gönderim yok. tsc temiz.
REDEPLOY GEREKLİ: randevu-teklif Lovable'dan yeniden deploy edilmeli.

## Nerede kaldık — 13.08.2026 (20)
randevu-teklif dolu saat dışlama düzeltildi: arabulucunun dosya kimlikleri önce cases'ten
alınıyor, sonra (a) o dosyalardaki durum='beklemede' tekliflerin seçenekleri ve
(b) status='scheduled' case_sessions saatleri (scheduled_at UTC → TR gün+saat) dışlanıyor;
karşılaştırma gun|HH:MM anahtarıyla normalize. Bekleyen dışlaması çalışmıyordu çünkü sorgu
gömülü cases:case_id ilişkisi üzerinden filtreliyordu ve o ilişki boş/hatalı dönünce
(hata da yutuluyordu) hiçbir saat dolu sayılmıyordu. Geçmiş saat kuralı, bireysel/kurumsal
kuralı, yanıt şeması ve secenekler alan koruması değişmedi. tsc temiz.
REDEPLOY GEREKLİ: randevu-teklif Lovable'dan yeniden deploy edilmeli.

## Nerede kaldık — 13.08.2026 (19)
randevu-teklif/normalizeSecenekler artık ek alanları düşürmüyor: girdi olduğu gibi taşınıyor,
yalnız gun/saat normalize ediliyor (gun/saat doğrulaması ve 1-3 sınırı aynı). Böylece
oturum_tipi ve adres secenekler jsonb'sine yazılıyor — (18)'deki kırıntı kapandı. tsc temiz.
REDEPLOY GEREKLİ: randevu-teklif Lovable'dan yeniden deploy edilmeli.

## Nerede kaldık — 13.08.2026 (18)
Randevu kartına oturum tipi eklendi (MediationEngine.tsx): "Online görüşme" (varsayılan) /
"Yüz yüze görüşme" + adres kutusu, adres boşsa "Adres girilmedi" uyarısı. Seçim, teklif
oluşturulurken secenekler jsonb girdilerinin içine yazılıyor (oturum_tipi/adres); durum
listesinde "Online" / "Yüz yüze — adres" satırı gösteriliyor. tsc + build temiz.
KIRINTI (kod değiştirilmedi, talimat gereği): randevu-teklif fonksiyonundaki
normalizeSecenekler her girdiyi {gun, saat} olarak yeniden kuruyor; oturum_tipi ve adres
şu hâliyle kaydedilmiyor. Fonksiyonda ekstra alanların korunması gerekiyor — kurucu kararı.

## Nerede kaldık — 13.08.2026 (17)
randevu-teklif iki değişiklik: (a) müsaitlik takviminin sahibi dosyanın arabulucusu
(cases.assigned_mediator_id, boşsa cases.user_id) — JWT yalnız kimlik/yetki için;
(b) "Uygun" (veya belirli saat) cevabında fonksiyon saati bağlıyor: case_sessions'a
session_type='preliminary', status='scheduled', scheduled_at=teklif saati (TR, UTC+3),
participants=[{party_id,user_id,role}] satırı yazılıyor. Oturum yazımı hata verirse cevap
yine kaydediliyor, hata console.error ile loga düşüyor. "Uymuyor"da oturum açılmıyor.
tsc temiz. REDEPLOY GEREKLİ: randevu-teklif Lovable'dan yeniden deploy edilmeli.

## Nerede kaldık — 13.08.2026 (16)
"Randevu ayarla" kartının altına dosyanın randevu teklifi listesi eklendi
(MediationEngine.tsx, RandevuTeklifKarti): taraf adı, teklif edilen gün-saatler, durum
(Bekliyor / Cevaplandı — Uygun · Uymuyor · seçilen saat), oluşturulma tarihi, girişsiz
cevap linki + Kopyala. Kayıt yoksa "Henüz randevu teklifi oluşturulmadı."; sorgu hata
verirse hata metni kartta görünüyor (yutulmuyor). Yalnız ekleme yapıldı. tsc + build temiz.
AÇIK UÇ: randevu_teklifleri'nde arabulucu için SELECT politikası yoksa liste boş/hatalı
görünür — politika kurucu tarafında.

## Nerede kaldık — 13.08.2026 (15)
randevu-teklif: müsaitlik takviminin sahibi artık isteği yapan kullanıcı (Authorization
JWT'sinden auth.getUser ile çözülen kimlik); cases.user_id / assigned_mediator_id bu amaçla
kullanılmıyor — dosya sahibi ile takvim sahibi farklı kullanıcılar çıkabiliyor. JWT
çözülemezse "oturum doğrulanamadı" (401). Saat seçme mantığı, bekleyen teklif dışlama,
yanıt şeması ve getir/cevapla değişmedi. tsc + build temiz.
REDEPLOY GEREKLİ: randevu-teklif Lovable'dan yeniden deploy edilmeli.

## Nerede kaldık — 13.08.2026 (14)
"Randevu ayarla" artık sessiz kalmıyor (MediationEngine.tsx, RandevuTeklifKarti): sonuç
yalnız toast'a bağlıydı — toast kaçınca ekranda hiçbir iz kalmıyordu. Karta kalıcı durum
satırı eklendi (öneri sayısı / "uygun boş saat yok" / hata metni); invoke hatasında yanıt
gövdesi okunup gerçek mesaj gösteriliyor, düğme istek sürerken "Hazırlanıyor…" ve çift
tıklama kapalı. Edge fonksiyon ve saat seçme mantığı değişmedi. tsc + build temiz.

## Nerede kaldık — 13.08.2026 (13)
randevu-teklif "musaitlik_yok" düzeltildi: takvim sahibi cases.user_id'den alınıyor
(önce assigned_mediator_id okunuyordu ve o başka bir kimliğe işaret ettiği için müsaitlik
satırları hiç dönmüyordu). Müsaitlik okuması zaten service role ile; tarih filtresi TR
saatiyle. musaitlik_yok yanıtına tanı alanı eklendi (mediator_id, bugun, satir, dolu).
REDEPLOY GEREKLİ: randevu-teklif fonksiyonu Lovable'dan yeniden deploy edilmeli.

## Nerede kaldık — 13.08.2026 (12)
Randevu teklifi canlı (kod tarafı): supabase/functions/randevu-teklif (oner · olustur · getir ·
cevapla; verify_jwt=false, config.toml'a eklendi), src/pages/RandevuCevap.tsx + App.tsx'te
/randevu/:token rotası (AppLayout dışında), MediationEngine.tsx'te RandevuTeklifKarti (Aşama 5).
Saatleri fonksiyon seçiyor (bireysel 1, kurumsal 3 farklı gün; bekleyen tekliflerdeki saatler
dışlanıyor, Türkiye saatiyle geçmiş saatler elenir). tsc + build temiz.
REDEPLOY GEREKLİ: supabase/functions altına yeni fonksiyon eklendi — Lovable'dan
randevu-teklif deploy edilmeden canlı test yapılamaz.
Sırada: redeploy + canlı test (teklif oluştur → linki telefonda aç → cevapla).

## Nerede kaldık — 13.08.2026 (11)
Müsaitlik takvimi canlı (src/pages/CalendarPage.tsx): "Ajanda" / "Müsaitlik" sekmeleri;
müsaitlikte ay ızgarası, ay okları, dolu günler yeşil, bugün belirgin; gün panelinde aralık
ekle/sil ve "sonraki N güne kopyala" (mükerrer yazmaz); geçmiş gün kapalı. Kayıt
mediator_availability(user_id, gun, baslangic, bitis). tsc + build temiz.
NOT: src/integrations/supabase/types.ts bu tabloyu ESKİ şemayla (mediator_id, day_of_week,
start_time…) taşıyor; sorgular bu yüzden `as any` ile yazıldı. Types dosyası Lovable'dan
yeniden üretilirse cast kaldırılabilir. Sırada: canlıda doğrulama.

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
