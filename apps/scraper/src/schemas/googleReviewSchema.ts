/**
 * Zod validation schema for Google Reviews data from Apify
 * Ensures data integrity before processing
 */

import { z } from "zod";

/**
 * Google Review Metadata Schema
 */
export const GoogleReviewMetadataSchema = z
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
 * Main Google Review Schema
 * Validates reviews from Google Maps Reviews Scraper (Apify actor)
 */
export const GoogleReviewSchema = z
  .object({
    // Identifiers (required)
    placeId: z.string().min(1, "placeId is required"),
    reviewerId: z.string().optional(), // May be missing for some reviews
    reviewUrl: z.string().url().optional(),

    // Rating (required, 1-5 scale)
    rating: z
      .number()
      .min(1, "Rating must be at least 1")
      .max(5, "Rating must be at most 5")
      .nullable()
      .optional(),
    stars: z
      .number()
      .min(1, "Stars must be at least 1")
      .max(5, "Stars must be at most 5")
      .nullable()
      .optional(),

    // Dates (required)
    publishedAtDate: z.coerce.date({
      required_error: "publishedAtDate is required",
      invalid_type_error: "publishedAtDate must be a valid date",
    }),
    scrapedAt: z.coerce.date().optional(),

    // Review content (optional)
    text: z.string().nullable().optional(),
    textTranslated: z.string().nullable().optional(),
    language: z.string().default("en"),

    // Reviewer info (optional)
    name: z.string().nullable().optional(),
    reviewerPhotoUrl: z.string().url().nullable().optional(),
    reviewerNumberOfReviews: z.number().int().min(0).nullable().optional(),
    reviewerLocalGuide: z.boolean().optional(),

    // Review metadata (optional)
    reviewImageUrls: z.array(z.string().url()).optional(),
    reviewMetadata: GoogleReviewMetadataSchema,

    // Owner response (optional)
    responseFromOwnerText: z.string().nullable().optional(),
    responseFromOwnerDate: z.coerce.date().nullable().optional(),
    responseFromOwnerAgo: z.string().nullable().optional(),

    // Additional metadata
    likesCount: z.number().int().min(0).nullable().optional(),
    isLocalGuide: z.boolean().optional(),
  })
  .strict();

/**
 * Array of Google Reviews Schema
 */
export const GoogleReviewsArraySchema = z.array(GoogleReviewSchema);

/**
 * Type exports
 */
export type GoogleReviewInput = z.infer<typeof GoogleReviewSchema>;
export type GoogleReviewMetadataInput = z.infer<
  typeof GoogleReviewMetadataSchema
>;

/**
 * Validation helper function
 */
export function validateGoogleReviews(data: unknown): GoogleReviewInput[] {
  try {
    return GoogleReviewsArraySchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Google Reviews validation failed:", error.errors);
      throw new Error(
        `Invalid Google Reviews data: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
      );
    }
    throw error;
  }
}

/**
 * Safe validation that filters out invalid reviews
 */
export function validateGoogleReviewsSafe(data: unknown): {
  valid: GoogleReviewInput[];
  invalid: number;
} {
  if (!Array.isArray(data)) {
    return { valid: [], invalid: 0 };
  }

  const valid: GoogleReviewInput[] = [];
  let invalid = 0;

  for (const item of data) {
    const result = GoogleReviewSchema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid++;
      console.warn("Invalid Google review skipped:", result.error.errors[0]);
    }
  }

  return { valid, invalid };
}
