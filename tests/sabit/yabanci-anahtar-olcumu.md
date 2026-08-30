# Canlı yabancı anahtar ölçümü — `cases` ve `case_parties`

**Ölçüm tarihi: 30.08.2026 ~10:05 UTC.** Salt okuma; hiçbir şey değiştirilmedi.

Bu dosya bir **kayıt**tır, otorite değildir. Otorite canlı şemadır. Buradaki
liste, `tests/dosya-verilerini-sil.test.ts` içindeki *kapsam bekçisinin*
dayanağıdır: kodun silme listeleri, en son ölçülen şemadaki **her engeli**
karşılamak zorundadır.

## Niye var

30.08.2026'da üç silme kolu da aynı sınıftan kusur verdi ve üçünün de kökü
şuydu: **cascade bir emniyet ağı sanılıyordu.** `cases`/`case_parties`e bağlı
yabancı anahtarların hepsi CASCADE değil; CASCADE olmayanlar ya silmeyi
düşürür (NO ACTION) ya da satırı bağsız bırakır (SET NULL). Hangisinin hangi
davranışta olduğu **ölçülmeden bilinemez** — ve ölçülmediği için üç kez
yanlış varsayıldı.

## Ölçüm sorgusu (tekrar koşturmak için)

```sql
select tc.table_name, kcu.column_name, ccu.table_name as hedef, rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
 and kcu.constraint_schema = tc.constraint_schema
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
 and rc.constraint_schema = tc.constraint_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.constraint_schema = tc.constraint_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and ccu.table_name in ('cases', 'case_parties')
  and rc.delete_rule <> 'CASCADE'
order by rc.delete_rule, tc.table_name, kcu.column_name;
```

CASCADE olanlar buraya yazılmaz: onlar `cases`/`case_parties` silinince
kendiliğinden gider ve hiçbir şeyi bloke etmez.

## SONUÇ — CASCADE OLMAYAN 10 ANAHTAR

### NO ACTION (4) — silmeyi 23503 ile DÜŞÜRÜR, mutlaka ele alınmalı

| tablo.kolon | hedef | kod nerede ele alıyor |
|---|---|---|
| `ajan_gorevleri.case_id` | `cases` | `SILME_SIRASI` — açıkça siliniyor |
| `taraf_musaitlik.party_id` | `case_parties` | `SILME_SIRASI` (`uzeri`) — taraf kimlikleriyle siliniyor |
| `yz_beyan_onaylari.case_id` | `cases` | `KALICI_BAGLAR` — bağ koparılıyor |
| `yz_beyan_onaylari.party_id` | `case_parties` | `KALICI_BAGLAR` — bağ koparılıyor |

> ⚠ Son ikisi **HAT H-28 SQL'i koşana kadar fiilen çalışmaz**: kolonlar NOT NULL
> olduğu için bağ koparılamıyor. Kod bunu sessiz geçmiyor (`uyarilar`a "şema
> düzeltmesi bekliyor (HAT H-28)" yazıyor), ama o dosyanın `cases` satırı
> silinemez halde kalıyor. İlk ikisi için ayrıca **H-30** CASCADE öneriyor —
> zorunlu değil, landmin temizliği.

### SET NULL (6) — satır KALIR, bağı kopar

| tablo.kolon | hedef | satır ne oluyor |
|---|---|---|
| `ajan_deneyim.case_id` | `cases` | **kalır** — `KALICI_BAGLAR`, kurucu kararı (kişisel veri yok) |
| `duzeltme_kayitlari.case_id` | `cases` | **kalır** — `KALICI_BAGLAR`, aynı gerekçe |
| `case_documents.party_id` | `case_parties` | satır zaten `SILME_SIRASI`'nda siliniyor |
| `case_payments.party_id` | `case_parties` | satır `case_id` CASCADE ile gidiyor |
| `case_payments.payer_party_id` | `case_parties` | aynı |
| `braket_denetim_izi.party_id` | `case_parties` | satır `case_id` CASCADE ile gidiyor |

**Yani geride kişisel veri taşıyan öksüz satır kalmıyor.** Kalan üç şey bilerek
kalıyor ve üçü de kişisel veri içermiyor: anonim kapanış istatistiği · öğrenme
kayıtları · (H-28 sonrası) içeriksiz onay kayıtları.

## Bu ölçüm ne zaman yenilenir

- **HAT H-28** SQL'i koştuğunda (dört satır değişir: iki NO ACTION → SET NULL).
- **HAT H-30** SQL'i koştuğunda (iki NO ACTION → CASCADE, tablodan düşerler).
- `cases`/`case_parties`e yeni bir yabancı anahtar eklendiğinde.

Yenilendiğinde bu dosya güncellenir; bekçi buradaki listeyi okuduğu için
güncellenmezse **eski hâli denetlenir**. Bekçinin koruduğu şey KODUN
listeleridir (biri listeden düşerse yakalar); şema kaymasını yakalayan şey
yukarıdaki sorgunun tekrar koşturulmasıdır.
