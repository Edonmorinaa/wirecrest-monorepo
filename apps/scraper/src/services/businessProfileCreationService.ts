import { ApifyClient } from 'apify-client';
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { MarketPlatform } from '@prisma/client';
import { 
  GooglePlaceV1,
  GooglePlaceV1OpeningHours,
  GooglePlaceV1OpeningHoursPeriod,
  GooglePlaceV1OpeningHoursPeriodPoint,
  GooglePlaceV1Photo,
  GooglePlaceV1AddressComponent
} from '../supabase/models';
import { marketIdentifierEvents } from '../events/marketIdentifierEvents';
import { randomUUID } from 'crypto';

export class BusinessProfileCreationService {
  private supabase: SupabaseClient;
  private apifyClient: ApifyClient;
  private googleApiKey: string;

  constructor(apifyToken: string) {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.supabase = createSupabaseClient(supabaseUrl, supabaseKey);
    
    console.log('apifyToken', apifyToken);
    this.apifyClient = new ApifyClient({ token: apifyToken });
    this.googleApiKey = process.env.GOOGLE_API_KEY!;
    console.log('googleApiKey', this.googleApiKey);
    if (!this.googleApiKey) {
      console.warn('[WARN] Google API Key not provided to BusinessProfileCreationService. Google profile creation will likely fail.');
    }
  }

