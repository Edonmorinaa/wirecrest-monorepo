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
export declare const DEFAULT_APP_CONFIG: AppConfig;
export declare const getAppConfig: () => AppConfig;
export declare const updateAppConfig: (updates: Partial<AppConfig>) => AppConfig;
//# sourceMappingURL=app.d.ts.map