# @wirecrest/notifications

A comprehensive notification system with multi-scope support (User, Team, SuperRole), real-time delivery via Supabase, and automatic persistence.

## Features

- **Multi-scope notifications**: User-specific, Team-based, and SuperRole (admin) notifications
- **Real-time delivery**: Instant notifications via Supabase Realtime
- **Automatic persistence**: All notifications stored in database
- **Auto-purge**: Configurable expiration for old notifications
- **Type-safe API**: Full TypeScript support

## Installation

```bash
yarn add @wirecrest/notifications
```

## Usage

### Send a Notification

```typescript
import { sendNotification } from '@wirecrest/notifications';

// User notification
await sendNotification({
  type: 'payment',
  scope: 'user',
  userId: 'user-123',
  title: '<p>Payment of <strong>$99.99</strong> received</p>',
  category: 'Billing',
  expiresInDays: 7
});

// Team notification
await sendNotification({
  type: 'project',
  scope: 'team',
  teamId: 'team-456',
  title: '<p><strong>John</strong> updated the project</p>',
  category: 'Project Updates'
});

// Super admin notification
await sendNotification({
  type: 'mail',
  scope: 'super',
  superRole: 'ADMIN',
  title: '<p>New tenant signup requires approval</p>',
  category: 'System'
});
```

### Query Notifications

```typescript
import { 
  getUserNotifications, 
  getTeamNotifications,
  markAsRead,
  markAllAsRead,
  archiveNotification 
} from '@wirecrest/notifications';

// Get user notifications
const notifications = await getUserNotifications('user-123', {
  unreadOnly: true,
  limit: 20
});

// Mark as read
await markAsRead('notification-id');

// Mark all as read for user
await markAllAsRead({ userId: 'user-123' });
```

### Cleanup Expired Notifications

```typescript
import { cleanupExpiredNotifications } from '@wirecrest/notifications';

// Run cleanup (can be used in cron job)
const deleted = await cleanupExpiredNotifications();
console.log(`Deleted ${deleted} expired notifications`);
```

## Notification Types

- `friend` - Friend requests and social interactions
- `project` - Project updates and mentions
- `file` - File uploads and attachments
- `tags` - Tag additions and modifications
- `payment` - Payment and billing notifications
- `order` - Order status updates
- `delivery` - Delivery tracking updates
- `chat` - Chat messages and mentions
- `mail` - Email and message notifications

## Environment Variables

See `ENV_TEMPLATE.md` for complete setup guide.

```bash
# Required for realtime notifications
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://user:pass@host:5432/database

# Required for push notifications
VAPID_PUBLIC_KEY=BCxxxxx...
VAPID_PRIVATE_KEY=xxxxx...
VAPID_SUBJECT=mailto:support@yourdomain.com

# Optional
NOTIFICATION_DEFAULT_EXPIRY_DAYS=30  # Default expiration period
```

## Setup & Troubleshooting

### Quick Start

1. **Run diagnostics** to check your configuration:
   ```bash
   cd packages/notifications
   npx tsx scripts/diagnose-system.ts
   ```

2. **Enable Supabase Realtime** (most common issue):
   - Go to: https://supabase.com/dashboard/project/_/database/replication
   - Enable replication for `Notification` table
   - Enable INSERT, UPDATE, DELETE events

3. **Generate VAPID keys** for push notifications:
   ```bash
   npx web-push generate-vapid-keys
   ```
   Add the output to your `.env` file.

4. **Test the system**:
   ```bash
   npx tsx scripts/test-notifications.ts my-team quick
   ```

### Common Issues

**"Mismatch between server and client bindings for postgres changes"**
- → Supabase Realtime is not enabled. See `TROUBLESHOOTING.md`

**Push notifications not working**
- → VAPID keys not configured. See `ENV_TEMPLATE.md`

**Complete troubleshooting guide**: See `TROUBLESHOOTING.md`

## Documentation

- **TROUBLESHOOTING.md** - Fix common issues
- **ARCHITECTURE.md** - System design and architecture
- **ENV_TEMPLATE.md** - Environment variables setup
- **IMPLEMENTATION_COMPLETE.md** - Latest fixes and updates
- **QUICK_REFERENCE.md** - Quick usage examples
- **USAGE_EXAMPLES.md** - Detailed usage patterns

