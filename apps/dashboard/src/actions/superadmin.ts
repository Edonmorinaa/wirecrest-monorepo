'use server';

import { SuperRole } from '@prisma/client';

import { prisma } from '@wirecrest/db';
import { getSession } from '@wirecrest/auth/server';

import { ApiError, recordMetric } from './lib';

// Superadmin Team Management Actions
export async function getAllTeams() {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Check if user is super admin
  if (session.user.superRole !== SuperRole.ADMIN) {
    throw new ApiError(403, 'Forbidden');
  }

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
}

export async function getTeamById(teamId: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Check if user is super admin
  if (session.user.superRole !== SuperRole.ADMIN) {
    throw new ApiError(403, 'Forbidden');
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
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
    throw new ApiError(404, 'Team not found');
  }

  return team;
}

export async function updateTeamById(teamId: string, data: { name?: string; slug?: string; domain?: string }) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Check if user is super admin
  if (session.user.superRole !== SuperRole.ADMIN) {
    throw new ApiError(403, 'Forbidden');
  }

  const team = await prisma.team.update({
    where: { id: teamId },
    data: {
      name: data.name,
      slug: data.slug,
      domain: data.domain,
    },
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
}

export async function deleteTeamById(teamId: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Check if user is super admin
  if (session.user.superRole !== SuperRole.ADMIN) {
    throw new ApiError(403, 'Forbidden');
  }

  await prisma.team.delete({
    where: { id: teamId },
  });

  recordMetric('superadmin.team.deleted');

  return { success: true };
}

export async function createTeam(data: { name: string; slug: string; domain?: string }) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Check if user is super admin
  if (session.user.superRole !== SuperRole.ADMIN) {
    throw new ApiError(403, 'Forbidden');
  }

  const team = await prisma.team.create({
    data: {
      name: data.name,
      slug: data.slug,
      domain: data.domain,
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
}
