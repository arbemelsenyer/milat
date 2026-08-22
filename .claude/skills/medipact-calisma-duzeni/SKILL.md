---
name: medipact-calisma-duzeni
description: MediPact projesi için Cowork çalışma düzenini yönetir — "medipact" ve "medipact devam" kısayollarını, oturum başı okuma sırasını, kanıt/kapı-satırı disiplinini ve oturum sonu PROJE_OZETI.md kaydını tek yerde paketler. Kurucu "medipact" ya da "medipact devam" yazdığında, ya da MediPact projesiyle ilgili herhangi bir işte kullanılır.
---

# MediPact Çalışma Düzeni (Cowork)

Proje klasörü: `C:\Users\ASUS\Desktop\medipact claude` (bütün dosyalar burada).
Canlı depo (Code'un çalıştığı yer): `C:\Users\ASUS\milat`.

Bu skill, `COWORK.md`'deki tam kural metninin YERİNE GEÇMEZ — onu düşük tokenla
tetiklemek içindir. Ayrıntı/çelişki olursa `COWORK.md` bağlayıcıdır.

## "medipact" yazıldığında (kısa komut)

Sırayla, tam olarak şu dosyalar açılır ve okunur — hiçbiri atlanmaz:

1. `PROJE_OZETI.md` — proje klasöründeki EN GÜNCEL hâli. Zorunlu, mutlaka açılır.
2. `constitution.md` — tam oku.
3. `mimari/00-INDEX.md` ve yalnızca işe karşılık gelen `mimari/` bölüm dosyası.
4. `tasks/todo.md` — yalnız en üstteki "Nerede kaldık" bloğu.
5. `tasks/lessons.md` — tam oku.

Sonra TEK CÜMLE: "son oturumda X yapıldı, sırada Y var" — ve komut beklenir.
Kendiliğinden iş başlatılmaz, uzun özet çıkarılmaz.

`PROJE_OZETI.md` bir ÖZETTİR, kaynak değildir. Çelişkide sıra: `constitution.md` >
`medipact-komut.md` > `mimari/` > `tasks/`. Ama okuma listesinden asla düşmez.

## "medipact devam" yazıldığında

Aynı dosyalar okunur (PROJE_OZETI.md dahil). "Nerede kaldık" bloğundaki SIRADAKİ
madde, onay sorulmadan doğrudan yapılmaya başlanır. Yalnız o madde — kapsam
genişletilmez.

## Her cevabın ilk satırı (zorunlu)

`[okudum: … | yapılmış mı: … | sıra: … | kayıt: … | uydurma: …]`

Okunmadıysa "okumadım" yazılır ve o cevapta komut verilmez. Kanıtsız "yaptım/var/
doğru" cümlesi kurulmaz — kanıt (dosya+satır, SQL sonucu, commit no, ekran) aynı
cümlede olur.

## Dört zorunlu soru (izinsiz yapılmaz)

Komut vermeden önce "vereyim mi?" · Lovable'a girmeden önce "gireyim mi?" (SQL/
dosya okuma/dizin listesi ücretsiz, sorulmaz) · ekranı/akışı/ajan davranışını
değiştirecek her adım öncesi onay · "dur" denince sürmekte olan adım bitirilir,
yenisi başlatılmaz.

## Oturum sonu özet kaydı (bağlayıcı — atlanamaz)

Oturum SONUNDA, proje klasöründeki `OZET_KOMUTLARI.md`'de yazılı iki prompt
harfiyen uygulanır:

1. 1. prompt bu sohbete uygulanır → dolgu/tekrar temizlenir, 4 başlık altında öz
   metin çıkarılır.
2. Mevcut `PROJE_OZETI.md` varsa 2. prompt uygulanır → eski özetle birleştirilir,
   eskiyen bilgi silinir, "Mevcut Durum ve Sıradaki Adım" yeniden yazılır.
3. Sonuç `PROJE_OZETI.md`'nin ÜZERİNE YAZILIR (proje klasörüne kaydedilir).
4. `tasks/todo.md`'deki iş-bazlı kayıt (YAPILDI/EKSİK KALDI/GİDERMEK İÇİN) AYRI ve
   hâlâ zorunludur; PROJE_OZETI.md onun yerine geçmez.

`OZET_KOMUTLARI.md` içeriğini burada tekrar etmiyoruz — kaynağı proje klasöründeki
dosyadır (ayrıca `COWORK.md` ve `CLAUDE.md` içine de tam metin olarak işlendi).

## Token/zaman tasarrufu

Bu skill zaten tasarrufun kendisidir: `COWORK.md`/`CLAUDE.md` içine gömülü uzun
metinleri her oturumda yeniden okumak yerine, bu tek dosya çağrılır. Ek tasarruf
seçenekleri (ör. `constitution.md`/`lessons.md`'yi her seferinde tam okumamak)
PROJE_OZETI.md'de "Alınan Kararlar ve Kurallar → Özet ve süreklilik kuralları"
altında önerilmiştir; kurucunun onayı olmadan uygulanmaz.
