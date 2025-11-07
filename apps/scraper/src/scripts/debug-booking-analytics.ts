// import { createClient } from '@supabase/supabase-js';
// import { BookingReviewAnalyticsService } from '../services/bookingReviewAnalyticsService';
// import { logger } from '../utils/logger';

// // Load environment variables
// const supabaseUrl = process.env.SUPABASE_URL!;
// const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// async function debugBookingAnalytics() {
//   const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

//   console.log('🔍 Starting Booking.com Analytics Debug Script...\n');

//   try {
//     // 1. Find all Booking.com business profiles
//     console.log('📋 Fetching all Booking.com business profiles...');
//     const { data: profiles, error: profilesError } = await supabase
//       .from('BookingBusinessProfile')
//       .select('id, teamId, name, bookingUrl, numberOfReviews')
//       .order('createdAt', { ascending: false });

//     if (profilesError) {
//       console.error('❌ Error fetching business profiles:', profilesError);
//       return;
//     }

//     if (!profiles || profiles.length === 0) {
//       console.log('📭 No Booking.com business profiles found');
//       return;
//     }

//     console.log(`✅ Found ${profiles.length} Booking.com business profiles:\n`);

//     for (const [index, profile] of profiles.entries()) {
//       console.log(`${index + 1}. ${profile.name || 'Unnamed'}`);
//       console.log(`   ID: ${profile.id}`);
//       console.log(`   Team: ${profile.teamId}`);
//       console.log(`   URL: ${profile.bookingUrl}`);
//       console.log(`   Reviews: ${profile.numberOfReviews || 0}`);
//       console.log('');
//     }

//     // 2. For each profile, check if overview exists and reviews count
//     console.log('🔍 Checking overview and reviews data for each profile...\n');

//     for (const profile of profiles) {
//       console.log(`📊 Analyzing profile: ${profile.name || profile.id}`);

//       // Check if overview exists
//       const { data: overview, error: overviewError } = await supabase
//         .from('BookingOverview')
//         .select('id, totalReviews, averageRating, lastUpdated')
//         .eq('businessProfileId', profile.id)
//         .single();

//       if (overviewError && overviewError.code !== 'PGRST116') {
//         console.error(`   ❌ Error checking overview: ${overviewError.message}`);
//         continue;
//       }

//       // Check reviews count and sample data
//       const { count: reviewsCount, error: reviewsCountError } = await supabase
//         .from('BookingReview')
//         .select('*', { count: 'exact', head: true })
//         .eq('businessProfileId', profile.id);

//       // Get sample review data to check for sub-ratings and sentiment
//       const { data: sampleReviews, error: sampleError } = await supabase
//         .from('BookingReview')
//         .select(`
//           id, rating, cleanlinessRating, comfortRating, locationRating,
//           facilitiesRating, staffRating, valueForMoneyRating, wifiRating,
//           lengthOfStay, guestType, hasOwnerResponse, isVerifiedStay,
//           reviewMetadata:ReviewMetadata(sentiment, keywords)
//         `)
//         .eq('businessProfileId', profile.id)
//         .limit(3);

//       if (reviewsCountError) {
//         console.error(`   ❌ Error counting reviews: ${reviewsCountError.message}`);
//         continue;
//       }

//       // Check periodical metrics count
//       let periodicMetricsCount = 0;
//       if (overview) {
//         const { count: metricsCount, error: metricsCountError } = await supabase
//           .from('BookingPeriodicalMetric')
//           .select('*', { count: 'exact', head: true })
//           .eq('bookingOverviewId', overview.id);

//         if (!metricsCountError) {
//           periodicMetricsCount = metricsCount || 0;
//         }
//       }

