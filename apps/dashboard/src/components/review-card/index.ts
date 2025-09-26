export { PLATFORM_CONFIGS, DynamicReviewCard } from './dynamic-review-card';
// Platform-specific components
export {
  GoogleReviewCard,
  BookingReviewCard,
  FacebookReviewCard,
  TripAdvisorReviewCard,
} from './platform-specific';

export type {
  ReviewData,
  PlatformType,
  PlatformConfig,
  DynamicReviewCardProps,
} from './dynamic-review-card';

export type {
  GoogleReviewCardProps,
  BookingReviewCardProps,
  FacebookReviewCardProps,
  TripAdvisorReviewCardProps,
} from './platform-specific';
