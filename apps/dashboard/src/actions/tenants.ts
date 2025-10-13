'use server';

import { prisma } from '@wirecrest/db';

import { RealtimeBroadcaster } from 'src/lib/realtime';
import { throwIfNotSuperAdmin } from 'src/lib/permissions';

import { ApiError } from './lib/errors';

// Get all tenants with status information
export async function getTenants(filters: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  platform?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}) {
  await throwIfNotSuperAdmin();

  const {
    page = 1,
    limit = 25,
    search,
    status,
    platform,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = filters;

  const offset = (page - 1) * limit;

  try {
    // Build where clause for teams
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          slug: {
            contains: search,
            mode: 'insensitive'
          }
        }
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
            members: true
          }
        },
        members: {
          include: {
            user: true
          }
        },
        marketIdentifiers: true,
        businessProfile: true,
        facebookBusinessProfiles: true,
        tripAdvisorBusinessProfile: true,
        bookingBusinessProfile: true
      }
    });

    // Get total count for pagination
    const total = await prisma.team.count({ where: whereClause });

    // Calculate status for each tenant
    const tenantsWithStatus = teams.map(team => {
      const platforms = {
        google: calculatePlatformStatus(team, 'GOOGLE_MAPS'),
        facebook: calculatePlatformStatus(team, 'FACEBOOK'),
        tripadvisor: calculatePlatformStatus(team, 'TRIPADVISOR'),
        booking: calculatePlatformStatus(team, 'BOOKING')
      };

      const overallProgress = calculateOverallProgress(platforms);
      const activeTasksCount = Object.values(platforms).filter(p => p.status === 'in_progress').length;

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
        lastActivity: team.updatedAt
      };
    });

    // Apply status filter if provided
    let filteredTenants = tenantsWithStatus;
    if (status) {
      filteredTenants = filteredTenants.filter(tenant => {
        const allStatuses = [
          tenant.platforms.google.status,
          tenant.platforms.facebook.status,
          tenant.platforms.tripadvisor.status,
          tenant.platforms.booking.status
        ];
        return allStatuses.includes(status as any);
      });
    }

    // Apply platform filter if provided
    if (platform) {
      filteredTenants = filteredTenants.filter(tenant => {
        const platformStatus = tenant.platforms[platform as keyof typeof tenant.platforms];
        return platformStatus && platformStatus.status === status;
      });
    }

    // Calculate stats
    const stats = {
      totalTenants: tenantsWithStatus.length,
      completedTenants: tenantsWithStatus.filter(t => t.overallProgress === 100).length,
      inProgressTenants: tenantsWithStatus.filter(t => t.overallProgress > 0 && t.overallProgress < 100).length,
      notStartedTenants: tenantsWithStatus.filter(t => t.overallProgress === 0).length,
      googleIntegrations: tenantsWithStatus.filter(t => t.platforms.google.status === 'completed').length,
      facebookIntegrations: tenantsWithStatus.filter(t => t.platforms.facebook.status === 'completed').length,
      tripadvisorIntegrations: tenantsWithStatus.filter(t => t.platforms.tripadvisor.status === 'completed').length,
      bookingIntegrations: tenantsWithStatus.filter(t => t.platforms.booking.status === 'completed').length
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
        hasPreviousPage: page > 1
      }
    };
  } catch (error) {
    console.error('Error fetching tenants:', error);
    throw new ApiError(500, 'Failed to fetch tenants');
  }
}

// Get tenant by slug (public access for team members)
export async function getTenantBySlug(slug: string) {
  try {
    const team = await prisma.team.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return team;
  } catch (error) {
    console.error('Error fetching tenant by slug:', error);
    return null;
  }
}

// Get single tenant details
export async function getTenant(tenantId: string) {
  await throwIfNotSuperAdmin();

  try {
    const team = await prisma.team.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            members: true
          }
        },
        members: {
          include: {
            user: true
          }
        },
        marketIdentifiers: true,
        businessProfile: {
          include: {
            reviews: {
              orderBy: { scrapedAt: 'desc' },
              take: 10
            }
          }
        },
        facebookBusinessProfiles: {
          include: {
            reviews: {
              orderBy: { scrapedAt: 'desc' },
              take: 10
            }
          }
        },
        tripAdvisorBusinessProfile: {
          include: {
            reviews: {
              orderBy: { scrapedAt: 'desc' },
              take: 10
            }
          }
        },
        bookingBusinessProfile: {
          include: {
            reviews: {
              orderBy: { scrapedAt: 'desc' },
              take: 10
            }
          }
        }
      }
    });

    if (!team) {
      throw new ApiError(404, 'Tenant not found');
    }

    const platforms = {
      google: calculatePlatformStatus(team, 'GOOGLE_MAPS'),
      facebook: calculatePlatformStatus(team, 'FACEBOOK'),
      tripadvisor: calculatePlatformStatus(team, 'TRIPADVISOR'),
      booking: calculatePlatformStatus(team, 'BOOKING')
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
      bookingBusinessProfile: team.bookingBusinessProfile
    };
  } catch (error) {
    console.error('Error fetching tenant:', error);
    throw new ApiError(500, 'Failed to fetch tenant details');
  }
}

