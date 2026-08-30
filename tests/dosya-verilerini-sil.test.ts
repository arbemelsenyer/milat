import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";

/* DOSYA VERİSİ SİLEN İKİ KOL — constitution m.10 · HAT H-15/1 (25.08.2026)
 *
 * Kurucu kararı silmeyi arabulucunun açık eylemine bağladı ve şunu şart koştu:
 * "Silme GERÇEKTEN silme olmalı: depo nesnesi + satır. Tezgâhla kanıtlanacak."
 * Bu dosya o şartın karşılığıdır; 29.08.2026'ya kadar bu kolların hiç tezgâhı
 * yoktu — geri alınamaz iki yol, denetimsiz duruyordu.
 *
 * BULUNAN İKİ KUSUR (29.08.2026).
 * (1) `dosya-verilerini-sil` 25.08'de depo temizliği kazanmıştı ama YALNIZ
 *     `case_documents` için. Dosyaya bağlı DÖRT tablo depoda nesne gösteriyor;
 *     öteki üçünün (imzalı anlaşma taraması · bilirkişi raporu · dökümden
 *     sonra silinemeyip kaçan ses) satırları siliniyor, dosyaları kovada
 *     kalıyordu.
 * (2) DAHA AĞIRI: başvuru listesindeki çöp kutusu düğmesi
 *     (`MediationEngine.tsx` `deleteCase`) istemciden doğrudan
 *     `from("cases").delete()` çağırıyordu. Cascade çocuk satırları götürüyor,
 *     depoya HİÇ dokunulmuyordu — oysa onay penceresi "belgeler de
 *     silinecektir" diyor. 25.08'de canlıda bulunan 6 öksüz belgenin muhtemel
 *     üreticisi bu yol. Artık `basvuru-sil` kolundan geçiyor.
 *
 * Kural iki kolda ayrı yazılırsa biri düzeltilip öteki açık kalır — 25.08'de
 * tam bu oldu. Bu yüzden süpürge TEK YERDEDİR: `_shared/depo-supurge.ts`.
 *
 * Okuma `kaynakOku` üzerinden: denetimlerin bir kısmı çok satırlı arar ve
 * dosya çalışma ağacına CRLF ile inerse ham okuma sessizce eşleşmez.
 */
const SUPURGE = kaynakOku("supabase/functions/_shared/depo-supurge.ts");
const SILME = kaynakOku("supabase/functions/_shared/dosya-silme.ts");
const IMHA = kaynakOku("supabase/functions/saklama-imha/index.ts");
const C3 = kaynakOku("supabase/functions/dosya-verilerini-sil/index.ts");
const BASVURU = kaynakOku("supabase/functions/basvuru-sil/index.ts");
const EKRAN = kaynakOku("src/pages/MediationEngine.tsx");
const TIPLER = kaynakOku("src/integrations/supabase/types.ts");
const AYAR = kaynakOku("supabase/config.toml");

/** `DEPO_KAYNAKLARI` dizisindeki `{ tablo, kolon, kova }` üçlüleri. */
function depoKaynaklari(): { tablo: string; kolon: string; kova: string }[] {
  const bas = SUPURGE.indexOf("export const DEPO_KAYNAKLARI");
  expect(bas, "DEPO_KAYNAKLARI listesi yok").toBeGreaterThan(-1);
  const son = SUPURGE.indexOf("];", bas);
  return [...SUPURGE.slice(bas, son).matchAll(
    /\{\s*tablo:\s*"([a-z0-9_]+)",\s*kolon:\s*"([a-z0-9_]+)",\s*kova:\s*([A-Z_]+|"[a-z-]+")\s*\}/g,
  )].map((m) => ({ tablo: m[1], kolon: m[2], kova: m[3] }));
}

/** Yorumları atar: bir deseni YORUMDA görüp kusur sanmak en pahalı yanlış
 *  alarmdır (CLAUDE.md §18-A). Aranan şey kodun YAPTIĞIDIR, anlattığı değil. */
