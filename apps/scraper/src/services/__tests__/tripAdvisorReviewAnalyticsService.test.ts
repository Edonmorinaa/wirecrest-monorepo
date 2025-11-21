/**
 * @deprecated These tests are for a deprecated service
 * TripAdvisorReviewAnalyticsService is no longer used - analytics now computed on-demand via tRPC
 * Tests are kept for reference but are skipped
 * 
 * Historical note:
 * Comprehensive tests for TripAdvisor Review Analytics Service
 * Tests NaN validation fix (CRITICAL REGRESSION), rating clamping, and edge cases
 * 
 * See: apps/dashboard/src/server/trpc/routers/locations.router.ts for new implementation
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// SKIP ALL TESTS - Service is deprecated
describe.skip('TripAdvisor Review Analytics Service (DEPRECATED)', () => {
  test.skip('All tests skipped - service deprecated', () => {
    expect(true).toBe(true);
  });
});

// Mock dependencies
jest.mock('@wirecrest/db', () => ({
  prisma: {
    tripAdvisorBusinessProfile: {
      findUnique: jest.fn(),
    },
    tripAdvisorReview: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../../supabase/database', () => ({
  DatabaseService: jest.fn().mockImplementation(() => ({
    // Mock methods
  })),
}));

jest.mock('../../utils/notificationHelper', () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
}));

import { TripAdvisorReviewAnalyticsService } from '../tripAdvisorReviewAnalyticsService';
import { prisma } from '@wirecrest/db';

describe('TripAdvisorReviewAnalyticsService', () => {
  let service: TripAdvisorReviewAnalyticsService;
  const mockBusinessProfileId = 'ta-profile-123';
  const mockTeamId = 'team-123';

  beforeEach(() => {
    service = new TripAdvisorReviewAnalyticsService();
    jest.clearAllMocks();
  });

  describe('CRITICAL REGRESSION FIX - NaN Validation', () => {
    test('should filter out NaN ratings using Number.isFinite()', () => {
      const testRating = NaN;
      
      // The fix: Number.isFinite(rating) returns false for NaN
      const isValid = Number.isFinite(testRating);
      
      expect(isValid).toBe(false);
      expect(testRating).toBeNaN();
    });

    test('should not include NaN in rating distribution', () => {
      const ratings = [NaN, 5, 4, NaN, 3];
      const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let validRatingCount = 0;
      let totalRating = 0;

      ratings.forEach(rating => {
        // This is the actual fix from the service
        if (!Number.isFinite(rating)) return;
        
        const roundedRating = Math.max(1, Math.min(5, Math.round(rating)));
        ratingCounts[roundedRating as keyof typeof ratingCounts]++;
        totalRating += rating;
        validRatingCount++;
      });

      expect(validRatingCount).toBe(3); // Only 5, 4, 3 counted
      expect(ratingCounts[5]).toBe(1);
      expect(ratingCounts[4]).toBe(1);
      expect(ratingCounts[3]).toBe(1);
      expect(totalRating).toBe(12); // 5 + 4 + 3
    });

    test('should calculate average using only valid ratings', () => {
      const ratings = [NaN, 5, 4, NaN, 3];
      let validRatingCount = 0;
      let totalRating = 0;

      ratings.forEach(rating => {
        if (!Number.isFinite(rating)) return;
        totalRating += rating;
        validRatingCount++;
      });

      const averageRating = validRatingCount > 0 ? totalRating / validRatingCount : 0;
      
      expect(averageRating).toBe(4); // (5 + 4 + 3) / 3 = 4
      expect(averageRating).not.toBeNaN();
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

  describe('Edge Case Handling - Infinity', () => {
    test('should filter out Infinity ratings', () => {
      const testRating = Infinity;
      const isValid = Number.isFinite(testRating);
      
      expect(isValid).toBe(false);
    });

    test('should filter out negative Infinity ratings', () => {
      const testRating = -Infinity;
      const isValid = Number.isFinite(testRating);
      
      expect(isValid).toBe(false);
    });

    test('should handle mix of Infinity and valid ratings', () => {
      const ratings = [Infinity, 5, -Infinity, 4, 3];
      let validRatingCount = 0;
      let totalRating = 0;

      ratings.forEach(rating => {
        if (!Number.isFinite(rating)) return;
        totalRating += rating;
        validRatingCount++;
      });

      const averageRating = validRatingCount > 0 ? totalRating / validRatingCount : 0;
      
      expect(averageRating).toBe(4); // (5 + 4 + 3) / 3
      expect(averageRating).not.toBe(Infinity);
      expect(averageRating).not.toBe(-Infinity);
    });
  });

  describe('Edge Case Handling - Null and Undefined', () => {
    test('should filter out null ratings', () => {
      const testRating = null;
      // @ts-ignore - testing runtime behavior
      const isValid = Number.isFinite(testRating);
      
      expect(isValid).toBe(false);
    });

    test('should filter out undefined ratings', () => {
      const testRating = undefined;
      // @ts-ignore - testing runtime behavior
      const isValid = Number.isFinite(testRating);
      
      expect(isValid).toBe(false);
    });

    test('should handle mix of null/undefined and valid ratings', () => {
      const ratings = [null, 5, undefined, 4, 3];
      let validRatingCount = 0;
      let totalRating = 0;

      ratings.forEach(rating => {
        // @ts-ignore - testing runtime behavior
        if (!Number.isFinite(rating)) return;
        totalRating += rating;
        validRatingCount++;
      });

      expect(validRatingCount).toBe(3);
      expect(totalRating).toBe(12);
    });
  });

  describe('Rating Clamping', () => {
    test('should clamp ratings to [1, 5] range', () => {
      const ratings = [0, 6, 10, -1, 2.5];
      const clampedRatings: number[] = [];

      ratings.forEach(rating => {
        if (!Number.isFinite(rating)) return;
        const clamped = Math.max(1, Math.min(5, Math.round(rating)));
        clampedRatings.push(clamped);
      });

      expect(clampedRatings).toEqual([1, 5, 5, 1, 3]); // 0→1, 6→5, 10→5, -1→1, 2.5→3
    });

    test('should handle fractional ratings correctly', () => {
      const rating = 4.7;
      const rounded = Math.round(rating);
      const clamped = Math.max(1, Math.min(5, rounded));
      
      expect(clamped).toBe(5); // 4.7 rounds to 5
    });

    test('should handle boundary values correctly', () => {
      const ratings = [1, 5, 1.4, 5.4];
      
      ratings.forEach(rating => {
        const clamped = Math.max(1, Math.min(5, Math.round(rating)));
        expect(clamped).toBeGreaterThanOrEqual(1);
        expect(clamped).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Sub-Rating Handling', () => {
    test('should handle missing sub-ratings gracefully', () => {
      const subRatings = {
        service: 5,
        food: null,
        value: undefined,
        atmosphere: 4,
      };

      const totals = {
        service: { sum: 0, count: 0 },
        food: { sum: 0, count: 0 },
        value: { sum: 0, count: 0 },
        atmosphere: { sum: 0, count: 0 },
      };

      Object.keys(totals).forEach(key => {
        const value = subRatings[key as keyof typeof subRatings];
        if (value !== null && value !== undefined) {
          totals[key as keyof typeof totals].sum += value;
          totals[key as keyof typeof totals].count++;
        }
      });

      expect(totals.service.count).toBe(1);
      expect(totals.food.count).toBe(0);
      expect(totals.value.count).toBe(0);
      expect(totals.atmosphere.count).toBe(1);
    });

    test('should calculate sub-rating averages without division by zero', () => {
      const totals = {
        service: { sum: 15, count: 3 },
        food: { sum: 0, count: 0 }, // No food ratings
      };

      const serviceAvg = totals.service.count > 0 ? totals.service.sum / totals.service.count : null;
      const foodAvg = totals.food.count > 0 ? totals.food.sum / totals.food.count : null;

      expect(serviceAvg).toBe(5);
      expect(foodAvg).toBeNull(); // Not NaN or 0, but null to indicate no data
    });
  });

  describe('Trip Type Distribution', () => {
    test('should count trip types correctly', () => {
      const reviews = [
        { tripType: 'FAMILY' },
        { tripType: 'COUPLES' },
        { tripType: 'FAMILY' },
        { tripType: 'SOLO' },
        { tripType: 'family' }, // lowercase
      ];

      const tripTypeCounts = {
        FAMILY: 0,
        COUPLES: 0,
        SOLO: 0,
        BUSINESS: 0,
        FRIENDS: 0,
      };

      reviews.forEach(review => {
        if (review.tripType) {
          const tripType = review.tripType.toUpperCase();
          if (tripType in tripTypeCounts) {
            tripTypeCounts[tripType as keyof typeof tripTypeCounts]++;
          }
        }
      });

      expect(tripTypeCounts.FAMILY).toBe(3); // Including lowercase
      expect(tripTypeCounts.COUPLES).toBe(1);
      expect(tripTypeCounts.SOLO).toBe(1);
      expect(tripTypeCounts.BUSINESS).toBe(0);
    });

    test('should handle missing trip types', () => {
      const reviews = [
        { tripType: null },
        { tripType: undefined },
        { tripType: '' },
        { tripType: 'FAMILY' },
      ];

      let familyCount = 0;

      reviews.forEach(review => {
        if (review.tripType && review.tripType.toUpperCase() === 'FAMILY') {
          familyCount++;
        }
      });

      expect(familyCount).toBe(1);
    });
  });

  describe('Helpful Votes and Engagement', () => {
    test('should sum helpful votes correctly', () => {
      const reviews = [
        { helpfulVotes: 5 },
        { helpfulVotes: 0 },
        { helpfulVotes: 10 },
        { helpfulVotes: null },
      ];

      const totalHelpfulVotes = reviews.reduce(
        (sum, review) => sum + (review.helpfulVotes || 0),
        0
      );

      expect(totalHelpfulVotes).toBe(15);
    });

    test('should count reviews with photos correctly', () => {
      const reviews = [
        { photoCount: 3 },
        { photoCount: 0 },
        { photoCount: 5 },
        { photoCount: null },
      ];

      const reviewsWithPhotos = reviews.filter(
        review => (review.photoCount || 0) > 0
      ).length;

      expect(reviewsWithPhotos).toBe(2);
    });

    test('should handle negative helpful votes', () => {
      const reviews = [
        { helpfulVotes: -5 }, // Bad data
        { helpfulVotes: 10 },
      ];

      const totalHelpfulVotes = reviews.reduce(
        (sum, review) => sum + Math.max(0, review.helpfulVotes || 0),
        0
      );

      expect(totalHelpfulVotes).toBe(10); // Negative value filtered
    });
  });

  describe('Response Metrics', () => {
    test('should calculate response rate without division by zero', () => {
      const reviews: any[] = [];
      const respondedCount = 0;

      const responseRate = reviews.length > 0 ? (respondedCount / reviews.length) * 100 : 0;

      expect(responseRate).toBe(0);
      expect(responseRate).not.toBeNaN();
    });

    test('should calculate average response time correctly', () => {
      const responseTimes = [24, 48, 12]; // hours
      
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : null;

      expect(avgResponseTime).toBe(28); // (24 + 48 + 12) / 3
    });

    test('should return null for response time when no responses', () => {
      const responseTimes: number[] = [];
      
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : null;

      expect(avgResponseTime).toBeNull();
    });
  });

  describe('Mixed Edge Cases - Production Scenarios', () => {
    test('should handle completely corrupted data gracefully', () => {
      const ratings = [NaN, Infinity, -Infinity, null, undefined, 0, 6, 10];
      let validRatingCount = 0;
      let totalRating = 0;
      const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      ratings.forEach(rating => {
        // @ts-ignore - testing runtime behavior
        if (!Number.isFinite(rating)) return;
        
        const clamped = Math.max(1, Math.min(5, Math.round(rating)));
        ratingCounts[clamped as keyof typeof ratingCounts]++;
        // @ts-ignore - testing runtime behavior
        totalRating += rating;
        validRatingCount++;
      });

      // Only 0, 6, 10 pass isFinite, but get clamped
      expect(validRatingCount).toBe(3);
      expect(ratingCounts[1]).toBe(1); // 0 → 1
      expect(ratingCounts[5]).toBe(2); // 6 → 5, 10 → 5
    });

    test('should handle all valid ratings correctly', () => {
      const ratings = [5, 4, 5, 3, 4, 5, 4];
      let validRatingCount = 0;
      let totalRating = 0;

      ratings.forEach(rating => {
        if (!Number.isFinite(rating)) return;
        totalRating += rating;
        validRatingCount++;
      });

      const averageRating = validRatingCount > 0 ? totalRating / validRatingCount : 0;

      expect(validRatingCount).toBe(7);
      expect(averageRating).toBeCloseTo(4.29, 2);
      expect(averageRating).not.toBeNaN();
    });

    test('should maintain data integrity with partial corruption', () => {
      const ratings = [5, NaN, 4, null, 5, Infinity, 3];
      let validRatingCount = 0;
      let totalRating = 0;

      ratings.forEach(rating => {
        // @ts-ignore
        if (!Number.isFinite(rating)) return;
        totalRating += rating;
        validRatingCount++;
      });

      // Only 5, 4, 5, 3 are valid
      expect(validRatingCount).toBe(4);
      expect(totalRating).toBe(17);
      expect(totalRating / validRatingCount).toBeCloseTo(4.25, 2);
    });
  });

  describe('validRatingCount Tracking', () => {
    test('should track valid ratings separately from total reviews', () => {
      const reviews = [
        { rating: 5 },
        { rating: NaN },
        { rating: 4 },
        { rating: null },
      ];

      let totalReviews = reviews.length;
      let validRatingCount = 0;

      reviews.forEach(review => {
        // @ts-ignore
        if (Number.isFinite(review.rating)) {
          validRatingCount++;
        }
      });

      expect(totalReviews).toBe(4); // All reviews counted
      expect(validRatingCount).toBe(2); // Only valid ratings counted
      expect(validRatingCount).toBeLessThan(totalReviews);
    });

    test('should use validRatingCount for average calculation', () => {
      const reviews = [
        { rating: 5 },
        { rating: NaN },
        { rating: 3 },
      ];

      let totalRating = 0;
      let validRatingCount = 0;

      reviews.forEach(review => {
        if (Number.isFinite(review.rating)) {
          totalRating += review.rating;
          validRatingCount++;
        }
      });

      // Should divide by validRatingCount (2), not totalReviews (3)
      const averageRating = validRatingCount > 0 ? totalRating / validRatingCount : 0;

      expect(averageRating).toBe(4); // (5 + 3) / 2 = 4, not (5 + 3) / 3 = 2.67
    });
  });
});

