'use client';

import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, Alert, Chip } from '@mui/material';
import { Iconify } from 'src/components/iconify';

/**
 * Debug component to check push notification support and status
 */
export function PushNotificationDebug() {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const checkSupport = () => {
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.endsWith('.local') ||
                         window.location.hostname.includes('127.0.0.1');
      
      const info = {
        // Basic support
        hasNotification: 'Notification' in window,
        hasServiceWorker: 'serviceWorker' in navigator,
        hasPushManager: 'PushManager' in window,
        hasNavigator: typeof navigator !== 'undefined',
        
        // Permission
        permission: 'Notification' in window ? Notification.permission : 'not available',
        
        // Service worker
        serviceWorkerSupported: 'serviceWorker' in navigator,
        
        // User agent
        userAgent: navigator.userAgent,
        
        // Protocol
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        isHttps: window.location.protocol === 'https:',
        isLocalhost,
        
        // Overall support
        isSupported: false,
      };
      
      const isSecure = info.isHttps || info.isLocalhost;
      info.isSupported = info.hasNotification && info.hasServiceWorker && info.hasPushManager && isSecure;
      
      setDebugInfo(info);
    };
    
    checkSupport();
  }, []);

  const testServiceWorker = async () => {
    try {
      if (!debugInfo.isHttps && !debugInfo.isLocalhost) {
        alert('Service workers require HTTPS or localhost. Please use https://yourdomain.com or localhost:3000');
        return;
      }
      
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service worker registered:', registration);
        alert('Service worker registered successfully!');
      } else {
        alert('Service workers not supported');
      }
    } catch (error) {
      console.error('Service worker registration failed:', error);
      alert('Service worker registration failed: ' + error.message);
    }
  };

  const testNotification = async () => {
    try {
      if (!debugInfo.isHttps && !debugInfo.isLocalhost) {
        alert('Push notifications require HTTPS or localhost. Please use https://yourdomain.com or localhost:3000');
        return;
      }
      
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification('Test Notification', {
            body: 'This is a test notification!',
            icon: '/logo/logo.png',
          });
        } else {
          alert('Notification permission denied');
        }
      } else {
        alert('Notifications not supported');
      }
    } catch (error) {
      console.error('Notification test failed:', error);
      alert('Notification test failed: ' + error.message);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Iconify icon="solar:bug-bold-duotone" width={32} />
          <Typography variant="h6">Push Notification Debug</Typography>
        </Box>

        <Alert severity={debugInfo.isSupported ? 'success' : 'error'} sx={{ mb: 2 }}>
          {debugInfo.isSupported ? 'Push notifications are supported' : 'Push notifications are NOT supported'}
          {!debugInfo.isHttps && !debugInfo.isLocalhost && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="error">
                <strong>HTTPS Required:</strong> Push notifications require HTTPS or localhost. 
                Please use <code>https://yourdomain.com</code> or <code>localhost:3000</code>
              </Typography>
            </Box>
          )}
        </Alert>

        <Box sx={{ display: 'grid', gap: 2, mb: 3 }}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>Browser Support</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label={`Notification API: ${debugInfo.hasNotification ? '✅' : '❌'}`}
                color={debugInfo.hasNotification ? 'success' : 'error'}
                size="small"
              />
              <Chip 
                label={`Service Worker: ${debugInfo.hasServiceWorker ? '✅' : '❌'}`}
                color={debugInfo.hasServiceWorker ? 'success' : 'error'}
                size="small"
              />
              <Chip 
                label={`Push Manager: ${debugInfo.hasPushManager ? '✅' : '❌'}`}
                color={debugInfo.hasPushManager ? 'success' : 'error'}
                size="small"
              />
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>Permission Status</Typography>
            <Chip 
              label={`Permission: ${debugInfo.permission}`}
              color={debugInfo.permission === 'granted' ? 'success' : debugInfo.permission === 'denied' ? 'error' : 'warning'}
              size="small"
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>Environment</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label={`HTTPS: ${debugInfo.isHttps ? '✅' : '❌'}`}
                color={debugInfo.isHttps ? 'success' : 'error'}
                size="small"
              />
              <Chip 
                label={`Localhost: ${debugInfo.isLocalhost ? '✅' : '❌'}`}
                color={debugInfo.isLocalhost ? 'success' : 'warning'}
                size="small"
              />
              <Chip 
                label={`Protocol: ${debugInfo.protocol}`}
                size="small"
              />
              <Chip 
                label={`Hostname: ${debugInfo.hostname}`}
                size="small"
              />
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>User Agent</Typography>
            <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
              {debugInfo.userAgent}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            onClick={testServiceWorker}
            startIcon={<Iconify icon="solar:settings-bold-duotone" />}
          >
            Test Service Worker
          </Button>
          <Button 
            variant="outlined" 
            onClick={testNotification}
            startIcon={<Iconify icon="solar:bell-bing-bold-duotone" />}
          >
            Test Notification
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
