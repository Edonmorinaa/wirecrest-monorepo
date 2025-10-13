import { render } from '@react-email/render';
import { sendEmail, getAppConfig } from '../core';
import ResetPasswordEmail from '../templates/ResetPassword';
import { User } from '../types/email';

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (

  user: User,
  token: string
): Promise<void> => {
  const app = getAppConfig();
  const subject = `Reset your ${app.name} password`;
  const url = `${app.url}/auth/reset-password/${token}`;

  const html = await render(
    ResetPasswordEmail({ url, subject, email: user.email })
  );

  await sendEmail({
    to: user.email,
    subject,
    html,
  }); 
};
