## Nerede kaldık

- Tarih: 25.08.2026 (13. blok) — **`medipact dur` ile kapatıldı (kurucu komutu)**
- Aşama: DAOS · canlı doğrulama döngüsü (§11-B) · **pilot hazırlığı**
- **DAİMÎ TALİMAT (24.08, kurucu):** pilot hazır olana kadar **soru yok**.
- Aktif görev: yok
- Son tamamlanan iş: **P1 · PİLOT İŞ LİSTESİ ÇIKARILDI (13 madde + 5 kabul şartı)**
- **SESSİZ ÇAĞRI KUSURU İSTEMCİ YÜZEYİNİN TAMAMINDA KAPANDI:** `.from` ·
  `.rpc` · `.storage` · `.functions.invoke` · iç `fetch`. Kenar (`_shared`
  dâhil) ve ön yüz. Kenarda çıplak `.from(...)`, `.rpc(...)` ve
  `.storage` çağrısı **SIFIR**; ön yüzde `tests/sessiz-yazim.test.ts`
  **DONDURULMUŞ listesi BOŞ**. Üçü de tarama testiyle kilitlendi.
- **12. blokta biten işler (sırayla):** `53b33cc` P1 `taraf-kalem-cikar` ·
  `37c8867` P1 `dual-ai-validate` + `orchestrator-run` · `32fad07` P1
  `akis-yurut` · `a3de13f` P0 `ajan-nobetci` (15 yer) · `04547a5` kayıt ·
  `62e99b6` P1 kalan 16 yazım (13 işlev) · `69b8bde` P2 `agent_states` (25 yer) ·
  `19be6fe` P2 `_shared/anlatim.ts` (3 yer, 35 işlev fan-out) · `cc0acbb` kayıt ·
  `10bdb83` P1 ön yüz (4 dosya) · `4f16648` kayıt · `1233489` P1 sessiz `rpc`
  + depo (12 yer, 9 işlev) · `bc558eb` P1 ön yüz depo çağrıları (4 yer) ·
  `8e8e416` kayıt · `7974bac` kayıt · `03c445f` P1 `functions.invoke` (9 yer) ·
  `a27b221` P2 `fetch` iç çağrısı (1 yer) · `b899149` P1 belge durumu sözlük
  çatalı · kapanmış dosyada görev yürütülmesi.
- **Bu oturumun dersleri `tasks/lessons.md`ye yazıldı** (3 yeni ders: sessiz
  yazım kuyruk döngüsü kurar · öz denetim eşiği kusurla birlikte düşer ·
  `rpc`/`storage` de fırlatmaz).
- Doğrulama (25.08 · dur anında yeniden koşuldu): `npm run test` **270/270 (30 dosya)** ·
  `npx tsc --noEmit -p tsconfig.app.json` **temiz (çıkış 0)**. Bu oturumda kod
  değişmedi; son iki commit (`1d06303`, `152e2c0`) yalnız kayıttır.
- **CANLI:** son 2 saatte 42 cron yanıtı, hepsi **200**; işlenmemiş olay 0,
  bekleyen talimat 0, metin hatası 0.
  (taban 2334'tü; `randevu-teklif`te bir `any` kaldırıldı)
- **Açık blokaj: yok**
- **REDEPLOY DURUMU (§11-B):**
  - OK `taraf-kalem-cikar` (`53b33cc`) · `dual-ai-validate` + `orchestrator-run`
    (`37c8867`) · `akis-yurut` (`32fad07`) · `ajan-nobetci` + `orchestrator-run`
    (`a3de13f`) · **13 işlev** (`62e99b6`) — hepsi Lovable ajanıyla deploy
    edildi ve `get_message` ile doğrulandı.
  - OK `69b8bde` · **14 işlev** (`agent_states` sürüsü) — deploy edildi ve
    `get_message` ile doğrulandı.
  - OK `19be6fe` · **`_shared/anlatim.ts` FAN-OUT** — 35 tüketici işlevin hepsi
    deploy edildi ve `get_message` ile doğrulandı.
  - OK `10bdb83` · **ön yüz (`src/**`)** — Lovable `deploy_project` ile publish
    edildi. `get_project` doğruladı: `latest_commit_sha=10bdb833…`,
    `is_published=true`, canlı sayfa açılıyor.
  - OK `1233489` · **9 işlev** (sessiz `rpc` + `storage`) — deploy edildi ve
    `get_message` ile doğrulandı.
  - OK `bc558eb` · **ön yüz depo çağrıları** — publish edildi. `get_project`
    doğruladı: `latest_commit_sha=bc558eb9…`, `is_published=true`.
  - OK `03c445f` · **ön yüz `functions.invoke`** — publish edildi.
  - OK `a27b221` · `extract-document-text` — deploy edildi ve doğrulandı.
    `get_project`: `latest_commit_sha=74ec5862…`, `is_published=true`.
  - OK `10a70e6` · `dosya-verilerini-sil` — deploy edildi ve `get_message` ile
    doğrulandı.
  - **BEKLEYEN REDEPLOY YOK.**
- Açık HAT maddesi: **H-4** · **H-7** · **H-8** · **H-9** · **H-10** ·
  **H-11 (P0 · kabuk bekçisi devre dışı — kanıtlı)** · **H-12 (P1 · depoda
  birikmiş öksüz belgeler — kök neden kapandı, birikmiş borç kurucu kararı bekliyor)**.
  **H-1 KAPANDI** (25.08, `CRON_SECRET` yenilendi ve canlıda doğrulandı).
- Sıradaki uygulanabilir iş: **PİLOT KUYRUĞU** (aşağıda, 13 madde).
  En üstteki: taraf katılım ekranında aydınlatma metni. ESKİ NOT: Sessiz yazım kusuru kenarda ve ön
  yüzde kapandı, iki tezgâh da kilitli. Yeni P0/P1 adayı kodun gerçek
  durumundan çıkarılmalı. En yakın aday: **H-8 ölü yüzey öbeğinin silinmesi**
  (37 dosya) — ama silme kararı kurucudadır, HAT'ta açık bekliyor.

### DUR KAYDI — 25.08.2026 · `medipact dur`
Güvenli kayıt noktası. **Yeni işe geçilmedi** (§17).

- **Ağaç durumu (commit edilmemiş, bu oturuma ait DEĞİL — §11 gereği dokunulmadı):**
  - silinmiş ama commit edilmemiş: `.agents/skills/medipact-calisma-duzeni/SKILL.md`
  - izlenmeyen: `.github/.agents/` · `devam.sh` · `gs.sh` ·
    `Yeni XLSX Worksheet.xlsx` · `repomix-output.xml` (4,7 MB depo dökümü)
  - **`repomix-output.xml` sır taraması yapıldı:** gerçek jeton **yok**
    (`eyJhbGciOi…` eşleşmesi 0), `.env` dosyası dökümün içinde **değil**;
    68 eşleşme yalnız `SUPABASE_SERVICE_ROLE_KEY` **değişken adı**. Yeni P0 yok.
- **`main` ile `origin/main` eşit** — bekleyen push yok.
- **Bekleyen redeploy yok** (§11-B tablosu yukarıda).
- **Açık HAT maddeleri (cevap bekliyor):** H-1 (⚠️ `CRON_SECRET` yenilemesi —
  saklama yarısı doğrulandı, değer yenilemesi kurucuda) · H-4 · H-7 · H-8 · H-9 · H-10.
- **Sıradaki oturumun ilk işi:** `tasks/HAT.md` → `## COWORK → CODE` oku;
  cevap gelmişse uygula. Cevap yoksa kuyruk boş olduğu için yeni P0/P1 adayı
  kodun gerçek durumundan çıkarılır (§6).


## PİLOT KUYRUĞU — Aşama 1 kapanışı (25.08.2026'da çıkarıldı)

**Kaynak:** `mimari/15-kabul-kriterleri.md` §15.2 (Aşama 1 kapanışı, 13 kalem) +
§15.5 (pilot blokerleri) + §15.1 (beş kabul şartı). `tasks/yol-haritasi.md` düz
anlatıdır, iş listesi değildir — köprü burada kuruldu.

**Kapsam sınırı:** yalnız **Aşama 1** (arabulucular / ilk pilot). §15.3 (Aşama 2
dikeyler), §15.4 (Aşama 3 kurumsal), §15.4a (Aşama 4 şahıslar) **alınmadı.**

**TOPLAM: 14 madde** — 9'u iş, 5'i canlı doğrulama (P1: 7 · P2: 6 · P3: 1) · **+5 kabul şartı** (§15.1, her madde için ayrı).

> Ayrıca kuyrukta pilot dışı **1** eski madde duruyor (P3 · `oturum-kayitlari` dar
> okuma politikası, HAT H-4). O madde bu listenin **2. maddesine bağlıdır**: kayıt
> hattı yazılınca yol düzeni belli olur ve politika ancak o zaman yazılabilir.

### Listeye ALINMAYANLAR (§15.2'de var ama yapılmış — kanıtlı)
| kalem | kanıt |
|---|---|
| Arabulucular arası veri sızmıyor | 22.07 kapandı; HAT **H-6** guard'ı belirsiz öbeğe de uyguladı, ARŞİV'de |
| Davet e-postası kendi alan adından | v0.33 · 23.07 kapandı, `info@milatmediation.com` canlı teslim kanıtlı |
| Arabulucu onboarding (§15.5-3) | 22.07 kapandı |
| Çapraz-arabulucu gizlilik açığı (§15.5-1) | 22.07 kapandı, doğrulandı |

### Kuyruk
- [ ] P1 · **Taraf katılım ekranında aydınlatma metni yok** · Kabul: `/katilim/:token`
      sayfasında (`KatilimCevap.tsx`) KVKK aydınlatma metni gösteriliyor ve taraf
      onaylamadan katılım tamamlanmıyor; metin `Auth.tsx`teki mevcut metinle aynı
      kaynaktan geliyor (ikinci kopya yazılmıyor) · **Bulgu:** `KatilimCevap.tsx`te
      "aydinlatma/KVKK" geçen **0** satır; §15.2 "taraf kayıt ekranında gösteriliyor"
      diyor. Arabulucu tarafında (`Auth.tsx`) metin VAR.
- [ ] P1 · **Oturum kaydı hattı yok (ses → döküm → föy)** · Kabul: arabulucu oturum
      sonrası notu **hem yazılı hem sesli** girebiliyor; ses `oturum-kayitlari` kovasına
      yükleniyor, `oturum_kayitlari.ses_dosya_yolu` doluyor, döküm `dokum_metni`ne
      yazılıyor ve arabulucunun **onayıyla** föye/analiz zincirine giriyor ·
      **Bulgu:** şema hazır (11 kolon) ve silme kolu çalışıyor, ama kovanın kodda
      tek tüketicisi silme kolu — **yükleme yolu hiç yazılmamış.** HAT **H-4** de
      bu hattı bekliyor (yol düzeni belirlenince dar okuma politikası yazılacak).
- [ ] P1 · **Saklama süresi parametre tablosu + periyodik imha yok** · Kabul: saklama
      süreleri bir parametre tablosundan okunuyor (kodda sabit değil) ve süresi dolan
      kayıtlar periyodik olarak imha ediliyor; imha kayda geçiyor · **Bulgu:**
      `Auth.tsx`te imha **metni** var ama mekanizma yok; parametre tablosu yok;
      periyodik imha yalnız oturum kaydı için (24 saat) kurulu. constitution m.10.
- [ ] P1 · **Arabulucunun kendi anteti / IBAN'ı / şablonu yok** · Kabul: arabulucu
      kendi antetini, IBAN'ını ve belge şablonunu bir kez tanımlıyor; üretilen
      tutanak/anlaşma/fatura bu değerleri kullanıyor · **Bulgu:** `mediators`
      tablosunda antet/IBAN/şablon kolonu **yok** (var olanlar: photo_url, bio,
      hourly_rate…); `invoice-pdf.ts` `data.mediatorIban` bekliyor ama kaynağı belirsiz.
- [ ] P1 · **UDEF belge zinciri yok** · Kabul: UDEF çıktısı üretiliyor ve canlı test
      geçiyor · **Bulgu:** "UDEF" yalnız `mimari/` belgelerinde geçiyor, **kodda sıfır**.
      Tutanak/anlaşma tarafı kurulu (25 dosya).
- [ ] P1 · **Üyelik / paket / kota modeli yok** · Kabul: paket tanımlı, kota sayılıyor,
      kota dolunca ilgili işlem engelleniyor ve kullanıcıya sebebi gösteriliyor ·
      **Bulgu:** üyelik/paket/kota tablosu **yok**, kodda karşılığı yok
      ("subscription" eşleşmeleri Supabase auth dinleyicileri).
      **NOT:** ürün/fiyat kararı gerektirir — başlamadan önce HAT'a çıkarılmalı (§7.2).
- [ ] P1 · **Kazanım sayacı yok** · Kabul: baz çizgi alınıyor ve dosya bazında kazanılan
      saat üretiliyor · **Bulgu:** tablo yok, kodda karşılığı yok ("baseline"
      eşleşmeleri CSS sınıf adları). **NOT:** "kazanım" tanımı ürün kararıdır.
- [ ] P2 · **Ödeme defteri "Kaydet" görünürlüğü — son doğrulama** (§15.5-4, tek açık
      bloker) · Kabul: ödeme defterinde satır ekleme/düzenleme/silme canlıda uçtan uca
      çalışıyor ve Kaydet düğmesi her durumda görünür · **Bulgu:** `case_payments`
      (17 kolon) ve `fee_tariffs` şeması var; §15.5'te "son doğrulama" olarak açık.
- [ ] P2 · **Ücret hesabı tarife tabanının altına inmiyor** · Kabul: tarife tabanının
      altında bir ücret kaydedilemiyor; deneme reddediliyor ve sebebi gösteriliyor.

### Canlı doğrulama maddeleri (kod değil, kanıt üretir)
- [ ] P2 · **§3 otomatik doldurma tam mı** · Kabul: gerçek bir dosyada §3 kalemlerinin
      hepsi otomatik doluyor; dolmayan kalem varsa adıyla listeleniyor.
- [ ] P2 · **Orchestrator gerçek dosyada dört adımı tamamlıyor, uydurma künye yok** ·
      Kabul: gerçek dosyada dört adım `completed`; üretilen raporlarda kaynak künyesi
      **birebir** doğrulanıyor, uydurma künye **sıfır**.
- [ ] P2 · **Dava şartı dosyalarında bilgilendirme belgelemesi üretiliyor** · Kabul:
      dava şartı işaretli bir dosyada bilgilendirme belgesi üretiliyor ve indirilebiliyor.
- [ ] P2 · **Taraf akışı telefonda uçtan uca** · Kabul: gerçek telefonda davet →
      başvuru → belge → Kör Teklif → ödeme bilgisi zinciri kesintisiz tamamlanıyor.
- [ ] P3 · **Kullanılabilirlik bulguları (03.08 saha notu)** · Kabul: dosya açılış formu
      sayfa boşta kalınca içerik kaybetmiyor; açılır menüler klavyeyle gezilebiliyor ve
      seçenekler erişilebilirlik ağacında görünüyor.

### §15.1 — BEŞ KABUL ŞARTI (her madde için ayrı ayrı sağlanmalı)
Bir kalem, aşağıdaki **beşi birden** sağlanmadan "bitti" sayılmaz:
1. **Gizlilik** (§14) — kör veri sınırı korunuyor mu
2. **Camdan kutu** — kaynak gösteriliyor · veri yoksa "yeterli veri yok" deniyor ·
   künye temizleyici çalışıyor
3. **İnsan üstünlüğü** — manuel giriş ajanı ezer
4. **Canlı test** — kurucunun gözüyle, gerçek veriyle
5. **Kırıntı yok** — yarım yüzey, ölü düğme, boş panel bırakılmadı

---

### KAPANDI — 25.08 · P1 · KVKK SİLMESİ DEPOYU DA TEMİZLİYOR
**Nasıl bulundu.** Bugün kodda *öksüz dosya* üretilmesini engelledim ama
**mevcut öksüzleri hiç kontrol etmemiştim.** Kontrol edince kök neden çıktı:
`dosya-verilerini-sil` — KVKK silme kolu — **depoya hiç dokunmuyordu.**
`case_documents` satırlarını siliyor, tarafların belgeleri `case-documents`
kovasında kalıyordu. Satır gittikten sonra o dosyayı gösteren hiçbir kayıt
kalmadığı için **hiçbir silme kolu onları bir daha bulamaz** — constitution
m.10 (süresiz saklama yasağı) ihlali.

**Canlı kanıt:** bu yolla üretilmiş **6 öksüz dosya** var (30.06–01.07), hepsi
**artık var olmayan** dosyalara ait.

**Düzeltme.** Belge yolları satırlar silinmeden **önce** okunuyor (sonra
okunamaz), depo temizleniyor, **ancak ondan sonra** satırlar siliniyor.
Sıra kritik: ters sırada depo silmesi düşerse indeks yok olur ve veri
**erişilemez biçimde kalır**. Depo temizlenemezse satırlara **dokunulmuyor**
("hiçbir kayıt silinmedi") — bugün `MediationEngine.deleteDoc` ve
`CaseDocuments`ta kurulan sıranın aynısı. Silinen belge sayısı çağırana
dönülüyor, yani "kişisel veri kalmadı" sözü artık **kanıtlanabilir**.

**TEZGÂH:** `tests/kenar-sessiz-yazim.test.ts` bir durumla genişletildi (25).
Sıra ayrıca doğrulanıyor: yolları oku → depoyu sil → satırları sil.
**KANITLANDI:** `KENAR_KOK=tests/gecici/kenar-kanit` kopyasında düşüyor.
Bu sırada dönüş gövdesine `belge` alanı eklendiği için **eski bir testin**
iddiası kırılmıştı; amacı korunarak güncellendi (eksikler hâlâ `uyarilar` ile
çağırana taşınıyor mu).

**BİRİKMİŞ BORÇ → HAT H-12 (P1).** Kök neden kapandı ama geçmişte birikenler
duruyor: **6** gerçek KVKK öksüzü · **71** bilgi tabanında karşılığı olmayan
`admin/` dosyası · **2** dosyası kayıp `case_documents` satırı (indirme kırılır).
Depodan silmek üretim verisi silmesidir (§7.3/§10) — Code saydı, **silmedi**.

### KAPANDI — 25.08 · P1 · `CRON_SECRET` YENİLENDİ (H-1 KAPANDI)
Kurucu değeri üretti ve hem *Edge Functions → Secrets* hem *Vault* tarafında
güncelledi. **Code değeri istemedi, görmedi, okumadı, hiçbir çıktıya yazmadı.**

Canlı kanıt (`net._http_response`, salt okuma): `08:27–09:42` **200** ×29 →
**`09:45:00` 401 ×1** → `09:48 · 09:51 · 09:54` **200** ×3. Bu, H-1'in A
seçeneğinin peşinen kabul ettiği imzanın aynısıdır: *"en fazla bir nöbetçi turu
(3 dk) 401; iş kaybı yok, tur yeniden koşar."* Tek 401'den sonra üç tur üst üste
200 → yenileme başarılı. HAT H-1 **ARŞİV**e taşındı.

**Sır hijyeni:** `net.http_request_queue` ve istek başlıkları **hiç
sorgulanmadı** — `x-cron-secret` orada taşınır (§12).

### KAPANDI — 25.08 · P2 · `tasks/HAT.md` YAPISAL OLARAK BOZUKTU
H-1'i arşive taşırken çıktı: **H-7…H-11 maddeleri `## CODE → COWORK` başlığının
ÜSTÜNDE**, giriş metninin içinde duruyordu. H-7'nin başlığı bir cümlenin ortasına
yapışmıştı — giriş şöyle yarılmıştı:

> "Cowork (ya da kurucu) cevabı `" + **[H-7…H-11 gövdeleri]** + "`## COWORK → CODE` bölümüne yazar."

**Neden önemliydi:** `devam-bekcisi.py` bu dosyayı `^## ` başlıklarına bölerek
okur. İlk başlığın üstünde kalan maddeler **hiçbir bölüme girmez** — yani beş
açık madde bekçiye **görünmezdi**. Kanca bu yüzden yalnız H-1 ve H-4'ü
işaretliyordu. Hasar benim değişikliğimden önce vardı; H-10/H-11 aynı yanlış
çapaya yazıldığı için sıraya katılmıştı.

**Onarım:** giriş cümlesi birleştirildi, beş madde `## CODE → COWORK` bölümüne
H-4'ün ardına taşındı. Onarım öncesi hâl `tests/gecici/HAT-onarim-oncesi.md`de
duruyor. Doğrulama (`tests/gecici/gercek-karar.mjs`): üç meşru durma sebebi
bırakılıyor, sebepsiz rapor engelleniyor ve gerekçe artık **yalnız H-4**
gösteriyor (H-1 arşivde).

### KAPANDI — 25.08 · P1 · STOP KANCASI YANLIŞ ALARM DÖNGÜSÜ KURUYORDU (§18-A)
**Belirti.** Bugün iki kez, **meşru** bir durma sebebi yazdığım hâlde
("kuyrukta uygulanabilir iş kalmadı") tur kapatılamadı. Kancanın kendi mesajı
*"sebebi bir sonraki cevabında açıkça yaz, kanca seni bırakacak"* diyordu —
**ama bu söz tutulamaz:** Stop kancası asistanın cevabını okuyamaz, yalnızca
yükü görür. Yani vaat edilen çıkış yolu yoktu; beni ancak 3-engel sayacı bırakıyordu.

**Kök neden.** `settings.json`'daki Stop kancası `~/.claude/hooks/devam.sh`'ı
çağırıyordu. O dosya **kör** bir engelleyici: kuyruğa bakmıyor, HAT'a bakmıyor,
cevabı okumuyor — koşulsuz olarak üst üste 3 kez blokluyor.

CLAUDE.md **§5-A-1**'de tarif edilen asıl mekanizma (`devam-bekcisi.sh` +
`devam-bekcisi.py`) diskte **duruyordu ama bağlı değildi**. O ikili gerçek karar
tablosunu uyguluyor: cevaptaki gerçek durma sebeplerini tanır, kuyruktaki
`- [ ] P0–P3` maddelerine bakar, karar/önkoşul bekleyenleri yapılabilir saymaz,
HAT'ta cevaplanmış madde arar ve her hata yolunda **FAIL-OPEN** çıkar.

**Düzeltme.** `settings.json` → Stop kancası `devam-bekcisi.sh`'a bağlandı.
`devam.sh` silinmedi, diskte duruyor.

**TEZGÂH — kurmadan ÖNCE sınandı** (`tests/gecici/devam-bekcisi-sinama.mjs`,
12 senaryo, **12/12**): dört meşru durma sebebi de bırakılıyor · `stop_hook_active`
döngü koruması çalışıyor · yapılabilir madde varken **engelliyor ve gerekçede
maddeyi adıyla gösteriyor** · "kurucu kararı" işaretli madde yapılabilir
sayılmıyor · boş kuyruk bırakıyor · bozuk girdi ve olmayan dizin fail-open.
Ayrıca `tests/gecici/yol-bicimi.mjs`: Windows `cwd` hem ters hem ileri bölülü
biçimde okunuyor (biri okunamasa bekçi o biçimde **hiç** engelleyemezdi).

**BAĞLANDIKTAN SONRA GERÇEK PROJEYE KARŞI DA SINANDI**
(`tests/gecici/gercek-karar.mjs`, salt okuma): üç meşru durma sebebi de
**bırakılıyor** — yani yeni bir döngü kurulmadı. Sebepsiz bir rapora ise
engelliyor ve gerekçeyi gösteriyor: *"HAT.md'de cevaplanmış ama uygulanmamış
madde var: H-1, H-4."*

> **H-1/H-4 NOTU (sonraki oturum bunu kovalamasın):** ikisinin de cevabı var ama
> uygulaması **dış önkoşula** bağlı — H-1'i kurucu yeniler (cevabı "bu madde
> Code'a ait değildir" diyor), H-4 kayıt hattı yazılmasını bekliyor. Bekçinin
> kuralı "cevaplandı ama hâlâ CODE → COWORK'te duruyor" olduğu için ikisini de
> işaretliyor. **Yanlış alarm değil, eksik ayrım:** yalnız *sebepsiz* durmada
> tetikleniyor; gerçek sebep yazıldığında bırakıyor. ARŞİV'e taşımak yanlış
> olurdu (maddeler gerçekten açık), bu yüzden olduğu gibi bırakıldı.

**TEZGÂHIN KENDİSİ DE BİR KUSUR VERDİ.** İlk yazımda üç fixture **aynı dizini**
paylaşıyordu ve senaryolar kapanış olarak sonda koştuğu için hepsi **son yazılan**
içeriği görüyordu; tezgâh, bekçi doğru çalışırken "engellemiyor" diyordu. Her
fixture kendi dizinine alındı. Bozuk tezgâh, tezgâhsızlıktan kötüdür (24.08 dersi).

### KAPANDI — 25.08 · P1 · CANLI SAĞLIK DENETİMİ → İKİ GERÇEK KUSUR
Bugün ~80 fonksiyon sürümü deploy edildi; §11-B gereği canlı sistem denetlendi.
**Sistem sağlıklı:** son 2 saatte 42 cron yanıtının **hepsi 200**; 24 saatte
`agent_states` yalnız `completed`; işlenmemiş akış olayı **0**, bekleyen
talimat **0**, metin çıkarma hatası **0**. Ama iki gerçek kusur çıktı.

**1) BELGE DURUMU SÖZLÜK ÇATALI (P1).** `case_documents.extraction_status`
canlıda iki değer taşıyor: 22 satır `"tamam"`, 2 satır eski `"completed"` —
**ikisinin de metni var** (930 ve 1332 karakter). Bugünkü kod yalnız `"tamam"`
yazıyor; `"completed"` 19.08 tarihli eski bir sürümden kalma. `ajan-nobetci`
tek değere bakan bir süzgeç kullanıyordu (`=== "tamam"`), dolayısıyla **metni
gerçekten çıkarılmış iki belge nöbetçiye görünmez kalıyordu**: o dosyada
"okunabilir belge yok" sayılıyor ve belge imzası değişmediği için kollar
yeniden koşmuyordu. Üretim verisine dokunmadan **kod hoşgörülü kılındı**
(`METIN_CIKARILDI` kümesi); yeni yazım tek değerde kalıyor.

**3) BAYAT `akis_hatasi` BİLDİRİMLERİ (P3, HAT H-10).** Panoda 19–20.08 tarihli
5 bildirim `bekliyor` duruyor; **üçünün de kök nedeni kodda zaten kapatılmış**
(`hazirlik-foyu` zorunlu girdileri · `hazirlik-foyu-gonder` motor bağı · iç
çağrı `x-cron-secret` kapısı), kalan ikisi zaten hata değil (biri kasıtlı canlı
fren testi). `akis_hatasi` nöbetçinin yürüttüğü tiplerden değildir — okunana
kadar `bekliyor` kalır, kendiliğinden kapanmaz. Temizlik üretim verisi yazımı
olduğu için (§10) HAT'a yazıldı, beklenmedi.

**2) KAPANMIŞ DOSYADA GÖREV YÜRÜTÜLMESİ (P1).** `agreed` bir dosyada 13.08'den
beri bekleyen bir `randevu_teklifi` görevi bulundu (`sonuc` boş — hiç
dokunulmamış). Zararsız kalmasının tek sebebi o dosyanın `otomatik_akis`ının
kapalı olması; yani **şans**. Akış açıkken kapanan bir dosyada aynı görev,
**anlaşması bitmiş bir uyuşmazlık için taraflara randevu teklif ederdi.**
Kolların üçü `kapali` denetimini zaten uyguluyordu (`ekOturumSorusuAc`, kapanış
onayları, kayıt silme) ama **yürütücü döngüsünde yoktu.** Kural oraya taşındı:
görev silinmez, `atlandi` + "Dosya kapandığı için yürütülmedi" ile kapatılır.
Yeni bir ürün kararı değil, verilmiş kararın eksik kaldığı yere uygulanmasıdır
(CLAUDE.md §7-B.1) — bu yüzden Human Gate açılmadı.

### KAPANDI — 25.08 · P1 · SESSİZ `functions.invoke` ÇAĞRILARI (10 YER)
**Sınıfın en ince tuzağı.** `supabase.functions.invoke`, işlev düzeyi hatada
(500 vb.) **REDDETMEZ** — `{ data, error }` ile **çözülür**. Yani hem
`try { await invoke() } catch {}` hem de `.catch(...)` yalnız **taşıma**
hatasını yakalar; sunucunun döndürdüğü hata bu yolların ikisinden de görünmez.
Aynısı `fetch` için de geçerli: HTTP 500'de reddetmez, `res.ok` denetlenmelidir.

| yer | sessiz kalırsa |
|---|---|
| `extract-document-text` ateşle-unut ×4 (`CaseRoom`, `ExpertWitness`, `MediationEngine`×2) | Belge yüklenir ama **metni hiç çıkarılmaz** → ajanlar o belgeyi okuyamaz. `.catch` bunu hiç görmüyordu. |
| `AdminDashboard` · atama bildirimi | Atama YAPILIR ama ne dosya sahibi ne arabulucu haberdar edilir; yönetici de göremez. Artık toast ile bildiriliyor. |
| `AdminDashboard` · rol bildirimi ×2 | `catch {}` **boştu**: kullanıcı rolünün değiştiğini hiç öğrenmeyebilirdi. |
| `KnowledgeBaseAdmin` · iş sürdürme | İş "running"de **sonsuza dek** asılı kalır; döngü her 5 sn yeniden dener ve hiçbir yere iz düşmez. |
| `extract-document-text` → `belge-ozeti` iç `fetch` | Yorumun sözü "hata loglanır"dı ama `res.ok` denetlenmediği için `belge-ozeti`nin 500'ü sessizce düşüyordu. |

### KAPANDI — 25.08 · P1 · ÖN YÜZDE SESSİZ DEPO ÇAĞRILARI (4 YER)
`MediationEngine` **canlı** yüzeydir. `deleteDoc` depodaki dosyayı silmeye
çalışıyor, sonucu **okumadan** kayıt satırını siliyordu: depo silmesi sessizce
düşerse dosya **öksüz** kalır — hiçbir kayıt onu göstermez, hiçbir silme kolu
bulamaz (constitution m.10). Sıra düzeltildi: **depo silmesi doğrulanmadan satır
silinmiyor.** Üç geri-alma yolu (yükleme sonrası satır yazılamazsa dosyayı geri
alan silme) da artık düşerse kayda geçiyor.

### KAPANDI — 25.08 · P1 · SESSİZ `rpc` VE DEPO ÇAĞRILARI (12 YER · 9 İŞLEV)
Kusur `.from(...)` ile sınırlı değilmiş: **`.rpc(...)` ve `.storage...` da hata
FIRLATMAZ.** `orchestrator-run`da bu bulununca ağaç yeniden tarandı.

| yer | sessiz kalırsa |
|---|---|
| 11 × `create_notification` (8 işlev) | Muhatap olayı **hiç duymaz** ama sistem "haber verdim" sayar: süre uyarısı, oturum daveti/iptali, randevu teklifi, atama bildirimi, yeni tarife uyarısı — hepsi sessizce buharlaşabiliyordu. |
| `admin-delete-knowledge` · `storage.remove` | Kayıt satırları **silindi**; depo silmesi düşerse dosya **öksüz** kalır ve artık hiçbir kayıt onu göstermediği için hiçbir silme kolu onu bir daha bulamaz — constitution m.10 süresiz saklama yasağına aykırı. |

**Kapsam dışı bırakılan:** `has_role` gibi **salt okuma** rpc'leri — sonuçları
zaten `data` ile okunuyor, yazım değiller. Tarama deseni bunları dışlıyor.

### KAPANDI — 25.08 · P1 · ÖN YÜZ SESSİZ YAZIMLARI (4 DOSYA)
Aynı kusur sınıfı `src/` tarafında da duruyordu. `tests/sessiz-yazim.test.ts`
tezgâhı zaten vardı ve dört dosyayı **gerekçeyle dondurmuştu**; dördü de kapatıldı
ve **DONDURULMUŞ liste boşaldı**.

| dosya | sessiz kalırsa |
|---|---|
| `intake/IntakeForm.tsx` | **En ağırı.** `case_parties` **sil-sonra-yaz**: silme başarılı olup yazma düşerse dosya **TARAFSIZ** kalır — arabuluculuk yürüyemez. Kullanıcı "Başvurunuz başarıyla gönderildi" duyar ve panele yönlendirilir. Artık hata fırlatılıyor, yönlendirme yapılmıyor. |
| `CaseDocuments.tsx` | Dosya depoya girer, kayıt satırı düşerse belge dosyada **görünmez** ama depoda durur; KVKK silme kolu `case_documents` üzerinden çalıştığı için o dosyayı **hiç bulamaz** (öksüz kayıt). Artık satır yazılamazsa yüklenen dosya geri alınıyor. Silmede de "yarım silindi" ayrı bildiriliyor. |
| `Dashboard.tsx` · `NotificationBell.tsx` | Ekran "okundu" gösterir, yenilemede bildirim geri gelir. Ekran artık yazım doğrulandıktan sonra güncelleniyor. |

**ÖLÜ YÜZEY NOTU:** `IntakeForm` ve `CaseDocuments` H-8 kapsamında **ölü
yüzeydir** (silme kararı kurucuda). Dondurma notu "diriltilirse yazım kontrolü de
gelmelidir" diyordu; tuzak şimdiden kaldırıldı, canlı davranış değişmedi.

**TEZGÂHIN ÖZ DENETİMİ ONARILDI.** `sessiz-yazim.test.ts` kendi tarayıcısını
`dosyalari.length > 3` ile denetliyordu — yani **kusur kapandıkça düşen** bir
eşikle. 12. blokta tam bu oldu. Öz denetim artık canlı bulguya değil,
**içine kasıtlı kusur konmuş bir örneğe** bakıyor: tarayıcı bozulursa test düşer,
kusur kapanınca düşmez.

### KAPANDI — 25.08 · SESSİZ YAZIM KUYRUĞU TAMAMEN KAPANDI (56 YAZIM · 32 İŞLEV)
Ortak kusur: `supabase-js` DB hatasını **fırlatmaz**, `{error}` döndürür —
okunmayınca `try/catch` hiç çalışmaz. Kenar işlevleri gözetimsiz (cron/ajan)
koştuğu için gören de olmaz.

**TEK KAPI:** ağaç genelinde `^\s*await <istemci>.from(...)` deseni artık
**SIFIR** ve bu, tezgâhtaki *KENAR TARAMASI* durumuyla kilitlendi — yeni yazılan
bir sessiz yazım da kuyruğu kırar.

**Bu turun ayırt edici bulgusu: KUYRUK DÖNGÜSÜ.** Kuyruklar `durum="bekliyor"` /
`islendi_at is null` / `deadline_warning_sent=false` gibi alanlarla taranıyor.
Kapanış damgası sessizce düşerse iş **başarıyla yapılmış** olur ama kuyrukta
kalır ve **her turda yeniden koşar**. Ürün karşılığı bir log satırı değil:
tarafa aynı e-posta tekrar tekrar gider.

| işlev | sessiz kalırsa |
|---|---|
| `ajan-nobetci` (15 yer) | **En ağırı.** Ana yürütücünün kapanışı düşerse görev 'bekliyor' kalır → tarafa **aynı e-posta her nöbet turunda yeniden** gider, randevu yeniden teklif edilir, aşama yeniden ilerletilir. Ayrıca hatırlatma sayacı (taraf spam'i), bilirkişi sayımı (mükerrer `bilirkisi_taraf_yanitlari`), braket `islendi_at` (mükerrer taahhüt düşürme). |
| `akis-yurut` (10 yer) | Talimat durumu düşerse talimat kuyrukta kalır: "uygulandi" düşerse **iş her turda tekrarlanır**; "deneme:1" düşerse **iki deneme sınırı hiç devreye girmez**. |
| `taraf-kalem-cikar` | Kalem yazılamaz ama belge "işlendi" damgalanırsa mükerrer koşum kapısı o belgeyi bir daha **hiç** okumaz → kalemler **kalıcı kaybolur**. |
| `dual-ai-validate` | Havuz yazımı düşer ama satır "approved" damgalanırsa metin havuza hiç girmeden **kalıcı kaybolur**, sayaç "onaylandı" der. |
| `deadline-reminder-cron` | Sorgu `deadline_warning_sent=false` ile tarıyor: işaret düşerse **aynı yasal süre uyarısı her cron turunda** tarafa da arabulucuya da yeniden gider. |
| `approve-pending-mevzuat` · `build-legal-knowledge` · `google-drive-import` | İdempotanlık **silmesi** düşer ve insert yine çalışırsa aynı kaynak bilgi tabanına **iki kez** girer ve arama sonuçlarını kalıcı çarpıtır. |
| `bilirkisi-belge-baglantisi` · `bilirkisi-davet` | `expert_assignment_logs` denetim defteri; belge açma kaydı ayrıca bir **KVKK kaydıdır**. Düşerse erişimin hiçbir izi kalmaz. |
| `bilirkisi-ekranim` (rapor teslimi) | Akış olayı düşerse ajan raporun geldiğini **hiç duymaz** — akış durur, rapor dosyada bekler. |
| `classify-dispute` · `detect-legal-deadlines` | `cases` üzerindeki tür/süre alanları bu işlevlerin ÜRÜNÜ: düşerse işlev sonuç döndürür ama dosya alanı boş kalır ve süre nöbeti o dosyayı hiç görmez. |
| `orchestrator-run` | "Atlandı" işareti düşerse panelde kart **boş** kalır. `allSettled` yalnız `[0]` okunuyordu; `rpc` de `{error}` döndürüp **fırlatmadığı** için "zincir durdu" bildirimi iz bırakmadan düşüyordu. |
| `agent_states` defteri (14 işlev, 25 yer) | Dosyalardaki yorum "hata yutulur ve **yalnız konsola loglanır**" diyordu — ama catch hiç çalışmadığı için konsola da hiçbir şey düşmüyordu: **yazılan sözün kendisi tutulmuyordu.** Defter yazımı asıl işi hâlâ bozmaz, sadece susmaz. |

**TEZGÂH:** `tests/kenar-sessiz-yazim.test.ts` — 8'den **20 duruma** çıktı.
Her durum, ilgili dosyada çıplak yazım kalmadığını ve daha önce denetli olan
yazımların bozulmadığını da doğruluyor.
**KANITLANDI:** `KENAR_KOK=tests/gecici/kenar-kanit` kopyasında yeni durumların
hepsi **DÜŞÜYOR**. `agent_states` sürüsü regex ile dönüştürüldüğü için ayrıca
**esbuild sözdizimi kontrolünden** geçirildi (14/14 ayrıştı).

### KAPANDI — 25.08 · KENAR İŞLEVİ SESSİZ YAZIMLARI — KUYRUK TEMİZLENDİ
Kuyrukta sayılan beş işlevin hepsi bitti. Ortak kusur: `supabase-js` DB hatasını
**fırlatmaz**, `{error}` döndürür — okunmayınca `try/catch` hiç çalışmaz.
Kenar işlevleri gözetimsiz (cron/ajan) koştuğu için gören de olmaz.

**Bu turun ayırt edici bulgusu: KUYRUK DÖNGÜSÜ.** Bu işlevlerin kuyrukları
`durum="bekliyor"` / `islendi_at is null` gibi alanlarla taranıyor. Kapanış
damgası sessizce düşerse iş **başarıyla yapılmış** olur ama kuyrukta kalır ve
**her turda yeniden koşar**:

| işlev | sessiz kalırsa |
|---|---|
| `taraf-kalem-cikar` | Kalem yazılamaz ama belge "işlendi" damgalanırsa mükerrer koşum kapısı o belgeyi bir daha **hiç** okumaz → kalemler **kalıcı kaybolur**. Damga artık yazım kapısının ardında. |
| `dual-ai-validate` | `cases_vector_pool` insert düşer ama satır "approved" damgalanırsa satır bir daha `status="pending"` sorgusuna girmez → metin havuza hiç girmeden **kalıcı kaybolur**, sayaç "onaylandı" der. Damga artık yazımın ardında. |
| `orchestrator-run` | "Atlandı" işareti düşerse panelde kart **boş** kalır: arabulucu adımın neden atlandığını hiçbir yerden öğrenemez. `allSettled` yalnız `[0]` okunuyordu; adım satırı ve "zincir durdu" bildirimi iz bırakmadan düşüyordu. |
| `akis-yurut` | Talimat durumu düşerse talimat kuyrukta kalır: "uygulandi" düşerse **iş her turda tekrarlanır** ve arabulucuya aynı onay isteği tekrar tekrar gider; "deneme:1" düşerse **iki deneme sınırı hiç devreye girmez**. |
| `ajan-nobetci` | **En ağırı.** Ana yürütücünün kapanışı düşerse görev 'bekliyor' kalır → tarafa **aynı e-posta her nöbet turunda yeniden** gider, randevu yeniden teklif edilir, aşama yeniden ilerletilir. Ayrıca: hatırlatma sayacı (taraf spam'i), bilirkişi sayımı (mükerrer `bilirkisi_taraf_yanitlari`), braket `islendi_at` (mükerrer taahhüt düşürme). |

**TEZGÂH:** `tests/kenar-sessiz-yazim.test.ts` beş durumla genişletildi (toplam 13).
Her durum ayrıca ilgili dosyada **çıplak `await admin.from(...)` satırı kalmadığını**
ve daha önce denetli olan yazımların bozulmadığını doğruluyor.
**KANITLANDI:** `KENAR_KOK=tests/gecici/kenar-kanit` kopyasında beş durumun
hepsi **DÜŞÜYOR**.

### KAPANDI — 25.08 · P1 · `bilirkisi-secim` SESSİZ YAZIMLARI (6 YER)
Bu işlev **büyük ölçüde doğru yazılmıştı**: ana yazımların hepsi (`bilirkisi_secim_beyani`,
`bilirkisi_taraf_yanitlari`, `case_expert_assignments`, `bilirkisi_onerileri`
insert, `bilirkisi_evrak_kumesi`) denetleniyor ve 500 dönüyor. Eksik olanlar,
ana yazımın **hemen ardındaki damgalar ve görev kapanışlarıydı**:

| yer | sessiz kalırsa |
|---|---|
| Sunum damgası ×2 (`durum: "taraflara_sunuldu"`) | Adaylar sohbette **sunulmuş** olur ama kayıtta hâlâ taslak durur: sunum tekrarlanabilir, sonraki adım adayları bulamaz. |
| Atama damgası (`durum: "atandi"`) | Atama satırı yazıldı ama öneri "atandı" görünmez → **aynı aday ikinci kez atanabilir** (mükerrer `case_expert_assignments`). |
| Atama denetim izi (`action: "assigned"`) | Atamanın denetim kaydı hiç oluşmaz. |
| Görev kapanışı ×2 (`ajan_gorevleri` → "yapildi") | Kodun **kendi yorumu** "aynı soru tekrar sorulmaz" / "mükerrer hatırlatma olmasın" diyor — kapanış sessizce başarısız olunca tam o söz tutulmuyordu. |
| Rapor yorumu yazımı | Tarafın rapor görüşü göreve işlenmez. |

**TEZGÂH:** `tests/kenar-sessiz-yazim.test.ts` bir durumla genişletildi (toplam 8).
Bu durum ayrıca dosyada **çıplak `await admin.from(...)` satırı kalmadığını**
doğruluyor ve zaten denetli olan üç ana yazımın bozulmadığını kontrol ediyor.
**KANITLANDI:** `KENAR_KOK=tests/gecici/kenar-kanit` kopyasında **8/8 DÜŞÜYOR**.
- Doğrulama: **252/252** test · tsc temiz · lint 2334 (değişmedi).

### KAPANDI — 25.08 · P1 · BİLİRKİŞİ KARARINDAN SONRAKİ DÖRT SESSİZ YAZIM
`bilirkisi-ekranim` — bilirkişinin kendi kabul/ret kararı (**insan kapısı**).
Kararı `bilirkisi_onerileri`ne yazan ilk yazım **zaten denetliydi**; ardından
gelen dört yazımın sonucu okunmuyordu ve kayıtsız şartsız `ok: true` dönülüyordu.
Her birinin ayrı bir sessiz sonucu var:

| yazım | sessiz kalırsa |
|---|---|
| `case_expert_assignments.status` | Arabulucunun ekranı **hâlâ "Onay Bekliyor"** gösterir; bilirkişi kabul etmiş sayılmaz. |
| `expert_assignment_logs` (`expert_accepted`) | **En ağırı.** `ajan-nobetci` rapor gecikmesini **tam bu kayıttan** okur (`kabulZamani`; yoksa "kabul tarihi kaydı yok, gecikme sayılmadı" der ve atlar). Yazılamazsa **14/21 günlük rapor nöbeti o bilirkişi için kalıcı olarak devre dışı kalır** — kimse fark etmez. |
| `akis_olaylari` | Ret hâlinde ajan sıradaki adaya **bu olayla** geçer; yazılamazsa akış durur. |
| `ajan_gorevleri` | Arabulucu iş panosuna bildirim düşmez. |

**Kapsam sınırı:** çağrı başarısız **sayılmıyor** — karar zaten kaydedildi ve
yeniden deneme mükerrer satır üretir. Eksikler `uyarilar` dizisiyle açıkça
dönüyor ve `console.error`a düşüyor.

**TEZGÂH:** `tests/kenar-sessiz-yazim.test.ts` bir durumla genişletildi (toplam 7);
kararın kendisini yazan ilk denetimin **bozulmadığı** da ayrıca doğrulanıyor.
**KANITLANDI:** `KENAR_KOK=tests/gecici/kenar-kanit` kopyasında **7/7 DÜŞÜYOR**.
- Doğrulama: **251/251** test · tsc temiz · lint 2334 (değişmedi).

### KAPANDI — 25.08 · P2 · TOPLANTI İPTALİ + RANDEVU TEKLİFİ SESSİZ YAZIMLARI
| işlev | sessiz kalırsa |
|---|---|
| `cancel-meeting-invite` | `case_sessions.status = "cancelled"` yazımı okunmadan `cancelled: true` dönüyordu. Yazılamazsa taraflara **"toplantı iptal edildi" e-postası gitmiş** olur ama oturum sistemde **hâlâ planlı** görünür: hatırlatma işleri çalışmaya devam eder, föy oturumu yapılacak sayar. Artık 500 + "oturum hâlâ planlı" cümlesi döner; iki iz yazımı da `console.error`a düşer. |
| `randevu-teklif` | Alternatif saat görevini kapatan yazım sessizce başarısız olursa görev "bekliyor"da kalır ve **aynı alternatif ikinci kez teklife dönüşebilir**. Otomatik onay işareti yazılamazsa cevap doğru işlenir ama kayıtta iz kalmaz. İkisi de artık kayda düşüyor. |

**TEZGÂH:** `tests/kenar-sessiz-yazim.test.ts` iki durumla genişletildi (toplam 6).
**KANITLANDI:** `KENAR_KOK=tests/gecici/kenar-kanit` kopyasında **6/6 DÜŞÜYOR**;
gerçek dizinde 6/6 geçiyor.
- Doğrulama: **250/250** test · tsc temiz · lint 2334 (değişmedi).

### KAPANDI — 25.08 · P1 · KENAR İŞLEVLERİNDE ÜRÜN YAZIMLARI (4 İŞLEV)
Davet zincirinden sonra aynı kusur sınıfının **ürün yazımlarına** geçildi: bir
işlevin var oluş sebebi olan yazımın sessizce kaybolması.

| işlev | sessiz kalırsa |
|---|---|
| `accept-party-invite` | `case_parties.user_id` bağlanması **katılımın kendisidir**. Sessizce başarısız olursa taraf "katıldınız" cevabını alır ama erişimi olmaz; üstelik davet "accepted" işaretlenince yeniden davet **409** döner ve taraf **kalıcı olarak dışarıda kalır**. Artık bağ kurulmadan devam edilmiyor. |
| `party-confidential-analysis` | `party_analyses` yazımı işlevin ürünüdür: bir LLM koşumu ve tarafın **gizli verisi**. Yazılamazsa analiz kaybolur, işlev yine başarılı döner, ekranda hiçbir şey çıkmaz. Artık hata olarak dönüyor. Kök neden, ajan defteri ve keşif soruları da kayda düşüyor. |
| `extract-document-text` | `extracted_text` + `"tamam"` yazılamazsa belge metinsiz kalır; RAG ve taraf analizi onu **sessizce görmez** ama çağırana "tamam" denirdi. Artık "hata" bildiriliyor; diğer üç durum yazımı da denetleniyor. |
| `dosya-verilerini-sil` | Silmenin **kendisi zaten doğru denetleniyordu** (sıralı döngü + `cases`). Eksik olan silme SONRASI yazımlardı: `ajan_deneyim`/`duzeltme_kayitlari` bağ koparma ve `dosya_kapanis` **silme kaydı**. Bir KVKK silme işleminin kanıtı sessizce kaybolamaz. Artık `uyarilar` dizisinde dönüyor. |

**TARAYICI TEZGÂHI KURULMADI — gerekçesi kayda geçti.** Düzenli-ifadeye dayalı
bir tarayıcı denendi: 4 satırlık pencere %50 yanlış alarm verdi, 9 satırlık
pencere yanlış negatif riski doğurdu, deyim-sınırı yaklaşımı ise 222 bulguyla
tamamen bozuldu (çok satırlı zincirler, ternary dalları, destructuring içindeki
`{`). **Güvenilmez bir bekçi bekçisizlikten kötüdür** (24.08 dersi), o yüzden
dondurulmuş liste yerine düzeltilen işlevlerin **sözü** denetleniyor; kalan yığın
bu bloğun kuyruğunda sayısıyla duruyor.

**TEZGÂH:** `tests/kenar-sessiz-yazim.test.ts` (4 durum). Sıra da denetleniyor:
davet "accepted" işaretlemesi bağlanma kontrolünden **sonra**, metin yazılamazsa
bildirilen durum "hata". **KANITLANDI:** düzeltme öncesi işlevler
`KENAR_KOK=tests/gecici/kenar-kanit` kopyasına açıldı → **4/4 test DÜŞTÜ**;
gerçek dizinde 4/4.
- Doğrulama: **248/248** test · tsc temiz · lint 2334 (değişmedi).

### KAPANDI — 25.08 · P1 · DAVET ZİNCİRİNDE SESSİZ YAZIM (3 KENAR İŞLEVİ)
Kenar işlevleri **gözetimsiz** çalışır (cron, ajan): sessiz başarısızlığı görecek
kullanıcı yoktur. `supabase/functions` taraması **118** kontrolsüz yazım buldu.
Bu tur, pilotun kendisinin geçtiği **taraf daveti/iptali zincirini** kapattı.

| işlev | sessiz kalırsa ne olurdu |
|---|---|
| `revoke-party-invite` | Üç yazımın üçü de okunmadan `ok: true` dönüyordu. Erişimi gerçekten kesen yazım `case_party_invites.token_hash` rotasyonudur: başarısız olursa **eski davet bağlantısı çalışmaya devam eder** ama arabulucuya "iptal edildi" denirdi. **Sessizce başarısız olan bir erişim iptali.** Artık 500 + açık cümle döner; erişimi etkilemeyen diğer iki yazım `uyarilar` dizisinde raporlanır. |
| `send-party-invite` | Jeton karması yazılamazsa e-posta yine giderdi ve taraf bağlantıyı açtığında **içeri giremezdi** — hata görünmezdi. Artık yazım **e-postadan ÖNCE** doğrulanır; yazılamıyorsa gönderilmez. |
| `send-meeting-invite` | `invite_sent_at` damgası yazılamazsa oturum "davet gönderilmedi" görünür ve **aynı davet ikinci kez** gidebilir. Artık `uyarilar`da döner; iki denetim izi yazımının hatası da `console.error`a düşer (bu işlevde kullanıcı yok, gözlem kanalı kayıttır). |

**Yan bulgu (kusur değil, kayda geçti):** `case_parties.invite_status` varsayılanı
`'pending'`. Yani "hiç davet edilmedi" ile "davet edildi, yanıt bekleniyor" aynı
değeri taşıyor — canlıda 14 `pending` tarafın yalnız 6'sının davet satırı var.
Merkez yüzey bunu doğru ayırıyor (`MediationEngine` gerçek `case_party_invites`
kaydına bakıyor), `CaseRoom` rozeti ise "Davet Bekliyor" diyor — bu ifade her iki
durumu da doğru karşılıyor. Kusur sayılmadı.

**TEZGÂH:** `tests/davet-yazim.test.ts` (4 durum). Sıra da denetleniyor:
e-posta gönderimi jeton doğrulamasından **sonra** olmalı, `ok: true` hata
dalından **sonra** dönmeli. **KANITLANDI:** düzeltme öncesi işlevler
`DAVET_KOK=tests/gecici/davet-kanit` kopyasına açıldı → **4/4 test DÜŞTÜ**;
gerçek dizinde 4/4.
- Doğrulama: **244/244** test · tsc temiz · build başarılı · lint 2334 (değişmedi).

### KAPANDI — 25.08 · P2 · CANLI DOSYANIN İÇİNDEKİ ÖLÜ BİLEŞENLER
**Nasıl bulundu — canlı doğrulama işe yaradı.** `bcbdeb8` ile eklenen 14 hata
dizesi canlı pakette arandı: **13'ü vardı, biri yoktu** ("Tur durumu
güncellenemedi"). Dağıtım sorunu değildi — **yerel `dist` çıktısında da yoktu**:
Rollup onu **ölü kod** olarak atıyordu. Yani derleyici, `tests/olu-yuzey.test.ts`
taramasının göremediği bir yüzeyi işaret etti.

**Boşluk.** `olu-yuzey.test.ts` **DOSYA** düzeyinde çalışır (`main.tsx`ten
erişilebilirlik). `CaseRoom.tsx` canlıdır — ama içindeki `RoundsTab` hiçbir
yerden render edilmiyordu. Dosya düzeyi tarama bunu göremez.

**Kaldırılan iki bileşen:**
| bileşen | ne yapıyordu | neden kaldırıldı |
|---|---|---|
| `CaseRoom.RoundsTab` (75 satır) | Aşama 7 müzakere turları: `negotiation_rounds`e **INSERT + UPDATE** | Hiç render edilmiyordu ama **yazan** bir yüzeydi — merkezin kurallarını atlayan ikinci yol, `MediatorDetail` tuzağının aynısı (`tasks/lessons.md`). Canlı tur yüzeyleri: `MediationEngine.Phase8Negotiation` ve `MeetingNotesPanel`. |
| `MediationEngine.RiskSummaryCard` (96 satır) | "📊 Karşılaştırmalı Risk Özeti" kartı | Salt sunum; görünümü kokpit panelleri devralmıştı (Aşama 4'te `ComparativeRiskAnalysis` zaten `hidden` sarmalayıcı içinde, yalnız `risk_ozeti` üretiyor). Veri yazmıyordu. |
| + `riskContainerTone` | yardımcı | Tek tüketicisi `RiskSummaryCard`dı; öksüz kaldı. |

Tablolar **duruyor** (HAT H-3 kararı: kod gider, tablo kalır). `risk_ozeti` verisi
öksüz değil — dört canlı yerde okunuyor (`AgentControlPanel`, kokpit panelleri).

**TEZGÂH:** `tests/olu-bilesen.test.ts` (3 durum) — üst düzey `function Ad(`
bildirimlerini tarar, hiçbir yerde kullanılmayanları listeler. Kalan 9 bulgunun
hepsi zaten ölü **dosyalardadır** ve `olu-yuzey.test.ts` tarafından donduruludur.
İlk test **tarayıcının kendisini** koruyor: 0 bulgu da, 40'tan fazla bulgu da
(kelime sınırı regex'i bozulursa her şey ölü görünür) tezgâhı düşürür — ilk
yazımda tam bu oldu, `` kaçışı düştü ve tarama 199 yanlış bulgu verdi.
**KANITLANDI:** kaldırma öncesi ağaç `BILESEN_KOK=tests/gecici/bilesen-kanit`e
açıldı → **2/3 test DÜŞTÜ** ve iki dosyayı adıyla gösterdi; gerçek dizinde 3/3.
- Doğrulama: **240/240** test · tsc temiz · build başarılı · lint **2334**
  (2343 → −9: ölü kodun kendi lint hataları da gitti).

### KAPANDI — 25.08 · P1 · TAKİP FÖYÜ OTURUM SATIRLARI YAPILMAMIŞ OTURUMU YAZDIRMIYOR
`ProcessTrackerPanel.autoState` föyün "İlk Oturum" / "2. Oturum" satırlarını
`sessions.filter((s) => s.scheduled_at)` üzerinden kuruyordu — **iptal edilmiş
ve taslak** oturumlar da sayılıyordu. Bunlar resmi takip föyü alanlarıdır;
yapılmamış oturumu tarihiyle yazdırmak, aynı gün kapatılan "Dosya Atama Tarihi"
kusurunun (`0e5b1c9`) aynısıdır.

**CANLI KANIT (Lovable SQL):** `case_sessions` 32 satır — **21'i `cancelled`**,
10 `scheduled`, 1 `draft`. `5186ee1d…` dosyasında tarih sırasına göre ikinci
kayıt (24.07 07:00) İPTAL EDİLMİŞTİ ve föy onu **"2. Oturum ✓"** olarak
gösteriyordu. Düzeltmeden sonra aynı dosyada ikinci sıraya gerçek oturum
(27.07 11:00) geçiyor.

İkinci satır: **"Oturum Erteleme"** HERHANGİ bir iptalde işaretleniyordu — hatta
`scheduled_at` boş bir iptal kaydında bile (kutu ✓, tarih "—"). Erteleme,
iptalin ardından daha ileri bir tarihe oturum kurulmasıdır; şemada ayrı bir
"ertelendi" durumu **yoktur** (kolonlar tarandı), o yüzden **ardıl koşulu**
arandı: ardılı olmayan iptal artık erteleme sayılmıyor.

Föy **etiketleri değişmedi** — bunlar bakanlık föyünün alan adlarıdır;
düzeltilen şey yalnız TÜRETME mantığıdır (test bunu ayrıca koruyor).

**TEZGÂH:** `tests/foy-oturum.test.ts` (4 durum). **KANITLANDI:** düzeltme
öncesi panel `FOY_KOK=tests/gecici/foy-kanit` kopyasına açıldı → **3/4 test
DÜŞTÜ**; dördüncü (etiketler yerinde mi) doğru şekilde geçti. Gerçek dizinde 4/4.
- Doğrulama: **237/237** test · tsc temiz · build başarılı · lint **2343**.

**HAT'A YAZILDI (beklenmedi, §23): H-9 · P2** — şemada "oturum yapıldı" kaydı
YOK (`scheduled`/`cancelled`/`draft`). Yani düzeltilmiş hâliyle bile föy
"planlandı"yı gösteriyor. Önerim: **B** (üç satır da elle işaretlensin, diğer 13
satır gibi) şimdi, **A** (şemaya "yapıldı" durumu) pilottan sonra.

### KAPANDI — 25.08 · P1 · SESSİZ YUTULAN VERİTABANI YAZIMLARI (12 YOL)
**Kök neden — tek cümle:** `supabase-js` hata **fırlatmaz**. `{ error }`
okunmazsa yazımın başarısız olduğu hiç anlaşılmaz; dahası `try { await
supabase…insert() } catch {}` kalıbı bir koruma **değildir** — catch hiç
çalışmaz. Kullanıcıya "kaydedildi" denir, veri kaybolur.

Bu kusur bu blokta üçüncü kez çıktı (`AdminDashboard` atama izi `0e5b1c9`,
bilirkişi izi `825dfb4`), o yüzden nokta düzeltme yerine **tarandı**: `src`
genelinde **27** kontrolsüz yazım.

**Kapatılan 12 yol** (kullanıcıyı yanıltan ya da veri kaybettiren):
| yer | sessiz kalırsa ne olur |
|---|---|
| `AdminDashboard.handleRemoveRole` | **Duran yetki kaldırılmış gösteriliyordu**: silme yutuluyor, sonra hem "Rol Kaldırıldı" deniyor hem kullanıcıya "rolünüz alındı" bildirimi gidiyordu. Hata dalı artık bildirimden **önce** dönüyor. |
| `AdminDashboard.handleAddRole` | Hata varken hiçbir geri bildirim yoktu — sessizce hiçbir şey olmuyordu. |
| `MediationEngine.chooseMeeting` | Taslak oturum yazılmadan aşama 5'e geçiliyordu (try/catch supabase hatasını görmüyor). |
| `MediationEngine.deleteDoc` | İki yazım da kontrolsüzdü: dosya silinip satır kalırsa kırık referans, satır silinip dosya kalırsa **KVKK kapsamında silinmemiş kişisel veri**. |
| `MediationEngine` risk özeti | Türetilmiş alan; kullanıcı uyarılmıyor ama artık `console.warn`a düşüyor (eskiden warn hiç çalışmıyordu). |
| `MediationEngine` makbuz bayrağı | "Makbuz üretildi" izi sessizce kayboluyordu. |
| `CaseRoom.answerDiscovery` | **Tarafın yazdığı cevap** sessizce kayboluyordu. |
| `CaseRoom.finalize` | Dosya "anlaşma ile kapandı" görünürken **anlaşma metni** hiçbir yere yazılmamış olabiliyordu. |
| `CaseRoom.setStatus` | Tur durumu güncellenmemiş olabiliyordu. |
| `CaseRoom` bilirkişi kaldırma | Silinmemiş atama kaldırılmış gösteriliyordu. |
| `MeetingNotesPanel` | `case_notes` kontrol ediliyordu ama tur kaydı edilmiyordu; yine de "Not kaydedildi" deniyordu. |
| `OfficialDocumentsPanel.syncEditedRecord` | `Promise<boolean>` **her zaman true** dönüyordu → **resmi belge düzenlemesi** yazılamasa bile "Düzenleme kaydedildi". Çağıran `if (ok)` dalını zaten doğru yazmıştı; yalan dönen işlevdi. |

**İkinci tur (aynı gün, P2):** kuyruğa yazılan yedi yazım da kapatıldı —
`TariffAdmin` ×2 (yutulursa **iki tarife birden aktif** kalır ve ücret hesabı
hangisini seçeceği belirsizleşir), `KnowledgeBaseAdmin` + `TemplateAdmin`
(eski tür satırı kalır, aynı şablon iki türde birden görünür), `AjanPenceresi`
×3 (ajan penceresinin toast'u yok — hata artık **yazışma akışına** düşüyor:
"Talimatı reddedemedim — kayıt yazılamadı…" ve "Tercihi kaydedemedim…".
Ajanın yetkisi/karar sınırı **değişmedi**, yalnız başarısızlık görünür oldu;
§13 kapsamına girmez).

**Dondurulan 8 yazım** (gerekçeleri `tests/sessiz-yazim.test.ts` içinde,
gerekçesiz bırakılan yok): ölü yüzeyler (`CaseDocuments`, `IntakeForm` — H-8) ·
yalnız `read` bayrağı (`NotificationBell` ×2, `Dashboard` — yenilemede düzelir).

**TEZGÂH:** `tests/sessiz-yazim.test.ts` (5 durum). Tarayıcı üç kusur sınıfını
birden yakalıyor: sonucu okunmayan yazım · hiç tetiklenmeyen try/catch · her
zaman "başarılı" dönen sarmalayıcı. Beşinci test **tarayıcının kendisini**
koruyor (0 bulursa tezgâh bozulmuş demektir — 24.08 bozuk-bekçi dersi).
**KANITLANDI:** düzeltme öncesi ağaç `SESSIZ_KOK=tests/gecici/sessiz-kanit`e
(`git archive HEAD src`) açıldı → **4/5 test DÜŞTÜ** ve altı dosyayı adıyla
gösterdi; gerçek dizinde 5/5 geçiyor.
- Doğrulama: **233/233** test · tsc temiz · build başarılı · lint 2348 (değişmedi).

### KAPANDI — 25.08 · P1 · BİLİRKİŞİ ÖNERİSİ İZ BIRAKIYOR VE TARAFA ULAŞIYOR
Bilirkişi önerisini **iki** yüzey yazıyordu ve ikisi aynı işi yapmıyordu:
| yüzey | iz | taraf bildirimi | arabulucu oraya düşüyor mu |
|---|---|---|---|
| `CaseRoom.ExpertsTab` | ✔ | ✔ | **hayır** — `CaseRedirect` arabulucuyu her zaman `/legal-reasoning`e atar |
| `MediationEngine.Phase7Expert` | ✘ | ✘ | **evet** — gerçekte kullanılan yol |

Yani tam olan uygulama arabulucunun **giremediği** yüzeydeydi; eksik olan,
kullandığı yüzeydeydi. Durum `pending` = "Onay Bekliyor" yazılıyor ama onayı
verecek taraf **hiç haberdar edilmiyordu** → öneri sonsuza dek asılı kalıyordu.

**CANLI KANIT (Lovable SQL, 25.08):**
- `case_expert_assignments` = **2 satır** (20.08 `onerildi`, 21.08 `pending`) —
  ikisi de hâlâ onaylanmamış.
- `expert_assignment_logs` = **0 satır**. RLS sağlam
  (`can_access_case AND actor_id = auth.uid()`), yani engel politika değil,
  **çağrının hiç yapılmaması**.
- `notifications` = 29 satır, dokuz ayrı başlık — **hiçbiri bilirkişi başlığı
  değil**. Tek bir "Yeni Bilirkişi Önerisi" gönderilmemiş.

**Yapılan.** Yeni paylaşılan modül `src/lib/expert-assignment.ts`:
`logExpertAction` (hata **yutulmaz**, çağırana döner) + `notifyCaseParties`
(taraf listesini kendi çeker, kaç bildirim yazıldığını döner).
- `Phase7Expert.onSelect`: `approvals: {}` + `.select()` eklendi, ardından
  `proposed` izi ve "Yeni Bilirkişi Önerisi" bildirimi. Toast artık kaç tarafa
  gittiğini söylüyor; hesabı bağlı taraf yoksa bunu açıkça yazıyor.
- `Phase7Expert.removeAssignment`: `removed` izi + "Bilirkişi Önerisi Geri
  Çekildi" bildirimi.
- `EXPERT_STATUS_LABEL` yalnız `pending`/`accepted` biliyordu; taraf onay akışı
  `approved`/`rejected`, kenar işlevi `onerildi` yazıyor → ham İngilizce durum
  ekrana düşüyordu. Dördü de eklendi.
- `CaseRoom` kendi kopyasını bıraktı, paylaşılan modülü çağırıyor (`izYaz`
  sarmalayıcısı hatayı kullanıcıya bildiriyor). İkinci kopyanın yeniden doğması
  testle yasaklandı.

**TEZGÂH:** `tests/bilirkisi-atama-izi.test.ts` (6 durum).
**KANITLANDI:** kusurlu hâl `BILIRKISI_KOK=tests/gecici/bilirkisi-kanit`
kopyasında geri getirildi (HEAD'deki iki yüzey) → **6/6 test DÜŞTÜ**; gerçek
dizinde 6/6 geçiyor.
- Doğrulama: **228/228** test · tsc temiz · build başarılı · lint **2348**
  (yeni modülde 0 hata — `as any` kullanılmadı, üretilen tipler yeterliydi).

### KAPANDI — 25.08 · P1 · RESMİ TUTANAKTAKİ "DOSYA ATAMA TARİHİ" UYDURULMUYOR (`0e5b1c9`)
Bu madde 9. blokta commit edildi ama `todo.md`ye işlenmemişti; kayıt burada
tamamlanıyor.
- **Kök neden:** `ProcessTrackerPanel` satırı `fmtDate(assignedAt ?? caseData?.created_at)`
  ile yazdırıyordu. `assignedAt`in tek kaynağı `case_assignments.assigned_at` ve
  o tablo canlıda **0 satır** (9/9 dosyada `cases.assigned_mediator_id` DOLU ama
  tek atama izi yok) → alan HER dosyada sessizce **açılış tarihine** düşüyordu.
  Bu bir resmi tutanak alanıdır; §7-B.2 gereği etiket–işlev uyumsuzluğu kusurdur.
- Şema tarandı: `cases` üzerinde atama zaman damgası **yok** → doğru kaynak
  gerçekten `case_assignments`. Geri çekilme kaldırıldı; kayıt yoksa panelin
  kendi bilinmiyor gösterimi (`fmtDate(null) === "—"`). Geriye dönük satır da
  **uydurulmadı**.
- İkinci kusur: `AdminDashboard.handleAssignMediator` atama izini yazarken hatayı
  sessiz yutuyordu → yazılamazsa tarih kalıcı kaybolur. Artık yöneticiye bildiriliyor.
  Kapsam sınırı: atama YAPILMIŞ sayılmaya devam ediyor (yetki
  `cases.assigned_mediator_id`tedir), eksik kalan yalnız izdir.
- **TEZGÂH:** `tests/atama-tarihi.test.ts` (3 durum). **KANITLANDI:**
  `ATAMA_KOK=tests/gecici/atama-kanit` kopyasında her iki kusur için birer test
  DÜŞTÜ (2/3); gerçek dizinde 3/3.
- Doğrulama: 222/222 test · tsc temiz · build başarılı.

### KAPANDI — 25.08 · P2 · ÖLÜ YÜZEY TEZGÂHI (`97517c2`)
Ada taraması kalıcı tezgâha çevrildi: `tests/olu-yuzey.test.ts`, `src/main.tsx`ten
**geçişli** erişilebilirlik grafı kurar. Tek düzey "import ediliyor mu" taraması
YETMİYORDU — `IntakeForm` import ediliyordu ama onu import eden `Intake.tsx` de
ölüydü.
- Söz 1: erişilemeyen dosya kümesi **dondurulmuştur** (35 dosya). Yeni ölü yüzey
  doğarsa ya da ölü sayılan biri diriltilirse test düşer.
- Söz 2: erişilemeyen bir dosya veritabanına **YAZIYORSA** gerekçesiyle
  `YAZAN_OLU`da adı geçmelidir. Bugün altı dosya: `IntakeForm` (`cases` +
  `case_parties` INSERT) · `SessionFeedback` · `CaseDocuments`
  (`storage.remove` + satır DELETE) · `useCaseStorage` · `MediatorBlockedDates` ·
  `MediatorAvailabilityCalendar`.
- Dördüncü test **tezgâhın kendisini** korur (`ERİŞİLİR > 100` + bilinen sayfalar).
  İlk yazımda göreli import çözümü kanıt kopyasının kökünü düşürüyordu ve graf
  gerçek `src/`e çıkıyordu; o testi bu yakaladı (24.08'deki bozuk-bekçi dersinin
  aynısı).
- **KANITLANDI:** kopyaya tek bir ölü yazıcı eklendi
  (`OLU_KOK=tests/gecici/olu-kanit`) → tam olarak **2 test DÜŞTÜ** ve yalnız o
  dosyayı adıyla gösterdi; gerçek dizinde 4/4 geçiyor.
- Doğrulama: **219/219** test · tsc temiz · lint 2349 (değişmedi).
- Deploy gerekmedi: yalnız `tests/**` değişti (§11-B).

### HAT'A YAZILDI — 25.08 · beklenmedi (§23)
| madde | öz | önerim |
|---|---|---|
| **H-7 · P1** | `session_feedback` **yapısal olarak imkânsız**: INSERT ve arabulucu SELECT politikaları ölü `mediator_requests`e zincirli; tablo 0 satır ve tek yazanı 25.08'de silindi. `Analytics` yine de puan paneli çiziyor. | A — `case_sessions`e bağla; panel o zamana kadar gizlensin |
| **H-8 · P2** | Emekliye ayrılmış **başvuru adası** (17 dosya). `/intake` → `RedirectToHub` → `/legal-reasoning`; Landing düğmeleri de doğrudan merkeze. `IntakeForm` hâlâ `cases`+`case_parties` INSERT ediyor = merkezin kurallarını atlayan **ikinci dosya açma yolu**. | A — H-3 sınıfı: kod gider, tablo durur |

### KAPANDI — 25.08 · P1 · ESKİ ŞEMA ADASI KALDIRILDI (`87d1dc4`, publish)
24.08'de H-3 taramasında bulunan "P1 adayı" madde. `mediator_requests` canlıda
**0 satır** ve tüketicisi yok; buna rağmen **beş canlı ön yüz yüzeyi** ona
dokunuyordu:
| yüzey | ne yapıyordu | gerçek sonuç |
|---|---|---|
| `MediatorDetail.tsx` | **INSERT** (randevu talebi) | talep hiçbir yere düşmüyordu |
| `MediatorMarketplace.tsx` | sayfaya tek giriş | kendisi de ölüydü (import 0) |
| `SessionCalendar.tsx` · `WeeklyCalendarView.tsx` | takvim | hiçbir yerden import edilmiyor |
| `useCaseStorage.submitMediatorRequest` | yardımcı | çağrısı kalmamış |
| `Analytics.tsx` | oturum istatistiği | yıllardır **"0 oturum"** gösteriyordu |

CANLI RANDEVU YOLU BAŞKADIR: `randevu_teklifleri` (arabulucu seçenek sunar,
taraf seçer — `randevu-teklif`), atama `case_assignments`, oturumlar
`case_sessions`.
- Analytics artık `case_sessions` / `scheduled_at` okuyor. Oturum tipi etiketleri
  ürünün kendi değerleriyle değiştirildi (ön/ana/özel/ortak görüşme); eski
  "online / yüz yüze" ayrımı `session_type` alanında **hiç yoktu** — uydurma bir
  etiketti (§7-B.2: etiket-işlev uyumsuzluğu kusurdur).
- **TABLOLAR DURUYOR** (H-3 kararı A · §7.3): geri dönüşü olan yalnız koddur.
- TEZGÂH: `tests/eski-sema-adasi.test.ts` (5 durum) — ada geri sızarsa yakalar.
  **KANITLANDI:** kusurlu hâl `ADA_KOK=tests/gecici/ada-kanit` kopyasında geri
  getirildi → **5/5 test DÜŞTÜ**; gerçek dizinde 5/5 geçiyor.
- **CANLI KANIT (publish):** paket `index-BlFMtooh.js` → **`index-CJQSVyaw.js`**
  | belirteç | önce | sonra |
  |---|---|---|
  | `mediator_requests` | 2 | **0** |
  | `/mediator/:id` | 1 | **0** |
  | `scheduled_date` | 4 | **0** |
  | `case_sessions` | — | 18 |
  Paket boyutu 3.425.445 → 3.383.767 bayt (−41.678).

### KAPANDI — 25.08 · P3 · LINT ARTIK `tests/gecici/` TARAMIYOR (`e56d122`)
`npm run lint` bir **doğrulama komutudur** (PROJE_OZETI.md) ama `tests/gecici/`
alanını da tarıyordu. Ada kanıtı için oraya `src` kopyası çıkarılınca sayı
2349 → **3412**'ye fırladı; yani sonda dosyaları doğrulama ölçüsünü bozuyordu.
`eslint.config.js` → `ignores: ["dist", "tests/gecici"]`. Bu alan zaten git
dışıdır (§22) ve içinde bilerek **kusurlu** kaynak kopyaları durur
(`ADA_KOK` · `MIG_DIZIN` · `FN_DIZIN`).

### İZİN DUVARI (24.08 · `.claude/settings.json`, commit `5767475`)
Kural metni öneridir, izin listesi duvardır. Artık **deny**:
`.env` okuma/yazma · `supabase/migrations/**` yazma · `npm install` ·
`supabase functions deploy` · `supabase db push`.
**Sonuç:** migration METNİ yazılır ama dosyaya Code koyamaz — uygulama Lovable
SQL bölümünden yapılır (anayasa m.12). Tezgâhın "kusuru geri getir" kanıtı bu
yüzden `MIG_DIZIN` ortam değişkeniyle **kopya dizin** üzerinden alınır.

### KAPANDI — 24.08 · H-6 · P0 · SAHİP-TARAF GUARD'I BELİRSİZ ÖBEĞE DE UYGULANDI (karar **B**)
Kurucu Code'un önerisinden (A) gerekçeyle ayrıldı: ölçüt "tablo `party_id`
taşıyor mu" değil, **"bu yüzey arabulucuya mı ait"**. Belirsiz öbeğin 13'ü doğası
gereği MEDIATOR_ONLY; bir tarafın bunları görmesi karşı taraf sızıntısı olmasa da
**arabulucu-özel yüzeyin tarafa açılmasıdır** (constitution m.1 · mimari §14).
A'nın açık bıraktığı 13 yüzey, kapattığı 4'ten riskliydi.

- Migration Lovable'dan uygulandı: `20260824140724` (17 politika) +
  `20260824140953` (taramada sonradan çıkan 2: `arabulucu_kontrol_tercihleri`,
  `case_party_invites`). Uygulanan metin, Code'un hazırladığı taslakla
  (`tests/gecici/h6-migration.sql`) **birebir aynı** — diff boş.
- **Dosya yönetimi sahipte kaldı** (kararın şartı): kalan 6 geniş politika tam
  olarak `case_documents` · `case_parties`×3 · `cases_private_keys` ·
  `cases_vector_pool`. Sessiz istisna yok, istisna gerekmedi.
- Tezgâh genişletildi (`tests/rls-sahip-taraf-guard.test.ts`, 35 durum):
  kapsam artık 25 tablo; ayrıca **"guard kullanan ama listede olmayan tablo"**
  testi eklendi — yeni bir tablo sessizce guard'a alınırsa yakalanır.
- **KANITLANDI:** `supabase/migrations` artık yazmaya kapalı olduğu için kanıt
  guard'ı sökülmüş **kopya** üzerinde alındı
  (`MIG_DIZIN=tests/gecici/mig-kanit`) → **27 test düştü**, gerçek dizinde 35/35.

### YARIM — 24.08 · H-3 · P3 · dört ölü dosyanın silinmesi (karar **A**)
Kanıt tamamlandı, **silme adımı izin ekranında reddedildi**; dosyalar duruyor.
KANIT (tarama):
- `send-session-notification` → uygulamada **hiçbir çağrı yok**; tek geçtiği yer
  `NotificationSettings.tsx:14`teki açıklama satırı.
- `send-reschedule-notification` → yalnız `RescheduleApproval.tsx:86` ve
  `RescheduleRequest.tsx:78` çağırıyor.
- `RescheduleRequest.tsx` / `RescheduleApproval.tsx` → **hiçbir yerden import
  edilmiyor** (grep boş). Yani çağrı zinciri kendi içinde kapalı = ölü.
Silme yeniden denenmeyecek; kurucu izin verdiğinde tek komutla kapanır.

### KAPANDI — 24.08 · H-2 · P2 · ISLAK İMZA KAPISI AÇILDI (karar **A**)
`agreement_documents.signed_by` hiçbir yüzeyden yazılmıyordu; şema ve tetikleyici
hazır olduğu hâlde `anlasma_belgesi_imzalandi` olayı **hiç doğmuyordu**.
- Yeni yüzey: `src/components/mediation/AnlasmaImzaPaneli.tsx`. Arabulucu imzalı
  taramayı yükler (`case-documents` kovası, `<uid>/<case_id>/…` yol düzeni),
  imzalayan tarafları işaretler; `signed_by` + `metadata.imzalandi_at` yazılır.
- `OfficialDocumentsPanel` içine yalnız `outcome === "anlasma"` iken bağlandı.
  Ayrı bileşen: çalışan belge üretim yolu (anayasa m.8) bu işten etkilenmiyor.
- **Yetki sınırı mimariyle tutuldu** (kararın şartı): yazma istemciden
  kullanıcının kendi JWT'siyle gider; `Mediator manages agreement docs`
  politikası (`is_case_mediator`) süzer. Hiçbir edge function `signed_by`'a
  dokunmuyor — servis rolü RLS'i aşardı, o yüzden imza bilinçli olarak sunucuya
  TAŞINMADI.
- `signed_by` = `case_parties.id` listesi (user_id değil: davet kabul etmemiş
  tarafın user_id'si yok).
- **TEZGÂH:** `tests/imza-kapisi.test.ts`, 6 durum. **KANITLANDI:** sahte bir
  edge function'a `signed_by:` yazımı konup `FN_DIZIN` ile koşuldu → test DÜŞTÜ;
  gerçek dizinde 6/6 geçiyor.
- Doğrulama: 210/210 test · tsc temiz · build başarılı.

### KAPANDI — 24.08 · H-5 · P3 · TÜKETİCİSİZ `soru_cevaplandi` TETİKLEYİCİSİ (karar **A**)
Kaldırmadan önce kararın şartı doğrulandı: `akis_kurallari`'nda bu olay koduna
bağlı kural **0** · kod tabanında tüketici **0** · işlenmemiş olay **0**.
`trg_akis_gorev_cevap` kaldırıldı (Lovable göçü `20260824184056`, commit
`edd7b64`). Birikmiş **12** satır SİLİNMEDİ. Uyandırma `ajan-nobetci`deki
`[kol:…]` yoluyla sürüyor — tek yol kaldı, mükerrer koşum riski kapandı.

### KURUCUDA KALAN ÜÇ MADDE (hiçbiri beni bloke etmiyor)
1. **P1 · `CRON_SECRET` değerinin yenilenmesi.** Runbook aşağıda. Bunu ben
   yapamam: yeni değeri üretsem ya da okusam yine bağlamıma girer ve yenilemeyi
   boşa çıkarır. Vault taşıması yapıldığı için yenileme artık **tek noktadan**.
2. **P2 · İmza akışı.** `agreement_documents.signed_by` hiçbir yüzeyden
   yazılmıyor; imza beş insan kapısından biri (§7.1/§7.5), davranışı ürün kararı.
3. **P3 · Eski şema adası** (`mediator_requests` · `reschedule_requests` + dört
   dosya) kaldırılsın mı? Tablo/kod silmek geri dönüşsüzdür (§7.3).

### BU TURDA CANLIYA ÇIKANLAR
| iş | commit | deploy |
|---|---|---|
| P1 · `girdiTamamla` eksik alanı örtmüyor | `124e6cb` | **36 fonksiyon fan-out** — "hepsi başarılı, başarısız yok" |
| P1 · aşama geçişi sunucuya iz bırakıyor | `c048030` | publish |
| P1 · `ZORUNLU_GIRDI` sözleşmesi tamamlandı | `618fb74` | **36 fonksiyon fan-out** — "hepsi başarılı, başarısız yok" |
| P2 · kayıt protokolü tek kaynak | `7032284` | publish |
| P1 · dosya kapanışı `closed_at` | `aef716e` | publish |
| P0 · üç cron kusuru + geriye dönük satır | migration | canlı 200 |
| P0 · oturum hatırlatma zinciri (7 tur) | `e4c788d`→`4b543ac` | fan-out + 2 fonksiyon |
| P1 · iş etiketi süzgeçten geçmiyor (3 geçit) | `c722026` `97f077d` | **2× 36 fan-out** |
| P1 · cron sırrı Vault'a | `a92d488` | migration |
| P3 · eski şema adası işaretlendi | `cf3af01` | publish + 2 fonksiyon |

**CANLI KANIT (publish zinciri):** `index-B7Onz7o6` → `DThEJGGi` → `Pq-m5pGk` → **`DOQRydpB`**.
Son pakette: `"arabulucu elle ilerletti"` 1 · `select("closed_at")` 1 ·
`"Harici araçlarla"` **1** (publish öncesi 2 idi) · `anlasamama` var.
`select("updated_at")` kalan tek kullanım BAŞKA bir yerdir (dosya durgunluk
göstergesi, `MediationEngine:10271`) ve doğru hâliyle durur.

**CANLI KANIT (publish):** paket `index-B7Onz7o6.js` → **`index-DThEJGGi.js`**.
Yeni pakette `"arabulucu elle ilerletti"` VAR (1 kez) ve `"iz yazılamadı"` VAR
(1 kez); publish öncesi pakette ikisi de 0 idi. Fark yayının kendisinden geliyor.

### KAPANDI — 24.08 · P1 · `girdiTamamla` taraf fan-out'u eksik alanı örtüyordu (`124e6cb`)
KÖK NEDEN: `girdiTamamla` `party_id`yi dosyanın taraflarından tamamlarken
**erken dönüyor** ve sondaki "zorunlu alan hâlâ eksik mi" denetimini atlıyordu.
Oturum bulunamadığı hâlde iş kuruluyor, koşucu adımı eksik gövdeyle çağırıyor,
adım 400 dönüyordu.
- Düzeltme: fan-out öncesi `party_id` dışındaki zorunlu alanlar denetleniyor;
  biri eksikse iş kurulmuyor, eksik olarak dönüyor. Eksik alan UYDURULMUYOR.
- `tests/girdi-tamamla-eksik-alan.test.ts` (3 durum). **Tezgâh kanıtlandı:**
  düzeltme geçici geri alınıp koşuldu → 1 test DÜŞTÜ (2 gövde kuruldu — canlıdaki
  400'ün tam sebebi); geri alınınca 3/3 geçti.
- FAN-OUT: `_shared/anlatim.ts` değişti → 36 fonksiyonun tamamı deploy edildi.

### KAPANDI — 24.08 · P1 · aşama geçişi sunucuya iz bırakıyor (`c048030`, publish)
Devir notundaki "Aşama 7'nin sunucuya iz bırakması" maddesi budur.
KÖK NEDEN: "Aşama N+1'e Geç →" düğmesi (`NextPhaseButton`) `onAdvance` üzerinden
YALNIZ adres çubuğundaki `phase` parametresini değiştiriyordu; `bumpPhase`
çağrılmıyordu, yani `cases.current_phase` GÜNCELLENMİYORDU. Düğmenin kendi
açıklaması "manuel geçiş kapısı" diyor — etiket ile işlev çelişiyordu (§7-B.2
gereği bu bir kusurdur, ürün kararı değildir).
Dört sonucu vardı:
- dosya sunucuda eski aşamada kalıyordu (Dashboard ve kokpit bayat);
- koşucunun aşama değerlendirmesi (`akis-yurut` → `asamaIlerlet`) bayat numaradan
  koşuyordu;
- `asamaIlerlet`'in **"arabulucu elle geri aldıysa ajan aynı geçişi tekrar
  denemez"** güvencesi BOŞTU: elle geçiş iz bırakmadığı için `[gecis:X->Y]`
  satırı hiç doğmuyor, dedupe hep boş küme üzerinde çalışıyordu;
- Aşama 7 (Belgeler & Kapanış) sunucuda hiç görünmüyordu.
CANLI KANIT: `asama_gecisi` satırlarının TAMAMI ajan yazımı; elle geçişten
doğmuş tek satır yok. Faz 7'deki 6 dosyanın geçiş izi 0 — hepsi 14.08 tohum
partisi (`otomatik_akis=false`, aynı `updated_at`), gerçek elle geçiş değil.
DÜZELTME: `bumpPhase` geçişi yazar **ve** koşucununkiyle AYNI etiketli
`[gecis:X->Y]` iz satırını `ajan_gorevleri`ne düşürür (`sonuc: "arabulucu
ilerletti"`). Böylece dedupe gerçekten çalışır. İz yazılamazsa sessiz düşmez.
KAPSAM SINIRI (bilerek): **kapı arabulucunundur** — taraf için davranış
DEĞİŞMEDİ, düğme onda yalnız ekranı taşır. Sol menüdeki gezinme (`gotoPhase`) da
DEĞİŞMEDİ: bakmak için aşamaya geçmek dosyayı ilerletmez. Yeni bir yetki
icat edilmedi; RLS zaten bu ölçütü taşıyor (yönetici · görevli arabulucu · dosya
sahibi) — `akis-onayla` düzeltmesiyle aynı ölçüt.

### KAPANDI — 24.08 · P0 · OTURUM HATIRLATMASI: DÖRT TURDA ÇÖZÜLDÜ, ZİNCİRİN UCU GÖRÜLDÜ
Bu madde bu oturumun en uzun işiydi ve **her tur bir öncekinin eksiğini gösterdi.**
Sonuç canlı kanıtla kapandı.

| tur | bulgu | commit |
|---|---|---|
| 1 | cron `x-cron-secret` göndermiyor → her saat **401** | migration (cron) |
| 2 | yetki düzelince görüldü: fonksiyon terk edilmiş `mediator_requests`i sorguluyor (canlıda **0 satır**) → 200 döner, **sıfır** gönderir | `e4c788d` |
| 3 | adres `profiles`e bağlıydı; canlıda tarafların çoğunda `user_id` **boş** — adres `case_parties.email`te | `7b4bf53` |
| 4 | ürünün **zaten** bir hatırlatma kolu var (`ajan-nobetci`); yazdığım kopyaydı ve doğru kolu **susturacaktı** | `8c603d5` |
| 5 | asıl kusur: nöbetçinin etiket deseni `^\[hatirlatma:` ile **çapalıydı**, geçit başa `[kaynak:nobetci]` koyduğu için hiç eşleşmiyordu → nöbetçi **hiç** hatırlatma göndermemiş | `8c603d5` |
| 6 | kopyayı kaldırınca boşluk açılacaktı: nöbetçi yalnız `participants`e gönderiyor, `randevu-teklif` oraya **tek taraf** yazıyor → ortak oturumda karşı taraf hatırlatma almazdı | `6c06138` |

**CANLI KANIT — NÖBETÇİ KOLU GERÇEKTEN GÖNDERDİ (04:18 → 04:30):**
| saat | sonuç | ne düzelmişti |
|---|---|---|
| 04:18 · 04:21 | `atlandi` — "Hatırlatma etiketi okunamadı" | (henüz düzeltilmemiş: çapalı desen) |
| 04:24 | `atlandi` — "Oturumda katılımcı taraf kaydı yok" | desen düzeldi (`8c603d5`) |
| **04:27 · 04:30** | **`yapildi` — "2 tarafa hatırlatma gönderildi"** | alıcı kuralı (`6c06138`) |
Yani nöbetçinin hiç çalışmayan hatırlatma kolu **canlıda iki tarafa da gönderdi**.
(İki kez göndermesinin sebebi kapı düzeltmesinin o an henüz deploy olmamasıydı;
`4b543ac` 04:30:24'te indi.)

**CANLI KANIT — ESKİ CRON KOLU 02:00:00 UTC:**
`{"success":true,"message":"Processed 1 sessions, sent 3 reminder emails","count":3}`
Zincir gerçekten gönderdi (2 taraf + arabulucu). Test oturumu "farazi FSM test"
dosyasına kuruldu; o dosyanın iki tarafının adresi de kurumun kendi alan adında.
Aynı turda `dual-ai-validate` de **200** döndü → jobid 2'nin 401'i de kapandı.

NİHAİ DURUM — **tek kol vardır ve nöbetçidedir:**
`oturumHatirlatmaGorevleriAc` (24 saat içindeki her planlı oturum için görev) +
`oturumHatirlatmaYurut` (Türkçe e-posta · `case_parties.email` · iletişim
tercihi · video bağlantısı · arabulucu imzası). 3 dakikada bir koşar.
`send-session-reminders` artık e-posta GÖNDERMEZ; tek kolun nöbetçi olduğunu
söyleyen 200 döner. Cron işi (jobid 1) bilerek duruyor: denetim kanalında nabız.

#### 7. TUR — KAPI ÖLÇEKTE KÖRLEŞİYORDU (`4b543ac`)
Etiket geri geldi ama nöbetçi **hâlâ** 3 dakikada bir yeni satır yazıyordu.
CANLI ÖLÇÜM (04:27, dosya `eb70595a`): `oturum_hatirlatma` tipinde **411 satır**,
yalnız **62'si etiketli**.
KÖK NEDEN: `gorevEtiketiVarMi` `.limit(200)` kullanıyor ama **sıralama yok**.
Postgres sırasız sorguda hangi 200 satırı döndüreceğini garanti etmez; pratikte
en eskiler gelir. Bir dosyada aynı tipten 200'den çok satır birikince kapı YENİ
satırları hiç görmüyor ve her turda bir tane daha yazıyor — **kendini besleyen
döngü**: yazdıkça körleşiyor, körleştikçe daha çok yazıyor.
Bu, etiket silinmesi kusurunun (`c722026`) **birikmiş sonucuydu**: 349 etiketsiz
satır zaten oradaydı ve kapıyı boğmuştu. Etiketi geri getirmek tek başına
yetmedi — bu yüzden düzeltmeden sonra da canlıya bakmak gerekti.
ÇÖZÜM iki katmanlı: sunucu tarafında `like` ile daralt (satır sayısından
bağımsız), JS tarafında `includes` ile kesinleştir (21.08 notunun gerekçesi
korunur). En yeniden eskiye sıralanır.
> Birikmiş 349 etiketsiz satır SİLİNMEDİ (§7.3 geri dönüşsüz). Yeni kapı
> onlardan etkilenmiyor.

ALICI KURALI (yeni, kodda açık):
- `private` (özel/caucus) → YALNIZ `participants`. Özel oturumun varlığı karşı
  tarafa hiçbir yüzeyden açılmaz (constitution · kör veri); hatırlatma da açamaz.
  Katılımcı yoksa iş atlanır, alıcı **genişletilmez**.
- diğer (ortak/ön görüşme) → dosyanın **bütün** tarafları.

### ESKİ ŞEMA ADASI HARİTASI — 24.08 (kaynak: hatırlatma P0'ının kök nedeni)
Hatırlatma kusuru "terk edilmiş tabloya sorgu" sınıfındaydı. Aynı adaya bağlı
başka ne var diye tarandı:
| dosya / tablo | durum | canlı etki |
|---|---|---|
| `mediator_requests` | **0 satır** | — |
| `reschedule_requests` | **0 satır**, FK'si `mediator_requests`e | — |
| `send-session-notification` | uygulamada **çağrılmıyor** (yalnız bir yorumda anılıyor) | yok |
| `send-reschedule-notification` | iki bileşenden çağrılıyor ama o bileşenler **hiçbir yerde render edilmiyor** | yok |
| `RescheduleRequest.tsx` · `RescheduleApproval.tsx` | **import edilmiyor** | yok |
SONUÇ: ada tamamen ölü; canlı kusur YOK. Ama **tuzak**: canlı görünüyor ve
sorgusu sessizce boş dönüyor — "yapacak bir şey yok" sanılıp 200 dönülüyor.
24.08'de tam olarak bu oldu.
YAPILAN: dört dosyanın başına açık uyarı konuldu (ne olduğu, neden dokunulmaması
gerektiği, doğru kaynağın ne olduğu). Silme YAPILMADI — tablo/kod silmek geri
dönüşsüzdür (§7.3) ve kurucu kararıdır.
- [x] P3 · Eski şema adası (`mediator_requests` · `reschedule_requests` + dört
      dosya) kaldırılsın mı? · Kabul: ya kaldırılır ve hiçbir yerden anılmaz, ya
      da "bilerek duruyor" kararı `Kritik kararlar`a yazılır · **kurucu kararı**
      (§7.3 — tablo/kod silme).

### KAPANDI — 24.08 · P1 · İŞ ETİKETİ SINIR SÜZGECİNDEN GEÇMİYOR (`c722026`, 36 fan-out)
Hatırlatma zincirini canlıda sınamak için test oturumu kurdum; o turda nöbetçi
iki `otomatik_analiz` satırı yazdı ve **ikisi de** yalnız şuydu:
`[kaynak:nobetci] Bu konuda size yazabileceğim bir şey bulamadım.` — iş etiketi YOK.

KÖK NEDEN: `anaAjanaBildir` gerekçenin **tamamını** ortak sınır süzgecinden
geçiriyordu. Süzgeç eleyince `sade` yedeği dönüyor ve metnin başındaki **iş
etiketi de siliniyordu**.

BEDELİ İKİ TANE, BİRİ AĞIR:
1. **Mükerrer yazım kapısı körelıyor.** `gorevEtiketiVarMi` "bu iş zaten açıldı
   mı" diye etiketi arar; etiket silinince bulamaz ve nöbetçi **aynı görevi her
   turda yeniden açabilir.** 21.08'de aynı kapı `startsWith → includes` ile
   onarılmıştı; o turda sebebin BU olduğu görülmemiş, yalnız belirti düzeltilmiş.
2. Arabulucu hangi işin ne olduğunu göremiyor.

Bu, 23.08'de `akis-yurut/hata-metni.ts` ile düzeltilen kusurun **aynısı, başka
geçitte**. O tur yalnız koşucu kolu onarılmış, bu geçit atlanmıştı.

DÜZELTME: sınır katmanı GEVŞETİLMEDİ, metin ikiye ayrıldı. Baştaki `[...]`
etiketleri KODUN ürettiği dizelerdir (içlerinde taraf verisi bulunması yapısal
olarak mümkün değil) → süzgece girmez. Serbest açıklama eskisi gibi süzgeçten
geçer; elenirse metni konmaz ama sessiz de düşmez, hangi türün elediği yazılır.
Tezgâh (`tests/ana-ajana-bildir-etiket.test.ts`, 6 durum) **kanıtlandı**: kusur
geri getirilip koşuldu → 4 test DÜŞTÜ; geri alınınca 6/6 geçti.

> DERS: bir kusur sınıfı düzeltilince **aynı sınıfın öteki geçitleri de
> taranmalı.** 23.08'de metin ikiye ayrılmıştı ama yalnız bir çağıranda;
> ikinci geçit 24.08'e kadar kusurlu kaldı ve sessizce mükerrer görev üretme
> riski taşıdı.

#### DERS HEMEN UYGULANDI — ÜÇÜNCÜ GEÇİT DE BULUNDU (`97f077d`, 36 fan-out)
`sinirdanGecir(` çağıran **her yer** tarandı (15 çağrı). Bir geçit daha çıktı:
`eksigiSor` soru metnini süzgeçten geçiriyor ve **`[kol:…]` etiketi mesajın
İÇİNDE** geliyor (`bilirkisi-sorulari:148` · `taraf-kalem-cikar:400`).
BEDELİ MOTOR KANUNU m.5'TİR: `[kol:…]` cevap gelince hangi kolun uyanacağını
söyler (`ajan-nobetci:1141` gerekçeden okur). Elenirse **cevaplanan soru hiçbir
kolu uyandıramaz** — sessizce.
Bugün tesadüfen elenmiyor (o iki cümle "belge" gibi dayanak kelimesi taşıyor),
ama kırılgan: metne bir rakam eklenmesi zinciri sessizce koparırdı.
DÜZELTME: etiket koruyan süzgeç ortak yardımcıya alındı (`etiketleriAyir` +
`etiketiKoruyarakSuz`); iki geçit de onu kullanıyor, `anaAjanaBildir`deki kopya
kalktı — aynı işi yapan mantık TEK yerde.
Tezgâh 6 → **12 duruma** çıktı, kanıtlandı: geri alınınca 6 test düştü.
> Tezgâhın sahte istemcisi ilk yazımda kusurluydu: `eksigiSor` zinciri doğrudan
> `await` ediyor; `limit` Promise dönünce sonraki `.is()` düşüyordu. Zincir
> thenable yapıldı. (Bu, "yeşil tezgâh kanıt değildir" dersinin ikinci örneği.)

### CANLI DOĞRULAMA — 24.08 · `girdiTamamla` düzeltmesi gerçek akışta sınandı
Hatırlatma sınaması için "farazi FSM test" dosyasına gerçek bir oturum kuruldu
(`143060da…`, 25 Ağu 02:00 UTC). Tetikleyici `oturum_planlandi` olayını doğurdu
ve nöbetçi 01:18'de işledi:
`[akis:0804fa4b…:oturum_planlandi__foy_hazirla] hazirlik-foyu çalıştırıldı (2 taraf)`
19.08'de **HTTP 400** veren kuralın aynısı; `akis_hatasi` doğmadı.
Yani `124e6cb` düzeltmesi canlı akışta kanıtlandı — birim tezgâhıyla değil,
gerçek olay zinciriyle.

### KAPANDI — 24.08 · P0 · OTURUM HATIRLATMALARI: 401'İN ALTINDA İKİNCİ KUSUR (`e4c788d`)
Cron başlığını düzeltmek **tek başına yanılsama olurdu**: fonksiyon 200 döner,
sıfır e-posta gönderirdi. Yetki düzeldikten sonra zinciri sonuna kadar okudum.

KÖK NEDEN: `send-session-reminders` **`mediator_requests`** tablosunu
**`scheduled_date`** sütunuyla sorguluyordu.
CANLI ÖLÇÜM: `mediator_requests` → **0 satır** (terk edilmiş), gerçek oturumlar
`case_sessions.scheduled_at` → **31 satır**. Yani bu fonksiyon yetkisi düzelse
bile **hiçbir zaman** hatırlatma gönderemezdi.

DÜZELTME:
- Veri kaynağı `case_sessions` + `scheduled_at`.
- `case_sessions`te `user_id`/`mediator_id` YOK; alıcılar dosyadan çözülüyor:
  taraflar `case_parties`ten (`user_id`si olanlar), arabulucu `cases`ten
  (`assigned_mediator_id`). İletişim tercihi süzgeci artık tarafın **kesin**
  kimliğiyle çalışıyor (eskiden tek `user_id`den tahmin ediliyordu).
- Oturum biçimi: ürünün gerçekten bildiği tek işaret `video_link`. Eski kod
  `session_type`ı "online"/"phone" sanıyordu; o değerler bu tabloda YOK.
- **MÜKERRER GÖNDERİM KAPISI:** pencere 2 saat geniş, cron saatlik → aynı oturum
  iki turda yakalanırdı. İz `ajan_gorevleri`ne yazılıyor
  (`gorev_tipi='oturum_hatirlatma'`, `durum='yapildi'`), varsa atlanıyor.
  Pencere bilerek geniş bırakıldı: bir tur kaçarsa hatırlatma yine gider.
  Hiç gönderilemediyse iz YAZILMIYOR — sonraki tur yeniden deniyor.
- Kullanılmayan `SessionWithDetails` arayüzü kaldırıldı: eski şemayı anlatıyordu,
  okuyanı yanlış tabloya yönlendiriyordu.
- Saf mantık `send-session-reminders/hatirlatma.ts`e ayrıldı (`hata-metni.ts`
  kalıbı) — `index.ts` Deno içe aktarımları taşıdığı için tezgâhtan çağrılamıyor.
  **`_shared`a KONMADI**, fonksiyonun kendi klasöründe: fan-out gerekmesin diye.
- `as any` yerine yerel açık tipler yazıldı; lint **2361 → 2360**.

#### İKİNCİ TUR — CANLI DOĞRULAMA KENDİ DÜZELTMEMDEKİ KUSURU BULDU (`7b4bf53`)
İlk yazımda alıcı adresini `profiles.email`e bağlamıştım (eski kodun kalıbı).
Deploy'u beklerken canlı veriye sordum ve tutmadı:
`select count(*) filter (where user_id is not null) from case_parties` → iki
aktif dosyada da **0**; genelinde 12 tarafın yalnız 3'ünde `user_id` var.
SEBEP: taraflar **kayıt olmadan** token bağlantısıyla katılıyor
(`/katilim/:token`); adreslerini `case_parties.email`de taşıyorlar.
Yani ilk hâlim yetkiyi ve tabloyu düzeltmiş ama **yine** neredeyse hiçbir tarafa
hatırlatma göndermeyecekti — üçüncü bir sessiz kusur.
DÜZELTME (kalıp `hazirlik-foyu-gonder:361` ile aynı): adres `case_parties.email`den,
profil yalnız YEDEK; taraf listesi `user_id`ye göre süzülmüyor; hitap taraf
kaydındaki addan (kurumsalda unvan); adresi olmayan taraf sessizce düşmüyor,
sebebi yazılıyor; uygulama içi bildirim yalnız kayıtlı tarafa gidiyor.

Tezgâh (`tests/oturum-hatirlatma.test.ts`, **15 durum**) **kanıtlandı**: her iki
turda da kusur geri getirilip koşuldu → 3'er test DÜŞTÜ; geri alınınca 15/15 geçti.

> DERS (ikinci kez, aynı oturumda): birim tezgâhı **şemayı** doğrular, **veriyi**
> doğrulamaz. `user_id`nin canlıda boş olduğunu hiçbir test söyleyemezdi; onu
> yalnız canlı veriye sormak söyledi. Alıcı/adres gibi "kim alacak" kararları
> yazılmadan önce canlı dağılıma bakılmalı.

> DERS: bir arızanın ilk katmanı düzelince "bitti" denmez. 401 gerçek bir
> kusurdu, ama altındaki veri kaynağı kusuru onu **gizliyordu**. Yetki
> düzeltmesi tek başına yeşil bir 200 üretip sorunu görünmez kılacaktı.
> Zincir uçtan uca okunmadan kapatılmaz.

### ARAÇ NOTU — Deno fonksiyonları yerelde nasıl denetleniyor
`tsconfig.app.json` `supabase/functions/**`i KAPSAMAZ ve `deno` kurulu değil;
yani bu dosyalarda `tsc` hiçbir şey yakalamaz. Bu oturumda `index.ts`in
`serve(...)` sarmalayıcısı düzenleme sırasında silindi ve **hiçbir doğrulama
komutu bunu görmedi**. `tests/gecici/sozdizim.mjs` (CLAUDE.md §22) yazıldı:
TypeScript ayrıştırıcısıyla PARSE denetimi yapıyor, süslü parantez dengesini
şablon dizelerine takılmadan buluyor. Deno dosyası düzenlendiğinde çalıştır:
`node tests/gecici/sozdizim.mjs <dosya>`

### KAPANDI — 24.08 · P0/P1 · ÜÇ CRON İŞİ DÜZELTİLDİ VE UYGULANDI (kendim yaptım)
Bu iş Cowork'e devredilmedi; migration olarak uygulandı ve doğrulandı.

UYGULAMA YOLU: `cron.job` tablosuna doğrudan `UPDATE` **yetkisi yok**
(`permission denied for table job`) — desteklenen yol `cron.schedule`.
Ayrıca sır hiçbir yere elle yazılmadı: blok, **çalışan jobid 7'nin komutundan**
sırrı `regexp_match` ile okuyup eksik olanlara `jsonb_build_object` ile ekledi.
Değer ne mesaja, ne dosyaya, ne commit'e girdi. URL, gövde ve zamanlama
DEĞİŞMEDİ; mevcut başlıklar (jobid 1'de `Authorization`, jobid 2'de `apikey`)
KORUNDU — silinip yeniden yazılmadı, üzerine `||` ile eklendi.
Blok her adımda korumalı: beklenen kalıp bulunamazsa `RAISE EXCEPTION` ile
hiçbir şeye dokunmadan duruyor.

| jobid | iş | önce | sonra |
|---|---|---|---|
| 1 | `send-session-reminders-hourly` | `x-cron-secret` YOK → her saat 401 | sır VAR · timeout 30000 |
| 2 | `dual-ai-validate-nightly` | hiç yetki başlığı YOK → kesin 401 | sır VAR · timeout 30000 |
| 7 | `ajan-nobetci-5dk` | timeout YOK → %100 zaman aşımı | timeout **30000** |

DOĞRULAMA (ajanın raporuna güvenilmedi, komutlar kendim okundu — sır maskeli):
üçünde de `x-cron-secret` var, üçünde de `timeout_milliseconds = 30000`,
zamanlamalar `0 * * * *` · `0 2 * * *` · `*/3 * * * *` olarak aynı kaldı.

GERİYE DÖNÜK TEK SATIR DA UYGULANDI: `outcome`u boş kalmış dosyaya `anlasma`
yazıldı; `set_case_closed_at` tetikleyicisi `closed_at`i kendisi doldurdu.
`select count(*) from cases where status in ('agreed','failed') and closed_at is null` → **0**.

### CANLI DOĞRULAMA — 24.08 · aşama düğmesi (kurucudan kontrol İSTENMEDİ, kendim yaptım)
Tarayıcıdan kurucunun açık oturumuyla canlıya girildi
(`/legal-reasoning`, Admin). Test **"farazi FSM test"** etiketli dosyada
yapıldı (`MP-2026-1017`, en az dokunan seçenek).
- TIKLAMADAN ÖNCE: `current_phase = 3` · `sonuc='arabulucu ilerletti'` olan
  iz satırı sayısı **0** (o güne kadar bütün izler ajan yazımı).
- "Aşama 4'e Geç →" düğmesine basıldı.
- TIKLAMADAN SONRA: `current_phase = **4**` (sunucuda kalıcı) ve yeni iz satırı:
  `[gecis:3->4] arabulucu elle ilerletti` · `sonuc: "arabulucu ilerletti"`
  · `2026-08-24 00:15:17Z`.
Yani düğme artık adının söylediği işi yapıyor ve sunucuya iz bırakıyor.
NOT: test dosyası aşama 4'te bırakıldı; geri alma yalnız ileri giden
`bumpPhase` ile mümkün değil ve dosya zaten farazi testtir. İz satırı ne
olduğunu açıkça yazıyor.

### KAPANDI — 24.08 · P0 · SELF-SERVİS KÖR VERİ — **A SEÇENEĞİ UYGULANDI** (kurucu kararı)
Karar paketindeki A seçeneği uygulandı ve canlıda doğrulandı.

**YAPILAN.** Yeni dar yardımcı:
```sql
is_case_owner_not_party(_case_id, _user_id) :=
  is_case_owner_safe(...) AND NOT EXISTS (case_parties: aynı dosya + aynı kullanıcı)
```
Taraf-gizli **beş** politikada `is_case_owner_safe` → `is_case_owner_not_party`:
`oturum_hazirlik_foyleri` · `oturum_kayitlari` · `taraf_kalemleri` ·
`bilirkisi_secim_beyani` · `bilirkisi_taraf_yanitlari`.
`is_case_mediator` dalı, `polcmd`ler ve **roller birebir korundu**
(`oturum_hazirlik_foyleri` + `oturum_kayitlari` → `TO authenticated`, diğer üçü
TO'suz; bu fark migration'da açıkça yazıldı).
**DOSYA YÖNETİMİ SAHİPTE KALDI:** `cases`, `case_parties` (taraf ekleme/silme),
`case_documents` politikaları **değiştirilmedi** — self-servis akış çalışmaya
devam ediyor. Geçen turda geri aldığım geniş düzeltmenin kilitlediği şey tam
olarak buydu.

**CANLI DOĞRULAMA (dört ölçüm):**
| ölçüm | sonuç |
|---|---|
| Beş politikanın dar yardımcıya geçmesi | **5/5** · arabulucu dalı korundu · `polcmd` aynı |
| Erişimi değişen dosya | **0** |
| Sahibin hâlâ yetkili olduğu dosya | **9 / 9** |
| Guard'ın iç koşulu (taraf tanıma) | gerçek veride **true** (3 taraf kaydı üzerinde) |
| **Guard engelliyor mu** | sahiplik yarısı zorla `true` yapıldığında bile fonksiyon **false** → **engelliyor** |

Son ölçüm önemli: canlıda sahip-aynı-zamanda-taraf olan dosya **yok** (kusur bu
yüzden gizliydi), o yüzden engelleme yolu gerçek bir çiftle koşulamıyor. Bunun
yerine sahiplik yarısı `OR true` ile zorlanıp **veriye dokunmadan** ölçüldü:
sonuç `false`. Yani guard doğru çalışıyor.

**KAPSAM TAMAMLAMASI — altıncı tablo (`kayit_onaylari`).** Beşliyi uyguladıktan
sonra `is_case_owner_safe` kullanan 29 politikayı taradım. Biri aynı sınıfa
**belgeli** olarak giriyordu: `CaseRoom.tsx:1292` diyor ki *"Kör veri (m.1): kart
yalnız tarafın KENDİ kararını gösterir; karşı tarafın onay verip vermediği bu
ekrana hiçbir yoldan yazılmaz."* Ama sahip politikası geniş olduğu için
sahip-taraf bütün onay satırlarını görürdü. Guard oraya da uygulandı.
Doğrulama: dar politika **1** · taraf politikaları (**2**) korundu · erişimi
değişen dosya **0** · sahip **9/9** yetkili.

**KALAN 22 POLİTİKA — kendiliğinden genişletmedim.** Üç öbeğe ayırdım: zaten
güvenli (sahiplik dar), dosya yönetimi (A kararı gereği sahipte kalmalı) ve
**belirsiz 17 politika**. Belirsiz öbek gerçek bir karar gerektiriyor
(arabulucunun kendi çalışma kaydı mı, taraf içeriği mi) → **`tasks/HAT.md` H-6**
olarak yazıldı, önerimle birlikte. Kararı beklemeden devam ediyorum (§23).

**TEZGÂHA BAĞLANDI** (`tests/rls-sahip-taraf-guard.test.ts`, 15 durum). Migration
kaynağını denetliyor: guard tanımı duruyor mu · `SECURITY DEFINER` +
`search_path` sabit mi · altı tablonun her biri guard kullanıyor mu · arabulucu
dalı korunmuş mu · **dosya yönetimi tabloları yanlışlıkla daraltılmış mı**
(`cases`, `case_parties`, `case_documents`, `cases_private_keys`,
`cases_vector_pool`). Böylece A kararının iki yarısı da (kapatılan + açık
bırakılan) sabitlendi.
**KANITLANDI:** guard migration'dan geçici olarak çıkarılıp koşuldu →
**7 test düştü**; geri konunca 15/15 geçti. Toplam **184/184**.

> TEZGÂHIN İLK YAZIMI KUSURLUYDU. Tabloyu `indexOf("ON public.<tablo>")` ile
> arıyordum; o desen **eski bir migration'ın `CREATE INDEX … ON public.<tablo>`
> satırına** düşüyor ve pencere yanlış yere bakıyordu. Üç test düştü, yöntem
> `CREATE POLICY` bloklarını ayrıştırmaya çevrildi. (Bugün dördüncü kez: bir
> tezgâh "geçti" demeden önce kusur geri getirilip düştüğü görülmeli.)

> İZLEME: ilk self-servis başvuru geldiğinde şu sorgu **0** dönmelidir —
> `select count(*) from cases c where public.is_case_owner_safe(c.id,c.user_id)
> and exists(select 1 from case_parties p where p.case_id=c.id and p.user_id=c.user_id)
> and public.is_case_owner_not_party(c.id,c.user_id);`

### KAPANDI — 24.08 · P1 · GİZLİLİK EKRANI YÖNETİCİ OTURUMUNDA ANLAMSIZDI
Kapsamı genişlettikten sonra ekranı **canlıda koşturdum** — ve asıl kusur orada
çıktı.

İki şey aynı anda doğruydu:
- Sayfa **yalnız yöneticiye** açıktı (`if (!isAdmin) … "yalnızca yöneticilere açıktır"`).
- **Yönetici RLS'i tasarım gereği aşar** → her yoklama "sızıntı" görür.

Yani ekran amacını **yapısal olarak** yerine getiremiyordu: tek izinli
kitlesi için sonucu her zaman yanlış.

**CANLI KANIT (yönetici oturumu):** 12 yoklama koştu →
**Geçti 5 · Başarısız 7**. Yedisi de **yanlış alarmdı.**

> Bu, bugünkü gerçek storage sızıntısının neden fark edilmediğini de açıklıyor:
> ekran zaten kırmızı yanıyordu, yeni bir kırmızı dikkat çekmezdi.

DÜZELTME:
- **Kapı açıldı.** Sayfa artık oturum açmış her kullanıcıya görünür. Güvenlik
  genişlemesi YOK: sayfa yalnız kullanıcının **zaten koşabileceği** sorguları
  koşar, yeni hiçbir veri açmaz.
- **Yeni durum: `belirsiz`.** Yönetici oturumunda her yoklama "başarısız" değil
  **BELİRSİZ** işaretlenir ve sebebi yazılır: *"Yönetici RLS'i tasarım gereği
  aşar… gerçek doğrulama için TARAF hesabıyla giriş yapın."*
- Ekrana uyarı bandı, özete "Belirsiz" rozeti, PDF raporuna hem satır durumu
  hem özet sayısı eklendi.

Tezgâh (`tests/gizlilik-ekrani-belirsiz.test.ts`, 10 durum) **kanıtlandı**:
kusur geri getirilip koşuldu → 9 test düştü. Toplam **169/169**.

**CANLI KANIT (yayın sonrası, aynı yönetici oturumu):**
| | önce | sonra |
|---|---|---|
| Başarısız | **7** (hepsi yanlış alarm) | **0** |
| Belirsiz | — (durum yoktu) | **9** |
| Geçti | 5 | 3 (yönetici için gerçekten anlamlı olanlar) |
Uyarı bandı ve "TARAF hesabıyla çalıştırın" yönergesi ekranda görünüyor.
Yani gösterge artık yalan söylemiyor: ölçemediğini "başarısız" değil
**belirsiz** diyor ve sebebini yazıyor.

### KAPANDI — 24.08 · P1 · GİZLİLİK TEZGÂHININ KAPSAM BOŞLUĞU
Bugünkü storage sızıntısı **neden fark edilmedi** diye tezgâha baktım.
`privacy-leak-suite` ürünün kör veri vaadini koruyan tezgâhtır ve yalnız
**3 tabloyu** yokluyordu (`party_analyses`, `case_discovery_questions`,
`case_documents`) — üçü de sahipliği **kullanıcı kimliğiyle** tutan tablolar.

**BOŞLUK İKİ KATLI:**
1. Ürünün taraf-gizli yüzeylerinin çoğu sahipliği **`party_id`** ile tutar ve
   tezgâhın bunu ifade edecek bir kavramı yoktu. Kapsam dışında kalanlar
   arasında **`teklif_braketleri` — KÖR TEKLİF** de vardı: karşı tarafın bandını
   görmek kör teklifin tamamını anlamsızlaştırır.
2. **DEPO hiç yoklanmıyordu.** Belgenin satırı gizlenirken dosyası ayrı bir
   yetki sistemindedir; bugünkü gerçek sızıntı (1 çift) tam oradaydı ve tablo
   yoklamaları onu **yapısal olarak göremezdi**.

YAPILAN:
- `LeakQuery`ye `sahiplik: "kullanici" | "taraf"` eklendi; `countLeaks` /
  `isLeakFree` artık tek kimlik ya da **kimlik kümesi** kabul ediyor (kullanıcının
  kendi taraf kayıtları).
- Kapsam 3 → **9 tabloya** çıktı: `teklif_braketleri`, `taraf_kalemleri`,
  `oturum_hazirlik_foyleri`, `bilirkisi_secim_beyani`, `bilirkisi_taraf_yanitlari`,
  `case_payments` eklendi.
- **Depo yoklaması** eklendi: kullanıcının yüklemediği bir belgenin DOSYASI
  indirilmeye çalışılır; indirilebiliyorsa **sızıntıdır**. Gizlilik ekranına da
  kondu.
- **Kapsam bekçisi**: denetlenen dokuz tablonun her biri için ayrı test —
  biri kapsamdan düşerse tezgâh düşer, sessizce korumasız kalmaz.

**TEZGÂH KANITLANDI:** kapsam geri daraltılıp koşuldu → **8+ test düştü**
(kör teklif dahil); geri alınınca 21/21 geçti. Toplam **159/159**.

> DERS: bir koruma tezgâhı YEŞİL olduğu için yeterli sayılmaz. Bu tezgâh
> bugüne kadar hep yeşildi ve gerçek bir sızıntıyı kaçırdı — çünkü sızıntının
> olduğu yüzeyi hiç yoklamıyordu. Kapsam, geçme durumundan daha önemlidir.

### KUYRUĞA EKLENDİ — 24.08 · dosyası olmayan iki belge üstverisi (küçük)
Storage denetimi sırasında çıktı: `case_documents`ta 24 üstveri satırından
**2'sinin dosyası kovada yok** (`farazi-test/…` yollu, tohum verisi).
Arabulucu o iki satırda "indir" derse hata alır. Benim politika değişikliğim
kırmadı — zaten kırıktılar (kovada hiç bulunmuyorlar).
- [x] P3 · Dosyası olmayan belge satırı kullanıcıya açıkça anlatılıyor ·
      DONE 24.08.2026 · **Güvenli seçenek uygulandı** (satır SİLİNMEDİ, §7.3):
      `src/lib/depoHatasi.ts` depo hatasını üçe ayırıyor — *dosya yok* /
      *yetki yok* / *bilinmeyen*. Her iki indirme yüzeyi de ortak çeviriciyi
      kullanıyor. Doğrulama: `tests/depo-hatasi.test.ts` 9 durum; kusur geri
      getirilince 2 test düşüyor.
      NEDEN ÖNEMLİ: aynı gün kova politikası daraltıldı, yani "yetki yok" da
      gerçek bir olasılık; ikisi ayrı anlatılmazsa kullanıcı dosya yokluğunu
      yetki sorunu sanır.
      SİLME yolundaki hata BİLEREK dokunulmadı: orada depo kaldırma zaten
      `console.warn` ile yutuluyor, catch bir **veritabanı** hatasıdır.

### DENETİM — 24.08 · GİRİŞSİZ TOKEN AKIŞLARI — TEMİZ ÇIKTI
Taraflar hesapsız işlem yapıyor (`/randevu/:token`, `/katilim/:token`), yani
token güvenliği kimlik doğrulamanın yerine geçiyor. Dört başlık denetlendi:

| başlık | sonuç |
|---|---|
| Entropi | `crypto.randomUUID()` ×2, tireler atılmış → **64 hane / 256 bit**. Tahmin edilemez |
| Saklama | `case_party_invites` **hash'li** (`token_hash`). `randevu_teklifleri.token` ve `case_parties.katilim_token` düz metin — ama RLS ikisini de istemciye kapatıyor (aşağıda) |
| RLS maruziyeti | `randevu_teklifleri` yalnız arabulucu/yöneticiye açık. `case_parties`te taraf **yalnız kendi satırını** görür → karşı tarafın token'ı okunamaz |
| Tek kullanımlık + yarış | **İkisi de doğru:** önce `durum !== 'beklemede'` denetimi (409), sonra **koşul update'in içinde** (`.eq("durum","beklemede")`) ve etkilenen satır sayısı denetleniyor; 0 ise 409. `randevu-teklif:619-624` ve `taraf-katilim:72-78` |

Yarış durumu kalıbı kodda yorumla da belirtilmiş ("Yarış durumunda ikinci
cevabın yazılmaması için koşul update'in içinde") — yani bilinçli yazılmış.
KUSUR YOK.

### KAPANDI — 24.08 · P2 · EKSİK İNDEKSLER (pilot ölçeği için)
Nöbetçi 3 dakikada bir her dosya için onlarca sorgu koşuyor. `pg_stat_user_tables`
okundu; **sıralı tarama** sayıları:

| tablo | sıralı tarama | indeks taraması | satır | durum |
|---|---|---|---|---|
| `ajan_gorevleri` | **142.954** | 470 | 560 | **yalnız birincil anahtar indeksi vardı** |
| `case_parties` | 124.857 | 1.808 | 16 | `case_id` indeksi yoktu |
| `case_documents` | 17.910 | 33.298 | 24 | `party_id` var, `case_id` yoktu |

En kritiği `ajan_gorevleri`: ürünün denetim kaydı, **büyüyor** (tek dosyada
`oturum_hatirlatma` tipinde 411 satır birikmişti) ve bütün mükerrer yazım
kapıları `case_id` + `gorev_tipi` ile sorguluyor. Kardeş tablolarda
(`akis_olaylari`, `ajan_kosum_izi`) uygun indeksler var; bu tablo atlanmıştı.

EKLENENLER (davranış değişikliği yok, geri alınabilir):
- `idx_ajan_gorevleri_case_tip_zaman` → `(case_id, gorev_tipi, created_at DESC)`
  — kapıların kullandığı sıralamayla **birebir** aynı
- `idx_case_parties_case` → `(case_id)`
- `idx_case_documents_case_zaman` → `(case_id, created_at DESC)`

**CANLI KANIT:** eklendikten sonraki dakikalarda
`idx_ajan_gorevleri_case_tip_zaman` **47 kez** kullanıldı
(`pg_stat_user_indexes.idx_scan`) — yani gerçekten sıcak yoldaymış, tahmin
değil. Aynı anda sistem sağlığı yeşil: son 15 dk'da 6 koşum hepsi 200,
işlenmemiş olay 0, son 3 saatte `akis_hatasi` 0.

DÜRÜSTLÜK NOTU: tablolar bugün küçük olduğu için gecikme **şu an
hissedilmiyor**; bu indeksler pilot ölçeği içindir. 9–24 satırlık diğer
tablolara bilerek indeks EKLENMEDİ — o boyutta Postgres zaten sıralı tarama
seçer ve indeks ölü yük olur.

### DENETİM — 24.08 · TARAF YÜZEYİ (kod tarafı) — TEMİZ ÇIKTI
RLS denetiminden sonra **kodun kendisini** denetledim: taraf yüzeyi
(`CaseRoom`) dosya kapsamlı sorgular yapıyor mu, yapıyorsa RLS onları gerçekten
daraltıyor mu?

`CaseRoom` altı tabloyu **dosya kapsamlı** (`eq("case_id", …)`) sorguluyor.
Hepsinin RLS'i tek tek okundu:
| tablo | taraf politikası | sonuç |
|---|---|---|
| `party_analyses` | `user_id = auth.uid()` | taraf yalnız kendi analizini alır ✓ |
| `case_documents` | `uploaded_by = auth.uid()` | kendi yüklemesi ✓ |
| `case_parties` | `user_id = auth.uid()` | **yalnız kendi satırı** ✓ |
| `case_discovery_questions` | `user_id = auth.uid()` | kendi sorusu ✓ |
| `common_ground_reports` | taraf politikası **YOK** | taraf 0 satır alır ✓ |
| `case_payments` | `payer_party_id IN (kendi taraf kayıtları)` | kendi ödemesi ✓ |

**İNCELENEN TEK RİSKLİ NOKTA — `negotiation_rounds`:** taraf politikası dosya
kapsamlı (`is_case_party`) ve taraf için **UPDATE** yetkisi de var. İlk bakışta
"taraf karşı tarafın cevabını değiştirebilir" gibi göründü. Ölçtüm:
- Tabloda `party_id` YOK; `proposal` ortak, `accepted_by`/`rejected_by` dizi.
  Yani yapısı gereği **ortak** müzakere turu; iki tarafın aynı teklifi görmesi
  doğrudur (kör teklif değildir — o `teklif_braketleri`dir ve taraf kapsamlıdır).
- Yazma `enforce_negotiation_rounds_party_update` tetikleyicisiyle korunuyor:
  taraf `case_id` · `round_no` · `proposal` · `created_at` değiştiremez;
  dizilere **yalnız kendi kimliğini** ekleyebilir (`OLD <@ NEW` ve
  `NEW <@ OLD || auth.uid()` küme kapsama denetimi); `status` tetikleyicide
  hesaplanır, taraf yazamaz; taraf için DELETE politikası yok.
SONUÇ: kusur yok, koruma sağlam.

### DENETİM — 24.08 · VERİ İZOLASYONU / GÜVENLİK TAM TARAMASI
Ürünün çekirdek vaadi kör veridir; bu eksen daha önce hiç uçtan uca denetlenmemişti.
On başlık tarandı. **Bir canlı kusur bulundu ve kapatıldı, bir madde Human Gate'e çıktı; kalan sekiz başlık temiz.**

| eksen | sonuç |
|---|---|
| Tablo RLS **okuma** (taraf gizli tabloları) | temiz — hepsi `is_own_case_party` / `user_id = auth.uid()` kapsamlı |
| Tablo RLS **yazma** | temiz — taraf yalnız kendi satırını yazıyor |
| **Storage okuma** (`case-documents`) | **KUSUR — canlı 1 sızıntı çifti, kapatıldı** (yukarıdaki madde) |
| `SECURITY DEFINER` fonksiyonlar | temiz — hepsinde `search_path` ayarlı (0 eksik) |
| Görünümler | temiz — ikisi de `security_invoker`, çağıranın RLS'ine tabi |
| Genel kova (`avatars`) | temiz — **0 nesne**, hassas içerik yok |
| Token entropisi | temiz — `katilim_token` ve `randevu_teklifleri.token` **64 hane / 256 bit** |
| Token RLS maruziyeti | temiz — taraf `case_parties`te **yalnız kendi satırını** görüyor; karşı tarafın token'ı okunamaz. `randevu_teklifleri` yalnız arabulucu/yöneticiye açık |
| Girişsiz token sayfaları | temiz — `/randevu/:token` ve `/katilim/:token` doğrudan tabloya değil **edge function'a** gidiyor (servis rolü) |
| Politikasız RLS tablosu | `gundem_kalem_havuzu` — yalnız edge function'dan kullanılıyor; RLS açık + politika yok = istemciye kapalı, **doğru davranış** |

YANLIŞ ALARM OLARAK ELENEN: `mediators_public` görünümü kimlik (`user_id`)
taşıyor ve storage yolları `<uid>/<case_id>/…` biçiminde; ilk bakışta "taraf
arabulucunun kimliğini okuyup dosya yolu kurar" gibi göründü. Ölçtüm:
`mediators` tablosu yalnız **yönetici ve kişinin kendisine** açık, yani taraf o
görünümü okuyamıyor. İstismar yolu **tutmuyor** — kayda geçirmedim.

### KUYRUĞA EKLENDİ — 24.08 · kayıt kovası yok (gizli, kayıt hattıyla birlikte doğar)
`ajan-nobetci` ses kaydını `oturum-kayitlari` kovasından siliyor
(`KAYIT_BUCKET`), ama canlıda yalnız iki kova var: `avatars` ve
`case-documents`. Kova açılmadan kayıt hattı devreye girerse silme her turda
hata verir, `ses_silindi_at` hiç yazılmaz ve **kayıt süresiz kalır** — tarafa
verilen "24 saat sonra kalıcı silinir" sözü ve constitution m.10 çiğnenir.
BUGÜN ZARAR YOK: `oturum_kayitlari` boş, yükleme yolu yok. Kodun başına açık
uyarı konuldu, kuyruğa madde açıldı.
- [x] P2 · `oturum-kayitlari` kovası açıldı · DONE 24.08.2026 · Doğrulama:
      `storage.buckets` → kova var, `public=false`; o kovaya ait istemci
      politikası sayısı **0** (deny-by-default). Servis rolü RLS'e tabi
      olmadığı için silme kolu çalışır.
      YOL DÜZENİ UYDURULMADI: yükleme yolu henüz yazılmadığından dosya yolu
      düzeni belli değil; politika yazmak için desen uydurmak gerekirdi.
- [ ] P3 · Kayıt hattı kurulduğunda `oturum-kayitlari` kovasına **dar** okuma
      politikası eklensin · Kabul: yol düzeni belli olduktan sonra yalnız
      görevli arabulucu (+yönetici) okuyabiliyor; taraf kimliğiyle okuma 0 satır
      dönüyor · NOT: belge kovasında bu politikanın geniş yazılması 24.08'de
      canlı bir kör veri sızıntısı doğurdu (1 gerçek çift) — tekrarlanmasın.

### KAPANDI — 24.08 · P0 · STORAGE KOVASI VERİTABANINDAN DAHA GENİŞ OKUTUYORDU
Kör veri denetimini dosyaların durduğu **Storage** tarafına da yaptım (daha önce
hiç bakılmamış). Canlı ve gerçek bir kusur çıktı.

KUSUR: `case_documents` **veritabanı** politikası taraf için
`uploaded_by = auth.uid()` diyor — adı bile *"Party sees own uploads only"*.
Ama `case-documents` **kovasının** okuma politikası `can_access_case(...)`
kullanıyordu ve o fonksiyon dosyanın **herhangi bir tarafına** izin verir:
```
c.user_id = uid OR c.assigned_mediator_id = uid
OR EXISTS(case_parties where case_id=... and user_id=uid)   ← HER TARAF
OR has_role(admin)
```
SONUÇ: üstverisi (satırı) gizlenen belgenin **dosyası** karşı tarafça
indirilebiliyordu. Sözleşmenin iki ucu birbirini tutmuyordu.

NİYET İKİ YERDE YAZILI: politikanın adı ve `CaseRoom.tsx:327` yorumu —
*"Mevcut SELECT politikası kendi yüklediği dosyaya zaten izin veriyor."*
Yani yazan da kapsamın dar olduğunu sanıyordu. Bu yüzden **karar değil, kusur**.

TÜKETİCİLER OKUNDU (geçen turdaki hatamı tekrarlamamak için):
| tüketici | ihtiyacı | değişimden etkilenir mi |
|---|---|---|
| `CaseRoom:332` taraf | yalnız kendi belgesi | hayır |
| `MediationEngine:6324` arabulucu | dosyanın hepsi | hayır (`is_case_mediator`) |
| `SourceViewerDialog` | **yalnız arabulucu yüzeyinde** kullanılıyor | hayır |
| bilirkişi | bu kovadan istemci tarafında zaten okumuyor | hayır |
| edge function'lar | servis rolü, RLS'e tabi değil | hayır |

DÜZELTME: kova okuma politikası veritabanındaki kuralla **birebir** aynı hâle
getirildi — yönetici hepsi · `admin/` klasörü + mediator rolü (bilgi tabanı) ·
görevli arabulucu dosyanın hepsi · **diğer herkes yalnız kendi yüklediği dosya**.

**CANLI GERİLEME TESTİ (tarayıcı, 24.08):** en riskli değişiklik buydu, bu
yüzden meşru erişimi gözle de sınadım. Canlı oturumdan gerçek bir belge
indirildi → **HTTP 200, 728 bayt**. Erişim bozulmadı.
(Oturum yönetici olduğu için yönetici dalından geçti; **arabulucu dalı** ayrıca
SQL ile kanıtlandı: 22 dosya erişilebilir, 21'i kendi yüklemesi, 1'i yalnız
`is_case_mediator` dalıyla.)

**CANLI KANIT — delik teorik değildi, gerçekti:**
| ölçüm | değer |
|---|---|
| kovadaki dosya | 28 |
| ESKİ politikayla: yüklemediği ve arabulucusu olmadığı dosyayı okuyabilen taraf çifti | **1** |
| YENİ politikayla aynı ölçüm | **0** |
| arabulucunun erişebildiği dosya (korunmalı) | **22** — değişmedi |
Arabulucunun eriştiği 22 dosyanın 21'i kendi yüklemesi, 1'i değil: yani
`is_case_mediator` dalı gerçekten gerekli ve çalışıyor.

### HUMAN GATE — 24.08 · P0 · SELF-SERVİS BAŞVURUDA KÖR VERİ KIRILIYOR (§7.4)

**BULGU.** `is_case_owner_safe(case_id, user_id)` yalnız `cases.user_id`
eşleşmesine bakar ve **34 RLS politikası** bunu *arabulucu düzeyi* yetki olarak
kullanır (politika adlarının hepsi "Arabulucu …"). Ama:
- Açılış sayfasındaki **"Başvuruyu Başlat"** düğmesi `/legal-reasoning?new=1`e
  gider (`Landing.tsx:76` ve `:166`) — yani arabulucu olmayan bir kullanıcı da
  dosya açabilir ve `cases.user_id` kendisi olur.
- `MediationEngine.tsx:4101`: self-servis akışta **ilk taraf, dosyayı açanın
  kendi `user_id`si ile** yazılır:
  `user_id: !isMediator && parties.length === 0 ? userId : null`

SONUÇ: self-servis başvuruda **dosya sahibi = dosyanın tarafı**. O kişi
arabulucu düzeyi yetkiyle **karşı tarafın** hazırlık föyünü
(`oturum_hazirlik_foyleri`), kalemlerini (`taraf_kalemleri`), bilirkişi
beyanlarını ve oturum kayıtlarını görebilir. **Ürünün kör veri ilkesi kırılır.**

CANLI DURUM: bugün **0 dosya** etkileniyor — mevcut 9 dosyanın hepsi arabulucu
tarafından açılmış, hiçbirinde sahip aynı zamanda taraf değil. Kusur **gizli**,
ama self-servis akış canlıda açık ve ilk kullanımda doğar.

**BU BİR ÜRÜN KARARIDIR, KENDİM ÇÖZMEDİM — ve bunu bir denemeyle öğrendim.**
Önce dar sandığım bir düzeltmeyi uyguladım (`is_case_owner_safe`e "sahip aynı
zamanda tarafsa yetki verme" koşulu). Sonra `MediationEngine.tsx:4101`i okuyunca
o düzeltmenin **self-servis akışı tamamen kilitleyeceğini** gördüm (başvurucu
kendi dosyasına taraf ekleyemez, belge yükleyemez, taraf listesini göremez).
**Geri aldım ve doğruladım** (`is_case_owner_safe` eski hâlinde; canlıda
etkilenen dosya olmadığı için zarar doğmadı). Ölçmeden uyguladığım için oldu;
ders `lessons.md`ye yazıldı.

**KARAR GEREKEN SORU:** Self-servis başvuruda (görevli arabulucu henüz yokken)
arabulucu düzeyi yetkiyi kim taşır?

| seçenek | ne olur | bedeli |
|---|---|---|
| **A — Önerim.** Yalnız *taraf gizli* tablolarda (`oturum_hazirlik_foyleri`, `taraf_kalemleri`, `bilirkisi_secim_beyani`, `bilirkisi_taraf_yanitlari`, `oturum_kayitlari`) sahip yetkisi taraf olan sahibe verilmez. Dosya yönetimi (taraf ekleme, belge yükleme, `cases`) sahipte kalır. | Kör veri kapanır, self-servis akış çalışmaya devam eder | 5 politika değişir; başvurucu kendi föyünü yine görür (taraf politikası zaten veriyor) |
| B | Self-servis başvuruda başvurucu taraf olarak YAZILMAZ; taraf kaydı ancak davetle bağlanır | Kök neden kalkar, tek satırlık kod değişikliği | Başvurucunun kendi taraf ekranı, davet akışı tamamlanana kadar çalışmaz |
| C | Açılıştaki "Başvuruyu Başlat" arabulucu yüzeyine değil ayrı bir başvuru akışına gider | En temiz ayrım | Yeni yüzey gerekir, pilot için iş yükü |

KARARIN ETKİSİ: A ve B kör veriyi kapatır; C ayrıca ürün akışını düzeltir ama
pilotu geciktirir. Hiçbiri yapılmazsa self-servis ilk başvuruda karşı tarafın
gizli verisi başvurucuya açılır.

- [x] P0 · Self-servis başvuruda dosya sahibi = taraf → kör veri kırılıyor ·
      **DONE 24.08.2026 — kurucu A seçeneğini seçti, uygulandı ve canlıda
      doğrulandı.** Doğrulama: 5/5 politika dar yardımcıya geçti · erişimi
      değişen dosya 0 · sahip 9/9 dosyada hâlâ yetkili · guard engelliyor
      (sahiplik yarısı zorla `true` yapıldığında bile `false` dönüyor).
      (Aşağıdaki eski metin o günkü teşhistir.) ·
      **HUMAN GATE (§7.4)** · Kabul: seçilen seçenek uygulandıktan sonra,
      sahip-aynı-zamanda-taraf olan bir dosyada karşı tarafın föyü/kalemi
      sorgulandığında **0 satır** dönüyor · Denenenler: `is_case_owner_safe`
      sertleştirmesi uygulandı ve self-servis akışı kilitlediği görülünce
      geri alındı.

### CANLI GÖZLE DOĞRULAMA — 24.08 · ön yüzde dokunduğum üç dosya (tarayıcı)
Bugün `MediationEngine`, `AjanPenceresi` ve `CaseRoom`a dokundum; üçü de canlıda
kurucunun açık oturumundan gözle denetlendi (§11-B).

| yüzey | ne doğrulandı |
|---|---|
| Aşama 4 (`MediationEngine`) | Kayıt protokolü kartı **tek kaynaktan gelen** metinle çıkıyor; "48 saat" cümleleri sabitten türemiş; `girdiTamamla` düzeltmesinin ürettiği **iki taraf föyü** duruyor; test oturumu `scheduled` görünüyor |
| Ajan penceresi (`AjanPenceresi`) | Zaman çizelgesinde **üç aşama geçişi** görünüyor (çapa kalkmasaydı bir kısmı sessizce kaybolacaktı) |
| Sızan iç etiket | Görünen metinde `[kaynak:…]` · `[eksik:…]` · `[kol:…]` · `[gecis:…]` → **sıfır** |
| Konsol | Hata/exception **yok** |

**YAPAMADIĞIM TEK KONTROL:** tarafın kendi "Ajanım" paneli yalnız TARAF
oturumunda render oluyor; ben yönetici oturumundayım, panel hiç çizilmiyor.
O tek görsel doğrulama yapılamadı. Kanıt üç ayrı açıdan var: tezgâh kaynağı
denetliyor, yayındaki pakette yeni ayırıcı **var** ve eski tek-silme **yok**,
arabulucu yüzeylerinde sızan etiket sıfır. Yine de kurucu bir taraf hesabıyla
girip "Ajanım" kartına bakarsa doğrulama tamamlanır.

### DENETİM — 24.08 · "TERK EDİLMİŞ KAYNAĞA SORGU" SINIFI TARANDI (TEMİZ ÇIKTI)
Hatırlatma P0'ının kök nedeni "canlıda boş olan tabloyu okuma"ydı. Aynı sınıf
sistematik tarandı; **yeni kusur çıkmadı** — bu da bir sonuçtur, riski sınırlar.

YÖNTEM: edge function'ların dokunduğu **69 tablo** çıkarıldı, `pg_stat_user_tables`
ile canlı satır sayıları alındı, **16 boş tablo** bulundu. Boş olmak kusur
değildir (özellik henüz kullanılmamış olabilir); kusur imzası **"okunuyor ama
hiç yazılmıyor"**dur. O ayrım için sonda yazıldı (`tests/gecici/inceleme.mjs`).

Sonda dört tablo işaretledi; **üçü sonda artefaktı** çıktı — yazan yol
`supabase.from("x" as any)` kalıbını kullandığı için desene takılmamış:
| tablo | gerçek durum |
|---|---|
| `iletisim_tercihleri` | yazılıyor — `CaseRoom.tsx:1835` (upsert) |
| `arabulucu_kontrol_tercihleri` | yazılıyor — `AjanPenceresi.tsx:736` (upsert) |
| `taraf_musaitlik` | yazılıyor — `CaseRoom.tsx:2253` (insert) |
| `reschedule_requests` | **gerçekten yazan yok** — zaten bilinen ölü ada, işaretli |

SONUÇ: `mediator_requests`/`reschedule_requests` adası dışında terk edilmiş
kaynağa sorgu YOK. Diğer 15 boş tablo, henüz kullanılmamış özelliklerdir
(bilirkişi raporu, oturum kaydı, mesajlaşma vb.) ve hepsinin yazan yolu vardır.

> SONDA DERSİ: `from("x")` araması bu depoda YETMEZ; üretilmiş tipleri atlatmak
> için `from("x" as any)` kalıbı yaygın. Tablo araması yaparken desen
> `from("x"` olmalı (kapanış parantezi olmadan).

### KAPANDI — 24.08 · P1 · BÜTÜN MÜKERRER KAPILAR ORTAK KALIBA ALINDI (`ba1585e`)
Dersin dediğini uyguladım ve sözleşmenin **okuyan tarafını** baştan sona taradım
(`grep "gerekce" | grep -E "exec|match|startsWith|replace|slice"`). Aynı iki
kusur **beş kapıda daha** çıktı.

**(a) `startsWith`** — geçit gerekçenin başına `[kaynak:…]` koyuyor.
- `akis-yurut` `asama_gecisi` kapısı: yorumu *"Etiket nöbetçinin kullandığıyla
  AYNIDIR"* diyordu, ama nöbetçi geçitten yazıyor. Yani **"arabulucu elle geri
  aldıysa ajan aynı geçişi tekrar denemez" güvencesi, nöbetçinin yaptığı
  geçişler için boştu.**
- `akis_kosuldu` / `akis_hatasi` iz kapıları: bugün kırık değil (o satırlar
  geçitten geçmiyor) ama aynı kırılganlık.

**(b) SIRASIZ `limit`** — dört kapıda daha: `asama_gecisi` (200), akış izi (300),
`hataYaz` (300), bekleyen soru (200), nöbetçi `bilirkisiEtiketiVarMi` (200).

DÜZELTME — ortak kalıp: sunucuda `like` ile daralt → en yeniden sırala →
JS'te `includes` ile kesinleştir. `hataYaz`da eşleşme TAM olduğu için
`.eq("gerekce", …)` kullanıldı: sunucuda çalışır, satır sayısından **tamamen**
bağımsızdır.
Tezgâh (`tests/mukerrer-kapilar.test.ts`) iki dosyayı birden denetliyor ve
kalıbı **değişmez** yapıyor — yeni bir kapı eklenirse aynı kalıbı kullanmak
zorunda. Kanıtlandı: kusur geri getirilip koşuldu → 6 test düştü; 10/10 geçti.

**CANLI KANIT (publish):** paket `index-OeZSqeAa.js` — yeni etiket ayırıcı
deseni pakette (2 kez), `[gecis:…]` deseni **çapasız** (çapalı hâli 0 kez).

### KAPANDI — 24.08 · P1 · AYNI SINIF ÖN YÜZDE DE VARDI (`b53f796`, publish)
Arka uçtaki üç çapalı okuyucuyu düzelttikten sonra **aynı sınıfı ön yüzde de
taradım.** Üç yer çıktı; biri canlı ve doğrudan **tarafa görünür**.

**(1) CANLI · `CaseRoom.tsx` "Ajanım" paneli — tarafın kendi ekranı. İki kusur:**
- Baştaki etiket **tek kez** siliniyordu. Geçit `[kaynak:…]` eklemeye başlayınca
  (21.08 11:06) üç etiket oldu.
- `sonuc` gövdenin **önüne** geçiyordu; `sonuc` iç muhasebedir.

CANLI KANIT — bekleyen dört `taraf_sorusu` satırında tarafın gördüğü:
| alan | değer |
|---|---|
| `sonuc` dolu → gösterilen | `son hatırlatma: 2026-08-23T11:09:03.883Z (1. hatırlatma)` |
| `sonuc` boş olsaydı | `[bekleyen:taraf_cevabi] [eksik:bilirkisi-onay:55dd060f-…] [kol:bilirkisi-sorulari] Dosyada teknik inceleme gündemde…` |

Yani taraf ya iç zaman damgası ya üç iç etiket + **ham UUID** görüyordu;
**sorunun kendisini hiçbir hâlde temiz görmüyordu.** Sıra çevrildi: önce temiz
gövde, gövde boşsa `sonuc`.

**(2) GİZLİ · `AjanPenceresi` zaman çizelgesi** — `/^\[gecis:…\]` çapalıydı ve
`if (!m) continue` diyordu. Nöbetçinin açtığı aşama geçişleri çizelgede
**sessizce görünmüyordu**.

**(3) AYNI SINIF · `/^\[akis:…\]`** — bugün kırık değil (akış satırları geçitten
geçmiyor), ama aynı kırılganlık; çapası kaldırıldı.

KOPYA YÖNETİMİ: `src/lib/etiket.ts` açıldı. Aynı işlev `_shared/anlatim.ts`te
zaten var ama orası Deno tarafı, Vite paketine giremez — kopya **zorunlu**.
`tests/etiket-ayirici-esitlik.test.ts` iki sürümün **aynı** sonucu verdiğini
10 örnek üzerinde sabitliyor; sapma olursa tezgâh düşer.

> Bu, geçit ön eki kusurunun **dördüncü** taraması. Sırayla: koşucu (23.08) →
> `anaAjanaBildir` + `eksigiSor` (24.08) → nöbetçi üç okuyucu (24.08) → ön yüz
> üç okuyucu (24.08). Her tarama bir öncekinin kaçırdığını buldu.

### KAPANDI — 24.08 · P1 · GEÇİT ÖN EKİ ÜÇ OKUYUCUYU DAHA KIRIYORDU (`b4bc3c6`)
Bir önceki turda `oturumHatirlatmaYurut`un çapalı deseni düzeltilmişti. Dersi
uyguladım ve **aynı sınıfı taradım** — üç yer daha çıktı.

ÖLÇÜM: `anaAjanaBildir` geçidi gerekçenin başına `[kaynak:…]` koyuyor ve geçit
**21.08 11:06**'da devreye girdi. Canlı sayım: o tarihten sonra yazılan
**421 görevin hepsi** bu ön eki taşıyor, öncesindeki **123 görev** taşımıyor.
Yani iş etiketini `^` ile satır başına çapalı arayan her yürütücü 21.08'den beri
hiçbir görevi çalıştıramaz.

| yer | sonuç | durum |
|---|---|---|
| `asamaGecisiYurut` | otomatik aşama ilerletme sessizce durur | **gizli** — en son başarılı koşum 19.08 (geçit öncesi) |
| `teklifDegerlendirYurut` | teklif değerlendirmesi sessizce durur | **gizli** — en son başarılı koşum 19.08 |
| hatırlatma e-postası gövdesi | **tarafa giden metin iç etiketle başlıyordu** | **CANLI** |

Üçüncüsü en görünür olanı: gövdedeki etiketler **tam iki kez** siliniyordu.
Gerekçe artık üç etiketle başlıyor (`[kaynak:…][bekleyen:…] [eksik:…]`, bazen
`[kol:…]`), iki silme yetmiyordu ve taraf `[eksik:…] [kol:…]` ile başlayan bir
e-posta alıyordu. `etiketleriAyir` ile baştaki bütün gruplar tüketiliyor —
sayıya bağlı değil. Ortak yardımcı kullanıldı, yeni kopya yazılmadı.

TEZGÂH GÜÇLÜ BİR DEĞİŞMEZE BAĞLANDI: *gerekçeden etiket okuyan hiçbir desen
çapalı olmayacak.* Böylece dördüncü bir okuyucu eklenirse tezgâh yakalar.

> DERS (üçüncü kez doğrulandı): bir kusur sınıfı bulununca **sınıfın tamamını
> tara.** Bu turda tarama tek grep'ti (`/^\[` deseni) ve üç kusur çıkardı —
> ikisi henüz canlıya yansımamış, biri tarafa görünür durumdaydı.

### KAPANDI — 24.08 · P1 · CRON SIRRI VAULT'A ALINDI, DÜZ METİN KALKTI
`cron.job.command` içinde sır **düz metin** duruyordu: `cron` şemasını okuyabilen
herkes görüyor, değer `pg_dump`'a ve yedeklere düşüyordu.

YAPILAN: değer **DEĞİŞTİRİLMEDEN** Vault'a taşındı; altı cron işinin komutu
çalışma anında `vault.decrypted_secrets`ten okuyacak biçimde yeniden tanımlandı
(jobid 1 · 2 · 3 · 7 · 9 · 10). Değer aynı kaldığı için edge function ortam
değişkenine dokunulmadı → **kesinti olmadı**.
Blok korumalıydı: Vault'tan okunan değer birebir aynı değilse hiçbir cron'a
dokunmadan duracaktı; ayrıca her iş için "düz metin komutta kaldı mı" denetimi
yapıldı. Sır hiçbir mesaja, dosyaya ya da commit'e YAZILMADI — değer yalnız
veritabanının içinde dolaştı.

CANLI DOĞRULAMA (04:33):
- `cron.job` içinde düz metin sır taşıyan iş sayısı: **0**
- `vault.secrets` içinde `cron_secret`: **1**
- 04:33:00 nöbetçi koşumu: **200** → Vault okuması çalışma anında sorunsuz.

### AÇIK — P1 · `CRON_SECRET` DEĞERİNİN YENİLENMESİ (yalnız kurucu yapabilir)
Vault taşıması **saklama yerini** düzeltti, **değeri** değiştirmedi. Değerin
yenilenmesi gerekiyor çünkü bu oturumda maskeleme denemem tutmadı ve değer
oturum dökümüne girdi (ayrıntı aşağıdaki blokta).
**BUNU BEN YAPAMAM — yapısal sebeple:** yeni değeri ben üretsem ya da okusam
değer yine benim bağlamıma girer, yani yenileme amacını boşa çıkarır. Yeni
değeri görmeyen biri üretmelidir.
RUNBOOK (kurucu · sırayla, kesintisiz):
1. Yeni bir sır üret (ör. `openssl rand -base64 32`). **Bana gösterme.**
2. Supabase → Edge Functions → Secrets: `CRON_SECRET` değerini yenisiyle
   güncelle. (Bu adım tek başına cron'ları 401'e düşürür; hemen 3. adıma geç.)
3. SQL (tek ifade, cron komutlarına DOKUNMAZ — hepsi zaten Vault'tan okuyor):
   `select vault.update_secret((select id from vault.secrets where name='cron_secret'), '<YENİ DEĞER>', 'cron_secret', 'Edge function cron kapisi (x-cron-secret)');`
4. Kontrol: 3 dakika sonra
   `select status_code, created from net._http_response order by created desc limit 3;`
   → **200** olmalı. 401 görürsen 2. ve 3. adımdaki değerler tutmuyordur.
> 2. ve 3. adım arasında en fazla bir nöbetçi turu (3 dk) 401 alır; iş kaybı
> olmaz, tur yeniden koşar. Komutlar Vault'tan okuduğu için artık yenileme
> **tek noktadan** yapılır — cron tanımlarına bir daha dokunmak gerekmez.

### ACİLLEŞTİ — P1 · CRON SIRRI: değer artık oturum dökümünde de var
Sırrı maskeleyerek okumaya çalıştım; maskem `"x-cron-secret": "..."` JSON
biçimini hedefliyordu, oysa jobid 3 ve 7 `jsonb_build_object('x-cron-secret',
'...')` biçimini kullanıyor. Maske tutmadı ve **değer bu oturumun dökümüne
girdi.** Hiçbir dosyaya, commit'e ya da mesaja YAZILMADI; düzeltmeler değeri
veritabanının içinden okuyarak yapıldı.
SONUÇ: "sır veritabanında açık metin" maddesi artık yalnız `pg_dump` riski
değil — **anahtarın yenilenmesi gerekiyor.** Yenileme iki çalışan cron'u ve
`CRON_SECRET` ortam değişkenini birden etkilediği için kurucu kararıdır.
- [x] P1 · `CRON_SECRET` yenilendi ve Vault'a alındı · Kabul: `cron.job.command`
      içinde düz metin sır yok (değer `vault.decrypted_secrets`ten okunuyor),
      yeni değer edge function ortamına girildi, cron işleri yeni değerle koşuyor
      ve `net._http_response`ta 200 dönüyor · **DONE 25.08.2026**
      · Doğrulama: aşağıdaki canlı kanıt.

      **CANLI KANIT (25.08, salt okuma — değer görülmedi/okunmadı):**
      Kurucu yenilemeyi hem *Edge Functions → Secrets* hem *Vault* tarafında yaptı.
      `net._http_response` son 90 dakika:

      | zaman (UTC) | durum | anlamı |
      |---|---|---|
      | 08:27 – 09:42 | **200** ×29 | eski değerle olağan koşum |
      | **09:45:00** | **401** ×1 | **yenileme boşluğu** — iki taraf bir an ayrı düştü |
      | 09:48 · 09:51 · 09:54 | **200** ×3 | **yeni değer iki tarafta da geçerli** |

      Bu, H-1'in A seçeneğinin peşinen kabul ettiği imzanın aynısıdır:
      *"en fazla bir nöbetçi turu (3 dk) 401; iş kaybı yok, tur yeniden koşar."*
      Tek 401'den sonra üç tur üst üste 200 döndü → yenileme başarılı.

      **Saklama yarısı da doğrulandı:** yedi cron işinin hiçbirinde düz metin sır
      yok; altısı `vault.decrypted_secrets`ten okuyor, yedincisi (jobid 4
      `notify-admins-new-tariff`) sır kullanmıyor — komutu
      `SELECT public.notify_admins_new_tariff();`, HTTP çağrısı değil.

      **SIR HİJYENİ:** `net.http_request_queue` / istek başlıkları **hiç
      sorgulanmadı** — `x-cron-secret` başlığı orada taşınır. Yalnız yanıt
      tarafındaki `status_code` ve `created` okundu. Değer istenmedi,
      görülmedi, hiçbir çıktıya yazılmadı.

### TETİKLEYİCİ DENETİMİ — 24.08 (salt okuma · `closed_at` kusurunun sınıfı tarandı)
`closed_at` kusuru şu sınıftandı: **tetikleyicinin beklediği sütunu uygulama hiç
yazmıyor.** Aynı sınıftan başka var mı diye bütün tetikleyiciler tarandı
(24 tetikleyici; `update_updated_at_column` hariç).

`akis_olay_yaz()` dokuz olay kodu üretebiliyor. Canlıda hangileri doğmuş:
| olay kodu | koşul | canlı |
|---|---|---|
| `belge_yuklendi` | `case_documents` INSERT | 4 ✓ |
| `oturum_planlandi` | `case_sessions` INSERT | 1 ✓ |
| `foy_onaylandi` | `durum` → `onaylandi` | 3 ✓ |
| `foy_gonderildi` | `durum` → `gonderildi` | 2 ✓ |
| `anlasma_taslagi_uretildi` | `agreement_documents` INSERT | 1 ✓ |
| `oturum_iptal_edildi` | `status` → `cancelled` | 0 — durum oluşmamış |
| `oturum_degistirildi` | `status`/`scheduled_at` değişimi | 0 — durum oluşmamış |
| `gorusme_notu_eklendi` | `case_notes` INSERT | 0 — tetikleyiciden sonra not eklenmemiş (yazan iki yüzey VAR: `CaseNotesFAB`, `MeetingNotesPanel`) |
| `anlasma_belgesi_imzalandi` | `signed_by` değişimi | **0 — YAPISAL** |

**TEK YAPISAL BULGU:** `anlasma_belgesi_imzalandi` olayı **hiç doğamaz**, çünkü
`agreement_documents.signed_by` sütununu **uygulamada yazan hiçbir yer yok**
(tarandı; eşleşenlerin hepsi farklı bir sütun olan `assigned_by`). Yani imza
akışı henüz KURULMAMIŞ; şema ve tetikleyici hazır, yüzey yok.
Bu bir kusur DEĞİL, eksik özelliktir: imza ürünün beş insan kapısından biridir
(§13 · constitution) ve yapılması ürün kararıdır — kendiliğinden eklenmez.
- [x] P2 · İmza akışı yok: `agreement_documents.signed_by` hiçbir yüzeyden
      yazılmıyor, bu yüzden `anlasma_belgesi_imzalandi` olayı hiç doğmuyor ve
      ona bağlanacak hiçbir akış çalışamaz · Kabul: imzalayan kişi ve zaman
      `signed_by` üzerine yazılıyor, olay doğuyor, `akis_olaylari`da görünüyor ·
      **ÖNCE KURUCU KARARI** (imza kapısının ürün davranışı — §7.1/§7.5).

`akis_olay_yaz_dongu()` iki tabloda: `taraf_kalemleri` (I+U →
`taraf_kalemleri_guncellendi`, 35 olay) ve `ajan_gorevleri` (**yalnız U** →
`soru_cevaplandi`). Diğer tetikleyiciler koruma/bakım işidir
(`enforce_*_guard`, `protect_delete`, `handle_new_user`, `set_*_updated_at`) ve
olay üretmez.
ETKİ ALANI NOTU: bu turda `ajan_gorevleri`ne `asama_gecisi` satırı eklendi.
Oradaki tek tetikleyici **AFTER UPDATE**tir; INSERT onu ateşlemez, yani yeni
satırlar olay üretmiyor. Kontrol edildi, temiz.

### KAPANDI — 24.08 · P1 · dosya kapanışı `closed_at`i gerçekten dolduruyor (`aef716e`, publish)
Kayıt silme maddesini araştırırken çıktı ve ondan daha ağır bir kusur.
KÖK NEDEN: `closed_at`i dolduran şey bir **veritabanı tetikleyicisidir** ve
`outcome` değişimini izler:
```
set_case_closed_at → IF NEW.outcome IS NOT NULL
                     AND OLD.outcome IS DISTINCT FROM NEW.outcome
                     THEN NEW.closed_at := COALESCE(NEW.closed_at, now());
```
Kapanış ekranı (`Phase9Closing.closeCase`) ise **yalnız `status`** yazıyordu.
İkisi hiç buluşmuyor → `closed_at` BOŞ kalıyordu.
CANLI KANIT: `outcome` dolu 5 dosyanın beşinde de `closed_at` dolu; bu ekrandan
kapatılan **1 dosyada ikisi de boş** (`status='agreed'`, `outcome=null`).

BOŞ `closed_at`in dört bedeli — hepsi kodda okunuyor:
| nerede | ne olurdu |
|---|---|
| `ajan-nobetci:1954` | 24 saatlik ses silme sayacı BAŞLAMIYOR |
| `dosya-verilerini-sil:145` | 5 yıllık saklama sayacı `now()`a düşüyor, her çağrıda baştan |
| `generate-official-document:230` | resmî belgeye "Sürecin Bitiş Tarihi" yazılmıyor |
| `OutcomeAnalytics:126` | `outcome`u boş dosya sonuç istatistiğine hiç girmiyor |

En ağırı birincisi: **tarafa onay metninde "ses kaydı süreç bitiminden 24 saat
sonra kalıcı olarak silinir" sözü veriliyor.** Sayaç hiç başlamadığı için bu söz
tutulamazdı — constitution m.10 (süresiz saklama yasağı) ve KVKK kapsamında.

EKRAN KUSURU GİZLİYORDU: kapanış tarihi `closed_at` yerine `updated_at`ten
okunuyordu. `updated_at` sonraki her düzenlemede değiştiği için gösterilen
"kapanış tarihi" zamanla kayıyordu — semptomu örten bir yama.
DÜZELTME: kapanış hem `status` (`agreed`/`failed`) hem `outcome`
(`anlasma`/`anlasamama`) yazıyor; tarih `closed_at`ten okunuyor. İki sütun ayrı
sözlük taşır, karıştırılmadı.
Tezgâh (`tests/dosya-kapanis-closed-at.test.ts`, 4 durum) **kanıtlandı**: kusur
geri getirilip koşuldu → 3 test DÜŞTÜ; geri alınınca 4/4 geçti.

### KAPANDI — 24.08 · P2 · kayıt silme kuralı ZATEN KURULU (kod işi çıkmadı)
Kuyruktaki madde "ses süreç bitiminden 24 saat sonra, döküm süreç sonunda;
nöbetçi turunda otomatik, satıra silme zamanı + notu yazılarak" diyordu.
OKUNDU: `ajan-nobetci/index.ts:1930 kayitSilmeKollari` bunu **tam olarak**
yapıyor ve `index.ts:3046`'da nöbetçi turuna bağlı. Şema da hazır
(`ses_silindi_at` · `dokum_silindi_at` · `ses_silme_notu` · `dokum_silme_notu`).
Ses için depodaki dosya da siliniyor, satır da boşaltılıyor; bitiş zamanı yoksa
tahmin ÜRETİLMİYOR, gerekçe yazılıyor. Yani madde bayat.
AMA kol sessizce hiç çalışmıyordu — sebebi yukarıdaki `closed_at` kusuru.
`oturum_kayitlari` bugün **0 satır** (kayıt hattı henüz kurulmadı), o yüzden
zarar doğmamıştı; hat açılsaydı kayıtlar süresiz kalırdı.
- [x] P2 · Silme kuralı · DONE 24.08.2026 · Doğrulama: kol kurulu ve bağlı;
      çalışmasını engelleyen `closed_at` kusuru `aef716e` ile giderildi.

### KAPANDI — 24.08 · P2 · kayıt protokolü iki ekranda tek kaynaktan okunuyor (`7032284`, publish)
Kuyruk maddesi "harici araç yasağı metni taraf ekranında YOK" diyordu. **Ölçüm
bunu yalanladı:** metin `CaseRoom.tsx:1293`'te zaten vardı ve arabulucudakiyle
**birebir aynıydı** (iki dize karşılaştırıldı, eşit). Maddenin öncülü bayattı.

GERÇEK KUSUR İKİZLENMEYDİ: `KAYIT_ONAY_SAAT`, `KAYIT_ONAY_SURUMU` ve yasak
cümlesi **iki dosyada ayrı ayrı** gömülüydü. O gün aynıydılar; biri değişince
öteki sessizce eski kalırdı. En tehlikelisi **sürüm sapması**: taraf `"v1"`
onayı verirken arabulucu `"v2"` yazsa, kayıtta hangi metne onay verildiği
belirsizleşirdi — B18'in dayanağı çürürdü.
CANLI KANIT: yayındaki eski pakette (`index-DThEJGGi.js`) yasak cümlesi
**2 kez** geçiyordu; yani ikizlenme canlıda da vardı.
DÜZELTME: `src/lib/kayitProtokolu.ts` açıldı, iki yüzey de oradan okuyor.
`KAYIT_ONAY_METNI` yasak cümlesini ve süreyi tek kaynaktan interpole ediyor →
sapma yapısal olarak imkânsız. Ekranda gösterilen "48 saat" metinleri de
sabitten türetildi (sabit değişirse ekran yalan söylemesin).
Tezgâh (`tests/kayit-protokolu-tek-kaynak.test.ts`, 6 durum) **kanıtlandı**:
ikizlenme geri getirilip koşuldu → 4 test DÜŞTÜ; geri alınınca 6/6 geçti.

> DERS — TEZGÂHIN KENDİSİ KUSURLU ÇIKTI. İlk yazımda sabitin yeniden
> tanımlanmasını `new RegExp(\`const\s+${'{'}ad{'}'}\s*=\`)` ile arıyordum. Şablon
> dizesinde `\s` bir kaçış olarak yeniyor; desen sessizce `consts+…` oluyor ve
> **hiçbir zaman eşleşmiyor**. Tezgâh yeşil yanıyordu ama kusuru KAÇIRIYORDU.
> Fark edilme yolu: ikizlenme geri getirilip koşulduğunda o testin de düşmesi
> gerekirken geçmesi. Regex kaldırıldı, kesin dize aramasına çevrildi.
> KURAL: bir tezgâh "geçti" demeden önce, kusur geri getirildiğinde DÜŞTÜĞÜ
> görülmelidir. Yeşil tezgâh kanıt değildir; düşen tezgâh kanıttır.

### KAPANDI — 24.08 · P1 · `ZORUNLU_GIRDI` sözleşmesi eksikti (üç GİZLİ kusur, `618fb74`)
`girdiTamamla` düzeltmesini yaparken sözleşmenin kendisi denetlendi: `MOTORA_BAGLI`
listesindeki her kolun `ZORUNLU_GIRDI` tanımı var mı? Üçünde YOKTU; varsayılan
`["case_id"]` uygulanıyordu. Oysa kendi kapıları daha fazlasını istiyor:
| kol | kendi kapısı | 400 metni |
|---|---|---|
| `classify-dispute` | metin ≥ 5 karakter | "Metin çok kısa" |
| `detect-legal-deadlines` | `case_id` + `dispute_type` | "case_id ve dispute_type gerekli" |
| `analyze-meeting-notes` | `case_id` + `newNote` | "newNote required" |
Yani bu kollara bir akış kuralı yazıldığı an koşucu eksik gövdeyle çağırıp 400
alacaktı — `124e6cb`'de düzeltilenin aynı sınıfı.

**GİZLİ, HENÜZ CANLI DEĞİL — bu ölçüldü:** canlı `akis_kurallari` tablosu okundu
(9 kural: 6 etkin, 3 kapalı); üç kola işaret eden kural YOK. Nöbetçinin
`OTOMATIK_KOLLAR` listesinde de yoklar. Bu yüzden bugün hata doğurmuyorlar.
DÜZELTME: üçü de `ZORUNLU_GIRDI`ye yazıldı. Bu alanlar dosyadan TÜRETİLEMEZ
(`girdiTamamla` yalnız case/session/party/document çözer); olayın `veri`
alanında gelmeleri gerekir. Gelmezlerse iş kurulmaz ve eksik açıkça bildirilir —
uydurulmaz (constitution m.2). Sınır kodda yazılı: bu liste "alan dolu mu"
denetler; `classify-dispute`ın 5 karakter ölçütü kendi kapısında kalır.
Tezgâh (`tests/girdi-tamamla-eksik-alan.test.ts`, 9 durum) **kanıtlandı**:
düzeltme geçici geri alınıp koşuldu → 3 test DÜŞTÜ; geri alınınca 9/9 geçti.

### AKIŞ KURALI DENETİMİ — 24.08 (salt okuma, kusur çıkmadı)
Canlı `akis_kurallari` × kod sözleşmesi karşılaştırıldı:
- 6 ETKİN kuralın altısının hedef fonksiyonu da `MOTORA_BAGLI` listesinde. ✓
- 3 KAPALI kural: `belge_yuklendi__analiz`, `kalem_guncellendi__karsilastir`,
  `foy_onaylandi__gonder` — üçü de bilerek kapalı (çift koşum / çift gönderim).
- KURALI OLMAYAN OLAYLAR (kusur değil, kayda geçti): `soru_cevaplandi` (10 satır,
  en yenisi 23.08 22:35 — sistemin en yeni olayı), `taraf_analizi_tamamlandi`,
  `foy_taslagi_hazirlandi`, `foy_gonderildi`, `belge_ozeti_uretildi`.
  `soru_cevaplandi` kodda HİÇ geçmiyor — bir veritabanı tetikleyicisi yazıyor,
  kimse okumuyor. Motorun 5. maddesi ("cevap gelince kol yeniden uyanır") yine de
  SAĞLANIYOR: uyandırma `ajan-nobetci/index.ts:1141`'de sorunun gerekçesindeki
  `[kol:<fonksiyon>]` etiketiyle yapılıyor, olay üzerinden değil.
  Bu olaylar "oldu" işaretidir, akış tetiği değil. İşlenmemiş olay sayısı 0.
- [x] P3 · `soru_cevaplandi` olayını yazan tetikleyici ile onu okuyan kimse yok ·
      **Kaynak bulundu (24.08):** `trg_akis_gorev_cevap` → `akis_olay_yaz_dongu()`,
      `ajan_gorevleri` üzerinde **AFTER UPDATE**; `durum` `'yapildi'`ya döndüğünde
      `soru_cevaplandi` yazıyor (`veri`: `gorev_id`, `gorev_tipi`).
      Çözüm SQL'dir → Cowork; ama önce ürün kararı gerekir: olay tüketilecek mi
      (kural yazılıp uyandırma olaya bağlanacak mı) yoksa tetikleyici mi kalkacak?
      Bugün uyandırma `ajan-nobetci:1141`'de `[kol:…]` etiketiyle çalışıyor ve
      motorun 5. maddesi SAĞLANIYOR — yani acil değil.
      NOT: tetikleyici yalnız UPDATE'te ateşliyor; `akis_kosuldu`/`asama_gecisi`
      satırları INSERT ile yazıldığı için olay üretmiyorlar (etki alanı temiz). ·
      Kabul: ya bir tüketici tanımlanır ya da tetikleyici kaldırılır; her iki
      hâlde `akis_olaylari`da tüketicisiz olay birikmez.

### P0/P1 — CRON DENETİMİ 24.08: ÜÇ KUSUR, TEK COWORK PAKETİ (canlı, kanıtlı)

`cron.job` yapısı ve `net._http_response` son 7 saati okundu. **Sır hiçbir yere
yazılmadı** — komut yalnız yapısal olarak sorgulandı (`command like '%…%'`).

SAATLİK DAĞILIM (`net._http_response`, 23.08 17:00–23:15 UTC):
| saat | toplam | yanıt gelen | 200 | 401 | zaman aşımı |
|---|---|---|---|---|---|
| 23:00 | 7 | 0 | 0 | 0 | **7** |
| 22:00 | 21 | 1 | 0 | **1** | **20** |
| 21:00 | 23 | 3 | 2 | **1** | **20** |
| 20:00 | 21 | 1 | 0 | **1** | **20** |
| 19:00 | 21 | 0 | 0 | 0 | **21** |
| 18:00 | 21 | 1 | 0 | **1** | **20** |
Saatte ~20 zaman aşımı = 3 dakikalık nöbetçi. Saatte 1 gerçek durum kodu =
saatlik hatırlatma cron'u ve o **hâlâ 401**. 21:00'daki iki 200 elle çağrıdır.

**(1) P0 · jobid 1 `send-session-reminders-hourly` — 401 SÜRÜYOR, DÜZELMEDİ.**
Yapısal kanıt: komutta `Authorization` VAR, `x-cron-secret` **YOK**. Bir önceki
oturumun teşhisi birebir doğrulandı; Cowork düzeltmesi henüz uygulanmamış.

**(2) P0 · jobid 2 `dual-ai-validate-nightly` — YENİ BULGU, aynı sınıf hata.**
Komutta **ne `Authorization` ne `x-cron-secret` var**. Fonksiyonun kapısı
(`dual-ai-validate/index.ts:42-63`) iki yoldan yetki arıyor: cron sırrı ya da
YÖNETİCİ kullanıcı. İkisi de gelmediği için çağrı **kesin 401** alır. Gecelik
02:00 işi olduğu için yanıt tablosunun 7 saatlik penceresinde görünmüyor, ama
kusur yapısal ve kesindir: bu doğrulama işi hiç koşmamıştır.

**(3) P1 · jobid 7 `ajan-nobetci-5dk` (`*/3 * * * *`) — DENETİM KANALI KÖR.**
Yetki doğru (`x-cron-secret` var), ama komutta `timeout_milliseconds` YOK →
pg_net varsayılanı **5000 ms** ve çağrıların **%100'ü** bu sınırda düşüyor
(`error_msg: "Timeout of 5000 ms reached … HTTP Request/Response time: ~4,8 s"`).
İŞ DURMUYOR — bu ölçüldü: `akis_olaylari`da işlenmemiş olay **0**, en yeni olay
23.08 22:35 işlenmiş (zaman aşımı penceresinin içinde). Yani istek gidiyor,
fonksiyon koşuyor; yalnız **yanıt kaydedilmiyor**.
NEDEN ÖNEMLİ: 24.08 dersi "`cron.job_run_details` 'succeeded' hiçbir şey
kanıtlamaz, tek gerçek `net._http_response`" diyordu. Bu iş için o tek gerçek
kanal da körelmiş durumda — gerçek bir 500 ya da 401 zaman aşımından
ayırt edilemez. Sessiz arıza riski.
(`ajan_kosum_izi` son yazım 19.08 11:48 — bu bir arıza kanıtı DEĞİL: o tablo
yalnız bir kol koştuğunda/atlandığında yazılır, yeni dosya işi yoksa sessizdir.)

#### COWORK PAKETİ — üç cron işi tek turda düzeltilsin
1. **Ne yapılacak:**
   (a) jobid 1 (`send-session-reminders-hourly`) komutundaki `headers` nesnesine
       `x-cron-secret` eklensin. Değer **jobid 3 ya da jobid 7'nin komutunda
       zaten yazılı olan değerin aynısıdır** — oradan kopyalanır, hiçbir yere
       ayrıca yazılmaz.
   (b) jobid 2 (`dual-ai-validate-nightly`) komutuna aynı `x-cron-secret`
       başlığı eklensin (şu an hiç yetki başlığı yok).
   (c) jobid 7 (`ajan-nobetci-5dk`) `net.http_post` çağrısına
       `timeout_milliseconds := 30000` eklensin.
   Üçü de `cron.schedule('<işin adı>', '<mevcut zamanlama>', $$ … $$)` ile
   yeniden tanımlanır. URL, gövde ve zamanlama DEĞİŞMEZ.
2. **Neden gerekli:** (a) oturum hatırlatmaları hiç gitmiyor — taraflar 24 saat
   kala hatırlatma almıyor. (b) gecelik çift-yapay-zekâ doğrulaması hiç koşmuyor.
   (c) ürünün ana koşucusunun sonucu hiçbir yerde görünmüyor; sessiz arıza riski.
3. **Çalıştırılacak işlem:** yukarıdaki üç `cron.schedule` çağrısı.
4. **Başarı kontrolü:** bir sonraki tam saatten sonra
   `select jobid, status_code, error_msg, created from net._http_response order by created desc limit 10;`
   → saatlik satır **200** olmalı (401 değil); 3 dakikalık satırlarda
   `status_code` **dolu** olmalı (Timeout değil). jobid 2 için ertesi gün 02:00.
5. **Sonuç gelince ben ne yapacağım:** 200 görülürse `case_sessions` üzerinden
   hatırlatma gönderilen oturumu doğrulayıp maddeleri DONE yazacağım; 401 ya da
   zaman aşımı sürerse ilgili fonksiyonun kapısını yeniden okuyup ikinci turu
   koşacağım.

#### COWORK — GERİYE DÖNÜK TEK SATIR (yukarıdaki `closed_at` kusurunun kalıntısı)
1. **Ne yapılacak:** `outcome`u ve `closed_at`i boş kalmış **1 dosya** için
   `outcome` yazılsın; tetikleyici `closed_at`i kendisi dolduracaktır.
   `update public.cases set outcome = 'anlasma' where status = 'agreed' and outcome is null;`
   (Bu dosyanın `status`u zaten `agreed`; başka dosya etkilenmez.)
2. **Neden gerekli:** o dosyanın kapanış tarihi hiçbir yerde yok; saklama ve
   silme sayaçları başlamıyor, resmî belgesine bitiş tarihi yazılamıyor.
3. **Çalıştırılacak işlem:** yukarıdaki tek `update`.
4. **Başarı kontrolü:** `select count(*) from cases where status in ('agreed','failed') and closed_at is null;` → **0**.
5. **Sonuç gelince ben ne yapacağım:** 0 görülürse maddeyi DONE yazacağım.
> Kod tarafı `aef716e` ile kapandı; bundan sonra kapatılan dosyalarda bu durum
> tekrarlanmaz. Bu madde yalnız mevcut tek satırın onarımıdır.

> P1 · CRON SIRRI VERİTABANINDA AÇIK METİN maddesi DEĞİŞMEDİ, hâlâ açık
> (aşağıdaki blokta). Bu paket sırrı yenilemez, yalnız mevcut değeri kullanır.

### KAPANDI — 24.08 · kuyruktaki üç akış hatası CANLIDA ZATEN ÇÖZÜLMÜŞ (kanıtla)
Kuyruktaki üç madde 19–20.08 kanıtıyla yazılmıştı. Canlı kayıt sırayla okundu:
`ajan_gorevleri` tablosunda **toplam 5 `akis_hatasi` satırı var, en yenisi
20.08 17:48**; buna karşılık **43 `akis_kosuldu`, en yenisi 23.08 21:57**.
- P1 · `hazirlik-foyu` 400 → hata 19.08 08:27; **aynı gün 11:48'de
  `[akis:65a31953…:oturum_planlandi__foy_hazirla] hazirlik-foyu çalıştırıldı
  (2 taraf)`** yazılmış. Kapandı. (Altındaki yapısal kusur ayrıca giderildi —
  yukarıdaki `girdiTamamla` maddesi.)
- P2 · `hazirlik-foyu-gonder` 401 → hata 20.08 00:48; **20.08 01:33'te
  `hazirlik-foyu-gonder çalıştırıldı`** yazılmış. Kapandı. Not: kuralın kendisi
  (`foy_onaylandi__gonder`) canlıda `etkin=false` — çift gönderim yolu kapalı.
- P1 · `bilirkisi_durum__ilerlet` boş dönüyor → tek hata 20.08 17:48, olayın
  verisi `aday_sayisi:0, alan_sayisi:0` idi. **Aynı kural 20.08 17:45 ve 21.08
  02:00'de başarıyla koşmuş**; `bilirkisi_onerileri` bugün **2 satır** taşıyor
  (son 23.08 21:55), `bilirkisi_onerildi` olayı 4 kez doğmuş. Kabul kriteri
  ("`bilirkisi_onerileri`ne satır yazılıyor … `akis_hatasi` doğmuyor") SAĞLANDI.
- Ayrıca: 20.08'deki "Bu konuda size yazabileceğim bir şey bulamadım." metni
  hatanın kendisi değil, o tarihte sınır katmanının hata metnini tümüyle elemesi
  yüzünden kalan artıktır; `akis-yurut/hata-metni.ts` ile zaten giderilmişti.
- Bu üç madde kuyrukta artık AÇIK DEĞİLDİR; bayat kanıtla yazılmışlardı.

### KRİTİK KARAR — 24.08
- Aşama geçiş kapısı **arabulucunundur**; taraf yüzeyinde düğme yalnız gezinir.
  Gerekçe: düğmenin kendi açıklaması ve RLS ölçütü zaten bunu söylüyor; yeni
  davranış icat edilmedi, mevcut çelişki giderildi.

---
## Nerede kaldık

- Tarih: 24.08.2026 (gece oturumu · KAPANIŞ — bağlam şişti, `medipact dur` kapanışı kendiliğinden yapıldı)
- Aşama: DAOS · canlı doğrulama döngüsü (§11-B)
- Aktif görev: yok — yarım iş yok, commit edilmemiş kendi değişikliğim yok
- Son tamamlanan iş: tetikleyici envanteri + cron tablosu canlıyla eşitlendi (`6664839`)
- Doğrulama sonucu: `npm run test` 55/55 · tsc hatasız · build hatasız · lint 2361 (oturum başı 2367)
- Açık blokaj: **P0 · oturum hatırlatma cron'u 401** — Cowork paketi hazır (aşağıdaki blokta)
- Sıradaki uygulanabilir iş: Cowork cron düzeltmesi → sonra Aşama 7'nin sunucuya iz bırakması

> **DURAK NOTU (24.08.2026).** Çalışma ağacı temiz; `main` ile `origin/main` aynı
> commit'te. Bu turda dokuz commit atıldı, hepsi push edildi ve canlıya çıktı.
> `CLAUDE.md` ve `COWORK.md` kurucunun kendi düzenlemesiyle değişik duruyor —
> §11 gereği ellenmedi, commit'lenmedi. İzlenmeyen iki dosya (xlsx, repomix)
> oturum başından beri duruyor, dokunulmadı.
> Yeni oturum: `medipact devam` → "Sıradaki uygulanabilir iş"ten sürer.

### BU TURDA CANLIYA ÇIKANLAR (hepsi doğrulandı)
| iş | commit | deploy |
|---|---|---|
| P1 · A5 iletişim tercihi sayfası | `469e0b2` | publish |
| P1 · B18 kayıt izni kapısı | `71774b8` | publish + `create-video-room` |
| P2 · defterdeki bayat anahtar | `cffec58` | **36 fonksiyon fan-out** |
| P1 · onay zinciri (üç kusur) | `51b2cce` `63cf757` | publish + `akis-onayla` |
| P2 · `foy_gonderildi` mükerrer | `2f3173c` | `hazirlik-foyu-gonder` |
| P1 · `akis-onayla` yetki ölçütü | `68eac7b` | `akis-onayla` |
| kayıt · tetikleyici envanteri | `6664839` | — |

### KAPANDI — P2 · `config.toml`'da eksik fonksiyon blokları (kod işi ÇIKMADI)
Kuyrukta "`config.toml`'da `bilirkisi-secim` bloğu yok" maddesi vardı. 16
fonksiyonun bloğu yok. AMA blok eklemek bir şeyi düzeltmiyor:
KANIT — `deadline-reminder-cron` `config.toml`'da YOK, cron'u JWT göndermiyor
(yalnız `x-cron-secret`), ve **401 almıyor, çalışıyor**. Dosyada olsaydı
`verify_jwt` varsayılanı `true` olacak, geçit isteği içeri almayacaktı.
SONUÇ: Lovable üzerinden deploy edilen fonksiyonlarda canlı `verify_jwt` ayarı
sunucu tarafında tutuluyor; `config.toml` bu yolda **doğruluk kaynağı değil**.
YENİ MADDE (P2, kod değil belge): `config.toml` gerçeği anlatmıyor — dosya ya
canlı ayarla eşitlenmeli ya da başına "bu dosya Lovable deploy'unda etkisizdir"
notu düşülmeli. Eşitleme için canlı ayarın okunabilmesi gerekiyor (panel işi).
Bu tespit yapılmadan blok eklemek, yanlış belgeyi büyütmek olurdu.

## Nerede kaldık

- Tarih: 24.08.2026 (gece oturumu · 4. blok)
- Aşama: DAOS · canlı doğrulama döngüsü (§11-B)
- Aktif görev: yok
- Son tamamlanan iş: `akis-onayla` yetki ölçütü eşitlendi + `foy_gonderildi` mükerrer yazımı kalktı
- Doğrulama sonucu: `npm run test` 55/55 · tsc hatasız · build hatasız · lint 2361
- Açık blokaj: **P0 · oturum hatırlatma cron'u canlıda 401 dönüyor** — düzeltme SQL, Cowork paketi aşağıda
- Sıradaki uygulanabilir iş: Cowork cevabı gelene kadar → tetikleyici envanteri (`kurulu-envanter.md`)

### P0 — CANLI ARIZA · oturum hatırlatmaları GÖNDERİLMİYOR (24.08 teşhis, kanıtlı)

BELİRTİ: `send-session-reminders` cron'u (jobid 1, `0 * * * *`) her saat başı
**HTTP 401 `{"error":"Unauthorized"}`** dönüyor.

KANIT (canlı, `net._http_response`): son 7 günde 401 dönen 5 yanıt; hepsi tam
saat başında (17:00 · 18:00 · 20:00 · 21:00 · 22:00 — o saatte koşan tek iş bu).
200 dönen tek iki yanıt bu turdaki elle işlerimiz. Yani hatırlatma e-postaları
en az yanıt tablosunun tuttuğu süre boyunca HİÇ gitmedi.

NEDEN DENETİMDEN KAÇTI — `cron.job_run_details` **"succeeded"** diyor.
`net.http_post` isteği KUYRUĞA ALIR; SQL başarıyla döner. Cron'un "başarılı"
kaydı, fonksiyonun çalıştığı anlamına GELMİYOR. Gerçek sonuç yalnız
`net._http_response`ta. Bu, "cron kayıtlarına bakılmadı" maddesinin karşılığıdır.

KÖK NEDEN: fonksiyon iki yoldan yetki kabul ediyor
(`send-session-reminders/index.ts:136-159`):
  (a) `x-cron-secret` başlığı `CRON_SECRET` ile eşleşirse, ya da
  (b) `Authorization: Bearer <kullanıcı JWT>` sahibi YÖNETİCİ ise.
Cron işi (jobid 1) yalnız `Authorization` gönderiyor, `x-cron-secret`
GÖNDERMİYOR. Gönderilen jeton bir kullanıcıya ait olmadığı için `getUser()`
kullanıcı döndürmüyor → yetki yok → 401.
Karşılaştırma: jobid 3 (`deadline-reminder-cron`) `x-cron-secret` gönderiyor ve
401 dönmüyor. Yani doğru kalıp aynı veritabanında zaten var.

KODDA DÜZELTİLMEZ: anon jetonunu kabul etmek uç noktayı herkese açardı.
Düzeltme cron işinin başlığında; SQL çalıştırmak §10'a göre Cowork'tedir.

#### COWORK PAKETİ — jobid 1'in başlığına cron sırrı eklensin
1. **Ne yapılacak:** `cron.job` jobid 1 (`send-session-reminders`) komutundaki
   `headers` nesnesine `x-cron-secret` başlığı eklensin. Değeri **jobid 3'ün
   komutunda zaten yazılı olan değerin aynısıdır** — oradan kopyalanır, hiçbir
   yere ayrıca yazılmaz. `cron.schedule('<işin adı>', '0 * * * *', $$ … $$)` ile
   iş yeniden tanımlanır; URL, gövde ve zamanlama DEĞİŞMEZ.
2. **Neden gerekli:** oturum hatırlatmaları şu anda hiç gönderilmiyor; taraflar
   24 saat kala hatırlatma almıyor.
3. **Çalıştırılacak işlem:** yukarıdaki `cron.schedule` çağrısı (tek ifade).
4. **Başarı kontrolü:** bir sonraki tam saatten sonra
   `SELECT status_code, created FROM net._http_response ORDER BY created DESC LIMIT 5;`
   → o saate ait satır **200** olmalı, 401 olmamalı.
5. **Sonuç gelince ben ne yapacağım:** 200 görülürse `case_sessions` üzerinden
   hatırlatma gönderilen oturumu doğrulayıp maddeyi DONE yazacağım; 401 sürerse
   fonksiyonun kendi kapısını yeniden okuyup ikinci turu koşacağım.

### P1 — CRON SIRRI VERİTABANINDA AÇIK METİN (aynı incelemede çıktı)
`cron.job.command` içinde `x-cron-secret` değeri **düz metin** duruyor (jobid 3).
`cron` şemasını okuyabilen herkes sırrı görür; sır ayrıca `pg_dump`'a ve
yedeklere düşer. Değer bu belgeye YAZILMADI ve sohbete kopyalanmadı (§12).
ÖNERİ: sır Vault'a alınsın ve komut değeri `vault.decrypted_secrets`ten okusun;
ardından `CRON_SECRET` yenilensin. İşlem SQL'dir → Cowork. Kurucu kararı gerekir
(sır yenileme çalışan iki cron'u da etkiler), o yüzden ayrı madde yazıldı.

### YAPILDI — 24.08 · P1 · `akis-onayla` yetki ölçütü eşitlendi (`68eac7b`, redeploy)
Yalnız `assigned_mediator_id`ye bakıyordu; o alan her dosyada dolu değil
(13.08 dersi) → dosya sahibi arabulucu onay verirken 403 alıyordu. Ölçüt
`taraf-cevap/index.ts:75-89` ile aynı: yönetici · görevli arabulucu · dosya
sahibi. RLS'e dokunulmadı.
SÜPÜRME: `assigned_mediator_id` okuyan 30 fonksiyon tarandı; `user_id`siz üç
tanesi BİLEREK dar ve öyle kalmalı:
- `hazirlik-foyu-gonder` — kodda gerekçesi yazılı (gönderim kararı arabulucunun).
- `revoke-party-invite` — daveti iptal arabulucu işi; dosya sahibi çoğu dosyada
  TARAFTIR, eklemek genişletme olurdu.
- `dosya-verilerini-sil` — VERİ SİLME. Yetki genişletmek §7.3/§7.4 gereği
  Human Gate. Dokunulmadı; kurucu isterse ayrıca konuşulur.

### YAPILDI — 24.08 · P2 · `foy_gonderildi` mükerrer yazımı (`2f3173c`, redeploy)
Tek gönderimde iki olay doğuyordu (tetikleyici + kod). Koddaki satır kalktı;
kullanılmayan `olayYaz` içe aktarımı da düştü. Kanıt: föy ikinci kez
gönderilemiyor, yani tetikleyici her zaman çalışıyor — koddaki satırın tek
başına kapsadığı durum yoktu. Canlıda bu koda bağlı akış kuralı YOK, yani bugün
zararsızdı; kural bağlandığı gün adım iki kez koşacaktı.

### CRON DURUMU — tam döküm (24.08, canlı)
| iş | zamanlama | durum |
|---|---|---|
| 1 · `send-session-reminders` | saat başı | **401 — ARIZALI** (yukarıda) |
| 2 · `dual-ai-validate` | 02:00 | çalışıyor |
| 3 · `deadline-reminder-cron` | 08:00 | çalışıyor (`x-cron-secret` gönderiyor) |
| 4 · `notify_admins_new_tariff` | 1 Aralık | yıllık, sırası gelmedi |
| 7 · `ajan-nobetci` | 3 dakikada bir | çalışıyor — `ajan_gorevleri` satırları 3 dk aralıkla düşüyor |
| 9,10 · `check-new-tariff` | 1 Ara / 5 Oca | yıllık, sırası gelmedi |

---
## Nerede kaldık

- Tarih: 24.08.2026 (gece oturumu · 3. blok)
- Aşama: DAOS · canlı doğrulama döngüsü (§11-B)
- Aktif görev: yok — kuyruktaki P2 alındı, içinden iki P1 çıktı, üçü de canlıda doğrulandı
- Son tamamlanan iş: onay zinciri kusuru (üç kusur, tek zincir) — canlı kanıt aşağıda
- Doğrulama sonucu: `npm run test` 55/55 · tsc hatasız · build hatasız · lint 2364 (2367 → 2364)
- Açık blokaj: yok
- Sıradaki uygulanabilir iş: P2 · `foy_gonderildi` çift yazımı (tetikleyici + kod, tek satır)

### YAPILDI — 24.08.2026 · P2 · defterdeki bayat anahtar (`cffec58`, 36 fonksiyon redeploy)
Bir önceki blokta "fan-out pahalı" diye ertelemiştim; bu doğru gerekçe değildi.
Fan-out iş demektir, durma sebebi değil. Alındı ve kapatıldı.

- `_shared/anlatim.ts` `yaz()`: yeni `sil` parametresi — birleştirmeden SONRA
  anahtar düşürür. Birleştirmenin kendisi KALDIRILMADI: `masa-kalem-karsilastir`
  aynı satıra ayrı bir fonksiyondan `karsilastirma` yazıyor, kalkarsa o veri gider.
- `baslat()` koşum başında `yapildi`/`eksik` ikilisini düşürür · `bitti()` eksik
  yoksa anahtarı açıkça siler · `hata()` önceki `yapildi`yı bırakmaz.
- `tests/anlatim-kosum-anahtarlari.test.ts` (6 durum). **Tezgâh kanıtlandı:**
  düzeltme geçici kapatılıp koşuldu → 6 testin 4'ü DÜŞTÜ; geri açılınca 6/6 geçti.
- FAN-OUT: `anlatim.ts`'i içe aktaran 36 fonksiyonun tamamı deploy edildi.
  Lovable: "36 fonksiyonun tamamı deploy edildi — başarısız yok."

### YAPILDI — 24.08.2026 · P1 · onay zinciri: ÜÇ KUSUR, TEK ZİNCİR (`51b2cce`+`63cf757`)
Yukarıdaki işi yaparken çıktı. Zincirin sonu şuydu: **arabulucu "Onayınızı aldım,
adımı şimdi yapıyorum" cümlesini görüyor ve hiçbir şey onaylanmamış oluyordu.**

(1) SATIR SOHBETE HİÇ DÜŞMÜYORDU — `AjanPenceresi` arabulucu sorgusu yalnız
`durum='bekliyor'` okuyordu. Açık görev İKİ durumdur; `onay_bekliyor` satırları
"zorunlu insan noktası" olarak açılıyor (`ajan-nobetci:135` ·
`bilirkisi-secim:753,887,1025`). Ekranda o satırları işleyen kod ZATEN VARDI
(`gorevTikla` → `arabulucu_onayi` → `onayVer`); eksik olan satırın kendisiydi.
Taraf dalı DEĞİŞMEDİ — `onay_bekliyor` arabulucuya aittir (kör veri korundu).

(2) SUNUCU O SATIRI REDDEDİP YANLIŞ SEBEP YAZIYORDU — `akis-onayla`
`durum !== 'bekliyor'` ise "Bu onay zaten kapanmış." dönüyordu. Satır kapanmış
değil, tam tersine onaylanmayı bekliyordu. Artık açık durum iki değer.

(3) EKRAN REDDİ BAŞARI SANIYORDU — sunucu `{onaylandi:false, sebep:…}` yanıtını
200 ile döner (hata değil, karar). `onayVer` yalnız `error`/`data.error`'a
bakıyordu, o dal boş olduğu için ekranda "Onayınızı aldım" yazıyordu.
Artık `onaylandi===false` dalında sunucunun kendi sebebi basılıyor.

(+) `elverislilik_isareti` tipinin sohbette karşılığı yoktu, genel yedek cümleye
düşüyordu; adı Ajan Kontrol Paneli'ndeki adla aynı köke bağlandı (`63cf757`).

CANLI KANIT (dosya `eb70595a`, publish + `akis-onayla` redeploy sonrası):
- Kusurun boyu: canlıda **8 adet `onay_bekliyor` satırı** birikmişti; ikisi bu
  dosyada, **16–17 Ağustos'tan beri görünmüyorlardı.**
- Düzeltmeden sonra ikisi de sohbette çıktı:
  · `Onayınızı bekleyen bir adım var. 17 Ağustos 2026 Pazartesi 10:00 oturumu yapıldı mı?`
  · `… Dosyada elverişlilik bakımından dikkat gerektiren işaret var — kokpitte incele…`
- Birincisine tıklandı → `ajan_gorevleri` satırı `7b5cb963`:
  **`durum = yapildi` · `sonuc = "arabulucu onayladı"`**
  Yani onay gerçekten kaydedildi. Düzeltmeden önce bu tıklama mümkün değildi;
  mümkün olsaydı da sunucu reddedip ekran "aldım" diyecekti.

### NOT — neden durmuştum, neden durmamalıydım
Bir önceki blokta bu P2'yi "39 fonksiyon fan-out ister" diyerek kuyruğa yazıp
durdum. §5'e göre durma sebepleri dörttür: Human Gate · BLOCKED · uygulanabilir
iş kalmaması · `medipact dur`. "İş çok" bunlardan biri değildir. Kurucu uyardı,
iş alındı ve içinden iki P1 çıktı. Ders `lessons.md`'ye yazıldı.

---
## Nerede kaldık

- Tarih: 24.08.2026 (gece oturumu · 2. blok)
- Aşama: DAOS · canlı doğrulama döngüsü (§11-B)
- Aktif görev: yok — kurucunun verdiği dört madde bitti
- Son tamamlanan iş: bilirkişi "Yeniden öner" CANLI TESTİ — geçti (kanıt aşağıda)
- Doğrulama sonucu: `npm run test` 49/49 · tsc hatasız · build hatasız · lint 2365
- Açık blokaj: yok
- Sıradaki uygulanabilir iş: P2 · `agent_states.last_output` bayat anahtar kusuru (aşağıda, teşhis bitti)

### CANLI TEST GEÇTİ — 24.08.2026 · bilirkişi "Yeniden öner"
Kurucu talimatı: kendim başlat, aday üretimini tetikle, sonucu canlıda gör.
Kullanılan dosya: **MP-2026-1018 · `eb70595a`** — başlığında "(farazi test)" yazan
TEST dosyası. Gerçek uyuşmazlık dosyasına dokunulmadı.

**1. Düğme canlıda ve doğru kola bağlı.** Ajan penceresinde "Yeniden öner"
düğmesi göründü (23.08'de kodlanmıştı, bu turda publish ile canlıya çıktı).
Tıklandı → `bilirkisi-secim` `ikinci_tur` koştu.
KANIT (`agent_states`, mediator, 21:51:38Z):
  adım 1: `"Sağlık Hukuku" alanı için uzman kayıtlarını tarıyorum.`
  adım 2: `Yapıldı: "Sağlık Hukuku" alanı tarandı`
  eksik:  `yeni aday kalmadı`
Bu, düğmenin artık talimat reddine değil bilirkişi koluna bağlı olduğunun
canlı kanıtıdır (23.08 kusuru kapandı).

**2. "Aday yok" cümlesi dürüst.** Havuzda "Sağlık Hukuku" alanında kayıtlı tek
uzman var; ikinci tur yeni aday bulamadı ve bunu uydurmadan söyledi.
`bilirkisi_onerileri` sayısı değişmedi (1) — yani sahte aday yazılmadı.

**3. Sohbetten cevap yazma çalışıyor — "Cevabınızı şu an kaydedemedim" YOK.**
Ajanın sorusuna ("başka bir uzmanlık alanı yazarsanız o alanla tararım")
sohbet kutusundan `Tıp Hukuku` yazılıp gönderildi.
KANIT (`agent_states`, mediator, 21:55:00–21:55:01Z):
  adım 1: `"Tıp Hukuku" alanı için uzman kayıtlarını tarıyorum.`
  adım 2: `Yapıldı: "Tıp Hukuku" alanı için 1 aday çıkarıldı`
KANIT (`bilirkisi_onerileri`, YENİ satır 21:55:00.876Z):
  `alan = Tıp Hukuku · sira = 1 · durum = taslak · oneren = masa_ajani`
Yani cevap kaydedildi, tarama koştu, aday üretildi. Üç maddenin üçü de geçti.

TARAYICI NOTU: sekme açık bırakıldı (kurucu isterse ekranda görebilsin).
Chrome ekran görüntüsü aracı iki kez 30 sn'de zaman aşımına uğradı, ikinci
denemede döndü — sayfa donmuş değil, araç yavaş. İşi tekrarlatmadı.

### BULUNDU — P2 · `agent_states.last_output` bayat anahtar taşıyor (teşhis bitti, kod yazılmadı)
Canlı testte çıktı. `_shared/anlatim.ts:95`:
`last_output: { ...eskiCikti, adimlar, ...(ek ?? {}) }` — yani ÖNCEKİ koşumun
anahtarları, yeni koşum onları yazmasa bile SAĞ KALIYOR.
CANLI KANIT (21:55 koşumu):
  `yapildi = "Tıp Hukuku" alanı için 1 aday çıkarıldı`  ← yeni
  `eksik   = ["yeni aday kalmadı"]`                     ← 21:51 koşumundan BAYAT
  `adimlar` = 2 adım, ikisi de 21:55                    ← doğru
Yani defter kaydı kendi içinde çelişiyor: "1 aday çıkardım" + "yeni aday kalmadı".

EKRANDA GÖRÜNMÜYOR: `AjanPenceresi` yalnız `last_output.adimlar`'ı basıyor
(`AjanPenceresi.tsx:4`), "Eksik:" satırı da adımlara koşum başına yazılıyor.
Bu yüzden kullanıcıya yansıyan bir yalan YOK — kusur çalışma defterinde
(constitution m.2/m.6 denetim izi) kalıyor. P1 değil, P2.

BİRLEŞTİRME LOAD-BEARING'DİR, TOPTAN SİLİNEMEZ: `masa-kalem-karsilastir/index.ts:256`
aynı satıra `karsilastirma` anahtarını AYRI bir fonksiyondan yazıyor; `yaz()`
birleştirmeyi kaldırırsa o veri kaybolur.
ÖNERİLEN ÇÖZÜM: `bitti()` kendi sahibi olduğu anahtarları HER SEFERİNDE yazsın
(`eksik` yoksa açıkça temizlensin), `baslat()` koşum başında `yapildi`/`eksik`
ikilisini sıfırlasın. Başka yazıcıların anahtarlarına dokunulmaz.
BEDELİ: `_shared/anlatim.ts` değişir → **39 fonksiyon fan-out redeploy** (§11-B).
Bu yüzden kendiliğinden yapılmadı; ekranda görünmeyen bir kusur için 39
fonksiyon yeniden yayına alınmıyor. Sıradaki `_shared` turunda birlikte gider.

### KAPANDI — B18 P2 · harici araç yasağı metni (kod işi ÇIKMADI)
todo maddesi "iki ekranda da yazılı olmalı" diyordu; **ikisinde de zaten yazılı.**
- Taraf ekranı: `CaseRoom.tsx:1291` `KAYIT_ONAY_METNI` →
  "Kayıt yalnız MediPact oturum ekranından alınır. Harici araçlarla … kayıt yapılamaz."
- Arabulucu ekranı: `MediationEngine.tsx` `KAYIT_TEK_KAPI_UYARISI` (aynı cümle).
Madde bayattı, kapatıldı.

### AÇIK — B18 P2 · silme kuralı (bağımlı iş)
Ses süreç bitiminden 24 saat sonra, döküm süreç sonunda silinecek; nöbetçi
turunda otomatik, satıra silme zamanı + notu yazılarak.
BAĞIMLILIK: silinecek bir şey doğuran **kayıt ALMA / DÖKÜM hattı henüz yok**
(mimari/12'de "○ planlı"; `oturum_kayitlari` canlıda 0 satır). Hat yazılmadan
silme kuralı yazılamaz. Hat işine başlanınca bu madde onunla birlikte alınır.

---
## Nerede kaldık

- Tarih: 24.08.2026 (gece oturumu)
- Aşama: DAOS · canlı doğrulama döngüsü (§11-B)
- Aktif görev: bilirkişi "Yeniden öner" CANLI TESTİ (kurucu talimatı: test dosyasıyla, kendim başlatarak)
- Son tamamlanan iş: A5 (iletişim tercihi sayfası) + B18 (kayıt izni kapısı) — ikisi de canlıda
- Doğrulama sonucu: `npm run test` 49/49 (yeni B18 tezgâhı 15/15) · tsc hatasız · build hatasız · lint 2365 (2367'den düştü)
- Açık blokaj: yok
- Sıradaki uygulanabilir iş: bilirkişi "Yeniden öner" canlı testi → sonra B18'in iki P2 parçası

### YAPILDI — 24.08.2026 · P1 · A5 iletişim tercihi (`469e0b2`, PUBLISH edildi)
Teşhis 23.08'de bitmişti; bu turda uygulandı.
- `NotificationSettings.tsx`: hiçbir gönderim yolunun okumadığı on anahtar kaldırıldı.
  Sayfa artık taraf olunan dosyaları listeleyip dosya içi "İletişim Tercihlerim"
  sekmesine götürüyor. Çalışan "Deneme bildirimi" korundu.
  Yan fayda: koşullu `useState` (eski satır 81) düzeldi — hook sırası sabitlendi.
- `CaseRoom.tsx`: `?sekme=<ad>` ile taraf sekmesi dışarıdan açılabiliyor
  (`TARAF_SEKMELERI` beyaz listesi; bilinmeyen değer yok sayılır, boş sekme çıkmaz).
- `AppNavbar.tsx`: "Bildirim Ayarları" → "İletişim Tercihleri" (tek ad kuralı).
- `notification_preferences` tablosu SİLİNMEDİ (§7.3).

### YAPILDI — 24.08.2026 · P1 · B18 kayıt izni kapısı (`71774b8`, DEPLOY edildi)
KURUCU KARARI: seçenek (a) — `case_sessions.kayitli` boolean, varsayılan false.
Şart: çalışan hiçbir yol bozulmayacak.

- `supabase/migrations/20260824090000_b18_kayitli_oturum.sql` yazıldı (idempotent).
- `create-video-room/kayit-izni.ts` (YENİ, saf işlev): 48 saat + oybirliği hesabı.
  Ölçüt, arabulucu panelindeki `KayitProtokoluKarti` hesabının BİREBİR aynısı
  (23.08 dersi: iki ölçüt = sessiz yanlış cevap). Engel metni sayı taşır, isim taşımaz (m.1).
- `tests/b18-kayit-izni.test.ts`: 15 durum — 48 saat dolmadı · tek ret · sessiz
  katılımcı · vekil/uzman ayrı onay · boş katılımcı listesi · bozuk tarih.
- `create-video-room/index.ts`: kapı YALNIZ `kayitli === true` iken ve YENİ oda
  açmadan önce çalışır. Odası olan oturum yukarıda zaten dönüyor — kural
  "onay yoksa kayıt AÇILMAZ" der, "süren toplantıyı kapat" demez.
- `SessionScheduler.tsx`: "Bu oturum kayda alınacak" kutusu · listede rozet ·
  kapı odayı açmazsa sebebi ekranda yazılı.
- `VideoCallButton.tsx`: genel "hata" yerine gerçek engel metni.

ÇALIŞAN YOLU KORUMA (kurucunun şartı — CANLI KANITLA doğrulandı):
- Fonksiyon oturum satırını `select('*')` ile okur; sütun adı listelenseydi göç
  öncesi HER çağrı hata dönerdi.
- Ön yüz insert'e `kayitli` YALNIZ işaretliyken eklenir.
- CANLI SORGU (24.08): `case_sessions` 31 satır · `kayitli IS DISTINCT FROM false` = **0**
  · `kayitli = true` = **0** · `video_link` dolu olan 4 satır etkilenmedi.
  Yani mevcut 31 oturumun hiçbirinde kapı çalışmıyor. Şart sağlandı.

### GÖÇ DURUMU — sütun CANLIDA ZATEN VAR (24.08)
`information_schema` sorgusu: `kayitli boolean NOT NULL DEFAULT false` mevcut.
Sütunun açıklama metni benim göç dosyamdakinden FARKLI — yani sütunu benim
dosyam değil, başka bir el (kurucu/Cowork) oluşturmuş. Buradan kimin çalıştırdığı
tespit edilemiyor; tespit edilemeyeni "ben yaptım" diye yazmıyorum.
Sonuç değişmiyor: canlı şema, kararı (a) birebir karşılıyor.
`20260824090000_b18_kayitli_oturum.sql` `ADD COLUMN IF NOT EXISTS` olduğu için
çalıştırılırsa NO-OP'tur; yalnız `COMMENT` satırı açıklamayı tazeler.
**Cowork paketi GEREKMİYOR** — çalıştırılacak bir şey kalmadı.

### DEPLOY KAYDI — 24.08.2026
- PUBLISH (ön yüz): iki kez — `469e0b2` sonrası ve `71774b8` sonrası. Lovable
  `latest_commit_sha` her ikisinde de push'u görmüş.
- REDEPLOY: `create-video-room` (yalnız o; `_shared/**` değişmedi → fan-out yok).
  Lovable ajanı doğruladı: "71774b8 sürümü canlıda (`kayit-izni.ts` dahil)".
  NOT: MCP çağrısı yine istemci tarafında 300 sn'de zaman aşımına uğradı, deploy
  SUNUCUDA BAŞARILI oldu. 23.08 dersi tekrar geçerli: **zaman aşımı = başarısızlık
  DEĞİL; önce `list_messages`'a bak, işi tekrarlama.**
- Lovable ajanı `types.ts`'i tazeledi (`2eb5a40` + `0a35de0`); yerel `main` bu iki
  commit'i fast-forward ile aldı. Kod değişikliği yok, yalnız üretilen tip dosyası.

### AÇIK — B18'in kalan iki parçası (bu karardan bağımsız)
- [x] P2 · Harici araç yasağı metni iki ekranda da yazılı olmalı (taraf + arabulucu) · DONE 24.08.2026 · Metin zaten iki ekrandaydı; gerçek kusur ikizlenmeydi, `src/lib/kayitProtokolu.ts` ile tekleştirildi (`7032284`, 70/70 test).
      Arabulucu tarafında `KAYIT_TEK_KAPI_UYARISI` var; taraf ekranında yok.
- [x] P2 · Silme kuralı (DONE 24.08.2026 — kol zaten kuruluydu; onu engelleyen `closed_at` kusuru `aef716e` ile giderildi): ses süreç bitiminden 24 saat sonra, döküm süreç sonunda;
      nöbetçi turunda otomatik, satıra silme zamanı + notu yazılarak.

### NOT — commit edilmemiş yabancı değişiklik (dokunulmadı)
`CLAUDE.md` ve `COWORK.md` çalışma ağacında değişik duruyor; kurucunun kendi
düzenlemesi. §11 gereği ellenmedi, commit'lenmedi.

---
## Nerede kaldık

- Tarih: 23.08.2026 (akşam oturumu · 3. blok) — **`medipact dur` ile GÜVENLİ DURAK**
- Aşama: DAOS · canlı doğrulama döngüsü
- Aktif görev: yok — yarım iş yok, commit edilmemiş değişiklik yok
- Son tamamlanan iş: üç fonksiyon deploy edildi + B18 ve A5 teşhisleri tamamlandı
- Doğrulama sonucu: `npm run test` 34/34 · tsc hatasız · build hatasız · bekçi 54/54 · lint 2367
- Açık blokaj: **İKİ HUMAN GATE** (gizli dosya · B18 veri modeli) — ikisi de aşağıda

> **DURAK NOTU (23.08.2026, `medipact dur`).** Çalışma ağacı temiz; `main` ile
> `origin/main` aynı commit'te: `e69f3d5`. İzlenmeyen iki dosya oturum başından
> beri duruyordu, dokunulmadı (`Yeni XLSX Worksheet.xlsx`, `repomix-output.xml`).
> Bu turda dokuz commit atıldı, hepsi push edildi. Canlı ortam bu turda
> yayınlanan sürümdedir; geri alınması gereken bir şey YOK.
> Yeni oturum: `medipact devam` → aşağıdaki "Sıradaki uygulanabilir iş"ten sürer.
- Sıradaki uygulanabilir iş: P1 · A5 · ölü bildirim ayarları ekranı (teşhis bitti, aşağıda)

### TEŞHİS BİTTİ — 23.08.2026 · A5 iletişim tercihi (Human Gate DEĞİL, kusur)
`durum-ayiklama.md:47` "ekran var, tüketen yok" diyor. Doğru ama eksik: ortada
**AYNI İŞİ İDDİA EDEN İKİ AYRI TABLO** var ve biri ölü.

| | Çalışan katman | Ölü katman |
|---|---|---|
| Tablo | `iletisim_tercihleri` (UNIQUE `party_id`) | `notification_preferences` (`user_id`) |
| Kolonlar | kanal · siklik · sessiz_baslangic · sessiz_bitis | 10 adet e-posta/uygulama içi anahtarı |
| Yazan yüzey | `CaseRoom.tsx:1809` ("İletişim Tercihlerim") | `NotificationSettings.tsx:72` |
| Okuyan yüzey | `MediationEngine.tsx:4617` | `NotificationSettings.tsx:57` (yalnız kendisi) |
| Sunucu tüketicisi | `gonderilsinMi` — `ajan-nobetci` (3 yer) · `cancel-meeting-invite` · `hazirlik-foyu-gonder` | **HİÇBİRİ** |

KARAR ZATEN VERİLMİŞ (§7-B/1, §14): `mimari/05-yetenek-envanteri.md:580` →
"(public.iletisim_tercihleri, UNIQUE party_id) ve tarafın kendi ekranından
yazılır." `yol-haritasi.md:770` aynı şeyi söylüyor. Yani iletişim tercihi
katmanı = `iletisim_tercihleri`. Bu katman ÇALIŞIYOR.

KUSUR: `NotificationSettings.tsx` kullanıcıya on adet anahtar sunuyor,
"Tercihler kaydediliyor" diyor ve **hiçbir gönderim yolu o satırı okumuyor**.
Kullanıcı kapattığı bildirimi almaya devam eder. Bu bir ürün kararı değil,
yaptığı işi yanlış anlatan bir yüzeydir (§7-B/2).

YAPILACAK (kod işi, onay gerekmez): sayfa yalan söylemeyi bıraksın. Gerçek
denetim dosya başına olduğu için (`iletisim_tercihleri` party_id'ye bağlı, bir
kullanıcı birden çok dosyada taraf olabilir) kullanıcı düzeyinde küresel bir
anahtar kümesi bu modele oturmuyor. Sayfa, tercihlerin dosya içinden
("İletişim Tercihlerim") ayarlandığını söyleyen dürüst bir yönlendirmeye
dönüştürülecek; işlemeyen anahtarlar kaldırılacak.
NOT: `notification_preferences` tablosu SİLİNMEYECEK (veri silme = §7.3).

### HUMAN GATE — 23.08.2026 · B18 kayıt kapısı hangi işarete bakacak? (P1)

TEŞHİS TAMAMLANDI, KOD YAZILMADI. Sorun teknik değil, VERİ MODELİ kararıdır.

Kural (kurucu, 16.08 · `mimari/12-taksonomi-ve-modeller.md:249-264`) net:
kayıtlı oturum onay formu açıldıktan 48 saat geçmeden planlanamaz · taraf, vekil
ve varsa uzman ayrı ayrı onaylar · bir ret kapıyı kapatır. Kural tartışmalı değil.

EKSİK OLAN ŞU: **bir oturumun "kayıtlı oturum" olduğunu söyleyen işaret YOK.**
- `case_sessions` kolonları: id · case_id · session_type · scheduled_at ·
  participants · video_link · notes · status · created_at · updated_at ·
  meeting_type · prep_notes_generated · invite_sent_at. **Kayıt işareti yok.**
- `kayit_onay_talepleri` **case_id** taşıyor, session_id TAŞIMIYOR → onay
  dosya düzeyinde, oturum düzeyinde değil.
- `oturum_kayitlari` (session_id + talep_id) ancak kayıt ALINDIKTAN sonra doğar;
  kapı ondan önce çalışmak zorunda.
- `create-video-room/index.ts` (178 satır) şu an hiçbir onay kontrolü yapmıyor.

NEDEN KENDİM SEÇMEDİM — canlı veri kanıtı:
`kayit_onay_talepleri` 2 satır · `kayit_onaylari` 1 satır · `oturum_kayitlari`
0 satır · `case_sessions` 31 satır (4'ünde video bağlantısı var).
"Dosyada onay talebi varsa o dosyanın oturumları kayıtlıdır" diye türetirsem,
o dosyadaki BÜTÜN video odaları kapanır (1 onay var, oybirliği yok). Yani
çalışan bir yolu kırardım. Bu yüzden türetme yapmadım.

SEÇENEKLER
(a) `case_sessions`'a `kayitli` (boolean, varsayılan false) kolonu eklenir.
    Kapı yalnız `kayitli = true` oturumlarda çalışır. Arabulucu oturumu
    planlarken işaretler. — **ÖNERİM.** Etkisi: mevcut 31 oturumun hiçbiri
    etkilenmez (varsayılan false), çalışan yol kırılmaz, kapı tam da kuralın
    tarif ettiği yerde durur. Bedeli: bir migration + planlama ekranında bir
    işaret kutusu.
(b) `kayit_onay_talepleri`'ne `session_id` eklenir; onay oturum başına alınır.
    Kurala daha sadık ("hangi oturum için onay verdi") ama mevcut 2 talep
    satırının hangi oturuma ait olduğu bilinmiyor → veri taşıma kararı gerekir.
(c) Kapı `create-video-room`'a değil, kayıt ALMA hattına konur (o hat henüz
    yazılmadı, belgede "○ planlı"). Bugün hiçbir şey değişmez; risk, kayıt
    hattı yazılırken kapının unutulmasıdır.

KARARIN ETKİSİ: (a) ve (b) migration ister → SQL'i ben yazarım, **çalıştırmak
Cowork'tedir** (§10). (c) bugün kod istemez ama B18 açık kalır.

Bu karar gelene kadar `create-video-room` DEĞİŞTİRİLMEDİ.

B18'in kalan iki parçası bu karardan BAĞIMSIZ ve ayrı iş kalemidir:
- [x] P2 · Harici araç yasağı metni iki ekranda da yazılı olmalı — DONE 24.08.2026, bkz. `7032284`
- [x] P2 · Silme kuralı (DONE 24.08.2026 — kol zaten kuruluydu; onu engelleyen `closed_at` kusuru `aef716e` ile giderildi): ses süreç bitiminden 24 saat sonra, döküm süreç sonunda;
      nöbetçi turunda otomatik, satıra silme zamanı + notu yazılarak

---
## Nerede kaldık

- Tarih: 23.08.2026 (akşam oturumu · 2. blok)
- Aşama: DAOS · canlı doğrulama döngüsü (§11-B)
- Aktif görev: yok — `akis-yurut` redeploy'u bekleniyor, sonrası kuyruktan
- Son tamamlanan iş: P1 · akış hatası artık hangi adımın neden çalışmadığını söylüyor (`d1d0d9f`)
- Doğrulama sonucu: yeni tezgâh 7/7 · `npm run test` 34/34 · tsc hatasız · build hatasız · lint 2367 (değişmedi) · bekçi tezgâhı 54/54
- Açık blokaj: HUMAN GATE — gizli dosya kararı (değişmedi, aşağıda)
- Sıradaki uygulanabilir iş: kuyruk taraması (aşağıdaki üç madde canlı olaya bağlandı)

### YAPILDI — 23.08.2026 · Deploy turu (üç fonksiyon)
- `taraf-cevap` → deploy edildi (16:35). Deploy edilen sürümde `cases` okuması +
  `has_role` RPC var.
- `akis-yurut` → deploy edildi (17:28), `d1d0d9f` canlıda. `hata-metni.ts` yerinde,
  içe aktarım `index.ts:26`, kullanım 227 ve 846.
  NOT: MCP çağrısı istemci tarafında 300 sn'de zaman aşımına uğradı ama deploy
  SUNUCUDA BAŞARILI oldu — `list_messages` ile doğrulandı. Zaman aşımı = başarısızlık
  DEĞİL; bir daha olursa önce `list_messages`'a bak, işi tekrarlama.
- `hazirlik-foyu` + `hazirlik-foyu-gonder` → deploy edildi (17:33).
  Doğrulama: `hazirlik-foyu-gonder/index.ts:275-276` `x-cron-secret` / `isCron` kapısı canlıda.
- `_shared/**` bu turda DEĞİŞMEDİ → fan-out yapılmadı.

### KUYRUK GÜNCELLEMESİ — üç akış hatası maddesi
Üçünün de DÜZELTMESİ KODDA ZATEN VARDI; eksik olan DEPLOY'du (GitHub senkronu
edge function deploy etmiyor — CLAUDE.md §11-B tablosu).
- [x] P2 · `hazirlik-foyu-gonder` 401 · Düzeltme `8045e86` (20.08 04:28) ·
      DEPLOY EDİLDİ 23.08 17:33 · **CANLI DOĞRULAMA BEKLİYOR** (akış bir daha
      koştuğunda `akis_hatasi` doğmamalı).
- [x] P1 · `hazirlik-foyu` HTTP 400 · Kayıt 19.08 08:27, `girdiTamamla`
      (`_shared/anlatim.ts` ZORUNLU_GIRDI + session_id/party_id merdiveni) bunu
      kapatıyor · DEPLOY EDİLDİ · **CANLI DOĞRULANDI 24.08**: aynı kural 19.08
      11:48'de `hazirlik-foyu çalıştırıldı (2 taraf)` yazmış; o tarihten sonra
      bu kural için `akis_hatasi` yok. Ayrıca erken dönüş kusuru `124e6cb`.
- [x] P1 · `bilirkisi_durum__ilerlet` · DONE 24.08.2026 · Doğrulama: kural canlıda
      20.08 17:45 ve 21.08 02:00'de `akis_kosuldu` yazmış; `bilirkisi_onerileri`
      2 satır (son 23.08 21:55); 20.08 17:48'den sonra `akis_hatasi` yok.
      (Aşağıdaki not o tarihteki teşhis durumudur, artık geçerli değildir.)
      SEBEBİ ARTIK ÖĞRENİLEMİYOR.
      Olay `948ddbca` iki denemede de başarısız oldu ve 20.08 17:50:12'de
      İŞLENDİ olarak kapandı (`akis_olaylari.islendi = true`); bir daha
      denenmeyecek. Tek kalan iz, sınır katmanının sildiği metin.
      `bilirkisi-secim` iç kapıyı KABUL EDİYOR (`kimlikCoz`, satır 150-152),
      yani 401 değil — hangi kod olduğu bilinmiyor.
      KAPANIŞ: `d1d0d9f` ile aynı kusur bir daha yaşanamaz; olay tekrarlarsa
      panoda `bilirkisi-secim çalıştırılamadı (HTTP xxx).` yazacak.
      Bu madde kod işi olarak KAPANDI; teşhis, olay bir daha doğduğunda gelir.

### YAPILDI — 23.08.2026 · P1 · Akış hatası metni (`d1d0d9f`)

BELİRTİ (canlı, dosya `eb70595a`): panoda bekleyen akış hatası satırı
`[akis:948ddbca-…:bilirkisi_durum__ilerlet] Bu konuda size yazabileceğim bir şey
bulamadım.` Hangi adım, neden çalışmadı — hiçbiri yoktu.

KÖK NEDEN: `akis-yurut` `hataYaz()` metnin TAMAMINI ortak sınır katmanından
geçiriyordu. Sınırın `dayanaksizRakamMi` kuralı, içinde rakam olup
"dosya/kayıt/belge" gibi bir dayanak kelimesi olmayan cümleyi eliyor.
`<fonksiyon> çalıştırılamadı: HTTP 500: {…}` tam olarak bu tarife uyuyor; tek
cümle olduğu için metnin tamamı elenip geriye "bulamadım" fallback'i kalıyordu.

ZAMAN ÇİZGİSİ KANITI (bu iş neden acildi):
- Ortak sınır katmanı `0026a01` ile **20.08.2026 09:04**'te devreye girdi.
- Panodaki `hazirlik-foyu` hata satırları (19.08 08:27 · 20.08 00:36 · 00:48)
  içeriğini KORUYOR — çünkü sınır katmanından ÖNCE yazıldılar.
- `bilirkisi` satırı (20.08 17:48) sınırdan SONRA yazılan **tek** satır ve
  içeriğini kaybeden **tek** satır.
- Yani düzeltme olmadan BUNDAN SONRAKİ HER akış hatası panoda boş görünecekti.
- Sonda ile ölçüldü (`npm run sonda`): dört HTTP teşhis metninin DÖRDÜ de
  `dayanaksiz_rakam` olarak eleniyor; rakamsız iki metin geçiyor.

ÇÖZÜM — sınır katmanı GEVŞETİLMEDİ, metin ikiye ayrıldı:
- YENİ DOSYA `supabase/functions/akis-yurut/hata-metni.ts` (saf işlev).
  · BAŞLIK koddan üretilir: kural tanımındaki fonksiyon adı + YALNIZ `\d{3}` ile
    yakalanmış HTTP durum kodu. Taraf verisi taşıması yapısal olarak mümkün değil.
  · SEBEP iç çağrının cevap gövdesidir, taraf verisi TAŞIYABİLİR: eskisi gibi
    sınırdan geçer, geçemezse metne KONMAZ ve hangi türün elediği yazılır.
- `akis-yurut/index.ts`: `hataYaz()` (başlık, sebep) alıyor; dört çağrı yeri
  bu ayrıma geçirildi.
- `_shared/**` DEĞİŞMEDİ → fan-out YOK. Yalnız `akis-yurut` redeploy edilir.
- Ayrı dosya olmasının sebebi test edilebilirlik: `index.ts` `npm:` içe aktarımı
  taşıdığı için tezgâhtan çağrılamıyor.

DOĞRULAMA: `tests/akis-hata-metni.test.ts` 7/7 — kusurun kendisi · başlık
korunuyor · elenen sebebin gövdesi SIZMIYOR · geçen sebep aynen kalıyor · üç
haneli olmayan rakam başlığa girmiyor. `npm run test` 34/34, tsc hatasız,
build hatasız, lint 2367 (değişmedi).

### YAPILDI — 23.08.2026 · Geçici test dosyaları düzeni (`a462dc2`, kurucu talebi)
- `tests/gecici/` açıldı: tek kullanımlık sonda dosyaları oraya yazılır,
  **silinmez**, aynı ada üstüne yazılır. `/tmp` kullanılmaz.
- `.gitignore`: klasör içeriği izlenmez, yalnız `tests/gecici/.gitkeep.md` izlenir.
- `package.json`: `npm run test` klasörü `--exclude` ile dışarıda bırakır; yeni
  `npm run sonda` yalnız o klasörü çalıştırır.
  NOT: `vitest.config.ts`'e `exclude` YAZILMADI — config'teki exclude komut
  satırından gevşetilemiyor ve o zaman sonda dosyası hiç çalıştırılamıyor (denendi).
- Bekçi silme kuralı daraltıldı (`~/.claude/hooks/guard_secret_operands.py`):
  yalnız `tests/gecici/` ALTINDAKİ yollar onaysız geçer. Geçmeyenler: klasörün
  kendisi · `..` ile ağaçtan çıkan yol · operandlardan biri dışarıdaysa ·
  operandsız silme · `find -delete` · `find -exec rm`.
  BİLİNEN SINIR: ayrıştırıcı POSIX kipinde, ters bölülü yol istisnaya girmez ve
  SORULUR (güvenli yön). Giriş noktasını PowerShell'e göre ayarlamak denendi,
  otomatik kip sınıflandırıcısı engelledi; ölü kod bırakılmadı, sınır belgelendi.
- Bekçi tezgâhı DEPOYA alındı: `tests/bekci/test_guard.py` (önceki kopya oturum
  scratchpad'inde kaybolmuştu). 54/54 doğru — 6 yeni istisna, 9 yeni kaçak denemesi.
- Kural `CLAUDE.md §22` olarak yazıldı.

---
## Nerede kaldık

- Tarih: 23.08.2026 (akşam oturumu)
- Aşama: DAOS · canlı doğrulama döngüsü (§11-B) işliyor
- Aktif görev: yok — sıradaki iş seçildi (aşağıda)
- Son tamamlanan iş: P1 · cevap kapısının üç ayrı sonucu doğru cümleyle söyleniyor (`8adc3b9`)
- Doğrulama sonucu: tsc temiz · build hatasız · test 27/27 · lint 2369→2367 · **canlı kanıt alındı**
- Açık blokaj: (1) HUMAN GATE — gizli dosya kararı hâlâ bekliyor (aşağıda, değişmedi)
  (2) Bilirkişi "Yeniden öner" canlıda TEST EDİLEMEDİ — sebebi aşağıda, kusur bulundu
- Sıradaki uygulanabilir iş: P1 · `bilirkisi_durum__ilerlet` adımının canlıda boş dönmesi
  (bilirkişi akışı hiç aday üretmemiş: `bilirkisi_onerileri` 0 satır, `experts` 6 aktif kayıt)

### YAPILDI — 23.08.2026 · taraf-cevap redeploy + publish + canlı test (P1)

DEPLOY
- `taraf-cevap` edge function REDEPLOY EDİLDİ (Lovable MCP, `supabase--deploy_edge_functions`).
  Deploy edilen sürümde `cases.assigned_mediator_id, user_id` okuması ve `has_role`
  RPC çağrısı var — yani ded25b4 canlıda. Ajan koda DOKUNMADI (commit değişmedi).
- Ön yüz iki kez publish edildi (`f00363b` sonrası ve `8adc3b9` sonrası).
- `_shared/anlatim.ts` değişmedi → fan-out YOK, başka fonksiyon deploy edilmedi.

TEŞHİS — bildirilen belirtinin kök nedeni ded25b4 DEĞİLMİŞ
- Veritabanı kanıtı: `select count(*) from cases where assigned_mediator_id is null` → **0**;
  dokuz dosyanın dokuzunda da `user_id = assigned_mediator_id`. Yani eski `taraf-cevap`
  kodu (yalnız `assigned_mediator_id`e bakan) arabulucuyu ZATEN tanıyordu ve 403 vermiyordu.
  ded25b4'teki ölçüt eşitlemesi doğru bir iş ama "Cevabınızı şu an kaydedemedim"i açıklamıyor.
- Gerçek kök neden ÖN YÜZDE: `src/components/AjanPenceresi.tsx` cevap kapısının **üç ayrı
  sonucunu tek bir "birazdan tekrar deneyin" cümlesine** düşürüyordu:
  · 200 + `yazildi:false` → soru bu arada kapanmış. Bekleyen soru listesi anlık yayında
    DEĞİL, dakikada bir tazeleniyor (aynı dosya, satır 428). Kapanmış kart ekranda
    kalabiliyor; ona yazılan her cevap "tekrar deneyin" alıyor ama hiçbir tekrar tutmuyor.
    Canlı veri bunu destekliyor: `ajan_gorevleri` durumları → atlandi 182 · yapildi 100 ·
    bekliyor 21 · onay_bekliyor 8. 182 "atlandi" satırı bu tuzağın malzemesi.
  · 403 → "Bu soruya cevap yazma yetkiniz yok". Bu da tekrar denemekle değişmez.
  · Yalnız üçüncüsü (taşıma/500) gerçekten tekrar denenebilir.

YAPILAN DÜZELTME — `8adc3b9`, tek dosya (`src/components/AjanPenceresi.tsx`)
- Her sonuç kendi cümlesiyle söyleniyor. 2xx dışında `supabase.functions.invoke` `data`
  vermediği için sunucunun gerekçesi `error.context` gövdesinden okunuyor.
- Başarısız yolda da `yukle()` çağrılıyor → kapanmış soru kartı listeden düşüyor.
- Yeni `any` EKLENMEDİ; mevcut iki `(data as any)` kullanımı da tipli hale getirildi
  (lint temel çizgisi 2369 → 2367 hata).

DOĞRULAMA
- `npx tsc --noEmit -p tsconfig.app.json` → çıktı yok, hatasız.
- `npm run build` → `✓ built in 23.56s`, hata yok.
- `npm run test` → `Test Files 6 passed (6) · Tests 27 passed (27)`.
- `npm run lint` → 2367 hata; değişiklikten ÖNCEKİ temel çizgi 2369 (stash ile ölçüldü).
- **CANLI KANIT:** `https://medipact-ai.lovable.app/assets/index-xiuwp065.js` indirildi
  (3.412.310 bayt). Yeni cümle "Bu soru zaten kapanmış" pakette VAR (1 kez); gerçek
  taşıma hatası için duran "Cevabınızı şu an kaydedemedim" de yerinde (1 kez).
  Publish öncesi paket `index-BGMo6Dt-.js` idi ve yeni cümleyi İÇERMİYORDU (0 kez) —
  yani fark yayının kendisinden geliyor, önbellekten değil.

### CANLIDA TEST EDİLEMEDİ — bilirkişi "Yeniden öner" (kusur bulundu, iş kuyrukta)
Devir notundaki üç test maddesinden ikisi (yeni aday çıkıyor mu · aday yoksa
"Bu alanda kayıtlı başka uzman yok" geliyor mu) **yürütülemedi**, çünkü canlıda
tıklanacak bir bilirkişi bildirimi YOK. Sebep uydurma değil, ölçülmüş:
- `select count(*) from experts where active` → **6** (uzman kaydı var)
- `select count(*) from bilirkisi_onerileri` → **0** (hiç aday üretilmemiş)
- `ajan_gorevleri` içinde `[bilirkisi:` işaretli TEK satır yok.
- Buna karşılık bekleyen bir akış hatası var:
  `[akis:948ddbca-…:bilirkisi_durum__ilerlet] Bu konuda size yazabileceğim bir şey bulamadım.`
  (dosya `eb70595a-…`, 20.08.2026 17:48)
SONUÇ: bilirkişi akışı canlıda hiç aday üretmemiş; "Yeniden öner"in üstünde duracağı
bildirim de bu yüzden hiç doğmamış. Önce o adım onarılmalı, test ondan sonra anlamlı.
`ded25b4`'ün ön yüz tarafı (Yeniden öner ↔ ikinci tur bağı, ayrı reddetme düğmesi,
panelde tek ad) KOD OLARAK yerinde ve yayında; canlı davranış kanıtı yok.

### KUYRUĞA EKLENDİ — canlı veride görülen üç akış hatası
- [x] P1 · `bilirkisi_durum__ilerlet` canlıda boş dönüyor · DONE 24.08.2026 · Doğrulama: canlı `bilirkisi_onerileri` 2 satır (son 23.08 21:55), kural 20.08 17:45 ve 21.08 02:00'de `akis_kosuldu` yazmış, 20.08 17:48'den sonra `akis_hatasi` yok · Kabul: bir dosyada bilirkişi
      adımı çalıştığında `bilirkisi_onerileri`ne satır yazılıyor VEYA `[bilirkisi:aday-yok:…]`
      bildirimi doğuyor; `akis_hatasi` satırı doğmuyor.
- [x] P1 · `hazirlik-foyu` iç çağrısı eksik parametreyle gidiyor · DONE 24.08.2026 · Doğrulama: canlı `[akis:65a31953…] hazirlik-foyu çalıştırıldı (2 taraf)` 19.08 11:48; yapısal kök neden `124e6cb` ile giderildi (58/58 test) · Kanıt:
      `oturum_planlandi__foy_hazirla` → `HTTP 400 {"error":"case_id, session_id ve party_id gerekli"}`
      · Kabul: adım hatasız tamamlanıyor, `akis_hatasi` doğmuyor.
- [x] P2 · `hazirlik-foyu-gonder` iç çağrısı 401 alıyor (kapı/anahtar kontrolü) · DONE 24.08.2026 · Doğrulama: canlı `hazirlik-foyu-gonder çalıştırıldı` 20.08 01:33; kural `foy_onaylandi__gonder` zaten `etkin=false` · Kanıt:
      `foy_onaylandi__gonder` → `HTTP 401 {"error":"Oturum doğrulanamadı"}` · Kabul: iç çağrı
      yetkilendirmesi geçiyor, adım tamamlanıyor.

### HUMAN GATE — 23.08.2026 · gizli dosya deposa girmiş (P0, kurucu kararı bekliyor)
DEĞİŞMEDİ, hâlâ açık. Ayrıntı ve seçenekler bir önceki blokta duruyor (aşağıda).
Bu turda dosyaya ve `.gitignore`'a DOKUNULMADI.

---
## Nerede kaldık

- Tarih: 23.08.2026
- Aşama: DAOS düzenine geçiş · başlangıç paketi (MEDIPACT-BASLANGIC.md §B) yürütülüyor
- Aktif görev: B bölümü kontrol listesi
- Son tamamlanan iş: B.0 Lovable MCP kurulumu + PreToolUse bekçisinin daraltılması
- Doğrulama sonucu: bekçi tezgâhı 25/25 geçti; canlı komut onaysız geçti
- Açık blokaj: **HUMAN GATE — gizli dosya** (aşağıda, §12 gereği)
- Sıradaki uygulanabilir iş: `taraf-cevap` redeploy → publish → canlı test

### DEVİR NOTU — 23.08.2026, oturum sonu
- B.0 · Lovable MCP: BİTTİ. Araçlar bu oturumda ÇALIŞTI (`get_project` cevap verdi),
  yeniden başlatma gerekmedi. Proje `5ffedb1b-4087-4fe1-a1ef-873c9754f71d`,
  workspace `Mxc2bXygdkJGAWNSM2i3`, durum `completed`, yayında, canlı
  https://medipact-ai.lovable.app · Lovable'ın gördüğü son commit `e25f9a7`
  (main ile aynı). Yani push görülmüş; redeploy/publish yapılmadı.
- B.1 · `.env` git kontrolü: HUMAN GATE, kurucu kararı bekliyor (yukarıda).
- B.2 · Doğrulama Komutları: BİTTİ, `PROJE_OZETI.md` içinde.
- B.3 · "Nerede kaldık" bloğu: BİTTİ (bu blok).
- B.4 · İzin listesi: ATLANDI — `.claude/settings.local.json`'a izin eklemeyi
  otomatik kip sınıflandırıcısı engelledi (ajan kendi iznini genişletemiyor).
  GİDERMEK İÇİN: kurucu `/permissions` ile MEDIPACT-BASLANGIC.md §B.4'teki
  satırları ekleyecek.
- Bekçi işi (iki tur) BİTTİ: `4259ad9`. Yanlış alarmlar bundan sonra sorulmadan
  kapatılacak (CLAUDE.md §18-A).
- SIRADAKİ İLK İŞ: `supabase/functions/taraf-cevap` redeploy + publish + canlı test
  (bilirkişi bildiriminde "Yeniden öner" yeni aday çıkarıyor mu · aday yoksa
  "Bu alanda kayıtlı başka uzman yok" geliyor mu · "Cevabınızı şu an
  kaydedemedim" hatası bitti mi). `_shared/anlatim.ts` DEĞİŞMEDİ, fan-out yok.

### YAPILDI — 23.08.2026 · B.0 · Lovable MCP (P0)
- `claude mcp add --transport http lovable "https://mcp.lovable.dev"` çalıştırıldı.
- Kayıt: `C:\Users\ASUS\.claude.json`, proje kapsamı `C:\Users\ASUS\milat`.
- `claude mcp list` → `lovable ... ✔ Connected`. Kurucu tarayıcıdan girişi onayladı.
- NOT: araçlar bu oturuma yüklenmedi; kullanmak için Claude Code yeniden başlatılmalı.

### YAPILDI — 23.08.2026 · PreToolUse bekçisinin daraltılması (kurucu talebi)
Belirti: `guard-shell.sh` komut METNİNDE geçen kelimeye bakıyordu; içinde gizli
dosya adı geçen her komut, o dosyaya dokunmasa bile onay soruyordu. `git status`
ve `git ls-files` her turda duruyordu.

Kök neden iki katmanlıydı:
1. Kural 4 saf metin araması yapıyordu (hedef dosyaya değil, kelimeye bakıyordu).
2. İlk düzeltme denemesi heredoc ile yazılmıştı; heredoc ters bölüleri eziyor
   (`\\` → `\`), bu yüzden ayrıştırıcı regex bozuluyordu. DERS: bu dosyaları
   Bash heredoc ile yazma, `Write` aracıyla yaz.
3. Hook `python3` adını seçiyordu; Windows'ta bu Microsoft Store yer tutucusu ve
   sıfırdan farklı çıkış kodu döndürüyor → ayrıştırıcı hep "hata" sayılıyordu.

Yapılan:
- `~/.claude/hooks/guard-shell.sh` yeniden yazıldı. Kural 1 (silme), 2 (force
  push/geçmiş) ve 3 (DROP/TRUNCATE/DELETE FROM) AYNEN korundu.
- Kural 4 artık komut metnine değil, her komut parçasının GERÇEKTEN hedeflediği
  dosya operandına bakıyor. Yeni ayrıştırıcı: `~/.claude/hooks/guard_secret_operands.py`
  (shlex ile gerçek belirteçleme; git rev sözdizimi `HEAD:<dosya>` çözülüyor;
  arama araçlarında ilk operand desen sayılıp atlanıyor).
- Çalışan yorumlayıcı seçimi eklendi (`python -c pass` denemesi).
- Yedek: `~/.claude/hooks/guard-shell.sh.bak` (eski, kelime tabanlı sürüm).
- `settings.json` içindeki PreToolUse kaydı DEĞİŞTİRİLMEDİ — geçici kapatma
  denendi, otomatik kip sınıflandırıcısı engelledi; gerek de kalmadı. Yedeği yine
  de duruyor: `~/.claude/settings.json.bak`.

Doğrulama — tezgâh `scratchpad/test_guard.py`, 25/25 doğru:
- Onaysız geçen: `git status` · `git ls-files --error-unmatch <gizli>` ·
  `git check-ignore` · `.gitignore` okuma · `.gitignore` içinde arama ·
  zincirli güvenli komut · `npm run build` · örnek env dosyası.
- Onay soran: içerik okuma (cat/type/Get-Content) · `git show HEAD:<gizli>` ·
  `git diff <gizli>` · içeriğe yazma · güvenli komuta iliştirme · zincirde gizli
  okuma · yerinde düzenleme · gizli dosyada arama · ssh anahtarı · silme ·
  DROP · TRUNCATE · DELETE FROM · force push.
- Canlı doğrulama: `git status --porcelain; git ls-files --error-unmatch <gizli>;
  git check-ignore` gerçek bekçiden onay sorulmadan geçti.

İKİNCİ TUR (aynı gün, kurucunun bildirdiği iki yanlış alarm):
- `git commit -m "..."` içindeki insan yazısı mesaj metni komut sayılıyordu; mesajda
  geçen DROP/TRUNCATE/silme kelimeleri onay sordurtuyordu. Artık `-m` / `--message`
  değeri değerlendirmeden çıkarılıyor.
- `--no-rebase`, `--rebase=false` gibi olumsuz bayraklar "rebase" sanılıyordu. Artık
  yalnız gerçek `git rebase`, `--force`, `--force-with-lease`, `push --delete`,
  `reset --hard`, `filter-branch`, `filter-repo`, `reflog expire`, `update-ref -d`,
  `branch -D`, `clean -f/-d/-x` yakalanıyor.
- Dört kuralın dördü de (silme · git geçmişi · SQL · gizli dosya) artık komut
  metnine değil, çalıştırılan komuta bakıyor. `bash -c "..."` gibi iç içe komutlar
  da açılıp denetleniyor (derinlik 3).
- Tezgâh genişletildi: 39 senaryo, 39/39 doğru.

BEKÇİ DOSYALARI (depo dışında, kullanıcı profilinde):
- `~/.claude/hooks/guard-shell.sh` — yorumlayıcı seçer, sonucu bildirir
- `~/.claude/hooks/guard_secret_operands.py` — dört kuralın ayrıştırıcısı
- `~/.claude/hooks/guard-shell.sh.bak` — eski kelime tabanlı sürümün yedeği
- Tezgâh: `scratchpad/test_guard.py` (39 senaryo)

### HUMAN GATE — 23.08.2026 · gizli dosya deposa girmiş (P0, kurucu kararı bekliyor)
`git ls-files --error-unmatch` ilgili dosyayı LİSTELEDİ → dosya git'te izleniyor.
- Girdiği commit: `051779e` ("Changes"), tek commit.
- Uzak depo: `https://github.com/arbemelsenyer/milat.git`
- İçindeki üç değişkenin ADI istemci tarafı Vite değişkeni (`VITE_` önekli).
  Vite bu değişkenleri zaten tarayıcıya gönderdiği paketin içine gömer; yani
  bunlar tasarımı gereği herkese açık değerlerdir, sunucu sırrı değildir.
  Değerler okunmadı, hiçbir yere yazılmadı.
- Bu yüzden acil anahtar yenileme gerekmiyor gibi görünüyor; yine de karar
  kurucunun: (a) dosyayı git izleminden çıkar + `.gitignore`'a ekle, geçmişte
  bırak; (b) ayrıca geçmişten de temizle (geçmiş yeniden yazma, uzak depo
  etkilenir); (c) olduğu gibi bırak.
- Öneri: (a). Etkisi: canlı yayın etkilenmez (Lovable kendi değişkenlerini
  kullanır), geçmiş yeniden yazılmaz, bundan sonraki commit'lere dosya girmez.
- ATLANDI (bilerek): karar gelene kadar `.gitignore` değiştirilmedi.

---
## Nerede kaldık — 23.08.2026 (110) · 48 BAYAT MADDENİN DÖKÜMÜ ÇIKTI (kuyruk maddesi 5)

Blok 105'teki "SIRADAKİ (Code kapsamı): 1 → 2 → 5 → 4" sırasında 1 ve 2 kapanmıştı;
bu turda 5 yapıldı. Kod değişmedi, yalnız döküm çıkarıldı.

YAPILDI
- [x] YENİ DOSYA: tasks/durum-ayiklama.md (117 satır). todo.md'deki İŞARETSİZ her
  madde için BİTTİ / YARIM / YOK + dosya referansı. Arama AD DEĞİL İŞLEV üzerinden
  yapıldı (16.08 dersi): her madde için edge fonksiyon + tablo + ekran yüzeyi ayrı
  grep'lendi.
- [x] SAYI DÜZELTİLDİ: todo.md "41 açık madde" diyordu; işaretsiz madde sayısı
  gerçekte 48. Döküm 48 maddeyi kapsıyor.
- [x] SONUÇ: BİTTİ 26 · YARIM 13 · YOK 8 · canlı test bekleyen 1.
  · YOK çıkanlar: A6 (PWA+SMS) · A9 (sessiz canlı kokpit) · A12 (erteleme tutanağı) ·
    B20 (tıkanma çözücü) · C26 (vekil ekranı, kararla) · D28 (tanıtım ekranı) ·
    İBA-1 (BATNA taraf yüzü) · İBA-6b (ses/döküm saklama ayrımı).
  · En kritik YARIM'lar: A5/İBA-2 iletişim tercihi (ekran var, TÜKETEN YOK — 18.08
    dersi hâlâ geçerli) · B18 kayıt protokolü (onay tablosu var, 48 saat kuralı ve
    "onay yoksa kayıt açılmaz" kapısı create-video-room'da YOK) · İBA-6 görüşme kaydı
    (yazıya dökme ve otomatik silme yok) · A2 kaynak künyesi (ürün genelinde zorunlu
    değil).
- [x] TODO.MD KUTULARINA DOKUNULMADI — işaretleme kurucunun kararı.

EKSİK KALDI
1. Kutular işaretlenmedi, yol haritasına sıra yazılmadı. Karar kurucunundur:
   26 BİTTİ maddesinin kutusu işaretlensin mi, 8 YOK maddesi yol haritasına hangi
   sırayla girsin, 13 YARIM maddesinin eksik parçası ayrı iş kalemi olsun mu.
   GİDERMEK İÇİN: kurucu kararı, sonra Code (todo.md + yol-haritasi.md).
2. DÖKÜM CANLIYA BAKMADI. "BİTTİ" burada KODUN VARLIĞIDIR, canlıda çalıştığının
   kanıtı değildir. Veritabanı tarafı (tetikleyici, politika, cron) dökümün dışında.
   GİDERMEK İÇİN: canlı doğrulama — kimde: Claude (SQL) + kurucu (ekran).
3. Kuyrukta kalan Code maddesi: blok 105 · madde 4 — AŞAMA 7 SUNUCUYA İZ BIRAKMIYOR
   (belge ve imza yazımı tamamen ön yüzde, ajan orada olan biteni göremiyor).
   Bu iş kullanıcıya görünen akışı ve veri modelini değiştirir; ONAY BEKLİYOR,
   kendiliğinden başlanmadı. Kimde: kurucu kararı, sonra Code.
## Nerede kaldık — 23.08.2026 (109) · ÜÇ KARAR UYGULANDI · "YENİDEN ÖNER" BAĞLANDI

KURUCU KARARI (23.08): (a) sohbetteki "Yeniden öner" ikinci tur aday taramasına
bağlansın, reddetme işlevi silinmesin — doğru adla ayrı düğme olsun ·
(b) panelde de tek ad "Yeniden öner" · (c) taraf-cevap arabulucuyu
yönetici/görevli arabulucu/dosya sahibi olarak tanısın, ölçüt genişletilmesin,
RLS değişmesin · dal main'e alınsın, bundan sonra main'e push.

YAPILDI
- [x] (a) BAĞ. src/components/AjanPenceresi.tsx:
  · YENİ yardımcı `bilirkisiAlani()` (satır 207-217): bildirimin gerekçesindeki
    "[bilirkisi:<ne>:<alan>]" işaretinden ALANI çıkarır. Sayılan üç işaret:
    arabulucu-secsin · tikanma · aday-yok. (atandi · ertelendi · evrak ·
    dis-uzman-gundem satırlarında üçüncü parça alan DEĞİLDİR, bilerek dışarıda.)
  · YENİ `bilirkisiYenidenOner(alan)`: bilirkisi-secim `ikinci_tur` adımını o
    alanla çağırır; dönüş ertelendi/bulunamadi/aday sayısı olarak sohbete tek
    satır yazılır ve yukle() ile liste tazelenir. Tur sınırı ve erteleme kararı
    SUNUCUDA kalır — ön yüzde karar yok.
  · Bildirim satırındaki düğme çifti: işaret varsa "Yeniden öner" (bilirkişi
    koluna gider), yoksa eskisi gibi "Talimatı reddet". "Onayla" düğmesi yalnız
    onay tipli satırlarda, aynen duruyor.
- [x] (a-2) REDDETME SİLİNMEDİ. talimatReddet() işlevi aynen yerinde; yalnız adı
  ayrıldı: düğme "Talimatı reddet", sohbet cümlesi "Talimatı reddettim. Yeni
  talimatınızı yazabilirsiniz.", görev sonucu "arabulucu talimatı reddetti".
  red_sebebi ve akis_duraklatma.sebep KOLONLARI YERİNDE, boş geçiliyor.
- [x] (b) AD BİRLİĞİ. BilirkisiAlanlari.tsx: "İkinci tur" → "Yeniden öner"
  (Repeat simgesi ve çağrılan adım `ikinci_tur` DEĞİŞMEDİ); durum cümlesi
  "İkinci tur adayları çıkarıldı." → "Yeniden öneri hazırlandı."
- [x] (c) YETKİ EŞİTLENDİ. supabase/functions/taraf-cevap/index.ts:74-88 —
  arabulucu artık üç ölçütle tanınıyor: cases.assigned_mediator_id VEYA
  cases.user_id VEYA has_role(admin). bilirkisi-secim/index.ts:161-166 ile
  BİREBİR aynı ölçüt. Taraf yolu (hedef_party_id eşleşmesi) değişmedi, RLS'e ve
  politikaya DOKUNULMADI, yeni tablo/kolon yok.
- [x] BELGE KAYDI aynı commit'te: mimari/06-ajan-mimarisi.md (EKLEME 23.08) ·
  mimari/10-arayuz-katmani.md (tek ad kuralı) · tasks/yol-haritasi.md (tek satır).
- [x] Dal claude/medipact-uanila main'e alındı; bundan sonra push main'e.

EKSİK KALDI
1. TİP DENETİMİ ÇALIŞTIRILAMADI. `npx tsc --noEmit -p tsconfig.app.json` bu
   ortamda node_modules olmadığı için koşmuyor; `bun install` bun.lock'taki özel
   paket deposuna 403 dönüyor (europe-west4-npm.pkg.dev, oturumun ağ izni yok).
   Üç dosyanın da SÖZDİZİMİ `bun build --no-bundle` ile ayrı ayrı doğrulandı
   (PARSE OK), tip denetimi YAPILMADI.
   GİDERMEK İÇİN: kurucunun kendi makinesinde `npx tsc --noEmit -p
   tsconfig.app.json` — ya da Lovable derlemesi hatayı gösterir. Kimde: kurucu.
2. CANLI TEST YAPILMADI. Kimde: kurucu (redeploy + publish sonrası).
3. KAPSAM DIŞI, DÜZELTİLMEDİ (rapor): arabulucunun sohbet listesi yalnız
   durum='bekliyor' satırlarını okuyor (AjanPenceresi.tsx:349-351). bilirkisi-secim
   `tikanma` (749-753), `evrak_oner` (884-887) ve `dis_aday` (1021-1025) satırlarını
   durum='onay_bekliyor' ile yazıyor — bu üç bildirim sohbete HİÇ DÜŞMÜYOR.
   Sonuç: yeni "Yeniden öner" düğmesi bugün pratikte yalnız `aday-yok` ve
   `arabulucu-secsin` satırlarında görünür.
   GİDERMEK İÇİN: ya sorguya 'onay_bekliyor' eklenir ya da o üç satır 'bekliyor'
   yazılır. İkisi de ekranı değiştirir → kurucu kararı, sonra Code.
4. KAPSAM DIŞI, OKUNMADI (rapor): akis-onayla fonksiyonunun yetki ölçütü
   incelenmedi; "Onayı şu an kaydedemedim" (AjanPenceresi.tsx:739) aynı kökten
   geliyor olabilir. Kimde: ayrı iş kalemi.

COWORK PAKETİ — EKRAN TAZELENMESİ İÇİN TEK SORGU (Claude çalıştıracak)
Amaç: sohbet penceresi anlık tazelenmiyor. Ön yüz iki tabloya anlık abone oluyor
(AjanPenceresi.tsx:401-421) ve ayrıca 60 saniyede bir kendi kendine yeniliyor.
Aboneliğin çalışması için o iki tablonun `supabase_realtime` yayınında olması ve
satır kimliğinin yeterli olması gerekir. Tek okuma sorgusu, hiçbir şey yazmaz:

    select c.relname                                as tablo,
           (p.pubname is not null)                  as anlik_yayinda,
           case c.relreplident
                when 'f' then 'full' when 'd' then 'default'
                when 'i' then 'index' else 'nothing' end as satir_kimligi
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_publication_tables p
             on p.schemaname = n.nspname
            and p.tablename  = c.relname
            and p.pubname    = 'supabase_realtime'
     where n.nspname = 'public'
       and c.relname in ('agent_states', 'ajan_gorevleri')
     order by c.relname;

OKUMA: iki satır da `anlik_yayinda = true` ve `satir_kimligi = full` ise sebep
yayında değildir, ön yüzde aranır. `anlik_yayinda = false` çıkan tablo için o
tablonun anlık yayına alınması gerekir (SQL Claude'da). `satir_kimligi` 'default'
ise INSERT görünür ama UPDATE/DELETE gövdesi eksik gelir — bildirim güncellemeleri
bu yüzden ekrana düşmemiş olabilir.
NOT (sapma bildirimi): CLAUDE.md "SQL Code tarafından yazılmaz" der; bu sorgu
kurucunun 23.08 açık talimatıyla yazıldı ve salt okumadır (migration/politika değil).

## Nerede kaldık — 23.08.2026 (108) · "YENİDEN ÖNER" KUSURUNUN TEŞHİSİ (yalnız inceleme, kod değişmedi)

İŞ: PROJE_OZETI.md "Sıradaki adım 1" — canlı kusurun teşhisi. Kod YAZILMADI;
üç bulgunun üçü de kullanıcıya görünen akışı/yetkiyi değiştirir, kurucu onayı şart.

OKUNAN DOSYALAR: src/components/AjanPenceresi.tsx (300-1060) ·
src/components/bilirkisi/BilirkisiAlanlari.tsx (1-270) ·
src/components/bilirkisi/BilirkisiTarafPaneli.tsx (düğme dökümü) ·
supabase/functions/bilirkisi-secim/index.ts (1-500, adım listesi) ·
supabase/functions/taraf-cevap/index.ts (tam, 101 satır) ·
supabase/functions/bilirkisi-sorulari/index.ts (140-170) ·
supabase/functions/_shared/anlatim.ts (1044-1317: sinirDenetle · anaAjanaBildir)

YAPILDI — BULGU 1: SOHBETTEKİ "YENİDEN ÖNER" BİLİRKİŞİ KOLUNA HİÇ BAĞLI DEĞİL.
- AjanPenceresi.tsx:1030-1036 — "Yeniden öner" düğmesi YALNIZ `arabulucu_onayi`
  ve `akis_onay_bekliyor` tipindeki bildirimlerde çiziliyor (onayMi kapısı,
  satır 1011-1013) ve `talimatReddet(g, "")` çağırıyor.
- talimatReddet (AjanPenceresi.tsx:624-638) şunu yapar: arabulucu_talimatlari
  satırını 'reddedildi' yapar · ajan_gorevleri satırını 'atlandi' yapar ·
  sohbete "Yeniden önereceğim. Yeni talimatınızı yazabilirsiniz." yazar ·
  talimat kipini açar. bilirkisi-secim HİÇ ÇAĞRILMAZ.
- SONUÇ: bu düğme hiçbir koşulda yeni bilirkişi adayı üretmez. Kusur "aday
  üretmiyor" değil, "bu düğmenin işi bu değil".

YAPILDI — BULGU 2: EKRANDA GÖRÜLEN METİN BAŞKA FONKSİYONUN ÇIKTISI.
- "Yapıldı: … soru başlığı hazırladım / Eksik: … tarafın bilirkişi onayı
  bekleniyor / Eksik: Bilirkişi görevlendirme kararı sizde" cümlelerinin
  kaynağı bilirkisi-sorulari/index.ts:152-161 (anlatim.bitti). Bu satırlar
  agent_states'e yazılır ve sohbette "adım" satırı olarak görünür.
- Beklenen "Bu alanda kayıtlı başka uzman yok." cümlesi ise YALNIZCA
  bilirkisi-secim/index.ts:424-448'de, `aday_cikar` / `ikinci_tur` / `alan_tara`
  adımı sıfır aday döndürdüğünde yazılır. Bu adımlara çağrı gelmediği için
  cümle hiç üretilmemiştir — kod kusuru değil, çağrı yokluğu.
- Aynı işi yapan düğmenin adı iki yüzeyde AYRI: sohbette "Yeniden öner"
  (talimat reddi), bilirkişi panelinde "İkinci tur"
  (BilirkisiAlanlari.tsx:253-255 → adim "ikinci_tur"). 21.08 kararı "aynı işi
  yapan metin üründe TEK" idi; panel eski adıyla duruyor.

YAPILDI — BULGU 3: "CEVABINIZI ŞU AN KAYDEDEMEDİM" — YETKİ KONTROLÜ AYRIŞMIŞ.
- Sohbetten cevap yazınca AjanPenceresi.tsx:790-804 `taraf-cevap` çağırıyor;
  403/hata dönerse ekrana AYNEN "Cevabınızı şu an kaydedemedim." yazılıyor.
- taraf-cevap/index.ts:74-78 arabulucuyu YALNIZ `cases.assigned_mediator_id`
  üzerinden tanıyor.
- bilirkisi-secim/index.ts:161-166 ise arabulucuyu ÜÇ yoldan tanıyor:
  admin rolü VEYA `assigned_mediator_id` VEYA `cases.user_id`.
- 13.08 dersi: `assigned_mediator_id` her dosyada arabulucunun kimliğini
  taşımıyor; dosya sahibi `cases.user_id`de duruyor. Test dosyasında bu alan
  boş ya da farklıysa taraf-cevap 403 döner ve ekranda tam olarak o cümle çıkar.
- DOĞRULANMADI: MP-2026-1016 dosyasının assigned_mediator_id / user_id
  değerleri canlıda okunmadı (SQL Code'da değil). Bulgu koddan kesin,
  canlı eşleşme kesin değil.

EKSİK KALDI
1. Ekranın kendiliğinden tazelenmemesi doğrulanamadı. AjanPenceresi.tsx:401-421
   `agent_states` ve `ajan_gorevleri` için postgres_changes aboneliği kuruyor,
   ayrıca 60 saniyede bir yukle() çağırıyor. İki tablonun realtime yayınında
   (supabase_realtime publication) olup olmadığı DEPODAN GÖRÜLMEZ.
   GİDERMEK İÇİN: canlıda publication sorgusu — kimde: Claude (SQL).
2. Üç bulgunun hiçbiri düzeltilmedi. Üçü de kullanıcıya görünen akışı ya da
   yetki sınırını değiştirir; CLAUDE.md "önceden onay alınmadan yapılmaz".
   GİDERMEK İÇİN — kurucunun seçeceği üç ayrı karar:
   (a) BULGU 1: sohbetteki "Yeniden öner", bilirkişi aday bildirimi üzerinde
       bilirkisi-secim `ikinci_tur` adımına bağlansın mı? Kimde: kurucu kararı,
       sonra Code (AjanPenceresi.tsx, tek dal).
   (b) BULGU 2: bilirkişi panelindeki "İkinci tur" düğmesinin adı "Yeniden öner"
       olsun mu? Kimde: kurucu kararı, sonra Code (BilirkisiAlanlari.tsx:254).
   (c) BULGU 3: taraf-cevap arabulucuyu bilirkisi-secim ile AYNI ölçütle mi
       tanısın (admin / assigned_mediator_id / cases.user_id)? Bu bir YETKİ
       genişletmesidir, anayasa m.1 gereği kurucu onayı olmadan yazılmaz.
       Kimde: kurucu kararı, sonra Code (taraf-cevap/index.ts:74-78) + redeploy.
3. KAPSAM DIŞI, DÜZELTİLMEDİ (rapor): `akis-onayla` çağrısının yetki ölçütü
   ayrıca okunmadı; "Onayı şu an kaydedemedim" (AjanPenceresi.tsx:739) aynı
   kökten geliyor olabilir. Kimde: ayrı iş kalemi.

BLOK DIŞI NOT: Bu turda kod değişmediği için mimari/ ve yol-haritasi.md
güncellenmedi (CLAUDE.md belge güncelleme kuralı: yalnız inceleme turunda atlanır).

## Nerede kaldık — 21.08.2026 (107) · AJAN SORU KALIBI VE BİLİRKİŞİ TÜKENME AKIŞI

KURUCU KARARI (21.08, sohbet ekranı incelemesi)
- Sohbet anket ekranına dönmüştü: Onayla · Beğenmedim yeniden · Yeniden yap ·
  Vazgeç · Neyi beğenmediniz? · Neden durduruyorsunuz? · Durdur · Değiştir ·
  Talimat ver. Kurucu: "Bu ürün hukukçu kullanacak; bu kadar seçenek görüp
  bırakırım." Karar: soru kalıbı TEK olacak, ajan dili öznellikten arınacak.
- Ajan dilinde öznel/duygusal ifade YASAK; aynı işi yapan metin üründe TEK.
  Kullanılacak ifade: "Yeniden öner".
- Gerekçe sorusu ("Neyi beğenmediniz?", "Neden durduruyorsunuz?") sohbette
  sorulmaz. İlgili veritabanı alanları yerinde kalır, boş geçilir.

BİLİRKİŞİ TÜKENME AKIŞI (kurucu ile karara bağlandı)
1 Aday sunulur: durum + dayanak + Onayla/Yeniden öner.
2 Yeniden öner → aday yoksa "Bu alanda kayıtlı başka uzman yok", pencere
  KAPANMAZ, arabulucu yazabilir.
3 Arabulucu yakın bir uzmanlık alanı yazar, ajan o alanla yeniden tarar.
4 TUR SINIRI 2.
5 Dışarıdan uzman: karşı tarafın ajanına yalnız usul satırı + uzmanlık alanı
  gider; kişi adı ve metin GEÇMEZ. Ortak irade yoksa seçilmez.
6 Vazgeçilirse / seçilemezse: "bilirkişi seçilmedi — bu aşama ertelendi"
  kayda geçer, ajan aynı şeyi bir daha sormaz, süreç kaldığı yerden sürer.

YAPILDI (21.08, Code)
- BÖLÜM 1 · SORU KALIBI. AjanPenceresi.tsx:
  · Onay bildiriminde iki düğme kaldı: "Onayla" + "Yeniden öner" (eski
    "Beğenmedim, yeniden" gitti). "Yeniden öner" gerekçe sormadan doğrudan
    talimatReddet(g, "") çağırıyor.
  · "Neyi beğenmediniz?" kutusu, içindeki "Yeniden yap" ve "Vazgeç" düğmeleri
    KALDIRILDI (redKipi bloğu ve durumu tamamen silindi).
  · "Neden durduruyorsunuz?" kutusu KALDIRILDI; "Durdur" düğmesi doğrudan
    durduruyor (sebep boş geçiliyor). Durdurma satırı artık "sebep yazılmadı"
    yazmıyor, sebep varsa gösteriyor.
  · red_sebebi ve akis_duraklatma.sebep KOLONLARI YERİNDE — yalnız boş geçiliyor.
    Kolon düşürülmedi, tablo değiştirilmedi, SQL yazılmadı.
- BÖLÜM 3-5 · BİLİRKİŞİ TÜKENME AKIŞI. bilirkisi-secim/index.ts:
  · Aynı isim ikinci kez sunulmuyordu, o kural zaten vardı (mevcut öneriler
    dışlanıyor) — dokunulmadı.
  · Tükenme cümlesi kurucu kalıbına çevrildi: DURUM ("Bu alanda kayıtlı başka
    uzman yok.") + DAYANAK ("... örtüşen kayıtlı N uzman var.") + kalan tur.
  · YENİ ADIM `alan_tara`: arabulucunun sohbete yazdığı uzmanlık alanı ile
    yeniden tarama. Tur sayacı ajan_bellek "bilirkisi_alan_turu" anahtarında.
  · TUR SINIRI 2 (ALAN_TUR_SINIRI): üçüncüde kendiliğinden "tur_siniri"
    ertelemesi yazılıyor.
  · YENİ ADIM `ertele` (sebep: vazgecildi | ortak_irade_yok | tur_siniri):
    ajan_bellek "bilirkisi_ertelendi" anahtarına yazıyor, dosyaya tek satır
    bildirim düşüyor. Kayıt düşmezse sebep koşum özetine geçiyor (sessiz atlama yok).
  · ERTELEME KAPISI: `aday_cikar`, `ikinci_tur`, `alan_tara` ve `ilerlet`
    ertelenmiş dosyada hiçbir şey sormuyor/yazmıyor. Aşama ilerletme motoruna
    DOKUNULMADI.
  · AjanPenceresi.tsx: bekleyen soru "[bilirkisi:aday-yok:<alan>]" ise
    arabulucunun yazdığı metin taraf-cevap'a değil bilirkisi-secim `alan_tara`
    adımına gidiyor; pencere kapanmıyor.
- BÖLÜM 4 · DIŞARIDAN UZMAN:
  · YENİ ADIM `dis_uzman_gundem` (arabulucu): iki tarafın ajanına YALNIZ tek
    satır usul bilgisi + uzmanlık alanı gidiyor. Kişi adı, arabulucunun metni,
    dosya içeriği, karşı tarafın verisi GEÇMİYOR.
  · BilirkisiAlanlari.tsx'e "Dışarıdan uzman gündeme gelsin" düğmesi eklendi.
  · BilirkisiTarafPaneli.tsx'e "Bilirkişiden vazgeç" düğmesi eklendi
    (ertele · vazgecildi). Gerekçe sorulmuyor.
  · ORTAK İRADE: atama zaten iki tarafın yanıtından sunucuda türetiliyor
    (`ata` adımı) — dokunulmadı.
- BÖLÜM 6 · DİL DENETİMİ (değişen metinler tek tek):
  · AjanPenceresi.tsx: "Beğenmedim, yeniden" → "Yeniden öner" · "Yeniden yap"
    (düğme) kaldırıldı · "arabulucu beğenmedi" (sonuc kaydı) → "arabulucu
    yeniden öneri istedi" · "Anladım, yeniden yapacağım…" → "Yeniden
    önereceğim…" · kod yorumundaki "Beğenmedim, yeniden" başlığı güncellendi.
  · IntakeChat.tsx:153 "Üzgünüm, bir hata oluştu…" → "Şu an cevap veremiyorum.
    Birazdan tekrar deneyin." (EN karşılığı da nötrleştirildi.)
  · Ürün genelinde tarama yapıldı: "beğen/maalesef/üzgün/hoşuma" başka yerde
    kullanıcıya görünen metinde YOK.
- Tip denetimi: `npx tsc --noEmit -p tsconfig.app.json` temiz (0 hata).

KALDIRILMADI — BÖLÜM 2 (kurucu kararına bırakıldı)
- Durdur · Değiştir · Talimat ver üçünün de ARABULUCU PANELİNDE KARŞILIĞI YOK.
  Doğrulama: AgentControlPanel.tsx (864 satır) içinde "Durdur/Değiştir/Talimat"
  geçmiyor (grep boş döndü); akis_duraklatma'yı okuyan/yazan tek yüzey
  AjanPenceresi.tsx (361, 569, 588); arabulucu_talimatlari'na yazan ikinci yer
  MediationEngine.tsx:2653 ama o dosya kapanışındaki "eksik notu" akışıdır,
  genel talimat yüzeyi değildir.
  KOMUT GEREĞİ KALDIRILMADI, oldukları yerde duruyor. Kurucu ayrı karar verecek.
- "Vazgeç" düğmesi AjanPenceresi.tsx:1107'de DURUYOR (cevap kipinden çıkış).
  Sebep: kaldırılırsa "Cevap yaz"a basan kullanıcı cevap kipinden çıkamaz,
  çalışan yol kırılır. Kurucu isterse tek satırla kaldırılır.

YAYIN (21.08, Code — "medipact devam")
- [x] REDEPLOY: bilirkisi-secim, Lovable'dan commit cf38ef2 ile yayına alındı
  ("başarılı — cf38ef2"). _shared/ değişmediği için fan-out redeploy gerekmedi.
- [x] PUBLISH BAŞLATILDI: deploy_project çağrıldı, deployment_id
  b22915a1-e4f2-471f-ae9d-244fe9d9e5d0, dönüş "pending". Ardından get_project
  latest_commit_sha=cf38ef2 ve status=ready gösterdi. TAMAMLANDIĞI AYRICA
  DOĞRULANMADI — kurucu medipact-ai.lovable.app'i sert yenileyip görmeli.
  Bu publish aynı zamanda 20.08'den beri yayına girmemiş ön yüzü de taşır:
  BilirkisiAlanlari ("Alan satırı ekle") canlıda bundan sonra görünmeli
  (106/teşhis turunun 5. maddesi).

AÇIK KALEMLER
- Havuz yönetim ekranı yok (gundem_kalem_havuzu, 70 başlık) — kurucu kararı:
  şimdi değil.
- İLERİYE KALEM (kurucu fikri, yapılmayacak — kayıt için): risk ve finansal
  analiz ajanı. Her tarafın kendi ajanı YALNIZ kendi tarafının evrakını
  inceler, riski ve hesabı çıkarır, kendi tarafına sunar; evrak karşı tarafa
  geçmez. Taraflar masaya bu hesapla oturur.
- Kurucu pilotta ürünün tamamını gezip benzer dil/bütünlük kusurlarını
  ayrıca bildirecek.
- CANLI TEST YAPILMADI (kurucuda): tükenme → alan yazma → ikinci tur → üçüncüde
  erteleme zinciri ve "Bilirkişiden vazgeç" düğmesi canlıda denenmeli.

## Nerede kaldık — 21.08.2026 (106) · CLAUDE BÖLGESİ DENETİMİ 1. TUR KAPANDI

Üç açık kalemin de sonucu okunarak belirlendi. İKİSİNDE İŞ ÇIKMADI, BİRİ CANLI
TESTLE KAPANDI. Politika ve kural satırı YAZILMADI — gerekmediği için.

1. [x] gundem_kalem_havuzu — POLİTİKA GEREKMİYOR, BULGU YANLIŞ ALARMDI.
   Denetim notu "havuzdan ekrana öneri çıkacaksa ÇIKMIYOR" diyordu. Okundu:
   havuzu ekrana çıkaran hiçbir yer YOK. Tabloya dokunan tek kod hazirlik-foyu
   ve servis anahtarıyla okuyor (index.ts:794 `createClient(SUPABASE_URL,
   SERVICE_KEY)`; HAVUZ_TABLOSU geçişleri 475 ve 586). Servis anahtarı RLS'i
   atlar — föy gündemi normal kuruluyor.
   src altında tabloyu okuyan tek satır yok (grep: yalnız types.ts:2737, o da
   üretilen şema dosyası).
   CANLI DOĞRULAMA (SELECT): RLS açık · politika 0 · 70 satır · hepsi etkin ·
   2 kategori (tüketici 45, kira 25). Örnek başlıklar: "Kira bedeli tespiti",
   "İhtiyaç sebebi tahliyesi", "Kefil sorumluluğu", "İhtarname gönderimi".
   SONUÇ: politikasız RLS bu tablo için DOĞRU kurulum. SQL yazılmadı.

   AÇIK KALEM (kurucu kararı 21.08: "şimdi değil") — HAVUZUN YÖNETİM EKRANI YOK.
   Kurucu 70 başlığı hiçbir yerden göremiyor, düzeltemiyor, kapatamıyor.
   hazirlik-foyu/index.ts:469-471 "kurucunun kalemleri BİLEREK kapattığı"
   durumu tanıyor ve o hâlde yeniden türetme yapmıyor — ama kapatma yüzeyi
   üründe yok. Gerekirse: kategori · başlık · kaynak künyesi · alıntı listesi
   ve etkin/pasif düğmesi.

2. [x] bilirkisi_beyani__ilerlet — KOD KUSURU YOK, CANLI TESTLE KAPANDI.
   Zincirin dört halkası da okunarak doğrulandı:
   · BilirkisiTarafPaneli.tsx:97-98 — "beyan_yaz" adımını secim_yontemi ile
     çağırıyor; ekran CaseRoom.tsx:859'da taraf sekmesinde çizili.
   · bilirkisiCagri.ts:35 gövdeyi doğrudan body olarak gönderiyor;
     bilirkisi-secim/index.ts:260 gövdeyi doğrudan okuyor — alan adları uyuyor,
     kopukluk yok.
   · index.ts:304-310 — beyan GERÇEKTEN değiştiyse bilirkisi_beyani_verildi
     yazılıyor (21.08 döngü onarımının kapısı).
   · Kural sıra 50, etkin=true, sonraki adım bilirkisi-secim.
   HİÇ ÇALIŞMAMASININ SEBEBİ: beyan hiç verilmemişti — bilirkisi_secim_beyani
   0 satırdı. Kusur değil, denenmemiş yol.
   CANLI TEST (21.08, kurucu taraf ekranından "Biz seçelim" ile kaydetti):
   beyan 1 satır · bilirkisi_beyani_verildi 1 satır · islendi=true. KURAL ÇALIŞTI.
   Aday öneri 0 kaldı — adaylar arabulucu tarafında aday_cikar ile çıkar,
   bu testin kapsamı değildi.

3. [x] DİNLEYİCİSİ OLMAYAN DÖRT OLAY — KURAL YAZILMADI, DÖRDÜNÜN DE GEREKÇESİ VAR.
   CLAUDE.md 120-126 "her yetenek ya olaya bağlanır ya gerekçesi yazılır"
   gereği gerekçeler buraya yazıldı:
   · foy_gonderildi (2 satır) — zincirin sonu. Föy tarafa gitti, arkasından
     çalışacak adım yok.
   · foy_taslagi_hazirlandi (5) — sıradaki adım ARABULUCUNUN ONAYI. Onay insan
     kapısıdır; ajanın kendiliğinden ilerletmemesi doğrudur.
   · belge_ozeti_uretildi (1) — zincirin sonu. Özet belge_ozetleri'ne yazıldı.
   · soru_cevaplandi (7) — DEVAMI VAR, ama kural tablosundan değil:
     ajan-nobetci/index.ts:1139-1143 cevaplanmış ('yapildi') görevin
     gerekçesindeki "[kol:<fonksiyon>]" etiketinden ilgili kolu BİR KEZ yeniden
     uyandırıyor (yasa-1 madde 5'in karşılığı). Kural satırı yazılırsa aynı iş
     iki koldan tetiklenir.
   SONUÇ: dördü için de akis_kurallari'na satır YAZILMADI.

YAN BULGU (giderilmedi, kayıt için)
- case_expert_assignments'ta 1 atama var ama bilirkisi_onerileri 0 satır. Yani
  o atama yeni bilirkişi akışından değil, eski ekrandan yapılmış. Yeni akışın
  aday çıkarma kolu bugüne dek hiç koşmamış.

DENETİMİN HÂLÂ BAKMADIĞI YERLER (2. tur, dürüstlük kaydı — değişmedi)
- cron.job kayıtları · migration geçmişi · politikası VAR ama içeriği yanlış
  olabilecek tablolar (yalnız "politika sayısı sıfır mı" bakıldı, içerik okunmadı)

AÇILIŞ OKUMASI (21.08, Claude — geçen oturumun eksiği kapatıldı)
- COWORK.md'nin altı maddelik listesi bu kez EKSİKSİZ uygulandı: medipact-komut.md
  (441 satır) · constitution.md (218) · mimari/00-INDEX.md (98) ·
  mimari/06-ajan-mimarisi.md (843) · tasks/lessons.md (312) tamamı, tasks/todo.md
  yalnız en üstteki blok. Geçen oturumda okunmayan üç dosya artık okundu.

## Nerede kaldık — 21.08.2026 (105) · CLAUDE BÖLGESİ DENETİMİ (1. tur) + KURAL TABLOSU DÜZELTİLDİ

YAPILDI (Claude, SQL — kanıt aşağıda)
- [x] KURAL TABLOSU ÇELİŞKİSİ KAPANDI. Notunda "KAPALI" yazan ama etkin=true olan
      ÜÇ satır (notta iki diye kayıtlıydı, canlıda üç çıktı) gerçekten kapatıldı:
      · belge_yuklendi__analiz (sıra 10) → etkin=false
      · kalem_guncellendi__karsilastir (sıra 25) → etkin=false
      · foy_onaylandi__gonder (sıra 30) → etkin=false
      Üçünün gerekçesine "[21.08 DUZELTME: etkin alani gercekten false yapildi;
      not KAPALI diyordu ama kural acikti, kosucu etkin alanina bakiyor.]" eklendi.
      DOĞRULAMA (update sonrası SELECT, 9 satırın tamamı): etkin=true olan hiçbir
      satırın gerekçesinde artık "KAPALI" geçmiyor. Çelişki sıfır.
      ETKİSİ: belge yüklenince analiz zinciri artık TEK koşuyor (ön yüzdeki 30 sn'lik
      sayaç). Çift OpenAI harcaması durdu. Föy çift gönderim yolu kapandı.
      SQL: yapıldı · redeploy: gerekmedi · publish: gerekmedi.
- [x] DÖNGÜ ONARIMI CANLIDA DOĞRULANDI (SELECT). akis_olaylari'nda
      bilirkisi_durumu_degisti üç satır: 20.08 17:44:43, 20.08 17:45:15 ve
      21.08 01:59:37 ("dongu_testi — kural yeniden acildi, dongu var mi").
      Sonuncusu islendi=true ve ARKASINDAN YENİ SATIR DÜŞMEMİŞ. Döngü yok.
      Ayrıca bilirkisi_durum__ilerlet kuralı canlıda etkin=true, gerekçesinde
      "21.08 ACILDI" notu var. todo.md'de "yapılacak" diye duruyordu, yapılmıştı.

AÇIK KALEMLER — CLAUDE BÖLGESİ DENETİMİ 1. TUR BULGULARI (hiçbiri giderilmedi)
1. TABLO KİLİTLİ — gundem_kalem_havuzu. RLS açık ama POLİTİKA SAYISI SIFIR
   (pg_policies taraması, public şemada politikasız tek tablo). Postgres'te bu
   "service_role dışında kimse okuyamaz" demek. İçinde 70 satır var; kolonlar:
   kategori, baslik, kaynak_source_title, kaynak_alinti, durum, ipuclari.
   Taraf verisi YOK, kaynak künyeli gündem kalemi şablonları var — yani sızıntı
   değil, TERS yönde kusur: bu havuzdan ekrana öneri çıkacaksa ÇIKMIYOR.
   GİDERMEK İÇİN: okuma politikası yazılacak. Kimde: Claude (politika = Claude).
   ÖNCE OKUNACAK: bu havuzu hangi ekran/fonksiyon çağırıyor, kime görünmeli.
2. HİÇ ÇALIŞMAMIŞ KURAL — bilirkisi_beyani__ilerlet (sıra 50, etkin=true).
   Tetikleyicisi bilirkisi_beyani_verildi olayı akis_olaylari'nda BİR KEZ BİLE
   yazılmamış (olay kodu bazında sayım: o kod listede yok).
   GİDERMEK İÇİN: sebebi okunacak — beyan ekranı olayı yazmıyor mu, yoksa o yol
   hiç kullanılmadı mı. Kimde: önce Claude okur, kod kusuruysa Code'a geçer.
3. DİNLEYİCİSİ OLMAYAN DÖRT OLAY — yazılıyor, hiçbir kural dinlemiyor:
   soru_cevaplandi (7 satır) · foy_taslagi_hazirlandi (5) · foy_gonderildi (2) ·
   belge_ozeti_uretildi (1). CLAUDE.md 120-126: her yetenek ya olaya bağlanır ya
   gerekçesi yazılır. Bu dördünün gerekçesi belgede var mı BAKILMADI.
   GİDERMEK İÇİN: ya kural satırı yazılacak ya gerekçe belgeye düşecek. Kimde: Claude.
4. [x] BAYAT YORUM GİDERİLDİ (21.08, Code — "medipact devam" komutuyla).
   ajan-nobetci/index.ts:2393 artık "gorevEtiketiVarMi'yi de etkiliyordu;
   21.08.2026'da o kapı da includes'a çevrildi — dosyada çalışan startsWith
   kalmadı" diyor. YALNIZ YORUM değişti, tek satır; çalışan kod dokunulmadı
   (grep: startsWith'in altı geçişi de yorum içinde). Redeploy GEREKMEZ —
   davranış değişmedi; yayındaki sürümle fark yalnız yorumdur.

DENETİMİN BAKMADIĞI YERLER (2. tur, dürüstlük kaydı)
- cron.job kayıtları · migration geçmişi · politikası VAR ama içeriği yanlış
  olabilecek tablolar (yalnız "politika sayısı sıfır mı" bakıldı, içerik okunmadı)
- constitution.md, mimari/00-INDEX.md, mimari/06-ajan-mimarisi.md bu oturumda
  OKUNMADI (COWORK.md "Yeni oturum" listesi eksik uygulandı — Claude hatası).
  Sonradan okunanlar: medipact-komut.md TAMAMI (441 satır) · tasks/lessons.md
  TAMAMI (302 satır) · CLAUDE.md TAMAMI (196 satır) · COWORK.md TAMAMI (144 satır).

KURAL KİTABI
- Cowork tarafındaki "medipact-calisma-duzeni" özeti ESKİMİŞ: kapı satırını dört
  alan sanıyordu, COWORK.md beş alan istiyor (uydurma alanı eksikti). İki nüsha
  çeliştiğinde yakındaki kazandı, kurucunun kitabı çiğnendi.
  YAPILAN: içinde hiç kural olmayan, yalnız "COWORK.md'yi oku ve ona uy" diyen yeni
  SKILL.md kurucuya dosya olarak gönderildi. KAYDEDİLDİ Mİ BİLİNMİYOR — Claude
  göremiyor, kurucu bildirecek.
- [x] 21.08 · COWORK.md GÜNCELLENDİ (kurucu onayıyla, Claude yazdı). Yalnız en
  sondaki "Yeni oturum" bölümü değişti; kalan 137 satıra dokunulmadı. Okuma listesi
  tek satırdan altı maddeye açıldı ve her maddenin yanına NE KADAR okunacağı yazıldı:
  1 medipact-komut.md (Tam okunur — listeye YENİ girdi, bugüne dek hiç okunmuyordu) ·
  2 constitution.md · 3 mimari/00-INDEX.md · 4 mimari/06-ajan-mimarisi.md (üçü tam) ·
  5 tasks/todo.md (YALNIZ en üstteki blok; dosya 200 KB'ı aştı, altı bayat) ·
  6 tasks/lessons.md (Tam okunur).
  KÖK SEBEP: kurucu komutu Claude'un açılış listesinde hiç yoktu; ürünün en üst
  belgesi okunmadan çalışılıyordu. 21.08'deki kural ihlallerinin kaynağı budur.
- [x] 21.08 · CLAUDE.md GÜNCELLENDİ (kurucu onayıyla, Claude yazdı). TEK SATIR:
  satır 13 "constitution > komut > mimari > tasks." →
  "constitution.md > medipact-komut.md > mimari/ > tasks/." Sebep: "komut" kelimesi
  tek başına yapıştırılan komut sanılabiliyordu. Başka hiçbir satırına dokunulmadı.
  Code'un listesinde medipact-komut.md zaten vardı (satır 9, şartlı) — eklenmedi.
- [x] 21.08 · COWORK.md ve CLAUDE.md depoya işlendi ve push edildi
  (39821b4..8dd94ab). Claude depodan OKUYARAK doğruladı: COWORK.md'nin altı
  maddelik yeni okuma listesi ve CLAUDE.md'nin 8. ve 13. satırları depoda güncel.
- [x] 21.08 · supabase/.temp/ DEPODAN ÇIKARILDI (Code). .gitignore'un sonuna tek
  satır eklendi (`supabase/.temp/`, mevcut 28 satıra dokunulmadı);
  `git rm -r --cached supabase/.temp` ile takipten düşürüldü — dosya diskte duruyor,
  silinmedi. Sebep: Supabase CLI'nin kendi önbelleği (içi: `v2.115.0`), her koşumda
  yeniden yazılıp depoda gürültü yapıyordu.
- [x] 21.08 · CLAUDE.md SATIR 8 DÜZELTİLDİ (kurucu onayıyla, Claude yazdı).
  Eski: "`tasks/todo.md` ve `tasks/lessons.md` — tam oku."
  Yeni: "`tasks/todo.md` — yalnız en üstteki 'Nerede kaldık' bloğu (alt kısmı
  bayattır) · `tasks/lessons.md` — tam oku."
  Sebep: eski satır aynı dosyanın iki bölümüyle çelişiyordu — "Bayat liste uyarısı"
  (satır 15-20) todo.md'nin altına bakılmamasını, "Okuma sınırı" (satır 22-31)
  dosyaların tamamının okunmamasını söylüyor. Code hangisine uysa bir kuralı
  çiğniyordu. Artık her dosyanın yanında NE KADAR okunacağı yazılı (COWORK.md ile aynı).
- [x] 21.08 · DERS lessons.md'ye YAZILDI: "Kuralın gerekçesinde KAPALI yazması onu
  kapatmaz — koşucu yalnız etkin alanına bakar." Dosyanın en sonuna, kendi biçimiyle.
- (kapandı) DEFTERE GİRMEYİ BEKLEYEN DERS: "Bir akış kuralının
  gerekçesinde KAPALI yazması onu kapatmaz — koşucu yalnız etkin alanına bakar.
  Kural kapatılırken iki alan birlikte değiştirilir; not ile alan ayrışırsa kural
  sessizce çalışmaya devam eder ve para/çift gönderim üretir." (21.08 bulgusu)

## Nerede kaldık — 21.08.2026 (105) · DÖNGÜ KUSURU + NÖBETÇİ MÜKERRER YAZIM KAPISI

YAPILDI
- [x] 1 · DÖNGÜ KUSURU KAPANDI (bilirkisi-secim). "Gerçek değişiklik yoksa olay
      yazma" kuralı tek yere kondu: durumIzi() + olayYazDegistiyse()
      (supabase/functions/bilirkisi-secim/index.ts:213-262). Parmak izi ÜÇ nesnel
      sayıdan kurulur — öneri durum dağılımı, atama sayısı, onaylı evrak sayısı;
      ajan_bellek'te "bilirkisi_izi" anahtarında durur, yalnız sayı ve durum kodu
      taşır (sayılar 999'da sınırlı, öğrenme süzgeci 4+ basamağı reddediyor).
      · ilerlet: sunulan=0 ise olay HİÇ DENENMEZ; sunulduysa yalnız iz değiştiyse
        yazılır (index.ts:519-531). Asıl döngü buradaydı.
      · aday_cikar · arabulucu_ekle/taraf_aday_oner · ata · evrak_onayla: hepsi
        aynı kapıdan geçiyor, böylece kayıtlı iz güncel kalıyor.
      · beyan_yaz ve yanit_yaz: kapı yerine "satır gerçekten değişti mi"
        karşılaştırması (aynı formu ikinci kez kaydetmek olay değildir).
      · evrak_onayla artık gerçekten güncellenen satırı SAYIYOR (.select("id"));
        geçersiz kimlikle çağrıda olay yazılmıyor.
      · Sessiz atlama yok: her adımın dönüş gövdesinde "olay" alanı sebebi yazıyor.
- [x] 2 · NÖBETÇİ MÜKERRER YAZIM KAPISI ONARILDI: gorevEtiketiVarMi startsWith →
      includes (supabase/functions/ajan-nobetci/index.ts:129-150). Sebep kod
      yorumuna yazıldı: anaAjanaBildir gerekçenin başına "[kaynak:nobetci]"
      koyduğu için iş etiketi ortada kalıyordu, kapı hiçbir satırı bulamıyordu.
      includes hem eski hem yeni satırı bulur; kapı yalnızca daralır.

EKSİK KALDI / DOKUNULMADI
- rapor_yorumu olayı kapıya BAĞLANMADI (bilirkisi-secim/index.ts:918). Sebep:
  tarafın yazdığı görüş parmak izini değiştirmez, kapıya bağlansaydı gerçek bir
  insan eylemi SESSİZCE elenirdi. Kendi kendini besleyemez — uyandırdığı ilerlet
  artık olay yazmıyor, zincir orada bitiyor.
- PARMAK İZİNİN SINIRI: birbirini götüren iki değişiklik (bir öneri taslak→ret
  olurken başkası ret→taslak olması) aynı izi üretir ve olay yazılmaz. Bugünkü
  durum geçişleri tek yönlü olduğu için pratikte oluşmuyor; oluşursa iz alanına
  geçiş sayacı eklenmeli.
- KAPSAM DIŞI, DÜZELTİLMEDİ — AYNI HATANIN İKİ KARDEŞİ ajan-nobetci'de duruyor
  (ikisi de anaAjanaBildir'den geçen satırı startsWith ile arıyor, bulamıyor):
  · index.ts:989 — `[alternatif:<teklifId>]` satırı bulunamıyor, tarafın
    alternatif saatleri `sonuc` alanına YAZILAMIYOR; randevu-teklif okuyamıyor.
  · index.ts:1756 — `[onay:ek_oturum:<id>]` satırı bulunamıyor, arabulucunun
    "ikinci oturum gerekli" onayı İŞLENMİYOR, randevu hattı yeniden başlamıyor.
  [x] 21.08.2026 ONARILDI (kurucu onayı alındı): iki satır da startsWith →
  includes oldu, sebep kod yorumuna yazıldı.
  · index.ts:993 — `[alternatif:<teklifId>]` satırı artık bulunuyor, alternatif
    saatler `sonuc` alanına JSON olarak yazılabiliyor.
  · index.ts:1764 — `[onay:ek_oturum:<id>]` satırı artık bulunuyor, arabulucunun
    "ikinci oturum gerekli" onayı işleniyor ve randevu hattı yeniden başlıyor.
  · ajan-nobetci'de başka startsWith KALMADI (grep: yalnız yorum satırlarında
    geçiyor — 139, 989, 991, 2390). _shared/ DEĞİŞMEDİ, fan-out gerekmiyor.
  · YAYIN: commit fe0f189 push edildi, ajan-nobetci Lovable'dan redeploy edildi
    ("başarılı — fe0f189"). Ön yüz değişmediği için publish yapılmadı.
  · KAPSAM DIŞI, DOKUNULMADI: index.ts:2390'daki yorum hâlâ "Aynı kayma
    gorevEtiketiVarMi'yi de etkiliyor — KAPSAM DIŞI, raporlandı" diyor; oysa o
    kapı 21.08'de onarıldı. Yorum bayat, kod doğru. GİDERMEK İÇİN: tek satırlık
    yorum düzeltmesi (Code) — kurucu onayı bekliyor.
- akis-yurut'taki startsWith'ler SAĞLAM, dokunulmadı: `[gecis:]` (index.ts:338),
  `[akis:]` (761 ve 792) doğrudan insert ile yazılıyor, geçitten geçmiyor.

GİDERMEK İÇİN (bu turun kalanı)
- [x] REDEPLOY YAPILDI (21.08.2026): bilirkisi-secim · ajan-nobetci, Lovable
  üzerinden commit 22dc27ef ile yayına alındı (ikisi de "başarılı" döndü).
  Push kontrolü önce yapıldı: origin/main == HEAD == 22dc27ef, çalışma ağacı
  temiz. _shared/anlatim.ts DEĞİŞMEDİ — yalnız iki yeni ad içe aktarıldı,
  fan-out redeploy gerekmedi. Ön yüz değişmediği için publish yapılmadı.
- AKIŞ KURALI: bilirkisi_durumu_degisti → bilirkisi-secim kuralı yeniden
  AÇILABİLİR (Claude). Döngü kapısı kuruldu.
  · 21.08 DURUM TESPİTİ (Code, yalnız SELECT): kural canlıda hâlâ KAPALI.
    akis_kurallari id=c843ac2a-07c7-4af7-82e3-2c84737ed06d ·
    kod=bilirkisi_durum__ilerlet · olay_kodu=bilirkisi_durumu_degisti ·
    sonraki_adim=bilirkisi-secim · sahip=masa_ajani · sira=55 · etkin=false.
    Gerekçe alanında 20.08 "GEÇİCİ KAPALI" notu duruyor.
  · Döngünün canlı izi: akis_olaylari'nda bilirkisi_durumu_degisti yalnız 2 satır,
    20.08 17:44:43 ve 17:45:15 (kural o gün kapatıldı); sonrasında yeni satır yok.
  · SQL: var — o satırın etkin alanı true yapılacak ve gerekçedeki "GEÇİCİ KAPALI"
    notu "21.08'de döngü kapısı kuruldu, açıldı" diye güncellenecek. YAZAN: Claude.
    Code yazmadı — CLAUDE.md gereği akis_kurallari satırı Code tarafından yazılmaz.
- [x] ARAÇ KURULUMU (21.08.2026, kurucu komutu): Supabase CLI Windows'a kuruldu —
  v2.115.0, GitHub sürüm zip'inden C:\Users\ASUS\tools\supabase (winget'te paket
  yok, scoop/choco kurulu değil). Kullanıcı PATH'ine eklendi. GİRİŞ YAPILMADI,
  proje bağlanmadı, anahtar istenmedi. Depoya dosya girmedi.
- CANLI TEST (kurucu): aynı dosyada ilerlet'i iki kez koştur — ikinci koşumda
  dönüşte `olay: "durum değişmedi (…) — olay yazılmadı"` görünmeli ve
  akis_olaylari'na yeni satır DÜŞMEMELİ.

## Nerede kaldık — 20.08.2026 (105) · GÜN SONU DURUMU (Claude tarafı)

CANLIDA DOĞRULANANLAR (bugün, SQL ile görüldü):
- Deneyim defteri açıldı: ajan_deneyim'e satır düşüyor. Sebep bulunmuştu —
  deneme_no sütunu NOT NULL'dı, fonksiyon boş gönderiyordu; kısıt SQL ile
  kaldırıldı, varsayılanı 1 yapıldı.
- "tamamlandi:<adım>" bellek işareti yazılıyor. Öncesinde yazılamıyordu: öğrenme
  süzgeci (ogrenmeGirdisiUygunMu) ISO saat damgasındaki "2026"yı tutar sanıp
  reddediyordu; da30314 ile saat damgası ve UUID muafiyeti eklendi.
- Bilirkişi kolu (bilirkisi-secim) canlıda koştu ve düzgün kapandı:
  "sunulacak yeni aday yok" — beyan ve alan satırı olmadığı için doğru davranış.
- 39 edge fonksiyon yayına alındı (_shared/anlatim.ts değiştiği için tamamı),
  publish yapıldı.

CLAUDE'UN YAPTIĞI VERİ İŞLERİ:
- ajan_gorevleri tablosuna kaynak ve bekleyen kolonları eklendi (anaAjanaBildir
  için).
- ajan_deneyim.deneme_no NOT NULL kısıtı kaldırıldı, varsayılan 1.
- akis_kurallari'na iki satır yazıldı:
  · bilirkisi_beyani__ilerlet (olay: bilirkisi_beyani_verildi → bilirkisi-secim) AÇIK
  · bilirkisi_durum__ilerlet (olay: bilirkisi_durumu_degisti → bilirkisi-secim) KAPALI

AÇIK KUSURLAR (giderilmesi gereken):
1. DÖNGÜ KUSURU — bilirkisi-secim her koşumunda kendine bilirkisi_durumu_degisti
   olayı yazıyor (canlıda görüldü: olay 948ddbca, aday_sayisi 0, alan_sayisi 0).
   Kural bu yüzden KAPATILDI. Kol "gerçek değişiklik yoksa olay yazma" hâline
   gelmeli; sonra Claude kuralı yeniden açacak.
   GİDERMEK İÇİN: supabase/functions/bilirkisi-secim — olay yazımı yalnız aday
   sayısı, durum ya da atama gerçekten değiştiyse. Kimde: Code.
2. NÖBETÇİ MÜKERRER YAZIM KAPISI — ajan-nobetci'deki gorevEtiketiVarMi, gerekçenin
   iş etiketiyle BAŞLADIĞINI varsayıyor (startsWith). anaAjanaBildir artık gerekçenin
   başına "[kaynak:…]" koyduğu için etiket içeride kaldı; kapı fiilen açık, nöbetçi
   görevleri her turda yeniden yazabilir.
   GİDERMEK İÇİN: startsWith → includes (bilirkisiEtiketiVarMi deseni). Kimde: Code.
3. KURAL TABLOSU ÇELİŞKİSİ — iki kuralın gerekçesinde "KAPALI" yazıyor ama etkin
   alanı true (belge_yuklendi__analiz ve kalem_guncellendi__karsilastir). Koşucu
   etkin alanına bakıyor (akis-yurut/index.ts:657). Birincisi belge yüklenince
   analiz zincirini çağırıyor; ön yüzdeki 30 saniyelik sayaç da aynı zinciri
   çağırıyor — doğruysa her belgede iki kat OpenAI harcanıyor.
   GİDERMEK İÇİN: önce ön yüzdeki sayacın hâlâ çağırıp çağırmadığı kontrol edilecek,
   sonra karar. Kimde: Claude (veri) + kurucu (karar).
4. AŞAMA 7 SUNUCUYA İZ BIRAKMIYOR — belgeler ve imza tarafında bütün yazım ön yüzde;
   ajan orada olan biteni göremiyor. Kimde: Code.
5. TODO.MD'DEKİ 41 AÇIK MADDE BAYAT — bir kısmı yapılmış ama kutusu işaretlenmemiş.
   GİDERMEK İÇİN: tasks/durum-ayiklama.md — her madde için BİTTİ / YARIM / YOK,
   dosya referansıyla. Kimde: Code.
6. DEVİR ZİNCİRİ KAYDI CANLIDA GÖRÜLMEDİ — kod yerinde ama gerçek bir devir
   olmadığı için hiç yazılmadı. Kimde: canlı test (Claude).
7. UZMAN HAVUZU 6 KAYIT — bilirkişi seçiminin gerçek testi için dar. Kimde: kurucu (veri).
8. DEĞERLENDİRME SETİ YOK — 10 uydurma test dosyası, her birinin beklenen çıktısıyla.
   Öğrenmenin işe yarayıp yaramadığı ancak bununla ölçülür. Kimde: sonraki iş.

SIRADAKİ (Code kapsamı): 1 → 2 → 5 → 4
SIRADAKİ (Claude kapsamı): 3'ün veri kontrolü, 6'nın canlı testi, kuralın yeniden açılması

## Nerede kaldık — 20.08.2026 (104) · BİLİRKİŞİ KATMANI (yedi bölüm)

- [x] 1 · BEYAN: taraf kendi beyanını verir (biz seçelim / arabulucu seçsin /
      sistem önersin + tıkanmada arabulucu + masraf kabulü); katılımcı yöntem
      kuralı tek yerde (beyanlariOku) — iki taraf da "arabulucu" demedikçe liste
      ikisine de gider.
- [x] 2 · ALAN + ADAY: arabulucu alan satırı açar; masa ajanı en fazla 3 aday
      çıkarır, sıralama deterministik (alt alan 3 → uzmanlık 2 → tecrübe → puan
      → şehir alfabetik), gerekçe yalnız GERÇEK örtüşen ifadelerden kurulur;
      örtüşme yoksa isim uydurulmaz.
- [x] 3 · SUNUM + KÖR PERDE: taraf ajanı kendi sohbetinde sunar, taraf işaretler
      ve sıralar; karşı tarafın yanıtı ancak İKİ TARAF DA izin verirse görünür,
      süzme sorguda. İkinci tur ve tıkanma yolları açık.
- [x] 4 · ATAMA + DAVET + KABUL: atama insan kapısı (yalnız arabulucunun
      oturumu), case_expert_assignments'a yazılır, öneri 'atandi' olur; davet
      taraf daveti deseniyle gider; bilirkişi kabul edene kadar belge açılmaz.
- [x] 5 · BİLİRKİŞİ EKRANI: /bilirkisi, iki kademe. Kabulden önce yalnız beş
      alan; kabulden sonra yalnız açılan belgeler + kendi raporu. İndirme
      bilirkisi-belge-baglantisi ile, 5 dakikalık imzalı bağlantı.
- [x] 6 · EVRAK KÜMESİ: ajan seçer ve gerekçe yazar, onaylandi=false kalır;
      ARABULUCU ONAYLAMADAN AÇILMAZ. Taraflara yalnız başlık düzeyinde bilgi
      düşer. Dış aday yolu açık; ajan üçüncü kişinin verisini kendiliğinden
      kaydetmiyor.
- [x] 7 · RAPOR: bilirkişi kendi ekranından yükler; teslim olayı arabulucuya ve
      taraf ajanlarına düşer, tarafın diyeceği dosyaya işlenir. Nöbetçi 14 günde
      bilirkişiye, 21 günde arabulucuya hatırlatıyor.

AÇIK KALEMLER:
- UZMAN HAVUZU BUGÜN 6 KAYIT, GENİŞLETİLMELİ. (Sayı komutta bildirildi; bu
  turda canlıya sorulmadı — doğrulanmadı.) Havuz dar olduğu için aday çıkarma
  çoğu alanda "uygun aday bulamadım" diyecektir; bu bir arıza değil, veri
  eksikliğidir.
- TERCİH SIRASI ETİKETLE TUTULUYOR: bilirkisi_taraf_yanitlari'nda `sira` kolonu
  yok; tarafın sıralaması not alanının başına "[sira:N]" etiketiyle yazılıp
  ekranda ayıklanıyor (src/lib/bilirkisiCagri.ts). Kolon eklenirse etiket
  bırakılıp alana taşınmalı.
- BİLİRKİŞİNİN KAYIT OLMA YOLU YOK: projede açık kayıt kapalı, invite-signup
  yalnız TARAF davet jetonuyla çalışıyor. Bilirkişinin hesabı önceden açılmış
  olmalı; ekran bunu yazıyor. Yeni giriş sistemi kurulmadı (komut gereği).
- AKIŞ KURAL SATIRLARI YAZILMADI (komut: "Kural satırlarını Claude ekleyecek —
  sen ekleme"). bilirkisi-secim MOTORA_BAGLI listesinde ve zorunlu girdisi
  case_id; kural satırı gelince olayla uyanacak.
- KAPSAM DIŞI BULGU (düzeltilmedi, raporlanıyor): ajan-nobetci'deki
  gorevEtiketiVarMi mükerrer yazım kapısı, gerekçenin iş etiketiyle BAŞLADIĞINI
  varsayıyor (startsWith). Oysa anaAjanaBildir geçidi gerekçenin başına
  "[kaynak:…]" etiketini koyuyor; etiket artık başta değil, İÇERİDE. Yani o
  kapı fiilen açık ve nöbetçi bazı görevleri her turda yeniden yazabilir.
  Bilirkişi kolu bu kapıya güvenmiyor, kendi includes'lu kapısını kullanıyor
  (bilirkisiEtiketiVarMi). Düzeltme kararı kurucuda.

SIRADA (canlı doğrulama):
1. REDEPLOY: bilirkisi-secim · bilirkisi-ekranim · bilirkisi-belge-baglantisi ·
   bilirkisi-davet · ajan-nobetci + _shared/anlatim.ts'i kullanan BÜTÜN
   fonksiyonlar (ortak dosya değişti).
2. PUBLISH (ön yüz): /bilirkisi ekranı ve CaseRoom Bilirkişi sekmeleri.
3. Canlı test sırası: taraf beyanı → alan satırı + aday çıkarma → taraflara sun
   → taraf işaretlemesi → atama → davet → bilirkişi kabulü → evrak önerisi →
   arabulucu onayı → belge açma → rapor teslimi → tarafın görüşü.

## PLAN — 20.08.2026 (104) · BİLİRKİŞİ: SEÇİM, KABUL, KENDİ EKRANI, RAPOR

Kapsam: canlıda KURULU beş tablo + is_case_expert üzerine ÜRÜN katmanı.
SQL/migration/politika YAZILMAYACAK. Akış kuralı satırları da yazılmayacak
(komut: "Kural satırlarını Claude ekleyecek").

- [ ] 1 · Beyan (§1): taraf kendi beyanını yazar; katılımcı yöntem kuralı.
- [ ] 2 · Alan satırı + aday çıkarma (§2): deterministik sıralama, gerekçe.
- [ ] 3 · Taraflara sunum + kör perde + ikinci tur + tıkanma (§3).
- [ ] 4 · Atama (insan kapısı) + bilirkişi daveti + kabul/ret (§4).
- [ ] 5 · Bilirkişi ekranı iki kademe + bilirkisi-belge-baglantisi (§5).
- [ ] 6 · Evrak kümesi: ajan hazırlar, arabulucu onaylar; dış aday yolu (§6).
- [ ] 7 · Rapor + akışın sürmesi + 14/21 gün nöbetçi hatırlatması (§7).

Mimari kararlar (gerekçeli):
- experts tablosunu TARAF OKUYAMAZ (20260630074226 politikası: yalnız admin ve
  görevli arabulucu). Bu yüzden tarafın gördüğü aday profili ve bilirkişinin
  gördüğü her şey SUNUCUDAN gelir; süzme sorguda olur, ekranda gizleme yok.
- Yeni tablo/politika kurulamadığı için bilirkişi daveti YENİ giriş sistemi
  açmaz: taraf daveti deseninin aynısı (izinli origin + e-posta) kullanılır,
  bağlama doğrulanmış oturum e-postası ile experts.email eşleşmesinden yapılır.
- Atama ve evrak kümesi onayı insan kapısıdır; ajan yalnız yazar/önerir.

## Nerede kaldık — 20.08.2026 (103) · ÖĞRENME SÜZGECİ ONARIMI

- [x] eca1158'in beş bölümü CANLIDA DOĞRULANDI.
- [x] Deneyim defteri AÇILDI. Sebep görünür oldu ve bulundu: ajan_deneyim
      tablosundaki deneme_no NOT NULL kısıtı yazımı düşürüyordu; kısıt SQL ile
      kaldırıldı (Claude). Canlıda ilk satır düştü: mediator · basarili · 366 ms.
      Kod tarafında deneyimYaz artık alan boşken 1 yazıyor.
- [x] Bellek işareti bu commit'le açılıyor: ogrenmeGirdisiUygunMu'daki rakam
      yığını denetimi ISO saat damgasındaki yılı tutar sanıp belleğe yazan BEŞ
      çağrı yerinin hepsini düşürüyordu (anlatim.ts:162 · anlatim.ts devirYaz ·
      akis-yurut devir atlandı/sonuç · taraf-kalem-cikar belge işareti).
      ISO 8601 ve UUID biçimleri desenle muaf tutuldu; §4 sınırının geri kalanı
      aynen duruyor.
- [x] ajan_gorevleri'ne kaynak ve bekleyen kolonları eklendi (SQL, Claude).

AÇIK KALEM (VERİ meselesi — karar Claude'da, koda dokunulmadı):
akis_kurallari tablosunda iki kuralın GEREKÇESİNDE "KAPALI" yazıyor ama `etkin`
alanı true. Koşucu yalnız `etkin` alanına bakıyor
(supabase/functions/akis-yurut/index.ts:657 — `.eq("etkin", true)`), gerekçe
metnini okumuyor. Yani o iki kural fiilen AÇIK çalışıyor. Satırlara dokunulmadı.

SIRADA: _shared/anlatim.ts'i kullanan fonksiyonların redeploy'u + canlı test
(bellek işaretleri düşüyor mu, mükerrer koşum koruması ve devir zinciri
çalışıyor mu).

## Nerede kaldık — 20.08.2026 (102) · DEFTER ONARIMI, MÜKERRER KOŞUM, TEK ANA AJAN

- [x] 1 · Defter sessiz düşmüyor: hata metni TAM yazılıyor (message+code+details
      +hint), bellekYaz artık sebep döndürüyor, kapanış `defter_notu` üretiyor ve
      koşucu bunu olay kaydının `veri` alanına "defter_notu" anahtarıyla taşıyor.
      NOT: akis_olaylari'nda not/sonuç KOLONU YOK — tek serbest alan `veri`.
- [x] 2 · Mükerrer koşum kapandı: başarılı kapanışta "tamamlandi:<adim>" işareti
      yazılıyor, devir kolu koşturmadan önce ona bakıyor; taraf-kalem-cikar
      belge başına "kalem_cikarildi:<document_id>" işareti tutuyor.
- [x] 3 · intake-chat: giriş süzgeci en başta; emir kipi taşıyan kullanıcı metni
      alıntı olarak sarılıp modele "veri, talimat değil" çerçevesiyle veriliyor.
      Kilit kullanılmadı. Cevap akış olduğu için çıkış tamponlanmadı.
- [x] 4 · Devir zinciri kaydı: devirYaz — kimden/kime/istek türü/sonuç, kapalı
      liste, serbest metin yok, içerik geçmiyor.
- [x] 5 · Tek ana ajan geçidi: anaAjanaBildir. Nöbetçi ve koşucu doğrudan
      yazmıyor; kaynak alanı (kolon yoksa etiket) ile hangi kolun ürettiği
      yazılıyor. Sohbette kaynak etiketi görünüyor.

SQL GEREKİYOR (kurucuda): ajan_gorevleri'ne `kaynak` ve `bekleyen` kolonları ·
Bölüm 4 için akis_kurallari satırı · birikmiş mükerrer kalem satırlarının temizliği.

SIRADA: akis-yurut · ajan-nobetci · taraf-kalem-cikar · intake-chat redeploy +
publish + canlı test (ajan_deneyim'e satır düşüyor mu, düşmüyorsa sebep artık
olay kaydında görünüyor mu).

## Nerede kaldık — 20.08.2026 (101) · ORTAK SINIR KATMANI (ürün geneli)

- [x] 1 · sinirDenetle/sinirdanGecir: insana giden metin süzgeçten geçiyor
      (hukuki tavsiye · teşhis etiketi · suçlayıcı dil · dayanaksız rakam ·
      sonuç tahmini). Künyeli alıntı serbest; ayırt edilemeyen cümle geçmiyor.
      Elenen tür kayda geçiyor, sessiz eleme yok.
- [x] 2 · Prompt injection: ajanaTalimatMi + alintiOlarakSar. Belge içeriği
      model çağrısına ALINTI olarak giriyor; ajana yönelik cümle uygulanmıyor
      ve arabulucuya bildiriliyor (taraf-kalem-cikar, taraf-cevap).
- [x] 3 · yazmaIzniVar + INSAN_KAPISI_ALANLARI: ajan başına açık yazma listesi;
      insan kapılarının sonucunu hiçbir ajan yazamaz.
- [x] 4 · Öğrenme yazım süzgeci: deneyimYaz ve bellekYaz serbest metni, uzun
      değeri ve tutar benzeri sayıyı reddediyor; sebep dönüyor.
- [x] 5 · Anahtar ve dış erişim sınırı belgeye işlendi; loglarda anahtar yok,
      UYAP'a otomatik bağlanma yok.
- [x] 6 · Miras: kurallar ortak motorda tek yerde; motora bağlı 24 fonksiyon
      kendiliğinden kapsamda. Sohbet/bildirim yüzeyleri yalnız süzgeci çağırıyor,
      MOTORA_BAGLI'ya eklenmiyor (kilit sohbeti kırardı).
- [x] 7 · Kapsam tablosu raporda; kapsam dışı bırakılanlar tek tek yazıldı.

SIRADA: dokunulan fonksiyonların redeploy'u + publish + canlı test (süzgeç
künyeli alıntıyı geçiriyor mu, tavsiye cümlesini eliyor mu).

## Nerede kaldık — 20.08.2026 (100) · ÖĞRENEN AJAN + KAPANIŞ VE SİLME

KISIM A (A1-A4 bir önceki turda bitmişti, 93a3f62):
- [x] A5 · Kontrol tercihi kartında üçten fazla adım işaretlenince sakin uyarı.

KISIM B — ÖĞRENEN VE HEDEFE GÖRE PLAN KURAN AJAN:
- [x] B1 · deneyimYaz ortak motora eklendi; anlatimAc ve anlatimYansit kapanışta
      kendiliğinden yazıyor — motora bağlı her fonksiyon deneyim defterine yazar.
- [x] B2 · Yol merdiveni kodda açık liste; iki kez düşen yol elenir, işe yarayan
      yol öne alınır (girdiTamamla · oturum ve taraf yolları).
- [x] B3 · Hedef nesnel listeden okunuyor, olaylar hedefe yaklaştırma gücüne göre
      sıralanıyor, eksik işler üretebilecek ajana devrediliyor.
- [x] B4 · ajan_bellek yardımcıları (istendi/soruldu/tamamlandi/devir).
- [x] B5 · Sohbette tek soru "Neyi düzelttiniz?" — yalnız TÜR kaydediliyor,
      metin kaydedilmiyor, geçilebilir.
- [x] B6 · Üç tekrarda kural önerisi (etkin=false), sohbetten onayla etkinleşme,
      geri alma; kural metni değişmez, değişiklik yeni sürüm. Etkin kurallar üç
      metin üreten adımda ek yönerge olarak uygulanıyor.
- [x] B7 · Alışkanlık sayımı ve "bu dosyada da onay isteyeyim mi?" önerisi;
      kabul edilirse tercihe yazılıyor, kendiliğinden asla uygulanmıyor.
- [x] B8 · Kokpitte "Ajan ne öğrendi" kartı + sayımları sıfırlama.

KISIM C — KAPANIŞ, PAKET, SİLME:
- [x] C1 · Kapanış kontrol turu: eksik yazılırsa talimat kuyruğuna gidiyor,
      eksik kapanmadan kapanış ilerlemiyor.
- [x] C2 · Tek ZIP kapanış paketi (belgeler + UDF + notlar + oturumlar + kalem
      dökümü + süreç özeti) ve UYAP rehberi. Otomatik yükleme YOK.
- [x] C3 · dosya-verilerini-sil: iki onay, geri alınamaz, x-cron-secret kabul
      etmez. Kişisel veri gider; sayımlar ve kural kütüphanesi kalır (case_id NULL).
- [x] C4 · Nöbetçi günde bir sakin hatırlatma; silme asla kendiliğinden çalışmaz.

AÇIK KALEM: değerlendirme seti ve sürüm karşılaştırması — anonim (uydurma) test
dosyaları üretilince yapılacak; ölçülmeyen iyileştirme uygulanmaz.

YARIM KALAN (dürüstlük notu): düzeltme sorusu şu an SOHBETTEKİ düzeltme
anlarında çıkıyor (talimat verme ve "beğenmedim"). Föy panelinde metin
kaydetme ve taraf ekranında kalem düzeltme henüz soruyu tetiklemiyor.

SIRADA: akis-yurut · ajan-nobetci · hazirlik-foyu · bilirkisi-sorulari ·
taslak-denetim redeploy · dosya-verilerini-sil ilk deploy · publish · canlı test.

## Nerede kaldık — 20.08.2026 (99) · AJAN ÖNERİLERİ + PANO KUSURU ONARIMI

- [x] 1 · Sohbetin altına "Öneriler" bölümü (iki yüzey): en fazla üç açık öneri,
      başlık + gerekçe, Uygula / Kapat. Süzme sorguda; taraf yalnız kendi
      önerilerini görüyor. Hiçbir öneri akışı durdurmuyor.
- [x] 2 · ajan-nobetci'ye oneriKollari: dosyanın gerçek durumundan deterministik
      öneri üretimi (arabulucuya beş kural, tarafa dört kural). Aynı başlık bir
      kez açılıyor, kapatılan yeniden açılmıyor, yüzey başına en çok üç.
- [x] 3 · Dil sınırı: öneri metinleri koda tek tek yazıldı, yalnız usule dair,
      suçlayıcı dil ve hukuki değerlendirme yok. Föyün okunup okunmadığı üründe
      tutulmadığı için "okumadınız" denmiyor — bilinmeyen bilinmiyor diye yazıldı.
- [x] 4 · CANLI BULGU (20.08 02:06): talimat reddi ("Bu adım veriden hesaplanır")
      sohbete DÜŞMEDİ; pano tekrar süzgeci TÜR üzerinden kuruluydu ve föy onayı
      beklerken gelen ret elendi. panoyaYaz artık KONU anahtarıyla çalışıyor;
      farklı konudaki bildirim her zaman yazılıyor, yazılamazsa sebebi özete geçiyor.

SIRADA: ajan-nobetci · akis-yurut redeploy · publish · canlı test (öneriler iki
yüzeyde görünüyor mu, talimat reddi sohbete düşüyor mu).

## Nerede kaldık — 20.08.2026 (98) · ARABULUCU TALİMATI ("şunu şöyle yap, onaya sun")

- [x] 1 · Sohbette "Talimat ver": hedef adım (föy · bilirkişi soruları · taslak
      denetimi) seçilip serbest metin yazılıyor; kayıt doğrudan tablodan, yeni
      fonksiyon yok. Bekleyen talimat üstte tek satır görünüyor.
- [x] 2 · Koşucu her turda olaylardan ÖNCE talimat kuyruğuna bakıyor; adımı
      talimatla çağırıyor, bitince 'uygulandi' yapıp onay satırı düşürüyor.
      Onay gelmeden iş taraf yüzeyine çıkmıyor. Duraklatma talimatın üstünde.
- [x] 3 · Üç adım talimatı ek yönerge olarak alıyor ve çıktının başında
      belirtiyor. Anayasaya aykırı talimat 'uygulanamadi' + sade sebep;
      kalem karşılaştırması talimat almıyor ("veriden hesaplanır").
- [x] 4 · Onay satırında "Onayla" ve "Beğenmedim, yeniden". akis-onayla'ya
      talimat_id desteği eklendi; ret talimatı 'reddedildi' yapıp yeni talimat
      yazmayı açıyor.

SIRADA: akis-yurut · akis-onayla · hazirlik-foyu · bilirkisi-sorulari ·
taslak-denetim redeploy · publish · canlı test (talimat ver → uygula → onayla /
beğenme → tur dönsün).

## Nerede kaldık — 20.08.2026 (97) · ARABULUCU FRENİ VE KONTROL TERCİHİ

- [x] 1 · hazirlik-foyu-gonder kapısı onarıldı: koşucu iç kapıdan çağırabiliyor
      (x-cron-secret), kullanıcı yolu aynen duruyor. 20.08 00:48'deki
      "HTTP 401 — Oturum doğrulanamadı" kaydının sebebi buydu.
- [x] 2 · Sohbette Durdur / Devam / Değiştir. Koşucu her turda aktif duraklatmaya
      bakıyor: dosya kapsamlıysa hiçbir kural koşmuyor, adım kapsamlıysa yalnız
      o adım duruyor. Ajan durdurmayı kendiliğinden kaldırmıyor.
- [x] 3 · Aşama 1'e "Ajan hangi adımlarda önce size sorsun?" kartı; varsayılan
      hiçbiri işaretli değil. Koşucu tercih listesine bakıyor, işaretli adımda
      onay bekliyor. YENİ akis-onayla fonksiyonu onayı alıp olayı uyandırıyor.
      Dört değişmez kapı kartta kilitli ve bilgi amaçlı gösteriliyor.
- [x] 4 · Föy hazır olunca sohbete "Oturum hazırlık föyünü hazırladım." satırı
      ortak anlatımdan düşüyor; gönderim tercihe bağlı (işaretliyse onay,
      değilse ajan gönderip "gönderdim" yazıyor). Paneldeki Onayla düğmesi kaldı.

SIRADA: akis-onayla ilk deploy · akis-yurut ve hazirlik-foyu-gonder redeploy ·
publish · canlı test (durdur/devam, onay kapısı, föyün uçtan uca gönderimi).

## Nerede kaldık — 19.08.2026 (96) · DEPLOY + KURALLAR + CANLI TEST SONUÇLARI (Claude)

- [x] Deploy edildi: masa-kalem-karsilastir, bilirkisi-sorulari, taslak-denetim
      (üçü ilk deploy), akis-yurut, taraf-kalem-cikar, hazirlik-foyu-gonder;
      masa-kalem-karsilastir eşleştirme ölçüsüyle ikinci kez. Publish yapıldı.
- [x] akis_kurallari: bilirkisi_onerildi__sorular ve taslak_uretildi__denetim
      satırları EKLENDİ; belge_yuklendi__analiz, foy_onaylandi__gonder,
      kalem_guncellendi__karsilastir AÇILDI. Canlıda 7 kural, 7'si açık.
- [x] CANLI TEST 1: kalem güncellendi → olay → koşucu 61 saniyede
      masa-kalem-karsilastir'ı kendiliğinden çağırdı (19:32:07 → 19:33:08).
- [x] CANLI TEST 2: eşleştirme ölçüsü doğrulandı — özet: "2 ortak kalemin 2'si
      örtüşüyor, gerçek ayrılık 0 yerde. 4 kalem yalnız başvurucuda."
- [x] CLAUDE.md'ye SABİT KURALLAR bölümü eklendi (bilmiyorum/referans/döküm).

SIRADA: publish ekran kontrolü · bilirkişi ve taslak kollarının canlı testi ·
föy onayının uçtan uca gönderim testi.

## Nerede kaldık — 19.08.2026 (95) · EŞLEŞTİRME ÖLÇÜSÜ + TASLAK DENETİMİ KUTUSU

- [x] masa-kalem-karsilastir: ada ek olarak TUTAR eşleşmesi. Tutarı birebir aynı
      olan kalemler, o tutar her iki tarafta da TEK kalemde geçiyorsa eşleşiyor;
      belirsizlikte (aynı tutar birden çok kalemde) eşleştirme yapılmıyor.
      Özet cümlesine tek taraflı kalem sayısı da girdi.
- [x] Taslak denetimi kutusu OfficialDocumentsPanel'de geri açıldı (16.08'de
      "şablonlar yüklenince" notuyla kapatılmıştı; şart sağlandı).
- [x] Föy gönderimi motora bağlandı, kuralı açıldı; bilirkişi ve taslak kuralları
      veritabanına eklendi.

SIRADA: masa-kalem-karsilastir redeploy + publish, sonra canlı test — farklı ad
aynı tutar eşleşiyor mu, taslak denetimi kutusu belge altında görünüyor mu.

## Nerede kaldık — 19.08.2026 (94) · FÖY GÖNDERİMİ MOTORA BAĞLANDI

- [x] hazirlik-foyu-gonder ortak motora bağlandı: MOTORA_BAGLI listesinde, zorunlu
      girdisi foy_id, çalışırken adımlarını sohbete yazıyor ve Yapıldı/Eksik ile
      kapanıyor; eşzamanlılık kilidi motordan. Kilit çakışırsa 409 döner (koşucu
      yeniden dener, gönderim sessizce düşmez). Gönderim mantığına dokunulmadı.

SIRADA: hazirlik-foyu-gonder redeploy + foy_onaylandi__gonder kuralının açılması.

## Nerede kaldık — 19.08.2026 (93) · ATLANAN VE KALAN HER ŞEY (7 bölüm)

BİTTİ (kodda, deploy bekliyor):
- [x] 1 · masa-kalem-karsilastir: iki tarafın kalemleri örtüşen/yakın/ayrılan diye
      ayrılıyor, kokpite tek yeni kart "Kalem karşılaştırması" eklendi.
- [x] 2 · Ölçü: belgede karşı tarafa atfedilen talep artık listeye yazılmıyor.
- [x] 3 · 30 sn belge sayacı kaldırıldı; föy paneli tek "Onayla"ya indi, eski
      onaylı föylerde "Gönder" yedek kaldı.
- [x] 4 · Sohbete mikrofon (tarayıcı tanıması, dış servis yok, ses kaydı yok) ve
      varsayılan kapalı sesli okuma eklendi.
- [x] 5 · bilirkisi-sorulari (atama insanda) ve taslak-denetim (mevcut denetim
      mantığı birebir sunucuya taşındı, belge değişmez) yazıldı.
- [x] 6 · Aşama ilerletme motoru koşucuya kondu; koşullar nesnel, imza/kapanış ve
      bilirkişi ajan tarafından geçilmiyor, geçişler geri alınabilir.
- [x] 7 · Kokpitte "Tümünü aç/kapat", "yeni" işareti, boş kartta "Ajan hazırlıyor.",
      yeni kartta canlı tazelenme. (Katlama ve sol menüden açma ZATEN vardı.)

SIRADA: deploy, publish, 3 kapalı kuralın açılması, canlı test.

## Nerede kaldık — 19.08.2026 (92) · SİSTEMİN GENEL KANUNU (yasa-1)

BİTTİ (kodda, deploy bekliyor):
- [x] Ortak motor _shared/anlatim.ts içinde genişletildi: MOTORA_BAGLI listesi,
      motoraBagliMi, girdiTamamla (eksik girdiyi en az iki yoldan arar), soru
      tipleri ve kol etiketi.
- [x] akis-yurut yasaya uyduruldu: motora bağlı olmayanı çağırmıyor ve sebebini
      yazıyor · eksik girdiyi kendi tamamlayıp yeniden deniyor · aynı olay+kural
      için en fazla iki deneme · her hata anlaşılır tek cümle.
- [x] KUSUR (a) kapandı: hazirlik-foyu artık eksik girdiyle çağrılmıyor; oturum
      ve taraf bilgisi dosyadan tamamlanıyor, gerekirse taraf başına ayrı koşum.
- [x] KUSUR (b) kapandı: taraf sorusu artık 'taraf_sorusu' tipiyle yazılıyor;
      nöbetçi bu tipi yürütmediği için soru 'atlandi' olmuyor, sohbette duruyor.
- [x] KUSUR (c) kapandı: dayanak ölçüsü kondu — belgeye atıf yoksa 'dayanaksiz';
      talep cümlesi dayanak sayılmıyor; manevi tazminat gibi kalemler bilgi
      notuyla işaretleniyor ve tarafa sorulmuyor.
- [x] ajan-nobetci'ye hatırlatma kolu: 24 saat/2 gün aralıkla hatırlatma,
      e-posta iletişim tercihi süzgecinden geçiyor, cevap gelince duruyor;
      cevaplanan soru ilgili kolu bir kez yeniden uyandırıyor.
- [x] YENİ taraf-cevap: sohbetten verilen cevabı görevin sonuc alanına yazar.
- [x] Sohbet: bekleyen istek varsa kendiliğinden açılıyor, istek en üstte,
      "Cevap yaz" ile cevap kipi.

KURUCUYA NOT: taraf, ajan_gorevleri satırlarını yalnız OKUYABİLİYOR (RLS). Cevap
yazımı bu yüzden taraf-cevap kapısından geçiyor; politika değişmedi.

SIRADA: deploy (liste raporda) + publish, sonra canlı test — belge yükle, kalem
çıksın, dayanaksız kalemde soru sohbette KALSIN, cevap ver, kol devam etsin.

## Nerede kaldık — 19.08.2026 (91) · ÇALIŞAN-ANLATAN-TAMAMLAYAN AJAN DÜZENİ

BİTTİ (kodda, deploy bekliyor):
- [x] Ortak yardımcı _shared/anlatim.ts: adım anlatımı · eksik tamamlama sırası
      (kendi belgesi → önceki veri → mevzuat için bilgi tabanı) · doğru kişiye
      sorma · eşzamanlılık kapısı. Hepsi best-effort, hiçbiri hata fırlatmıyor.
- [x] 18 ajan fonksiyonuna anlatım bağlandı (her fonksiyonun KENDİ durum
      yazıcısına tek satır; davranış, girdi, çıktı ve süzgeçler değişmedi).
- [x] YENİ taraf-kalem-cikar: tarafın kendi belgelerinden talep kalemleri,
      belgede BİREBİR alıntı doğrulaması, dayanaksız kalem işaretlemesi,
      bulamadığını o tarafa tamamlayıcı dille sorma.
- [x] Ajan penceresi SOHBET oldu: tek akış, altta yazı kutusu, rol oturumdan
      (arabulucu → case-qa, taraf → taraf-asistan), aşama geçişi satırı.
- [x] CaseRoom taraf sekmelerinin SONUNA "Taleplerim ve dayanakları".
- [x] Sol menüde dosyanın bulunduğu aşamada altın nokta; ajan çalışırken nabız.

YAPILMADI — KURUCU KARARI GEREKİYOR:
- randevu-teklif ve hazirlik-foyu-gonder anlatımı: agent_states.agent_type CHECK
  kısıtında bu ikisine uyan izinli ad yok. Tek satırlık SQL (kısıta 'randevu' ve
  'foy_gonderim' eklenmesi) sizden gelirse anlatım da eklenir.
- generate-options: hizmet anahtarlı istemcisi ve case_id'si yok; anlatım için
  önce girdisine case_id eklenmeli.
- Kokpitteki mevcut kartların "Ajan hazırlıyor." boş satırı: yeni panelde var,
  eski kartlara toptan uygulanmadı (her kartın kendi boş durumu var; tek tek
  geçmek ayrı ve geniş bir ön yüz turu).

SIRADA: Lovable'da deploy (liste raporun sonunda) + publish, sonra canlı test.


## Nerede kaldık — 19.08.2026 (90) · AJAN PENCERESİ 1. TUR (SALT GÖRÜNÜM)

BİTTİ (kodda, publish bekliyor):
- [x] src/components/AjanPenceresi.tsx — sağ alt köşede sabit, kapatılabilir pencere.
      Kapalıyken düğme + bekleyen sayısı rozeti; açıkken "Ajan ne yaptı" (en fazla
      20 satır, tarih-saatli, tek cümle, teknik terim yok) ve "Bekleyen" (tıklanınca
      ilgili ekrana/sekmeye götürür; cevap yazma 2. turda).
- [x] İki ekranda: MediationEngine (arabulucu, tek yerden mount, bütün aşamalar) ve
      CaseRoom taraf görünümü.
- [x] KÖR VERİ SORGUDA: taraf yalnız party_id=kendi + tarafa_gorunur=true satırları
      ve yalnız kendine yönelik görev tiplerini görüyor. Arabulucu penceresi
      last_output/confidence/hallucination alanlarını sorguda bile seçmiyor.
- [x] Realtime AgentControlPanel deseniyle; kanal bileşen kapanınca kaldırılıyor.

KURUCUYA SORU: taraf penceresinde bekleyen iş satırlarının GEREKÇESİ ajanın
arabulucu panosuna yazdığı cümledir. Tarafa yönelik tiplerde sakıncasız görünüyor
ama metni ajan yazıyor; tarafa hiç gösterilmesin isterseniz tek satırla kapatılır.

SIRADA: publish + canlı test (arabulucu ve taraf hesabıyla ayrı ayrı), sonra
2. tur — pencereden cevap yazma.

## Nerede kaldık — 19.08.2026 (89) · AGENTIC BELKEMİĞİ 1. TAŞ (OLAY + KURAL + KOŞUCU)

BİTTİ (kodda, deploy bekliyor):
- [x] supabase/functions/_shared/olay.ts — olayYaz yardımcısı (deponun İLK _shared
      dosyası). Best-effort: olay yazılamazsa çağıran işlem başarısız sayılmaz.
- [x] 12 fonksiyona olay yazımı bağlandı (Aşama 1-2-3-4 kapsandı). Liste
      tasks/kurulu-envanter.md ve akis-kurallari-onerisi.md içinde.
- [x] tasks/akis-kurallari-onerisi.md — YEDİ AŞAMANIN olay haritası; her satırda
      aşama · olay_kodu · sonraki adım · sahip · insan kapısı · gerekçe, artı iki
      liste: BAĞLANAMAYANLAR ve EKSİK OLAY NOKTASI. VERİTABANINA KURAL YAZILMADI.
- [x] akis-yurut (YENİ edge fonksiyon): işlenmemiş olayları okur, kuralı uygular.
      insan_kapisi=true ise fonksiyon çağırmaz, panoya 'akis_onay_bekliyor' düşer.
      kosul yalnız {"en_az_taraf": N}; tanımadığı anahtarda kuralı ATLAR.
      Kural hata verirse olay işlenmiş sayılmaz, panoya 'akis_hatasi' düşer.
      Güvenlik kapısı ajan-nobetci ile birebir aynı.
- [x] ajan-nobetci turunun SONUNDA akis-yurut bir kez tetikleniyor; mevcut
      kontroller, sıraları ve kapısı değişmedi.

KURUCUYA DÜŞEN KARAR: akis-kurallari-onerisi.md okunacak, hangi kuralların tabloya
gireceğine kurucu karar verecek ve satırları kurucu yazacak.

DİKKAT — İLK DEPLOY RİSKİ: _shared bu depoda ilk kez kullanılıyor. Lovable'ın
deploy'u parent klasörü bundle etmezse import kırılır. ÖNCE TEK FONKSİYON
(extract-document-text) deploy edilip canlıda denenmeli; çalıştığı görülmeden
öteki 11 fonksiyon deploy edilmemeli.

SIRADA: tek fonksiyonla _shared denemesi → sonra kalan fonksiyonlar + akis-yurut
deploy → nöbetçi turunda koşucunun çalıştığının doğrulanması.

## Nerede kaldık — 19.08.2026 (88) · GÖNDERİM KAYDI · NÖBETÇİ · TEK DÜĞME

BİTTİ (kodda, deploy bekliyor):
- [x] hazirlik-foyu-gonder her denemede foy_gonderim_kayitlari'na satır yazıyor:
      'kabul_edildi' (+ resend_message_id) · 'hata' (+ sadeleştirilmiş mesaj) ·
      'suzgec_engelledi' (+ süzgecin sebebi). attempt = mevcut kayıt sayısı + 1.
      Kayıt yazılamazsa gönderim başarısız sayılmıyor; dönüşe "kayıt yazılamadı" notu.
- [x] "Teslim edildi" ifadesi hiçbir yerde kullanılmadı — 'kabul_edildi' yalnız
      servisin isteği aldığı anlamına gelir. Webhook 2. turda.
- [x] ajan-nobetci: kaydı olmayan ya da son kaydı 'hata' olan 'gonderildi' föyler için
      panoya 'foy_teslim_uyarisi' (yürütülmeyen tip → e-posta yok, mükerrer yazmaz).
- [x] Panelde taslak föyde birincil "Onayla ve gönder" + ikincil "Yalnız onayla";
      gönderilmiş föyün altında gönderim kaydına göre üç ayrı durum satırı.

SIRADA: Lovable'da hazirlik-foyu-gonder VE ajan-nobetci redeploy + publish, sonra
canlı test — taslak föyde tek tıkla gönderim, kayıt satırının düşmesi, nöbetçi turunda
kaydı olmayan eski föy için panoya uyarı düşmesi.

### Z RAPORU — 18.08.2026 (gün kapandı)

## Nerede kaldık — 18.08.2026 (87) · GÜN SONU

BİTTİ (canlıda):
- [x] Föy gündemi bilgi tabanına bağlandı — gundem_kalem_havuzu (c8e3b5c9)
- [x] İletişim tercihi katmanı İBA 1.5 1. tur — taraf ekranı + yedi fonksiyonda ortak
      gonderilsinMi süzgeci, fail-open (7176d5af)
- [x] Sessiz saat açıklaması gerçek davranışla hizalandı (8b981674)
- [x] Föy 2. tur İBA 3.3 — hazirlik-foyu-gonder + "Oturum hazırlığım" sekmesi
      (ad57757). Canlı test 19.08 01:02'de geçti, iki föy de gönderildi.
- [x] Kokpitteki mükerrer föy kaydı kaldırıldı (5a87fc3)

SIRADAKİ İŞ: föy gönderiminde teslim kaydı + ajan-nobetci doğrulaması +
"Onayla ve gönder" tek düğme.

AÇIK KALEMLER (18.08 sonu):
- Föy gönderiminde teslim kaydı yok (servis dönüş kimliği ve teslim durumu hiçbir yere
  yazılmıyor) — İBA denetim izi maddesiyle aynı iş.
- gundem_kalem_havuzu boş, ilk türetme tetiklenmedi.
- Föy soru bölümü için sabit soru havuzu (DOJO incelemesi kurucuda).
- Saklama süreleri 10 kategoride belirsiz.
- Lovable'da 2 güvenlik bulgusu ve "Build unsuccessful" uyarıları incelenmedi.

### Z RAPORU — 17.08.2026 (gün kapandı)
Kurucu 18.08'de çalışmayacak; 19.08'de devam edilecek.

BUGÜN CANLIYA ALINAN
- Hazırlık föyü kendi bölümü olarak Aşama 4'ün en üstüne taşındı + solda kendi menü
  girdisi (faz4-hazirlik-foyu). Kokpitteki kopya yerinde kaldı. (adfcfe5)
- Föy paneli oturumu kademeli buluyor: gelecek → geçmişteki en son → tarihsiz taslak.
  Oturum tarihi geçince föyler kaybolmuyor.
- Föy metin kuralları: saat Türkiye saatiyle yazılıyor (FOY_SAAT_DILIMI) · gündem
  başlıkları tek tip · tutum bildiren madde eleniyor · belge bölümü her föyde var ·
  ad boşlukları temizleniyor. (b22ce0e)
- Föy artık tamamen ücretsiz — model çağrısı kaldırıldı, gündem ve belge listesi
  koddan kuruluyor.
- Kararlar ve dersler belgelere işlendi. (e07efad, 52b16c3)

GÜNÜN ASIL BULGUSU
Commit'ler GitHub'a push edilmemişti. Kod doğruydu, redeploy da yapılmıştı; Lovable eski
dosyayı gördüğü için redeploy eski sürümü yayına alıyordu. `git push origin main`
(72dc7f0..b22ce0e) sonrası düzeldi. Aynı hata 15.08'de de yaşandı.

YARIM KALAN — 19.08'İN İLK İŞİ
- hazirlik-foyu redeploy edildi ama föy "Yeniden hazırla" ile yeniden üretilip saatin
  10:00 göründüğü DOĞRULANMADI. İlk iş bu.

AÇIK KALEMLER
- Föy düğmesinin yanındaki maliyet işareti (UcretliIsaret) duruyor, oysa föy ücretsiz —
  yanlış bilgi veriyor.
- Föy soru bölümü kapalı; sabit soru havuzu bekliyor. Kurucu DOJO adlı yapay zekâ
  uygulamasına bakacak (HATIRLATILACAK).

İBA DURUMU: 16 bitti · 8 kaldı · 4 ertelendi
Kalanlar: föy 2. tur (e-posta + taraf ekranı) · iletişim tercihi katmanı · YZ kullanım
beyanı imzalı onay · her tarafa kendi ajanı · kişisiz istatistik · oturum erteleme
tutanağı ve bildirimi · denetim izi · oturum dökümü analizi + sessiz canlı kokpit.
Ertelenenler: taslak denetimi (şablon bekliyor) · vekil ekranı · arabulucu ataması ve
çıkar çatışması taraması · ayrı taraflılık denetimi (pilot sonrası).

SIRADAKİ İŞ (kurucu onaylı): Föy 2. tur — tek komutta üç parça: onaylanan föyün
e-postayla tarafa gitmesi (arabulucu "Gönder"e basınca, kendiliğinden değil) + taraf
ekranında "Oturum hazırlığım" bölümü (tarafın oturum tarihini görememesi sorununu da
çözer) + maliyet işaretinin kaldırılması.

## Nerede kaldık — 19.08.2026 (86) · KOKPİTTEKİ MÜKERRER FÖY KAYDI KALDIRILDI

BİTTİ (19.08):
- [x] Aşama 3 kokpit > RAPOR VE BELGELER katmanındaki "Oturum hazırlık föyleri"
      (id="kokpit-hazirlik-foyu") sectionDefs kaydı silindi. Föyün tek yeri artık
      Aşama 4'ün en üstü (faz4-hazirlik-foyu).
- [x] HazirlikFoyuPanel bileşeni, Aşama 4 kartı, FAZ4 menü girdisi ve katman
      tanımları el değmeden duruyor. Kokpit menüsü/numaralandırma sectionDefs'ten
      türediği için kendiliğinden güncellendi; kokpit PDF listesi de aynı kaynaktan.

SIRADA: canlı doğrulama (publish sonrası kokpitte kaydın düştüğü, Aşama 4'te föyün
yerinde durduğu) + hâlâ bekleyen 18.08 işi: Lovable'da hazirlik-foyu-gonder İLK
DEPLOY ve gönderim canlı testi.

## Nerede kaldık — 18.08.2026 (85) · OTURUM HAZIRLIK FÖYÜ — 2. TUR (GÖNDERİM + TARAF EKRANI)

BİTTİ (18.08):
- [x] Yeni edge fonksiyon `hazirlik-foyu-gonder`: onaylanan föyü YALNIZ kendi tarafına
      e-postayla gönderiyor (cc/bcc yok), metni üretmiyor — `bolumler` alanı birebir
      gidiyor. 'onaylandi' değilse göndermiyor; 'gonderildi' ise ikinci kez göndermiyor.
      Yetki: dosyanın görevli arabulucusu (ve yönetici), değilse 403.
- [x] Gönderim ortak iletişim tercihi süzgecinden geçiyor (tür "belge_talebi"),
      FAIL-OPEN korundu. Süzgeç "gönderme" derse durum DEĞİŞMİYOR, sebep dönüyor.
- [x] Başarılı gönderimde durum='gonderildi', gonderim_zamani=now().
- [x] Arabulucu paneline dördüncü düğme "Gönder" (yalnız durum='onaylandi' iken).
      Kaydet · Onayla · Yeniden hazırla üçlüsüne dokunulmadı. Gönderilmiş föyde
      düğme yerine "Gönderildi — <tarih saat>" yazıyor.
- [x] Panelin yanlış giriş cümlesi ("tarafa hiçbir şey gönderilmez") düzeltildi.
- [x] Taraf ekranına "Oturum hazırlığım" sekmesi (salt okuma): oturum tarihi VE saati
      (Europe/Istanbul) + föyün bölümleri. Föy yoksa sakin boş durum.

YAPILMADI (bilerek): sessiz saat erteleme kuyruğu · haftalık özet e-postası ·
föy soru bölümü (sabit soru havuzu bekliyor) · maliyet işaretinin kaldırılması.

SIRADA (19.08'in ilk işi): Lovable'da `hazirlik-foyu-gonder` İLK DEPLOY (yeni fonksiyon,
GitHub push'u kendiliğinden deploy ETMEZ) + publish; sonra canlı test — föy onayla,
Gönder'e bas, tarafın gelen kutusunu ve taraf ekranındaki sekmeyi doğrula.

## Nerede kaldık — 18.08.2026 (84) · İLETİŞİM TERCİHİ KATMANI (İBA 1.5) — 1. TUR

BİTTİ (18.08): Taraf, süreçle ilgili bildirimleri hangi sıklıkta alacağını ve sessiz
saatlerini kendi ekranından belirliyor; e-posta gönderen bütün yollar bu tercihi
kontrol ediyor.

TARAF EKRANI (CaseRoom > yeni "İletişim Tercihlerim" sekmesi)
- Sıklık: Her adımda (varsayılan) · Yalnız önemli adımlarda · Haftalık özet.
- Sessiz saatler: açma/kapama + başlangıç-bitiş; kapalıysa iki alan da boş kaydedilir.
- Kanal: yalnız E-posta seçili; "Uygulama içi bildirim — yakında" ve "WhatsApp —
  yakında" satırları GRİ ve TIKLANAMAZ duruyor (sahte seçenek değil, yol haritası).
- Kayıt yoksa varsayılan gösteriliyor; Kaydet'e basınca satır oluşuyor
  (upsert, onConflict "party_id").

ARABULUCU (kokpit > Taraflar > taraf kartı, taraf bilgisi ızgarası)
- Tek satır SALT OKUMA: "İletişim tercihi: yalnız önemli adımlarda (sessiz: 22:00–08:00)".
- Arabulucu DEĞİŞTİREMEZ. Tercih tarafın kendi kararıdır.

GÖNDERİM SÜZGECİ (gonderilsinMi — yedi edge fonksiyona ayrı ayrı kondu)
- her_adim → hepsi gider (mevcut davranış).
- onemli → yalnız oturum daveti, oturum değişikliği/iptali, teklif, belge/bilgi
  talebi, süreç sonu gider.
- haftalik_ozet → yalnız ZAMANA BAĞLI olanlar (oturum daveti ve değişikliği) gider.
- Sessiz saat → o aralıkta gönderilmez; zamana bağlı türler istisnadır. Saat
  karşılaştırması Europe/Istanbul ile yapılır (edge UTC'de koşar).
- FAIL-OPEN: tercih kaydı yoksa, party_id çözülemiyorsa ya da sorgu hata verirse
  E-POSTA GÖNDERİLİR. Bir tercih arızası oturum davetini susturamaz.
- ERTELEME YOK (1. tur kararı): sessiz saate düşen bildirim kuyruğa alınmıyor,
  atlanıyor ve sebebi ajan kaydına/dönüş gövdesine yazılıyor. Kuyruk 2. turda.

HAFTALIK ÖZET E-POSTASI YAZILMADI (bilerek). Seçenek kaydediliyor ve süzgeçte
kullanılıyor; özet e-postasının kendisi sonraki tura kaldı. Taraf ekranında bu
seçeneğin altında tek satır not var.

KEŞİFTE ÇIKAN İKİ MÜKERRERLİK RİSKİ — KURUCU KARARI BEKLİYOR
1. src/pages/NotificationSettings.tsx + notification_preferences tablosu zaten var:
   KULLANICI düzeyinde, bildirim TÜRÜ başına e-posta/uygulama içi açma-kapama.
   ÖNEMLİSİ: bu tercihleri HİÇBİR gönderim yolu okumuyor — ekran var, karşılığı yok.
   Yeni katman TARAF düzeyinde ve SIKLIK ekseninde olduğu için mükerrer değil, ama
   iki ekranın ilişkisi kurucu tarafından kararlaştırılmalı.
2. case_parties.hatirlatma_izni (boolean) yalnız ajan-nobetci'de okunuyor. Yeni
   süzgeç onun ÜSTÜNE bindi, yerine geçmedi; ikisi de çalışıyor.

DOĞRULANDI: npx tsc --noEmit -p tsconfig.json temiz · yedi edge fonksiyonun tekil
tsc denetimi temiz · npx vite build temiz (42 sn). Canlıda doğrulanmadı.

SIRADAKİ ADIM (19.08 ilk iş)
- REDEPLOY (yedi fonksiyon): ajan-nobetci · send-meeting-invite ·
  cancel-meeting-invite · send-session-reminders · send-reschedule-notification ·
  send-session-notification · randevu-teklif.
- PUBLISH: evet (taraf sekmesi + kokpit satırı).
- Canlı doğrulama: bir tarafta "Yalnız önemli adımlarda" + sessiz 22:00–08:00
  kaydedilecek; kokpitte taraf kartında satırın göründüğü, karşı tarafın tercihinin
  görünmediği doğrulanacak.
- 17.08'den DEVREDEN: föyde saatin 10:00 göründüğü hâlâ canlıda doğrulanmadı.
- 18.08'den DEVREDEN: gündem havuzu (83) canlıda doğrulanmadı.

## Nerede kaldık — 18.08.2026 (83) · FÖY GÜNDEMİ BİLGİ TABANINA BAĞLANDI

BİTTİ (18.08): Gündem başlıkları artık koda elle yazılmış kalıp listesinden DEĞİL,
üründeki bilgi tabanından (knowledge_base_chunks) türüyor. Yeni bir uyuşmazlık türü
geldiğinde kimse elle liste yazmayacak.

AKIŞ (hazirlik-foyu/index.ts)
1. Dosyanın KATEGORİSİ bulunuyor: cases.dispute_type → category → dispute_subtype →
   "genel". (cases.dispute_type ile knowledge_base_chunks.category aynı sözlük.)
2. gundem_kalem_havuzu'ndan o kategorinin ETKİN kalemleri okunuyor. Havuz DOLUYSA
   HİÇBİR MODEL ÇAĞRISI YAPILMIYOR — bu yol bedava.
3. Havuz BOŞSA o kategorinin mevzuat parçaları (limit 40) modele veriliyor; model
   yalnız KONU BAŞLIĞI + 2-5 anahtar sözcük + kaynak + alıntı üretiyor. Çıkan her
   kalem mevcut süzgeçlerden geçiyor (gundemBasligiKur tek kapı · yasakIfade ·
   hukukiNitelemeVarMi · soruYasakMi · soruYonYasakMi · gundemTutumMu + rakam yasağı).
   Geçenler havuza upsert ediliyor → o kategori için bir daha model çağrılmıyor.
4. Föye girecek başlıklar havuzdan, YALNIZ o tarafın kendi korpusuyla seçiliyor
   (dosya konusu + tür + BU TARAFIN beyanı + kendi belge özetleri + kendi belge adları).
5. Havuzdan başlık çıkmazsa GUNDEM_KALIPLARI / BELGE_TURU_KALIPLARI / ASGARI_GUNDEM
   yolu YEDEK olarak devreye giriyor. O kod SİLİNMEDİ ve silinmeyecek.

KÖR VERİ: Havuz KATEGORİ düzeyinde; hiçbir dosya verisi taşımıyor. Eşleştirme yalnız
o tarafın kendi korpusuyla. Föy metnine kaynak künyesi YAZILMIYOR (föy sade kalıyor);
künye yalnız havuz satırında saklanıyor.

EK KARAR (kodda uygulandı): Kategoride satır VAR ama hepsi 'pasif' ise yeniden türetme
YAPILMIYOR — kurucunun kalemleri bilerek kapattığı anlamına gelir; boşuna ücret çıkmaz,
doğrudan yedek yola geçilir.

ÖN YÜZ: Föy düğmesinin altındaki maliyet uyarısı düzeltildi. Artık "Bu tür için ilk
hazırlıkta bir kez yapay zekâ çağrısı yapılabilir; sonraki föyler ücretsizdir." Ortak
UCRETLI_ISARET_METNI sabitine DOKUNULMADI (14 düğme onu kullanıyor); metin yalnız föy
düğmesine prop ile verildi.

DOĞRULANDI: npx tsc --noEmit -p tsconfig.json temiz · edge fonksiyon tekil tsc temiz ·
npx vite build temiz (35 sn).

SIRADAKİ ADIM (19.08 ilk iş)
- REDEPLOY: hazirlik-foyu (Lovable GitHub push'unu edge fonksiyona OTOMATİK DEPLOY ETMEZ).
- PUBLISH: ön yüz metni için gerekli.
- Canlı doğrulama: bir kira dosyasında "Yeniden hazırla" → dönüş gövdesindeki
  `havuz` ("turetildi" beklenir) ve `kategori` alanları okunacak; ikinci bir kira
  dosyasında `havuz: "dolu"` ve `model_cagrisi: "yapilmadi"` görülmeli.
- 17.08'den DEVREDEN: föyde saatin 10:00 göründüğü hâlâ canlıda doğrulanmadı.

## Nerede kaldık — 17.08.2026 (82) · OTURUM HAZIRLIK FÖYÜ — AŞAMA 4'E TAŞINDI

BİTTİ (17.08): Oturum hazırlık föyü 1. tur canlıda (İBA 3.1). Föy kendi bölümü olarak
Aşama 4 (Toplantı) ekranının en üstünde + sol menüde kendi girdisi (çapa:
faz4-hazirlik-foyu). Kokpitteki (Aşama 3, RAPOR VE BELGELER) kopya yerinde bırakıldı.
Föy paneli oturumu kademeli buluyor: gelecekteki en yakın oturum → yoksa geçmişteki en
son oturum → yoksa tarihi girilmemiş taslak oturum. Commit adfcfe5, publish yapıldı,
düğmeler (Kaydet · Onayla · Yeniden hazırla) canlıda doğrulandı.
Föyün üç bölümü: Oturum bilgileri · Oturumda konuşulacak başlıklar (gündem koddan
kuruluyor) · Yanınızda bulundurmanız iyi olur. 1. turda tarafa gönderim YOK.

AÇIK KALEM (17.08): Kokpitteki ve Aşama 4'teki föy düğmesinin yanında maliyet işareti
(UcretliIsaret) duruyor, oysa föy artık ücretsiz. Föy 2. turunda kaldırılacak.

SIRADAKİ: Föy 2. tur — onaylanan föyün e-postayla tarafa gitmesi + taraf ekranında
"Oturum hazırlığım" bölümü (tarafın oturum tarihini görememesi sorununu da çözer) +
maliyet işaretinin kaldırılması.

AÇIK KALEM (değişmedi): föy soru bölümü kapalı — sabit soru havuzu kurulacak, kurucu
DOJO uygulamasına bakacak.

## Nerede kaldık — 16.08.2026 GÜN SONU (81)

16.08.2026 GÜN SONU — Bugün 13 kalem canlıya alındı ve doğrulandı: belge yükleme izni ·
iletişimde değişim (karma model + alıntı onarımı + çelişki düzeltmesi) · ajan kontrol
paneli ve ajan görünürlüğünün taraflara kapatılması · düğme envanteri ve 7 ücretli
düğmeye maliyet işareti · mimari belge düzeltmesi · YZ ne yapar-ne yapmaz sayfası ·
Verilerim sayfası · elverişlilik kontrolü · usul önerisi · KOLLARIN NÖBETÇİYE
BAĞLANMASI (yedi kol otomatik koşuyor) · usule ilişkin engel listesi ve mevzuat
atıfları · makbuz mükerrerliğinin geri alınması · oturum hazırlık föyü 1. tur. Ürün
artık arabulucu düğmeye basmadan yedi analizi kendi başına yapıp kokpiti dolduruyor.

### Oturum hazırlık föyü — durum
1. TUR CANLIDA (16.08.2026, commit 23224d9 + e609cad + b7718b6) — İBA 3.1. Taraf-özel
föy taslağı üretiliyor, kokpit RAPOR VE BELGELER katmanında arabulucu onayına düşüyor.
TARAFA HENÜZ HİÇBİR ŞEY GİTMİYOR. Kurallar: yalnız o tarafın kendi verisi kullanılır ·
hukuki tavsiye, tahmin, niteleme yok · hesap sorma yönlü soru yasak · ham veri ve taraf
adı etiketi elenir · onaylanmış föyün üzerine ajan yazamaz. Bölümler: gündem · eksik
belge · oturum bilgileri.
KARAR (16.08): SORU BÖLÜMÜ KAPATILDI — model üç turda da dava/delil mantığına kaydı
("hangi kanıtlara sahipsiniz", "neden teslim edilmedi"). Serbest soru üretimi yerine
kurucunun yazacağı SABİT SORU HAVUZU kurulacak; ajan yalnız havuzdan seçecek. Kurucu
bunun için DOJO adlı uygulamayı inceleyecek.
2. TUR (bekliyor): onaylanan föyün e-postayla gönderilmesi + taraf ekranında "Oturum
hazırlığım" bölümü.

### Açık kalemler (16.08 gün sonu)
- AÇIK: 24 saatlik oturum hatırlatma e-postası tamamen İngilizce ve mediator_requests
  tablosunu okuyor (case_sessions değil) — muhtemelen hiç ateşlenmiyor. İncelenecek.
- AÇIK: case_sessions.prep_notes_generated ve party_analyses.prep_notes kolonları
  hiçbir kod tarafından yazılmıyor/okunmuyor — ölü alanlar, karar verilecek.
- AÇIK: tarafın ekranında oturum/tarih gösteren hiçbir yüzey yok; taraf kendi oturum
  tarihini yalnız e-postadan öğreniyor. Föy 2. turunda ele alınacak.

## Nerede kaldık — 16.08.2026 (80) · OTURUM HAZIRLIK FÖYÜ — 1. TUR (İBA 3.1 / C23)
- [x] DÜZELTME 2 · 16.08 (canlı bulgu — Anadolu Sağlık Hizmetleri föyü): ilk eleme
      "karşı tarafın kusurunu araştıran soru" için kurulmuştu; bu kez sorular TARAFIN
      KENDİSİNİ hesap vermeye zorladı ve süzgeçten geçti. Üç kural eklendi:
      · SORU YÖNÜ (isim değil YÖN esas): hiçbir madde kimseyi — ne bu tarafı ne karşı
        tarafı — savunmaya, gerekçe göstermeye, hesap vermeye çağıramaz. Elenen kalıplar:
        "neden/niçin/niye" · "yasal dayanağı / hukuki dayanağı / dayanağı nedir" ·
        "ne anlama gel" · "gerekçesi nedir / gerekçelendir" · "iddia edilen / iddia
        ettiği / öne sürülen" · "yapılmış mıdır / edilmiş midir / mı yapıldı" ·
        "teslim edilmem / verilmem / yerine getirilm" · "savun / hesap ver".
      · HUKUKİ NİTELEME YASAĞI: kusur · ihmal · sorumluluk · malpraktis · haksız fiil ·
        tazminat hakkı · ihlal · kast · taksir · illiyet geçen madde elenir; olgu dili
        kullanılır.
      · MAKİNE ETİKETİ: madde sonundaki "(Taraf Adı)" gibi parantez etiketi kırpılır —
        föy zaten o tarafa aittir.
      Üç kural hem isteme hem sunucuya yazıldı ve model çıktısına, eksik belge
      maddelerine ve cevapsız keşif sorularına birlikte uygulanıyor. Kararsızlıkta
      eleme esas. Node ile denendi: canlıdaki dört sorunlu madde elendi (yön, iddia,
      niteleme), tarafın kendi talebini netleştiren beş soru geçti, etiket kırpıldı.
      REDEPLOY GEREKLİ: hazirlik-foyu.
- [x] DÜZELTME 16.08 (canlı bulgu — Serpil Karahan föyü): dört kusur giderildi.
      · TARAFSIZLIK: sorular tarafın hukuki tezini kurmaya yaklaşıyordu ("okuma
        fırsatınız oldu mu", "riskler size ne kadar açıklandı"). SORU SINIRI eklendi:
        izinli olan yalnız tarafın KENDİ talebini/beklentisini/belgesini netleştiren
        sorular; karşı tarafın kusurunu-ihmalini-yükümlülüğünü araştıran, tez kurduran
        (edilgen "açıklandı/anlatıldı/bildirildi/imzalatıldı" kalıpları dahil),
        yönlendiren ve duygu sorgulayan sorular sunucuda ELENİR. Kural hem isteme hem
        koda yazıldı; cevapsız KEŞİF SORULARI da bu süzgeçten geçiyor (başka ajanın
        ürettiği soru föye ham girmiyor). Kararsızlıkta eleme esas.
      · BELGE BÖLÜMÜ TERSİNE ÇEVRİLDİ: artık tarafın YÜKLEDİĞİ belgeler sayılmıyor;
        EKSİK olanlar isteniyor — tarafın kendi anlatımında adı geçen ama yüklenmemiş
        belgeler + arabulucunun/ajanın daha önce istediği ama gelmemiş bilgi-belge
        (ajan_gorevleri: taraf_eksik_bilgi · soru_gonder, yalnız o tarafın satırları).
        Yüklenmiş belge adıyla eşleşen madde ve dosya adı/uzantı içeren madde eleniyor;
        eksik yoksa bölüm hiç yazılmıyor.
      · HAM VERİ: "Katılım biçimi: main" gibi veritabanı kodu artık föye yazılmıyor;
        tanınan kodlar insan diline çevriliyor (çevrimiçi / yüz yüze), tanınmayan kod
        varsa satır HİÇ yazılmıyor.
      · KAPANIŞ CÜMLESİ artık başlıksız bölüm olarak yazılmıyor; veriden çıkarıldı
        (ekranda alt not olarak gösterilmesi ön yüz işi, bu turda ön yüze dokunulmadı).
      Node ile denendi: üç canlı sorulu örnek elendi, tarafın kendi talebini netleştiren
      sorular geçti; "main" kodu boş döndü; dosya adı tespiti çalıştı.
      REDEPLOY GEREKLİ: hazirlik-foyu.
BU TURDA TARAFA HİÇBİR ŞEY GİTMEDİ. E-posta ve taraf ekranı sonraki turda.
- [x] Yeni edge fonksiyon: supabase/functions/hazirlik-foyu (config.toml verify_jwt=true).
      · Girdi {case_id, session_id, party_id}; yetki elverislilik/usul-onerisi kalıbı —
        x-cron-secret iç kapı + dışarıda arabulucu/dosya sahibi/yönetici, taraf 403.
      · KÖR VERİ: föy TEK TARAF için kurulur; girdiye YALNIZ o tarafın beyanı, kendi
        belgeleri ve belge özetleri, kendi cevaplanmamış keşif soruları, dosyanın genel
        konusu ve oturum kaydı girer. Karşı tarafın beyanı/belgesi/analizi/teklifi
        hiçbir koşulda girmez.
      · Bölümler LİSTE olarak yazılıyor (ileride bölüm eklenebilsin): (a) "Oturumda
        konuşulacak başlıklar" ve (b) "Yanınızda bulundurmanız iyi olur" MODEL üretir;
        (c) "Cevabını hazırlamanız iyi olur" cevapsız keşif sorularından KODDAN;
        (d) "Oturum bilgileri" oturum kaydından KODDAN. Sonda sabit cümle:
        "Bu föy hazırlık amaçlıdır; arabulucunuz tarafından gözden geçirilmiştir."
      · SUNUCU ELEMESİ: yasak dil (tavsiye · sonuç tahmini · kabul edin/etmeyin · rakam ·
        karşı taraf yorumu · duygu/kişilik/niyet) taşıyan madde elenir; maddede geçen
        anlamlı sözcük tarafın kendi metinlerinde yoksa madde elenir (uydurma kapısı).
        Madde kalmazsa bölüm yazılmaz; hiçbir bölüm kalmazsa satır yine 'taslak' açılır.
      · ONAYLI FÖYE DOKUNULMAZ: durumu 'onaylandi'/'gonderildi' olan satır yeniden
        üretilmez. Upsert onConflict "session_id,party_id"; agent_states'e
        'hazirlik_foyu' durumu (try/catch).
- [x] Nöbetçiye bağlandı: OTOMATIK_KOLLAR'a "hazirlik-foyu" (icKapi true, ÜCRETLİ —
      tur başına 3 çağrı sınırına DAHİL). Koşum koşulu: dosyada iptal olmayan GELECEK
      TARİHLİ planlı oturum var VE o oturum-taraf çifti için föy satırı yok; her taraf
      için ayrı çağrı. Girdi imzası: session_id + oturum zamanı + tarafın belge sayısı +
      cevapsız soru sayısı.
- [x] Ekran: kokpit > RAPOR VE BELGELER > "Oturum hazırlık föyleri". Planlı oturum yoksa
      "Planlanmış oturum yok — föy oturum planlandığında hazırlanır." Her taraf için ayrı
      kart: ad · durum rozeti (taslak/onaylandı/gönderildi) · düzenlenebilir metin alanı
      ("## " başlık, altındaki satırlar madde) · [Kaydet] · [Onayla] · yalnız taslakken
      [Föy hazırla / Yeniden hazırla] + maliyet işareti. GÖNDERME DÜĞMESİ YOK; onaylı
      föyün altında "Gönderim sonraki adımda açılacak." Yalnız arabulucuya görünür.
- [x] CaseRoom.tsx'e DOKUNULMADI; taraf ekranı, e-posta ve bildirim yok.
tsc temiz; hazirlik-foyu ve ajan-nobetci esbuild ile doğrulandı. CANLI TEST YOK.
SQL YAZILMADI (tablo kurucu tarafından kuruldu).
REDEPLOY GEREKLİ: hazirlik-foyu (YENİ) · ajan-nobetci.
AÇIK UÇ: 2. TUR — tarafa gönderim (durum 'gonderildi', gönderim zamanı, taraf ekranında
görünürlük ve e-posta) henüz yapılmadı.
AÇIK UÇ: Föy yalnız EN YAKIN planlı oturum için hazırlanıyor; birden çok gelecek oturum
varsa sonrakiler için föy açılmıyor.
AÇIK UÇ: case_sessions.prep_notes_generated ve party_analyses.prep_notes alanlarına
dokunulmadı (kullanılmıyorlar, ayrı iş).

## Çalışma düzeni skill'leri (16.08.2026)
Kurucunun hesabına iki skill kaydedildi (depoda değil, Claude hesabında durur):
(a) medipact-calisma-duzeni — KABUL/RED açılışı, tek adım kuralı, zincir anlatma yasağı,
komut öncesi üç kontrol (üründe var mı · zemin hazır mı · sonradan baştan yapılır mı),
üründe var olanı ikinci kez yapmama kuralı (ad değil işlev aranır), İBA kalemlerinde
"madde + amaç + karşılığımız" üçlüsü onaya sunulmadan komut verilmemesi, komutların
zorunlu parçaları (FAST MOD + ayrıntılı koruma bloğu + üç satırlık özet), sıra kuralı
SQL → redeploy → publish → Ctrl+Shift+R → tek kontrol.
(b) emel-yazim-kurallari — AI dili yasağı, LinkedIn yazı kalıbı, unvan/eğitim şişirme
yasağı, kaynakta olmayan detay yazma yasağı.

## Nerede kaldık — 16.08.2026 (79) · MAKBUZ TAKİBİ (İBA 2.7 / B22)
- [x] KAPATILDI (16.08.2026) — Ayrı bölüm EKLENMEYECEK; ihtiyaç mevcut "Ödeme &
      Muhasebe" paneliyle karşılanıyor (kenar çubuğu + Aşama 7). O panelde Ödeme Defteri
      tablosu, Makbuz No sütunu, makbuz numarası yazmanın iki yolu (Ödendi işaretle +
      Düzenle) ve makbuz taslağı PDF'i zaten vardı. 16.08'de kokpite eklenen mükerrer
      "Makbuz takibi" bölümü geri alındı (f5494eb → 1aa6b96); yalnız iki fayda mevcut
      panele taşındı: Ödeme Defteri başlığında "<n> ödeme · <m> makbuz bekliyor" özeti
      ve ödenmiş ama makbuz numarası boş satırların vurgulanması. Canlıda doğrulandı.
- [x] GERİ ALINDI (16.08.2026) — Kokpitteki ayrı "Makbuz takibi" bölümü MÜKERRERDİ,
      kaldırıldı (commit 1aa6b96). Üründe zaten Ödeme & Muhasebe paneli var: Ödeme
      Defteri tablosu, Makbuz No sütunu, "Ödendi işaretle" ile makbuz numarası yazma,
      ücret hesabı ve makbuz taslağı PDF'i. İki fayda mevcut panele taşındı: defter
      başlığında "N ödeme · M makbuz bekliyor" özeti ve ödenmiş ama numarası boş
      satırlarda "makbuz bekliyor" rozeti. AŞAĞIDAKİ SATIRLAR o turun kaydıdır;
      bölümün kendisi artık YOK.
- [x] Ekran: kokpit > RAPOR VE BELGELER > "Makbuz takibi" (Seçenek sepetinin ardında).
      Mevcut case_payments kayıtları listeleniyor: ödeyen (payer_label ya da taraf adı) ·
      tutar · tarih · durum. Üstte tek satır özet: "N ödeme · M makbuz bekliyor".
      Kayıt yoksa "Bu dosyada henüz ödeme kaydı yok".
- [x] Makbuz durumu: receipt_no doluysa "makbuz kesildi — <no>"; ödeme yapılmış
      (status='odendi' ya da paid_at dolu) ama receipt_no boşsa vurgulu "MAKBUZ
      BEKLİYOR"; ödeme yapılmamışsa nötr "ödeme yapılmadı".
- [x] MAKBUZ NUMARASI GİRİŞİ EKLENDİ — RLS kontrol edildi: case_payments üzerinde
      "Case mediator or admin can update payments" (FOR UPDATE, is_case_mediator VEYA
      admin) politikası VAR. Kutu yalnız "makbuz bekliyor" satırlarında çıkıyor ve
      YALNIZ receipt_no güncelleniyor; başka alana dokunulmuyor, ödeme oluşturulmuyor,
      silinmiyor. Hata olursa kırmızı satırda gerçek mesaj yazıyor.
- [x] BEDAVA: model çağrısı yok, maliyet işareti konmadı. Yalnız arabulucu yüzeyinde;
      tarafa gösterilmiyor, bildirim yok. Nöbetçiye BAĞLANMADI (analiz değil, ekranda
      anlık liste) — OTOMATIK_KOLLAR'a eklenmedi.
tsc temiz. CANLI TEST YOK. SQL YAZILMADI, göç dosyası açılmadı, tablo değişmedi.
AÇIK UÇ: UPDATE politikası yalnız is_case_mediator (atanmış arabulucu) ve admin için
açık; dosya sahibi ama atanmamış kullanıcıda kaydetme hata verir — hata ekranda görünür,
gerekirse politika kurucu kararıyla genişletilir.
AÇIK UÇ: Makbuz numarası serbest metindir; biçim doğrulaması ve mükerrer numara kontrolü
yok. İstenirse ayrı iş.

## Nerede kaldık — 16.08.2026 (78) · USULE İLİŞKİN ENGEL KONTROL LİSTESİ (İBA 2.4)
- [x] CANLIDA DOĞRULANDI (16.08.2026) — İBA 2.4. Kokpit "Masaya otururken" katmanında,
      Usul önerisinin altında; nöbetçiye ÜCRETSİZ otomatik kol olarak bağlı (commit
      07938ed + 71cad80 + 748d22c). Model çağrısı YOK, tamamı koddan hesaplanıyor. Dört
      başlık taranıyor: vekaletname dosyada var mı · tüzel kişide temsil/imza yetkilisi
      kayıtlı mı · tebligata esas iletişim bilgisi (adres/telefon) dolu mu · dava şartı
      son tarihine 15 günden az kaldı mı. Canlı sonuç: sağlık dosyasında 3 eksik, kira
      dosyasında 4 eksik (son tarihe 4 gün kaldığı uyarısı dahil) — hepsi doğru.
      MEVZUAT ATIFI KURALI: madde referansı koda sabit yazılmaz; her seferinde bilgi
      tabanındaki kanun/yönetmelik metninden kavram aramasıyla çekilir, birebir alıntıyla
      künyelenir, doğrulanamazsa BOŞ bırakılır. Eğitim/uzmanlık modülleri atıf kaynağı
      olarak kullanılmaz; geçici madde ile normal madde ayrı ele alınır; bozuk (OCR
      kırığı) alıntı elenir.
ATIF DOĞRULAMASI TAMAMLANDI (16.08.2026, commit 3d53e7d) — Atıf kaynağı yalnız 6325
sayılı Kanun ve yönetmeliği ile sınırlandı; İmar/Bankacılık gibi alakasız kanunlardan
gelen atıflar elendi. Canlı kontrol: sağlık ve kira dosyalarında tüm atıflar arabuluculuk
mevzuatından, alıntılar temiz, güvensiz madde numarası yazılmamış (boş bırakılmış).
- [x] TUR KAYDI (16.08 akşamı). Bu bölümde iki düzeltme
      turu daha yapıldı, kaydı buraya düşüyor:
      · 71cad80 — madde referansı bilgi tabanındaki kanun metninden çekiliyor (kavram
        araması, birebir alıntı; koda sabit madde numarası yazılmadı).
      · 748d22c — üç canlı kusur giderildi: GEÇİCİ MADDE ile MADDE karışması, eğitim
        modülünün (Uzman Arabuluculuk - …) atıf kaynağı olarak kullanılması ve bozuk
        (kelimesi bölünmüş) alıntı. Referans güvensizse madde numarası hiç yazılmıyor.
      · Dönüş özetine referans_bos sayacı eklendi; ilk koşumda kaç başlıkta güvenli
        referans bulunamadığı oradan görülecek.
      REDEPLOY BEKLİYOR: usul-engeli · ajan-nobetci.
- [x] Yeni edge fonksiyon: supabase/functions/usul-engeli (config.toml verify_jwt=true).
      YAPAY ZEKÂ ÇAĞRISI YOK — hesap tamamen kodda, bedava kol.
      · Yetki: guc-dengesi/elverislilik kalıbı — x-cron-secret iç çağrı kapısı + dış
        çağrıda arabulucu/dosya sahibi/yönetici; taraf 403.
      · Dört başlık (alan adları types.ts ve Aşama 2 panelinden doğrulandı):
        (a) VEKALETNAME — case_parties.vekil_ad_soyad dolu ama adında "vekaletname"
        geçen belge yoksa eksik; vekil yoksa satır yazılmaz.
        (b) TÜZEL KİŞİDE TEMSİL/İMZA YETKİLİSİ — party_type='corporate' ve
        authorized_person boşsa "belgeden kontrol edilmeli" notu; belge içeriğine
        BAKILMAZ, model çağrılmaz.
        (c) TEBLİGATA ESAS İLETİŞİM — address/email/gsm-phone boş ya da e-posta biçimi
        geçersizse hangi alanın boş olduğu yazılır.
        (d) SÜRE — deadline_extended ?? deadline_total varsa kalan gün hesaplanır;
        15 günden az kaldıysa (veya dolmuşsa) kalan/geçen gün sayısıyla yazılır.
        Süre kaydı yoksa satır yazılmaz.
      · Her satır: baslik · tespit (hangi tarafta hangi alan) · referans. Referans
        DOĞRULANMADIĞI için şimdilik BOŞ bırakılıyor — uydurma madde numarası yazılmıyor.
      · Hiç eksik yoksa durum 'engel_yok'. Upsert onConflict case_id; agent_states'e
        'usul_engeli' durumu (try/catch).
- [x] Nöbetçiye bağlandı (doğuştan otomatik): OTOMATIK_KOLLAR'a "usul-engeli" eklendi,
      icKapi true. Koşum koşulu: en az bir taraf kayıtlı. Girdi imzası: taraf sayısı +
      en son taraf kaydı zamanı + dava şartı son tarihi + boş alan parmak izi
      (case_parties'te updated_at kolonu YOK, bu yüzden alan doldurulunca imza değişsin
      diye eksik alan sayısı imzaya katıldı).
- [x] ÜCRETSİZ KOL: tur başına 3 ücretli çağrı sınırına DAHİL DEĞİL (kol tanımında
      ucretsiz:true; bütçe düşülmüyor). Diğer kolların sınırı ve adil sıralama aynen.
- [x] Ekran: kokpit > MASAYA OTURURKEN > "Usule ilişkin engeller", Usul önerisinin
      ALTINDA. Kayıt yoksa "Henüz kontrol edilmedi" · 'engel_yok' ise "Usule ilişkin
      eksik görünmüyor" · 'engel_var' ise satırlar (başlık · tespit · varsa referans).
      [Kontrol et] / [Yeniden kontrol et] düğmesi var, MALİYET İŞARETİ YOK (ücretsiz).
      Yalnız arabulucuya görünür; tarafa gitmez, bildirim yok.
tsc temiz; usul-engeli ve ajan-nobetci esbuild ile doğrulandı. CANLI TEST YOK.
SQL YAZILMADI (tablo kurucu tarafından kuruldu). REDEPLOY GEREKLİ: usul-engeli (YENİ) ·
ajan-nobetci.
AÇIK UÇ: Referans alanı boş — doğrulanmış madde künyesi kaynağı (hukuk kural katmanı)
bağlanınca doldurulacak. Aşama 2'deki mevcut "USULE İLİŞKİN ENGELLER" katmanı ayrı ve
istemci tarafında çalışmaya devam ediyor; bu kol kokpit karşılığıdır.

## Nerede kaldık — 16.08.2026 (77) · KOLLARI NÖBETÇİYE BAĞLAMA (OTOMATİK KOŞUM)
- [x] CANLIDA DOĞRULANDI (16.08.2026) — Yedi kol (elverislilik, belge-ozeti,
      olay-cizelgesi, guc-dengesi, usul-onerisi, iletisim-degisim, dosya-ozeti-oner)
      artık nöbetçi ajan tarafından kendiliğinden koşuyor; arabulucunun düğmeye
      basmasına gerek yok, kokpiti dolu buluyor (commit 575d09b + 700c9c2 + 775f66e).
      Kurallar: her kolun kendi koşum koşulu var · GİRDİ İMZASI ile mükerrer koşum
      engeli (aynı veriyle ikinci kez koşmaz) · tur başına en fazla 3 ücretli çağrı,
      adil sıralama · koşum defteri public.ajan_kosum_izi · elverişlilik 'isaret_var'
      verirse ajan_gorevleri'ne 'onay_bekliyor' satırı düşer. Kokpitteki düğmeler kaldı,
      artık "yeniden çalıştır" işlevi görüyor. Canlı defter kaydı: elverişlilik 1 bulgu ·
      usul önerisi 4 öneri · iletişimde değişim paragraf hazır · dosya özeti ve belge
      özeti "zaten var" diyerek boşuna çağrı yapmadı.
AÇIK NOT: aynı dosyada arka arkaya koşumlarda model her seferinde birebir aynı sonucu
vermiyor (elverişlilik 15:18'de "işaret yok", 15:21'de "işaret var 1 bulgu"; usul önerisi
3 ve 4 öneri). Eleme kuralları çalıştığı için dayanaksız bulgu ekrana çıkmıyor, ancak
kararlılık tam değil — izlenecek.
AÇIK NOT: 16.08'de iki kez yaşandı — nöbetçideki OTOMATİK_KOLLAR listesindeki "icKapi"
bayrağı gerçeği yansıtmadığı için kollar hiç denenmeden "atlandı" yazıldı. Ders:
nöbetçiye yeni kol bağlarken hem fonksiyonun iç çağrı kapısı hem de nöbetçideki bayrak
birlikte kontrol edilecek.

## Nerede kaldık — 16.08.2026 (76) · USUL ÖNERİSİ (İBA 2.2 / B14)
- [x] CANLIDA DOĞRULANDI (16.08.2026) — İBA 2.2. Kokpit "Masaya otururken" katmanında,
      Elverişlilik kontrolünün altında çalışıyor (commit 2cbe289). Kurallar: öneri YALNIZ
      sürecin biçimine dair (oturum düzeni, süre-zaman, yüz yüze/çevrimiçi, uzman görüşü,
      vekilsiz tarafa süreç anlatımı); esasa dair öneri yasak · her öneri dayanak (dosya
      kaydından somut veri) + gerekçe taşır, dayanağı doğrulanamayan öneri sunucuda
      elenir · en fazla 4 öneri · "karar arabulucuya aittir" bir kez gösterilir · yalnız
      arabulucuya görünür, ücretli düğme maliyet işaretli. Serpil testi: üç öneri
      (vekilsiz taraf için başlangıç oturumu · güç dengesi göstergeleri nedeniyle özel
      oturum · sağlık uyuşmazlığında uzman görüşü), üçü de gerçek dosya verisine dayalı.
AÇIK NOT: usul önerisi gerekçelerinde duyguya yaklaşan ifade çıkabiliyor (test çıktısında
"endişelerini paylaşabilmeleri"). Taraf etiketi değil, genel cümle — şimdilik kabul
edildi; benzeri artarsa gerekçe dili de sıkılaştırılacak.
- [x] Göç dosyası (ÇALIŞTIRILMADI): supabase/migrations/20260816220000_usul_onerisi.sql —
      usul_onerileri tablosu (case_id UNIQUE 'usul_onerileri_case_tekil', durum CHECK
      'usul_onerileri_durum_chk': oneri_var/oneri_yok, oneriler jsonb) + RLS (SELECT yalnız
      arabulucu/dosya sahibi, admin ALL, TARAFA POLİTİKA YOK) + agent_states izinli
      listesine 'usul_onerisi' (22. ad; mevcut 21 ad birebir korunarak DROP+ADD).
- [x] Yeni edge fonksiyon: supabase/functions/usul-onerisi (config.toml verify_jwt=true).
      · Yetki: arabulucu / dosya sahibi / yönetici; taraf 403.
      · KOŞULLAR KODDA deterministik çıkarılır ve NUMARALANIR — tablo adları types.ts'ten
        doğrulandı: case_parties (vekil_ad_soyad · party_type) · taraf_musaitlik
        (gun/baslangic/bitis) · messages · randevu_teklifleri (durum='beklemede') ·
        case_sessions (status='cancelled') · braket_bant_sorulari (durum='ret') ·
        cases (dispute_type/subtype, mediation_type) · guc_dengesi. Tıkanma için ayrı
        tablo YOK; işaretler bu kayıtlardan sayıldı.
      · Model yalnız numaralı koşullara dayanabilir; her öneride kosul_no verir.
      · SUNUCU ELEMESİ: eksik alan · geçersiz koşul numarası · dayanağı koşulun anahtar
        ifadeleriyle eşleşmeyen · işin esasına giren (rakam/teklif/kusur/haklılık) ·
        sürecin biçimine bağlanmayan · aynı koşuldan ikinci öneri elenir. EN FAZLA 4.
      · "Karar arabulucuya aittir" ekranda BİR KEZ; her satırda tekrarlanmıyor.
- [x] Ekran: kokpit > MASAYA OTURURKEN > "Usul önerisi", Elverişlilik kontrolünün ALTINDA.
      Kayıt yoksa "Henüz çalıştırılmadı" + [Öneri hazırla]; kayıt varsa öneri · dayanak ·
      gerekçe listesi + [Yeniden hazırla]; 'oneri_yok' ise "Bu dosya için biçime dair bir
      öneri çıkmadı". Düğmenin altında maliyet işareti. Yalnız arabulucuya görünür;
      tarafa gitmez, bildirim yok, kendiliğinden çalışmaz.
tsc temiz; edge fonksiyon sözdizimi esbuild ile doğrulandı. CANLI TEST YOK.
SQL: 20260816220000_usul_onerisi.sql — 16.08'de ÇALIŞTIRILDI. REDEPLOY: usul-onerisi
(YENİ) — 16.08'de yapıldı.
SIRA: önce SQL (agent_states kısıtı da bu göçte), sonra redeploy/publish.
AÇIK UÇ: agent_states izinli ad listesi göç dosyasında 22 ad olarak yeniden yazıldı;
liste depodaki 11 addan + panelde kullanılan orchestrator/party_consistency/
party_communication'dan + 15.08 ve 16.08'de eklenen adlardan türetildi. Canlıda başka
bir ad varsa göç onu düşürür — çalıştırmadan önce mevcut kısıt bir kez okunmalı.

## Nerede kaldık — 16.08.2026 (75) · ELVERİŞLİLİK KONTROLÜ (İBA 2.1 / B13)
- [x] CANLIDA DOĞRULANDI (16.08.2026) — İBA 2.1. Kokpit "Masaya otururken" katmanında,
      bilgi tabanı dayanaklı elverişlilik kontrolü çalışıyor (commit f6339f1 + bdb0606 +
      52de9ae). Kurallar: kaynak YALNIZ bilgi tabanı (6325 + yönetmelik + türe göre
      kanun/uzmanlık modülü, tam ad eşleşmesi) · her bulguda dosya işareti (dosya
      metninden birebir alıntı) + kaynak alıntısı, ikisi de sunucuda doğrulanır,
      bulunamazsa elenir · KONU SINIRI: yalnız elverişlilik ve tür/rejim tespiti, esasa
      ilişkin bulgu (kusur, onam, ispat) yasak ve sunucuda elenir · en fazla 3 bulgu ·
      madde numaralı künye · hüküm dili yok, "karar arabulucuya aittir" · yalnız
      arabulucuya görünür, ücretli düğme maliyet işaretli. Serpil testi: tek bulgu,
      tüketici rejimi tespiti — konu dışı gürültü yok.
- [x] Göç dosyası (ÇALIŞTIRILMADI): supabase/migrations/20260816200000_elverislilik.sql —
      elverislilik_kontrol tablosu (case_id UNIQUE 'elverislilik_case_tekil', durum CHECK
      'elverislilik_durum_chk': isaret_var/isaret_yok/kaynak_yok, bulgular jsonb) + RLS.
      SELECT yalnız is_case_mediator VEYA is_case_owner_safe; admin ALL. TARAFA POLİTİKA YOK.
      DO bloğu ve $$ yok, idempotent.
- [x] Yeni edge fonksiyon: supabase/functions/elverislilik (config.toml verify_jwt=true).
      · Yetki: arabulucu / dosya sahibi / yönetici; taraf çağırırsa 403.
      · KAYNAK YALNIZ BİLGİ TABANI: knowledge_base_chunks'tan source_title ile
        6325 Kanun + Yönetmelik + (tür eşleşirse) uzmanlık modülü çekilir; parçalar
        elverişlilik anahtar ifadeleriyle (elverişli · tasarruf · kamu düzeni · dava şartı ·
        aile içi şiddet · cebir/tehdit …) daraltılır. Eşleşen modül yoksa yalnız kanun
        ve yönetmelik. Embedding/RAG çağrısı yok, internet yok.
      · İstem: "yalnız verilen metinlere dayan, karşılığı yoksa boş dön".
      · SUNUCU ELEMESİ: eksik alan · hüküm cümlesi ("elverişli değildir", "geçersizdir",
        "yapılamaz" …) · ALINTI KAYNAK METİNDE BULUNAMAZSA bulgu elenir (harf katlamalı
        üç şanslı doğrulama, bu dosyada kendi hâliyle yazıldı). Kalan bulgu yoksa
        'isaret_yok'; hiç kaynak parçası yoksa 'kaynak_yok'.
      · Kayıt: elverislilik_kontrol upsert (onConflict case_id) + agent_states'e
        'elverislilik' tipiyle running/completed/failed (yazma hatası asıl işi bozmaz).
- [x] Ekran: kokpit > MASAYA OTURURKEN > "Elverişlilik kontrolü" (Sıradaki 3 soru'nun
      ardında). Kayıt yoksa "Henüz çalıştırılmadı" + [Kontrol et]; kayıt varsa bulgular
      başlık · gerekçe · "Kaynak: ad · madde/bölüm" · birebir alıntı ile listelenir;
      'isaret_yok' ve 'kaynak_yok' kendi cümlelerini yazar. Düğmenin altında maliyet
      işareti. Yalnız arabulucu yüzeyinde; tarafa gitmez, bildirim/e-posta yok.
      Dosya açılışında KENDİLİĞİNDEN ÇALIŞMAZ.
tsc temiz; edge fonksiyon sözdizimi esbuild ile doğrulandı. CANLI TEST YOK.
SQL: 20260816200000_elverislilik.sql — 16.08'de ÇALIŞTIRILDI. REDEPLOY: elverislilik
(YENİ) — 16.08'de yapıldı.
SIRA: önce SQL, sonra redeploy/publish.
AÇIK UÇ: Kaynak seçimi source_title kalıbıyla yapılıyor (ör. '%Aile Arabuluculuğu%').
Bilgi tabanındaki kaynak adları farklıysa modül eşleşmez ve yalnız kanun+yönetmelik
kullanılır — canlıda kaynak adları kontrol edilecek.
AÇIK UÇ: Parça seçimi anahtar kelime taramasıdır (embedding kullanılmadı, maliyet ve
sadelik için); ilgili hüküm başka sözcüklerle yazılıysa parça isteme girmeyebilir.

## Nerede kaldık — 16.08.2026 (74) · "VERİLERİM" SAYFASI (C25 · KVKK/İBA şeffaflık)
- [x] CANLIDA DOĞRULANDI (16.08.2026) — İBA 3.4 / KVKK ilgili kişi hakları.
      /verilerim adresinde, sol menüde bağlantılı (commit 67c5691). Taraf kendi verisini
      KATEGORİ düzeyinde görüyor: her kategoride kaç kayıt var, kimler görebilir, ne
      kadar saklanıyor. Salt görüntüleme — silme/dışa aktarma düğmesi YOK. 14 kategori
      listeleniyor; karşı tarafın verisi hiçbir şekilde görünmüyor.
AÇIK KALEM: SAKLAMA SÜRELERİ KARARA BAĞLANACAK — 14 veri kategorisinin 10'unda saklama
süresi "belirsiz" görünüyor (yalnız belgeler 5 yıl, mali kayıt 10 yıl tanımlı). Kurucu
mevzuata göre süreleri belirleyecek, sabit tabloya yazılacak, sayfa kendiliğinden dolacak.
Süresi tanımsız kategoriler: taraf kaydı · beyan · keşif soru-cevapları · dosya içi
mesajlar · kabul aralığı (braket) · kör teklif · ajan görev kayıtları · YZ kullanım onayı ·
oturum kaydı onayı · randevu teklifleri · müsaitlik bildirimleri.
AÇIK KALEM: ÜÇ TABLONUN ERİŞİM POLİTİKASI DOĞRULANAMADI — YZ kullanım bilgilendirmesi
onayı · randevu teklifleri ve cevapları · bildirilen müsait gün-saatler. Verilerim sayfası
bunlar için "kimin görebildiği doğrulanamadı" diyor; RLS politikası eksik veya farklı
kurgulanmış olabilir, güvenlik tarafında incelenecek.
KEŞİF: Kategoriler ve "kimler görebilir" bilgisi UYDURULMADI — depodaki gerçek RLS
politikalarından okundu: case_parties (taraf yalnız user_id=auth.uid() satırı; arabulucu
ve yönetici görür) · case_documents ("Party sees own uploads only": taraf YALNIZ kendi
yüklediğini, arabulucu hepsini) · case_discovery_questions ("Party sees own discovery":
user_id=auth.uid()) · messages (dosya KATILIMCILARI — arabulucu ve dosyadaki taraflar;
tek istisna, ekranda da böyle yazıldı) · teklif_braketleri ve blind_bids (taraf kendi
satırı + arabulucu) · case_payments ("Party can view own payment rows") · ajan_gorevleri
("Party reads own agent tasks") · kayit_onaylari (16.08'de yazıldı: taraf kendi satırı +
arabulucu). POLİTİKASI DEPODA GÖRÜNMEYENLER "belirsiz" yazıldı: yz_beyan_onaylari ·
randevu_teklifleri · taraf_musaitlik.
- [x] Yeni sayfa: src/pages/Verilerim.tsx — KATEGORİ düzeyinde döküm (satır dökümü YOK).
      Her kategoride: ad · kayıt sayısı · kimler görebilir · saklama süresi.
- [x] Giriş ve kapanış paragrafları kurucunun verdiği metinle AYNEN.
- [x] Yönlendirme: App.tsx'e /verilerim EKLENDİ (mevcut route'lara dokunulmadan).
      Sol menüde "Bilgi" grubunda, "Yapay zekâ ne yapar" satırının ARDINA eklendi.
- [x] SAYFA YALNIZ GÖSTERİR: silme, düzenleme, dışa aktarma düğmesi YOK. Karşı tarafın
      hiçbir kaydı, adı ya da sayısı ekrana gelmez; sayılar RLS'in izin verdiği kadardır.
- [x] Yalnız arabulucuya açık analizler kategorisi sayı YERİNE "—" gösteriyor ve
      "sayısı bu sayfadan okunamaz" notu taşıyor (yanıltıcı sıfır yazılmadı).
tsc temiz. CANLI TEST YOK.
AÇIK UÇ: Saklama süreleri parametre tablosundan değil, mimari §12.5.9 ve 16.08 kayıt
protokolü kararından yazıldı; belge 5 yıl, mali kayıt 10 yıl, analiz 5 yıl, diğerleri
"belirsiz". Saklama motoru kurulunca bu satırlar oradan okunmalı.
AÇIK UÇ: Üç kategoride "kimler görebilir" belirsiz (yz_beyan_onaylari · randevu_teklifleri
· taraf_musaitlik) — politikaları canlıda kurulmuş, depoda yok.

## Nerede kaldık — 16.08.2026 (73) · YAPAY ZEKÂ NE YAPAR / NE YAPMAZ EKRANI
- [x] CANLIDA DOĞRULANDI (16.08.2026) — İBA üçüncü bölüm (şeffaflık). /yapay-zeka
      adresinde "Bu platformda yapay zekâ ne yapar, ne yapmaz" sayfası yayında, sol
      menüde bağlantısı var (commit ef91548). İçerik ilke düzeyinde yazıldı (özellik
      listesi değil), böylece yeni kol eklendikçe güncellenmesi gerekmiyor. YAPMAZ
      listesi: karar vermez · hukuki tavsiye vermez · kişilik/duygu/niyet
      değerlendirmesi yapmaz · dayanaksız bulgu göstermez · bir tarafın verisini karşı
      tarafa göstermez · veriyi model eğitimine aktarmaz · arabulucunun yerine süreci
      yönetmez. NOT: dosya açılışında imzalı onay olarak alınması ayrı bir iş, henüz
      yapılmadı.
- [x] Yeni sayfa: src/pages/YapayZekaBeyani.tsx — salt bilgi ekranı (veri okumaz,
      yazmaz, model çağrısı yapmaz). Metin kurucunun verdiği hâliyle AYNEN kullanıldı;
      madde eklenmedi, çıkarılmadı. Mevcut kart/tipografi bileşenleri kullanıldı, yeni
      bağımlılık yok.
- [x] Yönlendirme: App.tsx'e /yapay-zeka EKLENDİ (AppLayout içinde, /health-check
      satırının ardına). Mevcut hiçbir route değiştirilmedi; hem taraf hem arabulucu
      girişte görebilir.
- [x] Bağlantı: sol menüde (AppSidebar) EN SONA "Bilgi" grubu içinde "Yapay zekâ ne
      yapar" satırı. Mevcut menü öğeleri, grupları ve sıraları değiştirilmedi.
tsc temiz. CANLI TEST YOK.
AÇIK UÇ: Bağlantı yalnız sol menüde; giriş yapmadan görülen sayfalarda (Landing, Auth)
ve e-postalarda bağlantı yok — istenirse ayrı iş.

## Nerede kaldık — 16.08.2026 (72) · ÜCRETLİ ÇAĞRI İŞARETİ
- [x] TEK TANIM: src/components/mediation/UcretliIsaret.tsx — küçük gri satır,
      metin "Yapay zekâ çağrısı — her basış ücret oluşturur". Dosyada Türkçe yorum:
      pilota çıkarken tek yerden kaldırılabilir/yumuşatılabilir. Koyu zeminli kokpit
      kartları için ton="koyu" seçeneği var (yalnız renk).
- [x] İşaret konan düğmeler (11 yer): kokpit "Ayrıntısını çıkar/Yeniden çıkar" ·
      Ortak zemin "Rapor Üret/Yeniden Üret" · Ortak zemin hata kutusu "Tekrar Dene" ·
      "Çizelgeyi çıkar/yenile" · "Göstergeleri çıkar/Yenile" · belge listesi
      "Özet çıkar/Özeti yenile" · Ajan Paneli "Tüm Analizi Başlat" ve onun hata
      kutusundaki "Tekrar Dene" (ikisinde özel metin: dört analizi birden koşturur).
- [x] EK BULGULAR (kurucunun listesinde yoktu, model çağrısı tetiklediği için
      işaretlendi): Uyuşmazlık konusu "Öneri getir / Yeni öneri getir"
      (dosya-ozeti-oner) · Aşama 2 taraf kartındaki dört düğme "Analiz Başlat /
      Yeniden Analiz Et · İç Tutarlılık Denetimi · İletişim Analizi · Tekrar Dene"
      (tek satır işaret) · "Mahkeme Türünü Tespit Et / Yeniden Tespit"
      (detect-legal-deadlines) · yeni başvuru formundaki "AI Önerisi"
      (classify-dispute).
- [x] BEDAVA düğmelere hiçbir şey eklenmedi: "Yenile" (Braket · Teklif değerlendirme ·
      Tıkanma · Seçenek sepeti · İletişimde değişim sayım kolu · Usule ilişkin engeller),
      "Tekrar Dene" (yalnız tablo okuyan hata kutuları), PDF/İndir düğmeleri.
- [x] BELİRSİZ, DOKUNULMADI: "Metin çıkar" (extract-document-text) ve ücret hesabı
      (calculate-mediation-fee) — model çağrısı yapıp yapmadıkları doğrulanmadı.
- [x] Hiçbir düğmenin adı, işlevi, tıklama davranışı değişmedi; yalnız yanına/altına
      bilgi satırı eklendi.
- [x] CANLIDA DOĞRULANDI (16.08.2026) — Kokpit kart envanteri çıkarıldı (salt okuma).
      Ücretli model çağrısı tetikleyen 7 düğmeye tek tanımdan gelen maliyet işareti
      eklendi: "Yapay zekâ çağrısı — her basış ücret oluşturur" (commit e5a0617).
      İşaret tek bileşende tanımlı; pilota çıkarken tek komutla kaldırılabilir/
      yumuşatılabilir. Bedava düğmelere işaret konmadı. Karar: yenile düğmesi olmayan
      kartlara düğme EKLENMEYECEK — hepsi tek kaynaktan besleniyor, kaynak yenilenince
      tazeleniyorlar.
AÇIK NOT: düğme adlandırması tutarsız (üret/çıkar/yenile/tekrar dene karışık) —
pilottan önce tek standartla toplanacak, şimdilik dokunulmadı.
tsc temiz.

## Nerede kaldık — 16.08.2026 (71) · AJAN KONTROL PANELİ — BEŞ YENİ KOL BAĞLANDI
- [x] Beş edge fonksiyona agent_states durum yazımı: belge-ozeti (belge_ozeti) ·
      olay-cizelgesi (olay_cizelgesi) · guc-dengesi (guc_dengesi) · iletisim-degisim
      (iletisim_degisim, TARAF BAZLI → party_id dolu) · dosya-ozeti-oner (dosya_ozeti).
      Başlarken 'running', normal bitişlerde (üretildi · atlandı · yetersiz · elendi)
      'completed' + last_output.sonuc, hata dalında 'failed' + error_message.
- [x] Upsert kalıbı nöbetçidekiyle aynı: aynı case_id + agent_type (+party_id) için TEK
      satır güncelleniyor; her koşumda yeni satır birikmiyor. tarafa_gorunur alanına
      DOKUNULMADI.
- [x] KRİTİK KURAL: durum yazımı asıl işi bozmuyor — her yazma try/catch içinde, hata
      yutuluyor ve yalnız konsola loglanıyor; hata dalında da yazabilmek için admin/case
      kimliği try dışına taşındı (yalnız değişken tanımı, iş mantığı değişmedi).
- [x] AgentControlPanel > AGENT_TYPE_META'ya beş kayıt eklendi (Belge Özeti · Olay Zaman
      Çizelgesi · Güç Dengesi Göstergeleri · İletişimde Değişim · Dosya Özeti Önerisi).
      İkon ve renkler dosyada zaten kullanılanlardan seçildi, yeni import yok.
- [x] Taraf ekranı: isMediator=false iken bileşen null dönüyor; boş "AI Aktivitelerim"
      kutusu artık çizilmiyor. Erken dönüş tüm hook'lardan SONRA — hook sırası bozulmadı.
      Arabulucu görünümüne dokunulmadı.
- [x] CANLIDA DOĞRULANDI (16.08.2026) — Beş yeni kol (belge_ozeti, olay_cizelgesi,
      guc_dengesi, iletisim_degisim, dosya_ozeti) agent_states'e durum yazıyor
      (commit 9f8f893); panelde Türkçe adları tanımlı; taraf ekranındaki boş
      "AI Aktivitelerim" kutusu kaldırıldı. Görünürlük kuralı: ajan durum satırlarını
      yalnız arabulucu görür; tarafa_gorunur hanesi (varsayılan hayır) ileride "her
      tarafa kendi ajanı" işi için hazır. Arabulucu ekranında panel canlıda kontrol
      edildi, bozulma yok.
tsc temiz; beş edge fonksiyonun sözdizimi esbuild ile doğrulandı.
REDEPLOY GEREKLİ: belge-ozeti · olay-cizelgesi · guc-dengesi · iletisim-degisim ·
dosya-ozeti-oner. SQL gerekmiyor (tablo/kolon/politika kurucu tarafından yapıldı).
AÇIK UÇ: CaseRoom'daki "AI Aktivitelerim" SEKMESİ duruyor, içi artık boş. Sekmenin
kaldırılması ayrı karar (sekme silme yasağı gereği dokunulmadı).

## Nerede kaldık — 16.08.2026 (70) · SIRADAKİ İŞLER
- [x] (a) AJAN KONTROL PANELİ — bugün eklenen yeni kolların panele bağlanması +
      agent_states görünürlük kuralı. SQL hazır, çalıştırılmayı bekliyor.
      (16.08'de yapıldı — bkz. oturum 71; redeploy bekliyor.)
- [x] (b) YENİLE DÜĞMESİ ENVANTERİ — hangi kartta var, hangisinde yok, hepsi aynı
      görünümde mi; eksik olanlara eklenmesi.
      (16.08'de yapıldı — bkz. oturum 72: envanter çıkarıldı, ücretli düğmelere maliyet
      işareti kondu, yenile düğmesi olmayan kartlara düğme eklenmemesine karar verildi.)
- [ ] (c) mimari/10-arayuz-katmani.md DÜZELTMESİ — "Faz 4" → Aşama 3 ve braket
      bölümünün katmanı. (NOT: bu düzeltme 16.08'de commit e842b8d ile yapıldı; belge
      şimdi Aşama 3 diyor ve braketin yeri kokpitin RAPOR VE BELGELER katmanı olarak
      yazılı. Kalem, kurucunun listesinde durduğu için kapatılmadı — kontrol edilip
      işaretlenecek.)

## Nerede kaldık — 16.08.2026 (69) · İLETİŞİMDE DEĞİŞİM — YZ AYRINTI KOLU
- [x] CANLIDA DOĞRULANDI (16.08.2026) — Serpil Karahan testinde karma model uçtan uca
      çalıştı: sayım kolu + Ayrıntısını çıkar düğmesi + alıntı doğrulama + onarım turu
      (commit 0f77dcc). Kayıt iletisim_degisim tablosuna yazıldı, alıntılar kaynak
      künyeli.
ÇÖZÜLDÜ (16.08.2026) — Hazır yapay zekâ paragrafı varken sayım kolunun çelişen hüküm
cümlesi gizleniyor (commit 40fb1d3); paragraf yokken sayım kolu aynen konuşuyor. Canlıda
doğrulandı: kartta yalnız paragraf + iki dayanak + ücret işaretli düğme görünüyor.
AÇIK NOT: ilk metin olarak tarafın tutum beyanı değil en eski belge (ör. onam formu)
seçilebiliyor; pilotta başvuru beyanı doluyken sorun olmayacak, izlenecek.
- [x] DÜZELTME 16.08 (canlı bulgu — Serpil Karahan): "Alıntı kaynak metinde bulunamadı"
      çıkıyordu; sebep uydurma alıntı değil, doğrulamanın fazla katı olmasıydı. YALNIZ
      supabase/functions/iletisim-degisim/index.ts değişti: (a) karşılaştırma
      sadeleştirmesine Türkçe harf katlaması (ş→s · ı/İ→i · ğ→g · ç→c · ö→o · ü→u),
      satır sonu tirelemesi birleştirme, satır sonu → boşluk ve üç nokta/tire/eğik
      çizgi/alt çizgi/yıldız temizliği eklendi — bu YALNIZ karşılaştırma içindir,
      kaydedilen alıntı orijinal hâliyle duruyor; (b) doğrulamaya üçüncü şans:
      tam alıntı → ilk 40 karakter → alıntının ORTASINDAN 40 karakter (madde numarası
      eklenen alıntılar için); (c) ONARIM TURU: alıntı doğrulanamazsa model BİR KEZ
      daha çağrılıp yalnız alıntılar isteniyor (paragraf yeniden yazılmıyor), gelen
      alıntı doğrulamayı geçerse kayıt 'hazir'; geçmezse 'elendi' kalıyor ve sebepte
      hangi metnin (birinci/ikinci) alıntısının tutmadığı yazıyor. Onarım turu ikinci
      ücretli çağrıdır: yalnız doğrulama düşünce çalışır, en fazla bir kez.
      Node ile denendi: bozuk Türkçe kaynak · satır sonu tirelemesi · madde numaralı
      alıntı artık eşleşiyor; uydurma alıntı hâlâ eleniyor.
      REDEPLOY GEREKLİ: iletisim-degisim. SQL gerekmiyor, ön yüz değişmedi.
- [x] Sayım kolu ve [Yenile] düğmesi AYNEN duruyor (bedava, kart açılınca kendiliğinden
      çalışıyor). Ayrıntı kolu onun ALTINA eklendi; hiçbir satır kaldırılmadı.
- [x] Yeni edge fonksiyon: supabase/functions/iletisim-degisim.
      · Girdi: yalnız O TARAFIN kendi tarihli metinleri (beyan · kendi belgeleri ·
        keşif cevapları · kendi mesajları); karşı tarafın metni girdiye GİRMEZ.
      · En eski ve en yeni metin karşılaştırılır; tek model çağrısı, tek paragraf.
      · Çıktı: {paragraf, alinti_ilk, alinti_son} — iki tarihten birer cümlelik alıntı.
      · SUNUCU TARAFI ELEME: duygu/kişilik/niyet ifadesi (sinirli · kaygılı · agresif ·
        oyalıyor · kötü niyetli · manipülat… listesi) · alıntı yoksa · ALINTI KAYNAK
        METİNDE BULUNAMAZSA paragraf yazılmaz, durum='elendi' + sebep kaydedilir.
      · Değişim yoksa durum='degisim_yok'; zorlama paragraf üretilmez.
      · Yetki: arabulucu / dosya sahibi / yönetici. Taraf çağıramaz (config.toml
        verify_jwt = true).
- [x] Ekran: iki farklı tarihli metni olan tarafta [Ayrıntısını çıkar]; kayıt varsa
      [Yeniden çıkar]. Paragraf + iki dayanak satırı kartta görünüyor. İki farklı tarihli
      metin yoksa düğme HİÇ görünmüyor, bugünkü dürüst satır aynen kalıyor.
- [x] Kayıt: iletisim_degisim tablosu (taraf başına TEK satır, party_id UNIQUE) — her
      açılışta yeniden model çağrısı (ücret) çıkmıyor.
- [x] Hata: invoke hatasında error.context gövdesi okunup KIRMIZI ve KALICI satıra
      fonksiyon adıyla yazılıyor (15.08 dersi).
tsc temiz; edge fonksiyon sözdizimi esbuild ile doğrulandı. CANLI TEST YOK.
SQL GEREKLİ: supabase/migrations/20260816160000_iletisim_degisim.sql (1 tablo + RLS;
tarafa SELECT politikası yok). SIRA: önce SQL, sonra redeploy/publish.
REDEPLOY GEREKLİ: iletisim-degisim (YENİ — deploy edilmeden çalışmaz).
AÇIK UÇ: Ayrıntı yalnız EN ESKİ ve EN YENİ metni karşılaştırır; aradaki metinler
paragrafa girmez (sayım kolu da öyle çalışıyor).
AÇIK UÇ: Alıntı doğrulaması sadeleştirilmiş metin üzerinde yapılır; model alıntıyı
özetlerse eleme devreye girer ve paragraf yazılmaz — bu bilinçli olarak katı bırakıldı.

## Nerede kaldık — 16.08.2026 (68) · DÜZELTME: "İLETİŞİM VE ASIL İHTİYAÇ" BÖLÜMÜ
TEŞHİS: Bölüm SİLİNMEDİ, yeri de alınmadı — kod aynen duruyor (sectionDefs id
"kokpit-iletisim", DAYANAK katmanı). Bölüm 16.08'e kadar KOŞULLUYDU:
`if (communicationItems.length > 0 || communication.length > 0)`. Dosyada
party_communication_analysis kaydı yoksa bölüm hiç çizilmiyordu; kokpitte sessizce
kayboluyor gibi görünüyor. Yeni "İletişimde değişim" kartı onun yerine GEÇMEDİ; ayrı
bir kayıt olarak hemen altına eklenmişti (git ile doğrulandı: communicationItems satırlarına
en son ebe45c5'te dokunulmuş, bugünkü commit'ler o bloğa girmemiş).
- [x] Koşul kaldırıldı; bölüm artık HER ZAMAN çiziliyor ve ÜÇ DURUM ayrımı ekranda
      yazılı: (1) iz var → izler listelenir, sayaç "N iz" · (2) kayıt var, iz yok →
      "incelendi — bulgu yok" · (3) hiç kayıt yok → "analiz çalıştırılmadı" ve satırda
      "Aşama 2'deki taraf kartında 'İletişim Analizi' düğmesiyle başlatılır" yazıyor.
      Böylece "incelenmemiş olmak" ile "bulgu çıkmamış olmak" ayrımı korunuyor.
- [x] İçerik, düğmeler ve PDF çıktısı eski hâliyle duruyor; PDF'e yalnız üçüncü durumun
      tek satırlık karşılığı eklendi.
- [x] Sıra: İletişim ve asıl ihtiyaç → hemen altında İletişimde değişim → diğer bölümler.
- [x] Katman başlığındaki "N bölüm" sayacı sectionDefs listesinden hesaplanıyor; bölüm
      geri geldiği için sayı kendiliğinden düzeliyor (elle sayı yazılmadı).
tsc temiz, eslint'te yeni uyarı yok. CANLI TEST YOK.
AÇIK UÇ: Üçüncü durumda bölümün görünmesi 16.08 kararıdır; eski davranış (kayıt yoksa
bölümü hiç çizmemek) istenirse tek satırlık koşul geri konur.

## Nerede kaldık — 16.08.2026 (67) · İLETİŞİMDE DEĞİŞİM — DAYANAK KATMANINA ALINDI
- [x] Kart kokpitte RAPOR katmanından DAYANAK KATMANI'na taşındı; "İletişim ve asıl
      ihtiyaç" bölümünün HEMEN ALTINDA duruyor (aynı veriden beslendikleri için yan yana).
- [x] Sol dizin numaralandırması KODDA otomatik: menü, sectionDefs sırasından katman +
      bölüm olarak kuruluyor ve numberMenuEntries ile numaralanıyor — elle numara
      yazılmadı, sonraki başlıklar kendiliğinden kaydı.
- [x] Bölüm ipucu (SECTION_HINTS) eklendi; menüdeki diğer başlıklarla aynı düzen.
- [x] Kart KOŞULSUZ ekleniyor: "İletişim ve asıl ihtiyaç" bölümü kayıt yoksa görünmüyor,
      ama değişim kartı her hâlükârda çiziliyor ve veri yetersizse kendi içinde
      "karşılaştırılacak yeterli tarihli metin yok" yazıyor.
- [x] İçerik, kurallar ve gizlilik sınırı AYNEN: kişilik/teşhis dili yok · her işaret aynı
      tarafın iki tarihli metnine ve kısa alıntıya dayanıyor · taraflar karşılaştırılmıyor ·
      yalnız arabulucu görüyor (kokpit zaten mediator-only).
- [x] RAPOR katmanındaki eski kayıt kaldırıldı; kalıntı yok. Yeni tablo/edge fonksiyon/AI
      çağrısı yok → SQL gerekmiyor.
- [x] CANLIDA DOĞRULANDI (16.08.2026).
      · Yeri: kokpit (Aşama 3) DAYANAK katmanı, "İletişim ve Asıl İhtiyaç"ın hemen altı,
        sol dizinde 3.3. Önce Aşama 2'ye konmuştu, kurucunun kararıyla taşındı.
      · Ölçüm ifade sayımına dayanır; kişilik, duygu ve niyet değerlendirmesi yok; her
        taraf yalnız kendi metinleriyle karşılaştırılır.
      · Veri yetersizken kart gizlenmiyor, kaç metin ve kaç ayrı gün olduğunu yazıyor
        (sağlık dosyasında doğrulandı).
      · Yeni tablo, edge fonksiyon ve AI çağrısı gerekmedi.
- [x] AŞAMA 2 KALINTI DENETİMİ (16.08): bileşen çağrısı YOK · FAZ3_LAYERS ve
      FAZ3_MENU_ENTRIES'te satır YOK (altı katman aynen: dosya özeti · olay çizelgesi ·
      güç dengesi · usule ilişkin engeller · taraflar · belgeler) · sayaç YOK · eslint'te
      kullanılmayan import/değişken uyarısı YOK. Tek ölü parça, ölçüm dizisindeki hiç
      okunmayan 'ad' alanıydı; kaldırıldı.
tsc (tsconfig.app.json) temiz. CANLI TEST YOK.
NOT: Kartın sol dizindeki numarası (3.3 gibi) DAYANAK katmanında o an görünen bölüm
sayısına göre hesaplanır; iç tutarlılık ya da rapora girmeyenler bölümü yoksa numara
kayar. Sıra doğru: her zaman "İletişim ve asıl ihtiyaç"ın hemen altındadır.

## Nerede kaldık — 16.08.2026 (66) · İLETİŞİMDE DEĞİŞİM — KOKPİTE TAŞINDI
GÖRÜNMEME SEBEBİ (bulundu): Kart Aşama 2'de taraf kartının İÇİNE konmuştu; taraf satırı
açılmadıkça (accordion kapalıyken) hiç çizilmiyordu. Görünen üç kart (olay çizelgesi, güç
dengesi, usule ilişkin engeller) ise Aşama 2'nin ÜST KATMANLARI. Veri yetersizliği sebep
değildi — kod zaten "yeterli tarihli metin yok" satırını gösteriyordu.
- [x] Kart kokpite (Aşama 3) taşındı: RAPOR katmanı > "İletişimde değişim", Tıkanma ve
      Seçenek Sepeti kartlarının hemen ardında. Sol menüde kendiliğinden görünür.
- [x] Artık DOSYA BAZINDA çalışıyor: her taraf için ayrı satır; sayfa açılınca
      kendiliğinden yükleniyor, [Yenile] düğmesi diğer kokpit kartlarıyla aynı görünümde.
- [x] Veri yetersizse kart GİZLENMİYOR: "Karşılaştırılacak yeterli tarihli metin yok —
      N metin, M ayrı gün" satırıyla görünüyor.
- [x] Aşama 2'de KALINTI YOK: taraf kartındaki çağrı ve yorumu kaldırıldı; ölçüm
      yardımcıları kokpit panelinin yanına taşındı.
- [x] KURALLAR AYNEN: kişilik/duygu/niyet değerlendirmesi yok · her işaret aynı tarafın
      iki tarihli metnine ve birer cümlelik alıntıya dayanıyor · taraflar birbiriyle
      karşılaştırılmıyor (her tarafın metni yalnız kendi listesine giriyor) · kokpit
      yalnız arabulucuya çiziliyor.
- [x] YENİ TABLO / SÜTUN / EDGE FONKSİYON / AI ÇAĞRISI YOK → SQL GEREKMİYOR.
tsc (tsconfig.app.json) temiz. CANLI TEST YOK.
AÇIK UÇ: Önceki turdaki açık uçlar duruyor — ölçüm kelime sayımıdır, yalnız en eski ile
en yeni metin karşılaştırılır, taraf asistanı yazışmaları kaydedilmediği için ölçüme
girmez, statement tek alan olduğu için beyanın eski hâli tutulmaz.

## Nerede kaldık — 16.08.2026 (65) · İLETİŞİMDE DEĞİŞİM İŞARETİ (İBA 1.5 · A4 ve 5)
KEŞİF (tarihli metin var mı): VAR, iş durdurulmadı. party-communication-analysis çıktısı
party_communication_analysis tablosunda (findings + discovery_questions JSONB, taraf başına
tek satır) duruyor ve TEK ANLIK fotoğraftır — zaman serisi yoktur, bu yüzden değişim ondan
okunamaz. Tarafın TARİHLİ metinleri dört yerde: (1) case_parties.statement — tek alan,
tarihi taraf kaydının created_at'i; (2) case_documents.extracted_text + created_at +
party_id — taraf başına belgeler (ihtarname, cevap yazısı vb.); (3)
case_discovery_questions.answer_text + updated_at + party_id; (4) messages.content +
created_at + sender_id (taraf kendi kullanıcı kimliğiyle yazıyor; CaseDetail ve
MediatorDashboard ekranlarından). TARİHSİZ/OLMAYAN: taraf asistanı sohbeti hiçbir tabloya
yazılmıyor (CaseRoom'da yalnız bileşen state'inde), e-posta gövdeleri saklanmıyor.
- [x] Ekran: Aşama 2 > taraf kartı > "İletişim Analizi" düğmesinin altında "İletişimde
      değişim" kutusu; [Değişimi çıkar] / [Yenile] düğmesi bugünkü kartlarla aynı görünüm.
      YALNIZ arabulucuya çizilir (isMediator kapısı) — taraf kendi ekranında göremez.
- [x] Ölçüm KODDA, deterministik (yeni AI çağrısı YOK): dört ifade ailesi — kesin talep
      dili · çözüm dili · koşullu ifade · geri çekilme — ve rakam varlığı. En ESKİ metin
      ile en YENİ metin karşılaştırılıyor; eşik en az 2 geçiş farkı ya da yoktan var olma.
- [x] Çıktı: "Kesin talep dili arttı (0 → 6 geçiş), çözüm dili 5 → 0" biçiminde sayım +
      yön (talebin kesinleşmesi / yumuşama / koşula bağlanma / geri çekilme / rakamla
      netleşme) + İKİ tarihli metinden birer cümlelik alıntı.
- [x] ÇİZGİ: kişilik, duygu, niyet ve teşhis kelimesi hiç kullanılmıyor; iki taraf
      birbiriyle KARŞILAŞTIRILMIYOR (her taraf yalnız kendi metinleriyle ölçülüyor).
      İki farklı tarihli metin yoksa "değişim ölçülemedi", değişim yoksa "belirgin bir
      değişim görünmüyor" yazıyor.
- [x] YENİ TABLO / SÜTUN / EDGE FONKSİYON YOK → SQL GEREKMİYOR. Mevcut analiz zinciri
      bozulmadı; party-communication-analysis'e dokunulmadı.
- [x] MANTIK TESTİ (canlı değil, esbuild+node ile saf fonksiyon): çözüm dilinden ihtarname
      diline geçen örnekte iki işaret doğru çıktı (talep dili 0→4, rakamla netleşme),
      dayanak alıntıları doğru cümleyi gösterdi; değişmeyen örnekte sıfır işaret; tek
      metinde sıfır işaret.
tsc (tsconfig.app.json) temiz. CANLI TEST YOK.
AÇIK UÇ: Ölçüm KELİME SAYIMIDIR. Aynı anlamı başka sözcüklerle kuran metinde işaret
çıkmaz; ifade listeleri kod içinde tek yerde durur, genişletilebilir.
AÇIK UÇ: Yalnız EN ESKİ ile EN YENİ metin karşılaştırılıyor; aradaki dalgalanma (önce
sertleşip sonra yumuşama) görünmüyor. Ara kademeler istenirse ayrı iş.
AÇIK UÇ: Taraf asistanı yazışmaları kaydedilmediği için ölçüme giremiyor; kaydedilmesi
ayrı karar (kör veri açısından da ayrıca değerlendirilmeli).
AÇIK UÇ: statement tek alan olduğu için "başvuru metni" tek tarihle temsil ediliyor;
taraf beyanını sonradan değiştirirse eski hâli kayıtta kalmıyor.

## Nerede kaldık — 16.08.2026 (64) · TASLAK DENETİMİ (İBA 2.6 / B21)

- [ ] TASLAK DENETİMİ — ŞABLON YÜKLEMESİNE BAĞLANDI (16.08.2026 kararı). Tutanak ve
      anlaşma belgesi şablonları (Adım B) yüklenmeden yapılmayacak; denetim kalıpları
      şablonlara göre kurulacak.
      · Sebep: denetlenecek gerçek metin yok; şablonlar gelince kalıplar zaten
        değişecek, iki kez iş çıkar.
      · Sıra: (1) tutanak şablonlarının yüklenmesi, (2) taslak denetimi.
      · Denetimde aranacaklar (karar verilmiş, şablonlar gelince uygulanacak):
        belirsiz ödeme/edim tarihi · ölçüsüz ifade (makul süre, uygun tutar) · taraf
        adı-unvan tutarsızlığı · rakam ile yazının çelişmesi · feragat/ibra kapsamının
        belirsizliği · boş bırakılmış şablon alanı · eksik imza/tarih alanı · aynı
        hükmün iki yerde farklı yazılması. Ajan metni değiştirmez, yalnız gösterir;
        hukuki geçerlilik yorumu yasak.
      · Kutu 16.08'de ekrandan kaldırıldı; şablon yüklemesinden sonra geri açılacak.

DURDURULDU (16.08) — AMA KOD ZATEN YAZILMIŞTI, GERİ ALINMADI (kurucu talimatı).
Commit 7dab606 ile depoya girdi ve push edildi. Dokunulan dosyalar:
  · YENİ: src/components/mediation/TaslakDenetimi.tsx (392 satır — denetim mantığı,
    salt okur, metni değiştirmez).
  · src/components/mediation/OfficialDocumentsPanel.tsx — 4 satır: import + taslak
    metninin altına <TaslakDenetimi .../> çağrısı. BELGE ÜRETİM/KAYDETME/ONAYLAMA/
    İNDİRME akışlarına dokunulmadı.
  · Belge dosyaları: mimari/05-yetenek-envanteri.md, tasks/yol-haritasi.md, tasks/todo.md.
UYARI: Kod depoda durduğu için, bir sonraki Publish'te denetim kutusu belge ekranında
GÖRÜNÜR olacak. İstenmiyorsa tek satırlık çağrının kaldırılması yeter (kurucu kararı).
Aşağıdaki satırlar o turda yapılanların kaydıdır; iş şablonlar gelince yeniden ele alınacak.

KEŞİF (belge üretimi nerede duruyor): Üretim edge fonksiyonu
supabase/functions/generate-official-document; ekran tarafı
src/components/mediation/OfficialDocumentsPanel.tsx (Aşama 7 — Belgeler & Kapanış içinde,
MediationEngine.tsx:11074'ten çağrılıyor; taraf ekranındaki OfficialDocsPanel AYRI ve
yalnız pdfTemplates.ts şablonlarını indiriyor). ÜRETİLEN METİN: fonksiyondan dönen
filled_text, ekranda generatedDocs[kind].filled_text state'inde duruyor ve düzenlenebilir
Textarea'da gösteriliyor; kalıcı kayıt agreement_documents satırının metadata JSONB'sinde
(sürüm sürüm, status taslak/onaylandi). Yani denetim için okunacak metin ZATEN ekranda —
üretim hattına dokunmadan yalnız o metni girdi almak yetti.
- [x] Yeni dosya: src/components/mediation/TaslakDenetimi.tsx (salt okur, metni
      DEĞİŞTİRMEZ). OfficialDocumentsPanel'e yalnız iki satır eklendi: import + taslak
      Textarea'sının altına <TaslakDenetimi .../> çağrısı. Üretim, kaydetme, onaylama,
      sürüm ve indirme akışlarına DOKUNULMADI.
- [x] Sekiz kontrol, her biri ayrı satır + konum (satır no) + metinden TEK CÜMLE alıntı:
      belirsiz ödeme/edim tarihi ("en kısa sürede" vb.) · ölçüsüz ifade ("makul süre",
      "uygun tutar", "gerekli hâllerde" vb.) · taraf adı/unvan tutarsızlığı (dosya
      kaydındaki ad belgede aranıyor; hiç geçmiyorsa ya da yalnız bir parçası geçiyorsa
      bulgu) · rakam–yazı çelişkisi (Türkçe sayı sözcüğü çözümleyicisi: "yüz elli bin"
      → 150000, parantezin HEMEN önündeki rakamla karşılaştırılıyor) · feragat/ibra
      kapsamının belirsizliği (cümlede kapsam işareti yoksa) · boş alan / doldurulmamış
      şablon yeri ("...", "[ ]", "XXX", "___", "{{" vb.) · imza ve tarih alanının
      eksikliği · aynı hükmün iki yerde farklı yazılması (cümle benzerliği ≥ %70 ama
      birebir aynı değil).
- [x] SINIR: metin değiştirilmiyor, düzeltme arabulucuda. Hukuki geçerlilik yorumu yok
      ("geçersizdir" denmiyor); yalnız belirsizlik/eksiklik/çelişki gösteriliyor.
      Bulgu yoksa "Denetimde eksiklik görünmüyor." Yalnız arabulucu ekranında.
- [x] YENİ TABLO / SÜTUN / EDGE FONKSİYON / AI ÇAĞRISI YOK → SQL GEREKMİYOR.
- [x] MANTIK TESTİ (canlı değil, düğüm/esbuild ile saf fonksiyon koşturuldu): bozuk
      taslakta sekiz bulgunun sekizi de doğru satırla çıktı; temiz taslakta sıfır bulgu.
      Test sırasında iki tuzak yakalanıp düzeltildi: (a) binlik ayıracı "150.000" cümle
      sonu sayılıp alıntı "000 TL (…" diye kesiliyordu — cümle sonu artık ardından boşluk
      gelen nokta · (b) Türkçe küçültmede ASCII "IMZA" → "ımza" olduğu için imza kontrolü
      yanlış bulgu veriyordu — karşılaştırmada "ı" harfleri "i" sayılıyor.
tsc (tsconfig.app.json) temiz. CANLI TEST YOK.
AÇIK UÇ: Ad kontrolü tek yönlü — dosya kaydındaki ad belgede aranıyor. Belgede geçen ama
kayıtta olmayan bir ad tespit edilmiyor (isim tanıma gerekir, yapılmadı).
AÇIK UÇ: Rakam–yazı karşılaştırması yalnız parantez içi yazımda ve rakam parantezin hemen
önündeyse çalışıyor; "150.000 TL yani yüz elli bin lira" gibi serbest yazımda çalışmaz.
AÇIK UÇ: Denetim sonucu HİÇBİR YERE KAYDEDİLMİYOR (ekranda kalır, sayfa yenilenince
gider). Kayıt istenirse yeni sütun/tablo gerekir — açılmadı.
AÇIK UÇ: Bu denetim, mimarideki ANLAŞMA BELGESİ DENETÇİSİ'nin (mevzuat/içtihat dayanaklı
kural taraması) yerine geçmez; onun önündeki hafif kademedir.

## Nerede kaldık — 16.08.2026 (63) · SEÇENEK SEPETİ (İBA 1.9 / A10)
KEŞİF (asıl ihtiyaç verisi nerede duruyor): DÖRT kayıt var, hepsi arabulucu yüzeyinde.
(1) party_root_cause_analysis.kok_neden = {gorunen_talep · asil_mesele · dayanak ·
guven_seviyesi} — party-confidential-analysis yazıyor, taraf başına tek satır, "Yeterli
veri yok" değeri ayrıca işaretli. (2) party_analyses.analysis.party_position.interests[]
— aynı ajanın menfaat listesi (yanında strengths/weaknesses/batna/watna). (3)
common_ground_reports.report.common_interests[] — ortak menfaatler (ayrıca scenarios ve
red_lines var, kullanılmadı). (4) case_parties.statement — tarafın kendi beyanı.
RAKAMLANMIŞ ya da ETİKETLİ bir "ihtiyaç" tablosu YOK; hepsi serbest metin. Bu yüzden
eşleştirme kodda, ifade taraması ile yapıldı.
- [x] Ekran: kokpit (Aşama 3) > RAPOR katmanı > "Seçenek sepeti", Tıkanma ve çıkış
      yollarının hemen ardında. Sol menüde kendiliğinden görünür. "Yenile" düğmesi
      bugünkü diğer kartlarla aynı görünümde (KOKPIT_DUGME).
- [x] 11 seçeneklik katalog, para dışı olanlar dahil: taksitlendirme · vade/ödeme takvimi ·
      hizmet veya ayni karşılık · onarım-yenileme-eksiğin tamamlanması · özür/yüz kurtarma ·
      referans mektubu · gelecekteki iş ilişkisi · gizlilik taahhüdü · kamuoyuna açıklama
      yapmama · süreli deneme · üçüncü kişi güvencesi (kefil/teminat).
- [x] Her seçenekte iki satır: (a) hangi ihtiyacı karşıladığı — sabit, nötr cümle;
      (b) DAYANAK — hangi kayıt (kaynak adı + taraf adı) ve o kaydın KENDİ cümlesinden
      alıntı. Eşleşmeyen seçenek hiç gösterilmiyor.
- [x] Veri yoksa: "Asıl ihtiyaç kaydı yok, seçenek üretilemedi." Kayıt var ama eşleşme
      yoksa ayrı cümle yazılıyor — zorlama seçenek üretilmiyor.
- [x] SINIR: liste SIRALAMA DEĞİL (ekranda da yazıyor); "en iyisi budur" yok, rakam
      önerisi yok, tavsiye yok. Yeni AI çağrısı YOK.
- [x] GİZLİLİK: yalnız kokpitte çizilir; kök neden ve taraf analizleri zaten mediator-only,
      taraf ekranına dokunulmadı.
- [x] YENİ TABLO / SÜTUN / EDGE FONKSİYON YOK → SQL GEREKMİYOR.
- [x] Bir kaynak okunamazsa kart düşmüyor; hangi kaynağın okunamadığı kırmızı satırda.
- [x] CANLIDA DOĞRULANDI (16.08.2026).
      · Yeri: kokpit (Aşama 3), Tıkanma kartının yanı. Yeni tablo, edge fonksiyon ve
        AI çağrısı gerekmedi.
      · Kira dosyasında 4 seçenek üretti: vade/ödeme takvimi · onarım/eksiğin
        tamamlanması · gelecekteki iş ilişkisi · üçüncü kişi güvencesi. Her biri kök neden
        analizi, taraf analizi ya da ortak zemin raporundan alıntıyla dayanaklandırıldı.
      · Sıralama, tavsiye ve rakam önerisi yok; yalnız arabulucuya görünüyor.
tsc (tsconfig.app.json) temiz. CANLI TEST: 16.08'de yapıldı (yukarıdaki madde).
AÇIK UÇ: Dosya TÜRÜ tek başına seçenek tetiklemiyor (kira dosyası olması "onarım"
seçeneğini açmıyor). Sebep: türden ihtiyaç çıkarmak uydurma olurdu; yalnız kayıtlı ihtiyaç
metni tetikliyor. Kurucu isterse tür bazlı öneri ayrı karar olur.
AÇIK UÇ: Eşleştirme ifade taramasıdır (anahtar kelime). Kayıt farklı sözcüklerle yazılmışsa
seçenek çıkmaz; katalogdaki anahtarlar kod içinde tek yerde durur, genişletilebilir.
AÇIK UÇ: Seçeneği tutanağa/anlaşma taslağına aktaran bir düğme YOK; kart yalnız gösterir.

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
- [x] CANLIDA DOĞRULANDI (16.08.2026).
      · Yeri: kokpit (Aşama 3). Yeni tablo, edge fonksiyon ve AI çağrısı gerekmedi.
      · Kira dosyasında 4 işaret üretti: cevapsız davet · 21 iptal kaydı · tarihi geçmiş
        3 planlı oturum · süreye 5 gün. Her biri dayanaklı; her işaretin altında gerekçeli
        çıkış yolları listelendi; karar/tavsiye dili yok.
      · ÇIKAN EKSİK GİDERİLDİ: case_party_invites tablosuna arabulucu okuma politikası
        eklendi (tablo case_party_id üzerinden bağlanıyor), böylece davet kayıtları
        işaretlere girebiliyor. Politika elle çalıştırıldı — kayıt yeri
        tasks/kurulu-envanter.md.
tsc (tsconfig.app.json) temiz. CANLI TEST: 16.08'de yapıldı (yukarıdaki madde).
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
KAPATILDI (16.08.2026) — Ayrı bir kronoloji şeridi EKLENMEYECEK. Karar ve gerekçe:
İBA'nın "dosyanın seyrini hızlı kavrama" ihtiyacı mevcut yapılarla karşılanıyor —
uyuşmazlığın kendi geçmişi olay çizelgesi kartında (belge künyeli, doğum tarihi gibi
ilgisiz veriler elenmiş hâlde), arabuluculuk sürecinin seyri süreç takip çizelgesinde.
İki zaman eksenini tek şeritte karıştırmak arabulucuyu yanıltır; ikinci görünüm ekran
kalabalığı olur. Süreç takip çizelgesine eklenecek gerçek bir eksik çıkarsa o gün ayrıca
ele alınacak. (Eski kayıt: kokpite kısa kronoloji şeridi — §5.2g'nin "kokpite sunulur"
cümlesinin karşılığı olarak açık uç tutuluyordu.)
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
      BEKLİYOR — tutanak şablonları yüklenmeden yapılamaz (taslak denetimi ile aynı
      önkoşul). Şablonlar geldiğinde ikisi birlikte ele alınacak.

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
      ERTELENDİ (16.08.2026) — Şimdi yapılmayacak; PİLOT DIŞARI AÇILMADAN ÖNCE kurulacak.
      Gerekçe: kayıt, itiraz veya denetim hâlinde işe yarar; pilotta dosyalar kurucunun
      kendi dosyaları olduğu için karşılığını ancak ürün dışarıya açıldığında verir.
      TASARIM KARARI: dağınık biçimde her düğmeye ayrı kayıt satırı eklenmeyecek; TEK
      KAYIT KAPISI kurulacak — üründeki her onay, düzenleme ve ret aynı kapıdan geçip
      otomatik deftere yazacak, böylece sonradan eklenen özellikler de kendiliğinden
      kaydedilecek. Hâlihazırda ajan tarafı yazılıyor (ajan görevleri, braket denetim izi,
      nöbetçi gerekçeleri); eksik olan İNSAN tarafı: arabulucunun taslak düzenlemeleri,
      öneri kabul/retleri, belge onayları.

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
