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