const govdesi = (g: string) =>
  g.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

/** `SILME_SIRASI` dizisindeki satırlar: tablo · gerçek bağ alanı · `uzeri`. */
function silmeSirasi(): { tablo: string; alan: string; uzeri: boolean }[] {
  const bas = SILME.indexOf("export const SILME_SIRASI");
  expect(bas, "SILME_SIRASI listesi yok").toBeGreaterThan(-1);
  const son = SILME.indexOf("];", bas);
  return [...SILME.slice(bas, son).matchAll(
    /\{\s*tablo:\s*"([a-z0-9_]+)"(?:,\s*alan:\s*"([a-z0-9_]+)")?(?:,\s*uzeri:\s*"([a-z0-9_]+)")?\s*\}/g,
  )].map((m) => ({
    tablo: m[1],
    alan: m[2] ?? (m[3] ? "party_id" : "case_id"),
    uzeri: !!m[3],
  }));
}

/** `types.ts` Row bloklarından tablo → kolon adları. */
function semaKolonlari(): Record<string, string[]> {
  const harita: Record<string, string[]> = {};
  let tablo: string | null = null;
  let rowIcinde = false;
  for (const l of TIPLER.split("\n")) {
    const t = l.match(/^ {6}([a-z0-9_]+): \{$/);
    if (t) { tablo = t[1]; harita[tablo] ??= []; rowIcinde = false; }
    if (tablo && /^ {8}Row: \{$/.test(l)) { rowIcinde = true; continue; }
    if (rowIcinde) {
      if (/^ {8}\}$/.test(l)) { rowIcinde = false; continue; }
      const k = l.match(/^ {10}([a-zA-Z0-9_]+)\??:/);
      if (k) harita[tablo!].push(k[1]);
    }
  }
  return harita;
}

describe("depo süpürgesi: silme gerçekten silme", () => {
  it("DEPOYA YOL YAZAN DÖRT KAYNAĞIN HEPSİ listede", () => {
    const anahtar = depoKaynaklari().map((k) => `${k.tablo}.${k.kolon}`);
    expect(anahtar).toContain("case_documents.file_path");
    expect(anahtar, "imzalı anlaşma taraması kovada öksüz kalıyor")
      .toContain("agreement_documents.file_path");
    expect(anahtar, "bilirkişi raporu kovada öksüz kalıyor")
      .toContain("bilirkisi_raporlari.dosya_yolu");
    expect(anahtar, "kaçan ses kaydı kovada öksüz kalıyor")
      .toContain("oturum_kayitlari.ses_dosya_yolu");
  });

  it("SES AYRI KOVADA — belge kovasına yazılmış olamaz", () => {
    const ses = depoKaynaklari().find((k) => k.tablo === "oturum_kayitlari");
    expect(ses?.kova, "ses kaydı yanlış kovadan silinmeye çalışılıyor").toBe("KAYIT_KOVASI");
    expect(SUPURGE).toContain('export const KAYIT_KOVASI = "oturum-kayitlari";');
    expect(SUPURGE).toContain('export const BELGE_KOVASI = "case-documents";');
  });

  it("BEKÇİ: şemada depoya yol yazan yeni bir tablo listeden kaçamaz", () => {
    /* Bu denetim, kusurun kendisini bir daha kurulamaz yapar: `types.ts`te
       `case_id` taşıyan ve adı yol/dosya yolu olan bir kolon çıkarsa, o tablo
       `DEPO_KAYNAKLARI`da yoksa burada kırmızı yanar. */
    const listedeki = new Set(depoKaynaklari().map((k) => `${k.tablo}.${k.kolon}`));
    const kacanlar: string[] = [];
    for (const [tablo, kolonlar] of Object.entries(semaKolonlari())) {
      if (!kolonlar.includes("case_id")) continue;
      for (const k of kolonlar) {
        if (!/(^file_path$|_dosya_yolu$|^dosya_yolu$)/.test(k)) continue;
        if (!listedeki.has(`${tablo}.${k}`)) kacanlar.push(`${tablo}.${k}`);
      }
    }
    expect(kacanlar, `depoya yol yazıyor ama süpürgede yok: ${kacanlar.join(", ")}`)
      .toEqual([]);
  });

  it("YOLLAR OKUNUR → DEPO SİLİNİR; hata varsa ok:false döner", () => {
    const okuIdx = SUPURGE.indexOf('.select(kaynak.kolon).eq("case_id", case_id)');
    const depoIdx = SUPURGE.indexOf(".storage.from(kova).remove(yollar)");
    expect(okuIdx, "yollar okunmuyor").toBeGreaterThan(-1);
    expect(depoIdx, "depo silmesi yok").toBeGreaterThan(okuIdx);
    const kalan = SUPURGE.slice(depoIdx, depoIdx + 600);
    expect(kalan).toContain("if (depoErr)");
    expect(kalan, "depo düşerken yine de ok dönüyor").toContain("ok: false");
    expect(kalan).toContain("hiçbir kayıt silinmedi");
  });

  it("SESSİZ KIRPMA YOK — yol listesi sınıra dayanırsa ok:false", () => {
    expect(SUPURGE).toContain("export const YOL_SINIRI");
    const idx = SUPURGE.indexOf("ham.length === YOL_SINIRI");
    expect(idx, "sınıra dayanma denetimi yok").toBeGreaterThan(-1);
    const kalan = SUPURGE.slice(idx, idx + 400);
    expect(kalan, "sınıra dayanınca yine de siliyor").toContain("ok: false");
  });

  it("SÜPÜRGE TEK YERDE — hiçbir kol kendi listesini tutmuyor", () => {
    const kollar: [string, string][] = [
      ["dosya-verilerini-sil", C3],
      ["basvuru-sil", BASVURU],
      ["saklama-imha", IMHA],
      ["_shared/dosya-silme", SILME],
    ];
    for (const [ad, g] of kollar) {
      expect(g, `${ad} kendi kaynak listesini tutuyor — ikinci kural doğar`)
        .not.toContain("const DEPO_KAYNAKLARI");
      if (ad === "_shared/dosya-silme") {
        expect(g, "ortak modül süpürgeyi çağırmıyor")
          .toContain('import { depoyuSupur } from "./depo-supurge.ts";');
      }
    }
    // Depoya dokunan tek yer süpürgedir; kova adı başka yerde geçmez.
    expect(govdesi(C3), "C3 depoya kendi dokunuyor").not.toMatch(/storage\.from\(/);
    expect(govdesi(SILME), "ortak silme modülü depoya kendi dokunuyor")
      .not.toMatch(/storage\.from\(/);
  });

  it("SİLME SIRASI TEK YERDE — üç kol da ortak modülü kullanıyor", () => {
    expect(SILME, "silme sırası ortak modülde değil").toContain("export const SILME_SIRASI");
    expect(C3, "C3 kendi sırasını tutuyor").not.toContain("const SILME_SIRASI");
    expect(C3).toContain('import { dosyayiTemizle } from "../_shared/dosya-silme.ts";');
    expect(IMHA).toContain('import { dosyayiTemizle } from "../_shared/dosya-silme.ts";');
  });
});

describe("iki silme kolu: önce depo, sonra satır", () => {
  it("ORTAK MODÜL: depo → satırlar → anonim kayıt → cases", () => {
    /* 30.08.2026'da sıra DEĞİŞTİ. Eskiden anonim kayıt satırlardan ÖNCE
       yazılıyordu; silme yarıda kalınca geriye "silindi" diyen bir kanıt
       kalıyordu ve canlıda tam bu oldu (5 dosya için 5 yalancı satır).
       Kanıt, kanıtladığı işten SONRA yazılır — ama `cases` hâlâ dururken,
       çünkü kayıt tablosunun `cases`e bağlanmaması gerekçesi sürüyor. */
    const depoIdx = SILME.indexOf("const supurge = await depoyuSupur(admin, case_id);");
    const kayitIdx = SILME.indexOf('from("kapanis_istatistigi").insert(');
    const satirIdx = SILME.indexOf("const q = kapsamla(t, admin.from(t.tablo).delete());");
    const dosyaIdx = SILME.indexOf('await admin.from("cases").delete()');
    expect(depoIdx, "süpürge çağrılmıyor").toBeGreaterThan(-1);
    expect(satirIdx, "satır silmesi süpürgeden ÖNCE").toBeGreaterThan(depoIdx);
    expect(kayitIdx, "anonim kayıt satırlar SİLİNMEDEN yazılıyor — olmamış işin kanıtı")
      .toBeGreaterThan(satirIdx);
    expect(dosyaIdx, "dosya silmesi kayıttan ÖNCE").toBeGreaterThan(kayitIdx);
    // Süpürge düşerse HİÇBİR satıra dokunulmaz.
    expect(SILME.slice(depoIdx, satirIdx)).toMatch(/if \(!supurge\.ok\) return/);
  });

  it("BEKÇİ: silme sırasındaki her `tablo.alan` çifti ŞEMADA VAR", () => {
    /* 30.08.2026 · P0'ın kendisi. İki satır `alan: "case_id"` diyordu ama o
       tablolarda `case_id` kolonu YOK (`taraf_musaitlik.party_id` ·
       `case_party_invites.case_party_id`). PostgREST olmayan kolona silme
       isteğini 42703 ile reddediyor — TABLO BOŞ OLSA BİLE — ve döngü ilk
       hatada `return` ettiği için silme tam orada duruyordu. Canlıda süresi
       dolan 5 dosyanın ilk 18 tablosu silindi, gerisi ve `cases` kaldı.
       `DEPO_KAYNAKLARI` için aynı bekçi vardı; silme sırası denetimsizdi. */
    const sema = semaKolonlari();
    const kacanlar: string[] = [];
    for (const s of silmeSirasi()) {
      const kolonlar = sema[s.tablo];
      if (!kolonlar) { kacanlar.push(`${s.tablo} (tablo şemada yok)`); continue; }
      if (!kolonlar.includes(s.alan)) kacanlar.push(`${s.tablo}.${s.alan}`);
    }
    expect(kacanlar, `silme sırası şemayla uyuşmuyor: ${kacanlar.join(", ")}`).toEqual([]);
  });

  it("BEKÇİ: taraf üzerinden bağlı tablo `case_parties`ten ÖNCE siliniyor", () => {
    /* `uzeri` satırları taraf kimliklerini kullanır; taraflar önce silinirse
       kimlik listesi boşalır ve o satırlar sessizce ayakta kalır. */
    const liste = silmeSirasi();
    const tarafIdx = liste.findIndex((s) => s.tablo === "case_parties");
    expect(tarafIdx, "`case_parties` silme sırasında yok").toBeGreaterThan(-1);
    for (const [i, s] of liste.entries()) {
      if (!s.uzeri) continue;
      expect(i, `${s.tablo} taraflardan SONRA siliniyor — hiç silinmez`).toBeLessThan(tarafIdx);
    }
    // En az bir `uzeri` satırı olmalı; yoksa denetim sessizce boşa döner.
    expect(liste.filter((s) => s.uzeri).length,
      "taraf üzerinden bağlı tablo kalmadı mı? denetim boşa dönüyor").toBeGreaterThan(0);
  });

  it("SAYIM SESSİZ SIFIRLAMIYOR — okunamayan tablo uyarı üretiyor", () => {
    /* Sayım try/catch içindeydi; supabase-js hatayı FIRLATMADIĞI için
       okunamayan tablo sessizce 0 sayılıyordu. Şemayla uyuşmayan iki satır
       tam bu yüzden sayımda da görünmedi. */
    expect(govdesi(SILME), "sayım hatayı yine yutuyor")
      .not.toMatch(/catch \{ \/\* tablo yoksa/);
    expect(SILME).toContain("sayılamadı —");
  });

  it("ANONİM KAYIT `cases` SİLİNMEDEN ÖNCE yazılıyor", () => {
    /* 29.08.2026 kusuru: kayıt `dosya_kapanis`e, üstelik `cases` silindikten
       SONRA yazılıyordu. O tablo `cases`e ON DELETE CASCADE bağlıdır — satır
       çoktan gitmiş oluyor, güncelleme 0 satır etkiliyor ve supabase-js bunu
       hata SAYMIYOR. Yani KVKK silmesinin kanıtı ne yazılıyor ne de
       yazılmadığı söyleniyordu. */
    const kayitIdx = SILME.indexOf('from("kapanis_istatistigi").insert(');
    const dosyaIdx = SILME.indexOf('await admin.from("cases").delete()');
    expect(kayitIdx, "anonim kayıt yok").toBeGreaterThan(-1);
    expect(dosyaIdx, "kayıt `cases` silindikten SONRA yazılıyor").toBeGreaterThan(kayitIdx);
    // Kayıt tablosu `cases`e BAĞLANMAMALI; yoksa aynı kusur geri gelir.
    const SQL = kaynakOku("tests/sabit/kapanis-istatistigi.sql");
    expect(SQL, "anonim kayıt tablosu `cases`e bağlanmış").not.toMatch(/references\s+public\.cases/i);
    expect(SQL).toContain("enable row level security");
    // Tablo yoksa silme DURMAZ ama sessiz de geçilmez.
    expect(SILME).toContain("kapanis_istatistigi` tablosu yok");
  });

  it("başvuru silmesi: süpürge satır silmesinden ÖNCE", () => {
    const supurgeIdx = BASVURU.indexOf("const supurge = await depoyuSupur(admin, case_id);");
    const satirIdx = BASVURU.indexOf('.delete({ count: "exact" }).eq("id", case_id)');
    expect(supurgeIdx, "süpürge çağrılmıyor").toBeGreaterThan(-1);
    expect(satirIdx, "satır silmesi bulunamadı").toBeGreaterThan(-1);
    expect(satirIdx, "satır silmesi süpürgeden ÖNCE").toBeGreaterThan(supurgeIdx);
    expect(BASVURU.slice(supurgeIdx, satirIdx)).toMatch(/if \(!supurge\.ok\) return json/);
  });

  it("bilirkisi_raporlari satır silme sırasında da var", () => {
    const bas = SILME.indexOf("export const SILME_SIRASI");
    const son = SILME.indexOf("];", bas);
    expect(SILME.slice(bas, son)).toContain('{ tablo: "bilirkisi_raporlari" }');
  });
});

describe("başvuru silme: istemci artık çıplak silmiyor", () => {
  it("EKRANDA çıplak dosya silmesi KALMADI", () => {
    /* Bu satır 29.08'e kadar buradaydı ve her silinen başvurunun bütün
       dosyalarını kovada bırakıyordu. Geri konursa burası kırmızı yanar. */
    expect(govdesi(EKRAN), "istemci yine doğrudan dosya siliyor — depo öksüz kalır")
      .not.toMatch(/from\("cases"\)\s*\.delete\(/);
  });

  it("silme `basvuru-sil` kolundan geçiyor", () => {
    expect(EKRAN).toContain('supabase.functions.invoke("basvuru-sil"');
    const cagriIdx = EKRAN.indexOf('supabase.functions.invoke("basvuru-sil"');
    const kalan = EKRAN.slice(cagriIdx, cagriIdx + 500);
    // Kol hata dönerse "silindi" denmiyor.
    expect(kalan).toMatch(/if \(hata\) throw new Error\(hata\)/);
    expect(kalan).toMatch(/silindi/);
  });

  it("kol config.toml'da kayıtlı ve JWT arıyor", () => {
    expect(AYAR, "basvuru-sil config.toml'da yok").toContain("[functions.basvuru-sil]");
    const idx = AYAR.indexOf("[functions.basvuru-sil]");
    expect(AYAR.slice(idx, idx + 80)).toContain("verify_jwt = true");
  });

  it("YETKİ GENİŞLEMİYOR — RLS politikasının aynısı aranıyor", () => {
    /* `cases` RLS silme politikası: assigned_mediator_id = auth.uid() ya da
       admin. Kol servis anahtarıyla RLS'i aştığı için aynı iki koşulu KENDİSİ
       aramalı; aramazsa herhangi bir oturum her başvuruyu silebilir. */
    expect(BASVURU).toMatch(/assigned_mediator_id[\s\S]{0,40}=== userId/);
    expect(BASVURU).toMatch(/from\("user_roles"\)[\s\S]{0,120}eq\("role", "admin"\)/);
    const yetkiIdx = BASVURU.indexOf("if (!yetkili)");
    const supurgeIdx = BASVURU.indexOf("const supurge = await depoyuSupur");
    expect(yetkiIdx, "yetki kapısı yok").toBeGreaterThan(-1);
    expect(supurgeIdx, "yetki kapısı silmeden SONRA").toBeGreaterThan(yetkiIdx);
  });
});

describe("insan kapısı bozulmuyor", () => {
  it("KENDİLİĞİNDEN SİLME YOK — iki kolda da cron sırrı okunmuyor", () => {
    const kollar: [string, string][] = [
      ["dosya-verilerini-sil", C3],
      ["basvuru-sil", BASVURU],
    ];
    for (const [ad, g] of kollar) {
      // Yorumda geçebilir ("x-cron-secret KABUL EDİLMEZ"); yasak olan OKUNMASI.
      expect(govdesi(g), `${ad} koluna cron kapısı açılmış`).not.toMatch(/x-cron-secret/);
      expect(g).toContain('const authHeader = req.headers.get("Authorization");');
    }
  });

  it("C3: 'SİL' yazılmadan ve paket alınmadan hiçbir silme başlamıyor", () => {
    const onayIdx = C3.indexOf('onay.toLocaleUpperCase("tr-TR") !== "SİL"');
    const paketIdx = C3.indexOf("paket_alindi");
    const supurgeIdx = C3.indexOf('dosyayiTemizle(admin, case_id, "arabulucu")');
    expect(onayIdx, "elle onay kapısı yok").toBeGreaterThan(-1);
    expect(paketIdx, "paket kapısı yok").toBeGreaterThan(-1);
    expect(supurgeIdx, "silme çağrısı bulunamadı").toBeGreaterThan(-1);
    expect(onayIdx, "onay kapısı silmeden sonra").toBeLessThan(supurgeIdx);
    expect(paketIdx, "paket kapısı silmeden sonra").toBeLessThan(supurgeIdx);
    expect(C3).toContain("Önce kapanış paketini almalısınız.");
  });

  it("İKİ KOL AYRI KALIYOR — başvuru kolu C3'ün kapılarını atlatmıyor", () => {
    /* `basvuru-sil` yürümemiş bir BAŞVURUYU kaldırır; süreci bitmiş bir
       dosyanın verisini silmek C3'ün işidir ve oradaki iki kapı (paket + "SİL"
       yazma) oraya aittir. Başvuru kolu o kapıları taşımaz ama C3'ün yerine de
       geçemez: kapanış kaydına dokunmaz. */
    expect(govdesi(BASVURU), "başvuru kolu kapanış kaydına dokunuyor")
      .not.toContain("dosya_kapanis");
    expect(govdesi(BASVURU), "başvuru kolu C3'ün onay kapısını taklit ediyor")
      .not.toContain('"SİL"');
  });
});
