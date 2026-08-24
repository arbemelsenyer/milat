import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { etiketleriAyir as arka, etiketiKoruyarakSuz } from "../supabase/functions/_shared/anlatim";
import { etiketleriAyir as on, etiketsizGovde } from "../src/lib/etiket";

/* İKİ KOPYA AYNI DAVRANMALI (24.08.2026)
   `etiketleriAyir` iki yerde var: `supabase/functions/_shared/anlatim.ts`
   (Deno) ve `src/lib/etiket.ts` (Vite). Kopya ZORUNLUDUR: Deno dosyası
   `https://` içe aktarımları taşır, Vite paketine giremez.
   Bu tezgâh sapmayı yakalar — biri değişip öteki kalırsa düşer.

   ARKA PLAN: tüketiciler baştaki etiketi SAYIYLA siliyordu (biri bir kez, biri
   iki kez). Geçit `[kaynak:…]` eklemeye başlayınca (21.08 11:06) üç etiket oldu.
   CANLI KANIT: tarafın "Ajanım" panelinde bekleyen dört soru
   `[bekleyen:taraf_cevabi] [eksik:bilirkisi-onay:<uuid>] [kol:bilirkisi-sorulari]`
   ile başlıyordu — ham UUID dahil. */

const ORNEKLER: string[] = [
  "[kaynak:taraf_ajani][bekleyen:taraf_cevabi] [eksik:bilirkisi-onay:55dd060f-a9d1-4b22-98c4-45d2ce00c09f] [kol:bilirkisi-sorulari] Dosyada teknik inceleme gündemde — onay veriyor musunuz?",
  "[kaynak:nobetci] [hatirlatma:cba743c8-a6cd-4eb0-884a-7dd0ee70d6d2] Oturuma 1 günden az kaldı",
  "[gecis:2->3] taraf analizleri tamam",
  "[akis:olay-1:kural-1] hazirlik-foyu çalıştırıldı (2 taraf)",
  "etiketsiz düz metin",
  "",
  "   ",
  "[tek]",
  "metin [ortada:etiket] devam",
  "[a][b][c] üç bitişik etiket",
];

describe("etiket ayırıcı — arka uç ve ön yüz kopyaları aynı davranır", () => {
  for (const ornek of ORNEKLER) {
    it(`aynı sonuç: ${JSON.stringify(ornek.slice(0, 42))}`, () => {
      expect(on(ornek)).toEqual(arka(ornek));
    });
  }

  it("ön yüz kısayolu gövdeyi döner", () => {
    expect(etiketsizGovde(ORNEKLER[0])).toBe("Dosyada teknik inceleme gündemde — onay veriyor musunuz?");
  });

  it("üç etiketin tamamı silinir — sayıya bağlı değil", () => {
    expect(etiketsizGovde("[a][b] [c] gövde")).toBe("gövde");
  });

  it("ORTADAKİ köşeli parantez korunur (etiket sayılmaz)", () => {
    expect(etiketsizGovde("metin [ortada:x] devam")).toBe("metin [ortada:x] devam");
  });

  it("arka uçtaki süzgeç de aynı ayırıcıyı kullanır", () => {
    expect(etiketiKoruyarakSuz("[oto:x] dosyadaki belgeye göre eşleşme var", "t"))
      .toBe("[oto:x] dosyadaki belgeye göre eşleşme var");
  });
});

describe("tüketiciler etiketi SAYIYLA silmez", () => {
  const CASEROOM = readFileSync("src/pages/CaseRoom.tsx", "utf-8");
  const AJAN = readFileSync("src/components/AjanPenceresi.tsx", "utf-8");

  it("tarafın Ajanım paneli ortak ayırıcıyı kullanır", () => {
    expect(CASEROOM).toContain("etiketsizGovde(g.gerekce)");
  });

  it("tarafa `sonuc` (iç muhasebe) gövdenin ÖNÜNE geçmez", () => {
    expect(CASEROOM).toContain('etiketsizGovde(g.gerekce) || g.sonuc || ""');
  });

  it("zaman çizelgesi desenleri çapalı değil", () => {
    const capali = AJAN.split(/\r?\n/)
      .filter((l) => l.includes(".exec(String(") && l.includes("gerekce"))
      .filter((l) => l.includes("/^"));
    expect(capali).toEqual([]);
  });
});
