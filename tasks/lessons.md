# tasks/lessons.md — Öğrenilen Dersler
Her kurucu düzeltmesinden sonra buraya kural ekle. Oturum başında oku.

- DERS (17.08.2026) — "REDEPLOY ETTİM AMA DEĞİŞMEDİ" TEŞHİSİNİN İLK ADIMI PUSH
  KONTROLÜDÜR. Hazırlık föyünün saat ve gündem düzeltmeleri redeploy edildikten sonra
  da eski çıktı verdi. Kod doğruydu, redeploy da yapılmıştı. Sebep: commit'ler GitHub'a
  PUSH EDİLMEMİŞTİ; Lovable eski dosyayı görüyor, redeploy eski sürümü yayına alıyordu.
  `git push origin main` (72dc7f0..b22ce0e, 51 nesne) sonrası Lovable yeni kodu gördü ve
  redeploy gerçek değişikliği yayınladı.
  KESİN TEŞHİS YOLU: Lovable'ın gördüğü dosya ile yerel dosya karşılaştırılır; farklıysa
  sorun push'tadır. Tahmin edilmez.
  NOT: Aynı hata 15.08'de de yaşandı. Bundan sonra "değişiklik canlıda görünmüyor"
  denince sıra: (1) push edildi mi, (2) Lovable dosyayı görüyor mu, (3) redeploy yapıldı
  mı, (4) publish yapıldı mı, (5) sert yenileme.
- DERS (17.08.2026) — İŞ KALEMİNDE EN FAZLA İKİ DÜZELTME TURU. Föy metni beş turda
  düzeltildi; her tur publish + test döngüsü açtı ve asıl işlere sıra gelmedi. Kural:
  üçüncü tura kalan kusur "açık kalem" olarak yazılır, sıradaki işe geçilir.

- ÇALIŞAN KRİTİK YOL REFAKTÖR EDİLMEZ: UDF refaktörü canlıda belge indirmeyi kırdı. Temizlik/zarafet gerekçesiyle çalışan koda dokunma
- REDEPLOY UNUTULMAZ: supabase/functions'a dokunan push sonrası Lovable otomatik deploy etmez — her seferinde kurucuya redeploy hatırlat
- PAKET YASAK: Belge üretimine dokunan değişiklik tek başına gider, başka işle birleştirilmez
- BUN KULLANILIR: npm install değil bun install; tek lockfile bun.lock
- SQL İDEMPOTENT: Her migrasyon tekrar çalıştırılabilir yazılır (IF NOT EXISTS / OR REPLACE)
- Yapay zekâ çıktı kalitesi prompt cümlesiyle kovalanmaz. Üç tur
  denendi, her turda başka bir nitelik bozuldu. Kalıcı çözüm: çıktı
  şemasına zorunlu dayanak alanı koymak + bu alanı geçemeyen bulguyu
  sunucu tarafında elemek. (09.08, iç tutarlılık ajanı)
- Belgelerin depoda olduğunu varsayma. 09.08'e kadar constitution.md,
  medipact-komut.md ve mimari.md repoda hiç yoktu; okuma sırası
  sessizce boşa çalışıyordu. Okuma sırasındaki her dosyanın varlığı
  ara ara doğrulanır.
- Mimari artık bölünmüştür: kökteki mimari.md okunmaz, okuma daima
  mimari/00-INDEX.md üzerinden ilgili bölüme gidilerek yapılır.
- Randevu/müsaitlik gibi "arabulucunun kendi takvimi" sorgularında kimlik
  cases.user_id'dir; assigned_mediator_id her dosyada aynı kimliği taşımıyor
  ve önce ona bakmak sorguyu sessizce boş döndürüyor. (13.08, randevu-teklif)
- Sonucu yalnız toast ile bildirme: toast kaçarsa ekranda hiçbir iz kalmıyor,
  "hiçbir şey olmadı" gibi görünüyor. Sonuç üreten her kartın kendi kalıcı
  durum satırı olsun; invoke hatasında error.context gövdesi okunup gerçek
  mesaj yazılsın. (13.08, randevu teklifi kartı)
