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

  it("talep kalemi: yazılamayan kalem varken belge 'işlendi' damgalanmıyor", () => {
    // Bu islevin URUNU `taraf_kalemleri` satiridir. Yazim sessizce duserse taraf
    // "kalemlerinizi cikardim" duyar ama listede hicbir sey yoktur; ustelik belge
    // "islendi" damgalanirsa MUKERRER KOSUM KAPISI o belgeyi bir daha hic okumaz
    // ve kalemler KALICI kaybolur.
    const g = oku("taraf-kalem-cikar");
    for (const im of ["bakErr", "gunErr", "yazErr"]) expect(g, `${im} okunmuyor`).toContain(im);
    // Damga kapisi: yazilamayan varken bellekYaz CALISMAMALI.
    expect(g, "yazılamayan kalem varken belge işlendi damgalanıyor")
      .toMatch(/if\s*\(\s*yazilamayan\.length\s*>\s*yazilamayanOnce\s*\)/);
    const damgaIdx = g.indexOf("yazilamayan.length > yazilamayanOnce");
    const bellekIdx = g.indexOf("bellekYaz(admin, case_id, party_id, belgeAnahtari");
    expect(damgaIdx, "damga kapısı yok").toBeGreaterThan(-1);
    expect(bellekIdx, "bellekYaz kapının ARDINDA değil").toBeGreaterThan(damgaIdx);
    // Mukerrer kontrolu okunamazsa kalem ATLANIR (ikinci satir yazilmaz).
    expect(g).toContain("mükerrer kontrolü okunamadı");
    // Eksik carana ve tarafa bildirilir.
    expect(g).toContain("kalemi kaydedemedim");
    expect(g).toMatch(/yazilamayan:\s*yazilamayan\.length/);
    // Bu dosyada CIPLAK `await admin.from(...)` yazimi kalmamali.
    const ciplak = g.split(String.fromCharCode(10)).filter((l) => /^\s*await\s+admin\.from\(/.test(l));
    expect(ciplak, `sonucu okunmayan yazım: ${ciplak.join(" | ")}`).toEqual([]);
  });

  it("dual-ai-validate: havuza yazılamayan metin 'onaylandı' damgalanmıyor", () => {
    // EN AGIRI: `cases_vector_pool` insert sessizce duser ama satir yine de
    // 'approved' damgalanirsa satir bir daha `status="pending"` sorgusuna
    // GIRMEZ — metin havuza hic girmeden KALICI kaybolur, sayac "onaylandi" der.
    const g = oku("dual-ai-validate");
    for (const im of ["havuzErr", "onayErr", "elemeErr", "retErr"]) {
      expect(g, `${im} okunmuyor`).toContain(im);
    }
    // Havuz hatasi dalinda damga ATILMAMALI: dal `continue` ile kapanir.
    const havuzIdx = g.indexOf("if (havuzErr)");
    const damgaIdx = g.indexOf('status: "approved"');
    expect(havuzIdx, "havuz hatası dalı yok").toBeGreaterThan(-1);
    expect(damgaIdx, "onay damgası havuz kontrolünden ÖNCE").toBeGreaterThan(havuzIdx);
    expect(g.slice(havuzIdx, damgaIdx), "havuz yazılamazken damgaya düşülüyor").toContain("continue");
    // Sayac cagirana bildirilir.
    expect(g).toMatch(/approved,\s*rejected,\s*yazilamayan/);
    // Bu dosyada CIPLAK `await sb.from(...)` yazimi kalmamali.
    const ciplak = g.split(String.fromCharCode(10)).filter((l) => /^\s*await\s+sb\.from\(/.test(l));
    expect(ciplak, `sonucu okunmayan yazım: ${ciplak.join(" | ")}`).toEqual([]);
  });

  it("orchestrator-run: atlandı işareti ve zincir-durdu bildirimi sessiz değil", () => {
    // `flagSkippedStep` yazilamazsa panelde kart BOS kalir: arabulucu adimin
    // neden atlandigini hicbir yerden ogrenemez. `allSettled` yalniz [0]
    // okunuyordu; adim satirinin ve bildirimin dusmesi iz birakmiyordu.
    const g = oku("orchestrator-run");
    for (const im of ["isaretErr", "adimErr"]) expect(g, `${im} okunmuyor`).toContain(im);
    expect(g, "settled[1] okunmuyor").toContain("settled[1].status === \"rejected\"");
    // rpc {error} FIRLATMAZ — bildirim sonucu ayrica denetlenmeli.
    expect(g, "bildirim sonucu okunmuyor").toContain("bildirim?.error");
    expect(g).toContain("zincir durdu");
    // Zaten denetli olan ana durum yazimlari bozulmamali.
    expect(g.match(/if\s*\(error\)\s*throw\s+error;/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("akis-yurut: talimat durumu ve koşum izi sessiz kalmıyor", () => {
    // Talimat kuyrugu `durum="bekliyor"` ile taranir. Durum yazimi sessizce
    // duserse talimat kuyrukta KALIR ve HER TURDA yeniden kosar:
    //  - "uygulandi" duserse is her turda tekrarlanir, arabulucuya ayni onay
    //    istegi tekrar tekrar gider.
    //  - "deneme:1" duserse IKI DENEME SINIRI hic devreye girmez.
    const g = oku("akis-yurut");
    expect(g, "durumYaz yardımcısı yok").toContain("const durumYaz =");
    expect(g, "talimat durum yazımının sonucu okunmuyor").toContain("durumErr");
    // Durum yazilamadiysa panoya da yazilmamali (mukerrer mesaj).
    expect(g).toContain("talimat kuyrukta kaldı");
    expect(g).toMatch(/if\s*\(!await\s+durumYaz\(/);
    // Defter/iz yazimlari da denetli.
    for (const im of ["hataErr", "izErr", "kosumErr"]) expect(g, `${im} okunmuyor`).toContain(im);
    expect(g).toContain("deneme sınırı sayılamadı");
    expect(g).toContain("yeniden koşabilir");
    // Bu dosyada CIPLAK `await admin.from(...)` yazimi kalmamali.
    const ciplak = g.split(String.fromCharCode(10)).filter((l) => /^\s*await\s+admin\.from\(/.test(l));
    expect(ciplak, `sonucu okunmayan yazım: ${ciplak.join(" | ")}`).toEqual([]);
    // Zaten denetli olan asama yazimi bozulmamali.
    expect(g).toMatch(/const\s*\{\s*error:\s*uErr\s*\}\s*=\s*await\s+admin\.from\("cases"\)/);
  });

  it("ajan-nobetci: görev kapanışı sessiz düşerse iş tekrar tekrar yürütülmüyor", () => {
    // BU DOSYADAKI EN AGIR KUSUR: gorev kuyrugu `durum="bekliyor"` ile taranir.
    // Ana yurutucunun kapanis yazimi sessizce duserse gorev 'bekliyor' KALIR ve
    // HER NOBET TURUNDA yeniden yurutulur: tarafa ayni e-posta tekrar tekrar
    // gider, randevu yeniden teklif edilir, asama yeniden ilerletilir.
    const g = oku("ajan-nobetci");
    // Ana yurutucu + atlama damgasi.
    for (const im of ["kapatErr", "sebepErr", "atlaErr"]) expect(g, `${im} okunmuyor`).toContain(im);
    expect(g).toContain("tekrar yürütülebilir");
    // Tekrar-gonderim ureten damgalar: hatirlatma sayaci, uyandirma, ek oturum.
    for (const im of ["sayacErr", "uyanErr", "isaretErr"]) expect(g, `${im} okunmuyor`).toContain(im);
    expect(g, "hatırlatma tekrarı uyarısı yok").toContain("hatırlatma tekrarlanabilir");
    // Mukerrer SATIR ureten kapanislar: bilirkisi sayimi ve braket cevabi.
    for (const im of ["sayimKapatErr", "islendiErr", "damgaErr"]) expect(g, `${im} okunmuyor`).toContain(im);
    expect(g).toContain("mükerrer sayım riski");
    expect(g).toContain("mükerrer işleme riski");
    // Alternatif saatler yazilamazsa islev "yapildi" DEMEZ (21.08 kusurunun sessiz hâli).
    expect(g, "altErr okunmuyor").toContain("altErr");
    expect(g).toMatch(/durum:\s*"bekliyor",\s*\n\s*sonuc:\s*`Alternatif saatler panoya yazılamadı/);
    // Oneri ve sayac yazimlari.
    for (const im of ["oneriErr", "tercihErr", "durumErr"]) expect(g, `${im} okunmuyor`).toContain(im);
    // Bu dosyada CIPLAK `await admin.from(...)` yazimi kalmamali.
    const ciplak = g.split(String.fromCharCode(10)).filter((l) => /^\s*await\s+admin\.from\(/.test(l));
    expect(ciplak, `sonucu okunmayan yazım: ${ciplak.join(" | ")}`).toEqual([]);
    // Zaten denetli olan yazimlar bozulmamali.
    expect(g).toContain("video_link yazılamadı");
    expect(g).toContain("bant sorusu yazılamadı");
  });
});
