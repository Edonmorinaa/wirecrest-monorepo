/**
 * TripAdvisor Metrics Calculator
 * Handles TripAdvisor-specific metrics: bubble ratings, sub-ratings, trip types, helpful votes
 * TripAdvisor uses 1-5 bubble ratings (same scale as Google stars)
 */

export interface TripAdvisorSubRatings {
  service?: number | null;
  food?: number | null;
  value?: number | null;
  atmosphere?: number | null;
  cleanliness?: number | null;
  location?: number | null;
  rooms?: number | null;
  sleepQuality?: number | null;
}

export interface TripAdvisorSubRatingAverages {
  averageServiceRating: number | null;
  averageFoodRating: number | null;
  averageValueRating: number | null;
  averageAtmosphereRating: number | null;
  averageCleanlinessRating: number | null;
  averageLocationRating: number | null;
  averageRoomsRating: number | null;
  averageSleepQualityRating: number | null;
}

export interface TripTypeCounts {
  familyReviews: number;
  couplesReviews: number;
  soloReviews: number;
  businessReviews: number;
  friendsReviews: number;
}

export interface HelpfulVotesMetrics {
  totalHelpfulVotes: number;
  averageHelpfulVotes: number;
}

export class TripAdvisorMetricsCalculator {
  /**
   * Calculate trip type distribution from review trip types
   */
  static calculateTripTypeDistribution(
    reviews: Array<{ tripType?: string | null }>,
  ): TripTypeCounts {
    const counts: TripTypeCounts = {
      familyReviews: 0,
      couplesReviews: 0,
      soloReviews: 0,
      businessReviews: 0,
      friendsReviews: 0,
    };

    reviews.forEach((review) => {
      if (!review.tripType) return;

      const tripType = review.tripType.toLowerCase();

      if (tripType.includes("family") || tripType.includes("families")) {
        counts.familyReviews++;
      } else if (tripType.includes("couple")) {
        counts.couplesReviews++;
      } else if (tripType.includes("solo") || tripType.includes("alone")) {
        counts.soloReviews++;
      } else if (tripType.includes("business")) {
        counts.businessReviews++;
      } else if (tripType.includes("friend")) {
        counts.friendsReviews++;
      }
    });

    return counts;
  }

  /**
   * Calculate average sub-ratings from reviews
   * Returns null for any sub-rating that has no data
   */
  static calculateSubRatings(
    reviews: Array<{
      subRatings?: TripAdvisorSubRatings | null;
    }>,
  ): TripAdvisorSubRatingAverages {
    const sums = {
      service: 0,
      food: 0,
      value: 0,
      atmosphere: 0,
      cleanliness: 0,
      location: 0,
      rooms: 0,
      sleepQuality: 0,
    };

    const counts = {
      service: 0,
      food: 0,
      value: 0,
      atmosphere: 0,
      cleanliness: 0,
      location: 0,
      rooms: 0,
      sleepQuality: 0,
    };

    reviews.forEach((review) => {
      if (!review.subRatings) return;

      const sr = review.subRatings;

      if (sr.service !== null && sr.service !== undefined) {
        sums.service += sr.service;
        counts.service++;
      }
      if (sr.food !== null && sr.food !== undefined) {
        sums.food += sr.food;
        counts.food++;
      }
      if (sr.value !== null && sr.value !== undefined) {
        sums.value += sr.value;
        counts.value++;
      }
      if (sr.atmosphere !== null && sr.atmosphere !== undefined) {
        sums.atmosphere += sr.atmosphere;
        counts.atmosphere++;
      }
      if (sr.cleanliness !== null && sr.cleanliness !== undefined) {
        sums.cleanliness += sr.cleanliness;
        counts.cleanliness++;
      }
      if (sr.location !== null && sr.location !== undefined) {
        sums.location += sr.location;
        counts.location++;
      }
      if (sr.rooms !== null && sr.rooms !== undefined) {
        sums.rooms += sr.rooms;
        counts.rooms++;
      }
      if (sr.sleepQuality !== null && sr.sleepQuality !== undefined) {
        sums.sleepQuality += sr.sleepQuality;
        counts.sleepQuality++;
      }
    });

    return {
      averageServiceRating:
        counts.service > 0 ? sums.service / counts.service : null,
      averageFoodRating: counts.food > 0 ? sums.food / counts.food : null,
      averageValueRating: counts.value > 0 ? sums.value / counts.value : null,
      averageAtmosphereRating:
        counts.atmosphere > 0 ? sums.atmosphere / counts.atmosphere : null,
      averageCleanlinessRating:
        counts.cleanliness > 0 ? sums.cleanliness / counts.cleanliness : null,
      averageLocationRating:
        counts.location > 0 ? sums.location / counts.location : null,
      averageRoomsRating: counts.rooms > 0 ? sums.rooms / counts.rooms : null,
      averageSleepQualityRating:
        counts.sleepQuality > 0
          ? sums.sleepQuality / counts.sleepQuality
          : null,
    };
  }

  /**
   * Calculate helpful votes metrics
   */
  static calculateHelpfulVotesMetrics(
    reviews: Array<{ helpfulVotes?: number | null }>,
  ): HelpfulVotesMetrics {
    const totalReviews = reviews.length;

    if (totalReviews === 0) {
      return {
        totalHelpfulVotes: 0,
        averageHelpfulVotes: 0,
      };
    }

    const totalHelpfulVotes = reviews.reduce(
      (sum, review) => sum + (review.helpfulVotes || 0),
      0,
    );

    return {
      totalHelpfulVotes,
      averageHelpfulVotes: totalHelpfulVotes / totalReviews,
    };
  }

  /**
   * Count reviews with photos
   */
  static countReviewsWithPhotos(
    reviews: Array<{ photoCount?: number | null }>,
  ): number {
    return reviews.filter((review) => (review.photoCount || 0) > 0).length;
  }

  /**
   * Count reviews with room tips
   */
  static countReviewsWithRoomTips(
    reviews: Array<{ roomTip?: string | null }>,
  ): number {
    return reviews.filter(
      (review) => review.roomTip && review.roomTip.trim().length > 0,
    ).length;
  }
}
