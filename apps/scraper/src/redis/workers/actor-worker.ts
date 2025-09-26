import { Worker } from "bullmq";
import { redisConnection } from "../redis-connection";
import { ActionIdentifier } from "../queue";
import { GoogleBusinessReviewsActorJob } from "../../apifyService/actors/googleBusinessReviewsActor";
import { MarketPlatform } from "@prisma/client";

new Worker(
  "actor-queue",
  async (job) => {
    switch (job.name) {
      case ActionIdentifier.businessProfileUpdate:
        updateBusinessProfile(job.data);
      case ActionIdentifier.multiBusinessProfileUpdate:
        updateMultiBusinessProfile(job.data);
      case ActionIdentifier.businessRecentReviewsUpdate:
        updateBusinessRecentReviews(job.data);
      case ActionIdentifier.multiBusinessRecentReviewsUpdate:
        updateMultiBusinessReviews(job.data);
      default:
        break;
    }
  },
  { connection: redisConnection }
);

function updateBusinessProfile(data: any) {
  let { placeID, teamId } = data;

  let job = new GoogleBusinessReviewsActorJob({
    platform: MarketPlatform.GOOGLE_MAPS,
    teamId: teamId,
    placeId: placeID,
    isInitialization: false
  }, process.env.APIFY_TOKEN!)

  job.run()
}

function updateMultiBusinessProfile(data: any) {
  let { placeID } = data;

  console.log("updateMultiBusinessProfile started");
}
function updateBusinessRecentReviews(data: any) {
  let { placeID } = data;

  console.log("updateBusinessRecentReviews started");
}
function updateMultiBusinessReviews(data: any) {
  let { placeID } = data;

  console.log("updateMultiBusinessReviews started");
}
