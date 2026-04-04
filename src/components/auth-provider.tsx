'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';
import { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { createBrowserClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  supabase: SupabaseClient;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: false,
  signOut: async () => {},
  supabase: createBrowserClient()
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const pathname = usePathname();

  const supabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();

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

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
  }, [supabase]);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);

      if (pathname !== '/') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('[AUTH PROVIDER] Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, pathname]);

  const value = useMemo(
    () => ({
      user,
      session,
      isLoading: isLoading || !isInitialized,
      signOut,
      supabase
    }),
    [user, session, isLoading, isInitialized, supabase, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
