/**
 * Zod validation schema for Facebook Reviews data from Apify
 * Facebook uses recommendation system, not star ratings
 */

import { z } from "zod";

/**
 * Facebook Review Metadata Schema
 */
export const FacebookReviewMetadataSchema = z
  .object({
    emotional: z.string().nullable().optional(),
    keywords: z.array(z.string()).optional(),
    topics: z.array(z.string()).optional(),
    sentiment: z.number().min(-1).max(1).nullable().optional(),
    actionable: z.boolean().optional(),
    responseUrgency: z.string().nullable().optional(),
    competitorMentions: z.array(z.string()).optional(),
    comparativePositive: z.string().nullable().optional(),
    isRead: z.boolean().optional(),
    isImportant: z.boolean().optional(),
    labels: z.array(z.string()).optional(),
    reply: z.string().nullable().optional(),
    replyDate: z.coerce.date().nullable().optional(),
    date: z.coerce.date().nullable().optional(),
  })
  .strict()
  .optional();

/**
 * Facebook Recommendation Type
 */
export const FacebookRecommendationTypeSchema = z.enum([
  "POSITIVE",
  "NEGATIVE",
  "UNKNOWN",
]);

/**
 * Main Facebook Review Schema
 * Note: Facebook uses recommendations (yes/no) instead of star ratings
 */
export const FacebookReviewSchema = z
  .object({
    // Identifiers (required)
    facebookUrl: z.string().url("facebookUrl must be a valid URL"),
    reviewId: z.string().optional(),
    reviewUrl: z.string().url().optional(),

    // Recommendation (required - Facebook specific)
    recommendationType: FacebookRecommendationTypeSchema.default("UNKNOWN"),
    recommended: z.boolean().nullable().optional(),

    // Date (required)
    date: z.coerce.date({
      required_error: "date is required",
      invalid_type_error: "date must be a valid date",
    }),
    scrapedAt: z.coerce.date().optional(),

    // Review content (optional)
    text: z.string().nullable().optional(),
    reviewText: z.string().nullable().optional(),
    language: z.string().default("en"),

    // Reviewer info (optional)
    reviewerName: z.string().nullable().optional(),
    reviewerProfileUrl: z.string().url().nullable().optional(),
    reviewerPhoto: z.string().url().nullable().optional(),

    // Engagement metrics (optional)
    likes: z.number().int().min(0).default(0),
    comments: z.number().int().min(0).default(0),
    shares: z.number().int().min(0).nullable().optional(),

    // Photos (optional)
    photoCount: z.number().int().min(0).default(0),
    photoUrls: z.array(z.string().url()).optional(),
    photos: z.array(z.string().url()).optional(),

    // Tags (optional)
    tags: z.array(z.string()).optional(),

    // Review metadata (optional)
    reviewMetadata: FacebookReviewMetadataSchema,

    // Owner response (optional)
    hasResponse: z.boolean().optional(),
    responseText: z.string().nullable().optional(),
    responseDate: z.coerce.date().nullable().optional(),
  })
  .strict();

/**
 * Array of Facebook Reviews Schema
 */
export const FacebookReviewsArraySchema = z.array(FacebookReviewSchema);

/**
 * Type exports
 */
export type FacebookReviewInput = z.infer<typeof FacebookReviewSchema>;
export type FacebookReviewMetadataInput = z.infer<
  typeof FacebookReviewMetadataSchema
>;
export type FacebookRecommendationType = z.infer<
  typeof FacebookRecommendationTypeSchema
>;

/**
 * Validation helper function
 */
export function validateFacebookReviews(data: unknown): FacebookReviewInput[] {
  try {
    return FacebookReviewsArraySchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Facebook Reviews validation failed:", error.errors);
      throw new Error(
        `Invalid Facebook Reviews data: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
      );
    }
    throw error;
  }
}

/**
 * Safe validation that filters out invalid reviews
 */
export function validateFacebookReviewsSafe(data: unknown): {
  valid: FacebookReviewInput[];
  invalid: number;
} {
  if (!Array.isArray(data)) {
    return { valid: [], invalid: 0 };
  }

  const valid: FacebookReviewInput[] = [];
  let invalid = 0;

  for (const item of data) {
    const result = FacebookReviewSchema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid++;
      console.warn("Invalid Facebook review skipped:", result.error.errors[0]);
    }
  }

  return { valid, invalid };
}
