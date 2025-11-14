/**
 * Zod Schemas for Utils Router
 */

import { z } from 'zod';

export const invitationTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const teamSlugParamSchema = z.object({
  teamSlug: z.string().min(1, 'Team slug is required'),
});

export const workflowIdSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
});

/**
 * Schema for sync status by team ID
 */
export const syncStatusSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
});

