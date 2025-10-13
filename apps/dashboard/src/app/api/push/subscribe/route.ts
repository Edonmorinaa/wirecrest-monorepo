import { NextRequest, NextResponse } from 'next/server';
import { subscribePushNotifications } from 'src/actions/push-notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, userAgent } = body;
    
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      );
    }
    
    const result = await subscribePushNotifications(subscription, userAgent);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, id: result.id });
  } catch (error: any) {
    console.error('Error in push subscribe route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

