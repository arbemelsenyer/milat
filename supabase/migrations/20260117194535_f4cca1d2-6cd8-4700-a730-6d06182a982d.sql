-- Add restrictive INSERT policy for notifications table
-- Only the service role (which bypasses RLS) should create notifications
-- This prevents users from creating fake notifications for themselves or others
CREATE POLICY "Only system can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (false);