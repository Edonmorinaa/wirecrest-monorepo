/**
 * Simple Global Schedule Setup Script
 * 
 * Creates the initial global schedules in Apify without complex dependencies.
 * This is a simplified version that just creates the basic schedule structure.
 */

import 'dotenv/config';
import { ApifyClient } from 'apify-client';

const APIFY_TOKEN = process.env.APIFY_TOKEN!;
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || 'http://localhost:3000';

// Actor IDs for each platform
const ACTOR_IDS = {
  google_reviews: 'Xb8osYTtOjlsgI6k9',
  facebook: 'dX3d80hsNMilEwjXG',
  tripadvisor: 'Hvp4YfFGyLM635Q2F',
  booking: 'PbMHke3jW25J6hSOA',
};

// Common intervals in hours
const INTERVALS = [6, 12, 24, 72];
const SCHEDULE_TYPES = ['reviews', 'overview'];

async function setupGlobalSchedules() {
  console.log('🚀 Setting up global schedules in Apify...\n');

  const apifyClient = new ApifyClient({ token: APIFY_TOKEN });
  let schedulesCreated = 0;

  try {
    for (const [platform, actorId] of Object.entries(ACTOR_IDS)) {
      console.log(`📍 Setting up ${platform} schedules...`);

      for (const interval of INTERVALS) {
        for (const scheduleType of SCHEDULE_TYPES) {
          const scheduleName = `${platform}-${interval}h-${scheduleType}`;
          
          try {
            // Check if schedule already exists
            const existingSchedules = await apifyClient.schedules().list({
              limit: 100,
            });
            
            const exists = existingSchedules.items.some(s => s.name === scheduleName);
            
            if (exists) {
              console.log(`  ✓ ${scheduleName} already exists, skipping`);
              continue;
            }

            // Create cron expression
            const cronExpression = getCronExpression(interval);

            // Create schedule in Apify
            const schedule = await apifyClient.schedules().create({
              name: scheduleName,
              cronExpression,
              isEnabled: false, // Start disabled, will be enabled when businesses are added
              isExclusive: false,
              actions: [
                {
                  type: 'RUN_ACTOR' as any,
                  actorId,
                  runInput: {
                    body: JSON.stringify({
                      // Empty initially, will be populated when businesses are added
                      placeIds: [],
                      maxReviews: 50,
                    }),
                    contentType: 'application/json',
                  },
                  runOptions: {
                    build: 'latest',
                    timeoutSecs: 3600,
                    memoryMbytes: 4096,
                  } as any,
                },
              ],
            });

            console.log(`  ✅ Created ${scheduleName} (ID: ${schedule.id})`);
            schedulesCreated++;

          } catch (error: any) {
            console.error(`  ❌ Failed to create ${scheduleName}: ${error.message}`);
          }
        }
      }
    }

    console.log(`\n🎉 Setup complete! Created ${schedulesCreated} global schedules.`);
    console.log('\nNext steps:');
    console.log('1. Run the migration script to populate schedules with businesses');
    console.log('2. Test the system with a subscription webhook');
    console.log('3. Monitor the schedules in Apify console');

  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

function getCronExpression(intervalHours: number): string {
  if (intervalHours === 24) {
    return '0 9 * * *'; // Daily at 9 AM
  } else if (intervalHours === 12) {
    return '0 */12 * * *'; // Every 12 hours
  } else if (intervalHours === 6) {
    return '0 */6 * * *'; // Every 6 hours
  } else if (intervalHours === 72) {
    return '0 10 */3 * *'; // Every 3 days at 10 AM
  } else {
    return `0 */${intervalHours} * * *`; // Every N hours
  }
}

// Run the setup
setupGlobalSchedules().catch(console.error);
