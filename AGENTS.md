> ## ⚠ 23.08.2026 — ROL SINIRI (bu blok diğer her şeyin üstündedir)
>
> **Codex bu projede kod yazmaz.** Codex yalnızca DAOS mimarisini ve çalışma
> düzenini inceleyen **danışmandır**: görüş verir, risk gösterir, çelişki
> bulur. Kod yazmaz, dosya değiştirmez, commit atmaz, kodlama akışına girmez.
>
> **Ürünün tüm kodlama işi Claude Code'a aittir.** Tek coding agent Claude
> Code'dur ve kuralları `CLAUDE.md` (DAOS) ile `MEDIPACT-BASLANGIC.md`
> dosyalarındadır. Çelişki çıkarsa **`CLAUDE.md` kazanır**; bu dosya Codex'in
> okuma düzenidir, geliştirme anayasası değildir.
>
> **Codex yanıtsız kalırsa iş durmaz.** Limit dolduğunda, cevap gelmediğinde
> veya Codex'e erişilemediğinde Claude Code beklemez — kendi yürütür. Hiçbir
> görev "Codex cevap vermedi" gerekçesiyle BLOCKED yazılamaz.
>
> **Arşiv kuralı güncellendi:** aşağıdaki "99-ARSIV tek doğruluk kaynağıdır
> ama OKUNMAZ" ifadesi geçersizdir. Tek doğruluk kaynağı `mimari/` bölüm
> dosyalarıdır (`00`–`17`); `99-ARSIV-mimari-tam.md` eski anlık görüntüdür,
> güncellenmez, rutin okumada açılmaz, gerektiğinde grep ile aranır.
> Çelişkide bölüm dosyası kazanır.

# AGENTS.md — MediPact Çalışma Düzeni

## Oturum okuma sırası (bağlayıcı)

1. `PROJE_OZETI.md` — tam oku, MUTLAKA açılır (özettir, kaynak değildir — bkz. aşağıdaki çelişki sırası).
2. `constitution.md` — tam oku. Kısadır; değişmez ilkeler.
3. `mimari/00-INDEX.md` — tam oku. Bölüm haritasıdır.
4. Yalnızca işine karşılık gelen `mimari/` bölüm dosyası.
5. `tasks/todo.md` — yalnız en üstteki "Nerede kaldık" bloğu (alt kısmı bayattır) ·
   `tasks/lessons.md` — tam oku.
6. `medipact-komut.md` — yalnızca ürünün niyeti tartışılıyorsa.
7. `tasks/yol-haritasi.md` — yalnızca sıra/öncelik sorusu varsa.

Çelişki hâlinde üst sıradaki kazanır:
constitution.md > medipact-komut.md > mimari/ > tasks/. `PROJE_OZETI.md` bu
sıralamanın DIŞINDA — bir özettir, hiçbir zaman kaynağın önüne geçmez, ama okuma
listesinden de düşürülmez.

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
- akis_kurallari'na kural satırı gerekiyor mu (satırı Codex yazar, sen yazma).
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
  hepsi Codex'da. Gerekiyorsa üç satırda "SQL: var — <ne gerekiyor>" diye rapor et,
  kendin yazma. Supabase Dashboard yolu kapalı.
- Altyapı kurmadan önce tasks/kurulu-envanter.md okunacak ve canlıda cron.job sorgusuyla doğrulanacak; depoda görünmemesi "yok" demek değildir
- Tek lockfile bun.lock'tur; npm install kullanılmaz, bun install kullanılır
- Kök nedeni bul; geçici yama yapma

## Kısayol kelimeleri
- "medipact" → `PROJE_OZETI.md` (en güncel hâli, proje klasöründen MUTLAKA açılıp
  okunur — atlanamaz), constitution.md, tasks/todo.md (en üstteki "Nerede kaldık"
  bloğu) ve tasks/lessons.md okunur; sonra TEK CÜMLEYLE "son oturumda X yapıldı,
  sırada Y var" denir ve KOMUT BEKLENİR. Bu kelime üzerine kod yazılmaz, iş
  başlatılmaz, uzun özet çıkarılmaz.
- "medipact devam" → aynı dosyalar okunur (PROJE_OZETI.md dahil), sonra "Nerede
  kaldık" bloğunda SIRADAKİ olarak yazan ilk madde doğrudan yapılmaya başlanır;
  ayrıca onay sorulmaz. Yalnız o madde yapılır, kapsam genişletilmez.

## Oturum sonu özet kaydı (bağlayıcı — atlanamaz)

