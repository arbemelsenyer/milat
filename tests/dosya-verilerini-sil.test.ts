import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";

/* KVKK SİLME KOLU — constitution m.10 · HAT H-15/1 (25.08.2026, sıfır saklama)
 *
 * Kurucu kararı silmeyi arabulucunun açık eylemine bağladı ve şunu şart koştu:
 * "Silme GERÇEKTEN silme olmalı: depo nesnesi + satır. Tezgâhla kanıtlanacak."
 * Bu dosya o şartın karşılığıdır; 29.08.2026'ya kadar bu kolun hiç tezgâhı
 * yoktu — geri alınamaz bir yol, denetimsiz duruyordu.
 *
 * BULUNAN KUSUR (29.08.2026). 25.08'de kola depo temizliği eklenmişti ama
 * YALNIZ `case_documents` için. Dosyaya bağlı DÖRT tablo depoda nesne
 * gösteriyor; öteki üçünün (imzalı anlaşma taraması · bilirkişi raporu ·
 * dökümden sonra silinemeyip kaçan ses kaydı) satırları siliniyor, dosyaları
 * kovada kalıyordu. Satır gidince o nesneyi gösteren hiçbir kayıt kalmaz;
 * hiçbir silme kolu onu bir daha bulamaz. `saklama-imha` bu ayrımı zaten
 * biliyordu (ses için ayrı kova), silme kolu bilmiyordu.
 *
 * Okuma `kaynakOku` üzerinden: denetimlerin bir kısmı çok satırlı arar ve
 * dosya çalışma ağacına CRLF ile inerse ham okuma sessizce eşleşmez.
 */
const G = kaynakOku("supabase/functions/dosya-verilerini-sil/index.ts");
const TIPLER = kaynakOku("src/integrations/supabase/types.ts");

/** `DEPO_KAYNAKLARI` dizisindeki `{ tablo, kolon, kova }` üçlüleri. */
function depoKaynaklari(): { tablo: string; kolon: string; kova: string }[] {
  const bas = G.indexOf("const DEPO_KAYNAKLARI");
  expect(bas, "DEPO_KAYNAKLARI listesi yok").toBeGreaterThan(-1);
  const son = G.indexOf("];", bas);
  const blok = G.slice(bas, son);
  return [...blok.matchAll(
    /\{\s*tablo:\s*"([a-z0-9_]+)",\s*kolon:\s*"([a-z0-9_]+)",\s*kova:\s*([A-Z_]+|"[a-z-]+")\s*\}/g,
  )].map((m) => ({ tablo: m[1], kolon: m[2], kova: m[3] }));
}

