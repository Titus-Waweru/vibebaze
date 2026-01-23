-- Create database webhook trigger to auto-send push notifications
-- This trigger fires when a new notification is inserted and calls the edge function

-- First, enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to trigger push notification via edge function
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  -- Get Supabase URL from environment (stored in vault or as a constant)
  -- For now, we'll use the project URL directly
  supabase_url := 'https://tgqhclcuvirakmczmqof.supabase.co';
  
  -- Make async HTTP request to the edge function
  -- Using pg_net for non-blocking HTTP calls
  SELECT extensions.http_post(
    url := supabase_url || '/functions/v1/trigger-push-notification',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'notifications',
      'schema', 'public',
      'record', jsonb_build_object(
        'id', NEW.id,
        'user_id', NEW.user_id,
        'actor_id', NEW.actor_id,
        'type', NEW.type,
        'message', NEW.message,
        'post_id', NEW.post_id,
        'comment_id', NEW.comment_id,
        'created_at', NEW.created_at,
        'is_read', NEW.is_read
      ),
      'old_record', NULL
    )::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRncWhjbGN1dmlyYWttY3ptcW9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMDY1MTYsImV4cCI6MjA3OTc4MjUxNn0.-lLjIHyR8xy_4yOnblSFtYzUPR4qozJvQ2zeJ5YWBKI'
    )
  ) INTO request_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Push notification trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger on notifications table
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;

CREATE TRIGGER on_notification_created
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();

-- Add notification type for wallet transactions
-- This will be used when tips/gifts are received
CREATE OR REPLACE FUNCTION public.notify_wallet_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only create notification for completed transactions that have a receiver
  IF NEW.status = 'completed' AND NEW.receiver_id IS NOT NULL AND NEW.transaction_type IN ('tip', 'gift', 'subscription') THEN
    INSERT INTO public.notifications (user_id, actor_id, type, message)
    VALUES (
      NEW.receiver_id,
      NEW.sender_id,
      NEW.transaction_type,
      CASE 
        WHEN NEW.transaction_type = 'tip' THEN 'You received a KSh ' || NEW.net_amount || ' tip!'
        WHEN NEW.transaction_type = 'gift' THEN 'You received a KSh ' || NEW.net_amount || ' gift!'
        WHEN NEW.transaction_type = 'subscription' THEN 'Someone subscribed to you for KSh ' || NEW.net_amount || '!'
        ELSE 'You received KSh ' || NEW.net_amount
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for wallet transactions
DROP TRIGGER IF EXISTS on_wallet_transaction ON public.transactions;

CREATE TRIGGER on_wallet_transaction
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_wallet_transaction();