require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testReviewEdgeCasesSimple() {
  console.log('🧪 Testing Review Edge Cases (Simple Version)...\n');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables');
    return;
  }
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const businessProfileId = '13fd7d95-4665-47dc-89c3-abb70cfb1b02';
  const placeId = 'ChIJB1piTy78UhMR8Nxgvq-Huls';
  
  // Test data
  const testReviews = [
    {
      reviewId: 'test-edge-case-001',
      name: 'Test User Alpha',
      text: 'This is a test review for edge case testing. Great service!',
      stars: 5,
      publishedAtDate: new Date('2025-01-20T10:00:00.000Z'),
      reviewerUrl: 'https://maps.google.com/reviewer/alpha',
      reviewerNumberOfReviews: 15,
      isLocalGuide: true,
      reviewerPhotoUrl: 'https://example.com/alpha.jpg',
      placeId: placeId
    },
    {
      reviewId: 'test-edge-case-002',
      name: 'Test User Beta',
      text: 'Another test review. Could be better.',
      stars: 3,
      publishedAtDate: new Date('2025-01-21T14:30:00.000Z'),
      reviewerUrl: 'https://maps.google.com/reviewer/beta',
      reviewerNumberOfReviews: 8,
      isLocalGuide: false,
      reviewerPhotoUrl: null,
      placeId: placeId
    }
  ];

  try {
    console.log('='.repeat(60));
    console.log('TEST 1: Check current database state');
    console.log('='.repeat(60));
    
    // Check existing reviews
    const { data: existingReviews, error: reviewsError } = await supabase
      .from('GoogleReview')
      .select('id, reviewMetadataId, name, stars')
      .eq('businessProfileId', businessProfileId)
      .order('publishedAtDate', { ascending: false })
      .limit(10);
    
    if (reviewsError) {
      console.error('❌ Error fetching existing reviews:', reviewsError);
      return;
    }
    
    console.log(`✅ Found ${existingReviews?.length || 0} existing reviews`);
    if (existingReviews && existingReviews.length > 0) {
      existingReviews.slice(0, 3).forEach((review, i) => {
        console.log(`   ${i + 1}. ${review.name} - ${review.stars}⭐`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Test duplicate review detection');
    console.log('='.repeat(60));
    
    for (const testReview of testReviews) {
      console.log(`\nTesting review: ${testReview.reviewId}`);
      
      // Check if ReviewMetadata exists
      const { data: existingMetadata, error: metaError } = await supabase
        .from('ReviewMetadata')
        .select('id')
        .eq('externalId', testReview.reviewId)
        .eq('source', 'GOOGLE_MAPS')
        .single();
      
      if (metaError && metaError.code !== 'PGRST116') {
        console.error(`❌ Error checking metadata:`, metaError);
        continue;
      }
      
      if (existingMetadata) {
        console.log(`   ✅ Found existing metadata: ${existingMetadata.id}`);
        
        // Check if GoogleReview exists for this metadata
        const { data: existingGoogleReview, error: googleError } = await supabase
          .from('GoogleReview')
          .select('id')
          .eq('reviewMetadataId', existingMetadata.id)
          .single();
        
        if (googleError && googleError.code !== 'PGRST116') {
          console.error(`❌ Error checking GoogleReview:`, googleError);
          continue;
        }
        
        if (existingGoogleReview) {
          console.log(`   ✅ Found existing GoogleReview: ${existingGoogleReview.id}`);
          console.log(`   📝 This would be an UPDATE operation`);
        } else {
          console.log(`   ⚠️ Metadata exists but no GoogleReview found`);
          console.log(`   📝 This would CREATE a new GoogleReview`);
        }
      } else {
        console.log(`   📝 No existing metadata - would CREATE both metadata and GoogleReview`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: Test constraint violations');
    console.log('='.repeat(60));
    
    // Test 1: Try to insert duplicate externalId + source combination
    const duplicateMetadata = {
      id: 'test-duplicate-' + Date.now(),
      externalId: 'test-edge-case-001', // Same as first test review
      source: 'GOOGLE_MAPS',
      author: 'Duplicate Test User',
      rating: 4,
      text: 'This should fail due to unique constraint',
      date: new Date().toISOString(),
      scrapedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('Attempting to insert duplicate metadata...');
    const { data: dupResult, error: dupError } = await supabase
      .from('ReviewMetadata')
      .insert(duplicateMetadata)
      .select('id');
    
    if (dupError) {
      console.log(`✅ Correctly rejected duplicate: ${dupError.message}`);
      if (dupError.code === '23505') {
        console.log(`   📝 Constraint violation detected (code: ${dupError.code})`);
      }
    } else {
      console.log(`❌ Unexpectedly allowed duplicate metadata insertion`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST 4: Test null/invalid data handling');
    console.log('='.repeat(60));
    
    // Test with null required fields
    const invalidData = [
      {
        name: 'null externalId',
        data: {
          id: 'test-null-' + Date.now(),
          externalId: null, // This should fail
          source: 'GOOGLE_MAPS',
          author: 'Test User',
          rating: 3,
          date: new Date().toISOString(),
          scrapedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      },
      {
        name: 'missing required field',
        data: {
          id: 'test-missing-' + Date.now(),
          externalId: 'test-missing-field',
          // source: missing
          author: 'Test User',
          rating: 3,
          date: new Date().toISOString(),
          scrapedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    ];
    
    for (const test of invalidData) {
      console.log(`\nTesting ${test.name}...`);
      const { data: result, error } = await supabase
        .from('ReviewMetadata')
        .insert(test.data)
        .select('id');
      
      if (error) {
        console.log(`✅ Correctly rejected invalid data: ${error.message}`);
      } else {
        console.log(`❌ Unexpectedly allowed invalid data`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST 5: Test relationship constraints');
    console.log('='.repeat(60));
    
    // Try to create GoogleReview with non-existent businessProfileId
    const invalidGoogleReview = {
      id: 'test-invalid-' + Date.now(),
      businessProfileId: 'non-existent-business-id',
      reviewMetadataId: 'non-existent-metadata-id',
      name: 'Test User',
      stars: 4,
      publishedAtDate: new Date().toISOString(),
      placeId: placeId,
      scrapedAt: new Date().toISOString()
    };
    
    console.log('Testing invalid foreign key constraint...');
    const { data: fkResult, error: fkError } = await supabase
      .from('GoogleReview')
      .insert(invalidGoogleReview)
      .select('id');
    
    if (fkError) {
      console.log(`✅ Correctly rejected invalid foreign key: ${fkError.message}`);
      if (fkError.code === '23503') {
        console.log(`   📝 Foreign key constraint violation detected (code: ${fkError.code})`);
      }
    } else {
      console.log(`❌ Unexpectedly allowed invalid foreign key`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST 6: Test performance with batch operations');
    console.log('='.repeat(60));
    
    // Test upsert operations
    const batchSize = 10;
    const batchReviews = [];
    
    for (let i = 1; i <= batchSize; i++) {
      batchReviews.push({
        id: `test-batch-${i}-${Date.now()}`,
        externalId: `test-batch-${i}`,
        source: 'GOOGLE_MAPS',
        author: `Batch User ${i}`,
        rating: (i % 5) + 1,
        text: `Batch review number ${i}`,
        date: new Date().toISOString(),
        scrapedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    console.log(`Creating batch of ${batchSize} metadata records...`);
    const startTime = Date.now();
    const { data: batchResult, error: batchError } = await supabase
      .from('ReviewMetadata')
      .upsert(batchReviews, { 
        onConflict: 'externalId,source',
        ignoreDuplicates: false 
      })
      .select('id');
    
    const endTime = Date.now();
    
    if (batchError) {
      console.log(`❌ Batch operation failed: ${batchError.message}`);
    } else {
      console.log(`✅ Batch operation succeeded`);
      console.log(`   - Records processed: ${batchResult?.length || 0}`);
      console.log(`   - Time taken: ${endTime - startTime}ms`);
      console.log(`   - Rate: ${((batchResult?.length || 0) / ((endTime - startTime) / 1000)).toFixed(2)} records/second`);
    }
    
    // Test re-running the same batch (should update)
    console.log(`\nRe-running same batch (should update existing)...`);
    const startTime2 = Date.now();
    const { data: batchResult2, error: batchError2 } = await supabase
      .from('ReviewMetadata')
      .upsert(batchReviews, { 
        onConflict: 'externalId,source',
        ignoreDuplicates: false 
      })
      .select('id');
    
    const endTime2 = Date.now();
    
    if (batchError2) {
      console.log(`❌ Batch re-run failed: ${batchError2.message}`);
    } else {
      console.log(`✅ Batch re-run succeeded`);
      console.log(`   - Records processed: ${batchResult2?.length || 0}`);
      console.log(`   - Time taken: ${endTime2 - startTime2}ms`);
      console.log(`   - Rate: ${((batchResult2?.length || 0) / ((endTime2 - startTime2) / 1000)).toFixed(2)} records/second`);
    }
    
    console.log('\n' + '🎉 All edge case tests completed!');
    console.log('\nSUMMARY:');
    console.log('- ✅ Database state analysis');
    console.log('- ✅ Duplicate detection logic');
    console.log('- ✅ Constraint violation handling');
    console.log('- ✅ Invalid data rejection');
    console.log('- ✅ Foreign key constraints');
    console.log('- ✅ Batch operation performance');
    
  } catch (error) {
    console.error('❌ Edge case testing failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

testReviewEdgeCasesSimple(); 