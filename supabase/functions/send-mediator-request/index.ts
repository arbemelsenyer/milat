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

interface MediatorRequest {
  email: string;
  phone?: string;
  selectedSlots: string[];
  notes?: string;
  caseSummary: {
    disputeType: string;
    parties: { initiator: string; respondent: string };
    neutralSummary: string;
    coreThemes: string[];
  };
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

    // Create Supabase client with user's auth context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    const { email, phone, selectedSlots, notes, caseSummary, language = "tr" } = await req.json() as MediatorRequest;

    // Input validation - use generic error messages to avoid information leakage
    const isValidEmail = email && typeof email === "string" && email.includes("@") && email.length <= 255;
    const isValidPhone = !phone || (typeof phone === "string" && phone.length <= 20);
    const isValidSlots = Array.isArray(selectedSlots) && selectedSlots.length > 0;
    const isValidNotes = !notes || (typeof notes === "string" && notes.length <= 2000);
    const isValidCaseSummary = caseSummary && typeof caseSummary === "object";

    if (!isValidEmail || !isValidPhone || !isValidSlots || !isValidNotes || !isValidCaseSummary) {
      console.error("Invalid input data received", { 
        email: isValidEmail, phone: isValidPhone, slots: isValidSlots, notes: isValidNotes, summary: isValidCaseSummary 
      });
      return new Response(
        JSON.stringify({ error: "Invalid request data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending mediator request email to:", email);

    // Format time slots for display
    const slotLabels: Record<string, Record<string, string>> = {
      tr: {
        "weekday-morning": "Hafta içi - Sabah (09:00-12:00)",
        "weekday-afternoon": "Hafta içi - Öğleden sonra (12:00-17:00)",
        "weekday-evening": "Hafta içi - Akşam (17:00-20:00)",
        "weekend-morning": "Hafta sonu - Sabah (09:00-12:00)",
        "weekend-afternoon": "Hafta sonu - Öğleden sonra (12:00-17:00)",
      },
      en: {
        "weekday-morning": "Weekday - Morning (09:00-12:00)",
        "weekday-afternoon": "Weekday - Afternoon (12:00-17:00)",
        "weekday-evening": "Weekday - Evening (17:00-20:00)",
        "weekend-morning": "Weekend - Morning (09:00-12:00)",
        "weekend-afternoon": "Weekend - Afternoon (12:00-17:00)",
      },
    };

    const formattedSlots = selectedSlots
      .map((slot) => slotLabels[language]?.[slot] || slot)
      .join("<br>");

    const isEnglish = language === "en";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; color: #4F46E5; margin-bottom: 8px; }
          .info-box { background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; }
          .theme-tag { display: inline-block; background: #EEF2FF; color: #4F46E5; padding: 4px 12px; border-radius: 20px; margin: 2px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">${isEnglish ? "New Mediation Session Request" : "Yeni Arabuluculuk Oturumu Talebi"}</h1>
          </div>
          <div class="content">
            <div class="section">
              <div class="section-title">${isEnglish ? "Contact Information" : "İletişim Bilgileri"}</div>
              <div class="info-box">
                <p><strong>${isEnglish ? "Email" : "E-posta"}:</strong> ${email}</p>
                ${phone ? `<p><strong>${isEnglish ? "Phone" : "Telefon"}:</strong> ${phone}</p>` : ""}
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">${isEnglish ? "Preferred Time Slots" : "Tercih Edilen Zaman Dilimleri"}</div>
              <div class="info-box">
                ${formattedSlots}
              </div>
            </div>
            
            ${notes ? `
            <div class="section">
              <div class="section-title">${isEnglish ? "Additional Notes" : "Ek Notlar"}</div>
              <div class="info-box">${notes}</div>
            </div>
            ` : ""}
            
            <div class="section">
              <div class="section-title">${isEnglish ? "Case Summary" : "Dava Özeti"}</div>
              <div class="info-box">
                <p><strong>${isEnglish ? "Dispute Type" : "Uyuşmazlık Türü"}:</strong> ${caseSummary.disputeType}</p>
                <p><strong>${isEnglish ? "Initiating Party" : "Başvuran Taraf"}:</strong> ${caseSummary.parties.initiator}</p>
                <p><strong>${isEnglish ? "Other Party" : "Diğer Taraf"}:</strong> ${caseSummary.parties.respondent}</p>
                <p><strong>${isEnglish ? "Summary" : "Özet"}:</strong><br>${caseSummary.neutralSummary}</p>
                <p><strong>${isEnglish ? "Core Themes" : "Temel Temalar"}:</strong></p>
                <div>${caseSummary.coreThemes.map(theme => `<span class="theme-tag">${theme}</span>`).join(" ")}</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send confirmation email to the user
    const userEmailResponse = await resend.emails.send({
      from: "MediPact AI <onboarding@resend.dev>",
      to: [email],
      subject: isEnglish 
        ? "Your Mediation Session Request Received" 
        : "Arabuluculuk Oturumu Talebiniz Alındı",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4F46E5;">${isEnglish ? "Thank You!" : "Teşekkürler!"}</h1>
          <p>${isEnglish 
            ? "We have received your mediation session request. Our team will review your case and contact you within 24-48 hours to schedule your session."
            : "Arabuluculuk oturumu talebinizi aldık. Ekibimiz davanızı inceleyecek ve oturumunuzu planlamak için 24-48 saat içinde sizinle iletişime geçecektir."
          }</p>
          <p>${isEnglish 
            ? "If you have any urgent questions, please don't hesitate to reach out."
            : "Acil sorularınız varsa lütfen bizimle iletişime geçmekten çekinmeyin."
          }</p>
          <p style="margin-top: 30px; color: #666;">
            ${isEnglish ? "Best regards," : "Saygılarımızla,"}<br>
            <strong>MediPact AI ${isEnglish ? "Team" : "Ekibi"}</strong>
          </p>
        </div>
      `,
    });

    console.log("User confirmation email sent:", userEmailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Emails sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-mediator-request:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
