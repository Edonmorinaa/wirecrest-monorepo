import { render } from '@react-email/render';
import { SMTPClient } from './smtp';
import { EmailData } from '@/types/email';

/**
 * Core email sending function
 * This is the main function that all other email functions use
 */
export const sendEmail = async (
  smtpClient: SMTPClient,
  data: EmailData
): Promise<void> => {
  await smtpClient.sendEmail(data);
};