  /**
   * Create business profile based on platform and identifier
   */
  async createBusinessProfile(
    teamId: string,
    platform: MarketPlatform,
    identifier: string // For Google, this is placeId; for Facebook, it's facebookUrl
  ): Promise<{ success: boolean; businessProfileId?: string; error?: string }> {
    try {
      if (platform === MarketPlatform.GOOGLE_MAPS) {
        return await this.createGoogleBusinessProfileWithPlacesAPI(teamId, identifier);
      } else if (platform === MarketPlatform.FACEBOOK) {
        return await this.createFacebookBusinessProfileWithApify(teamId, identifier);
      } else if (platform === MarketPlatform.TRIPADVISOR) {
        return await this.createTripAdvisorBusinessProfileWithApify(teamId, identifier);
      } else if (platform === MarketPlatform.BOOKING) {
        return await this.createBookingBusinessProfileWithApify(teamId, identifier);
      } else {
        return {
          success: false,
          error: `Platform ${platform} not supported yet`
        };
      }
    } catch (error) {
      console.error('Error creating business profile:', { teamId, platform, identifier, error });
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: message
      };
    }
  }

  /**
   * Create Google Business Profile using Google Places API (HTTP Endpoint)
   */
  private async createGoogleBusinessProfileWithPlacesAPI(
    teamId: string,
    placeId: string
  ): Promise<{ success: boolean; businessProfileId?: string; error?: string }> {
    console.log('createGoogleBusinessProfileWithPlacesAPI', this.googleApiKey);
    if (!this.googleApiKey) {
      return { success: false, error: 'Google API Key is not configured for Places API call.' };
    }
    try {
      console.log(`[Google Places HTTP API] Checking existing profile for team: ${teamId}`);
      
      // Check if team already has a Google business profile (one-to-one relationship)
      const { data: existingBusiness } = await this.supabase
        .from('GoogleBusinessProfile')
        .select('id, teamId, placeId')
        .eq('teamId', teamId)
        .single();

      if (existingBusiness) {
        if (existingBusiness.placeId === placeId) {
          console.log(`[Google Places HTTP API] Profile already exists for team ${teamId} with same placeId.`);
          return { success: true, businessProfileId: existingBusiness.id };
        } else {
          // Team already has a different Google business profile
          return { success: false, error: `Team already has a Google business profile for a different place. Each team can only have one Google business profile.` };
        }
      }

      console.log(`[Google Places HTTP API] Fetching details for placeId: ${placeId}`);
      const fieldMask = [
        'id', 'displayName', 'formattedAddress', 'shortFormattedAddress', 'addressComponents',
        'plusCode', 'location', 'utcOffsetMinutes', 'adrFormatAddress',
        'internationalPhoneNumber', 'nationalPhoneNumber', 'websiteUri', 'types', 'primaryType', 'primaryTypeDisplayName',
        'rating', 'userRatingCount', 'priceLevel', 'businessStatus',
        'regularOpeningHours', 'currentOpeningHours',
        'allowsDogs', 'goodForChildren', 'goodForGroups', 'goodForWatchingSports', 'liveMusic',
        'servesBeer', 'servesBreakfast', 'servesBrunch', 'servesDinner', 'servesLunch',
        'servesVegetarianFood', 'servesWine', 'reservable',
        'curbsidePickup', 'delivery', 'dineIn', 'takeout',
        'accessibilityOptions',
        'parkingOptions',
        'paymentOptions',
        'photos'
      ].join(',');
      
      const url = `https://places.googleapis.com/v1/places/${placeId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.googleApiKey,
          'X-Goog-FieldMask': fieldMask
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText })) as any;
        console.error('[Google Places HTTP API] Error fetching place details:', response.status, errorData);
        return { success: false, error: `Failed to fetch Google Place details: ${response.status} - ${errorData.error?.message || errorData.message || 'Unknown API error'}` };
      }

      const placeData = await response.json() as GooglePlaceV1;
      console.log(`[Google Places HTTP API] Successfully fetched details for: ${placeData.displayName?.text}`);

      // Map to new Prisma schema for GoogleBusinessProfile
      const businessProfileSupabaseData: any = {
        id: randomUUID(),
        teamId,
        placeId: placeData.id || placeId,
        displayName: placeData.displayName?.text,
        displayNameLanguageCode: placeData.displayName?.languageCode,
        formattedAddress: placeData.formattedAddress,
        shortFormattedAddress: placeData.shortFormattedAddress,
        plusCode: placeData.plusCode ? JSON.stringify(placeData.plusCode) : null,
        businessStatus: placeData.businessStatus ? this.mapBusinessStatus(placeData.businessStatus) : null,
        types: placeData.types || [],
        primaryType: placeData.primaryType,
        primaryTypeDisplayName: placeData.primaryTypeDisplayName?.text,
        primaryTypeDisplayNameLanguageCode: placeData.primaryTypeDisplayName?.languageCode,
        nationalPhoneNumber: placeData.nationalPhoneNumber,
        internationalPhoneNumber: placeData.internationalPhoneNumber,
        websiteUri: placeData.websiteUri,
        rating: placeData.rating,
        userRatingCount: placeData.userRatingCount,
        priceLevel: placeData.priceLevel ? this.mapPriceLevelStrToEnum(placeData.priceLevel) : null,
        utcOffsetMinutes: placeData.utcOffsetMinutes,
        adrFormatAddress: placeData.adrFormatAddress,
        
        // Boolean service options mapped to enums
        allowsDogs: placeData.allowsDogs || false,
        curbsidePickup: placeData.curbsidePickup ? 'CURBSIDE_PICKUP_AVAILABLE' : 'NO_CURBSIDE_PICKUP',
        delivery: placeData.delivery ? 'DELIVERY_AVAILABLE' : 'NO_DELIVERY',
        dineIn: placeData.dineIn ? 'DINE_IN_AVAILABLE' : 'NO_DINE_IN',
        reservable: placeData.reservable ? 'RESERVABLE' : 'NOT_RESERVABLE',
        servesBeer: placeData.servesBeer ? 'SERVES_BEER' : 'NO_BEER',
        servesBreakfast: placeData.servesBreakfast ? 'SERVES_BREAKFAST' : 'NO_BREAKFAST',
        servesBrunch: placeData.servesBrunch ? 'SERVES_BRUNCH' : 'NO_BRUNCH',
        servesDinner: placeData.servesDinner ? 'SERVES_DINNER' : 'NO_DINNER',
        servesLunch: placeData.servesLunch ? 'SERVES_LUNCH' : 'NO_LUNCH',
        servesVegetarianFood: placeData.servesVegetarianFood ? 'SERVES_VEGETARIAN_FOOD' : 'NO_VEGETARIAN_FOOD',
        servesWine: placeData.servesWine ? 'SERVES_WINE' : 'NO_WINE',
        takeout: placeData.takeout ? 'TAKEOUT_AVAILABLE' : 'NO_TAKEOUT',
        goodForChildren: placeData.goodForChildren || false,
        goodForGroups: placeData.goodForGroups || false,
        goodForWatchingSports: placeData.goodForWatchingSports || false,
        liveMusic: placeData.liveMusic || false,

        // JSON fields - store the raw object from Places API if available and structure matches
        accessibilityOptions: placeData.accessibilityOptions ? JSON.stringify(placeData.accessibilityOptions) : null,
        parkingOptions: placeData.parkingOptions ? JSON.stringify(placeData.parkingOptions) : null,
        paymentOptions: placeData.paymentOptions ? JSON.stringify(placeData.paymentOptions) : null
      };
      
      // Remove undefined values to avoid issues with Supabase insert
      Object.keys(businessProfileSupabaseData).forEach(key => 
        businessProfileSupabaseData[key] === undefined && delete businessProfileSupabaseData[key]
      );

      const { data: insertedBusiness, error: insertError } = await this.supabase
        .from('GoogleBusinessProfile')
        .insert(businessProfileSupabaseData)
        .select('id')
        .single();

      if (insertError) {
        if (insertError.code === '23505') { 
          console.warn(`[Google Places HTTP API] Duplicate key error, re-checking...`);
          const { data: reCheckBusiness } = await this.supabase
            .from('GoogleBusinessProfile')
            .select('id, teamId')
            .eq('teamId', teamId)
            .single();
          if (reCheckBusiness) return { success: true, businessProfileId: reCheckBusiness.id };
        }
        console.error('[Google Places HTTP API] Error inserting Google Business Profile:', insertError.message, insertError.details, insertError.hint);
        throw new Error(`Failed to save Google business profile: ${insertError.message}`);
      }
      const businessProfileId = insertedBusiness.id;
      console.log(`[Google Places HTTP API] Profile created with ID: ${businessProfileId}`);

      // Create GoogleBusinessMetadata record for timestamp tracking
      const { error: metadataError } = await this.supabase
        .from('GoogleBusinessMetadata')
        .insert({
          id: randomUUID(),
          businessProfileId: businessProfileId,
          updateFrequencyMinutes: 360, // Default 6 hours
          nextUpdateAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
          lastUpdateAt: new Date().toISOString(),
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

      if (metadataError) {
        console.warn(`[Google Places HTTP API] Failed to create GoogleBusinessMetadata for ${businessProfileId}:`, metadataError.message);
      }

      // --- Populate Related Models ---
      // 1. Location
      if (placeData.location) {
        const { latitude, longitude } = placeData.location;
        const { error: locError } = await this.supabase
          .from('Location')
          .insert({ 
            id: randomUUID(),
            businessId: businessProfileId, 
            lat: latitude, 
            lng: longitude 
          });
        if (locError) console.warn(`[Google Places HTTP API] Failed to create Location for ${businessProfileId}:`, locError.message);
      }

      // 2. Categories (from placeData.types)
      if (placeData.types && placeData.types.length > 0) {
        const categoriesToInsert = placeData.types.map((type: string) => ({ 
          id: randomUUID(),
          name: type, 
          businessId: businessProfileId 
        }));
        const { error: catError } = await this.supabase.from('Category').insert(categoriesToInsert);
        if (catError) console.warn(`[Google Places HTTP API] Failed to create Categories for ${businessProfileId}:`, catError.message);
      }

      // 3. AddressComponents
      if (placeData.addressComponents && placeData.addressComponents.length > 0) {
        const addressComponentsToInsert = placeData.addressComponents.map(ac => ({
          id: randomUUID(),
          businessProfileId: businessProfileId,
          longText: ac.longText,
          shortText: ac.shortText,
          types: ac.types,
          languageCode: ac.languageCode
        }));
        const { error: acError } = await this.supabase.from('AddressComponent').insert(addressComponentsToInsert);
        if (acError) console.warn(`[Google Places HTTP API] Failed to create AddressComponents for ${businessProfileId}:`, acError.message);
      }

      // 4. Photos
      if (placeData.photos && placeData.photos.length > 0) {
        const photosToInsert = placeData.photos.map(p => ({
          id: randomUUID(),
          businessProfileId: businessProfileId,
          name: p.name,
          widthPx: p.widthPx,
          heightPx: p.heightPx,
          authorAttributions: p.authorAttributions ? JSON.stringify(p.authorAttributions) : null
        }));
        const { error: photoError } = await this.supabase.from('Photo').insert(photosToInsert);
        if (photoError) console.warn(`[Google Places HTTP API] Failed to create Photos for ${businessProfileId}:`, photoError.message);
      }

      // 5. OpeningHours (Regular and Current)
      if (placeData.regularOpeningHours) {
        const ohData = placeData.regularOpeningHours;
        const openingHoursId = randomUUID();
        
        const { error: ohError } = await this.supabase
          .from('OpeningHours')
          .insert({
            id: openingHoursId,
            profileRegularOpeningHoursId: businessProfileId,
            openNow: ohData.openNow,
            weekdayDescriptions: ohData.weekdayDescriptions || [],
            secondaryHoursType: ohData.secondaryHoursType
          });
        
        if (ohError) {
          console.warn(`[Google Places HTTP API] Failed to create OpeningHours for ${businessProfileId}:`, ohError.message);
            } else {
          // Create periods
          if (ohData.periods && ohData.periods.length > 0) {
            const periodsToInsert = ohData.periods.map(p => ({
              id: randomUUID(),
              openingHoursId: openingHoursId,
              openDay: p.open.day,
              openHour: p.open.hour,
              openMinute: p.open.minute,
              openDate: p.open.date ? new Date(p.open.date.year, p.open.date.month - 1, p.open.date.day) : null,
              openTruncated: p.open.truncated || false,
              closeDay: p.close?.day,
              closeHour: p.close?.hour,
              closeMinute: p.close?.minute,
              closeDate: p.close?.date ? new Date(p.close.date.year, p.close.date.month - 1, p.close.date.day) : null,
              closeTruncated: p.close?.truncated || false
            }));
            const { error: periodError } = await this.supabase.from('Period').insert(periodsToInsert);
            if (periodError) console.warn(`[Google Places HTTP API] Failed to create Periods for OpeningHours ${openingHoursId}:`, periodError.message);
          }
        }
      }
      
      marketIdentifierEvents.emitBusinessProfileCreated({
        teamId,
        platform: MarketPlatform.GOOGLE_MAPS,
        businessProfileId,
        identifier: placeId,
        timestamp: new Date()
      });

      return { success: true, businessProfileId };

    } catch (error) {
      console.error('[Google Places HTTP API] Error in createGoogleBusinessProfileWithPlacesAPI:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error during Google profile creation' };
    }
  }
  
  private mapBusinessStatus(status?: string): string | null {
    if (!status) return null;
    const upperStatus = status.toUpperCase();
    if (['OPERATIONAL', 'CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY'].includes(upperStatus)) {
      return upperStatus;
    }
    return null;
  }

  private mapPriceLevelStrToEnum(priceLevelString?: string): string | null {
    if (!priceLevelString) return null;
    switch (priceLevelString) {
      case 'PRICE_LEVEL_FREE': return 'FREE';
      case 'PRICE_LEVEL_INEXPENSIVE': return 'INEXPENSIVE';
      case 'PRICE_LEVEL_MODERATE': return 'MODERATE';
      case 'PRICE_LEVEL_EXPENSIVE': return 'EXPENSIVE';
      case 'PRICE_LEVEL_VERY_EXPENSIVE': return 'VERY_EXPENSIVE';
      default: return null;
    }
  }

  /**
   * Create Facebook Business Profile using Apify actor
   */
  private async createFacebookBusinessProfileWithApify(
    teamId: string,
    facebookUrl: string
  ): Promise<{ success: boolean; businessProfileId?: string; error?: string }> {
    try {
      console.log(`[Facebook Apify] Creating business profile for team: ${teamId}`);
      
      // Check if team already has a Facebook business profile (one-to-one relationship)
      const { data: existingBusiness, error: existingError } = await this.supabase
        .from('FacebookBusinessProfile')
        .select('id, teamId, facebookUrl')
        .eq('teamId', teamId)
        .single();

      if (existingBusiness) {
        if (existingBusiness.facebookUrl === facebookUrl) {
          console.log(`[Facebook Apify] Profile already exists for team ${teamId} with same Facebook URL.`);
          return { success: true, businessProfileId: existingBusiness.id };
        } else {
          // Team already has a different Facebook business profile
          return { success: false, error: `Team already has a Facebook business profile for a different page. Each team can only have one Facebook business profile.` };
        }
      }

      // Use Apify actor to get Facebook page data
      const actorId = process.env.APIFY_FACEBOOK_PROFILE_ACTOR_ID || '4Hv5RhChiaDk6iwad';
      const input = {
        startUrls: [{ url: facebookUrl }]
      };

      console.log(`[Facebook Apify] Starting actor run with ID: ${actorId}`);
      const run = await this.apifyClient.actor(actorId).call(input);
      
      if (!run) {
        return { success: false, error: 'Failed to start Apify actor' };
      }

      const { items } = await this.apifyClient.dataset(run.defaultDatasetId).listItems();

      if (!items || items.length === 0) {
        return { success: false, error: 'No Facebook page data found' };
      }

      const facebookData = items[0] as any;
      console.log(`[Facebook Apify] Retrieved data for: ${facebookData.title || facebookData.pageName}`);

      // Validate required fields
      if (!facebookData.pageId || !facebookData.facebookId) {
        return { success: false, error: 'Missing required Facebook page identifiers' };
      }

      // Generate required unique IDs
      const businessProfileId = randomUUID();

      // Convert Apify data to our business profile format
      const businessProfileData = {
        id: businessProfileId,
        teamId,
        
        // Required fields (not-nullable)
        facebookUrl: facebookData.facebookUrl || facebookUrl,
        pageId: facebookData.pageId,
        facebookId: facebookData.facebookId,
        
        // Core profile data
        categories: Array.isArray(facebookData.categories) ? facebookData.categories : [],
        info: Array.isArray(facebookData.info) ? facebookData.info : [],
        likes: Number(facebookData.likes) || 0,
        title: facebookData.title || '',
        pageName: facebookData.pageName || '',
        pageUrl: facebookData.pageUrl || facebookUrl,
        followers: Number(facebookData.followers) || 0,
        
        // Optional fields
        messenger: facebookData.messenger || null,
        priceRange: facebookData.priceRange || null,
        intro: facebookData.intro || null,
        websites: Array.isArray(facebookData.websites) ? facebookData.websites : [],
        phone: facebookData.phone || null,
        email: facebookData.email || null,
        profilePictureUrl: facebookData.profilePictureUrl || null,
        coverPhotoUrl: facebookData.coverPhotoUrl || null,
        profilePhoto: facebookData.profilePhoto || null,
        creationDate: facebookData.creation_date || null,
        adStatus: facebookData.ad_status || null,
        
        // Complex objects
        aboutMe: facebookData.about_me || null,
        pageAdLibrary: facebookData.pageAdLibrary || null,
        
        // Internal tracking
        metadata: {
          apifyData: facebookData,
          dataSource: 'apify',
          actorId: actorId,
          scrapedAt: new Date().toISOString()
        },
        scrapedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Remove undefined values
      Object.keys(businessProfileData).forEach(key => 
        businessProfileData[key as keyof typeof businessProfileData] === undefined && 
        delete businessProfileData[key as keyof typeof businessProfileData]
      );

      const { data: insertedBusiness, error: insertError } = await this.supabase
        .from('FacebookBusinessProfile')
        .insert(businessProfileData)
        .select('id')
        .single();

      if (insertError) {
        // Handle duplicate key error
        if (insertError.code === '23505') {
          console.log(`[Facebook Apify] Duplicate key error, re-checking existing record...`);
          
          // Check for existing record by team
          const { data: checkBusiness, error: checkError } = await this.supabase
            .from('FacebookBusinessProfile')
            .select('id, teamId, facebookUrl')
            .eq('teamId', teamId)
            .single();
          
          if (checkBusiness) {
            return { success: true, businessProfileId: checkBusiness.id };
          }
        }

        console.error('[Facebook Apify] Error creating Facebook business profile:', insertError);
        throw new Error(`Failed to create Facebook business profile: ${insertError.message}`);
      }

      console.log(`[Facebook Apify] Successfully created Facebook business profile with ID: ${businessProfileId}`);

      // Create metadata record for update scheduling
      const { error: metadataError } = await this.supabase
        .from('FacebookBusinessMetadata')
        .insert({
          id: randomUUID(),
          businessProfileId: businessProfileId,
          updateFrequencyMinutes: 360, // Default 6 hours
          nextUpdateAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
          lastUpdateAt: new Date().toISOString(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });

      if (metadataError) {
        console.warn(`[Facebook Apify] Failed to create FacebookBusinessMetadata for ${businessProfileId}:`, metadataError.message);
      }

      // Emit business profile created event
      marketIdentifierEvents.emitBusinessProfileCreated({
        teamId,
        platform: MarketPlatform.FACEBOOK,
        businessProfileId,
        identifier: facebookUrl,
        timestamp: new Date()
      });

      return { success: true, businessProfileId };

    } catch (error) {
      console.error('[Facebook Apify] Error creating Facebook business profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create TripAdvisor Business Profile using Apify actor
   */
  private async createTripAdvisorBusinessProfileWithApify(
    teamId: string,
    tripAdvisorUrl: string
  ): Promise<{ success: boolean; businessProfileId?: string; error?: string }> {
    try {
      console.log(`[TripAdvisor Apify] Creating business profile for team: ${teamId}`);
      
      // Check if team already has a TripAdvisor business profile (one-to-one relationship)
      const { data: existingBusiness, error: existingError } = await this.supabase
        .from('TripAdvisorBusinessProfile')
        .select('id, teamId, tripAdvisorUrl')
        .eq('teamId', teamId)
        .single();

      if (existingBusiness) {
        if (existingBusiness.tripAdvisorUrl === tripAdvisorUrl) {
          console.log(`[TripAdvisor Apify] Profile already exists for team ${teamId} with same TripAdvisor URL.`);
          return { success: true, businessProfileId: existingBusiness.id };
        } else {
          // Team already has a different TripAdvisor business profile
          return { success: false, error: `Team already has a TripAdvisor business profile for a different location. Each team can only have one TripAdvisor business profile.` };
        }
      }

      // Use Apify actor to get TripAdvisor location data
      const actorId = process.env.APIFY_TRIPADVISOR_PROFILE_ACTOR_ID || 'dbEyMBriog95Fv8CW';
      const input = {
        "currency": "USD",
        "includeAiReviewsSummary": false,
        "includeAttractions": true,
        "includeHotels": true,
        "includeNearbyResults": false,
        "includePriceOffers": false,
        "includeRestaurants": true,
        "includeTags": true,
        "includeVacationRentals": true,
        "language": "en",
        "maxItemsPerQuery": 1,
        "startUrls": [
          {
            "url": tripAdvisorUrl,
            "method": "GET"
          }
        ]
      };

      console.log(`[TripAdvisor Apify] Starting actor run with ID: ${actorId}`);
      const run = await this.apifyClient.actor(actorId).call(input);
      
      if (!run) {
        return { success: false, error: 'Failed to start Apify actor' };
      }

      const { items } = await this.apifyClient.dataset(run.defaultDatasetId).listItems();

      if (!items || items.length === 0) {
        return { success: false, error: 'No TripAdvisor location data found' };
      }

      const tripAdvisorData = items[0] as any;
      console.log(`[TripAdvisor Apify] Retrieved data for: ${tripAdvisorData.name || tripAdvisorData.title || 'Unknown Location'}`);
      console.log(`[TripAdvisor Apify] Full data structure:`, JSON.stringify(tripAdvisorData, null, 2));

      // Extract location ID from different possible fields
      let locationId = tripAdvisorData.locationId || 
                      tripAdvisorData.id || 
                      tripAdvisorData.placeId ||
                      tripAdvisorData.tripadvisorId;

      // If no direct ID, try to extract from URL
      if (!locationId && tripAdvisorData.url) {
        const urlMatch = tripAdvisorData.url.match(/d(\d+)/);
        if (urlMatch) {
          locationId = urlMatch[1];
        }
      }

      // If still no ID, try to extract from original URL
      if (!locationId && tripAdvisorUrl) {
        const urlMatch = tripAdvisorUrl.match(/d(\d+)/);
        if (urlMatch) {
          locationId = urlMatch[1];
        }
      }

      if (!locationId) {
        console.error('[TripAdvisor Apify] No location ID found in data:', tripAdvisorData);
        return { success: false, error: 'Missing required TripAdvisor location ID. Please check the TripAdvisor URL format.' };
      }

      console.log(`[TripAdvisor Apify] Using location ID: ${locationId}`);

      // Generate required unique IDs
      const businessProfileId = randomUUID();

      // Convert Apify data to our business profile format
      const businessProfileData = {
        id: businessProfileId,
        teamId,
        
        // Required fields
        tripAdvisorUrl: tripAdvisorData.url || tripAdvisorUrl,
        locationId: locationId,
        name: tripAdvisorData.name || tripAdvisorData.title || '',
        type: this.mapTripAdvisorBusinessType(tripAdvisorData.type || tripAdvisorData.category || tripAdvisorData.subcategory),
        category: tripAdvisorData.category || tripAdvisorData.subcategory || tripAdvisorData.type || '',
        
        // Contact information
        phone: tripAdvisorData.phone || tripAdvisorData.phoneNumber || null,
        email: tripAdvisorData.email || null,
        website: tripAdvisorData.website || tripAdvisorData.websiteUrl || null,
        
        // Location data
        locationString: tripAdvisorData.locationString || tripAdvisorData.location || null,
        address: tripAdvisorData.address || tripAdvisorData.fullAddress || null,
        latitude: tripAdvisorData.latitude ? parseFloat(tripAdvisorData.latitude) : 
                 (tripAdvisorData.coordinates?.latitude ? parseFloat(tripAdvisorData.coordinates.latitude) : null),
        longitude: tripAdvisorData.longitude ? parseFloat(tripAdvisorData.longitude) : 
                  (tripAdvisorData.coordinates?.longitude ? parseFloat(tripAdvisorData.coordinates.longitude) : null),
        
        // Business details
        description: tripAdvisorData.description || tripAdvisorData.about || null,
        image: tripAdvisorData.image || tripAdvisorData.thumbnail || tripAdvisorData.photo || null,
        photoCount: tripAdvisorData.photoCount ? parseInt(tripAdvisorData.photoCount) : 
                   (tripAdvisorData.photos?.length ? tripAdvisorData.photos.length : null),
        
        // Ratings & reviews
        rating: tripAdvisorData.rating ? parseFloat(tripAdvisorData.rating) : 
               (tripAdvisorData.averageRating ? parseFloat(tripAdvisorData.averageRating) : null),
        rawRanking: tripAdvisorData.rawRanking ? parseInt(tripAdvisorData.rawRanking) : null,
        rankingPosition: tripAdvisorData.rankingPosition ? parseInt(tripAdvisorData.rankingPosition) : 
                        (tripAdvisorData.ranking ? parseInt(tripAdvisorData.ranking) : null),
        rankingString: tripAdvisorData.rankingString || tripAdvisorData.rankingText || null,
        rankingDenominator: tripAdvisorData.rankingDenominator || null,
        numberOfReviews: tripAdvisorData.numberOfReviews ? parseInt(tripAdvisorData.numberOfReviews) : 
                        (tripAdvisorData.reviewCount ? parseInt(tripAdvisorData.reviewCount) : 
                         (tripAdvisorData.reviews ? parseInt(tripAdvisorData.reviews) : null)),
        
        // TripAdvisor specific fields
        hotelClass: tripAdvisorData.hotelClass || null,
        hotelClassAttribution: tripAdvisorData.hotelClassAttribution || null,
        priceLevel: tripAdvisorData.priceLevel || null,
        priceRange: tripAdvisorData.priceRange || null,
        
        // Additional data
        checkInDate: tripAdvisorData.checkInDate || null,
        checkOutDate: tripAdvisorData.checkOutDate || null,
        numberOfRooms: tripAdvisorData.numberOfRooms ? parseInt(tripAdvisorData.numberOfRooms) : null,
        whatsAppRedirectUrl: tripAdvisorData.whatsAppRedirectUrl || null,
        
        // Internal tracking
        scrapedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Remove undefined values
      Object.keys(businessProfileData).forEach(key => 
        businessProfileData[key as keyof typeof businessProfileData] === undefined && 
        delete businessProfileData[key as keyof typeof businessProfileData]
      );

      const { data: insertedBusiness, error: insertError } = await this.supabase
        .from('TripAdvisorBusinessProfile')
        .insert(businessProfileData)
        .select('id')
        .single();

      if (insertError) {
        // Handle duplicate key error
        if (insertError.code === '23505') {
          console.log(`[TripAdvisor Apify] Duplicate key error, re-checking existing record...`);
          
          // Check for existing record by team
          const { data: checkBusiness, error: checkError } = await this.supabase
            .from('TripAdvisorBusinessProfile')
            .select('id, teamId, tripAdvisorUrl')
            .eq('teamId', teamId)
            .single();
          
          if (checkBusiness) {
            return { success: true, businessProfileId: checkBusiness.id };
          }
        }

        console.error('[TripAdvisor Apify] Error creating TripAdvisor business profile:', insertError);
        throw new Error(`Failed to create TripAdvisor business profile: ${insertError.message}`);
      }

      console.log(`[TripAdvisor Apify] Successfully created TripAdvisor business profile with ID: ${businessProfileId}`);

      // Create metadata record for update scheduling
      const { error: metadataError } = await this.supabase
        .from('TripAdvisorBusinessMetadata')
        .insert({
          id: randomUUID(),
          businessProfileId: businessProfileId,
          updateFrequencyMinutes: 360, // Default 6 hours
          nextUpdateAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
          lastUpdateAt: new Date().toISOString(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });

      if (metadataError) {
        console.warn(`[TripAdvisor Apify] Failed to create TripAdvisorBusinessMetadata for ${businessProfileId}:`, metadataError.message);
      }

      // Emit business profile created event
      marketIdentifierEvents.emitBusinessProfileCreated({
        teamId,
        platform: MarketPlatform.TRIPADVISOR,
        businessProfileId,
        identifier: tripAdvisorUrl,
        timestamp: new Date()
      });

      return { success: true, businessProfileId };

    } catch (error) {
      console.error('[TripAdvisor Apify] Error creating TripAdvisor business profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Map TripAdvisor business type to our enum
   */
  private mapTripAdvisorBusinessType(type?: string): string {
    if (!type) return 'OTHER';
    
    const upperType = type.toUpperCase();
    const validTypes = ['HOTEL', 'RESTAURANT', 'ATTRACTION', 'VACATION_RENTAL', 'AIRLINE', 'OTHER'];
    
    // Map common variations
    if (upperType.includes('HOTEL') || upperType.includes('ACCOMMODATION') || upperType.includes('LODGING')) return 'HOTEL';
    if (upperType.includes('RESTAURANT') || upperType.includes('FOOD') || upperType.includes('DINING') || upperType.includes('CAFE') || upperType.includes('BAR')) return 'RESTAURANT';
    if (upperType.includes('ATTRACTION') || upperType.includes('ACTIVITY') || upperType.includes('TOUR') || upperType.includes('MUSEUM') || upperType.includes('PARK')) return 'ATTRACTION';
    if (upperType.includes('RENTAL') || upperType.includes('VACATION') || upperType.includes('APARTMENT')) return 'VACATION_RENTAL';
    if (upperType.includes('AIRLINE') || upperType.includes('FLIGHT') || upperType.includes('AIRPORT')) return 'AIRLINE';
    
    // Check if it's already a valid enum value
    if (validTypes.includes(upperType)) return upperType;
    
    return 'OTHER';
  }

  /**
   * Create Booking.com Business Profile using Apify actor
   */
  private async createBookingBusinessProfileWithApify(
    teamId: string,
    bookingUrl: string
  ): Promise<{ success: boolean; businessProfileId?: string; error?: string }> {
    try {
      console.log(`[Booking.com Apify] Creating business profile for team: ${teamId}`);
      
      // Check if team already has a Booking.com business profile (one-to-one relationship)
      const { data: existingBusiness, error: existingError } = await this.supabase
        .from('BookingBusinessProfile')
        .select('id, teamId, bookingUrl')
        .eq('teamId', teamId)
        .single();

      if (existingBusiness) {
        if (existingBusiness.bookingUrl === bookingUrl) {
          console.log(`[Booking.com Apify] Profile already exists for team ${teamId} with same Booking.com URL.`);
          return { success: true, businessProfileId: existingBusiness.id };
        } else {
          // Team already has a different Booking.com business profile
          return { success: false, error: `Team already has a Booking.com business profile for a different property. Each team can only have one Booking.com business profile.` };
        }
      }

      // Use Apify actor to get Booking.com property data
      const actorId = process.env.APIFY_BOOKING_PROFILE_ACTOR_ID || 'oeiQgfg5fsmIJB7Cn';
      const input = {
        "startUrls": [{
          "url": bookingUrl
        }],
        "includeReviews": false,  // We handle reviews separately
        "includePhotos": true,
        "includeRooms": true,     // Key feature for reputation dashboard
        "includeFacilities": true,
        "maxReviews": 0,          // No reviews in this actor
        
        // Language and region settings
        "language": "en-us",
        "currency": "USD",
        
        // Proxy configuration
        "proxyConfiguration": {
          "useApifyProxy": true
        }
      };

      console.log(`[Booking.com Apify] Starting actor run with ID: ${actorId}`);
      const run = await this.apifyClient.actor(actorId).call(input);
      
      if (!run) {
        return { success: false, error: 'Failed to start Apify actor' };
      }

      const { items } = await this.apifyClient.dataset(run.defaultDatasetId).listItems();

      if (!items || items.length === 0) {
        return { success: false, error: 'No Booking.com property data found' };
      }

      const bookingData = items[0] as any;
      console.log(`[Booking.com Apify] Retrieved data for: ${bookingData.name || bookingData.title || 'Unknown Property'}`);

      // Extract hotel ID from different possible fields
      let hotelId = bookingData.hotelId || 
                   bookingData.id || 
                   bookingData.propertyId ||
                   bookingData.bookingId;

      // If no direct ID, try to extract from URL
      if (!hotelId && bookingData.url) {
        const urlMatch = bookingData.url.match(/hotel\/(.+?)\.html/);
        if (urlMatch) {
          hotelId = urlMatch[1];
        }
      }

      // If still no ID, try to extract from original URL
      if (!hotelId && bookingUrl) {
        const urlMatch = bookingUrl.match(/hotel\/(.+?)\.html/);
        if (urlMatch) {
          hotelId = urlMatch[1];
        }
      }

      if (!hotelId) {
        console.warn('[Booking.com Apify] No hotel ID found, proceeding without ID');
      }

      console.log(`[Booking.com Apify] Using hotel ID: ${hotelId || 'None'}`);

      // Generate required unique IDs
      const businessProfileId = randomUUID();

      // Convert Apify data to our business profile format
      const businessProfileData = {
        id: businessProfileId,
        teamId,
        
        // Required fields
        bookingUrl: bookingUrl, // Always use the original URL for consistency
        name: bookingData.name || bookingData.title || '',
        propertyType: this.mapBookingPropertyType(bookingData.propertyType || bookingData.accommodationType || bookingData.type),
        
        // Optional fields
        hotelId: hotelId || null,
        phone: bookingData.phone || bookingData.phoneNumber || null,
        email: bookingData.email || null,
        website: bookingData.website || bookingData.websiteUrl || null,
        
        // Location data
        address: bookingData.address || bookingData.fullAddress || null,
        city: bookingData.city || null,
        country: bookingData.country || null,
        latitude: bookingData.latitude ? parseFloat(bookingData.latitude) : 
                 (bookingData.coordinates?.latitude ? parseFloat(bookingData.coordinates.latitude) : null),
        longitude: bookingData.longitude ? parseFloat(bookingData.longitude) : 
                  (bookingData.coordinates?.longitude ? parseFloat(bookingData.coordinates.longitude) : null),
        
        // Property details
        description: bookingData.description || bookingData.about || null,
        mainImage: bookingData.mainImage || bookingData.image || bookingData.thumbnail || null,
        photoCount: Array.isArray(bookingData.images) ? bookingData.images.length : 0,
        
        // Ratings & reviews
        rating: bookingData.rating ? parseFloat(bookingData.rating) : 
               (bookingData.averageRating ? parseFloat(bookingData.averageRating) : null),
        numberOfReviews: bookingData.numberOfReviews ? parseInt(bookingData.numberOfReviews) : 
                        (bookingData.reviewCount ? parseInt(bookingData.reviewCount) : 
                         (bookingData.reviews ? parseInt(bookingData.reviews) : null)),
        
        // Property features
        stars: bookingData.stars ? parseInt(bookingData.stars) : null,
        checkInTime: bookingData.checkInTime || null,
        checkOutTime: bookingData.checkOutTime || null,
        minAge: bookingData.minAge ? parseInt(bookingData.minAge) : null,
        maxOccupancy: bookingData.maxOccupancy ? parseInt(bookingData.maxOccupancy) : 
                     (bookingData.maxGuests ? parseInt(bookingData.maxGuests) : null),
        
        // Pricing
        currency: bookingData.currency || null,
        priceFrom: bookingData.priceFrom ? parseFloat(bookingData.priceFrom) : null,
        
        // Facilities and amenities (using correct schema field names)
        facilitiesList: Array.isArray(bookingData.facilities) ? bookingData.facilities : [],
        popularFacilities: Array.isArray(bookingData.popularFacilities) ? bookingData.popularFacilities : 
                          (Array.isArray(bookingData.amenities) ? bookingData.amenities : []),
        
        // Language and accessibility
        languagesSpoken: Array.isArray(bookingData.languagesSpoken) ? bookingData.languagesSpoken : [],
        accessibilityFeatures: Array.isArray(bookingData.accessibilityFeatures) ? bookingData.accessibilityFeatures : [],
        
        // Sustainability
        sustainabilityPrograms: Array.isArray(bookingData.sustainabilityPrograms) ? bookingData.sustainabilityPrograms : [],
        
        // Internal tracking
        scrapedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Remove undefined values
      Object.keys(businessProfileData).forEach(key => 
        businessProfileData[key as keyof typeof businessProfileData] === undefined && 
        delete businessProfileData[key as keyof typeof businessProfileData]
      );

      const { data: insertedBusiness, error: insertError } = await this.supabase
        .from('BookingBusinessProfile')
        .insert(businessProfileData)
        .select('id')
        .single();

      if (insertError) {
        // Handle duplicate key error
        if (insertError.code === '23505') {
          console.log(`[Booking.com Apify] Duplicate key error, re-checking existing record...`);
          
          // Check for existing record by team
          const { data: checkBusiness, error: checkError } = await this.supabase
            .from('BookingBusinessProfile')
            .select('id, teamId, bookingUrl')
            .eq('teamId', teamId)
            .single();
          
          if (checkBusiness) {
            return { success: true, businessProfileId: checkBusiness.id };
          }
        }

        console.error('[Booking.com Apify] Error creating Booking.com business profile:', insertError);
        throw new Error(`Failed to create Booking.com business profile: ${insertError.message}`);
      }

      console.log(`[Booking.com Apify] Successfully created Booking.com business profile with ID: ${businessProfileId}`);

      // Create metadata record for update scheduling
      const { error: metadataError } = await this.supabase
        .from('BookingBusinessMetadata')
        .insert({
          id: randomUUID(),
          businessProfileId: businessProfileId,
          updateFrequencyMinutes: 360, // Default 6 hours
          nextUpdateAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
          lastUpdateAt: new Date().toISOString(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });

      if (metadataError) {
        console.warn(`[Booking.com Apify] Failed to create BookingBusinessMetadata for ${businessProfileId}:`, metadataError.message);
      }

      // Emit business profile created event
      marketIdentifierEvents.emitBusinessProfileCreated({
        teamId,
        platform: MarketPlatform.BOOKING,
        businessProfileId,
        identifier: bookingUrl,
        timestamp: new Date()
      });

      return { success: true, businessProfileId };

    } catch (error) {
      console.error('[Booking.com Apify] Error creating Booking.com business profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Map Booking.com property type to our enum
   */
  private mapBookingPropertyType(type?: string): string {
    if (!type) return 'HOTEL';
    
    const upperType = type.toUpperCase();
    const validTypes = ['HOTEL', 'APARTMENT', 'HOSTEL', 'GUESTHOUSE', 'BED_AND_BREAKFAST', 'VILLA', 'RESORT', 'OTHER'];
    
    // Map common variations
    if (upperType.includes('HOTEL') || upperType.includes('MOTEL')) return 'HOTEL';
    if (upperType.includes('APARTMENT') || upperType.includes('FLAT') || upperType.includes('CONDO')) return 'APARTMENT';
    if (upperType.includes('HOSTEL') || upperType.includes('BACKPACKER')) return 'HOSTEL';
    if (upperType.includes('GUESTHOUSE') || upperType.includes('GUEST HOUSE') || upperType.includes('PENSION')) return 'GUESTHOUSE';
    if (upperType.includes('B&B') || upperType.includes('BED AND BREAKFAST') || upperType.includes('BREAKFAST')) return 'BED_AND_BREAKFAST';
    if (upperType.includes('VILLA') || upperType.includes('HOUSE')) return 'VILLA';
    if (upperType.includes('RESORT')) return 'RESORT';
    
    // Check if it's already a valid enum value
    if (validTypes.includes(upperType)) return upperType;
    
    return 'HOTEL'; // Default to hotel
  }

  async close(): Promise<void> {
    // Supabase client doesn't need explicit closing
  }
} 