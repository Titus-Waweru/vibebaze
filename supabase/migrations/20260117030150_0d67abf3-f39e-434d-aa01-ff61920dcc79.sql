-- Fix the remaining "true" policy for transactions insert
DROP POLICY IF EXISTS "Authenticated users can create transactions" ON public.transactions;

CREATE POLICY "Authenticated users can create transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (auth.uid() = sender_id OR sender_id IS NULL)
  );