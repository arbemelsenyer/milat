// Admin-only: fetch ministry .docx templates, convert with mammoth, upsert into document_templates.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import mammoth from "npm:mammoth@1.7.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TEMPLATES: { template_type: string; url: string }[] = [
  { template_type: "dava_sarti_anlasma", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1612021002059Dava%20%C5%9Eart%C4%B1%20Anla%C5%9Fma%20Son%20Tutanak.docx" },
  { template_type: "dava_sarti_anlasamamama", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/14120211546331-%20Dava%20%C5%9Eart%C4%B1%20Anla%C5%9Famama%20Son%20Tutanak.docx" },
  { template_type: "dava_sarti_ilk_oturum", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/14120211547031-%20Dava%20%C5%9Eart%C4%B1%20Bilgilendirme%20-%20%C4%B0lk%20Oturum%20Tutana%C4%9F%C4%B1.docx" },
  { template_type: "ihtiyari_anlasma", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/14120211547132-%20%C4%B0htiyari%20Arabuluculukta%20Anla%C5%9Fma%20Son%20Tutana%C4%9F%C4%B1.docx" },
  { template_type: "ihtiyari_anlasamamama", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/14120211547242-%20%C4%B0htiyari%20Arabuluculukta%20Anla%C5%9Famama%20Son%20Tutana%C4%9F%C4%B1.docx" },
  { template_type: "ihtiyari_davet", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1412021154734%C4%B0htiyari%20Arabuluculuk%20Davet%20Mektubu.docx" },
  { template_type: "isci_isveren_davet", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1412021154748%C4%B0%C5%9E%C3%87%C4%B0%20-%20%C4%B0%C5%9EVEREN%20UYU%C5%9EMAZLIKLARINDA%20DAVA%20%C5%9EARTI%20ARABULUCULUK%20%C4%B0LK%20TOPLANTI%20DAVET%20MEKTUBU.docx" },
  { template_type: "ticari_davet", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1412021154756T%C4%B0CAR%C4%B0%20UYU%C5%9EMAZLIKLARDA%20DAVA%20%C5%9EARTI%20ARABULUCULUK%20%C4%B0LK%20TOPLANTI%20DAVET%20MEKTUBU.docx" },
  { template_type: "tuketici_davet", url: "https://adb.adalet.gov.tr/Resimler/SayfaDokuman/1412021154804T%C3%9CKET%C4%B0C%C4%B0%20UYU%C5%9EMAZLIKLARDA%20DAVA%20%C5%9EARTI%20ARABULUCULUK%20%C4%B0LK%20TOPLANTI%20DAVET%20MEKTUBU.docx" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cronSecret = Deno.env.get("CRON_SECRET");

  // Auth: either admin JWT OR X-Cron-Secret header
  const cronHeader = req.headers.get("x-cron-secret");
  const isCronAuthed = cronSecret && cronHeader && cronHeader === cronSecret;

  if (!isCronAuthed) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin0 = createClient(supabaseUrl, serviceKey);
    const { data: roleCheck } = await admin0.from("user_roles").select("role").eq("user_id", userRes.user.id).eq("role", "admin").maybeSingle();
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const body = await req.json().catch(() => ({}));
  const only: string[] | undefined = body?.only;
  const singleUrl: string | undefined = body?.url;
  const singleType: string | undefined = body?.template_type;

  const list = singleUrl && singleType
    ? [{ template_type: singleType, url: singleUrl }]
    : only
    ? TEMPLATES.filter((t) => only.includes(t.template_type))
    : TEMPLATES;

  const results: any[] = [];
  for (const t of list) {
    try {
      const r = await fetch(t.url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = new Uint8Array(await r.arrayBuffer());
      // mammoth accepts { buffer } in Node; for Deno pass ArrayBuffer via buffer
      const conv = await mammoth.extractRawText({ buffer: buf });
      const content = conv?.value || "";
      const { error } = await admin.from("document_templates").upsert({
        template_type: t.template_type,
        template_content: content,
        source_url: t.url,
        is_active: true,
        uploaded_at: new Date().toISOString(),
      }, { onConflict: "template_type" });
      if (error) throw error;
      results.push({ template_type: t.template_type, ok: true, chars: content.length });
    } catch (e) {
      console.error("template fetch failed", t.template_type, e);
      // Insert placeholder row so admin sees the gap
      await admin.from("document_templates").upsert({
        template_type: t.template_type,
        template_content: "",
        source_url: t.url,
        is_active: false,
        uploaded_at: new Date().toISOString(),
      }, { onConflict: "template_type" });
      results.push({ template_type: t.template_type, ok: false, error: (e as Error).message });
    }
  }

  return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
