-- Add phone_number column to profiles for Kenya payment system (+254 required)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add a check to ensure Kenyan phone format when set
-- Using a trigger instead of CHECK constraint for flexibility
CREATE OR REPLACE FUNCTION public.validate_kenyan_phone()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow NULL (not yet set) but validate if provided
  IF NEW.phone_number IS NOT NULL AND NEW.phone_number != '' THEN
    -- Must match Kenyan format: +2547XXXXXXXX or +2541XXXXXXXX  
    IF NOT (NEW.phone_number ~ '^\+254[17][0-9]{8}$') THEN
      RAISE EXCEPTION 'Phone number must be a valid Kenyan number (+254XXXXXXXXX)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_phone_trigger ON public.profiles;
CREATE TRIGGER validate_phone_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_kenyan_phone();

-- Update wallets table to sync phone from profiles
CREATE OR REPLACE FUNCTION public.sync_phone_to_wallet()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone_number IS NOT NULL AND NEW.phone_number != '' THEN
    UPDATE public.wallets
    SET mpesa_phone = NEW.phone_number,
        updated_at = now()
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_phone_wallet_trigger ON public.profiles;
CREATE TRIGGER sync_phone_wallet_trigger
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (NEW.phone_number IS DISTINCT FROM OLD.phone_number)
EXECUTE FUNCTION public.sync_phone_to_wallet();