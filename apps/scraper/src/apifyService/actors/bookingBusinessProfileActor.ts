import { Actor, ReviewActorJobData } from './actor';
import { MarketPlatform } from '@prisma/client';
import { logger } from '../../utils/logger';

export class BookingBusinessProfileActor extends Actor {
    constructor() {
        super('oeiQgfg5fsmIJB7Cn', 512, MarketPlatform.BOOKING);
    }
}

export const bookingBusinessProfileActorJobRunner = async (
    actor: Actor, 
    data: ReviewActorJobData
): Promise<boolean> => {
    try {
        logger.info(`🏨 Starting Booking.com business profile scraping for URL: ${data.bookingUrl}`);
        
        if (!data.bookingUrl) {
            throw new Error('Booking URL is required for Booking.com profile scraping');
        }

        // Prepare input for voyager/booking-scraper
        const actorInput = {
            startUrls: [{
                url: data.bookingUrl
            }],
            // Get comprehensive property data including rooms
            includeReviews: false,  // We handle reviews separately
            includePhotos: true,
            includeRooms: true,     // Key feature for reputation dashboard
            includeFacilities: true,
            maxReviews: 0,          // No reviews in this actor
            
            // Language and region settings
            language: 'en-us',
            currency: 'USD',
            
            // Proxy configuration
            proxyConfiguration: {
                useApifyProxy: true
            }
        };

        logger.debug('📋 Booking.com profile actor input:', { 
            actorInput: JSON.stringify(actorInput, null, 2),
            teamId: data.teamId 
        });

        // Import and run the actor using ApifyClient directly
        const { ApifyClient } = await import('apify-client');
        const client = new ApifyClient({
            token: process.env.APIFY_TOKEN,
        });
        
        const run = await client.actor(actor.apifyIdentifier).call(actorInput);

        if (!run || !run.defaultDatasetId) {
            logger.error('❌ Booking.com profile scraping failed: No dataset ID returned');
            return false;
        }

        logger.info(`✅ Booking.com profile scraping completed successfully. Dataset ID: ${run.defaultDatasetId}`);
        logger.debug('📊 Booking.com profile result stats:', run);

        // Process the scraped data
        if (run.defaultDatasetId) {
            // TODO: Create BookingBusinessProfileService
            // const { BookingBusinessProfileService } = await import('../../services/bookingBusinessProfileService.js');
            // const profileService = new BookingBusinessProfileService();
            
            // await profileService.processBookingProfileData(
            //     run.defaultDatasetId,
            //     data.teamId,
            //     data.bookingUrl
            // );
            
            logger.info('📈 Booking.com profile data ready for processing');
        }

        return true;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`💥 Booking.com profile actor job failed for team ${data.teamId}, URL ${data.bookingUrl}: ${errorMessage}`);
        return false;
    }
}; 