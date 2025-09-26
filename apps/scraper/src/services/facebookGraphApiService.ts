import { logger } from '../utils/logger';
import { FacebookBusinessProfile } from '@prisma/client';

export interface FacebookGraphApiProfile {
  id: string;
  name: string;
  about?: string;
  description?: string;
  category?: string;
  category_list?: Array<{
    id: string;
    name: string;
  }>;
  location?: {
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    state?: string;
    street?: string;
    zip?: string;
  };
  phone?: string;
  website?: string;
  emails?: string[];
  hours?: { [key: string]: string };
  is_verified?: boolean;
  verification_status?: string;
  fan_count?: number;
  followers_count?: number;
  engagement?: {
    count: number;
    social_sentence: string;
  };
  cover?: {
    id: string;
    source: string;
    offset_x: number;
    offset_y: number;
  };
  picture?: {
    data: {
      height: number;
      is_silhouette: boolean;
      url: string;
      width: number;
    };
  };
  rating_count?: number;
  overall_star_rating?: number;
  price_range?: string;
  parking?: {
    lot?: number;
    street?: number;
    valet?: number;
  };
  payment_options?: {
    cash_only?: number;
    credit_cards?: number;
    debit_cards?: number;
    nfc?: number;
  };
  restaurant_services?: {
    catering?: number;
    delivery?: number;
    groups?: number;
    kids?: number;
    outdoor?: number;
    pickup?: number;
    reserve?: number;
    takeout?: number;
    waiter?: number;
    walkins?: number;
  };
  restaurant_specialties?: {
    breakfast?: number;
    coffee?: number;
    dinner?: number;
    drinks?: number;
    lunch?: number;
  };
  business_hours?: {
    [day: string]: {
      open: string;
      close: string;
    }[];
  };
  is_permanently_closed?: boolean;
  is_always_open?: boolean;
  attire?: string;
  general_info?: string;
  impressum?: string;
  founded?: string;
  company_overview?: string;
  mission?: string;
  products?: string;
  awards?: string;
  booking_agent?: string;
  press_contact?: string;
  genre?: string;
  bio?: string;
  band_interests?: string;
  band_members?: string;
  influences?: string;
  record_label?: string;
  hometown?: string;
  current_location?: string;
  affiliation?: string;
  birthday?: string;
  personal_info?: string;
  personal_interests?: string;
  members?: string;
  built?: string;
  features?: string;
  mpg?: string;
  network?: string;
  pharma_safety_info?: string;
  plot_outline?: string;
  produced_by?: string;
  release_date?: string;
  screenplay_by?: string;
  season?: string;
  starring?: string;
  studio?: string;
  writers?: string;
  directed_by?: string;
  culinary_team?: string;
  general_manager?: string;
  food_styles?: string[];
  checkins?: number;
  talking_about_count?: number;
  were_here_count?: number;
  link?: string;
  username?: string;
  single_line_address?: string;
  can_checkin?: boolean;
  can_post?: boolean;
  is_community_page?: boolean;
  is_published?: boolean;
  has_whatsapp_number?: boolean;
  whatsapp_number?: string;
  delivery_and_pickup_option_info?: string[];
  differently_open_offerings?: {
    ONLINE_SERVICES?: boolean;
    DELIVERY?: boolean;
    PICKUP?: boolean;
    OTHER?: boolean;
  };
  temporary_status?: 'DIFFERENTLY_OPEN' | 'TEMPORARILY_CLOSED' | 'OPERATING_AS_USUAL' | 'NO_DATA';
  pickup_options?: ('CURBSIDE' | 'IN_STORE' | 'OTHER')[];
}

export interface FacebookGraphApiInsights {
  page_impressions?: number;
  page_impressions_unique?: number;
  page_post_engagements?: number;
  page_posts_impressions?: number;
  page_actions_post_reactions_total?: number;
  page_fan_adds?: number;
  page_fan_removes?: number;
  page_views_total?: number;
  page_video_views?: number;
}

export interface FacebookGraphApiError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

export class FacebookGraphApiService {
  private accessToken: string;
  private baseUrl = 'https://graph.facebook.com/v19.0';
  
  constructor() {
    this.accessToken = process.env.FACEBOOK_ACCESS_TOKEN!;
    if (!this.accessToken) {
      throw new Error('Facebook access token is required (FACEBOOK_ACCESS_TOKEN environment variable)');
    }
  }

