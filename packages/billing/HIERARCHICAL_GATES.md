# Hierarchical Feature Gating System

A comprehensive feature gating system that provides two levels of access control:

1. **Page-level gates**: Control access to entire pages/sections
2. **Component-level gates**: Control access to individual components within a page

Component gates can only be enabled if the page gate is open, creating a hierarchical access control system.

## 🚀 Quick Start

### 1. Wrap your app with the provider

```tsx
import { HierarchicalGateProvider } from '@wirecrest/billing';

function App() {
  return (
    <HierarchicalGateProvider>
      <YourApp />
    </HierarchicalGateProvider>
  );
}
```

### 2. Create page-level gates

```tsx
import { PageGate } from '@wirecrest/billing';

function AnalyticsPage({ teamId }: { teamId: string }) {
  return (
    <PageGate
      pageId="analytics-dashboard"
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
import { HierarchicalFeatureGate } from '@wirecrest/billing';

function AdvancedAnalyticsSection({ teamId }: { teamId: string }) {
  return (
    <HierarchicalFeatureGate
      pageId="analytics-dashboard"  // Must match the page gate ID
      teamId={teamId}
      features={AnalyticsFeature.ADVANCED_ANALYTICS}
      fallback={<FeatureUpgradePrompt />}
    >
      <AdvancedAnalyticsComponent />
    </HierarchicalFeatureGate>
  );
}
```

## 📚 API Reference

### Components

#### `HierarchicalGateProvider`

Context provider that manages the state of all page gates.

```tsx
interface HierarchicalGateProviderProps {
  children: ReactNode;
}
```

#### `PageGate`

Controls access to entire pages/sections. This is the top-level gate.

```tsx
interface PageGateProps {
  pageId: string;                    // Unique identifier for the page
  teamId: string;                    // Team ID for feature checking
  features: FeatureFlag | FeatureFlag[];  // Required features
  children: ReactNode;               // Content to show when gate is open
  fallback?: ReactNode;              // Content to show when gate is closed
  requireAll?: boolean;              // Require all features (default: true)
  loading?: ReactNode;               // Loading state
  error?: ReactNode;                 // Error state
  onGateChange?: (isOpen: boolean) => void;  // Callback when gate state changes
}
```

#### `HierarchicalFeatureGate`

Enhanced component gate that respects page-level gates.

```tsx
interface HierarchicalFeatureGateProps {
  pageId?: string;                   // Page ID to check (optional)
  teamId: string;                    // Team ID for feature checking
  features: FeatureFlag | FeatureFlag[];  // Required features
  children: ReactNode;               // Content to show when accessible
  fallback?: ReactNode;              // Content to show when not accessible
  requireAll?: boolean;              // Require all features (default: true)
  requirePageGate?: boolean;         // Require page gate to be open (default: true)
  loading?: ReactNode;               // Loading state
  error?: ReactNode;                 // Error state
}
```

### Hooks

#### `usePageGateStatus(pageId: string)`

Check if a specific page gate is open.

```tsx
const isAnalyticsOpen = usePageGateStatus('analytics-dashboard');
```

#### `usePageGateControl(pageId: string)`

Control a page gate programmatically.

```tsx
const { isOpen, openGate, closeGate, toggleGate } = usePageGateControl('analytics-dashboard');
```

#### `useAllPageGates()`

Get the status of all page gates.

```tsx
const allGates = useAllPageGates();
// Returns: Map<string, boolean>
```

## 🎯 Usage Patterns

### 1. Basic Hierarchical Gating

```tsx
function Dashboard({ teamId }: { teamId: string }) {
  return (
    <HierarchicalGateProvider>
      <PageGate
        pageId="dashboard"
        teamId={teamId}
        features={PlatformFeature.GOOGLE_REVIEWS}
        fallback={<DashboardUpgradePrompt />}
      >
        <GoogleReviewsSection teamId={teamId} />
        <AnalyticsSection teamId={teamId} />
      </PageGate>
    </HierarchicalGateProvider>
  );
}

function GoogleReviewsSection({ teamId }: { teamId: string }) {
  return (
    <HierarchicalFeatureGate
      pageId="dashboard"
      teamId={teamId}
      features={PlatformFeature.GOOGLE_REVIEWS}
      fallback={<FeatureUpgradePrompt />}
    >
      <GoogleReviewsComponent />
    </HierarchicalFeatureGate>
  );
}
```

### 2. Multi-Page Application

```tsx
function App({ teamId }: { teamId: string }) {
  return (
    <HierarchicalGateProvider>
      <Navigation teamId={teamId} />
      <Routes>
        <Route path="/analytics" element={<AnalyticsPage teamId={teamId} />} />
        <Route path="/integrations" element={<IntegrationsPage teamId={teamId} />} />
      </Routes>
    </HierarchicalGateProvider>
  );
}

function AnalyticsPage({ teamId }: { teamId: string }) {
  return (
    <PageGate
      pageId="analytics-page"
      teamId={teamId}
      features={AnalyticsFeature.BASIC_ANALYTICS}
      fallback={<PageUpgradePrompt />}
    >
      <AnalyticsContent teamId={teamId} />
    </PageGate>
  );
}
```

