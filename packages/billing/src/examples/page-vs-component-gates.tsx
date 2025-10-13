'use client';

/**
 * Page vs Component Feature Gates - Best Practices
 * Demonstrates the recommended approach for feature gating
 */

import React from 'react';
import { 
  FeatureGate, 
  PlatformGate,
  PlatformFeature,
  AnalyticsFeature,
  IntegrationFeature,
  BusinessFeature
} from '@wirecrest/billing';
import { useFeatureAccess } from '../hooks/use-feature-access';

// ============================================================================
// ❌ BAD: Page-Level Gate (Not Recommended)
// ============================================================================

/**
 * This approach blocks the entire page if user lacks ANY feature
 * Results in poor UX - user can't see what they DO have access to
 */
export function BadBillingPage({ teamId }: { teamId: string }) {
  return (
    <FeatureGate 
      teamId={teamId} 
      features={[
        PlatformFeature.GOOGLE_REVIEWS,
        AnalyticsFeature.ADVANCED_ANALYTICS,
        IntegrationFeature.API_ACCESS
      ]}
      requireAll={true} // Blocks entire page if missing ANY feature
      fallback={<UpgradePrompt />}
    >
      <div className="billing-page">
        <h1>Billing Dashboard</h1>
        <GoogleReviewsSection teamId="example-team" />
        <AnalyticsSection teamId="example-team" />
        <APISection teamId="example-team" />
      </div>
    </FeatureGate>
  );
}

// ============================================================================
// ✅ GOOD: Component-Level Gates (Recommended)
// ============================================================================

/**
 * This approach gates individual components
 * Users see what they can access, upgrade prompts for what they can't
 */
export function GoodBillingPage({ teamId }: { teamId: string }) {
  return (
    <div className="billing-page">
      <h1>Billing Dashboard</h1>
      
      {/* Each component is independently gated */}
      <GoogleReviewsSection teamId={teamId} />
      <AnalyticsSection teamId={teamId} />
      <APISection teamId={teamId} />
      <MultiLocationSection teamId={teamId} />
    </div>
  );
}

// ============================================================================
// COMPONENT IMPLEMENTATIONS
// ============================================================================

/**
 * Google Reviews Section - Gated at component level
 */
function GoogleReviewsSection({ teamId }: { teamId: string }) {
  return (
    <FeatureGate 
      teamId={teamId} 
      features={PlatformFeature.GOOGLE_REVIEWS}
      fallback={
        <UpgradePrompt 
          feature="Google Reviews" 
          tier="STARTER"
          description="Monitor and respond to Google reviews"
        />
      }
    >
      <div className="section">
        <h2>Google Reviews</h2>
        <GoogleReviewsComponent />
      </div>
    </FeatureGate>
  );
}

/**
 * Analytics Section - Multiple features, show if has ANY
 */
function AnalyticsSection({ teamId }: { teamId: string }) {
  return (
    <FeatureGate 
      teamId={teamId} 
      features={[
        AnalyticsFeature.BASIC_ANALYTICS,
        AnalyticsFeature.ADVANCED_ANALYTICS
      ]}
      requireAll={false} // Show if has ANY analytics feature
      fallback={
        <UpgradePrompt 
          feature="Analytics" 
          tier="STARTER"
          description="Get insights into your review performance"
        />
      }
    >
      <div className="section">
        <h2>Analytics</h2>
        <AnalyticsComponent teamId={teamId} />
      </div>
    </FeatureGate>
  );
}

/**
 * API Section - Advanced feature
 */
function APISection({ teamId }: { teamId: string }) {
  return (
    <FeatureGate 
      teamId={teamId} 
      features={IntegrationFeature.API_ACCESS}
      fallback={
        <UpgradePrompt 
          feature="API Access" 
          tier="PROFESSIONAL"
          description="Integrate with your existing systems"
        />
      }
    >
      <div className="section">
        <h2>API Access</h2>
        <APIComponent />
      </div>
    </FeatureGate>
  );
}

/**
 * Multi-Location Section - Business feature
 */
function MultiLocationSection({ teamId }: { teamId: string }) {
  return (
    <FeatureGate 
      teamId={teamId} 
      features={BusinessFeature.MULTI_LOCATION}
      fallback={
        <UpgradePrompt 
          feature="Multi-Location Management" 
          tier="PROFESSIONAL"
          description="Manage multiple business locations"
        />
      }
    >
      <div className="section">
        <h2>Multi-Location Management</h2>
        <MultiLocationComponent />
      </div>
    </FeatureGate>
  );
}

// ============================================================================
// HYBRID APPROACH: Page Structure + Component Gates
// ============================================================================

