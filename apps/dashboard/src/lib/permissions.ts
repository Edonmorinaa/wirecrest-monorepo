import { prisma } from '@wirecrest/db';
import { getSession } from '@wirecrest/auth/server';
import { NextApiRequest, NextApiResponse } from 'next';

import { ApiError } from 'src/lib/errors';

export { permissions, availableRoles } from './permissions-client';
// Re-export client-safe types and constants
export type { Action, Resource, Permission } from './permissions-client';

/**
 * Helper function to check if user is a superrole admin (API route version)
 * Throws ApiError if not authorized
 */
export async function throwIfNotSuperAdminAPI(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Check superRole from session (now included via NextAuth session callback)
  if (session.user.superRole !== 'ADMIN') {
    throw new ApiError(403, 'Access denied. Superadmin privileges required.');
  }

  // Return user info for convenience (fetch from DB if needed)
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
}

/**
 * Check if user is a superrole admin without throwing
 */
export async function isUserSuperAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<boolean> {
  try {
    const session = await getSession(req, res);
    if (!session?.user?.email) {
      return false;
    }

    // Check superRole from session (now included via NextAuth session callback)
    return session.user.superRole === 'ADMIN';
  } catch {
    return false;
  }
}

/**
 * Server action version of throwIfNotSuperAdmin
 */
export async function throwIfNotSuperAdmin() {
  const session = await getSession();
  
  if (!session?.user?.email) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Check superRole from session
  if (session.user.superRole !== 'ADMIN') {
    throw new ApiError(403, 'Access denied. Superadmin privileges required.');
  }

  // Return user info for convenience
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
}
