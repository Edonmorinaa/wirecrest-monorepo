require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkMetadata() {
  console.log('🔍 Checking for orphaned ReviewMetadata...\n');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables');
    return;
  }
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    // Get all ReviewMetadata entries
    console.log('📊 Fetching all ReviewMetadata entries...');
    const { data: allMetadata, error: metaError } = await supabase
      .from('ReviewMetadata')
      .select('id, emotional, keywords, reply, date')
      .order('date', { ascending: false });
    
    if (metaError) {
      console.error('❌ Error fetching metadata:', metaError);
      return;
    }
    
    console.log(`✅ Found ${allMetadata?.length || 0} ReviewMetadata entries`);
    
    if (allMetadata && allMetadata.length > 0) {
      console.log('\n📋 Recent metadata entries:');
      allMetadata.slice(0, 5).forEach((meta, idx) => {
        console.log(`   ${idx + 1}. ID: ${meta.id}`);
        console.log(`      Date: ${meta.date}`);
        console.log(`      Emotional: ${meta.emotional}`);
        console.log(`      Keywords: ${meta.keywords?.slice(0, 50)}...`);
        console.log('');
      });
      
      // Check for corresponding GoogleReview entries
      console.log('🔗 Checking for corresponding GoogleReview entries...');
      const metadataIds = allMetadata.map(m => m.id);
      
      const { data: reviewsWithMetadata, error: reviewError } = await supabase
        .from('GoogleReview')
        .select('id, reviewMetadataId, name, stars')
        .in('reviewMetadataId', metadataIds);
      
      if (reviewError) {
        console.error('❌ Error fetching reviews with metadata:', reviewError);
      } else {
        console.log(`✅ Found ${reviewsWithMetadata?.length || 0} reviews with metadata`);
        
        const orphanedMetadata = allMetadata.filter(meta => 
          !reviewsWithMetadata?.some(review => review.reviewMetadataId === meta.id)
        );
        
        console.log(`⚠️  Found ${orphanedMetadata.length} orphaned metadata entries (no corresponding review)`);
        
        if (orphanedMetadata.length > 0) {
          console.log('\n🚨 Orphaned metadata entries:');
          orphanedMetadata.slice(0, 3).forEach((meta, idx) => {
            console.log(`   ${idx + 1}. ID: ${meta.id} - Date: ${meta.date}`);
          });
        }
      }
    }
    
    // Also check for any GoogleReviews without metadata
    console.log('\n📝 Checking for GoogleReviews without metadata...');
    const { data: reviewsWithoutMeta, error: reviewError2 } = await supabase
      .from('GoogleReview')
      .select('id, name, stars, reviewMetadataId')
      .is('reviewMetadataId', null);
    
    if (reviewError2) {
      console.error('❌ Error fetching reviews without metadata:', reviewError2);
    } else {
      console.log(`✅ Found ${reviewsWithoutMeta?.length || 0} reviews without metadata`);
    }
    
    console.log('\n🎯 Metadata check completed!');
    
  } catch (error) {
    console.error('💥 Metadata check failed:', error);
  }
}

if (require.main === module) {
  checkMetadata().catch(console.error);
}

module.exports = { checkMetadata }; 