Her sohbet/oturum SONUNDA, `OZET_KOMUTLARI.md`'deki talimatlara HARFİYEN uyularak
`PROJE_OZETI.md` güncellenir:
1. `OZET_KOMUTLARI.md`'deki 1. prompt bu sohbete uygulanır — dolgu, nezaket,
   tekrar temizlenir; yalnız 4 başlık altında öz metin çıkarılır.
2. Mevcut `PROJE_OZETI.md` varsa, `OZET_KOMUTLARI.md`'deki 2. prompt uygulanır:
   eskiyen bilgi silinir, yeni tamamlanan işler eklenir, "Mevcut Durum ve
   Sıradaki Adım" yeniden yazılır.
3. Sonuç `PROJE_OZETI.md`'nin ÜZERİNE YAZILIR (proje klasörüne kaydedilir); eski
   içerik tamamen yerini bırakır.
4. `tasks/todo.md`'deki "İş sonu kaydı" ayrı ve hâlâ zorunludur — ikisi birbirinin
   yerine geçmez: todo.md iş kalemi bazlı kayıt tutar, PROJE_OZETI.md oturumun
   genel özetini taşır.
5. Bu adım atlanmaz; kayıt düşmeden iş bitmiş sayılmaz kuralıyla aynı bağlayıcılıkta.

## Token/zaman tasarrufu

`skills/medipact-calisma-duzeni/SKILL.md` bu kısayol + okuma sırası + oturum-sonu
kaydı düzenini tek dosyada, düşük tokenla paketler — mümkünse önce o çağrılır.
`constitution.md`/`mimari/`/`lessons.md`'yi her seferinde tam okumayı gevşetecek
her değişiklik önce kurucuya sorulur, tek taraflı uygulanmaz.

## OZET_KOMUTLARI.md (tam içerik — kaynak dosyayla birebir aynı tutulur)

OZET_KOMUTLARI:

### 1. Her sohbet sonunda o sohbetin özetlendiği PROJE_OZETI.md si içeriğini oluşturma Promptu

Bu sohbeti tara. Gereksiz dolgu cümlelerini, nezaket ifadelerini, teknik açıklamaları ve tekrarları tamamen temizle.
Aşağıdaki 4 başlık altında sadece en güncel ve net metni üret:
1) Anahtar Kavramlar ve Değişkenler
2) Alınan Kararlar ve Kurallar (sadece en güncel hali)
3) Tamamlanan İşler (sadece bu sohbette tamamlananlar)
4) Mevcut Durum ve Sıradaki Adım (sadece en güncel hali)
Sadece öz metni üret, ekstra açıklama yazma.

### 2. Eski Özet ile Yeni Sohbeti Birleştirip Güncelleme Prompt'u

*Yeni bir sohbet oturumunda, geçmiş durum ile yeni yapılan işleri birleştirip tek bir güncel `PROJE_OZETI.md` oluşturmak için:*

```text
Sana vereceğim mevcut PROJE_OZETI.md içeriği ile bu sohbette ulaşılan yeni durum ve kararları birleştir.
Kurallar:
1. Eski ve geçerliliğini yitirmiş bilgileri tamamen sil.
2. Tamamlanan yeni işleri "Tamamlanan İşler" bölümüne ekle.
3. "Mevcut Durum ve Sıradaki Adım" kısmını en güncel haliyle yeniden yaz.
4. Çıktı olarak eski dosyanın üzerine yazılacak (eski dosyayı tamamen sildirip yerine geçecek) eksiksiz, tek parça yeni PROJE_OZETI.md metnini üret.
```

## PROJE_OZETI.md — en güncel hâli (kaynak dosyayla birebir aynı tutulur)

# MediPact — Ana Durum Özeti (tek ve güncel)

Kaynak: medipact 2 → medipact 4 → medipact 3 → medipact 1 (eskiden yeniye). Çelişkilerde en yeni hâl alındı.

---

## 1) Anahtar Kavramlar ve Değişkenler

