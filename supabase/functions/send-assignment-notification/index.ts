import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendEmail(options: { from: string; to: string[]; subject: string; html: string }) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify caller is admin
    const { data: { user: callerUser } } = await supabaseUserClient.auth.getUser();
    if (!callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: isAdmin } = await supabaseUserClient.rpc("has_role", { _user_id: callerUser.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { caseId, mediatorId, language = "tr" } = await req.json();
    if (!caseId || !mediatorId) {
      return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fetch case
    const { data: caseData } = await supabase
      .from("cases")
      .select("id, user_id, title, dispute_type, your_name, other_party_name")
      .eq("id", caseId)
      .single();

    if (!caseData) throw new Error("Case not found");

    // Fetch case owner profile
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", caseData.user_id)
      .single();

    // Fetch mediator profile
    const { data: mediatorProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", mediatorId)
      .single();

    const isEn = language === "en";
    const ownerName = ownerProfile?.full_name || (isEn ? "Dear User" : "Değerli Kullanıcı");
    const mediatorName = mediatorProfile?.full_name || (isEn ? "a mediator" : "bir arabulucu");
    const caseTitle = caseData.title || `${caseData.your_name || ""} vs ${caseData.other_party_name || ""}`;

    // Email to case owner
    if (ownerProfile?.email) {
      await sendEmail({
        from: "MediPact AI <onboarding@resend.dev>",
        to: [ownerProfile.email],
        subject: isEn ? "Mediator Assigned to Your Case" : "Başvurunuza Arabulucu Atandı",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
          <h2>${isEn ? "Mediator Assigned" : "Arabulucu Atandı"}</h2>
          <p>${isEn ? "Dear" : "Sayın"} ${ownerName},</p>
          <p>${isEn ? `<strong>${mediatorName}</strong> has been assigned to your case "<em>${caseTitle}</em>".` : `<strong>${mediatorName}</strong> "<em>${caseTitle}</em>" başvurunuza arabulucu olarak atandı.`}</p>
          <p>${isEn ? "They will review your case and contact you." : "Başvurunuzı inceleyecek ve sizinle iletişime geçecek."}</p>
          <p>MediPact AI</p></div>`,
      });
    }

    // Email to mediator
    if (mediatorProfile?.email) {
      await sendEmail({
        from: "MediPact AI <onboarding@resend.dev>",
        to: [mediatorProfile.email],
        subject: isEn ? "New Case Assignment" : "Yeni Başvuru Ataması",
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
          <h2>${isEn ? "New Case Assigned" : "Yeni Başvuru Atandı"}</h2>
          <p>${isEn ? "Dear" : "Sayın"} ${mediatorName},</p>
          <p>${isEn ? `You've been assigned to case "<em>${caseTitle}</em>".` : `"<em>${caseTitle}</em>" başvurusu size atandı.`}</p>
          <p>${isEn ? "Please log in to review and schedule a session." : "Lütfen giriş yaparak inceleyin ve oturum planlayın."}</p>
          <p>MediPact AI</p></div>`,
      });
    }

    // In-app notifications
    await supabase.rpc("create_notification", {
      p_user_id: caseData.user_id,
      p_title: isEn ? "Mediator Assigned" : "Arabulucu Atandı",
      p_message: isEn ? `${mediatorName} assigned to your case.` : `${mediatorName} başvurunuza atandı.`,
      p_type: "mediator_assigned",
      p_link: "/dashboard",
    });

    await supabase.rpc("create_notification", {
      p_user_id: mediatorId,
      p_title: isEn ? "New Case" : "Yeni Başvuru",
      p_message: isEn ? `You've been assigned to "${caseTitle}".` : `"${caseTitle}" başvurusu size atandı.`,
      p_type: "mediator_assigned",
      p_link: "/mediator",
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