  /**
   * Get comprehensive Facebook page data by page ID or username
   */
  async getPageData(pageIdentifier: string): Promise<FacebookGraphApiProfile> {
    try {
      logger.info(`[Facebook Graph API] Fetching page data for: ${pageIdentifier}`);

      // Define comprehensive fields to retrieve
      const fields = [
        'id', 'name', 'about', 'description', 'category', 'category_list',
        'location', 'phone', 'website', 'emails', 'hours',
        'is_verified', 'verification_status', 'fan_count', 'followers_count',
        'engagement', 'cover', 'picture', 'rating_count', 'overall_star_rating',
        'price_range', 'parking', 'payment_options', 'restaurant_services',
        'restaurant_specialties', 'is_permanently_closed', 'is_always_open',
        'attire', 'general_info', 'impressum', 'founded', 'company_overview',
        'mission', 'products', 'awards', 'booking_agent', 'press_contact',
        'genre', 'bio', 'band_interests', 'band_members', 'influences',
        'record_label', 'hometown', 'current_location', 'affiliation',
        'birthday', 'personal_info', 'personal_interests', 'members',
        'built', 'features', 'mpg', 'network', 'pharma_safety_info',
        'plot_outline', 'produced_by', 'release_date', 'screenplay_by',
        'season', 'starring', 'studio', 'writers', 'directed_by',
        'culinary_team', 'general_manager', 'food_styles', 'checkins',
        'talking_about_count', 'were_here_count', 'link', 'username',
        'single_line_address', 'can_checkin', 'can_post', 'is_community_page',
        'is_published', 'has_whatsapp_number', 'whatsapp_number',
        'delivery_and_pickup_option_info', 'differently_open_offerings',
        'temporary_status', 'pickup_options'
      ].join(',');

      const url = `${this.baseUrl}/${pageIdentifier}?fields=${fields}&access_token=${this.accessToken}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        const errorInfo = {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        };
        logger.error('[Facebook Graph API] Error response:', undefined, errorInfo);
        throw new Error(`Facebook Graph API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json() as FacebookGraphApiProfile;
      logger.info(`[Facebook Graph API] Successfully fetched data for page: ${data.name} (${data.id})`);
      
      return data;
    } catch (error) {
      logger.error('[Facebook Graph API] Error fetching page data:', error as any);
      throw error;
    }
  }

