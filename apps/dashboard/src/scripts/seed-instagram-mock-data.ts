#!/usr/bin/env tsx

/**
 * Script to populate database with realistic Instagram mock data for the past 70 days
 * Run with: npx tsx src/scripts/seed-instagram-mock-data.ts
 */

// Set DATABASE_URL for this script
process.env.DATABASE_URL = "postgresql://postgres.yhmyzlmpvaecsocwpqnp:WkjwWwbIyKa4M6G1@aws-0-eu-central-1.pooler.supabase.com:5432/postgres";

import { prisma } from '@wirecrest/db';
import { InstagramSnapshotType } from '@prisma/client';

interface MockDataConfig {
  businessProfileId: string;
  username: string;
  startDate: Date;
  days: number;
  baseFollowers: number;
  baseFollowing: number;
  baseMedia: number;
  growthRate: number; // Daily growth rate as percentage
  engagementRate: number; // Base engagement rate as percentage
  postingFrequency: number; // Posts per day
}

class InstagramMockDataGenerator {
  private config: MockDataConfig;

  constructor(config: MockDataConfig) {
    this.config = config;
  }

  /**
   * Generate realistic mock data for Instagram snapshots
   */
  generateMockData() {
    const snapshots = [];
    const startDate = new Date(this.config.startDate);
    
    for (let i = 0; i < this.config.days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayProgress = i / this.config.days;
      const growthMultiplier = 1 + (this.config.growthRate / 100) * i;
      
      // Generate realistic follower growth with some randomness
      const followersCount = Math.floor(
        this.config.baseFollowers * growthMultiplier + 
        this.generateRandomVariation(50)
      );
      
      const followingCount = Math.floor(
        this.config.baseFollowing * (1 + (this.config.growthRate / 200) * i) + 
        this.generateRandomVariation(10)
      );
      
      const mediaCount = Math.floor(
        this.config.baseMedia + (i * this.config.postingFrequency) + 
        this.generateRandomVariation(2)
      );
      
      // Generate engagement data
      const engagementData = this.generateEngagementData(followersCount, dayProgress);
      
      // Generate content metrics
      const contentData = this.generateContentData(dayProgress);
      
      // Calculate growth metrics
      const growthData = this.calculateGrowthMetrics(snapshots, followersCount, followingCount, mediaCount);
      
      const snapshot = {
        id: `mock-snapshot-${this.config.businessProfileId}-${i}`,
        businessProfileId: this.config.businessProfileId,
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
        topHashtags: this.generateTopHashtags(),
        hasErrors: false,
        createdAt: new Date(),
        snapshotType: 'DAILY' as InstagramSnapshotType
      };
      
      snapshots.push(snapshot);
    }
    
    return snapshots;
  }

