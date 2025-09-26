import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';

// Use Prisma types for type safety
type TikTokDailySnapshot = Prisma.TikTokDailySnapshotGetPayload<{}>;
type TikTokBusinessProfile = Prisma.TikTokBusinessProfileGetPayload<{}>;

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

// Mock data generator for TikTok snapshots
const generateMockTikTokSnapshots = (businessProfileId: string, days: number = 30): MockTikTokSnapshot[] => {
  const snapshots: MockTikTokSnapshot[] = [];
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - days);

  // Starting metrics (point-in-time, not cumulative)
  let followers = 15000;
  let following = 500;
  let videoCount = 120;

  for (let i = 0; i < days; i++) {
    const snapshotDate = new Date(baseDate);
    snapshotDate.setDate(snapshotDate.getDate() + i);
    
    // Simulate realistic TikTok growth patterns with some randomness
    
    // Followers growth (more volatile than Instagram)
    const followerGrowth = Math.floor(Math.random() * 100) - 20; // -20 to +80 per day
    followers = Math.max(10000, followers + followerGrowth);
    
    // Following growth (less frequent)
    if (Math.random() < 0.2) { // 20% chance of following change
      const followingChange = Math.floor(Math.random() * 10) - 5; // -5 to +5 per day
      following = Math.max(200, following + followingChange);
    }
    
    // Video count growth (more frequent than Instagram posts)
    if (Math.random() < 0.6) { // 60% chance of new video
      videoCount += 1;
    }
    
    // Generate realistic daily engagement metrics (not cumulative)
    const baseDailyLikes = Math.floor(Math.random() * 500) + 100; // 100-600 likes per day
    const baseDailyComments = Math.floor(Math.random() * 50) + 10; // 10-60 comments per day
    const baseDailyViews = Math.floor(Math.random() * 5000) + 1000; // 1000-6000 views per day
    const baseDailyShares = Math.floor(Math.random() * 100) + 20; // 20-120 shares per day
    const baseDailyDownloads = Math.floor(Math.random() * 50) + 5; // 5-55 downloads per day
    
    // Add variation based on day of week and special events
    const isWeekend = snapshotDate.getDay() === 0 || snapshotDate.getDay() === 6;
    const isSpecialDay = Math.random() < 0.15; // 15% chance of viral day
    const isViralDay = Math.random() < 0.05; // 5% chance of going viral
    
    let dailyLikes = baseDailyLikes;
    let dailyComments = baseDailyComments;
    let dailyViews = baseDailyViews;
    let dailyShares = baseDailyShares;
    let dailyDownloads = baseDailyDownloads;
    
    if (isWeekend || isSpecialDay) {
      dailyLikes = Math.floor(baseDailyLikes * 1.8); // 80% more on weekends/special days
      dailyComments = Math.floor(baseDailyComments * 1.6);
      dailyViews = Math.floor(baseDailyViews * 2.0);
      dailyShares = Math.floor(baseDailyShares * 1.5);
      dailyDownloads = Math.floor(baseDailyDownloads * 1.3);
    }
    
    if (isViralDay) {
      dailyLikes = Math.floor(baseDailyLikes * 5.0); // 5x on viral days
      dailyComments = Math.floor(baseDailyComments * 4.0);
      dailyViews = Math.floor(baseDailyViews * 8.0);
      dailyShares = Math.floor(baseDailyShares * 3.0);
      dailyDownloads = Math.floor(baseDailyDownloads * 2.0);
    }
    
    // Add some randomness to daily metrics
    const variation = 0.7 + Math.random() * 0.6; // 70% to 130% variation
    dailyLikes = Math.floor(dailyLikes * variation);
    dailyComments = Math.floor(dailyComments * variation);
    dailyViews = Math.floor(dailyViews * variation);
    dailyShares = Math.floor(dailyShares * variation);
    dailyDownloads = Math.floor(dailyDownloads * variation);
    
    // Calculate derived metrics
    const engagementRate = videoCount > 0 ? ((dailyLikes + dailyComments + dailyShares) / followers) * 100 : 0;
    const avgLikesPerVideo = videoCount > 0 ? dailyLikes / videoCount : 0;
    const avgCommentsPerVideo = videoCount > 0 ? dailyComments / videoCount : 0;
    const avgViewsPerVideo = videoCount > 0 ? dailyViews / videoCount : 0;
    const avgSharesPerVideo = videoCount > 0 ? dailyShares / videoCount : 0;
    const avgDownloadsPerVideo = videoCount > 0 ? dailyDownloads / videoCount : 0;
    const commentsRatio = dailyLikes > 0 ? (dailyComments / dailyLikes) * 100 : 0;
    const followersRatio = following > 0 ? (followers / following) : 0;
    
    // Calculate growth metrics
    const followersGrowth = i > 0 ? followers - snapshots[i - 1].followerCount : 0;
    const followingGrowth = i > 0 ? following - snapshots[i - 1].followingCount : 0;
    const videoGrowth = i > 0 ? videoCount - snapshots[i - 1].videoCount : 0;
    
    // Calculate weekly and monthly growth (simplified)
    const weeklyFollowersGrowth = i >= 7 ? followers - snapshots[i - 7].followerCount : followersGrowth;
    const monthlyFollowersGrowth = i >= 30 ? followers - snapshots[i - 30].followerCount : weeklyFollowersGrowth;
    
    // Simulate some error days
    const hasErrors = Math.random() < 0.03; // 3% chance of errors
    
    // Generate heart count (total likes accumulated)
    const heartCount = Math.floor(followers * 0.1) + Math.floor(Math.random() * 10000);
    
    // Generate digg count (total videos liked by user)
    const diggCount = Math.floor(followers * 0.05) + Math.floor(Math.random() * 1000);

    const snapshot: MockTikTokSnapshot = {
      id: uuidv4(),
      businessProfileId,
      snapshotDate: snapshotDate.toISOString(),
      snapshotTime: new Date().toISOString(),
      snapshotType: 'DAILY',
      followerCount: followers,
      followingCount: following,
      heartCount: heartCount,
      videoCount: videoCount,
      diggCount: diggCount,
      totalLikes: dailyLikes,
      totalComments: dailyComments,
      totalShares: dailyShares,
      totalViews: dailyViews,
      totalDownloads: dailyDownloads,
      newVideos: Math.random() < 0.6 ? 1 : 0,
      newComments: dailyComments,
      hasErrors,
      errorMessage: hasErrors ? 'TikTok API rate limit exceeded' : null,
      createdAt: new Date().toISOString()
    };
    
    snapshots.push(snapshot);
  }
  
  return snapshots;
};

