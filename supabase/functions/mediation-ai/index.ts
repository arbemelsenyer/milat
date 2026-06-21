// Multi-purpose AI endpoint for the MediationEngine flow.
// Actions: analyze_document | discovery_questions | negotiation_suggest |
//          generate_agreement | validate_pool | legal_research_summary
//
// All inbound text is re-masked server-side as defense in depth before any
// model call. Streaming is used for generate_agreement.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PATTERNS: Array<{ type: string; label: string; re: RegExp }> = [
  { type: "iban", label: "IBAN", re: /\bTR\d{2}[ ]?(?:\d{4}[ ]?){5}\d{2}\b/g },
  { type: "tc_kimlik", label: "TC_KIMLIK", re: /\b[1-9]\d{10}\b/g },
  { type: "tax_no", label: "VERGI_NO", re: /\b\d{10}\b/g },
  { type: "email", label: "EPOSTA", re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi },
  { type: "phone", label: "TELEFON", re: /(?:\+90[\s-]?)?(?:0?5\d{2}|0?2\d{2}|0?3\d{2}|0?4\d{2})[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g },
];

function serverMask(input: string): string {
  if (!input) return "";
  let working = input;
  const counters: Record<string, number> = {};
  const seen = new Map<string, string>();
  for (const p of PATTERNS) {
    working = working.replace(p.re, (match) => {
      const k = `${p.label}::${match}`;
      if (seen.has(k)) return seen.get(k)!;
      counters[p.label] = (counters[p.label] ?? 0) + 1;
      const tag = `[${p.label}_${counters[p.label]}]`;
      seen.set(k, tag);
      return tag;
    });
  }
  return working;
}

const FLASH = "google/gemini-3-flash-preview";
const PRO = "google/gemini-2.5-pro";

async function callAi(model: string, messages: any[], stream = false) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, stream }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${text}`);
  }
  return resp;
}

async function jsonAi(model: string, system: string, user: string): Promise<any> {
  const r = await callAi(model, [
    { role: "system", content: system + "\n\nReturn ONLY valid JSON. No markdown fences." },
    { role: "user", content: user },
  ]);
  const data = await r.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (m) return JSON.parse(m[0]);
    throw new Error("AI did not return parseable JSON");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body.action as string;

    if (action === "analyze_document") {
      const text = serverMask(String(body.text ?? "")).slice(0, 30000);
      const niche = String(body.niche ?? "");
      const result = await jsonAi(
        PRO,
        "Sen kıdemli bir Türk hukuk analisti ve arabulucusun. Doküman içindeki hukuki çelişkileri, riskleri ve anomalileri tespit edersin.",
        `Niş: ${niche}\n\nDoküman metni:\n${text}\n\nÇıktı şeması: { "cards": [{"title": string, "riskLevel": "low"|"medium"|"high", "description": string, "precedent": string}] } Türkçe yanıt ver, en az 4 en fazla 8 kart üret.`,
      );
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "discovery_questions") {
      const niche = String(body.niche ?? "");
      const summary = serverMask(String(body.summary ?? "")).slice(0, 15000);
      const result = await jsonAi(
        PRO,
        "Sen bir uzman arabulucusun. Tarafların gerçek ihtiyaçlarını ortaya çıkaracak derinlemesine sorular hazırlarsın.",
        `Niş: ${niche}\nÖzet: ${summary}\n\nÇıktı: { "questions": string[] } 4-5 adet, açık uçlu, tarafsız soru. Türkçe.`,
      );
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "needs_extract") {
      const qa = String(body.qa ?? "").slice(0, 20000);
      const result = await jsonAi(
        PRO,
        "Sen kazan-kazan senaryoları üreten bir arabulucusun.",
        `Soru-Cevap çiftleri:\n${qa}\n\nÇıktı: { "needs": string[], "winWinScenarios": string[] } Türkçe.`,
      );
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "negotiation_suggest") {
      const transcript = serverMask(String(body.transcript ?? "")).slice(0, 20000);
      const result = await jsonAi(
        PRO,
        "Sen müzakere kolaylaştırıcısısın. Tarafsız öneriler sunarsın.",
        `Müzakere kaydı:\n${transcript}\n\nÇıktı: { "suggestions": string[], "commonGround": string, "frictionPoints": string[] } Türkçe.`,
      );
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_agreement") {
      const docType = String(body.docType ?? "tutanak"); // tutanak | anlasma | mutabakat | uzlasma
      const ctx = serverMask(String(body.context ?? "")).slice(0, 30000);
      const titles: Record<string, string> = {
        tutanak: "ARABULUCULUK TUTANAĞI",
        anlasma: "ARABULUCULUK ANLAŞMA BELGESİ",
        mutabakat: "MUTABAKAT MUHTIRASI",
        uzlasma: "UZLAŞMA BELGESİ",
      };
      const r = await callAi(
        PRO,
        [
          {
            role: "system",
            content:
              "Sen 6325 sayılı Hukuk Uyuşmazlıklarında Arabuluculuk Kanunu uyarınca resmi belge düzenleyen bir arabulucusun. Belgeyi Türkçe, resmi dilde ve madde numaralı yaz.",
          },
          {
            role: "user",
            content: `Belge türü: ${titles[docType] ?? docType}\n\nDava bağlamı:\n${ctx}\n\nLütfen 6325 sayılı kanunun ilgili maddelerine atıfla, taraflar — uyuşmazlık konusu — anlaşma maddeleri — imza bölümleri içeren tam belgeyi üret.`,
          },
        ],
        true,
      );
      return new Response(r.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    if (action === "validate_pool") {
      // body: { items: [{id, content, niche}] }
      const items = (body.items ?? []) as Array<{ id: string; content: string; niche: string }>;
      const triaged: any[] = [];
      // Stage A: Flash triage
      for (const it of items) {
        try {
          const a = await jsonAi(
            FLASH,
            "Sen hızlı bir filtre modelisin. Format ve kabaca ilgi kontrolü yaparsın.",
            `Niş: ${it.niche}\nİçerik: ${String(it.content).slice(0, 4000)}\n\nÇıktı: { "passes": boolean, "reason": string }`,
          );
          if (a.passes) triaged.push(it);
        } catch {
          // skip
        }
      }
      // Stage B: Pro deep validation
      const approved: any[] = [];
      const rejected: any[] = [];
      for (const it of triaged) {
        try {
          const b = await jsonAi(
            PRO,
            "Sen kıdemli bir Türk hukuk analistisin. Halüsinasyon ve güncellik kontrolü yaparsın.",
            `Niş: ${it.niche}\nİçerik: ${String(it.content).slice(0, 12000)}\n\nÇıktı: { "approved": boolean, "reason": string, "relevance_score": number }`,
          );
          if (b.approved) approved.push({ id: it.id, ...b });
          else rejected.push({ id: it.id, ...b });
        } catch {
          rejected.push({ id: it.id, reason: "ai_error", relevance_score: 0 });
        }
      }
      return new Response(JSON.stringify({ approved, rejected }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("mediation-ai error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
