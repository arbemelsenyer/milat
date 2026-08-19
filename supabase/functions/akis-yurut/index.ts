// AKIŞ KOŞUCUSU (agentic belkemiği, 1. taş)
//
// Tek iş: işlenmemiş akış olaylarını okumak, public.akis_kurallari'ndaki kuralla
// eşleştirmek ve kuralın söylediğini yapmak. Kural tablosu VERİDİR — akış koda
// gömülü zincirle değil, satırla tarif edilir; yeni bir adım eklemek kod değil
// satır yazmaktır (constitution m.3: kararı insan verir, ajan uygular).
//
// BU FONKSİYON TARAFA HİÇBİR ŞEY GÖNDERMEZ. E-posta gönderen tek yer kuralın
// çağırdığı MEVCUT fonksiyondur ve o da kendi iletişim tercihi süzgecinden
// (gonderilsinMi) geçer. Burada ikinci bir süzgeç, ikinci bir alıcı mantığı
// ya da yeni bir gönderim yolu YOKTUR.
//
// İNSAN KAPISI (constitution m.3): kuralın insan_kapisi alanı true ise fonksiyon
// ÇAĞRILMAZ; panoya 'akis_onay_bekliyor' satırı düşer ve işi arabulucu yapar.
// Nöbetçi bu tipi yürütmez (YURUTULEN_TIPLER listesinde değildir).
//
// SESSİZ BAŞARISIZLIK YOK: kural hata verirse olay İŞLENMİŞ SAYILMAZ, hata
// panoya 'akis_hatasi' olarak düşer ve koşucu öteki olaylarla devam eder.
//
// GÜVENLİK KAPISI ajan-nobetci ile birebir aynıdır: x-cron-secret VEYA admin JWT.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

// Tek turda en fazla bu kadar olay işlenir; kalanı sonraki tura kalır.
const TUR_SINIRI = 50;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function metin(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/* İç çağrı: ajan-nobetci'deki icFonksiyonCagir ile aynı kalıp. Yalnız
   x-cron-secret kabul eden fonksiyonlar bu kapıdan çağrılabilir. */
async function icFonksiyonCagir(fonksiyon: string, govde: unknown): Promise<{ ok: boolean; sebep: string }> {
  if (!CRON_SECRET) return { ok: false, sebep: "CRON_SECRET tanımlı değil, iç çağrı yapılamadı" };
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fonksiyon}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": CRON_SECRET,
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify(govde),
    });
    const metinGovde = await res.text();
    if (!res.ok) {
      const kapiNotu = res.status === 401 || res.status === 403
        ? " (iç çağrı reddedildi — kapı/anahtar kontrolü)"
        : "";
      return { ok: false, sebep: `HTTP ${res.status}${kapiNotu}: ${metinGovde.slice(0, 200)}` };
    }
    return { ok: true, sebep: metinGovde.slice(0, 200) };
  } catch (e: any) {
    return { ok: false, sebep: String(e?.message ?? e).slice(0, 200) };
  }
}

/* KOŞUL DEĞERLENDİRME — bu turda YALNIZ {"en_az_taraf": N} desteklenir.
   TANIMADIĞIN ANAHTAR = KURALI ATLA. Bilinmeyen koşul "koşul yok" sayılmaz;
   sessizce geçilirse kural, sağlanmayan bir şartla çalışmış olur. */
async function kosulSaglandiMi(
  admin: any, kosul: unknown, caseId: string,
): Promise<{ saglandi: boolean; sebep: string }> {
  if (!kosul || typeof kosul !== "object" || Array.isArray(kosul)) {
    return { saglandi: true, sebep: "koşul yok" };
  }
  const anahtarlar = Object.keys(kosul as Record<string, unknown>);
  if (anahtarlar.length === 0) return { saglandi: true, sebep: "koşul yok" };

  const bilinmeyen = anahtarlar.filter((a) => a !== "en_az_taraf");
  if (bilinmeyen.length > 0) {
    return { saglandi: false, sebep: `tanınmayan koşul anahtarı: ${bilinmeyen.join(", ")}` };
  }

  const gereken = Number((kosul as any).en_az_taraf);
  if (!Number.isFinite(gereken)) {
    return { saglandi: false, sebep: "en_az_taraf sayı değil" };
  }
  const { count, error } = await admin.from("case_parties")
    .select("id", { count: "exact", head: true }).eq("case_id", caseId);
  if (error) return { saglandi: false, sebep: `taraf sayısı okunamadı: ${error.message}` };
  const mevcut = count ?? 0;
  if (mevcut < gereken) {
    return { saglandi: false, sebep: `taraf sayısı ${mevcut} < ${gereken}` };
  }
  return { saglandi: true, sebep: `taraf sayısı ${mevcut} ≥ ${gereken}` };
}

