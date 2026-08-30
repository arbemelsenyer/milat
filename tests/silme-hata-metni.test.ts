import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";

/* SİLME HATASININ KULLANICIYA NE DEDİĞİ — 30.08.2026
 *
 * `MediationEngine.tsx` içindeki `trErr`, tanımadığı hatayı OLDUĞU GİBİ ekrana
 * basıyordu. Taraf silmede bu şu demekti: kullanıcı
 *   `update or delete on table "case_parties" violates foreign key constraint
 *    "taraf_musaitlik_party_id_fkey" on table "taraf_musaitlik"`
 * cümlesini görüyordu. İki ayrı kusur:
 *   (1) kullanıcı ne olduğunu ve ne yapacağını anlamıyor,
 *   (2) tablo ve kısıt adları — şemanın iç yapısı — ürün yüzeyine sızıyor.
 *
 * Sebep uydurma değil: canlı şemada `taraf_musaitlik.party_id` ve
 * `yz_beyan_onaylari.party_id` ON DELETE NO ACTION'dır; bu satırlardan biri
 * varken taraf silinemez.
 */
const EKRAN = kaynakOku("src/pages/MediationEngine.tsx");

/** `trErr` gövdesi — denetim yalnız o fonksiyona bakar. */
function trErrGovdesi(): string {
  const bas = EKRAN.indexOf("function trErr(msg: string) {");
  expect(bas, "trErr bulunamadı").toBeGreaterThan(-1);
  const son = EKRAN.indexOf("\n}", bas);
  return EKRAN.slice(bas, son);
}

describe("silme hatası metni: şema kullanıcıya sızmıyor", () => {
  it("YABANCI ANAHTAR İHLALİ tanınıyor", () => {
    const g = trErrGovdesi();
    expect(g, "23503 tanınmıyor").toContain("23503");
    expect(g, "hata metninde 'foreign key constraint' aranmıyor")
      .toContain("foreign key constraint");
  });

  it("kullanıcıya NE YAPACAĞINI söyleyen bir cümle dönüyor", () => {
    const g = trErrGovdesi();
    const idx = g.indexOf('m.includes("23503")');
    const kalan = g.slice(idx, idx + 500);
    expect(kalan, "dönen metin yok").toMatch(/return "/);
    // Ham Postgres cümlesi ekrana basılmıyor: dönen metin Türkçe ve yol gösteriyor.
    expect(kalan).toMatch(/silinemedi/);
    expect(kalan).toMatch(/onay|müsaitlik/);
  });

  it("BEKÇİ: tanınmayan hata dalı hâlâ SON çare — 23503 ondan ÖNCE geliyor", () => {
    /* `return msg` en sonda kalmalı; 23503 dalı ondan sonraya düşerse hiç
       çalışmaz ve ham metin yine ekrana basılır. */
    const g = trErrGovdesi();
    const fkIdx = g.indexOf('m.includes("23503")');
    const hamIdx = g.lastIndexOf("return msg;");
    expect(fkIdx, "23503 dalı yok").toBeGreaterThan(-1);
    expect(hamIdx, "ham dal yok").toBeGreaterThan(fkIdx);
  });
});
