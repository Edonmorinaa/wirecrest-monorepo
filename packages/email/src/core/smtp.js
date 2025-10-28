import * as nodemailer from 'nodemailer';
/**
 * SMTP Configuration for email sending
 * This handles the nodemailer transporter setup
 */
export class SMTPClient {
    constructor(config) {
        this.config = config;
        this.transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: true,
            auth: {
                user: config.user,
                pass: config.password,
            },
        });
    }
    /**
     * Send email using the configured SMTP transporter
     */
    async sendEmail(data) {
        if (!this.config.host) {
            console.warn('SMTP host not configured, skipping email send');
            return;
        }
        const emailDefaults = {
            from: this.config.from,
        };
        console.log(`SEND EMAIL WITH DATA: ${JSON.stringify(data)}`);
        const result = await this.transporter.sendMail({
            ...emailDefaults,
            ...data,
        });
        console.log(`EMAIL SENT SUCCESSFULLY: ${JSON.stringify(result)}`);
    }
    /**
     * Get the SMTP configuration
     */
    getConfig() {
        return this.config;
    }
}
/**
 * Create SMTP client from environment variables
 */
export function createSMTPClient() {
    const config = {
        host: process.env.SMTP_HOST || '',
        port: Number(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER || '',
        password: process.env.SMTP_PASSWORD || '',
        from: process.env.SMTP_FROM || '',
    };
    return new SMTPClient(config);
}
//# sourceMappingURL=smtp.js.map