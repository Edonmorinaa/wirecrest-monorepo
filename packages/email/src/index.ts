// ============================================================================
// EMAIL PACKAGE - Server-side email functionality
// ============================================================================

// Email sending functions
export { sendEmail } from '@/core/sendEmail';
export { sendMagicLink } from '@/lib/sendMagicLink';
export { sendPasswordResetEmail } from '@/lib/sendPasswordResetEmail';
export { sendVerificationEmail } from '@/lib/sendVerificationEmail';
export { sendWelcomeEmail } from '@/lib/sendWelcomeEmail';
export { sendTeamInviteEmail } from '@/lib/sendTeamInviteEmail';
export { sendAccountLockedEmail } from '@/lib/sendAccountLockedEmail';
export { sendTestEmail } from '@/lib/sendTestEmail';

// Types
export * from '@/types/email';
