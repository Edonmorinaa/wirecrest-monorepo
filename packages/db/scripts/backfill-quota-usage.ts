/**
 * Data Backfill Script for Quota System
 * 
 * This script initializes quota usage for existing teams by:
 * 1. Counting existing team members (seats.used)
 * 2. Counting existing business locations (locations.used)
 * 3. Creating TenantFeatures records with initial quota data
 * 4. Mapping Stripe customers to plan tiers
 * 
 * Run with: npx tsx packages/db/scripts/backfill-quota-usage.ts
 */

import { PrismaClient } from '@prisma/client';
import { StripeService } from '@wirecrest/billing';
import Stripe from 'stripe';

const prisma = new PrismaClient();

// Initialize Stripe (optional - only if STRIPE_SECRET_KEY is set)
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = StripeService.getStripeInstance();
}

interface BackfillStats {
  teamsProcessed: number;
  teamsCreated: number;
  teamsUpdated: number;
  teamsSkipped: number;
  errors: Array<{ teamId: string; error: string }>;
}

/**
 * Main backfill function
 */
async function backfillQuotaUsage(options: {
  dryRun?: boolean;
  force?: boolean;
  teamId?: string;
} = {}): Promise<BackfillStats> {
  const { dryRun = false, force = false, teamId } = options;

  console.log('🚀 Starting quota usage backfill...');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Force: ${force ? 'YES' : 'NO'}`);
  if (teamId) console.log(`Target team: ${teamId}`);
  console.log('---');

  const stats: BackfillStats = {
    teamsProcessed: 0,
    teamsCreated: 0,
    teamsUpdated: 0,
    teamsSkipped: 0,
    errors: [],
  };

  try {
    // Get all teams or specific team
    const teams = await prisma.team.findMany({
      where: teamId ? { id: teamId } : {},
      select: {
        id: true,
        name: true,
        slug: true,
        stripeCustomerId: true,
      },
    });

    console.log(`Found ${teams.length} team(s) to process\n`);

    for (const team of teams) {
      try {
        console.log(`Processing team: ${team.name} (${team.id})`);
        stats.teamsProcessed++;

        // Check if TenantFeatures already exists
        const existingConfig = await prisma.tenantFeatures.findUnique({
          where: { tenantId: team.id },
        });

        if (existingConfig && !force) {
          console.log(`  ⏭️  Skipping - TenantFeatures already exists`);
          stats.teamsSkipped++;
          continue;
        }

        // Count current usage
        const [seatsCount, googleLocationsCount, facebookLocationsCount, tripAdvisorLocationsCount, bookingLocationsCount] = await Promise.all([
          prisma.teamMember.count({ where: { teamId: team.id } }),
          prisma.googleBusinessProfile.count({ where: { teamId: team.id } }),
          prisma.facebookBusinessProfile.count({ where: { teamId: team.id } }),
          prisma.tripAdvisorBusinessProfile.count({ where: { teamId: team.id } }),
          prisma.bookingBusinessProfile.count({ where: { teamId: team.id } }),
        ]);

        const totalLocations = googleLocationsCount + facebookLocationsCount + tripAdvisorLocationsCount + bookingLocationsCount;

        console.log(`  📊 Current usage:`);
        console.log(`     - Seats: ${seatsCount}`);
        console.log(`     - Locations: ${totalLocations}`);
        console.log(`       • Google: ${googleLocationsCount}`);
        console.log(`       • Facebook: ${facebookLocationsCount}`);
        console.log(`       • TripAdvisor: ${tripAdvisorLocationsCount}`);
        console.log(`       • Booking: ${bookingLocationsCount}`);

        // Determine plan tier from Stripe (if available)
        let planTier: 'basic' | 'pro' | 'enterprise' | 'demo' = 'basic';
        let planId: string | null = null;
        let isCustom = false;

        if (stripe && team.stripeCustomerId) {
          try {
            const subscriptions = await stripe.subscriptions.list({
              customer: team.stripeCustomerId,
              status: 'active',
              limit: 1,
            });

            if (subscriptions.data.length > 0) {
              const subscription = subscriptions.data[0];
              const priceId = subscription.items.data[0]?.price?.id;
              planId = priceId || null;

              // Get product metadata to determine tier
              if (priceId) {
                const price = await stripe.prices.retrieve(priceId, {
                  expand: ['product'],
                });

                if (price.product && typeof price.product === 'object') {
                  const productMetadata = price.product.metadata;
                  if (productMetadata.planTier) {
                    planTier = productMetadata.planTier as typeof planTier;
                  }
                  if (productMetadata.custom === 'true') {
                    isCustom = true;
                  }
                }
              }

              console.log(`  💳 Stripe plan: ${planTier} (${isCustom ? 'custom' : 'standard'})`);
            } else {
              console.log(`  💳 No active Stripe subscription - using basic tier`);
            }
          } catch (stripeError) {
            console.log(`  ⚠️  Stripe lookup failed: ${stripeError instanceof Error ? stripeError.message : 'Unknown error'}`);
          }
        }

        // Create initial features JSON with quota usage
        const features = {
          quotas: {
            seats: {
              used: seatsCount,
              resetAt: new Date().toISOString(),
            },
            locations: {
              used: totalLocations,
              resetAt: new Date().toISOString(),
            },
            reviewRateLimit: {
              used: 0,
              resetAt: getNextResetDate('daily').toISOString(),
            },
            apiCalls: {
              used: 0,
              resetAt: getNextResetDate('daily').toISOString(),
            },
            dataRetention: {
              used: 0,
              resetAt: new Date().toISOString(),
            },
            exportLimit: {
              used: 0,
              resetAt: getNextResetDate('monthly').toISOString(),
            },
          },
        };

        if (!dryRun) {
          if (existingConfig) {
            // Update existing
            await prisma.tenantFeatures.update({
              where: { tenantId: team.id },
              data: {
                planTier,
                planId,
                isCustom,
                features: features as any,
                updatedAt: new Date(),
              },
            });
            stats.teamsUpdated++;
            console.log(`  ✅ Updated TenantFeatures`);
          } else {
            // Create new
            await prisma.tenantFeatures.create({
              data: {
                tenantId: team.id,
                planTier,
                planId,
                isCustom,
                features: features as any,
                scrapeIntervalHours: 6, // Default
              },
            });
            stats.teamsCreated++;
            console.log(`  ✅ Created TenantFeatures`);
          }
        } else {
          console.log(`  🔍 Would create/update TenantFeatures (dry run)`);
        }

        console.log('');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`  ❌ Error processing team ${team.id}: ${errorMessage}`);
        stats.errors.push({ teamId: team.id, error: errorMessage });
        console.log('');
      }
    }

    // Print summary
    console.log('---');
    console.log('📈 Backfill Summary:');
    console.log(`   Teams Processed: ${stats.teamsProcessed}`);
    console.log(`   Teams Created: ${stats.teamsCreated}`);
    console.log(`   Teams Updated: ${stats.teamsUpdated}`);
    console.log(`   Teams Skipped: ${stats.teamsSkipped}`);
    console.log(`   Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      stats.errors.forEach((err) => {
        console.log(`   - Team ${err.teamId}: ${err.error}`);
      });
    }

    return stats;
  } catch (error) {
    console.error('Fatal error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Calculate next reset date based on period
 */
function getNextResetDate(period: 'daily' | 'monthly'): Date {
  const now = new Date();
  const next = new Date(now);

  if (period === 'daily') {
    next.setHours(0, 0, 0, 0);
    next.setDate(next.getDate() + 1);
  } else if (period === 'monthly') {
    next.setHours(0, 0, 0, 0);
    next.setMonth(next.getMonth() + 1);
    next.setDate(1);
  }

  return next;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const options: Parameters<typeof backfillQuotaUsage>[0] = {};

  // Parse command line arguments
  if (args.includes('--dry-run')) {
    options.dryRun = true;
  }
  if (args.includes('--force')) {
    options.force = true;
  }
  const teamIdIndex = args.indexOf('--team-id');
  if (teamIdIndex !== -1 && args[teamIdIndex + 1]) {
    options.teamId = args[teamIdIndex + 1];
  }

  try {
    await backfillQuotaUsage(options);
    console.log('\n✅ Backfill completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { backfillQuotaUsage };
