// TARAFA OTURUM HAZIRLIK FÖYÜ (İBA 3.1) — 1. TUR: yalnız üretim.
//
// Bu fonksiyon TARAFA HİÇBİR ŞEY GÖNDERMEZ. Föyü 'taslak' olarak yazar; arabulucu
// kokpitte düzenleyip onaylar. Gönderim ayrı bir turda açılacaktır.
//
// KÖR VERİ (constitution m.1 — en sıkı kural): Föy TEK BİR TARAF için kurulur ve
// yalnız O TARAFIN verisi kullanılır — kendi beyanı, kendi belgeleri ve özetleri,
// dosyanın genel konusu ve oturum bilgisi.
// Karşı tarafın beyanı, belgesi, analizi, teklifi, kabul aralığı ve gizli notu
// girdiye HİÇBİR KOŞULDA girmez.
//
// BÖLÜMLER: "Oturumda konuşulacak başlıklar" · "Yanınızda bulundurmanız iyi olur"
// · "Oturum bilgileri". "Cevabını hazırlamanız iyi olur" bölümü 16.08.2026'da
// KAPATILDI: serbest soru üretimi dava/delil mantığına kayıyordu. İleride
// kurucunun yazacağı sabit soru havuzundan seçimle yeniden açılacak; ilgili kod
// silinmedi, yorum içinde bekliyor.
//
// GÜNDEM KODA ALINDI (16.08 kurucu kararı): Gündem başlıkları ARTIK MODELE
// YAZDIRILMIYOR. Sebep: beş turda süzgeç kovalandı, model her turda yeni bir soru
// kalıbı üretti ("…talebiniz nelerdir", "…hangi ayları kapsar", "…beklentiniz
// nasıldır"). Bu kolun işi dosyada NE OLDUĞUNU göstermek; cümle üretmesi
// gerekmiyor. Başlıklar artık o tarafa ait verilerden SABİT KALIPLARLA kurulur
// (bkz. GUNDEM_KALIPLARI). Model çağrısı yalnız eksik belge tespiti için kalmıştır;
// o kaynak da boşsa fonksiyon hiç model çağırmaz — gündem üretimi ücretsizdir.
//
// GÜNDEM BİÇİMİ (16.08 canlı bulgu): "Oturumda konuşulacak başlıklar" bölümündeki
// her madde konuşulacak konunun ADIDIR — kısa isim öbeği. Soru olamaz; soru
// biçimindeki madde sunucuda ELENİR. Gündem hiç kurulamazsa föy boş bırakılmaz:
// dosyanın konusu ve tarafın kendi anlatımından usul gündemi kurulur; o da
// olmazsa taslağa arabulucuya görünür bir "neden boş kaldı" notu yazılır.
//
// DİL SINIRI: sade Türkçe; hukuki tavsiye, sonuç tahmini, "kabul edin/etmeyin",
// rakam önerisi, karşı taraf hakkında yorum ve duygu/kişilik/niyet etiketi YASAK.
// Dosyada karşılığı olmayan madde sunucuda ELENİR.
//
// ONAYLI FÖYE DOKUNULMAZ: durumu 'onaylandi' ya da 'gonderildi' olan satır
// yeniden üretilmez (arabulucunun onayladığı metni ajan değiştiremez).
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KAPANIS_CUMLESI = "Bu föy hazırlık amaçlıdır; arabulucunuz tarafından gözden geçirilmiştir.";
const MAX_METIN = 4_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temiz(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/* ── AJAN DURUM YAZIMI ───────────────────────────────────────────────────────
   Durum yazımı asıl işi ASLA bozmaz: try/catch içinde, hata yutulur ve loglanır. */
const AGENT_TYPE = "hazirlik_foyu";
async function durumYaz(admin: any, caseId: string, partyId: string | null, patch: Record<string, unknown>) {
  if (!admin || !caseId) return;
  try {
    let sorgu = admin.from("agent_states").select("id")
      .eq("case_id", caseId).eq("agent_type", AGENT_TYPE);
    sorgu = partyId ? sorgu.eq("party_id", partyId) : sorgu.is("party_id", null);
    const { data: mevcut } = await sorgu.maybeSingle();
    const govde = { ...patch, updated_at: new Date().toISOString() };
    if (mevcut?.id) await admin.from("agent_states").update(govde).eq("id", mevcut.id);
    else await admin.from("agent_states")
      .insert({ case_id: caseId, agent_type: AGENT_TYPE, party_id: partyId, ...govde });
  } catch (e: any) {
    console.error(`[${AGENT_TYPE}] durum yazılamadı: ${e?.message ?? e}`);
  }
}

// Karşılaştırma için sadeleştirme (Türkçe harfler katlanır). Yalnız eşleştirme içindir.
function sade(metin: string): string {
  return temiz(metin)
    .toLocaleLowerCase("tr-TR")
    .replace(/[şŞ]/g, "s").replace(/[ıİiI]/g, "i").replace(/[ğĞ]/g, "g")
    .replace(/[çÇ]/g, "c").replace(/[öÖ]/g, "o").replace(/[üÜ]/g, "u")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* YASAK DİL — madde bu ifadelerden birini taşıyorsa elenir. Tavsiye, tahmin,
   rakam önerisi, karşı taraf yorumu ve kişilik/duygu etiketi föye giremez. */
const YASAK_IFADELER = [
  "kabul edin", "kabul etmeyin", "reddedin", "kabul etmelisiniz", "reddetmelisiniz",
  "tavsiye ederiz", "tavsiye ederim", "öneririz size", "hukuki tavsiye",
  "kazanırsınız", "kaybedersiniz", "mahkeme", "dava açarsanız", "haklısınız",
  "haksızsınız", "karşı taraf haksız", "karşı taraf haklı", "kötü niyet", "oyalıyor",
  "sinirli", "kaygılı", "agresif", "kişilik", "psikoloj", "niyeti",
  "şu tutarı", "şu rakamı", "teklif edin", "tl teklif",
];
function yasakIfade(metin: string): string | null {
  const k = metin.toLocaleLowerCase("tr-TR");
  return YASAK_IFADELER.find((x) => k.includes(x)) ?? null;
}

/* SORU SINIRI (16.08 canlı bulgu) — Serpil Karahan föyünde sorular tarafın hukuki
   tezini kurmaya yaklaşmıştı ("formu okuma fırsatınız oldu mu", "riskler size ne
   kadar açıklandı"). Bunlar karşı tarafın kusurunu araştıran sorulardır ve
   arabulucunun tarafsızlığını zedeler.
   İZİNLİ: tarafın KENDİ talebini, beklentisini, belgesini netleştiren sorular.
   YASAK: karşı tarafın kusuru/ihmali/yükümlülüğü/niyeti · tarafa hukuki tez
   kurduran ("size açıklandı mı", "bilgilendirildiniz mi") · yönlendiren · duygu
   sorgulayan sorular. Kararsız kalınan soru ELENİR (az soru, riskli sorudan iyidir). */
const SORU_YASAK_KALIPLARI = [
  // karşı tarafın kusuru / yükümlülüğü
  // Edilgen çatı: "…açıklandı / anlatıldı / bildirildi / alındı" kalıpları karşı
  // tarafın ne yapıp yapmadığını araştırır; hepsi elenir (kararsızlıkta eleme).
  "açıkland", "aciklan", "anlatıld", "anlatild", "izah edil", "bildirild",
  "bilgilendir", "bilgi verildi", "onay alınd", "onay alind", "rıza alınd",
  "riza alind", "imzalatıld", "imzalatild", "gösterild", "gosterild",
  "haklarınız anlatıl", "haklariniz anlatil", "uyarıldınız", "uyarildiniz",
  "izin verildi mi", "fırsatınız oldu", "firsatiniz oldu", "imkânınız oldu",
  "imkaniniz oldu", "sorgulama fırsat", "okuma fırsat",
  "ihmal", "kusur", "hata yapıl", "hata yapil", "yükümlülüğünü", "yukumlulugunu",
  "gerekeni yaptı", "gerekeni yapti", "yeterince", "yeterli miydi", "gereği gibi",
  "usulüne uygun mu", "usulune uygun mu", "kim sorumlu", "sorumlusu kim",
  // duygu sorgulama
  "ne hissettiniz", "hissediyorsunuz", "stresin", "endişen", "endisen",
  "kaygın", "kaygin", "üzüldünüz", "uzuldunuz", "rahatsız oldunuz",
  // yönlendirme
  "değil mi?", "degil mi?", "katılıyor musunuz", "katiliyor musunuz",
  "haklı olduğunuzu", "hakli oldugunuzu",
];
function soruYasakMi(metin: string): string | null {
  const k = metin.toLocaleLowerCase("tr-TR");
  return SORU_YASAK_KALIPLARI.find((x) => k.includes(x)) ?? null;
}

/* SORU YÖNÜ KURALI (16.08 ikinci canlı bulgu — Anadolu Sağlık Hizmetleri föyü):
   İlk eleme "karşı tarafın kusurunu araştıran soru" için kurulmuştu; bu kez sorular
   TARAFIN KENDİSİNİ hesap vermeye zorladı ve süzgeçten geçti ("… neden ilk etapta
   teslim edilmemiştir?", "yasal dayanağı nedir?", "ne anlama gelmektedir?").
   Kural artık İSİM değil YÖN üzerinedir: soru KİMSEYİ — ne tarafın kendisini ne
   karşı tarafı — savunmaya, gerekçe göstermeye, hesap vermeye çağıramaz.
   Kararsız kalınan soru ELENİR. */
const SORU_YON_KALIPLARI = [
  "neden", "niçin", "nicin", "niye",
  "yasal dayanağı", "yasal dayanagi", "hukuki dayanağı", "hukuki dayanagi",
  "dayanağı nedir", "dayanagi nedir", "ne anlama gel", "izah ed",
  "gerekçesi nedir", "gerekcesi nedir", "gerekçelendir", "gerekcelendir",
  "iddia edilen", "iddia ettiği", "iddia ettigi", "öne sürülen", "one surulen",
  "yapılmış mıdır", "yapilmis midir", "edilmiş midir", "edilmis midir",
  "mı yapıldı", "mi yapildi", "teslim edilmem", "verilmem", "yerine getirilm",
  "savun", "hesap ver",
];
function soruYonYasakMi(metin: string): string | null {
  const k = metin.toLocaleLowerCase("tr-TR");
  return SORU_YON_KALIPLARI.find((x) => k.includes(x)) ?? null;
}

/* HUKUKİ NİTELEME YASAĞI: föy metninde niteleme kelimesi kullanılmaz; olgu dili
   esastır ("tedavi sonrası ortaya çıkan durum", "talep edilen tutar"). */
const HUKUKI_NITELEME = [
  "kusur", "ihmal", "sorumluluk", "sorumlu tut", "malpraktis", "haksız fiil",
  "haksiz fiil", "tazminat hakkı", "tazminat hakki", "hukuka aykırı", "hukuka aykiri",
  "ihlal", "zarar sorumlus", "kast", "taksir", "illiyet",
];
function hukukiNitelemeVarMi(metin: string): string | null {
  const k = metin.toLocaleLowerCase("tr-TR");
  return HUKUKI_NITELEME.find((x) => k.includes(x)) ?? null;
}

/* ══ GÜNDEM BAŞLIĞI TEK KAPI ═════════════════════════════════════════════════
   16.08 üçüncü canlı bulgu: soru bölümü kapatılınca model soruları GÜNDEME
   taşıdı. 16.08 beşinci canlı bulgu: kural konuldu ama YALNIZ model yolunda
   çalışıyordu — yedek (fallback) gündem ve kısaltma adımı süzgeci atlıyordu,
   canlıda hâlâ "Uğradığınız gelir kaybının ayrıntıları nelerdir?" gibi maddeler
   çıktı. Bundan sonra gündem maddesi üreten HER yol `gundemBasligiKur`
   kapısından geçer; başka yerde biçim düzeltmesi yapılmaz.

   Kapı ELEMEZ, ÇEVİRİR: soru işareti ve soru eki düşürülür, ikinci kişi hitabı
   nesnelleştirilir ("uğradığınız gelir kaybınız" → "gelir kaybı"). Geriye isim
   öbeği kalmıyorsa (madde hâlâ cümle/soru ise) o zaman elenir. */

const GUNDEM_SORU_BASI =
  /^(ne zaman|ne kadar|ne|neden|niçin|nicin|niye|nasıl|nasil|hangi|hangisi|kim|kimler|kimin|kaç|kac|nerede|nereden|nereye|mı|mi|mu|mü)(\s|$)/i;
const GUNDEM_SORU_SONU =
  /(^|\s)(nedir|nelerdir|kimdir|kimlerdir|neresidir|kaçtır|kactir|midir|mıdır|mudur|müdür|mı|mi|mu|mü|musunuz|müsünüz|mısınız|misiniz|mıyım|miyim)\s*[.?!…]*$/i;
// Çekimli yüklem: madde isim öbeği değil, cümledir → çevrilemez.
const GUNDEM_YUKLEM_SONU =
  /(malıdır|melidir|malı|meli|acaktır|ecektir|acak|ecek|ıyor|iyor|uyor|üyor|mıştır|miştir|muştur|müştür|mıştı|mişti|ılır|ilir|ulur|ülür)\s*$/i;

function gundemSoruMu(metin: string): string | null {
  const m = temiz(metin);
  if (m.includes("?")) return "soru işareti";
  const k = m.toLocaleLowerCase("tr-TR");
  if (GUNDEM_SORU_SONU.test(k)) return "soru ekiyle bitiyor";
  if (GUNDEM_SORU_BASI.test(k)) return "soru kalıbıyla başlıyor";
  return null;
}

/* İKİNCİ KİŞİ HİTABI — yalnız GÜNDEM başlıklarında uygulanır. "masraflarınızın"
   → "masraflarının", "talebiniz" → "talebi", baştaki "uğradığınız/yaşadığınız"
   gibi 2. kişi sıfat-fiilleri tümüyle düşer. Oturum bilgileri ve eksik belge
   bölümlerine DOKUNULMAZ (orada "yanınızda bulundurun" dili doğrudur). */
const IYELIK_DEVAM: Record<string, string> = { "ınız": "ın", "iniz": "in", "unuz": "un", "ünüz": "ün" };
const IYELIK_SON: Record<string, string> = { "ınız": "ı", "iniz": "i", "unuz": "u", "ünüz": "ü" };
function ikinciKisiTemizle(metin: string): string {
  let m = temiz(metin);
  /* Kalıp eşlemesi önce çalışır: "sizin adınıza" → "taraf adına". Genel ek
     kuralına bırakılırsa "adınıza" → "adına" olup başındaki "sizin" tek başına
     kalıyor ve cümle bozuluyordu. */
  m = m.replace(/(?<![\p{L}])(sizin\s+)?adınıza(?![\p{L}])/giu, "taraf adına");
  m = m.replace(/^(sizin|size|siz)\s+/iu, "");
  // baştaki "uğradığınız / yaşadığınız / talep ettiğiniz" → düşer
  m = m.replace(/^\S*(dığınız|diğiniz|duğunuz|düğünüz|tığınız|tiğiniz|tuğunuz|tüğünüz)\s+/iu, "");
  // ek devam ediyorsa iyelik tekilleşir, kelime sonundaysa 3. kişiye döner
  m = m.replace(/(ınız|iniz|unuz|ünüz)(?=[a-zçğıöşü])/gu, (e) => IYELIK_DEVAM[e] ?? e);
  m = m.replace(/(ınız|iniz|unuz|ünüz)(?![a-zçğıöşü])/gu, (e) => IYELIK_SON[e] ?? e);
  return m.replace(/\s+/g, " ").trim();
}

/* TEK KAPI: gündem maddesi üreten her yol burayı çağırır. Çevrilemeyen madde
   için null döner (çağıran taraf eler ve sebebini `elenen` listesine yazar). */
function gundemBasligiKur(ham: string): string | null {
  let m = makineEtiketiniKirp(temiz(ham));
  if (!m) return null;

  // 1) soru işareti ve sondaki noktalama düşer
  m = m.replace(/[?？]/g, " ").replace(/\s+/g, " ").trim();
  m = m.replace(/[.!…]+\s*$/u, "").trim();

  // 2) sondaki soru ekleri düşer (üst üste gelebilir: "… nedir ?")
  for (let i = 0; i < 3; i++) {
    const yeni = m.replace(GUNDEM_SORU_SONU, "").replace(/\s+/g, " ").trim();
    if (yeni === m) break;
    m = yeni;
  }

  // 3) ikinci kişi hitabı nesnelleşir
  m = ikinciKisiTemizle(m);

  // 4) baştaki soru kelimesi düşer ("Hangi belgeler …" → "belgeler …")
  const bas = m.toLocaleLowerCase("tr-TR").match(GUNDEM_SORU_BASI);
  if (bas) m = m.slice(bas[0].length).trim();

  if (!m) return null;

  // 5) geriye cümle ya da hâlâ soru kalıyorsa çevrilemez → elenir
  const k = m.toLocaleLowerCase("tr-TR");
  if (GUNDEM_YUKLEM_SONU.test(k)) return null;
  if (gundemSoruMu(m)) return null;
  // Alt sınır 5: kod kalıplarında "Nafaka" gibi tek sözcüklü meşru başlıklar var.
  if (m.length < 5) return null;

  // 6) ilk harf büyür, madde kırpılır
  m = m.charAt(0).toLocaleUpperCase("tr-TR") + m.slice(1);
  return m.slice(0, 300);
}

/* BOŞ FÖY OLMASIN (16.08 dördüncü canlı bulgu — Anadolu Sağlık Hizmetleri föyünde
   gündem HİÇ üretilmedi, tarafa yalnız tarih-saat kaldı). Model hiçbir başlık
   üretemediğinde, dosyanın konusu ve tarafın KENDİ anlatımındaki anahtar sözcüklere
   göre en az 2 usul gündemi kurulur. Bunlar konu ADIDIR; suçlama, hukuki niteleme
   ya da hesap sorma taşımaz. Dosya karşılığı kuralı burada aranmaz: maddeler
   modelden değil, korpustaki anahtar sözcükten türer. */
function yedekGundem(korpus: string): string[] {
  const k = sade(korpus);
  const gecer = (...ipuclari: string[]) => ipuclari.some((i) => k.includes(i));
  const maddeler: string[] = [];
  if (gecer("tutar", "odeme", "para", "fatura", "gider", "masraf", "ucret", "bedel", "kayb"))
    maddeler.push("Talep edilen tutarın kalemleri ve hesaplanma biçimi");
  if (gecer("belge", "rapor", "epikriz", "kayit", "form", "recete", "tahlil", "fatura"))
    maddeler.push("Eksik belgelerin tamamlanması ve zamanlaması");
  if (gecer("tedavi", "ameliyat", "hasta", "klinik", "muayene", "saglik", "islem"))
    maddeler.push("Sürecin tarih sırası ve ilgili kayıtlar");
  maddeler.push("Oturumda öncelikli ele alınacak başlıkların belirlenmesi");
  maddeler.push("Beklentiler ve para dışı çözüm seçenekleri");
  return maddeler.slice(0, 4);
}

/* ══ GÜNDEM: KOD KALIPLARI ════════════════════════════════════════════════════
   Başlıklar modelden değil, tarafa ait verideki anahtar sözcüklerden kurulur.
   `ipuclari` sade() ile katlanmış biçimde yazılır (ş→s, ı/i→i, ğ→g, ç→c, ö→o,
   ü→u); metin de sade() ile karşılaştırılır. Başlıklar isim öbeğidir: soru
   değil, ikinci kişi hitabı yok, hukuki niteleme yok, rakam yok. */
type GundemKalibi = { ipuclari: string[]; baslik: string };

// (1) Talep/konu kalıpları — dosya konusu, uyuşmazlık türü ve tarafın kendi beyanı.
const GUNDEM_KALIPLARI: GundemKalibi[] = [
  { ipuclari: ["odenmeyen kira", "kira bedeli", "kira alacag", "kira borc", "kira odenme"], baslik: "Ödenmeyen kira bedeli alacağı" },
  { ipuclari: ["ortak gider", "aidat", "yonetim gideri"], baslik: "Ortak gider alacağı" },
  { ipuclari: ["gecikme faizi", "temerrut faizi", "faiz"], baslik: "Gecikme faizi" },
  { ipuclari: ["kira artis", "artis orani", "zam orani", "kira zam"], baslik: "Kira artış oranı" },
  { ipuclari: ["tahliye", "mecurun teslim", "tasinmazin teslim"], baslik: "Taşınmazın tahliyesi ve teslim zamanı" },
  { ipuclari: ["depozito", "guvence bedeli"], baslik: "Depozitonun iadesi" },
  { ipuclari: ["tedavi gider", "tedavi masraf", "hastane masraf", "ilac gider", "ameliyat gider"], baslik: "Tedavi giderleri" },
  { ipuclari: ["gelir kayb", "kazanc kayb", "is gucu", "calisamad", "maas kayb"], baslik: "Gelir kaybı" },
  { ipuclari: ["bakim gider", "refakat", "yardim ihtiyaci"], baslik: "Bakım ve refakat giderleri" },
  { ipuclari: ["yol gider", "ulasim gider", "konaklama"], baslik: "Yol ve konaklama giderleri" },
  { ipuclari: ["aydinlatilmis onam", "onam formu", "bilgilendirme formu"], baslik: "Aydınlatılmış onam sürecine ilişkin görüşler" },
  { ipuclari: ["kidem", "ihbar tazminat", "fazla mesai", "yillik izin", "ucret alacag", "asgari gecim"], baslik: "İşçilik alacakları" },
  { ipuclari: ["ise iade", "isten cikar", "is akdinin fesh", "fesih"], baslik: "İş sözleşmesinin sona ermesi" },
  { ipuclari: ["cari hesap", "mal teslim", "siparis", "irsaliye"], baslik: "Ticari alacak ve fatura kayıtları" },
  { ipuclari: ["ayipli", "iade talep", "degisim talep", "garanti"], baslik: "Ayıplı mal veya hizmet ve iade talebi" },
  { ipuclari: ["nafaka"], baslik: "Nafaka" },
  { ipuclari: ["velayet", "kisisel iliski"], baslik: "Çocukla kişisel ilişki düzeni" },
  { ipuclari: ["mal paylas", "katki payi", "edinilmis mal"], baslik: "Mal paylaşımı" },
  { ipuclari: ["teslim tarih", "termin", "sure asim"], baslik: "Teslim ve gecikme süreleri" },
  { ipuclari: ["taksit", "vade", "odeme plan", "senet"], baslik: "Ödeme biçimi ve zamanlaması" },
];

// (2) Belge TÜRÜ kalıpları — belge ADI föye girmez, yalnız konusu başlığa döner.
const BELGE_TURU_KALIPLARI: GundemKalibi[] = [
  { ipuclari: ["sozlesme", "kontrat", "protokol"], baslik: "Sözleşme hükümlerinin ele alınması" },
  { ipuclari: ["fatura", "makbuz", "dekont", "ekstre", "banka"], baslik: "Ödeme ve fatura kayıtlarının incelenmesi" },
  { ipuclari: ["epikriz", "tahlil", "tetkik", "recete", "ameliyat", "hasta dosya"], baslik: "Sağlık kayıtlarının ele alınması" },
  { ipuclari: ["bilirkisi", "hesap raporu"], baslik: "Hesap raporunun ele alınması" },
  { ipuclari: ["ihtarname", "tebligat", "yazisma"], baslik: "İhtarname ve yazışmalar" },
  { ipuclari: ["bordro", "puantaj", "hizmet dokum", "sgk"], baslik: "Çalışma ve ücret kayıtları" },
];

/* HER DOSYADA ÇALIŞAN ASGARİ GÜNDEM: veriden hiçbir başlık çıkmazsa bunlar
   yazılır. Föy asla boş kalmaz. */
const ASGARI_GUNDEM = [
  "Uyuşmazlık konusunun ele alınması",
  "Tarafların beklentileri",
  "Oturumda kimin yer alacağı ve karar yetkisi",
];
// Her föyde yer alan usul başlığı (veri başlığı bulunsa da eklenir).
const USUL_BASLIGI = "Oturumda kimin yer alacağı ve karar yetkisi";

/* GÜNDEMİ KUR: yalnız BU TARAFA ait veriden. `korpus` = dosya konusu + uyuşmazlık
   türü + tarafın kendi beyanı + kendi belge özetleri. `belgeAdlari` = yalnız bu
   tarafın belgeleri. `braketVar` = bu tarafın kabul aralığı kaydının VARLIĞI;
   rakam okunmaz, yazılmaz. Karşı tarafın hiçbir alanı bu fonksiyona girmez. */
function gundemKur(kaynaklar: { korpus: string; belgeAdlari: string; braketVar: boolean }): {
  basliklar: string[];
  izler: string[];
} {
  const metin = sade(kaynaklar.korpus);
  const belgeMetni = sade(kaynaklar.belgeAdlari);
  const izler: string[] = [];
  const veriBasliklari: string[] = [];

  const ekle = (baslik: string, iz: string) => {
    if (!veriBasliklari.includes(baslik)) { veriBasliklari.push(baslik); izler.push(iz); }
  };

  for (const k of GUNDEM_KALIPLARI) {
    if (k.ipuclari.some((i) => metin.includes(i))) ekle(k.baslik, `konu/beyan → ${k.baslik}`);
  }
  for (const k of BELGE_TURU_KALIPLARI) {
    if (k.ipuclari.some((i) => belgeMetni.includes(i))) ekle(k.baslik, `belge türü → ${k.baslik}`);
  }
  // Kabul aralığı kaydı varsa yalnız ödeme başlığı çıkar; hiçbir rakam yazılmaz.
  if (kaynaklar.braketVar) ekle("Ödeme biçimi ve zamanlaması", "kabul aralığı kaydı var → ödeme başlığı");

  const ham = veriBasliklari.length > 0 ? [...veriBasliklari, USUL_BASLIGI] : [...ASGARI_GUNDEM];
  if (veriBasliklari.length === 0) izler.push("veriden başlık çıkmadı → asgari usul gündemi");

  /* Son süzgeç: her başlık TEK KAPI'dan geçer (soru eki, soru kalıbı, ikinci kişi
     eki temizlenir; temizlenemeyen atılır) ve yasak dil / hukuki niteleme
     denetiminden geçer. Kalıplar elle yazılmış olsa da denetim atlanmaz. */
  const temizBasliklar: string[] = [];
  for (const h of ham) {
    const b = gundemBasligiKur(h);
    if (!b) continue;
    if (yasakIfade(b) || hukukiNitelemeVarMi(b) || soruYasakMi(b) || soruYonYasakMi(b)) continue;
    if (!temizBasliklar.includes(b)) temizBasliklar.push(b);
  }
  return { basliklar: temizBasliklar.slice(0, 6), izler };
}

/* EKSİK BELGE SOMUTLUK SÜZGECİ (16.08 canlı bulgu): föye "Tarafınızın kendi
   belgesi" gibi içi boş satırlar yazıldı. Eksik belge bölümü YALNIZ somut bir
   belge adı/konusu varsa yazılır; genel ifade üretilmez. */
const BELGE_GENEL_IFADELER = [
  "tarafinizin kendi", "tarafin kendi", "kendi belgesi", "kendi belgeleri",
  "ilgili belgeler", "gerekli belgeler", "diger belgeler", "destekleyici belge",
  "ek belgeler", "tum belgeler", "varsa belge", "belge ve kayitlar",
  "her turlu belge", "sair belge", "muhtelif belge", "cesitli belge",
  "gerekli evrak", "ilgili evrak", "diger evrak", "tum evrak",
];
const BELGE_JENERIK_SOZCUK = new Set([
  "belge", "belgeler", "belgesi", "belgeleri", "belgelerin", "evrak", "evraklar",
  "kayit", "kayitlar", "kayitlari", "dokuman", "dosya", "suret", "kopya", "orijinal", "asil",
]);
function belgeSomutMu(m: string): boolean {
  const k = sade(m);
  if (BELGE_GENEL_IFADELER.some((g) => k.includes(sade(g)))) return false;
  const anlamli = k.split(" ").filter((w) => w.length >= 4 && !BELGE_JENERIK_SOZCUK.has(w));
  return anlamli.length >= 2 || (anlamli.length === 1 && anlamli[0].length >= 6);
}

/* MAKİNE ETİKETİ: madde sonuna "(Özel Vita Hastanesi)" gibi taraf etiketi
   yazılıyordu. Föy zaten o tarafa aittir; sondaki parantez etiketi kırpılır. */
function makineEtiketiniKirp(metin: string): string {
  return temiz(metin).replace(/\s*\([^()]{2,60}\)\s*$/u, "").trim();
}

/* HAM VERİ TEMİZLİĞİ (16.08 canlı bulgu): föye "Katılım biçimi: main" yazılmıştı —
   veritabanı kodu tarafın göreceği metne sızdı. Tanınmayan kod ASLA yazılmaz. */
const KATILIM_BICIMI: Record<string, string> = {
  online: "çevrimiçi",
  cevrimici: "çevrimiçi",
  video: "çevrimiçi",
  yuz_yuze: "yüz yüze",
  yuzyuze: "yüz yüze",
  fiziksel: "yüz yüze",
  ofis: "yüz yüze",
};
function katilimBicimiMetni(kod: string): string {
  return KATILIM_BICIMI[temiz(kod).toLocaleLowerCase("tr-TR")] ?? "";
}

// Dosya adı/uzantı föy metnine girmez (taraf için anlamsız).
function dosyaAdiIceriyorMu(metin: string): boolean {
  return /\.(pdf|docx?|xlsx?|png|jpe?g|txt)\b/i.test(metin) || /[\w-]+_[\w-]+\./.test(metin);
}

/* DOSYA KARŞILIĞI: maddede geçen anlamlı bir sözcük (≥5 harf) tarafın kendi
   metinlerinde geçmiyorsa madde ELENİR — model dosyada olmayan madde uyduramaz. */
function dosyadaKarsiligiVar(madde: string, korpus: string): boolean {
  const sadeKorpus = sade(korpus);
  const kelimeler = sade(madde).split(" ").filter((k) => k.length >= 5);
  if (kelimeler.length === 0) return false;
  return kelimeler.some((k) => sadeKorpus.includes(k));
}

function trTarihSaat(iso: string): { tarih: string; saat: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { tarih: "—", saat: "—" };
  return {
    tarih: d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }),
    saat: d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let durumAdmin: any = null;
  let durumCaseId = "";
  let durumPartyId: string | null = null;

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

    // İç çağrı kapısı: nöbetçi ajan bu fonksiyonu x-cron-secret ile çağırabilir;
    // dışarıdan gelen isteklerde kullanıcı yetkisi aranır. Anahtar tanımsız ya da
    // boşsa kapı KAPALIDIR. Kalıp elverislilik/usul-onerisi ile aynıdır.
    const isCron = !!CRON_SECRET && req.headers.get("x-cron-secret") === CRON_SECRET;
    const authHeader = req.headers.get("Authorization");
    if (!isCron && !authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);

    let userId = "";
    if (!isCron) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader! } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user) return json({ error: "Oturum doğrulanamadı" }, 401);
      userId = userData.user.id;
    }

    const body = await req.json().catch(() => ({}));
    const case_id = temiz((body as any)?.case_id);
    const session_id = temiz((body as any)?.session_id);
    const party_id = temiz((body as any)?.party_id);
    if (!case_id || !session_id || !party_id) {
      return json({ error: "case_id, session_id ve party_id gerekli" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: caseRow, error: cErr } = await admin.from("cases")
      /* dispute_type / dispute_subtype / dispute_type_other / category yalnız
         ANAHTAR SÖZCÜK KAYNAĞI olarak okunur — ham kod föye YAZILMAZ.
         desired_outcome ve priorities BİLEREK okunmaz: bunlar başvuranın kendi
         talebi/önceliğidir, karşı tarafın föyüne girerse kör veri ilkesi kırılır. */
      .select("id, user_id, assigned_mediator_id, title, issue_description, dispute_type, dispute_subtype, dispute_type_other, category")
      .eq("id", case_id).maybeSingle();
    if (cErr) return json({ error: cErr.message }, 500);
    if (!caseRow) return json({ error: "Dosya bulunamadı" }, 404);

    // Yetki: yalnız görevli arabulucu, dosya sahibi veya yönetici. Taraf çağıramaz.
    if (!isCron) {
      const { data: roleRow } = await admin.from("user_roles")
        .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      const yetkili = (caseRow as any).assigned_mediator_id === userId
        || (caseRow as any).user_id === userId
        || !!roleRow;
      if (!yetkili) return json({ error: "Bu dosya için yetkiniz yok" }, 403);
    }

    durumAdmin = admin;
    durumCaseId = case_id;
    durumPartyId = party_id;
    await durumYaz(durumAdmin, durumCaseId, durumPartyId, { status: "running", error_message: null });

    // ONAYLI / GÖNDERİLMİŞ FÖYE DOKUNULMAZ.
    const { data: mevcutFoy } = await admin.from("oturum_hazirlik_foyleri")
      .select("id, durum").eq("session_id", session_id).eq("party_id", party_id).maybeSingle();
    if (mevcutFoy && ["onaylandi", "gonderildi"].includes(String((mevcutFoy as any).durum))) {
      await durumYaz(durumAdmin, durumCaseId, durumPartyId, {
        status: "completed", error_message: null,
        last_output: { sonuc: "atlandi", sebep: "föy onaylanmış/gönderilmiş" },
      });
      return json({ atlandi: true, sebep: "Föy onaylanmış ya da gönderilmiş; üzerine yazılmaz." });
    }

    const { data: taraf, error: pErr } = await admin.from("case_parties")
      .select("id, case_id, party_role, party_type, first_name, last_name, company_name, full_name, statement")
      .eq("id", party_id).maybeSingle();
    if (pErr) return json({ error: pErr.message }, 500);
    if (!taraf || String((taraf as any).case_id) !== String(case_id)) {
      return json({ error: "Taraf bu dosyaya ait değil" }, 400);
    }

    const { data: oturum, error: sErr } = await admin.from("case_sessions")
      .select("id, case_id, scheduled_at, status, session_type, meeting_type, video_link")
      .eq("id", session_id).maybeSingle();
    if (sErr) return json({ error: sErr.message }, 500);
    if (!oturum || String((oturum as any).case_id) !== String(case_id)) {
      return json({ error: "Oturum bu dosyaya ait değil" }, 400);
    }

    // ── YALNIZ BU TARAFIN VERİSİ ────────────────────────────────────────────
    const { data: belgeler } = await admin.from("case_documents")
      .select("id, file_name").eq("case_id", case_id).eq("party_id", party_id).limit(50);
    const belgeIdleri = ((belgeler ?? []) as any[]).map((d) => d.id);
    const { data: ozetler } = belgeIdleri.length
      ? await admin.from("belge_ozetleri")
        .select("document_id, ozet, kaniti, durum").in("document_id", belgeIdleri).limit(50)
      : { data: [] as any[] };
    const ozetBlogu = ((ozetler ?? []) as any[])
      .filter((o) => temiz(o.durum) === "uretildi")
      .map((o) => `${temiz(o.ozet)} ${temiz(o.kaniti)}`.trim())
      .join("\n");

    /* Soru bölümü 16.08.2026'da kapatıldı: serbest üretim dava/delil mantığına
       kayıyordu. İleride kurucunun yazacağı sabit soru havuzundan seçimle yeniden
       açılacak (bkz. DOJO incelemesi). Kod SİLİNMEDİ; havuz gelince bu okuma ve
       aşağıdaki (c) bloğu yorumdan çıkarılarak geri açılır.

    const { data: sorular } = await admin.from("case_discovery_questions")
      .select("question_text, answer_text").eq("case_id", case_id).eq("party_id", party_id).limit(30);
    const cevapsizSorular = ((sorular ?? []) as any[])
      .filter((q) => !temiz(q.answer_text))
      .map((q) => temiz(q.question_text))
      .filter(Boolean);
    */

    // Yüklenmiş belge adları: "eksik belgeler" bölümünde bunlar TEKRAR YAZILMAZ.
    const yuklenmisAdlar = ((belgeler ?? []) as any[])
      .map((d) => temiz(d.file_name)).filter(Boolean);

    /* Arabulucunun/ajanın daha önce istediği ama gelmeyen bilgi-belge: taraf ajanı
       panosundaki kendi satırları. Yalnız BU TARAFA yönelik kayıtlar okunur. */
    const { data: istekler } = await admin.from("ajan_gorevleri")
      .select("gorev_tipi, gerekce, sonuc, durum")
      .eq("case_id", case_id).eq("hedef_party_id", party_id)
      .in("gorev_tipi", ["taraf_eksik_bilgi", "soru_gonder"]).limit(20);
    const istenenler = ((istekler ?? []) as any[])
      .map((g) => `${temiz(g.gerekce)} ${temiz(g.sonuc)}`.trim())
      .filter((x) => x.length > 10);

    /* Bu tarafın kabul aralığı kaydının VARLIĞI — yalnız `id` okunur, hiçbir
       rakam (alt_sinir/ust_sinir/kosullu_deger) okunmaz ve föye yazılmaz.
       Karşı tarafın braketi sorguya party_id ile kapatılmıştır. */
    const { data: braketler } = await admin.from("teklif_braketleri")
      .select("id").eq("case_id", case_id).eq("party_id", party_id).limit(1);
    const braketVar = ((braketler ?? []) as any[]).length > 0;

    const beyan = temiz((taraf as any).statement);
    const konu = temiz((caseRow as any).issue_description);
    // Uyuşmazlık türü alanları: yalnız kalıp eşleştirme için, ham hâlleri yazılmaz.
    const turMetni = [
      temiz((caseRow as any).dispute_type), temiz((caseRow as any).dispute_subtype),
      temiz((caseRow as any).dispute_type_other), temiz((caseRow as any).category),
      temiz((caseRow as any).title),
    ].filter(Boolean).join(" ");
    const belgeAdlari = ((belgeler ?? []) as any[]).map((d) => temiz(d.file_name)).join(" ");
    const korpus = [konu, turMetni, beyan, ozetBlogu, belgeAdlari].filter(Boolean).join("\n");

    type Bolum = { baslik: string; maddeler: string[] };
    const bolumler: Bolum[] = [];
    const elenen: string[] = [];

    /* ── (a) GÜNDEM — KODDAN KURULUR, MODEL KULLANILMAZ ─────────────────────
       Kaynaklar: dosya konusu + uyuşmazlık türü + tarafın kendi beyanı + kendi
       belge özetleri (kalıp eşleştirme), kendi belgelerinin türü, kendi kabul
       aralığı kaydının varlığı. En az 2, en çok 6 başlık; tekrar yazılmaz. */
    const { basliklar: gundemBasliklari, izler: gundemIzleri } = gundemKur({
      korpus, belgeAdlari, braketVar,
    });
    if (gundemBasliklari.length > 0) {
      bolumler.push({ baslik: "Oturumda konuşulacak başlıklar", maddeler: gundemBasliklari });
    }

    /* ── (b) EKSİK BELGELER — MODELİN KALAN TEK İŞİ ─────────────────────────
       MALİYET: gündem koda alındığı için artık ücretsizdir. Model YALNIZ "tarafın
       anlatımında adı geçen ama henüz yüklenmemiş belge" çıkarımı için çağrılır.
       ÇAĞRI KOŞULU: anahtar tanımlı VE çıkarım yapılacak kaynak dolu — tarafın
       kendi anlatımı ya da arabulucunun daha önce istediği bilgi/belge kaydı,
       toplam 40 karakterden uzun. Bu kaynaklar boşsa HİÇ ÇAĞRI YAPILMAZ (boş
       girdiden belge adı uydurulmasın ve boşuna jeton harcanmasın). */
    const eksikKorpus = [beyan, istenenler.join("\n")].filter(Boolean).join("\n");
    const modelGerekli = !!apiKey && eksikKorpus.trim().length > 40;
    if (modelGerekli) {
      const systemPrompt = `Sen bir arabuluculuk dosyasında TARAFA VERİLECEK HAZIRLIK FÖYÜNÜN "eksik belgeler" bölümünü yazan yardımcısın. Föyü okuyacak kişi hukukçu değildir.

MUTLAK SINIRLAR:
1. Yalnız sana verilen DOSYA METİNLERİNE dayan. Karşılığı olmayan hiçbir madde yazma.
2. Hukuki tavsiye verme, sonuç tahmin etme, rakam önerme, soru sorma.
3. Karşı taraf hakkında yorum yapma; karşı tarafın verisi sana zaten verilmedi.
4. Duygu, kişilik ve niyet değerlendirmesi yapma.
5. Hukuki niteleme kullanma (kusur, ihmal, sorumluluk, malpraktis, haksız fiil, tazminat hakkı, ihlal). Olgu dili kullan.
6. Gündem başlığı ÜRETME — gündem bu fonksiyonda koddan kurulur, senden istenmiyor.

TEK GÖREV — "EKSİK BELGELER": tarafın anlatımında ya da arabulucunun isteklerinde ADI GEÇEN ama HENÜZ YÜKLENMEMİŞ belgeler (en çok 5 madde).
· Sana "zaten yüklenmiş belgeler" listesi veriliyor; ORADA OLAN HİÇBİR BELGEYİ YAZMA.
· Dosya adı ve uzantı yazma; insan diliyle belgenin KONUSUNU yaz ("ameliyat görüntü kayıtları", "hemşire gözlem formları", "kira sözleşmesi").
· SOMUT OL: "tarafınızın kendi belgesi", "ilgili belgeler", "gerekli evraklar" gibi içi boş ifadeler YAZILMAZ. Somut bir belge adı/konusu yoksa listeyi BOŞ bırak.
· Emin değilsen yazma. Boş liste, uydurma maddeden iyidir.

Çıktı YALNIZCA JSON: {"eksik_belgeler":[""]}`;

      const userPrompt = `[DOSYA KONUSU]\n${konu || "—"}\n\n`
        + `[TARAFIN KENDİ ANLATIMI]\n${beyan.slice(0, MAX_METIN) || "—"}\n\n`
        + `[ZATEN YÜKLENMİŞ BELGELER — BUNLARI YAZMA]\n${yuklenmisAdlar.join(" · ") || "—"}\n\n`
        + `[TARAFIN BELGE ÖZETLERİ]\n${ozetBlogu.slice(0, MAX_METIN) || "—"}\n\n`
        + `[ARABULUCUNUN DAHA ÖNCE İSTEDİĞİ AMA GELMEYEN BİLGİ/BELGE]\n${istenenler.join("\n") || "—"}`;

      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (aiRes.ok) {
          const aiJson = await aiRes.json();
          let parsed: any = {};
          try { parsed = JSON.parse(aiJson?.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }

          /* Model artık başlık üretmiyor; gelirse de OKUNMAZ (gündem koddan gelir).
             Eksik belgeler: ZATEN YÜKLENMİŞ belge tekrar yazılmaz, dosya adı/uzantı
             içeren madde elenir, içi boş genel ifade elenir. Not: bu bölümde
             "dosyada karşılığı olsun" kuralı gevşetilir — istenen belge tanımı
             gereği dosyada YOKTUR; bunun yerine tarafın anlatımında ya da
             arabulucunun isteklerinde karşılığı aranır. */
          const eksikBelgeler = (Array.isArray(parsed?.eksik_belgeler) ? parsed.eksik_belgeler : [])
            .map((m: unknown) => makineEtiketiniKirp(temiz(m)))
            .filter((m: string) => {
              if (m.length < 8) return false;
              const y = yasakIfade(m) ?? soruYasakMi(m) ?? soruYonYasakMi(m);
              if (y) { elenen.push(`eksik belge: yasak dil/yön ("${y}")`); return false; }
              const n = hukukiNitelemeVarMi(m);
              if (n) { elenen.push(`eksik belge: hukuki niteleme ("${n}")`); return false; }
              if (dosyaAdiIceriyorMu(m)) { elenen.push("eksik belge: dosya adı yazılmış"); return false; }
              if (!belgeSomutMu(m)) { elenen.push("eksik belge: somut belge adı/konusu yok"); return false; }
              if (yuklenmisAdlar.some((ad) => sade(m).includes(sade(ad)) || sade(ad).includes(sade(m)))) {
                elenen.push("eksik belge: zaten yüklenmiş");
                return false;
              }
              if (eksikKorpus.trim().length > 0 && !dosyadaKarsiligiVar(m, eksikKorpus)) {
                elenen.push("eksik belge: anlatımda ya da istek kaydında karşılığı yok");
                return false;
              }
              return true;
            })
            .slice(0, 5)
            .map((m: string) => m.slice(0, 300));

          // Somut eksik yoksa bölüm HİÇ yazılmaz (içi boş satır föye girmesin).
          if (eksikBelgeler.length > 0) bolumler.push({ baslik: "Yanınızda bulundurmanız iyi olur", maddeler: eksikBelgeler });
        } else {
          console.error(`[hazirlik-foyu] HTTP ${aiRes.status}`);
        }
      } catch (e: any) {
        console.error(`[hazirlik-foyu] model çağrısı başarısız: ${e?.message ?? e}`);
      }
    }

    /* ── (c) KAPALI — "Cevabını hazırlamanız iyi olur" bölümü ARTIK ÜRETİLMEZ ──
       Soru bölümü 16.08.2026'da kapatıldı: serbest üretim dava/delil mantığına
       kayıyordu. İleride kurucunun yazacağı sabit soru havuzundan seçimle yeniden
       açılacak (bkz. DOJO incelemesi). Kod SİLİNMEDİ; havuz gelince bu blok ve
       yukarıdaki keşif sorusu okuması yorumdan çıkarılarak geri açılır.
       Not: buradaki eleme süzgeçleri (soruYasakMi / soruYonYasakMi /
       hukukiNitelemeVarMi) başlık ve eksik belge bölümlerinde HÂLÂ kullanılır.

    const guvenliSorular = cevapsizSorular
      .map((q) => makineEtiketiniKirp(q))
      .filter((q) => {
        const y = soruYasakMi(q) ?? yasakIfade(q);
        if (y) { elenen.push(`keşif sorusu elendi: tarafsızlık sınırı ("${y}")`); return false; }
        const yon = soruYonYasakMi(q);
        if (yon) { elenen.push(`keşif sorusu elendi: yön sınırı — hesap sorma ("${yon}")`); return false; }
        const n = hukukiNitelemeVarMi(q);
        if (n) { elenen.push(`keşif sorusu elendi: hukuki niteleme ("${n}")`); return false; }
        return true;
      });
    if (guvenliSorular.length > 0) {
      bolumler.push({
        baslik: "Cevabını hazırlamanız iyi olur",
        maddeler: guvenliSorular.slice(0, 8).map((q) => q.slice(0, 300)),
      });
    }
    ── (c) KAPALI bloğun sonu ───────────────────────────────────────────────── */

    /* ── BOŞ FÖY KORUMASI (İKİNCİ AĞ) ───────────────────────────────────────
       Gündem artık koddan kuruluyor ve ASGARI_GUNDEM tabanı var; bu yol
       pratikte devreye girmez. Yine de KALDIRILMADI: gundemKur hiçbir başlık
       döndüremezse (ör. bütün başlıklar süzgeçte düşerse) tarafın KENDİ anlatımı
       ve dosyanın konusu üzerinden en az 2 usul gündemi kurulur. Karşı tarafın
       verisi bu yola da girmez — yedek gündem yalnız `korpus` üzerinden türer. */
    let yedekGundemKullanildi = false;
    const gundemBolumu = bolumler.find((b) => b.baslik === "Oturumda konuşulacak başlıklar");
    if (!gundemBolumu || gundemBolumu.maddeler.length === 0) {
      /* Yedek maddeler de TEK KAPI'dan geçer — elle yazılmış olsalar bile biçim
         denetimi tek yerden yapılsın (16.08 beşinci bulgu: bu yol süzgeci
         atlıyordu). */
      const yedek = korpus.trim().length > 0
        ? yedekGundem(korpus)
          .map((m) => gundemBasligiKur(m))
          .filter((m): m is string => !!m)
          .filter((m) => !yasakIfade(m) && !hukukiNitelemeVarMi(m))
        : [];
      if (yedek.length >= 2) {
        yedekGundemKullanildi = true;
        elenen.push("gündem: model çıktısı boş kaldı, dosya konusundan usul gündemi kuruldu");
        if (gundemBolumu) gundemBolumu.maddeler = yedek;
        else bolumler.unshift({ baslik: "Oturumda konuşulacak başlıklar", maddeler: yedek });
      }
    }

    /* Yine de hiç gündem çıkmadıysa föy 'taslak' kalır ve NEDEN boş kaldığı
       arabulucunun göreceği bir not olarak yazılır (hangi kaynakta veri yok).
       Bu not tarafa gönderilmeden önce arabulucu tarafından kaldırılmalıdır. */
    const gundemVar = bolumler.some(
      (b) => b.baslik === "Oturumda konuşulacak başlıklar" && b.maddeler.length > 0,
    );
    if (!gundemVar) {
      const eksikKaynaklar = [
        konu ? null : "dosya konusu boş",
        beyan ? null : "tarafın kendi anlatımı boş",
        ozetBlogu ? null : "belge özeti yok",
        yuklenmisAdlar.length ? null : "yüklenmiş belge yok",
        istenenler.length ? null : "arabulucu istek kaydı yok",
      ].filter(Boolean) as string[];
      bolumler.push({
        baslik: "Arabulucu notu — gündem üretilemedi",
        maddeler: [
          `Gündem kurulamadı. Veri bulunamayan kaynaklar: ${eksikKaynaklar.join(" · ") || "model çıktısı boş"}.`,
          "Bu not tarafa gönderilmeden önce kaldırılmalı; föy elle tamamlanmalıdır.",
        ],
      });
    }

    // ── (d) Oturum bilgileri — KODDAN, kayıttan ────────────────────────────
    const oturumMaddeleri: string[] = [];
    const zaman = temiz((oturum as any).scheduled_at);
    if (zaman) {
      const { tarih, saat } = trTarihSaat(zaman);
      oturumMaddeleri.push(`Tarih: ${tarih}`);
      oturumMaddeleri.push(`Saat: ${saat}`);
    }
    // Tanınmayan kod ASLA yazılmaz (ör. "main" gibi iç değerler föye sızmasın).
    const bicimMetni = katilimBicimiMetni(temiz((oturum as any).meeting_type));
    if (bicimMetni) oturumMaddeleri.push(`Katılım biçimi: ${bicimMetni}`);
    if (temiz((oturum as any).video_link)) {
      oturumMaddeleri.push("Görüşme bağlantısı oturum davetinde paylaşılır.");
    }
    if (oturumMaddeleri.length > 0) {
      bolumler.push({ baslik: "Oturum bilgileri", maddeler: oturumMaddeleri });
    }

    /* 16.08: Kapanış cümlesi ARTIK BÖLÜM OLARAK YAZILMIYOR — başlıksız boş bölüm
       gibi görünüyordu. Metin sabit olduğu için ekranda alt not olarak gösterilmesi
       ön yüz işidir; veriden çıkarıldı. (Sabit metin aşağıda dursun ki gerektiğinde
       tek yerden okunabilsin.) */
    const dolu = bolumler.filter((b) => b.baslik && b.maddeler.length > 0).length > 0;
    const satir = {
      case_id, session_id, party_id,
      bolumler,
      durum: "taslak",
      updated_at: new Date().toISOString(),
    };
    const { error: yErr } = await admin.from("oturum_hazirlik_foyleri")
      .upsert(satir, { onConflict: "session_id,party_id" });
    if (yErr) {
      await durumYaz(durumAdmin, durumCaseId, durumPartyId, { status: "failed", error_message: yErr.message });
      return json({ error: `Kayıt yazılamadı: ${yErr.message}` }, 500);
    }

    await durumYaz(durumAdmin, durumCaseId, durumPartyId, {
      status: "completed", error_message: null,
      last_output: {
        sonuc: dolu ? "taslak_hazir" : "bos_taslak",
        bolum: bolumler.length,
        gundem: gundemVar ? (yedekGundemKullanildi ? "yedek" : "kod") : "yok",
        gundem_sayisi: gundemBasliklari.length,
        gundem_izleri: gundemIzleri.slice(0, 6),
        model_cagrisi: modelGerekli ? "eksik_belge" : "yapilmadi",
        elenen: elenen.slice(0, 5),
      },
    });
    return json({
      durum: "taslak",
      bolum: bolumler.length,
      bos: !dolu,
      gundem: gundemVar ? (yedekGundemKullanildi ? "yedek" : "kod") : "yok",
      gundem_sayisi: gundemBasliklari.length,
      model_cagrisi: modelGerekli ? "eksik_belge" : "yapilmadi",
      elenen: elenen.slice(0, 5),
    });
  } catch (e: any) {
    console.error("[hazirlik-foyu] hata", e?.message ?? e);
    await durumYaz(durumAdmin, durumCaseId, durumPartyId, {
      status: "failed", error_message: String(e?.message ?? "Bilinmeyen hata").slice(0, 500),
    });
    return json({ error: e?.message ?? "Bilinmeyen hata" }, 500);
  }
});
