import { MarketPlatform } from "@prisma/client";

export class ActorJob {
  id: string;
  actor: Actor;
  data: ReviewActorJobData;
  run: () => Promise<boolean>;

  constructor(
    id: string,
    actor: Actor,
    data: ReviewActorJobData,
    run: (actor: Actor, data: ReviewActorJobData) => Promise<boolean>,
  ) {
    this.id = id;
    this.actor = actor;
    this.data = data;
    this.run = () => run(actor, data);
  }
}

export class Actor {
  apifyIdentifier: string;
  memoryEstimateMB: number;
  platform: MarketPlatform;

  constructor(
    apifyIdentifier: string,
    memoryEstimateMB: number,
    platform: MarketPlatform,
  ) {
    this.apifyIdentifier = apifyIdentifier;
    this.memoryEstimateMB = memoryEstimateMB;
    this.platform = platform;
  }
}

/**
 * Universal interface for all review actor job data
 * Each platform uses the same interface but different identifier fields
 */
export interface ReviewActorJobData {
  // Universal fields
  platform: MarketPlatform;
  teamId: string;
  isInitialization?: boolean;
  maxReviews?: number;

  // Platform-specific identifiers (only one should be used per job)
  placeID?: string; // Google Maps
  pageId?: string; // Facebook
  yelpId?: string; // Yelp
  locationId?: string; // TripAdvisor location ID
  bookingUrl?: string; // Booking.com URL

  // Optional platform-specific data
  pageUrl?: string; // Facebook page URL as alternative
  businessUrl?: string; // Yelp business URL as alternative
  tripAdvisorUrl?: string; // TripAdvisor business URL
}

export interface BatchReviewActorJobData {
  platform: MarketPlatform;
  businesses: Array<{
    teamId: string;
    placeId?: string; // Google Maps
    pageId?: string; // Facebook
    pageUrl?: string; // Facebook URL
    bookingUrl?: string; // Booking.com URL
    businessProfileId: string;
    maxReviews: number;
  }>;
  isInitialization: boolean;
}

/**
 * Factory for creating platform-specific actor jobs
 *
 * Usage Examples:
 *
 * // Google Maps job
 * const googleJobData = ReviewActorJobFactory.createGoogleJob(
 *   'ChIJN1t_tDeuEmsRUsoyG83frY4',
 *   'team-123',
 *   true, // isInitialization
 *   2000  // maxReviews
 * );
 *
 * // Facebook job
 * const facebookJobData = ReviewActorJobFactory.createFacebookJob(
 *   'myrestaurant',
 *   'team-123',
 *   false, // not initialization
 *   100,   // maxReviews
 *   'https://facebook.com/myrestaurant' // optional URL
 * );
 *
 * // Yelp job
 * const yelpJobData = ReviewActorJobFactory.createYelpJob(
 *   'yelp-business-id',
 *   'team-123'
 * );
 */
export class ReviewActorJobFactory {
  /**
   * Create a Google Maps review actor job
   */
  static createGoogleJob(
    placeID: string,
    teamId: string,
    isInitialization: boolean = false,
    maxReviews?: number,
  ): ReviewActorJobData {
    return {
      platform: MarketPlatform.GOOGLE_MAPS,
      teamId,
      placeID,
      isInitialization,
      maxReviews,
    };
  }

  /**
   * Create a Facebook review actor job
   */
  static createFacebookJob(
    pageId: string,
    teamId: string,
    isInitialization: boolean = false,
    maxReviews?: number,
    pageUrl?: string,
  ): ReviewActorJobData {
    return {
      platform: MarketPlatform.FACEBOOK,
      teamId,
      pageId,
      pageUrl,
      isInitialization,
      maxReviews,
    };
  }

  /**
   * Create a Yelp review actor job
   */
  static createYelpJob(
    yelpId: string,
    teamId: string,
    isInitialization: boolean = false,
    maxReviews?: number,
    businessUrl?: string,
  ): ReviewActorJobData {
    return {
      platform: MarketPlatform.YELP,
      teamId,
      yelpId,
      businessUrl,
      isInitialization,
      maxReviews,
    };
  }

