import {
  GeneralMetrics,
  InstagramDailySnapshot,
  InstagramBusinessProfile
} from '@/types/instagram-analytics';

import { InstagramCalculationUtils } from './instagram-calculation-utils';

/**
 * Calculator for general metrics (profile info, current counts, deltas)
 * Follows Single Responsibility Principle
 */
export class GeneralMetricsCalculator {
  /**
   * Calculate general metrics from business profile and snapshots
   */
  static calculate(
    businessProfile: InstagramBusinessProfile | null,
    latestSnapshot: InstagramDailySnapshot | null,
    firstSnapshot: InstagramDailySnapshot | null
  ): GeneralMetrics | null {
    if (!latestSnapshot || !firstSnapshot) {
      return null;
    }

    return {
      profilePicture: '', // Profile picture not available in current schema
      bio: businessProfile?.biography || '',
      followers: {
        count: latestSnapshot.followersCount,
        delta: InstagramCalculationUtils.calculateGrowth(
          latestSnapshot.followersCount,
          firstSnapshot.followersCount
        )
      },
      following: {
        count: latestSnapshot.followingCount,
        delta: InstagramCalculationUtils.calculateGrowth(
          latestSnapshot.followingCount,
          firstSnapshot.followingCount
        )
      },
      posts: {
        count: latestSnapshot.mediaCount,
        delta: InstagramCalculationUtils.calculateGrowth(
          latestSnapshot.mediaCount,
          firstSnapshot.mediaCount
        )
      }
    };
  }
}
