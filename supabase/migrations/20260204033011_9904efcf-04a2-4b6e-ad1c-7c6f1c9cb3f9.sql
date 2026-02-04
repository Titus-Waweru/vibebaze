-- Add email verification and OTP fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS otp_hash text,
ADD COLUMN IF NOT EXISTS otp_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS otp_attempts integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_otp_request timestamp with time zone;

-- Add password reset token fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS reset_token_hash text,
ADD COLUMN IF NOT EXISTS reset_token_expires_at timestamp with time zone;

-- Create index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_profiles_otp_expires ON public.profiles(otp_expires_at) WHERE otp_hash IS NOT NULL;

-- Create index for faster reset token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_reset_token_expires ON public.profiles(reset_token_expires_at) WHERE reset_token_hash IS NOT NULL;

-- Function to check rate limit for OTP requests (max 3 per hour)
CREATE OR REPLACE FUNCTION public.check_otp_rate_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_attempts INTEGER;
  v_last_request TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT otp_attempts, last_otp_request INTO v_attempts, v_last_request
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Reset attempts if last request was more than 1 hour ago
  IF v_last_request IS NULL OR v_last_request < now() - interval '1 hour' THEN
    RETURN true;
  END IF;
  
  -- Check if under limit
  RETURN COALESCE(v_attempts, 0) < 3;
END;
$$;

-- Function to increment OTP attempts
CREATE OR REPLACE FUNCTION public.increment_otp_attempts(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    otp_attempts = CASE 
      WHEN last_otp_request IS NULL OR last_otp_request < now() - interval '1 hour' THEN 1
      ELSE COALESCE(otp_attempts, 0) + 1
    END,
    last_otp_request = now()
  WHERE id = p_user_id;
END;
$$;

-- Function to verify and clear OTP
CREATE OR REPLACE FUNCTION public.verify_otp(p_user_id uuid, p_otp_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stored_hash TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT otp_hash, otp_expires_at INTO v_stored_hash, v_expires_at
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Check if OTP exists and hasn't expired
  IF v_stored_hash IS NULL OR v_expires_at < now() THEN
    RETURN false;
  END IF;
  
  -- Check if hashes match
  IF v_stored_hash = p_otp_hash THEN
    -- Clear OTP and mark as verified
    UPDATE public.profiles
    SET 
      email_verified = true,
      email_verified_at = now(),
      otp_hash = NULL,
      otp_expires_at = NULL,
      otp_attempts = 0
    WHERE id = p_user_id;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to verify reset token
CREATE OR REPLACE FUNCTION public.verify_reset_token(p_email text, p_token_hash text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_stored_hash TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user by email from auth.users
  SELECT au.id INTO v_user_id
  FROM auth.users au
  WHERE au.email = p_email;
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get stored token info
  SELECT reset_token_hash, reset_token_expires_at INTO v_stored_hash, v_expires_at
  FROM public.profiles
  WHERE id = v_user_id;
  
  -- Check if token exists and hasn't expired
  IF v_stored_hash IS NULL OR v_expires_at < now() THEN
    RETURN NULL;
  END IF;
  
  -- Check if hashes match
  IF v_stored_hash = p_token_hash THEN
    -- Clear reset token (single-use)
    UPDATE public.profiles
    SET 
      reset_token_hash = NULL,
      reset_token_expires_at = NULL
    WHERE id = v_user_id;
    
    RETURN v_user_id;
  END IF;
  
  RETURN NULL;
END;
$$;