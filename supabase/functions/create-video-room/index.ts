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
    const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!DAILY_API_KEY) {
      console.error('DAILY_API_KEY not configured');
      throw new Error('Video service not configured');
    }

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

    const { requestId } = await req.json();

    if (!requestId) {
      throw new Error('Request ID is required');
    }

    console.log(`Creating video room for request: ${requestId}`);

    // Check if user has access to this request (either as owner or assigned mediator)
    const { data: request, error: requestError } = await supabase
      .from('mediator_requests')
      .select('id, user_id, mediator_id, room_url, room_name')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      console.error('Request not found:', requestError);
      throw new Error('Request not found');
    }

    // Verify access
    if (request.user_id !== user.id && request.mediator_id !== user.id) {
      // Check if user is admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      const isAdmin = roles?.some(r => r.role === 'admin');
      if (!isAdmin) {
        throw new Error('Access denied');
      }
    }

    // If room already exists, return it
    if (request.room_url && request.room_name) {
      console.log('Returning existing room:', request.room_name);
      return new Response(
        JSON.stringify({ 
          room_url: request.room_url, 
          room_name: request.room_name 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a new Daily.co room
    const roomName = `mediation-${requestId.slice(0, 8)}-${Date.now()}`;
    
    console.log(`Creating Daily.co room: ${roomName}`);

    const dailyResponse = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          // Room expires after 24 hours
          exp: Math.floor(Date.now() / 1000) + 86400,
          // Enable features
          enable_chat: true,
          enable_screenshare: true,
          enable_knocking: true,
          enable_prejoin_ui: true,
          // Max participants (2 parties + mediator)
          max_participants: 5,
          // Auto-close room when empty
          eject_at_room_exp: true,
        }
      }),
    });

    if (!dailyResponse.ok) {
      const errorText = await dailyResponse.text();
      console.error('Daily.co API error:', errorText);
      throw new Error('Failed to create video room');
    }

    const room = await dailyResponse.json();
    console.log('Daily.co room created:', room.url);

    // Store room info in the database
    const { error: updateError } = await supabase
      .from('mediator_requests')
      .update({
        room_url: room.url,
        room_name: room.name,
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating request with room info:', updateError);
      // Don't fail - room was created successfully
    }

    // Create notifications for both parties
    const notifications = [];
    
    if (request.user_id) {
      notifications.push({
        user_id: request.user_id,
        title: 'Video Görüşme Odası Hazır',
        message: 'Arabuluculuk oturumunuz için video görüşme odası oluşturuldu.',
        type: 'info',
        link: `/summary?case=${requestId}`,
      });
    }

    if (request.mediator_id && request.mediator_id !== request.user_id) {
      notifications.push({
        user_id: request.mediator_id,
        title: 'Video Görüşme Odası Hazır',
        message: 'Arabuluculuk oturumu için video görüşme odası oluşturuldu.',
        type: 'info',
        link: `/mediator`,
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
        room_url: room.url, 
        room_name: room.name,
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
