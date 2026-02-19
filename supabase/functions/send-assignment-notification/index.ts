import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

interface AssignmentRequest {
  requestId: string;
  mediatorId: string;
  language?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify caller is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUserClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    const { data: isAdmin } = await supabaseUserClient.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { requestId, mediatorId, language = "tr" } = await req.json() as AssignmentRequest;

    if (!requestId || !mediatorId) {
      return new Response(
        JSON.stringify({ error: "Invalid request data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for cross-user data access
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fetch request details with case and user info
    const { data: requestData, error: fetchError } = await supabase
      .from("mediator_requests")
      .select(`
        *,
        cases (dispute_type, your_name, other_party_name),
        profiles!mediator_requests_user_id_fkey (full_name, email)
      `)
      .eq("id", requestId)
      .single();

    if (fetchError || !requestData) {
      throw new Error("Request not found");
    }

    // Fetch mediator profile
    const { data: mediatorProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", mediatorId)
      .single();

    const isEnglish = language === "en";
    const userEmail = requestData.profiles?.email;
    const userName = requestData.profiles?.full_name || (isEnglish ? "Dear User" : "Değerli Kullanıcı");
    const mediatorName = mediatorProfile?.full_name || (isEnglish ? "a mediator" : "bir arabulucu");
    const caseInfo = requestData.cases;

    // Send email to case owner
    if (userEmail) {
      await sendEmail({
        from: "MediationPath <onboarding@resend.dev>",
        to: [userEmail],
        subject: isEnglish
          ? "A Mediator Has Been Assigned to Your Case"
          : "Davanıza Bir Arabulucu Atandı",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .highlight-box { background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
              .mediator-name { font-size: 22px; font-weight: bold; color: #4F46E5; }
              .section { margin: 20px 0; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">👤 ${isEnglish ? "Mediator Assigned!" : "Arabulucu Atandı!"}</h1>
              </div>
              <div class="content">
                <p>${isEnglish ? "Dear" : "Sayın"} ${userName},</p>
                <p>${isEnglish
                  ? "A mediator has been assigned to your case. They will review your case details and contact you to schedule a session."
                  : "Davanıza bir arabulucu atandı. Dava detaylarınızı inceleyecek ve oturum planlamak için sizinle iletişime geçecektir."
                }</p>
                <div class="highlight-box">
                  <div style="font-size: 14px; color: #666; margin-bottom: 4px;">${isEnglish ? "Your Mediator" : "Arabulucunuz"}</div>
                  <div class="mediator-name">${mediatorName}</div>
                </div>
                ${caseInfo ? `
                <div class="section">
                  <p><strong>${isEnglish ? "Case:" : "Dava:"}</strong> ${caseInfo.your_name || ""} ${caseInfo.other_party_name ? `vs ${caseInfo.other_party_name}` : ""}</p>
                  <p><strong>${isEnglish ? "Type:" : "Tür:"}</strong> ${caseInfo.dispute_type || (isEnglish ? "General" : "Genel")}</p>
                </div>
                ` : ""}
                <div class="section">
                  <p><strong>${isEnglish ? "What's next?" : "Sırada ne var?"}</strong></p>
                  <ul>
                    <li>${isEnglish ? "Your mediator will review your case" : "Arabulucunuz davanızı inceleyecek"}</li>
                    <li>${isEnglish ? "They will contact you to schedule a session" : "Oturum planlamak için sizinle iletişime geçecek"}</li>
                    <li>${isEnglish ? "You can check your dashboard for updates" : "Güncellemeler için panelinizi kontrol edebilirsiniz"}</li>
                  </ul>
                </div>
                <div class="footer">
                  <p>${isEnglish ? "Best regards," : "Saygılarımızla,"}<br>
                  <strong>MediationPath ${isEnglish ? "Team" : "Ekibi"}</strong></p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      console.log("Assignment notification email sent to user:", userEmail);
    }

    // Send email to mediator
    if (mediatorProfile?.email) {
      await sendEmail({
        from: "MediationPath <onboarding@resend.dev>",
        to: [mediatorProfile.email],
        subject: isEnglish
          ? "You Have Been Assigned a New Case"
          : "Size Yeni Bir Dava Atandı",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
              .info-box { background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; margin: 15px 0; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">📋 ${isEnglish ? "New Case Assignment" : "Yeni Dava Ataması"}</h1>
              </div>
              <div class="content">
                <p>${isEnglish ? "Dear" : "Sayın"} ${mediatorName},</p>
                <p>${isEnglish
                  ? "You have been assigned a new mediation case. Please review the details and schedule a session."
                  : "Size yeni bir arabuluculuk davası atandı. Lütfen detayları inceleyin ve bir oturum planlayın."
                }</p>
                ${caseInfo ? `
                <div class="info-box">
                  <p><strong>${isEnglish ? "Parties:" : "Taraflar:"}</strong> ${caseInfo.your_name || ""} ${caseInfo.other_party_name ? `& ${caseInfo.other_party_name}` : ""}</p>
                  <p><strong>${isEnglish ? "Dispute Type:" : "Uyuşmazlık Türü:"}</strong> ${caseInfo.dispute_type || (isEnglish ? "General" : "Genel")}</p>
                </div>
                ` : ""}
                <p>${isEnglish
                  ? "Please log in to your dashboard to review the full case details and schedule a session."
                  : "Tam dava detaylarını incelemek ve oturum planlamak için lütfen panelinize giriş yapın."
                }</p>
                <div class="footer">
                  <p>${isEnglish ? "Best regards," : "Saygılarımızla,"}<br>
                  <strong>MediationPath ${isEnglish ? "Team" : "Ekibi"}</strong></p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      console.log("Assignment notification email sent to mediator:", mediatorProfile.email);
    }

    // Create in-app notifications for both parties
    const { error: userNotifError } = await supabase.rpc("create_notification", {
      p_user_id: requestData.user_id,
      p_title: isEnglish ? "Mediator Assigned" : "Arabulucu Atandı",
      p_message: isEnglish
        ? `${mediatorName} has been assigned as your mediator.`
        : `${mediatorName} arabulucunuz olarak atandı.`,
      p_type: "info",
      p_link: "/dashboard",
    });
    if (userNotifError) console.error("User notification error:", userNotifError);

    const { error: mediatorNotifError } = await supabase.rpc("create_notification", {
      p_user_id: mediatorId,
      p_title: isEnglish ? "New Case Assigned" : "Yeni Dava Atandı",
      p_message: isEnglish
        ? `You have been assigned a new mediation case.`
        : `Size yeni bir arabuluculuk davası atandı.`,
      p_type: "info",
      p_link: "/mediator",
    });
    if (mediatorNotifError) console.error("Mediator notification error:", mediatorNotifError);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-assignment-notification:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
