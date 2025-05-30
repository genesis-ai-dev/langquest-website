'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { createBrowserClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';

const supabase = createBrowserClient();

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: false,
  signOut: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    // Get the initial session
    const getInitialSession = async () => {
      try {
        console.log('[AUTH PROVIDER] Getting initial session');
        const {
          data: { session }
        } = await supabase.auth.getSession();

        console.log(
          '[AUTH PROVIDER] Session:',
          session ? 'Found' : 'Not found'
        );
        console.log('[AUTH PROVIDER] Session user:', session?.user?.email);

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setIsLoading(false);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('[AUTH PROVIDER] Error getting initial session:', error);
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
      console.log('[AUTH PROVIDER] Auth state changed:', _event);
      console.log(
        '[AUTH PROVIDER] New session:',
        session ? 'Found' : 'Not found'
      );
      console.log('[AUTH PROVIDER] New session user:', session?.user?.email);

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
      console.log('[AUTH PROVIDER] Signing out');
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);

      // After signing out, redirect to home page
      if (pathname !== '/') {
        console.log('[AUTH PROVIDER] Redirecting to home after signout');
        window.location.href = '/';
      }
    } catch (error) {
      console.error('[AUTH PROVIDER] Error signing out:', error);
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
