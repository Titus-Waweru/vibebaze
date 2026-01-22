-- =====================================================
-- 1. ADD NEW ENUMS
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.report_reason AS ENUM (
    'nudity',
    'violence',
    'harassment',
    'hate_speech',
    'scam_fraud',
    'spam',
    'misinformation',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.moderation_status AS ENUM (
    'pending',
    'reviewed',
    'actioned',
    'dismissed'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.moderation_action AS ENUM (
    'warning',
    'content_removal',
    'temporary_suspension',
    'permanent_ban',
    'wallet_freeze',
    'wallet_unfreeze',
    'none'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.flag_source AS ENUM (
    'ai_moderation',
    'user_report',
    'admin_flag'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. CONTENT FLAGS TABLE (AI + Manual Flagging)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.content_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID, -- The user whose content is flagged
  flagged_by UUID, -- NULL for AI
  source public.flag_source NOT NULL,
  reason public.report_reason NOT NULL,
  ai_confidence DECIMAL(5, 4), -- 0.0000 to 1.0000
  ai_category TEXT,
  urgency_level INTEGER DEFAULT 1 CHECK (urgency_level >= 1 AND urgency_level <= 5),
  description TEXT,
  status public.moderation_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  action_taken public.moderation_action,
  action_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT content_flag_target CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL OR user_id IS NOT NULL)
);

-- =====================================================
-- 3. USER REPORTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  reported_user_id UUID,
  reported_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  reported_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  reason public.report_reason NOT NULL,
  description TEXT,
  status public.moderation_status NOT NULL DEFAULT 'pending',
  content_flag_id UUID REFERENCES public.content_flags(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT report_target CHECK (
    reported_user_id IS NOT NULL OR reported_post_id IS NOT NULL OR reported_comment_id IS NOT NULL
  )
);

-- =====================================================
-- 4. ADMIN ACTION LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 5. USER MODERATION STATUS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_moderation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  suspension_reason TEXT,
  suspended_until TIMESTAMPTZ,
  suspended_by UUID,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  banned_reason TEXT,
  banned_at TIMESTAMPTZ,
  banned_by UUID,
  warning_count INTEGER NOT NULL DEFAULT 0,
  last_warning_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 6. ADD WALLET FREEZE COLUMN
-- =====================================================
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS frozen_reason TEXT,
ADD COLUMN IF NOT EXISTS frozen_by UUID,
ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMPTZ;

-- =====================================================
-- 7. RATE LIMITING TABLE FOR REPORTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, action_type, window_start)
);

