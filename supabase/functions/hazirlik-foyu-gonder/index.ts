// TARAFA OTURUM HAZIRLIK FÖYÜNÜ GÖNDER (İBA 3.1 — 2. tur)
//
// Bu fonksiyon FÖY ÜRETMEZ. Üretim `hazirlik-foyu` fonksiyonundadır ve ona
// dokunulmaz. Burada yapılan tek iş: ARABULUCUNUN ONAYLADIĞI metni, o föyün
// sahibi olan TEK tarafa e-postayla göndermek ve satırı 'gonderildi' işaretlemek.
//
// KÖR VERİ (constitution m.1): alıcı YALNIZ föyün party_id'sine ait tarafın
// e-posta adresidir. Karşı taraf, arabulucu ya da başka hiç kimse kopya almaz;
// cc/bcc yoktur. Gönderilen metin föyün kendi `bolumler` alanıdır — burada
// hiçbir cümle üretilmez, model çağrılmaz (constitution m.5: kayıt katmanı
// deterministiktir).
//
// İNSAN KAPISI (constitution m.3): föy 'onaylandi' değilse gönderilmez.
// Kendiliğinden gönderim yoktur; düğmeye arabulucu basar. Zaten 'gonderildi'
// olan föy ikinci kez gönderilmez (çift gönderim yasak).
//
// İLETİŞİM TERCİHİ (İBA 1.5): gönderim, diğer e-posta noktalarıyla AYNI
// süzgeçten geçer. Tür "belge_talebi" — önemli listesindedir. Süzgeç "gönderme"
// derse durum DEĞİŞMEZ; sebep dönüş gövdesine yazılır ve arabulucu görür.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

/* ── İLETİŞİM TERCİHİ SÜZGECİ (İBA 1.5, 1. tur) ───────────────────────────────
   Taraf kendi ekranından bildirim sıklığını ve sessiz saatlerini belirler
   (public.iletisim_tercihleri, UNIQUE party_id). Bu süzgeç YALNIZ "gönderilsin mi"
   kararını verir — e-posta metinlerine, konularına ve alıcılarına DOKUNMAZ.
     · her_adim (varsayılan) → hepsi gider.
     · onemli                → yalnız ÖNEMLİ türler gider.
     · haftalik_ozet         → yalnız ZAMANA BAĞLI türler gider (davet / değişiklik).
     · sessiz saat           → o aralıkta gönderilmez; ZAMANA BAĞLI türler istisnadır.
   FAIL-OPEN (kritik): party_id bilinmiyorsa, kayıt yoksa ya da sorgu hata verirse
   E-POSTA GÖNDERİLİR. Bir tercih sorgusu arızası oturum davetini susturamaz;
   tercih kaydı olmayan tarafta mevcut davranış birebir korunur.
   ERTELEME YOK (1. tur kararı): sessiz saate denk gelen bildirim kuyruğa alınmaz,
   atlanır ve sebebi dönüş gövdesine/ajan kaydına yazılır. Kuyruk 2. turda. */
type BildirimTuru =
  | "oturum_daveti" | "oturum_degisikligi" | "teklif" | "belge_talebi"
  | "surec_sonu" | "hatirlatma" | "bilgilendirme";
// Zamana bağlı: geciktirilemez. Sessiz saatte ve "haftalık özet" seçiliyken de gider.
const ZAMANA_BAGLI_TURLER: string[] = ["oturum_daveti", "oturum_degisikligi"];
const ONEMLI_TURLER: string[] = [
  ...ZAMANA_BAGLI_TURLER, "teklif", "belge_talebi", "surec_sonu",
];
const TERCIH_SAAT_DILIMI = "Europe/Istanbul";

/* Sessiz aralık kontrolü. Edge fonksiyon UTC'de koşar; karşılaştırma TÜRKİYE
   saatiyle yapılır (17.08 föy dersi: elle saat farkı eklenmez, Intl'e bırakılır).
   Gece devreden aralık (22:00–08:00) da doğru hesaplanır. */
