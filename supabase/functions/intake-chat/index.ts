import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language = 'tr' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
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
          ...messages,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Intake chat error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
