import { prisma } from '@wirecrest/db';
import { MarketPlatform, BusinessMarketIdentifier } from '@prisma/client';

// Helper function to delete Google Business Profile when identifier changes
const deleteAssociatedGoogleProfile = async (locationId: string, oldIdentifier?: string) => {
  if (!oldIdentifier) return;

  try {
    // Find the Google Business Profile associated with the old identifier
    const existingProfile = await prisma.googleBusinessProfile.findFirst({
      where: {
        locationId,
        placeId: oldIdentifier,
      },
    });

    if (existingProfile) {
      console.log(`Deleting Google Business Profile for old identifier: ${oldIdentifier}`);

      // Delete the profile - Prisma will handle cascading deletes for related data
      await prisma.googleBusinessProfile.delete({
        where: {
          id: existingProfile.id,
        },
      });

      console.log(`Successfully deleted Google Business Profile: ${existingProfile.id}`);
    }
  } catch (error) {
    console.error('Error deleting associated Google Business Profile:', error);
    // Don't throw here to avoid breaking the identifier update
  }
};

export const createBusinessMarketIdentifier = async (
  identifier: Omit<BusinessMarketIdentifier, 'id' | 'createdAt' | 'updatedAt' | 'locationId'>,
  locationId: string,
  platform: MarketPlatform
) => {
  // Get location to retrieve teamId for webhook notification
  const location = await prisma.businessLocation.findUnique({
    where: { id: locationId },
    select: { teamId: true },
  });

  if (!location) {
    throw new Error('Location not found');
  }

  // First check if there's an existing market identifier for this location and platform
  const existingIdentifier = await prisma.businessMarketIdentifier.findUnique({
    where: {
      locationId_platform: {
        locationId,
        platform,
      },
    },
  });

  // If it exists and has an identifier, update it
  if (existingIdentifier && existingIdentifier.identifier) {
    // If this is a Google Maps identifier and it's changing, delete the old profile
    if (
      platform === MarketPlatform.GOOGLE_MAPS &&
      existingIdentifier.identifier !== identifier.identifier
    ) {
      await deleteAssociatedGoogleProfile(locationId, existingIdentifier.identifier);
    }

    const result = await prisma.businessMarketIdentifier.update({
      where: {
        locationId_platform: {
          locationId,
          platform,
        },
      },
      data: {
        identifier: identifier.identifier,
      },
    });

    // Notify scraper service about platform configuration
    await notifyScraperPlatformConfigured(location.teamId, locationId, platform, identifier.identifier);

    return result;
  }

  // If it doesn't exist or doesn't have an identifier, create/upsert it
  const result = await prisma.businessMarketIdentifier.upsert({
    create: {
      ...identifier,
      locationId,
      platform,
    },
    update: identifier,
    where: {
      locationId_platform: {
        locationId,
        platform,
      },
    },
  });

  // Notify scraper service about platform configuration
  await notifyScraperPlatformConfigured(location.teamId, locationId, platform, identifier.identifier);

  return result;
};

/**
 * Notify scraper service when a platform is configured
 * This triggers initial scraping for the platform
 */
async function notifyScraperPlatformConfigured(
  teamId: string,
  locationId: string,
  platform: MarketPlatform,
  identifier: string
): Promise<void> {
  try {
    const scraperUrl = process.env.SCRAPER_API_URL || 'http://localhost:3001';
    
    console.log(`🔔 Notifying scraper about ${platform} configuration for location ${locationId} (team ${teamId})`);
    
    const response = await fetch(`${scraperUrl}/api/webhooks/platform-configured`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId,
        locationId,
        platform,
        identifier,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to notify scraper: ${response.status} ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log(`✅ Scraper notified successfully:`, result);
  } catch (error) {
    console.error('Error notifying scraper:', error);
    // Don't fail the operation if webhook fails - scraping can be triggered manually
  }
}

export const getBusinessMarketIdentifier = async (locationId: string, platform: MarketPlatform) => await prisma.businessMarketIdentifier.findUnique({
    where: {
      locationId_platform: {
        locationId,
        platform,
      },
    },
  });

export const getAllBusinessMarketIdentifiers = async (locationId: string) => await prisma.businessMarketIdentifier.findMany({
    where: {
      locationId,
    },
  });
