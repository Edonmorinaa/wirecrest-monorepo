import { render } from '@react-email/render';
import { sendEmail, SMTPClient, getAppConfig } from '@/core';
import MagicLink from '@/templates/MagicLink';

/**
 * Send magic link email for authentication
 */
export const sendMagicLink = async (
  smtpClient: SMTPClient,
  email: string,
  url: string
): Promise<void> => {
  const app = getAppConfig();
  const subject = `Sign in to ${app.name}`;

  const html = await render(MagicLink({ url, subject }));

  await sendEmail(smtpClient, {
    to: email,
    subject,
    html,
  });
};
