/**
 * Access Token Service
 * Manages demo/trial access tokens and their redemption
 */

import { prisma } from '@wirecrest/db';
import { randomBytes } from 'crypto';

export interface CreateAccessTokenInput {
  type: 'DEMO' | 'TRIAL' | 'BETA' | 'ENTERPRISE';
  maxTeams?: number;
  maxLocations?: number;
  maxDurationDays?: number;
  allowedFeatures?: string[];
  maxUses?: number;
  createdBy: string;
}

export interface RedeemTokenInput {
  token: string;
  teamId: string;
  userId: string;
}

export interface AccessTokenDetails {
  id: string;
  token: string;
  type: string;
  maxTeams: number;
  maxLocations: number;
  maxDurationDays: number;
  allowedFeatures: string[];
  usedCount: number;
  maxUses: number;
  expiresAt: Date;
  redemptions: Array<{
    teamId: string;
    userId: string;
    redeemedAt: Date;
    expiresAt: Date;
  }>;
}

export class AccessTokenService {
  /**
   * Create a new access token
   */
  async createAccessToken(input: CreateAccessTokenInput): Promise<string> {
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

    await prisma.accessToken.create({
      data: {
        token,
        type: input.type,
        maxTeams: input.maxTeams || 1,
        maxLocations: input.maxLocations || 1,
        maxDurationDays: input.maxDurationDays || 14,
        allowedFeatures: input.allowedFeatures || [],
        maxUses: input.maxUses || 1,
        expiresAt,
        createdBy: input.createdBy,
      },
    });

    return token;
  }

  /**
   * Redeem an access token
   */
  async redeemToken(input: RedeemTokenInput): Promise<{
    success: boolean;
    expiresAt?: Date;
    allowedFeatures?: string[];
    maxLocations?: number;
    error?: string;
  }> {
    const accessToken = await prisma.accessToken.findUnique({
      where: { token: input.token },
      include: { redemptions: true },
    });

    if (!accessToken) {
      return { success: false, error: 'Invalid token' };
    }

    if (accessToken.expiresAt < new Date()) {
      return { success: false, error: 'Token expired' };
    }

    if (accessToken.usedCount >= accessToken.maxUses) {
      return { success: false, error: 'Token usage limit exceeded' };
    }

    // Check if token already redeemed by this team
    const existingRedemption = accessToken.redemptions.find(
      r => r.teamId === input.teamId
    );

    if (existingRedemption) {
      return { success: false, error: 'Token already redeemed by this team' };
    }

    const redemptionExpiresAt = new Date(
      Date.now() + accessToken.maxDurationDays * 24 * 60 * 60 * 1000
    );

    // Create redemption record
    await prisma.accessTokenRedemption.create({
      data: {
        tokenId: accessToken.id,
        teamId: input.teamId,
        userId: input.userId,
        expiresAt: redemptionExpiresAt,
      },
    });

    // Update token usage count
    await prisma.accessToken.update({
      where: { id: accessToken.id },
      data: {
        usedCount: {
          increment: 1,
        },
      },
    });

    // Create/update team subscription with trial settings
    await this.setupTrialSubscription(
      input.teamId,
      accessToken,
      redemptionExpiresAt
    );

    return {
      success: true,
      expiresAt: redemptionExpiresAt,
      allowedFeatures: accessToken.allowedFeatures,
      maxLocations: accessToken.maxLocations,
    };
  }

