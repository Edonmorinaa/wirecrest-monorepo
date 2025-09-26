import { AppConfig } from '@/types/email';

/**
 * Application configuration for email templates
 * This provides app-wide settings used in email templates
 */
export const appConfig: AppConfig = {
  name: process.env.APP_NAME || 'Wirecrest',
  logoUrl: process.env.APP_LOGO_URL || 'https://www.wirecrest.com/images/logo.svg',
  url: process.env.APP_URL || 'https://www.wirecrest.com',
};

/**
 * Get application configuration
 */
export function getAppConfig(): AppConfig {
  return appConfig;
}

/**
 * Update application configuration
 */
export function updateAppConfig(config: Partial<AppConfig>): void {
  Object.assign(appConfig, config);
}
