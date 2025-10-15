/**
 * Trial and Demo Service
 * Manages trial periods, demo accounts, and trial-to-paid conversions
 */

import Stripe from 'stripe';
import { prisma } from '@wirecrest/db';
import { StripeService } from './stripe-service';

export interface TrialConfig {
  id: string;
  name: string;
  description: string;
  durationDays: number;
  tier: 'STARTER' | 'PRO' | 'ENTERPRISE';
  features: string[];
  limitations: {
    maxSeats?: number;
    maxLocations?: number;
    maxApiCalls?: number;
    maxStorage?: number; // in GB
    customLimitations?: Record<string, unknown>;
  };
  requiresPaymentMethod: boolean;
  autoConvert: boolean;
  gracePeriodDays?: number;
  retentionOffers?: Array<{
    type: 'discount' | 'extended_trial' | 'feature_upgrade';
    value: number;
    description: string;
  }>;
  active: boolean;
}

export interface DemoAccount {
  id: string;
  teamId: string;
  email: string;
  name: string;
  trialConfigId: string;
  startedAt: Date;
  expiresAt: Date;
  status: 'active' | 'expired' | 'converted' | 'cancelled';
  conversionData?: {
    convertedAt: Date;
    subscriptionId: string;
    tier: string;
  };
  usageStats: {
    apiCalls: number;
    storageUsed: number; // in GB
    featuresUsed: string[];
    lastActivity: Date;
  };
  metadata?: Record<string, unknown>;
}

export interface TrialConversion {
  teamId: string;
  trialId: string;
  targetTier: string;
  paymentMethodId?: string;
  couponCode?: string;
  retentionOffer?: {
    type: 'discount' | 'extended_trial' | 'feature_upgrade';
    value: number;
    description: string;
  };
}

