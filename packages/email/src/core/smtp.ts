import * as nodemailer from 'nodemailer';
import { SMTPConfig } from '../types/email';

/**
 * SMTP Configuration for email sending
 * This handles the nodemailer transporter setup
 */
export class SMTPClient {
  private transporter: nodemailer.Transporter;
  private config: SMTPConfig;

  constructor(config: SMTPConfig) {
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
  async sendEmail(data: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
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
  getConfig(): SMTPConfig {
    return this.config;
  }
}

/**
 * Create SMTP client from environment variables
 */
export function createSMTPClient(): SMTPClient {
  const config: SMTPConfig = {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || '',
  };

  return new SMTPClient(config);
}
