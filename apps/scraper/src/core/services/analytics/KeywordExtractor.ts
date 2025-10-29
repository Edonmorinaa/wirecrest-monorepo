/**
 * Keyword Extractor Utility
 * Extracts and ranks keywords from review text
 * Follows Single Responsibility Principle (SRP)
 */

export interface KeywordFrequency {
  keyword: string;
  count: number;
  sentiment?: number;
}

export class KeywordExtractor {
  // Common stop words to filter out
  private static readonly STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
    'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will',
    'just', 'don', 'should', 'now', 'is', 'was', 'were', 'are', 'been', 'being',
    'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'would', 'could',
    'ought', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their', 'what',
    'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'be', 'me',
    'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'your', 'yours', 'yourself',
    'yourselves', 'his', 'her', 'hers', 'herself', 'its', 'itself', 'our', 'ours',
    'us', 'get', 'got', 'like', 'also', 'really', 'one', 'two', 'go', 'went',
  ]);

  /**
   * Extract keywords from a single text
   */
  static extractFromText(text: string, minLength: number = 3): string[] {
    if (!text) return [];

    // Convert to lowercase and split into words
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => 
        word.length >= minLength && 
        !this.STOP_WORDS.has(word) &&
        !this.isNumeric(word)
      );

    return words;
  }

  /**
   * Extract and count keywords from multiple texts
   */
  static extractAndCount(
    texts: string[],
    limit: number = 20
  ): KeywordFrequency[] {
    const keywordMap = new Map<string, number>();

    texts.forEach(text => {
      const keywords = this.extractFromText(text);
      keywords.forEach(keyword => {
        keywordMap.set(keyword, (keywordMap.get(keyword) || 0) + 1);
      });
    });

    // Convert to array and sort by frequency
    const keywords = Array.from(keywordMap.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return keywords;
  }

  /**
   * Extract keywords from reviews with metadata
   */
  static extractFromReviews<T extends { text?: string | null; reviewMetadata?: { keywords?: string[] | null } | null }>(
    reviews: T[],
    limit: number = 20
  ): KeywordFrequency[] {
    const keywordMap = new Map<string, number>();

    reviews.forEach(review => {
      // First try to use pre-extracted keywords from metadata
      if (review.reviewMetadata?.keywords) {
        review.reviewMetadata.keywords.forEach(keyword => {
          if (keyword) {
            keywordMap.set(keyword.toLowerCase(), (keywordMap.get(keyword.toLowerCase()) || 0) + 1);
          }
        });
      } else if (review.text) {
        // Fall back to extracting from text
        const keywords = this.extractFromText(review.text);
        keywords.forEach(keyword => {
          keywordMap.set(keyword, (keywordMap.get(keyword) || 0) + 1);
        });
      }
    });

    // Convert to array and sort by frequency
    const keywords = Array.from(keywordMap.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return keywords;
  }

  /**
   * Merge keyword arrays from reviews
   */
  static mergeKeywordArrays(keywordArrays: (string[] | null)[]): KeywordFrequency[] {
    const keywordMap = new Map<string, number>();

    keywordArrays.forEach(keywords => {
      if (keywords) {
        keywords.forEach(keyword => {
          if (keyword) {
            const normalized = keyword.toLowerCase();
            keywordMap.set(normalized, (keywordMap.get(normalized) || 0) + 1);
          }
        });
      }
    });

    return Array.from(keywordMap.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Check if string is numeric
   */
  private static isNumeric(str: string): boolean {
    return !isNaN(parseFloat(str)) && isFinite(parseFloat(str));
  }

  /**
   * Clean and normalize keyword
   */
  static normalizeKeyword(keyword: string): string {
    return keyword
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '');
  }
}

