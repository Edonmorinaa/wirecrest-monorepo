/**
 * Zod Schemas for Admin Router
 */

import { z } from 'zod';

/**
 * Schema for market identifier creation/update
 */
export const marketIdentifierSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  platform: z.enum([
    'GOOGLE_MAPS',
    'FACEBOOK',
    'TRIPADVISOR',
    'BOOKING',
    'INSTAGRAM',
    'TIKTOK',
    'YELP',
  ]),
  identifier: z.string().min(1, 'Identifier is required'),
});

/**
 * Schema for deleting market identifier
 */
export const deleteMarketIdentifierSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  platform: z.enum([
    'GOOGLE_MAPS',
    'FACEBOOK',
    'TRIPADVISOR',
    'BOOKING',
    'INSTAGRAM',
    'TIKTOK',
    'YELP',
  ]),
});

/**
 * Schema for platform action execution
 */
export const executePlatformActionSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  platform: z.enum(['GOOGLE', 'FACEBOOK', 'TRIPADVISOR', 'TIKTOK']),
  action: z.enum(['VERIFY', 'SCRAPE', 'INTEGRATE']),
  metadata: z.any().optional(),
});

/**
 * Schema for enhanced market identifier creation
 */
export const marketIdentifierEnhancedSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  platform: z.enum([
    'GOOGLE_MAPS',
    'FACEBOOK',
    'TRIPADVISOR',
    'BOOKING',
    'INSTAGRAM',
    'TIKTOK',
    'YELP',
  ]),
  identifier: z.string().min(1, 'Identifier is required'),
  autoVerify: z.boolean().optional().default(false),
});

/**
 * Schema for deleting platform data
 */
export const deletePlatformDataSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  platform: z.enum(['GOOGLE_MAPS', 'FACEBOOK', 'TRIPADVISOR', 'TIKTOK']),
});

/**
 * Schema for tenant details
 */
export const tenantDetailsSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
});

/**
 * Schema for checking platform status
 */
export const platformStatusSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  platform: z.enum(['GOOGLE', 'FACEBOOK', 'TRIPADVISOR', 'BOOKING', 'TIKTOK']),
});

/**
 * Schema for Instagram control execution
 */
export const instagramControlSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  action: z.enum(['VERIFY', 'SCRAPE', 'INTEGRATE', 'DELETE']),
  metadata: z.any().optional(),
});

