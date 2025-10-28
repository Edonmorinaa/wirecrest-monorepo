/**
 * Auth Service Actions
 * These are server actions for the auth-service API (password reset, registration, etc.)
 * 
 * NOTE: For NextAuth signIn/signOut, import directly from:
 * - Server: import { signIn, signOut, auth } from '@wirecrest/auth-next/config'
 * - Client: import { signIn, signOut } from 'next-auth/react'
 */

export {
  forgotPassword,
  resetPassword,
  updatePassword,
  joinUser,
  resendEmailVerification,
  unlockAccountRequest,
  updateUserProfile,
} from './auth-service-actions';