// Create new tenant
export async function createTenant(data: {
  name: string;
  slug: string;
}) {
  await throwIfNotSuperAdmin();

  try {
    const { name, slug } = data;

    // Check if slug already exists
    const existingTeam = await prisma.team.findUnique({
      where: { slug }
    });

    if (existingTeam) {
      throw new ApiError(400, 'Team slug already exists');
    }

    const team = await prisma.team.create({
      data: {
        name,
        slug
      },
      include: {
        _count: {
          select: {
            members: true
          }
        }
      }
    });

    // Broadcast real-time update
    await RealtimeBroadcaster.broadcastTenantsUpdate({
      type: 'tenant_created',
      tenantId: team.id
    });

    return team;
  } catch (error) {
    console.error('Error creating tenant:', error);
    throw new ApiError(500, 'Failed to create tenant');
  }
}

// Update tenant
export async function updateTenant(tenantId: string, data: {
  name?: string;
  slug?: string;
}) {
  await throwIfNotSuperAdmin();

  try {
    const { name, slug } = data;

    // Check if slug already exists (if changing)
    if (slug) {
      const existingTeam = await prisma.team.findUnique({
        where: { 
          slug,
          NOT: { id: tenantId }
        }
      });

      if (existingTeam) {
        throw new ApiError(400, 'Team slug already exists');
      }
    }

    const team = await prisma.team.update({
      where: { id: tenantId },
      data: {
        ...(name && { name }),
        ...(slug && { slug })
      },
      include: {
        _count: {
          select: {
            members: true
          }
        }
      }
    });

    // Broadcast real-time update
    await RealtimeBroadcaster.broadcastTenantDetailUpdate(tenantId, {
      type: 'tenant_updated',
      tenantId
    });

    return team;
  } catch (error) {
    console.error('Error updating tenant:', error);
    throw new ApiError(500, 'Failed to update tenant');
  }
}

// Delete tenant
export async function deleteTenant(tenantId: string) {
  await throwIfNotSuperAdmin();

  try {
    // Delete team (cascade will handle related data)
    await prisma.team.delete({
      where: { id: tenantId }
    });

    // Broadcast real-time update
    await RealtimeBroadcaster.broadcastTenantsUpdate({
      type: 'tenant_deleted',
      tenantId
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting tenant:', error);
    throw new ApiError(500, 'Failed to delete tenant');
  }
}

// Helper functions
function calculatePlatformStatus(team: any, platform: string) {
  const identifier = team.marketIdentifiers?.find(
    (id: any) => id.platform === platform
  );

  let profile = null;
  switch (platform) {
    case 'GOOGLE_MAPS':
      profile = team.businessProfile;
      break;
    case 'FACEBOOK':
      profile = team.facebookBusinessProfiles;
      break;
    case 'TRIPADVISOR':
      profile = team.tripAdvisorBusinessProfile;
      break;
    case 'BOOKING':
      profile = team.bookingBusinessProfile;
      break;
  }

  const hasIdentifier = !!identifier;
  const hasProfile = !!profile;
  const hasReviews = profile?.reviews && profile.reviews.length > 0;
  const reviewsCount = profile?.reviews?.length || 0;

  let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';

  if (hasIdentifier && hasProfile && hasReviews) {
    status = 'completed';
  } else if (hasIdentifier && hasProfile) {
    status = 'in_progress';
  } else if (hasIdentifier) {
    status = 'in_progress';
  }

  return {
    hasIdentifier,
    hasProfile,
    hasReviews,
    reviewsCount,
    status,
    lastActivity: profile?.updatedAt || identifier?.updatedAt || null
  };
}

function calculateOverallProgress(platforms: any) {
  const platformStatuses = Object.values(platforms);
  const completedPlatforms = platformStatuses.filter((p: any) => p.status === 'completed').length;
  return Math.round((completedPlatforms / platformStatuses.length) * 100);
}
