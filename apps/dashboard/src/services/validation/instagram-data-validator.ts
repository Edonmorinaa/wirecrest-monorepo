import { 
  CalculationResult, 
  InstagramAnalytics, 
  InstagramDailySnapshot,
  InstagramBusinessProfile 
} from '@/types/instagram-analytics';

/**
 * Data validation service for Instagram analytics
 * Follows Single Responsibility Principle
 */
export class InstagramDataValidator {
  /**
   * Validate snapshots data
   */
  static validateSnapshots(snapshots: InstagramDailySnapshot[]): CalculationResult<boolean> {
    const errors: string[] = [];
    
    if (snapshots.length === 0) {
      errors.push('No snapshots available');
      return { data: false, isValid: false, errors };
    }

    snapshots.forEach((snapshot, index) => {
      // Validate required fields
      if (snapshot.followersCount < 0) {
        errors.push(`Invalid followers count at snapshot ${index}: ${snapshot.followersCount}`);
      }
      
      if (snapshot.followingCount < 0) {
        errors.push(`Invalid following count at snapshot ${index}: ${snapshot.followingCount}`);
      }
      
      if (snapshot.mediaCount < 0) {
        errors.push(`Invalid media count at snapshot ${index}: ${snapshot.mediaCount}`);
      }

      // Validate engagement data
      if (snapshot.totalLikes < 0) {
        errors.push(`Invalid total likes at snapshot ${index}: ${snapshot.totalLikes}`);
      }
      
      if (snapshot.totalComments < 0) {
        errors.push(`Invalid total comments at snapshot ${index}: ${snapshot.totalComments}`);
      }

      // Validate date consistency
      if (index > 0) {
        const previousSnapshot = snapshots[index - 1];
        if (snapshot.snapshotDate < previousSnapshot.snapshotDate) {
          errors.push(`Snapshot date order issue at index ${index}`);
        }
      }
    });

    return {
      data: errors.length === 0,
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate analytics data
   */
  static validateAnalytics(analytics: InstagramAnalytics[]): CalculationResult<boolean> {
    const errors: string[] = [];
    
    analytics.forEach((analytic, index) => {
      if (analytic.followersGrowthRate90d < -100 || analytic.followersGrowthRate90d > 1000) {
        errors.push(`Invalid growth rate at analytics ${index}: ${analytic.followersGrowthRate90d}`);
      }
      
      if (analytic.engagementRate < 0 || analytic.engagementRate > 100) {
        errors.push(`Invalid engagement rate at analytics ${index}: ${analytic.engagementRate}`);
      }
    });

    return {
      data: errors.length === 0,
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate business profile
   */
  static validateBusinessProfile(profile: InstagramBusinessProfile | null): CalculationResult<boolean> {
    const errors: string[] = [];
    
    if (!profile) {
      errors.push('Business profile is null or undefined');
      return { data: false, isValid: false, errors };
    }

    if (!profile.id) {
      errors.push('Business profile ID is missing');
    }
    
    if (!profile.username) {
      errors.push('Business profile username is missing');
    }

    return {
      data: errors.length === 0,
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate date range
   */
  static validateDateRange(startDate: Date, endDate: Date): CalculationResult<boolean> {
    const errors: string[] = [];
    
    if (startDate >= endDate) {
      errors.push('Start date must be before end date');
    }
    
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 90) {
      errors.push('Date range cannot exceed 90 days');
    }
    
    if (startDate > new Date()) {
      errors.push('Start date cannot be in the future');
    }
    
    if (endDate > new Date()) {
      errors.push('End date cannot be in the future');
    }

    return {
      data: errors.length === 0,
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate all data for analytics calculation
   */
  static validateAllData(
    snapshots: InstagramDailySnapshot[],
    analytics: InstagramAnalytics[],
    businessProfile: InstagramBusinessProfile | null,
    startDate: Date,
    endDate: Date
  ): CalculationResult<boolean> {
    const allErrors: string[] = [];
    
    // Validate each component
    const snapshotsValidation = this.validateSnapshots(snapshots);
    const analyticsValidation = this.validateAnalytics(analytics);
    const profileValidation = this.validateBusinessProfile(businessProfile);
    const dateValidation = this.validateDateRange(startDate, endDate);
    
    // Collect all errors
    allErrors.push(...snapshotsValidation.errors);
    allErrors.push(...analyticsValidation.errors);
    allErrors.push(...profileValidation.errors);
    allErrors.push(...dateValidation.errors);
    
    return {
      data: allErrors.length === 0,
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }
}
