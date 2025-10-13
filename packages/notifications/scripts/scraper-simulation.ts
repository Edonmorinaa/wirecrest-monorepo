#!/usr/bin/env tsx
/**
 * Google Reviews Scraper Simulation Script
 * 
 * Simulates a realistic Google Maps scraper run over 20 seconds, sending
 * various notification types as it would in a real scraping scenario.
 * 
 * Each notification:
 * 1. Is saved to database
 * 2. Triggers push notification via Web Push API
 * 3. Syncs to UI automatically via postgres_changes
 * 
 * Usage: npx tsx scripts/scraper-simulation.ts <teamSlug> [role]
 * 
 * Examples:
 *   npx tsx scripts/scraper-simulation.ts my-team
 *   npx tsx scripts/scraper-simulation.ts my-team ADMIN
 */

import { sendNotification } from '../src/service';
import type { NotificationType, NotificationScope } from '../src/types';

// Realistic scraper notification scenarios
const SCRAPER_SCENARIOS = [
  // Initial scraper start
  {
    delay: 0,
    type: 'mail' as NotificationType,
    title: '<p>🔍 Starting Google Maps scraper for business monitoring</p>',
    category: 'System',
    metadata: { 
      platform: 'google',
      status: 'starting',
      scraperRun: true
    },
    expiresInDays: 1,
  },
  
  // Page loading
  {
    delay: 2000,
    type: 'mail' as NotificationType,
    title: '<p>📄 Loading Google Maps business page...</p>',
    category: 'System',
    metadata: { 
      platform: 'google',
      status: 'loading',
      scraperRun: true
    },
    expiresInDays: 1,
  },
  
  // Finding reviews
  {
    delay: 4000,
    type: 'mail' as NotificationType,
    title: '<p><strong>3</strong> new reviews found on Google Maps</p>',
    category: 'Reviews',
    metadata: { 
      platform: 'google',
      count: 3,
      averageRating: 4.2,
      scraperRun: true
    },
    expiresInDays: 7,
  },
  
  // Rating change detected
  {
    delay: 6000,
    type: 'payment' as NotificationType,
    title: '<p>📉 Rating dropped from <strong>4.3</strong> to <strong>4.1</strong> on Google Maps</p>',
    category: 'Analytics',
    metadata: { 
      platform: 'google',
      previousRating: 4.3,
      currentRating: 4.1,
      change: -0.2,
      scraperRun: true
    },
    expiresInDays: 5,
  },
  
  // Negative review alert
  {
    delay: 8000,
    type: 'payment' as NotificationType,
    title: '<p>🚨 <strong>URGENT:</strong> 2 negative reviews require immediate response</p>',
    category: 'Reviews',
    metadata: { 
      platform: 'google',
      count: 2,
      averageRating: 1.8,
      urgency: 'high',
      scraperRun: true
    },
    expiresInDays: 3,
  },
  
  // More reviews found
  {
    delay: 10000,
    type: 'mail' as NotificationType,
    title: '<p><strong>1</strong> additional review found on Google Maps</p>',
    category: 'Reviews',
    metadata: { 
      platform: 'google',
      count: 1,
      averageRating: 5.0,
      scraperRun: true
    },
    expiresInDays: 7,
  },
  
  // Business info update
  {
    delay: 12000,
    type: 'file' as NotificationType,
    title: '<p>📝 Business information updated on Google Maps</p>',
    category: 'Business',
    metadata: { 
      platform: 'google',
      updateType: 'business_info',
      scraperRun: true
    },
    expiresInDays: 3,
  },
  
  // Rating improvement
  {
    delay: 14000,
    type: 'mail' as NotificationType,
    title: '<p>📈 Rating improved from <strong>4.1</strong> to <strong>4.3</strong> on Google Maps</p>',
    category: 'Analytics',
    metadata: { 
      platform: 'google',
      previousRating: 4.1,
      currentRating: 4.3,
      change: 0.2,
      scraperRun: true
    },
    expiresInDays: 5,
  },
  
  // Scraper completion
  {
    delay: 16000,
    type: 'mail' as NotificationType,
    title: '<p>✅ Google Maps scraper completed successfully</p>',
    category: 'System',
    metadata: { 
      platform: 'google',
      status: 'completed',
      reviewsFound: 4,
      scraperRun: true
    },
    expiresInDays: 1,
  },
  
  // Final summary
  {
    delay: 18000,
    type: 'order' as NotificationType,
    title: '<p>📊 Scraper Summary: <strong>4</strong> reviews found, rating changed to <strong>4.3</strong></p>',
    category: 'Analytics',
    metadata: { 
      platform: 'google',
      totalReviews: 4,
      finalRating: 4.3,
      scraperRun: true
    },
    expiresInDays: 7,
  }
];

