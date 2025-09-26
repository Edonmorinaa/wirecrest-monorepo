import { 
  GeneralMetrics,
  TikTokDailySnapshot,
  TikTokBusinessProfile
} from '@/types/tiktok-analytics';

/**
 * TikTok General Metrics Calculator
 * Follows Single Responsibility Principle - only calculates general metrics
 */
export class TikTokGeneralMetricsCalculator {
  /**
   * Calculate general metrics (profile info, current counts, deltas)
   */
  static calculate(
    businessProfile: TikTokBusinessProfile | null,
    snapshots: TikTokDailySnapshot[]
  ): GeneralMetrics | null {
    if (!businessProfile || snapshots.length === 0) {
      return null;
    }

    const latestSnapshot = snapshots[snapshots.length - 1];
    const firstSnapshot = snapshots[0];

    return {
      profilePicture: businessProfile.profileUrl || '',
      bio: businessProfile.biography || '',
      followers: {
        count: latestSnapshot.followerCount,
        delta: latestSnapshot.followerCount - firstSnapshot.followerCount
      },
      following: {
        count: latestSnapshot.followingCount,
        delta: latestSnapshot.followingCount - firstSnapshot.followingCount
      },
      videos: {
        count: latestSnapshot.videoCount,
        delta: latestSnapshot.videoCount - firstSnapshot.videoCount
      }
    };
  }
}
