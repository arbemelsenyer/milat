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

/** `types.ts` Row bloklarından tablo → kolon adları. */
function semaKolonlari(): Record<string, string[]> {
  const TIPLER = kaynakOku("src/integrations/supabase/types.ts");
  const harita: Record<string, string[]> = {};
  let tablo: string | null = null;
  let rowIcinde = false;
  for (const l of TIPLER.split(/\r?\n/)) {
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

describe("liste şemayla uyuşuyor mu (30.08.2026 dersi)", () => {
  /* O gün `_shared/dosya-silme.ts`teki `SILME_SIRASI` iki satırında var olmayan
     bir kolonu gösteriyordu ve emniyet süpürgesi ilk gerçek koşumunda tam
     orada durdu — yarım silme bırakarak. Kusurun kaynağı tek bir satır değil,
     ŞUYDU: elle yazılmış tablo/kolon listeleri şemaya karşı hiç denetlenmiyordu.
     Bu kolda da iki böyle liste var; ikisi de artık denetleniyor. */

  it("TUR_HARITASI'ndaki her tablo.zaman çifti şemada VAR", () => {
    const sema = semaKolonlari();
    const bas = G.indexOf("const TUR_HARITASI");
    expect(bas, "TUR_HARITASI yok").toBeGreaterThan(-1);
    const son = G.indexOf("\n};", bas);
    const eslemeler = [...G.slice(bas, son).matchAll(
      /([a-z0-9_]+):\s*\{\s*tablo:\s*"([a-z0-9_]+)",\s*zaman:\s*"([a-z0-9_]+)"\s*\}/g,
    )].map((m) => ({ tur: m[1], tablo: m[2], zaman: m[3] }));
    expect(eslemeler.length, "eşleme okunamadı — denetim boşa dönüyor").toBeGreaterThan(3);
    const kacanlar: string[] = [];
    for (const e of eslemeler) {
      const k = sema[e.tablo];
      if (!k) { kacanlar.push(`${e.tablo} (tablo şemada yok)`); continue; }
      if (!k.includes(e.zaman)) kacanlar.push(`${e.tablo}.${e.zaman}`);
    }
    expect(kacanlar, `TUR_HARITASI şemayla uyuşmuyor: ${kacanlar.join(", ")}`).toEqual([]);
  });

  it("ÖZEL KOLLARIN dokunduğu kolonlar şemada VAR", () => {
    /* Ses/döküm kolu satır silmez, KOLON boşaltır ve silme damgası yazar.
       Damga kolonlarından biri şemadan düşerse yazım sessizce hata döner ve
       KVKK silmesinin kanıtı kaybolur — kolun varlık sebebi budur. */
    const sema = semaKolonlari();
    const beklenen: [string, string[]][] = [
      ["oturum_kayitlari", ["ses_dosya_yolu", "ses_silindi_at", "ses_silme_notu",
        "dokum_metni", "dokum_silindi_at", "dokum_silme_notu"]],
      ["case_documents", ["file_path"]],
      ["cases", ["closed_at"]],
      ["saklama_sureleri", ["veri_turu", "saklama_gun", "baslangic", "kalici"]],
    ];
    const kacanlar: string[] = [];
    for (const [tab, kolonlar] of beklenen) {
      const k = sema[tab] ?? [];
      for (const c of kolonlar) {
        // Kod gerçekten bu kolona dokunuyor mu? Dokunmuyorsa denetim yanıltıcı olur.
        if (!G.includes(c)) { kacanlar.push(`${tab}.${c} (kod artık kullanmıyor)`); continue; }
        if (!k.includes(c)) kacanlar.push(`${tab}.${c}`);
      }
    }
    expect(kacanlar, `kolun dokunduğu kolon şemada yok: ${kacanlar.join(", ")}`).toEqual([]);
  });
});

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

  it("EMNİYET SÜPÜRGESİ: arabulucu unutursa dosya kendiliğinden siliniyor", () => {
    /* 29.08.2026'ya kadar burada "dosyanın kendisini SİLMİYOR (o başka kolun
       işi)" yazıyordu ve `dosya_kapanis_sonrasi: null` aranıyordu. O tasarım
       KUSURLUYDU: işaret edilen kol (`dosya-verilerini-sil`) kendiliğinden HİÇ
       çalışmaz — bilerek öyle yazılmıştır (insan kapısı). Yani arabulucu
       düğmeye basmayı unutursa dosya SONSUZA KADAR duruyordu; oysa kurucu
       kararı (HAT H-15/1 adım 3) açıkça "kapanıştan N gün sonra otomatik
       silinir" diyor. Canlıda 6 kapalı dosyanın 5'i süresini geçmiş, 8 taraf
       satırı hâlâ duruyordu. */
    expect(G, "emniyet süpürgesi kolu yok").toContain('if (tur === "dosya_kapanis_sonrasi")');
    expect(G, "silme kuralı ortak modülden gelmiyor").toContain("dosyayiTemizle(admin, id");
    // Bir dosya düşerse ötekilere devam edilir; sessiz geçilmez.
    const bas = G.indexOf('if (tur === "dosya_kapanis_sonrasi")');
    const blok = G.slice(bas, bas + 900);
    expect(blok, "düşen dosya bildirilmiyor").toContain("uyarilar.push");
    expect(blok, "kuru koşum bu kolda yok").toContain("if (kuru)");
  });

  it("EMNİYET SÜPÜRGESİ süre girilmemişse hiç çalışmıyor", () => {
    /* NULL süre = dokunma kuralı bu kol için de geçerli olmalı: kapı,
       türe özel koldan ÖNCEKİ genel `saklama_gun == null` denetimidir. */
    const nullIdx = G.indexOf("if (s.saklama_gun == null)");
    const kolIdx = G.indexOf('if (tur === "dosya_kapanis_sonrasi")');
    expect(nullIdx, "NULL kapısı yok").toBeGreaterThan(-1);
    expect(kolIdx, "emniyet süpürgesi NULL kapısından ÖNCE").toBeGreaterThan(nullIdx);
    // Kapsam kapanmış dosyalarla sınırlı: kapanmamış dosya asla silinmez.
    const kapsamIdx = G.indexOf('.not("closed_at", "is", null)');
    expect(kapsamIdx, "kapsam kapanmış dosyalarla sınırlanmıyor").toBeGreaterThan(-1);
    expect(kolIdx, "silme kapsam kurulmadan yapılıyor").toBeGreaterThan(kapsamIdx);
  });

  it("KALICI tür 'eksik' gibi raporlanmıyor", () => {
    /* NULL süre iki ayrı şey demekti ve kol ikisini de "süre girilmemiş" diye
       raporluyordu: biri KARAR BEKLİYOR, öteki KURUCU KARARIYLA KALICI
       (onay kayıtları · anonim kapanış istatistiği). Aynı cümle birinde
       "eksik iş", ötekinde "doğru çalışıyor" demek; ayırt edilemeyince kalıcı
       kayıt sonsuza kadar yapılacak iş sanılır. 29.08 kuru koşumunda görüldü. */
    expect(G, "kalici kolonu okunmuyor").toContain('baslangic, kalici');
    expect(G, "kalıcı tür ayrı raporlanmıyor").toContain('durum: "kalıcı"');
    // İki dal da NULL kapısının İÇİNDE: kalıcı olan da silinmiyor.
    const bas = G.indexOf("if (s.saklama_gun == null)");
    const blok = G.slice(bas, bas + 400);
    expect(blok).toContain("continue;");
    expect(blok, "kalıcı dalı NULL kapısının dışında").toContain('durum: "kalıcı"');
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
const SUPURGE = kaynakOku("supabase/functions/_shared/depo-supurge.ts");
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

  it("belge kovası silme kollarıyla aynı", () => {
    /* 29.08: kova adları `dosya-verilerini-sil`den `_shared/depo-supurge.ts`e
       taşındı (aynı kural iki silme kolunda geçerli). Eşleşme oradan bakılır;
       iki yerde ayrı yazılırsa biri değişip öteki yanlış kovayı süpürür. */
    const burada = G.match(/const BELGE_KOVASI = "([^"]+)"/)?.[1];
    const orada = SUPURGE.match(/const BELGE_KOVASI = "([^"]+)"/)?.[1];
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