**Yerler**
- Depo: `C:\Users\ASUS\milat` (masaüstü köprüsüyle bağlı) · Lovable proje `5ffedb1b-4087-4fe1-a1ef-873c9754f71d` (medipact-ai) · workspace `Mxc2bXygdkJGAWNSM2i3` · canlı https://medipact-ai.lovable.app
- Belge zinciri: `constitution.md` > `medipact-komut.md` (441 satır, rev.12, salt ekleme) > `mimari/` > `tasks/`
- Kural kitapları: `AGENTS.md` (Code) · `COWORK.md` (Cowork) — bağlayıcı olan bu ikisidir
- Özet düzeni: `OZET_KOMUTLARI.md` (oturum sonu özet promptları) · `PROJE_OZETI.md` (bu dosya — tek ve güncel özet, her oturum sonunda üzerine yazılır) · `skills/medipact-calisma-duzeni/SKILL.md` (Cowork skill, "medipact" akışını düşük tokenla paketler)
- Kayıt: `tasks/todo.md` (214 KB, tek kayıt yeri; geçerli durum yalnız üstteki "Nerede kaldık" bloğu) · `lessons.md` (302 satır) · `yol-haritasi.md` (845 satır, ürünün sırasını belirler) · `kurulu-envanter.md`
- Bütün bu dosyaların çalışma kopyası: `C:\Users\ASUS\Desktop\medipact Codex` — canlı depo `C:\Users\ASUS\milat`

**Akış omurgası**
- `akis_olaylari` (olay) → `akis_kurallari` (kod · olay_kodu · kosul · sonraki_adim · sahip · insan_kapisi · sira · etkin · gerekce; 9 satır) → `akis-yurut` (koşucu, yalnız `etkin` alanına bakar — `akis-yurut/index.ts:657`)
- `ajan-nobetci` = gözcü kolu · `akis-yurut` = yürütücü kolu · ana ajan tektir
- Olay yazıcıları iki katmanda: kod (`_shared/olay.ts` · `olayYaz`) + 11 veritabanı tetikleyicisi (`akis_olay_yaz`, `akis_olay_yaz_bilirkisi`, `akis_olay_yaz_dongu`) — tetikleyiciler depoda görünmez
- ~75 edge fonksiyon; ortak motor `_shared/anlatim.ts` (24 ad) — 39 fonksiyon okuyor
- Dağıtım zinciri: push → Lovable görüyor mu → SQL → redeploy → publish → Ctrl+Shift+R → test

**Tablolar**
`akis_olaylari` · `akis_kurallari` · `agent_states` · `ajan_gorevleri` (+kaynak, bekleyen) · `ajan_deneyim` · `ajan_bellek` · `gundem_kalem_havuzu` (70 satır, RLS açık, politika 0) · `experts` (6 uydurma kayıt) · `bilirkisi_secim_beyani` · `bilirkisi_onerileri` · `bilirkisi_taraf_yanitlari` · `bilirkisi_evrak_kumesi` · `bilirkisi_raporlari` · `case_expert_assignments`

