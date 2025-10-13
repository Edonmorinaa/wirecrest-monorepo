#!/usr/bin/env tsx

/**
 * Script to populate database with multiple Instagram business profiles with different characteristics
 * Run with: npx tsx src/scripts/seed-multiple-instagram-profiles.ts
 */

import { resolve } from 'path';
// Load environment variables from .env files
import { existsSync, readFileSync } from 'fs';

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
import { InstagramSnapshotType } from '@prisma/client';

interface BusinessProfileConfig {
  username: string;
  fullName: string;
  category: string;
  baseFollowers: number;
  baseFollowing: number;
  baseMedia: number;
  growthRate: number;
  engagementRate: number;
  postingFrequency: number;
  description: string;
}

class MultipleInstagramMockDataGenerator {
  private profiles: BusinessProfileConfig[] = [
    {
      username: 'tech-startup-mock',
      fullName: 'Tech Startup Mock',
      category: 'Technology',
      baseFollowers: 15000,
      baseFollowing: 800,
      baseMedia: 200,
      growthRate: 0.8, // 0.8% daily growth
      engagementRate: 4.2, // 4.2% engagement rate
      postingFrequency: 1.2, // 1.2 posts per day
      description: 'A fast-growing tech startup with high engagement'
    },
    {
      username: 'fashion-brand-mock',
      fullName: 'Fashion Brand Mock',
      category: 'Fashion',
      baseFollowers: 25000,
      baseFollowing: 1200,
      baseMedia: 400,
      growthRate: 0.3, // 0.3% daily growth (slower but steady)
      engagementRate: 5.8, // 5.8% engagement rate (high for fashion)
      postingFrequency: 2.1, // 2.1 posts per day (frequent posting)
      description: 'A fashion brand with high engagement and frequent posting'
    },
    {
      username: 'restaurant-mock',
      fullName: 'Restaurant Mock',
      category: 'Food & Drink',
      baseFollowers: 8000,
      baseFollowing: 500,
      baseMedia: 150,
      growthRate: 0.6, // 0.6% daily growth
      engagementRate: 6.5, // 6.5% engagement rate (very high for food)
      postingFrequency: 1.8, // 1.8 posts per day
      description: 'A local restaurant with very high engagement'
    },
    {
      username: 'fitness-coach-mock',
      fullName: 'Fitness Coach Mock',
      category: 'Health & Fitness',
      baseFollowers: 12000,
      baseFollowing: 600,
      baseMedia: 300,
      growthRate: 1.2, // 1.2% daily growth (fastest growing)
      engagementRate: 7.2, // 7.2% engagement rate (highest)
      postingFrequency: 1.5, // 1.5 posts per day
      description: 'A fitness coach with the highest engagement and growth'
    },
    {
      username: 'travel-blogger-mock',
      fullName: 'Travel Blogger Mock',
      category: 'Travel',
      baseFollowers: 18000,
      baseFollowing: 1000,
      baseMedia: 250,
      growthRate: 0.4, // 0.4% daily growth
      engagementRate: 3.8, // 3.8% engagement rate
      postingFrequency: 0.9, // 0.9 posts per day (less frequent)
      description: 'A travel blogger with moderate growth and engagement'
    }
  ];

