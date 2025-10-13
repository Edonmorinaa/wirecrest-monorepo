#!/usr/bin/env tsx
/**
 * Test Notifications Script
 * 
 * Tests the complete notification system:
 * 1. Creates notifications in database
 * 2. Sends push notifications via Web Push API
 * 3. Syncs to UI via postgres_changes (automatic)
 * 
 * Usage: npx tsx scripts/test-notifications.ts <teamSlug|targetId> [scope] [mode]
 * 
 * Examples:
 *   npx tsx scripts/test-notifications.ts my-team              # Quick test to team
 *   npx tsx scripts/test-notifications.ts my-team scraper      # Scraper simulation
 *   npx tsx scripts/test-notifications.ts test5 user           # Test for specific user
 *   npx tsx scripts/test-notifications.ts ADMIN super full     # Full test for super admins
 */

import { sendNotification } from '../src/service';
import type { NotificationType, NotificationScope } from '../src/types';

// Google Scraper notification templates (realistic)
const SCRAPER_NOTIFICATIONS = [
  // New reviews found
  {
    type: 'mail' as NotificationType,
    title: '<p><strong>3</strong> new reviews found on Google Maps</p>',
    category: 'Reviews',
    metadata: { 
      platform: 'google',
      count: 3,
      averageRating: 4.1,
      scraperRun: true
    },
    expiresInDays: 7,
  },
  {
    type: 'mail' as NotificationType,
    title: '<p><strong>1</strong> new review found on Google Maps</p>',
    category: 'Reviews',
    metadata: { 
      platform: 'google',
      count: 1,
      averageRating: 5.0,
      scraperRun: true
    },
    expiresInDays: 7,
  },
  {
    type: 'payment' as NotificationType,
    title: '<p><strong>2</strong> new negative reviews found on Google Maps</p>',
    category: 'Reviews',
    metadata: { 
      platform: 'google',
      count: 2,
      averageRating: 2.3,
      urgency: 'high',
      scraperRun: true
    },
    expiresInDays: 3,
  },
  // Rating changes
  {
    type: 'mail' as NotificationType,
    title: '<p>Rating dropped from <strong>4.2</strong> to <strong>4.0</strong> on Google Maps</p>',
    category: 'Analytics',
    metadata: { 
      platform: 'google',
      previousRating: 4.2,
      currentRating: 4.0,
      change: -0.2,
      scraperRun: true
    },
    expiresInDays: 5,
  },
  {
    type: 'mail' as NotificationType,
    title: '<p>Rating improved from <strong>3.8</strong> to <strong>4.1</strong> on Google Maps</p>',
    category: 'Analytics',
    metadata: { 
      platform: 'google',
      previousRating: 3.8,
      currentRating: 4.1,
      change: 0.3,
      scraperRun: true
    },
    expiresInDays: 5,
  },
  // Scraper status updates
  {
    type: 'mail' as NotificationType,
    title: '<p>Google Maps scraper completed successfully</p>',
    category: 'System',
    metadata: { 
      platform: 'google',
      status: 'completed',
      reviewsFound: 5,
      scraperRun: true
    },
    expiresInDays: 1,
  },
  {
    type: 'mail' as NotificationType,
    title: '<p>Google Maps scraper found <strong>0</strong> new reviews</p>',
    category: 'System',
    metadata: { 
      platform: 'google',
      status: 'completed',
      reviewsFound: 0,
      scraperRun: true
    },
    expiresInDays: 1,
  },
  // Business updates
  {
    type: 'mail' as NotificationType,
    title: '<p>Business information updated on Google Maps</p>',
    category: 'Business',
    metadata: { 
      platform: 'google',
      updateType: 'business_info',
      scraperRun: true
    },
    expiresInDays: 3,
  },
  {
    type: 'mail' as NotificationType,
    title: '<p>New business listing detected on Google Maps</p>',
    category: 'Business',
    metadata: { 
      platform: 'google',
      updateType: 'new_listing',
      scraperRun: true
    },
    expiresInDays: 7,
  },
  // Error notifications
  {
    type: 'payment' as NotificationType,
    title: '<p><strong>WARNING:</strong> Google Maps scraper failed to load page</p>',
    category: 'System',
    metadata: { 
      platform: 'google',
      error: 'page_load_failed',
      retryCount: 2,
      scraperRun: true
    },
    expiresInDays: 1,
  },
  {
    type: 'mail' as NotificationType,
    title: '<p>Google Maps scraper rate limited - retrying in 5 minutes</p>',
    category: 'System',
    metadata: { 
      platform: 'google',
      error: 'rate_limited',
      retryIn: 300,
      scraperRun: true
    },
    expiresInDays: 1,
  },
];

