import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";

/* PERİYODİK İMHA — mimari §15.2 · constitution m.10 · HAT H-15/1 (25.08.2026)
 *
 * §15.2: "saklama süreleri PARAMETRE TABLOSUNDAN okunuyor ve periyodik imha
 * çalışıyor." Bu kol o şartın KOD yarısıdır; süre DEĞERLERİ kurucu kararıdır
 * (H-15/1) ve tablo değer olmadan kurulur.
 *
 * BU BİR SİLME KOLUDUR — tezgâh, güvenli tasarımın bozulmadığını denetler:
 * süre girilmemişse hiçbir şey silinmez, süre kodda sabit olamaz, tablo adı
 * parametreden gelemez, kapanmamış dosyaya dokunulmaz.
 */

/* Okuma `kaynakOku` üzerinden yapılır: aşağıdaki denetimlerin bir kısmı ÇOK
 * SATIRLI dizgi arar (ör. `from("case_documents")` + yeni satır + `.delete(`)
 * ve dosya çalışma ağacına CRLF ile inerse o arama sessizce başarısız olur.
 * 27.08'de tam bu oldu; gerekçenin tamamı `tests/kaynak.ts` başlığındadır. */
const G = kaynakOku("supabase/functions/saklama-imha/index.ts");
const SQL = kaynakOku("tests/sabit/saklama-suresi-politika.sql");

