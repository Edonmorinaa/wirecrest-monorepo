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

/**
 * Schema for creating a team with first location (superadmin)
 */
export const createTeamWithLocationSchema = z.object({
  // Team data
  teamName: z.string().min(2, 'Team name must be at least 2 characters'),
  teamSlug: z.string().min(2, 'Team slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Team slug can only contain lowercase letters, numbers, and hyphens'),
  
  // Location data
  locationName: z.string().min(2, 'Location name must be at least 2 characters'),
  locationSlug: z.string().min(2, 'Location slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Location slug can only contain lowercase letters, numbers, and hyphens'),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().default('UTC'),
});

/**
 * Schema for getting team with all locations (superadmin)
 */
export const getTeamWithLocationsSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
});

/**
 * Schema for getting location platform data (superadmin)
 */
export const getLocationPlatformDataSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  locationId: z.string().min(1, 'Location ID is required'),
});

/**
 * Schema for location ID parameter
 */
export const superadminLocationIdSchema = z.object({
  locationId: z.string().min(1, 'Location ID is required'),
});

