/**
 * Directory Sync Router
 * 
 * tRPC router for Directory Sync (SCIM) integration management.
 * 
 * Note: Directory Sync functionality is currently disabled/under development.
 * See apps/dashboard/src/actions/dsync.ts for implementation details.
 */

import { TRPCError } from '@trpc/server';
import { prisma } from '@wirecrest/db';
import { getTeam } from '@/models/team';
import { throwIfNotAllowed } from '@/models/user';
import env from 'src/lib/env';

import { router, protectedProcedure, publicProcedure } from '../trpc';
import {
  dsyncSlugSchema,
  dsyncDirectorySchema,
  createDsyncConnectionSchema,
  updateDsyncConnectionSchema,
  dsyncUsersSchema,
  deleteDsyncUserSchema,
} from '../schemas/dsync.schema';

/**
 * Directory Sync Router
 */
export const dsyncRouter = router({
  /**
   * Get available directory sync providers
   */
  providers: publicProcedure.query(async () => {
    if (!env.teamFeatures.dsync) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Directory Sync feature not enabled',
      });
    }

    // Directory sync implementation is temporarily disabled
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: 'Directory Sync feature temporarily disabled',
    });
  }),

  /**
   * Get directory sync connections for a team
   */
  connections: protectedProcedure
    .input(dsyncSlugSchema)
    .query(async ({ input, ctx }) => {
      if (!env.teamFeatures.dsync) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Directory Sync feature not enabled',
        });
      }

      const team = await getTeam({ slug: input.slug });
      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Check team membership
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          teamId: team.id,
          userId: ctx.session.user.id,
        },
        include: {
          user: true,
          team: true,
        },
      });

      if (!teamMember) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      throwIfNotAllowed(teamMember, 'team_dsync', 'read');

      // Directory sync implementation is temporarily disabled
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Directory Sync feature temporarily disabled',
      });
    }),

  /**
   * Create directory sync connection
   */
  createConnection: protectedProcedure
    .input(createDsyncConnectionSchema)
    .mutation(async ({ input, ctx }) => {
      if (!env.teamFeatures.dsync) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Directory Sync feature not enabled',
        });
      }

      const team = await getTeam({ slug: input.slug });
      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Check team membership
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          teamId: team.id,
          userId: ctx.session.user.id,
        },
        include: {
          user: true,
          team: true,
        },
      });

      if (!teamMember) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      throwIfNotAllowed(teamMember, 'team_dsync', 'create');

      // Directory sync implementation is temporarily disabled
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Directory Sync feature temporarily disabled',
      });
    }),

  /**
   * Get directory sync connection by ID
   */
  connection: protectedProcedure
    .input(dsyncDirectorySchema)
    .query(async ({ input, ctx }) => {
      if (!env.teamFeatures.dsync) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Directory Sync feature not enabled',
        });
      }

      const team = await getTeam({ slug: input.slug });
      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Check team membership
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          teamId: team.id,
          userId: ctx.session.user.id,
        },
        include: {
          user: true,
          team: true,
        },
      });

      if (!teamMember) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      throwIfNotAllowed(teamMember, 'team_dsync', 'read');

      // Directory sync implementation is temporarily disabled
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Directory Sync feature temporarily disabled',
      });
    }),

  /**
   * Update directory sync connection
   */
  updateConnection: protectedProcedure
    .input(updateDsyncConnectionSchema)
    .mutation(async ({ input, ctx }) => {
      if (!env.teamFeatures.dsync) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Directory Sync feature not enabled',
        });
      }

      const team = await getTeam({ slug: input.slug });
      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Check team membership
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          teamId: team.id,
          userId: ctx.session.user.id,
        },
        include: {
          user: true,
          team: true,
        },
      });

      if (!teamMember) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      throwIfNotAllowed(teamMember, 'team_dsync', 'update');

      // Directory sync implementation is temporarily disabled
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Directory Sync feature temporarily disabled',
      });
    }),

  /**
   * Delete directory sync connection
   */
  deleteConnection: protectedProcedure
    .input(dsyncDirectorySchema)
    .mutation(async ({ input, ctx }) => {
      if (!env.teamFeatures.dsync) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Directory Sync feature not enabled',
        });
      }

      const team = await getTeam({ slug: input.slug });
      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Check team membership
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          teamId: team.id,
          userId: ctx.session.user.id,
        },
        include: {
          user: true,
          team: true,
        },
      });

      if (!teamMember) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      throwIfNotAllowed(teamMember, 'team_dsync', 'delete');

      // Directory sync implementation is temporarily disabled
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Directory Sync feature temporarily disabled',
      });
    }),

  /**
   * Get directory sync users
   */
  users: protectedProcedure.input(dsyncUsersSchema).query(async ({ input, ctx }) => {
    if (!env.teamFeatures.dsync) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Directory Sync feature not enabled',
      });
    }

    const team = await getTeam({ slug: input.slug });
    if (!team) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Team not found',
      });
    }

    // Check team membership
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: team.id,
        userId: ctx.session.user.id,
      },
      include: {
        user: true,
        team: true,
      },
    });

    if (!teamMember) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    throwIfNotAllowed(teamMember, 'team_dsync', 'read');

    // Directory sync implementation is temporarily disabled
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: 'Directory Sync feature temporarily disabled',
    });
  }),

  /**
   * Delete directory sync user
   */
  deleteUser: protectedProcedure
    .input(deleteDsyncUserSchema)
    .mutation(async ({ input, ctx }) => {
      if (!env.teamFeatures.dsync) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Directory Sync feature not enabled',
        });
      }

      const team = await getTeam({ slug: input.slug });
      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Check team membership
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          teamId: team.id,
          userId: ctx.session.user.id,
        },
        include: {
          user: true,
          team: true,
        },
      });

      if (!teamMember) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      throwIfNotAllowed(teamMember, 'team_dsync', 'delete');

      // Directory sync implementation is temporarily disabled
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Directory Sync feature temporarily disabled',
      });
    }),
});

