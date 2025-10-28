import { render } from '@react-email/render';
import { sendEmail } from '../core/sendEmail';
import { InvoiceEmail } from '../templates/InvoiceEmail';
/**
 * Sends an invoice email to the recipient
 * @param smtpClient - SMTP client instance
 * @param to - Recipient email address
 * @param invoiceData - Invoice details for the email
 * @returns Promise that resolves when email is sent
 */
export async function sendInvoiceEmail(to, invoiceData) {
    const { invoiceNumber, teamName, totalAmount, dueDate, downloadUrl, viewUrl } = invoiceData;
    // Render the email template
    const html = await render(InvoiceEmail({
        invoiceNumber,
        teamName,
        totalAmount,
        dueDate,
        downloadUrl,
        viewUrl,
    }));
    // Send the email
    await sendEmail({
        to,
        subject: `Invoice ${invoiceNumber} - ${totalAmount}`,
        html,
    });
}
//# sourceMappingURL=sendInvoiceEmail.js.map