// Test notification templates
const TEST_NOTIFICATIONS = [
  // Review notifications
  {
    type: 'mail' as NotificationType,
    title: '<p><strong>5</strong> new reviews received on Google Maps</p>',
    category: 'Reviews',
    metadata: { 
      platform: 'google',
      count: 5,
      averageRating: 4.2 
    },
    expiresInDays: 7,
  },
  {
    type: 'payment' as NotificationType,
    title: '<p><strong>URGENT:</strong> 2 negative reviews require immediate response</p>',
    category: 'Reviews',
    metadata: { 
      platform: 'facebook',
      count: 2,
      urgency: 'high'
    },
    expiresInDays: 3,
  },
  {
    type: 'mail' as NotificationType,
    title: '<p><strong>3</strong> new negative reviews on TripAdvisor</p>',
    category: 'Reviews',
    metadata: { 
      platform: 'tripadvisor',
      count: 3,
      averageRating: 1.7
    },
    expiresInDays: 7,
  },
  
  // Analytics notifications
  {
    type: 'project' as NotificationType,
    title: '<p>Rating dropped by <strong>0.7</strong> stars on Booking.com</p>',
    category: 'Analytics',
    metadata: { 
      platform: 'booking',
      oldRating: 4.5,
      newRating: 3.8,
      drop: 0.7
    },
    expiresInDays: 14,
  },
  {
    type: 'tags' as NotificationType,
    title: '<p>🎉 Milestone reached: <strong>500</strong> reviews!</p>',
    category: 'Milestone',
    metadata: { 
      platform: 'google',
      milestone: 500,
      totalReviews: 500
    },
    expiresInDays: 30,
  },
  
  // System notifications
  {
    type: 'order' as NotificationType,
    title: '<p>Business scraping failed after <strong>5</strong> retries</p>',
    category: 'System',
    metadata: { 
      businessProfileId: 'bp-123',
      platform: 'google',
      error: 'Network timeout',
      retries: 5
    },
    expiresInDays: 14,
  },
  {
    type: 'chat' as NotificationType,
    title: '<p>Failed to add business to schedule: <strong>Google Maps</strong></p>',
    category: 'System',
    metadata: { 
      businessProfileId: 'bp-456',
      platform: 'google',
      error: 'Invalid identifier'
    },
    expiresInDays: 7,
  },
  {
    type: 'delivery' as NotificationType,
    title: '<p>Scraper run aborted for <strong>Facebook Reviews</strong></p>',
    category: 'System',
    metadata: { 
      runId: 'run-789',
      platform: 'facebook',
      reason: 'User cancelled'
    },
    expiresInDays: 7,
  },
  
  // Success notifications
  {
    type: 'friend' as NotificationType,
    title: '<p>New business profile added: <strong>Restaurant XYZ</strong></p>',
    category: 'Success',
    metadata: { 
      businessName: 'Restaurant XYZ',
      platform: 'google',
      location: 'New York, NY'
    },
    expiresInDays: 7,
  },
  {
    type: 'file' as NotificationType,
    title: '<p>Weekly report is ready for download</p>',
    category: 'Reports',
    metadata: { 
      reportType: 'weekly',
      period: '2025-01-06 to 2025-01-12',
      fileSize: '2.4 MB'
    },
    expiresInDays: 14,
  },
];

