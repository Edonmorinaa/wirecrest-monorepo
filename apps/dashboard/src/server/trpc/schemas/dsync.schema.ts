/**
 * Zod Schemas for Directory Sync Router
 */

import { z } from 'zod';

/**
 * Schema for team slug parameter
 */
export const dsyncSlugSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
});

/**
 * Schema for directory ID parameter
 */
export const dsyncDirectorySchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  directoryId: z.string().min(1, 'Directory ID is required'),
});

/**
 * Schema for creating directory sync connection
 */
export const createDsyncConnectionSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  connectionData: z.any(), // Dynamic data structure
});

/**
 * Schema for updating directory sync connection
 */
export const updateDsyncConnectionSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  directoryId: z.string().min(1, 'Directory ID is required'),
  connectionData: z.any(),
});

/**
 * Schema for directory sync users
 */
export const dsyncUsersSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  directoryId: z.string().min(1, 'Directory ID is required'),
  offset: z.number().int().nonnegative().optional().default(0),
  limit: z.number().int().positive().max(100).optional().default(50),
});

/**
 * Schema for deleting directory sync user
 */
export const deleteDsyncUserSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  directoryId: z.string().min(1, 'Directory ID is required'),
  userId: z.string().min(1, 'User ID is required'),
});

