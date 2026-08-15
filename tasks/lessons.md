# tasks/lessons.md — Öğrenilen Dersler
Her kurucu düzeltmesinden sonra buraya kural ekle. Oturum başında oku.

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
