import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";
import {
  kaynaklariSirala, kaynakKunyesi, KAYNAK_SIRASI, KAYNAK_YOK_METNI,
} from "../src/components/basvuru/AdimKalibi";

/* AŞAMA 1 — YENİ BAŞVURU EKRANI · KABUL ÖLÇÜTLERİ TEZGÂHI
 *
 * Kaynak: tasks/PILOT-ASAMA-1-DOSYA-KURULUMU.md §4 (kurucu kararı, 10.09.2026).
 * Kurucu kendi dosyasıyla canlı pilot denedi ve bu ekranı baştan sona kusurlu
 * buldu. Aşağıdaki her `describe` bloğu o dosyadaki bir kabul ölçütünün
 * karşılığıdır; numaralar oradaki tabloyla aynıdır.
 *
 * Bu tezgâh KURALI tutar, görünüşü değil: metin kurucunun verdiği metin mi,
 * sıra kurucunun verdiği sıra mı, kapı gerçekten açık mı. Ekranın rengi
 * değişebilir; bu maddeler değişemez.
 */

const MOTOR = kaynakOku("src/pages/MediationEngine.tsx");
const KALIP = kaynakOku("src/components/basvuru/AdimKalibi.tsx");
const SINIF = kaynakOku("supabase/functions/classify-dispute/index.ts");
const ARASTIR = kaynakOku("supabase/functions/taraf-iletisim-arastir/index.ts");
const DOLDUR = kaynakOku("supabase/functions/basvuru-belgelerinden-doldur/index.ts");

/** Yeni Phase1Setup gövdesi — adım sırası burada okunur. */
function faz1Govdesi(): string {
  const bas = MOTOR.indexOf("function Phase1Setup({ caseRow, reload, isMediator, userId, jump }: {");
  expect(bas, "Phase1Setup bulunamadı — tezgâh güncellenmeli").toBeGreaterThan(-1);
  const son = MOTOR.indexOf("/* ====== C1", bas);
  expect(son).toBeGreaterThan(bas);
  return MOTOR.slice(bas, son);
}

describe("ölçüt 1 — uyuşmazlık konusu TEK alan", () => {
  it("kurucunun açıklama metni AYNEN ekranda", () => {
    expect(MOTOR).toContain("Başvuru konusunu ve kısa açıklamasını yazınız.");
    expect(MOTOR).toContain("Tarafların şahıs mı firma mı olduğunu kısaca");
    expect(MOTOR).toContain("Konunun para ya da parayla ölçülebilen bir konu olup olmadığını kısaca açıklayınız.");
  });

  it("tür tespiti kutusundaki ikinci 'uyuşmazlık metni' alanı Aşama 1'de YOK", () => {
    // Eski ekranda aynı şey üç yerde soruluyordu; ikisi kaldırıldı.
    const g = faz1Govdesi();
    expect(g, "Aşama 1'de hâlâ tür tespiti kartı çiziliyor").not.toContain("<DisputeClassifierCard");
    expect(g, "Aşama 1'de ikinci bir uyuşmazlık metni kutusu var")
      .not.toContain("Uyuşmazlık metni (başlık + kısa açıklama)");
  });

  it("tek kaynak `cases.issue_description`tır", () => {
    const g = faz1Govdesi();
    expect(g).toContain("issue_description: yeni || null");
  });
});

describe("ölçüt 2 — adım sırası 1.1 → 1.9 ve 1.9'un koşulu", () => {
  const SIRA = [
    ['no="1.1"', "faz1-buro-evraklari"],
    ['no="1.2"', "faz1-uyusmazlik-konusu"],
    ['no="1.3"', "faz1-uygunluk"],
    ['no="1.4"', "faz1-basvuru-turu"],
    ['no="1.5"', "faz1-ana-uzmanlik"],
    ['no="1.6"', "faz1-alt-uzmanlik"],
    ['no="1.7"', "faz1-sureler"],
    ['no="1.8"', "faz1-taraflar"],
    ['no="1.9"', "faz1-surec-bilgilendirme"],
  ];

  it("dokuz adımın hepsi tanımlı", () => {
    for (const [no, id] of SIRA) {
      expect(MOTOR, `${no} adımı yok`).toContain(no);
      expect(MOTOR, `${id} çıpası yok`).toContain(id);
    }
  });

  it("sol dizin ekrandaki sırayla aynı", () => {
    const bas = MOTOR.indexOf("const FAZ1_MENU_ENTRIES");
    expect(bas).toBeGreaterThan(-1);
    const govde = MOTOR.slice(bas, MOTOR.indexOf("]);", bas));
    let onceki = -1;
    for (const [, id] of SIRA) {
      const yer = govde.indexOf(`"${id}"`);
      expect(yer, `${id} sol dizinde yok`).toBeGreaterThan(-1);
      expect(yer, `${id} sol dizinde yanlış sırada`).toBeGreaterThan(onceki);
      onceki = yer;
    }
  });

  it("1.9 YALNIZ dava şartı seçiliyken çizilir", () => {
    const g = faz1Govdesi();
    expect(g).toContain('const davaSarti = caseRow.mediation_type === "dava_sarti";');
    expect(g).toContain("{davaSarti && <SurecBilgilendirmeAdimi");
  });

  it("1.9 metni uydurulmamış — kurucudan bekleniyor", () => {
    expect(MOTOR).toContain("[Süreç bilgilendirme metni — kurucudan bekleniyor]");
    // Metin gelmeden gönderim düğmesi açılmaz.
    const bas = MOTOR.indexOf("function SurecBilgilendirmeAdimi");
    const govde = MOTOR.slice(bas, bas + 2500);
    expect(govde).toContain("Bilgilendirmeyi gönder");
    expect(govde).toContain("<Button size=\"sm\" disabled");
  });

  it("1.9 asıl taraflara gider — vekille temsil edilse bile", () => {
    const bas = MOTOR.indexOf("function SurecBilgilendirmeAdimi");
    const govde = MOTOR.slice(bas, bas + 2500);
    expect(govde).toContain("ASIL TARAFLARA");
  });
});

