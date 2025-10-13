# Quick Start Guide - Hierarchical Feature Gating

This guide shows how to use the hierarchical feature gating system in your dashboard and scraper apps.

## 🚀 Basic Setup

### 1. Wrap your app with the provider

```tsx
// apps/dashboard/src/app/layout.tsx
import { GateProvider } from '@wirecrest/billing';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <GateProvider>
          {children}
        </GateProvider>
      </body>
    </html>
  );
}
```

### 2. Create page-level gates

```tsx
// apps/dashboard/src/app/analytics/page.tsx
import { PageGate } from '@wirecrest/billing';
import { AnalyticsFeature } from '@wirecrest/billing';

export default function AnalyticsPage({ teamId }: { teamId: string }) {
  return (
    <PageGate
      pageId="analytics-page"
      teamId={teamId}
      features={AnalyticsFeature.BASIC_ANALYTICS}
      fallback={<AnalyticsUpgradePrompt />}
    >
      <AnalyticsContent teamId={teamId} />
    </PageGate>
  );
}
```

### 3. Create component-level gates

```tsx
// apps/dashboard/src/components/AnalyticsSection.tsx
import { FeatureGate } from '@wirecrest/billing';
import { AnalyticsFeature } from '@wirecrest/billing';

export function AnalyticsSection({ teamId }: { teamId: string }) {
  return (
    <FeatureGate
      teamId={teamId}
      features={AnalyticsFeature.ADVANCED_ANALYTICS}
      fallback={<FeatureUpgradePrompt />}
    >
      <AdvancedAnalyticsComponent />
    </FeatureGate>
  );
}
```

## 📚 API Reference

### Main Components

#### `GateProvider`
Context provider that manages all gate states. Must wrap your entire app.

```tsx
<GateProvider>
  <YourApp />
</GateProvider>
```

#### `PageGate`
Top-level gate for pages/sections. This is the only way to start a gate hierarchy.

```tsx
<PageGate
  pageId="unique-page-id"
  teamId={teamId}
  features={FeatureFlag | FeatureFlag[]}
  fallback={<UpgradePrompt />}
>
  <PageContent />
</PageGate>
```

#### `FeatureGate`
Component gate that automatically inherits from parent gates. No pageId needed!

```tsx
<FeatureGate
  teamId={teamId}
  features={FeatureFlag | FeatureFlag[]}
  fallback={<UpgradePrompt />}
>
  <ComponentContent />
</FeatureGate>
```

## 🎯 Usage Patterns

### 1. Simple Page with Components

```tsx
function Dashboard({ teamId }: { teamId: string }) {
  return (
    <PageGate
      pageId="dashboard"
      teamId={teamId}
      features={PlatformFeature.GOOGLE_REVIEWS}
      fallback={<DashboardUpgradePrompt />}
    >
      <GoogleReviewsSection teamId={teamId} />
      <AnalyticsSection teamId={teamId} />
    </PageGate>
  );
}

function GoogleReviewsSection({ teamId }: { teamId: string }) {
  return (
    <FeatureGate
      teamId={teamId}
      features={PlatformFeature.GOOGLE_REVIEWS}
      fallback={<FeatureUpgradePrompt />}
    >
      <GoogleReviewsComponent />
    </FeatureGate>
  );
}
```

### 2. Multi-Level Hierarchy

```tsx
function ComplexDashboard({ teamId }: { teamId: string }) {
  return (
    <PageGate
      pageId="reviews-section"
      teamId={teamId}
      features={[PlatformFeature.GOOGLE_REVIEWS, PlatformFeature.FACEBOOK_REVIEWS]}
      requireAll={false}
      fallback={<SectionUpgradePrompt />}
    >
      <GoogleReviewsSubsection teamId={teamId} />
      <FacebookReviewsSubsection teamId={teamId} />
    </PageGate>
  );
}

function GoogleReviewsSubsection({ teamId }: { teamId: string }) {
  return (
    <FeatureGate
      teamId={teamId}
      features={PlatformFeature.GOOGLE_REVIEWS}
      fallback={<SubsectionUpgradePrompt />}
    >
      <GoogleReviewsComponent />
    </FeatureGate>
  );
}
```

### 3. Navigation with Gate Status

```tsx
import { usePageGateStatus } from '@wirecrest/billing';

function Navigation({ teamId }: { teamId: string }) {
  const analyticsOpen = usePageGateStatus('analytics-page');
  const integrationsOpen = usePageGateStatus('integrations-page');

  return (
    <nav>
      <ul>
        <li><a href="/dashboard">Dashboard</a></li>
        {analyticsOpen && <li><a href="/analytics">Analytics</a></li>}
        {integrationsOpen && <li><a href="/integrations">Integrations</a></li>}
      </ul>
    </nav>
  );
}
```

## 🔧 Advanced Features

### Programmatic Gate Control

```tsx
import { usePageGateControl } from '@wirecrest/billing';

function AdminPanel({ teamId }: { teamId: string }) {
  const analyticsControl = usePageGateControl('analytics-page');

  return (
    <div>
      <h2>Gate Control</h2>
      <button onClick={analyticsControl.toggleGate}>
        {analyticsControl.isOpen ? 'Close' : 'Open'} Analytics
      </button>
    </div>
  );
}
```

### Gate Status Monitoring

```tsx
import { useAllPageGates } from '@wirecrest/billing';

function GateMonitor() {
  const allGates = useAllPageGates();
  
  return (
    <div>
      <h3>Gate Status</h3>
      <ul>
        {Array.from(allGates.entries()).map(([pageId, isOpen]) => (
          <li key={pageId}>
            {pageId}: {isOpen ? 'Open' : 'Closed'}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## 🎨 Styling

The system provides CSS classes for different gate states:

```css
/* Parent gate closed */
.parent-gate-closed {
  opacity: 0.5;
  pointer-events: none;
}

.gate-message {
  text-align: center;
  padding: 2rem;
  background: #f5f5f5;
  border-radius: 8px;
}

/* Upgrade prompts */
.upgrade-prompt {
  padding: 1rem;
  border: 2px dashed #ccc;
  border-radius: 8px;
  text-align: center;
}
```

## 🚨 Important Rules

1. **Always use GateProvider**: Wrap your entire app with `GateProvider`
2. **PageGate is required**: Component gates MUST have a PageGate as a parent
3. **Automatic inheritance**: Component gates automatically inherit from their parent
4. **No pageId needed**: Component gates don't need pageId - they inherit automatically
5. **Consistent teamId**: Use the same teamId throughout your component tree

## 🔍 Troubleshooting

### Common Issues

1. **"useHierarchicalGateContext must be used within a HierarchicalGateProvider"**
   - Make sure to wrap your app with `GateProvider`

2. **Component gates not working**
   - Ensure there's a `PageGate` as a parent
   - Check that the parent gate is actually open

3. **Gates not updating**
   - Check that the `teamId` is consistent
   - Verify that the feature flags are correctly configured

## 📖 Examples

See `packages/billing/src/examples/hierarchical-gates-examples.tsx` for comprehensive examples.

## 🚀 Ready to Use

The system is now ready for import in both dashboard and scraper apps:

```tsx
// Import the main components
import { 
  GateProvider, 
  PageGate, 
  FeatureGate,
  usePageGateStatus,
  usePageGateControl 
} from '@wirecrest/billing';
```
