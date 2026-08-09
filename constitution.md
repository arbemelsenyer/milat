MediPact Constitution — v3.4 · 9 Ağustos 2026
(v3.3 üzerine SALT EKLEME. Madde eklenmedi, çıkarılmadı. Mimari v0.35 · Komut rev.12 · Yol Haritası r5 ile hizalı.)

v3.4'te eklenenler:
- m.2 · Kalite elemesine takılan bulguların da çalışma defterine iz bırakması
- m.2 · Raporun kendi dayanak zayıflığını başında bildirmesi (dürüstlük bandı)
- m.12 · Deploy ve yayının tek kapıdan (Lovable) yapılması kuralı
- m.12 · Yapay zekâ çıktı kalitesi disiplini: prompt değil, şema + sunucu tarafı eleme

NOT: Aşağıdaki gövde metni, 05.08 tarihli taranmış PDF'ten çıkarılmıştır; tarama kaynaklı
küçük harf/boşluk hataları asıl Word dosyasında bulunmayabilir. Yeni eklemeler [v3.4] ile işaretlidir.

--------------------------------------------------------------------------------

MediPact Constitution — v3.3 5 Ağustos 2026 · v3.2 üzerine
3 Ağustos Anlaşma Belgesi Denetçisi kararının cümleleri geri
işlendi (sürüm çatallanması onarımı) Not: Bu sürüm, 29.07
tarihli taranmış PDF'in OCR metni üzerine 3–4 Ağustos
eklemeleri işlenerek üretilmiştir. Mevcut metin
değiştirilmemiştir; tarama kaynaklı küçük harf hataları asıl
Word dosyanızda bulunmayabilir. MediPact AI —
Constitution (Değişmez İlkeler) Proje adı: MediPact AI Proje
sahibi: Emel Şenyer Sürüm: v2.9 29 Temmuz 2026 (v1'in 8
maddesi korunarak; mimari v0.29 ile hizalandı. Bu sürümde
yeni madde eklenmedi; m.10'a saklama-imha verıza ilkeleri
eklendi.) Bu dosya her oturumda, her değişiklikte geçerlidir.
Bir talep bu ilkelerle çelişiyorsa uygulanmaz; önce ilke
tartışılır, sonra kod yazılır. Ajan (yazılım ajanı / geliştirme
ortamı / diğer) bu dosyayı her görevden önce okur. Okuma
sırası: bu dosya > komut (kurucunun niyeti) > mimari (spec)
> yol haritası (nerede kaldık).
1. Gizlilik birinci ilkedir (kör veri) Arabuluculuk hukuken gizlilikle bağlıdır (HUAK m.4). MediPact'te bu bir
uyum maddesi değil, mimarinin kurucu ilkesidir. Ürünün en önemli özelliği budur. · Karşı taraf, diğer
tarafın verisini hiçbir koşulda göremez. · Arabulucuya özel içgörüler (kök neden analizi / Karanlık Oda /
gizli taraf analizi) yalnızca arabulucuda kalır; taraf kendi satırını dahi göremez. · Tarafself-servis
ekranları yalnızca o tarafın kendi verisini gösterir. · Bir arabulucu başka bir arabulucunun dosyasını
göremez (çok kiracılılık). * Yetkisınırı veritabanında kurulur: RLS * dar kapsamlı RPC. Ul'da gizlemek
yetki değildir. · Yetkidosyakapsamlıdır (assigned mediator id) /(case owner)/(is case party). "Sistemde
arabulucu rolü var" yetki sebebi değildir. · Kurumsal aşamada: kurum üyeliği tek başına dosya erişimi
vermez; erişim dosya bazlı, süreli ve geri alınabilir verilir. · Veri hiçbirottak ağa, paylaşımlı deftere, dış
protokole veya üçüncü tarafın sistemine çıkmaz; het şey sistemin kendi içinde kalır. · Builkeher
yüzeyde aynıdır — mobil dahil. Mobil, ayrı bir veri yolu veya gevşetilmiş bir yetki modeli açamaz. Anlık
bildirimler yalnızca olay başlığı taşır ("Analiz tamamlandı"); analiz içeriği, taraf verisi veya tutar bildirime
asla yazılmaz — kilit ekranında görünen metin de kör veri ilkesine tabidir. · Oturum kaydı, transktipt ve
iletişim analizi de bu ilkeye tabidir. Görüşme kaydı ancak tüm tarafların açık ve kayda geçmiş rızasıyla
alınır; kayıt ve metne dökümü dosya-kapsamlı saklanır, sistem dışına çıkmaz. Bir tarafın iletişim deseni,
kaçındığı konu veya kendi içindeki tutarsızlığı yalnızca arabulucuya götünür; karşı tarafa hiçbir
yüzeyden gösterilemez. Taraf, yalnızca kendi eksiğini düzeltme daveti olarak görebilir. · OÖlçümveistatistik yüzeyleri de bu ilkeye tabidir: kazanım sayacı, kapanış istatistiği ve benzeri sayaçlar
yalnız süre/işlem tipi gibi kimliksiz alanlar tutar; dosya içeriği, taraf adı veya tutar sayaç kaydına girmez.
· Yeni bir özellik önerildiğinde ilk soru şudur: bu, kör veri ilkesini deler mi? · Bir ajan erişimi genişleten
bir policy önerirse: geri al, en dar erişimle yeniden yaz. · Ajan çalışma defteri (rapora giren ve girmeyen
değerlendirmeler) yalnız arabulucu ve yöneticiye görünür; taraflar hiçbir yoldan okuyamaz. · Taraflar,
yalnız arabulucunun görebileceği gizli belge yükleyebilir. Gizli belge karşı tarafa hiçbir ekrandan,
rapordan veya sentez çıktısından açılamaz; ortak zemin sentezi gizli belgeden edindiği bilgiyi ancak
kaynağını belli etmeyen, anonim düzeyde kullanabilir. · Gizlilik yalnız arayüzde değil, veritabanı satır
düzeyinde uygulanır: bir taraf, karşı tarafın kaydını sorgu düzeyinde dahi göremez. · Hiçbir taraf tek
başına süreç sonucunu belirleyemez: onay ve kabul durumları, her tarafın yalnız kendi adına yaptığı
işlemlerden sunucu tarafında türetilir. · Mevzuat radarı bildirimleri yalnız olay başlığı taşır; kiracı
kütüphanesi ve uyarı profili kiracı kapsamlıdır. · Anlaşma belgesi denetçi raporu (kural taraması) yalnız
arabulucuya görünür; bulgular taraflara hiçbir yüzeyden açılmaz. · Dosya içi soru-cevap yüzeyi
(Dosyaya Soru Sor / Çalışma Kanalı) yalnız görevli arabulucuya görünür; taraflara hiçbir sürümde
açılmaz, bağlamı başka dosyadan veri çekemez ve sorgu-cevap izi denetim izine yalnız özet olarak
düşer. · Bir tarafın (şirketin) sisteme yüklediği kendi uyuşmazlık geçmişi ve portföy verisi, yalnız o
tarafın taraf olduğu ve benzer konulu dosyalarda analiz girdisi olabilir; karşı tarafa, başka bir kuruma
veya başka bir dosyaya hiçbir yüzeyden açılmaz. Başka arabuluculuk dosyalarının içeriği hiçbir analiz
için kaynak değildir.
2. Halüsinasyon yasağı · Veriyetersizsedoğru cevap **"Yeterli veri yok"**tur. · Heratıf yüklü kaynağa
izlenebilir olmalıdır. Uydurma Yargıtay E./K. künyesi ürün için kırmızı çizgidir; künye temizleyici her Al
çıktı yolunda devrededir. · Belgeyoksaboşkalır; "belgede şöyle yazıyor" denmez. · Dosyada açıkça yer
almayan hiçbir kronolojik olay veya iddia varsayılamaz; zaman çizelgesindeki her nokta bir kayda
bağlıdır. · Rapor kendi kaynağını gösterebilmelidir (camdan kutu, kara kutu değil). · Psikolojik/çıkar
çıkarımlarında (kök neden vb.) kesin hüküm dili kurulmaz; "işaret ediyor" * görünür dayanak * güven
rozeti zorunludur. ». Teşhisdili yasaktır. İletişim, davranış ve tutarlılık analizlerinde kişilik teşhisi, niyet
atfı veya "doğru söylemiyor" türü hüküm cümlesi kurulmaz. Çıktı yalnızca gözlem * dayanak * güven
rozetidir ("şu konu üç kez soruldu, üçünde de cevap verilmedi"). Yorum arabulucuya aittir. · Dışbilgi
kaynaklarından gelen kayıtlar da doğrulanmadan havuza girmez: künyesi teyit edilmemiş
içtihat/mevzuat kaydı bilgi tabanına yazılmaz, doğrulanmamış toplu veri yüklemesi yapılmaz. · Analiz,
dayanağı olmayan boşluğu tahminle doldurmaz; değerlendirip rapora almadığı hususları gerekçesi ve
önerilen adımıyla çalışma defterine kaydeder ("bilmiyorum ama şunu isteyin" ilkesi).

