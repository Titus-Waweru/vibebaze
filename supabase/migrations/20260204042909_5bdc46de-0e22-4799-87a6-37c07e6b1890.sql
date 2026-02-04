-- Add referral abuse prevention columns to referrals table
ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS created_device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS created_ip_address TEXT;

-- Add parent_id to comments for reply functionality
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- Create index for efficient reply queries
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);

-- Add earnings_locked_until to wallets for 72h monetization delay
ALTER TABLE public.wallets
ADD COLUMN IF NOT EXISTS earnings_locked_until TIMESTAMP WITH TIME ZONE;

-- Function to check if earnings are unlocked
CREATE OR REPLACE FUNCTION public.check_earnings_unlocked(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locked_until TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT earnings_locked_until INTO v_locked_until
  FROM public.wallets
  WHERE user_id = p_user_id;
  
  IF v_locked_until IS NULL THEN
    RETURN TRUE;
  END IF;
  
  RETURN now() > v_locked_until;
END;
$$;

-- Function to lock earnings for 72 hours when receiving funds
CREATE OR REPLACE FUNCTION public.lock_new_earnings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a new earning comes in, extend lock period if needed
  IF NEW.status = 'completed' AND NEW.receiver_id IS NOT NULL 
     AND NEW.transaction_type IN ('tip', 'subscription', 'content_purchase') THEN
    UPDATE public.wallets
    SET earnings_locked_until = GREATEST(
      COALESCE(earnings_locked_until, now()),
      now() + interval '72 hours'
    )
    WHERE user_id = NEW.receiver_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for locking new earnings
DROP TRIGGER IF EXISTS lock_earnings_trigger ON public.transactions;
CREATE TRIGGER lock_earnings_trigger
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.lock_new_earnings();

-- Function to check referral abuse
CREATE OR REPLACE FUNCTION public.check_referral_abuse(
  p_referrer_id UUID,
  p_ip_address TEXT,
  p_device_fingerprint TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_count INTEGER;
BEGIN
  -- Check if same IP or device fingerprint was used in last 24 hours
  SELECT COUNT(*) INTO v_existing_count
  FROM public.referrals
  WHERE (
    (ip_address = p_ip_address AND ip_address IS NOT NULL)
    OR (device_fingerprint = p_device_fingerprint AND device_fingerprint IS NOT NULL)
  )
  AND created_at > now() - interval '24 hours';
  
  -- Flag as abuse if more than 2 referrals from same IP/device
  IF v_existing_count >= 2 THEN
    RETURN TRUE;
  END IF;
  
  -- Check for self-referral (referrer trying to refer themselves)
  -- This is handled at application level
  
  RETURN FALSE;
END;
$$;

-- Update comments RLS to allow post owners to delete any comment on their posts
DROP POLICY IF EXISTS "Post owners can delete comments on their posts" ON public.comments;
CREATE POLICY "Post owners can delete comments on their posts"
ON public.comments
FOR DELETE
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = comments.post_id 
    AND posts.user_id = auth.uid()
  )
);