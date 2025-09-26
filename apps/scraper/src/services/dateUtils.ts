export class DateUtils {
  /**
   * Standardize review date extraction across platforms
   */
  static getReviewDate(review: any, platform: 'GOOGLE' | 'FACEBOOK' | 'TRIPADVISOR' | 'BOOKING'): Date {
    let dateValue: string | Date;
    
    switch (platform) {
      case 'GOOGLE':
        dateValue = review.publishedAtDate || review.reviewMetadata?.date || review.date;
        break;
      case 'FACEBOOK':
        dateValue = review.date || review.reviewDate;
        break;
      case 'TRIPADVISOR':
      case 'BOOKING':
        dateValue = review.publishedDate || review.date;
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    if (!dateValue) {
      throw new Error(`No date found for review on platform ${platform}`);
    }

    return new Date(dateValue);
  }

  /**
   * Calculate period boundaries consistently
   */
  static getPeriodBoundaries(days: number | null): { startDate: Date; endDate: Date } {
    const now = new Date();
    
    if (days === null) {
      // All time - return very old start date
      return {
        startDate: new Date('1900-01-01'),
        endDate: now
      };
    }

    // Use UTC to avoid timezone issues
    const endDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23, 59, 59, 999
    ));

    const startDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - days,
      0, 0, 0, 0
    ));

    return { startDate, endDate };
  }

  /**
   * Check if a review falls within a period
   */
  static isReviewInPeriod(
    review: any, 
    platform: 'GOOGLE' | 'FACEBOOK' | 'TRIPADVISOR' | 'BOOKING',
    periodDays: number | null
  ): boolean {
    try {
      const reviewDate = this.getReviewDate(review, platform);
      const { startDate, endDate } = this.getPeriodBoundaries(periodDays);
      
      return reviewDate >= startDate && reviewDate <= endDate;
    } catch (error) {
      console.warn(`Failed to check review period for platform ${platform}:`, error);
      return false;
    }
  }

  /**
   * Filter reviews by period
   */
  static filterReviewsByPeriod<T>(
    reviews: T[],
    platform: 'GOOGLE' | 'FACEBOOK' | 'TRIPADVISOR' | 'BOOKING',
    periodDays: number | null
  ): T[] {
    if (periodDays === null) {
      return reviews; // All time
    }

    return reviews.filter(review => 
      this.isReviewInPeriod(review, platform, periodDays)
    );
  }

  /**
   * Validate if periodical metrics are stale
   */
  static areMetricsStale(lastUpdated: Date, maxAgeHours: number = 24): boolean {
    const now = new Date();
    const ageInHours = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
    return ageInHours > maxAgeHours;
  }
} 