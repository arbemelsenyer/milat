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
