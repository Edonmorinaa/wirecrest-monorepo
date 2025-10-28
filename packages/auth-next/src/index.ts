// ============================================================================
// NEXT.JS AUTHENTICATION PACKAGE
// ============================================================================
// This package provides Next.js-specific auth functionality including:
// - NextAuth configuration and handlers
// - React hooks for client-side auth
// - Auth service API actions (password reset, registration, etc.)
//
// For server-only JWT verification (Express, scraper), use @wirecrest/auth-core
// ============================================================================

// ============================================================================
// CLIENT-SIDE EXPORTS - For React components and client-side usage
// ============================================================================

// Main auth wrapper component
export { AuthWrapper } from './components/AuthWrapper';

// Client-side auth hooks
export { useAuth } from './wrappers/authWrapper';
export { useUser } from './hooks/useUser';
export { useTeam } from './hooks/useTeam';
export { useSuperRole } from './hooks/useSuperRole';

// Client-side auth actions (using next-auth/react)
export { signIn, signOut } from './wrappers/nextAuthWrapper';

// ============================================================================
// SERVER-SIDE EXPORTS - For API routes and server actions
// ============================================================================

// NextAuth handlers and auth function
import { handlers as nextAuthHandlers, auth } from './config/nextAuth';
export { auth };
export const handlers = nextAuthHandlers;

// Export GET and POST for Next.js API routes
export const { GET, POST } = nextAuthHandlers;

// Auth service actions (password reset, registration, profile updates)
export {
  forgotPassword,
  resetPassword,
  updatePassword,
  joinUser,
  resendEmailVerification,
  unlockAccountRequest,
  updateUserProfile,
} from './actions';

// ============================================================================
// TYPES - TypeScript interfaces and enums
// ============================================================================
export * from './types/nextauth';

// ============================================================================
// RE-EXPORTS FROM AUTH-CORE - Server utilities available in Next.js context
// ============================================================================
// Import these when you need server-side auth utilities in Next.js
export {
  // Session management
  getSession,
  requireAuth,
  requireAdmin,
  hasRole,
  isAdmin,
  isSupport,
  isTenant,
  
  // Types
  type SessionUser,
  type Session,
  
  // Utilities
  isEmailAllowed,
  validateRecaptcha,
  maxLengthPolicies,
  exceededLoginAttemptsThreshold,
  incrementLoginAttempts,
  clearLoginAttempts,
} from '@wirecrest/auth-core';

