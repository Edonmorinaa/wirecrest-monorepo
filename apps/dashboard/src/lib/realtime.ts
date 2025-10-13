import { supabase, REALTIME_EVENTS, REALTIME_CHANNELS } from './supabase';

// Server-side real-time broadcasting utilities
export class RealtimeBroadcaster {
  
  // Broadcast tenant list updates
  static async broadcastTenantsUpdate(data: any) {
    try {
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.log('Supabase not configured, skipping broadcast');
        return;
      }

      await supabase.channel(REALTIME_CHANNELS.TENANTS).send({
        type: 'broadcast',
        event: REALTIME_EVENTS.TENANT_UPDATED,
        payload: data,
      });
    } catch (error) {
      console.error('Failed to broadcast tenants update:', error);
    }
  }

  // Broadcast specific tenant detail updates
  static async broadcastTenantDetailUpdate(tenantId: string, data: any) {
    try {
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        return;
      }

      await supabase.channel(REALTIME_CHANNELS.TENANT_DETAIL(tenantId)).send({
        type: 'broadcast',
        event: REALTIME_EVENTS.TENANT_UPDATED,
        payload: { tenantId, ...data },
      });
    } catch (error) {
      console.error(`Failed to broadcast tenant ${tenantId} update:`, error);
    }
  }

  // Broadcast business task updates
  static async broadcastBusinessTaskUpdate(tenantId: string, platform: string, taskData: any) {
    try {
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        return;
      }

      const payload = {
        tenantId,
        platform,
        ...taskData,
      };

      // Broadcast to both tenant-specific and general channels
      await Promise.all([
        supabase.channel(REALTIME_CHANNELS.TENANT_DETAIL(tenantId)).send({
          type: 'broadcast',
          event: REALTIME_EVENTS.BUSINESS_TASK_UPDATED,
          payload,
        }),
        supabase.channel(REALTIME_CHANNELS.BUSINESS_TASKS).send({
          type: 'broadcast',
          event: REALTIME_EVENTS.BUSINESS_TASK_UPDATED,
          payload,
        }),
      ]);
    } catch (error) {
      console.error('Failed to broadcast business task update:', error);
    }
  }

  // Broadcast market identifier updates
  static async broadcastMarketIdentifierUpdate(tenantId: string, platform: string, identifier: string, dataDeleted: boolean = false) {
    try {
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        return;
      }

      const payload = {
        tenantId,
        platform,
        identifier,
        dataDeleted,
        timestamp: new Date().toISOString(),
      };

      await Promise.all([
        supabase.channel(REALTIME_CHANNELS.TENANT_DETAIL(tenantId)).send({
          type: 'broadcast',
          event: REALTIME_EVENTS.MARKET_IDENTIFIER_UPDATED,
          payload,
        }),
        supabase.channel(REALTIME_CHANNELS.MARKET_IDENTIFIERS).send({
          type: 'broadcast',
          event: REALTIME_EVENTS.MARKET_IDENTIFIER_UPDATED,
          payload,
        }),
      ]);
    } catch (error) {
      console.error('Failed to broadcast market identifier update:', error);
    }
  }

  // Broadcast platform status changes
  static async broadcastPlatformStatusChange(tenantId: string, platform: string, status: string, metadata?: any) {
    try {
      const payload = {
        tenantId,
        platform,
        status,
        metadata,
        timestamp: new Date().toISOString(),
      };

      await Promise.all([
        supabase.channel(REALTIME_CHANNELS.TENANT_DETAIL(tenantId)).send({
          type: 'broadcast',
          event: REALTIME_EVENTS.PLATFORM_STATUS_CHANGED,
          payload,
        }),
        supabase.channel(REALTIME_CHANNELS.TENANTS).send({
          type: 'broadcast',
          event: REALTIME_EVENTS.PLATFORM_STATUS_CHANGED,
          payload,
        }),
      ]);
    } catch (error) {
      console.error('Failed to broadcast platform status change:', error);
    }
  }

  // Broadcast stats updates
  static async broadcastStatsUpdate(stats: any) {
    try {
      await supabase.channel(REALTIME_CHANNELS.TENANTS).send({
        type: 'broadcast',
        event: REALTIME_EVENTS.STATS_UPDATED,
        payload: { stats, timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error('Failed to broadcast stats update:', error);
    }
  }
} 