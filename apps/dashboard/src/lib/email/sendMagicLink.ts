import { render } from '@react-email/render';
import MagicLink from '@/components/emailTemplates/MagicLink';

import app from '../app';
import { sendEmail } from './sendEmail';

export const sendMagicLink = async (email: string, url: string) => {
  const subject = `Sign in to ${app.name}`;

  const html = await render(MagicLink({ url, subject }));

  await sendEmail({
    to: email,
    subject,
    html,
  });
};
