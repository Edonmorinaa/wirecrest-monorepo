import { Queue } from "bullmq";
import dotenv from "dotenv";
import { redisConnection } from "./redis-connection";

dotenv.config();

export const scheduleQueueIdentifier = "schedule-queue";
export const scheduleQueue = new Queue(scheduleQueueIdentifier, {
  connection: redisConnection,
});

export enum ActionIdentifier {
  businessProfileUpdate = "business-profile-update",
  multiBusinessProfileUpdate = "multi-business-profile-update",
  businessRecentReviewsUpdate = "business-recent-reviews-update",
  multiBusinessRecentReviewsUpdate = "multibusiness-recent-reviews-update",
}

export async function scheduleBusinessProfileUpdate(
  placeID: string,
  delayMS: number,
) {
  await scheduleQueue.add(
    ActionIdentifier.businessProfileUpdate,
    { placeID },
    { delay: delayMS },
  );
}

export async function scheduleMultiBusinessProfileUpdate(
  placeIDList: string[],
  delayMS: number,
) {
  await scheduleQueue.add(
    ActionIdentifier.multiBusinessProfileUpdate,
    { placeIDList },
    { delay: delayMS },
  );
}

export async function scheduleBusinessRecentReviewsUpdate(
  placeID: string,
  newerThan: Date,
  delayMS: number,
) {
  await scheduleQueue.add(
    ActionIdentifier.businessRecentReviewsUpdate,
    { placeID, newerThan },
    { delay: delayMS },
  );
}

export async function scheduleMultiBusinessReviewsUpdate(
  placeIDList: string[],
  delayMS: number,
) {
  await scheduleQueue.add(
    ActionIdentifier.multiBusinessRecentReviewsUpdate,
    { placeIDList },
    { delay: delayMS },
  );
}
