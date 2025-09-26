import { GoogleBusinessMetadata } from '@prisma/client';
import { prisma } from '@wirecrest/db';

export class BusinessMetadataService {
  constructor() {
    // No initialization needed for Prisma
  }

  /**
   * Create metadata for a business profile
   */
  async createBusinessMetadata(
    businessProfileId: string,
    updateFrequencyMinutes: number = 1440,
    isActive: boolean = true
  ): Promise<GoogleBusinessMetadata> {
    try {
      const now = new Date();
      const nextUpdateAt = new Date(now.getTime() + updateFrequencyMinutes * 60 * 1000);

      const data = await prisma.googleBusinessMetadata.create({
        data: {
          businessProfileId,
          updateFrequencyMinutes,
          nextUpdateAt: nextUpdateAt,
          lastUpdateAt: now,
          isActive
        }
      });

      return data;
    } catch (error) {
      console.error('Error creating business metadata:', error);
      throw error;
    }
  }

  /**
   * Get businesses needing update in batches
   */
  async getBusinessesNeedingUpdateBatch(batchSize: number = 30, offset: number = 0): Promise<any[]> {
    try {
      const data = await prisma.googleBusinessProfile.findMany({
        where: {
          userRatingCount: {
            not: null
          },
          metadata: {
            isActive: true,
            OR: [
              { nextUpdateAt: null },
              { nextUpdateAt: { lte: new Date() } }
            ]
          }
        },
        include: {
          metadata: true,
          team: true
        },
        orderBy: {
          metadata: {
            nextUpdateAt: 'asc'
          }
        },
        take: batchSize,
        skip: offset
      });

      return data;
    } catch (error) {
      console.error('Error getting businesses needing update:', error);
      return [];
    }
  }

  /**
   * Get total count of businesses needing update
   */
  async getBusinessesNeedingUpdateCount(): Promise<number> {
    try {
      const count = await prisma.googleBusinessProfile.count({
        where: {
          userRatingCount: {
            not: null
          },
          metadata: {
            isActive: true,
            OR: [
              { nextUpdateAt: null },
              { nextUpdateAt: { lte: new Date() } }
            ]
          }
        }
      });

      return count;
    } catch (error) {
      console.error('Error getting businesses count:', error);
      return 0;
    }
  }

