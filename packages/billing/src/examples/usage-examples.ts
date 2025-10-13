/**
 * Usage Examples for Stripe-Driven Feature Access System
 * Demonstrates how to use the new feature flag system across frontend and backend
 */

import { 
  FeatureAccessService, 
  useFeatureAccess, 
  FeatureGate, 
  PlatformGate,
  createFeatureGate,
  GOOGLE_REVIEWS_GATE,
  PlatformFeature,
  AnalyticsFeature,
  IntegrationFeature
} from '../index';

// ============================================================================
// FRONTEND USAGE EXAMPLES (Next.js Dashboard)
// ============================================================================

/**
 * Example 1: Basic Feature Gate Component
 */
export function GoogleReviewsSection({ teamId }: { teamId: string }) {
  return (
    <FeatureGate 
      teamId={teamId} 
      features={PlatformFeature.GOOGLE_REVIEWS}
      fallback={<UpgradePrompt feature="Google Reviews" />}
    >
      <GoogleReviewsComponent />
    </FeatureGate>
  );
}

/**
 * Example 2: Multiple Features (Require ALL)
 */
export function AdvancedAnalyticsSection({ teamId }: { teamId: string }) {
  return (
    <FeatureGate 
      teamId={teamId} 
      features={[AnalyticsFeature.ADVANCED_ANALYTICS, IntegrationFeature.API_ACCESS]}
      requireAll={true}
      fallback={<UpgradePrompt features={["Advanced Analytics", "API Access"]} />}
    >
      <AdvancedAnalyticsDashboard />
    </FeatureGate>
  );
}

/**
 * Example 3: Multiple Features (Require ANY)
 */
export function ReviewsSection({ teamId }: { teamId: string }) {
  return (
    <FeatureGate 
      teamId={teamId} 
      features={[
        PlatformFeature.GOOGLE_REVIEWS,
        PlatformFeature.FACEBOOK_REVIEWS,
        PlatformFeature.TRIPADVISOR_REVIEWS
      ]}
      requireAll={false} // Show if has ANY of these features
      fallback={<UpgradePrompt feature="Review Management" />}
    >
      <ReviewsDashboard />
    </FeatureGate>
  );
}

/**
 * Example 4: Platform-Specific Gate
 */
export function PlatformSpecificSection({ teamId, platform }: { teamId: string; platform: string }) {
  return (
    <PlatformGate 
      teamId={teamId} 
      platform={platform}
      fallback={<UpgradePrompt feature={`${platform} Reviews`} />}
    >
      <PlatformReviewsComponent platform={platform} />
    </PlatformGate>
  );
}

/**
 * Example 5: Using Hook Directly
 */
export function MyComponent({ teamId }: { teamId: string }) {
  const { hasFeature, hasFeatures, loading, error } = useFeatureAccess(teamId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {hasFeature(PlatformFeature.GOOGLE_REVIEWS) && (
        <GoogleReviewsComponent />
      )}
      
      {hasFeatures([AnalyticsFeature.ADVANCED_ANALYTICS, IntegrationFeature.API_ACCESS]) && (
        <AdvancedFeaturesComponent />
      )}
    </div>
  );
}

/**
 * Example 6: Conditional Rendering with Upgrade Prompts
 */
export function ConditionalFeatures({ teamId }: { teamId: string }) {
  const { hasFeature } = useFeatureAccess(teamId);

  return (
    <div>
      {/* Google Reviews */}
      {hasFeature(PlatformFeature.GOOGLE_REVIEWS) ? (
        <GoogleReviewsComponent />
      ) : (
        <UpgradePrompt 
          feature="Google Reviews" 
          tier="STARTER"
          description="Monitor and respond to Google reviews"
        />
      )}

      {/* Advanced Analytics */}
      {hasFeature(AnalyticsFeature.ADVANCED_ANALYTICS) ? (
        <AdvancedAnalyticsComponent />
      ) : (
        <UpgradePrompt 
          feature="Advanced Analytics" 
          tier="PROFESSIONAL"
          description="Get detailed insights and custom reports"
        />
      )}
    </div>
  );
}

// ============================================================================
// BACKEND USAGE EXAMPLES (Scraper Service)
// ============================================================================

/**
 * Example 1: Express Route with Feature Gate
 */
