import Sentiment from 'sentiment';
import natural from 'natural';
import stopword from 'stopword';

const sentimentAnalyzer = new Sentiment();
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

/**
 * Analyzes the sentiment of a text and returns a normalized score between -1 and 1
 * @param text The text to analyze
 * @returns A sentiment score between -1 (very negative) and 1 (very positive)
 */
export function analyzeSentiment(text: string | null): number {
  if (!text || text.trim() === '') return 0;
  
  try {
    // Get sentiment score from sentiment library
    const result = sentimentAnalyzer.analyze(text);
    
    // Normalize the score to be between -1 and 1
    // The raw score can be any integer, so we need to normalize it
    const normalizedScore = Math.max(-1, Math.min(1, result.score / 5));
    
    return normalizedScore;
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return 0; // Return neutral sentiment on error
  }
}

/**
 * Extracts keywords from text using TF-IDF analysis
 * @param text The text to extract keywords from
 * @param count The number of keywords to extract
 * @returns An array of keywords
 */
export function extractKeywords(text: string | null, count: number = 5): string[] {
  if (!text || text.trim() === '') return [];
  
  try {
    // Tokenize the text
    const tokens = tokenizer.tokenize(text.toLowerCase());
    if (!tokens || tokens.length === 0) return [];
    
    // Remove stopwords safely
    let filteredTokens = tokens;
    try {
      if (stopword && typeof stopword.removeStopwords === 'function') {
        filteredTokens = stopword.removeStopwords(tokens);
      } else {
        console.warn('Stopword removal function not available, using original tokens');
      }
    } catch (error) {
      console.warn('Error removing stopwords:', error);
    }
    
    // Create a TF-IDF instance
    const tfidf = new TfIdf();
    
    // Add the document
    tfidf.addDocument(filteredTokens);
    
    // Extract the top terms
    const terms: { term: string; score: number }[] = [];
    
    tfidf.listTerms(0).forEach(item => {
      // Only include words with at least 3 characters
      if (item.term.length >= 3) {
        terms.push({
          term: item.term,
          score: item.tfidf
        });
      }
    });
    
    // Sort by TF-IDF score and take the top 'count' terms
    return terms
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(item => item.term);
  } catch (error) {
    console.error('Error extracting keywords:', error);
    return []; // Return empty array on error
  }
}

/**
 * Classifies text into categories using a naive approach based on key terms
 * @param text The text to classify
 * @param businessCategory The business category for context (optional)
 * @returns An array of topic categories
 */
export function classifyTopics(text: string | null, businessCategory?: string): string[] {
  if (!text || text.trim() === '') return [];
  
  try {
    const topics: string[] = [];
    const lowerText = text.toLowerCase();
    
    // Define category keywords
    const categories: Record<string, string[]> = {
      'service': ['service', 'staff', 'friendly', 'helpful', 'polite', 'professional', 'attentive', 'rude', 'slow'],
      'quality': ['quality', 'excellent', 'great', 'good', 'bad', 'poor', 'terrible', 'amazing', 'awesome'],
      'price': ['price', 'expensive', 'cheap', 'affordable', 'value', 'worth', 'overpriced', 'reasonable'],
      'cleanliness': ['clean', 'dirty', 'spotless', 'filthy', 'hygiene', 'neat', 'tidy', 'mess'],
      'food': ['food', 'delicious', 'tasty', 'flavor', 'menu', 'dish', 'meal', 'portion', 'ingredient'],
      'location': ['location', 'parking', 'convenient', 'close', 'far', 'accessibility', 'distance'],
      'atmosphere': ['atmosphere', 'ambiance', 'environment', 'noise', 'quiet', 'loud', 'music', 'cozy', 'comfortable'],
      'wait': ['wait', 'time', 'quick', 'fast', 'slow', 'delay', 'prompt', 'waited', 'minutes', 'hour'],
      'product': ['product', 'item', 'purchase', 'bought', 'broken', 'works', 'quality', 'durable']
    };
    
    // Special restaurant keywords
    const restaurantCategories: Record<string, string[]> = {
      'taste': ['taste', 'flavor', 'delicious', 'bland', 'spicy', 'sweet', 'sour', 'bitter', 'savory'],
      'portion': ['portion', 'serving', 'size', 'generous', 'small', 'large', 'enough', 'tiny', 'huge'],
      'freshness': ['fresh', 'rotten', 'stale', 'new', 'old', 'soggy', 'crispy']
    };
    
    // Add restaurant categories if it's a restaurant
    if (businessCategory?.toLowerCase().includes('restaurant')) {
      Object.assign(categories, restaurantCategories);
    }
    
    // Check each category
    for (const [category, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          topics.push(category);
          break; // Once found a match for this category, move to next
        }
      }
    }
    
    // Remove duplicates
    return Array.from(new Set(topics));
  } catch (error) {
    console.error('Error classifying topics:', error);
    return []; // Return empty array on error
  }
}

