import { SentimentAnalyzer } from '../../sentimentAnalyzer/sentimentAnalyzer';

/**
 * Common words to exclude from keyword analysis
 * Centralized to ensure consistency across all platforms
 */
export const COMMON_WORDS = new Set([
  'the', 'and', 'a', 'to', 'of', 'in', 'is', 'it', 'that', 'for', 'on', 'with',
  'as', 'at', 'this', 'by', 'from', 'an', 'be', 'or', 'but', 'was', 'are',
  'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'these', 'those', 'i', 'you', 'he',
  'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
  'her', 'its', 'our', 'their'
]);

/**
 * Business-specific terms categorized by topic
 * Used for topic extraction and keyword boosting
 */
export const BUSINESS_TERMS = {
  service: [
    'service', 'staff', 'employee', 'server', 'waiter', 'waitress', 'host', 
    'hostess', 'friendly', 'helpful', 'attentive', 'professional', 'rude', 
    'slow', 'unhelpful'
  ],
  food: [
    'food', 'dish', 'meal', 'taste', 'flavor', 'menu', 'delicious', 'fresh', 
    'quality', 'portion', 'cooked', 'spicy', 'bland'
  ],
  ambiance: [
    'ambiance', 'atmosphere', 'decor', 'environment', 'setting', 'clean', 
    'dirty', 'noisy', 'quiet', 'cozy', 'modern', 'traditional'
  ],
  value: [
    'price', 'value', 'worth', 'expensive', 'cheap', 'affordable', 'overpriced', 
    'reasonable', 'budget', 'cost'
  ],
  location: [
    'location', 'place', 'area', 'neighborhood', 'district', 'parking', 
    'accessible', 'convenient', 'remote'
  ],
  timing: [
    'wait', 'time', 'quick', 'fast', 'slow', 'busy', 'crowded', 'empty', 
    'reservation', 'booking'
  ],
  quality: [
    'quality', 'excellent', 'good', 'bad', 'poor', 'amazing', 'terrible', 
    'outstanding', 'disappointing'
  ],
  experience: [
    'experience', 'visit', 'return', 'recommend', 'enjoy', 'disappoint', 
    'satisfy', 'impress'
  ]
};

/**
 * Emotional keywords for sentiment analysis
 */
const EMOTIONAL_KEYWORDS = {
  positive: [
    'excellent', 'amazing', 'wonderful', 'fantastic', 'great', 'love', 'perfect', 
    'outstanding', 'superb', 'exceptional', 'brilliant', 'delightful'
  ],
  negative: [
    'terrible', 'awful', 'horrible', 'disgusting', 'hate', 'worst', 'disappointed', 
    'bad', 'poor', 'unacceptable', 'appalling'
  ]
};

/**
 * Analysis result returned by the service
 */
export interface ReviewAnalysisResult {
  sentiment: number;
  emotional: string;
  keywords: string[];
  topics: string[];
  responseUrgency: number;
}

/**
 * Centralized Review Analysis Service
 * 
 * Provides consistent sentiment analysis, keyword extraction, and topic classification
 * across all platforms (Google, Facebook, TripAdvisor, Booking, etc.)
 * 
 * @example
 * ```typescript
 * const service = ReviewAnalysisService.getInstance();
 * const analysis = await service.analyzeReview('Great food and service!', 5);
 * console.log(analysis.sentiment); // 0.85
 * console.log(analysis.emotional); // 'positive'
 * console.log(analysis.responseUrgency); // 1
 * ```
 */
export class ReviewAnalysisService {
  private static instance: ReviewAnalysisService;
  private sentimentAnalyzer: SentimentAnalyzer;

  private constructor() {
    this.sentimentAnalyzer = new SentimentAnalyzer(['en']);
  }

  /**
   * Get singleton instance of ReviewAnalysisService
   */
  public static getInstance(): ReviewAnalysisService {
    if (!ReviewAnalysisService.instance) {
      ReviewAnalysisService.instance = new ReviewAnalysisService();
    }
    return ReviewAnalysisService.instance;
  }

  /**
   * Analyze a review and extract sentiment, keywords, topics, and urgency
   * 
   * @param text - The review text to analyze
   * @param rating - The rating (1-5 scale) associated with the review
   * @returns Analysis result with sentiment, emotional tone, keywords, topics, and urgency
   */
  public async analyzeReview(
    text?: string | null,
    rating?: number | null
  ): Promise<ReviewAnalysisResult> {
    // Handle empty text
    if (!text || text.trim() === '') {
      return {
        sentiment: 0,
        emotional: 'neutral',
        keywords: [],
        topics: [],
        responseUrgency: 3 // Default medium urgency
      };
    }

    try {
      // Get sentiment score from analyzer
      const sentimentScore = await this.sentimentAnalyzer.analyzeSentiment(text);

      // Determine emotional state
      const emotional = this.determineEmotionalState(text, sentimentScore);

      // Adjust sentiment based on rating if available
      const finalSentiment = this.calculateFinalSentiment(sentimentScore, rating);

      // Extract keywords with importance scoring
      const keywords = this.extractKeywords(text);

      // Extract topics based on business terms
      const topics = this.extractTopics(text);

      // Calculate response urgency (1-10 scale)
      const responseUrgency = this.calculateResponseUrgency(text, sentimentScore, rating);

      return {
        sentiment: Number(finalSentiment.toFixed(2)),
        emotional,
        keywords,
        topics,
        responseUrgency
      };
    } catch (error) {
      console.error('Error analyzing review:', error);
      // Return default values on error
      return {
        sentiment: 0,
        emotional: 'neutral',
        keywords: [],
        topics: [],
        responseUrgency: 3
      };
    }
  }

