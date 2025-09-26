require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testFrontendBackendIntegration() {
  console.log('🔄 Testing Frontend-Backend Integration Flow...\n');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables');
    return;
  }
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    // 1. First, check if there are any teams
    console.log('1️⃣ Checking available teams...');
    const { data: teams, error: teamsError } = await supabase
      .from('Team')
      .select('id, name, slug')
      .limit(5);
    
    if (teamsError) {
      console.error('❌ Error fetching teams:', teamsError);
      return;
    }
    
    console.log(`   Found ${teams?.length || 0} teams:`, teams?.map(t => `${t.name} (${t.slug})`));
    
    if (!teams || teams.length === 0) {
      console.log('⚠️ No teams found in database');
      return;
    }
    
    // 2. Check BusinessMarketIdentifier for each team
    console.log('\n2️⃣ Checking BusinessMarketIdentifier entries...');
    for (const team of teams) {
      const { data: identifiers, error: identifierError } = await supabase
        .from('BusinessMarketIdentifier')
        .select('*')
        .eq('teamId', team.id)
        .eq('platform', 'GOOGLE_MAPS');
      
      if (identifierError) {
        console.error(`   ❌ Error fetching identifiers for team ${team.name}:`, identifierError);
        continue;
      }
      
      console.log(`   Team "${team.name}": ${identifiers?.length || 0} Google identifiers`);
      if (identifiers && identifiers.length > 0) {
        identifiers.forEach(id => {
          console.log(`     - ID: ${id.identifier}`);
        });
      }
    }
    
    // 3. Find a team with a Google identifier and test the full flow
    const teamWithGoogle = teams.find(team => {
      // We'll check this in the next step
      return true;
    });
    
    if (!teamWithGoogle) {
      console.log('\n⚠️ No team with Google identifier found for full flow test');
      return;
    }
    
    console.log(`\n3️⃣ Testing full flow for team "${teamWithGoogle.name}"...`);
    
    // Simulate the API route logic
    const { data: googleIdentifier, error: identifierError } = await supabase
      .from('BusinessMarketIdentifier')
      .select('*')
      .eq('teamId', teamWithGoogle.id)
      .eq('platform', 'GOOGLE_MAPS')
      .single();
    
    if (identifierError || !googleIdentifier) {
      console.log('   ℹ️ No Google identifier found for this team');
      
      // Let's check what identifiers exist for this team
      const { data: allIdentifiers } = await supabase
        .from('BusinessMarketIdentifier')
        .select('*')
        .eq('teamId', teamWithGoogle.id);
      
      console.log('   Available identifiers:', allIdentifiers);
      return;
    }
    
    console.log(`   ✅ Found Google identifier: ${googleIdentifier.identifier}`);
    
    // 4. Fetch GoogleBusinessProfile using the same logic as API route
    console.log('\n4️⃣ Fetching GoogleBusinessProfile with relations...');
    const { data: businessProfile, error: businessError } = await supabase
      .from('GoogleBusinessProfile')
      .select(`
        *,
        GoogleOverview(
          *,
          PeriodicalMetric(*)
        ),
        GoogleBusinessMetadata(*)
      `)
      .eq('teamId', teamWithGoogle.id)
      .eq('placeId', googleIdentifier.identifier)
      .single();
    
    if (businessError) {
      console.error('   ❌ Error fetching business profile:', businessError);
      return;
    }
    
    if (!businessProfile) {
      console.log('   ⚠️ No business profile found');
      return;
    }
    
    console.log(`   ✅ Found business profile: ${businessProfile.displayName}`);
    console.log(`   - ID: ${businessProfile.id}`);
    console.log(`   - Rating: ${businessProfile.rating}`);
    console.log(`   - Review Count: ${businessProfile.userRatingCount}`);
    console.log(`   - Has Overview: ${!!businessProfile.GoogleOverview?.[0]}`);
    console.log(`   - Has Location: ${!!businessProfile.location}`);
    
    if (businessProfile.GoogleOverview?.[0]) {
      const overview = businessProfile.GoogleOverview[0];
      console.log(`   - Overview Metrics: ${overview.PeriodicalMetric?.length || 0} periods`);
      if (overview.PeriodicalMetric) {
        overview.PeriodicalMetric.forEach(metric => {
          console.log(`     * Period ${metric.periodKey}: ${metric.reviewCount} reviews, ${metric.avgRating} avg rating`);
        });
      }
    }
    
    // 5. Fetch recent reviews separately
    console.log('\n5️⃣ Fetching recent reviews...');
    const { data: recentReviews, error: reviewsError } = await supabase
      .from('GoogleReview')
      .select('*')
      .eq('businessProfileId', businessProfile.id)
      .order('publishedAtDate', { ascending: false })
      .limit(5);
    
    if (reviewsError) {
      console.error('   ❌ Error fetching recent reviews:', reviewsError);
    } else {
      console.log(`   ✅ Found ${recentReviews?.length || 0} recent reviews`);
      if (recentReviews && recentReviews.length > 0) {
        recentReviews.forEach((review, index) => {
          console.log(`     ${index + 1}. ${review.name} - ${review.stars}⭐ - ${review.publishedAtDate}`);
        });
      }
    }
    
    // 6. Test the frontend data structure expectations
    console.log('\n6️⃣ Testing frontend data structure expectations...');
    
    // Simulate what the frontend expects
    const profileWithReviews = {
      ...businessProfile,
      recentReviews: recentReviews || []
    };
    
    // Test key frontend expectations
    const expectations = [
      {
        name: 'businessProfile.GoogleOverview',
        check: () => Array.isArray(profileWithReviews.GoogleOverview) && profileWithReviews.GoogleOverview.length > 0,
        result: Array.isArray(profileWithReviews.GoogleOverview) && profileWithReviews.GoogleOverview.length > 0
      },
      {
        name: 'businessProfile.GoogleOverview[0].PeriodicalMetric',
        check: () => Array.isArray(profileWithReviews.GoogleOverview?.[0]?.PeriodicalMetric),
        result: Array.isArray(profileWithReviews.GoogleOverview?.[0]?.PeriodicalMetric)
      },
      {
        name: 'businessProfile.recentReviews',
        check: () => Array.isArray(profileWithReviews.recentReviews),
        result: Array.isArray(profileWithReviews.recentReviews)
      },
      {
        name: 'businessProfile.location',
        check: () => !!profileWithReviews.location,
        result: !!profileWithReviews.location
      },
      {
        name: 'businessProfile.GoogleBusinessMetadata',
        check: () => Array.isArray(profileWithReviews.GoogleBusinessMetadata) && profileWithReviews.GoogleBusinessMetadata.length > 0,
        result: Array.isArray(profileWithReviews.GoogleBusinessMetadata) && profileWithReviews.GoogleBusinessMetadata.length > 0
      }
    ];
    
    expectations.forEach(expectation => {
      const status = expectation.result ? '✅' : '❌';
      console.log(`   ${status} ${expectation.name}: ${expectation.result}`);
    });
    
    // 7. Check for potential issues
    console.log('\n7️⃣ Checking for potential issues...');
    
    const issues = [];
    
    // Check if rating distribution exists in any period
    let hasRatingDistribution = false;
    if (profileWithReviews.GoogleOverview?.[0]?.PeriodicalMetric) {
      hasRatingDistribution = profileWithReviews.GoogleOverview[0].PeriodicalMetric.some(
        metric => metric.ratingDistribution && 
        (typeof metric.ratingDistribution === 'string' ? 
         JSON.parse(metric.ratingDistribution) : 
         metric.ratingDistribution) &&
        Object.values(typeof metric.ratingDistribution === 'string' ? 
                     JSON.parse(metric.ratingDistribution) : 
                     metric.ratingDistribution).some(count => count > 0)
      );
    }
    
    if (!hasRatingDistribution) {
      issues.push('No rating distribution data found in periodical metrics');
    }
    
    // Check if reviews exist but metrics don't
    if (recentReviews && recentReviews.length > 0 && (!profileWithReviews.GoogleOverview?.[0]?.PeriodicalMetric || profileWithReviews.GoogleOverview[0].PeriodicalMetric.length === 0)) {
      issues.push('Reviews exist but no periodical metrics found');
    }
    
    // Check if business profile exists but no recent reviews
    if (!recentReviews || recentReviews.length === 0) {
      issues.push('No recent reviews found');
    }
    
    if (issues.length > 0) {
      console.log('   ⚠️ Potential issues found:');
      issues.forEach(issue => console.log(`     - ${issue}`));
    } else {
      console.log('   ✅ No major issues detected');
    }
    
    console.log('\n✅ Integration test complete!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testFrontendBackendIntegration(); 