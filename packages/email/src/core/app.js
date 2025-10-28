/**
 * Application configuration for email templates
 * This provides app-wide settings used in email templates
 */
export const appConfig = {
    name: process.env.APP_NAME || 'Wirecrest',
    logoUrl: process.env.APP_LOGO_URL || 'https://www.wirecrest.com/images/logo.svg',
    url: process.env.APP_URL || 'https://www.wirecrest.com',
};
/**
 * Get application configuration
 */
export function getAppConfig() {
    return appConfig;
}
/**
 * Update application configuration
 */
export function updateAppConfig(config) {
    Object.assign(appConfig, config);
}
//# sourceMappingURL=app.js.map