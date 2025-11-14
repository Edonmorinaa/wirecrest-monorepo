/**
 * OAuth (SSO) Router
 * 
 * tRPC router for Single Sign-On (SSO) connection management.
 * 
 * Note: SSO functionality is currently disabled/under development.
 * See apps/dashboard/src/actions/oauth.ts for implementation details.
 */

import { TRPCError } from '@trpc/server';
import { prisma } from '@wirecrest/db';
import { getTeam } from '@/models/team';
import { throwIfNotAllowed } from '@/models/user';
import env from 'src/lib/env';

import { router, protectedProcedure } from '../trpc';
import {
  oauthSlugSchema,
  ssoConnectionSchema,
  createSSOConnectionSchema,
  updateSSOConnectionSchema,
  deleteSSOConnectionSchema,
} from '../schemas/oauth.schema';

/**
 * OAuth (SSO) Router
 */
export const oauthRouter = router({
  /**
   * Get SSO connections for a team
   */
  connections: protectedProcedure
    .input(ssoConnectionSchema)
    .query(async ({ input, ctx }) => {
      if (!env.teamFeatures.sso) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'SSO feature not enabled',
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

      throwIfNotAllowed(teamMember, 'team_sso', 'read');

      // SSO implementation is temporarily disabled
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'SSO feature temporarily disabled',
      });
    }),

  /**
   * Create SSO connection
   */
  createConnection: protectedProcedure
    .input(createSSOConnectionSchema)
    .mutation(async ({ input, ctx }) => {
      if (!env.teamFeatures.sso) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'SSO feature not enabled',
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

      throwIfNotAllowed(teamMember, 'team_sso', 'create');

      // SSO implementation is temporarily disabled
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'SSO feature temporarily disabled',
      });
    }),

  /**
   * Update SSO connection
   */
  updateConnection: protectedProcedure
    .input(updateSSOConnectionSchema)
    .mutation(async ({ input, ctx }) => {
      if (!env.teamFeatures.sso) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'SSO feature not enabled',
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

      throwIfNotAllowed(teamMember, 'team_sso', 'update');

      // SSO implementation is temporarily disabled
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'SSO feature temporarily disabled',
      });
    }),

  /**
   * Delete SSO connection
   */
  deleteConnection: protectedProcedure
    .input(deleteSSOConnectionSchema)
    .mutation(async ({ input, ctx }) => {
      if (!env.teamFeatures.sso) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'SSO feature not enabled',
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

      throwIfNotAllowed(teamMember, 'team_sso', 'delete');

      // SSO implementation is temporarily disabled
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'SSO feature temporarily disabled',
      });
    }),

  /**
   * Get OIDC connections
   */
  oidcConnections: protectedProcedure
    .input(oauthSlugSchema)
    .query(async ({ input, ctx }) => {
      if (!env.teamFeatures.sso) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'SSO feature not enabled',
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
      });

      if (!teamMember) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      throwIfNotAllowed(teamMember, 'team_sso', 'read');

      // SSO implementation is temporarily disabled
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'SSO feature temporarily disabled',
      });
    }),
});

