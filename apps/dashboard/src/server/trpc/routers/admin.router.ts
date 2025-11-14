/**
 * Admin Router
 * 
 * tRPC router for superadmin operations:
 * - Market identifier management
 * - Platform action execution
 * - Platform status checking
 * - Tenant details
 * 
 * All procedures require ADMIN super role.
 */

import { TRPCError } from '@trpc/server';
import { prisma } from '@wirecrest/db';
import type { PlatformType, MarketPlatform } from '@prisma/client';

import { router, superAdminProcedure } from '../trpc';
import {
  marketIdentifierSchema,
  deleteMarketIdentifierSchema,
  executePlatformActionSchema,
  marketIdentifierEnhancedSchema,
  deletePlatformDataSchema,
  tenantDetailsSchema,
  platformStatusSchema,
  instagramControlSchema,
} from '../schemas/admin.schema';
import { RealtimeBroadcaster } from 'src/lib/realtime';
import env from 'src/lib/env';

// Import the server actions for complex logic
import {
  createOrUpdateMarketIdentifier as _createOrUpdateMarketIdentifier,
  deleteMarketIdentifier as _deleteMarketIdentifier,
  executePlatformAction as _executePlatformAction,
  createOrUpdateMarketIdentifierEnhanced as _createOrUpdateMarketIdentifierEnhanced,
  deletePlatformData as _deletePlatformData,
  getTenantDetails as _getTenantDetails,
  checkPlatformStatus as _checkPlatformStatus,
  executeInstagramControl as _executeInstagramControl,
} from 'src/actions/admin';

/**
 * Admin Router
 */
export const adminRouter = router({
  /**
   * Check if current user is super admin
   */
  checkSuperAdminStatus: superAdminProcedure.query(async ({ ctx }) => {
    // If this procedure is called and passes the middleware, user is super admin
    return { isSuperAdmin: true };
  }),

  /**
   * Create or update market identifier
   */
  createOrUpdateMarketIdentifier: superAdminProcedure
    .input(marketIdentifierSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await _createOrUpdateMarketIdentifier({
          teamId: input.teamId,
          platform: input.platform,
          identifier: input.identifier,
        });
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create or update market identifier',
        });
      }
    }),

  /**
   * Delete market identifier
   */
  deleteMarketIdentifier: superAdminProcedure
    .input(deleteMarketIdentifierSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await _deleteMarketIdentifier({
          teamId: input.teamId,
          platform: input.platform,
        });
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to delete market identifier',
        });
      }
    }),

  /**
   * Execute platform action (verify, scrape, integrate)
   */
  executePlatformAction: superAdminProcedure
    .input(executePlatformActionSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await _executePlatformAction({
          teamId: input.teamId,
          platform: input.platform,
          action: input.action,
          metadata: input.metadata,
        });
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to execute platform action',
        });
      }
    }),

  /**
   * Create or update market identifier (enhanced version with auto-verify)
   */
  createOrUpdateMarketIdentifierEnhanced: superAdminProcedure
    .input(marketIdentifierEnhancedSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await _createOrUpdateMarketIdentifierEnhanced({
          teamId: input.teamId,
          platform: input.platform,
          identifier: input.identifier,
          autoVerify: input.autoVerify,
        });
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create or update market identifier (enhanced)',
        });
      }
    }),

  /**
   * Delete all platform data for a team
   */
  deletePlatformData: superAdminProcedure
    .input(deletePlatformDataSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await _deletePlatformData({
          teamId: input.teamId,
          platform: input.platform,
        });
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to delete platform data',
        });
      }
    }),

  /**
   * Get comprehensive tenant details
   */
  getTenantDetails: superAdminProcedure
    .input(tenantDetailsSchema)
    .query(async ({ input }) => {
      try {
        const result = await _getTenantDetails(input.tenantId);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get tenant details',
        });
      }
    }),

  /**
   * Check platform status for a team
   */
  checkPlatformStatus: superAdminProcedure
    .input(platformStatusSchema)
    .query(async ({ input }) => {
      try {
        const result = await _checkPlatformStatus({
          teamId: input.teamId,
          platform: input.platform,
        });
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to check platform status',
        });
      }
    }),

  /**
   * Execute Instagram control actions
   */
  executeInstagramControl: superAdminProcedure
    .input(instagramControlSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await _executeInstagramControl({
          teamId: input.teamId,
          action: input.action,
          metadata: input.metadata,
        });
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to execute Instagram control',
        });
      }
    }),
});

