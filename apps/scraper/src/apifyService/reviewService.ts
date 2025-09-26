import { DatabaseService } from '../supabase/database';
import { ActorManager } from './actorManager';
import { ReviewPollingService } from './reviewPollingService';
import dotenv from 'dotenv';

dotenv.config();

export class ReviewService {
    private database: DatabaseService;
    private actorManager: ActorManager;
    private pollingService: ReviewPollingService;

    constructor() {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is required');
        }

        this.database = new DatabaseService();
        this.actorManager = new ActorManager({ memoryLimitMB: 32 * 1024 }); // 32GB
        this.pollingService = new ReviewPollingService(
            this.actorManager,
            process.env.DATABASE_URL!,
            5 * 60 * 1000, // 5 minutes
            30 // 30 businesses per batch
        );

        // Set up event listeners
        this.actorManager.on('start', (eventData: any) => {
            console.log(`Job ${eventData.jobId} started. Memory allocated: ${eventData.memoryAllocated}MB, Current usage: ${eventData.currentMemoryUsage}MB (${eventData.memoryUtilization.toFixed(1)}%)`);
        });

        this.actorManager.on('completed', (eventData: any) => {
            console.log(`Job ${eventData.jobId} completed. Memory freed: ${eventData.memoryFreed}MB, Current usage: ${eventData.currentMemoryUsage}MB (${eventData.memoryUtilization.toFixed(1)}%)`);
        });

        this.actorManager.on('queued', (eventData: any) => {
            console.log(`Job ${eventData.jobId} queued (${eventData.source}) due to memory constraints. Required: ${eventData.memoryRequired}MB, Available: ${eventData.memoryAvailable}MB`);
        });

        this.actorManager.on('dequeued', (eventData: any) => {
            console.log(`Job ${eventData.jobId} dequeued from ${eventData.source} after ${eventData.waitTimeMs}ms wait`);
        });

        this.actorManager.on('error', (eventData: any) => {
            console.error(`Job ${eventData.jobId} error:`, eventData.error);
        });
    }

    public async start(): Promise<void> {
        console.log('Starting Review Service...');
        this.pollingService.start();
    }

    public async stop(): Promise<void> {
        console.log('Stopping Review Service...');
        this.pollingService.stop();
        await this.database.close();
    }
} 