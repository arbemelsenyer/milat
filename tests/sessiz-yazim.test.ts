import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/* SESSİZ YUTULAN VERİTABANI YAZIMLARI (25.08.2026)

   `supabase-js` hata FIRLATMAZ — `{ error }` okunmazsa yazımın başarısız olduğu
   HİÇ anlaşılmaz. Bu yüzden `try { await supabase...insert(...) } catch {}`
   kalıbı bir koruma değildir: catch hiç çalışmaz, kullanıcıya "kaydedildi"
   denir ve veri kaybolur.

   25.08 taramasında 27 kontrolsüz yazım bulundu; 19'u kapatıldı. Kalan 8
   GEREKÇESİYLE dondurulmuştur: yeni bir kontrolsüz yazım eklenirse bu test
   düşer ve adını gösterir.

   Bu tezgâh üç kusur sınıfını birden yakalar:
     1. sonucu hiç okunmayan yazım,
     2. supabase çağrısını saran ama hiç tetiklenmeyen try/catch,
     3. her zaman "başarılı" dönen sarmalayıcı (`Promise<boolean>`).

   Kanıt için kök değiştirilebilir: SESSIZ_KOK=tests/gecici/sessiz-kanit */

const KOK = (process.env.SESSIZ_KOK ?? "").replace(/\/+$/, "");
const y = (goreli: string) => (KOK ? `${KOK}/${goreli}` : goreli);

/** Kök altındaki tüm kaynak dosyaları (üretilen `integrations` hariç). */
function kaynakDosyalari(kok: string): string[] {
  const dosyalar: string[] = [];
  (function tara(d: string) {
    for (const ad of readdirSync(d)) {
      const p = join(d, ad);
      if (statSync(p).isDirectory()) tara(p);
      else if (/\.tsx?$/.test(ad) && !p.includes("integrations")) dosyalar.push(p);
    }
  })(kok);
  return dosyalar;
}

/** Sonucu hiç kontrol edilmeyen yazımlar — `dosya:satır` kümesi. */
function kontrolsuzYazimlar(kok: string): string[] {
  const dosyalar = kaynakDosyalari(kok);

  const bulgular: string[] = [];
  for (const f of dosyalar) {
    const g = readFileSync(f, "utf-8");
    if (!g.includes("supabase")) continue;
    const satirlar = g.split("\n");
    const YAZIM = /\.\s*(insert|update|delete|upsert)\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = YAZIM.exec(g))) {
      const idx = m.index;
      const satirNo = g.slice(0, idx).split("\n").length;
      const onceki = g.slice(Math.max(0, idx - 400), idx);
      if (!/supabase|Table\(\)|admin\./.test(onceki)) continue;
      const ctx = satirlar.slice(Math.max(0, satirNo - 4), satirNo).join("\n");
      const sonrasi = g.slice(idx, idx + 600);
      const kontrolVar =
        /\{\s*(data\s*:|error|data)\b[^}]*\}\s*=\s*await/.test(ctx) ||
        /const\s+\w+\s*=\s*await/.test(ctx) ||
        /\.then\s*\(/.test(sonrasi) ||
        /return\s+await|return\s+supabase/.test(ctx);
      if (!kontrolVar) {
        // Kök öneki ve Windows ters bölü normalize edilir.
        const TERS = String.fromCharCode(92); // ters bölü — heredoc kaçışlarına takılmasın
        const bol = (t: string) => t.split(TERS).join("/");
        const tam = bol(f);
        const goreli = KOK ? tam.replace(`${bol(KOK)}/`, "") : tam;
        bulgular.push(`${goreli}:${satirNo}`);
      }
    }
  }
  return bulgular.sort();
}

/** Dondurulmuş kalanlar — her biri GEREKÇELİdir. Sayı değil, ad eşleşir.
    25.08 (12. blok): liste BOŞALDI. Kalan dört dosyanın da yazımı kapatıldı —
    `Dashboard` ve `NotificationBell` canlı yüzeydi; `CaseDocuments` ve
    `IntakeForm` ölü yüzeydir (H-8, silme kararı kurucuda) ama dondurma notu
    "diriltilirse yazım kontrolü de gelmelidir" diyordu, tuzak şimdiden
    kaldırıldı. Yeni bir kontrolsüz yazım eklenirse aşağıdaki test düşer. */
const DONDURULMUS: Record<string, string> = {};

