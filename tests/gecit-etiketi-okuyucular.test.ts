import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { etiketleriAyir } from "../supabase/functions/_shared/anlatim";

/* GEÇİT ÖN EKİ TÜM ETİKET OKUYUCULARINI ETKİLER (24.08.2026)

   `anaAjanaBildir` geçidi gerekçenin BAŞINA `[kaynak:…]` (ve varsa
   `[bekleyen:…]`) koyuyor. Geçit **21.08 11:06**'da devreye girdi; canlı
   ölçüm: o tarihten sonra yazılan 421 görevin HEPSİ bu ön eki taşıyor,
   öncesindeki 123 görev taşımıyor.

   Sonuç: iş etiketini `^` ile SATIR BAŞINA çapalı arayan her yürütücü o
   tarihten beri hiçbir görevi çalıştıramaz. Üç yer bulundu:
     · oturumHatirlatmaYurut  → canlıda görüldü ("Hatırlatma etiketi okunamadı")
     · asamaGecisiYurut       → gizli: otomatik aşama ilerletme sessizce durur
     · teklifDegerlendirYurut → gizli: teklif değerlendirmesi sessizce durur

   Dördüncüsü ayrı bir belirti verdi: hatırlatma e-postasında baştaki etiketler
   TAM İKİ KEZ siliniyordu; üç etiket olunca TARAFA GİDEN metin `[eksik:…]`
   ile başlıyordu. */

const NOBETCI = readFileSync("supabase/functions/ajan-nobetci/index.ts", "utf-8");

/* Çapalı etiket deseni: "/^" ile başlayıp hemen köşeli parantez arayan regex.
   Kaçış karmaşasına girmemek için satır bazında, düz dizeyle aranır. */
function capaliDesenSatirlari(): string[] {
  return NOBETCI.split(/\r?\n/)
    .filter((l) => !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
    .filter((l) => l.includes(".exec(String(gerekce"))
    .filter((l) => l.includes("/^"));
}

describe("etiket okuyucuları — hiçbiri satır başına çapalı değil", () => {
  it("gerekçeden etiket okuyan HİÇBİR desen çapalı değildir", () => {
    expect(capaliDesenSatirlari()).toEqual([]);
  });

  it("üç yürütücünün deseni de yerinde (silinmediler)", () => {
    for (const anahtar of ["hatirlatma:", "gecis:", "teklif:"]) {
      const var_mi = NOBETCI.split(/\r?\n/)
        .some((l) => l.includes(".exec(String(gerekce") && l.includes(anahtar));
      expect(var_mi, `${anahtar} okuyucusu bulunamadı`).toBe(true);
    }
  });
});

describe("tarafa giden metinde iç etiket kalmaz", () => {
  it("etiket temizliği sayıya değil TÜKENMEYE dayanır", () => {
    // Eski hali: .replace(/^\[...\]\s*/g,"").replace(/^\[...\]\s*/g,"") — tam iki kez.
    expect(NOBETCI).toContain("etiketleriAyir(metin(soru.gerekce)).govde");
    expect(NOBETCI).not.toContain('.replace(/^\[[^\]]*\]\s*/g, "").replace(');
  });

  it("üç etiketli gerekçede gövde temiz kalır", () => {
    const ham = "[kaynak:taraf_ajani][bekleyen:taraf_cevabi] [eksik:kalem:kira] [kol:taraf-kalem-cikar] Belgeyi ekler misiniz?";
    expect(etiketleriAyir(ham).govde).toBe("Belgeyi ekler misiniz?");
  });

  it("etiketsiz metin olduğu gibi kalır", () => {
    expect(etiketleriAyir("Belgeyi ekler misiniz?").govde).toBe("Belgeyi ekler misiniz?");
  });
});
