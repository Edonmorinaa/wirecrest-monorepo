/**
 * Client-safe utility functions
 * 
 * These functions are safe to use in client-side code.
 */

/**
 * Get VAPID public key for push notifications
 * Safe for client-side use
 */
export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
}

