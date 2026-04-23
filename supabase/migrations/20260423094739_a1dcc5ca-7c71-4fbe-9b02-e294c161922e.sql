
-- Broadcast Jobs table for resilient background processing
CREATE TABLE IF NOT EXISTS public.broadcast_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'update',
  channel TEXT NOT NULL DEFAULT 'both', -- both | email | push
  url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | completed | failed
  total_users INTEGER NOT NULL DEFAULT 0,
  total_subscriptions INTEGER NOT NULL DEFAULT 0,
  email_sent INTEGER NOT NULL DEFAULT 0,
  email_failed INTEGER NOT NULL DEFAULT 0,
  push_sent INTEGER NOT NULL DEFAULT 0,
  push_failed INTEGER NOT NULL DEFAULT 0,
  tokens_removed INTEGER NOT NULL DEFAULT 0,
  email_cursor TEXT, -- last processed user email (for cursor pagination)
  push_cursor TEXT, -- last processed subscription id
  email_done BOOLEAN NOT NULL DEFAULT false,
  push_done BOOLEAN NOT NULL DEFAULT false,
  last_error TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_jobs_status ON public.broadcast_jobs(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_jobs_created_at ON public.broadcast_jobs(created_at DESC);

ALTER TABLE public.broadcast_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view broadcast jobs"
  ON public.broadcast_jobs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create broadcast jobs"
  ON public.broadcast_jobs
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = admin_id);

CREATE POLICY "Admins can update broadcast jobs"
  ON public.broadcast_jobs
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Auto-update updated_at
CREATE TRIGGER update_broadcast_jobs_updated_at
  BEFORE UPDATE ON public.broadcast_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
