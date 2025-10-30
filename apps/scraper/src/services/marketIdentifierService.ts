/**
 * Market Identifier Service - Prisma Implementation
 */

import { prisma } from '@wirecrest/db';
import { MarketPlatform } from '@prisma/client';
import { marketIdentifierEvents, MarketIdentifierChangeEvent } from '../events/marketIdentifierEvents';

export interface MarketIdentifier {
  id: string;
  teamId: string;
  platform: MarketPlatform;
  identifier: string;
  createdAt: Date;
  updatedAt: Date;
}

export class MarketIdentifierService {
  constructor() {
    console.log(`✅ MarketIdentifierService initialized with Prisma`);
  }

  /**
   * Update the market identifier for a team and platform
   * Triggers business setup workflow if identifier changes
   */
  async updateMarketIdentifier(
    teamId: string,
    platform: MarketPlatform,
    newIdentifier: string,
    forceUpdate: boolean = false
  ): Promise<{ success: boolean; message: string; triggeredWorkflow: boolean }> {
    try {
      console.log(`🔍 MarketIdentifierService.updateMarketIdentifier called with:`, {
        teamId,
        platform,
        newIdentifier,
        forceUpdate
      });

      // Get existing identifier using Prisma
      console.log(`📋 Checking for existing market identifier...`);
      const existingIdentifier = await prisma.businessMarketIdentifier.findUnique({
        where: {
          teamId_platform: {
            teamId,
            platform
          }
        }
      });

      console.log(`📊 Existing identifier check result:`, {
        found: !!existingIdentifier,
        existing: existingIdentifier
      });

      // Check if identifier actually changed (unless forced)
      if (existingIdentifier && existingIdentifier.identifier === newIdentifier && !forceUpdate) {
        console.log(`📝 Comparison details:`, {
          existingIdentifier: existingIdentifier.identifier,
          newIdentifier: newIdentifier,
          areEqual: existingIdentifier.identifier === newIdentifier,
          forceUpdate: forceUpdate
        });
        console.log(`✅ Market identifier unchanged, returning early`);
        return {
          success: true,
          message: 'Market identifier unchanged',
          triggeredWorkflow: false
        };
      }

      if (forceUpdate && existingIdentifier && existingIdentifier.identifier === newIdentifier) {
        console.log(`🔄 Force update requested - proceeding despite identical identifier`);
      }

      // Update or create the identifier
      console.log(`🔄 Upserting market identifier...`);
      console.log(`📤 Upserting market identifier using Prisma`);
      
      const upsertedData = await prisma.businessMarketIdentifier.upsert({
        where: {
          teamId_platform: {
            teamId,
            platform
          }
        },
        update: {
          identifier: newIdentifier,
          updatedAt: new Date()
        },
        create: {
          teamId,
          platform,
          identifier: newIdentifier
        }
      });

      console.log(`✅ Market identifier upserted successfully:`, upsertedData);

      // Emit the market identifier change event
      const changeEvent: MarketIdentifierChangeEvent = {
        teamId,
        platform,
        oldIdentifier: existingIdentifier?.identifier,
        newIdentifier,
        timestamp: new Date()
      };

      console.log(`📡 Emitting market identifier change event:`, changeEvent);
      marketIdentifierEvents.emitIdentifierChange(changeEvent);

      const result = {
        success: true,
        message: existingIdentifier ? 'Market identifier updated' : 'Market identifier created',
        triggeredWorkflow: true
      };

      console.log(`🎉 MarketIdentifierService.updateMarketIdentifier completed:`, result);
      return result;

    } catch (error) {
      console.error('❌ Error in MarketIdentifierService.updateMarketIdentifier:', error);
      throw error;
    }
  }

  /**
   * Get market identifier for a team and platform
   */
  async getMarketIdentifier(teamId: string, platform: MarketPlatform): Promise<MarketIdentifier | null> {
    try {
      const data = await prisma.businessMarketIdentifier.findUnique({
        where: {
          teamId_platform: {
            teamId,
            platform
          }
        }
      });

      return data || null;
    } catch (error) {
      console.error('Error getting market identifier:', error);
      return null;
    }
  }

  /**
   * Get all market identifiers for a team
   */
  async getTeamMarketIdentifiers(teamId: string): Promise<MarketIdentifier[]> {
    try {
      const data = await prisma.businessMarketIdentifier.findMany({
        where: { teamId },
        orderBy: [
          { platform: 'asc' },
          { updatedAt: 'desc' }
        ]
      });

      return data || [];
    } catch (error) {
      console.error('Error getting team market identifiers:', error);
      return [];
    }
  }

  /**
   * Delete market identifier and trigger cleanup
   */
  async deleteMarketIdentifier(teamId: string, platform: MarketPlatform): Promise<boolean> {
    try {
      // Get existing identifier before deletion
      const existingIdentifier = await prisma.businessMarketIdentifier.findUnique({
        where: {
          teamId_platform: {
            teamId,
            platform
          }
        }
      });

      if (!existingIdentifier) {
        return false;
      }

      // Delete the identifier using Prisma
      await prisma.businessMarketIdentifier.delete({
        where: {
          teamId_platform: {
            teamId,
            platform
          }
        }
      });

      // Emit cleanup event (this will trigger data cleanup)
      marketIdentifierEvents.emitDataCleanup({
        teamId,
        platform,
        oldIdentifier: existingIdentifier.identifier,
        status: 'started',
        timestamp: new Date()
      });

      return true;

    } catch (error) {
      console.error('Error deleting market identifier:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    // Supabase client doesn't need explicit closing
  }
} 