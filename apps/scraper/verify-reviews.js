require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function verifyReviews() {
  console.log('🔍 Verifying review data...\n');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables');
    return;
  }
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    // Check the specific business profile from the logs
    const businessProfileId = '2585a09f-5880-44b3-b23c-442620a55ca1';
    const placeId = 'ChIJY0u1Bc-eVBMRqQ3XymBF9js';
    
    console.log('📊 Checking business profile...');
    const { data: profile, error: profileError } = await supabase
      .from('GoogleBusinessProfile')
      .select('id, teamId, displayName, placeId')
      .eq('id', businessProfileId)
      .single();
    
    if (profileError) {
      console.error('❌ Error fetching business profile:', profileError);
      return;
    }
    
    console.log(`✅ Business Profile: ${profile.displayName}`);
    console.log(`   - ID: ${profile.id}`);
    console.log(`   - Team: ${profile.teamId}`);
    console.log(`   - PlaceId: ${profile.placeId}`);
    
    // Check reviews by businessProfileId
    console.log('\n📝 Checking reviews by businessProfileId...');
    const { data: reviewsByBusinessId, error: reviewsError1 } = await supabase
      .from('GoogleReview')
      .select('id, businessProfileId, placeId, name, stars, publishedAtDate, reviewMetadataId')
      .eq('businessProfileId', businessProfileId);
    
    if (reviewsError1) {
      console.error('❌ Error fetching reviews by businessProfileId:', reviewsError1);
    } else {
      console.log(`✅ Found ${reviewsByBusinessId?.length || 0} reviews by businessProfileId`);
      if (reviewsByBusinessId && reviewsByBusinessId.length > 0) {
        reviewsByBusinessId.slice(0, 3).forEach((review, idx) => {
          console.log(`   ${idx + 1}. ${review.name} - ${review.stars}⭐ (${review.publishedAtDate})`);
        });
      }
    }
    
    // Check reviews by placeId
    console.log('\n🗺️  Checking reviews by placeId...');
    const { data: reviewsByPlaceId, error: reviewsError2 } = await supabase
      .from('GoogleReview')
      .select('id, businessProfileId, placeId, name, stars, publishedAtDate, reviewMetadataId')
      .eq('placeId', placeId);
    
    if (reviewsError2) {
      console.error('❌ Error fetching reviews by placeId:', reviewsError2);
    } else {
      console.log(`✅ Found ${reviewsByPlaceId?.length || 0} reviews by placeId`);
      if (reviewsByPlaceId && reviewsByPlaceId.length > 0) {
        console.log('\n📋 Sample reviews by placeId:');
        reviewsByPlaceId.slice(0, 3).forEach((review, idx) => {
          console.log(`   ${idx + 1}. BusinessProfileId: ${review.businessProfileId}`);
          console.log(`      Name: ${review.name}`);
          console.log(`      Stars: ${review.stars}⭐`);
          console.log(`      Date: ${review.publishedAtDate}`);
          console.log(`      HasMetadata: ${review.reviewMetadataId ? 'YES' : 'NO'}`);
          console.log('');
        });
      }
    }
    
    // Check if there's a mismatch
    if (reviewsByBusinessId?.length !== reviewsByPlaceId?.length) {
      console.log('\n⚠️  MISMATCH DETECTED!');
      console.log(`Reviews by businessProfileId: ${reviewsByBusinessId?.length || 0}`);
      console.log(`Reviews by placeId: ${reviewsByPlaceId?.length || 0}`);
      
      if (reviewsByPlaceId && reviewsByPlaceId.length > 0) {
        const uniqueBusinessIds = [...new Set(reviewsByPlaceId.map(r => r.businessProfileId))];
        console.log(`Different businessProfileIds found: ${uniqueBusinessIds.length}`);
        uniqueBusinessIds.forEach(id => {
          console.log(`   - ${id}`);
        });
      }
    }
    
    // Check ReviewMetadata for reviews
    if (reviewsByPlaceId && reviewsByPlaceId.length > 0) {
      console.log('\n🔗 Checking ReviewMetadata...');
      const reviewWithMetadata = reviewsByPlaceId.find(r => r.reviewMetadataId);
      
      if (reviewWithMetadata) {
        const { data: metadata, error: metaError } = await supabase
          .from('ReviewMetadata')
          .select('id, emotional, keywords, reply, date')
          .eq('id', reviewWithMetadata.reviewMetadataId)
          .single();
        
        if (metaError) {
          console.error('❌ Error fetching metadata:', metaError);
        } else {
          console.log('✅ Sample metadata:', metadata);
        }
      } else {
        console.log('⚠️  No reviews have metadata IDs');
      }
    }
    
    console.log('\n🎯 Verification completed!');
    
  } catch (error) {
    console.error('💥 Verification failed:', error);
  }
}

if (require.main === module) {
  verifyReviews().catch(console.error);
}

module.exports = { verifyReviews }; 