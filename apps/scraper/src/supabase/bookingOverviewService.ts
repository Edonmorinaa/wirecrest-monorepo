import { DatabaseService } from './database.js';
import { 
    BookingOverview,
    BookingBusinessProfile,
    BookingRatingDistribution,
    BookingSentimentAnalysis,
    BookingTopKeyword,
    BookingRecentReview,
    BookingPeriodicalMetric
} from './models.js';
import { logger } from '../utils/logger.js';

export class BookingOverviewService {
    private database: DatabaseService;

    constructor() {
        this.database = new DatabaseService();
    }

    /**
     * Get comprehensive overview for a Booking.com business
     */
    async getBookingOverview(businessProfileId: string): Promise<BookingOverview | null> {
        try {
            // TODO: Implement getBookingOverviewByBusinessId in DatabaseService
            // For now, return null until the database method is implemented
            return null;
        } catch (error) {
            logger.error('Error fetching Booking.com overview:', error as any);
            throw error;
        }
    }

    /**
     * Get overview with all related data (rating distribution, sentiment analysis, etc.)
     */
    async getComprehensiveBookingOverview(businessProfileId: string): Promise<{
        overview: BookingOverview | null;
        ratingDistribution: BookingRatingDistribution | null;
        sentimentAnalysis: BookingSentimentAnalysis | null;
        topKeywords: BookingTopKeyword[];
        recentReviews: BookingRecentReview[];
        periodicalMetrics: BookingPeriodicalMetric[];
    }> {
        try {
            // TODO: Implement these methods in DatabaseService
            // For now, return null/empty values until the database methods are implemented
            const overview = null;
            const ratingDistribution = null;
            const sentimentAnalysis = null;
            const topKeywords: BookingTopKeyword[] = [];
            const recentReviews: BookingRecentReview[] = [];
            const periodicalMetrics: BookingPeriodicalMetric[] = [];

            return {
                overview,
                ratingDistribution,
                sentimentAnalysis,
                topKeywords,
                recentReviews,
                periodicalMetrics
            };
        } catch (error) {
            logger.error('Error fetching comprehensive Booking.com overview:', error as any);
            throw error;
        }
    }

    /**
     * Update overview statistics
     */
    async updateBookingOverviewStats(businessProfileId: string): Promise<void> {
        try {
            // This would trigger a recalculation of the overview
            // Similar to other platforms, we would:
            // 1. Get all reviews for the business
            // 2. Recalculate metrics
            // 3. Update the overview record
            
            logger.info(`Updating Booking.com overview stats for business ${businessProfileId}`);
            
            // The actual implementation would be in BookingReviewAnalyticsService
            // This is a placeholder for the update trigger
            
        } catch (error) {
            logger.error('Error updating Booking.com overview stats:', error);
            throw error;
        }
    }

    /**
     * Get guest type breakdown for dashboard
     */
    async getGuestTypeBreakdown(businessProfileId: string): Promise<{
        soloTravelers: number;
        couples: number;
        familiesWithYoungChildren: number;
        familiesWithOlderChildren: number;
        groupsOfFriends: number;
        businessTravelers: number;
        total: number;
    }> {
        try {
            const overview = await this.getBookingOverview(businessProfileId);
            
            if (!overview) {
                return {
                    soloTravelers: 0,
                    couples: 0,
                    familiesWithYoungChildren: 0,
                    familiesWithOlderChildren: 0,
                    groupsOfFriends: 0,
                    businessTravelers: 0,
                    total: 0
                };
            }

            const total = overview.soloTravelers + overview.couples + 
                         overview.familiesWithYoungChildren + overview.familiesWithOlderChildren +
                         overview.groupsOfFriends + overview.businessTravelers;

            return {
                soloTravelers: overview.soloTravelers,
                couples: overview.couples,
                familiesWithYoungChildren: overview.familiesWithYoungChildren,
                familiesWithOlderChildren: overview.familiesWithOlderChildren,
                groupsOfFriends: overview.groupsOfFriends,
                businessTravelers: overview.businessTravelers,
                total
            };
        } catch (error) {
            logger.error('Error getting guest type breakdown:', error);
            throw error;
        }
    }

    /**
     * Get stay length analysis for dashboard
     */
    async getStayLengthAnalysis(businessProfileId: string): Promise<{
        averageLengthOfStay: number | null;
        shortStays: number;
        mediumStays: number;
        longStays: number;
        totalStays: number;
    }> {
        try {
            const overview = await this.getBookingOverview(businessProfileId);
            
            if (!overview) {
                return {
                    averageLengthOfStay: null,
                    shortStays: 0,
                    mediumStays: 0,
                    longStays: 0,
                    totalStays: 0
                };
            }

            const totalStays = overview.shortStays + overview.mediumStays + overview.longStays;

            return {
                averageLengthOfStay: overview.averageLengthOfStay ?? null,
                shortStays: overview.shortStays ?? 0,
                mediumStays: overview.mediumStays ?? 0,
                longStays: overview.longStays ?? 0,
                totalStays
            };
        } catch (error) {
            logger.error('Error getting stay length analysis:', error);
            throw error;
        }
    }

    /**
     * Get sub-ratings breakdown for reputation dashboard
     */
    async getSubRatingsBreakdown(businessProfileId: string): Promise<{
        cleanliness: number | null;
        comfort: number | null;
        location: number | null;
        facilities: number | null;
        staff: number | null;
        valueForMoney: number | null;
        wifi: number | null;
        overall: number | null;
    }> {
        try {
            const overview = await this.getBookingOverview(businessProfileId);
            
            if (!overview) {
                return {
                    cleanliness: null,
                    comfort: null,
                    location: null,
                    facilities: null,
                    staff: null,
                    valueForMoney: null,
                    wifi: null,
                    overall: null
                };
            }

            return {
                cleanliness: overview.averageCleanlinessRating ?? null,
                comfort: overview.averageComfortRating ?? null,
                location: overview.averageLocationRating ?? null,
                facilities: overview.averageFacilitiesRating ?? null,
                staff: overview.averageStaffRating ?? null,
                valueForMoney: overview.averageValueForMoneyRating ?? null,
                wifi: overview.averageWifiRating ?? null,
                overall: overview.averageRating ?? null
            };
        } catch (error) {
            logger.error('Error getting sub-ratings breakdown:', error);
            throw error;
        }
    }

    /**
     * Close database connection
     */
    async close(): Promise<void> {
        await this.database.close();
    }
} 