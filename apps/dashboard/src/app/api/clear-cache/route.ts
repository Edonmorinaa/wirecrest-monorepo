/**
 * Manual cache clearing endpoint
 * Use this to manually clear the feature cache when webhooks are not working
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGlobalFeatureChecker, resetGlobalFeatureChecker } from '@wirecrest/billing';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Manual cache clearing requested...');
    
    // Get the global FeatureChecker instance
    const featureChecker = getGlobalFeatureChecker();
    console.log('🔧 Using FeatureChecker instance ID:', featureChecker.instanceId);
    
    // Clear all caches
    await featureChecker.clearAllCache();
    
    console.log('✅ Manual cache clearing completed');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cache cleared successfully',
      instanceId: featureChecker.instanceId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    console.log('🔄 Resetting global FeatureChecker instance...');
    
    // Reset the global instance
    resetGlobalFeatureChecker();
    
    // Get a new instance
    const featureChecker = getGlobalFeatureChecker();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Global FeatureChecker instance reset',
      newInstanceId: featureChecker.instanceId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error resetting instance:', error);
    return NextResponse.json(
      { error: 'Failed to reset instance' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const featureChecker = getGlobalFeatureChecker();
    return NextResponse.json({
      status: 'ok',
      service: 'manual-cache-clear',
      instanceId: featureChecker.instanceId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get instance info' },
      { status: 500 }
    );
  }
}
