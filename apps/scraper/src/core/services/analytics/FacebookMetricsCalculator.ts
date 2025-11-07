/**
 * Facebook Metrics Calculator
 * Handles Facebook-specific metrics: recommendations, engagement, tags
 * Facebook doesn't use star ratings - uses isRecommended (boolean)
 */

export interface FacebookRecommendationMetrics {
  totalReviews: number;
  recommendedCount: number;
  notRecommendedCount: number;
  recommendationRate: number; // Percentage
}

export interface FacebookEngagementMetrics {
  totalLikes: number;
  totalComments: number;
  totalPhotos: number;
  averageLikesPerReview: number;
  averageCommentsPerReview: number;
  engagementScore: number; // Calculated score
  viralityScore: number; // Based on engagement
}

export interface TagFrequency {
  tag: string;
  count: number;
  recommendationRate: number;
  averageSentiment: number;
}

export class FacebookMetricsCalculator {
  /**
   * Calculate recommendation metrics
   */
  static calculateRecommendationMetrics(
    reviews: Array<{ isRecommended: boolean }>,
  ): FacebookRecommendationMetrics {
    const totalReviews = reviews.length;

    if (totalReviews === 0) {
      return {
        totalReviews: 0,
        recommendedCount: 0,
        notRecommendedCount: 0,
        recommendationRate: 0,
      };
    }

    const recommendedCount = reviews.filter((r) => r.isRecommended).length;
    const notRecommendedCount = totalReviews - recommendedCount;
    const recommendationRate = (recommendedCount / totalReviews) * 100;

    return {
      totalReviews,
      recommendedCount,
      notRecommendedCount,
      recommendationRate,
    };
  }

  /**
   * Calculate engagement metrics from likes and comments
   */
  static calculateEngagementMetrics(
    reviews: Array<{
      likesCount?: number | null;
      commentsCount?: number | null;
      reviewMetadata?: { photoCount?: number | null } | null;
    }>,
  ): FacebookEngagementMetrics {
    const totalReviews = reviews.length;

    if (totalReviews === 0) {
      return {
        totalLikes: 0,
        totalComments: 0,
        totalPhotos: 0,
        averageLikesPerReview: 0,
        averageCommentsPerReview: 0,
        engagementScore: 0,
        viralityScore: 0,
      };
    }

    const totalLikes = reviews.reduce((sum, r) => sum + (r.likesCount || 0), 0);
    const totalComments = reviews.reduce(
      (sum, r) => sum + (r.commentsCount || 0),
      0,
    );
    const totalPhotos = reviews.reduce(
      (sum, r) => sum + (r.reviewMetadata?.photoCount || 0),
      0,
    );

    const averageLikesPerReview = totalLikes / totalReviews;
    const averageCommentsPerReview = totalComments / totalReviews;

    // Calculate engagement and virality scores (matching legacy formulas)
    const engagementScore = 0; // Calculated separately with response rate
    const viralityScore = 0; // Calculated separately with recommendation rate

    return {
      totalLikes,
      totalComments,
      totalPhotos,
      averageLikesPerReview,
      averageCommentsPerReview,
      engagementScore,
      viralityScore,
    };
  }

  /**
   * Calculate tag frequency and metrics
   */
  static calculateTagFrequency(
    reviews: Array<{
      tags?: string[] | null;
      isRecommended: boolean;
      reviewMetadata?: { sentiment?: number | null } | null;
    }>,
    limit: number = 20,
  ): TagFrequency[] {
    const tagMap = new Map<
      string,
      {
        count: number;
        recommendedCount: number;
        sentimentSum: number;
        sentimentCount: number;
      }
    >();

    reviews.forEach((review) => {
      if (!review.tags) return;

      review.tags.forEach((tag) => {
        if (!tag) return;

        const normalizedTag = tag.toLowerCase().trim();
        const existing = tagMap.get(normalizedTag) || {
          count: 0,
          recommendedCount: 0,
          sentimentSum: 0,
          sentimentCount: 0,
        };

        existing.count++;
        if (review.isRecommended) {
          existing.recommendedCount++;
        }

        if (review.reviewMetadata?.sentiment) {
          existing.sentimentSum += review.reviewMetadata.sentiment;
          existing.sentimentCount++;
        }

        tagMap.set(normalizedTag, existing);
      });
    });

    // Convert to array and calculate rates
    const tagFrequencies = Array.from(tagMap.entries())
      .map(([tag, stats]) => ({
        tag,
        count: stats.count,
        recommendationRate: (stats.recommendedCount / stats.count) * 100,
        averageSentiment:
          stats.sentimentCount > 0
            ? stats.sentimentSum / stats.sentimentCount
            : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return tagFrequencies;
  }

  /**
   * Convert recommendation to a 0-1 scale for compatibility with other platforms
   * Recommended = 1.0, Not recommended = 0.0
   */
  static recommendationToScore(isRecommended: boolean): number {
    return isRecommended ? 1.0 : 0.0;
  }

  /**
   * Convert recommendation rate (percentage) to 5-star equivalent
   * For display purposes only - Facebook doesn't actually use stars
   */
  static recommendationRateToStarEquivalent(
    recommendationRate: number,
  ): number {
    // 100% = 5 stars, 0% = 1 star
    // Linear interpolation
    return 1 + (recommendationRate / 100) * 4;
  }

  /**
   * Calculate engagement score (0-100) - matches legacy formula
   * Combines engagement rate, photo rate, and response rate
   */
  static calculateEngagementScore(
    totalReviews: number,
    totalLikes: number,
    totalComments: number,
    totalPhotos: number,
    responseRatePercent: number,
  ): number {
    if (totalReviews === 0) return 0;

    const engagementRate = (totalLikes + totalComments) / totalReviews;
    const photoRate = totalPhotos / totalReviews;
    const responseRate = responseRatePercent / 100;

    // Weighted engagement score: engagement(50%) + photos(25%) + responses(25%)
    const score = engagementRate * 50 + photoRate * 25 + responseRate * 25;
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate virality score (0-100) - matches legacy formula
   * Based on likes per review, comments per review, and recommendation rate
   */
  static calculateViralityScore(
    averageLikesPerReview: number,
    averageCommentsPerReview: number,
    recommendationRatePercent: number,
  ): number {
    const recommendationRate = recommendationRatePercent / 100;

    // Virality: likes(30%) + comments(40%) + recommendation(30%)
    const score =
      averageLikesPerReview * 30 +
      averageCommentsPerReview * 40 +
      recommendationRate * 30;
    return Math.min(100, Math.max(0, score));
  }
}
