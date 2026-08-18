import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ── İLETİŞİM TERCİHİ SÜZGECİ (İBA 1.5, 1. tur) ───────────────────────────────
   Taraf kendi ekranından bildirim sıklığını ve sessiz saatlerini belirler
   (public.iletisim_tercihleri, UNIQUE party_id). Bu süzgeç YALNIZ "gönderilsin mi"
   kararını verir — e-posta metinlerine, konularına ve alıcılarına DOKUNMAZ.
     · her_adim (varsayılan) → hepsi gider.
     · onemli                → yalnız ÖNEMLİ türler gider.
     · haftalik_ozet         → yalnız ZAMANA BAĞLI türler gider (davet / değişiklik).
     · sessiz saat           → o aralıkta gönderilmez; ZAMANA BAĞLI türler istisnadır.
   FAIL-OPEN (kritik): party_id bilinmiyorsa, kayıt yoksa ya da sorgu hata verirse
   E-POSTA GÖNDERİLİR. Bir tercih sorgusu arızası oturum davetini susturamaz;
   tercih kaydı olmayan tarafta mevcut davranış birebir korunur.
   ERTELEME YOK (1. tur kararı): sessiz saate denk gelen bildirim kuyruğa alınmaz,
   atlanır ve sebebi dönüş gövdesine/ajan kaydına yazılır. Kuyruk 2. turda. */
type BildirimTuru =
  | "oturum_daveti" | "oturum_degisikligi" | "teklif" | "belge_talebi"
  | "surec_sonu" | "hatirlatma" | "bilgilendirme";
// Zamana bağlı: geciktirilemez. Sessiz saatte ve "haftalık özet" seçiliyken de gider.
const ZAMANA_BAGLI_TURLER: string[] = ["oturum_daveti", "oturum_degisikligi"];
const ONEMLI_TURLER: string[] = [
  ...ZAMANA_BAGLI_TURLER, "teklif", "belge_talebi", "surec_sonu",
];
const TERCIH_SAAT_DILIMI = "Europe/Istanbul";

/* Sessiz aralık kontrolü. Edge fonksiyon UTC'de koşar; karşılaştırma TÜRKİYE
   saatiyle yapılır (17.08 föy dersi: elle saat farkı eklenmez, Intl'e bırakılır).
   Gece devreden aralık (22:00–08:00) da doğru hesaplanır. */
function sessizSaatteMi(baslangic: unknown, bitis: unknown): boolean {
  const b = String(baslangic ?? "").slice(0, 5);
  const s = String(bitis ?? "").slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(b) || !/^\d{2}:\d{2}$/.test(s) || b === s) return false;
  const simdi = new Date().toLocaleTimeString("tr-TR", {
    timeZone: TERCIH_SAAT_DILIMI, hour: "2-digit", minute: "2-digit", hour12: false,
  }).slice(0, 5);
  return b < s ? (simdi >= b && simdi < s) : (simdi >= b || simdi < s);
}

async function gonderilsinMi(
  admin: any, partyId: string | null | undefined, tur: BildirimTuru,
): Promise<{ gonder: boolean; sebep: string }> {
  if (!partyId) return { gonder: true, sebep: "taraf kaydı yok → varsayılan gönderim" };
  try {
    const { data, error } = await admin.from("iletisim_tercihleri")
      .select("siklik, sessiz_baslangic, sessiz_bitis")
      .eq("party_id", partyId).maybeSingle();
    if (error || !data) return { gonder: true, sebep: "tercih kaydı yok → her_adim" };
    const siklik = String((data as any).siklik ?? "her_adim");
    const zamanaBagli = ZAMANA_BAGLI_TURLER.includes(tur);
    if (siklik === "onemli" && !ONEMLI_TURLER.includes(tur)) {
      return { gonder: false, sebep: `tercih 'yalnız önemli adımlar' — '${tur}' önemli listede değil` };
    }
    if (siklik === "haftalik_ozet" && !zamanaBagli) {
      return { gonder: false, sebep: `tercih 'haftalık özet' — '${tur}' zamana bağlı değil` };
    }
    if (!zamanaBagli && sessizSaatteMi((data as any).sessiz_baslangic, (data as any).sessiz_bitis)) {
      return { gonder: false, sebep: "sessiz saat aralığı — 1. turda erteleme yok, atlandı" };
    }
    return { gonder: true, sebep: "tercihe uygun" };
  } catch (e: any) {
    return { gonder: true, sebep: `tercih okunamadı (${String(e?.message ?? e).slice(0, 80)}) → gönderildi` };
  }
}


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TYPE_LABELS: Record<string, string> = {
  preliminary: "Ön Görüşme",
  main: "Ana Görüşme",
  private: "Özel Görüşme",
};

