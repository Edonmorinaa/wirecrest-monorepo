import { render } from '@react-email/render';
import { sendEmail } from '../core';
import WelcomeEmail from '../templates/WelcomeEmail';

/**
 * Send welcome email to new users
 */
export const sendWelcomeEmail = async (

  name: string,
  email: string,
  team: string
): Promise<void> => {
  const subject = 'Welcome to Wirecrest';
  const html = await render(WelcomeEmail({ name, team, subject }));

  await sendEmail({
    to: email,
    subject,
    html,
  });
};
