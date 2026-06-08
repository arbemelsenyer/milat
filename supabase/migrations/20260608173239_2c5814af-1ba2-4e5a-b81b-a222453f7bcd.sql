
-- Ensure RLS is enabled on realtime.messages (controls broadcast/presence subscriptions)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Clean up any prior custom policies we may have created
DROP POLICY IF EXISTS "Authenticated users can subscribe to authorized topics" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can broadcast to authorized topics" ON realtime.messages;

-- Helper: check whether the currently-authenticated user is allowed
-- to subscribe to / publish on a given Realtime topic string.
CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_prefix text;
  v_id_text text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL OR _topic IS NULL THEN
    RETURN false;
  END IF;

  -- Expected formats: "case:<uuid>", "user:<uuid>", "notifications:<uuid>"
  v_prefix := split_part(_topic, ':', 1);
  v_id_text := split_part(_topic, ':', 2);

  IF v_id_text IS NULL OR length(v_id_text) = 0 THEN
    RETURN false;
  END IF;

  BEGIN
    v_id := v_id_text::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;

  IF v_prefix = 'user' OR v_prefix = 'notifications' THEN
    RETURN v_id = v_uid;
  ELSIF v_prefix = 'case' THEN
    RETURN public.can_access_case(v_id, v_uid);
  END IF;

  RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_realtime_topic(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_realtime_topic(text) TO authenticated, service_role;

-- Restrict reading (subscribing to) broadcast/presence messages
CREATE POLICY "Authenticated users can subscribe to authorized topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.can_access_realtime_topic((realtime.topic())::text));

-- Restrict writing (broadcasting/presence) to the same authorized topics
CREATE POLICY "Authenticated users can broadcast to authorized topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.can_access_realtime_topic((realtime.topic())::text));
