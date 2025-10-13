#!/usr/bin/env tsx

/**
 * Script to process existing Instagram data and populate calculated fields
 * Run with: npx tsx src/scripts/process-instagram-data.ts
 */

import { prisma } from '@wirecrest/db';

import { InstagramDataProcessor } from '../services/processors/instagram-data-processor';

async function main() {
  console.log('🚀 Starting Instagram data processing...');

  try {
    // Get all business profiles
    const businessProfiles = await prisma.instagramBusinessProfile.findMany({
      where: { isActive: true },
      select: { id: true, username: true }
    });

    console.log(`📊 Found ${businessProfiles.length} active business profiles`);

    let totalProcessed = 0;

    for (const profile of businessProfiles) {
      console.log(`\n🔄 Processing profile: @${profile.username} (${profile.id})`);
      
      const processedCount = await InstagramDataProcessor.processBusinessProfileSnapshots(profile.id);
      totalProcessed += processedCount;
      
      console.log(`✅ Processed ${processedCount} snapshots for @${profile.username}`);
    }

    console.log(`\n🎉 Processing complete!`);
    console.log(`📈 Total snapshots processed: ${totalProcessed}`);

  } catch (error) {
    console.error('❌ Error processing Instagram data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
