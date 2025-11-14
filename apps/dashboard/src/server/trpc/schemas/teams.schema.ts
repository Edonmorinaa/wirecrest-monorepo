/**
 * Zod Schemas for Teams Router
 * 
 * Validation schemas for all team-related operations
 */

import { z } from 'zod';
import { Role } from '@prisma/client';

/**
 * Schema for creating a new team
 */
export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100, 'Team name too long'),
});

/**
 * Schema for updating a team
 */
export const updateTeamSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  name: z.string().min(1).max(100).optional(),
  domain: z.string().url('Invalid domain URL').optional().or(z.literal('')),
});

/**
 * Schema for team slug parameter
 */
export const teamSlugSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
});

/**
 * Schema for team member ID parameter
 */
export const teamMemberIdSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  memberId: z.string().min(1, 'Member ID is required'),
});

/**
 * Schema for updating team member role
 */
export const updateMemberRoleSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  memberId: z.string().min(1, 'Member ID is required'),
  role: z.nativeEnum(Role),
});

/**
 * Schema for getting team invitations
 */
export const getInvitationsSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  sentViaEmail: z.boolean().optional().default(true),
});

/**
 * Schema for creating a team invitation
 */
export const createInvitationSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  email: z.string().email('Invalid email address').optional(),
  role: z.nativeEnum(Role),
});

/**
 * Schema for invitation ID parameter
 */
export const invitationIdSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  invitationId: z.string().min(1, 'Invitation ID is required'),
});

/**
 * Schema for creating an API key
 */
export const createApiKeySchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  name: z.string().min(1, 'API key name is required').max(100, 'Name too long'),
});

/**
 * Schema for API key ID parameter
 */
export const apiKeyIdSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  apiKeyId: z.string().min(1, 'API key ID is required'),
});

