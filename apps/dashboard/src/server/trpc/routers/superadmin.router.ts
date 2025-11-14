/**
 * Superadmin Router
 * 
 * tRPC router for super admin operations:
 * - Team management (CRUD)
 * - Platform data overview
 * 
 * All procedures require ADMIN super role.
 */

import { TRPCError } from '@trpc/server';
import { prisma } from '@wirecrest/db';
import { router, superAdminProcedure } from '../trpc';
import {
  superadminTeamIdSchema,
  superadminCreateTeamSchema,
  superadminUpdateTeamSchema,
} from '../schemas/superadmin.schema';
import { recordMetric } from 'src/actions/lib';

/**
 * Superadmin Router
 */
export const superadminRouter = router({
  /**
   * Get all teams (superadmin only)
   */
  allTeams: superAdminProcedure.query(async () => {
    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                superRole: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return teams;
  }),

  /**
   * Get team by ID (superadmin only)
   */
  teamById: superAdminProcedure
    .input(superadminTeamIdSchema)
    .query(async ({ input }) => {
      const team = await prisma.team.findUnique({
        where: { id: input.teamId },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  superRole: true,
                },
              },
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      return team;
    }),

  /**
   * Create a team (superadmin only)
   */
  createTeam: superAdminProcedure
    .input(superadminCreateTeamSchema)
    .mutation(async ({ input }) => {
      const team = await prisma.team.create({
        data: {
          name: input.name,
          slug: input.slug,
          domain: input.domain,
        },
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      recordMetric('superadmin.team.created');

      return team;
    }),

  /**
   * Update a team (superadmin only)
   */
  updateTeam: superAdminProcedure
    .input(superadminUpdateTeamSchema)
    .mutation(async ({ input }) => {
      const updateData: any = {};
      if (input.name) updateData.name = input.name;
      if (input.slug) updateData.slug = input.slug;
      if (input.domain !== undefined) updateData.domain = input.domain;

      const team = await prisma.team.update({
        where: { id: input.teamId },
        data: updateData,
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  superRole: true,
                },
              },
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      recordMetric('superadmin.team.updated');

      return team;
    }),

  /**
   * Delete a team (superadmin only)
   */
  deleteTeam: superAdminProcedure
    .input(superadminTeamIdSchema)
    .mutation(async ({ input }) => {
      await prisma.team.delete({
        where: { id: input.teamId },
      });

      recordMetric('superadmin.team.deleted');

      return { success: true };
    }),

  /**
   * Get comprehensive platform data for a team (superadmin only)
   */
  teamPlatformData: superAdminProcedure
    .input(superadminTeamIdSchema)
    .query(async ({ input }) => {
      try {
        // Fetch market identifiers
        const identifiers = await prisma.businessMarketIdentifier.findMany({
          where: { teamId: input.teamId },
          select: {
            id: true,
            platform: true,
            identifier: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        // Fetch platform profiles and counts in parallel
        const [google, facebook, tripadvisor, booking, instagram, tiktok] =
          await Promise.all([
            prisma.googleBusinessProfile.findFirst({
              where: { teamId: input.teamId },
              select: {
                id: true,
                placeId: true,
                rating: true,
                lastScrapedAt: true,
                _count: { select: { reviews: true } },
              },
            }),
            prisma.facebookBusinessProfile.findFirst({
              where: { teamId: input.teamId },
              select: {
                id: true,
                facebookUrl: true,
                _count: { select: { reviews: true } },
              },
            }),
            prisma.tripAdvisorBusinessProfile.findFirst({
              where: { teamId: input.teamId },
              select: {
                id: true,
                tripAdvisorUrl: true,
                rating: true,
                _count: { select: { reviews: true } },
              },
            }),
            prisma.bookingBusinessProfile.findFirst({
              where: { teamId: input.teamId },
              select: {
                id: true,
                bookingUrl: true,
                rating: true,
                _count: { select: { reviews: true } },
              },
            }),
            prisma.instagramBusinessProfile.findFirst({
              where: { teamId: input.teamId },
              select: {
                id: true,
                username: true,
                fullName: true,
                _count: { select: { dailySnapshots: true } },
              },
            }),
            prisma.tikTokBusinessProfile.findFirst({
              where: { teamId: input.teamId },
              select: {
                id: true,
                username: true,
                _count: { select: { dailySnapshots: true } },
              },
            }),
          ]);

        // Fetch sync status from scraper API
        let syncStatus = null;
        try {
          const scraperUrl =
            process.env.SCRAPER_API_URL || process.env.NEXT_PUBLIC_SCRAPER_API_URL;
          if (scraperUrl) {
            const response = await fetch(`${scraperUrl}/api/sync-status/${input.teamId}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(5000),
            });

            if (response.ok) {
              syncStatus = await response.json();
            }
          }
        } catch (error) {
          console.error('Failed to fetch sync status:', error);
          // Continue without sync status - it's not critical
        }

        // Get last review dates for each platform
        const [
          googleLastReview,
          facebookLastReview,
          tripadvisorLastReview,
          bookingLastReview,
        ] = await Promise.all([
          google
            ? prisma.googleReview.findFirst({
                where: { businessProfileId: google.id },
                orderBy: { publishedAtDate: 'desc' },
                select: { publishedAtDate: true },
              })
            : null,
          facebook
            ? prisma.facebookReview.findFirst({
                where: { businessProfileId: facebook.id },
                orderBy: { date: 'desc' },
                select: { date: true },
              })
            : null,
          tripadvisor
            ? prisma.tripAdvisorReview.findFirst({
                where: { businessProfileId: tripadvisor.id },
                orderBy: { publishedDate: 'desc' },
                select: { publishedDate: true },
              })
            : null,
          booking
            ? prisma.bookingReview.findFirst({
                where: { businessProfileId: booking.id },
                orderBy: { publishedDate: 'desc' },
                select: { publishedDate: true },
              })
            : null,
        ]);

        return {
          identifiers,
          profiles: {
            google: google
              ? {
                  ...google,
                  lastReviewDate: googleLastReview?.publishedAtDate || null,
                }
              : null,
            facebook: facebook
              ? {
                  ...facebook,
                  lastReviewDate: facebookLastReview?.date || null,
                }
              : null,
            tripadvisor: tripadvisor
              ? {
                  ...tripadvisor,
                  lastReviewDate: tripadvisorLastReview?.publishedDate || null,
                }
              : null,
            booking: booking
              ? {
                  ...booking,
                  lastReviewDate: bookingLastReview?.publishedDate || null,
                }
              : null,
            instagram,
            tiktok,
          },
          syncStatus,
        };
      } catch (error) {
        console.error('Error fetching team platform data:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch platform data',
        });
      }
    }),
});

