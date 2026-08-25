import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { kayitIzni, kayitIzniHataMetni } from "./kayit-izni.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // İç çağrı kapısı (randevu-teklif ile aynı desen): x-cron-secret CRON_SECRET ile
    // eşleşirse çağıran sistemin kendisidir, kullanıcı JWT'si aranmaz. Boş/yanlış
    // secret'ta mevcut JWT yolu aynen işler. Gövde sözleşmesi (sessionId) değişmez.
    const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
    const isCron = !!CRON_SECRET && req.headers.get('x-cron-secret') === CRON_SECRET;

    let user: { id: string } | null = null;
    if (!isCron) {
      // Get auth user from JWT
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        throw new Error('No authorization header');
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !authUser) {
        console.error('Auth error:', authError);
        throw new Error('Unauthorized');
      }
      user = authUser;
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    console.log(`Creating video room for session: ${sessionId}`);

    const { data: session, error: sessionError } = await supabase
      .from('case_sessions')
      // `*` bilerek: `kayitli` sütunu B18 göçüyle geliyor. Sütun adı listelenirse
      // göç çalıştırılmadan önce yapılan HER çağrı hata döner ve çalışan video
      // odası yolu kırılır. `*` ile sütun yoksa alan yalnızca undefined olur ve
      // aşağıdaki kapı (=== true) hiç çalışmaz — eski davranış aynen sürer.
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Session not found:', sessionError);
      throw new Error('Session not found');
    }

    const { data: caseRow, error: caseError } = await supabase
      .from('cases')
      .select('id, user_id, assigned_mediator_id')
      .eq('id', session.case_id)
      .single();

    if (caseError || !caseRow) {
      console.error('Case not found:', caseError);
      throw new Error('Case not found');
    }

    // Verify access: case owner, assigned mediator, or admin (same pattern as party-confidential-analysis).
    // İç çağrıda (x-cron-secret) bu kontrol atlanır — çağıran sistemin kendisidir.
    if (!isCron && user && caseRow.user_id !== user.id && caseRow.assigned_mediator_id !== user.id) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isAdmin = roles?.some(r => r.role === 'admin');
      if (!isAdmin) {
        throw new Error('Access denied');
      }
    }

    // If a room already exists for this session, return it — don't create a new one
    if (session.video_link) {
      console.log('Returning existing room:', session.video_link);
      return new Response(
        JSON.stringify({
          room_url: session.video_link,
          success: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---- B18: KAYIT İZNİ KAPISI ----------------------------------------
    // Yalnız `kayitli = true` işaretli oturumlarda çalışır. İşaret varsayılan
    // false olduğu için göç öncesinden gelen oturumların hiçbiri etkilenmez.
    // Kapı YENİ oda açmadan önce durur; hâlihazırda odası olan bir oturum
    // yukarıda zaten dönmüştür — çalışan bir görüşmeyi kapatmayız, kural
    // "onay yoksa kayıt AÇILMAZ" der, "süren toplantıyı kapat" demez.
    if (session.kayitli === true) {
      const [talepCevap, tarafCevap, uzmanCevap] = await Promise.all([
        supabase
          .from('kayit_onay_talepleri')
          .select('id, gonderim_zamani')
          .eq('case_id', session.case_id)
          .is('iptal_zamani', null)
          .order('gonderim_zamani', { ascending: false })
          .limit(1),
        supabase
          .from('case_parties')
          .select('id, vekil_ad_soyad')
          .eq('case_id', session.case_id),
        supabase
          .from('case_expert_assignments')
          .select('id, status')
          .eq('case_id', session.case_id),
      ]);

      if (talepCevap.error || tarafCevap.error || uzmanCevap.error) {
        const neden = talepCevap.error?.message ?? tarafCevap.error?.message ?? uzmanCevap.error?.message;
        console.error('Kayıt izni okunamadı:', neden);
        throw new Error(`Kayıt izni okunamadı: ${neden}`);
      }

      const talep = Array.isArray(talepCevap.data) && talepCevap.data.length > 0 ? talepCevap.data[0] : null;
      let onaylar: Array<{ katilimci_anahtari: string; durum: string }> = [];
      if (talep) {
        const { data: onayVerisi, error: onayHatasi } = await supabase
          .from('kayit_onaylari')
          .select('katilimci_anahtari, durum')
          .eq('talep_id', talep.id);
        if (onayHatasi) {
          console.error('Kayıt onayları okunamadı:', onayHatasi.message);
          throw new Error(`Kayıt onayları okunamadı: ${onayHatasi.message}`);
        }
        onaylar = (onayVerisi ?? []) as Array<{ katilimci_anahtari: string; durum: string }>;
      }

      const izin = kayitIzni({
        talep: talep as { id: string; gonderim_zamani: string } | null,
        taraflar: (tarafCevap.data ?? []) as Array<{ id: string; vekil_ad_soyad?: string | null }>,
        uzmanAtamalari: (uzmanCevap.data ?? []) as Array<{ id: string; status?: string | null }>,
        onaylar,
        simdiMs: Date.now(),
      });

      if (!izin.izinli) {
        // Günlüğe yalnız sayı yazılır; katılımcı adı/verisi yazılmaz (m.1, KVKK).
        console.log(
          `Kayıt izni yok (session ${sessionId}): ${izin.engeller.join(' · ')} ` +
          `[katılımcı ${izin.katilimciSayisi} · onay ${izin.onayVeren} · ret ${izin.retVeren} · bekleyen ${izin.bekleyen}]`
        );
        return new Response(
          JSON.stringify({
            success: false,
            kayit_engeli: true,
            error: kayitIzniHataMetni(izin),
            engeller: izin.engeller,
            kalan_dakika: izin.kalanDakika,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Jitsi rooms are public to anyone who knows the name, so the suffix must be
    // long and unguessable rather than a predictable counter or timestamp.
    const randomSuffix = crypto.randomUUID().replace(/-/g, '');
    const roomName = `MediPact-${sessionId.slice(0, 8)}-${randomSuffix}`;
    const roomUrl = `https://meet.jit.si/${roomName}`;

    console.log(`Generated Jitsi room: ${roomName}`);

    // Store the room link on the case_sessions row
    const { error: updateError } = await supabase
      .from('case_sessions')
      .update({ video_link: roomUrl })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session with room info:', updateError);
      // Don't fail - room was created successfully
    }

    // Create notifications for the case owner and the assigned mediator
    const notifications = [];
    // Toplantı aşaması 14.08'de 5 → 4 oldu; pv=2 bağlantının yeni numaralamada
    // olduğunu belirtir (pv taşımayan eski bağlantılar ekranda çevrilir).
    const caseLink = `/legal-reasoning?caseId=${caseRow.id}&phase=4&pv=2`;

    if (caseRow.user_id) {
      notifications.push({
        user_id: caseRow.user_id,
        title: 'Video Görüşme Odası Hazır',
        message: 'Arabuluculuk oturumunuz için video görüşme odası oluşturuldu.',
        type: 'info',
        link: caseLink,
      });
    }

    if (caseRow.assigned_mediator_id && caseRow.assigned_mediator_id !== caseRow.user_id) {
      notifications.push({
        user_id: caseRow.assigned_mediator_id,
        title: 'Video Görüşme Odası Hazır',
        message: 'Arabuluculuk oturumu için video görüşme odası oluşturuldu.',
        type: 'info',
        link: caseLink,
      });
    }

    // Send notifications using the database function
    for (const notif of notifications) {
      const { error: bildirimErr } = await supabase.rpc('create_notification', {
        p_user_id: notif.user_id,
        p_title: notif.title,
        p_message: notif.message,
        p_type: notif.type,
        p_link: notif.link,
      });
      if (bildirimErr) console.error("[create-video-room] bildirim gönderilemedi:", bildirimErr.message);
    }

    return new Response(
      JSON.stringify({
        room_url: roomUrl,
        success: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-video-room:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred',
        success: false
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
