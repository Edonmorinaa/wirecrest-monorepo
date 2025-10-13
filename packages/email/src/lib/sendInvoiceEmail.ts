import { render } from '@react-email/render';

import { sendEmail } from '../core/sendEmail';
import { SMTPClient } from '../core/smtp';
import { InvoiceEmail } from '../templates/InvoiceEmail';

export interface InvoiceEmailData {
  invoiceNumber: string;
  teamName: string;
  totalAmount: string;
  dueDate: string;
  downloadUrl?: string;
  viewUrl: string;
}

/**
 * Sends an invoice email to the recipient
 * @param smtpClient - SMTP client instance
 * @param to - Recipient email address
 * @param invoiceData - Invoice details for the email
 * @returns Promise that resolves when email is sent
 */
export async function sendInvoiceEmail(
  to: string,
  invoiceData: InvoiceEmailData
): Promise<void> {
  const { invoiceNumber, teamName, totalAmount, dueDate, downloadUrl, viewUrl } = invoiceData;

  // Render the email template
  const html = await render(
    InvoiceEmail({
      invoiceNumber,
      teamName,
      totalAmount,
      dueDate,
      downloadUrl,
      viewUrl,
    })
  );

  // Send the email
  await sendEmail({
    to,
    subject: `Invoice ${invoiceNumber} - ${totalAmount}`,
    html,
  });
}
