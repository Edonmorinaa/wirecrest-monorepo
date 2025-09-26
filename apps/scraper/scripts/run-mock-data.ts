import { insertMockData } from './insert-mock-instagram-data';

// Run the mock data insertion
insertMockData()
  .then(() => {
    console.log('✅ Mock data insertion completed');
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
  }); 