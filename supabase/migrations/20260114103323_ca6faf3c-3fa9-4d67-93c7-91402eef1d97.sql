-- Fix the overly permissive INSERT policy by dropping and recreating with proper security
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Create a more restrictive insert policy that only allows service role
-- This will work because service role bypasses RLS entirely
-- Regular users cannot insert notifications directly