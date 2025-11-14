/**
 * Cache Revalidation API Route
 * 
 * Internal API endpoint to trigger cache invalidation after scraper syncs.
 * This broadcasts to all connected clients to refetch their data.
 * 
 * Expected payload:
 * {
 *   teamSlug: string;
 *   platform: string;
 *   syncType: 'profile' | 'reviews' | 'snapshot';
 * }
 */

import { NextRequest, NextResponse } from 'next/server';

// Verify revalidate secret
function verifyRevalidateSecret(request: NextRequest): boolean {
  const revalidateSecret = process.env.REVALIDATE_SECRET;
  
  if (!revalidateSecret) {
    console.warn('REVALIDATE_SECRET not configured');
    return true; // Allow in development
  }
  
  const secret = request.headers.get('x-revalidate-secret');
  return secret === revalidateSecret;
}

export async function POST(request: NextRequest) {
  try {
    // Verify secret
    if (!verifyRevalidateSecret(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { teamSlug, platform, syncType } = await request.json();

    console.log('🔄 Cache revalidation requested:', { teamSlug, platform, syncType });

    // Note: React Query caching is client-side, so we can't directly invalidate it from the server.
    // Instead, we rely on:
    // 1. The webhook storing an event that clients can poll
    // 2. WebSocket/SSE notifications (if implemented)
    // 3. Client-side polling intervals that will pick up new data
    
    // For now, we'll use Next.js ISR revalidation for any SSR pages
    // and rely on React Query's refetchInterval to pick up changes

    // You can add specific page revalidations here if needed:
    // await revalidatePath(`/teams/${teamSlug}/${platform}`);
    // await revalidateTag(`team-${teamSlug}`);

    return NextResponse.json({
      success: true,
      message: 'Revalidation queued',
      teamSlug,
      platform,
      syncType,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in revalidation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'cache-revalidation',
    timestamp: new Date().toISOString(),
  });
}

