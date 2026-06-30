
CREATE TABLE IF NOT EXISTS public.meeting_invite_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.case_sessions(id) ON DELETE CASCADE,
  case_id UUID NOT NULL,
  party_id UUID,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','sent','failed')),
  resend_message_id TEXT,
  error_message TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.meeting_invite_logs TO authenticated;
GRANT ALL ON public.meeting_invite_logs TO service_role;

ALTER TABLE public.meeting_invite_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Case members can view invite logs"
  ON public.meeting_invite_logs
  FOR SELECT
  TO authenticated
  USING (public.can_access_case(case_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_meeting_invite_logs_session ON public.meeting_invite_logs(session_id);
