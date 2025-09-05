'use client';

import { ThemeProvider } from 'next-themes';
// import { SessionProvider } from 'next-auth/react'; // Assuming this might still be here or planned
import { AuthProvider } from './auth-provider'; // Your Supabase auth provider
import { LoadingProvider } from './loading-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import React, { Suspense } from 'react';

// Create a new QueryClient instance with specific default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5 // 5 minutes
    }
  }
});

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* 
            If you were using next-auth, SessionProvider would go here.
            For Supabase, AuthProvider handles the session/user context.
          */}
          <Suspense fallback={<div>Loading...</div>}>
            <LoadingProvider>
              <AuthProvider>{children}</AuthProvider>
            </LoadingProvider>
          </Suspense>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
