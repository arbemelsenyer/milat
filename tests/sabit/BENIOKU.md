# `tests/sabit/` — kalıcı SQL metinleri (git'e GİRER)

Burası `tests/gecici/`nin karşıtıdır. `gecici` tek kullanımlık sonda ve deneme
içindir, tamamı `.gitignore`dadır ve **git'e hiç girmez** (CLAUDE.md §22).
Buradaki dosyalar ise **kalıcıdır ve izlenir**; iki sebeple:

1. **Tezgâh onlara bağlı.** `tests/*.test.ts` içindeki bazı denetimler bu SQL
   metinlerini okuyup içeriğini doğruluyor. Dosya git'te yoksa temiz bir
   klonda o tezgâhlar `ENOENT` ile çöker — yani "363/363 yeşil" yalnız bir
   makinede doğru olur. **27.08.2026'da tam bu durumdaydık:** üç tezgâh
   (`kazanim-sayaci` · `kota-kapisi` · `saklama-imha`) `tests/gecici/` içindeki
   izlenmeyen dosyalara bakıyordu.
2. **Canlıda çalıştırılanın kaydı burada.** Aşağıdakilerin bir kısmı canlı
   veritabanında **koşturuldu**. Metni kaybetmek, neyin uygulandığının kaydını
   kaybetmektir.

## İçerik

| dosya | ne | canlıda koştu mu |
|---|---|---|
| `saklama-suresi-politika.sql` | saklama süresi parametre tablosu + periyodik imha kurulumu | **evet** (25–26.08.2026) |
| `baz-cizgi.sql` | arabulucu baz çizgisi tablosu + RLS (H-15/4) | **evet** (26.08.2026) |
| `kota-tablosu.sql` | üyelik/paket/kota parametre tabloları (H-15/3) | **hayır** — madde pilot kapısından düştü, zararsızdır |
| `oksuz-belge-supurgesi.sql` | depodaki öksüz belgelerin kuru dökümü ve süpürme yordamı (HAT H-19) | Bölüm 1–2 okundu; **Bölüm 3 koşmadı** (kurucu kararı bekliyor) |
| `onay-kayitlari-kalici.sql` | "kalıcı" denen onay kayıtları gerçekten kalıcı olsun: bağ kolonları NULL alabilir + FK'ler SET NULL + en dar kimlik damgası (HAT **H-28**) | **hayır** — Cowork koşacak; koşana kadar `yz_beyan_onaylari` satırı olan dosya silinemiyor |
| `yabanci-anahtar-emniyeti.sql` | `ajan_gorevleri.case_id` ve `taraf_musaitlik.party_id` → CASCADE; landmin temizliği + taraf silmenin düzelmesi (HAT **H-30**) | **hayır** — zorunlu değil; bugün kırık bir silme yolu yok |
| `yabanci-anahtar-olcumu.md` | `cases`/`case_parties`e bağlı CASCADE **olmayan** 10 anahtarın canlı ölçümü (30.08.2026) + ölçüm sorgusu | salt okuma — `tests/dosya-verilerini-sil.test.ts` kapsam bekçisi bunu okur |

## Kural

- Bu klasördeki bir SQL'i **Code çalıştırmaz** (CLAUDE.md §10); yazar, Cowork
  ya da kurucu koşar.
- Bir tezgâh bir dosyayı okuyacaksa o dosya **buraya** konur, `gecici`ye değil.
- `yabanci-anahtar-olcumu.md` bir **kayıttır, otorite değildir**. Otorite canlı
  şemadır. Bekçi kodun listelerini korur (biri listeden düşerse yakalar); şema
  kaymasını yakalayan şey, o dosyadaki sorgunun tekrar koşturulmasıdır. H-28 ya
  da H-30 koştuğunda dosya güncellenmelidir.
- Silme yapan bir bölüm varsa dosyanın içinde **açıkça işaretlenir** ve kuru
  döküm bölümü ondan önce gelir.
