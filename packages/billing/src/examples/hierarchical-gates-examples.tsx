'use client';

/**
 * Hierarchical Feature Gates - Examples and Best Practices
 * 
 * This demonstrates the hierarchical feature gating system with:
 * 1. Page-level gates that control access to entire pages/sections
 * 2. Component-level gates that can only be enabled if the page gate is open
 * 3. Different patterns for organizing features hierarchically
 */

import React from 'react';
import {
  GateProvider,
  PageGate,
  FeatureGate,
  usePageGateStatus,
  usePageGateControl,
  useAllPageGates,
} from '../components/hierarchical-gates';
import {
  PlatformFeature,
  AnalyticsFeature,
  IntegrationFeature,
  BusinessFeature,
  AdvancedFeature,
} from '../feature-flags';

// ============================================================================
// BASIC HIERARCHICAL GATING EXAMPLE
// ============================================================================

/**
 * Example: Analytics Dashboard with hierarchical gating
 * Page gate controls access to analytics, component gates control specific features
 */
export function AnalyticsDashboard({ teamId }: { teamId: string }) {
  return (
    <GateProvider>
      <div className="analytics-dashboard">
        <h1>Analytics Dashboard</h1>
        
        {/* Page-level gate for analytics access */}
        <PageGate
          pageId="analytics-dashboard"
          teamId={teamId}
          features={AnalyticsFeature.BASIC_ANALYTICS}
          fallback={<AnalyticsUpgradePrompt />}
        >
          {/* Component-level gates that automatically inherit from page gate */}
          <div className="analytics-sections">
            <BasicAnalyticsSection teamId={teamId} />
            <AdvancedAnalyticsSection teamId={teamId} />
            <CustomReportsSection teamId={teamId} />
            <ExportDataSection teamId={teamId} />
          </div>
        </PageGate>
      </div>
    </GateProvider>
  );
}

/**
 * Basic Analytics Section - Requires page gate + basic analytics feature
 */
function BasicAnalyticsSection({ teamId }: { teamId: string }) {
  return (
    <FeatureGate
      teamId={teamId}
      features={AnalyticsFeature.BASIC_ANALYTICS}
      fallback={<FeatureUpgradePrompt feature="Basic Analytics" />}
    >
      <div className="analytics-section">
        <h2>Basic Analytics</h2>
        <BasicAnalyticsComponent />
      </div>
    </FeatureGate>
  );
}

/**
 * Advanced Analytics Section - Requires page gate + advanced analytics feature
 */
function AdvancedAnalyticsSection({ teamId }: { teamId: string }) {
  return (
    <FeatureGate
      teamId={teamId}
      features={AnalyticsFeature.ADVANCED_ANALYTICS}
      fallback={<FeatureUpgradePrompt feature="Advanced Analytics" />}
    >
      <div className="analytics-section">
        <h2>Advanced Analytics</h2>
        <AdvancedAnalyticsComponent />
      </div>
    </FeatureGate>
  );
}

/**
 * Custom Reports Section - Requires page gate + custom reporting feature
 */
function CustomReportsSection({ teamId }: { teamId: string }) {
  return (
    <FeatureGate
      teamId={teamId}
      features={AdvancedFeature.SCHEDULED_REPORTS}
      fallback={<FeatureUpgradePrompt feature="Custom Reports" />}
    >
      <div className="analytics-section">
        <h2>Custom Reports</h2>
        <CustomReportsComponent />
      </div>
    </FeatureGate>
  );
}

/**
 * Export Data Section - Requires page gate + export feature
 */
function ExportDataSection({ teamId }: { teamId: string }) {
  return (
    <FeatureGate
      teamId={teamId}
      features={AdvancedFeature.EXPORT_DATA}
      fallback={<FeatureUpgradePrompt feature="Data Export" />}
    >
      <div className="analytics-section">
        <h2>Export Data</h2>
        <ExportDataComponent />
      </div>
    </FeatureGate>
  );
}

// ============================================================================
// MULTI-PAGE HIERARCHICAL GATING
// ============================================================================

