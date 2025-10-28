// ============================================================================
// EMAIL PACKAGE - Server-side email functionality
// ============================================================================
// SMTP client
export { SMTPClient, createSMTPClient } from './core/smtp';
export { getAppConfig, updateAppConfig } from './core/app';
// Email sending functions
export { sendEmail } from './core/sendEmail';
export { sendMagicLink } from './lib/sendMagicLink';
export { sendPasswordResetEmail } from './lib/sendPasswordResetEmail';
export { sendVerificationEmail } from './lib/sendVerificationEmail';
export { sendWelcomeEmail } from './lib/sendWelcomeEmail';
export { sendTeamInviteEmail } from './lib/sendTeamInviteEmail';
export { sendAccountLockedEmail } from './lib/sendAccountLockedEmail';
export { sendTestEmail } from './lib/sendTestEmail';
export { sendInvoiceEmail } from './lib/sendInvoiceEmail';
// Types
export * from './types/email';
//# sourceMappingURL=index.js.map