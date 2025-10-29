/**
 * Data Processor Interface
 * Follows Single Responsibility Principle (SRP)
 * Handles processing of raw data from external sources
 */

export interface ProcessingResult {
  success: boolean;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  error?: string;
  processingTimeMs?: number;
}

export interface SyncResult {
  reviewsProcessed: number;
  reviewsNew: number;
  reviewsDuplicate: number;
  businessesUpdated: number;
  processingTimeMs: number;
}

export interface IDataProcessor<TRawData = any, TProcessedData = any> {
  /**
   * Process raw data into structured format
   */
  process(rawData: TRawData[]): Promise<ProcessingResult>;

  /**
   * Validate raw data before processing
   */
  validate(rawData: TRawData): boolean;

  /**
   * Transform raw data to internal format
   */
  transform(rawData: TRawData): TProcessedData;
}

export interface IReviewDataProcessor {
  /**
   * Process reviews from external platform
   */
  processReviews(
    teamId: string | null,
    platform: string,
    rawData: any[],
    isInitial: boolean
  ): Promise<SyncResult>;
}

