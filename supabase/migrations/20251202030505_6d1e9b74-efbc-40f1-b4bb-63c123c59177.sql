-- Add last_profile_update column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN last_profile_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for efficient queries
CREATE INDEX idx_profiles_last_update ON public.profiles(last_profile_update);