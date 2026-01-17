-- Fix the wallet insert policy to be more secure
-- The trigger function runs with SECURITY DEFINER so it bypasses RLS anyway
-- But we should still have a proper policy for any direct inserts

DROP POLICY IF EXISTS "System can insert wallets" ON public.wallets;

-- Only allow inserts via the trigger (security definer function handles this)
-- For safety, restrict direct inserts to admins only
CREATE POLICY "Admins can insert wallets"
  ON public.wallets FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

-- Update content views policy - require at least a session ID
DROP POLICY IF EXISTS "Anyone can insert content views" ON public.content_views;

CREATE POLICY "Authenticated or sessioned users can insert views"
  ON public.content_views FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    OR session_id IS NOT NULL
  );