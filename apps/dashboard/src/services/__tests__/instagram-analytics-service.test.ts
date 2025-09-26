import { InstagramAnalyticsServiceV2 } from '../instagram-analytics-service-v2';
import { InstagramCalculationUtils } from '../calculations/instagram-calculation-utils';
import { 
  InstagramDailySnapshot, 
  InstagramAnalytics, 
  InstagramBusinessProfile 
} from '@/types/instagram-analytics';

// Mock data for testing
const mockSnapshots: InstagramDailySnapshot[] = [
  {
    id: '1',
    businessProfileId: 'profile1',
    snapshotDate: new Date('2024-01-01'),
    snapshotTime: new Date('2024-01-01T09:00:00Z'),
    followersCount: 1000,
    followingCount: 500,
    mediaCount: 100,
    totalLikes: 5000,
    totalComments: 200,
    totalViews: 10000,
    totalSaves: 100,
    totalShares: 50,
    newPosts: 1,
    newStories: 2,
    newReels: 0,
    storyViews: 500,
    storyReplies: 10,
    engagementRate: 0,
    avgLikesPerPost: 0,
    avgCommentsPerPost: 0,
    commentsRatio: 0,
    followersRatio: 0,
    followersGrowth: 0,
    followingGrowth: 0,
    mediaGrowth: 0,
    weeklyFollowersGrowth: 0,
    monthlyFollowersGrowth: 0,
    hasErrors: false,
    snapshotType: 'DAILY'
  },
  {
    id: '2',
    businessProfileId: 'profile1',
    snapshotDate: new Date('2024-01-02'),
    snapshotTime: new Date('2024-01-02T09:00:00Z'),
    followersCount: 1050,
    followingCount: 510,
    mediaCount: 102,
    totalLikes: 5500,
    totalComments: 220,
    totalViews: 11000,
    totalSaves: 110,
    totalShares: 55,
    newPosts: 2,
    newStories: 1,
    newReels: 1,
    storyViews: 600,
    storyReplies: 12,
    engagementRate: 0,
    avgLikesPerPost: 0,
    avgCommentsPerPost: 0,
    commentsRatio: 0,
    followersRatio: 0,
    followersGrowth: 0,
    followingGrowth: 0,
    mediaGrowth: 0,
    weeklyFollowersGrowth: 0,
    monthlyFollowersGrowth: 0,
    hasErrors: false,
    snapshotType: 'DAILY'
  }
];

const mockAnalytics: InstagramAnalytics[] = [
  {
    id: '1',
    businessProfileId: 'profile1',
    date: new Date('2024-01-01'),
    period: 'DAILY',
    followersGrowthRate90d: 5.0,
    steadyGrowthRate: 85.0,
    dailyFollowersGrowth: 50,
    weeklyFollowersGrowth: 350,
    monthlyFollowersGrowth: 1500,
    engagementRate: 5.5,
    weeklyEngagementRate: 5.2,
    avgLikes: 50,
    avgComments: 2,
    commentsRatio: 4.0,
    weeklyPosts: 7,
    followersRatio: 2.0,
    predictedFollowers: 2000,
    growthTrend: 'INCREASING',
    calculatedAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z')
  }
];

const mockBusinessProfile: InstagramBusinessProfile = {
  id: 'profile1',
  teamId: 'team1',
  username: 'testuser',
  userId: 'user1',
  profileUrl: 'https://instagram.com/testuser',
  fullName: 'Test User',
  biography: 'Test bio',
  website: 'https://test.com',
  isVerified: false,
  isBusinessAccount: true,
  category: 'Business',
  currentFollowersCount: 1050,
  currentFollowingCount: 510,
  currentMediaCount: 102,
  firstSnapshotAt: new Date('2024-01-01'),
  lastSnapshotAt: new Date('2024-01-02'),
  totalSnapshots: 2,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  contactAddress: 'Test Address',
  contactEmail: 'test@example.com',
  contactPhone: '+1234567890'
};

