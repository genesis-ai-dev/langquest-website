'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode } from 'react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { AuthProvider } from './auth-provider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // default: true
      staleTime: 1000 * 60 * 5 // 5 minutes
    }
  }
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
