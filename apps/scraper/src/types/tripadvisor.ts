// Enums matching the Prisma schema
export enum TripAdvisorBusinessType {
  HOTEL = "HOTEL",
  RESTAURANT = "RESTAURANT",
  ATTRACTION = "ATTRACTION",
  OTHER = "OTHER",
}

export enum TripAdvisorRankingTrend {
  IMPROVING = "IMPROVING",
  DECLINING = "DECLINING",
  STABLE = "STABLE",
}

export enum TripAdvisorTripType {
  FAMILY = "FAMILY",
  COUPLES = "COUPLES",
  SOLO = "SOLO",
  BUSINESS = "BUSINESS",
  FRIENDS = "FRIENDS",
  NONE = "NONE",
}

// Supporting table interfaces
export interface TripAdvisorBusinessSubcategory {
  id: string;
  businessProfileId: string;
  subcategory: string;
}

export interface TripAdvisorBusinessAmenity {
  id: string;
  businessProfileId: string;
  amenity: string;
}

export interface TripAdvisorBusinessReviewTag {
  id: string;
  businessProfileId: string;
  text: string;
  reviews: number;
}

export interface TripAdvisorBusinessRoomTip {
  id: string;
  businessProfileId: string;
  type: string;
  text: string;
  rating: string;
  reviewId: string;
  tipId: string;
  createdTime: string;
}

export interface TripAdvisorBusinessPhoto {
  id: string;
  businessProfileId: string;
  url: string;
}

export interface TripAdvisorAncestorLocation {
  id: string;
  businessProfileId: string;
  locationId: string;
  name: string;
  abbreviation?: string | null;
  subcategory: string;
}

export interface TripAdvisorRatingHistogram {
  id: string;
  businessProfileId: string;
  count1: number;
  count2: number;
  count3: number;
  count4: number;
  count5: number;
}

export interface TripAdvisorAddress {
  id: string;
  businessProfileId: string;
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalcode?: string | null;
}

export interface TripAdvisorReviewSubRating {
  id: string;
  tripAdvisorReviewId: string;
  service?: number | null;
  food?: number | null;
  value?: number | null;
  atmosphere?: number | null;
  cleanliness?: number | null;
  location?: number | null;
  rooms?: number | null;
  sleepQuality?: number | null;
}

export interface TripAdvisorReviewerBadge {
  id: string;
  tripAdvisorReviewId: string;
  badge: string;
}

export interface TripAdvisorSentimentAnalysis {
  id: string;
  tripAdvisorOverviewId: string;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  totalAnalyzed: number;
  averageSentiment: number;
}

export interface TripAdvisorTopKeyword {
  id: string;
  tripAdvisorOverviewId: string;
  keyword: string;
  count: number;
}

export interface TripAdvisorTopTag {
  id: string;
  tripAdvisorOverviewId: string;
  tag: string;
  count: number;
}

export interface TripAdvisorRecentReview {
  id: string;
  tripAdvisorOverviewId: string;
  reviewId: string;
  rating: number;
  publishedDate: Date;
  text?: string | null;
  reviewerName: string;
}

export interface TripAdvisorPeriodicalKeyword {
  id: string;
  periodicalMetricId: string;
  keyword: string;
  count: number;
}

export interface TripAdvisorPeriodicalTag {
  id: string;
  periodicalMetricId: string;
  tag: string;
  count: number;
}

// Main business profile interface (updated to use relations instead of JSON)
export interface TripAdvisorBusinessProfile {
  id: string;
  teamId: string;

  // TripAdvisor identifiers
  tripAdvisorUrl: string;
  locationId: string;

  // Core business data
  name: string;
  type: TripAdvisorBusinessType;
  category: string;

  // Contact information
  phone?: string | null;
  email?: string | null;
  website?: string | null;

  // Location data
  locationString?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;

  // Business details
  description?: string | null;
  image?: string | null;
  photoCount?: number | null;

  // Ratings & reviews
  rating?: number | null;
  rawRanking?: number | null;
  rankingPosition?: number | null;
  rankingString?: string | null;
  rankingDenominator?: string | null;
  numberOfReviews?: number | null;

  // TripAdvisor specific fields
  hotelClass?: string | null;
  hotelClassAttribution?: string | null;
  priceLevel?: string | null;
  priceRange?: string | null;

  // Additional data
  checkInDate?: string | null;
  checkOutDate?: string | null;
  numberOfRooms?: number | null;
  whatsAppRedirectUrl?: string | null;

