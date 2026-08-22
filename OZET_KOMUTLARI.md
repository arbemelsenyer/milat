OZET_KOMUTLARI:

## 1. Her sohbet sonunda o sohbetin özetlendiği PROJE_OZETI.md si içeriğini oluşturma Promptu

Bu sohbeti tara. Gereksiz dolgu cümlelerini, nezaket ifadelerini, teknik açıklamaları ve tekrarları tamamen temizle.
Aşağıdaki 4 başlık altında sadece en güncel ve net metni üret:
1) Anahtar Kavramlar ve Değişkenler
2) Alınan Kararlar ve Kurallar (sadece en güncel hali)
3) Tamamlanan İşler (sadece bu sohbette tamamlananlar)
4) Mevcut Durum ve Sıradaki Adım (sadece en güncel hali)
Sadece öz metni üret, ekstra açıklama yazma.

---

## 2. Eski Özet ile Yeni Sohbeti Birleştirip Güncelleme Prompt'u

*Yeni bir sohbet oturumunda, geçmiş durum ile yeni yapılan işleri birleştirip tek bir güncel ` PROJE_OZETI.md` oluşturmak için:*

```text
Sana vereceğim mevcut PROJE_OZETI.md içeriği ile bu sohbette ulaşılan yeni durum ve kararları birleştir.
Kurallar:
1. Eski ve geçerliliğini yitirmiş bilgileri tamamen sil.
2. Tamamlanan yeni işleri "Tamamlanan İşler" bölümüne ekle.
3. "Mevcut Durum ve Sıradaki Adım" kısmını en güncel haliyle yeniden yaz.
4. Çıktı olarak eski dosyanın üzerine yazılacak (eski dosyayı tamamen sildirip yerine geçecek) eksiksiz, tek parça yeni PROJE_OZETI.md metnini üret.
```
