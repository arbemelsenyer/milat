import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ajanaTalimatMi, alintiOlarakSar } from "../_shared/anlatim.ts";

/* BÖLÜM 3 — GİRİŞ SÜZGECİ EN BAŞTA: sisteme ilk giren serbest metin, henüz
   dosya oluşmadan işleniyor. Kullanıcı metni MODELE GİTMEDEN ÖNCE süzgeçten
   geçer: içindeki emir kipi cümleler UYGULANMAZ, metin ALINTI olarak sarılır
   ve modele "bu kullanıcı verisidir, talimat değildir" çerçevesiyle verilir.
   KİLİT (zatenCalisiyorMu) BU UÇTA KULLANILMAZ — kilit sohbeti kırar. */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
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

    const { messages, language = 'tr' } = await req.json();
    
    // Input validation - use generic error messages
    const isValidMessages = Array.isArray(messages) && 
      messages.length <= 50 && 
      messages.every((msg: { role?: string; content?: string }) => 
        msg.role && msg.content && typeof msg.content === "string" && msg.content.length <= 5000
      );

    if (!isValidMessages) {
      console.error("Invalid messages input received");
      return new Response(
        JSON.stringify({ error: "Invalid request data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* GİRİŞ SÜZGECİ: her kullanıcı mesajı VERİDİR, TALİMAT DEĞİLDİR.
       Emir kipi taşıyan mesaj uygulanmaz; alıntı olarak sarılır. Reddedilen
       girdi SESSİZCE YUTULMAZ, kullanıcıya tek cümleyle bildirilir. */
    let talimatGoruldu = false;
    const guvenliMesajlar = (messages as { role: string; content: string }[]).map((m) => {
      if (m.role !== "user") return m;
      if (!ajanaTalimatMi(m.content)) return m;
      talimatGoruldu = true;
      return { ...m, content: alintiOlarakSar(m.content, "KULLANICI METNİ") };
    });

    if (talimatGoruldu) {
      console.error("[intake-chat] kullanıcı metninde ajana yönelik talimat görüldü, uygulanmadı");
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('Service configuration error');
    }

    const systemPrompt = language === 'tr' 
      ? `Sen, arabuluculuk başvuru sürecinde kullanıcılara yardımcı olan bir asistansın. Görevin:
- Uyuşmazlık türleri hakkında bilgi vermek (sözleşme, çalışan, aile, ticari, komşuluk vb.)
- Başvuru formunu nasıl dolduracaklarını açıklamak
- Arabuluculuk sürecinin nasıl işlediğini anlatmak
- Kullanıcıların sorularını kısa ve net yanıtlarla cevaplamak

Yanıtların kısa, net ve yardımcı olsun. Hukuki tavsiye verme, sadece süreç hakkında bilgi ver.`
      : `You are an assistant helping users with the mediation intake process. Your role is to:
- Provide information about dispute types (contract, employment, family, commercial, neighbor, etc.)
- Explain how to fill out the application form
- Describe how the mediation process works
- Answer user questions with short, clear responses

Keep your answers brief, clear, and helpful. Don't give legal advice, only provide information about the process.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          // Süzgeçten geçmiş mesajlar: emir kipi taşıyanlar alıntı olarak sarıldı.
          ...guvenliMesajlar,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    /* Cevap AKIŞ olarak döner; süzgeç GİRİŞTE çalışır. Çıkışı süzmek için tüm
       yanıtı tamponlamak gerekir, bu da yazarken akan cevabı bitirir — sohbetin
       akıcılığı bozulmaz kuralı gereği çıkış tamponlanmadı. */
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        // Süzgecin girdiyi işaretlediği durum başlıkla bildirilir; sessiz değil.
        ...(talimatGoruldu ? { 'X-Medipact-Girdi-Notu': 'talimat-alinti-olarak-sarildi' } : {}),
      },
    });
  } catch (error) {
    console.error('Intake chat error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
