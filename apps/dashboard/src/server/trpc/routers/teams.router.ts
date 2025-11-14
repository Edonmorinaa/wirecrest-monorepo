/**
 * Teams Router
 * 
 * tRPC router for team management operations including:
 * - Team CRUD operations
 * - Team member management
 * - Team invitations
 * - API key management
 */

import { TRPCError } from '@trpc/server';
import { Role } from '@prisma/client';
import { prisma } from '@wirecrest/db';
import { router, protectedProcedure } from '../trpc';
import {
  createTeamSchema,
  updateTeamSchema,
  teamSlugSchema,
  teamMemberIdSchema,
  updateMemberRoleSchema,
  getInvitationsSchema,
  createInvitationSchema,
  invitationIdSchema,
  createApiKeySchema,
  apiKeyIdSchema,
} from '../schemas/teams.schema';
import {
  getTeams,
  createTeam,
  getTeam,
  updateTeam,
  deleteTeam,
  isTeamExists,
  getTeamMembers,
  removeTeamMember as removeTeamMemberFromModel,
} from '@/models/team';
import { updateTeamMember } from '@/models/teamMember';
import { createApiKey, fetchApiKeys, deleteApiKey } from '@/models/apiKey';
import {
  getInvitations,
  createInvitation,
  deleteInvitation,
} from '@/models/invitation';
import { sendTeamInviteEmail } from 'src/lib/email/sendTeamInviteEmail';
import { slugify, recordMetric } from 'src/actions/lib';

/**
 * Helper function to verify team access for a user
 */
async function verifyTeamMembership(teamId: string, userId: string) {
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId,
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Access denied. You must be a member of this team.',
    });
  }

  return membership;
}

/**
 * Helper function to verify team owner access
 */
async function verifyTeamOwner(teamId: string, userId: string) {
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId,
      role: 'OWNER',
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Access denied. Only team owners can perform this action.',
    });
  }

  return membership;
}

/**
 * Teams Router
 */
