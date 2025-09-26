import { NextRequest, NextResponse } from 'next/server';

import { 
  generateBookingResponse,
  generateFacebookResponse, 
  generateGoogleResponse, 
  generateTripAdvisorResponse, 
  type ReviewData 
} from 'src/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reviewData, platform } = body;

    if (!reviewData || !platform) {
      return NextResponse.json(
        { error: 'Missing required fields: reviewData and platform' },
        { status: 400 }
      );
    }

    const review: ReviewData = {
      text: reviewData.text || '',
      rating: reviewData.rating,
      reviewerName: reviewData.reviewerName,
      businessName: reviewData.businessName || 'our business',
      platform: platform.toUpperCase() as 'GOOGLE' | 'FACEBOOK' | 'TRIPADVISOR' | 'BOOKING',
      reviewDate: reviewData.reviewDate,
      reviewUrl: reviewData.reviewUrl
    };

    let aiReply: string;

    switch (platform.toLowerCase()) {
      case 'google':
        aiReply = await generateGoogleResponse(review);
        break;
      case 'facebook':
        aiReply = await generateFacebookResponse(review);
        break;
      case 'tripadvisor':
        aiReply = await generateTripAdvisorResponse(review);
        break;
      case 'booking':
        aiReply = await generateBookingResponse(review);
        break;
      default:
        aiReply = await generateGoogleResponse(review); // Default fallback
    }

    return NextResponse.json({ reply: aiReply });
  } catch (error) {
    console.error('Error generating AI reply:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate AI reply' },
      { status: 500 }
    );
  }
}