  // Internal tracking
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Relations (populated via joins)
  reviews?: TripAdvisorReview[];
  overview?: TripAdvisorOverview | null;
  businessMetadata?: TripAdvisorBusinessMetadata | null;
  ratingDistribution?: TripAdvisorRatingDistribution | null;
  subcategories?: TripAdvisorBusinessSubcategory[];
  amenities?: TripAdvisorBusinessAmenity[];
  reviewTags?: TripAdvisorBusinessReviewTag[];
  roomTips?: TripAdvisorBusinessRoomTip[];
  photos?: TripAdvisorBusinessPhoto[];
  ancestorLocations?: TripAdvisorAncestorLocation[];
  ratingHistogram?: TripAdvisorRatingHistogram | null;
  addressObj?: TripAdvisorAddress | null;
}

export interface TripAdvisorReview {
  id: string;
  businessProfileId: string;
  reviewMetadataId: string;

  // TripAdvisor identifiers
  tripAdvisorReviewId: string;
  reviewUrl?: string | null;

  // Core review data
  title?: string | null;
  text?: string | null;
  rating: number;
  publishedDate: Date;
  visitDate?: Date | null;

  // Reviewer information
  reviewerId: string;
  reviewerName: string;
  reviewerLocation?: string | null;
  reviewerLevel?: string | null;
  reviewerPhotoUrl?: string | null;

  // TripAdvisor engagement
  helpfulVotes: number;

  // Trip context
  tripType?: string | null;
  roomTip?: string | null;

  // Owner response
  responseFromOwnerText?: string | null;
  responseFromOwnerDate?: Date | null;
  hasOwnerResponse: boolean;

  // TripAdvisor business context
  locationId: string;
  businessName?: string | null;
  businessType?: string | null;

  // Internal tracking
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Relations (populated via joins)
  businessProfile?: TripAdvisorBusinessProfile;
  reviewMetadata?: ReviewMetadata;
  photos?: TripAdvisorReviewPhoto[];
  subRatings?: TripAdvisorReviewSubRating | null;
  reviewerBadges?: TripAdvisorReviewerBadge[];
}

export interface TripAdvisorReviewPhoto {
  id: string;
  tripAdvisorReviewId: string;

  // Photo data
  url: string;
  caption?: string | null;
  photoId?: string | null;
  width?: number | null;
  height?: number | null;
  photographerId?: string | null;

  // Relations
  tripAdvisorReview?: TripAdvisorReview;
}

export interface TripAdvisorOverview {
  id: string;
  businessProfileId: string;

  // Rating metrics
  averageRating?: number | null;
  totalReviews: number;

  // Rating distribution
  oneStarCount: number;
  twoStarCount: number;
  threeStarCount: number;
  fourStarCount: number;
  fiveStarCount: number;

  // Sub-rating averages
  averageServiceRating?: number | null;
  averageFoodRating?: number | null;
  averageValueRating?: number | null;
  averageAtmosphereRating?: number | null;
  averageCleanlinessRating?: number | null;
  averageLocationRating?: number | null;
  averageRoomsRating?: number | null;
  averageSleepQualityRating?: number | null;

  // Trip type analysis
  familyReviews: number;
  couplesReviews: number;
  soloReviews: number;
  businessReviews: number;
  friendsReviews: number;

  // Response metrics
  responseRate?: number | null;
  averageResponseTime?: number | null;

  // Ranking data
  currentRanking?: number | null;
  rankingDenominator?: number | null;
  rankingTrend?: TripAdvisorRankingTrend | null;

  // TripAdvisor specific metrics
  helpfulVotesTotal: number;
  averageHelpfulVotes: number;

  lastUpdated: Date;

  // Relations (populated via joins)
  businessProfile?: TripAdvisorBusinessProfile;
  ratingDistribution?: TripAdvisorRatingDistribution | null;
  tripAdvisorPeriodicalMetric?: TripAdvisorPeriodicalMetric[];
  sentimentAnalysis?: TripAdvisorSentimentAnalysis | null;
  topKeywords?: TripAdvisorTopKeyword[];
  topTags?: TripAdvisorTopTag[];
  recentReviews?: TripAdvisorRecentReview[];
}

export interface TripAdvisorRatingDistribution {
  id: string;
  businessProfileId: string;
  tripAdvisorOverviewId: string;

