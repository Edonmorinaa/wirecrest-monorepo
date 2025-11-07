/**
 * Sentiment Analyzer Interface
 * Follows Dependency Inversion Principle (DIP)
 * Allows for different sentiment analysis implementations
 */

export interface SentimentScore {
  score: number; // -1 to 1 (negative to positive)
  comparative: number;
  tokens: string[];
  positive: string[];
  negative: string[];
}

export interface SentimentCategory {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export interface ISentimentAnalyzer {
  /**
   * Analyze sentiment of a single text
   */
  analyze(text: string): SentimentScore;

  /**
   * Categorize sentiment score into positive/neutral/negative
   */
  categorize(score: number): "positive" | "neutral" | "negative";

  /**
   * Analyze multiple texts and aggregate sentiment
   */
  analyzeBatch(texts: string[]): SentimentCategory;

  /**
   * Extract keywords from text
   */
  extractKeywords(text: string, limit?: number): string[];
}
