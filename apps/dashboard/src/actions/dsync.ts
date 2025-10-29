'use server';

// import jackson from 'src/lib/jackson';
// import { dsyncManager } from 'src/lib/jackson/dsync';
// import { sendAudit } from 'src/lib/retraced';
// import { extractAuthToken } from 'src/lib/server-common';
// import { handleEvents } from 'src/lib/jackson/dsyncEvents';
// import type { DirectorySyncRequest } from '@boxyhq/saml-jackson';

import { prisma } from '@wirecrest/db';
import { getTeam } from '@/models/team';
import { throwIfNotAllowed } from '@/models/user';
import { auth } from '@wirecrest/auth-next';

import env from 'src/lib/env';

import { ApiError } from './lib/errors';

// const dsync = dsyncManager();

// Directory Sync Providers
export async function getDirectorySyncProviders() {
  if (!env.teamFeatures.dsync) {
    throw new ApiError(404, 'Directory Sync feature not enabled');
  }

  // const { directorySync } = await jackson();
  // return { data: directorySync.providers() };
  throw new ApiError(501, 'Directory Sync feature temporarily disabled');
}

// Team Directory Sync Connections
export async function getDirectorySyncConnections(slug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  if (!env.teamFeatures.dsync) {
    throw new ApiError(404, 'Directory Sync feature not enabled');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check team membership
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
    },
    include: {
      user: true,
      team: true,
    },
  });

  if (!teamMember) {
    throw new ApiError(403, 'Access denied');
  }

  throwIfNotAllowed(teamMember, 'team_dsync', 'read');

  // const connections = await dsync.getConnections({
  //   tenant: teamMember.teamId,
  // });

  // return connections;
  throw new ApiError(501, 'Directory Sync feature temporarily disabled');
}

export async function createDirectorySyncConnection(slug: string, connectionData: any) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  if (!env.teamFeatures.dsync) {
    throw new ApiError(404, 'Directory Sync feature not enabled');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check team membership
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
    },
    include: {
      user: true,
      team: true,
    },
  });

  if (!teamMember) {
    throw new ApiError(403, 'Access denied');
  }

  throwIfNotAllowed(teamMember, 'team_dsync', 'create');

  // const connection = await dsync.createConnection({
  //   ...connectionData,
  //   tenant: teamMember.teamId,
  // });

  // sendAudit({
  //   action: 'dsync.connection.create',
  //   crud: 'c',
  //   user: teamMember.user,
  //   team: teamMember.team,
  // });

  // return connection;
  throw new ApiError(501, 'Directory Sync feature temporarily disabled');
}

export async function getDirectorySyncConnection(slug: string, directoryId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  if (!env.teamFeatures.dsync) {
    throw new ApiError(404, 'Directory Sync feature not enabled');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check team membership
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
    },
    include: {
      user: true,
      team: true,
    },
  });

  if (!teamMember) {
    throw new ApiError(403, 'Access denied');
  }

  throwIfNotAllowed(teamMember, 'team_dsync', 'read');

  // const connection = await dsync.getConnection({
  //   directoryId,
  //   tenant: teamMember.teamId,
  // });

  // return connection;
  throw new ApiError(501, 'Directory Sync feature temporarily disabled');
}

export async function updateDirectorySyncConnection(
  slug: string,
  directoryId: string,
  connectionData: any
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  if (!env.teamFeatures.dsync) {
    throw new ApiError(404, 'Directory Sync feature not enabled');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check team membership
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
    },
    include: {
      user: true,
      team: true,
    },
  });

  if (!teamMember) {
    throw new ApiError(403, 'Access denied');
  }

  throwIfNotAllowed(teamMember, 'team_dsync', 'update');

  // const connection = await dsync.updateConnection({
  //   ...connectionData,
  //   directoryId,
  //   tenant: teamMember.teamId,
  // });

  // sendAudit({
  //   action: 'dsync.connection.update',
  //   crud: 'u',
  //   user: teamMember.user,
  //   team: teamMember.team,
  // });

  // return connection;
  throw new ApiError(501, 'Directory Sync feature temporarily disabled');
}

export async function deleteDirectorySyncConnection(slug: string, directoryId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  if (!env.teamFeatures.dsync) {
    throw new ApiError(404, 'Directory Sync feature not enabled');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check team membership
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
    },
    include: {
      user: true,
      team: true,
    },
  });

  if (!teamMember) {
    throw new ApiError(403, 'Access denied');
  }

  throwIfNotAllowed(teamMember, 'team_dsync', 'delete');

  // await dsync.deleteConnection({
  //   directoryId,
  //   tenant: teamMember.teamId,
  // });

  // sendAudit({
  //   action: 'dsync.connection.delete',
  //   crud: 'd',
  //   user: teamMember.user,
  //   team: teamMember.team,
  // });

  // return { success: true };
  throw new ApiError(501, 'Directory Sync feature temporarily disabled');
}

// SCIM API Proxy Action
// Note: SCIM endpoints need to remain as API routes for external integrations
// This action provides server-side logic for SCIM request handling
export async function handleSCIMRequest(requestData: {
  method: string;
  directoryId: string;
  path: string;
  resourceId?: string;
  body?: any;
  query?: any;
  authToken?: string;
}) {
  if (!env.teamFeatures.dsync) {
    throw new ApiError(404, 'Directory Sync feature not enabled');
  }

  // const { directorySync } = await jackson();
  // const { method, directoryId, path, resourceId, body, query, authToken } = requestData;

  // // Handle the SCIM API requests
  // const request: DirectorySyncRequest = {
  //   method,
  //   body: body ? (typeof body === 'string' ? JSON.parse(body) : body) : undefined,
  //   directoryId,
  //   resourceId,
  //   resourceType: path === 'Users' ? 'users' : 'groups',
  //   apiSecret: authToken,
  //   query: {
  //     count: query?.count ? parseInt(query.count) : undefined,
  //     startIndex: query?.startIndex ? parseInt(query.startIndex) : undefined,
  //     filter: query?.filter,
  //   },
  // };

  // const { status, data } = await directorySync.requests.handle(request, handleEvents);

  // return { status, data };
  throw new ApiError(501, 'Directory Sync feature temporarily disabled');
}
