import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  hatirlatmaPenceresi, hatirlatmaEtiketi, zatenGonderildiMi,
  oturumCevrimIciMi, oturumBicimMetni,
} from "./hatirlatma.ts";

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


const resend = {
  emails: {
    send: async (params: {
      from: string;
      to: string[];
      subject: string;
      html: string;
    }) => {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (!RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not set");
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to send email: ${error}`);
      }

      return response.json();
    },
  },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* NOT: buradaki eski `SessionWithDetails` arayüzü kaldırıldı. Terk edilmiş
   `mediator_requests` şemasını (user_id · mediator_id · scheduled_date)
   anlatıyordu, hiçbir yerde kullanılmıyordu ve okuyanı yanlış tabloya
   yönlendiriyordu. Gerçek kaynak `case_sessions`tir. */

/* Bu fonksiyonun okuduğu satırların yerel tipleri. Üretilmiş Supabase tipleri
   Deno tarafında bulunmadığı için `any` yerine küçük ve açık tipler yazılır. */
type Oturum = {
  id: string; case_id: string; session_type: string | null;
  meeting_type: string | null; video_link: string | null;
  notes: string | null; scheduled_at: string; status: string;
};
type DosyaKunye = {
  id: string; user_id: string | null; assigned_mediator_id: string | null;
  dispute_type: string | null; your_name: string | null; other_party_name: string | null;
};
type TarafKaydi = { id: string; user_id: string | null };
type Profil = { email: string | null; full_name: string | null };
type IzSatiri = { gerekce: string | null };

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // AuthZ: shared cron secret OR authenticated admin
    const cronSecret = Deno.env.get("CRON_SECRET");
    const provided = req.headers.get("x-cron-secret");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    let authorized = !!(cronSecret && provided && provided === cronSecret);
    if (!authorized) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: u } = await userClient.auth.getUser();
        if (u?.user) {
          const admin = createClient(supabaseUrl, supabaseServiceKey);
          const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
          authorized = isAdmin === true;
        }
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Starting session reminder check...");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the time window for 24-hour reminder
    // Sessions that are between 23 and 25 hours from now
    const now = new Date();
    const { baslangic: reminderStart, bitis: reminderEnd } = hatirlatmaPenceresi(now);

    console.log(`Checking for sessions between ${reminderStart.toISOString()} and ${reminderEnd.toISOString()}`);

    /* ── VERİ KAYNAĞI DÜZELTMESİ (24.08.2026 · P0) ────────────────────────
       Bu fonksiyon `mediator_requests` tablosunu `scheduled_date` sütunuyla
       sorguluyordu. O tablo CANLIDA BOŞTUR (0 satır) ve terk edilmiştir;
       gerçek oturumlar `case_sessions.scheduled_at`tedir (canlıda 31 satır).
       Yani cron'un yetkisi düzelse bile bu fonksiyon HİÇBİR ZAMAN hatırlatma
       gönderemezdi — 401 bu daha derin kusuru gizliyordu.
       `case_sessions`te `user_id`/`mediator_id` YOKTUR; alıcılar dosyadan
       çözülür: taraflar `case_parties`ten, arabulucu `cases`ten. */
    const { data: oturumlar, error: sessionsError } = await supabase
      .from("case_sessions")
      .select("id, case_id, session_type, meeting_type, video_link, notes, scheduled_at, status")
      .eq("status", "scheduled")
      .gte("scheduled_at", reminderStart.toISOString())
      .lt("scheduled_at", reminderEnd.toISOString());

    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError);
      throw sessionsError;
    }

    const sessions = (oturumlar ?? []) as Oturum[];
    if (sessions.length === 0) {
      console.log("No sessions require reminders at this time");
      return new Response(
        JSON.stringify({ success: true, message: "No sessions require reminders", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${sessions.length} sessions requiring reminders`);

    let sentCount = 0;
    const errors: string[] = [];

    for (const session of sessions) {
      try {
        /* MÜKERRER GÖNDERİM KAPISI. Pencere 2 saat geniş, cron saatlik → aynı
           oturum iki turda birden yakalanır. İz `ajan_gorevleri`de durur;
           varsa oturum atlanır. Motor kanununun "mükerrer yazım kapısı"
           kalıbıdır; yeni tablo açılmadı. Pencerenin geniş kalması bilerekdir:
           bir tur kaçarsa hatırlatma yine de gider. */
        const izEtiketi = hatirlatmaEtiketi(session.id);
        const { data: izSatirlari } = await supabase
          .from("ajan_gorevleri")
          .select("gerekce")
          .eq("case_id", session.case_id)
          .eq("gorev_tipi", "oturum_hatirlatma")
          .limit(200);
        if (zatenGonderildiMi((izSatirlari ?? []) as IzSatiri[], izEtiketi)) {
          console.log(`Reminder already sent for session ${session.id}`);
          continue;
        }

        // Dosya künyesi ve görevli arabulucu.
        const { data: dosyaSatiri } = await supabase
          .from("cases")
          .select("id, user_id, assigned_mediator_id, dispute_type, your_name, other_party_name")
          .eq("id", session.case_id)
          .maybeSingle();
        const caseDetails = (dosyaSatiri ?? null) as DosyaKunye | null;

        /* ALICILAR dosyadan çözülür (`case_sessions`te user_id/mediator_id yok).
           `user_id`si olmayan taraf atlanır: adres profilden gelir. */
        const { data: taraflar } = await supabase
          .from("case_parties")
          .select("id, user_id")
          .eq("case_id", session.case_id);
        const tarafListesi = ((taraflar ?? []) as TarafKaydi[]).filter((t) => t?.user_id);
        const mediatorId = caseDetails?.assigned_mediator_id ?? null;

        /* Arabulucunun profili BİR KEZ okunur: hem tarafın e-postasındaki
           "Mediator" satırında hem de arabulucunun kendi e-postasında kullanılır. */
        let arabulucuProfil: Profil | null = null;
        if (mediatorId) {
          const { data: mp } = await supabase
            .from("profiles").select("email, full_name").eq("user_id", mediatorId).maybeSingle();
          arabulucuProfil = (mp ?? null) as Profil | null;
        }

        const scheduledDate = new Date(session.scheduled_at);
        const formattedDate = scheduledDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });

        /* Oturum biçimi: ürünün gerçekten bildiği tek işaret video bağlantısıdır.
           Bağlantı varsa çevrim içi, yoksa yüz yüze. Uydurma yapılmaz. */
        const oturumCevrimIci = oturumCevrimIciMi(session);
        const sessionTypeText = oturumBicimMetni(session);

        let buOturumdaGonderilen = 0;

        // ── TARAFLAR ────────────────────────────────────────────────────────
        for (const taraf of tarafListesi) {
          const { data: profilSatiri } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("user_id", taraf.user_id)
            .maybeSingle();
          const tarafProfil = (profilSatiri ?? null) as Profil | null;
          if (!tarafProfil?.email) continue;

          const userEmailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Session Reminder</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Session Reminder</h1>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="color: #333; font-size: 16px;">Hello ${tarafProfil.full_name || "there"},</p>
                
                <p style="color: #333; font-size: 16px;">This is a friendly reminder that your mediation session is scheduled for <strong>tomorrow</strong>.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                  <h3 style="margin: 0 0 15px 0; color: #333;">Session Details</h3>
                  <p style="margin: 5px 0; color: #555;"><strong>📅 Date:</strong> ${formattedDate}</p>
                  <p style="margin: 5px 0; color: #555;"><strong>🕐 Time:</strong> ${formattedTime}</p>
                  <p style="margin: 5px 0; color: #555;"><strong>📍 Type:</strong> ${sessionTypeText}</p>
                  ${caseDetails?.dispute_type ? `<p style="margin: 5px 0; color: #555;"><strong>📋 Case:</strong> ${caseDetails.dispute_type}</p>` : ""}
                  ${arabulucuProfil?.full_name ? `<p style="margin: 5px 0; color: #555;"><strong>👤 Mediator:</strong> ${arabulucuProfil.full_name}</p>` : ""}
                </div>
                
                <h4 style="color: #333; margin-top: 25px;">How to Prepare:</h4>
                <ul style="color: #555; line-height: 1.8;">
                  <li>Review any documents related to your case</li>
                  <li>Prepare a list of key points you want to discuss</li>
                  <li>Find a quiet, private space for the session</li>
                  ${oturumCevrimIci ? "<li>Test your video and audio equipment beforehand</li>" : ""}
                </ul>
                
                ${session.notes ? `<p style="color: #555; background: #e8f4ff; padding: 15px; border-radius: 8px; margin-top: 20px;"><strong>Note from mediator:</strong> ${session.notes}</p>` : ""}
                
                <p style="color: #333; font-size: 16px; margin-top: 25px;">We look forward to seeing you!</p>
                
                <p style="color: #888; font-size: 14px; margin-top: 30px;">Best regards,<br>The MediPact AI Team</p>
              </div>
            </body>
            </html>
          `;

          /* İLETİŞİM TERCİHİ (İBA 1.5): hatırlatma ÖNEMLİ listede değildir —
             "yalnız önemli adımlar" ve "haftalık özet" seçildiğinde gönderilmez,
             sessiz saatte de düşer. Taraf kaydı burada kesin bilindiği için
             süzgeç doğrudan o tarafın kimliğiyle çalışır. */
          const izin = await gonderilsinMi(supabase, taraf.id, "hatirlatma");
          if (!izin.gonder) {
            console.log(`Reminder skipped (iletişim tercihi): ${izin.sebep}`);
            errors.push(`hatırlatma atlandı — iletişim tercihi: ${izin.sebep}`);
            continue;
          }

          await resend.emails.send({
            from: "MİLAT Arabuluculuk <info@milatmediation.com>",
            to: [tarafProfil.email],
            subject: `⏰ Reminder: Your Mediation Session is Tomorrow - ${formattedDate}`,
            html: userEmailHtml,
          });
          console.log(`Sent reminder to party: ${tarafProfil.email}`);
          sentCount++;
          buOturumdaGonderilen++;

          await supabase.rpc("create_notification", {
            p_user_id: taraf.user_id,
            p_title: "Session Reminder",
            p_message: `Your mediation session is tomorrow at ${formattedTime}. Please be prepared!`,
            p_type: "reminder",
            p_link: `/summary?case=${session.case_id}`,
          });
        }

        // ── ARABULUCU ───────────────────────────────────────────────────────
        if (mediatorId) {
          /* Arabulucuya gönderilen künyede taraf ADI yazılır; bu bilgi zaten
             dosyanın kendi künyesindedir (kör veri sınırı aşılmaz). */
          const tarafAdlari = caseDetails?.your_name ?? null;

          if (arabulucuProfil?.email) {
            const mediatorEmailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Session Reminder</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Upcoming Session Reminder</h1>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="color: #333; font-size: 16px;">Hello ${arabulucuProfil.full_name || "Mediator"},</p>
                
                <p style="color: #333; font-size: 16px;">This is a reminder that you have a mediation session scheduled for <strong>tomorrow</strong>.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #11998e;">
                  <h3 style="margin: 0 0 15px 0; color: #333;">Session Details</h3>
                  <p style="margin: 5px 0; color: #555;"><strong>📅 Date:</strong> ${formattedDate}</p>
                  <p style="margin: 5px 0; color: #555;"><strong>🕐 Time:</strong> ${formattedTime}</p>
                  <p style="margin: 5px 0; color: #555;"><strong>📍 Type:</strong> ${sessionTypeText}</p>
                  ${caseDetails?.dispute_type ? `<p style="margin: 5px 0; color: #555;"><strong>📋 Case:</strong> ${caseDetails.dispute_type}</p>` : ""}
                  ${caseDetails?.your_name && caseDetails?.other_party_name ? `<p style="margin: 5px 0; color: #555;"><strong>👥 Parties:</strong> ${caseDetails.your_name} vs ${caseDetails.other_party_name}</p>` : ""}
                  ${tarafAdlari ? `<p style="margin: 5px 0; color: #555;"><strong>👤 Client:</strong> ${tarafAdlari}</p>` : ""}
                </div>
                
                <p style="color: #333; font-size: 16px; margin-top: 25px;">Please review the case details before the session.</p>
                
                <p style="color: #888; font-size: 14px; margin-top: 30px;">Best regards,<br>The MediPact AI Team</p>
              </div>
            </body>
            </html>
          `;

            await resend.emails.send({
              from: "MİLAT Arabuluculuk <info@milatmediation.com>",
              to: [arabulucuProfil.email],
              subject: `⏰ Mediator Reminder: Session Tomorrow - ${formattedDate}`,
              html: mediatorEmailHtml,
            });
            console.log(`Sent reminder to mediator: ${arabulucuProfil.email}`);
            sentCount++;
            buOturumdaGonderilen++;
          }

          await supabase.rpc("create_notification", {
            p_user_id: mediatorId,
            p_title: "Session Reminder",
            p_message: `You have a mediation session tomorrow at ${formattedTime}.`,
            p_type: "reminder",
            p_link: `/mediator`,
          });
        }

        /* İZ: bir şey gönderildiyse yazılır. Hiç gönderilmediyse (adres yok ya
           da tercih kapalı) iz YAZILMAZ — sonraki tur yeniden denesin. */
        if (buOturumdaGonderilen > 0) {
          await supabase.from("ajan_gorevleri").insert({
            case_id: session.case_id,
            gorev_tipi: "oturum_hatirlatma",
            durum: "yapildi",
            hedef_party_id: null,
            gerekce: `${izEtiketi} 24 saat hatırlatması gönderildi (${buOturumdaGonderilen} alıcı)`,
            sonuc: "hatırlatma gönderildi",
          });
        }

      } catch (sessionError) {
        console.error(`Error processing session ${session.id}:`, sessionError);
        errors.push(`Session ${session.id}: ${sessionError instanceof Error ? sessionError.message : "Unknown error"}`);
      }
    }

    console.log(`Reminder process complete. Sent ${sentCount} emails.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${sessions.length} sessions, sent ${sentCount} reminder emails`,
        count: sentCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error) {
    console.error("Error in send-session-reminders:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
