// ============================================================================
// CORE AUTH UTILITIES - Re-exports from @wirecrest/auth-core
// ============================================================================
// This provides access to server-side auth utilities from auth-core
// Use this subpath export when you only need core auth functionality
// without Next.js-specific features
//
// Usage: import { getSession, requireAuth } from '@wirecrest/auth-next/core'
// ============================================================================

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
  extractEmailDomain,
  
  // Password utilities
  hashPassword,
  verifyPassword,
  
  // Token utilities
  generateToken,
  generateSecureToken,
  
  // Validation utilities
  validateEmail,
  slugify,
  
  // RBAC
  getUserSuperRoleConfig,
  canUserAccessRoute,
  userHasDashboardAccess,
  userHasPermission,
  SuperResource,
  SuperAction,
  type SuperRoleConfig,
  
  // Schemas
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  userJoinSchema,
  resendEmailTokenSchema,
  resendLinkRequestSchema,
  validateWithSchema,
  
  // Errors
  ApiError,
  recordMetric,
  
  // Account Lock
  unlockAccount,
  isAccountLocked,
  
  // Policies
  passwordPolicies,
} from '@wirecrest/auth-core';