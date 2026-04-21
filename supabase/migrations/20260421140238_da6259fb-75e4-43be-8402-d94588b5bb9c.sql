
-- =========================================
-- 1. ENCRYPTION KEYS HARDENING
-- =========================================

-- Drop the overly permissive public select policy
DROP POLICY IF EXISTS "Users can view any public keys" ON public.user_encryption_keys;

-- Users can only view their own full key record
CREATE POLICY "Users can view own encryption keys"
ON public.user_encryption_keys
FOR SELECT
USING (auth.uid() = user_id);

-- Safe function to expose ONLY the public_key for any user
-- (needed so users can encrypt messages to recipients)
CREATE OR REPLACE FUNCTION public.get_user_public_key(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public_key
  FROM public.user_encryption_keys
  WHERE user_id = p_user_id
$$;

GRANT EXECUTE ON FUNCTION public.get_user_public_key(uuid) TO authenticated, anon;

-- =========================================
-- 2. PUSH SUBSCRIPTIONS HARDENING
-- =========================================

-- Drop the policy that allowed anyone to read all push subscriptions
DROP POLICY IF EXISTS "System can read all subscriptions" ON public.push_subscriptions;

-- Users can already view/insert/update/delete their own (existing policies kept).
-- The notification edge function uses the service role, which bypasses RLS,
-- so no extra policy is needed for backend access.

-- =========================================
-- 3. REFERRALS PRIVACY HARDENING
-- =========================================

-- Drop the policy that exposed IP/device fingerprint columns
DROP POLICY IF EXISTS "Users can view their referrals" ON public.referrals;

-- Restrict raw table access to admins only
CREATE POLICY "Admins can view full referral data"
ON public.referrals
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Safe view for end users — excludes IP and device fingerprint columns
CREATE OR REPLACE VIEW public.my_referrals
WITH (security_invoker = true)
AS
SELECT
  id,
  referrer_id,
  referred_id,
  referral_code,
  status,
  points_awarded,
  validated_at,
  created_at
FROM public.referrals
WHERE auth.uid() = referrer_id OR auth.uid() = referred_id;

GRANT SELECT ON public.my_referrals TO authenticated;

-- Allow the safe view to read through RLS by adding a user-scoped select policy
-- that ONLY returns rows but the view above projects safe columns.
CREATE POLICY "Users can view their own referral rows"
ON public.referrals
FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Note: the above policy still returns all columns at the table level. To prevent
-- direct column access, we revoke column-level select on sensitive fields from
-- non-admin roles.
REVOKE SELECT (ip_address, device_fingerprint, created_ip_address, created_device_fingerprint)
ON public.referrals FROM authenticated, anon;
