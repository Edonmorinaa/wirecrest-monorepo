import { sendEmail } from './sendEmail';
import { render } from '@react-email/render';
import env from '../env';
import TestEmailTemplate from '@/components/emailTemplates/TestEmailTemplate';

export const sendTestEmail = async (name: string) => {
  const subject = `New review on your business`;
  const url = `${env.appUrl}/random-review`;

  const html = await render(
    TestEmailTemplate({url, name, subject: subject})
  );

  await sendEmail({
    to: "vullnet.ad@gmail.com",
    subject,
    html,
  });
};
