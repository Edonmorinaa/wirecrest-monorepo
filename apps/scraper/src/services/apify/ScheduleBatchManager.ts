/**
 * Schedule Batch Manager
 *
 * Handles automatic batching and load balancing for global schedules.
 * Ensures no schedule exceeds platform-specific limits.
 */

import { prisma } from "@wirecrest/db";
import type { Platform, ScheduleType } from "../../types/apify.types";

const MAX_BATCH_SIZE: Record<Platform, number> = {
  google_reviews: 50,
  facebook: 30,
  tripadvisor: 30,
  booking: 30,
};

interface BatchAllocationResult {
  scheduleId: string;
  batchIndex: number;
  currentSize: number;
  availableCapacity: number;
}

export class ScheduleBatchManager {
  /**
   * Find best schedule for adding a new business
   * Returns schedule with most available capacity
   */
  async findBestScheduleForBusiness(
    platform: Platform,
    scheduleType: ScheduleType,
    intervalHours: number,
  ): Promise<BatchAllocationResult | null> {
    const schedules = await prisma.apifyGlobalSchedule.findMany({
      where: {
        platform,
        scheduleType,
        intervalHours,
      },
      orderBy: [
        { businessCount: "asc" }, // Prefer schedules with fewer businesses
        { batchIndex: "asc" }, // Prefer lower batch indices
      ],
    });

    for (const schedule of schedules) {
      const availableCapacity =
        MAX_BATCH_SIZE[platform] - schedule.businessCount;

      if (availableCapacity > 0) {
        return {
          scheduleId: schedule.id,
          batchIndex: schedule.batchIndex,
          currentSize: schedule.businessCount,
          availableCapacity,
        };
      }
    }

    return null; // No schedule with capacity found, need to create new batch
  }

  /**
   * Rebalance businesses across batches
   * Redistributes businesses evenly to optimize load
   */
  async rebalanceBatches(
    platform: Platform,
    scheduleType: ScheduleType,
    intervalHours: number,
  ): Promise<{
    success: boolean;
    businessesMoved: number;
    message: string;
  }> {
    try {
      const schedules = await prisma.apifyGlobalSchedule.findMany({
        where: {
          platform,
          scheduleType,
          intervalHours,
        },
        include: {
          businessMappings: {
            where: { isActive: true },
          },
        },
        orderBy: { batchIndex: "asc" },
      });

      if (schedules.length <= 1) {
        return {
          success: true,
          businessesMoved: 0,
          message: "No rebalancing needed (single schedule)",
        };
      }

      // Calculate total businesses and target per batch
      const totalBusinesses = schedules.reduce(
        (sum, s) => sum + s.businessCount,
        0,
      );
      const targetPerBatch = Math.ceil(totalBusinesses / schedules.length);
      const maxPerBatch = MAX_BATCH_SIZE[platform];

      if (targetPerBatch > maxPerBatch) {
        return {
          success: false,
          businessesMoved: 0,
          message: `Cannot rebalance: need more batches (${targetPerBatch} > ${maxPerBatch})`,
        };
      }

      let businessesMoved = 0;

      // Collect all businesses
      const allBusinesses = schedules.flatMap((s) =>
        s.businessMappings.map((b) => ({ ...b, currentScheduleId: s.id })),
      );

      // Redistribute evenly
      for (let i = 0; i < allBusinesses.length; i++) {
        const business = allBusinesses[i];
        const targetScheduleIndex = Math.floor(i / targetPerBatch);
        const targetSchedule = schedules[targetScheduleIndex];

        if (business.currentScheduleId !== targetSchedule.id) {
          await prisma.businessScheduleMapping.update({
            where: { id: business.id },
            data: { scheduleId: targetSchedule.id },
          });
          businessesMoved++;
        }
      }

      // Update business counts
      for (const schedule of schedules) {
        const newCount = await prisma.businessScheduleMapping.count({
          where: {
            scheduleId: schedule.id,
            isActive: true,
          },
        });

        await prisma.apifyGlobalSchedule.update({
          where: { id: schedule.id },
          data: { businessCount: newCount },
        });
      }

      console.log(
        `✓ Rebalanced ${businessesMoved} businesses across ${schedules.length} batches`,
      );

      return {
        success: true,
        businessesMoved,
        message: `Rebalanced ${businessesMoved} businesses across ${schedules.length} batches`,
      };
    } catch (error: any) {
      console.error("Error rebalancing batches:", error);
      return {
        success: false,
        businessesMoved: 0,
        message: `Failed: ${error.message}`,
      };
    }
  }

  /**
   * Check if schedule needs splitting
   */
  async shouldSplitSchedule(scheduleId: string): Promise<boolean> {
    const schedule = await prisma.apifyGlobalSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      return false;
    }

