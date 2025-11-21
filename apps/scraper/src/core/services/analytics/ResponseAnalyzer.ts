/**
 * @deprecated This file is kept for reference only
 * Analytics are now computed on-demand via tRPC procedures in the dashboard app
 * DO NOT USE - will be removed in future cleanup
 * 
 * Historical note: This utility analyzed response rates and response times
 * for updating PeriodicalMetric tables (now removed from schema)
 * 
 * See: apps/dashboard/src/server/trpc/routers/locations.router.ts for new implementation
 * 
 * Original description:
 * Response Analyzer Utility
 * Analyzes response rates and response times
 * Follows Single Responsibility Principle (SRP)
 */

import { PeriodCalculator } from "./PeriodCalculator";

export interface ResponseMetrics {
  totalReviews: number;
  reviewsWithResponse: number;
  responseRate: number; // Percentage
  averageResponseTimeHours: number | null;
  medianResponseTimeHours: number | null;
}

export interface ReviewWithResponse {
  publishedAtDate: Date | string;
  reviewMetadata?: {
    reply?: string | null;
    replyDate?: Date | string | null;
  } | null;
  responseFromOwnerText?: string | null;
  responseFromOwnerDate?: Date | string | null;
}

export class ResponseAnalyzer {
  /**
   * Calculate response metrics for reviews
   */
  static calculateResponseMetrics<T extends ReviewWithResponse>(
    reviews: T[],
  ): ResponseMetrics {
    const totalReviews = reviews.length;

    if (totalReviews === 0) {
      return {
        totalReviews: 0,
        reviewsWithResponse: 0,
        responseRate: 0,
        averageResponseTimeHours: null,
        medianResponseTimeHours: null,
      };
    }

    const reviewsWithResponse: T[] = [];
    const responseTimes: number[] = [];

    reviews.forEach((review) => {
      const hasResponse = this.hasResponse(review);

      if (hasResponse) {
        reviewsWithResponse.push(review);

        const responseTime = this.calculateResponseTime(review);
        if (responseTime !== null) {
          responseTimes.push(responseTime);
        }
      }
    });

    const responseRate = (reviewsWithResponse.length / totalReviews) * 100;
    const averageResponseTimeHours = this.calculateAverage(responseTimes);
    const medianResponseTimeHours = this.calculateMedian(responseTimes);

    return {
      totalReviews,
      reviewsWithResponse: reviewsWithResponse.length,
      responseRate,
      averageResponseTimeHours,
      medianResponseTimeHours,
    };
  }

  /**
   * Check if review has owner response
   */
  static hasResponse<T extends ReviewWithResponse>(review: T): boolean {
    // Check reviewMetadata first
    if (review.reviewMetadata?.reply) {
      return true;
    }

    // Check direct property
    if (review.responseFromOwnerText) {
      return true;
    }

    return false;
  }

  /**
   * Calculate response time in hours
   */
  static calculateResponseTime<T extends ReviewWithResponse>(
    review: T,
  ): number | null {
    const reviewDate = this.parseDate(review.publishedAtDate);
    if (!reviewDate) return null;

    // Try metadata first
    let replyDate: Date | null = null;

    if (review.reviewMetadata?.replyDate) {
      replyDate = this.parseDate(review.reviewMetadata.replyDate);
    } else if (review.responseFromOwnerDate) {
      replyDate = this.parseDate(review.responseFromOwnerDate);
    }

    if (!replyDate) return null;

    return PeriodCalculator.hoursBetween(reviewDate, replyDate);
  }

  /**
   * Parse date from string or Date object
   */
  private static parseDate(
    date: Date | string | null | undefined,
  ): Date | null {
    if (!date) return null;

    if (date instanceof Date) {
      return date;
    }

    try {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  }

  /**
   * Calculate average of numbers
   */
  private static calculateAverage(numbers: number[]): number | null {
    if (numbers.length === 0) return null;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return sum / numbers.length;
  }

  /**
   * Calculate median of numbers
   */
  private static calculateMedian(numbers: number[]): number | null {
    if (numbers.length === 0) return null;

    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }

    return sorted[mid];
  }

  /**
   * Calculate response rate percentage
   */
  static calculateResponseRate(
    totalReviews: number,
    reviewsWithResponse: number,
  ): number {
    if (totalReviews === 0) return 0;
    return (reviewsWithResponse / totalReviews) * 100;
  }

  /**
   * Group reviews by response status
   */
  static groupByResponseStatus<T extends ReviewWithResponse>(
    reviews: T[],
  ): {
    withResponse: T[];
    withoutResponse: T[];
  } {
    const withResponse: T[] = [];
    const withoutResponse: T[] = [];

    reviews.forEach((review) => {
      if (this.hasResponse(review)) {
        withResponse.push(review);
      } else {
        withoutResponse.push(review);
      }
    });

    return { withResponse, withoutResponse };
  }
}
