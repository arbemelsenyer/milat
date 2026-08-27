import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";

/* KOTA KAPISI — mimari §15.2 · HAT H-15/3 (25.08.2026)
 *
 * Madde "hangi paket, hangi kota, dolunca ne olur" kararını bekliyordu. Karar
 * beklemek yerine **karar veriye taşındı**: "pilotta kota yok" da bir VERİ
 * durumudur (`limit_deger` NULL = sınırsız). Böylece kurucu hiçbir şey
 * girmezse sistem bugünkü gibi çalışır; kota istendiğinde KOD DEĞİŞMEDEN
 * değer girilir.
 *
 * Bu tezgâh, kapının **kazara kimseyi kilitlemediğini** denetler — pilotta
 * çalışan bir arabulucunun işi bir tablo eksikliği yüzünden durmamalı.
 */

const G = kaynakOku("supabase/functions/_shared/kota.ts");
const SQL = kaynakOku("tests/gecici/kota-tablosu.sql");

describe("kota kapısı: kazara kimseyi kilitlemiyor", () => {
  it("limit NULL ise SINIRSIZ", () => {
    expect(G).toMatch(/if \(k\.limit_deger == null\) return SINIRSIZ/);
  });

  it("kota satırı yoksa SINIRSIZ", () => {
    expect(G).toMatch(/if \(kErr \|\| !kota\) return SINIRSIZ/);
  });

  it("tablo hiç yoksa SINIRSIZ (fail-open)", () => {
    expect(G).toMatch(/if \(aErr\) return SINIRSIZ/);
    expect(G).toMatch(/catch\s*\{\s*return SINIRSIZ;/);
  });

  it("fail-open BİLİNÇLİ ve gerekçesi yazılı", () => {
    // Guvenlik kapisi olsaydi fail-closed olurdu; bu ticari bir sinir.
    expect(G).toContain("FAIL-OPEN, BİLEREK");
    expect(G).toContain("güvenlik sınırı değil");
  });

  it("sınır aşılsa bile varsayılan ENGELLEMEZ", () => {
    // `dolunca` varsayilani 'uyar': pilotta kimsenin isi sessizce durmasin.
    expect(G).toMatch(/izin: k\.dolunca !== "engelle"/);
    expect(SQL).toMatch(/dolunca text not null default 'uyar'/);
  });

  it("kota uygulanmıyorsa kullanım BOŞUNA sayılmıyor", () => {
    // `sayKullanim` geri cagrimi yalniz limit varsa cagrilmali.
    const nullIdx = G.indexOf("if (k.limit_deger == null) return SINIRSIZ");
    const sayIdx = G.indexOf("await sayKullanim()");
    expect(nullIdx).toBeGreaterThan(-1);
    expect(sayIdx, "sınırsızken de sayım yapılıyor").toBeGreaterThan(nullIdx);
  });

  it("pilot paketi göçte SINIRSIZ kuruluyor", () => {
    expect(SQL).toContain("'pilot'");
    // Dort kota turunun dordu de NULL limitle giriliyor.
    const satirlar = SQL.split(String.fromCharCode(10))
      .filter((l) => l.includes("('pilot', '") && l.includes("null"));
    expect(satirlar.length, "pilot kotaları sınırsız değil").toBe(4);
  });
});
