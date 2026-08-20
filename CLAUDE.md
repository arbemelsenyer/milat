# CLAUDE.md — MediPact Çalışma Düzeni

## Oturum okuma sırası (bağlayıcı)

1. `constitution.md` — tam oku. Kısadır; değişmez ilkeler.
2. `mimari/00-INDEX.md` — tam oku. Bölüm haritasıdır.
3. Yalnızca işine karşılık gelen `mimari/` bölüm dosyası.
4. `tasks/todo.md` ve `tasks/lessons.md` — tam oku.
5. `medipact-komut.md` — yalnızca ürünün niyeti tartışılıyorsa.
6. `tasks/yol-haritasi.md` — yalnızca sıra/öncelik sorusu varsa.

Çelişki hâlinde üst sıradaki kazanır:
constitution > komut > mimari > tasks.

## Bayat liste uyarısı (bağlayıcı)
tasks/todo.md'nin alt kısmındaki işaretlenmemiş maddeler (A/B/C/D grupları,
IBA maddeleri) BAYATTIR. Kutuya bakarak ne "yapılmış" ne "yapılmamış" say.
O maddeye dokunacaksan üründe İŞLEVİNİ ARA (ad değil işlev — aynı iş başka
adla yapılmış olabilir), sonra karar ver. Güncel durum yalnız dosyanın
üstündeki en son "Nerede kaldık" bloğudur.

## Okuma sınırı (token disiplini)

- `mimari/99-ARSIV-mimari-tam.md` bütün metni taşır ve tek doğruluk
  kaynağıdır, ama OKUNMAZ. Okuma daima `mimari/` bölüm dosyaları
  üzerinden yapılır. (Kökteki `mimari.md` bu arşive taşındı.)
- `mimari/` klasörünün tamamını okuma. İndeksten ilgili bölümü seç.
- Kod ararken dosyanın tamamını okuma: önce grep ile ilgili yeri
  bul, sonra yalnız o aralığı aç.
- İndekste yazmayan bir dosyayı açacaksan, hangisini neden açtığını
  tek satırla yaz.

## Belge güncelleme kuralı (bağlayıcı)

Ürün davranışını, ekranı, ajan mantığını veya veri modelini değiştiren
her iş bittiğinde, AYNI COMMIT içinde:

1. İlgili `mimari/` bölüm dosyasına durum satırını güncelle veya ekle
   (○ planlı → ● canlı).
2. `tasks/yol-haritasi.md` dosyasına tek satır kayıt düş.

Mevcut metni yeniden yazma — yalnız ekle veya işaretle. Kodun
değişmediği işlerde (yalnız keşif, inceleme, rapor) bu adım atlanır.

## İş Akışı

### 1. Önce Planla
- KEŞİF RAPORU VE PLAN SUNMA YOK: komut geldiğinde doğrudan işi yap. Ayrı bir keşif
  turu, plan onayı ya da ön rapor isteme. Planı kendine tut, çıktıya yazma.
- İstisna: komut açıkça "önce plan ver" ya da "önce incele" diyorsa o zaman
  plan/inceleme yap, kod yazma.
- İş bitince tek çıktı: BÖLÜM DÖKÜMÜ + üç satır. Ara rapor, uzun özet, gerekçe
  anlatımı yok.
- Bir şeyler ters giderse DUR ve yeniden planla — zorlamaya devam etme
- Belirsizlik varsa uygulamadan önce SOR. Karar verici kurucudur; kurucu teknik bilmez, seçenekleri düz dille sun

### 2. Tek Görev, Tek Odak
- Bu projede alt ajan (subagent) KULLANILMAZ
- Her seferinde tek görev, tek dosya işlemi
- Yerel dev server kurulmaz — test her zaman canlıda yapılır

### 3. Ders Döngüsü
- Kurucudan gelen HER düzeltmeden sonra tasks/lessons.md dosyasını güncelle
- Aynı hatayı tekrarlamayı önleyecek kuralı kendin için yaz
- Oturuma başlarken lessons.md'yi gözden geçir

### 4. Bitirmeden Önce Doğrula
- Canlıda kanıtlanmadan hiçbir görev tamamlandı sayılmaz
- supabase/functions klasörüne dokunan her push sonrası MUTLAKA hatırlat: Lovable, GitHub push'unu edge fonksiyonlara otomatik deploy ETMEZ — redeploy gerekir
- ORTAK DOSYA KURALI: supabase/functions/_shared/ altındaki bir dosyayı
  (ör. anlatim.ts) değiştirdiysen, o dosyayı İÇE AKTARAN BÜTÜN fonksiyonlar
  yeniden yayına alınır — yalnız senin dokunduğun fonksiyon değil. Üç satırdaki
  "gereken" alanına bunu açıkça yaz. (20.08'de bu atlandı, iki kez eksik yayın
  yapıldı; canlıda "motora bağlı değil" hatası ve boş defter buradan çıktı.)
- Kendine sor: "Kıdemli bir mühendis bunu onaylar mı?"

