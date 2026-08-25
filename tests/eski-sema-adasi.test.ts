import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/* ESKİ ŞEMA ADASI — `mediator_requests` (24.08.2026 kusuru)

   `mediator_requests` canlıda **0 satırdır** ve hiçbir tüketicisi yoktur; buna
   rağmen beş ön yüz yüzeyi ona dokunuyordu:
     · MediatorDetail.tsx      → INSERT (randevu talebi hiçbir yere düşmüyordu)
     · MediatorMarketplace.tsx → sayfaya tek giriş; kendisi de ölüydü
     · SessionCalendar.tsx / WeeklyCalendarView.tsx → hiçbir yerden import edilmiyordu
     · useCaseStorage.submitMediatorRequest → çağrısı kalmamış yardımcı
     · Analytics.tsx           → istatistiği bu tablodan okuyordu, yıllardır "0 oturum"

   CANLI RANDEVU YOLU BAŞKADIR: `randevu_teklifleri` (arabulucu seçenek sunar,
   taraf seçer — `randevu-teklif` edge function'ı) ve atama `case_assignments`.
   Oturumların gerçekte durduğu yer `case_sessions`tir.

   KARAR: H-3 · A — kod dosyaları silinir, tablolar durur (geri dönüşsüz olan
   tablo silmektir, §7.3). Bu tezgâh adanın geri sızmasını engeller.

   Not: `src/integrations/supabase/types.ts` Supabase tarafından ÜRETİLİR; tablo
   durduğu sürece adı orada geçer ve geçmelidir — denetim dışıdır. */

/* Kanıt için kök değiştirilebilir (bkz. H-6'daki MIG_DIZIN, H-2'deki FN_DIZIN):
   ADA_KOK=tests/gecici/ada-kanit ile kusurun geri getirildiği kopya taranır. */
const KOK = (process.env.ADA_KOK ?? "").replace(/\/+$/, "");
const y = (goreli: string) => (KOK ? `${KOK}/${goreli}` : goreli);

const URETILEN = y("src/integrations/supabase/types.ts");

function tsKaynaklari(dizin = y("src")): string[] {
  const cikti: string[] = [];
  for (const ad of readdirSync(dizin)) {
    const yol = join(dizin, ad).split("\\").join("/");
    if (statSync(yol).isDirectory()) cikti.push(...tsKaynaklari(yol));
    else if (/\.(ts|tsx)$/.test(ad) && yol !== URETILEN) cikti.push(yol);
  }
  return cikti;
}

const KAYNAKLAR = tsKaynaklari();

describe("eski şema adası geri sızmıyor", () => {
  it("hiçbir canlı ön yüz dosyası `mediator_requests`e dokunmuyor", () => {
    const dokunanlar = KAYNAKLAR.filter((y) =>
      /\.from\(\s*["'`]mediator_requests/.test(readFileSync(y, "utf-8")),
    );
    expect(dokunanlar, `ada geri geldi: ${dokunanlar.join(", ")}`).toEqual([]);
  });

  it("ölü dört bileşen dosyası kaldırılmış durumda", () => {
    for (const yol of [
      y("src/pages/MediatorDetail.tsx"),
      y("src/components/mediation/MediatorMarketplace.tsx"),
      y("src/components/SessionCalendar.tsx"),
      y("src/components/WeeklyCalendarView.tsx"),
    ]) {
      expect(existsSync(yol), `${yol} geri gelmiş`).toBe(false);
    }
  });

  it("`submitMediatorRequest` yardımcısı hiçbir yerde tanımlı/çağrılı değil", () => {
    const kalanlar = KAYNAKLAR.filter((y) =>
      readFileSync(y, "utf-8").includes("submitMediatorRequest"),
    );
    expect(kalanlar, `yardımcı geri gelmiş: ${kalanlar.join(", ")}`).toEqual([]);
  });

  it("`/mediator/:id` yolu yönlendirmede yok (sayfa silindi)", () => {
    expect(readFileSync(y("src/App.tsx"), "utf-8")).not.toContain('path="/mediator/:id"');
  });

  it("Analytics oturum istatistiğini canlı tablodan (`case_sessions`) okuyor", () => {
    const analytics = readFileSync(y("src/pages/Analytics.tsx"), "utf-8");
    expect(analytics).toContain('.from(\'case_sessions\')');
    expect(analytics).toContain("scheduled_at");
    expect(analytics).not.toContain("scheduled_date");
  });
});
