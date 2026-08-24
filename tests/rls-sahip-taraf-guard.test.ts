import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/* SAHİP-TARAF GUARD'I (24.08.2026 · P0 kararı, A seçeneği)

   SORUN: `is_case_owner_safe(case_id, user_id)` yalnız `cases.user_id`
   eşleşmesine bakar ve 34 RLS politikası bunu ARABULUCU DÜZEYİ yetki sayar.
   Ama self-servis başvuruda dosyayı açan kişi aynı zamanda o dosyanın ilk
   tarafı olarak yazılır (`MediationEngine.tsx:4101`):
     user_id: !isMediator && parties.length === 0 ? userId : null
   Yani sahip = taraf olabiliyor ve o kişi karşı tarafın gizli verisini görürdü.

   KARAR (A): taraf-gizli tablolarda sahip, o dosyanın TARAFI ise arabulucu
   yetkisi verilmez. Dosya yönetimi (cases, case_parties, case_documents)
   SAHİPTE KALIR — self-servis akış çalışmaya devam eder.

   Bu tezgâh migration kaynağını denetler: guard tanımı duruyor mu, hangi
   tablolara uygulanmış, ve dosya yönetimi tabloları YANLIŞLIKLA daraltılmış mı.
   (Canlı davranış ayrıca ölçüldü: erişimi değişen dosya 0, sahip 9/9 yetkili,
   guard sahiplik yarısı zorla true yapıldığında bile false dönüyor.) */

const MIG_DIZIN = "supabase/migrations";

const HEPSI = readdirSync(MIG_DIZIN)
  .map((f) => readFileSync(join(MIG_DIZIN, f), "utf-8"))
  .join("\n\n");

/* POLİTİKA BLOKLARINI AYRIŞTIR — düz `indexOf("ON public.<tablo>")` YETMEZ:
   o desen eski bir migration'ın `CREATE INDEX … ON public.<tablo>(…)` satırına
   düşüyor ve pencere yanlış yere bakıyor. (Bu tezgâhın ilk yazımında tam bu
   oldu; üç test düştü ve yöntem düzeltildi.) */
type PolitikaBloku = { tablo: string; govde: string };

function politikaBloklari(): PolitikaBloku[] {
  const bloklar: PolitikaBloku[] = [];
  const parcalar = HEPSI.split(/CREATE\s+POLICY/i).slice(1);
  for (const parca of parcalar) {
    const m = /ON\s+public\.([a-z_]+)/i.exec(parca);
    if (!m) continue;
    bloklar.push({ tablo: m[1], govde: parca.slice(0, 900) });
  }
  return bloklar;
}

const BLOKLAR = politikaBloklari();

function tablonunBloklari(tablo: string): PolitikaBloku[] {
  return BLOKLAR.filter((b) => b.tablo === tablo);
}

/** Guard'ın uygulandığı tablolar — kararın kapsamı (A seçeneği + belgeli 6.). */
const KAPSAM = [
  "oturum_hazirlik_foyleri",
  "oturum_kayitlari",
  "taraf_kalemleri",
  "bilirkisi_secim_beyani",
  "bilirkisi_taraf_yanitlari",
  "kayit_onaylari",
];

/** Dosya yönetimi — A kararı gereği sahipte KALMALI, daraltılmamalı. */
const DOKUNULMAYACAK = ["cases_private_keys", "cases_vector_pool"];

describe("sahip-taraf guard'ı tanımlı", () => {
  it("dar yardımcı migration'da var", () => {
    expect(HEPSI).toContain("CREATE OR REPLACE FUNCTION public.is_case_owner_not_party");
  });

  it("guard gerçekten taraf kaydını dışlar", () => {
    // Tanimin govdesi: sahip VE (o dosyada taraf DEGIL).
    expect(HEPSI).toContain("public.is_case_owner_safe(_case_id, _user_id)");
    expect(HEPSI).toContain("AND NOT EXISTS");
    expect(HEPSI).toContain("FROM public.case_parties");
  });

  it("SECURITY DEFINER + search_path sabitlenmiş (kaçırma riski yok)", () => {
    const bas = HEPSI.indexOf("FUNCTION public.is_case_owner_not_party");
    const govde = HEPSI.slice(bas, bas + 400);
    expect(govde).toContain("SECURITY DEFINER");
    expect(govde).toContain("SET search_path TO 'public'");
  });
});

describe("kapsam — taraf-gizli tablolar guard'a alınmış", () => {
  for (const tablo of KAPSAM) {
    it(`${tablo} guard kullanıyor`, () => {
      const bloklar = tablonunBloklari(tablo);
      expect(bloklar.length, `${tablo} için CREATE POLICY bulunamadı`).toBeGreaterThan(0);
      const guardli = bloklar.filter((b) => b.govde.includes("is_case_owner_not_party"));
      expect(guardli.length, `${tablo} guard kullanan politika yok`).toBeGreaterThan(0);
    });
  }

  it("arabulucu dalı hiçbirinde kaldırılmamış", () => {
    for (const tablo of KAPSAM) {
      const guardli = tablonunBloklari(tablo).filter((b) => b.govde.includes("is_case_owner_not_party"));
      for (const b of guardli) {
        expect(b.govde, `${tablo} arabulucu dalını kaybetmiş`).toContain("is_case_mediator");
      }
    }
  });
});

describe("dosya yönetimi sahipte kaldı (A kararının şartı)", () => {
  for (const tablo of [...DOKUNULMAYACAK, "case_parties", "cases", "case_documents"]) {
    it(`${tablo} guard'a alınmadı`, () => {
      const guardli = tablonunBloklari(tablo).filter((b) => b.govde.includes("is_case_owner_not_party"));
      expect(guardli, `${tablo} yanlışlıkla daraltılmış`).toEqual([]);
    });
  }
});
