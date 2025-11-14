/**
 * tRPC Server-Side Client
 * 
 * For server-side usage in Server Components and Server Actions.
 * This allows calling tRPC procedures directly without HTTP.
 */

import 'server-only';

import { createCallerFactory } from 'src/server/trpc/trpc';
import { appRouter } from 'src/server/trpc/root';
import { createContext } from 'src/server/trpc/context';

/**
 * Create a server-side caller
 * This can be used in Server Components and Server Actions
 */
export const createCaller = createCallerFactory(appRouter);

/**
 * Get a server-side API caller with context
 */
export async function getServerApi() {
  const context = await createContext();
  return createCaller(context);
}

