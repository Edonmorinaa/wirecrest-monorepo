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
  createTeamWithLocationSchema,
  getLocationPlatformDataSchema,
  getTeamWithLocationsSchema,
  superadminCreateTeamSchema,
  superadminTeamIdSchema,
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
   * DEPRECATED: This is an alias for backward compatibility
   * Use getTeamWithLocations or getLocationPlatformData instead
   */
  teamPlatformData: superAdminProcedure
    .input(superadminTeamIdSchema)
    .query(async ({ input }) => {
      try {
        // Fetch market identifiers (now location-based)
        const identifiers = await prisma.businessMarketIdentifier.findMany({
          where: { 
            location: {
              teamId: input.teamId,
            },
          },
          select: {
            id: true,
            platform: true,
            identifier: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        // Fetch team-level social platforms
        const [instagram, tiktok] = await Promise.all([
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

        // Fetch locations with their platform profiles
        const locations = await prisma.businessLocation.findMany({
          where: { teamId: input.teamId },
          include: {
            googleBusinessProfile: {
              select: {
                id: true,
                placeId: true,
                rating: true,
                _count: { select: { reviews: true } },
              },
            },
            facebookBusinessProfile: {
              select: {
                id: true,
                facebookUrl: true,
                _count: { select: { reviews: true } },
              },
            },
            tripAdvisorBusinessProfile: {
              select: {
                id: true,
                tripAdvisorUrl: true,
                rating: true,
                _count: { select: { reviews: true } },
              },
            },
            bookingBusinessProfile: {
              select: {
                id: true,
                bookingUrl: true,
                rating: true,
                _count: { select: { reviews: true } },
              },
            },
          },
        });

        // Return aggregated data from first location for backward compatibility
        const firstLocation = locations[0];

        return {
          identifiers,
          profiles: {
            google: firstLocation?.googleBusinessProfile || null,
            facebook: firstLocation?.facebookBusinessProfile || null,
            tripadvisor: firstLocation?.tripAdvisorBusinessProfile || null,
            booking: firstLocation?.bookingBusinessProfile || null,
            instagram,
            tiktok,
          },
          locations,
          syncStatus: null, // Deprecated
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
   * Create a team with first location (superadmin only)
   */
  createTeamWithLocation: superAdminProcedure
    .input(createTeamWithLocationSchema)
    .mutation(async ({ input }) => {
      try {
        // Check if team slug already exists
        const existingTeam = await prisma.team.findUnique({
          where: { slug: input.teamSlug },
        });

        if (existingTeam) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Team slug already exists',
          });
        }

        // Create team and location in a transaction
        const result = await prisma.$transaction(async (tx) => {
          // Create team
          const team = await tx.team.create({
            data: {
              name: input.teamName,
              slug: input.teamSlug,
            },
          });

          // Create first location
          const location = await tx.businessLocation.create({
            data: {
              teamId: team.id,
              name: input.locationName,
              slug: input.locationSlug,
              address: input.address,
              city: input.city,
              country: input.country,
              timezone: input.timezone,
            },
          });

          return { team, location };
        });

        recordMetric('superadmin.team_with_location.created');

        return result;
      } catch (error) {
        console.error('Error creating team with location:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create team with location',
        });
      }
    }),

  /**
   * Get team with all locations and platform counts (superadmin only)
   */
  getTeamWithLocations: superAdminProcedure
    .input(getTeamWithLocationsSchema)
    .query(async ({ input }) => {
      try {
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
                  },
                },
              },
            },
            locations: {
              include: {
                googleBusinessProfile: {
                  select: {
                    id: true,
                    placeId: true,
                    rating: true,
                    _count: { select: { reviews: true } },
                  },
                },
                facebookBusinessProfile: {
                  select: {
                    id: true,
                    facebookUrl: true,
                    _count: { select: { reviews: true } },
                  },
                },
                tripAdvisorBusinessProfile: {
                  select: {
                    id: true,
                    tripAdvisorUrl: true,
                    rating: true,
                    _count: { select: { reviews: true } },
                  },
                },
                bookingBusinessProfile: {
                  select: {
                    id: true,
                    bookingUrl: true,
                    rating: true,
                    _count: { select: { reviews: true } },
                  },
                },
              },
            },
            tiktokBusinessProfile: {
              select: {
                id: true,
                username: true,
                _count: { select: { dailySnapshots: true } },
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

        // Calculate platform counts per location
        const locationsWithPlatformCounts = team.locations.map((location) => {
          let platformCount = 0;
          let totalReviews = 0;

          if (location.googleBusinessProfile) {
            platformCount++;
            totalReviews += location.googleBusinessProfile._count.reviews;
          }
          if (location.facebookBusinessProfile) {
            platformCount++;
            totalReviews += location.facebookBusinessProfile._count.reviews;
          }
          if (location.tripAdvisorBusinessProfile) {
            platformCount++;
            totalReviews += location.tripAdvisorBusinessProfile._count.reviews;
          }
          if (location.bookingBusinessProfile) {
            platformCount++;
            totalReviews += location.bookingBusinessProfile._count.reviews;
          }

          return {
            id: location.id,
            name: location.name,
            slug: location.slug,
            address: location.address,
            city: location.city,
            country: location.country,
            timezone: location.timezone,
            platformCount,
            totalReviews,
            hasGoogle: !!location.googleBusinessProfile,
            hasFacebook: !!location.facebookBusinessProfile,
            hasTripadvisor: !!location.tripAdvisorBusinessProfile,
            hasBooking: !!location.bookingBusinessProfile,
          };
        });

        // Calculate total integrations
        const totalPlatformIntegrations = locationsWithPlatformCounts.reduce(
          (sum, loc) => sum + loc.platformCount,
          0
        );

        // Add social platforms count
        const socialPlatformsCount =
          (team.instagramBusinessProfile ? 1 : 0) +
          (team.tiktokBusinessProfile ? 1 : 0);

        recordMetric('superadmin.team_with_locations.fetched');

        return {
          team: {
            id: team.id,
            name: team.name,
            slug: team.slug,
            createdAt: team.createdAt,
            updatedAt: team.updatedAt,
            membersCount: team.members.length,
          },
          locations: locationsWithPlatformCounts,
          socialPlatforms: {
            instagram: team.instagramBusinessProfile,
            tiktok: team.tiktokBusinessProfile,
            count: socialPlatformsCount,
          },
          stats: {
            locationsCount: team.locations.length,
            totalPlatformIntegrations,
            totalSocialPlatforms: socialPlatformsCount,
            totalReviews: locationsWithPlatformCounts.reduce(
              (sum, loc) => sum + loc.totalReviews,
              0
            ),
          },
        };
        } catch (error) {
        console.error('Error fetching team with locations:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch team with locations',
        });
      }
    }),

  /**
   * Get platform data for a specific location (superadmin only)
   */
  getLocationPlatformData: superAdminProcedure
    .input(getLocationPlatformDataSchema)
    .query(async ({ input }) => {
      try {
        // Verify location belongs to team
        const location = await prisma.businessLocation.findFirst({
          where: {
            id: input.locationId,
            teamId: input.teamId,
          },
          include: {
            googleBusinessProfile: {
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
                _count: { select: { reviews: true } },
              },
            },
            facebookBusinessProfile: {
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
                _count: { select: { reviews: true } },
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
                _count: { select: { reviews: true } },
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
                _count: { select: { reviews: true } },
              },
            },
          },
        });

        if (!location) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Location not found',
          });
        }

        // Get market identifiers for this location
        const marketIdentifiers = await prisma.businessMarketIdentifier.findMany({
          where: { locationId: input.locationId },
        });

        // Helper to process platform data
        const processPlatformData = (platform: string, profile: any) => {
          const platformMapping: Record<string, string> = {
            'GOOGLE': 'GOOGLE_MAPS',
            'FACEBOOK': 'FACEBOOK',
            'TRIPADVISOR': 'TRIPADVISOR',
            'BOOKING': 'BOOKING',
          };
          
          const dbPlatform = platformMapping[platform] || platform;
          const marketIdentifier = marketIdentifiers.find(
            (mi) => mi.platform === dbPlatform
          );

          let reviewsCount = 0;
          let lastReviewDate = null;
          let status = 'not_started';

          if (profile) {
            if (profile.reviews && profile.reviews.length > 0) {
              const review = profile.reviews[0];
              lastReviewDate = review.publishedAtDate || review.date || review.publishedDate;
            }
            if (profile._count) {
              reviewsCount = profile._count.reviews;
            }
            status = 'completed';
          } else if (marketIdentifier) {
            status = 'identifier_set';
          }

          return {
            identifier: marketIdentifier?.identifier || null,
            profile: profile || null,
            reviewsCount,
            lastReviewDate,
            status,
            canCreateProfile: !!marketIdentifier && !profile,
            canGetReviews: !!profile,
          };
        };

        const platforms = {
          google: processPlatformData('GOOGLE', location.googleBusinessProfile),
          facebook: processPlatformData('FACEBOOK', location.facebookBusinessProfile),
          tripadvisor: processPlatformData('TRIPADVISOR', location.tripAdvisorBusinessProfile),
          booking: processPlatformData('BOOKING', location.bookingBusinessProfile),
        };

        // Calculate stats
        const totalReviews = Object.values(platforms).reduce(
          (sum, p) => sum + (p.reviewsCount || 0),
          0
        );
        
        const completedPlatforms = Object.values(platforms).filter(
          (p) => p.status === 'completed'
        ).length;
        
        const completionPercentage = (completedPlatforms / 4) * 100; // 4 business platforms

        recordMetric('superadmin.location_platform_data.fetched');

        return {
          location: {
            id: location.id,
            name: location.name,
            slug: location.slug,
            address: location.address,
            city: location.city,
            country: location.country,
            timezone: location.timezone,
          },
          platforms,
          stats: {
            totalReviews,
            completionPercentage,
            completedPlatforms,
            totalPlatforms: 4,
          },
        };
      } catch (error) {
        console.error('Error fetching location platform data:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch location platform data',
        });
      }
    }),

  /**
   * Get comprehensive team platform data with stats and activity (superadmin only)
   * Used by the tenant detail page
   * UPDATED: Now separates team-level (social) and location-level (business) platforms
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
            locations: {
              include: {
                googleBusinessProfile: {
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
                    _count: { select: { reviews: true } },
              },
            },
                facebookBusinessProfile: {
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
                    _count: { select: { reviews: true } },
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
                    _count: { select: { reviews: true } },
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
                    _count: { select: { reviews: true } },
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
                    snapshotSchedule: true,
                  },
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

        // Process social platforms (team-level: TikTok only now, Instagram moved to location-level)
        // Note: Social platforms don't use market identifiers
        const processSocialPlatformData = (platform: string) => {
          const marketIdentifier = null;

          const task = tenant.businessCreationTasks.find(
            (t: any) => t.platform === platform
          );

          let profile = null;
          let snapshotsCount = 0;
          let lastSnapshotDate = null;

          if (platform === 'TIKTOK') {
              profile = tenant.tiktokBusinessProfile;
              if (profile?.dailySnapshots) {
              snapshotsCount = profile.dailySnapshots.length;
              lastSnapshotDate = profile.dailySnapshots[0]?.snapshotDate || null;
              }
          }

          // Determine status
          let status = 'not_started';
          if (marketIdentifier) {
            if (task) {
              if (task.status === 'COMPLETED') {
                status = 'completed';
              } else if (task.status === 'IN_PROGRESS') {
                status = 'in_progress';
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
            snapshotsCount,
            lastSnapshotDate,
            task,
            status,
            canCreateProfile: !!marketIdentifier && (status === 'not_started' || status === 'identifier_set' || status === 'failed'),
            canRetry: status === 'failed',
            statusMessage: task?.lastError || '',
            isProcessing: task?.status === 'IN_PROGRESS',
            currentStep: task?.currentStep || null,
          };
        };

        // Process social platforms (TikTok only at team level)
        const socialPlatforms = {
          instagram: null, // Instagram is now location-level
          tiktok: processSocialPlatformData('TIKTOK'),
        };

        // Aggregate location data for overall stats
        let totalReviews = 0;
        let totalRating = 0;
        let ratingCount = 0;
        let completedLocations = 0;

        tenant.locations.forEach((location) => {
          let locationCompletedCount = 0;

          if (location.googleBusinessProfile) {
            if (location.googleBusinessProfile._count) {
              totalReviews += location.googleBusinessProfile._count.reviews;
            }
            if (location.googleBusinessProfile.rating) {
              totalRating += location.googleBusinessProfile.rating;
              ratingCount++;
            }
            locationCompletedCount++;
          }

          if (location.facebookBusinessProfile) {
            if (location.facebookBusinessProfile._count) {
              totalReviews += location.facebookBusinessProfile._count.reviews;
            }
            locationCompletedCount++;
          }

          if (location.tripAdvisorBusinessProfile) {
            if (location.tripAdvisorBusinessProfile._count) {
              totalReviews += location.tripAdvisorBusinessProfile._count.reviews;
            }
            if (location.tripAdvisorBusinessProfile.rating) {
              totalRating += location.tripAdvisorBusinessProfile.rating;
            ratingCount++;
          }
            locationCompletedCount++;
          }

          if (location.bookingBusinessProfile) {
            if (location.bookingBusinessProfile._count) {
              totalReviews += location.bookingBusinessProfile._count.reviews;
            }
            if (location.bookingBusinessProfile.rating) {
              totalRating += location.bookingBusinessProfile.rating;
              ratingCount++;
            }
            locationCompletedCount++;
          }

          // Consider location complete if it has at least 1 platform configured
          if (locationCompletedCount > 0) {
            completedLocations++;
          }
        });

        // Calculate completion percentage based on locations
        const totalLocations = tenant.locations.length;
        const completionPercentage = totalLocations > 0 
          ? (completedLocations / totalLocations) * 100 
          : 0;

        // Count active tasks
        const activeTasksCount = tenant.businessCreationTasks.filter(
          (task: any) => task.status === 'IN_PROGRESS'
        ).length;
        const failedTasksCount = tenant.businessCreationTasks.filter(
          (task: any) => task.status === 'FAILED'
        ).length;

        const stats = {
          totalReviews,
          totalPhotos: 0, // Deprecated
          averageRating: ratingCount > 0 ? totalRating / ratingCount : 0,
          completionPercentage,
          activeTasksCount,
          failedTasksCount,
          locationsCount: totalLocations,
          completedLocations,
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

        // Format locations with their platform data
        const locationsWithPlatforms = tenant.locations.map((location) => ({
          id: location.id,
          name: location.name,
          slug: location.slug,
          address: location.address,
          city: location.city,
          country: location.country,
          timezone: location.timezone,
          platforms: {
            google: location.googleBusinessProfile ? {
              id: location.googleBusinessProfile.id,
              placeId: location.googleBusinessProfile.placeId,
              rating: location.googleBusinessProfile.rating,
              reviewsCount: location.googleBusinessProfile._count.reviews,
              lastReviewDate: location.googleBusinessProfile.reviews[0]?.publishedAtDate || null,
            } : null,
            facebook: location.facebookBusinessProfile ? {
              id: location.facebookBusinessProfile.id,
              facebookUrl: location.facebookBusinessProfile.facebookUrl,
              reviewsCount: location.facebookBusinessProfile._count.reviews,
              lastReviewDate: location.facebookBusinessProfile.reviews[0]?.date || null,
            } : null,
            tripadvisor: location.tripAdvisorBusinessProfile ? {
              id: location.tripAdvisorBusinessProfile.id,
              tripAdvisorUrl: location.tripAdvisorBusinessProfile.tripAdvisorUrl,
              rating: location.tripAdvisorBusinessProfile.rating,
              reviewsCount: location.tripAdvisorBusinessProfile._count.reviews,
              lastReviewDate: location.tripAdvisorBusinessProfile.reviews[0]?.publishedDate || null,
            } : null,
            booking: location.bookingBusinessProfile ? {
              id: location.bookingBusinessProfile.id,
              bookingUrl: location.bookingBusinessProfile.bookingUrl,
              rating: location.bookingBusinessProfile.rating,
              reviewsCount: location.bookingBusinessProfile._count.reviews,
              lastReviewDate: location.bookingBusinessProfile.reviews[0]?.publishedDate || null,
            } : null,
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
          locations: locationsWithPlatforms,
          socialPlatforms,
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