  async generateAllProfiles() {
    console.log('🚀 Starting multiple Instagram profiles mock data generation...');

    try {
      // Check if we already have mock data
      const existingMockData = await prisma.instagramDailySnapshot.findFirst({
        where: { id: { startsWith: 'mock-snapshot-' } }
      });

      if (existingMockData) {
        console.log('⚠️  Mock data already exists. Deleting old mock data...');
        await prisma.instagramDailySnapshot.deleteMany({
          where: { id: { startsWith: 'mock-snapshot-' } }
        });
        await prisma.instagramBusinessProfile.deleteMany({
          where: { username: { contains: 'mock' } }
        });
        console.log('✅ Old mock data deleted');
      }

      // Get or create a team for mock data
      let team = await prisma.team.findFirst({
        where: { name: 'Mock Data Team' }
      });

      if (!team) {
        console.log('📝 Creating mock team...');
        team = await prisma.team.create({
          data: {
            name: 'Mock Data Team',
            slug: 'mock-data-team',
            defaultRole: 'MEMBER'
          }
        });
        console.log('✅ Mock team created');
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 70);

      console.log(`📊 Generating mock data for ${this.profiles.length} profiles from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

      let totalSnapshots = 0;
      const createdProfiles = [];

      for (const profileConfig of this.profiles) {
        console.log(`\n🔄 Creating profile: @${profileConfig.username}`);
        
        // Create business profile
        const businessProfile = await prisma.instagramBusinessProfile.create({
          data: {
            teamId: team.id,
            username: profileConfig.username,
            userId: `mock-user-${profileConfig.username}`,
            profileUrl: `https://instagram.com/${profileConfig.username}`,
            fullName: profileConfig.fullName,
            biography: profileConfig.description,
            website: `https://${profileConfig.username}.com`,
            isVerified: Math.random() > 0.5, // Random verification
            isBusinessAccount: true,
            category: profileConfig.category,
            currentFollowersCount: profileConfig.baseFollowers,
            currentFollowingCount: profileConfig.baseFollowing,
            currentMediaCount: profileConfig.baseMedia,
            isActive: true,
            totalSnapshots: 0
          }
        });

        // Generate snapshots for this profile
        const snapshots = this.generateSnapshotsForProfile(businessProfile.id, profileConfig, startDate, 70);
        
        // Insert snapshots in batches
        const batchSize = 10;
        for (let i = 0; i < snapshots.length; i += batchSize) {
          const batch = snapshots.slice(i, i + batchSize);
          await prisma.instagramDailySnapshot.createMany({
            data: batch,
            skipDuplicates: true
          });
        }

        // Update business profile with final counts
        const finalSnapshot = snapshots[snapshots.length - 1];
        await prisma.instagramBusinessProfile.update({
          where: { id: businessProfile.id },
          data: {
            currentFollowersCount: finalSnapshot.followersCount,
            currentFollowingCount: finalSnapshot.followingCount,
            currentMediaCount: finalSnapshot.mediaCount,
            totalSnapshots: snapshots.length,
            lastSnapshotAt: finalSnapshot.snapshotDate,
            firstSnapshotAt: snapshots[0].snapshotDate
          }
        });

        totalSnapshots += snapshots.length;
        createdProfiles.push({
          ...businessProfile,
          finalFollowers: finalSnapshot.followersCount,
          finalPosts: finalSnapshot.mediaCount,
          avgEngagement: snapshots.reduce((sum, s) => sum + s.engagementRate, 0) / snapshots.length
        });