/**
 * Example: Multi-page application with different page gates
 */
export function MultiPageApplication({ teamId }: { teamId: string }) {
  return (
    <GateProvider>
      <div className="multi-page-app">
        <Navigation teamId={teamId} />
        
        <Routes>
          <Route element={<AnalyticsPage teamId={teamId} />} />
          <Route element={<IntegrationsPage teamId={teamId} />} />
          <Route element={<BillingPage teamId={teamId} />} />
        </Routes>
      </div>
    </GateProvider>
  );
}

/**
 * Analytics Page - Has its own page gate
 */
function AnalyticsPage({ teamId }: { teamId: string }) {
  return (
    <PageGate
      pageId="analytics-page"
      teamId={teamId}
      features={AnalyticsFeature.BASIC_ANALYTICS}
      fallback={<PageUpgradePrompt page="Analytics" />}
    >
      <div className="analytics-page">
        <h1>Analytics</h1>
        <AnalyticsContent teamId={teamId} />
      </div>
    </PageGate>
  );
}

/**
 * Integrations Page - Has its own page gate
 */
function IntegrationsPage({ teamId }: { teamId: string }) {
  return (
    <PageGate
      pageId="integrations-page"
      teamId={teamId}
      features={IntegrationFeature.API_ACCESS}
      fallback={<PageUpgradePrompt page="Integrations" />}
    >
      <div className="integrations-page">
        <h1>Integrations</h1>
        <IntegrationsContent teamId={teamId} />
      </div>
    </PageGate>
  );
}

/**
 * Billing Page - No page gate (always accessible)
 */
function BillingPage({ teamId }: { teamId: string }) {
  return (
    <div className="billing-page">
      <h1>Billing</h1>
      <BillingContent teamId={teamId} />
    </div>
  );
}

// ============================================================================
// PROGRAMMATIC GATE CONTROL
// ============================================================================

/**
 * Example: Admin panel that can control page gates programmatically
 */