/** `types.ts` Row bloklarından tablo → kolon adları. */
function semaKolonlari(): Record<string, string[]> {
  const satirlar = TIPLER.split("\n");
  const harita: Record<string, string[]> = {};
  let tablo: string | null = null;
  let rowIcinde = false;
  for (const l of satirlar) {
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

describe("KVKK silme kolu: depo nesnesi de gidiyor", () => {
  it("DEPOYA YOL YAZAN DÖRT KAYNAĞIN HEPSİ listede", () => {
    const liste = depoKaynaklari();
    const anahtar = liste.map((k) => `${k.tablo}.${k.kolon}`);
    expect(anahtar).toContain("case_documents.file_path");
    expect(anahtar, "imzalı anlaşma taraması kovada öksüz kalıyor")
      .toContain("agreement_documents.file_path");
    expect(anahtar, "bilirkişi raporu kovada öksüz kalıyor")
      .toContain("bilirkisi_raporlari.dosya_yolu");
    expect(anahtar, "kaçan ses kaydı kovada öksüz kalıyor")
      .toContain("oturum_kayitlari.ses_dosya_yolu");
  });

  it("SES AYRI KOVADA — belge kovasına yazılmış olamaz", () => {
    const liste = depoKaynaklari();
    const ses = liste.find((k) => k.tablo === "oturum_kayitlari");
    expect(ses?.kova, "ses kaydı yanlış kovadan silinmeye çalışılıyor").toBe("KAYIT_KOVASI");
    expect(G).toContain('const KAYIT_KOVASI = "oturum-kayitlari";');
    expect(G).toContain('const BELGE_KOVASI = "case-documents";');
  });

  it("BEKÇİ: şemada depoya yol yazan yeni bir tablo listeden kaçamaz", () => {
    /* Bu denetim, kusurun kendisini bir daha kurulamaz yapar: `types.ts`te
       `case_id` taşıyan ve adı yol/dosya yolu olan bir kolon çıkarsa, o tablo
       `DEPO_KAYNAKLARI`da yoksa burada kırmızı yanar. */
    const sema = semaKolonlari();
    const listedeki = new Set(depoKaynaklari().map((k) => `${k.tablo}.${k.kolon}`));
    const kacanlar: string[] = [];
    for (const [tablo, kolonlar] of Object.entries(sema)) {
      if (!kolonlar.includes("case_id")) continue;
      for (const k of kolonlar) {
        if (!/(^file_path$|_dosya_yolu$|^dosya_yolu$)/.test(k)) continue;
        if (!listedeki.has(`${tablo}.${k}`)) kacanlar.push(`${tablo}.${k}`);
      }
    }
    expect(kacanlar, `depoya yol yazıyor ama silme kolunda yok: ${kacanlar.join(", ")}`)
      .toEqual([]);
  });

  it("ÖNCE DEPO, SONRA SATIR — ters sıra veriyi erişilemez biçimde bırakır", () => {
    const depoIdx = G.indexOf(".storage.from(kova).remove(yollar)");
    const satirIdx = G.indexOf("for (const t of SILME_SIRASI) {\n      const { error } = await admin.from(t.tablo).delete()");
    expect(depoIdx, "depo silme kolu yok").toBeGreaterThan(-1);
    expect(satirIdx, "satır silme döngüsü bulunamadı").toBeGreaterThan(-1);
    expect(depoIdx, "satırlar depodan ÖNCE siliniyor").toBeLessThan(satirIdx);
  });

  it("DEPO DÜŞERSE SATIRA DOKUNULMAZ", () => {
    const depoIdx = G.indexOf(".storage.from(kova).remove(yollar)");
    const kalan = G.slice(depoIdx, depoIdx + 700);
    expect(kalan).toContain("if (depoErr)");
    expect(kalan).toContain("hiçbir kayıt silinmedi");
    expect(kalan).toMatch(/return json\(/);
  });

  it("SESSİZ KIRPMA YOK — yol listesi sınıra dayanırsa işlem DURUR", () => {
    expect(G).toContain("const YOL_SINIRI");
    const idx = G.indexOf("ham.length === YOL_SINIRI");
    expect(idx, "sınıra dayanma denetimi yok").toBeGreaterThan(-1);
    const kalan = G.slice(idx, idx + 400);
    expect(kalan).toContain("silindi: false");
    expect(kalan, "sınıra dayanınca yine de siliyor").toContain("hiçbir kayıt silinmedi");
  });

  it("YOLLAR SATIRLAR SİLİNMEDEN ÖNCE OKUNUYOR", () => {
    const okuIdx = G.indexOf(".select(kaynak.kolon).eq(\"case_id\", case_id)");
    const silIdx = G.indexOf("for (const t of SILME_SIRASI) {\n      const { error } = await admin.from(t.tablo).delete()");
    expect(okuIdx).toBeGreaterThan(-1);
    expect(okuIdx, "yollar satırlar gittikten sonra okunuyor").toBeLessThan(silIdx);
  });

  it("bilirkisi_raporlari satır silme sırasında da var", () => {
    const bas = G.indexOf("const SILME_SIRASI");
    const son = G.indexOf("];", bas);
    expect(G.slice(bas, son)).toContain('{ tablo: "bilirkisi_raporlari" }');
  });
});

describe("KVKK silme kolu: insan kapısı bozulmuyor", () => {
  it("KENDİLİĞİNDEN SİLME YOK — cron sırrı kabul edilmiyor", () => {
    /* Yorumda geçebilir ("x-cron-secret KABUL EDİLMEZ"); yasak olan OKUNMASI. */
    const govde = G.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(govde, "bu kola cron kapısı açılmış").not.toMatch(/x-cron-secret/);
    expect(G).toContain('const authHeader = req.headers.get("Authorization");');
  });

  it("İKİNCİ ONAY: 'SİL' yazılmadan hiçbir silme başlamıyor", () => {
    const onayIdx = G.indexOf('onay.toLocaleUpperCase("tr-TR") !== "SİL"');
    expect(onayIdx, "elle onay kapısı yok").toBeGreaterThan(-1);
    const depoIdx = G.indexOf(".storage.from(kova).remove(yollar)");
    const silIdx = G.indexOf("const { error } = await admin.from(t.tablo).delete()");
    expect(onayIdx, "onay kapısı depo silmesinden sonra").toBeLessThan(depoIdx);
    expect(onayIdx, "onay kapısı satır silmesinden sonra").toBeLessThan(silIdx);
  });

  it("PAKET ALINMADAN silme açılmıyor (C3 sırası)", () => {
    const paketIdx = G.indexOf("paket_alindi");
    const depoIdx = G.indexOf(".storage.from(kova).remove(yollar)");
    expect(paketIdx).toBeGreaterThan(-1);
    expect(paketIdx).toBeLessThan(depoIdx);
    expect(G).toContain("Önce kapanış paketini almalısınız.");
  });
});