//       console.log(`   📈 Reviews in database: ${reviewsCount || 0}`);
//       console.log(`   📊 Overview exists: ${overview ? 'YES' : 'NO'}`);
//       if (overview) {
//         console.log(`   📊 Overview stats: ${overview.totalReviews || 0} reviews, ${overview.averageRating || 0} avg rating`);
//         console.log(`   📊 Last updated: ${overview.lastUpdated ? new Date(overview.lastUpdated).toLocaleString() : 'Never'}`);
//         console.log(`   📊 Periodical metrics: ${periodicMetricsCount} records`);
//       }

//       // Analyze sample reviews for data quality issues
//       if (sampleReviews && sampleReviews.length > 0) {
//         console.log(`   🔍 Sample review analysis (${sampleReviews.length} reviews):`);

//         let hasSubRatings = false;
//         let hasSentiment = false;
//         let hasLengthOfStay = false;
//         let hasGuestTypes = false;

//         sampleReviews.forEach((review, idx) => {
//           console.log(`      Review ${idx + 1}:`);
//           console.log(`        Rating: ${review.rating}`);
//           console.log(`        Sub-ratings: C:${review.cleanlinessRating} F:${review.facilitiesRating} L:${review.locationRating} S:${review.staffRating} W:${review.wifiRating}`);
//           console.log(`        Stay length: ${review.lengthOfStay} nights`);
//           console.log(`        Guest type: ${review.guestType}`);
//           console.log(`        Has response: ${review.hasOwnerResponse}`);
//           console.log(`        Verified stay: ${review.isVerifiedStay}`);

//           const metadata = Array.isArray(review.reviewMetadata)
//             ? review.reviewMetadata[0]
//             : review.reviewMetadata;
//           const sentiment = metadata?.sentiment;
//           const keywords = metadata?.keywords;

//           console.log(`        Sentiment: ${sentiment || 'null'}`);
//           console.log(`        Keywords: ${keywords ? keywords.length : 0} found`);

//           // Track data quality
//           if (review.cleanlinessRating || review.facilitiesRating || review.locationRating || review.staffRating || review.wifiRating) {
//             hasSubRatings = true;
//           }
//           if (sentiment !== null && sentiment !== undefined) {
//             hasSentiment = true;
//           }
//           if (review.lengthOfStay) {
//             hasLengthOfStay = true;
//           }
//           if (review.guestType && review.guestType !== 'OTHER') {
//             hasGuestTypes = true;
//           }
//         });

//         console.log(`   🔍 Data quality summary:`);
//         console.log(`      Sub-ratings present: ${hasSubRatings ? '✅' : '❌'}`);
//         console.log(`      Sentiment analysis: ${hasSentiment ? '✅' : '❌'}`);
//         console.log(`      Length of stay data: ${hasLengthOfStay ? '✅' : '❌'}`);
//         console.log(`      Guest type data: ${hasGuestTypes ? '✅' : '❌'}`);
//       }

//       // Check if analytics needs to be run
//       const needsAnalytics = !overview || (reviewsCount || 0) > 0 && (!overview.totalReviews || overview.totalReviews === 0);

//       if (needsAnalytics) {
//         console.log(`   ⚠️  ISSUE DETECTED: ${!overview ? 'No overview data' : 'Overview has no review data despite reviews existing'}`);
//         console.log(`   🔧 Attempting to fix by running analytics...`);

//         try {
//           const analyticsService = new BookingReviewAnalyticsService();
//           await analyticsService.processReviewsAndUpdateDashboard(profile.id);
//           console.log(`   ✅ Analytics processing completed successfully!`);
//         } catch (analyticsError) {
//           console.error(`   ❌ Analytics processing failed:`, analyticsError);
//         }
//       } else {
//         console.log(`   ✅ Overview data looks good`);
//       }

//       console.log('');
//     }

//     console.log('🎉 Debug script completed!');

//   } catch (error) {
//     console.error('💥 Script failed:', error);
//   }
// }

// // Run the debug script if called directly
// if (require.main === module) {
//   debugBookingAnalytics().catch(console.error);
// }

// export { debugBookingAnalytics };
