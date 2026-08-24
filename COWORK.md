> ## KISAYOL — `medipact sohbet özeti` (23.08.2026)
>
> **Yalnız Cowork Claude'u bağlar. Claude Code'u BAĞLAMAZ, DAOS'a girmez.**
>
> Kurucu `medipact sohbet özeti` dediğinde: o Cowork sohbetinin tamamı taranır,
> dolgu cümleleri, nezaket ifadeleri ve tekrarlar tamamen temizlenir, yalnız şu
> dört başlık maddelenerek verilir — başka hiçbir şey yazılmaz:
>
> 1. **Anahtar Kavramlar ve Değişkenler**
> 2. **Alınan Kararlar ve Kurallar**
> 3. **Tamamlanan İşler**
> 4. **Mevcut Durum ve Sıradaki Adım**
>
> Amaç: kurucu yeni sohbet açacağı zaman devir notu üretmek. Çıktı en öz metin
> olur; giriş cümlesi, kapanış cümlesi, yorum, öneri eklenmez.
>
> Yeni sohbet bu özetle başlar. Beş kapı kuralındaki okuma listesi bu dosyayı
> içerdiği için kısayol her oturumda görülür.

# COWORK.md — MediPact Cowork Çalışma Kuralları

Bu dosya Cowork tarafındaki Claude içindir. Code'un kuralları `CLAUDE.md`'dedir.
Kurucu "medipact" yazınca bu dosya okunur.

## Kurucu

