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
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Sure = {
  veri_turu: string;
  saklama_gun: number | null;
  baslangic: string;
};

/** Veri türü → hangi tablo, hangi zaman kolonu. Tablo adları KODDA sabittir;
 *  parametre tablosundan yalnız SÜRE okunur. Böylece bir yazım hatası ya da
 *  kötü niyetli satır rastgele bir tabloyu sildiremez. */
const TUR_HARITASI: Record<string, { tablo: string; zaman: string } | null> = {
  // Ham ses zaten metne çevrilir çevrilmez siliniyor (H-14 şart 1); burada
  // yalnız o silmeden KAÇAN dosyaların satırı temizlenir.
  oturum_kaydi_ses: { tablo: "oturum_kayitlari", zaman: "created_at" },
  oturum_kaydi_dokum: { tablo: "oturum_kayitlari", zaman: "created_at" },
  case_documents: { tablo: "case_documents", zaman: "created_at" },
  case_notes: { tablo: "case_notes", zaman: "created_at" },
  // Dosyanın kendisinin silinmesi `dosya-verilerini-sil` kolunun işidir
  // (kapanış paketi + anonim kayıt + depo temizliği zinciriyle). Bu kol
  // oraya DOKUNMAZ; tür tanımlı ama eşlemesi bilerek yoktur.
  dosya_kapanis_sonrasi: null,
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
      .from("saklama_sureleri").select("veri_turu, saklama_gun, baslangic");
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
      // SÜRE GİRİLMEMİŞSE DOKUNMA. Bu, tablonun değer olmadan kurulmasının
      // güvenlik karşılığıdır: karar gelmeden hiçbir şey silinmez.
      if (s.saklama_gun == null) {
        sonuc.push({ tur, durum: "atlandı", sebep: "süre girilmemiş" });
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

      if (s.baslangic === "dosya_kapanisi") {
        /* Sayaç dosyanın KAPANIŞINDAN başlar: kapanmamış dosyaya dokunulmaz.
           Önce süresi dolmuş kapalı dosyalar bulunur, sonra onların satırları. */
        const { data: dosyalar, error: dErr } = await admin.from("cases")
          .select("id").not("closed_at", "is", null).lt("closed_at", sinir).limit(500);
        if (dErr) {
          uyarilar.push(`${tur}: kapanmış dosyalar okunamadı — ${dErr.message}`);
          continue;
        }
        const idler = ((dosyalar ?? []) as { id: string }[]).map((d) => d.id);
        if (idler.length === 0) {
          sonuc.push({ tur, durum: "temiz", silinen: 0 });
          continue;
        }
        if (kuru) {
          const { count } = await admin.from(hedef.tablo)
            .select("id", { count: "exact", head: true }).in("case_id", idler);
          sonuc.push({ tur, durum: "kuru", silinecek: count ?? 0 });
          continue;
        }
        const { error: silErr, count } = await admin.from(hedef.tablo)
          .delete({ count: "exact" }).in("case_id", idler);
        if (silErr) { uyarilar.push(`${tur}: silinemedi — ${silErr.message}`); continue; }
        toplamSilinen += count ?? 0;
        sonuc.push({ tur, durum: "silindi", silinen: count ?? 0 });
        continue;
      }

      // baslangic === 'olusturma'
      if (kuru) {
        const { count } = await admin.from(hedef.tablo)
          .select("id", { count: "exact", head: true }).lt(hedef.zaman, sinir);
        sonuc.push({ tur, durum: "kuru", silinecek: count ?? 0 });
        continue;
      }
      const { error: silErr, count } = await admin.from(hedef.tablo)
        .delete({ count: "exact" }).lt(hedef.zaman, sinir);
      if (silErr) { uyarilar.push(`${tur}: silinemedi — ${silErr.message}`); continue; }
      toplamSilinen += count ?? 0;
      sonuc.push({ tur, durum: "silindi", silinen: count ?? 0 });
    }

    if (uyarilar.length > 0) {
      console.error("[saklama-imha] eksikler", { uyarilar });
    }
    return json({
      ok: true,
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
