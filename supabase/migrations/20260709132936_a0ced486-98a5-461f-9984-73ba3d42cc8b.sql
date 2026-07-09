
-- 1) Tighten case_parties mediator UPDATE policy: require mediator role
DROP POLICY IF EXISTS "Mediator can update assigned case_parties" ON public.case_parties;
CREATE POLICY "Mediator can update assigned case_parties"
  ON public.case_parties
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'mediator'::app_role) AND public.is_case_mediator(case_id, auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'mediator'::app_role) AND public.is_case_mediator(case_id, auth.uid()));

-- 2) Scope public-role policies to authenticated on sensitive tables

-- agreement_documents
DROP POLICY IF EXISTS "Admin full agreement docs" ON public.agreement_documents;
CREATE POLICY "Admin full agreement docs" ON public.agreement_documents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Mediator manages agreement docs" ON public.agreement_documents;
CREATE POLICY "Mediator manages agreement docs" ON public.agreement_documents
  FOR ALL TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()))
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()));

DROP POLICY IF EXISTS "Parties view agreement docs" ON public.agreement_documents;
CREATE POLICY "Parties view agreement docs" ON public.agreement_documents
  FOR SELECT TO authenticated
  USING (public.is_case_party(case_id, auth.uid()));

-- case_discovery_questions
DROP POLICY IF EXISTS "Mediator manages discovery" ON public.case_discovery_questions;
CREATE POLICY "Mediator manages discovery" ON public.case_discovery_questions
  FOR ALL TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()))
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()));

DROP POLICY IF EXISTS "Mediator sees all discovery" ON public.case_discovery_questions;
CREATE POLICY "Mediator sees all discovery" ON public.case_discovery_questions
  FOR SELECT TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()));

DROP POLICY IF EXISTS "Party answers own discovery" ON public.case_discovery_questions;
CREATE POLICY "Party answers own discovery" ON public.case_discovery_questions
  FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()) AND public.is_case_party(case_id, auth.uid()))
  WITH CHECK ((user_id = auth.uid()) AND public.is_case_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Party sees own discovery" ON public.case_discovery_questions;
CREATE POLICY "Party sees own discovery" ON public.case_discovery_questions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- case_documents
DROP POLICY IF EXISTS "Admins can view all documents" ON public.case_documents;
CREATE POLICY "Admins can view all documents" ON public.case_documents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Mediator sees all case documents" ON public.case_documents;
CREATE POLICY "Mediator sees all case documents" ON public.case_documents
  FOR SELECT TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()));

DROP POLICY IF EXISTS "Mediator uploads case docs" ON public.case_documents;
CREATE POLICY "Mediator uploads case docs" ON public.case_documents
  FOR INSERT TO authenticated
  WITH CHECK ((uploaded_by = auth.uid()) AND public.is_case_mediator(case_id, auth.uid()));

DROP POLICY IF EXISTS "Party sees own uploads only" ON public.case_documents;
CREATE POLICY "Party sees own uploads only" ON public.case_documents
  FOR SELECT TO authenticated
  USING ((uploaded_by = auth.uid()) AND public.is_case_party(case_id, auth.uid()));

DROP POLICY IF EXISTS "Party uploads own docs" ON public.case_documents;
CREATE POLICY "Party uploads own docs" ON public.case_documents
  FOR INSERT TO authenticated
  WITH CHECK ((uploaded_by = auth.uid()) AND public.is_case_party(case_id, auth.uid()));

-- common_ground_reports
DROP POLICY IF EXISTS "Admin full common ground" ON public.common_ground_reports;
CREATE POLICY "Admin full common ground" ON public.common_ground_reports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Mediator only common ground" ON public.common_ground_reports;
CREATE POLICY "Mediator only common ground" ON public.common_ground_reports
  FOR ALL TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()))
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()));

-- mediator_requests
DROP POLICY IF EXISTS "Admins can update all requests" ON public.mediator_requests;
CREATE POLICY "Admins can update all requests" ON public.mediator_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Mediators can update assigned requests only" ON public.mediator_requests;
CREATE POLICY "Mediators can update assigned requests only" ON public.mediator_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'mediator'::app_role) AND (mediator_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own requests" ON public.mediator_requests;
CREATE POLICY "Users can insert their own requests" ON public.mediator_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own requests" ON public.mediator_requests;
CREATE POLICY "Users can update their own requests" ON public.mediator_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- negotiation_rounds
DROP POLICY IF EXISTS "Admin full rounds" ON public.negotiation_rounds;
CREATE POLICY "Admin full rounds" ON public.negotiation_rounds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Mediator manages rounds" ON public.negotiation_rounds;
CREATE POLICY "Mediator manages rounds" ON public.negotiation_rounds
  FOR ALL TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()))
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()));

-- party_analyses
DROP POLICY IF EXISTS "Admin full party_analyses" ON public.party_analyses;
CREATE POLICY "Admin full party_analyses" ON public.party_analyses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Mediator manages party analyses" ON public.party_analyses;
CREATE POLICY "Mediator manages party analyses" ON public.party_analyses
  FOR ALL TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()))
  WITH CHECK (public.is_case_mediator(case_id, auth.uid()));

DROP POLICY IF EXISTS "Mediator sees all party analyses" ON public.party_analyses;
CREATE POLICY "Mediator sees all party analyses" ON public.party_analyses
  FOR SELECT TO authenticated
  USING (public.is_case_mediator(case_id, auth.uid()));

-- reschedule_requests
DROP POLICY IF EXISTS "Admins can view all reschedule requests" ON public.reschedule_requests;
CREATE POLICY "Admins can view all reschedule requests" ON public.reschedule_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

-- session_feedback
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.session_feedback;
CREATE POLICY "Admins can view all feedback" ON public.session_feedback
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

-- 3) Revoke anon EXECUTE from SECURITY DEFINER trigger function
REVOKE EXECUTE ON FUNCTION public.enforce_case_parties_self_update() FROM PUBLIC, anon;

-- Belt-and-suspenders: ensure anon cannot execute other SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.enforce_case_expert_assignment_party_update() FROM PUBLIC, anon;