/**
 * Best of both worlds: Page structure with component-level gates
 * Use this for complex pages with many features
 */
export function HybridBillingPage({ teamId }: { teamId: string }) {
  const { hasFeature, loading } = useFeatureAccess(teamId);

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="billing-page">
      <h1>Billing Dashboard</h1>
      
      {/* Always show basic info */}
      <BasicInfoSection teamId={teamId} />
      
      {/* Conditionally show sections based on features */}
      <div className="sections-grid">
        {hasFeature(PlatformFeature.GOOGLE_REVIEWS) && (
          <GoogleReviewsSection teamId={teamId} />
        )}
        
        {hasFeature(AnalyticsFeature.BASIC_ANALYTICS) && (
          <AnalyticsSection teamId={teamId} />
        )}
        
        {hasFeature(IntegrationFeature.API_ACCESS) && (
          <APISection teamId={teamId} />
        )}
        
        {hasFeature(BusinessFeature.MULTI_LOCATION) && (
          <MultiLocationSection teamId={teamId} />
        )}
      </div>
      
      {/* Show upgrade prompts for missing features */}
      <MissingFeaturesSection teamId={teamId} />
    </div>
  );
}

/**
 * Show upgrade prompts for features user doesn't have
 */
function MissingFeaturesSection({ teamId }: { teamId: string }) {
  const { hasFeature } = useFeatureAccess(teamId);
  
  const missingFeatures = [];
  
  if (!hasFeature(PlatformFeature.GOOGLE_REVIEWS)) {
    missingFeatures.push({
      feature: 'Google Reviews',
      tier: 'STARTER',
      description: 'Monitor and respond to Google reviews'
    });
  }
  
  if (!hasFeature(AnalyticsFeature.ADVANCED_ANALYTICS)) {
    missingFeatures.push({
      feature: 'Advanced Analytics',
      tier: 'PROFESSIONAL',
      description: 'Get detailed insights and custom reports'
    });
  }
  
  if (!hasFeature(IntegrationFeature.API_ACCESS)) {
    missingFeatures.push({
      feature: 'API Access',
      tier: 'PROFESSIONAL',
      description: 'Integrate with your existing systems'
    });
  }
  
  if (missingFeatures.length === 0) {
    return null;
  }
  
  return (
    <div className="missing-features">
      <h3>Unlock More Features</h3>
      <div className="upgrade-grid">
        {missingFeatures.map((feature, index) => (
          <UpgradePrompt 
            key={index}
            feature={feature.feature}
            tier={feature.tier}
            description={feature.description}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// PLATFORM-SPECIFIC GATES
// ============================================================================

/**
 * For platform-specific features, use PlatformGate
 */
function PlatformSpecificPage({ teamId, platform }: { teamId: string; platform: string }) {
  return (
    <div className="platform-page">
      <h1>{platform} Reviews</h1>
      
      <PlatformGate 
        teamId={teamId} 
        platform={platform}
        fallback={
          <UpgradePrompt 
            feature={`${platform} Reviews`}
            tier="STARTER"
            description={`Monitor and respond to ${platform} reviews`}
          />
        }
      >
        <PlatformReviewsComponent platform={platform} />
      </PlatformGate>
    </div>
  );
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

function UpgradePrompt({ 
  feature = 'Premium Features', 
  tier = 'Professional',
  description = 'This feature requires a higher subscription tier'
}: { 
  feature?: string; 
  tier?: string;
  description?: string;
}) {
  return (
    <div className="upgrade-prompt">
      <h3>🔒 {feature}</h3>
      <p>{description}</p>
      <p className="tier-info">Available in {tier} plan and above</p>
      <button className="upgrade-btn">Upgrade Now</button>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="page-skeleton">
      <div className="skeleton-header" />
      <div className="skeleton-sections">
        <div className="skeleton-section" />
        <div className="skeleton-section" />
        <div className="skeleton-section" />
      </div>
    </div>
  );
}

function BasicInfoSection({ teamId }: { teamId: string }) {
  return (
    <div className="basic-info">
      <h2>Account Information</h2>
      <p>Basic account details that everyone can see</p>
    </div>
  );
}

// Mock components
function GoogleReviewsComponent() { return <div>Google Reviews Component</div>; }
function AnalyticsComponent({ teamId }: { teamId: string }) { return <div>Analytics Component</div>; }
function APIComponent() { return <div>API Component</div>; }
function MultiLocationComponent() { return <div>Multi-Location Component</div>; }
function PlatformReviewsComponent({ platform }: { platform: string }) { 
  return <div>{platform} Reviews Component</div>; 
}

