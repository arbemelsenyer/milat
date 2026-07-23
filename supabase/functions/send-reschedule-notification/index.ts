import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated caller — prevents spoofed emails/notifications
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const { rescheduleRequestId, action, language = "tr" } = await req.json();

    if (!rescheduleRequestId || !action) {
      return new Response(
        JSON.stringify({ error: "Missing rescheduleRequestId or action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch reschedule request with related data
    const { data: rescheduleData, error: fetchError } = await supabase
      .from("reschedule_requests")
      .select(`
        *,
        mediator_requests (
          id, user_id, mediator_id, scheduled_date,
          cases ( dispute_type, your_name, other_party_name )
        )
      `)
      .eq("id", rescheduleRequestId)
      .single();

    if (fetchError || !rescheduleData) {
      console.error("Error fetching reschedule request:", fetchError);
      return new Response(
        JSON.stringify({ error: "Reschedule request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mediatorRequest = rescheduleData.mediator_requests;
    const isSubmitted = action === "submitted";

    // Authorization: submitter must be the case user; approver/rejecter must be the mediator
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: callerId, _role: "admin" });
    const allowed = isAdmin === true
      || (isSubmitted && callerId === mediatorRequest.user_id)
      || (!isSubmitted && callerId === mediatorRequest.mediator_id);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine recipient: submitted -> notify mediator; approved/rejected -> notify user
    const recipientUserId = isSubmitted ? mediatorRequest.mediator_id : mediatorRequest.user_id;

    if (!recipientUserId) {
      return new Response(
        JSON.stringify({ error: "No recipient found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get recipient profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", recipientUserId)
      .single();

    if (!profile?.email) {
      console.error("Recipient email not found");
      return new Response(
        JSON.stringify({ error: "Recipient email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isEnglish = language === "en";
    const recipientName = profile.full_name || (isEnglish ? "Dear User" : "Sayın Kullanıcı");
    const proposedDate = new Date(rescheduleData.proposed_date);
    const formattedDate = proposedDate.toLocaleDateString(isEnglish ? "en-US" : "tr-TR", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const formattedTime = proposedDate.toLocaleTimeString(isEnglish ? "en-US" : "tr-TR", {
      hour: "2-digit", minute: "2-digit",
    });

    let subject: string;
    let heading: string;
    let bodyText: string;
    let notifTitle: string;
    let notifMessage: string;
    const notifType = action === "approved" ? "success" : action === "rejected" ? "warning" : "info";

    if (action === "submitted") {
      subject = isEnglish ? "New Reschedule Request" : "Yeni Yeniden Planlama Talebi";
      heading = isEnglish ? "📅 Reschedule Request Received" : "📅 Yeniden Planlama Talebi Alındı";
      bodyText = isEnglish
        ? `A user has requested to reschedule their session to <strong>${formattedDate}</strong> at <strong>${formattedTime}</strong>.`
        : `Bir kullanıcı oturumunu <strong>${formattedDate}</strong> <strong>${formattedTime}</strong> tarihine yeniden planlamak istiyor.`;
      notifTitle = isEnglish ? "Reschedule Request" : "Yeniden Planlama Talebi";
      notifMessage = isEnglish
        ? `A reschedule request for ${formattedDate} at ${formattedTime} needs your review.`
        : `${formattedDate} ${formattedTime} için bir yeniden planlama talebi incelemenizi bekliyor.`;
    } else if (action === "approved") {
      subject = isEnglish ? "Reschedule Request Approved" : "Yeniden Planlama Talebi Onaylandı";
      heading = isEnglish ? "✅ Reschedule Approved!" : "✅ Yeniden Planlama Onaylandı!";
      bodyText = isEnglish
        ? `Your reschedule request has been approved. Your session is now set for <strong>${formattedDate}</strong> at <strong>${formattedTime}</strong>.`
        : `Yeniden planlama talebiniz onaylandı. Oturumunuz artık <strong>${formattedDate}</strong> <strong>${formattedTime}</strong> olarak ayarlandı.`;
      notifTitle = isEnglish ? "Reschedule Approved" : "Yeniden Planlama Onaylandı";
      notifMessage = isEnglish
        ? `Your session has been rescheduled to ${formattedDate} at ${formattedTime}.`
        : `Oturumunuz ${formattedDate} ${formattedTime} tarihine yeniden planlandı.`;
    } else {
      subject = isEnglish ? "Reschedule Request Rejected" : "Yeniden Planlama Talebi Reddedildi";
      heading = isEnglish ? "❌ Reschedule Request Rejected" : "❌ Yeniden Planlama Talebi Reddedildi";
      bodyText = isEnglish
        ? `Your reschedule request for <strong>${formattedDate}</strong> at <strong>${formattedTime}</strong> has been rejected. Please keep the original schedule or submit a new request.`
        : `<strong>${formattedDate}</strong> <strong>${formattedTime}</strong> için yeniden planlama talebiniz reddedildi. Lütfen mevcut takvimi koruyun veya yeni bir talep gönderin.`;
      notifTitle = isEnglish ? "Reschedule Rejected" : "Yeniden Planlama Reddedildi";
      notifMessage = isEnglish
        ? `Your reschedule request for ${formattedDate} was rejected.`
        : `${formattedDate} için yeniden planlama talebiniz reddedildi.`;
    }

    const reasonBlock = rescheduleData.reason
      ? `<div style="background:#f0f4ff;padding:15px;border-radius:6px;margin:15px 0;border:1px solid #e0e7ff;">
           <strong>${isEnglish ? "Reason:" : "Neden:"}</strong> ${rescheduleData.reason}
         </div>`
      : "";

    const htmlContent = `<!DOCTYPE html><html><head><style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px}
      .header{background:#4F46E5;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center}
      .content{background:#f9fafb;padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px}
      .footer{margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;color:#666}
    </style></head><body>
      <div class="container">
        <div class="header"><h1 style="margin:0">${heading}</h1></div>
        <div class="content">
          <p>${isEnglish ? "Dear" : "Sayın"} ${recipientName},</p>
          <p>${bodyText}</p>
          ${reasonBlock}
          <div class="footer">
            <p>${isEnglish ? "Best regards," : "Saygılarımızla,"}<br><strong>MediPact AI ${isEnglish ? "Team" : "Ekibi"}</strong></p>
          </div>
        </div>
      </div>
    </body></html>`;

    // Send email
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "MİLAT Arabuluculuk <info@milatmediation.com>",
          to: [profile.email],
          subject,
          html: htmlContent,
        }),
      });
      if (!emailRes.ok) {
        console.error("Email send failed:", await emailRes.text());
      } else {
        console.log("Reschedule notification email sent");
      }
    }

    // Create in-app notification via SECURITY DEFINER RPC
    await supabase.rpc("create_notification", {
      p_user_id: recipientUserId,
      p_title: notifTitle,
      p_message: notifMessage,
      p_type: notifType,
      p_link: isSubmitted ? "/mediator" : "/dashboard",
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
