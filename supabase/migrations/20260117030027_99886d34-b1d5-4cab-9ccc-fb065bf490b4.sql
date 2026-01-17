-- =====================================================
-- VIBELOOP MONETIZATION SYSTEM - Complete Database Schema
-- =====================================================

-- Create wallet_status enum for withdrawal states
CREATE TYPE public.wallet_transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE public.transaction_type AS ENUM ('tip', 'subscription', 'content_purchase', 'withdrawal', 'platform_fee', 'earnings');
CREATE TYPE public.payment_method AS ENUM ('mpesa', 'bank_transfer', 'paypal', 'stripe');

-- =====================================================
-- 1. CREATOR WALLETS TABLE
-- =====================================================
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  available_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (available_balance >= 0),
  pending_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (pending_balance >= 0),
  lifetime_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (lifetime_earnings >= 0),
  currency TEXT NOT NULL DEFAULT 'KES',
  mpesa_phone TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 2. TRANSACTIONS TABLE (All money movements)
-- =====================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  platform_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (platform_fee >= 0),
  net_amount DECIMAL(12, 2) NOT NULL CHECK (net_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'KES',
  transaction_type public.transaction_type NOT NULL,
  status public.wallet_transaction_status NOT NULL DEFAULT 'pending',
  payment_method public.payment_method,
  payment_reference TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- =====================================================
-- 3. CREATOR SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE public.creator_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'KES',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subscriber_id, creator_id)
);

-- =====================================================
-- 4. WITHDRAWALS TABLE
-- =====================================================
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 50), -- Minimum 50 KES
  currency TEXT NOT NULL DEFAULT 'KES',
  payment_method public.payment_method NOT NULL,
  payment_details JSONB NOT NULL DEFAULT '{}',
  status public.wallet_transaction_status NOT NULL DEFAULT 'pending',
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 5. CONTENT VIEWS TABLE (For accurate view tracking)
-- =====================================================
CREATE TABLE public.content_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  watch_duration_seconds INTEGER NOT NULL DEFAULT 0,
  is_counted BOOLEAN NOT NULL DEFAULT false,
  ip_hash TEXT, -- Hashed for privacy
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  counted_at TIMESTAMPTZ
);

-- =====================================================
-- 6. PLATFORM SETTINGS TABLE
-- =====================================================
CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default platform settings
INSERT INTO public.platform_settings (setting_key, setting_value, description) VALUES
('platform_fee_percentage', '10', 'Platform commission percentage on transactions'),
('minimum_withdrawal_amount', '50', 'Minimum withdrawal amount in KES'),
('view_count_threshold_seconds', '3', 'Minimum watch time in seconds to count as view'),
('monetization_views_threshold', '10000', 'Views required for monetization eligibility');

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - WALLETS
-- =====================================================
CREATE POLICY "Users can view their own wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet payment details"
  ON public.wallets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert wallets"
  ON public.wallets FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- RLS POLICIES - TRANSACTIONS
-- =====================================================
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Authenticated users can create transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- =====================================================
-- RLS POLICIES - SUBSCRIPTIONS
-- =====================================================
CREATE POLICY "Users can view their subscriptions"
  ON public.creator_subscriptions FOR SELECT
  USING (auth.uid() = subscriber_id OR auth.uid() = creator_id);

CREATE POLICY "Users can create subscriptions"
  ON public.creator_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = subscriber_id);

CREATE POLICY "Users can cancel their subscriptions"
  ON public.creator_subscriptions FOR UPDATE
  USING (auth.uid() = subscriber_id);

-- =====================================================
-- RLS POLICIES - WITHDRAWALS
-- =====================================================
CREATE POLICY "Users can view their own withdrawals"
  ON public.withdrawals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can request withdrawals"
  ON public.withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - CONTENT VIEWS
-- =====================================================
CREATE POLICY "Anyone can insert content views"
  ON public.content_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Post owners can view their content analytics"
  ON public.content_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts 
      WHERE posts.id = content_views.post_id 
      AND posts.user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES - PLATFORM SETTINGS
-- =====================================================
CREATE POLICY "Anyone can read platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can update platform settings"
  ON public.platform_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- AUTO-CREATE WALLET TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_wallet_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_wallet_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_wallet_for_user();

