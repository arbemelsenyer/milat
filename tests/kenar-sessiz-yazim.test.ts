import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* KENAR İŞLEVLERİNDE SESSİZ YAZIM — ürün yazımları (25.08.2026)

   Kenar işlevleri **gözetimsiz** çalışır (cron, ajan): sessiz başarısızlığı
   görecek kullanıcı yoktur. `supabase-js` hata fırlatmadığı için
   `try { await admin…insert() } catch { console.error }` kalıbı burada da
   koruma DEĞİLDİR — catch hiç çalışmaz, kayda da bir şey düşmez.

   NEDEN TARAYICI TEZGÂHI YOK: bu kusur için düzenli-ifadeye dayalı bir tarayıcı
   denendi ve güvenilir olmadı (deyim sınırı bulma, ternary dalları ve çok satırlı
   zincirler yüzünden ya %50 yanlış alarm ya da yanlış negatif veriyordu).
   Güvenilmez bir bekçi, bekçisizlikten kötüdür (24.08 dersi). Bunun yerine
   düzeltilen işlevlerin SÖZÜ tek tek denetlenir; kalan yığın `tasks/todo.md`
   kuyruğunda sayısıyla durur.

   Kanıt için kök değiştirilebilir: KENAR_KOK=tests/gecici/kenar-kanit */

const KOK = (process.env.KENAR_KOK ?? "").replace(/\/+$/, "");
const y = (goreli: string) => (KOK ? `${KOK}/${goreli}` : goreli);
const oku = (ad: string) => readFileSync(y(`supabase/functions/${ad}/index.ts`), "utf-8");

