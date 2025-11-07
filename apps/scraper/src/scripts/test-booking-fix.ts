// import { createClient } from '@supabase/supabase-js';
// import { BookingReviewAnalyticsService } from '../services/bookingReviewAnalyticsService';

// // Load environment variables
// const supabaseUrl = process.env.SUPABASE_URL!;
// const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// async function testBookingFix(businessProfileId?: string, teamId?: string) {
//   const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

//   console.log('🧪 Testing Booking.com Analytics Fix...\n');

//   try {
//     let targetProfileId = businessProfileId;

//     // If no business profile ID provided, find the first one
//     if (!targetProfileId) {
//       console.log('🔍 Finding a Booking.com business profile to test...');

//       const query = supabase
//         .from('BookingBusinessProfile')
//         .select('id, teamId, name, bookingUrl, numberOfReviews')
//         .order('createdAt', { ascending: false })
//         .limit(1);

//       if (teamId) {
//         query.eq('teamId', teamId);
//       }

//       const { data: profiles, error } = await query;

//       if (error || !profiles || profiles.length === 0) {
//         console.log('❌ No Booking.com business profiles found');
//         return;
//       }

//       const profile = profiles[0];
//       targetProfileId = profile.id;

//       console.log(`✅ Found profile: ${profile.name || 'Unnamed'}`);
//       console.log(`   ID: ${profile.id}`);
//       console.log(`   Team: ${profile.teamId}`);
//       console.log(`   URL: ${profile.bookingUrl}`);
//       console.log(`   Reviews: ${profile.numberOfReviews || 0}\n`);
//     }

//     // Check current state before fix
//     console.log('📊 Checking current state...');

//     const { data: overview, error: overviewError } = await supabase
//       .from('BookingOverview')
//       .select('id, totalReviews, averageRating, averageCleanlinessRating, averageComfortRating, lastUpdated')
//       .eq('businessProfileId', targetProfileId)
//       .single();

//     const { count: reviewsCount } = await supabase
//       .from('BookingReview')
//       .select('*', { count: 'exact', head: true })
//       .eq('businessProfileId', targetProfileId);

//     console.log(`   📈 Reviews in database: ${reviewsCount || 0}`);
//     console.log(`   📊 Overview exists: ${overview ? 'YES' : 'NO'}`);

//     if (overview) {
//       console.log(`   📊 Current stats: ${overview.totalReviews || 0} reviews, ${overview.averageRating || 0} avg rating`);
//       console.log(`   📊 Sub-ratings: cleanliness=${overview.averageCleanlinessRating}, comfort=${overview.averageComfortRating}`);
//       console.log(`   📊 Last updated: ${overview.lastUpdated ? new Date(overview.lastUpdated).toLocaleString() : 'Never'}`);
//     }

//     // Run analytics processing
//     console.log('\n🔧 Running analytics processing...');

//     const analyticsService = new BookingReviewAnalyticsService();
//     await analyticsService.processReviewsAndUpdateDashboard(targetProfileId);

//     console.log('✅ Analytics processing completed!\n');

//     // Check state after fix
//     console.log('📊 Checking state after fix...');

//     const { data: updatedOverview, error: updatedOverviewError } = await supabase
//       .from('BookingOverview')
//       .select('id, totalReviews, averageRating, averageCleanlinessRating, averageComfortRating, averageLocationRating, averageFacilitiesRating, averageStaffRating, averageValueForMoneyRating, averageWifiRating, lastUpdated')
//       .eq('businessProfileId', targetProfileId)
//       .single();

//     if (updatedOverview) {
//       console.log(`   📊 Updated stats: ${updatedOverview.totalReviews || 0} reviews, ${updatedOverview.averageRating || 0} avg rating`);
//       console.log(`   📊 Sub-ratings:`);
//       console.log(`      Cleanliness: ${updatedOverview.averageCleanlinessRating || 'null'}`);
//       console.log(`      Comfort: ${updatedOverview.averageComfortRating || 'null'}`);
//       console.log(`      Location: ${updatedOverview.averageLocationRating || 'null'}`);
//       console.log(`      Facilities: ${updatedOverview.averageFacilitiesRating || 'null'}`);
//       console.log(`      Staff: ${updatedOverview.averageStaffRating || 'null'}`);
//       console.log(`      Value: ${updatedOverview.averageValueForMoneyRating || 'null'}`);
//       console.log(`      WiFi: ${updatedOverview.averageWifiRating || 'null'}`);
//       console.log(`   📊 Last updated: ${updatedOverview.lastUpdated ? new Date(updatedOverview.lastUpdated).toLocaleString() : 'Never'}`);

//       // Check periodical metrics
//       const { count: metricsCount } = await supabase
//         .from('BookingPeriodicalMetric')
//         .select('*', { count: 'exact', head: true })
//         .eq('bookingOverviewId', updatedOverview.id);

//       console.log(`   📊 Periodical metrics: ${metricsCount || 0} records`);

//       // Get a sample metric to see data
//       const { data: sampleMetric } = await supabase
//         .from('BookingPeriodicalMetric')
//         .select('periodLabel, reviewCount, averageRating, averageCleanlinessRating, sentimentPositive, sentimentNeutral, sentimentNegative')
//         .eq('bookingOverviewId', updatedOverview.id)
//         .eq('periodKey', 0) // All time
//         .single();

//       if (sampleMetric) {
//         console.log(`   📊 All-time metrics sample:`);
//         console.log(`      Reviews: ${sampleMetric.reviewCount}`);
//         console.log(`      Avg Rating: ${sampleMetric.averageRating}`);
//         console.log(`      Avg Cleanliness: ${sampleMetric.averageCleanlinessRating || 'null'}`);
//         console.log(`      Sentiment: +${sampleMetric.sentimentPositive} ~${sampleMetric.sentimentNeutral} -${sampleMetric.sentimentNegative}`);
//       }
//     } else {
//       console.log('   ❌ Still no overview data after processing');
//     }

//     console.log('\n🎉 Test completed!');

//   } catch (error) {
//     console.error('💥 Test failed:', error);
//   }
// }

// // Run if called directly
// if (require.main === module) {
//   const businessProfileId = process.argv[2];
//   const teamId = process.argv[3];

//   console.log('Usage: npm run ts-node src/scripts/test-booking-fix.ts [businessProfileId] [teamId]');
//   console.log('If no parameters provided, will test the most recent Booking.com profile\n');

//   testBookingFix(businessProfileId, teamId).catch(console.error);
// }

// export { testBookingFix };
