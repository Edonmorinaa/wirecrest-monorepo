import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ===========================================
// INSTAGRAM MOCK DATA GENERATOR
// ===========================================

interface InstagramMockSnapshot {
  id: string;
  businessProfileId: string;
  snapshotDate: string;
  snapshotTime: string;
  snapshotType: 'DAILY';
  followersCount: number;
  followingCount: number;
  mediaCount: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  totalSaves: number;
  totalShares: number;
  newPosts: number;
  newStories: number;
  newReels: number;
  storyViews: number;
  storyReplies: number;
  hasErrors: boolean;
  errorMessage: string | null;
  createdAt: string;
}

const generateInstagramSnapshots = (businessProfileId: string, days: number = 365): InstagramMockSnapshot[] => {
  const snapshots: InstagramMockSnapshot[] = [];
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - days);

  // Starting metrics (realistic for a growing business account)
  let followers = 2500;
  let following = 1200;
  let mediaCount = 85;

  for (let i = 0; i < days; i++) {
    const snapshotDate = new Date(baseDate);
    snapshotDate.setDate(snapshotDate.getDate() + i);
    
    // Simulate realistic growth patterns with seasonal variations
    
    // Followers growth with seasonal patterns
    const month = snapshotDate.getMonth();
    const isHolidaySeason = month === 11 || month === 0; // December/January
    const isSummer = month >= 5 && month <= 8; // June-September
    
    let followerGrowth = 0;
    if (isHolidaySeason) {
      followerGrowth = Math.floor(Math.random() * 25) + 10; // 10-35 per day during holidays
    } else if (isSummer) {
      followerGrowth = Math.floor(Math.random() * 20) + 8; // 8-28 per day during summer
    } else {
      followerGrowth = Math.floor(Math.random() * 15) + 5; // 5-20 per day normally
    }
    
    // Add some negative growth occasionally (unfollows)
    if (Math.random() < 0.15) { // 15% chance of negative growth
      followerGrowth = Math.floor(Math.random() * 8) - 12; // -12 to -5
    }
    
    followers = Math.max(1000, followers + followerGrowth);
    
    // Following growth (less frequent changes)
    if (Math.random() < 0.2) { // 20% chance of following change
      const followingChange = Math.floor(Math.random() * 10) - 5; // -5 to +5 per day
      following = Math.max(800, following + followingChange);
    }
    
    // Media count growth (occasional new posts)
    if (Math.random() < 0.3) { // 30% chance of new post
      mediaCount += 1;
    }
    
    // Generate realistic daily engagement metrics
    const baseDailyLikes = Math.floor(Math.random() * 80) + 20; // 20-100 likes per day
    const baseDailyComments = Math.floor(Math.random() * 15) + 3; // 3-18 comments per day
    const baseDailyViews = Math.floor(Math.random() * 300) + 100; // 100-400 views per day
    
    // Add variation based on day of week and special events
    const isWeekend = snapshotDate.getDay() === 0 || snapshotDate.getDay() === 6;
    const isSpecialDay = Math.random() < 0.08; // 8% chance of special day (viral post, etc.)
    
    let dailyLikes = baseDailyLikes;
    let dailyComments = baseDailyComments;
    let dailyViews = baseDailyViews;
    
    if (isWeekend || isSpecialDay) {
      dailyLikes = Math.floor(baseDailyLikes * 1.6); // 60% more on weekends/special days
      dailyComments = Math.floor(baseDailyComments * 1.4);
      dailyViews = Math.floor(baseDailyViews * 1.5);
    }
    
    // Add some randomness to daily metrics
    const variation = 0.7 + Math.random() * 0.6; // 70% to 130% variation
    dailyLikes = Math.floor(dailyLikes * variation);
    dailyComments = Math.floor(dailyComments * variation);
    dailyViews = Math.floor(dailyViews * variation);
    
    // Simulate some error days
    const hasErrors = Math.random() < 0.03; // 3% chance of errors
    
    const snapshot: InstagramMockSnapshot = {
      id: uuidv4(),
      businessProfileId,
      snapshotDate: snapshotDate.toISOString(),
      snapshotTime: new Date().toISOString(),
      snapshotType: 'DAILY',
      followersCount: followers,
      followingCount: following,
      mediaCount: mediaCount,
      totalLikes: dailyLikes,
      totalComments: dailyComments,
      totalViews: dailyViews,
      totalSaves: Math.floor(dailyLikes * 0.25), // 25% of daily likes
      totalShares: Math.floor(dailyLikes * 0.08), // 8% of daily likes
      newPosts: Math.random() < 0.3 ? 1 : 0,
      newStories: Math.floor(Math.random() * 4) + 1, // 1-4 stories per day
      newReels: Math.random() < 0.15 ? 1 : 0, // 15% chance of new reel
      storyViews: Math.floor(followers * 0.35 * (0.8 + Math.random() * 0.4)),
      storyReplies: Math.floor(Math.random() * 15) + 2,
      hasErrors,
      errorMessage: hasErrors ? 'Temporary API rate limit' : null,
      createdAt: new Date().toISOString()
    };
    
    snapshots.push(snapshot);
  }
  
  return snapshots;
};