/* Pano yazımı — mükerrer yazmaz (nöbetçideki "önce bak, varsa yazma" kalıbı):
   aynı dosya + tip + hedef taraf için 'bekliyor' satır varsa yeniden yazılmaz. */
async function panoyaYaz(
  admin: any, caseId: string, gorevTipi: string, hedefPartyId: string | null, gerekce: string,
): Promise<{ yazildi: boolean; sebep: string }> {
  let sorgu = admin.from("ajan_gorevleri")
    .select("id").eq("case_id", caseId).eq("gorev_tipi", gorevTipi).eq("durum", "bekliyor");
  sorgu = hedefPartyId ? sorgu.eq("hedef_party_id", hedefPartyId) : sorgu.is("hedef_party_id", null);
  const { data: mevcut } = await sorgu.limit(1);
  if (mevcut && mevcut.length > 0) return { yazildi: false, sebep: "bekleyen aynı satır zaten var" };

  const { error } = await admin.from("ajan_gorevleri").insert({
    case_id: caseId,
    gorev_tipi: gorevTipi,
    durum: "bekliyor",
    hedef_party_id: hedefPartyId,
    gerekce,
  });
  if (error) return { yazildi: false, sebep: `pano satırı yazılamadı: ${error.message}` };
  return { yazildi: true, sebep: "yazıldı" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // pg_cron / nöbetçi çağrısı için x-cron-secret; manuel çağrıda admin JWT şart.
    const authHeader = req.headers.get("Authorization");
    const cronHeader = req.headers.get("x-cron-secret");
    const isCron = !!CRON_SECRET && cronHeader === CRON_SECRET;
    if (!isCron) {
      if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);
      const token = authHeader.replace("Bearer ", "");
      const admin0 = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data: userRes } = await admin0.auth.getUser(token);
      if (!userRes?.user) return json({ error: "Oturum doğrulanamadı" }, 401);
      const { data: isAdmin } = await admin0.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" });
      if (!isAdmin) return json({ error: "Admin gereklidir" }, 403);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: olaylar, error: oErr } = await admin.from("akis_olaylari")
      .select("id, case_id, party_id, olay_kodu, veri, islendi, created_at")
      .eq("islendi", false)
      .order("created_at", { ascending: true })
      .limit(TUR_SINIRI);
    if (oErr) return json({ error: oErr.message }, 500);

    const ozet = {
      okunan_olay: (olaylar ?? []).length,
      islenen_olay: 0,
      calistirilan_kural: 0,
      onaya_dusen: 0,
      atlanan_kural: 0,
      hatali_kural: 0,
      notlar: [] as string[],
    };
    if (!olaylar || olaylar.length === 0) return json({ ok: true, ...ozet });

    // Kurallar bir kez okunur; olay kodlarına göre eşleştirilir.
    const kodlar = Array.from(new Set((olaylar as any[]).map((o) => String(o.olay_kodu))));
    const { data: kurallar, error: kErr } = await admin.from("akis_kurallari")
      .select("id, kod, olay_kodu, kosul, sonraki_adim, sahip, insan_kapisi, gerekce, sira, etkin")
      .in("olay_kodu", kodlar).eq("etkin", true)
      .order("sira", { ascending: true });
    if (kErr) return json({ error: kErr.message }, 500);

    for (const olay of (olaylar as any[])) {
      const caseId = String(olay.case_id);
      const partyId = olay.party_id ? String(olay.party_id) : null;
      const eslesen = ((kurallar ?? []) as any[])
        .filter((k) => String(k.olay_kodu) === String(olay.olay_kodu));

      if (eslesen.length === 0) {
        // Kuralı olmayan olay da işlenmiş sayılır: tekrar tekrar okunmasın.
        await admin.from("akis_olaylari")
          .update({ islendi: true, islenme_zamani: new Date().toISOString() })
          .eq("id", olay.id);
        ozet.islenen_olay++;
        continue;
      }

      let olayHatali = false;

      for (const kural of eslesen) {
        const kuralKodu = metin(kural.kod) || String(kural.id);

        const { saglandi, sebep: kosulSebep } = await kosulSaglandiMi(admin, kural.kosul, caseId);
        if (!saglandi) {
          ozet.atlanan_kural++;
          ozet.notlar.push(`${kuralKodu}: atlandı — ${kosulSebep}`);
          continue;
        }

        if (kural.insan_kapisi === true) {
          /* İNSAN KAPISI: fonksiyon ÇAĞRILMAZ. İş panoya düşer, kararı ve
             uygulamayı arabulucu yapar. */
          const r = await panoyaYaz(
            admin, caseId, "akis_onay_bekliyor", partyId,
            metin(kural.gerekce) || `${kuralKodu} kuralı arabulucu onayı bekliyor`,
          );
          if (r.yazildi) ozet.onaya_dusen++;
          else ozet.notlar.push(`${kuralKodu}: ${r.sebep}`);
          continue;
        }

        const fonksiyon = metin(kural.sonraki_adim);
        if (!fonksiyon || fonksiyon === "yok") {
          ozet.atlanan_kural++;
          ozet.notlar.push(`${kuralKodu}: sonraki adım tanımsız`);
          continue;
        }

        /* Aynı olay için aynı kural İKİNCİ KEZ çalıştırılmaz. İz, panoda
           'akis_kosuldu' satırı olarak durur ve etiketiyle aranır. */
        const etiket = `[akis:${olay.id}:${kuralKodu}]`;
        const { data: iz } = await admin.from("ajan_gorevleri")
          .select("id, gerekce").eq("case_id", caseId).eq("gorev_tipi", "akis_kosuldu").limit(200);
        const kosulmus = ((iz ?? []) as any[]).some((r) => String(r?.gerekce ?? "").startsWith(etiket));
        if (kosulmus) {
          ozet.atlanan_kural++;
          ozet.notlar.push(`${kuralKodu}: bu olay için zaten koşuldu`);
          continue;
        }

        const govde: Record<string, unknown> = { case_id: caseId };
        if (partyId) govde.party_id = partyId;
        if (olay.veri && typeof olay.veri === "object") {
          // Olayın taşıdığı kimlikler (session_id, document_id, foy_id …) çağrıya geçer.
          for (const [k, v] of Object.entries(olay.veri as Record<string, unknown>)) {
            if (v !== null && v !== undefined) govde[k] = v;
          }
        }

        const r = await icFonksiyonCagir(fonksiyon, govde);
        if (r.ok) {
          ozet.calistirilan_kural++;
          await admin.from("ajan_gorevleri").insert({
            case_id: caseId, gorev_tipi: "akis_kosuldu", durum: "yapildi",
            hedef_party_id: partyId,
            gerekce: `${etiket} ${fonksiyon} çalıştırıldı`,
          });
        } else {
          /* SESSİZ BAŞARISIZLIK YOK: olay işlenmiş sayılmaz, hata panoya düşer,
             koşucu öteki olaylarla devam eder. */
          olayHatali = true;
          ozet.hatali_kural++;
          ozet.notlar.push(`${kuralKodu}: hata — ${r.sebep}`);
          await panoyaYaz(
            admin, caseId, "akis_hatasi", partyId,
            `${etiket} ${fonksiyon} çalıştırılamadı: ${r.sebep}`.slice(0, 500),
          );
        }
      }

      if (!olayHatali) {
        const { error: uErr } = await admin.from("akis_olaylari")
          .update({ islendi: true, islenme_zamani: new Date().toISOString() })
          .eq("id", olay.id);
        if (uErr) ozet.notlar.push(`olay ${olay.id}: işlendi yazılamadı — ${uErr.message}`);
        else ozet.islenen_olay++;
      }
    }

    return json({ ok: true, ...ozet, notlar: ozet.notlar.slice(0, 50) });
  } catch (e: any) {
    const msg = String(e?.message ?? "Bilinmeyen sistem hatası");
    console.error("[akis-yurut] Genel hata:", msg);
    return json({ error: msg }, 500);
  }
});