[v3.4 EKLEME] · Kalite elemesine takılan bulgular da sessizce kaybolmaz: sunucu tarafında elenen
her bulgu, hangi kurala takıldığıyla birlikte çalışma defterine iz bırakır. Analizin neyi
değerlendirmediği de izlenebilir olmalıdır. · Bir rapor, dayanağı zayıf hususlar üzerine
kuruluysa bunu kendi başında açıkça söyler; arabulucu raporun sınırını raporu okumadan önce
görür. Bu bilgi yalnız arabulucuya gösterilir, tarafa hiçbir yüzeyden açılmaz.

 · Her analiz çıktısı kaynağına kadar izlenebilirdir: dayanak gösterilemeyen bulgu rapora giremez; kaynak
kartı, atıf yapılan sayfayı hedefler. · İçtihat olay özetlerinden üretilen emsal kartları da aynı doğrulama
kapısından geçer: künyesi teyit edilmeden ve küratör (kurucu) onayı alınmadan hiçbir emsal kaydı
havuza yazılmaz. · Mevzuat radarının çıktısı uyarıdır: sistem mevzuatı yorumlamaz, tavsiye vermez;
özet kaynak metnin yerine geçmez; yürürlük etiketi olmayan kayıt panele giremez. · Anlaşma belgesi
denetçisinin her bulgusu, dayanağı gösterilen bir kurala bağlıdır (yürürlükteki mevzuat veya künyesi
doğrulanmış iptal içtihadı); dayanaksız kural yazılamaz, dayanağı değişen kural yalnız işaretlenir. · Serbest soru-cevap (Dosyaya Soru Sor) da aynı disipline tabidir: cevap yalnız dosyada kayıtlı veriden
üretilir, her cevap dayandığı belgeyi/kaydı gösterir, veri yoksa cevap "Yeterli veri yok"tur ve mümkünse
hangi belge gelirse cevaplanabileceği söylenir; künye temizleyici bu yüzeyde de devrededir.
3. Manuel her zaman kazanır AI önerir, insan karar verir. Arabulucunun elle girdiği/düzelttiği değer,
otomatik tespitin üzerine yazılmaz. Sonuç kartları "Açıkla / Düzelt / Gördüm" mantığıyla biter —
"Onayla" değil, çünkü bu bir analizdir, hukuki tespit değil. · Mevzuat radarı uyarısı hiçbir şablonu, kuralı
veya parametreyi otomatik değiştirmez — değişikliği her zaman insan uygular. · Püf nokta kaydı
insanındır: yapay zekâ yalnız taslak önerebilir; dosyayı çözen kilit hamlenin kaydı her zaman
arabulucunun elinden çıkar. · Anlaşma belgesi denetçi raporu uyarıdır: hiçbir belgeyi otomatik
değiştirmez; düzeltmeyi her zaman arabulucu uygular.
4. Tarafsızlık Sistem tarafları bir sonuca zorlamaz. Arabulucunun tarafsızlık yükümlülüğü ürün diline de
yansır: "şurakamda anlaşmalılar" değil, "şu aralık ve dayanağı". Bu bir prompt tercihi değil, çıktı
denetim kuralıdır. Taraf dilindeki manipülatif unsurlar (duygusal ajitasyon, abartı, suçlama tonu) analiz
raporlarına taşınmaz; rapor dili nötr ve olgu temellidir. Süzülen vurgu yok sayılmaz — kök neden
analizine sinyal olarak, yalnızca arabulucuya görünür biçimde işaretlenir.
5. Yapay zekâ resmi belge ve bilirkişi raporu üretmez · Kayıt katmanı (belge üretimi, ücret hesabı, föy,
ödeme defteri) deterministiktir — bu katmanda Al yoktur. Model analiz üretir, hukuki belge üretmez. · Resmibelgeler (tutanaklar, anlaşma belgesi, UDF) şablondan, sistemdeki kayıtlı verilerle üretilir. İlke:
bilgi bir kere girilir, belgeye kendiliğinden geçer — sistemde yazılı hiçbir şey belgeye elle bir daha
yazılmaz. Doldurma mototu tektir. · Otomatikdoldurma kilitli belge üretmez: her belge arabulucuya
düzenlenebilir taslak olarak sunulur; kayıt öncesi ve sonrası serbestçe düzeltilebilir. Yeniden üretim, elle
yapılmış düzeltmeleri sessizce ezemez. AI belgeye dokunamaz; insan her zaman dokunabilir (m.3'ün
belge karşılığı). · Şablon seçimi ve blok bileşimi kural tabanlıdır (gövde * blok modeli): AI şablon
seçemez ve şablon metnine dokunamaz; AI yalnızca uyuşmazlık türünü önerir, arabulucu onaylar veya
manuel düzeltir, motor kural tablosundan doğru blokları çeker. Şablon metinlerini yalnızca
arabulucu/yönetici düzenler. · Albilirkişiraporu üretmez — rapor hukuken delildir ve sorumluluk
doğurur. AI yalnızca uzmana sorulacak soruyu ve çerçeveyi hazırlar; raporu sistemde tanımlı gerçek
bilirkişi yazar. · Anlaşmaşartları yalnızca Anlaşma Belgesi'nde yer alır; Son Tutanak'a sızamaz (HUAK
m.17/18 ayrımı).
6. Ajan hesap verebilirliği Sistemdeki her yapay zekâ ajanının tanımlı bir kimliği, açıkça yazılmış bir
erişim kapsamı (G11owed scopes)) ve kimin yetkisiyle çalıştığını gösteren bir kaydı olmak zorundadır.
Hiçbir ajan varsayılan olarak yazma yetkisine sahip değildir ((can write - false). Ajanların dosya
üzerindeki her eylemi, sonradan değiştirilemeyen (append-only, hash zincirli) bir denetim izine yazılır;
bu iz içeriği değil, eylemin özetini tutar — ikinci bir gizli veri deposuna dönüşemez. Yeni bir ajan, ajan
sözleşmesi (girdi * çıktı şeması - gizlilik sınıfı "yetki kapsamı hata davranışı * denetim kaydı)
doldurulmadan yazılmaz. · Her analiz koşumu, çalışma defterine iki katman yazar: rapora giren bulgular
ve gerekçesiyle rapora girmeyen değerlendirmeler. Defter, denetim izinin parçasıdır.
7. Tek çekirdek ilkesi · Aşamalar (arabulucular > niş dikeyler > kurumsal > şahıslar) ayrı ürünler değil,
aynı çekirdeğe takılan katmanlardır. Hiçbir aşama için sistem baştan yazılmaz. · Hernişdikey takılıp
çıkarılan bir pakettir; dosya hangi alandansa yalnız o paket aktifleşir. Tüm dikeylerin tek üründe
toplanması yasaktır — hantallaşma kurucunun açık vetosudur. · Webvemobilaynı çekirdeğin iki
yüzüdür; alt katman üst katmana bağımlı olamaz. · Arabulucu heraşamada zorunlu kapıdır. Kurumsal
ve bireysel başvurular uzman arabulucu eşleştirmesine akar; süreç her zaman bir arabulucunun
yönetiminde yürür. Ürün arabulucuyu ikame etmez, arabulucuya dosya taşır. Başvuru verisi, arabulucu
atanana kadar hiçbir arabulucuya görünmez. · İlkeler teknolojiden bağımsızdır. Ürün bugünkü araçlarla
da, sıfırdan başka bir altyapıyla da kurulabilir; bu anayasa her altyapıda aynen geçerlidir. Bir altyapı bu
ilkeleri (özellikle veritabanı katmanında dosyakapsamlı yetki zorlamasını ve deterministik belge
motorunu) sağlayamıyorsa, gevşetilecek olan ilke değil, değiştirilecek olan altyapıdır. · Coğrafyadabuilkeyi bozmaz: ürün başka bir hukuk düzenine veya sınır ötesi bir uyuşmazlığa açıldığında
değişen, alanın kural katmanıdır — çekirdek, gizlilik modeli ve belge motoru aynı kalır.
8. Çalışan kritik yollar temizlik için refactor edilmez Özellikle belge üretimi. Kod tekrarı, çalışan bir yolu
bozma riskinden iyidir. Belge üretimine dokunan değişiklik tek başına ship edilir ve canlı test edilir, asla
başka işlerle paketlenmez.
9. Kırıntı bırakılmaz Her iş kapanırken açık uç kalmaz; kalıyorsa backlog'a yazılır. Yarım kalan madde
"unutulmuş" sayılmaz, kayıtlıdır. Bir özellik ancak beş kriteri birden sağlayınca "bitti" sayılır: gizlilik -
camdan kutu - insan üstünlüğü canlı test (kurucunun gözüyle) - kırıntı yok.
10. Veri disiplini · Modeleğitimiiçin ham gerçek dosya kullanılmaz. Gerçek dosya verisi bir modele
gömülütse, ürünün kendi gizlilik vaadi çöker. · Kullanılabilir yol: anonimleştirilmiş (isim/TC/adres
arındırılmış) yapısal veri; RAG'de referans örnek olarak, model eğitiminde değil. * Hangidişmodel
sağlayıcısı kullanılırsa kullanılsın, sağlayıcının veriyi kendi eğitiminde kullanmaması sözleşmesel şarttır. · oSorguanonimliği: Dış bilgi kaynaklarına (içtihat/mevzuat sağlayıcıları dahil) yapılan sorgular dosya
içeriği, taraf adı veya kimlik bilgisi taşımaz — sorgu, kimliksiz ve soyut bir hukuki soru olarak gider.
Sistem hiçbir dış sağlayıcıya kilitlenmez; sağlayıcı değişse de ürün çalışır. · oVektör/bilgitabanında her
dosya, dosya-kapsamlı izole tutulur; dosyalar arası içerik sızıntısı olamaz (anonim yapısal istatistik
bunun istisnasıdır). · Süresizsaklama yoktur. Her veri tipinin tanımlı bir saklama süresi, hukuki dayanağı
ve süre sonunda otomatik imha davranışı vardır; süreler koda gömülmez, yürürlük tarihiyle parametre
olarak tutulur. İmha yedeklerde ve vektör tabanında da uygulanır. Amacı gerçekleşen veri, süresi
dolmadan da tutulmaz — oturum kaydının ses/görüntü hâli, metne döküldükten sonra saklanmaz. *
Rızahizmetinşartıdeğildir. Oturum kaydı gibi açık rıza gerektiren işlemlerde rıza; belirli, bilgilendirmeye
dayalı, tek konuya özgü ve her an geri alınabilir biçimde, ayrı bir olay olarak alınır ve kaydedilir. Genel
bir onay metnine gömülemez, hizmetin kullanım koşuluna bağlanamaz. Rıza verilmezse süreç aynen
yürüt; yalnız o işlem yapılmaz. · Kişisel veriler bakımından veri sorumlusu arabulucudur; ürün veri
işleyen konumundadır. Ürünün görevi, arabulucunun aydınlatma, rıza ve imha yükümlülüklerini yerine
getirebileceği yüzeyleri ve kanıtı sağlamaktır. · Sıra'ürün-— kullanıcı- veri > model. Model ilk adım
değildir. · Taraf geçmişi profillemesi yalnız kurumsal taraflar için ve iki kaynakla yapılır: kamuya açık,
künyesi doğrulanmış yargı kararları ve tarafın kendi rızasıyla yüklediği kendi verisi. Gerçek kişiler
profillenmez; kamu kararlarındaki gerçek kişi adları profile yazılmaz.
11. Dış ürün adları geçmez Mimari, komut, constitution ve ürün yüzeylerinde dış ürün/marka adları
kullanılmaz. Her yetenek MediPact'in kendi gereksinimi olarak yazılır. Güvenlik taramaları asla
canlı/üretim sistemine karşı çalıştırılmaz. Kapsam (v2.7 açıklaması): Bu yasak ürün yeteneklerinin
adlandırılmasına ilişkindir — hiçbir MediPact özelliği bir dış ürünün adıyla tarif edilemez. Mevcut yığın
envanteri (mimari §4.2) ve aşağıdaki m.12 bunun bilinçli istisnasıdır: oradaki adlar bir yetenek tanımı
değil, bugünkü kurulumun kaydıdır ve yığın değişince yeniden yazılır.
12. Operasyon kuralları (mevcut yığına özgü — ihlali sistemi kırar) Bu madde bugünkü araç setine
bağlıdır. Yığın değişirse bu maddenin eşdeğerleri yeni araç setine göre yeniden yazılır; diğer 11 madde
hiçbir yığın değişikliğinden etkilenmez. · oMigration'laridempotent yazılır (IF NoT EXIsTs)), SOL
Editor'den çalıştırılır (CLI yetki nedeniyle kapalı). * |supabase/functions)altını değiştiren het push'tan
sonra Lovable'a tedeploy ettirilir veya fonksiyonun dashboard'daki sürüm tarihi doğrulanır. Aksi halde
canlı fonksiyon eski kalır ve test yanıltır. · Lovable'averilen komutlar 4 DOKUNMA KURALLARI başlığıyla
stabil kodu korur. · Yerel dev sunucu yok; test canlı yapılır.

[v3.4 EKLEME] · Edge fonksiyonlarının deploy'u ve uygulamanın yayınlanması yalnız Lovable
üzerinden yapılır; proje Lovable Cloud ile yönetildiğinden dışarıdan (komut satırından) deploy
yetkisi yoktur. Veritabanı paneline erişim ayrıca vardır, ancak SQL göçleri yine Lovable
içindeki SQL bölümünden ve idempotent olarak çalıştırılır. · Yapay zekâ ajanlarının çıktı
kalitesi prompt cümlesi eklenerek kovalanmaz; kalıcı çözüm, çıktı şemasına zorunlu dayanak
alanı koymak ve bu alanı geçemeyen bulguyu sunucu tarafında elemektir. Yeni analiz ajanları
bu kalıpla yazılır.

 * oAjanın)o)ile biten önerisi otomatik
