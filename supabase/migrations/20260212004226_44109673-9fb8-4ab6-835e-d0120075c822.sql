
-- Drop the unique constraint on user_id to allow multiple devices per user
ALTER TABLE public.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_key;

-- Add device_type column
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS device_type text DEFAULT 'unknown';

-- Add UPDATE policy so tokens can be refreshed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'Users can update their own subscriptions'
  ) THEN
    CREATE POLICY "Users can update their own subscriptions"
    ON public.push_subscriptions
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END $$;
