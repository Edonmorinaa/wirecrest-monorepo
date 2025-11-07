export interface FacebookBusinessProfile {
  id: string;
  teamId: string;

  // Required fields (not-nullable from Apify response)
  facebookUrl: string; // Primary URL from Apify
  pageId: string; // Facebook page ID (not-nullable)
  facebookId: string; // Facebook ID (not-nullable)

  // Core profile data
  categories: string[];
  info: string[];
  likes: number;
  title: string;
  pageName: string;
  pageUrl: string;
  followers: number;

  // Optional fields (nullable from Apify response)
  messenger?: string | null;
  priceRange?: string | null; // Like "$$", "$$$", etc.
  intro?: string | null; // Page intro/description
  websites: string[];
  phone?: string | null;
  email?: string | null;
  profilePictureUrl?: string | null;
  coverPhotoUrl?: string | null;
  profilePhoto?: string | null; // URL to profile photo page
  creationDate?: string | null; // Like "May 5, 2011" (keep as string from Apify)
  adStatus?: string | null; // Like "This Page is currently running ads."

  // Complex JSON fields
  aboutMe?: any | null; // { text?: string, urls?: string[] }
  pageAdLibrary?: any | null; // { is_business_page_active?: boolean, id?: string }

  // Internal tracking
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Relations (optional when populated)
  reviews?: FacebookReview[];
  overview?: FacebookOverview | null;
  businessMetadata?: FacebookBusinessMetadata | null;
  recommendationDistribution?: FacebookRecommendationDistribution | null;
}

export interface FacebookReview {
  id: string;

  // Required relationship fields
  businessProfileId: string; // Link to FacebookBusinessProfile

  // Metadata relationship
  reviewMetadataId: string;

  // Core review data from Facebook response
  facebookReviewId: string; // The 'id' from Facebook response
  legacyId: string; // Facebook's legacy ID
  date: Date; // Published date
  url: string; // Direct URL to the review/post
  text?: string | null; // Review text content
  isRecommended: boolean; // Facebook's recommendation status (replaces rating)

  // User/Reviewer information
  userId: string; // User's Facebook ID
  userName: string; // User's display name
  userProfileUrl?: string | null; // User's profile URL
  userProfilePic?: string | null; // User's profile picture URL

  // Engagement metrics
  likesCount: number; // Number of likes on the review
  commentsCount: number; // Number of comments on the review

  // Content categorization
  tags: string[]; // Tags like ["Family-friendly", "Great service"]

  // Page context
  facebookPageId: string; // Page's Facebook ID
  pageName: string; // Page name/username
  inputUrl: string; // Original input URL used for scraping

  // Metadata from page
  pageAdLibrary?: any | null; // { is_business_page_active?: boolean, id?: string }

  // Internal tracking
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Relations (optional when populated)
  businessProfile?: FacebookBusinessProfile;
  reviewMetadata?: ReviewMetadata;
  photos?: FacebookReviewPhoto[];
  comments?: FacebookReviewComment[];
}

export interface FacebookReviewPhoto {
  id: string;
  facebookReviewId: string;

  url: string; // Direct photo URL
  imageUri: string; // Image URI
  height?: number | null; // Image height
  width?: number | null; // Image width
  viewerImageUri?: string | null; // Higher resolution viewer image
  viewerHeight?: number | null; // Viewer image height
  viewerWidth?: number | null; // Viewer image width
  photoId: string; // Facebook photo ID
  accessibilityCaption?: string | null; // Accessibility description
  isPlayable: boolean; // Whether it's a video
  ownerUserId?: string | null; // Photo owner's user ID

  // Relations (optional when populated)
  facebookReview?: FacebookReview;
}

export interface FacebookReviewComment {
  id: string;
  facebookReviewId: string;

  commentId: string; // Facebook comment ID
  date: Date; // Comment date
  text: string; // Comment text
  likesCount: number; // Number of likes on comment

  // Commenter info
  commenterName?: string | null;
  commenterProfileUrl?: string | null;
  commenterProfilePic?: string | null;

  // Relations (optional when populated)
  facebookReview?: FacebookReview;
}

export interface FacebookOverview {
  id: string;
  businessProfileId: string;

  // Facebook-specific recommendation metrics (instead of star ratings)
  totalReviews: number; // Total number of reviews/recommendations
  recommendedCount: number; // Number of "recommended" reviews
  notRecommendedCount: number; // Number of "not recommended" reviews
  recommendationRate: number; // Percentage of recommended vs total (0-100)

