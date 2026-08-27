import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { kaynakOku } from "./kaynak";

/* TEZGÂH TAŞINABİLİR OLMALI — 27.08.2026
 *
 * "363/363 yeşil" cümlesi, yalnız bu makinede doğruysa hiçbir şey söylemez.
 * Bugün tam bu durumdaydık: üç tezgâh (`kazanim-sayaci` · `kota-kapisi` ·
 * `saklama-imha`) `tests/gecici/` içindeki SQL dosyalarını okuyordu, ama o
 * klasörün tamamı `.gitignore`da (CLAUDE.md §22: geçici dosya commit'lenmez).
 * Yani temiz bir klonda o üç dosya YOK ve tezgâh `ENOENT` ile çökerdi —
 * kuyruk burada yeşil, depoda kırmızı.
 *
 * Dosyalar `tests/sabit/` altına alındı (izlenir). Aşağıdaki iki denetim
 * sınıfın geri gelmesini engeller:
 *   1. Hiçbir tezgâh `tests/gecici/` içinden KALICI bağımlılık okumasın.
 *   2. Bir tezgâhın okuduğu her sabit dosya gerçekten git'te olsun.
 *
 * `KENAR_KOK=tests/gecici/...` gibi ÇEVRE DEĞİŞKENİYLE verilen kanıt kökleri
 * bu kuralın dışındadır: onlar varsayılan koşumda kullanılmaz, yalnız elle
 * kanıt alınırken devreye girer.
 */

const TEZGAHLAR = readdirSync("tests")
  .filter((a) => a.endsWith(".test.ts"))
  .map((a) => `tests/${a}`);

/** Kodda düz dizgeyle yazılmış okuma yolları (yorumlar çıkarılmış gövdeden). */
function okunanYollar(govde: string): string[] {
  const yollar: string[] = [];
  for (const m of govde.matchAll(/(?:kaynakOku|readFileSync)\(\s*"([^"]+)"/g)) {
    yollar.push(m[1]);
  }
  return yollar;
}

function govdesi(yol: string): string {
  return kaynakOku(yol)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("kaynak okuma TEK KAPIDAN geçiyor", () => {
  /* CRLF tuzağı 27.08'de `tests/kaynak.ts` (`kaynakOku`) ile kapatıldı ve o
     gün 31 tezgâh oraya bağlandı. Ama kuralı KORUYAN bir şey yoktu: yarın
     yazılan bir tezgâh `readFileSync(..., "utf-8")` deyip aynı tuzağa
     düşebilirdi ve bunu ancak çok satırlı bir denetim kırmızı yanınca —
     yani kod doğruyken — fark ederdik.

     Ölçü olarak İTHALE bakılır, çağrıya değil: bu dosya kendi gövdesinde
     `readFileSync` dizgesini bir düzenli ifade içinde taşıyor, çağrı arayan
     bir denetim kendi kaynağını suçlar (23.08 `guard-shell.sh` dersi:
     karar, metinde geçen kelimeye göre değil gerçekte yapılana göre verilir).
     `readdirSync` · `statSync` · `existsSync` serbesttir: dosya İÇERİĞİ
     okumazlar, satır sonu tuzağı onları ilgilendirmez. */
  it("yalnız tests/kaynak.ts readFileSync ithal edebiliyor", () => {
    const suclu = TEZGAHLAR.filter((t) =>
      /import\s*\{[^}]*\breadFileSync\b[^}]*\}\s*from\s*"node:fs"/.test(kaynakOku(t)),
    );
    expect(
      suclu,
      `kaynağı doğrudan okuyan tezgâh (kaynakOku kullan): ${suclu.join(" | ")}`,
    ).toEqual([]);
  });

  it("tek kapı gerçekten normalleştiriyor", () => {
    // Kapı kendisi bozulursa bütün tezgâhlar sessizce tuzağa geri döner.
    const G = kaynakOku("tests/kaynak.ts");
    expect(G, "kaynakOku dışa açılmıyor").toContain("export const kaynakOku");
    expect(G, "CRLF normalleştirmesi kaldırılmış").toMatch(/split\("\\r\\n"\)\.join\("\\n"\)/);
  });
});

describe("tezgâh temiz bir klonda da koşar", () => {
  it("hiçbir tezgâh tests/gecici/ içinden kalıcı bağımlılık okumuyor", () => {
    const suclu: string[] = [];
    for (const t of TEZGAHLAR) {
      for (const y of okunanYollar(govdesi(t))) {
        if (y.startsWith("tests/gecici/")) suclu.push(`${t} → ${y}`);
      }
    }
    expect(
      suclu,
      `gitignore'daki dosyaya bağlı tezgâh (tests/sabit/ altına taşı): ${suclu.join(" | ")}`,
    ).toEqual([]);
  });

  it("tezgâhların okuduğu sabit dosyalar git'te izleniyor", () => {
    const istenen = new Set<string>();
    for (const t of TEZGAHLAR) {
      for (const y of okunanYollar(govdesi(t))) {
        // Yalnız tezgâha ait sabit veriyi denetle; ürün kaynağı zaten izlenir.
        if (y.startsWith("tests/")) istenen.add(y);
      }
    }
    if (istenen.size === 0) return;

    /* `git ls-files` yalnız İZLENEN dosyaları yazar. Depo dışında (git yoksa)
       koşulursa denetim atlanır — bekçinin kendisi kırmızı yanmasın. */
    let izlenen: Set<string>;
    try {
      const cikti = execFileSync("git", ["ls-files", "--", "tests/"], { encoding: "utf-8" });
      izlenen = new Set(cikti.split("\n").map((s) => s.trim()).filter(Boolean));
    } catch {
      return;
    }

    const eksik = [...istenen].filter((y) => !izlenen.has(y));
    expect(eksik, `tezgâh okuyor ama git'te yok: ${eksik.join(" | ")}`).toEqual([]);
  });
});
