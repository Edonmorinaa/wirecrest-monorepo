/**
 * Utils Router
 * 
 * tRPC router for utility operations:
 * - Hello world
 * - Invitations by token
 * - Review AI suggestions
 * - SAML certificates
 * - Workflow retry
 */

import { prisma } from '@wirecrest/db';
import { TRPCError } from '@trpc/server';
import { getInvitation, isInvitationExpired } from '@/models/invitation';

import { recordMetric } from 'src/actions/lib';

import { router, publicProcedure, protectedProcedure } from '../trpc';
import {
  syncStatusSchema,
  workflowIdSchema,
  teamSlugParamSchema,
  invitationTokenSchema,
} from '../schemas/utils.schema';

/**
 * Utils Router
 */
export const utilsRouter = router({
  /**
   * Hello world endpoint
   */
  hello: publicProcedure.query(() => ({ message: 'Hello World!' })),

  /**
   * Get invitation by token (public, for accepting invitations)
   */
  invitationByToken: publicProcedure
    .input(invitationTokenSchema)
    .query(async ({ input }) => {
      const invitation = await getInvitation({ token: input.token });

      if (!invitation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found',
        });
      }

      if (await isInvitationExpired(invitation.expires)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invitation expired. Please request a new one.',
        });
      }

      recordMetric('invitation.fetched');

      return invitation;
    }),

  /**
   * Get AI suggestions for reviews (protected)
   */
  reviewAISuggestions: protectedProcedure
    .input(teamSlugParamSchema)
    .query(async ({ ctx, input }) => {
      // Check team access
      const team = await prisma.team.findUnique({
        where: { slug: input.teamSlug },
        include: {
          members: {
            where: { userId: ctx.session.user.id },
          },
        },
      });

      if (!team || team.members.length === 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }

      // Simulate some processing time for a more realistic API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Return mock suggestions data
      // TODO: Implement actual AI suggestions logic
      return {
        suggestions: [
          {
            id: 'mock-review-1',
            reason: 'Contains keyword "service" with negative sentiment',
          },
          {
            id: 'mock-review-2',
            reason: 'Recent 1-star review that needs attention',
          },
          {
            id: 'mock-review-3',
            reason: 'Trending keyword mention of "price" in multiple reviews',
          },
        ],
      };
    }),

  /**
   * Get SAML certificate (protected)
   */
  samlCertificate: protectedProcedure.query(async () => {
    // Get SAML certificate from Jackson
    // const { directorySync } = await jackson();

    // This would typically return the public certificate
    // Implementation depends on your Jackson configuration
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: 'SAML certificate endpoint not implemented',
    });
  }),

  /**
   * Retry workflow (protected)
   */
  retryWorkflow: protectedProcedure
    .input(workflowIdSchema)
    .mutation(async ({ input }) => {
      // TODO: Implement workflow retry logic
      // This would depend on your workflow system implementation
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Workflow retry not implemented',
      });
    }),

  /**
   * Get sync status for a team (protected)
   * Fetches sync status from the scraper API
   */
  getSyncStatus: protectedProcedure
    .input(syncStatusSchema)
    .query(async ({ input }) => {
      try {
        // Fetch sync status from scraper API
        const scraperUrl = process.env.SCRAPER_API_URL || process.env.NEXT_PUBLIC_SCRAPER_API_URL;
        
        if (!scraperUrl) {
          console.warn('Scraper API URL not configured');
          return {
            recentSyncs: [],
            activeSchedules: 0,
            lastSync: null,
          };
        }

        const response = await fetch(`${scraperUrl}/api/sync-status/${input.teamId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
          console.error(`Failed to fetch sync status: ${response.status} ${response.statusText}`);
          return {
            recentSyncs: [],
            activeSchedules: 0,
            lastSync: null,
          };
        }

        const syncStatus = await response.json();

        recordMetric('utils.sync_status.fetched');

        return {
          recentSyncs: syncStatus.recentSyncs || [],
          activeSchedules: syncStatus.activeSchedules || 0,
          lastSync: syncStatus.lastSync || null,
        };
      } catch (error) {
        console.error('Error fetching sync status:', error);
        // Return empty status rather than throwing error
        // This allows the UI to continue functioning even if scraper is unavailable
        return {
          recentSyncs: [],
          activeSchedules: 0,
          lastSync: null,
        };
      }
    }),
});

