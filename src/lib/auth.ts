import { supabase } from "@/integrations/supabase/client";

export const generateUniqueHandle = (username: string): string => {
  // Clean username: lowercase, remove special chars, limit to 15 chars
  const base = username.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 15) || 'user';
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}_${suffix}`;
};

export const signUp = async (email: string, password: string, username: string, fullName: string) => {
  const redirectUrl = `${window.location.origin}/`;
  
  // Generate a unique handle from the provided username
  const handle = generateUniqueHandle(username);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        username: handle,
        full_name: fullName,
      }
    }
  });
  
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
};