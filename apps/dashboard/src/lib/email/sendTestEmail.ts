import { render } from '@react-email/render';
import TestEmailTemplate from '@/components/emailTemplates/TestEmailTemplate';

import env from '../env';
import { sendEmail } from './sendEmail';

export const sendTestEmail = async (name: string) => {
  const subject = `New review on your business`;
  const url = `${env.appUrl}/random-review`;

  const html = await render(
    TestEmailTemplate({url, name, subject})
  );

  await sendEmail({
    to: "vullnet.ad@gmail.com",
    subject,
    html,
  });
};
