import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RoleNotificationRequest {
  targetUserId: string;
  role: string;
  action: "added" | "removed";
  language?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role to check admin status
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // First verify the user making the request
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    // Check if user is admin using service role client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: isAdmin, error: roleError } = await adminClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || !isAdmin) {
      console.error("User is not admin:", roleError);
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { targetUserId, role, action, language = "en" } = await req.json() as RoleNotificationRequest;

    // Validate input
    if (!targetUserId || !role || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["user", "mediator", "admin"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["added", "removed"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing role notification: ${action} ${role} for user ${targetUserId}`);

    // Get target user's profile
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', targetUserId)
      .single();

    if (profileError || !profile?.email) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Target user not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isEnglish = language === "en";
    const roleLabels: Record<string, Record<string, string>> = {
      tr: { user: "Kullanıcı", mediator: "Arabulucu", admin: "Yönetici" },
      en: { user: "User", mediator: "Mediator", admin: "Admin" },
    };

    const roleLabel = roleLabels[language]?.[role] || role;

    // Create in-app notification
    const notificationTitle = action === "added"
      ? (isEnglish ? `${roleLabel} Role Granted` : `${roleLabel} Rolü Verildi`)
      : (isEnglish ? `${roleLabel} Role Removed` : `${roleLabel} Rolü Kaldırıldı`);

    const notificationMessage = action === "added"
      ? (isEnglish 
          ? `You have been granted the ${roleLabel} role. You now have access to additional features.`
          : `Size ${roleLabel} rolü verildi. Artık ek özelliklere erişebilirsiniz.`)
      : (isEnglish
          ? `Your ${roleLabel} role has been removed.`
          : `${roleLabel} rolünüz kaldırıldı.`);

    // Insert notification using service role client (bypasses RLS)
    const { error: notifError } = await adminClient
      .from('notifications')
      .insert({
        user_id: targetUserId,
        title: notificationTitle,
        message: notificationMessage,
        type: action === "added" ? "success" : "info",
        link: "/dashboard"
      });

    if (notifError) {
      console.error("Error creating notification:", notifError);
    } else {
      console.log("In-app notification created successfully");
    }

    // Send email notification
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const emailSubject = action === "added"
        ? (isEnglish ? `You've been granted ${roleLabel} access` : `${roleLabel} erişimi verildi`)
        : (isEnglish ? `Your ${roleLabel} access has changed` : `${roleLabel} erişiminiz değişti`);

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${action === "added" ? "#10B981" : "#6B7280"}; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .role-badge { display: inline-block; background: #4F46E5; color: white; padding: 6px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
            .cta { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">${action === "added" 
                ? (isEnglish ? "Role Granted!" : "Rol Verildi!")
                : (isEnglish ? "Role Update" : "Rol Güncellemesi")}</h1>
            </div>
            <div class="content">
              <p>${isEnglish ? "Hello" : "Merhaba"} ${profile.full_name || ""},</p>
              
              ${action === "added" ? `
                <p>${isEnglish 
                  ? "Great news! You have been granted a new role on MediPact AI:"
                  : "Harika haber! MediPact AI'te size yeni bir rol verildi:"}</p>
                <div style="text-align: center;">
                  <span class="role-badge">${roleLabel}</span>
                </div>
                <p>${role === "mediator" 
                  ? (isEnglish 
                      ? "As a Mediator, you can now view and manage assigned mediation cases, schedule sessions, and help parties resolve their disputes."
                      : "Arabulucu olarak artık atanan davaları görüntüleyebilir, oturumlar planlayabilir ve tarafların uyuşmazlıklarını çözmelerine yardımcı olabilirsiniz.")
                  : role === "admin"
                    ? (isEnglish
                        ? "As an Admin, you have full access to manage users, assign mediators to cases, and oversee the platform."
                        : "Yönetici olarak kullanıcıları yönetme, arabulucuları davalara atama ve platformu denetleme konularında tam erişiminiz var.")
                    : (isEnglish
                        ? "You can now access all standard user features."
                        : "Artık tüm standart kullanıcı özelliklerine erişebilirsiniz.")}</p>
              ` : `
                <p>${isEnglish 
                  ? `Your ${roleLabel} role has been removed from your account.`
                  : `Hesabınızdan ${roleLabel} rolü kaldırıldı.`}</p>
                <p>${isEnglish 
                  ? "If you believe this was done in error, please contact the administrator."
                  : "Bunun yanlışlıkla yapıldığını düşünüyorsanız lütfen yöneticiyle iletişime geçin."}</p>
              `}
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}/dashboard" class="cta" style="color: white;">
                  ${isEnglish ? "Go to Dashboard" : "Panele Git"}
                </a>
              </div>
              
              <div class="footer">
                <p>${isEnglish ? "Best regards," : "Saygılarımızla,"}<br><strong>MediPact AI ${isEnglish ? "Team" : "Ekibi"}</strong></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "MediPact AI <onboarding@resend.dev>",
            to: [profile.email],
            subject: emailSubject,
            html: emailHtml,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Resend API error: ${response.status} - ${errorText}`);
        } else {
          console.log("Email notification sent successfully to:", profile.email);
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    } else {
      console.log("RESEND_API_KEY not configured, skipping email notification");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notifications sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-role-notification:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
