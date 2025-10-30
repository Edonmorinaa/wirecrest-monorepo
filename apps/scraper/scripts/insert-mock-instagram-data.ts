// import { v4 as uuidv4 } from 'uuid';

// interface MockSnapshot {
//   id: string;
//   businessProfileId: string;
//   snapshotDate: string;
//   snapshotTime: string;
//   snapshotType: 'DAILY';
//   followersCount: number;
//   followingCount: number;
//   mediaCount: number;
//   totalLikes: number;
//   totalComments: number;
//   totalViews: number;
//   totalSaves: number;
//   totalShares: number;
//   newPosts: number;
//   newStories: number;
//   newReels: number;
//   storyViews: number;
//   storyReplies: number;
//   hasErrors: boolean;
//   errorMessage: string | null;
//   createdAt: string;
// }

// // Mock data generator for Instagram snapshots
// const generateMockSnapshots = (businessProfileId: string, days: number = 30): MockSnapshot[] => {
//   const snapshots: MockSnapshot[] = [];
//   const baseDate = new Date();
//   baseDate.setDate(baseDate.getDate() - days);

//   // Starting metrics (point-in-time, not cumulative)
//   let followers = 1500;
//   let following = 800;
//   let mediaCount = 45;

//   for (let i = 0; i < days; i++) {
//     const snapshotDate = new Date(baseDate);
//     snapshotDate.setDate(snapshotDate.getDate() + i);
    
//     // Simulate realistic growth patterns with some randomness
    
//     // Followers growth (more stable)
//     const followerGrowth = Math.floor(Math.random() * 15) - 5; // -5 to +10 per day
//     followers = Math.max(1000, followers + followerGrowth);
    
//     // Following growth (less frequent)
//     if (Math.random() < 0.3) { // 30% chance of following change
//       const followingChange = Math.floor(Math.random() * 8) - 4; // -4 to +4 per day
//       following = Math.max(500, following + followingChange);
//     }
    
//     // Media count growth (occasional new posts)
//     if (Math.random() < 0.4) { // 40% chance of new post
//       mediaCount += 1;
//     }
    
//     // Generate realistic daily engagement metrics (not cumulative)
//     const baseDailyLikes = Math.floor(Math.random() * 50) + 10; // 10-60 likes per day
//     const baseDailyComments = Math.floor(Math.random() * 10) + 2; // 2-12 comments per day
//     const baseDailyViews = Math.floor(Math.random() * 200) + 50; // 50-250 views per day
    
//     // Add variation based on day of week and special events
//     const isWeekend = snapshotDate.getDay() === 0 || snapshotDate.getDay() === 6;
//     const isSpecialDay = Math.random() < 0.1; // 10% chance of special day
    
//     let dailyLikes = baseDailyLikes;
//     let dailyComments = baseDailyComments;
//     let dailyViews = baseDailyViews;
    
//     if (isWeekend || isSpecialDay) {
//       dailyLikes = Math.floor(baseDailyLikes * 1.5); // 50% more on weekends/special days
//       dailyComments = Math.floor(baseDailyComments * 1.3);
//       dailyViews = Math.floor(baseDailyViews * 1.4);
//     }
    
//     // Add some randomness to daily metrics
//     const variation = 0.8 + Math.random() * 0.4; // 80% to 120% variation
//     dailyLikes = Math.floor(dailyLikes * variation);
//     dailyComments = Math.floor(dailyComments * variation);
//     dailyViews = Math.floor(dailyViews * variation);
    
//     // Simulate some error days
//     const hasErrors = Math.random() < 0.05; // 5% chance of errors
    
//     const snapshot: MockSnapshot = {
//       id: uuidv4(),
//       businessProfileId,
//       snapshotDate: snapshotDate.toISOString(),
//       snapshotTime: new Date().toISOString(),
//       snapshotType: 'DAILY',
//       followersCount: followers,
//       followingCount: following,
//       mediaCount: mediaCount,
//       // Daily engagement metrics (not cumulative)
//       totalLikes: dailyLikes,
//       totalComments: dailyComments,
//       totalViews: dailyViews,
//       totalSaves: Math.floor(dailyLikes * 0.3), // 30% of daily likes
//       totalShares: Math.floor(dailyLikes * 0.1), // 10% of daily likes
//       newPosts: Math.random() < 0.4 ? 1 : 0,
//       newStories: Math.floor(Math.random() * 3),
//       newReels: Math.random() < 0.2 ? 1 : 0,
//       storyViews: Math.floor(followers * 0.4 * (0.8 + Math.random() * 0.4)),
//       storyReplies: Math.floor(Math.random() * 10),
//       hasErrors,
//       errorMessage: hasErrors ? 'Temporary API rate limit' : null,
//       createdAt: new Date().toISOString()
//     };
    
