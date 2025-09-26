import { v4 as uuidv4 } from 'uuid';

interface TikTokMockSnapshot {
  id: string;
  businessProfileId: string;
  snapshotDate: string;
  snapshotTime: string;
  snapshotType: 'DAILY';
  followerCount: number;
  followingCount: number;
  videoCount: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  totalShares: number;
  totalDownloads: number;
  newVideos: number;
  newLikes: number;
  newComments: number;
  newViews: number;
  newShares: number;
  newDownloads: number;
  engagementRate: number;
  avgLikesPerVideo: number;
  avgCommentsPerVideo: number;
  avgViewsPerVideo: number;
  avgSharesPerVideo: number;
  avgDownloadsPerVideo: number;
  commentsRatio: number;
  followersRatio: number;
  followersGrowth: number;
  followingGrowth: number;
  videoGrowth: number;
  weeklyFollowersGrowth: number;
  monthlyFollowersGrowth: number;
  hasErrors: boolean;
  errorMessage: string | null;
  createdAt: string;
}

const generateTikTokSnapshots = (businessProfileId: string, days: number = 180): TikTokMockSnapshot[] => {
  const snapshots: TikTokMockSnapshot[] = [];
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - days);

  // Starting metrics with realistic TikTok values
  let followers = 50000;
  let following = 800;
  let videoCount = 300;

  for (let i = 0; i < days; i++) {
    const snapshotDate = new Date(baseDate);
    snapshotDate.setDate(snapshotDate.getDate() + i);
    
    // Simulate realistic TikTok growth patterns over 6 months
    
    // Followers growth with seasonal patterns
    const dayOfYear = snapshotDate.getDay();
    const month = snapshotDate.getMonth();
    
    // Seasonal growth patterns (higher in summer, lower in winter)
    const seasonalMultiplier = 1 + (Math.sin((month / 12) * 2 * Math.PI) * 0.3);
    
    // Weekend vs weekday patterns
    const isWeekend = dayOfYear === 0 || dayOfYear === 6;
    const weekendMultiplier = isWeekend ? 1.5 : 1.0;
    
    // Viral content simulation (rare but impactful)
    const isViralDay = Math.random() < 0.02; // 2% chance of viral content
    const viralMultiplier = isViralDay ? 10 : 1;
    
    // Regular growth with seasonal and weekend effects
    const baseGrowth = Math.floor(Math.random() * 200) - 50; // -50 to +150 per day
    const followerGrowth = Math.floor(baseGrowth * seasonalMultiplier * weekendMultiplier * viralMultiplier);
    followers = Math.max(10000, followers + followerGrowth);
    
    // Following growth (more conservative)
    if (Math.random() < 0.15) { // 15% chance of following change
      const followingChange = Math.floor(Math.random() * 20) - 10; // -10 to +10 per day
      following = Math.max(300, following + followingChange);
    }
    
    // Video count growth (TikTok creators post more frequently)
    if (Math.random() < 0.7) { // 70% chance of new video
      videoCount += 1;
    }
    
    // Generate realistic daily engagement metrics
    const baseDailyLikes = Math.floor(Math.random() * 2000) + 500; // 500-2500 likes per day
    const baseDailyComments = Math.floor(Math.random() * 200) + 50; // 50-250 comments per day
    const baseDailyViews = Math.floor(Math.random() * 20000) + 5000; // 5000-25000 views per day
    const baseDailyShares = Math.floor(Math.random() * 500) + 100; // 100-600 shares per day
    const baseDailyDownloads = Math.floor(Math.random() * 200) + 20; // 20-220 downloads per day
    
    // Apply seasonal and viral effects to engagement
    let dailyLikes = Math.floor(baseDailyLikes * seasonalMultiplier * weekendMultiplier * viralMultiplier);
    let dailyComments = Math.floor(baseDailyComments * seasonalMultiplier * weekendMultiplier * viralMultiplier);
    let dailyViews = Math.floor(baseDailyViews * seasonalMultiplier * weekendMultiplier * viralMultiplier);
    let dailyShares = Math.floor(baseDailyShares * seasonalMultiplier * weekendMultiplier * viralMultiplier);
    let dailyDownloads = Math.floor(baseDailyDownloads * seasonalMultiplier * weekendMultiplier * viralMultiplier);
    
    // Add some randomness
    const variation = 0.6 + Math.random() * 0.8; // 60% to 140% variation
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
    
    // Calculate weekly and monthly growth
    const weeklyFollowersGrowth = i >= 7 ? followers - snapshots[i - 7].followerCount : followersGrowth;
    const monthlyFollowersGrowth = i >= 30 ? followers - snapshots[i - 30].followerCount : weeklyFollowersGrowth;
    
    // Simulate occasional errors
    const hasErrors = Math.random() < 0.02; // 2% chance of errors
    
    const snapshot: TikTokMockSnapshot = {
      id: uuidv4(),
      businessProfileId,
      snapshotDate: snapshotDate.toISOString(),
      snapshotTime: new Date().toISOString(),
      snapshotType: 'DAILY',
      followerCount: followers,
      followingCount: following,
      videoCount: videoCount,
      totalLikes: dailyLikes,
      totalComments: dailyComments,
      totalViews: dailyViews,
      totalShares: dailyShares,
      totalDownloads: dailyDownloads,
      newVideos: Math.random() < 0.7 ? 1 : 0,
      newLikes: dailyLikes,
      newComments: dailyComments,
      newViews: dailyViews,
      newShares: dailyShares,
      newDownloads: dailyDownloads,
      engagementRate: Math.round(engagementRate * 100) / 100,
      avgLikesPerVideo: Math.round(avgLikesPerVideo * 100) / 100,
      avgCommentsPerVideo: Math.round(avgCommentsPerVideo * 100) / 100,
      avgViewsPerVideo: Math.round(avgViewsPerVideo * 100) / 100,
      avgSharesPerVideo: Math.round(avgSharesPerVideo * 100) / 100,
      avgDownloadsPerVideo: Math.round(avgDownloadsPerVideo * 100) / 100,
      commentsRatio: Math.round(commentsRatio * 100) / 100,
      followersRatio: Math.round(followersRatio * 100) / 100,
      followersGrowth,
      followingGrowth,
      videoGrowth,
      weeklyFollowersGrowth,
      monthlyFollowersGrowth,
      hasErrors,
      errorMessage: hasErrors ? 'TikTok API rate limit exceeded' : null,
      createdAt: new Date().toISOString()
    };
    
    snapshots.push(snapshot);
  }
  
  return snapshots;
};

