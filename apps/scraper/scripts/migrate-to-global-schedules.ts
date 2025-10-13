/**
 * Migration Script: Per-Team Schedules → Global Schedules
 * 
 * This script migrates the existing per-team schedule system to the new
 * global interval-based schedule system.
 * 
 * Usage:
 *   ts-node scripts/migrate-to-global-schedules.ts
 */

import 'dotenv/config';
import { prisma } from '@wirecrest/db';
import { GlobalScheduleOrchestrator } from '../src/services/subscription/GlobalScheduleOrchestrator';
import { FeatureExtractor } from '../src/services/subscription/FeatureExtractor';
import type { Platform } from '../src/types/apify.types';

const APIFY_TOKEN = process.env.APIFY_API_TOKEN!;
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || 'http://localhost:3000';

async function migrate() {
  console.log('🚀 Starting migration to global schedules...\n');

  const globalOrchestrator = new GlobalScheduleOrchestrator(APIFY_TOKEN, WEBHOOK_BASE_URL);
  const featureExtractor = new FeatureExtractor();

  // Step 1: Initialize all global schedules
  console.log('Step 1: Initializing global schedules...');
  const initResult = await globalOrchestrator.initializeGlobalSchedules();
  console.log(`✓ ${initResult.message}\n`);

  // Step 2: Migrate existing businesses to global schedules
  console.log('Step 2: Migrating businesses to global schedules...');

  let totalBusinessesMigrated = 0;
  let errors: string[] = [];

  // Migrate Google Business Profiles
  console.log('  📍 Migrating Google Business Profiles...');
  const googleProfiles = await prisma.googleBusinessProfile.findMany();
  
  for (const profile of googleProfiles) {
    try {
      if (!profile.placeId) {
        console.warn(`    ⚠️  Skipping profile ${profile.id}: no placeId`);
        continue;
      }

      // Get team's interval
      const interval = await featureExtractor.getIntervalForTeamPlatform(
        profile.teamId,
        'google_reviews',
        'reviews'
      );

      // Add to global schedule
      const result = await globalOrchestrator.addBusinessToSchedule(
        profile.id,
        profile.teamId,
        'google_reviews',
        profile.placeId,
        interval
      );

      if (result.success) {
        totalBusinessesMigrated++;
        console.log(`    ✓ Migrated: ${profile.placeId} (team: ${profile.teamId}, interval: ${interval}h)`);
      } else {
        errors.push(`Google profile ${profile.id}: ${result.message}`);
        console.error(`    ❌ Failed: ${profile.placeId} - ${result.message}`);
      }
    } catch (error: any) {
      errors.push(`Google profile ${profile.id}: ${error.message}`);
      console.error(`    ❌ Error migrating ${profile.id}:`, error.message);
    }
  }

  // Migrate Facebook Business Profiles
  console.log('  📘 Migrating Facebook Business Profiles...');
  const facebookProfiles = await prisma.facebookBusinessProfile.findMany();
  
  for (const profile of facebookProfiles) {
    try {
      if (!profile.facebookUrl) {
        console.warn(`    ⚠️  Skipping profile ${profile.id}: no facebookUrl`);
        continue;
      }

      const interval = await featureExtractor.getIntervalForTeamPlatform(
        profile.teamId,
        'facebook',
        'reviews'
      );

      const result = await globalOrchestrator.addBusinessToSchedule(
        profile.id,
        profile.teamId,
        'facebook',
        profile.facebookUrl,
        interval
      );

      if (result.success) {
        totalBusinessesMigrated++;
        console.log(`    ✓ Migrated: ${profile.facebookUrl} (team: ${profile.teamId}, interval: ${interval}h)`);
      } else {
        errors.push(`Facebook profile ${profile.id}: ${result.message}`);
        console.error(`    ❌ Failed: ${profile.facebookUrl} - ${result.message}`);
      }
    } catch (error: any) {
      errors.push(`Facebook profile ${profile.id}: ${error.message}`);
      console.error(`    ❌ Error migrating ${profile.id}:`, error.message);
    }
  }

  // Migrate TripAdvisor Business Profiles
  console.log('  ✈️  Migrating TripAdvisor Business Profiles...');
  const tripAdvisorProfiles = await prisma.tripAdvisorBusinessProfile.findMany();
  
  for (const profile of tripAdvisorProfiles) {
    try {
      if (!profile.tripAdvisorUrl) {
        console.warn(`    ⚠️  Skipping profile ${profile.id}: no tripAdvisorUrl`);
        continue;
      }

      const interval = await featureExtractor.getIntervalForTeamPlatform(
        profile.teamId,
        'tripadvisor',
        'reviews'
      );

      const result = await globalOrchestrator.addBusinessToSchedule(
        profile.id,
        profile.teamId,
        'tripadvisor',
        profile.tripAdvisorUrl,
        interval
      );

      if (result.success) {
        totalBusinessesMigrated++;
        console.log(`    ✓ Migrated: ${profile.tripAdvisorUrl} (team: ${profile.teamId}, interval: ${interval}h)`);
      } else {
        errors.push(`TripAdvisor profile ${profile.id}: ${result.message}`);
        console.error(`    ❌ Failed: ${profile.tripAdvisorUrl} - ${result.message}`);
      }
    } catch (error: any) {
      errors.push(`TripAdvisor profile ${profile.id}: ${error.message}`);
      console.error(`    ❌ Error migrating ${profile.id}:`, error.message);
    }
  }

  // Migrate Booking Business Profiles
  console.log('  🏨 Migrating Booking Business Profiles...');
  const bookingProfiles = await prisma.bookingBusinessProfile.findMany();
  
  for (const profile of bookingProfiles) {
    try {
      if (!profile.bookingUrl) {
        console.warn(`    ⚠️  Skipping profile ${profile.id}: no bookingUrl`);
        continue;
      }

      const interval = await featureExtractor.getIntervalForTeamPlatform(
        profile.teamId,
        'booking',
        'reviews'
      );

      const result = await globalOrchestrator.addBusinessToSchedule(
        profile.id,
        profile.teamId,
        'booking',
        profile.bookingUrl,
        interval
      );

      if (result.success) {
        totalBusinessesMigrated++;
        console.log(`    ✓ Migrated: ${profile.bookingUrl} (team: ${profile.teamId}, interval: ${interval}h)`);
      } else {
        errors.push(`Booking profile ${profile.id}: ${result.message}`);
        console.error(`    ❌ Failed: ${profile.bookingUrl} - ${result.message}`);
      }
    } catch (error: any) {
      errors.push(`Booking profile ${profile.id}: ${error.message}`);
      console.error(`    ❌ Error migrating ${profile.id}:`, error.message);
    }
  }

  console.log(`\n✓ Migrated ${totalBusinessesMigrated} businesses\n`);

  // Step 3: Validate migration
  console.log('Step 3: Validating migration...');
  
  const globalSchedules = await prisma.apifyGlobalSchedule.findMany({
    include: {
      _count: {
        select: { businessMappings: true },
      },
    },
  });

  console.log(`  ✓ Created ${globalSchedules.length} global schedules`);
  
  const activeSchedules = globalSchedules.filter(s => s.isActive);
  console.log(`  ✓ ${activeSchedules.length} schedules are active`);
  
  const totalMappings = await prisma.businessScheduleMapping.count();
  console.log(`  ✓ ${totalMappings} business mappings created`);

  if (totalMappings !== totalBusinessesMigrated) {
    console.warn(`  ⚠️  Warning: Mapping count (${totalMappings}) doesn't match businesses migrated (${totalBusinessesMigrated})`);
  }

  // Step 4: Report
  console.log('\n📊 Migration Summary:');
  console.log('─'.repeat(50));
  console.log(`Total businesses migrated: ${totalBusinessesMigrated}`);
  console.log(`Global schedules created: ${globalSchedules.length}`);
  console.log(`Active schedules: ${activeSchedules.length}`);
  console.log(`Business mappings: ${totalMappings}`);
  console.log(`Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach(error => console.log(`  - ${error}`));
  }

  console.log('\n📋 Schedule Breakdown:');
  const platforms = ['google_reviews', 'facebook', 'tripadvisor', 'booking'];
  const intervals = [6, 12, 24, 72];
  
  for (const platform of platforms) {
    console.log(`\n  ${platform}:`);
    for (const interval of intervals) {
      const schedule = globalSchedules.find(
        s => s.platform === platform && s.intervalHours === interval
      );
      if (schedule) {
        console.log(`    ${interval}h: ${schedule.businessCount} businesses (${schedule.isActive ? 'active' : 'inactive'})`);
      }
    }
  }

  console.log('\n✅ Migration complete!');
  console.log('\n⚠️  IMPORTANT: Old per-team schedules still exist in Apify.');
  console.log('    Run cleanup-old-schedules.ts after verifying the migration.');
}

// Run migration
migrate()
  .then(() => {
    console.log('\n✅ Migration script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

