
-- Add edited_at column to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone DEFAULT NULL;

-- Allow users to delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
