import {
  getSupabaseCredentials,
  SupabaseEnvironment,
  supabaseInstances
} from '.';
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';

export function createBrowserClient(environment?: SupabaseEnvironment | null, persistSession?: boolean) {
  console.log('🔍 [SUPABASE CLIENT] ===== CLIENT CREATION DEBUG =====');
  console.log('🔍 [SUPABASE CLIENT] Environment:', environment);
  console.log('🔍 [SUPABASE CLIENT] persistSession parameter:', persistSession);
  console.log('🔍 [SUPABASE CLIENT] Window available:', typeof window !== 'undefined');

  // Default to production if environment is undefined or null
  const env = environment ?? 'production';
  
  // If persistSession not explicitly provided, check localStorage for remember me preference
  let actualPersistSession = persistSession;
  if (persistSession === undefined && typeof window !== 'undefined') {
    actualPersistSession = localStorage.getItem('shouldRemember') === 'true';
    console.log('🔍 [SUPABASE CLIENT] persistSession not provided, checking localStorage:', actualPersistSession);
  } else if (persistSession === undefined) {
    actualPersistSession = false; // Default to false on server side
    console.log('🔍 [SUPABASE CLIENT] persistSession not provided, server side default:', actualPersistSession);
  }
  
  console.log('🔍 [SUPABASE CLIENT] Final persistSession:', actualPersistSession);
  console.log('🔍 [SUPABASE CLIENT] Storage check - localStorage keys:', typeof window !== 'undefined' ? Object.keys(localStorage) : 'N/A');
  console.log('🔍 [SUPABASE CLIENT] Storage check - sessionStorage keys:', typeof window !== 'undefined' ? Object.keys(sessionStorage) : 'N/A');
  console.log('[SUPABASE CLIENT] Using environment:', env);

  // Create a unique key for this environment and persistSession combination
  const instanceKey = `${env}-${actualPersistSession}`;
  
  // Return existing instance for this environment and persistSession combination if already created
  const existingInstance = supabaseInstances.get(instanceKey as any);
  if (existingInstance) {
    console.log('[SUPABASE CLIENT] Returning existing instance for:', instanceKey);
    return existingInstance;
  }

  const { url, key } = getSupabaseCredentials(env);
  console.log('[SUPABASE CLIENT] Creating new instance with URL:', url);
  console.log('[SUPABASE CLIENT] Key exists:', !!key);
  console.log('[SUPABASE CLIENT] Key length:', key?.length);

  // Configure storage based on persistSession preference
  // When persistSession is false, use sessionStorage (temporary)
  // When persistSession is true, use localStorage (persistent)
  const storage = actualPersistSession ? localStorage : sessionStorage;
  
  console.log('🔍 [SUPABASE CLIENT] Using storage:', actualPersistSession ? 'localStorage (persistent)' : 'sessionStorage (temporary)');

  const newInstance = createSupabaseBrowserClient(url, key, {
    auth: {
      storage: storage,
      persistSession: true, // Always true, but storage type determines persistence
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  console.log('🔍 [SUPABASE CLIENT] Created new instance for:', instanceKey);
  console.log('🔍 [SUPABASE CLIENT] Storage type will be:', actualPersistSession ? 'localStorage (persistent)' : 'sessionStorage (temporary)');

  supabaseInstances.set(instanceKey as any, newInstance);
  return newInstance;
}

// Helper function to clear all Supabase sessions from both localStorage and sessionStorage
export function clearAllSupabaseSessions() {
  if (typeof window === 'undefined') return;
  
  console.log('🔍 [SUPABASE CLIENT] Clearing all Supabase sessions from storage');
  
  // Clear from localStorage
  const localStorageKeys = Object.keys(localStorage).filter(key => 
    key.includes('supabase') || key.includes('auth') || key.includes('session')
  );
  localStorageKeys.forEach(key => {
    console.log('🔍 [SUPABASE CLIENT] Removing from localStorage:', key);
    localStorage.removeItem(key);
  });
  
  // Clear from sessionStorage
  const sessionStorageKeys = Object.keys(sessionStorage).filter(key => 
    key.includes('supabase') || key.includes('auth') || key.includes('session')
  );
  sessionStorageKeys.forEach(key => {
    console.log('🔍 [SUPABASE CLIENT] Removing from sessionStorage:', key);
    sessionStorage.removeItem(key);
  });
  
  // Clear all cached instances to force recreation with new storage settings
  supabaseInstances.clear();
  console.log('🔍 [SUPABASE CLIENT] Cleared all cached Supabase instances');
}