-- =====================================================
-- WALLET BALANCE UPDATE FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When transaction is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Update receiver's wallet (add earnings)
    IF NEW.receiver_id IS NOT NULL AND NEW.transaction_type IN ('tip', 'subscription', 'content_purchase') THEN
      UPDATE public.wallets
      SET 
        available_balance = available_balance + NEW.net_amount,
        lifetime_earnings = lifetime_earnings + NEW.net_amount,
        updated_at = now()
      WHERE user_id = NEW.receiver_id;
    END IF;
    
    -- Handle withdrawal completion
    IF NEW.transaction_type = 'withdrawal' THEN
      UPDATE public.wallets
      SET 
        pending_balance = pending_balance - NEW.amount,
        updated_at = now()
      WHERE user_id = NEW.sender_id;
    END IF;
  END IF;
  
  -- When withdrawal is initiated (pending)
  IF NEW.status = 'pending' AND NEW.transaction_type = 'withdrawal' THEN
    UPDATE public.wallets
    SET 
      available_balance = available_balance - NEW.amount,
      pending_balance = pending_balance + NEW.amount,
      updated_at = now()
    WHERE user_id = NEW.sender_id;
  END IF;
  
  -- Handle failed withdrawal (refund)
  IF NEW.status = 'failed' AND OLD.status = 'pending' AND NEW.transaction_type = 'withdrawal' THEN
    UPDATE public.wallets
    SET 
      available_balance = available_balance + NEW.amount,
      pending_balance = pending_balance - NEW.amount,
      updated_at = now()
    WHERE user_id = NEW.sender_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_wallet_on_transaction
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_balance();

-- =====================================================
-- REAL VIEW COUNTING FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.record_content_view(
  p_post_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_watch_duration INTEGER DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min_duration INTEGER;
  v_existing_view UUID;
  v_should_count BOOLEAN := false;
BEGIN
  -- Get minimum watch duration from settings
  SELECT (setting_value::text)::integer INTO v_min_duration
  FROM public.platform_settings
  WHERE setting_key = 'view_count_threshold_seconds';
  
  IF v_min_duration IS NULL THEN
    v_min_duration := 3;
  END IF;

  -- Check for existing uncounted view from same user/session in last 24 hours
  IF p_user_id IS NOT NULL THEN
    SELECT id INTO v_existing_view
    FROM public.content_views
    WHERE post_id = p_post_id
      AND user_id = p_user_id
      AND created_at > now() - interval '24 hours'
    LIMIT 1;
  ELSIF p_session_id IS NOT NULL THEN
    SELECT id INTO v_existing_view
    FROM public.content_views
    WHERE post_id = p_post_id
      AND session_id = p_session_id
      AND created_at > now() - interval '24 hours'
    LIMIT 1;
  END IF;

  -- If no existing view and watch duration meets threshold
  IF v_existing_view IS NULL AND p_watch_duration >= v_min_duration THEN
    v_should_count := true;
    
    -- Insert the view record
    INSERT INTO public.content_views (post_id, user_id, session_id, watch_duration_seconds, is_counted, counted_at)
    VALUES (p_post_id, p_user_id, p_session_id, p_watch_duration, true, now());
    
    -- Increment the post view count
    UPDATE public.posts
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = p_post_id;
  ELSIF v_existing_view IS NOT NULL THEN
    -- Update existing view with new watch duration
    UPDATE public.content_views
    SET watch_duration_seconds = GREATEST(watch_duration_seconds, p_watch_duration)
    WHERE id = v_existing_view;
  ELSE
    -- Insert view record but don't count yet
    INSERT INTO public.content_views (post_id, user_id, session_id, watch_duration_seconds, is_counted)
    VALUES (p_post_id, p_user_id, p_session_id, p_watch_duration, false);
  END IF;
  
  RETURN v_should_count;
END;
$$;

-- =====================================================
-- Create wallets for existing users
-- =====================================================
INSERT INTO public.wallets (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- Add indexes for performance
-- =====================================================
CREATE INDEX idx_transactions_sender ON public.transactions(sender_id);
CREATE INDEX idx_transactions_receiver ON public.transactions(receiver_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_content_views_post_id ON public.content_views(post_id);
CREATE INDEX idx_content_views_user_id ON public.content_views(user_id);
CREATE INDEX idx_content_views_session_id ON public.content_views(session_id);
CREATE INDEX idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX idx_subscriptions_subscriber ON public.creator_subscriptions(subscriber_id);
CREATE INDEX idx_subscriptions_creator ON public.creator_subscriptions(creator_id);