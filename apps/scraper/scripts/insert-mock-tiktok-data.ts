import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

interface MockTikTokSnapshot {
  id: string;
  businessProfileId: string;
  snapshotDate: string;
  snapshotTime: string;
  snapshotType: 'DAILY';
  followerCount: number;
  followingCount: number;
  heartCount: number;
  videoCount: number;
  diggCount: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  totalDownloads: number;
  newVideos: number;
  newComments: number;
  hasErrors: boolean;
  errorMessage: string | null;
  createdAt: string;
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const generateMockTikTokSnapshots = (businessProfileId: string, days: number = 30): MockTikTokSnapshot[] => {
  const snapshots: MockTikTokSnapshot[] = [];
  const baseFollowers = 15000;
  const baseFollowing = 500;
  const baseHeartCount = 250000;
  const baseVideoCount = 120;
  const baseDiggCount = 50000;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Add some realistic variation
    const followerVariation = Math.floor(Math.random() * 50) - 25; // -25 to +25
    const followingVariation = Math.floor(Math.random() * 10) - 5; // -5 to +5
    const heartVariation = Math.floor(Math.random() * 1000) - 500; // -500 to +500
    const videoVariation = Math.floor(Math.random() * 2); // 0 to +2
    const diggVariation = Math.floor(Math.random() * 200) - 100; // -100 to +100
    
    // Calculate totals based on base values and variations
    const currentFollowers = baseFollowers + (days - i) * 15 + followerVariation; // Gradual growth
    const currentFollowing = baseFollowing + followingVariation;
    const currentHeartCount = baseHeartCount + (days - i) * 500 + heartVariation;
    const currentVideoCount = baseVideoCount + videoVariation;
    const currentDiggCount = baseDiggCount + (days - i) * 50 + diggVariation;
    
    // Calculate engagement metrics
    const totalLikes = Math.floor(currentHeartCount * 0.8);
    const totalComments = Math.floor(currentFollowers * 0.02);
    const totalShares = Math.floor(currentFollowers * 0.01);
    const totalViews = Math.floor(currentVideoCount * 50000);
    const totalDownloads = Math.floor(currentVideoCount * 1000);
    
    // New content metrics
    const newVideos = Math.random() > 0.7 ? 1 : 0; // 30% chance of new video
    const newComments = Math.floor(Math.random() * 20) + 5; // 5-25 new comments
    
    snapshots.push({
      id: `mock-tiktok-snapshot-${i}`,
      businessProfileId,
      snapshotDate: date.toISOString().split('T')[0],
      snapshotTime: date.toISOString(),
      snapshotType: 'DAILY',
      followerCount: currentFollowers,
      followingCount: currentFollowing,
      heartCount: currentHeartCount,
      videoCount: currentVideoCount,
      diggCount: currentDiggCount,
      totalLikes,
      totalComments,
      totalShares,
      totalViews,
      totalDownloads,
      newVideos,
      newComments,
      hasErrors: false,
      errorMessage: null,
      createdAt: date.toISOString(),
    });
  }
  
  return snapshots;
};

export const insertMockTikTokData = async () => {
  try {
    console.log('🎵 Starting TikTok mock data insertion...');
    
    // First, create a mock business profile
    const mockBusinessProfile = {
      id: 'mock-tiktok-business-profile',
      teamId: 'e5afb14c-4f1d-4747-bf29-7cfcf0223737', // Use the same team ID as Instagram
      username: 'mocktiktokuser',
      nickname: 'Mock TikTok User',
      avatarUrl: 'https://via.placeholder.com/150',
      signature: 'Mock TikTok business account for testing',
      followerCount: 15000,
      followingCount: 500,
      heartCount: 250000,
      videoCount: 120,
      diggCount: 50000,
      verified: true,
      privateAccount: false,
      isBusinessAccount: true,
      category: 'Entertainment',
      isActive: true,
      totalSnapshots: 0,
    };
    
    // Insert business profile
    const { error: profileError } = await supabase
      .from('TikTokBusinessProfile')
      .upsert(mockBusinessProfile, { onConflict: 'id' });
    
    if (profileError) {
      console.error('Error creating TikTok business profile:', profileError);
      return;
    }
    
    console.log('✅ TikTok business profile created');
    
    // Generate and insert snapshots
    const snapshots = generateMockTikTokSnapshots(mockBusinessProfile.id, 30);
    
    for (const snapshot of snapshots) {
      const { error: snapshotError } = await supabase
        .from('TikTokDailySnapshot')
        .upsert(snapshot, { onConflict: 'id' });
      
      if (snapshotError) {
        console.error('Error inserting TikTok snapshot:', snapshotError);
      }
    }
    
    // Update the business profile with snapshot count
    await supabase
      .from('TikTokBusinessProfile')
      .update({ 
        totalSnapshots: snapshots.length,
        firstSnapshotAt: snapshots[snapshots.length - 1].createdAt,
        lastSnapshotAt: snapshots[0].createdAt
      })
      .eq('id', mockBusinessProfile.id);
    
    console.log(`✅ Inserted ${snapshots.length} TikTok snapshots`);
    console.log('🎵 TikTok mock data insertion completed!');
    
  } catch (error) {
    console.error('❌ Error inserting TikTok mock data:', error);
  }
};

// Run the script if called directly
if (require.main === module) {
  insertMockTikTokData()
    .then(() => {
      console.log('🎵 TikTok mock data script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ TikTok mock data script failed:', error);
      process.exit(1);
    });
} 