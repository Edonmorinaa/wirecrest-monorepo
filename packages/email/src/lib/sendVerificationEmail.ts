import { render } from '@react-email/render';
import { sendEmail, SMTPClient, getAppConfig } from '@/core';
import VerificationEmail from '@/templates/VerificationEmail';
import { User, VerificationToken } from '@/types/email';

/**
 * Send email verification email
 */
export const sendVerificationEmail = async (
  smtpClient: SMTPClient,
  user: User,
  verificationToken: VerificationToken
): Promise<void> => {
  const app = getAppConfig();
  const subject = `Confirm your ${app.name} account`;
  const verificationLink = `${app.url}/auth/verify-email-token?token=${encodeURIComponent(
    verificationToken.token
  )}`;

  const html = await render(VerificationEmail({ subject, verificationLink }));

  await sendEmail(smtpClient, {
    to: user.email,
    subject,
    html,
  });
};