export interface TrialAnalytics {
  totalTrials: number;
  activeTrials: number;
  convertedTrials: number;
  expiredTrials: number;
  conversionRate: number;
  averageTrialDuration: number; // in days
  topConvertingTiers: Array<{
    tier: string;
    conversions: number;
    conversionRate: number;
  }>;
  churnReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

export class TrialDemoService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    this.stripe = StripeService.getStripeInstance() ;
  }

  /**
   * Create a new trial configuration
   */
  async createTrialConfig(config: Omit<TrialConfig, 'id'>): Promise<TrialConfig> {
    const trialConfig = await prisma.trialConfig.create({
      data: {
        name: config.name,
        description: config.description,
        durationDays: config.durationDays,
        tier: config.tier,
        features: config.features,
        limitations: config.limitations,
        requiresPaymentMethod: config.requiresPaymentMethod,
        autoConvert: config.autoConvert,
        gracePeriodDays: config.gracePeriodDays,
        retentionOffers: config.retentionOffers,
        active: config.active,
      },
    });

    return this.transformTrialConfig(trialConfig);
  }

  /**
   * Start a trial for a team
   */
  async startTrial(
    teamId: string,
    trialConfigId: string,
    options: {
      email?: string;
      name?: string;
      paymentMethodId?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<DemoAccount> {
    const { email, name, paymentMethodId, metadata } = options;

    // Get trial configuration
    const trialConfig = await prisma.trialConfig.findUnique({
      where: { id: trialConfigId },
    });

    if (!trialConfig || !trialConfig.active) {
      throw new Error('Trial configuration not found or inactive');
    }

    // Check if team already has an active trial
    const existingTrial = await prisma.demoAccount.findFirst({
      where: {
        teamId,
        status: { in: ['active', 'expired'] },
      },
    });

    if (existingTrial) {
      throw new Error('Team already has an active or recent trial');
    }

    // Check if team has an active subscription
    const subscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
    });

    if (subscription && subscription.status === 'ACTIVE') {
      throw new Error('Team already has an active subscription');
    }

    // Calculate trial end date
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + trialConfig.durationDays * 24 * 60 * 60 * 1000);

    // Create demo account
    const demoAccount = await prisma.demoAccount.create({
      data: {
        teamId,
        email: email || `trial-${teamId}@example.com`,
        name: name || `Trial Account ${teamId}`,
        trialConfigId,
        startedAt,
        expiresAt,
        status: 'active',
        usageStats: {
          apiCalls: 0,
          storageUsed: 0,
          featuresUsed: [],
          lastActivity: startedAt,
        },
        metadata: metadata || {},
      },
    });

    // Create Stripe customer if payment method provided
    if (paymentMethodId) {
      const billingService = new (await import('./billing-service')).BillingService();
      const customer = await billingService.createOrGetCustomer(teamId);
      
      // Attach payment method
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });
    }

    // Apply trial limitations to team
    await this.applyTrialLimitations(teamId, trialConfig);

    return this.transformDemoAccount(demoAccount);
  }

  /**
   * Convert trial to paid subscription
   */
  async convertTrialToPaid(
    teamId: string,
    conversion: TrialConversion
  ): Promise<{
    success: boolean;
    subscription?: Stripe.Subscription;
    clientSecret?: string;
    requiresPaymentConfirmation?: boolean;
  }> {
    const { trialId, targetTier, paymentMethodId, couponCode, retentionOffer } = conversion;

    // Get trial account
    const trialAccount = await prisma.demoAccount.findUnique({
      where: { id: trialId },
    });

    if (!trialAccount || trialAccount.teamId !== teamId) {
      throw new Error('Trial account not found');
    }

    if (trialAccount.status !== 'active') {
      throw new Error('Trial is not active');
    }

    // Get target tier configuration
    const tierConfig = await prisma.subscriptionTierConfig.findUnique({
      where: { tier: targetTier as any },
    });

    if (!tierConfig) {
      throw new Error('Target tier configuration not found');
    }

    // Get Stripe price for the tier
    const stripeProduct = await prisma.stripeProduct.findFirst({
      where: { tier: targetTier as any },
    });

    if (!stripeProduct) {
      throw new Error('Stripe product not found for tier');
    }

    // Create subscription with trial conversion
    const subscriptionManagementService = new (await import('./subscription-management-service')).SubscriptionManagementService();
    
    const subscriptionResult = await subscriptionManagementService.createSubscription({
      teamId,
      priceId: stripeProduct.stripePriceId,
      paymentMethodId,
      trialDays: 0, // No additional trial since converting from trial
      quantity: 1,
      couponId: couponCode,
    });

    // Update trial account status
    await prisma.demoAccount.update({
      where: { id: trialId },
      data: {
        status: 'converted',
        conversionData: {
          convertedAt: new Date(),
          subscriptionId: subscriptionResult.subscription.id,
          tier: targetTier,
        },
      },
    });

    // Remove trial limitations
    await this.removeTrialLimitations(teamId);

    return {
      success: true,
      subscription: subscriptionResult.subscription,
      clientSecret: subscriptionResult.clientSecret,
      requiresPaymentConfirmation: subscriptionResult.requiresPaymentConfirmation,
    };
  }

  /**
   * Extend trial period
   */
  async extendTrial(
    teamId: string,
    trialId: string,
    additionalDays: number,
    reason?: string
  ): Promise<DemoAccount> {
    const trialAccount = await prisma.demoAccount.findUnique({
      where: { id: trialId },
    });

    if (!trialAccount || trialAccount.teamId !== teamId) {
      throw new Error('Trial account not found');
    }

    if (trialAccount.status !== 'active') {
      throw new Error('Trial is not active');
    }

    // Calculate new expiration date
    const newExpiresAt = new Date(trialAccount.expiresAt.getTime() + additionalDays * 24 * 60 * 60 * 1000);

    // Update trial account
    const updatedTrial = await prisma.demoAccount.update({
      where: { id: trialId },
      data: {
        expiresAt: newExpiresAt,
        metadata: {
          ...(trialAccount.metadata as Record<string, unknown> || {}),
          extensions: [
            ...(trialAccount.metadata?.extensions || []),
            {
              days: additionalDays,
              reason,
              extendedAt: new Date(),
            },
          ],
        },
      },
    });

    return this.transformDemoAccount(updatedTrial);
  }

  /**
   * Cancel trial
   */
  async cancelTrial(
    teamId: string,
    trialId: string,
    reason?: string
  ): Promise<DemoAccount> {
    const trialAccount = await prisma.demoAccount.findUnique({
      where: { id: trialId },
    });

    if (!trialAccount || trialAccount.teamId !== teamId) {
      throw new Error('Trial account not found');
    }

    // Update trial status
    const updatedTrial = await prisma.demoAccount.update({
      where: { id: trialId },
      data: {
        status: 'cancelled',
        metadata: {
          ...(trialAccount.metadata as Record<string, unknown> || {}),
          cancellation: {
            reason,
            cancelledAt: new Date(),
          },
        },
      },
    });

    // Remove trial limitations
    await this.removeTrialLimitations(teamId);

    return this.transformDemoAccount(updatedTrial);
  }

  /**
   * Get trial analytics
   */
  async getTrialAnalytics(
    options: {
      startDate?: Date;
      endDate?: Date;
      trialConfigId?: string;
    } = {}
  ): Promise<TrialAnalytics> {
    const { startDate, endDate, trialConfigId } = options;

    const whereClause: any = {};
    if (startDate || endDate) {
      whereClause.startedAt = {};
      if (startDate) whereClause.startedAt.gte = startDate;
      if (endDate) whereClause.startedAt.lte = endDate;
    }
    if (trialConfigId) {
      whereClause.trialConfigId = trialConfigId;
    }

    // Get trial counts
    const totalTrials = await prisma.demoAccount.count({
      where: whereClause,
    });

    const activeTrials = await prisma.demoAccount.count({
      where: { ...whereClause, status: 'active' },
    });

    const convertedTrials = await prisma.demoAccount.count({
      where: { ...whereClause, status: 'converted' },
    });

    const expiredTrials = await prisma.demoAccount.count({
      where: { ...whereClause, status: 'expired' },
    });

    // Calculate conversion rate
    const conversionRate = totalTrials > 0 ? (convertedTrials / totalTrials) * 100 : 0;

    // Calculate average trial duration
    const trials = await prisma.demoAccount.findMany({
      where: whereClause,
      select: {
        startedAt: true,
        expiresAt: true,
        status: true,
      },
    });

    const averageTrialDuration = trials.length > 0 
      ? trials.reduce((sum, trial) => {
          const duration = (trial.expiresAt.getTime() - trial.startedAt.getTime()) / (1000 * 60 * 60 * 24);
          return sum + duration;
        }, 0) / trials.length
      : 0;

    // Get top converting tiers
    const tierConversions = await prisma.demoAccount.groupBy({
      by: ['trialConfigId'],
      where: { ...whereClause, status: 'converted' },
      _count: { id: true },
    });

    const topConvertingTiers = await Promise.all(
      tierConversions.map(async (conversion) => {
        const trialConfig = await prisma.trialConfig.findUnique({
          where: { id: conversion.trialConfigId },
        });

        const totalForTier = await prisma.demoAccount.count({
          where: { ...whereClause, trialConfigId: conversion.trialConfigId },
        });

        return {
          tier: trialConfig?.tier || 'unknown',
          conversions: conversion._count.id,
          conversionRate: totalForTier > 0 ? (conversion._count.id / totalForTier) * 100 : 0,
        };
      })
    );

    // Get churn reasons (from metadata)
    const churnReasons: Record<string, number> = {};
    const cancelledTrials = await prisma.demoAccount.findMany({
      where: { ...whereClause, status: 'cancelled' },
      select: { metadata: true },
    });

    for (const trial of cancelledTrials) {
      const metadata = trial.metadata as any;
      const reason = metadata?.cancellation?.reason || 'No reason provided';
      churnReasons[reason] = (churnReasons[reason] || 0) + 1;
    }

    const churnReasonsArray = Object.entries(churnReasons).map(([reason, count]) => ({
      reason,
      count,
      percentage: (count / cancelledTrials.length) * 100,
    }));

    return {
      totalTrials,
      activeTrials,
      convertedTrials,
      expiredTrials,
      conversionRate,
      averageTrialDuration,
      topConvertingTiers,
      churnReasons: churnReasonsArray,
    };
  }

  /**
   * Get trial account details
   */
  async getTrialAccount(teamId: string): Promise<DemoAccount | null> {
    const trialAccount = await prisma.demoAccount.findFirst({
      where: { teamId },
      orderBy: { startedAt: 'desc' },
    });

    if (!trialAccount) {
      return null;
    }

    return this.transformDemoAccount(trialAccount);
  }

  /**
   * Update trial usage stats
   */
  async updateTrialUsage(
    teamId: string,
    feature: string,
    usage: {
      apiCalls?: number;
      storageUsed?: number;
      featuresUsed?: string[];
    }
  ): Promise<void> {
    const trialAccount = await prisma.demoAccount.findFirst({
      where: { teamId, status: 'active' },
    });

    if (!trialAccount) {
      return; // No active trial
    }

    const currentStats = trialAccount.usageStats as any;
    const updatedStats = {
      apiCalls: (currentStats.apiCalls || 0) + (usage.apiCalls || 0),
      storageUsed: (currentStats.storageUsed || 0) + (usage.storageUsed || 0),
      featuresUsed: [...new Set([...(currentStats.featuresUsed || []), ...(usage.featuresUsed || [])])],
      lastActivity: new Date(),
    };

    await prisma.demoAccount.update({
      where: { id: trialAccount.id },
      data: { usageStats: updatedStats },
    });
  }

  /**
   * Check if trial is expired and handle expiration
   */
  async checkTrialExpiration(teamId: string): Promise<{
    expired: boolean;
    trialAccount?: DemoAccount;
    gracePeriodRemaining?: number;
  }> {
    const trialAccount = await prisma.demoAccount.findFirst({
      where: { teamId, status: 'active' },
    });

    if (!trialAccount) {
      return { expired: false };
    }

    const now = new Date();
    const isExpired = now > trialAccount.expiresAt;

    if (isExpired) {
      // Get trial config to check grace period
      const trialConfig = await prisma.trialConfig.findUnique({
        where: { id: trialAccount.trialConfigId },
      });

      const gracePeriodDays = trialConfig?.gracePeriodDays || 0;
      const gracePeriodEnd = new Date(trialAccount.expiresAt.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);
      const inGracePeriod = now <= gracePeriodEnd;

      if (!inGracePeriod) {
        // Trial is fully expired
        await prisma.demoAccount.update({
          where: { id: trialAccount.id },
          data: { status: 'expired' },
        });

        // Remove trial limitations
        await this.removeTrialLimitations(teamId);

        return {
          expired: true,
          trialAccount: this.transformDemoAccount(trialAccount),
        };
      } else {
        // In grace period
        const gracePeriodRemaining = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          expired: false,
          trialAccount: this.transformDemoAccount(trialAccount),
          gracePeriodRemaining,
        };
      }
    }

    return {
      expired: false,
      trialAccount: this.transformDemoAccount(trialAccount),
    };
  }

  /**
   * Private helper methods
   */
  private async applyTrialLimitations(teamId: string, trialConfig: any): Promise<void> {
    // Apply limitations to team subscription
    const limitations = trialConfig.limitations;
    
    if (limitations) {
      await prisma.teamSubscription.upsert({
        where: { teamId },
        create: {
          teamId,
          tier: trialConfig.tier,
          status: 'TRIALING',
          currentSeats: limitations.maxSeats || 1,
          currentLocations: limitations.maxLocations || 1,
          enabledFeatures: trialConfig.features,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + trialConfig.durationDays * 24 * 60 * 60 * 1000),
          trialStart: new Date(),
          trialEnd: new Date(Date.now() + trialConfig.durationDays * 24 * 60 * 60 * 1000),
        },
        update: {
          tier: trialConfig.tier,
          status: 'TRIALING',
          currentSeats: limitations.maxSeats || 1,
          currentLocations: limitations.maxLocations || 1,
          enabledFeatures: trialConfig.features,
          trialStart: new Date(),
          trialEnd: new Date(Date.now() + trialConfig.durationDays * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  private async removeTrialLimitations(teamId: string): Promise<void> {
    // Remove trial limitations - this would typically involve
    // downgrading to free tier or removing access entirely
    await prisma.teamSubscription.update({
      where: { teamId },
      data: {
        status: 'CANCELED',
        trialStart: null,
        trialEnd: null,
      },
    });
  }

  private transformTrialConfig(config: any): TrialConfig {
    return {
      id: config.id,
      name: config.name,
      description: config.description,
      durationDays: config.durationDays,
      tier: config.tier,
      features: config.features,
      limitations: config.limitations,
      requiresPaymentMethod: config.requiresPaymentMethod,
      autoConvert: config.autoConvert,
      gracePeriodDays: config.gracePeriodDays,
      retentionOffers: config.retentionOffers,
      active: config.active,
    };
  }

  private transformDemoAccount(account: any): DemoAccount {
    return {
      id: account.id,
      teamId: account.teamId,
      email: account.email,
      name: account.name,
      trialConfigId: account.trialConfigId,
      startedAt: account.startedAt,
      expiresAt: account.expiresAt,
      status: account.status,
      conversionData: account.conversionData,
      usageStats: account.usageStats,
      metadata: account.metadata,
    };
  }
}
