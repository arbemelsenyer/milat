# MediPact — Ana Durum Özeti (tek ve güncel)

Son güncelleme: 23.08.2026. Çelişkilerde en yeni hâl alınmıştır.

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
- Özet düzeni: `OZET_KOMUTLARI.md` · `PROJE_OZETI.md` (bu dosya) · `skills/medipact-calisma-duzeni/SKILL.md`
- Kayıt: `tasks/todo.md` (tek kayıt yeri; geçerli durum yalnız üstteki "Nerede kaldık" bloğu) · `lessons.md` · `yol-haritasi.md` · `kurulu-envanter.md` · **YENİ: `tasks/durum-ayiklama.md`** (48 bayat maddenin dökümü)

**Akış omurgası**
- `akis_olaylari` (olay) → `akis_kurallari` (9 satır) → `akis-yurut` (koşucu, yalnız `etkin` alanına bakar — `akis-yurut/index.ts:657`)
- `ajan-nobetci` = gözcü kolu · `akis-yurut` = yürütücü kolu · ana ajan tektir
- Olay yazıcıları iki katmanda: kod (`_shared/olay.ts` · `olayYaz`) + 11 veritabanı tetikleyicisi — tetikleyiciler depoda görünmez
- ~75 edge fonksiyon; ortak motor `_shared/anlatim.ts` (24 ad) — 39 fonksiyon okuyor
- Dağıtım zinciri: push → Lovable görüyor mu → SQL → redeploy → publish → Ctrl+Shift+R → test

**Tablolar**
`akis_olaylari` · `akis_kurallari` · `agent_states` · `ajan_gorevleri` · `ajan_deneyim` · `ajan_bellek` · `gundem_kalem_havuzu` · `experts` (6 uydurma kayıt) · `bilirkisi_secim_beyani` · `bilirkisi_onerileri` · `bilirkisi_taraf_yanitlari` · `bilirkisi_evrak_kumesi` · `bilirkisi_raporlari` · `case_expert_assignments` · `kayit_onaylari` · `yz_beyan_onaylari` · `notification_preferences`

**Ekranlar**: `/legal-reasoning` (arabulucu, MediationEngine) · `/case-room/:id` · `/cases/:id` · `/bilirkisi` · `/verilerim`

**Test dosyaları**: MP-2026-1016 · id `5186ee1d-bc52-4dc1-b03a-1fe75844a14e` (kira, aşama 4) · case `eb70595a-5d40-4b92-9e7a-c0c91318445a`

**Son commit zinciri**: `cf38ef2` → `708031c` → `e0ece8d` → `ded25b4` → `18593c3` (hepsi `main`'de)

**Kişi**: Emel — arabulucu-hukukçu, yazılımcı değil; teknik dil kullanılmaz.

---

## 2) Alınan Kararlar ve Kurallar

**İş bölümü**
- Code = kod, dosya, commit, push · Cowork Claude = SQL, `akis_kurallari` satırları, politika, redeploy/publish, canlı test · Kurucu = karar ve canlı test
- **23.08 güncellemesi:** dal düzeni bitti — geliştirme ve push doğrudan `main`'e yapılır (`claude/medipact-uanila` main'e alındı)
- **23.08 istisnası:** Code, kurucunun açık talimatıyla SALT OKUMA SQL sorgusu (Cowork paketi) yazabilir; migration/politika/kural satırı hâlâ yazamaz

**Çalışma kuralları**
- Kapı satırı beş alan: `okudum | yapılmış mı | sıra | kayıt | uydurma`
- Okumadan komut yok, tanı yok; kanıtsız iddia yasak, "bilmiyorum" zorunlu
- Code'a keşif raporu/plan sunulmaz, doğrudan iş
- Ortak dosya (`_shared/`) değişirse onu okuyan bütün fonksiyonlar redeploy edilir
- Lovable'ın "publish"i edge fonksiyonu deploy ETMEZ — redeploy ayrı satırdır

**Ürün dili (21.08 + 23.08)**
- Ajan öznel/duygusal ifade kullanmaz; gerekçe sorusu sorulmaz
- Soru kalıbı: durum (tek cümle) + dayanak (tek satır) + iki düğme
- **Tek ad kuralı:** aynı işi yapan metin üründe TEKtir. Aday yenileme her yüzeyde **"Yeniden öner"**; farklı işi yapan düğme kendi adını taşır (**"Talimatı reddet"**)
- Bir düğmenin adı çağırdığı fonksiyonu tarif eder; iki ayrı iş aynı adı taşıyamaz

