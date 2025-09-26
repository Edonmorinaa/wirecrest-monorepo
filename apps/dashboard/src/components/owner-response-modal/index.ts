// Original modal (for backward compatibility)
export { OwnerResponseModal } from './owner-response-modal';

// Dynamic modal
export { DynamicOwnerResponseModal } from './dynamic-owner-response-modal';
// Platform-specific modals
export {
  GoogleOwnerResponseModal,
  BookingOwnerResponseModal,
  FacebookOwnerResponseModal,
  TripAdvisorOwnerResponseModal,
} from './platform-specific';

export type { DynamicOwnerResponseModalProps } from './dynamic-owner-response-modal';

export type {
  GoogleOwnerResponseModalProps,
  BookingOwnerResponseModalProps,
  FacebookOwnerResponseModalProps,
  TripAdvisorOwnerResponseModalProps,
} from './platform-specific';
