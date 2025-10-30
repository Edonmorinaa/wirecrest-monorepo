import { ApifyClient } from 'apify-client';
import { Actor, ReviewActorJobData } from './actor';
import { logger } from '../../utils/logger';
import { BookingReviewAnalyticsService } from '../../services/bookingReviewAnalyticsService';
import { prisma } from '@wirecrest/db';

export class BookingBusinessReviewsActor extends Actor {
    constructor() {
        super('PbMHke3jW25J6hSOA', 1024, "BOOKING");
    }

    /**
     * Update memory estimate based on job type
     */
    updateMemoryEstimate(isInitialization: boolean): void {
        this.memoryEstimateMB = isInitialization ? 2048 : 1024; // 2GB for init, 1GB for regular
    }
}

export const bookingBusinessReviewsActorJobRunner = async (
    actor: Actor, 
    data: ReviewActorJobData
): Promise<boolean> => {
    try {
        logger.info(`📝 Starting Booking.com reviews scraping for URL: ${data.bookingUrl}`);
        
        if (!data.bookingUrl) {
            throw new Error('Booking URL is required for Booking.com reviews scraping');
        }

        // Update memory estimate based on job type
        if (actor instanceof BookingBusinessReviewsActor) {
            actor.updateMemoryEstimate(data.isInitialization || false);
        }

        // Determine max reviews based on job type
        let maxReviews = data.maxReviews || 50;
        if (data.isInitialization) {
            maxReviews = data.maxReviews || 1000; // Default to 1000 for initialization
        }

        // Prepare input for voyager/booking-reviews-scraper
        const actorInput = {
            startUrls: [{
                url: data.bookingUrl
            }],
            maxReviewsPerHotel: maxReviews,
            
            // Sort options for most relevant reviews first
            sortReviewsBy: "f_relevance", // Most relevant first
            
            // Include all review scores for comprehensive analysis
            reviewScores: ["ALL"],
            
            // Language settings
            language: 'en-us',
            
            // Proxy configuration
            proxyConfiguration: {
                useApifyProxy: true
            }
        };

        logger.debug('📋 Booking.com reviews actor input:', { 
            actorInput: JSON.stringify(actorInput, null, 2),
            teamId: data.teamId,
            maxReviews
        });

        // Run the actor using ApifyClient
        const client = new ApifyClient({
            token: process.env.APIFY_TOKEN,
        });
        
        const run = await client.actor(actor.apifyIdentifier).call(actorInput);

        if (!run || !run.defaultDatasetId) {
            logger.error('❌ Booking.com reviews scraping failed: No dataset ID returned');
            return false;
        }

        // Get the reviews data
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        
        if (!items || items.length === 0) {
            logger.info('📭 No reviews found for Booking.com property:', data.bookingUrl);
            return true;
        }

        logger.info(`✅ Booking.com reviews scraping completed successfully. Found ${items.length} reviews. Dataset ID: ${run.defaultDatasetId}`);

        // Get business profile to get businessProfileId using Prisma
        const businessProfile = await prisma.bookingBusinessProfile.findFirst({
            where: {
                teamId: data.teamId,
                bookingUrl: data.bookingUrl
            },
            select: {
                id: true
            }
        });

        if (!businessProfile) {
            logger.error(`❌ Business profile not found for URL: ${data.bookingUrl}`);
            return false;
        }

        // Save reviews to database first (using the existing processBookingReviewsData method for now)
        const reviewService = new BookingReviewAnalyticsService();
        
        const processResult = await reviewService.processBookingReviewsData(
            items,
            data.teamId,
            data.bookingUrl,
            data.isInitialization || false
        );
        
        if (!processResult) {
            logger.error('❌ Failed to save Booking.com reviews to database');
            return false;
        }

        logger.info('💾 Booking.com reviews saved to database successfully');

        // Now process analytics - same pattern as other platforms
        try {
            await reviewService.processReviewsAndUpdateDashboard(businessProfile.id);
            logger.info(`📊 Analytics processing completed for businessProfileId: ${businessProfile.id}`);
        } catch (analyticsError) {
            logger.error(`❌ Error processing Booking.com analytics:`, analyticsError as Error);
            // Don't fail the whole job if analytics fails
        }
        return true;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`💥 Booking.com reviews actor job failed for team ${data.teamId}, URL ${data.bookingUrl}: ${errorMessage}`);
        return false;
    }
};

/**
 * Main handler for Booking.com business reviews scraping
 */
export async function handleBookingBusinessReviews(
    data: ReviewActorJobData
): Promise<boolean> {
    // Validate that this is a Booking.com job
    if (data.platform !== "BOOKING" || !data.bookingUrl) {
        logger.error(`Invalid job data for Booking.com actor: platform=${data.platform}, hasBookingUrl=${!!data.bookingUrl}`);
        return false;
    }

    const actor = new BookingBusinessReviewsActor();
    return await bookingBusinessReviewsActorJobRunner(actor, data);
} 