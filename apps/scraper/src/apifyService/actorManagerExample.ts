/**
 * Example demonstrating the Enhanced ActorManager with Memory-Aware Priority Queuing
 * 
 * This example shows:
 * 1. How jobs from polling get priority
 * 2. How jobs are immediately emitted when memory becomes available
 * 3. How to monitor memory usage and queue status
 */

import { ActorManager } from './actorManager';
import { GoogleBusinessReviewsActorJob, GoogleBusinessReviewsActor } from './actors/googleBusinessReviewsActor';
import { MarketPlatform } from '@prisma/client';
import { ActorJob } from './actors/actor';

async function demonstrateActorManager() {
  console.log('🎬 Starting Actor Manager Demonstration');

  // Initialize the actor manager with 32GB memory limit
  const actorManager = new ActorManager({ memoryLimitMB: 32 * 1024 });

  // Set up event listeners
  actorManager.on('start', (eventData: any) => {
    console.log(`✅ Job ${eventData.jobId} started. Memory allocated: ${eventData.memoryAllocated}MB, Current usage: ${eventData.currentMemoryUsage}MB (${eventData.memoryUtilization.toFixed(1)}%)`);
  });

  actorManager.on('completed', (eventData: any) => {
    console.log(`🎉 Job ${eventData.jobId} completed. Memory freed: ${eventData.memoryFreed}MB, Current usage: ${eventData.currentMemoryUsage}MB (${eventData.memoryUtilization.toFixed(1)}%)`);
  });

  actorManager.on('queued', (eventData: any) => {
    console.log(`⏳ Job ${eventData.jobId} queued (${eventData.source}) due to memory constraints. Required: ${eventData.memoryRequired}MB, Available: ${eventData.memoryAvailable}MB`);
  });

  actorManager.on('dequeued', (eventData: any) => {
    console.log(`🚀 Job ${eventData.jobId} dequeued from ${eventData.source} after ${eventData.waitTimeMs}ms wait`);
  });

  actorManager.on('error', (eventData: any) => {
    console.error(`❌ Job ${eventData.jobId} error:`, eventData.error);
  });

  console.log('\n📋 Creating 5 Google Business Review jobs...');

  // Create 5 jobs that will demonstrate memory management
  const jobs = [
    new GoogleBusinessReviewsActorJob({
      platform: MarketPlatform.GOOGLE_MAPS,
      teamId: 'team1',
      placeId: 'place1',
      isInitialization: false
    }, process.env.APIFY_TOKEN!),
    new GoogleBusinessReviewsActorJob({
      platform: MarketPlatform.GOOGLE_MAPS,
      teamId: 'team2',
      placeId: 'place2',
      isInitialization: false
    }, process.env.APIFY_TOKEN!),
    new GoogleBusinessReviewsActorJob({
      platform: MarketPlatform.GOOGLE_MAPS,
      teamId: 'team3',
      placeId: 'place3',
      isInitialization: false
    }, process.env.APIFY_TOKEN!),
    new GoogleBusinessReviewsActorJob({
      platform: MarketPlatform.GOOGLE_MAPS,
      teamId: 'team4',
      placeId: 'place4',
      isInitialization: false
    }, process.env.APIFY_TOKEN!),
    new GoogleBusinessReviewsActorJob({
      platform: MarketPlatform.GOOGLE_MAPS,
      teamId: 'team5',
      placeId: 'place5',
      isInitialization: false
    }, process.env.APIFY_TOKEN!)
  ];

  // Create proper ActorJob wrappers for scheduling
  const actorJobs = jobs.map((job, index) => {
    const actor = new GoogleBusinessReviewsActor();
    const jobData = {
      platform: MarketPlatform.GOOGLE_MAPS,
      teamId: `team${index + 1}`,
      placeID: `place${index + 1}`,
      isInitialization: false
    };
    
    return new ActorJob(
      `google-demo-${index + 1}-${Date.now()}`,
      actor,
      jobData,
      async () => {
        await job.run();
        return true;
      }
    );
  });

  console.log('\n🚀 Scheduling jobs with different priorities...');

  // Schedule first two jobs manually (high priority)
  await actorManager.schedule(actorJobs[0], 'manual');
  await actorManager.schedule(actorJobs[1], 'manual');

  // Wait a bit to see the first jobs start
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Schedule remaining jobs as polling (lower priority)
  await actorManager.schedule(actorJobs[2], 'poll');
  await actorManager.schedule(actorJobs[3], 'poll');
  await actorManager.schedule(actorJobs[4], 'poll');

  console.log('\n📊 Current Actor Manager Status:');
  console.log(actorManager.getMemoryStats());

  console.log('\n⏱️  Waiting for jobs to complete...');
  
  // Wait for all jobs to complete (this is just for demonstration)
  await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds

  console.log('\n📊 Final Actor Manager Status:');
  console.log(actorManager.getMemoryStats());

  console.log('\n🎬 Actor Manager Demonstration Complete!');
}

// Run the demonstration
demonstrateActorManager().catch(console.error);

export { demonstrateActorManager }; 