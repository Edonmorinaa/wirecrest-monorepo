import type { SubscriptionStatus } from "@wirecrest/db";
import type { MarketPlatform } from "@wirecrest/db";
import type { SubscriptionPlan } from "@wirecrest/billing";
import type { TripAdvisorBusinessType } from "@wirecrest/db";
import type { TripAdvisorRankingTrend } from "@wirecrest/db";
import type { BookingGuestType, BookingPropertyType } from "@wirecrest/db";

export interface GoogleBusinessProfile {
  id: string;
  teamId: string;
  placeId?: string;
  displayName?: string;
  displayNameLanguageCode?: string;
  formattedAddress?: string;
  shortFormattedAddress?: string;
  plusCode?: any; // JSON
  businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  types: string[];
  primaryType?: string;
  primaryTypeDisplayName?: string;
  primaryTypeDisplayNameLanguageCode?: string;
  addressDescriptor?: any; // JSON
  allowsDogs?: boolean;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  accessibilityOptions?: any; // JSON
  curbsidePickup?: 'CURBSIDE_PICKUP_AVAILABLE' | 'NO_CURBSIDE_PICKUP';
  delivery?: 'DELIVERY_AVAILABLE' | 'NO_DELIVERY';
  dineIn?: 'DINE_IN_AVAILABLE' | 'NO_DINE_IN';
  priceLevel?: 'FREE' | 'INEXPENSIVE' | 'MODERATE' | 'EXPENSIVE' | 'VERY_EXPENSIVE';
  reservable?: 'RESERVABLE' | 'NOT_RESERVABLE';
  servesBeer?: 'SERVES_BEER' | 'NO_BEER';
  servesBreakfast?: 'SERVES_BREAKFAST' | 'NO_BREAKFAST';
  servesBrunch?: 'SERVES_BRUNCH' | 'NO_BRUNCH';
  servesDinner?: 'SERVES_DINNER' | 'NO_DINNER';
  servesLunch?: 'SERVES_LUNCH' | 'NO_LUNCH';
  servesVegetarianFood?: 'SERVES_VEGETARIAN_FOOD' | 'NO_VEGETARIAN_FOOD';
  servesWine?: 'SERVES_WINE' | 'NO_WINE';
  takeout?: 'TAKEOUT_AVAILABLE' | 'NO_TAKEOUT';
  goodForChildren?: boolean;
  goodForGroups?: boolean;
  goodForWatchingSports?: boolean;
  liveMusic?: boolean;
  menuUri?: string;
  parkingOptions?: any; // JSON
  paymentOptions?: any; // JSON
  restroomType?: string;
  subDestinations: string[];
  utcOffsetMinutes?: number;
  adrFormatAddress?: string;
  
  // Relations
  addressComponents?: AddressComponent[];
  photos?: Photo[];
  openingHours?: OpeningHours;
  currentOpeningHours?: OpeningHours;
  regularOpeningHours?: OpeningHours;
  reviews?: GoogleReview[];
  overview?: GoogleOverview;
  metadata?: GoogleBusinessMetadata;
  location?: Location;
  reviewsDistribution?: ReviewsDistribution;
  categories?: Category[];
  imageCategories?: ImageCategory[];
  popularTimesHistogram?: PopularTimesHistogram;
  reviewsTags?: ReviewsTag[];
  additionalInfo?: AdditionalInfo;
  questionsAndAnswers?: QuestionsAndAnswers;
}

export interface GoogleReview {
  id: string;
  businessProfileId: string;
  reviewMetadataId: string;
  reviewerId: string;
  reviewerUrl: string;
  name: string;
  reviewerNumberOfReviews: number;
  isLocalGuide: boolean;
  reviewerPhotoUrl: string;
  text?: string;
  textTranslated?: string;
  publishAt: string;
  publishedAtDate: Date;
  likesCount: number;
  reviewUrl: string;
  reviewOrigin: string;
  stars: number;
  rating?: number;
  responseFromOwnerDate?: Date;
  responseFromOwnerText?: string;
  reviewImageUrls: string[];
  reviewContext?: any;
  reviewDetailedRating?: any;
  visitedIn?: string;
  originalLanguage?: string;
  translatedLanguage?: string;
  isAdvertisement: boolean;
  placeId: string;
  location: any;
  address: string;
  neighborhood?: string;
  street: string;
  city: string;
  postalCode?: string;
  state?: string;
  countryCode: string;
  categoryName: string;
  categories: string[];
  title: string;
  totalScore: number;
  permanentlyClosed: boolean;
  temporarilyClosed: boolean;
  reviewsCount: number;
  url: string;
  price?: string;
  cid: string;
  fid: string;
  imageUrl: string;
  scrapedAt: Date;
  language: string;
  reviewMetadata?: ReviewMetadata;
}

