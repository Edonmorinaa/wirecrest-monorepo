'use client';

/**
 * Notifications Hook
 * 
 * Provides real-time notifications with Supabase integration.
 */

import type { Notification, NotificationRealtimeEvent } from '@wirecrest/notifications';

import { useAuth } from '@wirecrest/auth-next';
import { useState, useEffect, useCallback } from 'react';
import {
  subscribeToTeamNotifications,
  subscribeToUserNotifications,
  subscribeToSuperNotifications,
} from '@wirecrest/notifications';

import { trpc } from 'src/lib/trpc/client';

interface UseNotificationsOptions {
  scope?: 'user' | 'team' | 'super';
  teamId?: string;
  autoFetch?: boolean;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archiveNotification: (notificationId: string) => Promise<void>;
}

export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const { scope = 'user', teamId, autoFetch = true } = options;
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => n.isUnRead).length;

  // Fetch notifications using tRPC
  const { data: fetchedNotifications, isLoading: isFetching, refetch } = trpc.notifications.fetchUser.useQuery(
    { unreadOnly: false, limit: 100 },
    {
      enabled: !!user && scope === 'user',
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  );

  const { data: fetchedTeamNotifications, isLoading: isFetchingTeam } = trpc.notifications.fetchTeam.useQuery(
    { teamId: teamId!, unreadOnly: false, limit: 100 },
    {
      enabled: !!user && scope === 'team' && !!teamId,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  );

  // Update local state when tRPC data arrives
  useEffect(() => {
    if (scope === 'user' && fetchedNotifications) {
      setNotifications(fetchedNotifications);
      setIsLoading(false);
      console.log(`✅ Loaded ${fetchedNotifications.length} notifications from database via tRPC`);
    } else if (scope === 'team' && fetchedTeamNotifications) {
      setNotifications(fetchedTeamNotifications);
      setIsLoading(false);
      console.log(`✅ Loaded ${fetchedTeamNotifications.length} team notifications from database via tRPC`);
    }
  }, [fetchedNotifications, fetchedTeamNotifications, scope]);

  // Handle real-time notification events from postgres_changes
  const handleRealtimeEvent = useCallback(
    (event: NotificationRealtimeEvent) => {
      console.log('📡 Realtime event received:', {
        event: event.event,
        notificationId: event.notification?.id,
        scope: event.notification?.scope,
        teamId: event.notification?.teamId,
        userId: event.notification?.userId,
        title: event.notification?.title,
      });

      if (event.event === 'notification_created') {
        // Add new notification to the top (no deduplication needed with postgres_changes only)
        console.log('🔔 Adding new notification to UI:', event.notification.title);
        setNotifications((prev) => {
          const newList = [event.notification, ...prev];
          console.log(`📊 Notification count: ${prev.length} → ${newList.length}`);
          return newList;
        });
        
        // Note: Push notifications are handled by GlobalNotificationListener
      } else if (event.event === 'notification_updated') {
        console.log('📝 Notification updated:', event.notification.id);
        // Update existing notification
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === event.notification.id ? event.notification : n
          )
        );
      } else if (event.event === 'notification_deleted') {
        console.log('🗑️ Notification deleted:', event.notification.id);
        // Remove deleted notification
        setNotifications((prev) =>
          prev.filter((n) => n.id !== event.notification.id)
        );
      }
    },
    []
  );

  // Subscribe to real-time updates (including ALL user's teams)
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const unsubscribers: Array<() => void> = [];

    const setupSubscriptions = async () => {
      if (!isMounted) return;

      if (scope === 'user' && user.id) {
        // Subscribe to personal notifications
        console.log(`🔌 Setting up personal notifications for user: ${user.id}`);
        const unsubUser = subscribeToUserNotifications(
          user.id,
          handleRealtimeEvent
        );
        unsubscribers.push(unsubUser);

        // Fetch user's teams using tRPC and subscribe to their notifications
        try {
          console.log('🔍 Fetching user team memberships via tRPC...');
          // Note: Using teams.list to get team IDs
          // We'll need to call this directly since we're in useEffect
          const teamsResponse = await fetch('/api/trpc/teams.list');
          const teamsData = await teamsResponse.json();
          // Handle both possible response formats from tRPC
          const teams = teamsData.result?.data || teamsData.result || [];
          const userTeamIds = (Array.isArray(teams) ? teams : []).map((t: any) => t.id);
          console.log(`📋 Found ${userTeamIds.length} team(s):`, userTeamIds);
          
          if (!isMounted) return;

          // Subscribe to each team's notifications
          userTeamIds.forEach((userTeamId: string) => {
            const unsubTeam = subscribeToTeamNotifications(
              userTeamId,
              handleRealtimeEvent
            );
            unsubscribers.push(unsubTeam);
            console.log(`✅ Subscribed to team notifications: ${userTeamId}`);
          });

          console.log(`🎉 All subscriptions ready! Total channels: ${unsubscribers.length}`);
        } catch (err) {
          console.error('❌ Failed to fetch team memberships:', err);
        }
      } else if (scope === 'team' && teamId) {
        const unsubTeam = subscribeToTeamNotifications(teamId, handleRealtimeEvent);
        unsubscribers.push(unsubTeam);
      } else if (scope === 'super' && user.superRole && user.superRole !== 'TENANT') {
        const unsubSuper = subscribeToSuperNotifications(
          user.superRole,
          handleRealtimeEvent
        );
        unsubscribers.push(unsubSuper);
      }
    };

    // Start subscription setup
    setupSubscriptions();

    // Cleanup function - unsubscribe from all channels
    // eslint-disable-next-line consistent-return
    return () => {
      isMounted = false;
      console.log(`🔌 Cleaning up ${unsubscribers.length} notification subscription(s)`);
      unsubscribers.forEach((unsub) => {
        try {
          unsub();
        } catch (err) {
          console.error('Error during unsubscribe:', err);
        }
      });
    };
  }, [user, scope, teamId, handleRealtimeEvent]);

  // tRPC mutations for notification actions
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetch(); // Refresh notifications
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const archiveMutation = trpc.notifications.archive.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markAsReadMutation.mutateAsync({ notificationId });
      
      // Optimistically update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isUnRead: false } : n
        )
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
      throw err;
    }
  }, [markAsReadMutation]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadMutation.mutateAsync({ scope, teamId });
      
      // Optimistically update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isUnRead: false }))
      );
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      throw err;
    }
  }, [scope, teamId, markAllAsReadMutation]);

  // Archive notification
  const archiveNotification = useCallback(async (notificationId: string) => {
    try {
      await archiveMutation.mutateAsync({ notificationId });
      
      // Optimistically update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isArchived: true } : n
        )
      );
    } catch (err) {
      console.error('Failed to archive:', err);
      throw err;
    }
  }, [archiveMutation]);

  return {
    notifications,
    unreadCount,
    isLoading: isLoading || isFetching || isFetchingTeam,
    error,
    refresh: refetch,
    markAsRead,
    markAllAsRead,
    archiveNotification,
  };
}

