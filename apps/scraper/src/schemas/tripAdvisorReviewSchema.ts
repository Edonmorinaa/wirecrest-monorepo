/**
 * Zod validation schema for TripAdvisor Reviews data from Apify
 * TripAdvisor uses 1-5 "bubbles" rating system with sub-ratings
 */

import { z } from "zod";

/**
 * TripAdvisor Sub-Ratings Schema (1-5 scale)
 */
export const TripAdvisorSubRatingsSchema = z
  .object({
    service: z.number().min(0).max(5).nullable().optional(),
    food: z.number().min(0).max(5).nullable().optional(),
    value: z.number().min(0).max(5).nullable().optional(),
    atmosphere: z.number().min(0).max(5).nullable().optional(),
    cleanliness: z.number().min(0).max(5).nullable().optional(),
    location: z.number().min(0).max(5).nullable().optional(),
    rooms: z.number().min(0).max(5).nullable().optional(),
    sleepQuality: z.number().min(0).max(5).nullable().optional(),
  })
  .strict()
  .optional();

/**
 * TripAdvisor Trip Type Schema
 */
export const TripAdvisorTripTypeSchema = z
  .enum([
    "FAMILY",
    "COUPLES",
    "SOLO",
    "BUSINESS",
    "FRIENDS",
    "family",
    "couples",
    "solo",
    "business",
    "friends",
  ])
  .transform((val) => val.toUpperCase());

/**
 * TripAdvisor Review Metadata Schema
 */
export const TripAdvisorReviewMetadataSchema = z
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
    replyDate: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    photoCount: z.number().int().min(0).nullable().optional(),
  })
  .strict()
  .optional();

/**
 * Main TripAdvisor Review Schema
 */
export const TripAdvisorReviewSchema = z
  .object({
    // Identifiers (required)
    url: z.string().optional(),
    tripAdvisorUrl: z.string().optional(),
    reviewId: z.string().optional(),

    // Rating (required, 1-5 bubbles)
    rating: z
      .number()
      .refine((val) => Number.isFinite(val), "Rating must be a finite number")
      .refine((val) => val >= 0 && val <= 5, "Rating must be between 0 and 5"),

    // Dates (required)
    publishedDate: z.string({
      required_error: "publishedDate is required",
    }),
    visitDate: z.string().nullable().optional(),

    // Review content (optional)
    text: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    language: z.string().optional(),

    // Reviewer info (optional)
    username: z.string().nullable().optional(),
    reviewerName: z.string().nullable().optional(),
    userProfile: z.string().nullable().optional(),

    // Sub-ratings (optional, hotel/restaurant specific)
    subRatings: TripAdvisorSubRatingsSchema,

    // Trip details (optional)
    tripType: TripAdvisorTripTypeSchema.nullable().optional(),
    roomTip: z.string().nullable().optional(),

    // Engagement metrics (optional)
    helpfulVotes: z.number().int().min(0).default(0),

    // Photos (optional)
    photoCount: z.number().int().min(0).default(0),
    photos: z.array(z.string()).optional(),

    // Owner response (optional)
    hasOwnerResponse: z.boolean().default(false),
    ownerResponse: z.string().nullable().optional(),
    responseFromOwnerDate: z.string().nullable().optional(),

    // Review metadata (optional)
    reviewMetadata: TripAdvisorReviewMetadataSchema,
  })
  .strict();

/**
 * Array of TripAdvisor Reviews Schema
 */
export const TripAdvisorReviewsArraySchema = z.array(TripAdvisorReviewSchema);

/**
 * Type exports
 */
export type TripAdvisorReviewInput = z.infer<typeof TripAdvisorReviewSchema>;
export type TripAdvisorSubRatingsInput = z.infer<
  typeof TripAdvisorSubRatingsSchema
>;
export type TripAdvisorTripType = z.infer<typeof TripAdvisorTripTypeSchema>;

/**
 * Validation helper function
 */
export function validateTripAdvisorReviews(
  data: unknown,
): TripAdvisorReviewInput[] {
  try {
    return TripAdvisorReviewsArraySchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("TripAdvisor Reviews validation failed:", error.errors);
      throw new Error(
        `Invalid TripAdvisor Reviews data: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
      );
    }
    throw error;
  }
}

/**
 * Safe validation that filters out invalid reviews
 */
export function validateTripAdvisorReviewsSafe(data: unknown): {
  valid: TripAdvisorReviewInput[];
  invalid: number;
} {
  if (!Array.isArray(data)) {
    return { valid: [], invalid: 0 };
  }

  const valid: TripAdvisorReviewInput[] = [];
  let invalid = 0;

  for (const item of data) {
    const result = TripAdvisorReviewSchema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid++;
      console.warn(
        "Invalid TripAdvisor review skipped:",
        result.error.errors[0],
      );
    }
  }

  return { valid, invalid };
}
