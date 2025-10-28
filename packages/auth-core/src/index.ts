// ============================================================================
// SERVER-ONLY AUTH CORE - Pure Node.js, no Next.js or browser dependencies
// ============================================================================
// This package provides JWT verification and session management that works
// in any Node.js environment (Express, scraper, etc.)
//
// Use @wirecrest/auth-next for Next.js-specific auth functionality
// ============================================================================

// Session management - JWT verification, requireAuth, requireAdmin
export * from './session';

// Types - User, Session, SuperRole, etc.
export * from './types';

// Utilities - Pure server-side helpers
export * from './utils';

// Schemas - Zod validation schemas
export * from './schemas';

// RBAC - Role-based access control
export * from './lib';
