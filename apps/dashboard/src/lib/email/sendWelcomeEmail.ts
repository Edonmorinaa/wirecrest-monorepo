import { render } from '@react-email/components';
import { WelcomeEmail } from '@/components/emailTemplates';

import { sendEmail } from './sendEmail';

export const sendWelcomeEmail = async (
  name: string,
  email: string,
  team: string
) => {
  const subject = 'Welcome to BoxyHQ';
  const html = await render(WelcomeEmail({ name, team, subject }));

  await sendEmail({
    to: email,
    subject,
    html,
  });
};