  /**
   * Check if team has active trial/demo access
   */
  async checkAccess(teamId: string): Promise<{
    hasAccess: boolean;
    type?: string;
    expiresAt?: Date;
    allowedFeatures?: string[];
    maxLocations?: number;
    daysRemaining?: number;
  }> {
    const redemption = await prisma.accessTokenRedemption.findFirst({
      where: {
        teamId,
        expiresAt: { gt: new Date() },
      },
      include: {
        token: true,
      },
      orderBy: { expiresAt: 'desc' },
    });

    if (!redemption) {
      return { hasAccess: false };
    }

    const daysRemaining = Math.ceil(
      (redemption.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );

    return {
      hasAccess: true,
      type: redemption.token.type,
      expiresAt: redemption.expiresAt,
      allowedFeatures: redemption.token.allowedFeatures,
      maxLocations: redemption.token.maxLocations,
      daysRemaining,
    };
  }

  /**
   * Get access token details (admin only)
   */
  async getTokenDetails(token: string): Promise<AccessTokenDetails | null> {
    const accessToken = await prisma.accessToken.findUnique({
      where: { token },
      include: {
        redemptions: {
          include: {
            team: { select: { name: true, slug: true } },
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!accessToken) {
      return null;
    }

    return {
      id: accessToken.id,
      token: accessToken.token,
      type: accessToken.type,
      maxTeams: accessToken.maxTeams,
      maxLocations: accessToken.maxLocations,
      maxDurationDays: accessToken.maxDurationDays,
      allowedFeatures: accessToken.allowedFeatures,
      usedCount: accessToken.usedCount,
      maxUses: accessToken.maxUses,
      expiresAt: accessToken.expiresAt,
      redemptions: accessToken.redemptions.map(r => ({
        teamId: r.teamId,
        userId: r.userId,
        redeemedAt: r.redeemedAt,
        expiresAt: r.expiresAt,
      })),
    };
  }

  /**
   * List all access tokens (admin only)
   */
  async listTokens(
    filters?: {
      type?: string;
      expired?: boolean;
      used?: boolean;
    }
  ) {
    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.expired === true) {
      where.expiresAt = { lt: new Date() };
    } else if (filters?.expired === false) {
      where.expiresAt = { gte: new Date() };
    }

    if (filters?.used === true) {
      where.usedCount = { gt: 0 };
    } else if (filters?.used === false) {
      where.usedCount = 0;
    }

    return await prisma.accessToken.findMany({
      where,
      include: {
        _count: {
          select: { redemptions: true },
        },
        creator: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Extend trial period (admin only)
   */
  async extendTrial(
    teamId: string,
    additionalDays: number,
    extendedBy: string
  ): Promise<void> {
    const redemption = await prisma.accessTokenRedemption.findFirst({
      where: {
        teamId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: 'desc' },
    });

    if (!redemption) {
      throw new Error('No active trial found for this team');
    }

    const newExpiresAt = new Date(
      redemption.expiresAt.getTime() + additionalDays * 24 * 60 * 60 * 1000
    );

    await prisma.accessTokenRedemption.update({
      where: { id: redemption.id },
      data: { expiresAt: newExpiresAt },
    });

    // Update subscription trial end
    await prisma.teamSubscription.updateMany({
      where: { teamId },
      data: { trialEnd: newExpiresAt },
    });
  }

  /**
   * Cleanup expired tokens and redemptions
   */
  async cleanupExpired(): Promise<{ deletedTokens: number; deletedRedemptions: number }> {
    const now = new Date();

    const deletedRedemptions = await prisma.accessTokenRedemption.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    const deletedTokens = await prisma.accessToken.deleteMany({
      where: {
        expiresAt: { lt: now },
        usedCount: 0, // Only delete unused expired tokens
      },
    });

    return {
      deletedTokens: deletedTokens.count,
      deletedRedemptions: deletedRedemptions.count,
    };
  }

  /**
   * Private helper methods
   */
  private generateSecureToken(): string {
    // Generate a secure random token
    const bytes = randomBytes(32);
    return bytes.toString('hex').toUpperCase();
  }

  private async setupTrialSubscription(
    teamId: string,
    accessToken: any,
    expiresAt: Date
  ): Promise<void> {
    await prisma.teamSubscription.upsert({
      where: { teamId },
      create: {
        teamId,
        tier: 'FREE',
        status: 'TRIALING',
        trialStart: new Date(),
        trialEnd: expiresAt,
        currentSeats: 1,
        currentLocations: 0,
        enabledFeatures: accessToken.allowedFeatures,
        basePrice: 0,
        includedSeats: 1,
        includedLocations: accessToken.maxLocations,
        includedRefreshes: 24, // Daily refreshes for trial
        pricePerSeat: 0,
        pricePerLocation: 0,
        pricePerRefresh: 0,
      },
      update: {
        status: 'TRIALING',
        trialStart: new Date(),
        trialEnd: expiresAt,
        enabledFeatures: accessToken.allowedFeatures,
        includedLocations: accessToken.maxLocations,
      },
    });
  }
}
