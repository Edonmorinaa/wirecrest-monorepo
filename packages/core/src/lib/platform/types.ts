/**
 * Platform Types and Enums
 * Business logic for supported platforms and their configurations
 */

export type PlatformType = 
  | 'GOOGLE'
  | 'FACEBOOK' 
  | 'TRIPADVISOR'
  | 'BOOKING'
  | 'YELP';

export type MarketPlatform = 
  | 'GOOGLE_MAPS'
  | 'FACEBOOK'
  | 'TRIPADVISOR'
  | 'BOOKING'
  | 'INSTAGRAM'
  | 'TIKTOK';

export type RatingType = 'stars' | 'numeric' | 'recommendation';

export type BusinessCreationStep = 
  | 'IDENTIFIER_SETUP'
  | 'PROFILE_CREATION'
  | 'REVIEWS_FETCH'
  | 'ANALYTICS_SETUP'
  | 'COMPLETED';

export type BusinessCreationStatus = 
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'retry';

export interface PlatformConfig {
  name: string;
  icon: string;
  ratingType: RatingType;
  maxRating?: number;
  hasLocalGuide?: boolean;
  hasEngagementMetrics?: boolean;
  hasVisitedIn?: boolean;
  hasReviewerStats?: boolean;
  buttonText: string;
  buttonIcon: string;
  recommendationLabels?: {
    positive: string;
    negative: string;
  };
}

export interface PlatformDisplayConfig {
  name: string;
  icon: string;
  color: string;
  identifierLabel: string;
  identifierPlaceholder: string;
  identifierPrefix: string;
}

export interface PlatformStatus {
  identifier: string | null;
  hasProfile: boolean;
  profileStatus: BusinessCreationStatus;
  reviewsStatus: BusinessCreationStatus;
  reviewsCount: number;
  lastReviewDate: Date | null;
  currentStep: BusinessCreationStep | null;
  canCreateProfile: boolean;
  canGetReviews: boolean;
  canRetry: boolean;
  isProcessing: boolean;
}

export interface PlatformData {
  identifier?: string;
  profile?: any;
  status: BusinessCreationStatus;
  reviewsCount?: number;
  lastReviewDate?: string;
  currentStep?: BusinessCreationStep;
  canCreateProfile?: boolean;
  canGetReviews?: boolean;
  canRetry?: boolean;
  isProcessing?: boolean;
}
