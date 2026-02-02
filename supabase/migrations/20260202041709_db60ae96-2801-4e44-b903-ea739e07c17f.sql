-- Add VibePoints to wallets table
ALTER TABLE public.wallets
ADD COLUMN IF NOT EXISTS vibe_points INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS pending_points INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_points_claimed INTEGER NOT NULL DEFAULT 0;

-- Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id),
  referred_id UUID NOT NULL REFERENCES public.profiles(id) UNIQUE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rewarded', 'invalid')),
  points_awarded INTEGER NOT NULL DEFAULT 0,
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT no_self_referral CHECK (referrer_id != referred_id)
);

-- Create unique referral codes table for each user
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Generate referral codes for existing users
UPDATE public.profiles
SET referral_code = UPPER(SUBSTR(MD5(id::text), 1, 8))
WHERE referral_code IS NULL;

-- Create function to generate referral code for new users
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.referral_code := UPPER(SUBSTR(MD5(NEW.id::text || now()::text), 1, 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new users
DROP TRIGGER IF EXISTS generate_referral_code_trigger ON public.profiles;
CREATE TRIGGER generate_referral_code_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.referral_code IS NULL)
EXECUTE FUNCTION public.generate_referral_code();

-- Create points claim history table
CREATE TABLE IF NOT EXISTS public.point_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  points_claimed INTEGER NOT NULL,
  kes_amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Function to validate and reward referral
CREATE OR REPLACE FUNCTION public.validate_referral(p_referred_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_referral RECORD;
  v_points INTEGER := 50; -- Points per referral
BEGIN
  -- Find pending referral
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referred_id = p_referred_id AND status = 'pending';
  
  IF v_referral IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update referral status
  UPDATE public.referrals
  SET status = 'rewarded', 
      validated_at = now(),
      points_awarded = v_points
  WHERE id = v_referral.id;
  
  -- Award points to referrer
  UPDATE public.wallets
  SET vibe_points = vibe_points + v_points,
      updated_at = now()
  WHERE user_id = v_referral.referrer_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to claim points (1000 points = 100 KES, min 3000)
CREATE OR REPLACE FUNCTION public.claim_points(p_user_id UUID, p_points INTEGER)
RETURNS UUID AS $$
DECLARE
  v_wallet RECORD;
  v_kes_amount NUMERIC;
  v_claim_id UUID;
BEGIN
  -- Minimum 3000 points
  IF p_points < 3000 THEN
    RAISE EXCEPTION 'Minimum claim is 3000 points';
  END IF;
  
  -- Get wallet
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id;
  
  IF v_wallet IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  
  IF v_wallet.vibe_points < p_points THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;
  
  -- Calculate KES amount (1000 points = 100 KES)
  v_kes_amount := (p_points::NUMERIC / 1000) * 100;
  
  -- Create claim record
  INSERT INTO public.point_claims (user_id, points_claimed, kes_amount)
  VALUES (p_user_id, p_points, v_kes_amount)
  RETURNING id INTO v_claim_id;
  
  -- Deduct points and add to pending
  UPDATE public.wallets
  SET vibe_points = vibe_points - p_points,
      pending_points = pending_points + p_points,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN v_claim_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals
CREATE POLICY "Users can view their referrals"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "System can insert referrals"
ON public.referrals FOR INSERT
WITH CHECK (true);

-- RLS Policies for point_claims
CREATE POLICY "Users can view their claims"
ON public.point_claims FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create claims"
ON public.point_claims FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_point_claims_user ON public.point_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);