        console.log(`✅ Created @${profileConfig.username}: ${finalSnapshot.followersCount.toLocaleString()} followers, ${finalSnapshot.mediaCount} posts`);
      }

      console.log('\n🎉 Multiple profiles mock data generation complete!');
      console.log(`📊 Generated ${totalSnapshots} total snapshots across ${createdProfiles.length} profiles`);
      
      console.log('\n📈 Profile Summary:');
      createdProfiles.forEach(profile => {
        console.log(`   @${profile.username}: ${profile.finalFollowers.toLocaleString()} followers, ${profile.finalPosts} posts, ${profile.avgEngagement.toFixed(2)}% avg engagement`);
      });

      console.log('\n🔗 You can now test the analytics with these mock profiles!');
      console.log(`   Team ID: ${team.id}`);
      console.log(`   Team Slug: ${team.slug}`);

    } catch (error) {
      console.error('❌ Error generating mock data:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  }

  private generateSnapshotsForProfile(
    businessProfileId: string, 
    config: BusinessProfileConfig, 
    startDate: Date, 
    days: number
  ) {
    const snapshots = [];
    
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayProgress = i / days;
      const growthMultiplier = 1 + (config.growthRate / 100) * i;
      
      // Generate realistic follower growth with some randomness
      const followersCount = Math.floor(
        config.baseFollowers * growthMultiplier + 
        this.generateRandomVariation(100)
      );
      
      const followingCount = Math.floor(
        config.baseFollowing * (1 + (config.growthRate / 200) * i) + 
        this.generateRandomVariation(20)
      );
      
      const mediaCount = Math.floor(
        config.baseMedia + (i * config.postingFrequency) + 
        this.generateRandomVariation(3)
      );
      
      // Generate engagement data
      const engagementData = this.generateEngagementData(followersCount, config.engagementRate, dayProgress);
      
      // Generate content metrics
      const contentData = this.generateContentData(config.postingFrequency, dayProgress);
      
      // Calculate growth metrics
      const growthData = this.calculateGrowthMetrics(snapshots, followersCount, followingCount, mediaCount);
      
      const snapshot = {
        id: `mock-snapshot-${businessProfileId}-${i}`,
        businessProfileId,
        snapshotDate: currentDate,
        snapshotTime: new Date(currentDate.getTime() + this.generateRandomTime()),
        
        // Core metrics
        followersCount,
        followingCount,
        mediaCount,
        
        // Engagement metrics
        totalLikes: engagementData.totalLikes,
        totalComments: engagementData.totalComments,
        totalViews: engagementData.totalViews,
        totalSaves: engagementData.totalSaves,
        totalShares: engagementData.totalShares,
        
        // Content metrics
        newPosts: contentData.newPosts,
        newStories: contentData.newStories,
        newReels: contentData.newReels,
        storyViews: contentData.storyViews,
        storyReplies: contentData.storyReplies,
        
        // Calculated metrics
        engagementRate: engagementData.engagementRate,
        avgLikesPerPost: engagementData.avgLikesPerPost,
        avgCommentsPerPost: engagementData.avgCommentsPerPost,
        commentsRatio: engagementData.commentsRatio,
        followersRatio: followersCount / followingCount,
        
        // Growth metrics
        followersGrowth: growthData.followersGrowth,
        followingGrowth: growthData.followingGrowth,
        mediaGrowth: growthData.mediaGrowth,
        weeklyFollowersGrowth: growthData.weeklyFollowersGrowth,
        monthlyFollowersGrowth: growthData.monthlyFollowersGrowth,
        
        // Additional data
        topHashtags: this.generateTopHashtags(config.category),
        hasErrors: false,
        createdAt: new Date(),
        snapshotType: 'DAILY' as InstagramSnapshotType
      };
      
      snapshots.push(snapshot);
    }
    
    return snapshots;
  }

  private generateEngagementData(followersCount: number, baseEngagementRate: number, dayProgress: number) {
    // Engagement rate varies slightly over time
    const engagementRate = Math.max(0.5, Math.min(15, baseEngagementRate + this.generateRandomVariation(1)));
    
    // Calculate total engagement based on followers and rate
    const totalEngagement = Math.floor((followersCount * engagementRate) / 100);
    
    // Distribute engagement across different types
    const totalLikes = Math.floor(totalEngagement * 0.7);
    const totalComments = Math.floor(totalEngagement * 0.15);
    const totalSaves = Math.floor(totalEngagement * 0.1);
    const totalShares = Math.floor(totalEngagement * 0.05);
    const totalViews = Math.floor(totalEngagement * 3);
    
    // Calculate averages
    const mediaCount = Math.floor(50 + (dayProgress * 70 * 1.5)); // Approximate media count
    const avgLikesPerPost = mediaCount > 0 ? totalLikes / mediaCount : 0;
    const avgCommentsPerPost = mediaCount > 0 ? totalComments / mediaCount : 0;
    const commentsRatio = totalLikes > 0 ? (totalComments / totalLikes) * 100 : 0;
    
    return {
      totalLikes,
      totalComments,
      totalViews,
      totalSaves,
      totalShares,
      engagementRate,
      avgLikesPerPost,
      avgCommentsPerPost,
      commentsRatio
    };
  }

  private generateContentData(postingFrequency: number, dayProgress: number) {
    const basePosts = postingFrequency;
    const newPosts = Math.floor(basePosts + this.generateRandomVariation(0.5));
    const newStories = Math.floor(newPosts * 1.5 + this.generateRandomVariation(1));
    const reelsGrowth = dayProgress * 0.1;
    const newReels = Math.floor(newPosts * 0.3 * (1 + reelsGrowth) + this.generateRandomVariation(0.3));
    const storyViews = Math.floor(newStories * 200 + this.generateRandomVariation(50));
    const storyReplies = Math.floor(newStories * 5 + this.generateRandomVariation(2));
    
    return {
      newPosts: Math.max(0, newPosts),
      newStories: Math.max(0, newStories),
      newReels: Math.max(0, newReels),
      storyViews: Math.max(0, storyViews),
      storyReplies: Math.max(0, storyReplies)
    };
  }

  private calculateGrowthMetrics(previousSnapshots: any[], currentFollowers: number, currentFollowing: number, currentMedia: number) {
    const previousDay = previousSnapshots[previousSnapshots.length - 1];
    const previousWeek = previousSnapshots[Math.max(0, previousSnapshots.length - 7)];
    const previousMonth = previousSnapshots[Math.max(0, previousSnapshots.length - 30)];
    
    return {
      followersGrowth: previousDay ? currentFollowers - previousDay.followersCount : 0,
      followingGrowth: previousDay ? currentFollowing - previousDay.followingCount : 0,
      mediaGrowth: previousDay ? currentMedia - previousDay.mediaCount : 0,
      weeklyFollowersGrowth: previousWeek ? currentFollowers - previousWeek.followersCount : 0,
      monthlyFollowersGrowth: previousMonth ? currentFollowers - previousMonth.followersCount : 0
    };
  }

  private generateRandomVariation(maxVariation: number): number {
    return (Math.random() - 0.5) * 2 * maxVariation;
  }

  private generateRandomTime(): number {
    return Math.floor(Math.random() * 24 * 60 * 60 * 1000);
  }

  private generateTopHashtags(category: string): string[] {
    const categoryHashtags: { [key: string]: string[] } = {
      'Technology': ['#tech', '#startup', '#innovation', '#ai', '#software', '#coding', '#digital'],
      'Fashion': ['#fashion', '#style', '#ootd', '#trending', '#beauty', '#lifestyle', '#design'],
      'Food & Drink': ['#food', '#restaurant', '#cooking', '#delicious', '#foodie', '#chef', '#recipe'],
      'Health & Fitness': ['#fitness', '#workout', '#health', '#motivation', '#gym', '#wellness', '#training'],
      'Travel': ['#travel', '#wanderlust', '#adventure', '#explore', '#vacation', '#tourism', '#journey']
    };
    
    const baseHashtags = categoryHashtags[category] || ['#business', '#lifestyle', '#motivation'];
    const generalHashtags = ['#instagood', '#photooftheday', '#follow', '#like4like', '#instadaily'];
    
    const allHashtags = [...baseHashtags, ...generalHashtags];
    return allHashtags
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 5) + 3);
  }
}

async function main() {
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    console.log('\n📝 To fix this, you need to:');
    console.log('1. Create a .env file in the project root with:');
    console.log('   DATABASE_URL="postgresql://username:password@localhost:5432/database_name"');
    console.log('\n2. Or set the environment variable:');
    console.log('   export DATABASE_URL="postgresql://username:password@localhost:5432/database_name"');
    console.log('\n3. Or run the script with the environment variable:');
    console.log('   DATABASE_URL="your_connection_string" npm run seed:instagram-multiple');
    process.exit(1);
  }

  const generator = new MultipleInstagramMockDataGenerator();
  await generator.generateAllProfiles();
}

// Run the script
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