  // Rating distribution
  oneStar: number;
  twoStar: number;
  threeStar: number;
  fourStar: number;
  fiveStar: number;

  // Trip type distribution
  familyTrips: number;
  couplesTrips: number;
  soloTrips: number;
  businessTrips: number;
  friendsTrips: number;

  // Temporal distribution
  lastWeek: number;
  lastMonth: number;
  lastSixMonths: number;
  olderThanSixMonths: number;

  // Review quality distribution
  withPhotos: number;
  withoutPhotos: number;
  withRoomTips: number;
  withSubRatings: number;

  lastUpdated: Date;

  // Relations
  businessProfile?: TripAdvisorBusinessProfile;
  tripAdvisorOverview?: TripAdvisorOverview;
}

export interface TripAdvisorBusinessMetadata {
  id: string;
  businessProfileId: string;

  // Update scheduling
  updateFrequencyMinutes: number;
  nextUpdateAt: Date;
  lastUpdateAt: Date;
  isActive: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Relations
  businessProfile?: TripAdvisorBusinessProfile;
}

export interface TripAdvisorPeriodicalMetric {
  id: string;
  tripAdvisorOverviewId: string;

  // Period definition
  periodKey: number;
  periodLabel: string;

  // TripAdvisor-specific metrics for this period
  averageRating: number;
  oneStarCount: number;
  twoStarCount: number;
  threeStarCount: number;
  fourStarCount: number;
  fiveStarCount: number;
  reviewCount: number;

  // Sub-rating averages
  averageServiceRating?: number | null;
  averageFoodRating?: number | null;
  averageValueRating?: number | null;
  averageAtmosphereRating?: number | null;
  averageCleanlinessRating?: number | null;
  averageLocationRating?: number | null;
  averageRoomsRating?: number | null;
  averageSleepQualityRating?: number | null;

  // Trip type breakdown
  familyReviews: number;
  couplesReviews: number;
  soloReviews: number;
  businessReviews: number;
  friendsReviews: number;

  // Engagement metrics
  totalHelpfulVotes: number;
  averageHelpfulVotes: number;
  reviewsWithPhotos: number;

  // Response metrics
  responseRatePercent?: number | null;
  avgResponseTimeHours?: number | null;

  // Sentiment metrics
  sentimentPositive?: number | null;
  sentimentNeutral?: number | null;
  sentimentNegative?: number | null;
  sentimentTotal?: number | null;
  sentimentScore?: number | null;

  // Performance metrics
  rankingPosition?: number | null;
  rankingTrend?: TripAdvisorRankingTrend | null;
  competitorMentions?: number | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Relations
  overview?: TripAdvisorOverview;
  topKeywords?: TripAdvisorPeriodicalKeyword[];
  topTags?: TripAdvisorPeriodicalTag[];
}

// Helper interface for review processing
export interface TripAdvisorReviewWithMetadata {
  rating: number;
  publishedDate: string;
  visitDate?: string | null;
  helpfulVotes: number;
  photos?: TripAdvisorReviewPhoto[];
  tripType?: string | null;
  roomTip?: string | null;
  subRatings?: TripAdvisorReviewSubRating | null;
  reviewerBadges?: TripAdvisorReviewerBadge[];
  hasOwnerResponse: boolean;
  responseFromOwnerDate?: string | null;
  reviewMetadata: {
    emotional?: string | null;
    keywords?: string[] | null;
    reply?: string | null;
    replyDate?: string | null;
    date?: string | null;
    sentiment?: number | null;
    photoCount?: number | null;
  } | null;
}

export interface ReviewMetadata {
  id: string;
  externalId: string;
  source: string;

  // Core review data needed for display
  author: string;
  authorImage?: string | null;
  rating: number;
  text?: string | null;
  date: Date;

  // Media
  photoCount: number;
  photoUrls: string[];

  // Response management
  reply?: string | null;
  replyDate?: Date | null;
  hasReply: boolean;

  // Analytics
  sentiment?: number | null;
  keywords: string[];
  topics: string[];
  emotional?: string | null;
  actionable: boolean;
  responseUrgency?: number | null;
  competitorMentions: string[];
  comparativePositive?: boolean | null;

  // Workflow
  isRead: boolean;
  isImportant: boolean;
  labels: string[];

  // Metadata
  language?: string | null;
  scrapedAt: Date;
  sourceUrl?: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Relations
  tripAdvisorReview?: TripAdvisorReview;
}
