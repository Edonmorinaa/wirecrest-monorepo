/**
 * Application Configuration
 * Core business logic and application-level configuration
 */

export interface AppConfig {
  name: string;
  logoUrl: string;
  url: string;
  companyId: string;
  companyName: string;
  billingEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyZip: string;
  companyCity: string;
  companyState: string;
  companyCountry: string;
  companyFullAddress: string;
}

// Default application configuration
export const DEFAULT_APP_CONFIG: AppConfig = {
  name: 'Wirecrest',
  logoUrl: 'https://www.wirecrest.com/images/logo.svg',
  url: process.env.APP_URL || 'https://www.wirecrest.com',
  companyId: process.env.COMPANY_ID || 'wirecrest-main',
  companyName: process.env.COMPANY_NAME || 'Wirecrest LLC',
  billingEmail: process.env.BILLING_EMAIL || 'billing@wirecrest.com',
  companyPhone: process.env.COMPANY_PHONE || '+1-555-123-4567',
  companyAddress: process.env.COMPANY_ADDRESS || '123 Main St',
  companyZip: process.env.COMPANY_ZIP || '12345',
  companyCity: process.env.COMPANY_CITY || 'San Francisco',
  companyState: process.env.COMPANY_STATE || 'CA',
  companyCountry: process.env.COMPANY_COUNTRY || 'USA',
  companyFullAddress:
    process.env.COMPANY_FULL_ADDRESS ||
    '123 Main St, San Francisco, CA 12345, USA',
};

// Environment-specific configurations
export const getAppConfig = (): AppConfig => {
  const baseConfig = { ...DEFAULT_APP_CONFIG };
  
  // Override with environment variables
  if (process.env.APP_NAME) {
    baseConfig.name = process.env.APP_NAME;
  }
  
  if (process.env.APP_URL) {
    baseConfig.url = process.env.APP_URL;
  }
  
  if (process.env.APP_LOGO_URL) {
    baseConfig.logoUrl = process.env.APP_LOGO_URL;
  }
  
  return baseConfig;
};

// Update application configuration
export const updateAppConfig = (updates: Partial<AppConfig>): AppConfig => {
  return { ...DEFAULT_APP_CONFIG, ...updates };
};