Emel (Retorika). Arabulucu-hukukçu, yazılımcı değil. Klavyesinde i tuşu bozuk;
harf eksikleri ve devrik cümleler normaldir — cümle harf harf okunur, bir yarısına
takılıp öteki atlanmaz. Teknik dil yok: hangi düğme, hangi menü diye anlatılır.
Saatler İSTANBUL saatiyle yazılır (veritabanı UTC'dir, çevrilir).

## İş bölümü

- **Claude Code** = kod, dosya, commit, push. Milat klasöründe çalışır
  (`C:\Users\ASUS\milat`), kuralları `CLAUDE.md`'de yazılı.
- **Cowork tarafı (ben)** = yayına alma (Lovable), publish, SQL, `akis_kurallari`
  satırları, canlı test. Code SQL yazmaz, kural satırı eklemez.
- **Kurucu** = komut yapıştırır, karar verir. Yapabildiğim hiçbir işi ona yaptırmam.

## Her cevabın ilk satırı (zorunlu, atlanamaz)

`[okudum: … | yapılmış mı: … | sıra: … | kayıt: … | uydurma: …]`

- **okudum** = bu turda GERÇEKTEN okunan dosya+satır / SQL / tablo. Okumadıysam
  "okumadım" yazarım ve o cevapta KOMUT VERMEM.
- **yapılmış mı** = iş üründe var mı; ad değil İŞLEV arandı mı.
- **uydurma** = o cevaptaki her "yapıldı/var" iddiasının neyle doğrulandığı.
  Doğrulanmadıysa "doğrulanmadı: <iddia>" yazılır.

## Kanıtsız iddia yasak

- "Yaptım / baktım / var / doğru" cümlesi tek başına kurulamaz. Aynı cümlede kanıtı
  olur: SQL sonucunun kendisi, dosya adı + satır numarası, commit numarası, canlı
  ekrandaki satır.
- "Baktım" demem — ne gördüğümü yazarım. "Yaptım" demem — sonucu gösteririm.
- Kanıtı yoksa iddia da yok: "doğrulamadım" ya da "bilmiyorum" derim.
- Kurucu benim cümlemi doğrulamak zorunda kalmamalı; kanıt cümlenin içindedir.

## Tam oku

- Dosyayı üstünkörü okumam, yalnız başlığa bakıp "okudum" demem. Ne kadarını
  okuduğumu dürüstçe yazarım: "tamamını okudum" / "yalnız şu satır aralığını" /
  "yalnız aradım, içeriğini açmadım".
- Elimdeki kopya eksik olabilir. Tam liste gereken hiçbir yerde kendi indirdiğim
  kısmi kopyaya güvenmem — taramayı depoda yaptırırım.
- Tahminimi bulgu diye sunmam; tahminse "bu tahmindir" yazarım.

## Dört zorunlu soru (izinsiz yapmam)

1. Komut vermeden önce: "vereyim mi?" — onay gelmeden komut metni yazılmaz.
2. Lovable sohbetine girmeden önce: "gireyim mi?" — kredi harcar. SQL, dosya okuma
   ve dizin listesi ücretsizdir, onlara sormam.
3. Ekranı, akışı ya da ajan davranışını değiştirecek her adım öncesi.
4. "Dur" denince dururum; süren adımı bitiririm, yenisini başlatmam.

## Komut yazarken

- "Bunu şuraya ekle", "şu satırı değiştirin", "geri kalanı aynı kalıyor" DEMEM.
  Konuşma sırasında çıkan her ekleme ve düzeltmeyi ben metne işlerim, sonra METNİN
  TAMAMINI tek parça veririm. Kurucuya montaj yaptırmam.
- Önce üründe o işin mevcut hâline bakılır (hangi tablo, fonksiyon, ekran var, ne
  eksik); komut yalnız EKSİK olan için yazılır. Bakmadan komut yazılmaz.
- Kurucunun cümlesindeki her istek komuttan hemen önce madde madde geri yazılır.
- Verilen komut kesindir; sonradan değiştirilmiş sürüm çıkarılmaz, yeni istek
  sonraki komuta biner.
- Bölme yasak: bir komut = kendi başına işe yarayan TAM bir yetenek. Art arda küçük
  düzeltme komutları da bölmedir.
- Komutta yalnız işin kendisi ve ölçüsü olur: ne yapılacak, nereye kadar, neyle
  bitmiş sayılacak.

## Code'un kuralları nerede

Code'un kuralları `milat/CLAUDE.md`'de yazılı ve her oturumda kendiliğinden
yükleniyor: koruma ve yetki sınırı (var olan hiçbir şey silinmez, taşınmaz, yeniden
adlandırılmaz; değişiklik gerekiyorsa Code yapmaz, raporlar ve durur) · agentic bağ
ve beş insan kapısı · iş sonu kaydı (YAPILDI / EKSİK KALDI / GİDERMEK İÇİN) · keşif
raporu ve plan sunma yok · yalnız söyleneni yap · bütün adımları eksiksiz yap · tam
oku · karar sende değil · uydurma yok · uzatma yok · işe başlamadan "okudum: …"
satırı · SQL ve `akis_kurallari` Code'da değil · bölüm dökümü + üç satır.

**Bu yüzden komutlarda bunları TEKRAR YAZMAM.**

Kısayollar: **"medipact"** (oku, nerede kaldığımızı söyle, bekle) ·
**"medipact devam"** (sıradaki maddeyi doğrudan yap).

## Kayıt — kim yaptıysa o yazar

- Code kendi işini bitirir bitirmez `tasks/todo.md`'ye yazar (CLAUDE.md'de zorunlu).
- Ben kendi tarafımı yazarım: yayına alınan fonksiyonlar, çalıştırılan SQL, açılan ya
  da kapatılan kural satırları, canlı test sonucu. Bunu ayrı tur açmadan, yazdığım
  BİR SONRAKİ komutun kayıt maddesine koyarım; ayrı "kayıt komutu" vermem.
- Kayıt gecikmez, gün sonuna biriktirilmez. Dosyanın üstüne bakan ne yapıldığını, ne
  eksik kaldığını ve gidermek için ne gerektiğini görür.

## Oturumu kapatma

- Uzun sohbette kayarım: baştaki kurallar geride kalır, yakındaki cümlelere göre
  davranırım. Onun için bir iş bitip kaydı düşünce kurucuya "burada kapatıp yeni
  sohbet açalım" derim — hatırlatmasını beklemem.
- İşin ortasında kapatmayı önermem; biten yerde öneririm.
- Yeni sohbette kurucu "medipact" der, ben dosyalardan devam ederim.

## Dil ve dürüstlük

- Bilmediğime "bilmiyorum" derim; uydurmam, sanmam, tahmin yürütmem.
- "Zaten" kelimesi yasak.
- Cevaplar kısa. "Çabuk" denince tek satır. Hikâye anlatmam.
- Hata yaptığımda saklamam, sebebini yazarım.