/**
 * Send test notifications
 */
async function sendTestNotifications(
  targetId: string,
  scope: NotificationScope = 'user'
) {
  console.log('\n🧪 Starting notification tests...\n');
  console.log(`Target: ${targetId}`);
  console.log(`Scope: ${scope}`);
  console.log(`Notifications to send: ${TEST_NOTIFICATIONS.length}\n`);

  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (let i = 0; i < TEST_NOTIFICATIONS.length; i++) {
    const template = TEST_NOTIFICATIONS[i];
    
    try {
      console.log(`[${i + 1}/${TEST_NOTIFICATIONS.length}] Sending: ${template.title.replace(/<[^>]*>/g, '')}`);
      
      // Build payload based on scope
      const payload: any = {
        type: template.type,
        scope,
        title: template.title,
        category: template.category,
        metadata: template.metadata,
        expiresInDays: template.expiresInDays,
      };

      // Add scope-specific fields
      if (scope === 'user') {
        payload.userId = targetId;
      } else if (scope === 'team') {
        payload.teamId = targetId;
      } else if (scope === 'super') {
        payload.superRole = targetId;
      }

      const notification = await sendNotification(payload);
      
      console.log(`   ✅ Sent successfully (ID: ${notification.id})`);
      console.log(`   📦 Created in DB + Push notification sent`);
      results.sent++;
      
      // Wait a bit between notifications to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}`);
      results.failed++;
      results.errors.push(`${template.category}: ${error.message}`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60));
  console.log(`✅ Sent:   ${results.sent}/${TEST_NOTIFICATIONS.length}`);
  console.log(`❌ Failed: ${results.failed}/${TEST_NOTIFICATIONS.length}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Test completed!');
  console.log('='.repeat(60));
  console.log('\n💡 What happened:');
  console.log('   ✅ Notifications created in database');
  console.log('   ✅ Push notifications sent via Web Push API');
  console.log('   ✅ UI will update automatically via postgres_changes');
  console.log('\n💡 Next steps:');
  console.log('   1. Check your dashboard at: http://test5.wirecrest.local:3032');
  console.log('   2. Open the notifications drawer (bell icon)');
  console.log('   3. You should see all notifications in the UI');
  console.log('   4. Check browser push notifications appeared');
  console.log('   5. Click on push notification to open dashboard');
  console.log('\n');
}

/**
 * Find team by slug and return team ID
 */
async function findTeamBySlug(slug: string): Promise<string | null> {
  const { prisma } = await import('@wirecrest/db');
  
  try {
    const team = await prisma.team.findUnique({
      where: { slug },
      select: { 
        id: true, 
        name: true, 
        slug: true,
        members: {
          select: { userId: true },
        },
      },
    });
    
    if (!team) {
      console.error(`\n❌ Error: Team with slug "${slug}" not found in database.\n`);
      return null;
    }
    
    console.log(`✅ Found team: ${team.name} (${team.members.length} members)`);
    return team.id;
    
  } catch (error: any) {
    console.error(`\n❌ Database error: ${error.message}\n`);
    return null;
  }
}

/**
 * Validate that the target exists in the database
 */
async function validateTarget(targetId: string, scope: NotificationScope): Promise<boolean> {
  const { prisma } = await import('@wirecrest/db');
  
  try {
    if (scope === 'user') {
      const user = await prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true, email: true, name: true },
      });
      
      if (!user) {
        console.error(`\n❌ Error: User with ID "${targetId}" not found in database.\n`);
        console.error('💡 To find valid user IDs, run:');
        console.error('   npx tsx scripts/find-user.ts\n');
        return false;
      }
      
      console.log(`✅ Found user: ${user.email} (${user.name})`);
      return true;
      
    } else if (scope === 'team') {
      const team = await prisma.team.findUnique({
        where: { id: targetId },
        select: { 
          id: true, 
          name: true, 
          slug: true,
          members: {
            select: { userId: true },
          },
        },
      });
      
      if (!team) {
        console.error(`\n❌ Error: Team with ID "${targetId}" not found in database.\n`);
        console.error('💡 To find valid team IDs, run:');
        console.error('   npx tsx scripts/find-team.ts\n');
        return false;
      }
      
      console.log(`✅ Found team: ${team.name} (${team.members.length} members)`);
      return true;
      
    } else if (scope === 'super') {
      // Super role doesn't need validation
      console.log(`✅ Sending to super role: ${targetId}`);
      return true;
    }
    
    return false;
  } catch (error: any) {
    console.error(`\n❌ Database error: ${error.message}\n`);
    return false;
  }
}

/**
 * Send a single test notification (quick test)
 */
async function sendQuickTest(targetId: string, scope: NotificationScope = 'user') {
  console.log('\n🚀 Sending quick test notification...\n');
  
  // Validate target exists
  const isValid = await validateTarget(targetId, scope);
  if (!isValid) {
    process.exit(1);
  }
  
  console.log(''); // Empty line for formatting
  
  const payload: any = {
    type: 'mail',
    scope,
    title: `<p><strong>Test Notification</strong> sent at ${new Date().toLocaleTimeString()}</p>`,
    category: 'Test',
    metadata: { 
      test: true,
      timestamp: new Date().toISOString(),
    },
    expiresInDays: 1,
  };

  if (scope === 'user') {
    payload.userId = targetId;
  } else if (scope === 'team') {
    payload.teamId = targetId;
  } else if (scope === 'super') {
    payload.superRole = targetId;
  }

  try {
    const notification = await sendNotification(payload);
    console.log(`✅ Test notification sent successfully!`);
    console.log(`   ID: ${notification.id}`);
    console.log(`   Type: ${notification.type}`);
    console.log(`   Scope: ${notification.scope}`);
    console.log(`\n💡 What happened:`);
    console.log(`   1. ✅ Notification saved to database`);
    console.log(`   2. ✅ Push notification sent via Web Push API`);
    console.log(`   3. ✅ postgres_changes will sync to connected clients`);
    
    if (scope === 'team') {
      console.log(`\n💡 All team members will:`);
      console.log(`   - See notification in their dashboard (real-time)`);
      console.log(`   - Receive browser push notification (if enabled)`);
      console.log(`   - Get notified on all their devices\n`);
    } else {
      console.log(`\n💡 The user will:`);
      console.log(`   - See notification in their dashboard (real-time)`);
      console.log(`   - Receive browser push notification (if enabled)`);
      console.log(`   - Get notified on all their devices\n`);
    }
  } catch (error: any) {
    console.error(`❌ Failed to send test notification: ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * Send realistic Google scraper test notifications (3-5 random notifications)
 */
async function sendScraperTest(targetId: string, scope: NotificationScope) {
  console.log(`\n🤖 Sending Google scraper test notifications to ${scope}: ${targetId}\n`);

  // Randomly select 3-5 notifications from scraper templates
  const numNotifications = Math.floor(Math.random() * 3) + 3; // 3-5 notifications
  const selectedNotifications = SCRAPER_NOTIFICATIONS
    .sort(() => 0.5 - Math.random()) // Shuffle array
    .slice(0, numNotifications);

  let successCount = 0;
  let failureCount = 0;

  console.log(`📊 Sending ${numNotifications} realistic scraper notifications...\n`);

  for (let i = 0; i < selectedNotifications.length; i++) {
    const notification = selectedNotifications[i];
    const delay = Math.random() * 2000 + 500; // 0.5-2.5 second delay between notifications

    try {
      // Add some randomization to make it more realistic
      const randomizedNotification = {
        ...notification,
        title: notification.title.replace(/\d+/g, (match) => {
          const num = parseInt(match);
          return Math.floor(Math.random() * num * 2 + 1).toString();
        }),
        metadata: {
          ...notification.metadata,
          timestamp: new Date().toISOString(),
          scraperRunId: `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        },
      };

      const payload: any = {
        ...randomizedNotification,
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

      successCount++;
      console.log(`✅ [${i + 1}/${numNotifications}] ${notification.title.replace(/<[^>]*>/g, '')}`);

      // Add delay between notifications to simulate real scraper behavior
      if (i < selectedNotifications.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error: any) {
      failureCount++;
      console.error(`❌ [${i + 1}/${numNotifications}] Failed: ${error.message}`);
    }
  }

  console.log(`\n📈 Scraper test completed:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  console.log(`\n💡 These notifications simulate real Google Maps scraper activity.\n`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Show usage if no arguments
  if (args.length === 0) {
    console.log('\n📱 Test Notifications Script\n');
    console.log('Usage:');
    console.log('  npx tsx scripts/test-notifications.ts <teamSlug|targetId> [scope] [mode]\n');
    console.log('Arguments:');
    console.log('  teamSlug - Team slug (e.g., "my-team") - will auto-detect and send to team');
    console.log('  targetId - User ID or Super Role (e.g., "test5", "ADMIN") - requires scope');
    console.log('  scope    - Notification scope: "user", "team", or "super" (optional if slug provided)');
    console.log('  mode     - Test mode: "full", "quick", or "scraper"\n');
    console.log('Examples:');
    console.log('  npx tsx scripts/test-notifications.ts my-team            # Send to team by slug');
    console.log('  npx tsx scripts/test-notifications.ts my-team quick       # Quick test to team');
    console.log('  npx tsx scripts/test-notifications.ts my-team scraper     # Google scraper simulation');
    console.log('  npx tsx scripts/test-notifications.ts test5 user          # Send to user ID');
    console.log('  npx tsx scripts/test-notifications.ts ADMIN super         # Send to super role\n');
    process.exit(0);
  }

  const firstArg = args[0];
  let targetId = firstArg;
  let scope = (args[1] || 'team') as NotificationScope;
  let mode = args[2] || 'quick';

  // If scope is 'quick', 'full', or 'scraper', it means user didn't specify scope
  // So treat first arg as team slug and second arg as mode
  if (args[1] === 'quick' || args[1] === 'full' || args[1] === 'scraper') {
    mode = args[1];
    scope = 'team';
  }

  // If no scope specified and first arg looks like a slug (contains hyphen or is lowercase)
  // assume it's a team slug
  if (!args[1] || args[1] === 'quick' || args[1] === 'full' || args[1] === 'scraper') {
    if (firstArg.includes('-') || firstArg === firstArg.toLowerCase()) {
      scope = 'team';
    }
  }

  // Validate scope
  if (!['user', 'team', 'super'].includes(scope)) {
    console.error('❌ Error: scope must be "user", "team", or "super"\n');
    process.exit(1);
  }

  // Validate mode
  if (!['full', 'quick', 'scraper'].includes(mode)) {
    console.error('❌ Error: mode must be "full", "quick", or "scraper"\n');
    process.exit(1);
  }

  try {
    // If scope is team, try to find team by slug first
    if (scope === 'team') {
      console.log(`\n🔍 Looking up team by slug: "${firstArg}"`);
      const teamId = await findTeamBySlug(firstArg);
      
      if (!teamId) {
        console.error('💡 Make sure the team slug is correct.\n');
        process.exit(1);
      }
      
      targetId = teamId;
      console.log(''); // Empty line for formatting
    }

    if (mode === 'quick') {
      await sendQuickTest(targetId, scope);
    } else if (mode === 'scraper') {
      await sendScraperTest(targetId, scope);
    } else {
      // Validate before sending all notifications
      const isValid = await validateTarget(targetId, scope);
      if (!isValid) {
        process.exit(1);
      }
      await sendTestNotifications(targetId, scope);
    }
  } catch (error: any) {
    console.error(`\n❌ Fatal error: ${error.message}\n`);
    process.exit(1);
  }
}

// Run the script
main();

