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
export declare function sendInvoiceEmail(to: string, invoiceData: InvoiceEmailData): Promise<void>;
//# sourceMappingURL=sendInvoiceEmail.d.ts.map