function buildCancelHtml(opts: {
  displayName: string;
  dateStr: string;
  timeStr: string;
  typeLabel: string;
  reason?: string | null;
}) {
  const { displayName, dateStr, timeStr, typeLabel, reason } = opts;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;line-height:1.6;color:#222;background:#f6f7f9;margin:0;padding:24px}
    .container{max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb}
    .header{background:#b91c1c;color:#fff;padding:24px;text-align:center}
    .content{padding:24px}
    .box{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;text-align:center}
    .date{font-size:20px;font-weight:bold;color:#991b1b;text-decoration:line-through}
    .time{font-size:16px;color:#b91c1c;margin-top:4px;text-decoration:line-through}
    .label{font-weight:bold;color:#374151}
    .footer{padding:16px 24px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;text-align:center}
    pre{white-space:pre-wrap;font-family:inherit;background:#f9fafb;padding:12px;border-radius:6px;border:1px solid #e5e7eb}
  </style></head><body>
    <div class="container">
      <div class="header"><h2 style="margin:0">Toplantı İptal Edildi</h2><div style="opacity:.9;margin-top:4px">MediPact AI Arabuluculuk</div></div>
      <div class="content">
        <p>Sayın ${displayName},</p>
        <p>Daha önce davet edildiğiniz aşağıdaki toplantı <strong>iptal edilmiştir</strong>.</p>
        <div class="box">
          <div class="date">${dateStr}</div>
          <div class="time">${timeStr}</div>
        </div>
        <p><span class="label">Toplantı Türü:</span> ${typeLabel}</p>
        ${reason ? `<p><span class="label">İptal Gerekçesi:</span></p><pre>${String(reason).replace(/</g, "&lt;")}</pre>` : ""}
        <p>Yeni bir toplantı planlandığında ayrıca bilgilendirileceksiniz. Sorularınız için arabulucunuzla iletişime geçebilirsiniz.</p>
      </div>
      <div class="footer">Saygılarımızla,<br><strong>MediPact AI Ekibi</strong></div>
    </div>
  </body></html>`;
}

function friendlyResendError(status: number, body: string): string {
  if (status === 401 || status === 403) return "E-posta servisi yetki hatası. Lütfen sistem yöneticisi ile iletişime geçin.";
  if (status === 422) return "Geçersiz e-posta adresi veya içerik.";
  if (status === 429) return "E-posta gönderim limiti aşıldı. Birkaç dakika sonra tekrar deneyin.";
  if (status >= 500) return "E-posta servisi geçici olarak ulaşılamıyor.";
  return `E-posta gönderilemedi (kod ${status}). ${body.slice(0, 180)}`;
}

async function sendResend(opts: { from: string; to: string[]; subject: string; html: string }) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("E-posta servisi yapılandırılmamış (RESEND_API_KEY eksik).");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("[cancel-meeting-invite] Resend hatası", { status: res.status, body: text });
    throw new Error(friendlyResendError(res.status, text));
  }
  try { return JSON.parse(text); } catch { return {}; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Yetkisiz erişim. Lütfen tekrar giriş yapın." }), {
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
      return new Response(JSON.stringify({ error: "Oturum doğrulanamadı." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const sessionId: string | undefined = body.sessionId;
    const reason: string | null = typeof body.reason === "string" ? body.reason : null;
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Geçersiz toplantı kimliği." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: session, error: sessErr } = await admin
      .from("case_sessions").select("*").eq("id", sessionId).maybeSingle();
    if (sessErr || !session) {
      return new Response(JSON.stringify({ error: "Toplantı bulunamadı." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: canAccess } = await admin.rpc("can_access_case", {
      _case_id: session.case_id, _user_id: user.id,
    });
    if (!canAccess) {
      return new Response(JSON.stringify({ error: "Bu toplantıya erişim yetkiniz yok." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.status === "cancelled") {
      return new Response(JSON.stringify({ error: "Bu toplantı zaten iptal edilmiş.", alreadyCancelled: true }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find parties that previously received an invite (sent log) OR all participants if invite_sent_at exists
    const participants = (session.participants ?? []) as Array<{ party_id?: string; user_id?: string }>;
    let partyIds = participants.map((p) => p.party_id).filter(Boolean) as string[];

    const { data: sentLogs } = await admin
      .from("meeting_invite_logs")
      .select("party_id")
      .eq("session_id", sessionId)
      .eq("status", "sent");
    const sentPartyIds = new Set((sentLogs ?? []).map((r: any) => r.party_id).filter(Boolean));
    if (sentPartyIds.size > 0) {
      partyIds = partyIds.filter((id) => sentPartyIds.has(id));
    } else if (!session.invite_sent_at) {
      partyIds = []; // no prior invites — nothing to cancel-notify
    }

    const { data: parties } = partyIds.length
      ? await admin.from("case_parties")
          .select("id, first_name, last_name, company_name, email, user_id")
          .in("id", partyIds)
      : { data: [] as any[] };

    const recipients = (parties ?? []).filter((p: any) => p.email);

    const when = new Date(session.scheduled_at);
    const dateStr = when.toLocaleDateString("tr-TR", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const timeStr = when.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    const typeLabel = TYPE_LABELS[session.session_type] ?? session.session_type;

    const results: Array<{ party_id: string; email: string; ok: boolean; error?: string }> = [];

    for (const p of recipients as any[]) {
      /* İLETİŞİM TERCİHİ (İBA 1.5): oturum iptali ZAMANA BAĞLIDIR — her sıklık
         seçeneğinde ve sessiz saatte de gider; geciktirilemez. */
      const izin = await gonderilsinMi(admin, p.id, "oturum_degisikligi");
      if (!izin.gonder) {
        results.push({ party_id: p.id, email: p.email, ok: false, error: `iletişim tercihi: ${izin.sebep}` });
        continue;
      }
      const displayName = p.company_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Değerli Taraf";
      const html = buildCancelHtml({ displayName, dateStr, timeStr, typeLabel, reason });
      try {
        const resp = await sendResend({
          from: "MİLAT Arabuluculuk <info@milatmediation.com>",
          to: [p.email],
          subject: `Toplantı İptal Edildi - ${typeLabel} - ${dateStr}`,
          html,
        });
        const resendId = (resp && (resp as any).id) || null;
        results.push({ party_id: p.id, email: p.email, ok: true });
        await admin.from("meeting_invite_logs").insert({
          session_id: sessionId, case_id: session.case_id, party_id: p.id,
          recipient_email: p.email, recipient_name: displayName,
          status: "cancelled", resend_message_id: resendId, error_message: reason,
        });
        if (p.user_id) {
          await admin.rpc("create_notification", {
            p_user_id: p.user_id,
            p_title: "Toplantı İptal Edildi",
            p_message: `${typeLabel} — ${dateStr} ${timeStr} iptal edildi.`,
            p_type: "warning",
            p_link: `/cases/${session.case_id}`,
          });
        }
      } catch (e: any) {
        const msg = e?.message ?? "Bilinmeyen hata";
        console.error("[cancel-meeting-invite] gönderim hatası", { party_id: p.id, email: p.email, error: msg });
        results.push({ party_id: p.id, email: p.email, ok: false, error: msg });
        await admin.from("meeting_invite_logs").insert({
          session_id: sessionId, case_id: session.case_id, party_id: p.id,
          recipient_email: p.email, recipient_name: displayName,
          status: "failed", error_message: `İptal bildirimi: ${msg}`,
        });
      }
    }

    // Always cancel the session even if no emails were due
    await admin.from("case_sessions")
      .update({ status: "cancelled" })
      .eq("id", sessionId);

    const sent = results.filter((r) => r.ok).length;
    const failed = results.length - sent;
    return new Response(JSON.stringify({
      success: true, cancelled: true, sent, failed, total: results.length, results,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[cancel-meeting-invite] Genel hata:", error);
    const msg = error instanceof Error ? error.message : "Bilinmeyen sistem hatası";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
