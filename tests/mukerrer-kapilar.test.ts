import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";

/* MÜKERRER YAZIM KAPILARI — İKİ ORTAK KUSUR (24.08.2026)

   Bu oturumda aynı iki kusur beş ayrı kapıda çıktı:

   (a) `startsWith(etiket)` — geçit (`anaAjanaBildir`) gerekçenin BAŞINA
       `[kaynak:…]` koyuyor (21.08 11:06'dan beri; canlıda 421 satır).
       `startsWith` geçitten geçmiş satırları GÖRMEZ, kapı boş küme üzerinde
       çalışır ve aynı iş yeniden yazılır.
   (b) SIRASIZ `.limit(N)` — Postgres sırasız sorguda hangi N satırı
       döndüreceğini garanti etmez. Satır sayısı N'i geçince kapı kalıcı olarak
       körelir. CANLI KANIT: `ajan-nobetci` `oturum_hatirlatma` tipinde
       411 satır biriktirmiş, kapı hiç tutmuyordu (3 dakikada bir yeni satır).

   Doğru kalıp: sunucuda `like` ile daralt → en yeniden sırala → JS'te
   `includes` ile kesinleştir. */

const DOSYALAR: [string, string][] = [
  ["ajan-nobetci", "supabase/functions/ajan-nobetci/index.ts"],
  ["akis-yurut", "supabase/functions/akis-yurut/index.ts"],
];

describe("mükerrer yazım kapıları — ortak kalıba uyar", () => {
  for (const [ad, yol] of DOSYALAR) {
    const kaynak = kaynakOku(yol);

    it(`${ad}: etiket araması \`startsWith\` DEĞİL`, () => {
      expect(kaynak).not.toContain("startsWith(etiket)");
    });

    it(`${ad}: etiket araması \`includes\` ile kesinleştirilir`, () => {
      expect(kaynak).toContain("includes(etiket)");
    });

    it(`${ad}: iz sorgusu sunucuda etiketle daraltılır`, () => {
      expect(kaynak).toContain('.like("gerekce", `%${etiket}%`)');
    });

    it(`${ad}: iz sorgusu en yeniden eskiye sıralanır`, () => {
      expect(kaynak).toContain('.order("created_at", { ascending: false })');
    });

    it(`${ad}: sırasız geniş tarama (limit 200/300) kalmadı`, () => {
      const kotu = kaynak.split(/\r?\n/)
        .filter((l) => /\.limit\((200|300)\)/.test(l))
        .filter((l) => l.includes("gerekce") || l.includes("gorev_tipi"));
      expect(kotu).toEqual([]);
    });
  }
});
