/**
 * Market Identifier Service - Prisma Implementation
 */

import { prisma } from "@wirecrest/db";
import { MarketPlatform } from "@prisma/client";
import {
  marketIdentifierEvents,
  MarketIdentifierChangeEvent,
} from "../events/marketIdentifierEvents";

export interface MarketIdentifier {
  id: string;
  locationId: string;
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
   * Update the market identifier for a location and platform
   * Triggers business setup workflow if identifier changes
   */
  async updateMarketIdentifier(
    locationId: string,
    platform: MarketPlatform,
    newIdentifier: string,
    forceUpdate: boolean = false,
  ): Promise<{
    success: boolean;
    message: string;
    triggeredWorkflow: boolean;
  }> {
    try {
      console.log(
        `🔍 MarketIdentifierService.updateMarketIdentifier called with:`,
        {
          locationId,
          platform,
          newIdentifier,
          forceUpdate,
        },
      );

      // Get existing identifier using Prisma
      console.log(`📋 Checking for existing market identifier...`);
      const existingIdentifier =
        await prisma.businessMarketIdentifier.findUnique({
          where: {
            locationId_platform: {
              locationId,
              platform,
            },
          },
        });

      console.log(`📊 Existing identifier check result:`, {
        found: !!existingIdentifier,
        existing: existingIdentifier,
      });

      // Check if identifier actually changed (unless forced)
      if (
        existingIdentifier &&
        existingIdentifier.identifier === newIdentifier &&
        !forceUpdate
      ) {
        console.log(`📝 Comparison details:`, {
          existingIdentifier: existingIdentifier.identifier,
          newIdentifier: newIdentifier,
          areEqual: existingIdentifier.identifier === newIdentifier,
          forceUpdate: forceUpdate,
        });
        console.log(`✅ Market identifier unchanged, returning early`);
        return {
          success: true,
          message: "Market identifier unchanged",
          triggeredWorkflow: false,
        };
      }

      if (
        forceUpdate &&
        existingIdentifier &&
        existingIdentifier.identifier === newIdentifier
      ) {
        console.log(
          `🔄 Force update requested - proceeding despite identical identifier`,
        );
      }

      // Get location info to retrieve teamId for events
      const location = await prisma.businessLocation.findUnique({
        where: { id: locationId },
        select: { teamId: true },
      });

      if (!location) {
        throw new Error(`Location ${locationId} not found`);
      }

      // Update or create the identifier
      console.log(`🔄 Upserting market identifier...`);
      console.log(`📤 Upserting market identifier using Prisma`);

      const upsertedData = await prisma.businessMarketIdentifier.upsert({
        where: {
          locationId_platform: {
            locationId,
            platform,
          },
        },
        update: {
          identifier: newIdentifier,
          updatedAt: new Date(),
        },
        create: {
          locationId,
          platform,
          identifier: newIdentifier,
        },
      });

      console.log(`✅ Market identifier upserted successfully:`, upsertedData);

      // Emit the market identifier change event (keeping teamId for backward compatibility)
      const changeEvent: MarketIdentifierChangeEvent = {
        teamId: location.teamId,
        platform,
        oldIdentifier: existingIdentifier?.identifier,
        newIdentifier,
        timestamp: new Date(),
      };

      console.log(`📡 Emitting market identifier change event:`, changeEvent);
      marketIdentifierEvents.emitIdentifierChange(changeEvent);

      const result = {
        success: true,
        message: existingIdentifier
          ? "Market identifier updated"
          : "Market identifier created",
        triggeredWorkflow: true,
      };

      console.log(
        `🎉 MarketIdentifierService.updateMarketIdentifier completed:`,
        result,
      );
      return result;
    } catch (error) {
      console.error(
        "❌ Error in MarketIdentifierService.updateMarketIdentifier:",
        error,
      );
      throw error;
    }
  }

  /**
   * Get market identifier for a location and platform
   */
  async getMarketIdentifier(
    locationId: string,
    platform: MarketPlatform,
  ): Promise<MarketIdentifier | null> {
    try {
      const data = await prisma.businessMarketIdentifier.findUnique({
        where: {
          locationId_platform: {
            locationId,
            platform,
          },
        },
      });

      return data || null;
    } catch (error) {
      console.error("Error getting market identifier:", error);
      return null;
    }
  }

  /**
   * Get all market identifiers for a location
   */
  async getLocationMarketIdentifiers(locationId: string): Promise<MarketIdentifier[]> {
    try {
      const data = await prisma.businessMarketIdentifier.findMany({
        where: { locationId },
        orderBy: [{ platform: "asc" }, { updatedAt: "desc" }],
      });

      return data || [];
    } catch (error) {
      console.error("Error getting location market identifiers:", error);
      return [];
    }
  }

  /**
   * Get all market identifiers for all locations in a team
   */
  async getTeamMarketIdentifiers(teamId: string): Promise<MarketIdentifier[]> {
    try {
      const data = await prisma.businessMarketIdentifier.findMany({
        where: {
          location: {
            teamId,
          },
        },
        orderBy: [{ platform: "asc" }, { updatedAt: "desc" }],
      });

      return data || [];
    } catch (error) {
      console.error("Error getting team market identifiers:", error);
      return [];
    }
  }

  /**
   * Delete market identifier and trigger cleanup
   */
  async deleteMarketIdentifier(
    locationId: string,
    platform: MarketPlatform,
  ): Promise<boolean> {
    try {
      // Get existing identifier and location info before deletion
      const existingIdentifier =
        await prisma.businessMarketIdentifier.findUnique({
          where: {
            locationId_platform: {
              locationId,
              platform,
            },
          },
          include: {
            location: {
              select: { teamId: true },
            },
          },
        });

      if (!existingIdentifier) {
        return false;
      }

      // Delete the identifier using Prisma
      await prisma.businessMarketIdentifier.delete({
        where: {
          locationId_platform: {
            locationId,
            platform,
          },
        },
      });

      // Emit cleanup event (this will trigger data cleanup)
      marketIdentifierEvents.emitDataCleanup({
        teamId: existingIdentifier.location.teamId,
        platform,
        oldIdentifier: existingIdentifier.identifier,
        status: "started",
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      console.error("Error deleting market identifier:", error);
      throw error;
    }
  }

  async close(): Promise<void> {
    // Supabase client doesn't need explicit closing
  }
}
