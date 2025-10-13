import { render } from '@react-email/render';
import { sendEmail, getAppConfig } from '../core';
import AccountLocked from '../templates/AccountLocked';

/**
 * Send account locked email
 */
export const sendAccountLockedEmail = async (

  email: string,
  unlockUrl: string
): Promise<void> => {
  const app = getAppConfig();
  const subject = `Your ${app.name} account has been locked`;

  const html = await render(AccountLocked({ subject, url: unlockUrl }));

  await sendEmail({
    to: email,
    subject,
    html,
  });
};