  /**
   * Get Facebook businesses needing update in batches
   */
  async getFacebookBusinessesNeedingUpdateBatch(batchSize: number = 30, offset: number = 0): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('FacebookBusinessProfile')
        .select(`
          *,
          FacebookBusinessMetadata(*),
          Team(*)
        `)
        .not('reviewsCount', 'is', null)
        .eq('FacebookBusinessMetadata.isActive', true)
        .or('FacebookBusinessMetadata.nextUpdateAt.is.null,FacebookBusinessMetadata.nextUpdateAt.lte.now()')
        .order('FacebookBusinessMetadata.nextUpdateAt', { ascending: true, nullsFirst: true })
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error getting Facebook businesses needing update:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting Facebook businesses needing update:', error);
      return [];
    }
  }

  /**
   * Get recent businesses for a team
   */
  async getRecentBusinessesForTeam(teamId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('GoogleBusinessProfile')
        .select(`
          *,
          GoogleBusinessMetadata(*)
        `)
        .eq('teamId', teamId)
        .order('createdAt', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting recent businesses for team:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting recent businesses for team:', error);
      return [];
    }
  }

  /**
   * Update business metadata after scraping
   */
  async updateBusinessAfterScraping(businessId: string): Promise<void> {
    try {
      const now = new Date();
      
      // Get current metadata to determine next update time
      const { data: metadata, error: fetchError } = await this.supabase
        .from('GoogleBusinessMetadata')
        .select('updateFrequencyMinutes')
        .eq('businessProfileId', businessId)
        .single();

      if (fetchError) {
        console.error('Error getting business metadata:', fetchError);
        return;
      }

      const updateFrequencyMinutes = metadata?.updateFrequencyMinutes || 1440;
      const nextUpdateAt = new Date(now.getTime() + updateFrequencyMinutes * 60 * 1000);

      // Update metadata
      const { error: updateError } = await this.supabase
        .from('GoogleBusinessMetadata')
        .update({
          lastUpdateAt: now.toISOString(),
          nextUpdateAt: nextUpdateAt.toISOString()
        })
        .eq('businessProfileId', businessId);

      if (updateError) {
        console.error('Error updating business metadata:', updateError);
      }

    } catch (error) {
      console.error('Error updating business after scraping:', error);
    }
  }

  /**
   * Set business active/inactive status
   */
  async setBusinessActive(businessId: string, isActive: boolean): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('GoogleBusinessMetadata')
        .update({ isActive })
        .eq('businessProfileId', businessId);

      if (error) {
        console.error('Error setting business active status:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error setting business active status:', error);
      throw error;
    }
  }

  /**
   * Delete business metadata
   */
  async deleteBusinessMetadata(businessId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('GoogleBusinessMetadata')
        .delete()
        .eq('businessProfileId', businessId);

      if (error) {
        console.error('Error deleting business metadata:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting business metadata:', error);
      throw error;
    }
  }

  /**
   * Get business metadata by business ID
   */
  async getBusinessMetadata(businessId: string): Promise<GoogleBusinessMetadata | null> {
    try {
      const { data, error } = await this.supabase
        .from('GoogleBusinessMetadata')
        .select('*')
        .eq('businessProfileId', businessId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error getting business metadata:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting business metadata:', error);
      return null;
    }
  }

  /**
   * Get businesses needing update with their team limits
   */
  async getBusinessesWithTeamLimits(batchSize: number = 30, offset: number = 0): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('GoogleBusinessProfile')
        .select(`
          id,
          teamId,
          placeId,
          title,
          GoogleBusinessMetadata(
            updateFrequencyMinutes,
            nextUpdateAt,
            lastUpdateAt,
            isActive
          ),
          Team(
            maxReviewsPerBusiness,
            isActive
          )
        `)
        .not('reviewsCount', 'is', null)
        .eq('GoogleBusinessMetadata.isActive', true)
        .eq('Team.isActive', true)
        .or('GoogleBusinessMetadata.nextUpdateAt.is.null,GoogleBusinessMetadata.nextUpdateAt.lte.now()')
        .order('GoogleBusinessMetadata.nextUpdateAt', { ascending: true, nullsFirst: true })
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error getting businesses with team limits:', error);
        return [];
      }

      // Transform the data to match expected format
      return (data || []).map((business: any) => ({
        businessId: business.id,
        teamId: business.teamId,
        maxReviewsPerBusiness: business.Team?.maxReviewsPerBusiness || 2000,
        placeId: business.placeId,
        title: business.title
      }));
    } catch (error) {
      console.error('Error getting businesses with team limits:', error);
      return [];
    }
  }

  /**
   * Update next update time for a business (used by polling service)
   */
  async updateNextUpdateTime(businessId: string): Promise<void> {
    try {
      const now = new Date();
      
      // Get current metadata to determine next update time
      const { data: metadata, error: fetchError } = await this.supabase
        .from('GoogleBusinessMetadata')
        .select('updateFrequencyMinutes')
        .eq('businessProfileId', businessId)
        .single();

      if (fetchError) {
        console.error('Error getting business metadata for update:', fetchError);
        return;
      }

      const updateFrequencyMinutes = metadata?.updateFrequencyMinutes || 1440;
      const nextUpdateAt = new Date(now.getTime() + updateFrequencyMinutes * 60 * 1000);

      // Update metadata
      const { error: updateError } = await this.supabase
        .from('GoogleBusinessMetadata')
        .update({
          nextUpdateAt: nextUpdateAt.toISOString()
        })
        .eq('businessProfileId', businessId);

      if (updateError) {
        console.error('Error updating next update time:', updateError);
      }

    } catch (error) {
      console.error('Error updating next update time:', error);
    }
  }

  async close(): Promise<void> {
    // Prisma client doesn't need explicit closing in this context
  }
} 