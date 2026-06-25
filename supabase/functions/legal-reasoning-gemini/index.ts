import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': key,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a Turkish legal expert. Always return strictly valid JSON only, no prose, no code fences.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Gateway error:', res.status, errText);
      const userMsg =
        res.status === 429 ? 'Rate limit aşıldı. Lütfen biraz sonra tekrar deneyin.' :
        res.status === 402 ? 'AI kredisi tükendi. Workspace ayarlarından kredi ekleyin.' :
        'AI servisi hatası';
      return new Response(JSON.stringify({ error: userMsg, detail: errText }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const raw: string = data.choices?.[0]?.message?.content || '';
    console.log('AI raw length:', raw.length);

    let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const start = text.search(/[\{\[]/);
    if (start !== -1) {
      const opener = text[start];
      const closer = opener === '[' ? ']' : '}';
      const end = text.lastIndexOf(closer);
      if (end > start) text = text.substring(start, end + 1);
    }

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Function error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
