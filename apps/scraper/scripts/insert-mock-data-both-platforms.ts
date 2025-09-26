import { insertMockData } from './insert-mock-instagram-data';
import { insertMockData as insertTikTokMockData } from './insert-mock-tiktok-data-improved';

export const insertMockDataBothPlatforms = async () => {
  try {
    console.log('🚀 Starting mock data insertion for both Instagram and TikTok...');
    
    // Insert Instagram mock data
    console.log('\n📸 Inserting Instagram mock data...');
    await insertMockData();
    
    // Insert TikTok mock data
    console.log('\n🎵 Inserting TikTok mock data...');
    await insertTikTokMockData();
    
    console.log('\n🎉 Successfully inserted mock data for both platforms!');
    console.log('🌐 You can now view both Instagram and TikTok analytics dashboards!');
    
  } catch (error) {
    console.error('❌ Error in mock data insertion:', error);
    throw error;
  }
};

// Run the script if called directly
if (require.main === module) {
  insertMockDataBothPlatforms()
    .then(() => {
      console.log('🚀 Mock data script for both platforms completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Mock data script for both platforms failed:', error);
      process.exit(1);
    });
}