//     snapshots.push(snapshot);
//   }
  
//   return snapshots;
// };

// // Function to insert mock data
// export const insertMockData = async () => {
//   try {
//     const { default: supabase } = await import('../src/supabase/supabaseClient');
    
//     console.log('🎭 Starting mock Instagram data insertion...');
    
//     // First, let's find an existing Instagram business profile
//     const { data: profiles, error: profileError } = await supabase
//       .from('InstagramBusinessProfile')
//       .select('id, username')
//       .limit(1);
    
//     if (profileError) {
//       console.error('❌ Error fetching profiles:', profileError);
//       return;
//     }
    
//     if (!profiles || profiles.length === 0) {
//       console.log('❌ No Instagram business profiles found. Please create one first.');
//       return;
//     }
    
//     const profile = profiles[0];
//     console.log(`📱 Found profile: @${profile.username} (${profile.id})`);
    
//     // Check if snapshots already exist
//     const { data: existingSnapshots, error: snapshotError } = await supabase
//       .from('InstagramDailySnapshot')
//       .select('id')
//       .eq('businessProfileId', profile.id)
//       .limit(1);
    
//     if (snapshotError) {
//       console.error('❌ Error checking existing snapshots:', snapshotError);
//       return;
//     }
    
//     if (existingSnapshots && existingSnapshots.length > 0) {
//       console.log('⚠️  Snapshots already exist for this profile. Continuing with mock data insertion...');
//     }
    
//     // Generate mock snapshots for the last 30 days
//     const mockSnapshots = generateMockSnapshots(profile.id, 30);
    
//     console.log(`📊 Generated ${mockSnapshots.length} mock snapshots`);
    
//     // Insert snapshots in batches
//     const batchSize = 10;
//     let insertedCount = 0;
    
//     for (let i = 0; i < mockSnapshots.length; i += batchSize) {
//       const batch = mockSnapshots.slice(i, i + batchSize);
      
//       const { error: insertError } = await supabase
//         .from('InstagramDailySnapshot')
//         .insert(batch);
      
//       if (insertError) {
//         console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError);
//         continue;
//       }
      
//       insertedCount += batch.length;
//       console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} snapshots`);
      
//       // Small delay to avoid overwhelming the database
//       await new Promise(resolve => setTimeout(resolve, 100));
//     }
    
//     // Update the business profile with current metrics
//     const latestSnapshot = mockSnapshots[mockSnapshots.length - 1];
//     const firstSnapshot = mockSnapshots[0];
    
//     const { error: updateError } = await supabase
//       .from('InstagramBusinessProfile')
//       .update({
//         currentFollowersCount: latestSnapshot.followersCount,
//         currentFollowingCount: latestSnapshot.followingCount,
//         currentMediaCount: latestSnapshot.mediaCount,
//         firstSnapshotAt: firstSnapshot.snapshotDate,
//         lastSnapshotAt: latestSnapshot.snapshotDate,
//         totalSnapshots: mockSnapshots.length,
//         updatedAt: new Date().toISOString()
//       })
//       .eq('id', profile.id);
    
//     if (updateError) {
//       console.error('❌ Error updating business profile:', updateError);
//     } else {
//       console.log('✅ Updated business profile with current metrics');
//     }
    
//     console.log(`🎉 Successfully inserted ${insertedCount} mock snapshots!`);
//     console.log(`📈 Current metrics:`);
//     console.log(`   - Followers: ${latestSnapshot.followersCount.toLocaleString()}`);
//     console.log(`   - Following: ${latestSnapshot.followingCount.toLocaleString()}`);
//     console.log(`   - Posts: ${latestSnapshot.mediaCount.toLocaleString()}`);
//     console.log(`   - Daily Likes: ${latestSnapshot.totalLikes.toLocaleString()}`);
//     console.log(`   - Daily Comments: ${latestSnapshot.totalComments.toLocaleString()}`);
//     console.log(`   - Daily Views: ${latestSnapshot.totalViews.toLocaleString()}`);
//     console.log(`   - Daily Saves: ${latestSnapshot.totalSaves.toLocaleString()}`);
//     console.log(`   - Daily Shares: ${latestSnapshot.totalShares.toLocaleString()}`);
    
//     console.log('\n🌐 You can now view the analytics zones on the Instagram dashboard!');
    
//   } catch (error) {
//     console.error('❌ Error in mock data insertion:', error);
//   }
// };

// export { generateMockSnapshots }; 