import { render } from '@react-email/render';
import { sendEmail, getAppConfig } from '../core';
import TestEmailTemplate from '../templates/TestEmail';

/**
 * Send test email
 */
export const sendTestEmail = async (

  name: string,
  testEmail: string
): Promise<void> => {
  const app = getAppConfig();
  const subject = `New review on your business`;
  const url = `${app.url}/random-review`;

  const html = await render(
    TestEmailTemplate({ url, name, subject })
  );

  await sendEmail({
    to: testEmail,
    subject,
    html,
  });
};
