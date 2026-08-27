import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

/* ÖLÜ YÜZEY TEZGÂHI — 25.08.2026

   Bu proje aynı tuzağa üç kez düştü (tasks/lessons.md): kodda duran ama hiçbir
   yerden erişilemeyen bir ekran, terk edilmiş bir tabloya YAZIYOR ya da
   kullanıcıya yanlış rakam gösteriyor. `MediatorDetail` üç tur kaybettirdi;
   `SessionFeedback` adanın altıncı yüzeyi olarak ancak 25.08'de bulundu.

   Tek düzey "import ediliyor mu" taraması YETMEZ: `IntakeForm` import ediliyordu
   ama onu import eden `Intake.tsx` de ölüydü. Bu yüzden burada `src/main.tsx`ten
   başlayan GEÇİŞLİ erişilebilirlik grafı kurulur.

   Tezgâhın iki sözü var:
   1. Erişilemeyen dosya kümesi DONDURULMUŞTUR. Yeni bir ölü yüzey doğarsa test
      düşer; bir ölü yüzey diriltilirse yine düşer (liste güncellenmeli).
   2. Erişilemeyen bir dosya veritabanına YAZIYORSA (insert/update/delete/upsert)
      bu bir TUZAKTIR ve gerekçesiyle `YAZAN_OLU` içinde adı geçmelidir.

   Kanıt için kök değiştirilebilir (bkz. ADA_KOK · MIG_DIZIN · FN_DIZIN):
   OLU_KOK=tests/gecici/olu-kanit ile kusurun geri getirildiği kopya taranır. */

const KOK = (process.env.OLU_KOK ?? "").replace(/\/+$/, "");
const y = (goreli: string) => (KOK ? `${KOK}/${goreli}` : goreli);

const norm = (p: string) => p.split("\\").join("/");

function kaynaklar(dizin: string, cikti: string[] = []): string[] {
  for (const ad of readdirSync(dizin)) {
    const yol = norm(join(dizin, ad));
    if (statSync(yol).isDirectory()) kaynaklar(yol, cikti);
    else if (/\.(ts|tsx)$/.test(ad)) cikti.push(yol);
  }
  return cikti;
}

/* Göreli import çözümü DAİMA proje kökünden yapılır. Burayı `resolve(KOK)`
   yapmak kanıt koşumunda çözülen yolun başındaki kopya dizinini düşürüyor ve
   `existsSync` gerçek `src/`i buluyordu — graf kopyaya değil asıl ağaca
   çıkıyor, her şey "ölü" görünüyordu. Bunu 4. test yakaladı. */
const TABAN = norm(resolve("."));

function coz(istek: string, kaynak: string): string | null {
  let m: string;
  if (istek.startsWith("@/")) m = y("src/" + istek.slice(2));
  else if (istek.startsWith(".")) m = norm(resolve(dirname(kaynak), istek)).slice(TABAN.length + 1);
  else return null; // node paketi
  for (const ek of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (existsSync(m + ek) && statSync(m + ek).isFile()) return m + ek;
  }
  return null;
}

