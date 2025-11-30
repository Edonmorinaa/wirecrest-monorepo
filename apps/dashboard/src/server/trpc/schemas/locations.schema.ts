/**
 * Zod Schemas for Locations Router
 */

import { z } from 'zod';

/**
 * Schema for team slug parameter (used in many procedures)
 */
export const teamSlugSchema = z.object({
  teamSlug: z.string().min(1, 'Team slug is required'),
});

/**
 * Schema for creating a location
 */
export const createLocationSchema = z.object({
  teamSlug: z.string().min(1, 'Team slug is required'),
  slug: z.string().min(1, 'Location slug is required').max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1, 'Location name is required').max(255),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  timezone: z.string().max(100).optional().default('UTC'),
});

/**
 * Schema for location ID parameter
 */
export const locationIdSchema = z.object({
  locationId: z.string().uuid('Invalid location ID'),
});

/**
 * Schema for updating a location
 */
export const updateLocationSchema = z.object({
  locationId: z.string().uuid('Invalid location ID'),
  slug: z.string().min(1, 'Location slug is required').max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  name: z.string().min(1, 'Location name is required').max(255).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  timezone: z.string().max(100).optional(),
});

/**
 * Platform enum for selecting which platform to query
 */
export const platformEnum = z.enum(['google', 'facebook', 'tripadvisor', 'booking']);

/**
 * Schema for getting platform profile
 */
export const getLocationProfileSchema = z.object({
  locationId: z.string().uuid('Invalid location ID'),
  platform: platformEnum,
});

/**
 * Schema for getting platform analytics with date range
 */
export const getLocationAnalyticsSchema = z.object({
  locationId: z.string().uuid('Invalid location ID'),
  platform: platformEnum,
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
});

/**
 * Schema for getting platform reviews with filters and pagination
 */
export const getLocationReviewsSchema = z.object({
  locationId: z.string().uuid('Invalid location ID'),
  platform: platformEnum,
  filters: z.object({
    // Common filters
    rating: z.union([z.number().int().min(1).max(5), z.array(z.number().int().min(1).max(5))]).optional(),
    sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
    hasResponse: z.boolean().optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    isRead: z.boolean().optional(),
    isImportant: z.boolean().optional(),

    // Facebook-specific filters
    isRecommended: z.boolean().optional(),
    hasLikes: z.boolean().optional(),
    hasComments: z.boolean().optional(),
    hasPhotos: z.boolean().optional(),
    hasTags: z.boolean().optional(),
    minLikes: z.number().int().min(0).optional(),
    maxLikes: z.number().int().min(0).optional(),
    minComments: z.number().int().min(0).optional(),
    maxComments: z.number().int().min(0).optional(),

    // TripAdvisor-specific filters
    tripType: z.union([
      z.enum(['FAMILY', 'COUPLES', 'SOLO', 'BUSINESS', 'FRIENDS']),
      z.array(z.enum(['FAMILY', 'COUPLES', 'SOLO', 'BUSINESS', 'FRIENDS']))
    ]).optional(),
    helpfulVotes: z.boolean().optional(),

    // Booking-specific filters
    guestType: z.string().optional(),
    lengthOfStay: z.enum(['short', 'medium', 'long']).optional(),
    nationality: z.string().optional(),
    roomType: z.string().optional(),
    isVerifiedStay: z.boolean().optional(),
  }).optional(),
  pagination: z.object({
    page: z.number().int().positive().optional().default(1),
    limit: z.number().int().positive().max(100).optional().default(10),
  }).optional(),
});

/**
 * Schema for getting enhanced graph data
 */
export const getEnhancedGraphDataSchema = z.object({
  locationId: z.string().uuid('Invalid location ID'),
  platform: platformEnum,
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
});

/**
 * Schema for updating review metadata
 */
export const updateReviewMetadataSchema = z.object({
  locationId: z.string().uuid('Invalid location ID'),
  platform: platformEnum,
  reviewId: z.string().min(1, 'Review ID is required'),
  metadata: z.object({
    isRead: z.boolean().optional(),
    isImportant: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }),
});
