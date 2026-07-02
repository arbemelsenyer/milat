
DO $$
DECLARE
  t text;
  child_tables text[] := ARRAY[
    'agent_states','agreement_documents','case_assignments','case_discovery_questions',
    'case_documents','case_expert_assignments','case_fees','case_parties','case_sessions',
    'cases_private_keys','cases_vector_pool','common_ground_reports','expert_assignment_logs',
    'mediator_requests','meeting_invite_logs','messages','negotiation_rounds','notifications',
    'party_analyses','party_invite_logs','sessions'
  ];
  con text;
BEGIN
  FOREACH t IN ARRAY child_tables LOOP
    -- Drop existing FK(s) on case_id column if any
    FOR con IN
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
      WHERE tc.table_schema='public' AND tc.table_name=t
        AND tc.constraint_type='FOREIGN KEY' AND kcu.column_name='case_id'
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t, con);
    END LOOP;

    -- Add cascading FK
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE',
      t, t || '_case_id_fkey'
    );
  END LOOP;

  -- case_party_invites -> case_parties(id) cascade (indirect via case_parties)
  FOR con IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
    WHERE tc.table_schema='public' AND tc.table_name='case_party_invites'
      AND tc.constraint_type='FOREIGN KEY' AND kcu.column_name='case_party_id'
  LOOP
    EXECUTE format('ALTER TABLE public.case_party_invites DROP CONSTRAINT %I', con);
  END LOOP;
  ALTER TABLE public.case_party_invites
    ADD CONSTRAINT case_party_invites_case_party_id_fkey
    FOREIGN KEY (case_party_id) REFERENCES public.case_parties(id) ON DELETE CASCADE;
END $$;
