
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS mediation_type text CHECK (mediation_type IN ('dava_sarti','ihtiyari')),
  ADD COLUMN IF NOT EXISTS mahkeme_turu text CHECK (mahkeme_turu IN ('tuketici','is','sulh','ticaret','yok')),
  ADD COLUMN IF NOT EXISTS sure_hafta integer,
  ADD COLUMN IF NOT EXISTS uzatma_hafta integer;