  // Engagement metrics (unique to Facebook)
  totalLikes: number; // Total likes across all reviews
  totalComments: number; // Total comments across all reviews
  totalPhotos: number; // Total photos attached to reviews
  averageLikesPerReview: number; // Average likes per review
  averageCommentsPerReview: number; // Average comments per review

  // Content analysis
  sentimentAnalysis?: any | null; // FacebookSentimentAnalysis data
  topKeywords?: any | null; // FacebookKeywordAnalysis[] data
  topTags?: any | null; // FacebookTagAnalysis[] data

  // Temporal metrics
  recentReviews?: any | null; // Recent reviews data
  reviewsTrends?: any | null; // FacebookReviewsTrends data

  // Response metrics (if business responds to reviews)
  responseRate?: number | null; // Percentage of reviews responded to
  averageResponseTime?: number | null; // Average response time in hours

  lastUpdated: Date;

  // Relations (optional when populated)
  businessProfile?: FacebookBusinessProfile;
  recommendationDistribution?: FacebookRecommendationDistribution | null;
  facebookPeriodicalMetric?: FacebookPeriodicalMetric[];
}

export interface FacebookRecommendationDistribution {
  id: string;
  businessProfileId: string;

  // Links to overview for easier queries
  facebookOverviewId: string;

  // Recommendation distribution
  recommended: number; // Count of recommended reviews
  notRecommended: number; // Count of not recommended reviews

  // Engagement distribution
  highEngagement: number; // Reviews with >5 likes or >2 comments
  mediumEngagement: number; // Reviews with 1-5 likes or 1-2 comments
  lowEngagement: number; // Reviews with 0 likes and 0 comments

  // Content distribution
  withPhotos: number; // Reviews with attached photos
  withoutPhotos: number; // Reviews without photos
  withTags: number; // Reviews with Facebook tags
  withoutTags: number; // Reviews without tags

  // Temporal distribution
  lastWeek: number; // Reviews from last 7 days
  lastMonth: number; // Reviews from last 30 days
  lastSixMonths: number; // Reviews from last 6 months
  olderThanSixMonths: number; // Reviews older than 6 months

  lastUpdated: Date;

  // Relations (optional when populated)
  businessProfile?: FacebookBusinessProfile;
  facebookOverview?: FacebookOverview;
}

export interface FacebookBusinessMetadata {
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
  businessProfile?: FacebookBusinessProfile;
}

export interface FacebookPeriodicalMetric {
  id: string;
  facebookOverviewId: string;

  // Period definition
  periodKey: number; // 1, 3, 7, 30, 180, 365, 0 (for all time)
  periodLabel: string; // "Last 1 Day", "Last 7 Days", "All Time", etc.

  // Facebook-specific metrics for this period (adapted for recommendation system)
  recommendedCount: number; // Number of recommended reviews
  notRecommendedCount: number; // Number of not recommended reviews
  recommendationRate: number; // Percentage of recommended reviews
  totalLikes: number; // Total likes in period
  totalComments: number; // Total comments in period
  totalPhotos: number; // Total photos in period
  averageEngagement: number; // Average engagement per review
  reviewCount: number; // Total reviews in period
  sentimentPositive?: number | null; // Reviews with positive sentiment
  sentimentNeutral?: number | null; // Reviews with neutral sentiment
  sentimentNegative?: number | null; // Reviews with negative sentiment
  sentimentTotal?: number | null; // Total sentiment-analyzed reviews
  topKeywords?: any | null; // [{ keyword: string, count: number }, ...]
  topTags?: any | null; // [{ tag: string, count: number }, ...]
  responseRatePercent?: number | null; // Percentage of reviews with responses
  avgResponseTimeHours?: number | null; // Average response time in hours

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Relations (optional when populated)
  overview?: FacebookOverview;
}

// For ReviewMetadata (from your schema)
export interface ReviewMetadata {
  id: string;
  externalId: string; // Original review ID from the platform
  source: string; // GOOGLE_MAPS, FACEBOOK, YELP

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

  // Relations (optional when populated)
  googleReview?: any;
  facebookReview?: FacebookReview;
  yelpReview?: any;
}

// Analytics-specific interfaces
export interface FacebookReviewWithMetadata {
  isRecommended: boolean;
  date: string; // ISO Date string (matches FacebookReview.date)
  likesCount: number;
  commentsCount: number;
  tags: string[];
  photoCount: number; // From ReviewMetadata, not direct photos relation
  reviewMetadata: {
    emotional?: string | null;
    keywords?: string[] | null;
    reply?: string | null;
    replyDate?: string | null; // ISO Date string
    date?: string | null; // ISO Date string (matches ReviewMetadata schema)
    sentiment?: number | null;
    photoCount?: number | null;
  } | null;
}
