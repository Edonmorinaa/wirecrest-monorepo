/**
 * Tenant Features Server Actions
 * 
 * Server actions for checking tenant feature access via Stripe Entitlements.
 * Replaces /api/tenants/[tenantId]/features API routes.
 */

'use server';

import { prisma } from '@wirecrest/db';
import {
  StripeService,
  StripeFeatureLookupKey,
  getAllStripeFeatureKeys,
  getGlobalFeatureChecker,
} from '@wirecrest/billing';

// Use the global FeatureChecker instance to ensure cache sharing
const featureChecker = getGlobalFeatureChecker();

// Return types
export interface TenantFeaturesResponse {
  success: boolean;
  tenantId?: string;
  features?: Record<string, boolean>;
  metadata?: {
    hasActiveSubscription: boolean;
    subscriptionStatus?: string;
    source: string;
    featureCount: number;
  };
  error?: string;
  resolvedAt?: string;
}

export interface CheckFeaturesResponse {
  success: boolean;
  tenantId?: string;
  features?: Record<string, boolean>;
  error?: string;
  checkedAt?: string;
}

/**
 * Get all features a tenant has access to
 * 
 * @param tenantId - Team ID or slug
 * @returns Feature flags with metadata
 */
export async function getTenantFeatures(
  tenantId: string
): Promise<TenantFeaturesResponse> {
  try {
    // Get tenant's team ID
    const team = await prisma.team.findFirst({
      where: {
        OR: [{ id: tenantId }, { slug: tenantId }],
      },
      select: { id: true, slug: true },
    });

    if (!team) {
      return {
        success: false,
        error: 'Team not found',
      };
    }

    // Get all features this team has access to
    const availableFeatures = await featureChecker.getTeamFeatures(team.id);

    // Convert Set to object format for backwards compatibility
    const featuresObject: Record<string, boolean> = {};
    const allFeatureKeys = getAllStripeFeatureKeys();

    allFeatureKeys.forEach((key) => {
      featuresObject[key] = availableFeatures.has(key);
    });

    // Get subscription info for metadata
    const subscription = await prisma.teamSubscription.findFirst({
      where: {
        teamId: team.id,
        status: {
          in: ['ACTIVE', 'TRIALING'],
        },
      },
      select: {
        status: true,
        stripeCustomerId: true,
      },
    });

    return {
      success: true,
      tenantId: team.slug,
      features: featuresObject,
      metadata: {
        hasActiveSubscription: !!subscription,
        subscriptionStatus: subscription?.status,
        source: 'stripe_entitlements',
        featureCount: availableFeatures.size,
      },
      resolvedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting tenant features:', error);
    return {
      success: false,
      error: 'Failed to get tenant features',
    };
  }
}

/**
 * Check access to specific features
 * 
 * @param tenantId - Team ID or slug
 * @param featureKeys - Array of feature keys to check
 * @returns Feature check results
 */
export async function checkTenantFeatures(
  tenantId: string,
  featureKeys: StripeFeatureLookupKey[]
): Promise<CheckFeaturesResponse> {
  try {
    if (!Array.isArray(featureKeys) || featureKeys.length === 0) {
      return {
        success: false,
        error: 'Invalid request: features array required',
      };
    }

    // Get team ID
    const team = await prisma.team.findFirst({
      where: {
        OR: [{ id: tenantId }, { slug: tenantId }],
      },
      select: { id: true, slug: true },
    });

    if (!team) {
      return {
        success: false,
        error: 'Team not found',
      };
    }

    // Check all requested features
    const results = await featureChecker.checkFeatures(team.id, featureKeys);

    return {
      success: true,
      tenantId: team.slug,
      features: results,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error checking features:', error);
    return {
      success: false,
      error: 'Failed to check features',
    };
  }
}

/**
 * Check if a tenant has access to a single feature
 * 
 * @param tenantId - Team ID or slug
 * @param featureKey - Feature key to check
 * @returns Feature check result
 */
export async function checkSingleFeature(
  tenantId: string,
  featureKey: StripeFeatureLookupKey
): Promise<{ hasAccess: boolean; reason?: string; error?: string }> {
  try {
    // Get team ID
    const team = await prisma.team.findFirst({
      where: {
        OR: [{ id: tenantId }, { slug: tenantId }],
      },
      select: { id: true, stripeCustomerId: true },
    });

    if (!team) {
      return {
        hasAccess: false,
        error: 'Team not found',
      };
    }

    // Get current subscription to get product ID
    const stripeService = new StripeService();
    const { productId } = await stripeService.getCurrentSubscription(team.stripeCustomerId);

    if (!productId) {
      return {
        hasAccess: false,
        reason: 'No active subscription found',
      };
    }

    // Check feature
    const result = await featureChecker.checkFeature(productId, featureKey);

    return {
      hasAccess: result.hasAccess,
      reason: result.reason,
    };
  } catch (error) {
    console.error('Error checking single feature:', error);
    return {
      hasAccess: false,
      error: 'Failed to check feature',
    };
  }
}

/**
 * Invalidate feature cache for a tenant
 * (Call after subscription changes)
 * 
 * @param tenantId - Team ID or slug
 */
export async function invalidateTenantFeatureCache(
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const team = await prisma.team.findFirst({
      where: {
        OR: [{ id: tenantId }, { slug: tenantId }],
      },
      select: { id: true },
    });

    if (!team) {
      return {
        success: false,
        error: 'Team not found',
      };
    }

    await featureChecker.clearTeamCache(team.id);

    return { success: true };
  } catch (error) {
    console.error('Error invalidating cache:', error);
    return {
      success: false,
      error: 'Failed to invalidate cache',
    };
  }
}

