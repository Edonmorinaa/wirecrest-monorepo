require('dotenv').config();

async function testRealDatabaseServiceFailures() {
  console.log('🔬 Testing REAL DatabaseService Implementation...\n');
  
  let DatabaseService;
  
  try {
    // Try to import the actual DatabaseService
    const dbModule = await import('./src/supabase/database.ts');
    DatabaseService = dbModule.DatabaseService;
    console.log('✅ Successfully imported DatabaseService');
  } catch (importError) {
    console.error('❌ Failed to import DatabaseService:', importError.message);
    console.log('This suggests there might be module resolution issues.');
    console.log('Falling back to manual inspection...\n');
    
    // Let's check what might be causing import issues
    return await analyzeCodeForFailurePoints();
  }
  
  const businessProfileId = '13fd7d95-4665-47dc-89c3-abb70cfb1b02';
  const placeId = 'ChIJB1piTy78UhMR8Nxgvq-Huls';
  
  try {
    const dbService = new DatabaseService();
    
    console.log('='.repeat(80));
    console.log('FAILURE SCENARIO 1: Invalid Business Profile ID');
    console.log('='.repeat(80));
    
    try {
      const result1 = await dbService.saveGoogleReviewsWithMetadata(
        'invalid-business-profile-id-that-does-not-exist',
        placeId,
        [{
          reviewId: 'test-invalid-business',
          name: 'Test User',
          text: 'This should fail',
          stars: 4,
          publishedAtDate: new Date(),
          placeId: placeId
        }],
        false
      );
      console.log('❌ Expected failure but got:', result1);
    } catch (error) {
      console.log('✅ Correctly failed with invalid business ID:', error.message);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('FAILURE SCENARIO 2: Malformed Review Data');
    console.log('='.repeat(80));
    
    const malformedReviews = [
      // Missing required fields
      {
        // reviewId: missing
        name: 'User Without ID',
        text: 'Missing review ID',
        stars: 3
      },
      // Circular references (would cause JSON.stringify issues)
      (() => {
        const review = {
          reviewId: 'circular-test',
          name: 'Circular User',
          text: 'Has circular reference',
          stars: 4,
          publishedAtDate: new Date(),
          placeId: placeId
        };
        review.self = review; // Circular reference
        return review;
      })(),
      // Extremely nested objects
      {
        reviewId: 'nested-test',
        name: 'Nested User',
        text: 'Has deeply nested data',
        stars: 2,
        publishedAtDate: new Date(),
        placeId: placeId,
        metadata: {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: 'Very deep nesting that might cause issues'
                }
              }
            }
          }
        }
      }
    ];
    
    const malformedResult = await dbService.saveGoogleReviewsWithMetadata(
      businessProfileId,
      placeId,
      malformedReviews,
      false
    );
    
    console.log('✅ Malformed data test result:', malformedResult);
    console.log(`   - Saved: ${malformedResult.savedCount}`);
    console.log(`   - Updated: ${malformedResult.updatedCount}`);
    console.log(`   - Failed: ${malformedResult.failedCount}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('FAILURE SCENARIO 3: Database Connection Issues');
    console.log('='.repeat(80));
    
    // Test with invalid environment variables temporarily
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    process.env.SUPABASE_URL = 'https://invalid-url.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'invalid-key';
    
    try {
      const dbServiceInvalid = new DatabaseService();
      const invalidResult = await dbServiceInvalid.saveGoogleReviewsWithMetadata(
        businessProfileId,
        placeId,
        [{
          reviewId: 'test-invalid-connection',
          name: 'Test User',
          text: 'Testing invalid connection',
          stars: 4,
          publishedAtDate: new Date(),
          placeId: placeId
        }],
        false
      );
      console.log('❌ Expected connection failure but got:', invalidResult);
    } catch (error) {
      console.log('✅ Correctly failed with invalid connection:', error.message);
    } finally {
      // Restore original values
      process.env.SUPABASE_URL = originalUrl;
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('FAILURE SCENARIO 4: Extremely Large Payload');
    console.log('='.repeat(80));
    
    const largePayload = [];
    for (let i = 0; i < 1000; i++) {
      largePayload.push({
        reviewId: `large-payload-${i}`,
        name: `User ${i}`,
        text: 'A'.repeat(5000), // 5KB text each
        stars: (i % 5) + 1,
        publishedAtDate: new Date(Date.now() - i * 60000), // Spread over time
        reviewerUrl: `https://maps.google.com/reviewer/user${i}`,
        reviewerNumberOfReviews: i,
        isLocalGuide: i % 2 === 0,
        reviewerPhotoUrl: i % 3 === 0 ? `https://example.com/user${i}.jpg` : null,
        placeId: placeId
      });
    }
    
    console.log(`Testing with ${largePayload.length} reviews (${JSON.stringify(largePayload).length} bytes)...`);
    
    const largeStartTime = Date.now();
    const largeResult = await dbService.saveGoogleReviewsWithMetadata(
      businessProfileId,
      placeId,
      largePayload,
      false
    );
    const largeEndTime = Date.now();
    
    console.log('✅ Large payload test result:', largeResult);
    console.log(`   - Saved: ${largeResult.savedCount}`);
    console.log(`   - Updated: ${largeResult.updatedCount}`);
    console.log(`   - Failed: ${largeResult.failedCount}`);
    console.log(`   - Time: ${largeEndTime - largeStartTime}ms`);
    console.log(`   - Rate: ${(largeResult.savedCount + largeResult.updatedCount) / ((largeEndTime - largeStartTime) / 1000)} reviews/sec`);
    
    console.log('\n🎉 Real DatabaseService testing completed!');
    
  } catch (error) {
    console.error('❌ Critical error testing real DatabaseService:', error);
    console.error('Stack trace:', error.stack);
  }
}

