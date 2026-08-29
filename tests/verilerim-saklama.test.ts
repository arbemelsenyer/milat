import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";

/* "VERİLERİM" — TARAFA VERİLEN SÖZ · KVKK aydınlatma · HAT H-15/1
 *
 * Bu sayfa tarafa kendi verisi hakkında ne tutulduğunu, kimin gördüğünü ve
 * NE KADAR SAKLANDIĞINI söyler. Sayfanın tek işi doğruyu söylemektir; yanlış
 * bir süre, eksik bir kategoriden daha ağırdır — çünkü taraf ona güvenerek
 * karar verir. 29.08.2026'ya kadar bu sayfanın HİÇ tezgâhı yoktu.
 *
 * BULUNAN KUSUR (29.08.2026). Sayfa iki onay kategorisini
 * ("Yapay zekâ kullanım bilgilendirmesi onayım" · "Oturum kaydı onayım/reddim")
 * `dosya_kapanis_sonrasi` süresine bağlıyordu, yani tarafa **"dosya
 * kapanışından sonra 7 gün"** diyordu. Oysa kurucu kararı (HAT H-15 · 2. madde)
 * "onay kayıtları KALICI, silinmez" diyor ve canlı tabloda `onay_kayitlari`
 * satırı `kalici = true`. Yani sayfa tarafa **gerçeğin tersini** söylüyordu.
 *
 * İKİNCİ YÜZÜ: `saklama_gun == null` dalı "işlenir işlenmez silinir; saklanmaz"
 * diyordu. NULL süre İKİ ayrı şey demek — "karar bekliyor" ve "bilerek
 * kalıcı". Ayrım yapılmadığı için kalıcı bir kayda "hiç saklanmaz" denebiliyordu.
 * Cowork `kalici` kolonunu tam bu ayrım için ekledi.
 */
const EKRAN = kaynakOku("src/pages/Verilerim.tsx");
const SQL = kaynakOku("tests/sabit/saklama-suresi-politika.sql");

/** Ekranın parametre tablosundan istediği veri türleri. */
function istenenTurler(): string[] {
  return [...EKRAN.matchAll(/sureler\.get\("([a-z0-9_]+)"\)/g)].map((m) => m[1]);
}

/** Göç betiğinde kurulan veri türleri. */
function kurulanTurler(): string[] {
  return [...SQL.matchAll(/^\s*\('([a-z0-9_]+)',\s*'(?:olusturma|dosya_kapanisi)'/gm)]
    .map((m) => m[1]);
}

describe("Verilerim: süre sözü doğru", () => {
  it("SÜRE TABLODAN OKUNUYOR — sabit metin yok", () => {
    /* H-15/1: `SURE_BELGE` · `SURE_MALI` · `SURE_ANALIZ` · `SURE_TANIMSIZ`
       sabitleri kaldırılacaktı; tek doğruluk kaynağı tablodur. */
    for (const sabit of ["SURE_BELGE", "SURE_MALI", "SURE_ANALIZ", "SURE_TANIMSIZ"]) {
      expect(EKRAN, `${sabit} sabiti geri gelmiş`).not.toContain(sabit);
    }
    expect(EKRAN).toContain('from("saklama_sureleri"');
    /* Her KATEGORİNİN süresi `sureMetni` üzerinden gelmeli. Tip bildirimi
       (`sure: string;`) kategori değildir, ayıklanır — yoksa tezgâh kendi
       yanlış alarmını üretir (CLAUDE.md §18-A). */
    const sureSatirlari = [...EKRAN.matchAll(/^\s*sure: (.+)$/gm)]
      .map((m) => m[1].trim())
      .filter((v) => !/^(string|null)[;|]/.test(v));
    expect(sureSatirlari.length, "hiç kategori bulunamadı").toBeGreaterThan(10);
    for (const satir of sureSatirlari) {
      expect(satir, `süre elle yazılmış: ${satir}`).toContain("sureMetni(");
    }
  });

  it("KALICI KAYIT 'silinir' DİYE ANLATILMIYOR", () => {
    expect(EKRAN, "kalici kolonu okunmuyor").toContain("baslangic, kalici");
    expect(EKRAN, "kalici alanı tipte yok").toMatch(/kalici:\s*boolean \| null/);
    const kaliciIdx = EKRAN.indexOf("if (kayit.kalici === true)");
    const nullIdx = EKRAN.indexOf("if (kayit.saklama_gun == null)");
    expect(kaliciIdx, "kalıcı dalı yok").toBeGreaterThan(-1);
    expect(nullIdx, "NULL dalı yok").toBeGreaterThan(-1);
    /* SIRA KRİTİK: kalıcı denetimi NULL denetiminden ÖNCE olmalı. Kalıcı
       kayıtların süresi de NULL'dur; sıra ters olursa kalıcı kayıt yine
       "işlenir işlenmez silinir" diye anlatılır. */
    expect(kaliciIdx, "kalıcı denetimi NULL dalından SONRA — kusur geri gelir")
      .toBeLessThan(nullIdx);
    const blok = EKRAN.slice(kaliciIdx, nullIdx);
    expect(blok, "kalıcı kayda 'silinir' deniyor").not.toMatch(/silinir[^,]/);
    expect(blok).toContain("Kalıcı olarak saklanır");
  });

  it("ONAY KAYITLARI kendi türüne bağlı — dosya süresine değil", () => {
    /* Kusurun kendisi: iki onay kategorisi `dosya_kapanis_sonrasi`ya bağlıydı
       ve tarafa "kapanıştan sonra silinir" deniyordu. */
    const onayBloklari = [...EKRAN.matchAll(/ad: "([^"]*[Oo]nay[^"]*)",[\s\S]{0,600}?sure: sureMetni\(sureler\.get\("([a-z0-9_]+)"\)/g)];
    expect(onayBloklari.length, "onay kategorisi bulunamadı").toBeGreaterThanOrEqual(2);
    for (const [, ad, tur] of onayBloklari) {
      expect(tur, `"${ad}" yanlış süreye bağlı — onay kaydı kalıcıdır`)
        .toBe("onay_kayitlari");
    }
  });
});

describe("Verilerim: sorduğu her tür gerçekten kurulu", () => {
  it("BEKÇİ: ekranın istediği tür göç betiğinde YOKSA kırmızı yanar", () => {
    /* Ekran tanımsız bir tür sorarsa tarafa "bu kayıt tipi için saklama
       süresi henüz tanımlanmadı" der — yani gizlilik ekranı sessizce eksik
       konuşur. 29.08'de tam bu durum vardı: betik 5 tür kuruyordu, ekran
       `odeme_kayitlari` ve `onay_kayitlari` da istiyordu. */
    const kurulan = new Set(kurulanTurler());
    const eksik = [...new Set(istenenTurler())].filter((t) => !kurulan.has(t));
    expect(eksik, `ekran soruyor ama göç betiği kurmuyor: ${eksik.join(", ")}`)
      .toEqual([]);
  });

  it("kalıcı türler betikte de kalıcı işaretli", () => {
    expect(SQL).toContain("add column if not exists kalici");
    expect(SQL).toMatch(/set kalici = true[\s\S]{0,120}onay_kayitlari/);
    expect(SQL).toMatch(/set kalici = true[\s\S]{0,120}anonim_kapanis_istatistigi/);
  });
});
