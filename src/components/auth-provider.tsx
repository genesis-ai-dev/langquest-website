'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    // Get the initial session
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session');
        const {
          data: { session }
        } = await supabase.auth.getSession();

        console.log('Session:', session ? 'Found' : 'Not found');

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setIsLoading(false);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (mounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event);

      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);

      // After signing out, redirect to home page
      if (pathname !== '/') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    session,
    isLoading: isLoading || !isInitialized,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