    const maxSize = MAX_BATCH_SIZE[schedule.platform as Platform];
    return schedule.businessCount >= maxSize;
  }

  /**
   * Get schedule statistics
   */
  async getScheduleStats(
    platform: Platform,
    scheduleType: ScheduleType,
    intervalHours: number,
  ): Promise<{
    totalSchedules: number;
    totalBusinesses: number;
    averageLoad: number;
    maxLoad: number;
    minLoad: number;
    needsRebalancing: boolean;
  }> {
    const schedules = await prisma.apifyGlobalSchedule.findMany({
      where: {
        platform,
        scheduleType,
        intervalHours,
      },
    });

    if (schedules.length === 0) {
      return {
        totalSchedules: 0,
        totalBusinesses: 0,
        averageLoad: 0,
        maxLoad: 0,
        minLoad: 0,
        needsRebalancing: false,
      };
    }

    const totalBusinesses = schedules.reduce(
      (sum, s) => sum + s.businessCount,
      0,
    );
    const loads = schedules.map((s) => s.businessCount);
    const maxLoad = Math.max(...loads);
    const minLoad = Math.min(...loads);
    const averageLoad = totalBusinesses / schedules.length;

    // Need rebalancing if difference between max and min is > 20% of average
    const needsRebalancing = maxLoad - minLoad > averageLoad * 0.2;

    return {
      totalSchedules: schedules.length,
      totalBusinesses,
      averageLoad: Math.round(averageLoad * 10) / 10,
      maxLoad,
      minLoad,
      needsRebalancing,
    };
  }

  /**
   * Consolidate underutilized batches
   * Merges batches that are below threshold
   */
  async consolidateBatches(
    platform: Platform,
    scheduleType: ScheduleType,
    intervalHours: number,
    threshold: number = 0.3, // Consolidate if < 30% full
  ): Promise<{
    success: boolean;
    batchesRemoved: number;
    message: string;
  }> {
    try {
      const maxSize = MAX_BATCH_SIZE[platform];
      const minSize = Math.floor(maxSize * threshold);

      const schedules = await prisma.apifyGlobalSchedule.findMany({
        where: {
          platform,
          scheduleType,
          intervalHours,
        },
        include: {
          businessMappings: {
            where: { isActive: true },
          },
        },
        orderBy: { businessCount: "asc" }, // Start with smallest
      });

      if (schedules.length <= 1) {
        return {
          success: true,
          batchesRemoved: 0,
          message: "No consolidation needed",
        };
      }

      let batchesRemoved = 0;

      for (let i = 0; i < schedules.length - 1; i++) {
        const smallSchedule = schedules[i];

        if (smallSchedule.businessCount >= minSize) {
          continue; // Schedule is above threshold
        }

        // Find a schedule that can absorb these businesses
        const targetSchedule = schedules.find(
          (s) =>
            s.id !== smallSchedule.id &&
            s.businessCount + smallSchedule.businessCount <= maxSize,
        );

        if (!targetSchedule) {
          continue; // Can't consolidate this one
        }

        // Move all businesses to target schedule
        await prisma.businessScheduleMapping.updateMany({
          where: { scheduleId: smallSchedule.id },
          data: { scheduleId: targetSchedule.id },
        });

        // Update counts
        await prisma.apifyGlobalSchedule.update({
          where: { id: targetSchedule.id },
          data: {
            businessCount:
              targetSchedule.businessCount + smallSchedule.businessCount,
          },
        });

        // Delete empty schedule (from Apify and database)
        // Note: This should also call Apify API to delete the schedule
        await prisma.apifyGlobalSchedule.delete({
          where: { id: smallSchedule.id },
        });

        batchesRemoved++;
        console.log(
          `✓ Consolidated batch ${smallSchedule.batchIndex} into batch ${targetSchedule.batchIndex}`,
        );
      }

      return {
        success: true,
        batchesRemoved,
        message: `Consolidated ${batchesRemoved} underutilized batches`,
      };
    } catch (error: any) {
      console.error("Error consolidating batches:", error);
      return {
        success: false,
        batchesRemoved: 0,
        message: `Failed: ${error.message}`,
      };
    }
  }

  /**
   * Get health status of all schedules
   */
  async getHealthStatus(): Promise<{
    healthy: number;
    warning: number;
    critical: number;
    details: Array<{
      platform: string;
      scheduleType: string;
      intervalHours: number;
      status: "healthy" | "warning" | "critical";
      reason?: string;
    }>;
  }> {
    const schedules = await prisma.apifyGlobalSchedule.findMany({
      include: {
        _count: {
          select: { businessMappings: true },
        },
      },
    });

    let healthy = 0;
    let warning = 0;
    let critical = 0;
    const details: any[] = [];

    for (const schedule of schedules) {
      const maxSize = MAX_BATCH_SIZE[schedule.platform as Platform];
      const loadPercentage = (schedule.businessCount / maxSize) * 100;

      let status: "healthy" | "warning" | "critical" = "healthy";
      let reason: string | undefined;

      if (loadPercentage >= 95) {
        status = "critical";
        reason = `At ${loadPercentage.toFixed(0)}% capacity, needs splitting`;
        critical++;
      } else if (loadPercentage >= 80) {
        status = "warning";
        reason = `At ${loadPercentage.toFixed(0)}% capacity, approaching limit`;
        warning++;
      } else {
        healthy++;
      }

      if (status !== "healthy") {
        details.push({
          platform: schedule.platform,
          scheduleType: schedule.scheduleType,
          intervalHours: schedule.intervalHours,
          status,
          reason,
        });
      }
    }

    return { healthy, warning, critical, details };
  }
}
