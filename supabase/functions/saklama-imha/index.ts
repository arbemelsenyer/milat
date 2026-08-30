// PERİYODİK İMHA — saklama süresi dolan veriyi siler
// mimari §15.2 ("saklama süreleri parametre tablosundan okunuyor ve periyodik
// imha çalışıyor") · constitution m.10 (süresiz saklama yasağı) · HAT H-15/1
//
// GÜVENLİ TASARIM — hiçbir şey "varsayılan olarak" silinmez:
//   · Süre `public.saklama_sureleri` tablosundan okunur, KODDA SABİT YOKTUR.
//   · `saklama_gun` NULL olan tür ATLANIR. Tablo değer olmadan kurulduğu için
//     kurucu süreleri girene kadar bu kol HİÇBİR ŞEY SİLMEZ (no-op).
//   · Tablo henüz yoksa kol sessizce değil, AÇIKÇA "tablo yok" diyerek çıkar.
//   · `kuru: true` ile çağrılırsa yalnız SAYAR, silmez — süreler girildikten
//     sonra neyin silineceği önce görülebilsin diye.
//
// Sayaç başlangıcı iki türlü olabilir (`baslangic` kolonu):
//   · 'olusturma'      → satırın `created_at`i
//   · 'dosya_kapanisi' → dosyanın `closed_at`i (kapanmamış dosyaya DOKUNULMAZ)
//
// ── 26.08.2026 · İKİ P0 KUSUR DÜZELTİLDİ (kol hiç koşmadan yakalandı) ───────
// Kol 27.08 03:00'te ilk kez gerçekten koşacaktı (cron jobid 21). Koşmadan önce
// CANLI PARAMETRELERLE denetlendi ve iki geri dönüşsüz kusur bulundu:
//
// (1) `oturum_kayitlari` SATIRI SİLİNİYORDU. Oysa o tabloda ses ve döküm AYNI
//     SATIRDA, ayrı kolonlarda durur (`ses_dosya_yolu` · `dokum_metni`) ve ayrı
//     silme damgaları vardır (`ses_silindi_at` · `dokum_silindi_at`). Canlı
//     parametre `oturum_kaydi_ses = 0 gün · olusturma` olduğu için üretilen
//     sorgu şuydu: `delete from oturum_kayitlari where created_at < now()`.
//     Yani DOSYA KAPANMIŞ OLSUN OLMASIN TÜM SATIRLAR — 7 gün saklanacak
//     dökümler ve KVKK uyumunu kanıtlayan silme damgaları da giderdi.
//     Doğrusu: satır silinmez, KOLON boşaltılır — `ajan-nobetci`in kayıt silme
//     kolundaki (`kayitSilmeKollari`) desenin aynısı. Ses için ayrıca DEPODAKİ
//     dosya silinir; sonra damga yazılır.
//
// (2) `case_documents` satırları silinirken DEPOYA DOKUNULMUYORDU — 25.08'de
//     `dosya-verilerini-sil` kolunda kapatılan öksüz-belge kusurunun aynısı
//     (HAT H-12: canlıda 6 öksüz). Satır gidince dosyayı gösteren kayıt kalmaz,
//     hiçbir silme kolu onu bir daha bulamaz → constitution m.10 ihlali.
//     Doğrusu: ÖNCE depo, SONRA satır. Depo silinemezse satıra DOKUNULMAZ.
//
// Ortak kural: bir silme kolu, sildiği şeyin İZİNİ de doğru bırakmalıdır.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { dosyayiTemizle, SILME_SURUMU } from "../_shared/dosya-silme.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/* Kova adları KODDA sabittir (parametre tablosundan yalnız SÜRE okunur).
   `oturum-kayitlari` → ajan-nobetci/index.ts `KAYIT_BUCKET` ile aynı olmalı.
   `case-documents`   → dosya-verilerini-sil/index.ts `BELGE_KOVASI` ile aynı. */
const KAYIT_KOVASI = "oturum-kayitlari";
const BELGE_KOVASI = "case-documents";

/** Tek koşumda tür başına en çok kaç satır işlenir. Kalanı bir sonraki koşum
 *  alır; sınıra dayanıldığında SESSİZ GEÇİLMEZ, uyarı yazılır. */
const TUR_BASINA_SINIR = 500;