export const teamsRouter = router({
  /**
   * List all teams for the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const teams = await getTeams(ctx.session.user.id);
    return teams;
  }),

  /**
   * Create a new team
   */
  create: protectedProcedure
    .input(createTeamSchema)
    .mutation(async ({ ctx, input }) => {
      const { name } = input;

      // Validate that the user exists in the database
      let userId = ctx.session.user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user && ctx.session.user.email) {
        // Try to find by email if ID doesn't work
        const userByEmail = await prisma.user.findUnique({
          where: { email: ctx.session.user.email },
        });

        if (userByEmail) {
          userId = userByEmail.id;
        } else {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found in database',
          });
        }
      } else if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found in database',
        });
      }

      const slug = slugify(name);
      const slugCollisions = await isTeamExists(slug);

      if (slugCollisions > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A team with this name already exists.',
        });
      }

      const team = await createTeam({
        userId,
        name,
        slug,
      });

      recordMetric('team.created');

      return team;
    }),

  /**
   * Get a team by slug
   */
  bySlug: protectedProcedure
    .input(teamSlugSchema)
    .query(async ({ ctx, input }) => {
      const team = await getTeam({ slug: input.slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is a member
      await verifyTeamMembership(team.id, ctx.session.user.id);

      return team;
    }),

  /**
   * Get a team by slug (alias for bySlug for backwards compatibility)
   */
  get: protectedProcedure
    .input(teamSlugSchema)
    .query(async ({ ctx, input }) => {
      const team = await getTeam({ slug: input.slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is a member
      await verifyTeamMembership(team.id, ctx.session.user.id);

      return team;
    }),

  /**
   * Update a team
   */
  update: protectedProcedure
    .input(updateTeamSchema)
    .mutation(async ({ ctx, input }) => {
      const { slug, name, domain } = input;

      const team = await getTeam({ slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is owner
      await verifyTeamOwner(team.id, ctx.session.user.id);

      const updateData: any = {};
      if (name) updateData.name = name;
      if (domain !== undefined) updateData.domain = domain;

      const updatedTeam = await updateTeam(slug, updateData);

      recordMetric('team.updated');

      return updatedTeam;
    }),

  /**
   * Delete a team
   */
  delete: protectedProcedure
    .input(teamSlugSchema)
    .mutation(async ({ ctx, input }) => {
      const team = await getTeam({ slug: input.slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is owner
      await verifyTeamOwner(team.id, ctx.session.user.id);

      await deleteTeam({ slug: input.slug });

      recordMetric('team.deleted');

      return { success: true };
    }),

  /**
   * Get all members of a team
   */
  members: protectedProcedure
    .input(teamSlugSchema)
    .query(async ({ ctx, input }) => {
      const team = await getTeam({ slug: input.slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is a member
      await verifyTeamMembership(team.id, ctx.session.user.id);

      const members = await getTeamMembers(team.id);
      return members;
    }),

  /**
   * Remove a team member
   */
  removeMember: protectedProcedure
    .input(teamMemberIdSchema)
    .mutation(async ({ ctx, input }) => {
      const team = await getTeam({ slug: input.slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is owner
      await verifyTeamOwner(team.id, ctx.session.user.id);

      // Get the team member to find their userId
      const teamMember = await prisma.teamMember.findUnique({
        where: { id: input.memberId },
      });

      if (!teamMember) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team member not found',
        });
      }

      await removeTeamMemberFromModel(team.id, teamMember.userId);

      recordMetric('team.member.removed');

      return { success: true };
    }),

  /**
   * Update team member role
   */
  updateMemberRole: protectedProcedure
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const team = await getTeam({ slug: input.slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is owner
      await verifyTeamOwner(team.id, ctx.session.user.id);

      const updatedMember = await updateTeamMember({
        where: { id: input.memberId },
        data: { role: input.role },
      });

      recordMetric('team.member.role.updated');

      return updatedMember;
    }),

  /**
   * Get team invitations
   */
  invitations: protectedProcedure
    .input(getInvitationsSchema)
    .query(async ({ ctx, input }) => {
      const team = await getTeam({ slug: input.slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is a member
      await verifyTeamMembership(team.id, ctx.session.user.id);

      const invitations = await getInvitations(team.id, input.sentViaEmail);
      return invitations;
    }),

  /**
   * Create a team invitation
   */
  createInvitation: protectedProcedure
    .input(createInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const { slug, email, role } = input;

      const team = await getTeam({ slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is owner
      await verifyTeamOwner(team.id, ctx.session.user.id);

      const invitation = await createInvitation({
        teamId: team.id,
        invitedBy: ctx.session.user.id,
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
    }),

  /**
   * Delete a team invitation
   */
  deleteInvitation: protectedProcedure
    .input(invitationIdSchema)
    .mutation(async ({ ctx, input }) => {
      const team = await getTeam({ slug: input.slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is owner
      await verifyTeamOwner(team.id, ctx.session.user.id);

      await deleteInvitation({ id: input.invitationId });

      recordMetric('team.invitation.deleted');

      return { success: true };
    }),

  /**
   * Resend a team invitation
   */
  resendInvitation: protectedProcedure
    .input(invitationIdSchema)
    .mutation(async ({ ctx, input }) => {
      const team = await getTeam({ slug: input.slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is owner
      await verifyTeamOwner(team.id, ctx.session.user.id);

      const invitation = await prisma.invitation.findUnique({
        where: { id: input.invitationId },
        include: { team: true },
      });

      if (!invitation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found',
        });
      }

      if (invitation.email) {
        await sendTeamInviteEmail(team, invitation);
      }

      recordMetric('team.invitation.resent');

      return { success: true };
    }),

  /**
   * Get team API keys
   */
  apiKeys: protectedProcedure
    .input(teamSlugSchema)
    .query(async ({ ctx, input }) => {
      const team = await getTeam({ slug: input.slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is a member
      await verifyTeamMembership(team.id, ctx.session.user.id);

      const apiKeys = await fetchApiKeys(team.id);
      return apiKeys;
    }),

  /**
   * Create a team API key
   */
  createApiKey: protectedProcedure
    .input(createApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      const { slug, name } = input;

      const team = await getTeam({ slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is owner
      await verifyTeamOwner(team.id, ctx.session.user.id);

      const apiKey = await createApiKey({
        name,
        teamId: team.id,
      });

      recordMetric('team.api-key.created');

      return apiKey;
    }),

  /**
   * Delete a team API key
   */
  deleteApiKey: protectedProcedure
    .input(apiKeyIdSchema)
    .mutation(async ({ ctx, input }) => {
      const team = await getTeam({ slug: input.slug });

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        });
      }

      // Verify user is owner
      await verifyTeamOwner(team.id, ctx.session.user.id);

      await deleteApiKey(input.apiKeyId);

      recordMetric('team.api-key.deleted');

      return { success: true };
    }),
});

