import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string, metadata: SignUpMetadata) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface SignUpMetadata {
  full_name: string;
  phone: string;
  role: UserRole;
  city: string;
  district: string;
  facility_name?: string;
  license_number?: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
  });

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) return null;
    return data as Profile;
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        const profile = await loadProfile(session.user.id);
        if (mounted) {
          setState({ session, user: session.user, profile, loading: false });
        }
      } else {
        setState({ session: null, user: null, profile: null, loading: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setState({ session: null, user: null, profile: null, loading: false });
        return;
      }
      if (session) {
        (async () => {
          const profile = await loadProfile(session.user.id);
          if (mounted) {
            setState({ session, user: session.user, profile, loading: false });
          }
        })();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = async (email: string, password: string, metadata: SignUpMetadata) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata.full_name,
          phone: metadata.phone,
          role: metadata.role,
        },
      },
    });
    if (error) return { error: error.message };

    if (data.user) {
      // Update profile with location and role
      await supabase
        .from('profiles')
        .update({
          role: metadata.role,
          full_name: metadata.full_name,
          phone: metadata.phone,
          city: metadata.city,
          district: metadata.district,
        })
        .eq('id', data.user.id);

      // If hospital, create hospital record
      if (metadata.role === 'hospital' && metadata.facility_name) {
        await supabase.from('hospitals').insert({
          user_id: data.user.id,
          facility_name: metadata.facility_name,
          license_number: metadata.license_number || '',
          capacity: 0,
          is_approved: false,
        });
      }
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ session: null, user: null, profile: null, loading: false });
  };

  const refreshProfile = async () => {
    if (state.user) {
      const profile = await loadProfile(state.user.id);
      setState((prev) => ({ ...prev, profile }));
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
