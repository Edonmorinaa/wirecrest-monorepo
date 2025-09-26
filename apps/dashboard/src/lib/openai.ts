import OpenAI from 'openai';
import env from './env';

// Initialize Perplexity AI client (using OpenAI-compatible API)
const perplexity = new OpenAI({
  apiKey: env.perplexity?.apiKey, // Fallback to OpenAI key if Perplexity not configured
  baseURL: 'https://api.perplexity.ai',
});

// Debug: Check if API key is configured
if (!env.perplexity?.apiKey) {
  console.error('Perplexity AI API key is not configured. Please set PERPLEXITY_API_KEY in your environment variables.');
}

export interface ReviewData {
  text: string;
  rating: number;
  reviewerName?: string;
  businessName?: string;
  platform: 'GOOGLE' | 'FACEBOOK' | 'TRIPADVISOR' | 'BOOKING';
  reviewDate?: string;
  reviewUrl?: string;
  additionalContext?: string;
}

export interface GenerateResponseOptions {
  reviewData: ReviewData;
  customPrompt?: string;
  tone?: 'professional' | 'friendly' | 'formal' | 'casual';
  language?: string;
}

const DEFAULT_PROMPT = `You are a professional business owner responding to customer reviews. Your goal is to create thoughtful, helpful, and professional responses that show appreciation for feedback and address any concerns constructively.

-- Guidelines --
- Always be professional and courteous, but keep it conversational
- Thank the customer for their feedback
- Address specific points mentioned in the review
- For negative reviews, acknowledge the issue and show commitment to improvement
- For positive reviews, express genuine gratitude
- Keep responses concise but comprehensive (2-4 sentences)
- Use the customer's name if provided
- Maintain a tone that's professional but approachable
- Don't make excuses or be defensive
- End with a positive note or invitation to return
- IMPORTANT: Do not include any source citations, references, or numbered brackets like [1], [2], etc.

-- Review Information --
- Platform: {platform}
- Business: {businessName}
- Rating: {rating}/5
- Reviewer: {reviewerName}
- Date: {reviewDate}
- Review URL: {reviewUrl}

-- Additional Context --
{additionalContext}

-- Customer Review --
"{reviewText}"

Please generate a professional owner response (no citations or references):`;

export async function generateOwnerResponse(options: GenerateResponseOptions): Promise<string> {
  try {
    const { reviewData, customPrompt, tone = 'professional', language = 'English' } = options;
    
    // Check if API key is configured
    if (!env.perplexity?.apiKey) {
      throw new Error('Perplexity AI API key is not configured. Please set PERPLEXITY_API_KEY in your environment variables.');
    }
    
    console.log('Generating owner response with options:', {
      platform: reviewData.platform,
      rating: reviewData.rating,
      hasText: !!reviewData.text,
      customPrompt: !!customPrompt
    });
    
    // Build the prompt
    let prompt = customPrompt || DEFAULT_PROMPT;
    
    // Replace placeholders with actual data
    prompt = prompt
      .replace('{platform}', reviewData.platform)
      .replace('{businessName}', reviewData.businessName || 'our business')
      .replace('{rating}', reviewData.rating.toString())
      .replace('{reviewerName}', reviewData.reviewerName || 'the customer')
      .replace('{reviewDate}', reviewData.reviewDate || 'recently')
      .replace('{reviewUrl}', reviewData.reviewUrl || 'the review')
      .replace('{additionalContext}', reviewData.additionalContext || '')
      .replace('{reviewText}', reviewData.text);

    // Add tone and language instructions
    prompt += `\n\nTone: ${tone}\nLanguage: ${language}`;

    console.log('Sending request to Perplexity AI...');
    const completion = await perplexity.chat.completions.create({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'You are a professional business owner who responds to customer reviews with thoughtful, helpful, and professional responses. Keep the tone professional but conversational and approachable. IMPORTANT: Do not include any source citations, references, or numbered brackets like [1], [2], etc. in your responses. Write naturally as if you are directly responding to the customer.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response generated from Perplexity AI');
    }

    console.log('Perplexity AI response received successfully');
    
    // Clean up any remaining citations or references
    let cleanedResponse = response.trim();
    
    // Remove citation patterns like [1], [2], etc.
    cleanedResponse = cleanedResponse.replace(/\[\d+\]/g, '');
    
    // Remove any remaining brackets that might be citations
    cleanedResponse = cleanedResponse.replace(/\[[^\]]*\]/g, '');
    
    // Clean up any extra spaces that might be left
    cleanedResponse = cleanedResponse.replace(/\s+/g, ' ').trim();
    
    return cleanedResponse;
  } catch (error) {
    console.error('Error generating owner response:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    });
    
    // Handle specific OpenAI errors
    if (error.status === 429) {
      throw new Error('Perplexity AI quota exceeded. Please check your billing and usage limits.');
    } else if (error.code === 'insufficient_quota') {
      throw new Error('Perplexity AI quota exceeded. Please add billing information or upgrade your plan.');
    } else if (error.status === 401) {
      throw new Error('Perplexity AI API key is invalid. Please check your API key configuration.');
    } else if (error.status === 403) {
      throw new Error('Perplexity AI access denied. Please check your API key permissions.');
    }
    
    throw new Error(`Failed to generate owner response: ${error.message}`);
  }
}

