import { describe, it, expect } from "vitest";
import { akisHataBasligi, akisHataMetni } from "../supabase/functions/akis-yurut/hata-metni";
import { sinirDenetle } from "../supabase/functions/_shared/anlatim";

/* CANLI KUSUR (20.08.2026 · dosya eb70595a): panoda duran akış hatası satırı
   `[akis:948ddbca-…:bilirkisi_durum__ilerlet] Bu konuda size yazabileceğim bir
   şey bulamadım.` idi. Hangi adımın neden çalışmadığı kaybolmuştu, çünkü
   "<fonksiyon> çalıştırılamadı: HTTP …" metninin TAMAMI sınır katmanından
   geçiriliyor ve içindeki rakam yüzünden cümle "dayanaksız rakam" sayılıp
   tümüyle eleniyordu. */

const IC_CAGRI_HATASI = 'HTTP 500: {"error":"beklenmeyen"}';

describe("akış hatası metni", () => {
  it("KUSURUN KENDİSİ: sebep gövdesi tek başına sınır katmanından geçemiyor", () => {
    // Bu, düzeltilen davranışın DAYANAĞI. Sınır katmanı bilerek gevşetilmedi.
    const r = sinirDenetle(IC_CAGRI_HATASI);
    expect(r.gecti).toBe(false);
    expect(r.turler).toContain("dayanaksiz_rakam");
  });

  it("sebep elense bile hangi adımın çalışmadığı kaybolmuyor", () => {
    const metin = akisHataMetni(akisHataBasligi("bilirkisi-secim", IC_CAGRI_HATASI), IC_CAGRI_HATASI);
    expect(metin).toContain("bilirkisi-secim");
    expect(metin).toContain("HTTP 500");
    expect(metin).not.toContain("yazabileceğim bir şey bulamadım");
  });

  it("elenen sebep sessizce düşmüyor, türü yazılıyor", () => {
    const metin = akisHataMetni("bilirkisi-secim çalıştırılamadı.", IC_CAGRI_HATASI);
    expect(metin).toContain("dayanaksiz_rakam");
  });

  it("elenen sebebin gövdesi metne SIZMIYOR", () => {
    const metin = akisHataMetni("x çalıştırılamadı.", 'HTTP 500: {"error":"Ayşe Yılmaz 45000 TL"}');
    expect(metin).not.toContain("Ayşe");
    expect(metin).not.toContain("45000");
  });

  it("sınırdan geçen sebep aynen korunuyor", () => {
    const sebep = "session_id, party_id dosyada bulunamadı.";
    expect(sinirDenetle(sebep).gecti).toBe(true);
    expect(akisHataMetni("hazirlik-foyu çalıştırılamadı.", sebep))
      .toBe("hazirlik-foyu çalıştırılamadı. session_id, party_id dosyada bulunamadı.");
  });

  it("sebep yoksa yalnız başlık yazılır", () => {
    expect(akisHataMetni("x ortak çalışma motoruna bağlı olmadığı için çalıştırılmadı."))
      .toBe("x ortak çalışma motoruna bağlı olmadığı için çalıştırılmadı.");
  });

  it("başlık yalnız üç haneli HTTP kodunu alır, başka rakamı almaz", () => {
    expect(akisHataBasligi("a", "HTTP 401 (iç çağrı reddedildi)")).toBe("a çalıştırılamadı (HTTP 401).");
    expect(akisHataBasligi("a", "bağlantı 45000 kez koptu")).toBe("a çalıştırılamadı.");
    expect(akisHataBasligi("a")).toBe("a çalıştırılamadı.");
  });
});