async function analyzeCodeForFailurePoints() {
  console.log('🔍 Analyzing DatabaseService code for potential failure points...\n');
  
  const fs = require('fs').promises;
  
  try {
    const dbServiceCode = await fs.readFile('./src/supabase/database.ts', 'utf8');
    
    console.log('='.repeat(80));
    console.log('CODE ANALYSIS: Potential Failure Points');
    console.log('='.repeat(80));
    
    const failurePatterns = [
      {
        pattern: /await\s+.*\.from\(/g,
        description: 'Database queries that could fail',
        risk: 'High - Network/DB failures'
      },
      {
        pattern: /JSON\.parse\(/g,
        description: 'JSON parsing that could throw',
        risk: 'Medium - Malformed data'
      },
      {
        pattern: /\.map\(/g,
        description: 'Array operations on potentially null data',
        risk: 'Medium - Null reference errors'
      },
      {
        pattern: /new Date\(/g,
        description: 'Date parsing that could fail',
        risk: 'Medium - Invalid date formats'
      },
      {
        pattern: /\[0\]/g,
        description: 'Array access without bounds checking',
        risk: 'Medium - Index out of bounds'
      },
      {
        pattern: /\.single\(\)/g,
        description: 'Single record queries that might fail',
        risk: 'High - No record found errors'
      },
      {
        pattern: /try\s*{/g,
        description: 'Try-catch blocks (good error handling)',
        risk: 'Low - Protected code'
      }
    ];
    
    let analysisResults = [];
    
    failurePatterns.forEach(({ pattern, description, risk }) => {
      const matches = dbServiceCode.match(pattern);
      if (matches) {
        analysisResults.push({
          pattern: pattern.source,
          description,
          risk,
          count: matches.length
        });
      }
    });
    
    console.log('DETECTED PATTERNS:');
    analysisResults.forEach((result, i) => {
      console.log(`${i + 1}. ${result.description}`);
      console.log(`   Pattern: ${result.pattern}`);
      console.log(`   Occurrences: ${result.count}`);
      console.log(`   Risk Level: ${result.risk}\n`);
    });
    
    // Check for specific method patterns
    console.log('='.repeat(80));
    console.log('METHOD-SPECIFIC ANALYSIS');
    console.log('='.repeat(80));
    
    if (dbServiceCode.includes('saveGoogleReviewsWithMetadata')) {
      console.log('✅ Found saveGoogleReviewsWithMetadata method');
      
      // Look for error handling patterns
      const methodMatch = dbServiceCode.match(/saveGoogleReviewsWithMetadata[\s\S]*?(?=async|\Z)/);
      if (methodMatch) {
        const methodCode = methodMatch[0];
        
        const hasErrorHandling = methodCode.includes('try') && methodCode.includes('catch');
        const hasValidation = methodCode.includes('if') && methodCode.includes('!');
        const hasRollback = methodCode.includes('delete') || methodCode.includes('rollback');
        
        console.log(`   - Error handling: ${hasErrorHandling ? '✅ Present' : '❌ Missing'}`);
        console.log(`   - Input validation: ${hasValidation ? '✅ Present' : '❌ Missing'}`);
        console.log(`   - Rollback logic: ${hasRollback ? '✅ Present' : '❌ Missing'}`);
      }
    }
    
    console.log('\n='.repeat(80));
    console.log('RECOMMENDATIONS');
    console.log('='.repeat(80));
    
    console.log('1. ✅ Add comprehensive input validation');
    console.log('2. ✅ Implement transaction rollback for partial failures');
    console.log('3. ✅ Add retry logic for network failures');
    console.log('4. ✅ Validate date formats before processing');
    console.log('5. ✅ Add array bounds checking');
    console.log('6. ✅ Implement circuit breaker for repeated failures');
    console.log('7. ✅ Add rate limiting for large batches');
    console.log('8. ✅ Implement proper logging for debugging');
    
  } catch (error) {
    console.error('❌ Failed to analyze code:', error.message);
  }
}

testRealDatabaseServiceFailures(); 