

# PageGate Usage Guide

Complete guide for implementing access control on dashboard pages.

## 🎯 Overview

The `PageGate` component provides two-level access control:
1. **Subscription Gate** - Checks if user has active subscription (not demo)
2. **Feature Gate** - Checks if user's plan includes the required feature

## 🚀 Quick Start

### Basic Usage

```tsx
// app/dashboard/teams/[teamId]/google/reviews/page.tsx
import { PageGate } from '@/components/gates/PageGate';
import { Feature } from '@wirecrest/feature-flags';

export default function GoogleReviewsPage({ params }: { params: { teamId: string } }) {
  return (
    <PageGate feature={Feature.Google.Reviews} teamId={params.teamId}>
      {/* Your page content here */}
      <GoogleReviewsComponent />
    </PageGate>
  );
}
```

## 📋 Complete Examples

### Example 1: Google Reviews Page

```tsx
// app/dashboard/teams/[teamId]/google/reviews/page.tsx
'use client';

import { PageGate } from '@/components/gates/PageGate';
import { Feature } from '@wirecrest/feature-flags';
import { Container, Typography, Box } from '@mui/material';

export default function GoogleReviewsPage({ params }: { params: { teamId: string } }) {
  return (
    <PageGate 
      feature={Feature.Google.Reviews} 
      teamId={params.teamId}
    >
      <Container maxWidth="xl">
        <Box py={3}>
          <Typography variant="h4" gutterBottom>
            Google Reviews
          </Typography>
          {/* Your Google Reviews content */}
        </Box>
      </Container>
    </PageGate>
  );
}
```

### Example 2: TikTok Analytics Page

```tsx
// app/dashboard/teams/[teamId]/tiktok/analytics/page.tsx
'use client';

import { PageGate } from '@/components/gates/PageGate';
import { Feature } from '@wirecrest/feature-flags';
import { Container, Typography, Grid, Card, CardContent } from '@mui/material';

export default function TikTokAnalyticsPage({ params }: { params: { teamId: string } }) {
  return (
    <PageGate 
      feature={Feature.TikTok.Analytics} 
      teamId={params.teamId}
    >
      <Container maxWidth="xl">
        <Box py={3}>
          <Typography variant="h4" gutterBottom>
            TikTok Analytics
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Engagement</Typography>
                  {/* Analytics content */}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </PageGate>
  );
}
```

### Example 3: Dashboard Home (No Feature Required)

```tsx
// app/dashboard/teams/[teamId]/page.tsx
'use client';

import { PageGate } from '@/components/gates/PageGate';
import { Container, Typography } from '@mui/material';

export default function DashboardHomePage({ params }: { params: { teamId: string } }) {
  return (
    <PageGate 
      teamId={params.teamId}
      // No feature specified - just checks subscription
    >
      <Container maxWidth="xl">
        <Typography variant="h4">Welcome to Your Dashboard</Typography>
        {/* Dashboard content */}
      </Container>
    </PageGate>
  );
}
```

### Example 4: Allow Demo Mode

```tsx
// app/dashboard/teams/[teamId]/demo-page/page.tsx
'use client';

import { PageGate } from '@/components/gates/PageGate';

export default function DemoAllowedPage({ params }: { params: { teamId: string } }) {
  return (
    <PageGate 
      teamId={params.teamId}
      allowDemo={true} // Demo users can access this page
    >
      <Container>
        <Typography>This page is accessible to demo users</Typography>
      </Container>
    </PageGate>
  );
}
```

### Example 5: No Subscription Required

```tsx
// app/dashboard/teams/[teamId]/settings/page.tsx
'use client';

import { PageGate } from '@/components/gates/PageGate';

export default function SettingsPage({ params }: { params: { teamId: string } }) {
  return (
    <PageGate 
      teamId={params.teamId}
      requireSubscription={false} // Don't check subscription
    >
      <Container>
        <Typography>Team Settings</Typography>
        {/* Settings content */}
      </Container>
    </PageGate>
  );
}
```

### Example 6: Inline Feature Gate (Within a Page)

```tsx
// For gating specific sections within a page
import { InlineFeatureGate } from '@/components/gates/PageGate';
import { Feature } from '@wirecrest/feature-flags';

export default function DashboardPage({ params }: { params: { teamId: string } }) {
  return (
    <PageGate teamId={params.teamId}>
      <Container>
        <Typography variant="h4">Dashboard</Typography>
        
        {/* Basic content available to all */}
        <BasicStats />
        
        {/* Advanced analytics only for users with feature */}
        <InlineFeatureGate 
          feature={Feature.Instagram.Analytics} 
          teamId={params.teamId}
        >
          <AdvancedAnalytics />
        </InlineFeatureGate>
      </Container>
    </PageGate>
  );
}
```

## 🎨 What Users See

### 1. No Subscription
```
┌─────────────────────────────────────────┐
│          💳                             │
│                                         │
│    Subscription Required                │
│                                         │
│    To access this feature, you need     │
│    an active subscription...            │
│                                         │
│    [View Plans]  [Go to Dashboard]     │
│                                         │
│    Need help choosing a plan?           │
└─────────────────────────────────────────┘
```

