-- Add server-side validation for avatar uploads via storage policies
-- Drop existing policies first to recreate them with MIME type validation
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Public read access for avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

-- Users can upload their own avatar (with MIME type validation)
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (
    LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
  )
);

-- Users can update their own avatar (with MIME type validation)
CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (
    LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
  )
);

-- Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Update handle_new_user function with input validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
BEGIN
  -- Extract and validate full_name from metadata
  v_full_name := TRIM(COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
  
  -- Limit length to 100 characters
  IF LENGTH(v_full_name) > 100 THEN
    v_full_name := LEFT(v_full_name, 100);
  END IF;
  
  -- Sanitize: remove control characters and potential script injection patterns
  v_full_name := REGEXP_REPLACE(v_full_name, '[\x00-\x1F\x7F]', '', 'g');
  v_full_name := REGEXP_REPLACE(v_full_name, '<[^>]*>', '', 'g');
  
  -- Insert into profiles with validated name
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NULLIF(v_full_name, ''));
  
  -- Insert default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;