**Ürün çekirdeği**
Tek ana ajan · beş insan kapısı · kör veri sorguda · devirde içerik geçmez · uçtan uca otonom

**Yetki ölçütü (23.08)**
Dosya yetkisi TEK ölçütle sorulur: yönetici · görevli arabulucu (`assigned_mediator_id`) · dosya sahibi (`cases.user_id`). Yeni bir kapı yazarken mevcut kapıların ölçütü grep'lenip aynısı kullanılır. Bu bir genişletme değil, eşitlemedir; RLS'e dokunulmaz.

---

## 3) Tamamlanan İşler

**Önceki oturumlarda**
- Defter onarımı (`ajan_deneyim` `deneme_no` kısıtı) · öğrenme süzgeci muafiyeti
- Bilirkişi katmanı 7 bölüm, 4 yeni fonksiyon, 39 fonksiyon yayında
- Döngü kusuru (`olayYazDegistiyse` kapısı) · nöbetçi mükerrer yazım (`startsWith` → `includes`)
- Gerekçesinde "KAPALI" yazıp `etkin=true` duran üç kural gerçekten kapatıldı
- Denetim 1. tur kapandı (üçü de kod işi çıkmadı)
- Soru kalıbı + bilirkişi tükenme akışı kodlandı (`cf38ef2`), redeploy + publish
- Özet/süreklilik düzeni kuruldu (22.08): `OZET_KOMUTLARI.md` · `PROJE_OZETI.md` · skill

**23.08 oturumunda**
- **"Yeniden öner" kusurunun teşhisi (`e0ece8d`)** — üç bulgu: (1) sohbetteki düğme bilirkişi koluna hiç bağlı değildi, talimat reddine bağlıydı · (2) ekranda görülen metin başka fonksiyonun (`bilirkisi-sorulari`) çıktısıydı, ayrıca aynı iş iki yüzeyde iki farklı ad taşıyordu · (3) `taraf-cevap` arabulucuyu yalnız `assigned_mediator_id`den tanıyordu, `bilirkisi-secim` ise üç ölçütten
- **Üç kararın uygulanması (`ded25b4`)** — (a) sohbetteki "Yeniden öner" `bilirkisi-secim` `ikinci_tur` adımına bağlandı (yeni `bilirkisiAlani()` + `bilirkisiYenidenOner()`); talimat reddi SİLİNMEDİ, "Talimatı reddet" adıyla ayrı düğme oldu · (b) panelde "İkinci tur" → "Yeniden öner" (adım değişmedi) · (c) `taraf-cevap` üç ölçütle tanıyor, RLS değişmedi. Belge kaydı aynı commit'te (mimari/06, mimari/10, yol-haritasi.md)
- **Dal düzeni:** `claude/medipact-uanila` `main`'e alındı; bundan sonra push `main`'e
- **`tasks/durum-ayiklama.md` (`18593c3`)** — 48 bayat maddenin dökümü: BİTTİ 26 · YARIM 13 · YOK 8 · canlı test bekleyen 1. todo.md kutularına dokunulmadı
- **lessons.md'ye iki yeni ders (23.08):** iki fonksiyon iki farklı yetki ölçütüyle bakarsa biri sessizce 403 döner · aynı işi iki ad taşıyorsa kusur "çalışmıyor" diye rapor edilir

---

## 4) Mevcut Durum ve Sıradaki Adım

**Kurucuda bekleyen — YAYIN VE TEST (ilk iş)**
1. **REDEPLOY: `taraf-cevap`** (yalnız o; `_shared/anlatim.ts` DEĞİŞMEDİ, fan-out yok)
2. **PUBLISH: evet** (`AjanPenceresi.tsx` + `BilirkisiAlanlari.tsx`)
3. Canlı test: bilirkişi bildiriminde "Yeniden öner" yeni aday çıkarıyor mu, aday yoksa "Bu alanda kayıtlı başka uzman yok" cümlesi geliyor mu, sohbetten cevap yazınca "Cevabınızı şu an kaydedemedim" hatası bitti mi
4. **TİP DENETİMİ ÇALIŞTIRILAMADI** — bu ortamda `node_modules` yok, `bun install` özel pakete 403 dönüyor. Üç dosyanın sözdizimi ayrı ayrı doğrulandı (PARSE OK), tip denetimi kurucunun makinesinde ya da Lovable derlemesinde görülecek

