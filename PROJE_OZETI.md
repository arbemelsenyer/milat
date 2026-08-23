# MediPact — Ana Durum Özeti (tek ve güncel)

Kaynak: medipact 2 → medipact 4 → medipact 3 → medipact 1 (eskiden yeniye). Çelişkilerde en yeni hâl alındı.

---

## Doğrulama Komutları

`package.json` üzerinden tespit edildi (23.08.2026). Bu listede olmayan bir komut
"herhalde budur" diye çalıştırılmaz; `package.json` değişirse liste güncellenir.

| Amaç | Komut |
|---|---|
| Build | `npm run build` |
| Lint | `npm run lint` |
| Test | `npm run test` (vitest run) |
| Type check | `npx tsc --noEmit -p tsconfig.app.json` |
| Dev sunucu | `npm run dev` |

Depoda `bun.lock` var; bun kullanılıyorsa aynı script'ler `bun run <script>` ile
çalışır. `package.json` içinde ayrı bir `typecheck` script'i yoktur.

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
- **Çift uzantı düzeltmesi (22.08, Code, `708031c`, push edildi):** `CLAUDE.md.md → CLAUDE.md` · `COWORK.md.md → COWORK.md` · `OZET_KOMUTLARI.md.md → OZET_KOMUTLARI.md` · `PROJE_OZETI.md.md → PROJE_OZETI.md` (`git mv`, geçmiş korundu) + `.claude/skills/medipact-calisma-duzeni/SKILL.md` eklendi
- **"Yeniden öner" kusuru teşhis edildi (22.08, Cowork)** — kök neden bulundu, düzeltme YAPILMADI (komutlar hazır, kurucuda):
  - `bilirkisi_onerileri` canlıda **0 satır** — aday listesi hiç üretilmemiş
  - `case_expert_assignments`'ta test dosyası için `55dd060f…` `pending` satırı var (21.08 11:05); `bilirkisi_onerildi` olayını **veritabanı tetikleyicisi** yazmış (`akis_olay_yaz_bilirkisi`, INSERT dalı — gövde `{assignment_id, expert_id, status}`), edge fonksiyon değil (o `{alan, aday_sayisi, tur, alan_turu}` yazar, `index.ts:468-471`)
  - Kural sıra 35 (`bilirkisi_onerildi__sorular`) bu olayı "adaylar çıktı" diye okuyup `bilirkisi-sorulari`'nı koşturdu → dört `taraf_sorusu` satırı + devir satırı (11:06)
  - Ekranda görülen "1 soru başlığı hazırladım / iki tarafın onayı bekleniyor / görevlendirme kararı sizde" metni **soru kolunun** anlatımı, aday kolunun değil
  - Kurucunun bastığı satır `[konu:devir:bilirkisi-sorulari]` idi (`ajan_gorevleri aa5f02d0`, sonuç "arabulucu yeniden öneri istedi" = `AjanPenceresi.tsx:633`'ün sabit metni)
  - "Yeniden öner" tek yerde tanımlı (`AjanPenceresi.tsx:1034`) ve `talimatReddet`'i çağırıyor (`624-638`) — `bilirkisi-secim`'e **hiçbir çağrı yok**; `aday_cikar`/`ikinci_tur` yalnız `BilirkisiAlanlari.tsx:80`'de
  - `aday_cikar`/`ikinci_tur` başarılı dalında **`anaAjanaBildir` yok** (`index.ts:455-477`) — adaylar ajan penceresine hiç düşmüyor; todo.md 107'deki "Aday sunulur → Onayla/Yeniden öner" tasarımı ajan penceresinde hiç kurulmamış
  - "Bu alanda kayıtlı başka uzman yok" cümlesi (`index.ts:434`) bu yüzden hiç üretilmedi; "Cevabınızı şu an kaydedemedim" ise `762`'deki `[bilirkisi:aday-yok:]` kapısına takılmayıp `taraf-cevap` dalına düşmekten (`792` → `804`)
  - **Bilinmiyor:** `case_expert_assignments`'a o `pending` satırın nasıl girdiği (öneri tablosu boşken) — doğrulanmadı

---

## 4) Mevcut Durum ve Sıradaki Adım

**Açık kusur (canlı, giderilmedi — teşhis bitti, düzeltme bekliyor)**
- "Yeniden öner" yeni aday üretmiyor. TEŞHİS TAMAM (bkz. Tamamlanan İşler, 22.08). İki ayrı iş çıktı:
  1. **Code (ön yüz + fonksiyon) — komut yazıldı, kurucuda:** `bilirkisi-secim/index.ts` aday yazımından sonra arabulucuya `[bilirkisi:aday:<alan>]` bildirimi yazacak · `AjanPenceresi.tsx`'te bu etiketli satırda "Yeniden öner" `talimatReddet` yerine `ikinci_tur` çağıracak (hata dalında `error.context` gövdesi kalıcı satıra) · aynı satırda "Onayla" gösterilmeyecek, "Adayı Bilirkişi bölümünden seçip atayın" satırı olacak · dokunulan fonksiyon redeploy + publish
  2. **Cowork (SQL) — KURUCU KARARI BEKLİYOR:** `bilirkisi_onerildi` olayını iki yazıcı iki ayrı anlamda yazıyor. (a) tetikleyicinin INSERT dalı `bilirkisi_atamasi_acildi` yazsın, `bilirkisi_onerildi` yalnız gerçek aday listesine kalsın — sorular aday çıkınca hazırlanır; (b) tetikleyici kalsın, sıra 35 kuralı `bilirkisi_atamasi_acildi`'ya taşınsın — sorular atamada hazırlanır (bugünkü fiili davranış)
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

**Sıradaki adım (23.08 sabahı buradan devam)**
1. **Kurucu kararı:** `bilirkisi_onerildi` olayının ikiye ayrılmasında (a) mı (b) mi — bu karar verilmeden SQL yazılmayacak
2. "Yeniden öner" Code komutu kurucuya verildi; Code'a yapıştırılıp koşturulacak, sonra `bilirkisi-secim` redeploy + publish, ardından canlı test
3. Canlı test zinciri (hiç denenmedi): tükenme → alan yazma → ikinci tur → üçüncüde erteleme + "Bilirkişiden vazgeç" düğmesi
4. `todo.md` üst bloğunun `yol-haritasi.md`'ye göre düzeltilmesi
5. Kurucunun seçimi: (a) yazılmış yedi özelliği canlıda tek tek denemek, (b) örnek tutanakları verip tutanak otomasyonunu açmak

**Masaüstü çalışma kopyası uyarısı**
`C:\Users\ASUS\Desktop\medipact claude` içindeki dört dosya HÂLÂ çift uzantılı (`CLAUDE.md.md` vb.); milat'ta düzeldi, masaüstünde düzelmedi. Explorer'da "Dosya adı uzantıları" kutusu işaretlenmeden yapılan düzeltme tutmuyor.
