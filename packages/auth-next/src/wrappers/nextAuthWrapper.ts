'use client';

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';

/**
 * NextAuth wrapper functions - PURE LOGIC, NO UI
 * All NextAuth complexity is hidden behind these functions
 */

interface SignInOptions {
  redirect?: boolean;
  callbackUrl?: string;
  [key: string]: unknown;
}

interface SignOutOptions {
  redirect?: boolean;
  redirectTo?: string;
}

/**
 * Sign in function with automatic error handling
 */
export const signIn = async (provider?: string, options?: SignInOptions) => {
  try {
    if (options?.redirect === false) {
      const result = await nextAuthSignIn(provider, { ...options, redirect: false });
      return result;
    } else {
      await nextAuthSignIn(provider, { ...options, redirect: true });
      return { ok: true };
    }
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

/**
 * Sign out function that handles both NextAuth and auth-service cleanup
 */
export const signOut = async (options?: SignOutOptions) => {
  try {
    // Call auth-service for custom cleanup (team cache, etc.)    
    /**
     * NextAuth's signOut uses `callbackUrl` (not `redirectTo`) to determine the redirect destination.
     * If `callbackUrl` is not provided, it defaults to the site root or NEXTAUTH_URL (which may be localhost in dev).
     * We map our `redirectTo` option to NextAuth's `callbackUrl` to ensure correct redirection.
     */
    const callbackUrl = options?.redirectTo ?? '/';

    if (options?.redirect === false) {
      await nextAuthSignOut({
        redirect: false,
        callbackUrl,
      });
    } else {
      await nextAuthSignOut({
        redirect: true,
        callbackUrl,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error during sign out:', error);
    // Even if custom signout fails, try NextAuth signout as fallback
    try {
      if (options?.redirect === false) {
        await nextAuthSignOut({
          redirect: false,
        } as any);
      } else {
        await nextAuthSignOut({
          redirect: true,
        } as any);
      }
    } catch (fallbackError) {
      console.error('Fallback NextAuth signout also failed:', fallbackError);
    }
    throw error;
  }
};

