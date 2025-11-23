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
  locationId: z.string().min(1, 'Location ID is required'),
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
  locationId: z.string().min(1, 'Location ID is required'),
  placeId: z.string().min(1, 'Place ID is required'),
});

/**
 * Schema for getting Google reviews
 */
export const getGoogleReviewsSchema = z.object({
  teamSlug: z.string().min(1, 'Team slug is required'),
  filters: z.object({
    rating: z.union([z.number().int().min(1).max(5), z.array(z.number().int().min(1).max(5))]).optional(),
    hasResponse: z.boolean().optional(),
    status: z.enum(['pending', 'responded', 'ignored']).optional(),
    sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    isRead: z.boolean().optional(),
    isImportant: z.boolean().optional(),
    dateRange: z.string().optional(),
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
  locationId: z.string().min(1, 'Location ID is required'),
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

/**
 * Schema for location-based platform operations
 */
export const locationSlugSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  locationSlug: z.string().min(1, 'Location slug is required'),
});

/**
 * Schema for Instagram analytics with date range
 */
export const getInstagramAnalyticsSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  locationSlug: z.string().min(1, 'Location slug is required'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * Schema for enabling Instagram snapshot schedule
 */
export const enableInstagramScheduleSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  locationSlug: z.string().min(1, 'Location slug is required'),
  snapshotTime: z.string().optional().default('09:00:00'),
  timezone: z.string().optional().default('UTC'),
});

