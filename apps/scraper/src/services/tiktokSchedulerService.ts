import { PrismaClient } from "@prisma/client";
import { TikTokDataService } from "./tiktokDataService.js";
import type { TikTokSnapshotSchedule } from "../types/tiktok.js";

export class TikTokSchedulerService {
  private prisma: PrismaClient;
  private tiktokService: TikTokDataService;
  private schedulerInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastSnapshotTimes: Map<string, Date> = new Map(); // Track last snapshot time per business

  constructor(tiktokService: TikTokDataService, prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
    this.tiktokService = tiktokService;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("TikTok scheduler is already running");
      return;
    }

    console.log("Starting TikTok scheduler...");
    this.isRunning = true;

    // Check for scheduled snapshots every 5 minutes
    this.schedulerInterval = setInterval(
      async () => {
        await this.checkAndExecuteScheduledSnapshots();
      },
      5 * 60 * 1000,
    );

    // Initial check
    await this.checkAndExecuteScheduledSnapshots();
  }

  stop(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    this.isRunning = false;
    console.log("TikTok scheduler stopped");
  }

  private async checkAndExecuteScheduledSnapshots(): Promise<void> {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().split(" ")[0];
      const currentDate = now.toISOString().split("T")[0];

      // Get all enabled schedules
      const schedules = await this.prisma.tikTokSnapshotSchedule.findMany({
        where: {
          isEnabled: true,
        },
        include: {
          businessProfile: true,
        },
      });

      for (const schedule of schedules) {
        await this.processSchedule(schedule, currentTime, currentDate, now);
      }
    } catch (error) {
      console.error("Error in checkAndExecuteScheduledSnapshots:", error);
    }
  }

  private async processSchedule(
    schedule: TikTokSnapshotSchedule & { businessProfile: any },
    currentTime: string,
    currentDate: string,
    now: Date,
  ): Promise<void> {
    try {
      const { businessProfileId, snapshotTime, timezone } = schedule;

      // Check if it's time for a snapshot
      if (currentTime < snapshotTime) {
        return; // Not time yet
      }

      // Check if we already took a snapshot today
      const lastSnapshotTime = this.lastSnapshotTimes.get(businessProfileId);
      if (lastSnapshotTime) {
        const lastSnapshotDate = lastSnapshotTime.toISOString().split("T")[0];
        if (lastSnapshotDate === currentDate) {
          return; // Already took a snapshot today
        }
      }

      // Check database for today's snapshot
      const existingSnapshot = await this.prisma.tikTokDailySnapshot.findFirst({
        where: {
          businessProfileId,
          snapshotDate: new Date(currentDate),
          snapshotType: "DAILY",
        },
      });

      if (existingSnapshot) {
        this.lastSnapshotTimes.set(
          businessProfileId,
          new Date(existingSnapshot.createdAt),
        );
        return; // Snapshot already exists for today
      }

      // Enforce minimum 6-hour gap between snapshots
      const lastSnapshot = await this.prisma.tikTokDailySnapshot.findFirst({
        where: {
          businessProfileId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          createdAt: true,
        },
      });

      if (lastSnapshot) {
        const timeSinceLastSnapshot =
          now.getTime() - new Date(lastSnapshot.createdAt).getTime();
        const sixHoursInMs = 6 * 60 * 60 * 1000;

        if (timeSinceLastSnapshot < sixHoursInMs) {
          console.log(
            `Skipping TikTok snapshot for ${businessProfileId} - too soon since last snapshot`,
          );
          return;
        }
      }

      // Check daily limit (max 2 snapshots per day)
      const todaySnapshotsCount = await this.prisma.tikTokDailySnapshot.count({
        where: {
          businessProfileId,
          snapshotDate: new Date(currentDate),
        },
      });

      if (todaySnapshotsCount >= 2) {
        console.log(
          `Skipping TikTok snapshot for ${businessProfileId} - daily limit reached`,
        );
        return;
      }

      console.log(
        `Taking TikTok snapshot for business profile: ${businessProfileId}`,
      );

      // Take snapshot
      const result = await this.tiktokService.takeDailySnapshot(
        businessProfileId,
        {
          snapshotType: "DAILY",
        },
      );

      if (result.success) {
        this.lastSnapshotTimes.set(businessProfileId, now);

        // Update schedule with last snapshot time
        await this.prisma.tikTokSnapshotSchedule.update({
          where: {
            businessProfileId,
          },
          data: {
            lastSnapshotAt: now,
            nextSnapshotAt: this.calculateNextSnapshotTime(
              snapshotTime,
              timezone,
            ),
          },
        });

        console.log(`TikTok snapshot completed for ${businessProfileId}`);
      } else {
        console.error(
          `TikTok snapshot failed for ${businessProfileId}:`,
          result.error,
        );
      }
    } catch (error) {
      console.error("Error processing TikTok schedule:", error);
    }
  }

  private calculateNextSnapshotTime(
    snapshotTime: string,
    timezone: string,
  ): Date {
    const now = new Date();
    const [hours, minutes, seconds] = snapshotTime.split(":").map(Number);

    const nextSnapshot = new Date(now);
    nextSnapshot.setHours(hours, minutes, seconds, 0);

    // If the time has passed today, schedule for tomorrow
    if (nextSnapshot <= now) {
      nextSnapshot.setDate(nextSnapshot.getDate() + 1);
    }

    return nextSnapshot;
  }

  async triggerAllSnapshots(): Promise<{
    success: boolean;
    processed: number;
    errors: number;
  }> {
    try {
      const schedules = await this.prisma.tikTokSnapshotSchedule.findMany({
        where: {
          isEnabled: true,
        },
        select: {
          businessProfileId: true,
        },
      });

      let processed = 0;
      let errors = 0;

      for (const schedule of schedules) {
        try {
          const result = await this.tiktokService.takeDailySnapshot(
            schedule.businessProfileId,
            {
              snapshotType: "DAILY",
            },
          );

          if (result.success) {
            processed++;
            console.log(
              `Manual TikTok snapshot completed for ${schedule.businessProfileId}`,
            );
          } else {
            errors++;
            console.error(
              `Manual TikTok snapshot failed for ${schedule.businessProfileId}:`,
              result.error,
            );
          }
        } catch (error) {
          errors++;
          console.error(
            `Error taking manual TikTok snapshot for ${schedule.businessProfileId}:`,
            error,
          );
        }
      }

      return { success: true, processed, errors };
    } catch (error) {
      console.error("Error in triggerAllSnapshots:", error);
      return { success: false, processed: 0, errors: 1 };
    }
  }

  getStatus(): {
    isRunning: boolean;
    nextCheck: Date;
    activeSchedules: number;
  } {
    const nextCheck = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    return {
      isRunning: this.isRunning,
      nextCheck,
      activeSchedules: this.lastSnapshotTimes.size,
    };
  }

  async cleanupOldSnapshots(
    olderThanDays: number = 90,
  ): Promise<{ success: boolean; deleted: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.prisma.tikTokDailySnapshot.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      const deleted = result.count;
      console.log(`Cleaned up ${deleted} old TikTok snapshots`);

      return { success: true, deleted };
    } catch (error) {
      console.error("Error in cleanupOldSnapshots:", error);
      return { success: false, deleted: 0 };
    }
  }
}
