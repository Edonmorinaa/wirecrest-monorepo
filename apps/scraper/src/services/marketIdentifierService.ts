import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
  private supabase: SupabaseClient;

  constructor() {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    console.log(`🔧 MarketIdentifierService constructor - Environment check:`, {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      supabaseUrlPreview: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'undefined'
    });

    if (!supabaseUrl || !supabaseKey) {
      const error = new Error('Missing required Supabase environment variables for MarketIdentifierService');
      console.error('❌ MarketIdentifierService initialization failed:', error);
      throw error;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`✅ MarketIdentifierService Supabase client initialized successfully`);
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

      // Get existing identifier
      console.log(`📋 Checking for existing market identifier...`);
      const { data: existingIdentifier, error: fetchError } = await this.supabase
        .from('BusinessMarketIdentifier')
        .select('*')
        .eq('teamId', teamId)
        .eq('platform', platform)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Error fetching existing market identifier:', fetchError);
        throw new Error(`Failed to fetch existing market identifier: ${fetchError.message}`);
      }

      console.log(`📊 Existing identifier check result:`, {
        found: !!existingIdentifier,
        existing: existingIdentifier,
        fetchError: fetchError?.code
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
      const upsertData = {
        teamId,
        platform,
        identifier: newIdentifier,
        updatedAt: new Date().toISOString()
      };
      
      console.log(`📤 Upsert data:`, upsertData);
      
      const { data: upsertedData, error: upsertError } = await this.supabase
        .from('BusinessMarketIdentifier')
        .upsert(upsertData, {
          onConflict: 'teamId,platform'
        })
        .select()
        .single();

      if (upsertError) {
        console.error('❌ Error upserting market identifier:', upsertError);
        throw new Error(`Failed to update market identifier: ${upsertError.message}`);
      }

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
      const { data, error } = await this.supabase
        .from('BusinessMarketIdentifier')
        .select('*')
        .eq('teamId', teamId)
        .eq('platform', platform)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error getting market identifier:', error);
        return null;
      }

      return data ? {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      } : null;
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
      const { data, error } = await this.supabase
        .from('BusinessMarketIdentifier')
        .select('*')
        .eq('teamId', teamId)
        .order('platform', { ascending: true })
        .order('updatedAt', { ascending: false });

      if (error) {
        console.error('Error getting team market identifiers:', error);
        return [];
      }

      return data?.map(item => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt)
      })) || [];
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
      const { data: existingIdentifier, error: fetchError } = await this.supabase
        .from('BusinessMarketIdentifier')
        .select('*')
        .eq('teamId', teamId)
        .eq('platform', platform)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No rows found
          return false;
        }
        console.error('Error fetching market identifier for deletion:', fetchError);
        return false;
      }

      if (!existingIdentifier) {
        return false;
      }

      // Delete the identifier
      const { error: deleteError } = await this.supabase
        .from('BusinessMarketIdentifier')
        .delete()
        .eq('teamId', teamId)
        .eq('platform', platform);

      if (deleteError) {
        console.error('Error deleting market identifier:', deleteError);
        throw new Error(`Failed to delete market identifier: ${deleteError.message}`);
      }

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