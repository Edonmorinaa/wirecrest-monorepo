/**
 * Zod Schemas for Reviews Router
 * 
 * Validation schemas for all review-related operations
 */

import { z } from 'zod';

/**
 * Schema for team slug parameter
 */
export const reviewTeamSlugSchema = z.object({
  teamSlug: z.string().min(1, 'Team slug is required'),
});

/**
 * Schema for review filters
 */
export const reviewFiltersSchema = z.object({
  teamSlug: z.string().min(1, 'Team slug is required'),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(25),
  rating: z.union([z.number().int().min(1).max(5), z.array(z.number().int().min(1).max(5))]).optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  isRead: z.boolean().optional(),
  isImportant: z.boolean().optional(),
  hasResponse: z.boolean().optional(),
  dateRange: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * Schema for inbox filters with unified review support
 */
export const inboxFiltersSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  filters: z.object({
    page: z.number().int().positive().optional().default(1),
    limit: z.number().int().positive().max(100).optional().default(20),
    platforms: z.array(z.enum(['google', 'facebook', 'tripadvisor', 'booking'])).optional(),
    rating: z.union([z.number().int().min(1).max(5), z.array(z.number().int().min(1).max(5))]).optional(),
    status: z.enum(['all', 'unread', 'read', 'important', 'replied', 'not-replied']).optional().default('all'),
    sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
    search: z.string().optional(),
    sortBy: z.enum(['date', 'rating', 'sentiment', 'platform']).optional().default('date'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    dateRange: z.enum(['all', 'today', 'week', 'month', 'year']).optional().default('all'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).optional(),
});

/**
 * Schema for updating Google review metadata
 */
export const updateGoogleReviewMetadataSchema = z.object({
  teamSlug: z.string().min(1, 'Team slug is required'),
  reviewId: z.string().min(1, 'Review ID is required'),
  isRead: z.boolean().optional(),
  isImportant: z.boolean().optional(),
});

/**
 * Schema for updating review status
 */
export const updateReviewStatusSchema = z.object({
  teamSlug: z.string().min(1, 'Team slug is required'),
  reviewId: z.string().min(1, 'Review ID is required'),
  field: z.string().min(1, 'Field is required'),
  value: z.any(),
});

/**
 * Schema for Google enhanced review analytics
 * Only requires date range - all other data is fetched from context/session
 */
export const googleEnhancedAnalyticsSchema = z.object({
  teamSlug: z.string().min(1, 'Team slug is required'),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
});