// Error scenarios (randomly triggered)
const ERROR_SCENARIOS = [
  {
    delay: 0,
    type: 'payment' as NotificationType,
    title: '<p>⚠️ Google Maps scraper rate limited - retrying in 2 minutes</p>',
    category: 'System',
    metadata: { 
      platform: 'google',
      error: 'rate_limited',
      retryIn: 120,
      scraperRun: true
    },
    expiresInDays: 1,
  },
  {
    delay: 0,
    type: 'payment' as NotificationType,
    title: '<p>❌ Google Maps scraper failed to load page - retrying</p>',
    category: 'System',
    metadata: { 
      platform: 'google',
      error: 'page_load_failed',
      retryCount: 1,
      scraperRun: true
    },
    expiresInDays: 1,
  },
  {
    delay: 0,
    type: 'payment' as NotificationType,
    title: '<p>🔒 Google Maps scraper blocked by CAPTCHA - manual intervention required</p>',
    category: 'System',
    metadata: { 
      platform: 'google',
      error: 'captcha_blocked',
      requiresManual: true,
      scraperRun: true
    },
    expiresInDays: 1,
  }
];

/**
 * Find team by slug
 */
async function findTeamBySlug(slug: string): Promise<string | null> {
  try {
    const { PrismaClient } = await import('@wirecrest/db');
    const prisma = new PrismaClient();
    
    const team = await prisma.team.findFirst({
      where: { slug },
      select: { id: true }
    });
    
    await prisma.$disconnect();
    return team?.id || null;
  } catch (error) {
    console.error('❌ Error finding team:', error);
    return null;
  }
}

/**
 * Validate target exists
 */
async function validateTarget(targetId: string, scope: NotificationScope): Promise<boolean> {
  try {
    const { PrismaClient } = await import('@wirecrest/db');
    const prisma = new PrismaClient();
    
    if (scope === 'user') {
      const user = await prisma.user.findUnique({ where: { id: targetId } });
      if (!user) {
        console.error(`❌ User not found: ${targetId}`);
        return false;
      }
    } else if (scope === 'team') {
      const team = await prisma.team.findUnique({ where: { id: targetId } });
      if (!team) {
        console.error(`❌ Team not found: ${targetId}`);
        return false;
      }
    }
    
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.error('❌ Error validating target:', error);
    return false;
  }
}

/**
 * Send notification with proper payload structure
 */
