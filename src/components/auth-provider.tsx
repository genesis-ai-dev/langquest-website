'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { createBrowserClient, clearAllSupabaseSessions } from '@/lib/supabase/client';
import { usePathname, useSearchParams } from 'next/navigation';
import { SupabaseEnvironment } from '@/lib/supabase';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  environment: SupabaseEnvironment;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: false,
  signOut: async () => {},
  environment: 'production'
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
  const environment: SupabaseEnvironment = envParam || 'production';

  useEffect(() => {
    let mounted = true;

    // Check if user previously chose to be remembered (only on client side)
    const shouldRemember = typeof window !== 'undefined' ? localStorage.getItem('shouldRemember') === 'true' : false;
    console.log('🔍 [AUTH PROVIDER] ===== SESSION RESTORATION DEBUG =====');
    console.log('🔍 [AUTH PROVIDER] Environment:', environment);
    console.log('🔍 [AUTH PROVIDER] Window available:', typeof window !== 'undefined');
    console.log('🔍 [AUTH PROVIDER] shouldRemember from localStorage:', shouldRemember);
    console.log('🔍 [AUTH PROVIDER] localStorage shouldRemember raw value:', typeof window !== 'undefined' ? localStorage.getItem('shouldRemember') : 'N/A');
    console.log('🔍 [AUTH PROVIDER] localStorage rememberedEmail:', typeof window !== 'undefined' ? localStorage.getItem('rememberedEmail') : 'N/A');
    
    // Listen for changes to the shouldRemember preference
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'shouldRemember' && e.newValue !== e.oldValue) {
        console.log('🔍 [AUTH PROVIDER] shouldRemember preference changed, clearing all sessions');
        clearAllSupabaseSessions();
        // Reset auth state
        setSession(null);
        setUser(null);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }
    
    // Check for existing Supabase sessions in storage BEFORE creating client
    if (typeof window !== 'undefined') {
      console.log('🔍 [AUTH PROVIDER] Pre-client storage check:');
      console.log('🔍 [AUTH PROVIDER] - All localStorage keys:', Object.keys(localStorage));
      console.log('🔍 [AUTH PROVIDER] - All sessionStorage keys:', Object.keys(sessionStorage));
      console.log('🔍 [AUTH PROVIDER] - localStorage supabase keys:', Object.keys(localStorage).filter(k => k.includes('supabase')));
      console.log('🔍 [AUTH PROVIDER] - sessionStorage supabase keys:', Object.keys(sessionStorage).filter(k => k.includes('supabase')));
      
      // Check for any auth-related keys that might contain session data
      const allKeys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)];
      const authKeys = allKeys.filter(k => k.toLowerCase().includes('auth') || k.toLowerCase().includes('session') || k.toLowerCase().includes('token'));
      console.log('🔍 [AUTH PROVIDER] - All auth/session/token keys:', authKeys);
      
      // Check IndexedDB for Supabase data
      if ('indexedDB' in window) {
        console.log('🔍 [AUTH PROVIDER] - IndexedDB available, checking for Supabase databases...');
        // This is async, so we'll just log that we're checking
        console.log('🔍 [AUTH PROVIDER] - Note: IndexedDB check would be async, skipping for now');
      }
      
      // Check if there are other tabs with this site open
      console.log('🔍 [AUTH PROVIDER] - Chrome tabs check: This might be the issue if other tabs are open');
      console.log('🔍 [AUTH PROVIDER] - Current URL:', window.location.href);
      console.log('🔍 [AUTH PROVIDER] - Document visibility:', document.visibilityState);
      console.log('🔍 [AUTH PROVIDER] - Page focus:', document.hasFocus());
    }

    // Create environment-specific supabase client with appropriate session persistence
    const supabase = createBrowserClient(environment, shouldRemember);

    // Get the initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 [AUTH PROVIDER] Getting initial session for environment:', environment, 'with persistSession:', shouldRemember);
        
        // Always try to get the session - the storage type (localStorage vs sessionStorage) 
        // will determine if a session exists based on the user's remember preference
        const {
          data: { session }
        } = await supabase.auth.getSession();

        console.log('🔍 [AUTH PROVIDER] Session result:', session ? 'Found' : 'Not found');
        if (session) {
          console.log('🔍 [AUTH PROVIDER] Session user email:', session.user?.email);
          console.log('🔍 [AUTH PROVIDER] Session expires at:', session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A');
          console.log('🔍 [AUTH PROVIDER] Session access token length:', session.access_token?.length);
          console.log('🔍 [AUTH PROVIDER] Session storage location check:');
          console.log('🔍 [AUTH PROVIDER] - localStorage supabase keys:', typeof window !== 'undefined' ? Object.keys(localStorage).filter(k => k.includes('supabase')) : 'N/A');
          console.log('🔍 [AUTH PROVIDER] - sessionStorage supabase keys:', typeof window !== 'undefined' ? Object.keys(sessionStorage).filter(k => k.includes('supabase')) : 'N/A');
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setIsLoading(false);
          setIsInitialized(true);
          console.log('🔍 [AUTH PROVIDER] Auth state updated - user:', session?.user?.email || 'null');
        }
      } catch (error) {
        console.error('🔍 [AUTH PROVIDER] Error getting initial session:', error);
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
        '🔍 [AUTH PROVIDER] Auth state changed:',
        _event,
        'for environment:',
        environment,
        'shouldRemember:',
        shouldRemember
      );

      // The storage type (localStorage vs sessionStorage) already handles the persistence logic
      // so we don't need to filter events based on shouldRemember here
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [environment]); // Re-run when environment changes

  const signOut = async () => {
    try {
      console.log('[AUTH PROVIDER] Signing out from environment:', environment);
      setIsLoading(true);
      
      // Create a client for sign out (use current remember preference)
      const shouldRemember = typeof window !== 'undefined' ? localStorage.getItem('shouldRemember') === 'true' : false;
      const supabase = createBrowserClient(environment, shouldRemember);
      
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);

      // Clear remember me preferences on sign out
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('shouldRemember');
      console.log('[AUTH PROVIDER] Cleared remember me preferences');

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
  };

  const value = {
    user,
    session,
    isLoading: isLoading || !isInitialized,
    signOut,
    environment
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
