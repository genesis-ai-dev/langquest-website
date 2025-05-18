/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { ThemeProvider } from 'next-themes';
import { SessionProvider } from 'next-auth/react'; // Assuming this might still be here or planned
import { AuthProvider } from './auth-provider'; // Your Supabase auth provider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Create a new QueryClient instance
const queryClient = new QueryClient();

export function ClientProviders({
  children,
  pageProps
}: {
  children: React.ReactNode;
  pageProps?: any; // pageProps might be passed if using an older Next.js pattern or for specific needs
}) {
  return (
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
    </QueryClientProvider>
  );
}
