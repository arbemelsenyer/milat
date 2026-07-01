-- Re-add invite_token as nullable on case_parties (compat) and refresh PostgREST schema cache
ALTER TABLE public.case_parties ADD COLUMN IF NOT EXISTS invite_token TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_case_parties_invite_token ON public.case_parties(invite_token);
NOTIFY pgrst, 'reload schema';