-- =====================================================
-- 8. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_content_flags_status ON public.content_flags(status);
CREATE INDEX IF NOT EXISTS idx_content_flags_source ON public.content_flags(source);
CREATE INDEX IF NOT EXISTS idx_content_flags_created ON public.content_flags(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON public.user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON public.user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON public.admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_moderation_user ON public.user_moderation(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON public.rate_limits(user_id, action_type);

-- =====================================================
-- 9. RLS POLICIES
-- =====================================================

-- Content Flags
ALTER TABLE public.content_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all content flags"
ON public.content_flags FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can update content flags"
ON public.content_flags FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "System can insert content flags"
ON public.content_flags FOR INSERT
WITH CHECK (true);

-- User Reports
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
ON public.user_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
ON public.user_reports FOR SELECT
USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can update reports"
ON public.user_reports FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Admin Logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all admin logs"
ON public.admin_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create admin logs"
ON public.admin_logs FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- User Moderation
ALTER TABLE public.user_moderation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view user moderation"
ON public.user_moderation FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can manage user moderation"
ON public.user_moderation FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Rate Limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits"
ON public.rate_limits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage rate limits"
ON public.rate_limits FOR ALL
WITH CHECK (true);

-- =====================================================
-- 10. TRIGGER FOR USER MODERATION UPDATED_AT
-- =====================================================
CREATE TRIGGER update_user_moderation_updated_at
BEFORE UPDATE ON public.user_moderation
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 11. INSERT DEFAULT PLATFORM SETTINGS FOR FEES
-- =====================================================
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
  ('min_tip_amount', '10', 'Minimum tip amount in KES'),
  ('min_transfer_amount', '10', 'Minimum transfer amount in KES'),
  ('max_daily_reports', '10', 'Maximum reports a user can submit per day'),
  ('ai_moderation_enabled', 'true', 'Enable AI content moderation')
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- 12. FUNCTION TO CHECK RATE LIMITS
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_action_type TEXT,
  p_max_actions INTEGER,
  p_window_hours INTEGER DEFAULT 24
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(action_count), 0) INTO v_action_count
  FROM public.rate_limits
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND window_start > now() - (p_window_hours || ' hours')::interval;
  
  RETURN v_action_count < p_max_actions;
END;
$$;

-- =====================================================
-- 13. FUNCTION TO INCREMENT RATE LIMIT
-- =====================================================
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_user_id UUID,
  p_action_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rate_limits (user_id, action_type, action_count, window_start)
  VALUES (p_user_id, p_action_type, 1, date_trunc('hour', now()))
  ON CONFLICT (user_id, action_type, window_start)
  DO UPDATE SET action_count = public.rate_limits.action_count + 1;
END;
$$;

-- =====================================================
-- 14. FUNCTION FOR WALLET BALANCE CHECK
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_wallet_balance(
  p_user_id UUID,
  p_amount DECIMAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance DECIMAL;
  v_frozen BOOLEAN;
BEGIN
  SELECT available_balance, is_frozen INTO v_balance, v_frozen
  FROM public.wallets
  WHERE user_id = p_user_id;
  
  IF v_frozen THEN
    RETURN false;
  END IF;
  
  RETURN COALESCE(v_balance, 0) >= p_amount;
END;
$$;

-- =====================================================
-- 15. FUNCTION FOR PROCESSING USER-TO-USER TRANSFER
-- =====================================================
CREATE OR REPLACE FUNCTION public.process_transfer(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_amount DECIMAL,
  p_post_id UUID DEFAULT NULL,
  p_transaction_type public.transaction_type DEFAULT 'tip',
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee_percentage DECIMAL;
  v_platform_fee DECIMAL;
  v_net_amount DECIMAL;
  v_transaction_id UUID;
  v_sender_frozen BOOLEAN;
  v_receiver_frozen BOOLEAN;
BEGIN
  -- Check if sender wallet is frozen
  SELECT is_frozen INTO v_sender_frozen FROM public.wallets WHERE user_id = p_sender_id;
  IF v_sender_frozen THEN
    RAISE EXCEPTION 'Sender wallet is frozen';
  END IF;
  
  -- Check if receiver wallet is frozen
  SELECT is_frozen INTO v_receiver_frozen FROM public.wallets WHERE user_id = p_receiver_id;
  IF v_receiver_frozen THEN
    RAISE EXCEPTION 'Receiver wallet is frozen';
  END IF;
  
  -- Check balance
  IF NOT public.check_wallet_balance(p_sender_id, p_amount) THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- Get platform fee
  SELECT COALESCE((setting_value::text)::decimal, 10) INTO v_fee_percentage
  FROM public.platform_settings
  WHERE setting_key = 'platform_fee_percentage';
  
  v_platform_fee := (p_amount * v_fee_percentage) / 100;
  v_net_amount := p_amount - v_platform_fee;
  
  -- Deduct from sender
  UPDATE public.wallets
  SET available_balance = available_balance - p_amount,
      updated_at = now()
  WHERE user_id = p_sender_id;
  
  -- Credit to receiver
  UPDATE public.wallets
  SET available_balance = available_balance + v_net_amount,
      lifetime_earnings = lifetime_earnings + v_net_amount,
      updated_at = now()
  WHERE user_id = p_receiver_id;
  
  -- Create transaction record
  INSERT INTO public.transactions (
    sender_id,
    receiver_id,
    post_id,
    amount,
    platform_fee,
    net_amount,
    transaction_type,
    status,
    description,
    completed_at
  )
  VALUES (
    p_sender_id,
    p_receiver_id,
    p_post_id,
    p_amount,
    v_platform_fee,
    v_net_amount,
    p_transaction_type,
    'completed',
    COALESCE(p_description, 'Gift/Transfer'),
    now()
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$;

-- =====================================================
-- 16. ENABLE REALTIME FOR MODERATION TABLES
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_flags;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_reports;