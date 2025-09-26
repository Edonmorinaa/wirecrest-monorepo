'use client';

import { AuthWrapper } from '@wirecrest/auth';

// ----------------------------------------------------------------------

/**
 * @wirecrest/auth integration with dashboard
 * This provider uses the shared auth package for all authentication logic
 */

// Main AuthProvider that uses @wirecrest/auth
export function AuthProvider({ children }) {
  return <AuthWrapper>{children}</AuthWrapper>;
}
