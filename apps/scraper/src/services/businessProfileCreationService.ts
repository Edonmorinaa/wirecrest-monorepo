/**
 * LEGACY FILE - For reference only
 * Contains legacy business profile creation logic
 */

import { ApifyClient } from "apify-client";
import { MarketPlatform, BusinessStatus, PriceLevel } from "@prisma/client";
import type {
  GooglePlaceV1,
  GooglePlaceV1OpeningHours,
  GooglePlaceV1OpeningHoursPeriod,
  GooglePlaceV1OpeningHoursPeriodPoint,
  GooglePlaceV1Photo,
  GooglePlaceV1AddressComponent,
} from "../supabase/models.js";
import { marketIdentifierEvents } from "../events/marketIdentifierEvents";
import { randomUUID } from "crypto";
import { prisma } from "@wirecrest/db";
import type { Prisma } from "@prisma/client";

export class BusinessProfileCreationService {
  private apifyClient: ApifyClient;
  private googleApiKey: string;

  constructor(apifyToken: string) {
    this.apifyClient = new ApifyClient({ token: apifyToken });
    this.googleApiKey = process.env.GOOGLE_API_KEY!;
    if (!this.googleApiKey) {
      console.warn(
        "[WARN] Google API Key not provided to BusinessProfileCreationService. Google profile creation will likely fail.",
      );
    }
  }