- "Arabulucunun takvimi" cases tablosundan türetilemez: dosya sahibi
  (cases.user_id) ve takvim sahibi (mediator_availability.user_id) farklı
  kullanıcılar olabiliyor. Kimlik daima isteği yapan JWT'den alınır.
  (13.08, randevu-teklif — 1f9856f'teki ilk düzeltme de yanlış kaynağa bakıyordu)
- PostgREST gömülü ilişkiyle (tablo:fk(alan)) filtrelemeye güvenme: ilişki
  boş/hatalı dönerse sorgu sessizce işlevsiz kalır. Önce kimlikleri ayrı
  sorguyla al, sonra .in(...) ile filtrele; error'ı da mutlaka oku.
  (13.08, randevu-teklif dolu saat dışlama)
- Edge fonksiyonlarda tsc kapsam DIŞIDIR (tsconfig yalnız src'yi tarar): tanımsız
  değişken ancak canlıda ReferenceError olarak çıkar. Bir fonksiyondan diğerine
  kod taşırken yardımcıların (TZ, takvimSahibi gibi) hedef dosyada tanımlı
  olduğu ayrıca doğrulanır. (13.08, ajan-nobetci)
- Edge fonksiyonun canlı hatası tahminle bulunmaz: dönüş özetine teşhis alanı
  (incelenen sayısı, atlama sebepleri, boş dönen sorgu adı) eklenip bir kez
  koşturulur; hata o alanda görünür. (13.08, ajan-nobetci video hattı)
- Tarih/saat karşılaştırmasında UTC↔TR farkını düzeltmek tek başına yetmez:
  eşleşme GÜN ve SAATİN ikisi birden tutunca kabul edilir, yoksa başka günün
  kaydı yanlışlıkla eşleşir. (13.08, teklif–oturum eşleştirmesi)
- KAYNAK DOSYAYA POWERSHELL Get-Content/Set-Content İLE DOKUNMA: UTF-8 dosyayı
  ANSI (cp1254) okuyup geri yazınca tüm Türkçe karakterler bozuldu ve satır
  sonları CRLF oldu. Dosya birleştirme/parça ekleme işleri Edit aracıyla ya da
  Node/Python ile açıkça utf-8 belirtilerek yapılır. (14.08, MediationEngine.tsx)
- Aşama numarası hem URL'de hem veritabanında duruyorsa numaralama değişince
  ikisi ayrışır: URL'ye sürüm işareti (pv=2) konup eski bağlantı çevrilebilir,
  ama cases.current_phase gibi KAYITLI sayılar eski numaralamada kalır. Kayıtlı
  sayı yalnız "hangi aşama açılsın" ipucu olarak kullanılıp sınırlandırılır.
  (14.08, aşama 8 → 7)
- Ön yüz değişikliği Publish edilmeden taraf ekranında görünmez; "eski stil
  duruyor" şikâyeti önce Publish eksikliği olarak okunur, kod aranmadan önce
  yayın durumu sorulur. (13.08)
- KÖK tsconfig.json BOŞTUR ("files": []): `tsc -p tsconfig.json` hiçbir dosyayı
  denetlemez ve her zaman 0 döner. Gerçek denetim `npx tsc --noEmit -p
  tsconfig.app.json` ile yapılır; vite build de tip denetlemez (esbuild yalnız
  tipleri siler), bu yüzden eksik import runtime'da patlar. (14.08, CaseRoom
  useMemo importu)
- Yeni bir ajan türü eklenirken agent_states.agent_type CHECK kısıtı genişletilmezse,
  ajan çalışsa bile durum yazımı SESSİZCE düşer ve panel boş görünür. Yeni ajan ekleyen
  her migration'a kısıt genişletmesi dahil edilecek (mevcut türler korunarak); ayrıca
  nobetciDurumYaz gibi durum yazım fonksiyonlarında hata kontrolü yapılacak — şu an
  hata yutuluyor. (15.08, ajan-nobetci canlı doğrulaması)
- pg_cron işleri anahtarı current_setting('app.cron_secret') ile okuyorsa, o ayar tanımlı
  değilse cron SESSİZCE 401 alır ve hiç çalışmamış gibi görünür. Yeni cron kurarken önce
  ayarın tanımlı olup olmadığı kontrol edilecek. (15.08, ajan-nobetci-3dk kurulumu)
- Canlıda elle kurulan altyapı depoda görünmez. 15.08'de ajan-nobetci cron'u ikinci kez
  kuruldu çünkü depoda tanım yoktu. Ders: depo "yok" diyorsa canlıya sorulacak.
  (Kayıt yeri: tasks/kurulu-envanter.md)
- supabase.functions.invoke hatasında error.message her zaman genel bir cümledir
  ("non-2xx status code"); gerçek sebep error.context gövdesindedir. Gövde okunmazsa
  kullanıcı "hiçbir şey olmadı" görür. Her invoke çağrısında context gövdesi okunup
  KIRMIZI ve KALICI bir satıra, çağrılan fonksiyon adıyla birlikte yazılacak.
  (15.08, dosya-ozeti-oner "Öneri getir" düğmesi)
- Bir görünüm fonksiyonu bileşenin GÖVDESİNDE tanımlanıp JSX elemanı olarak
  (<PartyView />) çağrılırsa, her render'da bileşen TÜRÜ değişir; React ağacı söküp
  yeniden kurar ve alt bileşenlerin yerel durumu (form alanları) silinir. Bu kalıp ya
  dosya düzeyine taşınır ya da düz fonksiyon çağrısıyla ({PartyView()}) yerinde
  üretilir. (15.08, CaseRoom "Kabul Aralığım" formu sıfırlanıyordu)
- Kayıt sonrası tazeleme (yukle) form alanlarını koşulsuz doldurursa, kullanıcının
  yazdığı değer başka bir işlem (bant sorusu cevabı gibi) tetiklendiğinde silinir.
  Tazeleme çağrısı "formu da doldur" bayrağı almalı ve kullanıcı forma dokunduysa
  alanların üstüne yazmamalıdır. (15.08, braket formu)
- Lovable SQL çalıştırıcısı uzun göçleri ve $$ bloklarını "syntax error at end of input"
  ile reddediyor. Çözüm: göçü parçalara böl, DO bloğu yerine
  DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT kullan, fonksiyonlarda $$ yerine
  adlandırılmış etiket ($braket_izi$ gibi) kullan. (15.08, kör teklif v2 braket göçü)
- "Ekranda hiçbir şey olmuyor" belirtisinin DÖRT ayrı sebebi olabilir: commit push
  edilmemiş · Lovable senkronu geride · edge fonksiyon redeploy edilmemiş · veritabanı
  göçü çalıştırılmamış. Ekran testinden önce dördü sırayla doğrulanacak. (15.08)
- Yasaklı kelime süzgeci cümle bağlamına bakmadan uygulanırsa doğru çıktıyı eler:
  ihtarname özeti "kusur" kelimesi yüzünden elendi; oysa kusuru ileri süren TARAFTI.
  Kural: yasak ajanın KENDİ hüküm cümlesine uygulanır, tarafın iddiasının aktarımına
  uygulanmaz — denetim cümle cümle yapılır ve elenen cümle sebebe yazılır.
  (15.08, belge-ozeti)
- Çıktının bir ALANI zayıf diye TÜM kayıt elenmemeli: belge özeti, kanıt satırındaki
  "bilgi içerir" kalıbı yüzünden komple siliniyordu; iyi olan özet de gidiyordu.
  Kural: sert eleme yalnız tarafsızlık/gizlilik ihlalinde (ajanın kendi hükmü) uygulanır;
  zayıf alan için hedefli tek bir yeniden deneme yapılır, tutmazsa o alan "çıkarılamadı"
  olarak işaretlenir, geri kalan çıktı korunur. (15.08, belge-ozeti)
- Belgeden tarih toplayan ajan, "tarih" ile "olay" ayrımını kendiliğinden yapmıyor:
  hastanın doğum tarihi çizelgenin ilk satırı olarak girdi. Kural: neyin olay
  SAYILMAYACAĞI istemde tek tek sayılır ve sunucuda da elenir; ayrıca tarih biçimi
  tek noktada normalize edilir, modele bırakılmaz. (15.08, olay-cizelgesi)
- Sütun adı seçerken SQL anahtar kelimelerinden kaçınılır: 'not' sütunu her sorguda
  tırnak ister ve PostgREST filtre sözdizimiyle karışır. Not/açıklama alanları
  'dayanak', 'aciklama', 'silme_notu' gibi adlandırılır. (16.08, kayıt protokolü)
- Kurucunun komutu ile constitution çelişirse constitution kazanır ve sapma RAPOR
  EDİLİR: kayıt yasağı uyarısında istenen dış ürün adları (m.11 yasağı) yazılmadı,
  yasak araç adı verilmeden tarif edildi. Sessizce uygulamak da, komutu birebir
  uygulamak da yanlış olurdu. (16.08, kayıt protokolü)
- shadcn Button'un outline varyantı YAZI RENGİ TANIMLAMAZ (yalnız border + bg-background).
  Koyu zeminli kartta (bg-sidebar) düğme, kartın açık renkli yazısını miras alıp beyaz
  kutu gibi görünür; yazı ancak hover'da belirir. Koyu zeminde düğmeye renk açıkça
  verilir (KOKPIT_DUGME sabiti). Yeni kart eklerken düğme NORMAL hâlde görülerek
  doğrulanır, hover'a bakılmaz. (16.08, Teklif Değerlendirme "Yenile")
- Alıntı doğrulaması (model çıktısı metinde gerçekten geçiyor mu) HARF KATLAMASI olmadan
  yapılmaz: PDF'ten çıkan metinde Türkçe harfler bozuk gelip model düzgün yazınca aynı
  cümle iki farklı dizgi oluyor ve doğru bulgu "uydurma alıntı" diye eleniyor. Kural:
  karşılaştırmada ş/ı/ğ/ç/ö/ü katlanır, satır sonu tirelemesi birleştirilir, satır sonu
  boşluğa çevrilir; sadeleştirme YALNIZ karşılaştırma içindir, kaydedilen metin
  orijinal kalır. Tutmazsa tek seferlik onarım turu (yalnız alıntı isteyen ikinci çağrı)
  yapılır. (16.08, iletisim-degisim)
- DERS (16.08.2026) — Sabit metinli hata gerekçesi yanıltır. Nöbetçi, denenmemiş bir
  çağrı için "iç çağrı kapısı kabul etmiyor" diye SABİT metin yazıyordu; gerçekte istek
  hiç gönderilmemişti. Teşhis bir tur boşa gitti. Kural: hata gerekçesi her zaman
  sunucudan dönen GERÇEK durum kodunu ve hata metnini taşısın; "denenmedi" ile
  "reddedildi" asla aynı cümleyle yazılmasın. (775f66e ile düzeltildi.)
- DERS (16.08.2026) — MÜKERRER ÖZELLİK KONTROLÜ ZORUNLU. "Makbuz takibi" kokpite yeni
  bölüm olarak eklendi; oysa üründe zaten Ödeme & Muhasebe paneli (Ödeme Defteri,
  Makbuz No sütunu, makbuz numarası yazma, ücret hesabı, makbuz taslağı PDF) vardı.
  Bir tur boşa gitti, sonra geri alındı (1aa6b96). Kural: yeni bölüm/kart/sayfa
  yazmadan ÖNCE aynı işi yapan mevcut yüzey aranacak (ekran adı, tablo adı ve alan
  adıyla grep) ve keşif paragrafında "mükerrer değil, çünkü …" diye yazılacak.
- DERS (16.08.2026) — KAYIT RİTÜELİ ATLANMAZ. Kurucu bazı turlarda "yalnız şu dosyaya
  dokun" dediğinde belge güncellemesi turun dışında kalıyor ve iş kayıtsız kalıyor
  (79 numaralı makbuz kalemi bölüm kaldırıldığı hâlde "eklendi" yazılı kaldı).
  Kural: kod turu belge güncellemesine izin vermiyorsa, cevabın sonunda "şu kaydı
  düşmek gerekiyor" diye HATIRLATILACAK ve bir sonraki turda ilk iş o kayıt yazılacak.
- DERS (16.08.2026) — EKRANA BÖLÜM EKLEMEDEN ÖNCE ÜRÜNDE VAR MI DİYE KODA BAKILACAK.
  "Makbuz takibi" bölümü kokpite eklendi; oysa "Ödeme & Muhasebe" panelinde Ödeme
  Defteri, Makbuz No sütunu, makbuz numarası yazmanın iki yolu ve makbuz taslağı PDF'i
  zaten vardı. Kart adı farklı olduğu için yok sanıldı. Kural: AD DEĞİL İŞLEV aranacak;
  yeni bölüm komutundan önce ilgili tabloyu kullanan tüm ekranlar taranacak.
- DERS (17.08.2026) — CLAUDE CODE'UN "YAPTIM" DEMESİ YETMEZ. 3a0f9b5 commitinde
  kademeli oturum seçimi istendi, commit geldi ama değişiklik dosyaya YAZILMAMIŞTI;
  ancak adfcfe5'te girdi. Ders: bir değişikliğin dosyada gerçekten durduğu, tahminle
  değil OKUNARAK doğrulanır (kurucunun bilgisayarındaki C:\Users\ASUS\milat klasöründen
  dosya okunabilir). Üç satırlık özetin "değişen" satırı istenen değişikliklerin
  HEPSİNİ saymıyorsa eksik olan doğrulanmadan publish'e geçilmez.
- DERS (17.08.2026) — EKRANDA BULUNAMAYAN BÖLÜMÜN İLK ŞÜPHELİSİ AŞAMA. Föy düğmeleri
  "yok" diye üç tur arandı; sebep kodda değildi — bölüm Aşama 3'e kayıtlıydı, dosya ise
  Aşama 4'te duruyordu, bileşen hiç çizilmiyordu. Ders: "bölüm görünmüyor" denince önce
  dosyanın current_phase'i ile bölümün kayıtlı olduğu aşama karşılaştırılır.

- DERS (18.08.2026) — PAYLAŞILAN METİN SABİTİ TEK KOL İÇİN DEĞİŞTİRİLMEZ. Föyün maliyet
  uyarısı yanlış hâle gelmişti; düzeltmenin kolay yolu UcretliIsaret.tsx içindeki
  UCRETLI_ISARET_METNI sabitini değiştirmekti — ama o sabiti 14 düğme kullanıyor ve
  hepsi gerçekten her basışta ücret üretiyor. Sabit değiştirilseydi tek kolu düzeltirken
  on üç kolu yalancı çıkaracaktı. Kural: ortak bileşenin varsayılan metni yalnız
  DAVRANIŞI değişen tüm yüzeyler için geçerliyse değiştirilir; tek kola özgü gerçek
  prop ile verilir. Değiştirmeden önce bileşenin kaç yerde kullanıldığı grep'le sayılır.
- DERS (18.08.2026) — "ÜCRETSİZ" ETİKETİ KODUN BUGÜNKÜ HÂLİNE BAĞLIDIR, BELGEYE DEĞİL.
  Dosya başlığında "bu fonksiyon artık hiç ücretli çağrı yapmaz" yazıyordu; havuz
  türetmesi eklenince bu cümle ve dönüş gövdesindeki sabit `model_cagrisi: "yapilmadi"`
  yanlışa döndü. Kural: maliyet/çağrı bildiren her alan HESAPLANIR, sabit yazılmaz; kola
  model çağrısı ekleyen her tur, dosya başlığındaki maliyet cümlesini de aynı commit'te
  düzeltir.
- DERS (18.08.2026) — TERCİH EKRANI VAR DİYE TERCİH UYGULANIYOR SANILMAZ. İletişim
  tercihi katmanına başlarken NotificationSettings.tsx ve notification_preferences
  tablosu bulundu; ilk izlenim "bu iş zaten var" idi. Grep ile bakıldığında tabloyu
  HİÇBİR gönderim yolunun okumadığı görüldü — ekran kullanıcıdan tercih topluyor ama
  hiçbir e-posta bu tercihe bakmıyor. Kural: bir tercih/ayar yüzeyi bulunduğunda
  "var mı" değil "OKUNUYOR MU" sorulur; ayarı yazan yer değil, TÜKETEN yer grep'lenir.
  Tüketeni olmayan ayar ekranı üründe var sayılmaz, açık kalem olarak raporlanır.
- DERS (18.08.2026) — BİLDİRİM SÜZGECİ FAIL-OPEN KURULUR. Gönderim kararını veren her
  süzgeç, hata/kayıt yokluğu/çözülemeyen kimlik durumunda GÖNDERMEYE meyleder. Ters
  kurulsaydı (şüphede sustur) tek bir sorgu arızası oturum davetini yutar ve taraf
  duruşmayı kaçırırdı; sessiz kalan hata en pahalı hata türüdür. Kural: bir süzgeç
  kullanıcıya ulaşan bildirimi kesiyorsa varsayılanı DAİMA "gönder" olur ve bu, kodda
  yorumla işaretlenir.
- DERS (18.08.2026) — LOVABLE'IN "PUBLISH"İ EDGE FONKSİYONU DEPLOY ETMEZ. deploy_project
  YALNIZ ön yüzü yayınlar; supabase/functions altındaki kod ayrı deploy ister. Yeni bir
  fonksiyon GitHub'a push edilmekle canlıya girmez — Lovable sohbetinden ayrıca deploy
  edilmelidir. Kural: fonksiyon dokunulan her turda "publish" ile "redeploy" AYRI iki
  satır olarak raporlanır; canlı test, fonksiyonun deploy edildiği doğrulanmadan
  başlatılmaz. (17.08'deki "push edilmemiş commit" dersinin kardeşi: orada kaynak eski
  kalmıştı, burada yayın kolu hiç çalışmıyor.)
- DERS (18.08.2026) — "EKRANDA YOK" DEMEDEN ÖNCE HANGİ ROLLE BAKILDIĞI DOĞRULANIR.
  Arabulucu yüzeyindeki bir bölüm canlıda aranırken taraf hesabıyla bakıldı; ekran
  doğru çalıştığı hâlde dört tur kod arandı. Kural: bir yüzey görünmüyorsa ilk soru
  "kod yanlış mı" değil, "bu ekranı hangi rol görür ve şu an hangi rolle bakıyorum"
  sorusudur; rol doğrulanmadan kodda değişiklik aranmaz.
- DERS (18.08.2026) — EKRAN METNİ KODA SÖZ VERİYORSA KOD DOĞRULANIR. Sessiz saat
  açıklaması "ertesi ilk uygun saate bırakılır" diyordu; süzgeç ise bildirimi kuyruğa
  almayıp atlıyordu. Yanlış taahhüt taraf nezdinde arabulucuyu bağlar — ürün metni
  hukuki beyan gibi okunur. Kural: davranış vaat eden her cümle (gönderilir, ertelenir,
  saklanır, silinir) yazıldığı turda kodla karşılaştırılır; karşılığı yoksa cümle
  gerçeğe göre yazılır, kod cümleye uydurulmaz.
- DERS (19.08.2026) — KOMUT TEK YETENEK İÇİN YAZILIRSA SİSTEM TEK YETENEK İÇİN
  KURULUR. Föy gönderimi, kalem çıkarımı ve anlatım ayrı ayrı istendi; her biri
  tek başına doğru kuruldu ama aralarındaki ORTAK DAVRANIŞ (eksik girdiyi kendi
  çözme, doğru kişiye sorma, cevaptan sonra devam etme) hiçbirinde yoktu — çünkü
  hiçbir komut onu istememişti. Sonuç: koşucu eksik girdiyle çağırıp pes etti,
  sorulan soru başka bir kol tarafından kapatıldı, dayanaksız kalem 'taslak'
  sayıldı. Üçü de aynı boşluğun görüntüleriydi. Kural: tekrar eden davranış üç
  yerde görünüyorsa artık özellik değil YASADIR; tek ortak motora yazılır ve
  bütün kollar oradan geçirilir. Yeni yetenek, motora bağlanmadan çalışamamalıdır
  — yapısal zorunluluk olmadan kural zamanla delinir.
- DERS (20.08.2026) — TEKRAR SÜZGECİ TÜR ÜZERİNDEN KURULURSA FARKLI KONUDAKİ
  BİLDİRİM ELENİR. akis-yurut'taki panoyaYaz "aynı tip + aynı hedef için
  bekleyen satır varsa yazma" diyordu; föy onayı beklerken gelen talimat reddi
  bu yüzden sohbete hiç düşmedi (canlı bulgu 20.08 02:06). Kural: tekrar süzgeci
  TÜR üzerinden değil KONU üzerinden kurulur (talimat kimliği, kural kodu gibi);
  farklı konudaki bildirim her zaman yazılır ve yazılamıyorsa sebebi özete geçer.
- DERS (20.08.2026) — DEFTER HATASI YUTULUYORDU. ajan_deneyim'e sıfır satır
  düşüyordu ve sebebi hiçbir yerde görünmüyordu: bellekYaz hatayı boş catch ile
  yutuyor, deneyimYaz yalnız error.message'ı kısaltıp döndürüyordu; dönen metin
  de hiçbir yere yazılmıyordu. Kural: best-effort bir yazım SESSİZ olmaz —
  hata metni TAM yazılır (message + code + details + hint), çağırana döner ve
  görünür bir yere (olay kaydı/özet notu) taşınır. "Best-effort" demek
  "görünmez" demek değildir.
- DERS (20.08.2026) — "TAMAMLANDI" İŞARETİ ÜRETİLMEDEN DEVİR MÜKERRER KOŞUM
  ÜRETİR. Devir kolu taraf-kalem-cikar'ı yeniden koşturdu ve kalemler 6'dan
  23'e çıktı; çünkü "bu adım bitti" diye okunacak bir işaret yoktu, yalnız
  "devredildi" işareti vardı. Kural: bir adımın tekrar koşulmasını engelleyen
  işaret, adımın KENDİ BAŞARILI KAPANIŞINDA üretilir; devir/tetikleme kolları
  koşturmadan ÖNCE o işarete bakar. Ayrıca işlenen kaynağın kimliği (belge,
  kayıt) ayrı bir işaretle tutulur ki aynı kaynak iki kez işlenmesin.
- DERS (20.08.2026) — HATA GÖRÜNÜR KILININCA SEBEP TEK KOŞUMDA BULUNDU. Defter
  yazımı haftalardır sessizce düşüyordu; hata metni tam yazılıp olay kaydına ve
  konsola taşınınca sebep ilk koşumda ortaya çıktı ("deneme_no not-null" ve
  "tutar benzeri değer"). Kural: bir yazım best-effort ise bile SESSİZ OLMAZ;
  görünmeyen hata, olmayan hata değildir — yalnız geç bulunan hatadır.
- DERS (20.08.2026) — KORUMA SÜZGECİ KENDİ MAKİNE ALANLARINI DA ELEDİ. Öğrenme
  hattını kişisel veriden korumak için konan "rakam yığını" denetimi, ISO saat
  damgasındaki yılı tutar sanıp belleğe yazan bütün çağrıları düşürdü; mükerrer
  koşum koruması ve devir zinciri farkına varılmadan kapalı kaldı. Kural: bir
  süzgeç yazılırken MAKİNE KİMLİĞİ (saat damgası, UUID, kod, kısaltma) ile
  KİŞİSEL VERİ ayrımı baştan konur ve muafiyet desenle tanımlanır; süzgeç
  eklendikten sonra kendi yazdığı alanlarla bir kez denenir.
- DERS (20.08.2026) — MÜKERRER YAZIM KAPISI ETİKETİN YERİNE BAĞLIDIR. Nöbetçinin
  gorevEtiketiVarMi kapısı gerekçenin iş etiketiyle BAŞLADIĞINI varsayıyor
  (startsWith); ama bildirimler anaAjanaBildir geçidinden geçtiğinden gerekçenin
  başına artık "[kaynak:…]" konuyor ve iş etiketi ortada kalıyor. Kapı sessizce
  açılıyor, aynı hatırlatma her turda yeniden yazılabiliyor. Kural: bir etiket
  denetimi yazılırken metnin BAŞINA başka bir katmanın yazıp yazmadığı kontrol
  edilir; ortak geçitten geçen metinlerde startsWith değil includes kullanılır.
  (Bilirkişi kolunda bilirkisiEtiketiVarMi ile yapıldı; mevcut kapı KAPSAM DIŞI
  olduğu için düzeltilmedi, todo.md'ye raporlandı.)
- DERS (20.08.2026) — TARAFIN OKUYAMADIĞI TABLODAN EKRAN ÇİZİLMEZ. Bilirkişi
  aday kartları önce doğrudan `experts` tablosundan çizilecekti; oysa canlı
  politika (20260630074226) o tabloyu yalnız yöneticiye ve GÖREVLİ ARABULUCUYA
  açıyor — taraf da, bilirkişinin kendisi de okuyamıyor. Kural: bir ekran
  yazmadan önce o verinin ilgili ROLE açık olup olmadığı politikadan
  doğrulanır; açık değilse veri sunucudan (edge fonksiyon) verilir ve süzme
  sorguda yapılır. Ekranda gizlemek yetki değildir.
- DERS (21.08.2026) — KENDİ OLAYINI YAZAN KOL KENDİ KENDİNİ UYANDIRIR. bilirkisi-secim
  'ilerlet' adımı her koşumda koşulsuz bilirkisi_durumu_degisti yazıyordu; akış kuralı
  aynı olayla yine bu kolu çağırdığı için kol kendini besleyen döngüye girdi ve kural
  canlıda kapatılmak zorunda kaldı. Kural: olayla uyanan bir fonksiyon, uyandığı olayın
  AYNISINI koşulsuz yazamaz. Yazmadan önce "gerçekten bir şey değişti mi" NESNEL olarak
  ölçülür (sayı ve durum kodundan kurulu bir parmak izi), değişmediyse olay yazılmaz ve
  sebep dönüş gövdesine yazılır. Kullanıcı eylemiyle doğan olaylar bu kapıya
  BAĞLANMAZ — parmak izini değiştirmedikleri için sessizce elenirlerdi.
- DERS (21.08.2026) — ORTAK GEÇİT EKLENİNCE ETİKET ARAYAN HER KAPI KIRILIR. anaAjanaBildir
  gerekçenin başına "[kaynak:…]" koymaya başlayınca, gerekçeyi startsWith ile arayan
  bütün mükerrer yazım kapıları sessizce açıldı (ajan-nobetci: gorevEtiketiVarMi,
  `[alternatif:]`, `[onay:ek_oturum:]`). Kapılar hata vermedi — sadece hiçbir satırı
  bulamaz oldu. Kural: metnin başına yazan ortak bir katman eklendiğinde, o metni
  DESENLE arayan bütün yerler aynı turda taranır (grep startsWith); ortak geçitten
  geçen metinlerde startsWith değil includes kullanılır.
- DERS (21.08.2026) — DAİMİ PUSH YETKİSİ: kurucu her komutun sonunda push yetkisi
  verdi ("push et sorma"). İş bitip kayıt düşürülüp commit atıldıktan sonra
  `git push origin main` SORULMADAN yapılır; ayrıca onay beklenmez. Push hata
  verirse hata metni AYNEN, kısaltmadan ve yorumlamadan cevaba yazılır. Gerekçe:
  push edilmemiş commit yüzünden Lovable eski dosyayı görüp eski sürümü yayına
  aldı (15.08 ve 17.08), iki teşhis turu boşa gitti.
- KURAL (21.08.2026, kurucu kararı) — SUPABASE CLI YALNIZ OKUMA VE İNCELEME İÇİNDİR.
  CLI makineye kuruldu (v2.115.0, C:\Users\ASUS\tools\supabase) ama yetkisi dardır:
  yalnız canlı durumu okumak/incelemek için kullanılır. DEPLOY VE YAYIN LOVABLE'DAN
  YAPILIR (constitution m.12 v3.4 eklemesi: tek kapı Lovable). CLI ile edge fonksiyon
  deploy edilmez, migration/SQL çalıştırılmaz, proje link'lenmez, giriş yapılıp
  anahtar istenmez. akis_kurallari/politika satırları zaten Code tarafından yazılmaz.
- DERS (21.08.2026) — KURALIN GEREKÇESİNDE "KAPALI" YAZMASI ONU KAPATMAZ. akis_kurallari'nda
  ÜÇ satırın gerekçesinde "KAPALI" notu duruyordu ama etkin alanı true'ydu; koşucu yalnız
  etkin alanına bakıyor (akis-yurut/index.ts:657). Sonuç: belge_yuklendi__analiz açık
  kaldığı için belge yüklenince analiz zinciri, ön yüzdeki 30 saniyelik sayaçla birlikte
  İKİ KEZ koştu ve OpenAI bakiyesinden iki kat harcadı; foy_onaylandi__gonder açık kaldığı
  için föy hem "Yalnız onayla" düğmesinden hem kuraldan gidebilir hâldeydi. Ayrıca todo.md
  bunu İKİ kural diye kaydetmişti, canlıda SQL ile bakılınca ÜÇ çıktı — kural sayısı bile
  belgeden değil canlıdan okunur. Kural: bir kural kapatılırken `etkin` alanı ile gerekçe
  AYNI SQL'de değiştirilir; not ile alan ayrışırsa kural sessizce çalışmaya devam eder ve
  sessiz çalışan kural para ve mükerrer gönderim üretir. Denetim tek sorgudur: etkin=true
  olan hiçbir satırın gerekçesinde "KAPALI" geçmemeli.

- DERS (23.08.2026) — AYNI DOSYAYA İKİ FONKSİYON İKİ FARKLI YETKİ ÖLÇÜTÜYLE BAKARSA
  BİRİ SESSİZCE 403 DÖNER. bilirkisi-secim arabulucuyu üç yoldan tanıyor
  (admin / assigned_mediator_id / cases.user_id — index.ts:161-166), taraf-cevap
  yalnız assigned_mediator_id'den (index.ts:74-78). Aynı ekranda bir düğme
  çalışıp öteki "kaydedemedim" diyor ve kusur koda değil veriye benziyor.
  Kural: dosya yetkisi TEK ölçütle, ortak yardımcıdan sorulur; yeni bir kapı
  yazarken mevcut kapıların ölçütü grep'lenip aynısı kullanılır.
- DERS (23.08.2026) — AYNI İŞİ İKİ AD TAŞIYORSA KUSUR "ÇALIŞMIYOR" DİYE RAPOR EDİLİR.
  Aday yenileme bilirkişi panelinde "İkinci tur", sohbette ise "Yeniden öner"
  (ki o düğme talimat reddidir, bilirkişi koluna hiç bağlı değil). Kurucu
  sohbetteki düğmeye basıp "yeni aday üretmiyor" dedi. Kural: bir yetenek iki
  yüzeyde görünüyorsa adı da, bağlandığı adım da tek olur; ad birliği yapılmadan
  "kusur" teşhisi konmadan önce düğmenin hangi fonksiyonu çağırdığı okunur.

## 24.08.2026 — Lovable MCP `send_message` zaman aşımı (İKİNCİ KEZ)
`send_message` istemci tarafında 300 sn'de "failed" döndü; deploy SUNUCUDA
BAŞARILI olmuştu. `list_messages` ile doğrulandı ("create-video-room yeniden
deploy edildi"). **Zaman aşımı = başarısızlık DEĞİL.** Bir daha olursa: önce
`list_messages`, sonra karar. İşi tekrarlama — ikinci bir deploy tetiklersin.

## 24.08.2026 — Ortak yardımcıda birleştirme (merge) bayat veri taşır
`_shared/anlatim.ts` `yaz()` `last_output`'u ÜSTÜNE YAZMAZ, BİRLEŞTİRİR.
Bu bilerek böyle (başka fonksiyon aynı satıra `karsilastirma` yazıyor), ama
yeni koşumun yazmadığı anahtar (`eksik`) önceki koşumdan sağ kalıyor ve defter
kendi içinde çelişiyor. DERS: birleştiren bir yazıcıda, koşum başına ait
anahtarlar HER koşumda açıkça yazılmalı (yoksa temizlenmeli); "yazmazsam boş
kalır" varsayımı merge'de yanlıştır.

## 24.08.2026 — Bayat todo maddesi kod işi sanılmasın
"Harici araç yasağı iki ekranda da yazılı olmalı" maddesi açık duruyordu;
grep'le bakınca metin ZATEN iki ekranda da vardı. Bir maddeye başlamadan önce
işlevi grep'le (ad değil işlev — 16.08 dersi); yazılmış işi yeniden yazma.

## 24.08.2026 — "İş çok" durma sebebi değildir
Bayat anahtar kusurunu "36 fonksiyon fan-out ister" diye kuyruğa yazıp durdum.
§5'teki dört durma sebebinin hiçbiri değildi. İş alınınca içinden iki P1 çıktı
(onay satırı sohbete hiç düşmüyordu; ekran olmayan onayı olmuş gösteriyordu).
DERS: maliyet, önceliklendirme girdisidir — durma gerekçesi değil. Fan-out tek
Lovable mesajıyla 36 fonksiyonda bir turda bitti.

## 24.08.2026 — Bir kusuru kovalarken zincirin tamamına bak
"onay_bekliyor sohbete düşmüyor" tek satırlık bir sorgu kusuru sanılıyordu.
Zincir üç halkalıydı: sorgu satırı getirmiyor · sunucu getirilse de reddediyor ·
ekran reddi başarı sanıyor. Yalnız birincisi düzeltilseydi kullanıcı "onayladım"
diyecek, hiçbir şey olmayacaktı. DERS: bir satırı yüzeye çıkarmadan önce o
satırın EYLEM YOLUNU sonuna kadar (sunucu kapısı + ekran yanıtı) oku.

## 24.08.2026 — 200 ile dönen "hayır" yanıtı
Sunucu {onaylandi:false, sebep:...} yanıtını 200 ile dönebilir; bu hata değil
karardır. Ön yüz yalnız `error` alanına bakarsa reddi başarı sanar. DERS: bir
fonksiyonun "yapmadım" dalı varsa, çağıran o dalı AYRICA kontrol etmelidir.

## 24.08.2026 — cron "succeeded" fonksiyonun çalıştığı anlamına GELMEZ
`cron.job_run_details.status='succeeded'`, yalnız SQL'in başarıyla koştuğunu
söyler. `net.http_post` isteği KUYRUĞA ALIR ve hemen döner. Fonksiyonun gerçek
cevabı `net._http_response`tadır. `send-session-reminders` bu yüzden aylarca
"başarılı" görünürken her saat 401 dönüyordu ve hiçbir hatırlatma gitmedi.
DERS: bir cron'u doğrularken `job_run_details`e DEĞİL, `net._http_response`
status_code'una bak.

## 24.08.2026 — İki cron aynı fonksiyon ailesine iki farklı başlıkla gidiyorsa biri ölüdür
jobid 3 `x-cron-secret` gönderiyor ve çalışıyor; jobid 1 yalnız `Authorization`
gönderiyor ve 401 alıyor. Doğru kalıp aynı veritabanında zaten vardı.
DERS: bir uç nokta 401 veriyorsa, önce AYNI kapıdan geçen çalışan bir çağrıyı
bul ve iki isteğin başlıklarını karşılaştır.

## 24.08.2026 — Yeşil tezgâh kanıt değildir; düşen tezgâh kanıttır

`kayit-protokolu-tek-kaynak.test.ts` ilk yazımda sabitin yeniden tanımlanmasını
şu desenle arıyordu:

```ts
.not.toMatch(new RegExp(`const\s+${ad}\s*=`));   // ŞABLON DİZESİ İÇİNDE
```

Şablon dizesinde `\s` tanınmayan bir kaçıştır ve **sadece `s`**'ye indirgenir.
Desen sessizce `consts+KAYIT_ONAY_SAATs*=` oluyor ve hiçbir zaman eşleşmiyor.
Test yeşil yanıyordu ama denetlediği kusuru **kaçırıyordu**.

NASIL YAKALANDI: kusur (ikizlenme) `git stash` ile geri getirilip koşuldu.
Diğer üç test düştü, bu test GEÇTİ. Geçmemesi gerekiyordu — kusurun kendisi
oradaydı. Fark buradan çıktı.

KURAL: Bir tezgâh "geçti" demeden önce, **kusur geri getirildiğinde düştüğü
görülmelidir.** Bu oturumda üç tezgâhın üçü de böyle sınandı:
- `girdi-tamamla-eksik-alan.test.ts` → düzeltme geri alındı, 1 test düştü ✓
- `ZORUNLU_GIRDI` bölümü → düzeltme geri alındı, 3 test düştü ✓
- `kayit-protokolu-tek-kaynak.test.ts` → ikizlenme geri getirildi, 3 test düştü
  ama 4. test geçti → **tezgâh kusuru bulundu**, düzeltildi, sonra 4/4 düştü ✓

YAN KURAL: kaynak dosyada desen aramak için regex şart değil. Kesin dize
(`includes`) hem okunur hem de kaçış tuzağı taşımaz. Regex ancak gerçekten
gerekliyse kullanılır ve o zaman `String.raw` ya da düz dize tercih edilir.

## 24.08.2026 — Birim tezgâhı şemayı doğrular, veriyi doğrulamaz

`send-session-reminders` düzeltilirken alıcı adresi `profiles.email`e bağlandı.
Tezgâh yeşildi, tipler doğruydu, sorgu geçerliydi. Ama canlı veri şunu dedi:

```
select count(*) filter (where user_id is not null) from case_parties  -->  3 / 12
```

Taraflar **kayıt olmadan** token bağlantısıyla katılıyor (`/katilim/:token`);
adresleri `case_parties.email`de. Yani düzeltme, yetkiyi ve tabloyu onardıktan
sonra bile neredeyse hiçbir tarafa e-posta göndermeyecekti.

KURAL: "kim alacak / hangi adrese gidecek / hangi alan dolu" kararları kod
yazılmadan ÖNCE canlı dağılıma sorulur:
`select count(*) filter (where <alan> is not null), count(*) from <tablo>`
Şemada sütunun var olması, canlıda dolu olduğu anlamına GELMEZ.

İLGİLİ: aynı oturumda `closed_at` de böyleydi — sütun vardı, tetikleyici vardı,
ama onu dolduran yol hiç işlemiyordu.

## 24.08.2026 — Bir kusur sınıfı düzeltilince ÖTEKİ GEÇİTLERİ de tara

23.08'de `akis-yurut/hata-metni.ts` ile şu çözüldü: insana giden metnin tamamı
sınır süzgecinden geçirilince, süzgeç eleyince metnin KODLA ÜRETİLEN kısmı da
kayboluyor. Çözüm metni ikiye ayırmaktı: kod üretimi başlık süzgece girmez,
serbest metin girer.

Ama aynı kalıp `_shared/anlatim.ts` içindeki `anaAjanaBildir` geçidinde de
vardı ve orası ATLANMIŞTI. 24.08'de canlıda göründü: nöbetçinin yazdığı iki
satır da yalnız yedek cümleye inmişti, iş etiketi silinmişti.

Etiketin silinmesi kozmetik değildi: `gorevEtiketiVarMi` mükerrer yazım kapısını
o etiketle kurar. Etiket yoksa kapı boş kümeye bakar ve nöbetçi aynı görevi her
turda yeniden açabilir. 21.08'de bu kapı `startsWith → includes` ile
"onarılmıştı" — belirti düzeltilmiş, sebep görülmemişti.

KURAL: bir kusuru düzeltirken "bu kalıp başka nerede var?" diye ara. Somut
arama: düzeltilen işlevin ADIYLA değil, KUSURUN KALIBIYLA grep at
(burada: `sinirdanGecir(` çağıran her yer).

## 24.08.2026 — "Bu işi yapan bir kol zaten var mı?" sorusu KOD YAZMADAN ÖNCE sorulur

Oturum hatırlatması dört turda çözüldü. Üçüncü turda `send-session-reminders`i
doğru tabloya bağlayıp alıcı çözümünü yazdım. Dördüncü turda ortaya çıktı ki
ürünün ZATEN çalışan bir hatırlatma kolu vardı: `ajan-nobetci` →
`oturumHatirlatmaGorevleriAc` + `oturumHatirlatmaYurut`. Türkçe yazıyor,
adresi doğru yerden alıyor, iletişim tercihini uyguluyor, imza ekliyor.

Yazdığım şey kopyaydı. Dahası ZARARLIYDI: aynı `gorev_tipi` ve etiketi yazdığı
için nöbetçinin mükerrer yazım kapısını tetikleyip DOĞRU kolu susturacaktı.

KURAL: bir yetenek eklemeden önce "bu işi yapan bir kol zaten var mı?" diye ara.
Somut arama: işin ADIYLA değil, İŞİN KENDİSİYLE grep at —
`grep -rn "hatirlatma\|reminder" supabase/functions/ --include=*.ts -l`
Tek bir dosyanın adına bakıp "demek ki burası" deme; o dosya terk edilmiş
olabilir (nitekim öyleydi).

İKİNCİ KURAL: kopyayı kaldırırken de ölç. Kopyayı kaldırdığımda ortak oturumda
karşı taraf hatırlatma alamayacaktı, çünkü nöbetçi yalnız `participants`e
gönderiyor ve oraya tek taraf yazılıyor. Kaldırma da bir değişikliktir ve
kanıt ister.

## 24.08.2026 — Sırasız `limit` bir kapıyı ÖLÇEKTE körleştirir

`gorevEtiketiVarMi` mükerrer yazım kapısını şöyle kuruyordu:

```ts
.eq("case_id", caseId).eq("gorev_tipi", gorevTipi).limit(200)   // ORDER BY YOK
```

Postgres sırasız bir sorguda hangi 200 satırı döndüreceğini **garanti etmez**.
Bir dosyada aynı tipten 200'den çok satır birikince kapı yeni satırları hiç
görmez ve her turda bir tane daha yazar. Kendini besleyen döngü: yazdıkça
körleşir, körleştikçe daha çok yazar. Canlıda 411 satıra çıkmıştı.

İKİ KURAL:
1. `limit` kullanan her "var mı?" sorgusu ya **sunucu tarafında filtrelenmeli**
   (`.like`/`.eq`), ya da en azından **sıralanmalı**. Sırasız `limit` bir
   varlık kontrolü için yanlış araçtır.
2. Bir kusuru düzelttikten sonra **birikmiş sonucuna** da bak. Etiket silinmesi
   kusurunu düzeltmek yetmedi; onun ürettiği 349 çöp satır kapıyı zaten
   boğmuştu. "Kod düzeldi" ile "canlı düzeldi" ayrı şeylerdir.

## 24.08.2026 — Bir "sözleşme değişikliği" bütün okuyucuları kırar; hepsini tara

`anaAjanaBildir` geçidi 21.08 11:06'da `gerekce`nin başına `[kaynak:…]` koymaya
başladı. Bu tek satırlık değişiklik, gerekçeyi okuyan HER yeri sessizce kırdı.
Canlı sayım: geçitten sonra yazılan 421 görevin hepsi ön eki taşıyor.

Kırılanlar (dört ayrı taramada bulundu, her tarama bir öncekinin kaçırdığını):
1. `akis-yurut` hata metni (23.08'de düzeltildi)
2. `anaAjanaBildir` ve `eksigiSor` — etiketi süzgeç yiyordu
3. Nöbetçi: `oturumHatirlatmaYurut` · `asamaGecisiYurut` · `teklifDegerlendirYurut`
   — üçü de `^` ile çapalı
4. Ön yüz: `CaseRoom` "Ajanım" paneli (tarafa iç etiket + ham UUID gösteriyordu)
   ve `AjanPenceresi` zaman çizelgesi (aşama geçişleri sessizce kayboluyordu)

KURAL: paylaşılan bir alanın BİÇİMİNİ değiştiriyorsan (ön ek, ayraç, sıra),
o alanı OKUYAN her yeri aynı turda tara. Somut arama, alanın adıyla:
`grep -rn "gerekce" src/ supabase/functions/ | grep -E "exec\(|match\(|startsWith|replace\(|slice\("`
Yazan tarafı düzeltmek yetmez; sözleşmenin iki ucu vardır.

İKİNCİ KURAL: çapalı desen (`/^\[…\]/`) paylaşılan bir alanda kırılgandır.
Etiket metnin İÇİNDE aranmalı. Bu oturumda aynı hata altı ayrı yerde çıktı.

## 24.08.2026 — RLS'i değiştirmeden önce, o yetkiyi KİMİN kullandığını oku

`is_case_owner_safe`e "sahip aynı zamanda tarafsa yetki verme" koşulunu ekledim.
Gerekçem sağlamdı (34 politika bunu arabulucu yetkisi sayıyor, taraf olan sahip
karşı tarafın verisini görürdü) ve canlı ölçümüm de "etkilenen dosya 0" diyordu.

Ama eksik ölçmüştüm. `MediationEngine.tsx:4101`:
```ts
user_id: !isMediator && parties.length === 0 ? userId : null
```
Self-servis başvuruda ilk taraf, dosyayı açanın kendi `user_id`si ile yazılıyor.
Yani o akışta sahip **her zaman** taraftır ve düzeltmem başvurucuyu kendi
dosyasından kilitlerdi. Geri aldım.

"Etkilenen satır 0" ölçümü YETMEDİ, çünkü o akış henüz hiç kullanılmamıştı.
Mevcut VERİ, gelecekteki AKIŞI anlatmaz.

KURAL: bir yetki denetimini (RLS, politika, guard) daraltmadan önce iki şeyi
birden oku:
1. O yetkiyi bugün kim kullanıyor (canlı veri), ve
2. O yetkiyi hangi KOD YOLU üretiyor (yazan tarafı).
İkincisi olmadan "kimse etkilenmiyor" demek yanıltıcıdır.

İLGİLİ: aynı oturumda "tezgâh şemayı doğrular, veriyi doğrulamaz" dersi vardı.
Bu onun aynası: "canlı veri bugünü doğrular, akışı doğrulamaz."

## 24.08.2026 — Aynı kuralın VERİTABANI ve STORAGE yüzleri ayrı ayrı yazılır

`case_documents` tablosunun RLS politikası taraf için `uploaded_by = auth.uid()`
diyor; adı bile "Party sees own uploads only". Ama dosyanın kendisi Storage'da
duruyor ve `case-documents` kovasının okuma politikası `can_access_case(...)`
kullanıyordu — o fonksiyon dosyanın HER tarafına izin verir.

Sonuç: satırı gizlenen belgenin dosyası karşı tarafça indirilebiliyordu.
Kodun kendi yorumu (`CaseRoom.tsx:327`) bile kapsamın dar olduğunu sanıyordu.

KURAL: bir gizlilik kuralı hem tabloda hem kovada geçerli olmalıdır. Tablo
politikasını yazmak YETMEZ; dosya ayrı bir yetki sistemindedir.
Denetim sorgusu:
```sql
select p.polname, pg_get_expr(p.polqual, p.polrelid)
from pg_policy p join pg_class c on c.oid=p.polrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='storage' and c.relname='objects';
```
Ve `can_access_case` gibi "erişebilir mi" yardımcıları GENİŞTİR — dosya
düzeyinde kullanılırsa kör veriyi kırar. Dar kural için dar yardımcı gerekir
(`is_case_mediator`, `uploaded_by` eşleşmesi).

## 24.08.2026 — Koruma tezgâhında KAPSAM, geçme durumundan önemlidir

`privacy-leak-suite` ürünün kör veri vaadini koruyor ve bugüne kadar hep yeşildi.
Yine de gerçek bir sızıntıyı kaçırdı: `case-documents` kovasının okuma politikası
veritabanındakinden genişti (ölçülen sızıntı 1 çift).

Sebep basit: tezgâh o yüzeyi HİÇ YOKLAMIYORDU.
- Yalnız 3 tablo kapsamdaydı; hepsi sahipliği kullanıcı kimliğiyle tutuyordu.
- Sahipliği `party_id` ile tutan tablolar (KÖR TEKLİF dahil) kapsam dışıydı.
- DEPO hiç yoklanmıyordu — dosya ayrı bir yetki sistemindedir.

KURAL: bir koruma tezgâhını değerlendirirken "geçiyor mu?" değil, **"neyi
yokluyor?"** diye sor. Somut yöntem:
1. Korunan vaadin yüzeylerini SAY (tablo, kova, uç nokta).
2. Tezgâhın kapsadıklarını say.
3. Farkı kapat, sonra her yüzey için ayrı bir **kapsam bekçisi** testi yaz —
   biri düşerse sessizce korumasız kalmasın.

Kapsam genişletmesi kanıtlandı: kapsam geri daraltılınca 8+ test düşüyor.

## 24.08.2026 — Bir koruma ekranı, izinli tek kitlesi için yanlış sonuç veriyorsa kırıktır

Gizlilik Test Paketi ekranı "Taraf A, Taraf B'nin verisini okuyamıyor mu?"
sorusunu yanıtlamak için var. İki şey aynı anda doğruydu:
- Sayfa YALNIZ yöneticiye açıktı.
- Yönetici RLS'i tasarım gereği aşar → her yoklama "sızıntı" görür.

Canlıda koşturdum: 12 yoklama, **Geçti 5 / Başarısız 7** — yedisi de yanlış
alarm. Ekran yıllardır kırmızı yanıyordu, yani gerçek bir sızıntı eklense
kimse fark etmezdi. Nitekim aynı gün bulunan gerçek storage sızıntısı da fark
edilmemişti.

İKİ KURAL:
1. Bir koruma aracını, **izin verdiği kitleyle** birlikte değerlendir. "Kim
   koşacak?" sorusunun cevabı aracın sonucunu anlamsız kılıyorsa araç kırıktır.
2. Yanlış alarm üreten bir gösterge, hiç gösterge olmamasından **daha
   kötüdür**: gerçek alarmı gizler. Ölçüm anlamsızsa "başarısız" değil
   **"belirsiz"** de ve sebebini yaz.

Somut kontrol: bir tezgâh/ekran eklerken sor — "bu, geçmesi gereken durumda
gerçekten geçiyor mu?" Yalnız "düşmesi gereken durumda düşüyor mu?" yetmez.
