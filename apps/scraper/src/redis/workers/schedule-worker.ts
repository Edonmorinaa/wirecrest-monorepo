import { Worker } from "bullmq";
import { ActorManager } from "../../apifyService/actorManager";
import { redisConnection } from "../redis-connection";
import { ActionIdentifier, scheduleQueueIdentifier } from "../queue";

const actorManager = new ActorManager({ memoryLimitMB: 16 * 1024 }); // 16GB = 16384MB

new Worker(
  scheduleQueueIdentifier,
  async (job) => {
    switch (job.name) {
      case ActionIdentifier.businessProfileUpdate:
        passBusinessProfile(job.data);
      case ActionIdentifier.multiBusinessProfileUpdate:
        passMultiBusinessProfile(job.data);
      case ActionIdentifier.businessRecentReviewsUpdate:
        passBusinessRecentReviews(job.data);
      case ActionIdentifier.multiBusinessRecentReviewsUpdate:
        passMultiBusinessReviews(job.data);
      default:
        break;
    }
  },
  { connection: redisConnection }
);

function passBusinessProfile(data: any) {
  console.log("updateBusinessProfile started");
}

function passMultiBusinessProfile(data: any) {
  console.log("updateMultiBusinessProfile started");
}

function passBusinessRecentReviews(data: any) {
  console.log("updateBusinessRecentReviews started");
}

function passMultiBusinessReviews(data: any) {
  console.log("updateMultiBusinessReviews started");
}
