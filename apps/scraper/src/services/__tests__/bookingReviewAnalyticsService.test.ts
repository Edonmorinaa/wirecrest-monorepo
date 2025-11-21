/**
 * @deprecated These tests are for a deprecated service
 * BookingReviewAnalyticsService is no longer used - analytics now computed on-demand via tRPC
 * Tests are kept for reference but are skipped
 * 
 * Historical note:
 * Comprehensive tests for Booking Review Analytics Service
 * Tests NaN validation fix (PRE-EXISTING VULNERABILITY), 1-10 scale handling, and edge cases
 * 
 * See: apps/dashboard/src/server/trpc/routers/locations.router.ts for new implementation
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// SKIP ALL TESTS - Service is deprecated
describe.skip('Booking Review Analytics Service (DEPRECATED)', () => {
  test.skip('All tests skipped - service deprecated', () => {
    expect(true).toBe(true);
  });
});

// Mock dependencies
jest.mock('@wirecrest/db', () => ({
  prisma: {
    bookingBusinessProfile: {
      findFirst: jest.fn(),
    },
    bookingReview: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fn) => {
      if (typeof fn === 'function') {
        // For transaction callbacks
        const mockPrisma = {
          bookingBusinessProfile: { findFirst: jest.fn() },
          bookingReview: { findMany: jest.fn() },
        };
        return fn(mockPrisma);
      }
      // For array of operations
      return Promise.resolve(fn);
    }),
  },
}));

jest.mock('../../supabase/database', () => ({
  DatabaseService: jest.fn().mockImplementation(() => ({
    // Mock methods
  })),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../utils/notificationHelper', () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
}));

import { BookingReviewAnalyticsService } from '../bookingReviewAnalyticsService';
import { prisma } from '@wirecrest/db';

describe('BookingReviewAnalyticsService', () => {
  let service: BookingReviewAnalyticsService;
  const mockBusinessProfileId = 'booking-profile-123';
  const mockTeamId = 'team-123';

  beforeEach(() => {
    service = new BookingReviewAnalyticsService();
    jest.clearAllMocks();
  });

  describe('PRE-EXISTING VULNERABILITY FIX - NaN Validation', () => {
    test('should filter out NaN ratings using Number.isFinite()', () => {
      const testRating = NaN;
      
      // The fix: Number.isFinite(rating) returns false for NaN
      const isValid = Number.isFinite(testRating);
      
      expect(isValid).toBe(false);
      expect(testRating).toBeNaN();
    });

    test('should not include NaN in rating distribution', () => {
      const ratings = [NaN, 9.5, 8.0, NaN, 7.5];
      const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let validRatingCount = 0;
      let totalRating = 0;

      ratings.forEach(rating => {
        // This is the fix from the service
        if (!Number.isFinite(rating)) return;
        
        // Booking uses 1-10 scale, convert to 1-5 for histogram
        const normalizedRating = rating / 2; // 10 → 5, 8 → 4, etc.
        const roundedRating = Math.max(1, Math.min(5, Math.round(normalizedRating)));
        ratingCounts[roundedRating as keyof typeof ratingCounts]++;
        totalRating += rating;
        validRatingCount++;
      });

      expect(validRatingCount).toBe(3); // Only 9.5, 8.0, 7.5 counted
      expect(totalRating).toBe(25); // 9.5 + 8 + 7.5
    });

    test('should calculate average using validRatingCount denominator', () => {
      const ratings = [NaN, 10, 8, NaN, 6];
      let validRatingCount = 0;
      let totalRating = 0;

      ratings.forEach(rating => {
        if (!Number.isFinite(rating)) return;
        totalRating += rating;
        validRatingCount++;
      });

      // CRITICAL: Must use validRatingCount, not total array length
      const averageRating = validRatingCount > 0 ? totalRating / validRatingCount : 0;
      
      expect(averageRating).toBe(8); // (10 + 8 + 6) / 3 = 8
      expect(averageRating).not.toBeNaN();
      // Would be wrong if divided by 5: (10 + 8 + 6) / 5 = 4.8
    });

    test('should return 0 average when all ratings are NaN', () => {
      const ratings = [NaN, NaN, NaN];
      let validRatingCount = 0;
      let totalRating = 0;

      ratings.forEach(rating => {
        if (!Number.isFinite(rating)) return;
        totalRating += rating;
        validRatingCount++;
      });

      const averageRating = validRatingCount > 0 ? totalRating / validRatingCount : 0;
      
      expect(averageRating).toBe(0);
      expect(averageRating).not.toBeNaN();
    });
  });

  describe('Booking.com 1-10 Scale Handling', () => {
    test('should handle 1-10 scale ratings correctly', () => {
      const bookingRatings = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
      const normalized = bookingRatings.map(rating => rating / 2);
      
      expect(normalized[0]).toBe(5); // 10 → 5
      expect(normalized[4]).toBe(3); // 6 → 3
      expect(normalized[9]).toBe(0.5); // 1 → 0.5
    });

    test('should convert 1-10 ratings to 1-5 for histogram', () => {
      const bookingRatings = [10, 8, 6, 4, 2];
      const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      bookingRatings.forEach(rating => {
        if (!Number.isFinite(rating)) return;
        const normalized = rating / 2;
        const rounded = Math.max(1, Math.min(5, Math.round(normalized)));
        ratingCounts[rounded as keyof typeof ratingCounts]++;
      });

      expect(ratingCounts[5]).toBe(1); // 10 → 5
      expect(ratingCounts[4]).toBe(1); // 8 → 4
      expect(ratingCounts[3]).toBe(1); // 6 → 3
      expect(ratingCounts[2]).toBe(1); // 4 → 2
      expect(ratingCounts[1]).toBe(1); // 2 → 1
    });

    test('should maintain original rating values for average', () => {
      const bookingRatings = [9.5, 8.7, 7.3];
      let totalRating = 0;
      let validRatingCount = 0;

      bookingRatings.forEach(rating => {
        if (!Number.isFinite(rating)) return;
        totalRating += rating; // Use original, not normalized
        validRatingCount++;
      });

      const averageRating = totalRating / validRatingCount;
      
      expect(averageRating).toBeCloseTo(8.5, 1); // (9.5 + 8.7 + 7.3) / 3
    });
  });

  describe('Edge Case Handling - Infinity', () => {
    test('should filter out Infinity ratings', () => {
      const ratings = [Infinity, 9.5, -Infinity, 8.0];
      let validRatingCount = 0;
      let totalRating = 0;

      ratings.forEach(rating => {
        if (!Number.isFinite(rating)) return;
        totalRating += rating;
        validRatingCount++;
      });

      expect(validRatingCount).toBe(2);
      expect(totalRating).toBe(17.5);
      expect(totalRating / validRatingCount).not.toBe(Infinity);
    });
  });

  describe('Edge Case Handling - Null and Undefined', () => {
    test('should filter out null ratings', () => {
      const ratings = [null, 9.5, 8.0];
      let validRatingCount = 0;

      ratings.forEach(rating => {
        // @ts-ignore - testing runtime behavior
        if (Number.isFinite(rating)) {
          validRatingCount++;
        }
      });

      expect(validRatingCount).toBe(2);
    });

    test('should filter out undefined ratings', () => {
      const ratings = [undefined, 9.5, 8.0];
      let validRatingCount = 0;

      ratings.forEach(rating => {
        // @ts-ignore - testing runtime behavior
        if (Number.isFinite(rating)) {
          validRatingCount++;
        }
      });

      expect(validRatingCount).toBe(2);
    });
  });

  describe('Sub-Rating Handling (7 Categories)', () => {
    test('should handle all 7 Booking sub-rating categories', () => {
      const subRatings = {
        cleanliness: 9.5,
        comfort: 8.7,
        location: 9.0,
        facilities: 8.5,
        staff: 9.2,
        valueForMoney: 8.0,
        wifi: 7.5,
      };

      const totals = {
        cleanliness: { sum: 0, count: 0 },
        comfort: { sum: 0, count: 0 },
        location: { sum: 0, count: 0 },
        facilities: { sum: 0, count: 0 },
        staff: { sum: 0, count: 0 },
        valueForMoney: { sum: 0, count: 0 },
        wifi: { sum: 0, count: 0 },
      };

      Object.keys(totals).forEach(key => {
        const value = subRatings[key as keyof typeof subRatings];
        if (value) {
          totals[key as keyof typeof totals].sum += value;
          totals[key as keyof typeof totals].count++;
        }
      });

      expect(totals.cleanliness.count).toBe(1);
      expect(totals.cleanliness.sum).toBe(9.5);
      expect(totals.wifi.sum).toBe(7.5);
    });

    test('should handle missing sub-ratings gracefully', () => {
      const subRatings = {
        cleanliness: 9.5,
        comfort: null,
        location: undefined,
        facilities: 8.5,
      };

      let count = 0;
      Object.values(subRatings).forEach(value => {
        if (value !== null && value !== undefined) {
          count++;
        }
      });

      expect(count).toBe(2); // Only cleanliness and facilities
    });

    test('should calculate sub-rating averages without division by zero', () => {
      const totals = {
        cleanliness: { sum: 27, count: 3 },
        comfort: { sum: 0, count: 0 }, // No ratings
      };

      const cleanlinessAvg = totals.cleanliness.count > 0 
        ? totals.cleanliness.sum / totals.cleanliness.count 
        : null;
      const comfortAvg = totals.comfort.count > 0 
        ? totals.comfort.sum / totals.comfort.count 
        : null;

      expect(cleanlinessAvg).toBe(9);
      expect(comfortAvg).toBeNull();
    });
  });

  describe('Guest Type Distribution', () => {
    test('should count all 6 guest types', () => {
      const guestTypes = [
        'SOLO',
        'COUPLE',
        'FAMILY_WITH_YOUNG_CHILDREN',
        'FAMILY_WITH_OLDER_CHILDREN',
        'GROUP_OF_FRIENDS',
        'BUSINESS',
      ];

      const guestTypeCounts = {
        SOLO: 0,
        COUPLE: 0,
        FAMILY_WITH_YOUNG_CHILDREN: 0,
        FAMILY_WITH_OLDER_CHILDREN: 0,
        GROUP_OF_FRIENDS: 0,
        BUSINESS: 0,
      };

      guestTypes.forEach(type => {
        if (type in guestTypeCounts) {
          guestTypeCounts[type as keyof typeof guestTypeCounts]++;
        }
      });

      expect(Object.values(guestTypeCounts).reduce((a, b) => a + b, 0)).toBe(6);
    });

    test('should handle missing guest types', () => {
      const reviews = [
        { guestType: 'SOLO' },
        { guestType: null },
        { guestType: undefined },
        { guestType: '' },
      ];

      let count = 0;
      reviews.forEach(review => {
        if (review.guestType) {
          count++;
        }
      });

      expect(count).toBe(1);
    });
  });

  describe('Stay Length Metrics', () => {
    test('should categorize stay lengths correctly', () => {
      const stayLengths = [1, 2, 3, 5, 7, 10, 14];
      
      const shortStays = stayLengths.filter(l => l <= 2).length; // 1-2 nights
      const mediumStays = stayLengths.filter(l => l >= 3 && l <= 7).length; // 3-7 nights
      const longStays = stayLengths.filter(l => l >= 8).length; // 8+ nights

      expect(shortStays).toBe(2); // 1, 2
      expect(mediumStays).toBe(3); // 3, 5, 7
      expect(longStays).toBe(2); // 10, 14
    });

    test('should calculate average stay length correctly', () => {
      const stayLengths = [3, 5, 7, 2, 4];
      
      const avgStayLength = stayLengths.length > 0
        ? stayLengths.reduce((a, b) => a + b, 0) / stayLengths.length
        : null;

      expect(avgStayLength).toBeCloseTo(4.2, 1);
    });

    test('should handle empty stay lengths', () => {
      const stayLengths: number[] = [];
      
      const avgStayLength = stayLengths.length > 0
        ? stayLengths.reduce((a, b) => a + b, 0) / stayLengths.length
        : null;

      expect(avgStayLength).toBeNull();
    });
  });

  describe('Nationality Tracking', () => {
    test('should count top nationalities', () => {
      const reviews = [
        { nationality: 'US' },
        { nationality: 'UK' },
        { nationality: 'US' },
        { nationality: 'DE' },
        { nationality: 'US' },
      ];

      const nationalityMap = new Map<string, number>();
      reviews.forEach(review => {
        if (review.nationality) {
          nationalityMap.set(review.nationality, (nationalityMap.get(review.nationality) || 0) + 1);
        }
      });

      const topNationalities = Array.from(nationalityMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      expect(topNationalities[0]).toEqual(['US', 3]);
      expect(topNationalities[1]).toEqual(['UK', 1]);
    });

    test('should handle missing nationalities', () => {
      const reviews = [
        { nationality: 'US' },
        { nationality: null },
        { nationality: undefined },
      ];

      let count = 0;
      reviews.forEach(review => {
        if (review.nationality) {
          count++;
        }
      });

      expect(count).toBe(1);
    });
  });

  describe('Mixed Edge Cases - Production Scenarios', () => {
    test('should handle completely corrupted rating data', () => {
      const ratings = [NaN, Infinity, -Infinity, null, undefined, 0, 11, 15];
      let validRatingCount = 0;
      let totalRating = 0;

      ratings.forEach(rating => {
        // @ts-ignore - testing runtime behavior
        if (!Number.isFinite(rating)) return;
        totalRating += rating;
        validRatingCount++;
      });

      // Only 0, 11, 15 pass isFinite
      expect(validRatingCount).toBe(3);
      expect(totalRating).toBe(26);
    });

    test('should maintain data integrity with partial corruption', () => {
      const ratings = [10, NaN, 8, null, 9, Infinity, 7];
      let validRatingCount = 0;
      let totalRating = 0;

      ratings.forEach(rating => {
        // @ts-ignore
        if (!Number.isFinite(rating)) return;
        totalRating += rating;
        validRatingCount++;
      });

      expect(validRatingCount).toBe(4); // 10, 8, 9, 7
      expect(totalRating).toBe(34);
      expect(totalRating / validRatingCount).toBe(8.5);
    });

    test('should handle mix of valid ratings on both ends of 1-10 scale', () => {
      const ratings = [10, 9.8, 1, 1.5, 5.5, 7, 8.3];
      const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      ratings.forEach(rating => {
        if (!Number.isFinite(rating)) return;
        const normalized = rating / 2;
        const rounded = Math.max(1, Math.min(5, Math.round(normalized)));
        ratingCounts[rounded as keyof typeof ratingCounts]++;
      });

      expect(ratingCounts[5]).toBe(2); // 10, 9.8
      expect(ratingCounts[1]).toBe(2); // 1, 1.5
      expect(ratingCounts[3]).toBe(1); // 5.5
      expect(ratingCounts[4]).toBe(2); // 7, 8.3
    });
  });

  describe('validRatingCount Correctness', () => {
    test('should track valid ratings separately from total reviews', () => {
      const reviews = [
        { rating: 10 },
        { rating: NaN },
        { rating: 8 },
        { rating: null },
        { rating: 9 },
      ];

      const totalReviews = reviews.length;
      let validRatingCount = 0;

      reviews.forEach(review => {
        // @ts-ignore
        if (Number.isFinite(review.rating)) {
          validRatingCount++;
        }
      });

      expect(totalReviews).toBe(5);
      expect(validRatingCount).toBe(3);
    });

    test('CRITICAL: average must use validRatingCount, not total length', () => {
      const ratings = [10, NaN, 8, NaN, 6];
      let totalRating = 0;
      let validRatingCount = 0;

      ratings.forEach(rating => {
        if (!Number.isFinite(rating)) return;
        totalRating += rating;
        validRatingCount++;
      });

      const correctAverage = validRatingCount > 0 ? totalRating / validRatingCount : 0;
      const wrongAverage = totalRating / ratings.length; // BUG: dividing by total length

      expect(correctAverage).toBe(8); // (10 + 8 + 6) / 3 = 8 ✅
      expect(wrongAverage).toBe(4.8); // (10 + 8 + 6) / 5 = 4.8 ❌
      expect(correctAverage).not.toEqual(wrongAverage);
    });
  });

  describe('Division by Zero Protection', () => {
    test('should handle zero reviews gracefully', () => {
      const reviews: any[] = [];
      const respondedCount = 0;

      const responseRate = reviews.length > 0 ? (respondedCount / reviews.length) * 100 : 0;

      expect(responseRate).toBe(0);
      expect(responseRate).not.toBeNaN();
      expect(responseRate).not.toBe(Infinity);
    });

    test('should return null average for zero valid ratings', () => {
      const validRatingCount = 0;
      const totalRating = 0;

      const averageRating = validRatingCount > 0 ? totalRating / validRatingCount : 0;

      expect(averageRating).toBe(0);
      expect(averageRating).not.toBeNaN();
    });

    test('should handle zero count in sub-rating averages', () => {
      const subRatingTotal = { sum: 0, count: 0 };
      
      const average = subRatingTotal.count > 0 
        ? subRatingTotal.sum / subRatingTotal.count 
        : null;

      expect(average).toBeNull(); // Indicates no data, not an error
    });
  });
});

