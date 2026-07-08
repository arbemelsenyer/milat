import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Get auth user from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized');
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    console.log(`Creating video room for session: ${sessionId}`);

    const { data: session, error: sessionError } = await supabase
      .from('case_sessions')
      .select('id, case_id, video_link')
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

    // Verify access: case owner, assigned mediator, or admin (same pattern as party-confidential-analysis)
    if (caseRow.user_id !== user.id && caseRow.assigned_mediator_id !== user.id) {
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
    const caseLink = `/legal-reasoning?caseId=${caseRow.id}&phase=5`;

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
      await supabase.rpc('create_notification', {
        p_user_id: notif.user_id,
        p_title: notif.title,
        p_message: notif.message,
        p_type: notif.type,
        p_link: notif.link,
      });
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
