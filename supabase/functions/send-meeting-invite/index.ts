import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TYPE_LABELS: Record<string, string> = {
  preliminary: "Ön Görüşme",
  main: "Ana Görüşme",
  private: "Özel Görüşme",
};

async function sendResend(opts: { from: string; to: string[]; subject: string; html: string }) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY tanımlı değil");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw new Error(`Resend hatası: ${res.status} - ${await res.text()}`);
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Yetkisiz" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Yetkisiz" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== "string") {
      return new Response(JSON.stringify({ error: "Geçersiz sessionId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: session, error: sessErr } = await admin
      .from("case_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessErr || !session) {
      return new Response(JSON.stringify({ error: "Toplantı bulunamadı" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: user must be case owner, mediator or party
    const { data: canAccess } = await admin.rpc("can_access_case", {
      _case_id: session.case_id, _user_id: user.id,
    });
    if (!canAccess) {
      return new Response(JSON.stringify({ error: "Bu toplantıya erişim yetkiniz yok" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const participants = (session.participants ?? []) as Array<{ party_id?: string; user_id?: string; role?: string }>;
    const partyIds = participants.map((p) => p.party_id).filter(Boolean) as string[];

    const { data: parties } = await admin
      .from("case_parties")
      .select("id, first_name, last_name, company_name, email, party_role, user_id")
      .in("id", partyIds.length ? partyIds : ["00000000-0000-0000-0000-000000000000"]);

    const recipients = (parties ?? []).filter((p: any) => p.email);
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "Email adresi olan taraf bulunamadı", sent: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const when = new Date(session.scheduled_at);
    const dateStr = when.toLocaleDateString("tr-TR", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const timeStr = when.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    const typeLabel = TYPE_LABELS[session.session_type] ?? session.session_type;

    const results: Array<{ email: string; ok: boolean; error?: string }> = [];

    for (const p of recipients as any[]) {
      const displayName =
        p.company_name ||
        `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() ||
        "Değerli Taraf";

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body{font-family:Arial,sans-serif;line-height:1.6;color:#222;background:#f6f7f9;margin:0;padding:24px}
        .container{max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb}
        .header{background:#2c7a7b;color:#fff;padding:24px;text-align:center}
        .content{padding:24px}
        .box{background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:16px;margin:16px 0;text-align:center}
        .date{font-size:20px;font-weight:bold;color:#0f766e}
        .time{font-size:16px;color:#0d9488;margin-top:4px}
        .label{font-weight:bold;color:#374151}
        .footer{padding:16px 24px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;text-align:center}
        pre{white-space:pre-wrap;font-family:inherit;background:#f9fafb;padding:12px;border-radius:6px;border:1px solid #e5e7eb}
      </style></head><body>
        <div class="container">
          <div class="header"><h2 style="margin:0">Toplantı Daveti</h2><div style="opacity:.9;margin-top:4px">MediPact AI Arabuluculuk</div></div>
          <div class="content">
            <p>Sayın ${displayName},</p>
            <p>Arabuluculuk sürecinizle ilgili aşağıdaki toplantıya davetlisiniz.</p>
            <div class="box">
              <div class="date">${dateStr}</div>
              <div class="time">${timeStr}</div>
            </div>
            <p><span class="label">Toplantı Türü:</span> ${typeLabel}</p>
            ${session.notes ? `<p><span class="label">Gündem / Notlar:</span></p><pre>${String(session.notes).replace(/</g, "&lt;")}</pre>` : ""}
            <p>Lütfen belirtilen tarih ve saatte hazır bulununuz. Toplantıya bağlantı linki, başlamadan kısa süre önce paylaşılacaktır.</p>
            <p>Sorularınız için arabulucunuzla iletişime geçebilirsiniz.</p>
          </div>
          <div class="footer">Saygılarımızla,<br><strong>MediPact AI Ekibi</strong></div>
        </div>
      </body></html>`;

      try {
        await sendResend({
          from: "MediPact AI <onboarding@resend.dev>",
          to: [p.email],
          subject: `Toplantı Daveti - ${typeLabel} - ${dateStr}`,
          html,
        });
        results.push({ email: p.email, ok: true });

        if (p.user_id) {
          await admin.rpc("create_notification", {
            p_user_id: p.user_id,
            p_title: "Toplantı Daveti Gönderildi",
            p_message: `${typeLabel} — ${dateStr} ${timeStr}`,
            p_type: "info",
            p_link: `/case-room/${session.case_id}`,
          });
        }
      } catch (e: any) {
        console.error("Email gönderim hatası:", p.email, e);
        results.push({ email: p.email, ok: false, error: e.message });
      }
    }

    const sentCount = results.filter((r) => r.ok).length;
    return new Response(JSON.stringify({ success: true, sent: sentCount, total: results.length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-meeting-invite hatası:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Bilinmeyen hata" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
