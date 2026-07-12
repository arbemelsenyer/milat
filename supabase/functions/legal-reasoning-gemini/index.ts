import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Require authenticated user to prevent anonymous AI credit abuse
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supaUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: claimsErr } = await supaUser.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    );
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('legal-reasoning-gemini caller:', claims.claims.sub);

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

    // RAG grounding: embed the dispute description and pull matching chunks from the
    // Ministry of Justice mediation knowledge base, same pattern as
    // supabase/functions/party-confidential-analysis/index.ts.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const nisMatch = prompt.match(/Nis Alan:\s*([^\n]+)/i);
    const uyusMatch = prompt.match(/Uyusmazlik:\s*([\s\S]*?)(?:\n\n|$)/i);
    const ragQuery = (uyusMatch?.[1] || prompt).trim();
    const ragCategory = mapDisputeToCategory(nisMatch?.[1] ?? null, null);
    const { block: ragBlock, sources: ragSources } = await fetchKnowledgeBlock(admin, key, ragQuery, ragCategory);

    const systemPrompt = `You are a Turkish legal expert. Always return strictly valid JSON only, no prose, no code fences.
Sana "İLGİLİ KAYNAK BİLGİSİ" bloğu verilirse, emsal karar veya kaynak/referans alanlarını SADECE bu blokta verilen kaynaklardan doldur ve mümkünse kaynak adını belirt.
KESİN KURAL: Blok boşsa veya sorunla ilgili kaynak yoksa ASLA uydurma karar numarası, tarih veya referans üretme. Bu durumda ilgili tekil alanlara (ör. "emsal") tam olarak "Yeterli veri yok" yaz; ilgili dizi alanlarına (ör. "kaynaklar") boş dizi ([]) döndür.`;

    const userContent = `${ragBlock}${prompt}`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': key,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
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
    console.log('AI raw length:', raw.length, '| RAG sources:', ragSources.length);

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

function mapDisputeToCategory(disputeType?: string | null, subtype?: string | null): string | null {
  const CATS = ["işçi_işveren","ticari","tüketici","sağlık","inşaat","sigorta","bankacılık","aile","spor","enerji_maden","kira","gayrimenkul","genel"];
  const raw = (disputeType ?? "").trim().toLowerCase();
  const t = `${disputeType ?? ""} ${subtype ?? ""}`.toLowerCase();
  // IP pilotu adım 1: eski slug ("fikri_mülkiyet", classify-dispute çıktısı) ve yeni
  // taksonomi slug'ı ("fikri_mulkiyet", başvuru formu) ile marka/patent/tasarım/telif
  // içeren serbest metin tespitlerini tek bilgi tabanı kategorisinde birleştir.
  if (raw === "fikri_mulkiyet" || raw === "fikri_mülkiyet" || /fikri|marka|patent|tasarım|tasarim|telif/.test(t)) {
    return "fikri_mulkiyet";
  }
  if (CATS.includes(raw)) return raw === "genel" ? null : raw;
  if (/kira/.test(t)) return "kira";
  if (/gayrimenkul|tapu|emlak/.test(t)) return "gayrimenkul";
  if (/iş|isci|işçi|işveren|isveren|kıdem|kidem/.test(t)) return "işçi_işveren";
  if (/ticari|ticaret|şirket|sirket/.test(t)) return "ticari";
  if (/tüketici|tuketici/.test(t)) return "tüketici";
  if (/aile|boşan|bosan|nafaka|velayet/.test(t)) return "aile";
  if (/sigorta/.test(t)) return "sigorta";
  if (/sağlık|saglik|malpraktis/.test(t)) return "sağlık";
  if (/inşaat|insaat|yapı|yapi/.test(t)) return "inşaat";
  if (/enerji|maden/.test(t)) return "enerji_maden";
  if (/banka|finans|kredi/.test(t)) return "bankacılık";
  if (/spor/.test(t)) return "spor";
  return null;
}

async function fetchKnowledgeBlock(admin: any, apiKey: string, query: string, category: string | null): Promise<{ block: string; sources: any[]; embedding: number[] | null }> {
  try {
    if (!query || query.trim().length < 10) return { block: "", sources: [], embedding: null };
    const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/text-embedding-3-small", input: query, dimensions: 768 }),
    });
    if (!embRes.ok) return { block: "", sources: [], embedding: null };
    const embJson = await embRes.json();
    const vec = embJson?.data?.[0]?.embedding;
    if (!vec) return { block: "", sources: [], embedding: null };
    const { data } = await admin.rpc("match_knowledge_base", {
      query_embedding: vec, filter_category: category, match_count: 5, match_threshold: 0.65,
    });
    if (!data || data.length === 0) return { block: "", sources: [], embedding: vec };
    const sources = data.map((r: any) => ({
      title: r.source_title,
      url: r.source_url,
      category: r.category,
      excerpt: String(r.chunk_text ?? "").slice(0, 400),
      similarity: r.similarity,
    }));
    const parts = data.map((r: any) =>
      `[Kaynak: ${r.source_title}]\n${r.chunk_text}`
    ).join("\n\n");
    const block = `\n═══ İLGİLİ KAYNAK BİLGİSİ (Adalet Bakanlığı Arabuluculuk Daire Başkanlığı resmi yayınlarından) ═══\n${parts}\n═══════════════════════════\n\n`;
    return { block, sources, embedding: vec };
  } catch {
    return { block: "", sources: [], embedding: null };
  }
}