function sessizSaatteMi(baslangic: unknown, bitis: unknown): boolean {
  const b = String(baslangic ?? "").slice(0, 5);
  const s = String(bitis ?? "").slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(b) || !/^\d{2}:\d{2}$/.test(s) || b === s) return false;
  const simdi = new Date().toLocaleTimeString("tr-TR", {
    timeZone: TERCIH_SAAT_DILIMI, hour: "2-digit", minute: "2-digit", hour12: false,
  }).slice(0, 5);
  return b < s ? (simdi >= b && simdi < s) : (simdi >= b || simdi < s);
}

async function gonderilsinMi(
  admin: any, partyId: string | null | undefined, tur: BildirimTuru,
): Promise<{ gonder: boolean; sebep: string }> {
  if (!partyId) return { gonder: true, sebep: "taraf kaydı yok → varsayılan gönderim" };
  try {
    const { data, error } = await admin.from("iletisim_tercihleri")
      .select("siklik, sessiz_baslangic, sessiz_bitis")
      .eq("party_id", partyId).maybeSingle();
    if (error || !data) return { gonder: true, sebep: "tercih kaydı yok → her_adim" };
    const siklik = String((data as any).siklik ?? "her_adim");
    const zamanaBagli = ZAMANA_BAGLI_TURLER.includes(tur);
    if (siklik === "onemli" && !ONEMLI_TURLER.includes(tur)) {
      return { gonder: false, sebep: `tercih 'yalnız önemli adımlar' — '${tur}' önemli listede değil` };
    }
    if (siklik === "haftalik_ozet" && !zamanaBagli) {
      return { gonder: false, sebep: `tercih 'haftalık özet' — '${tur}' zamana bağlı değil` };
    }
    if (!zamanaBagli && sessizSaatteMi((data as any).sessiz_baslangic, (data as any).sessiz_bitis)) {
      return { gonder: false, sebep: "sessiz saat aralığı — 1. turda erteleme yok, atlandı" };
    }
    return { gonder: true, sebep: "tercihe uygun" };
  } catch (e: any) {
    return { gonder: true, sebep: `tercih okunamadı (${String(e?.message ?? e).slice(0, 80)}) → gönderildi` };
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOY_SAAT_DILIMI = "Europe/Istanbul";
const GONDEREN = "MİLAT Arabuluculuk <info@milatmediation.com>";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function temiz(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// Föy metni serbest metin taşıyabilir; HTML'e kaçışsız girmez.
function kacir(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Oturum tarih/saati DAİMA Europe/Istanbul ile biçimlenir (elle saat farkı yok).
function tarihSaat(iso: unknown): { tarih: string; saat: string } {
  const ham = temiz(iso);
  if (!ham) return { tarih: "", saat: "" };
  const d = new Date(ham);
  if (isNaN(d.getTime())) return { tarih: "", saat: "" };
  return {
    tarih: d.toLocaleDateString("tr-TR", {
      timeZone: FOY_SAAT_DILIMI, weekday: "long", day: "2-digit", month: "long", year: "numeric",
    }),
    saat: d.toLocaleTimeString("tr-TR", {
      timeZone: FOY_SAAT_DILIMI, hour: "2-digit", minute: "2-digit", hour12: false,
    }),
  };
}

type FoyBolum = { baslik?: unknown; maddeler?: unknown };

/* Föyün kendi metni. Burada hiçbir cümle üretilmez; onaylanan `bolumler` ne
   ise ekranda göründüğü sırayla o yazılır. */
function bolumlerHtml(bolumler: unknown): string {
  const liste = Array.isArray(bolumler) ? (bolumler as FoyBolum[]) : [];
  const parcalar: string[] = [];
  for (const b of liste) {
    const baslik = temiz((b as any)?.baslik);
    const maddeler = Array.isArray((b as any)?.maddeler)
      ? ((b as any).maddeler as unknown[]).map(temiz).filter(Boolean) : [];
    if (!baslik && maddeler.length === 0) continue;
    parcalar.push(
      (baslik ? `<h3 class="bolum">${kacir(baslik)}</h3>` : "") +
      (maddeler.length
        ? `<ul>${maddeler.map((m) => `<li>${kacir(m)}</li>`).join("")}</ul>`
        : ""),
    );
  }
  return parcalar.join("");
}

function buildHtml(opts: {
  displayName: string; tarih: string; saat: string; bolumler: unknown;
}): string {
  const { displayName, tarih, saat, bolumler } = opts;
  const kutu = tarih
    ? `<div class="box"><div class="date">${kacir(tarih)}</div>${saat ? `<div class="time">${kacir(saat)}</div>` : ""}</div>`
    : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;line-height:1.6;color:#222;background:#f6f7f9;margin:0;padding:24px}
    .container{max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb}
    .header{background:#2c7a7b;color:#fff;padding:24px;text-align:center}
    .content{padding:24px}
    .box{background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:16px;margin:16px 0;text-align:center}
    .date{font-size:20px;font-weight:bold;color:#0f766e}
    .time{font-size:16px;color:#0d9488;margin-top:4px}
    .bolum{font-size:15px;color:#0f766e;margin:20px 0 6px}
    ul{margin:0;padding-left:20px}
    li{margin:4px 0}
    .footer{padding:16px 24px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;text-align:center}
  </style></head><body>
    <div class="container">
      <div class="header"><h2 style="margin:0">Oturum Hazırlığınız</h2><div style="opacity:.9;margin-top:4px">MediPact AI Arabuluculuk</div></div>
      <div class="content">
        <p>Sayın ${kacir(displayName)},</p>
        <p>Arabulucunuz, katılacağınız oturum için aşağıdaki hazırlık föyünü onayladı.</p>
        ${kutu}
        ${bolumlerHtml(bolumler)}
        <p style="margin-top:20px">Bu föy hazırlık amaçlıdır; hukuki tavsiye değildir. Aynı metni dosya
        ekranınızdaki "Oturum hazırlığım" sekmesinden de görebilirsiniz.</p>
      </div>
      <div class="footer">Saygılarımızla,<br><strong>MediPact AI Ekibi</strong></div>
    </div>
  </body></html>`;
}

function friendlyResendError(status: number, body: string): string {
  if (status === 401 || status === 403) return "E-posta servisi yetki hatası. Lütfen sistem yöneticisi ile iletişime geçin.";
  if (status === 422) return "Geçersiz e-posta adresi veya içerik. Lütfen alıcı bilgilerini kontrol edin.";
  if (status === 429) return "E-posta gönderim limiti aşıldı. Birkaç dakika sonra tekrar deneyin.";
  if (status >= 500) return "E-posta servisi geçici olarak ulaşılamıyor. Lütfen tekrar deneyin.";
  return `E-posta gönderilemedi (kod ${status}). Ayrıntı: ${body.slice(0, 200)}`;
}

// Anahtar hiçbir log satırına ve hiçbir hata mesajına yazılmaz.
async function sendResend(opts: { from: string; to: string[]; subject: string; html: string }) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("E-posta servisi yapılandırılmamış (RESEND_API_KEY eksik).");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("[hazirlik-foyu-gonder] Resend hatası", { status: res.status, body: text.slice(0, 300) });
    throw new Error(friendlyResendError(res.status, text));
  }
  try { return JSON.parse(text); } catch { return {}; }
}

/* ── GÖNDERİM KAYDI (public.foy_gonderim_kayitlari) ───────────────────────────
   Her gönderim DENEMESİ bir satır bırakır: kabul edilen, hata veren ve süzgecin
   durdurduğu denemeler dahil. Desen kaynağı meeting_invite_logs.
   DİL UYARISI: 'kabul_edildi' = "e-posta servisi isteği KABUL ETTİ". Bu TESLİM
   DEĞİLDİR; gerçek teslim/bounce takibi Resend webhook'u ister ve 2. turdadır.
   Hiçbir alana "teslim edildi" yazılmaz. Anahtar hiçbir alana yazılmaz.
   Kayıt yazılamazsa gönderim BAŞARISIZ SAYILMAZ — hata yutulmaz, dönüş
   gövdesine "kayıt yazılamadı" notu düşer. */
type KayitDurumu = "kabul_edildi" | "hata" | "suzgec_engelledi";

// attempt = o föy için bugüne kadarki kayıt sayısı + 1.
async function denemeSayisi(admin: any, foyId: string): Promise<number> {
  try {
    const { count, error } = await admin.from("foy_gonderim_kayitlari")
      .select("id", { count: "exact", head: true }).eq("foy_id", foyId);
    if (error) return 1;
    return (count ?? 0) + 1;
  } catch { return 1; }
}

async function kayitYaz(admin: any, satir: {
  foy_id: string; case_id: string; party_id: string; recipient_email: string;
  status: KayitDurumu; resend_message_id?: string | null; error_message?: string | null;
  attempt: number;
}): Promise<string | null> {
  try {
    const { error } = await admin.from("foy_gonderim_kayitlari").insert({
      foy_id: satir.foy_id,
      case_id: satir.case_id,
      party_id: satir.party_id,
      recipient_email: satir.recipient_email,
      status: satir.status,
      resend_message_id: satir.resend_message_id ?? null,
      error_message: satir.error_message ?? null,
      attempt: satir.attempt,
    });
    if (error) {
      console.error("[hazirlik-foyu-gonder] gönderim kaydı yazılamadı", { foy_id: satir.foy_id, error: error.message });
      return `gönderim kaydı yazılamadı: ${error.message}`;
    }
    return null;
  } catch (e: any) {
    const msg = String(e?.message ?? e).slice(0, 200);
    console.error("[hazirlik-foyu-gonder] gönderim kaydı yazılamadı", { foy_id: satir.foy_id, error: msg });
    return `gönderim kaydı yazılamadı: ${msg}`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Oturum doğrulanamadı" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const foy_id = temiz((body as any)?.foy_id);
    if (!foy_id) return json({ error: "foy_id gerekli" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: foy, error: fErr } = await admin.from("oturum_hazirlik_foyleri")
      .select("id, case_id, session_id, party_id, bolumler, durum, gonderim_zamani")
      .eq("id", foy_id).maybeSingle();
    if (fErr) return json({ error: fErr.message }, 500);
    if (!foy) return json({ error: "Föy bulunamadı" }, 404);

    /* YETKİ: yalnız DOSYANIN GÖREVLİ ARABULUCUSU (ve yönetici) gönderebilir.
       Dosya sahibi (cases.user_id) bilerek yetkili sayılmadı — başvuran çoğu
       dosyada taraftır; gönderim kararı arabulucunundur. */
    const { data: caseRow, error: cErr } = await admin.from("cases")
      .select("id, assigned_mediator_id").eq("id", (foy as any).case_id).maybeSingle();
    if (cErr) return json({ error: cErr.message }, 500);
    if (!caseRow) return json({ error: "Dosya bulunamadı" }, 404);

    const { data: roleRow } = await admin.from("user_roles")
      .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    const yetkili = String((caseRow as any).assigned_mediator_id ?? "") === userId || !!roleRow;
    if (!yetkili) return json({ error: "Bu dosya için yetkiniz yok" }, 403);

    const durum = String((foy as any).durum ?? "");
    if (durum === "gonderildi") {
      return json({
        gonderildi: false, zaten: true,
        gonderim_zamani: (foy as any).gonderim_zamani ?? null,
        sebep: "Bu föy zaten gönderildi; ikinci kez gönderilmez.",
      });
    }
    if (durum !== "onaylandi") {
      return json({ error: "Föy önce onaylanmalı — onaylanmamış föy gönderilmez." }, 400);
    }

    // ALICI: yalnız bu föyün tarafı. Başka alıcı, cc ve bcc yoktur.
    const { data: taraf, error: pErr } = await admin.from("case_parties")
      .select("id, case_id, email, first_name, last_name, company_name")
      .eq("id", (foy as any).party_id).maybeSingle();
    if (pErr) return json({ error: pErr.message }, 500);
    if (!taraf || String((taraf as any).case_id) !== String((foy as any).case_id)) {
      return json({ error: "Taraf bu dosyaya ait değil" }, 400);
    }
    const eposta = temiz((taraf as any).email);
    if (!eposta) {
      return json({ error: "Bu tarafın e-posta adresi kayıtlı değil; föy gönderilemedi." }, 400);
    }

    const { data: oturum } = await admin.from("case_sessions")
      .select("id, scheduled_at").eq("id", (foy as any).session_id).maybeSingle();
    const { tarih, saat } = tarihSaat((oturum as any)?.scheduled_at);

    // Kayıt ortak alanları — üç sonuç yolunda da aynı satır iskeleti kullanılır.
    const kayitTemeli = {
      foy_id: String((foy as any).id),
      case_id: String((foy as any).case_id),
      party_id: String((foy as any).party_id),
      recipient_email: eposta,
      attempt: await denemeSayisi(admin, String((foy as any).id)),
    };

    // İLETİŞİM TERCİHİ: gönderim de diğer noktalarla aynı kapıdan geçer.
    const izin = await gonderilsinMi(admin, (foy as any).party_id, "belge_talebi");
    if (!izin.gonder) {
      // Durum DEĞİŞMEZ: föy 'onaylandi' kalır, arabulucu sonra yeniden deneyebilir.
      const kayitNotu = await kayitYaz(admin, {
        ...kayitTemeli, status: "suzgec_engelledi", error_message: izin.sebep,
      });
      return json({
        gonderildi: false, sebep: `iletişim tercihi: ${izin.sebep}`,
        ...(kayitNotu ? { kayit_yazilamadi: kayitNotu } : {}),
      });
    }

    const displayName = temiz((taraf as any).company_name)
      || `${temiz((taraf as any).first_name)} ${temiz((taraf as any).last_name)}`.trim()
      || "Değerli Taraf";

    let resendId: string | null = null;
    try {
      const resp = await sendResend({
        from: GONDEREN,
        to: [eposta],
        subject: tarih ? `Oturum Hazırlığınız - ${tarih}` : "Oturum Hazırlığınız",
        html: buildHtml({ displayName, tarih, saat, bolumler: (foy as any).bolumler }),
      });
      resendId = (resp && (resp as any).id) ? String((resp as any).id) : null;
    } catch (e: any) {
      // Hata kaydı yazılır, sonra hata aynen yukarı verilir (davranış değişmedi).
      const sade = String(e?.message ?? "Bilinmeyen gönderim hatası");
      const kayitNotu = await kayitYaz(admin, {
        ...kayitTemeli, status: "hata", error_message: sade.slice(0, 500),
      });
      return json({
        error: sade,
        ...(kayitNotu ? { kayit_yazilamadi: kayitNotu } : {}),
      }, 502);
    }

    /* İstek kabul edildi. 'kabul_edildi' TESLİM DEĞİLDİR — servis isteği aldı. */
    const kayitNotu = await kayitYaz(admin, {
      ...kayitTemeli, status: "kabul_edildi", resend_message_id: resendId,
    });

    const gonderimZamani = new Date().toISOString();
    const { error: uErr } = await admin.from("oturum_hazirlik_foyleri")
      .update({ durum: "gonderildi", gonderim_zamani: gonderimZamani })
      .eq("id", foy_id);
    if (uErr) {
      // E-posta gitti ama satır işaretlenemedi: sessizce yutulmaz, arabulucu görür.
      console.error("[hazirlik-foyu-gonder] durum yazılamadı", { foy_id, error: uErr.message });
      return json({
        gonderildi: true, durum_yazilamadi: true, gonderim_zamani: gonderimZamani,
        sebep: `E-posta gönderildi ancak föy durumu güncellenemedi: ${uErr.message}`,
        ...(kayitNotu ? { kayit_yazilamadi: kayitNotu } : {}),
      });
    }

    return json({
      gonderildi: true, gonderim_zamani: gonderimZamani, sebep: izin.sebep,
      resend_message_id: resendId,
      ...(kayitNotu ? { kayit_yazilamadi: kayitNotu } : {}),
    });
  } catch (e: any) {
    const msg = e?.message ?? "Bilinmeyen sistem hatası";
    console.error("[hazirlik-foyu-gonder] Genel hata:", msg);
    return json({ error: String(msg) }, 500);
  }
});