async function sendScraperNotification(
  targetId: string, 
  scope: NotificationScope, 
  notification: any
): Promise<boolean> {
  try {
    const payload: any = {
      ...notification,
      scope,
    };

    if (scope === 'user') {
      payload.userId = targetId;
    } else if (scope === 'team') {
      payload.teamId = targetId;
    } else if (scope === 'super') {
      payload.superRole = targetId;
    }

    await sendNotification(payload);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to send notification: ${error.message}`);
    return false;
  }
}

/**
 * Run the scraper simulation
 */
async function runScraperSimulation(teamSlug: string, role?: string) {
  console.log('\n🤖 Starting Google Reviews Scraper Simulation\n');
  console.log(`📋 Team: ${teamSlug}`);
  if (role) console.log(`👤 Role: ${role}`);
  console.log(`⏱️  Duration: 20 seconds\n`);

  // Determine scope and target
  let scope: NotificationScope = 'team';
  let targetId: string;

  if (role && ['ADMIN', 'SUPPORT'].includes(role)) {
    scope = 'super';
    targetId = role;
  } else {
    // Find team by slug
    console.log(`🔍 Looking up team: ${teamSlug}`);
    targetId = await findTeamBySlug(teamSlug);
    
    if (!targetId) {
      console.error(`❌ Team not found: ${teamSlug}`);
      console.error('💡 Make sure the team slug is correct.\n');
      process.exit(1);
    }
  }

  // Validate target
  const isValid = await validateTarget(targetId, scope);
  if (!isValid) {
    process.exit(1);
  }

  console.log(`✅ Target validated: ${scope} ${targetId}\n`);

  // Start simulation
  const startTime = Date.now();
  let successCount = 0;
  let failureCount = 0;
  let errorTriggered = false;

  // Randomly decide if we should trigger an error scenario
  const shouldTriggerError = Math.random() < 0.3; // 30% chance of error

  console.log('🚀 Starting scraper simulation...\n');

  // Process all scenarios
  for (const scenario of SCRAPER_SCENARIOS) {
    // Check if we should trigger an error
    if (shouldTriggerError && !errorTriggered && scenario.delay > 5000) {
      const errorScenario = ERROR_SCENARIOS[Math.floor(Math.random() * ERROR_SCENARIOS.length)];
      errorTriggered = true;
      
      // Wait for error scenario delay
      await new Promise(resolve => setTimeout(resolve, errorScenario.delay));
      
      console.log(`⚠️  [${Math.floor((Date.now() - startTime) / 1000)}s] ${errorScenario.title.replace(/<[^>]*>/g, '')}`);
      
      const success = await sendScraperNotification(targetId, scope, errorScenario);
      if (success) {
        successCount++;
        console.log('✅ Error notification sent');
      } else {
        failureCount++;
        console.log('❌ Failed to send error notification');
      }
      
      // Skip remaining scenarios if error occurred
      break;
    }

    // Wait for scenario delay
    await new Promise(resolve => setTimeout(resolve, scenario.delay));

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`📡 [${elapsed}s] ${scenario.title.replace(/<[^>]*>/g, '')}`);

    const success = await sendScraperNotification(targetId, scope, scenario);
    if (success) {
      successCount++;
      console.log('✅ Notification sent (DB + Push)');
    } else {
      failureCount++;
      console.log('❌ Failed to send notification');
    }
  }

  // Final summary
  const totalTime = Math.floor((Date.now() - startTime) / 1000);
  console.log(`\n📈 Scraper simulation completed in ${totalTime}s:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  console.log(`\n💡 These notifications simulate real Google Maps scraper activity.`);
  console.log(`💡 Each notification was:`);
  console.log(`   1. Saved to database`);
  console.log(`   2. Sent as push notification via Web Push API`);
  console.log(`   3. Synced to UI via postgres_changes (automatic)`);
  console.log(`\n💡 Check your dashboard and browser notifications!\n`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Show usage if no arguments
  if (args.length === 0) {
    console.log('\n🤖 Google Reviews Scraper Simulation\n');
    console.log('Usage:');
    console.log('  npx tsx scripts/scraper-simulation.ts <teamSlug> [role]\n');
    console.log('Arguments:');
    console.log('  teamSlug - Team slug (e.g., "my-team")');
    console.log('  role     - Optional role: "ADMIN" or "SUPPORT" for super notifications\n');
    console.log('Examples:');
    console.log('  npx tsx scripts/scraper-simulation.ts my-team');
    console.log('  npx tsx scripts/scraper-simulation.ts my-team ADMIN\n');
    process.exit(0);
  }

  const teamSlug = args[0];
  const role = args[1];

  if (!teamSlug) {
    console.error('❌ Error: teamSlug is required\n');
    process.exit(1);
  }

  if (role && !['ADMIN', 'SUPPORT'].includes(role)) {
    console.error('❌ Error: role must be "ADMIN" or "SUPPORT"\n');
    process.exit(1);
  }

  try {
    await runScraperSimulation(teamSlug, role);
  } catch (error: any) {
    console.error(`\n❌ Fatal error: ${error.message}\n`);
    process.exit(1);
  }
}

// Run the script
main();