  /**
   * Generate engagement data based on followers and day progress
   */
  private generateEngagementData(followersCount: number, dayProgress: number) {
    // Engagement rate varies slightly over time
    const baseEngagementRate = this.config.engagementRate + this.generateRandomVariation(1);
    const engagementRate = Math.max(0.5, Math.min(10, baseEngagementRate));
    
    // Calculate total engagement based on followers and rate
    const totalEngagement = Math.floor((followersCount * engagementRate) / 100);
    
    // Distribute engagement across different types
    const totalLikes = Math.floor(totalEngagement * 0.7);
    const totalComments = Math.floor(totalEngagement * 0.15);
    const totalSaves = Math.floor(totalEngagement * 0.1);
    const totalShares = Math.floor(totalEngagement * 0.05);
    const totalViews = Math.floor(totalEngagement * 3); // Views are typically higher
    
    // Calculate averages
    const mediaCount = Math.floor(this.config.baseMedia + (dayProgress * this.config.days * this.config.postingFrequency));
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

  /**
   * Generate content metrics
   */
  private generateContentData(dayProgress: number) {
    // Content creation varies by day of week and season
    const dayOfWeek = new Date().getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Base posting frequency with some variation
    const basePosts = this.config.postingFrequency;
    const newPosts = Math.floor(basePosts + this.generateRandomVariation(0.5));
    
    // Stories are more frequent than posts
    const newStories = Math.floor(newPosts * 1.5 + this.generateRandomVariation(1));
    
    // Reels are less frequent but growing
    const reelsGrowth = dayProgress * 0.1; // Growing trend
    const newReels = Math.floor(newPosts * 0.3 * (1 + reelsGrowth) + this.generateRandomVariation(0.3));
    
    // Story engagement
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

  /**
   * Calculate growth metrics based on previous snapshots
   */
  private calculateGrowthMetrics(
    previousSnapshots: any[], 
    currentFollowers: number, 
    currentFollowing: number, 
    currentMedia: number
  ) {
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

  /**
   * Generate random variation for realistic data
   */
  private generateRandomVariation(maxVariation: number): number {
    return (Math.random() - 0.5) * 2 * maxVariation;
  }

  /**
   * Generate random time within the day
   */
  private generateRandomTime(): number {
    return Math.floor(Math.random() * 24 * 60 * 60 * 1000); // Random time in day
  }

  /**
   * Generate realistic top hashtags
   */
  private generateTopHashtags() {
    const hashtags = [
      '#business', '#entrepreneur', '#marketing', '#socialmedia', '#growth',
      '#success', '#motivation', '#inspiration', '#lifestyle', '#fitness',
      '#food', '#travel', '#photography', '#art', '#design', '#tech',
      '#startup', '#innovation', '#leadership', '#networking', '#branding'
    ];
    
    const selectedHashtags = hashtags
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 5) + 3);
    
    return selectedHashtags;
  }
}

async function main() {
  console.log('🚀 Starting Instagram mock data generation...');

  try {
    // Debug: Check what teams and Instagram profiles exist
    console.log('🔍 Checking existing teams and Instagram profiles...');
    
    const teams = await prisma.team.findMany({
      select: { id: true, name: true, slug: true }
    });
    console.log('📋 Available teams:', teams);
    
    const instagramProfiles = await prisma.instagramBusinessProfile.findMany({
      select: { id: true, username: true, teamId: true }
    });
    console.log('📱 Existing Instagram profiles:', instagramProfiles);
    
    // Check if we already have mock data
    const existingMockData = await prisma.instagramDailySnapshot.findFirst({
      where: { id: { startsWith: 'mock-snapshot-' } }
    });

    if (existingMockData) {
      console.log('⚠️  Mock data already exists. Deleting old mock data...');
      await prisma.instagramDailySnapshot.deleteMany({
        where: { id: { startsWith: 'mock-snapshot-' } }
      });
      console.log('✅ Old mock data deleted');
    }

    // Use the specific team ID provided
    const teamId = 'ab932ea4-a66b-48b2-ac74-5edfa544b68a';
    
    const targetTeam = teams.find(t => t.id === teamId);
    if (!targetTeam) {
      console.error(`❌ Team with ID ${teamId} not found!`);
      console.log('Available teams:', teams);
      process.exit(1);
    }
    
    const teamSlug = targetTeam.slug;
    console.log(`📋 Using team: ${targetTeam.name} (${teamId}) with slug: ${teamSlug}`);

    // Create or update Instagram business profile for this team
    console.log('📝 Creating/updating mock business profile...');
    const uniqueUsername = `mock-business-${teamSlug}`;
    const businessProfile = await prisma.instagramBusinessProfile.upsert({
      where: {
        teamId
      },
      update: {
        username: uniqueUsername,
        userId: `mock-user-${teamSlug}`,
        profileUrl: `https://instagram.com/${uniqueUsername}`,
        fullName: `Mock Business Profile - ${teamSlug}`,
        biography: 'This is a mock business profile for testing Instagram analytics',
        website: 'https://mockbusiness.com',
        isVerified: false,
        isBusinessAccount: true,
        category: 'Business',
        currentFollowersCount: 10000,
        currentFollowingCount: 500,
        currentMediaCount: 150,
        isActive: true,
        totalSnapshots: 0
      },
      create: {
        teamId,
        username: uniqueUsername,
        userId: `mock-user-${teamSlug}`,
        profileUrl: `https://instagram.com/${uniqueUsername}`,
        fullName: `Mock Business Profile - ${teamSlug}`,
        biography: 'This is a mock business profile for testing Instagram analytics',
        website: 'https://mockbusiness.com',
        isVerified: false,
        isBusinessAccount: true,
        category: 'Business',
        currentFollowersCount: 10000,
        currentFollowingCount: 500,
        currentMediaCount: 150,
        isActive: true,
        totalSnapshots: 0
      }
    });
    console.log(`✅ Mock business profile created/updated: @${businessProfile.username} for team ${teamSlug}`);

    // Generate mock data for the past 70 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 70);

    console.log(`📊 Generating mock data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    const generator = new InstagramMockDataGenerator({
      businessProfileId: businessProfile.id,
      username: businessProfile.username,
      startDate,
      days: 70,
      baseFollowers: 5000,
      baseFollowing: 300,
      baseMedia: 50,
      growthRate: 0.5, // 0.5% daily growth
      engagementRate: 3.5, // 3.5% engagement rate
      postingFrequency: 0.8 // 0.8 posts per day on average
    });

    const mockSnapshots = generator.generateMockData();

    // Insert snapshots in batches
    const batchSize = 10;
    let insertedCount = 0;

    for (let i = 0; i < mockSnapshots.length; i += batchSize) {
      const batch = mockSnapshots.slice(i, i + batchSize);
      
      await prisma.instagramDailySnapshot.createMany({
        data: batch,
        skipDuplicates: true
      });
      
      insertedCount += batch.length;
      console.log(`📈 Inserted ${insertedCount}/${mockSnapshots.length} snapshots`);
    }

    // Update business profile with final counts
    const finalSnapshot = mockSnapshots[mockSnapshots.length - 1];
    await prisma.instagramBusinessProfile.update({
      where: { id: businessProfile.id },
      data: {
        currentFollowersCount: finalSnapshot.followersCount,
        currentFollowingCount: finalSnapshot.followingCount,
        currentMediaCount: finalSnapshot.mediaCount,
        totalSnapshots: mockSnapshots.length,
        lastSnapshotAt: finalSnapshot.snapshotDate,
        firstSnapshotAt: mockSnapshots[0].snapshotDate
      }
    });

    console.log('\n🎉 Mock data generation complete!');
    console.log(`📊 Generated ${mockSnapshots.length} snapshots`);
    console.log(`👥 Final followers: ${finalSnapshot.followersCount.toLocaleString()}`);
    console.log(`📱 Final posts: ${finalSnapshot.mediaCount}`);
    console.log(`📈 Average daily growth: ${(finalSnapshot.followersCount - mockSnapshots[0].followersCount) / 70} followers/day`);
    console.log(`💬 Average engagement rate: ${(mockSnapshots.reduce((sum, s) => sum + s.engagementRate, 0) / mockSnapshots.length).toFixed(2)}%`);

    console.log('\n🔗 You can now test the analytics with this mock data!');
    console.log(`   Business Profile ID: ${businessProfile.id}`);
    console.log(`   Username: @${businessProfile.username}`);
    console.log(`   Team Slug: ${teamSlug}`);
    console.log(`   URL: http://wirecrest.local:3032/dashboard/teams/${teamSlug}/instagram/`);

  } catch (error) {
    console.error('❌ Error generating mock data:', error);
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
