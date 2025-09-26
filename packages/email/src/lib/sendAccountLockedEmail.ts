import { render } from '@react-email/render';
import { sendEmail, SMTPClient, getAppConfig } from '@/core';
import AccountLocked from '@/templates/AccountLocked';

/**
 * Send account locked email
 */
export const sendAccountLockedEmail = async (
  smtpClient: SMTPClient,
  email: string,
  unlockUrl: string
): Promise<void> => {
  const app = getAppConfig();
  const subject = `Your ${app.name} account has been locked`;

  const html = await render(AccountLocked({ subject, url: unlockUrl }));

  await sendEmail(smtpClient, {
    to: email,
    subject,
    html,
  });
};
