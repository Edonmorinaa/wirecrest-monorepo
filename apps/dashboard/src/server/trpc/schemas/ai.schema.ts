/**
 * Zod Schemas for AI Router
 */

import { z } from 'zod';

/**
 * Review data for AI response generation
 */
export const reviewDataSchema = z.object({
  text: z.string(),
  rating: z.number().optional(),
  reviewerName: z.string().optional(),
  businessName: z.string().optional(),
  platform: z.string().optional(),
  reviewDate: z.string().optional(),
  reviewUrl: z.string().optional(),
  additionalContext: z.string().optional(),
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

