import { ApifyClient } from "apify-client";
import { Actor, ActorJob, ReviewActorJobData } from "./actor";
import { DatabaseService } from "../../supabase/database";
import { MarketPlatform } from "@prisma/client";
// Analytics service removed - analytics now computed on-demand via tRPC
// import { FacebookReviewAnalyticsService } from "../../services/facebookReviewAnalyticsService";
import { prisma } from "@wirecrest/db";
import { reviewAnalysisService } from "../../services/analysis/ReviewAnalysisService";

export class FacebookBusinessReviewsActor extends Actor {
  constructor() {
    // Use configurable actor ID with fallback to the Facebook reviews actor
    const actorId =
      process.env.APIFY_FACEBOOK_REVIEWS_ACTOR_ID || "dX3d80hsNMilEwjXG";
    // Use 1GB for initialization jobs, 4GB for regular jobs
    super(actorId, 1024, MarketPlatform.FACEBOOK);
  }

  /**
   * Update memory estimate based on job type
   */
  updateMemoryEstimate(isInitialization: boolean): void {
    this.memoryEstimateMB = isInitialization ? 1024 : 4096; // 1GB for init, 4GB for regular
  }
}

export class FacebookBusinessReviewsActorJob {
  private apifyClient: ApifyClient;
  private databaseService: DatabaseService;
  private jobData: ReviewActorJobData;

  constructor(data: ReviewActorJobData, apifyToken: string) {
    this.jobData = data;
    this.apifyClient = new ApifyClient({ token: apifyToken });
    this.databaseService = new DatabaseService();
  }

  async run(): Promise<boolean> {
    return await handleFacebookBusinessReviews(this.jobData);
  }
}

