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

import { TRPCError } from '@trpc/server';
import { prisma } from '@wirecrest/db';
import { router, adminProcedure, protectedProcedure } from '../trpc';
import {
  getTenantsSchema,
  tenantSlugSchema,
  tenantIdSchema,
  createTenantSchema,
  updateTenantSchema,
} from '../schemas/tenants.schema';
import { RealtimeBroadcaster } from 'src/lib/realtime';

/**
 * Helper function to calculate platform status
 * Stub implementation - adapt based on your actual logic
 */
function calculatePlatformStatus(team: any, platform: string) {
  // This is a simplified version - adjust based on your actual logic
  return {
    status: 'not_configured',
    progress: 0,
  };
}

/**
 * Helper function to calculate overall progress
 */
function calculateOverallProgress(platforms: any) {
  const statuses = Object.values(platforms).map((p: any) => p.progress || 0);
  return statuses.reduce((sum: number, val: number) => sum + val, 0) / statuses.length;
}

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

      // Get teams with member counts
      const teams = await prisma.team.findMany({
        where: whereClause,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          _count: {
            select: {
              members: true,
            },
          },
          members: {
            include: {
              user: true,
            },
          },
          marketIdentifiers: true,
          businessProfile: true,
          facebookBusinessProfiles: true,
          tripAdvisorBusinessProfile: true,
          bookingBusinessProfile: true,
        },
      });

      // Get total count
      const total = await prisma.team.count({ where: whereClause });

      // Calculate status for each tenant
      const tenantsWithStatus = teams.map((team) => {
        const platforms = {
          google: calculatePlatformStatus(team, 'GOOGLE_MAPS'),
          facebook: calculatePlatformStatus(team, 'FACEBOOK'),
          tripadvisor: calculatePlatformStatus(team, 'TRIPADVISOR'),
          booking: calculatePlatformStatus(team, 'BOOKING'),
        };

        const overallProgress = calculateOverallProgress(platforms);
        const activeTasksCount = Object.values(platforms).filter(
          (p) => p.status === 'in_progress'
        ).length;

        return {
          id: team.id,
          name: team.name,
          slug: team.slug,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt,
          membersCount: team._count.members,
          platforms,
          overallProgress,
          activeTasksCount,
          lastActivity: team.updatedAt,
        };
      });

      // Apply status filter if provided
      let filteredTenants = tenantsWithStatus;
      if (status) {
        filteredTenants = filteredTenants.filter((tenant) => {
          const allStatuses = [
            tenant.platforms.google.status,
            tenant.platforms.facebook.status,
            tenant.platforms.tripadvisor.status,
            tenant.platforms.booking.status,
          ];
          return allStatuses.includes(status as any);
        });
      }

      // Apply platform filter if provided
      if (platform) {
        filteredTenants = filteredTenants.filter((tenant) => {
          const platformStatus =
            tenant.platforms[platform as keyof typeof tenant.platforms];
          return platformStatus && platformStatus.status === status;
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
        googleIntegrations: tenantsWithStatus.filter(
          (t) => t.platforms.google.status === 'completed'
        ).length,
        facebookIntegrations: tenantsWithStatus.filter(
          (t) => t.platforms.facebook.status === 'completed'
        ).length,
        tripadvisorIntegrations: tenantsWithStatus.filter(
          (t) => t.platforms.tripadvisor.status === 'completed'
        ).length,
        bookingIntegrations: tenantsWithStatus.filter(
          (t) => t.platforms.booking.status === 'completed'
        ).length,
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
  bySlug: protectedProcedure.input(tenantSlugSchema).query(async ({ input }) => {
    try {
      const team = await prisma.team.findUnique({
        where: { slug: input.slug },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return team;
    } catch (error) {
      console.error('Error fetching tenant by slug:', error);
      return null;
    }
  }),

  /**
   * Get tenant details (admin only)
   */
  byId: adminProcedure.input(tenantIdSchema).query(async ({ input }) => {
    try {
      const team = await prisma.team.findUnique({
        where: { id: input.tenantId },
        include: {
          _count: {
            select: {
              members: true,
            },
          },
          members: {
            include: {
              user: true,
            },
          },
          marketIdentifiers: true,
          businessProfile: {
            include: {
              reviews: {
                orderBy: { scrapedAt: 'desc' },
                take: 10,
              },
            },
          },
          facebookBusinessProfiles: {
            include: {
              reviews: {
                orderBy: { scrapedAt: 'desc' },
                take: 10,
              },
            },
          },
          tripAdvisorBusinessProfile: {
            include: {
              reviews: {
                orderBy: { scrapedAt: 'desc' },
                take: 10,
              },
            },
          },
          bookingBusinessProfile: {
            include: {
              reviews: {
                orderBy: { scrapedAt: 'desc' },
                take: 10,
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

      const platforms = {
        google: calculatePlatformStatus(team, 'GOOGLE_MAPS'),
        facebook: calculatePlatformStatus(team, 'FACEBOOK'),
        tripadvisor: calculatePlatformStatus(team, 'TRIPADVISOR'),
        booking: calculatePlatformStatus(team, 'BOOKING'),
      };

      const overallProgress = calculateOverallProgress(platforms);

      return {
        id: team.id,
        name: team.name,
        slug: team.slug,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        membersCount: team._count.members,
        members: team.members,
        platforms,
        overallProgress,
        marketIdentifiers: team.marketIdentifiers,
        businessProfile: team.businessProfile,
        facebookBusinessProfiles: team.facebookBusinessProfiles,
        tripAdvisorBusinessProfile: team.tripAdvisorBusinessProfile,
        bookingBusinessProfile: team.bookingBusinessProfile,
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
      await RealtimeBroadcaster.broadcastTenantsUpdate({
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
      await RealtimeBroadcaster.broadcastTenantsUpdate({
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
      await RealtimeBroadcaster.broadcastTenantsUpdate({
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

