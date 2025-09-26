import { insertMockTikTokData } from './insert-mock-tiktok-data-improved';

async function runTikTokMockData() {
  try {
    console.log('🎵 Starting TikTok mock data generation...');
    await insertMockTikTokData();
    console.log('✅ TikTok mock data generation completed successfully!');
  } catch (error) {
    console.error('❌ TikTok mock data generation failed:', error);
    process.exit(1);
  }
}

// Run the script
runTikTokMockData();
