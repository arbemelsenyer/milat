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

## Okuma sınırı (token disiplini)

- Kök dizindeki `mimari.md` bütün metni taşır ve tek doğruluk
  kaynağıdır, ama OKUNMAZ. Okuma daima `mimari/` üzerinden yapılır.
- `mimari/` klasörünün tamamını okuma. İndeksten ilgili bölümü seç.
- Kod ararken dosyanın tamamını okuma: önce grep ile ilgili yeri
  bul, sonra yalnız o aralığı aç.
- İndekste yazmayan bir dosyayı açacaksan, hangisini neden açtığını
  tek satırla yaz.

## İş Akışı

### 1. Önce Planla
- 3+ adım veya mimari karar içeren HER görevde önce plan yap; planı tasks/todo.md dosyasına kontrol edilebilir maddeler halinde yaz
- Bir şeyler ters giderse DUR ve yeniden planla — zorlamaya devam etme
- Plan modunu doğrulama adımları için de kullan
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
2. Planı Doğrula: uygulamadan önce kontrol ettir
3. İlerlemeyi Takip Et: biten maddeleri işaretle
4. Değişiklikleri Açıkla: her adımda düz dille üst düzey özet ver
5. Sonuçları Belgele: tasks/todo.md'ye inceleme bölümü ekle
6. Dersleri Kaydet: düzeltmelerden sonra tasks/lessons.md'yi güncelle

## Temel İlkeler
- GİZLİLİK #1: Her özellik kör veri ilkesine karşı test edilir. Karşı taraf diğer tarafın verisini ASLA göremez. Erişimi genişleten policy önerme
- HALÜSİNASYON YASAK: Veri yetersizse "Yeterli veri yok" de. Uydurma künye/atıf üretme
- KIRINTI BIRAKMA: Yarım kalan hiçbir parça sessizce bırakılmaz — kaydet ve raporla
- SQL migrasyonları her zaman idempotent yazılır; SQL kurucu tarafından Lovable Cloud > SQL'den çalıştırılır, Supabase Dashboard yok
- Tek lockfile bun.lock'tur; npm install kullanılmaz, bun install kullanılır
- Kök nedeni bul; geçici yama yapma

## Oturum Ritüeli (süreklilik kuralı)
- Oturum BAŞINDA: tasks/todo.md dosyasını oku ve "Nerede kaldık" bölümünden devam et. Kullanıcıya özetle: "Son oturumda X yapılmıştı, sırada Y var."
- Her görev BİTİMİNDE, "bitti" demeden önce: tasks/todo.md'de tamamlananı [x] işaretle; kalan işleri ve bir sonraki adımı "## Nerede kaldık" başlığı altına 2-3 satırla yaz (tarih ekle).
- Yeni bir ders/tuzak çıktıysa tasks/lessons.md'ye tek satır ekle.
- Bu ritüel atlanamaz: todo.md güncellenmeden görev tamamlanmış sayılmaz.
