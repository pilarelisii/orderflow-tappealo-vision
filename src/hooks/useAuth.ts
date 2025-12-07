import { useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Venue {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer venue fetch to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserVenue(session.user.id);
          }, 0);
        } else {
          setVenue(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserVenue(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserVenue = async (userId: string) => {
    const { data, error } = await supabase
      .from('venues')
      .select('id, name, slug, logo_url')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching venue:', error);
    }
    
    setVenue(data);
    setLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setVenue(null);
    }
    return { error };
  };

  return {
    user,
    session,
    venue,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!session,
  };
}
