import { describe, it, expect } from "vitest";
import { kaynakOku } from "./kaynak";

/* HAT H-37 (P1) · H-36 (P2) — KAYNAK DOĞRULAMA GÖRÜLEBİLİR OLSUN
 *
 * Kurucu (11.09.2026): *"Kaynaklardan sorgulama yapınca doğrulama istenecek;
 * bunu nasıl göreceğiz, özellikle test aşamasında bir görmeliyiz. Kullanıcı da
 * kaynaktan doğrulamada görebilmeli."* Ayrıca: *"Bir kitap listesi var ama 75
 * mi, saymadım. Bir de neden tıklayınca içleri açılamıyor?"*
 *
 * BAĞLAYICI ÜÇ KURAL, ÜÇÜ DE BURADA TUTULUYOR:
 *   1. İKİ YÜZEY TEK GÖRÜNÜM. H-36 kitabı adıyla açar, H-37(b) kaynağı
 *      cevaptan açar; ikisi de AYNI pencereyi kullanır. "İki ayrı tasarım
 *      yapma" kurucunun açık maddesidir.
 *   2. SINAMA TEZGÂHI AI CEVABI ÜRETMEZ. Arada cevap yazan bir model olmadığı
 *      için "uydurdu mu" sorusu doğmaz — tezgâhın bütün değeri budur.
 *   3. UYDURMA YASAK (§2-A). Kaynak yoksa "bulunamadı" denir; yakın bir parça
 *      gösterilmez, sahte künye yazılmaz.
 */

const AYRINTI = kaynakOku("src/components/bilgi-tabani/KaynakAyrintisi.tsx");
const YONETICI = kaynakOku("src/components/admin/KnowledgeBaseAdmin.tsx");
const KALIP = kaynakOku("src/components/basvuru/AdimKalibi.tsx");
const KAPI = kaynakOku("supabase/functions/kaynak-ara/index.ts");

/* Tezgâh KENDİ açıklamasını yakalamasın (CLAUDE.md §18-A). */
function yorumsuz(k: string): string {
  return k.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " ");
}
const YONETICI_YORUMSUZ = yorumsuz(YONETICI);
const KAPI_YORUMSUZ = yorumsuz(KAPI);

describe("H-36 + H-37 — iki yüzey, TEK ayrıntı görünümü", () => {
  it("ortak pencere tek dosyada tanımlı", () => {
    expect(AYRINTI).toContain("export function KaynakAyrintisi(");
    expect(AYRINTI).toContain("export function ParcaKarti(");
  });

  it("yönetici ekranı (H-36) ortak pencereyi kullanıyor, kendi tasarımını kurmuyor", () => {
    expect(YONETICI).toContain('from "@/components/bilgi-tabani/KaynakAyrintisi"');
    expect(YONETICI).toContain("<KaynakAyrintisi");
    expect(YONETICI).toContain("<ParcaKarti");
  });

  it("kullanıcı tarafı (H-37b) AYNI pencereyi kullanıyor", () => {
    expect(KALIP).toContain('from "@/components/bilgi-tabani/KaynakAyrintisi"');
    expect(KALIP).toContain("<KaynakAyrintisi");
    // İkinci bir ayrıntı tasarımı yok: kalıp kendi parça görünümünü kurmuyor.
    expect(yorumsuz(KALIP), "kalıpta ikinci bir parça görünümü kurulmuş")
      .not.toContain("chunk_text");
  });

  it("pencere iki kiple çalışır: kitabı adıyla · kaynağı cevaptan", () => {
    expect(AYRINTI).toContain('kip = "kitap"');
    expect(AYRINTI).toContain('kip === "kunye"');
  });
});

describe("H-36 — kitabın içi açılır, sayı görünür", () => {
  it("kaynak sayısı başlıkta yazıyor — kurucu saymak zorunda kalmıyor", () => {
    expect(YONETICI).toContain('{sources.length.toLocaleString("tr-TR")} kaynak');
  });

  it("kategori dağılımı sayıyla AYNI toplamadan geliyor", () => {
    // Ayrı bir sorgu açılırsa H-35'in kusuru geri gelir.
    expect(YONETICI).toContain("kategoriDagilimi(sources)");
    expect(YONETICI_YORUMSUZ, "dağılım ayrı sorgudan besleniyor")
      .not.toContain("kategoriDagilimi(await");
  });

  it("kaynak adı düz metin değil, tıklanabilir", () => {
    expect(YONETICI).toContain("setAcikKitap(s.source_title)");
    expect(YONETICI).toContain('title="Kitabın içini aç"');
  });

  it("kitabın künyesi kurucunun saydığı beş alanı taşıyor", () => {
    for (const alan of ["Kategori", "Parça sayısı", "Yüklenme", "Kaynak adresi"]) {
      expect(AYRINTI, `künyede "${alan}" yok`).toContain(`>${alan}</div>`);
    }
    // Beşincisi başlıktır: kitabın adı.
    expect(AYRINTI).toContain("<DialogTitle className=\"text-base break-words\">{sourceTitle}</DialogTitle>");
  });

  it("parçalar sayfalanıyor ve metinde arama var", () => {
    expect(AYRINTI).toContain("const SAYFA_BOYU =");
    expect(AYRINTI).toContain('placeholder="Parça metninde ara…"');
    expect(AYRINTI).toContain("Sonraki");
    expect(AYRINTI).toContain("Önceki");
    expect(AYRINTI).toContain("const sonSayfa =");
  });

  it("künye ARAMADAN bağımsız okunuyor — arama künyeyi bozmuyor", () => {
    // Aksi hâlde "ara" yapınca kitabın parça sayısı 3'e düşmüş gibi görünür.
    expect(KAPI).toContain("Künye (parça sayısı · en eski yükleme) ARAMADAN BAĞIMSIZ");
    expect(KAPI).toContain('.select("id", { count: "exact", head: true })');
  });
});

