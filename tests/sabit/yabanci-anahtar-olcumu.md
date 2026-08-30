# Canlı yabancı anahtar ölçümü — `cases` ve `case_parties`

**Ölçüm tarihi: 30.08.2026 ~12:32 UTC** (HAT **H-28** ve **H-30** SQL'leri
Cowork tarafından koşulduktan SONRA). Salt okuma; hiçbir şey değiştirilmedi.

> Önceki ölçüm (aynı gün ~10:05 UTC, SQL'lerden önce) **4 NO ACTION** anahtar
> gösteriyordu. O dört anahtarın ikisi CASCADE (H-30), ikisi SET NULL (H-28)
> oldu. **Şimdi NO ACTION anahtar YOK.**

Bu dosya bir **kayıt**tır, otorite değildir. Otorite canlı şemadır. Buradaki
liste, `tests/dosya-verilerini-sil.test.ts` içindeki *kapsam bekçisinin*
dayanağıdır: ölçülen her anahtarın **kodda bir karşılığı** olmak zorundadır.

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

`kod` sütunu bekçinin okuduğu alandır. Üç değerden biri olabilir:

| değer | anlamı | bekçi ne arar |
|---|---|---|
| `SILME_SIRASI` | satır açıkça siliniyor | çift `SILME_SIRASI`'nda olmalı |
| `KALICI_BAGLAR` | satır kalıyor, bağı koparılıyor | çift `KALICI_BAGLAR`'da olmalı |
| `satir_gider` | bu KOLON değil, SATIRIN kendisi gidiyor (kendi `case_id`'siyle: ya `SILME_SIRASI`'nda ya CASCADE) | kodda bu çift için karşılık aranmaz |

### NO ACTION (0) — silmeyi 23503 ile DÜŞÜRÜR

**Bu bölüm BOŞ ve boş kalmalı.** 30.08'de dört tane vardı ve üç P0'ın da
sebebiydi; H-28 ve H-30 ile kaldırıldılar. Buraya yeni bir satır girerse o
anahtar `SILME_SIRASI` ya da `KALICI_BAGLAR`'da ele alınmak zorundadır —
bekçi bunu denetler.

| tablo.kolon | hedef | kod |
|---|---|---|

### SET NULL (10) — satır KALIR, bağı kopar

| tablo.kolon | hedef | kod |
|---|---|---|
| `ajan_deneyim.case_id` | `cases` | `KALICI_BAGLAR` |
| `duzeltme_kayitlari.case_id` | `cases` | `KALICI_BAGLAR` |
| `yz_beyan_onaylari.case_id` | `cases` | `KALICI_BAGLAR` |
| `yz_beyan_onaylari.party_id` | `case_parties` | `KALICI_BAGLAR` |
| `kayit_onaylari.case_id` | `cases` | `KALICI_BAGLAR` |
| `kayit_onaylari.party_id` | `case_parties` | `KALICI_BAGLAR` |
| `case_documents.party_id` | `case_parties` | `satir_gider` |
| `case_payments.party_id` | `case_parties` | `satir_gider` |
| `case_payments.payer_party_id` | `case_parties` | `satir_gider` |
| `braket_denetim_izi.party_id` | `case_parties` | `satir_gider` |

**Geride kişisel veri taşıyan öksüz satır kalmıyor.** Kalan şeyler bilerek
kalıyor ve kişisel veri içermiyor: anonim kapanış istatistiği · öğrenme
kayıtları · içeriksiz onay kayıtları (kurucu kararı HAT H-15/2).

> `kayit_onaylari.talep_id` bu tabloda yok çünkü hedefi `cases`/`case_parties`
> değil, `kayit_onay_talepleri`. O da H-28 ile SET NULL yapıldı; yoksa talep
> satırı cascade ile gidince kalıcı onay kaydı da onunla giderdi.

> **`satir_gider` neden ayrı bir etiket.** İlk yazımda `case_documents.party_id`
> için `SILME_SIRASI` yazmıştım ve bekçi **ilk koşumunda** yakaladı: listede
> duran çift `case_documents.case_id`, `party_id` değil. Silinen şey o kolon
> değil, satırın kendisi. Etiket bunu tam söylemezse denetim ya yanlış yere
> kırmızı yanar ya da yanlış bir güven verir.

## Bu ölçüm ne zaman yenilenir

- `cases`/`case_parties`e yeni bir yabancı anahtar eklendiğinde.
- Var olan bir anahtarın `delete_rule`'u değiştiğinde.

Yenilenmezse bekçi **eski hâli** denetler. Bekçinin koruduğu şey KODUN
listeleridir (bir çift listeden düşerse yakalar); şema kaymasını yakalayan
şey yukarıdaki sorgunun tekrar koşturulmasıdır.
