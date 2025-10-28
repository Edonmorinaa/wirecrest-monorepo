import { ApifyClient } from 'apify-client';
import { Actor, ActorJob, ReviewActorJobData } from './actor';
import { DatabaseService } from '../../supabase/database';
import { 
    TripAdvisorReview, 
    TripAdvisorReviewPhoto, 
    TripAdvisorReviewSubRating,
    TripAdvisorTripType,
    ReviewMetadata, 
    MarketPlatform 
} from '../../supabase/models';
import { TripAdvisorReviewAnalyticsService } from '../../services/tripAdvisorReviewAnalyticsService';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { reviewAnalysisService } from '../../services/analysis/ReviewAnalysisService';

// Function to validate and normalize trip type
function validateTripType(tripType?: string): string {
    if (!tripType) return TripAdvisorTripType.NONE;
    
    const normalizedType = tripType.toUpperCase();
    const validTypes = Object.values(TripAdvisorTripType);
    
    if (validTypes.includes(normalizedType as TripAdvisorTripType)) {
        return normalizedType;
    }
    
    return TripAdvisorTripType.NONE;
}

export class TripAdvisorBusinessReviewsActor extends Actor {
    constructor() {
        // Use the TripAdvisor actor ID provided in the conversation
        const actorId = process.env.APIFY_TRIPADVISOR_REVIEWS_ACTOR_ID || 'dbEyMBriog95Fv8CW';
        // Use 1GB for initialization jobs, 4GB for regular jobs
        super(actorId, 1024, MarketPlatform.TRIPADVISOR);
    }

    /**
     * Update memory estimate based on job type
     */
    updateMemoryEstimate(isInitialization: boolean): void {
        this.memoryEstimateMB = isInitialization ? 1024 : 4096; // 1GB for init, 4GB for regular
    }
}

export class TripAdvisorBusinessReviewsActorJob {
    private apifyClient: ApifyClient;
    private databaseService: DatabaseService;
    private jobData: ReviewActorJobData;

    constructor(data: ReviewActorJobData, apifyToken: string) {
        this.jobData = data;
        this.apifyClient = new ApifyClient({ token: apifyToken });
        this.databaseService = new DatabaseService();
    }

    async run(): Promise<boolean> {
        return await handleTripAdvisorBusinessReviews(this.jobData);
    }
}