### 5. Sadelik — ama Çalışan Yol Kutsaldır
- Önemsiz olmayan değişikliklerde "daha basit bir yolu var mı" diye sor
- ÇALIŞAN KRİTİK YOL ASLA temizlik/zarafet için refaktör edilmez (UDF dersi: refaktör canlıda belge indirmeyi kırdı)
- Belge üretimine dokunan her değişiklik TEK BAŞINA gider, asla başka işle paketlenmez ve tek başına canlı test edilir
- Gereğinden fazla mühendislik yapma, minimum kodu etkile

### 6. Hata Düzeltme — Sınırlı Otonomi
- Söylenen kapsamdaki hatayı düzelt; kapsam DIŞINDA hata görürsen DÜZELTME, raporla
- Önerini kendiliğinden uygulama — yaz, kurucu karar verir
- Kullanıcıya görünen akışı/ekranı/ajan davranışını değiştirecek hiçbir değişiklik önceden onay alınmadan yapılmaz

## Görev Yönetimi
1. Önce Planla: planı tasks/todo.md'ye yaz
2. İlerlemeyi Takip Et: biten maddeleri işaretle
3. Değişiklikleri Açıkla: her adımda düz dille üst düzey özet ver
4. Sonuçları Belgele: tasks/todo.md'ye inceleme bölümü ekle
5. Dersleri Kaydet: düzeltmelerden sonra tasks/lessons.md'yi güncelle

## Koruma ve yetki sınırı (bağlayıcı — her işte geçerli)
BUGÜNE KADAR ÜRÜNDE KURULMUŞ VE ÇALIŞAN HER ŞEY OLDUĞU GİBİ KALIR — silinmez,
yeniden yazılmaz, taşınmaz, sadeleştirilmez, "daha temiz olur" diye elden
geçirilmez. Yeni iş, var olanın ÜSTÜNE EKLENİR.

Var olan bir yerde değişiklik GEREKİYORSA: kendin değiştirme. Nerede, ne sorun
var, neden değişmesi gerekiyor — bunu yaz ve DUR. Kurucu onaylamadan tek satır
değiştirilmez. Bu, gördüğün her kusur için geçerlidir: kapsam dışı hatayı
düzeltme, RAPORLA.

Hiçbir bölümü, kartı, düğmeyi, sekmeyi SİLME. Yerini DEĞİŞTİRME. Yeniden
ADLANDIRMA. Sırasını bozma. Sayaçları ve numaralandırmayı bozma. Çalışan akışı
ve tasarım bütünlüğünü bozma. Fonksiyon imzalarını ve çağıran yerleri kırma.
Şüpheye düşersen DUR ve sor, tahminle ilerleme.

BUNDAN SONRASINI İNŞA ET: hedef, ürünü pilota hazır hâle getirmektir. Aldığın
işin BÜTÜN aşamalarını eksiksiz yap — yarım bırakma, "sonra tamamlanır" deme,
bir bölümü sessizce atlama. Yapamadığını "ATLANDI: sebep" diye yaz.

İş bitince kaldırdığın, taşıdığın ya da yeniden adlandırdığın her şeyi ve
dokunduğun bütün dosyaları TEK TEK listele.

Bu blok her komutta yazılmasa da geçerlidir; komutta yazmıyor diye gevşetilmez.

## Agentic bağ ve insan kapıları (bağlayıcı)
HİÇBİR YETENEK YALNIZ DÜĞME OLARAK YAPILMAZ. Ürüne eklenen her yetenek için şu
dördü yazılır ve kurulur:
- hangi OLAY üzerine kendiliğinden çalışacak,
- sahibi hangi ajan (taraf ajanı / masa ajanı / ana ajan / sistem),
- insan kapısı var mı, yok mu, gerekçesi ne,
- akis_kurallari'na kural satırı gerekiyor mu (satırı Claude yazar, sen yazma).
Bağlanmıyorsa gerekçesi yazılır. Düğmeye basılan ürün agentic değildir.

BEŞ İNSAN KAPISI — ajanın asla kendi başına yapamayacakları:
imza · bilirkişi ataması · kayıt/döküm rızası · tarafla asıl müzakere · silme onayı.
Bunların dışındaki her iş ajandadır; insana bırakmak için bu listeye girmesi gerekir.

KÖR VERİ: bir tarafın verisi, belgesi, analizi, kalemi karşı tarafa ve karşı tarafın
ajanına hiçbir yüzeyden görünmez. Süzme EKRANDA DEĞİL SORGUDA kurulur.

## Temel İlkeler
- GİZLİLİK #1: Her özellik kör veri ilkesine karşı test edilir. Karşı taraf diğer tarafın verisini ASLA göremez. Erişimi genişleten policy önerme
- HALÜSİNASYON YASAK: Veri yetersizse "Yeterli veri yok" de. Uydurma künye/atıf üretme
- KIRINTI BIRAKMA: Yarım kalan hiçbir parça sessizce bırakılmaz — kaydet ve raporla
- SQL, migration, politika ve akis_kurallari satırları CODE TARAFINDAN YAZILMAZ —
  hepsi Claude'da. Gerekiyorsa üç satırda "SQL: var — <ne gerekiyor>" diye rapor et,
  kendin yazma. Supabase Dashboard yolu kapalı.
