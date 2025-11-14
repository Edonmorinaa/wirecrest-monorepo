/**
 * Scraper Webhook API Route
 * 
 * Receives events from the scraper service when data sync completes.
 * Triggers cache invalidation for the affected team and platform.
 * 
 * Expected payload:
 * {
 *   teamId: string;
 *   teamSlug: string;
 *   platform: 'google' | 'facebook' | 'tripadvisor' | 'booking' | 'instagram' | 'tiktok';
 *   status: 'completed' | 'failed';
 *   syncType: 'profile' | 'reviews' | 'snapshot';
 *   timestamp: string;
 *   reviewsNew?: number;
 *   reviewsDuplicate?: number;
 *   error?: string;
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@wirecrest/db';

// Verify webhook secret to ensure requests come from scraper
function verifyWebhookSignature(request: NextRequest): boolean {
  const webhookSecret = process.env.SCRAPER_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn('SCRAPER_WEBHOOK_SECRET not configured');
    return true; // Allow in development if not configured
  }
  
  const signature = request.headers.get('x-webhook-signature');
  return signature === webhookSecret;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    if (!verifyWebhookSignature(request)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const payload = await request.json();
    const { teamId, teamSlug, platform, status, syncType, timestamp, reviewsNew, reviewsDuplicate, error } = payload;

    console.log('📥 Received scraper webhook:', {
      teamId,
      teamSlug,
      platform,
      status,
      syncType,
      timestamp,
    });

    // Validate required fields
    if (!teamId || !teamSlug || !platform || !status || !syncType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      console.error(`Team not found: ${teamId}`);
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    // Log the sync event
    console.log(`✅ Scraper sync ${status} for ${platform} on team ${teamSlug}`);
    if (reviewsNew || reviewsDuplicate) {
      console.log(`   📊 Reviews: ${reviewsNew} new, ${reviewsDuplicate} duplicate`);
    }
    if (error) {
      console.error(`   ❌ Error: ${error}`);
    }

    // Trigger cache revalidation via Next.js revalidation API
    // This will cause React Query to refetch data on the client
    const revalidateUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/revalidate`;
    
    try {
      const revalidateResponse = await fetch(revalidateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': process.env.REVALIDATE_SECRET || 'development-secret',
        },
        body: JSON.stringify({
          teamSlug,
          platform,
          syncType,
        }),
      });

      if (!revalidateResponse.ok) {
        console.warn('Cache revalidation failed:', await revalidateResponse.text());
      } else {
        console.log('✨ Cache revalidated successfully');
      }
    } catch (revalidateError) {
      console.error('Error triggering revalidation:', revalidateError);
      // Don't fail the webhook if revalidation fails
    }

    // Send success response
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error processing scraper webhook:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'scraper-webhook',
    timestamp: new Date().toISOString(),
  });
}