export function AdminGateControl({ teamId }: { teamId: string }) {
  const allPageGates = useAllPageGates();
  const analyticsControl = usePageGateControl('analytics-dashboard');
  const integrationsControl = usePageGateControl('integrations-page');

  return (
    <div className="admin-gate-control">
      <h2>Gate Control Panel</h2>
      
      <div className="gate-controls">
        <div className="gate-control">
          <h3>Analytics Dashboard</h3>
          <p>Status: {analyticsControl.isOpen ? 'Open' : 'Closed'}</p>
          <button onClick={analyticsControl.toggleGate}>
            {analyticsControl.isOpen ? 'Close' : 'Open'} Gate
          </button>
        </div>
        
        <div className="gate-control">
          <h3>Integrations Page</h3>
          <p>Status: {integrationsControl.isOpen ? 'Open' : 'Closed'}</p>
          <button onClick={integrationsControl.toggleGate}>
            {integrationsControl.isOpen ? 'Close' : 'Open'} Gate
          </button>
        </div>
      </div>
      
      <div className="all-gates-status">
        <h3>All Page Gates Status</h3>
        <ul>
          {Array.from(allPageGates.entries()).map(([pageId, isOpen]) => (
            <li key={pageId}>
              {pageId}: {isOpen ? 'Open' : 'Closed'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// CONDITIONAL RENDERING WITH GATE STATUS
// ============================================================================

/**
 * Example: Navigation that shows/hides items based on page gate status
 */
function Navigation({ teamId }: { teamId: string }) {
  const analyticsGateOpen = usePageGateStatus('analytics-page');
  const integrationsGateOpen = usePageGateStatus('integrations-page');

  return (
    <nav className="main-navigation">
      <ul>
        <li><a href="/dashboard">Dashboard</a></li>
        
        {analyticsGateOpen && (
          <li><a href="/analytics">Analytics</a></li>
        )}
        
        {integrationsGateOpen && (
          <li><a href="/integrations">Integrations</a></li>
        )}
        
        <li><a href="/billing">Billing</a></li>
      </ul>
    </nav>
  );
}

// ============================================================================
// COMPLEX HIERARCHICAL STRUCTURE
// ============================================================================

/**
 * Example: Complex dashboard with multiple levels of gating
 */
export function ComplexDashboard({ teamId }: { teamId: string }) {
  return (
    <GateProvider>
      <div className="complex-dashboard">
        <h1>Business Dashboard</h1>
        
        {/* Main sections with page gates */}
        <div className="dashboard-sections">
          <ReviewsSection teamId={teamId} />
          <AnalyticsSection teamId={teamId} />
          <IntegrationsSection teamId={teamId} />
          <MultiLocationSection teamId={teamId} />
        </div>
      </div>
    </GateProvider>
  );
}

/**
 * Analytics Section - Page gate for analytics access
 */
function AnalyticsSection({ teamId }: { teamId: string }) {
  return (
    <PageGate
      pageId="analytics-section"
      teamId={teamId}
      features={AnalyticsFeature.BASIC_ANALYTICS}
      fallback={<SectionUpgradePrompt section="Analytics" />}
    >
      <div className="analytics-section">
        <h2>Analytics</h2>
        <AnalyticsContent teamId={teamId} />
      </div>
    </PageGate>
  );
}

/**
 * Integrations Section - Page gate for integrations access
 */
function IntegrationsSection({ teamId }: { teamId: string }) {
  return (
    <PageGate
      pageId="integrations-section"
      teamId={teamId}
      features={IntegrationFeature.API_ACCESS}
      fallback={<SectionUpgradePrompt section="Integrations" />}
    >
      <div className="integrations-section">
        <h2>Integrations</h2>
        <IntegrationsContent teamId={teamId} />
      </div>
    </PageGate>
  );
}

/**
 * Multi-Location Section - Page gate for multi-location access
 */
function MultiLocationSection({ teamId }: { teamId: string }) {
  return (
    <PageGate
      pageId="multi-location-section"
      teamId={teamId}
      features={BusinessFeature.MULTI_LOCATION}
      fallback={<SectionUpgradePrompt section="Multi-Location" />}
    >
      <div className="multi-location-section">
        <h2>Multi-Location Management</h2>
        <MultiLocationComponent />
      </div>
    </PageGate>
  );
}

/**
 * Reviews Section - Page gate for reviews access
 */
function ReviewsSection({ teamId }: { teamId: string }) {
  return (
    <PageGate
      pageId="reviews-section"
      teamId={teamId}
      features={[PlatformFeature.GOOGLE_REVIEWS, PlatformFeature.FACEBOOK_REVIEWS]}
      requireAll={false} // Show if has ANY review platform
      fallback={<SectionUpgradePrompt section="Reviews" />}
    >
      <div className="reviews-section">
        <h2>Reviews Management</h2>
        
        <GoogleReviewsSubsection teamId={teamId} />
        <FacebookReviewsSubsection teamId={teamId} />
        <TripAdvisorReviewsSubsection teamId={teamId} />
      </div>
    </PageGate>
  );
}

/**
 * Google Reviews Subsection - Component gate within reviews section
 */
function GoogleReviewsSubsection({ teamId }: { teamId: string }) {
  return (
    <FeatureGate
      teamId={teamId}
      features={PlatformFeature.GOOGLE_REVIEWS}
      fallback={<SubsectionUpgradePrompt subsection="Google Reviews" />}
    >
      <div className="google-reviews-subsection">
        <h3>Google Reviews</h3>
        <GoogleReviewsComponent />
      </div>
    </FeatureGate>
  );
}

/**
 * Facebook Reviews Subsection - Component gate within reviews section
 */
function FacebookReviewsSubsection({ teamId }: { teamId: string }) {
  return (
    <FeatureGate
      teamId={teamId}
      features={PlatformFeature.FACEBOOK_REVIEWS}
      fallback={<SubsectionUpgradePrompt subsection="Facebook Reviews" />}
    >
      <div className="facebook-reviews-subsection">
        <h3>Facebook Reviews</h3>
        <FacebookReviewsComponent />
      </div>
    </FeatureGate>
  );
}

/**
 * TripAdvisor Reviews Subsection - Component gate within reviews section
 */
function TripAdvisorReviewsSubsection({ teamId }: { teamId: string }) {
  return (
    <FeatureGate
      teamId={teamId}
      features={PlatformFeature.TRIPADVISOR_REVIEWS}
      fallback={<SubsectionUpgradePrompt subsection="TripAdvisor Reviews" />}
    >
      <div className="tripadvisor-reviews-subsection">
        <h3>TripAdvisor Reviews</h3>
        <TripAdvisorReviewsComponent />
      </div>
    </FeatureGate>
  );
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

function AnalyticsUpgradePrompt() {
  return (
    <div className="upgrade-prompt page-level">
      <h3>🔒 Analytics Access Required</h3>
      <p>Upgrade to access the Analytics Dashboard</p>
      <button>Upgrade to Starter Plan</button>
    </div>
  );
}

function PageUpgradePrompt({ page }: { page: string }) {
  return (
    <div className="upgrade-prompt page-level">
      <h3>🔒 {page} Access Required</h3>
      <p>Upgrade to access the {page} page</p>
      <button>Upgrade Now</button>
    </div>
  );
}

function SectionUpgradePrompt({ section }: { section: string }) {
  return (
    <div className="upgrade-prompt section-level">
      <h4>🔒 {section} Section Access Required</h4>
      <p>Upgrade to access the {section} section</p>
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

function SubsectionUpgradePrompt({ subsection }: { subsection: string }) {
  return (
    <div className="upgrade-prompt subsection-level">
      <h5>🔒 {subsection} Access Required</h5>
      <p>This subsection requires the parent section to be accessible</p>
    </div>
  );
}

// ============================================================================
// MOCK COMPONENTS
// ============================================================================

function BasicAnalyticsComponent() { return <div>Basic Analytics Component</div>; }
function AdvancedAnalyticsComponent() { return <div>Advanced Analytics Component</div>; }
function CustomReportsComponent() { return <div>Custom Reports Component</div>; }
function ExportDataComponent() { return <div>Export Data Component</div>; }
function AnalyticsContent({ teamId }: { teamId: string }) { return <div>Analytics Content</div>; }
function IntegrationsContent({ teamId }: { teamId: string }) { return <div>Integrations Content</div>; }
function BillingContent({ teamId }: { teamId: string }) { return <div>Billing Content</div>; }
function GoogleReviewsComponent() { return <div>Google Reviews Component</div>; }
function FacebookReviewsComponent() { return <div>Facebook Reviews Component</div>; }
function TripAdvisorReviewsComponent() { return <div>TripAdvisor Reviews Component</div>; }
function MultiLocationComponent() { return <div>Multi-Location Component</div>; }

// Mock routing components
function Routes({ children }: { children: React.ReactNode }) { return <div>{children}</div>; }
function Route({ element }: { element: React.ReactNode }) { return <div>{element}</div>; }

// ============================================================================
// USAGE PATTERNS SUMMARY
// ============================================================================

/**
 * HIERARCHICAL GATING PATTERNS:
 * 
 * 1. PAGE-LEVEL GATES:
 *    - Control access to entire pages/sections
 *    - Use PageGate component
 *    - Must be wrapped in HierarchicalGateProvider
 * 
 * 2. COMPONENT-LEVEL GATES:
 *    - Control access to individual components
 *    - Use HierarchicalFeatureGate component
 *    - Can depend on page gates being open
 * 
 * 3. PROGRAMMATIC CONTROL:
 *    - Use usePageGateControl hook to control gates programmatically
 *    - Use usePageGateStatus to check gate status
 *    - Use useAllPageGates to get all gate statuses
 * 
 * 4. CONDITIONAL RENDERING:
 *    - Use gate status to show/hide navigation items
 *    - Use gate status to conditionally render content
 * 
 * 5. COMPLEX HIERARCHIES:
 *    - Multiple levels of gating (page -> section -> component)
 *    - Different features at each level
 *    - Fallback components for each level
 */
