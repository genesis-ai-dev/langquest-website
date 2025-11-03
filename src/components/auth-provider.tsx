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
import { usePathname, useSearchParams } from 'next/navigation';
import { getSupabaseEnvironment, SupabaseEnvironment } from '@/lib/supabase';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  environment: SupabaseEnvironment;
  supabase: SupabaseClient;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: false,
  signOut: async () => {},
  environment: 'production',
  supabase: createBrowserClient()
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Determine environment from URL params
  const envParam = searchParams.get('env') as SupabaseEnvironment;

  const projectRef = searchParams.get('project_ref');
  const envFromProjectRef = projectRef
    ? getSupabaseEnvironment(projectRef)
    : null;

  const environment: SupabaseEnvironment =
    envParam || envFromProjectRef || 'production';

  console.log('[AUTH PROVIDER] Environment:', environment);

  // Create environment-specific supabase client (memoized to ensure stability)
  const supabase = useMemo(() => {
    console.log(
      '[AUTH PROVIDER] Creating supabase client for environment:',
      environment
    );
    return createBrowserClient(environment);
  }, [environment]);

  useEffect(() => {
    let mounted = true;

    // Get the initial session
    const getInitialSession = async () => {
      try {
        console.log(
          '[AUTH PROVIDER] Getting initial session for environment:',
          environment
        );
        const supabase = createBrowserClient(environment);
        const {
          data: { session }
        } = await supabase.auth.getSession();

        console.log(
          '[AUTH PROVIDER] Session:',
          session ? 'Found' : 'Not found',
          'for environment:',
          environment
        );

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
      console.log(
        '[AUTH PROVIDER] Auth state changed:',
        _event,
        'for environment:',
        environment
      );

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
  }, [environment, supabase.auth]); // Re-run when environment changes

  const signOut = useCallback(async () => {
    try {
      console.log('[AUTH PROVIDER] Signing out from environment:', environment);
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);

      // After signing out, redirect to home page with environment param
      if (pathname !== '/') {
        console.log('[AUTH PROVIDER] Redirecting to home after signout');
        window.location.href = `/?env=${environment}`;
      }
    } catch (error) {
      console.error('[AUTH PROVIDER] Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, environment, pathname]);

  const value = useMemo(
    () => ({
      user,
      session,
      isLoading: isLoading || !isInitialized,
      signOut,
      environment,
      supabase
    }),
    [user, session, isLoading, isInitialized, environment, supabase, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
