-- Drop the trigger and function that call the deleted push notification edge function
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;

-- Now drop the trigger function with CASCADE
DROP FUNCTION IF EXISTS public.trigger_push_notification() CASCADE;