describe("periyodik imha: güvenli tasarım bozulmuyor", () => {
  it("süre PARAMETRE TABLOSUNDAN okunuyor, kodda sabit değil", () => {
    expect(G).toContain('from("saklama_sureleri")');
    // Kodda gun sayisi sabiti olmamali (ornegin 365 / 30 gibi).
    const govde = G.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(govde, "kodda sabit gün sayısı var").not.toMatch(/saklama_gun\s*[=:]\s*\d+/);
  });

  it("SÜRE GİRİLMEMİŞSE HİÇBİR ŞEY SİLİNMEZ", () => {
    // Tablo deger olmadan kuruluyor; NULL => atla.
    expect(G).toMatch(/if \(s\.saklama_gun == null\)/);
    const nullIdx = G.indexOf("if (s.saklama_gun == null)");
    const silIdx = G.indexOf(".delete(", nullIdx);
    expect(nullIdx, "NULL kapısı yok").toBeGreaterThan(-1);
    expect(silIdx, "silme NULL kapısından ÖNCE").toBeGreaterThan(nullIdx);
    expect(G.slice(nullIdx, silIdx)).toContain("continue;");
    // Gocun kendisi de degersiz kurulmali.
    expect(SQL, "göç değerle kuruluyor").toContain("saklama_gun");
    expect(SQL).toMatch(/insert into public\.saklama_sureleri \(veri_turu, baslangic, aciklama\)/);
  });

  it("tablo adı parametreden GELMİYOR (kötü satır rastgele tablo sildiremez)", () => {
    expect(G).toContain("TUR_HARITASI");
    // Silme hedefi haritadan gelmeli, `s.veri_turu`dan degil.
    expect(G).toMatch(/admin\.from\(hedef\.tablo\)/);
    expect(G, "tanınmayan tür sessiz geçiliyor").toContain("tanınmayan veri türü");
  });

  it("kapanmamış dosyaya dokunulmuyor", () => {
    expect(G).toMatch(/\.not\("closed_at", "is", null\)/);
    expect(G).toMatch(/\.lt\("closed_at", sinir\)/);
  });

  it("dosyanın kendisini silmiyor (o başka kolun işi)", () => {
    // `dosya_kapanis_sonrasi` bilerek eslenmemis olmali.
    expect(G).toMatch(/dosya_kapanis_sonrasi:\s*null/);
    expect(G).toContain("dosya-verilerini-sil");
  });

  it("kuru koşum var (silmeden önce ne silineceği görülebiliyor)", () => {
    expect(G).toContain("kuru");
    expect(G).toMatch(/govde\?\.kuru === true/);
  });

  it("yetkisiz çağrı reddediliyor", () => {
    expect(G).toContain("x-cron-secret");
    expect(G).toContain("Admin gereklidir");
  });

  it("tablo yoksa sessizce 'temiz' demiyor", () => {
    expect(G).toContain("Saklama süreleri okunamadı");
    expect(G).toContain("Parametre tablosu henüz kurulmamış");
  });

  it("silme hataları yutulmuyor", () => {
    expect(G).toContain("silErr");
    expect(G).toMatch(/uyarilar\.push\(`\$\{tur\}: silinemedi/);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   26.08.2026 · İKİ P0 KUSURUN KİLİDİ
   Kol 27.08 03:00'te ilk kez koşacaktı; koşmadan önce canlı parametrelerle
   denetlenince iki geri dönüşsüz kusur çıktı. Aşağıdakiler o iki kusurun geri
   gelmesini engeller — ikisi de "silme kolu, sildiği şeyin izini yanlış
   bırakıyor" sınıfındandır.
   ──────────────────────────────────────────────────────────────────────────── */
const NOBETCI = kaynakOku("supabase/functions/ajan-nobetci/index.ts");
const DOSYA_SIL = kaynakOku("supabase/functions/dosya-verilerini-sil/index.ts");
const SESLI_NOT = kaynakOku("supabase/functions/sesli-not-dokum/index.ts");

/** Yorumlar çıkarılmış gövde: sıra denetimleri yorum metnine takılmasın. */
const GOVDE = G.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("KUSUR 1 · oturum kaydında SATIR silinmez, KOLON boşaltılır", () => {
  it("oturum kolunda SİLME YOK, yalnız GÜNCELLEME var", () => {
    // Ses (0 gün) ile döküm (7 gün) AYNI satırdadır: satırı silmek ötekini de
    // götürür ve KVKK silme damgasını yok eder. Kolun gövdesini kesip bak —
    // "delete" geçmemeli, "update" geçmeli.
    const bas = GOVDE.indexOf('tur === "oturum_kaydi_ses"');
    const bit = GOVDE.indexOf('tur === "case_documents"');
    expect(bas, "oturum kolu yok").toBeGreaterThan(-1);
    expect(bit, "belge kolu yok").toBeGreaterThan(bas);
    const kol = GOVDE.slice(bas, bit);
    expect(kol, "oturum kolunda satır silme var").not.toContain(".delete(");
    expect(kol, "oturum kolu kolonu güncellemiyor").toContain(".update(");
  });

  it("ses ve döküm AYRI kolon olarak boşaltılıyor, damgası yazılıyor", () => {
    expect(GOVDE).toContain("ses_dosya_yolu: null");
    expect(GOVDE).toContain("ses_silindi_at:");
    expect(GOVDE).toContain("dokum_metni: null");
    expect(GOVDE).toContain("dokum_silindi_at:");
    expect(GOVDE, "silme gerekçesi kayda geçmiyor").toMatch(/ses_silme_notu|dokum_silme_notu/);
  });

  it("özel kol GENEL satır silmeden ÖNCE geliyor (yoksa satır yine silinir)", () => {
    const ozel = GOVDE.indexOf('tur === "oturum_kaydi_ses"');
    const genel = GOVDE.search(/admin\.from\(hedef\.tablo\)\s*\.delete\(/);
    expect(ozel, "özel kol yok").toBeGreaterThan(-1);
    expect(genel, "genel silme kolu yok").toBeGreaterThan(-1);
    expect(ozel, "özel kol genel silmeden SONRA geliyor").toBeLessThan(genel);
  });

  it("ses silinirken DEPODAKİ dosya da siliniyor", () => {
    expect(GOVDE).toMatch(/storage\.from\(KAYIT_KOVASI\)\.remove\(/);
  });
});

describe("KUSUR 2 · belge silinirken ÖNCE depo, SONRA satır", () => {
  it("depo temizliği satır silmeden ÖNCE geliyor", () => {
    const depo = GOVDE.indexOf("storage.from(BELGE_KOVASI).remove(");
    const satir = GOVDE.indexOf('admin.from("case_documents")\n          .delete(');
    expect(depo, "belge deposu hiç temizlenmiyor").toBeGreaterThan(-1);
    expect(satir, "belge satırı silme kolu yok").toBeGreaterThan(-1);
    expect(depo, "satır depodan ÖNCE siliniyor — öksüz dosya üretir").toBeLessThan(satir);
  });

  it("depo silinemezse SATIRA DOKUNULMUYOR", () => {
    // Ters sırada indeks yok olur ve dosya erişilemez biçimde KALIR (H-12).
    expect(GOVDE).toContain("satırlara DOKUNULMADI");
    expect(GOVDE).toMatch(/depo temizlenemedi/);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   H-18 (27.08.2026 · kurucu kararı) — SÜREYİ TEK YER BİLİR.
   `ajan-nobetci` dosya kapanır kapanmaz dökümü siliyor, sesi de kapanıştan
   24 saat sonra siliyordu; iki süre de KODDA SABİTTİ. Aynı anda
   `saklama_sureleri` "döküm 7 gün" diyordu — nöbetçi 3 dakikada bir koştuğu
   için gerçekte döküm ~3 dakika yaşıyordu, yani 7 günlük UYAP payı deliniyordu.
   Kol kaldırıldı. Aşağıdaki denetimler geri gelmesini engeller.
   ──────────────────────────────────────────────────────────────────────────── */
describe("H-18 · nöbetçi oturum kaydı SİLMİYOR", () => {
  const NOBETCI_GOVDE = NOBETCI
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("kapanışta döküm silen kol yok", () => {
    expect(NOBETCI_GOVDE, "nöbetçi dökümü yine siliyor").not.toContain("dokum_silindi_at");
    expect(NOBETCI_GOVDE, "nöbetçi döküm metnini yine boşaltıyor").not.toContain("dokum_metni");
  });

  it("ses silen kol yok", () => {
    expect(NOBETCI_GOVDE, "nöbetçi sesi yine siliyor").not.toContain("ses_silindi_at");
    expect(NOBETCI_GOVDE, "nöbetçi kayıt kovasına yine dokunuyor")
      .not.toContain("oturum-kayitlari");
  });

  it("nöbetçide kendi taşıdığı 24 saatlik süre sabiti kalmadı", () => {
    expect(NOBETCI_GOVDE, "24 saatlik silme sayacı hâlâ kodda")
      .not.toMatch(/24\s*\*\s*3600\s*\*\s*1000/);
  });

  it("silme yetkisi bu kolda ve süre parametre tablosundan geliyor", () => {
    // Tersi de doğrulanır: yetkiyi devraldığımız kol gerçekten siliyor.
    expect(GOVDE).toContain("dokum_silindi_at");
    expect(GOVDE).toContain('from("saklama_sureleri")');
  });
});

describe("kova adları öteki kollarla AYNI (sürüklenme kilidi)", () => {
  it("ses kovası sesli-not-dokum ile aynı", () => {
    /* Eskiden kilit `ajan-nobetci`ye bakardı; o kol 27.08'de H-18 ile
       kaldırıldı (kendi süresini kendi taşıyordu). Kovayı YAZAN yüzey
       `sesli-not-dokum`, SİLEN yüzey buradır — kilit ikisi arasındadır. */
    const burada = G.match(/const KAYIT_KOVASI = "([^"]+)"/)?.[1];
    const orada = SESLI_NOT.match(/const KOVA = "([^"]+)"/)?.[1];
    expect(burada).toBeTruthy();
    expect(burada).toBe(orada);
  });

  it("belge kovası dosya-verilerini-sil ile aynı", () => {
    const burada = G.match(/const BELGE_KOVASI = "([^"]+)"/)?.[1];
    const orada = DOSYA_SIL.match(/const BELGE_KOVASI = "([^"]+)"/)?.[1];
    expect(burada).toBeTruthy();
    expect(burada).toBe(orada);
  });
});

describe("sessiz kırpma yok", () => {
  it("tür başına sınıra dayanıldığında uyarı yazılıyor", () => {
    expect(GOVDE).toContain("TUR_BASINA_SINIR");
    expect(GOVDE).toMatch(/sınırına dayandı/);
  });
});
