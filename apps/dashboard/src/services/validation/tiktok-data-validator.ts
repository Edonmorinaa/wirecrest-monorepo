import { 
  TikTokAnalytics,
  CalculationResult,
  TikTokDailySnapshot,
  TikTokBusinessProfile
} from '@/types/tiktok-analytics';

/**
 * TikTok Data Validator
 * Follows Single Responsibility Principle - only handles data validation
 */
export class TikTokDataValidator {
  /**
   * Validate date range
   */
  static validateDateRange(startDate: Date, endDate: Date): CalculationResult<boolean> {
    const errors: string[] = [];
    
    if (!startDate || !endDate) {
      errors.push('Start date and end date are required');
    }
    
    if (startDate >= endDate) {
      errors.push('Start date must be before end date');
    }
    
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 90) {
      errors.push('Date range cannot exceed 90 days');
    }
    
    if (daysDiff < 0) {
      errors.push('Invalid date range');
    }
    
    return {
      data: errors.length === 0,
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate all data
   */
  static validateAllData(
    snapshots: TikTokDailySnapshot[],
    analytics: TikTokAnalytics[],
    businessProfile: TikTokBusinessProfile | null,
    startDate: Date,
    endDate: Date
  ): CalculationResult<boolean> {
    const errors: string[] = [];
    
    // Validate date range
    const dateValidation = this.validateDateRange(startDate, endDate);
    if (!dateValidation.isValid) {
      errors.push(...dateValidation.errors);
    }
    
    // Validate snapshots
    if (snapshots.length === 0) {
      errors.push('No snapshots available for the selected date range');
    }
    
    snapshots.forEach((snapshot, index) => {
      if (snapshot.followerCount < 0) {
        errors.push(`Invalid follower count at snapshot ${index}`);
      }
      if (snapshot.followingCount < 0) {
        errors.push(`Invalid following count at snapshot ${index}`);
      }
      if (snapshot.videoCount < 0) {
        errors.push(`Invalid video count at snapshot ${index}`);
      }
      if (snapshot.totalLikes < 0) {
        errors.push(`Invalid total likes at snapshot ${index}`);
      }
      if (snapshot.totalComments < 0) {
        errors.push(`Invalid total comments at snapshot ${index}`);
      }
      if (snapshot.totalViews < 0) {
        errors.push(`Invalid total views at snapshot ${index}`);
      }
    });
    
    // Validate business profile
    if (!businessProfile) {
      errors.push('Business profile not found');
    } else {
      if (!businessProfile.username) {
        errors.push('Business profile username is required');
      }
      if (!businessProfile.teamId) {
        errors.push('Business profile team ID is required');
      }
    }
    
    // Validate analytics data
    analytics.forEach((analytic, index) => {
      if (analytic.followersGrowthRate90d < -100 || analytic.followersGrowthRate90d > 10000) {
        errors.push(`Invalid followers growth rate at analytics ${index}`);
      }
      if (analytic.engagementRate < 0 || analytic.engagementRate > 100) {
        errors.push(`Invalid engagement rate at analytics ${index}`);
      }
    });
    
    return {
      data: errors.length === 0,
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate snapshot data
   */
  static validateSnapshotData(snapshots: TikTokDailySnapshot[]): CalculationResult<boolean> {
    const errors: string[] = [];
    
    if (snapshots.length === 0) {
      errors.push('No snapshots available');
    }
    
    snapshots.forEach((snapshot, index) => {
      if (snapshot.followerCount < 0) {
        errors.push(`Invalid follower count at index ${index}`);
      }
      if (snapshot.followingCount < 0) {
        errors.push(`Invalid following count at index ${index}`);
      }
      if (snapshot.videoCount < 0) {
        errors.push(`Invalid video count at index ${index}`);
      }
      if (snapshot.totalLikes < 0) {
        errors.push(`Invalid total likes at index ${index}`);
      }
      if (snapshot.totalComments < 0) {
        errors.push(`Invalid total comments at index ${index}`);
      }
      if (snapshot.totalViews < 0) {
        errors.push(`Invalid total views at index ${index}`);
      }
      if (snapshot.totalShares < 0) {
        errors.push(`Invalid total shares at index ${index}`);
      }
      if (snapshot.totalDownloads < 0) {
        errors.push(`Invalid total downloads at index ${index}`);
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
  static validateBusinessProfile(businessProfile: TikTokBusinessProfile | null): CalculationResult<boolean> {
    const errors: string[] = [];
    
    if (!businessProfile) {
      errors.push('Business profile is required');
      return {
        data: false,
        isValid: false,
        errors
      };
    }
    
    if (!businessProfile.username) {
      errors.push('Username is required');
    }
    
    if (!businessProfile.teamId) {
      errors.push('Team ID is required');
    }
    
    if (!businessProfile.userId) {
      errors.push('User ID is required');
    }
    
    return {
      data: errors.length === 0,
      isValid: errors.length === 0,
      errors
    };
  }
}
