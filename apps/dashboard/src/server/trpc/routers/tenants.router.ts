/**
 * Tenants Router
 * 
 * tRPC router for tenant (multi-tenancy) management:
 * - List tenants with filters
 * - Get tenant details
 * - Create/update/delete tenants
 * 
 * All procedures require ADMIN super role.
 */

import { prisma } from '@wirecrest/db';
import { TRPCError } from '@trpc/server';

import { RealtimeBroadcaster } from 'src/lib/realtime';

import { router, adminProcedure, protectedProcedure } from '../trpc';
import {
  createTenantSchema,
  tenantIdSchema,
  tenantSlugSchema,
  getTenantsSchema,
  updateTenantSchema,
} from '../schemas/tenants.schema';

/**
 * Tenants Router
 */
export const tenantsRouter = router({
  /**
   * Get all tenants with filters (admin only)
   */
  list: adminProcedure.input(getTenantsSchema).query(async ({ input }) => {
    const { page, limit, search, status, platform, sortBy, sortOrder } = input;
    const offset = (page - 1) * limit;

    try {
      // Build where clause
      const whereClause: any = {};

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Build order by
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      // Get teams with member and location counts
      const teams = await prisma.team.findMany({
        where: whereClause,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          _count: {
            select: {
              members: true,
              locations: true,
            },
          },
          members: {
            include: {
              user: true,
            },
          },
          locations: {
            include: {
              googleBusinessProfile: {
                select: { id: true },
              },
              facebookBusinessProfile: {
                select: { id: true },
              },
              tripAdvisorBusinessProfile: {
                select: { id: true },
              },
              bookingBusinessProfile: {
                select: { id: true },
              },
              instagramBusinessProfile: {
                select: { id: true },
              },
              tiktokBusinessProfile: {
                select: { id: true },
              },
            },
          },
        },
      });

      // Calculate status for each tenant with location-based metrics
      const tenantsWithStatus = teams.map((team) => {
        // Count total platform integrations across all locations
        let totalPlatformIntegrations = 0;
        let completedLocations = 0;

        team.locations.forEach((location) => {
          let locationPlatformCount = 0;

          if (location.googleBusinessProfile) {
            totalPlatformIntegrations++;
            locationPlatformCount++;
          }
          if (location.facebookBusinessProfile) {
            totalPlatformIntegrations++;
            locationPlatformCount++;
          }
          if (location.tripAdvisorBusinessProfile) {
            totalPlatformIntegrations++;
            locationPlatformCount++;
          }
          if (location.bookingBusinessProfile) {
            totalPlatformIntegrations++;
            locationPlatformCount++;
          }

          // Consider location complete if it has at least 1 platform
          if (locationPlatformCount > 0) {
            completedLocations++;
          }
        });

        // Check for social platforms in locations (now location-based)
        team.locations.forEach((location) => {
          if (location.instagramBusinessProfile) totalPlatformIntegrations++;
          if (location.tiktokBusinessProfile) totalPlatformIntegrations++;
        });

        // Calculate overall progress based on locations setup
        const locationsCount = team._count.locations;
        const overallProgress = locationsCount > 0
          ? (completedLocations / locationsCount) * 100
          : 0;

        return {
          id: team.id,
          name: team.name,
          slug: team.slug,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt,
          membersCount: team._count.members,
          locationsCount,
          totalPlatformIntegrations,
          completedLocations,
          overallProgress,
          lastActivity: team.updatedAt,
        };
      });

      // Apply filters if provided
      let filteredTenants = tenantsWithStatus;

      if (status) {
        filteredTenants = filteredTenants.filter((tenant) => {
          // Map status to progress ranges
          if (status === 'completed') return tenant.overallProgress === 100;
          if (status === 'in_progress') return tenant.overallProgress > 0 && tenant.overallProgress < 100;
          if (status === 'not_started') return tenant.overallProgress === 0;
          return true;
        });
      }

      // Platform filter is less relevant now, but keep for backward compatibility
      // Could filter by "has this platform in any location"
      if (platform) {
        filteredTenants = filteredTenants.filter((tenant) => {
          return tenant.totalPlatformIntegrations > 0;
        });
      }

      // Calculate stats
      const stats = {
        totalTenants: tenantsWithStatus.length,
        completedTenants: tenantsWithStatus.filter((t) => t.overallProgress === 100)
          .length,
        inProgressTenants: tenantsWithStatus.filter(
          (t) => t.overallProgress > 0 && t.overallProgress < 100
        ).length,
        notStartedTenants: tenantsWithStatus.filter((t) => t.overallProgress === 0)
          .length,
        totalLocations: tenantsWithStatus.reduce((sum, t) => sum + t.locationsCount, 0),
        totalIntegrations: tenantsWithStatus.reduce((sum, t) => sum + t.totalPlatformIntegrations, 0),
        failedTenants: 0, // Deprecated - no longer tracking task failures at this level
        googleIntegrations: 0, // Deprecated - can't easily aggregate across locations
        facebookIntegrations: 0, // Deprecated
        tripadvisorIntegrations: 0, // Deprecated
        bookingIntegrations: 0, // Deprecated
      };

      const totalPages = Math.ceil(filteredTenants.length / limit);

      return {
        tenants: filteredTenants,
        stats,
        pagination: {
          page,
          limit,
          total: filteredTenants.length,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      console.error('Error fetching tenants:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch tenants',
      });
    }
  }),

  /**
   * Get tenant by slug (protected - team members can access)
   */
  bySlug: protectedProcedure.input(tenantSlugSchema).query(async ({ input }) => prisma.team.findUnique({
    where: { slug: input.slug },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
    },
  }).catch((error) => {
    console.error('Error fetching tenant by slug:', error);
    return null;
  })),

  /**
   * Get tenant details (admin only)
   * UPDATED: Now returns location-based platform data
   */
  byId: adminProcedure.input(tenantIdSchema).query(async ({ input }) => {
    try {
      const team = await prisma.team.findUnique({
        where: { id: input.tenantId },
        include: {
          _count: {
            select: {
              members: true,
              locations: true,
            },
          },
          members: {
            include: {
              user: true,
            },
          },
          locations: {
            include: {
              googleBusinessProfile: {
                include: {
                  reviews: {
                    orderBy: { publishedAtDate: 'desc' },
                    take: 10,
                  },
                  _count: { select: { reviews: true } },
                },
              },
              facebookBusinessProfile: {
                include: {
                  reviews: {
                    orderBy: { date: 'desc' },
                    take: 10,
                  },
                  _count: { select: { reviews: true } },
                },
              },
              tripAdvisorBusinessProfile: {
                include: {
                  reviews: {
                    orderBy: { publishedDate: 'desc' },
                    take: 10,
                  },
                  _count: { select: { reviews: true } },
                },
              },
              bookingBusinessProfile: {
                include: {
                  reviews: {
                    orderBy: { publishedDate: 'desc' },
                    take: 10,
                  },
                  _count: { select: { reviews: true } },
                },
              },
              instagramBusinessProfile: {
                select: { id: true },
              },
              tiktokBusinessProfile: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tenant not found',
        });
      }

      // Calculate location-based metrics
      let totalPlatformIntegrations = 0;
      let completedLocations = 0;

      team.locations.forEach((location) => {
        let locationPlatformCount = 0;

        if (location.googleBusinessProfile) {
          totalPlatformIntegrations++;
          locationPlatformCount++;
        }
        if (location.facebookBusinessProfile) {
          totalPlatformIntegrations++;
          locationPlatformCount++;
        }
        if (location.tripAdvisorBusinessProfile) {
          totalPlatformIntegrations++;
          locationPlatformCount++;
        }
        if (location.bookingBusinessProfile) {
          totalPlatformIntegrations++;
          locationPlatformCount++;
        }

        if (locationPlatformCount > 0) {
          completedLocations++;
        }
      });

      // Check for social platforms in locations (now location-based)
      team.locations.forEach((location) => {
        if (location.instagramBusinessProfile) totalPlatformIntegrations++;
        if (location.tiktokBusinessProfile) totalPlatformIntegrations++;
      });

      const locationsCount = team._count.locations;
      const overallProgress = locationsCount > 0
        ? (completedLocations / locationsCount) * 100
        : 0;

      return {
        id: team.id,
        name: team.name,
        slug: team.slug,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        membersCount: team._count.members,
        members: team.members,
        locationsCount,
        totalPlatformIntegrations,
        completedLocations,
        overallProgress,
        locations: team.locations,
      };
    } catch (error) {
      console.error('Error fetching tenant:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch tenant details',
      });
    }
  }),

  /**
   * Create a tenant (admin only)
   */
  create: adminProcedure.input(createTenantSchema).mutation(async ({ input }) => {
    try {
      const { name, slug } = input;

      // Check if slug already exists
      const existingTeam = await prisma.team.findUnique({
        where: { slug },
      });

      if (existingTeam) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Team slug already exists',
        });
      }

      const team = await prisma.team.create({
        data: {
          name,
          slug,
        },
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      // Broadcast real-time update
      void RealtimeBroadcaster.broadcastTenantsUpdate({
        type: 'tenant_created',
        tenantId: team.id,
      });

      return team;
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create tenant',
      });
    }
  }),

  /**
   * Update a tenant (admin only)
   */
  update: adminProcedure.input(updateTenantSchema).mutation(async ({ input }) => {
    try {
      const { tenantId, name, slug } = input;

      // Check if slug already exists (if changing)
      if (slug) {
        const existingTeam = await prisma.team.findFirst({
          where: {
            slug,
            NOT: { id: tenantId },
          },
        });

        if (existingTeam) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Team slug already exists',
          });
        }
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (slug) updateData.slug = slug;

      const team = await prisma.team.update({
        where: { id: tenantId },
        data: updateData,
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      // Broadcast real-time update
      void RealtimeBroadcaster.broadcastTenantsUpdate({
        type: 'tenant_updated',
        tenantId: team.id,
      });

      return team;
    } catch (error) {
      console.error('Error updating tenant:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update tenant',
      });
    }
  }),

  /**
   * Delete a tenant (admin only)
   */
  delete: adminProcedure.input(tenantIdSchema).mutation(async ({ input }) => {
    try {
      await prisma.team.delete({
        where: { id: input.tenantId },
      });

      // Broadcast real-time update
      void RealtimeBroadcaster.broadcastTenantsUpdate({
        type: 'tenant_deleted',
        tenantId: input.tenantId,
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting tenant:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete tenant',
      });
    }
  }),
});

