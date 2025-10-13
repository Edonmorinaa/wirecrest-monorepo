import { render } from '@react-email/render';
import { createSMTPClient, SMTPClient } from './smtp';
import { EmailData } from '../types/email';

const smtpClient = createSMTPClient();
/**
 * Core email sending function
 * This is the main function that all other email functions use
 */
export const sendEmail = async (
  data: EmailData
): Promise<void> => {
  await smtpClient.sendEmail(data);
};
  