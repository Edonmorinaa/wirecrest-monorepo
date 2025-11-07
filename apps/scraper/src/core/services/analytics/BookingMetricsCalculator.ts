/**
 * Booking.com Metrics Calculator
 * Handles Booking.com-specific metrics: 1-10 ratings, sub-ratings, guest types, stay metrics
 * CRITICAL: Booking uses 1-10 scale but converts to 1-5 for histogram (by rounding)
 */

export interface RatingDistribution {
  [key: string]: number; // "1" through "5"
}

export interface BookingSubRatings {
  cleanlinessRating?: number | null;
  comfortRating?: number | null;
  locationRating?: number | null;
  facilitiesRating?: number | null;
  staffRating?: number | null;
  valueForMoneyRating?: number | null;
  wifiRating?: number | null;
}

export interface BookingSubRatingAverages {
  averageCleanlinessRating: number | null;
  averageComfortRating: number | null;
  averageLocationRating: number | null;
  averageFacilitiesRating: number | null;
  averageStaffRating: number | null;
  averageValueForMoneyRating: number | null;
  averageWifiRating: number | null;
}

export interface GuestTypeCounts {
  soloTravelers: number;
  couples: number;
  familiesWithYoungChildren: number;
  familiesWithOlderChildren: number;
  groupsOfFriends: number;
  businessTravelers: number;
}

export interface StayLengthMetrics {
  averageLengthOfStay: number | null;
  shortStays: number; // < 3 nights
  mediumStays: number; // 3-7 nights
  longStays: number; // > 7 nights
}

export class BookingMetricsCalculator {
  /**
   * Build rating distribution from 1-10 scale ratings
   * Converts to 1-5 scale by rounding (matching legacy behavior)
   *
   * Example: 8.5 → rounds to 9 → bucket 5 (since 9-10 maps to 5)
   * Legacy formula: Math.max(1, Math.min(5, Math.round(rating)))
   */
  static buildRatingDistribution10To5Scale(
    ratings: number[],
  ): RatingDistribution {
    const distribution: RatingDistribution = {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
    };

    ratings.forEach((rating) => {
      // Round the 1-10 rating and clamp to 1-5 range
      const rounded = Math.max(1, Math.min(5, Math.round(rating)));
      distribution[rounded.toString()]++;
    });

    return distribution;
  }

  /**
   * Calculate average rating (on original 1-10 scale)
   * Does NOT convert to 1-5 - keeps the 1-10 scale
   */
  static calculateAverageRating10Scale(ratings: number[]): number | null {
    if (ratings.length === 0) return null;
    const sum = ratings.reduce((acc, rating) => acc + rating, 0);
    return sum / ratings.length;
  }

  /**
   * Calculate average sub-ratings (all on 1-10 scale)
   */
  static calculateSubRatings(
    reviews: Array<{ subRatings?: BookingSubRatings | null }>,
  ): BookingSubRatingAverages {
    const sums = {
      cleanliness: 0,
      comfort: 0,
      location: 0,
      facilities: 0,
      staff: 0,
      valueForMoney: 0,
      wifi: 0,
    };

    const counts = {
      cleanliness: 0,
      comfort: 0,
      location: 0,
      facilities: 0,
      staff: 0,
      valueForMoney: 0,
      wifi: 0,
    };

    reviews.forEach((review) => {
      if (!review.subRatings) return;

      const sr = review.subRatings;

      if (sr.cleanlinessRating !== null && sr.cleanlinessRating !== undefined) {
        sums.cleanliness += sr.cleanlinessRating;
        counts.cleanliness++;
      }
      if (sr.comfortRating !== null && sr.comfortRating !== undefined) {
        sums.comfort += sr.comfortRating;
        counts.comfort++;
      }
      if (sr.locationRating !== null && sr.locationRating !== undefined) {
        sums.location += sr.locationRating;
        counts.location++;
      }
      if (sr.facilitiesRating !== null && sr.facilitiesRating !== undefined) {
        sums.facilities += sr.facilitiesRating;
        counts.facilities++;
      }
      if (sr.staffRating !== null && sr.staffRating !== undefined) {
        sums.staff += sr.staffRating;
        counts.staff++;
      }
      if (
        sr.valueForMoneyRating !== null &&
        sr.valueForMoneyRating !== undefined
      ) {
        sums.valueForMoney += sr.valueForMoneyRating;
        counts.valueForMoney++;
      }
      if (sr.wifiRating !== null && sr.wifiRating !== undefined) {
        sums.wifi += sr.wifiRating;
        counts.wifi++;
      }
    });

    return {
      averageCleanlinessRating:
        counts.cleanliness > 0 ? sums.cleanliness / counts.cleanliness : null,
      averageComfortRating:
        counts.comfort > 0 ? sums.comfort / counts.comfort : null,
      averageLocationRating:
        counts.location > 0 ? sums.location / counts.location : null,
      averageFacilitiesRating:
        counts.facilities > 0 ? sums.facilities / counts.facilities : null,
      averageStaffRating: counts.staff > 0 ? sums.staff / counts.staff : null,
      averageValueForMoneyRating:
        counts.valueForMoney > 0
          ? sums.valueForMoney / counts.valueForMoney
          : null,
      averageWifiRating: counts.wifi > 0 ? sums.wifi / counts.wifi : null,
    };
  }

