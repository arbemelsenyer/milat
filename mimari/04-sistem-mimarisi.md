4. SİSTEM MİMARİSİ 4.1 Katmanlar yüz Kokpit * Ajan Kontrol Paneli * Föy Çalışma Kanalı : Kart - Gauge · AçıklaH 1 YÖNETİŞİM Ajan kayıt defteri : Denetim izi (hash) Uyum / eskalasyon denetimi AJANLAR
Orchestrator (şef) : sınıflandırma * süre * taraf analizi : kök neden · ortak zemin - müzakere : Kör Teklif · dikey uzman ajanlar 1 BİLGİ RAG (vektör) : mevzuat toplayıcı - canlı içtihat : tarife motoru * Olay
Haritası - dikey bilgi - şablon setleri 1 KAYIT İlişkisel DB : dosya-kapsamlı satır yetkisi dar kapsamlı servis
uçları belge doldurma motoru * ödeme defteri (BU KATMANDA AI YOK — deterministik) İki değişmez
kural: (1) Alt katman üst katmana bağımlı olamaz. (2) Kayıt katmanında Al yasaktır — belge üretimi,
ücret hesabı, föy deterministiktir; model analiz üretir, hukuki belge üretmez. 4.2 Teknoloji bağımsızlığı
ve mevcut yığın İlke: Bu mimari teknoloji-bağımsızdır. Bağlayıcı olan katman modeli, yetenek envanteri
ve kurallardır — araçlar değil. Sıfırdan farklı bir altyapıyla kuran bir ekip için zorunlu eşdeğerler: · oSatırdüzeyi, dosya-kapsamlı yetki zorlaması veritabanı katmanında (bugünkü RLS'in eşdeğeri) —
uygulama kodunda değil · Taraf yüzeylerini besleyen dar, alan-kısıtlı servis uçları (bugünkü RPC'lerin
eşdeğeri) · Deterministik belge motoru (AT'sız), UYAP-uyumlu UDF üretebilen · oSunucutarafıajan
çalıştırma ortamı * canlı adım akışı yayını (Edge Functions * Realtime eşdeğeri) · Vektöraramadestekli
bilgi tabanı (pgvector eşdeğeri) · Vetiyerleşimi: KVKK gereği veri konumu ve işleme yeri sözleşmeyle
güvence altında; hiçbir veri üçüncü taraf ağına çıkmaz Mevcut uygulama yığını (referans — bağlayıcı
değil; constitution m.11 kapsam istisnası): React (Lovable, GitHub çift yönlü senkron) * Supabase
(Postgres * RLS * Edge Functions) - Gemini API: pgvector RAG - Jitsi Meet - jSPDF - UYAP UDF üreteci.
Sıfırdan kuran ekip için alternatif yığın örneği (yine referans): Python API çatısı - ajan orkestrasyon
çerçevesi · ilişkisel DB (satır düzeyi yetkiyle) - vektör arama : gerekirse graf sorgu katmanı. Hangi
seçim yapılırsa yapılsın §4.2 eşdeğerleri ve §14 sağlanmak zorundadır. Dış model kuralı: Hangi LLM
sağlayıcısı kullanılırsa kullanılsın, sağlayıcının veriyi kendi model eğitiminde kullanmaması sözleşmesel
şarttır; vektör/bilgi alanında vaka bazlı izolasyon korunur. Kurumsal aşamada yerinde/özel kurulum
seçeneği ayrıca değerlendirilir (K8). 4.3 Platform stratejisi (mobil) · Tekçekirdek, iki yüz: Web ve mobil
aynı Kayıt/Bilgi/Ajan katmanlarını kullanır; mobil hiçbir zaman ayrı bir veri yolu veya gevşetilmiş bir yetki
modeli açmaz. §14'teki her kural mobilde aynen geçerlidir. · Sıra:(1) mevcut web'in telefonda
kusursuz çalışması — önce taraf akışı (taraflar ürüne çoğunlukla telefondan girer: davet linki > başvuru
> belge > Kör Teklif > ödeme bilgisi), sonra arabulucu takip ekranları; (2) mobil uygulama * anlık
bildirim altyapısı. · Bildirim gizliliği: Bildirimler yalnız olay başlığı taşır ("Analiz tamamlandı"); analiz
içeriği, taraf verisi veya tutar bildirime asla yazılmaz — kilit ekranında görünen metin kör veri ilkesine
tabidir. · o Açıkkarar K7: Mobil uygulamanın zamanlaması ve ilk kapsamı (taraf uygulaması mı,
arabulucu uygulaması mı önce) * teknoloji seçimi. 4.4 Operasyon kuralları (mevcut yığına özgü — yığın
değişirse eşdeğerleri yeniden tanımlanır) · Migration'laridempotent, SOL Editor üzerinden. · Fonksiyon
push'undan sonra redeploy zorunlu — otomatik deploy yok. · Belgeüretimine dokunan değişiklik tek
başına çıkar, canlı test edilir. · Çalışan kritik yollar temizlik uğruna refactor edilmez.

[v0.35 EKLEME — DEPLOY VE YAYIN TEK KAPIDAN (09.08 tespiti)] Edge fonksiyonlarının deploy'u ve
uygulamanın yayınlanması YALNIZ Lovable üzerinden yapılabilir. Proje Lovable Cloud ile
yönetildiğinden dışarıdan (komut satırından) deploy denemesi yetki hatasıyla reddedilir.
Veritabanı paneline erişim vardır — SQL, tablo ve anahtar yönetimi oradan yapılabilir — ancak SQL
göçleri Lovable içindeki SQL bölümünden ve idempotent olarak çalıştırılır.

[v0.35 EKLEME — YAPAY ZEKÂ ÇIKTISINDA KALİTE DİSİPLİNİ (09.08 dersi)] Bir ajanın çıktı kalitesi
prompt cümlesi ekleyerek kovalanmaz: üç tur denendi, her turda başka bir nitelik bozuldu
(salınım). Kalıcı çözüm iki katmanlıdır — (1) çıktı şemasına ZORUNLU DAYANAK ALANI koymak,
(2) bu alanı geçemeyen bulguyu sunucu tarafında elemek. Yeni analiz ajanları bu kalıpla yazılır.


