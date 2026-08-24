import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/* ISLAK İMZA KAPISI (HAT H-2 · karar A, 24.08.2026)

   KARARIN ŞARTI: `agreement_documents.signed_by` YALNIZ arabulucunun kendi
   oturumuyla yazılır; cron/akış çağrısı reddedilir. İmza, ürünün beş insan
   kapısından biridir (constitution m.3 · m.5).

   Bu şartı mimari tutar: yazma istemciden, kullanıcının kendi JWT'siyle gider
   ve `agreement_documents` üzerindeki "Mediator manages agreement docs"
   politikası (`is_case_mediator`) süzer. Edge function'lar servis rolüyle
   çalışır ve RLS'i AŞAR — yani bir edge function `signed_by`'a yazarsa kapı
   sessizce delinir ve hiçbir hata görünmez.

   Tezgâhın işi tam olarak budur: sunucu tarafında `signed_by` yazımı çıkarsa
   düşmek. */

const FN_DIZIN = process.env.FN_DIZIN ?? "supabase/functions";

/** Bir dizindeki bütün .ts dosyalarını (alt dizinler dahil) düz liste yapar. */
function tsDosyalari(dizin: string): { yol: string; icerik: string }[] {
  const cikti: { yol: string; icerik: string }[] = [];
  const gez = (d: string) => {
    for (const ad of readdirSync(d)) {
      const tam = join(d, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else if (tam.endsWith(".ts")) cikti.push({ yol: tam, icerik: readFileSync(tam, "utf-8") });
    }
  };
  gez(dizin);
  return cikti;
}

/* `signed_by:` bir nesne alanı olarak yazılıyorsa bu bir YAZIMDIR.
   Salt okuma (`select("signed_by")`) ya da yorum satırı yazım değildir. */
function signedByYazanlar(dosyalar: { yol: string; icerik: string }[]): string[] {
  const bulunan: string[] = [];
  for (const { yol, icerik } of dosyalar) {
    for (const satir of icerik.split("\n")) {
      const temiz = satir.trim();
      if (temiz.startsWith("//") || temiz.startsWith("*")) continue;
      if (/\bsigned_by\s*:/.test(temiz)) bulunan.push(`${yol} :: ${temiz.slice(0, 80)}`);
    }
  }
  return bulunan;
}

describe("imza kapısı — sunucu tarafı signed_by'a dokunmuyor", () => {
  it("hiçbir edge function signed_by yazmıyor", () => {
    const yazanlar = signedByYazanlar(tsDosyalari(FN_DIZIN));
    expect(yazanlar, `signed_by sunucudan yazılıyor:\n${yazanlar.join("\n")}`).toEqual([]);
  });
});

describe("imza yüzeyi — istemci bileşeni kararın şartlarını taşıyor", () => {
  const PANEL = readFileSync("src/components/mediation/AnlasmaImzaPaneli.tsx", "utf-8");

  it("yazma istemciden, kullanıcının kendi oturumuyla gidiyor", () => {
    expect(PANEL).toContain('.from("agreement_documents")');
    expect(PANEL).toContain("signed_by: seciliIdler");
    // Servis rolü / admin istemcisi bu yüzeye girmez.
    expect(PANEL).not.toContain("SERVICE_ROLE");
    expect(PANEL).not.toContain("service_role");
  });

  it("imzalayan seçilmeden imza işlenmiyor (imzalayan uydurulmaz)", () => {
    expect(PANEL).toContain("seciliIdler.length === 0");
  });

  it("belge üretilmeden imza işlenmiyor", () => {
    expect(PANEL).toContain("İmza, üretilmiş belgeye işlenir");
  });

  it("tarama, kovanın yol düzenine uygun yazılıyor (<uid>/<case_id>/…)", () => {
    expect(PANEL).toContain("${uid}/${caseRow.id}/imzali-anlasma-");
    expect(PANEL).toContain('from("case-documents")');
  });

  it("imzalayan kimliği taraf satırıdır (davet kabul etmemiş tarafın user_id'si yok)", () => {
    expect(PANEL).toContain("case_parties");
    expect(PANEL).toContain("party_id: t.id");
  });
});
