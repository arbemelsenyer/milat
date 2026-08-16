## Nerede kaldık — 16.08.2026 (62) · DÜZELTME: KART DÜĞMELERİ GÖRÜNMÜYORDU
SEBEP (bulundu): shadcn Button'un outline varyantı yalnız "border + bg-background" verir,
YAZI RENGİ TANIMLAMAZ (src/components/ui/button.tsx:14). Koyu zeminli kokpit kartında
(bg-sidebar text-sidebar-foreground) düğme, kartın açık renkli yazısını miras alıyordu:
açık zemin üstünde açık yazı = beyaz boş kutu. Hover'da bg-accent + hover:text-accent-
foreground devreye girdiği için yazı ancak o zaman beliriyordu. Kurucunun tarifi birebir bu.
- [x] İki ortak sabit: KART_DUGME (açık zeminli kartlar: h-8 · text-xs) ve KOKPIT_DUGME
      (koyu kokpit kartları: kenarlık + zemin + YAZI RENGİ açıkça verilir, hover'da yalnız
      vurgu değişir). Modül düzeyinde tek kopya.
- [x] Düzeltilenler (koyu zemin): Teklif değerlendirme "Yenile" · Tıkanma ve çıkış yolları
      "Yenile" · Koşullu aralık (braket) "Yenile" (bu sonuncusu ghost varyantındaydı;
      görünüyordu ama komşularından farklıydı, aynı görünüme getirildi).
- [x] Aynı görünüme getirilenler (açık zemin, işlev değişmedi): Olay Zaman Çizelgesi ·
      Güç Dengesi · Usule İlişkin Engeller · Uyuşmazlık Konusu (AI önerisi) · belge
      listesindeki "Özet çıkar / Özeti yenile" (ghost → outline).
- [x] Hepsi aynı bileşen (Button), aynı boyut (size="sm" + h-8 + text-xs) ve aynı ikon
      düzeni (h-4 w-4 mr-1).
- [x] DOKUNULMAYAN: hata ekranlarındaki "Tekrar Dene" düğmeleri (açık zeminli Card içinde,
      normal hâlde okunuyor) ve Aşama 2 üstündeki "Yenile" (default varyant). Kurucunun
      listesinde yoktu, görünürlük sorunu da yok.
tsc (tsconfig.app.json) temiz. CANLI TEST YOK (Publish sonrası bakılacak).
AÇIK UÇ: Aynı tuzak koyu zeminli YENİ kartlarda tekrar edebilir; kural lessons.md'ye
yazıldı — koyu zeminde düğme rengi açıkça verilecek, düğme NORMAL hâlde doğrulanacak.

