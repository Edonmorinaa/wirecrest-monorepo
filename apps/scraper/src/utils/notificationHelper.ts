import { sendNotification as sendNotificationBase } from "@wirecrest/notifications";

/**
 * Notification Helper for Scraper Service
 *
 * Provides rate-limited notification sending to prevent spam.
 * Notifications are sent to users, teams, or super admins based on the event type.
 */

// Rate limiting cache to prevent spam
const notificationCache = new Map<string, number>();
const RATE_LIMIT_MS = 3600000; // 1 hour

/**
 * Send a notification with rate limiting
 *
 * @param payload - Notification payload
 */
export async function sendNotification(payload: any): Promise<void> {
  // Create cache key for rate limiting
  const cacheKey = `${payload.scope}-${payload.teamId || payload.superRole}-${payload.type}-${payload.category}`;

  // Check rate limit
  const lastSent = notificationCache.get(cacheKey);
  if (lastSent && Date.now() - lastSent < RATE_LIMIT_MS) {
    console.log(`⏭️  Skipping notification (rate limited): ${cacheKey}`);
    return;
  }

  try {
    await sendNotificationBase(payload);
    notificationCache.set(cacheKey, Date.now());
    console.log(
      `✉️  Notification sent: ${payload.title.replace(/<[^>]*>/g, "")}`,
    );
  } catch (error) {
    console.error("Failed to send notification:", error);
    // Don't throw - notifications shouldn't break scraping
  }
}

// Clear old cache entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of notificationCache.entries()) {
    if (now - timestamp > RATE_LIMIT_MS * 2) {
      notificationCache.delete(key);
    }
  }
}, RATE_LIMIT_MS);
