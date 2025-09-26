/**
 * Application Configuration
 * Core business logic and application-level configuration
 */

export interface AppConfig {
  name: string;
  logoUrl: string;
  url: string;
}

// Default application configuration
export const DEFAULT_APP_CONFIG: AppConfig = {
  name: 'Wirecrest',
  logoUrl: 'https://www.wirecrest.com/images/logo.svg',
  url: process.env.APP_URL || 'https://www.wirecrest.com',
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
