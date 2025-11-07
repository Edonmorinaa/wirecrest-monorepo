/**
 * Zod validation schema for Booking.com Reviews data from Apify
 * Booking uses 1-10 rating scale with 7 sub-rating categories
 */

import { z } from "zod";

/**
 * Booking Guest Type Schema
 */
export const BookingGuestTypeSchema = z
  .enum([
    "SOLO",
    "COUPLE",
    "FAMILY_WITH_YOUNG_CHILDREN",
    "FAMILY_WITH_OLDER_CHILDREN",
    "GROUP_OF_FRIENDS",
    "BUSINESS",
  ])
  .optional();

/**
 * Main Booking Review Schema
 * Handles multiple field name variations from different Apify actors
 */
export const BookingReviewSchema = z
  .object({
    // Identifiers (multiple variations)
    id: z.string().optional(),
    reviewId: z.string().optional(),
    review_id: z.string().optional(),
    url: z.string().optional(),
    reviewUrl: z.string().optional(),
    bookingUrl: z.string().optional(),
    hotelId: z.string().optional(),
    hotel_id: z.string().optional(),

    // Rating (required, 1-10 scale for Booking.com)
    rating: z
      .union([z.number(), z.string()])
      .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
      .refine((val) => Number.isFinite(val), "Rating must be a finite number")
      .refine(
        (val) => val >= 0 && val <= 10,
        "Rating must be between 0 and 10",
      ),
    review_score: z.number().min(0).max(10).optional(),
    score: z.number().min(0).max(10).optional(),

    // Guest information (multiple variations)
    userName: z.string().nullable().optional(),
    guestName: z.string().nullable().optional(),
    guest_name: z.string().nullable().optional(),
    authorName: z.string().nullable().optional(),
    author: z.string().nullable().optional(),
    reviewer: z.string().nullable().optional(),
    reviewerName: z.string().nullable().optional(),

    userLocation: z.string().nullable().optional(),
    guestCountry: z.string().nullable().optional(),
    guest_country: z.string().nullable().optional(),
    nationality: z.string().nullable().optional(),
    country: z.string().nullable().optional(),

    guestType: BookingGuestTypeSchema,
    guest_type: z.string().nullable().optional(),
    travelerType: z.string().nullable().optional(),
    traveller_type: z.string().nullable().optional(),

    // Stay information (multiple variations)
    roomInfo: z.string().nullable().optional(),
    roomType: z.string().nullable().optional(),
    room_type: z.string().nullable().optional(),
    room: z.string().nullable().optional(),

    stayDate: z.string().nullable().optional(),
    stay_date: z.string().nullable().optional(),
    visitDate: z.string().nullable().optional(),

    reviewDate: z.string().nullable().optional(),
    review_date: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    publishedDate: z.string().nullable().optional(),

    stayLength: z.string().nullable().optional(),
    lengthOfStay: z.number().int().min(0).nullable().optional(),
    length_of_stay: z.number().int().min(0).nullable().optional(),
    nights: z.number().int().min(0).nullable().optional(),

    // Review content (multiple variations)
    reviewTitle: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    review_title: z.string().nullable().optional(),

    text: z.string().nullable().optional(),
    review_text: z.string().nullable().optional(),
    review: z.string().nullable().optional(),
    content: z.string().nullable().optional(),

    reviewTextParts: z
      .object({
        Liked: z.string().optional(),
        Disliked: z.string().optional(),
      })
      .optional(),

    positive: z.string().nullable().optional(),
    review_positive: z.string().nullable().optional(),
    liked: z.string().nullable().optional(),
    likedMost: z.string().nullable().optional(),
    liked_most: z.string().nullable().optional(),

    negative: z.string().nullable().optional(),
    review_negative: z.string().nullable().optional(),
    disliked: z.string().nullable().optional(),
    dislikedMost: z.string().nullable().optional(),
    disliked_most: z.string().nullable().optional(),

    // Sub-ratings (7 categories, 1-10 scale)
    cleanliness: z.number().min(0).max(10).nullable().optional(),
    cleanlinessRating: z.number().min(0).max(10).nullable().optional(),
    cleanliness_rating: z.number().min(0).max(10).nullable().optional(),

    comfort: z.number().min(0).max(10).nullable().optional(),
    comfortRating: z.number().min(0).max(10).nullable().optional(),
    comfort_rating: z.number().min(0).max(10).nullable().optional(),

    location: z.number().min(0).max(10).nullable().optional(),
    locationRating: z.number().min(0).max(10).nullable().optional(),
    location_rating: z.number().min(0).max(10).nullable().optional(),

    facilities: z.number().min(0).max(10).nullable().optional(),
    facilitiesRating: z.number().min(0).max(10).nullable().optional(),
    facilities_rating: z.number().min(0).max(10).nullable().optional(),

    staff: z.number().min(0).max(10).nullable().optional(),
    staffRating: z.number().min(0).max(10).nullable().optional(),
    staff_rating: z.number().min(0).max(10).nullable().optional(),

    valueForMoney: z.number().min(0).max(10).nullable().optional(),
    valueForMoneyRating: z.number().min(0).max(10).nullable().optional(),
    value_for_money_rating: z.number().min(0).max(10).nullable().optional(),

    wifi: z.number().min(0).max(10).nullable().optional(),
    wifiRating: z.number().min(0).max(10).nullable().optional(),
    wifi_rating: z.number().min(0).max(10).nullable().optional(),

    // Owner response (multiple variations)
    hasResponse: z.boolean().optional(),
    responseFromOwnerText: z.string().nullable().optional(),
    responseFromOwnerDate: z.string().nullable().optional(),
    ownerResponse: z.string().nullable().optional(),

    // Additional fields
    language: z.string().optional(),
    verified: z.boolean().optional(),
    isVerified: z.boolean().optional(),

    tags: z.array(z.string()).optional(),
  })
  .passthrough(); // Allow additional fields from Apify

/**
 * Array of Booking Reviews Schema
 */
export const BookingReviewsArraySchema = z.array(BookingReviewSchema);

/**
 * Type exports
 */
export type BookingReviewInput = z.infer<typeof BookingReviewSchema>;
export type BookingGuestType = z.infer<typeof BookingGuestTypeSchema>;

/**
 * Validation helper function
 */
export function validateBookingReviews(data: unknown): BookingReviewInput[] {
  try {
    return BookingReviewsArraySchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Booking Reviews validation failed:", error.errors);
      throw new Error(
        `Invalid Booking Reviews data: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
      );
    }
    throw error;
  }
}

/**
 * Safe validation that filters out invalid reviews
 */
export function validateBookingReviewsSafe(data: unknown): {
  valid: BookingReviewInput[];
  invalid: number;
} {
  if (!Array.isArray(data)) {
    return { valid: [], invalid: 0 };
  }

  const valid: BookingReviewInput[] = [];
  let invalid = 0;

  for (const item of data) {
    const result = BookingReviewSchema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid++;
      console.warn("Invalid Booking review skipped:", result.error.errors[0]);
    }
  }

  return { valid, invalid };
}