describe("sessiz yutulan veritabanı yazımı eklenmiyor", () => {
  const bulunan = kontrolsuzYazimlar(y("src"));
  const dosyalari = Array.from(new Set(bulunan.map((b) => b.split(":")[0]))).sort();

  it("tarayıcı gerçekten çalışıyor (tezgâhın kendisi korunuyor)", () => {
    /* ÖZ DENETİM CANLI BULGUYA BAĞLANAMAZ: kusur kapandıkça bulgu sıfıra iner
       ve "0 bulundu" ile "tarayıcı bozuldu" ayırt edilemez hâle gelirdi (12.
       blokta tam bu oldu — `> 3` eşiği kusur kapanınca düştü). Bunun yerine
       tarayıcı, İÇİNE KASITLI KUSUR KONMUŞ bir örnek üzerinde denenir. */
    const ornek = "tests/gecici/tarayici-ornegi";
    mkdirSync(`${ornek}/src`, { recursive: true });
    writeFileSync(`${ornek}/src/ornek.tsx`, [
      "import { supabase } from '@/integrations/supabase/client';",
      "export async function yaz() {",
      "  await supabase.from('t').insert({ a: 1 });",   // KASITLI: sonucu okunmuyor
      "  const { error } = await supabase.from('t').update({ a: 2 }).eq('id', 1);",
      "  return error;",
      "}",
    ].join(String.fromCharCode(10)));
    const ornekBulgu = kontrolsuzYazimlar(`${ornek}/src`);
    expect(ornekBulgu.length, "tarayıcı kasıtlı kusuru bulamadı — bozulmuş").toBe(1);
    expect(ornekBulgu[0]).toContain("ornek.tsx");
  });

  it("kontrolsüz yazım yalnız gerekçesi yazılmış dosyalarda kalmış", () => {
    const yeni = dosyalari.filter((d) => !(d in DONDURULMUS));
    expect(
      yeni,
      `Gerekçesiz kontrolsüz yazım: ${yeni.join(", ")}\n` +
        "supabase-js hata fırlatmaz — sonucu okuyup kullanıcıya bildirin, " +
        "ya da DONDURULMUS listesine GEREKÇESİYLE ekleyin.",
    ).toEqual([]);
  });

  it("kapatılan yollar geri açılmıyor", () => {
    // 25.08'de kapatılan 12 yol: hiçbiri listeye geri düşmemeli.
    const kapatilan = [
      "src/pages/AdminDashboard.tsx",
      "src/pages/MediationEngine.tsx",
      "src/pages/CaseRoom.tsx",
      "src/pages/AgreementGenerator.tsx",
      "src/components/mediation/MeetingNotesPanel.tsx",
      "src/components/mediation/OfficialDocumentsPanel.tsx",
      // ikinci tur (aynı gün): yönetici yüzeyleri + runtime ajan penceresi
      "src/components/admin/KnowledgeBaseAdmin.tsx",
      "src/components/admin/TariffAdmin.tsx",
      "src/components/admin/TemplateAdmin.tsx",
      "src/components/AjanPenceresi.tsx",
    ];
    for (const d of kapatilan) {
      expect(dosyalari, `${d} yeniden sessiz yazım içeriyor`).not.toContain(d);
    }
  });

  it("resmi belge düzenlemesi 'kaydedildi' derken gerçekten kaydediliyor", () => {
    // `syncEditedRecord` supabase hatasını okumadan HER ZAMAN true dönüyordu.
    const g = readFileSync(y("src/components/mediation/OfficialDocumentsPanel.tsx"), "utf-8");
    const i = g.indexOf("async function syncEditedRecord");
    expect(i, "syncEditedRecord bulunamadı").toBeGreaterThan(-1);
    const govde = g.slice(i, i + 1200);
    expect(govde, "hata okunmadan true dönülüyor").toMatch(/const\s*\{\s*error\s*\}\s*=\s*await\s+supabase/);
    expect(govde).toContain("if (error) return false;");
  });

  it("rol kaldırma başarısızsa 'Rol Kaldırıldı' denmiyor", () => {
    const g = readFileSync(y("src/pages/AdminDashboard.tsx"), "utf-8");
    const i = g.indexOf("const handleRemoveRole");
    expect(i).toBeGreaterThan(-1);
    const govde = g.slice(i, i + 900);
    expect(govde, "silme sonucu okunmuyor — duran yetki kaldırılmış gösterilir").toMatch(
      /const\s*\{\s*error\s*\}\s*=\s*await\s+supabase\.from\('user_roles'\)\.delete/,
    );
    // Hata dalı, başarı bildirimi ve kullanıcıya giden 'removed' bildiriminden ÖNCE dönmeli.
    const hataIdx = govde.indexOf("if (error)");
    const bildirimIdx = govde.indexOf("send-role-notification");
    expect(hataIdx).toBeGreaterThan(-1);
    expect(hataIdx, "hata dalı bildirimin sonrasında — yanlış bildirim yine gider").toBeLessThan(bildirimIdx);
  });

  it("depo çağrıları da sessiz değil (storage da FIRLATMAZ)", () => {
    /* `storage.remove` hata FIRLATMAZ. Silme sessizce düşer ve kayıt satırı
       silinirse dosya depoda ÖKSÜZ kalır: artık hiçbir kayıt onu göstermez,
       hiçbir silme kolu bulamaz (constitution m.10 — süresiz saklama yasağı). */
    const dosyalar = ["src/pages/MediationEngine.tsx", "src/components/CaseDocuments.tsx"];
    for (const d of dosyalar) {
      const g = readFileSync(y(d), "utf-8");
      const ciplak = g.split(String.fromCharCode(10))
        .map((l, i) => ({ l, i }))
        .filter(({ l }) => /^\s*await\s+supabase\.(storage|rpc\()/.test(l))
        .map(({ i }) => `${d}:${i + 1}`);
      expect(ciplak, `sonucu okunmayan çağrı: ${ciplak.join(", ")}`).toEqual([]);
    }
    /* SİLME SIRASI — TEK YÜZEY DEĞİL, HEPSİ TARANIR.
       Bu denetim eskiden yalnız `MediationEngine.tsx`i adıyla kilitliyordu;
       tam bu yüzden `CaseRoom.tsx` → `deleteMyDoc` 25.08 taramasında ATLANDI ve
       26.08'e kadar satırı depodan ÖNCE silmeye devam etti (depo hatası yalnız
       `console.warn`du). Adı sabit bir tezgâh, yeni yüzeyi hiç görmez —
       bu yüzden artık `case_documents` satırını silen HER yer taranır. */
    const belgeSilenler = kaynakDosyalari(y("src"))
      .filter((d) => /from\(['"]case_documents['"]\)\s*\.delete\(/.test(readFileSync(d, "utf-8")));
    expect(belgeSilenler.length, "belge silen yüzey bulunamadı — tarama bozuk").toBeGreaterThan(0);
    const oksuzUretenler: string[] = [];
    for (const d of belgeSilenler) {
      const g = readFileSync(d, "utf-8");
      const kalip = /from\(['"]case_documents['"]\)\s*\.delete\(/g;
      let e: RegExpExecArray | null;
      while ((e = kalip.exec(g)) !== null) {
        // Satir silmesinden ONCE gelen depo temizligi ayni islevde olmali.
        const once = g.slice(Math.max(0, e.index - 1500), e.index);
        const depoVar = /storage\.from\(['"]case-documents['"]\)\s*\.remove\(/.test(once);
        // Depo hatasi sessiz gecilmemeli: hata okunup AKIS DURMALI.
        const durduruyor = /depoErr[\s\S]{0,200}?return;/.test(once);
        if (!depoVar || !durduruyor) {
          oksuzUretenler.push(`${d}:${g.slice(0, e.index).split("\n").length}`);
        }
      }
    }
    expect(
      oksuzUretenler,
      `satır depodan ÖNCE siliniyor ya da depo hatası akışı durdurmuyor — ÖKSÜZ DOSYA üretir: ${oksuzUretenler.join(", ")}`,
    ).toEqual([]);
    // Geri alma yollari da kayda duser.
    const m = readFileSync(y("src/pages/MediationEngine.tsx"), "utf-8");
    expect(m).toContain("öksüz dosya");
  });

  it("functions.invoke sonucu da okunuyor (invoke işlev hatasında REDDETMEZ)", () => {
    /* EN İNCE TUZAK: `invoke` işlev düzeyi hatada (500 vb.) REDDETMEZ —
       `{ data, error }` ile ÇÖZÜLÜR. Yani `try { await invoke() } catch {}`
       ve `.catch(...)` yalnız TAŞIMA hatasını yakalar; sunucunun döndürdüğü
       hata bu yollardan HİÇ görünmez. */
    const ATESLE_UNUT = [
      "src/pages/CaseRoom.tsx",
      "src/pages/ExpertWitness.tsx",
      "src/pages/MediationEngine.tsx",
    ];
    for (const d of ATESLE_UNUT) {
      const g = readFileSync(y(d), "utf-8");
      const i = g.indexOf("extract-document-text");
      expect(i, `${d}: çağrı bulunamadı`).toBeGreaterThan(-1);
      // Cagrinin hemen ardinda `{ error }` okuyan bir `.then` olmali.
      const blok = g.slice(i, i + 400);
      expect(blok, `${d}: invoke sonucu okunmuyor — yalnız .catch var`)
        .toMatch(/\.then\(\(\{\s*error\s*\}\)/);
      expect(blok).toContain("çalıştırılamadı");
    }
    // Bekleyen cagrilarda bos/etkisiz catch kalmamali.
    const a = readFileSync(y("src/pages/AdminDashboard.tsx"), "utf-8");
    expect(a, "atama/rol bildirimlerinin sonucu okunmuyor").toContain("bildirimErr");
    expect(a, "boş catch duruyor").not.toContain("} catch {}");
    const k = readFileSync(y("src/components/admin/KnowledgeBaseAdmin.tsx"), "utf-8");
    expect(k, "iş sürdürme sonucu okunmuyor").toContain("devamErr");
  });
});