### 2. Demo Mode
```
┌─────────────────────────────────────────┐
│          🔒 DEMO                        │
│                                         │
│    Upgrade to Full Access               │
│                                         │
│    You're currently in demo mode...     │
│                                         │
│    [Upgrade Now]  [Back to Dashboard]  │
└─────────────────────────────────────────┘
```

### 3. Feature Not Available
```
┌─────────────────────────────────────────┐
│          🔒                             │
│                                         │
│    Feature Not Available                │
│                                         │
│    The Google Reviews feature is not    │
│    included in your current plan.       │
│                                         │
│    [View Plans & Upgrade]  [Back]      │
└─────────────────────────────────────────┘
```

### 4. Inactive Subscription
```
┌─────────────────────────────────────────┐
│          💳                             │
│                                         │
│    Payment Required                     │
│                                         │
│    Your payment is past due...          │
│                                         │
│    [Manage Billing]  [Go to Dashboard] │
└─────────────────────────────────────────┘
```

## 🔧 Props Reference

### PageGate Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `feature` | `FeatureKey` | `undefined` | The feature key to check (optional) |
| `teamId` | `string` | required | The team ID for access checks |
| `children` | `ReactNode` | required | Content to show when access granted |
| `requireSubscription` | `boolean` | `true` | Whether to check subscription status |
| `allowDemo` | `boolean` | `false` | Whether to allow demo mode users |

### InlineFeatureGate Props

| Prop | Type | Description |
|------|------|-------------|
| `feature` | `FeatureKey` | The feature key to check |
| `teamId` | `string` | The team ID |
| `children` | `ReactNode` | Content to show when feature available |

## 📦 Available Features

```typescript
import { Feature } from '@wirecrest/feature-flags';

// Google
Feature.Google.Overview
Feature.Google.Reviews

// Facebook
Feature.Facebook.Overview
Feature.Facebook.Reviews

// TripAdvisor
Feature.TripAdvisor.Overview
Feature.TripAdvisor.Reviews

// Booking
Feature.Booking.Overview
Feature.Booking.Reviews

// Instagram
Feature.Instagram.Overview
Feature.Instagram.Analytics

// TikTok
Feature.TikTok.Overview
Feature.TikTok.Analytics
```

## 🎯 Migration Guide

### Before (No Access Control)

```tsx
export default function MyPage({ params }) {
  return (
    <Container>
      <Typography>My Content</Typography>
    </Container>
  );
}
```

### After (With Access Control)

```tsx
import { PageGate } from '@/components/gates/PageGate';
import { Feature } from '@wirecrest/feature-flags';

export default function MyPage({ params }) {
  return (
    <PageGate 
      feature={Feature.Google.Reviews} 
      teamId={params.teamId}
    >
      <Container>
        <Typography>My Content</Typography>
      </Container>
    </PageGate>
  );
}
```

## 🏗️ Architecture

```
User visits page
      ↓
PageGate Component
      ↓
Level 1: Subscription Check
├─ No subscription → Show "Subscription Required"
├─ Demo mode (not allowed) → Show "Upgrade to Full Access"
├─ Inactive subscription → Show "Payment Required"
└─ Active subscription → Continue
      ↓
Level 2: Feature Check (if feature specified)
├─ Feature not in plan → Show "Feature Not Available"
└─ Feature available → Render children
      ↓
User sees page content
```

## 🔐 Security Notes

1. **Always use PageGate** on pages with sensitive content
2. **Server-side validation** - PageGate is client-side, ensure API routes also check access
3. **Feature checks** are cached for 5 minutes for performance
4. **Subscription checks** happen on every page load

## 🎨 Customizing UI

All gate screens use Material-UI components matching your app's design:
- Cards, Typography, Buttons from @mui/material
- Icons from @mui/icons-material
- Consistent spacing and colors
- Responsive layout

## 📝 Best Practices

1. **Wrap entire page content** in PageGate, not individual components
2. **Use InlineFeatureGate** for smaller sections within pages
3. **Specify feature** for platform-specific pages
4. **Allow demo mode** only for onboarding/tutorial pages
5. **Test all gate scenarios** (no sub, demo, inactive, no feature)

## 🐛 Troubleshooting

### Gate always shows "No subscription"
- Check `useSubscriptionStatus` hook is fetching data
- Verify `/api/teams/[teamId]/subscription` route exists
- Check database has subscription record

### Feature always shows "Not Available"
- Verify feature is attached to product in Stripe
- Check webhook is working to sync changes
- Verify team has active subscription

### Loading state never ends
- Check API route is responding
- Verify network requests in browser devtools
- Check for errors in console

## 🚀 Next Steps

1. Wrap all your dashboard pages with `PageGate`
2. Test with different subscription states
3. Customize gate messages if needed
4. Add analytics tracking for gate views
5. Monitor conversion from gate screens to upgrades