## Nerede kaldık — 16.08.2026 (61) · TIKANMA ÇÖZÜCÜ (İBA 2.5 / B20)
KEŞİF: Tıkanma göstergesi için AYRI KAYIT YOK; işaretler mevcut tablolardan türetildi.
Bulunanlar: randevu_teklifleri (durum 'beklemede' → cevapsız teklif, created_at/cevap_zamani)
· case_party_invites (case_party_id · invite_status · accepted_at · created_at — davetin
GERÇEK gönderim zamanı burada; case_parties'te invite_sent_at YOK) + case_parties
(invite_status · katilim_durumu) · case_sessions (status 'cancelled' = iptal; geçmiş tarihli
'scheduled' = yapıldı işaretlenmemiş) · braket_bant_sorulari (durum 'ret'/'soruldu' + cevap_at)
· teklif_braketleri.kosul_durumu ('dustu') · cases.updated_at (durgunluk) ve
deadline_extended/deadline_total + extension_used (süre baskısı). KULLANILMAYANLAR:
reschedule_requests mediator_requests'e bağlı (pazaryeri akışı, dosya oturumuyla ilişkisiz);
negotiation_rounds boş; case_sessions'ta "erteleme" alanı yok, erteleme ancak iptal kaydından
sayılıyor.
- [x] Ekran: kokpit (Aşama 3) > RAPOR katmanı > "Tıkanma ve çıkış yolları", Teklif
      değerlendirme kartının hemen ardında. Sol menüde kendiliğinden görünür. "Yenile" var.
- [x] Yedi işaret, hepsi dayanaklı ve eşiği ekranda yazılı: cevapsız randevu teklifi
      (3 gün) · cevaplanmayan davet/katılım (5 gün) · iptal edilen oturum (kaç kez +
      tarihler) · tarihi geçtiği hâlde "planlandı" duran oturum · reddedilen bant sorusu
      (kaç kez) · cevapsız bant sorusu (3 gün) · düşen koşullu taahhüt · dosya kaydının
      güncellenmeme süresi (10 gün) · yasal süre bitimine kalan gün (15 gün).
- [x] Her işaretin altında açık yollar + gerekçe: konuyu bölmek · tek başlıkta anlaşıp
      gerisini ayırmak · sırayı değiştirmek · özel oturum · uzman görüşü · ek oturum ·
      süre uzatımı (yalnız extension_used=false ise).
- [x] DİL: "şu yol açık" kalıbı; karar/uygulama/tavsiye yok. Niyet okuma, suçlama, kişilik
      yorumu yok — yalnız kaç gün, kaç kez. İşaret yoksa "tıkanma işareti görünmüyor".
- [x] GİZLİLİK: yalnız kokpitte çizilir; taraf ekranına dokunulmadı.
- [x] YENİ TABLO / SÜTUN / EDGE FONKSİYON / AI ÇAĞRISI YOK → SQL GEREKMİYOR.
- [x] Ortak cases sorgusuna DOKUNULMADI: updated_at o sorguda seçilmediği için kart kendi
      küçük sorgusunu yapıyor (tek alan).
- [x] Bir kaynak okunamazsa kart komple düşmüyor: o başlıkta işaret üretilmiyor ve hangi
      kaynağın okunamadığı kırmızı satırda yazıyor.
tsc (tsconfig.app.json) temiz. CANLI TEST YOK.
AÇIK UÇ: Eşikler (3/5/3/10/15 gün) KOD İÇİNDE sabit ve ekranda yazılı; kurucu farklı gün
isterse tek satırda değişir, ayar ekranı yok.
AÇIK UÇ: "Ertelenen oturum" ayrı kayıt olmadığı için iptal kaydından sayılıyor; oturum
erteleme tutanağı (A12) yapılırsa işaret oradan beslenmeli.
AÇIK UÇ: Bant sorusu ve braket kayıtları RLS'te yalnız is_case_mediator ile açık; dosyanın
assigned_mediator_id'si boşsa bu iki başlıkta işaret hiç üretilmez (hata değil, boş döner).
AÇIK UÇ: Kart yalnız işaret sayıyor; seçilen çıkış yolunu uygulayan bir düğme YOK
(özel oturum ve ek oturum Ajan Paneli'nden elle açılıyor).

## Nerede kaldık — 16.08.2026 (60) · TEKLİF DEĞERLENDİRME (İBA 2.5 / B19)
KEŞİF: Bu iş için hazır YAPI VAR ama eksik. Kullanılabilir olanlar: teklif_braketleri
(taraf başına alt_sinir · ust_sinir · kosul_bant_alt/ust · kosullu_deger · kosul_durumu),
blind_bids (min_amount · max_amount · currency), braket_denetim_izi (append-only; her
braket değişikliğinde alt/üst/koşullu tutarı ve zamanı yazıyor — "önceki tekliflerle
karşılaştırma" bundan çıkıyor) ve arabulucu yüzeyindeki iki mevcut kart
(BlindBidMediatorPanel · BraketMediatorPanel, kokpitin RAPOR katmanında).
EKSİK OLAN: dosyada RAKAMLANDIRILMIŞ TALEP KAYDI YOK — ne talep kalemi tablosu var, ne
de taraf başına talep tutarı sütunu (aranan: talep/demand/claim; case_fees.dispute_value
ücret hesabı girdisi, taraf talebi değil). negotiation_rounds tablosu duruyor ama HİÇBİR
ekran ona yazmıyor (kodda tek geçtiği yer dosya silme listesi). Bu yüzden "kayıtlı talep"
tarafın KENDİ üst tutarından (braket üst sınırı → yoksa kör teklif üst tutarı) okundu ve
her satırda dayanağı yazıldı.
- [x] Ekran: kokpit (Aşama 3 — Arabulucu Paneli) > RAPOR katmanı > "Teklif değerlendirme"
      bölümü, Kör teklif ve Koşullu aralık kartlarının hemen ardında. Sol menüde de
      kendiliğinden görünür (sectionDefs listesinden türüyor).
      NOT: Kurucu "Aşama 4" dedi; teklif/braket kartları KOD İÇİNDE Phase4Summary'de ama
      EKRANDA Aşama 3'tür. "Mevcut teklif/braket kartlarının yanında" tarifine uyuldu.
- [x] Dört satır, her biri dayanaklı: (1) karşılama oranı — teklif / kayıtlı talep,
      rakam + yüzde · (2) kabul hâlinde alınan (teklif tutarı) ve bırakılan (talep − teklif),
      rakam + yüzde · (3) tarafın kendi alt/üst sınırıyla ilişki: bandın içinde / alt
      sınırın X altında / üst sınırın X üstünde · (4) önceki kayıtla karşılaştırma:
      izdeki son iki tutar ve talebe olan farkın ne kadar azaldığı (yaklaşma) veya arttığı.
- [x] Teklif kaynağı seçilebilir: karşı tarafın koşullu taahhüdü · kayıtlı üst tutarı ·
      kör teklif üst tutarı · "elle tutar gir". Elle girilen tutar HİÇBİR TABLOYA YAZILMAZ
      ve dayanağında "kayıtlı değildir" yazar; sayfa yenilenince kaybolur.
- [x] SINIR: kart tavsiye vermiyor — "kabul et/etme", rakam önerisi, mahkeme sonucu
      tahmini, kusur atfı ve hukuki niteleme yok. Yeni AI çağrısı YOK (hepsi kodda hesap).
- [x] GİZLİLİK: panel yalnız kokpitte çizilir; kullandığı üç tabloda da tarafa SELECT
      politikası yok, taraf ekranına (CaseRoom) dokunulmadı.
- [x] YENİ TABLO / SÜTUN / EDGE FONKSİYON YOK → SQL GEREKMİYOR.
- [x] CANLIDA DOĞRULANDI (16.08.2026).
      · Yeri: kokpit (Aşama 3), Kör Teklif ve braket kartlarının yanı. Yeni tablo,
        edge fonksiyon ve AI çağrısı gerekmedi.
      · Kira dosyasında test: elle girilen 150.000 için karşılama %75, alınan/bırakılan
        ayrımı, bandın içinde olduğu tespiti, her satırda dayanak — doğru hesapladı.
        Tavsiye/öneri dili yok.
      · Elle girilen tutar hiçbir tabloya yazılmıyor.
      · AÇIK KALAN: rakamlandırılmış talep kalemi olmadığı için hesap tarafın Kabul
        Aralığı üst sınırı üzerinden yapılıyor. Talep kalemleri rakamla kaydedilince
        hesap kalem kalem yapılacak.
tsc (tsconfig.app.json) temiz. CANLI TEST: 16.08'de yapıldı (yukarıdaki madde).
AÇIK UÇ (en önemlisi): "Neyi alıyor / neyi bırakıyor" KALEM KALEM değil, tek tutar
üzerinden hesaplanıyor — çünkü dosyada rakamlandırılmış talep kalemi kaydı yok. Kalem
ayrımı isteniyorsa taraf başına talep kalemi (başlık + tutar + dayanak) kaydı gerekir;
bu yeni tablo demektir, açılmadı.
AÇIK UÇ: "Talep" olarak tarafın kendi üst tutarı okunuyor. Taraf üst sınırını talebinden
düşük girdiyse karşılama oranı olduğundan yüksek çıkar; dayanak satırı hangi kayıttan
okunduğunu yazıyor ama bu ayrım kurucu kararı bekliyor.
AÇIK UÇ: Masada sözlü verilen teklif kayda geçmiyor (elle giriş kalıcı değil). Teklif
turlarının kaydı istenirse negotiation_rounds tablosu hazır duruyor ama hiçbir ekran
yazmıyor; ayrı iş.

## Nerede kaldık — 16.08.2026 (59) · OTURUM KAYIT PROTOKOLÜ (İBA 1.8 / B18)
KEŞİF: Kayıt onayı için kodda/mimaride hazır uygulama YOK ("kayit_onay · recording_consent
· oturum_kaydi" araması kodda boş döndü; yalnız yol-haritasi.md'de karar metni var).
Örnek alınan kalıp CANLI: CaseRoom.tsx'teki YZ Beyanı kartı (yz_beyan_onaylari tablosu,
metin_surumu + party_id ile tek satır onay, hata kartı kapatmıyor). Mimaride konu
§12.5.9'da (saklama-imha-rıza rejimi) tanımlı ama ORADAKİ SÜRELER FARKLI: ses için
"azami 7/30 gün", transkript için "5 yıl" yazıyor. 16.08 kurucu kararı bu iki satırı
daraltıyor (ses 24 saat, döküm süreç sonu) — mimari/12'ye ekleme olarak işlendi.
- [x] Taraf ekranı (CaseRoom): "Oturum Kaydı Onayı" kartı — YZ Beyanı kalıbı, sekmelerin
      üstünde. KAPI DEĞİL (rıza hizmetin şartı değildir, m.10). Onay/ret kaydı,
      "Kararımı değiştir" ile geri alma. Arabulucu onay formunu açmadıysa kart hiç çıkmaz.
      Karşı tarafın kararı bu ekranda hiçbir yerde görünmez.
- [x] Arabulucu ekranı (Aşama 4 — Oturumlar): "Kayıt protokolü" kartı — [Onay formunu aç
      ve süreyi başlat], form açılışı + kalan süre (dakikada bir tazelenir), katılımcı
      listesi (onay/ret/bekliyor), sayaç rozeti, "Kayıt açılabilir / açılamaz — sebep".
      Oybirliği: taraf + vekil (case_parties.vekil_ad_soyad) + varsa uzman
      (case_expert_assignments). Vekil/uzmanın girişi olmadığı için onaylarını arabulucu
      kaydeder; DAYANAK alanı zorunlu (kayıtsız onay yazılmaz).
- [x] Nöbetçi ajana silme kolu (kayitSilmeKollari): ses kaydı cases.closed_at + 24 saat
      sonra (storage'dan da), döküm süreç bitince silinir; silme satıra zaman + notla
      yazılır, sebepler "yapılmayanlar" listesine düşer. Dönüş özetine iki sayaç:
      ses_kaydi_silindi · dokum_silindi. closed_at boşsa TAHMİNİ bitiş üretilmez, sebep
      yazılır.
- [x] KAYIT ALMA / DÖKÜM YAPILMADI (kurucu kararı: bu tur yalnız izin + silme altyapısı).
- [x] İZİN KATMANI CANLIDA DOĞRULANDI (16.08.2026).
      · Göç 20260816120000_kayit_protokolu.sql çalıştırıldı (kayit_onay_talepleri ·
        kayit_onaylari · oturum_kayitlari); ajan-nobetci yeniden yayına alındı;
        Publish yapıldı.
      · Arabulucu kartı: "Onay formunu aç ve süreyi başlat", onay/ret/bekleyen sayacı,
        kalan 48 saat, tek kapı uyarısı — kira dosyasında doğrulandı.
      · Taraf kartı: onay metni, 48 saat bilgisi, "Kayda onay verdiniz" ve "Kararımı
        değiştir" (rıza geri alınabilir) — taraf hesabıyla doğrulandı.
      · AÇIK KALAN: silme kolu (ses 24 saat sonra, döküm süreç sonunda) gerçek kayıt
        olmadan test edilemedi; kayıt/döküm hattı yapılınca sınanacak.
- [x] m.11 SAPMASI (bilerek): Ekran uyarısında dış ürün adları (Otter/Fireflies/Zoom)
      YAZILMADI; yasak "dış kayıt veya döküm uygulamaları, görüntülü görüşme aracının
      kendi kayıt özelliği, telefonla ses alma" diye tarif edildi. Sebep: constitution
      m.11 ürün yüzeyinde dış marka adını yasaklıyor ve constitution komuttan üstün.
tsc (tsconfig.app.json) temiz; ajan-nobetci esbuild ile sözdizimi doğrulandı.
SQL: 20260816120000_kayit_protokolu.sql (3 tablo) — 16.08'de ÇALIŞTIRILDI.
REDEPLOY: ajan-nobetci — 16.08'de YAPILDI. Publish: 16.08'de YAPILDI (iki ekran).
SIRA ZORUNLU: önce SQL, sonra Publish/redeploy — tablolar yokken kartlar kırmızı hata
satırı gösterir (kart açılır ama okuma başarısız olur).
AÇIK UÇ: Onay formu açılınca taraflara E-POSTA GİTMİYOR; form yalnız taraf ekranında
belirir. "48 saat önce gönderilir" kuralının bildirim ayağı istenirse ayrı iş.
AÇIK UÇ: Onay değişikliğinin GEÇMİŞİ tutulmuyor — satır güncelleniyor, son karar ve
zamanı duruyor. Geri alma izi ayrı tablo isterse söylenecek.
AÇIK UÇ: Kayıt için ses kovası ('oturum-kayitlari') açılmadı; kayıt hattı kurulurken
açılacak. Silme kolu dosya yolu doluysa kovadan da siler.
AÇIK UÇ: Talep tek yönlü — formu iptal etme / süreyi yeniden başlatma düğmesi konmadı
(kapsam dışı tutuldu, istenirse eklenir).

## Nerede kaldık — 15.08.2026 (58) · USULE İLİŞKİN ENGELLER (İBA 2.4 / B17)
KEŞİF: Bu iş için mimaride ayrı başlık YOK, kodda yarım kalmış uygulama YOK
("vekaletname / usule ilişkin / tebligat / usul_engel" araması mimari ve kodda boş
döndü; yalnız pdfTemplates.ts'te vekaletname ŞABLONU var, denetim değil). ÇAKIŞMA
RİSKİ olan tek yer süre takibi: cases.deadline_total / deadline_extended /
extension_used + DeadlineCard zaten canlı — bu yüzden süre satırı o kayıttan yalnız
OKUNUYOR, yeniden hesaplanmıyor. Kontrol için gereken alanların hepsi case_parties'te
(vekil_ad_soyad · authorized_person · email · address · katilim_durumu · tc_kimlik ·
tax_number · trade_registry_no) ve case_documents.file_name'de zaten vardı.
- [x] Ekran: Aşama 2 > "USULE İLİŞKİN ENGELLER" katmanı (GÜÇ DENGESİ'nin altında,
      TARAFLAR'ın üstünde) + sol menü satırı + "N eksik" / "eksik yok" sayacı.
- [x] Altı kontrol: vekaletname yok · temsil/imza yetkilisi boş · tebligat adresi ya da
      e-posta eksik/biçimsiz · katılım durumu belirsiz · yasal süre dolmuş veya dolmak
      üzere (≤7 gün) · kimliği/sıfatını gösteren temel belge yok.
- [x] Her satırda "Dayanak: …". Kanun yorumu YOK; "Mevzuat referansı" satırı yalnız
      dosyada KAYITLI legal_basis varsa ve yorumsuz yazılıyor — madde numarası
      uydurulmuyor (constitution m.2).
- [x] Eksik yoksa "Usule ilişkin engel görünmüyor." Zorlama üretim yok.
- [x] YENİ TABLO / EDGE FONKSİYON / AI ÇAĞRISI YOK: hesap ekranda zaten yüklü veriden
      deterministik türetiliyor (parties + docs + caseRow). "Yenile" mevcut loadAll'ı
      çağırıyor. Bu yüzden SQL ve redeploy gerekmiyor.
tsc (tsconfig.app.json) temiz.
- [x] CANLIDA DOĞRULANDI (15.08.2026).
      · Aşama 2'de ayrı katman; altı deterministik kontrol; yeni tablo/edge fonksiyon
        gerekmedi.
      · Sağlık dosyasında 6 eksik saydı (tebligat x2, kimlik/sıfat x2, temsil yetkisi,
        katılım durumu), hepsi dayanaklı, kanun yorumu yok.
      · Publish e8efe98 ile yapıldı.
AÇIK UÇ: Kontroller belge ADI eşleşmesine dayanıyor (vekaletname · kimlik · sicil).
Belge adı farklı yazılmışsa eksik görünebilir — belge türü etiketi eklenirse kesinleşir.
AÇIK UÇ: Vekaletname dışındaki satırlarda mevzuat referansı boş kalıyor; doğrulanmış
madde künyesi kaynağı (hukuk kural katmanı) bağlanana kadar uydurma yapılmayacak.

## Nerede kaldık — 15.08.2026 (57) · LOVABLE GÜVENLİK BULGULARI (Publish blokeri)
İNCELEME SONUCU: İki fonksiyonda da istenen kapı kalıbı ZATEN vardı; kodda kapatılacak
açık bulunamadı.
- analyze-meeting-notes: Authorization yoksa 401 → getUser() geçersizse 401 → cases
  satırından dosya kapsamlı yetki (assigned_mediator_id / user_id / admin) yoksa 403.
  Hepsi AI çağrısından ÖNCE. config.toml'da verify_jwt zaten true. DEĞİŞİKLİK YAPILMADI;
  bulgu büyük ihtimalle canlıdaki eski sürümden geliyor — redeploy gerekiyor.
- check-new-tariff: x-cron-secret VEYA admin JWT (has_role) → 401/403. ajan-nobetci'nin
  kopyaladığı kalıbın kaynağı bu fonksiyon. Kod değişmedi.
- [x] config.toml: check-new-tariff verify_jwt false → TRUE (kurucu kararı).
- [x] SQL yazıldı: 20260815220000_cron_authorization_basligi.sql — jobid 5 ve 6 cron
      işlerini Authorization: Bearer <service_key> başlığıyla yeniden kurar.
      SIRA ZORUNLU: önce bu SQL, sonra deploy. Aksi hâlde Aralık/Ocak koşumu 401 alır.
- [x] tasks/kurulu-envanter.md'ye "GÜVENLİK AYARLARI" bölümü eklendi.
ÇAĞIRANLAR (doğrulandı): analyze-meeting-notes ← MeetingNotesPanel.tsx:82 (kullanıcı
JWT'si) · başka çağıran yok. check-new-tariff ← MevzuatAdmin.tsx:73 (admin JWT) +
canlıdaki iki pg_cron işi (x-cron-secret).
AÇIK UÇ: İki cron işinin canlıdaki mevcut command metnini göremedim (elle kurulmuşlar,
depoda yok). SQL onları koşulsuz yeniden kuruyor; eski metin kaybolmasın diye SQL'in
başında kayıt için SELECT var.

## Nerede kaldık — 15.08.2026 (56) · GÜÇ DENGESİ İŞARETİ (İBA 2.4 / B16)
KEŞİF: Bu iş için mimaride ayrı bir başlık YOK ve kodda yarım kalmış uygulama YOK
("güç dengesi/dengesizlik/asimetri" araması mimari, komut, constitution ve kodda boş
döndü). Üstüne inşa edilecek taban veri modelinde hazırdı: case_parties'te
vekil_ad_soyad · vekil_baro · vekil_sicil_no · party_type · katilim_durumu · statement,
case_documents.party_id (taraf başına belge) ve randevu_teklifleri cevap kayıtları.
Sınır kuralı da hazırdı: mimari/11 teşhis dili denetimi + constitution m.2. İş bu
alanların üstüne kuruldu; yeni veri kaynağı eklenmedi.
- [x] Yeni edge fonksiyon: supabase/functions/guc-dengesi.
      · Yapısal göstergeler KODDA deterministik: vekil durumu · taraf niteliği ·
        belge sayısı farkı (eşik: fark ≥ 3 ya da bir tarafta hiç belge yok) · katılım.
      · Yalnız "anlatım farkı" tek model çağrısı — SÜREÇ BİLGİSİ düzeyiyle sınırlı.
      · Her göstergede dayanak ZORUNLU; dayanaksız gösterge yazılmıyor.
      · Yasak etiket süzgeci (zekâ · eğitim · psikoloji · karakter · kişilik ·
        güçlü/zayıf taraf · mağdur · haklı) — geçerse gösterge sunucuda eleniyor.
      · Dengesizlik yoksa tek satır: "Belirgin bir dengesizlik göstergesi bulunmadı".
      · Ajan çözüm önermiyor; tekrar üretim yok, yenile:true ile yeniden yazılıyor.
- [x] Ekran: Aşama 2 > "GÜÇ DENGESİ" katmanı (OLAY ZAMAN ÇİZELGESİ'nin altında,
      TARAFLAR'ın üstünde) + sol menü satırı + "N gösterge" sayacı. Satırda tip rozeti,
      başlık, nötr cümle ve "Dayanak: …". [Göstergeleri çıkar] / [Yenile], hata kırmızı.
- [x] GİZLİLİK: guc_dengesi'nde tarafa SELECT politikası YOK; CaseRoom'a dokunulmadı.
tsc (tsconfig.app.json) temiz; edge fonksiyon sözdizimi esbuild ile doğrulandı.
- [x] CANLIDA DOĞRULANDI (15.08.2026).
      · Aşama 2'de ayrı katman; göç 20260815200000_guc_dengesi.sql çalıştırıldı;
        guc-dengesi fonksiyonu yayına alındı; Publish yapıldı.
      · Sağlık dosyasında 3 gösterge üretti (taraf niteliği · belge sayısı farkı ·
        katılım düzeyi farkı), üçü de dayanaklı; etiket/psikoloji dili yok.
      · GÜVENLİK ARA İŞİ: Lovable Publish'i iki critical bulgu yüzünden engelledi
        (analyze-meeting-notes ve check-new-tariff kimlik doğrulamasız çağrılabiliyordu).
        check-new-tariff verify_jwt=true yapıldı; Aralık/Ocak cron'ları Authorization +
        apikey + x-cron-secret başlıklarıyla yeniden kuruldu (commit 97d24fe). Tarama
        yeniden çalıştırılınca critical bulgu kalmadı.
      · AÇIK KALAN: 3 warn bulgu duruyor; biri "arabulucular admin/ klasöründeki tüm
        dosyaları okuyabiliyor" — kasıtlı mı, incelenecek.
AÇIK UÇ: Oturuma fiilî katılım verisi yok — case_sessions.participants alanı güvenilir
doldurulmuyor; katılım göstergesi şimdilik katılım durumu, beyan ve randevu cevabından
hesaplanıyor. Oturum yoklaması eklenirse gösterge güçlenir.

## Nerede kaldık — 15.08.2026 (55) · OLAY ZAMAN ÇİZELGESİ (İBA 2.3 / B15 · mimari §5.2g)
KEŞİF: mimari/05 §5.2g bu işi "hafif kademe" olarak zaten tanımlamış (Olay Haritası'nın
öncüsü, mevcut çıkarma hattını kullanır, dayanaksız tarih giremez). mimari/09'daki tam
şema (case_facts + case_fact_links) KODDA YOK. Kodda hazır tek parça
src/components/CaseTimeline.tsx ve CaseDetail.tsx:158 — ama oradaki olaylar yalnız
başvuru/atama/seans kayıtlarından geliyor, belge içeriğinden tarih yok, kaynak alanı yok.
Bu iş o tabanın üstüne, §5.2g'nin hafif kademesi olarak kuruldu.
- [x] Yeni edge fonksiyon: supabase/functions/olay-cizelgesi.
      · Girdi: case_documents.extracted_text (mevcut hat) + case_parties.statement +
        cases.application_date. Yeni bağımsız zincir kurulmadı.
      · Kaynağı çözülemeyen satır SUNUCUDA ELENİR; tahmini tarih üretilmez;
        "yaklaşık/civarında" aynen aktarılır (kesin güne çevrilmez).
      · Aynı olay iki kaynakta farklı tarihteyse TEK satır + celiski_notu.
      · Ajanın kendi hüküm cümlesi taşıyan satır elenir; aktarım kalıbı serbest.
      · Tekrar üretim yok; yenile:true ile eski satırlar silinip yeniden yazılır.
- [x] Ekran: Aşama 2 (Taraf Analizi) > "OLAY ZAMAN ÇİZELGESİ" katmanı — DOSYA ÖZETİ'nin
      altında, TARAFLAR'ın üstünde. Dikey şerit; her satırda tarih · olay · "Kaynak: …",
      çelişki varsa amber not. [Çizelgeyi çıkar] / [Çizelgeyi yenile], hata kırmızı.
      YERLEŞİM KURUCU ONAYIYLA seçildi (Aşama 1 / Aşama 3 seçenekleri sunuldu).
- [x] GİZLİLİK: olay_cizelgesi'nde tarafa SELECT politikası YOK; CaseRoom'a dokunulmadı.
tsc (tsconfig.app.json) temiz; edge fonksiyon sözdizimi esbuild ile doğrulandı.
- [x] CANLIDA DOĞRULANDI (15.08.2026).
      · Yeri: Aşama 2 — Taraf Analizi (kurucu kararı). Mimari §5.2g güncellendi;
        kokpite ileride yalnız kısa şerit eklenecek (AÇIK MADDE).
      · Göç 20260815180000_olay_cizelgesi.sql çalıştırıldı; olay-cizelgesi fonksiyonu
        yayına alındı; Publish yapıldı.
      · Sağlık dosyasında 15 satır üretti, her satır kaynaklı (belge adı + bölüm).
      · Düzeltmeler: künye/matbu tarihler (doğum tarihi gibi) çizelgeye girmiyor;
        tarih biçimi tek tip GG.AA.YYYY; "Çizelgeyi yenile" eski satırları silip
        yeniden üretiyor.
      · Arabuluculuk başvuru tarihi çizelgede kalıyor (yasal süreyi başlatan olay).
AÇIK UÇ: Çizelge kendiliğinden üretilmiyor — arabulucu düğmeye basar. Belge yüklenince
otomatik tetikleme istenmedi; istenirse extract-document-text kolu eklenebilir.
AÇIK UÇ: Kokpite (Aşama 3) kısa kronoloji şeridi eklenmesi — §5.2g'nin "kokpite sunulur"
cümlesinin karşılığı; henüz yapılmadı.
- [x] DÜZELTME 15.08 (canlı bulgu): (a) İlgisiz tarihler çizelgeye girmiyor — "04.06.1978
      hasta doğum tarihi" gibi künye/matbu tarihleri hem istemde yasaklandı hem sunucuda
      kalıp taramasıyla eleniyor ("olay zinciriyle ilgisiz" sebebiyle). Çizelge yalnız
      olay zinciri tarihlerini alıyor. (b) Tarih biçimi tek: tarih_metni GG.AA.YYYY'ye
      normalize ediliyor (2026-08-13 → 13.08.2026), aralık "GG.AA.YYYY – GG.AA.YYYY",
      belirsiz ifade ("yaklaşık Mart 2026") aynen korunuyor.
      NOT: Üretilmiş çizelge kendiliğinden düzelmez — "Çizelgeyi yenile" basılınca eski
      satırlar siliniyor ve yeniden üretiliyor (mükerrer satır kalmıyor).

## Nerede kaldık — 15.08.2026 (54) · BELGE ÖZETİ (İBA 1.2 / A1)
- [x] Yeni edge fonksiyon: supabase/functions/belge-ozeti.
      · Girdi sınırı: YALNIZ o belgenin kendi metni (case_documents.extracted_text) +
        dosya adı. Başka belge, taraf analizi, ortak zemin raporu girdiye girmez.
      · Çıktı: {ozet (en çok 3 cümle), kaniti (tek cümle)} → belge_ozetleri.
      · Metin yoksa özet UYDURULMAZ: durum='metin_yok' ("belge metni okunamadı").
      · Sunucu tarafı eleme: özet 40 karakterden kısaysa · kaniti boşsa · yasaklı ifade
        varsa durum='elendi' + sebep. Dil tarafsız ("belgede ... belirtiliyor").
      · document_id UNIQUE — özeti olan belge için tekrar üretilmez ("atlandi").
      · Yetki: arabulucu / dosya sahibi / yönetici ya da iç çağrı (x-cron-secret).
- [x] Tetikleme: extract-document-text metni yazdıktan sonra iç kapıdan BEKLEMESİZ
      çağırıyor; bu çağrının hatası çıkarma hattını etkilemiyor (try/catch + fire&forget).
- [x] Ekran (MediationEngine, Aşama 1 > Dosyadaki belgeler): her satırın altında özet +
      "Neyi kanıtlıyor:" satırı; özeti olmayan belgede "Özet çıkar" düğmesi
      ("Çıkarılıyor…"); hata kırmızı ve gerçek mesajla. Yükleme/listeleme/silme akışları
      ve satır düzeni değişmedi.
- [x] GİZLİLİK: belge_ozetleri'nde tarafa SELECT politikası YOK — özet taraf ekranına
      (CaseRoom) hiçbir yoldan çıkmaz. CaseRoom'a dokunulmadı.
tsc (tsconfig.app.json) temiz; iki edge fonksiyonun sözdizimi esbuild ile doğrulandı.
- [x] CANLIDA DOĞRULANDI (15.08.2026).
      · Göç 20260815160000_belge_ozetleri.sql çalıştırıldı; belge-ozeti ve
        extract-document-text yayına alındı, Publish yapıldı.
      · 7 belgede test edildi: her belgenin altında özet + "Neyi kanıtlıyor" satırı
        görünüyor, düğme "Özeti yenile".
      · Eleme mantığı iki kez düzeltildi: (a) yasak ifade kuralı cümle bağlamına
        çevrildi — aktarım kalıbı varsa iddia aktarılabilir, ajanın kendi hükmü elenir;
        (b) kanıt satırındaki içi boş kalıp artık özeti silmiyor, ikinci çağrı yapılıyor,
        o da zayıfsa özet korunup "çekişmeli nokta çıkarılamadı" yazılıyor.
      · Kaynak sınırı: yalnız belgenin kendi metni. Gizlilik: belge_ozetleri'nde tarafa
        SELECT politikası yok.
AÇIK UÇ: Yalnız yeni yüklenen belgeler kendiliğinden özetlenir; eski belgelerde listedeki
"Özet çıkar" düğmesi tek tek kullanılır (toplu üretim düğmesi yok).
- [x] DÜZELTME 15.08 (canlı bulgudan): yasaklı ifade elemesi cümle bağlamına bakıyor.
      İhtarname özeti "kusur" kelimesi yüzünden elenmişti; oysa kusuru ileri süren
      TARAFTI. Artık hüküm kelimesi taşıyan cümle, aktarım kalıbı (ileri sürülmektedir ·
      iddia edilmektedir · belirtilmektedir · talep edilmektedir · denilmektedir)
      içeriyorsa serbest; içermiyorsa elenir ve sebepte ELENEN CÜMLE yazılır.
- [x] DÜZELTME 15.08: "Neyi kanıtlıyor" satırı artık belgenin hangi ÇEKİŞMELİ NOKTAYA
      dayanak olduğunu söylüyor (olgu · tarih · tutar · eksiklik); "bilgi yer almaktadır",
      "bilgileri içermektedir" gibi içi boş kalıplar sunucuda eleniyor.
- [x] Listedeki düğme: özeti olan belgede "Özeti yenile" (yenile:true → aynı kayıt
      güncellenir), olmayanda "Özet çıkar".
- [x] DÜZELTME 15.08 (canlı bulgu — 5 no'lu iş göremezlik raporu): eleme iki sınıfa
      ayrıldı. SERT ELEME yalnız (a) özet 40 karakterden kısaysa, (b) ajanın kendi hükmü
      varsa uygulanır. Kanıt satırı zayıfsa artık ELEME YOK: model bir kez daha çağrılıp
      yalnız o satırı yeniden yazması isteniyor; ikinci deneme de tutmazsa özet KORUNUYOR
      ve satıra "Bu belgenin hangi çekişmeli noktaya dayanak olduğu çıkarılamadı" yazılıyor.
      Ekranda sebep metni hangi kuralın çalıştığını ayırt ediyor ("ajanın kendi hükmü" ·
      "Kanıt satırı çıkarılamadı … — özet korundu").

## Nerede kaldık — 15.08.2026 (53) · UYUŞMAZLIK KONUSU "Girilmemiş." SORUNU
TEŞHİS: Ekran `cases.issue_description`'dan okuyor (MediationEngine.tsx:1983 ·
CaseRoom.tsx:453). Bu sütunu HİÇBİR edge fonksiyonu yazmıyordu — sekiz fonksiyon yalnız
okuyor. Dahası orchestrator-run:226-229 boşsa classify adımını atlıyor; yani zincir bu
alana bağımlı, onu üretmiyor.
- [x] Yeni edge fonksiyon: supabase/functions/dosya-ozeti-oner.
      · Kaynak sınırı: cases.title · category · dispute_type_other · your_role ·
        other_party_role · relationship · desired_outcome · attempted_resolution ·
        timeline · additional_notes + case_documents'ın ADI ve TÜRÜ.
      · OKUNMAYAN: party_analyses · common_ground_reports · analysis_result ·
        extracted_text · taraf beyanları (issue_description taraf ekranında görünüyor).
      · Hiçbir tabloya YAZMAZ; çıktı {ozet, dayanak[]}.
      · Sunucu tarafı eleme: dayanak boşsa · metin 40 karakterden kısaysa · metinde
        RAKAM varsa · yasaklı ifade geçiyorsa öneri elenir, gerekçe ekrana yazılır.
      · Yetki: arabulucu / dosya sahibi / yönetici. Taraf çağıramaz.
- [x] Ekran (MediationEngine, Aşama 1 > Dosya Özeti): alan BOŞ + yetki varsa "AI önerisi"
      kutusu — [Öneri getir] → metin + dayanak → [Onayla ve kaydet] ·
      [Düzenleyerek kaydet] · [Vazgeç]. Alan doluysa kutu hiç çıkmaz.
- [x] saveIssueDescription(metin?) imzası genişletildi; mevcut Düzenle penceresi
      davranışı aynen korundu.
tsc (tsconfig.app.json) temiz; edge fonksiyon sözdizimi esbuild ile doğrulandı.
CANLI TEST YOK. SQL GEREKMEDİ (yeni tablo/sütun açılmadı).
REDEPLOY GEREKLİ: dosya-ozeti-oner (YENİ — Lovable'dan deploy edilmeden çalışmaz).
AÇIK UÇ: Öneri kalıcı değil — sayfa yenilenince kaybolur, tekrar "Öneri getir" gerekir.
Kalıcı olması için cases'e yeni sütun gerekirdi; taraf da cases satırını okuduğu için
onaysız metnin sızmaması adına bilinçli olarak sütun AÇILMADI.
Sırada: dosya-ozeti-oner redeploy + 7 belgeli dosyada canlı deneme.

## İBA REHBERİ TARAMASI — KARARLAR (15.08.2026) · SALT EKLEME
Kaynak: İBA arabuluculuk rehberi taraması. Aşağıdakiler KARAR'dır; hiçbiri henüz
kodlanmadı. Numaralar rehber taramasının kendi numaralarıdır, değiştirilmez.
Kod yazılmadan önce her madde constitution m.1 (kör veri) ve m.2 (halüsinasyon yasağı)
kontrol listesinden geçirilir; ajan içeren maddelerde mimari/06 ajan sözleşmesi
DOLDURULMADAN kod yazılmaz.

### A) GENEL
- [ ] A1 · BELGE ÖZETİ — her belgeye tek paragraf özet + "neyi kanıtlıyor" satırı.
      Yalnız arabulucu ekranında; tarafa gitmez.
- [ ] A2 · KAYNAK KÜNYESİ KURALI (BAĞLAYICI) — her bulgunun yanında dayanağı yazar
      (belge + bölüm/sayfa ya da tarihli beyan). Dayanaksız bulgu GÖSTERİLMEZ; kaynağı
      olmayan değerlendirme "doğrulanmamış" etiketiyle ayrı durur.
      İDDİA-TESPİT AYRIMI buna dahildir: her cümle kimin söylediğiyle başlar
      ("hasta beyan ediyor…", "belgede yazıyor…", "iki taraf da kabul ediyor…").
      Tek taraflı anlatı tespit gibi yazılamaz.
- [ ] A3 · İÇTİHAT/MEVZUAT KAYNAĞI — serbest internet gezinme YOK. İki kaynak:
      (a) yüklenen anonim içtihat özetleri, (b) resmî arşive anlık bağlanan ücretsiz
      açık kaynak servisler (Yargıtay, Danıştay, AYM, Emsal, mevzuat). Alıntı
      daire/esas/karar no + tarihle künyelenir; ulaşılamazsa "ulaşılamadı" denir,
      UYDURULMAZ. Tarafa "emsal" değil "örnek karar" dili. Ücretli abonelik alınmayacak.
- [ ] A4 · İLETİŞİMDEKİ DEĞİŞİM İŞARETİ — ton değişimi arabulucuya işaret edilir;
      kişilik/psikoloji etiketi ve teşhis YASAK (constitution m.2).
- [ ] A5 · İLETİŞİM TERCİHİ KATMANI — kanal (e-posta · uygulama içi · WhatsApp) +
      sıklık (her adım · önemli adımlar · haftalık özet) + sessiz saatler.
      Taraf ekranına uygulama içi bildirim eklenecek.
- [ ] A6 · PWA + TELEFONLA GİRİŞ (SMS kodu; e-posta/şifre yok) — pilot için.
      Mağaza uygulaması sonraya.
- [ ] A7 · WHATSAPP İŞLETME HATTI (SONRAYA) — Meta Cloud API; ~0,0009 USD/bildirim,
      aylık ücret yok; ayrı numara + işletme doğrulaması + onaylı şablon gerekir.
      O zamana kadar "WhatsApp'ta aç" tek tık düğmesi.
- [ ] A8 · OTURUM DÖKÜMÜ ANALİZİ — döküm ajan tarafından analiz edilir (tıkanma noktası,
      rakamlanmamış talep, sonraki oturum soruları). AYNI ANALİZ Görüşme Notları
      aşamasında da çalışır. Canlı dinleme ERTELENDİ.
- [ ] A9 · SESSİZ CANLI KOKPİT — föy, kritik faktörler, hazır sorular, kalan süre,
      tek tıkla not. Ajan dinlemez; ekran yalnız arabulucuya.
- [ ] A10 · SEÇENEK SEPETİ — dosya türü ve asıl ihtiyaca göre çözüm seçenekleri, para
      dışı olanlar dahil (taksit, hizmet karşılığı, özür, referans mektubu, gelecekteki
      iş ilişkisi, gizlilik taahhüdü); her seçeneğin yanında hangi ihtiyacı karşıladığı
      yazar. Yalnız arabulucuya.
- [ ] A11 · KİŞİSİZ İSTATİSTİKTEN ÖĞRENME — dosya sayısı, tür, ortalama oturum, anlaşma
      oranı, tıkanma aşaması → dönem sonu geri bildirimi.
      DEĞİŞMEZ: dosya metni, taraf beyanı ve belge içeriği hiçbir havuza/eğitime ÇIKMAZ.
- [ ] A12 · OTURUM ERTELEME TUTANAĞI şablonu + erteleme bildiriminin ajan tarafından
      gönderilmesi.

### B) ARABULUCU
- [ ] B13 · ELVERİŞLİLİK KONTROLÜ — dosya açılışında arabuluculuğa elverişlilik taraması;
      şüphede gerekçe + mevzuat maddesiyle uyarı verilir, YORUM YAPILMAZ.
- [ ] B14 · USUL ÖNERİSİ — dosyanın koşullarına göre gerekçeli süreç önerisi (vekilsiz
      tarafta uzun ilk oturum, akşam oturumu, önce özel oturum, uzman görüşü, yüz yüze,
      tıkanmada düzen değişikliği). Karar arabulucuda (constitution m.3).
- [ ] B15 · OLAY ZAMAN ÇİZELGESİ — tüm tarihler tek çizelgede; her satırın kaynağı yazılı.
- [ ] B16 · GÜÇ DENGESİZLİĞİ İŞARETİ — vekilli/vekilsiz, kurumsal/birey, hukuk bilgisi
      farkı. Etiketleme değil, durum tespiti.
- [ ] B17 · USULE İLİŞKİN ENGEL LİSTESİ — vekaletname, imza yetkilisi, tebligat adresi,
      süre. Kanun yorumu yok; eksik sayımı + madde referansı.
- [ ] B18 · KAYIT PROTOKOLÜ (Resolution Institute uyarlaması) —
      · Kayıtlı oturum daveti onay formuyla EN AZ 48 SAAT önce gider; süre dolmadan
        kayıt açılmaz.
      · TÜM katılımcılardan (vekil ve uzman dahil) yazılı onay; TEK İTİRAZ kaydı kapatır;
        onaylar tutanağa işlenir.
      · Kayıt YALNIZ MediPact oturum ekranından alınır; harici araç (Otter, Fireflies,
        Zoom kaydı, telefonla ses alma) YASAK.
      · SİLME: ses kaydı süreç bitiminden 24 SAAT sonra sunucudan ve YEDEKTEN kalıcı
        silinir; döküm süreç sonuna kadar durur, son tutanakla birlikte silinir.
- [ ] B19 · TEKLİF DEĞERLENDİRME — teklif talebin ne kadarını karşılıyor, kabulde ne
      kazanılıyor / ne bırakılıyor. Yalnız arabulucuya.
- [ ] B20 · TIKANMA ÇÖZÜCÜ — gerekçeli çıkış yolu önerileri (konuyu bölme, tek başlıkta
      anlaşma, sıra değişikliği, özel oturum, uzman görüşü).
- [ ] B21 · TASLAK DENETİMİ — anlaşma/tutanak imzadan önce taranır: belirsiz ödeme tarihi,
      ölçüsüz ifade ("makul süre"), ad/unvan tutarsızlığı, feragat kapsamı, rakam-yazı
      çelişkisi, eksik imza/tarih.
- [ ] B22 · FATURA / SERBEST MESLEK MAKBUZU TAKİBİ — kim ödedi, kime makbuz kesildi,
      bekleyen kim.

### C) TARAF VE VEKİL
- [ ] C23 · TARAFA OTURUM HAZIRLIK FÖYÜ — hangi başlıklar konuşulacak, hangi belge
      getirilecek, hangi soruya hazırlık, tahmini süre.
- [ ] C24 · HER TARAFA KENDİ AJANI — merkezî ajandan ve birbirinden bağımsız; iki tarafta
      AYNI yetenek.
      YAPAR: süreci anlatır · talepleri derler · eldeki belgelerle güçlü/zayıf yönleri
      çıkarır (hangi talep belgeli, hangisi değil, nerede çelişki) · anlaşmama hâlini
      kaynaklı rakamlarla gösterir (süre, harç, masraf = BATNA) · teklifin talebin yüzde
      kaçını karşıladığını gösterir.
      YAPMAZ: "kabul et / etme" · rakam önerisi · mahkeme sonucu tahmini · karşı taraf
      hakkında yorum · vekil yerine geçme.
      DUVAR: arabulucu taraf ajanının içeriğini GÖREMEZ; taraf ajanı merkezî analizlere
      ERİŞEMEZ.
      Zayıf yön dili tamamlayıcı kurulur ("şu belgeyi eklerseniz talebiniz dayanağına
      kavuşur"). Ekranda sabit uyarı: "Bu asistan hukuki tavsiye vermez, tespit yapar."
- [ ] C25 · "VERİLERİM" SAYFASI — taraf kendi verisini görür: ne toplandı, ne kadar
      saklanacak, silme/düzeltme talebi düğmesi.
- [ ] C26 · VEKİL EKRANI — pilotta YOK, sonraya (vekil taraf ajanını kullanır).

### D) ETİK / KURUMSAL
- [ ] D27 · YZ KULLANIM BEYANI — dosya açılışında bildirim + imzalı onay, tutanağa
      işlenir: hangi işlerde YZ var, neyi yapmıyor, veri eğitime çıkmıyor, taraf ajanı
      iki tarafa da eşit verildi.
- [ ] D28 · "NE YAPAR / NE YAPMAZ" TANITIM EKRANI — arabulucunun ilk girişinde.
- [ ] D29 · DENETİM İZİ — hangi çıktı ne zaman üretildi, kim onayladı, kim değiştirdi.

### ERTELENENLER (karar: sonra)
- Arabulucu ataması + çıkar çatışması taraması — sonra.
- Ayrı taraflılık denetimi — pilot sonrası.
- Eğitim amaçlı senaryo üretimi — sonra.
- Dil desteği / çeviri — KAPSAM DIŞI.
- Sicil / eğitim / sigorta takibi — İSTENMEDİ.

## Nerede kaldık — 15.08.2026 (52) · TUR C-2 KÖR TEKLİF v2 (koşullu aralık / braketleme)
- [x] SQL göçü yazıldı (idempotent): supabase/migrations/20260815120000_kor_teklif_v2_braket.sql
      — teklif_braketleri · braket_bant_sorulari · braket_denetim_izi + RLS + braket izi
      tetikleyicisi + braket_bant_sorularim / braket_bant_cevapla RPC'leri.
- [x] Taraf ekranı (CaseRoom, salt ekleme): "Kabul Aralığım" sekmesi — alt/üst sınır,
      koşullu taahhüt (bant alt · bant üst · inilecek tutar · not), bant sorusu kartı.
- [x] Ajan kolu (ajan-nobetci): braket kaydı · örtüşme hesabı (yalnız arabulucunun
      gördüğü ize) · karşı tarafa yalnız bant sorusu · ret hâlinde taahhüdün düşmesi.
- [x] Nöbetçi özetine dört sayaç: braket_girildi · ortusme_bulundu ·
      bant_sorusu_gonderildi · taahhut_dustu.
- [x] Arabulucu yüzeyi: Faz 4 "Koşullu aralık (braket)" bölümü — örtüşme bandı + yakınlık
      göstergesi (yalnız arabulucuda). Denetim izi Ajan Paneli listesine karışıyor.
tsc (tsconfig.app.json) temiz.
- [x] CANLIDA UÇTAN UCA DOĞRULANDI (15.08.2026).
      · Göç 20260815120000_kor_teklif_v2_braket.sql canlıda çalıştırıldı (5 parçaya
        bölünerek).
      · Taraf 100.000-200.000 aralığı + koşullu taahhüt (120.000-150.000 bandında
        150.000) girdi, kayıt tuttu.
      · Nöbetçi işledi: braket 'soruldu', karşı tarafa yalnız bant sorusu açıldı
        (rakam / taahhüt / kaynak taraf görünmüyor).
      · 'ret' cevabında taahhüt kendiliğinden düştü (kosul_durumu='dustu'), denetim
        izinde 3 kayıt.
- [x] 'KABUL' YOLU DOĞRULANDI (15.08.2026): bant sorusu kabul edilince nöbetçi işledi,
      kosul_durumu='kabul', denetim izi 5 kayda çıktı.
- [x] TARAF EKRANINDAN GERÇEK CEVAP AKIŞI DOĞRULANDI (15.08.2026): taraf "Kabul Aralığım"
      sekmesinde "Şu aralığı düşünür müsünüz: 120.000-150.000 TRY" kutusunu ve iki
      düğmeyi gördü; "Düşünürüm" basıldı, braket_bant_cevapla RPC çalıştı, durum='kabul',
      ekranda "Cevabınız alındı" onayı çıktı. Kutu metni kaynağı gizliyor.
BRAKETLEME HATTI KAPANDI: veritabanı + ajan kolu + taraf ekranı, her iki cevap yolu
(kabul/ret) canlıda doğrulandı.
AÇIK KALAN (tek): Uyuşmazlık konusu kutusundaki "Yeni öneri getir" düğmesi alan doluyken
canlıda görünmüyor — kod 75f26f4'te var, Lovable senkronu geride kaldığı için yayına
girmedi.
REDEPLOY GEREKLİ: ajan-nobetci (Lovable GitHub push'unu edge fonksiyonlara otomatik
deploy ETMEZ).
KARAR NOTU (kurucuya): Tarafa, koşullu taahhüdünün "düştüğü" yalnız nötr cümleyle
("kapandı, dilerseniz yenisini girin") bildiriliyor; karşı tarafın cevabı hiçbir yüzeyde
yazmıyor. Daha açık bir dil isteniyorsa söyleyin — kör veri gerekçesiyle dar tutuldu.
Sırada: SQL çalıştırma + ajan-nobetci redeploy, ardından canlı test (iki taraf braket
girer, koşullu taahhüt konur, karşı taraf reddeder → taahhüt düşer).

## Nerede kaldık — 14.08.2026 (51) · OTONOM AKIŞ (nöbetçi süreci yürütüyor)
- [x] Randevu tetikleyicisi değişti: "son tarihe 3 gün" kuralı kaldırıldı; analiz
      zinciri bitince + planlı oturum yoksa + bekleyen teklif yoksa teklif HEMEN açılıyor.
- [x] Saat önerisinde tarafın kendi müsaitliği (taraf_musaitlik) önce okunuyor;
      uyan saat varsa o teklif ediliyor, yoksa arabulucunun takvimi. Otomatik onay akışı
      aynen çalışıyor.
- [x] 'asama_gecisi' görev tipi (1→7): şartlar mimari/06'da; aşama yalnız ileri gidiyor,
      aynı geçiş iki kez yazılmıyor.
- [x] Zorunlu insan noktaları 'onay_bekliyor' olarak panoya + bildirim: tutanak imzaya
      sunulması · sonuç kaydı · dosya kapatma · "oturum yapıldı mı?".
- [x] Aşama 4-7 kolları: oturumdan 1 gün önce arabulucu imzalı hatırlatma (tek kez),
      oturum sonrası soru, oturum notu taslağı ve kapanış onayları.
- [x] Ön koşul uyarıları: her çalıştırılamayan kolun sebebi zaman damgasıyla
      agent_states.last_output.yapilmayanlar'a yazılıyor.
- [x] Ajan Paneli'ne "ajan ne yaptı, ne yapmadı" bölümü + onay düğmeleri.
tsc + build temiz; edge fonksiyonların sözdizimi esbuild ile doğrulandı.
- [x] ajan-nobetci CANLIDA DOĞRULANDI (15.08.2026).
      · agent_states.agent_type CHECK kısıtı canlıda 'nobetci' değerini kabul etmiyordu;
        kısıt mevcut 14 tür korunarak 'nobetci' eklenecek şekilde genişletildi
        (Lovable > Cloud > SQL).
      · ajan-nobetci elle tetiklendi (net.http_post, x-cron-secret), 200 döndü;
        2 dosya tarandı, hata yok.
      · agent_states'e dosya başına 'nobetci' satırı yazıldı; last_output içindeki
        yapilmayanlar dizisi gerekçe ve zaman damgasıyla dolu.
      · Ajan Kontrol Paneli'ndeki "Ajan ne yaptı, ne yapmadı" listesi canlıda
        doğrulandı: yapılanlar ve atlananlar gerekçeleriyle görünüyor.
- [x] OTOMATİK KOŞUM KURULDU (15.08.2026): pg_cron işi 'ajan-nobetci-3dk',
      zamanlama */3 * * * * (3 dakikada bir, 7/24), jobid 8. Çağrı net.http_post ile
      /functions/v1/ajan-nobetci adresine, yetki x-cron-secret başlığıyla. İlk otomatik
      koşum canlıda doğrulandı (cron.job_run_details = succeeded).
      · NOT: app.cron_secret veritabanı ayarı TANIMLI DEĞİL ve Lovable SQL çalıştırıcısı
        ALTER DATABASE'e izin vermedi (Connection Error). Bu yüzden anahtar cron.job
        komut metninde düz metin duruyor. Depodaki deadline-reminder-daily cronu anahtarı
        current_setting('app.cron_secret') ile okuduğu için MUHTEMELEN SESSİZCE BOŞA
        KOŞUYOR — ayrı iş olarak incelenecek.
      · AÇIK KALAN: mesai dışı sessiz saat kuralı yok; nöbetçi gece de koşuyor ve iş
        varsa e-posta gönderebilir.
REDEPLOY GEREKLİ: ajan-nobetci, randevu-teklif.
AÇIK UÇLAR:
- ajan_gorevleri için arabulucu SELECT/UPDATE politikası doğrulanmadı; yoksa panelde
  kırmızı hata satırı çıkar (SQL kurucudan).
- case_sessions.status='completed' değeri ilk kez bu akışla yazılıyor; başka ekranlar
  bu değeri "iptal değil" olarak sayıyor, sayaçlar kontrol edilmeli.
- Oturum notu taslağının METNİ üretilmiyor (uydurma yasağı): kayıt/döküm hattı gelince
  taslak dökümden beslenecek.

## Nerede kaldık — 14.08.2026 (52) · TUR B — TARAF AJANI
- [x] Yeni görev tipleri (ajan-nobetci): taraf_musaitlik_iste · teklif_degerlendir ·
      taraf_eksik_bilgi · taraf_alternatif_saat (veri satırı, süreç ajanı okur).
- [x] teklif_degerlendir üç kol: uyan saat + otomatik onay açık → mevcut "Uygun" akışı iç
      kapıdan; uyan saat + onay kapalı → teklif başına tek kez onay hatırlatması;
      uymayan saat → "uymuyor" yazılmaz, tarafın kendi aralıklarından en yakın üç saat
      alternatif olarak panoya yazılır.
- [x] randevu-teklif: saat seçerken panodaki alternatifleri önce deniyor, kullanınca
      satırı kapatıyor.
- [x] Kör veri: taraf ajanının her satırında hedef_party_id dolu; panoya alternatif
      saatler dışında taraf verisi geçmiyor.
- [x] Taraf ekranına "Ajanım" sekmesi: kendi kayıtları + iki yetki anahtarı.
- [x] Dönüş özetine sayaçlar: musaitlik_istendi, teklif_degerlendirildi,
      otomatik_onaylandi, alternatif_yazildi, eksik_bilgi_istendi.
tsc (tsconfig.app.json) yeni hata üretmiyor — depoda önceden duran 7 hata
(mediator_availability şema kayması) aynen duruyor. vite build temiz. CANLI TEST YOK.
REDEPLOY GEREKLİ: ajan-nobetci, randevu-teklif.
SQL GEREKLİ (kurucu, Lovable SQL'den — idempotent, depoda
supabase/migrations/20260814120000_*.sql):
  · case_parties.hatirlatma_izni (default true)
  · ajan_gorevleri RLS: arabulucu/yönetici tam yetki, taraf yalnız kendi
    hedef_party_id satırlarını OKUR.
AÇIK UÇLAR:
- case_parties üzerinde kolon-koruma tetikleyicisi varsa hatirlatma_izni izin listesine
  eklenmeli; yoksa taraf anahtarı hata döndürür (ekranda görünür).
- otomatik_onay anahtarı artık iki yerde (Randevu Tercihlerim + Ajanım); ikisi de aynı
  alanı yazıyor, tek anahtara indirilmesi kurucu kararı.
- DİKKAT: kök tsconfig.json "files": [] taşıyor, hiçbir dosyayı denetlemiyor.
  Gerçek denetim `npx tsc --noEmit -p tsconfig.app.json` ile yapılır.

## Nerede kaldık — 14.08.2026 (53) · TUR C-1 — İLK TEMAS, KATILIM, ÇOKLU/ÖZEL OTURUM
- [x] 'ilk_temas': dosyaya eklenen her tarafa TEK KEZ arabulucu imzalı bilgilendirme +
      tek dokunuşluk katılım bağlantısı; girişsiz sayfa /katilim/:token, motor
      taraf-katilim (verify_jwt=false). Cevap tek kullanımlık.
- [x] Katılım kaydı: case_parties.katilim_durumu / katilim_zamani / katilim_token.
- [x] "Katılmıyorum" → ajan randevu açmıyor, sebep panoya + yapılmayanlara, arabulucuya
      onay_bekliyor kaydı ve bildirim. "Bilgi istiyorum" → arabulucuya görev (ajan hukuki
      açıklama yapmıyor).
- [x] 'ek_oturum_gerekli_mi': yapılan oturumdan sonra "ikinci oturum gerekli mi?" sorusu;
      Gerekli → randevu hattı yeniden başlıyor (karar bir kez uygulanıyor),
      Gerekli değil → yeni randevu açılmıyor.
- [x] 'ozel_oturum': Ajan Paneli'nden taraf seçilip talep ediliyor; davet yalnız o tarafa
      gidiyor, oturum mevcut "private" (Özel Görüşme) tipiyle açılıyor.
- [x] Sayaçlar: ilk_temas_gonderildi, katilim_cevabi_islendi, ek_oturum_sorusu_acildi,
      ozel_oturum_daveti.
tsc (tsconfig.app.json) 0 hata; vite build temiz; edge fonksiyonları esbuild ile
sözdizimi doğrulandı. CANLI TEST YOK.
REDEPLOY GEREKLİ: taraf-katilim (YENİ), ajan-nobetci, randevu-teklif.
SQL GEREKLİ (idempotent, depoda supabase/migrations/20260814160000_*.sql):
case_parties.katilim_durumu + katilim_zamani + katilim_token (+ CHECK + kısmi unique).
AÇIK UÇLAR:
- Özel oturumun karşı taraftan gizliliği bugün taraf ekranında oturum listesi
  OLMAMASINA dayanıyor; taraf ekranına ileride oturum listesi eklenirse private
  oturumların o listeden çıkarılması ZORUNLU (aksi hâlde kör veri delinir).
- İlk temas e-postası taraf eklenir eklenmez gider; mevcut "Davet Gönder" akışı ayrı
  durur — iki e-postanın birleştirilmesi kurucu kararı.
- Katılım cevabı sonrası ajanın davranışı yalnız randevu hattını etkiliyor; analiz ve
  aşama geçişi kolları katılım durumundan bağımsız çalışıyor.

## SIRADAKİ İŞLER — 14.08.2026 kurucu kararları (yapılacak, bu sırayla)

- [ ] 1. BATNA'nın TARAF YÜZÜ (IBA kararı) — Tarafa dava alternatifi gösterilirken emsal
      sonuç dağılımı ve bundan türetilmiş RİSK BANDI gösterilir. TEK RAKAM VERİLMEZ:
      "şu kadar alırsınız" yasak; yalnız dağılım + bant + dayanak. Arabulucu yüzündeki
      Dava Alternatifi Hesabı (mimari §5.2h) bozulmadan kalır.
- [ ] 2. İLETİŞİM TERCİHİ KATMANI (IBA kararı) — Taraf, hangi kanaldan (e-posta ·
      WhatsApp/SMS · uygulama içi) ve hangi sıklıkta bilgilendirilmek istediğini kendi
      ekranından seçer; sistem bildirimleri bu tercihe göre gönderir.
- [ ] 3. AI OTURUM NOTLARI (IBA kararı) — Oturum sonrası notun yapay zekâ ile üretilen
      hâli; arabulucuya düzenlenebilir taslak olarak gelir, onaylanınca föye ve analiz
      zincirine girer (manuel her zaman kazanır).
- [ ] 4. BELGE ÖZETİ — Yüklenen her belgeye tek paragraf özet + "neyi kanıtlıyor" satırı;
      arabulucu ekranında belgenin yanında görünür.
- [ ] 5. İLETİŞİMDEKİ DEĞİŞİM İŞARETİ — party-communication-analysis üzerinden
      arabulucuya "bu konuda dil sertleşti / yumuşadı" işareti.
      ÇİZGİ (değişmez): kişilik veya psikoloji etiketi YOK, teşhis YOK; yalnız tarafın
      KENDİ metinlerindeki değişim ölçülür, yalnız arabulucuya gösterilir, karşı tarafa
      hiçbir yüzeyden sızmaz.
- [ ] 6. GÖRÜŞME KAYDI VE DÖKÜMÜ — dört parça:
      (a) KAYIT ONAYI katmanı: YZ Beyanı kapısıyla aynı kalıpta taraf onayı; bir taraf
          bile onay vermezse kayıt açılamaz.
      (b) Video kaydı ve elle yüklenen kayıt (WhatsApp / bilgisayardan) yazıya dökülür ve
          AI Oturum Notu olarak YALNIZ arabulucuya gösterilir.
      (c) v1'de kaydı kullanıcı yükler; masaüstü kayıt aracı sonraya bırakıldı.
      (d) SAKLAMA YOK: ses dosyası döküm çıkar çıkmaz, döküm metni dosya kapanınca
          otomatik silinir.
- [ ] 6b. SAKLAMA AYRIMI (14.08 kararı) — Belgeler mevcut karara göre saklanır (5 yıl);
      GÖRÜŞME SES KAYDI VE DÖKÜMÜ HİÇ SAKLANMAZ: ses dosyası döküm çıkar çıkmaz, döküm
      metni dosya kapanınca otomatik silinir. Bu ayrım saklama-imha motorunda (mimari
      §12.5.9) ayrı veri tipi olarak kurulur.
- [ ] 7. NİTELİKLİ ARABULUCU ATAMASI — Başvuru gelince ajan, uyuşmazlık türüne göre uygun
      uzmanlıktaki arabulucuyu atar; atamanın yanında "Değiştir" düğmesi durur — son söz
      insanda.
- [x] 8. AJAN PANELİNDE "YAPILMAYANLAR VE SEBEBİ" — 14.08'de yapıldı (bkz. oturum 51);
      nöbetçinin atlama sebepleri zaman damgalı olarak Ajan Paneli'nde görünüyor.
      CANLI TEST BEKLİYOR.
- [ ] 9. KÖR TEKLİF v2 / BRAKETLEME (güncellendi) — Taraflardan tek rakam yerine ALT-ÜST
      ARALIK alınır; braketlerin çakışması ve turlar arası yakınlaşma taraflara rakam
      sızdırmadan bildirilir. Yakınlık seyri yalnız arabulucuya görünür.

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

## KALICI ÇALIŞMA KURALI (14.08 — atlanamaz)
Her gün sonunda yalnız YAPILAN İŞLER değil, o gün ALINAN KARARLAR da bu iki dosyaya
(tasks/todo.md ve tasks/yol-haritasi.md) işlenir. Kod değişmemiş olsa bile karar
kaydedilir; kaydedilmemiş karar alınmamış sayılır.

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
