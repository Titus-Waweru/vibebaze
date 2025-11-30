-- Create trigger function to notify followers when a user posts
CREATE OR REPLACE FUNCTION public.notify_followers_on_new_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert notifications for all followers of the post creator
  INSERT INTO public.notifications (user_id, actor_id, type, post_id, message)
  SELECT 
    f.follower_id,
    NEW.user_id,
    'new_post',
    NEW.id,
    (SELECT username FROM public.profiles WHERE id = NEW.user_id) || ' shared a new ' || NEW.type
  FROM public.follows f
  WHERE f.following_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new posts
DROP TRIGGER IF EXISTS on_new_post_notify_followers ON public.posts;
CREATE TRIGGER on_new_post_notify_followers
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_on_new_post();

-- Create trigger function to notify about trending posts (posts with 10+ likes)
CREATE OR REPLACE FUNCTION public.notify_trending_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When a post reaches 10 likes, notify followers who haven't been notified about this trending post
  IF NEW.likes_count = 10 AND (OLD.likes_count IS NULL OR OLD.likes_count < 10) THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id, message)
    SELECT DISTINCT
      f.follower_id,
      NEW.user_id,
      'trending',
      NEW.id,
      'A post by ' || (SELECT username FROM public.profiles WHERE id = NEW.user_id) || ' is trending!'
    FROM public.follows f
    WHERE f.following_id = NEW.user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n 
      WHERE n.user_id = f.follower_id 
      AND n.post_id = NEW.id 
      AND n.type = 'trending'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for trending posts
DROP TRIGGER IF EXISTS on_post_trending ON public.posts;
CREATE TRIGGER on_post_trending
  AFTER UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_trending_post();