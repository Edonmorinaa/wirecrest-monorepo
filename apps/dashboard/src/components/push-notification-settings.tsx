'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Switch, 
  FormControlLabel,
  Alert,
  Button,
} from '@mui/material';
import { Iconify } from 'src/components/iconify';
import { 
  getNotificationPermission, 
  requestNotificationPermission,
  isPushNotificationSupported,
  initializePushNotifications,
} from '../utils/pushNotifications';

/**
 * Push Notification Settings Component
 * 
 * Allows users to manage push notification preferences
 * Can be used in settings page or profile page
 */
export function PushNotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize push notifications (registers service worker)
    initializePushNotifications().then((initialized) => {
      console.log('Push notifications initialized:', initialized);
    });
    
    setIsSupported(isPushNotificationSupported());
    setPermission(getNotificationPermission());

    // Check for permission changes
    const interval = setInterval(() => {
      setPermission(getNotificationPermission());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleToggle = async () => {
    if (permission === 'granted') {
      // Can't programmatically revoke, show instructions
      alert('To disable notifications, please change your browser settings:\n\n' +
        'Chrome: Settings > Privacy and Security > Site Settings > Notifications\n' +
        'Firefox: Settings > Privacy & Security > Permissions > Notifications\n' +
        'Safari: Safari > Preferences > Websites > Notifications');
      return;
    }

    setIsLoading(true);
    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);
    } catch (error) {
      console.error('Error toggling notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">
            Push notifications are not supported in your browser
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Iconify icon="solar:bell-bing-bold-duotone" width={32} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Push Notifications</Typography>
            <Typography variant="body2" color="text.secondary">
              Receive browser notifications for important updates
            </Typography>
          </Box>
        </Box>

        {permission === 'denied' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Notifications are blocked. Please enable them in your browser settings.
          </Alert>
        )}

        {permission === 'default' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Click the toggle to enable push notifications
          </Alert>
        )}

        {permission === 'granted' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Push notifications are enabled
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <FormControlLabel
            control={
              <Switch
                checked={permission === 'granted'}
                onChange={handleToggle}
                disabled={isLoading || permission === 'denied'}
              />
            }
            label={permission === 'granted' ? 'Enabled' : 'Disabled'}
          />

          {permission === 'granted' && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                // Test notification
                const testNotification = new Notification('Test Notification', {
                  body: 'Push notifications are working!',
                  icon: '/logo/logo.png',
                });
              }}
            >
              Test Notification
            </Button>
          )}
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          You'll receive notifications for:
        </Typography>
        <Box component="ul" sx={{ mt: 1, pl: 2 }}>
          <Typography component="li" variant="caption" color="text.secondary">
            New negative reviews requiring attention
          </Typography>
          <Typography component="li" variant="caption" color="text.secondary">
            Urgent reviews needing immediate response
          </Typography>
          <Typography component="li" variant="caption" color="text.secondary">
            Rating drops and important metrics changes
          </Typography>
          <Typography component="li" variant="caption" color="text.secondary">
            Review milestones and achievements
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

