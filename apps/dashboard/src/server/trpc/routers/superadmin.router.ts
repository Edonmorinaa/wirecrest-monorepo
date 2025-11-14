/**
 * Superadmin Router
 * 
 * tRPC router for super admin operations:
 * - Team management (CRUD)
 * - Platform data overview
 * 
 * All procedures require ADMIN super role.
 */

import { prisma } from '@wirecrest/db';
import { TRPCError } from '@trpc/server';

import { recordMetric } from 'src/actions/lib';

import { router, superAdminProcedure } from '../trpc';
import {
  superadminTeamIdSchema,
  superadminCreateTeamSchema,
  superadminUpdateTeamSchema,
} from '../schemas/superadmin.schema';

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
   * This is an alias for backward compatibility
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

  /**
   * Get comprehensive team platform data with stats and activity (superadmin only)
   * Used by the tenant detail page
   */
  getTeamPlatformData: superAdminProcedure
    .input(superadminTeamIdSchema)
    .query(async ({ input }) => {
      try {
        // Fetch tenant with all related data
        const tenant = await prisma.team.findUnique({
          where: { id: input.teamId },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            marketIdentifiers: true,
            businessProfile: {
              include: {
                reviews: {
                  select: {
                    id: true,
                    publishedAtDate: true,
                    rating: true,
                  },
                  orderBy: { publishedAtDate: 'desc' },
                  take: 1,
                },
              },
            },
            facebookBusinessProfiles: {
              include: {
                reviews: {
                  select: {
                    id: true,
                    date: true,
                    isRecommended: true,
                  },
                  orderBy: { date: 'desc' },
                  take: 1,
                },
              },
            },
            tripAdvisorBusinessProfile: {
              include: {
                reviews: {
                  select: {
                    id: true,
                    publishedDate: true,
                    rating: true,
                  },
                  orderBy: { publishedDate: 'desc' },
                  take: 1,
                },
              },
            },
            bookingBusinessProfile: {
              include: {
                reviews: {
                  select: {
                    id: true,
                    publishedDate: true,
                    rating: true,
                  },
                  orderBy: { publishedDate: 'desc' },
                  take: 1,
                },
              },
            },
            instagramBusinessProfile: {
              include: {
                dailySnapshots: {
                  select: {
                    id: true,
                    snapshotDate: true,
                    followersCount: true,
                  },
                  orderBy: { snapshotDate: 'desc' },
                  take: 1,
                },
              },
            },
            tiktokBusinessProfile: {
              include: {
                dailySnapshots: {
                  select: {
                    id: true,
                    snapshotDate: true,
                    followerCount: true,
                  },
                  orderBy: { snapshotDate: 'desc' },
                  take: 1,
                },
              },
            },
            businessCreationTasks: {
              include: {
                statusMessages: {
                  orderBy: { timestamp: 'desc' },
                  take: 5,
                },
                stepLogs: {
                  orderBy: { startedAt: 'desc' },
                  take: 10,
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        if (!tenant) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Tenant not found',
          });
        }

        // Helper to process platform data
        const processPlatformData = (platform: string) => {
          // Map platform names to match database format
          const platformMapping: Record<string, string> = {
            'GOOGLE': 'GOOGLE_MAPS',
            'FACEBOOK': 'FACEBOOK',
            'TRIPADVISOR': 'TRIPADVISOR',
            'BOOKING': 'BOOKING',
            'INSTAGRAM': 'INSTAGRAM',
            'TIKTOK': 'TIKTOK'
          };
          
          const dbPlatform = platformMapping[platform] || platform;
          
          const marketIdentifier = tenant.marketIdentifiers.find(
            (mi: any) => mi.platform === dbPlatform
          );

          const task = tenant.businessCreationTasks.find(
            (t: any) => t.platform === platform
          );

          let profile = null;
          let reviewsCount = 0;
          let lastReviewDate = null;

          // Get platform-specific profile and reviews
          switch (platform) {
            case 'GOOGLE':
              profile = tenant.businessProfile;
              if (profile?.reviews) {
                reviewsCount = profile.reviews.length;
                lastReviewDate = profile.reviews[0]?.publishedAtDate || null;
              }
              break;
            case 'FACEBOOK':
              profile = tenant.facebookBusinessProfiles;
              if (profile?.reviews) {
                reviewsCount = profile.reviews.length;
                lastReviewDate = profile.reviews[0]?.date || null;
              }
              break;
            case 'TRIPADVISOR':
              profile = tenant.tripAdvisorBusinessProfile;
              if (profile?.reviews) {
                reviewsCount = profile.reviews.length;
                lastReviewDate = profile.reviews[0]?.publishedDate || null;
              }
              break;
            case 'BOOKING':
              profile = tenant.bookingBusinessProfile;
              if (profile?.reviews) {
                reviewsCount = profile.reviews.length;
                lastReviewDate = profile.reviews[0]?.publishedDate || null;
              }
              break;
            case 'INSTAGRAM':
              profile = tenant.instagramBusinessProfile;
              if (profile?.dailySnapshots) {
                reviewsCount = profile.dailySnapshots.length;
                lastReviewDate = profile.dailySnapshots[0]?.snapshotDate || null;
              }
              break;
            case 'TIKTOK':
              profile = tenant.tiktokBusinessProfile;
              if (profile?.dailySnapshots) {
                reviewsCount = profile.dailySnapshots.length;
                lastReviewDate = profile.dailySnapshots[0]?.snapshotDate || null;
              }
              break;
            default:
              // Handle unknown platform
              break;
          }

          // Determine status
          let status = 'not_started';
          if (marketIdentifier) {
            if (task) {
              if (task.status === 'COMPLETED') {
                status = 'completed';
              } else if (task.status === 'IN_PROGRESS') {
                status = task.currentStep === 'CREATING_PROFILE' ? 'profile_in_progress' : 'reviews_in_progress';
              } else if (task.status === 'FAILED') {
                status = 'failed';
              }
            } else {
              status = 'identifier_set';
            }
          }

          return {
            identifier: marketIdentifier?.identifier || null,
            profile,
            reviewsCount,
            lastReviewDate,
            task,
            status,
            canCreateProfile: !!marketIdentifier && (status === 'not_started' || status === 'identifier_set' || status === 'failed'),
            canGetReviews: status === 'completed' || status === 'profile_completed',
            canRetry: status === 'failed',
            statusMessage: task?.lastError || '',
            isProcessing: task?.status === 'IN_PROGRESS',
            currentStep: task?.currentStep || null,
          };
        };

        // Process platform data
        const platforms = {
          google: processPlatformData('GOOGLE'),
          facebook: processPlatformData('FACEBOOK'),
          tripadvisor: processPlatformData('TRIPADVISOR'),
          booking: processPlatformData('BOOKING'),
          instagram: processPlatformData('INSTAGRAM'),
          tiktok: processPlatformData('TIKTOK'),
        };

        // Calculate stats
        let totalReviews = 0;
        let totalPhotos = 0;
        let totalRating = 0;
        let ratingCount = 0;
        let activeTasksCount = 0;
        let failedTasksCount = 0;

        Object.values(platforms).forEach((platform: any) => {
          totalReviews += platform.reviewsCount || 0;
          
          if (platform.task) {
            if (platform.task.status === 'IN_PROGRESS') {
              activeTasksCount++;
            } else if (platform.task.status === 'FAILED') {
              failedTasksCount++;
            }
          }

          if (platform.profile?.rating) {
            totalRating += platform.profile.rating;
            ratingCount++;
          }
        });

        const totalPlatforms = Object.keys(platforms).length;
        const completedPlatforms = Object.values(platforms).filter((p: any) => p.status === 'completed').length;
        const completionPercentage = (completedPlatforms / totalPlatforms) * 100;

        const stats = {
          totalReviews,
          totalPhotos,
          averageRating: ratingCount > 0 ? totalRating / ratingCount : 0,
          completionPercentage,
          activeTasksCount,
          failedTasksCount,
        };

        // Get recent activity
        const activities = await prisma.businessStatusMessage.findMany({
          where: {
            businessCreation: {
              teamId: input.teamId,
            },
          },
          include: {
            businessCreation: {
              select: {
                platform: true,
              },
            },
          },
          orderBy: { timestamp: 'desc' },
          take: 20,
        });

        const recentActivity = activities.map(activity => ({
          id: activity.id,
          type: activity.status === 'COMPLETED' ? 'task_completed' : 
                activity.status === 'FAILED' ? 'task_failed' : 'status_message',
          platform: activity.businessCreation.platform,
          message: activity.message,
          timestamp: activity.timestamp,
          metadata: {
            step: activity.step,
            messageType: activity.messageType,
          },
        }));

        recordMetric('superadmin.team_platform_data.fetched');

        return {
          team: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            createdAt: tenant.createdAt,
            updatedAt: tenant.updatedAt,
            members: tenant.members.map(member => ({
              id: member.id,
              role: member.role,
              user: member.user,
            })),
          },
          platforms,
          stats,
          recentActivity,
        };
      } catch (error) {
        console.error('Error fetching team platform data:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch team platform data',
        });
      }
    }),
});