/**
 * Analyzes detailed aspects of a review and returns a structured object
 * @param text The review text
 * @param rating The rating (1-5)
 * @param businessCategory The business category (optional)
 * @returns A structured analysis object
 */
export function analyzeReview(text: string | null, rating: number, businessCategory?: string): {
  sentiment: number;
  keywords: string[];
  topics: string[];
  emotional: string;
  actionable: boolean;
} {
  // Default values
  const result = {
    sentiment: 0,
    keywords: [] as string[],
    topics: [] as string[],
    emotional: 'neutral',
    actionable: false
  };
  
  if (!text || text.trim() === '') {
    return result;
  }
  
  try {
    // Run sentiment analysis
    result.sentiment = analyzeSentiment(text);
    
    // Extract keywords
    result.keywords = extractKeywords(text);
    
    // Classify topics
    result.topics = classifyTopics(text, businessCategory);
    
    // Determine emotional intensity
    if (Math.abs(result.sentiment) > 0.7) {
      result.emotional = result.sentiment > 0 ? 'very positive' : 'very negative';
    } else if (Math.abs(result.sentiment) > 0.3) {
      result.emotional = result.sentiment > 0 ? 'positive' : 'negative';
    } else {
      result.emotional = 'neutral';
    }
    
    // Check if actionable - keywords that suggest the business should take action
    const actionableTerms = [
      'should', 'need', 'improve', 'fix', 'better', 'change', 'consider', 
      'recommend', 'suggestion', 'try', 'please', 'would', 'could', 'wish'
    ];
    
    result.actionable = actionableTerms.some(term => text.toLowerCase().includes(term));
    
    return result;
  } catch (error) {
    console.error('Error analyzing review:', error);
    return result; // Return default values on error
  }
}

/**
 * Analyzes a review's competitive positioning relative to mentioned competitors
 * @param text The review text
 * @returns An object with competitor mentions and comparative sentiment
 */
export function analyzeCompetitiveInsights(text: string | null): {
  competitorMentions: string[];
  comparativePositive: boolean;
} {
  const result = {
    competitorMentions: [] as string[],
    comparativePositive: false
  };
  
  if (!text || text.trim() === '') return result;
  
  try {
    // Common comparative phrases
    const comparativePhrases = [
      'better than', 'worse than', 'compared to', 'similar to', 'unlike', 
      'prefer', 'rather go to', 'instead of', 'more than', 'less than'
    ];
    
    // Check if the text contains comparative phrases
    const hasComparison = comparativePhrases.some(phrase => text.toLowerCase().includes(phrase));
    
    if (hasComparison) {
      // This is a very simplified approach - in a real implementation, 
      // you'd use named entity recognition to identify business names
      const potentialCompetitors = text.match(/[A-Z][a-z]+('s)?/g) || [];
      result.competitorMentions = potentialCompetitors;
      
      // Simplified comparative sentiment - check if comparison is positive for the business
      const positivePhrases = ['better than', 'prefer', 'more than'];
      const negativePhrases = ['worse than', 'rather go to', 'instead of'];
      
      // Count positive vs negative phrases
      const positiveCount = positivePhrases.filter(phrase => text.toLowerCase().includes(phrase)).length;
      const negativeCount = negativePhrases.filter(phrase => text.toLowerCase().includes(phrase)).length;
      
      result.comparativePositive = positiveCount > negativeCount;
    }
    
    return result;
  } catch (error) {
    console.error('Error analyzing competitive insights:', error);
    return result; // Return empty result on error
  }
}

/**
 * Calculate the response urgency based on review content and metadata
 * @param text The review text
 * @param rating The rating (1-5)
 * @param hasPhotos Whether the review has photos
 * @returns An urgency score from 1 (low) to 10 (high)
 */
export function calculateResponseUrgency(text: string | null, rating: number, hasPhotos: boolean): number {
  if (!text) return 1;
  
  try {
    let urgencyScore = 5; // Default medium urgency
    
    // Low ratings are more urgent
    if (rating <= 2) urgencyScore += 3;
    else if (rating === 3) urgencyScore += 1;
    
    // Longer reviews are more urgent (more detailed feedback)
    if (text.length > 200) urgencyScore += 1;
    
    // Reviews with photos are more urgent (more visibility)
    if (hasPhotos) urgencyScore += 2;
    
    // Check for urgent keywords
    const urgentKeywords = [
      'terrible', 'awful', 'horrible', 'never again', 'disaster', 'emergency',
      'health', 'safety', 'danger', 'sick', 'ill', 'food poisoning', 'dirty',
      'filthy', 'gross', 'disgusting', 'refund', 'manager', 'lawsuit', 'legal'
    ];
    
    if (urgentKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
      urgencyScore += 2;
    }
    
    // Cap the score at 10
    return Math.min(10, urgencyScore);
  } catch (error) {
    console.error('Error calculating response urgency:', error);
    return 5; // Return medium urgency on error
  }
} 