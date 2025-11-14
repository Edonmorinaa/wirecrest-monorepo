/**
 * tRPC Client Configuration
 * 
 * Provides the tRPC React Query hooks and provider for client-side usage.
 * Must be used in client components only.
 */

'use client';

import type { AppRouter } from 'src/server/trpc/root';

import SuperJSON from 'superjson';
import { useState, useEffect } from 'react';
import { createTRPCReact } from '@trpc/react-query';
import { loggerLink, httpBatchLink } from '@trpc/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

/**
 * Create typed tRPC hooks
 * These hooks will have full type inference from the server
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Get base URL for tRPC API
 */
function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Browser should use relative path
    return '';
  }
  
  // Server-side rendering should use absolute URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Development fallback
  return `http://localhost:${process.env.PORT ?? 3032}`;
}

/**
 * tRPC Provider Component
 * Wrap your app with this provider to enable tRPC hooks
 */
export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // SPA Optimization: Longer stale time for faster perceived performance
            // Data is considered fresh for 5 minutes before refetching
            staleTime: 5 * 60 * 1000, // 5 minutes
            
            // SPA Optimization: Cache data for 10 minutes in memory
            // This allows instant navigation back to previously viewed pages
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            
            // SPA Optimization: Prevent unnecessary refetches
            refetchOnWindowFocus: false, // Don't refetch when user returns to tab
            refetchOnReconnect: false,   // Don't refetch on network reconnect
            refetchOnMount: false,       // Don't refetch if data already exists
            
            // Fail fast for better UX
            retry: 1,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  // Setup persistent cache using localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const persister = createAsyncStoragePersister({
      storage: {
        getItem: async (key) => window.localStorage.getItem(key),
        setItem: async (key, value) => window.localStorage.setItem(key, value),
        removeItem: async (key) => window.localStorage.removeItem(key),
      },
      key: 'wirecrest-query-cache',
      // Serialize with SuperJSON for proper data type handling (Dates, BigInt, etc.)
      serialize: (data) => SuperJSON.stringify(data),
      deserialize: (data) => SuperJSON.parse(data),
    });

    const persistOptions = {
      queryClient,
      persister,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours - how long to persist cache in localStorage
      dehydrateOptions: {
        // Only persist successful queries (not errors or loading states)
        shouldDehydrateQuery: (query: any) => {
          const queryState = query.state;
          // Don't persist if query has error or is currently loading
          return queryState.status === 'success';
        },
      },
    };

    // Initialize persistent cache
    persistQueryClient(persistOptions);

    // No cleanup needed - persister handles it
  }, [queryClient]);

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === 'development' ||
            (op.direction === 'down' && op.result instanceof Error),
        }),
        httpBatchLink({
          // @ts-ignore - tRPC v11 transformer type inference limitation (works correctly at runtime)
          transformer: SuperJSON,
          url: `${getBaseUrl()}/api/trpc`,
          headers() {
            const headers = new Headers();
            headers.set('x-trpc-source', 'nextjs-react');
            return headers;
          },
          // Set max URL length for batching
          maxURLLength: 2083,
        }),
      ],
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </trpc.Provider>
    </QueryClientProvider>
  );
}

