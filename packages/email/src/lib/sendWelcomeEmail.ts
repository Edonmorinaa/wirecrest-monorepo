import { render } from '@react-email/render';
import { sendEmail, SMTPClient } from '@/core';
import WelcomeEmail from '@/templates/WelcomeEmail';

/**
 * Send welcome email to new users
 */
export const sendWelcomeEmail = async (
  smtpClient: SMTPClient,
  name: string,
  email: string,
  team: string
): Promise<void> => {
  const subject = 'Welcome to Wirecrest';
  const html = await render(WelcomeEmail({ name, team, subject }));

  await sendEmail(smtpClient, {
    to: email,
    subject,
    html,
  });
};
