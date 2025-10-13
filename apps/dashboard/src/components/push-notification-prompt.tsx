'use client';

import { useState, useEffect } from 'react';

import { Button } from '@mui/material';

import { Iconify } from 'src/components/iconify';

import {
  getNotificationPermission,
  initializePushNotifications,
  requestNotificationPermission,
} from '../utils/pushNotifications';

/**
 * Push Notification Permission Prompt
 * 
 * Shows a banner prompting users to enable push notifications
 * Only displays if permission is in 'default' state
 */
export function PushNotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isHidden, setIsHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize push notifications on mount
    initializePushNotifications();
    
    // Check current permission
    const currentPermission = getNotificationPermission();
    setPermission(currentPermission);

    // Listen for permission changes
    const checkPermission = () => {
      const newPermission = getNotificationPermission();
      setPermission(newPermission);
    };

    // Check periodically (some browsers don't fire events on permission change)
    const interval = setInterval(checkPermission, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);
      
      if (newPermission === 'granted') {
        // Hide prompt after successful grant
        setTimeout(() => setIsHidden(true), 2000);
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsHidden(true);
    // Store in localStorage to not show again for this session
    localStorage.setItem('push-notification-prompt-dismissed', 'true');
  };

  // Don't show if:
  // - Already granted or denied
  // - User dismissed it
  // - Stored as dismissed in localStorage
  if (
    permission !== 'default' ||
    isHidden ||
    typeof window !== 'undefined' &&
    localStorage.getItem('push-notification-prompt-dismissed') === 'true'
  ) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999,
        backgroundColor: 'var(--palette-background-paper)',
        border: '1px solid var(--palette-divider)',
        borderRadius: 12,
        padding: '16px 20px',
        boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
        maxWidth: 400,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Iconify icon="solar:bell-bing-bold-duotone" width={40} sx={{ color: 'primary.main' }} />
      
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          Enable Notifications
        </div>
        <div style={{ fontSize: 14, color: 'var(--palette-text-secondary)' }}>
          Get instant alerts for new reviews, ratings, and important updates
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button
          variant="text"
          size="small"
          onClick={handleDismiss}
          sx={{ minWidth: 'auto' }}
        >
          Later
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleEnableNotifications}
          disabled={isLoading}
          startIcon={<Iconify icon="solar:bell-bing-bold-duotone" width={20} />}
        >
          {isLoading ? 'Enabling...' : 'Enable'}
        </Button>
      </div>
    </div>
  );
}

