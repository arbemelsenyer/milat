import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StructuredSummary {
  neutralSummary: string;
  themes: string[];
  needs: string[];
  clarifyingQuestions: string[];
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

    const { summary, language = "tr" } = await req.json() as { summary: StructuredSummary; language?: string };
    
    // Input validation
    if (!summary || typeof summary !== "object") {
      return new Response(
        JSON.stringify({ error: "Summary is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!summary.neutralSummary || typeof summary.neutralSummary !== "string") {
      return new Response(
        JSON.stringify({ error: "Neutral summary is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit input size to prevent abuse
    if (summary.neutralSummary.length > 10000) {
      return new Response(
        JSON.stringify({ error: "Summary too long (max 10000 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = language === "tr" 
      ? `Sen bir arabuluculuk uzmanısın. Verilen uyuşmazlık özetine dayanarak, taraflara yardımcı olabilecek 3-4 çözüm senaryosu öner.
Her senaryo için:
- Başlık (kısa ve açıklayıcı)
- Açıklama (ne önerdiğini anlat)
- Avantaj ve dezavantajlar (her biri için 2-3 madde)

JSON formatında yanıt ver:
{
  "options": [
    {
      "id": "opt-1",
      "title": "Senaryo başlığı",
      "description": "Senaryonun açıklaması",
      "tradeoffs": ["Avantaj/dezavantaj 1", "Avantaj/dezavantaj 2"]
    }
  ]
}`
      : `You are a mediation expert. Based on the dispute summary provided, suggest 3-4 resolution scenarios that could help the parties.
For each scenario provide:
- Title (short and descriptive)
- Description (explain what you're proposing)
- Trade-offs (2-3 pros and cons for each)

Respond in JSON format:
{
  "options": [
    {
      "id": "opt-1",
      "title": "Scenario title",
      "description": "Description of the scenario",
      "tradeoffs": ["Trade-off 1", "Trade-off 2"]
    }
  ]
}`;

    const userPrompt = language === "tr"
      ? `Uyuşmazlık Özeti:
${summary.neutralSummary}

Temel Temalar: ${(summary.themes || []).join(", ")}

Tarafların İhtiyaçları: ${(summary.needs || []).join(", ")}

Lütfen bu duruma uygun 3-4 çözüm senaryosu öner.`
      : `Dispute Summary:
${summary.neutralSummary}

Core Themes: ${(summary.themes || []).join(", ")}

Party Needs: ${(summary.needs || []).join(", ")}

Please suggest 3-4 resolution scenarios appropriate for this situation.`;

    console.log("Calling Lovable AI for options generation...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your account." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log("AI response received:", content);

    // Parse the JSON response
    let options;
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        options = parsed.options || [];
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback to default options
      options = [
        {
          id: "opt-1",
          title: language === "tr" ? "Aşamalı Ödeme Planı" : "Phased Payment Plan",
          description: language === "tr" 
            ? "Ödeme veya bedel tartışmasını, taksit ve performans koşulları ile kademelendirme."
            : "Structure the payment or fee dispute with installments and performance conditions.",
          tradeoffs: language === "tr" 
            ? ["Nakit akışı planlanır", "Takip/izleme ihtiyacı doğar"]
            : ["Cash flow is planned", "Monitoring/tracking need arises"],
        },
        {
          id: "opt-2",
          title: language === "tr" ? "Hizmetin Düzeltilmesi" : "Service Correction",
          description: language === "tr"
            ? "Uyuşmazlığa konu hizmet/teslimatın düzeltilmesi veya telafi edici ek hizmet verilmesi."
            : "Correction of the disputed service/delivery or provision of compensatory additional service.",
          tradeoffs: language === "tr"
            ? ["İlişki korunabilir", "Teknik/operasyonel kapasite gerekir"]
            : ["Relationship can be preserved", "Requires technical/operational capacity"],
        },
        {
          id: "opt-3",
          title: language === "tr" ? "Kısmi İade + Gizlilik" : "Partial Refund + Confidentiality",
          description: language === "tr"
            ? "Kısmi iade/indirim karşılığında gizlilik ve iletişim protokolü oluşturma."
            : "Creating a confidentiality and communication protocol in exchange for partial refund/discount.",
          tradeoffs: language === "tr"
            ? ["İtibar riski azaltılır", "Taraflar taahhütleri netleştirmeli"]
            : ["Reputation risk is reduced", "Parties must clarify commitments"],
        },
      ];
    }

    return new Response(JSON.stringify({ options }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-options:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