  /**
   * Calculate guest type distribution
   * Maps various guest type strings to standard categories
   */
  static calculateGuestTypeDistribution(
    reviews: Array<{ guestType: string }>,
  ): GuestTypeCounts {
    const counts: GuestTypeCounts = {
      soloTravelers: 0,
      couples: 0,
      familiesWithYoungChildren: 0,
      familiesWithOlderChildren: 0,
      groupsOfFriends: 0,
      businessTravelers: 0,
    };

    reviews.forEach((review) => {
      const guestType = review.guestType.toUpperCase();

      switch (guestType) {
        case "SOLO":
        case "SOLO_TRAVELER":
          counts.soloTravelers++;
          break;
        case "COUPLE":
        case "COUPLES":
          counts.couples++;
          break;
        case "FAMILY_WITH_YOUNG_CHILDREN":
        case "FAMILY_YOUNG":
          counts.familiesWithYoungChildren++;
          break;
        case "FAMILY_WITH_OLDER_CHILDREN":
        case "FAMILY_OLDER":
          counts.familiesWithOlderChildren++;
          break;
        case "GROUP_OF_FRIENDS":
        case "GROUP":
        case "FRIENDS":
          counts.groupsOfFriends++;
          break;
        case "BUSINESS":
        case "BUSINESS_TRAVELER":
          counts.businessTravelers++;
          break;
      }
    });

    return counts;
  }

  /**
   * Calculate stay length metrics
   * Short: < 3 nights, Medium: 3-7 nights, Long: > 7 nights
   */
  static calculateStayLengthMetrics(
    reviews: Array<{ lengthOfStay?: number | null }>,
  ): StayLengthMetrics {
    const stayLengths = reviews
      .map((r) => r.lengthOfStay)
      .filter(
        (length): length is number => length !== null && length !== undefined,
      );

    if (stayLengths.length === 0) {
      return {
        averageLengthOfStay: null,
        shortStays: 0,
        mediumStays: 0,
        longStays: 0,
      };
    }

    const totalNights = stayLengths.reduce((sum, length) => sum + length, 0);
    const averageLengthOfStay = totalNights / stayLengths.length;

    const shortStays = stayLengths.filter((length) => length < 3).length;
    const mediumStays = stayLengths.filter(
      (length) => length >= 3 && length <= 7,
    ).length;
    const longStays = stayLengths.filter((length) => length > 7).length;

    return {
      averageLengthOfStay,
      shortStays,
      mediumStays,
      longStays,
    };
  }

  /**
   * Build sentiment from 1-10 ratings
   * Positive: 8-10, Neutral: 5-7, Negative: 1-4
   */
  static buildSentimentFromRatings10Scale(ratings: number[]): {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  } {
    let positive = 0;
    let neutral = 0;
    let negative = 0;

    ratings.forEach((rating) => {
      if (rating >= 8) {
        positive++;
      } else if (rating >= 5 && rating < 8) {
        neutral++;
      } else if (rating >= 1 && rating < 5) {
        negative++;
      }
    });

    return {
      positive,
      neutral,
      negative,
      total: ratings.length,
    };
  }

  /**
   * Get top nationalities from reviews
   */
  static getTopNationalities(
    reviews: Array<{ reviewerNationality?: string | null }>,
    limit: number = 10,
  ): string[] {
    const nationalityCounts = new Map<string, number>();

    reviews.forEach((review) => {
      if (review.reviewerNationality) {
        const nationality = review.reviewerNationality.trim();
        nationalityCounts.set(
          nationality,
          (nationalityCounts.get(nationality) || 0) + 1,
        );
      }
    });

    return Array.from(nationalityCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([nationality]) => nationality);
  }

  /**
   * Get most popular room types
   */
  static getMostPopularRoomTypes(
    reviews: Array<{ roomType?: string | null }>,
    limit: number = 10,
  ): string[] {
    const roomTypeCounts = new Map<string, number>();

    reviews.forEach((review) => {
      if (review.roomType) {
        const roomType = review.roomType.trim();
        roomTypeCounts.set(roomType, (roomTypeCounts.get(roomType) || 0) + 1);
      }
    });

    return Array.from(roomTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([roomType]) => roomType);
  }
}
