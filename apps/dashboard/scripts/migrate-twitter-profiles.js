#!/usr/bin/env node

/**
 * Migration script to move Twitter profiles from JSON file to Supabase database
 *
 * This script will:
 * 1. Read existing data from twitter-profiles.json
 * 2. Create database tables if they don't exist
 * 3. Migrate profiles and tweets to the database
 * 4. Create a backup of the original JSON file
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const PROFILES_FILE = path.join(process.cwd(), 'twitter-profiles.json');
const BACKUP_FILE = path.join(process.cwd(), 'twitter-profiles-backup.json');

async function migrateTwitterProfiles() {
  try {
    console.log('🚀 Starting Twitter profiles migration...');

    // Check if JSON file exists
    if (!fs.existsSync(PROFILES_FILE)) {
      console.log('📄 No twitter-profiles.json file found. Nothing to migrate.');
      return;
    }

    // Create backup of original file
    console.log('💾 Creating backup of original JSON file...');
    fs.copyFileSync(PROFILES_FILE, BACKUP_FILE);
    console.log(`✅ Backup created: ${BACKUP_FILE}`);

    // Read existing data
    console.log('📖 Reading existing profiles data...');
    const data = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8'));

    if (!data.profiles || data.profiles.length === 0) {
      console.log('📭 No profiles found in JSON file. Nothing to migrate.');
      return;
    }

    console.log(`📊 Found ${data.profiles.length} profiles to migrate`);

    // Get all teams to map profiles to
    const teams = await prisma.team.findMany({
      select: { id: true, name: true, slug: true },
    });

    if (teams.length === 0) {
      console.log('⚠️  No teams found in database. Cannot migrate profiles without teams.');
      return;
    }

    // For this migration, we'll assign all profiles to the first team
    // In a real scenario, you might want to map profiles to specific teams
    const defaultTeamId = teams[0].id;
    console.log(`👥 Assigning all profiles to team: ${teams[0].name} (${teams[0].slug})`);

    let migratedCount = 0;
    let errorCount = 0;

    // Migrate each profile
    for (const profile of data.profiles) {
      try {
        console.log(`🔄 Migrating profile: @${profile.username}`);

        // Check if profile already exists
        const existingProfile = await prisma.twitterProfile.findFirst({
          where: {
            teamId: defaultTeamId,
            username: profile.username,
          },
        });

        if (existingProfile) {
          console.log(`⚠️  Profile @${profile.username} already exists, skipping...`);
          continue;
        }

        // Create profile in database
        const newProfile = await prisma.twitterProfile.create({
          data: {
            teamId: defaultTeamId,
            username: profile.username,
            displayName: profile.displayName,
            bio: profile.bio || null,
            profileUrl: profile.profileUrl,
            verified: profile.verified || false,
            followersCount: profile.followersCount || 0,
            followingCount: profile.followingCount || 0,
            tweetsCount: profile.tweetsCount || 0,
            profileImageUrl: profile.profileImageUrl || null,
            customBio: profile.customBio || null,
            lastSyncAt: profile.lastUpdated ? new Date(profile.lastUpdated) : null,
            createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(),
            updatedAt: profile.lastUpdated ? new Date(profile.lastUpdated) : new Date(),
          },
        });

        // Migrate tweets if they exist
        const profileTweets = data.tweets[profile.id] || [];
        if (profileTweets.length > 0) {
          console.log(`📝 Migrating ${profileTweets.length} tweets for @${profile.username}`);

          await prisma.twitterTweet.createMany({
            data: profileTweets.map((tweet) => ({
              profileId: newProfile.id,
              tweetId: tweet.id,
              text: tweet.text,
              url: tweet.url,
              likes: tweet.likes || 0,
              retweets: tweet.retweets || 0,
              replies: tweet.replies || 0,
              hasMedia: tweet.hasMedia || false,
              mediaUrls: tweet.mediaUrls || [],
              tweetCreatedAt: new Date(tweet.createdAt),
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          });
        }

        migratedCount++;
        console.log(`✅ Successfully migrated @${profile.username}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error migrating @${profile.username}:`, error.message);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migratedCount} profiles`);
    console.log(`❌ Errors: ${errorCount} profiles`);
    console.log(`💾 Backup file: ${BACKUP_FILE}`);

    if (migratedCount > 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('📝 You can now safely delete the original twitter-profiles.json file');
      console.log('🔄 All API endpoints will now use the database instead of JSON file');
    }
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateTwitterProfiles();
}

module.exports = { migrateTwitterProfiles };
