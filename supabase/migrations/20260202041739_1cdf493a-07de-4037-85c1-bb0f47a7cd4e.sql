-- Fix the permissive RLS policy for referrals insert
DROP POLICY IF EXISTS "System can insert referrals" ON public.referrals;

-- Only allow authenticated users to create referrals (system creates via SECURITY DEFINER functions)
CREATE POLICY "Authenticated users can create referrals"
ON public.referrals FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);