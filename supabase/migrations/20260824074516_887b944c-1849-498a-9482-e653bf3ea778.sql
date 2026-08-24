DROP POLICY IF EXISTS "Case documents read - current case access only" ON storage.objects;

CREATE POLICY "Case documents read - own uploads or case mediator"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'case-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR ((storage.foldername(name))[1] = 'admin' AND public.has_role(auth.uid(), 'mediator'::public.app_role))
    OR (
      (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      AND public.can_access_case(((storage.foldername(name))[2])::uuid, auth.uid())
      AND (
        -- gorevli arabulucu: dosyanin butun belgeleri
        public.is_case_mediator(((storage.foldername(name))[2])::uuid, auth.uid())
        -- herkes: yalniz KENDI yukledigi dosya (veritabanindaki
        -- "Party sees own uploads only" kuralinin birebir karsiligi)
        OR (auth.uid())::text = (storage.foldername(name))[1]
      )
    )
  )
);