import { SMTPConfig } from '../types/email';
/**
 * SMTP Configuration for email sending
 * This handles the nodemailer transporter setup
 */
export declare class SMTPClient {
    private transporter;
    private config;
    constructor(config: SMTPConfig);
    /**
     * Send email using the configured SMTP transporter
     */
    sendEmail(data: {
        to: string;
        subject: string;
        html: string;
        text?: string;
    }): Promise<void>;
    /**
     * Get the SMTP configuration
     */
    getConfig(): SMTPConfig;
}
/**
 * Create SMTP client from environment variables
 */
export declare function createSMTPClient(): SMTPClient;
//# sourceMappingURL=smtp.d.ts.map