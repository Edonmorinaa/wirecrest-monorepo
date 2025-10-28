"use strict";
/**
 * Application Configuration
 * Core business logic and application-level configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAppConfig = exports.getAppConfig = exports.DEFAULT_APP_CONFIG = void 0;
// Default application configuration
exports.DEFAULT_APP_CONFIG = {
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
    companyFullAddress: process.env.COMPANY_FULL_ADDRESS ||
        '123 Main St, San Francisco, CA 12345, USA',
};
// Environment-specific configurations
const getAppConfig = () => {
    const baseConfig = { ...exports.DEFAULT_APP_CONFIG };
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
exports.getAppConfig = getAppConfig;
// Update application configuration
const updateAppConfig = (updates) => {
    return { ...exports.DEFAULT_APP_CONFIG, ...updates };
};
exports.updateAppConfig = updateAppConfig;
//# sourceMappingURL=app.js.map