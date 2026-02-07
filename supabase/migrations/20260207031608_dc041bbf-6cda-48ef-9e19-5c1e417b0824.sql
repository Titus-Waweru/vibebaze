-- Fix: Add UNIQUE constraint on push_subscriptions.user_id for ON CONFLICT support
-- This allows one push token per user (latest device wins)
ALTER TABLE public.push_subscriptions
ADD CONSTRAINT push_subscriptions_user_id_unique UNIQUE (user_id);