/**
 * Zod Schemas for Platforms Router
 */

import { z } from 'zod';

/**
 * Schema for team slug parameter
 */
export const platformSlugSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
});

/**
 * Schema for creating business market identifier
 */
export const createMarketIdentifierSchema = z.object({
  teamSlug: z.string().min(1, 'Team slug is required'),
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
 * Schema for creating Google profile
 */
export const createGoogleProfileSchema = z.object({
  teamSlug: z.string().min(1, 'Team slug is required'),
  placeId: z.string().min(1, 'Place ID is required'),
});

/**
 * Schema for getting Google reviews
 */
export const getGoogleReviewsSchema = z.object({
  teamSlug: z.string().min(1, 'Team slug is required'),
  filters: z.object({
    rating: z.number().min(1).max(5).optional(),
    hasResponse: z.boolean().optional(),
    status: z.enum(['pending', 'responded', 'ignored']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.number().int().positive().optional().default(1),
    limit: z.number().int().positive().max(100).optional().default(10),
  }).optional(),
});

/**
 * Schema for creating Facebook profile
 */
export const createFacebookProfileSchema = z.object({
  teamSlug: z.string().min(1, 'Team slug is required'),
  facebookUrl: z.string().url('Invalid Facebook URL'),
});

/**
 * Schema for getting Facebook reviews
 */
export const getFacebookReviewsSchema = z.object({
  teamSlug: z.string().min(1, 'Team slug is required'),
  filters: z.object({
    rating: z.number().min(1).max(5).optional(),
    hasRecommendation: z.boolean().optional(),
    page: z.number().int().positive().optional().default(1),
    limit: z.number().int().positive().max(100).optional().default(10),
  }).optional(),
});

