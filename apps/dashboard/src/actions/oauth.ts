'use server';

// import jackson from 'src/lib/jackson';
// import { ssoManager } from 'src/lib/jackson/sso/index';
// import { sendAudit } from 'src/lib/retraced';
// import { extractClientId, throwIfNoAccessToConnection } from 'src/lib/guards/team-sso';

import { prisma } from '@wirecrest/db';
import { getTeam } from '@/models/team';
import { throwIfNotAllowed } from '@/models/user';
import { getSession } from '@wirecrest/auth-next';

import env from 'src/lib/env';

import { ApiError } from './lib/errors';

// const sso = ssoManager();

// SSO Connection Management Actions
export async function getSSOConnections(slug: string, clientId?: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  if (!env.teamFeatures.sso) {
    throw new ApiError(404, 'SSO feature not enabled');
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

  throwIfNotAllowed(teamMember, 'team_sso', 'read');

  if (clientId) {
    // await throwIfNoAccessToConnection({
    //   teamId: teamMember.teamId,
    //   clientId,
    // });
    // Function temporarily disabled due to jackson import issues
  }

  const params = clientId
    ? { clientID: clientId }
    : { tenant: teamMember.teamId, product: 'default' }; // env.jackson.productId temporarily disabled

  // const connections = await sso.getConnections(params);
  // return connections;
  throw new ApiError(501, 'SSO feature temporarily disabled');
}

export async function createSSOConnection(slug: string, connectionData: any) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  if (!env.teamFeatures.sso) {
    throw new ApiError(404, 'SSO feature not enabled');
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

  throwIfNotAllowed(teamMember, 'team_sso', 'create');

  // const connection = await sso.createConnection({
  //   ...connectionData,
  //   defaultRedirectUrl: env.jackson.sso.callback + env.jackson.sso.idpLoginPath,
  //   redirectUrl: env.jackson.sso.callback,
  //   product: env.jackson.productId,
  //   tenant: teamMember.teamId,
  // });

  // sendAudit({
  //   action: 'sso.connection.create',
  //   crud: 'c',
  //   user: teamMember.user,
  //   team: teamMember.team,
  // });

  // return connection;
  throw new ApiError(501, 'SSO feature temporarily disabled');
}

export async function updateSSOConnection(slug: string, clientId: string, connectionData: any) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  if (!env.teamFeatures.sso) {
    throw new ApiError(404, 'SSO feature not enabled');
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

  throwIfNotAllowed(teamMember, 'team_sso', 'create');

  // await throwIfNoAccessToConnection({
  //   teamId: teamMember.teamId,
  //   clientId,
  // });
  // Function temporarily disabled due to jackson import issues

  // await sso.updateConnection({
  //   ...connectionData,
  //   tenant: teamMember.teamId,
  //   product: env.jackson.productId,
  // });

  // sendAudit({
  //   action: 'sso.connection.patch',
  //   crud: 'u',
  //   user: teamMember.user,
  //   team: teamMember.team,
  // });

  // return { success: true };
  throw new ApiError(501, 'SSO feature temporarily disabled');
}

export async function deleteSSOConnection(slug: string, clientId: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  if (!env.teamFeatures.sso) {
    throw new ApiError(404, 'SSO feature not enabled');
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

  throwIfNotAllowed(teamMember, 'team_sso', 'delete');

  // await throwIfNoAccessToConnection({
  //   teamId: teamMember.teamId,
  //   clientId,
  // });
  // Function temporarily disabled due to jackson import issues

  // await sso.deleteConnection({ clientID: clientId });

  // sendAudit({
  //   action: 'sso.connection.delete',
  //   crud: 'd',
  //   user: teamMember.user,
  //   team: teamMember.team,
  // });

  // return { success: true };
  throw new ApiError(501, 'SSO feature temporarily disabled');
}

// OAuth Authorization Proxy Action
// Note: This should redirect to the actual API route for external OAuth flows
export async function handleOAuthAuthorize(params: any) {
  if (!env.teamFeatures.sso) {
    throw new ApiError(404, 'SSO feature not enabled');
  }

  // For OAuth flows, we need to handle this via the actual API route
  // because external systems expect specific redirect behavior
  throw new ApiError(501, 'OAuth authorization must be handled via API route');
}

// OAuth Token Exchange Proxy Action
export async function handleOAuthToken(tokenData: any) {
  if (!env.teamFeatures.sso) {
    throw new ApiError(404, 'SSO feature not enabled');
  }

  // const { oauthController } = await jackson();
  // const token = await oauthController.token(tokenData);
  // return token;
  throw new ApiError(501, 'OAuth feature temporarily disabled');
}

// OAuth User Info Proxy Action
export async function getOAuthUserInfo(accessToken: string) {
  if (!env.teamFeatures.sso) {
    throw new ApiError(404, 'SSO feature not enabled');
  }

  if (!accessToken) {
    throw new ApiError(401, 'Access token required');
  }

  // const { oauthController } = await jackson();
  // const profile = await oauthController.userInfo(accessToken);
  // return profile;
  throw new ApiError(501, 'OAuth feature temporarily disabled');
}