  /**
   * Determine emotional state based on sentiment score and keyword analysis
   */
  private determineEmotionalState(text: string, sentimentScore: number): string {
    const lowerText = text.toLowerCase();

    // Count positive and negative emotional keywords
    const positiveCount = EMOTIONAL_KEYWORDS.positive.filter(word => 
      lowerText.includes(word)
    ).length;
    const negativeCount = EMOTIONAL_KEYWORDS.negative.filter(word => 
      lowerText.includes(word)
    ).length;

    // Determine emotional state based on keyword counts and sentiment
    if (positiveCount > negativeCount && sentimentScore > 0.3) {
      return 'positive';
    } else if (negativeCount > positiveCount && sentimentScore < -0.3) {
      return 'negative';
    } else if (sentimentScore > 0.3) {
      return 'positive';
    } else if (sentimentScore < -0.3) {
      return 'negative';
    }
    
    return 'neutral';
  }

  /**
   * Calculate final sentiment by combining sentiment score and rating
   */
  private calculateFinalSentiment(sentimentScore: number, rating?: number | null): number {
    if (!rating) {
      return sentimentScore;
    }

    // Convert rating (1-5) to sentiment (-1 to 1)
    const ratingSentiment = (rating - 3) / 2;

    // Average the two sentiments
    return (sentimentScore + ratingSentiment) / 2;
  }

  /**
   * Extract keywords using TF-IDF-like approach with importance scoring
   */
  private extractKeywords(text: string): string[] {
    // Tokenize and clean text
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !COMMON_WORDS.has(word));

    // Count word frequencies
    const wordFreq: Map<string, number> = new Map();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    // Calculate word importance based on frequency and context
    const wordImportance: Map<string, number> = new Map();
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());

    wordFreq.forEach((freq, word) => {
      let importance = freq;

      // Boost words that appear in business terms
      const isBusinessTerm = Object.values(BUSINESS_TERMS).some(terms =>
        terms.some(term => word.includes(term) || term.includes(word))
      );
      if (isBusinessTerm) {
        importance *= 1.5;
      }

      // Boost words in first or last sentence (likely more important)
      if (sentences.length > 0) {
        const firstSentence = sentences[0].toLowerCase();
        const lastSentence = sentences[sentences.length - 1].toLowerCase();
        
        if (firstSentence.includes(word) || lastSentence.includes(word)) {
          importance *= 1.3;
        }
      }

      wordImportance.set(word, importance);
    });

    // Return top 5 keywords sorted by importance
    return Array.from(wordImportance.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Extract topics by matching against business term categories
   */
  private extractTopics(text: string): string[] {
    const lowerText = text.toLowerCase();
    const topics = new Set<string>();

    Object.entries(BUSINESS_TERMS).forEach(([topic, terms]) => {
      if (terms.some(term => lowerText.includes(term))) {
        topics.add(topic);
      }
    });

    return Array.from(topics);
  }

  /**
   * Calculate response urgency on a 1-10 scale
   * Higher urgency for negative reviews and low ratings
   */
  private calculateResponseUrgency(
    text: string,
    sentimentScore: number,
    rating?: number | null
  ): number {
    let urgency = 3; // Default medium urgency

    // Rating-based urgency
    if (rating !== null && rating !== undefined) {
      if (rating <= 2) {
        urgency = 10; // Critical
      } else if (rating === 3) {
        urgency = 7; // High
      } else if (rating === 4) {
        urgency = 4; // Medium
      } else {
        urgency = 2; // Low
      }
    }

    // Sentiment-based urgency (override if higher)
    if (sentimentScore < -0.5) {
      urgency = Math.max(urgency, 8);
    } else if (sentimentScore < -0.2) {
      urgency = Math.max(urgency, 5);
    }

    // Keyword-based urgency boost
    const lowerText = text.toLowerCase();
    const urgentKeywords = ['complaint', 'issue', 'problem', 'refund', 'manager', 'unacceptable'];
    
    if (urgentKeywords.some(keyword => lowerText.includes(keyword))) {
      urgency = Math.max(urgency, 9);
    }

    return urgency;
  }

  /**
   * Batch analyze multiple reviews efficiently
   * 
   * @param reviews - Array of reviews to analyze
   * @returns Array of analysis results
   */
  public async analyzeReviews(
    reviews: Array<{ text?: string | null; rating?: number | null }>
  ): Promise<ReviewAnalysisResult[]> {
    return Promise.all(
      reviews.map(review => this.analyzeReview(review.text, review.rating))
    );
  }
}

/**
 * Export singleton instance for convenience
 */
export const reviewAnalysisService = ReviewAnalysisService.getInstance();

