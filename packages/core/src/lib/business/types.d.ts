/**
 * Business Types and Interfaces
 * Core business logic types for the Wirecrest platform
 */
export interface BusinessProfile {
    id: string;
    name: string;
    description?: string;
    website?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    language?: string;
    currency?: string;
    businessType?: string;
    industry?: string;
    foundedYear?: number;
    employeeCount?: string;
    revenue?: string;
    socialMedia?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        linkedin?: string;
        youtube?: string;
        tiktok?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
export interface BusinessMetrics {
    totalReviews: number;
    averageRating: number;
    ratingDistribution: Record<string, number>;
    monthlyReviews: number;
    responseRate: number;
    responseTime: number;
    sentimentScore: number;
    topKeywords: string[];
    competitorAnalysis?: {
        marketPosition: number;
        competitorCount: number;
        marketShare: number;
    };
}
export interface BusinessSettings {
    notifications: {
        newReview: boolean;
        ratingChange: boolean;
        competitorActivity: boolean;
        weeklyReport: boolean;
        monthlyReport: boolean;
    };
    automation: {
        autoRespond: boolean;
        responseTemplate?: string;
        responseDelay: number;
        escalationKeywords: string[];
    };
    privacy: {
        publicProfile: boolean;
        showMetrics: boolean;
        allowContact: boolean;
    };
    integrations: {
        crm?: string;
        analytics?: string;
        socialMedia?: string[];
    };
}
export interface BusinessAnalytics {
    overview: {
        totalReviews: number;
        averageRating: number;
        ratingTrend: number[];
        reviewTrend: number[];
        sentimentTrend: number[];
    };
    platforms: Record<string, {
        reviews: number;
        rating: number;
        growth: number;
        lastUpdate: Date;
    }>;
    competitors: {
        name: string;
        rating: number;
        reviews: number;
        marketShare: number;
    }[];
    insights: {
        topPerformingPlatform: string;
        improvementAreas: string[];
        opportunities: string[];
        risks: string[];
    };
}
export interface BusinessConfiguration {
    id: string;
    businessId: string;
    settings: BusinessSettings;
    analytics: BusinessAnalytics;
    metrics: BusinessMetrics;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=types.d.ts.map