  /**
   * Get Facebook page insights/analytics data
   */
  async getPageInsights(pageId: string, metrics?: string[], period: 'day' | 'week' | 'days_28' = 'day'): Promise<FacebookGraphApiInsights> {
    try {
      logger.info(`[Facebook Graph API] Fetching insights for page: ${pageId}`);

      const defaultMetrics = [
        'page_impressions',
        'page_impressions_unique', 
        'page_post_engagements',
        'page_posts_impressions',
        'page_actions_post_reactions_total',
        'page_fan_adds',
        'page_fan_removes',
        'page_views_total',
        'page_video_views'
      ];

      const metricsToFetch = metrics || defaultMetrics;
      const metricsParam = metricsToFetch.join(',');
      
      const url = `${this.baseUrl}/${pageId}/insights?metric=${metricsParam}&period=${period}&access_token=${this.accessToken}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        const errorInfo = {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        };
        logger.error('[Facebook Graph API] Insights error response:', undefined, errorInfo);
        
        // If insights aren't available, return empty object instead of throwing
        if (response.status === 400 || response.status === 403) {
          logger.warn('[Facebook Graph API] Insights not available for this page, returning empty data');
          return {};
        }
        
        throw new Error(`Facebook Graph API insights error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json() as any;
      const insights: FacebookGraphApiInsights = {};

      // Parse insights data
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((metric: any) => {
          const name = metric.name;
          const values = metric.values;
          if (values && values.length > 0) {
            insights[name as keyof FacebookGraphApiInsights] = values[values.length - 1].value;
          }
        });
      }

      logger.info(`[Facebook Graph API] Successfully fetched insights for page: ${pageId}`);
      return insights;
    } catch (error) {
      logger.error('[Facebook Graph API] Error fetching page insights:', error);
      // Return empty object if insights fail - not all pages have insights available
      return {};
    }
  }

  /**
   * Search for Facebook pages by query
   */
  async searchPages(query: string, limit: number = 25): Promise<FacebookGraphApiProfile[]> {
    try {
      logger.info(`[Facebook Graph API] Searching pages for query: ${query}`);

      const fields = [
        'id', 'name', 'category', 'location', 'phone', 'website',
        'is_verified', 'verification_status', 'fan_count', 'followers_count',
        'picture', 'link', 'is_permanently_closed', 'single_line_address'
      ].join(',');

      const url = `${this.baseUrl}/pages/search?q=${encodeURIComponent(query)}&fields=${fields}&limit=${limit}&access_token=${this.accessToken}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        const errorInfo = {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        };
        logger.error('[Facebook Graph API] Search error response:', undefined, errorInfo);
        throw new Error(`Facebook Graph API search error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json() as any;
      const pages = data.data || [];

      logger.info(`[Facebook Graph API] Found ${pages.length} pages for query: ${query}`);
      return pages;
    } catch (error) {
      logger.error('[Facebook Graph API] Error searching pages:', error);
      throw error;
    }
  }

  /**
   * Extract page ID from Facebook URL
   */
  static extractPageIdFromUrl(facebookUrl: string): string | null {
    try {
      // Handle different Facebook URL formats
      const url = new URL(facebookUrl);
      
      // facebook.com/pages/PageName/123456789 format
      const pagesMatch = url.pathname.match(/\/pages\/[^\/]+\/(\d+)/);
      if (pagesMatch) {
        return pagesMatch[1];
      }
      
      // facebook.com/PageName format (we'll return the username)
      const usernameMatch = url.pathname.match(/\/([^\/\?]+)/);
      if (usernameMatch && usernameMatch[1] !== 'pages') {
        return usernameMatch[1];
      }
      
      // facebook.com/profile.php?id=123456789 format
      const profileIdMatch = url.searchParams.get('id');
      if (profileIdMatch) {
        return profileIdMatch;
      }
      
      return null;
    } catch (error) {
      logger.error('[Facebook Graph API] Error extracting page ID from URL:', error);
      return null;
    }
  }

  /**
   * Validate if access token has required permissions
   */
  async validateAccessToken(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/me/permissions?access_token=${this.accessToken}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json() as any;
      const permissions = data.data || [];
      
      // Check for required permissions
      const requiredPermissions = ['pages_read_engagement', 'pages_read_user_content'];
      const grantedPermissions = permissions
        .filter((p: any) => p.status === 'granted')
        .map((p: any) => p.permission);

      const hasRequiredPermissions = requiredPermissions.every(perm => 
        grantedPermissions.includes(perm)
      );

      logger.info('[Facebook Graph API] Access token validation:', {
        hasRequiredPermissions,
        grantedPermissions
      });

      return hasRequiredPermissions;
    } catch (error) {
      logger.error('[Facebook Graph API] Error validating access token:', error);
      return false;
    }
  }

  /**
   * Convert Facebook Graph API data to our internal FacebookBusinessProfile format
   */
  static convertToBusinessProfile(
    graphData: FacebookGraphApiProfile,
    teamId: string,
    facebookUrl: string
  ): Partial<FacebookBusinessProfile> {
    return {
      teamId,
      facebookUrl,
      pageId: graphData.id,
      pageName: graphData.name || '',
      pageUrl: graphData.link || facebookUrl,
      title: graphData.name || '',
      categories: graphData.category_list?.map(cat => cat.name) || (graphData.category ? [graphData.category] : []),
      info: [
        graphData.about,
        graphData.description,
        graphData.general_info,
        graphData.company_overview,
        graphData.mission
      ].filter(Boolean) as string[],
      likes: graphData.fan_count || 0,
      followers: graphData.followers_count || 0,
      phone: graphData.phone || undefined,
      email: graphData.emails?.[0] || undefined,
      websites: graphData.website ? [graphData.website] : [],
      profilePictureUrl: graphData.picture?.data?.url || undefined,
      coverPhotoUrl: graphData.cover?.source || undefined,
      intro: graphData.about || graphData.description || undefined,
      facebookId: graphData.id,
      creationDate: undefined, // Not available in basic profile data
      adStatus: undefined,
      aboutMe: graphData.bio ? { text: graphData.bio } : undefined,
      pageAdLibrary: undefined,
      metadata: {
        graphApiData: graphData as any,
        location: graphData.location,
        hours: graphData.hours,
        verification: {
          isVerified: graphData.is_verified || false,
          status: graphData.verification_status || 'not_verified'
        },
        business: {
          priceRange: graphData.price_range,
          isPermanentlyClosed: graphData.is_permanently_closed || false,
          isAlwaysOpen: graphData.is_always_open || false,
          attire: graphData.attire,
          founded: graphData.founded,
          parking: graphData.parking,
          paymentOptions: graphData.payment_options,
          restaurantServices: graphData.restaurant_services,
          restaurantSpecialties: graphData.restaurant_specialties,
          foodStyles: graphData.food_styles,
          deliveryPickupInfo: graphData.delivery_and_pickup_option_info,
          temporaryStatus: graphData.temporary_status,
          pickupOptions: graphData.pickup_options
        },
        engagement: {
          checkins: graphData.checkins,
          talkingAboutCount: graphData.talking_about_count,
          wereHereCount: graphData.were_here_count,
          ratingCount: graphData.rating_count,
          overallStarRating: graphData.overall_star_rating
        },
        features: {
          canCheckin: graphData.can_checkin,
          canPost: graphData.can_post,
          isCommunityPage: graphData.is_community_page,
          isPublished: graphData.is_published,
          hasWhatsappNumber: graphData.has_whatsapp_number,
          whatsappNumber: graphData.whatsapp_number
        },
        scrapedAt: new Date().toISOString()
      },
      scrapedAt: new Date(),
      updatedAt: new Date()
    };
  }
} 