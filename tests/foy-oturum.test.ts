import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";

/* TAKİP FÖYÜ — oturum satırları iptal/taslak kaydı yapılmış gibi göstermiyor
   (25.08.2026)

   `ProcessTrackerPanel.autoState` föyün "İlk Oturum" / "2. Oturum" satırlarını
   `sessions.filter((s) => s.scheduled_at)` üzerinden kuruyordu — yani İPTAL
   EDİLMİŞ ve TASLAK oturumlar da sayılıyordu. Bunlar resmi takip föyü
   alanlarıdır; yapılmamış bir oturumu tarihiyle yazdırmak, 25.08'de kapatılan
   "Dosya Atama Tarihi" kusurunun aynısıdır (uydurulmuş olgu).

   CANLI KANIT (25.08): `case_sessions` 32 satır — **21'i `cancelled`**,
   10 `scheduled`, 1 `draft`. `5186ee1d…` dosyasında tarih sırasına göre ikinci
   kayıt (24.07 07:00) İPTAL EDİLMİŞTİ ve föy onu "2. Oturum" olarak
   işaretliyordu.

   İkinci satır: "Oturum Erteleme" HERHANGİ bir iptalde işaretleniyordu.
   Erteleme, iptalin ardından daha ileri bir tarihe oturum kurulmasıdır; şemada
   ayrı bir "ertelendi" durumu YOKTUR (kolonlar tarandı), o yüzden ardıl
   koşulu aranır. Ardılı olmayan iptal erteleme değildir.

   Kanıt için kök değiştirilebilir: FOY_KOK=tests/gecici/foy-kanit */

const KOK = (process.env.FOY_KOK ?? "").replace(/\/+$/, "");
const y = (goreli: string) => (KOK ? `${KOK}/${goreli}` : goreli);

const panel = () => kaynakOku(y("src/components/mediation/ProcessTrackerPanel.tsx"));

function autoStateGovdesi(g: string): string {
  const bas = g.indexOf("const autoState = useMemo(");
  expect(bas, "autoState bulunamadı — tezgâh güncellenmeli").toBeGreaterThan(-1);
  const son = g.indexOf("}, [agreementDocs, sessions, caseData]);", bas);
  expect(son, "autoState bağımlılık dizisi değişmiş — tezgâh güncellenmeli").toBeGreaterThan(bas);
  return g.slice(bas, son);
}

describe("takip föyü oturum satırları", () => {
  it("İlk/2. Oturum iptal ve taslak kayıtları saymıyor", () => {
    const govde = autoStateGovdesi(panel());
    expect(govde, "oturum listesi ham filtreleniyor — iptal edilmiş oturum föye düşer")
      .not.toContain("sessions.filter((s) => s.scheduled_at)");
    expect(govde, "iptal edilmiş oturumlar dışlanmıyor").toMatch(/s\.status\s*!==\s*"cancelled"/);
    expect(govde, "taslak oturumlar dışlanmıyor").toMatch(/s\.status\s*!==\s*"draft"/);
  });

  it("ilk ve ikinci oturum aynı süzülmüş listeden okunuyor", () => {
    const govde = autoStateGovdesi(panel());
    expect(govde).toMatch(/const first = gecerli\[0\]/);
    expect(govde).toMatch(/const second = gecerli\[1\]/);
  });

  it("erteleme, ardılı olan bir iptal gerektiriyor", () => {
    const govde = autoStateGovdesi(panel());
    const i = govde.indexOf("const cancelled =");
    expect(i, "erteleme kaynağı bulunamadı").toBeGreaterThan(-1);
    const blok = govde.slice(i, i + 400);
    expect(blok, "herhangi bir iptal erteleme sayılıyor").toContain("gecerli.some");
    expect(blok, "ardıl tarih karşılaştırması yok").toMatch(/zaman\(o\)\s*>\s*zaman\(s\)/);
  });

  it("föy satır etiketleri değişmedi (resmi alan adları)", () => {
    // Etiketler bakanlık föyünün alan adlarıdır; kod bunları yeniden yazmaz —
    // düzeltilen şey TÜRETME mantığıdır, alan adı değil.
    const g = panel();
    for (const etiket of ["İlk Oturum", "2. Oturum", "Oturum Erteleme"]) {
      expect(g, `föy etiketi '${etiket}' kaybolmuş`).toContain(`label: "${etiket}"`);
    }
  });
});
