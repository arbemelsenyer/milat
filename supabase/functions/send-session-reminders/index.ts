import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = {
  emails: {
    send: async (params: {
      from: string;
      to: string[];
      subject: string;
      html: string;
    }) => {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (!RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not set");
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to send email: ${error}`);
      }

      return response.json();
    },
  },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SessionWithDetails {
  id: string;
  case_id: string;
  user_id: string;
  mediator_id: string | null;
  scheduled_date: string;
  session_type: string | null;
  notes: string | null;
  status: string;
  user_profile?: {
    email: string | null;
    full_name: string | null;
  };
  mediator_profile?: {
    email: string | null;
    full_name: string | null;
  };
  case_details?: {
    dispute_type: string | null;
    your_name: string | null;
    other_party_name: string | null;
  };
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting session reminder check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the time window for 24-hour reminder
    // Sessions that are between 23 and 25 hours from now
    const now = new Date();
    const reminderStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const reminderEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    console.log(`Checking for sessions between ${reminderStart.toISOString()} and ${reminderEnd.toISOString()}`);

    // Fetch sessions that need reminders
    const { data: sessions, error: sessionsError } = await supabase
      .from("mediator_requests")
      .select("*")
      .eq("status", "scheduled")
      .gte("scheduled_date", reminderStart.toISOString())
      .lt("scheduled_date", reminderEnd.toISOString());

    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError);
      throw sessionsError;
    }

    if (!sessions || sessions.length === 0) {
      console.log("No sessions require reminders at this time");
      return new Response(
        JSON.stringify({ success: true, message: "No sessions require reminders", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${sessions.length} sessions requiring reminders`);

    let sentCount = 0;
    const errors: string[] = [];

    for (const session of sessions) {
      try {
        // Fetch user profile
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", session.user_id)
          .maybeSingle();

        // Fetch mediator profile if assigned
        let mediatorProfile = null;
        if (session.mediator_id) {
          const { data: medProfile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("user_id", session.mediator_id)
            .maybeSingle();
          mediatorProfile = medProfile;
        }

        // Fetch case details
        const { data: caseDetails } = await supabase
          .from("cases")
          .select("dispute_type, your_name, other_party_name")
          .eq("id", session.case_id)
          .maybeSingle();

        const scheduledDate = new Date(session.scheduled_date);
        const formattedDate = scheduledDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const sessionTypeText = session.session_type === "online" 
          ? "Online (Video Call)" 
          : session.session_type === "phone" 
          ? "Phone Call" 
          : "In-Person";

        // Send reminder to user
        if (userProfile?.email) {
          const userEmailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Session Reminder</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Session Reminder</h1>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="color: #333; font-size: 16px;">Hello ${userProfile.full_name || "there"},</p>
                
                <p style="color: #333; font-size: 16px;">This is a friendly reminder that your mediation session is scheduled for <strong>tomorrow</strong>.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                  <h3 style="margin: 0 0 15px 0; color: #333;">Session Details</h3>
                  <p style="margin: 5px 0; color: #555;"><strong>📅 Date:</strong> ${formattedDate}</p>
                  <p style="margin: 5px 0; color: #555;"><strong>🕐 Time:</strong> ${formattedTime}</p>
                  <p style="margin: 5px 0; color: #555;"><strong>📍 Type:</strong> ${sessionTypeText}</p>
                  ${caseDetails?.dispute_type ? `<p style="margin: 5px 0; color: #555;"><strong>📋 Case:</strong> ${caseDetails.dispute_type}</p>` : ""}
                  ${mediatorProfile?.full_name ? `<p style="margin: 5px 0; color: #555;"><strong>👤 Mediator:</strong> ${mediatorProfile.full_name}</p>` : ""}
                </div>
                
                <h4 style="color: #333; margin-top: 25px;">How to Prepare:</h4>
                <ul style="color: #555; line-height: 1.8;">
                  <li>Review any documents related to your case</li>
                  <li>Prepare a list of key points you want to discuss</li>
                  <li>Find a quiet, private space for the session</li>
                  ${session.session_type === "online" ? "<li>Test your video and audio equipment beforehand</li>" : ""}
                </ul>
                
                ${session.notes ? `<p style="color: #555; background: #e8f4ff; padding: 15px; border-radius: 8px; margin-top: 20px;"><strong>Note from mediator:</strong> ${session.notes}</p>` : ""}
                
                <p style="color: #333; font-size: 16px; margin-top: 25px;">We look forward to seeing you!</p>
                
                <p style="color: #888; font-size: 14px; margin-top: 30px;">Best regards,<br>The MediPact AI Team</p>
              </div>
            </body>
            </html>
          `;

          await resend.emails.send({
            from: "MediPact AI <onboarding@resend.dev>",
            to: [userProfile.email],
            subject: `⏰ Reminder: Your Mediation Session is Tomorrow - ${formattedDate}`,
            html: userEmailHtml,
          });

          console.log(`Sent reminder to user: ${userProfile.email}`);
          sentCount++;
        }

        // Send reminder to mediator
        if (mediatorProfile?.email) {
          const mediatorEmailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Session Reminder</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Upcoming Session Reminder</h1>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="color: #333; font-size: 16px;">Hello ${mediatorProfile.full_name || "Mediator"},</p>
                
                <p style="color: #333; font-size: 16px;">This is a reminder that you have a mediation session scheduled for <strong>tomorrow</strong>.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #11998e;">
                  <h3 style="margin: 0 0 15px 0; color: #333;">Session Details</h3>
                  <p style="margin: 5px 0; color: #555;"><strong>📅 Date:</strong> ${formattedDate}</p>
                  <p style="margin: 5px 0; color: #555;"><strong>🕐 Time:</strong> ${formattedTime}</p>
                  <p style="margin: 5px 0; color: #555;"><strong>📍 Type:</strong> ${sessionTypeText}</p>
                  ${caseDetails?.dispute_type ? `<p style="margin: 5px 0; color: #555;"><strong>📋 Case:</strong> ${caseDetails.dispute_type}</p>` : ""}
                  ${caseDetails?.your_name && caseDetails?.other_party_name ? `<p style="margin: 5px 0; color: #555;"><strong>👥 Parties:</strong> ${caseDetails.your_name} vs ${caseDetails.other_party_name}</p>` : ""}
                  ${userProfile?.full_name ? `<p style="margin: 5px 0; color: #555;"><strong>👤 Client:</strong> ${userProfile.full_name}</p>` : ""}
                </div>
                
                <p style="color: #333; font-size: 16px; margin-top: 25px;">Please review the case details before the session.</p>
                
                <p style="color: #888; font-size: 14px; margin-top: 30px;">Best regards,<br>The MediPact AI Team</p>
              </div>
            </body>
            </html>
          `;

          await resend.emails.send({
            from: "MediPact AI <onboarding@resend.dev>",
            to: [mediatorProfile.email],
            subject: `⏰ Mediator Reminder: Session Tomorrow - ${formattedDate}`,
            html: mediatorEmailHtml,
          });

          console.log(`Sent reminder to mediator: ${mediatorProfile.email}`);
          sentCount++;
        }

        // Create in-app notification for user
        if (userProfile) {
          await supabase.rpc("create_notification", {
            p_user_id: session.user_id,
            p_title: "Session Reminder",
            p_message: `Your mediation session is tomorrow at ${formattedTime}. Please be prepared!`,
            p_type: "reminder",
            p_link: `/summary?case=${session.case_id}`,
          });
        }

        // Create in-app notification for mediator
        if (session.mediator_id) {
          await supabase.rpc("create_notification", {
            p_user_id: session.mediator_id,
            p_title: "Session Reminder",
            p_message: `You have a mediation session tomorrow at ${formattedTime} with ${userProfile?.full_name || "a client"}.`,
            p_type: "reminder",
            p_link: `/mediator`,
          });
        }

      } catch (sessionError) {
        console.error(`Error processing session ${session.id}:`, sessionError);
        errors.push(`Session ${session.id}: ${sessionError instanceof Error ? sessionError.message : "Unknown error"}`);
      }
    }

    console.log(`Reminder process complete. Sent ${sentCount} emails.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${sessions.length} sessions, sent ${sentCount} reminder emails`,
        count: sentCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error) {
    console.error("Error in send-session-reminders:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
