import { NextRequest, NextResponse } from 'next/server';
import { unsubscribePushNotifications } from 'src/actions/push-notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body;
    
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }
    
    const result = await unsubscribePushNotifications(endpoint);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in push unsubscribe route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

