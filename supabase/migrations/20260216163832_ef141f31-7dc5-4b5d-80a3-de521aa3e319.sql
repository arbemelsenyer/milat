
-- 1. Session Rescheduling
CREATE TABLE public.reschedule_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mediator_request_id UUID NOT NULL REFERENCES public.mediator_requests(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  proposed_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reschedule_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reschedule requests for their sessions"
ON public.reschedule_requests FOR INSERT
WITH CHECK (auth.uid() = requested_by AND EXISTS (
  SELECT 1 FROM mediator_requests mr WHERE mr.id = mediator_request_id AND (mr.user_id = auth.uid() OR mr.mediator_id = auth.uid())
));

CREATE POLICY "Users can view their reschedule requests"
ON public.reschedule_requests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM mediator_requests mr WHERE mr.id = mediator_request_id AND (mr.user_id = auth.uid() OR mr.mediator_id = auth.uid())
));

CREATE POLICY "Mediators can update reschedule requests for assigned sessions"
ON public.reschedule_requests FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM mediator_requests mr WHERE mr.id = mediator_request_id AND mr.mediator_id = auth.uid()
) AND has_role(auth.uid(), 'mediator'));

CREATE POLICY "Admins can view all reschedule requests"
ON public.reschedule_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_reschedule_requests_updated_at
BEFORE UPDATE ON public.reschedule_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Document Sharing
CREATE TABLE public.case_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can upload documents to their cases"
ON public.case_documents FOR INSERT
WITH CHECK (auth.uid() = uploaded_by AND EXISTS (
  SELECT 1 FROM cases c WHERE c.id = case_id AND c.user_id = auth.uid()
));

CREATE POLICY "Mediators can upload documents to assigned cases"
ON public.case_documents FOR INSERT
WITH CHECK (has_role(auth.uid(), 'mediator') AND EXISTS (
  SELECT 1 FROM mediator_requests mr WHERE mr.case_id = case_documents.case_id AND mr.mediator_id = auth.uid()
));

CREATE POLICY "Users can view documents for their cases"
ON public.case_documents FOR SELECT
USING (EXISTS (
  SELECT 1 FROM cases c WHERE c.id = case_id AND c.user_id = auth.uid()
));

CREATE POLICY "Mediators can view documents for assigned cases"
ON public.case_documents FOR SELECT
USING (has_role(auth.uid(), 'mediator') AND EXISTS (
  SELECT 1 FROM mediator_requests mr WHERE mr.case_id = case_documents.case_id AND mr.mediator_id = auth.uid()
));

CREATE POLICY "Users can delete their own documents"
ON public.case_documents FOR DELETE
USING (auth.uid() = uploaded_by);

CREATE POLICY "Admins can view all documents"
ON public.case_documents FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Storage bucket for case documents
INSERT INTO storage.buckets (id, name, public) VALUES ('case-documents', 'case-documents', false);

CREATE POLICY "Users can upload case documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'case-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their case documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'case-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own case documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'case-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Post-Session Feedback
CREATE TABLE public.session_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mediator_request_id UUID NOT NULL REFERENCES public.mediator_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  mediator_rating INTEGER CHECK (mediator_rating >= 1 AND mediator_rating <= 5),
  fairness_rating INTEGER CHECK (fairness_rating >= 1 AND fairness_rating <= 5),
  would_recommend BOOLEAN,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mediator_request_id, user_id)
);

ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit feedback for their sessions"
ON public.session_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM mediator_requests mr WHERE mr.id = mediator_request_id AND mr.user_id = auth.uid()
));

CREATE POLICY "Users can view their own feedback"
ON public.session_feedback FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Mediators can view feedback for their sessions"
ON public.session_feedback FOR SELECT
USING (has_role(auth.uid(), 'mediator') AND EXISTS (
  SELECT 1 FROM mediator_requests mr WHERE mr.id = mediator_request_id AND mr.mediator_id = auth.uid()
));

CREATE POLICY "Admins can view all feedback"
ON public.session_feedback FOR SELECT
USING (has_role(auth.uid(), 'admin'));
