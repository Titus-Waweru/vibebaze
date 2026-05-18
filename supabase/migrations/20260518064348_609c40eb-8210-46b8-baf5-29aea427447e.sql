ALTER TABLE public.broadcast_jobs
  ADD COLUMN IF NOT EXISTS email_rate_limited integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_provider_rejected integer NOT NULL DEFAULT 0;