// Platform-specific response generators
export async function generateGoogleResponse(reviewData: ReviewData, customPrompt?: string): Promise<string> {
  const googlePrompt = customPrompt || `You are responding to a Google review. Google reviews are highly visible and can significantly impact your business's online reputation. 

-- Key Considerations for Google Reviews --
- Google reviews appear prominently in search results
- They affect your overall rating and visibility
- Responses are public and visible to all potential customers
- Keep responses professional and helpful, but conversational
- Address specific feedback constructively
- Thank customers for taking time to review

${DEFAULT_PROMPT}`;

  return generateOwnerResponse({
    reviewData,
    customPrompt: googlePrompt,
    tone: 'professional'
  });
}

export async function generateFacebookResponse(reviewData: ReviewData, customPrompt?: string): Promise<string> {
  const facebookPrompt = customPrompt || `You are responding to a Facebook review. Facebook reviews are social and can be shared among friends and followers.

-- Key Considerations for Facebook Reviews --
- Facebook is a social platform, so responses can be slightly more personal
- Reviews can be shared and seen by the reviewer's network
- Maintain professionalism while being approachable and friendly
- Address concerns promptly as they can spread quickly
- Thank customers for their social media presence

${DEFAULT_PROMPT}`;

  return generateOwnerResponse({
    reviewData,
    customPrompt: facebookPrompt,
    tone: 'friendly'
  });
}

export async function generateTripAdvisorResponse(reviewData: ReviewData, customPrompt?: string): Promise<string> {
  const tripAdvisorPrompt = customPrompt || `You are responding to a TripAdvisor review. TripAdvisor is specifically for travel and hospitality businesses.

-- Key Considerations for TripAdvisor Reviews --
- TripAdvisor is the world's largest travel platform
- Reviews are detailed and often include specific experiences
- Address specific aspects mentioned (service, cleanliness, location, etc.)
- For hotels/restaurants, mention specific improvements or thank for specific compliments
- Be detailed in your response as TripAdvisor users expect thorough responses
- Mention any specific amenities or services that might interest future travelers
- Keep it professional but warm and welcoming

${DEFAULT_PROMPT}`;

  return generateOwnerResponse({
    reviewData,
    customPrompt: tripAdvisorPrompt,
    tone: 'professional'
  });
}

export async function generateBookingResponse(reviewData: ReviewData, customPrompt?: string): Promise<string> {
  const bookingPrompt = customPrompt || `You are responding to a Booking.com review. Booking.com is specifically for accommodation businesses.

-- Key Considerations for Booking.com Reviews --
- Booking.com reviews focus on accommodation experience
- Address specific aspects like cleanliness, comfort, location, staff, value
- Mention any specific room types or amenities
- For negative reviews, show commitment to improvement
- For positive reviews, invite guests to return
- Keep in mind that responses are visible to potential future guests
- Mention any special offers or loyalty programs if applicable
- Be professional but warm and hospitable

${DEFAULT_PROMPT}`;

  return generateOwnerResponse({
    reviewData,
    customPrompt: bookingPrompt,
    tone: 'professional'
  });
}
