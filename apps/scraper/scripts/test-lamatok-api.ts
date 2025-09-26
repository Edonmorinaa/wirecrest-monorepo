import { TikTokDataService } from '../src/services/tiktokDataService';

async function testLamaTokAPI() {
  const accessKey = process.env.LAMATOK_ACCESS_KEY;
  
  if (!accessKey) {
    console.error('❌ LAMATOK_ACCESS_KEY environment variable is required');
    process.exit(1);
  }

  console.log('🧪 Testing LamaTok API integration...');
  
  try {
    const tiktokService = new TikTokDataService(accessKey);
    
    // Test user fetch
    console.log('\n📱 Testing user fetch...');
    const testUsername = 'tiktok'; // Use a known TikTok account for testing
    const userResult = await tiktokService['fetchUserByUsername'](testUsername);
    
    if (userResult.success) {
      console.log('✅ User fetch successful');
      console.log('User data:', {
        username: userResult.data?.user?.uniqueId,
        nickname: userResult.data?.user?.nickname,
        followers: userResult.data?.user?.followerCount,
        videos: userResult.data?.user?.videoCount,
      });
    } else {
      console.log('❌ User fetch failed:', userResult.error);
    }

    // Test video fetch (if user fetch was successful)
    if (userResult.success) {
      console.log('\n🎥 Testing video fetch...');
      const videoResult = await tiktokService['fetchUserVideos'](testUsername, 5);
      
      if (videoResult.success) {
        console.log('✅ Video fetch successful');
        console.log(`Found ${videoResult.data?.videos?.length || 0} videos`);
        
        if (videoResult.data?.videos && videoResult.data.videos.length > 0) {
          const firstVideo = videoResult.data.videos[0];
          console.log('First video:', {
            id: firstVideo.videoId,
            description: firstVideo.desc?.substring(0, 50) + '...',
            stats: firstVideo.stats,
          });
        } else {
          console.log('ℹ️  No videos found (LamaTok API limitation)');
        }
      } else {
        console.log('❌ Video fetch failed:', videoResult.error);
      }
    }

    console.log('\n🎉 LamaTok API integration test completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

// Run the test
testLamaTokAPI().catch(console.error); 