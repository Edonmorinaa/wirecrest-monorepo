'use client';

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';

/**
 * Sign in with provider
 */
export const signIn = async (provider?: string, options?: { redirect?: boolean; callbackUrl?: string }) => {
  try {
    // Handle redirect option with proper type narrowing for NextAuth overloads
    if (options?.redirect === false) {
      const result = await nextAuthSignIn(provider, { redirect: false, callbackUrl: options.callbackUrl });
      return result;
    } else {
      const result = await nextAuthSignIn(provider, { redirect: true, callbackUrl: options?.callbackUrl });
      return result;
    }
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

/**
 * Sign out with cleanup
 */
export const signOut = async (options?: { redirect?: boolean }) => {
  try {
    // Call auth-service for custom cleanup (team cache, etc.)
    await customSignOut();
    
    // Use NextAuth's signOut to ensure complete cleanup with proper type narrowing
    if (options?.redirect === true) {
      await nextAuthSignOut({ redirect: true });
    } else {
      await nextAuthSignOut({ redirect: false });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error during sign out:', error);
    // Even if custom signout fails, try NextAuth signout as fallback
    try {
      if (options?.redirect === true) {
        await nextAuthSignOut({ redirect: true });
      } else {
        await nextAuthSignOut({ redirect: false });
      }
    } catch (fallbackError) {
      console.error('Fallback NextAuth signout also failed:', fallbackError);
    }
    throw error;
  }
};

import { authApiClient } from '../services/authApiClient';

/**
 * Auth actions that internally call the auth-service API
 * These provide the same interface as the original dashboard actions
 * but delegate to the auth-service behind the scenes
 */

export const forgotPassword = async (data: { email: string; recaptchaToken: string }) => {
  return await authApiClient.forgotPassword(data.email, data.recaptchaToken);
};

export const resetPassword = async (data: { token: string; password: string }) => {
  return await authApiClient.resetPassword(data.token, data.password);
};

export const updatePassword = async (data: { currentPassword: string; newPassword: string }) => {
  return await authApiClient.updatePassword(data.currentPassword, data.newPassword);
};

export const joinUser = async (data: {
  name: string;
  email: string;
  password: string;
  team?: string;
  inviteToken?: string;
  recaptchaToken: string;
}) => {
  console.log('joinUser', data);
  return await authApiClient.registerUser(data);
};

export const resendEmailVerification = async (data: { email: string }) => {
  return await authApiClient.resendEmailVerification(data.email);
};

export const unlockAccountRequest = async (data: { email: string; expiredToken: string }) => {
  return await authApiClient.unlockAccountRequest(data.email, data.expiredToken);
};

// Note: customSignOut, getUserSessions, and deleteUserSession are not needed
// for JWT-based authentication as NextAuth handles session management
export const customSignOut = async () => {
  try {
    // Clear feature cache on logout to ensure fresh data on next login
    console.log('🧹 Clearing feature cache on logout...');
    
    // Import billing package dynamically to avoid circular dependencies
    try {
      // @ts-ignore - billing package may not be available
      const { clearAllCachesImmediately } = await import('@wirecrest/billing');
      await clearAllCachesImmediately('user_logout');
    } catch (error) {
      console.log('⚠️ Billing package not available, skipping cache clear:', error);
    }
    
    console.log('✅ Feature cache cleared on logout');
    return { success: true, message: 'Sign out handled by NextAuth with cache clearing' };
  } catch (error) {
    console.error('❌ Error clearing cache on logout:', error);
    // Don't fail logout if cache clearing fails
    return { success: true, message: 'Sign out handled by NextAuth (cache clearing failed)' };
  }
};

export const getUserSessions = async () => {
  // For JWT-based auth, sessions are managed by NextAuth
  return { success: true, data: [], message: 'Sessions managed by NextAuth' };
};

export const deleteUserSession = async (sessionId: string) => {
  // For JWT-based auth, session deletion is handled by NextAuth
  return { success: true, message: 'Session deletion handled by NextAuth' };
};

export const updateUserProfile = async (data: { name?: string; email?: string }) => {
  return await authApiClient.updateUserProfile(data);
};