// ===========================================
// TIKTOK MOCK DATA GENERATOR
// ===========================================

interface TikTokMockSnapshot {
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

const generateTikTokSnapshots = (businessProfileId: string, days: number = 365): TikTokMockSnapshot[] => {
  const snapshots: TikTokMockSnapshot[] = [];
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - days);

  // Starting metrics (realistic for a growing TikTok business account)
  let followers = 18000;
  let following = 600;
  let heartCount = 320000;
  let videoCount = 150;
  let diggCount = 65000;

  for (let i = 0; i < days; i++) {
    const snapshotDate = new Date(baseDate);
    snapshotDate.setDate(snapshotDate.getDate() + i);
    
    // Simulate realistic TikTok growth patterns
    
    // Follower growth with viral potential
    const month = snapshotDate.getMonth();
    const isHolidaySeason = month === 11 || month === 0; // December/January
    const isSummer = month >= 5 && month <= 8; // June-September
    
    let followerGrowth = 0;
    if (isHolidaySeason) {
      followerGrowth = Math.floor(Math.random() * 150) + 50; // 50-200 per day during holidays
    } else if (isSummer) {
      followerGrowth = Math.floor(Math.random() * 100) + 30; // 30-130 per day during summer
    } else {
      followerGrowth = Math.floor(Math.random() * 80) + 20; // 20-100 per day normally
    }
    
    // Add viral growth potential (TikTok is more volatile)
    if (Math.random() < 0.05) { // 5% chance of viral growth
      followerGrowth += Math.floor(Math.random() * 500) + 200; // 200-700 extra followers
    }
    
    // Add some negative growth occasionally
    if (Math.random() < 0.12) { // 12% chance of negative growth
      followerGrowth = Math.floor(Math.random() * 20) - 30; // -30 to -10
    }
    
    followers = Math.max(5000, followers + followerGrowth);
    
    // Following growth (less frequent)
    if (Math.random() < 0.15) { // 15% chance of following change
      const followingChange = Math.floor(Math.random() * 15) - 8; // -8 to +7 per day
      following = Math.max(300, following + followingChange);
    }
    
    // Heart count growth (hearts from videos)
    const heartGrowth = Math.floor(Math.random() * 2000) + 500; // 500-2500 hearts per day
    heartCount += heartGrowth;
    
    // Video count growth (new content)
    if (Math.random() < 0.25) { // 25% chance of new video
      videoCount += 1;
    }
    
    // Digg count growth (likes given)
    const diggGrowth = Math.floor(Math.random() * 300) + 100; // 100-400 digs per day
    diggCount += diggGrowth;
    
    // Calculate engagement metrics
    const totalLikes = Math.floor(heartCount * 0.75); // 75% of heart count
    const totalComments = Math.floor(followers * 0.015); // 1.5% of followers
    const totalShares = Math.floor(followers * 0.008); // 0.8% of followers
    const totalViews = Math.floor(videoCount * 75000); // 75k views per video on average
    const totalDownloads = Math.floor(videoCount * 1500); // 1.5k downloads per video
    
    // New content metrics
    const newVideos = Math.random() < 0.25 ? 1 : 0; // 25% chance of new video
    const newComments = Math.floor(Math.random() * 30) + 8; // 8-38 new comments
    
    // Simulate some error days
    const hasErrors = Math.random() < 0.02; // 2% chance of errors
    
    snapshots.push({
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
      totalLikes,
      totalComments,
      totalShares,
      totalViews,
      totalDownloads,
      newVideos,
      newComments,
      hasErrors,
      errorMessage: hasErrors ? 'Temporary API rate limit' : null,
      createdAt: new Date().toISOString()
    });
  }
  
