/**
 * AI Router
 * 
 * tRPC router for AI-powered features:
 * - Review response generation
 * - Platform-specific responses
 */

import {
  type ReviewData,
  generateBookingResponse,
  generateFacebookResponse,
  generateGoogleResponse,
  generateOwnerResponse,
  generateTripAdvisorResponse,
} from 'src/lib/openai';

import { router, protectedProcedure } from '../trpc';
import {
  generateOwnerResponseSchema,
  generatePlatformResponseSchema,
} from '../schemas/ai.schema';

/**
 * AI Router
 */
export const aiRouter = router({
  /**
   * Generate owner response for a review (generic)
   */
  generateResponse: protectedProcedure
    .input(generateOwnerResponseSchema)
    .mutation(async ({ input }) => {
      const { reviewData, customPrompt, tone, language } = input;

      // Map schema data to ReviewData format expected by openai.ts
      const mappedReviewData: ReviewData = {
        text: reviewData.text,
        rating: reviewData.rating || 0,
        reviewerName: reviewData.reviewerName,
        businessName: reviewData.businessName,
        platform: (reviewData.platform?.toUpperCase() as 'GOOGLE' | 'FACEBOOK' | 'TRIPADVISOR' | 'BOOKING') || 'GOOGLE',
        reviewDate: reviewData.reviewDate,
        reviewUrl: reviewData.reviewUrl,
        additionalContext: reviewData.additionalContext,
      };

      const response = await generateOwnerResponse({
        reviewData: mappedReviewData,
        customPrompt,
        tone,
        language,
      });

      return {
        response,
        tone,
        language,
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * Generate Google-specific owner response
   */
  generateGoogleResponse: protectedProcedure
    .input(generatePlatformResponseSchema)
    .mutation(async ({ input }) => {
      const { reviewData, customPrompt } = input;

      // Map schema data to ReviewData format expected by openai.ts
      const mappedReviewData: ReviewData = {
        text: reviewData.text,
        rating: reviewData.rating || 0,
        reviewerName: reviewData.reviewerName,
        businessName: reviewData.businessName,
        platform: 'GOOGLE',
        reviewDate: reviewData.reviewDate,
        reviewUrl: reviewData.reviewUrl,
        additionalContext: reviewData.additionalContext,
      };

      const response = await generateGoogleResponse(mappedReviewData, customPrompt);

      return {
        response,
        platform: 'google',
        tone: input.tone || 'professional',
        language: input.language || 'en',
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * Generate Facebook-specific owner response
   */
  generateFacebookResponse: protectedProcedure
    .input(generatePlatformResponseSchema)
    .mutation(async ({ input }) => {
      const { reviewData, customPrompt } = input;

      // Map schema data to ReviewData format expected by openai.ts
      const mappedReviewData: ReviewData = {
        text: reviewData.text,
        rating: reviewData.rating || 0,
        reviewerName: reviewData.reviewerName,
        businessName: reviewData.businessName,
        platform: 'FACEBOOK',
        reviewDate: reviewData.reviewDate,
        reviewUrl: reviewData.reviewUrl,
        additionalContext: reviewData.additionalContext,
      };

      const response = await generateFacebookResponse(mappedReviewData, customPrompt);

      return {
        response,
        platform: 'facebook',
        tone: input.tone || 'friendly',
        language: input.language || 'en',
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * Generate TripAdvisor-specific owner response
   */
  generateTripAdvisorResponse: protectedProcedure
    .input(generatePlatformResponseSchema)
    .mutation(async ({ input }) => {
      const { reviewData, customPrompt } = input;

      // Map schema data to ReviewData format expected by openai.ts
      const mappedReviewData: ReviewData = {
        text: reviewData.text,
        rating: reviewData.rating || 0,
        reviewerName: reviewData.reviewerName,
        businessName: reviewData.businessName,
        platform: 'TRIPADVISOR',
        reviewDate: reviewData.reviewDate,
        reviewUrl: reviewData.reviewUrl,
        additionalContext: reviewData.additionalContext,
      };

      const response = await generateTripAdvisorResponse(mappedReviewData, customPrompt);

      return {
        response,
        platform: 'tripadvisor',
        tone: input.tone || 'professional',
        language: input.language || 'en',
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * Generate Booking.com-specific owner response
   */
  generateBookingResponse: protectedProcedure
    .input(generatePlatformResponseSchema)
    .mutation(async ({ input }) => {
      const { reviewData, customPrompt } = input;

      // Map schema data to ReviewData format expected by openai.ts
      const mappedReviewData: ReviewData = {
        text: reviewData.text,
        rating: reviewData.rating || 0,
        reviewerName: reviewData.reviewerName,
        businessName: reviewData.businessName,
        platform: 'BOOKING',
        reviewDate: reviewData.reviewDate,
        reviewUrl: reviewData.reviewUrl,
        additionalContext: reviewData.additionalContext,
      };

      const response = await generateBookingResponse(mappedReviewData, customPrompt);

      return {
        response,
        platform: 'booking',
        tone: input.tone || 'professional',
        language: input.language || 'en',
        generatedAt: new Date().toISOString(),
      };
    }),
});

