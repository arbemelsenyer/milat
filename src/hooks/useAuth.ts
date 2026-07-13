import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'user' | 'mediator' | 'admin';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  isMediator: boolean;
  isAdmin: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    roles: [],
    isLoading: true,
    isMediator: false,
    isAdmin: false,
  });

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));

        // Defer profile and roles fetch with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfileAndRoles(session.user.id);
          }, 0);
        } else {
          setAuthState(prev => ({
            ...prev,
            profile: null,
            roles: [],
            isMediator: false,
            isAdmin: false,
            isLoading: false,
          }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
      }));

      if (session?.user) {
        fetchProfileAndRoles(session.user.id);
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfileAndRoles = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const roles = (rolesData?.map(r => r.role) || []) as AppRole[];

      setAuthState(prev => ({
        ...prev,
        profile,
        roles,
        isMediator: roles.includes('mediator'),
        isAdmin: roles.includes('admin'),
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error fetching profile/roles:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const signUp = async (email: string, password: string, fullName?: string, emailRedirectTo?: string) => {
    const redirectUrl = emailRedirectTo ?? `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { data, error };
  };

  // For invited signups only: public self-signup is disabled at the project
  // level, so this goes through a service-role edge function that validates
  // the party-invite token and creates the account, bypassing that gate.
  // Uninvited signups keep going through signUp() above, which stays blocked.
  const inviteSignUp = async (token: string, email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.functions.invoke('invite-signup', {
      body: { token, email, password, fullName },
    });
    if (error || (data as any)?.error) {
      return { error: new Error((data as any)?.error ?? error?.message ?? 'Signup failed') };
    }
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    ...authState,
    signUp,
    inviteSignUp,
    signIn,
    signOut,
    refetchProfile: () => authState.user && fetchProfileAndRoles(authState.user.id),
  };
}
