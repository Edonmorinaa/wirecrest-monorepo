/**
 * Zod Schemas for AI Router
 */

import { z } from 'zod';

/**
 * Review data for AI response generation
 */
export const reviewDataSchema = z.object({
  reviewText: z.string(),
  reviewerName: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  platform: z.string().optional(),
});

/**
 * Schema for generating owner response
 */
export const generateOwnerResponseSchema = z.object({
  reviewData: reviewDataSchema,
  customPrompt: z.string().optional(),
  tone: z.enum(['professional', 'friendly', 'formal', 'casual']).optional().default('professional'),
  language: z.string().optional().default('en'),
});

/**
 * Schema for platform-specific response generation
 */
export const generatePlatformResponseSchema = z.object({
  reviewData: reviewDataSchema,
  customPrompt: z.string().optional(),
  tone: z.enum(['professional', 'friendly', 'formal', 'casual']).optional().default('professional'),
  language: z.string().optional().default('en'),
});

