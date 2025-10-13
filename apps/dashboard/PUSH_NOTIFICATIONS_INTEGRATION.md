# Push Notifications Integration

## Quick Start

To integrate push notifications into your dashboard, follow these steps:

### 1. Add the Prompt Component

Find your root layout or main app component and add the `PushNotificationPrompt`:

**Option A: In your root layout (recommended)**
```tsx
// Example: src/layouts/main/layout.tsx or similar
import { PushNotificationPrompt } from 'src/components/push-notification-prompt';

export function MainLayout({ children }) {
  return (
    <div>
      {children}
      <PushNotificationPrompt />
    </div>
  );
}
```

**Option B: In your main dashboard page**
```tsx
// Example: src/pages/dashboard.tsx or src/app/dashboard/page.tsx
import { PushNotificationPrompt } from 'src/components/push-notification-prompt';

export default function DashboardPage() {
  return (
    <div>
      {/* Your dashboard content */}
      <PushNotificationPrompt />
    </div>
  );
}
```

### 2. (Optional) Add Settings Component

If you have a settings or profile page, add the settings component:

```tsx
// Example: src/pages/settings.tsx
import { PushNotificationSettings } from 'src/components/push-notification-settings';

export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <PushNotificationSettings />
    </div>
  );
}
```

### 3. Verify Service Worker

The service worker (`public/sw.js`) is automatically registered. Verify it's working:

1. Open DevTools → Application tab
2. Go to Service Workers section
3. You should see `/sw.js` registered

### 4. Test It!

**Test Flow:**
1. Visit the dashboard
2. You'll see a prompt at bottom-right: "Enable Notifications"
3. Click "Enable" → Browser will ask for permission
4. Grant permission
5. Trigger a test notification from settings page, OR
6. Wait for a real notification event (negative review, rating drop, etc.)

## That's it! 🎉

Push notifications are now fully integrated. When users receive notifications through the system, they'll automatically get browser push notifications if they've granted permission.

## What Happens Now?

When a notification event occurs:
1. The scraper creates a notification → Saved to DB
2. Supabase Realtime broadcasts the event
3. `useNotifications` hook receives the event
4. If permission granted → Browser notification shows
5. User clicks notification → Dashboard opens/focuses

## Files You May Want to Customize

### Notification Icon
Edit `src/utils/pushNotifications.ts`:
```typescript
// Change default icon
icon: options.icon || '/your-icon.png',
```

### Prompt Text
Edit `src/components/push-notification-prompt.tsx`:
```tsx
<div>
  Get instant alerts for new reviews... // ← Change this text
</div>
```

### Which Notifications Trigger Push
Edit `src/hooks/useNotifications.ts`:
```typescript
if (event.event === 'notification_created') {
  // Add filters here if you only want certain types
  if (notification.type === 'urgent') { // Example filter
    showPushNotification(...);
  }
}
```

## Troubleshooting

**Prompt not showing?**
- Check if permission is already granted/denied
- Clear localStorage: `localStorage.removeItem('push-notification-prompt-dismissed')`

**Notifications not appearing?**
- Check permission: Console → `Notification.permission`
- Check service worker: DevTools → Application → Service Workers
- Check browser support: Modern Chrome, Firefox, Safari (iOS 16.4+)

**Need help?**
See `WEB_PUSH_NOTIFICATIONS_GUIDE.md` for detailed documentation.

