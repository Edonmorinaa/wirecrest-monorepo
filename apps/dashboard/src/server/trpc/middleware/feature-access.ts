/**
 * Feature Access Middleware for tRPC
 * 
 * Checks if a team has access to a specific feature before allowing the procedure to execute.
 * Returns different error codes based on the failure reason:
 * - UNAUTHORIZED: User not authenticated
 * - FORBIDDEN: Not a team member
 * - PAYMENT_REQUIRED: No active subscription
 * - PRECONDITION_FAILED: Feature not included in plan
 * - NOT_FOUND: Platform/resource not set up yet
 */

import { TRPCError } from '@trpc/server';
import { middleware } from '../trpc';
import { prisma } from '@wirecrest/db';
import { checkSingleFeature } from 'src/actions/tenant-features';
import type { StripeFeatureLookupKey } from '@wirecrest/billing';

/**
 * Feature access middleware
 * Use this to protect procedures that require specific features
 */
export const requireFeature = (featureKey: StripeFeatureLookupKey) =>
  middleware(async ({ ctx, next, input }) => {
    // Auth check
    if (!ctx.session?.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource',
      });
    }

    // Get team slug from input
    const slug = (input as any)?.slug;
    if (!slug) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Team slug is required',
      });
    }

    // Get team
    const team = await prisma.team.findUnique({
      where: { slug },
      select: {
        id: true,
        stripeCustomerId: true,
        members: {
          where: { userId: ctx.session.user.id },
          select: { id: true },
        },
      },
    });

    if (!team) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Team not found',
      });
    }

    // Verify team membership
    if (team.members.length === 0) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied. You must be a member of this team.',
      });
    }

    // Check subscription
    if (!team.stripeCustomerId) {
      throw new TRPCError({
        code: 'PAYMENT_REQUIRED',
        message: 'No subscription found. Please subscribe to access this feature.',
      });
    }

    // Check feature access
    const featureCheck = await checkSingleFeature(team.id, featureKey);

    if (!featureCheck.hasAccess) {
      if (featureCheck.reason?.includes('No active subscription')) {
        throw new TRPCError({
          code: 'PAYMENT_REQUIRED',
          message: 'No active subscription found. Please subscribe to access this feature.',
        });
      }

      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: `This feature is not included in your plan. Feature: ${featureKey}`,
        cause: { featureKey, reason: featureCheck.reason },
      });
    }

    return next();
  });

/**
 * Check if platform is set up
 * Use this after feature check to verify the platform connection exists
 */
export async function checkPlatformSetup(
  teamId: string,
  platform: 'google' | 'facebook' | 'instagram' | 'tiktok' | 'booking' | 'tripadvisor'
): Promise<void> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      googleBusinessProfile: platform === 'google',
      facebookBusinessProfile: platform === 'facebook',
      instagramBusinessProfile: platform === 'instagram',
      tiktokBusinessProfile: platform === 'tiktok',
      bookingBusinessProfile: platform === 'booking',
      tripAdvisorBusinessProfile: platform === 'tripadvisor',
    },
  });

  if (!team) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Team not found',
    });
  }

  const profileKey = `${platform}BusinessProfile` as keyof typeof team;
  if (!team[profileKey]) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `${platform.charAt(0).toUpperCase() + platform.slice(1)} account not connected. Please connect your account first.`,
      cause: { platform, setup: false },
    });
  }
}

