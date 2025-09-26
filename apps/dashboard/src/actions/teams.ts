'use server';

import { getSession } from '@wirecrest/auth/server';
import { ApiError, recordMetric, slugify } from './lib';
import { prisma } from '@wirecrest/db';
import { isTeamExists, createTeam, getTeam, updateTeam, deleteTeam, getTeams, getTeamMembers, removeTeamMember as removeTeamMemberFromModel } from '@/models/team';
import {
  createInvitation,
  getInvitations,
  deleteInvitation,
  TeamInvitation,
} from '@/models/invitation';
import {
  updateTeamMember,
} from '@/models/teamMember';
import { createApiKey, fetchApiKeys, deleteApiKey } from '@/models/apiKey';
import { ApiKey, Role } from '@prisma/client';
import { sendTeamInviteEmail } from 'src/lib/email/sendTeamInviteEmail';
import {
  createTeamSchema,
  updateTeamSchema,
  createInvitationSchema,
  createApiKeySchema,
  validateWithSchema,
} from 'src/lib/zod';
import type { TeamWithMemberCount } from './types/common';
import type { TeamMember, User } from '@prisma/client';

type TeamMemberWithUser = TeamMember & { 
  user: { 
    name: string; 
    email: string; 
    image: string; 
  }; 
};

// Team Management Actions
export async function getTeamsList(): Promise<TeamWithMemberCount[]> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const teams = await getTeams(session.user.id);
  return teams;
}

export async function createNewTeam(data: { name: string }) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Validate that the user exists in the database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    // If user doesn't exist by ID, try to find by email
    if (session.user.email) {
      const userByEmail = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
      
      if (userByEmail) {
        // Use the correct user ID from the database
        session.user.id = userByEmail.id;
      } else {
        throw new ApiError(401, 'User not found in database');
      }
    } else {
      throw new ApiError(401, 'User not found in database');
    }
  }

  const { name } = validateWithSchema(createTeamSchema, data);
  const slug = slugify(name);

  const slugCollisions = await isTeamExists(slug);
  if (slugCollisions > 0) {
    throw new ApiError(400, 'A team with this name already exists.');
  }

  const team = await createTeam({
    userId: session.user.id,
    name,
    slug,
  });

  recordMetric('team.created');

  return team;
}

export async function getTeamBySlug(slug: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is a member of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. You must be a member of this team.');
  }

  return team;
}

export async function updateTeamBySlug(slug: string, data: { name?: string; domain?: string }) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const { name, domain } = validateWithSchema(updateTeamSchema, data);

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is owner of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. Only team owners can update team settings.');
  }

  let updateData: any = {};
  if (name) updateData.name = name;
  if (domain) updateData.domain = domain;

  const updatedTeam = await updateTeam(slug, updateData);

  recordMetric('team.updated');

  return updatedTeam;
}

export async function deleteTeamBySlug(slug: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is owner of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. Only team owners can delete the team.');
  }

  await deleteTeam({ slug });

  recordMetric('team.deleted');

  return { success: true };
}

// Team Members Actions
export async function getTeamMembersList(slug: string): Promise<TeamMemberWithUser[]> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is a member of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. You must be a member of this team.');
  }

  const members = await getTeamMembers(team.id);
  return members;
}

export async function removeTeamMember(slug: string, memberId: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is owner of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. Only team owners can remove members.');
  }

  // Get the team member to find their userId
  const teamMember = await prisma.teamMember.findUnique({
    where: { id: memberId },
  });
  
  if (!teamMember) {
    throw new ApiError(404, 'Team member not found');
  }
  
  await removeTeamMemberFromModel(team.id, teamMember.userId);

  recordMetric('team.member.removed');

  return { success: true };
}

export async function updateTeamMemberRole(slug: string, memberId: string, role: Role) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is owner of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. Only team owners can update member roles.');
  }

  const updatedMember = await updateTeamMember({
    where: { id: memberId },
    data: { role },
  });

  recordMetric('team.member.role.updated');

  return updatedMember;
}

// Team Invitations Actions
export async function getTeamInvitations(
  slug: string,
  sentViaEmail: boolean = true
): Promise<TeamInvitation[]> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is a member of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. You must be a member of this team.');
  }

  const invitations = await getInvitations(team.id, sentViaEmail);
  return invitations;
}

export async function createTeamInvitation(slug: string, data: { email?: string; role: Role }) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const { email, role } = validateWithSchema(createInvitationSchema, data);

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is owner of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. Only team owners can create invitations.');
  }

  const invitation = await createInvitation({
    teamId: team.id,
    invitedBy: session.user.id,
    email,
    role,
    sentViaEmail: !!email,
    allowedDomains: [],
  });

  if (email) {
    await sendTeamInviteEmail(team, invitation);
  }

  recordMetric('team.invitation.created');

  return invitation;
}

export async function deleteTeamInvitation(slug: string, invitationId: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is owner of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. Only team owners can delete invitations.');
  }

  await deleteInvitation({ id: invitationId });

  recordMetric('team.invitation.deleted');

  return { success: true };
}

export async function resendTeamInvitation(slug: string, invitationId: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is owner of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. Only team owners can resend invitations.');
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { team: true },
  });

  if (!invitation) {
    throw new ApiError(404, 'Invitation not found');
  }

  if (invitation.email) {
    await sendTeamInviteEmail(team, invitation);
  }

  recordMetric('team.invitation.resent');

  return { success: true };
}

// API Keys Actions
type ApiKeySummary = {
  id: string;
  name: string;
  createdAt: Date;
};

export async function getTeamApiKeys(slug: string): Promise<ApiKeySummary[]> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is a member of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. You must be a member of this team.');
  }

  const apiKeys = await fetchApiKeys(team.id);
  return apiKeys;
}

export async function createTeamApiKey(slug: string, data: { name: string }) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const { name } = validateWithSchema(createApiKeySchema, data);

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is owner of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. Only team owners can create API keys.');
  }

  const apiKey = await createApiKey({
    name,
    teamId: team.id,
  });

  recordMetric('team.api-key.created');

  return apiKey;
}

export async function deleteTeamApiKey(slug: string, apiKeyId: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await getTeam({ slug });
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is owner of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. Only team owners can delete API keys.');
  }

  await deleteApiKey(apiKeyId);

  recordMetric('team.api-key.deleted');

  return { success: true };
}