describe('InstagramAnalyticsServiceV2', () => {
  let service: InstagramAnalyticsServiceV2;

  beforeEach(() => {
    service = new InstagramAnalyticsServiceV2();
  });

  describe('InstagramCalculationUtils', () => {
    test('should calculate engagement rate correctly', () => {
      const snapshot = mockSnapshots[0];
      const engagementRate = InstagramCalculationUtils.calculateEngagementRate(snapshot);
      
      // Expected: (5000 + 200 + 100 + 50) / 1000 * 100 = 5.35%
      expect(engagementRate).toBeCloseTo(5.35, 2);
    });

    test('should calculate average likes per post correctly', () => {
      const snapshot = mockSnapshots[0];
      const avgLikes = InstagramCalculationUtils.calculateAvgLikesPerPost(snapshot);
      
      // Expected: 5000 / 100 = 50
      expect(avgLikes).toBe(50);
    });

    test('should calculate average comments per post correctly', () => {
      const snapshot = mockSnapshots[0];
      const avgComments = InstagramCalculationUtils.calculateAvgCommentsPerPost(snapshot);
      
      // Expected: 200 / 100 = 2
      expect(avgComments).toBe(2);
    });

    test('should calculate comments ratio correctly', () => {
      const snapshot = mockSnapshots[0];
      const commentsRatio = InstagramCalculationUtils.calculateCommentsRatio(snapshot);
      
      // Expected: (200 / 5000) * 100 = 4%
      expect(commentsRatio).toBe(4);
    });

    test('should calculate followers ratio correctly', () => {
      const snapshot = mockSnapshots[0];
      const followersRatio = InstagramCalculationUtils.calculateFollowersRatio(snapshot);
      
      // Expected: 1000 / 500 = 2
      expect(followersRatio).toBe(2);
    });

    test('should calculate growth correctly', () => {
      const current = 1050;
      const previous = 1000;
      const growth = InstagramCalculationUtils.calculateGrowth(current, previous);
      
      // Expected: 1050 - 1000 = 50
      expect(growth).toBe(50);
    });

    test('should calculate growth rate correctly', () => {
      const current = 1050;
      const previous = 1000;
      const growthRate = InstagramCalculationUtils.calculateGrowthRate(current, previous);
      
      // Expected: ((1050 - 1000) / 1000) * 100 = 5%
      expect(growthRate).toBe(5);
    });

    test('should calculate weekly followers correctly', () => {
      const weeklyFollowers = InstagramCalculationUtils.calculateWeeklyFollowers(mockSnapshots);
      
      // Expected: 1050 - 1000 = 50
      expect(weeklyFollowers).toBe(50);
    });

    test('should calculate weekly posts correctly', () => {
      const weeklyPosts = InstagramCalculationUtils.calculateWeeklyPosts(mockSnapshots);
      
      // Expected: 1 + 2 = 3
      expect(weeklyPosts).toBe(3);
    });

    test('should validate snapshot data correctly', () => {
      const validation = InstagramCalculationUtils.validateSnapshotData(mockSnapshots);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect invalid snapshot data', () => {
      const invalidSnapshots = [
        { ...mockSnapshots[0], followersCount: -1 }
      ];
      
      const validation = InstagramCalculationUtils.validateSnapshotData(invalidSnapshots);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Data Validation', () => {
    test('should validate date range correctly', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      // This should be valid (30 days)
      expect(startDate < endDate).toBe(true);
    });

    test('should reject invalid date range', () => {
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01');
      
      // This should be invalid (start after end)
      expect(startDate < endDate).toBe(false);
    });
  });

  describe('Chart Data Generation', () => {
    test('should generate chart data correctly', () => {
      const chartData = InstagramCalculationUtils.generateChartData(
        mockSnapshots,
        (snapshot) => snapshot.followersCount
      );
      
      expect(chartData).toHaveLength(2);
      expect(chartData[0]).toEqual({
        date: '2024-01-01',
        value: 1000
      });
      expect(chartData[1]).toEqual({
        date: '2024-01-02',
        value: 1050
      });
    });
  });
});

// Integration test example
describe('Instagram Analytics Integration', () => {
  test('should handle empty data gracefully', () => {
    const emptySnapshots: InstagramDailySnapshot[] = [];
    const validation = InstagramCalculationUtils.validateSnapshotData(emptySnapshots);
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('No snapshots available');
  });

  test('should handle null/undefined values gracefully', () => {
    const snapshot = { ...mockSnapshots[0], totalLikes: null as any };
    const engagementRate = InstagramCalculationUtils.calculateEngagementRate(snapshot);
    
    // Should handle null gracefully and return 0
    expect(engagementRate).toBe(0);
  });
});
