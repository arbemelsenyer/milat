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
    const onayBloklari = [...EKRAN.matchAll(/ad: "([^"]*[Oo]nay[^"]*)",[\s\S]{0,1600}?sure: sureMetni\(sureler\.get\("([a-z0-9_]+)"\)/g)];
    expect(onayBloklari.length, "onay kategorisi bulunamadı").toBeGreaterThanOrEqual(2);
    for (const [, ad, tur] of onayBloklari) {
      expect(tur, `"${ad}" yanlış süreye bağlı — onay kaydı kalıcıdır`)
        .toBe("onay_kayitlari");
    }
  });
});

describe("Verilerim: okunamayan sayı gerçek gibi gösterilmiyor", () => {
  it("SESSİZ SIFIR YOK — 'okuyamıyorsunuz' diyen kategori sayı GÖSTERMEZ", () => {
    /* 29.08 KUSURU: "Randevu tekliflerim" kategorisi tarafa **0** gösteriyordu.
       `randevu_teklifleri` üzerinde tek politika vardı (`mediator_reads_offers`)
       ve tarafı kapsamıyordu: tarafın sorgusu RLS'te süzülüyor, HATA DÖNMÜYOR,
       sıfır dönüyor. Canlıda 11 satır vardı, hepsi tarafa aitti, sayfa "0"
       diyordu. Taraf bunu "hiç teklif almamışım" diye okur.

       ÇÖZÜLDÜ (H-26): kurucu erişimi açtı, Cowork politikayı canlıda kurdu ve
       sayı artık gerçek. Ama KURAL KALDI ve genelleştirildi — asıl invaryant
       kategori adı değil şudur: **tarafa "bu sayfadan okuyamıyorsunuz" denen
       bir kategoride sayı gösterilmez**, ve sayı gizlenen her kategoride
       NEDEN gizlendiği yazar. Kural randevu satırına bağlı kalsaydı, H-26
       ile birlikte silinir ve kusur başka bir kategoride sessizce geri
       gelebilirdi. */
    /* Kategori blokları: `ad: "..."`den bir sonraki `ad:`e (ya da dosya
       sonuna) kadar. Blok sınırını süslü parantezle aramak kırılgan —
       yorumların içindeki parantezlere takılıyor. */
    const adlar = [...EKRAN.matchAll(/^\s*ad: "([^"]+)",$/gm)];
    expect(adlar.length, "kategori bulunamadı").toBeGreaterThan(10);
    for (let i = 0; i < adlar.length; i++) {
      const ad = adlar[i][1];
      const bas = adlar[i].index ?? 0;
      const son = i + 1 < adlar.length ? (adlar[i + 1].index ?? EKRAN.length) : EKRAN.length;
      const govde = EKRAN.slice(bas, son);
      const okunamiyor = /okuyamıyorsunuz|bu sayfadan okunamaz/.test(govde);
      const sayiGizli = /sayi:\s*null/.test(govde);
      if (okunamiyor) {
        expect(sayiGizli, `"${ad}": okunamadığı söyleniyor ama sayı gösteriliyor`)
          .toBe(true);
      }
      if (sayiGizli) {
        expect(govde, `"${ad}": sayı gizli ama NEDEN gizlendiği yazmıyor`)
          .toMatch(/^\s*not: /m);
      }
    }
  });

  it("H-26 UYGULANDI — randevu sayısı gerçek, kaynağı yazılı", () => {
    const bas = EKRAN.indexOf('ad: "Randevu tekliflerim ve cevaplarım"');
    expect(bas, "randevu kategorisi bulunamadı").toBeGreaterThan(-1);
    const blok = EKRAN.slice(bas, bas + 1800);
    expect(blok, "sayı hâlâ gizli — H-26 uygulanmamış").toMatch(/sayi:\s*randevu/);
    /* Sayının gerçek olması CANLI politikaya bağlı. O politika kaldırılırsa
       sayfa yine sessizce 0 der; bu tezgâh onu göremez. Bu yüzden dayanağın
       kodda YAZILI olması şart: bir sonraki okuyan neye güvendiğini bilsin. */
    expect(blok, "hangi politikaya dayanıldığı yazılmamış")
      .toContain("Taraf kendi randevu tekliflerini görür");
    expect(blok, "karşı tarafın gizliliği anlatılmamış").toContain("Karşı tarafa");
  });

  it("TARAFA 'Belirsiz' DENMİYOR — politika okunabiliyorsa yazılır", () => {
    /* H-15/1: "Belirsiz yazan kategori kalmayacak." Üç kategori
       "bu kaydın erişim politikası bu sayfadan doğrulanamadı" diyordu; oysa
       üçünün de politikası `pg_policies`ten okunabiliyordu. */
    expect(EKRAN, "hâlâ 'Belirsiz' diyen kategori var")
      .not.toContain('gorebilen: "Belirsiz');
    // Her kategorinin bir `gorebilen` cümlesi olmalı.
    // Tip bildirimi (`gorebilen: string;`) kategori değildir — tırnak ara.
    const kategoriSayisi = (EKRAN.match(/^\s*ad: "/gm) ?? []).length;
    const gorebilenSayisi = (EKRAN.match(/^\s*gorebilen: "/gm) ?? []).length;
    expect(gorebilenSayisi, "bazı kategoride 'kimin gördüğü' yazmıyor")
      .toBe(kategoriSayisi);
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
