require('dotenv').config();
const { GoogleReviewAnalyticsService } = require('./src/services/googleReviewAnalyticsService.ts');

async function testAnalyticsManually() {
  console.log('🔄 Testing Analytics Service Manually...\n');
  
  try {
    const analyticsService = new GoogleReviewAnalyticsService();
    
    // Use the business profile ID we found: 13fd7d95-4665-47dc-89c3-abb70cfb1b02
    const businessProfileId = '13fd7d95-4665-47dc-89c3-abb70cfb1b02';
    
    console.log(`📊 Running analytics for business profile: ${businessProfileId}`);
    
    const result = await analyticsService.processReviewsAndUpdateDashboard(businessProfileId);
    
    console.log('✅ Analytics completed with result:', result);
    
  } catch (error) {
    console.error('❌ Analytics failed:', error);
  }
}

testAnalyticsManually(); 