async function handleFacebookBusinessReviews(
  data: ReviewActorJobData,
): Promise<boolean> {
  return true;
  // console.log(`Starting Facebook Business Reviews scraping for page: ${data.pageId || data.pageUrl}`);

  // // Validate that this is a Facebook job
  // if (data.platform !== MarketPlatform.FACEBOOK || (!data.pageId && !data.pageUrl)) {
  //     console.error('Invalid job data for Facebook actor:', data);
  //     return false;
  // }

  // try {
  //     const client = new ApifyClient({
  //         token: process.env.APIFY_TOKEN,
  //     });

  //     const database = new DatabaseService();

  //     // Determine max reviews based on job type and tenant limits
  //     let maxReviews = data.maxReviews || 10;
  //     if (data.isInitialization) {
  //         maxReviews = data.maxReviews || 2000; // Default to 2000 for initialization
  //     }

  //     // Get the most recent review date for filtering (only for polling, not initialization)
  //     let startDate: Date | null = null;
  //     if (!data.isInitialization) {
  //         // For Facebook, we'll need to implement getMostRecentReviewDate for Facebook reviews
  //         // For now, get reviews from last 5 days for polling
  //         startDate = new Date();
  //         startDate.setDate(startDate.getDate() - 5);
  //     }

  //     // Format the URL to include /reviews for the specific Facebook reviews actor
  //     let reviewsUrl = data.pageUrl;
  //     if (reviewsUrl && !reviewsUrl.includes('/reviews')) {
  //         // Ensure URL ends with /reviews for the Facebook reviews actor
  //         reviewsUrl = reviewsUrl.replace(/\/$/, '') + '/reviews';
  //     } else if (data.pageId) {
  //         reviewsUrl = `https://www.facebook.com/${data.pageId}/reviews`;
  //     }

  //     const input = {
  //         startUrls: [
  //             {
  //                 url: reviewsUrl
  //             }
  //         ],
  //         resultsLimit: maxReviews
  //     };

  //     console.log(`Running Facebook Reviews actor with input:`, input);

  //     const actorId = process.env.APIFY_FACEBOOK_REVIEWS_ACTOR_ID || 'dX3d80hsNMilEwjXG';
  //     const run = await client.actor(actorId).call(input);
  //     const { items } = await client.dataset(run.defaultDatasetId).listItems();

  //     if (!items || items.length === 0) {
  //         console.log('No reviews found for Facebook page:', data.pageId || data.pageUrl);
  //         await database.close();
  //         return true;
  //     }

  //     console.log(`Found ${items.length} reviews for Facebook page: ${data.pageId || data.pageUrl}`);

  //     // Track processing stats
  //     let totalPhotos = 0;
  //     let totalComments = 0;
  //     let recommendedCount = 0;
  //     let notRecommendedCount = 0;

  //     // Process and save reviews
  //     const processedReviews: FacebookReview[] = [];

  //     for (const item of items) {
  //         try {
  //             // Type-safe access to the actual Facebook response structure
  //             const fbItem = item as any;

  //             // Extract core review data
  //             const reviewText = fbItem.text || '';
  //             const reviewDate = fbItem.date ? new Date(fbItem.date) : new Date();
  //             const isRecommended = fbItem.isRecommended === true;

  //             // Update stats
  //             if (isRecommended) recommendedCount++;
  //             else notRecommendedCount++;

  //             // Use isRecommended as rating equivalent (true = 5, false = 1)
  //             const equivalentRating = isRecommended ? 5 : 1;

  //             const analysis = await reviewAnalysisService.analyzeReview(reviewText, equivalentRating);

  //             // Process photos if present
  //             const photos: FacebookReviewPhoto[] = [];
  //             if (Array.isArray(fbItem.photos)) {
  //                 totalPhotos += fbItem.photos.length;
  //                 fbItem.photos.forEach((photo: any, index: number) => {
  //                     photos.push({
  //                         id: `${fbItem.id}-photo-${index}`,
  //                         facebookReviewId: fbItem.id,
  //                         url: photo.url || '',
  //                         imageUri: photo.image?.uri || '',
  //                         height: photo.image?.height,
  //                         width: photo.image?.width,
  //                         viewerImageUri: photo.viewer_image?.uri,
  //                         viewerHeight: photo.viewer_image?.height,
  //                         viewerWidth: photo.viewer_image?.width,
  //                         photoId: photo.id || `photo-${index}`,
  //                         accessibilityCaption: photo.accessibility_caption,
  //                         isPlayable: photo.is_playable === true,
  //                         ownerUserId: photo.owner?.id
  //                     });
  //                 });
  //             }

  //             // Process comments if present
  //             const comments: FacebookReviewComment[] = [];
  //             if (Array.isArray(fbItem.comments)) {
  //                 totalComments += fbItem.comments.length;
  //                 fbItem.comments.forEach((comment: any, index: number) => {
  //                     comments.push({
  //                         id: `${fbItem.id}-comment-${index}`,
  //                         facebookReviewId: fbItem.id,
  //                         commentId: comment.id || `comment-${index}`,
  //                         date: comment.date ? new Date(comment.date) : new Date(),
  //                         text: comment.text || '',
  //                         likesCount: comment.likesCount || 0,
  //                         commenterName: comment.commenterName,
  //                         commenterProfileUrl: comment.profileUrl,
  //                         commenterProfilePic: comment.profilePicture
  //                     });
  //                 });
  //             }

  //             // Create Facebook review with the new comprehensive structure
  //             const processedReview: FacebookReview = {
  //                 id: `facebook-${data.pageId || 'page'}-${fbItem.id || Date.now()}-${Math.random()}`,
  //                 businessProfileId: '', // Will be set when saving to database
  //                 reviewMetadataId: '', // Will be set in database service

  //                 // Core review data from Facebook response
  //                 facebookReviewId: fbItem.id || `fb-${Date.now()}`,
  //                 legacyId: fbItem.legacyId || '',
  //                 date: reviewDate,
  //                 url: fbItem.url || '',
  //                 text: reviewText,
  //                 isRecommended: isRecommended,

  //                 // User/Reviewer information
  //                 userId: fbItem.user?.id || `user-${Date.now()}`,
  //                 userName: fbItem.user?.name || 'Anonymous',
  //                 userProfileUrl: fbItem.user?.profileUrl,
  //                 userProfilePic: fbItem.user?.profilePic,

  //                 // Engagement metrics
  //                 likesCount: fbItem.likesCount || 0,
  //                 commentsCount: fbItem.commentsCount || 0,

  //                 // Content categorization
  //                 tags: Array.isArray(fbItem.tags) ? fbItem.tags : [],

  //                 // Media attachments
  //                 photos: photos,
  //                 comments: comments,

  //                 // Page context
  //                 facebookPageId: fbItem.facebookId || data.pageId || '',
  //                 pageName: fbItem.pageName || data.pageId || '',
  //                 inputUrl: fbItem.inputUrl || reviewsUrl || '',

  //                 // Metadata from page
  //                 pageAdLibrary: fbItem.pageAdLibrary || undefined,

  //                 // Internal tracking
  //                 scrapedAt: new Date(),
  //                 createdAt: new Date(),
  //                 updatedAt: new Date(),

  //                 // Relations - Create ReviewMetadata
  //                 reviewMetadata: {
  //                     id: '',
  //                     externalId: fbItem.id || `fb-${Date.now()}`,
  //                     source: MarketPlatform.FACEBOOK,
  //                     author: fbItem.user?.name || 'Anonymous',
  //                     authorImage: fbItem.user?.profilePic,
  //                     rating: equivalentRating, // Convert isRecommended to rating
  //                     text: reviewText,
  //                     date: reviewDate,
  //                     photoCount: photos.length,
  //                     photoUrls: photos.map(p => p.imageUri).filter(Boolean),
  //                     reply: undefined, // Facebook reviews don't typically have direct replies
  //                     replyDate: undefined,
  //                     hasReply: false,
  //                     sentiment: analysis.sentiment,
  //                     keywords: analysis.keywords,
  //                     topics: analysis.topics,
  //                     emotional: analysis.emotional,
  //                     actionable: !isRecommended || analysis.sentiment < 0, // Non-recommended or negative sentiment
  //                     responseUrgency: analysis.responseUrgency,
  //                     competitorMentions: [],
  //                     comparativePositive: isRecommended && analysis.sentiment > 0,
  //                     isRead: false,
  //                     isImportant: analysis.responseUrgency >= 7 || !isRecommended,
  //                     labels: fbItem.tags || [],
  //                     language: 'en', // Could be enhanced with language detection
  //                     scrapedAt: new Date(),
  //                     sourceUrl: fbItem.url || reviewsUrl,
  //                     createdAt: new Date(),
  //                     updatedAt: new Date()
  //                 }
  //             };

  //             processedReviews.push(processedReview);
  //         } catch (error) {
  //             console.error('Error processing Facebook review:', error, item);
  //         }
  //     }

  //     // Save reviews to database
  //     console.log(`💾 Saving ${processedReviews.length} Facebook reviews to database...`);

  //     // Extract Facebook Page ID from the scraped data (more reliable than input data)
  //     let extractedPageId = '';
  //     if (processedReviews.length > 0) {
  //         extractedPageId = processedReviews[0].facebookPageId;
  //     }

  //     // Fallback to input data if extraction fails
  //     if (!extractedPageId) {
  //         extractedPageId = data.pageId || '';
  //     }

  //     console.log(`📋 Using Facebook Page ID: ${extractedPageId}`);

  //     // First, find the business profile ID
  //     const supabaseUrl = process.env.SUPABASE_URL!;
  //     const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  //     const supabase = createClient(supabaseUrl, supabaseKey);

  //     const pageIdentifier = data.pageId || data.pageUrl;
  //     const { data: businessProfile, error: profileError } = await supabase
  //         .from('FacebookBusinessProfile')
  //         .select('id, pageId')
  //         .or(`facebookUrl.eq.${pageIdentifier},pageUrl.eq.${pageIdentifier},pageName.eq.${pageIdentifier}`)
  //         .single();

  //     if (profileError || !businessProfile?.id) {
  //         console.error(`❌ Failed to find Facebook business profile for: ${pageIdentifier}`, profileError);
  //         throw new Error(`Facebook business profile not found for: ${pageIdentifier}`);
  //     }

  //     console.log(`📋 Found business profile ID: ${businessProfile.id}`);

  //     // Use the Page ID from the business profile if available, otherwise use extracted one
  //     const finalPageId = businessProfile.pageId || extractedPageId;

  //     // Convert processed reviews to the format expected by the database service
  //     const reviewsForDatabase = processedReviews.map(review => ({
  //         id: review.facebookReviewId,
  //         legacyId: review.legacyId,
  //         date: review.date.toISOString(),
  //         url: review.url,
  //         text: review.text,
  //         isRecommended: review.isRecommended,

  //         // Flat fields for validation (these are what the database validation expects)
  //         author: review.userName,
  //         userName: review.userName,
  //         name: review.userName,

  //         // User object (nested format for compatibility)
  //         user: {
  //             id: review.userId,
  //             name: review.userName,
  //             profileUrl: review.userProfileUrl,
  //             profilePic: review.userProfilePic
  //         },

  //         // Additional user fields (flat for database service)
  //         userId: review.userId,
  //         userProfileUrl: review.userProfileUrl,
  //         userProfilePic: review.userProfilePic,

  //         likesCount: review.likesCount,
  //         commentsCount: review.commentsCount,
  //         tags: review.tags,
  //         facebookId: review.facebookPageId,
  //         pageName: review.pageName,
  //         inputUrl: review.inputUrl,
  //         pageAdLibrary: review.pageAdLibrary,
  //         scrapedAt: review.scrapedAt.toISOString(),
  //         // Include the metadata for saving
  //         photos: review.photos,
  //         comments: review.comments
  //     }));

  //     // Save to database using the correct method
  //     console.log(`📋 Using Page ID for database save: ${finalPageId}`);
  //     console.log(`📋 Sample review data structure (first review):`, JSON.stringify(reviewsForDatabase[0], null, 2));

  //     const saveResult = await database.saveFacebookReviewsWithMetadata(
  //         businessProfile.id,
  //         finalPageId,
  //         reviewsForDatabase,
  //         data.isInitialization || false
  //     );

  //     console.log(`💾 Database save result:`, saveResult);
  //     console.log(`   ✅ Saved: ${saveResult.savedCount}`);
  //     console.log(`   🔄 Updated: ${saveResult.updatedCount}`);
  //     console.log(`   ❌ Failed: ${saveResult.failedCount}`);

  //     if (saveResult.errors.length > 0) {
  //         console.error(`⚠️  Database save errors:`, saveResult.errors);
  //     }

  //     console.log(`✅ Successfully processed ${processedReviews.length} Facebook reviews for page: ${data.pageId || data.pageUrl}`);
  //     console.log(`📊 Processing Stats:`);
  //     console.log(`   📝 Reviews: ${processedReviews.length} total`);
  //     console.log(`   👍 Recommended: ${recommendedCount}`);
  //     console.log(`   👎 Not Recommended: ${notRecommendedCount}`);
  //     console.log(`   📸 Photos: ${totalPhotos} total`);
  //     console.log(`   💬 Comments: ${totalComments} total`);
  //     console.log(`   🏷️  Tagged Reviews: ${processedReviews.filter(r => r.tags.length > 0).length}`);

  //     await database.close();

  //     // Call FacebookReviewAnalyticsService to process analytics
  //     try {
  //         const analyticsService = new FacebookReviewAnalyticsService();
  //         await analyticsService.processReviewsAndUpdateDashboard(businessProfile.id);
  //         console.log(`📊 Analytics processing completed for businessProfileId: ${businessProfile.id}`);
  //     } catch (analyticsError) {
  //         console.error(`❌ Error processing Facebook analytics:`, analyticsError);
  //         // Don't fail the whole job if analytics fails
  //     }

  //     return true;
  // } catch (error) {
  //     console.error('Error in Facebook Business Reviews actor:', error);
  //     return false;
  // }
}