uygulanmaz; onaya sunulur. Bu dosyaya yeni madde eklenebilir; madde çıkarmak bilinçli bir karar
gerektirir. · Ek operasyon kuralları (03.08): Gömme (embedding) hattı projenin kendi anahtarıyla çalışır;
paylaşımlı sağlayıcı geçidi kullanılmaz. Bilgi tabanı aramasında çeşitlilik kuralı (aynı kaynaktan en fazla
2 parça) ve benzerlik eşiği korunur; büyük kanunlar kitap yapısına göre bölünerek ayrı künyelerle
yüklenir. v2.7 değişiklik kaydı: m.1'e ölçüm/sayaç yüzeyleri cümlesi - m.2'ye dış kaynak künye
doğrulaması cümlesi : m.7'ye coğrafya cümlesi - m.11'e kapsam açıklaması. Madde eklenmedi,
çıkarılmadı. v2.8 değişiklik kaydı: m.1'e oturum kaydı/transkript ve iletişim analizi gizlilik cümlesi -
m.2'ye teşhis dili yasağı. Madde eklenmedi, çıkarılmadı. v2.9 değişiklik kaydı: m.10'a süresiz saklama
yasağı, rızanın hizmet şartına bağlanamayacağı ve veri sorumlusu/veri işleyen rol ayrımı eklendi. Madde
eklenmedi, çıkarılmadı. v3.0 değişiklik kaydı: m.1'e ajan çalışma defteri, taraf gizli belge kanalı, satır
düzeyi gizlilik, "hiçbir taraf tek başına sonucu belirleyemez" ve radar bildirim gizliliği cümleleri · m.2'ye
rapora girmeyenlerin gerekçeli kaydı, kaynak izlenebilirliği, emsal kartı doğrulama kapısı ve radar "çıktı
uyarıdır" kuralı · m.3'e radar otomatik değişiklik yasağı ve püf nokta insan
kaydı ilkesi · m.6'ya defter-denetim izi bağı · m.12'ye kendi gömme hattı, arama çeşitlilik/eşik ve kanun
bölme operasyon kuralları. Madde eklenmedi, çıkarılmadı. v3.1 değişiklik kaydı (4 Ağustos 2026): m.1'e
dosya içi soru-cevap yüzeyi (Dosyaya Soru Sor / Çalışma Kanalı) gizlilik cümlesi · m.2'ye serbest
soru-cevap kaynak disiplini cümlesi ("cevap yalnız dosyada kayıtlı veriden, kaynak atıflı, veri yoksa
yeterli veri yok"). Madde eklenmedi, çıkarılmadı. v3.2 değişiklik kaydı (4 Ağustos 2026): m.1'e taraf
geçmiş verisi izolasyonu cümlesi (yalnız kendi benzer konulu dosyalarında, karşı tarafa asla) · m.10'a
taraf profillemesinin kaynak sınırı ve gerçek kişi profilleme yasağı. Madde eklenmedi, çıkarılmadı. v3.3
değişiklik kaydı (5 Ağustos 2026 — çatallanma onarımı): 3 Ağustos'ta karara bağlanan Anlaşma Belgesi
Denetçisi'nin cümleleri, 04.08 üretim kolunun v3.0 tabanından türemesi nedeniyle zincirden düşmüştü;
m.1'e denetçi raporu gizliliği · m.2'ye kural-dayanak zorunluluğu · m.3'e "denetçi raporu uyarıdır"
cümleleri geri işlendi. Madde eklenmedi, çıkarılmadı.

[v3.4 EKLEME] v3.4 değişiklik kaydı (9 Ağustos 2026): m.2'ye elenen bulguların iz bırakması ve
raporun kendi dayanak zayıflığını başında bildirmesi (dürüstlük bandı) cümleleri · m.12'ye
deploy/yayın tek kapı kuralı ve yapay zekâ çıktı kalitesi disiplini cümleleri eklendi. Madde
eklenmedi, çıkarılmadı. Mimari v0.35, Komut rev.12 ve Yol Haritası r5 ile hizalı.