- Altyapı kurmadan önce tasks/kurulu-envanter.md okunacak ve canlıda cron.job sorgusuyla doğrulanacak; depoda görünmemesi "yok" demek değildir
- Tek lockfile bun.lock'tur; npm install kullanılmaz, bun install kullanılır
- Kök nedeni bul; geçici yama yapma

## Kısayol kelimeleri
- "medipact" → constitution.md, tasks/todo.md (en üstteki "Nerede kaldık" bloğu) ve
  tasks/lessons.md okunur; sonra TEK CÜMLEYLE "son oturumda X yapıldı, sırada Y var"
  denir ve KOMUT BEKLENİR. Bu kelime üzerine kod yazılmaz, iş başlatılmaz, uzun özet
  çıkarılmaz.
- "medipact devam" → aynı dosyalar okunur, sonra "Nerede kaldık" bloğunda SIRADAKİ
  olarak yazan ilk madde doğrudan yapılmaya başlanır; ayrıca onay sorulmaz. Yalnız o
  madde yapılır, kapsam genişletilmez.

## Oturum Ritüeli (süreklilik kuralı)
- Oturum BAŞINDA: tasks/todo.md dosyasını oku ve "Nerede kaldık" bölümünden devam et. Kullanıcıya özetle: "Son oturumda X yapılmıştı, sırada Y var."
- Her görev BİTİMİNDE, "bitti" demeden önce: tasks/todo.md'de tamamlananı [x] işaretle; kalan işleri ve bir sonraki adımı "## Nerede kaldık" başlığı altına 2-3 satırla yaz (tarih ekle).
- Yeni bir ders/tuzak çıktıysa tasks/lessons.md'ye tek satır ekle.
- Bu ritüel atlanamaz: todo.md güncellenmeden görev tamamlanmış sayılmaz.

## İş sonu kaydı (bağlayıcı — otomatik, hatırlatılmadan)
Her iş biterken tasks/todo.md'nin en üstündeki "Nerede kaldık" bloğuna, sana
söylenmeden şunları yazarsın:
- YAPILDI: hangi bölüm/madde bitti, tek satır + dosya referansı.
- EKSİK KALDI: bitmeyen ya da yarım kalan her şey, sebebiyle. Sessizce geçilmez;
  "sonra bakılır" denmez.
- GİDERMEK İÇİN: her eksik kalemin altına, onu kapatmak için tam olarak ne
  yapılması gerektiği — hangi dosya, hangi adım, kimde (Code / Claude / kurucu).
Bu kayıt işin parçasıdır, ayrı tur değildir: kayıt düşmeden iş bitmiş sayılmaz
ve commit atılmaz.

## SABİT KURALLAR (19.08.2026, kurucu)
- Bilmediğin yerde "bilmiyorum" yaz. Uydurma, sanma, tahmin yürütme.
- Yaptığın ve bulduğun her şeyi referansıyla yaz (dosya + satır).
- Emin olmadığın şeyi yapılmış gibi raporlama.
- Komutta bölüm listesi varsa cevabın sonuna "BÖLÜM DÖKÜMÜ" yaz: her bölüm
  için YAPILDI ya da ATLANDI(sebep). Sessiz atlama yasak.
- Her cevabın sonunda üç satır: commit / değişen / gereken.
- Sınırlar, kısıtlar ve öğrenme yasakları TÜM ajanlar ve TÜM aşamalar için,
  ajanın devreye girdiği her an geçerlidir; ortak motorda tek yerde durur,
  hiçbir fonksiyon kendi içinde gevşetemez.
- YALNIZ SÖYLENENİ YAP: komutta yazmayan işi yapma, kapsamı kendiliğinden
  genişletme, "bunu da düzelteyim" deme. Kapsam dışı gördüğünü RAPORLA.
- BÜTÜN ADIMLARI EKSİKSİZ YAP: komuttaki hiçbir bölümü, hiçbir maddeyi, hiçbir
  cümleyi atlama. Yapamadığını sessizce geçme — "ATLANDI: sebep" yaz.
- TAM OKU: dosyayı üstünkörü okuma, yalnız başlıklara bakıp içeriği okudum deme.
  Okumadığın yeri "okudum" diye yazmak yalandır. Ne kadarını okuduğunu dürüstçe
  yaz; gerekiyorsa "yalnız şu aralığı okudum" de.
- KARAR SENDE DEĞİL: kapsam, öncelik ve yöntem kararlarını kurucu verir. Kendi
  kafandan karar verip uygulama; seçenek varsa yaz ve sor.
- UYDURMA, TAHMİN YÜRÜTME, SANMA: emin olmadığın her yerde "bilmiyorum" yaz.
  Referanssız hiçbir "yapıldı / var / doğru" cümlesi kurma.
- UZATMA: gerekçe, özet ve rapor kısa olsun; hikâye anlatma, aynı şeyi iki kez yazma.
- İŞE BAŞLAMADAN ÖNCE TEK SATIRLA YAZ: "okudum: <hangi dosyalar + hangi bölüm>".
  Bu satır yoksa iş başlamamış sayılır. Okumadığın dosyayı okudum diye yazmak yalandır.
