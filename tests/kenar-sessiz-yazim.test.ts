import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";

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
    // `belge: yollar.length` 25.08'de eklendi (depo temizliği); amaç aynı:
    // eksikler `uyarilar` ile çağırana taşınıyor mu.
    expect(g, "eksikler çağırana bildirilmiyor").toMatch(/silindi:\s*true,\s*kayit:\s*oncekiToplam,[\s\S]{0,40}uyarilar/);
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

  it("süre uyarısı: 'uyarıldı' işareti düşerse uyarı tekrar tekrar gönderilmiyor", () => {
    // Sorgu `deadline_warning_sent=false` ile tariyor: isaret sessizce duserse
    // dosya her cron turunda yeniden "uyarilmamis" sayilir ve tarafa da
    // arabulucuya da AYNI sure uyarisi tekrar tekrar gider.
    const g = oku("deadline-reminder-cron");
    expect(g, "isaretErr okunmuyor").toContain("isaretErr");
    // Isaret yazilamazsa `sent` sayaci ARTMAMALI (dal `continue` ile kapanir).
    const hataIdx = g.indexOf("if (isaretErr)");
    const sayacIdx = g.indexOf("sent++");
    expect(hataIdx, "işaret hatası dalı yok").toBeGreaterThan(-1);
    expect(sayacIdx, "sayaç işaret kontrolünden ÖNCE artıyor").toBeGreaterThan(hataIdx);
    expect(g.slice(hataIdx, sayacIdx)).toContain("continue");
  });

  it("bilgi tabanı: idempotanlık silmesi sessizce düşüp mükerrer kayıt üretmiyor", () => {
    // Silme duser ve insert yine calisirsa ayni kaynak bilgi tabanina IKI KEZ
    // girer ve arama sonuclarini kalici olarak carpitir.
    for (const ad of ["approve-pending-mevzuat", "build-legal-knowledge", "google-drive-import"]) {
      const g = oku(ad);
      expect(g, `${ad}: temizErr okunmuyor`).toContain("temizErr");
      expect(g, `${ad}: mükerrer riski bildirilmiyor`).toContain("mükerrer kayıt riski");
    }
    // Is kuyrugu temizligi de ayni sinifta.
    expect(oku("build-knowledge-base"), "iş temizliği denetlenmiyor").toContain("mükerrer koşum riski");
    // Onay kuyrugu satiri silinemezse tekrar onaylanabilir — bildirilir.
    expect(oku("approve-pending-mevzuat")).toContain("tekrar onaylanabilir");
  });

  it("bilirkişi denetim izleri ve rapor teslimi sessiz değil", () => {
    // `expert_assignment_logs` bilirkisi surecinin denetim defteri; belge acma
    // kaydi ayrica bir KVKK kaydidir. Rapor teslim olayi yazilamazsa ajan
    // raporun geldigini HIC duymaz ve akis durur.
    for (const ad of ["bilirkisi-belge-baglantisi", "bilirkisi-davet"]) {
      const g = oku(ad);
      expect(g, `${ad}: izErr okunmuyor`).toContain("izErr");
      expect(g, `${ad}: eksik çağırana bildirilmiyor`).toContain("denetim izi yazılamadı");
    }
    const e = oku("bilirkisi-ekranim");
    for (const im of ["olayErr2", "gorevErr2", "sunumErr", "tarafErr"]) {
      expect(e, `${im} okunmuyor`).toContain(im);
    }
    expect(e).toContain("rapor teslim edildi ama akış ilerlemez");
  });

  it("tür/süre tespiti ve onay damgası sessiz kalmıyor", () => {
    // `cases` uzerindeki tur ve sure alanlari bu islevlerin URUNUDUR: sessizce
    // duserse islev sonucu doner ama dosyada alan bos kalir ve ona bagli
    // adimlar (sure nobeti dahil) hic calismaz.
    const c = oku("classify-dispute");
    expect(c, "turErr okunmuyor").toContain("turErr");
    expect(c).toContain("Uyuşmazlık türü kaydedilemedi");
    const d = oku("detect-legal-deadlines");
    expect(d, "sureErr okunmuyor").toContain("sureErr");
    expect(d).toContain("Yasal süre kaydedilemedi");
    // Onay damgasi: talimat 'uygulandi'da takili kalmamali.
    const o = oku("akis-onayla");
    expect(o, "onayErr okunmuyor").toContain("onayErr");
    expect(o).toMatch(/uyandirilan,\s*talimat_id:\s*talimat_id\s*\|\|\s*null,\s*\n\s*\.\.\.\(uyarilar\.length/);
    // Yan izler.
    expect(oku("randevu-teklif"), "linkErr okunmuyor").toContain("linkErr");
    expect(oku("taraf-asistan"), "iş defteri izi denetlenmiyor").toContain("iş defteri izi yazılamadı");
  });

  it("ajan durum defteri (agent_states): her yazımın sonucu okunuyor", () => {
    // Bu satirlar Ajan Kontrol Paneli'ni besler. Dosyalardaki yorum "hata yutulur
    // ve YALNIZ KONSOLA LOGLANIR" diyordu — ama supabase-js firlatmadigi icin
    // catch hic calismiyor ve konsola da hicbir sey dusmuyordu: yazilan sozun
    // kendisi tutulmuyordu. Defter yazimi asil isi hala BOZMAZ, sadece susmaz.
    const DOSYALAR = [
      "belge-ozeti", "olay-cizelgesi", "guc-dengesi", "elverislilik", "dosya-ozeti-oner",
      "common-ground-report", "iletisim-degisim", "mediation-ai", "party-confidential-analysis",
      "classify-dispute", "detect-legal-deadlines", "orchestrator-run",
      "multi-agent-negotiation", "masa-kalem-karsilastir",
    ];
    for (const ad of DOSYALAR) {
      const g = oku(ad);
      expect(g, `${ad}: durum yazımının sonucu okunmuyor`).toContain("durumErr");
      expect(g, `${ad}: hata kayda düşmüyor`).toContain("ajan durum satırı yazılamadı");
    }
  });

  it("KENAR TARAMASI: hiçbir edge function'da çıplak yazım kalmadı", () => {
    // Tek kapi: `^\s*await <istemci>.from(...)` deseni butun agacta SIFIR olmali.
    // Bu, tek tek islev denetimlerinin kacirdigi yeni yazimlari da yakalar.
    const kok = KOK ? `${KOK}/supabase/functions` : "supabase/functions";
    const ciplak: string[] = [];
    const tara = (yol: string, etiket: string) => {
      if (!existsSync(yol)) return;
      readFileSync(yol, "utf-8").split(String.fromCharCode(10)).forEach((l, i) => {
        if (/^\s*await\s+(admin|sb|supabase|client|db)\.from\(/.test(l)) {
          ciplak.push(`${etiket}:${i + 1}`);
        }
      });
    };
    for (const ad of readdirSync(kok, { withFileTypes: true })) {
      if (!ad.isDirectory()) continue;
      if (ad.name === "_shared") {
        // Paylaşılan katman da kapsam içi: buradaki bir sessiz yazım 35 işlevi etkiler.
        for (const p of readdirSync(`${kok}/_shared`)) {
          if (p.endsWith(".ts")) tara(`${kok}/_shared/${p}`, `_shared/${p}`);
        }
        continue;
      }
      tara(`${kok}/${ad.name}/index.ts`, ad.name);
    }
    expect(ciplak, `sonucu okunmayan yazım: ${ciplak.join(" | ")}`).toEqual([]);
  });

  it("bildirim ve depo çağrıları da sessiz değil (rpc/storage da FIRLATMAZ)", () => {
    // `.from(...)` gibi `.rpc(...)` ve `.storage...` da hata FIRLATMAZ. Bildirim
    // sessizce duserse muhatap olayi HIC duymaz — sistem "haber verdim" sayar.
    const BILDIREN = [
      "ajan-nobetci", "cancel-meeting-invite", "check-new-tariff", "create-video-room",
      "deadline-reminder-cron", "randevu-teklif", "send-assignment-notification",
      "send-meeting-invite",
    ];
    for (const ad of BILDIREN) {
      const g = oku(ad);
      expect(g, `${ad}: bildirim sonucu okunmuyor`).toContain("bildirimErr");
      expect(g, `${ad}: hata kayda düşmüyor`).toContain("bildirim gönderilemedi");
    }
    // Depo silmesi: kayit satirlari SILINDI; silme duserse dosya OKSUZ kalir ve
    // hicbir silme kolu onu bir daha bulamaz (KVKK: suresiz saklama yasagi).
    const d = oku("admin-delete-knowledge");
    expect(d, "depoErr okunmuyor").toContain("depoErr");
    expect(d).toContain("öksüz dosya");
    /* `fetch` de HTTP hatasında REDDETMEZ: ateşle-unut iç çağrıda yalnız
       `.catch` varsa sunucunun 500'ü hiçbir yere düşmez. Yorumun sözü
       "hata loglanır" ancak `res.ok` denetlenirse tutulur. */
    const e2 = oku("extract-document-text");
    const i2 = e2.indexOf("functions/v1/belge-ozeti");
    expect(i2, "belge-ozeti çağrısı bulunamadı").toBeGreaterThan(-1);
    expect(e2.slice(i2, i2 + 900), "HTTP durumu denetlenmiyor").toContain("belge-ozeti HTTP");
  });

  it("TARAMA: çıplak rpc / storage çağrısı da kalmadı", () => {
    const kok = KOK ? `${KOK}/supabase/functions` : "supabase/functions";
    const ciplak: string[] = [];
    for (const ad of readdirSync(kok, { withFileTypes: true })) {
      if (!ad.isDirectory()) continue;
      const yol = `${kok}/${ad.name}/index.ts`;
      if (!existsSync(yol)) continue;
      readFileSync(yol, "utf-8").split(String.fromCharCode(10)).forEach((l, i) => {
        // `has_role` gibi SALT OKUMA rpc'leri kapsam dışı: sonucu zaten `data` ile okunur.
        if (/^\s*await\s+(admin|sb|supabase|client|finalAdmin)\.(rpc\(|storage[.\s])/.test(l)) {
          ciplak.push(`${ad.name}:${i + 1}`);
        }
      });
    }
    expect(ciplak, `sonucu okunmayan çağrı: ${ciplak.join(" | ")}`).toEqual([]);
  });

  it("anlatım defteri (_shared/anlatim.ts): yazım düşerse konsola düşüyor", () => {
    // Dosyanin kendi sozu "[anlatim] yazilamadi" logudur — ama catch hic
    // calismadigi icin o log HIC dusmuyordu. 35 islev bu katmani kullaniyor.
    const g = readFileSync(y("supabase/functions/_shared/anlatim.ts"), "utf-8");
    for (const im of ["anlatimErr", "yansitErr"]) expect(g, `${im} okunmuyor`).toContain(im);
    expect(g).toContain("catch KORUMA DEĞİLDİR");
  });

  it("belge durumu sözlük çatalı: metni çıkarılmış belge görünmez kalmıyor", () => {
    /* 25.08 CANLI BULGUSU: `case_documents.extraction_status` canlida IKI deger
       tasiyor — 22 satir `"tamam"`, 2 satir eski `"completed"` (ikisinin de
       metni var). Tek degere bakan suzgec, metni GERCEKTEN cikarilmis belgeleri
       gorunmez yapiyordu: nobetci o dosyada "okunabilir belge yok" sayiyor ve
       belge imzasi degismedigi icin kollar yeniden kosmuyordu. */
    const g = oku("ajan-nobetci");
    expect(g, "sözlük çatalı karşılanmıyor").toContain("METIN_CIKARILDI");
    expect(g, "eski değer kabul edilmiyor").toMatch(/new Set\(\["tamam",\s*"completed"\]\)/);
    // Suzgec artik Set uzerinden calismali, duz esitlik kalmamali.
    expect(g, "hâlâ tek değere eşitlik süzgeci var")
      .not.toMatch(/extraction_status\s*\?\?\s*""\)\s*===\s*"tamam"/);
  });

  it("kapanmış dosyada görev yürütülmüyor", () => {
    /* 25.08 CANLI BULGUSU: `agreed` bir dosyada 13.08'den beri bekleyen bir
       `randevu_teklifi` gorevi bulundu. O dosyanin `otomatik_akis`i kapali
       oldugu icin tetiklenmemisti — sans eseri zararsiz kaldi. Akis ACIKKEN
       kapanan bir dosyada ayni gorev, ANLASMASI BITMIS bir uyusmazlik icin
       taraflara randevu teklif ederdi.
       Kollarin ucu `kapali` denetimini zaten uyguluyordu; yurutucu donguste
       yoktu — kural oraya da tasindi (CLAUDE.md 7-B.1: verilmis karar). */
    const g = oku("ajan-nobetci");
    expect(g, "yürütücüde kapalı dosya denetimi yok").toContain("dosyaKapali");
    expect(g).toContain("Dosya kapandığı için yürütülmedi");
    // Denetim, gorev tipi suzgecinden SONRA ama yurutmeden ONCE olmali.
    const kapaliIdx = g.indexOf("if (dosyaKapali)");
    const yurutIdx = g.indexOf("let tarafSonuc: TeklifSonuc | null = null;");
    expect(kapaliIdx, "kapalı denetimi yok").toBeGreaterThan(-1);
    expect(yurutIdx, "yürütme kapalı denetiminden ÖNCE").toBeGreaterThan(kapaliIdx);
    // Gorev silinmez, kapatilir: sebep kayda gecer.
    expect(g.slice(kapaliIdx, yurutIdx)).toContain('durum: "atlandi"');
    expect(g.slice(kapaliIdx, yurutIdx)).toContain("kapaliErr");
    // Kollardaki mevcut `kapali` denetimleri bozulmamali.
    expect(g.match(/status === "agreed" \|\| dosya\?\.status === "failed"/g)?.length ?? 0)
      .toBeGreaterThanOrEqual(4);
  });

  it("KVKK silmesi depoyu da temizliyor (öksüz belge bırakmıyor)", () => {
    /* 25.08 CANLI BULGUSU: `dosya-verilerini-sil` KVKK silme koludur ama depoya
       HIC dokunmuyordu — `case_documents` satirlari siliniyor, taraflarin
       belgeleri kovada KALIYORDU. Satir gittikten sonra o dosyayi gosteren
       hicbir kayit kalmadigi icin hicbir silme kolu onlari bir daha bulamaz
       (constitution m.10). Canlida bu yolla uretilmis 6 oksuz dosya bulundu. */
    const g = oku("dosya-verilerini-sil");
    expect(g, "depo kovasi tanimli degil").toContain("BELGE_KOVASI");
    expect(g, "depo silmesi yok").toMatch(/storage\.from\(BELGE_KOVASI\)\.remove\(/);
    for (const im of ["yolErr", "depoErr"]) expect(g, `${im} okunmuyor`).toContain(im);
    // SIRA: yollar okunur -> depo silinir -> ANCAK SONRA satirlar silinir.
    const yolIdx = g.indexOf('.select("file_path").eq("case_id", case_id)');
    const depoIdx = g.indexOf("storage.from(BELGE_KOVASI).remove(");
    // Satır silme döngüsü: sayım döngüsü değil, `delete()` çağıran olan.
    const satirIdx = g.indexOf('await admin.from(t.tablo).delete()');
    expect(yolIdx, "yollar okunmuyor").toBeGreaterThan(-1);
    expect(depoIdx, "depo silmesi yok").toBeGreaterThan(yolIdx);
    expect(satirIdx, "satır silmesi depo silmesinden ÖNCE").toBeGreaterThan(depoIdx);
    // Depo silinemezse SATIRLARA DOKUNULMAZ.
    expect(g).toContain("hiçbir kayıt silinmedi");
    // Soz kanitlanabilir: silinen belge sayisi cagirana bildirilir.
    expect(g).toMatch(/belge:\s*yollar\.length/);
  });
});