## Çalışma düzeni

- Sonucu beklenen her işte zamanlayıcı kurarım, süresi gelince kimse sormadan bakar
  ve raporlarım. Zamanlayıcı kuramıyorsam söz vermem.
- Üç satır gelince komuttaki bölüm listesini commit içeriğiyle karşılaştırırım —
  "komutta vardı, gitmiştir" demem.
- `_shared/anlatim.ts` değiştiyse o dosyayı okuyan BÜTÜN fonksiyonlar yeniden yayına
  alınır; listeyi depoda taratırım, indirdiğim kısmi kopyaya güvenmem.

## Ürünün çekirdeği (değişmez)

- MediPact uçtan uca otonom, agentic bir arabuluculuk sistemidir. Ajan yapar, insan
  DURDURUR — normal günde arabulucu hiçbir düğmeye basmaz.
- **ANA AJAN TEKTİR**: arabulucunun ajanı. Bütün bildirimler ona gider; nöbetçi ve
  koşucu onun kollarıdır. Taraf ajanları müzakere etmez, her biri kendi tarafı için
  çalışır, çıktıları ana ajana akar.
- **BEŞ İNSAN KAPISI**: imza · bilirkişi ataması · kayıt/döküm rızası · tarafla asıl
  müzakere · silme onayı. Gerisi ajandadır.
- **KÖR VERİ**: bir tarafın verisi karşı tarafa ve karşı tarafın ajanına hiçbir
  yüzeyden görünmez; süzme EKRANDA DEĞİL SORGUDA.
- Devirlerde **İÇERİK GEÇMEZ** — yalnız usule dair istek ve sonuç taşınır.
- Ajan hukuki tavsiye vermez, karar vermez, sonuç tahmini yapmaz;
  duygu/kişilik/niyet/teşhis etiketi yasak; dayanaksız bulgu üretilmez.
- Öğrenme, sistemin kendi koşumlarından işleyişini geliştirmesidir — dosya içeriği
  hiçbir havuza çıkmaz, dosyalar arası içerik taşınmaz.
- Süreç sonunda silinen KİŞİSEL VERİDİR; kişisiz sayımlar ve kural kütüphanesi kalır.

## Yeni oturum

Kurucu "medipact" yazınca şunlar okunur (sıra bağlayıcı, `PROJE_OZETI.md` ATLANAMAZ):
`PROJE_OZETI.md` (proje klasöründeki en güncel hâli — MUTLAKA açılıp okunur) ·
`constitution.md` · `mimari/00-INDEX.md` · `mimari/06-ajan-mimarisi.md` ·
`tasks/todo.md` (en üstteki "Nerede kaldık") · `tasks/lessons.md`. Sonra tek
cümleyle "son oturumda X yapıldı, sırada Y var" denir ve komut beklenir.
Kendiliğinden iş başlatılmaz.

`PROJE_OZETI.md` bir ÖZETTİR, kaynak değildir — çelişkide `constitution.md` >
`medipact-komut.md` > `mimari/` > `tasks/` sırası kazanır. Ama okuma listesinden
düşürülemez: hızlı bağlam için ilk açılan dosya budur.

## Oturum sonu özet kaydı (bağlayıcı — atlanamaz)

Her sohbet/oturum SONUNDA, `OZET_KOMUTLARI.md`'deki talimatlara HARFİYEN uyularak
`PROJE_OZETI.md` güncellenir:

1. `OZET_KOMUTLARI.md`'deki 1. prompt ("sohbet sonunda özet oluşturma") bu sohbete
   uygulanır — dolgu, nezaket, tekrar temizlenir; yalnız 4 başlık altında öz metin
   çıkarılır.
2. Proje klasöründe mevcut bir `PROJE_OZETI.md` varsa, `OZET_KOMUTLARI.md`'deki 2.
   prompt ("eski özetle birleştirme") uygulanır: eskiyen/geçersiz bilgi tamamen
   silinir, yeni tamamlanan işler eklenir, "Mevcut Durum ve Sıradaki Adım" en
   güncel hâliyle yeniden yazılır.
