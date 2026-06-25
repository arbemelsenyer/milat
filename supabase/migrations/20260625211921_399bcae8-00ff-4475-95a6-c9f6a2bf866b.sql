
-- 1) Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_session_invite BOOLEAN NOT NULL DEFAULT TRUE,
  email_session_reminder BOOLEAN NOT NULL DEFAULT TRUE,
  email_expert_updates BOOLEAN NOT NULL DEFAULT TRUE,
  email_mediator_assignment BOOLEAN NOT NULL DEFAULT TRUE,
  email_negotiation_updates BOOLEAN NOT NULL DEFAULT TRUE,
  inapp_session_invite BOOLEAN NOT NULL DEFAULT TRUE,
  inapp_session_reminder BOOLEAN NOT NULL DEFAULT TRUE,
  inapp_expert_updates BOOLEAN NOT NULL DEFAULT TRUE,
  inapp_mediator_assignment BOOLEAN NOT NULL DEFAULT TRUE,
  inapp_negotiation_updates BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification prefs"
  ON public.notification_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_notif_prefs_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Expert assignment audit log
CREATE TABLE IF NOT EXISTS public.expert_assignment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  assignment_id UUID,
  expert_id UUID,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expert_logs_case ON public.expert_assignment_logs(case_id, created_at DESC);

GRANT SELECT, INSERT ON public.expert_assignment_logs TO authenticated;
GRANT ALL ON public.expert_assignment_logs TO service_role;
ALTER TABLE public.expert_assignment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Case participants can view expert logs"
  ON public.expert_assignment_logs FOR SELECT TO authenticated
  USING (public.can_access_case(case_id, auth.uid()));

CREATE POLICY "Case participants can write expert logs"
  ON public.expert_assignment_logs FOR INSERT TO authenticated
  WITH CHECK (public.can_access_case(case_id, auth.uid()) AND actor_id = auth.uid());