describe("kenar işlevlerinde ürün yazımı sessiz kalmıyor", () => {
  it("katılım: taraf bağlanamazsa 'katıldınız' denmiyor", () => {
    // `case_parties.user_id` baglanmasi katilimin KENDISIDIR. Sessizce
    // basarisiz olursa taraf erisim alamaz; ustelik davet "accepted" olursa
    // yeniden davet 409 doner ve taraf KALICI olarak disarida kalir.
    const g = oku("accept-party-invite");
    expect(g).toMatch(/const\s*\{\s*error:\s*bagErr\s*\}\s*=\s*await\s+admin\.from\("case_parties"\)/);
    const hataIdx = g.indexOf("if (bagErr)");
    const davetIdx = g.indexOf('from("case_party_invites").update');
    expect(hataIdx, "bağlanma hatası dalı yok").toBeGreaterThan(-1);
    expect(davetIdx, "davet 'accepted' işaretlemesi bağlanma kontrolünden ÖNCE").toBeGreaterThan(hataIdx);
    expect(g).toContain("davetiniz hâlâ geçerli");
  });

  it("taraf analizi: yazılamazsa işlev başarılı dönmüyor", () => {
    // Bu satir islevin URUNUDUR: bir LLM kosumu ve tarafin gizli verisi.
    const g = oku("party-confidential-analysis");
    expect(g).toMatch(/const\s*\{\s*error:\s*analizErr\s*\}\s*=\s*existing/);
    expect(g, "analiz yazılamazken sessizce devam ediliyor").toContain("Taraf analizi kaydedilemedi");
    // Yan yazimlar da kayda duser (bunlar isleve son vermez).
    for (const im of ["kokErr", "defterErr", "soruErr"]) {
      expect(g, `${im} okunmuyor`).toContain(im);
    }
  });

  it("belge metni: yazılamazsa 'tamam' denmiyor", () => {
    const g = oku("extract-document-text");
    expect(g).toMatch(/const\s*\{\s*error:\s*yazErr\s*\}\s*=\s*await\s+admin\.from\("case_documents"\)\.update/);
    const hataIdx = g.indexOf("if (yazErr)");
    expect(hataIdx).toBeGreaterThan(-1);
    // Hata dalindan sonra "tamam" degil "hata" bildirilmeli.
    const blok = g.slice(hataIdx, hataIdx + 400);
    expect(blok, "metin yazılamadığı hâlde 'tamam' bildiriliyor").toContain('status: "hata"');
    // Diger uc durum yazimi da okunuyor.
    for (const im of ["dfErr", "bosErr", "hataErr"]) {
      expect(g, `${im} okunmuyor`).toContain(im);
    }
  });

  it("silme: silme sonrası eksikler gizlenmiyor", () => {
    // Silmenin KENDISI zaten dogru denetleniyordu; eksik olan, baglantiyi koparan
    // ve silmeyi KAYDA GECIREN yazimlardi. KVKK silmesinin kaniti kaybolamaz.
    const g = oku("dosya-verilerini-sil");
    for (const im of ["deneyimErr", "duzeltmeErr", "kapanisErr"]) {
      expect(g, `${im} okunmuyor`).toContain(im);
    }
    expect(g, "eksikler çağırana bildirilmiyor").toMatch(/silindi:\s*true,\s*kayit:\s*oncekiToplam,\s*uyarilar/);
    // Silme dongusu ve `cases` silmesi eskiden beri denetli — bozulmamali.
    expect(g).toContain("Silme tamamlanamadı; hiçbir kayıt yarım bırakılmadı");
    expect(g).toMatch(/const\s*\{\s*error:\s*dErr\s*\}\s*=\s*await\s+admin\.from\("cases"\)\.delete/);
  });

  it("toplantı iptali: oturum iptal edilemezse 'iptal edildi' denmiyor", () => {
    // Yazilamazsa taraflara "toplanti iptal edildi" e-postasi GITMIS olur ama
    // oturum sistemde HALA planli gorunur (hatirlatma isleri calismaya devam eder).
    const g = oku("cancel-meeting-invite");
    expect(g).toMatch(/const\s*\{\s*error:\s*iptalErr\s*\}\s*=\s*await\s+admin[\s\S]{0,60}case_sessions/);
    const hataIdx = g.indexOf("if (iptalErr)");
    expect(hataIdx, "iptal hatası dalı yok").toBeGreaterThan(-1);
    const blok = g.slice(hataIdx, hataIdx + 600);
    expect(blok, "hata dalında yine 'cancelled: true' dönülüyor").toContain("cancelled: false");
    expect(blok).toContain("oturum hâlâ planlı");
    for (const im of ["izErr", "izErr2"]) expect(g, `${im} okunmuyor`).toContain(im);
  });

  it("randevu teklifi: görev kapatma ve otomatik onay işareti sessiz değil", () => {
    const g = oku("randevu-teklif");
    expect(g, "alternatif görev kapatma sonucu okunmuyor").toContain("gorevErr");
    expect(g, "otomatik onay işareti sonucu okunmuyor").toContain("isaretErr");
  });

  it("bilirkişi kararı: karar sonrası dört yazım da sessiz değil", () => {
    // En agiri `expert_assignment_logs`: `ajan-nobetci` rapor gecikmesini TAM BU
    // KAYITTAN okur; yazilamazsa 14/21 gunluk rapor nobeti o bilirkisi icin
    // kalici olarak devre disi kalir.
    const g = oku("bilirkisi-ekranim");
    for (const im of ["atamaErr", "izErr", "olayErr", "gorevErr"]) {
      expect(g, `${im} okunmuyor`).toContain(im);
    }
    expect(g, "eksikler çağırana bildirilmiyor").toMatch(/ok:\s*true,\s*durum:\s*yeniDurum,\s*uyarilar/);
    // Kararin kendisini yazan ilk yazim eskiden beri denetli — bozulmamali.
    expect(g).toMatch(/const\s*\{\s*error\s*\}\s*=\s*await\s+admin\.from\("bilirkisi_onerileri"\)/);
    expect(g).toContain("Kaydedilemedi:");
  });

  it("bilirkişi seçimi: sunum damgası, görev kapanışı ve atama izi sessiz değil", () => {
    const g = oku("bilirkisi-secim");
    // Sunum damgasi yazilamazsa adaylar sohbette SUNULMUS olur ama kayitta hala
    // taslak durur; sonraki adim adaylari bulamaz.
    for (const im of ["sunumErr", "sunumErr2"]) expect(g, `${im} okunmuyor`).toContain(im);
    // Gorev kapanmazsa yorumun kendi sozu tutulmaz: mukerrer hatirlatma gider.
    expect(g, "görev kapanışı sonucu okunmuyor").toContain("kapatErr");
    // Atama sonrasi damga + iz.
    for (const im of ["damgaErr", "atamaIzErr"]) expect(g, `${im} okunmuyor`).toContain(im);
    expect(g).toContain("aynı aday ikinci kez atanabilir");
    // Bu dosyada CIPLAK `await admin.from(...)` yazimi kalmamali.
    const ciplak = g.split(String.fromCharCode(10)).filter((l) => /^\s*await\s+admin\.from\(/.test(l));
    expect(ciplak, `sonucu okunmayan yazım: ${ciplak.join(" | ")}`).toEqual([]);
    // Zaten denetli olan ana yazimlar bozulmamali.
    expect(g).toContain("Atama yazılamadı:");
    expect(g).toContain("Beyan yazılamadı:");
    expect(g).toContain("Yanıt yazılamadı:");
  });
});
