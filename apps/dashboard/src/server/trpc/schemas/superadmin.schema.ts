/**
 * Zod Schemas for Superadmin Router
 */

import { z } from 'zod';

/**
 * Schema for team ID parameter
 */
export const superadminTeamIdSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
});

/**
 * Schema for creating a team (superadmin)
 */
export const superadminCreateTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  slug: z.string().min(1, 'Team slug is required'),
  domain: z.string().url('Invalid domain URL').optional().or(z.literal('')),
});

/**
 * Schema for updating a team (superadmin)
 */
export const superadminUpdateTeamSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  domain: z.string().url('Invalid domain URL').optional().or(z.literal('')),
});

