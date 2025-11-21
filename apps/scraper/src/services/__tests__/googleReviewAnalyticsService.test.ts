/**
 * @deprecated These tests are for a deprecated service
 * GoogleReviewAnalyticsService is no longer used - analytics now computed on-demand via tRPC
 * Tests are kept for reference but are skipped
 * 
 * Historical note:
 * Comprehensive tests for Google Review Analytics Service
 * Tests calculation integrity, edge cases, and data validation
 * 
 * See: apps/dashboard/src/server/trpc/routers/locations.router.ts for new implementation
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// SKIP ALL TESTS - Service is deprecated
describe.skip('Google Review Analytics Service (DEPRECATED)', () => {
  test.skip('All tests skipped - service deprecated', () => {
    expect(true).toBe(true);
  });
});

// Mock Prisma before importing the service
jest.mock('@wirecrest/db', () => ({
  prisma: {
    googleBusinessProfile: {
      findUnique: jest.fn(),
    },
    googleReview: {
      findMany: jest.fn(),
    },
    googleOverview: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    periodicalMetric: {
      upsert: jest.fn(),
    },
  },
}));

jest.mock('../../utils/notificationHelper', () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
}));

import { GoogleReviewAnalyticsService } from '../googleReviewAnalyticsService';
import { prisma } from '@wirecrest/db';

describe('GoogleReviewAnalyticsService', () => {
  let service: GoogleReviewAnalyticsService;
  const mockBusinessProfileId = 'test-profile-123';
  const mockTeamId = 'team-123';

  beforeEach(() => {
    service = new GoogleReviewAnalyticsService();
    jest.clearAllMocks();
  });

  describe('Rating Distribution Calculation', () => {
    test('should correctly bucket 4.9 rating as 5 stars', async () => {
      // Setup
      const mockReviews = [
        {
          rating: 4.9,
          stars: 4.9,
          publishedAtDate: new Date(),
          reviewMetadata: null,
        },
      ];

      (prisma.googleBusinessProfile.findUnique as jest.Mock).mockResolvedValue({
        id: mockBusinessProfileId,
        teamId: mockTeamId,
        displayName: 'Test Business',
        formattedAddress: '123 Test St',
        websiteUri: 'https://test.com',
        businessStatus: 'OPERATIONAL',
      });

      (prisma.googleReview.findMany as jest.Mock).mockResolvedValue(mockReviews);
      (prisma.googleOverview.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.googleOverview.upsert as jest.Mock).mockResolvedValue({ id: 'overview-1' });
      (prisma.periodicalMetric.upsert as jest.Mock).mockResolvedValue({});

      // Execute
      await service.processReviewsAndUpdateDashboard(mockBusinessProfileId);

      // Verify - Check the periodicalMetric upsert calls
      const periodicalCalls = (prisma.periodicalMetric.upsert as jest.Mock).mock.calls;
      
      // Find the all-time metrics call (periodKey: 0)
      const allTimeCall = periodicalCalls.find(call => call[0].where.googleOverviewId_periodKey.periodKey === 0);
      expect(allTimeCall).toBeDefined();
      
      const ratingDistribution = allTimeCall[0].create.ratingDistribution;
      expect(ratingDistribution['5']).toBe(1);
      expect(ratingDistribution['4']).toBe(0);
    });

    test('should correctly bucket 3.5 rating as 4 stars', async () => {
      const mockReviews = [
        {
          rating: 3.5,
          stars: 3.5,
          publishedAtDate: new Date(),
          reviewMetadata: null,
        },
      ];

      (prisma.googleBusinessProfile.findUnn as jest.Mock).mockResolvedValue({
        id: mockBusinessProfileId,
        teamId: mockTeamId,
        displayName: 'Test Business',
      });
      (prisma.googleReview.findMany as jest.Mock).mockResolvedValue(mockReviews);
      (prisma.googleOverview.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.googleOverview.upsert as jest.Mock).mockResolvedValue({ id: 'overview-1' });
      (prisma.periodicalMetric.upsert as jest.Mock).mockResolvedValue({});

      await service.processReviewsAndUpdateDashboard(mockBusinessProfileId);

      const periodicalCalls = (prisma.periodicalMetric.upsert as jest.Mock).mock.calls;
      const allTimeCall = periodicalCalls.find(call => call[0].where.googleOverviewId_periodKey.periodKey === 0);
      
      const ratingDistribution = allTimeCall[0].create.ratingDistribution;
      expect(ratingDistribution['4']).toBe(1);
      expect(ratingDistribution['3']).toBe(0);
    });

    test('should use original rating values for average calculation', async () => {
      const mockReviews = [
        { rating: 4.7, stars: 4.7, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: 4.3, stars: 4.3, publishedAtDate: new Date(), reviewMetadata: null },
      ];

      (prisma.googleBusinessProfile.findUnique as jest.Mock).mockResolvedValue({
        id: mockBusinessProfileId,
        teamId: mockTeamId,
        displayName: 'Test Business',
      });
      (prisma.googleReview.findMany as jest.Mock).mockResolvedValue(mockReviews);
      (prisma.googleOverview.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.googleOverview.upsert as jest.Mock).mockResolvedValue({ id: 'overview-1' });
      (prisma.periodicalMetric.upsert as jest.Mock).mockResolvedValue({});

      await service.processReviewsAndUpdateDashboard(mockBusinessProfileId);

      const periodicalCalls = (prisma.periodicalMetric.upsert as jest.Mock).mock.calls;
      const allTimeCall = periodicalCalls.find(call => call[0].where.googleOverviewId_periodKey.periodKey === 0);
      
      const avgRating = allTimeCall[0].create.avgRating;
      expect(avgRating).toBeCloseTo(4.5, 2); // (4.7 + 4.3) / 2 = 4.5
    });
  });

  describe('Sentiment Analysis', () => {
    test('should count all ratings 1-5 in sentiment totals', async () => {
      const mockReviews = [
        { rating: 1.0, stars: 1.0, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: 2.5, stars: 2.5, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: 3.0, stars: 3.0, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: 3.5, stars: 3.5, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: 4.0, stars: 4.0, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: 4.9, stars: 4.9, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: 5.0, stars: 5.0, publishedAtDate: new Date(), reviewMetadata: null },
      ];

      (prisma.googleBusinessProfile.findUnique as jest.Mock).mockResolvedValue({
        id: mockBusinessProfileId,
        teamId: mockTeamId,
        displayName: 'Test Business',
      });
      (prisma.googleReview.findMany as jest.Mock).mockResolvedValue(mockReviews);
      (prisma.googleOverview.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.googleOverview.upsert as jest.Mock).mockResolvedValue({ id: 'overview-1' });
      (prisma.periodicalMetric.upsert as jest.Mock).mockResolvedValue({});

      await service.processReviewsAndUpdateDashboard(mockBusinessProfileId);

      const periodicalCalls = (prisma.periodicalMetric.upsert as jest.Mock).mock.calls;
      const allTimeCall = periodicalCalls.find(call => call[0].where.googleOverviewId_periodKey.periodKey === 0);
      
      const sentimentTotal = allTimeCall[0].create.sentimentTotal;
      expect(sentimentTotal).toBe(7); // All 7 reviews should be counted

      const sentimentPositive = allTimeCall[0].create.sentimentPositive;
      const sentimentNeutral = allTimeCall[0].create.sentimentNeutral;
      const sentimentNegative = allTimeCall[0].create.sentimentNegative;
      
      expect(sentimentPositive).toBe(4); // 3.5, 4.0, 4.9, 5.0 (rounded to 4 or 5)
      expect(sentimentNeutral).toBe(1); // 3.0
      expect(sentimentNegative).toBe(2); // 1.0, 2.5 (rounded to 1 or 2)
    });

    test('should categorize 3.5 rating as positive sentiment', async () => {
      const mockReviews = [
        { rating: 3.5, stars: 3.5, publishedAtDate: new Date(), reviewMetadata: null },
      ];

      (prisma.googleBusinessProfile.findUnique as jest.Mock).mockResolvedValue({
        id: mockBusinessProfileId,
        teamId: mockTeamId,
        displayName: 'Test Business',
      });
      (prisma.googleReview.findMany as jest.Mock).mockResolvedValue(mockReviews);
      (prisma.googleOverview.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.googleOverview.upsert as jest.Mock).mockResolvedValue({ id: 'overview-1' });
      (prisma.periodicalMetric.upsert as jest.Mock).mockResolvedValue({});

      await service.processReviewsAndUpdateDashboard(mockBusinessProfileId);

      const periodicalCalls = (prisma.periodicalMetric.upsert as jest.Mock).mock.calls;
      const allTimeCall = periodicalCalls.find(call => call[0].where.googleOverviewId_periodKey.periodKey === 0);
      
      expect(allTimeCall[0].create.sentimentPositive).toBe(1);
      expect(allTimeCall[0].create.sentimentNeutral).toBe(0);
      expect(allTimeCall[0].create.sentimentNegative).toBe(0);
    });
  });

  describe('Edge Case Handling - NaN', () => {
    test('should filter out NaN ratings from distribution', async () => {
      const mockReviews = [
        { rating: NaN, stars: NaN, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: 5.0, stars: 5.0, publishedAtDate: new Date(), reviewMetadata: null },
      ];

      (prisma.googleBusinessProfile.findUnique as jest.Mock).mockResolvedValue({
        id: mockBusinessProfileId,
        teamId: mockTeamId,
        displayName: 'Test Business',
      });
      (prisma.googleReview.findMany as jest.Mock).mockResolvedValue(mockReviews);
      (prisma.googleOverview.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.googleOverview.upsert as jest.Mock).mockResolvedValue({ id: 'overview-1' });
      (prisma.periodicalMetric.upsert as jest.Mock).mockResolvedValue({});

      await service.processReviewsAndUpdateDashboard(mockBusinessProfileId);

      const periodicalCalls = (prisma.periodicalMetric.upsert as jest.Mock).mock.calls;
      const allTimeCall = periodicalCalls.find(call => call[0].where.googleOverviewId_periodKey.periodKey === 0);
      
      const avgRating = allTimeCall[0].create.avgRating;
      expect(avgRating).toBe(5.0); // Only valid rating counted

      const reviewCount = allTimeCall[0].create.reviewCount;
      expect(reviewCount).toBe(2); // Both reviews counted in total

      const ratingDistribution = allTimeCall[0].create.ratingDistribution;
      expect(ratingDistribution['5']).toBe(1); // Only 1 valid rating
    });

    test('should not include NaN in sentiment counts', async () => {
      const mockReviews = [
        { rating: NaN, stars: NaN, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: 4.0, stars: 4.0, publishedAtDate: new Date(), reviewMetadata: null },
      ];

      (prisma.googleBusinessProfile.findUnique as jest.Mock).mockResolvedValue({
        id: mockBusinessProfileId,
        teamId: mockTeamId,
        displayName: 'Test Business',
      });
      (prisma.googleReview.findMany as jest.Mock).mockResolvedValue(mockReviews);
      (prisma.googleOverview.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.googleOverview.upsert as jest.Mock).mockResolvedValue({ id: 'overview-1' });
      (prisma.periodicalMetric.upsert as jest.Mock).mockResolvedValue({});

      await service.processReviewsAndUpdateDashboard(mockBusinessProfileId);

      const periodicalCalls = (prisma.periodicalMetric.upsert as jest.Mock).mock.calls;
      const allTimeCall = periodicalCalls.find(call => call[0].where.googleOverviewId_periodKey.periodKey === 0);
      
      const sentimentTotal = allTimeCall[0].create.sentimentTotal;
      expect(sentimentTotal).toBe(1); // Only valid rating counted
    });
  });

  describe('Edge Case Handling - Infinity', () => {
    test('should filter out Infinity ratings', async () => {
      const mockReviews = [
        { rating: Infinity, stars: Infinity, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: 3.0, stars: 3.0, publishedAtDate: new Date(), reviewMetadata: null },
      ];

      (prisma.googleBusinessProfile.findUnique as jest.Mock).mockResolvedValue({
        id: mockBusinessProfileId,
        teamId: mockTeamId,
        displayName: 'Test Business',
      });
      (prisma.googleReview.findMany as jest.Mock).mockResolvedValue(mockReviews);
      (prisma.googleOverview.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.googleOverview.upsert as jest.Mock).mockResolvedValue({ id: 'overview-1' });
      (prisma.periodicalMetric.upsert as jest.Mock).mockResolvedValue({});

      await service.processReviewsAndUpdateDashboard(mockBusinessProfileId);

      const periodicalCalls = (prisma.periodicalMetric.upsert as jest.Mock).mock.calls;
      const allTimeCall = periodicalCalls.find(call => call[0].where.googleOverviewId_periodKey.periodKey === 0);
      
      const avgRating = allTimeCall[0].create.avgRating;
      expect(avgRating).toBe(3.0); // Only valid rating
      expect(avgRating).not.toBe(Infinity);
    });

    test('should filter out negative Infinity ratings', async () => {
      const mockReviews = [
        { rating: -Infinity, stars: -Infinity, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: 2.0, stars: 2.0, publishedAtDate: new Date(), reviewMetadata: null },
      ];

      (prisma.googleBusinessProfile.findUnique as jest.Mock).mockResolvedValue({
        id: mockBusinessProfileId,
        teamId: mockTeamId,
        displayName: 'Test Business',
      });
      (prisma.googleReview.findMany as jest.Mock).mockResolvedValue(mockReviews);
      (prisma.googleOverview.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.googleOverview.upsert as jest.Mock).mockResolvedValue({ id: 'overview-1' });
      (prisma.periodicalMetric.upsert as jest.Mock).mockResolvedValue({});

      await service.processReviewsAndUpdateDashboard(mockBusinessProfileId);

      const periodicalCalls = (prisma.periodicalMetric.upsert as jest.Mock).mock.calls;
      const allTimeCall = periodicalCalls.find(call => call[0].where.googleOverviewId_periodKey.periodKey === 0);
      
      const avgRating = allTimeCall[0].create.avgRating;
      expect(avgRating).toBe(2.0);
    });
  });

  describe('Edge Case Handling - Null and Undefined', () => {
    test('should handle null ratings gracefully', async () => {
      const mockReviews = [
        { rating: null, stars: null, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: 4.5, stars: 4.5, publishedAtDate: new Date(), reviewMetadata: null },
      ];

      (prisma.googleBusinessProfile.findUnique as jest.Mock).mockResolvedValue({
        id: mockBusinessProfileId,
        teamId: mockTeamId,
        displayName: 'Test Business',
      });
      (prisma.googleReview.findMany as jest.Mock).mockResolvedValue(mockReviews);
      (prisma.googleOverview.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.googleOverview.upsert as jest.Mock).mockResolvedValue({ id: 'overview-1' });
      (prisma.periodicalMetric.upsert as jest.Mock).mockResolvedValue({});

      await service.processReviewsAndUpdateDashboard(mockBusinessProfileId);

      const periodicalCalls = (prisma.periodicalMetric.upsert as jest.Mock).mock.calls;
      const allTimeCall = periodicalCalls.find(call => call[0].where.googleOverviewId_periodKey.periodKey === 0);
      
      const avgRating = allTimeCall[0].create.avgRating;
      expect(avgRating).toBe(4.5);
    });
  });

  describe('Edge Case Handling - Out of Range', () => {
    test('should filter out ratings below 1', async () => {
      const mockReviews = [
        { rating: 0, stars: 0, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: -1, stars: -1, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: 3.0, stars: 3.0, publishedAtDate: new Date(), reviewMetadata: null },
      ];

      (prisma.googleBusinessProfile.findUnique as jest.Mock).mockResolvedValue({
        id: mockBusinessProfileId,
        teamId: mockTeamId,
        displayName: 'Test Business',
      });
      (prisma.googleReview.findMany as jest.Mock).mockResolvedValue(mockReviews);
      (prisma.googleOverview.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.googleOverview.upsert as jest.Mock).mockResolvedValue({ id: 'overview-1' });
      (prisma.periodicalMetric.upsert as jest.Mock).mockResolvedValue({});

      await service.processReviewsAndUpdateDashboard(mockBusinessProfileId);

      const periodicalCalls = (prisma.periodicalMetric.upsert as jest.Mock).mock.calls;
      const allTimeCall = periodicalCalls.find(call => call[0].where.googleOverviewId_periodKey.periodKey === 0);
      
      const avgRating = allTimeCall[0].create.avgRating;
      expect(avgRating).toBe(3.0); // Only valid rating
    });

    test('should filter out ratings above 5', async () => {
      const mockReviews = [
        { rating: 6, stars: 6, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: 10, stars: 10, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: 4.0, stars: 4.0, publishedAtDate: new Date(), reviewMetadata: null },
      ];

      (prisma.googleBusinessProfile.findUnique as jest.Mock).mockResolvedValue({
        id: mockBusinessProfileId,
        teamId: mockTeamId,
        displayName: 'Test Business',
      });
      (prisma.googleReview.findMany as jest.Mock).mockResolvedValue(mockReviews);
      (prisma.googleOverview.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.googleOverview.upsert as jest.Mock).mockResolvedValue({ id: 'overview-1' });
      (prisma.periodicalMetric.upsert as jest.Mock).mockResolvedValue({});

      await service.processReviewsAndUpdateDashboard(mockBusinessProfileId);

      const periodicalCalls = (prisma.periodicalMetric.upsert as jest.Mock).mock.calls;
      const allTimeCall = periodicalCalls.find(call => call[0].where.googleOverviewId_periodKey.periodKey === 0);
      
      const avgRating = allTimeCall[0].create.avgRating;
      expect(avgRating).toBe(4.0);
    });
  });

  describe('Edge Case Handling - Division by Zero', () => {
    test('should return null average when no valid ratings exist', async () => {
      const mockReviews = [
        { rating: NaN, stars: NaN, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: null, stars: null, publishedAtDate: new Date(), reviewMetadata: null },
      ];

      (prisma.googleBusinessProfile.findUnique as jest.Mock).mockResolvedValue({
        id: mockBusinessProfileId,
        teamId: mockTeamId,
        displayName: 'Test Business',
      });
      (prisma.googleReview.findMany as jest.Mock).mockResolvedValue(mockReviews);
      (prisma.googleOverview.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.googleOverview.upsert as jest.Mock).mockResolvedValue({ id: 'overview-1' });
      (prisma.periodicalMetric.upsert as jest.Mock).mockResolvedValue({});

      await service.processReviewsAndUpdateDashboard(mockBusinessProfileId);

      const periodicalCalls = (prisma.periodicalMetric.upsert as jest.Mock).mock.calls;
      const allTimeCall = periodicalCalls.find(call => call[0].where.googleOverviewId_periodKey.periodKey === 0);
      
      const avgRating = allTimeCall[0].create.avgRating;
      expect(avgRating).toBeNull();
    });

    test('should handle empty review list', async () => {
      const mockReviews: any[] = [];

      (prisma.googleBusinessProfile.findUnique as jest.Mock).mockResolvedValue({
        id: mockBusinessProfileId,
        teamId: mockTeamId,
        displayName: 'Test Business',
      });
      (prisma.googleReview.findMany as jest.Mock).mockResolvedValue(mockReviews);
      (prisma.googleOverview.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.googleOverview.upsert as jest.Mock).mockResolvedValue({ id: 'overview-1' });
      (prisma.periodicalMetric.upsert as jest.Mock).mockResolvedValue({});

      await service.processReviewsAndUpdateDashboard(mockBusinessProfileId);

      const periodicalCalls = (prisma.periodicalMetric.upsert as jest.Mock).mock.calls;
      const allTimeCall = periodicalCalls.find(call => call[0].where.googleOverviewId_periodKey.periodKey === 0);
      
      const avgRating = allTimeCall[0].create.avgRating;
      const reviewCount = allTimeCall[0].create.reviewCount;
      
      expect(avgRating).toBeNull();
      expect(reviewCount).toBe(0);
    });

    test('should calculate response rate correctly with zero reviews', async () => {
      const mockReviews: any[] = [];

      (prisma.googleBusinessProfile.findUnique as jest.Mock).mockResolvedValue({
        id: mockBusinessProfileId,
        teamId: mockTeamId,
        displayName: 'Test Business',
      });
      (prisma.googleReview.findMany as jest.Mock).mockResolvedValue(mockReviews);
      (prisma.googleOverview.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.googleOverview.upsert as jest.Mock).mockResolvedValue({ id: 'overview-1' });
      (prisma.periodicalMetric.upsert as jest.Mock).mockResolvedValue({});

      await service.processReviewsAndUpdateDashboard(mockBusinessProfileId);

      const periodicalCalls = (prisma.periodicalMetric.upsert as jest.Mock).mock.calls;
      const allTimeCall = periodicalCalls.find(call => call[0].where.googleOverviewId_periodKey.periodKey === 0);
      
      const responseRatePercent = allTimeCall[0].create.responseRatePercent;
      expect(responseRatePercent).toBe(0); // Not NaN or Infinity
    });
  });

  describe('Mixed Edge Cases', () => {
    test('should handle mix of valid and invalid ratings correctly', async () => {
      const mockReviews = [
        { rating: 5.0, stars: 5.0, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: NaN, stars: NaN, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: 3.0, stars: 3.0, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: Infinity, stars: Infinity, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: 4.5, stars: 4.5, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: null, stars: null, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: -1, stars: -1, publishedAtDate: new Date(), reviewMetadata: null },
        { rating: 10, stars: 10, publishedAtDate: new Date(), reviewMetadata: null },
      ];

      (prisma.googleBusinessProfile.findUnique as jest.Mock).mockResolvedValue({
        id: mockBusinessProfileId,
        teamId: mockTeamId,
        displayName: 'Test Business',
      });
      (prisma.googleReview.findMany as jest.Mock).mockResolvedValue(mockReviews);
      (prisma.googleOverview.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.googleOverview.upsert as jest.Mock).mockResolvedValue({ id: 'overview-1' });
      (prisma.periodicalMetric.upsert as jest.Mock).mockResolvedValue({});

      await service.processReviewsAndUpdateDashboard(mockBusinessProfileId);

      const periodicalCalls = (prisma.periodicalMetric.upsert as jest.Mock).mock.calls;
      const allTimeCall = periodicalCalls.find(call => call[0].where.googleOverviewId_periodKey.periodKey === 0);
      
      const avgRating = allTimeCall[0].create.avgRating;
      const reviewCount = allTimeCall[0].create.reviewCount;
      const sentimentTotal = allTimeCall[0].create.sentimentTotal;
      
      // Only 3 valid ratings: 5.0, 3.0, 4.5
      expect(avgRating).toBeCloseTo(4.17, 2); // (5 + 3 + 4.5) / 3
      expect(reviewCount).toBe(8); // All reviews counted in total
      expect(sentimentTotal).toBe(3); // Only valid ratings in sentiment
      expect(avgRating).not.toBeNaN();
      expect(avgRating).not.toBe(Infinity);
    });
  });
});

