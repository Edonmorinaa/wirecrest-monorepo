/**
 * Webhook Handler Interface
 * Follows Single Responsibility Principle (SRP)
 * Handles incoming webhook events from external services
 */

export interface WebhookPayload {
  eventType: string;
  timestamp: Date;
  data: any;
  signature?: string;
}

export interface WebhookResponse {
  success: boolean;
  message: string;
  statusCode: number;
  error?: string;
}

export interface IWebhookHandler {
  /**
   * Validate webhook signature/authentication
   */
  validateWebhook(payload: WebhookPayload, signature?: string): boolean;

  /**
   * Process webhook payload
   */
  handleWebhook(payload: WebhookPayload): Promise<WebhookResponse>;

  /**
   * Get supported event types
   */
  getSupportedEventTypes(): string[];
}

export interface IApifyWebhookHandler extends IWebhookHandler {
  /**
   * Handle Apify actor completion
   */
  handleActorSuccess(actorRunId: string, datasetId: string): Promise<void>;

  /**
   * Handle Apify actor failure
   */
  handleActorFailure(actorRunId: string, error: string): Promise<void>;
}

export interface ISubscriptionWebhookHandler extends IWebhookHandler {
  /**
   * Handle subscription created
   */
  handleSubscriptionCreated(
    teamId: string,
    subscriptionData: any,
  ): Promise<void>;

  /**
   * Handle subscription updated
   */
  handleSubscriptionUpdated(
    teamId: string,
    subscriptionData: any,
  ): Promise<void>;

  /**
   * Handle subscription cancelled
   */
  handleSubscriptionCancelled(teamId: string): Promise<void>;
}

export interface IStripeWebhookHandler extends IWebhookHandler {
  /**
   * Handle payment success
   */
  handlePaymentSuccess(sessionId: string, customerId: string): Promise<void>;

  /**
   * Handle payment failure
   */
  handlePaymentFailure(sessionId: string, error: string): Promise<void>;
}
