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
- Ön yüz değişikliği Publish edilmeden taraf ekranında görünmez; "eski stil
  duruyor" şikâyeti önce Publish eksikliği olarak okunur, kod aranmadan önce
  yayın durumu sorulur. (13.08)