describe("ölçüt 3 — AI önce ANA alanı söyler, alt uzmanlık ana alana bağlıdır", () => {
  it("ana adımının cevabı her zaman 'Ana alan:' ile başlar", () => {
    const bas = MOTOR.indexOf("function UzmanlikAdimlari");
    const govde = MOTOR.slice(bas, MOTOR.indexOf("function TarafIletisimKarti", bas));
    expect(govde).toContain("`Ana alan: ${anaEtiket}");
  });

  it("alt uzmanlık cevabı seçili ana alanı ANAR", () => {
    const bas = MOTOR.indexOf("function UzmanlikAdimlari");
    const govde = MOTOR.slice(bas, MOTOR.indexOf("function TarafIletisimKarti", bas));
    expect(govde).toContain("ana alanına bağlı okunmuştur");
  });

  it("1.6 adımı seçili ana alanı üst bilgide gösterir", () => {
    expect(MOTOR).toContain("alt uzmanlık buna bağlı okunur");
  });

  it("kurucunun firma/tüketici kuralı sınıflandırma isteminde YAZILI", () => {
    expect(SINIF).toContain("ANA ALANI TARAFLARIN NİTELİĞİ BELİRLER");
    expect(SINIF).toContain("ana: ticari, alt: inşaat");
    expect(SINIF).toContain("ana: tüketici, alt: inşaat");
    expect(SINIF).toContain("SIRA ÖNEMLİ: ÖNCE ANA ALAN, SONRA ALT UZMANLIK");
  });

  it("tarafların niteliği yazmıyorsa AI tahmin etmez, güveni düşürür", () => {
    expect(SINIF).toContain("guven_skoru'nu 60'ın ALTINA indir");
  });
});

describe("ölçüt 4 — uygunluk cevabı kaynaklı, kaynaksızsa 'bulamadım', devam engellenmiyor", () => {
  it("kaynak sırası §2-A'daki sıradır: modül → mevzuat → içtihat", () => {
    expect(KAYNAK_SIRASI.modul).toBeLessThan(KAYNAK_SIRASI.mevzuat);
    expect(KAYNAK_SIRASI.mevzuat).toBeLessThan(KAYNAK_SIRASI.ictihat);
  });

  it("kaynaklar bu sıraya göre dizilir (davranış sınavı)", () => {
    const sirali = kaynaklariSirala([
      { tur: "ictihat", ad: "Yargıtay 3. HD" },
      { tur: "mevzuat", ad: "6502 sayılı Kanun", yer: "m. 73" },
      { tur: "modul", ad: "İnşaat Hukuku uzmanlık modülü" },
    ]);
    expect(sirali.map((k) => k.tur)).toEqual(["modul", "mevzuat", "ictihat"]);
  });

  it("kaynak künyesi ad + madde biçiminde çıkar", () => {
    expect(kaynakKunyesi({ tur: "mevzuat", ad: "6502 sayılı Kanun", yer: "m. 73" }))
      .toBe("6502 sayılı Kanun, m. 73");
    expect(kaynakKunyesi({ tur: "modul", ad: "İnşaat Hukuku uzmanlık modülü" }))
      .toBe("İnşaat Hukuku uzmanlık modülü");
  });

  it("hiçbir kaynakta yoksa TEK cümle çıkar: 'Kaynaklarda bulamadım.'", () => {
    expect(KAYNAK_YOK_METNI).toBe("Kaynaklarda bulamadım.");
    expect(MOTOR).toContain("KAYNAK_YOK_METNI");
  });

  it("kaynak varsa tıklanabilir yazılır", () => {
    expect(KALIP).toContain("<a");
    expect(KALIP).toContain('target="_blank"');
    expect(KALIP).toContain('rel="noopener noreferrer"');
  });

  it("kaynaksız hukuki cümle sessizce bırakılmaz", () => {
    expect(KALIP).toContain("Bu cevabın kaynağı gösterilemedi");
  });

  it("'Uygun değil' seçilince kurucunun cümlesi AYNEN eklenir", () => {
    expect(MOTOR).toContain("Konu ile ilgili atamanızın yapıldığı arabuluculuk bürosu ile iletişime geçiniz.");
  });

  it("uygunluk kararı sonraki adımları KİLİTLEMEZ", () => {
    const bas = MOTOR.indexOf("function UygunlukAdimi");
    const govde = MOTOR.slice(bas, MOTOR.indexOf("function UzmanlikAdimlari", bas));
    expect(govde).toContain("Bu seçim süreci durdurmaz");
    // 1.4–1.9 adımları uygunluk seçimine bağlı bir koşulun içine alınmamalı.
    const g = faz1Govdesi();
    expect(g, "adımlar uygunluk kararına bağlanmış").not.toMatch(/arabuluculuga_uygunluk[^\n]*&&\s*<Adim/);
  });
});

