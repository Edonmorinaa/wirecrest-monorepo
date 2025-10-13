/**
 * Test endpoint to simulate webhook events
 * This helps test cache invalidation without actual Stripe webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGlobalFeatureChecker } from '@wirecrest/billing';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing webhook cache invalidation...');
    
    // Get the global FeatureChecker instance
    const featureChecker = getGlobalFeatureChecker();
    console.log('🔧 Using FeatureChecker instance ID:', featureChecker.instanceId);
    
    // Simulate a subscription change event
    console.log('💳 Simulating subscription change event...');
    await featureChecker.clearAllCache();
    
    console.log('✅ Webhook cache invalidation test completed');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook cache invalidation test completed',
      instanceId: featureChecker.instanceId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error testing webhook cache invalidation:', error);
    return NextResponse.json(
      { error: 'Failed to test webhook cache invalidation' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'webhook-test',
    timestamp: new Date().toISOString()
  });
}