const ITHAL = /(?:from\s*|import\s*\(\s*|require\s*\(\s*)["'`]([^"'`]+)["'`]/g;

function erisilebilir(): Set<string> {
  const gorulen = new Set<string>();
  const kuyruk = [y("src/main.tsx")];
  while (kuyruk.length) {
    const yol = kuyruk.pop()!;
    if (gorulen.has(yol)) continue;
    gorulen.add(yol);
    for (const m of kaynakOku(yol).matchAll(ITHAL)) {
      const hedef = coz(m[1], yol);
      if (hedef && !gorulen.has(hedef)) kuyruk.push(hedef);
    }
  }
  return gorulen;
}

/** Denetim dışı: shadcn/ui kitaplığı, üretilen tipler, tip bildirimleri, testler. */
const denetimDisi = (yol: string) =>
  yol.includes("/components/ui/") ||
  yol.endsWith("/integrations/supabase/types.ts") ||
  /\.d\.ts$/.test(yol) ||
  /\.test\.tsx?$/.test(yol);

const HEPSI = kaynaklar(y("src"));
const ERISILIR = erisilebilir();
const OLU = HEPSI.filter((f) => !ERISILIR.has(f) && !denetimDisi(f))
  .map((f) => (KOK ? f.slice(KOK.length + 1) : f))
  .sort();

/* DONDURULMUŞ LİSTE — 25.08.2026.
   Tamamı `tasks/HAT.md` H-8'de kayıtlı: `/intake` yolu `RedirectToHub` ile
   `/legal-reasoning`e yönlendirilmiş, başvuru merkeze taşınmış, eski akış kodda
   kalmıştır. Silme kararı kurucudadır (H-8); tezgâh o karara kadar öbeğin
   BÜYÜMESİNİ engeller. */
const BILINEN_OLU = [
  "src/components/CaseDocuments.tsx",
  "src/components/MediatorAvailabilityCalendar.tsx",
  "src/components/MediatorBlockedDates.tsx",
  "src/components/NavLink.tsx",
  "src/components/SessionFeedback.tsx",
  "src/components/intake/CheckboxGroup.tsx",
  "src/components/intake/FormField.tsx",
  "src/components/intake/IntakeChat.tsx",
  "src/components/intake/IntakeForm.tsx",
  "src/components/intake/SelectableCard.tsx",
  "src/components/intake/StepIndicator.tsx",
  "src/components/intake/steps/Step1DisputeType.tsx",
  "src/components/intake/steps/Step2Parties.tsx",
  "src/components/intake/steps/Step3WhatHappened.tsx",
  "src/components/intake/steps/Step4DesiredOutcome.tsx",
  "src/components/intake/steps/Step5Documents.tsx",
  "src/components/intake/steps/StepAiExploration.tsx",
  "src/components/intake/steps/StepMediationType.tsx",
  "src/components/intake/steps/StepMediatorScheduling.tsx",
  "src/components/intake/steps/StepNextStepDecision.tsx",
  "src/components/intake/steps/index.ts",
  "src/components/mediation/AgreementStreaming.tsx",
  "src/components/mediation/ConflictCards.tsx",
  "src/components/mediation/DiscoveryInterview.tsx",
  "src/components/mediation/DocumentUploader.tsx",
  "src/components/mediation/PartyForm.tsx",
  "src/constants/mediationAI.ts",
  "src/hooks/useCaseStorage.ts",
  "src/lib/ai-processing.ts",
  "src/lib/ai.ts",
  "src/lib/masking.ts",
  "src/pages/Intake.tsx",
  "src/pages/LegalReasoningEngine.tsx",
  "src/pages/LegalReasoningHub.tsx",
  "src/types/mediation.ts",
].sort();

/** Erişilemeyen ama veritabanına YAZAN dosyalar — her biri gerekçeli. */
const YAZAN_OLU: Record<string, string> = {
  "src/components/intake/IntakeForm.tsx":
    "H-8 · `cases` + `case_parties`e INSERT: merkezin kurallarını atlayan ikinci dosya açma yolu. Erişilemez olduğu için canlıda zarar yok; silme kararı kurucuda.",
  "src/components/SessionFeedback.tsx":
    "H-7 · `session_feedback`e INSERT; RLS'i ölü `mediator_requests`e zincirli olduğu için erişilebilir olsa bile yazamaz.",
  "src/components/MediatorBlockedDates.tsx":
    "H-8 sınıfı · `mediator_blocked_dates` (canlıda 0 satır) — arabulucu takvimi merkeze taşındı (`CalendarPage`).",
  "src/components/CaseDocuments.tsx":
    "H-8 sınıfı · `case_documents`e INSERT **ve** `case-documents` kovasından `storage.remove` + satır DELETE. Belge yüzeyinin canlı hâli `CaseDetail`/`AgreementGenerator`dır; bu kopya erişilemez. Silici bir yol olduğu için diriltilmeden önce 24.08 kova sızıntısı dersine bakılmalı.",
  "src/hooks/useCaseStorage.ts":
    "H-8 · `cases` INSERT/UPDATE — başvuru adasının depo kancası; tek tüketicisi ölü `IntakeForm`dur.",
  "src/components/MediatorAvailabilityCalendar.tsx":
    "H-8 sınıfı · `mediator_availability` yazımının canlı yüzeyi `CalendarPage`tir; bu kopya erişilemez.",
};

const YAZMA = /\.(insert|update|upsert|delete)\s*\(/;

describe("ölü yüzey tezgâhı", () => {
  it("erişilemeyen dosya kümesi dondurulmuş listeyle birebir aynı", () => {
    const yeni = OLU.filter((f) => !BILINEN_OLU.includes(f));
    const dirilen = BILINEN_OLU.filter((f) => !OLU.includes(f));
    expect(yeni, `YENİ ölü yüzey doğdu: ${yeni.join(", ")}`).toEqual([]);
    expect(dirilen, `ölü sayılan dosya diriltilmiş, listeyi güncelle: ${dirilen.join(", ")}`).toEqual([]);
  });

  it("veritabanına yazan her ölü dosya gerekçesiyle kayıtlı", () => {
    const kayitsiz = OLU.filter(
      (f) => YAZMA.test(kaynakOku(y(f))) && !(f in YAZAN_OLU),
    );
    expect(
      kayitsiz,
      `erişilemeyen dosya veritabanına YAZIYOR ve gerekçesi yok (tuzak): ${kayitsiz.join(", ")}`,
    ).toEqual([]);
  });

  it("gerekçe listesi hayalet madde taşımıyor", () => {
    const hayalet = Object.keys(YAZAN_OLU).filter((f) => !OLU.includes(f));
    expect(hayalet, `artık ölü olmayan/olmayan dosya gerekçe listesinde: ${hayalet.join(", ")}`).toEqual([]);
  });

  it("uygulamanın giriş noktasından gerçekten bir graf çıkıyor", () => {
    // Tarama bozulursa (regex/çözümleme kusuru) her şey 'ölü' görünür — bu testin
    // asıl işi tezgâhın kendisini korumaktır; 24.08'de tam bu oldu.
    expect(ERISILIR.size).toBeGreaterThan(100);
    expect(ERISILIR.has(y("src/App.tsx"))).toBe(true);
    expect(ERISILIR.has(y("src/pages/Dashboard.tsx"))).toBe(true);
    expect(ERISILIR.has(y("src/pages/MediationEngine.tsx"))).toBe(true);
  });
});