type Sure = {
  veri_turu: string;
  saklama_gun: number | null;
  baslangic: string;
  /* 29.08.2026 · H-15/1: NULL süre iki AYRI şey demekti ve kol ikisini de
     "süre girilmemiş" diye raporluyordu — biri KARAR BEKLİYOR, öteki KURUCU
     KARARIYLA KALICI. Aynı cümle, birinde "eksik iş", ötekinde "doğru
     çalışıyor" demek; ayırt edilemeyince kalıcı kayıt sonsuza kadar
     yapılacak iş sanılır. Cowork tabloya `kalici` kolonunu tam bu yüzden
     ekledi; kol da artık ikisini ayırıyor. */
  kalici: boolean | null;
};

/** Veri türü → hangi tablo, hangi zaman kolonu. Tablo adları KODDA sabittir;
 *  parametre tablosundan yalnız SÜRE okunur. Böylece bir yazım hatası ya da
 *  kötü niyetli satır rastgele bir tabloyu sildiremez. */
const TUR_HARITASI: Record<string, { tablo: string; zaman: string } | null> = {
  // Ham ses zaten metne çevrilir çevrilmez siliniyor (H-14 şart 1); burada
  // yalnız o silmeden KAÇAN dosyalar temizlenir.
  // ⚠ Aşağıdaki üç tür döngüde ÖZEL işlenir (satır silinmez / önce depo gelir);
  //   eşleme yalnız "tanınan tür" sayılmaları ve tablo adının tek yerde durması
  //   için burada durur. Yeni tür eklerken hangi kola düştüğüne bak.
  oturum_kaydi_ses: { tablo: "oturum_kayitlari", zaman: "created_at" },
  oturum_kaydi_dokum: { tablo: "oturum_kayitlari", zaman: "created_at" },
  case_documents: { tablo: "case_documents", zaman: "created_at" },
  case_notes: { tablo: "case_notes", zaman: "created_at" },
  // Canlı tabloda 25.08'de eklendi (kurucu kararı: mali kayıt 10 yıl).
  odeme_kayitlari: { tablo: "case_payments", zaman: "created_at" },
  /* EMNİYET SÜPÜRGESİ (29.08.2026 · HAT H-15/1 adım 3).
     Bu tür 28.08'e kadar `null` idi: "başka kolun işi (dosya-verilerini-sil)".
     Ama o kol KENDİLİĞİNDEN HİÇ ÇALIŞMAZ — bilerek öyle yazıldı (insan
     kapısı). Yani arabulucu "Verileri sil" düğmesine basmayı unutursa dosya
     SONSUZA KADAR duruyordu. Kurucu kararı bunu açıkça istiyordu:
     "arabulucu unutursa kapanıştan N gün sonra otomatik silinir."
     CANLI KANIT (29.08): 6 kapalı dosyanın 5'i süresini geçmişti ve
     8 `case_parties` satırı (taraf kimlikleri) hâlâ duruyordu.
     Bu tür ÖZEL KOLDA işlenir (aşağıda); eşlemesi yalnız "tanınan tür"
     sayılması için burada durur — tablo adı kullanılmaz. */
  dosya_kapanis_sonrasi: { tablo: "cases", zaman: "closed_at" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

    // İç kapı: cron sırrı ya da admin oturumu.
    const isCron = !!CRON_SECRET && req.headers.get("x-cron-secret") === CRON_SECRET;
    const admin = createClient(SUPABASE_URL, SERVICE);
    if (!isCron) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);
      const { data: u } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!u?.user) return json({ error: "Oturum doğrulanamadı" }, 401);
      const { data: yetkili } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      if (!yetkili) return json({ error: "Admin gereklidir" }, 403);
    }

    const govde = await req.json().catch(() => ({}));
    const kuru = govde?.kuru === true;   // yalnız say, silme

    const { data: sureler, error: sureErr } = await admin
      .from("saklama_sureleri").select("veri_turu, saklama_gun, baslangic, kalici");
    if (sureErr) {
      // Tablo yoksa bunu AÇIKÇA söyle: sessizce "hiçbir şey silinmedi" deme.
      return json({
        error: `Saklama süreleri okunamadı: ${sureErr.message}`,
        ipucu: "Parametre tablosu henüz kurulmamış olabilir (HAT H-15/1).",
      }, 500);
    }

    const sonuc: Record<string, unknown>[] = [];
    let toplamSilinen = 0;
    const uyarilar: string[] = [];

    for (const s of ((sureler ?? []) as Sure[])) {
      const tur = String(s.veri_turu);
      /* SÜRE GİRİLMEMİŞSE DOKUNMA. Bu, tablonun değer olmadan kurulmasının
         güvenlik karşılığıdır: karar gelmeden hiçbir şey silinmez.
         Ama SEBEBİ doğru söyle: `kalici` olan tür eksik değil, BİLEREK
         süresizdir (onay kayıtları · anonim kapanış istatistiği). */
      if (s.saklama_gun == null) {
        sonuc.push(s.kalici === true
          ? { tur, durum: "kalıcı", sebep: "kurucu kararıyla silinmez" }
          : { tur, durum: "atlandı", sebep: "süre girilmemiş" });
        continue;
      }
      const hedef = TUR_HARITASI[tur];
      if (hedef === null) {
        sonuc.push({ tur, durum: "atlandı", sebep: "bu tür başka bir kolun işi (dosya-verilerini-sil)" });
        continue;
      }
      if (!hedef) {
        // Tabloya tanınmayan bir tür girilmiş: sessiz geçilmez.
        uyarilar.push(`tanınmayan veri türü: ${tur}`);
        sonuc.push({ tur, durum: "atlandı", sebep: "tanınmayan tür" });
        continue;
      }

      const sinir = new Date(Date.now() - s.saklama_gun * 86_400_000).toISOString();

      /* KAPSAM — bu türün hangi satırları süresini doldurdu?
         · 'dosya_kapanisi' → süresi dolmuş KAPALI dosyaların satırları
                              (kapanmamış dosyaya DOKUNULMAZ)
         · 'olusturma'      → satırın kendi zaman kolonu sınırın gerisinde
         Kapsam bir kez kurulur, üç kol da aynı kapsamı kullanır. */
      let kapsamIdler: string[] | null = null;
      if (s.baslangic === "dosya_kapanisi") {
        const { data: dosyalar, error: dErr } = await admin.from("cases")
          .select("id").not("closed_at", "is", null).lt("closed_at", sinir)
          .limit(TUR_BASINA_SINIR);
        if (dErr) {
          uyarilar.push(`${tur}: kapanmış dosyalar okunamadı — ${dErr.message}`);
          continue;
        }
        kapsamIdler = ((dosyalar ?? []) as { id: string }[]).map((d) => d.id);
        // SESSİZ KIRPMA YOK: sınıra dayandıysak kalan bir sonraki koşuma kalır, söyle.
        if (kapsamIdler.length === TUR_BASINA_SINIR) {
          uyarilar.push(`${tur}: kapanmış dosya listesi ${TUR_BASINA_SINIR} sınırına dayandı; kalanı bir sonraki koşumda`);
        }
        if (kapsamIdler.length === 0) {
          sonuc.push({ tur, durum: "temiz", silinen: 0 });
          continue;
        }
      }
      /** Verilen sorguyu bu türün kapsamıyla daraltır. */
      // deno-lint-ignore no-explicit-any
      const kapsamla = (q: any) =>
        kapsamIdler ? q.in("case_id", kapsamIdler) : q.lt(hedef.zaman, sinir);

      /* ── ÖZEL KOL 0 · EMNİYET SÜPÜRGESİ — DOSYANIN TAMAMI ────────────────
         HAT H-15/1 adım 3: arabulucu "Verileri sil" düğmesine basmayı
         unutursa, kapanıştan N gün sonra dosya kendiliğinden silinir. N
         `saklama_sureleri.dosya_kapanis_sonrasi` satırındadır; NULL ise bu
         kol HİÇ ÇALIŞMAZ (karar gelmeden hiçbir şey silinmez kuralı).

         Öteki türler dosyanın BİR PARÇASINI siler; bu kol dosyanın KENDİSİNİ
         siler — depo + bütün satırlar + `cases` + anonim kayıt. Kural ortak
         modüldedir (`_shared/dosya-silme.ts`), böylece elle silme kolu
         (`dosya-verilerini-sil`) ile bu kol ASLA ayrışamaz.

         BİR DOSYA DÜŞERSE ÖTEKİLERE DEVAM EDİLİR: tek bir bozuk dosya bütün
         gecelik koşumu durduramaz. Düşen dosya `uyarilar`a yazılır. */
      if (tur === "dosya_kapanis_sonrasi") {
        const idler = kapsamIdler ?? [];
        if (idler.length === 0) { sonuc.push({ tur, durum: "temiz", silinen: 0 }); continue; }
        if (kuru) { sonuc.push({ tur, durum: "kuru", silinecek: idler.length }); continue; }

        let silinenDosya = 0;
        for (const id of idler) {
          const t = await dosyayiTemizle(admin, id, "sure_doldu");
          if (!t.ok) { uyarilar.push(`${tur}: bir dosya silinemedi — ${t.hata}`); continue; }
          silinenDosya += 1;
          for (const u of t.uyarilar) uyarilar.push(`${tur}: ${u}`);
        }
        toplamSilinen += silinenDosya;
        sonuc.push({
          tur, durum: "silindi", silinen: silinenDosya,
          ne: "dosyanın tamamı (depo + satırlar + cases)",
          ...(silinenDosya < idler.length
            ? { silinemeyen: idler.length - silinenDosya } : {}),
        });
        continue;
      }

      /* ── ÖZEL KOL 1 · OTURUM KAYDI — SATIR SİLİNMEZ, KOLON BOŞALTILIR ─────
         Ses ve döküm AYNI satırda ayrı kolonlardadır. Satırı silmek ötekini de
         götürür ve "ne zaman/neden silindi" damgasını yok eder — yani KVKK'ya
         karşı sildiğimizin kanıtını. Bkz. başlıktaki kusur (1). */
      if (tur === "oturum_kaydi_ses" || tur === "oturum_kaydi_dokum") {
        const sesMi = tur === "oturum_kaydi_ses";
        const damga = sesMi ? "ses_silindi_at" : "dokum_silindi_at";
        // Zaten silinmiş olanı tekrar işleme: damgası dolu satır atlanır.
        const { data: satirlar, error: okErr } = await kapsamla(
          admin.from("oturum_kayitlari").select("id, ses_dosya_yolu"),
        ).is(damga, null).limit(TUR_BASINA_SINIR);
        if (okErr) { uyarilar.push(`${tur}: kayıtlar okunamadı — ${okErr.message}`); continue; }
        const bekleyen = (satirlar ?? []) as { id: string; ses_dosya_yolu: string | null }[];
        if (bekleyen.length === 0) { sonuc.push({ tur, durum: "temiz", silinen: 0 }); continue; }
        if (kuru) { sonuc.push({ tur, durum: "kuru", silinecek: bekleyen.length }); continue; }

        if (sesMi) {
          /* ÖNCE DEPO, SONRA damga. Ters sırada damga yazılıp dosya kalırsa
             kayıt "silindi" der ama ses kovada durur — en kötü hâl. */
          const yollar = bekleyen
            .map((r) => String(r.ses_dosya_yolu ?? "").trim())
            .filter((y) => y.length > 0);
          if (yollar.length > 0) {
            const { error: depoErr } = await admin.storage.from(KAYIT_KOVASI).remove(yollar);
            if (depoErr) {
              uyarilar.push(`${tur}: ses dosyaları depodan silinemedi — ${depoErr.message}; satırlara DOKUNULMADI`);
              sonuc.push({ tur, durum: "atlandı", sebep: "depo temizlenemedi" });
              continue;
            }
          }
        }
        const simdi = new Date().toISOString();
        const not = `Saklama süresi doldu (${s.saklama_gun} gün · ${s.baslangic}).`;
        const yama = sesMi
          ? { ses_dosya_yolu: null, ses_silindi_at: simdi, ses_silme_notu: not }
          : { dokum_metni: null, dokum_silindi_at: simdi, dokum_silme_notu: not };
        const { error: yErr, count } = await admin.from("oturum_kayitlari")
          .update(yama, { count: "exact" }).in("id", bekleyen.map((r) => r.id));
        if (yErr) { uyarilar.push(`${tur}: silme damgası yazılamadı — ${yErr.message}`); continue; }
        toplamSilinen += count ?? 0;
        sonuc.push({
          tur, durum: "silindi", silinen: count ?? 0,
          ne: sesMi ? "ses kolonu + depodaki dosya" : "döküm kolonu",
        });
        continue;
      }

      /* ── ÖZEL KOL 2 · BELGELER — ÖNCE DEPO, SONRA SATIR ───────────────────
         Satır önce silinirse dosyayı gösteren kayıt kalmaz; dosya kovada
         süresiz öksüz kalır ve hiçbir silme kolu onu bulamaz
         (HAT H-12 · constitution m.10). Bkz. başlıktaki kusur (2). */
      if (tur === "case_documents") {
        const { data: belgeler, error: bErr } = await kapsamla(
          admin.from("case_documents").select("id, file_path"),
        ).limit(TUR_BASINA_SINIR);
        if (bErr) { uyarilar.push(`${tur}: belgeler okunamadı — ${bErr.message}`); continue; }
        const bekleyen = (belgeler ?? []) as { id: string; file_path: string | null }[];
        if (bekleyen.length === 0) { sonuc.push({ tur, durum: "temiz", silinen: 0 }); continue; }
        if (kuru) { sonuc.push({ tur, durum: "kuru", silinecek: bekleyen.length }); continue; }

        const yollar = bekleyen
          .map((b) => String(b.file_path ?? "").trim())
          .filter((y) => y.length > 0);
        if (yollar.length > 0) {
          const { error: depoErr } = await admin.storage.from(BELGE_KOVASI).remove(yollar);
          if (depoErr) {
            uyarilar.push(`${tur}: belgeler depodan silinemedi — ${depoErr.message}; satırlara DOKUNULMADI`);
            sonuc.push({ tur, durum: "atlandı", sebep: "depo temizlenemedi" });
            continue;
          }
        }
        const { error: silErr, count } = await admin.from("case_documents")
          .delete({ count: "exact" }).in("id", bekleyen.map((b) => b.id));
        if (silErr) { uyarilar.push(`${tur}: silinemedi — ${silErr.message}`); continue; }
        toplamSilinen += count ?? 0;
        sonuc.push({ tur, durum: "silindi", silinen: count ?? 0, ne: "depodaki dosya + satır" });
        continue;
      }

      /* ── GENEL KOL · düz satır silme (case_notes · odeme_kayitlari) ───────
         Bu türlerin depoda karşılığı YOKTUR; satır gidince arkada dosya kalmaz.
         Yeni bir tür eklerken önce şunu sor: bu satır bir DOSYAYI mı işaret
         ediyor? Ediyorsa buraya değil, yukarıdaki depo kollarına benzemeli. */
      if (kuru) {
        const { count } = await kapsamla(
          admin.from(hedef.tablo).select("id", { count: "exact", head: true }),
        );
        sonuc.push({ tur, durum: "kuru", silinecek: count ?? 0 });
        continue;
      }
      const { error: silErr, count } = await kapsamla(
        admin.from(hedef.tablo).delete({ count: "exact" }),
      );
      if (silErr) { uyarilar.push(`${tur}: silinemedi — ${silErr.message}`); continue; }
      toplamSilinen += count ?? 0;
      sonuc.push({ tur, durum: "silindi", silinen: count ?? 0 });
    }

    if (uyarilar.length > 0) {
      console.error("[saklama-imha] eksikler", { uyarilar });
    }
    return json({
      ok: true,
      surum: "2026-08-30-emniyet-supurgesi",
      /* ORTAK KURALIN SÜRÜMÜ. Kusur da düzeltme de `_shared/dosya-silme.ts`te
         olabiliyor; kol dosyası hiç değişmeden canlı davranış değişir. Kolun
         kendi sürümü bunu göstermez — 30.08'de tam bu yüzden dağıtımın yeni
         kuralı taşıyıp taşımadığı yanıttan okunamadı. */
      silme_surumu: SILME_SURUMU,
      kuru,
      toplam_silinen: toplamSilinen,
      sonuc,
      ...(uyarilar.length > 0 ? { uyarilar } : {}),
    });
  } catch (e) {
    const mesaj = String((e as Error)?.message ?? e);
    console.error("[saklama-imha] genel hata:", mesaj.slice(0, 200));
    return json({ error: mesaj || "Bilinmeyen sistem hatası" }, 500);
  }
});