**Fonksiyonlar / ekranlar**
- Bilirkişi: `bilirkisi-secim` · `bilirkisi-ekranim` · `bilirkisi-belge-baglantisi` · `bilirkisi-davet` · ayrıca `hazirlik-foyu` · `ajan-nobetci` · `akis-yurut`
- Ekranlar: `/legal-reasoning` (arabulucu, MediationEngine) · `/case-room/:id` (iki görünüm) · `/cases/:id` (rol kapısı; arabulucuyu legal-reasoning'e yollar)

**Test dosyaları**: MP-2026-1016 · id `5186ee1d-bc52-4dc1-b03a-1fe75844a14e` (kira, aşama 4) · case `eb70595a-5d40-4b92-9e7a-c0c91318445a`

**Son commit zinciri**: `8dd94ab` → `d28aed9` → `65141e7` → `cf95626` → `cf38ef2`

**Kişi**: Emel — arabulucu-hukukçu, yazılımcı değil; teknik dil kullanılmaz.

---

## 2) Alınan Kararlar ve Kurallar

**İş bölümü**
- Code = kod, dosya, commit, push · Cowork Codex = SQL, `akis_kurallari` satırları, politika, redeploy/publish, canlı test · Kurucu = karar ve canlı test
- Code SQL / migration / politika / kural satırı yazmaz (`AGENTS.md:139-141`)
- `git push` yalnız kurucunun terminalinden ya da Code'dan

**Çalışma kuralları**
- Kapı satırı beş alan, zorunlu: `okudum | yapılmış mı | sıra | kayıt | uydurma` (dört alanlı skill sürümü eskimiştir; COWORK.md bağlayıcı)
- İzin alınmadan dosya okunmaz, sorgu çalıştırılmaz, dosya hazırlanmaz — tetikleyici kelimeler: "oku / bak / yap / başla"
- Okumadan komut yok, tanı yok; eksik okumadan liste, tablo, karşılaştırma, öneri üretilmez
- Onay alınmadan komut metni yazılmaz; komut tek parça verilir ve kesindir; tek seferde tek adım
- Lovable sohbetine sormadan girilmez (kredi); SQL, dosya okuma, dizin listesi ücretsiz
- Kanıtsız iddia yasak, "bilmiyorum" zorunlu; beyan delil değil, ekrandaki araç hareketi delildir
- Olmamış şeyin ihtimaliyle uyarı yazılmaz; Code'a keşif raporu/plan sunulmaz, doğrudan iş
- Lovable komutlarında DOKUNMA KURALLARI bloğu zorunlu (Code komutlarında değil); Code kod yazımında kesintisiz koşabilir, yayın ve test insan kapısında kalır
- Saatler İstanbul saatiyle
- Ortak dosya değişirse onu okuyan bütün fonksiyonlar redeploy edilir; tarama depoda yapılır

**Kayıt düzeni**
- Kim yaptıysa o yazar, iş bitiminde `tasks/todo.md`'ye: YAPILDI / EKSİK KALDI / GİDERMEK İÇİN
- Devir sohbette değil `todo.md`'de durur; bir iş kalemi = bir sohbet; iş bitip kayıt düşünce oturum kapanır, yeni sohbet "medipact" ile başlar
- `todo.md`'deki 41 işaretsiz madde ne "yapıldı" ne "yapılmadı" sayılır

**Dosya mimarisi**
- Üç dosya ayrı kalır; birleştirme reddedildi (AGENTS.md adının kendiliğinden yüklenmesi kırılır, medipact-komut.md'nin salt-ekleme disiplini bozulur)
- Bir kural tek dosyada bulunur, tekrar yasak
- Reddedilenler: kuralları `medipact-komut.md`'ye taşıyıp `COWORK.md`'yi silmek · proje talimatlarına taşımak (git geçmişi kaybı) · yeni kural dosyası açmak

**Ürün dili**
- Ajan öznel/duygusal ifade kullanmaz ("Beğenmedim" kaldırıldı)
- Aynı işi yapan metin üründe tektir: "Yeniden öner"
- Gerekçe sorusu sorulmaz; ilgili kolonlar yerinde kalır, boş geçilir
- Soru kalıbı: durum (tek cümle) + dayanak (tek satır) + iki düğme (Onayla · Yeniden öner)

**Ürün çekirdeği**
Tek ana ajan · beş insan kapısı · kör veri sorguda · devirde içerik geçmez · uçtan uca otonom

**Bilirkişi tükenme akışı**
- "Yeniden öner" → aday yoksa "Bu alanda kayıtlı başka uzman yok"; pencere kapanmaz
- Arabulucu yakın uzmanlık alanı yazar, ajan o alanla yeniden tarar; tur sınırı 2
- Dışarıdan uzmanda karşı tarafın ajanına yalnız usul satırı + uzmanlık alanı gider; ad ve metin geçmez
- Ortak irade yoksa seçilmez, arabulucu dayatmaz
- Seçilemezse "bilirkişi seçilmedi — bu aşama ertelendi" kayda geçer; ajan aynı şeyi sormaz, süreç sürer

**Özet ve süreklilik kuralları (22.08)**
- Her sohbet SONUNDA `OZET_KOMUTLARI.md`'ye harfiyen uyularak `PROJE_OZETI.md` güncellenir (üzerine yazılır) — bağlayıcı, atlanamaz
- "medipact" kısa komutu artık `PROJE_OZETI.md`'nin en güncel hâlini MUTLAKA açıp okur (önceki okuma listesine ek)
- `OZET_KOMUTLARI.md`'nin tam içeriği ve `PROJE_OZETI.md`'nin güncel hâli `COWORK.md` ve `AGENTS.md`'ye eklendi
- `PROJE_OZETI.md` bir ÖZETTİR, birincil kaynak değildir; çelişkide sıra hâlâ `constitution.md` > `medipact-komut.md` > `mimari/` > `tasks/`
- `skills/medipact-calisma-duzeni/SKILL.md` oluşturuldu — "medipact" akışını tek dosyada paketler, token/zaman tasarrufu içindir

**Veri kararları**
- `gundem_kalem_havuzu`'na okuma politikası YAZILMAYACAK — tek tüketici `hazirlik-foyu`, servis anahtarıyla okuyor; politika erişimi genişletir (anayasa m.1). Kalem "gerekçesi yazılmamış tasarım" olarak kapandı
- Dinleyicisi olmayan dört olaya kural yazılmayacak; dördünün gerekçesi belgeye düşecek
- `bilirkisi_beyani__ilerlet` "kusur" değil "canlı testi bekleyen yol" olarak kaydedildi

---

## 3) Tamamlanan İşler

- **Defter onarımı:** `ajan_deneyim` boş kalıyordu; sebep `deneme_no NOT NULL` (23502). Kısıt kaldırıldı, varsayılan 1 → canlıda 3 satır düştü
- **Öğrenme süzgeci:** `ogrenmeGirdisiUygunMu` ISO saat damgası ve UUID'yi reddediyordu; muafiyet eklendi, `tamamlendi:mediator` canlıda yazıldı
- **Bilirkişi katmanı:** 7 bölüm (beyan · alan+aday · sunum+kör perde · atama+kabul · iki kademeli ekran · evrak kümesi+dış aday · rapor), 4 yeni fonksiyon, 39 fonksiyon yayına alındı, publish yapıldı
- **Döngü kusuru:** `bilirkisi-secim` her koşumda kendine olay yazıyordu; `olayYazDegistiyse` kapısı eklendi. Canlı testte yeni olay yazılmadı — döngü yok
- **Nöbetçi mükerrer yazım:** `startsWith` → `includes` (3 yer)
- **Kural çelişkisi kapatıldı:** gerekçesinde "KAPALI" yazıp `etkin=true` duran üç satır gerçekten kapatıldı — `belge_yuklendi__analiz` (10) · `kalem_guncellendi__karsilastir` (25) · `foy_onaylandi__gonder` (30). Sonuç: analiz zincirinin çift koşumu (çift OpenAI harcaması) ve föyün çift gönderim yolu durdu. 9 satırın tamamı okunarak doğrulandı
- **Denetim 1. tur kapandı** — üçü de kod işi çıkmadı:
  - `gundem_kalem_havuzu`: politika gerekmiyor (75 edge fonksiyon + src + pg_proc tarandı; tek tüketici `hazirlik-foyu`, index.ts:475/586/794)
  - `bilirkisi_beyani__ilerlet`: kod kusuru yok, yol hiç kullanılmamıştı. Canlı test yapıldı: beyan 1 · olay 1 · islendi=true
  - Dört dinleyicisiz olayın yazıcıları bulundu: `soru_cevaplandi` = `trg_akis_gorev_cevap` · `foy_taslagi_hazirlandi` = `hazirlik-foyu` · `foy_gonderildi` = çift yazıcı · `belge_ozeti_uretildi` = `belge-ozeti`
- **Soru kalıbı + bilirkişi akışı kodlandı** (`cf38ef2`): AjanPenceresi · BilirkisiAlanlari · BilirkisiTarafPaneli · IntakeChat · bilirkisi-secim. `bilirkisi-secim` redeploy + proje publish
- **Belge işleri:** COWORK.md yazıldı ve depoya kaydedildi · AGENTS.md'de 10 değişiklik · COWORK.md "Yeni oturum" listesi altı maddeye açıldı, `medipact-komut.md` 1. sıraya eklendi · AGENTS.md belge zinciri ve okuma sırası düzeltildi · lessons.md'ye 21.08 dersi ("gerekçedeki KAPALI kuralı kapatmaz") · todo.md 21.08 ve 106 blokları (`cf95626`)
- **Yayın/altyapı:** `ajan-nobetci` redeploy (`65141e7`, 0,5 kredi) · Supabase CLI kuruldu (giriş yapılmadı) · `.gitignore`'a `supabase/.temp/`
- **Doğrulama:** `bilirkisi_durum__ilerlet` canlıda `etkin=true` (todo.md yanlış biliyordu)
- **Özet/süreklilik düzeni kuruldu (22.08.2026):** `OZET_KOMUTLARI.md` tam içeriği ve `PROJE_OZETI.md`'nin güncel hâli `COWORK.md` ve `AGENTS.md`'ye eklendi · "medipact" kısa komutu `PROJE_OZETI.md`'yi zorunlu okuma listesine aldı · oturum-sonu özet kaydı bağlayıcı kural yapıldı · `skills/medipact-calisma-duzeni/SKILL.md` oluşturuldu (Cowork skill)

---

## 4) Mevcut Durum ve Sıradaki Adım

**Açık kusur (canlı, giderilmedi)**
- "Yeniden öner" yeni aday üretmiyor. Ekrana "Yapıldı: 1 soru başlığı hazırladım / Eksik: iki tarafın onayı bekleniyor / Eksik: görevlendirme kararı sizde" geliyor; "Bu alanda kayıtlı başka uzman yok" satırı gelmiyor. Son denemede "Cevabınızı şu an kaydedemedim" hatası alındı. Ekran kendiliğinden tazelenmiyor
- `foy_gonderildi` tek gönderimde iki kez yazılıyor (aynı foy_id, 22 ms arayla) — yazıcılar `trg_akis_foy` + `hazirlik-foyu-gonder/index.ts:448`. Bugün zararsız (dinleyen kural yok); kural bağlanırsa çift koşar. Fikir: tetikleyici kalsın, koddaki satır kalksın (Code, tek satır, onay bekliyor)

**Canlıda denenmemiş olanlar**
- Kodda hazır, izin satırı ve tablosu canlıda duran yedi özelliğin hiçbiri denenmedi: `elverislilik_kontrol` · `usul_onerileri` · `usul_engelleri` · `belge_ozetleri` · `olay_cizelgesi` · `guc_dengesi` · `iletisim_degisim` (+ braket üçlüsü)
- Bilirkişi akışının uçtan uca canlı testi (beyandan rapora) — tablolar boş
- Devir zinciri kaydı canlıda hiç görülmedi
- Rapor öncesi defter tartımı + dürüstlük bandı: 12.08'de yazıldı, canlı test ve redeploy bekliyor

**Diğer açık teknik kalemler**
- Aşama 7 sunucuya iz bırakmıyor; belge ve imza yazımı tamamen ön yüzde (Code)
- Uzman havuzu 6 uydurma kayıt, dar · havuz yönetim ekranı yok (70 başlık görülemiyor/kapatılamıyor — kurucu: şimdi değil)
- `config.toml`'da `bilirkisi-secim` bloğu yok (acil değil) · Lovable'ın iki güvenlik bulgusuna bakılmadı
- Değerlendirme seti yok (10 uydurma test dosyası + beklenen çıktılar) · `taslak-denetim` beklemede, şablonlara bağlı
- `AGENTS.md` "Kısayol kelimeleri" bölümü baştaki altı maddelik okuma sırasıyla çelişiyor
- Elenen bulguların iz kaydı ve taraf gizli belge kanalının gerçek hesapla görsel testi yapılmadı; evrak tespit ajanı park
- Denetimin bakmadığı yerler: cron kayıtları · migration geçmişi · içeriği yanlış olabilecek politikalar

**Kayıt borcu**
- `todo.md` üst bloğunda "sıradaki iş" olarak denetim bulguları duruyor; ürünün gerçek sırası `yol-haritasi.md`'de. Yeni sohbet yanlış listeyi devraldı — blok yol haritasına göre yeniden yazılmalı (kurucu onayı bekliyor)
- 11 veritabanı tetikleyicisi `tasks/kurulu-envanter.md`'de yok → ikinci kez kurulma riski
- `tasks/durum-ayiklama.md`: 41 bayat maddenin BİTTİ / YARIM / YOK dökümü (Code)
- 1–3. denetim kalemlerinin sonucu ve son turda konan çalışma kuralları todo.md'ye işlenmedi; oturumlar arası devir notu yok
- Hafıza boş — 45 dosya gitti; kurallar COWORK.md'ye taşındı

**Yalnız kurucuda olan, pilotu durduran yedi kalem (09.08'den beri değişmedi)**
1. Dava şartı + ihtiyari birer örnek tutanak ve bir bilgilendirme belgesi örneği
2. Süre ve istisna tablosunun doğrulanması
3. Aydınlatma metni + oturum kaydı rıza ibaresi
4. Belge saklamada 5 yıl mı 10 yıl mı kararı
5. Pilot aday listesi
6. Paket fiyatları ve analiz kotası
7. Evrak tespit ajanı için beklenen-belge listeleri

**İleriye kalem**: risk ve finansal analiz ajanı (her taraf kendi evrakıyla, kör veri korunarak). Kurucu pilotta ürünü gezip benzer dil/bütünlük kusurlarını bildirecek.

**Sıradaki adım**
1. "Yeniden öner" kusuru için teşhis komutu — kurucu onayı bekliyor
2. `todo.md` üst bloğunun `yol-haritasi.md`'ye göre düzeltilmesi
3. Kurucunun seçimi: (a) yazılmış yedi özelliği canlıda tek tek denemek, (b) örnek tutanakları verip tutanak otomasyonunu açmak

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
  yapılması gerektiği — hangi dosya, hangi adım, kimde (Code / Codex / kurucu).
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
