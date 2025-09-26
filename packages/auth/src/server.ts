// ============================================================================
// SERVER-SIDE AUTHENTICATION - For API routes and server components
// ============================================================================

// Server-side session management
export { getSession, getUser } from './wrappers/serverSession';
export * from './wrappers/serverActions';

// Server-side auth actions (API calls to auth-service)
export * from './actions/authActions';

// ============================================================================
// NEXTAUTH CONFIGURATION - For apps that need custom NextAuth setup
// ============================================================================
export { authOptions, handlers, signIn, signOut, auth } from './config/nextAuth';

// ============================================================================
// TYPES - All TypeScript interfaces and enums
// ============================================================================
export * from './types/auth';
export * from './types/user';
export * from './types/super-role';
export * from './types/nextauth';
export type { User, Team, SuperRole } from '@prisma/client';

// ============================================================================
// RBAC - Role-based access control utilities
// ============================================================================
export * from './lib/rbac';

// ============================================================================
// UTILITIES - Password, token, validation utilities
// ============================================================================
export * from './utils/password';
export * from './utils/token';
export * from './utils/validation';
export * from './utils/errors';
export * from './utils/recaptcha';
export * from './utils/email';
export * from './utils/accountLock';
export * from './utils/policies';

// ============================================================================
// SCHEMAS - Zod validation schemas
// ============================================================================
export * from './schemas/auth-schemas';
