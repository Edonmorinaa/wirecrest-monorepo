import { insert6MonthsMockTikTokData } from './insert-6-months-mock-tiktok-data';

// Run the 6 months TikTok mock data script
insert6MonthsMockTikTokData()
  .then(() => {
    console.log('🎵 6 months TikTok mock data script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 6 months TikTok mock data script failed:', error);
    process.exit(1);
  });
