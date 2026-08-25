// BİLİRKİŞİ DAVETİ — üründeki taraf daveti deseninin aynısı
//
// YENİ GİRİŞ SİSTEMİ KURULMADI: davet, taraf davetiyle aynı adrese (ürünün kendi
// giriş ekranı) götürür; bilirkişi kendi hesabıyla girer. Kabul edildiğinde
// experts.user_id, bilirkisi-ekranim'ın 'eslestir' adımında DOĞRULANMIŞ oturum
// e-postasıyla doldurulur (o kapının kaydı orada yazılıdır).
//
// KÖR VERİ: e-postada taraf adı, tutar, belge ve analiz GEÇMEZ — yalnız dosya
// numarası, alan ve bağlantı. Kabulden önce bilirkişi zaten yalnız beş alanı
// görür (komut §5).
//
// İNSAN KAPISI: daveti yalnız arabulucu (ya da dosya sahibi/yönetici) gönderir.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function metin(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/* Taraf davetindeki ile AYNI izinli origin listesi (send-party-invite/index.ts).
   Açık yönlendirme ile kimlik avı yolunu kapatır. */
function temelAdres(app_url: unknown): string {
  const izinli = (Deno.env.get("APP_ALLOWED_ORIGINS")
    ?? "https://medipact-ai.lovable.app,https://id-preview--5ffedb1b-4087-4fe1-a1ef-873c9754f71d.lovable.app")
    .split(",").map((s) => s.trim()).filter(Boolean);
  let temel = izinli[0];
  if (typeof app_url === "string" && app_url) {
    try {
      const u = new URL(app_url);
      const origin = `${u.protocol}//${u.host}`;
      if (izinli.includes(origin)) temel = origin;
    } catch { /* geçersiz adres → varsayılan */ }
  }
  return temel;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);
    const { data: userRes } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const uid = userRes?.user?.id;
    if (!uid) return json({ error: "Oturum doğrulanamadı" }, 401);

    const govde = await req.json().catch(() => ({}));
    const case_id = metin((govde as any)?.case_id);
    const expert_id = metin((govde as any)?.expert_id);
    const alan = metin((govde as any)?.alan);
    if (!case_id || !expert_id) return json({ error: "case_id ve expert_id gerekli" }, 400);

    const { data: dosya } = await admin.from("cases")
      .select("id, application_no, user_id, assigned_mediator_id").eq("id", case_id).maybeSingle();
    if (!dosya) return json({ error: "Dosya bulunamadı" }, 404);

    const { data: yonetici } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    const yetkili = !!yonetici
      || (dosya as any).assigned_mediator_id === uid
      || (dosya as any).user_id === uid;
    if (!yetkili) return json({ error: "Daveti yalnız arabulucu gönderir" }, 403);

    // Davet ancak ATANMIŞ bilirkişiye gider (atama insan kapısıdır).
    const { data: oneri } = await admin.from("bilirkisi_onerileri")
      .select("id, alan, durum").eq("case_id", case_id).eq("expert_id", expert_id)
      .in("durum", ["atandi", "kabul"]).limit(1).maybeSingle();
    if (!oneri) return json({ error: "Bu bilirkişi bu dosyada atanmış değil" }, 409);

    const { data: uzman } = await admin.from("experts")
      .select("id, full_name, email, user_id").eq("id", expert_id).maybeSingle();
    if (!uzman) return json({ error: "Bilirkişi kaydı bulunamadı" }, 404);

    const temel = temelAdres((govde as any)?.app_url);
    const davetAdresi = `${temel}/bilirkisi`;
    const dosyaNo = metin((dosya as any).application_no) || "";
    const alanMetni = alan || metin((oneri as any).alan) || "";

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const eposta = metin((uzman as any).email);
    let epostaDurumu = "gönderilmedi (adres yok)";

    if (resendKey && eposta) {
      const yanit = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "MİLAT Arabuluculuk <info@milatmediation.com>",
          to: [eposta],
          subject: `Bilirkişi Görevlendirmesi - ${dosyaNo}`,
          html: `<p>Sayın ${metin((uzman as any).full_name) || "Bilirkişi"},</p>
                 <p>${dosyaNo} numaralı arabuluculuk dosyasında${alanMetni ? ` "${alanMetni}" alanında` : ""} bilirkişi olarak görevlendirildiniz.</p>
                 <p>Aşağıdaki bağlantıdan kendi hesabınızla giriş yaparak görevi kabul veya reddedebilirsiniz.</p>
                 <p><a href="${davetAdresi}">${davetAdresi}</a></p>
                 <p>Kabul etmeden hiçbir belge açılmaz. Kabulden sonra yalnız size açılan belgeleri görürsünüz;
                    tarafların diğer verilerine erişiminiz olmaz.</p>
                 <p>MediPact AI</p>`,
        }),
      });
      epostaDurumu = yanit.ok
        ? "gönderildi"
        : `gönderilemedi (${yanit.status}: ${(await yanit.text()).slice(0, 200)})`;
    } else if (!resendKey) {
      epostaDurumu = "gönderilmedi (e-posta servisi tanımlı değil)";
    }

    /* DAVET İZİ: `expert_assignment_logs` bilirkişi sürecinin denetim defteri.
       `ajan-nobetci` rapor gecikme nöbetini bu tablodan okur. Davet e-postası
       ZATEN gitti; yazım sessizce düşerse davetin hiçbir kaydı kalmaz —
       arabulucu kimi ne zaman davet ettiğini göremez. Çağrı başarısız
       sayılmaz (davet gerçekten gitti), eksik açıkça dönülür. */
    const { error: izErr } = await admin.from("expert_assignment_logs").insert({
      case_id, expert_id, actor_id: uid, actor_role: "mediator", action: "invited",
      details: { note: `Davet ${epostaDurumu}`, alan: alanMetni || null },
    });
    if (izErr) {
      console.error(`[bilirkisi-davet] davet izi yazılamadı (${case_id}/${expert_id}): ${izErr.message}`);
    }

    return json({
      ok: true, davet_adresi: davetAdresi, eposta_durumu: epostaDurumu,
      ...(izErr ? { uyari: `Davet gitti ama denetim izi yazılamadı: ${izErr.message}` } : {}),
    });
  } catch (e: any) {
    const mesaj = String(e?.message ?? e).slice(0, 300);
    console.error("[bilirkisi-davet] hata", mesaj);
    return json({ error: mesaj }, 500);
  }
});
