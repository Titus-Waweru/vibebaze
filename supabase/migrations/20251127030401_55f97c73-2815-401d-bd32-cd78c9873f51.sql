-- Fix search_path for all functions to resolve security warnings

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Update increment_post_likes function
CREATE OR REPLACE FUNCTION public.increment_post_likes()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts
  SET likes_count = likes_count + 1
  WHERE id = NEW.post_id;
  
  -- Create notification for post owner
  INSERT INTO public.notifications (user_id, actor_id, type, post_id, message)
  SELECT 
    p.user_id,
    NEW.user_id,
    'like',
    NEW.post_id,
    (SELECT username FROM public.profiles WHERE id = NEW.user_id) || ' liked your post'
  FROM public.posts p
  WHERE p.id = NEW.post_id AND p.user_id != NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Update decrement_post_likes function
CREATE OR REPLACE FUNCTION public.decrement_post_likes()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts
  SET likes_count = GREATEST(0, likes_count - 1)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

-- Update increment_comment_count function
CREATE OR REPLACE FUNCTION public.increment_comment_count()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts
  SET comments_count = comments_count + 1
  WHERE id = NEW.post_id;
  
  -- Create notification for post owner
  INSERT INTO public.notifications (user_id, actor_id, type, post_id, comment_id, message)
  SELECT 
    p.user_id,
    NEW.user_id,
    'comment',
    NEW.post_id,
    NEW.id,
    (SELECT username FROM public.profiles WHERE id = NEW.user_id) || ' commented on your post'
  FROM public.posts p
  WHERE p.id = NEW.post_id AND p.user_id != NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Update decrement_comment_count function
CREATE OR REPLACE FUNCTION public.decrement_comment_count()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts
  SET comments_count = GREATEST(0, comments_count - 1)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

-- Update update_follow_counts function
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    
    -- Create notification for followed user
    INSERT INTO public.notifications (user_id, actor_id, type, message)
    VALUES (
      NEW.following_id,
      NEW.follower_id,
      'follow',
      (SELECT username FROM public.profiles WHERE id = NEW.follower_id) || ' started following you'
    );
    
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
    UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    RETURN OLD;
  END IF;
END;
$$;

-- Update update_post_count function
CREATE OR REPLACE FUNCTION public.update_post_count()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.profiles SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.profiles SET posts_count = GREATEST(0, posts_count - 1) WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
END;
$$;