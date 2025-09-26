import { insertMockDataBothPlatforms } from './insert-mock-data-both-platforms';

// Run the mock data script for both platforms
insertMockDataBothPlatforms()
  .then(() => {
    console.log('🚀 Mock data script for both platforms completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Mock data script for both platforms failed:', error);
    process.exit(1);
  });
