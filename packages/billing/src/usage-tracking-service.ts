/**
 * Usage Tracking Service
 * Manages usage tracking, quotas, and metered billing with Stripe integration
 */

import Stripe from 'stripe';
import { prisma } from '@wirecrest/db';

export interface UsageRecord {
  id: string;
  teamId: string;
  feature: string;
  quantity: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  stripeUsageRecordId?: string;
  subscriptionItemId?: string;
}

export interface UsageQuota {
  feature: string;
  limit: number;
  period: 'day' | 'week' | 'month' | 'year';
  resetDate?: Date;
  overage: {
    allowed: boolean;
    rate?: number; // Cost per unit over limit
    maxOverage?: number; // Maximum overage allowed
  };
}

export interface UsageSummary {
  teamId: string;
  period: {
    start: Date;
    end: Date;
  };
  usage: Array<{
    feature: string;
    used: number;
    limit: number;
    percentage: number;
    overage: number;
    cost: number;
  }>;
  totalCost: number;
  warnings: string[];
}

export interface MeteredBillingConfig {
  feature: string;
  aggregationUsage: 'sum' | 'last_during_period' | 'last_ever' | 'max';
  billingScheme: 'per_unit' | 'tiered';
  tiers?: Array<{
    upTo: number | 'inf';
    unitAmount: number;
    flatAmount?: number;
  }>;
}

