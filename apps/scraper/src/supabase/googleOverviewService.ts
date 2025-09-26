import { GoogleReview } from '@prisma/client';
import { prisma } from '@wirecrest/db';

interface RatingDistribution {
  [key: string]: {
    value: number;
    percentageValue: number;
  };
}

interface SentimentAnalysis {
  positive: number;
  neutral: number;
  negative: number;
}

interface KeywordCount {
  key: string;
  value: number;
}

export class GoogleOverviewService {
  constructor() {
    // No initialization needed for Prisma
  }

  async processAndUpdateOverview(placeId: string, reviews: GoogleReview[]): Promise<void> {
    try {
      // First get the business profile ID using placeId
      const businessData = await prisma.googleBusinessProfile.findFirst({
        where: { placeId },
        select: { id: true }
      });

      if (!businessData) {
        throw new Error(`Business with placeId ${placeId} not found`);
      }

      const businessId = businessData.id;

      // Calculate average rating
      const averageRating = reviews.reduce((sum, review) => sum + (review.stars || 0), 0) / reviews.length;

      // Calculate response metrics
      const reviewsWithResponse = reviews.filter(review => review.responseFromOwnerText);
      const responseRate = (reviewsWithResponse.length / reviews.length) * 100;

      // Calculate average response time in minutes
      const responseTimes = reviewsWithResponse
        .map(review => {
          if (review.responseFromOwnerDate && review.publishedAtDate) {
            return (new Date(review.responseFromOwnerDate).getTime() - new Date(review.publishedAtDate).getTime()) / (1000 * 60); // Convert to minutes
          }
          return null;
        })
        .filter(time => time !== null) as number[];

      const averageResponseTime = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
        : 0;

      // Calculate rating distribution with value and percentageValue
      const ratingDistribution: { [key: string]: { value: number; percentageValue: number } } = {};
      const totalReviews = reviews.length;

      for (let i = 1; i <= 5; i++) {
        const count = reviews.filter(r => r.stars === i).length;
        ratingDistribution[i.toString()] = {
          value: count,
          percentageValue: Number(((count / totalReviews) * 100).toFixed(1))
        };
      }

      // Calculate sentiment analysis
      const sentimentAnalysis = {
        positive: reviews.filter(r => r.reviewMetadata?.emotional === 'positive').length,
        neutral: reviews.filter(r => r.reviewMetadata?.emotional === 'neutral').length,
        negative: reviews.filter(r => r.reviewMetadata?.emotional === 'negative').length
      };

      // Calculate top keywords with counts
      const keywordCounts: { [key: string]: number } = {};
      reviews.forEach(review => {
        review.reviewMetadata?.keywords?.forEach(keyword => {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        });
      });

      const topKeywords = Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, value]) => ({ key, value }));

      // Get recent reviews with all details
      const recentReviews = reviews
        .sort((a, b) => new Date(b.publishedAtDate).getTime() - new Date(a.publishedAtDate).getTime())
        .slice(0, 5)
        .map(review => ({
          id: review.id,
          rating: review.stars,
          text: review.text,
          author: review.name,
          date: review.publishedAtDate,
          response: review.responseFromOwnerText,
          sentiment: review.reviewMetadata?.sentiment,
          emotional: review.reviewMetadata?.emotional,
          topics: review.reviewMetadata?.topics,
          keywords: review.reviewMetadata?.keywords
        }));

      // Check if overview exists
      const existingOverview = await prisma.googleOverview.findFirst({
        where: { businessProfileId: businessId },
        select: { id: true }
      });

      const overviewData = {
        businessProfileId: businessId,
        averageRating: Number(averageRating.toFixed(2)),
        totalReviews: totalReviews,
        responseRate: Number(responseRate.toFixed(2)),
        averageResponseTime: averageResponseTime,
        ratingDistribution: ratingDistribution,
        sentimentAnalysis: sentimentAnalysis,
        topKeywords: topKeywords,
        recentReviews: recentReviews,
        lastUpdated: new Date()
      };

      if (!existingOverview) {
        // Create new overview
        await prisma.googleOverview.create({
          data: overviewData
        });
      } else {
        // Update existing overview
        await prisma.googleOverview.updateMany({
          where: { businessProfileId: businessId },
          data: overviewData
        });
      }

    } catch (error) {
      console.error('Error processing Google overview:', error);
      throw error;
    }
  }

  private calculateAverageRating(reviews: GoogleReview[]): number {
    if (reviews.length === 0) return 0;
    
    const validReviews = reviews.filter(review => 
      (review.rating !== null && review.rating !== undefined) || 
      (review.stars !== null && review.stars !== undefined)
    );
    
    if (validReviews.length === 0) return 0;
    
    const sum = validReviews.reduce((acc, review) => {
      return acc + (review.rating || review.stars || 0);
    }, 0);
    
    return Number((sum / validReviews.length).toFixed(2));
  }

  private calculateResponseMetrics(reviews: GoogleReview[]): { responseRate: number; averageResponseTime: number } {
    const reviewsWithResponse = reviews.filter(review => 
      review.responseFromOwnerText && review.responseFromOwnerText.trim() !== ''
    );
    
    const responseRate = reviews.length > 0 ? 
      Number(((reviewsWithResponse.length / reviews.length) * 100).toFixed(2)) : 0;
    
    // Calculate average response time in hours
    const responseTimes = reviewsWithResponse
      .map(review => {
        if (review.responseFromOwnerDate && review.publishedAtDate) {
          const responseTime = new Date(review.responseFromOwnerDate).getTime() - new Date(review.publishedAtDate).getTime();
          return responseTime / (1000 * 60 * 60); // Convert to hours
        }
        return null;
      })
      .filter(time => time !== null && time >= 0) as number[];
    
    const averageResponseTime = responseTimes.length > 0 ?
      Number((responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length).toFixed(2)) : 0;
    
    return { responseRate, averageResponseTime };
  }

  private generateRatingDistribution(reviews: GoogleReview[]): RatingDistribution {
    const distribution: RatingDistribution = {};
    const totalReviews = reviews.length;
    
    if (totalReviews === 0) {
      // Initialize with zeros if no reviews
      for (let i = 1; i <= 5; i++) {
        distribution[i.toString()] = {
          value: 0,
          percentageValue: 0
        };
      }
      return distribution;
    }
    
    // Calculate distribution
    for (let i = 1; i <= 5; i++) {
      const count = reviews.filter(review => 
        (review.rating === i) || (review.stars === i)
      ).length;
      
      distribution[i.toString()] = {
        value: count,
        percentageValue: Number(((count / totalReviews) * 100).toFixed(1))
      };
    }
    
    return distribution;
  }

  private aggregateSentimentAnalysis(reviews: GoogleReview[]): SentimentAnalysis {
    const sentimentCounts = {
      positive: 0,
      neutral: 0,
      negative: 0
    };
    
    reviews.forEach(review => {
      const emotional = review.reviewMetadata?.emotional;
      if (emotional === 'positive') {
        sentimentCounts.positive++;
      } else if (emotional === 'negative') {
        sentimentCounts.negative++;
      } else if (emotional === 'neutral') {
        sentimentCounts.neutral++;
      } else {
        // If no emotional analysis, infer from rating
        const rating = review.rating || review.stars || 0;
        if (rating >= 4) {
          sentimentCounts.positive++;
        } else if (rating >= 3) {
          sentimentCounts.neutral++;
        } else if (rating > 0) {
          sentimentCounts.negative++;
        }
      }
    });
    
    return sentimentCounts;
  }

  private aggregateKeywords(reviews: GoogleReview[]): KeywordCount[] {
    const keywordCounts: { [key: string]: number } = {};
    
    reviews.forEach(review => {
      const keywords = review.reviewMetadata?.keywords || [];
      keywords.forEach(keyword => {
        if (keyword && keyword.trim()) {
          const normalizedKeyword = keyword.toLowerCase().trim();
          keywordCounts[normalizedKeyword] = (keywordCounts[normalizedKeyword] || 0) + 1;
        }
      });
    });
    
    return Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20) // Top 20 keywords
      .map(([key, value]) => ({ key, value }));
  }

  private getRecentReviews(reviews: GoogleReview[]): any[] {
    return reviews
      .sort((a, b) => new Date(b.publishedAtDate).getTime() - new Date(a.publishedAtDate).getTime())
      .slice(0, 10) // Get top 10 most recent
      .map(review => ({
        id: review.id,
        author: review.name,
        rating: review.rating || review.stars,
        text: review.text || '',
        publishedAtDate: review.publishedAtDate,
        responseFromOwnerText: review.responseFromOwnerText || null,
        responseFromOwnerDate: review.responseFromOwnerDate || null,
        sentiment: review.reviewMetadata?.sentiment || null,
        emotional: review.reviewMetadata?.emotional || null,
        keywords: review.reviewMetadata?.keywords || []
      }));
  }

  async close(): Promise<void> {
    // Prisma client doesn't need explicit closing in this context
  }
} 