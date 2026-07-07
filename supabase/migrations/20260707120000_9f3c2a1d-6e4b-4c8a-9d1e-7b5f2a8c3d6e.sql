-- Remove the "Case owner reads common ground" SELECT policy: it let the
-- case-creating party read the mediator-only common ground report, leaking
-- the opposing party's confidential analysis. See:
-- 20260630102926_c257cc1c-fb77-4272-957e-8f1baec13bea.sql (policy added)
-- 20260625203756_3b1717b3-46c1-4165-b0fe-ba99dfba072c.sql (original mediator-only policy)
DROP POLICY IF EXISTS "Case owner reads common ground" ON public.common_ground_reports;

-- Verify "Mediator only common ground" is still the sole SELECT-capable policy.
DO $$
DECLARE
  policy_count int;
BEGIN
  SELECT count(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'common_ground_reports'
    AND cmd IN ('SELECT', 'ALL');

  IF policy_count <> 2 THEN
    RAISE EXCEPTION 'Expected exactly 2 SELECT-capable policies on common_ground_reports (Mediator only + Admin full), found %', policy_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'common_ground_reports'
      AND policyname = 'Mediator only common ground'
  ) THEN
    RAISE EXCEPTION '"Mediator only common ground" policy is missing on common_ground_reports';
  END IF;
END $$;
