import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";
import { readdirSync, existsSync } from "node:fs";

/* SESLİ NOT — HAT H-14 kararı: B (25.08.2026)
 *
 * Kurucu kararı: yalnız ARABULUCUNUN KENDİ sesli notu. "Taraf sesi hiçbir
 * koşulda kaydedilmez" bir SÖZ değil, TEKNİK KISIT olarak kurulur — kod taraf
 * ses akışına erişemesin. Üç şart, hat canlıya çıkmadan sağlanmalı:
 *   1. Ses metne çevrildiği AN silinir; saklanan yalnız metindir.
 *   2. Aydınlatma metnine sesli not işlemesi eklenir, TEK YERDE durur.
 *   3. Arabulucu kaydı açmadan önce tek seferlik onay görür.
 *
 * Bu tezgâh üçünü de ve teknik kısıtı denetler.
 */

const oku = (y: string) => kaynakOku(y);
const BILESEN = "src/components/mediation/SesliNotKaydi.tsx";
const ISLEV = "supabase/functions/sesli-not-dokum/index.ts";
const METIN = "src/lib/kvkk-metinleri.ts";
const PANEL = "src/components/mediation/MeetingNotesPanel.tsx";

describe("sesli not: taraf sesi teknik olarak kaydedilemez", () => {
  it("TEKNİK KISIT: istemci yalnız kendi mikrofonunu açıyor", () => {
    const g = oku(BILESEN);
    expect(g, "kendi mikrofonu açılmıyor").toMatch(/getUserMedia\(\{\s*audio:\s*true,\s*video:\s*false\s*\}\)/);
  });

  it("TEKNİK KISIT: uzak ses akışına dokunan hiçbir API kullanılmıyor", () => {
    /* Taraf sesi ancak şu yollardan gelebilir: WebRTC eş bağlantısı / uzak iz,
       ekran-sekme sesi yakalama, ya da video sağlayıcı SDK'sı. Hiçbiri geçmemeli. */
    const YASAK = [
      "RTCPeerConnection", "getDisplayMedia", "ontrack", "getReceivers",
      "addTrack", "remoteStream", "DailyIframe", "daily-js", "srcObject",
    ];
    /* YORUMA DEĞİL ÇALIŞAN KODA BAK. Bileşenin başlığı bu API'leri
       KULLANILMADIKLARINI anlatmak için adıyla sayıyor; yorum metnine bakan bir
       denetim kendi belgesini kusur sanır. (Aynı tuzak 23.08'de
       `guard-shell.sh`ta yaşandı — kural: karar, komutun/kodun gerçekte
       yaptığına göre verilir.) */
    const kodu = oku(BILESEN)
      .replace(/\/\*[\s\S]*?\*\//g, " ")   // blok yorumlar
      .replace(/(^|[^:])\/\/.*$/gm, "$1"); // satır yorumları (URL'deki // korunur)
    const bulunan = YASAK.filter((y) => kodu.includes(y));
    expect(bulunan, `uzak ses akışına erişen API: ${bulunan.join(", ")}`).toEqual([]);
  });

  it("TEKNİK KISIT: sunucu tarafı da yalnız arabulucuyu kabul ediyor", () => {
    const g = oku(ISLEV);
    expect(g, "arabulucu denetimi yok").toContain("assigned_mediator_id");
    expect(g, "taraf çağrısı reddedilmiyor").toContain("yalnız dosyanın arabulucusuna aittir");
    // Yol kilidi: caginin kendi klasoru disina dokunamamali.
    expect(g, "yol kilidi yok").toContain("beklenenOnek");
  });

  it("ŞART 1: ses, metne çevrildiği an siliniyor", () => {
    const g = oku(ISLEV);
    // Silme, dokum denemesinden SONRA ve satir yazimindan ONCE olmali.
    const dokumIdx = g.indexOf("chat/completions");
    const silIdx = g.indexOf('storage.from(KOVA).remove([ses_yolu])', dokumIdx);
    const yazIdx = g.indexOf('from("oturum_kayitlari").insert');
    expect(dokumIdx, "döküm çağrısı yok").toBeGreaterThan(-1);
    expect(silIdx, "döküm sonrası silme yok").toBeGreaterThan(dokumIdx);
    expect(yazIdx, "kayıt yazımı silmeden ÖNCE").toBeGreaterThan(silIdx);
    // Silmenin sonucu OKUNMALI (storage.remove hata fırlatmaz).
    expect(g, "silme sonucu okunmuyor").toContain("silErr");
    // Silinemezse yol TEMİZLENMEZ ki imha kolu bulabilsin.
    expect(g).toMatch(/ses_dosya_yolu:\s*sesSilindi\s*\?\s*null\s*:\s*ses_yolu/);
    expect(g).toContain("ses_silindi_at");
  });

  it("ŞART 1: döküm başarısız olsa da ses siliniyor", () => {
    const g = oku(ISLEV);
    // Silme, `dokumHatasi` dalindan ONCE gelmeli: hata hâlinde de dosya kalmasin.
    const silIdx = g.indexOf('storage.from(KOVA).remove([ses_yolu])', g.indexOf("chat/completions"));
    const hataDaliIdx = g.indexOf("if (dokumHatasi) {");
    expect(hataDaliIdx, "döküm hatası dalı yok").toBeGreaterThan(-1);
    expect(hataDaliIdx, "hata dalı silmeden ÖNCE — hata hâlinde ses kalır").toBeGreaterThan(silIdx);
  });

  it("ŞART 2: aydınlatma metni tek yerde ve sesli notu anlatıyor", () => {
    const g = oku(METIN);
    expect(g, "KVKK_SESLI_NOT yok").toContain("export const KVKK_SESLI_NOT");
    // Ucu birden anlatilmali: hangi hizmet, ne kadar kalir, ne zaman silinir.
    expect(g, "hangi hizmet yazmıyor").toContain("Google Gemini API");
    expect(g, "silinme anı yazmıyor").toContain("metne çevrildiği anda");
    expect(g, "taraf sesinin alınmadığı yazmıyor").toContain("tarafların sesi hiçbir koşulda kaydedilmez");
    // Metin BASKA yerde tekrarlanmamali.
    const IMZA = "tarafların sesi hiçbir koşulda kaydedilmez";
    for (const y of [BILESEN, PANEL]) {
      expect(oku(y), `${y} içinde gömülü kopya var`).not.toContain(IMZA);
    }
  });

  it("ŞART 3: kayıt açılmadan önce tek seferlik onay gösteriliyor", () => {
    const g = oku(BILESEN);
    expect(g, "onay metni gösterilmiyor").toContain("KVKK_SESLI_NOT.govde");
    // Onay yoksa kayit BASLAMAMALI.
    expect(g, "onay kapısı yok").toMatch(/if\s*\(!onayVarMi\(\)\)\s*\{\s*setOnayAcik\(true\);\s*return;\s*\}/);
    // Onay izi kalici tutulmali ve okunamazsa YENIDEN sorulmali (guvenli yon).
    expect(g).toContain("ONAY_ANAHTARI");
    expect(g).toMatch(/catch\s*\{\s*return false;\s*\}/);
  });

  it("çıkan metni arabulucu onaylamadan kaydedilmiyor", () => {
    // Bilesen metni yalnizca cagirana verir; kendisi `case_notes`a YAZMAZ.
    const g = oku(BILESEN);
    expect(g, "bileşen doğrudan not yazıyor").not.toContain('from("case_notes")');
    expect(g, "metin çağırana verilmiyor").toContain("onMetin(");
    // Panelde metin, mevcut kaydet akisina dusuyor.
    expect(oku(PANEL)).toContain("onMetin={");
  });

  it("işlevde çıplak (sonucu okunmayan) çağrı kalmadı", () => {
    const g = oku(ISLEV);
    const ciplak = g.split(String.fromCharCode(10))
      .filter((l) => /^\s*await\s+(admin|supabase|userClient)\.(from|rpc|storage)/.test(l));
    expect(ciplak, `sonucu okunmayan çağrı: ${ciplak.join(" | ")}`).toEqual([]);
  });

  it("kova adı, imha kolununkiyle aynı (öksüz ses kalmasın)", () => {
    /* Kovayı temizleyen kol `saklama-imha`dır. 27.08'de (HAT H-18) nöbetçinin
       kendi 24 saatlik silme kolu KALDIRILDI — kendi süresini kendi taşıyordu;
       süre artık yalnız `saklama_sureleri`nde. Bu yüzden kilit nöbetçiye değil,
       kovayı gerçekten kullanan iki yüzeye bakar. */
    expect(oku(ISLEV)).toContain('const KOVA = "oturum-kayitlari"');
    expect(oku("supabase/functions/saklama-imha/index.ts"))
      .toContain('const KAYIT_KOVASI = "oturum-kayitlari"');
  });
});
