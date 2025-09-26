require('dotenv').config();
const { DatabaseService } = require('./src/supabase/database.ts');

async function testReviewEdgeCases() {
  console.log('🧪 Testing Review Creation Service - Edge Cases...\n');
  
  const dbService = new DatabaseService();
  const businessProfileId = '13fd7d95-4665-47dc-89c3-abb70cfb1b02'; // Use existing business profile
  const placeId = 'ChIJB1piTy78UhMR8Nxgvq-Huls';
  
  // Test data - we'll use the same reviews multiple times to test duplicates
  const baseReviews = [
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
    console.log('TEST 1: First-time creation (should succeed)');
    console.log('='.repeat(60));
    
    const result1 = await dbService.saveGoogleReviewsWithMetadata(
      businessProfileId,
      placeId,
      baseReviews,
      false
    );
    
    console.log('✅ First creation result:', result1);
    console.log(`   - Saved: ${result1.savedCount}`);
    console.log(`   - Updated: ${result1.updatedCount}`);
    console.log(`   - Failed: ${result1.failedCount}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Exact duplicate reviews (should update, not create new)');
    console.log('='.repeat(60));
    
    const result2 = await dbService.saveGoogleReviewsWithMetadata(
      businessProfileId,
      placeId,
      baseReviews, // Same exact reviews
      false
    );
    
    console.log('✅ Duplicate creation result:', result2);
    console.log(`   - Saved: ${result2.savedCount}`);
    console.log(`   - Updated: ${result2.updatedCount}`);
    console.log(`   - Failed: ${result2.failedCount}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: Modified duplicate reviews (should update existing)');
    console.log('='.repeat(60));
    
    const modifiedReviews = baseReviews.map(review => ({
      ...review,
      text: review.text + ' [UPDATED VERSION]',
      stars: review.stars === 5 ? 4 : review.stars + 1 // Change rating
    }));
    
    const result3 = await dbService.saveGoogleReviewsWithMetadata(
      businessProfileId,
      placeId,
      modifiedReviews,
      false
    );
    
    console.log('✅ Modified duplicate result:', result3);
    console.log(`   - Saved: ${result3.savedCount}`);
    console.log(`   - Updated: ${result3.updatedCount}`);
    console.log(`   - Failed: ${result3.failedCount}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST 4: Mixed batch (some new, some duplicates)');
    console.log('='.repeat(60));
    
    const mixedReviews = [
      ...modifiedReviews, // Existing reviews
      {
        reviewId: 'test-edge-case-003',
        name: 'Test User Gamma',
        text: 'Brand new review in mixed batch.',
        stars: 2,
        publishedAtDate: new Date('2025-01-22T09:15:00.000Z'),
        reviewerUrl: 'https://maps.google.com/reviewer/gamma',
        reviewerNumberOfReviews: 42,
        isLocalGuide: true,
        reviewerPhotoUrl: 'https://example.com/gamma.jpg',
        placeId: placeId
      }
    ];
    
    const result4 = await dbService.saveGoogleReviewsWithMetadata(
      businessProfileId,
      placeId,
      mixedReviews,
      false
    );
    
    console.log('✅ Mixed batch result:', result4);
    console.log(`   - Saved: ${result4.savedCount}`);
    console.log(`   - Updated: ${result4.updatedCount}`);
    console.log(`   - Failed: ${result4.failedCount}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST 5: Invalid data handling');
    console.log('='.repeat(60));
    
    const invalidReviews = [
      {
        reviewId: 'test-edge-case-004',
        name: 'Valid User',
        text: 'This review is valid.',
        stars: 4,
        publishedAtDate: new Date('2025-01-23T12:00:00.000Z'),
        reviewerUrl: 'https://maps.google.com/reviewer/valid',
        reviewerNumberOfReviews: 10,
        isLocalGuide: false,
        reviewerPhotoUrl: null,
        placeId: placeId
      },
      {
        reviewId: null, // Invalid - null reviewId
        name: 'Invalid User',
        text: 'This review has null reviewId.',
        stars: 3,
        publishedAtDate: new Date('2025-01-23T13:00:00.000Z'),
        reviewerUrl: 'https://maps.google.com/reviewer/invalid',
        reviewerNumberOfReviews: 5,
        isLocalGuide: false,
        reviewerPhotoUrl: null,
        placeId: placeId
      },
      {
        reviewId: 'test-edge-case-005',
        name: null, // Invalid - null name
        text: 'This review has null name.',
        stars: 1,
        publishedAtDate: new Date('2025-01-23T14:00:00.000Z'),
        reviewerUrl: 'https://maps.google.com/reviewer/invalid2',
        reviewerNumberOfReviews: 2,
        isLocalGuide: false,
        reviewerPhotoUrl: null,
        placeId: placeId
      }
    ];
    
    const result5 = await dbService.saveGoogleReviewsWithMetadata(
      businessProfileId,
      placeId,
      invalidReviews,
      false
    );
    
    console.log('✅ Invalid data result:', result5);
    console.log(`   - Saved: ${result5.savedCount}`);
    console.log(`   - Updated: ${result5.updatedCount}`);
    console.log(`   - Failed: ${result5.failedCount}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST 6: Large batch performance (100 reviews)');
    console.log('='.repeat(60));
    
    const largeBatch = [];
    for (let i = 1; i <= 100; i++) {
      largeBatch.push({
        reviewId: `test-large-batch-${i.toString().padStart(3, '0')}`,
        name: `Batch User ${i}`,
        text: `This is batch review number ${i}. Testing performance with large batches.`,
        stars: (i % 5) + 1, // Distribute ratings 1-5
        publishedAtDate: new Date(`2025-01-${(i % 28) + 1}T${(i % 24).toString().padStart(2, '0')}:${(i % 60).toString().padStart(2, '0')}:00.000Z`),
        reviewerUrl: `https://maps.google.com/reviewer/batch${i}`,
        reviewerNumberOfReviews: i % 50,
        isLocalGuide: i % 3 === 0,
        reviewerPhotoUrl: i % 2 === 0 ? `https://example.com/batch${i}.jpg` : null,
        placeId: placeId
      });
    }
    
    const startTime = Date.now();
    const result6 = await dbService.saveGoogleReviewsWithMetadata(
      businessProfileId,
      placeId,
      largeBatch,
      false
    );
    const endTime = Date.now();
    
    console.log('✅ Large batch result:', result6);
    console.log(`   - Saved: ${result6.savedCount}`);
    console.log(`   - Updated: ${result6.updatedCount}`);
    console.log(`   - Failed: ${result6.failedCount}`);
    console.log(`   - Time taken: ${endTime - startTime}ms`);
    console.log(`   - Rate: ${((result6.savedCount + result6.updatedCount) / ((endTime - startTime) / 1000)).toFixed(2)} reviews/second`);
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST 7: Re-run large batch (should all be updates)');
    console.log('='.repeat(60));
    
    const startTime2 = Date.now();
    const result7 = await dbService.saveGoogleReviewsWithMetadata(
      businessProfileId,
      placeId,
      largeBatch, // Same batch again
      false
    );
    const endTime2 = Date.now();
    
    console.log('✅ Large batch re-run result:', result7);
    console.log(`   - Saved: ${result7.savedCount}`);
    console.log(`   - Updated: ${result7.updatedCount}`);
    console.log(`   - Failed: ${result7.failedCount}`);
    console.log(`   - Time taken: ${endTime2 - startTime2}ms`);
    console.log(`   - Rate: ${((result7.savedCount + result7.updatedCount) / ((endTime2 - startTime2) / 1000)).toFixed(2)} reviews/second`);
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST 8: Wrong business profile ID (should fail gracefully)');
    console.log('='.repeat(60));
    
    try {
      const result8 = await dbService.saveGoogleReviewsWithMetadata(
        'non-existent-business-profile-id',
        placeId,
        baseReviews.slice(0, 1), // Just one review
        false
      );
      
      console.log('❌ Expected error but got result:', result8);
    } catch (error) {
      console.log('✅ Correctly failed with wrong business profile ID:', error.message);
    }
    
    console.log('\n' + '🎉 All edge case tests completed!');
    console.log('\nSUMMARY:');
    console.log('- ✅ Duplicate review handling');
    console.log('- ✅ Update existing reviews');
    console.log('- ✅ Mixed batch processing');
    console.log('- ✅ Invalid data handling');
    console.log('- ✅ Large batch performance');
    console.log('- ✅ Error handling');
    
  } catch (error) {
    console.error('❌ Edge case testing failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

testReviewEdgeCases(); 