describe("H-37(a) — sınama tezgâhı: kaynağı gösterir, cevap ÜRETMEZ", () => {
  it("tezgâh yönetici ekranında ve adı kurucunun verdiği ad", () => {
    expect(YONETICI).toContain("Kaynak sınama tezgâhı");
    expect(YONETICI).toContain("Kaynaklarda ara");
  });

  it("tezgâh model çalıştırmıyor — yalnız kaynak kapısını çağırıyor", () => {
    expect(YONETICI).toContain('body: { mod: "ara", soru: metin, adet: 8 }');
    // Kapı da cevap üretmez: sohbet/üretim uç noktası hiç çağrılmaz.
    expect(KAPI_YORUMSUZ, "kaynak kapısı metin üretiyor").not.toContain("/chat/completions");
    expect(KAPI_YORUMSUZ).not.toContain("generateContent");
  });

  it("her sonuç satırı kurucunun saydığı alanları taşıyor", () => {
    // kitap · kategori · kaçıncı parça · metin · benzerlik · adres
    expect(AYRINTI).toContain("{parca.source_title}");
    expect(AYRINTI).toContain("{parca.category}");
    expect(AYRINTI).toContain("`${parca.chunk_index}. parça`");
    expect(AYRINTI).toContain("<Vurgula metin={parca.chunk_text}");
    expect(AYRINTI).toContain("benzerlik %{Math.round(parca.benzerlik * 100)}");
    expect(AYRINTI).toContain("Kaynak adresi");
  });

  it("eşleşen yer VURGULANIYOR ama tahminle boyanmıyor", () => {
    expect(AYRINTI).toContain("export function Vurgula(");
    // Geçmiyorsa hiçbir şey boyanmaz: bölme sonucu tek parçaysa metin aynen döner.
    expect(AYRINTI).toContain("if (parcalar.length === 1) return <>{metin}</>;");
  });

  it("sonuç yoksa kurucunun verdiği cümle çıkar", () => {
    expect(YONETICI).toContain("Bu soruya kaynaklarda karşılık bulunamadı.");
  });

  it("'arama yapılamadı' ile 'sonuç yok' AYRI gösteriliyor", () => {
    // Bu ikisi karışırsa kurucu kaynakların boş olduğunu sanır — H-37'nin
    // çıkış noktası tam olarak o yanılgıydı.
    expect(KAPI).toContain('durum: "arama_yapilamadi"');
    expect(KAPI).toContain('durum: "bulunamadi"');
    expect(YONETICI).toContain('if (d.durum === "arama_yapilamadi")');
    expect(YONETICI).toContain("setSinamaHata(");
  });

  it("gömme anahtarı yoksa SESSİZCE 'bulunamadı' denmiyor", () => {
    expect(KAPI).toContain("LOVABLE_API_KEY tanımlı değil");
    expect(KAPI).toContain("arama yapılamadı");
  });
});

describe("H-37(b) — künye tıklanabilir, uydurma künye yok", () => {
  it("künye artık düz metin değil", () => {
    expect(KALIP).toContain("function KaynakKunyesi(");
    expect(KALIP).toContain('title="Bu cevabın dayandığı kaynak parçasını aç"');
  });

  it("dış açık kaynak künyesi kitaplıkta aranmıyor, adrese gidiyor", () => {
    // `internet` kaynakları (taraf iletişim araştırması) bilgi tabanında yok.
    expect(KALIP).toContain('const kitaplikta = kaynak.tur !== "internet";');
  });

  it("kaynak yoksa künye hiç yazılmıyor — tıklanacak şey de olmuyor", () => {
    expect(KALIP).toContain("KAYNAK_YOK_METNI");
    expect(KALIP).toContain("Bu cevabın kaynağı gösterilemedi");
  });

  it("kapı 'yakın parça' UYDURMUYOR", () => {
    // Kitap adı tutmuyorsa boş döner; "en benzer kitabı" seçmez.
    expect(KAPI).toContain("adıyla kayıtlı bir kaynak bulunamadı.");
    // Madde metinde geçmiyorsa bunu SÖYLER; sessizce başka yeri göstermez.
    expect(KAPI).toContain("ifadesi bu kaynağın metninde bulunamadı");
  });
});

describe("kaynak kapısı — yalnız kitaplık, yalnız oturumlu kullanıcı", () => {
  it("oturum doğrulanmadan hiçbir şey dönmüyor", () => {
    expect(KAPI).toContain('if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);');
    expect(KAPI).toContain("userClient.auth.getUser()");
  });

  it("yalnız bilgi tabanı okunuyor — dosya/taraf verisine dokunulmuyor", () => {
    const tablolar = Array.from(KAPI_YORUMSUZ.matchAll(/\.from\("([a-z_]+)"\)/g)).map((m) => m[1]);
    expect(new Set(tablolar), "kapı bilgi tabanı dışında bir tabloya bakıyor")
      .toEqual(new Set(["knowledge_base_chunks"]));
  });

  it("RLS politikası DEĞİŞTİRİLMEDİ — göç dosyası eklenmedi", () => {
    // Kurucu: "veri, izin ve gömme hazır — SQL gerekmiyor."
    expect(KAPI).toContain("POLİTİKA DEĞİŞTİRİLMEDİ, SQL ÇALIŞTIRILMADI");
  });

  it("kullanıcıdan gelen arama ifadesi desen olarak kaçırılıyor", () => {
    // `%` ve `_` kaçırılmazsa arama kutusu bütün kitabı getirir.
    expect(KAPI).toContain("replace(/[%_\\\\]/g");
  });
});
