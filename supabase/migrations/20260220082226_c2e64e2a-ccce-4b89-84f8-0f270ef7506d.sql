
-- 1. Add new columns to cases table
ALTER TABLE public.cases 
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS assigned_mediator_id uuid;

-- 2. Create case_parties table
CREATE TABLE public.case_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id uuid,
  role text NOT NULL CHECK (role IN ('claimant', 'respondent')),
  full_name text,
  email text,
  phone text,
  organization text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.case_parties ENABLE ROW LEVEL SECURITY;

-- 3. Create case_assignments table
CREATE TABLE public.case_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  mediator_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  note text
);
ALTER TABLE public.case_assignments ENABLE ROW LEVEL SECURITY;

-- 4. Create sessions table
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  scheduled_for timestamptz,
  duration_min int,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'completed', 'cancelled')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- 5. Create messages table
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 6. Add case_id to notifications
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE;

-- 7. Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ========== RLS POLICIES ==========

-- case_parties: Admins full access
CREATE POLICY "Admins full access case_parties" ON public.case_parties
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- case_parties: Case creator can manage
CREATE POLICY "Case creator can manage parties" ON public.case_parties
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.cases WHERE id = case_parties.case_id AND user_id = auth.uid())
  );

-- case_parties: Party can view own case parties
CREATE POLICY "Party can view case_parties" ON public.case_parties
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- case_parties: Assigned mediator can view
CREATE POLICY "Mediator can view assigned case_parties" ON public.case_parties
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.cases WHERE id = case_parties.case_id AND assigned_mediator_id = auth.uid())
  );

-- case_assignments: Admin full access
CREATE POLICY "Admins full access case_assignments" ON public.case_assignments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- case_assignments: Mediator can view own
CREATE POLICY "Mediator can view own assignments" ON public.case_assignments
  FOR SELECT TO authenticated USING (mediator_id = auth.uid());

-- case_assignments: Case owner can view
CREATE POLICY "Case owner can view assignments" ON public.case_assignments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.cases WHERE id = case_assignments.case_id AND user_id = auth.uid())
  );

-- sessions: Admin full access
CREATE POLICY "Admins full access sessions" ON public.sessions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- sessions: Mediator can manage assigned case sessions
CREATE POLICY "Mediator manages assigned sessions" ON public.sessions
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.cases WHERE id = sessions.case_id AND assigned_mediator_id = auth.uid())
  );

-- sessions: Case participants can view
CREATE POLICY "Case participants view sessions" ON public.sessions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.cases WHERE id = sessions.case_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.case_parties WHERE case_id = sessions.case_id AND user_id = auth.uid())
  );

-- messages: Admin full access
CREATE POLICY "Admins full access messages" ON public.messages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- messages: Participants can view
CREATE POLICY "Case participants view messages" ON public.messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.cases WHERE id = messages.case_id AND (user_id = auth.uid() OR assigned_mediator_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.case_parties WHERE case_id = messages.case_id AND user_id = auth.uid())
  );

-- messages: Participants can send
CREATE POLICY "Case participants send messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = sender_id AND (
      EXISTS (SELECT 1 FROM public.cases WHERE id = messages.case_id AND (user_id = auth.uid() OR assigned_mediator_id = auth.uid()))
      OR EXISTS (SELECT 1 FROM public.case_parties WHERE case_id = messages.case_id AND user_id = auth.uid())
    )
  );

-- cases: Add party-based SELECT access
CREATE POLICY "Parties can view their cases" ON public.cases
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.case_parties WHERE case_id = cases.id AND user_id = auth.uid())
  );

-- cases: Admin can update all (for assignment)
CREATE POLICY "Admins can update all cases" ON public.cases
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- cases: Mediator access via assigned_mediator_id
DROP POLICY IF EXISTS "Mediators can view assigned cases only" ON public.cases;
CREATE POLICY "Mediators view assigned cases" ON public.cases
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'mediator') AND assigned_mediator_id = auth.uid()
  );
