
-- Add external_links column to profiles for social links / website
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS external_links jsonb DEFAULT '[]'::jsonb;

-- Add unique constraint on username if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;
END$$;

-- Create function to validate referral only after first post
CREATE OR REPLACE FUNCTION public.validate_referral_on_first_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_post_count INTEGER;
BEGIN
  -- Count how many posts this user now has (including this new one)
  SELECT COUNT(*) INTO v_post_count
  FROM public.posts
  WHERE user_id = NEW.user_id;

  -- Only trigger on the FIRST post (count = 1 means this is the first)
  IF v_post_count = 1 THEN
    -- Validate pending referral for this user
    PERFORM public.validate_referral(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for referral validation on first post
DROP TRIGGER IF EXISTS trigger_validate_referral_on_first_post ON public.posts;
CREATE TRIGGER trigger_validate_referral_on_first_post
AFTER INSERT ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.validate_referral_on_first_post();

-- Update platform fee to 15%
UPDATE public.platform_settings
SET setting_value = '15'::jsonb, updated_at = now()
WHERE setting_key = 'platform_fee_percentage';

-- Insert if not exists
INSERT INTO public.platform_settings (setting_key, setting_value, description)
SELECT 'platform_fee_percentage', '15'::jsonb, 'Platform fee percentage on transactions'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings WHERE setting_key = 'platform_fee_percentage');

-- Add admin delete policy for posts (admins can delete reported content)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete any post' AND tablename = 'posts'
  ) THEN
    CREATE POLICY "Admins can delete any post"
    ON public.posts
    FOR DELETE
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END$$;