export interface ReviewMetadata {
  id: string;
  externalId: string;
  source: MarketPlatform;
  author: string;
  authorImage?: string;
  rating: number;
  text?: string;
  date: Date;
  photoCount: number;
  photoUrls: string[];
  reply?: string;
  replyDate?: Date;
  hasReply: boolean;
  sentiment?: number;
  keywords: string[];
  topics: string[];
  emotional?: string;
  actionable: boolean;
  responseUrgency?: number;
  competitorMentions: string[];
  comparativePositive?: boolean;
  isRead: boolean;
  isImportant: boolean;
  labels: string[];
  language?: string;
  scrapedAt: Date;
  sourceUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoogleBusinessMetadata {
  id: string;
  businessProfileId: string;
  updateFrequencyMinutes: number;
  nextUpdateAt: Date;
  lastUpdateAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoogleOverview {
  id: string;
  businessProfileId: string;
  averageRating?: number;
  totalReviews: number;
  responseRate?: number;
  averageResponseTime?: number;
  ratingDistribution?: any;
  sentimentAnalysis?: any;
  topKeywords?: any;
  platformDistribution?: any;
  recentReviews?: any;
  lastUpdated: Date;
}

export interface FacebookBusinessProfile {
  id: string;
  teamId: string;
  
  // Not-nullable fields (required from Apify response)
  facebookUrl: string;      // Primary URL from Apify
  pageId: string;           // Facebook page ID (not-nullable)
  facebookId: string;       // Facebook ID (not-nullable)
  
  // Core profile data (from Apify response)
  categories: string[];     // Array of categories like ["Page", "Restaurant"]
  info: string[];          // Array of info strings
  likes: number;           // Number of likes
  title: string;           // Page title
  pageName: string;        // Page name/username
  pageUrl: string;         // Canonical page URL
  followers: number;       // Number of followers
  
  // Optional fields (nullable from Apify response)
  messenger?: string | null;
  priceRange?: string | null;     // Like "$$", "$$$", etc.
  intro?: string | null;          // Page intro/description
  websites: string[];             // Array of website URLs
  phone?: string | null;
  email?: string | null;
  profilePictureUrl?: string | null;
  coverPhotoUrl?: string | null;
  profilePhoto?: string | null;   // URL to profile photo page
  creationDate?: string | null;   // Like "May 5, 2011"
  adStatus?: string | null;       // Like "This Page is currently running ads."
  
  // Complex optional objects
  aboutMe?: {
    text?: string;
    urls?: string[];
  } | null;
  
  pageAdLibrary?: {
    is_business_page_active?: boolean;
    id?: string;
  } | null;
  
  // Internal tracking
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: any;          // For any additional metadata
  
  // Relations
  reviews?: FacebookReview[];
  overview?: FacebookOverview;
  businessMetadata?: FacebookBusinessMetadata;
  recommendationDistribution?: FacebookRecommendationDistribution;
}

export interface FacebookOverview {
  id: string;
  businessProfileId: string;
  
  // Facebook-specific recommendation metrics (instead of star ratings)
  totalReviews: number;                    // Total number of reviews/recommendations
  recommendedCount: number;                // Number of "recommended" reviews
  notRecommendedCount: number;             // Number of "not recommended" reviews
  recommendationRate: number;              // Percentage of recommended vs total (0-100)
  
  // Engagement metrics (unique to Facebook)
  totalLikes: number;                      // Total likes across all reviews
  totalComments: number;                   // Total comments across all reviews
  totalPhotos: number;                     // Total photos attached to reviews
  averageLikesPerReview: number;           // Average likes per review
  averageCommentsPerReview: number;        // Average comments per review
  
  // Content analysis
  sentimentAnalysis?: FacebookSentimentAnalysis;
  topKeywords?: FacebookKeywordAnalysis[];
  topTags?: FacebookTagAnalysis[];         // Analysis of Facebook-specific tags
  
  // Temporal metrics
  recentReviews?: any;                     // Recent reviews data
  reviewsTrends?: FacebookReviewsTrends;   // Trending data over time
  
  // Response metrics (if business responds to reviews)
  responseRate?: number;                   // Percentage of reviews responded to
  averageResponseTime?: number;            // Average response time in hours
  
  lastUpdated: Date;
}

export interface FacebookSentimentAnalysis {
  overallSentiment: number;                // Overall sentiment score (-1 to 1)
  positiveSentiment: number;               // Percentage of positive sentiment
  neutralSentiment: number;                // Percentage of neutral sentiment
  negativeSentiment: number;               // Percentage of negative sentiment
  sentimentTrend: 'improving' | 'declining' | 'stable'; // Sentiment trend
}

export interface FacebookKeywordAnalysis {
  keyword: string;
  frequency: number;                       // How often the keyword appears
  sentiment: number;                       // Average sentiment for this keyword
  associatedTags: string[];                // Facebook tags often associated with this keyword
}

export interface FacebookTagAnalysis {
  tag: string;                            // Facebook tag (e.g., "Family-friendly", "Great service")
  count: number;                          // Number of reviews with this tag
  recommendationRate: number;             // Percentage of recommended reviews with this tag
  averageSentiment: number;               // Average sentiment for reviews with this tag
}

export interface FacebookReviewsTrends {
  dailyTrends: FacebookDailyTrend[];
  weeklyTrends: FacebookWeeklyTrend[];
  monthlyTrends: FacebookMonthlyTrend[];
}

export interface FacebookDailyTrend {
  date: Date;
  recommendedCount: number;
  notRecommendedCount: number;
  totalLikes: number;
  totalComments: number;
  averageSentiment: number;
}

export interface FacebookWeeklyTrend {
  weekStart: Date;
  weekEnd: Date;
  recommendedCount: number;
  notRecommendedCount: number;
  totalEngagement: number;                 // likes + comments
  averageSentiment: number;
  topTags: string[];
}

export interface FacebookMonthlyTrend {
  monthStart: Date;
  monthEnd: Date;
  recommendedCount: number;
  notRecommendedCount: number;
  totalEngagement: number;
  averageSentiment: number;
  topKeywords: string[];
  topTags: string[];
}

// Facebook-specific distribution model (replaces traditional rating distribution)
export interface FacebookRecommendationDistribution {
  id: string;
  businessProfileId: string;
  
  // Recommendation distribution
  recommended: number;                     // Count of recommended reviews
  notRecommended: number;                  // Count of not recommended reviews
  
  // Engagement distribution
  highEngagement: number;                  // Reviews with >5 likes or >2 comments
  mediumEngagement: number;                // Reviews with 1-5 likes or 1-2 comments
  lowEngagement: number;                   // Reviews with 0 likes and 0 comments
  
  // Content distribution
  withPhotos: number;                      // Reviews with attached photos
  withoutPhotos: number;                   // Reviews without photos
  withTags: number;                        // Reviews with Facebook tags
  withoutTags: number;                     // Reviews without tags
  
  // Temporal distribution
  lastWeek: number;                        // Reviews from last 7 days
  lastMonth: number;                       // Reviews from last 30 days
  lastSixMonths: number;                   // Reviews from last 6 months
  olderThanSixMonths: number;              // Reviews older than 6 months
  
  lastUpdated: Date;
}

export interface FacebookBusinessMetadata {
  id: string;
  businessProfileId: string;
  updateFrequencyMinutes: number;
  nextUpdateAt: Date;
  lastUpdateAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FacebookReview {
  id: string;
  businessProfileId: string;
  reviewMetadataId: string;
  
  // Core review data from Facebook response
  facebookReviewId: string;     // The 'id' from Facebook response
  legacyId: string;             // Facebook's legacy ID
  date: Date;                   // Published date
  url: string;                  // Direct URL to the review/post
  text?: string;                // Review text content
  isRecommended: boolean;       // Facebook's recommendation status (replaces rating)
  
  // User/Reviewer information
  userId: string;               // User's Facebook ID
  userName: string;             // User's display name
  userProfileUrl?: string;      // User's profile URL
  userProfilePic?: string;      // User's profile picture URL
  
  // Engagement metrics
  likesCount: number;           // Number of likes on the review
  commentsCount: number;        // Number of comments on the review
  
  // Content categorization
  tags: string[];               // Tags like ["Family-friendly", "Great service"]
  
  // Media attachments
  photos: FacebookReviewPhoto[]; // Associated photos
  comments: FacebookReviewComment[]; // Associated comments
  
  // Page context
  facebookPageId: string;       // Page's Facebook ID
  pageName: string;             // Page name/username
  inputUrl: string;             // Original input URL used for scraping
  
  // Metadata from page
  pageAdLibrary?: {
    is_business_page_active?: boolean;
    id?: string;
  };
  
  // Internal tracking
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  reviewMetadata: ReviewMetadata;
}

export interface FacebookReviewPhoto {
  id: string;
  facebookReviewId: string;
  url: string;                  // Direct photo URL
  imageUri: string;             // Image URI
  height?: number;              // Image height
  width?: number;               // Image width
  viewerImageUri?: string;      // Higher resolution viewer image
  viewerHeight?: number;        // Viewer image height
  viewerWidth?: number;         // Viewer image width
  photoId: string;              // Facebook photo ID
  accessibilityCaption?: string; // Accessibility description
  isPlayable: boolean;          // Whether it's a video
  ownerUserId?: string;         // Photo owner's user ID
}

export interface FacebookReviewComment {
  id: string;
  facebookReviewId: string;
  commentId: string;            // Facebook comment ID
  date: Date;                   // Comment date
  text: string;                 // Comment text
  likesCount: number;           // Number of likes on comment
  
  // Commenter info
  commenterName?: string;
  commenterProfileUrl?: string;
  commenterProfilePic?: string;
}

export interface YelpReview {
  id: string;
  reviewMetadataId: string;
  reviewMetadata: ReviewMetadata;
}

export interface BusinessMarketIdentifier {
  id: string;
  teamId: string;
  platform: MarketPlatform;
  identifier: string;
  createdAt: Date;
  updatedAt: Date;
}

// Team interface matching your Prisma schema
export interface Team {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  defaultRole: string;
  billingId?: string;
  billingProvider?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Extended Team interface for subscription management
export interface TeamWithSubscription extends Team {
  // These would come from joining with Subscription table
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  maxBusinesses: number;
  maxReviewsPerBusiness: number;
  updateFrequencyMinutes: number;
  isActive: boolean;
}


// LEGACY: Function commented out - depends on enum above
/*
// Helper function to get subscription defaults
export function getSubscriptionDefaults(plan: SubscriptionPlan = SubscriptionPlan.FREE): {
  maxBusinesses: number;
  maxReviewsPerBusiness: number;
  updateFrequencyMinutes: number;
} {
  switch (plan) {
    case SubscriptionPlan.FREE:
      return {
        maxBusinesses: 1,
        maxReviewsPerBusiness: 100,
        updateFrequencyMinutes: 1440 // 24 hours
      };
    case SubscriptionPlan.BASIC:
      return {
        maxBusinesses: 5,
        maxReviewsPerBusiness: 500,
        updateFrequencyMinutes: 720 // 12 hours
      };
    case SubscriptionPlan.PREMIUM:
      return {
        maxBusinesses: 20,
        maxReviewsPerBusiness: 1000,
        updateFrequencyMinutes: 360 // 6 hours
      };
    case SubscriptionPlan.ENTERPRISE:
      return {
        maxBusinesses: 100,
        maxReviewsPerBusiness: 2000,
        updateFrequencyMinutes: 60 // 1 hour
      };
    default:
      return getSubscriptionDefaults(SubscriptionPlan.FREE);
  }
}
*/

// Google Places API v1 Types
export interface GooglePlaceV1OpeningHoursPeriodPoint {
  day?: number;
  hour?: number;
  minute?: number;
  date?: { year: number; month: number; day: number };
  truncated?: boolean;
}

export interface GooglePlaceV1OpeningHoursPeriod {
  open: GooglePlaceV1OpeningHoursPeriodPoint;
  close: GooglePlaceV1OpeningHoursPeriodPoint;
}

export interface GooglePlaceV1OpeningHours {
  openNow?: boolean;
  periods?: GooglePlaceV1OpeningHoursPeriod[];
  weekdayDescriptions?: string[];
  secondaryHoursType?: string;
}

export interface GooglePlaceV1Photo {
  name: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: { displayName: string; uri: string; photoUri: string }[];
}

export interface GooglePlaceV1AddressComponent {
  longText: string;
  shortText: string;
  types: string[];
  languageCode: string;
}

export interface GooglePlaceV1AccessibilityOptions {
  wheelchairAccessibleEntrance?: boolean;
  wheelchairAccessibleParking?: boolean;
  wheelchairAccessibleRestroom?: boolean;
  wheelchairAccessibleSeating?: boolean;
}

export interface GooglePlaceV1ParkingOptions {
  freeParkingLot?: boolean;
  freeStreetParking?: boolean;
  paidParkingLot?: boolean;
  paidStreetParking?: boolean;
  valetParking?: boolean;
}

export interface GooglePlaceV1PaymentOptions {
  acceptsCreditCards?: boolean;
  acceptsDebitCards?: boolean;
  acceptsCashOnly?: boolean;
  acceptsNfc?: boolean;
}

export interface GooglePlaceV1 {
  name: string;
  id: string;
  types?: string[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  formattedAddress?: string;
  shortFormattedAddress?: string;
  addressComponents?: GooglePlaceV1AddressComponent[];
  plusCode?: { globalCode: string; compoundCode: string };
  location?: { latitude: number; longitude: number };
  utcOffsetMinutes?: number;
  adrFormatAddress?: string;
  displayName?: { text: string; languageCode: string };
  websiteUri?: string;
  regularOpeningHours?: GooglePlaceV1OpeningHours;
  currentOpeningHours?: GooglePlaceV1OpeningHours;
  priceLevel?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  primaryTypeDisplayName?: { text: string; languageCode: string };
  primaryType?: string;
  allowsDogs?: boolean;
  goodForChildren?: boolean;
  goodForGroups?: boolean;
  goodForWatchingSports?: boolean;
  liveMusic?: boolean;
  servesBeer?: boolean;
  servesBreakfast?: boolean;
  servesBrunch?: boolean;
  servesDinner?: boolean;
  servesLunch?: boolean;
  servesVegetarianFood?: boolean;
  servesWine?: boolean;
  reservable?: boolean;
  curbsidePickup?: boolean;
  delivery?: boolean;
  dineIn?: boolean;
  takeout?: boolean;
  accessibilityOptions?: GooglePlaceV1AccessibilityOptions;
  parkingOptions?: GooglePlaceV1ParkingOptions;
  paymentOptions?: GooglePlaceV1PaymentOptions;
  photos?: GooglePlaceV1Photo[];
}

export interface AddressComponent {
  id: string;
  businessProfileId: string;
  longText?: string;
  shortText?: string;
  types: string[];
  languageCode?: string;
}

export interface Photo {
  id: string;
  businessProfileId: string;
  name?: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: any; // JSON
}

export interface OpeningHours {
  id: string;
  profileOpeningHoursId?: string;
  profileCurrentOpeningHoursId?: string;
  profileRegularOpeningHoursId?: string;
  openNow?: boolean;
  secondaryHoursType?: string;
  weekdayDescriptions: string[];
  periods?: Period[];
  specialHours?: SpecialHour[];
}

export interface Period {
  id: string;
  openingHoursId: string;
  openDay?: number;
  openHour?: number;
  openMinute?: number;
  openDate?: Date;
  openTruncated?: boolean;
  closeDay?: number;
  closeHour?: number;
  closeMinute?: number;
  closeDate?: Date;
  closeTruncated?: boolean;
}

export interface SpecialHour {
  id: string;
  openingHoursId: string;
  startDate?: Date;
  endDate?: Date;
  openTime?: string;
  closeTime?: string;
  closed?: boolean;
}

// Additional related model interfaces
export interface Location {
  id: string;
  lat: number;
  lng: number;
  businessId?: string;
}

export interface ReviewsDistribution {
  id: string;
  oneStar: number;
  twoStar: number;
  threeStar: number;
  fourStar: number;
  fiveStar: number;
  businessId?: string;
}

export interface Category {
  id: string;
  name: string;
  businessId?: string;
}

export interface ImageCategory {
  id: string;
  name: string;
  businessId?: string;
}

export interface PopularTimesHistogram {
  id: string;
  businessId?: string;
  days?: Day[];
}

export interface Day {
  id: string;
  name: string;
  hours?: Hour[];
  histogramId?: string;
}

export interface Hour {
  id: string;
  hour: number;
  occupancyPercent: number;
  dayId?: string;
}

export interface ReviewsTag {
  id: string;
  title: string;
  count: number;
  businessId?: string;
}

export interface AdditionalInfo {
  id: string;
  businessId?: string;
  items?: AdditionalInfoItem[];
}

export interface AdditionalInfoItem {
  id: string;
  name: string;
  value: boolean;
  category: string; // Previously AdditionalInfoCategory enum
  additionalInfoId?: string;
}

export interface QuestionsAndAnswers {
  id: string;
  question: string;
  askDate: string;
  businessId?: string;
  answers?: Answer[];
}

export interface Answer {
  id: string;
  answer: string;
  qaId?: string;
}

// LEGACY: TripAdvisor enums commented out - use @prisma/client exports instead

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

// Sub-rating distribution interfaces
export interface TripAdvisorServiceRatingDistribution {
  id: string;
  ratingDistributionId: string;
  one: number;
  two: number;
  three: number;
  four: number;
  five: number;
}

export interface TripAdvisorFoodRatingDistribution {
  id: string;
  ratingDistributionId: string;
  one: number;
  two: number;
  three: number;
  four: number;
  five: number;
}

export interface TripAdvisorValueRatingDistribution {
  id: string;
  ratingDistributionId: string;
  one: number;
  two: number;
  three: number;
  four: number;
  five: number;
}

export interface TripAdvisorAtmosphereRatingDistribution {
  id: string;
  ratingDistributionId: string;
  one: number;
  two: number;
  three: number;
  four: number;
  five: number;
}

export interface TripAdvisorCleanlinessRatingDistribution {
  id: string;
  ratingDistributionId: string;
  one: number;
  two: number;
  three: number;
  four: number;
  five: number;
}

export interface TripAdvisorLocationRatingDistribution {
  id: string;
  ratingDistributionId: string;
  one: number;
  two: number;
  three: number;
  four: number;
  five: number;
}

export interface TripAdvisorRoomsRatingDistribution {
  id: string;
  ratingDistributionId: string;
  one: number;
  two: number;
  three: number;
  four: number;
  five: number;
}

export interface TripAdvisorSleepQualityRatingDistribution {
  id: string;
  ratingDistributionId: string;
  one: number;
  two: number;
  three: number;
  four: number;
  five: number;
}

// Main entity interfaces
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
  
  // Relations (optional when populated)
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
  
  // Relations (optional when populated)
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
  
  // Relations (optional when populated)
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
  
  // Relations (optional when populated)
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
  
  // Relations (optional when populated)
  businessProfile?: TripAdvisorBusinessProfile;
  tripAdvisorOverview?: TripAdvisorOverview;
  serviceRatings?: TripAdvisorServiceRatingDistribution | null;
  foodRatings?: TripAdvisorFoodRatingDistribution | null;
  valueRatings?: TripAdvisorValueRatingDistribution | null;
  atmosphereRatings?: TripAdvisorAtmosphereRatingDistribution | null;
  cleanlinessRatings?: TripAdvisorCleanlinessRatingDistribution | null;
  locationRatings?: TripAdvisorLocationRatingDistribution | null;
  roomsRatings?: TripAdvisorRoomsRatingDistribution | null;
  sleepQualityRatings?: TripAdvisorSleepQualityRatingDistribution | null;
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
  
  // Relations (optional when populated)
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
  
  // Relations (optional when populated)
  overview?: TripAdvisorOverview;
  topKeywords?: TripAdvisorPeriodicalKeyword[];
  topTags?: TripAdvisorPeriodicalTag[];
}

// Helper interfaces for working with the data
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

// ============================================================================
// BOOKING.COM DATA MODELS
// ============================================================================

// LEGACY: Booking enums commented out - use @prisma/client exports instead

export interface BookingBusinessProfile {
  id: string;
  teamId: string;
  
  // Booking.com identifiers
  bookingUrl: string;
  hotelId?: string | null;
  
  // Core business data
  name: string;
  propertyType: BookingPropertyType;
  
  // Contact information
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  
  // Location data
  address?: string | null;
  city?: string | null;
  country?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  
  // Business details
  description?: string | null;
  mainImage?: string | null;
  photoCount?: number | null;
  
  // Ratings & reviews
  rating?: number | null;
  numberOfReviews?: number | null;
  
  // Property features
  stars?: number | null;  // Hotel star rating
  checkInTime?: string | null;
  checkOutTime?: string | null;
  minAge?: number | null;
  maxOccupancy?: number | null;
  
  // Pricing
  currency?: string | null;
  priceFrom?: number | null;
  
  // Facilities and amenities
  facilitiesList: string[];
  popularFacilities: string[];
  
  // Language and accessibility
  languagesSpoken: string[];
  accessibilityFeatures: string[];
  
  // Sustainability
  sustainabilityPrograms: string[];
  
  // Internal tracking
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations (optional when populated)
  reviews?: BookingReview[];
  overview?: BookingOverview | null;
  businessMetadata?: BookingBusinessMetadata | null;
  ratingDistribution?: BookingRatingDistribution | null;
  rooms?: BookingRoom[];
  facilities?: BookingFacility[];
  photos?: BookingBusinessPhoto[];
}

export interface BookingRoom {
  id: string;
  businessProfileId: string;
  
  // Room identification
  roomType: string;
  roomName?: string | null;
  
  // Room details
  maxOccupancy?: number | null;
  roomSize?: number | null;  // in square meters
  bedType?: string | null;
  numberOfBeds?: number | null;
  
  // Room amenities
  amenities: string[];
  
  // Pricing information
  pricePerNight?: number | null;
  currency?: string | null;
  
  // Availability
  isAvailable?: boolean | null;
  
  // Room photos
  photos: string[];
  
  // Relations (optional when populated)
  businessProfile?: BookingBusinessProfile;
}

export interface BookingFacility {
  id: string;
  businessProfileId: string;
  
  // Facility details
  category: string;
  name: string;
  description?: string | null;
  isPopular: boolean;
  
  // Relations (optional when populated)
  businessProfile?: BookingBusinessProfile;
}

export interface BookingBusinessPhoto {
  id: string;
  businessProfileId: string;
  
  // Photo data
  url: string;
  caption?: string | null;
  category?: string | null; // 'exterior', 'interior', 'room', 'bathroom', 'restaurant', etc.
  
  // Relations (optional when populated)
  businessProfile?: BookingBusinessProfile;
}

export interface BookingReview {
  id: string;
  businessProfileId: string;
  reviewMetadataId: string;
  
  // Booking.com identifiers
  bookingReviewId?: string | null;
  
  // Core review data
  title?: string | null;
  text?: string | null;
  rating: number;
  publishedDate: Date;
  stayDate?: Date | null;
  
  // Reviewer information
  reviewerId?: string | null;
  reviewerName: string;
  reviewerNationality?: string | null;
  
  // Stay context - unique to Booking.com
  lengthOfStay?: number | null; // in nights
  roomType?: string | null;
  guestType: BookingGuestType;
  
  // Booking.com specific review features
  likedMost?: string | null;  // What guest liked most
  dislikedMost?: string | null;  // What guest disliked most
  
  // Sub-ratings (common in accommodation reviews)
  cleanlinessRating?: number | null;
  comfortRating?: number | null;
  locationRating?: number | null;
  facilitiesRating?: number | null;
  staffRating?: number | null;
  valueForMoneyRating?: number | null;
  wifiRating?: number | null;
  
  // Owner response
  responseFromOwnerText?: string | null;
  responseFromOwnerDate?: Date | null;
  hasOwnerResponse: boolean;
  
  // Review verification
  isVerifiedStay: boolean;
  
  // Internal tracking
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations (optional when populated)
  businessProfile?: BookingBusinessProfile;
  reviewMetadata?: ReviewMetadata;
}

export interface BookingOverview {
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
  averageCleanlinessRating?: number | null;
  averageComfortRating?: number | null;
  averageLocationRating?: number | null;
  averageFacilitiesRating?: number | null;
  averageStaffRating?: number | null;
  averageValueForMoneyRating?: number | null;
  averageWifiRating?: number | null;
  
  // Guest type analysis
  soloTravelers: number;
  couples: number;
  familiesWithYoungChildren: number;
  familiesWithOlderChildren: number;
  groupsOfFriends: number;
  businessTravelers: number;
  
  // Stay length analysis
  averageLengthOfStay?: number | null;
  shortStays: number; // 1-2 nights
  mediumStays: number; // 3-7 nights
  longStays: number; // 8+ nights
  
  // Nationality distribution (top 10)
  topNationalities: string[];
  
  // Response metrics
  responseRate?: number | null;
  averageResponseTime?: number | null;
  
  // Room type preferences
  mostPopularRoomTypes: string[];
  
  // Seasonal trends
  peakSeason?: string | null;
  offPeakSeason?: string | null;
  
  lastUpdated: Date;
  
  // Relations (optional when populated)
  businessProfile?: BookingBusinessProfile;
  ratingDistribution?: BookingRatingDistribution | null;
  bookingPeriodicalMetric?: BookingPeriodicalMetric[];
  sentimentAnalysis?: BookingSentimentAnalysis | null;
  topKeywords?: BookingTopKeyword[];
  recentReviews?: BookingRecentReview[];
}

export interface BookingRatingDistribution {
  id: string;
  businessProfileId: string;
  bookingOverviewId: string;
  
  // Rating distribution
  oneStar: number;
  twoStar: number;
  threeStar: number;
  fourStar: number;
  fiveStar: number;
  
  // Guest type distribution
  soloTravelers: number;
  couples: number;
  families: number;
  groups: number;
  businessTravelers: number;
  
  // Stay length distribution
  shortStays: number; // 1-2 nights
  mediumStays: number; // 3-7 nights
  longStays: number; // 8+ nights
  
  // Temporal distribution
  lastWeek: number;
  lastMonth: number;
  lastSixMonths: number;
  olderThanSixMonths: number;
  
  // Verification distribution
  verifiedStays: number;
  unverifiedStays: number;
  
  lastUpdated: Date;
  
  // Relations (optional when populated)
  businessProfile?: BookingBusinessProfile;
  bookingOverview?: BookingOverview;
}

export interface BookingBusinessMetadata {
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
  
  // Relations (optional when populated)
  businessProfile?: BookingBusinessProfile;
}

export interface BookingPeriodicalMetric {
  id: string;
  bookingOverviewId: string;

  // Period definition
  periodKey: number;
  periodLabel: string;

  // Booking-specific metrics for this period
  averageRating: number;
  oneStarCount: number;
  twoStarCount: number;
  threeStarCount: number;
  fourStarCount: number;
  fiveStarCount: number;
  reviewCount: number;
  
  // Sub-rating averages
  averageCleanlinessRating?: number | null;
  averageComfortRating?: number | null;
  averageLocationRating?: number | null;
  averageFacilitiesRating?: number | null;
  averageStaffRating?: number | null;
  averageValueForMoneyRating?: number | null;
  averageWifiRating?: number | null;
  
  // Guest type breakdown
  soloTravelers: number;
  couples: number;
  families: number;
  groups: number;
  businessTravelers: number;
  
  // Stay metrics
  averageLengthOfStay?: number | null;
  totalNights: number;
  
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
  occupancyRate?: number | null;
  competitorMentions?: number | null;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Relations (optional when populated)
  overview?: BookingOverview;
  topKeywords?: BookingPeriodicalKeyword[];
}

export interface BookingSentimentAnalysis {
  id: string;
  bookingOverviewId: string;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  totalAnalyzed: number;
  averageSentiment: number;
}

export interface BookingTopKeyword {
  id: string;
  bookingOverviewId: string;
  keyword: string;
  count: number;
}

export interface BookingRecentReview {
  id: string;
  bookingOverviewId: string;
  reviewId: string;
  rating: number;
  publishedDate: Date;
  text?: string | null;
  reviewerName: string;
  guestType: BookingGuestType;
}

export interface BookingPeriodicalKeyword {
  id: string;
  periodicalMetricId: string;
  keyword: string;
  count: number;
}

// Helper interfaces for working with the data
export interface BookingReviewWithMetadata {
  rating: number;
  publishedDate: string;
  stayDate?: string | null;
  lengthOfStay?: number | null;
  roomType?: string | null;
  guestType: BookingGuestType;
  likedMost?: string | null;
  dislikedMost?: string | null;
  cleanlinessRating?: number | null;
  comfortRating?: number | null;
  locationRating?: number | null;
  facilitiesRating?: number | null;
  staffRating?: number | null;
  valueForMoneyRating?: number | null;
  wifiRating?: number | null;
  hasOwnerResponse: boolean;
  responseFromOwnerDate?: string | null;
  isVerifiedStay: boolean;
  reviewerNationality?: string | null;
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