const createTikTokBusinessProfile = async (teamId: string) => {
  const { default: supabase } = await import('../src/supabase/supabaseClient');
  
  const mockProfile = {
    id: uuidv4(),
    teamId,
    username: 'mocktiktokbusiness',
    userId: 'mock_user_123',
    profileUrl: 'https://www.tiktok.com/@mocktiktokbusiness',
    fullName: 'Mock TikTok Business',
    biography: 'Mock TikTok business account for testing analytics',
    website: 'https://mockbusiness.com',
    isVerified: true,
    isBusinessAccount: true,
    category: 'Entertainment',
    currentFollowerCount: 50000,
    currentFollowingCount: 800,
    currentVideoCount: 300,
    firstSnapshotAt: null,
    lastSnapshotAt: null,
    totalSnapshots: 0,
    isActive: true,
    contactAddress: '123 Mock Street, Mock City',
    contactEmail: 'contact@mockbusiness.com',
    contactPhone: '+1-555-MOCK',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const { error } = await supabase
    .from('TikTokBusinessProfile')
    .insert(mockProfile);
  
  if (error) {
    console.error('Error creating TikTok business profile:', error);
    throw error;
  }
  
  console.log('✅ TikTok business profile created');
  return mockProfile;
};

const insertSnapshots = async (tableName: string, snapshots: any[], batchSize: number = 20) => {
  const { default: supabase } = await import('../src/supabase/supabaseClient');
  
  let insertedCount = 0;
  
  for (let i = 0; i < snapshots.length; i += batchSize) {
    const batch = snapshots.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from(tableName)
      .insert(batch);
    
    if (error) {
      console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
      continue;
    }
    
    insertedCount += batch.length;
    console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} snapshots`);
    
    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  return insertedCount;
};

const updateBusinessProfile = async (tableName: string, profileId: string, latestSnapshot: any, firstSnapshot: any, totalSnapshots: number) => {
  const { default: supabase } = await import('../src/supabase/supabaseClient');
  
  const updateData = {
    currentFollowerCount: latestSnapshot.followerCount,
    currentFollowingCount: latestSnapshot.followingCount,
    currentVideoCount: latestSnapshot.videoCount,
    firstSnapshotAt: firstSnapshot.snapshotDate,
    lastSnapshotAt: latestSnapshot.snapshotDate,
    totalSnapshots: totalSnapshots,
    updatedAt: new Date().toISOString()
  };
  
  const { error } = await supabase
    .from(tableName)
    .update(updateData)
    .eq('id', profileId);
  
  if (error) {
    console.error('Error updating business profile:', error);
    throw error;
  }
  
  console.log('✅ Updated business profile with current metrics');
};

export const insert6MonthsMockTikTokData = async () => {
  try {
    console.log('🎵 Starting 6 months TikTok mock data insertion...');
    
    // Create TikTok business profile
    const teamId = 'e5afb14c-4f1d-4747-bf29-7cfcf0223737'; // Use existing team ID
    const businessProfile = await createTikTokBusinessProfile(teamId);
    
    // Generate 6 months of snapshots (180 days)
    const snapshots = generateTikTokSnapshots(businessProfile.id, 180);
    console.log(`📊 Generated ${snapshots.length} TikTok snapshots`);
    
    // Insert snapshots
    const insertedCount = await insertSnapshots('TikTokDailySnapshot', snapshots);
    
    // Update business profile
    await updateBusinessProfile(
      'TikTokBusinessProfile',
      businessProfile.id,
      snapshots[snapshots.length - 1],
      snapshots[0],
      insertedCount
    );
    
    console.log(`🎉 Successfully inserted ${insertedCount} TikTok snapshots!`);
    console.log(`📈 Final metrics:`);
    console.log(`   - Followers: ${snapshots[snapshots.length - 1].followerCount.toLocaleString()}`);
    console.log(`   - Following: ${snapshots[snapshots.length - 1].followingCount.toLocaleString()}`);
    console.log(`   - Videos: ${snapshots[snapshots.length - 1].videoCount.toLocaleString()}`);
    console.log(`   - Engagement Rate: ${snapshots[snapshots.length - 1].engagementRate.toFixed(2)}%`);
    
    console.log('\n🌐 You can now view the TikTok analytics dashboard!');
    
  } catch (error) {
    console.error('❌ Error in 6 months TikTok mock data insertion:', error);
    throw error;
  }
};

// Run the script if called directly
if (require.main === module) {
  insert6MonthsMockTikTokData()
    .then(() => {
      console.log('🎵 6 months TikTok mock data script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 6 months TikTok mock data script failed:', error);
      process.exit(1);
    });
}
