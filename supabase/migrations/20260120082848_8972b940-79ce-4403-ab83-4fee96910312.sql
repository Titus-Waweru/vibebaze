-- Fix search_path for new functions to resolve security warnings
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;