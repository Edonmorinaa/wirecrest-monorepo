/**
 * Server Actions for Billing Administration
 * Admin-only server actions for managing subscriptions and access tokens
 */

'use server';

import { prisma } from '@wirecrest/db';
import { auth } from '@wirecrest/auth/server';
import { SuperRole } from '@wirecrest/auth';
import { revalidatePath } from 'next/cache';
import { AccessTokenService } from './access-token-service';
import type { SubscriptionTier, SubscriptionStatus, OverrideType } from './types';

/**
 * Ensure user has admin privileges
 */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.superRole !== SuperRole.ADMIN) {
    throw new Error('Unauthorized: Admin access required');
  }
  return session.user;
}

/**
 * Get all team subscriptions (admin only)
 */
export async function getAllTeamSubscriptions() {
  await requireAdmin();

  const subscriptions = await prisma.teamSubscription.findMany({
    include: {
      team: {
        select: { name: true, slug: true },
      },
      overrides: {
        select: { id: true, type: true, key: true },
      },
      _count: {
        select: { usageRecords: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return subscriptions;
}

/**
 * Update team subscription (admin only)
 */
export async function updateTeamSubscription(
  teamId: string,
  updates: {
    tier?: SubscriptionTier;
    status?: SubscriptionStatus;
    currentSeats?: number;
    currentLocations?: number;
    enabledFeatures?: string[];
    trialEnd?: Date;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    await prisma.teamSubscription.upsert({
      where: { teamId },
      create: {
        teamId,
        tier: updates.tier || 'FREE',
        status: updates.status || 'ACTIVE',
        currentSeats: updates.currentSeats || 1,
        currentLocations: updates.currentLocations || 0,
        enabledFeatures: updates.enabledFeatures || [],
        trialEnd: updates.trialEnd,
      },
      update: {
        tier: updates.tier,
        status: updates.status,
        currentSeats: updates.currentSeats,
        currentLocations: updates.currentLocations,
        enabledFeatures: updates.enabledFeatures,
        trialEnd: updates.trialEnd,
        updatedAt: new Date(),
      },
    });

    revalidatePath('/admin/subscriptions');
    return { success: true };
  } catch (error) {
    console.error('Failed to update team subscription:', error);
    return { success: false, error: 'Failed to update team subscription' };
  }
}

/**
 * Create subscription override (admin only)
 */
export async function createSubscriptionOverride(input: {
  teamId: string;
  type: OverrideType;
  key: string;
  value: any;
  reason?: string;
  expiresAt?: Date;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const user = await requireAdmin();

    // Get the team's subscription
    const subscription = await prisma.teamSubscription.findUnique({
      where: { teamId: input.teamId },
    });

    if (!subscription) {
      return { success: false, error: 'Team subscription not found' };
    }

    // Check if override already exists
    const existing = await prisma.subscriptionOverride.findUnique({
      where: {
        subscriptionId_key: {
          subscriptionId: subscription.id,
          key: input.key,
        },
      },
    });

    if (existing) {
      return { success: false, error: 'Override already exists for this key' };
    }

    const override = await prisma.subscriptionOverride.create({
      data: {
        subscriptionId: subscription.id,
        type: input.type,
        key: input.key,
        value: JSON.stringify(input.value),
        reason: input.reason,
        expiresAt: input.expiresAt,
        createdBy: user.id,
      },
    });

    revalidatePath('/admin/subscriptions');
    return { success: true, id: override.id };
  } catch (error) {
    console.error('Failed to create subscription override:', error);
    return { success: false, error: 'Failed to create subscription override' };
  }
}

/**
 * Get subscription overrides (admin only)
 */
export async function getSubscriptionOverrides(teamId: string) {
  await requireAdmin();

  const subscription = await prisma.teamSubscription.findUnique({
    where: { teamId },
    include: {
      overrides: {
        include: {
          creator: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  return subscription?.overrides || [];
}

/**
 * Delete subscription override (admin only)
 */
export async function deleteSubscriptionOverride(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    await prisma.subscriptionOverride.delete({
      where: { id },
    });

    revalidatePath('/admin/subscriptions');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete subscription override:', error);
    return { success: false, error: 'Failed to delete subscription override' };
  }
}

/**
 * Create access token (admin only)
 */
export async function createAccessToken(input: {
  type: 'DEMO' | 'TRIAL' | 'BETA' | 'ENTERPRISE';
  maxTeams?: number;
  maxLocations?: number;
  maxDurationDays?: number;
  allowedFeatures?: string[];
  maxUses?: number;
}): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const user = await requireAdmin();
    const accessTokenService = new AccessTokenService();

    const token = await accessTokenService.createAccessToken({
      ...input,
      createdBy: user.id,
    });

    revalidatePath('/admin/access-tokens');
    return { success: true, token };
  } catch (error) {
    console.error('Failed to create access token:', error);
    return { success: false, error: 'Failed to create access token' };
  }
}

/**
 * Get all access tokens (admin only)
 */
export async function getAllAccessTokens(filters?: {
  type?: string;
  expired?: boolean;
  used?: boolean;
}) {
  await requireAdmin();
  const accessTokenService = new AccessTokenService();
  return await accessTokenService.listTokens(filters);
}

/**
 * Get access token details (admin only)
 */
export async function getAccessTokenDetails(token: string) {
  await requireAdmin();
  const accessTokenService = new AccessTokenService();
  return await accessTokenService.getTokenDetails(token);
}

/**
 * Extend trial period (admin only)
 */
export async function extendTrialPeriod(
  teamId: string,
  additionalDays: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAdmin();
    const accessTokenService = new AccessTokenService();

    await accessTokenService.extendTrial(teamId, additionalDays, user.id);

    revalidatePath('/admin/subscriptions');
    return { success: true };
  } catch (error) {
    console.error('Failed to extend trial period:', error);
    return { success: false, error: 'Failed to extend trial period' };
  }
}

/**
 * Get subscription analytics (admin only)
 */
export async function getSubscriptionAnalytics() {
  await requireAdmin();

  const [
    totalSubscriptions,
    subscriptionsByTier,
    subscriptionsByStatus,
    trialSubscriptions,
    recentActivity,
  ] = await Promise.all([
    prisma.teamSubscription.count(),
    
    prisma.teamSubscription.groupBy({
      by: ['tier'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    
    prisma.teamSubscription.groupBy({
      by: ['status'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    
    prisma.teamSubscription.count({
      where: {
        status: 'TRIALING',
        trialEnd: { gt: new Date() },
      },
    }),
    
    prisma.teamSubscription.findMany({
      include: {
        team: {
          select: { name: true, slug: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
  ]);

  // Get usage statistics
  const usageStats = await prisma.usageRecord.groupBy({
    by: ['type'],
    _sum: { quantity: true },
    _count: { id: true },
    where: {
      timestamp: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      },
    },
  });

  return {
    totalSubscriptions,
    subscriptionsByTier,
    subscriptionsByStatus,
    trialSubscriptions,
    recentActivity,
    usageStats,
  };
}

/**
 * Get team billing overview (admin only)
 */
export async function getTeamBillingOverview(teamId: string) {
  await requireAdmin();

  const [subscription, usageRecords, quotas, overrides] = await Promise.all([
    prisma.teamSubscription.findUnique({
      where: { teamId },
      include: {
        team: {
          select: { name: true, slug: true },
        },
      },
    }),
    
    prisma.usageRecord.findMany({
      where: {
        teamId,
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    }),
    
    prisma.usageQuota.findMany({
      where: { teamId },
    }),
    
    prisma.subscriptionOverride.findMany({
      where: {
        subscription: { teamId },
      },
      include: {
        creator: {
          select: { name: true, email: true },
        },
      },
    }),
  ]);

  return {
    subscription,
    usageRecords,
    quotas,
    overrides,
  };
}

/**
 * Cleanup expired tokens and overrides (admin only)
 */
export async function cleanupExpiredData(): Promise<{
  success: boolean;
  deleted: { tokens: number; overrides: number; redemptions: number };
  error?: string;
}> {
  try {
    await requireAdmin();
    
    const accessTokenService = new AccessTokenService();
    const tokenCleanup = await accessTokenService.cleanupExpired();

    // Cleanup expired feature flag overrides
    const expiredOverrides = await prisma.featureFlagOverride.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    // Cleanup expired subscription overrides
    const expiredSubOverrides = await prisma.subscriptionOverride.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    revalidatePath('/admin');
    
    return {
      success: true,
      deleted: {
        tokens: tokenCleanup.deletedTokens,
        overrides: expiredOverrides.count + expiredSubOverrides.count,
        redemptions: tokenCleanup.deletedRedemptions,
      },
    };
  } catch (error) {
    console.error('Failed to cleanup expired data:', error);
    return {
      success: false,
      deleted: { tokens: 0, overrides: 0, redemptions: 0 },
      error: 'Failed to cleanup expired data',
    };
  }
}