  /**
   * Ensure business profile exists - create if missing, return existing if found
   * This is the main entry point for all profile creation
   */
  async ensureBusinessProfileExists(
    teamId: string,
    locationId: string,
    platform: MarketPlatform,
    identifier: string,
  ): Promise<{
    exists: boolean;
    businessProfileId?: string;
    created?: boolean;
    error?: string;
  }> {
    try {
      // Check if profile already exists
      const profileId = await this.getExistingProfileId(
        teamId,
        locationId,
        platform,
        identifier,
      );

      if (profileId) {
        console.log(`✓ Business profile already exists: ${profileId}`);
        return { exists: true, businessProfileId: profileId, created: false };
      }

      // Profile doesn't exist - create it
      console.log(
        `Creating new business profile for location ${locationId}, platform ${platform}`,
      );
      const result = await this.createBusinessProfile(
        teamId,
        locationId,
        platform,
        identifier,
      );

      return {
        exists: result.success,
        businessProfileId: result.businessProfileId,
        created: result.success,
        error: result.error,
      };
    } catch (error) {
      console.error("Error in ensureBusinessProfileExists:", error);
      return {
        exists: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check for URL conflicts with other locations
   * Always returns null to trigger profile upsert flow
   * Throws error if URL is used by a different location (conflict)
   */
  private async getExistingProfileId(
    teamId: string,
    locationId: string,
    platform: MarketPlatform,
    identifier: string,
  ): Promise<string | null> {
    try {
      switch (platform) {
        case MarketPlatform.GOOGLE_MAPS:
          // Google Place IDs are not globally unique per location
          // Always trigger upsert to refresh data
          return null;

        case MarketPlatform.FACEBOOK:
          // Check if URL is used by a different team
          const facebookConflict = await prisma.facebookBusinessProfile.findFirst({
            where: {
              facebookUrl: identifier,
              businessLocation: { teamId: { not: teamId } },
            },
            select: { id: true, businessLocation: { select: { teamId: true } } },
          });

          if (facebookConflict) {
            throw new Error(
              `Facebook URL ${identifier} is already registered to another team (${facebookConflict.businessLocation?.teamId})`,
            );
          }

          // Always trigger upsert to refresh data
          return null;

        case MarketPlatform.TRIPADVISOR:
          // Check if this URL is already used by another team (tripAdvisorUrl is globally unique)
          const tripAdvisorConflict = await prisma.tripAdvisorBusinessProfile.findFirst(
            {
              where: {
                tripAdvisorUrl: identifier,
                businessLocation: { teamId: { not: teamId } },
              },
              select: { id: true, businessLocation: { select: { teamId: true } } },
            },
          );

          if (tripAdvisorConflict) {
            throw new Error(
              `TripAdvisor URL ${identifier} is already registered to another team (${tripAdvisorConflict.businessLocation?.teamId})`,
            );
          }

          // Always trigger upsert to refresh data
          return null;

        case MarketPlatform.BOOKING:
          // Check if URL is used by a different team
          const bookingConflict = await prisma.bookingBusinessProfile.findFirst({
            where: {
              bookingUrl: identifier,
              businessLocation: { teamId: { not: teamId } },
            },
            select: { id: true, businessLocation: { select: { teamId: true } } },
          });

          if (bookingConflict) {
            throw new Error(
              `Booking URL ${identifier} is already registered to another team (${bookingConflict.businessLocation?.teamId})`,
            );
          }

          // Always trigger upsert to refresh data
          return null;

        default:
          return null;
      }
    } catch (error) {
      // Re-throw errors to be handled by caller
      throw error;
    }
  }

  /**
   * Update business creation task progress with real-time updates
   */
  private async updateTaskProgress(
    teamId: string,
    platform: string,
    step: string,
    status: "IN_PROGRESS" | "COMPLETED" | "FAILED",
    message: string,
    progressPercent: number,
  ): Promise<void> {
    try {
      const platformType = this.marketPlatformToPlatformType(platform);

      // Update task progress
      await prisma.businessCreationTask.updateMany({
        where: {
          teamId,
          platform: platformType as any,
          status: { in: ["IN_PROGRESS", "PENDING"] },
        },
        data: {
          currentStep: step as any,
          status: status as any,
          lastActivityAt: new Date(),
          progressPercent,
        },
      });

      // Create status message for realtime updates
      const task = await prisma.businessCreationTask.findFirst({
        where: { teamId, platform: platformType as any },
        orderBy: { createdAt: "desc" },
      });

      if (task) {
        await prisma.businessStatusMessage.create({
          data: {
            businessCreationId: task.id,
            step: step as any,
            status: status as any,
            message,
            messageType:
              status === "FAILED"
                ? "error"
                : status === "COMPLETED"
                  ? "success"
                  : "info",
          },
        });
      }
    } catch (error) {
      console.error("Error updating task progress:", error);
      // Don't throw - progress tracking shouldn't break profile creation
    }
  }

  /**
   * Map MarketPlatform enum to PlatformType enum
   */
  private marketPlatformToPlatformType(platform: string): string {
    const upperPlatform = platform.toUpperCase();

    if (upperPlatform.includes("GOOGLE")) return "GOOGLE";
    if (upperPlatform.includes("FACEBOOK")) return "FACEBOOK";
    if (upperPlatform.includes("TRIPADVISOR")) return "TRIPADVISOR";
    if (upperPlatform.includes("BOOKING")) return "BOOKING";

    return "GOOGLE"; // Default fallback
  }

  /**
   * Create business profile based on platform and identifier
   */
  async createBusinessProfile(
    teamId: string,
    locationId: string,
    platform: MarketPlatform,
    identifier: string,
  ): Promise<{ success: boolean; businessProfileId?: string; error?: string }> {
    try {
      if (platform === MarketPlatform.GOOGLE_MAPS) {
        return await this.createGoogleBusinessProfileWithPlacesAPI(
          teamId,
          locationId,
          identifier,
        );
      } else if (platform === MarketPlatform.FACEBOOK) {
        return await this.createFacebookBusinessProfileWithApify(
          teamId,
          locationId,
          identifier,
        );
      } else if (platform === MarketPlatform.TRIPADVISOR) {
        return await this.createTripAdvisorBusinessProfileWithApify(
          teamId,
          locationId,
          identifier,
        );
      } else if (platform === MarketPlatform.BOOKING) {
        return await this.createBookingBusinessProfileWithApify(
          teamId,
          locationId,
          identifier,
        );
      } else {
        return {
          success: false,
          error: `Platform ${platform} not supported yet`,
        };
      }
    } catch (error) {
      console.error("Error creating business profile:", {
        teamId,
        locationId,
        platform,
        identifier,
        error,
      });
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Create Google Business Profile using Google Places API (HTTP Endpoint)
   */
  private async createGoogleBusinessProfileWithPlacesAPI(
    teamId: string,
    locationId: string,
    placeId: string,
  ): Promise<{ success: boolean; businessProfileId?: string; error?: string }> {
    if (!this.googleApiKey) {
      return {
        success: false,
        error: "Google API Key is not configured for Places API call.",
      };
    }
    try {
      // Update progress: Starting
      await this.updateTaskProgress(
        teamId,
        "GOOGLE_MAPS",
        "CREATING_PROFILE",
        "IN_PROGRESS",
        "Checking for existing Google business profile...",
        10,
      );

      console.log(
        `[Google Places HTTP API] Checking existing profile for location: ${locationId}`,
      );

      // Check if location already has a Google business profile (one-to-one relationship)
      const existingBusiness = await prisma.googleBusinessProfile.findUnique({
        where: { locationId },
        select: { id: true, placeId: true },
      });

      if (existingBusiness && existingBusiness.placeId !== placeId) {
        // Location already has a different Google business profile
        return {
          success: false,
          error: `Location already has a Google business profile for a different place. Each location can only have one Google business profile.`,
        };
      }

      console.log(
        `[Google Places HTTP API] ${existingBusiness ? 'Updating' : 'Creating'} profile for location ${locationId}`,
      );

      // Update progress: Fetching from Google
      await this.updateTaskProgress(
        teamId,
        "GOOGLE_MAPS",
        "CREATING_PROFILE",
        "IN_PROGRESS",
        "Fetching business details from Google Places API...",
        25,
      );

      console.log(
        `[Google Places HTTP API] Fetching details for placeId: ${placeId}`,
      );
      const fieldMask = [
        "id",
        "displayName",
        "formattedAddress",
        "shortFormattedAddress",
        "addressComponents",
        "plusCode",
        "location",
        "utcOffsetMinutes",
        "adrFormatAddress",
        "internationalPhoneNumber",
        "nationalPhoneNumber",
        "websiteUri",
        "types",
        "primaryType",
        "primaryTypeDisplayName",
        "rating",
        "userRatingCount",
        "priceLevel",
        "businessStatus",
        "regularOpeningHours",
        "currentOpeningHours",
        "allowsDogs",
        "goodForChildren",
        "goodForGroups",
        "goodForWatchingSports",
        "liveMusic",
        "servesBeer",
        "servesBreakfast",
        "servesBrunch",
        "servesDinner",
        "servesLunch",
        "servesVegetarianFood",
        "servesWine",
        "reservable",
        "curbsidePickup",
        "delivery",
        "dineIn",
        "takeout",
        "accessibilityOptions",
        "parkingOptions",
        "paymentOptions",
        "photos",
      ].join(",");

      const url = `https://places.googleapis.com/v1/places/${placeId}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.googleApiKey,
          "X-Goog-FieldMask": fieldMask,
        },
      });

      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({ message: response.statusText }))) as any;
        console.error(
          "[Google Places HTTP API] Error fetching place details:",
          response.status,
          errorData,
        );
        return {
          success: false,
          error: `Failed to fetch Google Place details: ${response.status} - ${errorData.error?.message || errorData.message || "Unknown API error"}`,
        };
      }

      const placeData = (await response.json()) as GooglePlaceV1;
      console.log(
        `[Google Places HTTP API] Successfully fetched details for: ${placeData.displayName?.text}`,
      );

      // Update progress: Saving to database
      await this.updateTaskProgress(
        teamId,
        "GOOGLE_MAPS",
        "CREATING_PROFILE",
        "IN_PROGRESS",
        "Saving business profile to database...",
        50,
      );

      // If updating existing profile, clear nested relations first using cascading delete
      if (existingBusiness) {
        // Delete nested relations by deleting via the parent profile update
        // This will cascade delete all related categories, addressComponents, photos, and location
        await prisma.googleBusinessProfile.update({
          where: { id: existingBusiness.id },
          data: {
            categories: { deleteMany: {} },
            addressComponents: { deleteMany: {} },
            photos: { deleteMany: {} },
            location: { delete: true }, // One-to-one relationship uses 'delete: true'
          },
        });
      }

      // Upsert the business profile with fresh data from Google
      const businessProfile = await prisma.googleBusinessProfile.upsert({
        where: { locationId },
        create: {
          locationId,
          placeId: placeData.id || placeId,
          displayName: placeData.displayName?.text,
          displayNameLanguageCode: placeData.displayName?.languageCode,
          formattedAddress: placeData.formattedAddress,
          shortFormattedAddress: placeData.shortFormattedAddress,
          plusCode: placeData.plusCode
            ? (placeData.plusCode as unknown as Prisma.InputJsonValue)
            : null,
          businessStatus: placeData.businessStatus
            ? this.mapBusinessStatus(placeData.businessStatus)
            : null,
          types: placeData.types || [],
          primaryType: placeData.primaryType,
          primaryTypeDisplayName: placeData.primaryTypeDisplayName?.text,
          primaryTypeDisplayNameLanguageCode:
            placeData.primaryTypeDisplayName?.languageCode,
          nationalPhoneNumber: placeData.nationalPhoneNumber,
          internationalPhoneNumber: placeData.internationalPhoneNumber,
          websiteUri: placeData.websiteUri,
          rating: placeData.rating,
          userRatingCount: placeData.userRatingCount,
          priceLevel: placeData.priceLevel
            ? this.mapPriceLevelStrToEnum(placeData.priceLevel)
            : null,
          utcOffsetMinutes: placeData.utcOffsetMinutes,
          adrFormatAddress: placeData.adrFormatAddress,

          // Boolean service options mapped to enums
          allowsDogs: placeData.allowsDogs || false,
          curbsidePickup: placeData.curbsidePickup
            ? "CURBSIDE_PICKUP_AVAILABLE"
            : "NO_CURBSIDE_PICKUP",
          delivery: placeData.delivery ? "DELIVERY_AVAILABLE" : "NO_DELIVERY",
          dineIn: placeData.dineIn ? "DINE_IN_AVAILABLE" : "NO_DINE_IN",
          reservable: placeData.reservable ? "RESERVABLE" : "NOT_RESERVABLE",
          servesBeer: placeData.servesBeer ? "SERVES_BEER" : "NO_BEER",
          servesBreakfast: placeData.servesBreakfast
            ? "SERVES_BREAKFAST"
            : "NO_BREAKFAST",
          servesBrunch: placeData.servesBrunch ? "SERVES_BRUNCH" : "NO_BRUNCH",
          servesDinner: placeData.servesDinner ? "SERVES_DINNER" : "NO_DINNER",
          servesLunch: placeData.servesLunch ? "SERVES_LUNCH" : "NO_LUNCH",
          servesVegetarianFood: placeData.servesVegetarianFood
            ? "SERVES_VEGETARIAN_FOOD"
            : "NO_VEGETARIAN_FOOD",
          servesWine: placeData.servesWine ? "SERVES_WINE" : "NO_WINE",
          takeout: placeData.takeout ? "TAKEOUT_AVAILABLE" : "NO_TAKEOUT",
          goodForChildren: placeData.goodForChildren || false,
          goodForGroups: placeData.goodForGroups || false,
          goodForWatchingSports: placeData.goodForWatchingSports || false,
          liveMusic: placeData.liveMusic || false,

          // JSON fields
          accessibilityOptions: placeData.accessibilityOptions
            ? (placeData.accessibilityOptions as unknown as Prisma.InputJsonValue)
            : null,
          parkingOptions: placeData.parkingOptions
            ? (placeData.parkingOptions as unknown as Prisma.InputJsonValue)
            : null,
          paymentOptions: placeData.paymentOptions
            ? (placeData.paymentOptions as unknown as Prisma.InputJsonValue)
            : null,

          // Related data - create nested
          location: placeData.location
            ? {
                create: {
                  lat: placeData.location.latitude,
                  lng: placeData.location.longitude,
                },
              }
            : undefined,

          categories:
            placeData.types && placeData.types.length > 0
              ? {
                  create: placeData.types.map((type: string) => ({
                    name: type,
                  })),
                }
              : undefined,

          addressComponents:
            placeData.addressComponents &&
            placeData.addressComponents.length > 0
              ? {
                  create: placeData.addressComponents.map((ac) => ({
                    longText: ac.longText,
                    shortText: ac.shortText,
                    types: ac.types,
                    languageCode: ac.languageCode,
                  })),
                }
              : undefined,

          photos:
            placeData.photos && placeData.photos.length > 0
              ? {
                  create: placeData.photos.slice(0, 20).map((p) => ({
                    name: p.name,
                    widthPx: p.widthPx,
                    heightPx: p.heightPx,
                    authorAttributions: p.authorAttributions
                      ? (p.authorAttributions as unknown as Prisma.InputJsonValue)
                      : null,
                  })),
                }
              : undefined,

          metadata: {
            create: {
              updateFrequencyMinutes: 360, // Default 6 hours
              nextUpdateAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
              lastUpdateAt: new Date(),
              isActive: true,
            },
          },
        },
        update: {
          placeId: placeData.id || placeId,
          displayName: placeData.displayName?.text,
          displayNameLanguageCode: placeData.displayName?.languageCode,
          formattedAddress: placeData.formattedAddress,
          shortFormattedAddress: placeData.shortFormattedAddress,
          plusCode: placeData.plusCode
            ? (placeData.plusCode as unknown as Prisma.InputJsonValue)
            : null,
          businessStatus: placeData.businessStatus
            ? this.mapBusinessStatus(placeData.businessStatus)
            : null,
          types: placeData.types || [],
          primaryType: placeData.primaryType,
          primaryTypeDisplayName: placeData.primaryTypeDisplayName?.text,
          primaryTypeDisplayNameLanguageCode:
            placeData.primaryTypeDisplayName?.languageCode,
          nationalPhoneNumber: placeData.nationalPhoneNumber,
          internationalPhoneNumber: placeData.internationalPhoneNumber,
          websiteUri: placeData.websiteUri,
          rating: placeData.rating,
          userRatingCount: placeData.userRatingCount,
          priceLevel: placeData.priceLevel
            ? this.mapPriceLevelStrToEnum(placeData.priceLevel)
            : null,
          utcOffsetMinutes: placeData.utcOffsetMinutes,
          adrFormatAddress: placeData.adrFormatAddress,

          // Boolean service options mapped to enums
          allowsDogs: placeData.allowsDogs || false,
          curbsidePickup: placeData.curbsidePickup
            ? "CURBSIDE_PICKUP_AVAILABLE"
            : "NO_CURBSIDE_PICKUP",
          delivery: placeData.delivery ? "DELIVERY_AVAILABLE" : "NO_DELIVERY",
          dineIn: placeData.dineIn ? "DINE_IN_AVAILABLE" : "NO_DINE_IN",
          reservable: placeData.reservable ? "RESERVABLE" : "NOT_RESERVABLE",
          servesBeer: placeData.servesBeer ? "SERVES_BEER" : "NO_BEER",
          servesBreakfast: placeData.servesBreakfast
            ? "SERVES_BREAKFAST"
            : "NO_BREAKFAST",
          servesBrunch: placeData.servesBrunch ? "SERVES_BRUNCH" : "NO_BRUNCH",
          servesDinner: placeData.servesDinner ? "SERVES_DINNER" : "NO_DINNER",
          servesLunch: placeData.servesLunch ? "SERVES_LUNCH" : "NO_LUNCH",
          servesVegetarianFood: placeData.servesVegetarianFood
            ? "SERVES_VEGETARIAN_FOOD"
            : "NO_VEGETARIAN_FOOD",
          servesWine: placeData.servesWine ? "SERVES_WINE" : "NO_WINE",
          takeout: placeData.takeout ? "TAKEOUT_AVAILABLE" : "NO_TAKEOUT",
          goodForChildren: placeData.goodForChildren || false,
          goodForGroups: placeData.goodForGroups || false,
          goodForWatchingSports: placeData.goodForWatchingSports || false,
          liveMusic: placeData.liveMusic || false,

          // JSON fields
          accessibilityOptions: placeData.accessibilityOptions
            ? (placeData.accessibilityOptions as unknown as Prisma.InputJsonValue)
            : null,
          parkingOptions: placeData.parkingOptions
            ? (placeData.parkingOptions as unknown as Prisma.InputJsonValue)
            : null,
          paymentOptions: placeData.paymentOptions
            ? (placeData.paymentOptions as unknown as Prisma.InputJsonValue)
            : null,

          // Related data - create nested (already deleted old ones above)
          location: placeData.location
            ? {
                create: {
                  lat: placeData.location.latitude,
                  lng: placeData.location.longitude,
                },
              }
            : undefined,

          categories:
            placeData.types && placeData.types.length > 0
              ? {
                  create: placeData.types.map((type: string) => ({
                    name: type,
                  })),
                }
              : undefined,

          addressComponents:
            placeData.addressComponents &&
            placeData.addressComponents.length > 0
              ? {
                  create: placeData.addressComponents.map((ac) => ({
                    longText: ac.longText,
                    shortText: ac.shortText,
                    types: ac.types,
                    languageCode: ac.languageCode,
                  })),
                }
              : undefined,

          photos:
            placeData.photos && placeData.photos.length > 0
              ? {
                  create: placeData.photos.slice(0, 20).map((p) => ({
                    name: p.name,
                    widthPx: p.widthPx,
                    heightPx: p.heightPx,
                    authorAttributions: p.authorAttributions
                      ? (p.authorAttributions as unknown as Prisma.InputJsonValue)
                      : null,
                  })),
                }
              : undefined,

          metadata: existingBusiness
            ? {
                update: {
                  lastUpdateAt: new Date(),
                  nextUpdateAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
                },
              }
            : {
                create: {
                  updateFrequencyMinutes: 360,
                  nextUpdateAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
                  lastUpdateAt: new Date(),
                  isActive: true,
                },
              },
        },
      });

      console.log(
        `[Google Places HTTP API] Profile ${existingBusiness ? 'updated' : 'created'} with ID: ${businessProfile.id}`,
      );

      // Update progress: Complete
      await this.updateTaskProgress(
        teamId,
        "GOOGLE_MAPS",
        "CREATING_PROFILE",
        "COMPLETED",
        "Google business profile created successfully!",
        100,
      );

      // Emit event for business identifier created
      marketIdentifierEvents.emit("identifierCreated", {
        teamId,
        platform: MarketPlatform.GOOGLE_MAPS,
        identifier: placeId,
        businessProfileId: businessProfile.id,
      });

      return { success: true, businessProfileId: businessProfile.id };
    } catch (error) {
      console.error("[Google Places HTTP API] Error:", error);

      await this.updateTaskProgress(
        teamId,
        "GOOGLE_MAPS",
        "CREATING_PROFILE",
        "FAILED",
        `Failed to create Google business profile: ${error instanceof Error ? error.message : "Unknown error"}`,
        100,
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create Facebook Business Profile using Apify
   */
  private async createFacebookBusinessProfileWithApify(
    teamId: string,
    locationId: string,
    facebookUrl: string,
  ): Promise<{ success: boolean; businessProfileId?: string; error?: string }> {
    try {
      await this.updateTaskProgress(
        teamId,
        "FACEBOOK",
        "CREATING_PROFILE",
        "IN_PROGRESS",
        "Checking for existing Facebook business profile...",
        10,
      );

      // Check if team already has a Facebook business profile
      const existingBusiness = await prisma.facebookBusinessProfile.findUnique({
        where: { locationId },
        select: { id: true, facebookUrl: true },
      });

      if (existingBusiness && existingBusiness.facebookUrl !== facebookUrl) {
        return {
          success: false,
          error: `Team already has a Facebook business profile for a different page.`,
        };
      }

      console.log(
        `[Facebook Apify] ${existingBusiness ? 'Updating' : 'Creating'} profile for team ${teamId}`,
      );

      await this.updateTaskProgress(
        teamId,
        "FACEBOOK",
        "CREATING_PROFILE",
        "IN_PROGRESS",
        "Fetching business details from Facebook...",
        25,
      );

      // Use Apify to scrape the Facebook page
      const actorId =
        process.env.APIFY_FACEBOOK_PROFILE_ACTOR_ID || "4Hv5RhChiaDk6iwad"; // Facebook Pages Scraper (for profile)
      const input = {
        startUrls: [{ url: facebookUrl }],
      };

      const run = await this.apifyClient.actor(actorId).call(input);
      if (!run || !run.defaultDatasetId) {
        throw new Error("Failed to scrape Facebook page data");
      }

      const { items } = await this.apifyClient
        .dataset(run.defaultDatasetId)
        .listItems();
      if (!items || items.length === 0) {
        throw new Error("No data returned from Facebook scraper");
      }

      const pageData = items[0] as any;

      await this.updateTaskProgress(
        teamId,
        "FACEBOOK",
        "CREATING_PROFILE",
        "IN_PROGRESS",
        "Saving business profile to database...",
        50,
      );

      // Upsert Facebook business profile with fresh data
      const businessProfile = await prisma.facebookBusinessProfile.upsert({
        where: { locationId },
        create: {
          locationId,
          facebookUrl: facebookUrl,
          pageId: pageData.pageId || randomUUID(),
          facebookId: pageData.facebookId || pageData.pageId || randomUUID(),
          title: pageData.title || pageData.pageName || "Unknown",
          pageName: pageData.pageName || pageData.title || "Unknown",
          pageUrl: facebookUrl,
          categories: pageData.categories || [],
          info: pageData.info || [],
          likes: pageData.likes || 0,
          followers: pageData.followers || 0,
          messenger: pageData.messenger,
          priceRange: pageData.priceRange,
          intro: pageData.intro,
          websites: pageData.websites || [],
          phone: pageData.phone,
          email: pageData.email,
          profilePictureUrl: pageData.profilePictureUrl,
          coverPhotoUrl: pageData.coverPhotoUrl,
          profilePhoto: pageData.profilePhoto,
          creationDate: pageData.creationDate,
          adStatus: pageData.adStatus,
          aboutMe: pageData.aboutMe
            ? (pageData.aboutMe as unknown as Prisma.InputJsonValue)
            : null,
          pageAdLibrary: pageData.pageAdLibrary
            ? (pageData.pageAdLibrary as unknown as Prisma.InputJsonValue)
            : null,
          scrapedAt: new Date(),
          businessMetadata: {
            create: {
              updateFrequencyMinutes: 360,
              nextUpdateAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
              lastUpdateAt: new Date(),
              isActive: true,
            },
          },
        },
        update: {
          facebookUrl: facebookUrl,
          pageId: pageData.pageId || randomUUID(),
          facebookId: pageData.facebookId || pageData.pageId || randomUUID(),
          title: pageData.title || pageData.pageName || "Unknown",
          pageName: pageData.pageName || pageData.title || "Unknown",
          pageUrl: facebookUrl,
          categories: pageData.categories || [],
          info: pageData.info || [],
          likes: pageData.likes || 0,
          followers: pageData.followers || 0,
          messenger: pageData.messenger,
          priceRange: pageData.priceRange,
          intro: pageData.intro,
          websites: pageData.websites || [],
          phone: pageData.phone,
          email: pageData.email,
          profilePictureUrl: pageData.profilePictureUrl,
          coverPhotoUrl: pageData.coverPhotoUrl,
          profilePhoto: pageData.profilePhoto,
          creationDate: pageData.creationDate,
          adStatus: pageData.adStatus,
          aboutMe: pageData.aboutMe
            ? (pageData.aboutMe as unknown as Prisma.InputJsonValue)
            : null,
          pageAdLibrary: pageData.pageAdLibrary
            ? (pageData.pageAdLibrary as unknown as Prisma.InputJsonValue)
            : null,
          scrapedAt: new Date(),
          businessMetadata: existingBusiness
            ? {
                update: {
                  lastUpdateAt: new Date(),
                  nextUpdateAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
                },
              }
            : {
                create: {
                  updateFrequencyMinutes: 360,
                  nextUpdateAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
                  lastUpdateAt: new Date(),
                  isActive: true,
                },
              },
        },
      });

      await this.updateTaskProgress(
        teamId,
        "FACEBOOK",
        "CREATING_PROFILE",
        "COMPLETED",
        `Facebook business profile ${existingBusiness ? 'updated' : 'created'} successfully!`,
        100,
      );

      marketIdentifierEvents.emit("identifierCreated", {
        teamId,
        platform: MarketPlatform.FACEBOOK,
        identifier: facebookUrl,
        businessProfileId: businessProfile.id,
      });

      return { success: true, businessProfileId: businessProfile.id };
    } catch (error) {
      console.error("[Facebook Apify] Error:", error);

      await this.updateTaskProgress(
        teamId,
        "FACEBOOK",
        "CREATING_PROFILE",
        "FAILED",
        `Failed to create Facebook business profile: ${error instanceof Error ? error.message : "Unknown error"}`,
        100,
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create TripAdvisor Business Profile using Apify
   */
  private async createTripAdvisorBusinessProfileWithApify(
    teamId: string,
    locationId: string,
    tripAdvisorUrl: string,
  ): Promise<{ success: boolean; businessProfileId?: string; error?: string }> {
    try {
      await this.updateTaskProgress(
        teamId,
        "TRIPADVISOR",
        "CREATING_PROFILE",
        "IN_PROGRESS",
        "Checking for existing TripAdvisor business profile...",
        10,
      );

      // Check if team already has a TripAdvisor business profile
      const existingBusiness =
        await prisma.tripAdvisorBusinessProfile.findUnique({
          where: { locationId },
          select: { id: true, tripAdvisorUrl: true },
        });

      if (existingBusiness && existingBusiness.tripAdvisorUrl !== tripAdvisorUrl) {
        return {
          success: false,
          error: `Team already has a TripAdvisor business profile for a different location.`,
        };
      }

      console.log(
        `[TripAdvisor Apify] ${existingBusiness ? 'Updating' : 'Creating'} profile for team ${teamId}`,
      );

      await this.updateTaskProgress(
        teamId,
        "TRIPADVISOR",
        "CREATING_PROFILE",
        "IN_PROGRESS",
        "Fetching business details from TripAdvisor...",
        25,
      );

      // Use Apify to scrape the TripAdvisor page
      const actorId =
        process.env.APIFY_TRIPADVISOR_PROFILE_ACTOR_ID || "dbEyMBriog95Fv8CW"; // TripAdvisor Scraper (for profile)
      const input = {
        startUrls: [{ url: tripAdvisorUrl }],
        maxItemsPerQuery: 1,
        scrapeReviewerInfo: false,
      };

      const run = await this.apifyClient.actor(actorId).call(input);
      if (!run || !run.defaultDatasetId) {
        throw new Error("Failed to scrape TripAdvisor page data");
      }

      const { items } = await this.apifyClient
        .dataset(run.defaultDatasetId)
        .listItems();
      if (!items || items.length === 0) {
        throw new Error("No data returned from TripAdvisor scraper");
      }

      const pageData = items[0] as any;

      await this.updateTaskProgress(
        teamId,
        "TRIPADVISOR",
        "CREATING_PROFILE",
        "IN_PROGRESS",
        "Saving business profile to database...",
        50,
      );

      // Determine business type
      let businessType: "HOTEL" | "RESTAURANT" | "ATTRACTION" | "OTHER" =
        "OTHER";
      const category = (pageData.category || "").toLowerCase();
      if (category.includes("hotel") || category.includes("accommodation"))
        businessType = "HOTEL";
      else if (category.includes("restaurant") || category.includes("dining"))
        businessType = "RESTAURANT";
      else if (category.includes("attraction") || category.includes("activity"))
        businessType = "ATTRACTION";

      // First check if tripAdvisorUrl is already used by another team
      const existingUrlProfile =
        await prisma.tripAdvisorBusinessProfile.findUnique({
          where: { tripAdvisorUrl },
          select: { 
            businessLocation: {
              select: {
                teamId: true
              }
            }
          },
        });

      if (existingUrlProfile && existingUrlProfile.businessLocation?.teamId !== teamId) {
        throw new Error(
          `TripAdvisor URL ${tripAdvisorUrl} is already registered to another team.`,
        );
      }

      // Upsert TripAdvisor business profile - always update with fresh data from Apify
      const profileData = {
        tripAdvisorUrl,
        locationId: pageData.locationId || randomUUID(),
        name: pageData.name || "Unknown",
        type: businessType,
        category: pageData.category || "Unknown",
        phone: pageData.phone,
        email: pageData.email,
        website: pageData.website,
        locationString: pageData.locationString,
        address: pageData.address,
        latitude: pageData.latitude,
        longitude: pageData.longitude,
        description: pageData.description,
        image: pageData.image,
        photoCount: pageData.photoCount,
        rating: pageData.rating,
        rawRanking: pageData.rawRanking,
        rankingPosition: pageData.rankingPosition,
        rankingString: pageData.rankingString,
        rankingDenominator: pageData.rankingDenominator,
        numberOfReviews: pageData.numberOfReviews,
        hotelClass: pageData.hotelClass,
        hotelClassAttribution: pageData.hotelClassAttribution,
        priceLevel: pageData.priceLevel,
        priceRange: pageData.priceRange,
        scrapedAt: new Date(),
      };

      const businessProfile = await prisma.tripAdvisorBusinessProfile.upsert({
        where: { businessLocationId: locationId },
        create: {
          businessLocationId: locationId,
          ...profileData,
          businessMetadata: {
            create: {
              updateFrequencyMinutes: 360,
              nextUpdateAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
              lastUpdateAt: new Date(),
              isActive: true,
            },
          },
        },
        update: {
          ...profileData,
          businessMetadata: {
            upsert: {
              create: {
                updateFrequencyMinutes: 360,
                nextUpdateAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
                lastUpdateAt: new Date(),
                isActive: true,
              },
              update: {
                lastUpdateAt: new Date(),
              },
            },
          },
        },
      });

      console.log(
        `✓ Upserted TripAdvisor profile for team ${teamId}: ${businessProfile.id}`,
      );

      await this.updateTaskProgress(
        teamId,
        "TRIPADVISOR",
        "CREATING_PROFILE",
        "COMPLETED",
        `TripAdvisor business profile ${existingBusiness ? 'updated' : 'created'} successfully!`,
        100,
      );

      marketIdentifierEvents.emit("identifierCreated", {
        teamId,
        platform: MarketPlatform.TRIPADVISOR,
        identifier: tripAdvisorUrl,
        businessProfileId: businessProfile.id,
      });

      return { success: true, businessProfileId: businessProfile.id };
    } catch (error) {
      console.error("[TripAdvisor Apify] Error:", error);

      await this.updateTaskProgress(
        teamId,
        "TRIPADVISOR",
        "CREATING_PROFILE",
        "FAILED",
        `Failed to create TripAdvisor business profile: ${error instanceof Error ? error.message : "Unknown error"}`,
        100,
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create Booking Business Profile using Apify
   */
  private async createBookingBusinessProfileWithApify(
    teamId: string,
    locationId: string,
    bookingUrl: string,
  ): Promise<{ success: boolean; businessProfileId?: string; error?: string }> {
    try {
      await this.updateTaskProgress(
        teamId,
        "BOOKING",
        "CREATING_PROFILE",
        "IN_PROGRESS",
        "Validating Booking.com URL...",
        5,
      );

      // Validate that the identifier is a valid URL
      try {
        const url = new URL(bookingUrl);
        if (!url.hostname.includes('booking.com')) {
          throw new Error('URL must be from booking.com domain');
        }
      } catch (urlError) {
        const errorMessage = `Invalid Booking.com URL: ${bookingUrl}. Please provide a valid Booking.com property URL (e.g., https://www.booking.com/hotel/...). Received identifier looks like: ${bookingUrl.substring(0, 50)}`;
        console.error(`[Booking Apify] ${errorMessage}`);
        
        await this.updateTaskProgress(
          teamId,
          "BOOKING",
          "CREATING_PROFILE",
          "FAILED",
          errorMessage,
          100,
        );

        return {
          success: false,
          error: errorMessage,
        };
      }

      await this.updateTaskProgress(
        teamId,
        "BOOKING",
        "CREATING_PROFILE",
        "IN_PROGRESS",
        "Checking for existing Booking business profile...",
        10,
      );

      // Check if team already has a Booking business profile
      const existingBusiness = await prisma.bookingBusinessProfile.findUnique({
        where: { businessLocationId: locationId },
        select: { id: true, bookingUrl: true },
      });

      if (existingBusiness && existingBusiness.bookingUrl !== bookingUrl) {
        return {
          success: false,
          error: `Team already has a Booking business profile for a different property.`,
        };
      }

      console.log(
        `[Booking Apify] ${existingBusiness ? 'Updating' : 'Creating'} profile for team ${teamId}`,
      );

      await this.updateTaskProgress(
        teamId,
        "BOOKING",
        "CREATING_PROFILE",
        "IN_PROGRESS",
        "Fetching business details from Booking.com...",
        25,
      );

      // Use Apify to scrape the Booking page - using profile/hotel scraper
      const actorId =
        process.env.APIFY_BOOKING_PROFILE_ACTOR_ID || "oeiQgfg5fsmIJB7Cn"; // Booking.com Profile Scraper
      const input = {
        startUrls: [{ url: bookingUrl }],
        maxReviewsPerHotel: 1, // Just need profile data, not reviews
      };

      const run = await this.apifyClient.actor(actorId).call(input);
      if (!run || !run.defaultDatasetId) {
        throw new Error("Failed to scrape Booking.com page data");
      }

      const { items } = await this.apifyClient
        .dataset(run.defaultDatasetId)
        .listItems();
      if (!items || items.length === 0) {
        throw new Error("No data returned from Booking.com scraper");
      }

      const pageData = items[0] as any;

      await this.updateTaskProgress(
        teamId,
        "BOOKING",
        "CREATING_PROFILE",
        "IN_PROGRESS",
        "Saving business profile to database...",
        50,
      );

      // Determine property type
      let propertyType: "HOTEL" | "APARTMENT" | "HOSTEL" | "OTHER" = "HOTEL";
      const typeStr = (
        pageData.propertyType ||
        pageData.type ||
        ""
      ).toLowerCase();
      if (typeStr.includes("apartment")) propertyType = "APARTMENT";
      else if (typeStr.includes("hostel")) propertyType = "HOSTEL";
      else if (typeStr.includes("hotel")) propertyType = "HOTEL";
      else propertyType = "OTHER";

      // Upsert Booking business profile with fresh data
      const businessProfile = await prisma.bookingBusinessProfile.upsert({
        where: { businessLocationId: locationId },
        create: {
          businessLocationId: locationId,
          bookingUrl,
          hotelId: pageData.hotelId?.toString() || pageData.id?.toString() || null,
          name: pageData.name || "Unknown",
          propertyType,
          phone: pageData.phone,
          email: pageData.email,
          website: pageData.website,
          address: typeof pageData.address === 'object' ? pageData.address?.full : pageData.address,
          city: pageData.city || (typeof pageData.address === 'object' ? pageData.address?.city : null),
          country: pageData.country || (typeof pageData.address === 'object' ? pageData.address?.country : null),
          district: pageData.district,
          latitude: pageData.latitude,
          longitude: pageData.longitude,
          description: pageData.description,
          mainImage: pageData.mainImage,
          photoCount: pageData.photoCount,
          rating: pageData.rating,
          numberOfReviews: pageData.numberOfReviews,
          stars: pageData.stars,
          checkInTime: pageData.checkInTime,
          checkOutTime: pageData.checkOutTime,
          minAge: pageData.minAge,
          maxOccupancy: pageData.maxOccupancy,
          currency: pageData.currency,
          priceFrom: pageData.priceFrom,
          facilitiesList: pageData.facilitiesList || [],
          popularFacilities: pageData.popularFacilities || [],
          languagesSpoken: pageData.languagesSpoken || [],
          accessibilityFeatures: pageData.accessibilityFeatures || [],
          sustainabilityPrograms: pageData.sustainabilityPrograms || [],
          scrapedAt: new Date(),
          businessMetadata: {
            create: {
              updateFrequencyMinutes: 360,
              nextUpdateAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
              lastUpdateAt: new Date(),
              isActive: true,
            },
          },
        },
        update: {
          bookingUrl,
          hotelId: pageData.hotelId?.toString() || pageData.id?.toString() || null,
          name: pageData.name || "Unknown",
          propertyType,
          phone: pageData.phone,
          email: pageData.email,
          website: pageData.website,
          address: typeof pageData.address === 'object' ? pageData.address?.full : pageData.address,
          city: pageData.city || (typeof pageData.address === 'object' ? pageData.address?.city : null),
          country: pageData.country || (typeof pageData.address === 'object' ? pageData.address?.country : null),
          district: pageData.district,
          latitude: pageData.latitude,
          longitude: pageData.longitude,
          description: pageData.description,
          mainImage: pageData.mainImage,
          photoCount: pageData.photoCount,
          rating: pageData.rating,
          numberOfReviews: pageData.numberOfReviews,
          stars: pageData.stars,
          checkInTime: pageData.checkInTime,
          checkOutTime: pageData.checkOutTime,
          minAge: pageData.minAge,
          maxOccupancy: pageData.maxOccupancy,
          currency: pageData.currency,
          priceFrom: pageData.priceFrom,
          facilitiesList: pageData.facilitiesList || [],
          popularFacilities: pageData.popularFacilities || [],
          languagesSpoken: pageData.languagesSpoken || [],
          accessibilityFeatures: pageData.accessibilityFeatures || [],
          sustainabilityPrograms: pageData.sustainabilityPrograms || [],
          scrapedAt: new Date(),
          businessMetadata: existingBusiness
            ? {
                update: {
                  lastUpdateAt: new Date(),
                  nextUpdateAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
                },
              }
            : {
                create: {
                  updateFrequencyMinutes: 360,
                  nextUpdateAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
                  lastUpdateAt: new Date(),
                  isActive: true,
                },
              },
        },
      });

      await this.updateTaskProgress(
        teamId,
        "BOOKING",
        "CREATING_PROFILE",
        "COMPLETED",
        `Booking business profile ${existingBusiness ? 'updated' : 'created'} successfully!`,
        100,
      );

      marketIdentifierEvents.emit("identifierCreated", {
        teamId,
        platform: MarketPlatform.BOOKING,
        identifier: bookingUrl,
        businessProfileId: businessProfile.id,
      });

      return { success: true, businessProfileId: businessProfile.id };
    } catch (error) {
      console.error("[Booking Apify] Error:", error);

      await this.updateTaskProgress(
        teamId,
        "BOOKING",
        "CREATING_PROFILE",
        "FAILED",
        `Failed to create Booking business profile: ${error instanceof Error ? error.message : "Unknown error"}`,
        100,
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Helper methods
  private mapBusinessStatus(status: string): BusinessStatus {
    const upperStatus = status.toUpperCase();
    if (upperStatus.includes("CLOSED_PERMANENTLY")) return "CLOSED_PERMANENTLY";
    if (upperStatus.includes("CLOSED_TEMPORARILY")) return "CLOSED_TEMPORARILY";
    return "OPERATIONAL";
  }

  private mapPriceLevelStrToEnum(priceLevel: string): PriceLevel {
    const upperPrice = priceLevel.toUpperCase();
    if (upperPrice.includes("FREE")) return "FREE";
    if (upperPrice.includes("INEXPENSIVE")) return "INEXPENSIVE";
    if (upperPrice.includes("MODERATE")) return "MODERATE";
    if (upperPrice.includes("EXPENSIVE")) return "EXPENSIVE";
    if (upperPrice.includes("VERY_EXPENSIVE")) return "VERY_EXPENSIVE";
    return "MODERATE"; // Default
  }
}
