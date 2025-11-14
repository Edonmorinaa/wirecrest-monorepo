/**
 * tRPC API Handler for Next.js 15 App Router
 * 
 * This handler processes all tRPC requests at /api/trpc/*
 */

import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from 'src/server/trpc/root';
import { createContext } from 'src/server/trpc/context';

/**
 * Handler for all tRPC requests
 * Supports both GET and POST methods
 */
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };

