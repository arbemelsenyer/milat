import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* BELGE MOTORU — mimari §3 (otomatik doldurma) + §15.2 (belge zinciri, UDF)
 *
 * §3: "Sistemde kayıtlı hiçbir bilgi belgeye elle bir daha yazılmaz."
 * §15.2: "Belge zinciri (tutanak/anlaşma/UDF, tüketici dahil) canlı test geçti."
 *
 * 25.08 denetimi: ikisi de kurulu. Bu tezgâh yeniden yazmaz, kilitler.
 *
 * UDF NOTU: kuyruğa önce "UDEF yok" diye yazılmıştı — yol haritasındaki yazım
 * "UDEF", kodda ve gerçekte format **UDF** (UYAP Doküman Formatı). Yanlış
 * dizgeyle arandığı için "sıfır kod" sanılmıştı; motor kurulu ve gerçek bir
 * UYAP çıktısıyla doğrulanmış (`ornek_gercek.udf.udf`).
 */

const ISLEV = readFileSync("supabase/functions/generate-official-document/index.ts", "utf-8");
const PANEL = readFileSync("src/components/mediation/OfficialDocumentsPanel.tsx", "utf-8");

describe("belge motoru: §3 doldurma + UDF zinciri", () => {
  it("§3 alanları kayıtlı veriden dolduruluyor", () => {
    // Her biri sistemde kayitli bir kaynaktan gelmeli (elle yazilmamali).
    for (const alan of [
      "dosya_no", "buro_no", "arb_no", "basvuru_tarihi", "anlasma_konusu",
      "anlasma_bedeli", "mediator_name", "outcome", "closed_at",
      "dava_sarti_son_tarih",
    ]) {
      expect(ISLEV, `§3 alanı doldurulmuyor: ${alan}`).toContain(`${alan}:`);
    }
    // Bunlar kisa yazimla (shorthand) gecirilir: `parties_block,`
    for (const alan of ["parties_block", "session_date", "fee_block"]) {
      expect(ISLEV, `§3 alanı doldurulmuyor: ${alan}`)
        .toBeDefined();
    }
    /* Kısa yazım satır satır aranır: dizgede başka yerde geçmesi yetmez,
       doldurma haritasında KENDİ satırı olmalı (`parties_block,`). */
    const satirlar = ISLEV.split(String.fromCharCode(10)).map((l) => l.trim());
    for (const alan of ["parties_block", "session_date", "fee_block"]) {
      expect(satirlar, `§3 alanı doldurma haritasına girmiyor: ${alan}`).toContain(`${alan},`);
    }
    // Taraf ikincil alanlari (vekil, vergi dairesi vb.) blok ureticisinden gelir.
    expect(ISLEV).toContain("partyBlock(p)");
  });

  it("kaynağı olmayan alan UYDURULMUYOR", () => {
    /* `gorevlendirme_tarihi` §3'te MANUEL alandır ve şemada kolonu yok.
       Eskiden `created_at` basılıyordu — tutanakta başka bir tarihi
       "görevlendirme tarihi" diye göstermek olgu uydurmaktır. */
    expect(ISLEV, "görevlendirme tarihi hâlâ created_at ile dolduruluyor")
      .not.toMatch(/gorevlendirme_tarihi:\s*fmtDate\(caseRow\.created_at\)/);
    expect(ISLEV).toMatch(/gorevlendirme_tarihi:\s*""/);
  });

  it("UDF gerçek UYAP şemasıyla üretiliyor", () => {
    expect(ISLEV, "UDF üretilmiyor").toContain("udf_xml:");
    // Gercek semanin ayirt edici imzalari: format_id ve karakter (bayt degil) ofseti.
    expect(ISLEV).toContain('format_id="1.8"');
    expect(ISLEV, "ofset bayt bazlı olursa Türkçe karakterler kayar")
      .toContain("Array.from");
  });

  it("üç biçim de kullanıcıya sunuluyor (tüketici dahil zincir)", () => {
    expect(PANEL).toMatch(/fmt:\s*"pdf"\s*\|\s*"docx"\s*\|\s*"udf"/);
    expect(PANEL).toContain("udf_xml");
  });

  it("tüketici şablonu zincirde var", () => {
    // §15.2 "tuketici dahil" diyor; sablon tipi kodda taninmali.
    const admin = readFileSync("supabase/functions/admin-upload-template/index.ts", "utf-8");
    expect(admin).toMatch(/tuketici/);
  });
});
