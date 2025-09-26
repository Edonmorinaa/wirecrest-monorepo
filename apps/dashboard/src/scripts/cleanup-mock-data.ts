#!/usr/bin/env tsx

/**
 * Script to clean up mock Instagram data
 * Run with: npx tsx src/scripts/cleanup-mock-data.ts
 */

// Load environment variables from .env files
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Simple .env file loader
function loadEnvFile(filePath: string) {
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').replace(/^["']|["']$/g, '');
            process.env[key] = value;
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }
}

// Try to load .env files from different locations
loadEnvFile(resolve(process.cwd(), '.env'));
loadEnvFile(resolve(process.cwd(), '.env.local'));
loadEnvFile(resolve(process.cwd(), '../../.env'));
loadEnvFile(resolve(process.cwd(), '../../.env.local'));

import { prisma } from '@wirecrest/db';

async function main() {
  console.log('🧹 Starting mock data cleanup...');

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    console.log('\n📝 To fix this, you need to:');
    console.log('1. Create a .env file in the project root with:');
    console.log('   DATABASE_URL="postgresql://username:password@localhost:5432/database_name"');
    console.log('\n2. Or set the environment variable:');
    console.log('   export DATABASE_URL="postgresql://username:password@localhost:5432/database_name"');
    console.log('\n3. Or run the script with the environment variable:');
    console.log('   DATABASE_URL="your_connection_string" npm run cleanup:mock-data');
    process.exit(1);
  }

  try {
    // Delete all mock snapshots
    const deletedSnapshots = await prisma.instagramDailySnapshot.deleteMany({
      where: { id: { startsWith: 'mock-snapshot-' } }
    });

    console.log(`🗑️  Deleted ${deletedSnapshots.count} mock snapshots`);

    // Delete all mock business profiles
    const deletedProfiles = await prisma.instagramBusinessProfile.deleteMany({
      where: { username: { contains: 'mock' } }
    });

    console.log(`🗑️  Deleted ${deletedProfiles.count} mock business profiles`);

    // Delete mock team if it exists
    const deletedTeam = await prisma.team.deleteMany({
      where: { name: 'Mock Data Team' }
    });

    if (deletedTeam.count > 0) {
      console.log(`🗑️  Deleted mock team`);
    }

    console.log('\n✅ Mock data cleanup complete!');
    console.log(`📊 Total items deleted: ${deletedSnapshots.count + deletedProfiles.count + deletedTeam.count}`);

  } catch (error) {
    console.error('❌ Error cleaning up mock data:', error);
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