export function setupScraperRoutes(app: any) {
  // Google Reviews scraping
  app.post('/api/scraper/google-reviews', 
    authenticate,
    GOOGLE_REVIEWS_GATE,
    async (req: Request, res: Response) => {
      const { teamId, urls } = req.body;
      
      // Additional multi-location check if needed
      if (urls.length > 1) {
        const service = new FeatureAccessService();
        const canMultiLocation = await service.canAccessMultiLocation(teamId);
        
        if (!canMultiLocation) {
          return res.status(403).json({
            error: 'Multi-location scraping not available',
            upgradeRequired: true
          });
        }
      }
      
      // Proceed with scraping
      const result = await scrapeGoogleReviews(teamId, urls);
      res.json(result);
    }
  );

  // Facebook Reviews scraping
  app.post('/api/scraper/facebook-reviews',
    authenticate,
    createFeatureGate({ features: [PlatformFeature.FACEBOOK_REVIEWS] }),
    async (req: Request, res: Response) => {
      const result = await scrapeFacebookReviews(req.body);
      res.json(result);
    }
  );
}

/**
 * Example 2: Service-Level Feature Checking
 */
export class ScrapingService {
  private featureService: FeatureAccessService;

  constructor() {
    this.featureService = new FeatureAccessService();
  }

  async scrapeReviews(teamId: string, platform: string, urls: string[]) {
    // Check platform-specific feature
    const canAccessPlatform = await this.featureService.canAccessPlatform(teamId, platform);
    if (!canAccessPlatform) {
      throw new Error(`Platform '${platform}' not available for this team`);
    }

    // Check multi-location if multiple URLs
    if (urls.length > 1) {
      const canMultiLocation = await this.featureService.canAccessMultiLocation(teamId);
      if (!canMultiLocation) {
        throw new Error('Multi-location scraping not available for this team');
      }
    }

    // Proceed with scraping
    return await this.executeScraping(platform, urls);
  }

  async getAvailablePlatforms(teamId: string): Promise<string[]> {
    const service = new FeatureAccessService();
    const platforms = ['google', 'facebook', 'tripadvisor', 'booking', 'yelp'];
    
    const availablePlatforms = [];
    for (const platform of platforms) {
      if (await service.canAccessPlatform(teamId, platform)) {
        availablePlatforms.push(platform);
      }
    }
    
    return availablePlatforms;
  }
}

/**
 * Example 3: Job-Level Feature Validation
 */
export class ReviewScrapingJob {
  private featureService: FeatureAccessService;

  constructor() {
    this.featureService = new FeatureAccessService();
  }

  async execute(jobData: ScrapingJobData) {
    const { teamId, platform, urls } = jobData;
    
    // Validate features before starting job
    await this.validateFeatures(teamId, platform, urls);
    
    // Execute scraping
    return await this.scrapeReviews(teamId, platform, urls);
  }

  private async validateFeatures(teamId: string, platform: string, urls: string[]) {
    // Check platform feature
    const canAccessPlatform = await this.featureService.canAccessPlatform(teamId, platform);
    if (!canAccessPlatform) {
      throw new Error(`Platform '${platform}' not available for this team`);
    }

    // Check multi-location if needed
    if (urls.length > 1) {
      const canMultiLocation = await this.featureService.canAccessMultiLocation(teamId);
      if (!canMultiLocation) {
        throw new Error('Multi-location scraping not available');
      }
    }
  }
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

function UpgradePrompt({ 
  feature, 
  features, 
  tier, 
  description 
}: { 
  feature?: string; 
  features?: string[];
  tier?: string;
  description?: string;
}) {
  return (
    <div className="upgrade-prompt">
      <h3>Upgrade Required</h3>
      <p>
        {features ? `${features.join(', ')} not available` : `${feature} not available`}
        {description && ` - ${description}`}
      </p>
      {tier && <p>Available in {tier} plan and above</p>}
      <button>Upgrade Now</button>
    </div>
  );
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ScrapingJobData {
  teamId: string;
  platform: string;
  urls: string[];
}

// Mock functions for examples
function authenticate(req: any, res: any, next: any) { next(); }
function GoogleReviewsComponent() { return <div>Google Reviews</div>; }
function GoogleReviewsComponent() { return <div>Google Reviews</div>; }
function AdvancedAnalyticsDashboard() { return <div>Advanced Analytics</div>; }
function ReviewsDashboard() { return <div>Reviews Dashboard</div>; }
function PlatformReviewsComponent({ platform }: { platform: string }) { 
  return <div>{platform} Reviews</div>; 
}
function AdvancedFeaturesComponent() { return <div>Advanced Features</div>; }
function AdvancedAnalyticsComponent() { return <div>Advanced Analytics</div>; }
function scrapeGoogleReviews(teamId: string, urls: string[]) { return {}; }
function scrapeFacebookReviews(data: any) { return {}; }
function scrapeReviews(teamId: string, platform: string, urls: string[]) { return {}; }
function executeScraping(platform: string, urls: string[]) { return {}; }
