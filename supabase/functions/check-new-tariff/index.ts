// Cron ile Aralık başı / Ocak başı çalışır: Resmi Gazete'de yeni yıl arabuluculuk
// asgari ücret tarifesini arar. Bulursa adminlere hedeflenmiş bildirim gönderir,
// bulamazsa "henüz yayınlanmadı" hatırlatması gönderir.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function fetchLast30DaysResmiGazete(year: number): Promise<Array<{ title: string; url: string; date: string }>> {
  const found: Array<{ title: string; url: string; date: string }> = [];
  const today = new Date();
  for (let offset = 0; offset < 30; offset++) {
    const d = new Date(today.getTime() - offset * 24 * 3600 * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const url = `https://www.resmigazete.gov.tr/${y}/${m}/${y}${m}${day}.htm`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) continue;
      const html = await res.text();
      // Basit link taraması
      const re = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
      let m2: RegExpExecArray | null;
      while ((m2 = re.exec(html)) !== null) {
        const href = m2[1];
        const text = m2[2].replace(/\s+/g, " ").trim();
        const low = text.toLocaleLowerCase("tr");
        if (
          low.includes("arabuluculuk") &&
          (low.includes("asgari ücret") || low.includes("ücret tarife") || low.includes("tarife"))
        ) {
          if (!year || text.includes(String(year))) {
            const abs = href.startsWith("http")
              ? href
              : href.startsWith("/")
                ? "https://www.resmigazete.gov.tr" + href
                : `https://www.resmigazete.gov.tr/${y}/${m}/` + href;
            found.push({ title: text, url: abs, date: `${y}-${m}-${day}` });
          }
        }
      }
    } catch { /* devam */ }
  }
  return found;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // pg_cron çağrısı için: Authorization header yoksa cron modu (yalnızca admin
    // bildirimleri üretir, dış veri sızıntısı yoktur). Manuel çağrıda admin JWT şart.
    const authHeader = req.headers.get("Authorization");
    const cronHeader = req.headers.get("x-cron-secret");
    const isCron = !authHeader || (!!CRON_SECRET && cronHeader === CRON_SECRET);
    if (!isCron) {
      const token = authHeader!.replace("Bearer ", "");
      const admin0 = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data: userRes } = await admin0.auth.getUser(token);
      if (!userRes?.user) return json({ error: "Oturum doğrulanamadı" }, 401);
      const { data: isAdmin } = await admin0.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" });
      if (!isAdmin) return json({ error: "Admin gereklidir" }, 403);
    }


    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const nextYear = new Date().getUTCFullYear() + 1;
    const matches = await fetchLast30DaysResmiGazete(nextYear);

    // Adminleri bul
    const { data: admins, error: aErr } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    if (aErr) return json({ error: aErr.message }, 500);

    let notified = 0;
    if (matches.length > 0) {
      const first = matches[0];
      for (const a of admins ?? []) {
        await admin.rpc("create_notification", {
          p_user_id: a.user_id,
          p_title: `📢 ${nextYear} Arabuluculuk Asgari Ücret Tarifesi yayınlandı`,
          p_message: `${first.title} — fee_tariffs tablosunu güncelleyin. Kaynak: ${first.url}`,
          p_type: "warning",
          p_link: "/admin?tab=tariff",
        });
        notified++;
      }
    } else {
      for (const a of admins ?? []) {
        await admin.rpc("create_notification", {
          p_user_id: a.user_id,
          p_title: `⏳ ${nextYear} tarifesi henüz yayınlanmadı`,
          p_message: `Resmi Gazete'de ${nextYear} arabuluculuk asgari ücret tarifesi bulunamadı. Ocak başına kadar tekrar kontrol edin.`,
          p_type: "info",
          p_link: "/admin?tab=tariff",
        });
        notified++;
      }
    }

    return json({ ok: true, checked_year: nextYear, found: matches, notified });
  } catch (e: any) {
    console.error("check-new-tariff error", e);
    return json({ error: e?.message ?? "Sunucu hatası" }, 500);
  }
});
