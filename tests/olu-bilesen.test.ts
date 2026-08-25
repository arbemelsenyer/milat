import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/* ÖLÜ BİLEŞEN — canlı dosyanın İÇİNDEKİ ölü yüzey (25.08.2026)

   `tests/olu-yuzey.test.ts` DOSYA düzeyinde çalışır: `main.tsx`ten erişilemeyen
   dosyaları bulur. Bu yetmiyor — `CaseRoom.tsx` canlıdır ama içindeki
   `RoundsTab` hiçbir yerden render edilmiyordu.

   NASIL YAKALANDI: canlı bundle doğrulaması. `bcbdeb8` ile eklenen 14 hata
   dizesinden 13'ü canlı pakette vardı, biri ("Tur durumu güncellenemedi") YOKTU.
   Sebep dağıtım değildi — yerel `dist` çıktısında da yoktu: Rollup onu ÖLÜ KOD
   olarak atıyordu. Yani derleyici, dosya düzeyi taramanın göremediği bir ölü
   yüzeyi işaret etti.

   Neden önemli: `RoundsTab` `negotiation_rounds` tablosuna INSERT + UPDATE eden
   bir yüzeydi. Merkezin kurallarını atlayan ikinci bir yol — `MediatorDetail`
   tuzağının aynısı (tasks/lessons.md, 24.08'de üç tur kaybettirdi).

   Bu tezgâh üst düzey `function Ad(` bildirimlerini tarar ve hiçbir yerde
   kullanılmayanları listeler. Kalanların hepsi ölü DOSYALARDADIR ve
   `olu-yuzey.test.ts` tarafından zaten donduruludur.

   Kanıt için kök değiştirilebilir: BILESEN_KOK=tests/gecici/bilesen-kanit */

const KOK = (process.env.BILESEN_KOK ?? "").replace(/\/+$/, "");
const y = (goreli: string) => (KOK ? `${KOK}/${goreli}` : goreli);

const B = String.fromCharCode(92) + "b";
const say = (metin: string, ad: string) =>
  (metin.match(new RegExp(B + ad + B, "g")) || []).length;

function kullanilmayanBilesenler(kok: string): string[] {
  const dosyalar: string[] = [];
  (function tara(d: string) {
    for (const ad of readdirSync(d)) {
      const p = join(d, ad);
      if (statSync(p).isDirectory()) tara(p);
      else if (/[.]tsx?$/.test(ad)) {
        const yol = p.split(String.fromCharCode(92)).join("/");
        // Üretilen tipler ve shadcn/ui kütüphanesi taranmaz.
        if (!yol.includes("/integrations/") && !yol.includes("/components/ui/")) dosyalar.push(yol);
      }
    }
  })(kok);

  const kaynaklar = new Map<string, string>();
  for (const f of dosyalar) kaynaklar.set(f, readFileSync(f, "utf-8"));

  const bulgular: string[] = [];
  for (const [f, g] of kaynaklar) {
    const re = /^(export\s+)?(default\s+)?function\s+([A-Z][A-Za-z0-9_]*)\s*[(]/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(g))) {
      const ad = m[3];
      if (say(g, ad) > 1) continue;                       // kendi dosyasında kullanılıyor
      let disarida = false;
      for (const [f2, g2] of kaynaklar) {
        if (f2 !== f && say(g2, ad) > 0) { disarida = true; break; }
      }
      if (!disarida) {
        const goreli = KOK ? f.replace(`${KOK}/`, "") : f;
        bulgular.push(`${goreli}  ${ad}`);
      }
    }
  }
  return bulgular.sort();
}

/** Kullanılmayan bileşenin BULUNMASINA izin verilen dosyalar — hepsi ölü
 *  DOSYADIR ve `tests/olu-yuzey.test.ts` tarafından ayrıca donduruludur. */
const OLU_DOSYADAKILER = [
  "src/components/mediation/AgreementStreaming.tsx",
  "src/components/mediation/ConflictCards.tsx",
  "src/components/mediation/DiscoveryInterview.tsx",
  "src/components/mediation/PartyForm.tsx",
  "src/components/MediatorAvailabilityCalendar.tsx",
  "src/components/MediatorBlockedDates.tsx",
  "src/components/SessionFeedback.tsx",
  "src/pages/Intake.tsx",
  "src/pages/LegalReasoningHub.tsx",
];

describe("canlı dosyanın içinde ölü bileşen kalmıyor", () => {
  const bulunan = kullanilmayanBilesenler(y("src"));
  const dosyalar = Array.from(new Set(bulunan.map((b) => b.split("  ")[0]))).sort();

  it("tarayıcı gerçekten çalışıyor (tezgâhın kendisi korunuyor)", () => {
    // Regex bozulur ya da yol şaşarsa tarama 0 ya da HER ŞEY bulur; ikisi de
    // sessiz yeşil vermemeli. (24.08 bozuk-bekçi dersi.)
    expect(bulunan.length, "hiç bulgu yok — tarayıcı bozulmuş olabilir").toBeGreaterThan(0);
    expect(bulunan.length, "her şey ölü göründü — kelime sınırı regex'i bozulmuş").toBeLessThan(40);
  });

  it("ölü bileşen yalnız zaten ölü olan DOSYALARDA kalmış", () => {
    const yeni = dosyalar.filter((d) => !OLU_DOSYADAKILER.includes(d));
    expect(
      yeni,
      `Canlı dosyanın içinde ölü bileşen: ${yeni.join(", ")}
` +
        "Ya render edin ya kaldırın; veritabanına yazıyorsa kaldırmak zorunludur " +
        "(merkezin kurallarını atlayan ikinci yol olur).",
    ).toEqual([]);
  });

  it("kaldırılan iki bileşen geri gelmiyor", () => {
    const oda = readFileSync(y("src/pages/CaseRoom.tsx"), "utf-8");
    const motor = readFileSync(y("src/pages/MediationEngine.tsx"), "utf-8");
    expect(oda, "RoundsTab geri geldi — negotiation_rounds'a ikinci yazma yolu").not.toContain("function RoundsTab(");
    expect(motor, "RiskSummaryCard geri geldi").not.toContain("function RiskSummaryCard(");
    // Tek tüketicisi RiskSummaryCard olan yardımcı da öksüz kalmıştı.
    expect(motor).not.toContain("function riskContainerTone(");
  });
});