// Function to insert mock data
export const insertMockTikTokData = async () => {
  try {
    const { default: supabase } = await import('../src/supabase/supabaseClient');
    
    console.log('🎵 Starting mock TikTok data insertion...');
    
    // First, let's find an existing TikTok business profile
    const { data: profiles, error: profileError } = await supabase
      .from('TikTokBusinessProfile')
      .select('id, username')
      .limit(1);
    
    if (profileError) {
      console.error('❌ Error fetching profiles:', profileError);
      return;
    }
    
    if (!profiles || profiles.length === 0) {
      console.log('❌ No TikTok business profiles found. Please create one first.');
      return;
    }
    
    const profile = profiles[0];
    console.log(`📱 Found profile: @${profile.username} (${profile.id})`);
    
    // Check if snapshots already exist
    const { data: existingSnapshots, error: snapshotError } = await supabase
      .from('TikTokDailySnapshot')
      .select('id')
      .eq('businessProfileId', profile.id)
      .limit(1);
    
    if (snapshotError) {
      console.error('❌ Error checking existing snapshots:', snapshotError);
      return;
    }
    
    if (existingSnapshots && existingSnapshots.length > 0) {
      console.log('⚠️  Snapshots already exist for this profile. Continuing with mock data insertion...');
    }
    
    // Generate mock snapshots for the last 30 days
    const mockSnapshots = generateMockTikTokSnapshots(profile.id, 30);
    
    console.log(`📊 Generated ${mockSnapshots.length} mock snapshots`);
    
    // Insert snapshots in batches
    const batchSize = 10;
    let insertedCount = 0;
    
    for (let i = 0; i < mockSnapshots.length; i += batchSize) {
      const batch = mockSnapshots.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('TikTokDailySnapshot')
        .insert(batch);
      
      if (insertError) {
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError);
        continue;
      }
      
      insertedCount += batch.length;
      console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} snapshots`);
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Update the business profile with current metrics
    const latestSnapshot = mockSnapshots[mockSnapshots.length - 1];
    const firstSnapshot = mockSnapshots[0];
    
    const { error: updateError } = await supabase
      .from('TikTokBusinessProfile')
      .update({
        followerCount: latestSnapshot.followerCount,
        followingCount: latestSnapshot.followingCount,
        videoCount: latestSnapshot.videoCount,
        heartCount: latestSnapshot.heartCount,
        diggCount: latestSnapshot.diggCount,
        firstSnapshotAt: firstSnapshot.snapshotDate,
        lastSnapshotAt: latestSnapshot.snapshotDate,
        totalSnapshots: mockSnapshots.length,
        updatedAt: new Date().toISOString()
      })
      .eq('id', profile.id);
    
    if (updateError) {
      console.error('❌ Error updating business profile:', updateError);
    } else {
      console.log('✅ Updated business profile with current metrics');
    }
    
    console.log(`🎉 Successfully inserted ${insertedCount} mock snapshots!`);
    console.log(`📈 Current metrics:`);
    console.log(`   - Followers: ${latestSnapshot.followerCount.toLocaleString()}`);
    console.log(`   - Following: ${latestSnapshot.followingCount.toLocaleString()}`);
    console.log(`   - Videos: ${latestSnapshot.videoCount.toLocaleString()}`);
    console.log(`   - Daily Likes: ${latestSnapshot.totalLikes.toLocaleString()}`);
    console.log(`   - Daily Comments: ${latestSnapshot.totalComments.toLocaleString()}`);
    console.log(`   - Daily Views: ${latestSnapshot.totalViews.toLocaleString()}`);
    console.log(`   - Daily Shares: ${latestSnapshot.totalShares.toLocaleString()}`);
    console.log(`   - Daily Downloads: ${latestSnapshot.totalDownloads.toLocaleString()}`);
    console.log(`   - Heart Count: ${latestSnapshot.heartCount.toLocaleString()}`);
    console.log(`   - Digg Count: ${latestSnapshot.diggCount.toLocaleString()}`);
    
    console.log('\n🌐 You can now view the analytics zones on the TikTok dashboard!');
    
  } catch (error) {
    console.error('❌ Error in mock data insertion:', error);
  }
};

export { generateMockTikTokSnapshots };