### 3. Programmatic Control

```tsx
function AdminPanel({ teamId }: { teamId: string }) {
  const analyticsControl = usePageGateControl('analytics-dashboard');
  const integrationsControl = usePageGateControl('integrations-page');

  return (
    <div>
      <h2>Gate Control</h2>
      <button onClick={analyticsControl.toggleGate}>
        {analyticsControl.isOpen ? 'Close' : 'Open'} Analytics
      </button>
      <button onClick={integrationsControl.toggleGate}>
        {integrationsControl.isOpen ? 'Close' : 'Open'} Integrations
      </button>
    </div>
  );
}
```

### 4. Conditional Rendering

```tsx
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

### 5. Complex Hierarchies

```tsx
function ComplexDashboard({ teamId }: { teamId: string }) {
  return (
    <HierarchicalGateProvider>
      {/* Page-level gate for reviews section */}
      <PageGate
        pageId="reviews-section"
        teamId={teamId}
        features={[PlatformFeature.GOOGLE_REVIEWS, PlatformFeature.FACEBOOK_REVIEWS]}
        requireAll={false}
        fallback={<SectionUpgradePrompt />}
      >
        {/* Component gates within the reviews section */}
        <GoogleReviewsSubsection teamId={teamId} />
        <FacebookReviewsSubsection teamId={teamId} />
      </PageGate>
    </HierarchicalGateProvider>
  );
}

function GoogleReviewsSubsection({ teamId }: { teamId: string }) {
  return (
    <HierarchicalFeatureGate
      pageId="reviews-section"
      teamId={teamId}
      features={PlatformFeature.GOOGLE_REVIEWS}
      fallback={<SubsectionUpgradePrompt />}
    >
      <GoogleReviewsComponent />
    </HierarchicalFeatureGate>
  );
}
```

## 🔧 Advanced Features

### Custom Fallback Components

Create custom fallback components for different levels:

```tsx
function PageUpgradePrompt({ page }: { page: string }) {
  return (
    <div className="upgrade-prompt page-level">
      <h3>🔒 {page} Access Required</h3>
      <p>Upgrade to access the {page} page</p>
      <button>Upgrade Now</button>
    </div>
  );
}

function FeatureUpgradePrompt({ feature }: { feature: string }) {
  return (
    <div className="upgrade-prompt feature-level">
      <h5>🔒 {feature} Feature Required</h5>
      <p>This feature requires a higher subscription tier</p>
      <button>Upgrade Now</button>
    </div>
  );
}
```

### Gate State Monitoring

Monitor all gate states for debugging or admin purposes:

```tsx
function GateMonitor() {
  const allGates = useAllPageGates();
  
  return (
    <div>
      <h3>Gate Status Monitor</h3>
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

### Backwards Compatibility

The system is backwards compatible with existing `FeatureGate` components:

```tsx
// This still works without hierarchical context
<FeatureGate teamId={teamId} features={PlatformFeature.GOOGLE_REVIEWS}>
  <GoogleReviewsComponent />
</FeatureGate>

// This works with hierarchical context
<HierarchicalFeatureGate
  pageId="dashboard"
  teamId={teamId}
  features={PlatformFeature.GOOGLE_REVIEWS}
>
  <GoogleReviewsComponent />
</HierarchicalFeatureGate>
```

## 🎨 Styling

The system provides CSS classes for styling different gate states:

```css
/* Page gate closed */
.page-gate-closed {
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

.upgrade-prompt.page-level {
  background: #fff3cd;
  border-color: #ffc107;
}

.upgrade-prompt.feature-level {
  background: #f8f9fa;
  border-color: #6c757d;
}
```

## 🚨 Best Practices

1. **Always wrap with provider**: Use `HierarchicalGateProvider` at the root of your app
2. **Consistent page IDs**: Use consistent page IDs across your app
3. **Logical hierarchy**: Organize features in a logical hierarchy (page -> section -> component)
4. **Meaningful fallbacks**: Provide clear upgrade prompts for each level
5. **Performance**: Use `requirePageGate={false}` for components that don't need page gate dependency
6. **Testing**: Test both gate open and closed states
7. **Accessibility**: Ensure fallback components are accessible

## 🔍 Troubleshooting

### Common Issues

1. **"useHierarchicalGateContext must be used within a HierarchicalGateProvider"**
   - Make sure to wrap your app with `HierarchicalGateProvider`

2. **Component gates not working**
   - Check that the `pageId` matches between `PageGate` and `HierarchicalFeatureGate`
   - Ensure the page gate is actually open

3. **Gates not updating**
   - Check that the `teamId` is consistent
   - Verify that the feature flags are correctly configured

### Debug Mode

Enable debug mode to see gate state changes:

```tsx
function DebugGateProvider({ children }: { children: ReactNode }) {
  const allGates = useAllPageGates();
  
  useEffect(() => {
    console.log('Gate states:', Object.fromEntries(allGates));
  }, [allGates]);
  
  return <HierarchicalGateProvider>{children}</HierarchicalGateProvider>;
}
```

## 📖 Examples

See `packages/billing/src/examples/hierarchical-gates-examples.tsx` for comprehensive examples of all usage patterns.
