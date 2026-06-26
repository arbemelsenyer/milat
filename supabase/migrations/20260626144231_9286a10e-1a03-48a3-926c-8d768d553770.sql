
ALTER TABLE public.case_parties DROP CONSTRAINT IF EXISTS case_parties_role_check;
ALTER TABLE public.case_parties DROP CONSTRAINT IF EXISTS case_parties_party_role_check;
ALTER TABLE public.case_parties DROP CONSTRAINT IF EXISTS case_parties_party_type_check;

-- Normalize old data
UPDATE public.case_parties SET party_role = 'applicant' WHERE party_role IN ('claimant','A','a');
UPDATE public.case_parties SET party_role = 'respondent' WHERE party_role IN ('B','b');
UPDATE public.case_parties SET party_role = 'applicant' WHERE party_role IS NULL OR party_role NOT IN ('applicant','respondent','third_party');
UPDATE public.case_parties SET role = party_role WHERE role IS DISTINCT FROM party_role;
UPDATE public.case_parties SET party_type = 'individual' WHERE party_type IS NULL OR party_type NOT IN ('individual','corporate');

ALTER TABLE public.case_parties
  ADD CONSTRAINT case_parties_party_role_check
  CHECK (party_role IN ('applicant','respondent','third_party'));

ALTER TABLE public.case_parties
  ADD CONSTRAINT case_parties_party_type_check
  CHECK (party_type IN ('individual','corporate'));

ALTER TABLE public.case_parties
  ADD CONSTRAINT case_parties_role_check
  CHECK (role IN ('applicant','respondent','third_party'));

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS application_date TIMESTAMPTZ NOT NULL DEFAULT now();