async function handleTripAdvisorBusinessReviews(
    data: ReviewActorJobData
): Promise<boolean> {
    console.log(`Starting TripAdvisor Business Reviews scraping for: ${data.locationId || data.tripAdvisorUrl}`);
    
    // Validate that this is a TripAdvisor job
    if (data.platform !== MarketPlatform.TRIPADVISOR || (!data.locationId && !data.tripAdvisorUrl)) {
        console.error('Invalid job data for TripAdvisor actor:', data);
        return false;
    }

    try {
        const client = new ApifyClient({
            token: process.env.APIFY_TOKEN,
        });

        const database = new DatabaseService();

        // Determine max reviews based on job type and tenant limits
        let maxReviews = data.maxReviews || 10;
        if (data.isInitialization) {
            maxReviews = data.maxReviews || 2000; // Default to 2000 for initialization
        }

        // For TripAdvisor, we need to use the URL format expected by the actor
        let reviewsUrl = data.tripAdvisorUrl;
        if (!reviewsUrl && data.locationId) {
            // We'd need to construct a URL from locationId if only ID is provided
            // For now, require the full URL
            throw new Error('TripAdvisor URL is required for scraping');
        }

        const input = {
            "maxItemsPerQuery": maxReviews,
            "reviewRatings": [
              "ALL_REVIEW_RATINGS"
            ],
            "reviewsLanguages": [
              "ALL_REVIEW_LANGUAGES"
            ],
            "scrapeReviewerInfo": true,
            "startUrls": [
                {
                    "url": reviewsUrl,
                    "method": "GET"
                }
            ]
        };

        console.log(`Running TripAdvisor Reviews actor with input:`, input);

        const actorId = process.env.APIFY_TRIPADVISOR_REVIEWS_ACTOR_ID || 'Hvp4YfFGyLM635Q2F';
        const run = await client.actor(actorId).call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        if (!items || items.length === 0) {
            console.log('No data found for TripAdvisor business:', data.locationId || data.tripAdvisorUrl);
            await database.close();
            return true;
        }

        console.log(`Found ${items.length} TripAdvisor review items for: ${data.locationId || data.tripAdvisorUrl}`);
        
        let totalReviews = 0;
        const processedReviews: TripAdvisorReview[] = [];
        const allPhotos: TripAdvisorReviewPhoto[] = [];
        const allSubRatings: TripAdvisorReviewSubRating[] = [];
        
        // Each item is now a review directly
        for (const reviewItem of items) {
            try {
                // Type-safe access to the TripAdvisor review structure
                const review = reviewItem as any;
                
                const reviewText = review.text || '';
                const reviewRating = review.rating || 1;
                const reviewDate = review.publishedDate ? new Date(review.publishedDate) : new Date();
                const visitDate = review.travelDate ? new Date(review.travelDate) : undefined;
                
                const analysis = await reviewAnalysisService.analyzeReview(reviewText, reviewRating);
                
                // Create TripAdvisor review
                const reviewId = review.id || `ta-${Date.now()}-${processedReviews.length}`;
                const tripAdvisorReview: TripAdvisorReview = {
                    id: randomUUID(),
                    businessProfileId: '', // Will be set when saving to database
                    reviewMetadataId: '', // Will be set after metadata creation
                    tripAdvisorReviewId: reviewId,
                    reviewUrl: review.url,
                    title: review.title,
                    text: reviewText,
                    rating: reviewRating,
                    publishedDate: reviewDate,
                    visitDate: visitDate,
                    reviewerId: review.user?.userId || review.user?.username || 'unknown',
                    reviewerName: review.user?.name || review.user?.username || 'Anonymous',
                    reviewerLocation: review.user?.userLocation,
                    reviewerLevel: review.user?.contributions?.totalContributions?.toString(),
                    reviewerPhotoUrl: review.user?.avatar?.image,
                    helpfulVotes: review.helpfulVotes || 0,
                    tripType: validateTripType(review.tripType),
                    roomTip: review.roomTip,
                    responseFromOwnerText: review.ownerResponse?.text,
                    responseFromOwnerDate: review.ownerResponse?.date ? new Date(review.ownerResponse.date) : undefined,
                    hasOwnerResponse: !!(review.ownerResponse?.text),
                    locationId: review.locationId || review.placeInfo?.id || data.locationId || '',
                    businessName: review.placeInfo?.name,
                    businessType: review.placeInfo?.type,
                    scrapedAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                // Process photos if present
                if (review.photos && Array.isArray(review.photos)) {
                    review.photos.forEach((photo: any, photoIndex: number) => {
                        const reviewPhoto: TripAdvisorReviewPhoto = {
                            id: randomUUID(),
                            tripAdvisorReviewId: reviewId,
                            url: photo.url || photo.image || '',
                            caption: photo.caption,
                            photoId: photo.photoId || photo.id || `photo-${photoIndex}`,
                            width: photo.width,
                            height: photo.height,
                            photographerId: photo.photographerId
                        };
                        allPhotos.push(reviewPhoto);
                    });
                }

                // Process subratings if present
                if (review.subratings && Array.isArray(review.subratings) && review.subratings.length > 0) {
                    const subRatingData: any = {};
                    review.subratings.forEach((subRating: any) => {
                        const ratingType = subRating.name?.toLowerCase();
                        const ratingValue = subRating.rating || subRating.value;
                        
                        if (ratingType && ratingValue) {
                            switch (ratingType) {
                                case 'service':
                                    subRatingData.service = ratingValue;
                                    break;
                                case 'food':
                                    subRatingData.food = ratingValue;
                                    break;
                                case 'value':
                                    subRatingData.value = ratingValue;
                                    break;
                                case 'atmosphere':
                                    subRatingData.atmosphere = ratingValue;
                                    break;
                                case 'cleanliness':
                                    subRatingData.cleanliness = ratingValue;
                                    break;
                                case 'location':
                                    subRatingData.location = ratingValue;
                                    break;
                                case 'rooms':
                                    subRatingData.rooms = ratingValue;
                                    break;
                                case 'sleep quality':
                                case 'sleepquality':
                                    subRatingData.sleepQuality = ratingValue;
                                    break;
                            }
                        }
                    });
                    
                    if (Object.keys(subRatingData).length > 0) {
                        const reviewSubRating: TripAdvisorReviewSubRating = {
                            id: randomUUID(),
                            tripAdvisorReviewId: reviewId,
                            ...subRatingData
                        };
                        allSubRatings.push(reviewSubRating);
                    }
                }

                processedReviews.push(tripAdvisorReview);
                totalReviews++;
            } catch (error) {
                console.error('Error processing TripAdvisor review:', error, reviewItem);
            }
        }

        if (processedReviews.length === 0) {
            console.log('No reviews were processed from TripAdvisor data');
            await database.close();
            return true;
        }

        // Save reviews to database
        console.log(`💾 Saving ${processedReviews.length} TripAdvisor reviews to database...`);
        
        // Extract location ID from the scraped data
        let extractedLocationId = '';
        if (processedReviews.length > 0) {
            extractedLocationId = processedReviews[0].locationId;
        }
        
        // Fallback to input data if extraction fails
        if (!extractedLocationId) {
            extractedLocationId = data.locationId || '';
        }
        
        console.log(`📋 Using TripAdvisor Location ID: ${extractedLocationId}`);
        
        // First, find the business profile ID
        const supabaseUrl = process.env.SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const locationIdentifier = data.locationId || data.tripAdvisorUrl;
        const { data: businessProfile, error: profileError } = await supabase
            .from('TripAdvisorBusinessProfile')
            .select('id, locationId')
            .or(`tripAdvisorUrl.eq.${locationIdentifier},locationId.eq.${locationIdentifier}`)
            .single();
        
        if (profileError || !businessProfile?.id) {
            console.error(`❌ Failed to find TripAdvisor business profile for: ${locationIdentifier}`, profileError);
            throw new Error(`TripAdvisor business profile not found for: ${locationIdentifier}`);
        }
        
        console.log(`📋 Found business profile ID: ${businessProfile.id}`);
        
        // Use the Location ID from the business profile if available, otherwise use extracted one
        const finalLocationId = businessProfile.locationId || extractedLocationId;
        
        // Convert processed reviews to the format expected by the database service
        const reviewsForDatabase = processedReviews.map((review, index) => {
            // Find the corresponding photos and subratings for this review
            const reviewPhotos = allPhotos.filter((photo: TripAdvisorReviewPhoto) => 
                photo.tripAdvisorReviewId === review.tripAdvisorReviewId
            ).slice(0, 10); // Limit to 10 photos per review
            
            const reviewSubRatings = allSubRatings.find((sr: TripAdvisorReviewSubRating) => 
                sr.tripAdvisorReviewId === review.tripAdvisorReviewId
            );
            
            return {
                id: review.tripAdvisorReviewId,
                title: review.title,
                text: review.text,
                rating: review.rating,
                publishedDate: review.publishedDate.toISOString(),
                visitDate: review.visitDate?.toISOString(),
                
                // Reviewer information
                reviewer: {
                    id: review.reviewerId,
                    name: review.reviewerName,
                    location: review.reviewerLocation,
                    level: review.reviewerLevel,
                    badges: [],
                    photoUrl: review.reviewerPhotoUrl
                },
                
                // Flat fields for validation
                reviewerId: review.reviewerId,
                reviewerName: review.reviewerName,
                author: review.reviewerName,
                name: review.businessName,
                
                helpfulVotes: review.helpfulVotes,
                subRatings: reviewSubRatings,
                tripType: review.tripType,
                roomTip: review.roomTip,
                
                // Owner response
                ownerResponse: review.responseFromOwnerText ? {
                    text: review.responseFromOwnerText,
                    date: review.responseFromOwnerDate?.toISOString()
                } : null,
                
                // Business context
                locationId: review.locationId,
                businessName: review.businessName,
                businessType: review.businessType,
                
                scrapedAt: review.scrapedAt.toISOString(),
                
                // Include the photos for saving
                photos: reviewPhotos
            };
        });
        
        // Save to database using the correct method
        console.log(`📋 Using Location ID for database save: ${finalLocationId}`);
        console.log(`📋 Sample review data structure (first review):`, JSON.stringify(reviewsForDatabase[0], null, 2));
        
        const saveResult = await database.saveTripAdvisorReviewsWithMetadata(
            businessProfile.id,
            finalLocationId,
            reviewsForDatabase,
            data.isInitialization || false
        );
        
        console.log(`💾 Database save result:`, saveResult);
        console.log(`   ✅ Saved: ${saveResult.savedCount}`);
        console.log(`   🔄 Updated: ${saveResult.updatedCount}`);
        console.log(`   ❌ Failed: ${saveResult.failedCount}`);
        
        if (saveResult.errors.length > 0) {
            console.error(`⚠️  Database save errors:`, saveResult.errors);
        }

        console.log(`✅ Successfully processed ${processedReviews.length} TripAdvisor reviews`);
        console.log(`📊 Processing Stats:`);
        console.log(`   📝 Reviews: ${processedReviews.length} total`);
        console.log(`   ⭐ Average rating: ${processedReviews.reduce((sum, r) => sum + r.rating, 0) / processedReviews.length}`);
        console.log(`   👍 Helpful votes: ${processedReviews.reduce((sum, r) => sum + r.helpfulVotes, 0)} total`);
        console.log(`   📸 Photos: ${processedReviews.reduce((sum, r) => sum + (r.photos?.length || 0), 0)} total`);
        console.log(`   💬 Owner responses: ${processedReviews.filter(r => r.hasOwnerResponse).length}`);

        await database.close();
        
        // Call TripAdvisorReviewAnalyticsService to process analytics
        try {
            const analyticsService = new TripAdvisorReviewAnalyticsService();
            await analyticsService.processReviewsAndUpdateDashboard(businessProfile.id);
            console.log(`📊 Analytics processing completed for businessProfileId: ${businessProfile.id}`);
        } catch (analyticsError) {
            console.error(`❌ Error processing TripAdvisor analytics:`, analyticsError);
            // Don't fail the whole job if analytics fails
        }

        // Call TripAdvisorOverviewService to process overview and periodical metrics
        try {
            const { TripAdvisorOverviewService } = await import('../../supabase/tripAdvisorOverviewService');
            const overviewService = new TripAdvisorOverviewService();
            
            // Get all reviews for this business to calculate comprehensive overview
            const { data: allReviews, error: reviewsError } = await supabase
                .from('TripAdvisorReview')
                .select(`
                    *,
                    reviewMetadata:ReviewMetadata(*)
                `)
                .eq('businessProfileId', businessProfile.id);
            
            if (reviewsError) {
                console.error(`❌ Error fetching TripAdvisor reviews for overview:`, reviewsError);
            } else if (allReviews && allReviews.length > 0) {
                await overviewService.processAndUpdateOverview(finalLocationId, allReviews);
                console.log(`📈 Overview processing completed for locationId: ${finalLocationId}`);
            } else {
                console.log(`ℹ️  No reviews found for overview processing`);
            }
            
            await overviewService.close();
        } catch (overviewError) {
            console.error(`❌ Error processing TripAdvisor overview:`, overviewError);
            // Don't fail the whole job if overview processing fails
        }
        
        // Log summary
        console.log(`📊 TripAdvisor Reviews Processing Summary:`);
        console.log(`   📝 Reviews processed: ${processedReviews.length}`);
        console.log(`   ⭐ Average rating: ${processedReviews.length > 0 ? (processedReviews.reduce((sum, r) => sum + r.rating, 0) / processedReviews.length).toFixed(1) : 'N/A'}`);
        console.log(`   📸 Photos: ${processedReviews.reduce((sum, r) => sum + (r.photos?.length || 0), 0)} total`);
        console.log(`   💬 With responses: ${processedReviews.filter(r => r.hasOwnerResponse).length}`);

        return true;
    } catch (error) {
        console.error('Error in TripAdvisor Business Reviews actor:', error);
        return false;
    }
} 