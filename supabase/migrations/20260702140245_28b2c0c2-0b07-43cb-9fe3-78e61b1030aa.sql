
-- Add columns to cases if missing
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS mediation_type TEXT,
  ADD COLUMN IF NOT EXISTS outcome TEXT,
  ADD COLUMN IF NOT EXISTS mahkeme_turu TEXT,
  ADD COLUMN IF NOT EXISTS application_date DATE,
  ADD COLUMN IF NOT EXISTS issue_description TEXT,
  ADD COLUMN IF NOT EXISTS agreement_terms TEXT,
  ADD COLUMN IF NOT EXISTS agreement_amount NUMERIC;

-- document_templates table
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL UNIQUE,
  template_content TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  source_url TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.document_templates TO authenticated;
GRANT ALL ON public.document_templates TO service_role;

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read templates"
  ON public.document_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert templates"
  ON public.document_templates FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update templates"
  ON public.document_templates FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete templates"
  ON public.document_templates FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