export class UsageTrackingService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }

  /**
   * Record usage for a team and feature
   */
  async recordUsage(
    teamId: string,
    feature: string,
    quantity: number,
    options: {
      timestamp?: Date;
      metadata?: Record<string, unknown>;
      idempotencyKey?: string;
      reportToStripe?: boolean;
    } = {}
  ): Promise<UsageRecord> {
    const { timestamp = new Date(), metadata, idempotencyKey, reportToStripe = true } = options;

    // Check if team has active subscription
    const subscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
    });

    if (!subscription) {
      throw new Error('Team does not have an active subscription');
    }

    // Check quota before recording
    const quotaCheck = await this.checkQuota(teamId, feature, quantity);
    if (!quotaCheck.allowed && !quotaCheck.overage.allowed) {
      throw new Error(`Usage quota exceeded for feature: ${feature}`);
    }

    // Create local usage record
    const usageRecord = await prisma.usageRecord.create({
      data: {
        teamId,
        feature,
        quantity,
        timestamp,
        metadata: metadata || {},
        idempotencyKey,
      },
    });

    // Report to Stripe if enabled and subscription item exists
    let stripeUsageRecordId: string | undefined;
    if (reportToStripe && subscription.stripeSubscriptionId) {
      try {
        const stripeUsageRecord = await this.reportUsageToStripe(
          subscription.stripeSubscriptionId,
          feature,
          quantity,
          timestamp,
          idempotencyKey
        );
        stripeUsageRecordId = stripeUsageRecord?.id;
      } catch (error) {
        console.warn('Failed to report usage to Stripe:', error);
      }
    }

    // Update usage record with Stripe ID if available
    if (stripeUsageRecordId) {
      await prisma.usageRecord.update({
        where: { id: usageRecord.id },
        data: { stripeUsageRecordId },
      });
    }

    // Check if usage exceeds warning thresholds
    await this.checkUsageWarnings(teamId, feature);

    return {
      id: usageRecord.id,
      teamId: usageRecord.teamId,
      feature: usageRecord.feature,
      quantity: usageRecord.quantity,
      timestamp: usageRecord.timestamp,
      metadata: usageRecord.metadata as Record<string, unknown>,
      stripeUsageRecordId,
    };
  }

  /**
   * Check quota for a feature
   */
  async checkQuota(
    teamId: string,
    feature: string,
    additionalQuantity: number = 0
  ): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
    overage: {
      allowed: boolean;
      current: number;
      max: number;
      rate?: number;
    };
  }> {
    // Get team's subscription tier and quotas
    const subscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
    });

    if (!subscription) {
      return {
        allowed: false,
        current: 0,
        limit: 0,
        remaining: 0,
        overage: { allowed: false, current: 0, max: 0 },
      };
    }

    // Get quota configuration for the feature
    const quota = await this.getFeatureQuota(subscription.tier, feature);
    if (!quota) {
      // No quota configured - allow unlimited usage
      return {
        allowed: true,
        current: 0,
        limit: -1, // -1 indicates unlimited
        remaining: -1,
        overage: { allowed: false, current: 0, max: 0 },
      };
    }

    // Calculate current usage for the period
    const periodStart = this.getPeriodStart(quota.period, quota.resetDate);
    const currentUsage = await this.getCurrentUsage(teamId, feature, periodStart);

    const totalUsage = currentUsage + additionalQuantity;
    const overage = Math.max(0, totalUsage - quota.limit);
    const overageAllowed = quota.overage.allowed && 
                          (quota.overage.maxOverage === undefined || overage <= quota.overage.maxOverage);

    return {
      allowed: totalUsage <= quota.limit || overageAllowed,
      current: currentUsage,
      limit: quota.limit,
      remaining: Math.max(0, quota.limit - currentUsage),
      overage: {
        allowed: quota.overage.allowed,
        current: overage,
        max: quota.overage.maxOverage || 0,
        rate: quota.overage.rate,
      },
    };
  }

  /**
   * Get current usage for a feature in a period
   */
  async getCurrentUsage(
    teamId: string,
    feature: string,
    periodStart: Date,
    periodEnd: Date = new Date()
  ): Promise<number> {
    const result = await prisma.usageRecord.aggregate({
      where: {
        teamId,
        feature,
        timestamp: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      _sum: {
        quantity: true,
      },
    });

    return result._sum.quantity || 0;
  }

  /**
   * Get usage summary for a team
   */
  async getUsageSummary(
    teamId: string,
    period?: {
      start: Date;
      end: Date;
    }
  ): Promise<UsageSummary> {
    const subscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
    });

    if (!subscription) {
      throw new Error('Team does not have an active subscription');
    }

    // Default to current billing period
    const defaultPeriod = {
      start: subscription.currentPeriodStart || new Date(),
      end: subscription.currentPeriodEnd || new Date(),
    };
    const usagePeriod = period || defaultPeriod;

    // Get all features with quotas for this tier
    const quotas = await this.getTierQuotas(subscription.tier);
    const usage: UsageSummary['usage'] = [];
    let totalCost = 0;
    const warnings: string[] = [];

    for (const quota of quotas) {
      const used = await this.getCurrentUsage(
        teamId,
        quota.feature,
        usagePeriod.start,
        usagePeriod.end
      );

      const overage = Math.max(0, used - quota.limit);
      const overageCost = overage * (quota.overage.rate || 0);
      const percentage = quota.limit > 0 ? (used / quota.limit) * 100 : 0;

      usage.push({
        feature: quota.feature,
        used,
        limit: quota.limit,
        percentage,
        overage,
        cost: overageCost,
      });

      totalCost += overageCost;

      // Add warnings
      if (percentage >= 90) {
        warnings.push(`${quota.feature} usage is at ${percentage.toFixed(1)}% of limit`);
      }
      if (overage > 0) {
        warnings.push(`${quota.feature} has ${overage} units of overage (${overageCost > 0 ? `$${(overageCost / 100).toFixed(2)}` : 'free'})`);
      }
    }

    return {
      teamId,
      period: usagePeriod,
      usage,
      totalCost,
      warnings,
    };
  }

  /**
   * Reset usage quotas for a new period
   */
  async resetQuotas(teamId: string, features?: string[]): Promise<void> {
    const subscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
    });

    if (!subscription) {
      throw new Error('Team does not have an active subscription');
    }

    const quotas = await this.getTierQuotas(subscription.tier);
    const featuresToReset = features || quotas.map(q => q.feature);

    // Update reset dates for specified features
    for (const feature of featuresToReset) {
      const quota = quotas.find(q => q.feature === feature);
      if (quota) {
        const nextResetDate = this.getNextResetDate(quota.period);
        
        // Update quota reset date in database
        await prisma.usageQuota.upsert({
          where: {
            teamId_feature: {
              teamId,
              feature,
            },
          },
          create: {
            teamId,
            feature,
            limit: quota.limit,
            period: quota.period,
            resetDate: nextResetDate,
            overageAllowed: quota.overage.allowed,
            overageRate: quota.overage.rate || 0,
            maxOverage: quota.overage.maxOverage,
          },
          update: {
            resetDate: nextResetDate,
          },
        });
      }
    }
  }

  /**
   * Get usage history for a feature
   */
  async getUsageHistory(
    teamId: string,
    feature: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      groupBy?: 'hour' | 'day' | 'week' | 'month';
    } = {}
  ): Promise<{
    records: UsageRecord[];
    total: number;
    aggregated?: Array<{
      period: string;
      quantity: number;
      timestamp: Date;
    }>;
  }> {
    const { limit = 100, offset = 0, startDate, endDate, groupBy } = options;

    const whereClause: any = {
      teamId,
      feature,
    };

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = startDate;
      if (endDate) whereClause.timestamp.lte = endDate;
    }

    // Get individual records
    const records = await prisma.usageRecord.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.usageRecord.count({
      where: whereClause,
    });

    const usageRecords: UsageRecord[] = records.map(record => ({
      id: record.id,
      teamId: record.teamId,
      feature: record.feature,
      quantity: record.quantity,
      timestamp: record.timestamp,
      metadata: record.metadata as Record<string, unknown>,
      stripeUsageRecordId: record.stripeUsageRecordId,
    }));

    // Get aggregated data if requested
    let aggregated: Array<{ period: string; quantity: number; timestamp: Date }> | undefined;
    if (groupBy) {
      aggregated = await this.getAggregatedUsage(teamId, feature, groupBy, startDate, endDate);
    }

    return {
      records: usageRecords,
      total,
      aggregated,
    };
  }

  /**
   * Create metered billing price in Stripe
   */
  async createMeteredPrice(
    productId: string,
    config: MeteredBillingConfig
  ): Promise<Stripe.Price> {
    const priceParams: Stripe.PriceCreateParams = {
      product: productId,
      currency: 'usd',
      billing_scheme: config.billingScheme,
      recurring: {
        interval: 'month',
        usage_type: 'metered',
        aggregate_usage: config.aggregationUsage,
      },
      metadata: {
        feature: config.feature,
      },
    };

    if (config.billingScheme === 'per_unit') {
      priceParams.unit_amount = 0; // Base price, usage will be charged separately
    } else if (config.billingScheme === 'tiered' && config.tiers) {
      priceParams.tiers_mode = 'volume';
      priceParams.tiers = config.tiers.map(tier => ({
        up_to: tier.upTo === 'inf' ? null : tier.upTo,
        unit_amount: tier.unitAmount,
        flat_amount: tier.flatAmount,
      }));
    }

    return await this.stripe.prices.create(priceParams);
  }

  /**
   * Private helper methods
   */
  private async reportUsageToStripe(
    subscriptionId: string,
    feature: string,
    quantity: number,
    timestamp: Date,
    idempotencyKey?: string
  ): Promise<Stripe.UsageRecord | null> {
    try {
      // Get subscription to find the correct subscription item
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price'],
      });

      // Find subscription item for this feature
      const subscriptionItem = subscription.items.data.find(item => {
        const price = item.price as Stripe.Price;
        return price.metadata?.feature === feature;
      });

      if (!subscriptionItem) {
        console.warn(`No subscription item found for feature: ${feature}`);
        return null;
      }

      // Create usage record in Stripe
      return await this.stripe.subscriptionItems.createUsageRecord(
        subscriptionItem.id,
        {
          quantity,
          timestamp: Math.floor(timestamp.getTime() / 1000),
          action: 'increment',
        },
        {
          idempotencyKey,
        }
      );
    } catch (error) {
      console.error('Failed to report usage to Stripe:', error);
      return null;
    }
  }

  private async getFeatureQuota(tier: string, feature: string): Promise<UsageQuota | null> {
    // This would typically come from your tier configuration
    // For now, we'll return some default quotas based on tier
    const quotaConfigs: Record<string, Record<string, UsageQuota>> = {
      STARTER: {
        api_calls: {
          feature: 'api_calls',
          limit: 1000,
          period: 'month',
          overage: { allowed: false },
        },
        storage_gb: {
          feature: 'storage_gb',
          limit: 5,
          period: 'month',
          overage: { allowed: true, rate: 100, maxOverage: 10 }, // $1 per GB
        },
      },
      PRO: {
        api_calls: {
          feature: 'api_calls',
          limit: 10000,
          period: 'month',
          overage: { allowed: true, rate: 1 }, // $0.01 per call
        },
        storage_gb: {
          feature: 'storage_gb',
          limit: 50,
          period: 'month',
          overage: { allowed: true, rate: 50, maxOverage: 100 }, // $0.50 per GB
        },
      },
      ENTERPRISE: {
        api_calls: {
          feature: 'api_calls',
          limit: 100000,
          period: 'month',
          overage: { allowed: true, rate: 0.5 }, // $0.005 per call
        },
        storage_gb: {
          feature: 'storage_gb',
          limit: 500,
          period: 'month',
          overage: { allowed: true, rate: 25 }, // $0.25 per GB
        },
      },
    };

    return quotaConfigs[tier]?.[feature] || null;
  }

  private async getTierQuotas(tier: string): Promise<UsageQuota[]> {
    const quotaConfigs: Record<string, UsageQuota[]> = {
      STARTER: [
        {
          feature: 'api_calls',
          limit: 1000,
          period: 'month',
          overage: { allowed: false },
        },
        {
          feature: 'storage_gb',
          limit: 5,
          period: 'month',
          overage: { allowed: true, rate: 100, maxOverage: 10 },
        },
      ],
      PRO: [
        {
          feature: 'api_calls',
          limit: 10000,
          period: 'month',
          overage: { allowed: true, rate: 1 },
        },
        {
          feature: 'storage_gb',
          limit: 50,
          period: 'month',
          overage: { allowed: true, rate: 50, maxOverage: 100 },
        },
      ],
      ENTERPRISE: [
        {
          feature: 'api_calls',
          limit: 100000,
          period: 'month',
          overage: { allowed: true, rate: 0.5 },
        },
        {
          feature: 'storage_gb',
          limit: 500,
          period: 'month',
          overage: { allowed: true, rate: 25 },
        },
      ],
    };

    return quotaConfigs[tier] || [];
  }

  private getPeriodStart(period: 'day' | 'week' | 'month' | 'year', resetDate?: Date): Date {
    const now = new Date();
    
    if (resetDate && resetDate > now) {
      // Use the last reset date
      const periodMs = this.getPeriodMs(period);
      return new Date(resetDate.getTime() - periodMs);
    }

    switch (period) {
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week':
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        return startOfWeek;
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  private getNextResetDate(period: 'day' | 'week' | 'month' | 'year'): Date {
    const now = new Date();
    
    switch (period) {
      case 'day':
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
      case 'week':
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + (7 - now.getDay()));
        nextWeek.setHours(0, 0, 0, 0);
        return nextWeek;
      case 'month':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      case 'year':
        return new Date(now.getFullYear() + 1, 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
  }

  private getPeriodMs(period: 'day' | 'week' | 'month' | 'year'): number {
    switch (period) {
      case 'day':
        return 24 * 60 * 60 * 1000;
      case 'week':
        return 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return 30 * 24 * 60 * 60 * 1000; // Approximate
      case 'year':
        return 365 * 24 * 60 * 60 * 1000; // Approximate
      default:
        return 30 * 24 * 60 * 60 * 1000;
    }
  }

  private async getAggregatedUsage(
    teamId: string,
    feature: string,
    groupBy: 'hour' | 'day' | 'week' | 'month',
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ period: string; quantity: number; timestamp: Date }>> {
    // This would typically use database-specific date functions
    // For now, we'll return a simplified aggregation
    const whereClause: any = {
      teamId,
      feature,
    };

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = startDate;
      if (endDate) whereClause.timestamp.lte = endDate;
    }

    const records = await prisma.usageRecord.findMany({
      where: whereClause,
      orderBy: { timestamp: 'asc' },
    });

    // Group records by period
    const grouped = new Map<string, { quantity: number; timestamp: Date }>();
    
    for (const record of records) {
      const periodKey = this.getPeriodKey(record.timestamp, groupBy);
      const existing = grouped.get(periodKey);
      
      if (existing) {
        existing.quantity += record.quantity;
      } else {
        grouped.set(periodKey, {
          quantity: record.quantity,
          timestamp: record.timestamp,
        });
      }
    }

    return Array.from(grouped.entries()).map(([period, data]) => ({
      period,
      quantity: data.quantity,
      timestamp: data.timestamp,
    }));
  }

  private getPeriodKey(date: Date, groupBy: 'hour' | 'day' | 'week' | 'month'): string {
    switch (groupBy) {
      case 'hour':
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
      case 'day':
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;
      case 'month':
        return `${date.getFullYear()}-${date.getMonth() + 1}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  private async checkUsageWarnings(teamId: string, feature: string): Promise<void> {
    const quotaCheck = await this.checkQuota(teamId, feature);
    
    if (quotaCheck.limit > 0) {
      const percentage = (quotaCheck.current / quotaCheck.limit) * 100;
      
      // Send warnings at 80% and 95%
      if (percentage >= 95) {
        console.warn(`🚨 Team ${teamId} is at ${percentage.toFixed(1)}% of ${feature} quota`);
        // TODO: Send notification
      } else if (percentage >= 80) {
        console.warn(`⚠️ Team ${teamId} is at ${percentage.toFixed(1)}% of ${feature} quota`);
        // TODO: Send notification
      }
    }
  }
}
