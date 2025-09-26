/**
 * Business Utility Functions
 * Core business logic utilities for business operations
 */

import { BusinessProfile, BusinessMetrics, BusinessSettings } from './types';
import { BUSINESS_TYPES, EMPLOYEE_COUNTS, REVENUE_RANGES, SUBSCRIPTION_TIERS } from './constants';

/**
 * Calculate business metrics
 */
export const calculateBusinessMetrics = (profile: BusinessProfile, reviews: any[]): BusinessMetrics => {
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / totalReviews 
    : 0;

  // Calculate rating distribution
  const ratingDistribution: Record<string, number> = {};
  for (let i = 1; i <= 5; i++) {
    ratingDistribution[i.toString()] = reviews.filter(r => r.rating === i).length;
  }

  // Calculate monthly reviews (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const monthlyReviews = reviews.filter(r => new Date(r.createdAt) >= thirtyDaysAgo).length;

  // Calculate response rate
  const respondedReviews = reviews.filter(r => r.response && r.response.trim() !== '').length;
  const responseRate = totalReviews > 0 ? (respondedReviews / totalReviews) * 100 : 0;

  // Calculate average response time (in hours)
  const responseTimes = reviews
    .filter(r => r.response && r.responseTime)
    .map(r => r.responseTime);
  const averageResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    : 0;

  // Calculate sentiment score (-1 to 1)
  const sentimentScores = reviews
    .filter(r => r.sentiment !== undefined)
    .map(r => r.sentiment);
  const sentimentScore = sentimentScores.length > 0
    ? sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length
    : 0;

  // Extract top keywords from reviews
  const allText = reviews
    .map(r => `${r.title || ''} ${r.content || ''}`)
    .join(' ')
    .toLowerCase();
  
  const words = allText
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  const topKeywords = Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);

  return {
    totalReviews,
    averageRating,
    ratingDistribution,
    monthlyReviews,
    responseRate,
    responseTime: averageResponseTime,
    sentimentScore,
    topKeywords,
  };
};

/**
 * Validate business profile
 */
export const validateBusinessProfile = (profile: Partial<BusinessProfile>): string[] => {
  const errors: string[] = [];

  if (!profile.name || profile.name.trim() === '') {
    errors.push('Business name is required');
  }

  if (profile.email && !isValidEmail(profile.email)) {
    errors.push('Invalid email format');
  }

  if (profile.website && !isValidUrl(profile.website)) {
    errors.push('Invalid website URL');
  }

  if (profile.phone && !isValidPhone(profile.phone)) {
    errors.push('Invalid phone number format');
  }

  if (profile.latitude && (profile.latitude < -90 || profile.latitude > 90)) {
    errors.push('Invalid latitude value');
  }

  if (profile.longitude && (profile.longitude < -180 || profile.longitude > 180)) {
    errors.push('Invalid longitude value');
  }

  return errors;
};

/**
 * Check if business is active
 */
export const isBusinessActive = (profile: BusinessProfile): boolean => {
  return profile.createdAt && profile.updatedAt && 
         new Date(profile.updatedAt) > new Date(profile.createdAt);
};

/**
 * Get business age in days
 */
export const getBusinessAge = (profile: BusinessProfile): number => {
  const now = new Date();
  const created = new Date(profile.createdAt);
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Check if business needs verification
 */
export const needsVerification = (profile: BusinessProfile): boolean => {
  return !profile.email || !profile.phone || !profile.address;
};

/**
 * Get business size category
 */
export const getBusinessSize = (employeeCount: string): string => {
  switch (employeeCount) {
    case EMPLOYEE_COUNTS.SOLO:
      return 'Solo';
    case EMPLOYEE_COUNTS.SMALL:
      return 'Small Business';
    case EMPLOYEE_COUNTS.MEDIUM:
      return 'Medium Business';
    case EMPLOYEE_COUNTS.LARGE:
      return 'Large Business';
    case EMPLOYEE_COUNTS.ENTERPRISE:
      return 'Enterprise';
    case EMPLOYEE_COUNTS.CORPORATE:
      return 'Corporate';
    default:
      return 'Unknown';
  }
};

/**
 * Get revenue category
 */
export const getRevenueCategory = (revenue: string): string => {
  switch (revenue) {
    case REVENUE_RANGES.STARTUP:
      return 'Startup';
    case REVENUE_RANGES.SMALL:
      return 'Small Revenue';
    case REVENUE_RANGES.MEDIUM:
      return 'Medium Revenue';
    case REVENUE_RANGES.LARGE:
      return 'Large Revenue';
    case REVENUE_RANGES.ENTERPRISE:
      return 'Enterprise Revenue';
    case REVENUE_RANGES.CORPORATE:
      return 'Corporate Revenue';
    default:
      return 'Unknown';
  }
};

/**
 * Get business type display name
 */
export const getBusinessTypeDisplayName = (businessType: string): string => {
  const typeMap: Record<string, string> = {
    [BUSINESS_TYPES.HOSPITALITY]: 'Hospitality',
    [BUSINESS_TYPES.RETAIL]: 'Retail',
    [BUSINESS_TYPES.HEALTHCARE]: 'Healthcare',
    [BUSINESS_TYPES.EDUCATION]: 'Education',
    [BUSINESS_TYPES.FINANCE]: 'Finance',
    [BUSINESS_TYPES.TECHNOLOGY]: 'Technology',
    [BUSINESS_TYPES.MANUFACTURING]: 'Manufacturing',
    [BUSINESS_TYPES.CONSULTING]: 'Consulting',
    [BUSINESS_TYPES.REAL_ESTATE]: 'Real Estate',
    [BUSINESS_TYPES.ENTERTAINMENT]: 'Entertainment',
    [BUSINESS_TYPES.FOOD_BEVERAGE]: 'Food & Beverage',
    [BUSINESS_TYPES.FITNESS]: 'Fitness',
    [BUSINESS_TYPES.BEAUTY]: 'Beauty',
    [BUSINESS_TYPES.AUTOMOTIVE]: 'Automotive',
    [BUSINESS_TYPES.TRAVEL]: 'Travel',
    [BUSINESS_TYPES.OTHER]: 'Other',
  };
  
  return typeMap[businessType] || 'Unknown';
};

/**
 * Check if business is eligible for premium features
 */
export const isEligibleForPremium = (profile: BusinessProfile, subscriptionTier: string): boolean => {
  return subscriptionTier !== SUBSCRIPTION_TIERS.FREE && isBusinessActive(profile);
};

/**
 * Get business contact information
 */
export const getBusinessContactInfo = (profile: BusinessProfile) => {
  return {
    email: profile.email,
    phone: profile.phone,
    website: profile.website,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    country: profile.country,
    postalCode: profile.postalCode,
  };
};

/**
 * Get business social media links
 */
export const getBusinessSocialMedia = (profile: BusinessProfile) => {
  return profile.socialMedia || {};
};

/**
 * Check if business has social media presence
 */
export const hasSocialMediaPresence = (profile: BusinessProfile): boolean => {
  const socialMedia = getBusinessSocialMedia(profile);
  return Object.values(socialMedia).some(link => link && link.trim() !== '');
};

// Helper functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};