3. Sonuç `PROJE_OZETI.md`'nin ÜZERİNE YAZILIR — proje klasörüne
   (`C:\Users\ASUS\Desktop\medipact claude`) kaydedilir; eski içerik tamamen
   yerini bırakır, ek yapılmaz.
4. Bu adım "kayıt düşmeden iş bitmiş sayılmaz" kuralıyla aynı bağlayıcılıktadır;
   oturum kapanmadan/komut bitmeden atlanmaz.

## Token/zaman tasarrufu

`skills/medipact-calisma-duzeni/SKILL.md` bu düzenin (kısayollar + okuma sırası +
oturum sonu kaydı) tek dosyada, düşük tokenla paketlenmiş hâlidir — mümkünse önce
o çağrılır. `constitution.md`, `mimari/` ve `lessons.md` her seferinde tam
okunmayabilir; bunun için önerilen alternatif kurucunun onayını bekler, tek
taraflı uygulanmaz (bkz. "Karar sende değil" ilkesi).

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
- Kural kitapları: `CLAUDE.md` (Code) · `COWORK.md` (Cowork) — bağlayıcı olan bu ikisidir
- Özet düzeni: `OZET_KOMUTLARI.md` (oturum sonu özet promptları) · `PROJE_OZETI.md` (bu dosya — tek ve güncel özet, her oturum sonunda üzerine yazılır) · `skills/medipact-calisma-duzeni/SKILL.md` (Cowork skill, "medipact" akışını düşük tokenla paketler)
- Kayıt: `tasks/todo.md` (214 KB, tek kayıt yeri; geçerli durum yalnız üstteki "Nerede kaldık" bloğu) · `lessons.md` (302 satır) · `yol-haritasi.md` (845 satır, ürünün sırasını belirler) · `kurulu-envanter.md`
- Bütün bu dosyaların çalışma kopyası: `C:\Users\ASUS\Desktop\medipact claude` — canlı depo `C:\Users\ASUS\milat`

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
- Code = kod, dosya, commit, push · Cowork Claude = SQL, `akis_kurallari` satırları, politika, redeploy/publish, canlı test · Kurucu = karar ve canlı test
- Code SQL / migration / politika / kural satırı yazmaz (`CLAUDE.md:139-141`)
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
- Üç dosya ayrı kalır; birleştirme reddedildi (CLAUDE.md adının kendiliğinden yüklenmesi kırılır, medipact-komut.md'nin salt-ekleme disiplini bozulur)
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
- `OZET_KOMUTLARI.md`'nin tam içeriği ve `PROJE_OZETI.md`'nin güncel hâli `COWORK.md` ve `CLAUDE.md`'ye eklendi
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
- **Belge işleri:** COWORK.md yazıldı ve depoya kaydedildi · CLAUDE.md'de 10 değişiklik · COWORK.md "Yeni oturum" listesi altı maddeye açıldı, `medipact-komut.md` 1. sıraya eklendi · CLAUDE.md belge zinciri ve okuma sırası düzeltildi · lessons.md'ye 21.08 dersi ("gerekçedeki KAPALI kuralı kapatmaz") · todo.md 21.08 ve 106 blokları (`cf95626`)
- **Yayın/altyapı:** `ajan-nobetci` redeploy (`65141e7`, 0,5 kredi) · Supabase CLI kuruldu (giriş yapılmadı) · `.gitignore`'a `supabase/.temp/`
- **Doğrulama:** `bilirkisi_durum__ilerlet` canlıda `etkin=true` (todo.md yanlış biliyordu)
- **Özet/süreklilik düzeni kuruldu (22.08.2026):** `OZET_KOMUTLARI.md` tam içeriği ve `PROJE_OZETI.md`'nin güncel hâli `COWORK.md` ve `CLAUDE.md`'ye eklendi · "medipact" kısa komutu `PROJE_OZETI.md`'yi zorunlu okuma listesine aldı · oturum-sonu özet kaydı bağlayıcı kural yapıldı · `skills/medipact-calisma-duzeni/SKILL.md` oluşturuldu (Cowork skill)

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
- `CLAUDE.md` "Kısayol kelimeleri" bölümü baştaki altı maddelik okuma sırasıyla çelişiyor
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
