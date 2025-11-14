/**
 * tRPC Context
 * 
 * Defines the context available to all tRPC procedures.
 * Includes Next-Auth session with user information and authentication state.
 */

import { auth } from '@wirecrest/auth-next';
import type { Session } from '@wirecrest/auth-next';

/**
 * Context available to all tRPC procedures
 */
export interface Context {
  session: Session | null;
}

/**
 * Create context for tRPC
 * This is called for each request and provides the session from Next-Auth
 */
export async function createContext(): Promise<Context> {
  const session = await auth();
  
  return {
    session,
  };
}

