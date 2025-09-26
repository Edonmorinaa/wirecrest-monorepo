// ============================================================================
// CLIENT-SIDE AUTHENTICATION - For React components and client-side usage
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
export * from './actions/authActions';

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
