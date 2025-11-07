/**
 * Histogram Builder Utility
 * Builds rating and sentiment distribution histograms
 * Follows Single Responsibility Principle (SRP)
 */

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export class HistogramBuilder {
  /**
   * Build rating distribution histogram
   */
  static buildRatingDistribution(ratings: number[]): RatingDistribution {
    const distribution: RatingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    ratings.forEach((rating) => {
      const roundedRating = Math.round(rating);
      if (roundedRating >= 1 && roundedRating <= 5) {
        distribution[roundedRating as keyof RatingDistribution]++;
      }
    });

    return distribution;
  }

  /**
   * Build sentiment distribution
   */
  static buildSentimentDistribution(
    sentiments: Array<"positive" | "neutral" | "negative">,
  ): SentimentDistribution {
    const distribution: SentimentDistribution = {
      positive: 0,
      neutral: 0,
      negative: 0,
      total: sentiments.length,
    };

    sentiments.forEach((sentiment) => {
      distribution[sentiment]++;
    });

    return distribution;
  }

  /**
   * Categorize rating into sentiment
   */
  static ratingToSentiment(
    rating: number,
  ): "positive" | "neutral" | "negative" {
    if (rating >= 4) return "positive";
    if (rating >= 3) return "neutral";
    return "negative";
  }

  /**
   * Build sentiment distribution from ratings
   */
  static buildSentimentFromRatings(ratings: number[]): SentimentDistribution {
    const sentiments = ratings.map((rating) => this.ratingToSentiment(rating));
    return this.buildSentimentDistribution(sentiments);
  }

  /**
   * Calculate average rating
   */
  static calculateAverageRating(ratings: number[]): number | null {
    if (ratings.length === 0) return null;
    const sum = ratings.reduce((acc, rating) => acc + rating, 0);
    return sum / ratings.length;
  }

  /**
   * Calculate median rating
   */
  static calculateMedianRating(ratings: number[]): number | null {
    if (ratings.length === 0) return null;

    const sorted = [...ratings].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }

    return sorted[mid];
  }

  /**
   * Calculate rating percentages
   */
  static calculateRatingPercentages(
    distribution: RatingDistribution,
  ): Record<string, number> {
    const total = Object.values(distribution).reduce(
      (sum, count) => sum + count,
      0,
    );

    if (total === 0) {
      return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    }

    return {
      1: (distribution[1] / total) * 100,
      2: (distribution[2] / total) * 100,
      3: (distribution[3] / total) * 100,
      4: (distribution[4] / total) * 100,
      5: (distribution[5] / total) * 100,
    };
  }

  /**
   * Calculate sentiment percentages
   */
  static calculateSentimentPercentages(distribution: SentimentDistribution): {
    positive: number;
    neutral: number;
    negative: number;
  } {
    const { total } = distribution;

    if (total === 0) {
      return { positive: 0, neutral: 0, negative: 0 };
    }

    return {
      positive: (distribution.positive / total) * 100,
      neutral: (distribution.neutral / total) * 100,
      negative: (distribution.negative / total) * 100,
    };
  }
}
