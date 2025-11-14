/**
 * Webhooks Router
 * 
 * tRPC router for webhook management operations.
 * Note: Most webhook functionality is currently disabled/commented out in the codebase.
 * This router provides placeholders for when the features are re-enabled.
 */

import { TRPCError } from '@trpc/server';
import { prisma } from '@wirecrest/db';
import { router, protectedProcedure } from '../trpc';
import {
  createWebhookSchema,
  teamSlugWebhookSchema,
  getWebhookSchema,
  updateWebhookSchema,
  deleteWebhookSchema,
} from '../schemas/webhooks.schema';
import { getTeam } from '@/models/team';
import { createWebhook } from 'src/lib/svix';
import { recordMetric } from 'src/actions/lib';

/**
 * Helper function to verify team owner access
 */
async function verifyTeamOwner(teamId: string, userId: string) {
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Access denied. Only team owners can manage webhooks.',
    });
  }

  return membership;
}

/**
 * Webhooks Router
 */
export const webhooksRouter = router({
  /**
   * List all webhooks for a team
   * Currently disabled - placeholder for future implementation
   */
  list: protectedProcedure
    .input(teamSlugWebhookSchema)
    .query(async ({ ctx, input }) => {
      const team = await getTeam({ slug: input.slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is a member
      const membership = await prisma.teamMember.findFirst({
        where: {
          teamId: team.id,
          userId: ctx.session.user.id,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied. You must be a member of this team.',
        });
      }

      // TODO: Implement webhook listing when feature is re-enabled
      // const webhooksResponse = await listWebhooks(team.id);
      // return webhooksResponse?.data || [];

      return [];
    }),

  /**
   * Create a new webhook for a team
   */
  create: protectedProcedure
    .input(createWebhookSchema)
    .mutation(async ({ ctx, input }) => {
      const team = await getTeam({ slug: input.slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is owner
      await verifyTeamOwner(team.id, ctx.session.user.id);

      const webhook = await createWebhook(team.id, input.data);

      recordMetric('webhook.created');

      return webhook;
    }),

  /**
   * Get a specific webhook
   * Currently disabled - placeholder for future implementation
   */
  byId: protectedProcedure
    .input(getWebhookSchema)
    .query(async ({ ctx, input }) => {
      const team = await getTeam({ slug: input.slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is a member
      const membership = await prisma.teamMember.findFirst({
        where: {
          teamId: team.id,
          userId: ctx.session.user.id,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied. You must be a member of this team.',
        });
      }

      // TODO: Implement when feature is re-enabled
      // const endpointData = await findWebhook(team.id, input.endpointId);
      // return endpointData;

      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Webhook retrieval is currently disabled',
      });
    }),

  /**
   * Update a webhook
   * Currently disabled - placeholder for future implementation
   */
  update: protectedProcedure
    .input(updateWebhookSchema)
    .mutation(async ({ ctx, input }) => {
      const team = await getTeam({ slug: input.slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is owner
      await verifyTeamOwner(team.id, ctx.session.user.id);

      // TODO: Implement when feature is re-enabled
      // const updatedWebhook = await updateWebhook(team.id, input.endpointId, input.data);
      // return updatedWebhook;

      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Webhook update is currently disabled',
      });
    }),

  /**
   * Delete a webhook
   * Currently disabled - placeholder for future implementation
   */
  delete: protectedProcedure
    .input(deleteWebhookSchema)
    .mutation(async ({ ctx, input }) => {
      const team = await getTeam({ slug: input.slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is owner
      await verifyTeamOwner(team.id, ctx.session.user.id);

      // TODO: Implement when feature is re-enabled
      // await deleteWebhook(team.id, input.endpointId);

      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Webhook deletion is currently disabled',
      });
    }),

  /**
   * Delete all webhooks for a team
   * Currently disabled - placeholder for future implementation
   */
  deleteAll: protectedProcedure
    .input(teamSlugWebhookSchema)
    .mutation(async ({ ctx, input }) => {
      const team = await getTeam({ slug: input.slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is owner
      await verifyTeamOwner(team.id, ctx.session.user.id);

      // TODO: Implement when feature is re-enabled

      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Bulk webhook deletion is currently disabled',
      });
    }),
});

