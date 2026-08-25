import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* BİLİRKİŞİ ÖNERİSİ — iz ve bildirim (25.08.2026)

   Bilirkişi önerisini iki yüzey yazıyordu ve ikisi aynı işi yapmıyordu:
   `CaseRoom.ExpertsTab` denetim izi yazıp tarafları uyarıyordu,
   `MediationEngine.Phase7Expert` ise yalnız satırı atıyordu. Arabulucu canlıda
   `CaseRedirect` üzerinden HER ZAMAN `MediationEngine`e düşer — yani eksik olan
   yol gerçekte kullanılan yoldu.

   CANLI KANIT (25.08): `case_expert_assignments` 2 satır (20.08 ve 21.08),
   `expert_assignment_logs` **0 satır**, `notifications` içinde tek bir bilirkişi
   başlığı yok (29 bildirimin hiçbiri). Öneri "Onay Bekliyor"da kalıyordu çünkü
   onayı verecek taraf hiç haberdar edilmiyordu.

   Kanıt için kök değiştirilebilir: BILIRKISI_KOK=tests/gecici/bilirkisi-kanit */

const KOK = (process.env.BILIRKISI_KOK ?? "").replace(/\/+$/, "");
const y = (goreli: string) => (KOK ? `${KOK}/${goreli}` : goreli);

const motor = () => readFileSync(y("src/pages/MediationEngine.tsx"), "utf-8");
const oda = () => readFileSync(y("src/pages/CaseRoom.tsx"), "utf-8");
const modul = () => readFileSync(y("src/lib/expert-assignment.ts"), "utf-8");

/** Phase7Expert gövdesi: bileşen başından dosya sonuna kadar olan dilim yetmez,
 *  bir sonraki üst düzey `function`a kadar kes. */
function phase7(g: string): string {
  const bas = g.indexOf("function Phase7Expert(");
  expect(bas, "Phase7Expert bulunamadı — bileşen adı değiştiyse tezgâh güncellenmeli").toBeGreaterThan(-1);
  const son = g.indexOf("\nfunction ", bas + 10);
  return g.slice(bas, son > -1 ? son : g.length);
}

describe("bilirkişi önerisi iz bırakıyor ve tarafa ulaşıyor", () => {
  it("merkezî yüzey (MediationEngine) atamayı denetim izine yazıyor", () => {
    const g = phase7(motor());
    expect(g, "atama yapılıyor ama denetim izi yazılmıyor").toContain("logExpertAction");
    expect(g, "öneri eylemi 'proposed' olarak kaydedilmiyor").toContain('action: "proposed"');
    expect(g, "atama kaldırma izi yazılmıyor").toContain('action: "removed"');
  });

  it("merkezî yüzey öneriyi taraflara bildiriyor", () => {
    const g = phase7(motor());
    expect(g, "taraf bildirimi gönderilmiyor — öneri sonsuza dek 'Onay Bekliyor'da kalır")
      .toContain("notifyCaseParties");
    expect(g).toContain("Yeni Bilirkişi Önerisi");
  });

  it("iz/bildirim hatası sessiz yutulmuyor", () => {
    const g = phase7(motor());
    expect(g, "iz veya bildirim hatası kullanıcıya bildirilmiyor").toMatch(
      /iz\.error\s*\|\|\s*bildirim\.error/,
    );
  });

  it("durum sözlüğü gerçek durum değerlerini karşılıyor", () => {
    const g = motor();
    const bas = g.indexOf("const EXPERT_STATUS_LABEL");
    const sozluk = g.slice(bas, g.indexOf("};", bas));
    // Taraf onay akışı approved/rejected yazar; kenar işlevi "onerildi" yazar.
    for (const anahtar of ["pending", "onerildi", "approved", "rejected"]) {
      expect(sozluk, `durum sözlüğünde '${anahtar}' yok — ham durum ekrana düşer`).toContain(anahtar);
    }
  });

  it("iz yazımının tek bir uygulaması var (ikinci kopya yeniden doğmasın)", () => {
    const paylasilan = modul();
    expect(paylasilan).toContain('.from("expert_assignment_logs")');
    // Yüzeylerin kendi insert'ü olmamalı: ikisi de paylaşılan modülü çağırır.
    for (const [ad, g] of [["MediationEngine", motor()], ["CaseRoom", oda()]] as const) {
      expect(g, `${ad} denetim izini kendi başına yazıyor — kopya yeniden doğdu`)
        .not.toContain('.from("expert_assignment_logs").insert');
      expect(g, `${ad} paylaşılan modülü kullanmıyor`).toContain("@/lib/expert-assignment");
    }
  });

  it("taraf odası da paylaşılan izi kullanıyor ve hatayı bildiriyor", () => {
    const g = oda();
    expect(g).toContain("async function izYaz(");
    expect(g, "iz hatası kullanıcıya bildirilmiyor").toMatch(
      /izYaz[\s\S]{0,240}variant: "destructive"/,
    );
  });
});