  return snapshots;
};

// ===========================================
// MAIN SCRIPT FUNCTIONS
// ===========================================

const createInstagramBusinessProfile = async (teamId: string) => {
  const mockProfile = {
    id: uuidv4(),
    teamId,
    username: 'mock_instagram_business',
    userId: 'mock_user_id_123',
    profileUrl: 'https://instagram.com/mock_instagram_business',
    fullName: 'Mock Instagram Business',
    biography: 'Mock business account for testing and development',
    website: 'https://mockbusiness.com',
    isVerified: true,
    isBusinessAccount: true,
    category: 'Business',
    contactEmail: 'contact@mockbusiness.com',
    contactPhone: '+1-555-0123',
    contactAddress: 'Mock City, MC',
    currentFollowersCount: 0,
    currentFollowingCount: 0,
    currentMediaCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const { error } = await supabase
    .from('InstagramBusinessProfile')
    .upsert(mockProfile, { onConflict: 'id' });

  if (error) {
    console.error('Error creating Instagram business profile:', error);
    return null;
  }

  console.log('✅ Instagram business profile created');
  return mockProfile.id;
};

const createTikTokBusinessProfile = async (teamId: string) => {
  const mockProfile = {
    id: uuidv4(),
    teamId,
    username: 'mocktiktokbusiness',
    nickname: 'Mock TikTok Business',
    avatarUrl: 'https://via.placeholder.com/150',
    signature: 'Mock TikTok business account for testing and development',
    followerCount: 0,
    followingCount: 0,
    heartCount: 0,
    videoCount: 0,
    diggCount: 0,
    verified: true,
    privateAccount: false,
    isBusinessAccount: true,
    category: 'Business',
    contactEmail: 'contact@mockbusiness.com',
    contactPhone: '+1-555-0123',
    website: 'https://mockbusiness.com',
    location: 'Mock City, MC',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const { error } = await supabase
    .from('TikTokBusinessProfile')
    .upsert(mockProfile, { onConflict: 'id' });

  if (error) {
    console.error('Error creating TikTok business profile:', error);
    return null;
  }

  console.log('✅ TikTok business profile created');
  return mockProfile.id;
};

const insertSnapshots = async (tableName: string, snapshots: any[], batchSize: number = 20) => {
  let insertedCount = 0;
  
  for (let i = 0; i < snapshots.length; i += batchSize) {
    const batch = snapshots.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from(tableName)
      .insert(batch);
    
    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
      continue;
    }
    
    insertedCount += batch.length;
    console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} snapshots`);
    
    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return insertedCount;
};

const updateBusinessProfile = async (tableName: string, profileId: string, latestSnapshot: any, firstSnapshot: any, totalSnapshots: number) => {
  let updateData: any = {
    currentFollowersCount: latestSnapshot.followersCount || latestSnapshot.followerCount,
    currentFollowingCount: latestSnapshot.followingCount,
    currentMediaCount: latestSnapshot.mediaCount || latestSnapshot.videoCount,
    firstSnapshotAt: firstSnapshot.snapshotDate,
    lastSnapshotAt: latestSnapshot.snapshotDate,
    totalSnapshots,
    updatedAt: new Date().toISOString()
  };

  // Handle TikTok specific fields
  if (tableName === 'TikTokBusinessProfile') {
    updateData.currentFollowersCount = latestSnapshot.followerCount;
    updateData.currentMediaCount = latestSnapshot.videoCount;
    updateData.heartCount = latestSnapshot.heartCount;
    updateData.diggCount = latestSnapshot.diggCount;
  }

  const { error } = await supabase
    .from(tableName)
    .update(updateData)
    .eq('id', profileId);

  if (error) {
    console.error(`❌ Error updating ${tableName}:`, error);
    return false;
  }

  console.log(`✅ Updated ${tableName} with current metrics`);
  return true;
};

// ===========================================
// MAIN EXECUTION FUNCTION
// ===========================================

export const insert6MonthsMockData = async () => {
  try {
    console.log('🎭 Starting 1-year mock data insertion for Instagram and TikTok...');
    
    // Use the provided team ID
    const teamId = 'ab932ea4-a66b-48b2-ac74-5edfa544b68a';
    
    // Create business profiles
    const instagramProfileId = await createInstagramBusinessProfile(teamId);
    const tiktokProfileId = await createTikTokBusinessProfile(teamId);
    
    if (!instagramProfileId || !tiktokProfileId) {
      console.error('❌ Failed to create business profiles');
      return;
    }
    
    // Generate 1 year (365 days) of snapshots
    const days = 365;
    console.log(`📊 Generating ${days} days of snapshots for both platforms...`);
    
    // Generate Instagram snapshots
    const instagramSnapshots = generateInstagramSnapshots(instagramProfileId, days);
    console.log(`📸 Generated ${instagramSnapshots.length} Instagram snapshots`);
    
    // Generate TikTok snapshots
    const tiktokSnapshots = generateTikTokSnapshots(tiktokProfileId, days);
    console.log(`🎵 Generated ${tiktokSnapshots.length} TikTok snapshots`);
    
    // Insert Instagram snapshots
    console.log('\n📸 Inserting Instagram snapshots...');
    const instagramInserted = await insertSnapshots('InstagramDailySnapshot', instagramSnapshots);
    
    // Insert TikTok snapshots
    console.log('\n🎵 Inserting TikTok snapshots...');
    const tiktokInserted = await insertSnapshots('TikTokDailySnapshot', tiktokSnapshots);
    
    // Update business profiles with current metrics
    console.log('\n📈 Updating business profiles...');
    await updateBusinessProfile(
      'InstagramBusinessProfile',
      instagramProfileId,
      instagramSnapshots[instagramSnapshots.length - 1],
      instagramSnapshots[0],
      instagramInserted
    );
    
    await updateBusinessProfile(
      'TikTokBusinessProfile',
      tiktokProfileId,
      tiktokSnapshots[tiktokSnapshots.length - 1],
      tiktokSnapshots[0],
      tiktokInserted
    );
    
    // Display final statistics
    const latestInstagram = instagramSnapshots[instagramSnapshots.length - 1];
    const latestTikTok = tiktokSnapshots[tiktokSnapshots.length - 1];
    
    console.log('\n🎉 Successfully inserted 1 year of mock data!');
    console.log('\n📊 Final Statistics:');
    console.log('\n📸 Instagram:');
    console.log(`   - Total Snapshots: ${instagramInserted}`);
    console.log(`   - Followers: ${latestInstagram.followersCount.toLocaleString()}`);
    console.log(`   - Following: ${latestInstagram.followingCount.toLocaleString()}`);
    console.log(`   - Posts: ${latestInstagram.mediaCount.toLocaleString()}`);
    console.log(`   - Daily Likes: ${latestInstagram.totalLikes.toLocaleString()}`);
    console.log(`   - Daily Comments: ${latestInstagram.totalComments.toLocaleString()}`);
    console.log(`   - Daily Views: ${latestInstagram.totalViews.toLocaleString()}`);
    
    console.log('\n🎵 TikTok:');
    console.log(`   - Total Snapshots: ${tiktokInserted}`);
    console.log(`   - Followers: ${latestTikTok.followerCount.toLocaleString()}`);
    console.log(`   - Following: ${latestTikTok.followingCount.toLocaleString()}`);
    console.log(`   - Videos: ${latestTikTok.videoCount.toLocaleString()}`);
    console.log(`   - Hearts: ${latestTikTok.heartCount.toLocaleString()}`);
    console.log(`   - Total Likes: ${latestTikTok.totalLikes.toLocaleString()}`);
    console.log(`   - Total Comments: ${latestTikTok.totalComments.toLocaleString()}`);
    console.log(`   - Total Views: ${latestTikTok.totalViews.toLocaleString()}`);
    
    console.log('\n🌐 You can now view the analytics zones on both Instagram and TikTok dashboards!');
    console.log('📅 Data covers the last 1 year with realistic growth patterns and seasonal variations.');
    
  } catch (error) {
    console.error('❌ Error in 1-year mock data insertion:', error);
  }
};

// Run the script if called directly
if (require.main === module) {
  insert6MonthsMockData()
    .then(() => {
      console.log('\n✅ 1-year mock data script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 1-year mock data script failed:', error);
      process.exit(1);
    });
}

export { generateInstagramSnapshots, generateTikTokSnapshots }; 