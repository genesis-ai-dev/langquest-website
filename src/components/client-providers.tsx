/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { ThemeProvider } from 'next-themes';
// import { SessionProvider } from 'next-auth/react'; // Assuming this might still be here or planned
import { AuthProvider } from './auth-provider'; // Your Supabase auth provider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import React from 'react';

// Create a new QueryClient instance with specific default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5 // 5 minutes
    }
  }
});

export function ClientProviders({
  children,
  pageProps
}: {
  children: React.ReactNode;
  pageProps?: any; // pageProps might be passed if using an older Next.js pattern or for specific needs
}) {
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
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
