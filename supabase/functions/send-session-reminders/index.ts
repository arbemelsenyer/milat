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
type TarafKaydi = {
  id: string; user_id: string | null; email: string | null;
  first_name: string | null; last_name: string | null; company_name: string | null;
};
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

    /* TEK HATIRLATMA YOLU VARDIR VE BURASI DEĞİLDİR (24.08.2026 kararı).
       Ürünün gerçek hatırlatma kolu `ajan-nobetci`dedir:
       `oturumHatirlatmaGorevleriAc` 24 saat içindeki her planlı oturum için
       görev açar, `oturumHatirlatmaYurut` onu yürütür. O kol 3 dakikada bir
       koşar, Türkçe yazar, adresi `case_parties.email`ten alır, iletişim
       tercihini uygular, video bağlantısını ve arabulucu imzasını ekler.
       Bu fonksiyon ise ESKİ İNGİLİZCE koldu ve terk edilmiş `mediator_requests`
       tablosunu sorguluyordu (canlıda 0 satır) — yani hiç çalışmıyordu.
       KOPYA YAZILMADI: 24 saatlik pencere zaten nöbetçinin kapsamındadır.
       İki kol birlikte çalışsaydı taraf AYNI hatırlatmayı iki kez alırdı;
       dahası bu fonksiyonun yazacağı `oturum_hatirlatma` satırı nöbetçinin
       mükerrer kapısını tetikleyip DOĞRU kolu susturacaktı.
       Cron işi (jobid 1) bilerek duruyor: saatlik 200, denetim kanalında
       görünür bir nabız. İş yapmaz. */
    return new Response(
      JSON.stringify({
        success: true,
        devredildi: "ajan-nobetci",
        message: "Oturum hatırlatmaları ajan-nobetci kolu tarafından gönderilir; bu uç nokta iş yapmaz.",
        count: 0,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in send-session-reminders:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
