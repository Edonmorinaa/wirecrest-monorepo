'use client';

/**
 * Global Notification Listener
 * 
 * This component subscribes to Supabase Realtime postgres_changes for notifications.
 * It does NOT trigger push notifications - those are sent from the server.
 * 
 * This component is intentionally minimal because:
 * - UI updates are handled by useNotifications hook
 * - Push notifications are sent server-side via Web Push API
 * - This just ensures realtime connection is maintained globally
 */

import { useEffect } from 'react';
import { useAuth } from '@wirecrest/auth-next';
import {
  subscribeToTeamNotifications,
  subscribeToSuperNotifications,
  subscribeToUserNotifications,
} from '@wirecrest/notifications';

import { getUserTeamIds } from '../actions/notifications';

/**
 * Global Notification Listener Component
 * 
 * Maintains realtime subscriptions globally. This is intentionally simple because:
 * - useNotifications hook handles UI updates for specific views
 * - Push notifications are sent server-side (not from postgres_changes)
 */
export function GlobalNotificationListener() {
  const { user } = useAuth();

  // Subscribe to all relevant notification channels
  // This keeps the realtime connection alive globally
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    console.log('🔌 GlobalNotificationListener: Setting up global subscriptions for user:', user.id);

    let isMounted = true;
    const unsubscribers: Array<() => void> = [];

    // Minimal event handler - just log for debugging
    const handleNotificationEvent = () => {
      // Do nothing - useNotifications hook handles UI updates
      // Push notifications are sent from server
    };

    const setupSubscriptions = async () => {
      if (!isMounted) return;

      try {
        // Subscribe to personal notifications
        const unsubUser = subscribeToUserNotifications(user.id, handleNotificationEvent);
        unsubscribers.push(unsubUser);

        // Fetch and subscribe to all team notifications
        try {
          const userTeamIds = await getUserTeamIds();
          
          if (!isMounted) return;

          // Subscribe to each team's notifications
          userTeamIds.forEach((teamId) => {
            const unsubTeam = subscribeToTeamNotifications(teamId, handleNotificationEvent);
            unsubscribers.push(unsubTeam);
          });
        } catch (err) {
          console.error('❌ GlobalNotificationListener: Failed to fetch team memberships:', err);
        }

        // Subscribe to super role notifications if applicable
        if (user.superRole && user.superRole !== 'TENANT') {
          const unsubSuper = subscribeToSuperNotifications(user.superRole, handleNotificationEvent);
          unsubscribers.push(unsubSuper);
        }

        console.log(`✅ GlobalNotificationListener: ${unsubscribers.length} channel(s) subscribed`);
      } catch (error) {
        console.error('❌ GlobalNotificationListener: Error setting up subscriptions:', error);
      }
    };

    setupSubscriptions();

    // Cleanup function
    // eslint-disable-next-line consistent-return
    return () => {
      isMounted = false;
      unsubscribers.forEach((unsub) => {
        try {
          unsub();
        } catch (err) {
          console.error('❌ GlobalNotificationListener: Error during unsubscribe:', err);
        }
      });
    };
  }, [user?.id, user?.superRole]);

  return null;
}