describe("ölçüt 5 — başvuru türünde AI düğmesi YOK", () => {
  it("1.4 adımına aiDugme verilmez", () => {
    const g = faz1Govdesi();
    const bas = g.indexOf('no="1.4"');
    expect(bas).toBeGreaterThan(-1);
    const govde = g.slice(bas, g.indexOf("</Adim>", bas));
    expect(govde, "1.4'te AI düğmesi var").not.toContain("aiDugme");
  });

  it("düğmesi olmayan adımda BOŞLUK korunur (hizalama oynamaz)", () => {
    expect(KALIP).toContain("BOŞLUK KORUNUR");
    expect(KALIP).toContain('className="sm:w-40 shrink-0 flex sm:justify-end"');
  });
});

describe("ölçüt 6 — taraf iletişiminde araştırma kaynaklı, 'Tamam' olmadan yazılmıyor", () => {
  it("kaynak modelin beyanı değil, servisin getirdiği sayfalardır", () => {
    expect(ARASTIR).toContain("groundingMetadata");
    expect(ARASTIR).toContain("groundingChunks");
  });

  it("kaynak yoksa sonuç 'bulunamadı' sayılır — değer ekrana çıkmaz", () => {
    expect(ARASTIR).toContain("doğrulanabilir bir kaynak gösterilemedi");
    const bas = ARASTIR.indexOf("if (kaynaklar.length === 0)");
    expect(bas, "kaynaksız değer kapısı yok").toBeGreaterThan(-1);
  });

  it("değer biçim süzgecinden de geçer (uydurma serbest metin elenir)", () => {
    expect(ARASTIR).toContain("degerGecerliMi");
    expect(ARASTIR).toContain("EPOSTA_DESENI");
    expect(ARASTIR).toContain("TELEFON_DESENI");
  });

  it("işlev `case_parties`e HİÇBİR ŞEY yazmaz", () => {
    expect(ARASTIR, "araştırma işlevi tarafa yazıyor")
      .not.toMatch(/from\("case_parties"\)[\s\S]{0,80}\.update\(/);
  });

  it("alana yazan tek yol 'Tamam' düğmesidir", () => {
    const bas = MOTOR.indexOf("function TarafIletisimKarti");
    const govde = MOTOR.slice(bas, MOTOR.indexOf("function SurecBilgilendirmeAdimi", bas));
    expect(govde).toContain("Tamam, alana yaz");
    expect(govde).toContain('async function tamam(');
    // Yazma yalnız `tamam` içinde olmalı.
    const tamamBas = govde.indexOf("async function tamam(");
    const tamamSon = govde.indexOf("async function kanalDegistir(");
    expect(govde.slice(tamamBas, tamamSon)).toContain('from("case_parties").update(');
  });

  it("arama metnine dosya konusu KONMAZ (KVKK · kör veri)", () => {
    expect(ARASTIR).toContain("ARAMA TERİMİ SINIRI");
    const bas = ARASTIR.indexOf("const userPrompt = [");
    const govde = ARASTIR.slice(bas, bas + 400);
    expect(govde, "arama metnine uyuşmazlık konusu giriyor").not.toContain("issue_description");
    expect(govde, "arama metnine dosya numarası giriyor").not.toContain("application_no");
  });

  it("her kanalın yanında seçim kutusu var", () => {
    expect(MOTOR).toContain("GONDERIM_KANALLARI");
    expect(MOTOR).toContain("Bu tarafa gönderimde kullanılacak kanal");
  });

  it("WhatsApp gönderimi yoksa sessizce e-postaya düşürülmez, SÖYLENİR", () => {
    expect(MOTOR).toContain("WhatsApp ile otomatik gönderim üründe henüz yok");
  });
});

describe("ölçüt 7 — AI düğmesi ve cevabı her adımda aynı yerde, aynı biçimde", () => {
  it("dokuz adımın hepsi kalıptan geçer — kimse kendi düzenini kurmaz", () => {
    // Beşi doğrudan Phase1Setup içinde, dördü (1.3 · 1.5 · 1.6 · 1.9) kendi
    // bileşenlerinde çizilir; hepsi aynı `<Adim>` kalıbını kullanır.
    const adimSayisi = (MOTOR.match(/<Adim\b/g) ?? []).length;
    expect(adimSayisi, "Adım kalıbı kullanılmıyor").toBeGreaterThanOrEqual(9);
    for (const no of ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9"]) {
      const desen = new RegExp(`<Adim[\\s\\S]{0,240}no="${no.replace(".", "\\.")}"`);
      expect(MOTOR, `${no} adımı kalıptan geçmiyor`).toMatch(desen);
    }
  });

  it("iki düğme türü de aynı bileşenden çıkar: 'AI önersin' · 'AI araştırsın'", () => {
    expect(KALIP).toContain('const etiket = tur === "onersin" ? "AI önersin" : "AI araştırsın";');
  });

  it("cevap her adımda alanın hemen ALTINDA, küçük italik", () => {
    expect(KALIP).toContain("text-xs italic text-muted-foreground");
  });

  it("yanıp sönen ışık ya da ayrı pencere YOK (§3)", () => {
    expect(KALIP).toContain("yanıp sönen ışık");
    expect(KALIP, "AI cevabı için ayrı pencere açılıyor").not.toContain("<Dialog");
    expect(KALIP, "AI cevabı için balon kullanılıyor").not.toContain("Tooltip");
  });

  it("hata sessiz düşmez ama yeri yine alanın altıdır", () => {
    expect(KALIP).toContain("Hata SESSİZ DÜŞMEZ");
  });
});

describe("ölçüt 8 — belgeden dolan alanlar elle düzenlenebilir kalır", () => {
  it("okuma işlevi HİÇBİR tabloya yazmaz — öneri döner", () => {
    expect(DOLDUR).toContain("YAZMA YOK");
    expect(DOLDUR, "doldurma işlevi dosyaya yazıyor")
      .not.toMatch(/from\("cases"\)[\s\S]{0,80}\.update\(/);
    expect(DOLDUR, "doldurma işlevi taraf yazıyor")
      .not.toMatch(/from\("case_parties"\)[\s\S]{0,80}\.insert\(/);
  });

  it("kaynaksız öneri SUNUCUDA elenir (uydurma yasak)", () => {
    expect(DOLDUR).toContain("alanTemizle");
    expect(DOLDUR).toContain("Kaynaksız alan ELENİR");
    // Kaynak, gerçekten bu dosyadaki bir belgenin adı olmalı.
    expect(DOLDUR).toContain("belgeAdlari.some");
  });

  it("kapalı listeye uymayan değer ekrana çıkmaz", () => {
    expect(DOLDUR).toContain("ANA_TURLER");
    expect(DOLDUR).toContain("ALT_UZMANLIKLAR");
    expect(DOLDUR).toContain("if (izinli && !izinli.includes(deger)) return null;");
  });

  it("her öneri ayrı ayrı uygulanır; uygulandıktan sonra alan açık kalır", () => {
    const g = faz1Govdesi();
    expect(g).toContain("async function oneriUygula(");
    expect(g).toContain("elle düzenlemeye açıktır");
  });

  it("belgeden okunan e-posta ONAYLI sayılmaz — davet kendiliğinden gitmez", () => {
    const g = faz1Govdesi();
    expect(g).toContain("email_confirmed_at: null");
  });

  it("kaynak yalnız bu dosyanın belgeleridir — internete çıkılmaz", () => {
    expect(DOLDUR).toContain("İnternete çıkılmaz");
  });
});

describe("veritabanı alanı henüz yokken ekran SESSİZ DÜŞMEZ", () => {
  it("eksik kolon ayırt edilir ve tek satırla söylenir", () => {
    expect(MOTOR).toContain("function kolonYokMu");
    expect(MOTOR).toContain("KOLON_BEKLIYOR_METNI");
    expect(MOTOR).toContain("veritabanı güncellemesi");
  });
});

/* ── EK (kurucu, 10.09.2026 akşam) — ÖLÇÜT 11 ve 12 ─────────────────────────
   İlk rapordan sonra gelen üç madde: iki yanda da sınırsız taraf, her tarafta
   elle vekil, ve davetin süreç bilgilendirmesinin ALTINA inmesi. */

describe("ölçüt 11 — iki yanda taraf ekleme, her tarafta vekil", () => {
  it("başvurucu tarafında da karşı tarafta da kendi 'Taraf ekle' düğmesi var", () => {
    const bas = MOTOR.indexOf("function Phase2Parties");
    const govde = MOTOR.slice(bas, MOTOR.indexOf("function TarafKutusu", bas));
    expect(govde).toContain('rol: "applicant" as const, etiket: "Başvurucu tarafı"');
    expect(govde).toContain('rol: "respondent" as const, etiket: "Karşı taraf"');
    expect(govde).toContain("Taraf ekle");
  });

  it("sayı sınırı YOK — ekranda da böyle yazıyor", () => {
    expect(MOTOR).toContain("sınır yok");
    // Ekleme düğmesi taraf SAYISINA bakan bir koşulun içine alınmamalı.
    const bas = MOTOR.indexOf("function Phase2Parties");
    const govde = MOTOR.slice(bas, MOTOR.indexOf("function TarafKutusu", bas));
    const dugme = govde.indexOf("Taraf ekle");
    const oncesi = govde.slice(Math.max(0, dugme - 300), dugme);
    expect(oncesi, "taraf sayısına sınır konmuş").not.toMatch(/parties\.length\s*[<>]=?\s*\d/);
  });

  it("her tarafın yanında 'Vekil ekle' var ve zorunlu değil", () => {
    const bas = MOTOR.indexOf("function Phase2Parties");
    const govde = MOTOR.slice(bas, MOTOR.indexOf("function TarafKutusu", bas));
    expect(govde).toContain("Vekil ekle");
    expect(govde).toContain("Vekili düzenle");
    expect(govde).toContain("Vekil girilmedi");
  });

  it("vekâletnameden okunan vekil taraf eklenince alanlara yazılır", () => {
    // Sunucu tarafı vekil alanlarını okuyor…
    expect(DOLDUR).toContain("vekil_ad_soyad");
    expect(DOLDUR).toContain("vekil_baro");
    expect(DOLDUR).toContain("vekil_sicil_no");
    // …ekran da onları taraf kaydına yazıyor.
    const g = faz1Govdesi();
    expect(g).toContain("vekil_ad_soyad: t.vekil_ad_soyad || null");
  });

  it("vekâletname 1.1'de sayılan evraklar arasında", () => {
    expect(MOTOR).toContain("Vekille başvuruda vekâletname / yetki belgesi");
  });
});

describe("ölçüt 12 — 1.9 süreç bilgilendirmesi, sonra 1.10 davet", () => {
  it("1.10 adımı var ve 1.9'dan SONRA çiziliyor", () => {
    const g = faz1Govdesi();
    const dokuz = g.indexOf("<SurecBilgilendirmeAdimi");
    const on = g.indexOf('no="1.10"');
    expect(dokuz, "1.9 çizilmiyor").toBeGreaterThan(-1);
    expect(on, "1.10 çizilmiyor").toBeGreaterThan(-1);
    expect(on, "davet adımı süreç bilgilendirmesinin ÜSTÜNDE").toBeGreaterThan(dokuz);
  });

  it("sol dizinde de aynı sıra", () => {
    const bas = MOTOR.indexOf("const FAZ1_MENU_ENTRIES");
    const govde = MOTOR.slice(bas, MOTOR.indexOf("]);", bas));
    expect(govde.indexOf('"faz1-davet"'))
      .toBeGreaterThan(govde.indexOf('"faz1-surec-bilgilendirme"'));
  });

  it("davet 1.8'den ÇIKARILDI — taraflar adımında davet düğmesi yok", () => {
    const g = faz1Govdesi();
    const sekiz = g.indexOf('no="1.8"');
    const sekizSon = g.indexOf("</Adim>", sekiz);
    expect(g.slice(sekiz, sekizSon)).toContain('bolum="taraflar"');
    // 1.10 davet bölümünü kullanır.
    expect(g).toContain('bolum="davet"');
  });

  it("ihtiyaride 1.9 yok, 1.10 doğrudan gelir", () => {
    const g = faz1Govdesi();
    // 1.9 koşullu, 1.10 koşulsuz çizilir.
    expect(g).toContain("{davaSarti && <SurecBilgilendirmeAdimi");
    const on = g.indexOf('no="1.10"');
    const oncesi = g.slice(Math.max(0, on - 400), on);
    expect(oncesi, "1.10 dava şartı koşuluna bağlanmış").not.toMatch(/\{davaSarti && <Adim/);
  });

  it("bilgilendirme gitmediyse 1.10 KİLİTLENMEZ, italik uyarı çıkar", () => {
    const g = faz1Govdesi();
    expect(g).toContain("Süreç bilgilendirmesi henüz gönderilmedi");
    expect(g).toContain("DÜĞME KİLİTLENMEZ");
    // Uyarı `davetUyarisi` ile geçer; `disabled` ile değil.
    expect(g).toContain("davetUyarisi={davaSarti && !bilgilendirmeGonderildi");
    // 11.09: uyarı artık ortak `EksikSatiri` usulüyle çıkar — kendi rengini
    // kuran üçüncü bir bildirim biçimi kalmadı (ölçüt 16 · §2 tek usul).
    expect(g).toContain("<EksikSatiri>");
  });

  it("'bilgilendirme gitti mi' TEK yerden okunur", () => {
    const g = faz1Govdesi();
    expect(g).toContain("const bilgilendirmeGonderildi = ");
    expect((g.match(/bilgilendirmeGonderildi/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});

/* ── ÖLÇÜT 14 (kurucu, 10.09 gece ikinci bakış) ─────────────────────────────
   "Karşı taraf 1.8/1.9'a girdi ama 1.10 Davet gönder'de YOK."
   KÖK NEDEN: 1.8 ve 1.10 aynı bileşenin İKİ AYRI ÖRNEĞİ ve her biri taraf
   listesini kendi `load()`u ile okuyor. 1.8'den eklenen taraftan 1.10'un
   haberi olmuyordu; ancak sayfa yenilenince görünüyordu. Bu, bu üründe
   tekrar eden "kardeş yol sessiz kaldı" kusur sınıfının aynısıdır. */
describe("ölçüt 14 — 1.10 her iki yandaki HER tarafı gösterir", () => {
  it("1.10 listesi yana göre gruplu; iki yan da her hâlde çizilir", () => {
    const bas = MOTOR.indexOf("function Phase2Parties");
    const govde = MOTOR.slice(bas, MOTOR.indexOf("function TarafKutusu", bas));
    expect(govde).toContain("TARAF_YANLARI");
    expect(govde).toContain('{ rol: "applicant", baslik: "Başvurucu tarafı" }');
    expect(govde).toContain('{ rol: "respondent", baslik: "Karşı taraf" }');
    // Üçüncü taraf yalnız varsa; ilk iki yan süzgeçten DÜŞMEZ.
    expect(govde).toContain('g.rol !== "third_party" || g.liste.length > 0');
  });

  it("boş yan sessiz kalmaz — başlığıyla durur ve sebebini yazar", () => {
    const bas = MOTOR.indexOf("function Phase2Parties");
    const govde = MOTOR.slice(bas, MOTOR.indexOf("function TarafKutusu", bas));
    expect(govde).toContain("Bu yanda henüz taraf yok.");
  });

  it("her tarafın KENDİ davet düğmesi var — kabul etmiş taraf da düğmesiz kalmaz", () => {
    const bas = MOTOR.indexOf("function Phase2Parties");
    const govde = MOTOR.slice(bas, MOTOR.indexOf("function TarafKutusu", bas));
    expect(govde).toContain('bolum === "davet" && p.invite_status === "accepted"');
    expect(govde).toContain("Daveti kabul etti");
    expect(govde).toContain('(p.invite_status !== "accepted" || bolum === "davet")');
  });

  it("1.8'de taraf değişince 1.10 yeniden okur (kardeş yol açık kalmaz)", () => {
    const bas = MOTOR.indexOf("function Phase2Parties");
    const govde = MOTOR.slice(bas, MOTOR.indexOf("function TarafKutusu", bas));
    expect(govde).toContain("tazele");
    expect(govde).toContain("useEffect(() => { if (tazele > 0) load(); }, [tazele, load]);");
    const g = faz1Govdesi();
    expect(g).toContain("const [tarafSurumu, setTarafSurumu] = useState(0);");
    expect(g).toContain("setTarafSurumu((n) => n + 1);");
    expect(g).toContain("tazele={tarafSurumu}");
  });

  it("tazeleme SONSUZ DÖNGÜ kurmuyor: 1.10'a `onChanged` verilmiyor", () => {
    const g = faz1Govdesi();
    const bas = g.indexOf('bolum="davet"');
    expect(bas).toBeGreaterThan(-1);
    const blok = g.slice(bas, g.indexOf("/>", bas));
    expect(blok, "1.10'a onChanged verilmiş — sayaç kendini besler")
      .not.toMatch(/onChanged=\{/);
  });

  it("1.8 tarafında davet düğmesi hâlâ YOK (sıra bozulmadı)", () => {
    const bas = MOTOR.indexOf("function Phase2Parties");
    const govde = MOTOR.slice(bas, MOTOR.indexOf("function TarafKutusu", bas));
    // Davet düğmesi yalnız 1.10'da çizilir; 1.8 ("taraflar") dışarıda kalır.
    expect(govde).toContain('bolum !== "taraflar" && (p.invite_status !== "accepted" || bolum === "davet")');
  });
});

/* ── ÖLÇÜT 15 (kurucu, 11.09 canlı ön izleme) ───────────────────────────────
   "1.10'da bir tarafta 'Davet gönder', ötekinde 'Davet Linki Oluştur' yazıyordu;
   taraf satırları da aynı dizilişte değildi."

   KURAL: aynı iş her yerde AYNI KELİMEYLE yazılır; her tarafın satırı BİREBİR
   aynı dizilişte durur — ad · sıfat · tür · iletişim · vekil · düğme. Taraf
   sayısı değişince düzen değişmez; eksik bilgi satırı KAYDIRMAZ, yerinde
   "e-posta yok" / "Vekil girilmedi" diye durur.

   Bu blok görünüşü değil KURALI tutar: ikinci adın geri gelmesini ve satır
   parçalarının koşullu çizilmeye dönmesini engeller. */
/* YORUMSUZ NÜSHA — tezgâh kendi açıklamasını yakalamasın (CLAUDE.md §18-A).
   "İkinci ad kalmadı" denetimleri EKRANA ÇIKAN metne bakar; eski adı anlatan
   yorum satırı kusur değildir, kaydın kendisidir. İlk yazımda tam bu oldu:
   denetim, kuralı anlatan yorumu ihlal sandı. */
function yorumsuz(kaynak: string): string {
  return kaynak
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");
}
const MOTOR_YORUMSUZ = yorumsuz(MOTOR);

function taraflarGovdesi(): string {
  const bas = MOTOR.indexOf("function Phase2Parties");
  expect(bas).toBeGreaterThan(-1);
  const son = MOTOR.indexOf("function TarafKutusu", bas);
  expect(son).toBeGreaterThan(bas);
  return MOTOR.slice(bas, son);
}

describe("ölçüt 15 — tek tabir, tek düzen", () => {
  it("davet işinin İKİNCİ ADI yok — 'Davet Linki Oluştur' hiçbir yerde geçmiyor", () => {
    expect(MOTOR_YORUMSUZ, "aynı iş ikinci bir adla yazılmış").not.toContain("Davet Linki Oluştur");
    expect(MOTOR_YORUMSUZ, "aynı iş ikinci bir yazımla geçiyor").not.toContain("Davet Linkini Göster");
  });

  it("davet düğmesi TEK — e-postası olan ve olmayan taraf aynı düğmeyi görür", () => {
    const g = taraflarGovdesi();
    // İki ayrı düğme kolu kalmadı: gönderim yolu tek yerde seçilir.
    expect(g).toContain("sendInvite(p.id, p.email ? undefined : { skipEmail: true })");
  });

  it("taraf satırı ızgaradır ve diziliş ad · sıfat · tür · iletişim · vekil · düğme", () => {
    const g = taraflarGovdesi();
    expect(g, "satır akışa bırakılmış; taraf sayısı değişince kayar")
      .toContain('className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_15rem] sm:items-start min-w-0"');
    const ad = g.indexOf("{/* 1 · ad */}");
    const sifat = g.indexOf("{/* 2 · sıfat · 3 · tür */}");
    const iletisim = g.indexOf("{/* 4 · iletişim");
    const vekil = g.indexOf("{/* 5 · vekil");
    const dugme = g.indexOf("6 · DÜĞME SÜTUNU");
    expect(ad, "ad parçası satırda yok").toBeGreaterThan(-1);
    expect(sifat, "sıfat/tür parçası satırda yok").toBeGreaterThan(ad);
    expect(iletisim, "iletişim parçası sırada değil").toBeGreaterThan(sifat);
    expect(vekil, "vekil parçası sırada değil").toBeGreaterThan(iletisim);
    expect(dugme, "düğme sütunu sırada değil").toBeGreaterThan(vekil);
  });

  it("düğme sütunu SABİT genişlikte — satırlar birbirine göre kaymaz", () => {
    const g = taraflarGovdesi();
    expect(g, "sağ sütun `auto`; her satır kendi düğmesine göre genişler ve hiza bozulur")
      .not.toContain("sm:grid-cols-[minmax(0,1fr)_auto]");
  });

  it("eksik bilgi satırı KAYDIRMAZ — yer tutucu yerinde durur", () => {
    const g = taraflarGovdesi();
    expect(g).toContain('<span className="italic">e-posta yok</span>');
    expect(g).toContain('<span className="italic">telefon yok</span>');
    expect(g).toContain('<span className="italic">Vekil girilmedi</span>');
  });

  it("rol etiketi TEK yerde tanımlı — elle yazılmış ikinci nüsha yok", () => {
    expect(MOTOR_YORUMSUZ, "rol adı bir yerde 'Karşı Taraf', başka yerde 'Karşı taraf' yazılmış")
      .not.toContain("Karşı Taraf");
    expect(MOTOR).toContain("const ROL_KODLARI = ");
    expect(MOTOR).toContain("ROL_KODLARI.map((kod) => ({ value: kod, label: roleLabel(kod) }))");
  });

  it("1.8 iletişim kartının künyesi 1.10 ile aynı: ad · sıfat · tür", () => {
    const bas = MOTOR.indexOf("function TarafIletisimKarti");
    const govde = MOTOR.slice(bas, MOTOR.indexOf("function SurecBilgilendirmeAdimi", bas));
    expect(govde).toContain("· {roleLabel(taraf.party_role)}");
    expect(govde).toContain('{taraf.party_type === "corporate" ? "Kurumsal" : "Bireysel"}');
  });

  it("1.4'ün adı adım başlığıyla aynı — 'Arabuluculuk Türü' ikinci adı kalmadı", () => {
    expect(MOTOR_YORUMSUZ).not.toContain("Arabuluculuk Türü:");
    const g = faz1Govdesi();
    expect(g).toContain('baslik="Başvuru türü"');
  });
});

/* ── ÖLÇÜT 16 (kurucu, 11.09) ───────────────────────────────────────────────
   "EKRAN KİLİDİ YOK. Bir adım bitmeden öteki kilitlenmesin; arabulucu sırayı
   kendi seçsin, atlasın, geri dönsün. Numaralar önerilen sıra. Sistem yalnız
   küçük italikle uyarsın, düğme kapatmasın. Verisi olmayan adım hata vermesin,
   neyin eksik olduğunu söylesin."

   Gerekçe kurucunun kendi cümlesi: "hangi aşamada ne aksak göremiyorum,
   uydurma veri girmek zorunda kalıyorum."

   Bu blok en kolay geri gelen kusuru tutar: bir düğmeyi ÖNCEKİ ADIMIN verisine
   bakarak `disabled` yapmak. */
describe("ölçüt 16 — ekran kilidi yok", () => {
  it("eksik bildirimi TEK kopyadır ve kalıpta durur", () => {
    expect(KALIP).toContain("export function EksikSatiri(");
    expect(KALIP).toContain("EKRAN KİLİDİ YOK");
    expect(MOTOR).toContain("EksikSatiri");
  });

  it("1.7 süre tespiti 1.5 yüzünden KAPANMIYOR", () => {
    const bas = MOTOR.indexOf("function DeadlineCard");
    const govde = MOTOR.slice(bas, MOTOR.indexOf("function Phase2Parties", bas));
    expect(govde, "tespit düğmesi önceki adımın verisine bağlanmış")
      .not.toContain("disabled={busy || !caseRow.dispute_type}");
    expect(govde).toContain("onClick={detect} disabled={busy}");
  });

  it("1.7 girdi eksikken KIRMIZI HATA değil, eksik bildirimi çıkar", () => {
    const bas = MOTOR.indexOf("function DeadlineCard");
    const govde = MOTOR.slice(bas, MOTOR.indexOf("function Phase2Parties", bas));
    expect(govde, "eksik, arıza kutusuna yazılıyor")
      .not.toContain('setError("Önce yukarıdaki karttan AI uyuşmazlık türünü tespit edin.")');
    expect(govde).toContain("const [eksik, setEksik] = useState<string | null>(null);");
    expect(govde).toContain("{eksik && <EksikSatiri>{eksik}</EksikSatiri>}");
  });

  it("kural EKRANIN KENDİSİNDE yazar — numaralar önerilen sıradır", () => {
    const g = faz1Govdesi();
    expect(g).toContain("önerilen sıradır, zorunlu");
    expect(g).toContain("Hiçbir adım bir başkası bitmeden kilitlenmez.");
  });

  it("eksik yalnız `title` ipucunda kalmaz — ekranda yazar", () => {
    const g = taraflarGovdesi();
    // E-postası olmayan tarafta davet yine çalışır; sebep ekranda yazar.
    expect(g).toContain('bolum === "davet" && !p.email && (');
    expect(g).toContain("E-posta yok: davet e-postayla gidemez.");
    // Telefonu olmayan tarafta WhatsApp'ın niçin kapalı olduğu ekranda yazar.
    expect(g).toContain("Telefon yok: WhatsApp'tan gönderilemez.");
  });

  it("1.9'un kapalı düğmesi bir KİLİT değil; eksik adıyla yazılı", () => {
    const bas = MOTOR.indexOf("function SurecBilgilendirmeAdimi");
    const govde = MOTOR.slice(bas, MOTOR.indexOf("function Phase1Setup", bas));
    expect(govde).toContain("Eksik: süreç bilgilendirme metni.");
    expect(govde).toContain("BAŞKA BİR ADIM");
    expect(govde).toContain("bütün adımlar açıktır");
  });

  it("1.6 alt uzmanlık 1.5 yüzünden kapanmıyor; eksik bilgi olarak yazılı", () => {
    const bas = MOTOR.indexOf("function UzmanlikAdimlari");
    const govde = MOTOR.slice(bas, MOTOR.indexOf("function TarafIletisimKarti", bas));
    expect(govde, "sıra emri gibi yazılmış").not.toContain("Önce 1.5'te ana alanı seçin");
    expect(govde).toContain("Alt uzmanlığı şimdi de elle seçebilirsiniz.");
  });
});

/* ── İZİN HATASINDA GERÇEK SEBEP YUTULMAZ (HAT H-33 → H-34) ─────────────────
   Canlıda "Belgeler okunamadı: yetkiniz yok" satırı yanlış yere baktırdı:
   yetki vardı. Sunucunun asıl cümlesi "permission denied for table experts"
   idi — sorgulanan tabloya değil, POLİTİKANIN OKUDUĞU başka bir tabloya izin
   yoktu. Dostane cümle o bilgiyi siliyordu. */
describe("izin hatası — sunucunun verdiği tablo adı ekranda kalır", () => {
  it("başka bir tablo adı geçiyorsa sebep cümlesi korunur", () => {
    const bas = MOTOR.indexOf("function trErr(");
    expect(bas).toBeGreaterThan(-1);
    const govde = MOTOR.slice(bas, bas + 3000);
    expect(govde).toContain("permission denied for");
    expect(govde).toContain("sunucunun verdiği sebep");
  });

  it("dostane cümle yine de var — ham hata tek başına bırakılmıyor", () => {
    expect(MOTOR).toContain("Bu işlem için yetkiniz yok. Bu dosyada yalnız başvuru sahibi");
  });
});
