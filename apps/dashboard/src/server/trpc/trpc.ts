/**
 * tRPC Initialization & Base Procedures
 * 
 * This module initializes tRPC with SuperJSON transformer and defines
 * base procedures with different authentication levels:
 * - publicProcedure: No authentication required
 * - protectedProcedure: Requires authenticated user
 * - adminProcedure: Requires ADMIN or SUPPORT role
 * - superAdminProcedure: Requires ADMIN role
 */
import type { Context } from './context';

import { ZodError } from 'zod';
import superjson from 'superjson';
import { initTRPC, TRPCError } from '@trpc/server';

/**
 * Initialize tRPC with SuperJSON for serialization
 * SuperJSON handles Dates, Maps, Sets, etc. automatically
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router;
export const middleware = t.middleware;
export const createCallerFactory = t.createCallerFactory;

/**
 * Public procedure - no authentication required
 * Use for health checks, public data, etc.
 */
export const publicProcedure = t.procedure;

/**
 * Middleware to check if user is authenticated
 */
const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  return next({
    ctx: {
      // Narrow the session type to ensure user is present
      session: {
        ...ctx.session,
        user: ctx.session.user,
      },
    },
  });
});

/**
 * Protected procedure - requires authentication
 * Use for user-specific actions
 */
export const protectedProcedure = t.procedure.use(isAuthenticated);

/**
 * Middleware to check if user is admin or support
 */
const isAdminOrSupport = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  const userRole = ctx.session.user.superRole;
  if (userRole !== 'ADMIN' && userRole !== 'SUPPORT') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to access this resource',
    });
  }

  return next({
    ctx: {
      session: {
        ...ctx.session,
        user: ctx.session.user,
      },
    },
  });
});

/**
 * Admin procedure - requires ADMIN or SUPPORT role
 * Use for admin-level operations
 */
export const adminProcedure = t.procedure.use(isAdminOrSupport);

/**
 * Middleware to check if user is super admin
 */
const isSuperAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  if (ctx.session.user.superRole !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You must be a super administrator to access this resource',
    });
  }

  return next({
    ctx: {
      session: {
        ...ctx.session,
        user: ctx.session.user,
      },
    },
  });
});

/**
 * Super admin procedure - requires ADMIN role only
 * Use for super admin-only operations
 */
export const superAdminProcedure = t.procedure.use(isSuperAdmin);

/**
 * Middleware to verify team access
 * Use this after isAuthenticated to check if user has access to a specific team
 */
export const verifyTeamAccess = async (userId: string, teamId: string): Promise<boolean> => {
  const { prisma } = await import('@wirecrest/db');
  
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      userId,
      teamId,
    },
  });

  return !!teamMember;
};

/**
 * Export middleware for feature access
 * This is used in the routers to create feature-protected procedures
 */
export { requireFeature, checkPlatformSetup } from './middleware/feature-access';