**Cowork'te bekleyen — tek SQL sorgusu (paket todo.md blok 109'da hazır)**
Sohbet penceresi kendiliğinden tazelenmiyor. Tek okuma sorgusu: `agent_states` ve
`ajan_gorevleri` `supabase_realtime` yayınında mı, `relreplident` ne? Sonuca göre
tabloların anlık yayına alınması gerekebilir.

**Açık kusur (canlı, giderilmedi)**
- `foy_gonderildi` tek gönderimde iki kez yazılıyor (`trg_akis_foy` + `hazirlik-foyu-gonder/index.ts:448`). Bugün zararsız; kural bağlanırsa çift koşar. Fikir: tetikleyici kalsın, koddaki satır kalksın (Code, tek satır, onay bekliyor)
- Arabulucunun sohbet listesi yalnız `durum='bekliyor'` satırlarını okuyor; `bilirkisi-secim`'in `tikanma` · `evrak_oner` · `dis_aday` bildirimleri `onay_bekliyor` yazıldığı için sohbete HİÇ düşmüyor. Yeni "Yeniden öner" düğmesi bugün pratikte yalnız `aday-yok` ve `arabulucu-secsin` satırlarında görünür. Kurucu kararı bekliyor
- `akis-onayla` yetki ölçütü okunmadı; "Onayı şu an kaydedemedim" aynı kökten geliyor olabilir

**Canlıda denenmemiş olanlar**
- Yedi özellik: `elverislilik` · `usul-onerisi` · `usul-engeli` · `belge-ozeti` · `olay-cizelgesi` · `guc-dengesi` · `iletisim-degisim` (+ braket üçlüsü)
- Bilirkişi akışının uçtan uca canlı testi (beyandan rapora) — tablolar boş
- Devir zinciri kaydı canlıda hiç görülmedi
- Rapor öncesi defter tartımı + dürüstlük bandı

**48 maddenin dökümünden çıkan boşluklar (yeni, `tasks/durum-ayiklama.md`)**
- YOK (8): PWA+SMS girişi · sessiz canlı kokpit · oturum erteleme tutanağı · tıkanma çözücü · vekil ekranı (kararla) · "ne yapar/ne yapmaz" tanıtım ekranı · BATNA'nın taraf yüzü · ses/döküm saklama ayrımı
- En kritik YARIM'lar: iletişim tercihi (ekran var, hiçbir gönderim yolu okumuyor) · kayıt protokolü (48 saat kuralı ve "onay yoksa kayıt açılmaz" kapısı yok) · görüşme kaydı (yazıya dökme ve otomatik silme yok) · kaynak künyesi kuralı (ürün genelinde zorunlu değil)

**Diğer açık teknik kalemler**
- Aşama 7 sunucuya iz bırakmıyor; belge ve imza yazımı tamamen ön yüzde (Code kuyruğunda SIRADAKİ, kurucu onayı bekliyor)
- Uzman havuzu 6 uydurma kayıt · havuz yönetim ekranı yok (kurucu: şimdi değil)
- `config.toml`'da `bilirkisi-secim` bloğu yok · Lovable'ın iki güvenlik bulgusuna bakılmadı
- Değerlendirme seti yok (10 uydurma test dosyası + beklenen çıktılar)
- 11 veritabanı tetikleyicisi `tasks/kurulu-envanter.md`'de yok → ikinci kez kurulma riski
- Denetimin bakmadığı yerler: cron kayıtları · migration geçmişi · içeriği yanlış olabilecek politikalar

**Yalnız kurucuda olan, pilotu durduran yedi kalem (09.08'den beri değişmedi)**
1. Dava şartı + ihtiyari birer örnek tutanak ve bir bilgilendirme belgesi örneği
2. Süre ve istisna tablosunun doğrulanması
3. Aydınlatma metni + oturum kaydı rıza ibaresi
4. Belge saklamada 5 yıl mı 10 yıl mı kararı
5. Pilot aday listesi
6. Paket fiyatları ve analiz kotası
7. Evrak tespit ajanı için beklenen-belge listeleri

**Sıradaki adım**
1. Kurucu: redeploy (`taraf-cevap`) + publish + canlı test
2. Cowork: blok 109'daki tek SQL sorgusu, sonucuna göre anlık yayın kararı
3. Kurucu kararı: (a) `durum='onay_bekliyor'` bildirimleri sohbete düşsün mü ·
   (b) 48 maddelik dökümün kutuları işaretlensin ve YOK'lar yol haritasına sıraya
   girsin mi · (c) Aşama 7'nin sunucuya iz bırakması işine başlansın mı