  /**
   * Create a TripAdvisor review actor job
   */
  static createTripAdvisorJob(
    locationId: string,
    teamId: string,
    isInitialization: boolean = false,
    maxReviews?: number,
    tripAdvisorUrl?: string,
  ): ReviewActorJobData {
    return {
      platform: MarketPlatform.TRIPADVISOR,
      teamId,
      locationId,
      tripAdvisorUrl,
      isInitialization,
      maxReviews,
    };
  }

  /**
   * Create a Booking.com review actor job
   */
  static createBookingJob(
    bookingUrl: string,
    teamId: string,
    isInitialization: boolean = false,
    maxReviews?: number,
  ): ReviewActorJobData {
    return {
      platform: MarketPlatform.BOOKING,
      teamId,
      bookingUrl,
      isInitialization,
      maxReviews,
    };
  }

  /**
   * Validate that the job data has the required identifier for its platform
   */
  static validateJobData(data: ReviewActorJobData): boolean {
    switch (data.platform) {
      case MarketPlatform.GOOGLE_MAPS:
        return !!data.placeID;
      case MarketPlatform.FACEBOOK:
        return !!(data.pageId || data.pageUrl);
      case MarketPlatform.YELP:
        return !!(data.yelpId || data.businessUrl);
      case MarketPlatform.TRIPADVISOR:
        return !!(data.locationId || data.tripAdvisorUrl);
      case MarketPlatform.BOOKING:
        return !!data.bookingUrl;
      default:
        return false;
    }
  }

  /**
   * Get the primary identifier for a job based on its platform
   */
  static getPrimaryIdentifier(data: ReviewActorJobData): string | null {
    switch (data.platform) {
      case MarketPlatform.GOOGLE_MAPS:
        return data.placeID || null;
      case MarketPlatform.FACEBOOK:
        return data.pageId || data.pageUrl || null;
      case MarketPlatform.YELP:
        return data.yelpId || data.businessUrl || null;
      case MarketPlatform.TRIPADVISOR:
        return data.locationId || data.tripAdvisorUrl || null;
      case MarketPlatform.BOOKING:
        return data.bookingUrl || null;
      default:
        return null;
    }
  }

  /**
   * Get a display name for the job based on platform and identifier
   */
  static getJobDisplayName(data: ReviewActorJobData): string {
    const identifier = this.getPrimaryIdentifier(data);
    const platform = data.platform.toLowerCase().replace("_", " ");
    const type = data.isInitialization ? "initialization" : "polling";

    return `${platform} ${type} job for ${identifier}`;
  }

  /**
   * Create a Google Maps batch review actor job
   */
  static createGoogleBatchJob(
    businesses: Array<{
      teamId: string;
      placeId: string;
      businessProfileId: string;
      maxReviews: number;
    }>,
    isInitialization: boolean = false,
  ): BatchReviewActorJobData {
    return {
      platform: MarketPlatform.GOOGLE_MAPS,
      businesses: businesses.map((b) => ({
        teamId: b.teamId,
        placeId: b.placeId,
        businessProfileId: b.businessProfileId,
        maxReviews: b.maxReviews,
      })),
      isInitialization,
    };
  }

  /**
   * Create a Facebook batch review actor job
   */
  static createFacebookBatchJob(
    businesses: Array<{
      teamId: string;
      pageUrl: string;
      businessProfileId: string;
      maxReviews: number;
    }>,
    isInitialization: boolean = false,
  ): BatchReviewActorJobData {
    return {
      platform: MarketPlatform.FACEBOOK,
      businesses: businesses.map((b) => ({
        teamId: b.teamId,
        pageUrl: b.pageUrl,
        businessProfileId: b.businessProfileId,
        maxReviews: b.maxReviews,
      })),
      isInitialization,
    };
  }

  /**
   * Create a Booking.com batch review actor job
   */
  static createBookingBatchJob(
    businesses: Array<{
      teamId: string;
      bookingUrl: string;
      businessProfileId: string;
      maxReviews: number;
    }>,
    isInitialization: boolean = false,
  ): BatchReviewActorJobData {
    return {
      platform: MarketPlatform.BOOKING,
      businesses: businesses.map((b) => ({
        teamId: b.teamId,
        bookingUrl: b.bookingUrl,
        businessProfileId: b.businessProfileId,
        maxReviews: b.maxReviews,
      })),
      isInitialization,
    };
  }
}
