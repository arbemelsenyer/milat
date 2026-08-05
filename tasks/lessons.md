# tasks/lessons.md — Öğrenilen Dersler
Her kurucu düzeltmesinden sonra buraya kural ekle. Oturum başında oku.

- ÇALIŞAN KRİTİK YOL REFAKTÖR EDİLMEZ: UDF refaktörü canlıda belge indirmeyi kırdı. Temizlik/zarafet gerekçesiyle çalışan koda dokunma
- REDEPLOY UNUTULMAZ: supabase/functions'a dokunan push sonrası Lovable otomatik deploy etmez — her seferinde kurucuya redeploy hatırlat
- PAKET YASAK: Belge üretimine dokunan değişiklik tek başına gider, başka işle birleştirilmez
- BUN KULLANILIR: npm install değil bun install; tek lockfile bun.lock
- SQL İDEMPOTENT: Her migrasyon tekrar çalıştırılabilir yazılır (IF NOT EXISTS / OR REPLACE)
