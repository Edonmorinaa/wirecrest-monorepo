/**
 * Process Retry Queue Job
 *
 * Cron job that processes the business retry queue every 5 minutes.
 * Should be run as a separate process or scheduled task.
 */

import "dotenv/config";
import { BusinessRetryService } from "../services/retry/BusinessRetryService";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN!;
const WEBHOOK_BASE_URL =
  process.env.WEBHOOK_BASE_URL || "http://localhost:3000";

async function processRetryQueue() {
  console.log("🔄 Starting retry queue processing...");

  const retryService = new BusinessRetryService(APIFY_TOKEN, WEBHOOK_BASE_URL);

  try {
    const result = await retryService.processRetryQueue();

    console.log(`✅ Retry queue processed:`, result);

    // Get current stats
    const stats = await retryService.getRetryStats();
    console.log(`📊 Retry queue stats:`, stats);

    // Warn if too many failures
    if (stats.failed > 10) {
      console.warn(
        `⚠️  WARNING: ${stats.failed} businesses have permanently failed!`,
      );
    }

    // Clean up old resolved entries (older than 7 days)
    if (Math.random() < 0.1) {
      // 10% chance to run cleanup
      await retryService.cleanupOldEntries(7);
    }
  } catch (error) {
    console.error("❌ Error processing retry queue:", error);
  }
}

// If run directly (not imported)
if (require.main === module) {
  processRetryQueue()
    .then(() => {
      console.log("✅ Retry queue processing complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Fatal error:", error);
      process.exit(1);
    });
}

export { processRetryQueue };
