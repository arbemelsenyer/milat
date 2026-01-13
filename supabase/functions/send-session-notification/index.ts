import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = {
  emails: {
    send: async (options: { from: string; to: string[]; subject: string; html: string }) => {
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
    },
  },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SessionNotificationRequest {
  requestId: string;
  scheduledDate: string;
  mediatorNotes?: string;
  language?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId, scheduledDate, mediatorNotes, language = "tr" } = await req.json() as SessionNotificationRequest;

    console.log("Sending session notification for request:", requestId);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch request details with user info
    const { data: requestData, error: fetchError } = await supabase
      .from("mediator_requests")
      .select(`
        *,
        cases (
          dispute_type,
          your_name,
          other_party_name
        ),
        profiles!mediator_requests_user_id_fkey (
          full_name,
          email
        )
      `)
      .eq("id", requestId)
      .single();

    if (fetchError || !requestData) {
      console.error("Error fetching request:", fetchError);
      throw new Error("Request not found");
    }

    const userEmail = requestData.profiles?.email;
    const userName = requestData.profiles?.full_name || (language === "tr" ? "Değerli Kullanıcı" : "Dear User");
    const caseInfo = requestData.cases;

    if (!userEmail) {
      throw new Error("User email not found");
    }

    // Format the scheduled date
    const scheduledDateObj = new Date(scheduledDate);
    const formattedDate = scheduledDateObj.toLocaleDateString(language === "tr" ? "tr-TR" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = scheduledDateObj.toLocaleTimeString(language === "tr" ? "tr-TR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const isEnglish = language === "en";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .highlight-box { background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .date { font-size: 24px; font-weight: bold; color: #4F46E5; }
          .time { font-size: 18px; color: #6366F1; }
          .section { margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🎉 ${isEnglish ? "Session Scheduled!" : "Oturum Planlandı!"}</h1>
          </div>
          <div class="content">
            <p>${isEnglish ? "Dear" : "Sayın"} ${userName},</p>
            
            <p>${isEnglish 
              ? "Great news! Your mediation session has been scheduled." 
              : "Harika haber! Arabuluculuk oturumunuz planlandı."
            }</p>
            
            <div class="highlight-box">
              <div class="date">${formattedDate}</div>
              <div class="time">${formattedTime}</div>
            </div>
            
            ${caseInfo ? `
            <div class="section">
              <p><strong>${isEnglish ? "Case:" : "Dava:"}</strong> ${caseInfo.your_name || ""} ${caseInfo.other_party_name ? `vs ${caseInfo.other_party_name}` : ""}</p>
              <p><strong>${isEnglish ? "Type:" : "Tür:"}</strong> ${caseInfo.dispute_type || (isEnglish ? "General" : "Genel")}</p>
            </div>
            ` : ""}
            
            ${mediatorNotes ? `
            <div class="section">
              <p><strong>${isEnglish ? "Notes from Mediator:" : "Arabulucudan Notlar:"}</strong></p>
              <p style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                ${mediatorNotes}
              </p>
            </div>
            ` : ""}
            
            <div class="section">
              <p><strong>${isEnglish ? "What's next?" : "Sırada ne var?"}</strong></p>
              <ul>
                <li>${isEnglish 
                  ? "Make sure to be available at the scheduled time" 
                  : "Planlanan saatte müsait olduğunuzdan emin olun"
                }</li>
                <li>${isEnglish 
                  ? "Prepare any documents you want to discuss" 
                  : "Görüşmek istediğiniz belgeleri hazırlayın"
                }</li>
                <li>${isEnglish 
                  ? "You'll receive a meeting link before the session" 
                  : "Oturumdan önce toplantı bağlantısı alacaksınız"
                }</li>
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
    `;

    const emailResponse = await resend.emails.send({
      from: "MediationPath <onboarding@resend.dev>",
      to: [userEmail],
      subject: isEnglish 
        ? `Your Mediation Session is Scheduled - ${formattedDate}` 
        : `Arabuluculuk Oturumunuz Planlandı - ${formattedDate}`,
      html: htmlContent,
    });

    console.log("Session notification email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-session-notification:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
